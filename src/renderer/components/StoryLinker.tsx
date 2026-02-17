/**
 * StoryLinker Component - PROPERLY FIXED
 * - Fixed onChange to actually update the value
 * - Allows typing in the input field
 */

import React, { useState } from 'react';
import { IssueValidator } from './IssueValidator';
import type { StoryValidationResult } from '../../shared/types';
import { Link2, AlertCircle } from 'lucide-react';

interface StoryLinkerProps {
  linkedStory: StoryValidationResult | null;
  onLink: (story: StoryValidationResult | null) => void;
  onSuccess: (message: string) => void;
}

export const StoryLinker: React.FC<StoryLinkerProps> = ({
  linkedStory,
  onLink,
  onSuccess,
}) => {
  // Local state for the input value
  const [inputValue, setInputValue] = useState('');

  const handleValidation = (result: StoryValidationResult | null) => {
    if (result && result.exists) {
      onLink(result);
      onSuccess(`Linked to ${result.key}`);
    } else {
      onLink(null);
    }
  };

  const handleChange = (value: string) => {
    setInputValue(value);
    if (!value) {
      onLink(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border-2 border-amber-200 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center">
          <Link2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900">Link to Story</h3>
          <p className="text-xs text-slate-600">Optional - Connect this to a user story</p>
        </div>
        <div className="px-2 py-1 bg-amber-100 border border-amber-300 rounded text-xs font-medium text-amber-700">
          Optional
        </div>
      </div>

      {/* Issue Validator */}
      <IssueValidator
        value={inputValue}
        onChange={handleChange}
        onValidation={handleValidation}
        placeholder="MTD-12345"
        allowedTypes={['Story', 'Bug', 'Task', 'Epic']}
        className="mb-0"
      />

      {/* Info Tip */}
      {!linkedStory && (
        <div className="mt-3 flex items-start gap-2 p-2 bg-amber-100/50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Linking helps track test coverage for your stories. Start typing an issue key to validate.
          </p>
        </div>
      )}
    </div>
  );
};