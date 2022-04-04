const { apiClient } = require('@liskhq/lisk-client');
const {
  TRANSACTION_LOG_FILE_PATH,
  UNIT_DIVISOR,
  readJSONFile,
  wait
} = require('./utils');

const path = require('path');
const config = require(path.join(__dirname, 'config.json'));

function formatTransaction(sanitizedTransaction) {
  return {
    moduleID: sanitizedTransaction.moduleID,
    assetID: sanitizedTransaction.assetID,
    fee: BigInt(sanitizedTransaction.fee),
    asset: {
      amount: BigInt(sanitizedTransaction.asset.amount),
      recipientAddress: Buffer.from(sanitizedTransaction.asset.recipientAddress, 'base64'),
      data: sanitizedTransaction.asset.data
    },
    nonce: BigInt(sanitizedTransaction.nonce),
    senderPublicKey: Buffer.from(sanitizedTransaction.senderPublicKey, 'base64'),
    signatures: sanitizedTransaction.signatures.map(signature => Buffer.from(signature, 'base64')),
    id: Buffer.from(sanitizedTransaction.id, 'base64')
  };
}

(async () => {
  let transactions = await readJSONFile(TRANSACTION_LOG_FILE_PATH);

  console.log('Transaction count:', transactions.length);

  let client = await apiClient.createWSClient(config.liskCoreRPCURL);

  try {
    for (let txn of transactions) {
      let signedTxn = formatTransaction(txn);
      let response = await client.transaction.send(signedTxn);
      if (!response || !response.transactionId) {
        throw new Error('Invalid transaction response format');
      }
      console.log(
        `Sent transaction ${
          txn.id
        } with amount ${
          Math.round(txn.asset.amount * 100 / UNIT_DIVISOR) / 100
        }`
      );

      await wait(config.pauseBetweenTransactions);
    }
  } catch (error) {
    console.error(`Failed to send transactions - ${error.message}`);
    process.exit(1);
  }

  console.log('Done.');
  process.exit();
})();
