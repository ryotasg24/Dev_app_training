/**
 * 単体テスト用の補助関数。アプリ本体からは使わない。
 * テストは日本時間（vite.config.ts の test.env.TZ）で動かす前提。
 */
import { toLocalDate } from './date';
import { createDefaultCategories, createDefaultExercises } from './master';
import type { CategoryId, Session, SorenessLevel, SorenessLog } from './types';

/** 日本時間の日時文字列（例：2026-11-03T21:00）をエポックミリ秒にする */
export function jst(dateTime: string): number {
  return new Date(`${dateTime}:00+09:00`).getTime();
}

export const categories = createDefaultCategories(0);
export const exercises = createDefaultExercises(0);

let counter = 0;

/** テスト用のセッションを作る */
export function makeSession(
  start: string,
  end: string,
  categoryIds: CategoryId[],
  overrides: Partial<Session> = {},
): Session {
  counter += 1;
  const startAt = jst(start);
  return {
    id: `s${counter}`,
    createdAt: startAt,
    updatedAt: startAt,
    deleted: 0,
    startAt,
    endAt: jst(end),
    localDate: toLocalDate(startAt),
    source: 'timer',
    categoryIds,
    exercises: [],
    steps: [],
    memo: '',
    weightKg: 65,
    mets: 5,
    kcal: 100,
    healthSentAt: null,
    ...overrides,
  };
}

/** テスト用の筋肉痛の回答を作る */
export function makeSoreness(
  sessionId: string,
  categoryId: CategoryId,
  level: SorenessLevel,
): SorenessLog {
  return {
    id: `${sessionId}-${categoryId}`,
    createdAt: 0,
    updatedAt: 0,
    deleted: 0,
    sessionId,
    categoryId,
    level,
  };
}
