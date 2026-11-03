/**
 * 設定・プロフィール（基本設計書 3.3 No.9、F-SET-01〜04、F-DATA-03、04、07）。
 */
import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { db } from '../../db/db';
import { recordWeight, updateSettings } from '../../db/repositories';
import { formatDateTime } from '../../domain/format';
import type { Settings } from '../../domain/types';
import { newId } from '../../platform/device';
import { isStoragePersisted, requestPersistentStorage } from '../../platform/storage';
import { Button, LinkButton } from '../../ui/Button';
import { Card, Stack, Sub } from '../../ui/Card';
import { Checkbox, Field, Input } from '../../ui/Field';
import { useCurrentWeight, useMeta, useSettings } from '../hooks';
import styles from '../page.module.css';
import { runBackupExport, runCsvExport, runRestore } from './backupActions';

/** 体重の入力範囲（基本設計書 3.3 No.9） */
export const WEIGHT_MIN = 20;
export const WEIGHT_MAX = 300;

export function SettingsPage() {
  const settings = useSettings();
  const weight = useCurrentWeight();
  const meta = useMeta();
  if (!settings || !weight || !meta) return null;
  return <SettingsForm settings={settings} weightKg={weight.weightKg} lastBackupAt={meta.lastBackupAt} />;
}

function SettingsForm({
  settings,
  weightKg,
  lastBackupAt,
}: {
  settings: Settings;
  weightKg: number | null;
  lastBackupAt: number | null;
}) {
  const [nickname, setNickname] = useState(settings.nickname);
  const [weight, setWeight] = useState(weightKg?.toFixed(1) ?? '');
  const [profileMessage, setProfileMessage] = useState('');
  const [dataMessage, setDataMessage] = useState('');
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void isStoragePersisted().then(setPersisted);
  }, []);

  const save = async (changes: Partial<Omit<Settings, 'key' | 'updatedAt'>>) => {
    // 入力欄の変更時だけ呼ぶ処理なので、描画中に時刻を読むことはない（Lintの誤検知）
    // eslint-disable-next-line react-hooks/purity
    await updateSettings(db, changes, Date.now());
  };

  const saveProfile = async () => {
    const value = Number(weight);
    if (!Number.isFinite(value) || value < WEIGHT_MIN || value > WEIGHT_MAX) {
      setProfileMessage(`体重は${WEIGHT_MIN}〜${WEIGHT_MAX}kgで入力してください。`);
      return;
    }
    await updateSettings(db, { nickname: nickname.trim() }, Date.now());
    await recordWeight(db, Math.round(value * 10) / 10, { newId: newId(), now: Date.now() });
    setProfileMessage('保存しました。');
  };

  const numberSetting = (
    key: 'forgotEndHours' | 'backupReminderDays',
    min: number,
    max: number,
  ) => ({
    type: 'number' as const,
    inputMode: 'numeric' as const,
    min,
    max,
    defaultValue: settings[key],
    onBlur: (e: FocusEvent<HTMLInputElement>) => {
      const value = Math.round(Number(e.target.value));
      if (Number.isFinite(value) && value >= min && value <= max) save({ [key]: value });
      else e.target.value = String(settings[key]);
    },
  });

  return (
    <div className={styles.page}>
      <h1>設定</h1>
      <div className={styles.columns}>
        <Stack>
          <Card title="プロフィール">
            <Field label="ニックネーム（任意）">
              <Input value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
            </Field>
            <Field label="体重（kg）" hint="消費カロリーの計算に使います。変えても過去の記録のカロリーは変わりません。">
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
            <Button onClick={() => void saveProfile()}>保存</Button>
            {profileMessage && <p role="status">{profileMessage}</p>}
          </Card>

          <Card title="トレーニング">
            <ul className={styles.list}>
              <li>
                <LinkButton to="/settings/categories" variant="text" block>
                  回復目安時間・METs・筋肉痛の補正 ›
                </LinkButton>
              </li>
              <li>
                <LinkButton to="/settings/exercises" variant="text" block>
                  種目の管理 ›
                </LinkButton>
              </li>
            </ul>
            <Field label="終了し忘れと判断するまでの時間（時間）" hint="1〜12時間">
              <Input {...numberSetting('forgotEndHours', 1, 12)} />
            </Field>
          </Card>

          <Card title="ヘルスケア連携">
            <Checkbox
              label="ヘルスケアに送るボタンを表示する"
              checked={settings.healthEnabled}
              onChange={(checked) => save({ healthEnabled: checked })}
            />
            {settings.healthEnabled && (
              <>
                <Field label="ショートカットの名前" hint="ショートカットアプリで付けた名前と同じにしてください。">
                  <Input
                    defaultValue={settings.shortcutName}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value) save({ shortcutName: value });
                      else e.target.value = settings.shortcutName;
                    }}
                  />
                </Field>
                <LinkButton to="/settings/shortcut" variant="text">
                  ショートカットの導入手順 ›
                </LinkButton>
              </>
            )}
          </Card>
        </Stack>

        <Stack>
          <Card title="データ">
            <p>
              データはこの端末の中にだけ保存されています。ホーム画面からアプリを削除すると、データも消えます。
            </p>
            <Sub>
              最後のバックアップ：{lastBackupAt ? formatDateTime(lastBackupAt) : 'まだありません'}
            </Sub>
            <Stack>
              <Button block onClick={() => void runBackupExport().then(setDataMessage)}>
                バックアップを書き出す
              </Button>
              <Button variant="secondary" block onClick={() => fileRef.current?.click()}>
                バックアップから復元する
              </Button>
              <Button variant="secondary" block onClick={() => void runCsvExport().then(setDataMessage)}>
                記録をCSVで書き出す
              </Button>
            </Stack>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void runRestore(file).then(setDataMessage);
              }}
            />
            {dataMessage && <p role="status">{dataMessage}</p>}
            <Field label="バックアップを促すまでの日数" hint="1〜30日">
              <Input {...numberSetting('backupReminderDays', 1, 30)} />
            </Field>
            <Sub>
              データの保護：
              {persisted === null ? '確認中' : persisted ? '保護されています' : '保護されていません'}
            </Sub>
            {persisted === false && (
              <Button
                variant="text"
                onClick={() => void requestPersistentStorage().then(setPersisted)}
              >
                保護を要求する
              </Button>
            )}
          </Card>

          <Card title="このアプリについて">
            <Sub>版：{__APP_VERSION__}</Sub>
            <Sub>
              消費カロリーと回復時間は一般的な目安にもとづく推定値で、医学的な助言ではありません。
            </Sub>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
