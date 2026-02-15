/**
 * Main Application Component
 * Modern tab-based container for Jira/Xray test orchestration
 */

import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import api from './api/electron';
import { TestCasesTab } from './tabs/TestCasesTab';
import { TestSetsTab } from './tabs/TestSetsTab';
import { TestExecutionTab } from './tabs/TestExecutionTab';

export default function App() {
  const { auth, setAuth, activeTab, setActiveTab, setTemplates } = useAppStore();

  // Load auth and templates on mount
  useEffect(() => {
    checkAuth();
    loadTemplates();
  }, []);

  const checkAuth = async () => {
    const result = await api.getAuthStatus();
    if (result.success) {
      setAuth(result.data);
    }
  };

  const loadTemplates = async () => {
    const result = await api.getTemplates();
    if (result.success) {
      setTemplates(result.data);
    }
  };

  // Tab Button Component
  const TabButton = ({ tab, label, icon }: { tab: typeof activeTab; label: string; icon: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-6 py-3 font-semibold transition-all relative ${
        activeTab === tab
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
          : 'bg-white text-gray-700 hover:bg-gray-50 border-b-2 border-transparent hover:border-gray-300'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        {label}
      </span>
      {activeTab === tab && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-400"></div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Jira Xray Orchestrator
              </h1>
              <div className="flex items-center gap-3 mt-2">
                {auth.isAuthenticated ? (
                  <>
                    <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Connected
                    </span>
                    <span className="text-sm text-gray-600">
                      {auth.username}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {auth.projectKey}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    Not authenticated
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Base URL
              </div>
              <div className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded">
                {auth.jiraBaseUrl || 'Not configured'}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-1">
            <TabButton tab="testcases" label="Test Cases" icon="📝" />
            <TabButton tab="testsets" label="Test Sets" icon="📦" />
            <TabButton tab="execution" label="Execution" icon="🚀" />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        {activeTab === 'testcases' && <TestCasesTab />}
        {activeTab === 'testsets' && <TestSetsTab />}
        {activeTab === 'execution' && <TestExecutionTab />}
      </div>
    </div>
  );
}