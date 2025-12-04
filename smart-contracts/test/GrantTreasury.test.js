const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GrantTreasury", function () {
  let grantTreasury;
  let owner;
  let manager;
  let recipient;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, manager, recipient, addr1, addr2] = await ethers.getSigners();

    const GrantTreasury = await ethers.getContractFactory("GrantTreasury");
    grantTreasury = await GrantTreasury.deploy();
    await grantTreasury.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await grantTreasury.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero balances", async function () {
      const stats = await grantTreasury.getTreasuryStats();
      expect(stats.balance).to.equal(0);
      expect(stats.deposited).to.equal(0);
      expect(stats.disbursed).to.equal(0);
    });
  });

  describe("Treasury Manager Management", function () {
    it("Should allow owner to add treasury managers", async function () {
      await grantTreasury.addTreasuryManager(manager.address);
      expect(await grantTreasury.isTreasuryManager(manager.address)).to.be.true;
    });

    it("Should emit TreasuryManagerAdded event", async function () {
      await expect(grantTreasury.addTreasuryManager(manager.address))
        .to.emit(grantTreasury, "TreasuryManagerAdded")
        .withArgs(manager.address);
    });

    it("Should not allow non-owner to add managers", async function () {
      await expect(
        grantTreasury.connect(addr1).addTreasuryManager(manager.address)
      ).to.be.reverted;
    });

    it("Should allow owner to remove managers", async function () {
      await grantTreasury.addTreasuryManager(manager.address);
      await grantTreasury.removeTreasuryManager(manager.address);
      expect(await grantTreasury.isTreasuryManager(manager.address)).to.be.false;
    });
  });

  describe("Fund Deposits", function () {
    it("Should accept ETH deposits", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await expect(
        grantTreasury.depositFunds({ value: depositAmount })
      )
        .to.emit(grantTreasury, "FundsDeposited")
        .withArgs(owner.address, depositAmount, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      expect(await grantTreasury.getTreasuryBalance()).to.equal(depositAmount);
    });

    it("Should accept ETH via receive function", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await owner.sendTransaction({
        to: await grantTreasury.getAddress(),
        value: depositAmount
      });

      expect(await grantTreasury.getTreasuryBalance()).to.equal(depositAmount);
    });

    it("Should reject zero deposits", async function () {
      await expect(
        grantTreasury.depositFunds({ value: 0 })
      ).to.be.revertedWith("Deposit amount must be greater than zero");
    });

    it("Should track total deposited", async function () {
      const amount1 = ethers.parseEther("1.0");
      const amount2 = ethers.parseEther("2.0");
      
      await grantTreasury.depositFunds({ value: amount1 });
      await grantTreasury.depositFunds({ value: amount2 });

      const stats = await grantTreasury.getTreasuryStats();
      expect(stats.deposited).to.equal(amount1 + amount2);
    });
  });

  describe("Milestone Schedule Creation", function () {
    beforeEach(async function () {
      await grantTreasury.addTreasuryManager(manager.address);
      await grantTreasury.depositFunds({ value: ethers.parseEther("10.0") });
    });

    it("Should create milestone schedule", async function () {
      const grantId = 1;
      const amounts = [
        ethers.parseEther("1.0"),
        ethers.parseEther("2.0"),
        ethers.parseEther("1.5")
      ];
      const deliverables = ["Milestone 1", "Milestone 2", "Milestone 3"];
      const deadlines = [
        Math.floor(Date.now() / 1000) + 86400,
        Math.floor(Date.now() / 1000) + 172800,
        Math.floor(Date.now() / 1000) + 259200
      ];

      await expect(
        grantTreasury.connect(manager).createMilestoneSchedule(
          grantId,
          recipient.address,
          amounts,
          deliverables,
          deadlines
        )
      )
        .to.emit(grantTreasury, "MilestoneScheduleCreated")
        .withArgs(grantId, recipient.address, amounts[0] + amounts[1] + amounts[2], 3);

      expect(await grantTreasury.hasGrantSchedule(grantId)).to.be.true;
    });

    it("Should create individual milestone events", async function () {
      const grantId = 1;
      const amounts = [ethers.parseEther("1.0")];
      const deliverables = ["Milestone 1"];
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        grantTreasury.connect(manager).createMilestoneSchedule(
          grantId,
          recipient.address,
          amounts,
          deliverables,
          [deadline]
        )
      )
        .to.emit(grantTreasury, "MilestoneCreated")
        .withArgs(grantId, 0, amounts[0], deliverables[0], deadline);
    });

    it("Should reject schedule with mismatched array lengths", async function () {
      const grantId = 1;
      const amounts = [ethers.parseEther("1.0")];
      const deliverables = ["Milestone 1", "Milestone 2"];
      const deadlines = [Math.floor(Date.now() / 1000) + 86400];

      await expect(
        grantTreasury.connect(manager).createMilestoneSchedule(
          grantId,
          recipient.address,
          amounts,
          deliverables,
          deadlines
        )
      ).to.be.revertedWith("Array lengths must match");
    });

    it("Should reject duplicate grant IDs", async function () {
      const grantId = 1;
      const amounts = [ethers.parseEther("1.0")];
      const deliverables = ["Milestone 1"];
      const deadlines = [Math.floor(Date.now() / 1000) + 86400];

      await grantTreasury.connect(manager).createMilestoneSchedule(
        grantId,
        recipient.address,
        amounts,
        deliverables,
        deadlines
      );

      await expect(
        grantTreasury.connect(manager).createMilestoneSchedule(
          grantId,
          recipient.address,
          amounts,
          deliverables,
          deadlines
        )
      ).to.be.revertedWith("Grant schedule already exists");
    });

    it("Should reject past deadlines", async function () {
      const grantId = 1;
      const amounts = [ethers.parseEther("1.0")];
      const deliverables = ["Milestone 1"];
      const deadlines = [Math.floor(Date.now() / 1000) - 86400]; // Past deadline

      await expect(
        grantTreasury.connect(manager).createMilestoneSchedule(
          grantId,
          recipient.address,
          amounts,
          deliverables,
          deadlines
        )
      ).to.be.revertedWith("Deadline must be in the future");
    });
  });

  describe("Milestone Completion and Payment", function () {
    const grantId = 1;
    const amounts = [ethers.parseEther("1.0"), ethers.parseEther("2.0")];
    const deliverables = ["Milestone 1", "Milestone 2"];
    let deadlines;

    beforeEach(async function () {
      await grantTreasury.addTreasuryManager(manager.address);
      await grantTreasury.depositFunds({ value: ethers.parseEther("10.0") });

      deadlines = [
        Math.floor(Date.now() / 1000) + 86400,
        Math.floor(Date.now() / 1000) + 172800
      ];

      await grantTreasury.connect(manager).createMilestoneSchedule(
        grantId,
        recipient.address,
        amounts,
        deliverables,
        deadlines
      );
    });

    it("Should mark milestone as complete", async function () {
      await expect(
        grantTreasury.connect(manager).markMilestoneComplete(grantId, 0)
      )
        .to.emit(grantTreasury, "MilestoneCompleted")
        .withArgs(grantId, 0, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      const milestone = await grantTreasury.getMilestone(grantId, 0);
      expect(milestone.completed).to.be.true;
    });

    it("Should release funds for completed milestone", async function () {
      await grantTreasury.connect(manager).markMilestoneComplete(grantId, 0);
      
      const initialBalance = await ethers.provider.getBalance(recipient.address);
      
      await expect(
        grantTreasury.connect(manager).releaseMilestoneFund(grantId, 0)
      )
        .to.emit(grantTreasury, "FundsReleased")
        .withArgs(grantId, 0, recipient.address, amounts[0], await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      const finalBalance = await ethers.provider.getBalance(recipient.address);
      expect(finalBalance - initialBalance).to.equal(amounts[0]);
    });

    it("Should update paid status after release", async function () {
      await grantTreasury.connect(manager).markMilestoneComplete(grantId, 0);
      await grantTreasury.connect(manager).releaseMilestoneFund(grantId, 0);

      const milestone = await grantTreasury.getMilestone(grantId, 0);
      expect(milestone.paid).to.be.true;
    });

    it("Should reject release for incomplete milestone", async function () {
      await expect(
        grantTreasury.connect(manager).releaseMilestoneFund(grantId, 0)
      ).to.be.revertedWith("Milestone not completed");
    });

    it("Should reject double payment", async function () {
      await grantTreasury.connect(manager).markMilestoneComplete(grantId, 0);
      await grantTreasury.connect(manager).releaseMilestoneFund(grantId, 0);

      await expect(
        grantTreasury.connect(manager).releaseMilestoneFund(grantId, 0)
      ).to.be.revertedWith("Milestone already paid");
    });

    it("Should track total disbursed", async function () {
      await grantTreasury.connect(manager).markMilestoneComplete(grantId, 0);
      await grantTreasury.connect(manager).releaseMilestoneFund(grantId, 0);

      const stats = await grantTreasury.getTreasuryStats();
      expect(stats.disbursed).to.equal(amounts[0]);
    });
  });

  describe("Pause Functionality", function () {
    beforeEach(async function () {
      await grantTreasury.addTreasuryManager(manager.address);
    });

    it("Should allow owner to pause", async function () {
      await grantTreasury.pause();
      expect(await grantTreasury.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await grantTreasury.pause();
      await grantTreasury.unpause();
      expect(await grantTreasury.paused()).to.be.false;
    });

    it("Should block operations when paused", async function () {
      await grantTreasury.pause();

      const amounts = [ethers.parseEther("1.0")];
      const deliverables = ["Milestone 1"];
      const deadlines = [Math.floor(Date.now() / 1000) + 86400];

      await expect(
        grantTreasury.connect(manager).createMilestoneSchedule(
          1,
          recipient.address,
          amounts,
          deliverables,
          deadlines
        )
      ).to.be.reverted;
    });
  });

  describe("Emergency Withdrawal", function () {
    beforeEach(async function () {
      await grantTreasury.depositFunds({ value: ethers.parseEther("5.0") });
      await grantTreasury.pause();
    });

    it("Should allow emergency withdrawal when paused", async function () {
      const withdrawAmount = ethers.parseEther("2.0");
      
      await expect(
        grantTreasury.emergencyWithdraw(owner.address, withdrawAmount)
      )
        .to.emit(grantTreasury, "EmergencyWithdrawal")
        .withArgs(owner.address, withdrawAmount);
    });

    it("Should not allow emergency withdrawal when not paused", async function () {
      await grantTreasury.unpause();
      
      await expect(
        grantTreasury.emergencyWithdraw(owner.address, ethers.parseEther("1.0"))
      ).to.be.reverted;
    });

    it("Should reject withdrawal exceeding balance", async function () {
      await expect(
        grantTreasury.emergencyWithdraw(owner.address, ethers.parseEther("10.0"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      await grantTreasury.addTreasuryManager(manager.address);
      await grantTreasury.depositFunds({ value: ethers.parseEther("10.0") });

      const amounts = [ethers.parseEther("1.0")];
      const deliverables = ["Milestone 1"];
      const deadlines = [Math.floor(Date.now() / 1000) + 86400];

      await grantTreasury.connect(manager).createMilestoneSchedule(
        1,
        recipient.address,
        amounts,
        deliverables,
        deadlines
      );
    });

    it("Should retrieve grant schedule", async function () {
      const schedule = await grantTreasury.getGrantSchedule(1);
      expect(schedule.grantId).to.equal(1);
      expect(schedule.recipient).to.equal(recipient.address);
      expect(schedule.milestoneCount).to.equal(1);
    });

    it("Should retrieve all milestones", async function () {
      const milestones = await grantTreasury.getAllMilestones(1);
      expect(milestones.length).to.equal(1);
      expect(milestones[0].deliverable).to.equal("Milestone 1");
    });
  });
});
