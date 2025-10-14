import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { ProviderKeyEnum } from '../../../common/interfaces/oauth2.type';
import { AuthService } from '../../auth/auth.service';
import type { Reactions, Field } from '../../../common/interfaces/area.type';

/**
 * Gmail reaction that sends an email.
 *
 * This service uses the Gmail API to send an email on behalf of the user.
 */
@Injectable()
export class GmailSendService implements Reactions {
    /** Logger instance scoped to this service. */
    private readonly logger = new Logger(GmailSendService.name);

    constructor(
        /** Users domain service used to resolve linked provider accounts. */
        private readonly usersService: UsersService,
        /** Auth service used to perform OAuth2-authenticated requests to Gmail. */
        private readonly authService: AuthService,
    ) {}

    /**
     * Sends an email using the Gmail API.
     *
     * @param userId - The user identifier.
     * @param to - Recipient email address.
     * @param subject - Subject of the email.
     * @param body - Body content of the email.
     * @returns A promise that resolves when the email is sent.
     */
    async run(userId: string, params: { to: string; subject: string; body: string }): Promise<void> {
        // Retrieve the user's linked Gmail account
        const gmailAccount = await this.usersService.findLinkedAccount(userId, ProviderKeyEnum.Google);
        if (!gmailAccount) {
            this.logger.warn(`User ${userId} does not have a linked Gmail account.`);
            throw new Error('Gmail account not linked');
        }

        // Get access token using AuthService's current method
        const accessToken = await this.authService.getCurrentAccessToken(ProviderKeyEnum.Google, userId);
        if (!accessToken) {
            this.logger.warn(`Failed to obtain access token for user ${userId}.`);
            throw new Error('Failed to obtain access token');
        }

        // Verify that the linked Google account is a consumer @gmail.com address.
        try {
            const { data: userinfo } = await this.authService.oAuth2ApiRequest<{ email?: string }>(
                ProviderKeyEnum.Google,
                userId,
                {
                    method: 'GET',
                    url: 'https://openidconnect.googleapis.com/v1/userinfo',
                },
            );
            const email = userinfo?.email;
            if (!email) {
                this.logger.warn(`Missing email in Google userinfo for user ${userId}`);
                throw new Error('Failed to verify Gmail account');
            }
            if (!email.endsWith('@gmail.com')) {
                this.logger.warn(`Blocked send: user ${userId} email ${email} is not @gmail.com`);
                throw new Error('Sending emails is only supported for Gmail accounts');
            }
        } catch (err: any) {
            if (err instanceof Error && err.message === 'Sending emails is only supported for Gmail accounts') {
                throw err;
            }
            const status = err?.response?.status;
            const data = err?.response?.data;
            this.logger.error(
                `Failed to verify Google userinfo for user ${userId}: status=${status} body=${JSON.stringify(data)}`,
            );
            throw new Error('Failed to verify Gmail account');
        }

        // Encode subject in RFC 2047 format for non-ASCII characters
        const encodedSubject = this.encodeRfc2047(params.subject);

        // Construct the email in RFC 2822 format
        const emailLines = [
            `To: ${params.to}`,
            `Subject: ${encodedSubject}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: base64',
            'MIME-Version: 1.0',
            '',
            // Encode body in base64 as well since we declared Content-Transfer-Encoding: base64
            Buffer.from(params.body, 'utf-8').toString('base64'),
        ];
        const email = emailLines.join('\r\n');
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send email using Gmail API
        const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
        await this.authService.oAuth2ApiRequest(ProviderKeyEnum.Google, userId, {
            method: 'POST',
            url,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            data: {
                raw: encodedEmail,
            },
        });
        this.logger.log(`Email sent to ${params.to} for user ${userId}.`);
    }

    getFields(): Field[] {
        const fields: Field[] = [
            { name: 'to', type: 'string', required: true },
            { name: 'subject', type: 'string', required: true },
            { name: 'body', type: 'string', required: true },
        ];
        return fields;
    }

    /**
     * Encode a string in RFC 2047 format for email headers (like Subject)
     * This is needed for non-ASCII characters (accents, emojis, etc.)
     */
    private encodeRfc2047(text: string): string {
        // Check if the text contains non-ASCII characters
        if (!/[^\x00-\x7F]/.test(text)) {
            // Pure ASCII, no encoding needed
            return text;
        }
        // Encode as base64 with RFC 2047 format: =?UTF-8?B?base64?=
        const encoded = Buffer.from(text, 'utf-8').toString('base64');
        return `=?UTF-8?B?${encoded}?=`;
    }
}
