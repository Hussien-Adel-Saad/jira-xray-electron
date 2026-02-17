/**
 * Main Application Component - MODERNIZED
 * Clean, professional interface with Lucide React icons
 */

import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import api from './api/electron';
import { TestCasesTab } from './tabs/TestCasesTab';
import { TestSetsTab } from './tabs/TestSetsTab';
import { TestExecutionTab } from './tabs/TestExecutionTab';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Package, 
  Play,
  Server,
  User
} from 'lucide-react';

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

  // Tab configuration with modern icons
  const tabs = [
    { id: 'testcases' as const, label: 'Test Cases', icon: FileText, color: 'blue' },
    { id: 'testsets' as const, label: 'Test Sets', icon: Package, color: 'purple' },
    { id: 'execution' as const, label: 'Execution', icon: Play, color: 'green' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Jira Xray Orchestrator
                </h1>
                <p className="text-xs text-slate-500">Test Management Platform</p>
              </div>
            </div>

            {/* Auth Status & Info */}
            <div className="flex items-center gap-4">
              {auth.isAuthenticated ? (
                <>
                  {/* Connection Status */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Connected</span>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                    <User className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">{auth.username}</span>
                  </div>

                  {/* Project Badge */}
                  <div className="px-3 py-1.5 bg-blue-100 border border-blue-200 rounded-lg">
                    <span className="text-sm font-bold text-blue-700">{auth.projectKey}</span>
                  </div>

                  {/* Server URL */}
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Server
                    </div>
                    <div className="text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {new URL(auth.jiraBaseUrl).hostname}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Not Connected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="max-w-[1800px] mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative px-6 py-3 font-semibold transition-all duration-200 flex items-center gap-2
                    ${isActive
                      ? `bg-gradient-to-br from-${tab.color}-600 to-${tab.color}-700 text-white shadow-lg`
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-b-2 border-transparent hover:border-slate-300'
                    }
                  `}
                  style={isActive ? {
                    background: tab.color === 'blue' 
                      ? 'linear-gradient(to bottom right, rgb(37, 99, 235), rgb(29, 78, 216))'
                      : tab.color === 'purple'
                      ? 'linear-gradient(to bottom right, rgb(147, 51, 234), rgb(126, 34, 206))'
                      : 'linear-gradient(to bottom right, rgb(22, 163, 74), rgb(21, 128, 61))'
                  } : {}}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full"
                      style={{
                        background: tab.color === 'blue' 
                          ? 'rgb(96, 165, 250)'
                          : tab.color === 'purple'
                          ? 'rgb(192, 132, 252)'
                          : 'rgb(134, 239, 172)'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content with Fade Animation */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="animate-fadeIn">
          {activeTab === 'testcases' && <TestCasesTab />}
          {activeTab === 'testsets' && <TestSetsTab />}
          {activeTab === 'execution' && <TestExecutionTab />}
        </div>
      </div>

      {/* Modern Footer */}
      <div className="fixed bottom-4 right-4 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>System Ready</span>
        </div>
      </div>
    </div>
  );
}