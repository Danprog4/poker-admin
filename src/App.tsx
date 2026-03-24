import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AdminLayout } from "./components/AdminLayout";
import type { AdminSession } from "./lib/types";
import { trpc } from "./lib/trpc";
import { BroadcastDetailsPage } from "./pages/BroadcastDetailsPage";
import { BroadcastNewPage } from "./pages/BroadcastNewPage";
import { BroadcastsPage } from "./pages/BroadcastsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FaqPage } from "./pages/FaqPage";
import { LoginPage } from "./pages/LoginPage";
import { MedalDetailsPage } from "./pages/MedalDetailsPage";
import { MedalsPage } from "./pages/MedalsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { RatingInfoPage } from "./pages/RatingInfoPage";
import { SeriesPage } from "./pages/SeriesPage";
import { StatusDetailsPage } from "./pages/StatusDetailsPage";
import { StatusesPage } from "./pages/StatusesPage";
import { TournamentDetailsPage } from "./pages/TournamentDetailsPage";
import { TournamentNewPage } from "./pages/TournamentNewPage";
import { TournamentsPage } from "./pages/TournamentsPage";
import { UserDetailsPage } from "./pages/UserDetailsPage";
import { UsersPage } from "./pages/UsersPage";
import { useAdminData } from "./providers/useAdminData";

function ProtectedShell() {
  const meQuery = trpc.adminAuth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
  const {
    bootstrapErrorMessage,
    hasBootstrapped,
    isBootstrapping,
    retryBootstrap,
  } = useAdminData();

  if (meQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center p-4 text-sm text-[var(--text-muted)]">
        Проверяем сессию администратора...
      </div>
    );
  }

  if (!meQuery.data || meQuery.isError) {
    return <Navigate to="/login" replace />;
  }

  if (isBootstrapping && !hasBootstrapped) {
    return (
      <div className="grid min-h-screen place-items-center p-4 text-sm text-[var(--text-muted)]">
        Загружаем данные админки...
      </div>
    );
  }

  if (bootstrapErrorMessage && !hasBootstrapped) {
    return (
      <div className="grid min-h-screen place-items-center p-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-5 text-sm shadow-sm">
          <p className="font-semibold text-[var(--text-primary)]">
            Не удалось загрузить данные админки
          </p>
          <p className="mt-2 text-[var(--text-muted)]">{bootstrapErrorMessage}</p>
          <button
            type="button"
            onClick={() => void retryBootstrap()}
            className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-hover)]"
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout admin={meQuery.data as AdminSession}>
      <Outlet />
    </AdminLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/tournaments/new" element={<TournamentNewPage />} />
        <Route path="/tournaments/:id" element={<TournamentDetailsPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:id" element={<UserDetailsPage />} />
        <Route path="/statuses" element={<StatusesPage />} />
        <Route path="/statuses/:id" element={<StatusDetailsPage />} />
        <Route path="/medals" element={<MedalsPage />} />
        <Route path="/medals/:id" element={<MedalDetailsPage />} />
        <Route path="/broadcasts" element={<BroadcastsPage />} />
        <Route path="/broadcasts/new" element={<BroadcastNewPage />} />
        <Route path="/broadcasts/:id" element={<BroadcastDetailsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/rating-info" element={<RatingInfoPage />} />
        <Route path="/faq" element={<FaqPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
