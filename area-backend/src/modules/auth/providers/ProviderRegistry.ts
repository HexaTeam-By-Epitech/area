import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { TokenCryptoUtil } from './TokenCryptoUtil';
import { GoogleIdentityProvider } from './identity/GoogleIdentityProvider';
import { GoogleOAuthLinkProvider } from './oauth2/GoogleOAuthLinkProvider';
import { SpotifyOAuthLinkProvider } from './oauth2/SpotifyOAuthLinkProvider';

export class ProviderRegistry {
  readonly crypto: TokenCryptoUtil;
  readonly googleIdentity: GoogleIdentityProvider;
  readonly googleLink: GoogleOAuthLinkProvider;
  readonly spotifyLink: SpotifyOAuthLinkProvider;

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.crypto = new TokenCryptoUtil(this.config.get<string>('TOKENS_ENC_KEY') || '');
    this.googleIdentity = new GoogleIdentityProvider(this.users, this.config, this.jwt);
    this.googleLink = new GoogleOAuthLinkProvider(this.users, this.config, this.jwt, this.crypto);
    this.spotifyLink = new SpotifyOAuthLinkProvider(this.users, this.config, this.jwt, this.crypto);
  }
}
