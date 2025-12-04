/**
 * Tests for IntakeAgent
 */

import { IntakeAgent, GrantApplication } from '../src/agents/intake-agent';
import { AgentConfig, AgentType, GrantStatus } from '../src/types';

describe('IntakeAgent', () => {
  let mockConfig: AgentConfig;
  let agent: IntakeAgent;

  beforeEach(() => {
    mockConfig = {
      agentType: AgentType.INTAKE,
      blockchain: {
        rpcUrl: 'http://localhost:8545',
        privateKey: '0x' + '0'.repeat(64),
        contractAddresses: {
          grantRegistry: '0x' + '1'.repeat(40),
          agentVoting: '0x' + '2'.repeat(40),
          grantTreasury: '0x' + '3'.repeat(40)
        }
      },
      ipfs: {
        gatewayUrl: 'https://gateway.pinata.cloud/ipfs/',
        apiUrl: 'https://api.pinata.cloud',
        apiKey: 'test-key'
      },
      pythonApiUrl: 'http://localhost:8000',
      pythonApiKey: 'test-key'
    };

    agent = new IntakeAgent(mockConfig);
  });

  describe('Application Validation', () => {
    it('should accept valid application', () => {
      const validApp: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'A'.repeat(100), // 100 characters
        requestedAmount: '50000',
        techStack: ['Solidity', 'TypeScript'],
        timeline: '6 months'
      };

      const validation = (agent as any).validateApplication(validApp);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject application with invalid applicant address', () => {
      const invalidApp: GrantApplication = {
        applicant: 'invalid-address',
        projectName: 'Test Project',
        description: 'A'.repeat(100),
        requestedAmount: '50000'
      };

      const validation = (agent as any).validateApplication(invalidApp);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Valid applicant address is required');
    });

    it('should reject application with short project name', () => {
      const invalidApp: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'AB',
        description: 'A'.repeat(100),
        requestedAmount: '50000'
      };

      const validation = (agent as any).validateApplication(invalidApp);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Project name must be at least 3 characters');
    });

    it('should reject application with short description', () => {
      const invalidApp: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'Too short',
        requestedAmount: '50000'
      };

      const validation = (agent as any).validateApplication(invalidApp);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Description must be at least 50 characters');
    });

    it('should reject application with invalid amount', () => {
      const invalidApp: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'A'.repeat(100),
        requestedAmount: '0'
      };

      const validation = (agent as any).validateApplication(invalidApp);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Requested amount must be greater than 0');
    });

    it('should reject application with excessive amount', () => {
      const invalidApp: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'A'.repeat(100),
        requestedAmount: '2000000'
      };

      const validation = (agent as any).validateApplication(invalidApp);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Requested amount exceeds maximum (1,000,000 ETH)');
    });

    it('should warn about missing recommended fields', () => {
      const minimalApp: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'A'.repeat(100),
        requestedAmount: '50000'
      };

      const validation = (agent as any).validateApplication(minimalApp);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings).toContain('Timeline not provided');
      expect(validation.warnings).toContain('Tech stack not specified');
    });

    it('should warn about short description', () => {
      const app: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'A'.repeat(80), // Between 50-100 characters
        requestedAmount: '50000'
      };

      const validation = (agent as any).validateApplication(app);
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain('Description is quite short (< 100 characters)');
    });

    it('should warn about team members without GitHub', () => {
      const app: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'A'.repeat(100),
        requestedAmount: '50000',
        teamMembers: [
          { name: 'Alice', github: 'alice' },
          { name: 'Bob' }, // No GitHub
          { name: 'Charlie' } // No GitHub
        ]
      };

      const validation = (agent as any).validateApplication(app);
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.includes('2 team member(s) without GitHub profile'))).toBe(true);
    });
  });

  describe('Proposal Creation', () => {
    it('should create proposal from application', () => {
      const app: GrantApplication = {
        applicant: '0x' + '1'.repeat(40),
        projectName: 'Test Project',
        description: 'Test description',
        requestedAmount: '50000',
        techStack: ['Solidity', 'TypeScript'],
        architecture: 'Microservices',
        timeline: '6 months',
        teamExperience: '3 years',
        githubRepos: ['https://github.com/test/repo'],
        targetUsers: 'Developers',
        ecosystemGap: 'Missing feature',
        daoAlignment: 'Aligned with mission',
        potentialReach: '1000 users',
        teamMembers: [{ name: 'Alice', github: 'alice' }],
        previousProjects: [{ name: 'OldProject', url: 'https://...', status: 'Complete' }],
        references: ['0xRef1'],
        budgetBreakdown: { development: 30000, audit: 20000 },
        comparableProjects: ['Project1']
      };

      const proposal = (agent as any).createProposal(app);

      expect(proposal.projectName).toBe(app.projectName);
      expect(proposal.description).toBe(app.description);
      expect(proposal.techStack).toEqual(app.techStack);
      expect(proposal.architecture).toBe(app.architecture);
      expect(proposal.timeline).toBe(app.timeline);
      expect(proposal.teamExperience).toBe(app.teamExperience);
      expect(proposal.githubRepos).toEqual(app.githubRepos);
      expect(proposal.targetUsers).toBe(app.targetUsers);
      expect(proposal.ecosystemGap).toBe(app.ecosystemGap);
      expect(proposal.daoAlignment).toBe(app.daoAlignment);
      expect(proposal.potentialReach).toBe(app.potentialReach);
      expect(proposal.teamMembers).toEqual(app.teamMembers);
      expect(proposal.previousProjects).toEqual(app.previousProjects);
      expect(proposal.references).toEqual(app.references);
      expect(proposal.budgetBreakdown).toEqual(app.budgetBreakdown);
      expect(proposal.comparableProjects).toEqual(app.comparableProjects);
    });
  });

  describe('Application Summary', () => {
    it('should generate application summary', () => {
      const app: GrantApplication = {
        applicant: '0x1234567890123456789012345678901234567890',
        projectName: 'Test Project',
        description: 'A'.repeat(200),
        requestedAmount: '50000',
        techStack: ['Solidity', 'TypeScript'],
        teamMembers: [
          { name: 'Alice' },
          { name: 'Bob' }
        ],
        timeline: '6 months'
      };

      const summary = agent.getApplicationSummary(app);

      expect(summary).toContain('Test Project');
      expect(summary).toContain('0x1234567890123456789012345678901234567890');
      expect(summary).toContain('50000 ETH');
      expect(summary).toContain('Solidity, TypeScript');
      expect(summary).toContain('2');
      expect(summary).toContain('6 months');
    });

    it('should handle missing optional fields in summary', () => {
      const minimalApp: GrantApplication = {
        applicant: '0x1234567890123456789012345678901234567890',
        projectName: 'Minimal Project',
        description: 'A'.repeat(100),
        requestedAmount: '10000'
      };

      const summary = agent.getApplicationSummary(minimalApp);

      expect(summary).toContain('Minimal Project');
      expect(summary).toContain('Not specified');
      expect(summary).toContain('0'); // team size
    });
  });

  describe('Agent Type', () => {
    it('should be intake agent type', () => {
      expect(agent.getAgentType()).toBe(AgentType.INTAKE);
    });
  });
});
