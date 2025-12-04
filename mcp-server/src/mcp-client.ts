/**
 * MCP Client Utilities
 * Helper functions for agents to interact with the MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { AgentType, MessageType } from './types.js';

// Re-export types for convenience
export { AgentType, MessageType, GrantStatus, Grant, Evaluation, Message } from './types.js';

export interface MCPClientConfig {
  serverCommand: string;
  serverArgs?: string[];
  agentType: AgentType;
  apiKey?: string;
}

export class MCPClient {
  private client: Client;
  private agentType: AgentType;
  private connected: boolean = false;

  constructor(private config: MCPClientConfig) {
    this.agentType = config.agentType;
    this.client = new Client(
      {
        name: `${config.agentType}-client`,
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: this.config.serverCommand,
      args: this.config.serverArgs || [],
    });

    await this.client.connect(transport);
    this.connected = true;
    console.log(`[MCPClient:${this.agentType}] Connected to MCP server`);
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    await this.client.close();
    this.connected = false;
    console.log(`[MCPClient:${this.agentType}] Disconnected from MCP server`);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Notify about a new grant
   */
  async notifyNewGrant(data: {
    grant_id: number;
    ipfs_hash: string;
    applicant: string;
    amount: number;
    project_name: string;
  }): Promise<any> {
    return this.callTool('notify_new_grant', data);
  }

  /**
   * Get evaluation status for a grant
   */
  async getEvaluationStatus(grantId: number): Promise<any> {
    return this.callTool('get_evaluation_status', { grant_id: grantId });
  }

  /**
   * Cast agent vote/evaluation
   */
  async castAgentVote(data: {
    grant_id: number;
    agent_type: AgentType;
    score: number;
    reasoning: string;
    concerns?: string[];
    recommendations?: string[];
    confidence: number;
  }): Promise<any> {
    return this.callTool('cast_agent_vote', data);
  }

  /**
   * Get grant details
   */
  async getGrantDetails(grantId: number): Promise<any> {
    return this.callTool('get_grant_details', { grant_id: grantId });
  }

  /**
   * Broadcast a message to agents
   */
  async broadcastMessage(data: {
    to?: AgentType[];
    message_type: MessageType;
    data: any;
  }): Promise<any> {
    return this.callTool('broadcast_message', {
      from: this.agentType,
      ...data,
    });
  }

  /**
   * Get pending grants
   */
  async getPendingGrants(): Promise<any> {
    return this.readResource('grant://pending');
  }

  /**
   * Get grants under review
   */
  async getUnderReviewGrants(): Promise<any> {
    return this.readResource('grant://under-review');
  }

  /**
   * Get grant by ID
   */
  async getGrant(grantId: number): Promise<any> {
    return this.readResource(`grant://${grantId}`);
  }

  /**
   * Get recent evaluations
   */
  async getRecentEvaluations(): Promise<any> {
    return this.readResource('evaluations://recent');
  }

  /**
   * Get evaluations for a specific grant
   */
  async getGrantEvaluations(grantId: number): Promise<any> {
    return this.readResource(`evaluations://grant/${grantId}`);
  }

  /**
   * Get agent activity
   */
  async getAgentActivity(): Promise<any> {
    return this.readResource('agent://activity');
  }

  /**
   * Call an MCP tool
   */
  private async callTool(name: string, args: any): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const result = await this.client.callTool({ name, arguments: args });
      
      if (result.content && Array.isArray(result.content) && result.content[0] && 'text' in result.content[0]) {
        return JSON.parse(result.content[0].text);
      }
      
      return result;
    } catch (error) {
      console.error(`[MCPClient:${this.agentType}] Tool call failed:`, error);
      throw error;
    }
  }

  /**
   * Read an MCP resource
   */
  private async readResource(uri: string): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    try {
      const result = await this.client.readResource({ uri });
      
      if (result.contents && Array.isArray(result.contents) && result.contents[0]) {
        const content = result.contents[0];
        if ('text' in content && typeof content.text === 'string') {
          return JSON.parse(content.text);
        }
      }
      
      return result;
    } catch (error) {
      console.error(`[MCPClient:${this.agentType}] Resource read failed:`, error);
      throw error;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    return await this.client.listTools();
  }

  /**
   * List available resources
   */
  async listResources(): Promise<any> {
    if (!this.connected) {
      throw new Error('Not connected to MCP server');
    }

    return await this.client.listResources();
  }
}

/**
 * Create an MCP client for an agent
 */
export async function createMCPClient(config: MCPClientConfig): Promise<MCPClient> {
  const client = new MCPClient(config);
  await client.connect();
  return client;
}
