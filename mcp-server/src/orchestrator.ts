/**
 * Orchestrator - Central coordination system for AgentDAO
 * 
 * Manages the complete grant evaluation lifecycle:
 * - Agent initialization and lifecycle
 * - Grant submission and evaluation workflow
 * - Parallel evaluation coordination
 * - Voting and decision execution
 * - Milestone monitoring
 * - Health checks and error recovery
 */

import { EventEmitter } from 'events';
import axios from 'axios';
import { AgentRegistry } from './agent-registry.js';
import { MessageRouter } from './message-router.js';
import { DataStore } from './data-store.js';
import { AgentCommunication, MessagePriority } from './agent-communication.js';
import { 
  AgentType, 
  MessageType, 
  Grant, 
  GrantStatus, 
  Evaluation,
  VotingResult 
} from './types.js';

export interface OrchestratorConfig {
  // Workflow settings
  evaluationTimeoutMs: number;
  parallelEvaluations: boolean;
  requiredEvaluators: AgentType[];
  approvalThreshold: number;
  
  // Monitoring settings
  healthCheckIntervalMs: number;
  milestoneCheckIntervalMs: number;
  
  // Retry settings
  maxRetries: number;
  retryDelayMs: number;
  
  // Python services
  pythonServicesUrl: string;
  pythonApiKey: string;
}

export interface AgentHealth {
  agentType: AgentType;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  consecutiveFailures: number;
  lastError?: string;
}

export interface WorkflowStatus {
  grantId: number;
  stage: 'submission' | 'evaluation' | 'voting' | 'decision' | 'execution' | 'complete' | 'failed';
  progress: number;
  evaluationsComplete: AgentType[];
  evaluationsPending: AgentType[];
  startedAt: number;
  updatedAt: number;
  error?: string;
}

export interface OrchestratorStats {
  grantsProcessed: number;
  grantsApproved: number;
  grantsRejected: number;
  averageEvaluationTime: number;
  activeWorkflows: number;
  agentsHealthy: number;
  agentsUnhealthy: number;
}

/**
 * Main Orchestrator class
 */
export class Orchestrator extends EventEmitter {
  private agentRegistry: AgentRegistry;
  private messageRouter: MessageRouter;
  private dataStore: DataStore;
  private communication: AgentCommunication;
  
  private config: OrchestratorConfig;
  private isRunning: boolean = false;
  private workflows: Map<number, WorkflowStatus> = new Map();
  private agentHealth: Map<AgentType, AgentHealth> = new Map();
  
  private healthCheckInterval?: NodeJS.Timeout;
  private milestoneCheckInterval?: NodeJS.Timeout;
  
  private stats: OrchestratorStats = {
    grantsProcessed: 0,
    grantsApproved: 0,
    grantsRejected: 0,
    averageEvaluationTime: 0,
    activeWorkflows: 0,
    agentsHealthy: 0,
    agentsUnhealthy: 0,
  };

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    
    // Set default configuration
    this.config = {
      evaluationTimeoutMs: 5 * 60 * 1000, // 5 minutes
      parallelEvaluations: true,
      requiredEvaluators: [
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET,
        AgentType.COMMUNITY,
      ],
      approvalThreshold: 50, // Average score >= 50 (out of 100) AND 3/5 approvals required
      healthCheckIntervalMs: 30 * 1000, // 30 seconds
      milestoneCheckIntervalMs: 60 * 60 * 1000, // 1 hour
      maxRetries: 3,
      retryDelayMs: 5000,
      pythonServicesUrl: process.env.PYTHON_SERVICES_URL || 'http://localhost:8000',
      pythonApiKey: process.env.PYTHON_API_KEY || '',
      ...config,
    };

    // Initialize core components
    this.agentRegistry = new AgentRegistry();
    this.messageRouter = new MessageRouter(this.agentRegistry);
    this.dataStore = new DataStore();
    this.communication = new AgentCommunication(
      this.agentRegistry,
      this.messageRouter,
      {
        maxRetries: this.config.maxRetries,
      }
    );

