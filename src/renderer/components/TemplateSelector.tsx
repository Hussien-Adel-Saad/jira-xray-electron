/**
 * TemplateSelector Component - MODERNIZED
 * Clean, intuitive template selection with modern icons
 */

import React, { useState } from 'react';
import type { Template } from  '../../shared/types';
import api from '../api/electron';
import { Sparkles, ChevronDown, Check, FileText, Calendar, Type } from 'lucide-react';

interface TemplateSelectorProps {
  templates: Template[];
  issueType: 'Test' | 'TestSet' | 'TestExecution';
  onApply: (fields: Record<string, any>) => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  issueType,
  onApply,
  onError,
  onSuccess,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [showVars, setShowVars] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredTemplates = templates.filter((t) => t.issueType === issueType);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    
    if (template) {
      const vars: Record<string, string> = {};
      template.variables.forEach((v) => {
        vars[v.name] = v.defaultValue || '';
      });
      setTemplateVars(vars);
      setShowVars(true);
      setIsExpanded(true);
    } else {
      setShowVars(false);
      setIsExpanded(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    const result = await api.applyTemplate({
      templateId: selectedTemplate,
      variableValues: templateVars,
    });

    if (result.success) {
      onApply(result.data.fields);
      onSuccess('✨ Template applied! Fields have been pre-filled.');
      setShowVars(false);
      setIsExpanded(false);
    } else {
      onError(result.error.message);
    }
  };

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  const getInputIcon = (type: string) => {
    switch (type) {
      case 'date':
        return <Calendar className="w-4 h-4 text-slate-400" />;
      case 'text':
      case 'select':
      default:
        return <Type className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900">Template Assistant</h3>
            <p className="text-xs text-slate-600">Quick-start with pre-filled forms</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-blue-100 border border-blue-300 rounded text-xs font-medium text-blue-700">
            Optional
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3 animate-fadeIn">
          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              Choose Template
            </label>
            <div className="relative">
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-4 py-3 pr-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm font-medium"
              >
                <option value="">-- Select a template --</option>
                {filteredTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
            {filteredTemplates.length === 0 && (
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                No templates available for {issueType}
              </p>
            )}
          </div>

          {/* Template Variables */}
          {showVars && currentTemplate && (
            <div className="space-y-3 pt-2 border-t border-blue-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                <Type className="w-3.5 h-3.5" />
                Fill in Details
              </div>

              {currentTemplate.variables.map((variable) => (
                <div key={variable.name}>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                    {getInputIcon(variable.type)}
                    {variable.label}
                    {variable.required && <span className="text-red-500">*</span>}
                  </label>
                  
                  {variable.type === 'select' && variable.options ? (
                    <div className="relative">
                      <select
                        value={templateVars[variable.name] || ''}
                        onChange={(e) =>
                          setTemplateVars({ ...templateVars, [variable.name]: e.target.value })
                        }
                        className="w-full px-4 py-2.5 pr-10 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none text-sm"
                      >
                        <option value="">-- Select --</option>
                        {variable.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type={variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text'}
                      value={templateVars[variable.name] || ''}
                      onChange={(e) =>
                        setTemplateVars({ ...templateVars, [variable.name]: e.target.value })
                      }
                      placeholder={variable.placeholder}
                      className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  )}
                </div>
              ))}
              
              {/* Apply Button */}
              <button
                onClick={handleApplyTemplate}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-md"
              >
                <Check className="w-5 h-5" />
                Apply Template to Form
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};