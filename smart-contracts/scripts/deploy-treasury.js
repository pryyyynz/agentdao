const hre = require("hardhat");

async function main() {
  console.log("Deploying GrantTreasury contract...");

  // Get the contract factory
  const GrantTreasury = await hre.ethers.getContractFactory("GrantTreasury");
  
  // Deploy the contract
  const grantTreasury = await GrantTreasury.deploy();
  
  // Wait for deployment to finish
  await grantTreasury.waitForDeployment();
  
  const address = await grantTreasury.getAddress();
  
  console.log(`GrantTreasury deployed to: ${address}`);
  console.log(`Deployer address: ${(await hre.ethers.getSigners())[0].address}`);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await grantTreasury.deploymentTransaction().wait(5);
  
  console.log("Deployment complete!");
  
  // Display next steps
  console.log("\n=== Next Steps ===");
  console.log(`1. Verify contract on Etherscan:`);
  console.log(`   npx hardhat verify --network sepolia ${address}`);
  console.log(`2. Add treasury managers using addTreasuryManager() function`);
  console.log(`3. Deposit initial funds using depositFunds() or send ETH directly`);
  console.log(`4. Update your .env with:`);
  console.log(`   GRANT_TREASURY_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
