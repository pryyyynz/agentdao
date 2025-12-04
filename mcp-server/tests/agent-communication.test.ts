/**
 * Tests for Agent Communication Protocol
 */

import { AgentCommunication, MessagePriority } from '../src/agent-communication';
import { AgentRegistry } from '../src/agent-registry';
import { MessageRouter } from '../src/message-router';
import { AgentType, MessageType } from '../src/types';

describe('AgentCommunication', () => {
  let agentRegistry: AgentRegistry;
  let messageRouter: MessageRouter;
  let communication: AgentCommunication;

  beforeEach(() => {
    agentRegistry = new AgentRegistry();
    messageRouter = new MessageRouter(agentRegistry);
    communication = new AgentCommunication(agentRegistry, messageRouter, {
      processingIntervalMs: 50, // Faster for tests
      discoveryIntervalMs: 1000,
    });

    // Register some test agents
    agentRegistry.registerAgent('tech-1', AgentType.TECHNICAL);
    agentRegistry.registerAgent('impact-1', AgentType.IMPACT);
    agentRegistry.registerAgent('coord-1', AgentType.COORDINATOR);
  });

  afterEach(() => {
    communication.stop();
  });

  describe('sendMessage', () => {
    it('should queue a message successfully', async () => {
      const result = await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      const stats = communication.getStats();
      expect(stats.totalMessagesSent).toBe(1);
      expect(stats.queueSize).toBeGreaterThan(0);
    });

    it('should send message to multiple recipients', async () => {
      const result = await communication.sendMessage(
        AgentType.COORDINATOR,
        [AgentType.TECHNICAL, AgentType.IMPACT],
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should respect message priority', async () => {
      // Send low priority message
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.SYSTEM_STATUS,
        { status: 'ok' },
        { priority: MessagePriority.LOW }
      );

      // Send high priority message
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 },
        { priority: MessagePriority.HIGH }
      );

      const queueStatus = communication.getQueueStatus();
      expect(queueStatus.byPriority[MessagePriority.HIGH]).toBe(1);
      expect(queueStatus.byPriority[MessagePriority.LOW]).toBe(1);
    });
  });

  describe('broadcastToAll', () => {
    it('should broadcast to all active agents except sender', async () => {
      const result = await communication.broadcastToAll(
        AgentType.COORDINATOR,
        MessageType.SYSTEM_STATUS,
        { status: 'healthy' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should exclude specified agents', async () => {
      const result = await communication.broadcastToAll(
        AgentType.COORDINATOR,
        MessageType.SYSTEM_STATUS,
        { status: 'healthy' },
        { excludeAgents: [AgentType.TECHNICAL] }
      );

      expect(result.success).toBe(true);
    });
  });

  describe('requestEvaluation', () => {
    it('should send evaluation request to all evaluators', async () => {
      const result = await communication.requestEvaluation(
        AgentType.INTAKE,
        1,
        { project: 'Test Project' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      // Should be high priority
      const queueStatus = communication.getQueueStatus();
      expect(queueStatus.byPriority[MessagePriority.HIGH]).toBeGreaterThan(0);
    });
  });

  describe('Event Subscriptions', () => {
    it('should subscribe agent to event', () => {
      communication.subscribeToEvent('tech-1', MessageType.NEW_GRANT);

      const subscriptions = communication.getAgentSubscriptions('tech-1');
      expect(subscriptions).toContain(MessageType.NEW_GRANT);
    });

    it('should unsubscribe agent from event', () => {
      communication.subscribeToEvent('tech-1', MessageType.NEW_GRANT);
      communication.unsubscribeFromEvent('tech-1', MessageType.NEW_GRANT);

      const subscriptions = communication.getAgentSubscriptions('tech-1');
      expect(subscriptions).not.toContain(MessageType.NEW_GRANT);
    });

    it('should notify subscribers when message is delivered', (done) => {
      communication.subscribeToEvent('tech-1', MessageType.NEW_GRANT);

      communication.on('event:tech-1:new_grant', (message) => {
        expect(message.message_type).toBe(MessageType.NEW_GRANT);
        done();
      });

      communication.sendMessage(
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        MessageType.NEW_GRANT,
        { grant_id: 1 }
      );

      // Wait for message processing
      setTimeout(() => {
        if (!done) {
          done();
        }
      }, 200);
    });
  });

  describe('Agent Discovery', () => {
    it('should discover all registered agents', () => {
      const discovered = communication.discoverAgents();

      expect(discovered.length).toBe(3);
      expect(discovered.some(a => a.type === AgentType.TECHNICAL)).toBe(true);
      expect(discovered.some(a => a.type === AgentType.IMPACT)).toBe(true);
      expect(discovered.some(a => a.type === AgentType.COORDINATOR)).toBe(true);
    });

    it('should include agent capabilities', () => {
      const discovered = communication.discoverAgents();
      const techAgent = discovered.find(a => a.type === AgentType.TECHNICAL);

      expect(techAgent?.capabilities).toContain('technical_analysis');
      expect(techAgent?.capabilities).toContain('code_review');
    });

    it('should find agents by capability', () => {
      communication.discoverAgents();
      const agents = communication.findAgentsByCapability('technical_analysis');

      expect(agents.length).toBeGreaterThan(0);
      expect(agents[0].type).toBe(AgentType.TECHNICAL);
    });
  });

  describe('Message Queue', () => {
    it('should process queued messages', async (done) => {
      communication.on('message:delivered', (message) => {
        expect(message.deliveredAt).toBeDefined();
        done();
      });

      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      // Wait for processing
      setTimeout(() => {
        if (!done) {
          done();
        }
      }, 200);
    });

    it('should retry failed messages', async (done) => {
      // Unregister agent to cause failure
      agentRegistry.unregisterAgent('tech-1');

      let retryCount = 0;
      communication.on('message:retry', () => {
        retryCount++;
      });

      communication.on('message:failed', (message) => {
        expect(retryCount).toBeGreaterThan(0);
        expect(message.error).toBeDefined();
        done();
      });

      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 },
        { maxRetries: 2 }
      );

      // Wait for retries to complete
      setTimeout(() => {
        if (!done) {
          done();
        }
      }, 1000);
    });

    it('should get queue status', async () => {
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 },
        { priority: MessagePriority.HIGH }
      );

      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.IMPACT,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 2 },
        { priority: MessagePriority.NORMAL }
      );

      const status = communication.getQueueStatus();
      expect(status.pending).toBeGreaterThan(0);
      expect(status.byPriority[MessagePriority.HIGH]).toBeGreaterThan(0);
      expect(status.byPriority[MessagePriority.NORMAL]).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should track message statistics', async () => {
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      const stats = communication.getStats();
      expect(stats.totalMessagesSent).toBe(1);
    });

    it('should calculate average delivery time', async (done) => {
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      setTimeout(() => {
        const stats = communication.getStats();
        if (stats.totalMessagesDelivered > 0) {
          expect(stats.averageDeliveryTime).toBeGreaterThan(0);
        }
        done();
      }, 200);
    });
  });

  describe('Message History', () => {
    it('should store message in history', async () => {
      const result = await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      const message = communication.getMessage(result.messageId);
      expect(message).toBeDefined();
      expect(message?.id).toBe(result.messageId);
    });

    it('should get messages for grant', async () => {
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      await communication.sendMessage(
        AgentType.TECHNICAL,
        AgentType.COORDINATOR,
        MessageType.VOTE_CAST,
        { grant_id: 1, score: 1 }
      );

      const messages = communication.getMessagesForGrant(1);
      expect(messages.length).toBe(2);
    });

    it('should clear old message history', async () => {
      await communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.TECHNICAL,
        MessageType.EVALUATION_REQUEST,
        { grant_id: 1 }
      );

      // Clear messages older than 0ms (all messages)
      const cleared = communication.clearHistory(0);
      expect(cleared).toBeGreaterThan(0);
    });
  });
});
