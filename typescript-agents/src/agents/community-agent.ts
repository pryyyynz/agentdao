/**
 * Community Sentiment Agent - Analyzes community engagement and sentiment
 * 
 * Responsibilities:
 * - Analyze community discussion quality
 * - Measure social sentiment
 * - Evaluate community support level
 * - Track engagement metrics
 * - Assess public opinion
 * - Identify community concerns
 */

import { BaseGrantAgent } from './base-agent';
import { PythonServiceClient } from '../utils/python-client';
import {
  AgentConfig,
  Grant,
  EvaluationResult,
  EvaluationScore,
  AgentError,
  AgentErrorType
} from '../types';

/**
 * Community sentiment analysis response from Python service
 */
interface CommunityAnalysis {
  score: number;
  reasoning: string;
  sentiment_metrics: {
    overall_sentiment: 'positive' | 'neutral' | 'negative';
    support_level: number; // 0-1
    engagement_score: number; // 0-1
    discussion_quality: 'high' | 'medium' | 'low';
  };
  key_themes: string[];
  community_concerns: string[];
  support_indicators: string[];
  confidence: number;
  concerns?: string[];
  recommendations?: string[];
}

/**
 * Sentiment levels
 */
export enum SentimentLevel {
  VERY_POSITIVE = 'very_positive',
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  VERY_NEGATIVE = 'very_negative'
}

/**
 * Community engagement assessment
 */
export interface CommunityAssessment {
  overallSentiment: SentimentLevel;
  supportLevel: number; // 0-100
  engagementScore: number; // 0-100
  discussionQuality: 'high' | 'medium' | 'low';
  communitySize: 'large' | 'medium' | 'small';
  participationRate: number; // 0-1
}

/**
 * Community Sentiment Agent class
 */
export class CommunityAgent extends BaseGrantAgent {
  private pythonClient: PythonServiceClient;

