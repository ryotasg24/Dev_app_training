import { describe, expect, it } from 'vitest';
import { buildHealthPayload, buildShortcutUrl, decideWorkoutType } from './health';
import { categories, makeSession } from './testHelpers';

describe('decideWorkoutType（F-HLT-02）', () => {
  it('筋トレ系を1つでも含めば strength（機能的筋力トレーニング）', () => {
    expect(decideWorkoutType({ categoryIds: ['neck', 'abs'] }, categories)).toBe('strength');
  });

  it('ケア系だけなら care（コアトレーニング）', () => {
    expect(decideWorkoutType({ categoryIds: ['neck', 'hip'] }, categories)).toBe('care');
  });
});

describe('buildHealthPayload（基本設計書 6.3）', () => {
  it('開始日時をiPhoneの日本語表示の形式にする', () => {
    const s = makeSession('2026-11-03T09:05', '2026-11-03T09:40', ['chest'], { kcal: 159 });
    expect(buildHealthPayload(s, categories)).toEqual({
      v: 1,
      type: 'strength',
      start: '2026/11/03 9:05',
      minutes: 35,
      kcal: 159,
    });
  });
});

describe('buildShortcutUrl', () => {
  it('名前と内容をURL用に変換する', () => {
    const url = buildShortcutUrl('筋トレ記録をヘルスケアへ', {
      v: 1,
      type: 'care',
      start: '2026/11/03 21:00',
      minutes: 10,
      kcal: 12,
    });
    expect(url.startsWith('shortcuts://run-shortcut?name=')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('name')).toBe('筋トレ記録をヘルスケアへ');
    expect(params.get('input')).toBe('text');
    expect(JSON.parse(params.get('text')!)).toMatchObject({ type: 'care', minutes: 10 });
  });
});
