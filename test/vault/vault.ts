import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, ContractReceipt, ContractTransaction } from "ethers";
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
      const { vault, compoundETH, MINIMUM_AMOUNT, VAULT_INITIAL_BALANCE } = await this.loadFixture(
        deployVaultFixture
      );
      this.vault = vault;
      this.compoundETH = compoundETH;
      this.MINIMUM_AMOUNT = MINIMUM_AMOUNT;
      this.VAULT_INITIAL_BALANCE = VAULT_INITIAL_BALANCE;
    });

    it("Should allow a user to stake the minimum amount", async function () {
      await this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT });

      const vaultBalance: BigNumber = <BigNumber>(
        await ethers.provider.getBalance(this.vault.address)
      );
      expect(vaultBalance).to.equal(this.VAULT_INITIAL_BALANCE);

      const cUnderlyingBalanceBN: BigNumber = <BigNumber>(
        await this.compoundETH
          .connect(this.signers.addr1)
          .callStatic.balanceOfUnderlying(this.vault.address)
      );

      const cEthBalanceBN: BigNumber = <BigNumber>(
        await this.compoundETH.connect(this.signers.addr1).callStatic.balanceOf(this.vault.address)
      );

      let exchangeRateCurrentBN: BigNumber = <BigNumber>(
        await this.compoundETH.connect(this.signers.addr1).callStatic.exchangeRateCurrent()
      );

      const exchangeRateCurrent: number = Number(ethers.utils.formatEther(exchangeRateCurrentBN));
      const cUnderlyingBalance: number = Number(ethers.utils.formatEther(cUnderlyingBalanceBN));
      const cEthBalance: number = Number(ethers.utils.formatEther(cEthBalanceBN));

      //multiply current rate with cETH balance to get ETH balance (underlying asset)
      const expectedUnderlyingBalance: number = exchangeRateCurrent * cEthBalance;

      //at least last 15 decimals will be correct
      expect(cUnderlyingBalance.toPrecision(15)).to.equal(
        expectedUnderlyingBalance.toPrecision(15)
      );
    });

    it("Should allow multiple users to stake on the same time", async function () {
      await Promise.all([
        this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr2).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr3).stake({ value: this.MINIMUM_AMOUNT }),
      ]);

      const vaultBalance: BigNumber = <BigNumber>(
        await ethers.provider.getBalance(this.vault.address)
      );
      expect(vaultBalance).to.equal(this.VAULT_INITIAL_BALANCE);
    });

    it("Should return 1 stake for addr1", async function () {
      await this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT });

      expect(await this.vault.connect(this.signers.addr1).getStakesNumber()).to.equal(1);
    });

    it("Should revert with the minimum amount error", async function () {
      const amount: BigNumber = <BigNumber>this.MINIMUM_AMOUNT.div(2);
      await expect(
        this.vault.connect(this.signers.addr1).stake({ value: amount })
      ).to.be.revertedWith("Minimum amount to stake is 5 ETH");
    });
  });

  describe("Unstaking tests", function () {
    this.beforeEach(async function () {
      const { vault, devUSDC, MINIMUM_AMOUNT } = await this.loadFixture(deployVaultFixture);
      this.vault = vault;
      this.devUSDC = devUSDC;
      this.MINIMUM_AMOUNT = MINIMUM_AMOUNT;

      await Promise.all([
        this.vault.connect(this.signers.addr1).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr2).stake({ value: this.MINIMUM_AMOUNT }),
        this.vault.connect(this.signers.addr3).stake({ value: this.MINIMUM_AMOUNT }),
      ]);

      await time.increase(convertDaysToTimestamp(1));
    });

    describe("Single unstaking at the same time", function () {
      this.beforeEach(async function () {
        await this.vault.connect(this.signers.addr1).withdrawStake(0);
      });

      it("Should delete the stake from the stakes map", async function () {
        expect(
          await this.vault
            .connect(this.signers.owner)
            .getTotalStakedOfStaker(this.signers.addr1.address)
        ).to.equal(0);
      });

      it("Should compute the correct reward and send to user", async function () {
        const balanceOfAddr1BNdevUSDC: BigNumber = <BigNumber>(
          await this.devUSDC.balanceOf(this.signers.addr1.address)
        );
        const balanceOfAddr1devUSDC: string = ethers.utils.formatEther(balanceOfAddr1BNdevUSDC);

        const { reward } = await computeReward(this.MINIMUM_AMOUNT, 1);
        expect(balanceOfAddr1devUSDC).to.equal(reward);
      });

      it("Should return the correct ETH amount to user", async function () {
        const balanceOfAddr2BNETH_before: BigNumber = <BigNumber>(
          await ethers.provider.getBalance(this.signers.addr2.address)
        );
        const tx: ContractTransaction = <ContractTransaction>(
          await this.vault.connect(this.signers.addr2).withdrawStake(0)
        );
        const receipt: ContractReceipt = <ContractReceipt>await tx.wait();

        const gasFeePaid: BigNumber = <BigNumber>receipt.gasUsed.mul(receipt.effectiveGasPrice);
        const balanceOfAddr2BNETH_after: BigNumber = <BigNumber>(
          await ethers.provider.getBalance(this.signers.addr2.address)
        );

        expect(balanceOfAddr2BNETH_after.sub(balanceOfAddr2BNETH_before).add(gasFeePaid)).to.equal(
          this.MINIMUM_AMOUNT
        );
      });
    });

    describe("Multiple unstakings at the same time", function () {
      let tx1: ContractTransaction, tx2: ContractTransaction, tx3: ContractTransaction;
      let balanceOfAddr1BNETH_before: BigNumber,
        balanceOfAddr2BNETH_before: BigNumber,
        balanceOfAddr3BNETH_before: BigNumber;

      this.beforeEach(async function () {
        [balanceOfAddr1BNETH_before, balanceOfAddr2BNETH_before, balanceOfAddr3BNETH_before] =
          await Promise.all([
            ethers.provider.getBalance(this.signers.addr1.address),
            ethers.provider.getBalance(this.signers.addr2.address),
            ethers.provider.getBalance(this.signers.addr3.address),
          ]);

        [tx1, tx2, tx3] = await Promise.all([
          this.vault.connect(this.signers.addr1).withdrawStake(0),
          this.vault.connect(this.signers.addr2).withdrawStake(0),
          this.vault.connect(this.signers.addr3).withdrawStake(0),
        ]);
      });

      it("Should delete the stakes from the stakes map", async function () {
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
      });

      it("Should allow multiple users to unstake with correct reward", async function () {
        const balanceOfAddr1BN: BigNumber = <BigNumber>(
          await this.devUSDC.balanceOf(this.signers.addr1.address)
        );
        let balanceOfAddr1 = ethers.utils.formatEther(balanceOfAddr1BN);

        const balanceOfAddr2BN: BigNumber = <BigNumber>(
          await this.devUSDC.balanceOf(this.signers.addr2.address)
        );
        let balanceOfAddr2 = ethers.utils.formatEther(balanceOfAddr2BN);

        const balanceOfAddr3BN: BigNumber = <BigNumber>(
          await this.devUSDC.balanceOf(this.signers.addr3.address)
        );
        let balanceOfAddr3: string = <string>ethers.utils.formatEther(balanceOfAddr3BN);

        const { reward } = await computeReward(this.MINIMUM_AMOUNT, 1);
        expect(balanceOfAddr1).to.equal(reward);
        expect(balanceOfAddr2).to.equal(reward);
        expect(balanceOfAddr3).to.equal(reward);
      });

      it("Should return the correct ETH amount to users", async function () {
        const [receipt1, receipt2, receipt3] = await Promise.all([
          tx1.wait(),
          tx2.wait(),
          tx3.wait(),
        ]);

        const gasFeePaid1: BigNumber = <BigNumber>receipt1.gasUsed.mul(receipt1.effectiveGasPrice);
        const gasFeePaid2: BigNumber = <BigNumber>receipt2.gasUsed.mul(receipt2.effectiveGasPrice);
        const gasFeePaid3: BigNumber = <BigNumber>receipt3.gasUsed.mul(receipt3.effectiveGasPrice);

        let balanceOfAddr1BNETH_after: BigNumber,
          balanceOfAddr2BNETH_after: BigNumber,
          balanceOfAddr3BNETH_after: BigNumber;

        [balanceOfAddr1BNETH_after, balanceOfAddr2BNETH_after, balanceOfAddr3BNETH_after] =
          await Promise.all([
            ethers.provider.getBalance(this.signers.addr1.address),
            ethers.provider.getBalance(this.signers.addr2.address),
            ethers.provider.getBalance(this.signers.addr3.address),
          ]);

        expect(balanceOfAddr1BNETH_after.sub(balanceOfAddr1BNETH_before).add(gasFeePaid1)).to.equal(
          this.MINIMUM_AMOUNT
        );
        expect(balanceOfAddr2BNETH_after.sub(balanceOfAddr2BNETH_before).add(gasFeePaid2)).to.equal(
          this.MINIMUM_AMOUNT
        );
        expect(balanceOfAddr3BNETH_after.sub(balanceOfAddr3BNETH_before).add(gasFeePaid3)).to.equal(
          this.MINIMUM_AMOUNT
        );
      });
    });
  });
});
