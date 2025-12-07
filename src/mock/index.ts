// Mock data loader
import projectsData from './data/projects.json';
import kpisData from './data/kpis.json';
import documentsData from './data/documents.json';
import tasksData from './data/tasks.json';
import budgetsData from './data/budgets.json';
import costForecastsData from './data/costForecasts.json';
import risksData from './data/risks.json';
import notificationsData from './data/notifications.json';
import gisFeaturesData from './data/gisFeatures.json';
import usersData from './data/users.json';
import type {
  Project,
  KPI,
  Document,
  Task,
  Budget,
  CostForecast,
  Risk,
  Notification,
  GISFeature,
  User,
  UserRole,
  RolePermission,
} from './interfaces';

// Export all data
export const projects: Project[] = projectsData as Project[];
export const kpis: KPI[] = kpisData as KPI[];
export const documents: Document[] = documentsData as Document[];
export const tasks: Task[] = tasksData as Task[];
export const budgets: Budget[] = budgetsData as Budget[];
export const costForecasts: CostForecast[] = costForecastsData as CostForecast[];
export const risks: Risk[] = risksData as Risk[];
export const notifications: Notification[] = notificationsData as Notification[];
export const gisFeatures: GISFeature[] = gisFeaturesData as GISFeature[];
export const users: User[] = usersData as User[];

// Role permissions configuration
export const rolePermissions: Record<UserRole, RolePermission> = {
  SPV_Official: {
    role: 'SPV_Official',
    accessLevel: 'Admin',
    permissions: [
      'dashboard:view',
      'dashboard:edit',
      'edms:view',
      'edms:upload',
      'edms:approve',
      'scheduling:view',
      'scheduling:edit',
      'cost:view',
      'cost:edit',
      'risk:view',
      'risk:edit',
      'gis:view',
      'bim:view',
      'users:manage',
    ],
    dashboardView: 'Executive summary, financial oversight, master controls',
  },
  PMNC_Team: {
    role: 'PMNC_Team',
    accessLevel: 'Manager',
    permissions: [
      'dashboard:view',
      'dashboard:edit',
      'edms:view',
      'edms:upload',
      'edms:approve',
      'scheduling:view',
      'scheduling:edit',
      'cost:view',
      'cost:edit',
      'risk:view',
      'risk:edit',
      'gis:view',
      'bim:view',
    ],
    dashboardView: 'Detailed project management metrics, risk alerts, project timeline deviations',
  },
  EPC_Contractor: {
    role: 'EPC_Contractor',
    accessLevel: 'Contributor',
    permissions: [
      'dashboard:view',
      'edms:view',
      'edms:upload',
      'scheduling:view',
      'scheduling:edit',
      'cost:view',
      'cost:input',
      'gis:view',
    ],
    dashboardView: 'Task lists, upload portals, specific schedule segments',
  },
  Consultant_Design: {
    role: 'Consultant_Design',
    accessLevel: 'Limited',
    permissions: ['edms:view', 'edms:upload', 'bim:view'],
    dashboardView: 'Design repository, model viewer',
  },
  Govt_Department: {
    role: 'Govt_Department',
    accessLevel: 'Read_Only',
    permissions: ['dashboard:view', 'edms:view', 'gis:view'],
    dashboardView: 'High-level status reports, completion percentages',
  },
  NICDC_HQ: {
    role: 'NICDC_HQ',
    accessLevel: 'Read_Only_High_Level',
    permissions: ['dashboard:view', 'gis:view'],
    dashboardView: 'National level integration view, aggregated KPIs',
  },
};

// Helper functions to filter data by user role
export const getAccessibleModules = (role: UserRole): string[] => {
  const permissions = rolePermissions[role].permissions;
  const modules = new Set<string>();

  if (permissions.some((p) => p.startsWith('dashboard'))) modules.add('dashboard');
  if (permissions.some((p) => p.startsWith('edms'))) modules.add('edms');
  if (permissions.some((p) => p.startsWith('scheduling'))) modules.add('scheduling');
  if (permissions.some((p) => p.startsWith('cost'))) modules.add('cost');
  if (permissions.some((p) => p.startsWith('risk'))) modules.add('risk');
  if (permissions.some((p) => p.startsWith('gis'))) modules.add('gis');
  if (permissions.some((p) => p.startsWith('bim'))) modules.add('bim');

  return Array.from(modules);
};

export const hasPermission = (role: UserRole, permission: string): boolean => {
  return rolePermissions[role].permissions.includes(permission);
};

// Export types
export type {
  Project,
  KPI,
  Document,
  Task,
  Budget,
  CostForecast,
  Risk,
  Notification,
  GISFeature,
  User,
  UserRole,
  RolePermission,
};


