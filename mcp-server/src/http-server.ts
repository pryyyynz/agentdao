/**
 * HTTP API Server for MCP - Receives webhooks from Python services
 * Triggers orchestration when new grants are submitted
 */

import express, { Express, Request, Response } from 'express';
import { Orchestrator, OrchestratorConfig } from './orchestrator.js';
import { AgentType } from './types.js';
import { AgentFactory } from './agents/agent-factory.js';

const app: Express = express();
app.use(express.json());

// Initialize orchestrator
const config: OrchestratorConfig = {
  evaluationTimeoutMs: 5 * 60 * 1000, // 5 minutes
  parallelEvaluations: true,
  requiredEvaluators: [
    AgentType.TECHNICAL,
    AgentType.IMPACT,
    AgentType.DUE_DILIGENCE,
    AgentType.BUDGET,
    AgentType.COMMUNITY
  ],
  approvalThreshold: 0.7,
  healthCheckIntervalMs: 60 * 1000, // 1 minute
  milestoneCheckIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  retryDelayMs: 5000,
  pythonServicesUrl: process.env.PYTHON_SERVICES_URL || 'http://localhost:8000',
  pythonApiKey: process.env.PYTHON_API_KEY || '',
};

const orchestrator = new Orchestrator(config);

// Create and start evaluator agents
const pythonServiceUrl = process.env.PYTHON_SERVICES_URL || 'http://localhost:8000';
const agentFactory = new AgentFactory(pythonServiceUrl);
const evaluatorAgents = agentFactory.createEvaluators();

// Start orchestrator and agents
orchestrator.start().catch((error) => {
  console.error('[HTTP Server] Failed to start orchestrator:', error);
  process.exit(1);
});

// Start all evaluator agents
evaluatorAgents.forEach((agent, agentType) => {
  agent.start(orchestrator.getCommunication());
  console.log(`[HTTP Server] Started ${agentType} agent`);
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  const stats = orchestrator.getStats();
  res.json({
    status: 'healthy',
    orchestrator: 'running',
    stats
  });
});

/**
 * Trigger grant evaluation
 */
app.post('/api/grants/evaluate', async (req: Request, res: Response) => {
  try {
    const { grant_id, applicant, project_name } = req.body;

    if (!grant_id || !applicant || !project_name) {
      return res.status(400).json({
        error: 'Missing required fields: grant_id, applicant, project_name'
      });
    }

    console.log(`[HTTP Server] Received evaluation request for grant ${grant_id}: ${project_name}`);

    // Process grant through orchestrator - pass full request body including actual grant_id
    const grantId = await orchestrator.processNewGrant({
      id: grant_id, // Use actual database grant ID
      applicant,
      ipfs_hash: req.body.ipfs_hash || '',
      project_name,
      description: req.body.description || '',
      amount: req.body.amount || 0,
      // Pass through all additional fields for AI agents
      ...req.body
    });

    res.json({
      success: true,
      message: 'Grant evaluation started',
      grant_id: grantId
    });

  } catch (error) {
    console.error('[HTTP Server] Error triggering evaluation:', error);
    res.status(500).json({
      error: 'Failed to trigger evaluation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get workflow status
 */
app.get('/api/grants/:grantId/status', (req: Request, res: Response) => {
  try {
    const grantId = parseInt(req.params.grantId);
    const workflow = orchestrator.getWorkflowStatus(grantId);

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      workflow
    });

  } catch (error) {
    console.error('[HTTP Server] Error getting workflow status:', error);
    res.status(500).json({
      error: 'Failed to get workflow status'
    });
  }
});

/**
 * Get orchestrator statistics
 */
app.get('/api/stats', (req: Request, res: Response) => {
  const stats = orchestrator.getStats();
  res.json({
    success: true,
    stats
  });
});

// Start HTTP server
const PORT = process.env.MCP_HTTP_PORT || 3100;
app.listen(PORT, () => {
  console.log(`[HTTP Server] Listening on port ${PORT}`);
  console.log(`[HTTP Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[HTTP Server] Trigger evaluation: POST http://localhost:${PORT}/api/grants/evaluate`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[HTTP Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[HTTP Server] Shutting down...');
  process.exit(0);
});
