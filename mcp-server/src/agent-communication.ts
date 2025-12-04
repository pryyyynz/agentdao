/**
 * Agent Communication Protocol
 * 
 * Advanced messaging system for agent-to-agent communication with:
 * - Message queuing and prioritization
 * - Retry logic for failed messages
 * - Event subscriptions
 * - Agent discovery
 * - Message persistence (optional)
 */

import { EventEmitter } from 'events';
import { AgentType, Message, MessageType } from './types.js';
import { AgentRegistry } from './agent-registry.js';
import { MessageRouter } from './message-router.js';

export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface QueuedMessage extends Message {
  priority: MessagePriority;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  processingStartedAt?: number;
  deliveredAt?: number;
  error?: string;
}

export interface MessageDeliveryResult {
  success: boolean;
  messageId: string;
  deliveredTo: string[];
  failedTo: string[];
  error?: string;
}

export interface AgentDiscoveryInfo {
  agentId: string;
  type: AgentType;
  status: 'online' | 'offline' | 'busy';
  lastSeen: number;
  capabilities: string[];
  endpoint?: string;
}

export interface CommunicationStats {
  totalMessagesSent: number;
  totalMessagesDelivered: number;
  totalMessagesFailed: number;
  averageDeliveryTime: number;
  queueSize: number;
  processingQueueSize: number;
}

/**
 * Agent Communication Protocol Handler
 */
export class AgentCommunication extends EventEmitter {
  private messageQueue: QueuedMessage[] = [];
  private processingQueue: Map<string, QueuedMessage> = new Map();
  private messageHistory: Map<string, QueuedMessage> = new Map();
  private discoveredAgents: Map<string, AgentDiscoveryInfo> = new Map();
  private eventSubscriptions: Map<string, Set<string>> = new Map(); // eventType -> agentIds
  
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  
  private stats: CommunicationStats = {
    totalMessagesSent: 0,
    totalMessagesDelivered: 0,
    totalMessagesFailed: 0,
    averageDeliveryTime: 0,
    queueSize: 0,
    processingQueueSize: 0,
  };

  private config = {
    maxQueueSize: 10000,
    processingIntervalMs: 100,
    messageTimeoutMs: 30000,
    maxRetries: 3,
    enablePersistence: false,
    discoveryIntervalMs: 5000,
  };

