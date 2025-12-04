/**
 * Due Diligence Agent - Verifies team and project credibility
 * 
 * Responsibilities:
 * - Verify team member identities
 * - Analyze GitHub activity and code quality
 * - Check wallet history and reputation
 * - Validate previous projects and references
 * - Identify red flags
 * - Assess delivery risk
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
 * Due diligence analysis response from Python service
 */
interface DueDiligenceAnalysis {
  score: number;
  reasoning: string;
  team_verification: {
    verified_members: number;
    total_members: number;
    github_activity: string;
    reputation_score: number;
  };
  risk_flags: Array<{
    severity: 'high' | 'medium' | 'low';
    category: string;
    description: string;
  }>;
  confidence: number;
  concerns?: string[];
  recommendations?: string[];
}

/**
 * Risk severity levels
 */
export enum RiskSeverity {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none'
}

/**
 * Risk category types
 */
export enum RiskCategory {
  TEAM = 'team',
  TECHNICAL = 'technical',
  FINANCIAL = 'financial',
  LEGAL = 'legal',
  DELIVERY = 'delivery'
}

/**
 * Risk flag interface
 */
export interface RiskFlag {
  severity: RiskSeverity;
  category: RiskCategory;
  description: string;
  impact: string;
}

/**
 * Due Diligence Agent class
 */
export class DueDiligenceAgent extends BaseGrantAgent {
  private pythonClient: PythonServiceClient;

  constructor(config: AgentConfig) {
    super(config);

    // Initialize Python service client
    this.pythonClient = new PythonServiceClient({
      baseURL: config.pythonApiUrl,
      apiKey: config.pythonApiKey,
      timeout: 60000, // 60 seconds for DD analysis (may include GitHub API calls)
      retryConfig: {
        maxRetries: 3,
        initialDelayMs: 2000,
        backoffMultiplier: 2
      }
    });
  }

