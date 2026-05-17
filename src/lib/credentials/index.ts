/**
 * credentials domain barrel.
 */

export type {
  CredentialDescriptor,
  CredentialLookup,
  CredentialPutInput,
  DecryptedCredential,
} from "./types";

export {
  encryptCredential,
  decryptCredential,
} from "./crypto";

export {
  putCredential,
  getCredential,
  listCredentialsForUser,
  deleteCredential,
} from "./vault";

export {
  resolveCredentialsForWorkflow,
  type ResolveCredentialsInput,
} from "./resolver";
