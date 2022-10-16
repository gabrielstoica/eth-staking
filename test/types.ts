import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

import type { CEther, DevUSDC } from "../typechain-types";
import type { Vault } from "../typechain-types";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    devUSDC: DevUSDC;
    vault: Vault;
    compoundETH: CEther;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
    MINIMUM_AMOUNT: BigNumber;
    VAULT_INITIAL_BALANCE: BigNumber;
  }
}

export interface Signers {
  owner: SignerWithAddress;
  addr1: SignerWithAddress;
  addr2: SignerWithAddress;
  addr3: SignerWithAddress;
}