  /**
   * Evaluate grant for team credibility and project viability
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    console.log(`\n🔍 Due Diligence Agent - Evaluating grant ${grant.id}`);
    console.log(`   Project: ${grant.proposal?.projectName || 'Unknown'}`);

    // Validate proposal exists
    if (!grant.proposal) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Grant proposal not loaded'
      );
    }

    try {
      // Prepare team data for Python service
      const teamMembers = grant.proposal.teamMembers || [];
      const requestData = {
        grant_id: grant.id,
        team_members: teamMembers.map(member => ({
          name: member.name,
          github: member.github,
          wallet: member.wallet
        })),
        previous_projects: grant.proposal.previousProjects || [],
        references: grant.proposal.references || []
      };

      console.log('\n👥 Team composition:');
      console.log(`   - Team size: ${teamMembers.length} members`);
      teamMembers.forEach((member, idx) => {
        console.log(`   ${idx + 1}. ${member.name} (${member.role})`);
        if (member.github) console.log(`      GitHub: ${member.github}`);
      });

      if (grant.proposal.previousProjects && grant.proposal.previousProjects.length > 0) {
        console.log('\n📚 Previous projects:');
        grant.proposal.previousProjects.forEach(project => {
          console.log(`   - ${project}`);
        });
      }

      // Call Python service with retry logic
      console.log('\n📡 Requesting due diligence analysis from Python service...');
      const analysis = await this.pythonClient.analyzeDueDiligence(requestData);

      // Validate response
      this.validateAnalysisResponse(analysis);

      console.log(`✅ Analysis received - Score: ${analysis.score}, Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

      // Log team verification results
      if (analysis.team_verification) {
        console.log('\n✓ Team Verification:');
        console.log(`   - Verified members: ${analysis.team_verification.verified_members}/${analysis.team_verification.total_members}`);
        console.log(`   - GitHub activity: ${analysis.team_verification.github_activity}`);
        console.log(`   - Reputation score: ${analysis.team_verification.reputation_score}/100`);
      }

      // Log risk flags
      if (analysis.risk_flags && analysis.risk_flags.length > 0) {
        console.log('\n🚩 Risk Flags:');
        analysis.risk_flags.forEach((flag: any) => {
          const emoji = flag.severity === 'high' ? '🔴' : flag.severity === 'medium' ? '🟡' : '🟢';
          console.log(`   ${emoji} [${flag.severity.toUpperCase()}] ${flag.category}`);
          console.log(`      ${flag.description}`);
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
        `Due diligence evaluation failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Validate analysis response from Python service
   */
  private validateAnalysisResponse(analysis: any): asserts analysis is DueDiligenceAnalysis {
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

    // Validate team verification structure
    if (analysis.team_verification) {
      if (typeof analysis.team_verification.verified_members !== 'number' ||
          typeof analysis.team_verification.total_members !== 'number') {
        throw new AgentError(
          AgentErrorType.API_ERROR,
          'Invalid team verification data'
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

    // Check for minimum team information
    if (!grant.proposal.teamMembers || grant.proposal.teamMembers.length === 0) {
      issues.push('No team members specified');
    }

    // Check for verification information
    const teamMembers = grant.proposal.teamMembers || [];
    const membersWithGithub = teamMembers.filter(m => m.github).length;
    const membersWithWallet = teamMembers.filter(m => m.wallet).length;

    if (membersWithGithub === 0 && membersWithWallet === 0) {
      issues.push('No verifiable information for team members (GitHub or wallet)');
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
   * Helper: Assess overall risk level
   */
  assessOverallRisk(riskFlags: RiskFlag[]): RiskSeverity {
    if (riskFlags.length === 0) return RiskSeverity.NONE;

    const highRisks = riskFlags.filter(f => f.severity === RiskSeverity.HIGH);
    const mediumRisks = riskFlags.filter(f => f.severity === RiskSeverity.MEDIUM);

    if (highRisks.length > 0) return RiskSeverity.HIGH;
    if (mediumRisks.length >= 2) return RiskSeverity.HIGH;
    if (mediumRisks.length === 1) return RiskSeverity.MEDIUM;
    return RiskSeverity.LOW;
  }

  /**
   * Helper: Verify team member GitHub presence
   */
  async verifyGitHubPresence(githubUsername: string): Promise<boolean> {
    // In production, this would make actual GitHub API calls
    // For now, we just check if a username is provided
    return Boolean(githubUsername && githubUsername.length > 0);
  }

  /**
   * Helper: Verify wallet address format
   */
  verifyWalletAddress(address: string): boolean {
    // Basic Ethereum address validation (0x + 40 hex characters)
    const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return ethAddressRegex.test(address);
  }

  /**
   * Helper: Calculate team credibility score
   */
  calculateTeamCredibilityScore(grant: Grant): number {
    if (!grant.proposal) return 0;

    let score = 0;
    const teamMembers = grant.proposal.teamMembers || [];

    // Team size (max 20 points)
    score += Math.min(teamMembers.length * 5, 20);

    // GitHub presence (max 30 points)
    const membersWithGithub = teamMembers.filter(m => m.github).length;
    score += Math.min(membersWithGithub * 10, 30);

    // Wallet verification (max 20 points)
    const membersWithWallet = teamMembers.filter(m => m.wallet && this.verifyWalletAddress(m.wallet)).length;
    score += Math.min(membersWithWallet * 10, 20);

    // Previous projects (max 20 points)
    const previousProjects = grant.proposal.previousProjects || [];
    score += Math.min(previousProjects.length * 5, 20);

    // References (max 10 points)
    const references = grant.proposal.references || [];
    score += Math.min(references.length * 5, 10);

    return score; // Out of 100
  }

  /**
   * Helper: Get evaluation summary
   */
  getEvaluationSummary(result: EvaluationResult): string {
    const scoreEmoji = result.score >= 1 ? '✅' : result.score <= -1 ? '❌' : '⚠️';
    
    return `
${scoreEmoji} Due Diligence Evaluation Summary
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
   * Helper: Identify red flags from analysis
   */
  identifyRedFlags(analysis: DueDiligenceAnalysis): RiskFlag[] {
    const redFlags: RiskFlag[] = [];

    // Convert risk flags from analysis to RiskFlag objects
    if (analysis.risk_flags) {
      analysis.risk_flags.forEach(flag => {
        redFlags.push({
          severity: flag.severity as RiskSeverity,
          category: flag.category as RiskCategory,
          description: flag.description,
          impact: this.calculateFlagImpact(flag.severity)
        });
      });
    }

    // Add additional red flags based on team verification
    if (analysis.team_verification) {
      const verificationRate = analysis.team_verification.verified_members / analysis.team_verification.total_members;
      
      if (verificationRate < 0.5) {
        redFlags.push({
          severity: RiskSeverity.HIGH,
          category: RiskCategory.TEAM,
          description: 'Less than 50% of team members verified',
          impact: 'High risk of anonymity or fake team members'
        });
      }

      if (analysis.team_verification.reputation_score < 30) {
        redFlags.push({
          severity: RiskSeverity.MEDIUM,
          category: RiskCategory.TEAM,
          description: 'Low team reputation score',
          impact: 'Limited track record or community trust'
        });
      }
    }

    return redFlags;
  }

  /**
   * Helper: Calculate impact description for flag severity
   */
  private calculateFlagImpact(severity: string): string {
    switch (severity) {
      case 'high':
        return 'Critical risk requiring immediate attention';
      case 'medium':
        return 'Moderate risk that should be addressed';
      case 'low':
        return 'Minor concern worth monitoring';
      default:
        return 'Unknown impact level';
    }
  }

  /**
   * Helper: Get risk summary
   */
  getRiskSummary(riskFlags: RiskFlag[]): string {
    if (riskFlags.length === 0) {
      return '✅ No significant risks identified';
    }

    const highRisks = riskFlags.filter(f => f.severity === RiskSeverity.HIGH);
    const mediumRisks = riskFlags.filter(f => f.severity === RiskSeverity.MEDIUM);
    const lowRisks = riskFlags.filter(f => f.severity === RiskSeverity.LOW);

    return `
Risk Summary:
  🔴 High Risk: ${highRisks.length}
  🟡 Medium Risk: ${mediumRisks.length}
  🟢 Low Risk: ${lowRisks.length}
  
Overall Risk Level: ${this.assessOverallRisk(riskFlags)}
`;
  }
}
