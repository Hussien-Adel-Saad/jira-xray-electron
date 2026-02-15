/**
 * Select Component
 * Reusable dropdown select
 */

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[] | string[];
  required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  required,
  className = '',
  ...props
}) => {
  const normalizedOptions = Array.isArray(options)
    ? typeof options[0] === 'string'
      ? (options as string[]).map((opt) => ({ value: opt, label: opt }))
      : (options as { value: string; label: string }[])
    : [];

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        {...props}
      >
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};