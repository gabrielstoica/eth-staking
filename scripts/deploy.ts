import { ethers } from "hardhat";
import {
  AggregatorGoerliETHUSDAddress,
  cETHGoerliContractAddress,
  TOTAL_SUPPLY_dUSDC,
} from "../config";
import { DevUSDC, DevUSDC__factory, Vault, Vault__factory } from "../typechain-types";

async function main() {
  const devUSDFactory: DevUSDC__factory = <DevUSDC__factory>(
    await ethers.getContractFactory("devUSDC")
  );
  const devUSDC: DevUSDC = <DevUSDC>await devUSDFactory.deploy(TOTAL_SUPPLY_dUSDC);
  await devUSDC.deployed();

  const vaultFactory: Vault__factory = <Vault__factory>await ethers.getContractFactory("Vault");
  const vault: Vault = <Vault>(
    await vaultFactory.deploy(
      devUSDC.address,
      AggregatorGoerliETHUSDAddress,
      cETHGoerliContractAddress
    )
  );
  await vault.deployed();

  //transfer all devUSDC to Vault to easily send rewards
  await devUSDC.transfer(vault.address, TOTAL_SUPPLY_dUSDC);

  console.log("devUSDC address: ", devUSDC.address);
  console.log("Vault address: ", vault.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
