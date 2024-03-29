import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { AggregatorGoerliETHUSDAddress, aggregatorV3InterfaceABI } from "../config";

export function convertDaysToTimestamp(days: number): number {
  return days * 24 * 60 * 60;
}

export async function computeReward(amount: BigNumber, days: number): Promise<{ reward: string }> {
  const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth_goerli");

  const addr = AggregatorGoerliETHUSDAddress;
  const priceFeedContract = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider);
  const priceData = await priceFeedContract.latestRoundData();

  //price is scaled by 10^18 so we have to normalize it
  const ethUsd = Math.trunc(priceData.answer / 1e8);
  let amountToEth = Number(ethers.utils.formatEther(amount));

  // APY %
  const APY = 10;
  const reward: string = Number((ethUsd * amountToEth * APY) / 365).toPrecision(4);

  return { reward };
}
