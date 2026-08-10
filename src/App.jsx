import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import ScrollToTop from "./components/common/ScrollToTop";
import PageLoader from "./components/common/PageLoader";
import AdLoader from "./components/common/AdLoader";
import ServerCostNotice from "./components/common/ServerCostNotice";
// import W2GNoticeBanner from "./components/common/W2GNoticeBanner";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmationProvider } from "./context/ConfirmationContext";
import { initSecurity } from "./utils/security";
// Eagerly loaded pages (critical path — must render instantly)
import Portal from "./pages/Portal";
import Home from "./pages/Home";
import GlobalHoverManager from "./components/common/GlobalHoverManager";

// Dynamic Imports (Code Splitting)
const Browse = lazy(() => import("./pages/Browse"));
const Watch = lazy(() => import("./pages/Watch"));
const Character = lazy(() => import("./pages/Character"));
const Staff = lazy(() => import("./pages/Staff"));

const DMCA = lazy(() => import("./pages/DMCA"));
const NSFW = lazy(() => import("./pages/NSFW"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Stories = lazy(() => import("./pages/Stories"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const ContinueWatching = lazy(() => import("./pages/ContinueWatching"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const Stats = lazy(() => import("./pages/Stats"));
const Admin = lazy(() => import("./pages/Admin"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ChatRoom = lazy(() => import("./pages/ChatRoom"));
const Community = lazy(() => import("./pages/Community"));
const CommunityPostDetail = lazy(() => import("./pages/CommunityPostDetail"));
const Watch2GetherLobby = lazy(() => import("./pages/Watch2GetherLobby"));
const NotFound = lazy(() => import("./pages/NotFound"));

import { Loader } from "lucide-react";

const SuspenseLoader = () => (
  <div className="min-h-screen bg-[#0B0B0E] flex items-center justify-center">
    <Loader className="w-8 h-8 text-discord-600 animate-spin" />
  </div>
);

const ErrorFallback = ({ error }) => {
  const { t } = useTranslation();
  
  // Catch dynamic import chunk failures in Vite
  const isChunkError = error.name === 'ChunkLoadError' ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('importing a dynamically imported module');
    
  const needsReload = isChunkError && !sessionStorage.getItem('chunk_load_retried');

  useEffect(() => {
    if (needsReload) {
      sessionStorage.setItem('chunk_load_retried', 'true');
      // Force cache bypass safely by using the URL object
      const url = new URL(window.location.href);
      url.searchParams.set('t', Date.now().toString());
      window.location.href = url.toString();
    }
  }, [needsReload]);

  if (needsReload) {
    return <SuspenseLoader />;
  }

  return (
    <div className="min-h-screen bg-[#0B0B0E] flex flex-col items-center justify-center text-white p-6 text-center">
      <h2 className="text-xl font-bold text-discord-400 mb-2">{t('app.somethingWentWrong')}</h2>
      <p className="text-white/30 mb-6 max-w-md text-sm">{error.message}</p>
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-discord-600 hover:bg-discord-700 transition-colors rounded-md font-bold text-xs uppercase tracking-widest">
        {t('app.reloadPage')}
      </button>
    </div>
  );
};

// Inner component so useLocation works inside Router
function AppRoutes() {
  const location = useLocation();
  const isPortalPage = location.pathname === "/";
  const isNsfwPage = location.pathname.startsWith("/nsfw");
  const isChatPage = location.pathname === "/chat";

  return (
    <>
      <AdLoader />
      {!isPortalPage && !isNsfwPage && !isChatPage && <ServerCostNotice />}
      <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[location.pathname]}>
        <Suspense fallback={<SuspenseLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/nsfw/*" element={<NSFW />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/watch/:id/:slug" element={<Watch />} />
            <Route path="/character/:id" element={<Character />} />
            <Route path="/staff/:id" element={<Staff />} />

            <Route path="/dmca" element={<DMCA />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:profileId" element={<PublicProfile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/watching" element={<ContinueWatching />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/import" element={<ImportExport />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/chat" element={<ChatRoom />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/post/:postId" element={<CommunityPostDetail />} />
            <Route path="/watch2gether" element={<Watch2GetherLobby />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

export default function App() {
  useEffect(() => {
    // Master toggle switch for the security shield
    if (import.meta.env.VITE_SECURITY_SHIELD_ENABLED === 'true' || (import.meta.env.PROD && import.meta.env.VITE_SECURITY_SHIELD_ENABLED !== 'false')) {
      initSecurity();
    }
  }, []);

  return (
    <Router>
      <ConfirmationProvider>
        <ToastProvider>
          <ScrollToTop />
          <PageLoader />
          <GlobalHoverManager />
          <AppRoutes />
        </ToastProvider>
      </ConfirmationProvider>
    </Router>
  );
}
