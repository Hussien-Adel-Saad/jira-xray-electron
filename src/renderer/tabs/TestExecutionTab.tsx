/**
 * TestExecutionTab — fully updated
 * ✅ Label suggestions (same UX as TestCasesTab)
 * ✅ Result banner directly below Create button
 * ✅ openExternal for "Open in Jira" (works in Electron)
 * ✅ Accurate success message
 * ✅ resetForm keeps banner visible; Clear wipes everything
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import api from '../api/electron';
import { StoryLinker } from '../components/StoryLinker';
import { TemplateSelector } from '../components/TemplateSelector';
import { Alert } from '../components/common/Alert';
import { IssueValidator, MultiIssueValidator } from '../components/IssueValidator';
import type { CreateTestExecutionInput, StoryValidationResult } from '../../shared/types';
import {
  Play, Trash2, CheckCircle2, FileText,
  User, Tag, Search, Copy, ExternalLink, X, Plus, Calendar, Layers,
} from 'lucide-react';

const emptyExecution = (): CreateTestExecutionInput => ({
  summary: '', description: '', fixVersions: [], assignee: '', reporter: '', labels: [],
});

interface CreatedItem { key: string; url: string; summary: string; }

export const TestExecutionTab: React.FC = () => {
  const { auth, templates } = useAppStore();
  const [currentExecution, setCurrentExecution] = useState<CreateTestExecutionInput>(emptyExecution());
  const [linkedStory, setLinkedStory] = useState<StoryValidationResult | null>(null);
  const [testPlanKey, setTestPlanKey] = useState('');
  const [validatedTestPlan, setValidatedTestPlan] = useState<StoryValidationResult | null>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdItem, setCreatedItem] = useState<CreatedItem | null>(null);

  // Metadata
  const [versions, setVersions] = useState<any[]>([]);
  const [versionInput, setVersionInput] = useState('');

  // Label suggestions
  const [labelInput, setLabelInput] = useState('');
  const [labelSuggestions, setLabelSuggestions] = useState<string[]>([]);
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);

  // Test search
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [foundTestKeys, setFoundTestKeys] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    api.getVersions().then(r => { if (r.success) setVersions(r.data); });
  }, []);

  useEffect(() => {
    if (auth.username) setCurrentExecution(prev => ({ ...prev, reporter: auth.username || '' }));
  }, [auth.username]);

  // Label suggestions debounce
  useEffect(() => {
    const id = setTimeout(async () => {
      if (labelInput.length >= 2) {
        try {
          const res = await api.getLabelSuggestions(labelInput);
          if (res.success) { setLabelSuggestions(res.data.map((s: any) => s.label)); setShowLabelSuggestions(true); }
        } catch { /* ignore */ }
      } else { setLabelSuggestions([]); setShowLabelSuggestions(false); }
    }, 300);
    return () => clearTimeout(id);
  }, [labelInput]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) setShowLabelSuggestions(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const addLabel = (label: string) => {
    const v = label.trim();
    if (!v) return;
    const cur = currentExecution.labels || [];
    if (!cur.includes(v)) setCurrentExecution(prev => ({ ...prev, labels: [...(prev.labels || []), v] }));
    setLabelInput(''); setShowLabelSuggestions(false);
  };

  const removeLabel = (label: string) =>
    setCurrentExecution(prev => ({ ...prev, labels: (prev.labels || []).filter(l => l !== label) }));

  const handleAddVersion = () => {
    if (!versionInput.trim()) return;
    const v = versionInput.trim();
    const cur = currentExecution.fixVersions || [];
    if (!cur.includes(v)) setCurrentExecution(prev => ({ ...prev, fixVersions: [...(prev.fixVersions || []), v] }));
    setVersionInput('');
  };

  const handleRemoveVersion = (version: string) =>
    setCurrentExecution(prev => ({ ...prev, fixVersions: (prev.fixVersions || []).filter(v => v !== version) }));

  const handleSearchByLabel = async () => {
    if (!labelSearchQuery.trim()) return;
    setIsSearching(true); setError('');
    try {
      const result = await api.searchTestsByLabel(labelSearchQuery.trim());
      if (result.success && result.data.length > 0) {
        setFoundTestKeys(result.data);
        setSuccess(`Found ${result.data.length} test(s) with label "${labelSearchQuery}"`);
      } else { setError(`No tests found with label "${labelSearchQuery}"`); setFoundTestKeys([]); }
    } catch (err: any) { setError(err.message || 'Search failed'); }
    finally { setIsSearching(false); }
  };

  const handleAddFoundTests = () => {
    const newTests = foundTestKeys.filter(k => !selectedTests.includes(k));
    setSelectedTests([...selectedTests, ...newTests]);
    setSuccess(`Added ${newTests.length} test(s) to execution`);
    setFoundTestKeys([]); setLabelSearchQuery('');
  };

  const handleCreate = async () => {
    if (!currentExecution.summary.trim()) { setError('Summary is required'); return; }
    setIsCreating(true); setError(''); setSuccess(''); setCreatedItem(null);
    try {
      const result = await api.createExecution(currentExecution, selectedTests);
      if (!result.success) { setError(result.error?.message || 'Failed to create Test Execution'); return; }

      const key = result.data.key;
      const url = `${auth.jiraBaseUrl}/browse/${key}`;
      const linkErrors: string[] = [];

      if (linkedStory) {
        try { await api.linkIssues('Relates', key, linkedStory.key); }
        catch (e: any) { linkErrors.push(`Story link: ${e.message || 'failed'}`); }
      }

      if (validatedTestPlan) {
        try { await api.linkIssues('Relates', key, validatedTestPlan.key); }
        catch (e: any) { linkErrors.push(`Test Plan link: ${e.message || 'failed'}`); }
      }

      setCreatedItem({ key, url, summary: currentExecution.summary });

      const linkedCount = [linkedStory, validatedTestPlan].filter(Boolean).length;
      const linkedMsg = linkedCount > 0 && linkErrors.length === 0
        ? ` with ${linkedCount} link${linkedCount > 1 ? 's' : ''}` : '';
      const errMsg = linkErrors.length > 0 ? ` (${linkErrors.join('; ')})` : '';
      setSuccess(`✅ Created Test Execution: ${key}${linkedMsg}${errMsg}`);
      resetForm();
    } catch (err: any) { setError(err.message || 'Failed to create Test Execution'); }
    finally { setIsCreating(false); }
  };

  const resetForm = () => {
    setCurrentExecution({ ...emptyExecution(), reporter: auth.username || '' });
    setLinkedStory(null);
    setTestPlanKey(''); setValidatedTestPlan(null);
    setSelectedTests([]); setFoundTestKeys([]); setLabelSearchQuery('');
  };

  const handleClear = () => { resetForm(); setCreatedItem(null); setSuccess(''); setError(''); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Play className="w-6 h-6" />
          </div>
          <div><h2 className="text-2xl font-bold">Test Execution</h2>
            <p className="text-green-100 text-sm">Create and manage test execution cycles</p></div>
        </div>
      </div>

      {error   && <Alert type="error"   message={error}   onDismiss={() => setError('')} />}
      {success && <Alert type="success" message={success} onDismiss={() => setSuccess('')} />}

      <TemplateSelector templates={templates} issueType="TestExecution"
        onApply={fields => setCurrentExecution(prev => ({ ...prev, ...fields }))}
        onError={setError} onSuccess={setSuccess} />

      <StoryLinker linkedStory={linkedStory} onLink={setLinkedStory} onSuccess={setSuccess} />

      {/* Test Plan Association */}
      <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl border-2 border-teal-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-green-600 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-slate-900">Test Plan</h3>
            <p className="text-xs text-slate-500">Link this execution to a test plan</p>
          </div>
          <span className="px-2 py-1 bg-teal-100 border border-teal-300 rounded text-xs text-teal-700">Optional</span>
        </div>
        <IssueValidator value={testPlanKey} onChange={setTestPlanKey}
          onValidation={setValidatedTestPlan} placeholder="MTD-200"
          allowedTypes={['Test Plan']} />
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Basic Information</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Summary <span className="text-red-500">*</span></label>
            <input type="text" value={currentExecution.summary}
              onChange={e => setCurrentExecution(prev => ({ ...prev, summary: e.target.value }))}
              placeholder="Brief description of this execution cycle"
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea value={currentExecution.description}
              onChange={e => setCurrentExecution(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description…" rows={3}
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Test Selection */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Add Tests</h3>
        </div>
        <div className="mb-4">
          <MultiIssueValidator
            value={selectedTests}
            onChange={setSelectedTests}
            onValidation={() => {}}
            allowedTypes={['Test']}
            placeholder="MTD-123, MTD-456"
            label="Add test keys manually"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Search tests by label</label>
          <div className="flex gap-2">
            <input type="text" value={labelSearchQuery}
              onChange={e => setLabelSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchByLabel()}
              placeholder="e.g. regression"
              className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            <button type="button" onClick={handleSearchByLabel} disabled={isSearching}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">
              <Search className="w-4 h-4" />{isSearching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {foundTestKeys.length > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-800">Found {foundTestKeys.length} test(s)</span>
                <button type="button" onClick={handleAddFoundTests}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700">
                  <Plus className="w-3 h-3" /> Add All
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {foundTestKeys.map(k => (
                  <span key={k} className="px-2 py-0.5 bg-white border border-green-200 rounded text-xs font-mono">{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {selectedTests.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selected Tests ({selectedTests.length})</label>
            <div className="flex flex-wrap gap-2">
              {selectedTests.map(k => (
                <span key={k} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1.5">
                  {k}
                  <button type="button" onClick={() => setSelectedTests(selectedTests.filter(t => t !== k))}
                    className="text-green-600 hover:text-red-600">×</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Details */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-bold text-slate-900">Additional Details</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <User className="w-4 h-4 inline mr-1 text-slate-500" />Assignee
              </label>
              <input type="text" value={currentExecution.assignee}
                onChange={e => setCurrentExecution(prev => ({ ...prev, assignee: e.target.value }))}
                placeholder="Username"
                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <User className="w-4 h-4 inline mr-1 text-slate-500" />Reporter
              </label>
              <input type="text" value={currentExecution.reporter}
                onChange={e => setCurrentExecution(prev => ({ ...prev, reporter: e.target.value }))}
                placeholder="Username"
                className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>

          {/* Fix Versions */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fix Versions</label>
            <div className="flex gap-2 mb-2">
              <select value={versionInput} onChange={e => setVersionInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">-- Select Version --</option>
                {versions.map((v: any) => <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
              <button type="button" onClick={handleAddVersion} disabled={!versionInput}
                className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">Add</button>
            </div>
            {(currentExecution.fixVersions || []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(currentExecution.fixVersions || []).map(v => (
                  <span key={v} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-1.5">
                    {v}
                    <button type="button" onClick={() => handleRemoveVersion(v)} className="text-green-600 hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Labels with suggestions */}
          <div ref={labelRef}>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              <Tag className="w-4 h-4 inline mr-1 text-slate-500" />Labels
            </label>
            <div className="relative">
              <div className="flex gap-2 mb-2">
                <input type="text" value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLabel(labelInput)}
                  onFocus={() => labelInput.length >= 2 && setShowLabelSuggestions(true)}
                  placeholder="Type label name…"
                  className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                <button type="button" onClick={() => addLabel(labelInput)} disabled={!labelInput.trim()}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold">Add</button>
              </div>
              {showLabelSuggestions && labelSuggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-16 bg-white border-2 border-green-300 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {labelSuggestions.map((label, i) => (
                    <button key={i} type="button"
                      onMouseDown={e => { e.preventDefault(); addLabel(label); }}
                      className="w-full px-4 py-2 text-left hover:bg-green-50 text-sm flex items-center gap-2">
                      <Tag className="w-3 h-3 text-green-500" /><span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(currentExecution.labels || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {(currentExecution.labels || []).map(label => (
                  <span key={label} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm flex items-center gap-1.5">
                    {label}
                    <button type="button" onClick={() => removeLabel(label)} className="text-slate-500 hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Clear */}
      <div className="flex gap-3">
        <button type="button" onClick={handleCreate} disabled={isCreating || !currentExecution.summary.trim()}
          className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg flex items-center justify-center gap-2">
          {isCreating
            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
            : <><CheckCircle2 className="w-6 h-6" />Create Test Execution</>}
        </button>
        <button type="button" onClick={handleClear} disabled={isCreating}
          className="px-6 py-4 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 disabled:opacity-50 font-semibold flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Clear
        </button>
      </div>

      {/* Result banner — directly below create button */}
      {createdItem && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-400 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-green-600">
            <div className="flex items-center gap-2 text-white">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Test Execution Created</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button"
                onClick={() => { navigator.clipboard.writeText(createdItem.key); setSuccess('📋 Copied!'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold">
                <Copy className="w-3.5 h-3.5" /> Copy Key
              </button>
              <button type="button" onClick={handleClear}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold">
                <X className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <span className="font-bold text-green-900 mr-2">{createdItem.key}</span>
              <span className="text-sm text-green-700">{createdItem.summary}</span>
            </div>
            <button type="button" onClick={() => api.openExternal(createdItem.url)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 flex-shrink-0">
              Open in Jira <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};