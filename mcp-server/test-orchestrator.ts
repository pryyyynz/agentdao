#!/usr/bin/env tsx

/**
 * Quick Orchestrator Test Script
 * 
 * This script validates the orchestrator implementation by:
 * 1. Creating and starting an orchestrator
 * 2. Processing a test grant
 * 3. Simulating evaluations
 * 4. Checking results
 * 5. Verifying health and statistics
 */

import { Orchestrator } from './src/orchestrator.js';
import { AgentType, GrantStatus } from './src/types.js';

async function testOrchestrator() {
  console.log('='.repeat(60));
  console.log('ORCHESTRATOR QUICK TEST');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. Create orchestrator
    console.log('1. Creating orchestrator...');
    const orchestrator = new Orchestrator({
      evaluationTimeoutMs: 60000,
      parallelEvaluations: true,
      healthCheckIntervalMs: 10000,
    });
    console.log('   ✓ Orchestrator created');

    // 2. Start orchestrator
    console.log('\n2. Starting orchestrator...');
    await orchestrator.start();
    console.log('   ✓ Orchestrator started');

    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Check system health
    console.log('\n3. Checking system health...');
    const health = orchestrator.getSystemHealth();
    console.log(`   Status: ${health.status}`);
    console.log(`   Agents: ${health.agents.length}`);
    const healthyCount = health.agents.filter(a => a.status === 'healthy').length;
    console.log(`   Healthy: ${healthyCount}/${health.agents.length}`);

    if (healthyCount !== 8) {
      throw new Error(`Expected 8 healthy agents, got ${healthyCount}`);
    }
    console.log('   ✓ All agents healthy');

    // 4. Process a grant
    console.log('\n4. Processing test grant...');
    const grantData = {
      applicant: '0x1234567890123456789012345678901234567890',
      ipfs_hash: 'QmTest123abc',
      project_name: 'Test Project',
      description: 'Test grant for orchestrator validation',
      amount: 50000,
    };

    const grantId = await orchestrator.processNewGrant(grantData);
    console.log(`   Grant ID: ${grantId}`);
    console.log('   ✓ Grant submitted');

    // Wait for workflow initialization
    await new Promise(resolve => setTimeout(resolve, 500));

    // 5. Check workflow status
    console.log('\n5. Checking workflow status...');
    const workflow = orchestrator.getWorkflowStatus(grantId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    console.log(`   Stage: ${workflow.stage}`);
    console.log(`   Progress: ${workflow.progress}%`);
    console.log('   ✓ Workflow created');

    // 6. Simulate evaluations
    console.log('\n6. Simulating evaluations...');
    const dataStore = (orchestrator as any).dataStore;

    const evaluators = [
      AgentType.TECHNICAL,
      AgentType.IMPACT,
      AgentType.DUE_DILIGENCE,
      AgentType.BUDGET,
      AgentType.COMMUNITY,
    ];

    for (const agentType of evaluators) {
      dataStore.addEvaluation({
        grant_id: grantId,
        agent_type: agentType,
        score: 1,
        reasoning: `${agentType} evaluation completed`,
        evaluation_data: { test: true },
      });
      console.log(`   ✓ ${agentType} evaluation added`);
    }

    // 7. Trigger voting
    console.log('\n7. Coordinating voting...');
    await (orchestrator as any).coordinateVoting(grantId);
    console.log('   ✓ Voting completed');

    // Wait for decision execution
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 8. Check final result
    console.log('\n8. Checking final result...');
    const finalWorkflow = orchestrator.getWorkflowStatus(grantId);
    if (!finalWorkflow) {
      throw new Error('Final workflow not found');
    }
    console.log(`   Stage: ${finalWorkflow.stage}`);
    console.log(`   Progress: ${finalWorkflow.progress}%`);

    const grant = dataStore.getGrant(grantId);
    console.log(`   Status: ${grant.status}`);

    if (grant.status !== GrantStatus.APPROVED) {
      throw new Error(`Expected APPROVED status, got ${grant.status}`);
    }
    console.log('   ✓ Grant approved correctly');

    // 9. Check statistics
    console.log('\n9. Checking statistics...');
    const stats = orchestrator.getStats();
    console.log(`   Grants processed: ${stats.grantsProcessed}`);
    console.log(`   Grants approved: ${stats.grantsApproved}`);
    console.log(`   Grants rejected: ${stats.grantsRejected}`);
    console.log(`   Average time: ${stats.averageEvaluationTime}ms`);

    if (stats.grantsProcessed !== 1) {
      throw new Error(`Expected 1 grant processed, got ${stats.grantsProcessed}`);
    }
    if (stats.grantsApproved !== 1) {
      throw new Error(`Expected 1 grant approved, got ${stats.grantsApproved}`);
    }
    console.log('   ✓ Statistics correct');

    // 10. Shutdown
    console.log('\n10. Shutting down...');
    await orchestrator.shutdown();
    console.log('   ✓ Shutdown complete');

    console.log('\n' + '='.repeat(60));
    console.log('ALL TESTS PASSED ✓');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('TEST FAILED ✗');
    console.error('='.repeat(60));
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the test
testOrchestrator().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
