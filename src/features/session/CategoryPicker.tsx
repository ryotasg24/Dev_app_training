/**
 * カテゴリと種目の選択（F-REC-02、03、09）。計測中・手入力・編集の画面で共通に使う。
 */
import { IconBarbell, IconStretching } from '@tabler/icons-react';
import type { Category, CategoryId, Exercise, SessionExercise } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Chip, ChipGroup } from '../../ui/Chip';

export interface Selection {
  categoryIds: CategoryId[];
  exercises: SessionExercise[];
}

interface CategoryPickerProps {
  categories: readonly Category[];
  exercises: readonly Exercise[];
  value: Selection;
  onChange: (next: Selection) => void;
  /** 「前回と同じ」で選ぶ内容。前回の記録がなければ null */
  previous: Selection | null;
}

export function CategoryPicker({
  categories,
  exercises,
  value,
  onChange,
  previous,
}: CategoryPickerProps) {
  const selectedExerciseIds = new Set(value.exercises.map((e) => e.exerciseId));

  const toggleCategory = (id: CategoryId) => {
    if (value.categoryIds.includes(id)) {
      // カテゴリを外したら、そのカテゴリの種目も外す
      const removedIds = new Set(exercises.filter((e) => e.categoryId === id).map((e) => e.id));
      onChange({
        categoryIds: value.categoryIds.filter((c) => c !== id),
        exercises: value.exercises.filter((e) => !removedIds.has(e.exerciseId)),
      });
    } else {
      onChange({ ...value, categoryIds: [...value.categoryIds, id] });
    }
  };

  const toggleExercise = (id: string) => {
    onChange({
      ...value,
      exercises: selectedExerciseIds.has(id)
        ? value.exercises.filter((e) => e.exerciseId !== id)
        : [...value.exercises, { exerciseId: id, sets: null }],
    });
  };

  const groups = [
    {
      key: 'strength',
      label: (
        <>
          <IconBarbell size={18} aria-hidden="true" />
          筋トレ系
        </>
      ),
      items: categories.filter((c) => c.group === 'strength'),
    },
    {
      key: 'care',
      label: (
        <>
          <IconStretching size={18} aria-hidden="true" />
          ケア系
        </>
      ),
      items: categories.filter((c) => c.group === 'care'),
    },
  ];

  const selectedCategories = categories.filter((c) => value.categoryIds.includes(c.id));

  return (
    <div>
      {previous && previous.categoryIds.length > 0 && (
        <Button variant="secondary" onClick={() => onChange(previous)}>
          前回と同じ
        </Button>
      )}

      <div style={{ marginTop: 12 }}>
        {groups.map((g) => (
          <ChipGroup key={g.key} label={g.label}>
            {g.items.map((c) => (
              <Chip
                key={c.id}
                selected={value.categoryIds.includes(c.id)}
                onToggle={() => toggleCategory(c.id)}
              >
                {c.name}
              </Chip>
            ))}
          </ChipGroup>
        ))}
      </div>

      {selectedCategories.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h2>種目（任意）</h2>
          {selectedCategories.map((c) => {
            // お気に入りを上に。非表示・削除済みは出さないが、選択済みのものは残す
            const items = exercises
              .filter(
                (e) =>
                  e.categoryId === c.id &&
                  ((e.deleted === 0 && !e.hidden) || selectedExerciseIds.has(e.id)),
              )
              .sort(
                (a, b) => Number(b.favorite) - Number(a.favorite) || a.sortOrder - b.sortOrder,
              );
            return (
              <ChipGroup key={c.id} label={c.name}>
                {items.map((e) => (
                  <Chip
                    key={e.id}
                    selected={selectedExerciseIds.has(e.id)}
                    onToggle={() => toggleExercise(e.id)}
                  >
                    {e.favorite ? '★ ' : ''}
                    {e.name}
                  </Chip>
                ))}
              </ChipGroup>
            );
          })}
        </div>
      )}
    </div>
  );
}
