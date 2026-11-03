/**
 * 回復状況の表示（F-BODY-01、02）。
 * 人体図の素材が決まるまでの仮の表示として、カテゴリごとの状態を一覧で表示する。
 * 人体図ができたら、この一覧は部位をタップしたときの詳細表示に使う。
 */
import { formatDateTime, formatRemaining } from '../../domain/format';
import type { CategoryRecovery, RecoveryStatus } from '../../domain/recovery';
import type { Category } from '../../domain/types';
import { Card } from '../../ui/Card';
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
  return (
    <Card title="回復状況" aside="人体図は準備中">
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
      <div className={styles.legend}>
        {LEGEND.map((s) => (
          <span key={s}>
            <span className={styles.dot} style={{ background: STATUS_COLOR[s] }} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>
    </Card>
  );
}
