import { describe, expect, it } from 'vitest';
import { buildHealthPayload, buildShortcutUrl, decideWorkoutType } from './health';
import { presetExerciseId, RUNNING_INDOOR_ID } from './master';
import { categories, exercises, makeSession } from './testHelpers';
import type { CategoryId, SessionStep } from './types';

const RUNNING_OUTDOOR_ID = presetExerciseId('cardio', 0);

/** テスト用のステップ */
function step(categoryId: CategoryId, exerciseId: string | null): SessionStep {
  return { categoryId, exerciseId, startAt: 0, endAt: 60_000, mets: 5, kcal: 1 };
}

describe('decideWorkoutType（F-HLT-02、基本設計書 6.2）', () => {
  it('筋トレ系を1つでも含めば strength（機能的筋力トレーニング）', () => {
    const s = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['neck', 'abs', 'cardio']);
    expect(decideWorkoutType(s, categories, exercises)).toBe('strength');
  });

  it('ケア系だけなら care（コアトレーニング）', () => {
    const s = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['neck', 'hip']);
    expect(decideWorkoutType(s, categories, exercises)).toBe('care');
  });

  it('筋トレ系がなく、屋外のランニングを含めば running', () => {
    const s = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['cardio', 'neck'], {
      steps: [step('cardio', RUNNING_OUTDOOR_ID), step('cardio', RUNNING_INDOOR_ID), step('neck', null)],
    });
    expect(decideWorkoutType(s, categories, exercises)).toBe('running');
  });

  it('有酸素が屋内のランニングだけなら runningIndoor', () => {
    const s = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['cardio'], {
      steps: [step('cardio', RUNNING_INDOOR_ID)],
    });
    expect(decideWorkoutType(s, categories, exercises)).toBe('runningIndoor');
  });

  it('ステップがない記録（手入力）でも、種目から屋内・屋外を判定する。種目なしの有酸素は屋外', () => {
    const indoor = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['cardio'], {
      exercises: [{ exerciseId: RUNNING_INDOOR_ID, sets: null }],
    });
    const noExercise = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['cardio']);
    expect(decideWorkoutType(indoor, categories, exercises)).toBe('runningIndoor');
    expect(decideWorkoutType(noExercise, categories, exercises)).toBe('running');
  });
});

describe('buildHealthPayload（基本設計書 6.3）', () => {
  it('開始日時をiPhoneの日本語表示の形式にする', () => {
    const s = makeSession('2026-11-03T09:05', '2026-11-03T09:40', ['chest'], { kcal: 159 });
    expect(buildHealthPayload(s, categories, exercises)).toEqual({
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
