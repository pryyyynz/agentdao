/**
 * Contract utilities for loading ABIs and managing contract interactions
 */

import { ethers, Contract } from 'ethers';
import { BlockchainConnection } from './blockchain';
import { AgentError, AgentErrorType } from '../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Contract ABI loader
 */
export class ContractABILoader {
  private abiCache: Map<string, any> = new Map();
  private abiDirectory: string;

  constructor(abiDirectory?: string) {
    // Default to smart-contracts/artifacts directory
    this.abiDirectory = abiDirectory || path.join(__dirname, '../../../smart-contracts/artifacts/contracts');
  }

  /**
   * Load ABI from file
   */
  loadABI(contractName: string): any {
    // Check cache first
    if (this.abiCache.has(contractName)) {
      return this.abiCache.get(contractName);
    }

    try {
      // Try to load from artifacts directory
      const artifactPath = path.join(this.abiDirectory, `${contractName}.sol`, `${contractName}.json`);
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        const abi = artifact.abi;
        this.abiCache.set(contractName, abi);
        return abi;
      }

      throw new Error(`ABI file not found: ${artifactPath}`);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to load ABI for contract: ${contractName}`,
        error as Error
      );
    }
  }

  /**
   * Set custom ABI for a contract
   */
  setABI(contractName: string, abi: any): void {
    this.abiCache.set(contractName, abi);
  }

  /**
   * Clear ABI cache
   */
  clearCache(): void {
    this.abiCache.clear();
  }
}

/**
 * Contract manager for easy contract instantiation
 */
export class ContractManager {
  private blockchain: BlockchainConnection;
  private abiLoader: ContractABILoader;
  private contracts: Map<string, Contract> = new Map();

  constructor(blockchain: BlockchainConnection, abiLoader?: ContractABILoader) {
    this.blockchain = blockchain;
    this.abiLoader = abiLoader || new ContractABILoader();
  }

  /**
   * Get or create a contract instance
   */
  getContract(contractName: string, address: string): Contract {
    const cacheKey = `${contractName}-${address}`;
    
    if (this.contracts.has(cacheKey)) {
      return this.contracts.get(cacheKey)!;
    }

    try {
      const abi = this.abiLoader.loadABI(contractName);
      const contract = new ethers.Contract(
        address,
        abi,
        this.blockchain.getWallet()
      );

      this.contracts.set(cacheKey, contract);
      console.log(`✅ Contract loaded: ${contractName} at ${address}`);
      
      return contract;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to instantiate contract: ${contractName}`,
        error as Error
      );
    }
  }

  /**
   * Get GrantRegistry contract
   */
  getGrantRegistry(): Contract {
    const address = this.blockchain.getContractAddresses().grantRegistry;
    return this.getContract('GrantRegistry', address);
  }

  /**
   * Get AgentVoting contract
   */
  getAgentVoting(): Contract {
    const address = this.blockchain.getContractAddresses().agentVoting;
    return this.getContract('AgentVoting', address);
  }

  /**
   * Get GrantTreasury contract
   */
  getGrantTreasury(): Contract {
    const address = this.blockchain.getContractAddresses().grantTreasury;
    return this.getContract('GrantTreasury', address);
  }

  /**
   * Call a contract view function
   */
  async callView<T>(
    contract: Contract,
    methodName: string,
    ...args: any[]
  ): Promise<T> {
    try {
      return await contract[methodName](...args);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to call view function ${methodName}`,
        error as Error
      );
    }
  }

  /**
   * Execute a contract transaction
   */
  async executeTransaction(
    contract: Contract,
    methodName: string,
    ...args: any[]
  ): Promise<ethers.providers.TransactionReceipt> {
    try {
      console.log(`📝 Executing transaction: ${methodName}`, args);
      
      const tx = await contract[methodName](...args);
      console.log(`⏳ Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed: ${tx.hash}`);
      
      return receipt;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to execute transaction ${methodName}`,
        error as Error
      );
    }
  }

  /**
   * Parse transaction events
   */
  parseEvents(receipt: ethers.providers.TransactionReceipt, contract: Contract): any[] {
    try {
      const events: any[] = [];
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          events.push({
            name: parsedLog.name,
            args: parsedLog.args,
            signature: parsedLog.signature
          });
        } catch {
          // Skip logs that don't match this contract
          continue;
        }
      }
      
      return events;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to parse transaction events',
        error as Error
      );
    }
  }
}

/**
 * Wallet manager for handling multiple agent wallets
 */
export class WalletManager {
  private wallets: Map<string, ethers.Wallet> = new Map();
  private provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Add a wallet from private key
   */
  addWallet(name: string, privateKey: string): ethers.Wallet {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    this.wallets.set(name, wallet);
    console.log(`✅ Wallet added: ${name} - ${wallet.address}`);
    return wallet;
  }

  /**
   * Get a wallet by name
   */
  getWallet(name: string): ethers.Wallet | undefined {
    return this.wallets.get(name);
  }

  /**
   * Get all wallet names
   */
  getWalletNames(): string[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Get balance for a wallet
   */
  async getBalance(name: string): Promise<string> {
    const wallet = this.wallets.get(name);
    if (!wallet) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Wallet not found: ${name}`
      );
    }

    try {
      const balance = await wallet.getBalance();
      return ethers.utils.formatEther(balance);
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        `Failed to get balance for wallet: ${name}`,
        error as Error
      );
    }
  }
}
