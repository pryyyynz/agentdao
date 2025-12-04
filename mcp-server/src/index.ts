/**
 * AgentDAO MCP Server - Main Entry Point
 * 
 * Export all public APIs for external use
 */

// Types
export * from './types.js';

// MCP Client
export { MCPClient, createMCPClient } from './mcp-client.js';
export type { MCPClientConfig } from './mcp-client.js';

// Communication Protocol
export { AgentCommunication, MessagePriority } from './agent-communication.js';
export type {
  QueuedMessage,
  MessageDeliveryResult,
  AgentDiscoveryInfo,
  CommunicationStats,
} from './agent-communication.js';

// Orchestrator
export { Orchestrator } from './orchestrator.js';
export type {
  OrchestratorConfig,
  AgentHealth,
  WorkflowStatus,
  OrchestratorStats,
} from './orchestrator.js';

// Components (for advanced usage)
export { AgentRegistry } from './agent-registry.js';
export { MessageRouter } from './message-router.js';
export { DataStore } from './data-store.js';
export { AuthManager } from './auth.js';
export type { AuthConfig } from './auth.js';
