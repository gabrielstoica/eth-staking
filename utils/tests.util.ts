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
  const ethUsd = Math.trunc(priceData.answer / 1e8);

  let amountToEth = Number(ethers.utils.formatEther(amount));
  //10% APR => 0.001141% (10 / (365 * 24))
  const rewardPerHour = 0.00001141;
  const rewardPerDays = rewardPerHour * days * 24;
  const reward: string = (ethUsd * amountToEth * rewardPerDays).toFixed(6);

  return { reward };
}
