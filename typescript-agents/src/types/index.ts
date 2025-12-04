/**
 * Core types and interfaces for AgentDAO TypeScript agents
 */

/**
 * Agent types in the evaluation system
 */
export enum AgentType {
  INTAKE = 'intake',
  TECHNICAL = 'technical',
  IMPACT = 'impact',
  DUE_DILIGENCE = 'due_diligence',
  BUDGET = 'budget',
  COMMUNITY = 'community',
  COORDINATOR = 'coordinator',
  EXECUTOR = 'executor'
}

/**
 * Grant evaluation score range: -2 (strongly reject) to +2 (strongly approve)
 */
export type EvaluationScore = -2 | -1 | 0 | 1 | 2;

/**
 * Result of an agent's evaluation
 */
export interface EvaluationResult {
  /** The grant ID being evaluated */
  grantId: number;
  
  /** Type of agent performing evaluation */
  agentType: AgentType;
  
  /** Evaluation score: -2 to +2 */
  score: EvaluationScore;
  
  /** Detailed reasoning for the score */
  reasoning: string;
  
  /** Specific concerns identified (if any) */
  concerns?: string[];
  
  /** Recommendations for improvement */
  recommendations?: string[];
  
  /** Confidence level (0-1) */
  confidence: number;
  
  /** Timestamp of evaluation */
  timestamp: Date;
}

/**
 * Grant information structure
 */
export interface Grant {
  /** Unique grant ID */
  id: number;
  
  /** Applicant wallet address */
  applicant: string;
  
  /** IPFS hash containing full proposal */
  ipfsHash: string;
  
  /** Requested funding amount (in wei) */
  amount: string;
  
  /** Current grant status */
  status: GrantStatus;
  
  /** Submission timestamp */
  createdAt: Date;
  
  /** Grant proposal details (fetched from IPFS) */
  proposal?: GrantProposal;
}

/**
 * Grant status enum
 */
export enum GrantStatus {
  PENDING = 0,
  UNDER_REVIEW = 1,
  APPROVED = 2,
  REJECTED = 3,
  FUNDED = 4,
  COMPLETED = 5,
  CANCELLED = 6
}

/**
 * Full grant proposal structure (stored in IPFS)
 */
export interface GrantProposal {
  /** Project name */
  projectName: string;
  
  /** Project description */
  description: string;
  
  /** Technology stack */
  techStack?: string[];
  
  /** System architecture description */
  architecture?: string;
  
  /** Project timeline */
  timeline?: string;
  
  /** Team experience */
  teamExperience?: string;
  
  /** GitHub repositories */
  githubRepos?: string[];
  
  /** Target users */
  targetUsers?: string;
  
  /** Ecosystem gap being addressed */
  ecosystemGap?: string;
  
  /** DAO alignment explanation */
  daoAlignment?: string;
  
  /** Potential reach/impact */
  potentialReach?: string;
  
  /** Team members */
  teamMembers?: TeamMember[];
  
  /** Previous projects */
  previousProjects?: PreviousProject[];
  
  /** References */
  references?: string[];
  
  /** Budget breakdown */
  budgetBreakdown?: Record<string, number>;
  
  /** Comparable projects */
  comparableProjects?: string[];
}

/**
 * Team member information
 */
export interface TeamMember {
  name: string;
  github?: string;
  wallet?: string;
  role?: string;
}

/**
 * Previous project information
 */
export interface PreviousProject {
  name: string;
  url: string;
  status: string;
  description?: string;
}

/**
 * Milestone structure for grant funding
 */
export interface Milestone {
  number: number;
  amount: number;
  deliverable: string;
  deadlineDays: number;
  paymentType: 'upfront' | 'on_completion';
}

/**
 * Configuration for blockchain connection
 */
export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddresses: {
    grantRegistry: string;
    agentVoting: string;
    grantTreasury: string;
  };
}

/**
 * Configuration for IPFS connection
 */
export interface IPFSConfig {
  gatewayUrl: string;
  apiUrl?: string;
  apiKey?: string;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  agentType: AgentType;
  blockchain: BlockchainConfig;
  ipfs: IPFSConfig;
  pythonApiUrl: string;
  pythonApiKey: string;
  groqApiKey?: string;
}

/**
 * Error types
 */
export enum AgentErrorType {
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  IPFS_ERROR = 'IPFS_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EVALUATION_ERROR = 'EVALUATION_ERROR'
}

/**
 * Custom error class for agent operations
 */
export class AgentError extends Error {
  constructor(
    public type: AgentErrorType,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'AgentError';
  }
}
