// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

import "./devUSDC.sol";
import "./lib/cETH.sol";

contract Vault is ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    devUSDC public immutable dUSDC;
    CEther public compoundETH;
    AggregatorV3Interface internal priceFeed;

    uint256 totalAmountStaked;
    uint256 public minimumAmountToStake;
    bool paused;

    struct Stake {
        address user;
        uint256 amount;
        uint256 since;
        uint256 cETH;
    }

    struct Stakeholder {
        address user;
        Stake[] address_stakes;
    }

    event Staked(
        address indexed user,
        uint256 amount,
        uint256 index,
        uint256 timestamp
    );

    mapping(address => uint256) internal stakes;
    mapping(address => uint256) internal lastStakeId;
    Stakeholder[] internal stakeholders;

    modifier canStake() {
        require(!paused, "Staking is currently paused!");
        require(
            msg.value >= minimumAmountToStake,
            "Minimum amount to stake is 5 ETH"
        );
        _;
    }

    constructor(
        address devUSDCAddress,
        address aggregatorAddress,
        address cETHAddress
    ) {
        dUSDC = devUSDC(devUSDCAddress);
        compoundETH = CEther(cETHAddress);
        priceFeed = AggregatorV3Interface(aggregatorAddress);

        minimumAmountToStake = 5 ether;
        paused = false;
        stakeholders.push();
    }

    function addStakeholder(address staker) internal returns (uint256) {
        stakeholders.push();
        uint256 userIndex = stakeholders.length - 1;
        stakeholders[userIndex].user = staker;
        stakes[staker] = userIndex;
        return userIndex;
    }

    function stake() external payable canStake nonReentrant {
        uint256 amount = msg.value;
        uint256 index = stakes[msg.sender];
        uint256 timestamp = block.timestamp;

        uint256 cETHBalanceBefore = compoundETH.balanceOf(msg.sender);

        //add to Compound v2
        (bool success, ) = address(compoundETH).call{value: amount}(
            abi.encodeWithSignature("mint()")
        );
        require(success, "Stake failed.");

        uint256 cETHBalanceAfter = compoundETH.balanceOf(msg.sender);

        if (index == 0) {
            index = addStakeholder(msg.sender);
        }

        Stake memory new_stake = Stake(
            msg.sender,
            amount,
            timestamp,
            cETHBalanceAfter - cETHBalanceBefore
        );
        stakeholders[index].address_stakes.push(new_stake);
        lastStakeId[msg.sender]++;

        totalAmountStaked = totalAmountStaked + amount;
        emit Staked(msg.sender, amount, index, timestamp);
    }

    function computeStakeReward(Stake memory currentStake)
        internal
        view
        returns (uint256)
    {
        //APR 10% => rewardPerHour = 0.001141% ( 10 / (365 * 24))
        uint256 sinceIsStaking = currentStake.since;
        uint256 currentTimestamp = block.timestamp;
        uint256 ethUsd = getLatestPrice();

        uint256 reward = currentTimestamp.sub(sinceIsStaking);
        reward = reward.div(1 hours);
        reward = reward.mul(currentStake.amount);
        reward = reward.mul(ethUsd);
        reward = reward.mul(1141);
        reward = reward.div(10**8);
        return reward;
    }

    function harvestReward(uint256 stakeIndex) public nonReentrant {
        uint256 user_index = stakes[msg.sender];
        Stake memory currentStake = stakeholders[user_index].address_stakes[
            stakeIndex
        ];
        uint256 currentTimestamp = block.timestamp;
        uint256 sinceIsStaking = currentStake.since;
        uint256 reward = computeStakeReward(currentStake);

        require(
            currentTimestamp - sinceIsStaking >= 1 weeks,
            "Minimum period until you can harvest your reward is 7 days"
        );

        stakeholders[user_index].address_stakes[stakeIndex].since = block
            .timestamp;

        dUSDC.transfer(msg.sender, reward);
    }

    function withdrawStake(uint256 stakeIndex) public nonReentrant {
        uint256 user_index = stakes[msg.sender];
        //require user_index >= 1 at least 1 stake

        Stake memory currentStake = stakeholders[user_index].address_stakes[
            stakeIndex
        ];
        uint256 currentStakeAmount = currentStake.amount;

        //redeem staked ETH from Compound v2
        compoundETH.redeemUnderlying(currentStakeAmount);

        // reward computed in usd -> dUSDC
        uint256 reward = computeStakeReward(currentStake);

        (bool success, ) = msg.sender.call{value: currentStakeAmount}("");
        require(success, "Withdraw failed.");

        dUSDC.transfer(msg.sender, reward);

        totalAmountStaked = totalAmountStaked - currentStakeAmount;
        currentStake.amount = 0;
        delete stakeholders[user_index].address_stakes[stakeIndex];
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        dUSDC.transfer(msg.sender, amount);
    }

    function getLatestPrice() public view returns (uint256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();

        //  divide by 10 ** 8 because price is scaled up
        uint256 _price = uint256(price).div(1e8);
        return _price;
    }

    function computeRewardPerStake(uint256 stakeIndex)
        public
        view
        returns (uint256)
    {
        require(
            stakeIndex >= 0 && stakeIndex <= lastStakeId[msg.sender],
            "Wrong stake ID!"
        );

        uint256 user_index = stakes[msg.sender];
        Stake memory currentStake = stakeholders[user_index].address_stakes[
            stakeIndex
        ];

        uint256 reward = computeStakeReward(currentStake);
        return reward;
    }

    function getTotalRewardOfStaker(address staker)
        public
        view
        onlyOwner
        returns (uint256)
    {
        require(
            staker != address(0),
            "Staker address must not be equal to zero-address!"
        );

        uint256 totalReward;
        uint256 user_index = stakes[staker];
        Stake[] memory currentStakes = stakeholders[user_index].address_stakes;
        for (uint256 i = 0; i < currentStakes.length; i++) {
            totalReward = totalReward + computeStakeReward(currentStakes[i]);
        }
        return totalReward;
    }

    function getTotalReward() public view onlyOwner returns (uint256) {
        uint256 totalReward;
        for (uint256 i = 0; i < stakeholders.length; i++) {
            for (
                uint256 j = 0;
                j < stakeholders[i].address_stakes.length;
                j++
            ) {
                totalReward =
                    totalReward +
                    computeStakeReward(stakeholders[i].address_stakes[j]);
            }
        }
        return totalReward;
    }

    function getTotalStakedOfStaker(address staker)
        external
        view
        onlyOwner
        returns (uint256)
    {
        uint256 totalStaked;
        uint256 user_index = stakes[staker];

        Stake[] memory currentStakes = stakeholders[user_index].address_stakes;
        for (uint256 i = 0; i < currentStakes.length; i++) {
            totalStaked = totalStaked + currentStakes[i].amount;
        }

        return totalStaked;
    }

    function computeTotalReward() external view returns (uint256) {
        uint256 user_index = stakes[msg.sender];
        uint256 totalReward;

        Stake[] memory userStakes = stakeholders[user_index].address_stakes;
        for (uint256 i = 0; i < userStakes.length; i++) {
            totalReward = totalReward + computeStakeReward(userStakes[i]);
        }

        return totalReward;
    }

    function forceStop() external onlyOwner {
        uint256 stakeReward;
        uint256 stakeAmount;
        address staker;

        for (uint256 i = 1; i < stakeholders.length; i++) {
            stakeReward = 0;
            stakeAmount = 0;
            staker = stakeholders[i].user;
            for (
                uint256 j = 0;
                j < stakeholders[i].address_stakes.length;
                j++
            ) {
                stakeAmount =
                    stakeAmount +
                    stakeholders[i].address_stakes[j].amount;
                stakeReward =
                    stakeReward +
                    computeStakeReward(stakeholders[i].address_stakes[j]);
                stakeholders[i].address_stakes[j].amount = 0;
                delete stakeholders[i].address_stakes[j];
            }
            dUSDC.transfer(staker, stakeAmount + stakeReward);
        }

        paused = true;
    }

    function getStakesNumber() external view returns (uint256) {
        uint256 user_index = stakes[msg.sender];
        return stakeholders[user_index].address_stakes.length;
    }

    function getAllStakes() external view returns (Stake[] memory) {
        uint256 user_index = stakes[msg.sender];
        return stakeholders[user_index].address_stakes;
    }

    function getTotalStaked() public view onlyOwner returns (uint256) {
        return totalAmountStaked;
    }

    function setPaused(bool _state) external onlyOwner {
        paused = _state;
    }
}
