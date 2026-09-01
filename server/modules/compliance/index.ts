/**
 * Compliance Module — Public Boundary
 * Cross-module callers should import only from here.
 */

export { complianceRouter } from "./compliance.router";
export { logPii, logPiiBulk } from "./services/piiAccessLog.service";
export { buildBundle as buildDsarBundle } from "./services/dsar.service";
export {
  submit as submitErasure,
  cancel as cancelErasure,
  executeErasure,
  processDueErasures,
} from "./services/erasure.service";
export { processRetention } from "./services/retention.service";
export type {
  DsarBundle,
  PiiAccessLogEntry,
  PiiSubjectType,
  PiiAction,
  ErasureStatus,
  LegalBasis,
} from "./types";
