import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import type { DevUSDC } from "../typechain-types";
import type { Vault } from "../typechain-types";

type Fixture<T> = () => Promise<T>;

declare module "mocha" {
  export interface Context {
    devUSDC: DevUSDC;
    vault: Vault;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}

export interface Signers {
  owner: SignerWithAddress;
  addr1: SignerWithAddress;
  addr2: SignerWithAddress;
  addr3: SignerWithAddress;
}
