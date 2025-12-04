/**
 * Main exports for typescript-agents package
 */

// Types
export * from './types';

// Base agent
export { BaseGrantAgent } from './agents/base-agent';

// Agents
export { IntakeAgent } from './agents/intake-agent';
export type { GrantApplication } from './agents/intake-agent';
export { TechnicalAgent } from './agents/technical-agent';
export { ExampleAgent } from './agents/example-agent';

// Utilities
export { BlockchainConnection, parseEther, formatEther, parseUnits, formatUnits } from './utils/blockchain';
export { ContractManager, ContractABILoader, WalletManager } from './utils/contracts';
export { IPFSClient, fetchGrantWithProposal, fetchGrantsWithProposals } from './utils/ipfs';
export { PythonServiceClient } from './utils/python-client';
