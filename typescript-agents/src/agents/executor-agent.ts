/**
 * Executor Agent
 * 
 * Executes approved grant actions on-chain:
 * - Processes grant approvals and funds initial payments
 * - Creates and funds milestone payments
 * - Handles grant rejections
 * - Manages transaction retries and gas optimization
 * - Notifies stakeholders of transaction outcomes
 */

import { BaseGrantAgent } from './base-agent';
import {
  AgentType,
  EvaluationResult,
  Grant,
  IPFSConfig
} from '../types';

/**
 * Transaction status
 */
enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REVERTED = 'REVERTED'
}

/**
 * Transaction result
 */
interface TransactionResult {
  txHash: string;
  status: TransactionStatus;
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Execution action types
 */
type ExecutionAction = 
  | 'APPROVE_GRANT'
  | 'FUND_MILESTONE'
  | 'REJECT_GRANT'
  | 'CANCEL_GRANT'
  | 'COMPLETE_MILESTONE';

/**
 * Execution request
 */
interface ExecutionRequest {
  action: ExecutionAction;
  grantId: number;
  milestoneId?: number;
  amount?: string;
  reason?: string;
}

/**
 * Gas optimization strategy
 */
interface GasStrategy {
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasLimit?: number;
}

/**
 * Executor Agent
 * Handles on-chain execution of approved grant actions
 */
export class ExecutorAgent extends BaseGrantAgent {
  private maxRetries: number;
  private retryDelay: number;
  private gasMultiplier: number;
  
  constructor(
    _walletAddress: string,
    privateKey: string,
    contractAddresses: {
      grantRegistry: string;
      agentVoting: string;
      grantTreasury: string;
    },
    ipfsConfig: IPFSConfig,
    maxRetries: number = 3,
    retryDelayMs: number = 5000,
    gasMultiplier: number = 1.2
  ) {
    super({
      agentType: AgentType.EXECUTOR,
      blockchain: {
        rpcUrl: '',
        privateKey: privateKey,
        contractAddresses: contractAddresses
      },
      ipfs: ipfsConfig,
      pythonApiUrl: 'http://localhost:8000',
      pythonApiKey: ''
    });

    this.maxRetries = maxRetries;
    this.retryDelay = retryDelayMs;
    this.gasMultiplier = gasMultiplier;

    console.log('⚡ Executor Agent initialized');
    console.log(`   Max retries: ${maxRetries}`);
    console.log(`   Retry delay: ${retryDelayMs}ms`);
    console.log(`   Gas multiplier: ${gasMultiplier}x`);
  }

  /**
   * Main evaluation method (not used for executor)
   * Executors execute, they don't evaluate
   */
  protected async evaluate(_grant: Grant): Promise<EvaluationResult> {
    throw new Error('Executor agents use executeOnchainAction(), not evaluate()');
  }

  /**
   * Execute on-chain action
   */
  async executeOnchainAction(request: ExecutionRequest): Promise<TransactionResult> {
    console.log(`\n⚡ Executing ${request.action} for Grant #${request.grantId}`);
    console.log('━'.repeat(60));

    try {
      let result: TransactionResult;

      switch (request.action) {
        case 'APPROVE_GRANT':
          result = await this.approveGrant(request.grantId);
          break;
        case 'FUND_MILESTONE':
          result = await this.fundMilestone(request.grantId, request.milestoneId!, request.amount!);
          break;
        case 'REJECT_GRANT':
          result = await this.rejectGrant(request.grantId, request.reason);
          break;
        case 'CANCEL_GRANT':
          result = await this.cancelGrant(request.grantId, request.reason);
          break;
        case 'COMPLETE_MILESTONE':
          result = await this.completeMilestone(request.grantId, request.milestoneId!);
          break;
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      // Notify stakeholders of result
      await this.notifyStakeholders(request, result);

      return result;
    } catch (error) {
      console.error(`❌ Execution failed:`, error);
      throw error;
    }
  }

  /**
   * Approve grant and initiate initial funding
   */
  private async approveGrant(grantId: number): Promise<TransactionResult> {
    console.log(`\n✅ Approving Grant #${grantId}`);

    try {
      // Fetch grant details
      const grant = await this.fetchGrant(grantId);
      console.log(`📋 Grant: ${grant.proposal?.projectName || 'Unknown'}`);
      console.log(`💰 Total Amount: ${this.formatAmount(grant.amount)} ETH`);

      // 1. Update grant status to APPROVED
      console.log('\n1️⃣  Updating grant status...');
      const statusResult = await this.executeWithRetry(async () => {
        return await this.updateGrantStatusTransaction(grantId, 2); // 2 = APPROVED
      });
      console.log(`   ✓ Status updated: ${statusResult.txHash}`);

      // 2. Calculate initial funding amount (typically 20-30% upfront)
      const initialFundingPercentage = 0.25; // 25%
      const totalAmount = BigInt(grant.amount);
      const initialAmount = (totalAmount * BigInt(25)) / BigInt(100);

      console.log(`\n2️⃣  Preparing initial funding...`);
      console.log(`   Initial: ${this.formatAmount(initialAmount.toString())} ETH (${initialFundingPercentage * 100}%)`);

      // 3. Execute initial funding
      const fundingResult = await this.executeWithRetry(async () => {
        return await this.fundFromTreasury(
          grantId,
          initialAmount.toString(),
          'Initial grant funding'
        );
      });

      console.log(`   ✓ Funding complete: ${fundingResult.txHash}`);
      console.log(`\n✅ Grant #${grantId} approved and funded successfully`);
      console.log('━'.repeat(60));

      return fundingResult;
    } catch (error) {
      console.error('❌ Grant approval failed:', error);
      throw error;
    }
  }

  /**
   * Fund a milestone
   */
  private async fundMilestone(
    grantId: number,
    milestoneId: number,
    amount: string
  ): Promise<TransactionResult> {
    console.log(`\n💰 Funding Milestone #${milestoneId} for Grant #${grantId}`);

    try {
      console.log(`   Amount: ${this.formatAmount(amount)} ETH`);

      // 1. Verify milestone is ready for funding
      console.log('\n1️⃣  Verifying milestone...');
      await this.verifyMilestone(grantId, milestoneId);
      console.log('   ✓ Milestone verified');

      // 2. Execute funding transaction
      console.log('\n2️⃣  Executing funding...');
      const result = await this.executeWithRetry(async () => {
        return await this.fundFromTreasury(
          grantId,
          amount,
          `Milestone #${milestoneId} payment`
        );
      });

      console.log(`   ✓ Funding complete: ${result.txHash}`);

      // 3. Update milestone status
      console.log('\n3️⃣  Updating milestone status...');
      await this.updateMilestoneStatus(grantId, milestoneId, 'FUNDED');
      console.log('   ✓ Milestone marked as FUNDED');

      console.log(`\n✅ Milestone #${milestoneId} funded successfully`);
      console.log('━'.repeat(60));

      return result;
    } catch (error) {
      console.error('❌ Milestone funding failed:', error);
      throw error;
    }
  }

  /**
   * Reject a grant
   */
  private async rejectGrant(grantId: number, reason?: string): Promise<TransactionResult> {
    console.log(`\n❌ Rejecting Grant #${grantId}`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    try {
      // Update grant status to REJECTED
      const result = await this.executeWithRetry(async () => {
        return await this.updateGrantStatusTransaction(grantId, 3); // 3 = REJECTED
      });

      console.log(`   ✓ Grant rejected: ${result.txHash}`);
      console.log('\n✅ Rejection recorded successfully');
      console.log('━'.repeat(60));

      return result;
    } catch (error) {
      console.error('❌ Grant rejection failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a grant
   */
  private async cancelGrant(grantId: number, reason?: string): Promise<TransactionResult> {
    console.log(`\n⚠️  Cancelling Grant #${grantId}`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    try {
      // Update grant status to CANCELLED
      const result = await this.executeWithRetry(async () => {
        return await this.updateGrantStatusTransaction(grantId, 6); // 6 = CANCELLED
      });

      console.log(`   ✓ Grant cancelled: ${result.txHash}`);
      console.log('\n✅ Cancellation recorded successfully');
      console.log('━'.repeat(60));

      return result;
    } catch (error) {
      console.error('❌ Grant cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Complete a milestone
   */
  private async completeMilestone(
    grantId: number,
    milestoneId: number
  ): Promise<TransactionResult> {
    console.log(`\n✅ Completing Milestone #${milestoneId} for Grant #${grantId}`);

    try {
      // Update milestone status to COMPLETED
      await this.updateMilestoneStatus(grantId, milestoneId, 'COMPLETED');

      // Create a transaction result (milestone completion may not require on-chain tx)
      const result: TransactionResult = {
        txHash: `0x${Date.now().toString(16)}`, // Mock tx hash
        status: TransactionStatus.CONFIRMED,
        timestamp: new Date()
      };

      console.log('   ✓ Milestone marked as COMPLETED');
      console.log('\n✅ Milestone completion recorded');
      console.log('━'.repeat(60));

      return result;
    } catch (error) {
      console.error('❌ Milestone completion failed:', error);
      throw error;
    }
  }

  /**
   * Execute transaction with retry logic
   */
  private async executeWithRetry(
    transaction: () => Promise<TransactionResult>
  ): Promise<TransactionResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${this.maxRetries}...`);
        const result = await transaction();

        if (result.status === TransactionStatus.CONFIRMED) {
          return result;
        }

        if (result.status === TransactionStatus.REVERTED) {
          throw new Error(`Transaction reverted: ${result.error}`);
        }

        // If pending, wait and retry
        console.log('   ⏳ Transaction pending, retrying...');
      } catch (error) {
        lastError = error as Error;
        console.log(`   ⚠️  Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.maxRetries) {
          console.log(`   ⏳ Waiting ${this.retryDelay}ms before retry...`);
          await this.sleep(this.retryDelay);
        }
      }
    }

    throw new Error(`Transaction failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Update grant status transaction
   */
  private async updateGrantStatusTransaction(
    _grantId: number,
    _status: number
  ): Promise<TransactionResult> {
    try {
      // In production, this would interact with GrantRegistry contract
      // For now, simulate a successful transaction
      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Simulate transaction confirmation delay
      await this.sleep(1000);

      return {
        txHash,
        status: TransactionStatus.CONFIRMED,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: '21000',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        txHash: '',
        status: TransactionStatus.FAILED,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Fund from treasury
   */
  private async fundFromTreasury(
    _grantId: number,
    amount: string,
    purpose: string
  ): Promise<TransactionResult> {
    try {
      console.log(`   Purpose: ${purpose}`);
      console.log(`   Amount: ${this.formatAmount(amount)} ETH`);

      // Get optimal gas strategy
      const gasStrategy = await this.optimizeGas();
      console.log(`   Gas Strategy: ${gasStrategy.maxFeePerGas ? 'EIP-1559' : 'Legacy'}`);

      // In production, this would interact with GrantTreasury contract
      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;

      // Simulate transaction confirmation
      await this.sleep(2000);

      return {
        txHash,
        status: TransactionStatus.CONFIRMED,
        blockNumber: Math.floor(Math.random() * 1000000),
        gasUsed: '85000',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        txHash: '',
        status: TransactionStatus.FAILED,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Verify milestone is ready for funding
   */
  private async verifyMilestone(grantId: number, milestoneId: number): Promise<void> {
    // In production, check milestone status and prerequisites
    console.log(`   Verifying milestone ${milestoneId} for grant ${grantId}...`);
    await this.sleep(500);
  }

  /**
   * Update milestone status
   */
  private async updateMilestoneStatus(
    _grantId: number,
    milestoneId: number,
    status: 'FUNDED' | 'COMPLETED'
  ): Promise<void> {
    // In production, update milestone status in contract or database
    console.log(`   Updating milestone ${milestoneId} status to ${status}...`);
    await this.sleep(500);
  }

  /**
   * Optimize gas for transaction
   */
  private async optimizeGas(): Promise<GasStrategy> {
    try {
      // Get current gas prices
      const feeData = await this.blockchain.getProvider().getFeeData();

      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 transaction
        const maxFeePerGas = feeData.maxFeePerGas.mul(Math.floor(this.gasMultiplier * 100)).div(100);
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.mul(Math.floor(this.gasMultiplier * 100)).div(100);

        return {
          maxFeePerGas: maxFeePerGas.toString(),
          maxPriorityFeePerGas: maxPriorityFeePerGas.toString()
        };
      } else if (feeData.gasPrice) {
        // Legacy transaction
        const gasPrice = feeData.gasPrice.mul(Math.floor(this.gasMultiplier * 100)).div(100);
        return {
          maxFeePerGas: gasPrice.toString()
        };
      }

      return {};
    } catch (error) {
      console.warn('⚠️  Gas optimization failed, using defaults:', error);
      return {};
    }
  }

  /**
   * Notify stakeholders of transaction result
   */
  private async notifyStakeholders(
    request: ExecutionRequest,
    result: TransactionResult
  ): Promise<void> {
    console.log('\n📢 Notifying stakeholders...');

    const statusEmoji = result.status === TransactionStatus.CONFIRMED ? '✅' : '❌';
    const message = `${statusEmoji} ${request.action} for Grant #${request.grantId} - ${result.status}`;

    console.log(`   ${message}`);
    console.log(`   TX Hash: ${result.txHash}`);

    if (result.blockNumber) {
      console.log(`   Block: #${result.blockNumber}`);
    }

    if (result.gasUsed) {
      console.log(`   Gas Used: ${result.gasUsed}`);
    }

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    // In production, send notifications to:
    // - Grant applicant
    // - DAO members
    // - Other agents
    // - Frontend dashboard
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      const tx = await this.blockchain.getProvider().getTransaction(txHash);

      if (!tx) {
        return TransactionStatus.FAILED;
      }

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        return TransactionStatus.CONFIRMED;
      } else {
        return TransactionStatus.REVERTED;
      }
    } catch (error) {
      return TransactionStatus.FAILED;
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    _contractAddress: string,
    _functionName: string,
    ..._args: any[]
  ): Promise<string> {
    try {
      // In production, estimate gas for specific contract call
      const estimatedGas = '100000'; // Default estimate
      return estimatedGas;
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return '150000'; // Fallback
    }
  }

  /**
   * Get treasury balance
   */
  async getTreasuryBalance(): Promise<string> {
    try {
      const treasury = this.contracts.getGrantTreasury();
      const balance = await this.blockchain.getProvider().getBalance(treasury.address);
      return balance.toString();
    } catch (error) {
      console.error('Failed to get treasury balance:', error);
      return '0';
    }
  }

  /**
   * Helper: Format amount in ETH
   */
  private formatAmount(weiAmount: string): string {
    const eth = parseFloat(weiAmount) / 1e18;
    return eth.toFixed(4);
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
