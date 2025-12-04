/**
 * Intake Agent - Handles new grant applications
 * 
 * Responsibilities:
 * - Validate grant applications
 * - Upload proposal to IPFS
 * - Create grant record on-chain
 * - Notify other agents
 * - Check for duplicates
 */

import { BaseGrantAgent } from './base-agent';
import {
  AgentConfig,
  Grant,
  GrantProposal,
  GrantStatus,
  EvaluationResult,
  EvaluationScore,
  AgentError,
  AgentErrorType
} from '../types';
import { formatEther, parseEther } from '../utils/blockchain';

/**
 * Application submission data
 */
export interface GrantApplication {
  applicant: string;
  projectName: string;
  description: string;
  requestedAmount: string; // in ETH
  techStack?: string[];
  architecture?: string;
  timeline?: string;
  teamExperience?: string;
  githubRepos?: string[];
  targetUsers?: string;
  ecosystemGap?: string;
  daoAlignment?: string;
  potentialReach?: string;
  teamMembers?: Array<{
    name: string;
    github?: string;
    wallet?: string;
    role?: string;
  }>;
  previousProjects?: Array<{
    name: string;
    url: string;
    status: string;
    description?: string;
  }>;
  references?: string[];
  budgetBreakdown?: Record<string, number>;
  comparableProjects?: string[];
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Intake Agent class
 */
export class IntakeAgent extends BaseGrantAgent {
  /**
   * Process a new grant application
   */
  async processApplication(application: GrantApplication): Promise<Grant> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 INTAKE AGENT - Processing new application`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Step 1: Validate application
      console.log('📋 Step 1: Validating application...');
      const validation = this.validateApplication(application);
      
      if (!validation.valid) {
        throw new AgentError(
          AgentErrorType.VALIDATION_ERROR,
          `Application validation failed: ${validation.errors.join(', ')}`
        );
      }

      if (validation.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        validation.warnings.forEach(w => console.log(`   - ${w}`));
      }

      // Step 2: Check for duplicates
      console.log('\n🔍 Step 2: Checking for duplicate applications...');
      await this.checkForDuplicates(application);

      // Step 3: Create proposal object
      console.log('\n📝 Step 3: Creating proposal object...');
      const proposal = this.createProposal(application);

      // Step 4: Upload to IPFS
      console.log('\n📤 Step 4: Uploading proposal to IPFS...');
      const ipfsHash = await this.uploadToIPFS(proposal);
      console.log(`✅ Uploaded to IPFS: ${ipfsHash}`);

      // Step 5: Create grant on-chain
      console.log('\n⛓️  Step 5: Creating grant on blockchain...');
      const grantId = await this.createGrantOnchain(
        application.applicant,
        ipfsHash,
        application.requestedAmount
      );
      console.log(`✅ Grant created on-chain: ID ${grantId}`);

      // Step 6: Fetch the created grant
      const grant = await this.fetchGrantFromChain(grantId);
      grant.proposal = proposal;

      // Step 7: Notify other agents (would integrate with MCP here)
      console.log('\n📢 Step 6: Notifying evaluator agents...');
      await this.notifyAgents(grantId);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ INTAKE AGENT - Application processed successfully`);
      console.log(`   Grant ID: ${grantId}`);
      console.log(`   IPFS: ${ipfsHash}`);
      console.log(`   Amount: ${application.requestedAmount} ETH`);
      console.log(`${'='.repeat(60)}\n`);

