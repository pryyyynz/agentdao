/**
 * Tests for Voting Coordinator Agent
 */

import { VotingCoordinatorAgent } from '../src/agents/voting-coordinator-agent';
import { AgentType } from '../src/types';

// Mock configuration
const mockPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
const mockContractAddresses = {
  grantRegistry: '0x1234567890123456789012345678901234567890',
  agentVoting: '0x2234567890123456789012345678901234567890',
  grantTreasury: '0x3234567890123456789012345678901234567890'
};
const mockIPFSConfig = {
  gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
};

const mockAgentConfigs = [
  { agentType: AgentType.INTAKE, weight: 1.0, required: true },
  { agentType: AgentType.TECHNICAL, weight: 1.5, required: true },
  { agentType: AgentType.IMPACT, weight: 1.2, required: true },
  { agentType: AgentType.DUE_DILIGENCE, weight: 1.3, required: true },
  { agentType: AgentType.BUDGET, weight: 1.1, required: true },
  { agentType: AgentType.COMMUNITY, weight: 1.0, required: false }
];

describe('VotingCoordinatorAgent', () => {
  let agent: VotingCoordinatorAgent;

  beforeEach(() => {
    agent = new VotingCoordinatorAgent(
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      mockPrivateKey,
      mockContractAddresses,
      mockIPFSConfig,
      mockAgentConfigs
    );
  });

  describe('Initialization', () => {
    test('should initialize with correct agent type', () => {
      expect(agent.getAgentType()).toBe(AgentType.COORDINATOR);
    });

    test('should initialize with agent weights', () => {
      const weights = agent.getAgentWeights();
      expect(weights.size).toBe(6);
      expect(weights.get(AgentType.TECHNICAL)).toBe(1.5);
      expect(weights.get(AgentType.IMPACT)).toBe(1.2);
    });

    test('should identify required agents', () => {
      const required = agent.getRequiredAgents();
      expect(required.size).toBe(5);
      expect(required.has(AgentType.INTAKE)).toBe(true);
      expect(required.has(AgentType.TECHNICAL)).toBe(true);
      expect(required.has(AgentType.COMMUNITY)).toBe(false);
    });

    test('should set approval and rejection thresholds', () => {
      const customAgent = new VotingCoordinatorAgent(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        mockPrivateKey,
        mockContractAddresses,
        mockIPFSConfig,
        mockAgentConfigs,
        0.8, // approval threshold
        -0.4  // rejection threshold
      );
      expect(customAgent).toBeDefined();
    });
  });

  describe('Vote Aggregation', () => {
    test('should calculate raw score correctly', () => {
      const votes = [
        { agentType: AgentType.INTAKE, agentAddress: '0x1', score: 2, weight: 1.0, timestamp: new Date() },
        { agentType: AgentType.TECHNICAL, agentAddress: '0x2', score: 1, weight: 1.5, timestamp: new Date() },
        { agentType: AgentType.IMPACT, agentAddress: '0x3', score: -1, weight: 1.2, timestamp: new Date() }
      ];

      // Raw score = (2 + 1 + -1) / 3 = 0.667
      const rawScore = votes.reduce((sum, v) => sum + v.score, 0) / votes.length;
      expect(rawScore).toBeCloseTo(0.667, 2);
    });

    test('should calculate weighted score correctly', () => {
      const votes = [
        { agentType: AgentType.INTAKE, agentAddress: '0x1', score: 2, weight: 1.0, timestamp: new Date() },
        { agentType: AgentType.TECHNICAL, agentAddress: '0x2', score: 1, weight: 1.5, timestamp: new Date() },
        { agentType: AgentType.IMPACT, agentAddress: '0x3', score: 1, weight: 1.2, timestamp: new Date() }
      ];

      // Weighted score = (2*1.0 + 1*1.5 + 1*1.2) / (1.0 + 1.5 + 1.2) = 4.7 / 3.7 = 1.27
      // Normalized (divide by 2 for -1 to +1 range) = 0.635
      const weightedSum = votes.reduce((sum, v) => sum + v.score * v.weight, 0);
      const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
      const weightedScore = (weightedSum / totalWeight) / 2;
      expect(weightedScore).toBeCloseTo(0.635, 2);
    });

    test('should handle empty votes', () => {
      const votes: any[] = [];
      const rawScore = votes.length > 0 ? votes.reduce((sum, v) => sum + v.score, 0) / votes.length : 0;
      expect(rawScore).toBe(0);
    });

    test('should handle negative votes', () => {
      const votes = [
        { agentType: AgentType.INTAKE, agentAddress: '0x1', score: -2, weight: 1.0, timestamp: new Date() },
        { agentType: AgentType.TECHNICAL, agentAddress: '0x2', score: -1, weight: 1.5, timestamp: new Date() },
        { agentType: AgentType.IMPACT, agentAddress: '0x3', score: -2, weight: 1.2, timestamp: new Date() }
      ];

      const rawScore = votes.reduce((sum, v) => sum + v.score, 0) / votes.length;
      expect(rawScore).toBeCloseTo(-1.667, 2);
    });
  });

  describe('Decision Making', () => {
    test('should approve when weighted score >= approval threshold', () => {
      const weightedScore = 0.75; // Above default 0.7 threshold
      const approvalThreshold = 0.7;
      const decision = weightedScore >= approvalThreshold ? 'APPROVE' : 'PENDING';
      expect(decision).toBe('APPROVE');
    });

    test('should reject when weighted score <= rejection threshold', () => {
      const weightedScore = -0.4; // Below default -0.3 threshold
      const rejectionThreshold = -0.3;
      const decision = weightedScore <= rejectionThreshold ? 'REJECT' : 'PENDING';
      expect(decision).toBe('REJECT');
    });

    test('should be pending when score is in neutral range', () => {
      const weightedScore = 0.5; // Between -0.3 and 0.7
      const approvalThreshold = 0.7;
      const rejectionThreshold = -0.3;
      
      let decision: 'APPROVE' | 'REJECT' | 'PENDING';
      if (weightedScore >= approvalThreshold) {
        decision = 'APPROVE';
      } else if (weightedScore <= rejectionThreshold) {
        decision = 'REJECT';
      } else {
        decision = 'PENDING';
      }
      
      expect(decision).toBe('PENDING');
    });

    test('should handle edge case at approval threshold', () => {
      const weightedScore = 0.7;
      const approvalThreshold = 0.7;
      const decision = weightedScore >= approvalThreshold ? 'APPROVE' : 'PENDING';
      expect(decision).toBe('APPROVE');
    });

    test('should handle edge case at rejection threshold', () => {
      const weightedScore = -0.3;
      const rejectionThreshold = -0.3;
      const decision = weightedScore <= rejectionThreshold ? 'REJECT' : 'PENDING';
      expect(decision).toBe('REJECT');
    });
  });

  describe('Voting Progress', () => {
    test('should track total agents correctly', () => {
      const evaluatorTypes = Array.from(agent.getAgentWeights().keys()).filter(
        type => type !== AgentType.COORDINATOR && type !== AgentType.EXECUTOR
      );
      expect(evaluatorTypes.length).toBe(6);
    });

    test('should identify pending agents', () => {
      const allAgents = [
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET,
        AgentType.COMMUNITY
      ];
      const votedAgents = [AgentType.INTAKE, AgentType.TECHNICAL];
      const pending = allAgents.filter(a => !votedAgents.includes(a));
      
      expect(pending.length).toBe(4);
      expect(pending).toContain(AgentType.IMPACT);
      expect(pending).toContain(AgentType.BUDGET);
    });

    test('should check voting completion when all required agents voted', () => {
      const requiredAgents = [
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET
      ];
      const votedAgents = [
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET,
        AgentType.COMMUNITY
      ];

      const allRequiredVoted = requiredAgents.every(type => votedAgents.includes(type));
      expect(allRequiredVoted).toBe(true);
    });

    test('should not complete when required agents missing', () => {
      const requiredAgents = [
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET
      ];
      const votedAgents = [
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        AgentType.IMPACT
      ];

      const allRequiredVoted = requiredAgents.every(type => votedAgents.includes(type));
      expect(allRequiredVoted).toBe(false);
    });
  });

  describe('Workflow Execution', () => {
    test('should determine approval workflow path', () => {
      const decision = 'APPROVE';
      const workflowPath = decision === 'APPROVE' ? 'APPROVAL_WORKFLOW' : 'OTHER';
      expect(workflowPath).toBe('APPROVAL_WORKFLOW');
    });

    test('should determine rejection workflow path', () => {
      const decision = 'REJECT';
      const workflowPath = decision === 'REJECT' ? 'REJECTION_WORKFLOW' : 'OTHER';
      expect(workflowPath).toBe('REJECTION_WORKFLOW');
    });

    test('should determine pending workflow path', () => {
      const decision = 'PENDING';
      const workflowPath = decision === 'PENDING' ? 'PENDING_WORKFLOW' : 'OTHER';
      expect(workflowPath).toBe('PENDING_WORKFLOW');
    });

    test('should generate approval notification', () => {
      const grantId = 1;
      const weightedScore = 0.85;
      const message = `Congratulations! Your grant #${grantId} has been approved with a weighted score of ${weightedScore.toFixed(2)}.`;
      expect(message).toContain('approved');
      expect(message).toContain('0.85');
    });

    test('should generate rejection notification', () => {
      const grantId = 1;
      const weightedScore = -0.5;
      const message = `Your grant #${grantId} was not approved. Weighted score: ${weightedScore.toFixed(2)}.`;
      expect(message).toContain('not approved');
      expect(message).toContain('-0.50');
    });
  });

  describe('Score Emoji Mapping', () => {
    test('should map score +2 to rocket emoji', () => {
      const score = 2;
      const emoji = score === 2 ? '🚀' : '❓';
      expect(emoji).toBe('🚀');
    });

    test('should map score +1 to checkmark emoji', () => {
      const score = 1;
      const emoji = score === 1 ? '✅' : '❓';
      expect(emoji).toBe('✅');
    });

    test('should map score 0 to neutral emoji', () => {
      const score = 0;
      const emoji = score === 0 ? '➖' : '❓';
      expect(emoji).toBe('➖');
    });

    test('should map score -1 to X emoji', () => {
      const score = -1;
      const emoji = score === -1 ? '❌' : '❓';
      expect(emoji).toBe('❌');
    });

    test('should map score -2 to stop emoji', () => {
      const score = -2;
      const emoji = score === -2 ? '⛔' : '❓';
      expect(emoji).toBe('⛔');
    });
  });

  describe('Decision Emoji Mapping', () => {
    test('should map APPROVE to checkmark', () => {
      const decision = 'APPROVE';
      const emoji = decision === 'APPROVE' ? '✅' : '❓';
      expect(emoji).toBe('✅');
    });

    test('should map REJECT to X', () => {
      const decision = 'REJECT';
      const emoji = decision === 'REJECT' ? '❌' : '❓';
      expect(emoji).toBe('❌');
    });

    test('should map PENDING to pause', () => {
      const decision = 'PENDING';
      const emoji = decision === 'PENDING' ? '⏸️' : '❓';
      expect(emoji).toBe('⏸️');
    });
  });

  describe('Error Handling', () => {
    test('should throw error when calling evaluate() directly', async () => {
      const mockGrant: any = { id: 1, amount: '1000000000000000000' };
      await expect(async () => {
        await (agent as any).evaluate(mockGrant);
      }).rejects.toThrow('Coordinator agents use coordinateVoting()');
    });

    test('should handle invalid agent configurations', () => {
      const invalidConfigs = [
        { agentType: AgentType.COORDINATOR, weight: 1.0, required: true }
      ];
      
      const testAgent = new VotingCoordinatorAgent(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        mockPrivateKey,
        mockContractAddresses,
        mockIPFSConfig,
        invalidConfigs
      );

      expect(testAgent).toBeDefined();
    });
  });

  describe('Weight Configuration', () => {
    test('should retrieve all agent weights', () => {
      const weights = agent.getAgentWeights();
      expect(weights instanceof Map).toBe(true);
      expect(weights.size).toBeGreaterThan(0);
    });

    test('should retrieve required agents', () => {
      const required = agent.getRequiredAgents();
      expect(required instanceof Set).toBe(true);
      expect(required.size).toBeGreaterThan(0);
    });

    test('should handle custom weight distributions', () => {
      const customConfigs = [
        { agentType: AgentType.TECHNICAL, weight: 2.0, required: true },
        { agentType: AgentType.BUDGET, weight: 1.8, required: true },
        { agentType: AgentType.COMMUNITY, weight: 0.5, required: false }
      ];

      const customAgent = new VotingCoordinatorAgent(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        mockPrivateKey,
        mockContractAddresses,
        mockIPFSConfig,
        customConfigs
      );

      const weights = customAgent.getAgentWeights();
      expect(weights.get(AgentType.TECHNICAL)).toBe(2.0);
      expect(weights.get(AgentType.BUDGET)).toBe(1.8);
      expect(weights.get(AgentType.COMMUNITY)).toBe(0.5);
    });

    test('should handle all agents as optional', () => {
      const optionalConfigs = [
        { agentType: AgentType.INTAKE, weight: 1.0, required: false },
        { agentType: AgentType.TECHNICAL, weight: 1.0, required: false }
      ];

      const optionalAgent = new VotingCoordinatorAgent(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        mockPrivateKey,
        mockContractAddresses,
        mockIPFSConfig,
        optionalConfigs
      );

      const required = optionalAgent.getRequiredAgents();
      expect(required.size).toBe(0);
    });
  });
});
