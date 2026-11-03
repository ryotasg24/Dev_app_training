/**
 * データ形式の移行（基本設計書 4.4）。
 * 端末内のデータベース（db/db.ts の upgrade）と、古い版のバックアップファイルの復元の両方で使う。
 */
import type { BackupData } from './backupFormat';
import type { Category } from './types';

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
  return result;
}
