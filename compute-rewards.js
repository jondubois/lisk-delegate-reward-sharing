const axios = require('axios').default;

const {
  PENDING_REWARDS_FILE_PATH,
  PREVIOUS_PENDING_REWARDS_FILE_PATH,
  renameFile,
  removeFile,
  readJSONFile,
  writeJSONFile
} = require('./utils');

const path = require('path');
const config = require(path.join(__dirname, 'config.json'));

const axiosClient = axios.create({
  baseURL: config.liskServiceURL,
  timeout: 5000,
  headers: {}
});

async function getAccount(accountAddress) {
  let { data: result } = await axiosClient.get('accounts', {
    params: {
      address: accountAddress
    }
  });
  if (!result.data || !result.data.length) {
    throw new Error(
      `Account with address ${accountAddress} could not be found`
    );
  }
  return result.data[0];
}

async function getLatestTransaction(fromAccountAddress, toAccountAddress) {
  let { data: result } = await axiosClient.get('transactions', {
    params: {
      senderAddress: fromAccountAddress,
      recipientAddress: toAccountAddress,
      limit: 1
    }
  });
  if (!result.data || !result.data.length) {
    throw new Error(
      `Could not get latest transaction from ${fromAccountAddress} to ${toAccountAddress}`
    );
  }
  return result.data[0];
}

async function getVoters(delegateAddress) {
  let voters = {};
  let voteList = [];
  let currentVotePage = [];
  for (let i = 0; i < 1 || currentVotePage.length; i++) {
    let { data: result } = await axiosClient.get('votes_received', {
      params: {
        address: delegateAddress,
        offset: i * PAGE_SIZE,
        limit: PAGE_SIZE
      }
    });
    if (!result.data) {
      throw new Error(
        `Voters for account ${accountAddress} could not be found`
      );
    }
    currentVotePage = result.data.votes || [];
    for (let vote of currentVotePage) {
      if (!voters[vote.address]) {
        voters[vote.address] = {
          address: vote.address,
          amount: 0
        };
      }
      let voter = voters[vote.address];
      voter.amount += parseInt(vote.amount);
    }
  }
  let voterList = Object.values(voters);
  for (let voter of voterList) {
    voteList.push({
      address: voter.address,
      amount: voter.amount
    });
  }
  return voteList;
}

(async () => {
  let pendingRewardsData = await readJSONFile(PENDING_REWARDS_FILE_PATH);

  let delegateAccount = await getAccount(config.delegateAddress);
  let newRewardHeight = delegateAccount.dpos.delegate.lastForgedHeight;
  let newForgedTotal = parseInt(delegateAccount.dpos.delegate.rewards);
  let totalVoteWeight = parseInt(delegateAccount.dpos.delegate.totalVotesReceived);

  let newlyForgedAmount = newForgedTotal - pendingRewardsData.forgedTotal;
  let distributionAmount = Math.floor(newlyForgedAmount * config.sharingRatio);

  let voterList = await getVoters(config.delegateAddress);

  let pendingVoterRewardList = pendingRewardsData.voterRewards.map(voterReward => ({...voterReward}));
  let pendingVoterRewards = {};
  for (let pendingVoterReward of pendingVoterRewardList) {
    pendingVoterRewards[pendingVoterReward.address] = pendingVoterReward;
  }

  let recentThresholdTime = Date.now() - config.recentDuration;

  let updatedVoterRewardList = await Promise.all(
    voterList.map(async (voter) => {
      let recentTxn;
      try {
        recentTxn = await getLatestTransaction(config.delegateAddress, voter.address);
      } catch (error) {
        recentTxn = null;
      }

      let pendingVoterReward = pendingVoterRewards[voter.address] || {};
      let voterReward = {};
      let voterAmount = parseInt(voter.amount);
      let voterWeightRatio = voterAmount / totalVoteWeight;
      let voterNewReward = Math.floor(distributionAmount * voterWeightRatio);

      voterReward.address = voter.address;
      voterReward.voteWeight = voterAmount;
      voterReward.pendingReward = (pendingVoterReward.pendingReward || 0) + voterNewReward;

      if (recentTxn && recentTxn.asset.data === config.payoutMessage && recentTxn.block.timestamp > recentThresholdTime) {
        voterReward.pendingReward -= parseInt(recentTxn.asset.amount);
        console.log(`Voter ${voterReward.address} already received a recent payout transaction - Updated pending reward is ${voterReward.pendingReward}`);
      }

      return voterReward;
    })
  );

  pendingRewardsData.voterRewards = updatedVoterRewardList;
  pendingRewardsData.rewardHeight = newRewardHeight;
  pendingRewardsData.forgedTotal = newForgedTotal;
  pendingRewardsData.distributionAmount = distributionAmount;

  console.log('REWARDS:', pendingRewardsData);

  await removeFile(PREVIOUS_PENDING_REWARDS_FILE_PATH, {force: true});
  await renameFile(PENDING_REWARDS_FILE_PATH, PREVIOUS_PENDING_REWARDS_FILE_PATH);
  await writeJSONFile(PENDING_REWARDS_FILE_PATH, pendingRewardsData);
})();
