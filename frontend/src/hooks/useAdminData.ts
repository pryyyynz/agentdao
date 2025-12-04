import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  SystemHealth,
  AgentStatus,
  TreasuryInfo,
  PendingAction,
  SystemLog,
  AgentType,
  AgentRegistration,
} from "@/types";

/**
 * Admin Data Hooks
 * 
 * React Query hooks for fetching and mutating admin dashboard data
 * Currently uses mock data, replace with real API calls in production
 */

// Mock data generators
function generateMockSystemHealth(): SystemHealth {
  return {
    status: Math.random() > 0.9 ? 'degraded' : 'healthy',
    uptime_seconds: Math.floor(Math.random() * 86400 * 30), // Up to 30 days
    total_grants: Math.floor(Math.random() * 100) + 50,
    active_evaluations: Math.floor(Math.random() * 20),
    pending_actions: Math.floor(Math.random() * 10),
    treasury_balance: (Math.random() * 1000 + 500).toFixed(2),
    active_agents: 6,
    total_agents: 6,
    last_check: new Date().toISOString(),
  };
}

function generateMockAgentStatuses(): AgentStatus[] {
  const agentTypes: AgentType[] = [
    'intake',
    'technical',
    'impact',
    'due_diligence',
    'budget',
    'community',
  ];
  
  return agentTypes.map((type, index) => ({
    agent_id: `agent-${type}`,
    agent_type: type,
    status: Math.random() > 0.8 ? 'paused' : 'active',
    voting_weight: 1.0 + (Math.random() * 0.5 - 0.25),
    last_active: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    evaluations_count: Math.floor(Math.random() * 100) + 20,
    average_score: 70 + Math.random() * 30,
    wallet_address: `0x${'1234567890abcdef'.repeat(2.5).slice(0, 40)}${index}`,
    is_registered: true,
  }));
}

function generateMockTreasuryInfo(): TreasuryInfo {
  const totalBalance = Math.random() * 1000 + 500;
  const lockedBalance = totalBalance * (Math.random() * 0.3);
  
  return {
    total_balance: totalBalance.toFixed(2),
    available_balance: (totalBalance - lockedBalance).toFixed(2),
    locked_balance: lockedBalance.toFixed(2),
    pending_transfers: [
      {
        to: '0x1234567890123456789012345678901234567890',
        amount: (Math.random() * 50 + 10).toFixed(2),
        reason: 'Grant milestone payment',
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        amount: (Math.random() * 30 + 5).toFixed(2),
        reason: 'Agent operational costs',
        scheduled_at: new Date(Date.now() + 172800000).toISOString(),
      },
    ],
    recent_transactions: [
      {
        tx_hash: '0x' + 'a'.repeat(64),
        type: 'grant_payment',
        amount: (Math.random() * 100 + 50).toFixed(2),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'confirmed',
      },
      {
        tx_hash: '0x' + 'b'.repeat(64),
        type: 'deposit',
        amount: (Math.random() * 200 + 100).toFixed(2),
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: 'confirmed',
      },
    ],
  };
}

function generateMockPendingActions(): PendingAction[] {
  return [
    {
      action_id: 'action-1',
      action_type: 'grant_approval',
      description: 'Approve grant funding for DeFi Innovation Project',
      priority: 'high',
      requires_votes: 3,
      current_votes: 2,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      deadline: new Date(Date.now() + 86400000).toISOString(),
      proposed_by: '0x1234567890123456789012345678901234567890',
      metadata: { grant_id: 123 },
    },
    {
      action_id: 'action-2',
      action_type: 'milestone_release',
      description: 'Release milestone 2 payment for Web3 Infrastructure',
      priority: 'medium',
      requires_votes: 2,
      current_votes: 1,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      deadline: new Date(Date.now() + 172800000).toISOString(),
      proposed_by: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      metadata: { grant_id: 456, milestone_id: 2 },
    },
  ];
}

function generateMockSystemLogs(): SystemLog[] {
  const levels: SystemLog['level'][] = ['info', 'warning', 'error'];
  const sources = ['system', 'agent-technical', 'treasury', 'blockchain'];
  const messages = [
    'Grant evaluation completed successfully',
    'Agent response time exceeded threshold',
    'Treasury balance below recommended level',
    'Failed to submit transaction to blockchain',
    'New grant application received',
    'Agent voting weight updated',
  ];
  
  return Array.from({ length: 20 }, (_, i) => ({
    log_id: `log-${i + 1}`,
    timestamp: new Date(Date.now() - i * 600000).toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)],
    source: sources[Math.floor(Math.random() * sources.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    details: {
      request_id: `req-${Math.random().toString(36).slice(2, 9)}`,
    },
  }));
}

