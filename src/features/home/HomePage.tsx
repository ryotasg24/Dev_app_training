/**
 * ホーム（基本設計書 3.3 No.1）。
 */
import { IconPencilPlus, IconPlayerPlay, IconStopwatch } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { db } from '../../db/db';
import { startActiveSession } from '../../db/sessionRepository';
import { durationMinutes, formatElapsed, formatMinutes, toLocalDate } from '../../domain/date';
import { formatLocalDate } from '../../domain/format';
import { calcStreak, countTrainedDaysInMonth, findRecentDay } from '../../domain/history';
import { calcCategoryRecovery } from '../../domain/recovery';
import { isForgotToEnd, needsBackupReminder } from '../../domain/reminders';
import { findSorenessTargets } from '../../domain/soreness';
import { Button, LinkButton } from '../../ui/Button';
import { Card } from '../../ui/Card';
import {
  useActiveSession,
  useAllSessions,
  useCategories,
  useMeta,
  useNow,
  useSettings,
  useSorenessLogs,
} from '../hooks';
import styles from '../page.module.css';
import { categoryNames } from '../session/sessionUtils';
import { BackupNotice, ForgotEndNotice, SorenessNotice, UnsentNotice } from './HomeNotices';
import { RecoveryCard } from './RecoveryCard';

export function HomePage() {
  const navigate = useNavigate();
  // 経過時間を表示するため1秒ごとに更新する。回復状況の計算は軽いので同じ間隔で問題ない
  const now = useNow(1000);
  const settings = useSettings();
  const categories = useCategories();
  const sessions = useAllSessions();
  const active = useActiveSession();
  const sorenessLogs = useSorenessLogs();
  const meta = useMeta();

  if (!settings || !categories || !sessions || active === undefined || !sorenessLogs || !meta) {
    return null;
  }

  const liveSessions = sessions.filter((s) => s.deleted === 0);
  const recoveries = categories.map((c) =>
    calcCategoryRecovery(c, sessions, sorenessLogs, settings.sorenessAdjustHours, now),
  );
  const sorenessTargets = findSorenessTargets(categories, sessions, sorenessLogs, now);
  const recent = findRecentDay(sessions, now);
  const showBackup = needsBackupReminder(
    meta.lastBackupAt,
    meta.firstLaunchAt ?? now,
    settings.backupReminderDays,
    liveSessions.length,
    now,
  );
  const unsent = settings.healthEnabled ? liveSessions.filter((s) => s.healthSentAt === null) : [];

  const start = async () => {
    await startActiveSession(db, Date.now());
    navigate('/session/active');
  };

  return (
    <div className={styles.page}>
      {active && isForgotToEnd(active, settings.forgotEndHours, now) && (
        <ForgotEndNotice active={active} now={now} />
      )}
      <SorenessNotice targets={sorenessTargets} sessions={sessions} categories={categories} />
      {showBackup && <BackupNotice days={settings.backupReminderDays} />}
      <UnsentNotice sessions={unsent} />

      <div className={styles.columns}>
        <div className={styles.column}>
          {/* 起動から2タップ以内で開始できるよう、開始ボタンを最初に置く（非機能・使いやすさ） */}
          {active ? (
            <LinkButton to="/session/active" variant="start" block>
              <IconStopwatch size={28} aria-hidden="true" />
              計測中 {formatElapsed(now - active.startAt)}
            </LinkButton>
          ) : (
            <Button variant="start" block onClick={() => void start()}>
              <IconPlayerPlay size={28} aria-hidden="true" />
              トレーニング開始
            </Button>
          )}
          <LinkButton to="/session/new" variant="text">
            <IconPencilPlus size={20} aria-hidden="true" />
            手入力で記録
          </LinkButton>

          <Card
            title={recent?.isYesterday === false ? '前回やったこと' : '昨日やったこと'}
            aside={recent ? formatLocalDate(recent.localDate) : undefined}
          >
            {recent ? (
              <ul className={styles.list}>
                {recent.sessions.map((s) => (
                  <li key={s.id}>
                    <LinkButton to={`/session/${s.id}`} variant="text" block>
                      <span style={{ flex: 1, textAlign: 'left' }}>{categoryNames(s, categories)}</span>
                      <span>
                        {formatMinutes(durationMinutes(s.startAt, s.endAt))}・約{s.kcal}kcal
                      </span>
                    </LinkButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p>まだ記録がありません。</p>
            )}
          </Card>

          <Card>
            <div className={styles.stats}>
              <div>
                <div className={styles.label}>連続</div>
                <span className={styles.bigNumber}>{calcStreak(sessions, now)}</span>日
              </div>
              <div>
                <div className={styles.label}>今月</div>
                <span className={styles.bigNumber}>
                  {countTrainedDaysInMonth(sessions, toLocalDate(now).slice(0, 7))}
                </span>
                日
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.column}>
          <RecoveryCard categories={categories} recoveries={recoveries} />
        </div>
      </div>
    </div>
  );
}
