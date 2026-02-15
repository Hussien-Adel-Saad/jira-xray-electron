/**
 * DynamicField Component
 * Renders a field dynamically based on its configuration
 */

import React from 'react';
import {
  FieldConfig,
  FieldTypeDetector,
  FieldValueTransformer,
  getFieldLabel,
  getFieldPlaceholder,
} from '../utils/dynamicFields';

interface DynamicFieldProps {
  logicalName: string;
  config: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  options?: Array<{ id: string; name: string }>;
  disabled?: boolean;
  className?: string;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({
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

  const handleChange = (newValue: any) => {
    const jiraValue = FieldValueTransformer.toJira(newValue, config);
    onChange(jiraValue);
  };

  // Text Field
  if (FieldTypeDetector.isTextField(config)) {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="text"
          value={uiValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  // Text Area
  if (FieldTypeDetector.isTextArea(config)) {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          value={uiValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  // Date Field
  if (FieldTypeDetector.isDateField(config)) {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="date"
          value={uiValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
      </div>
    );
  }

  // Select Field (Single)
  if (FieldTypeDetector.isSelectField(config) && options.length > 0) {
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <select
          value={uiValue || ''}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Multi-Select Field
  if (FieldTypeDetector.isMultiSelectField(config) && options.length > 0) {
    const selectedValues = Array.isArray(uiValue) ? uiValue : [];
    
    return (
      <div className={className}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative group">
          <div className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg min-h-[42px] flex flex-wrap gap-1 bg-white">
            {selectedValues.length === 0 && (
              <span className="text-gray-400">Select...</span>
            )}
            {selectedValues.map((val: string) => {
              const option = options.find((o) => o.id === val);
              return option ? (
                <span
                  key={val}
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1"
                >
                  {option.name}
                  <button
                    type="button"
                    onClick={() => {
                      const newValues = selectedValues.filter((v) => v !== val);
                      handleChange(newValues);
                    }}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
          {!disabled && (
            <div className="absolute hidden group-hover:block z-10 w-full bg-white border shadow-lg rounded-lg max-h-48 overflow-y-auto mt-1">
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.id);
                return (
                  <div
                    key={option.id}
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter((v) => v !== option.id)
                        : [...selectedValues, option.id];
                      handleChange(newValues);
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex justify-between ${
                      isSelected ? 'bg-blue-50 text-blue-700 font-medium' : ''
                    }`}
                  >
                    {option.name}
                    {isSelected && <span>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Array Field (simple string array)
  if (FieldTypeDetector.isArrayField(config)) {
    const arrayValues = Array.isArray(uiValue) ? uiValue : [];
    const [inputValue, setInputValue] = React.useState('');

    const handleAdd = () => {
      if (inputValue.trim()) {
        const newValues = [...arrayValues, inputValue.trim()];
        handleChange(newValues);
        setInputValue('');
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
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder={`Add ${label.toLowerCase()}...`}
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
          </div>
          {arrayValues.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {arrayValues.map((item: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                >
                  {item}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="ml-2 hover:text-purple-900"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: render as text input
  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        value={String(uiValue || '')}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
    </div>
  );
};