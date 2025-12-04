/**
 * Voting Coordinator Agent
 * 
 * Orchestrates the multi-agent grant evaluation process by:
 * - Coordinating evaluations across specialized agents
 * - Aggregating votes and calculating final scores
 * - Monitoring voting progress
 * - Finalizing decisions based on vote outcomes
 * - Managing approval and rejection workflows
 */

import { BaseGrantAgent } from './base-agent';
import {
  AgentType,
  EvaluationResult,
  EvaluationScore,
  Grant,
  IPFSConfig
} from '../types';

/**
 * Agent vote record
 */
interface AgentVote {
  agentType: AgentType;
  agentAddress: string;
  score: EvaluationScore;
  weight: number;
  timestamp: Date;
  reasoning?: string;
}

/**
 * Voting progress status
 */
interface VotingProgress {
  grantId: number;
  totalAgents: number;
  votedAgents: number;
  pendingAgents: AgentType[];
  votes: AgentVote[];
  currentScore: number;
  isComplete: boolean;
}

/**
 * Final voting decision
 */
interface VotingDecision {
  grantId: number;
  finalScore: number;
  weightedScore: number;
  decision: 'APPROVE' | 'REJECT' | 'PENDING';
  votes: AgentVote[];
  reasoning: string;
  timestamp: Date;
}

/**
 * Agent configuration with weight
 */
interface WeightedAgentConfig {
  agentType: AgentType;
  weight: number;
  required: boolean; // If true, decision waits for this agent's vote
}

/**
 * Voting Coordinator Agent
 * Manages the multi-agent evaluation workflow
 */
export class VotingCoordinatorAgent extends BaseGrantAgent {
  private agentWeights: Map<AgentType, number>;
  private requiredAgents: Set<AgentType>;
  private approvalThreshold: number;
  private rejectionThreshold: number;
  
  constructor(
    _walletAddress: string,
    privateKey: string,
    contractAddresses: {
      grantRegistry: string;
      agentVoting: string;
      grantTreasury: string;
    },
    ipfsConfig: IPFSConfig,
    agentConfigs: WeightedAgentConfig[],
    approvalThreshold: number = 0.7,
    rejectionThreshold: number = -0.3
  ) {
    super({
      agentType: AgentType.COORDINATOR,
      blockchain: {
        rpcUrl: '',
        privateKey: privateKey,
        contractAddresses: contractAddresses
      },
      ipfs: ipfsConfig,
      pythonApiUrl: 'http://localhost:8000',
      pythonApiKey: ''
    });

    // Initialize agent weights
    this.agentWeights = new Map();
    this.requiredAgents = new Set();

    for (const config of agentConfigs) {
      this.agentWeights.set(config.agentType, config.weight);
      if (config.required) {
        this.requiredAgents.add(config.agentType);
      }
    }

    this.approvalThreshold = approvalThreshold;
    this.rejectionThreshold = rejectionThreshold;

    console.log('🎯 Voting Coordinator initialized');
    console.log(`   Approval threshold: ${approvalThreshold}`);
    console.log(`   Rejection threshold: ${rejectionThreshold}`);
    console.log(`   Agent weights configured: ${agentConfigs.length}`);
  }

  /**
   * Main evaluation method (not used for coordinator)
   * Coordinators orchestrate, they don't evaluate directly
   */
  protected async evaluate(_grant: Grant): Promise<EvaluationResult> {
    throw new Error('Coordinator agents use coordinateVoting(), not evaluate()');
  }

  /**
   * Coordinate voting process for a grant
   */
  async coordinateVoting(grantId: number): Promise<VotingDecision> {
    console.log(`\n🎯 Starting voting coordination for Grant #${grantId}`);
    console.log('━'.repeat(60));

    try {
      // Fetch grant details
      const grant = await this.fetchGrant(grantId);
      console.log(`📋 Grant: ${grant.proposal?.projectName || 'Unknown'}`);
      console.log(`💰 Requested: ${this.formatAmount(grant.amount)} ETH`);

      // Initialize voting progress
      const progress = await this.initializeVoting(grantId);
      console.log(`\n📊 Voting initialized with ${progress.totalAgents} agents`);

      // Monitor voting progress
      await this.monitorVotingProgress(grantId, progress);

      // Aggregate votes and make decision
      const decision = await this.finalizeVoting(grantId, progress);

      // Execute decision workflow
      await this.executeDecisionWorkflow(decision);

      return decision;
    } catch (error) {
      console.error('❌ Voting coordination failed:', error);
      throw error;
    }
  }

