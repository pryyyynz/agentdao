/**
 * Impact Agent - Evaluates ecosystem impact of grants
 * 
 * Responsibilities:
 * - Assess potential ecosystem impact
 * - Evaluate alignment with DAO mission
 * - Analyze target user base
 * - Identify ecosystem gaps being filled
 * - Compare with similar projects
 * - Estimate potential reach
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
 * Impact analysis response from Python service
 */
interface ImpactAnalysis {
  score: number;
  reasoning: string;
  impact_areas?: string[];
  similar_projects?: Array<{
    name: string;
    difference: string;
  }>;
  confidence: number;
  concerns?: string[];
  recommendations?: string[];
}

/**
 * Impact assessment categories
 */
export interface ImpactAssessment {
  ecosystemValue: 'high' | 'medium' | 'low';
  daoAlignment: 'strong' | 'moderate' | 'weak';
  userReach: 'broad' | 'medium' | 'narrow';
  innovation: 'groundbreaking' | 'incremental' | 'derivative';
  sustainability: 'long-term' | 'medium-term' | 'short-term';
}

/**
 * Impact Agent class
 */
export class ImpactAgent extends BaseGrantAgent {
  private pythonClient: PythonServiceClient;

  constructor(config: AgentConfig) {
    super(config);

    // Initialize Python service client
    this.pythonClient = new PythonServiceClient({
      baseURL: config.pythonApiUrl,
      apiKey: config.pythonApiKey,
      timeout: 45000, // 45 seconds for impact analysis
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2
      }
    });
  }

  /**
   * Evaluate grant for ecosystem impact
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    console.log(`\n🌍 Impact Agent - Evaluating grant ${grant.id}`);
    console.log(`   Project: ${grant.proposal?.projectName || 'Unknown'}`);

    // Validate proposal exists
    if (!grant.proposal) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Grant proposal not loaded'
      );
    }

    try {
      // Prepare data for Python service
      const requestData = {
        grant_id: grant.id,
        project_name: grant.proposal.projectName,
        description: grant.proposal.description,
        target_users: grant.proposal.targetUsers,
        ecosystem_gap: grant.proposal.ecosystemGap,
        dao_alignment: grant.proposal.daoAlignment,
        potential_reach: grant.proposal.potentialReach
      };

      console.log('\n📊 Impact evaluation criteria:');
      console.log(`   - Target Users: ${grant.proposal.targetUsers || 'Not specified'}`);
      console.log(`   - Ecosystem Gap: ${grant.proposal.ecosystemGap || 'Not specified'}`);
      console.log(`   - DAO Alignment: ${grant.proposal.daoAlignment || 'Not specified'}`);
      console.log(`   - Potential Reach: ${grant.proposal.potentialReach || 'Not specified'}`);

      // Call Python service with retry logic
      console.log('\n📡 Requesting impact analysis from Python service...');
      const analysis = await this.pythonClient.analyzeImpact(requestData);

      // Validate response
      this.validateAnalysisResponse(analysis);

      console.log(`✅ Analysis received - Score: ${analysis.score}, Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      // Log impact areas
      if (analysis.impact_areas && analysis.impact_areas.length > 0) {
        console.log('\n🎯 Impact Areas:');
        analysis.impact_areas.forEach((area: string) => {
          console.log(`   ✓ ${area}`);
        });
      }

      // Log similar projects
      if (analysis.similar_projects && analysis.similar_projects.length > 0) {
        console.log('\n🔍 Similar Projects:');
        analysis.similar_projects.forEach((project: any) => {
          console.log(`   • ${project.name}`);
          console.log(`     Difference: ${project.difference}`);
        });
      }

      // Log concerns and recommendations
      if (analysis.concerns && analysis.concerns.length > 0) {
        console.log('\n⚠️  Concerns identified:');
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
        `Impact evaluation failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Validate analysis response from Python service
   */
  private validateAnalysisResponse(analysis: any): asserts analysis is ImpactAnalysis {
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

    // Check for minimum required information
    if (!grant.proposal.description || grant.proposal.description.length < 50) {
      issues.push('Description too short or missing');
    }

    if (!grant.proposal.targetUsers) {
      issues.push('Target users not specified');
    }

    if (!grant.proposal.ecosystemGap) {
      issues.push('Ecosystem gap not identified');
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
   * Helper: Assess impact in different dimensions
   */
  assessImpactDimensions(grant: Grant): ImpactAssessment | null {
    if (!grant.proposal) return null;

    // This is a simplified assessment - in production, this would use
    // more sophisticated analysis, potentially from the Python service

    const assessment: ImpactAssessment = {
      ecosystemValue: 'medium',
      daoAlignment: 'moderate',
      userReach: 'medium',
      innovation: 'incremental',
      sustainability: 'medium-term'
    };

    // Ecosystem value assessment
    if (grant.proposal.ecosystemGap && grant.proposal.ecosystemGap.length > 100) {
      assessment.ecosystemValue = 'high';
    }

    // DAO alignment assessment
    if (grant.proposal.daoAlignment && grant.proposal.daoAlignment.toLowerCase().includes('strongly')) {
      assessment.daoAlignment = 'strong';
    }

    // User reach assessment
    if (grant.proposal.potentialReach) {
      const reachText = grant.proposal.potentialReach.toLowerCase();
      if (reachText.includes('thousands') || reachText.includes('million')) {
        assessment.userReach = 'broad';
      } else if (reachText.includes('hundreds') || reachText.includes('100')) {
        assessment.userReach = 'medium';
      } else {
        assessment.userReach = 'narrow';
      }
    }

    return assessment;
  }

  /**
   * Helper: Get evaluation summary
   */
  getEvaluationSummary(result: EvaluationResult): string {
    const scoreEmoji = result.score >= 1 ? '✅' : result.score <= -1 ? '❌' : '⚠️';
    
    return `
${scoreEmoji} Impact Evaluation Summary
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
   * Helper: Compare with similar projects
   */
  async findSimilarProjects(grant: Grant): Promise<Array<{ name: string; similarity: string }>> {
    // This would typically call a more sophisticated API or database
    // For now, we return the comparable projects from the proposal
    if (!grant.proposal?.comparableProjects) {
      return [];
    }

    return grant.proposal.comparableProjects.map(name => ({
      name,
      similarity: 'Similar scope and objectives'
    }));
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
   * Helper: Calculate impact score based on assessment
   */
  calculateImpactScore(assessment: ImpactAssessment): number {
    let score = 0;

    // Ecosystem value (weight: 0.3)
    score += assessment.ecosystemValue === 'high' ? 0.6 : 
             assessment.ecosystemValue === 'medium' ? 0.3 : 0;

    // DAO alignment (weight: 0.25)
    score += assessment.daoAlignment === 'strong' ? 0.5 : 
             assessment.daoAlignment === 'moderate' ? 0.25 : 0;

    // User reach (weight: 0.25)
    score += assessment.userReach === 'broad' ? 0.5 : 
             assessment.userReach === 'medium' ? 0.25 : 0;

    // Innovation (weight: 0.2)
    score += assessment.innovation === 'groundbreaking' ? 0.4 : 
             assessment.innovation === 'incremental' ? 0.2 : 0;

    // Convert to -2 to +2 scale
    return Math.round((score * 4) - 2);
  }
}
