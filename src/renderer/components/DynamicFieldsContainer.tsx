/**
 * DynamicFieldsContainer Component - AUTO-ENHANCED
 * Automatically uses enhanced fields when features are detected in config
 */

import React, { useEffect, useState } from 'react';
import api from '../api/electron';
import { DynamicField } from './DynamicField';
import { DynamicFieldEnhanced } from './DynamicFieldEnhanced';
import {
  FieldConfig,
  shouldHideField,
  sortFieldsForDisplay,
} from '../utils/dynamicFields';

interface DynamicFieldsContainerProps {
  issueType: 'Test' | 'Test Set' | 'Test Execution';
  formData: Record<string, any>;
  onChange: (field: string, value: any) => void;
  excludeFields?: string[];
  metadata?: {
    priorities?: Array<{ id: string; name: string }>;
    components?: Array<{ id: string; name: string }>;
    versions?: Array<{ id: string; name: string }>;
  };
}

export const DynamicFieldsContainer: React.FC<DynamicFieldsContainerProps> = ({
  issueType,
  formData,
  onChange,
  excludeFields = [],
  metadata = {},
}) => {
  const [fields, setFields] = useState<Record<string, FieldConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFields();
  }, [issueType]);

  const loadFields = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getIssueTypeFields(issueType);
      
      if (result.success) {
        setFields(result.data);
      } else {
        setError('Failed to load field configuration');
        console.error('Field mapping error:', result.error);
      }
    } catch (err) {
      setError('Failed to load field configuration');
      console.error('Field mapping error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="inline-flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Loading fields...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
        <p className="font-semibold">⚠️ {error}</p>
        <p className="text-sm mt-1">
          Please check fieldMapping.json configuration
        </p>
      </div>
    );
  }

  // Filter out excluded and hidden fields
  const sortedFields = sortFieldsForDisplay(fields).filter(([logicalName]) => {
    return !shouldHideField(logicalName) && !excludeFields.includes(logicalName);
  });

  if (sortedFields.length === 0) {
    return null;
  }

  // Get options for select fields, using allowedValues if present, otherwise fallback to metadata
  const getOptionsForField = (config: any): Array<{ id: string; name: string }> => {
    // Use allowedValues if present and non-empty
    if (Array.isArray(config.allowedValues) && config.allowedValues.length > 0) {
      // Normalize allowedValues to {id, name} shape if needed
      return config.allowedValues.map((v: any) => {
        if (typeof v === 'string') return { id: v, name: v };
        if (v.id && v.name) return v;
        if (v.value) return { id: v.value, name: v.value };
        return v;
      });
    }
    // Fallback to metadata for dynamic fields
    switch (config.jiraField) {
      case 'priority':
        return metadata.priorities || [];
      case 'components':
        return metadata.components || [];
      case 'fixVersions':
      case 'versions':
        return metadata.versions || [];
      default:
        return [];
    }
  };

  /**
   * Determine if field should use enhanced component
   */
  const shouldUseEnhanced = (config: any): boolean => {
    return !!(
      config.suggestionSource ||
      config.validateIssueKeys ||
      config.richText ||
      config.codeEditor
    );
  };

  return (
    <div className="space-y-4">
      {sortedFields.map(([logicalName, config]) => {
        // Skip manualSteps (handled separately as test steps)
        if (logicalName === 'manualSteps') {
          return null;
        }

        const options = getOptionsForField(config);
        
        // Use enhanced field if it has enhanced features
        const FieldComponent = shouldUseEnhanced(config) 
          ? DynamicFieldEnhanced 
          : DynamicField;

        return (
          <FieldComponent
            key={logicalName}
            logicalName={logicalName}
            config={config}
            value={formData[config.jiraField]}
            onChange={(value) => onChange(config.jiraField, value)}
            options={options}
          />
        );
      })}
    </div>
  );
};