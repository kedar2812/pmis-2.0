/**
 * Centralized Business Rules and Calculations
 * 
 * This file contains all formulas, rules, and calculation logic.
 * In production, these rules will process real-time data from APIs/databases.
 * 
 * All calculations are pure functions that can be easily tested and replaced.
 */

// ============================================================================
// KPI CALCULATION RULES
// ============================================================================

/**
 * Calculate Schedule Performance Index (SPI)
 * Formula: SPI = Earned Value / Planned Value
 * Rule: SPI > 1 = Ahead of schedule, SPI < 1 = Behind schedule
 */
export const calculateSPI = (earnedValue, plannedValue) => {
  if (plannedValue === 0) return 1;
  return earnedValue / plannedValue;
};

/**
 * Calculate Cost Performance Index (CPI)
 * Formula: CPI = Earned Value / Actual Cost
 * Rule: CPI > 1 = Under budget, CPI < 1 = Over budget
 */
export const calculateCPI = (earnedValue, actualCost) => {
  if (actualCost === 0) return 1;
  return earnedValue / actualCost;
};

/**
 * Calculate Cost Variation
 * Formula: CV = Budget - Actual Spent
 * Rule: Positive = Under budget, Negative = Over budget
 */
export const calculateCostVariation = (budget, spent) => {
  return budget - spent;
};

/**
 * Calculate Cost Variation Percentage
 * Formula: CV% = ((Budget - Spent) / Budget) * 100
 */
export const calculateCostVariationPercentage = (budget, spent) => {
  if (budget === 0) return 0;
  return ((budget - spent) / budget) * 100;
};

/**
 * Calculate Budget Utilization Rate
 * Formula: Utilization = (Spent / Budget) * 100
 */
export const calculateBudgetUtilization = (budget, spent) => {
  if (budget === 0) return 0;
  return (spent / budget) * 100;
};

/**
 * Calculate Project Progress Percentage
 * Formula: Progress = (Completed Tasks / Total Tasks) * 100
 * Alternative: Progress = (Actual Duration / Planned Duration) * 100
 */
export const calculateProjectProgress = (completedTasks, totalTasks) => {
  if (totalTasks === 0) return 0;
  return (completedTasks / totalTasks) * 100;
};

/**
 * Calculate Risk Score
 * Formula: Risk Score = Probability Score × Impact Score
 * Probability: Low = 1, Medium = 2, High = 3
 * Impact: Low = 1, Medium = 2, High = 3, Critical = 4
 */
export const calculateRiskScore = (probability, impact) => {
  const probabilityScore = probability === 'Low' ? 1 : probability === 'Medium' ? 2 : 3;
  const impactScore = impact === 'Low' ? 1 : impact === 'Medium' ? 2 : impact === 'High' ? 3 : 4;
  return probabilityScore * impactScore;
};

/**
 * Determine Risk Priority
 * Rule: Score 1-3 = Low, 4-6 = Medium, 7-9 = High, 10+ = Critical
 */
export const getRiskPriority = (riskScore) => {
  if (riskScore >= 10) return 'Critical';
  if (riskScore >= 7) return 'High';
  if (riskScore >= 4) return 'Medium';
  return 'Low';
};

// ============================================================================
// BUDGET CALCULATION RULES
// ============================================================================

/**
 * Calculate Remaining Budget
 * Formula: Remaining = Allocated - Spent - Committed
 */
export const calculateRemainingBudget = (allocated, spent, committed) => {
  return Math.max(0, allocated - spent - committed);
};

/**
 * Calculate Budget Variance
 * Formula: Variance = Allocated - (Spent + Committed)
 */
export const calculateBudgetVariance = (allocated, spent, committed) => {
  return allocated - (spent + committed);
};

/**
 * Calculate Budget Health Status
 * Rule:
 * - Utilization > 90% = Critical (Red)
 * - Utilization > 75% = Warning (Yellow)
 * - Utilization <= 75% = Healthy (Green)
 */
export const getBudgetHealthStatus = (utilization) => {
  if (utilization > 90) return 'critical';
  if (utilization > 75) return 'warning';
  return 'healthy';
};

/**
 * Calculate Land Acquisition Status Color
 * Rule:
 * - > 90% = Green (Complete)
 * - > 50% = Yellow (In Progress)
 * - <= 50% = Red (Delayed)
 */
