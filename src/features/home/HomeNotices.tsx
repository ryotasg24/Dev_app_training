/**
 * ホーム上部のお知らせ：終了し忘れ、筋肉痛の確認、バックアップ、ヘルスケア未送信（基本設計書 3.3 No.1）。
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { db } from '../../db/db';
import { answerSoreness } from '../../db/repositories';
import { finishActiveSession } from '../../db/sessionRepository';
import {
  formatDateTime,
  fromDateTimeInputValue,
  toDateTimeInputValue,
} from '../../domain/format';
import { defaultForgotEndAt } from '../../domain/reminders';
import { validateSessionDraft } from '../../domain/session';
import type { SorenessTarget } from '../../domain/soreness';
import type { ActiveSession, Category, Session, SorenessLevel } from '../../domain/types';
import { newId } from '../../platform/device';
import { Button, LinkButton } from '../../ui/Button';
import { Actions, Notice } from '../../ui/Card';
import { ErrorList, Field, Input } from '../../ui/Field';
import { runBackupExport } from '../settings/backupActions';
import { errorMessage } from '../session/sessionUtils';

/** 終了し忘れ（F-REC-08） */
export function ForgotEndNotice({ active, now }: { active: ActiveSession; now: number }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(() =>
    toDateTimeInputValue(defaultForgotEndAt(active.startAt, now)),
  );
  const [errors, setErrors] = useState<string[]>([]);

  const save = async () => {
    const endAt = fromDateTimeInputValue(value);
    if (endAt === null || endAt > Date.now()) {
      setErrors(['終了時刻は、開始時刻から現在までの間で指定してください。']);
      return;
    }
    const draftErrors = validateSessionDraft({ ...active, endAt, source: 'timer' }, Date.now());
    if (draftErrors.length > 0) {
      setErrors(draftErrors);
      return;
    }
    try {
      const session = await finishActiveSession(db, endAt, { newId: newId(), now: Date.now() });
      navigate(`/session/${session.id}/done`);
    } catch (error) {
      setErrors([errorMessage(error)]);
    }
  };

  return (
    <Notice tone="warn">
      <p>
        {formatDateTime(active.startAt)} から計測中です。終了し忘れていませんか？
      </p>
      {active.categoryIds.length === 0 ? (
        <p>カテゴリが選ばれていません。計測中の画面でカテゴリを選んでから終了してください。</p>
      ) : (
        <Field label="終了時刻">
          <Input
            type="datetime-local"
            value={value}
            min={toDateTimeInputValue(active.startAt)}
            max={toDateTimeInputValue(now)}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
      )}
      <ErrorList errors={errors} />
      <Actions>
        {active.categoryIds.length > 0 && (
          <Button onClick={() => void save()}>この時刻で終了して保存</Button>
        )}
        <LinkButton to="/session/active">計測中の画面へ</LinkButton>
      </Actions>
    </Notice>
  );
}

/** ［あとで］を押したら、アプリを開き直すまで表示しない（保存はしない。基本設計書 5.5） */
let sorenessDismissed = false;

/** 筋肉痛の確認（F-BODY-05） */
export function SorenessNotice({
  targets,
  sessions,
  categories,
}: {
  targets: readonly SorenessTarget[];
  sessions: readonly Session[];
  categories: readonly Category[];
}) {
  const [dismissed, setDismissed] = useState(sorenessDismissed);
  if (dismissed || targets.length === 0) return null;

  const answer = async (target: SorenessTarget, level: SorenessLevel) => {
    // ボタンを押したときだけ呼ぶ処理なので、描画中に時刻を読むことはない（Lintの誤検知）
    // eslint-disable-next-line react-hooks/purity
    await answerSoreness(db, { ...target, level }, { newId: newId(), now: Date.now() });
  };

  return (
    <Notice tone="info">
      <p>筋肉痛はありますか？</p>
      {targets.map((t) => {
        const name = categories.find((c) => c.id === t.categoryId)?.name ?? t.categoryId;
        const session = sessions.find((s) => s.id === t.sessionId);
        return (
          <div key={`${t.sessionId}-${t.categoryId}`} style={{ marginBottom: 8 }}>
            <strong>{name}</strong>
            {session && <span>（{formatDateTime(session.endAt)}）</span>}
            <Actions>
              <Button variant="secondary" onClick={() => answer(t, 'none')}>
                なし
              </Button>
              <Button variant="secondary" onClick={() => answer(t, 'light')}>
                軽い
              </Button>
              <Button variant="secondary" onClick={() => answer(t, 'strong')}>
                強い
              </Button>
            </Actions>
          </div>
        );
      })}
      <Button
        variant="text"
        onClick={() => {
          sorenessDismissed = true;
          setDismissed(true);
        }}
      >
        あとで
      </Button>
    </Notice>
  );
}

/** バックアップを促す（F-DATA-05） */
export function BackupNotice({ days }: { days: number }) {
  const [message, setMessage] = useState('');
  return (
    <Notice tone="warn">
      <p>最後のバックアップから{days}日以上たちました。データは端末内にしかないため、定期的にバックアップしてください。</p>
      <Button onClick={() => void runBackupExport().then(setMessage)}>今すぐバックアップ</Button>
      {message && <p role="status">{message}</p>}
    </Notice>
  );
}

/** ヘルスケア未送信（F-HLT-03） */
export function UnsentNotice({ sessions }: { sessions: readonly Session[] }) {
  if (sessions.length === 0) return null;
  const recent = [...sessions].sort((a, b) => b.startAt - a.startAt).slice(0, 3);
  return (
    <Notice tone="info">
      <p>ヘルスケアに送っていない記録が{sessions.length}件あります。</p>
      <ul>
        {recent.map((s) => (
          <li key={s.id}>
            <Link to={`/session/${s.id}`}>{formatDateTime(s.startAt)} の記録</Link>
          </li>
        ))}
      </ul>
    </Notice>
  );
}
