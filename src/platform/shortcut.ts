/**
 * ショートカットの起動（要件定義書 3.7、基本設計書 6.3、6.5）。
 */

/**
 * ショートカットを起動する。
 * ホーム画面から開いたアプリは、ショートカットから自動では呼び戻せないため、x-success は使わない。
 * アプリが前面に戻ったら（visibilitychange）、記録できたかを利用者にたずねること。
 *
 * @param url domain/health.ts の buildShortcutUrl で作ったURL
 */
export function openShortcut(url: string): void {
  window.location.href = url;
}

/**
 * アプリが前面に戻ったときに、一度だけ処理を呼ぶ。
 * @returns 登録を取り消す関数
 */
export function onceReturnedToApp(callback: () => void): () => void {
  const handler = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', handler);
    callback();
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
