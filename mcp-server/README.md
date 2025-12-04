# Grantify MCP Server

Model Context Protocol orchestration server coordinating AI agent evaluations and blockchain interactions.

---

## 🤖 Architecture

The MCP server is the central nervous system of Grantify's AI agent council:

```
┌──────────────────────────────────────────────────────────────┐
│                      MCP Orchestrator                         │
│  - Grant workflow management                                  │
│  - Agent lifecycle coordination                               │
│  - Message routing & prioritization                           │
│  - Health monitoring                                          │
└────────┬──────────────────────────────────┬──────────────────┘
         │                                   │
         │ HTTP/WebSocket API                │ Agent Communication
         │                                   │
    ┌────▼─────┐                   ┌─────────▼──────────┐
    │ Frontend │                   │  Evaluator Agents  │
    │   API    │                   │                    │
    └──────────┘                   │ ┌────────────────┐ │
                                   │ │ Technical      │ │
                                   │ │ Impact         │ │
                                   │ │ Due Diligence  │ │
                                   │ │ Budget         │ │
                                   │ │ Community      │ │
                                   │ └────────┬───────┘ │
                                   └──────────┼─────────┘
                                              │
                                        ┌─────▼──────┐
                                        │   Python   │
                                        │  Services  │
                                        │  (AI/LLM)  │
                                        └────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Running Python services (port 8000)
- PostgreSQL database configured

### Installation

```bash
cd mcp-server
npm install
```

### Environment Configuration

Create `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Python Services
PYTHON_SERVICES_URL=http://localhost:8000
PYTHON_API_KEY=your_api_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/grantify

# Orchestrator Settings
EVALUATION_TIMEOUT_MS=300000
PARALLEL_EVALUATIONS=true
APPROVAL_THRESHOLD=0.6

# Health Monitoring
HEALTH_CHECK_INTERVAL_MS=60000
MILESTONE_CHECK_INTERVAL_MS=300000

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_MS=5000
```

### Development Mode

```bash
npm run dev
```

Server runs on http://localhost:3001

### Production Build

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
mcp-server/
├── src/
│   ├── orchestrator.ts          # Main orchestration logic
│   ├── http-server.ts           # Express HTTP API
│   ├── agent-registry.ts        # Agent lifecycle management
│   ├── agent-communication.ts   # Message routing protocol
│   ├── message-router.ts        # Message delivery system
│   ├── data-store.ts           # In-memory state cache
│   ├── types.ts                # TypeScript interfaces
│   │
│   └── agents/
│       ├── agent-factory.ts    # Agent instantiation
│       └── evaluator-agent.ts  # Proxy to Python AI services
│
├── tests/
│   ├── orchestrator.test.ts
│   ├── agent-communication.test.ts
│   └── integration.test.ts
│
├── examples/
│   ├── basic-orchestrator.ts
│   └── agent-communication-demo.ts
│
├── .env                        # Environment config (not in git)
├── .env.example                # Environment template
├── package.json
├── tsconfig.json
└── jest.config.js
```

---

## 🎯 Core Components

### 1. Orchestrator (`orchestrator.ts`)

Central coordinator managing the entire grant evaluation lifecycle.

**Responsibilities:**
- Initialize and monitor agent health
- Coordinate parallel grant evaluations
- Route messages between agents
- Execute voting and decision workflows
- Monitor milestone completion
- Handle error recovery and retries

**Key Methods:**

```typescript
// Start orchestration
await orchestrator.start();

// Process new grant submission
await orchestrator.processGrantSubmission(grantId);

// Check agent health
const health = await orchestrator.checkAgentHealth();

// Get workflow status
const status = orchestrator.getWorkflowStatus(grantId);
```

**Workflow Stages:**
1. **Submission** - Grant received, validation
2. **Evaluation** - Parallel agent analysis
3. **Voting** - Agent voting via smart contract
4. **Decision** - Aggregate vote results
5. **Execution** - Update grant status, notify
6. **Complete** - Workflow finished

### 2. Evaluator Agents (`agents/evaluator-agent.ts`)

Lightweight proxy agents that forward requests to Python AI services.

**Agent Types:**
- `TECHNICAL` - Code quality, feasibility analysis
- `IMPACT` - Social impact, alignment assessment
- `DUE_DILIGENCE` - Team verification, risk analysis
- `BUDGET` - Financial planning, budget validation
- `COMMUNITY` - Community feedback, sentiment analysis

**Agent Lifecycle:**

