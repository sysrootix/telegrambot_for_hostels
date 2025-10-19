import { Navigate, Route, Routes } from 'react-router-dom';

import { Layout } from '@/components/Layout';
import { Loader } from '@/components/Loader';
import { Navigation } from '@/components/Navigation';
import { useSession } from '@/providers/SessionProvider';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { ProfilePage } from '@/pages/ProfilePage';

function AdminRoute({ children }: { children: JSX.Element }) {
  const { session } = useSession();

  if (!session?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { initData, session, isLoading, error } = useSession();

  if (!initData) {
    return <Loader label="Откройте бота из Telegram для загрузки приложения." />;
  }

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <Loader label="Не удалось загрузить данные. Попробуйте перезапустить бота." />;
  }

  return (
    <Layout>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Hostel Helper</h1>
        <p className="text-sm text-tgHint">
          {session?.telegramUser?.first_name ?? session?.user.firstName ?? 'Гость'},{' '}
          добро пожаловать!
        </p>
      </header>

      <Navigation />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<ProfilePage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Layout>
  );
}
