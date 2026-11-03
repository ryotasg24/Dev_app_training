/**
 * 記録の確認（保存直後）とセッション詳細（基本設計書 3.3 No.3、No.6）。
 */
import { useNavigate, useParams } from 'react-router';
import { db } from '../../db/db';
import { softDeleteSession } from '../../db/sessionRepository';
import { durationMinutes, formatMinutes } from '../../domain/date';
import { formatDate, formatTime } from '../../domain/format';
import { Button, LinkButton } from '../../ui/Button';
import { Actions, Card, Sub } from '../../ui/Card';
import { useAllExercises, useCategories, useSession, useSettings } from '../hooks';
import styles from '../page.module.css';
import { HealthSendButton } from './HealthSendButton';
import { categoryNames, exerciseNames } from './sessionUtils';

export function SessionViewPage({ mode }: { mode: 'done' | 'detail' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const session = useSession(id);
  const categories = useCategories();
  const exercises = useAllExercises();
  const settings = useSettings();

  if (!categories || !exercises || !settings) return null;
  if (!session || session.deleted === 1) {
    return (
      <div className={styles.page}>
        <h1>記録が見つかりません</h1>
        <LinkButton to="/" variant="primary" block>
          ホームへ戻る
        </LinkButton>
      </div>
    );
  }

  const remove = async () => {
    const note =
      session.healthSentAt !== null
        ? '\nヘルスケアの記録は消えません。必要ならヘルスケアアプリで削除してください。'
        : '';
    if (!window.confirm(`この記録を削除します。よろしいですか？${note}`)) return;
    await softDeleteSession(db, session.id, Date.now());
    navigate(-1);
  };

  const names = exerciseNames(session, exercises);

  return (
    <div className={styles.page}>
      {mode === 'detail' && (
        <Button variant="text" className={styles.backLink} onClick={() => navigate(-1)}>
          ← 戻る
        </Button>
      )}
      <h1>{mode === 'done' ? '✓ 保存しました' : '記録の詳細'}</h1>

      <Card>
        <p>
          {formatDate(session.startAt)} {formatTime(session.startAt)}〜{formatTime(session.endAt)}
          （{formatMinutes(durationMinutes(session.startAt, session.endAt))}）
        </p>
        <h2>{categoryNames(session, categories)}</h2>
        {names && <p>{names}</p>}
        {session.memo && <p>メモ：{session.memo}</p>}
        <p>
          約 <span className={styles.bigNumber}>{session.kcal}</span> kcal
        </p>
        <Sub>消費カロリーは推定値です（体重 {session.weightKg.toFixed(1)}kg で計算）。</Sub>
      </Card>

      <HealthSendButton session={session} categories={categories} settings={settings} />

      <Actions>
        <LinkButton to={`/session/${session.id}/edit`}>編集</LinkButton>
        {mode === 'detail' && (
          <Button variant="danger" onClick={() => void remove()}>
            削除
          </Button>
        )}
        {mode === 'done' && (
          <LinkButton to="/" variant="text" replace>
            閉じる
          </LinkButton>
        )}
      </Actions>
      {session.healthSentAt !== null && (
        <Sub>アプリで編集・削除しても、ヘルスケアの記録は変わりません。</Sub>
      )}
    </div>
  );
}
