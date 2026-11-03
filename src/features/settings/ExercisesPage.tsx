/**
 * 種目管理（基本設計書 3.3 No.8、F-MST-02〜05）。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { db } from '../../db/db';
import {
  addExercise,
  editExercise,
  removeExercise,
  setExerciseFlags,
} from '../../db/repositories';
import type { CategoryId, Exercise, Intensity } from '../../domain/types';
import { newId } from '../../platform/device';
import { Button } from '../../ui/Button';
import { Actions, Card, Sub } from '../../ui/Card';
import { ErrorList, Field, Input, Select } from '../../ui/Field';
import { useAllExercises, useCategories } from '../hooks';
import styles from '../page.module.css';

const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: 'low', label: '低（ストレッチ・軽い体操）' },
  { id: 'mid', label: '中（軽めの自重トレーニング）' },
  { id: 'high', label: '高（本格的な筋トレ）' },
];

const MAX_NAME_LENGTH = 30;

interface FormState {
  /** 編集中の種目のID。新規ならnull */
  id: string | null;
  name: string;
  categoryId: CategoryId;
  intensity: Intensity;
}

export function ExercisesPage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const exercises = useAllExercises();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  if (!categories || !exercises) return null;

  const submit = async () => {
    if (!form) return;
    const name = form.name.trim();
    if (!name || name.length > MAX_NAME_LENGTH) {
      setErrors([`名称を1〜${MAX_NAME_LENGTH}文字で入力してください。`]);
      return;
    }
    const input = { name, categoryId: form.categoryId, intensity: form.intensity };
    if (form.id) await editExercise(db, form.id, input, Date.now());
    else await addExercise(db, input, { newId: newId(), now: Date.now() });
    setForm(null);
    setErrors([]);
    setMessage('保存しました。');
  };

  const remove = async (e: Exercise) => {
    if (!window.confirm(`「${e.name}」を削除しますか？`)) return;
    const result = await removeExercise(db, e.id, Date.now());
    setMessage(
      result === 'hidden'
        ? `「${e.name}」はプリセットか記録で使っているため、非表示にしました。`
        : `「${e.name}」を削除しました。`,
    );
  };

  const flag = async (e: Exercise, flags: Partial<Pick<Exercise, 'hidden' | 'favorite'>>) => {
    // ボタンを押したときだけ呼ぶ処理なので、描画中に時刻を読むことはない（Lintの誤検知）
    // eslint-disable-next-line react-hooks/purity
    await setExerciseFlags(db, e.id, flags, Date.now());
  };

  return (
    <div className={styles.page}>
      <Button variant="text" className={styles.backLink} onClick={() => navigate(-1)}>
        ← 設定
      </Button>
      <h1>種目の管理</h1>
      {message && <p role="status">{message}</p>}

      {form ? (
        <Card title={form.id ? '種目の編集' : '種目の追加'}>
          <Field label="名称">
            <Input
              value={form.name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="カテゴリ">
            <Select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value as CategoryId })}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="強度" hint="消費カロリーの計算に使います。">
            <Select
              value={form.intensity}
              onChange={(e) => setForm({ ...form, intensity: e.target.value as Intensity })}
            >
              {INTENSITIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          <ErrorList errors={errors} />
          <Actions>
            <Button onClick={() => void submit()}>保存</Button>
            <Button variant="text" onClick={() => setForm(null)}>
              キャンセル
            </Button>
          </Actions>
        </Card>
      ) : (
        <Button
          block
          onClick={() =>
            setForm({ id: null, name: '', categoryId: categories[0]?.id ?? 'chest', intensity: 'mid' })
          }
        >
          種目を追加
        </Button>
      )}

      {categories.map((c) => {
        const items = exercises
          .filter((e) => e.categoryId === c.id && e.deleted === 0)
          .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.sortOrder - b.sortOrder);
        return (
          <Card key={c.id} title={c.name}>
            <ul className={styles.list}>
              {items.map((e) => (
                <li key={e.id}>
                  <div className={styles.row}>
                    <span style={{ opacity: e.hidden ? 0.5 : 1 }}>
                      {e.favorite && '★ '}
                      {e.name}
                      {e.hidden && '（非表示）'}
                      {!e.isPreset && <Sub>独自の種目</Sub>}
                    </span>
                    <Actions>
                      <Button
                        variant="text"
                        aria-pressed={e.favorite}
                        onClick={() => flag(e, { favorite: !e.favorite })}
                      >
                        {e.favorite ? '★' : '☆'}
                      </Button>
                      {e.hidden ? (
                        <Button variant="text" onClick={() => flag(e, { hidden: false })}>
                          表示する
                        </Button>
                      ) : e.isPreset ? (
                        <Button variant="text" onClick={() => flag(e, { hidden: true })}>
                          非表示
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="text"
                            onClick={() =>
                              setForm({
                                id: e.id,
                                name: e.name,
                                categoryId: e.categoryId,
                                intensity: e.intensity ?? 'mid',
                              })
                            }
                          >
                            編集
                          </Button>
                          <Button variant="text" onClick={() => void remove(e)}>
                            削除
                          </Button>
                        </>
                      )}
                    </Actions>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
