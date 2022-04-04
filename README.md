# lisk-delegate-reward-sharing
Scripts to share rewards with voters on the Lisk v3 blockchain.

## License

The license is `MIT`.

# Usage

1. Clone or download this repo to your local machine.

2. Navigate to the `lisk-delegate-reward-sharing` directory using the command line.

3. Install dependencies:
```
npm install
```

4. Add your details and missing values to the `config.json` file:
- `liskCoreRPCURL` is the RPC URL of a regular Lisk node to send transactions to.
- `delegateAddress` is your delegate account address.
- `delegatePassphrases` is an array of passphrases associated with your delegate account (used to sign transactions). You can specify one or multiple passphrases separated by commas.

5. Initialize the `pending-rewards.json` file. This will create an initial checkpoint from which future rewards will be calculated. Rewards will be calculated from the time you ran this script:
```
node init-rewards
```

6. From time to time (e.g. daily or weekly), compute pending rewards and update the `pending-rewards.json` file:
```
node compute-rewards
```

7. To distribute rewards (can be executed less frequently than the `compute-rewards` script above):
```
node distribute-rewards
```

8. If some transactions from the `distribute-rewards` script above failed to be processed by the blockchain, you can try to resend them with:
```
node resend-transactions
```
