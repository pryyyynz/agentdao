import { expect } from "chai";
import { ethers } from "hardhat";
import type { MilestoneGrantRegistry } from "../typechain-types";
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("MilestoneGrantRegistry", function () {
  let registry: MilestoneGrantRegistry;
  let owner: SignerWithAddress;
  let agent: SignerWithAddress;
  let admin: SignerWithAddress;
  let applicant: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async function () {
    [owner, agent, admin, applicant, other] = await ethers.getSigners();

    const MilestoneGrantRegistry = await ethers.getContractFactory("MilestoneGrantRegistry");
    registry = await MilestoneGrantRegistry.deploy();
    await registry.waitForDeployment();

    // Setup roles
    await registry.addAgent(agent.address);
    await registry.addAdmin(admin.address);

    // Fund contract
    await registry.depositFunds({ value: ethers.parseEther("10") });
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should make owner an admin by default", async function () {
      expect(await registry.isAdmin(owner.address)).to.be.true;
    });

    it("Should accept ETH deposits", async function () {
      const balance = await ethers.provider.getBalance(await registry.getAddress());
      expect(balance).to.equal(ethers.parseEther("10"));
    });
  });

  describe("Agent Management", function () {
    it("Should add agents", async function () {
      expect(await registry.isAgent(agent.address)).to.be.true;
    });

    it("Should remove agents", async function () {
      await registry.removeAgent(agent.address);
      expect(await registry.isAgent(agent.address)).to.be.false;
    });

    it("Should prevent non-owner from adding agents", async function () {
      await expect(
        registry.connect(other).addAgent(other.address)
      ).to.be.reverted;
    });
  });

  describe("Admin Management", function () {
    it("Should add admins", async function () {
      expect(await registry.isAdmin(admin.address)).to.be.true;
    });

    it("Should remove admins", async function () {
      await registry.removeAdmin(admin.address);
      expect(await registry.isAdmin(admin.address)).to.be.false;
    });

    it("Should prevent removing owner as admin", async function () {
      await expect(
        registry.removeAdmin(owner.address)
      ).to.be.revertedWith("Cannot remove owner");
    });
  });

  describe("Grant Submission", function () {
    it("Should submit a grant without milestones", async function () {
      const tx = await registry.connect(applicant).submitGrant(
        "QmTestHash123",
        ethers.parseEther("1"),
        false
      );

      await expect(tx)
        .to.emit(registry, "GrantSubmitted")
        .withArgs(
          1,
          applicant.address,
          "QmTestHash123",
          ethers.parseEther("1"),
          false,
          await ethers.provider.getBlock("latest").then(b => b?.timestamp)
        );

      const grant = await registry.getGrant(1);
      expect(grant.applicant).to.equal(applicant.address);
      expect(grant.totalAmount).to.equal(ethers.parseEther("1"));
      expect(grant.hasMilestones).to.be.false;
    });

    it("Should submit a grant with milestones", async function () {
      await registry.connect(applicant).submitGrant(
        "QmTestHash456",
        ethers.parseEther("2"),
        true
      );

      const grant = await registry.getGrant(1);
      expect(grant.hasMilestones).to.be.true;
    });

    it("Should reject empty IPFS hash", async function () {
      await expect(
        registry.connect(applicant).submitGrant("", ethers.parseEther("1"), false)
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("Should reject zero amount", async function () {
      await expect(
        registry.connect(applicant).submitGrant("QmTestHash", 0, false)
      ).to.be.revertedWith("Grant amount must be greater than zero");
    });
  });

  describe("Grant Status Updates", function () {
    beforeEach(async function () {
      await registry.connect(applicant).submitGrant(
        "QmTestHash",
        ethers.parseEther("1"),
        false
      );
    });

    it("Should allow agent to update grant status", async function () {
      await registry.connect(agent).updateGrantStatus(1, 2, 85); // Status 2 = Approved

      const grant = await registry.getGrant(1);
      expect(grant.status).to.equal(2);
      expect(grant.score).to.equal(85);
    });

    it("Should allow owner to update grant status", async function () {
      await registry.connect(owner).updateGrantStatus(1, 2, 90);

      const grant = await registry.getGrant(1);
      expect(grant.status).to.equal(2);
    });

    it("Should prevent non-agent from updating status", async function () {
      await expect(
        registry.connect(other).updateGrantStatus(1, 2, 85)
      ).to.be.revertedWith("Only agents or owner");
    });
  });

  describe("Milestone Creation", function () {
    beforeEach(async function () {
      await registry.connect(applicant).submitGrant(
        "QmMilestoneGrant",
        ethers.parseEther("3"),
        true
      );
    });

    it("Should create milestones", async function () {
      const titles = ["Phase 1", "Phase 2", "Phase 3"];
      const amounts = [
        ethers.parseEther("1"),
        ethers.parseEther("1"),
        ethers.parseEther("1")
      ];

      await registry.connect(applicant).createMilestones(1, titles, amounts);

      const grant = await registry.getGrant(1);
      expect(grant.milestoneCount).to.equal(3);

      const milestone1 = await registry.getMilestone(1, 1);
      expect(milestone1.title).to.equal("Phase 1");
      expect(milestone1.amount).to.equal(ethers.parseEther("1"));
      expect(milestone1.status).to.equal(1); // Active
    });

    it("Should reject mismatched amounts", async function () {
      const titles = ["Phase 1", "Phase 2"];
      const amounts = [ethers.parseEther("1"), ethers.parseEther("1")]; // Sum = 2, but grant = 3

      await expect(
        registry.connect(applicant).createMilestones(1, titles, amounts)
      ).to.be.revertedWith("Milestone amounts must sum to grant total");
    });

    it("Should reject array length mismatch", async function () {
      const titles = ["Phase 1", "Phase 2"];
      const amounts = [ethers.parseEther("3")];

      await expect(
        registry.connect(applicant).createMilestones(1, titles, amounts)
      ).to.be.revertedWith("Arrays length mismatch");
    });

    it("Should prevent non-applicant from creating milestones", async function () {
      const titles = ["Phase 1"];
      const amounts = [ethers.parseEther("3")];

      await expect(
        registry.connect(other).createMilestones(1, titles, amounts)
      ).to.be.revertedWith("Only applicant or admin");
    });
  });

  describe("Milestone Workflow", function () {
    beforeEach(async function () {
      // Submit grant
      await registry.connect(applicant).submitGrant(
        "QmMilestoneGrant",
        ethers.parseEther("2"),
        true
      );

      // Create milestones
      await registry.connect(applicant).createMilestones(
        1,
        ["Milestone 1", "Milestone 2"],
        [ethers.parseEther("1"), ethers.parseEther("1")]
      );
    });

    it("Should submit milestone proof of work", async function () {
      await registry.connect(applicant).submitMilestone(1, 1, "QmProofHash123");

      const milestone = await registry.getMilestone(1, 1);
      expect(milestone.proofOfWorkHash).to.equal("QmProofHash123");
      expect(milestone.status).to.equal(2); // Submitted
    });

    it("Should approve milestone", async function () {
      await registry.connect(applicant).submitMilestone(1, 1, "QmProofHash");
      await registry.connect(admin).approveMilestone(1, 1);

      const milestone = await registry.getMilestone(1, 1);
      expect(milestone.status).to.equal(4); // Approved

      // Check next milestone activated
      const milestone2 = await registry.getMilestone(1, 2);
      expect(milestone2.status).to.equal(1); // Active
    });

    it("Should reject milestone", async function () {
      await registry.connect(applicant).submitMilestone(1, 1, "QmProofHash");
      await registry.connect(admin).rejectMilestone(1, 1);

      const milestone = await registry.getMilestone(1, 1);
      expect(milestone.status).to.equal(5); // Rejected
    });

    it("Should release milestone payment", async function () {
      // Submit and approve milestone
      await registry.connect(applicant).submitMilestone(1, 1, "QmProofHash");
      await registry.connect(admin).approveMilestone(1, 1);

      // Get applicant balance before payment
      const balanceBefore = await ethers.provider.getBalance(applicant.address);

      // Release payment
      await registry.connect(admin).releaseMilestonePayment(1, 1);

      // Check payment
      const milestone = await registry.getMilestone(1, 1);
      expect(milestone.status).to.equal(6); // Paid

      const balanceAfter = await ethers.provider.getBalance(applicant.address);
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1"));

      const grant = await registry.getGrant(1);
      expect(grant.paidAmount).to.equal(ethers.parseEther("1"));
    });

    it("Should complete grant after all milestones paid", async function () {
      // Process milestone 1
      await registry.connect(applicant).submitMilestone(1, 1, "QmProof1");
      await registry.connect(admin).approveMilestone(1, 1);
      await registry.connect(admin).releaseMilestonePayment(1, 1);

      // Process milestone 2
      await registry.connect(applicant).submitMilestone(1, 2, "QmProof2");
      await registry.connect(admin).approveMilestone(1, 2);
      await registry.connect(admin).releaseMilestonePayment(1, 2);

      // Check grant completed
      const grant = await registry.getGrant(1);
      expect(grant.status).to.equal(5); // Completed
      expect(grant.paidAmount).to.equal(grant.totalAmount);
    });

    it("Should prevent double payment", async function () {
      await registry.connect(applicant).submitMilestone(1, 1, "QmProof");
      await registry.connect(admin).approveMilestone(1, 1);
      await registry.connect(admin).releaseMilestonePayment(1, 1);

      // After payment, status is Paid (6), so "Milestone not approved" will fire
      await expect(
        registry.connect(admin).releaseMilestonePayment(1, 1)
      ).to.be.revertedWith("Milestone not approved");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await registry.connect(applicant).submitGrant(
        "QmGrant",
        ethers.parseEther("1"),
        true
      );
      await registry.connect(applicant).createMilestones(
        1,
        ["M1", "M2"],
        [ethers.parseEther("0.5"), ethers.parseEther("0.5")]
      );
    });

    it("Should get all milestones", async function () {
      const milestones = await registry.getAllMilestones(1);
      expect(milestones.length).to.equal(2);
      expect(milestones[0].title).to.equal("M1");
      expect(milestones[1].title).to.equal("M2");
    });

    it("Should get grant count", async function () {
      expect(await registry.getGrantCount()).to.equal(1);
    });

    it("Should get treasury stats", async function () {
      const stats = await registry.getTreasuryStats();
      expect(stats.balance).to.equal(ethers.parseEther("10"));
      expect(stats.deposited).to.equal(ethers.parseEther("10"));
      expect(stats.paid).to.equal(0);
    });
  });
});
