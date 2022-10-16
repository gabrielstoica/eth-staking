import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import {
  AggregatorGoerliETHUSDAddress,
  TOTAL_SUPPLY_dUSDC,
  MINIMUM_AMOUNT,
  VAULT_INITIAL_BALANCE,
  cETHGoerliContractAddress,
} from "../../config";
import {
  CEther,
  CEther__factory,
  DevUSDC,
  DevUSDC__factory,
  Vault,
  Vault__factory,
} from "../../typechain-types";

export async function deployVaultFixture(): Promise<{
  vault: Vault;
  devUSDC: DevUSDC;
  compoundETH: CEther;
  MINIMUM_AMOUNT: BigNumber;
  VAULT_INITIAL_BALANCE: BigNumber;
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

  const compoundETH: CEther = <CEther>(
    await ethers.getContractAt("CEther", cETHGoerliContractAddress)
  );

  //transfer all devUSDC to Vault to easily send rewards
  await devUSDC.transfer(vault.address, TOTAL_SUPPLY_dUSDC);

  //send 1 ETH from owner account
  //so we can pay back the small difference between
  //staked amount and redeemed amount
  //caused by the Compound exchangeRate variation
  await owner.sendTransaction({
    to: vault.address,
    value: ethers.utils.parseEther("1"),
  });

  return { vault, devUSDC, compoundETH, MINIMUM_AMOUNT, VAULT_INITIAL_BALANCE };
}
