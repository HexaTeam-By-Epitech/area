import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IdentityProvider, LinkingProvider, ProviderKey } from './OAuth2Types';
import { TokenCrypto } from './TokenCrypto';
import { TokenStore } from './TokenStore';

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

@Injectable()
export class ProviderRegistryImpl implements ProviderRegistryBuilder {
  private identities = new Map<ProviderKey, IdentityProvider>();
  private linkings = new Map<ProviderKey, LinkingProvider>();

  /** Register an identity provider implementation. */
  addIdentity(p: IdentityProvider): void {
    this.identities.set(p.key, p);
  }

  /** Register a linking provider implementation. */
  addLinking(p: LinkingProvider): void {
    this.linkings.set(p.key, p);
  }

  /** Resolve an identity provider by key. */
  getIdentity(provider: ProviderKey): IdentityProvider | undefined {
    return this.identities.get(provider);
  }

  /** Resolve a linking provider by key. */
  getLinking(provider: ProviderKey): LinkingProvider | undefined {
    return this.linkings.get(provider);
  }

  /** List all known provider keys (union of identity + linking providers). */
  listProviders(): ProviderKey[] {
    return [...new Set([...this.identities.keys(), ...this.linkings.keys()])];
  }
}
