import { describe, expect, it } from 'vitest';
import { calcCalories, calcSessionMets } from './calories';
import { MS_PER_MINUTE } from './date';
import { presetExerciseId } from './master';
import { categories, exercises } from './testHelpers';
import type { Exercise } from './types';

describe('calcSessionMets（F-CAL-03）', () => {
  it('種目を選ばない場合はカテゴリのMETsを使う', () => {
    expect(calcSessionMets(['chest'], [], categories, exercises)).toBe(5.0);
  });

  it('複数カテゴリは単純平均をとる（設計書の例：大胸筋＋スマホ首＝3.65）', () => {
    const result = calcSessionMets(
      ['chest', 'neck'],
      [{ exerciseId: presetExerciseId('chest', 0), sets: null }],
      categories,
      exercises,
    );
    expect(result).toBeCloseTo(3.65);
  });

  it('同じカテゴリで複数の種目を選んだ場合は、種目のMETsの平均をそのカテゴリの値にする', () => {
    const custom: Exercise[] = [
      ...exercises,
      { ...exercises[0]!, id: 'c1', categoryId: 'chest', mets: 2.5, isPreset: false },
    ];
    const result = calcSessionMets(
      ['chest', 'abs'],
      [
        { exerciseId: presetExerciseId('chest', 0), sets: null }, // 5.0
        { exerciseId: 'c1', sets: null }, // 2.5
      ],
      categories,
      custom,
    );
    // 大胸筋 (5.0+2.5)/2=3.75、腹筋 3.8 → 平均 3.775
    expect(result).toBeCloseTo(3.775);
  });

  it('選んだカテゴリに属さない種目は無視する', () => {
    const result = calcSessionMets(
      ['neck'],
      [{ exerciseId: presetExerciseId('chest', 0), sets: null }],
      categories,
      exercises,
    );
    expect(result).toBe(2.3);
  });

  it('カテゴリが空なら0', () => {
    expect(calcSessionMets([], [], categories, exercises)).toBe(0);
  });
});

describe('calcCalories（F-CAL-02）', () => {
  it('設計書の例：METs5.0・65kg・35分で159kcal', () => {
    expect(calcCalories(5.0, 65, 35 * MS_PER_MINUTE)).toBe(159);
  });

  it('METsが1以下なら0kcal（安静時の分を除くため）', () => {
    expect(calcCalories(1, 65, 60 * MS_PER_MINUTE)).toBe(0);
    expect(calcCalories(0.5, 65, 60 * MS_PER_MINUTE)).toBe(0);
  });

  it('所要時間が負なら0kcal', () => {
    expect(calcCalories(5, 65, -1000)).toBe(0);
  });
});
