/**
 * 起動時の初期化：カテゴリ・プリセット種目・設定の登録（F-MST-01、基本設計書 4.4）。
 */
import {
  createDefaultCategories,
  createDefaultExercises,
  createDefaultSettings,
} from '../domain/master';
import { SCHEMA_VERSION, type TrainingDb } from './db';

/**
 * 足りない初期データだけを登録する。何度呼んでもよい。
 * 版が上がってプリセットが増えた場合も、足りないものだけを追加し、利用者が変えた値は上書きしない。
 *
 * @param database 対象のデータベース
 * @param now 現在時刻
 */
export async function initializeDb(database: TrainingDb, now: number): Promise<void> {
  await database.transaction(
    'rw',
    [database.categories, database.exercises, database.settings, database.meta],
    async () => {
      const existingCategoryIds = new Set(await database.categories.toCollection().primaryKeys());
      const missingCategories = createDefaultCategories(now).filter(
        (c) => !existingCategoryIds.has(c.id),
      );
      await database.categories.bulkAdd(missingCategories);

      const existingExerciseIds = new Set(await database.exercises.toCollection().primaryKeys());
      const missingExercises = createDefaultExercises(now).filter(
        (e) => !existingExerciseIds.has(e.id),
      );
      await database.exercises.bulkAdd(missingExercises);

      if (!(await database.settings.get('app'))) {
        await database.settings.add(createDefaultSettings(now));
      }
      if (!(await database.meta.get('firstLaunchAt'))) {
        await database.meta.add({ key: 'firstLaunchAt', value: now });
      }
      await database.meta.put({ key: 'schemaVersion', value: SCHEMA_VERSION });
    },
  );
}
