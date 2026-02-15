/**
 * Auth IPC Handlers
 * Auto-initializes from .env file (no login UI needed)
 */

import { ipcMain } from 'electron';
import { CredentialService } from '../services/credentialService';
import { IPC_CHANNELS } from '../../shared/constants';
import type { AuthStatus, Result } from '../../shared/types';
import { ErrorCode } from '../../shared/constants';

// In-memory session state (auto-loaded from .env)
let currentSession: {
  username: string;
  basicAuth: string;
  jiraBaseUrl: string;
  projectKey: string;
} | null = null;

/**
 * Initialize auth from .env on app startup
 */
export function initializeAuth(): void {
  try {
    const credentials = CredentialService.getCredentials();
    
    currentSession = {
      username: credentials.username,
      basicAuth: credentials.basicAuth,
      jiraBaseUrl: credentials.baseUrl,
      projectKey: credentials.projectKey,
    };

    console.log('✅ Auto-logged in from .env:', credentials.username);
  } catch (error) {
    console.error('❌ Failed to load credentials from .env:', error);
    console.error('Please create a .env file with your Jira credentials');
    console.error('See .env.example for template');
    throw error;
  }
}

export function registerAuthHandlers() {
  /**
   * Get current auth status
   */
  ipcMain.handle(IPC_CHANNELS.GET_AUTH_STATUS, async (): Promise<Result<AuthStatus>> => {
    try {
      if (!currentSession) {
        // Try to initialize if not already done
        initializeAuth();
      }

      return {
        success: true,
        data: {
          isAuthenticated: true,
          username: currentSession!.username,
          jiraBaseUrl: currentSession!.jiraBaseUrl,
          projectKey: currentSession!.projectKey,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: ErrorCode.AUTH_FAILED,
          message: 'Failed to load credentials from .env',
          details: error.message,
        },
      };
    }
  });

  /**
   * Logout (clears session)
   */
  ipcMain.handle(IPC_CHANNELS.LOGOUT, async (): Promise<Result<void>> => {
    currentSession = null;
    return { success: true, data: undefined };
  });
}

/**
 * Get current session (for use by other handlers)
 */
export function getCurrentSession() {
  if (!currentSession) {
    initializeAuth();
  }
  return currentSession;
}

/**
 * Clear session on app quit
 */
export function clearSession() {
  currentSession = null;
}