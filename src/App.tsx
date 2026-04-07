import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { AppLayout } from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import SubmitReportPage from '@/pages/SubmitReportPage';
import ReportsPage from '@/pages/ReportsPage';
import AdsAnalysisPage from '@/pages/AdsAnalysisPage';
import AdvancedMetricsPage from '@/pages/AdvancedMetricsPage';
import TeamPage from '@/pages/TeamPage';
import SettingsPage from '@/pages/SettingsPage';
import MyReportsPage from '@/pages/MyReportsPage';
import InsightsPage from '@/pages/InsightsPage';
import DealsPage from '@/pages/DealsPage';
import MyDealsPage from '@/pages/MyDealsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("sales" | "admin" | "superadmin")[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle conditional root redirect based on role
  if (location.pathname === '/') {
    if (user.role === 'sales') return <Navigate to="/submit-report" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  // Check role authorization if allowedRoles is provided
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'sales') return <Navigate to="/submit-report" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Login - no layout */}
      <Route path="/login" element={<LoginPage />} />

      {/* Conditional Root Route */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <div /> {/* Will redirect inside ProtectedRoute */}
          </ProtectedRoute>
        } 
      />

      {/* Admin / Superadmin Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/team" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><TeamPage /></AppLayout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/ads" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><AdsAnalysisPage /></AppLayout></ProtectedRoute>} />
      <Route path="/metrics" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><AdvancedMetricsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/insights" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><InsightsPage /></AppLayout></ProtectedRoute>} />
      
      {/* Superadmin Only Routes */}
      <Route path="/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />

      {/* Sales Routes */}
      <Route path="/submit-report" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><SubmitReportPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-reports" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><MyReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/deals" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><DealsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-deals" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><MyDealsPage /></AppLayout></ProtectedRoute>} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
