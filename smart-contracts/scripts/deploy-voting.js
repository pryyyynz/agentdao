const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying AgentVoting contract...\n");

  // Get the deployer's account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Get deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Get the contract factory
  const AgentVoting = await ethers.getContractFactory("AgentVoting");

  // Deploy the contract
  console.log("Deploying AgentVoting...");
  const agentVoting = await AgentVoting.deploy();
  await agentVoting.waitForDeployment();

  const contractAddress = await agentVoting.getAddress();
  console.log("AgentVoting deployed to:", contractAddress);

  // Get owner
  const owner = await agentVoting.owner();
  console.log("Contract owner:", owner);

  console.log("\n✅ Deployment successful!");
  console.log("\nContract details:");
  console.log("- Address:", contractAddress);
  console.log("- Owner:", owner);
  console.log("- Initial Reputation:", await agentVoting.INITIAL_REPUTATION());
  console.log("- Min Voting Weight:", await agentVoting.MIN_VOTING_WEIGHT());
  console.log("- Max Voting Weight:", await agentVoting.MAX_VOTING_WEIGHT());
  console.log("- Min Reputation:", await agentVoting.MIN_REPUTATION());
  console.log("- Max Reputation:", await agentVoting.MAX_REPUTATION());

  console.log("\nNext steps:");
  console.log("1. Register AI agents using registerAgent()");
  console.log("2. Create voting sessions using createVotingSession()");
  console.log("3. Agents can cast votes using castVote()");
  console.log("4. Finalize voting using finalizeVote()");
  console.log("5. Update agent reputation using updateAgentReputation()");

  // Save deployment info
  const deploymentInfo = {
    contract: "AgentVoting",
    address: contractAddress,
    owner: owner,
    network: "sepolia",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
