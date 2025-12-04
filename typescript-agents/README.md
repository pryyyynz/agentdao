# TypeScript Agents - Base Agent API

This package provides the foundation for building grant evaluation agents in the AgentDAO system.

## 🚀 Current Status

**Implemented Agents:** 6/8 (75% Complete)
- ✅ IntakeAgent - Grant validation and completeness checks
- ✅ TechnicalAgent - Technical feasibility analysis
- ✅ ImpactAgent - Ecosystem impact assessment
- ✅ DueDiligenceAgent - Team credibility verification
- ✅ BudgetAgent - Financial analysis and milestone generation
- ✅ CommunityAgent - Sentiment analysis and support measurement
- 🔄 CoordinatorAgent - Multi-agent orchestration (Coming Day 19)
- 🔄 ExecutorAgent - Grant execution and fund distribution (Coming Day 20)

**Test Coverage:** 76 comprehensive test cases  
**Lines of Code:** ~6,000+ production-ready TypeScript + 38 tests

## Overview

The TypeScript agents are responsible for:
- Fetching grant data from blockchain and IPFS
- Performing evaluations using Python microservices
- Casting votes on-chain
- Coordinating the evaluation workflow

### Recent Updates (Day 18)
- ✨ Budget Analyst Agent with cost breakdown validation and milestone generation
- ✨ Community Sentiment Agent with engagement scoring and sentiment distribution
- ✨ 38 new test cases for comprehensive coverage
- ✨ Example scripts for all 6 operational agents

## Architecture

```
BaseGrantAgent (Abstract)
    ├── BlockchainConnection (utilities)
    ├── ContractManager (contract interactions)
    └── IPFSClient (content fetching)
```

## Quick Start

### Run Example Scripts

```bash
# Intake Agent - Validate grant completeness
npm run example:intake

# Technical Agent - Assess technical feasibility
npm run example:technical

# Impact Agent - Evaluate ecosystem impact
npm run example:impact

# Due Diligence Agent - Verify team credibility
npm run example:dd

# Budget Agent - Analyze financial viability
npm run example:budget

# Community Agent - Measure sentiment and support
npm run example:community
```

### Run Tests

```bash
# Run all tests (76 test cases)
npm test

# Run specific agent tests
npm test intake-agent
npm test technical-agent
npm test impact-agent
npm test due-diligence-agent
npm test budget-agent
npm test community-agent

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# Contract Addresses
GRANT_REGISTRY_ADDRESS=0x...
AGENT_VOTING_ADDRESS=0x...
GRANT_TREASURY_ADDRESS=0x...

# IPFS Configuration
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs/
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=your_pinata_key

# Python Services
PYTHON_API_URL=http://localhost:8000
PYTHON_API_KEY=your_api_key_here

# Groq API
GROQ_API_KEY=your_groq_api_key_here
```

## Core Types

### AgentType

```typescript
enum AgentType {
  INTAKE = 'intake',
  TECHNICAL = 'technical',
  IMPACT = 'impact',
  DUE_DILIGENCE = 'due_diligence',
  BUDGET = 'budget',
  COMMUNITY = 'community',
  COORDINATOR = 'coordinator',
  EXECUTOR = 'executor'
}
```

### EvaluationScore

```typescript
type EvaluationScore = -2 | -1 | 0 | 1 | 2;
```

Score meanings:
- `+2`: Strongly approve - Exceptional proposal
- `+1`: Approve - Good proposal with minor issues
- `0`: Neutral - Needs significant improvement
- `-1`: Reject - Major concerns identified
- `-2`: Strongly reject - Proposal should not be funded

### EvaluationResult

```typescript
interface EvaluationResult {
  grantId: number;
  agentType: AgentType;
  score: EvaluationScore;
  reasoning: string;
  concerns?: string[];
  recommendations?: string[];
  confidence: number; // 0-1
  timestamp: Date;
}
```

### Grant

