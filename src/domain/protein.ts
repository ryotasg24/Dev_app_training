/**
 * 運動後のたんぱく質の目安（要件定義書 3.4.1、F-REC-14、基本設計書 5.11）。
 * P ＝ 体重 × 0.3 × 部位係数 × カロリー係数。10g単位に四捨五入する。
 */
import type { CategoryId } from './types';

/** 基本たんぱく質係数（体重1kgあたりのg） */
export const PROTEIN_BASE_PER_KG = 0.3;

/** カロリー係数の基準の消費カロリー（標準的な低強度トレーニング） */
export const PROTEIN_REFERENCE_KCAL = 150;

/** 部位係数。大筋群1.0、中筋群0.85、小筋群0.7、ケア系は対象外（0） */
export const PART_COEFFICIENTS: Record<CategoryId, number> = {
  legs: 1.0,
  back: 1.0,
  chest: 1.0,
  abs: 0.85,
  cardio: 0.85,
  arms: 0.7,
  shoulders: 0.7,
  posture: 0,
  hip: 0,
  neck: 0,
  face: 0,
};

/** 係数が決まっていないカテゴリ（将来の追加カテゴリ）の部位係数 */
const DEFAULT_PART_COEFFICIENT = 0.85;
const SMALL_MUSCLE = 0.7;
const MEDIUM_MUSCLE = 0.85;

/**
 * 部位係数を求める。行ったカテゴリの係数のうち最も大きい値。
 * ただし、最大が小筋群（0.7）で、対象のカテゴリが2つ以上ある場合（例：腕＋肩）は中筋群（0.85）にする。
 */
export function calcPartCoefficient(categoryIds: readonly CategoryId[]): number {
  const values = [...new Set(categoryIds)]
    .map((id) => PART_COEFFICIENTS[id] ?? DEFAULT_PART_COEFFICIENT)
    .filter((v) => v > 0);
  if (values.length === 0) return 0;
  const max = Math.max(...values);
  if (max === SMALL_MUSCLE && values.length >= 2) return MEDIUM_MUSCLE;
  return max;
}

/** カロリー係数：消費カロリー ÷ 150 を 0.8〜1.2 に収めた値 */
export function calcCalorieCoefficient(kcal: number): number {
  return Math.min(1.2, Math.max(0.8, kcal / PROTEIN_REFERENCE_KCAL));
}

export interface ProteinResult {
  /** 表示する量（10g単位）。0なら摂取不要 */
  grams: number;
  /** 四捨五入する前の値 */
  exactGrams: number;
  partCoefficient: number;
  calorieCoefficient: number;
}

/**
 * 運動後に摂るとよいたんぱく質の量を求める。
 * @param weightKg 体重（セッションを保存したときの値）
 * @param kcal セッションの消費カロリー
 * @param categoryIds セッションのカテゴリ
 */
export function calcProtein(
  weightKg: number,
  kcal: number,
  categoryIds: readonly CategoryId[],
): ProteinResult {
  const partCoefficient = calcPartCoefficient(categoryIds);
  const calorieCoefficient = calcCalorieCoefficient(kcal);
  const exactGrams = weightKg * PROTEIN_BASE_PER_KG * partCoefficient * calorieCoefficient;
  return {
    grams: Math.round(exactGrams / 10) * 10,
    exactGrams,
    partCoefficient,
    calorieCoefficient,
  };
}
