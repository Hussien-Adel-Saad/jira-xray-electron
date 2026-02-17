/**
 * Auth IPC Handlers
 * Auto-initializes from .env file (no login UI needed)
 * Initializes metadata cache on startup for performance
 */

import { ipcMain } from 'electron';
import { CredentialService } from '../services/credentialService';
import { JiraService } from '../services/jiraService';
import { IPC_CHANNELS } from '../../shared/constants';
import type { AuthStatus, Result } from '../../shared/types';
import { ErrorCode } from '../../shared/constants';

// In-memory session state (auto-loaded from .env)
let currentSession: {
  username: string;
  basicAuth: string;
  jiraBaseUrl: string;
  projectKey: string;
  jiraService: JiraService;
} | null = null;

/**
 * Initialize auth from .env on app startup
 * Also initializes metadata cache for performance
 */
export async function initializeAuth(): Promise<void> {
  try {
    const credentials = CredentialService.getCredentials();
    
    // Create Jira service instance
    const jiraService = new JiraService(
      credentials.baseUrl,
      credentials.projectKey,
      credentials.basicAuth
    );

    currentSession = {
      username: credentials.username,
      basicAuth: credentials.basicAuth,
      jiraBaseUrl: credentials.baseUrl,
      projectKey: credentials.projectKey,
      jiraService,
    };

    console.log('✅ Auto-logged in from .env:', credentials.username);

    // Initialize metadata cache in background for performance
    console.log('🔄 Initializing metadata cache...');
    await jiraService.initializeMetadata();
    console.log('✅ Metadata cache ready');

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
        await initializeAuth();
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
    throw {
      code: ErrorCode.AUTH_FAILED,
      message: 'Not authenticated. Please restart the app.',
    };
  }
  return currentSession;
}

/**
 * Get Jira service instance from current session
 */
export function getJiraService(): JiraService {
  const session = getCurrentSession();
  return session.jiraService;
}

/**
 * Clear session on app quit
 */
export function clearSession() {
  currentSession = null;
}