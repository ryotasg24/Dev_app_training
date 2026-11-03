import { describe, expect, it } from 'vitest';
import { presetExerciseId } from './master';
import {
  advanceStep,
  buildTimerSession,
  closeSteps,
  createActiveSession,
  hasNextStep,
  menuFromRecord,
  toggleMenuItem,
} from './steps';
import { categories, exercises, jst } from './testHelpers';
import type { MenuItem } from './types';

const PUSHUP: MenuItem = { categoryId: 'chest', exerciseId: presetExerciseId('chest', 0) }; // 5.0
const SQUAT: MenuItem = { categoryId: 'legs', exerciseId: presetExerciseId('legs', 0) }; // 5.0
const RUN: MenuItem = { categoryId: 'cardio', exerciseId: presetExerciseId('cardio', 0) }; // 8.0
const NECK_ONLY: MenuItem = { categoryId: 'neck', exerciseId: null }; // 2.3

const context = { newId: 'new', now: 0, weightKg: 65, categories, exercises };

describe('toggleMenuItem（F-REC-02）', () => {
  it('押した順に最後に加わる', () => {
    let menu = toggleMenuItem([], SQUAT);
    menu = toggleMenuItem(menu, PUSHUP);
    expect(menu).toEqual([SQUAT, PUSHUP]);
  });

  it('もう一度押すと取り除かれ、後ろが詰まる', () => {
    const menu = toggleMenuItem([PUSHUP, SQUAT, RUN], SQUAT);
    expect(menu).toEqual([PUSHUP, RUN]);
  });

  it('カテゴリだけの項目と、同じカテゴリの種目は別の項目として扱う', () => {
    const chestOnly: MenuItem = { categoryId: 'chest', exerciseId: null };
    expect(toggleMenuItem([PUSHUP], chestOnly)).toEqual([PUSHUP, chestOnly]);
  });
});

describe('計測中のステップ（F-REC-04）', () => {
  it('開始すると1つめのステップだけが始まる', () => {
    const active = createActiveSession([PUSHUP, SQUAT], jst('2026-11-03T21:00'));
    expect(active.steps[0]?.startAt).toBe(jst('2026-11-03T21:00'));
    expect(active.steps[1]?.startAt).toBeNull();
    expect(active.currentIndex).toBe(0);
  });

  it('「次の種目へ」で今のステップを終え、同じ時刻で次を始める', () => {
    const active = advanceStep(
      createActiveSession([PUSHUP, SQUAT], jst('2026-11-03T21:00')),
      jst('2026-11-03T21:10'),
    );
    expect(active.currentIndex).toBe(1);
    expect(active.steps[0]?.endAt).toBe(jst('2026-11-03T21:10'));
    expect(active.steps[1]?.startAt).toBe(jst('2026-11-03T21:10'));
    expect(hasNextStep(active)).toBe(false);
  });

  it('最後のステップでは進まない', () => {
    const active = createActiveSession([PUSHUP], jst('2026-11-03T21:00'));
    expect(advanceStep(active, jst('2026-11-03T21:10'))).toBe(active);
  });

  it('「ここで終了」では、まだ始めていないステップを記録しない（F-REC-12）', () => {
    const active = createActiveSession([PUSHUP, SQUAT, RUN], jst('2026-11-03T21:00'));
    const steps = closeSteps(advanceStep(active, jst('2026-11-03T21:10')), jst('2026-11-03T21:25'));
    expect(steps.map((s) => s.exerciseId)).toEqual([PUSHUP.exerciseId, SQUAT.exerciseId]);
    expect(steps[1]?.endAt).toBe(jst('2026-11-03T21:25'));
  });
});

describe('buildTimerSession（F-CAL-03、F-REC-13）', () => {
  it('設計書の例：腕立て伏せ10分＋ランニング20分、65kg → 46＋159＝205kcal', () => {
    let active = createActiveSession([PUSHUP, RUN], jst('2026-11-03T21:00'));
    active = advanceStep(active, jst('2026-11-03T21:10'));
    const s = buildTimerSession(active, jst('2026-11-03T21:30'), context);
    expect(s.steps.map((x) => x.kcal)).toEqual([46, 159]);
    expect(s.kcal).toBe(205);
    expect(s.categoryIds).toEqual(['chest', 'cardio']);
    expect(s.exercises.map((e) => e.exerciseId)).toEqual([PUSHUP.exerciseId, RUN.exerciseId]);
    // 時間で重み付けしたMETs：(5×10＋8×20)÷30＝7
    expect(s.mets).toBe(7);
    expect(s.source).toBe('timer');
  });

  it('カテゴリだけのステップは、カテゴリのMETsで計算する', () => {
    const active = createActiveSession([NECK_ONLY], jst('2026-11-03T21:00'));
    const s = buildTimerSession(active, jst('2026-11-03T22:00'), context);
    // (2.3−1)×65×1×1.05＝88.7
    expect(s.steps[0]?.mets).toBe(2.3);
    expect(s.kcal).toBe(89);
    expect(s.exercises).toEqual([]);
  });

  it('日をまたいでも、日付は開始日になる', () => {
    const active = createActiveSession([PUSHUP], jst('2026-11-03T23:50'));
    expect(buildTimerSession(active, jst('2026-11-04T00:20'), context).localDate).toBe('2026-11-03');
  });
});

describe('menuFromRecord（前回と同じ F-REC-09）', () => {
  const categoryOf = (id: string) => exercises.find((e) => e.id === id)?.categoryId;

  it('ステップがあればその順にする', () => {
    const menu = menuFromRecord(
      { categoryIds: ['chest', 'legs'], exercises: [], steps: [SQUAT, PUSHUP] },
      categoryOf,
    );
    expect(menu).toEqual([SQUAT, PUSHUP]);
  });

  it('ステップがなければ、カテゴリの順に種目（なければカテゴリだけ）を並べる', () => {
    const menu = menuFromRecord(
      {
        categoryIds: ['neck', 'chest'],
        exercises: [{ exerciseId: PUSHUP.exerciseId!, sets: null }],
      },
      categoryOf,
    );
    expect(menu).toEqual([NECK_ONLY, PUSHUP]);
  });
});
