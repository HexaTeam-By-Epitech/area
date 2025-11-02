import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';
import { RedisService } from '../../redis/redis.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import type { PollingAction, ActionResult, ActionPlaceholder } from '../../../common/interfaces/area.type';
import { ActionNamesEnum } from '../../../common/interfaces/action-names.enum';

/**
 * Google Drive polling action that detects when a new file is uploaded.
 *
 * This service periodically queries the Google Drive API for files created
 * after the last check timestamp and emits an event for each new file.
 *
 * Implements the `PollingAction` interface with action name `ActionNamesEnum.GDRIVE_NEW_FILE`.
 */
@Injectable()
export class GoogleDriveNewFileService implements PollingAction {
  /**
   * In-memory map of active polling intervals keyed by `userId`.
   */
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  /** Logger instance scoped to this service. */
  private readonly logger = new Logger(GoogleDriveNewFileService.name);
  
  /** Polling interval in milliseconds (default: 30 seconds) */
  private readonly pollIntervalMs = Number(process.env.GDRIVE_POLL_INTERVAL_MS || 30000);

  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  // PollingAction interface
  /**
   * Returns whether this action supports the given `actionName`.
   *
   * @param actionName - The identifier of the action to check.
   * @returns `true` if the action name is `ActionNamesEnum.GDRIVE_NEW_FILE`.
   */
  supports(actionName: string): boolean {
    return actionName === ActionNamesEnum.GDRIVE_NEW_FILE;
  }

  /**
   * Starts polling for the given user and emits results to the provided callback.
   *
   * @param userId - The user identifier.
   * @param emit - Callback invoked with the ActionResult containing code and file data.
   */
  start(userId: string, emit: (result: ActionResult) => void): void {
    this.startPolling(userId, emit);
  }

  /**
   * Stops polling for the given user.
   *
   * @param userId - The user identifier.
   */
  stop(userId: string): void {
    this.stopPolling(userId);
  }

