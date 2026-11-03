/**
 * セッションの入力チェックと、保存する内容の組み立て（要件定義書 3.1、基本設計書 3.3、5.2、5.3）。
 */
import { calcCalories, calcSessionMets } from './calories';
import { MS_PER_MINUTE, toLocalDate } from './date';
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
  const mets = calcSessionMets(
    draft.categoryIds,
    draft.exercises,
    context.categories,
    context.exercises,
  );
  return {
    id: existing?.id ?? context.newId,
    createdAt: existing?.createdAt ?? context.now,
    updatedAt: context.now,
    deleted: 0,
    startAt: draft.startAt,
    endAt: draft.endAt,
    localDate: toLocalDate(draft.startAt),
    source: existing?.source ?? draft.source,
    categoryIds: [...draft.categoryIds],
    exercises: draft.exercises.map((e) => ({ ...e })),
    memo: draft.memo.trim(),
    weightKg,
    mets,
    kcal: calcCalories(mets, weightKg, draft.endAt - draft.startAt),
    healthSentAt: existing?.healthSentAt ?? null,
  };
}
