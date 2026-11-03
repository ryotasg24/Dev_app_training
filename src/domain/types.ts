/**
 * データの型定義（基本設計書 4章）。
 * 時刻はすべてエポックミリ秒（数値）、日付は端末の時間帯での YYYY-MM-DD 文字列で持つ。
 */

/** 同期の対象になるデータが共通で持つ項目（F-DATA-08） */
export interface SyncFields {
  /** UUID。プリセットのデータだけは固定ID */
  id: string;
  createdAt: number;
  updatedAt: number;
  /** 削除済みの印。IndexedDBの索引が真偽値に対応しないため 0/1 で持つ */
  deleted: 0 | 1;
}

/** カテゴリの区分：筋トレ系・ケア系・有酸素 */
export type CategoryGroup = 'strength' | 'care' | 'cardio';

/** カテゴリの固定ID */
export type CategoryId =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'abs'
  | 'posture'
  | 'hip'
  | 'neck'
  | 'face'
  | 'cardio';

/** 人体図の部位ID（デザイン仕様書 5章） */
export type BodyRegionId =
  | 'face'
  | 'neck'
  | 'trapsUpper'
  | 'chest'
  | 'deltoids'
  | 'biceps'
  | 'triceps'
  | 'abs'
  | 'obliques'
  | 'hipJoint'
  | 'lats'
  | 'erectors'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export interface Category extends SyncFields {
  id: CategoryId;
  name: string;
  group: CategoryGroup;
  /** 回復を管理するか（初期値：筋トレ系はtrue、ケア系はfalse） */
  recoveryEnabled: boolean;
  /** 回復目安時間（時間） */
  recoveryHours: number;
  mets: number;
  bodyRegions: BodyRegionId[];
  sortOrder: number;
}

/** 独自の種目の強度 */
export type Intensity = 'low' | 'mid' | 'high';

export interface Exercise extends SyncFields {
  categoryId: CategoryId;
  name: string;
  isPreset: boolean;
  /** 独自の種目の強度。プリセットはnull */
  intensity: Intensity | null;
  mets: number;
  hidden: boolean;
  favorite: boolean;
  sortOrder: number;
}

/** 将来の重量・回数・セット数の入力用（F-REC-11） */
export interface ExerciseSet {
  weightKg: number | null;
  reps: number;
}

/** セッション内で実施した種目 */
export interface SessionExercise {
  exerciseId: string;
  /** フェーズ1では常にnull */
  sets: ExerciseSet[] | null;
}

export type SessionSource = 'timer' | 'manual';

/** メニューの1項目（開始前に選ぶ、行う順の種目。基本設計書 3.3 No.1'） */
export interface MenuItem {
  categoryId: CategoryId;
  /** 種目。カテゴリだけのステップは null */
  exerciseId: string | null;
}

/** 保存したセッションのステップ（基本設計書 4.3） */
export interface SessionStep extends MenuItem {
  startAt: number;
  endAt: number;
  /** 計算に使ったMETs */
  mets: number;
  /** そのステップの推定カロリー（整数） */
  kcal: number;
}

/** 計測中のステップ。まだ始めていないステップは startAt・endAt が null */
export interface ActiveStep extends MenuItem {
  startAt: number | null;
  endAt: number | null;
}

export interface Session extends SyncFields {
  startAt: number;
  endAt: number;
  /** 開始時刻の、端末の時間帯での日付（基本設計書 5.1） */
  localDate: string;
  source: SessionSource;
  categoryIds: CategoryId[];
  exercises: SessionExercise[];
  /** ステップごとの記録。手入力や版2までの記録は空の配列 */
  steps: SessionStep[];
  memo: string;
  /** 保存したときの体重（F-CAL-04） */
  weightKg: number;
  /** カロリー計算に使ったMETs */
  mets: number;
  kcal: number;
  /** ヘルスケアに送った時刻。未送信ならnull */
  healthSentAt: number | null;
}

export type SorenessLevel = 'none' | 'light' | 'strong';

export interface SorenessLog extends SyncFields {
  sessionId: string;
  categoryId: CategoryId;
  level: SorenessLevel;
}

export interface WeightLog extends SyncFields {
  /** 入力した日（YYYY-MM-DD）。同じ日の入力は1件に上書きする */
  date: string;
  weightKg: number;
}

export type Sex = 'male' | 'female' | 'other';

/** 設定とプロフィール（キー app の1件だけ） */
export interface Settings {
  key: 'app';
  nickname: string;
  heightCm: number | null;
  birthDate: string | null;
  sex: Sex | null;
  sorenessAdjustHours: Record<SorenessLevel, number>;
  forgotEndHours: number;
  backupReminderDays: number;
  healthEnabled: boolean;
  shortcutName: string;
  autoSendToHealth: boolean;
  setsInputEnabled: boolean;
  onboardingDone: boolean;
  updatedAt: number;
}

/** 計測中のセッション（キー current の0件または1件） */
export interface ActiveSession {
  key: 'current';
  /** 開始時刻（1つめのステップの開始時刻と同じ） */
  startAt: number;
  steps: ActiveStep[];
  /** 今のステップの番号（0から数える） */
  currentIndex: number;
  memo: string;
}

/** 管理用の値 */
export interface MetaRecord {
  key: 'schemaVersion' | 'firstLaunchAt' | 'lastBackupAt';
  value: number;
}
