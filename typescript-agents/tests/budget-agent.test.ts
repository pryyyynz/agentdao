/**
 * Budget Agent Test Suite
 */

import { BudgetAgent } from '../src/agents/budget-agent';
import {
  AgentConfig,
  AgentType,
  Grant,
  GrantStatus,
  GrantProposal
} from '../src/types';

describe('BudgetAgent', () => {
  let agent: BudgetAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.BUDGET,
      blockchain: {
        rpcUrl: 'http://localhost:8545',
        privateKey: '0x' + '0'.repeat(64),
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
      pythonApiKey: 'test-api-key'
    };
  });

  const mockProposal: GrantProposal = {
    projectName: 'DeFi Protocol Development',
    description: 'Building a decentralized lending protocol with advanced risk management',
    timeline: '12 months',
    budgetBreakdown: {
      'Development': 50000,
      'Security Audit': 15000,
      'Marketing': 10000,
      'Operations': 5000
    },
    teamMembers: [
      { name: 'Alice', role: 'Lead Dev' },
      { name: 'Bob', role: 'Security Engineer' }
    ],
    previousProjects: [],
    references: []
  };

  const mockGrant: Grant = {
    id: 1,
    applicant: '0x1111111111111111111111111111111111111111',
    ipfsHash: 'QmTest123',
    amount: '80000',
    status: GrantStatus.PENDING,
    createdAt: new Date(),
    proposal: mockProposal
  };

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      agent = new BudgetAgent(mockConfig);
      expect(agent.getAgentType()).toBe(AgentType.BUDGET);
    });

    it('should initialize Python service client', () => {
      agent = new BudgetAgent(mockConfig);
      expect(agent).toBeDefined();
    });
  });

  describe('Score Normalization', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should normalize score within valid range', () => {
      expect((agent as any).normalizeScore(2)).toBe(2);
      expect((agent as any).normalizeScore(1)).toBe(1);
      expect((agent as any).normalizeScore(0)).toBe(0);
      expect((agent as any).normalizeScore(-1)).toBe(-1);
      expect((agent as any).normalizeScore(-2)).toBe(-2);
    });

    it('should clamp score above maximum', () => {
      expect((agent as any).normalizeScore(5)).toBe(2);
      expect((agent as any).normalizeScore(3)).toBe(2);
    });

    it('should clamp score below minimum', () => {
      expect((agent as any).normalizeScore(-5)).toBe(-2);
      expect((agent as any).normalizeScore(-3)).toBe(-2);
    });

    it('should round decimal scores', () => {
      expect((agent as any).normalizeScore(1.4)).toBe(1);
      expect((agent as any).normalizeScore(1.5)).toBe(2);
      expect((agent as any).normalizeScore(-1.4)).toBe(-1);
      expect((agent as any).normalizeScore(-1.5)).toBe(-2);
    });
  });

  describe('Analysis Response Validation', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should accept valid analysis response', () => {
      const validResponse = {
        score: 1,
        reasoning: 'Budget is reasonable and well-distributed',
        cost_breakdown: [],
        total_cost: 80000,
        cost_efficiency: 0.85,
        confidence: 0.9
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(validResponse);
      }).not.toThrow();
    });

    it('should reject null response', () => {
      expect(() => {
        (agent as any).validateAnalysisResponse(null);
      }).toThrow('Invalid analysis response: not an object');
    });

    it('should reject response without score', () => {
      const invalidResponse = {
        reasoning: 'Good budget',
        confidence: 0.85,
        cost_efficiency: 0.8
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('missing or invalid score');
    });

    it('should reject response without reasoning', () => {
      const invalidResponse = {
        score: 1,
        confidence: 0.85,
        cost_efficiency: 0.8
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('missing or invalid reasoning');
    });

    it('should reject response with invalid confidence', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        cost_efficiency: 0.8,
        confidence: 1.5
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('invalid confidence value');
    });

    it('should reject response with invalid cost efficiency', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        confidence: 0.85,
        cost_efficiency: 1.5
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('invalid cost efficiency value');
    });
  });

  describe('Pre-evaluation Checks', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should pass checks for valid grant', async () => {
      const result = await agent.performPreEvaluationChecks(mockGrant);

      expect(result.canEvaluate).toBeDefined();
      expect(result.issues).toBeDefined();
    });

    it('should fail if proposal not loaded', async () => {
      const grantWithoutProposal = { ...mockGrant, proposal: undefined };

      const result = await agent.performPreEvaluationChecks(grantWithoutProposal);

      expect(result.canEvaluate).toBe(false);
      expect(result.issues).toContain('Proposal not loaded');
    });

    it('should warn if requested amount is invalid', async () => {
      const grantWithZeroAmount = {
        ...mockGrant,
        amount: '0'
      };

      const result = await agent.performPreEvaluationChecks(grantWithZeroAmount);

      expect(result.issues).toContain('Requested amount is invalid or zero');
    });

    it('should warn if budget breakdown not provided', async () => {
      const grantWithoutBudget = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          budgetBreakdown: undefined
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithoutBudget);

      expect(result.issues).toContain('Budget breakdown not provided');
    });

    it('should warn if project duration not specified', async () => {
      const grantWithoutDuration = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          timeline: undefined
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithoutDuration);

      expect(result.issues).toContain('Project duration not specified');
    });
  });

  describe('Budget Breakdown Validation', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should validate matching breakdown and total', () => {
      const breakdown = {
        'Development': 50000,
        'Security': 20000,
        'Marketing': 10000
      };

      const result = agent.validateBudgetBreakdown(breakdown, 80000);

      expect(result.valid).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should accept breakdown within tolerance', () => {
      const breakdown = {
        'Development': 50000,
        'Security': 20000,
        'Marketing': 10100 // 100 over
      };

      const result = agent.validateBudgetBreakdown(breakdown, 80000);

      expect(result.valid).toBe(true); // Within 1% tolerance
      expect(result.difference).toBe(100);
    });

    it('should reject breakdown exceeding tolerance', () => {
      const breakdown = {
        'Development': 50000,
        'Security': 20000,
        'Marketing': 15000 // 5000 over
      };

      const result = agent.validateBudgetBreakdown(breakdown, 80000);

      expect(result.valid).toBe(false);
      expect(result.difference).toBe(5000);
    });
  });

  describe('Milestone Calculation', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should calculate equal milestone costs', () => {
      const costs = agent.calculateMilestoneCosts(90000, 3);

      expect(costs).toHaveLength(3);
      expect(costs[0]).toBe(30000);
      expect(costs[1]).toBe(30000);
      expect(costs[2]).toBe(30000);
    });

    it('should handle single milestone', () => {
      const costs = agent.calculateMilestoneCosts(100000, 1);

      expect(costs).toHaveLength(1);
      expect(costs[0]).toBe(100000);
    });

    it('should handle multiple milestones', () => {
      const costs = agent.calculateMilestoneCosts(100000, 5);

      expect(costs).toHaveLength(5);
      costs.forEach(cost => {
        expect(cost).toBe(20000);
      });
    });
  });

  describe('Budget Efficiency Calculation', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should return low score for concentrated budget', () => {
      const breakdown = {
        'Development': 72000, // 90% of total
        'Other': 8000
      };

      const efficiency = agent.calculateEfficiencyScore(breakdown, 80000);

      expect(efficiency).toBe(0.3);
    });

    it('should return medium score for moderately concentrated budget', () => {
      const breakdown = {
        'Development': 45000, // ~56% of total
        'Security': 20000,
        'Marketing': 15000
      };

      const efficiency = agent.calculateEfficiencyScore(breakdown, 80000);

      expect(efficiency).toBe(0.6);
    });

    it('should return high score for well-distributed budget', () => {
      const breakdown = {
        'Development': 30000,
        'Security': 25000,
        'Marketing': 15000,
        'Operations': 10000
      };

      const efficiency = agent.calculateEfficiencyScore(breakdown, 80000);

      expect(efficiency).toBe(0.9);
    });

    it('should return 0 for empty breakdown', () => {
      const efficiency = agent.calculateEfficiencyScore({}, 80000);

      expect(efficiency).toBe(0);
    });
  });

  describe('Budget Assessment', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should assess budget with high efficiency', () => {
      const mockAnalysis = {
        score: 1.5,
        reasoning: 'Efficient budget',
        cost_breakdown: [],
        total_cost: 80000,
        cost_efficiency: 0.85,
        confidence: 0.9
      };

      const assessment = agent.assessBudget(mockGrant, mockAnalysis);

      expect(assessment).toBeDefined();
      expect(assessment?.costEfficiency).toBe('high');
      expect(assessment?.riskLevel).toBe('low');
    });

    it('should assess budget with low efficiency', () => {
      const mockAnalysis = {
        score: -0.5,
        reasoning: 'Inefficient budget',
        cost_breakdown: [],
        total_cost: 80000,
        cost_efficiency: 0.25,
        confidence: 0.7,
        concerns: ['High cost', 'Poor distribution', 'Unclear justification']
      };

      const assessment = agent.assessBudget(mockGrant, mockAnalysis);

      expect(assessment).toBeDefined();
      expect(assessment?.costEfficiency).toBe('low');
      expect(assessment?.riskLevel).toBe('high');
    });

    it('should return null for grant without proposal', () => {
      const grantWithoutProposal = { ...mockGrant, proposal: undefined };
      const mockAnalysis = {
        score: 1,
        reasoning: 'Good',
        cost_breakdown: [],
        total_cost: 80000,
        cost_efficiency: 0.8,
        confidence: 0.9
      };

      const assessment = agent.assessBudget(grantWithoutProposal, mockAnalysis);

      expect(assessment).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      agent = new BudgetAgent(mockConfig);
    });

    it('should format budget amount in wei', () => {
      const formatted = agent.formatBudgetAmount(1000000);

      expect(formatted).toContain('1,000,000');
      expect(formatted).toContain('wei');
    });

    it('should format budget amount in ETH', () => {
      const formatted = agent.formatBudgetAmount(1000000000000000000, 'eth');

      expect(formatted).toContain('ETH');
    });
  });
});
