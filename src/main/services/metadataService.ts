/**
 * Metadata Service - Intelligent caching and field management
 * 
 * Features:
 * - Singleton pattern for app-wide metadata cache
 * - Smart field extraction from Jira create metadata
 * - Performance optimization with in-memory caching
 * - Security: No sensitive data cached, only structure
 */

import type {
  Priority,
  Component,
  Version,
  AppError,
} from '../../shared/types.js';
import { ErrorCode } from '../../shared/constants.js';

/**
 * Field descriptor - unified interface for all Jira fields
 */
export interface FieldDescriptor {
  key: string;                    // Field ID (e.g., 'summary', 'customfield_12345')
  name: string;                   // Display name
  type: string;                   // Jira type: string, array, user, option, etc.
  required: boolean;
  schema: {
    type: string;
    system?: string;
    custom?: string;
    items?: string;
  };
  allowedValues?: any[];          // For select/multi-select fields
  autoCompleteUrl?: string;       // For autocomplete fields
  defaultValue?: any;
  operations?: string[];          // Supported operations (e.g., ['set'])
  hasDefaultValue?: boolean;
}

/**
 * Issue type metadata with all fields
 */
export interface IssueTypeMetadata {
  id: string;
  name: string;
  fields: Map<string, FieldDescriptor>;
  requiredFields: string[];
}

/**
 * Metadata cache structure
 */
interface MetadataCache {
  issueTypes: Map<string, IssueTypeMetadata>;
  allFields: Map<string, FieldDescriptor>;  // All custom fields
  priorities: Priority[];
  components: Component[];
  versions: Version[];
  lastUpdated: Date;
}

/**
 * Singleton Metadata Service
 */
export class MetadataService {
  private static instance: MetadataService | null = null;
  private cache: MetadataCache | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MetadataService {
    if (!MetadataService.instance) {
      MetadataService.instance = new MetadataService();
    }
    return MetadataService.instance;
  }

  /**
   * Initialize cache with data from Jira
   */
  initializeCache(data: {
    issueTypes: any[];
    allFields: any[];
    priorities: Priority[];
    components: Component[];
    versions: Version[];
  }): void {
    this.cache = {
      issueTypes: new Map(),
      allFields: new Map(),
      priorities: data.priorities,
      components: data.components,
      versions: data.versions,
      lastUpdated: new Date(),
    };

    // Cache all custom fields
    for (const field of data.allFields) {
      this.cache.allFields.set(field.id, this.normalizeField(field));
    }

    console.log(`✅ Metadata cache initialized with ${data.issueTypes.length} issue types, ${data.allFields.length} fields`);
  }

  /**
   * Cache issue type metadata from create meta
   */
  cacheIssueTypeMetadata(issueTypeId: string, issueTypeName: string, createMeta: any): void {
    if (!this.cache) {
      throw this.createError(ErrorCode.UNKNOWN, 'Metadata cache not initialized');
    }

    const fields = new Map<string, FieldDescriptor>();
    const requiredFields: string[] = [];

    // Extract fields from create meta
    if (createMeta.values) {
      for (const field of createMeta.values) {
        const descriptor = this.normalizeField(field);
        fields.set(descriptor.key, descriptor);
        
        if (descriptor.required) {
          requiredFields.push(descriptor.key);
        }
      }
    }

    this.cache.issueTypes.set(issueTypeId, {
      id: issueTypeId,
      name: issueTypeName,
      fields,
      requiredFields,
    });

    console.log(`✅ Cached ${issueTypeName} metadata: ${fields.size} fields (${requiredFields.length} required)`);
  }

  /**
   * Get issue type metadata (cached)
   */
  getIssueTypeMetadata(issueTypeId: string): IssueTypeMetadata | null {
    if (!this.cache) return null;
    return this.cache.issueTypes.get(issueTypeId) || null;
  }

  /**
   * Get field descriptor by key
   */
  getFieldDescriptor(fieldKey: string): FieldDescriptor | null {
    if (!this.cache) return null;

    // Check all cached issue types
    for (const issueType of this.cache.issueTypes.values()) {
      const field = issueType.fields.get(fieldKey);
      if (field) return field;
    }

    // Check global fields
    return this.cache.allFields.get(fieldKey) || null;
  }

  /**
   * Get commonly used fields for an issue type (for UI display)
   */
  getCommonFields(issueTypeId: string): FieldDescriptor[] {
    const metadata = this.getIssueTypeMetadata(issueTypeId);
    if (!metadata) return [];

    // Common field keys we want to show by default
    const commonFieldKeys = [
      'summary',
      'description',
      'priority',
      'assignee',
      'reporter',
      'labels',
      'components',
      'fixVersions',
      'duedate',
      'environment',
      'customfield_13900', // Test Type
      'customfield_12425', // Environments
    ];

    const commonFields: FieldDescriptor[] = [];
    const requiredFields: FieldDescriptor[] = [];

    // First, add all required fields
    for (const key of metadata.requiredFields) {
      const field = metadata.fields.get(key);
      if (field && !commonFieldKeys.includes(key)) {
        requiredFields.push(field);
      }
    }

    // Then add common fields that exist
    for (const key of commonFieldKeys) {
      const field = metadata.fields.get(key);
      if (field) {
        commonFields.push(field);
      }
    }

    // Combine: required fields first, then common fields
    return [...requiredFields, ...commonFields];
  }

  /**
   * Get all fields for an issue type (for "Show More" feature)
   */
  getAllFields(issueTypeId: string): FieldDescriptor[] {
    const metadata = this.getIssueTypeMetadata(issueTypeId);
    if (!metadata) return [];

    return Array.from(metadata.fields.values());
  }

  /**
   * Get priorities (cached)
   */
  getPriorities(): Priority[] {
    return this.cache?.priorities || [];
  }

  /**
   * Get priority by ID
   */
  getPriorityById(id: string): Priority | null {
    return this.cache?.priorities.find(p => p.id === id) || null;
  }

  /**
   * Get priority by name
   */
  getPriorityByName(name: string): Priority | null {
    return this.cache?.priorities.find(p => p.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get components (cached)
   */
  getComponents(): Component[] {
    return this.cache?.components || [];
  }

  /**
   * Get component by ID
   */
  getComponentById(id: string): Component | null {
    return this.cache?.components.find(c => c.id === id) || null;
  }

  /**
   * Get versions (cached)
   */
  getVersions(): Version[] {
    return this.cache?.versions || [];
  }

  /**
   * Check if cache is initialized
   */
  isCacheReady(): boolean {
    return this.cache !== null;
  }

  /**
   * Clear cache (for testing or refresh)
   */
  clearCache(): void {
    this.cache = null;
    console.log('🗑️ Metadata cache cleared');
  }

  /**
   * Normalize field from Jira API to unified descriptor
   */
  private normalizeField(field: any): FieldDescriptor {
    const fieldId = field.fieldId || field.key || field.id;
    
    return {
      key: fieldId,
      name: field.name || fieldId,
      type: field.schema?.type || 'string',
      required: field.required || false,
      schema: field.schema || { type: 'string' },
      allowedValues: field.allowedValues,
      autoCompleteUrl: field.autoCompleteUrl,
      defaultValue: field.defaultValue,
      operations: field.operations,
      hasDefaultValue: field.hasDefaultValue,
    };
  }

  /**
   * Create standardized error
   */
  private createError(code: ErrorCode, message: string, details?: any): AppError {
    return { code, message, details };
  }
}