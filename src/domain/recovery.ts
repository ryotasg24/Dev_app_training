/**
 * 回復状況の計算（要件定義書 3.3、基本設計書 5.4）。
 */
import { MS_PER_HOUR, toLocalDate } from './date';
import type {
  BodyRegionId,
  Category,
  CategoryId,
  Session,
  SorenessLevel,
  SorenessLog,
} from './types';

/**
 * 状態。
 * - fatigued：疲労中、recovering：回復中、recovered：回復済み（回復を管理するカテゴリ）
 * - doneToday：今日実施済み（回復を管理しないカテゴリ）
 * - none：記録なし／色を付けない
 */
export type RecoveryStatus = 'fatigued' | 'recovering' | 'recovered' | 'doneToday' | 'none';

export interface CategoryRecovery {
  categoryId: CategoryId;
  status: RecoveryStatus;
  /** 最後に鍛えたセッション（記録がなければnull） */
  lastSession: Session | null;
  /** 回復予定時刻。回復を管理しないカテゴリや記録がない場合はnull */
  recoveryAt: number | null;
  /** 回復までの残り時間（ミリ秒）。回復済みなら0 */
  remainingMs: number;
}

/** 疲労中とみなす割合（F-BODY-06：回復目安時間の50%まで） */
const FATIGUE_RATIO = 0.5;

/**
 * そのカテゴリを含む、削除されていないセッションのうち、終了時刻が最も新しいものを返す。
 */
export function findLastSession(
  categoryId: CategoryId,
  sessions: readonly Session[],
): Session | null {
  let last: Session | null = null;
  for (const s of sessions) {
    if (s.deleted === 1 || !s.categoryIds.includes(categoryId)) continue;
    if (last === null || s.endAt > last.endAt) last = s;
  }
  return last;
}

/**
 * セッション×カテゴリに対する筋肉痛の回答を探す。
 */
export function findSoreness(
  sessionId: string,
  categoryId: CategoryId,
  sorenessLogs: readonly SorenessLog[],
): SorenessLog | null {
  return (
    sorenessLogs.find(
      (log) => log.deleted === 0 && log.sessionId === sessionId && log.categoryId === categoryId,
    ) ?? null
  );
}

/**
 * カテゴリごとの回復状況を求める。
 *
 * @param category 対象のカテゴリ
 * @param sessions 全セッション（削除済みを含んでよい）
 * @param sorenessLogs 筋肉痛の回答
 * @param sorenessAdjustHours 筋肉痛による補正時間（F-BODY-05）
 * @param now 現在時刻
 */
export function calcCategoryRecovery(
  category: Category,
  sessions: readonly Session[],
  sorenessLogs: readonly SorenessLog[],
  sorenessAdjustHours: Record<SorenessLevel, number>,
  now: number,
): CategoryRecovery {
  const lastSession = findLastSession(category.id, sessions);
  const base = { categoryId: category.id, lastSession, recoveryAt: null, remainingMs: 0 };

  if (lastSession === null) return { ...base, status: 'none' };

  // 回復を管理しないカテゴリは、今日実施したかどうかだけを見る
  if (!category.recoveryEnabled) {
    const today = toLocalDate(now);
    const doneToday = sessions.some(
      (s) => s.deleted === 0 && s.localDate === today && s.categoryIds.includes(category.id),
    );
    return { ...base, status: doneToday ? 'doneToday' : 'none' };
  }

  const soreness = findSoreness(lastSession.id, category.id, sorenessLogs);
  const adjustHours = soreness ? sorenessAdjustHours[soreness.level] : 0;
  const totalMs = (category.recoveryHours + adjustHours) * MS_PER_HOUR;
  const recoveryAt = lastSession.endAt + totalMs;
  const fatigueUntil = lastSession.endAt + totalMs * FATIGUE_RATIO;

  let status: RecoveryStatus;
  if (now < fatigueUntil) status = 'fatigued';
  else if (now < recoveryAt) status = 'recovering';
  else status = 'recovered';

  return { ...base, status, recoveryAt, remainingMs: Math.max(recoveryAt - now, 0) };
}

/** 1つの部位に複数のカテゴリが重なったときの優先度（大きいほど優先） */
const STATUS_PRIORITY: Record<RecoveryStatus, number> = {
  fatigued: 4,
  recovering: 3,
  doneToday: 2,
  recovered: 1,
  none: 0,
};

/**
 * 人体図の部位ごとの表示状態を求める。
 * 1つの部位が複数のカテゴリに属する場合は、優先度の高い状態を採用する（基本設計書 5.4）。
 */
export function calcRegionStatuses(
  categories: readonly Category[],
  recoveries: readonly CategoryRecovery[],
): Map<BodyRegionId, RecoveryStatus> {
  const statusByCategory = new Map(recoveries.map((r) => [r.categoryId, r.status]));
  const result = new Map<BodyRegionId, RecoveryStatus>();

  for (const category of categories) {
    if (category.deleted === 1) continue;
    const status = statusByCategory.get(category.id) ?? 'none';
    for (const region of category.bodyRegions) {
      const current = result.get(region) ?? 'none';
      if (STATUS_PRIORITY[status] > STATUS_PRIORITY[current]) result.set(region, status);
      else if (!result.has(region)) result.set(region, current);
    }
  }
  return result;
}
