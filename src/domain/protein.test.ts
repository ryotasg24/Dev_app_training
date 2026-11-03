import { describe, expect, it } from 'vitest';
import { calcCalorieCoefficient, calcPartCoefficient, calcProtein } from './protein';

describe('calcPartCoefficient（部位係数）', () => {
  it('最も大きい係数を使う', () => {
    expect(calcPartCoefficient(['arms', 'legs'])).toBe(1.0);
    expect(calcPartCoefficient(['abs'])).toBe(0.85);
    expect(calcPartCoefficient(['arms'])).toBe(0.7);
  });

  it('小筋群だけで2つ以上（腕＋肩）は0.85', () => {
    expect(calcPartCoefficient(['arms', 'shoulders'])).toBe(0.85);
  });

  it('ケア系は数えない。ケア系だけなら0', () => {
    expect(calcPartCoefficient(['arms', 'neck'])).toBe(0.7);
    expect(calcPartCoefficient(['neck', 'face'])).toBe(0);
  });

  it('有酸素は0.85', () => {
    expect(calcPartCoefficient(['cardio'])).toBe(0.85);
  });
});

describe('calcCalorieCoefficient（カロリー係数）', () => {
  it('150kcalで1.0。0.8〜1.2に収める', () => {
    expect(calcCalorieCoefficient(150)).toBe(1);
    expect(calcCalorieCoefficient(165)).toBeCloseTo(1.1);
    expect(calcCalorieCoefficient(60)).toBe(0.8);
    expect(calcCalorieCoefficient(1000)).toBe(1.2);
  });
});

describe('calcProtein（要件定義書 3.4.1）', () => {
  it('ユーザー提示の例：70kg・下半身・180kcal → 25.2g → 30g', () => {
    const r = calcProtein(70, 180, ['legs']);
    expect(r.exactGrams).toBeCloseTo(25.2);
    expect(r.grams).toBe(30);
  });

  it('設計書の例：65kg・腕だけ・80kcal → 10.92g → 10g', () => {
    expect(calcProtein(65, 80, ['arms']).grams).toBe(10);
  });

  it('10g単位に四捨五入する（14.9g→10g、15g→20g）', () => {
    // 50kg × 0.3 × 1.0 × 1.0 ＝ 15g
    expect(calcProtein(50, 150, ['legs']).grams).toBe(20);
    // 49.6kg × 0.3 × 1.0 × 1.0 ＝ 14.88g
    expect(calcProtein(49.6, 150, ['legs']).grams).toBe(10);
  });

  it('ケア系だけなら0g（摂取不要）', () => {
    expect(calcProtein(65, 50, ['neck']).grams).toBe(0);
  });
});
