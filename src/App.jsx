import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SidebarProvider } from './contexts/SidebarContext';


import { ToastProvider } from './components/ui/Toast';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';

import Scheduling from './pages/Scheduling';
import CostManagement from './pages/CostManagement';
import RiskManagement from './pages/RiskManagement';
import GIS from './pages/GIS';
import BIM from './pages/BIM';
import WorkflowConfig from './pages/WorkflowConfig';
import Procurement from './pages/Procurement';
import Reimbursement from './pages/Reimbursement';
import RoleManager from './pages/RoleManager';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import RABilling from './pages/RABilling';
import AuditLogs from './pages/admin/AuditLogs';
import UserManagement from './pages/UserManagement';

import EDMS from './pages/EDMS';
import DocumentViewerPage from './pages/DocumentViewerPage';
import Communications from './pages/Communications';
import Approvals from './pages/Approvals';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        <Route path="procurement" element={<Procurement />} />
        <Route path="ra-billing" element={<RABilling />} />
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
        <Route path="communications" element={<Communications />} />
        <Route path="approvals" element={<Approvals />} />
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
            <AppRoutes />
          </SidebarProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;

