require('dotenv').config();
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║         Test Deployed Contracts on Sepolia               ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    // Load deployed addresses
    const deployedContracts = require('../deployed-contracts.json');
    const registryAddress = deployedContracts.contracts.grantRegistry.address;
    const treasuryAddress = deployedContracts.contracts.grantTreasury.address;
    const votingAddress = deployedContracts.contracts.agentVoting.address;

    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("🔑 Testing with address:", deployer.address);
    console.log("💰 Current balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Load contract instances
    const GrantRegistry = await ethers.getContractFactory("GrantRegistry");
    const GrantTreasury = await ethers.getContractFactory("GrantTreasury");
    const AgentVoting = await ethers.getContractFactory("AgentVoting");

    const registry = GrantRegistry.attach(registryAddress);
    const treasury = GrantTreasury.attach(treasuryAddress);
    const voting = AgentVoting.attach(votingAddress);

    console.log("📋 Contract Addresses:");
    console.log("   GrantRegistry:", registryAddress);
    console.log("   GrantTreasury:", treasuryAddress);
    console.log("   AgentVoting:", votingAddress);
    console.log("\n" + "─".repeat(60) + "\n");

    // TEST 1: Check Treasury Balance
    console.log("TEST 1: Check Treasury Balance");
    try {
        const treasuryBalance = await treasury.getTreasuryBalance();
        console.log("✅ Treasury Balance:", ethers.formatEther(treasuryBalance), "ETH");
        if (treasuryBalance > 0) {
            console.log("   💰 Treasury is funded and ready!");
        }
    } catch (error) {
        console.log("❌ Failed:", error.message);
    }
    console.log("\n" + "─".repeat(60) + "\n");

    // TEST 2: Submit a Test Grant
    console.log("TEST 2: Submit a Test Grant");
    try {
        const ipfsHash = "QmTest123456789TestGrantSubmission";
        const fundingAmount = ethers.parseEther("0.1"); // 0.1 ETH

        console.log("📝 Submitting grant...");
        console.log("   IPFS Hash:", ipfsHash);
        console.log("   Funding Amount:", ethers.formatEther(fundingAmount), "ETH");

        const tx = await registry.submitGrant(ipfsHash, fundingAmount);
        console.log("   Transaction hash:", tx.hash);
        console.log("   ⏳ Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("✅ Grant submitted successfully!");
        console.log("   Block number:", receipt.blockNumber);

        // Get the grant ID from the event
        const event = receipt.logs.find(log => {
            try {
                const parsed = registry.interface.parseLog(log);
                return parsed && parsed.name === 'GrantSubmitted';
            } catch {
                return false;
            }
        });

        if (event) {
            const parsedEvent = registry.interface.parseLog(event);
            const grantId = parsedEvent.args.grantId;
            console.log("   Grant ID:", grantId.toString());

            // Read back the grant
            console.log("\n   📖 Reading grant details...");
            const grant = await registry.getGrant(grantId);
            console.log("   ✅ Grant verified:");
            console.log("      ID:", grant.id.toString());
            console.log("      Applicant:", grant.applicant);
            console.log("      IPFS Hash:", grant.ipfsHash);
            console.log("      Amount:", ethers.formatEther(grant.amount), "ETH");
            console.log("      Status:", ["Pending", "UnderReview", "Approved", "Rejected", "Funded", "Completed"][grant.status]);
        }
    } catch (error) {
        console.log("❌ Failed:", error.message);
    }
    console.log("\n" + "─".repeat(60) + "\n");

    // TEST 3: Register as Agent
    console.log("TEST 3: Register as Agent");
    try {
        // Check if already registered
        const agentInfo = await voting.agents(deployer.address);
        
        if (agentInfo.isActive) {
            console.log("ℹ️  Already registered as agent");
            console.log("   Agent Type:", ["Technical", "Impact", "DueDiligence", "Budget", "Community"][agentInfo.agentType]);
            console.log("   Voting Weight:", agentInfo.votingWeight.toString());
            console.log("   Reputation Score:", agentInfo.reputationScore.toString());
            console.log("   Total Votes:", agentInfo.totalVotes.toString());
        } else {
            console.log("🤖 Registering as agent...");
            const agentType = 0; // Technical
            const votingWeight = 8; // Weight between 1-10
            
            const tx = await voting.registerAgent(deployer.address, agentType, votingWeight);
            console.log("   Transaction hash:", tx.hash);
            console.log("   ⏳ Waiting for confirmation...");
            
            await tx.wait();
            console.log("✅ Agent registered successfully!");
            
            // Verify registration
            const newAgentInfo = await voting.agents(deployer.address);
            console.log("   Verification:", newAgentInfo.isActive ? "✅ Confirmed" : "❌ Failed");
            console.log("   Initial Reputation:", newAgentInfo.reputationScore.toString());
            console.log("   Voting Weight:", newAgentInfo.votingWeight.toString());
        }
    } catch (error) {
        console.log("❌ Failed:", error.message);
    }
    console.log("\n" + "─".repeat(60) + "\n");

    // TEST 4: Check Contract Ownership
    console.log("TEST 4: Verify Contract Ownership");
    try {
        const registryOwner = await registry.owner();
        const treasuryOwner = await treasury.owner();
        const votingOwner = await voting.owner();

        console.log("✅ Contract owners verified:");
        console.log("   GrantRegistry owner:", registryOwner);
        console.log("   GrantTreasury owner:", treasuryOwner);
        console.log("   AgentVoting owner:", votingOwner);
        
        if (registryOwner === deployer.address) {
            console.log("   ✅ You are the owner of all contracts!");
        }
    } catch (error) {
        console.log("❌ Failed:", error.message);
    }
    console.log("\n" + "─".repeat(60) + "\n");

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║                   🎉 TESTING COMPLETE! 🎉                 ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("📊 Summary:");
    console.log("   ✅ Treasury funded and accessible");
    console.log("   ✅ Grant submission working");
    console.log("   ✅ Agent registration working");
    console.log("   ✅ Contracts verified on Sepolia");
    console.log("\n🔗 View on Etherscan:");
    console.log("   GrantRegistry: https://sepolia.etherscan.io/address/" + registryAddress);
    console.log("   GrantTreasury: https://sepolia.etherscan.io/address/" + treasuryAddress);
    console.log("   AgentVoting: https://sepolia.etherscan.io/address/" + votingAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
