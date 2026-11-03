import { describe, expect, it } from 'vitest';
import { defaultForgotEndAt, isForgotToEnd, needsBackupReminder } from './reminders';
import { jst } from './testHelpers';
import type { ActiveSession } from './types';

describe('isForgotToEnd（F-REC-08）', () => {
  const active: ActiveSession = {
    key: 'current',
    startAt: jst('2026-11-03T21:00'),
    categoryIds: [],
    exercises: [],
    memo: '',
  };

  it('開始から3時間ちょうどで終了し忘れと判断する', () => {
    expect(isForgotToEnd(active, 3, jst('2026-11-03T23:59'))).toBe(false);
    expect(isForgotToEnd(active, 3, jst('2026-11-04T00:00'))).toBe(true);
  });

  it('計測中でなければ判断しない', () => {
    expect(isForgotToEnd(null, 3, jst('2026-11-04T00:00'))).toBe(false);
  });

  it('終了時刻の初期値は開始＋1時間。ただし現在時刻を超えない', () => {
    expect(defaultForgotEndAt(jst('2026-11-03T21:00'), jst('2026-11-04T08:00'))).toBe(
      jst('2026-11-03T22:00'),
    );
    expect(defaultForgotEndAt(jst('2026-11-03T21:00'), jst('2026-11-03T21:30'))).toBe(
      jst('2026-11-03T21:30'),
    );
  });
});

describe('needsBackupReminder（F-DATA-05）', () => {
  const first = jst('2026-10-01T12:00');

  it('最後のバックアップから7日ちょうどで促す', () => {
    const last = jst('2026-10-27T12:00');
    expect(needsBackupReminder(last, first, 7, 5, jst('2026-11-03T11:59'))).toBe(false);
    expect(needsBackupReminder(last, first, 7, 5, jst('2026-11-03T12:00'))).toBe(true);
  });

  it('一度もバックアップしていなければ初回起動から数える', () => {
    expect(needsBackupReminder(null, first, 7, 1, jst('2026-10-08T12:00'))).toBe(true);
  });

  it('記録が0件なら促さない', () => {
    expect(needsBackupReminder(null, first, 7, 0, jst('2026-11-03T12:00'))).toBe(false);
  });
});
