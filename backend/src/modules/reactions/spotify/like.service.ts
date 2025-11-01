import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import { AuthService } from '../../auth/auth.service';
import type { Reactions, Field } from '../../../common/interfaces/area.type';

/**
 * Spotify reaction that likes (saves) a track to the user's library.
 *
 * This service uses the Spotify API to add a track to the user's "Liked Songs".
 */
@Injectable()
export class SpotifyLikeReactionService implements Reactions {
    /** Logger instance scoped to this service. */
    private readonly logger = new Logger(SpotifyLikeReactionService.name);

    constructor(
        /** Users domain service used to resolve linked provider accounts. */
        private readonly usersService: UsersService,
        /** Auth service used to perform OAuth2-authenticated requests to Spotify. */
        private readonly authService: AuthService,
    ) {}

    /**
     * Likes a track on Spotify using the Spotify API.
     *
     * @param userId - The user identifier.
     * @param params - Object containing the track ID to like.
     * @param params.trackId - Spotify track ID (e.g., "3n3Ppam7vgaVa1iaRUc9Lp").
     * @returns A promise that resolves when the track is liked.
     */
    async run(userId: string, params: { trackId: string }): Promise<void> {
        // Retrieve the user's linked Spotify account
        const spotifyAccount = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Spotify);
        if (!spotifyAccount) {
            this.logger.warn(`User ${userId} does not have a linked Spotify account.`);
            throw new Error('Spotify account not linked');
        }

        // Validate and clean trackId format
        // Remove query parameters and extract just the track ID
        let trackId = params.trackId?.trim();
        if (!trackId) {
            this.logger.warn(`Invalid track ID provided for user ${userId}`);
            throw new Error('Track ID is required');
        }

        // If it's a full Spotify URL, extract the track ID
        if (trackId.includes('spotify.com/track/')) {
            const match = trackId.match(/track\/([a-zA-Z0-9]+)/);
            if (match) {
                trackId = match[1];
            }
        }

        // Remove any query parameters (e.g., ?si=...)
        const queryIndex = trackId.indexOf('?');
        if (queryIndex !== -1) {
            trackId = trackId.substring(0, queryIndex);
        }

        // Validate it's a valid base62 Spotify ID (alphanumeric)
        if (!/^[a-zA-Z0-9]+$/.test(trackId)) {
            this.logger.warn(`Invalid track ID format for user ${userId}: ${trackId}`);
            throw new Error('Invalid track ID format');
        }

        // Get access token using AuthService
        const accessToken = await this.authService.getCurrentAccessToken(ProviderKeyEnum.Spotify, userId);
        if (!accessToken) {
            this.logger.warn(`Failed to obtain access token for user ${userId}.`);
            throw new Error('Failed to obtain access token');
        }

        // Like the track using Spotify API
        // PUT https://api.spotify.com/v1/me/tracks
        const url = 'https://api.spotify.com/v1/me/tracks';
        try {
            await this.authService.oAuth2ApiRequest(ProviderKeyEnum.Spotify, userId, {
                method: 'PUT',
                url,
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                data: {
                    ids: [trackId],
                },
            });
            this.logger.log(`Successfully liked track ${trackId} for user ${userId}.`);
        } catch (err: any) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            this.logger.error(
                `Failed to like track ${trackId} for user ${userId}: status=${status} body=${JSON.stringify(data)}`,
            );
            throw new Error('Failed to like track on Spotify');
        }
    }

    getFields(): Field[] {
        const fields: Field[] = [
            {
                name: 'trackId',
                type: 'string',
                required: true,
            },
        ];
        return fields;
    }
}
