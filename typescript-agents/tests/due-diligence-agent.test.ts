/**
 * Due Diligence Agent Test Suite
 */

import { DueDiligenceAgent, RiskSeverity, RiskCategory } from '../src/agents/due-diligence-agent';
import {
  AgentConfig,
  AgentType,
  Grant,
  GrantStatus,
  GrantProposal
} from '../src/types';

describe('DueDiligenceAgent', () => {
  let agent: DueDiligenceAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.DUE_DILIGENCE,
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
    projectName: 'DeFi Protocol',
    description: 'A decentralized finance protocol for lending and borrowing with advanced risk management features.',
    teamMembers: [
      {
        name: 'Alice Developer',
        role: 'Lead Engineer',
        github: 'alice-dev',
        wallet: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      },
      {
        name: 'Bob Smith',
        role: 'Product Manager',
        github: 'bob-smith',
        wallet: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
      }
    ],
    previousProjects: [
      {
        name: 'DeFi Yield Optimizer',
        url: 'https://github.com/team/yield-optimizer',
        status: 'Completed'
      }
    ],
    references: ['Reference 1', 'Reference 2']
  };

  const mockGrant: Grant = {
    id: 1,
    applicant: '0x1111111111111111111111111111111111111111',
    ipfsHash: 'QmTest123',
    amount: '2000000000000000000',
    status: GrantStatus.PENDING,
    createdAt: new Date(),
    proposal: mockProposal
  };

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      agent = new DueDiligenceAgent(mockConfig);
      expect(agent.getAgentType()).toBe(AgentType.DUE_DILIGENCE);
    });

    it('should initialize Python service client', () => {
      agent = new DueDiligenceAgent(mockConfig);
      expect(agent).toBeDefined();
    });
  });

  describe('Score Normalization', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
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
      agent = new DueDiligenceAgent(mockConfig);
    });

    it('should accept valid analysis response', () => {
      const validResponse = {
        score: 1,
        reasoning: 'Team is credible',
        team_verification: {
          verified_members: 2,
          total_members: 2,
          github_activity: 'high',
          reputation_score: 85
        },
        risk_flags: [],
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
        reasoning: 'Good team',
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

    it('should reject response with invalid team verification', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        team_verification: {
          verified_members: 'two',
          total_members: 2
        },
        confidence: 0.85
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('Invalid team verification data');
    });
  });

  describe('Pre-evaluation Checks', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
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

    it('should warn if no team members', async () => {
      const grantWithoutTeam = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          teamMembers: []
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithoutTeam);

      expect(result.issues).toContain('No team members specified');
    });

    it('should warn if no verifiable information', async () => {
      const grantWithUnverifiableTeam = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          teamMembers: [
            { name: 'John Doe', role: 'Developer' }
          ]
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithUnverifiableTeam);

      expect(result.issues).toContain('No verifiable information for team members (GitHub or wallet)');
    });
  });

  describe('Risk Assessment', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
    });

    it('should return NONE for empty risk flags', () => {
      const result = agent.assessOverallRisk([]);
      expect(result).toBe(RiskSeverity.NONE);
    });

    it('should return HIGH for high-risk flags', () => {
      const riskFlags = [
        {
          severity: RiskSeverity.HIGH,
          category: RiskCategory.TEAM,
          description: 'Unverified team members',
          impact: 'Critical'
        }
      ];

      const result = agent.assessOverallRisk(riskFlags);
      expect(result).toBe(RiskSeverity.HIGH);
    });

    it('should return HIGH for multiple medium risks', () => {
      const riskFlags = [
        {
          severity: RiskSeverity.MEDIUM,
          category: RiskCategory.TEAM,
          description: 'Low GitHub activity',
          impact: 'Moderate'
        },
        {
          severity: RiskSeverity.MEDIUM,
          category: RiskCategory.DELIVERY,
          description: 'No previous projects',
          impact: 'Moderate'
        }
      ];

      const result = agent.assessOverallRisk(riskFlags);
      expect(result).toBe(RiskSeverity.HIGH);
    });

    it('should return MEDIUM for single medium risk', () => {
      const riskFlags = [
        {
          severity: RiskSeverity.MEDIUM,
          category: RiskCategory.TEAM,
          description: 'Limited experience',
          impact: 'Moderate'
        }
      ];

      const result = agent.assessOverallRisk(riskFlags);
      expect(result).toBe(RiskSeverity.MEDIUM);
    });

    it('should return LOW for only low-risk flags', () => {
      const riskFlags = [
        {
          severity: RiskSeverity.LOW,
          category: RiskCategory.TEAM,
          description: 'Minor concern',
          impact: 'Low'
        }
      ];

      const result = agent.assessOverallRisk(riskFlags);
      expect(result).toBe(RiskSeverity.LOW);
    });
  });

  describe('Wallet Validation', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
    });

    it('should accept valid Ethereum addresses', () => {
      expect(agent.verifyWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')).toBe(false); // Invalid length
      expect(agent.verifyWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD')).toBe(true);
      expect(agent.verifyWalletAddress('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(false); // Invalid length
      expect(agent.verifyWalletAddress('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(agent.verifyWalletAddress('invalid')).toBe(false);
      expect(agent.verifyWalletAddress('0x')).toBe(false);
      expect(agent.verifyWalletAddress('742d35Cc6634C0532925a3b844Bc9e7595f0bEbD')).toBe(false); // Missing 0x
      expect(agent.verifyWalletAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false); // Invalid hex
    });
  });

  describe('GitHub Verification', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
    });

    it('should verify valid GitHub username', async () => {
      const result = await agent.verifyGitHubPresence('valid-username');
      expect(result).toBe(true);
    });

    it('should reject empty username', async () => {
      const result = await agent.verifyGitHubPresence('');
      expect(result).toBe(false);
    });
  });

  describe('Team Credibility Score', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
    });

    it('should calculate score for grant with full team info', () => {
      const score = agent.calculateTeamCredibilityScore(mockGrant);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should return 0 for grant without proposal', () => {
      const grantWithoutProposal = { ...mockGrant, proposal: undefined };
      const score = agent.calculateTeamCredibilityScore(grantWithoutProposal);

      expect(score).toBe(0);
    });

    it('should award points for team members', () => {
      const grantWithLargeTeam = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          teamMembers: Array(10).fill({ name: 'Member', role: 'Dev' })
        }
      };

      const score = agent.calculateTeamCredibilityScore(grantWithLargeTeam);
      expect(score).toBeGreaterThanOrEqual(20); // Max 20 points for team size
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      agent = new DueDiligenceAgent(mockConfig);
    });

    it('should generate risk summary for no risks', () => {
      const summary = agent.getRiskSummary([]);
      expect(summary).toContain('No significant risks');
    });

    it('should generate risk summary with flags', () => {
      const riskFlags = [
        {
          severity: RiskSeverity.HIGH,
          category: RiskCategory.TEAM,
          description: 'Issue',
          impact: 'Critical'
        },
        {
          severity: RiskSeverity.MEDIUM,
          category: RiskCategory.DELIVERY,
          description: 'Concern',
          impact: 'Moderate'
        }
      ];

      const summary = agent.getRiskSummary(riskFlags);
      expect(summary).toContain('High Risk: 1');
      expect(summary).toContain('Medium Risk: 1');
      expect(summary).toContain('Overall Risk Level:');
    });
  });
});
