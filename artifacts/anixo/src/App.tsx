import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// @ts-ignore
import ScrollToTop from "./components/common/ScrollToTop";
// @ts-ignore
import PageLoader from "./components/common/PageLoader";
import { Loader } from "lucide-react";

// Dynamic Imports (Code Splitting)
// @ts-ignore
const Home = lazy(() => import("./pages/Home"));
// @ts-ignore
const Portal = lazy(() => import("./pages/Portal"));
// @ts-ignore
const Browse = lazy(() => import("./pages/Browse"));
// @ts-ignore
const Watch = lazy(() => import("./pages/Watch"));
// @ts-ignore
const Character = lazy(() => import("./pages/Character"));
// @ts-ignore
const Staff = lazy(() => import("./pages/Staff"));
// @ts-ignore
const Schedule = lazy(() => import("./pages/Schedule"));
// @ts-ignore
const DMCA = lazy(() => import("./pages/DMCA"));
// @ts-ignore
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
// @ts-ignore
const Watchlist = lazy(() => import("./pages/Watchlist"));
// @ts-ignore
const Profile = lazy(() => import("./pages/Profile"));
// @ts-ignore
const Settings = lazy(() => import("./pages/Settings"));
// @ts-ignore
const ContinueWatching = lazy(() => import("./pages/ContinueWatching"));
// @ts-ignore
const Notifications = lazy(() => import("./pages/Notifications"));
// @ts-ignore
const ImportExport = lazy(() => import("./pages/ImportExport"));
// @ts-ignore
const Stats = lazy(() => import("./pages/Stats"));
// @ts-ignore
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
// @ts-ignore
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
// @ts-ignore
const NotFound = lazy(() => import("./pages/NotFound"));

const SuspenseLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
    <Loader className="w-8 h-8 animate-spin" style={{ color: '#dc2626' }} />
  </div>
);

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <PageLoader />
      <Suspense fallback={<SuspenseLoader />}>
        <Routes>
          <Route path="/" element={<Portal />} />
          <Route path="/home" element={<Home />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/character/:id" element={<Character />} />
          <Route path="/staff/:id" element={<Staff />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/dmca" element={<DMCA />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/watching" element={<ContinueWatching />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/import" element={<ImportExport />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
