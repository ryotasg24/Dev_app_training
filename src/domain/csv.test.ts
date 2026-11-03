import { describe, expect, it } from 'vitest';
import { buildSessionsCsv, CSV_BOM } from './csv';
import { presetExerciseId } from './master';
import { categories, exercises, makeSession } from './testHelpers';

describe('buildSessionsCsv（F-DATA-07）', () => {
  it('先頭にBOMを付け、1行1セッション・CRLF区切りで書き出す', () => {
    const s = makeSession('2026-11-03T21:00', '2026-11-03T21:35', ['chest', 'arms'], {
      exercises: [{ exerciseId: presetExerciseId('chest', 0), sets: null }],
      kcal: 159,
      memo: '少し疲れ気味',
    });
    const csv = buildSessionsCsv([s], categories, exercises);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(
      '2026-11-03,21:00,21:35,35,大胸筋／腕,腕立て伏せ,159,65.0,少し疲れ気味,未',
    );
  });

  it('カンマや引用符を含むメモは引用符で囲む。削除済みは出さない', () => {
    const s = makeSession('2026-11-03T21:00', '2026-11-03T21:35', ['chest'], {
      memo: '肩が"重い", 軽め',
      healthSentAt: 1,
    });
    const deleted = makeSession('2026-11-04T21:00', '2026-11-04T21:35', ['chest'], { deleted: 1 });
    const lines = buildSessionsCsv([s, deleted], categories, exercises).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"肩が""重い"", 軽め",済');
  });
});
