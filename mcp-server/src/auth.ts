/**
 * Authentication utilities for MCP server
 */

import crypto from 'crypto';

export interface AuthConfig {
  apiKey: string;
  allowedAgents?: string[];
}

export class AuthManager {
  private apiKey: string;
  private allowedAgents: Set<string>;
  private sessionTokens: Map<string, { agentId: string; expiresAt: number }> = new Map();

  constructor(config: AuthConfig) {
    this.apiKey = config.apiKey;
    this.allowedAgents = new Set(config.allowedAgents || []);
  }

  /**
   * Verify API key
   */
  verifyApiKey(key: string): boolean {
    return key === this.apiKey;
  }

  /**
   * Generate session token for an agent
   */
  generateSessionToken(agentId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    this.sessionTokens.set(token, { agentId, expiresAt });
    return token;
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string): { valid: boolean; agentId?: string } {
    const session = this.sessionTokens.get(token);

    if (!session) {
      return { valid: false };
    }

    if (Date.now() > session.expiresAt) {
      this.sessionTokens.delete(token);
      return { valid: false };
    }

    return { valid: true, agentId: session.agentId };
  }

  /**
   * Revoke session token
   */
  revokeSessionToken(token: string): void {
    this.sessionTokens.delete(token);
  }

  /**
   * Check if agent is allowed
   */
  isAgentAllowed(agentId: string): boolean {
    if (this.allowedAgents.size === 0) {
      return true; // If no restrictions, allow all
    }
    return this.allowedAgents.has(agentId);
  }

  /**
   * Add allowed agent
   */
  addAllowedAgent(agentId: string): void {
    this.allowedAgents.add(agentId);
  }

  /**
   * Remove allowed agent
   */
  removeAllowedAgent(agentId: string): void {
    this.allowedAgents.delete(agentId);
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, session] of this.sessionTokens.entries()) {
      if (now > session.expiresAt) {
        this.sessionTokens.delete(token);
        cleaned++;
      }
    }

    return cleaned;
  }
}
