import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { CustomersPage } from './pages/CustomersPage';
import { UsersPage } from './pages/UsersPage';
import { TicketsPage } from './pages/TicketsPage';
import { AgendaPage } from './pages/AgendaPage';
import { MaterialsPage } from './pages/MaterialsPage';
import { ProfilePage } from './pages/ProfilePage';

export default function App() {
  useEffect(() => {
    document.title = 'Portal do Cliente';
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/materials" element={<MaterialsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* Admin/Gestor Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GESTOR']} />}>
                <Route path="/customers" element={<CustomersPage />} />
              </Route>

              {/* Admin Only Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/users" element={<UsersPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
