export interface ElectronAPI {
  platform: string;
  
  // Jira/Xray methods
  testConnection: (config: any) => Promise<{ success: boolean; message: string }>;
  fetchProjects: () => Promise<any[]>;
  createTestCase: (data: any) => Promise<{ success: boolean; id: string }>;
  searchTestsByLabel: (label: string) => Promise<any>;
  getTestsByKeys: (keys: string[]) => Promise<any>;
  linkToTestPlan: (executionKey: string, testPlanKey: string) => Promise<any>;
  addTestsToSet: (testSetKey: string, testKeys: string[]) => Promise<any>;
  addTestsToExecution: (executionKey: string, testKeys: string[]) => Promise<any>;
  addTestStep: (testKey: string, step: any) => Promise<any>;
  // Credential management
  getCredentials: () => Promise<any>;
  saveCredentials: (credentials: any) => Promise<{ success: boolean }>;
  deleteCredentials: () => Promise<{ success: boolean }>;
  
  // Event listeners
  onProgress: (callback: (progress: any) => void) => void;
  removeProgressListener: () => void;

}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};