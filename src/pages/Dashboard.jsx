import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMockData } from '@/hooks/useMockData';
import projectService from '@/api/services/projectService';
import SPVDashboard from '@/components/dashboard/SPVDashboard';
import PMNCDashboard from '@/components/dashboard/PMNCDashboard';
import EPCDashboard from '@/components/dashboard/EPCDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import GovtDashboard from '@/components/dashboard/GovtDashboard';
import NICDCDashboard from '@/components/dashboard/NICDCDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const { kpis, risks, tasks } = useMockData(); // Kept other mocks for now
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectService.getAllProjects();
        setProjects(data);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // If no user is logged in (should be handled by ProtectedRoute, but safe check)
  if (!user) return null;

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading Dashboard...</div>;
  }

  // Role-Based Render Logic
  const renderDashboard = () => {
    switch (user.role) {
      case 'SPV_Official':
        return <SPVDashboard projects={projects} kpis={kpis} risks={risks} />;
      case 'PMNC_Team':
        return <PMNCDashboard projects={projects} tasks={tasks} risks={risks} />;
      case 'EPC_Contractor':
        return <EPCDashboard projects={projects} tasks={tasks} />;
      case 'Consultant_Design':
        return <ConsultantDashboard />;
      case 'Govt_Department':
        return <GovtDashboard projects={projects} kpis={kpis} />;
      case 'NICDC_HQ':
        return <NICDCDashboard projects={projects} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-xl font-bold text-slate-800">Access Denied / Role Unknown</h2>
            <p className="text-slate-500">Please contact the administrator to assign a valid role.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen">
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;





