import { useState, useEffect, useCallback } from 'react';
import type { Document, Task, Budget, Risk, Project } from '@/mock/interfaces';
import { documents, tasks, budgets, risks, projects } from '@/mock';

const STORAGE_KEYS = {
  documents: 'pmis_documents',
  tasks: 'pmis_tasks',
  budgets: 'pmis_budgets',
  risks: 'pmis_risks',
  projects: 'pmis_projects',
};

// Load from localStorage or use initial mock data
const loadFromStorage = <T>(key: string, fallback: T[]): T[] => {
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
const saveToStorage = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
};

// Simulate async operation
const simulateAsync = <T>(data: T, delay: number = 800): Promise<T> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const useMockData = () => {
  const [documentsData, setDocumentsData] = useState<Document[]>(() =>
    loadFromStorage(STORAGE_KEYS.documents, documents)
  );
  const [tasksData, setTasksData] = useState<Task[]>(() =>
    loadFromStorage(STORAGE_KEYS.tasks, tasks)
  );
  const [budgetsData, setBudgetsData] = useState<Budget[]>(() =>
    loadFromStorage(STORAGE_KEYS.budgets, budgets)
  );
  const [risksData, setRisksData] = useState<Risk[]>(() =>
    loadFromStorage(STORAGE_KEYS.risks, risks)
  );
  const [projectsData, setProjectsData] = useState<Project[]>(() =>
    loadFromStorage(STORAGE_KEYS.projects, projects)
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

  // Projects CRUD
  const addProject = useCallback(async (project: Project): Promise<Project> => {
    const newProject = { ...project, id: `proj-${Date.now()}` };
    const result = await simulateAsync(newProject, 800);
    setProjectsData((prev) => [result, ...prev]);
    return result;
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<Project> => {
    const updated = projectsData.find((p) => p.id === id);
    if (!updated) throw new Error('Project not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setProjectsData((prev) => prev.map((p) => (p.id === id ? result : p)));
    return result;
  }, [projectsData]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await simulateAsync(null, 600);
    setProjectsData((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Documents CRUD
  const addDocument = useCallback(async (document: Document): Promise<Document> => {
    const newDoc = { ...document, id: `doc-${Date.now()}` };
    const result = await simulateAsync(newDoc, 600);
    setDocumentsData((prev) => [result, ...prev]);
    return result;
  }, []);

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>): Promise<Document> => {
    const updated = documentsData.find((d) => d.id === id);
    if (!updated) throw new Error('Document not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setDocumentsData((prev) => prev.map((d) => (d.id === id ? result : d)));
    return result;
  }, [documentsData]);

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    await simulateAsync(null, 600);
    setDocumentsData((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Tasks CRUD
  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<Task> => {
    const updated = tasksData.find((t) => t.id === id);
    if (!updated) throw new Error('Task not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setTasksData((prev) => prev.map((t) => (t.id === id ? result : t)));
    return result;
  }, [tasksData]);

  const toggleTaskComplete = useCallback(async (id: string): Promise<Task> => {
    const task = tasksData.find((t) => t.id === id);
    if (!task) throw new Error('Task not found');
    const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
    const newProgress = newStatus === 'Completed' ? 100 : task.progress;
    return updateTask(id, { status: newStatus, progress: newProgress });
  }, [tasksData, updateTask]);

  // Budgets CRUD
  const updateBudget = useCallback(async (id: string, updates: Partial<Budget>): Promise<Budget> => {
    const updated = budgetsData.find((b) => b.id === id);
    if (!updated) throw new Error('Budget not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setBudgetsData((prev) => prev.map((b) => (b.id === id ? result : b)));
    return result;
  }, [budgetsData]);

  // Risks CRUD
  const updateRisk = useCallback(async (id: string, updates: Partial<Risk>): Promise<Risk> => {
    const updated = risksData.find((r) => r.id === id);
    if (!updated) throw new Error('Risk not found');
    const result = await simulateAsync({ ...updated, ...updates }, 600);
    setRisksData((prev) => prev.map((r) => (r.id === id ? result : r)));
    return result;
  }, [risksData]);

  return {
    documents: documentsData,
    tasks: tasksData,
    budgets: budgetsData,
    risks: risksData,
    projects: projectsData,
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
  };
};


