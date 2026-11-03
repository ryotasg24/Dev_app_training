/**
 * 端末の状態の判定（基本設計書 5.9）。
 */

/**
 * ホーム画面から起動しているか（アドレスバーなしの全画面で動いているか）。
 * iPhoneのSafariは navigator.standalone、それ以外は display-mode で判定する。
 */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/**
 * iPhone・iPadのSafariか。iPadOSはPCと同じ表示を名乗るため、タッチ操作の有無も見る。
 */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** 一意のID（UUID）を作る（F-DATA-08） */
export function newId(): string {
  return crypto.randomUUID();
}
