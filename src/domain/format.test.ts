import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatLocalDate,
  formatRemaining,
  fromDateTimeInputValue,
  toDateTimeInputValue,
} from './format';
import { jst } from './testHelpers';

describe('日付の表示', () => {
  it('曜日つきで表示する', () => {
    expect(formatDate(jst('2026-11-03T21:05'))).toBe('11/3(火)');
    expect(formatDateTime(jst('2026-11-03T09:05'))).toBe('11/3(火) 09:05');
    expect(formatLocalDate('2026-11-01')).toBe('11/1(日)');
  });
});

describe('formatRemaining', () => {
  it('1時間以上は時間、未満は分で切り上げて表示する', () => {
    expect(formatRemaining(37.2 * 3_600_000)).toBe('あと38時間');
    expect(formatRemaining(44.5 * 60_000)).toBe('あと45分');
    expect(formatRemaining(0)).toBe('回復済み');
  });
});

describe('datetime-local の値', () => {
  it('行き来しても同じ時刻に戻る', () => {
    const ms = jst('2026-11-03T21:05');
    expect(toDateTimeInputValue(ms)).toBe('2026-11-03T21:05');
    expect(fromDateTimeInputValue('2026-11-03T21:05')).toBe(ms);
    expect(fromDateTimeInputValue('')).toBeNull();
  });
});
