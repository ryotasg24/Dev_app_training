import { describe, expect, it } from 'vitest';
import { buildSession, validateSessionDraft, type SessionDraft } from './session';
import { presetExerciseId } from './master';
import { categories, exercises, jst, makeSession } from './testHelpers';

const draft: SessionDraft = {
  startAt: jst('2026-11-03T23:30'),
  endAt: jst('2026-11-04T00:05'),
  source: 'timer',
  categoryIds: ['chest'],
  exercises: [],
  memo: '  夜遅め  ',
};

describe('validateSessionDraft', () => {
  const now = jst('2026-11-04T01:00');

  it('正しい入力ならエラーなし', () => {
    expect(validateSessionDraft(draft, now)).toEqual([]);
  });

  it('カテゴリなし・1分未満・未来の開始日時はエラー', () => {
    const errors = validateSessionDraft(
      { ...draft, categoryIds: [], startAt: now + 1000, endAt: now + 30_000 },
      now,
    );
    expect(errors).toHaveLength(3);
  });

  it('所要時間は600分まで', () => {
    const start = jst('2026-11-03T08:00');
    expect(validateSessionDraft({ ...draft, startAt: start, endAt: start + 600 * 60_000 }, now)).toEqual([]);
    expect(validateSessionDraft({ ...draft, startAt: start, endAt: start + 601 * 60_000 }, now)).toHaveLength(1);
  });
});

describe('buildSession', () => {
  const context = {
    newId: 'new-id',
    now: jst('2026-11-04T00:06'),
    currentWeightKg: 65,
    categories,
    exercises,
  };

  it('日付は開始日、カロリーは保存時の体重で計算し、メモの前後の空白を取る', () => {
    const s = buildSession(draft, context);
    expect(s.id).toBe('new-id');
    expect(s.localDate).toBe('2026-11-03');
    expect(s.weightKg).toBe(65);
    expect(s.mets).toBe(5);
    expect(s.kcal).toBe(159);
    expect(s.memo).toBe('夜遅め');
    expect(s.healthSentAt).toBeNull();
  });

  it('編集では元の体重・ID・作成日時・送信状況を残し、カロリーは計算し直す（F-CAL-04）', () => {
    const original = buildSession(draft, context);
    const sent = { ...original, healthSentAt: 123 };
    const edited = buildSession(
      { ...draft, categoryIds: ['neck'] },
      { ...context, now: context.now + 1000, currentWeightKg: 80, newId: 'unused' },
      sent,
    );
    expect(edited.id).toBe(original.id);
    expect(edited.createdAt).toBe(original.createdAt);
    expect(edited.weightKg).toBe(65);
    expect(edited.healthSentAt).toBe(123);
    expect(edited.mets).toBe(2.3);
    expect(edited.updatedAt).toBe(context.now + 1000);
  });
});

describe('ステップの記録がある記録の編集（基本設計書 3.3 No.4）', () => {
  const context = {
    newId: 'unused',
    now: jst('2026-11-04T09:00'),
    currentWeightKg: 80,
    categories,
    exercises,
  };
  // 21:00〜21:10 腕立て伏せ、21:10〜21:30（＋20秒）ランニング
  const pushup = presetExerciseId('chest', 0);
  const run = presetExerciseId('cardio', 0);
  const original = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['chest', 'cardio'], {
    endAt: jst('2026-11-03T21:30') + 20_000,
    exercises: [
      { exerciseId: pushup, sets: null },
      { exerciseId: run, sets: null },
    ],
    steps: [
      { categoryId: 'chest', exerciseId: pushup, startAt: jst('2026-11-03T21:00'), endAt: jst('2026-11-03T21:10'), mets: 5, kcal: 46 },
      { categoryId: 'cardio', exerciseId: run, startAt: jst('2026-11-03T21:10'), endAt: jst('2026-11-03T21:30') + 20_000, mets: 8, kcal: 160 },
    ],
    kcal: 206,
  });
  const sameDraft: SessionDraft = {
    startAt: original.startAt,
    endAt: original.startAt + 30 * 60_000,
    source: 'timer',
    categoryIds: ['cardio', 'chest'],
    exercises: original.exercises,
    memo: '変更',
  };

  it('メモだけを変えた場合は、ステップと秒までの終了時刻を残す', () => {
    const edited = buildSession(sameDraft, context, original);
    expect(edited.steps).toEqual(original.steps);
    expect(edited.endAt).toBe(original.endAt);
    expect(edited.kcal).toBe(206);
    expect(edited.memo).toBe('変更');
  });

  it('開始日時だけを変えた場合は、全ステップを同じだけずらす', () => {
    const hour = 3_600_000;
    const edited = buildSession(
      { ...sameDraft, startAt: sameDraft.startAt - hour, endAt: sameDraft.endAt - hour },
      context,
      original,
    );
    expect(edited.steps[1]?.startAt).toBe(jst('2026-11-03T20:10'));
    expect(edited.endAt).toBe(original.endAt - hour);
  });

  it('所要時間やカテゴリを変えた場合は、ステップの記録を消して平均で計算し直す', () => {
    const edited = buildSession(
      { ...sameDraft, endAt: sameDraft.startAt + 40 * 60_000 },
      context,
      original,
    );
    expect(edited.steps).toEqual([]);
    expect(edited.weightKg).toBe(65);
  });
});
