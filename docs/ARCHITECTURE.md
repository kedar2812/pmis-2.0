# PMIS ZIA - Rule-Based Architecture

## Overview

This system is built with a **rule-based architecture** where all calculations, business logic, and data processing follow centralized formulas and rules. This design ensures that when transitioning from mock data to real-time data processing, only the data source changes - the calculation logic remains identical.

## Architecture Principles

### 1. **Separation of Concerns**
- **Data Layer**: Mock data (current) → API calls (production)
- **Calculation Layer**: Centralized rules in `src/lib/calculations.ts`
- **Presentation Layer**: UI components that consume calculated results

### 2. **Pure Functions**
All calculation functions are pure functions:
- No side effects
- Same input = Same output
- Easy to test
- Easy to replace data sources

### 3. **Single Source of Truth**
All business rules are defined in:
- `src/lib/calculations.ts` - Calculation functions
- `src/lib/rules.md` - Documentation of all formulas

## Current Implementation (Mock Data)

```typescript
// Example: Budget Utilization Calculation
import { calculateBudgetUtilization } from '@/lib/calculations';

// Current: Using mock data
const project = mockProjects.find(p => p.id === projectId);
const utilization = calculateBudgetUtilization(project.budget, project.spent);
```

## Production Implementation (Real-Time Data)

```typescript
// Example: Budget Utilization Calculation
import { calculateBudgetUtilization } from '@/lib/calculations';

// Production: Using API data
const project = await fetchProjectFromAPI(projectId);
const utilization = calculateBudgetUtilization(project.budget, project.spent);
// Same calculation function, different data source!
```

## Rule Categories

### 1. KPI Calculations
- Schedule Performance Index (SPI)
- Cost Performance Index (CPI)
- Cost Variation & Percentage
- Budget Utilization
- Project Progress
- Risk Scoring

### 2. Budget Calculations
- Remaining Budget
- Budget Variance
- Budget Health Status
- Land Acquisition Status
- Budget Aggregation (by Source/Utilization)

### 3. Forecast Calculations
- Cost Forecast (Trend Analysis)
- Forecast Variance

### 4. Project Status Rules
- Project Status Determination
- Project Health Score

### 5. Workflow Rules
- Next Workflow Step
- Workflow Status Determination
- Step Requirement Validation

### 6. Permission Rules
- Project Creation Permissions
- Document Approval Permissions
- Document Deletion Permissions

### 7. Validation Rules
- Budget Allocation Validation
- Project Dates Validation
- Reimbursement Amount Validation

### 8. Data Filtering Rules
- Project Status Filtering
- Document Project Hierarchy Filtering
- Risk Filtering

## Migration Path to Real-Time Data

### Step 1: Replace Data Fetching
```typescript
// Before (Mock)
import { projects } from '@/mock';

// After (API)
import { fetchProjects } from '@/services/api';
const projects = await fetchProjects();
```

### Step 2: Keep Calculation Functions
```typescript
// No changes needed!
import { calculateBudgetUtilization } from '@/lib/calculations';
const utilization = calculateBudgetUtilization(budget, spent);
```

### Step 3: Add Real-Time Updates
```typescript
// Add WebSocket or polling
useEffect(() => {
  const ws = new WebSocket('wss://api.pmis-zia.com/updates');
  ws.onmessage = (event) => {
    const updatedData = JSON.parse(event.data);
    // Update state, calculations run automatically
  };
}, []);
```

## Benefits of This Architecture

1. **Easy Testing**: All calculation functions can be unit tested independently
2. **Consistent Results**: Same formulas used everywhere
3. **Easy Migration**: Only data layer changes, not calculation logic
4. **Maintainability**: All rules in one place
5. **Documentation**: Rules are self-documenting with formulas
6. **Scalability**: Can add caching, memoization, or optimization without changing UI

## Example: Complete Flow

### Current (Mock Data)
```typescript
// 1. Get mock data
const project = projects.find(p => p.id === 'proj-1');

// 2. Calculate using rules
const utilization = calculateBudgetUtilization(project.budget, project.spent);
const status = getBudgetHealthStatus(utilization);

// 3. Display in UI
<BudgetCard utilization={utilization} status={status} />
```

### Production (Real-Time Data)
```typescript
// 1. Fetch from API
const project = await fetchProject('proj-1');

// 2. Calculate using SAME rules
const utilization = calculateBudgetUtilization(project.budget, project.spent);
const status = getBudgetHealthStatus(utilization);

// 3. Display in UI (SAME component)
<BudgetCard utilization={utilization} status={status} />
```

## Files Structure

```
src/
├── lib/
│   ├── calculations.ts    # All calculation functions
│   └── rules.md           # Documentation of all rules
├── services/              # (Future) API service layer
│   └── api.ts            # API calls to replace mock data
├── pages/                 # UI components
│   └── Dashboard.tsx     # Uses calculation functions
└── mock/                  # Mock data (will be replaced)
    └── data/
        └── projects.json
```

## Next Steps for Production

1. **Create API Service Layer**
   - Replace `@/mock` imports with `@/services/api`
   - Implement data fetching functions
   - Add error handling and loading states

2. **Add Caching**
   - Cache calculated values
   - Implement cache invalidation
   - Use React Query or SWR for data management

3. **Add Real-Time Updates**
   - WebSocket connections
   - Server-Sent Events (SSE)
   - Polling for critical data

4. **Add Validation**
   - Server-side validation
   - Client-side validation using rule functions
   - Error handling and user feedback

5. **Performance Optimization**
   - Memoize expensive calculations
   - Batch API requests
   - Implement pagination and lazy loading

## Conclusion

The entire system is built on **formula-based, rule-driven architecture**. When you're ready to connect to real-time data:

1. ✅ **Keep** all calculation functions in `src/lib/calculations.ts`
2. ✅ **Keep** all UI components as-is
3. ✅ **Replace** only the data fetching layer
4. ✅ **Add** real-time update mechanisms

The calculation logic will work identically with real-time data because it's already rule-based and data-agnostic!

