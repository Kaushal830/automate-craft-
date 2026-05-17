/**
 * oauth domain barrel.
 */

export type {
  OAuthProvider,
  ProviderCapabilities,
  TokenSet,
  BeginOAuthInput,
  BeginOAuthOutput,
  CompleteOAuthInput,
  CompleteOAuthOutput,
  OAuthGrantType,
} from "./types";

export * from "./errors";

export {
  beginConnection,
  completeConnection,
  refreshConnection,
  revokeConnection,
  validateConnection,
  type BeginConnectionInput,
  type CompleteConnectionInput,
  type CompleteConnectionOutcome,
} from "./service";

export {
  getOAuthProvider,
  type ProviderSlug,
} from "./providers";

export { AbstractOAuth2Provider } from "./base-provider";
