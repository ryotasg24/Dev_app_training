import { describe, expect, it } from 'vitest';
import { calcStreak, countTrainedDaysInMonth, findRecentDay } from './history';
import { jst, makeSession } from './testHelpers';

describe('日をまたぐセッション（要件定義書 3.5）', () => {
  it('23:00〜翌0:30のセッションは、開始日の記録になる', () => {
    const s = makeSession('2026-11-03T23:00', '2026-11-04T00:30', ['chest']);
    expect(s.localDate).toBe('2026-11-03');
    const recent = findRecentDay([s], jst('2026-11-04T12:00'));
    expect(recent?.localDate).toBe('2026-11-03');
    expect(recent?.isYesterday).toBe(true);
  });
});

describe('findRecentDay（F-CALD-03）', () => {
  it('昨日の記録がなければ、前回の記録を返す', () => {
    const s1 = makeSession('2026-10-30T21:00', '2026-10-30T21:30', ['chest']);
    const s2 = makeSession('2026-11-01T21:00', '2026-11-01T21:30', ['back']);
    const s3 = makeSession('2026-11-01T22:00', '2026-11-01T22:10', ['neck']);
    const recent = findRecentDay([s1, s3, s2], jst('2026-11-03T12:00'));
    expect(recent?.localDate).toBe('2026-11-01');
    expect(recent?.isYesterday).toBe(false);
    expect(recent?.sessions.map((s) => s.id)).toEqual([s2.id, s3.id]);
  });

  it('今日の記録と削除済みは含めない。記録がなければnull', () => {
    const today = makeSession('2026-11-03T07:00', '2026-11-03T07:30', ['chest']);
    const deleted = makeSession('2026-11-02T07:00', '2026-11-02T07:30', ['chest'], { deleted: 1 });
    expect(findRecentDay([today, deleted], jst('2026-11-03T12:00'))).toBeNull();
  });
});

describe('calcStreak（F-CALD-04）', () => {
  const s = (date: string) => makeSession(`${date}T21:00`, `${date}T21:30`, ['chest']);

  it('今日に記録があれば今日から数える', () => {
    const sessions = [s('2026-11-01'), s('2026-11-02'), s('2026-11-03')];
    expect(calcStreak(sessions, jst('2026-11-03T22:00'))).toBe(3);
  });

  it('今日に記録がなければ昨日から数える', () => {
    const sessions = [s('2026-11-01'), s('2026-11-02')];
    expect(calcStreak(sessions, jst('2026-11-03T08:00'))).toBe(2);
  });

  it('昨日も今日も記録がなければ0日', () => {
    expect(calcStreak([s('2026-11-01')], jst('2026-11-03T08:00'))).toBe(0);
  });

  it('同じ日に複数あっても1日として数える', () => {
    const sessions = [s('2026-11-03'), s('2026-11-03')];
    expect(calcStreak(sessions, jst('2026-11-03T23:00'))).toBe(1);
  });
});

describe('countTrainedDaysInMonth', () => {
  it('その月の、記録のある日数を数える', () => {
    const sessions = [
      makeSession('2026-10-31T21:00', '2026-10-31T21:30', ['chest']),
      makeSession('2026-11-01T21:00', '2026-11-01T21:30', ['chest']),
      makeSession('2026-11-01T22:00', '2026-11-01T22:30', ['back']),
      makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['back']),
    ];
    expect(countTrainedDaysInMonth(sessions, '2026-11')).toBe(2);
  });
});
