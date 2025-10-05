import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IdentityProvider, LinkingProvider, ProviderKey } from './oauth2.type';
import { TokenCrypto, TokenStore } from './crypto.type';

/**
 * Dependency set available to provider plugins (config, jwt, crypto, token store).
 */
export interface PluginDeps {
  config: ConfigService;
  jwt: JwtService;
  crypto: TokenCrypto;
  store: TokenStore;
}

/**
 * Read-only registry to resolve identity and linking providers by key.
 */
export interface ProviderRegistry {
  getIdentity(provider: ProviderKey): IdentityProvider | undefined;
  getLinking(provider: ProviderKey): LinkingProvider | undefined;
  listProviders(): ProviderKey[];
}

/**
 * Mutable builder for assembling the provider registry.
 */
export interface ProviderRegistryBuilder extends ProviderRegistry {
  addIdentity(p: IdentityProvider): void;
  addLinking(p: LinkingProvider): void;
}
