/**
 * 画面の切り替えの定義（基本設計書 3.1、3.2）。
 * GitHub Pagesで再読み込みしても404にならないよう、ハッシュ方式（#/calendar）を使う。
 */
import { IconCalendar, IconChartBar, IconHome, IconSettings } from '@tabler/icons-react';
import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router';
import { CalendarPage } from './features/calendar/CalendarPage';
import { HomePage } from './features/home/HomePage';
import { useSettings } from './features/hooks';
import { ActiveSessionPage } from './features/session/ActiveSessionPage';
import { MenuPlanPage } from './features/session/MenuPlanPage';
import { SessionFormPage } from './features/session/SessionFormPage';
import { SessionViewPage } from './features/session/SessionViewPage';
import { CategorySettingsPage } from './features/settings/CategorySettingsPage';
import { ExercisesPage } from './features/settings/ExercisesPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ShortcutGuidePage } from './features/settings/ShortcutGuidePage';
import { WelcomePage } from './features/welcome/WelcomePage';
import { UpdateBanner } from './ui/UpdateBanner';
import styles from './App.module.css';

// グラフの画面は Chart.js が大きいため、開いたときに読み込む（非機能・性能）
const StatsPage = lazy(() => import('./features/stats/StatsPage'));

// アイコンは Tabler Icons（MIT。デザイン仕様書 9章）
const NAV_ITEMS = [
  { to: '/', label: 'ホーム', Icon: IconHome },
  { to: '/calendar', label: 'カレンダー', Icon: IconCalendar },
  { to: '/stats', label: 'グラフ', Icon: IconChartBar },
  { to: '/settings', label: '設定', Icon: IconSettings },
];

/** タブとメニューを隠して、操作に集中させる画面（基本設計書 3.1） */
const FOCUS_PATHS = [/^\/session\/(plan|active)$/, /^\/session\/new$/, /^\/session\/[^/]+\/(done|edit)$/, /^\/welcome$/];

export function App() {
  return (
    <HashRouter>
      <Layout />
    </HashRouter>
  );
}

function Layout() {
  const location = useLocation();
  const settings = useSettings();
  const isFocus = FOCUS_PATHS.some((re) => re.test(location.pathname));

  // 設定の読み込みが終わるまでは何も表示しない（初回案内へのちらつきを防ぐ）
  if (!settings) return null;
  if (!settings.onboardingDone && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className={isFocus ? styles.focusLayout : styles.layout}>
      {!isFocus && (
        <nav className={styles.nav} aria-label="メインメニュー">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? styles.navActive : styles.navItem)}
            >
              <item.Icon size={24} stroke={1.75} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <main className={isFocus ? styles.focusMain : styles.main}>
        <UpdateBanner />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/session/plan" element={<MenuPlanPage />} />
            <Route path="/session/active" element={<ActiveSessionPage />} />
            <Route path="/session/new" element={<SessionFormPage mode="new" />} />
            <Route path="/session/:id" element={<SessionViewPage mode="detail" />} />
            <Route path="/session/:id/done" element={<SessionViewPage mode="done" />} />
            <Route path="/session/:id/edit" element={<SessionFormPage mode="edit" />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/categories" element={<CategorySettingsPage />} />
            <Route path="/settings/exercises" element={<ExercisesPage />} />
            <Route path="/settings/shortcut" element={<ShortcutGuidePage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
