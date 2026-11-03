/**
 * セッションの入力チェックと、保存する内容の組み立て（要件定義書 3.1、基本設計書 3.3、5.2、5.3）。
 */
import { calcCalories, calcSessionMets } from './calories';
import { durationMinutes, MS_PER_MINUTE, toLocalDate } from './date';
import { totalsOfSteps } from './steps';
import type {
  Category,
  CategoryId,
  Exercise,
  Session,
  SessionExercise,
  SessionSource,
} from './types';

/** 画面で入力された内容 */
export interface SessionDraft {
  startAt: number;
  endAt: number;
  source: SessionSource;
  categoryIds: CategoryId[];
  exercises: SessionExercise[];
  memo: string;
}

/** 手入力の所要時間の上限（分）（基本設計書 3.3） */
export const MAX_DURATION_MINUTES = 600;
/** メモの最大文字数 */
export const MAX_MEMO_LENGTH = 100;

/**
 * 入力内容を確かめ、問題があればエラーの文言を返す。問題がなければ空の配列。
 * @param draft 入力内容
 * @param now 現在時刻
 */
export function validateSessionDraft(draft: SessionDraft, now: number): string[] {
  const errors: string[] = [];
  if (draft.categoryIds.length === 0) errors.push('カテゴリを1つ以上選んでください。');
  if (draft.endAt - draft.startAt < MS_PER_MINUTE) {
    errors.push('1分未満の記録は保存できません。');
  }
  if (draft.endAt - draft.startAt > MAX_DURATION_MINUTES * MS_PER_MINUTE) {
    errors.push(`所要時間は${MAX_DURATION_MINUTES}分以内にしてください。`);
  }
  if (draft.startAt > now) errors.push('開始日時を未来にすることはできません。');
  if (draft.memo.length > MAX_MEMO_LENGTH) {
    errors.push(`メモは${MAX_MEMO_LENGTH}文字以内にしてください。`);
  }
  return errors;
}

export interface BuildSessionContext {
  /** 新規のときに使うID（UUID） */
  newId: string;
  now: number;
  /** 現在の体重。新規のときだけ使い、編集では元の値を残す（F-CAL-04） */
  currentWeightKg: number;
  categories: readonly Category[];
  exercises: readonly Exercise[];
}

/**
 * 保存するセッションを組み立てる。日付・METs・カロリーはここで計算し直す。
 * @param draft 入力内容（validateSessionDraft で確認済みのもの）
 * @param context 計算に必要な値
 * @param existing 編集の場合は元のセッション
 */
export function buildSession(
  draft: SessionDraft,
  context: BuildSessionContext,
  existing?: Session,
): Session {
  const weightKg = existing?.weightKg ?? context.currentWeightKg;

  // ステップの記録がある記録の編集で、開始日時だけを変えた場合は、全ステップを同じだけずらす。
  // それ以外を変えた場合は、ステップの記録を消して手入力と同じ計算にする（基本設計書 3.3 No.4）
  const shiftedSteps =
    existing && existing.steps.length > 0 && isOnlyStartShifted(draft, existing)
      ? existing.steps.map((s) => ({
          ...s,
          startAt: s.startAt + (draft.startAt - existing.startAt),
          endAt: s.endAt + (draft.startAt - existing.startAt),
        }))
      : [];

  const mets =
    shiftedSteps.length > 0
      ? totalsOfSteps(shiftedSteps).mets
      : calcSessionMets(draft.categoryIds, draft.exercises, context.categories, context.exercises);
  const kcal =
    shiftedSteps.length > 0
      ? totalsOfSteps(shiftedSteps).kcal
      : calcCalories(mets, weightKg, draft.endAt - draft.startAt);

  return {
    id: existing?.id ?? context.newId,
    createdAt: existing?.createdAt ?? context.now,
    updatedAt: context.now,
    deleted: 0,
    startAt: draft.startAt,
    // ステップをずらした場合は、元の終了時刻（秒まで）を同じだけずらして使う
    endAt:
      shiftedSteps.length > 0 && existing
        ? existing.endAt + (draft.startAt - existing.startAt)
        : draft.endAt,
    localDate: toLocalDate(draft.startAt),
    source: existing?.source ?? draft.source,
    categoryIds: [...draft.categoryIds],
    exercises: draft.exercises.map((e) => ({ ...e })),
    steps: shiftedSteps,
    memo: draft.memo.trim(),
    weightKg,
    mets,
    kcal,
    healthSentAt: existing?.healthSentAt ?? null,
  };
}

/**
 * 編集で、開始日時以外（所要時間・カテゴリ・種目）が変わっていないか。
 * カテゴリと種目は、順番を問わず同じものがそろっていれば同じとみなす。
 */
export function isOnlyStartShifted(draft: SessionDraft, existing: Session): boolean {
  const sameSet = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  // 画面では所要時間を分で入力するため、分にそろえて比べる（秒の違いで記録が消えないように）
  return (
    durationMinutes(draft.startAt, draft.endAt) ===
      durationMinutes(existing.startAt, existing.endAt) &&
    sameSet(draft.categoryIds, existing.categoryIds) &&
    sameSet(
      draft.exercises.map((e) => e.exerciseId),
      existing.exercises.map((e) => e.exerciseId),
    )
  );
}
