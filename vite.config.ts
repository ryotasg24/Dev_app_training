/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pagesでは、URLにリポジトリ名が入る（基本設計書 7.1）。
// リポジトリ名を変えるとアプリのURLが変わるため、この値も変えないこと。
const BASE_PATH = '/Dev_app_training/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      // 利用者が［更新する］を押してから新しい版に切り替える（基本設計書 7.3）
      registerType: 'prompt',
      // アイコンはデザイン仕様書の確定後に public/ に追加する
      includeAssets: [],
      manifest: {
        id: BASE_PATH,
        name: '筋トレ記録',
        short_name: '筋トレ記録',
        lang: 'ja',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        // 色はデザイン仕様書の案。確定したら合わせて変更する
        theme_color: '#111827',
        background_color: '#111827',
        icons: [],
      },
      workbox: {
        // ビルドしたファイルをすべて事前にキャッシュし、オフラインで起動できるようにする（F-DATA-06）
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
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
