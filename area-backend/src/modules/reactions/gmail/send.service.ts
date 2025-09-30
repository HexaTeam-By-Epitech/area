import { Injectable, Logger } from '@nestjs/common';
import { ProviderKey, UsersService } from '../../users/users.service';
import { AuthService } from '../../auth/auth.service';

/**
 * Gmail reaction that sends an email.
 *
 * This service uses the Gmail API to send an email on behalf of the user.
 */
@Injectable()
export class GmailSendService {
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
    async sendEmail(userId: string, to: string, subject: string, body: string): Promise<void> {
        // Retrieve the user's linked Gmail account
        const gmailAccount = this.usersService.findLinkedAccount(userId, ProviderKey.Google);
        if (!gmailAccount) {
            this.logger.warn(`User ${userId} does not have a linked Gmail account.`);
            throw new Error('Gmail account not linked');
        }

        // Get access token using AuthService's current method
        const accessToken = await this.authService.getCurrentAccessToken(ProviderKey.Google, userId);
        if (!accessToken) {
            this.logger.warn(`Failed to obtain access token for user ${userId}.`);
            throw new Error('Failed to obtain access token');
        }

        // Construct the email in RFC 2822 format
        const emailLines = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'MIME-Version: 1.0',
            '',
            body,
        ];
        const email = emailLines.join('\r\n');
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send email using Gmail API
        const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
        await this.authService.oAuth2ApiRequest(ProviderKey.Google, userId, {
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
        this.logger.log(`Email sent to ${to} for user ${userId}.`);
    }

    getFieldsTemplate(): [string, string, string] {
        return ['to', 'subject', 'body'];
    }
}
