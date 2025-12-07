import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ToastProvider } from './components/ui/Toast';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import EDMS from './pages/EDMS';
import Scheduling from './pages/Scheduling';
import CostManagement from './pages/CostManagement';
import RiskManagement from './pages/RiskManagement';
import GIS from './pages/GIS';
import BIM from './pages/BIM';
import WorkflowConfig from './pages/WorkflowConfig';
import Reimbursement from './pages/Reimbursement';
import RoleManager from './pages/RoleManager';

const ProtectedRoute = ({ children }) => {
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
        <Route path="edms" element={<EDMS />} />
        <Route path="scheduling" element={<Scheduling />} />
        <Route path="cost" element={<CostManagement />} />
        <Route path="risk" element={<RiskManagement />} />
        <Route path="gis" element={<GIS />} />
        <Route path="bim" element={<BIM />} />
        <Route path="workflow" element={<WorkflowConfig />} />
        <Route path="reimbursement" element={<Reimbursement />} />
        <Route path="admin/roles" element={<RoleManager />} />
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

