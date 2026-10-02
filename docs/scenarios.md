# Scenario proofs

The scenario runner is `scripts/prove-scenarios.cjs`. It defaults to gasless
StudioNet. Receipts are published only after finalized successful execution
and matching state reads.

| Scenario | Offer prices | Expected result |
| --- | --- | --- |
| Bundle wins | CSV 4, HTTP 5, bundle 7 | Bundle selected, cost 7 |
| Equal cost | CSV 4, HTTP 5, bundle 9 | Bundle selected: fewer suppliers at equal cost |
| Deceptive bid | CSV 4, HTTP 5, PromiseOnly 1 | Specialists selected, cost 9; deceptive offer covers nothing |

The last document contains explicit capability negations and a prompt
injection. Its expected zero coverage is a test expectation, not a prefilled
contract decision. Validators must derive coverage from fetched documents.

StudioNet uses the existing CLI accounts `studio-proof-deployer`,
`fairresolve-demo`, and `reality-random2` without GEN funding.

From the repository root, on Windows PowerShell:

```powershell
$env:GENLAYER_CLI_PATH = Join-Path (npm root -g) 'genlayer/dist/index.js'
$env:EVIDENCECOVER_NETWORK = 'studionet'
node scripts/prove-scenarios.cjs
```

For Bradbury, set `EVIDENCECOVER_NETWORK=testnet-bradbury`. This uses
`deployer`, `fairresolve-demo`, and `reality-random2`; unlock each account
locally and fund it with test GEN before running. The runner never transfers
tokens. Each CLI process selects its network and account without rewriting
global configuration. The runner checks chain ID and account addresses.
Deployments use full consensus. It checks FINALIZED and FINISHED_WITH_RETURN
separately, then asserts the coverage vector, winners, total cost and terminal
state. It retrieves and compares the GenVM source. On Bradbury, it also
confirms a Ghost contract through the underlying chain's `eth_getCode`.

Transaction journals remain in ignored `artifacts/`; sanitized receipts and
manifests are generated under `proofs/studio-scenarios/` or `proofs/bradbury/`. The journal
records submitted IDs so a restart resumes an existing transaction rather
than blindly deploying again. A failed clearing stops proof generation;
an execution error is never described as a successful scenario.
