import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IdentityProvider, LinkingProvider, ProviderKey } from './OAuth2Types';
import { TokenCrypto } from './TokenCrypto';
import { TokenStore } from './TokenStore';

export interface PluginDeps {
  config: ConfigService;
  jwt: JwtService;
  crypto: TokenCrypto;
  store: TokenStore;
}

export interface ProviderRegistry {
  getIdentity(provider: ProviderKey): IdentityProvider | undefined;
  getLinking(provider: ProviderKey): LinkingProvider | undefined;
  listProviders(): ProviderKey[];
}

export interface ProviderRegistryBuilder extends ProviderRegistry {
  addIdentity(p: IdentityProvider): void;
  addLinking(p: LinkingProvider): void;
}

@Injectable()
export class ProviderRegistryImpl implements ProviderRegistryBuilder {
  private identities = new Map<ProviderKey, IdentityProvider>();
  private linkings = new Map<ProviderKey, LinkingProvider>();

  addIdentity(p: IdentityProvider): void {
    this.identities.set(p.key, p);
  }

  addLinking(p: LinkingProvider): void {
    this.linkings.set(p.key, p);
  }

  getIdentity(provider: ProviderKey): IdentityProvider | undefined {
    return this.identities.get(provider);
  }

  getLinking(provider: ProviderKey): LinkingProvider | undefined {
    return this.linkings.get(provider);
  }

  listProviders(): ProviderKey[] {
    return [...new Set([...this.identities.keys(), ...this.linkings.keys()])];
  }
}
