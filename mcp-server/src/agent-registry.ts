/**
 * Agent Registry - Tracks connected agents and their status
 */

import { AgentType, AgentInfo } from './types.js';

export class AgentRegistry {
  private agents: Map<string, AgentInfo> = new Map();
  private agentsByType: Map<AgentType, Set<string>> = new Map();

  /**
   * Register a new agent connection
   */
  registerAgent(agentId: string, type: AgentType, walletAddress?: string): void {
    const agentInfo: AgentInfo = {
      id: agentId,
      type,
      wallet_address: walletAddress,
      status: 'active',
      connected_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      evaluations_count: 0,
    };

    this.agents.set(agentId, agentInfo);

    if (!this.agentsByType.has(type)) {
      this.agentsByType.set(type, new Set());
    }
    this.agentsByType.get(type)!.add(agentId);

    console.log(`[AgentRegistry] Registered agent: ${agentId} (${type})`);
  }

  /**
   * Unregister an agent (on disconnect)
   */
  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      const typeSet = this.agentsByType.get(agent.type);
      if (typeSet) {
        typeSet.delete(agentId);
      }
      this.agents.delete(agentId);
      console.log(`[AgentRegistry] Unregistered agent: ${agentId}`);
    }
  }

  /**
   * Update agent activity timestamp
   */
  updateActivity(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.last_activity = new Date().toISOString();
    }
  }

  /**
   * Update agent status
   */
  updateStatus(agentId: string, status: 'active' | 'inactive' | 'busy'): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.updateActivity(agentId);
    }
  }

  /**
   * Increment evaluation count
   */
  incrementEvaluations(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.evaluations_count++;
      this.updateActivity(agentId);
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentInfo | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentType): AgentInfo[] {
    const agentIds = this.agentsByType.get(type) || new Set();
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is AgentInfo => agent !== undefined);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentInfo[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by status
   */
  getAgentsByStatus(status: 'active' | 'inactive' | 'busy'): AgentInfo[] {
    return Array.from(this.agents.values()).filter(agent => agent.status === status);
  }

  /**
   * Check if an agent is registered
   */
  isRegistered(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get count of agents by type
   */
  getAgentCount(type?: AgentType): number {
    if (type) {
      return this.agentsByType.get(type)?.size || 0;
    }
    return this.agents.size;
  }

  /**
   * Clean up inactive agents (haven't been active for X minutes)
   */
  cleanupInactiveAgents(inactiveMinutes: number = 30): number {
    const now = new Date().getTime();
    const threshold = inactiveMinutes * 60 * 1000;
    let cleaned = 0;

    for (const [agentId, agent] of this.agents.entries()) {
      const lastActivity = new Date(agent.last_activity).getTime();
      if (now - lastActivity > threshold) {
        this.unregisterAgent(agentId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[AgentRegistry] Cleaned up ${cleaned} inactive agents`);
    }

    return cleaned;
  }
}