    console.log('[Orchestrator] Initialized');
  }

  /**
   * Initialize all agent instances
   */
  async initializeAgents(): Promise<void> {
    console.log('[Orchestrator] Initializing agents...');

    const agentTypes = [
      AgentType.INTAKE,
      AgentType.TECHNICAL,
      AgentType.IMPACT,
      AgentType.DUE_DILIGENCE,
      AgentType.BUDGET,
      AgentType.COMMUNITY,
      AgentType.COORDINATOR,
      AgentType.EXECUTOR,
    ];

    for (const agentType of agentTypes) {
      const agentId = `${agentType}-instance-1`;
      
      try {
        // Register agent
        this.agentRegistry.registerAgent(agentId, agentType);
        
        // Initialize health tracking
        this.agentHealth.set(agentType, {
          agentType,
          status: 'healthy',
          lastCheck: Date.now(),
          consecutiveFailures: 0,
        });

        console.log(`[Orchestrator] ✓ Initialized ${agentType}`);
      } catch (error) {
        console.error(`[Orchestrator] ✗ Failed to initialize ${agentType}:`, error);
        throw error;
      }
    }

    // Set up event listeners
    this.setupEventListeners();

    console.log('[Orchestrator] All agents initialized');
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Orchestrator] Already running');
      return;
    }

    console.log('[Orchestrator] Starting...');

    // Initialize agents if not already done
    const registeredAgents = this.agentRegistry.getAllAgents();
    if (registeredAgents.length === 0) {
      await this.initializeAgents();
    }

    // Start health checks
    this.startHealthChecks();

    // Start milestone monitoring
    this.startMilestoneMonitoring();

    this.isRunning = true;
    console.log('[Orchestrator] Started successfully');
    this.emit('orchestrator:started');
  }

  /**
   * Process a new grant submission
   */
  async processNewGrant(grantData: {
    id?: number; // Optional: if provided, use this ID instead of auto-generating
    applicant: string;
    ipfs_hash: string;
    project_name: string;
    description: string;
    amount: number;
    [key: string]: any; // Allow additional fields for AI evaluation
  }): Promise<number> {
    console.log(`[Orchestrator] Processing new grant: ${grantData.project_name}`);

    const startTime = Date.now();

    try {
      // 1. Get or create grant ID (use provided ID if available)
      const grantId = grantData.id || Date.now(); // Use provided ID or timestamp as fallback
      
      // Create grant record in data store
      const grant = {
        ...grantData,
        id: grantId,
        status: 'pending' as any,
        created_at: new Date().toISOString()
      };

      // 2. Initialize workflow tracking
      const workflow: WorkflowStatus = {
        grantId,
        stage: 'submission',
        progress: 10,
        evaluationsComplete: [],
        evaluationsPending: [...this.config.requiredEvaluators],
        startedAt: startTime,
        updatedAt: startTime,
      };
      this.workflows.set(grantId, workflow);
      this.stats.activeWorkflows++;

      this.emit('workflow:started', { grantId, grant });

      // 3. Notify intake agent (for IPFS upload, blockchain record, etc.)
      await this.communication.sendMessage(
        AgentType.COORDINATOR,
        AgentType.INTAKE,
        MessageType.NEW_GRANT,
        {
          grant_id: grantId,
          grant_data: grantData,
        },
        { priority: MessagePriority.HIGH }
      );

      // Update workflow
      workflow.stage = 'evaluation';
      workflow.progress = 20;
      workflow.updatedAt = Date.now();

      // 4. Request evaluations from all evaluator agents
      await this.requestEvaluations(grantId, grant);

      console.log(`[Orchestrator] Grant ${grantId} submitted for evaluation`);
      return grantId;

    } catch (error) {
      console.error('[Orchestrator] Error processing grant:', error);
      throw error;
    }
  }

  /**
   * Request evaluations from all evaluator agents
   */
  private async requestEvaluations(grantId: number, grant: Grant): Promise<void> {
    console.log(`[Orchestrator] Requesting evaluations for grant ${grantId}`);

    const workflow = this.workflows.get(grantId);
    if (!workflow) {
      throw new Error(`Workflow not found for grant ${grantId}`);
    }

    if (this.config.parallelEvaluations) {
      // Send requests to all evaluators in parallel
      const requests = this.config.requiredEvaluators.map(async (evaluatorType) => {
        return this.communication.sendMessage(
          AgentType.COORDINATOR,
          evaluatorType,
          MessageType.EVALUATION_REQUEST,
          {
            grant_id: grantId,
            grant_data: grant,
            timeout: this.config.evaluationTimeoutMs,
          },
          { priority: MessagePriority.HIGH }
        );
      });

      await Promise.all(requests);
      console.log(`[Orchestrator] Evaluation requests sent to ${this.config.requiredEvaluators.length} agents`);
    } else {
      // Send requests sequentially
      for (const evaluatorType of this.config.requiredEvaluators) {
        await this.communication.sendMessage(
          AgentType.COORDINATOR,
          evaluatorType,
          MessageType.EVALUATION_REQUEST,
          {
            grant_id: grantId,
            grant_data: grant,
            timeout: this.config.evaluationTimeoutMs,
          },
          { priority: MessagePriority.HIGH }
        );
      }
    }

    // Set timeout for evaluations
    setTimeout(() => {
      this.checkEvaluationTimeout(grantId);
    }, this.config.evaluationTimeoutMs);
  }

  /**
   * Handle evaluation completion
   */
  private async handleEvaluationComplete(grantId: number, agentType: AgentType): Promise<void> {
    const workflow = this.workflows.get(grantId);
    if (!workflow) return;

    // Update workflow progress
    workflow.evaluationsComplete.push(agentType);
    workflow.evaluationsPending = workflow.evaluationsPending.filter(t => t !== agentType);
    workflow.progress = 20 + (workflow.evaluationsComplete.length / this.config.requiredEvaluators.length) * 50;
    workflow.updatedAt = Date.now();

    console.log(
      `[Orchestrator] Grant ${grantId}: ${workflow.evaluationsComplete.length}/${this.config.requiredEvaluators.length} evaluations complete`
    );

    this.emit('evaluation:progress', { grantId, workflow });

    // Check if all evaluations are complete
    if (workflow.evaluationsPending.length === 0) {
      await this.coordinateVoting(grantId);
    }
  }

  /**
   * Coordinate voting and calculate result
   */
  private async coordinateVoting(grantId: number): Promise<void> {
    console.log(`[Orchestrator] Coordinating voting for grant ${grantId}`);

    const workflow = this.workflows.get(grantId);
    if (!workflow) return;

    workflow.stage = 'voting';
    workflow.progress = 70;
    workflow.updatedAt = Date.now();

    try {
      // Get all evaluations
      const evaluations = this.dataStore.getEvaluations(grantId);

      if (evaluations.length < this.config.requiredEvaluators.length) {
        throw new Error(`Incomplete evaluations: ${evaluations.length}/${this.config.requiredEvaluators.length}`);
      }

      // Calculate voting result
      const votingResult = this.dataStore.calculateVotingResult(grantId);

      console.log(`[Orchestrator] Voting result for grant ${grantId}:`);
      console.log(`  Total score: ${votingResult.total_score}`);
      console.log(`  Average: ${(votingResult.total_score / evaluations.length).toFixed(2)}`);
      console.log(`  Decision: ${votingResult.approved ? 'APPROVED' : 'REJECTED'}`);

      // Update workflow
      workflow.stage = 'decision';
      workflow.progress = 80;
      workflow.updatedAt = Date.now();

      // Execute decision
      await this.executeDecision(grantId, votingResult);

    } catch (error) {
      console.error(`[Orchestrator] Voting error for grant ${grantId}:`, error);
      workflow.stage = 'failed';
      workflow.error = error instanceof Error ? error.message : 'Voting failed';
      this.emit('workflow:failed', { grantId, error });
    }
  }

  /**
   * Execute approval/rejection decision
   */
  private async executeDecision(grantId: number, votingResult: VotingResult): Promise<void> {
    console.log(`[Orchestrator] Executing decision for grant ${grantId}`);

    const workflow = this.workflows.get(grantId);
    if (!workflow) return;

    workflow.stage = 'execution';
    workflow.progress = 90;
    workflow.updatedAt = Date.now();

    try {
      const status = votingResult.approved ? GrantStatus.APPROVED : GrantStatus.REJECTED;
      
      // Update local DataStore
      this.dataStore.updateGrantStatus(grantId, status);
      
      // Update external database via Python service
      // For approved grants, set to 'under_review' for admin final approval
      // For rejected grants, set to 'rejected' directly
      try {
        const statusString = votingResult.approved ? 'under_review' : 'rejected';
        await axios.patch(
          `${this.config.pythonServicesUrl}/api/v1/grants/${grantId}?status_update=${statusString}`,
          {},
          {
            headers: {
              'Content-Type': 'application/json',
              ...(this.config.pythonApiKey ? { 'X-API-Key': this.config.pythonApiKey } : {})
            }
          }
        );
        console.log(`[Orchestrator] Updated grant ${grantId} status to ${statusString} in database`);
      } catch (dbError: any) {
        console.error(`[Orchestrator] Failed to update grant status in database: ${dbError.message}`);
        // Continue workflow even if DB update fails (can be retried manually)
      }

      if (votingResult.approved) {
        // Approved - notify executor
        await this.communication.sendMessage(
          AgentType.COORDINATOR,
          AgentType.EXECUTOR,
          MessageType.APPROVAL_DECISION,
          {
            grant_id: grantId,
            decision: 'approved',
            voting_result: votingResult,
          },
          { priority: MessagePriority.HIGH }
        );

        this.stats.grantsApproved++;
        console.log(`[Orchestrator] ✓ Grant ${grantId} APPROVED`);
        
      } else {
        // Rejected
        await this.communication.sendMessage(
          AgentType.COORDINATOR,
          AgentType.EXECUTOR,
          MessageType.APPROVAL_DECISION,
          {
            grant_id: grantId,
            decision: 'rejected',
            voting_result: votingResult,
          },
          { priority: MessagePriority.NORMAL }
        );

        this.stats.grantsRejected++;
        console.log(`[Orchestrator] ✗ Grant ${grantId} REJECTED`);
      }

      // Complete workflow
      workflow.stage = 'complete';
      workflow.progress = 100;
      workflow.updatedAt = Date.now();

      // Update statistics
      const evaluationTime = workflow.updatedAt - workflow.startedAt;
      this.stats.averageEvaluationTime = 
        (this.stats.averageEvaluationTime * this.stats.grantsProcessed + evaluationTime) / 
        (this.stats.grantsProcessed + 1);
      
      this.stats.grantsProcessed++;
      this.stats.activeWorkflows--;

      this.emit('workflow:complete', { 
        grantId, 
        decision: votingResult.approved ? 'approved' : 'rejected',
        evaluationTime 
      });

    } catch (error) {
      console.error(`[Orchestrator] Execution error for grant ${grantId}:`, error);
      workflow.stage = 'failed';
      workflow.error = error instanceof Error ? error.message : 'Execution failed';
      this.emit('workflow:failed', { grantId, error });
    }
  }

  /**
   * Check for evaluation timeout
   */
  private checkEvaluationTimeout(grantId: number): void {
    const workflow = this.workflows.get(grantId);
    if (!workflow || workflow.stage !== 'evaluation') return;

    if (workflow.evaluationsPending.length > 0) {
      console.warn(
        `[Orchestrator] Evaluation timeout for grant ${grantId}. Pending: ${workflow.evaluationsPending.join(', ')}`
      );

      workflow.stage = 'failed';
      workflow.error = `Evaluation timeout. Missing evaluations from: ${workflow.evaluationsPending.join(', ')}`;
      workflow.updatedAt = Date.now();

      this.emit('evaluation:timeout', { grantId, pending: workflow.evaluationsPending });
    }
  }

  /**
   * Setup event listeners for communication
   */
  private setupEventListeners(): void {
    // Listen for vote cast events
    this.communication.on('message:delivered', (message: any) => {
      if (message.message_type === MessageType.VOTE_CAST) {
        const { grant_id, score, reasoning, confidence } = message.data;
        
        // Save evaluation to DataStore
        this.dataStore.addEvaluation({
          grant_id,
          agent_type: message.from,
          score,
          reasoning: reasoning || '',
          confidence: confidence || 0.5,
          concerns: [],
          recommendations: []
        });
        
        console.log(`[Orchestrator] Saved evaluation from ${message.from} for grant ${grant_id}`);
        
        this.handleEvaluationComplete(grant_id, message.from);
      }
    });

    // Listen for evaluation failures
    this.communication.on('message:failed', (message: any) => {
      if (message.message_type === MessageType.EVALUATION_REQUEST) {
        const { grant_id } = message.data;
        console.error(`[Orchestrator] Evaluation request failed for grant ${grant_id}`);
        this.emit('evaluation:failed', { grant_id, message });
      }
    });
  }

  /**
   * Start health checks for all agents
   */
  private startHealthChecks(): void {
    // Disabled aggressive health monitoring for mock agents
    // Agents will be assumed healthy unless explicitly marked otherwise
    console.log('[Orchestrator] Health monitoring in passive mode - agents assumed operational');
    
    // Set initial health state for all agents
    const agents = this.agentRegistry.getAllAgents();
    for (const agent of agents) {
      const health = this.agentHealth.get(agent.type);
      if (health) {
        health.status = 'healthy';
        health.consecutiveFailures = 0;
      }
    }
    
    this.stats.agentsHealthy = agents.length;
    this.stats.agentsUnhealthy = 0;
  }

  /**
   * Perform health checks on all agents
   */
  private async performHealthChecks(): Promise<void> {
    // Passive health monitoring - only check if explicitly needed
    const agents = this.agentRegistry.getAllAgents();
    let healthyCount = agents.length; // Assume all healthy in mock mode
    let unhealthyCount = 0;

    for (const agent of agents) {
      const health = this.agentHealth.get(agent.type);
      if (!health) continue;

      try {
        // In mock mode, agents are always considered healthy
        // Real implementation would check actual agent responsiveness
        health.status = 'healthy';
        health.consecutiveFailures = 0;
        health.lastCheck = Date.now();

      } catch (error) {
        health.consecutiveFailures++;
        health.status = 'unhealthy';
        health.lastError = error instanceof Error ? error.message : 'Unknown error';
        unhealthyCount++;
        console.error(`[Orchestrator] Health check failed for ${agent.type}:`, error);
      }
    }

    this.stats.agentsHealthy = healthyCount;
    this.stats.agentsUnhealthy = unhealthyCount;

    if (unhealthyCount > 0) {
      this.emit('health:degraded', { healthy: healthyCount, unhealthy: unhealthyCount });
    }
  }

  /**
   * Attempt to recover an unhealthy agent
   */
  private async recoverAgent(agentType: AgentType): Promise<void> {
    console.log(`[Orchestrator] Attempting to recover ${agentType}...`);

    try {
      // Unregister old instance
      const agents = this.agentRegistry.getAgentsByType(agentType);
      for (const agent of agents) {
        this.agentRegistry.unregisterAgent(agent.id);
      }

      // Register new instance
      const newAgentId = `${agentType}-instance-${Date.now()}`;
      this.agentRegistry.registerAgent(newAgentId, agentType);

      // Reset health tracking
      const health = this.agentHealth.get(agentType);
      if (health) {
        health.status = 'healthy';
        health.consecutiveFailures = 0;
        health.lastCheck = Date.now();
        delete health.lastError;
      }

      console.log(`[Orchestrator] ✓ Recovered ${agentType}`);
      this.emit('agent:recovered', { agentType });

    } catch (error) {
      console.error(`[Orchestrator] Failed to recover ${agentType}:`, error);
      this.emit('agent:recovery:failed', { agentType, error });
    }
  }

  /**
   * Start milestone monitoring
   */
  private startMilestoneMonitoring(): void {
    this.milestoneCheckInterval = setInterval(() => {
      this.monitorMilestones();
    }, this.config.milestoneCheckIntervalMs);

    console.log('[Orchestrator] Milestone monitoring started');
  }

  /**
   * Monitor milestones for approved grants
   */
  private async monitorMilestones(): Promise<void> {
    const approvedGrants = this.dataStore.getGrantsByStatus(GrantStatus.APPROVED);

    console.log(`[Orchestrator] Monitoring ${approvedGrants.length} approved grants`);

    for (const grant of approvedGrants) {
      // Check milestone status (would integrate with smart contracts)
      // For now, just log
      console.log(`[Orchestrator] Checking milestones for grant ${grant.id}`);
    }
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(grantId: number): WorkflowStatus | undefined {
    return this.workflows.get(grantId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): WorkflowStatus[] {
    return Array.from(this.workflows.values()).filter(
      w => w.stage !== 'complete' && w.stage !== 'failed'
    );
  }

  /**
   * Get agent health status
   */
  getAgentHealth(agentType?: AgentType): AgentHealth | AgentHealth[] {
    if (agentType) {
      const health = this.agentHealth.get(agentType);
      return health || {
        agentType,
        status: 'unhealthy',
        lastCheck: 0,
        consecutiveFailures: 999,
      };
    }
    return Array.from(this.agentHealth.values());
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): OrchestratorStats {
    return { ...this.stats };
  }

  /**
   * Get communication system for agent access
   */
  getCommunication(): AgentCommunication {
    return this.communication;
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    agents: AgentHealth[];
    workflows: number;
    issues: string[];
  } {
    const agents = Array.from(this.agentHealth.values());
    const unhealthyAgents = agents.filter(a => a.status === 'unhealthy');
    const degradedAgents = agents.filter(a => a.status === 'degraded');
    const activeWorkflows = this.getActiveWorkflows();

    const issues: string[] = [];
    
    unhealthyAgents.forEach(agent => {
      issues.push(`Agent ${agent.agentType} is unhealthy`);
    });

    degradedAgents.forEach(agent => {
      issues.push(`Agent ${agent.agentType} is degraded`);
    });

    const status = unhealthyAgents.length > 0 ? 'unhealthy' :
                   degradedAgents.length > 0 ? 'degraded' : 'healthy';

    return {
      status,
      agents,
      workflows: activeWorkflows.length,
      issues,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Orchestrator] Shutting down...');
    
    this.isRunning = false;

    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.milestoneCheckInterval) {
      clearInterval(this.milestoneCheckInterval);
    }

    // Stop communication
    this.communication.stop();

    // Wait for active workflows to complete (with timeout)
    const activeWorkflows = this.getActiveWorkflows();
    if (activeWorkflows.length > 0) {
      console.log(`[Orchestrator] Waiting for ${activeWorkflows.length} workflows to complete...`);
      
      const timeout = 30000; // 30 seconds
      const startTime = Date.now();
      
      while (this.getActiveWorkflows().length > 0 && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Unregister all agents
    const agents = this.agentRegistry.getAllAgents();
    for (const agent of agents) {
      this.agentRegistry.unregisterAgent(agent.id);
    }

    console.log('[Orchestrator] Shutdown complete');
    this.emit('orchestrator:shutdown');
  }
}