  constructor(
    private agentRegistry: AgentRegistry,
    private messageRouter: MessageRouter,
    config?: Partial<typeof AgentCommunication.prototype.config>
  ) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startProcessing();
    this.startAgentDiscovery();
    console.log('[AgentCommunication] Initialized');
  }

  /**
   * Send a message to specific agent(s)
   */
  async sendMessage(
    from: AgentType,
    to: AgentType | AgentType[],
    messageType: MessageType,
    data: any,
    options: {
      priority?: MessagePriority;
      maxRetries?: number;
      timeout?: number;
    } = {}
  ): Promise<MessageDeliveryResult> {
    const recipients = Array.isArray(to) ? to : [to];
    const priority = options.priority ?? MessagePriority.NORMAL;
    const maxRetries = options.maxRetries ?? this.config.maxRetries;

    // Create message
    const message: Omit<Message, 'id' | 'timestamp'> = {
      from,
      to: recipients,
      message_type: messageType,
      data,
    };

    // Route through message router to get full message with ID
    const routedMessage = this.messageRouter.routeMessage(message);

    // Create queued message
    const queuedMessage: QueuedMessage = {
      ...routedMessage,
      priority,
      retryCount: 0,
      maxRetries,
      createdAt: Date.now(),
    };

    // Add to queue
    this.enqueueMessage(queuedMessage);

    // Update stats
    this.stats.totalMessagesSent++;
    this.stats.queueSize = this.messageQueue.length;

    console.log(
      `[AgentCommunication] Message ${queuedMessage.id} queued (${priority}) from ${from} to ${recipients.join(', ')}`
    );

    // Emit event
    this.emit('message:queued', queuedMessage);

    // Return immediate acknowledgment (actual delivery happens async)
    return {
      success: true,
      messageId: queuedMessage.id,
      deliveredTo: [],
      failedTo: [],
    };
  }

  /**
   * Broadcast message to all active agents
   */
  async broadcastToAll(
    from: AgentType,
    messageType: MessageType,
    data: any,
    options: {
      priority?: MessagePriority;
      excludeAgents?: AgentType[];
    } = {}
  ): Promise<MessageDeliveryResult> {
    const activeAgents = this.agentRegistry.getAgentsByStatus('active');
    const recipients = activeAgents
      .map(agent => agent.type)
      .filter(type => type !== from)
      .filter(type => !options.excludeAgents?.includes(type));

    console.log(`[AgentCommunication] Broadcasting from ${from} to ${recipients.length} agents`);

    return this.sendMessage(from, recipients, messageType, data, {
      priority: options.priority,
    });
  }

  /**
   * Request evaluation from all evaluator agents
   */
  async requestEvaluation(
    from: AgentType,
    grantId: number,
    grantData: any,
    options: {
      priority?: MessagePriority;
    } = {}
  ): Promise<MessageDeliveryResult> {
    const evaluatorAgents = [
      AgentType.TECHNICAL,
      AgentType.IMPACT,
      AgentType.DUE_DILIGENCE,
      AgentType.BUDGET,
      AgentType.COMMUNITY,
    ];

    console.log(`[AgentCommunication] Requesting evaluation for grant ${grantId}`);

    return this.sendMessage(
      from,
      evaluatorAgents,
      MessageType.EVALUATION_REQUEST,
      {
        grant_id: grantId,
        grant_data: grantData,
        requested_at: new Date().toISOString(),
      },
      {
        priority: options.priority ?? MessagePriority.HIGH,
      }
    );
  }

  /**
   * Subscribe agent to specific event types
   */
  subscribeToEvent(agentId: string, eventType: string): void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }
    this.eventSubscriptions.get(eventType)!.add(agentId);
    console.log(`[AgentCommunication] Agent ${agentId} subscribed to ${eventType}`);
  }

  /**
   * Unsubscribe agent from event type
   */
  unsubscribeFromEvent(agentId: string, eventType: string): void {
    const subscribers = this.eventSubscriptions.get(eventType);
    if (subscribers) {
      subscribers.delete(agentId);
    }
  }

  /**
   * Get all subscriptions for an agent
   */
  getAgentSubscriptions(agentId: string): string[] {
    const subscriptions: string[] = [];
    for (const [eventType, subscribers] of this.eventSubscriptions.entries()) {
      if (subscribers.has(agentId)) {
        subscriptions.push(eventType);
      }
    }
    return subscriptions;
  }

  /**
   * Discover available agents
   */
  discoverAgents(): AgentDiscoveryInfo[] {
    const agents = this.agentRegistry.getAllAgents();
    const discovered: AgentDiscoveryInfo[] = [];

    for (const agent of agents) {
      const info: AgentDiscoveryInfo = {
        agentId: agent.id,
        type: agent.type,
        status: agent.status === 'active' ? 'online' : agent.status === 'busy' ? 'busy' : 'offline',
        lastSeen: new Date(agent.last_activity).getTime(),
        capabilities: this.getAgentCapabilities(agent.type),
      };

      discovered.push(info);
      this.discoveredAgents.set(agent.id, info);
    }

    return discovered;
  }

  /**
   * Get agent capabilities based on type
   */
  private getAgentCapabilities(type: AgentType): string[] {
    const capabilities: Record<AgentType, string[]> = {
      [AgentType.INTAKE]: ['grant_submission', 'ipfs_upload', 'blockchain_write'],
      [AgentType.TECHNICAL]: ['technical_analysis', 'code_review', 'architecture_evaluation'],
      [AgentType.IMPACT]: ['impact_assessment', 'ecosystem_analysis', 'alignment_check'],
      [AgentType.DUE_DILIGENCE]: ['team_research', 'github_analysis', 'reputation_check'],
      [AgentType.BUDGET]: ['budget_analysis', 'cost_comparison', 'milestone_generation'],
      [AgentType.COMMUNITY]: ['sentiment_analysis', 'poll_management', 'community_feedback'],
      [AgentType.COORDINATOR]: ['workflow_orchestration', 'decision_making', 'agent_coordination'],
      [AgentType.EXECUTOR]: ['fund_release', 'milestone_tracking', 'blockchain_execution'],
    };
    return capabilities[type] || [];
  }

  /**
   * Get agent by capability
   */
  findAgentsByCapability(capability: string): AgentDiscoveryInfo[] {
    return Array.from(this.discoveredAgents.values()).filter(agent =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Get communication statistics
   */
  getStats(): CommunicationStats {
    return {
      ...this.stats,
      queueSize: this.messageQueue.length,
      processingQueueSize: this.processingQueue.size,
    };
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): QueuedMessage | undefined {
    return this.messageHistory.get(messageId);
  }

  /**
   * Get all messages for a grant
   */
  getMessagesForGrant(grantId: number): QueuedMessage[] {
    return Array.from(this.messageHistory.values()).filter(
      msg => msg.data?.grant_id === grantId
    );
  }

  /**
   * Clear message history (optional cleanup)
   */
  clearHistory(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [id, message] of this.messageHistory.entries()) {
      if (now - message.createdAt > olderThanMs) {
        this.messageHistory.delete(id);
        cleared++;
      }
    }

    console.log(`[AgentCommunication] Cleared ${cleared} old messages`);
    return cleared;
  }

  /**
   * Add message to queue with priority sorting
   */
  private enqueueMessage(message: QueuedMessage): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      console.error('[AgentCommunication] Queue full, dropping message');
      this.emit('message:dropped', message);
      return;
    }

    this.messageQueue.push(message);
    this.messageHistory.set(message.id, message);

    // Sort by priority (higher first) and then by createdAt (older first)
    this.messageQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Start processing message queue
   */
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.config.processingIntervalMs);
  }

  /**
   * Process messages in queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process up to 10 messages per cycle
      const batch = this.messageQueue.splice(0, 10);

      for (const message of batch) {
        await this.processMessage(message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(message: QueuedMessage): Promise<void> {
    message.processingStartedAt = Date.now();
    this.processingQueue.set(message.id, message);

    try {
      // Check if agents are available
      const recipients = Array.isArray(message.to) ? message.to : message.to ? [message.to] : [];
      const availableAgents: string[] = [];
      const unavailableAgents: string[] = [];

      for (const recipientType of recipients) {
        if (!recipientType) continue;
        
        const agents = this.agentRegistry.getAgentsByType(recipientType);
        if (agents.length > 0 && agents.some(a => a.status === 'active')) {
          availableAgents.push(recipientType);
        } else {
          unavailableAgents.push(recipientType);
        }
      }

      if (unavailableAgents.length > 0) {
        // Some agents unavailable, retry if retries available
        if (message.retryCount < message.maxRetries) {
          message.retryCount++;
          this.enqueueMessage(message);
          console.log(
            `[AgentCommunication] Message ${message.id} retry ${message.retryCount}/${message.maxRetries}`
          );
          this.emit('message:retry', message);
        } else {
          // Max retries reached, mark as failed
          message.error = `Failed to deliver to: ${unavailableAgents.join(', ')}`;
          this.stats.totalMessagesFailed++;
          console.error(
            `[AgentCommunication] Message ${message.id} failed after ${message.maxRetries} retries`
          );
          this.emit('message:failed', message);
        }
      } else {
        // All agents available, mark as delivered
        message.deliveredAt = Date.now();
        this.stats.totalMessagesDelivered++;

        // Update average delivery time
        const deliveryTime = message.deliveredAt - message.createdAt;
        this.stats.averageDeliveryTime =
          (this.stats.averageDeliveryTime * (this.stats.totalMessagesDelivered - 1) + deliveryTime) /
          this.stats.totalMessagesDelivered;

        console.log(
          `[AgentCommunication] Message ${message.id} delivered in ${deliveryTime}ms`
        );
        this.emit('message:delivered', message);

        // Notify event subscribers
        this.notifyEventSubscribers(message);
      }
    } catch (error) {
      message.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[AgentCommunication] Error processing message ${message.id}:`, error);
      this.emit('message:error', { message, error });
    } finally {
      this.processingQueue.delete(message.id);
    }
  }

  /**
   * Notify event subscribers
   */
  private notifyEventSubscribers(message: Message): void {
    const eventType = message.message_type;
    const subscribers = this.eventSubscriptions.get(eventType);

    if (subscribers && subscribers.size > 0) {
      console.log(
        `[AgentCommunication] Notifying ${subscribers.size} subscribers of ${eventType}`
      );
      
      for (const agentId of subscribers) {
        const agent = this.agentRegistry.getAgent(agentId);
        if (agent && agent.status === 'active') {
          this.emit(`event:${agentId}:${eventType}`, message);
        }
      }
    }
  }

  /**
   * Start agent discovery
   */
  private startAgentDiscovery(): void {
    setInterval(() => {
      this.discoverAgents();
    }, this.config.discoveryIntervalMs);

    // Initial discovery
    this.discoverAgents();
  }

  /**
   * Stop processing and cleanup
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    console.log('[AgentCommunication] Stopped');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    byPriority: Record<MessagePriority, number>;
  } {
    const byPriority: Record<MessagePriority, number> = {
      [MessagePriority.LOW]: 0,
      [MessagePriority.NORMAL]: 0,
      [MessagePriority.HIGH]: 0,
      [MessagePriority.CRITICAL]: 0,
    };

    for (const message of this.messageQueue) {
      byPriority[message.priority]++;
    }

    return {
      pending: this.messageQueue.length,
      processing: this.processingQueue.size,
      byPriority,
    };
  }
}
