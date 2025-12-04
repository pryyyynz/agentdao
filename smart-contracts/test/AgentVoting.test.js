const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentVoting", function () {
  let agentVoting;
  let owner;
  let agent1, agent2, agent3, agent4, agent5;
  let nonAgent;

  // Agent types enum
  const AgentType = {
    Technical: 0,
    Impact: 1,
    DueDiligence: 2,
    Budget: 3,
    Community: 4,
  };

  const INITIAL_REPUTATION = 50n;
  const MIN_VOTING_WEIGHT = 1n;
  const MAX_VOTING_WEIGHT = 10n;

  beforeEach(async function () {
    [owner, agent1, agent2, agent3, agent4, agent5, nonAgent] = await ethers.getSigners();

    const AgentVoting = await ethers.getContractFactory("AgentVoting");
    agentVoting = await AgentVoting.deploy();
    await agentVoting.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await agentVoting.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await agentVoting.INITIAL_REPUTATION()).to.equal(INITIAL_REPUTATION);
      expect(await agentVoting.MIN_VOTING_WEIGHT()).to.equal(MIN_VOTING_WEIGHT);
      expect(await agentVoting.MAX_VOTING_WEIGHT()).to.equal(MAX_VOTING_WEIGHT);
      expect(await agentVoting.MIN_REPUTATION()).to.equal(0n);
      expect(await agentVoting.MAX_REPUTATION()).to.equal(100n);
    });

    it("Should have zero agents initially", async function () {
      expect(await agentVoting.getAgentCount()).to.equal(0n);
    });
  });

  describe("Agent Registration", function () {
    it("Should register an agent successfully", async function () {
      await expect(
        agentVoting.registerAgent(agent1.address, AgentType.Technical, 5)
      )
        .to.emit(agentVoting, "AgentRegistered")
        .withArgs(agent1.address, AgentType.Technical, 5, INITIAL_REPUTATION);

      const agent = await agentVoting.getAgent(agent1.address);
      expect(agent.agentAddress).to.equal(agent1.address);
      expect(agent.agentType).to.equal(AgentType.Technical);
      expect(agent.votingWeight).to.equal(5);
      expect(agent.reputationScore).to.equal(INITIAL_REPUTATION);
      expect(agent.isActive).to.be.true;
      expect(agent.totalVotes).to.equal(0);
    });

    it("Should register multiple agents with different types", async function () {
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 7);
      await agentVoting.registerAgent(agent2.address, AgentType.Impact, 6);
      await agentVoting.registerAgent(agent3.address, AgentType.DueDiligence, 8);
      await agentVoting.registerAgent(agent4.address, AgentType.Budget, 5);
      await agentVoting.registerAgent(agent5.address, AgentType.Community, 9);

      expect(await agentVoting.getAgentCount()).to.equal(5n);

      const allAgents = await agentVoting.getAllAgents();
      expect(allAgents).to.have.lengthOf(5);
      expect(allAgents).to.include(agent1.address);
      expect(allAgents).to.include(agent5.address);
    });

    it("Should reject registration with invalid voting weight", async function () {
      await expect(
        agentVoting.registerAgent(agent1.address, AgentType.Technical, 0)
      ).to.be.revertedWith("Invalid voting weight");

      await expect(
        agentVoting.registerAgent(agent1.address, AgentType.Technical, 11)
      ).to.be.revertedWith("Invalid voting weight");
    });

    it("Should reject registration with zero address", async function () {
      await expect(
        agentVoting.registerAgent(ethers.ZeroAddress, AgentType.Technical, 5)
      ).to.be.revertedWith("Invalid agent address");
    });

    it("Should reject duplicate registration", async function () {
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 5);
      await expect(
        agentVoting.registerAgent(agent1.address, AgentType.Impact, 6)
      ).to.be.revertedWith("Agent already registered and active");
    });

    it("Should reject registration by non-owner", async function () {
      await expect(
        agentVoting.connect(agent1).registerAgent(agent2.address, AgentType.Technical, 5)
      ).to.be.revertedWithCustomError(agentVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Agent Deactivation and Reactivation", function () {
    beforeEach(async function () {
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 5);
    });

    it("Should deactivate an agent", async function () {
      await expect(agentVoting.deactivateAgent(agent1.address))
        .to.emit(agentVoting, "AgentDeactivated")
        .withArgs(agent1.address);

      const agent = await agentVoting.getAgent(agent1.address);
      expect(agent.isActive).to.be.false;
      expect(await agentVoting.isAgentActive(agent1.address)).to.be.false;
    });

    it("Should reactivate a deactivated agent", async function () {
      await agentVoting.deactivateAgent(agent1.address);

      await expect(agentVoting.reactivateAgent(agent1.address))
        .to.emit(agentVoting, "AgentReactivated")
        .withArgs(agent1.address);

      const agent = await agentVoting.getAgent(agent1.address);
      expect(agent.isActive).to.be.true;
    });

    it("Should reject deactivation of inactive agent", async function () {
      await agentVoting.deactivateAgent(agent1.address);
      await expect(
        agentVoting.deactivateAgent(agent1.address)
      ).to.be.revertedWith("Agent is not active");
    });

    it("Should reject reactivation of active agent", async function () {
      await expect(
        agentVoting.reactivateAgent(agent1.address)
      ).to.be.revertedWith("Agent is already active");
    });

    it("Should filter active agents correctly", async function () {
      await agentVoting.registerAgent(agent2.address, AgentType.Impact, 6);
      await agentVoting.registerAgent(agent3.address, AgentType.DueDiligence, 7);

      await agentVoting.deactivateAgent(agent2.address);

      const activeAgents = await agentVoting.getActiveAgents();
      expect(activeAgents).to.have.lengthOf(2);
      expect(activeAgents).to.include(agent1.address);
      expect(activeAgents).to.include(agent3.address);
      expect(activeAgents).to.not.include(agent2.address);
    });
  });

  describe("Voting Session Creation", function () {
    const grantId = 1;
    const duration = 7 * 24 * 60 * 60; // 7 days

    it("Should create a voting session", async function () {
      const tx = await agentVoting.createVotingSession(grantId, duration);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(agentVoting, "VotingSessionCreated")
        .withArgs(grantId, block.timestamp, block.timestamp + duration);

      const session = await agentVoting.getVotingSession(grantId);
      expect(session.grantId).to.equal(grantId);
      expect(session.isActive).to.be.true;
      expect(session.isFinalized).to.be.false;
      expect(session.totalVotes).to.equal(0);
    });

    it("Should reject duplicate voting session", async function () {
      await agentVoting.createVotingSession(grantId, duration);
      await expect(
        agentVoting.createVotingSession(grantId, duration)
      ).to.be.revertedWith("Voting session already exists");
    });

    it("Should reject zero duration", async function () {
      await expect(
        agentVoting.createVotingSession(grantId, 0)
      ).to.be.revertedWith("Duration must be greater than zero");
    });

    it("Should reject creation by non-owner", async function () {
      await expect(
        agentVoting.connect(agent1).createVotingSession(grantId, duration)
      ).to.be.revertedWithCustomError(agentVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Voting", function () {
    const grantId = 1;
    const duration = 7 * 24 * 60 * 60;

    beforeEach(async function () {
      // Register agents
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 7);
      await agentVoting.registerAgent(agent2.address, AgentType.Impact, 6);
      await agentVoting.registerAgent(agent3.address, AgentType.DueDiligence, 8);

      // Create voting session
      await agentVoting.createVotingSession(grantId, duration);
    });

    it("Should allow registered agent to vote", async function () {
      const score = 2;
      const rationale = "Excellent technical proposal with clear milestones";

      await expect(
        agentVoting.connect(agent1).castVote(grantId, score, rationale)
      )
        .to.emit(agentVoting, "VoteCast")
        .withArgs(grantId, agent1.address, score, rationale, await ethers.provider.getBlock().then(b => b.timestamp + 1));

      const vote = await agentVoting.getVote(grantId, agent1.address);
      expect(vote.agent).to.equal(agent1.address);
      expect(vote.score).to.equal(score);
      expect(vote.rationale).to.equal(rationale);

      expect(await agentVoting.hasAgentVoted(grantId, agent1.address)).to.be.true;

      const session = await agentVoting.getVotingSession(grantId);
      expect(session.totalVotes).to.equal(1);
    });

    it("Should allow multiple agents to vote", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 2, "Strong technical merit");
      await agentVoting.connect(agent2).castVote(grantId, 1, "Good social impact");
      await agentVoting.connect(agent3).castVote(grantId, -1, "Due diligence concerns");

      const session = await agentVoting.getVotingSession(grantId);
      expect(session.totalVotes).to.equal(3n);

      const voters = await agentVoting.getVoters(grantId);
      expect(voters).to.have.lengthOf(3);
      expect(voters).to.include(agent1.address);
      expect(voters).to.include(agent2.address);
      expect(voters).to.include(agent3.address);
    });

    it("Should accept all valid vote scores (-2 to 2)", async function () {
      const grantIds = [2, 3, 4, 5, 6];
      const scores = [-2, -1, 0, 1, 2];

      for (let i = 0; i < scores.length; i++) {
        await agentVoting.createVotingSession(grantIds[i], duration);
        await expect(
          agentVoting.connect(agent1).castVote(grantIds[i], scores[i], "Test rationale")
        ).to.not.be.reverted;
      }
    });

    it("Should reject invalid vote scores", async function () {
      await expect(
        agentVoting.connect(agent1).castVote(grantId, -3, "Invalid score")
      ).to.be.revertedWith("Score must be between -2 and +2");

      await expect(
        agentVoting.connect(agent1).castVote(grantId, 3, "Invalid score")
      ).to.be.revertedWith("Score must be between -2 and +2");
    });

    it("Should reject duplicate votes", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 1, "First vote");
      await expect(
        agentVoting.connect(agent1).castVote(grantId, 2, "Second vote")
      ).to.be.revertedWith("Agent has already voted");
    });

    it("Should reject voting by non-registered agent", async function () {
      await expect(
        agentVoting.connect(nonAgent).castVote(grantId, 1, "Rationale")
      ).to.be.revertedWith("Agent not registered or inactive");
    });

    it("Should reject voting by deactivated agent", async function () {
      await agentVoting.deactivateAgent(agent1.address);
      await expect(
        agentVoting.connect(agent1).castVote(grantId, 1, "Rationale")
      ).to.be.revertedWith("Agent not registered or inactive");
    });

    it("Should reject empty rationale", async function () {
      await expect(
        agentVoting.connect(agent1).castVote(grantId, 1, "")
      ).to.be.revertedWith("Rationale cannot be empty");
    });

    it("Should reject voting on non-existent session", async function () {
      await expect(
        agentVoting.connect(agent1).castVote(999, 1, "Rationale")
      ).to.be.revertedWith("Voting session does not exist");
    });
  });

  describe("Vote Finalization", function () {
    const grantId = 1;
    const duration = 100; // Short duration for testing

    beforeEach(async function () {
      // Register agents with different weights and reputations
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 8);
      await agentVoting.registerAgent(agent2.address, AgentType.Impact, 6);
      await agentVoting.registerAgent(agent3.address, AgentType.DueDiligence, 7);

      // Update reputations for testing
      await agentVoting.updateAgentReputation(agent1.address, 80);
      await agentVoting.updateAgentReputation(agent2.address, 60);
      await agentVoting.updateAgentReputation(agent3.address, 70);

      // Create voting session
      await agentVoting.createVotingSession(grantId, duration);
    });

    it("Should finalize vote and calculate weighted score", async function () {
      // Cast votes
      await agentVoting.connect(agent1).castVote(grantId, 2, "Excellent");
      await agentVoting.connect(agent2).castVote(grantId, 1, "Good");
      await agentVoting.connect(agent3).castVote(grantId, -1, "Concerns");

      // Wait for voting period to end
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      // Finalize vote
      await expect(agentVoting.finalizeVote(grantId))
        .to.emit(agentVoting, "VotingFinalized");

      const session = await agentVoting.getVotingSession(grantId);
      expect(session.isFinalized).to.be.true;
      expect(session.isActive).to.be.false;

      // Calculate expected weighted score
      // Agent1: 2 * 8 * 80/100 = 12.8
      // Agent2: 1 * 6 * 60/100 = 3.6
      // Agent3: -1 * 7 * 70/100 = -4.9
      // Total weighted: 12.8 + 3.6 - 4.9 = 11.5
      // Total weight: 8*0.8 + 6*0.6 + 7*0.7 = 6.4 + 3.6 + 4.9 = 14.9
      // Final score: 11.5 / 14.9 * 100 = 77.18 (approximately)

      const finalScore = await agentVoting.getFinalScore(grantId);
      expect(finalScore).to.be.greaterThan(0); // Positive overall score
    });

    it("Should handle negative weighted scores", async function () {
      await agentVoting.connect(agent1).castVote(grantId, -2, "Major issues");
      await agentVoting.connect(agent2).castVote(grantId, -1, "Concerns");
      await agentVoting.connect(agent3).castVote(grantId, 1, "Some merit");

      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await agentVoting.finalizeVote(grantId);

      const finalScore = await agentVoting.getFinalScore(grantId);
      expect(finalScore).to.be.lessThan(0); // Negative overall score
    });

    it("Should reject finalization before voting ends", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 1, "Vote");

      await expect(
        agentVoting.finalizeVote(grantId)
      ).to.be.revertedWith("Voting period has not ended");
    });

    it("Should reject finalization with no votes", async function () {
      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        agentVoting.finalizeVote(grantId)
      ).to.be.revertedWith("No votes cast");
    });

    it("Should reject duplicate finalization", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 1, "Vote");

      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await agentVoting.finalizeVote(grantId);

      await expect(
        agentVoting.finalizeVote(grantId)
      ).to.be.revertedWith("Voting session is not active");
    });

    it("Should reject finalization by non-owner", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 1, "Vote");

      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        agentVoting.connect(agent1).finalizeVote(grantId)
      ).to.be.revertedWithCustomError(agentVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Reputation Management", function () {
    beforeEach(async function () {
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 5);
    });

    it("Should update agent reputation", async function () {
      await expect(agentVoting.updateAgentReputation(agent1.address, 75))
        .to.emit(agentVoting, "ReputationUpdated")
        .withArgs(agent1.address, INITIAL_REPUTATION, 75);

      const agent = await agentVoting.getAgent(agent1.address);
      expect(agent.reputationScore).to.equal(75);
    });

    it("Should accept valid reputation range (0-100)", async function () {
      await agentVoting.updateAgentReputation(agent1.address, 0);
      let agent = await agentVoting.getAgent(agent1.address);
      expect(agent.reputationScore).to.equal(0n);

      await agentVoting.updateAgentReputation(agent1.address, 100);
      agent = await agentVoting.getAgent(agent1.address);
      expect(agent.reputationScore).to.equal(100n);
    });

    it("Should reject invalid reputation scores", async function () {
      await expect(
        agentVoting.updateAgentReputation(agent1.address, 101)
      ).to.be.revertedWith("Invalid reputation score");
    });

    it("Should reject reputation update for non-existent agent", async function () {
      await expect(
        agentVoting.updateAgentReputation(nonAgent.address, 50)
      ).to.be.revertedWith("Agent not registered");
    });

    it("Should reject reputation update by non-owner", async function () {
      await expect(
        agentVoting.connect(agent1).updateAgentReputation(agent1.address, 75)
      ).to.be.revertedWithCustomError(agentVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("Voting Weight Management", function () {
    beforeEach(async function () {
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 5);
    });

    it("Should update voting weight", async function () {
      await expect(agentVoting.updateVotingWeight(agent1.address, 8))
        .to.emit(agentVoting, "VotingWeightUpdated")
        .withArgs(agent1.address, 5, 8);

      const agent = await agentVoting.getAgent(agent1.address);
      expect(agent.votingWeight).to.equal(8);
    });

    it("Should accept valid weight range (1-10)", async function () {
      await agentVoting.updateVotingWeight(agent1.address, 1);
      let agent = await agentVoting.getAgent(agent1.address);
      expect(agent.votingWeight).to.equal(1n);

      await agentVoting.updateVotingWeight(agent1.address, 10);
      agent = await agentVoting.getAgent(agent1.address);
      expect(agent.votingWeight).to.equal(10n);
    });

    it("Should reject invalid voting weights", async function () {
      await expect(
        agentVoting.updateVotingWeight(agent1.address, 0)
      ).to.be.revertedWith("Invalid voting weight");

      await expect(
        agentVoting.updateVotingWeight(agent1.address, 11)
      ).to.be.revertedWith("Invalid voting weight");
    });

    it("Should reject weight update for non-existent agent", async function () {
      await expect(
        agentVoting.updateVotingWeight(nonAgent.address, 5)
      ).to.be.revertedWith("Agent not registered");
    });

    it("Should reject weight update by non-owner", async function () {
      await expect(
        agentVoting.connect(agent1).updateVotingWeight(agent1.address, 8)
      ).to.be.revertedWithCustomError(agentVoting, "OwnableUnauthorizedAccount");
    });
  });

  describe("View Functions", function () {
    const grantId = 1;
    const duration = 7 * 24 * 60 * 60;

    beforeEach(async function () {
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 7);
      await agentVoting.registerAgent(agent2.address, AgentType.Impact, 6);
      await agentVoting.createVotingSession(grantId, duration);
      await agentVoting.connect(agent1).castVote(grantId, 2, "Excellent");
    });

    it("Should get agent details", async function () {
      const agent = await agentVoting.getAgent(agent1.address);
      expect(agent.agentAddress).to.equal(agent1.address);
      expect(agent.agentType).to.equal(0n);
      expect(agent.isActive).to.be.true;
    });

    it("Should get voting session details", async function () {
      const session = await agentVoting.getVotingSession(grantId);
      expect(session.grantId).to.equal(1n);
      expect(session.isActive).to.be.true;
      expect(session.totalVotes).to.equal(1n);
    });

    it("Should get vote details", async function () {
      const vote = await agentVoting.getVote(grantId, agent1.address);
      expect(vote.agent).to.equal(agent1.address);
      expect(vote.score).to.equal(2n);
      expect(vote.rationale).to.equal("Excellent");
    });

    it("Should get all voters", async function () {
      await agentVoting.connect(agent2).castVote(grantId, 1, "Good");

      const voters = await agentVoting.getVoters(grantId);
      expect(voters).to.have.lengthOf(2);
      expect(voters).to.include(agent1.address);
      expect(voters).to.include(agent2.address);
    });

    it("Should check if agent voted", async function () {
      expect(await agentVoting.hasAgentVoted(grantId, agent1.address)).to.be.true;
      expect(await agentVoting.hasAgentVoted(grantId, agent2.address)).to.be.false;
    });

    it("Should check if agent is active", async function () {
      expect(await agentVoting.isAgentActive(agent1.address)).to.be.true;
      await agentVoting.deactivateAgent(agent1.address);
      expect(await agentVoting.isAgentActive(agent1.address)).to.be.false;
    });

    it("Should get agent count", async function () {
      expect(await agentVoting.getAgentCount()).to.equal(2n);
      await agentVoting.registerAgent(agent3.address, AgentType.DueDiligence, 5);
      expect(await agentVoting.getAgentCount()).to.equal(3n);
    });

    it("Should reject getting non-existent vote", async function () {
      await expect(
        agentVoting.getVote(grantId, agent2.address)
      ).to.be.revertedWith("Agent has not voted");
    });
  });

  describe("Complex Voting Scenarios", function () {
    const grantId = 1;
    const duration = 100;

    beforeEach(async function () {
      // Register diverse agent pool
      await agentVoting.registerAgent(agent1.address, AgentType.Technical, 9);
      await agentVoting.registerAgent(agent2.address, AgentType.Impact, 7);
      await agentVoting.registerAgent(agent3.address, AgentType.DueDiligence, 8);
      await agentVoting.registerAgent(agent4.address, AgentType.Budget, 6);
      await agentVoting.registerAgent(agent5.address, AgentType.Community, 5);

      // Set varied reputations
      await agentVoting.updateAgentReputation(agent1.address, 90);
      await agentVoting.updateAgentReputation(agent2.address, 70);
      await agentVoting.updateAgentReputation(agent3.address, 85);
      await agentVoting.updateAgentReputation(agent4.address, 60);
      await agentVoting.updateAgentReputation(agent5.address, 75);

      await agentVoting.createVotingSession(grantId, duration);
    });

    it("Should handle mixed vote scores correctly", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 2, "Strong support");
      await agentVoting.connect(agent2).castVote(grantId, 1, "Moderate support");
      await agentVoting.connect(agent3).castVote(grantId, 0, "Neutral");
      await agentVoting.connect(agent4).castVote(grantId, -1, "Minor concerns");
      await agentVoting.connect(agent5).castVote(grantId, -2, "Major concerns");

      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await agentVoting.finalizeVote(grantId);

      const session = await agentVoting.getVotingSession(grantId);
      expect(session.totalVotes).to.equal(5n);
      expect(session.isFinalized).to.be.true;

      // Final score should reflect weighted calculation
      const finalScore = await agentVoting.getFinalScore(grantId);
      expect(finalScore).to.not.equal(0); // Should have calculated score
    });

    it("Should increment agent total votes", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 1, "Vote 1");

      let agent = await agentVoting.getAgent(agent1.address);
      expect(agent.totalVotes).to.equal(1n);

      // Create another session
      const grantId2 = 2;
      await agentVoting.createVotingSession(grantId2, duration);
      await agentVoting.connect(agent1).castVote(grantId2, 2, "Vote 2");

      agent = await agentVoting.getAgent(agent1.address);
      expect(agent.totalVotes).to.equal(2n);
    });

    it("Should handle all positive votes", async function () {
      await agentVoting.connect(agent1).castVote(grantId, 2, "Support");
      await agentVoting.connect(agent2).castVote(grantId, 2, "Support");
      await agentVoting.connect(agent3).castVote(grantId, 1, "Support");

      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await agentVoting.finalizeVote(grantId);

      const finalScore = await agentVoting.getFinalScore(grantId);
      expect(finalScore).to.be.greaterThan(0);
    });

    it("Should handle all negative votes", async function () {
      await agentVoting.connect(agent1).castVote(grantId, -2, "Reject");
      await agentVoting.connect(agent2).castVote(grantId, -1, "Reject");
      await agentVoting.connect(agent3).castVote(grantId, -2, "Reject");

      await ethers.provider.send("evm_increaseTime", [duration + 1]);
      await ethers.provider.send("evm_mine");

      await agentVoting.finalizeVote(grantId);

      const finalScore = await agentVoting.getFinalScore(grantId);
      expect(finalScore).to.be.lessThan(0);
    });
  });
});
