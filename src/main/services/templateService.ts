/**
 * Template Service - Handles template storage and interpolation
 * 
 * Features:
 * - String interpolation with {{variable}} syntax
 * - Built-in variables (date, time, user, project)
 * - Template validation
 * - Safe variable substitution (prevents injection)
 */

import {
  Template,
  AppliedTemplate,
  TemplateFields,
  AppError,
} from '../../shared/types.js';
import { ErrorCode, BUILT_IN_VARIABLES } from '../../shared/constants.js';

export class TemplateService {
  private currentUser: string;
  private currentProject: string;

  constructor(username: string, projectKey: string) {
    this.currentUser = username;
    this.currentProject = projectKey;
  }

  /**
   * Apply template with variable values
   */
  applyTemplate(template: Template, variableValues: Record<string, string>): AppliedTemplate {
    const fields = JSON.parse(JSON.stringify(template.fields)); // Deep clone

    // Add built-in variables
    const allVariables = {
      ...this.getBuiltInVariables(),
      ...variableValues,
    };

    // Interpolate all string fields recursively
    const interpolatedFields = this.interpolateObject(fields, allVariables);

    return {
      fields: interpolatedFields as TemplateFields,
    };
  }

  /**
   * Get built-in variable values
   */
  private getBuiltInVariables(): Record<string, string> {
    const now = new Date();
    
    return {
      date: now.toISOString().split('T')[0], // YYYY-MM-DD
      time: now.toTimeString().split(' ')[0].substring(0, 5), // HH:mm
      datetime: now.toISOString(),
      user: this.currentUser,
      project: this.currentProject,
    };
  }

  /**
   * Recursively interpolate variables in an object
   */
  private interpolateObject(obj: unknown, variables: Record<string, string>): unknown {
    if (typeof obj === 'string') {
      return this.interpolateString(obj, variables);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, variables));
    } else if (obj !== null && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const key in obj as Record<string, unknown>) {
        result[key] = this.interpolateObject((obj as Record<string, unknown>)[key], variables);
      }
      return result;
    }
    return obj;
  }

  /**
   * Interpolate variables in a string
   * Example: "Test - {{name}}" with {name: "Login"} => "Test - Login"
   */
  private interpolateString(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      const value = variables[variableName];
      
      if (value === undefined) {
        // Variable not provided, keep the placeholder
        return match;
      }
      
      // Sanitize value to prevent injection
      return this.sanitizeValue(value);
    });
  }

  /**
   * Sanitize variable value to prevent injection attacks
   */
  private sanitizeValue(value: string): string {
    // Remove any potential script tags or dangerous characters
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  /**
   * Validate template structure
   */
  static validateTemplate(template: Template): AppError | null {
    // Check required fields
    if (!template.name || template.name.trim().length === 0) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Template name is required',
      };
    }

    if (!template.issueType) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Template issue type is required',
      };
    }

    if (!template.fields || !template.fields.summary) {
      return {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Template must have a summary field',
      };
    }

    // Validate variables
    if (template.variables) {
      for (const variable of template.variables) {
        if (!variable.name || !variable.label) {
          return {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Each template variable must have a name and label',
          };
        }

        // Check for reserved variable names
        const builtInNames = Object.keys(BUILT_IN_VARIABLES).map(k => k.toLowerCase());
        if (builtInNames.includes(variable.name.toLowerCase())) {
          return {
            code: ErrorCode.VALIDATION_ERROR,
            message: `Variable name "${variable.name}" is reserved. Use a different name.`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract variables from template strings
   * Example: "Test - {{name}} - {{date}}" => ["name", "date"]
   */
  static extractVariables(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];

    return matches.map(match => {
      const variableName = match.replace(/\{\{|\}\}/g, '');
      return variableName;
    });
  }

  /**
   * Check if a template uses a specific variable
   */
  static usesVariable(template: Template, variableName: string): boolean {
    const templateStr = JSON.stringify(template.fields);
    return templateStr.includes(`{{${variableName}}}`);
  }
}