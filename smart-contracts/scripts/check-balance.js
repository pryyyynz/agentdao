const { ethers } = require("hardhat");
require("dotenv").config({ path: "../python-services/.env" });

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║            Sepolia Wallet Balance Checker                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    const [deployer] = await ethers.getSigners();
    const address = deployer.address;
    
    console.log("Wallet Address:", address);
    
    // Get balance
    const balance = await ethers.provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log("Current Balance:", balanceInEth, "ETH");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name, `(chainId: ${network.chainId})`);
    
    // Check if sufficient for deployment
    const minimumRequired = 0.05;
    const balanceFloat = parseFloat(balanceInEth);
    
    console.log("\n" + "─".repeat(60));
    
    if (balanceFloat === 0) {
      console.log("\n❌ Insufficient funds: 0 ETH\n");
      console.log("You need testnet ETH to deploy contracts.\n");
      console.log("🔑 Get Sepolia ETH from these faucets:\n");
      console.log("1. Alchemy Faucet (Recommended):");
      console.log("   https://www.alchemy.com/faucets/ethereum-sepolia\n");
      console.log("2. Infura Faucet:");
      console.log("   https://www.infura.io/faucet/sepolia\n");
      console.log("3. Chainlink Faucet:");
      console.log("   https://faucets.chain.link/sepolia\n");
      console.log("4. QuickNode Faucet:");
      console.log("   https://faucet.quicknode.com/ethereum/sepolia\n");
      console.log("📋 Your Address (copy this):");
      console.log("   " + address + "\n");
      console.log("💡 After receiving ETH, run this script again to verify.");
      console.log("   Then run: npm run deploy:sepolia\n");
      
    } else if (balanceFloat < minimumRequired) {
      console.log(`\n⚠️  Low balance: ${balanceInEth} ETH`);
      console.log(`   Recommended: >${minimumRequired} ETH for deployment`);
      console.log(`   You may need more testnet ETH.\n`);
      
    } else {
      console.log(`\n✅ Sufficient balance: ${balanceInEth} ETH`);
      console.log(`   Estimated gas cost: ~0.02-0.05 ETH`);
      console.log(`   You have enough to deploy!\n`);
      console.log("Ready to deploy:");
      console.log("   npm run deploy:sepolia\n");
    }
    
  } catch (error) {
    console.error("\n❌ Error checking balance:", error.message);
    console.error("\nMake sure:");
    console.error("- RPC_URL is set correctly in .env");
    console.error("- PRIVATE_KEY is set correctly in .env");
    console.error("- You're connected to Sepolia network\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
