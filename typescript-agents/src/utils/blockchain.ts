/**
 * Blockchain utilities for connecting to Ethereum and interacting with smart contracts
 */

import { ethers, Wallet, providers } from 'ethers';
import { BlockchainConfig, AgentError, AgentErrorType } from '../types';

/**
 * Blockchain connection manager
 */
export class BlockchainConnection {
  private provider: providers.JsonRpcProvider;
  private wallet: Wallet;
  private config: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    this.config = config;
    
    try {
      // Initialize provider
      this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
      
      // Initialize wallet
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
      
      console.log(`✅ Blockchain connected - Wallet: ${this.wallet.address}`);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to initialize blockchain connection',
        error as Error
      );
    }
  }

  /**
   * Get the provider instance
   */
  getProvider(): providers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get the wallet instance
   */
  getWallet(): Wallet {
    return this.wallet;
  }

  /**
   * Get the wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to get block number',
        error as Error
      );
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    try {
      const balance = await this.wallet.getBalance();
      return ethers.utils.formatEther(balance);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to get wallet balance',
        error as Error
      );
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<providers.TransactionReceipt> {
    try {
      console.log(`⏳ Waiting for transaction: ${txHash}`);
      const receipt = await this.provider.waitForTransaction(txHash, confirmations);
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }
      
      console.log(`✅ Transaction confirmed: ${txHash}`);
      return receipt;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to wait for transaction: ${txHash}`,
        error as Error
      );
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: providers.TransactionRequest): Promise<ethers.BigNumber> {
    try {
      return await this.provider.estimateGas(transaction);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to estimate gas',
        error as Error
      );
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<ethers.BigNumber> {
    try {
      return await this.provider.getGasPrice();
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to get gas price',
        error as Error
      );
    }
  }

  /**
   * Check if connected to the correct network
   */
  async verifyNetwork(expectedChainId: number): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();
      return network.chainId === expectedChainId;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to verify network',
        error as Error
      );
    }
  }

  /**
   * Get contract addresses from config
   */
  getContractAddresses() {
    return this.config.contractAddresses;
  }
}

/**
 * Helper function to parse Ether amounts
 */
export function parseEther(amount: string): ethers.BigNumber {
  return ethers.utils.parseEther(amount);
}

/**
 * Helper function to format Wei amounts to Ether
 */
export function formatEther(amount: ethers.BigNumberish): string {
  return ethers.utils.formatEther(amount);
}

/**
 * Helper function to parse units with custom decimals
 */
export function parseUnits(amount: string, decimals: number = 18): ethers.BigNumber {
  return ethers.utils.parseUnits(amount, decimals);
}

/**
 * Helper function to format units with custom decimals
 */
export function formatUnits(amount: ethers.BigNumberish, decimals: number = 18): string {
  return ethers.utils.formatUnits(amount, decimals);
}
