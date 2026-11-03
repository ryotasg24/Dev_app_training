/**
 * メニュー（ステップ）の計算（要件定義書 F-REC-01〜04、12、13、基本設計書 3.3 No.1'・No.2、4.3、5.3）。
 * 画面やデータベースに依存しない、普通の関数だけで作る。
 */
import { calcCalories } from './calories';
import { toLocalDate } from './date';
import type {
  ActiveSession,
  ActiveStep,
  Category,
  CategoryId,
  Exercise,
  MenuItem,
  Session,
  SessionExercise,
  SessionStep,
} from './types';

/** 2つのメニュー項目が同じか（同じ種目、またはどちらもカテゴリだけで同じカテゴリ） */
export function isSameMenuItem(a: MenuItem, b: MenuItem): boolean {
  return a.categoryId === b.categoryId && a.exerciseId === b.exerciseId;
}

/**
 * メニューの項目を押したときの新しいメニューを返す（F-REC-02）。
 * まだ入っていなければ最後に加え、入っていれば取り除く（後ろの番号は詰まる）。
 */
export function toggleMenuItem(menu: readonly MenuItem[], item: MenuItem): MenuItem[] {
  return menu.some((m) => isSameMenuItem(m, item))
    ? menu.filter((m) => !isSameMenuItem(m, item))
    : [...menu, { categoryId: item.categoryId, exerciseId: item.exerciseId }];
}

/**
 * 計測中のセッションを作る。1つめのステップを開始時刻で始める。
 * @param menu 押した順のメニュー（1つ以上）
 * @param now 開始時刻
 */
export function createActiveSession(menu: readonly MenuItem[], now: number): ActiveSession {
  return {
    key: 'current',
    startAt: now,
    steps: menu.map((m, i) => ({
      categoryId: m.categoryId,
      exerciseId: m.exerciseId,
      startAt: i === 0 ? now : null,
      endAt: null,
    })),
    currentIndex: 0,
    memo: '',
  };
}

/** 今のステップの次にステップがあるか */
export function hasNextStep(active: ActiveSession): boolean {
  return active.currentIndex < active.steps.length - 1;
}

/** 今のステップ（ステップがなければnull） */
export function currentStep(active: ActiveSession): ActiveStep | null {
  return active.steps[active.currentIndex] ?? null;
}

/**
 * 「次の種目へ」：今のステップを終え、同じ時刻で次のステップを始める（F-REC-04）。
 * 次のステップがなければ、受け取ったものをそのまま返す。
 */
export function advanceStep(active: ActiveSession, now: number): ActiveSession {
  if (!hasNextStep(active)) return active;
  const next = active.currentIndex + 1;
  return {
    ...active,
    currentIndex: next,
    steps: active.steps.map((s, i) => {
      if (i === active.currentIndex) return { ...s, endAt: now };
      if (i === next) return { ...s, startAt: now };
      return s;
    }),
  };
}

/** ステップのMETs：種目のMETs。カテゴリだけ、または種目が見つからなければカテゴリのMETs */
export function stepMets(
  item: MenuItem,
  categories: readonly Category[],
  exercises: readonly Exercise[],
): number {
  const exercise = item.exerciseId ? exercises.find((e) => e.id === item.exerciseId) : undefined;
  if (exercise) return exercise.mets;
  return categories.find((c) => c.id === item.categoryId)?.mets ?? 0;
}

/**
 * 計測を終えるときのステップを確定する（F-REC-04、12）。
 * 今のステップを endAt で終え、まだ始めていないステップは取り除く。
 */
export function closeSteps(active: ActiveSession, endAt: number): ActiveStep[] {
  return active.steps
    .map((s, i) => (i === active.currentIndex ? { ...s, endAt } : s))
    .filter((s) => s.startAt !== null && s.endAt !== null);
}

/**
 * 保存するステップを作る。ステップごとにカロリーを計算する（F-CAL-03）。
 * @param steps 開始と終了の時刻がそろったステップ
 */
