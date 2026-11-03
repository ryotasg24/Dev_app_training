import { describe, expect, it } from 'vitest';
import { aggregateStats } from './stats';
import { makeSession } from './testHelpers';

describe('aggregateStats（F-GRA-01〜03）', () => {
  const sessions = [
    makeSession('2026-11-02T21:00', '2026-11-02T21:30', ['chest', 'arms'], { kcal: 100 }),
    makeSession('2026-11-02T22:00', '2026-11-02T22:10', ['neck'], { kcal: 10 }),
    // 日曜の夜に始まり月曜にまたぐ → 開始日（日曜）の週に入る
    makeSession('2026-11-08T23:30', '2026-11-09T00:30', ['legs'], { kcal: 200 }),
    makeSession('2026-11-10T21:00', '2026-11-10T21:30', ['chest'], { kcal: 50 }),
    makeSession('2026-11-04T21:00', '2026-11-04T21:30', ['back'], { kcal: 999, deleted: 1 }),
  ];

  it('週は月曜始まりで、日ごとの棒を7本作る', () => {
    const r = aggregateStats(sessions, 'week', '2026-11-05');
    expect(r.startDate).toBe('2026-11-02');
    expect(r.endDate).toBe('2026-11-08');
    expect(r.buckets).toHaveLength(7);
    expect(r.totals).toEqual({ trainedDays: 2, minutes: 30 + 10 + 60, kcal: 310 });
  });

  it('同じ日に複数あってもトレーニング日数は1日。削除済みは数えない', () => {
    const r = aggregateStats(sessions, 'week', '2026-11-02');
    expect(r.buckets[0]).toEqual({ key: '2026-11-02', trainedDays: 1, minutes: 40, kcal: 110 });
    expect(r.buckets[2]?.kcal).toBe(0);
  });

  it('カテゴリ別の回数を数える', () => {
    const r = aggregateStats(sessions, 'month', '2026-11-15');
    expect(r.categoryCounts).toEqual({ chest: 2, arms: 1, neck: 1, legs: 1 });
    expect(r.buckets).toHaveLength(30);
  });

  it('年は月ごとの棒を12本作る', () => {
    const r = aggregateStats(sessions, 'year', '2026-06-01');
    expect(r.buckets).toHaveLength(12);
    expect(r.buckets[10]).toEqual({ key: '2026-11', trainedDays: 3, minutes: 130, kcal: 360 });
  });
});
