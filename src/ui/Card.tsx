/**
 * カードとお知らせ（デザイン仕様書 6章）。
 */
import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  /** 見出しの右側に置く要素（日付やリンクなど） */
  aside?: ReactNode;
  children: ReactNode;
}

export function Card({ title, aside, children }: CardProps) {
  return (
    <section className={styles.card}>
      {(title || aside) && (
        <div className={styles.header}>
          {title && <h2>{title}</h2>}
          {aside && <div className={styles.aside}>{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

interface NoticeProps {
  /** warn：注意（終了し忘れ・バックアップ）、info：お知らせ（更新・未送信） */
  tone: 'warn' | 'info';
  children: ReactNode;
}

export function Notice({ tone, children }: NoticeProps) {
  return (
    <div role="status" className={`${styles.card} ${styles.notice} ${styles[tone] ?? ''}`}>
      {children}
    </div>
  );
}

/** カードを縦に並べる */
export function Stack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>;
}

/** 補足の文字 */
export function Sub({ children }: { children: ReactNode }) {
  return <p className={styles.sub}>{children}</p>;
}

/** ボタンを横に並べる */
export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}
