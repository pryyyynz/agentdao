/**
 * Tests for IPFS utilities
 */

import { IPFSClient } from '../src/utils/ipfs';
import { IPFSConfig } from '../src/types';

describe('IPFSClient', () => {
  let ipfsConfig: IPFSConfig;
  let client: IPFSClient;

  beforeEach(() => {
    ipfsConfig = {
      gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
    };
    client = new IPFSClient(ipfsConfig);
  });

  describe('IPFS Hash Validation', () => {
    it('should validate correct CIDv0 hash', () => {
      const validHash = 'QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA';
      expect(client.isValidIPFSHash(validHash)).toBe(true);
    });

    it('should validate CIDv0 hash with ipfs:// prefix', () => {
      const validHash = 'ipfs://QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA';
      expect(client.isValidIPFSHash(validHash)).toBe(true);
    });

    it('should reject invalid hash (too short)', () => {
      const invalidHash = 'Qm123';
      expect(client.isValidIPFSHash(invalidHash)).toBe(false);
    });

    it('should reject invalid hash (wrong prefix)', () => {
      const invalidHash = 'Xm' + 'a'.repeat(44);
      expect(client.isValidIPFSHash(invalidHash)).toBe(false);
    });

    it('should reject empty hash', () => {
      expect(client.isValidIPFSHash('')).toBe(false);
    });

    it('should reject invalid characters', () => {
      const invalidHash = 'Qm' + 'O'.repeat(44); // 'O' is not valid in base58
      expect(client.isValidIPFSHash(invalidHash)).toBe(false);
    });
  });

  describe('Gateway URL Construction', () => {
    it('should construct correct gateway URL', () => {
      const hash = 'QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA';
      const url = client.getGatewayURL(hash);
      expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA');
    });

    it('should handle hash with ipfs:// prefix', () => {
      const hash = 'ipfs://QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA';
      const url = client.getGatewayURL(hash);
      expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA');
    });

    it('should use custom gateway URL', () => {
      const customClient = new IPFSClient({
        gatewayUrl: 'https://custom-gateway.com/ipfs/'
      });
      const hash = 'QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA';
      const url = customClient.getGatewayURL(hash);
      expect(url).toBe('https://custom-gateway.com/ipfs/QmT4AeWE9Q9EaoyLJiqaZuYQ8mJeq4ZBncjjFH9dQ9uDVA');
    });
  });
});
