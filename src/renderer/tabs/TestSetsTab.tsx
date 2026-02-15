/**
 * Test Sets Tab - MODERNIZED
 * Create test sets with reporter field, labels, and professional styling
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import api from '../api/electron';
import { TemplateSelector } from '../components/TemplateSelector';
import { StoryLinker } from '../components/StoryLinker';
import { PreviewPanel } from '../components/PreviewPanel';
import type { CreateTestSetInput } from '../../shared/types';

export const TestSetsTab: React.FC = () => {
  const {
    templates,
    linkedStory,
    setLinkedStory,
    testSets,
    addTestSet,
    updateTestSet,
    removeTestSet,
    addCreatedTestSet,
    auth,
  } = useAppStore();

  const [currentTestSet, setCurrentTestSet] = useState<CreateTestSetInput>({
    summary: '',
    description: '',
    priority: 'Medium',
    assignee: '',
    reporter: auth.username || '',
    labels: [],
  });
  const [fields, setFields] = useState<any[]>([]); // Dynamic Jira fields
  const [fieldError, setFieldError] = useState('');
  // Load dynamic fields for Test Set
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        // 1. Get project info to find Test Set issue type id
        const projectResult = await api.getProject('MTD');
        if (!projectResult.success) {
          setFieldError('Failed to load Jira project metadata');
          return;
        }
        const testSetType = projectResult.data.issueTypes.find((t: any) => t.name === 'Test Set');
        if (!testSetType) {
          setFieldError('Test Set issue type not found in project');
          return;
        }
        // 2. Get all fields info (for custom fields)
        const allFieldsResult = await api.getAllFields();
        if (!allFieldsResult.success) {
          setFieldError('Failed to load Jira fields metadata');
          return;
        }
        // 3. Get create meta for Test Set type
        const metaResult = await api.getCreateMetaByTypeId(testSetType.id);
        let fieldsObj = undefined;
        if (metaResult.success && metaResult.data && metaResult.data.projects && Array.isArray(metaResult.data.projects) && metaResult.data.projects[0] && metaResult.data.projects[0].issuetypes && Array.isArray(metaResult.data.projects[0].issuetypes) && metaResult.data.projects[0].issuetypes[0] && metaResult.data.projects[0].issuetypes[0].fields) {
          fieldsObj = metaResult.data.projects[0].issuetypes[0].fields;
        }
        if (!fieldsObj) {
          setFieldError('No fields found in Jira metadata for Test Set');
          return;
        }
        // 4. Merge with custom field info for better labels/types
        const allFieldsMap: Record<string, any> = {};
        for (const field of allFieldsResult.data) {
          allFieldsMap[field.id] = field;
        }
        const mergedFields = Object.entries(fieldsObj).map(([key, value]: [string, any]) => {
          const custom = allFieldsMap[key];
          return {
            key,
            ...value,
            name: value.name || (custom && custom.name) || key,
            schema: value.schema || (custom && custom.schema) || {},
            allowedValues: value.allowedValues || (custom && custom.allowedValues) || [],
          };
        });
        setFields(mergedFields);
        if (fieldsObj.priority) {
          // eslint-disable-next-line no-console
          console.log('Loaded priority field for Test Set:', fieldsObj.priority);
        }
      } catch (err) {
        setFieldError('Failed to load Jira metadata');
      }
    };
    loadMetadata();
  }, []);
  // Helper to get field value from currentTestSet (matches TestExecutionTab logic)
  const getFieldValue = (form: any, key: string) => {
    if (form[key] !== undefined) return form[key];
    // Support for custom fields (e.g., customfield_XXXXX)
    if (form.fields && form.fields[key] !== undefined) return form.fields[key];
    return '';
  };

  // Removed duplicate selectedTests declaration
  const [testIdInput, setTestIdInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [testSetLabelInput, setTestSetLabelInput] = useState('');
  const [searchingByLabel, setSearchingByLabel] = useState(false);
  const [validatedTests, setValidatedTests] = useState<{ key: string; summary: string }[]>([]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  const handleTemplateApply = (fields: Record<string, any>) => {
    setCurrentTestSet({
      ...currentTestSet,
      ...fields,
    });
  };

  const handleAddTestSetLabel = () => {
    if (!testSetLabelInput.trim()) return;
    
    const currentLabels = currentTestSet.labels || [];
    const newLabels = testSetLabelInput
      .split(',')
      .map(l => l.trim())
      .filter(l => l.length > 0 && !currentLabels.includes(l));
    
    setCurrentTestSet({
      ...currentTestSet,
      labels: [...currentLabels, ...newLabels],
    });
    setTestSetLabelInput('');
  };

  const handleRemoveTestSetLabel = (label: string) => {
    setCurrentTestSet({
      ...currentTestSet,
      labels: (currentTestSet.labels || []).filter(l => l !== label),
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

  const handleSearchByLabel = async () => {
    if (!labelInput.trim()) {
      setError('Please enter a label');
      return;
    }

    setSearchingByLabel(true);
    setError('');

    const result = await api.searchTestsByLabel(labelInput.trim());
    setSearchingByLabel(false);

    if (result.success) {
      if (result.data.length === 0) {
        setError(`No tests found with label "${labelInput}"`);
      } else {
        const newTests = [...new Set([...selectedTests, ...result.data])];
        setSelectedTests(newTests);
        setSuccess(`✅ Found and added ${result.data.length} test(s) with label "${labelInput}"`);
        setLabelInput('');
        setTimeout(clearSuccess, 3000);
      }
    } else {
      setError(result.error.message);
    }
  };

  const handleValidateTests = async () => {
    if (selectedTests.length === 0) {
      setError('No tests selected');
      return;
    }

    const result = await api.getTestsByKeys(selectedTests);

    if (result.success) {
      setValidatedTests(result.data);
      setSuccess(`✅ Validated ${result.data.length} test(s)`);
      setTimeout(clearSuccess, 3000);
    } else {
      setError(result.error.message);
    }
  };

  const handleRemoveTest = (testKey: string) => {
    setSelectedTests(selectedTests.filter((key) => key !== testKey));
    setValidatedTests(validatedTests.filter((test) => test.key !== testKey));
  };

  const handleSaveTestSet = async () => {
    if (!currentTestSet.summary) {
      setError('Summary is required');
      return;
    }

    if (selectedTests.length === 0) {
      setError('Please add at least one test to the set');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await api.createTestSet(currentTestSet, selectedTests);

      if (result.success) {
        const testSetKey = result.data.key;

        if (linkedStory) {
          await api.linkIssues('Relates', testSetKey, linkedStory.key);
        }

        addCreatedTestSet(testSetKey);

        if (editingIndex !== null) {
          updateTestSet(editingIndex, currentTestSet);
        } else {
          addTestSet(currentTestSet);
        }

        setSuccess(`✅ Test Set ${testSetKey} created with ${selectedTests.length} tests!`);

        setCurrentTestSet({
          summary: '',
          description: '',
          priority: 'Medium',
          assignee: '',
          reporter: auth.username || '',
          labels: [],
        });
        setSelectedTests([]);
        setValidatedTests([]);
        setEditingIndex(null);
        setTimeout(clearSuccess, 5000);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create test set');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentTestSet({
      summary: '',
      description: '',
      priority: 'Medium',
      assignee: '',
      reporter: auth.username || '',
      labels: [],
    });
    setSelectedTests([]);
    setValidatedTests([]);
    setEditingIndex(null);
  };

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 overflow-y-auto pr-4">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-6 shadow-lg">
          <h2 className="text-3xl font-bold text-white mb-2">📦 Test Sets</h2>
          <p className="text-purple-100">Create test sets and organize your test cases</p>
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
            issueType="TestSet"
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

        <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-md">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🔍 Select Tests</h3>

          <div className="mb-4">
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Tests by Label
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchByLabel()}
                placeholder="login, regression, smoke"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleSearchByLabel}
                disabled={searchingByLabel}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-semibold shadow-md transition-all"
              >
                {searchingByLabel ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {selectedTests.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Selected Tests ({selectedTests.length})
                </span>
                <button
                  onClick={handleValidateTests}
                  className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 font-semibold transition-all"
                >
                  Validate All
                </button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedTests.map((testKey) => {
                  const validated = validatedTests.find((t) => t.key === testKey);
                  return (
                    <div
                      key={testKey}
                      className="flex justify-between items-center p-3 bg-white rounded-lg border-2 border-gray-200 text-sm hover:border-purple-300 transition-all"
                    >
                      <div>
                        <span className="font-semibold">{testKey}</span>
                        {validated && (
                          <span className="ml-2 text-gray-600">- {validated.summary}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveTest(testKey)}
                        className="text-red-600 hover:text-red-800 font-bold text-lg"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-5 border border-gray-200">
          {/* Dynamic Jira Fields for Test Set type */}
          {fieldError && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-800">
              {fieldError}
            </div>
          )}
          {fields && fields.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="font-bold text-gray-700 mb-2">Test Set Fields</h4>
              {fields.filter(field => field.key !== 'labels').map(field => {
                const value = getFieldValue(currentTestSet, field.key);
                // String
                if (field.schema && field.schema.type === 'string') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}{field.required ? ' *' : ''}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={e => setCurrentTestSet({ ...currentTestSet, [field.key]: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={field.name || field.key}
                      />
                    </div>
                  );
                }
                // Textarea for long text
                if (field.schema && field.schema.type === 'text') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}{field.required ? ' *' : ''}</label>
                      <textarea
                        value={value}
                        onChange={e => setCurrentTestSet({ ...currentTestSet, [field.key]: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={field.name || field.key}
                      />
                    </div>
                  );
                }
                // Single select (option/priority)
                if (field.schema && (field.schema.type === 'option' || field.schema.type === 'priority') && field.allowedValues) {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}{field.required ? ' *' : ''}</label>
                      <select
                        value={value?.id || value || ''}
                        onChange={e => {
                          const selected = field.allowedValues.find((v: any) => String(v.id) === e.target.value);
                          setCurrentTestSet({ ...currentTestSet, [field.key]: selected || e.target.value });
                        }}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {field.allowedValues.map((v: any) => (
                          <option key={v.id || v.value || v.name} value={v.id}>{v.name || v.value || v.id}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                // Multi-select (array)
                if (field.schema && field.schema.type === 'array' && field.allowedValues) {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}{field.required ? ' *' : ''}</label>
                      <select
                        multiple
                        value={value ? value.map((v: any) => v.id || v.value || v.name || v) : []}
                        onChange={e => {
                          const options = Array.from(e.target.selectedOptions, option => option.value);
                          const selected = field.allowedValues.filter((v: any) => options.includes(String(v.id)));
                          setCurrentTestSet({ ...currentTestSet, [field.key]: selected });
                        }}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {field.allowedValues.map((v: any) => (
                          <option key={v.id || v.value || v.name} value={v.id}>{v.name || v.value || v.id}</option>
                        ))}
                      </select>
                    </div>
                  );
                }
                // Boolean
                if (field.schema && field.schema.type === 'boolean') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}{field.required ? ' *' : ''}</label>
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={e => setCurrentTestSet({ ...currentTestSet, [field.key]: e.target.checked })}
                      />
                    </div>
                  );
                }
                // Date
                if (field.schema && field.schema.type === 'date') {
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}{field.required ? ' *' : ''}</label>
                      <input
                        type="date"
                        value={value || ''}
                        onChange={e => setCurrentTestSet({ ...currentTestSet, [field.key]: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  );
                }
                // Default fallback
                return null;
              })}
            </div>
          )}
          {/* All fields are now rendered dynamically above */}

          {/* Labels Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Labels <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={testSetLabelInput}
                onChange={(e) => setTestSetLabelInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTestSetLabel()}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Enter labels (comma-separated)"
              />
              <button
                onClick={handleAddTestSetLabel}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-md transition-all"
              >
                Add
              </button>
            </div>
            {(currentTestSet.labels || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(currentTestSet.labels || []).map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {label}
                    <button
                      onClick={() => handleRemoveTestSetLabel(label)}
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
              onClick={handleSaveTestSet}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 font-bold shadow-lg transition-all"
            >
              {loading ? '⏳ Saving...' : editingIndex !== null ? '💾 Update Test Set' : '✅ Save Test Set'}
            </button>
            <button
              onClick={handleClear}
              disabled={loading}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {testSets.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              ✅ Created Test Sets ({testSets.length})
            </h3>
            <div className="space-y-3">
              {testSets.map((testSet, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 hover:border-purple-300 shadow-sm transition-all"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{testSet.summary}</div>
                    <div className="text-sm text-gray-600">
                      Priority: {testSet.priority}
                      {(testSet.labels || []).length > 0 && ` • ${(testSet.labels || []).join(', ')}`}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTestSet(index)}
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
        title="📦 Test Set Preview"
        currentTest={currentTestSet}
        linkedStory={linkedStory}
      />
    </div>
  );
};