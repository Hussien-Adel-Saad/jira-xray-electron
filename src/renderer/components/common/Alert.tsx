/**
 * Alert Component - MODERNIZED
 * Clean, professional alerts with modern icons
 */

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

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
  const config = {
    error: {
      icon: XCircle,
      bgClass: 'bg-gradient-to-r from-red-50 to-rose-50',
      borderClass: 'border-red-300',
      textClass: 'text-red-900',
      iconClass: 'text-red-600',
      buttonClass: 'text-red-600 hover:text-red-800'
    },
    success: {
      icon: CheckCircle2,
      bgClass: 'bg-gradient-to-r from-green-50 to-emerald-50',
      borderClass: 'border-green-300',
      textClass: 'text-green-900',
      iconClass: 'text-green-600',
      buttonClass: 'text-green-600 hover:text-green-800'
    },
    info: {
      icon: Info,
      bgClass: 'bg-gradient-to-r from-blue-50 to-cyan-50',
      borderClass: 'border-blue-300',
      textClass: 'text-blue-900',
      iconClass: 'text-blue-600',
      buttonClass: 'text-blue-600 hover:text-blue-800'
    },
    warning: {
      icon: AlertCircle,
      bgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      borderClass: 'border-amber-300',
      textClass: 'text-amber-900',
      iconClass: 'text-amber-600',
      buttonClass: 'text-amber-600 hover:text-amber-800'
    },
  };

  const { icon: Icon, bgClass, borderClass, textClass, iconClass, buttonClass } = config[type];

  return (
    <div className={`p-4 border-l-4 rounded-r-xl shadow-sm ${bgClass} ${borderClass} ${className} animate-slideIn`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconClass}`} />
        <p className={`text-sm flex-1 font-medium ${textClass}`}>{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${buttonClass} transition-colors`}
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};