export function buildSessionSteps(
  steps: readonly ActiveStep[],
  weightKg: number,
  categories: readonly Category[],
  exercises: readonly Exercise[],
): SessionStep[] {
  return steps.map((s) => {
    const startAt = s.startAt ?? 0;
    const endAt = s.endAt ?? startAt;
    const mets = stepMets(s, categories, exercises);
    return {
      categoryId: s.categoryId,
      exerciseId: s.exerciseId,
      startAt,
      endAt,
      mets,
      kcal: calcCalories(mets, weightKg, endAt - startAt),
    };
  });
}

/**
 * ステップから、セッションのカテゴリ（出てきた順・重複なし）と種目（同）を求める。
 */
export function summarizeSteps(steps: readonly MenuItem[]): {
  categoryIds: CategoryId[];
  exercises: SessionExercise[];
} {
  const categoryIds: CategoryId[] = [];
  const exercises: SessionExercise[] = [];
  for (const s of steps) {
    if (!categoryIds.includes(s.categoryId)) categoryIds.push(s.categoryId);
    if (s.exerciseId && !exercises.some((e) => e.exerciseId === s.exerciseId)) {
      exercises.push({ exerciseId: s.exerciseId, sets: null });
    }
  }
  return { categoryIds, exercises };
}

/** ステップの合計カロリーと、時間で重み付けしたMETs */
export function totalsOfSteps(steps: readonly SessionStep[]): { kcal: number; mets: number } {
  const kcal = steps.reduce((sum, s) => sum + s.kcal, 0);
  const totalMs = steps.reduce((sum, s) => sum + (s.endAt - s.startAt), 0);
  const mets =
    totalMs > 0
      ? steps.reduce((sum, s) => sum + s.mets * (s.endAt - s.startAt), 0) / totalMs
      : (steps[0]?.mets ?? 0);
  return { kcal, mets: Math.round(mets * 100) / 100 };
}

export interface TimerSessionContext {
  newId: string;
  now: number;
  weightKg: number;
  categories: readonly Category[];
  exercises: readonly Exercise[];
}

/**
 * 計測中のセッションを終えて、保存するセッションを作る（F-REC-04、12、13）。
 * @param active 計測中のセッション
 * @param endAt 終了時刻（今のステップの終了時刻）
 */
export function buildTimerSession(
  active: ActiveSession,
  endAt: number,
  context: TimerSessionContext,
): Session {
  const steps = buildSessionSteps(
    closeSteps(active, endAt),
    context.weightKg,
    context.categories,
    context.exercises,
  );
  const { categoryIds, exercises } = summarizeSteps(steps);
  const { kcal, mets } = totalsOfSteps(steps);
  return {
    id: context.newId,
    createdAt: context.now,
    updatedAt: context.now,
    deleted: 0,
    startAt: active.startAt,
    endAt,
    localDate: toLocalDate(active.startAt),
    source: 'timer',
    categoryIds,
    exercises,
    steps,
    memo: active.memo.trim(),
    weightKg: context.weightKg,
    mets,
    kcal,
    healthSentAt: null,
  };
}

/**
 * 記録からメニューを作る（「前回と同じ」F-REC-09、データ形式の移行）。
 * ステップがあればその順。なければカテゴリの順に、そのカテゴリの種目（なければカテゴリだけ）を並べる。
 *
 * @param record カテゴリ・種目・ステップ
 * @param categoryOfExercise 種目のIDからカテゴリを求める関数
 */
export function menuFromRecord(
  record: { categoryIds: readonly CategoryId[]; exercises: readonly SessionExercise[]; steps?: readonly MenuItem[] },
  categoryOfExercise: (exerciseId: string) => CategoryId | undefined,
): MenuItem[] {
  if (record.steps && record.steps.length > 0) {
    return record.steps.map((s) => ({ categoryId: s.categoryId, exerciseId: s.exerciseId }));
  }
  return record.categoryIds.flatMap((categoryId): MenuItem[] => {
    const items: MenuItem[] = record.exercises
      .filter((e) => categoryOfExercise(e.exerciseId) === categoryId)
      .map((e) => ({ categoryId, exerciseId: e.exerciseId }));
    return items.length > 0 ? items : [{ categoryId, exerciseId: null }];
  });
}
