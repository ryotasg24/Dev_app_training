/**
 * 計測中の画面（基本設計書 3.3 No.2）。
 * 選んだ内容は、選ぶたびに端末内に保存する（F-REC-05）。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../../db/db';
import {
  discardActiveSession,
  finishActiveSession,
  updateActiveSession,
} from '../../db/sessionRepository';
import { formatElapsed } from '../../domain/date';
import { formatTime } from '../../domain/format';
import { MAX_MEMO_LENGTH, validateSessionDraft } from '../../domain/session';
import type { ActiveSession, Category, Exercise } from '../../domain/types';
import { newId } from '../../platform/device';
import { Button, LinkButton } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { ErrorList, Field, Input } from '../../ui/Field';
import {
  useActiveSession,
  useAllExercises,
  useAllSessions,
  useCategories,
  useNow,
} from '../hooks';
import styles from '../page.module.css';
import { CategoryPicker } from './CategoryPicker';
import { errorMessage, previousSelection } from './sessionUtils';

export function ActiveSessionPage() {
  const active = useActiveSession();
  const categories = useCategories();
  const exercises = useAllExercises();

  if (active === undefined || !categories || !exercises) return null;
  if (active === null) {
    return (
      <div className={styles.page}>
        <h1>計測中ではありません</h1>
        <LinkButton to="/" variant="primary" block>
          ホームへ戻る
        </LinkButton>
      </div>
    );
  }
  return <ActiveSessionForm active={active} categories={categories} exercises={exercises} />;
}

function ActiveSessionForm({
  active,
  categories,
  exercises,
}: {
  active: ActiveSession;
  categories: Category[];
  exercises: Exercise[];
}) {
  const navigate = useNavigate();
  const sessions = useAllSessions();
  const now = useNow(1000);
  // メモは日本語入力の途中で書き換わらないよう、画面側で持ち、変更のたびに保存する
  const [memo, setMemo] = useState(active.memo);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    const endAt = Date.now();
    const draftErrors = validateSessionDraft(
      { ...active, memo, endAt, source: 'timer' },
      endAt,
    );
    if (draftErrors.length > 0) {
      setErrors(draftErrors);
      return;
    }
    setSaving(true);
    try {
      await updateActiveSession(db, { memo });
      const session = await finishActiveSession(db, endAt, { newId: newId(), now: endAt });
      navigate(`/session/${session.id}/done`, { replace: true });
    } catch (error) {
      setErrors([errorMessage(error)]);
      setSaving(false);
    }
  };

  const discard = async () => {
    if (!window.confirm('計測中の記録を破棄します。よろしいですか？')) return;
    await discardActiveSession(db);
    navigate('/', { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.row}>
        <Button variant="text" onClick={() => void discard()}>
          記録を破棄
        </Button>
        <LinkButton to="/" variant="text">
          ホームへ
        </LinkButton>
      </div>

      <div className={styles.center}>
        <div className={styles.elapsed} aria-live="off">
          {formatElapsed(now - active.startAt)}
        </div>
        <Sub>{formatTime(active.startAt)} から計測中</Sub>
      </div>

      <Card>
        <CategoryPicker
          categories={categories}
          exercises={exercises}
          value={{ categoryIds: active.categoryIds, exercises: active.exercises }}
          onChange={(next) => void updateActiveSession(db, next)}
          previous={previousSelection(sessions)}
        />
        <div style={{ marginTop: 16 }}>
          <Field label="メモ（任意）">
            <Input
              value={memo}
              maxLength={MAX_MEMO_LENGTH}
              placeholder="体調など"
              onChange={(e) => {
                setMemo(e.target.value);
                void updateActiveSession(db, { memo: e.target.value });
              }}
            />
          </Field>
        </div>
      </Card>

      <div className={styles.bottomBar}>
        <ErrorList errors={errors} />
        <Button
          variant="start"
          block
          disabled={active.categoryIds.length === 0 || saving}
          onClick={() => void finish()}
        >
          終了
        </Button>
        {active.categoryIds.length === 0 && (
          <Sub>カテゴリを1つ以上選ぶと終了できます。</Sub>
        )}
      </div>
    </div>
  );
}
