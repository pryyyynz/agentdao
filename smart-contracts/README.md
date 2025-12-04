# Grantify Smart Contracts

Solidity smart contracts for decentralized grant management, AI agent voting, and milestone-based fund distribution on Ethereum.

---

## 📋 Contracts Overview

### 1. **GrantRegistry.sol**
Main registry for grant proposals with status tracking and metadata management.

**Key Functions:**
- `submitGrant()` - Submit new grant proposal
- `updateGrantStatus()` - Update grant status (admin only)
- `getGrant()` - Retrieve grant details
- `getGrantsByStatus()` - Query grants by status

### 2. **GrantTreasury.sol**
Manages fund deposits, withdrawals, and milestone-based payments.

**Key Functions:**
- `depositFunds()` - Add funds to treasury
- `releaseFunds()` - Release funds for approved grants
- `withdrawFunds()` - Withdraw funds (admin only)
- `getTreasuryBalance()` - Check available funds

### 3. **AgentVoting.sol**
Handles AI agent votes and consensus calculation.

**Key Functions:**
- `castVote()` - Agent casts vote on grant
- `finalizeVoting()` - Complete voting process
- `getVotingResults()` - Get vote tallies
- `hasVoted()` - Check if agent voted

### 4. **MilestoneGrantRegistry.sol**
Extended registry with milestone tracking for phased fund releases.

**Key Functions:**
- `submitMilestone()` - Submit milestone completion
- `approveMilestone()` - Approve completed milestone
- `releaseMilestoneFunds()` - Release milestone payment
- `getMilestones()` - Get grant milestones

---

## 🚀 Deployment

### Prerequisites

```bash
npm install
```

### Environment Setup

Create `.env` file:

```env
# Blockchain RPC
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Deployer wallet
PRIVATE_KEY=0x_your_private_key_here

# Etherscan verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

⚠️ **Security**: Never commit your `.env` file. Use testnet keys only for development.

### Compile Contracts

```bash
npm run compile
```

This generates:
- `artifacts/` - Compiled contract artifacts
- `typechain-types/` - TypeScript types for contracts

### Deploy to Sepolia Testnet

#### Option 1: Deploy All Contracts

```bash
npm run deploy:sepolia
```

This runs:
1. Pre-deployment checks (balance, network)
2. Deploys all contracts in order
3. Saves addresses to `deployed-contracts.json`
4. Displays Etherscan links

#### Option 2: Deploy Individual Contracts

```bash
# Deploy only registry
npm run deploy:registry

# Deploy only treasury
npm run deploy:treasury

# Deploy only voting
npm run deploy:voting

# Deploy milestone registry
npm run deploy:milestone
```

### Verify Contracts on Etherscan

After deployment:

```bash
# Verify all contracts
npm run verify:all

# Or verify individual contract
npx hardhat verify --network sepolia CONTRACT_ADDRESS "CONSTRUCTOR_ARG1" "ARG2"
```

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Grant Registry tests
npm run test:registry

# Treasury tests
npm run test:treasury

# Voting tests
npm run test:voting

# Milestone tests
npm run test:milestone
```

### Test Coverage

```bash
npx hardhat coverage
```

Coverage report: `coverage/index.html`

### Gas Report

```bash
REPORT_GAS=true npm test
```

---

## 📝 Deployed Contracts (Sepolia)

Current deployment addresses (from `deployed-contracts.json`):

