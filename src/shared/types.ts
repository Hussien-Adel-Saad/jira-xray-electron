/**
 * Shared TypeScript types used across main and renderer processes
 */

import { ErrorCode } from './constants.js';

// ==================== Error Types ====================

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: AppError };

// ==================== Auth Types ====================

export interface AuthCredentials {
  username: string;
  password: string;
  jiraBaseUrl: string;
  projectKey: string;
  rememberCredentials: boolean;
}

export interface AuthStatus {
  isAuthenticated: boolean;
  username: string | null;
  jiraBaseUrl: string;
  projectKey: string;
}

// ==================== Jira Types ====================

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraFields;
}

export interface JiraFields {
  summary: string;
  description?: string;
  issuetype: IssueType;
  project: Project;
  status: Status;
  assignee?: User;
  reporter?: User;
  priority?: Priority;
  labels?: string[];
  components?: Component[];
  fixVersions?: Version[];
  duedate?: string;
  created: string;
  updated: string;
}

export interface IssueType {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
}

export interface Status {
  id: string;
  name: string;
}

export interface User {
  name: string;
  displayName: string;
  emailAddress?: string;
}

export interface Priority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Component {
  id: string;
  name: string;
}

export interface Version {
  id: string;
  name: string;
  released?: boolean;
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface StoryValidationResult {
  exists: boolean;
  issueType: string;
  summary: string;
  key: string;
}

// ==================== Test Input Types ====================

export interface TestStepInput {
  step: string;
  data: string;
  result: string;
}

export interface LabelSuggestion {
  label: string;
}

export interface CreateTestInput {
  summary: string;
  description?: string;
  testType: 'Manual' | 'Automated';
  priority: string;
  assignee?: string;
  reporter?: string;  // ✅ ADDED - Reporter field for test case creation
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  environments?: string[];
  dueDate?: string;
  steps: TestStepInput[];
}

export interface CreateTestSetInput {
  summary: string;
  description?: string;
  priority: string;
  assignee?: string;
  reporter?: string;  // ✅ ADDED - Reporter field for test set creation
  labels?: string[];
}

export interface CreateTestExecutionInput {
  summary: string;
  description?: string;
  assignee?: string;
  reporter?: string;  // ✅ ADDED - Reporter field for test execution creation
  environments?: string[];
  fixVersions?: string[];
  labels?: string[];
}

export interface WorkflowInput {
  storyKey: string;
  tests: CreateTestInput[];
  testSet?: CreateTestSetInput;
  execution: CreateTestExecutionInput;
  testPlanKey?: string;
}

export interface WorkflowResult {
  testKeys: string[];
  testSetKey?: string;
  executionKey: string;
  success: boolean;
  message: string;
}

// ==================== Template Types ====================

export type TemplateVariableType = 'text' | 'date' | 'select' | 'number';

export interface TemplateVariable {
  name: string;           // Variable name (e.g., "name")
  label: string;          // Display label (e.g., "Test Name")
  type: TemplateVariableType;
  required: boolean;
  defaultValue?: string;
  options?: string[];     // For select type
  placeholder?: string;
}

export interface TemplateFields {
  summary: string;
  description?: string;
  priority?: string;
  assignee?: string;
  reporter?: string;      // ✅ ADDED - Reporter field for templates
  labels?: string[];
  components?: string[];
  fixVersions?: string[];
  environments?: string[];
  dueDate?: string;
  [key: string]: string | string[] | undefined;
}

export interface Template {
  id: string;
  name: string;
  issueType: 'Test' | 'TestSet' | 'TestExecution';
  description?: string;
  fields: TemplateFields;
  variables: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateApplication {
  templateId: string;
  variableValues: Record<string, string>;
}

export interface AppliedTemplate {
  fields: TemplateFields;
}

