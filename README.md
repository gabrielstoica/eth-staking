# ETH staking vault

Simple ETH staking smart contract for an ETH staking app. Users can stake their ETH in a Vault with a constant APR 10% rewarded in devUSDC, a ERC20 stablecoin pegged to the U.S. dollar.  
All the staked ETH will be put as collateral in [Compound v2 Protocol](https://docs.compound.finance/v2/).
When a user wants to withdraw their stake, the Vault will redeem the underlying asset (ETH) from Compound and will give back to the user togheter with the devUSDC rewards.  
The yields are kept by the Vault as profit.
Each user can stake multiple times, each stake being recorded as an independent one.

## Usage

### Pre requisites

Before being able to run any command, you need to create a `.env` file based on the `.env.example` existing file in the project. This file must contain a [Infura API Key](https://docs.infura.io/infura/networks/ethereum/how-to/secure-a-project/project-id), a BIP-39 compatible mnemonic and a [Etherscan API Key](https://etherscan.io/apis).

Then, proceed with installing dependencies:

```bash
yarn install
```

### Compile

Compile smart contracts with hardhat

```bash
yarn hardhat compile
```

### Test

Run tests with hardhat

```bash
yarn hardhat test
```

### Deploy

In order to deploy both smart contracts, you have to run the deploy script and specify the deployment chain.
Example:

```bash
yarn hardhat run .\scripts\deploy.ts --network goerli
```

### Verify

The deployment script can automatically verify both Vault and devUSDC smart contract. By default, this feature is disabled. To enable it, set the `AUTOMATIC_VERIFICATION` to true in the `config/index.ts` file.

In order to manually verify the devUSDC smart contract, you need to provide it's address togheter with the total supply set at the deployment time (TOTAL_SUPPLY_dUSDC variable stored in the /config).
Example:

```bash
yarn hardhat verify --network goerli devUSDC_address TOTAL_SUPPLY_dUSDC
```

In order to manually verify the Vault smart contract, you need to provide it's address togheter with all the constructor parameters.
Example:

```bash
yarn hardhat verify --network goerli vault_address devUSDCAddress AggregatorGoerliETHUSDAddress cETHGoerliContractAddress
```
