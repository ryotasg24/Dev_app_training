/**
 * 手入力で記録・セッションの編集（基本設計書 3.3 No.4、No.6'、F-REC-06、07）。
 */
import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { db } from '../../db/db';
import { saveSession } from '../../db/sessionRepository';
import { durationMinutes, MS_PER_MINUTE, toLocalDate } from '../../domain/date';
import {
  MAX_DURATION_MINUTES,
  MAX_MEMO_LENGTH,
  validateSessionDraft,
  type SessionDraft,
} from '../../domain/session';
import type { Category, Exercise, Session } from '../../domain/types';
import { newId } from '../../platform/device';
import { Button } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { ErrorList, Field, Input } from '../../ui/Field';
import { useAllExercises, useAllSessions, useCategories, useNow, useSession } from '../hooks';
import styles from '../page.module.css';
import { CategoryPicker, type Selection } from './CategoryPicker';
import { errorMessage, previousSelection } from './sessionUtils';

const QUICK_MINUTES = [10, 15, 20, 30, 45, 60];

export function SessionFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams();
  const session = useSession(mode === 'edit' ? id : undefined);
  const categories = useCategories();
  const exercises = useAllExercises();

  if (!categories || !exercises) return null;
  if (mode === 'edit' && !session) return null;
  return (
    <SessionForm
      // 編集対象が変わったら入力欄を作り直す
      key={session?.id ?? 'new'}
      existing={session}
      categories={categories}
      exercises={exercises}
    />
  );
}

function SessionForm({
  existing,
  categories,
  exercises,
}: {
  existing: Session | undefined;
  categories: Category[];
  exercises: Exercise[];
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessions = useAllSessions();
  const now = useNow(60_000);

  // 初期値：編集なら元の値。新規なら、カレンダーから来た日（なければ今日）の現在時刻の30分前
  const [initial] = useState(() => {
    if (existing) return existing;
    const now = Date.now();
    const date = searchParams.get('date') ?? toLocalDate(now);
    const time = format(now - 30 * MS_PER_MINUTE, 'HH:mm');
    const startAt = new Date(`${date}T${time}`).getTime();
    return { startAt, endAt: startAt + 30 * MS_PER_MINUTE, categoryIds: [], exercises: [], memo: '' };
  });

  const [date, setDate] = useState(toLocalDate(initial.startAt));
  const [time, setTime] = useState(format(initial.startAt, 'HH:mm'));
  const [minutes, setMinutes] = useState(String(durationMinutes(initial.startAt, initial.endAt)));
  const [selection, setSelection] = useState<Selection>({
    categoryIds: [...initial.categoryIds],
    exercises: [...initial.exercises],
  });
  const [memo, setMemo] = useState(initial.memo);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const startAt = new Date(`${date}T${time}`).getTime();
    const minutesNumber = Number(minutes);
    if (Number.isNaN(startAt) || !Number.isFinite(minutesNumber)) {
      setErrors(['日時と所要時間を正しく入力してください。']);
      return;
    }
    const draft: SessionDraft = {
      startAt,
      endAt: startAt + Math.round(minutesNumber) * MS_PER_MINUTE,
      source: 'manual',
      ...selection,
      memo,
    };
    const savedAt = Date.now();
    const draftErrors = validateSessionDraft(draft, savedAt);
    if (draftErrors.length > 0) {
      setErrors(draftErrors);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveSession(db, draft, { newId: newId(), now: savedAt }, existing?.id);
      navigate(existing ? `/session/${saved.id}` : `/session/${saved.id}/done`, { replace: true });
    } catch (error) {
      setErrors([errorMessage(error)]);
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <Button variant="text" className={styles.backLink} onClick={() => navigate(-1)}>
        ← キャンセル
      </Button>
      <h1>{existing ? '記録の編集' : '手入力で記録'}</h1>

      <Card>
        <Field label="開始日">
          <Input
            type="date"
            value={date}
            max={toLocalDate(now)}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="開始時刻">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="所要時間（分）" hint={`1〜${MAX_DURATION_MINUTES}分`}>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_DURATION_MINUTES}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </Field>
        <div className={styles.row} style={{ justifyContent: 'flex-start' }}>
          {QUICK_MINUTES.map((m) => (
            <Button key={m} variant="secondary" onClick={() => setMinutes(String(m))}>
              {m}分
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CategoryPicker
          categories={categories}
          exercises={exercises}
          value={selection}
          onChange={setSelection}
          previous={existing ? null : previousSelection(sessions)}
        />
        <div style={{ marginTop: 16 }}>
          <Field label="メモ（任意）">
            <Input value={memo} maxLength={MAX_MEMO_LENGTH} onChange={(e) => setMemo(e.target.value)} />
          </Field>
        </div>
      </Card>

      {existing && existing.steps.length > 0 && (
        <Sub>
          この記録には種目ごとの時間があります。開始日時とメモだけを変えた場合は残りますが、所要時間・カテゴリ・種目を変えると、種目ごとの時間の記録は消えます。
        </Sub>
      )}
      {existing?.healthSentAt != null && (
        <Sub>ヘルスケアに送信済みの記録です。アプリで編集しても、ヘルスケアの記録は変わりません。</Sub>
      )}
      <ErrorList errors={errors} />
      <Button variant="primary" block disabled={saving} onClick={() => void save()}>
        保存
      </Button>
    </div>
  );
}
