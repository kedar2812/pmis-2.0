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
  landAcquisitionStatus?: number; // 0-100% progress for land acquisition
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

// Document Interfaces (EDMS) - Enhanced for Advanced EDMS Module
export type DocumentType = 'Drawing' | 'Report' | 'Contract' | 'Bill' | 'SitePhoto' | 'Video' | 'Other';
export type DocumentStatus = 'Draft' | 'Pending_Approval' | 'Under Review' | 'Approved' | 'Rejected';
export type MimeType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'application/dwg' | 'application/xlsx' | 'video/mp4' | 'other';
export type DocumentPhase = 'Planning' | 'Design' | 'Execution' | 'Closure';
export type DocumentDiscipline = 'Civil' | 'Electrical' | 'Mechanical' | 'Plumbing' | 'HVAC' | 'General';

// Noting Sheet Entry (Chat-style remarks)
export interface NotingSheetEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole | string;
  remark: string;
  action: 'Comment' | 'Approve' | 'Reject' | 'Request_Revision';
  timestamp: string;
}

// Document Version History
export interface DocumentVersion {
  version: string;
  uploadedBy: string;
  uploadedDate: string;
  fileSize: number;
  changeNotes?: string;
  downloadUrl?: string;
}

// Enhanced Document Interface
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: MimeType;
  category: string;
  version: string;
  
  // Folder Hierarchy (Strict: Project -> Phase -> Discipline -> File)
  projectId: string;
  phase: DocumentPhase;
  discipline: DocumentDiscipline;
  
  // Upload Info
  uploadedBy: {
    userId: string;
    userName: string;
    role: UserRole | string;
  };
  uploadedDate: string;
  fileSize: number;
  
  // Status & Workflow
  status: DocumentStatus;
  requiresApproval: boolean;
  currentApprover?: string;
  
  // Metadata
  tags: string[];
  description?: string;
  siteTimestamp?: string; // Auto-captured for site photos/videos
  downloadUrl?: string;
  thumbnailUrl?: string;
  
  // Noting Sheet (Chat-style approval history)
  notingSheet: NotingSheetEntry[];
  
  // Version Control
  versionHistory: DocumentVersion[];
  isLatestVersion: boolean;
}

// Folder Node for Tree View
export interface FolderNode {
  id: string;
  name: string;
  type: 'project' | 'phase' | 'discipline' | 'file';
  children?: FolderNode[];
  documentCount?: number;
  projectId?: string;
  phase?: DocumentPhase;
  discipline?: DocumentDiscipline;
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
  source?: 'Central' | 'State' | 'Loan'; // Budget source
  utilization?: 'Infra' | 'Tech' | 'Land'; // Budget utilization category
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

// Workflow Interfaces
export interface WorkflowStep {
  step: number;
  role: UserRole | string;
  action: 'Verify' | 'Approve' | 'Review' | 'Sign' | 'Submit' | 'Reject';
  required: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  type: 'RFQ' | 'Contract' | 'Bill' | 'Payment' | 'Document' | 'Custom';
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WorkflowRemark {
  id: string;
  timestamp: string;
  role: string;
  remark: string;
  step: number;
}

export interface DocumentApproval {
  documentId: string;
  workflowId: string;
  currentStep: number;
  status: 'Pending' | 'In Progress' | 'Approved' | 'Rejected';
  remarks: WorkflowRemark[];
  assignedTo: string;
}


