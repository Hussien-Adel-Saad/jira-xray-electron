/**
 * Application State Store (Zustand)
 * Tab-based UI state management
 */

import { create } from 'zustand';
import type {
  AuthStatus,
  CreateTestInput,
  CreateTestSetInput,
  CreateTestExecutionInput,
  StoryValidationResult,
  Template,
} from '../../shared/types';

type TabType = 'testcases' | 'testsets' | 'execution';

interface AppState {
  // Auth
  auth: AuthStatus;
  setAuth: (auth: AuthStatus) => void;
  clearAuth: () => void;

  // Active Tab
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;

  // Story linking (optional for all entities)
  linkedStory: StoryValidationResult | null;
  setLinkedStory: (story: StoryValidationResult | null) => void;

  // Test Cases
  testCases: CreateTestInput[];
  addTestCase: (test: CreateTestInput) => void;
  updateTestCase: (index: number, test: CreateTestInput) => void;
  removeTestCase: (index: number) => void;
  clearTestCases: () => void;
  cloneTestCase: (index: number) => CreateTestInput;

  // Test Sets
  testSets: CreateTestSetInput[];
  addTestSet: (testSet: CreateTestSetInput) => void;
  updateTestSet: (index: number, testSet: CreateTestSetInput) => void;
  removeTestSet: (index: number) => void;
  clearTestSets: () => void;

  // Test Executions
  executions: CreateTestExecutionInput[];
  addExecution: (execution: CreateTestExecutionInput) => void;
  updateExecution: (index: number, execution: CreateTestExecutionInput) => void;
  removeExecution: (index: number) => void;
  clearExecutions: () => void;

  // Templates
  templates: Template[];
  setTemplates: (templates: Template[]) => void;

  // Created issues (for tracking)
  createdIssues: {
    testKeys: string[];
    testSetKeys: string[];
    executionKeys: string[];
  };
  addCreatedTest: (key: string) => void;
  addCreatedTestSet: (key: string) => void;
  addCreatedExecution: (key: string) => void;
  clearCreatedIssues: () => void;
}

const defaultAuth: AuthStatus = {
  isAuthenticated: false,
  username: null,
  jiraBaseUrl: '',
  projectKey: '',
};

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  auth: defaultAuth,
  setAuth: (auth) => set({ auth }),
  clearAuth: () => set({ auth: defaultAuth }),

  // Active Tab
  activeTab: 'testcases',
  setActiveTab: (activeTab) => set({ activeTab }),

  // Story linking
  linkedStory: null,
  setLinkedStory: (linkedStory) => set({ linkedStory }),

  // Test Cases
  testCases: [],
  addTestCase: (testCase) => set((state) => ({ testCases: [...state.testCases, testCase] })),
  updateTestCase: (index, testCase) =>
    set((state) => ({
      testCases: state.testCases.map((t, i) => (i === index ? testCase : t)),
    })),
  removeTestCase: (index) =>
    set((state) => ({
      testCases: state.testCases.filter((_, i) => i !== index),
    })),
  clearTestCases: () => set({ testCases: [] }),
  cloneTestCase: (index) => {
    const original = get().testCases[index];
    // Return a deep copy
    return {
      ...original,
      summary: `${original.summary} (Copy)`,
      steps: original.steps.map((step) => ({ ...step })),
      labels: [...(original.labels || [])],
      components: [...(original.components || [])],
      fixVersions: [...(original.fixVersions || [])],
      environments: [...(original.environments || [])],
    };
  },

  // Test Sets
  testSets: [],
  addTestSet: (testSet) => set((state) => ({ testSets: [...state.testSets, testSet] })),
  updateTestSet: (index, testSet) =>
    set((state) => ({
      testSets: state.testSets.map((t, i) => (i === index ? testSet : t)),
    })),
  removeTestSet: (index) =>
    set((state) => ({
      testSets: state.testSets.filter((_, i) => i !== index),
    })),
  clearTestSets: () => set({ testSets: [] }),

  // Test Executions
  executions: [],
  addExecution: (execution) => set((state) => ({ executions: [...state.executions, execution] })),
  updateExecution: (index, execution) =>
    set((state) => ({
      executions: state.executions.map((e, i) => (i === index ? execution : e)),
    })),
  removeExecution: (index) =>
    set((state) => ({
      executions: state.executions.filter((_, i) => i !== index),
    })),
  clearExecutions: () => set({ executions: [] }),

  // Templates
  templates: [],
  setTemplates: (templates) => set({ templates }),

  // Created issues
  createdIssues: {
    testKeys: [],
    testSetKeys: [],
    executionKeys: [],
  },
  addCreatedTest: (key) =>
    set((state) => ({
      createdIssues: {
        ...state.createdIssues,
        testKeys: [...state.createdIssues.testKeys, key],
      },
    })),
  addCreatedTestSet: (key) =>
    set((state) => ({
      createdIssues: {
        ...state.createdIssues,
        testSetKeys: [...state.createdIssues.testSetKeys, key],
      },
    })),
  addCreatedExecution: (key) =>
    set((state) => ({
      createdIssues: {
        ...state.createdIssues,
        executionKeys: [...state.createdIssues.executionKeys, key],
      },
    })),
  clearCreatedIssues: () =>
    set({
      createdIssues: {
        testKeys: [],
        testSetKeys: [],
        executionKeys: [],
      },
    }),
}));