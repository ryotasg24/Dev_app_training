/**
 * ショートカットの導入手順（F-HLT-04、基本設計書 6.4）。
 * 2026-11-03 に実機で確かめた内容をもとにしている。
 */
import { useNavigate } from 'react-router';
import type { HealthWorkoutType } from '../../domain/health';
import { Button } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { useSettings } from '../hooks';
import styles from '../page.module.css';

/** アプリから渡す種類と、ヘルスケアの種類の対応（基本設計書 6.2） */
const WORKOUT_TYPES: { type: HealthWorkoutType; label: string }[] = [
  { type: 'strength', label: '機能的筋力トレーニング' },
  { type: 'running', label: 'ランニング（屋外）' },
  { type: 'runningIndoor', label: 'ランニング（屋内）' },
  { type: 'care', label: 'コアトレーニング' },
];

/** 区切った値の順番と、変数の名前（基本設計書 6.3） */
const VALUES: { index: number; name: string; example: string }[] = [
  { index: 1, name: 'type', example: 'strength' },
  { index: 2, name: 'start', example: '2026/11/03 21:00' },
  { index: 3, name: 'minutes', example: '35' },
  { index: 4, name: 'kcal', example: '159' },
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
      <Sub>
        アプリからは「<code>strength|2026/11/03 21:00|35|159</code>
        」のように、種類・開始日時・所要時間（分）・カロリーを「|」でつないだテキストを送ります。
      </Sub>

      <Card title="1. ショートカットを作る">
        <ol>
          <li>「ショートカット」アプリを開き、右上の「＋」を押す</li>
          <li>
            上部の名前を押して「<strong>{settings.shortcutName}</strong>」にする（設定の名前と同じにする）
          </li>
        </ol>
      </Card>

      <Card title="2. 送られたテキストを分ける">
        <ol>
          <li>
            「<strong>テキストを分割</strong>」を追加し、入力を「ショートカットの入力」、区切り文字を「カスタム」にして「
            <strong>|</strong>」（縦棒1文字）を入れる
          </li>
          <li>
            上部に「〜から〜を受け取る」が出たら、種類は「テキスト」のままでよい
          </li>
          <li>
            次の4組を順に追加する。「<strong>リストから項目を取得</strong>
            」（入力：分割されたテキスト、「インデックスの項目」、番号）のすぐ後に「
            <strong>変数を設定</strong>」（変数名）を置く
            <ul>
              {VALUES.map((v) => (
                <li key={v.name}>
                  {v.index}番目 → 変数「<strong>{v.name}</strong>」（例：{v.example}）
                </li>
              ))}
            </ul>
          </li>
          <li>
            「<strong>入力から日付を取得</strong>」：入力に変数「start」を指定する
          </li>
        </ol>
        <Sub>
          変数に名前を付けておくと、あとの「もし」や「ワークアウトを記録」で、どの値かを間違えずに選べます。
        </Sub>
      </Card>

      <Card title="3. 種類ごとにワークアウトを記録する">
        <ol>
          <li>
            「<strong>もし</strong>」を4つ、入れ子にせずに並べる。条件の左側は変数「<strong>type</strong>
            」、「が次と等しい」、右側に下の文字を<strong>つづりどおり</strong>に入れる
            <ul>
              {WORKOUT_TYPES.map((w) => (
                <li key={w.type}>
                  <code>{w.type}</code> → 種類「{w.label}」
                </li>
              ))}
            </ul>
          </li>
          <li>
            それぞれの「もし」の中に「<strong>ワークアウトを記録</strong>」を入れ、右の「＞」で詳細を開いて設定する
            <ul>
              <li>日付：「日付」（入力から日付を取得の結果）</li>
              <li>継続時間：変数「minutes」、単位は「分」</li>
              <li>カロリー：変数「kcal」</li>
            </ul>
          </li>
          <li>最後に「通知を表示」：「ヘルスケアに記録しました」</li>
        </ol>
        <Sub>
          1回の記録は、合計の時間とカロリーで1件のワークアウトにまとめて送ります。筋トレ系を含む日は「機能的筋力トレーニング」になります。
        </Sub>
      </Card>

      <Card title="4. 動作を確かめる（ショートカットの中で）">
        <ol>
          <li>
            一番上に「テキスト」アクションを追加し、<code>strength|2026/11/03 21:00|30|150</code> を入れる
          </li>
          <li>「テキストを分割」の入力を、一時的にこの「テキスト」に変える</li>
          <li>右下の「▶」で実行する。エラーが出たら、赤く表示されたアクションを見直す</li>
          <li>
            成功したら、ヘルスケアアプリで記録を確かめて削除し、入力を「ショートカットの入力」に戻して「テキスト」アクションを消す
          </li>
        </ol>
      </Card>

      <Card title="5. 使い方">
        <ol>
          <li>記録を保存したあと、「ヘルスケアに送る」を押す</li>
          <li>ショートカットアプリが開き、ワークアウトが記録される</li>
          <li>画面左上の「◀」でこのアプリに戻り、「できた」を押す</li>
        </ol>
        <Sub>
          初回は、ヘルスケアへの書き込みの許可を求められます。「許可」を選んでください。許可を変えるときは、iPhoneの「設定
          → ヘルスケア → データアクセスとデバイス → ショートカット」で、ワークアウトとアクティブエネルギーの書き込みをオンにします。
        </Sub>
      </Card>
    </div>
  );
}
