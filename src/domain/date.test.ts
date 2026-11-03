import { describe, expect, it } from 'vitest';
import { durationMinutes, formatElapsed, formatMinutes, shiftLocalDate, toLocalDate } from './date';
import { jst } from './testHelpers';

describe('toLocalDate（基本設計書 5.1）', () => {
  it('日本時間の日付を返す（UTCではまだ前日の時刻でも）', () => {
    expect(toLocalDate(jst('2026-11-04T08:59'))).toBe('2026-11-04');
  });

  it('23:59は当日、0:00は翌日', () => {
    expect(toLocalDate(jst('2026-11-03T23:59'))).toBe('2026-11-03');
    expect(toLocalDate(jst('2026-11-04T00:00'))).toBe('2026-11-04');
  });
});

describe('shiftLocalDate', () => {
  it('月や年をまたいで日付をずらせる', () => {
    expect(shiftLocalDate('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftLocalDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('durationMinutes', () => {
  it('分に四捨五入する', () => {
    const start = jst('2026-11-03T21:00');
    expect(durationMinutes(start, start + 35 * 60_000 + 29_000)).toBe(35);
    expect(durationMinutes(start, start + 35 * 60_000 + 30_000)).toBe(36);
  });
});

describe('formatElapsed', () => {
  it('HH:MM:SS 形式にする', () => {
    expect(formatElapsed((42 * 60 + 15) * 1000)).toBe('00:42:15');
    expect(formatElapsed((3 * 3600 + 5) * 1000)).toBe('03:00:05');
  });

  it('負の値は0にする', () => {
    expect(formatElapsed(-5000)).toBe('00:00:00');
  });
});

describe('formatMinutes', () => {
  it('時間と分で表示する', () => {
    expect(formatMinutes(35)).toBe('35分');
    expect(formatMinutes(60)).toBe('1時間');
    expect(formatMinutes(95)).toBe('1時間35分');
  });
});
