# Business Rules and Formulas Documentation

This document contains all business rules, formulas, and calculation logic used in the PMIS system. These rules will be used to process real-time data in production.

## Table of Contents
1. [KPI Calculations](#kpi-calculations)
2. [Budget Calculations](#budget-calculations)
3. [Forecast Calculations](#forecast-calculations)
4. [Project Status Rules](#project-status-rules)
5. [Workflow Rules](#workflow-rules)
6. [Permission Rules](#permission-rules)
7. [Validation Rules](#validation-rules)

---

## KPI Calculations

### Schedule Performance Index (SPI)
**Formula:** `SPI = Earned Value / Planned Value`
- **Rule:** SPI > 1 = Ahead of schedule, SPI < 1 = Behind schedule
- **Implementation:** `calculateSPI(earnedValue, plannedValue)`

### Cost Performance Index (CPI)
**Formula:** `CPI = Earned Value / Actual Cost`
- **Rule:** CPI > 1 = Under budget, CPI < 1 = Over budget
- **Implementation:** `calculateCPI(earnedValue, actualCost)`

### Cost Variation
**Formula:** `CV = Budget - Actual Spent`
- **Rule:** Positive = Under budget, Negative = Over budget
- **Implementation:** `calculateCostVariation(budget, spent)`

### Cost Variation Percentage
**Formula:** `CV% = ((Budget - Spent) / Budget) * 100`
- **Implementation:** `calculateCostVariationPercentage(budget, spent)`

### Budget Utilization Rate
**Formula:** `Utilization = (Spent / Budget) * 100`
- **Implementation:** `calculateBudgetUtilization(budget, spent)`

### Project Progress
**Formula:** `Progress = (Completed Tasks / Total Tasks) * 100`
- **Alternative:** `Progress = (Actual Duration / Planned Duration) * 100`
- **Implementation:** `calculateProjectProgress(completedTasks, totalTasks)`

### Risk Score
**Formula:** `Risk Score = Probability Score × Impact Score`
- **Probability Scoring:** Low = 1, Medium = 2, High = 3
- **Impact Scoring:** Low = 1, Medium = 2, High = 3, Critical = 4
- **Implementation:** `calculateRiskScore(probability, impact)`

### Risk Priority
**Rule:**
- Score 1-3 = Low Priority
- Score 4-6 = Medium Priority
- Score 7-9 = High Priority
- Score 10+ = Critical Priority
- **Implementation:** `getRiskPriority(riskScore)`

---

## Budget Calculations

### Remaining Budget
**Formula:** `Remaining = Allocated - Spent - Committed`
- **Implementation:** `calculateRemainingBudget(allocated, spent, committed)`

### Budget Variance
**Formula:** `Variance = Allocated - (Spent + Committed)`
- **Implementation:** `calculateBudgetVariance(allocated, spent, committed)`

### Budget Health Status
**Rule:**
- Utilization > 90% = Critical (Red)
- Utilization > 75% = Warning (Yellow)
- Utilization ≤ 75% = Healthy (Green)
- **Implementation:** `getBudgetHealthStatus(utilization)`

### Land Acquisition Status
**Rule:**
- > 90% = Green (Complete)
- > 50% = Yellow (In Progress)
- ≤ 50% = Red (Delayed)
- **Implementation:** `getLandAcquisitionStatusColor(percentage)`

### Budget Aggregation by Source
**Rule:** Sum all budgets grouped by source (Central/State/Loan)
- **Implementation:** `aggregateBudgetBySource(budgets)`

### Budget Aggregation by Utilization
**Rule:** Sum all budgets grouped by utilization (Infra/Tech/Land)
- **Implementation:** `aggregateBudgetByUtilization(budgets)`

---

## Forecast Calculations

### Cost Forecast (Trend Analysis)
**Formula:** `Forecast = Actual + (Trend × Remaining Periods)`
- **Trend Calculation:** Average monthly variance over last 3 months
- **Implementation:** `calculateCostForecast(actualCosts, remainingMonths)`

### Forecast Variance Percentage
**Formula:** `Variance% = ((Forecast - Actual) / Actual) * 100`
- **Implementation:** `calculateForecastVariance(forecast, actual)`

---

## Project Status Rules

### Project Status Determination
**Rule:**
- Progress = 100% → Completed
- Progress < 10% → Planning
- Budget Utilization > 100% → On Hold
- Progress > 0% and < 100% → In Progress
- **Implementation:** `determineProjectStatus(progress, budgetUtilization)`

### Project Health Score
**Formula:** `Health = (Progress Score + Budget Score + Risk Score) / 3`
- Each score is normalized to 0-100
- **Implementation:** `calculateProjectHealthScore(progress, budgetUtilization, riskCount, totalRisks)`

---

## Workflow Rules

### Next Workflow Step
**Rule:** Move to next step when current step is approved
- **Implementation:** `getNextWorkflowStep(currentStep, totalSteps)`

### Workflow Step Requirement
**Rule:** Step is required if marked as required in workflow definition
- **Implementation:** `isWorkflowStepRequired(stepRequired)`

### Workflow Status Determination
**Rule:**
- All steps approved → Approved
- Any step rejected → Rejected
- Current step pending → In Progress
- No steps started → Pending
- **Implementation:** `determineWorkflowStatus(currentStep, totalSteps, hasRejection)`

---

## Permission Rules

### Project Creation Permission
**Rule:** Only Admin (SPV_Official) and Manager (PMNC_Team) roles can create projects
- **Implementation:** `canCreateProject(userRole)`

### Document Approval Permission
**Rule:** Admin and Manager roles can approve, Contributors can only upload
- **Implementation:** `canApproveDocuments(userRole)`

### Document Deletion Permission
**Rule:** Only Admin role can delete documents
- **Implementation:** `canDeleteDocuments(userRole)`

---

## Validation Rules

### Budget Allocation Validation
**Rule:** Allocated amount must be positive
- **Implementation:** `validateBudgetAllocation(amount)`

### Project Dates Validation
**Rule:** End date must be after start date
- **Implementation:** `validateProjectDates(startDate, endDate)`

### Reimbursement Amount Validation
**Rule:** Amount must be positive and within reasonable limits (< 1 Cr)
- **Implementation:** `validateReimbursementAmount(amount)`

---

## Data Filtering Rules

### Project Status Filter
**Rule:** Return projects matching the status filter
- **Implementation:** `filterProjectsByStatus(projects, status)`

### Document Project Hierarchy Filter
**Rule:** Documents must belong to a project (no orphaned files)
- **Implementation:** `filterDocumentsByProject(documents, projectId)`

### Risk Filter
**Rule:** Return risks matching both project and status filters
- **Implementation:** `filterRisks(risks, projectId, status)`

---

## Usage in Production

When transitioning to real-time data processing:

1. **Replace Mock Data Calls:** Update data fetching to use APIs instead of mock data
2. **Keep Calculation Functions:** All calculation functions remain the same
3. **Update Data Sources:** Change input parameters from mock data to API responses
4. **Add Caching:** Implement caching for frequently calculated values
5. **Add Real-time Updates:** Use WebSockets or polling for live data updates

Example:
```typescript
// Current (Mock)
const budget = mockBudgets.find(b => b.projectId === projectId);
const utilization = calculateBudgetUtilization(budget.allocated, budget.spent);

// Production (Real-time)
const budget = await fetchBudgetFromAPI(projectId);
const utilization = calculateBudgetUtilization(budget.allocated, budget.spent);
// Same calculation function, different data source!
```