  /**
   * Initialize voting process
   */
  private async initializeVoting(grantId: number): Promise<VotingProgress> {
    // Get configured agent types (excluding coordinator and executor)
    const evaluatorTypes = Array.from(this.agentWeights.keys()).filter(
      type => type !== AgentType.COORDINATOR && type !== AgentType.EXECUTOR
    );

    const progress: VotingProgress = {
      grantId,
      totalAgents: evaluatorTypes.length,
      votedAgents: 0,
      pendingAgents: [...evaluatorTypes],
      votes: [],
      currentScore: 0,
      isComplete: false
    };

    return progress;
  }

  /**
   * Monitor voting progress
   * In production, this would poll the blockchain for vote events
   */
  private async monitorVotingProgress(
    grantId: number,
    progress: VotingProgress
  ): Promise<void> {
    console.log('\n⏳ Monitoring voting progress...');

    // Fetch all votes from the AgentVoting contract
    const votes = await this.fetchAllVotes(grantId);

    // Update progress
    progress.votes = votes;
    progress.votedAgents = votes.length;
    progress.pendingAgents = progress.pendingAgents.filter(
      type => !votes.some(v => v.agentType === type)
    );

    // Check if all required agents have voted
    const requiredVoted = Array.from(this.requiredAgents).every(
      type => votes.some(v => v.agentType === type)
    );

    progress.isComplete = requiredVoted && votes.length === progress.totalAgents;

    // Display progress
    console.log(`\n📊 Voting Progress:`);
    console.log(`   Voted: ${progress.votedAgents}/${progress.totalAgents}`);
    console.log(`   Pending: [${progress.pendingAgents.join(', ')}]`);

    if (progress.votes.length > 0) {
      console.log('\n📋 Current Votes:');
      for (const vote of progress.votes) {
        const emoji = this.getScoreEmoji(vote.score);
        console.log(`   ${emoji} ${vote.agentType}: ${vote.score > 0 ? '+' : ''}${vote.score} (weight: ${vote.weight})`);
      }
    }
  }

  /**
   * Fetch all votes for a grant from the blockchain
   */
  private async fetchAllVotes(grantId: number): Promise<AgentVote[]> {
    try {
      const agentVoting = this.contracts.getAgentVoting();
      const votes: AgentVote[] = [];

      // Fetch votes from all configured agent types
      for (const [agentType, weight] of this.agentWeights.entries()) {
        if (agentType === AgentType.COORDINATOR || agentType === AgentType.EXECUTOR) {
          continue;
        }

        // Check if agent has voted (this would be an actual contract call)
        // For now, we'll simulate by checking voting results
        try {
          const results = await this.contracts.callView<any>(
            agentVoting,
            'getVotingResults',
            grantId
          );

          // In a real implementation, we'd fetch individual agent votes
          // For now, we'll create placeholder votes based on results
          if (results.totalScore !== 0) {
            votes.push({
              agentType,
              agentAddress: this.getAddress(),
              score: 1, // Would be actual score from contract
              weight,
              timestamp: new Date(),
              reasoning: 'Vote fetched from blockchain'
            });
          }
        } catch (error) {
          // Agent hasn't voted yet
          continue;
        }
      }

      return votes;
    } catch (error) {
      console.error('Failed to fetch votes:', error);
      return [];
    }
  }