// Hooks
export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ['admin', 'system-health'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/admin/system-health');
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAgentStatuses() {
  return useQuery<AgentStatus[]>({
    queryKey: ['admin', 'agent-statuses'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/admin/agent-statuses');
      if (!response.ok) {
        throw new Error('Failed to fetch agent statuses');
      }
      return response.json();
    },
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

export function useTreasuryInfo() {
  return useQuery<TreasuryInfo>({
    queryKey: ['admin', 'treasury-info'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/admin/treasury-info');
      if (!response.ok) {
        throw new Error('Failed to fetch treasury info');
      }
      return response.json();
    },
    refetchInterval: 30000,
  });
}

export function usePendingActions() {
  return useQuery<PendingAction[]>({
    queryKey: ['admin', 'pending-actions'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/admin/pending-actions');
      if (!response.ok) {
        throw new Error('Failed to fetch pending actions');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useSystemLogs(filters?: {
  level?: SystemLog['level'];
  source?: string;
  limit?: number;
}) {
  return useQuery<SystemLog[]>({
    queryKey: ['admin', 'system-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.level) params.append('level', filters.level);
      if (filters?.source) params.append('source', filters.source);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/system-logs?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch system logs');
      }
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Mutations
export function useUpdateAgentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      status: AgentStatus['status'];
    }) => {
      // Extract agent name from agent ID (format: "agent-{name}")
      const agentName = params.agentId.replace('agent-', '');
      
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/agents/${agentName}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_active: params.status === 'active',
            is_suspended: params.status === 'paused',
            suspension_reason: params.status === 'paused' ? 'Paused by admin' : null,
            updated_by: 'admin',
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update agent status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agent-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] });
    },
  });
}

export function useUpdateAgentWeight() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      weight: number;
    }) => {
      // Extract agent name from agent ID
      const agentName = params.agentId.replace('agent-', '');
      
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/agents/${agentName}/weight`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weight: params.weight,
            updated_by: 'admin',
            reason: 'Weight adjusted by admin',
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update agent weight');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agent-statuses'] });
    },
  });
}

export function useRegisterAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agent: AgentRegistration) => {
      const response = await fetch(
        'http://localhost:8000/api/v1/admin/agents/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_name: agent.agent_type,
            agent_address: agent.wallet_address,
            weight: agent.initial_weight || 1.0,
            description: `${agent.agent_type.replace('_', ' ')} agent`,
            registered_by: 'admin',
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to register agent');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'agent-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] });
    },
  });
}

export function useApproveAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/pending-actions/${actionId}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_user: 'admin',
            decision_notes: 'Approved via admin dashboard',
            send_notification: true,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to approve action');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury-info'] });
    },
  });
}

export function useRejectAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (actionId: string) => {
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/pending-actions/${actionId}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_user: 'admin',
            decision_notes: 'Rejected via admin dashboard',
            send_notification: true,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to reject action');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] });
    },
  });
}

export function useEmergencyStop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(
        'http://localhost:8000/api/v1/admin/system/emergency-stop',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stop_reason: reason,
            admin_user: 'admin',
            notify_all: true,
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to activate emergency stop');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-status'] });
    },
  });
}

export function usePauseSystem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { paused: boolean; reason: string }) => {
      const response = await fetch(
        'http://localhost:8000/api/v1/admin/system/pause',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paused: params.paused,
            reason: params.reason,
            admin_user: 'admin',
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update system pause status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-status'] });
    },
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['admin', 'system-status'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/admin/system/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      
      return response.json() as Promise<{
        system_paused: boolean;
        pause_reason: string;
        emergency_stop: boolean;
        emergency_stop_reason: string;
        emergency_stop_timestamp: string | null;
        operational: boolean;
        last_updated: string | null;
        updated_by: string | null;
      }>;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useDeactivateEmergencyStop() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(
        'http://localhost:8000/api/v1/admin/system/emergency-stop?admin_user=admin',
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to deactivate emergency stop');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-status'] });
    },
  });
}

export function useEmergencyWithdrawal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { 
      recipient_address: string; 
      amount_eth: string; 
      reason: string 
    }) => {
      const response = await fetch(
        'http://localhost:8000/api/v1/admin/system/emergency-withdrawal',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient_address: params.recipient_address,
            amount_eth: params.amount_eth,
            reason: params.reason,
            admin_user: 'admin',
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create emergency withdrawal request');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-withdrawals'] });
    },
  });
}

export function usePendingWithdrawals() {
  return useQuery({
    queryKey: ['admin', 'pending-withdrawals'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/v1/admin/system/emergency-withdrawal/pending');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending withdrawals');
      }
      
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useApproveWithdrawal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      withdrawal_id: number;
      approved: boolean;
      comment?: string;
    }) => {
      const response = await fetch(
        'http://localhost:8000/api/v1/admin/system/emergency-withdrawal/approve',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            withdrawal_id: params.withdrawal_id,
            admin_user: 'admin',
            approved: params.approved,
            comment: params.comment || '',
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to process approval');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'treasury'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-health'] });
    },
  });
}