| Contract | Address | Explorer |
|----------|---------|----------|
| **GrantRegistry** | `0x6d77f3a5dcad33cbEbf431Fee6F67E5930148D17` | [View on Etherscan](https://sepolia.etherscan.io/address/0x6d77f3a5dcad33cbEbf431Fee6F67E5930148D17) |
| **GrantTreasury** | `0x71C74477ae190d7eeF762d01AC091D021a5AbAa6` | [View on Etherscan](https://sepolia.etherscan.io/address/0x71C74477ae190d7eeF762d01AC091D021a5AbAa6) |
| **AgentVoting** | `0x19Fe9e5e12fc5C1657E299aC69878965367A294D` | [View on Etherscan](https://sepolia.etherscan.io/address/0x19Fe9e5e12fc5C1657E299aC69878965367A294D) |

**Network**: Sepolia Testnet (Chain ID: 11155111)  
**Deployed**: November 11, 2025

---

## 🔧 Development

### Local Hardhat Network

Start local blockchain:

```bash
npm run node
```

Deploy to local network (in another terminal):

```bash
npx hardhat run scripts/deploy-all.js --network localhost
```

### Clean Build Artifacts

```bash
npm run clean
```

This removes:
- `artifacts/`
- `cache/`
- `typechain-types/`

### Flatten Contracts

For verification or audit:

```bash
npx hardhat flatten contracts/GrantRegistry.sol > GrantRegistry_flat.sol
```

---

## 🏗️ Contract Architecture

```
┌──────────────────────────────────────────────────────┐
│                   GrantRegistry                       │
│  - Stores grant metadata                             │
│  - Manages grant lifecycle                           │
│  - Emits events for off-chain tracking               │
└─────────────────┬────────────────────────────────────┘
                  │
                  ├─────────────────┬──────────────────┐
                  │                 │                  │
     ┌────────────▼──────────┐  ┌──▼──────────┐  ┌───▼──────────┐
     │   GrantTreasury       │  │ AgentVoting │  │  Milestone   │
     │  - Holds funds        │  │ - AI votes  │  │  Registry    │
     │  - Releases payments  │  │ - Consensus │  │ - Milestones │
     └───────────────────────┘  └─────────────┘  └──────────────┘
```

### Grant Lifecycle

```
PENDING → UNDER_EVALUATION → APPROVED/REJECTED
                                   ↓
                               ACTIVE → COMPLETED
```

### Voting Flow

1. Grant submitted → Status: `PENDING`
2. Agents evaluate → Status: `UNDER_EVALUATION`
3. Each agent calls `castVote()` with score
4. After all votes → `finalizeVoting()` calculates consensus
5. If approved → Status: `APPROVED`, funds released
6. If rejected → Status: `REJECTED`

---

## 📊 Gas Optimization

Contracts are optimized for gas efficiency:

- **Packed structs** - Minimize storage slots
- **uint256 for counters** - Cheaper than smaller types
- **Indexed events** - Efficient filtering
- **View functions** - No gas cost for reads
- **Batch operations** - Reduce transaction count

### Gas Estimates (Sepolia)

| Operation | Gas Used | Cost (50 gwei) |
|-----------|----------|----------------|
| Submit Grant | ~120,000 | 0.006 ETH |
| Cast Vote | ~80,000 | 0.004 ETH |
| Release Funds | ~100,000 | 0.005 ETH |
| Approve Milestone | ~90,000 | 0.0045 ETH |

---

## 🔒 Security

### Audited Features

- ✅ Reentrancy guards on fund transfers
- ✅ Access control (Ownable pattern)
- ✅ Input validation and bounds checking
- ✅ Safe math operations (Solidity 0.8+)
- ✅ Event emission for all state changes

### Security Best Practices

1. **Never deploy with dev keys to mainnet**
2. **Test thoroughly on testnet first**
3. **Get professional audit before mainnet**
4. **Use multi-sig for admin functions**
5. **Set proper gas limits**

---

## 🐛 Troubleshooting

### Contract Deployment Fails

```bash
# Check deployer balance
npm run check-balance

# Ensure you're on the right network
npx hardhat run scripts/deploy-all.js --network sepolia
```

### Transaction Reverts

Common reasons:
- Insufficient gas
- Contract already deployed at address
- Invalid constructor arguments
- Insufficient testnet ETH

Check transaction on [Sepolia Etherscan](https://sepolia.etherscan.io/) for detailed error.

### Verification Failed

```bash
# Ensure you have correct constructor args
# Wait 1-2 minutes after deployment before verifying
# Check Etherscan API key is valid
```

---

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Ethers.js](https://docs.ethers.io/)
- [Sepolia Testnet](https://sepolia.etherscan.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)

---

## 📞 Support

Issues with contracts? 
- Check [GitHub Issues](https://github.com/pryyyynz/agentdao/issues)
- Review test files for usage examples
- Contact: dugboryeleprince@gmail.com