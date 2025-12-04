// Grant Status Types
export type GrantStatus = 
  | "pending"
  | "evaluating"
  | "approved"
  | "rejected"
  | "active"
  | "completed";

// Agent Types
export type AgentType =
  | "intake"
  | "coordinator"
  | "technical"
  | "impact"
  | "due_diligence"
  | "budget"
  | "community"
  | "executor";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: "idle" | "busy" | "error";
  wallet_address: string;
}

// Grant Types
export interface Grant {
  id: number;
  grant_id: string; // UUID
  title: string;
  description: string;
  applicant_address: string;
  requested_amount: string;
  status: GrantStatus;
  ipfs_hash?: string;
  created_at: string;
  updated_at: string;
  metadata?: GrantMetadata;
  has_milestones?: boolean;
  total_milestones?: number;
  current_milestone?: number;
}

export interface GrantMetadata {
  category?: string;
  duration_months?: number;
  team_size?: number;
  github_repo?: string;
  website?: string;
  twitter?: string;
  discord?: string;
}

export interface GrantSubmission {
  title: string;
  description: string;
  requested_amount: string;
  category: string;
  duration_months: number;
  team_size: number;
  github_repo?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  detailed_proposal: string;
  applicant_address?: string;
}

// Evaluation Types
export interface Evaluation {
  id: number;
  grant_id: number;
  agent_type: AgentType;
  score: number;
  reasoning: string;
  created_at: string;
  vote_tx_hash?: string;
}

// Agent Activity Types
export interface AgentActivity {
  id: string;
  agent_type: AgentType;
  grant_id: number;
  action: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Milestone Types
export type MilestoneStatus = 
  | "pending" 
  | "in_progress" 
  | "submitted" 
  | "under_review" 
  | "approved" 
  | "rejected" 
  | "revision_requested";

export interface Milestone {
  id: number;
  milestone_id: string;
  grant_id: string;
  milestone_number: number;
  title: string;
  description: string;
  deliverables: string[];
  amount: string;
  currency: string;
  status: MilestoneStatus;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  proof_of_work_url?: string;
  proof_of_work_ipfs?: string;
  submission_notes?: string;
  submitted_at?: string;
  reviewer_feedback?: string;
  review_score?: number;
  reviewed_at?: string;
  reviewed_by?: string;
  payment_tx_hash?: string;
  payment_released_at?: string;
  release_tx_hash?: string;  // Alias for payment_tx_hash from blockchain
  completed_at?: string;  // Alias for actual_completion_date
  on_chain_milestone_id?: number;
  created_at: string;
  updated_at: string;
}

export interface MilestoneList {
  milestones: Milestone[];
  grant_id: string;
  total_milestones: number;
  completed_milestones: number;
  total_amount: string;
  paid_amount: string;
  completion_percentage: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Contract Types
export interface ContractAddresses {
  grantRegistry: string;
  grantTreasury: string;
  agentVoting: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_grants: number;
  pending_grants: number;
  approved_grants: number;
  rejected_grants: number;
  total_funded: string;
  active_agents: number;
}

// Agent Performance Types
export interface AgentPerformance {
  agent_type: AgentType;
  total_evaluations: number;
  average_score: number;
  accuracy_rate: number; // Percentage of evaluations matching final decision
  reputation_score: number; // Overall reputation (0-100)
  voting_weight: number; // Current voting weight
  evaluations_history: {
    date: string;
    score: number;
    grant_id: number;
    accuracy: boolean;
  }[];
  reputation_trend: {
    date: string;
    score: number;
  }[];
}

export interface AgentComparison {
  agent_type: AgentType;
  metric: string;
  value: number;
  rank: number;
}

// Admin Dashboard Types
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime_seconds: number;
  total_grants: number;
  active_evaluations: number;
  pending_actions: number;
  treasury_balance: string;
  active_agents: number;
  total_agents: number;
  last_check: string;
}

export interface AgentStatus {
  agent_id: string;
  agent_type: AgentType;
  status: 'active' | 'paused' | 'error' | 'maintenance';
  voting_weight: number;
  last_active: string;
  evaluations_count: number;
  average_score: number;
  wallet_address: string;
  is_registered: boolean;
}

export interface TreasuryInfo {
  blockchain_balance: string;
  total_approved_grants: string;
  pending_transfers: {
    to: string;
    amount: string;
    reason: string;
    scheduled_at: string;
  }[];
  recent_transactions: {
    tx_hash: string;
    type: 'deposit' | 'withdrawal' | 'grant_payment';
    amount: string;
    timestamp: string;
    status: 'pending' | 'confirmed' | 'failed';
  }[];
}

export interface PendingAction {
  action_id: string;
  action_type: 'grant_approval' | 'milestone_release' | 'agent_update' | 'system_config';
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requires_votes: number;
  current_votes: number;
  created_at: string;
  deadline: string;
  proposed_by: string;
  metadata?: Record<string, any>;
}

export interface SystemLog {
  log_id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  message: string;
  details?: Record<string, any>;
  user_address?: string;
  agent_type?: AgentType;
}

export interface AdminUser {
  address: string;
  role: 'admin' | 'moderator' | 'viewer';
  permissions: string[];
  last_login: string;
}

export interface AgentRegistration {
  agent_type: AgentType;
  wallet_address: string;
  initial_weight: number;
  metadata?: Record<string, any>;
}

// User/Auth Types
export interface User {
  user_id: string;
  email: string;
  wallet_address?: string;
  display_name?: string;
  bio?: string;
  email_verified: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}