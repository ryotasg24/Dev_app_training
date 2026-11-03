/**
 * 回復状況（要件定義書 F-BODY-01、02、デザイン仕様書 7.1、8章）。
 * 人体図で部位ごとの状態を色分けし、部位をタップすると、その部位に関係するカテゴリの詳細を表示する。
 */
import { useState } from 'react';
import { formatDateTime, formatRemaining } from '../../domain/format';
import {
  calcRegionStatuses,
  type CategoryRecovery,
  type RecoveryStatus,
} from '../../domain/recovery';
import type { BodyRegionId, Category } from '../../domain/types';
import { BodyMap } from '../../ui/bodyMap/BodyMap';
import { REGION_NAMES } from '../../ui/bodyMap/regionNames';
import { Card, Sub } from '../../ui/Card';
import styles from '../page.module.css';

const STATUS_LABEL: Record<RecoveryStatus, string> = {
  fatigued: '疲労中',
  recovering: '回復中',
  recovered: '回復済み',
  doneToday: '今日ケア済み',
  none: '記録なし',
};

const STATUS_COLOR: Record<RecoveryStatus, string> = {
  fatigued: 'var(--color-status-fatigued)',
  recovering: 'var(--color-status-recovering)',
  recovered: 'var(--color-status-recovered)',
  doneToday: 'var(--color-status-done)',
  none: 'var(--color-status-none)',
};

const LEGEND: RecoveryStatus[] = ['fatigued', 'recovering', 'recovered', 'doneToday'];

export function RecoveryCard({
  categories,
  recoveries,
}: {
  categories: readonly Category[];
  recoveries: readonly CategoryRecovery[];
}) {
  const [selected, setSelected] = useState<BodyRegionId | null>(null);
  const regionStatuses = calcRegionStatuses(categories, recoveries);
  const statusOf = (region: BodyRegionId) => regionStatuses.get(region) ?? 'none';

  // 選んだ部位に関係するカテゴリ（例：お尻 → 下半身・反り腰）
  const selectedCategories = selected
    ? categories.filter((c) => c.bodyRegions.includes(selected))
    : [];

  return (
    <Card title="回復状況" aside="部位をタップすると詳細を表示">
      <BodyMap
        colorOf={(region) => STATUS_COLOR[statusOf(region)]}
        describe={(region) => STATUS_LABEL[statusOf(region)]}
        selectedRegion={selected}
        onSelect={(region) => setSelected(region === selected ? null : region)}
      />
      <div className={styles.legend} style={{ justifyContent: 'center' }}>
        {LEGEND.map((s) => (
          <span key={s}>
            <span className={styles.dot} style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      {selected && (
        <div role="status" style={{ marginTop: 12 }}>
          <h2>{REGION_NAMES[selected]}</h2>
          <RecoveryList categories={selectedCategories} recoveries={recoveries} />
        </div>
      )}

      <details style={{ marginTop: 12 }}>
        <summary className={styles.label} style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>
          すべてのカテゴリの状態
        </summary>
        <RecoveryList categories={categories} recoveries={recoveries} />
      </details>
    </Card>
  );
}

/** カテゴリごとの状態の一覧（最後に鍛えた日時、回復予定時刻、残り時間。F-BODY-02） */
function RecoveryList({
  categories,
  recoveries,
}: {
  categories: readonly Category[];
  recoveries: readonly CategoryRecovery[];
}) {
  if (categories.length === 0) return <Sub>この部位を使うカテゴリはありません。</Sub>;
  return (
    <ul className={styles.list}>
      {categories.map((c) => {
        const r = recoveries.find((x) => x.categoryId === c.id);
        if (!r) return null;
        return (
          <li key={c.id}>
            <div className={styles.row}>
              <span>
                <span className={styles.dot} style={{ background: STATUS_COLOR[r.status] }} />
                {c.name}
              </span>
              <span>
                {STATUS_LABEL[r.status]}
                {r.recoveryAt !== null && r.remainingMs > 0 && `（${formatRemaining(r.remainingMs)}）`}
              </span>
            </div>
            {r.lastSession && (
              <div className={styles.label}>
                最後：{formatDateTime(r.lastSession.endAt)}
                {r.recoveryAt !== null && ` ／ 回復予定：${formatDateTime(r.recoveryAt)}`}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
