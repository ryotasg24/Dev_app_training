/**
 * セッションの読み書き（要件定義書 3.1）。
 * 複数のテーブルを変える処理は、1つのトランザクションで行う（非機能・信頼性）。
 */
import { buildSession, type SessionDraft } from '../domain/session';
import type { ActiveSession, Session } from '../domain/types';
import type { TrainingDb } from './db';

/** 現在の体重（体重の履歴の最新の1件）。未入力ならnull */
export async function getCurrentWeightKg(database: TrainingDb): Promise<number | null> {
  const latest = await database.weightLogs
    .orderBy('date')
    .reverse()
    .filter((w) => w.deleted === 0)
    .first();
  return latest?.weightKg ?? null;
}

/**
 * 計測を開始する（F-REC-01）。開始時刻を端末内に保存し、アプリを閉じても途切れないようにする（F-REC-05）。
 * すでに計測中なら、そのセッションをそのまま返す。
 */
export async function startActiveSession(database: TrainingDb, now: number): Promise<ActiveSession> {
  return database.transaction('rw', database.activeSession, async () => {
    const current = await database.activeSession.get('current');
    if (current) return current;
    const created: ActiveSession = {
      key: 'current',
      startAt: now,
      categoryIds: [],
      exercises: [],
      memo: '',
    };
    await database.activeSession.add(created);
    return created;
  });
}

/** 計測中に選んだ内容を保存する。選ぶたびに呼ぶ */
export async function updateActiveSession(
  database: TrainingDb,
  changes: Partial<Omit<ActiveSession, 'key' | 'startAt'>>,
): Promise<void> {
  await database.activeSession.update('current', changes);
}

/** 計測中のセッションを破棄する */
export async function discardActiveSession(database: TrainingDb): Promise<void> {
  await database.activeSession.delete('current');
}

export interface SaveContext {
  newId: string;
  now: number;
}

/**
 * 計測中のセッションを終了して保存する（F-REC-04）。
 * セッションの追加と計測中データの削除を、1つのトランザクションで行う。
 *
 * @param endAt 終了時刻（通常は現在時刻。終了し忘れの場合は指定した時刻）
 * @returns 保存したセッション
 */
export async function finishActiveSession(
  database: TrainingDb,
  endAt: number,
  context: SaveContext,
): Promise<Session> {
  return database.transaction(
    'rw',
    [
      database.activeSession,
      database.sessions,
      database.categories,
      database.exercises,
      database.weightLogs,
    ],
    async () => {
      const active = await database.activeSession.get('current');
      if (!active) throw new Error('計測中のセッションがありません。');

      const draft: SessionDraft = {
        startAt: active.startAt,
        endAt,
        source: 'timer',
        categoryIds: active.categoryIds,
        exercises: active.exercises,
        memo: active.memo,
      };
      const session = await buildWithMaster(database, draft, context);
      await database.sessions.add(session);
      await database.activeSession.delete('current');
      return session;
    },
  );
}

/**
 * 手入力のセッションを保存する、または既存のセッションを編集する（F-REC-06、07）。
 * @param existingId 編集の場合は元のセッションのID
 */
export async function saveSession(
  database: TrainingDb,
  draft: SessionDraft,
  context: SaveContext,
  existingId?: string,
): Promise<Session> {
  return database.transaction(
    'rw',
    [database.sessions, database.categories, database.exercises, database.weightLogs],
    async () => {
      const existing = existingId ? await database.sessions.get(existingId) : undefined;
      if (existingId && !existing) throw new Error('編集する記録が見つかりません。');
      const session = await buildWithMaster(database, draft, context, existing);
      await database.sessions.put(session);
      return session;
    },
  );
}

/** セッションを削除する。データは消さず、削除済みの印を付ける（F-DATA-08） */
export async function softDeleteSession(
  database: TrainingDb,
  id: string,
  now: number,
): Promise<void> {
  await database.sessions.update(id, { deleted: 1, updatedAt: now });
}

/** ヘルスケアに送信済みの印を付ける（F-HLT-03） */
export async function markHealthSent(database: TrainingDb, id: string, now: number): Promise<void> {
  await database.sessions.update(id, { healthSentAt: now, updatedAt: now });
}

async function buildWithMaster(
  database: TrainingDb,
  draft: SessionDraft,
  context: SaveContext,
  existing?: Session,
): Promise<Session> {
  const weightKg = await getCurrentWeightKg(database);
  if (weightKg === null && !existing) {
    throw new Error('体重が登録されていません。設定で体重を入力してください。');
  }
  return buildSession(
    draft,
    {
      newId: context.newId,
      now: context.now,
      currentWeightKg: weightKg ?? 0,
      // 非表示・削除済みも含めて渡す（過去の記録の編集で使うため）
      categories: await database.categories.toArray(),
      exercises: await database.exercises.toArray(),
    },
    existing,
  );
}
