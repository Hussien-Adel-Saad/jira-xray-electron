import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import api from '../api/electron';
import { TemplateSelector } from '../components/TemplateSelector';
import { StoryLinker } from '../components/StoryLinker';
import { PreviewPanel } from '../components/PreviewPanel';
import type { 
  CreateTestInput, 
  TestStepInput, 
  Priority, 
  Component, 
  Version 
} from '../../shared/types';

const INITIAL_TEST_STATE: CreateTestInput = {
  summary: '',
  description: '',
  testType: 'Manual',
  priority: '',
  assignee: '',
  reporter: '',
  labels: [],
  components: [],
  fixVersions: [],
  environments: [],
  dueDate: '',
  steps: [{ step: '', data: '', result: '' }],
};

export const TestCasesTab: React.FC = () => {
  const {
    templates,
    linkedStory,
    setLinkedStory,
    addCreatedTest,
    addTestCase,
    auth,
  } = useAppStore();

  const [forms, setForms] = useState<CreateTestInput[]>([{ ...INITIAL_TEST_STATE, reporter: auth.username || '' }]);
  const [activeFormIndex, setActiveFormIndex] = useState<number>(0);
  const [createdTestKeys, setCreatedTestKeys] = useState<string[]>([]);
  
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);
  const [fields, setFields] = useState<any[]>([]); // Dynamic Jira fields
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [pResult, cResult, vResult, issueTypesResult] = await Promise.all([
          api.getPriorities(),
          api.getComponents(),
          api.getVersions(),
          api.getIssueTypes()
        ]);
        if (pResult.success) {
          setPriorities(pResult.data);
          const defaultPriority = pResult.data.find(p => p.name.includes('Moderate')) || pResult.data[0];
          if (defaultPriority) {
            updateForm(0, 'priority', defaultPriority.id);
          }
        }
        if (cResult.success) setComponents(cResult.data);
        if (vResult.success) setVersions(vResult.data);
        if (issueTypesResult.success) {
          // Find the Test issue type
          const testType = issueTypesResult.data.find((t: any) => t.name === 'Test');
          if (testType) {
            // Now fetch fields for Test type
            const metaResult = await api.getCreateMetaByTypeId(testType.id);
            if (metaResult.success && metaResult.data && metaResult.data.fields) {
              setFields(Object.entries(metaResult.data.fields).map(([key, value]: [string, any]) => ({ key, ...value })));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load metadata', err);
        setError('Failed to load Jira metadata');
      }
    };
    loadMetadata();
  }, []);

  const updateForm = (index: number, field: keyof CreateTestInput, value: any) => {
    const newForms = [...forms];
    newForms[index] = { ...newForms[index], [field]: value };
    setForms(newForms);
  };

  const addForm = () => {
    const defaultPriority = priorities.find(p => p.name.includes('Moderate'))?.id || '';
    setForms([...forms, { ...INITIAL_TEST_STATE, priority: defaultPriority, reporter: auth.username || '' }]);
    setActiveFormIndex(forms.length);
  };

  const removeForm = (index: number) => {
    if (forms.length === 1) {
      const defaultPriority = priorities.find(p => p.name.includes('Moderate'))?.id || '';
      setForms([{ ...INITIAL_TEST_STATE, priority: defaultPriority, reporter: auth.username || '' }]);
      return;
    }
    const newForms = forms.filter((_, i) => i !== index);
    setForms(newForms);
    if (activeFormIndex >= index && activeFormIndex > 0) {
      setActiveFormIndex(activeFormIndex - 1);
    }
  };

  const cloneForm = (index: number) => {
    const formToClone = forms[index];
    const cloned = {
      ...formToClone,
      summary: formToClone.summary ? `${formToClone.summary} - Copy` : '',
    };
    const newForms = [...forms];
    newForms.splice(index + 1, 0, cloned);
    setForms(newForms);
    setActiveFormIndex(index + 1);
    setSuccess('⎘ Test cloned');
    setTimeout(() => setSuccess(''), 2000);
  };

  const addStep = (formIndex: number) => {
    const currentSteps = forms[formIndex].steps;
    updateForm(formIndex, 'steps', [...currentSteps, { step: '', data: '', result: '' }]);
  };

  const updateStep = (formIndex: number, stepIndex: number, field: keyof TestStepInput, value: string) => {
    const newSteps = [...forms[formIndex].steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value };
    updateForm(formIndex, 'steps', newSteps);
  };

  const removeStep = (formIndex: number, stepIndex: number) => {
    const currentSteps = forms[formIndex].steps;
    if (currentSteps.length > 1) {
      updateForm(formIndex, 'steps', currentSteps.filter((_, i) => i !== stepIndex));
    }
  };

  const handleLabelSearch = async (query: string) => {
    setLabelInput(query);
    if (query.length > 1) {
      const result = await api.getLabelSuggestions(query);
      if (result.success) {
        setLabelSuggestions(result.data.map((s: any) => s.label));
      }
    } else {
      setLabelSuggestions([]);
    }
  };

  const addLabel = (formIndex: number, label: string) => {
    const currentLabels = forms[formIndex].labels || [];
    if (!currentLabels.includes(label)) {
      updateForm(formIndex, 'labels', [...currentLabels, label]);
    }
    setLabelInput('');
    setLabelSuggestions([]);
  };

  const removeLabel = (formIndex: number, label: string) => {
    updateForm(formIndex, 'labels', (forms[formIndex].labels || []).filter(l => l !== label));
  };

  const toggleComponent = (formIndex: number, componentId: string) => {
    const currentComponents = forms[formIndex].components || [];
    if (currentComponents.includes(componentId)) {
      updateForm(formIndex, 'components', currentComponents.filter(c => c !== componentId));
    } else {
      updateForm(formIndex, 'components', [...currentComponents, componentId]);
    }
  };
  
  const handleTemplateApply = (fields: Record<string, any>) => {
    const currentForm = forms[activeFormIndex];
    const newForm = { ...currentForm, ...fields };
    
    if (fields.priority) {
      const p = priorities.find(p => p.name === fields.priority || p.id === fields.priority);
      if (p) newForm.priority = p.id;
    }

    const newForms = [...forms];
    newForms[activeFormIndex] = newForm;
    setForms(newForms);
  };

  const handleCreateAll = async () => {
    const invalidIndex = forms.findIndex(f => !f.summary || f.steps.some(s => !s.step || !s.result));
    if (invalidIndex !== -1) {
      setError(`Test Case #${invalidIndex + 1} is incomplete`);
      setActiveFormIndex(invalidIndex);
      return;
    }

    setBatchLoading(true);
    setError('');
    let createdCount = 0;
    let failedCount = 0;
    const newlyCreatedKeys: string[] = [];
    const indicesToRemove: number[] = [];

    for (let i = 0; i < forms.length; i++) {
      const test = forms[i];
      try {
        const result = await api.createTest(test);
        
        if (result.success) {
          const testKey = result.data.key;
          
          // Add steps - only non-empty ones
          const validSteps = test.steps.filter(s => s.step.trim() && s.result.trim());
          for (const step of validSteps) {
            await api.addTestStep(testKey, step);
          }

          // Link to Story using "Test" link type
          if (linkedStory) {
            try {
              await api.linkIssues('Test', testKey, linkedStory.key);
            } catch (linkErr) {
              console.error('Failed to link to story:', linkErr);
            }
          }

          addCreatedTest(testKey);
          addTestCase(test);
          createdCount++;
          newlyCreatedKeys.push(testKey);
          indicesToRemove.push(i);
        } else {
          failedCount++;
          console.error(`Failed ${i + 1}:`, result.error);
        }
      } catch (err) {
        failedCount++;
        console.error(`Error ${i + 1}:`, err);
      }
    }

    setBatchLoading(false);

    setCreatedTestKeys([...createdTestKeys, ...newlyCreatedKeys]);

    if (indicesToRemove.length > 0) {
      const remainingForms = forms.filter((_, i) => !indicesToRemove.includes(i));
      if (remainingForms.length === 0) {
        const defaultPriority = priorities.find(p => p.name.includes('Moderate'))?.id || '';
        setForms([{ ...INITIAL_TEST_STATE, priority: defaultPriority, reporter: auth.username || '' }]);
        setActiveFormIndex(0);
      } else {
        setForms(remainingForms);
        setActiveFormIndex(0);
      }
    }

    if (failedCount === 0) {
      setSuccess(`🎉 Created ${createdCount} test case${createdCount !== 1 ? 's' : ''}!`);
    } else {
      setError(`Created ${createdCount}, failed ${failedCount}`);
    }
    
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`📋 Copied: ${text}`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const activeForm = forms[activeFormIndex];

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        <div className="flex-shrink-0 mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 shadow-lg mb-4">
            <h2 className="text-3xl font-bold text-white mb-2">📋 Test Cases</h2>
            <p className="text-blue-100">Create multiple test cases in batch</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex justify-between">
              <span className="text-red-800 font-medium">⚠️ {error}</span>
              <button onClick={() => setError('')} className="text-red-600 font-bold">✕</button>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg flex justify-between">
              <span className="text-green-800 font-medium">✓ {success}</span>
              <button onClick={() => setSuccess('')} className="text-green-600 font-bold">✕</button>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <TemplateSelector templates={templates} issueType="Test" onApply={handleTemplateApply} onError={setError} onSuccess={setSuccess} />
            </div>
            <div className="flex-1">
              <StoryLinker linkedStory={linkedStory} onLink={setLinkedStory} onError={setError} onSuccess={setSuccess} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 pb-20 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          
          {forms.map((form, index) => {
            const isExpanded = activeFormIndex === index;
            const isValid = form.summary && form.steps.every(s => s.step && s.result);

            return (
              <div 
                key={index} 
                className={`transition-all rounded-xl border-2 ${
                  isExpanded ? 'border-blue-500 shadow-lg bg-white' : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                }`}
              >
                <div 
                  className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'border-b' : ''}`}
                  onClick={() => setActiveFormIndex(index)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center ${
                      isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <h3 className={`font-bold ${form.summary ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                        {form.summary || 'Untitled'}
                      </h3>
                      {!isExpanded && (
                        <div className="text-xs text-gray-500 flex gap-2">
                          <span>{form.testType}</span>
                          <span>•</span>
                          <span>{form.steps.length} step(s)</span>
                          {isValid ? <span className="text-green-600">✓</span> : <span className="text-amber-600">⚠️</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); cloneForm(index); }} className="p-2 hover:text-blue-600" title="Clone">⎘</button>
                    <button onClick={(e) => { e.stopPropagation(); removeForm(index); }} className="p-2 hover:text-red-600" title="Remove">✕</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 space-y-5">
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Summary <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={form.summary}
                        onChange={(e) => updateForm(index, 'summary', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Test - Login - Valid Credentials"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => updateForm(index, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Detailed description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                        <select
                          value={form.priority}
                          onChange={(e) => updateForm(index, 'priority', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {priorities.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                        <select
                          value={form.testType}
                          onChange={(e) => updateForm(index, 'testType', e.target.value as 'Manual' | 'Automated')}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="Manual">Manual</option>
                          <option value="Automated">Automated</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Assignee</label>
                        <input
                          type="email"
                          value={form.assignee}
                          onChange={(e) => updateForm(index, 'assignee', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="assignee@vodafone.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Reporter</label>
                        <input
                          type="email"
                          value={form.reporter}
                          onChange={(e) => updateForm(index, 'reporter', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder={auth.username || 'reporter@vodafone.com'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={form.dueDate}
                          onChange={(e) => updateForm(index, 'dueDate', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Fix Version</label>
                        <select
                          value={form.fixVersions?.[0] || ''}
                          onChange={(e) => updateForm(index, 'fixVersions', e.target.value ? [e.target.value] : [])}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select...</option>
                          {versions.map(v => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Components</label>
                      <div className="relative group">
                        <div className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg min-h-[42px] flex flex-wrap gap-1 bg-white">
                          {(form.components || []).length === 0 && <span className="text-gray-400">Select...</span>}
                          {(form.components || []).map(cid => {
                            const comp = components.find(c => c.id === cid);
                            return comp ? (
                              <span key={cid} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {comp.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                        <div className="absolute hidden group-hover:block z-10 w-full bg-white border shadow-lg rounded-lg max-h-48 overflow-y-auto mt-1">
                          {components.map(c => (
                            <div 
                              key={c.id}
                              onClick={() => toggleComponent(index, c.id)}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex justify-between ${
                                (form.components || []).includes(c.id) ? 'bg-blue-50 text-blue-700 font-medium' : ''
                              }`}
                            >
                              {c.name}
                              {(form.components || []).includes(c.id) && <span>✓</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Labels</label>
                      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg min-h-[40px]">
                        {(form.labels || []).map(label => (
                          <span key={label} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                            {label}
                            <button onClick={() => removeLabel(index, label)} className="ml-2 hover:text-purple-900">×</button>
                          </span>
                        ))}
                        <div className="relative flex-1 min-w-[120px]">
                          <input
                            type="text"
                            value={labelInput}
                            onChange={(e) => handleLabelSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && labelInput.trim()) {
                                addLabel(index, labelInput.trim());
                              }
                            }}
                            className="w-full bg-transparent outline-none text-sm"
                            placeholder="+ Add"
                          />
                          {labelSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 bg-white border shadow-lg rounded z-20 w-full max-h-32 overflow-y-auto">
                              {labelSuggestions.map(s => (
                                <div 
                                  key={s} 
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                  onClick={() => addLabel(index, s)}
                                >
                                  {s}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between mb-3">
                        <h4 className="font-bold text-gray-700">Test Steps</h4>
                        <button
                          onClick={() => addStep(index)}
                          className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded font-semibold hover:bg-blue-100"
                        >
                          + Add Step
                        </button>
                      </div>
                      <div className="space-y-3">
                        {form.steps.map((step, sIndex) => (
                          <div key={sIndex} className="flex gap-2 items-start">
                            <span className="mt-2 text-xs font-bold text-gray-400 w-4">{sIndex + 1}.</span>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <input
                                placeholder="Action"
                                value={step.step}
                                onChange={(e) => updateStep(index, sIndex, 'step', e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                placeholder="Expected Result"
                                value={step.result}
                                onChange={(e) => updateStep(index, sIndex, 'result', e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                placeholder="Data (Optional)"
                                value={step.data}
                                onChange={(e) => updateStep(index, sIndex, 'data', e.target.value)}
                                className="col-span-2 px-3 py-1 text-xs border border-gray-200 rounded text-gray-600"
                              />
                            </div>
                            {form.steps.length > 1 && (
                              <button onClick={() => removeStep(index, sIndex)} className="mt-2 text-gray-300 hover:text-red-500">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic Jira Fields for Test type */}
                    {fields && fields.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <h4 className="font-bold text-gray-700 mb-2">Additional Jira Fields</h4>
                        {fields
                          .filter(f =>
                            (f.issueTypes && f.issueTypes.includes('Test')) ||
                            (f.scope && f.scope.type === 'Test') ||
                            (f.name && f.name.toLowerCase().includes('test'))
                          )
                          .map(field => {
                            // Only render if not already handled by static fields
                            if (['summary', 'description', 'priority', 'assignee', 'reporter',
                                'labels', 'components', 'fixVersions', 'environments', 'dueDate', 'steps', 'testType']
                                .includes(field.key)) return null;
                            const value = getFieldValue(form, field.key);
                            // Render input based on field type
                            if (field.schema && field.schema.type === 'string') {
                              return (
                                <div key={field.key}>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}</label>
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={e => updateForm(index, field.key as keyof CreateTestInput, e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder={field.name || field.key}
                                  />
                                </div>
                              );
                            }
                            if (field.schema && field.schema.type === 'number') {
                              return (
                                <div key={field.key}>
                                  <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}</label>
                                  <input
                                    type="number"
                                    value={value}
                                    onChange={e => updateForm(index, field.key as keyof CreateTestInput, e.target.value)}
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
                                    value={value}
                                    onChange={e => updateForm(index, field.key as keyof CreateTestInput, e.target.value)}
                                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">Select...</option>
                                    {field.allowedValues.map((v: any) => (
                                      <option key={v.id || v.value} value={v.id || v.value}>{v.name || v.value}</option>
                                    ))}
                                  </select>
                                </div>
                              );
                            }
                            // Fallback generic input
                            return (
                              <div key={field.key}>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">{field.name || field.key}</label>
                                <input
                                  type="text"
                                  value={value}
                                  onChange={e => updateForm(index, field.key as keyof CreateTestInput, e.target.value)}
                                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder={field.name || field.key}
                                />
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          <button
            onClick={addForm}
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 mb-20"
          >
            + Add Another Test Case
          </button>
        </div>

        {/* Created Test IDs - Bottom Section */}
        {createdTestKeys.length > 0 && (
          <div className="mx-2 mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
            <div className="font-bold text-blue-900 mb-2">✅ Created Tests ({createdTestKeys.length}):</div>
            <div className="flex flex-wrap gap-2">
              {createdTestKeys.map(key => (
                <button
                  key={key}
                  onClick={() => copyToClipboard(key)}
                  className="px-3 py-1 bg-white border-2 border-blue-300 rounded-lg text-blue-700 font-mono text-sm hover:bg-blue-100 hover:border-blue-400 transition-all flex items-center gap-2"
                  title="Click to copy"
                >
                  {key}
                  <span className="text-xs">⎘</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 w-full bg-white border-t p-4 shadow-lg flex justify-between z-10">
          <div className="text-sm text-gray-600">
            <strong>{forms.length}</strong> Test Case{forms.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={handleCreateAll}
            disabled={batchLoading}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg font-bold shadow-md hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {batchLoading ? '⏳ Processing...' : '🚀 Create All'}
          </button>
        </div>

      </div>

      <PreviewPanel title="📋 Live Preview" currentTest={activeForm} linkedStory={linkedStory} />
    </div>
  );
};

// Helper function to safely access dynamic field values from form
const getFieldValue = (form: CreateTestInput, key: string) => {
  return (key in form) ? (form as any)[key] : '';
};