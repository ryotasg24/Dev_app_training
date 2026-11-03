import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkBackupFile } from '../domain/backupFormat';
import { jst } from '../domain/testHelpers';
import { exportBackup, restoreBackup } from './backup';
import { SCHEMA_VERSION, TrainingDb } from './db';
import { initializeDb } from './initialize';
import type { MenuItem } from '../domain/types';
import {
  advanceActiveSession,
  finishActiveSession,
  saveSession,
  softDeleteSession,
  startActiveSession,
  updateActiveMemo,
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
  it('カテゴリ11件（有酸素を含む）とプリセット種目を登録する', async () => {
    expect(await database.categories.count()).toBe(11);
    expect((await database.categories.get('cardio'))?.group).toBe('cardio');
    expect((await database.exercises.get('p-cardio-01'))?.name).toBe('ランニング（屋外）');
    expect(await database.exercises.count()).toBeGreaterThan(40);
    expect((await database.settings.get('app'))?.forgotEndHours).toBe(3);
  });

  it('有酸素がない既存のデータには、有酸素とランニングだけを追加する', async () => {
    await database.categories.delete('cardio');
    await database.exercises.bulkDelete(['p-cardio-01', 'p-cardio-02']);
    await database.categories.update('chest', { mets: 6 });
    await initializeDb(database, jst('2026-11-02T12:00'));
    expect(await database.categories.get('cardio')).toBeDefined();
    expect(await database.exercises.get('p-cardio-02')).toBeDefined();
    expect((await database.categories.get('chest'))?.mets).toBe(6);
  });

  it('もう一度呼んでも、利用者が変えた値を上書きしない', async () => {
    await database.categories.update('chest', { recoveryHours: 96 });
    await initializeDb(database, jst('2026-11-02T12:00'));
    expect((await database.categories.get('chest'))?.recoveryHours).toBe(96);
    expect((await database.meta.get('firstLaunchAt'))?.value).toBe(jst('2026-11-01T12:00'));
  });
});

describe('計測して保存する（F-REC-01〜05、12）', () => {
  const chest: MenuItem = { categoryId: 'chest', exerciseId: null };
  const run: MenuItem = { categoryId: 'cardio', exerciseId: 'p-cardio-01' };

  it('メニューで開始→次の種目へ→終了で記録が1件でき、計測中のデータは消える', async () => {
    await startActiveSession(database, [chest, run], jst('2026-11-03T21:00'));
    await updateActiveMemo(database, 'テスト');
    await advanceActiveSession(database, 0, jst('2026-11-03T21:35'));
    const session = await finishActiveSession(database, jst('2026-11-03T21:55'), {
      newId: 'id-1',
      now: jst('2026-11-03T21:55'),
    });
    // 大胸筋35分 159kcal ＋ ランニング20分 159kcal
    expect(session.steps.map((s) => s.kcal)).toEqual([159, 159]);
    expect(session.kcal).toBe(318);
    expect(session.memo).toBe('テスト');
    expect(await database.sessions.count()).toBe(1);
    expect(await database.activeSession.get('current')).toBeUndefined();
  });

  it('開始を2回押しても、最初の開始時刻のまま', async () => {
    await startActiveSession(database, [chest], jst('2026-11-03T21:00'));
    const again = await startActiveSession(database, [run], jst('2026-11-03T21:10'));
    expect(again.startAt).toBe(jst('2026-11-03T21:00'));
  });

  it('「次の種目へ」を二度押ししても、1つしか進まない', async () => {
    await startActiveSession(database, [chest, run, chest], jst('2026-11-03T21:00'));
    await advanceActiveSession(database, 0, jst('2026-11-03T21:10'));
    await advanceActiveSession(database, 0, jst('2026-11-03T21:10'));
    expect((await database.activeSession.get('current'))?.currentIndex).toBe(1);
  });

  it('今のステップの開始より前の時刻では終了できない', async () => {
    await startActiveSession(database, [chest, run], jst('2026-11-03T21:00'));
    await advanceActiveSession(database, 0, jst('2026-11-03T21:30'));
    await expect(
      finishActiveSession(database, jst('2026-11-03T21:20'), { newId: 'x', now: 0 }),
    ).rejects.toThrow();
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

  it('版2のデータベースを開くと、記録にステップが加わり、計測中のデータはステップの形になる', async () => {
    const name = `migrate-v3-${dbCount}`;
    const v2 = new Dexie(name);
    v2.version(2).stores({
      sessions: 'id, localDate, startAt, deleted',
      categories: 'id',
      exercises: 'id, categoryId',
      sorenessLogs: 'id, [sessionId+categoryId]',
      weightLogs: 'id, date',
      settings: 'key',
      activeSession: 'key',
      meta: 'key',
    });
    await v2.open();
    await v2.table('exercises').add({ id: 'p-chest-01', categoryId: 'chest' });
    await v2.table('sessions').add({ id: 's1', localDate: '2026-11-01', startAt: 1, deleted: 0, kcal: 100 });
    await v2.table('activeSession').add({
      key: 'current',
      startAt: 5000,
      categoryIds: ['legs', 'chest'],
      exercises: [{ exerciseId: 'p-chest-01', sets: null }],
      memo: '',
    });
    v2.close();

    const upgraded = new TrainingDb(name);
    expect((await upgraded.sessions.get('s1'))?.steps).toEqual([]);
    expect((await upgraded.sessions.get('s1'))?.kcal).toBe(100);
    const active = await upgraded.activeSession.get('current');
    expect(active?.steps.map((s) => [s.categoryId, s.exerciseId, s.startAt])).toEqual([
      ['legs', null, 5000],
      ['chest', 'p-chest-01', null],
    ]);
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
