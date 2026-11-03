/**
 * チップ：丸い形の切り替えボタン（デザイン仕様書 6章）。カテゴリ・種目の選択に使う。
 */
import type { ReactNode } from 'react';
import styles from './Chip.module.css';

interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  /**
   * select：選択（選ぶと塗りつぶし＋チェックの印）
   * view：表示の切り替え（選ぶと太い枠。選択とは区別する。デザイン仕様書 7.3）
   */
  variant?: 'select' | 'view';
  /** チェックの印の代わりに出す印（メニューの番号など） */
  mark?: string;
}

export function Chip({ selected, onToggle, children, variant = 'select', mark }: ChipProps) {
  const selectedClass = variant === 'view' ? styles.current : styles.selected;
  return (
    <button
      type="button"
      className={selected ? `${styles.chip} ${selectedClass}` : styles.chip}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {selected && variant === 'select' && <span aria-hidden="true">{mark ?? '✓'} </span>}
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
