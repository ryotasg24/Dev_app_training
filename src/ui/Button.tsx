/**
 * ボタン（デザイン仕様書 6章）。
 * 押せる部品は必ず button / a 要素で作る（キーボードで操作できるようにするため）。
 */
import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'start' | 'secondary' | 'danger' | 'text';

/** ボタンと同じ見た目のクラス名を作る（リンクをボタンの見た目にするときにも使う） */
function buttonClassName(variant: ButtonVariant, block = false, extra?: string): string {
  return [styles.button, styles[variant], block ? styles.block : undefined, extra]
    .filter(Boolean)
    .join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** 横幅いっぱいにする */
  block?: boolean;
}

export function Button({
  variant = 'primary',
  block = false,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, block, className)} {...rest} />;
}

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  block?: boolean;
}

/** ボタンの見た目のリンク（画面の移動に使う） */
export function LinkButton({ variant = 'secondary', block = false, className, ...rest }: LinkButtonProps) {
  return <Link className={buttonClassName(variant, block, className)} {...rest} />;
}
