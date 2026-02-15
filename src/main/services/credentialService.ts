/**
 * Credential Service - Simple configuration-based auth
 * Credentials loaded from .env file (not committed to git)
 */

import { getJiraConfig, createBasicAuth as createAuth } from '../config';
import { AppError } from '../../shared/types';
import { ErrorCode } from '../../shared/constants';

export class CredentialService {
  /**
   * Get credentials from .env and create Basic Auth token
   */
  static getCredentials(): { username: string; basicAuth: string; baseUrl: string; projectKey: string } {
    try {
      const config = getJiraConfig();
      const basicAuth = createAuth(config.username, config.password);

      return {
        username: config.username,
        basicAuth,
        baseUrl: config.baseUrl,
        projectKey: config.projectKey,
      };
    } catch (error) {
      throw this.createError(
        ErrorCode.AUTH_FAILED,
        'Failed to load credentials from .env file',
        error
      );
    }
  }

  /**
   * Create Basic Auth header from username and password
   */
  static createBasicAuth(username: string, password: string): string {
    const credentials = `${username}:${password}`;
    const encoded = Buffer.from(credentials).toString('base64');
    return encoded;
  }

  /**
   * Validate Basic Auth token format
   */
  static validateBasicAuth(authToken: string): boolean {
    try {
      const decoded = Buffer.from(authToken, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create standardized error
   */
  private static createError(code: ErrorCode, message: string, details?: any): AppError {
    return {
      code,
      message,
      details: details?.message || details,
    };
  }
}