/**
 * Community Sentiment Agent Test Suite
 */

import { CommunityAgent, SentimentLevel } from '../src/agents/community-agent';
import {
  AgentConfig,
  AgentType,
  Grant,
  GrantStatus,
  GrantProposal
} from '../src/types';

describe('CommunityAgent', () => {
  let agent: CommunityAgent;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.COMMUNITY,
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
    projectName: 'Community Education Initiative',
    description: 'Building educational resources for the DeFi community with workshops and tutorials',
    targetUsers: 'DeFi enthusiasts, developers, and newcomers to crypto',
    teamMembers: [],
    previousProjects: [],
    references: []
  };

  const mockGrant: Grant = {
    id: 1,
    applicant: '0x1111111111111111111111111111111111111111',
    ipfsHash: 'QmTest123',
    amount: '50000',
    status: GrantStatus.PENDING,
    createdAt: new Date(),
    proposal: mockProposal
  };

  describe('Initialization', () => {
    it('should initialize with correct agent type', () => {
      agent = new CommunityAgent(mockConfig);
      expect(agent.getAgentType()).toBe(AgentType.COMMUNITY);
    });

    it('should initialize Python service client', () => {
      agent = new CommunityAgent(mockConfig);
      expect(agent).toBeDefined();
    });
  });

  describe('Score Normalization', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
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
      agent = new CommunityAgent(mockConfig);
    });

    it('should accept valid analysis response', () => {
      const validResponse = {
        score: 1,
        reasoning: 'Strong community support',
        sentiment_metrics: {
          overall_sentiment: 'positive' as const,
          support_level: 0.8,
          engagement_score: 0.75,
          discussion_quality: 'high' as const
        },
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
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
        reasoning: 'Good support',
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

    it('should reject response with invalid support level', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        confidence: 0.85,
        sentiment_metrics: {
          overall_sentiment: 'positive',
          support_level: 1.5, // Invalid
          engagement_score: 0.8,
          discussion_quality: 'high'
        }
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('support_level must be between 0 and 1');
    });

    it('should reject response with invalid engagement score', () => {
      const invalidResponse = {
        score: 1,
        reasoning: 'Good',
        confidence: 0.85,
        sentiment_metrics: {
          overall_sentiment: 'positive',
          support_level: 0.8,
          engagement_score: -0.1, // Invalid
          discussion_quality: 'high'
        }
      };

      expect(() => {
        (agent as any).validateAnalysisResponse(invalidResponse);
      }).toThrow('engagement_score must be between 0 and 1');
    });
  });

  describe('Pre-evaluation Checks', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
    });

    it('should pass checks for grant with target users', async () => {
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

    it('should warn if no community information', async () => {
      const grantWithoutCommunityInfo = {
        ...mockGrant,
        proposal: {
          ...mockProposal,
          targetUsers: undefined
        }
      };

      const result = await agent.performPreEvaluationChecks(grantWithoutCommunityInfo);

      expect(result.issues).toContain('No community information provided (target users, links, or social media)');
    });
  });

  describe('Sentiment Conversion', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
    });

    it('should convert score to VERY_POSITIVE', () => {
      const sentiment = agent.convertScoreToSentiment(1.8);
      expect(sentiment).toBe(SentimentLevel.VERY_POSITIVE);
    });

    it('should convert score to POSITIVE', () => {
      const sentiment = agent.convertScoreToSentiment(0.8);
      expect(sentiment).toBe(SentimentLevel.POSITIVE);
    });

    it('should convert score to NEUTRAL', () => {
      const sentiment = agent.convertScoreToSentiment(0);
      expect(sentiment).toBe(SentimentLevel.NEUTRAL);
    });

    it('should convert score to NEGATIVE', () => {
      const sentiment = agent.convertScoreToSentiment(-0.8);
      expect(sentiment).toBe(SentimentLevel.NEGATIVE);
    });

    it('should convert score to VERY_NEGATIVE', () => {
      const sentiment = agent.convertScoreToSentiment(-1.8);
      expect(sentiment).toBe(SentimentLevel.VERY_NEGATIVE);
    });
  });

  describe('Community Assessment', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
    });

    it('should assess community with positive sentiment', () => {
      const mockAnalysis = {
        score: 1.5,
        reasoning: 'Strong community support',
        sentiment_metrics: {
          overall_sentiment: 'positive' as const,
          support_level: 0.85,
          engagement_score: 0.8,
          discussion_quality: 'high' as const
        },
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
        confidence: 0.9
      };

      const assessment = agent.assessCommunity(mockGrant, mockAnalysis);

      expect(assessment).toBeDefined();
      expect(assessment?.overallSentiment).toBe(SentimentLevel.POSITIVE);
      expect(assessment?.supportLevel).toBe(85);
      expect(assessment?.engagementScore).toBe(80);
      expect(assessment?.discussionQuality).toBe('high');
    });

    it('should return null for grant without proposal', () => {
      const grantWithoutProposal = { ...mockGrant, proposal: undefined };
      const mockAnalysis = {
        score: 1,
        reasoning: 'Good',
        sentiment_metrics: {
          overall_sentiment: 'positive' as const,
          support_level: 0.8,
          engagement_score: 0.75,
          discussion_quality: 'high' as const
        },
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
        confidence: 0.9
      };

      const assessment = agent.assessCommunity(grantWithoutProposal, mockAnalysis);

      expect(assessment).toBeNull();
    });

    it('should return null if no sentiment metrics', () => {
      const mockAnalysis = {
        score: 1,
        reasoning: 'Good',
        sentiment_metrics: undefined as any,
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
        confidence: 0.9
      };

      const assessment = agent.assessCommunity(mockGrant, mockAnalysis);

      expect(assessment).toBeNull();
    });
  });

  describe('Support Score Calculation', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
    });

    it('should calculate high support score', () => {
      const mockAnalysis = {
        score: 1.5,
        reasoning: 'Great support',
        sentiment_metrics: {
          overall_sentiment: 'positive' as const,
          support_level: 0.9,
          engagement_score: 0.85,
          discussion_quality: 'high' as const
        },
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
        confidence: 0.9
      };

      const score = agent.calculateSupportScore(mockAnalysis);

      expect(score).toBeGreaterThan(75);
    });

    it('should calculate low support score', () => {
      const mockAnalysis = {
        score: -1,
        reasoning: 'Low support',
        sentiment_metrics: {
          overall_sentiment: 'negative' as const,
          support_level: 0.2,
          engagement_score: 0.3,
          discussion_quality: 'low' as const
        },
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
        confidence: 0.7
      };

      const score = agent.calculateSupportScore(mockAnalysis);

      expect(score).toBeLessThan(40);
    });

    it('should return 0 for no sentiment metrics', () => {
      const mockAnalysis = {
        score: 1,
        reasoning: 'Good',
        sentiment_metrics: undefined as any,
        key_themes: [],
        community_concerns: [],
        support_indicators: [],
        confidence: 0.9
      };

      const score = agent.calculateSupportScore(mockAnalysis);

      expect(score).toBe(0);
    });
  });

  describe('Sentiment Distribution', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
    });

    it('should analyze positive sentiment distribution', () => {
      const distribution = agent.analyzeSentimentDistribution('positive', 0.8);

      expect(distribution.positive).toBeGreaterThan(distribution.neutral);
      expect(distribution.positive).toBeGreaterThan(distribution.negative);
      expect(distribution.positive + distribution.neutral + distribution.negative).toBeCloseTo(100, 0);
    });

    it('should analyze negative sentiment distribution', () => {
      const distribution = agent.analyzeSentimentDistribution('negative', 0.3);

      expect(distribution.negative).toBeGreaterThan(distribution.positive);
      expect(distribution.negative).toBeGreaterThan(distribution.neutral);
    });

    it('should analyze neutral sentiment distribution', () => {
      const distribution = agent.analyzeSentimentDistribution('neutral', 0.5);

      expect(distribution.positive).toBeCloseTo(33, 1);
      expect(distribution.neutral).toBeCloseTo(34, 1);
      expect(distribution.negative).toBeCloseTo(33, 1);
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      agent = new CommunityAgent(mockConfig);
    });

    it('should return correct sentiment emoji', () => {
      expect(agent.getSentimentEmoji(SentimentLevel.VERY_POSITIVE)).toBe('🎉');
      expect(agent.getSentimentEmoji(SentimentLevel.POSITIVE)).toBe('😊');
      expect(agent.getSentimentEmoji(SentimentLevel.NEUTRAL)).toBe('😐');
      expect(agent.getSentimentEmoji(SentimentLevel.NEGATIVE)).toBe('😟');
      expect(agent.getSentimentEmoji(SentimentLevel.VERY_NEGATIVE)).toBe('😠');
    });
  });
});
