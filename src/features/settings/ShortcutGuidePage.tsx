/**
 * ショートカットの導入手順（F-HLT-04、基本設計書 6.4）。
 * 手順は実機での確認前の案。確認できたら、画面の写真などを加えて仕上げる。
 */
import { useNavigate } from 'react-router';
import type { HealthWorkoutType } from '../../domain/health';
import { Button } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { useSettings } from '../hooks';
import styles from '../page.module.css';

/** アプリから渡す type と、ヘルスケアの種類の対応（基本設計書 6.2） */
const WORKOUT_TYPES: { type: HealthWorkoutType; label: string }[] = [
  { type: 'strength', label: '機能的筋力トレーニング' },
  { type: 'running', label: 'ランニング（屋外）' },
  { type: 'runningIndoor', label: 'ランニング（屋内）' },
  { type: 'care', label: 'コアトレーニング' },
];

export function ShortcutGuidePage() {
  const navigate = useNavigate();
  const settings = useSettings();
  if (!settings) return null;

  return (
    <div className={styles.page}>
      <Button variant="text" className={styles.backLink} onClick={() => navigate(-1)}>
        ← 設定
      </Button>
      <h1>ショートカットの導入手順</h1>
      <p>
        このアプリはヘルスケアに直接書き込めないため、iPhoneの「ショートカット」アプリを使って記録します。最初に一度だけ、次のショートカットを作ってください。
      </p>

      <Card title="1. ショートカットを作る">
        <ol>
          <li>「ショートカット」アプリを開き、右上の「＋」を押す</li>
          <li>
            名前を「<strong>{settings.shortcutName}</strong>」にする（設定の名前と同じにする）
          </li>
          <li>「ショートカットの入力を受け取る」を有効にし、種類を「テキスト」にする</li>
        </ol>
      </Card>

      <Card title="2. アクションを追加する">
        <ol>
          <li>「辞書を取得」：入力に「ショートカットの入力」を指定</li>
          <li>「辞書の値を取得」：キー「start」→ 続けて「日付を取得」で日付にする</li>
          <li>「辞書の値を取得」：キー「minutes」「kcal」「type」をそれぞれ取得</li>
          <li>
            「もし」を4つ、入れ子にせずに並べる。それぞれの中に「ワークアウトを記録」を入れ、日付＝start、継続時間＝minutes（分）、カロリー＝kcal にする
            <ul>
              {WORKOUT_TYPES.map((w) => (
                <li key={w.type}>
                  「type」が「{w.type}」なら → 種類「{w.label}」
                </li>
              ))}
            </ul>
          </li>
          <li>「通知を表示」：「ヘルスケアに記録しました」</li>
        </ol>
        <Sub>
          1回の記録は、合計の時間とカロリーで1件のワークアウトにまとめて送ります。筋トレ系を含む日は「機能的筋力トレーニング」になります。
        </Sub>
      </Card>

      <Card title="3. 使い方">
        <ol>
          <li>記録を保存したあと、「ヘルスケアに送る」を押す</li>
          <li>ショートカットアプリが開き、ワークアウトが記録される</li>
          <li>画面左上の「◀」でこのアプリに戻り、「できた」を押す</li>
        </ol>
        <Sub>
          初回は、ヘルスケアへの書き込みの許可を求められます。「許可」を選んでください。
        </Sub>
      </Card>
    </div>
  );
}
