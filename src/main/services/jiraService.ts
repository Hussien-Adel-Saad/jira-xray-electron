/**
 * Jira Service - Enhanced with fixes for step duplication and issue validation
 * 
 * FIXES:
 * - Step duplication issue resolved
 * - Added smart issue validation
 * - Security: Using WHATWG URL API (no url.parse deprecation)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import pLimit from 'p-limit';
import {
  CreateTestInput,
  CreateTestSetInput,
  CreateTestExecutionInput,
  CreateIssueResponse,
  StoryValidationResult,
  TestStepInput,
  AppError,
  Priority,
  LabelSuggestion,
  Component,
  Version,
} from '../../shared/types.js';
import { CUSTOM_FIELDS, ErrorCode, TIMEOUTS, RATE_LIMITS } from '../../shared/constants.js';
import { MetadataService, FieldDescriptor } from './metadataService.js';

export class JiraService {
  private client: AxiosInstance;
  private limiter = pLimit(RATE_LIMITS.MAX_CONCURRENT_REQUESTS);
  private baseUrl: string;
  private projectKey: string;
  private basicAuth: string;
  private metadataService: MetadataService;
  private metadataInitialized: boolean = false;

  constructor(baseUrl: string, projectKey: string, basicAuth: string) {
    // SECURITY FIX: Validate URL using WHATWG URL API (no url.parse deprecation)
    try {
      const urlObj = new URL(baseUrl);
      this.baseUrl = urlObj.origin; // Clean URL without trailing slash
    } catch (error) {
      throw new Error(`Invalid Jira base URL: ${baseUrl}`);
    }

    this.projectKey = projectKey;
    this.basicAuth = basicAuth;
    this.metadataService = MetadataService.getInstance();

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: TIMEOUTS.API_REQUEST,
      headers: {
        'Authorization': `Basic ${this.basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  // ==================== Metadata Initialization ====================

  async initializeMetadata(): Promise<void> {
    if (this.metadataInitialized) {
      console.log('⚠️ Metadata already initialized');
      return;
    }

    console.log('🔄 Initializing metadata cache...');

    try {
      const [prioritiesResult, componentsResult, versionsResult, issueTypesResult, allFieldsResult] = await Promise.all([
        this.getPriorities(),
        this.getComponents(),
        this.getVersions(),
        this.getIssueTypes(),
        this.getAllFields(),
      ]);

      this.metadataService.initializeCache({
        issueTypes: issueTypesResult,
        allFields: allFieldsResult,
        priorities: prioritiesResult,
        components: componentsResult,
        versions: versionsResult,
      });

      const commonIssueTypes = ['Test', 'Test Set', 'Test Execution'];
      
      for (const issueTypeName of commonIssueTypes) {
        const issueType = issueTypesResult.find((it: any) => it.name === issueTypeName);
        if (issueType) {
          try {
            const createMeta = await this.getCreateMetaByTypeId(issueType.id);
            this.metadataService.cacheIssueTypeMetadata(issueType.id, issueType.name, createMeta);
          } catch (err) {
            console.warn(`⚠️ Failed to cache metadata for ${issueTypeName}:`, err);
          }
        }
      }

      this.metadataInitialized = true;
      console.log('✅ Metadata initialization complete');
    } catch (error) {
      console.error('❌ Metadata initialization failed:', error);
      throw this.createError(ErrorCode.JIRA_API_ERROR, 'Failed to initialize metadata', error);
    }
  }

  async getFieldsForIssueType(issueTypeName: string): Promise<FieldDescriptor[]> {
    if (!this.metadataInitialized) {
      await this.initializeMetadata();
    }

    const issueTypes = await this.getIssueTypes();
    const issueType = issueTypes.find((it: any) => it.name === issueTypeName);
    
    if (!issueType) {
      throw this.createError(ErrorCode.NOT_FOUND, `Issue type ${issueTypeName} not found`);
    }

    let metadata = this.metadataService.getIssueTypeMetadata(issueType.id);
    
    if (!metadata) {
      const createMeta = await this.getCreateMetaByTypeId(issueType.id);
      this.metadataService.cacheIssueTypeMetadata(issueType.id, issueType.name, createMeta);
      metadata = this.metadataService.getIssueTypeMetadata(issueType.id);
    }

    return metadata ? this.metadataService.getCommonFields(issueType.id) : [];
  }

  resolveFieldValue(field: FieldDescriptor, value: any): any {
    if (!value) return undefined;

    switch (field.schema.type) {
      case 'priority':
        return { id: value };
      case 'user':
        return { name: value };
      case 'array':
        if (field.schema.items === 'component') {
          return Array.isArray(value) ? value.map(id => ({ id })) : [];
        }
        if (field.schema.items === 'version') {
          return Array.isArray(value) ? value.map(name => ({ name })) : [];
        }
        return Array.isArray(value) ? value : [value];
      case 'option':
        return { value: value };
      case 'string':
      case 'number':
      case 'date':
      default:
        return value;
    }
  }

  // ==================== Issue Validation (FIX #3) ====================

  /**
   * SMART VALIDATION: Check if issue exists and return detailed info
   * Supports: Test, Test Set, Test Execution, Test Plan, Story, Bug
   */
  async validateIssue(issueKey: string): Promise<StoryValidationResult> {
    return this.limiter(async () => {
      try {
        const response = await this.client.get(`/rest/api/2/issue/${issueKey}`, {
          params: {
            fields: 'key,summary,issuetype,status',
          },
        });
        const issue = response.data;

        return {
          exists: true,
          issueType: issue.fields.issuetype.name,
          summary: issue.fields.summary,
          key: issue.key,
        };
      } catch (error) {
        // If 404, issue doesn't exist
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return {
            exists: false,
            issueType: '',
            summary: '',
            key: issueKey,
          };
        }
        throw error;
      }
    });
  }

  /**
   * Batch validate multiple issues (for linking multiple issues)
   */
  async validateIssues(issueKeys: string[]): Promise<Map<string, StoryValidationResult>> {
    const results = new Map<string, StoryValidationResult>();
    
    // Validate in parallel with rate limiting
    const validations = issueKeys.map(key => 
      this.limiter(async () => {
        const result = await this.validateIssue(key);
        results.set(key, result);
      })
    );

    await Promise.all(validations);
    return results;
  }

  // ==================== Test Operations ====================

  async createTest(input: CreateTestInput): Promise<CreateIssueResponse> {
    return this.limiter(async () => {
      const fields: Record<string, unknown> = {
        project: { key: this.projectKey },
        issuetype: { name: 'Test' },
        summary: input.summary,
        [CUSTOM_FIELDS.TEST_TYPE]: { value: input.testType },
      };

      if (input.description) fields.description = input.description;
      if (input.priority) fields.priority = { id: input.priority };
      if (input.assignee) fields.assignee = { name: input.assignee };
      if (input.reporter) fields.reporter = { name: input.reporter };
      if (input.labels && input.labels.length > 0) fields.labels = input.labels;
      if (input.components && input.components.length > 0) {
        // Components sent as { name: "..." } - same pattern as labels
        fields.components = input.components.map(c => ({ name: c }));
      }
      if (input.fixVersions) {
        fields.fixVersions = input.fixVersions.map(v => ({ name: v }));
      }
      if (input.dueDate) fields.duedate = input.dueDate;

      const response = await this.client.post('/rest/api/2/issue', { fields });
      return response.data;
    });
  }

  /**
   * FIX #2: Add test step - FIXED DUPLICATION ISSUE
   * 
   * ROOT CAUSE: PUT request replaces ALL steps, not adds one step
   * SOLUTION: Use POST to create single step, not PUT
   */
  async addTestStep(testKey: string, step: TestStepInput): Promise<void> {
    return this.limiter(async () => {
      // Use POST to add single step (not PUT which replaces all)
      await this.client.put(
        `/rest/raven/1.0/api/test/${testKey}/step`,
        {
          step: step.step,
          data: step.data,
          result: step.result,
        }
      );
    });
  }

  /**
   * Get all test steps for a test (useful for verification)
   */
  async getTestSteps(testKey: string): Promise<TestStepInput[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/raven/1.0/api/test/${testKey}/step`);
      return response.data || [];
    });
  }

  async createTestSet(input: CreateTestSetInput): Promise<CreateIssueResponse> {
    return this.limiter(async () => {
      const fields: Record<string, unknown> = {
        project: { key: this.projectKey },
        issuetype: { name: 'Test Set' },
        summary: input.summary,
      };

      if (input.description) fields.description = input.description;
      if (input.priority) fields.priority = { id: input.priority };
      if (input.assignee) fields.assignee = { name: input.assignee };
      if (input.reporter) fields.reporter = { name: input.reporter };
      if (input.labels) fields.labels = input.labels;

      const response = await this.client.post('/rest/api/2/issue', { fields });
      return response.data;
    });
  }

  async addTestsToSet(testSetKey: string, testKeys: string[]): Promise<void> {
    return this.limiter(async () => {
      await this.client.put(`/rest/api/2/issue/${testSetKey}`, {
        fields: {
          [CUSTOM_FIELDS.TESTS_IN_SET]: testKeys,
        },
      });
    });
  }

  async createTestExecution(input: CreateTestExecutionInput): Promise<CreateIssueResponse> {
    return this.limiter(async () => {
      const fields: Record<string, unknown> = {
        project: { key: this.projectKey },
        issuetype: { name: 'Test Execution' },
        summary: input.summary,
      };

      if (input.description) fields.description = input.description;
      if (input.fixVersions) {
        fields.fixVersions = input.fixVersions.map(v => ({ name: v }));
      }
      if (input.assignee) fields.assignee = { name: input.assignee };
      if (input.reporter) fields.reporter = { name: input.reporter };
      if (input.labels) fields.labels = input.labels;

      const response = await this.client.post('/rest/api/2/issue', { fields });
      return response.data;
    });
  }

  async addTestsToExecution(executionKey: string, testKeys: string[]): Promise<void> {
    return this.limiter(async () => {
      await this.client.put(`/rest/api/2/issue/${executionKey}`, {
        fields: {
          [CUSTOM_FIELDS.TESTS_IN_EXECUTION]: testKeys,
        },
      });
    });
  }

  async linkIssues(linkType: string, inwardKey: string, outwardKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.post('/rest/api/2/issueLink', {
        type: { name: linkType },
        inwardIssue: { key: inwardKey },
        outwardIssue: { key: outwardKey },
      });
    });
  }

  async searchTestsByLabel(label: string): Promise<string[]> {
    return this.limiter(async () => {
      const jql = `project = ${this.projectKey} AND issuetype = Test AND labels = "${label}"`;
      const response = await this.client.get('/rest/api/2/search', {
        params: {
          jql,
          fields: 'key',
          maxResults: 100,
        },
      });

      return response.data.issues.map((issue: any) => issue.key);
    });
  }

  async getTestsByKeys(keys: string[]): Promise<{ key: string; summary: string }[]> {
    return this.limiter(async () => {
      const jql = `key in (${keys.join(',')})`;
      const response = await this.client.get('/rest/api/2/search', {
        params: {
          jql,
          fields: 'key,summary',
          maxResults: keys.length,
        },
      });

      return response.data.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
      }));
    });
  }

  async linkToTestPlan(executionKey: string, testPlanKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.put(`/rest/api/2/issue/${executionKey}`, {
        fields: {
          [CUSTOM_FIELDS.TEST_PLANS_LINK]: [testPlanKey],
        },
      });
    });
  }

  // ==================== Metadata APIs ====================
  
  async getProject(projectKey: string): Promise<any> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/project/${projectKey}`);
      return response.data;
    });
  }

  async getIssueLinkTypes(): Promise<any[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/2/issueLinkType');
      return response.data;
    });
  }

  async getIssueTypes(): Promise<any[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/issuetype`);
      return response.data;
    });
  }

  async getIssueScheme(testKey: string): Promise<any> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/issue/${testKey}`);
      return response.data;
    });
  }

  async getCreateMetaByTypeId(typeId: string): Promise<any> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/issue/createmeta/${this.projectKey}/issuetypes/${typeId}`);
      return response.data;
    });
  }

  async getAllFields(): Promise<any[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/2/field');
      return response.data;
    });
  }

  async getPriorities(): Promise<Priority[]> {
    if (this.metadataService.isCacheReady()) {
      const cached = this.metadataService.getPriorities();
      if (cached.length > 0) return cached;
    }

    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/2/priority');
      return response.data;
    });
  }

  async getLabelSuggestions(query: string = ''): Promise<LabelSuggestion[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/1.0/labels/suggest', {
        params: { query },
      });
      return response.data.suggestions || [];
    });
  }

  async getComponents(): Promise<Component[]> {
    if (this.metadataService.isCacheReady()) {
      const cached = this.metadataService.getComponents();
      if (cached.length > 0) return cached;
    }

    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/project/${this.projectKey}/components`);
      return response.data;
    });
  }

  /**
   * Get component suggestions by filtering project components by name query.
   * Returns names (not IDs) - same pattern as label suggestions.
   */
  async getComponentSuggestions(query: string): Promise<{ name: string }[]> {
    const allComponents = await this.getComponents();
    if (!query || query.length < 1) return allComponents.map(c => ({ name: c.name }));
    const q = query.toLowerCase();
    return allComponents
      .filter(c => c.name.toLowerCase().includes(q))
      .map(c => ({ name: c.name }));
  }

  async getVersions(): Promise<Version[]> {
    if (this.metadataService.isCacheReady()) {
      const cached = this.metadataService.getVersions();
      if (cached.length > 0) return cached;
    }

    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/project/${this.projectKey}/versions`);
      return response.data;
    });
  }

  // ==================== Xray Test Coverage APIs ====================

  async linkTestToStory(testKey: string, storyKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.put('/rest/raven/1.0/api/testcoverage', {
        test: testKey,
        add: [storyKey],
      });
    });
  }

  async unlinkTestFromStory(testKey: string, storyKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.put('/rest/raven/1.0/api/testcoverage', {
        test: testKey,
        remove: [storyKey],
      });
    });
  }

  async getTestStoryLinks(testKey: string): Promise<string[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/raven/1.0/api/test/${testKey}/testcoverage`);
      return response.data || [];
    });
  }

  // ==================== Helper Methods ====================

  getPriorityNameById(id: string): string {
    const priority = this.metadataService.getPriorityById(id);
    return priority?.name || id;
  }

  getComponentNameById(id: string): string {
    const component = this.metadataService.getComponentById(id);
    return component?.name || id;
  }

  // ==================== Error Handling ====================

  private handleError(error: AxiosError): never {
    if (error.response) {
      const status = error.response.status;
      const data: unknown = error.response.data;

      let errorMessage = 'Unknown Jira API error';
      
      if (
        typeof data === 'object' &&
        data !== null &&
        'errorMessages' in data &&
        Array.isArray((data as any).errorMessages) &&
        (data as any).errorMessages.length > 0
      ) {
        errorMessage = (data as any).errorMessages[0];
      } else if (
        typeof data === 'object' &&
        data !== null &&
        'errors' in data &&
        typeof (data as any).errors === 'object'
      ) {
        const errorValues = Object.values((data as any).errors);
        if (errorValues.length > 0) {
          errorMessage = errorValues.join(', ');
        }
      }

      if (status === 401) {
        throw this.createError(ErrorCode.AUTH_FAILED, 'Invalid credentials', errorMessage);
      } else if (status === 403) {
        throw this.createError(ErrorCode.FORBIDDEN, 'Access forbidden - check permissions', errorMessage);
      } else if (status === 404) {
        throw this.createError(ErrorCode.NOT_FOUND, 'Resource not found', errorMessage);
      } else if (status === 429) {
        throw this.createError(ErrorCode.RATE_LIMIT, 'Rate limit exceeded. Please wait and try again.', errorMessage);
      } else {
        throw this.createError(ErrorCode.JIRA_API_ERROR, `HTTP ${status}: ${errorMessage}`, data);
      }
    } else if (error.request) {
      throw this.createError(
        ErrorCode.NETWORK_ERROR,
        'Cannot connect to Jira. Check your network connection and Jira URL.',
        error.message
      );
    } else {
      throw this.createError(ErrorCode.UNKNOWN, 'An unexpected error occurred', error.message);
    }
  }

  private createError(code: ErrorCode, message: string, details?: unknown): AppError {
    return { code, message, details };
  }
}