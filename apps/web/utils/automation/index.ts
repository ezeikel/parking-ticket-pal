/**
 * Automation Module
 *
 * All browser automation runs on the worker service (Hetzner).
 * This module exports the worker client functions for making requests.
 */
export {
  getIssuers,
  isIssuerSupported,
  runChallenge,
  runVerify,
  runHealthCheck,
  requestIssuerGeneration,
  type IssuerMetadata,
  type ChallengeParams,
  type ChallengeResult,
  type VerifyParams,
  type VerifyResult,
  type Address,
  type UserInfo,
} from './workerClient';
