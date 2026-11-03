/**
 * グラフ（基本設計書 3.3 No.7、F-GRA-01〜03）。
 * Chart.js は大きいので、この画面を開いたときだけ読み込む（App.tsx で遅延読み込み）。
 */
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { addMonths, addWeeks, addYears, format, parseISO } from 'date-fns';
import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { formatMinutes, toLocalDate } from '../../domain/date';
import { formatLocalDate } from '../../domain/format';
import { aggregateStats, type StatsBucket, type StatsPeriod } from '../../domain/stats';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Chip, ChipGroup } from '../../ui/Chip';
import { useAllSessions, useCategories } from '../hooks';
import styles from '../page.module.css';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: 'week', label: '週' },
  { id: 'month', label: '月' },
  { id: 'year', label: '年' },
];

type Metric = 'trainedDays' | 'minutes' | 'kcal';
const METRICS: { id: Metric; label: string }[] = [
  { id: 'trainedDays', label: 'トレーニング日数' },
  { id: 'minutes', label: '合計時間' },
  { id: 'kcal', label: '消費カロリー' },
];

/** CSS変数の色を読む（ダークモードに合わせるため） */
function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function bucketLabel(bucket: StatsBucket, period: StatsPeriod): string {
  if (period === 'year') return `${Number(bucket.key.slice(5))}月`;
  if (period === 'week') return formatLocalDate(bucket.key);
  return String(Number(bucket.key.slice(8)));
}

export default function StatsPage() {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [metric, setMetric] = useState<Metric>('trainedDays');
  const [anchor, setAnchor] = useState(() => toLocalDate(Date.now()));
  const sessions = useAllSessions();
  const categories = useCategories();

  if (!sessions || !categories) return null;

  const result = aggregateStats(sessions, period, anchor);
  const move = (diff: number) => {
    const date = parseISO(anchor);
    const next =
      period === 'week' ? addWeeks(date, diff) : period === 'month' ? addMonths(date, diff) : addYears(date, diff);
    setAnchor(format(next, 'yyyy-MM-dd'));
  };

  const barColor = cssColor('--color-primary-strong');
  const textColor = cssColor('--color-text-sub');
  const gridColor = cssColor('--color-border');
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textColor, precision: 0 }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { color: textColor, precision: 0 }, grid: { color: gridColor } },
    },
  };

  const categoryRows = categories.map((c) => ({ name: c.name, count: result.categoryCounts[c.id] ?? 0 }));

  return (
    <div className={styles.page}>
      <h1>グラフ</h1>
      <ChipGroup>
        {PERIODS.map((p) => (
          <Chip key={p.id} selected={period === p.id} onToggle={() => setPeriod(p.id)}>
            {p.label}
          </Chip>
        ))}
      </ChipGroup>
      <div className={styles.row}>
        <Button variant="text" aria-label="前の期間" onClick={() => move(-1)}>
          ＜
        </Button>
        <strong>
          {formatLocalDate(result.startDate)}〜{formatLocalDate(result.endDate)}
        </strong>
        <Button variant="text" aria-label="次の期間" onClick={() => move(1)}>
          ＞
        </Button>
      </div>

      <Card>
        <div className={styles.stats} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className={styles.label}>日数</div>
            <span className={styles.bigNumber}>{result.totals.trainedDays}</span>日
          </div>
          <div>
            <div className={styles.label}>時間</div>
            <strong>{formatMinutes(result.totals.minutes)}</strong>
          </div>
          <div>
            <div className={styles.label}>カロリー</div>
            <strong>約{result.totals.kcal}kcal</strong>
          </div>
        </div>
      </Card>

      <div className={styles.columns}>
        <Card title="推移">
          <ChipGroup>
            {METRICS.map((m) => (
              <Chip key={m.id} selected={metric === m.id} onToggle={() => setMetric(m.id)}>
                {m.label}
              </Chip>
            ))}
          </ChipGroup>
          <div style={{ height: 240, marginTop: 12 }}>
            <Bar
              options={options}
              data={{
                labels: result.buckets.map((b) => bucketLabel(b, period)),
                datasets: [
                  {
                    label: METRICS.find((m) => m.id === metric)?.label ?? '',
                    data: result.buckets.map((b) => b[metric]),
                    backgroundColor: barColor,
                    borderRadius: 4,
                  },
                ],
              }}
            />
          </div>
          {metric === 'minutes' && <p className={styles.label}>単位：分</p>}
          {metric === 'kcal' && <p className={styles.label}>消費カロリーは推定値です。</p>}
        </Card>

        <Card title="カテゴリ別の回数">
          <div style={{ height: 40 + categoryRows.length * 28 }}>
            <Bar
              options={{ ...options, indexAxis: 'y' }}
              data={{
                labels: categoryRows.map((r) => r.name),
                datasets: [
                  {
                    label: '回数',
                    data: categoryRows.map((r) => r.count),
                    backgroundColor: barColor,
                    borderRadius: 4,
                  },
                ],
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
