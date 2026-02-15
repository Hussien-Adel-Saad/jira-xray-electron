/**
 * Field Suggestion Service
 * Provides autocomplete suggestions for different field types
 */

import api from '../../renderer/api/electron';

export interface Suggestion {
  value: string;
  label: string;
  description?: string;
}

/**
 * Suggestion provider for different field types
 */
export class SuggestionService {
  private static labelCache: Map<string, Suggestion[]> = new Map();

  /**
   * Get suggestions based on field configuration
   */
  static async getSuggestions(
    suggestionSource: string,
    query: string = '',
    options?: string[]
  ): Promise<Suggestion[]> {
    switch (suggestionSource) {
      case 'static':
        return this.getStaticSuggestions(options || [], query);
      
      case 'labels':
        return this.getLabelSuggestions(query);
      
      case 'priorities':
      case 'components':
      case 'versions':
        // These are loaded via metadata, handled separately
        return [];
      
      default:
        return [];
    }
  }

  /**
   * Get static suggestions (from predefined options)
   */
  private static getStaticSuggestions(options: string[], query: string): Suggestion[] {
    const lowerQuery = query.toLowerCase();
    return options
      .filter(opt => opt.toLowerCase().includes(lowerQuery))
      .map(opt => ({
        value: opt,
        label: opt,
      }));
  }

  /**
   * Get label suggestions from Jira
   */
  private static async getLabelSuggestions(query: string): Promise<Suggestion[]> {
    if (query.length < 2) {
      return [];
    }

    // Check cache
    const cacheKey = query.toLowerCase();
    if (this.labelCache.has(cacheKey)) {
      return this.labelCache.get(cacheKey)!;
    }

    try {
      const result = await api.getLabelSuggestions(query);
      
      if (result.success) {
        const suggestions = result.data.map((item: any) => ({
          value: item.label || item,
          label: item.label || item,
        }));
        
        // Cache for 5 minutes
        this.labelCache.set(cacheKey, suggestions);
        setTimeout(() => this.labelCache.delete(cacheKey), 5 * 60 * 1000);
        
        return suggestions;
      }
    } catch (error) {
      console.error('Failed to get label suggestions:', error);
    }

    return [];
  }

  /**
   * Clear all caches
   */
  static clearCache() {
    this.labelCache.clear();
  }
}

/**
 * Issue Key Validator
 * Validates Jira issue keys
 */
export class IssueKeyValidator {
  private static validationCache: Map<string, { valid: boolean; issueType?: string; summary?: string }> = new Map();

  /**
   * Validate a single issue key
   */
  static async validateIssueKey(
    issueKey: string,
    expectedIssueTypes?: string[]
  ): Promise<{ valid: boolean; error?: string; issueType?: string; summary?: string }> {
    // Check format first
    if (!this.isValidKeyFormat(issueKey)) {
      return { valid: false, error: 'Invalid issue key format (expected: ABC-123)' };
    }

    // Check cache
    const cacheKey = issueKey.toUpperCase();
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      
      if (!cached.valid) {
        return { valid: false, error: 'Issue not found' };
      }
      
      if (expectedIssueTypes && !expectedIssueTypes.includes(cached.issueType!)) {
        return {
          valid: false,
          error: `Expected ${expectedIssueTypes.join(' or ')}, got ${cached.issueType}`,
          issueType: cached.issueType,
        };
      }
      
      return { valid: true, issueType: cached.issueType, summary: cached.summary };
    }

    // Validate via API
    try {
      const result = await api.validateStory(cacheKey);
      
      if (result.success && result.data.exists) {
        const issueType = result.data.issueType;
        const summary = result.data.summary;
        
        // Cache result
        this.validationCache.set(cacheKey, { valid: true, issueType, summary });
        
        // Check issue type if specified
        if (expectedIssueTypes && !expectedIssueTypes.includes(issueType)) {
          return {
            valid: false,
            error: `Expected ${expectedIssueTypes.join(' or ')}, got ${issueType}`,
            issueType,
            summary,
          };
        }
        
        return { valid: true, issueType, summary };
      } else {
        // Cache negative result
        this.validationCache.set(cacheKey, { valid: false });
        return { valid: false, error: (!result.success && result.error?.message) ? result.error.message : 'Issue not found' };
      }
    } catch (error: any) {
      return { valid: false, error: error.message || 'Validation failed' };
    }
  }

  /**
   * Validate multiple issue keys
   */
  static async validateIssueKeys(
    issueKeys: string[],
    expectedIssueTypes?: string[]
  ): Promise<Map<string, { valid: boolean; error?: string; issueType?: string; summary?: string }>> {
    const results = new Map();
    
    // Validate in parallel
    const validations = issueKeys.map(key => 
      this.validateIssueKey(key, expectedIssueTypes)
        .then(result => ({ key, result }))
    );
    
    const allResults = await Promise.all(validations);
    
    allResults.forEach(({ key, result }) => {
      results.set(key, result);
    });
    
    return results;
  }

  /**
   * Check if string matches issue key format
   */
  private static isValidKeyFormat(key: string): boolean {
    return /^[A-Z]+-\d+$/.test(key.toUpperCase());
  }

  /**
   * Clear validation cache
   */
  static clearCache() {
    this.validationCache.clear();
  }
}