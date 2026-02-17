/**
 * Shared constants used across main and renderer processes
 * Updated with batch validation support
 */

// Custom field IDs for MTD project
export const CUSTOM_FIELDS = {
  TEST_TYPE: 'customfield_13900',
  MANUAL_TEST_STEPS: 'customfield_12404',
  TESTS_IN_EXECUTION: 'customfield_12415',
  TESTS_IN_SET: 'customfield_12412',
  TEST_PLANS_LINK: 'customfield_12409',
  PRECONDITIONS: 'customfield_12408',
  STEPS_COUNT: 'customfield_13903',
  TEST_RUN_STATUS: 'customfield_12410',
} as const;

// Issue types
export const ISSUE_TYPES = {
  TEST: 'Test',
  TEST_SET: 'Test Set',
  TEST_EXECUTION: 'Test Execution',
  TEST_PLAN: 'Test Plan',
  STORY: 'Story',
  BUG: 'Bug',
} as const;

// Test types
export const TEST_TYPES = {
  MANUAL: 'Manual',
  AUTOMATED: 'Automated',
} as const;

// Link types
export const LINK_TYPES = {
  TESTS: 'Tests',
  RELATES: 'Relates',
  BLOCKS: 'Blocks',
  CLONES: 'Clones',
  DUPLICATES: 'Duplicates',
} as const;

// Priority levels
export const PRIORITIES = {
  HIGHEST: 'Highest',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  LOWEST: 'Lowest',
} as const;

// IPC channels
export const IPC_CHANNELS = {
  GET_ISSUE_LINK_TYPES: 'metadata:getIssueLinkTypes',
  GET_ISSUE_TYPES: 'metadata:getIssueTypes',
  GET_ISSUE_SCHEME: 'metadata:getIssueScheme',
  GET_CREATE_META_BY_TYPE_ID: 'metadata:getCreateMetaByTypeId',
  GET_ALL_FIELDS: 'metadata:getAllFields',
  GET_PROJECT: 'metadata:getProject',
  GET_FIELDS_FOR_ISSUE_TYPE: 'metadata:getFieldsForIssueType',
  
  // Auth
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  GET_AUTH_STATUS: 'auth:getStatus',
  SAVE_CREDENTIALS: 'auth:saveCredentials',
  LOAD_CREDENTIALS: 'auth:loadCredentials',
  
  // Test operations
  VALIDATE_STORY: 'test:validateStory',
  VALIDATE_ISSUES: 'test:validateIssues', // NEW: Batch validation
  CREATE_TEST: 'test:create',
  CREATE_TEST_SET: 'test:createSet',
  CREATE_EXECUTION: 'test:createExecution',
  LINK_ISSUES: 'test:linkIssues',
  EXECUTE_WORKFLOW: 'test:executeWorkflow',
  SEARCH_TESTS_BY_LABEL: 'test:searchByLabel',
  GET_TESTS_BY_KEYS: 'test:getByKeys',
  ADD_TEST_STEP: 'test:addStep',
  GET_TEST_STEPS: 'test:getSteps', // NEW: Get test steps
  
  // Xray Test Coverage
  LINK_TEST_TO_STORY: 'test:linkTestToStory',
  UNLINK_TEST_FROM_STORY: 'test:unlinkTestFromStory',
  GET_TEST_STORY_LINKS: 'test:getTestStoryLinks',
  
  // Metadata operations
  GET_PRIORITIES: 'metadata:getPriorities',
  GET_LABEL_SUGGESTIONS: 'metadata:getLabelSuggestions',
  GET_COMPONENT_SUGGESTIONS: 'metadata:getComponentSuggestions',
  GET_COMPONENTS: 'metadata:getComponents',
  GET_VERSIONS: 'metadata:getVersions',
  
  // Shell
  OPEN_EXTERNAL: 'shell:openExternal',

  // Templates
  GET_TEMPLATES: 'template:getAll',
  SAVE_TEMPLATE: 'template:save',
  DELETE_TEMPLATE: 'template:delete',
  APPLY_TEMPLATE: 'template:apply',
} as const;

// Error codes
export enum ErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  JIRA_API_ERROR = 'JIRA_API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  UNKNOWN = 'UNKNOWN',
}

// Built-in template variables
export const BUILT_IN_VARIABLES = {
  DATE: '{{date}}',
  TIME: '{{time}}',
  DATETIME: '{{datetime}}',
  USER: '{{user}}',
  PROJECT: '{{project}}',
} as const;

// API timeouts (milliseconds)
export const TIMEOUTS = {
  API_REQUEST: 30000,
  LOGIN: 10000,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  MAX_CONCURRENT_REQUESTS: 5,
} as const;

// Validation limits
export const VALIDATION_LIMITS = {
  MAX_SUMMARY_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_STEPS_PER_TEST: 100,
  MAX_TESTS_PER_SET: 500,
  MAX_TESTS_PER_EXECUTION: 1000,
  MAX_TESTS_PER_WORKFLOW: 50,
  MAX_TEMPLATES: 100,
  MAX_LABELS: 20,
} as const;