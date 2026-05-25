import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeGoals from './pages/employee/EmployeeGoals';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerTeam from './pages/manager/ManagerTeam';
import ManagerGoalReview from './pages/manager/ManagerGoalReview';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCycleConfig from './pages/admin/AdminCycleConfig';
import AdminAuditLog from './pages/admin/AdminAuditLog';
import AdminReports from './pages/admin/AdminReports';
import Layout from './components/Layout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } }
});

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-fullscreen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return children;
};

const RoleRouter = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'manager') return <Navigate to="/manager" />;
  return <Navigate to="/employee" />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif' } }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<RoleRouter />} />

            {/* Employee Routes */}
            <Route path="/employee" element={
              <ProtectedRoute allowedRoles={['employee']}>
                <Layout><EmployeeDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/employee/goals" element={
              <ProtectedRoute allowedRoles={['employee']}>
                <Layout><EmployeeGoals /></Layout>
              </ProtectedRoute>
            } />

            {/* Manager Routes */}
            <Route path="/manager" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <Layout><ManagerDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/manager/team" element={
              <ProtectedRoute allowedRoles={['manager']}>
                <Layout><ManagerTeam /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/manager/goals/:sheetId" element={
              <ProtectedRoute allowedRoles={['manager', 'admin']}>
                <Layout><ManagerGoalReview /></Layout>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout><AdminDashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout><AdminUsers /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/cycle" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout><AdminCycleConfig /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/audit" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout><AdminAuditLog /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout><AdminReports /></Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}