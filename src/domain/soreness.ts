/**
 * 筋肉痛の確認の対象を探す（要件定義書 F-BODY-05、基本設計書 5.5）。
 */
import { MS_PER_HOUR, toLocalDate } from './date';
import { findLastSession, findSoreness } from './recovery';
import type { Category, CategoryId, Session, SorenessLog } from './types';

export interface SorenessTarget {
  sessionId: string;
  categoryId: CategoryId;
}

/**
 * ホームで筋肉痛をたずねる「セッション×カテゴリ」の一覧を返す。次の条件をすべて満たすもの。
 * 1. 筋トレ系で、回復を管理しているカテゴリ
 * 2. そのカテゴリの「最後に鍛えたセッション」
 * 3. 今日が、セッションの終了時刻の日付より後（翌日以降）
 * 4. まだ回答していない
 * 5. まだ回復予定時刻を過ぎていない（未回答なので補正は0時間で計算する）
 */
export function findSorenessTargets(
  categories: readonly Category[],
  sessions: readonly Session[],
  sorenessLogs: readonly SorenessLog[],
  now: number,
): SorenessTarget[] {
  const today = toLocalDate(now);
  const targets: SorenessTarget[] = [];

  for (const category of categories) {
    if (category.deleted === 1 || category.group !== 'strength' || !category.recoveryEnabled) {
      continue;
    }
    const last = findLastSession(category.id, sessions);
    if (last === null) continue;
    if (toLocalDate(last.endAt) >= today) continue;
    if (findSoreness(last.id, category.id, sorenessLogs) !== null) continue;
    if (now >= last.endAt + category.recoveryHours * MS_PER_HOUR) continue;

    targets.push({ sessionId: last.id, categoryId: category.id });
  }
  return targets;
}