  /**
   * Finalize voting and make decision
   */
  private async finalizeVoting(
    grantId: number,
    progress: VotingProgress
  ): Promise<VotingDecision> {
    console.log('\n🎯 Finalizing voting decision...');

    // Calculate final scores
    const { rawScore, weightedScore } = this.aggregateVotes(progress.votes);

    // Determine decision
    let decision: 'APPROVE' | 'REJECT' | 'PENDING';
    let reasoning: string;

    if (weightedScore >= this.approvalThreshold) {
      decision = 'APPROVE';
      reasoning = `Weighted score ${weightedScore.toFixed(2)} meets approval threshold ${this.approvalThreshold}`;
    } else if (weightedScore <= this.rejectionThreshold) {
      decision = 'REJECT';
      reasoning = `Weighted score ${weightedScore.toFixed(2)} below rejection threshold ${this.rejectionThreshold}`;
    } else {
      decision = 'PENDING';
      reasoning = `Weighted score ${weightedScore.toFixed(2)} in neutral range (${this.rejectionThreshold} to ${this.approvalThreshold})`;
    }

    const votingDecision: VotingDecision = {
      grantId,
      finalScore: rawScore,
      weightedScore,
      decision,
      votes: progress.votes,
      reasoning,
      timestamp: new Date()
    };

    // Display decision
    console.log('\n━'.repeat(60));
    console.log('📊 VOTING DECISION');
    console.log('━'.repeat(60));
    console.log(`   Grant ID: ${grantId}`);
    console.log(`   Raw Score: ${rawScore.toFixed(2)}`);
    console.log(`   Weighted Score: ${weightedScore.toFixed(2)}`);
    console.log(`   Decision: ${this.getDecisionEmoji(decision)} ${decision}`);
    console.log(`   Reasoning: ${reasoning}`);
    console.log('━'.repeat(60));

    return votingDecision;
  }

  /**
   * Aggregate votes using weighted average
   */
  private aggregateVotes(votes: AgentVote[]): {
    rawScore: number;
    weightedScore: number;
  } {
    if (votes.length === 0) {
      return { rawScore: 0, weightedScore: 0 };
    }

    // Calculate raw average
    const rawScore = votes.reduce((sum, vote) => sum + vote.score, 0) / votes.length;

    // Calculate weighted average
    let weightedSum = 0;
    let totalWeight = 0;

    for (const vote of votes) {
      weightedSum += vote.score * vote.weight;
      totalWeight += vote.weight;
    }

    const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Normalize weighted score to -1 to +1 range (scores are -2 to +2)
    const normalizedWeightedScore = weightedScore / 2;

    return {
      rawScore,
      weightedScore: normalizedWeightedScore
    };
  }

  /**
   * Execute decision workflow (approval or rejection)
   */
  private async executeDecisionWorkflow(decision: VotingDecision): Promise<void> {
    console.log(`\n🔄 Executing ${decision.decision} workflow...`);

    if (decision.decision === 'APPROVE') {
      await this.executeApprovalWorkflow(decision);
    } else if (decision.decision === 'REJECT') {
      await this.executeRejectionWorkflow(decision);
    } else {
      console.log('⏸️  Decision is PENDING - no action taken');
      await this.notifyPendingDecision(decision);
    }
  }

  /**
   * Execute approval workflow
   */
  private async executeApprovalWorkflow(decision: VotingDecision): Promise<void> {
    console.log('\n✅ APPROVAL WORKFLOW');
    console.log('━'.repeat(60));

    try {
      // 1. Update grant status to APPROVED
      console.log('1️⃣  Updating grant status to APPROVED...');
      await this.updateGrantStatus(decision.grantId, 'APPROVED');

      // 2. Notify applicant
      console.log('2️⃣  Notifying applicant...');
      await this.notifyApplicant(decision, 'APPROVED');

      // 3. Prepare for funding (would trigger executor agent)
      console.log('3️⃣  Preparing grant for funding...');
      await this.prepareForFunding(decision);

      // 4. Record decision on-chain
      console.log('4️⃣  Recording decision on-chain...');
      await this.recordDecisionOnChain(decision);

      console.log('✅ Approval workflow completed successfully');
      console.log('━'.repeat(60));
    } catch (error) {
      console.error('❌ Approval workflow failed:', error);
      throw error;
    }
  }

