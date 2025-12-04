# Grantify Python Services

FastAPI-based evaluation microservice integrating AI agents (via Groq) for multi-dimensional grant analysis.

## 🌟 Features

### 5 AI Evaluation Services

1. **Technical Analysis** - Code quality, architecture, and feasibility assessment
2. **Impact Assessment** - Market fit, innovation, and ecosystem contribution
3. **Due Diligence** - Team background, credibility, and risk analysis
4. **Budget Validation** - Cost reasonability and resource allocation
5. **Community Sentiment** - Voting analysis and consensus measurement

### Production-Ready Features

- ✅ **Unified API Endpoint** - Single comprehensive evaluation combining all services
- ✅ **Rate Limiting** - 100 requests/minute per IP to prevent abuse
- ✅ **API Key Authentication** - Secure access for TypeScript agents
- ✅ **Request Logging** - Complete audit trail with timing metrics
- ✅ **Error Handling** - Graceful degradation with detailed error messages
- ✅ **OpenAPI Documentation** - Interactive API docs at `/docs`

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL database
- API keys for: Groq (AI), GitHub, Pinata (IPFS)

### 1. Clone and Setup

```bash
cd python-services

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your keys:

```env
# Required
GROQ_API_KEY=your_groq_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/grantify

# Optional but recommended
GITHUB_API_KEY=your_github_token_here
PINATA_API_KEY=your_pinata_key_here
PINATA_SECRET_API_KEY=your_pinata_secret_here
```

### 3. Run the Server

```bash
# Set Python path and run
$env:PYTHONPATH = "$PWD"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Test It!

Visit http://localhost:8000/docs for interactive API documentation.

## 📦 Installation

### System Requirements

- **Python**: 3.11 or higher
- **RAM**: Minimum 4GB (8GB recommended)
- **Disk**: 500MB for dependencies
- **Network**: Internet access for AI API calls

### Dependencies

```bash
pip install -r requirements.txt
```

Key packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `groq` - AI analysis
- `PyGithub` - GitHub API client
- `psycopg2-binary` - PostgreSQL adapter
- `python-dotenv` - Environment management

## ⚙️ Configuration

### Required API Keys

#### 1. Groq API (Required for Technical & Impact Analysis)

Get your key at: https://console.groq.com

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Models supported:**
- `llama-3.3-70b-versatile` (default, recommended)
- `mixtral-8x7b-32768`
- `llama-3.1-70b-versatile`

#### 2. GitHub Token (Required for Due Diligence)

Generate at: https://github.com/settings/tokens

**Required scopes:**
- `public_repo` - Access public repositories
- `read:user` - Read user profile data

```env
GITHUB_API_KEY=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 3. Pinata (Optional - for IPFS storage)

Get your keys at: https://pinata.cloud

```env
PINATA_API_KEY=xxxxxxxxxxxxxxxxxxxxx
PINATA_SECRET_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 4. Database (Required)

PostgreSQL connection string:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

For Supabase (recommended):
```env
DATABASE_URL=postgresql://postgres.[project-id]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | - | AI analysis API key |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `GITHUB_API_KEY` | Recommended | - | GitHub API token |
| `PINATA_API_KEY` | Optional | - | IPFS storage key |
| `ENVIRONMENT` | No | `development` | Environment mode |
| `PORT` | No | `8000` | Server port |
| `LOG_LEVEL` | No | `INFO` | Logging level |
| `RATE_LIMIT_PER_MINUTE` | No | `100` | Rate limit per IP |

## 🔌 API Endpoints

### Unified Evaluation (Recommended)

**POST** `/api/v1/evaluate/comprehensive`

Combines all 5 services into a single comprehensive evaluation.

**Request:**
```json
{
  "proposal": {
    "grant_id": "grant-001",
    "title": "Decentralized Identity Protocol",
    "description": "Building privacy-preserving identity for Web3",
    "github_repo": "https://github.com/org/repo",
    "tech_stack": ["Solidity", "React", "IPFS"],
    "architecture": "Layered architecture with smart contracts",
    "target_audience": "Web3 users and DeFi platforms",
    "problem_statement": "Current identity systems lack privacy",
    "solution": "Zero-knowledge proofs for private verification",
    "expected_impact": "Enable 1M+ users to have private identity",
    "team_info": {
      "size": 5,
      "experience_level": "senior"
    },
    "github_profiles": ["vitalik", "gakonst"],
    "wallet_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"],
    "previous_projects": ["Ethereum", "Foundry"],
    "total_amount": 185000,
    "duration_months": 6,
    "budget_items": [
      {
        "category": "development",
        "description": "Senior Blockchain Dev",
        "amount": 90000
      }
    ],
    "deliverables": ["Smart contracts", "Frontend", "Documentation"],
    "poll_id": "poll-123"
  },
  "services": ["technical", "impact", "due_diligence", "budget", "community"],
  "include_community": true
}
```

**Response:**
```json
{
  "success": true,
  "grant_id": "grant-001",
  "timestamp": "2025-11-12T10:30:00Z",
  "results": {
    "technical": {
      "quality_score": 85,
      "quality_level": "excellent",
      "confidence": 0.92
    },
    "impact": {
      "impact_score": 78,
      "innovation_level": "high",
      "market_fit_score": 82
    },
    "due_diligence": {
      "risk_score": 75,
      "risk_level": "low",
      "red_flags": []
    },
    "budget": {
      "budget_score": 77,
      "quality_level": "good",
      "total_amount": 185000
    },
    "community": {
      "sentiment_score": 85,
      "sentiment_level": "strong_support",
      "votes_count": 150
    }
  },
  "overall_score": 80.0,
  "recommendation": "APPROVE - Strong proposal across all dimensions",
  "execution_time": 8.5
}
```

### Individual Service Endpoints

#### Technical Analysis
**POST** `/api/v1/technical/analyze`

#### Impact Assessment
**POST** `/api/v1/impact/analyze`

#### Due Diligence
**POST** `/api/v1/due-diligence/analyze`

#### Budget Validation
**POST** `/api/v1/budget/analyze`

#### Community Sentiment
**POST** `/api/v1/community/create-poll`
**POST** `/api/v1/community/analyze`

### Health Checks

**GET** `/health` - Service health status
**GET** `/api/v1/evaluate/health` - All services status

## 🏗️ Architecture

```
python-services/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration and settings
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (not in git)
│
├── services/              # Core evaluation services
│   ├── __init__.py
│   ├── technical_analyzer.py      # Technical feasibility analysis
│   ├── impact_analyzer.py         # Impact assessment
│   ├── due_diligence.py          # Team background checks
│   ├── budget_analyzer.py        # Budget validation
│   └── community_sentiment.py    # Voting analysis
│
├── routers/               # API route handlers
│   ├── __init__.py
│   ├── technical.py              # Technical endpoints
│   ├── impact.py                 # Impact endpoints
│   ├── due_diligence.py          # Due diligence endpoints
│   ├── budget.py                 # Budget endpoints
│   ├── community.py              # Community endpoints
│   └── unified.py                # Unified evaluation endpoint
│
├── middleware/            # API middleware
│   ├── __init__.py
│   └── api_middleware.py         # Rate limiting, auth, logging
│
├── models/                # Pydantic data models
│   └── (auto-generated from services)
│
└── scripts/               # Utility scripts
    ├── test_integration.py       # Integration tests
    └── (other testing scripts)
