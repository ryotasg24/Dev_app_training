/**
 * 記録まわりの画面で共通に使う処理。
 */
import type { Category, Exercise, Session } from '../../domain/types';
import type { Selection } from './CategoryPicker';

/** 「前回と同じ」で選ぶ内容：終了時刻が最も新しい記録のカテゴリと種目（F-REC-09） */
export function previousSelection(sessions: readonly Session[] | undefined): Selection | null {
  const last = (sessions ?? [])
    .filter((s) => s.deleted === 0)
    .reduce<Session | null>((a, b) => (a === null || b.endAt > a.endAt ? b : a), null);
  return last ? { categoryIds: [...last.categoryIds], exercises: [...last.exercises] } : null;
}

/** カテゴリ名を「・」でつなぐ */
export function categoryNames(session: Session, categories: readonly Category[]): string {
  return session.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name ?? id)
    .join('・');
}

/** 種目名を「・」でつなぐ */
export function exerciseNames(session: Session, exercises: readonly Exercise[]): string {
  return session.exercises
    .map((e) => exercises.find((x) => x.id === e.exerciseId)?.name ?? '')
    .filter(Boolean)
    .join('・');
}

/** エラーを文言にする */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '保存に失敗しました。';
}
