const hre = require("hardhat");

async function main() {
  console.log("Deploying GrantRegistry contract...");

  // Get the contract factory
  const GrantRegistry = await hre.ethers.getContractFactory("GrantRegistry");
  
  // Deploy the contract
  const grantRegistry = await GrantRegistry.deploy();
  
  // Wait for deployment to finish
  await grantRegistry.waitForDeployment();
  
  const address = await grantRegistry.getAddress();
  
  console.log(`GrantRegistry deployed to: ${address}`);
  console.log(`Deployer address: ${(await hre.ethers.getSigners())[0].address}`);
  
  // Wait for a few block confirmations
  console.log("Waiting for block confirmations...");
  await grantRegistry.deploymentTransaction().wait(5);
  
  console.log("Deployment complete!");
  
  // Display next steps
  console.log("\n=== Next Steps ===");
  console.log(`1. Verify contract on Etherscan:`);
  console.log(`   npx hardhat verify --network sepolia ${address}`);
  console.log(`2. Add agent addresses using addAgent() function`);
  console.log(`3. Update your .env with:`);
  console.log(`   GRANT_REGISTRY_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
