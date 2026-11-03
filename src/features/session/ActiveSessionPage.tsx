/**
 * 計測中の画面（基本設計書 3.3 No.2、F-REC-04、05、12、デザイン仕様書 7.4）。
 * 「次の種目へ」で今のステップを終えて次を始め、最後のステップでは「終了」で保存する。
 * ステップの切り替えとメモは、そのたびに端末内に保存する（F-REC-05）。
 */
import { IconFlag, IconPlayerTrackNext } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../../db/db';
import {
  advanceActiveSession,
  discardActiveSession,
  finishActiveSession,
  updateActiveMemo,
} from '../../db/sessionRepository';
import { formatElapsed } from '../../domain/date';
import { formatTime } from '../../domain/format';
import { MAX_MEMO_LENGTH, validateSessionDraft } from '../../domain/session';
import { closeSteps, currentStep, hasNextStep, summarizeSteps } from '../../domain/steps';
import type { ActiveSession, Category, Exercise } from '../../domain/types';
import { newId } from '../../platform/device';
import { Button, LinkButton } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { ErrorList, Field, Input } from '../../ui/Field';
import { useActiveSession, useAllExercises, useCategories, useNow } from '../hooks';
import styles from '../page.module.css';
import { categoryName, errorMessage, menuItemName, stepNumber } from './sessionUtils';

export function ActiveSessionPage() {
  const navigate = useNavigate();
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
  // 版2以前に、カテゴリを選ばずに計測を始めていた場合（移行でステップが空になる）
  if (active.steps.length === 0) {
    return (
      <div className={styles.page}>
        <h1>メニューがありません</h1>
        <p>この計測にはメニューがないため、続けられません。破棄して、メニューを選び直してください。</p>
        <Button
          variant="danger"
          block
          onClick={() => void discardActiveSession(db).then(() => navigate('/session/plan', { replace: true }))}
        >
          破棄してメニューを選ぶ
        </Button>
      </div>
    );
  }
  return <ActiveSessionView active={active} categories={categories} exercises={exercises} />;
}

function ActiveSessionView({
  active,
  categories,
  exercises,
}: {
  active: ActiveSession;
  categories: Category[];
  exercises: Exercise[];
}) {
  const navigate = useNavigate();
  const now = useNow(1000);
  // メモは日本語入力の途中で書き換わらないよう、画面側で持ち、変更のたびに保存する
  const [memo, setMemo] = useState(active.memo);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const step = currentStep(active);
  const stepStartAt = step?.startAt ?? active.startAt;
  const next = active.steps[active.currentIndex + 1];
  const isLast = !hasNextStep(active);
  const remaining = active.steps.length - active.currentIndex - 1;

  const goNext = async () => {
    setBusy(true);
    setErrors([]);
    // 画面に表示していたステップの番号を渡し、二度押しで2つ進まないようにする
    await advanceActiveSession(db, active.currentIndex, Date.now());
    setBusy(false);
  };

  const finish = async (early: boolean) => {
    if (
      early &&
      !window.confirm(`まだ始めていない${remaining}種目は記録しません。ここで終了しますか？`)
    ) {
      return;
    }
    const endAt = Date.now();
    const steps = closeSteps({ ...active, memo }, endAt);
    const draftErrors = validateSessionDraft(
      {
        startAt: active.startAt,
        endAt,
        source: 'timer',
        ...summarizeSteps(steps),
        memo,
      },
      endAt,
    );
    if (draftErrors.length > 0) {
      setErrors(draftErrors);
      return;
    }
    setBusy(true);
    try {
      await updateActiveMemo(db, memo);
      const session = await finishActiveSession(db, endAt, { newId: newId(), now: endAt });
      navigate(`/session/${session.id}/done`, { replace: true });
    } catch (error) {
      setErrors([errorMessage(error)]);
      setBusy(false);
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
        <div className={styles.label}>
          {active.currentIndex + 1} / {active.steps.length}
        </div>
        {step && (
          <h1 style={{ marginBottom: 4 }}>
            {menuItemName(step, categories, exercises)}
            {step.exerciseId && (
              <span className={styles.label}>（{categoryName(step.categoryId, categories)}）</span>
            )}
          </h1>
        )}
        <div className={styles.elapsed} aria-live="off">
          {formatElapsed(now - stepStartAt)}
        </div>
        <Sub>
          全体 {formatElapsed(now - active.startAt)}（{formatTime(active.startAt)} から）
        </Sub>
        {next && <p>次：{menuItemName(next, categories, exercises)}</p>}
      </div>

      <Card title="メニュー">
        <ol className={styles.list}>
          {active.steps.map((s, i) => {
            const isDone = i < active.currentIndex;
            const isCurrent = i === active.currentIndex;
            return (
              <li
                key={`${s.categoryId}-${s.exerciseId ?? ''}`}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  fontWeight: isCurrent ? 700 : undefined,
                  color: !isDone && !isCurrent ? 'var(--color-text-sub)' : undefined,
                }}
              >
                <div className={styles.row}>
                  <span>
                    {isDone ? '✓ ' : isCurrent ? '▶ ' : ''}
                    {stepNumber(i)} {menuItemName(s, categories, exercises)}
                  </span>
                  {isDone && s.startAt !== null && s.endAt !== null && (
                    <span className={styles.label}>{formatElapsed(s.endAt - s.startAt)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <Card>
        <Field label="メモ（任意）">
          <Input
            value={memo}
            maxLength={MAX_MEMO_LENGTH}
            placeholder="体調など"
            onChange={(e) => {
              setMemo(e.target.value);
              void updateActiveMemo(db, e.target.value);
            }}
          />
        </Field>
      </Card>

      <div className={styles.bottomBar}>
        <ErrorList errors={errors} />
        {isLast ? (
          <Button variant="start" block disabled={busy} onClick={() => void finish(false)}>
            <IconFlag size={28} aria-hidden="true" />
            終了
          </Button>
        ) : (
          <>
            <Button variant="start" block disabled={busy} onClick={() => void goNext()}>
              次の種目へ
              <IconPlayerTrackNext size={28} aria-hidden="true" />
            </Button>
            <Button variant="text" block disabled={busy} onClick={() => void finish(true)}>
              ここで終了
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