export const getLandAcquisitionStatusColor = (percentage) => {
  if (percentage > 90) return 'green';
  if (percentage > 50) return 'yellow';
  return 'red';
};

// ============================================================================
// FORECAST CALCULATION RULES
// ============================================================================

/**
 * Calculate Cost Forecast using Trend Analysis
 * Formula: Forecast = Actual + (Trend × Remaining Periods)
 * Trend = Average monthly variance over last 3 months
 */
export const calculateCostForecast = (actualCosts, remainingMonths) => {
  if (actualCosts.length < 2) return actualCosts[actualCosts.length - 1] || 0;

  // Calculate trend (average monthly change)
  const monthlyChanges = [];
  for (let i = 1; i < actualCosts.length; i++) {
    monthlyChanges.push(actualCosts[i] - actualCosts[i - 1]);
  }

  const averageTrend = monthlyChanges.reduce((sum, change) => sum + change, 0) / monthlyChanges.length;
  const lastActual = actualCosts[actualCosts.length - 1];

  return lastActual + averageTrend * remainingMonths;
};

/**
 * Calculate Variance Percentage
 * Formula: Variance% = ((Forecast - Actual) / Actual) * 100
 */
export const calculateForecastVariance = (forecast, actual) => {
  if (actual === 0) return 0;
  return ((forecast - actual) / actual) * 100;
};

// ============================================================================
// PROJECT STATUS RULES
// ============================================================================

/**
 * Determine Project Status based on Progress and Budget
 * Rules:
 * - Progress = 100% → Completed
 * - Progress < 10% → Planning
 * - Budget Utilization > 100% → On Hold
 * - Progress > 0% and < 100% → In Progress
 */
export const determineProjectStatus = (progress, budgetUtilization) => {
  if (progress === 100) return 'Completed';
  if (progress < 10) return 'Planning';
  if (budgetUtilization > 100) return 'On Hold';
  if (progress > 0 && progress < 100) return 'In Progress';
  return 'Planning';
};

/**
 * Calculate Project Health Score
 * Formula: Health = (Progress Score + Budget Score + Risk Score) / 3
 * Each score is normalized to 0-100
 */
export const calculateProjectHealthScore = (progress, budgetUtilization, riskCount, totalRisks) => {
  const progressScore = progress;
  const budgetScore = Math.max(0, 100 - budgetUtilization);
  const riskScore = totalRisks > 0 ? ((totalRisks - riskCount) / totalRisks) * 100 : 100;

  return (progressScore + budgetScore + riskScore) / 3;
};

// ============================================================================
// AGGREGATION RULES
// ============================================================================

/**
 * Aggregate Budget by Source
 * Rule: Sum all budgets grouped by source (Central/State/Loan)
 */
export const aggregateBudgetBySource = (budgets) => {
  return budgets.reduce((acc, budget) => {
    const source = budget.source || 'Unknown';
    acc[source] = (acc[source] || 0) + budget.allocated;
    return acc;
  }, {});
};

/**
 * Aggregate Budget by Utilization Category
 * Rule: Sum all budgets grouped by utilization (Infra/Tech/Land)
 */
export const aggregateBudgetByUtilization = (budgets) => {
  return budgets.reduce((acc, budget) => {
    const utilization = budget.utilization || 'Other';
    acc[utilization] = (acc[utilization] || 0) + budget.allocated;
    return acc;
  }, {});
};

/**
 * Calculate Total Project Budget
 * Rule: Sum all allocated budgets for a project
 */
export const calculateTotalProjectBudget = (budgets) => {
  return budgets.reduce((sum, budget) => sum + budget.allocated, 0);
};

/**
 * Calculate Total Project Spent
 * Rule: Sum all spent amounts for a project
 */
export const calculateTotalProjectSpent = (budgets) => {
  return budgets.reduce((sum, budget) => sum + budget.spent, 0);
};

// ============================================================================
// WORKFLOW RULES
// ============================================================================

/**
 * Determine Next Workflow Step
 * Rule: Move to next step when current step is approved
 */
export const getNextWorkflowStep = (currentStep, totalSteps) => {
  if (currentStep >= totalSteps) return null;
  return currentStep + 1;
};

/**
 * Check if Workflow Step is Required
 * Rule: Step is required if marked as required in workflow definition
 */