```typescript
interface Grant {
  id: number;
  applicant: string;
  ipfsHash: string;
  amount: string; // in wei
  status: GrantStatus;
  createdAt: Date;
  proposal?: GrantProposal;
}
```

## BaseGrantAgent API

### Constructor

```typescript
constructor(config: AgentConfig)
```

Initializes the agent with blockchain, IPFS, and API configurations.

### Public Methods

#### `getAgentType(): AgentType`

Returns the agent's type.

#### `getAddress(): string`

Returns the agent's wallet address.

#### `fetchGrant(grantId: number): Promise<Grant>`

Fetches complete grant information including proposal data from IPFS.

```typescript
const grant = await agent.fetchGrant(123);
console.log(grant.proposal.projectName);
```

#### `castVoteOnchain(grantId: number, score: EvaluationScore): Promise<string>`

Casts a vote on-chain for the specified grant.

```typescript
const txHash = await agent.castVoteOnchain(123, 1);
console.log(`Vote recorded: ${txHash}`);
```

#### `hasVoted(grantId: number): Promise<boolean>`

Checks if the agent has already voted on a grant.

```typescript
const voted = await agent.hasVoted(123);
if (!voted) {
  // Perform evaluation
}
```

#### `getVotingResults(grantId: number): Promise<{ totalScore: number; finalized: boolean }>`

Gets the current voting results for a grant.

```typescript
const results = await agent.getVotingResults(123);
console.log(`Total score: ${results.totalScore}`);
```

#### `evaluateWithErrorHandling(grantId: number): Promise<EvaluationResult>`

Main evaluation workflow with comprehensive error handling.

```typescript
try {
  const result = await agent.evaluateWithErrorHandling(123);
  console.log(`Evaluation complete: Score ${result.score}`);
} catch (error) {
  if (error instanceof AgentError) {
    console.error(`Error type: ${error.type}`);
  }
}
```

#### `getBalance(): Promise<string>`

Gets the agent's wallet balance in ETH.

```typescript
const balance = await agent.getBalance();
console.log(`Balance: ${balance} ETH`);
```

### Protected Methods (for subclasses)

#### `abstract evaluate(grant: Grant): Promise<EvaluationResult>`

**Must be implemented by subclasses.** Contains the agent-specific evaluation logic.

```typescript
protected async evaluate(grant: Grant): Promise<EvaluationResult> {
  // Call Python service for analysis
  const analysis = await this.callPythonService(grant);
  
  return {
    grantId: grant.id,
    agentType: this.agentType,
    score: analysis.score,
    reasoning: analysis.reasoning,
    confidence: analysis.confidence,
    timestamp: new Date()
  };
}
```

#### `validateEvaluationResult(result: EvaluationResult): void`

Validates that an evaluation result meets all requirements.

#### `formatEvaluationResult(result: EvaluationResult): string`

Formats an evaluation result for logging.

## Creating a Custom Agent

### Example: TechnicalAgent

```typescript
import { BaseGrantAgent } from './base-agent';
import { Grant, EvaluationResult, AgentConfig } from '../types';
import axios from 'axios';

export class TechnicalAgent extends BaseGrantAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  protected async evaluate(grant: Grant): Promise<EvaluationResult> {
    if (!grant.proposal) {
      throw new Error('Grant proposal not loaded');
    }

    // Call Python service for technical analysis
    const response = await axios.post(
      `${this.config.pythonApiUrl}/analyze/technical`,
      {
        grant_id: grant.id,
        project_name: grant.proposal.projectName,
        description: grant.proposal.description,
        tech_stack: grant.proposal.techStack,
        architecture: grant.proposal.architecture,
        timeline: grant.proposal.timeline,
        team_experience: grant.proposal.teamExperience,
        github_repos: grant.proposal.githubRepos
      },
      {
        headers: {
          'X-API-Key': this.config.pythonApiKey
        }
      }
    );

    const analysis = response.data;

    return {
      grantId: grant.id,
      agentType: this.agentType,
      score: analysis.score,
      reasoning: analysis.reasoning,
      concerns: analysis.concerns,
      recommendations: analysis.recommendations,
      confidence: analysis.confidence,
      timestamp: new Date()
    };
  }
}
```

