const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     AgentDAO Smart Contract Deployment to Sepolia         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Get deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, `(chainId: ${network.chainId})`);
  
  if (network.chainId !== 11155111n) {
    console.log("⚠️  Warning: Not on Sepolia testnet (expected chainId: 11155111)");
  }

  console.log("\n" + "─".repeat(60) + "\n");

  const deployedContracts = {};
  const deploymentTimestamp = new Date().toISOString();

  // ============================================
  // 1. Deploy GrantRegistry
  // ============================================
  console.log("1️⃣  Deploying GrantRegistry...");
  const GrantRegistry = await ethers.getContractFactory("GrantRegistry");
  const grantRegistry = await GrantRegistry.deploy();
  await grantRegistry.waitForDeployment();
  const registryAddress = await grantRegistry.getAddress();
  
  console.log("✅ GrantRegistry deployed to:", registryAddress);
  console.log("   Owner:", await grantRegistry.owner());
  console.log("   Grant count:", (await grantRegistry.getGrantCount()).toString());

  deployedContracts.grantRegistry = {
    address: registryAddress,
    contractName: "GrantRegistry",
    deployer: deployer.address,
    deployedAt: deploymentTimestamp,
    network: network.name,
    chainId: network.chainId.toString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
  };

  console.log("\n" + "─".repeat(60) + "\n");

  // ============================================
  // 2. Deploy GrantTreasury
  // ============================================
  console.log("2️⃣  Deploying GrantTreasury...");
  const GrantTreasury = await ethers.getContractFactory("GrantTreasury");
  const grantTreasury = await GrantTreasury.deploy();
  await grantTreasury.waitForDeployment();
  const treasuryAddress = await grantTreasury.getAddress();
  
  console.log("✅ GrantTreasury deployed to:", treasuryAddress);
  console.log("   Owner:", await grantTreasury.owner());
  console.log("   Balance:", ethers.formatEther(await grantTreasury.getTreasuryBalance()), "ETH");
  console.log("   Paused:", await grantTreasury.paused());

  deployedContracts.grantTreasury = {
    address: treasuryAddress,
    contractName: "GrantTreasury",
    deployer: deployer.address,
    deployedAt: deploymentTimestamp,
    network: network.name,
    chainId: network.chainId.toString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
  };

  console.log("\n" + "─".repeat(60) + "\n");

  // ============================================
  // 3. Deploy AgentVoting
  // ============================================
  console.log("3️⃣  Deploying AgentVoting...");
  const AgentVoting = await ethers.getContractFactory("AgentVoting");
  const agentVoting = await AgentVoting.deploy();
  await agentVoting.waitForDeployment();
  const votingAddress = await agentVoting.getAddress();
  
  console.log("✅ AgentVoting deployed to:", votingAddress);
  console.log("   Owner:", await agentVoting.owner());
  console.log("   Agent count:", (await agentVoting.getAgentCount()).toString());
  console.log("   Initial reputation:", (await agentVoting.INITIAL_REPUTATION()).toString());
  console.log("   Voting weight range:", 
    (await agentVoting.MIN_VOTING_WEIGHT()).toString(), "-",
    (await agentVoting.MAX_VOTING_WEIGHT()).toString());

  deployedContracts.agentVoting = {
    address: votingAddress,
    contractName: "AgentVoting",
    deployer: deployer.address,
    deployedAt: deploymentTimestamp,
    network: network.name,
    chainId: network.chainId.toString(),
    blockNumber: (await ethers.provider.getBlockNumber()).toString(),
  };

  console.log("\n" + "═".repeat(60) + "\n");

  // ============================================
  // Save deployment info to JSON
  // ============================================
  const deploymentData = {
    network: {
      name: network.name,
      chainId: network.chainId.toString(),
      rpcUrl: process.env.RPC_URL || "https://sepolia.infura.io/v3/...",
    },
    deployer: {
      address: deployer.address,
      balance: ethers.formatEther(balance),
    },
    deployedAt: deploymentTimestamp,
    contracts: deployedContracts,
    contractAddresses: {
      GrantRegistry: registryAddress,
      GrantTreasury: treasuryAddress,
      AgentVoting: votingAddress,
    },
    explorerUrls: {
      GrantRegistry: `https://sepolia.etherscan.io/address/${registryAddress}`,
      GrantTreasury: `https://sepolia.etherscan.io/address/${treasuryAddress}`,
      AgentVoting: `https://sepolia.etherscan.io/address/${votingAddress}`,
    },
  };

  const deploymentFilePath = path.join(__dirname, "..", "deployed-contracts.json");
  fs.writeFileSync(
    deploymentFilePath,
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("📄 Deployment info saved to: deployed-contracts.json\n");

  // ============================================
  // Deployment Summary
  // ============================================
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║              🎉 DEPLOYMENT SUCCESSFUL! 🎉                  ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log("📋 Contract Addresses:");
  console.log("   GrantRegistry:  ", registryAddress);
  console.log("   GrantTreasury:  ", treasuryAddress);
  console.log("   AgentVoting:    ", votingAddress);

  console.log("\n🔗 Etherscan Links:");
  console.log("   GrantRegistry:  ", `https://sepolia.etherscan.io/address/${registryAddress}`);
  console.log("   GrantTreasury:  ", `https://sepolia.etherscan.io/address/${treasuryAddress}`);
  console.log("   AgentVoting:    ", `https://sepolia.etherscan.io/address/${votingAddress}`);

  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contracts on Etherscan:");
  console.log("      npx hardhat verify --network sepolia " + registryAddress);
  console.log("      npx hardhat verify --network sepolia " + treasuryAddress);
  console.log("      npx hardhat verify --network sepolia " + votingAddress);
  
  console.log("\n   2. Initialize GrantRegistry:");
  console.log("      - Add AI agents: addAgent(agentAddress)");
  
  console.log("\n   3. Initialize GrantTreasury:");
  console.log("      - Add treasury managers: addTreasuryManager(managerAddress)");
  console.log("      - Deposit funds: depositFunds() or send ETH directly");
  
  console.log("\n   4. Initialize AgentVoting:");
  console.log("      - Register agents: registerAgent(address, type, weight)");
  console.log("      - Agent types: 0=Technical, 1=Impact, 2=DueDiligence, 3=Budget, 4=Community");
  
  console.log("\n   5. Import to Thirdweb:");
  console.log("      - Visit: https://thirdweb.com/dashboard");
  console.log("      - Import deployed contracts using addresses above");

  console.log("\n   6. Fund treasury:");
  console.log("      - Send testnet ETH to:", treasuryAddress);
  console.log("      - Get Sepolia ETH: https://sepoliafaucet.com/");

  console.log("\n" + "═".repeat(60) + "\n");

  // Save environment file template
  const envTemplate = `
# Deployed Contract Addresses (${network.name})
GRANT_REGISTRY_ADDRESS=${registryAddress}
GRANT_TREASURY_ADDRESS=${treasuryAddress}
AGENT_VOTING_ADDRESS=${votingAddress}

# Network
NETWORK_NAME=${network.name}
CHAIN_ID=${network.chainId}

# Deployed by: ${deployer.address}
# Deployed at: ${deploymentTimestamp}
`;

  const envFilePath = path.join(__dirname, "..", ".env.deployed");
  fs.writeFileSync(envFilePath, envTemplate.trim());
  console.log("💾 Contract addresses saved to: .env.deployed");
  console.log("   (Copy these to your .env file for backend integration)\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
