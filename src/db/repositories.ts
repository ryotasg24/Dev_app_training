/**
 * 設定・体重・筋肉痛・カテゴリ・種目・管理用の値の読み書き。
 * セッションの読み書きは sessionRepository.ts にある。
 */
import { toLocalDate } from '../domain/date';
import { INTENSITY_METS } from '../domain/master';
import type {
  Category,
  CategoryId,
  Exercise,
  Intensity,
  MetaRecord,
  Settings,
  SorenessLevel,
} from '../domain/types';
import type { TrainingDb } from './db';

/** 設定を変更する */
export async function updateSettings(
  database: TrainingDb,
  changes: Partial<Omit<Settings, 'key' | 'updatedAt'>>,
  now: number,
): Promise<void> {
  await database.settings.update('app', { ...changes, updatedAt: now });
}

/**
 * 体重を記録する。同じ日に何度入力しても、その日の1件を上書きする（基本設計書 4.3）。
 */
export async function recordWeight(
  database: TrainingDb,
  weightKg: number,
  context: { newId: string; now: number },
): Promise<void> {
  const date = toLocalDate(context.now);
  await database.transaction('rw', database.weightLogs, async () => {
    const existing = await database.weightLogs
      .where('date')
      .equals(date)
      .filter((w) => w.deleted === 0)
      .first();
    if (existing) {
      await database.weightLogs.update(existing.id, { weightKg, updatedAt: context.now });
    } else {
      await database.weightLogs.add({
        id: context.newId,
        createdAt: context.now,
        updatedAt: context.now,
        deleted: 0,
        date,
        weightKg,
      });
    }
  });
}

/**
 * 筋肉痛の回答を記録する（F-BODY-05）。同じセッション×カテゴリへの回答は上書きする。
 */
export async function answerSoreness(
  database: TrainingDb,
  target: { sessionId: string; categoryId: CategoryId; level: SorenessLevel },
  context: { newId: string; now: number },
): Promise<void> {
  await database.transaction('rw', database.sorenessLogs, async () => {
    const existing = await database.sorenessLogs
      .where('[sessionId+categoryId]')
      .equals([target.sessionId, target.categoryId])
      .first();
    if (existing) {
      await database.sorenessLogs.update(existing.id, {
        level: target.level,
        deleted: 0,
        updatedAt: context.now,
      });
    } else {
      await database.sorenessLogs.add({
        id: context.newId,
        createdAt: context.now,
        updatedAt: context.now,
        deleted: 0,
        ...target,
      });
    }
  });
}

/** カテゴリの回復目安時間・METs・回復管理を変更する（F-SET-02） */
export async function updateCategory(
  database: TrainingDb,
  id: CategoryId,
  changes: Partial<Pick<Category, 'recoveryHours' | 'mets' | 'recoveryEnabled'>>,
  now: number,
): Promise<void> {
  await database.categories.update(id, { ...changes, updatedAt: now });
}

/** 独自の種目を追加する（F-MST-02） */
export async function addExercise(
  database: TrainingDb,
  input: { name: string; categoryId: CategoryId; intensity: Intensity },
  context: { newId: string; now: number },
): Promise<void> {
  const count = await database.exercises.where('categoryId').equals(input.categoryId).count();
  await database.exercises.add({
    id: context.newId,
    createdAt: context.now,
    updatedAt: context.now,
    deleted: 0,
    categoryId: input.categoryId,
    name: input.name.trim(),
    isPreset: false,
    intensity: input.intensity,
    mets: INTENSITY_METS[input.intensity],
    hidden: false,
    favorite: false,
    sortOrder: count,
  });
}

/** 独自の種目の名称・カテゴリ・強度を変更する（F-MST-03） */
export async function editExercise(
  database: TrainingDb,
  id: string,
  input: { name: string; categoryId: CategoryId; intensity: Intensity },
  now: number,
): Promise<void> {
  await database.exercises.update(id, {
    name: input.name.trim(),
    categoryId: input.categoryId,
    intensity: input.intensity,
    mets: INTENSITY_METS[input.intensity],
    updatedAt: now,
  });
}

/** 非表示・お気に入りを切り替える（F-MST-04、05） */
export async function setExerciseFlags(
  database: TrainingDb,
  id: string,
  flags: Partial<Pick<Exercise, 'hidden' | 'favorite'>>,
  now: number,
): Promise<void> {
  await database.exercises.update(id, { ...flags, updatedAt: now });
}

/**
 * 種目を削除する（F-MST-03）。
 * プリセット種目と、記録で使っている種目は、過去の記録を壊さないよう「非表示」にする。
 * @returns 実際に行った操作
 */
export async function removeExercise(
  database: TrainingDb,
  id: string,
  now: number,
): Promise<'deleted' | 'hidden'> {
  return database.transaction('rw', [database.exercises, database.sessions], async () => {
    const exercise = await database.exercises.get(id);
    if (!exercise) throw new Error('種目が見つかりません。');
    const used = await database.sessions
      .filter((s) => s.exercises.some((e) => e.exerciseId === id))
      .count();
    if (exercise.isPreset || used > 0) {
      await database.exercises.update(id, { hidden: true, updatedAt: now });
      return 'hidden';
    }
    await database.exercises.update(id, { deleted: 1, updatedAt: now });
    return 'deleted';
  });
}

/** 管理用の値を読む */
export async function getMeta(
  database: TrainingDb,
  key: MetaRecord['key'],
): Promise<number | null> {
  return (await database.meta.get(key))?.value ?? null;
}
