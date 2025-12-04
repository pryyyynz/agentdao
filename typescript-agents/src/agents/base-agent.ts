/**
 * Base agent class for all grant evaluation agents
 */

import { BlockchainConnection } from '../utils/blockchain';
import { ContractManager } from '../utils/contracts';
import { IPFSClient, fetchGrantWithProposal } from '../utils/ipfs';
import {
  AgentConfig,
  AgentType,
  EvaluationResult,
  EvaluationScore,
  Grant,
  GrantStatus,
  AgentError,
  AgentErrorType
} from '../types';

/**
 * Abstract base class for all grant evaluation agents
 */
export abstract class BaseGrantAgent {
  protected config: AgentConfig;
  protected blockchain: BlockchainConnection;
  protected contracts: ContractManager;
  protected ipfs: IPFSClient;
  protected agentType: AgentType;

  constructor(config: AgentConfig) {
    this.config = config;
    this.agentType = config.agentType;
    
    // Initialize connections
    this.blockchain = new BlockchainConnection(config.blockchain);
    this.contracts = new ContractManager(this.blockchain);
    this.ipfs = new IPFSClient(config.ipfs);
    
    console.log(`🤖 ${this.agentType} agent initialized - Address: ${this.blockchain.getAddress()}`);
  }

  /**
   * Get agent type
   */
  getAgentType(): AgentType {
    return this.agentType;
  }

  /**
   * Get agent wallet address
   */
  getAddress(): string {
    return this.blockchain.getAddress();
  }

