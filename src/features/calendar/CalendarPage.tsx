/**
 * カレンダー（基本設計書 3.3 No.5、F-CALD-01、02）。
 * 日付はセッションの開始日（localDate）で決める。週は月曜始まり（グラフと合わせる）。
 */
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useState } from 'react';
import { Link } from 'react-router';
import { durationMinutes, formatMinutes, toLocalDate } from '../../domain/date';
import { formatLocalDate, formatTime } from '../../domain/format';
import { Button, LinkButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { useAllExercises, useAllSessions, useCategories, useNow } from '../hooks';
import pageStyles from '../page.module.css';
import { categoryNames, exerciseNames } from '../session/sessionUtils';
import styles from './CalendarPage.module.css';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

export function CalendarPage() {
  // 日付が変わったら「今日」の表示も変わるよう、1分ごとに現在時刻を更新する
  const today = toLocalDate(useNow(60_000));
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const sessions = useAllSessions();
  const categories = useCategories();
  const exercises = useAllExercises();

  if (!sessions || !categories || !exercises) return null;

  const live = sessions.filter((s) => s.deleted === 0);
  const strengthIds = new Set(categories.filter((c) => c.group !== 'care').map((c) => c.id));
  // 日ごとの印：筋トレ系か有酸素を含む日は strength、ケア系だけの日は care
  const marks = new Map<string, 'strength' | 'care'>();
  for (const s of live) {
    const isStrength = s.categoryIds.some((id) => strengthIds.has(id));
    if (isStrength) marks.set(s.localDate, 'strength');
    else if (!marks.has(s.localDate)) marks.set(s.localDate, 'care');
  }

  const monthStart = parseISO(`${month}-01`);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
  });
  const moveMonth = (diff: number) => setMonth(format(addMonths(monthStart, diff), 'yyyy-MM'));

  const daySessions = live
    .filter((s) => s.localDate === selected)
    .sort((a, b) => a.startAt - b.startAt);

  return (
    <div className={pageStyles.page}>
      <h1>カレンダー</h1>
      <div className={pageStyles.columns}>
        <Card>
          <div className={pageStyles.row}>
            <Button variant="text" aria-label="前の月" onClick={() => moveMonth(-1)}>
              ＜
            </Button>
            <h2 style={{ margin: 0 }}>{format(monthStart, 'yyyy年M月')}</h2>
            <Button variant="text" aria-label="次の月" onClick={() => moveMonth(1)}>
              ＞
            </Button>
          </div>
          <div className={styles.grid} role="grid">
            {WEEKDAYS.map((w) => (
              <div key={w} className={styles.weekday}>
                {w}
              </div>
            ))}
            {days.map((d) => {
              const key = toLocalDate(d.getTime());
              const mark = marks.get(key);
              const classes = [
                styles.day,
                key.startsWith(month) ? '' : styles.outside,
                key === today ? styles.today : '',
                key === selected ? styles.selected : '',
              ];
              return (
                <button
                  key={key}
                  type="button"
                  className={classes.filter(Boolean).join(' ')}
                  onClick={() => setSelected(key)}
                  aria-pressed={key === selected}
                  aria-label={`${formatLocalDate(key)}${mark ? '、記録あり' : ''}`}
                >
                  <span>{d.getDate()}</span>
                  <span className={mark ? `${styles.mark} ${styles[mark] ?? ''}` : styles.mark} />
                </button>
              );
            })}
          </div>
          <div className={pageStyles.legend}>
            <span>
              <span className={`${pageStyles.dot} ${styles.strength}`} />
              筋トレ・有酸素を含む
            </span>
            <span>
              <span className={`${pageStyles.dot} ${styles.care}`} />
              ケア系のみ
            </span>
          </div>
          <Button
            variant="text"
            onClick={() => {
              setMonth(today.slice(0, 7));
              setSelected(today);
            }}
          >
            今日
          </Button>
        </Card>

        <Card title={formatLocalDate(selected)}>
          {daySessions.length === 0 ? (
            <p>この日の記録はありません。</p>
          ) : (
            <ul className={pageStyles.list}>
              {daySessions.map((s) => (
                <li key={s.id}>
                  <Link to={`/session/${s.id}`} className={pageStyles.listLink}>
                    <div className={pageStyles.row}>
                      <strong>{categoryNames(s, categories)}</strong>
                      <span>約{s.kcal}kcal</span>
                    </div>
                    <div className={pageStyles.label}>
                      {formatTime(s.startAt)}〜{formatTime(s.endAt)}（
                      {formatMinutes(durationMinutes(s.startAt, s.endAt))}）
                      {exerciseNames(s, exercises) && ` ${exerciseNames(s, exercises)}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {selected <= today && (
            <LinkButton to={`/session/new?date=${selected}`} variant="text">
              この日に手入力で記録
            </LinkButton>
          )}
        </Card>
      </div>
    </div>
  );
}
