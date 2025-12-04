/**
 * Technical Review Agent - Evaluates technical feasibility of grants
 * 
 * Responsibilities:
 * - Analyze technical architecture
 * - Evaluate tech stack choices
 * - Assess team technical capabilities
 * - Review GitHub repositories
 * - Check timeline feasibility
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
 * Technical analysis response from Python service
 */
interface TechnicalAnalysis {
  score: number;
  reasoning: string;
  concerns?: string[];
  recommendations?: string[];
  confidence: number;
}

/**
 * Technical Review Agent class
 */
export class TechnicalAgent extends BaseGrantAgent {
  private pythonClient: PythonServiceClient;

  constructor(config: AgentConfig) {
    super(config);

    // Initialize Python service client
    this.pythonClient = new PythonServiceClient({
      baseURL: config.pythonApiUrl,
      apiKey: config.pythonApiKey,
      timeout: 45000, // 45 seconds for technical analysis
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2
      }
    });
  }

  /**
   * Evaluate grant for technical feasibility
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    console.log(`\n🔧 Technical Agent - Evaluating grant ${grant.id}`);
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
        tech_stack: grant.proposal.techStack,
        architecture: grant.proposal.architecture,
        timeline: grant.proposal.timeline,
        team_experience: grant.proposal.teamExperience,
        github_repos: grant.proposal.githubRepos
      };

      console.log('\n📊 Technical evaluation criteria:');
      console.log(`   - Tech Stack: ${grant.proposal.techStack?.join(', ') || 'Not specified'}`);
      console.log(`   - Architecture: ${grant.proposal.architecture ? 'Provided' : 'Not provided'}`);
      console.log(`   - Timeline: ${grant.proposal.timeline || 'Not specified'}`);
      console.log(`   - GitHub Repos: ${grant.proposal.githubRepos?.length || 0}`);
      console.log(`   - Team Experience: ${grant.proposal.teamExperience ? 'Provided' : 'Not provided'}`);

      // Call Python service with retry logic
      console.log('\n📡 Requesting technical analysis from Python service...');
      const analysis = await this.pythonClient.analyzeTechnical(requestData);

      // Validate response
      this.validateAnalysisResponse(analysis);

      console.log(`✅ Analysis received - Score: ${analysis.score}, Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

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
        `Technical evaluation failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Validate analysis response from Python service
   */
  private validateAnalysisResponse(analysis: any): asserts analysis is TechnicalAnalysis {
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
    // Python service should return -2 to +2, but we'll validate and clamp
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

    if (!grant.proposal.techStack || grant.proposal.techStack.length === 0) {
      issues.push('Tech stack not specified');
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
   * Helper: Get evaluation summary
   */
  getEvaluationSummary(result: EvaluationResult): string {
    const scoreEmoji = result.score >= 1 ? '✅' : result.score <= -1 ? '❌' : '⚠️';
    
    return `
${scoreEmoji} Technical Evaluation Summary
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
}
