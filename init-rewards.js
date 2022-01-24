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
  let voteList = [];
  let currentVotePage = [];
  for (let i = 0; i < 1 || currentVotePage.length; i++) {
    let { data: result } = await axiosClient.get('votes_received', {
      params: {
        address: delegateAddress,
        aggregate: true,
        offset: i * config.pageSize,
        limit: config.pageSize
      }
    });
    if (!result.data) {
      throw new Error(
        `Voters for account ${accountAddress} could not be found`
      );
    }
    currentVotePage = result.data.votes || [];
    for (let vote of currentVotePage) {
      voteList.push({
        ...vote,
        amount: parseInt(vote.amount)
      });
    }
  }
  return voteList;
}

(async () => {
  let pendingRewardsData = await readJSONFile(PENDING_REWARDS_FILE_PATH);

  if (pendingRewardsData.rewardHeight !== 0) {
    console.error(`The pending-rewards.json file has already been initialized.`);
    process.exit(1);
  }

  let delegateAccount = await getAccount(config.delegateAddress);
  let newRewardHeight = delegateAccount.dpos.delegate.lastForgedHeight;
  let newForgedTotal = parseInt(delegateAccount.dpos.delegate.rewards);
  let totalVoteWeight = parseInt(delegateAccount.dpos.delegate.totalVotesReceived);

  pendingRewardsData.voterRewards = [];
  pendingRewardsData.rewardHeight = newRewardHeight;
  pendingRewardsData.forgedTotal = newForgedTotal;
  pendingRewardsData.distributionAmount = 0;

  await writeJSONFile(PENDING_REWARDS_FILE_PATH, pendingRewardsData);

  console.log('The pending-rewards.json file was initialized successfully.');
})();
