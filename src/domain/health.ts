/**
 * ショートカット経由でヘルスケアに送る内容を作る（要件定義書 3.7、基本設計書 6章）。
 */
import { format } from 'date-fns';
import { durationMinutes } from './date';
import type { Category, Session } from './types';

/**
 * ショートカットに渡すワークアウトの種類。
 * - strength：機能的筋力トレーニング（筋トレ系を1つ以上含む）
 * - care：コアトレーニング（ケア系だけ）
 */
export type HealthWorkoutType = 'strength' | 'care';

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
  session: Pick<Session, 'categoryIds'>,
  categories: readonly Category[],
): HealthWorkoutType {
  const strengthIds = new Set(categories.filter((c) => c.group === 'strength').map((c) => c.id));
  return session.categoryIds.some((id) => strengthIds.has(id)) ? 'strength' : 'care';
}

/**
 * ショートカットに渡す内容を作る。
 */
export function buildHealthPayload(session: Session, categories: readonly Category[]): HealthPayload {
  return {
    v: 1,
    type: decideWorkoutType(session, categories),
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
