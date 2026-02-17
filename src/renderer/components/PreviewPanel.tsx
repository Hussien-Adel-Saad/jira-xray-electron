/**
 * PreviewPanel Component - MODERNIZED
 * Clean, compact design with smooth animations and modern icons
 */

import React, { useEffect, useState } from 'react';
import type { StoryValidationResult, CreateTestInput, CreateTestExecutionInput, CreateTestSetInput } from '../../shared/types';
import { 
  FileText, 
  Calendar, 
  User, 
  Tag, 
  Flag, 
  Link2, 
  ListChecks,
  Package,
  AlertCircle
} from 'lucide-react';

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

  const renderValue = (value: string | number | string[] | undefined, icon?: React.ReactNode) => {
    if (value === undefined || value === null || value === '') {
      return (
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <span className="text-sm italic">(empty)</span>
        </div>
      );
    }
    if (Array.isArray(value)) {
      return value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-sm">
              {v}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-400">
          {icon}
          <span className="text-sm italic">(empty)</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-700 font-medium">{String(value)}</span>
      </div>
    );
  };

  const InfoRow = ({ label, value, icon, highlight = false }: { 
    label: string; 
    value: any; 
    icon?: React.ReactNode;
    highlight?: boolean;
  }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    return (
      <div className={`p-3 rounded-lg border transition-all ${
        highlight 
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' 
          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
      }`}>
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
          {icon && <span className="text-slate-500">{icon}</span>}
          {label}
        </div>
        {renderValue(value)}
      </div>
    );
  };

  return (
    <div className="w-96 bg-white rounded-xl border-2 border-slate-200 shadow-lg sticky top-4 flex flex-col overflow-hidden" 
         style={{ maxHeight: 'calc(100vh - 120px)' }}>
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-4 flex-shrink-0">
        <div className="flex items-center gap-2 text-white">
          <FileText className="w-5 h-5" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-slate-300 text-xs mt-1">Live preview updates as you type</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3"
           style={{ scrollbarWidth: 'thin', scrollbarColor: '#CBD5E0 #F7FAFC' }}
      >
        {/* Summary - Always Highlighted */}
        <InfoRow 
          label="Summary" 
          value={currentTest.summary || '(No summary yet)'}
          icon={<FileText className="w-3.5 h-3.5" />}
          highlight={true}
        />

        {/* Description */}
        {currentTest.description && (
          <InfoRow 
            label="Description" 
            value={currentTest.description}
            icon={<AlertCircle className="w-3.5 h-3.5" />}
          />
        )}

        {/* Test Type - for test cases */}
        {'testType' in currentTest && currentTest.testType && (
          <InfoRow 
            label="Test Type" 
            value={currentTest.testType}
            icon={<Package className="w-3.5 h-3.5" />}
          />
        )}

        {/* Priority */}
        {'priority' in currentTest && currentTest.priority && (
          <InfoRow 
            label="Priority" 
            value={(() => {
              const priorityId = currentTest.priority;
              const found = priorities.find((p: any) => p.id === priorityId);
              return found?.name || priorityId;
            })()}
            icon={<Flag className="w-3.5 h-3.5" />}
          />
        )}

        {/* Assignee */}
        {currentTest.assignee && (
          <InfoRow 
            label="Assignee" 
            value={currentTest.assignee}
            icon={<User className="w-3.5 h-3.5" />}
          />
        )}

        {/* Reporter */}
        {currentTest.reporter && (
          <InfoRow 
            label="Reporter" 
            value={currentTest.reporter}
            icon={<User className="w-3.5 h-3.5" />}
          />
        )}

        {/* Due Date - for test cases */}
        {'dueDate' in currentTest && currentTest.dueDate && (
          <InfoRow 
            label="Due Date" 
            value={currentTest.dueDate}
            icon={<Calendar className="w-3.5 h-3.5" />}
          />
        )}

        {/* Labels */}
        {currentTest.labels && (currentTest.labels || []).length > 0 && (
          <InfoRow 
            label="Labels" 
            value={currentTest.labels}
            icon={<Tag className="w-3.5 h-3.5" />}
          />
        )}

        {/* Steps count - for test cases */}
        {'steps' in currentTest && currentTest.steps && currentTest.steps.length > 0 && (
          <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-900 uppercase tracking-wide">Test Steps</span>
              </div>
              <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-bold">
                {currentTest.steps.length}
              </span>
            </div>
          </div>
        )}

        {/* Components */}
        {'components' in currentTest && currentTest.components && (currentTest.components || []).length > 0 && (
          <InfoRow 
            label="Components" 
            value={currentTest.components}
            icon={<Package className="w-3.5 h-3.5" />}
          />
        )}

        {/* Environments */}
        {'environments' in currentTest && currentTest.environments && (currentTest.environments || []).length > 0 && (
          <InfoRow 
            label="Environments" 
            value={currentTest.environments}
            icon={<Package className="w-3.5 h-3.5" />}
          />
        )}
        
        {/* Linked Story */}
        {linkedStory && (
          <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-green-900 uppercase tracking-wide">Linked Story</span>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-green-900">{linkedStory.key}</div>
              <div className="text-sm text-green-700">{linkedStory.summary}</div>
              <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                <span className="px-2 py-0.5 bg-green-200 rounded-full">{linkedStory.issueType}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-3 border-t border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Synced</span>
        </div>
      </div>
    </div>
  );
};