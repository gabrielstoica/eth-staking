import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { DevUSDC, DevUSDC__factory } from "../../typechain-types";

export async function deploydevUSDCFixture(): Promise<{ devUSDC: DevUSDC }> {
  const signers: SignerWithAddress[] = await ethers.getSigners();
  const owner: SignerWithAddress = signers[0];

  const TOTAL_SUPPLY_dUSDC = ethers.utils.parseEther("100000");

  const devUSDFactory: DevUSDC__factory = <DevUSDC__factory>(
    await ethers.getContractFactory("devUSDC")
  );
  const devUSDC: DevUSDC = await devUSDFactory.connect(owner).deploy(TOTAL_SUPPLY_dUSDC);
  await devUSDC.deployed();

  return { devUSDC };
}
