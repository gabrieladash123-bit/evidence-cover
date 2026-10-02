// Uses existing CLI accounts and their native keychain; never exports keys.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const cli = process.env.GENLAYER_CLI_PATH;
if (!cli || !fs.existsSync(cli)) throw Error('Set GENLAYER_CLI_PATH to the installed GenLayer CLI entry point.');
const hook = path.join(__dirname, 'cli-config.cjs');
const network = process.env.EVIDENCECOVER_NETWORK || 'studionet';
if (!['studionet', 'testnet-bradbury'].includes(network)) throw Error('Unsupported network.');
const isStudio = network === 'studionet';
const rpcUrl = isStudio ? 'https://studio.genlayer.com/api' : 'https://rpc-bradbury.genlayer.com';
const journal = path.join(root, 'artifacts/' + network + '-scenario-journal');
const proofs = path.join(root, 'proofs/' + (isStudio ? 'studio-scenarios' : 'bradbury'));
fs.mkdirSync(journal, { recursive: true });
fs.mkdirSync(proofs, { recursive: true });
const buyer = isStudio ? 'studio-proof-deployer' : 'deployer';
const buyerAddress = isStudio ? '0x7a413bb4ab62e31d62d4cd9efc8c8a8dae37fb42' : '0xb527e6bd582b49782d6d303d63c6af14d4a676f9';
const suppliers = [
  { account: buyer, address: buyerAddress },
  { account: 'fairresolve-demo', address: '0x34346773a22564cbcc5f1d67d1c1f9f196daea35' },
  { account: 'reality-random2', address: '0x5585ea8f2fcc126bad0830eb9701e19b3cd800d5' },
];
const sourceCommit = JSON.parse(fs.readFileSync(path.join(root, 'proofs/main.json'), 'utf8')).source_commit;
const source = fs.readFileSync(path.join(root, 'contracts/evidence_cover.py'));
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
const requirements = [
  { id: 'csv', criterion: 'Documented capability to parse comma-separated text into structured rows while preserving commas inside double-quoted fields.' },
  { id: 'http', criterion: 'Documented capability to retrieve remote HTTP data with bounded retries and request timeouts.' },
];
const scenarios = [
  { name: 'bundle-wins', files: ['csv-tool.md', 'http-tool.md', 'bundle-tool.md'], costs: [4, 5, 7], masks: [1, 2, 3], selected: [2], cost: 7 },
  { name: 'equal-cost', files: ['csv-tool.md', 'http-tool.md', 'bundle-tool.md'], costs: [4, 5, 9], masks: [1, 2, 3], selected: [2], cost: 9 },
  { name: 'deceptive-bid', files: ['csv-tool.md', 'http-tool.md', 'distractor.md'], costs: [4, 5, 1], masks: [1, 2, 0], selected: [0, 1], cost: 9 },
];
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'node_config') continue;
    result[key] = /private.?key|api.?key|password|secret|authorization/i.test(key) ? 'REDACTED' : sanitize(item);
  }
  return result;
}
function save(name, value) {
  fs.writeFileSync(path.join(proofs, name + '.json'), JSON.stringify(sanitize(value), null, 2) + '\n');
}
function result(output) {
  const start = output.indexOf('Result:');
  if (start < 0) throw Error('CLI result missing.');
  return JSON.parse(output.slice(start + 7).trim());
}
async function invoke(label, account, args, overrides = {}) {
  const file = path.join(journal, label + '.json');
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (prior.complete) return prior.stdout;
  if (prior.hash && args[0] === 'write') return 'Write Transaction Hash: ' + prior.hash;
  if (prior.hash && args[0] === 'deploy') overrides.EVIDENCECOVER_RESUME_HASH = prior.hash;
  console.log('RUN', label);
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, ['--require', hook, cli, ...args], {
      cwd: root, windowsHide: true, env: { ...process.env, NO_COLOR: '1', EVIDENCECOVER_ACCOUNT: account, EVIDENCECOVER_NETWORK: network, ...overrides },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '', hash = prior.hash;
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const found = stdout.match(/(?:Deployment|Write) Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
      if (found && found !== hash) {
        hash = found;
        fs.writeFileSync(file, JSON.stringify({ hash, complete: false }));
        console.log('SUBMITTED', label, hash);
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      fs.writeFileSync(file, JSON.stringify({ hash, complete: code === 0, stdout, stderr }));
      if (code !== 0) reject(Error(label + ' failed: ' + stderr.slice(-1800)));
      else resolve(stdout);
    });
  });
}
async function receipt(label, hash) {
  const data = result(await invoke(label + '-receipt', buyer, ['receipt', hash, '--retries', '300', '--interval', '3000']));
  save(label + '-receipt', data);
  const status = data.statusName || data.status_name;
  const execution = data.txExecutionResultName || data.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (status !== 'FINALIZED' || !['FINISHED_WITH_RETURN', 'SUCCESS'].includes(execution)) throw Error(label + ': ' + status + '/' + execution);
  console.log('FINALIZED', label, hash, execution);
  return data;
}
async function write(label, address, account, method, args = []) {
  const output = await invoke(label, account, ['write', address, method, ...(args.length ? ['--args', ...args] : [])]);
  const hash = output.match(/Write Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
  if (!hash) throw Error(label + ': transaction hash missing.');
  return { action: method, hash, receipt: await receipt(label, hash) };
}
async function rpc(method, params) {
  const response = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok || data.error) throw Error(JSON.stringify(data.error || response.status));
  return data.result;
}
(async () => {
  const expectedChain = isStudio ? '0xf22f' : '0x107d';
  if (await rpc('eth_chainId', []) !== expectedChain) throw Error('Unexpected chain ID.');
  for (const supplier of suppliers) {
    const account = await invoke('account-' + supplier.account, supplier.account, ['account', 'show', '--account', supplier.account]);
    if (!account.toLowerCase().includes(supplier.address)) throw Error('Account address mismatch.');
    if (!isStudio && BigInt(await rpc('eth_getBalance', [supplier.address, 'latest'])) === 0n) throw Error('Account needs test GEN: ' + supplier.account);
  }
  for (const scenario of scenarios) {
    const offers = [];
    for (let i = 0; i < scenario.files.length; i++) {
      const name = scenario.files[i];
      const url = 'https://raw.githubusercontent.com/gabrieladash123-bit/evidence-cover/' + sourceCommit + '/fixtures/' + name;
      const response = await fetch(url);
      if (!response.ok) throw Error('Evidence unavailable: ' + name);
      const body = Buffer.from(await response.arrayBuffer());
      if (!body.equals(fs.readFileSync(path.join(root, 'fixtures', name)))) throw Error('Evidence differs from committed fixture.');
      offers.push({ supplier: suppliers[i].address, url, sha256: crypto.createHash('sha256').update(body).digest('hex'), cost: scenario.costs[i] });
    }
    const deployment = result(await invoke(scenario.name + '-deploy', buyer, ['deploy'], {
      EVIDENCECOVER_REQUIREMENTS_JSON: JSON.stringify(requirements), EVIDENCECOVER_SUPPLIERS_JSON: JSON.stringify(suppliers.map(s => s.address)), EVIDENCECOVER_BUDGET: '10',
    }));
    const hash = deployment['Transaction Hash'], address = deployment['Contract Address'];
    const transactions = [{ action: 'deploy', hash, receipt: await receipt(scenario.name + '-deploy', hash) }];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      transactions.push(await write(scenario.name + '-offer-' + i, address, suppliers[i].account, 'submit_offer', [offer.url, offer.sha256, String(offer.cost)]));
    }
    transactions.push(await write(scenario.name + '-seal', address, buyer, 'seal'));
    transactions.push(await write(scenario.name + '-clear', address, buyer, 'clear'));
    const allocation = result(await invoke(scenario.name + '-allocation', buyer, ['call', address, 'get_allocation']));
    const assessment = result(await invoke(scenario.name + '-assessment', buyer, ['call', address, 'get_assessment']));
    const board = result(await invoke(scenario.name + '-board', buyer, ['call', address, 'get_auction']));
    if (allocation.status !== 'CLEARED' || board.phase !== 'CLEARED' || allocation.cost !== scenario.cost || JSON.stringify(allocation.selected) !== JSON.stringify(scenario.selected) || JSON.stringify(assessment.offers.map(o => o.mask)) !== JSON.stringify(scenario.masks)) throw Error('Unexpected scenario outcome: ' + scenario.name);
    const output = await invoke(scenario.name + '-source', buyer, ['code', address]);
    const sourceStart = output.indexOf('# { "Depends":');
    if (sourceStart < 0 || output.slice(sourceStart, sourceStart + source.length) !== source.toString()) throw Error('Deployed source mismatch.');
    const chainProof = {};
    if (!isStudio) {
      const ghostCode = await rpc('eth_getCode', [address, 'latest']);
      if (!ghostCode || ghostCode === '0x') throw Error('Ghost contract missing on underlying chain.');
      chainProof.ghost_code_sha256 = crypto.createHash('sha256').update(Buffer.from(ghostCode.slice(2), 'hex')).digest('hex');
    }
    save(scenario.name, { network, chain_id: isStudio ? 61999 : 4221, contract_address: address, source_commit: sourceCommit, source_sha256: sourceHash, exact_source_match: true, ...chainProof, transactions: transactions.map(({ action, hash }) => ({ action, hash })), offers, allocation, assessment, board });
    console.log('VERIFIED', scenario.name, address);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
