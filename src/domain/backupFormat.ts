/**
 * バックアップファイル（JSON）の形式と、読み込んだファイルの確認（基本設計書 4.5）。
 */
import { format } from 'date-fns';
import type {
  ActiveSession,
  Category,
  Exercise,
  Session,
  Settings,
  SorenessLog,
  WeightLog,
} from './types';

export const BACKUP_APP_ID = 'dat-training';
export const BACKUP_FORMAT = 1;

export interface BackupData {
  sessions: Session[];
  categories: Category[];
  exercises: Exercise[];
  sorenessLogs: SorenessLog[];
  weightLogs: WeightLog[];
  settings: Settings[];
  activeSession: ActiveSession[];
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: number;
  data: BackupData;
}

const TABLE_NAMES: (keyof BackupData)[] = [
  'sessions',
  'categories',
  'exercises',
  'sorenessLogs',
  'weightLogs',
  'settings',
  'activeSession',
];

/** バックアップファイルを作る */
export function buildBackupFile(
  data: BackupData,
  schemaVersion: number,
  now: number,
): BackupFile {
  return { app: BACKUP_APP_ID, format: BACKUP_FORMAT, schemaVersion, exportedAt: now, data };
}

/** バックアップファイルの名前を作る。例：training-backup-20261103-2130.json */
export function backupFileName(now: number): string {
  return `training-backup-${format(now, 'yyyyMMdd-HHmm')}.json`;
}

export type BackupCheckResult =
  | { ok: true; file: BackupFile; summary: BackupSummary }
  | { ok: false; error: string };

/** 復元前の確認画面に出す内容 */
export interface BackupSummary {
  sessionCount: number;
  /** 記録の最初と最後の日付（記録がなければnull） */
  firstDate: string | null;
  lastDate: string | null;
  exportedAt: number;
}

/**
 * 読み込んだJSONが、このアプリのバックアップファイルとして正しいかを確かめる。
 * 中身の細かい形までは確かめず、テーブルが配列であることを確かめる。
 *
 * @param json JSON.parse した結果
 * @param currentSchemaVersion アプリが対応しているデータ形式の版
 */
export function checkBackupFile(json: unknown, currentSchemaVersion: number): BackupCheckResult {
  if (!isObject(json) || json.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'このアプリのバックアップファイルではありません。' };
  }
  if (json.format !== BACKUP_FORMAT) {
    return { ok: false, error: '対応していない形式のバックアップファイルです。' };
  }
  if (typeof json.schemaVersion !== 'number' || typeof json.exportedAt !== 'number') {
    return { ok: false, error: 'バックアップファイルが壊れています。' };
  }
  if (json.schemaVersion > currentSchemaVersion) {
    return {
      ok: false,
      error: 'より新しい版のアプリで作られたファイルです。アプリを更新してから読み込んでください。',
    };
  }
  const data = json.data;
  if (!isObject(data) || !TABLE_NAMES.every((name) => Array.isArray(data[name]))) {
    return { ok: false, error: 'バックアップファイルが壊れています。' };
  }

  const file = json as unknown as BackupFile;
  const dates = file.data.sessions
    .filter((s) => s.deleted === 0)
    .map((s) => s.localDate)
    .sort();
  return {
    ok: true,
    file,
    summary: {
      sessionCount: dates.length,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
      exportedAt: file.exportedAt,
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
