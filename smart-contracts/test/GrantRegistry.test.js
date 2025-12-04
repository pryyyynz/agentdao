const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GrantRegistry", function () {
  let grantRegistry;
  let owner;
  let agent;
  let applicant1;
  let applicant2;

  beforeEach(async function () {
    [owner, agent, applicant1, applicant2] = await ethers.getSigners();

    const GrantRegistry = await ethers.getContractFactory("GrantRegistry");
    grantRegistry = await GrantRegistry.deploy();
    await grantRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await grantRegistry.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero grants", async function () {
      expect(await grantRegistry.getGrantCount()).to.equal(0);
    });
  });

  describe("Agent Management", function () {
    it("Should allow owner to add agents", async function () {
      await grantRegistry.addAgent(agent.address);
      expect(await grantRegistry.isAgent(agent.address)).to.be.true;
    });

    it("Should emit AgentAdded event", async function () {
      await expect(grantRegistry.addAgent(agent.address))
        .to.emit(grantRegistry, "AgentAdded")
        .withArgs(agent.address);
    });

    it("Should not allow non-owner to add agents", async function () {
      await expect(
        grantRegistry.connect(applicant1).addAgent(agent.address)
      ).to.be.reverted;
    });

    it("Should allow owner to remove agents", async function () {
      await grantRegistry.addAgent(agent.address);
      await grantRegistry.removeAgent(agent.address);
      expect(await grantRegistry.isAgent(agent.address)).to.be.false;
    });
  });

  describe("Grant Submission", function () {
    it("Should allow anyone to submit a grant", async function () {
      const ipfsHash = "QmTest123";
      const amount = ethers.parseEther("1.0");

      const tx = await grantRegistry.connect(applicant1).submitGrant(ipfsHash, amount);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(grantRegistry, "GrantSubmitted")
        .withArgs(1, applicant1.address, ipfsHash, amount, block.timestamp);

      expect(await grantRegistry.getGrantCount()).to.equal(1);
    });

    it("Should reject empty IPFS hash", async function () {
      const amount = ethers.parseEther("1.0");
      await expect(
        grantRegistry.connect(applicant1).submitGrant("", amount)
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should reject zero amount", async function () {
      const ipfsHash = "QmTest123";
      await expect(
        grantRegistry.connect(applicant1).submitGrant(ipfsHash, 0)
      ).to.be.revertedWith("Grant amount must be greater than zero");
    });

    it("Should create grant with correct initial status", async function () {
      const ipfsHash = "QmTest123";
      const amount = ethers.parseEther("1.0");

      await grantRegistry.connect(applicant1).submitGrant(ipfsHash, amount);
      const grant = await grantRegistry.getGrant(1);

      expect(grant.id).to.equal(1);
      expect(grant.applicant).to.equal(applicant1.address);
      expect(grant.ipfsHash).to.equal(ipfsHash);
      expect(grant.amount).to.equal(amount);
      expect(grant.status).to.equal(0); // Pending
      expect(grant.score).to.equal(0);
    });
  });

  describe("Grant Status Updates", function () {
    beforeEach(async function () {
      await grantRegistry.addAgent(agent.address);
      const ipfsHash = "QmTest123";
      const amount = ethers.parseEther("1.0");
      await grantRegistry.connect(applicant1).submitGrant(ipfsHash, amount);
    });

    it("Should allow agents to update grant status", async function () {
      await expect(
        grantRegistry.connect(agent).updateGrantStatus(1, 1, 75) // UnderReview, score 75
      )
        .to.emit(grantRegistry, "GrantStatusChanged")
        .withArgs(1, 0, 1, 75); // Pending -> UnderReview

      const grant = await grantRegistry.getGrant(1);
      expect(grant.status).to.equal(1); // UnderReview
      expect(grant.score).to.equal(75);
    });

    it("Should allow owner to update grant status", async function () {
      await grantRegistry.connect(owner).updateGrantStatus(1, 2, 90); // Approved
      const grant = await grantRegistry.getGrant(1);
      expect(grant.status).to.equal(2); // Approved
    });

    it("Should not allow non-agents to update grant status", async function () {
      await expect(
        grantRegistry.connect(applicant2).updateGrantStatus(1, 1, 75)
      ).to.be.revertedWith("Only agents can call this function");
    });

    it("Should reject invalid scores", async function () {
      await expect(
        grantRegistry.connect(agent).updateGrantStatus(1, 1, 101)
      ).to.be.revertedWith("Score must be between 0 and 100");
    });
  });

  describe("Grant Retrieval", function () {
    beforeEach(async function () {
      const ipfsHash1 = "QmTest123";
      const ipfsHash2 = "QmTest456";
      const amount = ethers.parseEther("1.0");

      await grantRegistry.connect(applicant1).submitGrant(ipfsHash1, amount);
      await grantRegistry.connect(applicant2).submitGrant(ipfsHash2, amount);
      await grantRegistry.connect(applicant1).submitGrant(ipfsHash1, amount);
    });

    it("Should retrieve all grants", async function () {
      const grants = await grantRegistry.getAllGrants();
      expect(grants.length).to.equal(3);
    });

    it("Should retrieve grants by applicant", async function () {
      const grants = await grantRegistry.getGrantsByApplicant(applicant1.address);
      expect(grants.length).to.equal(2);
      expect(grants[0].applicant).to.equal(applicant1.address);
    });

    it("Should retrieve grants by status", async function () {
      await grantRegistry.addAgent(agent.address);
      await grantRegistry.connect(agent).updateGrantStatus(1, 2, 90); // Approved

      const pendingGrants = await grantRegistry.getGrantsByStatus(0); // Pending
      const approvedGrants = await grantRegistry.getGrantsByStatus(2); // Approved

      expect(pendingGrants.length).to.equal(2);
      expect(approvedGrants.length).to.equal(1);
    });

    it("Should revert when getting non-existent grant", async function () {
      await expect(grantRegistry.getGrant(999)).to.be.revertedWith(
        "Grant does not exist"
      );
    });
  });
});
