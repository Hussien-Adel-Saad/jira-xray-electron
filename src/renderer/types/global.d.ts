/**
 * Global type declarations for Electron API
 * This makes window.electronAPI available in TypeScript
 */

import type { ElectronAPI } from '../main/preload';


declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};