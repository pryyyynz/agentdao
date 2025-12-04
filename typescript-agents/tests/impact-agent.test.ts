/**
 * Impact Agent Test Suite
 */

import { ImpactAgent } from '../src/agents/impact-agent';
import {
  AgentConfig,
  AgentType,
  Grant,
  GrantStatus,
  GrantProposal
} from '../src/types';

describe('ImpactAgent', () => {
  let agent: ImpactAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.IMPACT,
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
    projectName: 'DeFi Education Platform',
    description: 'A comprehensive educational platform for DeFi protocols with interactive tutorials and simulations. Aims to onboard 10,000 users in first year.',
    targetUsers: 'Crypto beginners and intermediate users wanting to learn DeFi',
    ecosystemGap: 'Current DeFi education is fragmented and lacks hands-on practice environments. This platform provides unified, interactive learning.',
    daoAlignment: 'Strongly aligns with DAO mission to increase DeFi adoption and education',
    potentialReach: 'Target 10,000 users in year 1, with potential to reach 100,000+ as platform scales',
    comparableProjects: ['DeFi Academy', 'Blockchain Learning Hub'],
    githubRepos: ['https://github.com/test/defi-edu'],
    teamMembers: [],
    previousProjects: [],
    references: []
  };

  const mockGrant: Grant = {
    id: 1,
    applicant: '0x1111111111111111111111111111111111111111',
    ipfsHash: 'QmTest123',
    amount: '1000000000000000000',
    status: GrantStatus.PENDING,
    createdAt: new Date(),
    proposal: mockProposal
  };

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      agent = new ImpactAgent(mockConfig);
      expect(agent.getAgentType()).toBe(AgentType.IMPACT);
    });

    it('should initialize Python service client', () => {
      agent = new ImpactAgent(mockConfig);
      expect(agent).toBeDefined();
      expect(agent.getAgentType()).toBe(AgentType.IMPACT);
    });
  });

  describe('Score Normalization', () => {
    beforeEach(() => {
      agent = new ImpactAgent(mockConfig);
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
      expect((agent as any).normalizeScore(2.7)).toBe(2);
    });

    it('should clamp score below minimum', () => {
      expect((agent as any).normalizeScore(-5)).toBe(-2);
      expect((agent as any).normalizeScore(-3)).toBe(-2);
      expect((agent as any).normalizeScore(-2.7)).toBe(-2);
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
      agent = new ImpactAgent(mockConfig);
    });

    it('should accept valid analysis response', () => {
      const validResponse = {
        score: 1,
        reasoning: 'Strong ecosystem fit',
        confidence: 0.85,
        impact_areas: ['Education', 'Adoption'],
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
        reasoning: 'Strong impact',
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('missing or invalid score');
    });

    it('should reject response without reasoning', () => {
      const invalidResponse = {
        score: 1,
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('missing or invalid reasoning');
    });

    it('should reject response with empty reasoning', () => {
      const invalidResponse = {
        score: 1,
        reasoning: '   ',
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('missing or invalid reasoning');
    });

    it('should reject response with invalid confidence', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        confidence: 1.5
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('invalid confidence value');
    });

    it('should reject response with negative confidence', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        confidence: -0.1
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('invalid confidence value');
    });
  });

  describe('Pre-evaluation Checks', () => {
    beforeEach(() => {
      agent = new ImpactAgent(mockConfig);
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

    it('should warn if description too short', async () => {
      const grantWithShortDesc = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          description: 'Short'
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithShortDesc);

      expect(result.issues).toContain('Description too short or missing');
    });

    it('should warn if target users not specified', async () => {
      const grantWithoutTargetUsers = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          targetUsers: undefined
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithoutTargetUsers);

      expect(result.issues).toContain('Target users not specified');
    });

    it('should warn if ecosystem gap not identified', async () => {
      const grantWithoutGap = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          ecosystemGap: undefined
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithoutGap);

      expect(result.issues).toContain('Ecosystem gap not identified');
    });
  });

  describe('Impact Assessment', () => {
    beforeEach(() => {
      agent = new ImpactAgent(mockConfig);
    });

    it('should assess impact dimensions', () => {
      const assessment = agent.assessImpactDimensions(mockGrant);

      expect(assessment).toBeDefined();
      expect(assessment?.ecosystemValue).toBeDefined();
      expect(assessment?.daoAlignment).toBeDefined();
      expect(assessment?.userReach).toBeDefined();
      expect(assessment?.innovation).toBeDefined();
      expect(assessment?.sustainability).toBeDefined();
    });

    it('should return null if no proposal', () => {
      const grantWithoutProposal = { ...mockGrant, proposal: undefined };
      const assessment = agent.assessImpactDimensions(grantWithoutProposal);

      expect(assessment).toBeNull();
    });

    it('should calculate impact score from assessment', () => {
      const assessment = {
        ecosystemValue: 'high' as const,
        daoAlignment: 'strong' as const,
        userReach: 'broad' as const,
        innovation: 'groundbreaking' as const,
        sustainability: 'long-term' as const
      };

      const score = agent.calculateImpactScore(assessment);

      expect(score).toBeGreaterThanOrEqual(-2);
      expect(score).toBeLessThanOrEqual(2);
    });

    it('should handle low-impact assessment', () => {
      const assessment = {
        ecosystemValue: 'low' as const,
        daoAlignment: 'weak' as const,
        userReach: 'narrow' as const,
        innovation: 'derivative' as const,
        sustainability: 'short-term' as const
      };

      const score = agent.calculateImpactScore(assessment);

      expect(score).toBeGreaterThanOrEqual(-2);
      expect(score).toBeLessThanOrEqual(2);
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      agent = new ImpactAgent(mockConfig);
    });

    it('should find similar projects', async () => {
      const projects = await agent.findSimilarProjects(mockGrant);

      expect(projects).toBeDefined();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('should return empty array if no comparable projects', async () => {
      const grantWithoutProjects = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          comparableProjects: undefined
        }
      };

      const projects = await agent.findSimilarProjects(grantWithoutProjects);

      expect(projects).toEqual([]);
    });
  });
});

