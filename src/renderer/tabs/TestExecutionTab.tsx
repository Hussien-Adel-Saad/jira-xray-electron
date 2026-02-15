/**
 * Test Execution Tab - MODERNIZED
 * Modern UI with Reporter field, labels, and professional styling
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import api from '../api/electron';
import { TemplateSelector } from '../components/TemplateSelector';
import { StoryLinker } from '../components/StoryLinker';
import { PreviewPanel } from '../components/PreviewPanel';
import type { CreateTestExecutionInput } from '../../shared/types';

export const TestExecutionTab: React.FC = () => {
  const {
    templates,
    linkedStory,
    setLinkedStory,
    executions,
    addExecution,
    updateExecution,
    removeExecution,
    addCreatedExecution,
    auth,
  } = useAppStore();

  const [currentExecution, setCurrentExecution] = useState<CreateTestExecutionInput>({
    summary: '',
    description: '',
    environments: [],
    fixVersions: [],
    assignee: '',
    reporter: auth.username || '',
    labels: [],
  });
  const [fields, setFields] = useState<any[]>([]); // Dynamic Jira fields
  const [fieldError, setFieldError] = useState('');
  // Load dynamic fields for Test Execution
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const issueTypesResult = await api.getIssueTypes();
        if (issueTypesResult.success) {
          const execType = issueTypesResult.data.find((t: any) => t.name === 'Test Execution');
          if (execType) {
            const metaResult = await api.getCreateMetaByTypeId(execType.id);
            if (metaResult.success && metaResult.data && metaResult.data.fields) {
              setFields(Object.entries(metaResult.data.fields).map(([key, value]: [string, any]) => ({ key, ...value })));
            }
          }
        }
      } catch (err) {
        setFieldError('Failed to load Jira metadata');
      }
    };
    loadMetadata();
  }, []);
  // Helper to get field value from currentExecution
  const getFieldValue = (form: any, key: string) => {
    if (form[key] !== undefined) return form[key];
    // Support for custom fields (e.g., customfield_XXXXX)
    if (form.fields && form.fields[key] !== undefined) return form.fields[key];
    return '';
  };

  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testIdInput, setTestIdInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [testPlanKey, setTestPlanKey] = useState('');
  const [validatingPlan, setValidatingPlan] = useState(false);
  const [validatedPlan, setValidatedPlan] = useState<{ key: string; summary: string } | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  const handleTemplateApply = (fields: Record<string, any>) => {
    setCurrentExecution({ ...currentExecution, ...fields });
  };

  const handleAddLabel = () => {
    if (!labelInput.trim()) return;
    
    const currentLabels = currentExecution.labels || [];
    const newLabels = labelInput
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !currentLabels.includes(l));
    
    setCurrentExecution({
      ...currentExecution,
      labels: [...currentLabels, ...newLabels],
    });
    setLabelInput('');
  };

  const handleRemoveLabel = (label: string) => {
    setCurrentExecution({
      ...currentExecution,
      labels: (currentExecution.labels || []).filter(l => l !== label),
    });
  };

  const handleAddTestById = () => {
    const testIds = testIdInput
      .split(',')
      .map((id) => id.trim().toUpperCase())
      .filter((id) => id.length > 0);

    if (testIds.length === 0) {
      setError('Please enter at least one test ID');
      return;
    }

    const newTests = [...new Set([...selectedTests, ...testIds])];
    setSelectedTests(newTests);
    setTestIdInput('');
    setSuccess(`✅ Added ${testIds.length} test(s)`);
    setTimeout(clearSuccess, 2000);
  };

  const handleRemoveTest = (testKey: string) => {
    setSelectedTests(selectedTests.filter((key) => key !== testKey));
  };

  const handleValidateTestPlan = async () => {
    if (!testPlanKey.trim()) return;

    setValidatingPlan(true);
    setError('');

    const result = await api.validateStory(testPlanKey.trim());
    setValidatingPlan(false);

    if (result.success) {
      if (result.data.issueType === 'Test Plan') {
        setValidatedPlan({ key: result.data.key, summary: result.data.summary });
        setSuccess(`✅ Test Plan validated: ${result.data.summary}`);
        setTimeout(clearSuccess, 3000);
      } else {
        setError(`${result.data.key} is not a Test Plan (it's a ${result.data.issueType})`);
        setValidatedPlan(null);
      }
    } else {
      setError(result.error.message);
      setValidatedPlan(null);
    }
  };

  const handleSaveExecution = async () => {
    if (!currentExecution.summary) {
      setError('Summary is required');
      return;
    }

    if (selectedTests.length === 0) {
      setError('Please add at least one test to the execution');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.createExecution(currentExecution, selectedTests);

      if (result.success) {
        const executionKey = result.data.key;

        await api.addTestsToExecution(executionKey, selectedTests);

        if (linkedStory) {
          await api.linkIssues('Relates', executionKey, linkedStory.key);
        }

        if (validatedPlan) {
          await api.linkToTestPlan(executionKey, validatedPlan.key);
        }

        addCreatedExecution(executionKey);

        if (editingIndex !== null) {
          updateExecution(editingIndex, currentExecution);
        } else {
          addExecution(currentExecution);
        }

        setSuccess(`✅ Test Execution ${executionKey} created with ${selectedTests.length} tests!`);

        setCurrentExecution({
          summary: '',
          description: '',
          environments: [],
          fixVersions: [],
          assignee: '',
          reporter: auth.username || '',
          labels: [],
        });
        setSelectedTests([]);
        setTestPlanKey('');
        setValidatedPlan(null);
        setEditingIndex(null);
        setTimeout(clearSuccess, 5000);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create test execution');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentExecution({
      summary: '',
      description: '',
      environments: [],
      fixVersions: [],
      assignee: '',
      reporter: auth.username || '',
      labels: [],
    });
    setSelectedTests([]);
    setTestPlanKey('');
    setValidatedPlan(null);
    setEditingIndex(null);
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 overflow-y-auto pr-4">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-2">🚀 Test Execution</h2>
          <p className="text-green-100">Execute tests and link to test plans</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-red-600 text-lg mr-2">⚠️</span>
                <span className="text-red-800 font-medium">{error}</span>
              </div>
              <button onClick={clearError} className="text-red-600 hover:text-red-800 font-bold">✕</button>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-600 text-lg mr-2">✓</span>
                <span className="text-green-800 font-medium">{success}</span>
              </div>
              <button onClick={clearSuccess} className="text-green-600 hover:text-green-800 font-bold">✕</button>
            </div>
          </div>
        )}

        <div className="mb-6">
          <TemplateSelector
            templates={templates}
            issueType="TestExecution"
            onApply={handleTemplateApply}
            onError={setError}
            onSuccess={setSuccess}
          />
        </div>

        <div className="mb-6">
          <StoryLinker
            linkedStory={linkedStory}
            onLink={setLinkedStory}
            onError={setError}
            onSuccess={setSuccess}
          />
        </div>

        <div className="mb-6 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-3">
            🔗 Link to Test Plan <span className="text-gray-500">(Optional)</span>
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={testPlanKey}
              onChange={(e) => setTestPlanKey(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleValidateTestPlan()}
              placeholder="MTD-5000"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={handleValidateTestPlan}
              disabled={validatingPlan || !testPlanKey.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 font-semibold shadow-md transition-all"
            >
              {validatingPlan ? 'Validating...' : 'Validate'}
            </button>
            {validatedPlan && (
              <button
                onClick={() => {
                  setTestPlanKey('');
                  setValidatedPlan(null);
                }}
                className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
              >
                Clear
              </button>
            )}
          </div>

          {validatedPlan && (
            <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg text-sm text-green-800 shadow-sm">
              ✓ Linked to Test Plan: <strong>{validatedPlan.key}</strong> - {validatedPlan.summary}
            </div>
          )}
        </div>

        <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Select Tests to Execute</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Tests by ID (comma-separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testIdInput}
                onChange={(e) => setTestIdInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTestById()}
                placeholder="MTD-100, MTD-101, MTD-102"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTestById}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-md transition-all"
              >
                Add
              </button>
            </div>
          </div>

          {selectedTests.length > 0 && (
            <div className="mt-4">
              <span className="text-sm font-semibold text-gray-700">
                Selected Tests ({selectedTests.length})
              </span>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {selectedTests.map((testKey) => (
                  <div
                    key={testKey}
                    className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200 text-sm hover:border-purple-300 transition-all"
                  >
                    <span className="font-semibold">{testKey}</span>
                    <button
                      onClick={() => handleRemoveTest(testKey)}
                      className="text-red-600 hover:text-red-800 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-5 border border-gray-200">
          {/* Dynamic Jira Fields for Test Execution type */}
          {fieldError && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-800">
              {fieldError}
            </div>
          )}
          {fields && fields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="font-bold text-gray-700 mb-2">Additional Jira Fields</h4>
              {fields
                .filter(field =>
                  !['summary', 'description', 'environments', 'fixVersions', 'assignee', 'reporter', 'labels'].includes(field.key)
                )
                .map(field => {
                  const value = getFieldValue(currentExecution, field.key);
                  // Render input based on field type
                  if (field.schema && field.schema.type === 'string') {
                    return (
                      <div key={field.key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}</label>
                        <input
                          type="text"
                          value={value}
                          onChange={e => setCurrentExecution({ ...currentExecution, [field.key]: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={field.name || field.key}
                        />
                      </div>
                    );
                  }
                  if (field.schema && field.schema.type === 'array' && field.allowedValues) {
                    return (
                      <div key={field.key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}</label>
                        <select
                          multiple
                          value={value || []}
                          onChange={e => {
                            const options = Array.from(e.target.selectedOptions, option => option.value);
                            setCurrentExecution({ ...currentExecution, [field.key]: options });
                          }}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {field.allowedValues.map((v: any) => (
                            <option key={v.id || v.value || v.name} value={v.id || v.value || v.name}>{v.name || v.value || v.id}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  if (field.schema && field.schema.type === 'option' && field.allowedValues) {
                    return (
                      <div key={field.key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}</label>
                        <select
                          value={value || ''}
                          onChange={e => setCurrentExecution({ ...currentExecution, [field.key]: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {field.allowedValues.map((v: any) => (
                            <option key={v.id || v.value || v.name} value={v.id || v.value || v.name}>{v.name || v.value || v.id}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  // Add more field types as needed
                  return null;
                })}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Summary <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={currentExecution.summary}
              onChange={(e) => setCurrentExecution({ ...currentExecution, summary: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Execution - Sprint 10 - UAT"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-gray-500">(Optional)</span>
            </label>
            <textarea
              value={currentExecution.description}
              onChange={(e) => setCurrentExecution({ ...currentExecution, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Sprint 10 UAT testing..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Assignee <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="email"
                value={currentExecution.assignee}
                onChange={(e) => setCurrentExecution({ ...currentExecution, assignee: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="user@vodafone.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reporter <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="email"
                value={currentExecution.reporter}
                onChange={(e) => setCurrentExecution({ ...currentExecution, reporter: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder={auth.username || 'reporter@vodafone.com'}
              />
            </div>
          </div>

          {/* Labels Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Labels <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Enter labels (comma-separated)"
              />
              <button
                onClick={handleAddLabel}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-md transition-all"
              >
                Add
              </button>
            </div>
            {(currentExecution.labels || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(currentExecution.labels || []).map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {label}
                    <button
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSaveExecution}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-bold shadow-lg transition-all"
            >
              {loading ? '⏳ Saving...' : '💾 Save Execution'}
            </button>
            <button
              onClick={handleClear}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {executions.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">✅ Created Executions ({executions.length})</h3>
            <div className="space-y-3">
              {executions.map((execution, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 hover:border-green-300 shadow-sm transition-all"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{execution.summary}</div>
                    <div className="text-sm text-gray-600">
                      {execution.assignee && `Assignee: ${execution.assignee}`}
                      {(execution.labels || []).length > 0 && ` • ${(execution.labels || []).join(', ')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeExecution(index)}
                    className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold transition-all"
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PreviewPanel
        title="🚀 Execution Preview"
        currentTest={currentExecution}
        linkedStory={linkedStory}
      />
    </div>
  );
};