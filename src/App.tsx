import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from "react";
import { useAuth } from '@/lib/auth-context';
const AppLayout = lazy(() => import('@/components/layout/AppLayout').then((m) => ({ default: m.AppLayout })));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SubmitReportPage = lazy(() => import('@/pages/SubmitReportPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const AdsAnalysisPage = lazy(() => import('@/pages/AdsAnalysisPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const MyReportsPage = lazy(() => import('@/pages/MyReportsPage'));
const InsightsPage = lazy(() => import('@/pages/InsightsPage'));
const DealsPage = lazy(() => import('@/pages/DealsPage'));
const MyDealsPage = lazy(() => import('@/pages/MyDealsPage'));
const AccessPage = lazy(() => import('@/pages/AccessPage'));
const DealsAnalyticsPage = lazy(() => import('@/pages/DealsAnalyticsPage'));
const AdsManagementPage = lazy(() => import('@/pages/AdsManagementPage'));
const AdInsightsPage = lazy(() => import('@/pages/AdInsightsPage'));

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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
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
      <Route path="/metrics" element={<Navigate to="/dashboard" replace />} />
      <Route path="/insights" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><InsightsPage /></AppLayout></ProtectedRoute>} />
      
      {/* Superadmin Only Routes */}
      <Route path="/settings" element={<ProtectedRoute allowedRoles={["superadmin"]}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />

      {/* Access Management (admin + superadmin) */}
      <Route path="/access" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><AccessPage /></AppLayout></ProtectedRoute>} />
      <Route path="/deals-analytics" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><DealsAnalyticsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/ads-management" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><AdsManagementPage /></AppLayout></ProtectedRoute>} />
      <Route path="/ads-management/:id" element={<ProtectedRoute allowedRoles={["admin", "superadmin"]}><AppLayout><AdInsightsPage /></AppLayout></ProtectedRoute>} />

      {/* Sales Routes */}
      <Route path="/submit-report" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><SubmitReportPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-reports" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><MyReportsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/deals" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><DealsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/my-deals" element={<ProtectedRoute allowedRoles={["sales"]}><AppLayout><MyDealsPage /></AppLayout></ProtectedRoute>} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
