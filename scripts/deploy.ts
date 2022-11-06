import { ethers, run } from "hardhat";
import {
  AggregatorGoerliETHUSDAddress,
  AUTOMATIC_VERIFICATION,
  cETHGoerliContractAddress,
  TOTAL_SUPPLY_dUSDC,
} from "../config";
import { DevUSDC, DevUSDC__factory, Vault, Vault__factory } from "../typechain-types";
import { sleep } from "../utils/misc.util";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerBalance = await deployer.getBalance();

  console.log("Deploying from address: ", deployer.address);
  console.log("Account Balance:", ethers.utils.formatEther(deployerBalance));

  console.log("Waiting for devUSDC contract to be deployed...");
  const devUSDFactory: DevUSDC__factory = <DevUSDC__factory>(
    await ethers.getContractFactory("devUSDC")
  );
  const devUSDC: DevUSDC = <DevUSDC>await devUSDFactory.deploy(TOTAL_SUPPLY_dUSDC);
  await devUSDC.deployed();
  console.log("devUSDC address: ", devUSDC.address);

  console.log("Waiting for Vault contract to be deployed...");
  const vaultFactory: Vault__factory = <Vault__factory>await ethers.getContractFactory("Vault");
  const vault: Vault = <Vault>(
    await vaultFactory.deploy(
      devUSDC.address,
      AggregatorGoerliETHUSDAddress,
      cETHGoerliContractAddress
    )
  );
  await vault.deployed();
  console.log("Vault address: ", vault.address);

  //transfer all devUSDC to Vault to easily send rewards
  await devUSDC.transfer(vault.address, TOTAL_SUPPLY_dUSDC);

  console.log("Automatic verification: ", AUTOMATIC_VERIFICATION);
  if (AUTOMATIC_VERIFICATION) {
    console.log("Verification process starting in 10 seconds...");
    await sleep(10000);
    console.log("Verification process started");

    console.log("Verifying devUSDC smart contract...");
    await run("verify:verify", {
      address: devUSDC.address,
      constructorArguments: [TOTAL_SUPPLY_dUSDC],
    });

    console.log("Verifying Vault smart contract...");
    await run("verify:verify", {
      address: vault.address,
      constructorArguments: [
        devUSDC.address,
        AggregatorGoerliETHUSDAddress,
        cETHGoerliContractAddress,
      ],
    });

    console.log("Verification process ended");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
