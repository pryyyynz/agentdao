/**
 * Budget Agent - Analyzes budget and milestones for grants
 * 
 * Responsibilities:
 * - Analyze budget breakdown and cost reasonableness
 * - Compare costs against market rates
 * - Generate milestone proposals
 * - Validate funding distribution
 * - Assess financial risk
 * - Propose payment schedules
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
 * Budget analysis response from Python service
 */
interface BudgetAnalysis {
  score: number;
  reasoning: string;
  cost_breakdown: {
    category: string;
    amount: number;
    justification: string;
    market_comparison: string;
  }[];
  total_cost: number;
  cost_efficiency: number;
  confidence: number;
  concerns?: string[];
  recommendations?: string[];
}

/**
 * Milestone generation response from Python service
 */
interface MilestoneProposal {
  milestones: {
    number: number;
    title: string;
    deliverable: string;
    amount: number;
    deadline_days: number;
    payment_type: 'upfront' | 'on_completion';
  }[];
  total_amount: number;
  reasoning: string;
}

/**
 * Budget assessment categories
 */
export interface BudgetAssessment {
  totalCost: number;
  costEfficiency: 'high' | 'medium' | 'low';
  marketAlignment: 'above' | 'at' | 'below';
  milestoneStructure: 'optimal' | 'acceptable' | 'poor';
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Budget Agent class
 */
export class BudgetAgent extends BaseGrantAgent {
  private pythonClient: PythonServiceClient;

  constructor(config: AgentConfig) {
    super(config);

    // Initialize Python service client
    this.pythonClient = new PythonServiceClient({
      baseURL: config.pythonApiUrl,
      apiKey: config.pythonApiKey,
      timeout: 45000, // 45 seconds for budget analysis
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2
      }
    });
  }

  /**
   * Evaluate grant budget and propose milestones
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    console.log(`\n💰 Budget Agent - Evaluating grant ${grant.id}`);
    console.log(`   Project: ${grant.proposal?.projectName || 'Unknown'}`);

    // Validate proposal exists
    if (!grant.proposal) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Grant proposal not loaded'
      );
    }

    try {
      // Prepare budget data for Python service
      const budgetBreakdown = grant.proposal.budgetBreakdown || {};
      const requestedAmount = parseFloat(grant.amount);

      const requestData = {
        grant_id: grant.id,
        project_name: grant.proposal.projectName,
        description: grant.proposal.description,
        requested_amount: requestedAmount,
        budget_breakdown: budgetBreakdown,
        project_duration: grant.proposal.timeline || '6 months',
        team_size: grant.proposal.teamMembers?.length || 1
      };

      console.log('\n💵 Budget details:');
      console.log(`   - Requested amount: ${requestedAmount} wei`);
      console.log(`   - Budget categories: ${Object.keys(budgetBreakdown).length}`);
      console.log(`   - Project duration: ${requestData.project_duration}`);
      console.log(`   - Team size: ${requestData.team_size}`);

      // Analyze budget
      console.log('\n📡 Requesting budget analysis from Python service...');
      const analysis = await this.pythonClient.analyzeBudget(requestData);

      // Validate response
      this.validateAnalysisResponse(analysis);

      console.log(`✅ Analysis received - Score: ${analysis.score}, Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      // Log cost breakdown
      if (analysis.cost_breakdown && analysis.cost_breakdown.length > 0) {
        console.log('\n📊 Cost Breakdown:');
        analysis.cost_breakdown.forEach((item: any) => {
          console.log(`   • ${item.category}: ${item.amount} wei`);
          console.log(`     Justification: ${item.justification}`);
          console.log(`     Market: ${item.market_comparison}`);
        });
      }

      console.log(`\n💹 Cost efficiency: ${(analysis.cost_efficiency * 100).toFixed(1)}%`);

      // Generate milestone proposal
      console.log('\n📅 Generating milestone proposal...');
      const milestoneProposal = await this.generateMilestones(grant, analysis);

      if (milestoneProposal) {
        console.log(`✅ Generated ${milestoneProposal.milestones.length} milestones`);
        milestoneProposal.milestones.forEach((m: any) => {
          console.log(`   ${m.number}. ${m.title} - ${m.amount} wei (${m.payment_type})`);
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
        `Budget evaluation failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Generate milestone proposal for grant
   */
  async generateMilestones(grant: Grant, budgetAnalysis: BudgetAnalysis): Promise<MilestoneProposal | null> {
    if (!grant.proposal) return null;

    try {
      const requestData = {
        grant_id: grant.id,
        project_name: grant.proposal.projectName,
        description: grant.proposal.description,
        total_amount: parseFloat(grant.amount),
        project_duration: grant.proposal.timeline || '6 months',
        deliverables: [],
        budget_breakdown: budgetAnalysis.cost_breakdown
      };

      const proposal = await this.pythonClient.generateMilestones(requestData);

      // Validate milestone proposal
      if (!proposal.milestones || proposal.milestones.length === 0) {
        console.warn('⚠️  No milestones generated');
        return null;
      }

      return proposal;
    } catch (error) {
      console.error('❌ Failed to generate milestones:', error);
      return null;
    }
  }

