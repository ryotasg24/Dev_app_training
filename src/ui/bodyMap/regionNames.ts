/**
 * 人体図の部位の表示名（デザイン仕様書 8.2）。
 */
import type { BodyRegionId } from '../../domain/types';

export const REGION_NAMES: Record<BodyRegionId, string> = {
  face: '顔',
  neck: '首',
  trapsUpper: '僧帽筋上部',
  chest: '胸',
  deltoids: '肩',
  biceps: '上腕二頭筋',
  triceps: '上腕三頭筋',
  abs: '腹',
  obliques: '脇腹',
  hipJoint: '股関節まわり（内もも）',
  lats: '広背筋',
  erectors: '腰（脊柱起立筋）',
  glutes: 'お尻',
  quads: 'もも前',
  hamstrings: 'もも裏',
  calves: 'ふくらはぎ',
};
