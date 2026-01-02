import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import projectService from '@/api/services/projectService';
import dashboardService from '@/api/services/dashboardService';
import SPVDashboard from '@/components/dashboard/SPVDashboard';
import PMNCDashboard from '@/components/dashboard/PMNCDashboard';
import EPCDashboard from '@/components/dashboard/EPCDashboard';
import ConsultantDashboard from '@/components/dashboard/ConsultantDashboard';
import GovtDashboard from '@/components/dashboard/GovtDashboard';
import NICDCDashboard from '@/components/dashboard/NICDCDashboard';
import { PageLoading } from '@/components/ui/Loading';

const Dashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch projects and dashboard stats in parallel
        const [projectsData, statsData] = await Promise.all([
          projectService.getAllProjects(),
          dashboardService.getStats()
        ]);

        setProjects(projectsData);
        setDashboardStats(statsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Still set projects if available
        try {
          const projectsData = await projectService.getAllProjects();
          setProjects(projectsData);
        } catch (e) {
          console.error('Failed to fetch projects:', e);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // If no user is logged in (should be handled by ProtectedRoute, but safe check)
  if (!user) return null;

  if (loading) {
    return <PageLoading text="Loading Dashboard..." />;
  }

  // Extract stats for dashboard components
  const kpis = dashboardStats?.kpis || [];
  const risks = []; // Could be expanded later with actual risk data
  const tasks = []; // Could be expanded later with actual task data
  const recentActivity = dashboardStats?.recent_activity || [];

  // Role-Based Render Logic
  const renderDashboard = () => {
    switch (user.role) {
      case 'SPV_Official':
        return <SPVDashboard projects={projects} kpis={kpis} risks={risks} stats={dashboardStats} />;
      case 'PMNC_Team':
        return <PMNCDashboard projects={projects} tasks={tasks} risks={risks} stats={dashboardStats} />;
      case 'EPC_Contractor':
        return <EPCDashboard projects={projects} tasks={tasks} stats={dashboardStats} />;
      case 'Consultant_Design':
        return <ConsultantDashboard stats={dashboardStats} />;
      case 'Govt_Department':
        return <GovtDashboard projects={projects} kpis={kpis} stats={dashboardStats} />;
      case 'NICDC_HQ':
        return <NICDCDashboard projects={projects} stats={dashboardStats} />;
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


