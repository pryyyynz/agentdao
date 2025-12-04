/**
 * IPFS utilities for fetching grant proposals and documents
 */

import axios from 'axios';
import { IPFSConfig, Grant, GrantProposal, AgentError, AgentErrorType } from '../types';

/**
 * IPFS client for fetching content
 */
export class IPFSClient {
  private config: IPFSConfig;

  constructor(config: IPFSConfig) {
    this.config = config;
  }

  /**
   * Fetch content from IPFS by hash
   */
  async fetchContent<T>(ipfsHash: string): Promise<T> {
    try {
      // Remove 'ipfs://' prefix if present
      const hash = ipfsHash.replace('ipfs://', '');
      
      // Construct gateway URL
      const url = `${this.config.gatewayUrl}${hash}`;
      
      console.log(`📥 Fetching from IPFS: ${hash}`);
      
      const response = await axios.get(url, {
        timeout: 30000, // 30 second timeout
        headers: this.config.apiKey ? {
          'Authorization': `Bearer ${this.config.apiKey}`
        } : {}
      });

      console.log(`✅ Successfully fetched from IPFS: ${hash}`);
      return response.data as T;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AgentError(
          AgentErrorType.IPFS_ERROR,
          `Failed to fetch from IPFS: ${error.message}`,
          error
        );
      }
      throw new AgentError(
        AgentErrorType.IPFS_ERROR,
        'Unknown error fetching from IPFS',
        error as Error
      );
    }
  }

  /**
   * Fetch grant proposal from IPFS
   */
  async fetchGrantProposal(ipfsHash: string): Promise<GrantProposal> {
    try {
      const proposal = await this.fetchContent<GrantProposal>(ipfsHash);
      
      // Validate proposal structure
      if (!proposal.projectName || !proposal.description) {
        throw new Error('Invalid proposal structure: missing required fields');
      }
      
      return proposal;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.IPFS_ERROR,
        `Failed to fetch grant proposal: ${ipfsHash}`,
        error as Error
      );
    }
  }

  /**
   * Upload content to IPFS (if API configured)
   */
  async uploadContent(content: any): Promise<string> {
    if (!this.config.apiUrl || !this.config.apiKey) {
      throw new AgentError(
        AgentErrorType.IPFS_ERROR,
        'IPFS API not configured for uploads'
      );
    }

    try {
      console.log('📤 Uploading to IPFS...');
      
      const response = await axios.post(
        `${this.config.apiUrl}/pinning/pinJSONToIPFS`,
        {
          pinataContent: content,
          pinataMetadata: {
            name: `grantify-${Date.now()}`
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const ipfsHash = response.data.IpfsHash;
      console.log(`✅ Uploaded to IPFS: ${ipfsHash}`);
      
      return ipfsHash;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AgentError(
          AgentErrorType.IPFS_ERROR,
          `Failed to upload to IPFS: ${error.message}`,
          error
        );
      }
      throw new AgentError(
        AgentErrorType.IPFS_ERROR,
        'Unknown error uploading to IPFS',
        error as Error
      );
    }
  }

  /**
   * Check if IPFS hash is valid
   */
  isValidIPFSHash(hash: string): boolean {
    // Remove 'ipfs://' prefix if present
    const cleanHash = hash.replace('ipfs://', '');
    
    // Basic validation for CIDv0 and CIDv1
    const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
    const cidv1Regex = /^[a-z2-7]{59}$/;
    
    return cidv0Regex.test(cleanHash) || cidv1Regex.test(cleanHash);
  }

  /**
   * Construct IPFS gateway URL
   */
  getGatewayURL(ipfsHash: string): string {
    const hash = ipfsHash.replace('ipfs://', '');
    return `${this.config.gatewayUrl}${hash}`;
  }
}

/**
 * Helper function to fetch grant with proposal data
 */
export async function fetchGrantWithProposal(
  grant: Grant,
  ipfsClient: IPFSClient
): Promise<Grant> {
  try {
    const proposal = await ipfsClient.fetchGrantProposal(grant.ipfsHash);
    
    return {
      ...grant,
      proposal
    };
  } catch (error) {
    throw new AgentError(
      AgentErrorType.IPFS_ERROR,
      `Failed to fetch grant ${grant.id} with proposal`,
      error as Error
    );
  }
}

/**
 * Helper function to fetch multiple grants with proposals
 */
export async function fetchGrantsWithProposals(
  grants: Grant[],
  ipfsClient: IPFSClient
): Promise<Grant[]> {
  const promises = grants.map(grant => 
    fetchGrantWithProposal(grant, ipfsClient)
  );
  
  try {
    return await Promise.all(promises);
  } catch (error) {
    throw new AgentError(
      AgentErrorType.IPFS_ERROR,
      'Failed to fetch multiple grants with proposals',
      error as Error
    );
  }
}
