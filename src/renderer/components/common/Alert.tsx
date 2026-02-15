/**
 * Alert Component
 * Reusable alert for errors, success, info
 */

import React from 'react';

interface AlertProps {
  type?: 'error' | 'success' | 'info' | 'warning';
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  onDismiss,
  className = '',
}) => {
  const typeClasses = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div className={`p-3 border rounded ${typeClasses[type]} ${className}`}>
      <div className="flex justify-between items-start">
        <p className="text-sm flex-1">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-sm font-medium underline hover:no-underline"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};