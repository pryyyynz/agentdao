# Grantify Complete Setup Guide

Step-by-step instructions to set up the entire Grantify platform from scratch.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Database Setup](#database-setup)
3. [Python Services Setup](#python-services-setup)
4. [Smart Contracts Setup](#smart-contracts-setup)
5. [MCP Server Setup](#mcp-server-setup)
6. [Frontend Setup](#frontend-setup)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## 🖥️ System Requirements

### Software Prerequisites

- **Node.js** 18+ with npm
- **Python** 3.11+
- **PostgreSQL** 15+
- **Git**
- **Ethereum Wallet** (MetaMask recommended)

### Hardware Recommendations

- **CPU**: 2+ cores
- **RAM**: 8GB minimum (16GB recommended)
- **Disk**: 5GB free space
- **Network**: Stable internet connection

### Required API Keys

Before starting, obtain these API keys:

1. **Groq API** (AI agent evaluations)
   - Sign up: https://console.groq.com
   - Free tier available
   
2. **Thirdweb Client ID** (Web3 integration)
   - Get yours: https://thirdweb.com/dashboard
   - Free for development

3. **Resend API** (Email notifications)
   - Sign up: https://resend.com
   - Free tier: 100 emails/day

4. **Sepolia Testnet ETH** (Smart contract deployment)
   - Faucet: https://sepoliafaucet.com
   - Need ~0.5 ETH for deployment

---

## 🗄️ Database Setup

### Step 1: Install PostgreSQL

**Windows:**
```bash
# Download installer from postgresql.org
# Run installer, accept defaults
# Remember your postgres password!
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

### Step 2: Create Database & User

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE grantify;
CREATE USER grantify_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE grantify TO grantify_user;

# Exit psql
\q
```

### Step 3: Initialize Schema

```bash
cd database

# Run main schema
psql -U grantify_user -d grantify -f schema.sql

# Run migrations in order
psql -U grantify_user -d grantify -f migrations/001_initial_schema.sql
psql -U grantify_user -d grantify -f migrations/002_admin_controls.sql
psql -U grantify_user -d grantify -f migrations/003_add_user_authentication.sql
psql -U grantify_user -d grantify -f migrations/004_add_system_activity_types.sql
psql -U grantify_user -d grantify -f migrations/005_add_milestones.sql
psql -U grantify_user -d grantify -f migrations/006_add_review_system.sql
psql -U grantify_user -d grantify -f migrations/007_add_under_review_status.sql
```

### Step 4: Verify Database

```bash
# Connect and check tables
psql -U grantify_user -d grantify

# In psql:
\dt   # List all tables (should see grants, evaluations, milestones, etc.)
\q
```

**Expected Tables:**
- `grants`
- `evaluations`
- `milestones`
- `agent_reputation`
- `agent_activity_log`
- `users`

---

## 🐍 Python Services Setup

### Step 1: Navigate to Python Services

```bash
cd python-services
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Activate (Linux/macOS)
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs ~50 packages including:
- FastAPI, Uvicorn (web framework)
- Groq (AI analysis)
- psycopg2-binary (PostgreSQL)
- web3.py (blockchain)
- Resend (email)

### Step 4: Configure Environment

Create `.env` file:

```bash
# Copy template
cp .env.example .env

# Edit .env
nano .env  # or use your preferred editor
```

**Required `.env` variables:**

```env
# Database
DATABASE_URL=postgresql://grantify_user:your_password@localhost:5432/grantify
DB_HOST=localhost
DB_PORT=5432
DB_NAME=grantify
DB_USER=grantify_user
DB_PASSWORD=your_password

# Groq AI
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=mixtral-8x7b-32768

# Email Service
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=grants@grantify.org

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true
LOG_LEVEL=INFO
LOG_FILE=logs/grantify.log

# Security
API_KEY=dev-key-12345
JWT_SECRET_KEY=generate_a_random_secret_here

# CORS (add frontend URL later)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Step 5: Test Python Services

```bash
# Start server
python main.py

# Should see:
# ✅ Database connection pool initialized
# ✅ Grantify Python Services started successfully
# INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Verify:**
- Open http://localhost:8000/health
- Should return `{"status": "healthy"}`

**API Docs:**
- Interactive docs: http://localhost:8000/docs

---

## ⚡ Smart Contracts Setup

### Step 1: Install Dependencies

```bash
cd smart-contracts
npm install
```

### Step 2: Configure Environment

Create `.env`:

```env
# Sepolia Testnet
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SEPOLIA_PRIVATE_KEY=your_wallet_private_key_here

# Etherscan (for verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Contract Configuration
DEPLOYER_ADDRESS=0xYourWalletAddress
INITIAL_ADMIN=0xYourWalletAddress
```

### Step 3: Compile Contracts

```bash
npx hardhat compile
```

**Expected output:**
```
Compiled 4 Solidity files successfully
```

### Step 4: Run Tests

```bash
npx hardhat test
```

**Should pass all tests:**
- GrantRegistry deployment
- GrantTreasury functionality
- AgentVoting mechanics

### Step 5: Deploy to Sepolia

```bash
# Ensure you have Sepolia ETH (0.5 ETH recommended)
# Check balance: https://sepolia.etherscan.io/address/YOUR_ADDRESS

# Deploy all contracts
npm run deploy:sepolia
```

**Save the deployed addresses!** They'll be printed like:

```
GrantRegistry deployed to: 0x6d77f3a5dcad33cbEbf431Fee6F67E5930148D17
GrantTreasury deployed to: 0x71C74477ae190d7eeF762d01AC091D021a5AbAa6
AgentVoting deployed to: 0x19Fe9e5e12fc5C1657E299aC69878965367A294D
```

### Step 6: Verify Contracts (Optional)

```bash
# Verify on Etherscan
npm run verify:sepolia
```

---

## 🤖 MCP Server Setup

### Step 1: Install Dependencies

```bash
cd mcp-server
npm install
```

### Step 2: Configure Environment

Create `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Python Services
PYTHON_SERVICES_URL=http://localhost:8000
PYTHON_API_KEY=dev-key-12345

# Database
DATABASE_URL=postgresql://grantify_user:your_password@localhost:5432/grantify

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

### Step 3: Build TypeScript

```bash
npm run build
```

### Step 4: Start MCP Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

**Verify:**
- Open http://localhost:3001/health
- Check http://localhost:3001/agents

---

## 🎨 Frontend Setup

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Environment

Create `.env.local`:

```env
# Thirdweb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id_here

# Smart Contract Addresses (from deployment step)
NEXT_PUBLIC_GRANT_REGISTRY_ADDRESS=0x6d77f3a5dcad33cbEbf431Fee6F67E5930148D17
NEXT_PUBLIC_GRANT_TREASURY_ADDRESS=0x71C74477ae190d7eeF762d01AC091D021a5AbAa6
NEXT_PUBLIC_AGENT_VOTING_ADDRESS=0x19Fe9e5e12fc5C1657E299aC69878965367A294D

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# MCP Server
NEXT_PUBLIC_MCP_URL=http://localhost:3001

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_NETWORK_NAME=sepolia
```

### Step 3: Start Development Server

```bash
npm run dev
```

**Frontend will be available at:**
- http://localhost:3000

---

## ✅ Verification

### Complete System Check

Open 4 terminal windows and verify all services:

**Terminal 1: Python Services**
```bash
cd python-services
source venv/bin/activate  # or .\venv\Scripts\Activate.ps1
python main.py
# → Running on http://0.0.0.0:8000
```

**Terminal 2: MCP Server**
```bash
cd mcp-server
npm run dev
# → MCP Server listening on port 3001
```

**Terminal 3: Frontend**
```bash
cd frontend
npm run dev
# → Ready on http://localhost:3000
```

**Terminal 4: Database**
```bash
# Check PostgreSQL is running
psql -U grantify_user -d grantify -c "SELECT COUNT(*) FROM grants;"
# → Should return count (may be 0)
```

### End-to-End Test

1. **Open Frontend**: http://localhost:3000
2. **Connect Wallet**: Click "Connect Wallet", select MetaMask, switch to Sepolia
3. **Submit Grant**: Navigate to /submit, fill out form
4. **Check Database**: 
   ```sql
   psql -U grantify_user -d grantify
   SELECT * FROM grants ORDER BY created_at DESC LIMIT 1;
   ```
5. **View Evaluations**: Check `/activity` page for AI agent evaluations
6. **Check Logs**:
   - Python: `tail -f python-services/logs/grantify.log`
   - MCP: Check terminal output

---

## 🐛 Troubleshooting

### Database Connection Failed

**Error:** `psycopg2.OperationalError: could not connect to server`

**Solutions:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # macOS

# Restart PostgreSQL
sudo systemctl restart postgresql  # Linux
brew services restart postgresql@15  # macOS

# Verify connection string in .env
psql "postgresql://grantify_user:password@localhost:5432/grantify"
```

### Port Already in Use

**Error:** `Address already in use: 8000`

**Solutions:**
```bash
# Find process using port (Windows)
netstat -ano | findstr :8000
taskkill /PID <process_id> /F

# Find process (Linux/macOS)
lsof -i :8000
kill -9 <PID>

# Or use different port
# Edit .env: API_PORT=8001
```

### Python Import Errors

**Error:** `ModuleNotFoundError: No module named 'fastapi'`

**Solutions:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/macOS
.\venv\Scripts\Activate.ps1  # Windows PowerShell

# Reinstall dependencies
pip install -r requirements.txt
```

### Smart Contract Deployment Failed

**Error:** `insufficient funds for gas`

**Solutions:**
- Get more Sepolia ETH from faucet: https://sepoliafaucet.com
- Wait 24 hours and try again (faucet limits)
- Try alternative faucet: https://www.alchemy.com/faucets/ethereum-sepolia

**Error:** `nonce too low`

**Solution:**
```bash
# Reset Hardhat network
npx hardhat clean
npx hardhat compile
```

### Frontend Not Loading

**Error:** Blank page or hydration errors

**Solutions:**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### MCP Server Connection Issues

**Error:** `ECONNREFUSED 127.0.0.1:8000`

**Solution:**
- Verify Python services are running on port 8000
- Check `PYTHON_SERVICES_URL` in mcp-server/.env
- Verify firewall isn't blocking port 8000

---

## 🎯 Next Steps

After successful setup:

1. **Read Documentation**
   - Review component READMEs (frontend, mcp-server, smart-contracts, python-services)
   - Check smart contract documentation

2. **Test Features**
   - Submit a test grant
   - Watch AI agents evaluate it
   - Check evaluation results in database

3. **Customize Configuration**
   - Update email templates
   - Configure agent evaluation criteria
   - Adjust approval thresholds

4. **Production Deployment**
   - Deploy contracts to mainnet
   - Set up production servers
   - Configure domain and SSL
   - Set up monitoring

---

## 📚 Additional Resources

- **Frontend Setup**: See `frontend/README.md`
- **Python Services**: See `python-services/README.md`
- **Smart Contracts**: See `smart-contracts/README.md`
- **MCP Server**: See `mcp-server/README.md`
- **Database**: See `database/README.md`

---

## 📞 Support

Setup issues?
- Check component-specific READMEs for detailed guidance
- Review troubleshooting sections above
- Open [GitHub Issue](https://github.com/pryyyynz/agentdao/issues) with:
  - Operating system
  - Error messages
  - Steps you've completed
- Email: dugboryeleprince@gmail.com

---

**Complete platform setup in ~30 minutes** ⚡

**All services should be running on:**
- Frontend: http://localhost:3000
- Python API: http://localhost:8000
- MCP Server: http://localhost:3001
- Database: localhost:5432

**Congratulations! Your Grantify platform is ready.** 🎉
