// Select an existing account only within this CLI process; never change global config.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const util = require('node:util');
const originalInspect = util.inspect;
util.inspect = function(value, options, ...args) {
  if (options?.depth === null && options?.colors === false) {
    return JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
  }
  return originalInspect.call(this, value, options, ...args);
};
require('node:module').syncBuiltinESMExports();
// Emit objects as JSON so proof collection does not depend on util.inspect formatting.
const originalLog = console.log;
console.log = (...values) => originalLog(...values.map(value =>
  value !== null && typeof value === 'object'
    ? JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item)
    : value
));
const configPath = path.join(os.homedir(), '.genlayer', 'genlayer-config.json');
const original = fs.readFileSync;
fs.readFileSync = function(file, ...args) {
  const content = original.call(this, file, ...args);
  if (process.env.EVIDENCECOVER_ACCOUNT && typeof file === 'string' && path.resolve(file) === configPath) {
    const config = JSON.parse(String(content));
    config.activeAccount = process.env.EVIDENCECOVER_ACCOUNT;
    config.network = process.env.EVIDENCECOVER_NETWORK || 'studionet';
    const text = JSON.stringify(config);
    return typeof content === 'string' ? text : Buffer.from(text);
  }
  return content;
};
