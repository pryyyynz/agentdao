const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║            Fund GrantTreasury Contract                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  
  // Get balances
  const deployerBalance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("📝 Deployer address:", deployer.address);
  console.log("💰 Current balance:", hre.ethers.formatEther(deployerBalance), "ETH\n");

  // Treasury contract address
  const treasuryAddress = "0x71C74477ae190d7eeF762d01AC091D021a5AbAa6";
  
  // Get treasury contract
  const GrantTreasury = await hre.ethers.getContractAt("GrantTreasury", treasuryAddress);
  
  // Check treasury balance before
  const treasuryBalanceBefore = await GrantTreasury.getTreasuryBalance();
  console.log("📊 Treasury balance before:", hre.ethers.formatEther(treasuryBalanceBefore), "ETH");
  
  // Amount to send (0.2 ETH - adjust if needed)
  const amountToSend = hre.ethers.parseEther("0.2");
  
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("\n💸 Sending", hre.ethers.formatEther(amountToSend), "ETH to treasury...\n");
  
  // Call depositFunds with ETH
  const tx = await GrantTreasury.depositFunds({ value: amountToSend });
  console.log("⏳ Transaction hash:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  await tx.wait();
  
  // Check treasury balance after
  const treasuryBalanceAfter = await GrantTreasury.getTreasuryBalance();
  const deployerBalanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  
  console.log("\n✅ Funding successful!");
  console.log("\n────────────────────────────────────────────────────────────");
  console.log("\n📊 Final Balances:");
  console.log("   Treasury:", hre.ethers.formatEther(treasuryBalanceAfter), "ETH");
  console.log("   Deployer:", hre.ethers.formatEther(deployerBalanceAfter), "ETH");
  console.log("\n💰 Amount deposited:", hre.ethers.formatEther(treasuryBalanceAfter - treasuryBalanceBefore), "ETH");
  
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                  🎉 TREASURY FUNDED! 🎉                   ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log("✅ Treasury is now ready for milestone payments!");
  console.log("🔗 View on Etherscan:");
  console.log("   https://sepolia.etherscan.io/address/" + treasuryAddress + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
