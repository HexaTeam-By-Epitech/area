import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import type { Field } from '../../../common/interfaces/area.type';

/**
 * Google Drive reaction that creates a new folder.
 *
 * This service creates a folder in the user's Google Drive
 * with a specified name and optional parent folder.
 */
@Injectable()
export class GoogleDriveCreateFolderService {
  private readonly logger = new Logger(GoogleDriveCreateFolderService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Creates a new folder in Google Drive.
   *
   * @param userId - The user identifier.
   * @param config - Configuration containing folder name and optional parent folder ID.
   * @returns Promise resolving when folder is created.
   */
  async run(
    userId: string,
    config: { folderName: string; parentFolderId?: string },
  ): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      // Validate config
      if (!config.folderName || config.folderName.trim() === '') {
        throw new Error('Folder name is required');
      }

      // Check if user has linked Google Drive
      const linked = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.GoogleDrive);
      if (!linked) {
        this.logger.warn(`[GoogleDrive] Provider not linked for user=${userId}`);
        throw new Error('Google Drive is not linked. Please link your Google Drive account first.');
      }

      this.logger.log(`[GoogleDrive] Creating folder "${config.folderName}" for user=${userId}`);

      // Prepare folder metadata
      const metadata: any = {
        name: config.folderName,
        mimeType: 'application/vnd.google-apps.folder',
      };

      // If parent folder ID is specified, add it
      if (config.parentFolderId && config.parentFolderId.trim() !== '') {
        metadata.parents = [config.parentFolderId.trim()];
      }

      // Call Google Drive API to create folder
      const { data } = await this.authService.oAuth2ApiRequest<{
        id: string;
        name: string;
        mimeType: string;
        webViewLink?: string;
      }>(
        ProviderKeyEnum.GoogleDrive,
        userId,
        {
          method: 'POST',
          url: 'https://www.googleapis.com/drive/v3/files',
          headers: {
            'Content-Type': 'application/json',
          },
          data: metadata,
          params: {
            fields: 'id,name,mimeType,webViewLink',
          },
        }
      );

      this.logger.log(`[GoogleDrive] Folder created successfully for user=${userId}, folder_id=${data.id}, name=${data.name}`);

      return {
        success: true,
        folderId: data.id,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Unknown error';

      if (status === 403) {
        this.logger.error(
          `[GoogleDrive] Permission denied (403) for user ${userId}. ${errorMessage}`
        );
      } else if (status === 401) {
        this.logger.error(
          `[GoogleDrive] Authentication failed (401) for user ${userId}.`
        );
      } else if (status === 404) {
        this.logger.error(
          `[GoogleDrive] Parent folder not found (404) for user ${userId}. Parent ID: ${config.parentFolderId}`
        );
      } else {
        this.logger.error(
          `[GoogleDrive] Error creating folder for user ${userId}: ${errorMessage}. Status: ${status || 'unknown'}`
        );
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Returns the configuration fields for this reaction.
   */
  getFields(): Field[] {
    return [
      {
        name: 'folderName',
        type: 'string',
        required: true,
      },
      {
        name: 'parentFolderId',
        type: 'string',
        required: false,
      },
    ];
  }
}
