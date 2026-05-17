/**
 * OAuth provider registry.
 *
 * Lazy singleton cache — instantiates on first request. Adding a
 * provider:
 *   1. Implement subclass of AbstractOAuth2Provider in this directory.
 *   2. Register an entry in `INSTANTIATE` below.
 *   3. Add env vars to `env.oauth.<name>`.
 */

import type { OAuthProvider } from "../types";
import { GoogleOAuthProvider } from "./google";
import { SlackOAuthProvider } from "./slack";
import { HubspotOAuthProvider } from "./hubspot";
import { DiscordOAuthProvider } from "./discord";
import { NotionOAuthProvider } from "./notion";
import { StripeOAuthProvider } from "./stripe";
import { AirtableOAuthProvider } from "./airtable";
import { SalesforceOAuthProvider } from "./salesforce";
import { WhatsAppProvider } from "./whatsapp";
import { OAuthUnsupportedProviderError } from "../errors";

export type ProviderSlug =
  | "google"
  | "slack"
  | "hubspot"
  | "discord"
  | "notion"
  | "stripe"
  | "airtable"
  | "salesforce"
  | "whatsapp";

const INSTANTIATE: Record<ProviderSlug, () => OAuthProvider> = {
  google: () => new GoogleOAuthProvider(),
  slack: () => new SlackOAuthProvider(),
  hubspot: () => new HubspotOAuthProvider(),
  discord: () => new DiscordOAuthProvider(),
  notion: () => new NotionOAuthProvider(),
  stripe: () => new StripeOAuthProvider(),
  airtable: () => new AirtableOAuthProvider(),
  salesforce: () => new SalesforceOAuthProvider(),
  whatsapp: () => new WhatsAppProvider(),
};

const cache = new Map<ProviderSlug, OAuthProvider>();

export function getOAuthProvider(slug: string): OAuthProvider {
  if (!(slug in INSTANTIATE)) {
    throw new OAuthUnsupportedProviderError(
      `No OAuth provider registered for "${slug}".`,
      { slug },
    );
  }
  const typed = slug as ProviderSlug;
  let provider = cache.get(typed);
  if (!provider) {
    provider = INSTANTIATE[typed]();
    cache.set(typed, provider);
  }
  return provider;
}
