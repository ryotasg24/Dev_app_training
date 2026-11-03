/**
 * バックアップの書き出しと復元（要件定義書 F-DATA-03、04、基本設計書 4.5）。
 */
import { buildBackupFile, type BackupData, type BackupFile } from '../domain/backupFormat';
import { SCHEMA_VERSION, type TrainingDb } from './db';

/** 全テーブルを読み、バックアップファイルの中身を作る。削除済みのデータも含める */
export async function exportBackup(database: TrainingDb, now: number): Promise<BackupFile> {
  const data: BackupData = await database.transaction('r', database.dataTables, async () => ({
    sessions: await database.sessions.toArray(),
    categories: await database.categories.toArray(),
    exercises: await database.exercises.toArray(),
    sorenessLogs: await database.sorenessLogs.toArray(),
    weightLogs: await database.weightLogs.toArray(),
    settings: await database.settings.toArray(),
    activeSession: await database.activeSession.toArray(),
  }));
  return buildBackupFile(data, SCHEMA_VERSION, now);
}

/**
 * 共有メニューでの保存が完了したときに呼び、最後にバックアップした時刻を記録する。
 * 共有を取り消した場合は呼ばないこと（基本設計書 4.5）。
 */
export async function recordBackupDone(database: TrainingDb, now: number): Promise<void> {
  await database.meta.put({ key: 'lastBackupAt', value: now });
}

/**
 * バックアップファイルからデータを復元する。現在のデータはすべて置き換わる。
 * 1つのトランザクションで行い、途中で失敗したら元の状態に戻る。
 * ファイルは checkBackupFile で確認済みのものを渡すこと。
 */
export async function restoreBackup(database: TrainingDb, file: BackupFile): Promise<void> {
  // データ形式が古いファイルは、ここで新しい形式に直す（版1しかないため、今は何もしない）
  const data = file.data;

  await database.transaction('rw', [...database.dataTables, database.meta], async () => {
    await Promise.all(database.dataTables.map((table) => table.clear()));
    await database.sessions.bulkPut(data.sessions);
    await database.categories.bulkPut(data.categories);
    await database.exercises.bulkPut(data.exercises);
    await database.sorenessLogs.bulkPut(data.sorenessLogs);
    await database.weightLogs.bulkPut(data.weightLogs);
    await database.settings.bulkPut(data.settings);
    await database.activeSession.bulkPut(data.activeSession);
    await database.meta.put({ key: 'schemaVersion', value: SCHEMA_VERSION });
  });
}
