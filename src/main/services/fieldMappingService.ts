/**
 * Field Mapping Service
 * Loads and provides field mapping configuration from fieldMapping.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface FieldConfig {
  jiraField: string;
  type: string;
  required: boolean;
  format?: any;
}

interface IssueTypeConfig {
  jiraIssueTypeName: string;
  xray?: Record<string, FieldConfig>;
}

interface FieldMapping {
  meta: {
    version: string;
    description: string;
    apiVersion: string;
  };
  common: Record<string, FieldConfig>;
  issueTypes: Record<string, IssueTypeConfig>;
}

export class FieldMappingService {
  private static mapping: FieldMapping | null = null;

  /**
   * Load field mapping from JSON file
   */
  private static loadMapping(): FieldMapping {
    if (this.mapping) {
      return this.mapping;
    }

    try {
      // Get the app base path (works in dev and production)
      const appPath = app.getAppPath();
      
      // Try multiple paths for dev and production
      const possiblePaths = [
        // Production: asar or app folder
        path.join(appPath, 'src/shared/fieldMapping.json'),
        // Dev mode
        path.join(appPath, '../src/shared/fieldMapping.json'),
        path.join(process.cwd(), 'src/shared/fieldMapping.json'),
        // Fallback to dist location
        path.join(__dirname, '../../src/shared/fieldMapping.json'),
        path.join(__dirname, '../../../src/shared/fieldMapping.json'),
      ];

      let fileContent: string | null = null;
      let usedPath: string | null = null;

      for (const mappingPath of possiblePaths) {
        try {
          if (fs.existsSync(mappingPath)) {
            fileContent = fs.readFileSync(mappingPath, 'utf-8');
            usedPath = mappingPath;
            break;
          }
        } catch (err) {
          // Try next path
          continue;
        }
      }

      if (!fileContent) {
        const triedPaths = possiblePaths.join('\n  ');
        throw new Error(
          `Could not find fieldMapping.json. Tried:\n  ${triedPaths}\n\n` +
          `App path: ${appPath}\n` +
          `__dirname: ${__dirname}\n` +
          `cwd: ${process.cwd()}`
        );
      }

      this.mapping = JSON.parse(fileContent);
      console.log('✅ Loaded field mapping from:', usedPath);
      return this.mapping!;
    } catch (error) {
      console.error('Failed to load field mapping:', error);
      throw error;
    }
  }

  /**
   * Get all field mappings
   */
  static getMapping(): FieldMapping {
    return this.loadMapping();
  }

  /**
   * Get common fields
   */
  static getCommonFields(): Record<string, FieldConfig> {
    const mapping = this.loadMapping();
    return mapping.common;
  }

  /**
   * Get fields for a specific issue type
   */
  static getIssueTypeFields(issueType: 'Test' | 'Test Set' | 'Test Execution'): Record<string, FieldConfig> {
    const mapping = this.loadMapping();
    const issueTypeConfig = mapping.issueTypes[issueType];
    
    if (!issueTypeConfig) {
      throw new Error(`Unknown issue type: ${issueType}`);
    }

    // Combine common fields with issue-type specific fields
    const allFields: Record<string, FieldConfig> = {
      ...mapping.common,
    };

    // Add Xray-specific fields
    if (issueTypeConfig.xray) {
      Object.entries(issueTypeConfig.xray).forEach(([key, value]) => {
        allFields[key] = value;
      });
    }

    return allFields;
  }

  /**
   * Get Jira field name from logical name
   */
  static getJiraFieldName(logicalName: string, issueType: 'Test' | 'Test Set' | 'Test Execution'): string | null {
    const fields = this.getIssueTypeFields(issueType);
    const field = fields[logicalName];
    return field ? field.jiraField : null;
  }

  /**
   * Check if a field is required
   */
  static isFieldRequired(logicalName: string, issueType: 'Test' | 'Test Set' | 'Test Execution'): boolean {
    const fields = this.getIssueTypeFields(issueType);
    const field = fields[logicalName];
    return field ? field.required : false;
  }

  /**
   * Get field type
   */
  static getFieldType(logicalName: string, issueType: 'Test' | 'Test Set' | 'Test Execution'): string | null {
    const fields = this.getIssueTypeFields(issueType);
    const field = fields[logicalName];
    return field ? field.type : null;
  }

  /**
   * Get field format/structure
   */
  static getFieldFormat(logicalName: string, issueType: 'Test' | 'Test Set' | 'Test Execution'): any {
    const fields = this.getIssueTypeFields(issueType);
    const field = fields[logicalName];
    return field?.format || null;
  }

  /**
   * Transform data to Jira format
   */
  static transformToJiraFormat(
    data: Record<string, any>,
    issueType: 'Test' | 'Test Set' | 'Test Execution'
  ): Record<string, any> {
    const fields = this.getIssueTypeFields(issueType);
    const jiraData: Record<string, any> = {};

    Object.entries(data).forEach(([logicalName, value]) => {
      const fieldConfig = fields[logicalName];
      
      if (!fieldConfig || value === undefined || value === null || value === '') {
        return;
      }

      const jiraFieldName = fieldConfig.jiraField;
      let transformedValue = value;

      // Transform based on type and format
      if (fieldConfig.format) {
        if (typeof fieldConfig.format === 'object' && !Array.isArray(fieldConfig.format)) {
          // Object format like { key: "string" } or { name: "string" }
          const formatKey = Object.keys(fieldConfig.format)[0];
          transformedValue = { [formatKey]: value };
        } else if (Array.isArray(fieldConfig.format)) {
          // Array format like [{ name: "string" }]
          if (Array.isArray(value)) {
            const formatKey = Object.keys(fieldConfig.format[0])[0];
            transformedValue = value.map((v: any) => ({ [formatKey]: v }));
          }
        }
      }

      jiraData[jiraFieldName] = transformedValue;
    });

    return jiraData;
  }
}