import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SidebarProvider } from './contexts/SidebarContext';

import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

// Keep auth-related pages as eager imports (needed before login)
import Login from './pages/Login';
import ContractorRegistration from './pages/ContractorRegistration';
import AcceptInvite from './pages/AcceptInvite';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Lazy load all protected pages for code-splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetailsPage = lazy(() => import('./pages/ProjectDetailsPage'));
const RABilling = lazy(() => import('./pages/RABilling'));
const FundManagement = lazy(() => import('./pages/FundManagement'));
const Budgeting = lazy(() => import('./pages/Budgeting'));
const BOQManagement = lazy(() => import('./pages/BOQManagement'));
const Scheduling = lazy(() => import('./pages/Scheduling'));
const CostManagement = lazy(() => import('./pages/CostManagement'));
const RiskManagement = lazy(() => import('./pages/RiskManagement'));
const GIS = lazy(() => import('./pages/GIS'));
const BIM = lazy(() => import('./pages/BIM'));
const WorkflowConfig = lazy(() => import('./pages/WorkflowConfig'));
const EProcurement = lazy(() => import('./pages/EProcurement'));
const Reimbursement = lazy(() => import('./pages/Reimbursement'));
const RoleManager = lazy(() => import('./pages/RoleManager'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const MasterData = lazy(() => import('./pages/admin/MasterData'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const EDMS = lazy(() => import('./pages/EDMS'));
const DocumentViewerPage = lazy(() => import('./pages/DocumentViewerPage'));
const Communications = lazy(() => import('./pages/Communications'));
const Approvals = lazy(() => import('./pages/Approvals'));
const ETPMaster = lazy(() => import('./pages/ETPMaster'));

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<ContractorRegistration />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetailsPage />} />
        <Route path="e-procurement" element={<EProcurement />} />
        <Route path="cost/billing" element={<RABilling />} />
        <Route path="cost/funds" element={<FundManagement />} />
        <Route path="cost/budgeting" element={<Budgeting />} />
        <Route path="cost/boq" element={<BOQManagement />} />
        <Route path="admin/audit-logs" element={<AuditLogs />} />

        <Route path="scheduling" element={<Scheduling />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="edms" element={<EDMS />} />
        <Route path="edms/view/:id" element={<DocumentViewerPage />} />
        <Route path="cost" element={<CostManagement />} />
        <Route path="risk" element={<RiskManagement />} />
        <Route path="gis" element={<GIS />} />
        <Route path="bim" element={<BIM />} />
        <Route path="workflow" element={<WorkflowConfig />} />
        <Route path="reimbursement" element={<Reimbursement />} />
        <Route path="admin/roles" element={<RoleManager />} />
        <Route path="admin/master-data" element={<MasterData />} />
        <Route path="communications" element={<Communications />} />
        <Route path="communications/:threadId" element={<Communications />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="etp-master" element={<ETPMaster />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <SidebarProvider>
            <ToastProvider />
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </SidebarProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

