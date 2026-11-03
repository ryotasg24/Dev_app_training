/**
 * 記録のCSV書き出し（要件定義書 F-DATA-07、基本設計書 4.6）。
 */
import { format } from 'date-fns';
import { durationMinutes } from './date';
import { activeSessions } from './history';
import type { Category, Exercise, Session } from './types';

/**
 * Excelで文字化けさせないための印（BOM）。
 * ソースコードはBOMなしで保存するが、書き出すCSVファイルだけは例外として付ける。
 */
export const CSV_BOM = '﻿';

const HEADER = [
  '日付',
  '開始',
  '終了',
  '所要時間（分）',
  'カテゴリ',
  '種目',
  '消費カロリー（kcal）',
  '体重（kg）',
  'メモ',
  'ヘルスケア送信',
];

/**
 * CSVファイルの中身を作る。1行が1セッション。削除済みは含めない。
 * 改行コードは、Excelに合わせてCRLFにする。先頭にBOMを付ける。
 */
export function buildSessionsCsv(
  sessions: readonly Session[],
  categories: readonly Category[],
  exercises: readonly Exercise[],
): string {
  const categoryName = new Map(categories.map((c) => [c.id as string, c.name]));
  const exerciseName = new Map(exercises.map((e) => [e.id, e.name]));

  const rows = activeSessions(sessions).map((s) => [
    s.localDate,
    format(s.startAt, 'HH:mm'),
    format(s.endAt, 'HH:mm'),
    String(durationMinutes(s.startAt, s.endAt)),
    s.categoryIds.map((id) => categoryName.get(id) ?? id).join('／'),
    s.exercises.map((e) => exerciseName.get(e.exerciseId) ?? e.exerciseId).join('／'),
    String(s.kcal),
    s.weightKg.toFixed(1),
    s.memo,
    s.healthSentAt === null ? '未' : '済',
  ]);

  return CSV_BOM + [HEADER, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

/** カンマ・ダブルクォート・改行を含む値を、ダブルクォートで囲む */
function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
