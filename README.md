# Grantify

**AI-Powered Decentralized Grant Evaluation Platform**

Grantify revolutionizes grant funding through autonomous AI agent evaluation, combining blockchain transparency with intelligent decision-making. Five specialized AI agents collaborate to evaluate proposals across technical feasibility, ecosystem impact, team credibility, budget viability, and community sentiment.

---

## 🌟 Features

- **Multi-Agent AI Evaluation** - 5 specialized AI agents provide comprehensive proposal analysis
- **Blockchain Integration** - Smart contracts on Ethereum for transparent fund management
- **Milestone-Based Funding** - Release funds incrementally based on deliverable completion
- **Real-Time Dashboard** - Track proposals, evaluations, and agent activity
- **IPFS Storage** - Decentralized storage for proposals and documentation
- **Email Notifications** - Automated updates for grant applicants

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  • Grant Submission  • Dashboard  • Agent Activity  • Admin     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├─────────────────────────────────────────┐
                     │                                         │
         ┌───────────▼──────────┐              ┌──────────────▼────────────┐
         │   PYTHON SERVICES     │              │   SMART CONTRACTS         │
         │   (FastAPI)           │              │   (Solidity/Hardhat)     │
         │                       │              │                           │
         │ • Technical Analysis  │              │ • GrantRegistry          │
         │ • Impact Assessment   │◄─────────────┤ • GrantTreasury          │
         │ • Due Diligence       │              │ • AgentVoting            │
         │ • Budget Analysis     │              │ • MilestoneRegistry      │
         │ • Community Sentiment │              │                           │
         └───────────┬───────────┘              └───────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │    MCP SERVER         │
         │   (TypeScript)        │
         │                       │
         │ • Orchestrator        │
         │ • Agent Communication │
         │ • Workflow Management │
         └───────────┬───────────┘
                     │
         ┌───────────▼──────────┐
         │  TYPESCRIPT AGENTS    │
         │                       │
         │ • Blockchain Interact │
         │ • IPFS Integration    │
         │ • On-Chain Voting     │
         └───────────┬───────────┘
                     │
         ┌───────────▼──────────┐
         │    DATABASE           │
         │   (PostgreSQL)        │
         │                       │
         │ • Grants  • Evals     │
         │ • Users   • Logs      │
         └───────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/pnpm
- **Python** 3.11+
- **PostgreSQL** 15+
- **Git**
- **Ethereum Wallet** with Sepolia testnet ETH

### 1. Clone Repository

```bash
git clone https://github.com/pryyyynz/agentdao.git
cd agentdao
```

### 2. Database Setup

```bash
# Install PostgreSQL and create database
createdb grantify

# Run migrations
cd database/migrations
python run_migration.py
```

📖 [Database Setup Guide →](database/README.md)

### 3. Smart Contracts

```bash
cd smart-contracts
npm install
cp .env.example .env
# Edit .env with your keys

# Deploy to Sepolia testnet
npm run deploy:sepolia
```

📖 [Smart Contracts Documentation →](smart-contracts/README.md)

### 4. Python Services

```bash
cd python-services
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
source .venv/bin/activate      # Linux/Mac

pip install -r requirements.txt
cp .env.example .env
# Edit .env with API keys and database URL

# Run server
uvicorn main:app --reload --port 8000
```

📖 [Python Services Documentation →](python-services/README.md)

### 5. MCP Server

```bash
cd mcp-server
npm install
cp .env.example .env
# Edit .env

npm run dev:http
```

📖 [MCP Server Documentation →](mcp-server/README.md)

### 6. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with contract addresses

npm run dev
```

📖 [Frontend Documentation →](frontend/README.md)

### 7. Access Application

- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:8000/docs
- **MCP Server**: http://localhost:3100

---

## 📦 Project Structure

```
agentdao/
├── frontend/              # Next.js web application → [README](frontend/README.md)
├── python-services/       # FastAPI evaluation services → [README](python-services/README.md)
├── mcp-server/           # Model Context Protocol orchestrator → [README](mcp-server/README.md)
├── typescript-agents/    # Blockchain interaction agents
├── smart-contracts/      # Solidity contracts & deployment → [README](smart-contracts/README.md)
├── database/             # PostgreSQL schema & migrations → [README](database/README.md)
└── docs/                 # Additional documentation
```

---

## 🤖 AI Agents

### 1. **Technical Analyst**
Evaluates code quality, architecture, security, and technical feasibility.

### 2. **Impact Evaluator**
Assesses ecosystem impact, innovation, market fit, and long-term value.

### 3. **Due Diligence Officer**
Verifies team credentials, GitHub activity, wallet history, and red flags.

### 4. **Budget Analyst**
Reviews financial planning, cost estimates, and milestone breakdowns.

### 5. **Community Analyst**
Measures community support, engagement, and grassroots backing.

---

## 🔑 Environment Variables

Each component requires specific environment variables. See:
- [`frontend/.env.example`](frontend/.env.example)
- [`python-services/.env.example`](python-services/.env.example)
- [`mcp-server/.env.example`](mcp-server/.env.example)
- [`smart-contracts/.env.example`](smart-contracts/.env.example)
- [`typescript-agents/.env.example`](typescript-agents/.env.example)

---

## 🧪 Testing

```bash
# Smart contracts
cd smart-contracts
npm test

# Python services
cd python-services
pytest

# TypeScript agents
cd typescript-agents
npm test

# MCP server
cd mcp-server
npm test
```

---

## 📚 Documentation

### Component Guides

- **[Complete Setup Guide](SETUP.md)** - Step-by-step installation for the entire platform
- **[Frontend Documentation](frontend/README.md)** - Next.js application setup and usage
- **[Python Services Documentation](python-services/README.md)** - AI evaluation services API
- **[MCP Server Documentation](mcp-server/README.md)** - Orchestrator and agent coordination
- **[Smart Contracts Documentation](smart-contracts/README.md)** - Blockchain deployment and testing
- **[Database Documentation](database/README.md)** - Schema, migrations, and queries

### Quick Links

- [Architecture Overview](#🏗️-architecture)
- [AI Agents](#🤖-ai-agents)
- [Environment Variables](#🔑-environment-variables)
- [Testing Guide](#🧪-testing)

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/pryyyynz/agentdao/issues)
- **Email**: dugboryeleprince@gmail.com

---

## 🎯 Roadmap

- [x] Multi-agent evaluation system
- [x] Smart contract deployment
- [x] Milestone-based funding
- [x] Email notifications
- [ ] Governance token integration
- [ ] Mobile application
- [ ] Multi-chain support
- [ ] Advanced analytics dashboard