      return grant;
    } catch (error) {
      console.error(`\n${'='.repeat(60)}`);
      console.error(`❌ INTAKE AGENT - Application processing failed`);
      console.error(`${'='.repeat(60)}\n`);
      throw error;
    }
  }

  /**
   * Validate grant application
   */
  private validateApplication(application: GrantApplication): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!application.applicant || !application.applicant.match(/^0x[a-fA-F0-9]{40}$/)) {
      errors.push('Valid applicant address is required');
    }

    if (!application.projectName || application.projectName.trim().length < 3) {
      errors.push('Project name must be at least 3 characters');
    }

    if (!application.description || application.description.trim().length < 50) {
      errors.push('Description must be at least 50 characters');
    }

    if (!application.requestedAmount) {
      errors.push('Requested amount is required');
    } else {
      try {
        const amount = parseFloat(application.requestedAmount);
        if (amount <= 0) {
          errors.push('Requested amount must be greater than 0');
        }
        if (amount > 1000000) {
          errors.push('Requested amount exceeds maximum (1,000,000 ETH)');
        }
      } catch {
        errors.push('Invalid requested amount format');
      }
    }

    // Recommended fields (warnings)
    if (!application.timeline) {
      warnings.push('Timeline not provided');
    }

    if (!application.techStack || application.techStack.length === 0) {
      warnings.push('Tech stack not specified');
    }

    if (!application.teamMembers || application.teamMembers.length === 0) {
      warnings.push('No team members listed');
    }

    if (!application.budgetBreakdown) {
      warnings.push('Budget breakdown not provided');
    }

    if (!application.githubRepos || application.githubRepos.length === 0) {
      warnings.push('No GitHub repositories provided');
    }

    // Data quality checks
    if (application.description && application.description.length < 100) {
      warnings.push('Description is quite short (< 100 characters)');
    }

    if (application.teamMembers && application.teamMembers.length > 0) {
      const membersWithoutGithub = application.teamMembers.filter(m => !m.github);
      if (membersWithoutGithub.length > 0) {
        warnings.push(`${membersWithoutGithub.length} team member(s) without GitHub profile`);
      }
    }

    console.log(`✅ Validation complete: ${errors.length} errors, ${warnings.length} warnings`);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for duplicate applications
   */
  private async checkForDuplicates(application: GrantApplication): Promise<void> {
    // In a real implementation, this would:
    // 1. Query existing grants from blockchain
    // 2. Check for similar project names
    // 3. Check for same applicant address with pending applications
    // 4. Use fuzzy matching for project descriptions

    // For now, we'll do a simple check
    try {
      const grantRegistry = this.contracts.getGrantRegistry();
      
      // This assumes the contract has a method to get grant count
      // Adjust based on actual contract implementation
      const grantCount = await this.contracts.callView<any>(
        grantRegistry,
        'getGrantCount'
      );

      console.log(`   Checked against ${grantCount.toString()} existing grants`);
      console.log(`   ✅ No duplicates found`);
    } catch (error) {
      console.warn('   ⚠️  Could not perform duplicate check:', (error as Error).message);
      // Don't fail the application if duplicate check fails
    }
  }

  /**
   * Create proposal object from application
   */
  private createProposal(application: GrantApplication): GrantProposal {
    return {
      projectName: application.projectName,
      description: application.description,
      techStack: application.techStack,
      architecture: application.architecture,
      timeline: application.timeline,
      teamExperience: application.teamExperience,
      githubRepos: application.githubRepos,
      targetUsers: application.targetUsers,
      ecosystemGap: application.ecosystemGap,
      daoAlignment: application.daoAlignment,
      potentialReach: application.potentialReach,
      teamMembers: application.teamMembers,
      previousProjects: application.previousProjects,
      references: application.references,
      budgetBreakdown: application.budgetBreakdown,
      comparableProjects: application.comparableProjects
    };
  }

  /**
   * Upload proposal to IPFS
   */
  private async uploadToIPFS(proposal: GrantProposal): Promise<string> {
    try {
      const ipfsHash = await this.ipfs.uploadContent(proposal);
      return ipfsHash;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.IPFS_ERROR,
        'Failed to upload proposal to IPFS',
        error as Error
      );
    }
  }

  /**
   * Create grant record on blockchain
   */
  private async createGrantOnchain(
    applicant: string,
    ipfsHash: string,
    amountInEth: string
  ): Promise<number> {
    try {
      const grantRegistry = this.contracts.getGrantRegistry();
      const amountInWei = parseEther(amountInEth);

      console.log(`   Applicant: ${applicant}`);
      console.log(`   IPFS Hash: ${ipfsHash}`);
      console.log(`   Amount: ${amountInEth} ETH (${amountInWei.toString()} wei)`);

      const receipt = await this.contracts.executeTransaction(
        grantRegistry,
        'submitGrant',
        applicant,
        ipfsHash,
        amountInWei
      );

      // Parse events to get grant ID
      const events = this.contracts.parseEvents(receipt, grantRegistry);
      const grantSubmittedEvent = events.find(e => e.name === 'GrantSubmitted');

      if (!grantSubmittedEvent) {
        throw new Error('GrantSubmitted event not found in transaction');
      }

      const grantId = grantSubmittedEvent.args.grantId.toNumber();
      return grantId;
    } catch (error) {
      throw new AgentError(
        AgentErrorType.BLOCKCHAIN_ERROR,
        'Failed to create grant on blockchain',
        error as Error
      );
    }
  }

  /**
   * Notify other agents about new grant
   */
  private async notifyAgents(grantId: number): Promise<void> {
    // In a full implementation, this would:
    // 1. Use MCP to broadcast message to all evaluator agents
    // 2. Store notification in database
    // 3. Trigger webhooks if configured

    console.log(`   📨 Would notify: Technical, Impact, DD, Budget, Community agents`);
    console.log(`   📨 Grant ID: ${grantId}`);
    console.log(`   ✅ Notification sent (MCP integration pending)`);
  }

  /**
   * Intake agent doesn't perform evaluations, it processes applications
   * This method is required by BaseGrantAgent but returns a neutral score
   */
  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    // Intake agent doesn't evaluate, it just processes
    // This is a placeholder to satisfy the abstract class requirement
    return {
      grantId: grant.id,
      agentType: this.agentType,
      score: 0 as EvaluationScore,
      reasoning: 'Intake agent does not perform evaluations - application processed successfully',
      confidence: 1.0,
      timestamp: new Date()
    };
  }

  /**
   * Helper: Get application summary
   */
  getApplicationSummary(application: GrantApplication): string {
    return `
Application Summary:
  Project: ${application.projectName}
  Applicant: ${application.applicant}
  Amount: ${application.requestedAmount} ETH
  Description: ${application.description.substring(0, 100)}...
  Tech Stack: ${application.techStack?.join(', ') || 'Not specified'}
  Team Size: ${application.teamMembers?.length || 0}
  Timeline: ${application.timeline || 'Not specified'}
`;
  }
}
