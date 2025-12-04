/**
 * Tests for TechnicalAgent
 */

import { TechnicalAgent } from '../src/agents/technical-agent';
import { AgentConfig, AgentType, Grant, GrantStatus, GrantProposal } from '../src/types';

describe('TechnicalAgent', () => {
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.TECHNICAL,
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
      pythonApiKey: 'test-key'
    };
  });

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      const agent = new TechnicalAgent(mockConfig);
      expect(agent.getAgentType()).toBe(AgentType.TECHNICAL);
    });

    it('should initialize Python service client', () => {
      const agent = new TechnicalAgent(mockConfig);
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.TECHNICAL);
    });
  });

  describe('Score Normalization', () => {
    let agent: TechnicalAgent;

    beforeEach(() => {
      agent = new TechnicalAgent(mockConfig);
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
      expect((agent as any).normalizeScore(2.1)).toBe(2);
    });

    it('should clamp score below minimum', () => {
      expect((agent as any).normalizeScore(-5)).toBe(-2);
      expect((agent as any).normalizeScore(-3)).toBe(-2);
      expect((agent as any).normalizeScore(-2.1)).toBe(-2);
    });

    it('should round decimal scores', () => {
      expect((agent as any).normalizeScore(1.4)).toBe(1);
      expect((agent as any).normalizeScore(1.5)).toBe(2);
      expect((agent as any).normalizeScore(1.6)).toBe(2);
      expect((agent as any).normalizeScore(-1.4)).toBe(-1);
      expect((agent as any).normalizeScore(-1.5)).toBe(-2);
    });
  });

  describe('Analysis Response Validation', () => {
    let agent: TechnicalAgent;

    beforeEach(() => {
      agent = new TechnicalAgent(mockConfig);
    });

    it('should accept valid analysis response', () => {
      const validResponse = {
        score: 1,
        reasoning: 'Good technical approach',
        confidence: 0.85,
        concerns: [],
        recommendations: []
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
        reasoning: 'Good technical approach',
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: missing or invalid score');
    });

    it('should reject response with non-numeric score', () => {
      const invalidResponse = {
        score: '1',
        reasoning: 'Good technical approach',
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: missing or invalid score');
    });

    it('should reject response without reasoning', () => {
      const invalidResponse = {
        score: 1,
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: missing or invalid reasoning');
    });

    it('should reject response with empty reasoning', () => {
      const invalidResponse = {
        score: 1,
        reasoning: '   ',
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: missing or invalid reasoning');
    });

    it('should reject response without confidence', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good technical approach'
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: invalid confidence value');
    });

    it('should reject response with invalid confidence (negative)', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good technical approach',
        confidence: -0.1
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: invalid confidence value');
    });

    it('should reject response with invalid confidence (> 1)', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good technical approach',
        confidence: 1.5
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid analysis response: invalid confidence value');
    });
  });

  describe('Pre-Evaluation Checks', () => {
    let agent: TechnicalAgent;

    beforeEach(() => {
      agent = new TechnicalAgent(mockConfig);
    });

    it('should identify missing proposal', async () => {
      const grant: Grant = {
        id: 1,
        applicant: '0x' + '1'.repeat(40),
        ipfsHash: 'QmTest',
        amount: '50000',
        status: GrantStatus.PENDING,
        createdAt: new Date()
      };

      const checks = await agent.performPreEvaluationChecks(grant);
      expect(checks.canEvaluate).toBe(false);
      expect(checks.issues).toContain('Proposal not loaded');
    });

    it('should identify short description', async () => {
      const proposal: GrantProposal = {
        projectName: 'Test',
        description: 'Short',
        techStack: ['Solidity']
      };

      const grant: Grant = {
        id: 1,
        applicant: '0x' + '1'.repeat(40),
        ipfsHash: 'QmTest',
        amount: '50000',
        status: GrantStatus.PENDING,
        createdAt: new Date(),
        proposal
      };

      const checks = await agent.performPreEvaluationChecks(grant);
      expect(checks.issues).toContain('Description too short or missing');
    });

    it('should identify missing tech stack', async () => {
      const proposal: GrantProposal = {
        projectName: 'Test',
        description: 'A'.repeat(100)
      };

      const grant: Grant = {
        id: 1,
        applicant: '0x' + '1'.repeat(40),
        ipfsHash: 'QmTest',
        amount: '50000',
        status: GrantStatus.PENDING,
        createdAt: new Date(),
        proposal
      };

      const checks = await agent.performPreEvaluationChecks(grant);
      expect(checks.issues).toContain('Tech stack not specified');
    });
  });

  describe('Evaluation Summary', () => {
    let agent: TechnicalAgent;

    beforeEach(() => {
      agent = new TechnicalAgent(mockConfig);
    });

    it('should generate summary with positive score', () => {
      const result = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 2,
        reasoning: 'Excellent technical proposal',
        confidence: 0.95,
        concerns: [],
        recommendations: [],
        timestamp: new Date()
      };

      const summary = agent.getEvaluationSummary(result as any);
      expect(summary).toContain('✅');
      expect(summary).toContain('Score: 2 / 2');
      expect(summary).toContain('95.0%');
      expect(summary).toContain('Excellent technical proposal');
    });

    it('should generate summary with negative score', () => {
      const result = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: -2,
        reasoning: 'Poor technical approach',
        confidence: 0.90,
        concerns: ['Security issues', 'Scalability problems'],
        recommendations: [],
        timestamp: new Date()
      };

      const summary = agent.getEvaluationSummary(result as any);
      expect(summary).toContain('❌');
      expect(summary).toContain('Score: -2 / 2');
      expect(summary).toContain('Security issues');
      expect(summary).toContain('Scalability problems');
    });

    it('should generate summary with neutral score', () => {
      const result = {
        grantId: 1,
        agentType: AgentType.TECHNICAL,
        score: 0,
        reasoning: 'Needs improvement',
        confidence: 0.75,
        concerns: ['Timeline unclear'],
        recommendations: ['Add technical documentation'],
        timestamp: new Date()
      };

      const summary = agent.getEvaluationSummary(result as any);
      expect(summary).toContain('⚠️');
      expect(summary).toContain('Score: 0 / 2');
      expect(summary).toContain('Timeline unclear');
      expect(summary).toContain('Add technical documentation');
    });
  });
});
