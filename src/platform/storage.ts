/**
 * 永続ストレージ（要件定義書 F-DATA-02、基本設計書 7.4）。
 * ブラウザに「容量が足りなくなってもデータを消さない」よう要求する。
 */

/** 永続ストレージを要求する。対応していない環境ではfalse */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

/** すでに永続ストレージになっているか */
export async function isStoragePersisted(): Promise<boolean> {
  if (!navigator.storage?.persisted) return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}
