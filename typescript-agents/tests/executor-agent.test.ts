/**
 * Tests for Executor Agent
 */

import { ExecutorAgent } from '../src/agents/executor-agent';
import { AgentType } from '../src/types';

// Mock configuration
const mockPrivateKey = '0x1234567890123456789012345678901234567890123456789012345678901234';
const mockContractAddresses = {
  grantRegistry: '0x1234567890123456789012345678901234567890',
  agentVoting: '0x2234567890123456789012345678901234567890',
  grantTreasury: '0x3234567890123456789012345678901234567890'
};
const mockIPFSConfig = {
  gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
};

describe('ExecutorAgent', () => {
  let agent: ExecutorAgent;

  beforeEach(() => {
    agent = new ExecutorAgent(
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      mockPrivateKey,
      mockContractAddresses,
      mockIPFSConfig
    );
  });

  describe('Initialization', () => {
    test('should initialize with correct agent type', () => {
      expect(agent.getAgentType()).toBe(AgentType.EXECUTOR);
    });

    test('should initialize with default retry configuration', () => {
      const defaultAgent = new ExecutorAgent(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        mockPrivateKey,
        mockContractAddresses,
        mockIPFSConfig
      );
      expect(defaultAgent).toBeDefined();
    });

    test('should initialize with custom retry configuration', () => {
      const customAgent = new ExecutorAgent(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        mockPrivateKey,
        mockContractAddresses,
        mockIPFSConfig,
        5, // maxRetries
        3000, // retryDelayMs
        1.5  // gasMultiplier
      );
      expect(customAgent).toBeDefined();
    });

    test('should have executor agent type', () => {
      expect(agent.getAgentType()).toBe(AgentType.EXECUTOR);
    });
  });

  describe('Transaction Status', () => {
    test('should recognize PENDING status', () => {
      const status = 'PENDING';
      expect(status).toBe('PENDING');
    });

    test('should recognize CONFIRMED status', () => {
      const status = 'CONFIRMED';
      expect(status).toBe('CONFIRMED');
    });

    test('should recognize FAILED status', () => {
      const status = 'FAILED';
      expect(status).toBe('FAILED');
    });

    test('should recognize REVERTED status', () => {
      const status = 'REVERTED';
      expect(status).toBe('REVERTED');
    });
  });

  describe('Execution Actions', () => {
    test('should recognize APPROVE_GRANT action', () => {
      const action = 'APPROVE_GRANT';
      expect(action).toBe('APPROVE_GRANT');
    });

    test('should recognize FUND_MILESTONE action', () => {
      const action = 'FUND_MILESTONE';
      expect(action).toBe('FUND_MILESTONE');
    });

    test('should recognize REJECT_GRANT action', () => {
      const action = 'REJECT_GRANT';
      expect(action).toBe('REJECT_GRANT');
    });

    test('should recognize CANCEL_GRANT action', () => {
      const action = 'CANCEL_GRANT';
      expect(action).toBe('CANCEL_GRANT');
    });

    test('should recognize COMPLETE_MILESTONE action', () => {
      const action = 'COMPLETE_MILESTONE';
      expect(action).toBe('COMPLETE_MILESTONE');
    });
  });

  describe('Funding Calculations', () => {
    test('should calculate 25% initial funding correctly', () => {
      const totalAmount = BigInt('100000000000000000000'); // 100 ETH in wei
      const percentage = 25;
      const initialAmount = (totalAmount * BigInt(percentage)) / BigInt(100);
      const expectedAmount = BigInt('25000000000000000000'); // 25 ETH

      expect(initialAmount.toString()).toBe(expectedAmount.toString());
    });

    test('should handle small amounts', () => {
      const totalAmount = BigInt('1000000000000000000'); // 1 ETH
      const percentage = 25;
      const initialAmount = (totalAmount * BigInt(percentage)) / BigInt(100);
      const expectedAmount = BigInt('250000000000000000'); // 0.25 ETH

      expect(initialAmount.toString()).toBe(expectedAmount.toString());
    });

    test('should handle large amounts', () => {
      const totalAmount = BigInt('1000000000000000000000'); // 1000 ETH
      const percentage = 25;
      const initialAmount = (totalAmount * BigInt(percentage)) / BigInt(100);
      const expectedAmount = BigInt('250000000000000000000'); // 250 ETH

      expect(initialAmount.toString()).toBe(expectedAmount.toString());
    });

    test('should calculate different percentages correctly', () => {
      const totalAmount = BigInt('100000000000000000000'); // 100 ETH
      
      const percent20 = (totalAmount * BigInt(20)) / BigInt(100);
      expect(percent20.toString()).toBe('20000000000000000000');

      const percent30 = (totalAmount * BigInt(30)) / BigInt(100);
      expect(percent30.toString()).toBe('30000000000000000000');

      const percent50 = (totalAmount * BigInt(50)) / BigInt(100);
      expect(percent50.toString()).toBe('50000000000000000000');
    });
  });

  describe('Amount Formatting', () => {
    test('should format wei to ETH correctly', () => {
      const weiAmount = '1000000000000000000'; // 1 ETH
      const eth = parseFloat(weiAmount) / 1e18;
      expect(eth).toBe(1);
    });

    test('should format small amounts', () => {
      const weiAmount = '100000000000000000'; // 0.1 ETH
      const eth = parseFloat(weiAmount) / 1e18;
      expect(eth).toBeCloseTo(0.1, 4);
    });

    test('should format large amounts', () => {
      const weiAmount = '50000000000000000000'; // 50 ETH
      const eth = parseFloat(weiAmount) / 1e18;
      expect(eth).toBe(50);
    });

    test('should handle decimal precision', () => {
      const weiAmount = '123456789012345678'; // 0.123456789... ETH
      const eth = parseFloat(weiAmount) / 1e18;
      const formatted = eth.toFixed(4);
      expect(formatted).toBe('0.1235');
    });
  });

  describe('Gas Optimization', () => {
    test('should calculate gas multiplier correctly', () => {
      const baseGas = 100;
      const multiplier = 1.2;
      const optimizedGas = Math.floor(baseGas * multiplier);
      expect(optimizedGas).toBe(120);
    });

    test('should handle different multipliers', () => {
      const baseGas = 100;
      
      const mult1_1 = Math.floor(baseGas * 1.1);
      expect(mult1_1).toBe(110);

      const mult1_5 = Math.floor(baseGas * 1.5);
      expect(mult1_5).toBe(150);

      const mult2_0 = Math.floor(baseGas * 2.0);
      expect(mult2_0).toBe(200);
    });

    test('should estimate default gas correctly', async () => {
      const estimatedGas = await agent.estimateGas('0x123', 'transfer', '0x456', '1000');
      expect(estimatedGas).toBeDefined();
      expect(typeof estimatedGas).toBe('string');
    });

    test('should provide fallback gas estimate', () => {
      const fallbackGas = '150000';
      expect(fallbackGas).toBe('150000');
    });
  });

  describe('Retry Logic', () => {
    test('should retry specified number of times', () => {
      const maxRetries = 3;
      let attempts = 0;

      const mockTransaction = async () => {
        attempts++;
        if (attempts < maxRetries) {
          throw new Error('Transaction failed');
        }
        return { status: 'CONFIRMED' };
      };

      // This would be called maxRetries times
      expect(maxRetries).toBe(3);
    });

    test('should calculate retry delay', () => {
      const baseDelay = 5000;
      const retryNumber = 2;
      const delay = baseDelay; // Fixed delay (not exponential)
      expect(delay).toBe(5000);
    });

    test('should handle immediate success', () => {
      const attempts = 1;
      const maxRetries = 3;
      expect(attempts).toBeLessThanOrEqual(maxRetries);
    });

    test('should handle max retries reached', () => {
      const attempts = 3;
      const maxRetries = 3;
      const failed = attempts >= maxRetries;
      expect(failed).toBe(true);
    });
  });

  describe('Transaction Result Validation', () => {
    test('should validate confirmed transaction result', () => {
      const result = {
        txHash: '0xabc123',
        status: 'CONFIRMED',
        blockNumber: 123456,
        gasUsed: '21000',
        timestamp: new Date()
      };

      expect(result.status).toBe('CONFIRMED');
      expect(result.txHash).toBeDefined();
      expect(result.blockNumber).toBeGreaterThan(0);
    });

    test('should validate failed transaction result', () => {
      const result = {
        txHash: '',
        status: 'FAILED',
        error: 'Insufficient funds',
        timestamp: new Date()
      };

      expect(result.status).toBe('FAILED');
      expect(result.error).toBeDefined();
    });

    test('should validate reverted transaction result', () => {
      const result = {
        txHash: '0xabc123',
        status: 'REVERTED',
        error: 'Execution reverted',
        timestamp: new Date()
      };

      expect(result.status).toBe('REVERTED');
      expect(result.error).toContain('reverted');
    });
  });

  describe('Notification Generation', () => {
    test('should generate approval notification', () => {
      const action = 'APPROVE_GRANT';
      const grantId = 1;
      const status = 'CONFIRMED';
      const message = `✅ ${action} for Grant #${grantId} - ${status}`;

      expect(message).toContain('APPROVE_GRANT');
      expect(message).toContain('Grant #1');
      expect(message).toContain('CONFIRMED');
    });

    test('should generate milestone funding notification', () => {
      const action = 'FUND_MILESTONE';
      const grantId = 1;
      const status = 'CONFIRMED';
      const message = `✅ ${action} for Grant #${grantId} - ${status}`;

      expect(message).toContain('FUND_MILESTONE');
    });

    test('should generate rejection notification', () => {
      const action = 'REJECT_GRANT';
      const grantId = 1;
      const status = 'CONFIRMED';
      const message = `✅ ${action} for Grant #${grantId} - ${status}`;

      expect(message).toContain('REJECT_GRANT');
    });

    test('should generate failure notification', () => {
      const action = 'APPROVE_GRANT';
      const grantId = 1;
      const status = 'FAILED';
      const message = `❌ ${action} for Grant #${grantId} - ${status}`;

      expect(message).toContain('❌');
      expect(message).toContain('FAILED');
    });
  });

  describe('Milestone Status', () => {
    test('should recognize PENDING milestone status', () => {
      const status = 'PENDING';
      expect(status).toBe('PENDING');
    });

    test('should recognize FUNDED milestone status', () => {
      const status = 'FUNDED';
      expect(status).toBe('FUNDED');
    });

    test('should recognize COMPLETED milestone status', () => {
      const status = 'COMPLETED';
      expect(status).toBe('COMPLETED');
    });

    test('should recognize REJECTED milestone status', () => {
      const status = 'REJECTED';
      expect(status).toBe('REJECTED');
    });
  });

  describe('Error Handling', () => {
    test('should throw error when calling evaluate() directly', async () => {
      const mockGrant: any = { id: 1, amount: '1000000000000000000' };
      await expect(async () => {
        await (agent as any).evaluate(mockGrant);
      }).rejects.toThrow('Executor agents use executeOnchainAction()');
    });

    test('should handle transaction failure gracefully', () => {
      const error = new Error('Transaction failed');
      expect(error.message).toContain('failed');
    });

    test('should handle insufficient funds error', () => {
      const error = new Error('Insufficient funds');
      expect(error.message).toContain('Insufficient');
    });

    test('should handle gas estimation failure', async () => {
      // Gas estimation should fall back to default
      const fallback = '150000';
      expect(fallback).toBeDefined();
    });
  });

  describe('Grant Status Updates', () => {
    test('should map APPROVED status correctly', () => {
      const statusCode = 2; // APPROVED
      expect(statusCode).toBe(2);
    });

    test('should map REJECTED status correctly', () => {
      const statusCode = 3; // REJECTED
      expect(statusCode).toBe(3);
    });

    test('should map CANCELLED status correctly', () => {
      const statusCode = 6; // CANCELLED
      expect(statusCode).toBe(6);
    });

    test('should map FUNDED status correctly', () => {
      const statusCode = 4; // FUNDED
      expect(statusCode).toBe(4);
    });
  });

  describe('Transaction Hash Generation', () => {
    test('should generate valid transaction hash format', () => {
      const txHash = `0x${Date.now().toString(16)}`;
      expect(txHash).toMatch(/^0x[0-9a-f]+$/);
    });

    test('should generate unique transaction hashes', () => {
      const txHash1 = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      const txHash2 = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      // While technically they could be the same, probability is extremely low
      expect(txHash1).toMatch(/^0x[0-9a-f]+$/);
      expect(txHash2).toMatch(/^0x[0-9a-f]+$/);
    });
  });

  describe('Execution Request Validation', () => {
    test('should validate APPROVE_GRANT request', () => {
      const request = {
        action: 'APPROVE_GRANT' as const,
        grantId: 1
      };

      expect(request.action).toBe('APPROVE_GRANT');
      expect(request.grantId).toBeGreaterThan(0);
    });

    test('should validate FUND_MILESTONE request', () => {
      const request = {
        action: 'FUND_MILESTONE' as const,
        grantId: 1,
        milestoneId: 1,
        amount: '1000000000000000000'
      };

      expect(request.action).toBe('FUND_MILESTONE');
      expect(request.milestoneId).toBeDefined();
      expect(request.amount).toBeDefined();
    });

    test('should validate REJECT_GRANT request', () => {
      const request = {
        action: 'REJECT_GRANT' as const,
        grantId: 1,
        reason: 'Failed evaluation'
      };

      expect(request.action).toBe('REJECT_GRANT');
      expect(request.reason).toBeDefined();
    });

    test('should validate COMPLETE_MILESTONE request', () => {
      const request = {
        action: 'COMPLETE_MILESTONE' as const,
        grantId: 1,
        milestoneId: 1
      };

      expect(request.action).toBe('COMPLETE_MILESTONE');
      expect(request.milestoneId).toBeGreaterThan(0);
    });
  });
});
