const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║        Contract Verification on Etherscan                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Load deployed contracts
  const deploymentPath = path.join(__dirname, "..", "deployed-contracts.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ deployed-contracts.json not found!");
    console.error("   Please deploy contracts first: npm run deploy:sepolia\n");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const addresses = deployment.contractAddresses;

  console.log("📋 Contracts to verify:");
  console.log("   GrantRegistry:", addresses.GrantRegistry);
  console.log("   GrantTreasury:", addresses.GrantTreasury);
  console.log("   AgentVoting:  ", addresses.AgentVoting);
  console.log();

  // Check for API key
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("⚠️  ETHERSCAN_API_KEY not found in .env");
    console.log("   Get one at: https://etherscan.io/myapikey");
    console.log("   Add to .env file: ETHERSCAN_API_KEY=your_api_key\n");
    console.log("   You can still verify manually on Etherscan:\n");
    
    console.log("   GrantRegistry:");
    console.log("   https://sepolia.etherscan.io/address/" + addresses.GrantRegistry + "#code\n");
    
    console.log("   GrantTreasury:");
    console.log("   https://sepolia.etherscan.io/address/" + addresses.GrantTreasury + "#code\n");
    
    console.log("   AgentVoting:");
    console.log("   https://sepolia.etherscan.io/address/" + addresses.AgentVoting + "#code\n");
    
    process.exit(1);
  }

  const contracts = [
    { name: "GrantRegistry", address: addresses.GrantRegistry },
    { name: "GrantTreasury", address: addresses.GrantTreasury },
    { name: "AgentVoting", address: addresses.AgentVoting },
  ];

  for (const contract of contracts) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Verifying ${contract.name}...`);
    console.log(`Address: ${contract.address}`);
    
    try {
      const command = `npx hardhat verify --network sepolia ${contract.address}`;
      console.log(`\nRunning: ${command}\n`);
      
      const output = execSync(command, { 
        encoding: "utf8",
        stdio: "pipe"
      });
      
      console.log(output);
      
      if (output.includes("Successfully verified") || output.includes("Already verified")) {
        console.log(`✅ ${contract.name} verified successfully!`);
        console.log(`   View at: https://sepolia.etherscan.io/address/${contract.address}#code`);
      }
      
    } catch (error) {
      if (error.stdout && error.stdout.includes("Already verified")) {
        console.log(`✅ ${contract.name} already verified!`);
        console.log(`   View at: https://sepolia.etherscan.io/address/${contract.address}#code`);
      } else {
        console.log(`❌ Failed to verify ${contract.name}`);
        console.log(`   Error: ${error.message}`);
        console.log(`\n   Manual verification:  https://sepolia.etherscan.io/verifyContract`);
      }
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("\n✅ Verification process complete!\n");
  console.log("📊 View all contracts on Etherscan:");
  for (const contract of contracts) {
    console.log(`   ${contract.name}: https://sepolia.etherscan.io/address/${contract.address}#code`);
  }
  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });
