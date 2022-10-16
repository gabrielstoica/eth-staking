import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { Signers } from "../types";
import { deploydevUSDCFixture } from "./devUSDC.fixture";

describe("devUSDC unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.owner = signers[0];

    this.loadFixture = loadFixture;
  });

  describe("devUSD", function () {
    this.beforeEach(async function () {
      const { devUSDC } = await this.loadFixture(deploydevUSDCFixture);
      this.devUSDC = devUSDC;
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance: BigNumber = await this.devUSDC.balanceOf(this.signers.owner.address);
      expect(await this.devUSDC.totalSupply()).to.equal(ownerBalance);
    });
  });
});
