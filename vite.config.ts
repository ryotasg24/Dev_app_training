/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pagesでは、URLにリポジトリ名が入る（基本設計書 7.1）。
// リポジトリ名を変えるとアプリのURLが変わるため、この値も変えないこと。
const BASE_PATH = '/Dev_app_training/';

/** アプリの版。設定画面に、ビルドした日時（UTC）と合わせて表示する */
const APP_VERSION = '0.1.0';

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(
      `${APP_VERSION}（${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC）`,
    ),
  },
  plugins: [
    react(),
    VitePWA({
      // 利用者が［更新する］を押してから新しい版に切り替える（基本設計書 7.3）
      registerType: 'prompt',
      // アイコンは Tabler Icons のバーベル（MIT。デザイン仕様書 9章）から作った画像
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'third-party-licenses.txt'],
      manifest: {
        id: BASE_PATH,
        name: '筋トレ記録',
        short_name: '筋トレ記録',
        lang: 'ja',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        // 画面の背景色（デザイン仕様書 3.1 の --color-bg）に合わせる
        theme_color: '#F5F6F8',
        background_color: '#F5F6F8',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // 端末によって丸などに切り取られても、絵が欠けないように余白を大きく取ったもの
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // ビルドしたファイルをすべて事前にキャッシュし、オフラインで起動できるようにする（F-DATA-06）
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,txt}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 日付の区切りを確かめるため、テストは日本時間で動かす
    env: { TZ: 'Asia/Tokyo' },
  },
});
