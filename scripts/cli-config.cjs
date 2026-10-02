// Select an existing account only within this CLI process; never change global config.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const configPath = path.join(os.homedir(), '.genlayer', 'genlayer-config.json');
const original = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  const content = original.call(this, file, ...args);
  if (process.env.EVIDENCECOVER_ACCOUNT && typeof file === 'string' && path.resolve(file) === configPath) {
    const config = JSON.parse(String(content));
    config.activeAccount = process.env.EVIDENCECOVER_ACCOUNT;
    config.network = 'studionet';
    const text = JSON.stringify(config);
    return typeof content === 'string' ? text : Buffer.from(text);
  }
  return content;
};
