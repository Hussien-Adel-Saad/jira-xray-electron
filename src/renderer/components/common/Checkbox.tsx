/**
 * Checkbox Component
 * Reusable checkbox with label
 */

import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
          {...props}
        />
        {label && <span className="ml-2 text-sm text-gray-700">{label}</span>}
      </label>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};