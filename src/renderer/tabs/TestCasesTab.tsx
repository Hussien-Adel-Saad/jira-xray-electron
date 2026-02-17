/**
 * TestCasesTab - ALL FIXED
 * - createTest uses POST (not PUT)
 * - Components stored as names (not IDs), with autocomplete suggestions
 * - Story linking uses POST /rest/api/2/issueLink with "Test" type
 * - Navigation URLs correct
 * - Test associations: Test Set, Test Plan, Pre-condition with validation
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import api from '../api/electron';
import { StoryLinker } from '../components/StoryLinker';
import { TemplateSelector } from '../components/TemplateSelector';
import { PreviewPanel } from '../components/PreviewPanel';
import { Alert } from '../components/common/Alert';
import { IssueValidator } from '../components/IssueValidator';
import type { CreateTestInput, TestStepInput, StoryValidationResult } from '../../shared/types';
import {
  Plus,
  Trash2,
  CheckCircle2,
  ListChecks,
  FileText,
  Calendar,
  User,
  Flag,
  Tag,
  Package,
  Copy,
  ExternalLink,
  Sparkles,
  X,
  Link2,
} from 'lucide-react';

const emptyStep: TestStepInput = { step: '', data: '', result: '' };

const emptyTest = (): CreateTestInput => ({
  summary: '',
  description: '',
  testType: 'Manual',
  steps: [{ ...emptyStep }],
  priority: '',
  assignee: '',
  reporter: '',
  labels: [],
  components: [],   // stored as names: ["Backend", "API"]
  fixVersions: [],
  dueDate: '',
});

interface CreatedTest {
  key: string;
  url: string;
  summary: string;
}

export const TestCasesTab: React.FC = () => {
  const { auth, templates } = useAppStore();

  const [testForms, setTestForms] = useState<CreateTestInput[]>([emptyTest()]);
  const [activeFormIndex, setActiveFormIndex] = useState(0);

  const [linkedStory, setLinkedStory] = useState<StoryValidationResult | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdTests, setCreatedTests] = useState<CreatedTest[]>([]);

  // Test Associations
  const [testSetKey, setTestSetKey] = useState('');
  const [validatedTestSet, setValidatedTestSet] = useState<StoryValidationResult | null>(null);
  const [testPlanKey, setTestPlanKey] = useState('');
  const [validatedTestPlan, setValidatedTestPlan] = useState<StoryValidationResult | null>(null);
  const [preconditionKey, setPreconditionKey] = useState('');
  const [validatedPrecondition, setValidatedPrecondition] = useState<StoryValidationResult | null>(null);

  // Metadata
  const [priorities, setPriorities] = useState<any[]>([]);

  // Label input state
  const [labelInput, setLabelInput] = useState('');
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  // Component input state — same pattern as labels
  const [componentInput, setComponentInput] = useState('');
  const [componentSuggestions, setComponentSuggestions] = useState<string[]>([]);
  const [showComponentSuggestions, setShowComponentSuggestions] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (auth.username) {
      setTestForms(prev =>
        prev.map(test => ({ ...test, reporter: auth.username || '' }))
      );
    }
  }, [auth.username]);

  const loadMetadata = async () => {
    const res = await api.getPriorities();
    if (res.success) setPriorities(res.data);
  };

  // ── Label suggestions ─────────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(async () => {
      if (labelInput.length >= 2) {
        try {
          const res = await api.getLabelSuggestions(labelInput);
          if (res.success) {
            setLabelSuggestions(res.data.map((s: any) => s.label));
            setShowLabelSuggestions(true);
          }
        } catch { /* ignore */ }
      } else {
        setLabelSuggestions([]);
        setShowLabelSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [labelInput]);

  // ── Component suggestions ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setTimeout(async () => {
      if (componentInput.length >= 1) {
        try {
          const res = await api.getComponentSuggestions(componentInput);
          if (res.success) {
            setComponentSuggestions(res.data.map((c: any) => c.name));
            setShowComponentSuggestions(true);
          }
        } catch { /* ignore */ }
      } else {
        setComponentSuggestions([]);
        setShowComponentSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [componentInput]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setShowLabelSuggestions(false);
      }
      if (componentRef.current && !componentRef.current.contains(e.target as Node)) {
        setShowComponentSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const updateCurrentForm = (updates: Partial<CreateTestInput>) => {
    setTestForms(prev =>
      prev.map((t, i) => (i === activeFormIndex ? { ...t, ...updates } : t))
    );
  };

  const currentTest = testForms[activeFormIndex];

  const handleAddForm = () => {
    setTestForms(prev => [...prev, { ...emptyTest(), reporter: auth.username || '' }]);
    setActiveFormIndex(testForms.length);
    setSuccess('✨ Added new test case form');
  };

  const handleCloneForm = () => {
    const f = testForms[activeFormIndex];
    setTestForms(prev => [
      ...prev,
      {
        ...f,
        summary: f.summary ? `${f.summary} - copy` : '',
        steps: f.steps.map(s => ({ ...s })),
        labels: [...(f.labels || [])],
        components: [...(f.components || [])],
        fixVersions: [...(f.fixVersions || [])],
      },
    ]);
    setActiveFormIndex(testForms.length);
    setSuccess('✨ Cloned current test case');
  };

  const handleRemoveForm = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (testForms.length === 1) { setError('Cannot remove the last form'); return; }
    const next = testForms.filter((_, i) => i !== index);
    setTestForms(next);
    setActiveFormIndex(Math.min(activeFormIndex, next.length - 1));
  };

  // ── Steps ─────────────────────────────────────────────────────────────────
  const handleAddStep = () => updateCurrentForm({ steps: [...currentTest.steps, { ...emptyStep }] });

  const handleRemoveStep = (i: number) => {
    if (currentTest.steps.length === 1) return;
    updateCurrentForm({ steps: currentTest.steps.filter((_, idx) => idx !== i) });
  };

  const handleStepChange = (i: number, field: keyof TestStepInput, val: string) =>
    updateCurrentForm({ steps: currentTest.steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s) });

  // ── Labels ────────────────────────────────────────────────────────────────
  const addLabel = (label: string) => {
    const v = label.trim();
    if (!v) return;
    const cur = currentTest.labels || [];
    if (!cur.includes(v)) updateCurrentForm({ labels: [...cur, v] });
    setLabelInput('');
    setShowLabelSuggestions(false);
  };

  const removeLabel = (label: string) =>
    updateCurrentForm({ labels: (currentTest.labels || []).filter(l => l !== label) });

  // ── Components — same pattern as labels ───────────────────────────────────
  const addComponent = (name: string) => {
    const v = name.trim();
    if (!v) return;
    const cur = currentTest.components || [];
    if (!cur.includes(v)) updateCurrentForm({ components: [...cur, v] });
    setComponentInput('');
    setShowComponentSuggestions(false);
  };

  const removeComponent = (name: string) =>
    updateCurrentForm({ components: (currentTest.components || []).filter(c => c !== name) });

  // ── Create ────────────────────────────────────────────────────────────────
  const cleanTestData = (t: CreateTestInput): Record<string, any> => {
    const fields: Record<string, any> = {
      summary: t.summary,
      testType: t.testType,
      steps: t.steps.filter(s => s.step || s.data || s.result),
    };
    if (t.description) fields.description = t.description;
    if (t.priority) fields.priority = t.priority;
    if (t.assignee) fields.assignee = t.assignee;
    if (t.reporter) fields.reporter = t.reporter;
    if ((t.labels || []).length > 0) fields.labels = t.labels;
    // components as names (NOT wrapped in { id: ... })
    if ((t.components || []).length > 0) fields.components = t.components;
    if ((t.fixVersions || []).length > 0) fields.fixVersions = t.fixVersions;
    if (t.dueDate) fields.dueDate = t.dueDate;
    return fields;
  };

  const doLink = async (linkType: string, inward: string, outward: string, label: string, errs: string[]) => {
    try {
      console.log(`Linking ${inward} → ${outward} (${linkType})...`);
      await api.linkIssues(linkType, inward, outward);
      console.log(`✅ Linked ${inward} → ${outward}`);
    } catch (e: any) {
      console.error(`⚠️ ${label} link failed:`, e);
      errs.push(`${label}: ${e.message || 'failed'}`);
    }
  };

  const handleCreateAll = async () => {
    if (testForms.some(t => !t.summary.trim())) {
      setError('All test cases must have a summary');
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccess('');
    setCreatedTests([]);

    const results: CreatedTest[] = [];
    const allErrors: string[] = [];

    for (let i = 0; i < testForms.length; i++) {
      const cleaned = cleanTestData(testForms[i]);
      const linkErrors: string[] = [];

      try {
        console.log(`\n═══ Creating Test ${i + 1} ═══`);
        console.log('Payload:', JSON.stringify(cleaned, null, 2));

        const res = await api.createTest(cleaned as CreateTestInput);

        if (!res.success) {
          allErrors.push(`Test ${i + 1}: ${res.error?.message || 'Unknown error'}`);
          console.error(`❌ Failed:`, res.error);
          continue;
        }

        const key = res.data.key;
        console.log(`✅ Created: ${key}`);

        // All links use POST /rest/api/2/issueLink
        if (linkedStory)        await doLink('Test',    key, linkedStory.key,        'Story',         linkErrors);
        if (validatedTestSet)   await doLink('Relates', key, validatedTestSet.key,   'Test Set',      linkErrors);
        if (validatedTestPlan)  await doLink('Relates', key, validatedTestPlan.key,  'Test Plan',     linkErrors);
        if (validatedPrecondition) await doLink('Relates', key, validatedPrecondition.key, 'Pre-condition', linkErrors);

        results.push({
          key,
          url: `${auth.jiraBaseUrl}/browse/${key}`,
          summary: testForms[i].summary,
        });

        if (linkErrors.length > 0) allErrors.push(...linkErrors);

      } catch (e: any) {
        allErrors.push(`Test ${i + 1}: ${e.message || 'Unknown error'}`);
        console.error(`❌ Exception:`, e);
      }
    }

    setCreatedTests(results);

    if (results.length === 0) {
      setError(`❌ Failed to create any tests. ${allErrors.join('; ')}`);
    } else if (allErrors.length > 0) {
      setSuccess(`⚠️ Created ${results.length}/${testForms.length} tests. Issues: ${allErrors.join('; ')}`);
    } else {
      const linkedCount = [linkedStory, validatedTestSet, validatedTestPlan, validatedPrecondition].filter(Boolean).length;
      const linkMsg = linkedCount > 0 ? ` with ${linkedCount} link${linkedCount > 1 ? 's' : ''}` : '';
      setSuccess(`✅ Created ${results.length} test case${results.length > 1 ? 's' : ''}${linkMsg}!`);
      resetForm(); // reset form but keep createdTests visible
    }

    setIsCreating(false);
  };

  // Resets form inputs only — keeps createdTests visible so user sees results
  const resetForm = () => {
    setTestForms([{ ...emptyTest(), reporter: auth.username || '' }]);
    setActiveFormIndex(0);
    setLinkedStory(null);
    setTestSetKey(''); setValidatedTestSet(null);
    setTestPlanKey(''); setValidatedTestPlan(null);
    setPreconditionKey(''); setValidatedPrecondition(null);
  };

  // Full clear including results — triggered by explicit "Clear All" button
  const handleClear = () => {
    resetForm();
    setCreatedTests([]);
    setSuccess('');
    setError('');
  };

  const copyAllKeys = () => {
    navigator.clipboard.writeText(createdTests.map(t => t.key).join(', '));
    setSuccess('📋 Copied all keys to clipboard');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Test Cases</h2>
            <p className="text-blue-100 text-sm">Bulk create with associations</p>
          </div>
        </div>
      </div>

      {error   && <Alert type="error"   message={error}   onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      {/* Created results */}
      <TemplateSelector templates={templates} issueType="Test"
        onApply={f => setTestForms(prev => prev.map((t, i) => i === activeFormIndex ? { ...t, ...f } : t))}
        onError={setError} onSuccess={setSuccess} />

      <StoryLinker linkedStory={linkedStory} onLink={setLinkedStory} onSuccess={setSuccess} />

      {/* Test Associations */}
      <div className="bg-purple-50 rounded-xl border-2 border-purple-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <Link2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Test Associations</h3>
            <p className="text-xs text-slate-500">Link to Test Set, Test Plan, or Pre-condition</p>
          </div>
          <span className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-xs text-purple-700">Optional</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <IssueValidator value={testSetKey} onChange={setTestSetKey}
            onValidation={setValidatedTestSet} label="Test Set" placeholder="MTD-100" allowedTypes={['Test Set']} />
          <IssueValidator value={testPlanKey} onChange={setTestPlanKey}
            onValidation={setValidatedTestPlan} label="Test Plan" placeholder="MTD-200" allowedTypes={['Test Plan']} />
          <IssueValidator value={preconditionKey} onChange={setPreconditionKey}
            onValidation={setValidatedPrecondition} label="Pre-condition" placeholder="MTD-300" allowedTypes={['Pre-Condition']} />
        </div>
      </div>

      {/* Form Tabs */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900">Test Case Forms</h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">{testForms.length}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {testForms.map((t, i) => (
            <div key={i} onClick={() => setActiveFormIndex(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold whitespace-nowrap cursor-pointer transition-all text-sm ${
                activeFormIndex === i ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}>
              <FileText className="w-3.5 h-3.5" />
              <span>{t.summary || `Test ${i + 1}`}</span>
              {testForms.length > 1 && (
                <button type="button" onClick={e => handleRemoveForm(i, e)}
                  className="ml-1 p-0.5 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={handleAddForm}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm">
            <Plus className="w-4 h-4" /> Add Test Case
          </button>
          <button type="button" onClick={handleCloneForm}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold text-sm">
            <Copy className="w-4 h-4" /> Clone Current
          </button>
        </div>
      </div>

      {/* Form + Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6">
        <div className="space-y-4">

          {/* Basic Info */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-lg">Basic Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Summary <span className="text-red-500">*</span>
                </label>
                <input type="text" value={currentTest.summary}
                  onChange={e => updateCurrentForm({ summary: e.target.value })}
                  placeholder="Brief description of what this test verifies"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea value={currentTest.description}
                  onChange={e => updateCurrentForm({ description: e.target.value })}
                  placeholder="Preconditions, context, notes…" rows={3}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <Package className="w-4 h-4 inline mr-1 text-slate-500" />Test Type
                </label>
                <div className="flex gap-4">
                  {(['Manual', 'Automated'] as const).map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={type} checked={currentTest.testType === type}
                        onChange={() => updateCurrentForm({ testType: type })}
                        className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Test Steps */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-lg">Test Steps</h3>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                  {currentTest.steps.length}
                </span>
              </div>
              <button type="button" onClick={handleAddStep}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold text-sm shadow">
                <Plus className="w-4 h-4" /> Add Step
              </button>
            </div>
            <div className="space-y-3">
              {currentTest.steps.map((step, i) => (
                <div key={i} className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-600">Step {i + 1}</span>
                    {currentTest.steps.length > 1 && (
                      <button type="button" onClick={() => handleRemoveStep(i)}
                        className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input type="text" value={step.step}
                      onChange={e => handleStepChange(i, 'step', e.target.value)}
                      placeholder="Action: What to do"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    <input type="text" value={step.data}
                      onChange={e => handleStepChange(i, 'data', e.target.value)}
                      placeholder="Data: Input / test data"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    <input type="text" value={step.result}
                      onChange={e => handleStepChange(i, 'result', e.target.value)}
                      placeholder="Expected Result: What should happen"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-white rounded-xl border-2 border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-lg">Additional Details</h3>
            </div>
            <div className="space-y-4">

              {/* Priority + Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Flag className="w-4 h-4 inline mr-1 text-slate-500" />Priority
                  </label>
                  <select value={currentTest.priority}
                    onChange={e => updateCurrentForm({ priority: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Priority --</option>
                    {priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <Calendar className="w-4 h-4 inline mr-1 text-slate-500" />Due Date
                  </label>
                  <input type="date" value={currentTest.dueDate}
                    onChange={e => updateCurrentForm({ dueDate: e.target.value })}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Assignee + Reporter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <User className="w-4 h-4 inline mr-1 text-slate-500" />Assignee
                  </label>
                  <input type="text" value={currentTest.assignee}
                    onChange={e => updateCurrentForm({ assignee: e.target.value })}
                    placeholder="Username"
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    <User className="w-4 h-4 inline mr-1 text-slate-500" />Reporter
                  </label>
                  <input type="text" value={currentTest.reporter}
                    onChange={e => updateCurrentForm({ reporter: e.target.value })}
                    placeholder="Username"
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* ── Components — same UX as Labels ── */}
              <div ref={componentRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <Package className="w-4 h-4 inline mr-1 text-slate-500" />Components
                </label>
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={componentInput}
                      onChange={e => setComponentInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addComponent(componentInput)}
                      onFocus={() => componentInput.length >= 1 && setShowComponentSuggestions(true)}
                      placeholder="Type component name…"
                      className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => addComponent(componentInput)}
                      disabled={!componentInput.trim()}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold">
                      Add
                    </button>
                  </div>

                  {showComponentSuggestions && componentSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-16 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {componentSuggestions.map((name, i) => (
                        <button key={i} type="button"
                          onMouseDown={e => { e.preventDefault(); addComponent(name); }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm flex items-center gap-2">
                          <Package className="w-3 h-3 text-blue-500" />
                          <span>{name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {(currentTest.components || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(currentTest.components || []).map(name => (
                      <span key={name} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1.5">
                        {name}
                        <button type="button" onClick={() => removeComponent(name)}
                          className="text-blue-600 hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Labels ── */}
              <div ref={labelRef}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <Tag className="w-4 h-4 inline mr-1 text-slate-500" />Labels
                </label>
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={e => setLabelInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addLabel(labelInput)}
                      onFocus={() => labelInput.length >= 2 && setShowLabelSuggestions(true)}
                      placeholder="Type label name…"
                      className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={() => addLabel(labelInput)}
                      disabled={!labelInput.trim()}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold">
                      Add
                    </button>
                  </div>

                  {showLabelSuggestions && labelSuggestions.length > 0 && (
                    <div className="absolute z-20 left-0 right-16 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {labelSuggestions.map((label, i) => (
                        <button key={i} type="button"
                          onMouseDown={e => { e.preventDefault(); addLabel(label); }}
                          className="w-full px-4 py-2 text-left hover:bg-blue-50 text-sm flex items-center gap-2">
                          <Tag className="w-3 h-3 text-blue-500" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {(currentTest.labels || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(currentTest.labels || []).map(label => (
                      <span key={label} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm flex items-center gap-1.5">
                        {label}
                        <button type="button" onClick={() => removeLabel(label)}
                          className="text-slate-500 hover:text-red-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Create / Clear */}
          <div className="flex gap-3">
            <button type="button" onClick={handleCreateAll}
              disabled={isCreating || testForms.some(t => !t.summary.trim())}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg flex items-center justify-center gap-2">
              {isCreating
                ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
                : <><CheckCircle2 className="w-6 h-6" />Create {testForms.length} Test Case{testForms.length > 1 ? 's' : ''}</>
              }
            </button>
            <button type="button" onClick={handleClear} disabled={isCreating}
              className="px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 disabled:opacity-50 font-semibold flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Clear All
            </button>
          </div>

          {/* ── Results banner — directly below create button ── */}
          {createdTests.length > 0 && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-400 shadow-lg overflow-hidden">
              {/* Banner header */}
              <div className="flex items-center justify-between px-5 py-3 bg-green-600">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold">
                    Created {createdTests.length} Test Case{createdTests.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={copyAllKeys} type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Copy All Keys
                  </button>
                  <button onClick={handleClear} type="button"
                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors">
                    <X className="w-3.5 h-3.5" /> Dismiss
                  </button>
                </div>
              </div>
              {/* Rows */}
              <div className="divide-y divide-green-100">
                {createdTests.map((t, idx) => (
                  <div key={t.key} className="flex items-center gap-3 px-5 py-3 hover:bg-green-50 transition-colors">
                    <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-green-900 mr-2">{t.key}</span>
                      <span className="text-sm text-green-700 truncate">{t.summary}</span>
                    </div>
                    <button type="button" onClick={() => api.openExternal(t.url)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex-shrink-0">
                      Open in Jira <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Live Preview */}
        <PreviewPanel title="Test Case Preview" currentTest={currentTest} linkedStory={linkedStory} />
      </div>
    </div>
  );
};