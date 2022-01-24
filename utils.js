const fs = require('fs');
const util = require('util');
const path = require('path');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const renameFile = util.promisify(fs.rename);
const removeFile = util.promisify(fs.rm);

const PENDING_REWARDS_FILE_PATH = path.resolve(__dirname, 'pending-rewards.json');
const PREVIOUS_PENDING_REWARDS_FILE_PATH = path.resolve(__dirname, 'previous-pending-rewards.json');
// const LISK_SERVICE_URL = 'http://localhost:9901/api/v2/'
// const LISK_SERVICE_URL = 'https://service.lisk.com/api/v2/'

async function readJSONFile(filePath) {
  return JSON.parse(await readFile(filePath));
}

async function writeJSONFile(filePath, object) {
  return writeFile(filePath, JSON.stringify(object, ' ', 2), {encoding: 'utf8'});
}

async function wait(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

module.exports = {
  PENDING_REWARDS_FILE_PATH,
  PREVIOUS_PENDING_REWARDS_FILE_PATH,
  readFile,
  writeFile,
  renameFile,
  removeFile,
  readJSONFile,
  writeJSONFile,
  wait
};
