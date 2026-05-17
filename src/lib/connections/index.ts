/**
 * connections domain barrel.
 */

export type {
  Connection,
  ConnectionStatus,
  CreateConnectionInput,
  UpdateConnectionInput,
} from "./types";

export {
  getIntegrationMetadata,
  listIntegrationMetadata,
  requiresCredential,
  type IntegrationAuthKind,
  type IntegrationMetadata,
} from "./registry";

export {
  upsertConnection,
  getConnection,
  listConnectionsForUser,
  updateConnection,
} from "./repo";

export {
  connect,
  disconnect,
  markExpired,
  isActive,
  type ConnectInput,
} from "./service";
