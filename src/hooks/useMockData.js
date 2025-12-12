import { useState, useEffect, useCallback } from 'react';
import { documents, tasks, budgets, risks, projects, users, contractors } from '@/mock';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { AuditLogger } from '@/services/AuditLogger'; // Import Logger

const STORAGE_KEYS = {
  documents: 'pmis_documents_v2',
  tasks: 'pmis_tasks_v2',
  budgets: 'pmis_budgets_v2',
  risks: 'pmis_risks_v2',
  projects: 'pmis_projects_v2',
  packages: 'pmis_packages_v2',
  contractors: 'pmis_contractors_v2',
  raBills: 'pmis_ra_bills_v2',
};

// Load from localStorage or use initial mock data
const loadFromStorage = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
  }
  return fallback;
};

// Save to localStorage
const saveToStorage = (key, data) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

// Simulate async operation
const simulateAsync = (data, delay = 800) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const useMockData = () => {
  const { user } = useAuth(); // Access current user for logging

  const [documentsData, setDocumentsData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.documents, documents)
  );
  const [tasksData, setTasksData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.tasks, tasks)
  );
  const [budgetsData, setBudgetsData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.budgets, budgets)
  );
  const [risksData, setRisksData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.risks, risks)
  );
  const [projectsData, setProjectsData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.projects, projects)
  );
  const [packagesData, setPackagesData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.packages, [])
  );

  const [contractorsData, setContractorsData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.contractors, contractors)
  );

  const [raBillsData, setRaBillsData] = useState(() =>
    loadFromStorage(STORAGE_KEYS.raBills, [])
  );

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.documents, documentsData);
  }, [documentsData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.tasks, tasksData);
  }, [tasksData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.budgets, budgetsData);
  }, [budgetsData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.risks, risksData);
  }, [risksData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.projects, projectsData);
  }, [projectsData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.packages, packagesData);
  }, [packagesData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.contractors, contractorsData);
  }, [contractorsData]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.raBills, raBillsData);
  }, [raBillsData]);

  // Projects CRUD
  const addProject = useCallback(async (project) => {
    const newProject = { ...project, id: `proj-${Date.now()}` };
    const result = await simulateAsync(newProject, 800);
    setProjectsData((prev) => [result, ...prev]);
    AuditLogger.logAction(user, 'CREATE', 'Project', `Created project: ${result.name}`);
    return result;
  }, [user]);

  const updateProject = useCallback(async (id, updates) => {
    const updated = projectsData.find((p) => p.id === id);
    if (!updated) throw new Error('Project not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setProjectsData((prev) => prev.map((p) => (p.id === id ? result : p)));
    AuditLogger.logAction(user, 'UPDATE', 'Project', `Updated project: ${updated.name}`, updates);
    return result;
  }, [projectsData, user]);

  const deleteProject = useCallback(async (id) => {
    await simulateAsync(null, 600);
    setProjectsData((prev) => prev.filter((p) => p.id !== id));
    AuditLogger.logAction(user, 'DELETE', 'Project', `Deleted project ID: ${id}`);
  }, [user]);

  // Documents CRUD
  const addDocument = useCallback(async (document) => {
    const newDoc = { ...document, id: document.id || `doc-${Date.now()}` };
    const result = await simulateAsync(newDoc, 600);
    setDocumentsData((prev) => [result, ...prev]);
    AuditLogger.logAction(user, 'UPLOAD', 'Document', `Uploaded document: ${result.name}`);
    return result;
  }, [user]);

  // Support both full document update and partial update by ID
  const updateDocument = useCallback(async (docOrId, updates) => {
    if (typeof docOrId === 'string') {
      // Called with (id, updates)
      const updated = documentsData.find((d) => d.id === docOrId);
      if (!updated) throw new Error('Document not found');
      const result = await simulateAsync({ ...updated, ...updates }, 600);
      setDocumentsData((prev) => prev.map((d) => (d.id === docOrId ? result : d)));
      AuditLogger.logAction(user, 'UPDATE', 'Document', `Updated document: ${updated.name}`, updates);
      return result;
    } else {
      // Called with full document object
      const result = await simulateAsync(docOrId, 600);
      setDocumentsData((prev) => prev.map((d) => (d.id === docOrId.id ? result : d)));
      AuditLogger.logAction(user, 'UPDATE', 'Document', `Updated document: ${result.name}`);
      return result;
    }
  }, [documentsData, user]);

  const deleteDocument = useCallback(async (id) => {
    await simulateAsync(null, 600);
    setDocumentsData((prev) => prev.filter((d) => d.id !== id));
    AuditLogger.logAction(user, 'DELETE', 'Document', `Deleted document ID: ${id}`);
  }, [user]);

  // Tasks CRUD
  const updateTask = useCallback(async (id, updates) => {
    const updated = tasksData.find((t) => t.id === id);
    if (!updated) throw new Error('Task not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setTasksData((prev) => prev.map((t) => (t.id === id ? result : t)));
    AuditLogger.logAction(user, 'UPDATE', 'Task', `Updated task: ${updated.title}`, updates);
    return result;
  }, [tasksData, user]);

  const toggleTaskComplete = useCallback(async (id) => {
    const task = tasksData.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
    const newProgress = newStatus === 'Completed' ? 100 : task.progress;

    // Use the base updateTask which logs internally
    return updateTask(id, { status: newStatus, progress: newProgress });
  }, [tasksData, updateTask]);

  // Budgets CRUD
  const updateBudget = useCallback(async (id, updates) => {
    const updated = budgetsData.find((b) => b.id === id);
    if (!updated) throw new Error('Budget not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setBudgetsData((prev) => prev.map((b) => (b.id === id ? result : b)));
    AuditLogger.logAction(user, 'UPDATE', 'Budget', `Updated budget for: ${updated.category}`, updates);
    return result;
  }, [budgetsData, user]);

  // Risks CRUD
  const updateRisk = useCallback(async (id, updates) => {
    const updated = risksData.find((r) => r.id === id);
    if (!updated) throw new Error('Risk not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setRisksData((prev) => prev.map((r) => (r.id === id ? result : r)));
    AuditLogger.logAction(user, 'UPDATE', 'Risk', `Updated risk: ${updated.description}`, updates);
    return result;
  }, [risksData, user]);

  // Contractors CRUD
  const addContractor = useCallback(async (contractor) => {
    console.log('useMockData: Adding contractor', contractor);
    const newContractor = { ...contractor, id: `contr-${Date.now()}` };
    const result = await simulateAsync(newContractor, 800);
    setContractorsData((prev) => [result, ...prev]);
    AuditLogger.logAction(user, 'CREATE', 'Contractor', `Registered contractor: ${result.contractorName} (${result.email})`);
    return result;
  }, [user]);

  const deleteContractor = useCallback(async (id) => {
    await simulateAsync(null, 600);
    setContractorsData((prev) => prev.filter((c) => c.id !== id));
    AuditLogger.logAction(user, 'DELETE', 'Contractor', `Deleted contractor ID: ${id}`);
  }, [user]);

  const updateContractor = useCallback(async (id, updates) => {
    const updated = contractorsData.find((c) => c.id === id);
    if (!updated) throw new Error('Contractor not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setContractorsData((prev) => prev.map((c) => (c.id === id ? result : c)));
    AuditLogger.logAction(user, 'UPDATE', 'Contractor', `Updated contractor: ${updated.contractorName}`, updates);
    return result;
  }, [contractorsData, user]);

  // RA BILLS
  const addRABill = useCallback(async (bill) => {
    const newBill = { ...bill, id: `bill-${Date.now()}` };
    const result = await simulateAsync(newBill, 800);
    setRaBillsData((prev) => [result, ...prev]);
    AuditLogger.logAction(user, 'CREATE', 'Billing', `Generated RA Bill: ${result.invoiceNumber}`);
    return result;
  }, [user]);

  return {
    users, // Export users static data
    documents: documentsData,
    tasks: tasksData,
    budgets: budgetsData,
    risks: risksData,
    projects: projectsData,
    packages: packagesData,
    contractors: contractorsData,
    addDocument,
    updateDocument,
    deleteDocument,
    updateTask,
    toggleTaskComplete,
    updateBudget,
    updateRisk,
    addProject,
    updateProject,
    deleteProject,
    addPackage: useCallback(async (pkg) => {
      const newPkg = { ...pkg, id: `pkg-${Date.now()}` };
      const result = await simulateAsync(newPkg, 800);
      setPackagesData((prev) => [result, ...prev]);
      AuditLogger.logAction(user, 'CREATE', 'Package', `Created package: ${result.name}`);
      return result;
    }, [user]),
    addContractor,
    deleteContractor,
    updateContractor,
    raBills: raBillsData,
    addRABill,
  };
};