export const isWorkflowStepRequired = (stepRequired) => {
  return stepRequired;
};

/**
 * Determine Workflow Status
 * Rules:
 * - All steps approved → Approved
 * - Any step rejected → Rejected
 * - Current step pending → In Progress
 * - No steps started → Pending
 */
export const determineWorkflowStatus = (currentStep, totalSteps, hasRejection) => {
  if (hasRejection) return 'Rejected';
  if (currentStep === 0) return 'Pending';
  if (currentStep >= totalSteps) return 'Approved';
  return 'In Progress';
};

// ============================================================================
// PERMISSION RULES
// ============================================================================

/**
 * Check if User Can Create Project
 * Rule: Only Admin (SPV_Official) and Manager (PMNC_Team) roles can create projects
 */
export const canCreateProject = (userRole) => {
  return userRole === 'SPV_Official' || userRole === 'PMNC_Team';
};

/**
 * Check if User Can Approve Documents
 * Rule: Admin and Manager roles can approve, Contributors can only upload
 */
export const canApproveDocuments = (userRole) => {
  return userRole === 'SPV_Official' || userRole === 'PMNC_Team';
};

/**
 * Check if User Can Delete Documents
 * Rule: Only Admin role can delete documents
 */
export const canDeleteDocuments = (userRole) => {
  return userRole === 'SPV_Official';
};

// ============================================================================
// DATA FILTERING RULES
// ============================================================================

/**
 * Filter Projects by Status
 * Rule: Return projects matching the status filter
 */
export const filterProjectsByStatus = (projects, status) => {
  if (status === 'all') return projects;
  return projects.filter((p) => p.status === status);
};

/**
 * Filter Documents by Project Hierarchy
 * Rule: Documents must belong to a project (no orphaned files)
 */
export const filterDocumentsByProject = (documents, projectId) => {
  if (projectId === 'all') return documents;
  return documents.filter((doc) => doc.projectId === projectId);
};

/**
 * Filter Risks by Project and Status
 * Rule: Return risks matching both project and status filters
 */
export const filterRisks = (risks, projectId, status) => {
  let filtered = risks;
  if (projectId !== 'all') {
    filtered = filtered.filter((r) => r.projectId === projectId);
  }
  if (status !== 'all') {
    filtered = filtered.filter((r) => r.status === status);
  }
  return filtered;
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Validate Budget Allocation
 * Rule: Allocated amount must be positive
 */
export const validateBudgetAllocation = (amount) => {
  return amount > 0;
};

/**
 * Validate Project Dates
 * Rule: End date must be after start date
 */
export const validateProjectDates = (startDate, endDate) => {
  return new Date(endDate) > new Date(startDate);
};

/**
 * Validate Reimbursement Amount
 * Rule: Amount must be positive and within reasonable limits (e.g., < 1 Cr)
 */
export const validateReimbursementAmount = (amount) => {
  const maxAmount = 10000000; // 1 Crore
  return amount > 0 && amount <= maxAmount;
};

// ============================================================================
// EXPORT ALL RULES
// ============================================================================

export const CalculationRules = {
  // KPI Rules
  calculateSPI,
  calculateCPI,
  calculateCostVariation,
  calculateCostVariationPercentage,
  calculateBudgetUtilization,
  calculateProjectProgress,
  calculateRiskScore,
  getRiskPriority,

  // Budget Rules
  calculateRemainingBudget,
  calculateBudgetVariance,
  getBudgetHealthStatus,
  getLandAcquisitionStatusColor,
  aggregateBudgetBySource,
  aggregateBudgetByUtilization,
  calculateTotalProjectBudget,
  calculateTotalProjectSpent,

  // Forecast Rules
  calculateCostForecast,
  calculateForecastVariance,

  // Project Rules
  determineProjectStatus,
  calculateProjectHealthScore,

  // Workflow Rules
  getNextWorkflowStep,
  isWorkflowStepRequired,
  determineWorkflowStatus,

  // Permission Rules
  canCreateProject,
  canApproveDocuments,
  canDeleteDocuments,

  // Filtering Rules
  filterProjectsByStatus,
  filterDocumentsByProject,
  filterRisks,

  // Validation Rules
  validateBudgetAllocation,
  validateProjectDates,
  validateReimbursementAmount,
};

