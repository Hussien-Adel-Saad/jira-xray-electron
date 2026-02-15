/**
 * Test IPC Handlers
 * Handles test creation and workflow IPC communication
 */

import { ipcMain } from 'electron';
import { JiraService } from '../services/jiraService.js';
import { getCurrentSession } from './authHandlers.js';
import { IPC_CHANNELS, ErrorCode } from '../../shared/constants.js';
import type {
  CreateTestInput,
  CreateTestSetInput,
  CreateTestExecutionInput,
  CreateIssueResponse,
  StoryValidationResult,
  WorkflowInput,
  WorkflowResult,
  Result,
  AppError,
  Priority,
  Component,
  Version,
  LabelSuggestion,
} from  '../../shared/types.js';

/**
 * Create Jira service from current session
 */
function getJiraService(): JiraService {
  const session = getCurrentSession();
  if (!session) {
    throw {
      code: ErrorCode.AUTH_FAILED,
      message: 'Not authenticated. Please log in first.',
    } as AppError;
  }

  return new JiraService(session.jiraBaseUrl, session.projectKey, session.basicAuth);
}

export function registerTestHandlers() {
        /**
         * Get all issue types
         */
        ipcMain.handle(
          IPC_CHANNELS.GET_ISSUE_TYPES,
          async (): Promise<Result<any[]>> => {
            try {
              const jiraService = getJiraService();
              const data = await jiraService.getIssueTypes();
              return { success: true, data };
            } catch (error: unknown) {
              return { success: false, error: error as AppError };
            }
          }
        );
    /**
     * Get all issue link types
     */
    ipcMain.handle(
      IPC_CHANNELS.GET_ISSUE_LINK_TYPES,
      async (): Promise<Result<any[]>> => {
        try {
          const jiraService = getJiraService();
          const data = await jiraService.getIssueLinkTypes();
          return { success: true, data };
        } catch (error: unknown) {
          return { success: false, error: error as AppError };
        }
      }
    );

    /**
     * Get project info by key
     */
    ipcMain.handle(
      IPC_CHANNELS.GET_PROJECT,
      async (_event, projectKey: string): Promise<Result<any>> => {
        try {
          const jiraService = getJiraService();
          const data = await jiraService.getProject(projectKey);
          return { success: true, data };
        } catch (error: unknown) {
          return { success: false, error: error as AppError };
        }
      }
    );

    /**
     * Get issue scheme for a test
     */
    ipcMain.handle(
      IPC_CHANNELS.GET_ISSUE_SCHEME,
      async (_event, testKey: string): Promise<Result<any>> => {
        try {
          const jiraService = getJiraService();
          const data = await jiraService.getIssueScheme(testKey);
          return { success: true, data };
        } catch (error: unknown) {
          return { success: false, error: error as AppError };
        }
      }
    );

    /**
     * Get create meta by issue type ID
     */
    ipcMain.handle(
      IPC_CHANNELS.GET_CREATE_META_BY_TYPE_ID,
      async (_event, typeId: string): Promise<Result<any>> => {
        try {
          const jiraService = getJiraService();
          const data = await jiraService.getCreateMetaByTypeId(typeId);
          return { success: true, data };
        } catch (error: unknown) {
          return { success: false, error: error as AppError };
        }
      }
    );

    /**
     * Get all fields info
     */
    ipcMain.handle(
      IPC_CHANNELS.GET_ALL_FIELDS,
      async (): Promise<Result<any[]>> => {
        try {
          const jiraService = getJiraService();
          const data = await jiraService.getAllFields();
          return { success: true, data };
        } catch (error: unknown) {
          return { success: false, error: error as AppError };
        }
      }
    );
  
  /**
   * Validate story exists
   */
  ipcMain.handle(
    IPC_CHANNELS.VALIDATE_STORY,
    async (_, storyKey: string): Promise<Result<StoryValidationResult>> => {
      try {
        const jiraService = getJiraService();
        const result = await jiraService.validateIssue(storyKey);
        return { success: true, data: result };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Get Priorities
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_PRIORITIES,
    async (): Promise<Result<Priority[]>> => {
      try {
        const jiraService = getJiraService();
        const data = await jiraService.getPriorities();
        return { success: true, data };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Get Components
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_COMPONENTS,
    async (): Promise<Result<Component[]>> => {
      try {
        const jiraService = getJiraService();
        const data = await jiraService.getComponents();
        return { success: true, data };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Get Versions
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_VERSIONS,
    async (): Promise<Result<Version[]>> => {
      try {
        const jiraService = getJiraService();
        const data = await jiraService.getVersions();
        return { success: true, data };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Get Label Suggestions
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_LABEL_SUGGESTIONS,
    async (_, query: string): Promise<Result<LabelSuggestion[]>> => {
      try {
        const jiraService = getJiraService();
        const data = await jiraService.getLabelSuggestions(query);
        return { success: true, data };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Create single test
   */
  ipcMain.handle(
    IPC_CHANNELS.CREATE_TEST,
    async (_, testInput: CreateTestInput): Promise<Result<CreateIssueResponse>> => {
      try {
        const jiraService = getJiraService();

        // Create test
        const test = await jiraService.createTest(testInput);

        // Add steps
        for (const step of testInput.steps) {
          await jiraService.addTestStep(test.key, step);
        }

        return { success: true, data: test };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Create test set
   */
  ipcMain.handle(
    IPC_CHANNELS.CREATE_TEST_SET,
    async (
      _,
      setInput: CreateTestSetInput,
      testKeys: string[]
    ): Promise<Result<CreateIssueResponse>> => {
      try {
        const jiraService = getJiraService();

        // Create set
        const testSet = await jiraService.createTestSet(setInput);

        // Add tests to set
        if (testKeys.length > 0) {
          await jiraService.addTestsToSet(testSet.key, testKeys);
        }

        return { success: true, data: testSet };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Add a test step to a specific test
   */
  ipcMain.handle(
    IPC_CHANNELS.ADD_TEST_STEP,
    async (_, testKey: string, step: any): Promise<Result<void>> => {
      try {
        const jiraService = getJiraService();
        await jiraService.addTestStep(testKey, step);
        return { success: true, data: undefined };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Create test execution
   */
  ipcMain.handle(
    IPC_CHANNELS.CREATE_EXECUTION,
    async (
      _,
      execInput: CreateTestExecutionInput,
      testKeys: string[]
    ): Promise<Result<CreateIssueResponse>> => {
      try {
        const jiraService = getJiraService();

        // Create execution
        const execution = await jiraService.createTestExecution(execInput);

        // Add tests to execution
        if (testKeys.length > 0) {
          await jiraService.addTestsToExecution(execution.key, testKeys);
        }

        return { success: true, data: execution };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Link issues
   */
  ipcMain.handle(
    IPC_CHANNELS.LINK_ISSUES,
    async (
      _,
      linkType: string,
      inwardKey: string,
      outwardKey: string
    ): Promise<Result<void>> => {
      try {
        const jiraService = getJiraService();
        await jiraService.linkIssues(linkType, inwardKey, outwardKey);
        return { success: true, data: undefined };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Add test to story test coverage (Xray)
   */
  ipcMain.handle(
    IPC_CHANNELS.LINK_TEST_TO_STORY,
    async (
      _,
      testKey: string,
      storyKey: string
    ): Promise<Result<void>> => {
      try {
        const jiraService = getJiraService();
        await jiraService.linkTestToStory(testKey, storyKey);
        return { success: true, data: undefined };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Remove test from story test coverage (Xray)
   */
  ipcMain.handle(
    IPC_CHANNELS.UNLINK_TEST_FROM_STORY,
    async (
      _,
      testKey: string,
      storyKey: string
    ): Promise<Result<void>> => {
      try {
        const jiraService = getJiraService();
        await jiraService.unlinkTestFromStory(testKey, storyKey);
        return { success: true, data: undefined };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Get test coverage for a test (Xray)
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_TEST_STORY_LINKS,
    async (
      _,
      testKey: string
    ): Promise<Result<string[]>> => {
      try {
        const jiraService = getJiraService();
        const links = await jiraService.getTestStoryLinks(testKey);
        return { success: true, data: links };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Execute complete workflow
   */
  ipcMain.handle(
    IPC_CHANNELS.EXECUTE_WORKFLOW,
    async (_, workflow: WorkflowInput): Promise<Result<WorkflowResult>> => {
      try {
        const jiraService = getJiraService();
        const createdTestKeys: string[] = [];

        // Step 1: Create all tests
        for (const testInput of workflow.tests) {
          const test = await jiraService.createTest(testInput);

          // Add steps
          for (const step of testInput.steps) {
            await jiraService.addTestStep(test.key, step);
          }

          // Link test to story using "Test" link type
          await jiraService.linkIssues('Test', test.key, workflow.storyKey);

          createdTestKeys.push(test.key);
        }

        // Step 2: Optionally create test set
        let testSetKey: string | undefined;
        if (workflow.testSet) {
          const testSet = await jiraService.createTestSet(workflow.testSet);
          await jiraService.addTestsToSet(testSet.key, createdTestKeys);
          await jiraService.linkIssues('Relates', testSet.key, workflow.storyKey);
          testSetKey = testSet.key;
        }

        // Step 3: Create test execution
        const execution = await jiraService.createTestExecution(workflow.execution);
        await jiraService.addTestsToExecution(execution.key, createdTestKeys);
        await jiraService.linkIssues('Relates', execution.key, workflow.storyKey);

        // Step 4: Optionally link to test plan
        if (workflow.testPlanKey) {
          await jiraService.linkIssues('Relates', execution.key, workflow.testPlanKey);
        }

        return {
          success: true,
          data: {
            testKeys: createdTestKeys,
            testSetKey,
            executionKey: execution.key,
            success: true,
            message: `Successfully created ${createdTestKeys.length} test(s), execution, and all links`,
          },
        };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Search tests by label
   */
  ipcMain.handle(
    IPC_CHANNELS.SEARCH_TESTS_BY_LABEL,
    async (_, label: string): Promise<Result<string[]>> => {
      try {
        const jiraService = getJiraService();
        const testKeys = await jiraService.searchTestsByLabel(label);
        return { success: true, data: testKeys };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Get tests by keys
   */
  ipcMain.handle(
    IPC_CHANNELS.GET_TESTS_BY_KEYS,
    async (_, keys: string[]): Promise<Result<{ key: string; summary: string }[]>> => {
      try {
        const jiraService = getJiraService();
        const tests = await jiraService.getTestsByKeys(keys);
        return { success: true, data: tests };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );
}