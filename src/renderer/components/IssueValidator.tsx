/**
 * IssueValidator Component
 * Smart validation for issue keys with real-time feedback
 * 
 * Features:
 * - Real-time validation as user types
 * - Batch validation for multiple issues
 * - Visual feedback (valid/invalid/loading)
 * - Displays issue summary when valid
 * - Compact, modern UI
 */

import React, { useState, useEffect } from 'react';
import api from '../api/electron';
import type { StoryValidationResult } from '../../shared/types';

interface IssueValidatorProps {
  value: string;
  onChange: (value: string) => void;
  onValidation: (result: StoryValidationResult | null) => void;
  placeholder?: string;
  label?: string;
  allowedTypes?: string[]; // e.g., ['Test Plan', 'Story']
  required?: boolean;
  className?: string;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export const IssueValidator: React.FC<IssueValidatorProps> = ({
  value,
  onChange,
  onValidation,
  placeholder = 'MTD-12345',
  label,
  allowedTypes,
  required = false,
  className = '',
}) => {
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validationResult, setValidationResult] = useState<StoryValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Debounced validation
  useEffect(() => {
    if (!value || value.trim().length === 0) {
      setValidationState('idle');
      setValidationResult(null);
      setErrorMessage('');
      onValidation(null);
      return;
    }

    // Check format first (fast, no API call)
    const issueKeyPattern = /^[A-Z]+-\d+$/;
    if (!issueKeyPattern.test(value.toUpperCase())) {
      setValidationState('idle');
      return;
    }

    // Debounce API validation
    const timeoutId = setTimeout(() => {
      validateIssue(value.toUpperCase());
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [value]);

  const validateIssue = async (issueKey: string) => {
    setValidationState('validating');
    setErrorMessage('');

    try {
      const result = await api.validateStory(issueKey);
      
      if (result.success && result.data.exists) {
        const issueData = result.data;
        
        // Check if issue type is allowed
        if (allowedTypes && !allowedTypes.includes(issueData.issueType)) {
          setValidationState('invalid');
          setErrorMessage(`Expected ${allowedTypes.join(' or ')}, got ${issueData.issueType}`);
          setValidationResult(null);
          onValidation(null);
          return;
        }

        setValidationState('valid');
        setValidationResult(issueData);
        setErrorMessage('');
        onValidation(issueData);
      } else {
        setValidationState('invalid');
        setErrorMessage('Issue not found');
        setValidationResult(null);
        onValidation(null);
      }
    } catch (error) {
      setValidationState('invalid');
      setErrorMessage('Validation failed');
      setValidationResult(null);
      onValidation(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
  };

  const handleClear = () => {
    onChange('');
    setValidationState('idle');
    setValidationResult(null);
    setErrorMessage('');
    onValidation(null);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full px-4 py-2 pr-10 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
            validationState === 'valid'
              ? 'border-green-500 focus:ring-green-500 bg-green-50'
              : validationState === 'invalid'
              ? 'border-red-500 focus:ring-red-500 bg-red-50'
              : validationState === 'validating'
              ? 'border-blue-500 focus:ring-blue-500'
              : 'border-gray-300 focus:ring-blue-500'
          }`}
        />

        {/* Status Icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validationState === 'validating' && (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
          {validationState === 'valid' && (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {validationState === 'invalid' && (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Clear Button */}
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Validation Feedback */}
      {validationState === 'valid' && validationResult && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-green-900">{validationResult.key}</div>
              <div className="text-green-700 truncate">{validationResult.summary}</div>
              <div className="text-green-600 text-xs mt-1">Type: {validationResult.issueType}</div>
            </div>
          </div>
        </div>
      )}

      {validationState === 'invalid' && errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {validationState === 'validating' && (
        <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Validating...</span>
        </div>
      )}
    </div>
  );
};

/**
 * MultiIssueValidator Component
 * For validating multiple issue keys (comma-separated)
 */
interface MultiIssueValidatorProps {
  value: string[];
  onChange: (value: string[]) => void;
  onValidation: (results: Map<string, StoryValidationResult>) => void;
  placeholder?: string;
  label?: string;
  allowedTypes?: string[];
  className?: string;
}

export const MultiIssueValidator: React.FC<MultiIssueValidatorProps> = ({
  value,
  onChange,
  onValidation,
  placeholder = 'MTD-100, MTD-101, MTD-102',
  label,
  className = '',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, StoryValidationResult>>(new Map());

  const handleAdd = async () => {
    if (!inputValue.trim()) return;

    const newKeys = inputValue
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(k => k.length > 0 && !value.includes(k));

    if (newKeys.length === 0) {
      setInputValue('');
      return;
    }

    // Add to list immediately
    onChange([...value, ...newKeys]);
    setInputValue('');

    // Validate in background
    setValidating(true);
    try {
      // Note: Need to implement batch validation in backend
      const results = new Map<string, StoryValidationResult>();
      
      for (const key of newKeys) {
        const result = await api.validateStory(key);
        if (result.success && result.data.exists) {
          results.set(key, result.data);
        }
      }

      const allResults = new Map([...validationResults, ...results]);
      setValidationResults(allResults);
      onValidation(allResults);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleRemove = (key: string) => {
    onChange(value.filter(k => k !== key));
    const newResults = new Map(validationResults);
    newResults.delete(key);
    setValidationResults(newResults);
    onValidation(newResults);
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={validating || !inputValue.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition-colors"
        >
          {validating ? 'Validating...' : 'Add'}
        </button>
      </div>

      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((key) => {
            const validation = validationResults.get(key);
            const isValid = validation?.exists;

            return (
              <div
                key={key}
                className={`flex justify-between items-center p-2 rounded-lg border transition-all ${
                  isValid
                    ? 'bg-green-50 border-green-200'
                    : validationResults.has(key)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{key}</span>
                    {isValid && validation && (
                      <span className="text-xs text-gray-600">({validation.issueType})</span>
                    )}
                  </div>
                  {isValid && validation && (
                    <div className="text-xs text-gray-600 truncate">{validation.summary}</div>
                  )}
                  {validationResults.has(key) && !isValid && (
                    <div className="text-xs text-red-600">Not found</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(key)}
                  className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};