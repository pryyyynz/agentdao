import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MilestoneGrantRegistry...");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy contract
  const MilestoneGrantRegistry = await ethers.getContractFactory("MilestoneGrantRegistry");
  const registry = await MilestoneGrantRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✅ MilestoneGrantRegistry deployed to:", address);

  // Deposit initial funds (optional, 0.1 ETH)
  console.log("\n📤 Depositing initial funds...");
  const depositTx = await registry.depositFunds({ value: ethers.parseEther("0.1") });
  await depositTx.wait();
  console.log("✅ Deposited 0.1 ETH to contract");

  // Get contract balance
  const balance = await ethers.provider.getBalance(address);
  console.log("Contract balance:", ethers.formatEther(balance), "ETH");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    contractAddress: address,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    balance: ethers.formatEther(balance),
  };

  console.log("\n📝 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Wait for block confirmations before verification
  console.log("\n⏳ Waiting for block confirmations...");
  await registry.deploymentTransaction()?.wait(5);
  
  console.log("\n✅ Deployment complete!");
  console.log("\n📋 To verify on Etherscan, run:");
  console.log(`npx hardhat verify --network ${(await ethers.provider.getNetwork()).name} ${address}`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