  /**
   * Validate analysis response from Python service
   */
  private validateAnalysisResponse(analysis: any): asserts analysis is BudgetAnalysis {
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

    if (typeof analysis.cost_efficiency !== 'number' || analysis.cost_efficiency < 0 || analysis.cost_efficiency > 1) {
      throw new AgentError(
        AgentErrorType.API_ERROR,
        'Invalid analysis response: invalid cost efficiency value'
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

    // Check for budget information
    if (!grant.amount || parseFloat(grant.amount) <= 0) {
      issues.push('Requested amount is invalid or zero');
    }

    const budgetBreakdown = grant.proposal.budgetBreakdown;
    if (!budgetBreakdown || Object.keys(budgetBreakdown).length === 0) {
      issues.push('Budget breakdown not provided');
    }

    // Check for project duration
    if (!grant.proposal.timeline) {
      issues.push('Project duration not specified');
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
   * Helper: Assess budget in different dimensions
   */
  assessBudget(grant: Grant, analysis: BudgetAnalysis): BudgetAssessment | null {
    if (!grant.proposal) return null;

    const assessment: BudgetAssessment = {
      totalCost: analysis.total_cost,
      costEfficiency: analysis.cost_efficiency >= 0.7 ? 'high' : 
                     analysis.cost_efficiency >= 0.4 ? 'medium' : 'low',
      marketAlignment: 'at', // Would be determined by Python service
      milestoneStructure: 'acceptable',
      riskLevel: 'medium'
    };

    // Assess risk based on cost efficiency and concerns
    if (analysis.cost_efficiency < 0.3 || (analysis.concerns && analysis.concerns.length >= 3)) {
      assessment.riskLevel = 'high';
    } else if (analysis.cost_efficiency >= 0.7 && (!analysis.concerns || analysis.concerns.length === 0)) {
      assessment.riskLevel = 'low';
    }

    return assessment;
  }

  /**
   * Helper: Calculate cost per milestone
   */
  calculateMilestoneCosts(totalAmount: number, milestoneCount: number): number[] {
    // Simple equal distribution - in production would be more sophisticated
    const baseAmount = totalAmount / milestoneCount;
    const costs: number[] = [];

    for (let i = 0; i < milestoneCount; i++) {
      costs.push(baseAmount);
    }

    return costs;
  }

  /**
   * Helper: Validate budget breakdown totals
   */
  validateBudgetBreakdown(budgetBreakdown: Record<string, number>, requestedAmount: number): {
    valid: boolean;
    difference: number;
  } {
    const total = Object.values(budgetBreakdown).reduce((sum, val) => sum + val, 0);
    const difference = Math.abs(total - requestedAmount);
    const tolerance = requestedAmount * 0.01; // 1% tolerance

    return {
      valid: difference <= tolerance,
      difference
    };
  }

  /**
   * Helper: Get evaluation summary
   */
  getEvaluationSummary(result: EvaluationResult): string {
    const scoreEmoji = result.score >= 1 ? '✅' : result.score <= -1 ? '❌' : '⚠️';
    
    return `
${scoreEmoji} Budget Evaluation Summary
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
   * Helper: Format budget amount for display
   */
  formatBudgetAmount(amount: number, unit: string = 'wei'): string {
    if (unit === 'eth' && amount > 0) {
      return `${(amount / 1e18).toFixed(4)} ETH`;
    }
    return `${amount.toLocaleString()} ${unit}`;
  }

  /**
   * Helper: Calculate budget efficiency score
   */
  calculateEfficiencyScore(budgetBreakdown: Record<string, number>, totalAmount: number): number {
    // Simple efficiency calculation based on category distribution
    const categories = Object.keys(budgetBreakdown);
    
    if (categories.length === 0) return 0;

    // Penalize if too concentrated in one category
    const maxCategoryPercent = Math.max(...Object.values(budgetBreakdown)) / totalAmount;
    
    if (maxCategoryPercent > 0.7) return 0.3; // Too concentrated
    if (maxCategoryPercent > 0.5) return 0.6; // Moderately concentrated
    
    return 0.9; // Well distributed
  }
}
