/**
 * TestCasesTab - UPDATED with Enhanced Dynamic Fields
 * Features: Suggestions, Validation, Rich Text Editor
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import api from '../api/electron';
import { TemplateSelector } from '../components/TemplateSelector';
import { StoryLinker } from '../components/StoryLinker';
import { PreviewPanel } from '../components/PreviewPanel';
import { DynamicFieldsContainer } from '../components/DynamicFieldsContainer';
import type { CreateTestInput, TestStepInput, Priority, Component, Version } from '../../shared/types';

export const TestCasesTab: React.FC = () => {
  const {
    templates,
    linkedStory,
    setLinkedStory,
    addCreatedTest,
    auth,
  } = useAppStore();

  // Form data
  // Store formData using Jira field names as keys for compatibility with dynamic field mapping
  const [formData, setFormData] = useState<Record<string, any>>({
    summary: '',
    description: '',
    reporter: auth.username || '',
    issuetype: 'Test',
    components: [],
    priority: '',
    fixVersions: [],
    versions: [], // for affectsVersions
    labels: [],
    environment: '',
    duedate: '',
    ["customfield_13900"]: 'Manual', // testType (Xray custom field)
  });

  // Test steps (handled separately because they're complex)
  const [steps, setSteps] = useState<TestStepInput[]>([
    { step: '', data: '', result: '' }
  ]);

  // Metadata for dropdown options
  const [metadata, setMetadata] = useState<{
    priorities: Priority[];
    components: Component[];
    versions: Version[];
  }>({
    priorities: [],
    components: [],
    versions: [],
  });

  // UI state
  const [createdTestKeys, setCreatedTestKeys] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Load metadata on mount
  useEffect(() => {
    loadMetadata();
  }, []);

  /**
   * Load metadata from Jira
   */
  const loadMetadata = async () => {
    try {
      const [pResult, cResult, vResult] = await Promise.all([
        api.getPriorities(),
        api.getComponents(),
        api.getVersions(),
      ]);

      if (pResult.success) {
        setMetadata((prev) => ({ ...prev, priorities: pResult.data }));
        
        // Set default priority if not already set
        const defaultPriority = pResult.data.find((p: Priority) =>
          p.name.toLowerCase().includes('medium') || p.name.toLowerCase().includes('moderate')
        );
        
        if (defaultPriority && !formData.priority) {
          setFormData((prev) => ({ ...prev, priority: defaultPriority.id }));
        }
      }

      if (cResult.success) {
        setMetadata((prev) => ({ ...prev, components: cResult.data }));
      }

      if (vResult.success) {
        setMetadata((prev) => ({ ...prev, versions: vResult.data }));
      }
    } catch (err) {
      console.error('Failed to load metadata', err);
      setError('Failed to load Jira metadata');
    }
  };

  /**
   * Handle field changes from DynamicFieldsContainer
   */
  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  /**
   * Handle template application
   */
  const handleTemplateApply = (fields: Record<string, any>) => {
    setFormData({ ...formData, ...fields });
  };

  /**
   * Test Steps Management
   */
  const addStep = () => {
    setSteps([...steps, { step: '', data: '', result: '' }]);
  };

  const updateStep = (index: number, field: keyof TestStepInput, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  /**
   * Create test in Jira
   */
  const handleCreateTest = async () => {
    // Validation
    if (!formData.summary) {
      setError('Summary is required');
      return;
    }

    // Only validate steps for Manual tests
    if (formData.testType === 'Manual') {
      const invalidStep = steps.findIndex(s => !s.step || !s.result);
      if (invalidStep !== -1) {
        setError(`Step ${invalidStep + 1} is incomplete (action and expected result are required)`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Prepare test input
      const testInput: CreateTestInput = {
        summary: formData.summary,
        description: formData.description || '',
        testType: (formData.testType || 'Manual') as 'Manual' | 'Automated',
        priority: formData.priority || '',
        assignee: formData.assignee || '',
        reporter: formData.reporter || auth.username || '',
        labels: formData.labels || [],
        components: formData.components || [],
        fixVersions: formData.fixVersions || [],
        environments: formData.environments || [],
        dueDate: formData.dueDate || '',
        steps: formData.testType === 'Manual' ? steps : [],
      };

      // Create test
      const result = await api.createTest(testInput);

      if (result.success) {
        const testKey = result.data.key;

        // Add test steps for Manual tests
        if (formData.testType === 'Manual') {
          for (const step of steps) {
            await api.addTestStep(testKey, step);
          }
        }

        // Link to story if provided
        if (linkedStory) {
          try {
            await api.linkIssues('Test', testKey, linkedStory.key);
          } catch (linkErr) {
            console.error('Failed to link to story:', linkErr);
          }
        }

        // Update state
        addCreatedTest(testKey);
        setCreatedTestKeys([...createdTestKeys, testKey]);
        setSuccess(`✅ Test ${testKey} created successfully!`);

        // Reset form
        setFormData({
          summary: '',
          description: '',
          reporter: auth.username || '',
          testType: 'Manual',
        });
        setSteps([{ step: '', data: '', result: '' }]);

        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create test');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Copy test key to clipboard
   */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`📋 Copied: ${text}`);
    setTimeout(() => setSuccess(''), 2000);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pr-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 shadow-lg mb-4">
          <h2 className="text-3xl font-bold text-white mb-2">📝 Test Cases</h2>
          <p className="text-blue-100">
            Create test cases with enhanced fields
            <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
              ✨ Suggestions • ✓ Validation • 📝 Rich Text
            </span>
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex justify-between">
            <span className="text-red-800 font-medium">⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-600 font-bold">
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg flex justify-between">
            <span className="text-green-800 font-medium">✓ {success}</span>
            <button onClick={() => setSuccess('')} className="text-green-600 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Template & Story Linkers */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <TemplateSelector
            templates={templates}
            issueType="Test"
            onApply={handleTemplateApply}
            onError={setError}
            onSuccess={setSuccess}
          />
          <StoryLinker
            linkedStory={linkedStory}
            onLink={setLinkedStory}
            onError={setError}
            onSuccess={setSuccess}
          />
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-md p-6 space-y-5 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">
            Test Case Details
          </h3>

          {/* 
            ✨ ENHANCED DYNAMIC FIELDS ✨
            
            New Features Enabled:
            1. Rich Text Editor for Description (with toolbar)
            2. Autocomplete for Labels (from Jira)
            3. Dropdown for Test Type (Manual/Cucumber/Generic)
            4. Issue Key Validation for Test Plans, Test Sets, Preconditions
            5. Code Editor for Gherkin (if Cucumber test)
            
            All configured in fieldMapping.json!
          */}
          <DynamicFieldsContainer
            issueType="Test"
            formData={formData}
            onChange={handleFieldChange}
            excludeFields={['manualSteps']} // Test steps handled separately below
            metadata={metadata}
          />

          {/* Test Steps - Only for Manual tests */}
          {formData.testType === 'Manual' && (
            <div className="border-t pt-4 mt-6">
              <div className="flex justify-between mb-3">
                <h4 className="font-bold text-gray-700">
                  Test Steps <span className="text-red-500">*</span>
                </h4>
                <button
                  onClick={addStep}
                  className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded font-semibold hover:bg-blue-100 transition-colors"
                >
                  + Add Step
                </button>
              </div>
              
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <span className="mt-2 text-xs font-bold text-gray-400 w-6">
                      {index + 1}.
                    </span>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        placeholder="Action *"
                        value={step.step}
                        onChange={(e) => updateStep(index, 'step', e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        placeholder="Expected Result *"
                        value={step.result}
                        onChange={(e) => updateStep(index, 'result', e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        placeholder="Data (Optional)"
                        value={step.data}
                        onChange={(e) => updateStep(index, 'data', e.target.value)}
                        className="col-span-2 px-3 py-1 text-xs border border-gray-200 rounded text-gray-600"
                      />
                    </div>
                    {steps.length > 1 && (
                      <button
                        onClick={() => removeStep(index)}
                        className="mt-2 text-gray-300 hover:text-red-500 transition-colors"
                        title="Remove step"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info for Cucumber/Generic Tests */}
          {(formData.testType === 'Cucumber' || formData.testType === 'Generic') && (
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <p className="text-sm text-blue-800">
                {formData.testType === 'Cucumber' ? (
                  <>
                    📝 <strong>Cucumber Test:</strong> Use the "Cucumber Scenario" field above to define your Gherkin script.
                    Test steps are not needed for Cucumber tests.
                  </>
                ) : (
                  <>
                    📝 <strong>Generic Test:</strong> Use the "Generic Test Definition" field above to define your test.
                    Test steps are not needed for Generic tests.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleCreateTest}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 font-bold shadow-lg transition-all"
            >
              {loading ? '⏳ Creating...' : '🚀 Create Test'}
            </button>
          </div>
        </div>

        {/* Created Tests */}
        {createdTestKeys.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <div className="font-bold text-blue-900 mb-2">
              ✅ Created Tests ({createdTestKeys.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {createdTestKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => copyToClipboard(key)}
                  className="px-3 py-1 bg-white border-2 border-blue-300 rounded-lg text-blue-700 font-mono text-sm hover:bg-blue-100 hover:border-blue-400 transition-all flex items-center gap-2"
                  title="Click to copy"
                >
                  {key}
                  <span className="text-xs">📋</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feature Info Panel */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <h4 className="font-bold text-purple-900 mb-2">✨ Enhanced Features Active:</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• <strong>Rich Text Description:</strong> Use toolbar to format (bold, lists, tables, code)</li>
            <li>• <strong>Label Suggestions:</strong> Type to see autocomplete from your Jira</li>
            <li>• <strong>Test Type Dropdown:</strong> Select Manual, Cucumber, or Generic</li>
            <li>• <strong>Issue Key Validation:</strong> Test Plans/Sets/Preconditions validated in real-time</li>
            <li>• <strong>Gherkin Editor:</strong> Code editor for Cucumber scenarios (if Cucumber selected)</li>
          </ul>
        </div>
      </div>

      {/* Preview Panel */}
      <PreviewPanel
        title="📋 Live Preview"
        currentTest={{
          summary: formData.summary || '',
          description: formData.description || '',
          testType: (formData.testType || 'Manual') as 'Manual' | 'Automated',
          priority: formData.priority || '',
          assignee: formData.assignee || '',
          reporter: formData.reporter || '',
          labels: formData.labels || [],
          components: formData.components || [],
          fixVersions: formData.fixVersions || [],
          environments: formData.environments || [],
          dueDate: formData.dueDate || '',
          steps: steps,
        }}
        linkedStory={linkedStory}
      />
    </div>
  );
};

/**
 * ENHANCED FEATURES INCLUDED:
 * 
 * ✅ Rich Text Description Editor
 *    - Toolbar with formatting buttons (Bold, Italic, Code, Lists, Tables)
 *    - Converts to Jira format automatically
 *    - Visual & Raw editing modes
 * 
 * ✅ Field Suggestions (Autocomplete)
 *    - Labels: Type to see suggestions from Jira
 *    - Test Type: Dropdown with Manual/Cucumber/Generic
 *    - Cucumber Type: Dropdown with Scenario/Scenario Outline
 * 
 * ✅ Issue Key Validation
 *    - Test Plans: Validates issue exists and is Test Plan type
 *    - Test Sets: Validates issue exists and is Test Set type
 *    - Preconditions: Validates issue exists
 *    - Visual feedback: Green ✓ for valid, Red ❌ for invalid
 * 
 * ✅ Code Editor for Gherkin
 *    - Appears when Test Type = Cucumber
 *    - Syntax highlighting for Gherkin keywords
 *    - Proper monospace formatting
 * 
 * ✅ Dynamic Test Steps
 *    - Only shows for Manual tests
 *    - Hidden for Cucumber/Generic tests
 *    - Info panel explains alternative fields
 * 
 * All features are controlled via fieldMapping.json configuration!
 * To enable/disable features or add new fields, just edit the JSON file.
 */