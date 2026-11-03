import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackupFile, checkBackupFile, type BackupData } from './backupFormat';
import { categories, exercises, jst, makeSession } from './testHelpers';

const data: BackupData = {
  sessions: [
    makeSession('2026-10-01T21:00', '2026-10-01T21:30', ['chest']),
    makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['back']),
    makeSession('2026-11-05T21:00', '2026-11-05T21:30', ['back'], { deleted: 1 }),
  ],
  categories,
  exercises,
  sorenessLogs: [],
  weightLogs: [],
  settings: [],
  activeSession: [],
};

describe('バックアップファイル（F-DATA-03、04）', () => {
  it('ファイル名に日時を入れる', () => {
    expect(backupFileName(jst('2026-11-03T21:30'))).toBe('training-backup-20261103-2130.json');
  });

  it('書き出したファイルをJSON経由で読み込むと、確認に通り件数と期間がわかる', () => {
    const file = buildBackupFile(data, 1, jst('2026-11-03T22:00'));
    const result = checkBackupFile(JSON.parse(JSON.stringify(file)), 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary).toEqual({
        sessionCount: 2,
        firstDate: '2026-10-01',
        lastDate: '2026-11-03',
        exportedAt: jst('2026-11-03T22:00'),
      });
    }
  });

  it('ほかのアプリのファイルや壊れたファイルは受け付けない', () => {
    expect(checkBackupFile(null, 1).ok).toBe(false);
    expect(checkBackupFile({ app: 'other' }, 1).ok).toBe(false);
    const broken = { ...buildBackupFile(data, 1, 0), data: { sessions: [] } };
    expect(checkBackupFile(broken, 1).ok).toBe(false);
  });

  it('アプリより新しいデータ形式のファイルは受け付けない', () => {
    const result = checkBackupFile(buildBackupFile(data, 2, 0), 1);
    expect(result.ok).toBe(false);
  });
});
