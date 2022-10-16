import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {
  AggregatorGoerliETHUSDAddress,
  TOTAL_SUPPLY_dUSDC,
  MINIMUM_AMOUNT,
  cETHGoerliContractAddress,
} from "../../config";
import { DevUSDC, DevUSDC__factory, Vault, Vault__factory } from "../../typechain-types";

export async function deployVaultFixture(): Promise<{
  vault: Vault;
  devUSDC: DevUSDC;
  MINIMUM_AMOUNT: BigNumber;
}> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const devUSDFactory: DevUSDC__factory = <DevUSDC__factory>(
    await ethers.getContractFactory("devUSDC")
  );
  const devUSDC: DevUSDC = <DevUSDC>await devUSDFactory.connect(owner).deploy(TOTAL_SUPPLY_dUSDC);
  await devUSDC.deployed();

  const vaultFactory: Vault__factory = <Vault__factory>await ethers.getContractFactory("Vault");
  const vault: Vault = <Vault>(
    await vaultFactory
      .connect(owner)
      .deploy(devUSDC.address, AggregatorGoerliETHUSDAddress, cETHGoerliContractAddress)
  );
  await vault.deployed();

  //transfer all devUSDC to Vault to easily send rewards
  await devUSDC.transfer(vault.address, TOTAL_SUPPLY_dUSDC);

  return { vault, devUSDC, MINIMUM_AMOUNT };
}
