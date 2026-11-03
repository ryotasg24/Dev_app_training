/**
 * 画面に表示する文字の形式。
 */
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MS_PER_HOUR, MS_PER_MINUTE } from './date';

/** 例：11/3(火) */
export function formatDate(ms: number): string {
  return format(ms, 'M/d(E)', { locale: ja });
}

/** 日付文字列（YYYY-MM-DD）を 11/3(火) の形にする */
export function formatLocalDate(localDate: string): string {
  return formatDate(new Date(`${localDate}T00:00:00`).getTime());
}

/** 例：21:05 */
export function formatTime(ms: number): string {
  return format(ms, 'HH:mm');
}

/** 例：11/3(火) 21:05 */
export function formatDateTime(ms: number): string {
  return `${formatDate(ms)} ${formatTime(ms)}`;
}

/**
 * 回復までの残り時間を表示する。1時間以上は時間単位（切り上げ）、未満は分単位（切り上げ）。
 * 例：あと38時間、あと45分
 */
export function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return '回復済み';
  if (remainingMs >= MS_PER_HOUR) return `あと${Math.ceil(remainingMs / MS_PER_HOUR)}時間`;
  return `あと${Math.ceil(remainingMs / MS_PER_MINUTE)}分`;
}

/** <input type="datetime-local"> に入れる値（端末の時間帯） */
export function toDateTimeInputValue(ms: number): string {
  return format(ms, "yyyy-MM-dd'T'HH:mm");
}

/** <input type="datetime-local"> の値を時刻にする。不正な値ならnull */
export function fromDateTimeInputValue(value: string): number | null {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}
