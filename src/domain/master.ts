/**
 * 初回起動時に登録するカテゴリとプリセット種目（要件定義書 3.2、F-MST-01）。
 * プリセットは固定IDにして、復元や将来の同期で同じものとして扱えるようにする。
 */
import type {
  BodyRegionId,
  Category,
  CategoryGroup,
  CategoryId,
  Exercise,
  Intensity,
  Settings,
} from './types';

interface CategorySeed {
  id: CategoryId;
  name: string;
  group: CategoryGroup;
  recoveryHours: number;
  mets: number;
  bodyRegions: BodyRegionId[];
  exercises: string[];
}

/** ケア系・有酸素は回復管理しないが、設定でオンにしたときのために24時間を入れておく（基本設計書 4.3） */
const CARE_RECOVERY_HOURS = 24;

const CATEGORY_SEEDS: CategorySeed[] = [
  {
    id: 'chest',
    name: '大胸筋',
    group: 'strength',
    recoveryHours: 72,
    mets: 5.0,
    bodyRegions: ['chest'],
    exercises: ['腕立て伏せ', 'ワイドプッシュアップ', 'ダンベルプレス（床）', 'ダンベルフライ'],
  },
  {
    id: 'back',
    name: '背中',
    group: 'strength',
    recoveryHours: 72,
    mets: 5.0,
    bodyRegions: ['lats', 'erectors'],
    exercises: ['ワンハンドダンベルロウ', 'バックエクステンション', 'スーパーマン', 'チューブローイング'],
  },
  {
    id: 'legs',
    name: '下半身',
    group: 'strength',
    recoveryHours: 72,
    mets: 5.0,
    bodyRegions: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      'スクワット',
      'ダンベルスクワット',
      'ランジ',
      'ブルガリアンスクワット',
      'ヒップリフト',
      'カーフレイズ',
    ],
  },
  {
    id: 'shoulders',
    name: '肩',
    group: 'strength',
    recoveryHours: 48,
    mets: 5.0,
    bodyRegions: ['deltoids'],
    exercises: ['パイクプッシュアップ', 'ダンベルショルダープレス', 'サイドレイズ', 'フロントレイズ'],
  },
  {
    id: 'arms',
    name: '腕',
    group: 'strength',
    recoveryHours: 48,
    mets: 5.0,
    bodyRegions: ['biceps', 'triceps'],
    exercises: [
      'ダンベルカール',
      'ハンマーカール',
      'フレンチプレス',
      'ナロープッシュアップ',
      'ベンチディップス（椅子）',
    ],
  },
  {
    id: 'abs',
    name: '腹筋',
    group: 'strength',
    recoveryHours: 24,
    mets: 3.8,
    bodyRegions: ['abs', 'obliques'],
    exercises: ['クランチ', 'プランク', 'レッグレイズ', 'ロシアンツイスト', 'バイシクルクランチ'],
  },
  {
    id: 'posture',
    name: '反り腰',
    group: 'care',
    recoveryHours: CARE_RECOVERY_HOURS,
    mets: 2.3,
    // 人体図の素材に腸腰筋がないため、腹（インナー）・臀部・腰で表す（デザイン仕様書 8.2）
    bodyRegions: ['abs', 'glutes', 'erectors'],
    exercises: ['ドローイン', 'デッドバグ', '腸腰筋ストレッチ', 'キャット＆カウ'],
  },
  {
    id: 'hip',
    name: '股関節',
    group: 'care',
    recoveryHours: CARE_RECOVERY_HOURS,
    mets: 2.3,
    bodyRegions: ['hipJoint'],
    exercises: ['90/90ストレッチ', 'クラムシェル', '開脚ストレッチ', 'ヒップオープナー'],
  },
  {
    id: 'neck',
    name: 'スマホ首',
    group: 'care',
    recoveryHours: CARE_RECOVERY_HOURS,
    mets: 2.3,
    bodyRegions: ['neck', 'trapsUpper'],
    exercises: ['チンタック（あご引き）', '首ストレッチ', '胸のストレッチ', 'ウォールエンジェル'],
  },
  {
    id: 'face',
    name: '小顔',
    group: 'care',
    recoveryHours: CARE_RECOVERY_HOURS,
    mets: 2.3,
    bodyRegions: ['face', 'neck'],
    exercises: ['あいうべ体操', '舌回し', '表情筋ストレッチ', '首・鎖骨まわりのほぐし'],
  },
  // 有酸素は版3で追加。既存の利用者には、起動時の初期データの登録で足りないものとして加わる
  {
    id: 'cardio',
    name: '有酸素',
    group: 'cardio',
    recoveryHours: CARE_RECOVERY_HOURS,
    mets: 8.0,
    bodyRegions: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: ['ランニング（屋外）', 'ランニング（屋内）'],
  },
];

/** 屋内のランニングの固定ID（ヘルスケアに送る種類の判定に使う。基本設計書 6.2） */
export const RUNNING_INDOOR_ID = 'p-cardio-02';

/**
 * 独自の種目の強度をMETsに換算する表（基本設計書 5.3）。
 */
export const INTENSITY_METS: Record<Intensity, number> = {
  low: 2.5,
  mid: 3.8,
  high: 5.0,
};

/**
 * プリセット種目の固定IDを作る。例：chest の1番目 → p-chest-01
 * 並び順を変えるとIDが変わるため、既存の種目の順番は変えず、追加は末尾に行うこと。
 */
export function presetExerciseId(categoryId: CategoryId, index: number): string {
  return `p-${categoryId}-${String(index + 1).padStart(2, '0')}`;
}

/**
 * 初期登録するカテゴリの一覧を作る。
 * @param now 作成時刻（エポックミリ秒）
 */
export function createDefaultCategories(now: number): Category[] {
  return CATEGORY_SEEDS.map((seed, index) => ({
    id: seed.id,
    name: seed.name,
    group: seed.group,
    recoveryEnabled: seed.group === 'strength',
    recoveryHours: seed.recoveryHours,
    mets: seed.mets,
    bodyRegions: [...seed.bodyRegions],
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
    deleted: 0,
  }));
}

/**
 * 初期登録するプリセット種目の一覧を作る。METsは所属カテゴリの初期値と同じにする。
 * @param now 作成時刻（エポックミリ秒）
 */
export function createDefaultExercises(now: number): Exercise[] {
  return CATEGORY_SEEDS.flatMap((seed) =>
    seed.exercises.map((name, index) => ({
      id: presetExerciseId(seed.id, index),
      categoryId: seed.id,
      name,
      isPreset: true,
      intensity: null,
      mets: seed.mets,
      hidden: false,
      favorite: false,
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
      deleted: 0 as const,
    })),
  );
}

/** ショートカットの名前の初期値（基本設計書 6.3） */
export const DEFAULT_SHORTCUT_NAME = '筋トレ記録をヘルスケアへ';

/**
 * 設定の初期値を作る（基本設計書 4.3）。
 * @param now 作成時刻（エポックミリ秒）
 */
export function createDefaultSettings(now: number): Settings {
  return {
    key: 'app',
    nickname: '',
    heightCm: null,
    birthDate: null,
    sex: null,
    sorenessAdjustHours: { none: 0, light: 12, strong: 24 },
    forgotEndHours: 3,
    backupReminderDays: 7,
    healthEnabled: true,
    shortcutName: DEFAULT_SHORTCUT_NAME,
    autoSendToHealth: false,
    setsInputEnabled: false,
    onboardingDone: false,
    updatedAt: now,
  };
}
