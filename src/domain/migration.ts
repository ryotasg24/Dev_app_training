/**
 * データ形式の移行（基本設計書 4.4）。
 * 端末内のデータベース（db/db.ts の upgrade）と、古い版のバックアップファイルの復元の両方で使う。
 */
import type { BackupData } from './backupFormat';
import { menuFromRecord } from './steps';
import type {
  ActiveSession,
  Category,
  CategoryId,
  Session,
  SessionExercise,
} from './types';

/**
 * 版1 → 版2：人体図の素材の変更で「腸腰筋（hipFlexors）」の部位がなくなったため、
 * 反り腰などに残っている hipFlexors を外し、代わりに腰（erectors）を加える。
 * 利用者は部位を変更できない（F-MST-06は将来対応）ため、hipFlexors を含むものだけを直せばよい。
 *
 * @param category 版1のカテゴリ（部位IDは古い値を含みうるので文字列として扱う）
 * @returns 直したカテゴリ。直す必要がなければ受け取ったものをそのまま返す
 */
export function migrateCategoryToV2<T extends { bodyRegions: string[] }>(category: T): T {
  if (!category.bodyRegions.includes('hipFlexors')) return category;
  const regions = category.bodyRegions.filter((r) => r !== 'hipFlexors');
  if (!regions.includes('erectors')) regions.push('erectors');
  return { ...category, bodyRegions: regions };
}

/**
 * 版2 → 版3：セッションにステップの記録（steps）を加える。版2までの記録は空の配列にする。
 */
export function migrateSessionToV3(session: Omit<Session, 'steps'> & { steps?: Session['steps'] }): Session {
  return { ...session, steps: session.steps ?? [] };
}

/** 版2までの計測中のセッションの形 */
export interface ActiveSessionV2 {
  key: 'current';
  startAt: number;
  categoryIds: CategoryId[];
  exercises: SessionExercise[];
  memo: string;
}

/**
 * 版2 → 版3：計測中のセッションを、ステップの形に直す。
 * 選んでいたカテゴリと種目からメニューを作り、1つめのステップを計測の開始時刻で始めたことにする。
 *
 * @param old 版2の計測中のセッション（すでに版3の形ならそのまま返す）
 * @param categoryOfExercise 種目のIDからカテゴリを求める関数
 */
export function migrateActiveSessionToV3(
  old: ActiveSessionV2 | ActiveSession,
  categoryOfExercise: (exerciseId: string) => CategoryId | undefined,
): ActiveSession {
  if ('steps' in old) return old;
  const menu = menuFromRecord(old, categoryOfExercise);
  return {
    key: 'current',
    startAt: old.startAt,
    steps: menu.map((m, i) => ({ ...m, startAt: i === 0 ? old.startAt : null, endAt: null })),
    currentIndex: 0,
    memo: old.memo,
  };
}

/**
 * バックアップファイルの中身を、現在のデータ形式に直す。
 * @param data ファイルの中身
 * @param fromVersion ファイルのデータ形式の版
 */
export function migrateBackupData(data: BackupData, fromVersion: number): BackupData {
  let result = data;
  if (fromVersion < 2) {
    result = {
      ...result,
      categories: result.categories.map(
        (c) => migrateCategoryToV2(c as Category & { bodyRegions: string[] }) as Category,
      ),
    };
  }
  if (fromVersion < 3) {
    const categoryOf = (id: string) => result.exercises.find((e) => e.id === id)?.categoryId;
    result = {
      ...result,
      sessions: result.sessions.map((s) => migrateSessionToV3(s)),
      activeSession: result.activeSession.map((a) =>
        migrateActiveSessionToV3(a as ActiveSessionV2 | ActiveSession, categoryOf),
      ),
    };
  }
  return result;
}
