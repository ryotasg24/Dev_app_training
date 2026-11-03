/**
 * チップ：丸い形の切り替えボタン（デザイン仕様書 6章）。カテゴリ・種目の選択に使う。
 */
import type { ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Chip({ selected, onToggle, children }: ChipProps) {
  return (
    <button
      type="button"
      className={selected ? `${styles.chip} ${styles.selected}` : styles.chip}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {selected && <span aria-hidden="true">✓ </span>}
      {children}
    </button>
  );
}

/** チップを折り返して並べる */
export function ChipGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <div className={styles.group}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.chips}>{children}</div>
    </div>
  );
}
