/**
 * カテゴリの詳細設定（基本設計書 3.3 No.9'、F-SET-02）。
 * 回復目安時間・METs・回復管理のオン・オフと、筋肉痛の補正値を変更する。
 */
import { useNavigate } from 'react-router';
import { db } from '../../db/db';
import { updateCategory, updateSettings } from '../../db/repositories';
import type { CategoryGroup, SorenessLevel } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { Checkbox, Field, Input } from '../../ui/Field';
import { useCategories, useSettings } from '../hooks';
import styles from '../page.module.css';

const GROUP_NAMES: Record<CategoryGroup, string> = {
  strength: '筋トレ系',
  care: 'ケア系',
  cardio: '有酸素',
};

const SORENESS_LABELS:{ level: SorenessLevel; label: string }[] = [
  { level: 'none', label: 'なし' },
  { level: 'light', label: '軽い' },
  { level: 'strong', label: '強い' },
];

/** 入力が範囲内の数値なら保存し、そうでなければ元の値に戻す */
function commitNumber(
  input: HTMLInputElement,
  original: number,
  min: number,
  max: number,
  save: (value: number) => void,
) {
  const value = Number(input.value);
  if (Number.isFinite(value) && value >= min && value <= max) save(value);
  else input.value = String(original);
}

export function CategorySettingsPage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const settings = useSettings();
  if (!categories || !settings) return null;

  return (
    <div className={styles.page}>
      <Button variant="text" className={styles.backLink} onClick={() => navigate(-1)}>
        ← 設定
      </Button>
      <h1>回復目安時間とMETs</h1>
      <Sub>数値は一般的な目安です。変更すると、これから保存する記録と、回復状況の表示に反映されます。</Sub>

      {categories.map((c) => (
        <Card key={c.id} title={c.name} aside={GROUP_NAMES[c.group]}>
          <Checkbox
            label="回復を管理する"
            checked={c.recoveryEnabled}
            onChange={(checked) => void updateCategory(db, c.id, { recoveryEnabled: checked }, Date.now())}
          />
          <div className={styles.stats}>
            <Field label="回復目安（時間）">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                defaultValue={c.recoveryHours}
                disabled={!c.recoveryEnabled}
                onBlur={(e) =>
                  commitNumber(e.target, c.recoveryHours, 1, 240, (v) =>
                    void updateCategory(db, c.id, { recoveryHours: Math.round(v) }, Date.now()),
                  )
                }
              />
            </Field>
            <Field label="METs">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                min={1}
                max={15}
                defaultValue={c.mets}
                onBlur={(e) =>
                  commitNumber(e.target, c.mets, 1, 15, (v) =>
                    void updateCategory(db, c.id, { mets: Math.round(v * 10) / 10 }, Date.now()),
                  )
                }
              />
            </Field>
          </div>
        </Card>
      ))}

      <Card title="筋肉痛による回復時間の補正">
        <div className={styles.stats} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {SORENESS_LABELS.map(({ level, label }) => (
            <Field key={level} label={`${label}（時間）`}>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={96}
                defaultValue={settings.sorenessAdjustHours[level]}
                onBlur={(e) =>
                  commitNumber(e.target, settings.sorenessAdjustHours[level], 0, 96, (v) =>
                    void updateSettings(
                      db,
                      { sorenessAdjustHours: { ...settings.sorenessAdjustHours, [level]: Math.round(v) } },
                      Date.now(),
                    ),
                  )
                }
              />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}
