import { describe, expect, it } from 'vitest';
import type { BackupData } from './backupFormat';
import { migrateBackupData, migrateCategoryToV2 } from './migration';
import { categories } from './testHelpers';
import type { Category } from './types';

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

  it('版2のファイルはそのまま', () => {
    expect(migrateBackupData(data, 2)).toBe(data);
  });
});
