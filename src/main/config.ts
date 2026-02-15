/**
 * Jira Configuration Loader
 * ------------------------
 * Loads credentials from .env in project root using dotenv.
 * Works in dev and production builds.
 */

import path from 'path';
import dotenv from 'dotenv';

interface JiraConfig {
  baseUrl: string;
  projectKey: string;
  username: string;
  password: string;
}

/**
 * Load .env file safely
 */
function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env'); // project root
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    throw new Error(
      `Failed to load .env file at ${envPath}.\n` +
      `Copy .env.example and fill in your Jira credentials.\n` +
      `Error details: ${result.error.message}`
    );
  }
}

/**
 * Get Jira configuration from environment
 */
export function getJiraConfig(): JiraConfig {
  loadEnv();

  const baseUrl = process.env.JIRA_BASE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY;
  const username = process.env.JIRA_USERNAME;
  const password = process.env.JIRA_PASSWORD;

  // Validate required fields
  if (!baseUrl) throw new Error('JIRA_BASE_URL is required in .env');
  if (!projectKey) throw new Error('JIRA_PROJECT_KEY is required in .env');
  if (!username) throw new Error('JIRA_USERNAME is required in .env');
  if (!password) throw new Error('JIRA_PASSWORD is required in .env');

  // Validate URL
  if (!baseUrl.startsWith('https://')) {
    throw new Error('JIRA_BASE_URL must use HTTPS');
  }

  return { baseUrl, projectKey, username, password };
}

/**
 * Create Basic Auth token for Jira
 */
export function createBasicAuth(username: string, password: string): string {
  return Buffer.from(`${username}:${password}`).toString('base64');
}