  /**
   * Checks if any new files have been uploaded to Google Drive since the last check.
   *
   * @param userId - The user identifier.
   * @returns A promise resolving to an ActionResult with code and file data.
   */
  async hasNewFile(userId: string): Promise<ActionResult> {
    try {
      // Check if user has linked Google Drive
      const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.GoogleDrive);
      if (!linked) {
        this.logger.debug(`[GoogleDrive] Provider not linked for user=${userId}`);
        return { code: -1 };
      }

      // Get last check timestamp from Redis
      const redisKey = `gdrive:lastCheck:${userId}`;
      const lastCheckStr = await this.redisService.getValue(redisKey);
      const lastCheck = lastCheckStr ? new Date(lastCheckStr) : new Date(Date.now() - 60000); // Default: 1 minute ago

      // Build query to get files created after lastCheck
      const query = `createdTime > '${lastCheck.toISOString()}' and trashed = false`;

      // Call Google Drive API
      const { data } = await this.authService.oAuth2ApiRequest<{
        files: Array<{
          id: string;
          name: string;
          mimeType: string;
          createdTime: string;
          modifiedTime: string;
          webViewLink: string;
          size?: string;
          parents?: string[];
        }>;
      }>(
        ProviderKeyEnum.GoogleDrive,
        userId,
        {
          method: 'GET',
          url: 'https://www.googleapis.com/drive/v3/files',
          params: {
            q: query,
            fields: 'files(id,name,mimeType,createdTime,modifiedTime,webViewLink,size,parents)',
            orderBy: 'createdTime desc',
            pageSize: 10, // Get up to 10 new files
          },
        }
      );

      const newFiles = data.files || [];

      // Update last check timestamp
      const now = new Date();
      await this.redisService.setValue(redisKey, now.toISOString(), 86400); // 24 hours TTL

      if (newFiles.length === 0) {
        this.logger.debug(`No new files for user ${userId}`);
        return { code: 1 }; // No change
      }

      // Return the most recent file with its data
      const latestFile = newFiles[0];
      this.logger.log(`New file detected for user ${userId}: ${latestFile.name}`);

      return {
        code: 0, // New file detected
        data: {
          GDRIVE_FILE_ID: latestFile.id,
          GDRIVE_FILE_NAME: latestFile.name,
          GDRIVE_FILE_TYPE: latestFile.mimeType,
          GDRIVE_FILE_LINK: latestFile.webViewLink,
          GDRIVE_FILE_SIZE: latestFile.size || 'N/A',
          GDRIVE_FILE_CREATED: latestFile.createdTime,
          GDRIVE_FILES_COUNT: newFiles.length.toString(),
        },
      };
    } catch (error: any) {
      const status = error?.response?.status;
      
      if (status === 403) {
        this.logger.error(
          `[GoogleDrive] Permission denied (403) for user ${userId}. User needs to re-authorize with Google Drive permissions. Response: ${JSON.stringify(error?.response?.data)}`
        );
        this.logger.error(
          `[GoogleDrive] User should unlink and re-link Google Drive at: /auth/google_drive/unlink?userId=${userId} then /auth/google_drive/link?userId=${userId}`
        );
      } else if (status === 401) {
        this.logger.error(
          `[GoogleDrive] Authentication failed (401) for user ${userId}. Token may be invalid or expired.`
        );
      } else {
        this.logger.error(
          `[GoogleDrive] Error checking new files for user ${userId}: ${error?.message ?? error}. Status: ${status || 'unknown'}`
        );
      }
      
      return { code: -1 }; // Error
    }
  }

  /**
   * Starts an interval that periodically checks for new files and
   * invokes the provided callback with the ActionResult.
   *
   * @param userId - The user identifier.
   * @param callback - Invoked with ActionResult containing code and file data.
   */
  private startPolling(userId: string, callback: (result: ActionResult) => void): void {
    if (this.pollIntervals.has(userId)) {
      this.logger.warn(`Polling already active for user ${userId}`);
      return; // Already polling
    }

    this.logger.log(`Starting Google Drive polling for user ${userId}`);

    // Check immediately on start
    this.hasNewFile(userId).then(callback).catch((err) => {
      this.logger.error(`Initial poll error for user ${userId}: ${err?.message ?? err}`);
    });

    const interval = setInterval(async () => {
      try {
        const result = await this.hasNewFile(userId);
        callback(result);
      } catch (err: any) {
        this.logger.error(`Poll error for user ${userId}: ${err?.message ?? err}`);
      }
    }, this.pollIntervalMs);

    this.pollIntervals.set(userId, interval);
  }

  /**
   * Clears and removes the active polling interval for the given user.
   *
   * @param userId - The user identifier.
   */
  private stopPolling(userId: string): void {
    const interval = this.pollIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(userId);
      this.logger.log(`Stopped Google Drive polling for user ${userId}`);
    }
  }

  /**
   * Returns the list of placeholders available for this action.
   * These placeholders can be used in reaction configurations.
   */
  getPlaceholders(): ActionPlaceholder[] {
    return [
      {
        key: 'GDRIVE_FILE_ID',
        description: 'The unique ID of the newly uploaded file',
        example: '1abc123def456ghi789',
      },
      {
        key: 'GDRIVE_FILE_NAME',
        description: 'The name of the newly uploaded file',
        example: 'My Document.pdf',
      },
      {
        key: 'GDRIVE_FILE_TYPE',
        description: 'The MIME type of the file',
        example: 'application/pdf',
      },
      {
        key: 'GDRIVE_FILE_LINK',
        description: 'Web link to view the file in Google Drive',
        example: 'https://drive.google.com/file/d/...',
      },
      {
        key: 'GDRIVE_FILE_SIZE',
        description: 'Size of the file in bytes',
        example: '1048576',
      },
      {
        key: 'GDRIVE_FILE_CREATED',
        description: 'Timestamp when the file was created',
        example: '2024-01-15T10:30:00.000Z',
      },
      {
        key: 'GDRIVE_FILES_COUNT',
        description: 'Number of new files detected in this check',
        example: '3',
      },
    ];
  }
}
