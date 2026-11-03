/**
 * 日付と時間の計算（基本設計書 5.1、5.2）。
 * 日付はすべて端末の時間帯で決める。
 */
import { addDays, format, parseISO } from 'date-fns';

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export { MS_PER_MINUTE, MS_PER_HOUR, MS_PER_DAY };

/**
 * 時刻を、端末の時間帯での日付文字列（YYYY-MM-DD）に変換する。
 * セッションの日付は開始時刻をこの関数に通して決める（要件定義書 3.5）。
 */
export function toLocalDate(ms: number): string {
  return format(ms, 'yyyy-MM-dd');
}

/**
 * 日付文字列を、指定した日数だけずらす。
 * @param localDate YYYY-MM-DD
 * @param days ずらす日数（負の値で過去へ）
 */
export function shiftLocalDate(localDate: string, days: number): string {
  return format(addDays(parseISO(localDate), days), 'yyyy-MM-dd');
}

/**
 * 所要時間（分）を求める。1分未満は四捨五入する（基本設計書 5.2）。
 */
export function durationMinutes(startAt: number, endAt: number): number {
  return Math.round((endAt - startAt) / MS_PER_MINUTE);
}

/**
 * 計測中の経過時間を HH:MM:SS 形式にする。
 * @param elapsedMs 経過時間（ミリ秒）。負の値は0として扱う
 */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * 分を「◯時間◯分」の表示にする。
 */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}
