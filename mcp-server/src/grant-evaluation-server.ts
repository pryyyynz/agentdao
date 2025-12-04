/**
 * AgentDAO Grant Evaluation MCP Server
 * 
 * Provides MCP tools and resources for agent coordination in grant evaluation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { AgentRegistry } from './agent-registry.js';
import { MessageRouter } from './message-router.js';
import { DataStore } from './data-store.js';
import { AgentType, GrantStatus, MessageType } from './types.js';

/**
 * Main MCP Server class
 */
class GrantEvaluationServer {
  private server: Server;
  private agentRegistry: AgentRegistry;
  private messageRouter: MessageRouter;
  private dataStore: DataStore;

  constructor() {
    this.server = new Server(
      {
        name: 'grant-evaluation-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Initialize components
    this.agentRegistry = new AgentRegistry();
    this.messageRouter = new MessageRouter(this.agentRegistry);
    this.dataStore = new DataStore();

    // Setup handlers
    this.setupToolHandlers();
    this.setupResourceHandlers();

    // Setup cleanup interval
    setInterval(() => {
      this.agentRegistry.cleanupInactiveAgents(30);
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('[GrantEvaluationServer] Initialized');
  }

  /**
   * Setup MCP tool handlers
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'notify_new_grant',
          description: 'Notifies all evaluator agents of a new grant submission',
          inputSchema: {
            type: 'object',
            properties: {
              grant_id: { type: 'number', description: 'Grant ID' },
              ipfs_hash: { type: 'string', description: 'IPFS hash of grant details' },
              applicant: { type: 'string', description: 'Applicant wallet address' },
              amount: { type: 'number', description: 'Requested amount' },
              project_name: { type: 'string', description: 'Project name' },
            },
            required: ['grant_id', 'ipfs_hash', 'applicant', 'amount', 'project_name'],
          },
        },
        {
          name: 'get_evaluation_status',
          description: 'Gets current evaluation status for a grant',
          inputSchema: {
            type: 'object',
            properties: {
              grant_id: { type: 'number', description: 'Grant ID' },
            },
            required: ['grant_id'],
          },
        },
        {
          name: 'cast_agent_vote',
          description: 'Records an agent\'s vote/evaluation for a grant',
          inputSchema: {
            type: 'object',
            properties: {
              grant_id: { type: 'number', description: 'Grant ID' },
              agent_type: { 
                type: 'string', 
                enum: Object.values(AgentType),
                description: 'Type of agent casting vote' 
              },
              score: { type: 'number', description: 'Score from -2 to +2' },
              reasoning: { type: 'string', description: 'Reasoning for the score' },
              concerns: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of concerns (optional)' 
              },
              recommendations: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'List of recommendations (optional)' 
              },
              confidence: { type: 'number', description: 'Confidence level 0-1' },
            },
            required: ['grant_id', 'agent_type', 'score', 'reasoning', 'confidence'],
          },
        },
        {
          name: 'get_grant_details',
          description: 'Gets detailed information about a grant',
          inputSchema: {
            type: 'object',
            properties: {
              grant_id: { type: 'number', description: 'Grant ID' },
            },
            required: ['grant_id'],
          },
        },
        {
          name: 'broadcast_message',
          description: 'Sends a message to all agents or specific agent types',
          inputSchema: {
            type: 'object',
            properties: {
              from: { 
                type: 'string',
                enum: Object.values(AgentType),
                description: 'Sender agent type' 
              },
              to: { 
                type: 'array',
                items: { 
                  type: 'string',
                  enum: Object.values(AgentType),
                },
                description: 'Recipient agent types (empty = broadcast to all)' 
              },
              message_type: { 
                type: 'string',
                enum: Object.values(MessageType),
                description: 'Type of message' 
              },
              data: { 
                type: 'object',
                description: 'Message payload' 
              },
            },
            required: ['from', 'message_type', 'data'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'notify_new_grant':
            return await this.handleNotifyNewGrant(args);
          
          case 'get_evaluation_status':
            return await this.handleGetEvaluationStatus(args);
          
          case 'cast_agent_vote':
            return await this.handleCastAgentVote(args);
          
          case 'get_grant_details':
            return await this.handleGetGrantDetails(args);
          
          case 'broadcast_message':
            return await this.handleBroadcastMessage(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }),
            },
          ],
        };
      }
    });
  }

  /**
   * Setup MCP resource handlers
   */
  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'grant://pending',
          name: 'Pending Grants',
          description: 'List of all pending grants awaiting evaluation',
          mimeType: 'application/json',
        },
        {
          uri: 'grant://under-review',
          name: 'Grants Under Review',
          description: 'List of grants currently being evaluated',
          mimeType: 'application/json',
        },
        {
          uri: 'evaluations://recent',
          name: 'Recent Evaluations',
          description: 'List of recent evaluations across all grants',
          mimeType: 'application/json',
        },
        {
          uri: 'agent://activity',
          name: 'Agent Activity',
          description: 'Current activity status of all registered agents',
          mimeType: 'application/json',
        },
      ],
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        // Handle grant://[id] pattern
        if (uri.startsWith('grant://')) {
          const path = uri.substring(8); // Remove 'grant://'
          
          if (path === 'pending') {
            return this.handleGetPendingGrants();
          } else if (path === 'under-review') {
            return this.handleGetUnderReviewGrants();
          } else if (!isNaN(Number(path))) {
            return this.handleGetGrantResource(Number(path));
          }
        }

        // Handle evaluations://grant/[id] pattern
        if (uri.startsWith('evaluations://')) {
          const path = uri.substring(14); // Remove 'evaluations://'
          
          if (path === 'recent') {
            return this.handleGetRecentEvaluations();
          } else if (path.startsWith('grant/')) {
            const grantId = Number(path.substring(6));
            return this.handleGetGrantEvaluations(grantId);
          }
        }

        // Handle agent://activity
        if (uri === 'agent://activity') {
          return this.handleGetAgentActivity();
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({ error: errorMessage }),
            },
          ],
        };
      }
    });
  }

  // ==================== TOOL HANDLERS ====================

  private async handleNotifyNewGrant(args: any) {
    const { grant_id, ipfs_hash, applicant, amount, project_name } = args;

    // Create grant in data store
    const grant = this.dataStore.createGrant({
      applicant,
      ipfs_hash,
      project_name,
      description: '',
      amount,
    });

    // Broadcast message to evaluator agents
    const evaluatorAgents = [
      AgentType.TECHNICAL,
      AgentType.IMPACT,
      AgentType.DUE_DILIGENCE,
      AgentType.BUDGET,
      AgentType.COMMUNITY,
    ];

    const message = this.messageRouter.routeMessage({
      from: AgentType.INTAKE,
      to: evaluatorAgents,
      message_type: MessageType.NEW_GRANT,
      data: {
        grant_id: grant.id,
        ipfs_hash,
        applicant,
        amount,
        project_name,
      },
    });

    console.log(`[Tool:notify_new_grant] Notified agents of grant ${grant_id}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            grant_id: grant.id,
            notified_agents: evaluatorAgents,
            message_id: message.id,
            timestamp: message.timestamp,
          }),
        },
      ],
    };
  }

  private async handleGetEvaluationStatus(args: any) {
    const { grant_id } = args;

    const grant = this.dataStore.getGrant(grant_id);
    if (!grant) {
      throw new Error(`Grant ${grant_id} not found`);
    }

    const evaluations = this.dataStore.getEvaluations(grant_id);
    const evaluatorTypes = [
      AgentType.TECHNICAL,
      AgentType.IMPACT,
      AgentType.DUE_DILIGENCE,
      AgentType.BUDGET,
      AgentType.COMMUNITY,
    ];

    const evaluationsComplete = evaluations.map(e => e.agent_type);
    const evaluationsPending = evaluatorTypes.filter(
      type => !evaluationsComplete.includes(type)
    );

    const scores: Record<string, number> = {};
    evaluations.forEach(e => {
      scores[e.agent_type] = e.score;
    });

    const votingResult = this.dataStore.getVotingResult(grant_id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            grant_id,
            status: grant.status,
            evaluations_complete: evaluationsComplete,
            evaluations_pending: evaluationsPending,
            scores,
            voting_result: votingResult,
          }),
        },
      ],
    };
  }

  private async handleCastAgentVote(args: any) {
    const { grant_id, agent_type, score, reasoning, concerns, recommendations, confidence } = args;

    // Validate grant exists
    const grant = this.dataStore.getGrant(grant_id);
    if (!grant) {
      throw new Error(`Grant ${grant_id} not found`);
    }

    // Add evaluation
    const evaluation = this.dataStore.addEvaluation({
      grant_id,
      agent_type,
      score,
      reasoning,
      concerns,
      recommendations,
      confidence,
    });

    // Broadcast vote cast message
    this.messageRouter.routeMessage({
      from: agent_type,
      message_type: MessageType.VOTE_CAST,
      data: {
        grant_id,
        score,
        evaluation_id: evaluation.id,
      },
    });

    // Update grant status to under review if it was pending
    if (grant.status === GrantStatus.PENDING) {
      this.dataStore.updateGrantStatus(grant_id, GrantStatus.UNDER_REVIEW);
    }

    // Check if all evaluations are complete
    const evaluations = this.dataStore.getEvaluations(grant_id);
    const requiredEvaluators = 5; // technical, impact, dd, budget, community
    
    if (evaluations.length >= requiredEvaluators) {
      // Calculate final voting result
      const votingResult = this.dataStore.calculateVotingResult(grant_id);
      
      // Notify coordinator
      this.messageRouter.routeMessage({
        from: agent_type,
        to: [AgentType.COORDINATOR],
        message_type: MessageType.EVALUATION_COMPLETE,
        data: {
          grant_id,
          voting_result: votingResult,
        },
      });
    }

    console.log(`[Tool:cast_agent_vote] ${agent_type} voted ${score} on grant ${grant_id}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            evaluation_id: evaluation.id,
            grant_id,
            timestamp: evaluation.created_at,
          }),
        },
      ],
    };
  }

  private async handleGetGrantDetails(args: any) {
    const { grant_id } = args;

    const grant = this.dataStore.getGrant(grant_id);
    if (!grant) {
      throw new Error(`Grant ${grant_id} not found`);
    }

    const evaluations = this.dataStore.getEvaluations(grant_id);
    const votingResult = this.dataStore.getVotingResult(grant_id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            grant,
            evaluations,
            voting_result: votingResult,
          }),
        },
      ],
    };
  }

  private async handleBroadcastMessage(args: any) {
    const { from, to, message_type, data } = args;

    const message = this.messageRouter.routeMessage({
      from,
      to,
      message_type,
      data,
    });

    console.log(`[Tool:broadcast_message] ${from} sent ${message_type} message`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message_id: message.id,
            timestamp: message.timestamp,
            recipients: to || 'all',
          }),
        },
      ],
    };
  }

  // ==================== RESOURCE HANDLERS ====================

  private async handleGetPendingGrants() {
    const grants = this.dataStore.getGrantsByStatus(GrantStatus.PENDING);

    return {
      contents: [
        {
          uri: 'grant://pending',
          mimeType: 'application/json',
          text: JSON.stringify({
            grants,
            total: grants.length,
          }),
        },
      ],
    };
  }

  private async handleGetUnderReviewGrants() {
    const grants = this.dataStore.getGrantsByStatus(GrantStatus.UNDER_REVIEW);

    return {
      contents: [
        {
          uri: 'grant://under-review',
          mimeType: 'application/json',
          text: JSON.stringify({
            grants,
            total: grants.length,
          }),
        },
      ],
    };
  }

  private async handleGetGrantResource(grantId: number) {
    const grant = this.dataStore.getGrant(grantId);
    if (!grant) {
      throw new Error(`Grant ${grantId} not found`);
    }

    return {
      contents: [
        {
          uri: `grant://${grantId}`,
          mimeType: 'application/json',
          text: JSON.stringify(grant),
        },
      ],
    };
  }

  private async handleGetRecentEvaluations() {
    const evaluations = this.dataStore.getRecentEvaluations(20);

    return {
      contents: [
        {
          uri: 'evaluations://recent',
          mimeType: 'application/json',
          text: JSON.stringify({
            evaluations,
            total: evaluations.length,
          }),
        },
      ],
    };
  }

  private async handleGetGrantEvaluations(grantId: number) {
    const grant = this.dataStore.getGrant(grantId);
    if (!grant) {
      throw new Error(`Grant ${grantId} not found`);
    }

    const evaluations = this.dataStore.getEvaluations(grantId);

    return {
      contents: [
        {
          uri: `evaluations://grant/${grantId}`,
          mimeType: 'application/json',
          text: JSON.stringify({
            grant_id: grantId,
            evaluations,
          }),
        },
      ],
    };
  }

  private async handleGetAgentActivity() {
    const agents = this.agentRegistry.getAllAgents();
    const messageHistory = this.messageRouter.getRecentMessages(50);

    return {
      contents: [
        {
          uri: 'agent://activity',
          mimeType: 'application/json',
          text: JSON.stringify({
            agents,
            recent_messages: messageHistory,
            total_agents: agents.length,
            active_agents: agents.filter(a => a.status === 'active').length,
          }),
        },
      ],
    };
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[GrantEvaluationServer] MCP Server started on stdio');
  }
}

// ==================== MAIN ====================

async function main() {
  const server = new GrantEvaluationServer();
  await server.start();
}

main().catch((error) => {
  console.error('[GrantEvaluationServer] Fatal error:', error);
  process.exit(1);
});
