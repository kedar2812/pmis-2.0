// User and Authentication Interfaces
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatar?: string;
}

export type UserRole =
  | 'SPV_Official'
  | 'PMNC_Team'
  | 'EPC_Contractor'
  | 'Consultant_Design'
  | 'Govt_Department'
  | 'NICDC_HQ';

export interface RolePermission {
  role: UserRole;
  accessLevel: 'Admin' | 'Manager' | 'Contributor' | 'Limited' | 'Read_Only' | 'Read_Only_High_Level';
  permissions: string[];
  dashboardView: string;
}

// Project Interfaces
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Planning' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled';
  startDate: string;
  endDate: string;
  progress: number; // 0-100
  budget: number;
  spent: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  manager: string;
  stakeholders: string[];
  category: string;
}

// KPI Interfaces
export interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: 'Schedule' | 'Cost' | 'Quality' | 'Risk' | 'Resource';
  lastUpdated: string;
}

// Document Interfaces (EDMS)
export interface Document {
  id: string;
  name: string;
  type: 'Drawing' | 'Report' | 'Contract' | 'Approval' | 'Other';
  category: string;
  version: string;
  uploadedBy: string;
  uploadedDate: string;
  fileSize: number;
  status: 'Draft' | 'Under Review' | 'Approved' | 'Rejected';
  projectId: string;
  downloadUrl?: string;
  tags: string[];
}

// Schedule Interfaces (Gantt)
export interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies: string[];
  assignedTo: string;
  projectId: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Delayed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
}

// Budget Interfaces
export interface Budget {
  id: string;
  projectId: string;
  category: string;
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  fiscalYear: string;
  lastUpdated: string;
}

export interface CostForecast {
  id: string;
  projectId: string;
  month: string;
  forecasted: number;
  actual: number;
  variance: number;
}

// Risk Interfaces
export interface Risk {
  id: string;
  title: string;
  description: string;
  category: 'Technical' | 'Financial' | 'Schedule' | 'Resource' | 'External' | 'Compliance';
  probability: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Identified' | 'Assessed' | 'Mitigated' | 'Closed';
  owner: string;
  mitigationPlan: string;
  identifiedDate: string;
  projectId: string;
}

// Notification Interfaces
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Info' | 'Warning' | 'Error' | 'Success';
  timestamp: string;
  read: boolean;
  userId: string;
  link?: string;
}

// GIS Interfaces
export interface GISFeature {
  id: string;
  type: 'Project Site' | 'Utility' | 'Parcel' | 'Infrastructure';
  geometry: {
    type: 'Point' | 'Polygon' | 'LineString';
    coordinates: number[][];
  };
  properties: {
    name: string;
    description: string;
    projectId?: string;
  };
}


