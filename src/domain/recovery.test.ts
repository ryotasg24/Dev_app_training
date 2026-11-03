import { describe, expect, it } from 'vitest';
import { calcCategoryRecovery, calcRegionStatuses, type CategoryRecovery } from './recovery';
import { categories, jst, makeSession, makeSoreness } from './testHelpers';
import type { Category, CategoryId } from './types';

const ADJUST = { none: 0, light: 12, strong: 24 };

function category(id: CategoryId): Category {
  return categories.find((c) => c.id === id)!;
}

describe('calcCategoryRecovery（F-BODY-03、06）', () => {
  // 大胸筋：回復目安72時間 → 36時間までが疲労中
  const session = makeSession('2026-11-01T20:00', '2026-11-01T21:00', ['chest']);

  it('記録がなければ none', () => {
    const r = calcCategoryRecovery(category('chest'), [], [], ADJUST, jst('2026-11-03T12:00'));
    expect(r.status).toBe('none');
    expect(r.recoveryAt).toBeNull();
  });

  it('終了から50%未満は疲労中、50%ちょうどからは回復中', () => {
    const chest = category('chest');
    const justBefore = jst('2026-11-03T08:59');
    const exactlyHalf = jst('2026-11-03T09:00'); // 終了21:00 + 36時間
    expect(calcCategoryRecovery(chest, [session], [], ADJUST, justBefore).status).toBe('fatigued');
    expect(calcCategoryRecovery(chest, [session], [], ADJUST, exactlyHalf).status).toBe(
      'recovering',
    );
  });

  it('回復予定時刻ちょうどで回復済みになり、残り時間は0', () => {
    const r = calcCategoryRecovery(
      category('chest'),
      [session],
      [],
      ADJUST,
      jst('2026-11-04T21:00'),
    );
    expect(r.status).toBe('recovered');
    expect(r.recoveryAt).toBe(jst('2026-11-04T21:00'));
    expect(r.remainingMs).toBe(0);
  });

  it('筋肉痛「強い」なら回復予定時刻が24時間延びる（F-BODY-05）', () => {
    const soreness = [makeSoreness(session.id, 'chest', 'strong')];
    const r = calcCategoryRecovery(
      category('chest'),
      [session],
      soreness,
      ADJUST,
      jst('2026-11-04T21:00'),
    );
    expect(r.recoveryAt).toBe(jst('2026-11-05T21:00'));
    expect(r.status).toBe('recovering');
  });

  it('終了時刻が最も新しいセッションを使い、削除済みは無視する', () => {
    const newer = makeSession('2026-11-02T20:00', '2026-11-02T21:00', ['chest']);
    const deleted = makeSession('2026-11-03T07:00', '2026-11-03T08:00', ['chest'], { deleted: 1 });
    const r = calcCategoryRecovery(
      category('chest'),
      [session, deleted, newer],
      [],
      ADJUST,
      jst('2026-11-03T12:00'),
    );
    expect(r.lastSession?.id).toBe(newer.id);
  });

  it('回復を管理しないカテゴリは、今日実施していれば doneToday、昨日なら none', () => {
    const care = makeSession('2026-11-03T07:00', '2026-11-03T07:20', ['neck']);
    const neck = category('neck');
    expect(calcCategoryRecovery(neck, [care], [], ADJUST, jst('2026-11-03T22:00')).status).toBe(
      'doneToday',
    );
    expect(calcCategoryRecovery(neck, [care], [], ADJUST, jst('2026-11-04T07:00')).status).toBe(
      'none',
    );
  });
});

describe('calcRegionStatuses（基本設計書 5.4）', () => {
  it('部位が重なるときは優先度の高い状態を採用する（臀部：下半身の疲労中 ＞ 反り腰の実施済み）', () => {
    const recoveries: CategoryRecovery[] = [
      { categoryId: 'legs', status: 'fatigued', lastSession: null, recoveryAt: 0, remainingMs: 0 },
      { categoryId: 'posture', status: 'doneToday', lastSession: null, recoveryAt: null, remainingMs: 0 },
    ];
    const map = calcRegionStatuses(categories, recoveries);
    expect(map.get('glutes')).toBe('fatigued');
    // 腰は背中（記録なし）と反り腰（実施済み）が重なる → 実施済み
    expect(map.get('erectors')).toBe('doneToday');
    expect(map.get('chest')).toBe('none');
  });
});
