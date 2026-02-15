/**
 * Field Mapping IPC Handlers
 * Provides field mapping configuration to renderer process
 */

import { ipcMain } from 'electron';
import { FieldMappingService } from '../services/fieldMappingService';
import { FIELD_MAPPING } from '../../shared/constants';
import type { Result, AppError } from '../../shared/types';

export function registerFieldMappingHandlers(): void {
  /**
   * Get complete field mapping
   */
  ipcMain.handle(
    FIELD_MAPPING.GET_FIELD_MAPPING,
    async (): Promise<Result<any>> => {
      try {
        const mapping = FieldMappingService.getMapping();
        return { success: true, data: mapping };
      } catch (error: unknown) {
        return { 
          success: false, 
          error: error as AppError 
        };
      }
    }
  );

  /**
   * Get fields for a specific issue type
   */
  ipcMain.handle(
    FIELD_MAPPING.GET_ISSUE_TYPE_FIELDS,
    async (_: unknown, issueType: 'Test' | 'Test Set' | 'Test Execution'): Promise<Result<any>> => {
      try {
        const fields = FieldMappingService.getIssueTypeFields(issueType);
        return { success: true, data: fields };
      } catch (error: unknown) {
        return { 
          success: false, 
          error: error as AppError 
        };
      }
    }
  );
}