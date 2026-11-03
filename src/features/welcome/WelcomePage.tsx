/**
 * 初回案内（基本設計書 3.3 No.11）。
 * Safariのタブで開いた場合は、データの保存場所が別になるため、ホーム画面への追加を案内して先に進ませない。
 */
import { useState } from 'react';
import { Navigate } from 'react-router';
import { db } from '../../db/db';
import { recordWeight, updateSettings } from '../../db/repositories';
import { isIosSafari, isStandalone, newId } from '../../platform/device';
import { requestPersistentStorage } from '../../platform/storage';
import { Button } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { ErrorList, Field, Input } from '../../ui/Field';
import { useSettings } from '../hooks';
import styles from '../page.module.css';
import { WEIGHT_MAX, WEIGHT_MIN } from '../settings/SettingsPage';

export function WelcomePage() {
  const settings = useSettings();
  const [nickname, setNickname] = useState('');
  const [weight, setWeight] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // 完了の印が保存され、画面側の設定が更新されてからホームへ移る。
  // 保存直後に移ると、古い設定のまま App が初回案内へ戻してしまうため。
  if (settings?.onboardingDone) return <Navigate to="/" replace />;

  if (isIosSafari() && !isStandalone()) {
    return (
      <div className={styles.page}>
        <h1>ホーム画面に追加してください</h1>
        <Card>
          <p>このアプリは、ホーム画面に追加してから使います。</p>
          <ol>
            <li>画面下部（または上部）の共有ボタン（□に↑）を押す</li>
            <li>「ホーム画面に追加」を選ぶ</li>
            <li>ホーム画面に追加されたアイコンから、アプリを開き直す</li>
          </ol>
          <Sub>
            Safariのタブで開いた場合とホーム画面から開いた場合では、データの保存場所が別になります。記録は必ずホーム画面から開いて行ってください。
          </Sub>
        </Card>
      </div>
    );
  }

  const start = async () => {
    const value = Number(weight);
    if (!weight || !Number.isFinite(value) || value < WEIGHT_MIN || value > WEIGHT_MAX) {
      setErrors([`体重を${WEIGHT_MIN}〜${WEIGHT_MAX}kgで入力してください。`]);
      return;
    }
    const now = Date.now();
    await recordWeight(db, Math.round(value * 10) / 10, { newId: newId(), now });
    await requestPersistentStorage();
    await updateSettings(db, { nickname: nickname.trim(), onboardingDone: true }, now);
  };

  return (
    <div className={styles.page}>
      <h1>ようこそ</h1>
      <Card title="プロフィール">
        <Field label="ニックネーム（任意）">
          <Input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
        </Field>
        <Field label="体重（kg）" hint="消費カロリーの計算に使います。あとから設定で変更できます。">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={WEIGHT_MIN}
            max={WEIGHT_MAX}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </Field>
      </Card>
      <Card title="データについて">
        <p>
          記録はこの端末の中にだけ保存され、外部には送信されません。そのぶん、端末の故障や機種変更に備えて、
          <strong>定期的にバックアップ</strong>を書き出してください（設定 → データ）。
        </p>
        <Sub>アプリをホーム画面から削除すると、データも消えます。</Sub>
      </Card>
      <ErrorList errors={errors} />
      <Button variant="primary" block onClick={() => void start()}>
        はじめる
      </Button>
    </div>
  );
}
