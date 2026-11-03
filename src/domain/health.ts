/**
 * ショートカット経由でヘルスケアに送る内容を作る（要件定義書 3.7、基本設計書 6章）。
 */
import { format } from 'date-fns';
import { durationMinutes } from './date';
import { RUNNING_INDOOR_ID } from './master';
import type { Category, Exercise, Session } from './types';

/**
 * ショートカットに渡すワークアウトの種類（基本設計書 6.2）。
 * - strength：機能的筋力トレーニング（筋トレ系を1つ以上含む）
 * - running：ランニング（屋外）（筋トレ系がなく、有酸素を含む）
 * - runningIndoor：ランニング（屋内）（筋トレ系がなく、有酸素は屋内のランニングだけ）
 * - care：コアトレーニング（ケア系だけ）
 */
export type HealthWorkoutType = 'strength' | 'running' | 'runningIndoor' | 'care';

/** ショートカットに渡すJSON（基本設計書 6.3） */
export interface HealthPayload {
  /** 形式の版 */
  v: 1;
  type: HealthWorkoutType;
  /** 開始日時。iPhoneの日本語表示と同じ形式（例：2026/11/03 21:00） */
  start: string;
  minutes: number;
  kcal: number;
}

/**
 * セッションのワークアウトの種類を決める（F-HLT-02）。
 */
export function decideWorkoutType(
  session: Pick<Session, 'categoryIds' | 'exercises' | 'steps'>,
  categories: readonly Category[],
  exercises: readonly Exercise[],
): HealthWorkoutType {
  const groupOf = (id: string) => categories.find((c) => c.id === id)?.group;
  if (session.categoryIds.some((id) => groupOf(id) === 'strength')) return 'strength';

  const cardioIds = session.categoryIds.filter((id) => groupOf(id) === 'cardio');
  if (cardioIds.length === 0) return 'care';

  // 有酸素の中身（種目のID。種目なしは null）。屋内のランニングだけなら屋内、それ以外は屋外
  const cardioItems: (string | null)[] =
    session.steps.length > 0
      ? session.steps.filter((s) => groupOf(s.categoryId) === 'cardio').map((s) => s.exerciseId)
      : cardioIds.flatMap((categoryId) => {
          const ids = session.exercises
            .map((e) => e.exerciseId)
            .filter((id) => exercises.find((x) => x.id === id)?.categoryId === categoryId);
          return ids.length > 0 ? ids : [null];
        });
  return cardioItems.every((id) => id === RUNNING_INDOOR_ID) ? 'runningIndoor' : 'running';
}

/**
 * ショートカットに渡す内容を作る。1つのセッションを1件のワークアウトにまとめる（F-HLT-02）。
 */
export function buildHealthPayload(
  session: Session,
  categories: readonly Category[],
  exercises: readonly Exercise[],
): HealthPayload {
  return {
    v: 1,
    type: decideWorkoutType(session, categories, exercises),
    start: format(session.startAt, 'yyyy/MM/dd H:mm'),
    minutes: durationMinutes(session.startAt, session.endAt),
    kcal: session.kcal,
  };
}

/**
 * ショートカットを起動するURLを作る。
 * @param shortcutName 設定のショートカット名
 * @param payload 渡す内容（JSON文字列にしてテキストとして渡す）
 */
export function buildShortcutUrl(shortcutName: string, payload: HealthPayload): string {
  const name = encodeURIComponent(shortcutName);
  const text = encodeURIComponent(JSON.stringify(payload));
  return `shortcuts://run-shortcut?name=${name}&input=text&text=${text}`;
}
