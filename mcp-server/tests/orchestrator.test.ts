/**
 * Orchestrator Integration Tests
 * 
 * Comprehensive tests for the orchestrator including:
 * - Agent initialization
 * - Grant processing workflow
 * - Parallel evaluations
 * - Voting and decision execution
 * - Health checks
 * - Error recovery
 * - Graceful shutdown
 */

import { Orchestrator, OrchestratorConfig } from '../src/orchestrator';
import { AgentType, GrantStatus } from '../src/types';

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  
  const testConfig: Partial<OrchestratorConfig> = {
    evaluationTimeoutMs: 10000, // 10 seconds for tests
    parallelEvaluations: true,
    healthCheckIntervalMs: 5000,
    milestoneCheckIntervalMs: 10000,
  };

  beforeEach(async () => {
    orchestrator = new Orchestrator(testConfig);
  });

  afterEach(async () => {
    if (orchestrator) {
      await orchestrator.shutdown();
    }
  });

  describe('Initialization', () => {
    test('should create orchestrator with default config', () => {
      const orch = new Orchestrator();
      expect(orch).toBeDefined();
      expect(orch.getStats()).toBeDefined();
    });

    test('should create orchestrator with custom config', () => {
      const customConfig: Partial<OrchestratorConfig> = {
        evaluationTimeoutMs: 60000,
        parallelEvaluations: false,
        approvalThreshold: 0.6,
      };
      const orch = new Orchestrator(customConfig);
      expect(orch).toBeDefined();
    });

    test('should initialize all agents', async () => {
      await orchestrator.start();
      
      const health = orchestrator.getAgentHealth();
      expect(Array.isArray(health)).toBe(true);
      
      if (Array.isArray(health)) {
        expect(health.length).toBe(8); // All 8 agent types
        
        const agentTypes = health.map(h => h.agentType);
        expect(agentTypes).toContain(AgentType.INTAKE);
        expect(agentTypes).toContain(AgentType.TECHNICAL);
        expect(agentTypes).toContain(AgentType.IMPACT);
        expect(agentTypes).toContain(AgentType.DUE_DILIGENCE);
        expect(agentTypes).toContain(AgentType.BUDGET);
        expect(agentTypes).toContain(AgentType.COMMUNITY);
        expect(agentTypes).toContain(AgentType.COORDINATOR);
        expect(agentTypes).toContain(AgentType.EXECUTOR);
      }
    });
  });

  describe('Grant Processing', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should process new grant submission', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      
      expect(grantId).toBeGreaterThan(0);
      
      const workflow = orchestrator.getWorkflowStatus(grantId);
      expect(workflow).toBeDefined();
      expect(workflow?.grantId).toBe(grantId);
      expect(workflow?.stage).toMatch(/submission|evaluation/);
    });

    test('should track workflow progress', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const workflow = orchestrator.getWorkflowStatus(grantId);
      expect(workflow).toBeDefined();
      expect(workflow?.progress).toBeGreaterThan(0);
      expect(workflow?.progress).toBeLessThanOrEqual(100);
    });

    test('should handle multiple concurrent grants', async () => {
      const grants = [
        {
          applicant: '0x1111111111111111111111111111111111111111',
          ipfs_hash: 'QmTest1',
          project_name: 'Project 1',
          description: 'Description 1',
          amount: 30000,
        },
        {
          applicant: '0x2222222222222222222222222222222222222222',
          ipfs_hash: 'QmTest2',
          project_name: 'Project 2',
          description: 'Description 2',
          amount: 40000,
        },
        {
          applicant: '0x3333333333333333333333333333333333333333',
          ipfs_hash: 'QmTest3',
          project_name: 'Project 3',
          description: 'Description 3',
          amount: 50000,
        },
      ];

      const grantIds = await Promise.all(
        grants.map(grant => orchestrator.processNewGrant(grant))
      );

      expect(grantIds).toHaveLength(3);
      expect(new Set(grantIds).size).toBe(3); // All unique IDs
      
      const activeWorkflows = orchestrator.getActiveWorkflows();
      expect(activeWorkflows.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Evaluation Coordination', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should coordinate parallel evaluations', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const workflow = orchestrator.getWorkflowStatus(grantId);
      expect(workflow).toBeDefined();
      expect(workflow?.stage).toMatch(/submission|evaluation/);
      
      // Check that evaluations are pending for all required evaluators
      const requiredEvaluators = [
        AgentType.TECHNICAL,
        AgentType.IMPACT,
        AgentType.DUE_DILIGENCE,
        AgentType.BUDGET,
        AgentType.COMMUNITY,
      ];
      
      expect(workflow?.evaluationsPending.length).toBeLessThanOrEqual(requiredEvaluators.length);
    });

    test('should complete workflow after all evaluations', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      // Listen for workflow completion
      let workflowComplete = false;
      orchestrator.on('workflow:complete', () => {
        workflowComplete = true;
      });

      const grantId = await orchestrator.processNewGrant(grantData);
      
      // Simulate evaluations
      const dataStore = (orchestrator as any).dataStore;
      
      // Add all required evaluations
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.TECHNICAL,
        score: 1,
        reasoning: 'Technical evaluation',
        evaluation_data: {},
      });
      
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.IMPACT,
        score: 1,
        reasoning: 'Impact evaluation',
        evaluation_data: {},
      });
      
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.DUE_DILIGENCE,
        score: 1,
        reasoning: 'Due diligence evaluation',
        evaluation_data: {},
      });
      
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.BUDGET,
        score: 1,
        reasoning: 'Budget evaluation',
        evaluation_data: {},
      });
      
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.COMMUNITY,
        score: 1,
        reasoning: 'Community evaluation',
        evaluation_data: {},
      });

      // Trigger voting
      await (orchestrator as any).coordinateVoting(grantId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const workflow = orchestrator.getWorkflowStatus(grantId);
      expect(workflow?.stage).toMatch(/decision|execution|complete/);
    });
  });

  describe('Voting and Decision', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should approve grant with majority positive votes', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      const dataStore = (orchestrator as any).dataStore;
      
      // Add all positive evaluations
      [AgentType.TECHNICAL, AgentType.IMPACT, AgentType.DUE_DILIGENCE, 
       AgentType.BUDGET, AgentType.COMMUNITY].forEach(agentType => {
        dataStore.addEvaluation({
          grant_id: grantId,
          agent_type: agentType,
          score: 1,
          reasoning: 'Approved',
          evaluation_data: {},
        });
      });

      await (orchestrator as any).coordinateVoting(grantId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const grant = dataStore.getGrant(grantId);
      expect(grant?.status).toBe(GrantStatus.APPROVED);
    });

    test('should reject grant with majority negative votes', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      const dataStore = (orchestrator as any).dataStore;
      
      // Add all negative evaluations
      [AgentType.TECHNICAL, AgentType.IMPACT, AgentType.DUE_DILIGENCE, 
       AgentType.BUDGET, AgentType.COMMUNITY].forEach(agentType => {
        dataStore.addEvaluation({
          grant_id: grantId,
          agent_type: agentType,
          score: 0,
          reasoning: 'Rejected',
          evaluation_data: {},
        });
      });

      await (orchestrator as any).coordinateVoting(grantId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const grant = dataStore.getGrant(grantId);
      expect(grant?.status).toBe(GrantStatus.REJECTED);
    });
  });

  describe('Health Checks', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should report system health', () => {
      const health = orchestrator.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(Array.isArray(health.agents)).toBe(true);
      expect(health.agents.length).toBe(8);
      expect(Array.isArray(health.issues)).toBe(true);
    });

    test('should track agent health', () => {
      const agentHealth = orchestrator.getAgentHealth();
      
      expect(Array.isArray(agentHealth)).toBe(true);
      
      if (Array.isArray(agentHealth)) {
        agentHealth.forEach(health => {
          expect(health.agentType).toBeDefined();
          expect(health.status).toMatch(/healthy|degraded|unhealthy/);
          expect(health.lastCheck).toBeGreaterThan(0);
          expect(health.consecutiveFailures).toBeGreaterThanOrEqual(0);
        });
      }
    });

    test('should get health for specific agent type', () => {
      const technicalHealth = orchestrator.getAgentHealth(AgentType.TECHNICAL);
      
      expect(technicalHealth).toBeDefined();
      expect((technicalHealth as any).agentType).toBe(AgentType.TECHNICAL);
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should track orchestrator statistics', async () => {
      const stats = orchestrator.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.grantsProcessed).toBeGreaterThanOrEqual(0);
      expect(stats.grantsApproved).toBeGreaterThanOrEqual(0);
      expect(stats.grantsRejected).toBeGreaterThanOrEqual(0);
      expect(stats.averageEvaluationTime).toBeGreaterThanOrEqual(0);
      expect(stats.activeWorkflows).toBeGreaterThanOrEqual(0);
      expect(stats.agentsHealthy).toBeGreaterThanOrEqual(0);
      expect(stats.agentsUnhealthy).toBeGreaterThanOrEqual(0);
    });

    test('should update statistics after grant processing', async () => {
      const initialStats = orchestrator.getStats();
      
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      
      const updatedStats = orchestrator.getStats();
      expect(updatedStats.activeWorkflows).toBeGreaterThan(initialStats.activeWorkflows);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should handle missing evaluations', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      const dataStore = (orchestrator as any).dataStore;
      
      // Add only 2 evaluations (missing 3)
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.TECHNICAL,
        score: 1,
        reasoning: 'Technical evaluation',
        evaluation_data: {},
      });
      
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.IMPACT,
        score: 1,
        reasoning: 'Impact evaluation',
        evaluation_data: {},
      });

      // Try to coordinate voting with incomplete evaluations
      await expect(
        (orchestrator as any).coordinateVoting(grantId)
      ).rejects.toThrow();
    });

    test('should emit failure events', async () => {
      let failureEmitted = false;
      
      orchestrator.on('workflow:failed', () => {
        failureEmitted = true;
      });

      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      const grantId = await orchestrator.processNewGrant(grantData);
      const dataStore = (orchestrator as any).dataStore;
      
      // Add incomplete evaluations
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: AgentType.TECHNICAL,
        score: 1,
        reasoning: 'Technical evaluation',
        evaluation_data: {},
      });

      // Try to coordinate voting
      try {
        await (orchestrator as any).coordinateVoting(grantId);
      } catch (error) {
        // Expected to fail
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      expect(failureEmitted).toBe(true);
    });
  });

  describe('Lifecycle Management', () => {
    test('should start orchestrator', async () => {
      let started = false;
      
      orchestrator.on('orchestrator:started', () => {
        started = true;
      });

      await orchestrator.start();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(started).toBe(true);
    });

    test('should shutdown gracefully', async () => {
      let shutdown = false;
      
      orchestrator.on('orchestrator:shutdown', () => {
        shutdown = true;
      });

      await orchestrator.start();
      await orchestrator.shutdown();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      expect(shutdown).toBe(true);
    });

    test('should not start twice', async () => {
      await orchestrator.start();
      
      // Second start should be no-op
      await orchestrator.start();
      
      const health = orchestrator.getAgentHealth();
      expect(Array.isArray(health)).toBe(true);
      if (Array.isArray(health)) {
        expect(health.length).toBe(8);
      }
    });
  });

  describe('Workflow Status', () => {
    beforeEach(async () => {
      await orchestrator.start();
    });

    test('should return undefined for non-existent workflow', () => {
      const workflow = orchestrator.getWorkflowStatus(999999);
      expect(workflow).toBeUndefined();
    });

    test('should get active workflows', async () => {
      const grantData = {
        applicant: '0x1234567890123456789012345678901234567890',
        ipfs_hash: 'QmTest123',
        project_name: 'Test Project',
        description: 'Test Description',
        amount: 50000,
      };

      await orchestrator.processNewGrant(grantData);
      await orchestrator.processNewGrant({ ...grantData, project_name: 'Project 2' });
      
      const activeWorkflows = orchestrator.getActiveWorkflows();
      expect(activeWorkflows.length).toBeGreaterThanOrEqual(2);
      
      activeWorkflows.forEach(workflow => {
        expect(workflow.stage).not.toBe('complete');
        expect(workflow.stage).not.toBe('failed');
      });
    });
  });
});
