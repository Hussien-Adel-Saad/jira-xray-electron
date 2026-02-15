/**
 * TemplateSelector Component
 * Reusable template selector with variable inputs
 */

import React, { useState } from 'react';
import type { Template } from  '../../shared/types';
import api from '../api/electron';

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
    } else {
      setShowVars(false);
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
      onSuccess('Template applied! You can now edit any field.');
      setShowVars(false);
    } else {
      onError(result.error.message);
    }
  };

  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">✨ Template Helper (Optional)</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- No Template --</option>
            {filteredTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {showVars && currentTemplate && (
          <>
            {currentTemplate.variables.map((variable) => (
              <div key={variable.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {variable.label}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                
                {variable.type === 'select' && variable.options ? (
                  <select
                    value={templateVars[variable.name] || ''}
                    onChange={(e) =>
                      setTemplateVars({ ...templateVars, [variable.name]: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select --</option>
                    {variable.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text'}
                    value={templateVars[variable.name] || ''}
                    onChange={(e) =>
                      setTemplateVars({ ...templateVars, [variable.name]: e.target.value })
                    }
                    placeholder={variable.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
            
            <button
              onClick={handleApplyTemplate}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              ✨ Apply Template to Form
            </button>
          </>
        )}
      </div>
    </div>
  );
};