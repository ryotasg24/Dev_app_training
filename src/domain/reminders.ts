/**
 * ホームに出すお知らせの判定（基本設計書 5.7、5.8）。
 */
import { MS_PER_DAY, MS_PER_HOUR } from './date';
import type { ActiveSession } from './types';

/**
 * 終了し忘れのお知らせを出すかどうか（F-REC-08）。
 * @param active 計測中のセッション（なければnull）
 * @param forgotEndHours 終了し忘れと判断するまでの時間
 * @param now 現在時刻
 */
export function isForgotToEnd(
  active: ActiveSession | null,
  forgotEndHours: number,
  now: number,
): boolean {
  if (active === null) return false;
  return now - active.startAt >= forgotEndHours * MS_PER_HOUR;
}

/**
 * 終了し忘れの保存で、終了時刻の初期値を求める。開始時刻＋1時間とし、現在時刻を超えないようにする。
 */
export function defaultForgotEndAt(startAt: number, now: number): number {
  return Math.min(startAt + MS_PER_HOUR, now);
}

/**
 * バックアップを促すお知らせを出すかどうか（F-DATA-05）。
 * 基準は最後にバックアップした時刻。一度もしていなければ初回起動の時刻。
 *
 * @param lastBackupAt 最後にバックアップした時刻（なければnull）
 * @param firstLaunchAt 初回起動の時刻
 * @param reminderDays 促すまでの日数
 * @param sessionCount 削除されていない記録の件数
 * @param now 現在時刻
 */
export function needsBackupReminder(
  lastBackupAt: number | null,
  firstLaunchAt: number,
  reminderDays: number,
  sessionCount: number,
  now: number,
): boolean {
  if (sessionCount === 0) return false;
  const baseAt = lastBackupAt ?? firstLaunchAt;
  return now - baseAt >= reminderDays * MS_PER_DAY;
}
