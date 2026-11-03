/**
 * セッションの読み書き（要件定義書 3.1）。
 * 複数のテーブルを変える処理は、1つのトランザクションで行う（非機能・信頼性）。
 */
import { buildSession, type SessionDraft } from '../domain/session';
import {
  advanceStep,
  buildTimerSession,
  createActiveSession,
  currentStep,
} from '../domain/steps';
import type { ActiveSession, MenuItem, Session } from '../domain/types';
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
 * 選んだメニューで計測を開始する（F-REC-01）。開始時刻を端末内に保存し、アプリを閉じても途切れないようにする（F-REC-05）。
 * すでに計測中なら、そのセッションをそのまま返す（二重に開始しないように）。
 * @param menu 押した順のメニュー（1つ以上）
 */
export async function startActiveSession(
  database: TrainingDb,
  menu: readonly MenuItem[],
  now: number,
): Promise<ActiveSession> {
  if (menu.length === 0) throw new Error('メニューを1つ以上選んでください。');
  return database.transaction('rw', database.activeSession, async () => {
    const current = await database.activeSession.get('current');
    if (current) return current;
    const created = createActiveSession(menu, now);
    await database.activeSession.add(created);
    return created;
  });
}

/** 計測中のメモを保存する。入力のたびに呼ぶ */
export async function updateActiveMemo(database: TrainingDb, memo: string): Promise<void> {
  await database.activeSession.update('current', { memo });
}

/**
 * 「次の種目へ」：今のステップを終え、次のステップを同じ時刻で始める（F-REC-04）。
 * 読み込みと書き込みを1つのトランザクションで行い、二度押しで2つ進まないようにする。
 * @param expectedIndex 押したときに画面に表示していたステップの番号。すでに進んでいれば何もしない
 */
export async function advanceActiveSession(
  database: TrainingDb,
  expectedIndex: number,
  now: number,
): Promise<void> {
  await database.transaction('rw', database.activeSession, async () => {
    const active = await database.activeSession.get('current');
    if (!active || active.currentIndex !== expectedIndex) return;
    await database.activeSession.put(advanceStep(active, now));
  });
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
 * 計測中のセッションを終了して保存する（F-REC-04、12）。
 * 今のステップを endAt で終え、まだ始めていないステップは記録しない。
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
      const step = currentStep(active);
      if (!step || step.startAt === null) throw new Error('メニューがありません。');
      if (endAt < step.startAt) throw new Error('終了時刻は、今の種目の開始時刻より後にしてください。');

      const weightKg = await getCurrentWeightKg(database);
      if (weightKg === null) {
        throw new Error('体重が登録されていません。設定で体重を入力してください。');
      }
      const session = buildTimerSession(active, endAt, {
        newId: context.newId,
        now: context.now,
        weightKg,
        // 非表示・削除済みも含めて渡す（計測中に非表示にした種目でも計算できるように）
        categories: await database.categories.toArray(),
        exercises: await database.exercises.toArray(),
      });
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
