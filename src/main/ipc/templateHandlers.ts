/**
 * Template IPC Handlers
 * Handles template storage and application IPC communication
 */

import { ipcMain } from 'electron';
import { TemplateService } from '../services/templateService.js';
import { getCurrentSession } from './authHandlers.js';
import { IPC_CHANNELS, ErrorCode, VALIDATION_LIMITS } from '../../shared/constants.js';
import type {
  Template,
  TemplateApplication,
  AppliedTemplate,
  Result,
  AppError,
} from '../../shared/types.js';

// In-memory template storage (could be persisted to file later)
let templates: Template[] = getDefaultTemplates();

export function registerTemplateHandlers() {
  /**
   * Get all templates
   */
  ipcMain.handle(IPC_CHANNELS.GET_TEMPLATES, async (): Promise<Result<Template[]>> => {
    try {
      return { success: true, data: templates };
    } catch (error: unknown) {
      return { success: false, error: error as AppError };
    }
  });

  /**
   * Save template
   */
  ipcMain.handle(
    IPC_CHANNELS.SAVE_TEMPLATE,
    async (_, template: Template): Promise<Result<Template>> => {
      try {
        // Validate template
        const validationError = TemplateService.validateTemplate(template);
        if (validationError) {
          return { success: false, error: validationError };
        }

        // Check limit
        if (templates.length >= VALIDATION_LIMITS.MAX_TEMPLATES) {
          return {
            success: false,
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: `Maximum ${VALIDATION_LIMITS.MAX_TEMPLATES} templates allowed`,
            },
          };
        }

        // Check if template exists (update) or new (create)
        const existingIndex = templates.findIndex((t) => t.id === template.id);

        if (existingIndex >= 0) {
          // Update existing
          template.updatedAt = new Date().toISOString();
          templates[existingIndex] = template;
        } else {
          // Create new
          template.createdAt = new Date().toISOString();
          template.updatedAt = new Date().toISOString();
          templates.push(template);
        }

        return { success: true, data: template };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Delete template
   */
  ipcMain.handle(
    IPC_CHANNELS.DELETE_TEMPLATE,
    async (_, templateId: string): Promise<Result<void>> => {
      try {
        templates = templates.filter((t) => t.id !== templateId);
        return { success: true, data: undefined };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );

  /**
   * Apply template with variable values
   */
  ipcMain.handle(
    IPC_CHANNELS.APPLY_TEMPLATE,
    async (_, application: TemplateApplication): Promise<Result<AppliedTemplate>> => {
      try {
        const session = getCurrentSession();
        if (!session) {
          return {
            success: false,
            error: {
              code: ErrorCode.AUTH_FAILED,
              message: 'Not authenticated',
            },
          };
        }

        // Find template
        const template = templates.find((t) => t.id === application.templateId);
        if (!template) {
          return {
            success: false,
            error: {
              code: ErrorCode.NOT_FOUND,
              message: 'Template not found',
            },
          };
        }

        // Apply template
        const templateService = new TemplateService(session.username, session.projectKey);
        const applied = templateService.applyTemplate(template, application.variableValues);

        return { success: true, data: applied };
      } catch (error: unknown) {
        return { success: false, error: error as AppError };
      }
    }
  );
}

/**
 * Get default templates
 */
function getDefaultTemplates(): Template[] {

  return [
    // Add to existing templates array:

// Karate API Test
{
  id: 'karate-api-test',
  name: 'Karate API Test',
  issueType: 'Test',
  description: 'Template for Karate API testing',
  fields: {
    summary: 'Test - API - {{endpoint}} - {{method}}',
    description: 'API test for {{endpoint}} endpoint using {{method}} method',
    testType: 'Automated',
    priority: '{{priority}}',
  },
  variables: [
    { name: 'endpoint', label: 'API Endpoint', type: 'text', required: true, placeholder: '/api/users' },
    { name: 'method', label: 'HTTP Method', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    { name: 'priority', label: 'Priority', type: 'select', required: false, options: ['High', 'Medium', 'Low'], defaultValue: 'Medium' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
},

// Performance Test
{
  id: 'performance-test',
  name: 'Performance Test',
  issueType: 'Test',
  description: 'Template for performance testing',
  fields: {
    summary: 'Test - Performance - {{feature}} - {{loadType}}',
    description: 'Performance test for {{feature}} under {{loadType}} load',
    testType: 'Automated',
    priority: 'High',
  },
  variables: [
    { name: 'feature', label: 'Feature Name', type: 'text', required: true },
    { name: 'loadType', label: 'Load Type', type: 'select', required: true, options: ['Stress', 'Load', 'Spike', 'Endurance'] },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
},

// Regression Test Set
{
  id: 'regression-testset',
  name: 'Regression Test Set',
  issueType: 'TestSet',
  description: 'Template for regression test sets',
  fields: {
    summary: 'TestSet - Regression - {{release}}',
    description: 'Regression testing for release {{release}}',
    priority: 'High',
  },
  variables: [
    { name: 'release', label: 'Release Version', type: 'text', required: true, placeholder: 'v2.0' },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
},

// Smoke Test Set
{
  id: 'smoke-testset',
  name: 'Smoke Test Set',
  issueType: 'TestSet',
  description: 'Template for smoke test sets',
  fields: {
    summary: 'TestSet - SmokeTest - {{environment}}',
    description: 'Smoke tests for {{environment}} environment',
    priority: 'Highest',
  },
  variables: [
    { name: 'environment', label: 'Environment', type: 'select', required: true, options: ['UAT', 'Staging', 'Production'] },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
},

// Release Execution
{
  id: 'release-execution',
  name: 'Release Execution',
  issueType: 'TestExecution',
  description: 'Template for release test executions',
  fields: {
    summary: 'Execution - Release {{version}} - {{environment}}',
    description: 'Release testing for version {{version}} in {{environment}}',
  },
  variables: [
    { name: 'version', label: 'Release Version', type: 'text', required: true, placeholder: 'v2.0.1' },
    { name: 'environment', label: 'Environment', type: 'select', required: true, options: ['UAT', 'Staging', 'Production'] },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
},

// Hotfix Execution
{
  id: 'hotfix-execution',
  name: 'Hotfix Execution',
  issueType: 'TestExecution',
  description: 'Template for hotfix test executions',
  fields: {
    summary: 'Execution - Hotfix - {{ticketId}} - {{environment}}',
    description: 'Hotfix testing for {{ticketId}}',
  },
  variables: [
    { name: 'ticketId', label: 'Ticket ID', type: 'text', required: true, placeholder: 'MTD-12345' },
    { name: 'environment', label: 'Environment', type: 'select', required: true, options: ['UAT', 'Production'] },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
},
    {
      id: 'default-test',
      name: 'Standard Test',
      issueType: 'Test',
      description: 'Standard test case template',
      fields: {
        summary: 'Test - {{scenario}} - {{priority}}',
        description: 'Validates {{functionality}} in {{environment}}',
        testType: 'Manual',
        priority: 'Medium',
        labels: ['automated-test'],
      },
      variables: [
        {
          name: 'scenario',
          label: 'Test Scenario',
          type: 'text',
          required: true,
          placeholder: 'e.g., Valid Login, Invalid Password',
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          required: true,
          options: ['High', 'Medium', 'Low'],
          defaultValue: 'Medium',
        },
        {
          name: 'functionality',
          label: 'Functionality Being Tested',
          type: 'text',
          required: true,
          placeholder: 'e.g., user authentication',
        },
        {
          name: 'environment',
          label: 'Test Environment',
          type: 'select',
          required: false,
          options: ['UAT', 'Staging', 'Production'],
          defaultValue: 'UAT',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'default-testset',
      name: 'E2E Test Set',
      issueType: 'TestSet',
      description: 'End-to-end test set template',
      fields: {
        summary: 'TestSet - E2ETesting - {{feature}}',
        description: 'Test set for {{feature}} - Sprint {{sprint}}',
        priority: 'High',
        labels: ['e2e', 'regression'],
      },
      variables: [
        {
          name: 'feature',
          label: 'Feature Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Login Flow, Payment Processing',
        },
        {
          name: 'sprint',
          label: 'Sprint Number',
          type: 'text',
          required: false,
          placeholder: 'e.g., Sprint 10',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'default-execution',
      name: 'Sprint Execution',
      issueType: 'TestExecution',
      description: 'Sprint test execution template',
      fields: {
        summary: 'Execution - Sprint {{sprint}} - {{environment}}',
        description: 'Test execution for {{release}} in {{environment}}',
        environments: ['{{environment}}'],
        labels: ['sprint-{{sprint}}'],
      },
      variables: [
        {
          name: 'sprint',
          label: 'Sprint Number',
          type: 'text',
          required: true,
          placeholder: 'e.g., 10',
        },
        {
          name: 'environment',
          label: 'Environment',
          type: 'select',
          required: true,
          options: ['UAT', 'Staging', 'Production'],
          defaultValue: 'UAT',
        },
        {
          name: 'release',
          label: 'Release Version',
          type: 'text',
          required: false,
          placeholder: 'e.g., v2.5.0',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/**
 * Reset templates to default (for testing/reset)
 */
export function resetTemplates() {
  templates = getDefaultTemplates();
}