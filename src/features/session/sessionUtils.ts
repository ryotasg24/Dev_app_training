/**
 * 記録まわりの画面で共通に使う処理。
 */
import { menuFromRecord } from '../../domain/steps';
import type {
  Category,
  CategoryGroup,
  CategoryId,
  Exercise,
  MenuItem,
  Session,
} from '../../domain/types';
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

/** カテゴリの区分を表示する順 */
export const GROUP_ORDER: readonly CategoryGroup[] = ['strength', 'care', 'cardio'];

/** 前回のセッション（終了時刻が最も新しい記録）からメニューを作る（「前回と同じ」F-REC-09） */
export function previousMenu(
  sessions: readonly Session[] | undefined,
  exercises: readonly Exercise[],
): MenuItem[] {
  const last = (sessions ?? [])
    .filter((s) => s.deleted === 0)
    .reduce<Session | null>((a, b) => (a === null || b.endAt > a.endAt ? b : a), null);
  if (!last) return [];
  return menuFromRecord(last, (id) => exercises.find((e) => e.id === id)?.categoryId);
}

/** メニュー項目の名前。例：「腕立て伏せ」、カテゴリだけなら「スマホ首（種目なし）」 */
export function menuItemName(
  item: MenuItem,
  categories: readonly Category[],
  exercises: readonly Exercise[],
): string {
  const categoryName = categories.find((c) => c.id === item.categoryId)?.name ?? item.categoryId;
  if (!item.exerciseId) return `${categoryName}（種目なし）`;
  return exercises.find((e) => e.id === item.exerciseId)?.name ?? categoryName;
}

/** カテゴリ名 */
export function categoryName(id: CategoryId, categories: readonly Category[]): string {
  return categories.find((c) => c.id === id)?.name ?? id;
}

/** 1〜20は丸数字、それ以上は「21.」の形の番号 */
export function stepNumber(index: number): string {
  const n = index + 1;
  return n <= 20 ? String.fromCodePoint(0x2460 + n - 1) : `${n}.`;
}

/** エラーを文言にする */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '保存に失敗しました。';
}
