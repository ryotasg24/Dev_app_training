/**
 * バックアップ・CSVの書き出しと、復元の操作（F-DATA-03、04、07）。ホームと設定から使う。
 */
import { db, SCHEMA_VERSION } from '../../db/db';
import { exportBackup, recordBackupDone, restoreBackup } from '../../db/backup';
import { initializeDb } from '../../db/initialize';
import { backupFileName, checkBackupFile } from '../../domain/backupFormat';
import { buildSessionsCsv } from '../../domain/csv';
import { formatDateTime, formatLocalDate } from '../../domain/format';
import { shareOrDownloadFile } from '../../platform/share';
import { format } from 'date-fns';

/**
 * バックアップを書き出す。共有・ダウンロードが完了したら、最後にバックアップした時刻を記録する。
 * @returns 利用者に見せる結果の文言
 */
export async function runBackupExport(): Promise<string> {
  const now = Date.now();
  const file = await exportBackup(db, now);
  const result = await shareOrDownloadFile(
    backupFileName(now),
    JSON.stringify(file),
    'application/json',
  );
  if (result === 'cancelled') return 'バックアップを取り消しました。';
  await recordBackupDone(db, now);
  return result === 'shared'
    ? 'バックアップを書き出しました。'
    : 'バックアップファイルをダウンロードしました。';
}

/** 記録をCSVで書き出す */
export async function runCsvExport(): Promise<string> {
  const [sessions, categories, exercises] = await Promise.all([
    db.sessions.toArray(),
    db.categories.toArray(),
    db.exercises.toArray(),
  ]);
  const content = buildSessionsCsv(sessions, categories, exercises);
  const result = await shareOrDownloadFile(
    `training-${format(Date.now(), 'yyyyMMdd')}.csv`,
    content,
    'text/csv',
  );
  return result === 'cancelled' ? '書き出しを取り消しました。' : 'CSVを書き出しました。';
}

/**
 * バックアップファイルから復元する。中身を確認し、利用者の了承を得てから置き換える。
 * @returns 利用者に見せる結果の文言
 */
export async function runRestore(file: File): Promise<string> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return 'ファイルを読み込めませんでした。バックアップファイル（.json）を選んでください。';
  }
  const checked = checkBackupFile(json, SCHEMA_VERSION);
  if (!checked.ok) return checked.error;

  const { summary } = checked;
  const period =
    summary.firstDate && summary.lastDate
      ? `${formatLocalDate(summary.firstDate)}〜${formatLocalDate(summary.lastDate)}`
      : '記録なし';
  const message =
    '現在のデータはすべて置き換わります。よろしいですか？\n\n' +
    `書き出した日時：${formatDateTime(summary.exportedAt)}\n` +
    `記録：${summary.sessionCount}件（${period}）`;
  if (!window.confirm(message)) return '復元を取り消しました。';

  await restoreBackup(db, checked.file);
  // 古い版のファイルで足りないプリセットがあれば補う
  await initializeDb(db, Date.now());
  return '復元しました。';
}
