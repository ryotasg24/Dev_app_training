/**
 * 「ヘルスケアに送る」ボタン（F-HLT-01、03、基本設計書 6.5）。
 * ショートカットが成功したかはアプリから分からないため、戻ってきたときに利用者にたずねる。
 */
import { IconHeartbeat } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { db } from '../../db/db';
import { markHealthSent } from '../../db/sessionRepository';
import { formatDateTime } from '../../domain/format';
import { buildHealthPayload, buildShortcutUrl } from '../../domain/health';
import type { Category, Session, Settings } from '../../domain/types';
import { onceReturnedToApp, openShortcut } from '../../platform/shortcut';
import { Button } from '../../ui/Button';
import { Actions, Notice, Sub } from '../../ui/Card';

interface Props {
  session: Session;
  categories: readonly Category[];
  settings: Settings;
}

export function HealthSendButton({ session, categories, settings }: Props) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);

  // 画面を離れたら、戻ってきたときの確認を取り消す
  useEffect(() => () => cancelRef.current?.(), []);

  if (!settings.healthEnabled) return null;

  const alreadySent = session.healthSentAt !== null;

  const send = () => {
    if (
      alreadySent &&
      !window.confirm('すでに送信済みです。もう一度送ると、ヘルスケアに同じ記録が2件できます。送りますか？')
    ) {
      return;
    }
    const url = buildShortcutUrl(settings.shortcutName, buildHealthPayload(session, categories));
    cancelRef.current?.();
    cancelRef.current = onceReturnedToApp(() => setAsking(true));
    openShortcut(url);
  };

  const answer = async (ok: boolean) => {
    setAsking(false);
    if (ok) await markHealthSent(db, session.id, Date.now());
  };

  return (
    <div>
      {asking && (
        <Notice tone="info">
          <p>ヘルスケアに記録できましたか？</p>
          <Actions>
            <Button onClick={() => void answer(true)}>できた</Button>
            <Button variant="secondary" onClick={() => void answer(false)}>
              できなかった
            </Button>
          </Actions>
        </Notice>
      )}
      <Button variant={alreadySent ? 'secondary' : 'primary'} block onClick={send}>
        <IconHeartbeat size={22} aria-hidden="true" />
        {alreadySent ? 'もう一度ヘルスケアに送る' : 'ヘルスケアに送る'}
      </Button>
      <Sub>
        {alreadySent
          ? `送信済み（${formatDateTime(session.healthSentAt!)}）`
          : '未送信'}
        。送ったあとは、画面左上の「◀」でこのアプリに戻ってください。
      </Sub>
    </div>
  );
}
