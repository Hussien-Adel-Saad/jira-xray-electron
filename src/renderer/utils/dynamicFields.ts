/**
 * Dynamic Field Renderer Utility
 * Helps render fields dynamically based on field mapping configuration
 */

export interface FieldConfig {
  jiraField: string;
  type: string;
  required: boolean;
  format?: any;
  description?: string;
}

export interface DynamicFieldProps {
  logicalName: string;
  config: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  options?: any[];  // For select/multi-select fields
  disabled?: boolean;
}

/**
 * Field type detector
 */
export class FieldTypeDetector {
  static isTextField(config: FieldConfig): boolean {
    return config.type === 'string' && !config.format;
  }

  static isTextArea(config: FieldConfig): boolean {
    // Description fields are typically text areas
    return config.type === 'string' && config.jiraField === 'description';
  }

  static isSelectField(config: FieldConfig): boolean {
    return config.type === 'object' && config.format && 
           (config.format.name === 'string' || config.format.id === 'string');
  }

  static isMultiSelectField(config: FieldConfig): boolean {
    return config.type === 'array' && 
           config.format && 
           Array.isArray(config.format) &&
           config.format.length > 0;
  }

  static isArrayField(config: FieldConfig): boolean {
    return config.type === 'array' && !config.format;
  }

  static isDateField(config: FieldConfig): boolean {
    return config.type === 'datetime' || config.jiraField === 'duedate';
  }

  static isObjectField(config: FieldConfig): boolean {
    return config.type === 'object' && config.format;
  }
}

/**
 * Value transformer - converts between UI format and Jira format
 */
export class FieldValueTransformer {
  /**
   * Transform from Jira format to UI format
   */
  static fromJira(value: any, config: FieldConfig): any {
    if (!value) return '';

    // Object with name/id
    if (config.format && typeof config.format === 'object' && !Array.isArray(config.format)) {
      const key = Object.keys(config.format)[0];
      return value[key] || value.id || value;
    }

    // Array of objects
    if (config.type === 'array' && Array.isArray(value)) {
      if (config.format && Array.isArray(config.format) && config.format.length > 0) {
        const key = Object.keys(config.format[0])[0];
        return value.map(item => item[key] || item.id || item);
      }
      return value;
    }

    return value;
  }

  /**
   * Transform from UI format to Jira format
   */
  static toJira(value: any, config: FieldConfig): any {
    if (!value || value === '') return undefined;

    // Object format like { name: "string" }
    if (config.format && typeof config.format === 'object' && !Array.isArray(config.format)) {
      const key = Object.keys(config.format)[0];
      return { [key]: value };
    }

    // Array format like [{ name: "string" }]
    if (config.type === 'array' && config.format && Array.isArray(config.format)) {
      if (!Array.isArray(value)) return undefined;
      const key = Object.keys(config.format[0])[0];
      return value.map(item => ({ [key]: item }));
    }

    return value;
  }
}

/**
 * Get field label from logical name
 */
export function getFieldLabel(logicalName: string): string {
  // Convert camelCase to Title Case
  return logicalName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Check if field should be hidden in UI
 */
export function shouldHideField(logicalName: string): boolean {
  // Hide project and issueType as they're set automatically
  const hiddenFields = ['project', 'issueType'];
  return hiddenFields.includes(logicalName);
}

/**
 * Get placeholder text for field
 */
export function getFieldPlaceholder(logicalName: string, _config: FieldConfig): string {
  const placeholders: Record<string, string> = {
    summary: 'Test - Login - Valid Credentials',
    description: 'Detailed description of the test case...',
    assignee: 'user@vodafone.com',
    environment: 'UAT, Staging, Production',
  };

  return placeholders[logicalName] || '';
}

/**
 * Sort fields for display order
 */
export function sortFieldsForDisplay(fields: Record<string, FieldConfig>): Array<[string, FieldConfig]> {
  const fieldOrder = [
    'summary',
    'description',
    'testType',
    'priority',
    'assignee',
    'reporter',
    'labels',
    'components',
    'fixVersions',
    'environment',
    'dueDate',
    // Xray fields
    'manualSteps',
    'cucumberTestType',
    'preconditions',
    'testSets',
    'testPlans',
    'tests',
    'testRunStatus',
    'executionStartDate',
    'executionEndDate',
    'revision',
  ];

  const entries = Object.entries(fields);
  
  return entries.sort((a, b) => {
    const indexA = fieldOrder.indexOf(a[0]);
    const indexB = fieldOrder.indexOf(b[0]);
    
    // If both are in the order list, sort by order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only A is in order, it comes first
    if (indexA !== -1) return -1;
    
    // If only B is in order, it comes first
    if (indexB !== -1) return 1;
    
    // Otherwise, alphabetical
    return a[0].localeCompare(b[0]);
  });
}