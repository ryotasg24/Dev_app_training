/**
 * 画面からデータを読むための仕組み。データが変わると画面が自動で更新される（useLiveQuery）。
 * 読み込み中は undefined を返す。
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { getCurrentWeightKg } from '../db/sessionRepository';

export function useSettings() {
  return useLiveQuery(() => db.settings.get('app'));
}

/** 削除されていないカテゴリを並び順で返す */
export function useCategories() {
  return useLiveQuery(async () =>
    (await db.categories.toArray())
      .filter((c) => c.deleted === 0)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  );
}

/** 種目をすべて返す（非表示・削除済みも含む。過去の記録の表示に使うため） */
export function useAllExercises() {
  return useLiveQuery(() => db.exercises.toArray());
}

/** すべてのセッション（削除済みも含む）。個人利用でデータ量が少ないため、まとめて読む */
export function useAllSessions() {
  return useLiveQuery(() => db.sessions.toArray());
}

export function useSession(id: string | undefined) {
  return useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id]);
}

/** 計測中のセッション。計測中でなければ null */
export function useActiveSession() {
  return useLiveQuery(async () => (await db.activeSession.get('current')) ?? null);
}

export function useSorenessLogs() {
  return useLiveQuery(() => db.sorenessLogs.toArray());
}

export function useCurrentWeight() {
  return useLiveQuery(async () => ({ weightKg: await getCurrentWeightKg(db) }));
}

export function useMeta() {
  return useLiveQuery(async () => {
    const records = await db.meta.toArray();
    const get = (key: string) => records.find((r) => r.key === key)?.value ?? null;
    return { firstLaunchAt: get('firstLaunchAt'), lastBackupAt: get('lastBackupAt') };
  });
}

/**
 * 現在時刻。指定した間隔と、アプリが前面に戻ったときに更新する。
 * @param intervalMs 更新の間隔（ミリ秒）
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}
