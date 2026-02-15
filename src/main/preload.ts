/**
 * Preload Script
 * Exposes safe IPC API to renderer process via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, FIELD_MAPPING } from '../shared/constants';
import type {
  AuthCredentials,
  AuthStatus,
  CreateTestInput,
  CreateTestSetInput,
  CreateTestExecutionInput,
  CreateIssueResponse,
  StoryValidationResult,
  WorkflowInput,
  WorkflowResult,
  Template,
  TemplateApplication,
  AppliedTemplate,
  Result,
  Priority,
  Component,
  Version,
  LabelSuggestion,
} from '../shared/types';

// Define the API interface
export interface ElectronAPI {
      getProject: (projectKey: string) => Promise<Result<any>>;
    // Enhanced Metadata APIs
    getIssueLinkTypes: () => Promise<Result<any[]>>;
    getIssueTypes: () => Promise<Result<any[]>>;
    getIssueScheme: (testKey: string) => Promise<Result<any>>;
    getCreateMetaByTypeId: (typeId: string) => Promise<Result<any>>;
    getAllFields: () => Promise<Result<any[]>>;
  // Auth
  login: (credentials: AuthCredentials) => Promise<Result<AuthStatus>>;
  logout: () => Promise<Result<void>>;
  getAuthStatus: () => Promise<Result<AuthStatus>>;
  saveCredentials: (username: string, password: string) => Promise<Result<void>>;
  loadCredentials: (username: string) => Promise<Result<string | null>>;

  // Test operations
  validateStory: (storyKey: string) => Promise<Result<StoryValidationResult>>;
  createTest: (testInput: CreateTestInput) => Promise<Result<CreateIssueResponse>>;
  createTestSet: (
    setInput: CreateTestSetInput,
    testKeys: string[]
  ) => Promise<Result<CreateIssueResponse>>;
  createExecution: (
    execInput: CreateTestExecutionInput,
    testKeys: string[]
  ) => Promise<Result<CreateIssueResponse>>;
  linkIssues: (
    linkType: string,
    inwardKey: string,
    outwardKey: string
  ) => Promise<Result<void>>;
  executeWorkflow: (workflow: WorkflowInput) => Promise<Result<WorkflowResult>>;

  // Test API methods
  searchTestsByLabel: (label: string) => Promise<any>;
  getTestsByKeys: (keys: string[]) => Promise<any>;
  linkToTestPlan: (executionKey: string, testPlanKey: string) => Promise<any>;
  addTestsToSet: (testSetKey: string, testKeys: string[]) => Promise<any>;
  addTestsToExecution: (executionKey: string, testKeys: string[]) => Promise<any>;
  addTestStep: (testKey: string, step: any) => Promise<any>;

  // Metadata Operations
  getPriorities: () => Promise<Result<Priority[]>>;
  getLabelSuggestions: (query: string) => Promise<Result<LabelSuggestion[]>>;
  getComponents: () => Promise<Result<Component[]>>;
  getVersions: () => Promise<Result<Version[]>>;

  // Test Coverage (Xray)
  linkTestToStory: (testKey: string, storyKey: string) => Promise<Result<void>>;
  unlinkTestFromStory: (testKey: string, storyKey: string) => Promise<Result<void>>;
  getTestStoryLinks: (testKey: string) => Promise<Result<string[]>>;

  // Templates
  getTemplates: () => Promise<Result<Template[]>>;
  saveTemplate: (template: Template) => Promise<Result<Template>>;
  deleteTemplate: (templateId: string) => Promise<Result<void>>;
  applyTemplate: (application: TemplateApplication) => Promise<Result<AppliedTemplate>>;

  // Field Mapping
  getFieldMapping: () => Promise<Result<any>>;
  getIssueTypeFields: (issueType: 'Test' | 'Test Set' | 'Test Execution') => Promise<Result<any>>;
}

const api: ElectronAPI = {
    getProject: (projectKey: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROJECT, projectKey),
    // Enhanced Metadata APIs
    getIssueLinkTypes: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ISSUE_LINK_TYPES),
    getIssueTypes: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ISSUE_TYPES),
    getIssueScheme: (testKey) => ipcRenderer.invoke(IPC_CHANNELS.GET_ISSUE_SCHEME, testKey),
    getCreateMetaByTypeId: (typeId) => ipcRenderer.invoke(IPC_CHANNELS.GET_CREATE_META_BY_TYPE_ID, typeId),
    getAllFields: () => ipcRenderer.invoke(IPC_CHANNELS.GET_ALL_FIELDS),
  // Auth
  login: (credentials) => ipcRenderer.invoke(IPC_CHANNELS.LOGIN, credentials),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.LOGOUT),
  getAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GET_AUTH_STATUS),
  saveCredentials: (username, password) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_CREDENTIALS, username, password),
  loadCredentials: (username) =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_CREDENTIALS, username),

  // Test operations
  validateStory: (storyKey) => ipcRenderer.invoke(IPC_CHANNELS.VALIDATE_STORY, storyKey),
  createTest: (testInput) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_TEST, testInput),
  createTestSet: (setInput, testKeys) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_TEST_SET, setInput, testKeys),
  createExecution: (execInput, testKeys) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_EXECUTION, execInput, testKeys),
  linkIssues: (linkType, inwardKey, outwardKey) =>
    ipcRenderer.invoke(IPC_CHANNELS.LINK_ISSUES, linkType, inwardKey, outwardKey),
  executeWorkflow: (workflow) => ipcRenderer.invoke(IPC_CHANNELS.EXECUTE_WORKFLOW, workflow),

  // Test API methods
  searchTestsByLabel: (label) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH_TESTS_BY_LABEL, label),
  getTestsByKeys: (keys) => ipcRenderer.invoke(IPC_CHANNELS.GET_TESTS_BY_KEYS, keys),
  linkToTestPlan: (executionKey, testPlanKey) => ipcRenderer.invoke('test:linkToTestPlan', executionKey, testPlanKey),
  addTestsToSet: (testSetKey, testKeys) => ipcRenderer.invoke('test:addTestsToSet', testSetKey, testKeys),
  addTestsToExecution: (executionKey, testKeys) => ipcRenderer.invoke('test:addTestsToExecution', executionKey, testKeys),
  addTestStep: (testKey, step) => ipcRenderer.invoke(IPC_CHANNELS.ADD_TEST_STEP, testKey, step),

  // Metadata Operations
  getPriorities: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PRIORITIES),
  getLabelSuggestions: (query) => ipcRenderer.invoke(IPC_CHANNELS.GET_LABEL_SUGGESTIONS, query),
  getComponents: () => ipcRenderer.invoke(IPC_CHANNELS.GET_COMPONENTS),
  getVersions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VERSIONS),

  // Test Coverage (Xray)
  linkTestToStory: (testKey, storyKey) => 
    ipcRenderer.invoke(IPC_CHANNELS.LINK_TEST_TO_STORY, testKey, storyKey),
  unlinkTestFromStory: (testKey, storyKey) => 
    ipcRenderer.invoke(IPC_CHANNELS.UNLINK_TEST_FROM_STORY, testKey, storyKey),
  getTestStoryLinks: (testKey) => 
    ipcRenderer.invoke(IPC_CHANNELS.GET_TEST_STORY_LINKS, testKey),

  // Templates
  getTemplates: () => ipcRenderer.invoke(IPC_CHANNELS.GET_TEMPLATES),
  saveTemplate: (template) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_TEMPLATE, template),
  deleteTemplate: (templateId) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_TEMPLATE, templateId),
  applyTemplate: (application) => ipcRenderer.invoke(IPC_CHANNELS.APPLY_TEMPLATE, application),

  // Field Mapping
  getFieldMapping: () => ipcRenderer.invoke(FIELD_MAPPING.GET_FIELD_MAPPING),
  getIssueTypeFields: (issueType) => ipcRenderer.invoke(FIELD_MAPPING.GET_ISSUE_TYPE_FIELDS, issueType),
};

contextBridge.exposeInMainWorld('electronAPI', api);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}