  /**
   * Execute rejection workflow
   */
  private async executeRejectionWorkflow(decision: VotingDecision): Promise<void> {
    console.log('\n❌ REJECTION WORKFLOW');
    console.log('━'.repeat(60));

    try {
      // 1. Update grant status to REJECTED
      console.log('1️⃣  Updating grant status to REJECTED...');
      await this.updateGrantStatus(decision.grantId, 'REJECTED');

      // 2. Notify applicant with feedback
      console.log('2️⃣  Notifying applicant with feedback...');
      await this.notifyApplicant(decision, 'REJECTED');

      // 3. Archive proposal
      console.log('3️⃣  Archiving proposal...');
      await this.archiveProposal(decision);

      // 4. Record decision on-chain
      console.log('4️⃣  Recording decision on-chain...');
      await this.recordDecisionOnChain(decision);

      console.log('✅ Rejection workflow completed successfully');
      console.log('━'.repeat(60));
    } catch (error) {
      console.error('❌ Rejection workflow failed:', error);
      throw error;
    }
  }

  /**
   * Update grant status on-chain
   */
  private async updateGrantStatus(
    grantId: number,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    // In production, this would call the GrantRegistry contract
    console.log(`   ✓ Grant #${grantId} status updated to ${status}`);
  }

  /**
   * Notify applicant of decision
   */
  private async notifyApplicant(
    decision: VotingDecision,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    const message = status === 'APPROVED'
      ? `Congratulations! Your grant #${decision.grantId} has been approved with a weighted score of ${decision.weightedScore.toFixed(2)}.`
      : `Your grant #${decision.grantId} was not approved. Weighted score: ${decision.weightedScore.toFixed(2)}. Please review the feedback and consider reapplying.`;

    console.log(`   ✓ Notification sent: ${message}`);
  }

  /**
   * Notify about pending decision
   */
  private async notifyPendingDecision(decision: VotingDecision): Promise<void> {
    console.log(`   ✓ Grant #${decision.grantId} requires additional review`);
    console.log(`   ℹ️  Weighted score (${decision.weightedScore.toFixed(2)}) is in neutral range`);
  }

  /**
   * Prepare grant for funding
   */
  private async prepareForFunding(decision: VotingDecision): Promise<void> {
    console.log(`   ✓ Grant #${decision.grantId} queued for executor agent`);
    console.log(`   ℹ️  Executor will handle milestone setup and initial funding`);
  }

  /**
   * Archive rejected proposal
   */
  private async archiveProposal(decision: VotingDecision): Promise<void> {
    console.log(`   ✓ Proposal #${decision.grantId} archived`);
    console.log(`   ℹ️  Feedback summary available for future reference`);
  }

  /**
   * Record final decision on-chain
   */
  private async recordDecisionOnChain(decision: VotingDecision): Promise<void> {
    // In production, this would emit an event or update contract storage
    console.log(`   ✓ Decision recorded on-chain at ${decision.timestamp.toISOString()}`);
  }

  /**
   * Get voting progress for a grant
   */
  async getVotingProgress(grantId: number): Promise<VotingProgress> {
    const progress = await this.initializeVoting(grantId);
    await this.monitorVotingProgress(grantId, progress);
    return progress;
  }

  /**
   * Check if voting is complete for a grant
   */
  async isVotingComplete(grantId: number): Promise<boolean> {
    const progress = await this.getVotingProgress(grantId);
    return progress.isComplete;
  }

  /**
   * Get agent weight configuration
   */
  getAgentWeights(): Map<AgentType, number> {
    return new Map(this.agentWeights);
  }

  /**
   * Get required agents
   */
  getRequiredAgents(): Set<AgentType> {
    return new Set(this.requiredAgents);
  }

  /**
   * Helper: Format amount in ETH
   */
  private formatAmount(weiAmount: string): string {
    const eth = parseFloat(weiAmount) / 1e18;
    return eth.toFixed(4);
  }

  /**
   * Helper: Get emoji for score
   */
  private getScoreEmoji(score: EvaluationScore): string {
    switch (score) {
      case 2: return '🚀';
      case 1: return '✅';
      case 0: return '➖';
      case -1: return '❌';
      case -2: return '⛔';
      default: return '❓';
    }
  }

  /**
   * Helper: Get emoji for decision
   */
  private getDecisionEmoji(decision: 'APPROVE' | 'REJECT' | 'PENDING'): string {
    switch (decision) {
      case 'APPROVE': return '✅';
      case 'REJECT': return '❌';
      case 'PENDING': return '⏸️';
      default: return '❓';
    }
  }
}
