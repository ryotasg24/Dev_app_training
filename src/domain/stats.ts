/**
 * グラフの集計（要件定義書 3.6、基本設計書 5.10）。
 */
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { durationMinutes } from './date';
import { activeSessions } from './history';
import type { CategoryId, Session } from './types';

export type StatsPeriod = 'week' | 'month' | 'year';

export interface StatsBucket {
  /** 日の集計なら YYYY-MM-DD、月の集計なら YYYY-MM */
  key: string;
  trainedDays: number;
  minutes: number;
  kcal: number;
}

export interface StatsResult {
  /** 期間の最初と最後の日（YYYY-MM-DD） */
  startDate: string;
  endDate: string;
  buckets: StatsBucket[];
  totals: Omit<StatsBucket, 'key'>;
  /** カテゴリが含まれるセッションの数（F-GRA-03） */
  categoryCounts: Partial<Record<CategoryId, number>>;
}

/**
 * 期間を集計する。
 * @param sessions 全セッション（削除済みを含んでよい）
 * @param period 週（月曜始まり）・月・年
 * @param anchorDate 期間に含まれる任意の日（YYYY-MM-DD）
 */
export function aggregateStats(
  sessions: readonly Session[],
  period: StatsPeriod,
  anchorDate: string,
): StatsResult {
  const anchor = parseISO(anchorDate);
  const [start, end] = periodRange(period, anchor);
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(end, 'yyyy-MM-dd');

  const inRange = activeSessions(sessions).filter(
    (s) => s.localDate >= startDate && s.localDate <= endDate,
  );

  // 年は月ごと、週と月は日ごとに棒を作る
  const keyOf = (localDate: string) => (period === 'year' ? localDate.slice(0, 7) : localDate);
  const keys =
    period === 'year'
      ? eachMonthOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM'))
      : eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));

  const bucketMap = new Map(
    keys.map((key) => [key, { key, dates: new Set<string>(), minutes: 0, kcal: 0 }]),
  );
  const categoryCounts: Partial<Record<CategoryId, number>> = {};

  for (const s of inRange) {
    const bucket = bucketMap.get(keyOf(s.localDate));
    if (bucket) {
      bucket.dates.add(s.localDate);
      bucket.minutes += durationMinutes(s.startAt, s.endAt);
      bucket.kcal += s.kcal;
    }
    for (const id of new Set(s.categoryIds)) {
      categoryCounts[id] = (categoryCounts[id] ?? 0) + 1;
    }
  }

  const buckets: StatsBucket[] = [...bucketMap.values()].map((b) => ({
    key: b.key,
    trainedDays: b.dates.size,
    minutes: b.minutes,
    kcal: b.kcal,
  }));

  return {
    startDate,
    endDate,
    buckets,
    totals: {
      trainedDays: buckets.reduce((sum, b) => sum + b.trainedDays, 0),
      minutes: buckets.reduce((sum, b) => sum + b.minutes, 0),
      kcal: buckets.reduce((sum, b) => sum + b.kcal, 0),
    },
    categoryCounts,
  };
}

function periodRange(period: StatsPeriod, anchor: Date): [Date, Date] {
  switch (period) {
    case 'week':
      return [startOfWeek(anchor, { weekStartsOn: 1 }), endOfWeek(anchor, { weekStartsOn: 1 })];
    case 'month':
      return [startOfMonth(anchor), endOfMonth(anchor)];
    case 'year':
      return [startOfYear(anchor), endOfYear(anchor)];
  }
}
