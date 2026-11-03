import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkBackupFile } from '../domain/backupFormat';
import { jst } from '../domain/testHelpers';
import { exportBackup, restoreBackup } from './backup';
import { SCHEMA_VERSION, TrainingDb } from './db';
import { initializeDb } from './initialize';
import {
  finishActiveSession,
  saveSession,
  softDeleteSession,
  startActiveSession,
  updateActiveSession,
} from './sessionRepository';

let database: TrainingDb;
let dbCount = 0;

beforeEach(async () => {
  dbCount += 1;
  database = new TrainingDb(`test-${dbCount}`);
  await initializeDb(database, jst('2026-11-01T12:00'));
  await database.weightLogs.add({
    id: 'w1',
    createdAt: 0,
    updatedAt: 0,
    deleted: 0,
    date: '2026-11-01',
    weightKg: 65,
  });
});

afterEach(async () => {
  await database.delete();
});

describe('initializeDb（F-MST-01）', () => {
  it('カテゴリ10件とプリセット種目を登録する', async () => {
    expect(await database.categories.count()).toBe(10);
    expect(await database.exercises.count()).toBeGreaterThan(40);
    expect((await database.settings.get('app'))?.forgotEndHours).toBe(3);
  });

  it('もう一度呼んでも、利用者が変えた値を上書きしない', async () => {
    await database.categories.update('chest', { recoveryHours: 96 });
    await initializeDb(database, jst('2026-11-02T12:00'));
    expect((await database.categories.get('chest'))?.recoveryHours).toBe(96);
    expect((await database.meta.get('firstLaunchAt'))?.value).toBe(jst('2026-11-01T12:00'));
  });
});

describe('計測して保存する（F-REC-01〜05）', () => {
  it('開始→選択→終了で記録が1件でき、計測中のデータは消える', async () => {
    await startActiveSession(database, jst('2026-11-03T21:00'));
    await updateActiveSession(database, { categoryIds: ['chest'], memo: 'テスト' });
    const session = await finishActiveSession(database, jst('2026-11-03T21:35'), {
      newId: 'id-1',
      now: jst('2026-11-03T21:35'),
    });
    expect(session.kcal).toBe(159);
    expect(await database.sessions.count()).toBe(1);
    expect(await database.activeSession.get('current')).toBeUndefined();
  });

  it('開始を2回押しても、最初の開始時刻のまま', async () => {
    await startActiveSession(database, jst('2026-11-03T21:00'));
    const again = await startActiveSession(database, jst('2026-11-03T21:10'));
    expect(again.startAt).toBe(jst('2026-11-03T21:00'));
  });
});

describe('データ形式の移行（基本設計書 4.4）', () => {
  it('版1のデータベースを開くと、反り腰の部位から腸腰筋が外れ、ほかの値は残る', async () => {
    const name = `migrate-${dbCount}`;
    // 版1のデータベースを、当時の定義のまま作る
    const v1 = new Dexie(name);
    v1.version(1).stores({ categories: 'id', meta: 'key' });
    await v1.open();
    await v1.table('categories').add({
      id: 'posture',
      bodyRegions: ['abs', 'hipFlexors', 'glutes'],
      recoveryHours: 30,
    });
    v1.close();

    const upgraded = new TrainingDb(name);
    const posture = await upgraded.categories.get('posture');
    expect(posture?.bodyRegions).toEqual(['abs', 'glutes', 'erectors']);
    expect(posture?.recoveryHours).toBe(30);
    await upgraded.delete();
  });
});

describe('バックアップと復元（F-DATA-03、04）', () => {
  it('書き出したデータで復元すると、元と同じ内容に戻る', async () => {
    const draft = {
      startAt: jst('2026-11-03T21:00'),
      endAt: jst('2026-11-03T21:30'),
      source: 'manual' as const,
      categoryIds: ['back' as const],
      exercises: [],
      memo: '',
    };
    await saveSession(database, draft, { newId: 'keep', now: jst('2026-11-03T22:00') });
    await saveSession(database, draft, { newId: 'gone', now: jst('2026-11-03T22:00') });
    await softDeleteSession(database, 'gone', jst('2026-11-03T22:01'));

    const file = await exportBackup(database, jst('2026-11-03T22:05'));
    const checked = checkBackupFile(JSON.parse(JSON.stringify(file)), SCHEMA_VERSION);
    expect(checked.ok).toBe(true);

    // 復元前にデータを変えておく
    await database.sessions.clear();
    await database.categories.update('chest', { recoveryHours: 1 });

    if (checked.ok) await restoreBackup(database, checked.file);
    expect(await database.sessions.count()).toBe(2);
    expect((await database.sessions.get('gone'))?.deleted).toBe(1);
    expect((await database.categories.get('chest'))?.recoveryHours).toBe(72);
  });
});
