/**
 * メニューの選択（基本設計書 3.3 No.1'、F-REC-01〜03、09、デザイン仕様書 7.3）。
 * 種目を押した順に並べてメニューを作り、「スタート」で計測を始める。
 * 選んでいる間はまだ計測を始めていないので、端末内には保存しない。
 */
import { IconPlayerPlay, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { db } from '../../db/db';
import { startActiveSession } from '../../db/sessionRepository';
import { isSameMenuItem, toggleMenuItem } from '../../domain/steps';
import type { CategoryId, MenuItem } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Card, Sub } from '../../ui/Card';
import { Chip, ChipGroup } from '../../ui/Chip';
import { ErrorList } from '../../ui/Field';
import {
  useActiveSession,
  useAllExercises,
  useAllSessions,
  useCategories,
} from '../hooks';
import styles from '../page.module.css';
import { GroupLabel } from './GroupLabel';
import {
  categoryName,
  errorMessage,
  GROUP_ORDER,
  menuItemName,
  previousMenu,
  stepNumber,
} from './sessionUtils';

export function MenuPlanPage() {
  const navigate = useNavigate();
  const categories = useCategories();
  const exercises = useAllExercises();
  const sessions = useAllSessions();
  const active = useActiveSession();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [viewCategory, setViewCategory] = useState<CategoryId | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);

  if (!categories || !exercises || active === undefined) return null;
  // すでに計測中なら、計測中の画面へ（二重に開始しないように）
  if (active) return <Navigate to="/session/active" replace />;

  const shownCategory = viewCategory ?? categories[0]?.id ?? null;
  const previous = previousMenu(sessions, exercises);

  // 表示中のカテゴリの種目：先頭に「種目なし」、お気に入り→その他。非表示・削除済みは出さない
  const items: MenuItem[] = shownCategory
    ? [
        { categoryId: shownCategory, exerciseId: null },
        ...exercises
          .filter((e) => e.categoryId === shownCategory && e.deleted === 0 && !e.hidden)
          .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.sortOrder - b.sortOrder)
          .map((e) => ({ categoryId: shownCategory, exerciseId: e.id })),
      ]
    : [];

  const start = async () => {
    setStarting(true);
    try {
      await startActiveSession(db, menu, Date.now());
      navigate('/session/active', { replace: true });
    } catch (error) {
      setErrors([errorMessage(error)]);
      setStarting(false);
    }
  };

  return (
    <div className={styles.page}>
      <Button variant="text" className={styles.backLink} onClick={() => navigate(-1)}>
        ← キャンセル
      </Button>
      <div className={styles.row}>
        <h1 style={{ margin: 0 }}>メニューを選ぶ</h1>
        {previous.length > 0 && (
          <Button variant="secondary" onClick={() => setMenu(previous)}>
            前回と同じ
          </Button>
        )}
      </div>

      <Card title="メニュー（押した順）" aside={`${menu.length}種目`}>
        {menu.length === 0 ? (
          <Sub>下の種目を、行う順に押してください。1つだけでも始められます。</Sub>
        ) : (
          <ol className={styles.list} aria-label="メニュー">
            {menu.map((m, i) => (
              <li key={`${m.categoryId}-${m.exerciseId ?? ''}`}>
                <div className={styles.row}>
                  <span>
                    {stepNumber(i)} {menuItemName(m, categories, exercises)}
                    {m.exerciseId && (
                      <span className={styles.label}>（{categoryName(m.categoryId, categories)}）</span>
                    )}
                  </span>
                  <Button
                    variant="text"
                    aria-label={`${menuItemName(m, categories, exercises)}を取り消す`}
                    onClick={() => setMenu(toggleMenuItem(menu, m))}
                  >
                    <IconX size={20} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        {GROUP_ORDER.map((group) => {
          const groupCategories = categories.filter((c) => c.group === group);
          if (groupCategories.length === 0) return null;
          return (
            <ChipGroup key={group} label={<GroupLabel group={group} />}>
              {groupCategories.map((c) => (
                <Chip
                  key={c.id}
                  variant="view"
                  selected={c.id === shownCategory}
                  onToggle={() => setViewCategory(c.id)}
                >
                  {c.name}
                  {menu.some((m) => m.categoryId === c.id) && ' ●'}
                </Chip>
              ))}
            </ChipGroup>
          );
        })}

        {shownCategory && (
          <div style={{ marginTop: 16 }}>
            <h2>{categoryName(shownCategory, categories)}の種目</h2>
            <ChipGroup>
              {items.map((item) => {
                const index = menu.findIndex((m) => isSameMenuItem(m, item));
                const favorite = exercises.find((e) => e.id === item.exerciseId)?.favorite;
                return (
                  <Chip
                    key={item.exerciseId ?? 'none'}
                    selected={index >= 0}
                    mark={index >= 0 ? stepNumber(index) : undefined}
                    onToggle={() => setMenu(toggleMenuItem(menu, item))}
                  >
                    {favorite ? '★ ' : ''}
                    {item.exerciseId
                      ? menuItemName(item, categories, exercises)
                      : '（種目なし）'}
                  </Chip>
                );
              })}
            </ChipGroup>
          </div>
        )}
      </Card>

      <div className={styles.bottomBar}>
        <ErrorList errors={errors} />
        <Button
          variant="start"
          block
          disabled={menu.length === 0 || starting}
          onClick={() => void start()}
        >
          <IconPlayerPlay size={28} aria-hidden="true" />
          スタート{menu.length > 0 && `（${menu.length}種目）`}
        </Button>
      </div>
    </div>
  );
}
