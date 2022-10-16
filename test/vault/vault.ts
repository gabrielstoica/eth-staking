import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { computeReward, convertDaysToTimestamp } from "../../utils/tests.util";
import { Signers } from "../types";
import { deployVaultFixture } from "./vault.fixture";

describe.only("Vault unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.owner = signers[0];
    this.signers.addr1 = signers[1];
    this.signers.addr2 = signers[2];
    this.signers.addr3 = signers[3];

    this.loadFixture = loadFixture;
  });

  describe("Vault deployment", function () {
    this.beforeEach(async function () {
      const { vault, devUSDC, MINIMUM_AMOUNT } = await this.loadFixture(deployVaultFixture);
      this.vault = vault;
      this.devUSDC = devUSDC;
      this.MINIMUM_AMOUNT = MINIMUM_AMOUNT;
    });

    it("Should set the right minimum amount", async function () {
      expect(await this.vault.minimumAmountToStake()).to.equal(this.MINIMUM_AMOUNT);
    });

    it("Should set the right devUSDC contract", async function () {
      expect(await this.vault.dUSDC()).to.equal(this.devUSDC.address);
    });
  });

  describe("Staking tests", function () {
    this.beforeEach(async function () {
      const { vault, MINIMUM_AMOUNT } = await this.loadFixture(deployVaultFixture);
      this.vault = vault;
      this.MINIMUM_AMOUNT = MINIMUM_AMOUNT;
    });

    it("Should allow a user to stake a minimum amount", async function () {
      await this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT });

      const vaultBalance = await ethers.provider.getBalance(this.vault.address);
      expect(vaultBalance).to.equal(this.MINIMUM_AMOUNT);
    });

    it("Should allow multiple users to stake on the same time", async function () {
      await Promise.all([
        this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr2).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr3).stake({ value: this.MINIMUM_AMOUNT }),
      ]);

      const vaultBalance = await ethers.provider.getBalance(this.vault.address);
      expect(vaultBalance).to.equal(this.MINIMUM_AMOUNT.mul(3));
    });

    it("Should return 1 stake for addr1", async function () {
      await this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT });

      expect(await this.vault.connect(this.signers.addr1).getStakesNumber()).to.equal(1);
    });

    it("Should revert with the minimum amount error", async function () {
      const amount = this.MINIMUM_AMOUNT.div(2);
      await expect(
        this.vault.connect(this.signers.addr1).stake({ value: amount })
      ).to.be.revertedWith("Minimum amount to stake is 5 ETH");
    });
  });

  describe("Withdraw tests", function () {
    this.beforeEach(async function () {
      const { vault, devUSDC, MINIMUM_AMOUNT } = await this.loadFixture(deployVaultFixture);
      this.vault = vault;
      this.devUSDC = devUSDC;
      this.MINIMUM_AMOUNT = MINIMUM_AMOUNT;
    });

    it("Should allow a user to withdraw with correct reward", async function () {
      await this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT });

      await time.increase(convertDaysToTimestamp(1));

      await this.vault.connect(this.signers.addr1).withdrawStake(0);
      expect(
        await this.vault
          .connect(this.signers.owner)
          .getTotalStakedOfStaker(this.signers.addr1.address)
      ).to.equal(0);

      const balanceOfAddr1BN = await this.devUSDC.balanceOf(this.signers.addr1.address);
      let balanceOfAddr1 = ethers.utils.formatEther(balanceOfAddr1BN);

      const { reward } = await computeReward(this.MINIMUM_AMOUNT, 1);
      expect(balanceOfAddr1).to.equal(reward);
    });

    it("Should allow multiple users to withdraw with correct reward", async function () {
      await Promise.all([
        this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr2).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr3).stake({ value: this.MINIMUM_AMOUNT }),
      ]);

      await time.increase(convertDaysToTimestamp(1));

      await Promise.all([
        this.vault.connect(this.signers.addr1).withdrawStake(0),
        this.vault.connect(this.signers.addr2).withdrawStake(0),
        this.vault.connect(this.signers.addr3).withdrawStake(0),
      ]);

      expect(
        await this.vault
          .connect(this.signers.owner)
          .getTotalStakedOfStaker(this.signers.addr1.address)
      ).to.equal(0);
      expect(
        await this.vault
          .connect(this.signers.owner)
          .getTotalStakedOfStaker(this.signers.addr2.address)
      ).to.equal(0);
      expect(
        await this.vault
          .connect(this.signers.owner)
          .getTotalStakedOfStaker(this.signers.addr3.address)
      ).to.equal(0);

      const balanceOfAddr1BN = await this.devUSDC.balanceOf(this.signers.addr1.address);
      let balanceOfAddr1 = ethers.utils.formatEther(balanceOfAddr1BN);

      const balanceOfAddr2BN = await this.devUSDC.balanceOf(this.signers.addr2.address);
      let balanceOfAddr2 = ethers.utils.formatEther(balanceOfAddr2BN);

      const balanceOfAddr3BN = await this.devUSDC.balanceOf(this.signers.addr3.address);
      let balanceOfAddr3 = ethers.utils.formatEther(balanceOfAddr3BN);

      const { reward } = await computeReward(this.MINIMUM_AMOUNT, 1);
      expect(balanceOfAddr1).to.equal(reward);
      expect(balanceOfAddr2).to.equal(reward);
      expect(balanceOfAddr3).to.equal(reward);
    });
  });
});
