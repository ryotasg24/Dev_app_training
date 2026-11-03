import { describe, expect, it } from 'vitest';
import type { BackupData } from './backupFormat';
import { presetExerciseId } from './master';
import {
  migrateActiveSessionToV3,
  migrateBackupData,
  migrateCategoryToV2,
  migrateSessionToV3,
} from './migration';
import { categories, exercises, makeSession } from './testHelpers';
import type { Category, Session } from './types';

/** 版1のときの反り腰（腸腰筋を含む） */
const postureV1 = {
  ...categories.find((c) => c.id === 'posture')!,
  bodyRegions: ['abs', 'hipFlexors', 'glutes'],
};

describe('migrateCategoryToV2（版1→版2）', () => {
  it('腸腰筋を外し、腰を加える', () => {
    expect(migrateCategoryToV2(postureV1).bodyRegions).toEqual(['abs', 'glutes', 'erectors']);
  });

  it('腸腰筋を含まないカテゴリは変えない', () => {
    const chest = categories.find((c) => c.id === 'chest')!;
    expect(migrateCategoryToV2(chest)).toBe(chest);
  });

  it('回復目安などの利用者が変えた値は残す', () => {
    const changed = { ...postureV1, recoveryHours: 48, mets: 3 };
    expect(migrateCategoryToV2(changed)).toMatchObject({ recoveryHours: 48, mets: 3 });
  });
});

describe('版2→版3（メニュー・ステップ）', () => {
  const categoryOf = (id: string) => exercises.find((e) => e.id === id)?.categoryId;

  it('記録には空のステップを加える', () => {
    const { steps, ...v2 } = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['chest']);
    void steps;
    expect(migrateSessionToV3(v2).steps).toEqual([]);
  });

  it('計測中のデータは、選んでいたカテゴリと種目からステップを作り、1つめを開始時刻で始める', () => {
    const pushup = presetExerciseId('chest', 0);
    const active = migrateActiveSessionToV3(
      {
        key: 'current',
        startAt: 1000,
        categoryIds: ['chest', 'neck'],
        exercises: [{ exerciseId: pushup, sets: null }],
        memo: 'メモ',
      },
      categoryOf,
    );
    expect(active.steps).toEqual([
      { categoryId: 'chest', exerciseId: pushup, startAt: 1000, endAt: null },
      { categoryId: 'neck', exerciseId: null, startAt: null, endAt: null },
    ]);
    expect(active.currentIndex).toBe(0);
    expect(active.memo).toBe('メモ');
  });

  it('カテゴリを選んでいなかった計測中のデータは、ステップなしになる', () => {
    const active = migrateActiveSessionToV3(
      { key: 'current', startAt: 1000, categoryIds: [], exercises: [], memo: '' },
      categoryOf,
    );
    expect(active.steps).toEqual([]);
  });
});

describe('migrateBackupData', () => {
  const data: BackupData = {
    sessions: [],
    categories: [postureV1 as unknown as Category],
    exercises: [],
    sorenessLogs: [],
    weightLogs: [],
    settings: [],
    activeSession: [],
  };

  it('版1のファイルは版2の形に直す', () => {
    expect(migrateBackupData(data, 1).categories[0]?.bodyRegions).toEqual([
      'abs',
      'glutes',
      'erectors',
    ]);
  });

  it('版3のファイルはそのまま', () => {
    expect(migrateBackupData(data, 3)).toBe(data);
  });

  it('版2のファイルは、記録にステップを加える', () => {
    const { steps, ...v2 } = makeSession('2026-11-03T21:00', '2026-11-03T21:30', ['chest']);
    void steps;
    const migrated = migrateBackupData({ ...data, sessions: [v2 as Session] }, 2);
    expect(migrated.sessions[0]?.steps).toEqual([]);
  });
});
