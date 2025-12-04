/**
 * Tests for BaseGrantAgent
 */

import { BaseGrantAgent } from '../src/agents/base-agent';
import { 
  AgentConfig, 
  AgentType, 
  EvaluationResult, 
  EvaluationScore,
  Grant,
  GrantStatus
} from '../src/types';

// Mock agent implementation for testing
class MockAgent extends BaseGrantAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    return {
      grantId: grant.id,
      agentType: this.agentType,
      score: 1 as EvaluationScore,
      reasoning: 'Mock evaluation',
      confidence: 0.8,
      timestamp: new Date()
    };
  }
}

describe('BaseGrantAgent', () => {
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.TECHNICAL,
      blockchain: {
        rpcUrl: 'http://localhost:8545',
        privateKey: '0x' + '0'.repeat(64), // Mock private key
        contractAddresses: {
          grantRegistry: '0x' + '1'.repeat(40),
          agentVoting: '0x' + '2'.repeat(40),
          grantTreasury: '0x' + '3'.repeat(40)
        }
      },
      ipfs: {
        gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
      },
      pythonApiUrl: 'http://localhost:8000',
      pythonApiKey: 'test-key'
    };
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      const agent = new MockAgent(mockConfig);
      expect(agent.getAgentType()).toBe(AgentType.TECHNICAL);
    });

    it('should have a valid wallet address', () => {
      const agent = new MockAgent(mockConfig);
      const address = agent.getAddress();
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('Evaluation Result Validation', () => {
    let agent: MockAgent;

    beforeEach(() => {
      agent = new MockAgent(mockConfig);
    });

    it('should validate correct evaluation result', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 1,
        reasoning: 'Good proposal',
        confidence: 0.8,
        timestamp: new Date()
      };

      // Access protected method via type casting
      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).not.toThrow();
    });

    it('should reject invalid score (too high)', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 5 as EvaluationScore,
        reasoning: 'Good proposal',
        confidence: 0.8,
        timestamp: new Date()
      };

      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).toThrow('Score must be between -2 and 2');
    });

    it('should reject invalid score (too low)', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: -5 as EvaluationScore,
        reasoning: 'Bad proposal',
        confidence: 0.8,
        timestamp: new Date()
      };

      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).toThrow('Score must be between -2 and 2');
    });

    it('should reject invalid confidence (too high)', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 1,
        reasoning: 'Good proposal',
        confidence: 1.5,
        timestamp: new Date()
      };

      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).toThrow('Confidence must be between 0 and 1');
    });

    it('should reject invalid confidence (negative)', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 1,
        reasoning: 'Good proposal',
        confidence: -0.1,
        timestamp: new Date()
      };

      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).toThrow('Confidence must be between 0 and 1');
    });

    it('should reject empty reasoning', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 1,
        reasoning: '',
        confidence: 0.8,
        timestamp: new Date()
      };

      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).toThrow('Reasoning is required');
    });

    it('should reject whitespace-only reasoning', () => {
      const result: EvaluationResult = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 1,
        reasoning: '   ',
        confidence: 0.8,
        timestamp: new Date()
      };

      expect(() => {
        (agent as any).validateEvaluationResult(result);
      }).toThrow('Reasoning is required');
    });
  });

  describe('Agent Types', () => {
    it('should support all agent types', () => {
      const types = [
        AgentType.INTAKE,
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET,
        AgentType.COMMUNITY,
        AgentType.COORDINATOR,
        AgentType.EXECUTOR
      ];

      types.forEach(type => {
        const config = { ...mockConfig, agentType: type };
        const agent = new MockAgent(config);
        expect(agent.getAgentType()).toBe(type);
      });
    });
  });
});
