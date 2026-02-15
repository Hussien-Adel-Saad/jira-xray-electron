/**
 * PreviewPanel Component
 * Fully dynamic preview panel that shows all fields as user types
 */

import React, { useEffect, useState } from 'react';
import type { StoryValidationResult, CreateTestInput, CreateTestExecutionInput, CreateTestSetInput } from '../../shared/types';

interface PreviewPanelProps {
  title: string;
  currentTest: CreateTestInput | CreateTestExecutionInput | CreateTestSetInput;
  linkedStory?: StoryValidationResult | null;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ title, currentTest, linkedStory }) => {
  const [priorities, setPriorities] = useState<any[]>([]);

  useEffect(() => {
    if (window.electronAPI && typeof window.electronAPI.getPriorities === 'function') {
      window.electronAPI.getPriorities().then((result: any) => {
        if (result && result.success && Array.isArray(result.data)) {
          setPriorities(result.data);
        }
      });
    }
  }, []);

  const renderValue = (value: string | number | string[] | undefined) => {
    if (value === undefined || value === null || value === '') {
      return <span className="text-gray-400 italic">(empty)</span>;
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : <span className="text-gray-400 italic">(empty)</span>;
    }
    return String(value);
  };

  return (
    <div className="w-96 bg-gray-50 p-4 rounded-lg border border-gray-300 sticky top-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3 overflow-y-auto flex-1 pr-2"
           style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}
      >
        {/* Summary - Always highlight */}
        <div className="p-2 bg-blue-50 rounded">
          <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
            Summary
          </div>
          <div className="text-sm font-semibold text-blue-900">
            {renderValue(currentTest.summary)}
          </div>
        </div>

        {/* Description */}
        {currentTest.description && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Description
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.description)}
            </div>
          </div>
        )}

        {/* Test Type - for test cases */}
        {'testType' in currentTest && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Test Type
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.testType)}
            </div>
          </div>
        )}

        {/* Priority */}
        {'priority' in currentTest && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Priority
            </div>
            <div className="text-sm text-gray-900">
              {(() => {
                const priorityId = currentTest.priority;
                const found = priorities.find((p: any) => p.id === priorityId);
                if (found && found.name) return found.name;
                return renderValue(priorityId);
              })()}
            </div>
          </div>
        )}

        {/* Assignee */}
        {currentTest.assignee && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Assignee
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.assignee)}
            </div>
          </div>
        )}

        {/* Reporter */}
        {currentTest.reporter && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Reporter
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.reporter)}
            </div>
          </div>
        )}

        {/* Due Date - for test cases */}
        {'dueDate' in currentTest && currentTest.dueDate && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Due Date
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.dueDate)}
            </div>
          </div>
        )}

        {/* Labels */}
        {currentTest.labels && (currentTest.labels || []).length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Labels
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.labels)}
            </div>
          </div>
        )}

        {/* Steps count - for test cases */}
        {'steps' in currentTest && currentTest.steps && currentTest.steps.length > 0 && (
          <div className="p-2 bg-purple-50 rounded">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Test Steps
            </div>
            <div className="text-sm font-semibold text-purple-900">
              {currentTest.steps.length} step{currentTest.steps.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Components */}
        {'components' in currentTest && currentTest.components && (currentTest.components || []).length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Components
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.components)}
            </div>
          </div>
        )}

        {/* Environments */}
        {'environments' in currentTest && currentTest.environments && (currentTest.environments || []).length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Environments
            </div>
            <div className="text-sm text-gray-900">
              {renderValue(currentTest.environments)}
            </div>
          </div>
        )}
        
        {/* Linked Story */}
        {linkedStory && (
          <div className="mt-4 pt-4 border-t border-gray-300">
            <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Linked Story
            </div>
            <div className="text-sm font-semibold text-blue-600">
              {linkedStory.key}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {linkedStory.summary}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-300 text-xs text-gray-500 flex-shrink-0">
        <p>✨ Preview updates as you type</p>
      </div>
    </div>
  );
};