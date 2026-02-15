/**
 * Electron API Wrapper
 * Type-safe wrapper around window.electronAPI
 */

// Check if electronAPI is available and provide helpful error message
if (typeof window === 'undefined') {
  throw new Error('This module can only be used in the renderer process');
}

if (!window.electronAPI) {
  console.error('electronAPI is not available on window object');
  console.error('This usually means:');
  console.error('1. The preload script failed to load');
  console.error('2. The preload script path in main process is incorrect');
  console.error('3. contextBridge.exposeInMainWorld was not called');
  console.error('Check the console for preload script errors');
  throw new Error('electronAPI not available. Make sure preload script is loaded.');
}

export const api = window.electronAPI;

export default api;