const fs = require('node:fs');
const path = require('node:path');

// Pass JSON strings directly to the SDK; CLI --args converts arrays to lists.
module.exports = async function deployAuction(client) {
  const requirements = process.env.EVIDENCECOVER_REQUIREMENTS_JSON;
  const suppliers = process.env.EVIDENCECOVER_SUPPLIERS_JSON;
  const budget = Number(process.env.EVIDENCECOVER_BUDGET);
  if (!Array.isArray(JSON.parse(requirements)) || !Array.isArray(JSON.parse(suppliers)) || !Number.isSafeInteger(budget) || budget < 1 || budget > 10**12) {
    throw new Error('Set requirements JSON, suppliers JSON, and an integer budget in 1..10^12.');
  }
  const code = fs.readFileSync(path.join(__dirname, '../contracts/evidence_cover.py'), 'utf8');
  const hash = process.env.EVIDENCECOVER_RESUME_HASH || await client.deployContract({ code, args: [requirements, suppliers, budget], leaderOnly: false });
  console.log('Deployment Transaction Hash:', hash);
  const receipt = await client.waitForTransactionReceipt({ hash, retries: 300, interval: 3000, status: 'FINALIZED' });
  const execution = receipt.consensus_data?.leader_receipt?.[0]?.execution_result ?? receipt.txExecutionResultName;
  if ((receipt.status_name || receipt.statusName || receipt.status) !== 'FINALIZED' || !['SUCCESS', 'FINISHED_WITH_RETURN'].includes(execution)) {
    throw new Error('Deployment execution failed: ' + execution);
  }
  const address = receipt.data?.contract_address ?? receipt.txDataDecoded?.contractAddress;
  if (!/^0x[0-9a-f]{40}$/i.test(address || '')) throw new Error('Deployment address missing.');
  console.log('Result:', { 'Transaction Hash': hash, 'Contract Address': address });
};
