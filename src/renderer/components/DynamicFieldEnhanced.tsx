/**
 * DynamicField Component - ENHANCED
 * Supports: Suggestions, Issue Key Validation, Rich Text, Code Editor
 */

import React, { useState, useEffect } from 'react';
import {
  FieldConfig,
  FieldTypeDetector,
  FieldValueTransformer,
  getFieldLabel,
  getFieldPlaceholder,
} from '../utils/dynamicFields';
import { SuggestionService, IssueKeyValidator } from '../../main/services/suggestionService'
import { RichTextEditor, CodeEditor } from './RichTextEditor';

interface DynamicFieldProps {
  logicalName: string;
  config: FieldConfig & {
    suggestionSource?: string;
    options?: string[];
    validateIssueKeys?: boolean;
    issueTypeFilter?: string[];
    richText?: boolean;
    codeEditor?: boolean;
    language?: string;
  };
  value: any;
  onChange: (value: any) => void;
  options?: Array<{ id: string; name: string }>;
  disabled?: boolean;
  className?: string;
}

export const DynamicFieldEnhanced: React.FC<DynamicFieldProps> = ({
  logicalName,
  config,
  value,
  onChange,
  options = [],
  disabled = false,
  className = '',
}) => {
  const label = getFieldLabel(logicalName);
  const placeholder = getFieldPlaceholder(logicalName, config);
  const uiValue = FieldValueTransformer.fromJira(value, config);

  const [suggestions, setSuggestions] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());
  const [validating, setValidating] = useState(false);

  const handleChange = (newValue: any) => {
    const jiraValue = FieldValueTransformer.toJira(newValue, config);
    onChange(jiraValue);
  };

  // Load suggestions when typing
  useEffect(() => {
    if (config.suggestionSource && inputValue.length >= 2) {
      loadSuggestions(inputValue);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, config.suggestionSource]);

  const loadSuggestions = async (query: string) => {
    const results = await SuggestionService.getSuggestions(
      config.suggestionSource!,
      query,
      config.options
    );
    setSuggestions(results);
    setShowSuggestions(results.length > 0);
  };

  // Validate issue keys
  const validateIssueKey = async (key: string) => {
    if (!config.validateIssueKeys) return;

    setValidating(true);
    const result = await IssueKeyValidator.validateIssueKey(
      key,
      config.issueTypeFilter
    );
    setValidating(false);

    if (!result.valid) {
      const newErrors = new Map(validationErrors);
      newErrors.set(key, result.error || 'Invalid issue key');
      setValidationErrors(newErrors);
    } else {
      const newErrors = new Map(validationErrors);
      newErrors.delete(key);
      setValidationErrors(newErrors);
    }

    return result;
  };

  // RICH TEXT EDITOR (for description)
  if (config.richText && config.type === 'text') {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <RichTextEditor
          value={uiValue || ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
        />
        {config.description && (
          <p className="mt-1 text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }

  // CODE EDITOR (for Gherkin, etc.)
  if (config.codeEditor && config.type === 'text') {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <CodeEditor
          value={uiValue || ''}
          onChange={handleChange}
          language={config.language as any}
          placeholder={placeholder}
          disabled={disabled}
        />
        {config.description && (
          <p className="mt-1 text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }

  // TEXT FIELD WITH SUGGESTIONS
  if (FieldTypeDetector.isTextField(config) && config.suggestionSource) {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            value={uiValue || ''}
            onChange={(e) => {
              handleChange(e.target.value);
              setInputValue(e.target.value);
            }}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    handleChange(suggestion.value);
                    setShowSuggestions(false);
                  }}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                >
                  <div className="font-medium">{suggestion.label}</div>
                  {typeof suggestion.description === 'string' && suggestion.description.length > 0 && (
                    <div className="text-xs text-gray-500">{suggestion.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {config.description && (
          <p className="mt-1 text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }

  // SELECT FIELD WITH OPTIONS (static or dynamic)
  if ((Array.isArray(options) && options.length > 0) || (Array.isArray(config.options) && config.options.length > 0)) {
    // Prefer options prop (dynamic), fallback to config.options (static)
    const selectOptions = (Array.isArray(options) && options.length > 0)
      ? options
      : (Array.isArray(config.options) && config.options.length > 0
        ? config.options.map((option: any) =>
            typeof option === 'string' ? { id: option, name: option } : option
          )
        : []);

    // Use FieldTypeDetector to determine select type
    const isMultiSelect = FieldTypeDetector.isMultiSelectField(config);
    const isSingleSelect = FieldTypeDetector.isSelectField(config);
    const selectValue = isMultiSelect
      ? (Array.isArray(uiValue) ? uiValue : [])
      : (uiValue ?? '');

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (isMultiSelect) {
        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
        handleChange(selected);
      } else {
        handleChange(e.target.value);
      }
    };

    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          value={selectValue}
          onChange={handleSelectChange}
          disabled={disabled}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          {...(isMultiSelect ? { multiple: true } : {})}
        >
          {!isMultiSelect && <option value="">Select...</option>}
          {selectOptions.map((option: any) => (
            <option key={option.id ?? option} value={option.id ?? option}>
              {option.name ?? option}
            </option>
          ))}
        </select>
        {config.description && (
          <p className="mt-1 text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }

  // ARRAY FIELD WITH ISSUE KEY VALIDATION
  if (FieldTypeDetector.isArrayField(config) && config.validateIssueKeys) {
    const arrayValues = Array.isArray(uiValue) ? uiValue : [];
    const [newKeyInput, setNewKeyInput] = useState('');

    const handleAddKey = async () => {
      const trimmedKey = newKeyInput.trim().toUpperCase();
      if (!trimmedKey) return;

      // Validate before adding
      const result = await validateIssueKey(trimmedKey);
      if (result && result.valid) {
        const newValues = [...arrayValues, trimmedKey];
        handleChange(newValues);
        setNewKeyInput('');
      }
    };

    const handleRemoveKey = (index: number) => {
      const keyToRemove = arrayValues[index];
      const newErrors = new Map(validationErrors);
      newErrors.delete(keyToRemove);
      setValidationErrors(newErrors);
      
      const newValues = arrayValues.filter((_: any, i: number) => i !== index);
      handleChange(newValues);
    };

    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyInput}
              onChange={(e) => setNewKeyInput(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleAddKey()}
              placeholder="Enter issue key (e.g., MTD-123)"
              disabled={disabled}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddKey}
              disabled={disabled || validating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {validating ? '⏳' : '+ Add'}
            </button>
          </div>

          {arrayValues.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {arrayValues.map((key: string, index: number) => {
                const hasError = validationErrors.has(key);
                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                      hasError
                        ? 'bg-red-50 border-red-300'
                        : 'bg-green-50 border-green-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-mono font-semibold text-sm">
                        {hasError ? '❌' : '✓'} {key}
                      </div>
                      {hasError && (
                        <div className="text-xs text-red-600 mt-1">
                          {validationErrors.get(key)}
                        </div>
                      )}
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(index)}
                        className="text-red-600 hover:text-red-800 font-bold text-lg ml-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {config.description && (
          <p className="mt-1 text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }

  // ARRAY FIELD WITH SUGGESTIONS (labels, etc.)
  if (FieldTypeDetector.isArrayField(config) && config.suggestionSource) {
    const arrayValues = Array.isArray(uiValue) ? uiValue : [];

    const handleAdd = () => {
      if (inputValue.trim()) {
        const newValues = [...arrayValues, inputValue.trim()];
        handleChange(newValues);
        setInputValue('');
        setSuggestions([]);
      }
    };

    const handleRemove = (index: number) => {
      const newValues = arrayValues.filter((_: any, i: number) => i !== index);
      handleChange(newValues);
    };

    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="space-y-2">
          <div className="relative flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={`Type to add ${label.toLowerCase()}...`}
              disabled={disabled}
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-16 top-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setInputValue(suggestion.value);
                      setShowSuggestions(false);
                    }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                  >
                    {suggestion.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {arrayValues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {arrayValues.map((item: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                >
                  {item}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="ml-2 hover:text-purple-900 font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
        {config.description && (
          <p className="mt-1 text-xs text-gray-500">{config.description}</p>
        )}
      </div>
    );
  }

  // FALLBACK: Use original DynamicField behavior
  // (For all other field types - text, select, multi-select, date, etc.)
  return <OriginalDynamicField {...{ logicalName, config, value, onChange, options, disabled, className }} />;
};

// Import the original DynamicField component logic here or keep it separate
// For brevity, I'm referencing it - you would include the full original implementation
const OriginalDynamicField = (props: any) => {
  // Example usage: show the field label and value
  return (
    <div>
      <strong>{props.logicalName}</strong>: {String(props.value)}
      {/* You can render more UI based on props.config, props.options, etc. */}
    </div>
  );
};