### Usage

```typescript
import { TechnicalAgent } from './agents/technical-agent';
import { AgentType } from './types';

const agent = new TechnicalAgent({
  agentType: AgentType.TECHNICAL,
  blockchain: {
    rpcUrl: process.env.SEPOLIA_RPC_URL!,
    privateKey: process.env.PRIVATE_KEY!,
    contractAddresses: {
      grantRegistry: process.env.GRANT_REGISTRY_ADDRESS!,
      agentVoting: process.env.AGENT_VOTING_ADDRESS!,
      grantTreasury: process.env.GRANT_TREASURY_ADDRESS!
    }
  },
  ipfs: {
    gatewayUrl: process.env.IPFS_GATEWAY_URL!
  },
  pythonApiUrl: process.env.PYTHON_API_URL!,
  pythonApiKey: process.env.PYTHON_API_KEY!
});

// Evaluate a grant
const result = await agent.evaluateWithErrorHandling(123);
```

## Utility Classes

### BlockchainConnection

Manages connection to Ethereum network.

```typescript
const blockchain = new BlockchainConnection({
  rpcUrl: 'https://sepolia.infura.io/v3/...',
  privateKey: '0x...',
  contractAddresses: { ... }
});

const blockNumber = await blockchain.getBlockNumber();
const balance = await blockchain.getBalance();
```

### ContractManager

Manages smart contract interactions.

```typescript
const contracts = new ContractManager(blockchain);

const grantRegistry = contracts.getGrantRegistry();
const grant = await contracts.callView(grantRegistry, 'getGrant', 123);

const receipt = await contracts.executeTransaction(
  grantRegistry,
  'updateGrantStatus',
  123,
  GrantStatus.APPROVED
);
```

### IPFSClient

Fetches content from IPFS.

```typescript
const ipfs = new IPFSClient({
  gatewayUrl: 'https://gateway.pinata.cloud/ipfs/'
});

const proposal = await ipfs.fetchGrantProposal('QmHash...');
const isValid = ipfs.isValidIPFSHash('QmHash...');
```

## Error Handling

All errors are wrapped in `AgentError` with specific types:

```typescript
enum AgentErrorType {
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  IPFS_ERROR = 'IPFS_ERROR',
  API_ERROR = 'API_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EVALUATION_ERROR = 'EVALUATION_ERROR'
}
```

Example error handling:

```typescript
try {
  await agent.evaluateWithErrorHandling(123);
} catch (error) {
  if (error instanceof AgentError) {
    switch (error.type) {
      case AgentErrorType.BLOCKCHAIN_ERROR:
        console.error('Blockchain issue:', error.message);
        break;
      case AgentErrorType.IPFS_ERROR:
        console.error('IPFS fetch failed:', error.message);
        break;
      case AgentErrorType.VALIDATION_ERROR:
        console.error('Invalid data:', error.message);
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

## Testing

Run tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --coverage
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Building

Compile TypeScript:

```bash
npm run build
```

Output goes to `dist/` directory.

## Best Practices

1. **Always use `evaluateWithErrorHandling()`** - It provides comprehensive error handling and logging
2. **Validate inputs** - Check grant proposal data before processing
3. **Log extensively** - Use console.log for important steps
4. **Handle failures gracefully** - Catch and wrap errors in AgentError
5. **Check voting status** - Use `hasVoted()` before evaluating
6. **Test thoroughly** - Write unit tests for custom evaluation logic

## Next Steps

1. Implement specific agent types (Technical, Impact, DD, Budget, Community)
2. Add Python service integration
3. Implement MCP communication layer
4. Create orchestration logic
5. Build frontend integration

## Support

For issues or questions, refer to:
- Main project README: `../README.md`
- API contracts: `../API-CONTRACTS.md`
- Architecture docs: `../ARCHITECTURE.md`