  /**
   * Fetch grant details from blockchain
   */
  async fetchGrantFromChain(grantId: number): Promise<Grant> {
    try {
      const grantRegistry = this.contracts.getGrantRegistry();
      
      console.log(`📥 Fetching grant ${grantId} from chain...`);
      
      const grantData = await this.contracts.callView<any>(
        grantRegistry,
        'getGrant',
        grantId
      );

      const grant: Grant = {
        id: grantData.id.toNumber(),
        applicant: grantData.applicant,
        ipfsHash: grantData.ipfsHash,
        amount: grantData.amount.toString(),
        status: grantData.status as GrantStatus,
        createdAt: new Date(grantData.createdAt.toNumber() * 1000)
      };

      console.log(`✅ Grant ${grantId} fetched from chain`);
      return grant;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to fetch grant ${grantId} from chain`,
        error as Error
      );
    }
  }

  /**
   * Fetch complete grant with proposal data
   */
  async fetchGrant(grantId: number): Promise<Grant> {
    try {
      // Fetch grant from blockchain
      const grant = await this.fetchGrantFromChain(grantId);
      
      // Fetch proposal from IPFS
      const grantWithProposal = await fetchGrantWithProposal(grant, this.ipfs);
      
      console.log(`✅ Complete grant ${grantId} fetched with proposal`);
      return grantWithProposal;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.EVALUATION_ERROR,
        `Failed to fetch complete grant ${grantId}`,
        error as Error
      );
    }
  }

  /**
   * Cast vote on-chain
   */
  async castVoteOnchain(grantId: number, score: EvaluationScore): Promise<string> {
    try {
      console.log(`🗳️ Casting vote for grant ${grantId}: ${score}`);
      
      const agentVoting = this.contracts.getAgentVoting();
      
      // Execute vote transaction
      const receipt = await this.contracts.executeTransaction(
        agentVoting,
        'castVote',
        grantId,
        score
      );

      // Parse events
      const events = this.contracts.parseEvents(receipt, agentVoting);
      const voteEvent = events.find(e => e.name === 'VoteCast');
      
      if (voteEvent) {
        console.log(`✅ Vote cast successfully:`, {
          grantId: voteEvent.args.grantId.toNumber(),
          agent: voteEvent.args.agent,
          score: voteEvent.args.score
        });
      }

      return receipt.transactionHash;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to cast vote for grant ${grantId}`,
        error as Error
      );
    }
  }

  /**
   * Check if agent has already voted
   */
  async hasVoted(grantId: number): Promise<boolean> {
    try {
      const agentVoting = this.contracts.getAgentVoting();
      
      const hasVoted = await this.contracts.callView<boolean>(
        agentVoting,
        'hasVoted',
        grantId,
        this.blockchain.getAddress()
      );

      return hasVoted;
    } catch (error) {
      // If method doesn't exist, assume not voted
      console.warn(`⚠️ Could not check vote status: ${error}`);
      return false;
    }
  }

  /**
   * Get voting results for a grant
   */
  async getVotingResults(grantId: number): Promise<{ totalScore: number; finalized: boolean }> {
    try {
      const agentVoting = this.contracts.getAgentVoting();
      
      const result = await this.contracts.callView<any>(
        agentVoting,
        'getVotingResult',
        grantId
      );

      return {
        totalScore: result.totalScore.toNumber(),
        finalized: result.finalized
      };
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to get voting results for grant ${grantId}`,
        error as Error
      );
    }
  }

  /**
   * Execute evaluation with error handling
   */
  async evaluateWithErrorHandling(grantId: number): Promise<EvaluationResult> {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 ${this.agentType.toUpperCase()} AGENT - Starting evaluation of grant ${grantId}`);
      console.log(`${'='.repeat(60)}\n`);

      // Fetch grant
      const grant = await this.fetchGrant(grantId);

      // Check if already voted
      const alreadyVoted = await this.hasVoted(grantId);
      if (alreadyVoted) {
        console.log(`⚠️ Agent has already voted on grant ${grantId}`);
        throw new AgentError(
          AgentErrorType.VALIDATION_ERROR,
          'Agent has already voted on this grant'
        );
      }

      // Perform evaluation (implemented by subclass)
      const result = await this.evaluate(grant);

      // Validate result
      this.validateEvaluationResult(result);

      // Cast vote on-chain
      const txHash = await this.castVoteOnchain(result.grantId, result.score);
      console.log(`✅ Vote recorded on-chain: ${txHash}`);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ ${this.agentType.toUpperCase()} AGENT - Evaluation complete`);
      console.log(`${'='.repeat(60)}\n`);

      return result;
    } catch (error) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`❌ ${this.agentType.toUpperCase()} AGENT - Evaluation failed`);
      console.error(`${'='.repeat(60)}\n`);
      
      if (error instanceof AgentError) {
        throw error;
      }
      
      throw new AgentError(
        AgentErrorType.EVALUATION_ERROR,
        `Evaluation failed: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  /**
   * Validate evaluation result
   */
  protected validateEvaluationResult(result: EvaluationResult): void {
    if (result.score < -2 || result.score > 2) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Score must be between -2 and 2'
      );
    }

    if (result.confidence < 0 || result.confidence > 1) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Confidence must be between 0 and 1'
      );
    }

    if (!result.reasoning || result.reasoning.trim().length === 0) {
      throw new AgentError(
        AgentErrorType.VALIDATION_ERROR,
        'Reasoning is required'
      );
    }
  }

  /**
   * Abstract method to be implemented by subclasses
   * This is where the actual evaluation logic goes
   */
  protected abstract evaluate(grant: Grant): Promise<EvaluationResult>;

  /**
   * Get agent balance
   */
  async getBalance(): Promise<string> {
    return await this.blockchain.getBalance();
  }

  /**
   * Format evaluation result for logging
   */
  protected formatEvaluationResult(result: EvaluationResult): string {
    return `
Grant ID: ${result.grantId}
Agent: ${result.agentType}
Score: ${result.score}
Confidence: ${(result.confidence * 100).toFixed(1)}%
Reasoning: ${result.reasoning}
${result.concerns && result.concerns.length > 0 ? `Concerns: ${result.concerns.join(', ')}` : ''}
${result.recommendations && result.recommendations.length > 0 ? `Recommendations: ${result.recommendations.join(', ')}` : ''}
`;
  }
}
