/**
 * Data Store - In-memory storage for grants and evaluations
 * In production, this would be replaced with database queries
 */

import { Grant, Evaluation, GrantStatus, VotingResult, AgentType } from './types.js';

export class DataStore {
  private grants: Map<number, Grant> = new Map();
  private evaluations: Map<number, Evaluation[]> = new Map(); // grant_id -> evaluations
  private votingResults: Map<number, VotingResult> = new Map(); // grant_id -> result
  private nextGrantId: number = 1;
  private nextEvaluationId: number = 1;

  /**
   * Create a new grant
   */
  createGrant(grant: Omit<Grant, 'id' | 'status' | 'created_at'>): Grant {
    const newGrant: Grant = {
      ...grant,
      id: this.nextGrantId++,
      status: GrantStatus.PENDING,
      created_at: new Date().toISOString(),
    };

    this.grants.set(newGrant.id, newGrant);
    return newGrant;
  }

  /**
   * Get grant by ID
   */
  getGrant(grantId: number): Grant | undefined {
    return this.grants.get(grantId);
  }

  /**
   * Get all grants
   */
  getAllGrants(): Grant[] {
    return Array.from(this.grants.values());
  }

  /**
   * Get grants by status
   */
  getGrantsByStatus(status: GrantStatus): Grant[] {
    return Array.from(this.grants.values()).filter(g => g.status === status);
  }

  /**
   * Update grant status
   */
  updateGrantStatus(grantId: number, status: GrantStatus): boolean {
    const grant = this.grants.get(grantId);
    if (grant) {
      grant.status = status;
      grant.updated_at = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Add evaluation for a grant
   */
  addEvaluation(evaluation: Omit<Evaluation, 'id' | 'created_at'>): Evaluation {
    const newEvaluation: Evaluation = {
      ...evaluation,
      id: this.nextEvaluationId++,
      created_at: new Date().toISOString(),
    };

    const grantEvaluations = this.evaluations.get(evaluation.grant_id) || [];
    grantEvaluations.push(newEvaluation);
    this.evaluations.set(evaluation.grant_id, grantEvaluations);

    return newEvaluation;
  }

  /**
   * Get evaluations for a grant
   */
  getEvaluations(grantId: number): Evaluation[] {
    return this.evaluations.get(grantId) || [];
  }

  /**
   * Get all evaluations
   */
  getAllEvaluations(): Evaluation[] {
    return Array.from(this.evaluations.values()).flat();
  }

  /**
   * Get recent evaluations
   */
  getRecentEvaluations(limit: number = 10): Evaluation[] {
    const allEvaluations = this.getAllEvaluations();
    return allEvaluations
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  /**
   * Check if grant has evaluation from specific agent
   */
  hasEvaluation(grantId: number, agentType: AgentType): boolean {
    const evaluations = this.getEvaluations(grantId);
    return evaluations.some(e => e.agent_type === agentType);
  }

  /**
   * Get evaluation by agent type for a grant
   */
  getEvaluationByAgent(grantId: number, agentType: AgentType): Evaluation | undefined {
    const evaluations = this.getEvaluations(grantId);
    return evaluations.find(e => e.agent_type === agentType);
  }

  /**
   * Create or update voting result
   */
  updateVotingResult(grantId: number, result: VotingResult): void {
    this.votingResults.set(grantId, result);
  }

  /**
   * Get voting result for a grant
   */
  getVotingResult(grantId: number): VotingResult | undefined {
    return this.votingResults.get(grantId);
  }

  /**
   * Calculate voting result from evaluations
   */
  calculateVotingResult(grantId: number): VotingResult {
    const evaluations = this.getEvaluations(grantId);
    const votes = evaluations.map(e => ({
      agent_type: e.agent_type,
      score: e.score,
      timestamp: e.created_at,
    }));

    const totalScore = votes.reduce((sum, vote) => sum + vote.score, 0);
    const averageScore = votes.length > 0 ? totalScore / votes.length : 0;

    // Count approvals (score >= 70)
    const approvalCount = votes.filter(v => v.score >= 70).length;

    const result: VotingResult = {
      grant_id: grantId,
      total_score: totalScore,
      votes,
      finalized: false,
      approved: approvalCount >= 3 && averageScore >= 50, // 3/5 approvals AND avg >= 50%
    };

    this.updateVotingResult(grantId, result);
    return result;
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.grants.clear();
    this.evaluations.clear();
    this.votingResults.clear();
    this.nextGrantId = 1;
    this.nextEvaluationId = 1;
  }
}