```

## 🧪 Testing

### Run Integration Tests

```bash
# Set Python path
$env:PYTHONPATH = "$PWD"

# Run all tests
.\.venv\Scripts\python.exe scripts\test_integration.py
```

### Test Individual Services

```bash
# Test technical analyzer
.\.venv\Scripts\python.exe services\technical_analyzer.py

# Test impact analyzer
.\.venv\Scripts\python.exe services\impact_analyzer.py

# Test budget analyzer
.\.venv\Scripts\python.exe services\budget_analyzer.py
```

### API Testing with cURL

```bash
# Test unified endpoint
curl -X POST "http://localhost:8000/api/v1/evaluate/comprehensive" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-key-12345" \
  -d @test-proposal.json

# Test health check
curl "http://localhost:8000/health"
```

## 🚢 Deployment

### Local Development

```bash
# Run with auto-reload
$env:PYTHONPATH = "$PWD"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
# Run with production settings
$env:ENVIRONMENT = "production"
$env:PYTHONPATH = "$PWD"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker (Optional)

```dockerfile
# Coming soon - Docker container setup
```

## 🔐 Authentication

The API uses API key authentication. Three default keys are provided for development:

- `dev-key-12345` - Development/testing
- `typescript-agent-key` - TypeScript agent access
- `frontend-app-key` - Frontend application access

### Using API Keys

**Header:**
```
Authorization: Bearer dev-key-12345
```

**Custom Header:**
```
X-API-Key: dev-key-12345
```

**Query Parameter:**
```
GET /api/v1/endpoint?api_key=dev-key-12345
```

### Adding Custom Keys

Edit `middleware/api_middleware.py`:

```python
api_key_auth = APIKeyAuth()
api_key_auth.add_api_key("your-custom-key", "Your Client Name")
```

## 📊 Rate Limiting

Default limits:
- **100 requests/minute** per IP address
- Automatic cleanup every 5 minutes
- Returns `429 Too Many Requests` when exceeded

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699876543
```

## 📝 Logging

Logs are written to:
- Console (development)
- `logs/agentdao.log` (production)

Log levels:
- `DEBUG` - Detailed diagnostic info
- `INFO` - General informational messages (default)
- `WARNING` - Warning messages
- `ERROR` - Error messages
- `CRITICAL` - Critical errors

Configure in `.env`:
```env
LOG_LEVEL=INFO
LOG_FILE=logs/agentdao.log
```

## 🔧 Troubleshooting

### Common Issues

#### 1. ModuleNotFoundError

```bash
# Solution: Set PYTHONPATH
$env:PYTHONPATH = "c:\Users\pryyy\Projects\agentdao\python-services"
```

#### 2. Database Connection Failed

Check your `DATABASE_URL` in `.env`:
- Verify host, port, username, password
- Ensure PostgreSQL is running
- Test connection: `psql $DATABASE_URL`

#### 3. Groq API Rate Limit

```
Error: Rate limit exceeded
```

**Solutions:**
- Wait 1 minute before retrying
- Upgrade Groq plan for higher limits
- Implement request queuing

#### 4. GitHub API Rate Limit

Without token: 60 requests/hour
With token: 5,000 requests/hour

**Solution:** Add `GITHUB_API_KEY` to `.env`

#### 5. Port Already in Use

```bash
# Kill process on port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID [process_id] /F

# Or use a different port
uvicorn main:app --port 8001
```

### Debug Mode

Enable detailed logging:

```env
DEBUG=True
LOG_LEVEL=DEBUG
```

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
2. Make changes
3. Run tests: `python scripts/test_integration.py`
4. Update documentation
5. Submit pull request

### Code Style

- Follow PEP 8
- Use type hints
- Add docstrings to all functions
- Keep functions under 50 lines

