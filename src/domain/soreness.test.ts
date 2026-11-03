import { describe, expect, it } from 'vitest';
import { findSorenessTargets } from './soreness';
import { categories, jst, makeSession, makeSoreness } from './testHelpers';

describe('findSorenessTargets（F-BODY-05、基本設計書 5.5）', () => {
  const session = makeSession('2026-11-03T21:00', '2026-11-03T21:40', ['chest', 'abs', 'neck']);

  it('鍛えた当日はたずねない', () => {
    expect(findSorenessTargets(categories, [session], [], jst('2026-11-03T23:00'))).toEqual([]);
  });

  it('翌日以降に、筋トレ系のカテゴリだけをたずねる（ケア系は除く）', () => {
    const targets = findSorenessTargets(categories, [session], [], jst('2026-11-04T07:00'));
    expect(targets.map((t) => t.categoryId).sort()).toEqual(['abs', 'chest']);
  });

  it('回答済みのカテゴリはたずねない', () => {
    const logs = [makeSoreness(session.id, 'chest', 'light')];
    const targets = findSorenessTargets(categories, [session], logs, jst('2026-11-04T07:00'));
    expect(targets.map((t) => t.categoryId)).toEqual(['abs']);
  });

  it('回復予定時刻を過ぎたらたずねない（腹筋は24時間）', () => {
    const targets = findSorenessTargets(categories, [session], [], jst('2026-11-04T21:40'));
    expect(targets.map((t) => t.categoryId)).toEqual(['chest']);
  });

  it('日をまたいだセッションは、終了日の翌日からたずねる', () => {
    const late = makeSession('2026-11-03T23:30', '2026-11-04T00:30', ['back']);
    expect(findSorenessTargets(categories, [late], [], jst('2026-11-04T07:00'))).toEqual([]);
    expect(
      findSorenessTargets(categories, [late], [], jst('2026-11-05T07:00')).map((t) => t.categoryId),
    ).toEqual(['back']);
  });
});