```typescript
const agent = new EvaluatorAgent({
  agentType: AgentType.TECHNICAL,
  pythonServiceUrl: 'http://localhost:8000',
  endpoint: '/api/v1/technical/analyze',
});

// Handle evaluation request
agent.on('evaluation_complete', (result) => {
  console.log('Score:', result.score);
  console.log('Summary:', result.summary);
});

await agent.handleEvaluationRequest(message);
```

### 3. Agent Communication (`agent-communication.ts`)

Advanced messaging system with queuing, priorities, and retry logic.

**Features:**
- Message prioritization (LOW, NORMAL, HIGH, CRITICAL)
- Automatic retry on failure
- Event-based subscriptions
- Agent discovery
- Delivery tracking

**Message Priority Levels:**
```typescript
enum MessagePriority {
  LOW = 0,        // Status updates
  NORMAL = 1,     // Regular evaluations
  HIGH = 2,       // Voting requests
  CRITICAL = 3,   // System errors
}
```

**Usage:**

```typescript
const comm = new AgentCommunication(agentRegistry, messageRouter);

// Send high-priority message
await comm.sendMessage(
  {
    type: MessageType.EVALUATION_REQUEST,
    from: 'orchestrator',
    to: 'technical_evaluator',
    data: grantData,
  },
  MessagePriority.HIGH,
  3 // max retries
);

// Subscribe to events
comm.on('evaluation_complete', async (message) => {
  console.log('Evaluation received:', message.data);
});
```

### 4. Agent Registry (`agent-registry.ts`)

Tracks agent status, capabilities, and metadata.

**Capabilities:**
- Register/unregister agents
- Update agent status (online, offline, busy)
- Query agents by type
- Health status tracking

### 5. Message Router (`message-router.ts`)

Routes messages to correct agents based on message type and agent capabilities.

### 6. Data Store (`data-store.ts`)

In-memory cache for workflow state, evaluations, and agent metrics.

---

## 🔌 HTTP API Endpoints

### Health Check

```
GET /health
```

Returns orchestrator and agent health status.

### Grant Workflow Status

```
GET /workflow/:grantId
```

Returns current workflow stage and progress for a grant.

### Trigger Evaluation

```
POST /evaluate/:grantId
```

Manually trigger evaluation workflow for a grant.

**Request Body:**
```json
{
  "force": false,
  "agents": ["technical", "impact"]
}
```

### Get Statistics

```
GET /stats
```

Returns orchestrator performance metrics:
- Grants processed
- Average evaluation time
- Agent health counts
- Active workflows

### Agent Discovery

```
GET /agents
```

Returns list of registered agents with status.

---

## 🧪 Testing

### Run Unit Tests

```bash
npm test
```

### Run Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

### Manual Testing

Use the example scripts in `/examples`:

```bash
# Test orchestrator
npx ts-node examples/basic-orchestrator.ts

# Test agent communication
npx ts-node examples/agent-communication-demo.ts
```

---

## 🛠️ Configuration

### Orchestrator Config

```typescript
interface OrchestratorConfig {
  // Workflow settings
  evaluationTimeoutMs: number;        // Max time for evaluation
  parallelEvaluations: boolean;       // Enable parallel processing
  requiredEvaluators: AgentType[];    // Required agent types
  approvalThreshold: number;          // Vote threshold (0-1)
  
  // Monitoring
  healthCheckIntervalMs: number;      // Agent health checks
  milestoneCheckIntervalMs: number;   // Milestone monitoring
  
  // Retry logic
  maxRetries: number;
  retryDelayMs: number;
  
  // Integration
  pythonServicesUrl: string;
  pythonApiKey: string;
}
```

### Required Evaluators

By default, all 5 agent types are required:

```typescript
requiredEvaluators: [
  AgentType.TECHNICAL,
  AgentType.IMPACT,
  AgentType.DUE_DILIGENCE,
  AgentType.BUDGET,
  AgentType.COMMUNITY,
]
```

Customize in orchestrator initialization if needed.

### Approval Threshold

Percentage of positive votes needed for approval (default: 60%):

```typescript
approvalThreshold: 0.6  // 60%
```

---

## 🔄 Grant Evaluation Workflow

### Step-by-Step Process

1. **Grant Submitted** (Frontend → Python Services)
   - Grant stored in PostgreSQL
   - MCP server notified via webhook

2. **Orchestrator Initialization**
   - Retrieve grant data from Python services
   - Create workflow tracking entry
   - Validate required data present

