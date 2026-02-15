/**
 * Zod Validation Schemas
 * Validates data before submission
 */

import { z } from 'zod';

// Test Step Schema
export const TestStepSchema = z.object({
  step: z.string().min(1, 'Step description is required').max(1000),
  data: z.string().max(2000),
  result: z.string().min(1, 'Expected result is required').max(1000),
});

export type TestStepInput = z.infer<typeof TestStepSchema>;

// Test Case Schema
export const TestCaseSchema = z.object({
  summary: z.string().min(5, 'Summary must be at least 5 characters').max(255),
  description: z.string().max(5000).optional(),
  testType: z.enum(['Manual', 'Automated']),
  priority: z.string().optional(),
  assignee: z.string().email('Must be a valid email').optional().or(z.literal('')),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  fixVersions: z.array(z.string()).optional(),
  environments: z.array(z.string()).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().or(z.literal('')),
  steps: z.array(TestStepSchema).min(1, 'At least one step is required'),
});

export type TestCaseInput = z.infer<typeof TestCaseSchema>;

// Test Set Schema
export const TestSetSchema = z.object({
  summary: z.string().min(5, 'Summary must be at least 5 characters').max(255),
  description: z.string().max(5000).optional(),
  priority: z.string().optional(),
  assignee: z.string().email('Must be a valid email').optional().or(z.literal('')),
  labels: z.array(z.string()).optional(),
});

export type TestSetInput = z.infer<typeof TestSetSchema>;

// Test Execution Schema
export const TestExecutionSchema = z.object({
  summary: z.string().min(5, 'Summary must be at least 5 characters').max(255),
  description: z.string().max(5000).optional(),
  environments: z.array(z.string()).optional(),
  fixVersions: z.array(z.string()).optional(),
  assignee: z.string().email('Must be a valid email').optional().or(z.literal('')),
  labels: z.array(z.string()).optional(),
});

export type TestExecutionInput = z.infer<typeof TestExecutionSchema>;

// Login Schema
export const LoginSchema = z.object({
  username: z.string().email('Must be a valid email').min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  jiraBaseUrl: z.string().url('Must be a valid URL').refine(
    (url) => url.startsWith('https://'),
    'Jira URL must use HTTPS'
  ),
  projectKey: z.string().regex(/^[A-Z]+$/, 'Project key must be uppercase letters').min(2).max(10),
  rememberCredentials: z.boolean(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Story Key Schema
export const StoryKeySchema = z.string().regex(
  /^[A-Z]+-\d+$/,
  'Invalid issue key format (e.g., MTD-12345)'
);

// Template Variable Schema
export const TemplateVariableSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'date', 'select', 'number']),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

// Template Schema
export const TemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  issueType: z.enum(['Test', 'TestSet', 'TestExecution']),
  description: z.string().optional(),
  fields: z.record(z.any()),
  variables: z.array(TemplateVariableSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Validation helper function
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: { _: 'Unknown validation error' } };
  }
}