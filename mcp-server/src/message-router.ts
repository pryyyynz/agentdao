/**
 * Message Router - Handles message routing between agents
 */

import { AgentType, Message, MessageType } from './types.js';
import { AgentRegistry } from './agent-registry.js';
import { EventEmitter } from 'events';

export class MessageRouter extends EventEmitter {
  private messageHistory: Message[] = [];
  private maxHistorySize: number = 1000;

  constructor(private agentRegistry: AgentRegistry) {
    super();
  }

  /**
   * Route a message to specific agent(s) or broadcast to all
   */
  routeMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date().toISOString(),
    };

    // Store in history
    this.addToHistory(fullMessage);

    // Update sender activity
    const senderAgents = this.agentRegistry.getAgentsByType(message.from);
    senderAgents.forEach(agent => {
      this.agentRegistry.updateActivity(agent.id);
    });

    // Route the message
    if (message.to) {
      // Direct message to specific agent(s)
      const recipients = Array.isArray(message.to) ? message.to : [message.to];
      this.sendToAgents(fullMessage, recipients);
    } else {
      // Broadcast to all agents
      this.broadcast(fullMessage);
    }

    // Emit event for subscribers
    this.emit('message', fullMessage);

    return fullMessage;
  }

  /**
   * Send message to specific agent types
   */
  private sendToAgents(message: Message, agentTypes: AgentType[]): void {
    agentTypes.forEach(type => {
      const agents = this.agentRegistry.getAgentsByType(type);
      agents.forEach(agent => {
        this.emit(`message:${agent.id}`, message);
        console.log(`[MessageRouter] Sent message ${message.id} to ${agent.id} (${type})`);
      });
    });
  }

  /**
   * Broadcast message to all active agents
   */
  private broadcast(message: Message): void {
    const allAgents = this.agentRegistry.getAgentsByStatus('active');
    allAgents.forEach(agent => {
      this.emit(`message:${agent.id}`, message);
    });
    console.log(`[MessageRouter] Broadcast message ${message.id} to ${allAgents.length} agents`);
  }

  /**
   * Subscribe an agent to messages
   */
  subscribeAgent(agentId: string, callback: (message: Message) => void): void {
    this.on(`message:${agentId}`, callback);
    console.log(`[MessageRouter] Agent ${agentId} subscribed to messages`);
  }

  /**
   * Unsubscribe an agent from messages
   */
  unsubscribeAgent(agentId: string): void {
    this.removeAllListeners(`message:${agentId}`);
    console.log(`[MessageRouter] Agent ${agentId} unsubscribed from messages`);
  }

  /**
   * Get message history
   */
  getMessageHistory(filter?: {
    from?: AgentType;
    to?: AgentType;
    messageType?: MessageType;
    limit?: number;
  }): Message[] {
    let messages = [...this.messageHistory];

    if (filter) {
      if (filter.from) {
        messages = messages.filter(m => m.from === filter.from);
      }
      if (filter.to) {
        messages = messages.filter(m => 
          m.to === filter.to || 
          (Array.isArray(m.to) && filter.to && m.to.includes(filter.to))
        );
      }
      if (filter.messageType) {
        messages = messages.filter(m => m.message_type === filter.messageType);
      }
      if (filter.limit) {
        messages = messages.slice(-filter.limit);
      }
    }

    return messages;
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 50): Message[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
    console.log('[MessageRouter] Message history cleared');
  }

  /**
   * Add message to history
   */
  private addToHistory(message: Message): void {
    this.messageHistory.push(message);
    
    // Trim history if exceeds max size
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
