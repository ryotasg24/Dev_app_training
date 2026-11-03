/**
 * カテゴリの区分の見出し（アイコン＋名前。デザイン仕様書 9章）。
 */
import { IconBarbell, IconRun, IconStretching } from '@tabler/icons-react';
import type { CategoryGroup } from '../../domain/types';

const LABELS: Record<CategoryGroup, string> = {
  strength: '筋トレ系',
  care: 'ケア系',
  cardio: '有酸素',
};

export function GroupLabel({ group }: { group: CategoryGroup }) {
  const Icon = group === 'strength' ? IconBarbell : group === 'care' ? IconStretching : IconRun;
  return (
    <>
      <Icon size={18} aria-hidden="true" />
      {LABELS[group]}
    </>
  );
}