  constructor(config: AgentConfig) {
    super(config);

    // Initialize Python service client
    this.pythonClient = new PythonServiceClient({
      baseURL: config.pythonApiUrl,
      apiKey: config.pythonApiKey,
      timeout: 45000, // 45 seconds for community analysis
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2
      }
    });
  }

  /**
   * Evaluate grant based on community sentiment
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    console.log(`\n👥 Community Agent - Evaluating grant ${grant.id}`);
    console.log(`   Project: ${grant.proposal?.projectName || 'Unknown'}`);

    // Validate proposal exists
    if (!grant.proposal) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Grant proposal not loaded'
      );
    }

    try {
      // Prepare community data for Python service
      const requestData = {
        grant_id: grant.id,
        project_name: grant.proposal.projectName,
        description: grant.proposal.description,
        target_users: grant.proposal.targetUsers,
        community_links: [],
        social_media: {}
      };

      console.log('\n📊 Community data:');
      console.log(`   - Target users: ${grant.proposal.targetUsers || 'Not specified'}`);
      console.log(`   - Community links: ${requestData.community_links.length}`);
      console.log(`   - Social media accounts: ${Object.keys(requestData.social_media).length}`);

      // Call Python service with retry logic
      console.log('\n📡 Requesting community sentiment analysis from Python service...');
      const analysis = await this.pythonClient.analyzeCommunity(requestData);

      // Validate response
      this.validateAnalysisResponse(analysis);

      console.log(`✅ Analysis received - Score: ${analysis.score}, Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      // Log sentiment metrics
      if (analysis.sentiment_metrics) {
        console.log('\n💬 Sentiment Metrics:');
        console.log(`   - Overall sentiment: ${analysis.sentiment_metrics.overall_sentiment}`);
        console.log(`   - Support level: ${(analysis.sentiment_metrics.support_level * 100).toFixed(1)}%`);
        console.log(`   - Engagement score: ${(analysis.sentiment_metrics.engagement_score * 100).toFixed(1)}%`);
        console.log(`   - Discussion quality: ${analysis.sentiment_metrics.discussion_quality}`);
      }

      // Log key themes
      if (analysis.key_themes && analysis.key_themes.length > 0) {
        console.log('\n🎯 Key Themes:');
        analysis.key_themes.forEach((theme: string) => {
          console.log(`   • ${theme}`);
        });
      }

      // Log support indicators
      if (analysis.support_indicators && analysis.support_indicators.length > 0) {
        console.log('\n✓ Support Indicators:');
        analysis.support_indicators.forEach((indicator: string) => {
          console.log(`   ✓ ${indicator}`);
        });
      }

      // Log community concerns
      if (analysis.community_concerns && analysis.community_concerns.length > 0) {
        console.log('\n⚠️  Community Concerns:');
        analysis.community_concerns.forEach((concern: string) => {
          console.log(`   - ${concern}`);
        });
      }

      // Log agent concerns and recommendations
      if (analysis.concerns && analysis.concerns.length > 0) {
        console.log('\n⚠️  Agent Concerns:');
        analysis.concerns.forEach((concern: string) => {
          console.log(`   - ${concern}`);
        });
      }

      if (analysis.recommendations && analysis.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        analysis.recommendations.forEach((rec: string) => {
          console.log(`   - ${rec}`);
        });
      }

      // Construct evaluation result
      const result: EvaluationResult = {
        grantId: grant.id,
        agentType: this.agentType,
        score: this.normalizeScore(analysis.score),
        reasoning: analysis.reasoning,
        concerns: analysis.concerns || [],
        recommendations: analysis.recommendations || [],
        confidence: analysis.confidence,
        timestamp: new Date()
      };

      return result;
    } catch (error) {
      if (error instanceof AgentError) {
        throw error;
      }

      throw new AgentError(
        AgentErrorType.EVALUATION_ERROR,
        `Community sentiment evaluation failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Validate analysis response from Python service
   */
  private validateAnalysisResponse(analysis: any): asserts analysis is CommunityAnalysis {
    if (typeof analysis !== 'object' || analysis === null) {
      throw new AgentError(
        AgentErrorType.API_ERROR,
        'Invalid analysis response: not an object'
      );
    }

    if (typeof analysis.score !== 'number') {
      throw new AgentError(
        AgentErrorType.API_ERROR,
        'Invalid analysis response: missing or invalid score'
      );
    }

    if (typeof analysis.reasoning !== 'string' || analysis.reasoning.trim().length === 0) {
      throw new AgentError(
        AgentErrorType.API_ERROR,
        'Invalid analysis response: missing or invalid reasoning'
      );
    }

    if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 1) {
      throw new AgentError(
        AgentErrorType.API_ERROR,
        'Invalid analysis response: invalid confidence value'
      );
    }

    // Validate sentiment metrics if provided
    if (analysis.sentiment_metrics) {
      if (typeof analysis.sentiment_metrics.support_level !== 'number' ||
          analysis.sentiment_metrics.support_level < 0 ||
          analysis.sentiment_metrics.support_level > 1) {
        throw new AgentError(
          AgentErrorType.API_ERROR,
          'Invalid sentiment metrics: support_level must be between 0 and 1'
        );
      }

      if (typeof analysis.sentiment_metrics.engagement_score !== 'number' ||
          analysis.sentiment_metrics.engagement_score < 0 ||
          analysis.sentiment_metrics.engagement_score > 1) {
        throw new AgentError(
          AgentErrorType.API_ERROR,
          'Invalid sentiment metrics: engagement_score must be between 0 and 1'
        );
      }
    }
  }

  /**
   * Normalize score from Python service to EvaluationScore range (-2 to +2)
   */
  private normalizeScore(score: number): EvaluationScore {
    const clamped = Math.max(-2, Math.min(2, Math.round(score)));
    return clamped as EvaluationScore;
  }

  /**
   * Helper: Perform pre-evaluation checks
   */
  async performPreEvaluationChecks(grant: Grant): Promise<{
    canEvaluate: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    if (!grant.proposal) {
      issues.push('Proposal not loaded');
      return { canEvaluate: false, issues };
    }

    // Check for community information
    const hasCommunityLinks = false; // Would check grant.proposal.communityLinks if it existed
    const hasSocialMedia = false; // Would check grant.proposal.socialMedia if it existed

    if (!hasCommunityLinks && !hasSocialMedia && !grant.proposal.targetUsers) {
      issues.push('No community information provided (target users, links, or social media)');
    }

    // Check Python service availability
    const serviceAvailable = await this.pythonClient.healthCheck();
    if (!serviceAvailable) {
      issues.push('Python service not available');
      return { canEvaluate: false, issues };
    }

    return {
      canEvaluate: issues.length === 0,
      issues
    };
  }

  /**
   * Helper: Convert sentiment score to sentiment level
   */
  convertScoreToSentiment(score: number): SentimentLevel {
    if (score >= 1.5) return SentimentLevel.VERY_POSITIVE;
    if (score >= 0.5) return SentimentLevel.POSITIVE;
    if (score >= -0.5) return SentimentLevel.NEUTRAL;
    if (score >= -1.5) return SentimentLevel.NEGATIVE;
    return SentimentLevel.VERY_NEGATIVE;
  }

  /**
   * Helper: Assess community engagement
   */
  assessCommunity(grant: Grant, analysis: CommunityAnalysis): CommunityAssessment | null {
    if (!grant.proposal || !analysis.sentiment_metrics) return null;

    const sentiment = this.convertScoreToSentiment(analysis.score);

    const assessment: CommunityAssessment = {
      overallSentiment: sentiment,
      supportLevel: analysis.sentiment_metrics.support_level * 100,
      engagementScore: analysis.sentiment_metrics.engagement_score * 100,
      discussionQuality: analysis.sentiment_metrics.discussion_quality,
      communitySize: 'medium', // Would be determined by actual metrics
      participationRate: analysis.sentiment_metrics.engagement_score
    };

    // Estimate community size based on available data
    const communityLinks = 0; // Would use grant.proposal.communityLinks?.length if it existed
    const socialMediaAccounts = 0; // Would use Object.keys(grant.proposal.socialMedia || {}).length if it existed
    
    if (communityLinks >= 3 || socialMediaAccounts >= 3) {
      assessment.communitySize = 'large';
    } else if (communityLinks === 0 && socialMediaAccounts === 0) {
      assessment.communitySize = 'small';
    }

    return assessment;
  }

  /**
   * Helper: Calculate community support score
   */
  calculateSupportScore(analysis: CommunityAnalysis): number {
    if (!analysis.sentiment_metrics) return 0;

    // Weighted calculation
    const supportWeight = 0.4;
    const engagementWeight = 0.3;
    const qualityWeight = 0.3;

    const supportScore = analysis.sentiment_metrics.support_level * supportWeight;
    const engagementScore = analysis.sentiment_metrics.engagement_score * engagementWeight;
    
    const qualityScore = analysis.sentiment_metrics.discussion_quality === 'high' ? 1.0 :
                        analysis.sentiment_metrics.discussion_quality === 'medium' ? 0.6 : 0.3;
    const qualityWeighted = qualityScore * qualityWeight;

    return (supportScore + engagementScore + qualityWeighted) * 100;
  }

  /**
   * Helper: Get evaluation summary
   */
  getEvaluationSummary(result: EvaluationResult): string {
    const scoreEmoji = result.score >= 1 ? '✅' : result.score <= -1 ? '❌' : '⚠️';
    
    return `
${scoreEmoji} Community Sentiment Evaluation Summary
${'='.repeat(50)}
Grant ID: ${result.grantId}
Score: ${result.score} / 2
Confidence: ${(result.confidence * 100).toFixed(1)}%

Reasoning:
${result.reasoning}

${result.concerns && result.concerns.length > 0 ? `
Concerns (${result.concerns.length}):
${result.concerns.map(c => `  • ${c}`).join('\n')}
` : ''}
${result.recommendations && result.recommendations.length > 0 ? `
Recommendations (${result.recommendations.length}):
${result.recommendations.map(r => `  • ${r}`).join('\n')}
` : ''}
${'='.repeat(50)}
`;
  }

  /**
   * Helper: Check if Python service is healthy
   */
  async checkServiceHealth(): Promise<boolean> {
    try {
      const healthy = await this.pythonClient.healthCheck();
      console.log(`🏥 Python service health: ${healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      return healthy;
    } catch (error) {
      console.error('❌ Failed to check Python service health:', error);
      return false;
    }
  }

  /**
   * Helper: Analyze sentiment distribution
   */
  analyzeSentimentDistribution(sentiment: 'positive' | 'neutral' | 'negative', supportLevel: number): {
    positive: number;
    neutral: number;
    negative: number;
  } {
    // Estimate distribution based on overall sentiment and support level
    if (sentiment === 'positive') {
      return {
        positive: 60 + (supportLevel * 30),
        neutral: 20 + ((1 - supportLevel) * 15),
        negative: 20 - (supportLevel * 15)
      };
    } else if (sentiment === 'negative') {
      return {
        positive: 20 - (supportLevel * 10),
        neutral: 20,
        negative: 60 + ((1 - supportLevel) * 20)
      };
    } else {
      return {
        positive: 33,
        neutral: 34,
        negative: 33
      };
    }
  }

  /**
   * Helper: Get sentiment emoji
   */
  getSentimentEmoji(sentiment: SentimentLevel): string {
    switch (sentiment) {
      case SentimentLevel.VERY_POSITIVE: return '🎉';
      case SentimentLevel.POSITIVE: return '😊';
      case SentimentLevel.NEUTRAL: return '😐';
      case SentimentLevel.NEGATIVE: return '😟';
      case SentimentLevel.VERY_NEGATIVE: return '😠';
      default: return '❓';
    }
  }
}
