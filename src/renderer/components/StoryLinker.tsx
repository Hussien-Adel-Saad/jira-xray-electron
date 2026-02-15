/**
 * StoryLinker Component
 * Reusable component for linking to stories
 */

import React, { useState } from 'react';
import type { StoryValidationResult } from '../../shared/types';
import api from '../api/electron';

interface StoryLinkerProps {
  linkedStory: StoryValidationResult | null;
  onLink: (story: StoryValidationResult | null) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export const StoryLinker: React.FC<StoryLinkerProps> = ({
  linkedStory,
  onLink,
  onError,
  onSuccess,
}) => {
  const [storyKey, setStoryKey] = useState('');
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    if (!storyKey.trim()) return;

    setValidating(true);
    onError('');

    const result = await api.validateStory(storyKey.trim());
    setValidating(false);

    if (result.success) {
      onLink(result.data);
      onSuccess(`Story validated: ${result.data.summary}`);
    } else {
      onError(result.error.message);
      onLink(null);
    }
  };

  const handleClear = () => {
    setStoryKey('');
    onLink(null);
  };

  return (
    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">🔗 Link to Story (Optional)</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={storyKey}
          onChange={(e) => setStoryKey(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && handleValidate()}
          placeholder="MTD-12345"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleValidate}
          disabled={validating || !storyKey.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {validating ? 'Validating...' : 'Validate'}
        </button>
        {linkedStory && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      
      {linkedStory && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          ✓ Linked to: <strong>{linkedStory.key}</strong> - {linkedStory.summary}
        </div>
      )}
    </div>
  );
};