/**
 * 消費カロリーの計算（要件定義書 3.4、基本設計書 5.3）。
 */
import { MS_PER_HOUR } from './date';
import type { Category, CategoryId, Exercise, SessionExercise } from './types';

/**
 * セッションのMETsを求める（F-CAL-03）。
 * 選んだカテゴリごとに値を1つ決め、その単純平均をとる。
 * - そのカテゴリで種目を選んだ場合：選んだ種目のMETsの平均
 * - 種目を選んでいない場合：カテゴリのMETs
 *
 * @param categoryIds 選んだカテゴリ
 * @param sessionExercises 選んだ種目
 * @param categories カテゴリのマスタ
 * @param exercises 種目のマスタ（非表示・削除済みも含めて渡すこと。過去の記録の編集で使うため）
 * @returns METs。カテゴリが空なら0
 */
export function calcSessionMets(
  categoryIds: readonly CategoryId[],
  sessionExercises: readonly SessionExercise[],
  categories: readonly Category[],
  exercises: readonly Exercise[],
): number {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  const values: number[] = [];
  for (const categoryId of categoryIds) {
    const category = categoryById.get(categoryId);
    if (!category) continue;

    const chosen = sessionExercises
      .map((se) => exerciseById.get(se.exerciseId))
      .filter((e): e is Exercise => e !== undefined && e.categoryId === categoryId);

    values.push(chosen.length > 0 ? average(chosen.map((e) => e.mets)) : category.mets);
  }
  return values.length > 0 ? average(values) : 0;
}

/**
 * 運動による消費カロリー（kcal）を求める（F-CAL-02）。
 * 消費カロリー ＝ max(METs − 1, 0) × 体重 × 所要時間（時間）× 1.05。結果は整数に四捨五入する。
 *
 * @param mets セッションのMETs
 * @param weightKg 体重（kg）
 * @param durationMs 所要時間（ミリ秒）
 */
export function calcCalories(mets: number, weightKg: number, durationMs: number): number {
  const activeMets = Math.max(mets - 1, 0);
  const hours = Math.max(durationMs, 0) / MS_PER_HOUR;
  return Math.round(activeMets * weightKg * hours * 1.05);
}

function average(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
