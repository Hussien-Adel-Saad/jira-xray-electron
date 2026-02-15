  // ...existing code...
/**
 * Jira Service - Handles all API communication with Jira/Xray
 * 
 * Features:
 * - Rate limiting (max 5 concurrent requests)
 * - Automatic retry on network errors
 * - Comprehensive error handling
 * - Request/response logging (sanitized)
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

export class JiraService {
    /**
     * Get project info by key
     */
    async getProject(projectKey: string): Promise<any> {
      return this.limiter(async () => {
        const response = await this.client.get(`/rest/api/2/project/${projectKey}`);
        return response.data;
      });
    }
  private client: AxiosInstance;
  private limiter = pLimit(RATE_LIMITS.MAX_CONCURRENT_REQUESTS);
  private baseUrl: string;
  private projectKey: string;
  private basicAuth: string;

  constructor(baseUrl: string, projectKey: string, basicAuth: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.projectKey = projectKey;
    this.basicAuth = basicAuth;

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

  // ==================== Test Operations ====================

  /**
   * Create a Test issue with all fields
   */
  async createTest(input: CreateTestInput): Promise<CreateIssueResponse> {
    return this.limiter(async () => {
      const fields: Record<string, unknown> = {
        project: { key: this.projectKey },
        issuetype: { name: 'Test' },
        summary: input.summary,
        [CUSTOM_FIELDS.TEST_TYPE]: { value: input.testType },
      };

      if (input.description) fields.description = input.description;
      // Priority should be sent as ID, not name
      if (input.priority) fields.priority = { id: input.priority };
      if (input.assignee) fields.assignee = { name: input.assignee };
      if (input.reporter) fields.reporter = { name: input.reporter };
      if (input.labels && input.labels.length > 0) fields.labels = input.labels;
      if (input.components && input.components.length > 0) {
        fields.components = input.components.map(c => ({ id: c }));
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
   * Add a test step to a Test issue (Xray API)
   */
  async addTestStep(testKey: string, step: TestStepInput): Promise<void> {
    return this.limiter(async () => {
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
   * Create Test Set
   */
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

  /**
   * Add tests to Test Set
   */
  async addTestsToSet(testSetKey: string, testKeys: string[]): Promise<void> {
    return this.limiter(async () => {
      await this.client.put(`/rest/api/2/issue/${testSetKey}`, {
        fields: {
          [CUSTOM_FIELDS.TESTS_IN_SET]: testKeys,
        },
      });
    });
  }

  /**
   * Create Test Execution
   */
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

  /**
   * Add tests to Test Execution
   */
  async addTestsToExecution(executionKey: string, testKeys: string[]): Promise<void> {
    return this.limiter(async () => {
      await this.client.put(`/rest/api/2/issue/${executionKey}`, {
        fields: {
          [CUSTOM_FIELDS.TESTS_IN_EXECUTION]: testKeys,
        },
      });
    });
  }

  /**
   * Link two issues together
   */
  async linkIssues(linkType: string, inwardKey: string, outwardKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.post('/rest/api/2/issueLink', {
        type: { name: linkType },
        inwardIssue: { key: inwardKey },
        outwardIssue: { key: outwardKey },
      });
    });
  }

  /**
   * Validate that an issue exists and get its details
   */
  async validateIssue(issueKey: string): Promise<StoryValidationResult> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/issue/${issueKey}`);
      const issue = response.data;

      return {
        exists: true,
        issueType: issue.fields.issuetype.name,
        summary: issue.fields.summary,
        key: issue.key,
      };
    });
  }

  /**
   * Search tests by label
   */
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

  /**
   * Get tests by keys (validate they exist)
   */
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

  /**
   * Link execution to test plan
   */
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
  /**
   * Get all issue link types
   */
  async getIssueLinkTypes(): Promise<any[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/2/issueLinkType');
      return response.data;
    });
  }

  /**
   * Get all issue types for the project
   */
  async getIssueTypes(): Promise<any[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/issuetype`);
      return response.data;
    });
  }

  /**
   * Get issue scheme for a test (fields, etc.)
   */
  async getIssueScheme(testKey: string): Promise<any> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/issue/${testKey}`);
      return response.data;
    });
  }

  /**
   * Get metadata for a specific issue type using ID
   */
  async getCreateMetaByTypeId(typeId: string): Promise<any> {
    return this.limiter(async () => {
      // Use the working endpoint: /rest/api/2/issue/createmeta/{projectKey}/issuetypes/{typeId}
      const response = await this.client.get(`/rest/api/2/issue/createmeta/${this.projectKey}/issuetypes/${typeId}`);
      return response.data;
    });
  }

  /**
   * Get all fields info
   */
  async getAllFields(): Promise<any[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/2/field');
      return response.data;
    });
  }

  // Remove any not working endpoints (testtypes, teststatuses, testrunstatuses, createmeta with expand)

  /**
   * Get all available priorities
   */
  async getPriorities(): Promise<Priority[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/2/priority');
      return response.data;
    });
  }

  /**
   * Get label suggestions (autocomplete)
   */
  async getLabelSuggestions(query: string = ''): Promise<LabelSuggestion[]> {
    return this.limiter(async () => {
      const response = await this.client.get('/rest/api/1.0/labels/suggest', {
        params: { query },
      });
      return response.data.suggestions || [];
    });
  }

  /**
   * Get all components for the project
   */
  async getComponents(): Promise<Component[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/project/${this.projectKey}/components`);
      return response.data;
    });
  }

  /**
   * Get all versions for the project
   */
  async getVersions(): Promise<Version[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/api/2/project/${this.projectKey}/versions`);
      return response.data;
    });
  }

  // ==================== Xray Test Coverage APIs ====================

  /**
   * Link a test to a story (Xray Test Coverage)
   */
  async linkTestToStory(testKey: string, storyKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.post('/rest/raven/1.0/api/testcoverage', {
        test: testKey,
        add: [storyKey],
      });
    });
  }

  /**
   * Unlink a test from a story (Xray Test Coverage)
   */
  async unlinkTestFromStory(testKey: string, storyKey: string): Promise<void> {
    return this.limiter(async () => {
      await this.client.post('/rest/raven/1.0/api/testcoverage', {
        test: testKey,
        remove: [storyKey],
      });
    });
  }

  /**
   * Get stories/requirements linked to a test (Xray Test Coverage)
   */
  async getTestStoryLinks(testKey: string): Promise<string[]> {
    return this.limiter(async () => {
      const response = await this.client.get(`/rest/raven/1.0/api/test/${testKey}/testcoverage`);
      return response.data || [];
    });
  }

  // ==================== Error Handling ====================

  private handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const data: unknown = error.response.data;

      let errorMessage = 'Unknown Jira API error';
      
      // Extract Jira error messages with type guards
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
      // Request was made but no response
      throw this.createError(
        ErrorCode.NETWORK_ERROR,
        'Cannot connect to Jira. Check your network connection and Jira URL.',
        error.message
      );
    } else {
      // Something else went wrong
      throw this.createError(ErrorCode.UNKNOWN, 'An unexpected error occurred', error.message);
    }
  }

  private createError(code: ErrorCode, message: string, details?: unknown): AppError {
    return { code, message, details };
  }
}