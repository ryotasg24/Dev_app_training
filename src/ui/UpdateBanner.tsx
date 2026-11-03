/**
 * 新しい版を知らせる表示（非機能・更新、基本設計書 7.3）。
 * 利用者が［更新する］を押したら、新しいService Workerに切り替えて読み込み直す。
 */
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div role="status">
      新しい版があります
      <button type="button" onClick={() => void updateServiceWorker(true)}>
        更新する
      </button>
    </div>
  );
}
