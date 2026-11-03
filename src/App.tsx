/**
 * 画面の切り替えの定義（基本設計書 3.1）。
 * GitHub Pagesで再読み込みしても404にならないよう、ハッシュ方式（#/calendar）を使う。
 *
 * 各画面は、デザイン仕様書の確定後に作る。今は仮の画面を表示する。
 */
import { HashRouter, NavLink, Route, Routes } from 'react-router';
import { UpdateBanner } from './ui/UpdateBanner';
import styles from './App.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'ホーム' },
  { to: '/calendar', label: 'カレンダー' },
  { to: '/stats', label: 'グラフ' },
  { to: '/settings', label: '設定' },
];

const ROUTES = [
  { path: '/', title: 'ホーム' },
  { path: '/session/active', title: '計測中' },
  { path: '/session/new', title: '手入力で記録' },
  { path: '/session/:id', title: 'セッション詳細' },
  { path: '/session/:id/done', title: '記録の確認' },
  { path: '/session/:id/edit', title: 'セッションの編集' },
  { path: '/calendar', title: 'カレンダー' },
  { path: '/stats', title: 'グラフ' },
  { path: '/settings', title: '設定・プロフィール' },
  { path: '/settings/categories', title: 'カテゴリの詳細設定' },
  { path: '/settings/exercises', title: '種目管理' },
  { path: '/settings/shortcut', title: 'ショートカットの導入手順' },
  { path: '/welcome', title: '初回案内' },
];

export function App() {
  return (
    <HashRouter>
      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="メインメニュー">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? styles.navActive : styles.navItem)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className={styles.main}>
          <UpdateBanner />
          <Routes>
            {ROUTES.map((route) => (
              <Route key={route.path} path={route.path} element={<Placeholder title={route.title} />} />
            ))}
            <Route path="*" element={<Placeholder title="ページが見つかりません" />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>この画面は準備中です。</p>
    </section>
  );
}