3. **Parallel Evaluation** (configurable)
   - Dispatch evaluation requests to all 5 agents
   - Each agent forwards to Python AI service
   - Agents return scores, summaries, recommendations

4. **Evaluation Aggregation**
   - Collect all 5 evaluation results
   - Store in database via Python services
   - Calculate average score

5. **Voting Phase**
   - Trigger agent votes via smart contract
   - Each agent submits on-chain vote
   - Wait for voting period completion

6. **Decision Execution**
   - Tally votes from blockchain
   - Compare against approval threshold
   - Update grant status (approved/rejected)

7. **Notification**
   - Emit workflow completion event
   - Python services send email notifications
   - Frontend updates via websocket/polling

### Error Handling

- **Agent Timeout**: Retry up to `MAX_RETRIES`, then mark agent as degraded
- **Python Service Down**: Queue messages, retry with exponential backoff
- **Blockchain Error**: Log error, manual intervention required
- **Partial Evaluations**: Proceed if minimum evaluators respond

---

## 📊 Monitoring & Observability

### Health Checks

Orchestrator automatically monitors:
- Agent responsiveness
- Python services connectivity
- Message queue size
- Workflow completion rates

### Metrics

Available via `/stats` endpoint:
- `grantsProcessed` - Total grants evaluated
- `averageEvaluationTime` - Mean time per evaluation
- `activeWorkflows` - Current in-flight workflows
- `agentsHealthy` - Number of healthy agents

### Logging

Structured logging with timestamps:
```
[orchestrator] Starting evaluation for grant 123
[technical_evaluator] Analyzing code quality...
[orchestrator] Voting phase initiated for grant 123
```

---

## 🐛 Troubleshooting

### Python Services Connection Error

```bash
# Check Python services are running
curl http://localhost:8000/health

# Verify PYTHON_SERVICES_URL in .env
echo $PYTHON_SERVICES_URL
```

### Agent Not Responding

```bash
# Check agent health via API
curl http://localhost:3001/agents

# Restart orchestrator to re-register agents
npm run dev
```

### Workflow Stuck

```bash
# Check workflow status
curl http://localhost:3001/workflow/123

# Force re-evaluation
curl -X POST http://localhost:3001/evaluate/123 \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

### Message Queue Overflow

Increase timeout or enable parallel evaluations:

```env
EVALUATION_TIMEOUT_MS=600000  # 10 minutes
PARALLEL_EVALUATIONS=true
```

---

## 🚢 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/http-server.js"]
```

Build and run:

```bash
docker build -t grantify-mcp .
docker run -p 3001:3001 --env-file .env grantify-mcp
```

### Process Manager (PM2)

```bash
npm install -g pm2
pm2 start dist/http-server.js --name grantify-mcp
pm2 logs grantify-mcp
```

### Systemd Service

Create `/etc/systemd/system/grantify-mcp.service`:

```ini
[Unit]
Description=Grantify MCP Server
After=network.target

[Service]
Type=simple
User=grantify
WorkingDirectory=/opt/grantify/mcp-server
Environment="NODE_ENV=production"
EnvironmentFile=/opt/grantify/mcp-server/.env
ExecStart=/usr/bin/node dist/http-server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 📚 Additional Resources

- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Express.js](https://expressjs.com/)

---

## 🎯 Development Tips

### Adding a New Agent Type

1. Define new `AgentType` in `types.ts`
2. Create Python AI service endpoint
3. Add agent configuration in orchestrator
4. Update required evaluators list
5. Add tests

### Message Types

All message types in `types.ts`:
- `EVALUATION_REQUEST` - Trigger evaluation
- `EVALUATION_COMPLETE` - Agent finished
- `VOTE_REQUEST` - Initiate voting
- `VOTE_COMPLETE` - Vote submitted
- `STATUS_UPDATE` - Workflow progress
- `ERROR` - Failure notification

### Debugging

Enable verbose logging:

```typescript
process.env.DEBUG = 'orchestrator:*';
```

Use VS Code launch config (`.vscode/launch.json`):

```json
{
  "type": "node",
  "request": "launch",
  "name": "MCP Server",
  "program": "${workspaceFolder}/mcp-server/src/http-server.ts",
  "runtimeArgs": ["-r", "ts-node/register"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

---

## 📞 Support

MCP server issues?
- Check logs in terminal output
- Verify Python services connectivity
- Review agent health: `curl http://localhost:3001/agents`
- Open [GitHub Issue](https://github.com/pryyyynz/agentdao/issues)
- Email: dugboryeleprince@gmail.com