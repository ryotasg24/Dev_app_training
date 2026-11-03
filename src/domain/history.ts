/**
 * 履歴の集計：昨日やったこと、連続日数、今月の日数（要件定義書 3.5、基本設計書 5.6）。
 * 日付はすべてセッションの localDate（開始時刻の日付）で数える。
 */
import { shiftLocalDate, toLocalDate } from './date';
import type { Session } from './types';

/** 削除されていないセッションだけを、開始時刻の古い順に返す */
export function activeSessions(sessions: readonly Session[]): Session[] {
  return sessions.filter((s) => s.deleted === 0).sort((a, b) => a.startAt - b.startAt);
}

export interface RecentDay {
  localDate: string;
  /** 昨日の記録ならtrue、それより前の「前回」ならfalse */
  isYesterday: boolean;
  sessions: Session[];
}

/**
 * ホームの「昨日やったこと」に出す日を探す（F-CALD-03）。
 * 昨日の記録がなければ、今日より前で最も新しい日の記録を返す。記録がなければnull。
 */
export function findRecentDay(sessions: readonly Session[], now: number): RecentDay | null {
  const today = toLocalDate(now);
  const yesterday = shiftLocalDate(today, -1);
  const past = activeSessions(sessions).filter((s) => s.localDate < today);
  if (past.length === 0) return null;

  const latestDate = past.reduce((max, s) => (s.localDate > max ? s.localDate : max), '');
  return {
    localDate: latestDate,
    isYesterday: latestDate === yesterday,
    sessions: past.filter((s) => s.localDate === latestDate),
  };
}

/** 記録のある日付の集合を返す */
export function trainedDates(sessions: readonly Session[]): Set<string> {
  return new Set(activeSessions(sessions).map((s) => s.localDate));
}

/**
 * 連続でトレーニングした日数を求める（F-CALD-04）。
 * 今日に記録があれば今日から、なければ昨日から、1日ずつさかのぼって数える。
 */
export function calcStreak(sessions: readonly Session[], now: number): number {
  const dates = trainedDates(sessions);
  const today = toLocalDate(now);
  let cursor = dates.has(today) ? today : shiftLocalDate(today, -1);
  let count = 0;
  while (dates.has(cursor)) {
    count += 1;
    cursor = shiftLocalDate(cursor, -1);
  }
  return count;
}

/**
 * 指定した月にトレーニングした日数を求める（F-CALD-04）。
 * @param yearMonth YYYY-MM
 */
export function countTrainedDaysInMonth(sessions: readonly Session[], yearMonth: string): number {
  let count = 0;
  for (const date of trainedDates(sessions)) {
    if (date.startsWith(`${yearMonth}-`)) count += 1;
  }
  return count;
}
