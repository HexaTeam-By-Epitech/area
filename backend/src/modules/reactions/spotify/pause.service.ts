import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import { AuthService } from '../../auth/auth.service';
import type { Reactions, Field } from '../../../common/interfaces/area.type';

/**
 * Spotify reaction that pauses the user's current playback.
 *
 * This service uses the Spotify API to pause whatever is currently playing.
 */
@Injectable()
export class SpotifyPauseService implements Reactions {
    /** Logger instance scoped to this service. */
    private readonly logger = new Logger(SpotifyPauseService.name);

    constructor(
        /** Users domain service used to resolve linked provider accounts. */
        private readonly usersService: UsersService,
        /** Auth service used to perform OAuth2-authenticated requests to Spotify. */
        private readonly authService: AuthService,
    ) {}

    /**
     * Pauses the user's current Spotify playback.
     *
     * @param userId - The user identifier.
     * @param params - Optional parameters (currently none required).
     * @returns A promise that resolves when playback is paused.
     */
    async run(userId: string, params?: Record<string, any>): Promise<void> {
        // Retrieve the user's linked Spotify account
        const spotifyAccount = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Spotify);
        if (!spotifyAccount) {
            this.logger.warn(`User ${userId} does not have a linked Spotify account.`);
            throw new Error('Spotify account not linked');
        }

        // Get access token using AuthService
        const accessToken = await this.authService.getCurrentAccessToken(ProviderKeyEnum.Spotify, userId);
        if (!accessToken) {
            this.logger.warn(`Failed to obtain access token for user ${userId}.`);
            throw new Error('Failed to obtain access token');
        }

        // Pause playback using Spotify API
        // PUT https://api.spotify.com/v1/me/player/pause
        const url = 'https://api.spotify.com/v1/me/player/pause';
        try {
            await this.authService.oAuth2ApiRequest(ProviderKeyEnum.Spotify, userId, {
                method: 'PUT',
                url,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            this.logger.log(`Successfully paused playback for user ${userId}.`);
        } catch (err: any) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            
            // 404 means no active device, which is a common scenario
            if (status === 404) {
                this.logger.warn(`No active device found for user ${userId}`);
                throw new Error('No active Spotify device found');
            }
            
            this.logger.error(
                `Failed to pause playback for user ${userId}: status=${status} body=${JSON.stringify(data)}`,
            );
            throw new Error('Failed to pause Spotify playback');
        }
    }

    getFields(): Field[] {
        // No configuration fields needed for pause
        return [];
    }
}
