import { Injectable } from '@nestjs/common';
import { IdentityProvider, LinkingProvider, ProviderKey } from '../../../common/interfaces/oauth2.type';
import type { ProviderRegistry, ProviderRegistryBuilder } from '../../../common/interfaces/provider-registry.type';

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
