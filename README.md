# ETH staking vault

Simple ETH staking smart contracts for an ETH staking app. Users can stake their ETH in a Vault with a constant APR 10%.  
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
npx hardhat compile
```

### Test

Run tests with hardhat

```bash
npx hardhat test
```

### Deploy

In order to deploy both smart contracts, you have to run the deploy script and specify the deployment chain.
Example:

```bash
npx hardhat run .\scripts\deploy.ts --network goerli
```

### Verify

In order to verify the devUSDC smart contract, you need to provide it's address togheter with total supply set at the deployment time (TOTAL_SUPPLY_dUSDC variable stored in the /config).
Example:

```bash
npx hardhat verify --network goerli devUSDC_address TOTAL_SUPPLY_dUSDC
```

In order to verify the Vault smart contract, you need to provide it's address togheter with all the constructor params.
Example:

```bash
npx hardhat verify --network goerli vault_address devUSDCAddress AggregatorGoerliETHUSDAddress cETHGoerliContractAddress
```
