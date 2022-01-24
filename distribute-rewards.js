const { apiClient, cryptography } = require('@liskhq/lisk-client');
const {
  PENDING_REWARDS_FILE_PATH,
  readJSONFile,
  writeJSONFile,
  wait
} = require('./utils');

const path = require('path');
const config = require(path.join(__dirname, 'config.json'));

const UNIT_DIVISOR = 100000000;

(async () => {
  let pendingRewardsData = await readJSONFile(PENDING_REWARDS_FILE_PATH);

  console.log('Voter count:', pendingRewardsData.voterRewards.length);

  let client = await apiClient.createWSClient(config.liskCoreRPCURL);
  let delegateHexAddress = cryptography.getAddressFromBase32Address(config.delegateAddress, 'lsk');
  let account = await client.account.get(delegateHexAddress);
  let nonce = account.sequence.nonce;

  async function sendReward(voterReward) {
    try {
      let txn = await client.transaction.create({
        moduleID: 2,
        assetID: 0,
        fee: BigInt(config.transactionFee),
        asset: {
          amount: BigInt(voterReward.pendingReward),
          recipientAddress: cryptography.getAddressFromBase32Address(voterReward.address),
          data: config.payoutMessage
        },
        nonce
      }, config.delegatePassphrases[0]);

      let signedTxn = await client.transaction.sign(txn, config.delegatePassphrases);
      let response = await client.transaction.send(signedTxn);
      if (!response || !response.transactionId) {
        throw new Error('Invalid transaction response format');
      }

      nonce++;
    } catch (error) {
      throw new Error(
        `Failed to send reward to voter ${voterReward.address} because of error - ${error.message}`
      );
    }
  }

  let totalSent = 0;

  try {
    for (let voterReward of pendingRewardsData.voterRewards) {
      if (voterReward.pendingReward >= config.minRewardDistributionAmount) {
        await sendReward(voterReward);
        console.log(
          `Sent ${
            Math.round(voterReward.pendingReward * 100 / UNIT_DIVISOR) / 100
          } to voter ${voterReward.address}`
        );
        totalSent += voterReward.pendingReward;
        voterReward.pendingReward = 0;

        await writeJSONFile(PENDING_REWARDS_FILE_PATH, pendingRewardsData);
        await wait(config.pauseBetweenTransactions);

        console.log(`TOTAL SENT: ${Math.round(totalSent * 100 / UNIT_DIVISOR) / 100}`);
      }
    }
  } catch (error) {
    console.error(`Failed to send rewards - ${error.message}`);
  }

  process.exit();
})();
