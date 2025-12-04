/**
 * Type definitions for AgentDAO MCP Server
 */

export enum GrantStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum AgentType {
  INTAKE = 'intake',
  TECHNICAL = 'technical',
  IMPACT = 'impact',
  DUE_DILIGENCE = 'due_diligence',
  BUDGET = 'budget',
  COMMUNITY = 'community',
  COORDINATOR = 'coordinator',
  EXECUTOR = 'executor',
}

export interface Grant {
  id: number;
  applicant: string;
  ipfs_hash: string;
  project_name: string;
  description: string;
  amount: number;
  status: GrantStatus;
  created_at: string;
  updated_at?: string;
}

export interface Evaluation {
  id: number;
  grant_id: number;
  agent_type: AgentType;
  score: number; // -2 to +2
  reasoning: string;
  concerns?: string[];
  recommendations?: string[];
  confidence: number;
  created_at: string;
}

export interface AgentInfo {
  id: string;
  type: AgentType;
  wallet_address?: string;
  status: 'active' | 'inactive' | 'busy';
  connected_at: string;
  last_activity: string;
  evaluations_count: number;
}

export interface Message {
  id: string;
  from: AgentType;
  to?: AgentType | AgentType[]; // undefined = broadcast
  message_type: MessageType;
  data: any;
  timestamp: string;
}

export enum MessageType {
  NEW_GRANT = 'new_grant',
  EVALUATION_REQUEST = 'evaluation_request',
  EVALUATION_COMPLETE = 'evaluation_complete',
  VOTE_CAST = 'vote_cast',
  APPROVAL_DECISION = 'approval_decision',
  MILESTONE_CREATED = 'milestone_created',
  SYSTEM_STATUS = 'system_status',
}

export interface VotingResult {
  grant_id: number;
  total_score: number;
  votes: {
    agent_type: AgentType;
    score: number;
    timestamp: string;
  }[];
  finalized: boolean;
  approved?: boolean;
}

export interface Milestone {
  number: number;
  amount: number;
  deliverable: string;
  deadline_days: number;
  payment_type: 'upfront' | 'on_completion';
  status?: 'pending' | 'completed' | 'overdue';
}
