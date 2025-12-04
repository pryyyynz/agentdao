const { ethers } = require("hardhat");
require("dotenv").config({ path: "../python-services/.env" });

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║          Pre-Deployment Checklist for Sepolia             ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  let allChecks = true;

  // Check 1: Environment variables
  console.log("1️⃣  Checking environment variables...");
  
  if (!process.env.RPC_URL) {
    console.log("   ❌ RPC_URL not found in .env");
    allChecks = false;
  } else {
    console.log("   ✅ RPC_URL configured:", process.env.RPC_URL.substring(0, 50) + "...");
  }

  if (!process.env.PRIVATE_KEY) {
    console.log("   ❌ PRIVATE_KEY not found in .env");
    allChecks = false;
  } else {
    console.log("   ✅ PRIVATE_KEY configured: 0x" + "*".repeat(60) + process.env.PRIVATE_KEY.slice(-4));
  }

  if (process.env.ETHERSCAN_API_KEY) {
    console.log("   ✅ ETHERSCAN_API_KEY configured (for verification)");
  } else {
    console.log("   ⚠️  ETHERSCAN_API_KEY not found (contract verification will fail)");
    console.log("      Get one at: https://etherscan.io/myapikey");
  }

  console.log();

  // Check 2: Network connection
  console.log("2️⃣  Checking network connection...");
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const network = await provider.getNetwork();
    
    if (network.chainId === 11155111n) {
      console.log("   ✅ Connected to Sepolia testnet (chainId:", network.chainId.toString() + ")");
    } else {
      console.log("   ❌ Wrong network! Expected Sepolia (11155111), got:", network.chainId.toString());
      allChecks = false;
    }

    const blockNumber = await provider.getBlockNumber();
    console.log("   ✅ Current block number:", blockNumber);

  } catch (error) {
    console.log("   ❌ Failed to connect to network:", error.message);
    allChecks = false;
  }

  console.log();

  // Check 3: Deployer account balance
  console.log("3️⃣  Checking deployer account...");
  try {
    const [deployer] = await ethers.getSigners();
    console.log("   ✅ Deployer address:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    console.log("   💰 Balance:", balanceInEth, "ETH");

    if (parseFloat(balanceInEth) < 0.05) {
      console.log("   ⚠️  Low balance! Deployment may fail. Recommended: >0.1 ETH");
      console.log("      Get Sepolia ETH from: https://sepoliafaucet.com/");
      allChecks = false;
    } else {
      console.log("   ✅ Sufficient balance for deployment");
    }

  } catch (error) {
    console.log("   ❌ Failed to get deployer info:", error.message);
    allChecks = false;
  }

  console.log();

  // Check 4: Contracts compiled
  console.log("4️⃣  Checking contract compilation...");
  try {
    const fs = require("fs");
    const path = require("path");
    
    const artifactsPath = path.join(__dirname, "..", "artifacts", "contracts");
    
    const contracts = ["GrantRegistry.sol", "GrantTreasury.sol", "AgentVoting.sol"];
    let allCompiled = true;

    for (const contract of contracts) {
      const contractPath = path.join(artifactsPath, contract);
      if (fs.existsSync(contractPath)) {
        console.log("   ✅", contract, "compiled");
      } else {
        console.log("   ❌", contract, "not compiled");
        allCompiled = false;
      }
    }

    if (!allCompiled) {
      console.log("   ⚠️  Run 'npm run compile' to compile contracts");
      allChecks = false;
    }

  } catch (error) {
    console.log("   ⚠️  Could not verify compilation status");
  }

  console.log();

  // Check 5: Tests passed
  console.log("5️⃣  Test status...");
  console.log("   ℹ️  Run 'npm test' to ensure all 102 tests pass");
  console.log("   ℹ️  Expected: 102 passing");

  console.log();

  // Check 6: Gas price
  console.log("6️⃣  Checking current gas price...");
  try {
    const feeData = await ethers.provider.getFeeData();
    const gasPriceGwei = ethers.formatUnits(feeData.gasPrice || 0n, "gwei");
    console.log("   ⛽ Current gas price:", gasPriceGwei, "gwei");
    
    if (parseFloat(gasPriceGwei) > 100) {
      console.log("   ⚠️  High gas price! Consider waiting for lower gas fees");
    } else {
      console.log("   ✅ Gas price is reasonable");
    }

  } catch (error) {
    console.log("   ⚠️  Could not fetch gas price");
  }

  console.log();

  // Summary
  console.log("═".repeat(60));
  if (allChecks) {
    console.log("\n✅ All checks passed! Ready for deployment.\n");
    console.log("To deploy, run:");
    console.log("   npm run deploy:sepolia\n");
  } else {
    console.log("\n❌ Some checks failed. Please fix issues before deploying.\n");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
