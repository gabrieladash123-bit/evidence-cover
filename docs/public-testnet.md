# Bradbury scenario proofs

The public testnet runner is `scripts/prove-bradbury.cjs`. StudioNet receipts
are already published. Public testnet receipts are published only after
successful finalized execution and matching state reads.

| Scenario | Offer prices | Expected result |
| --- | --- | --- |
| Bundle wins | CSV 4, HTTP 5, bundle 7 | Bundle selected, cost 7 |
| Equal cost | CSV 4, HTTP 5, bundle 9 | Bundle selected: fewer suppliers at equal cost |
| Deceptive bid | CSV 4, HTTP 5, PromiseOnly 1 | Specialists selected, cost 9; deceptive offer covers nothing |

The last document contains explicit capability negations and a prompt
injection. Its expected zero coverage is a test expectation, not a prefilled
contract decision. Validators must derive coverage from fetched documents.

The runner uses existing CLI accounts: `deployer`, `fairresolve-demo`, and
`reality-random2`. Unlock them locally with `genlayer account unlock --account
NAME`. Never put a password or private key into the repository or submission.
Accounts must already have enough Bradbury GEN for their own transactions.
The runner does not transfer tokens or obtain faucet funds.

From the repository root, on Windows PowerShell:

```powershell
$env:GENLAYER_CLI_PATH = Join-Path (npm root -g) 'genlayer/dist/index.js'
node scripts/prove-bradbury.cjs
```

Each CLI process selects Bradbury and its account without rewriting global
configuration. The runner checks chain ID 4221, account addresses and balances.
Deployments use full consensus. It checks FINALIZED and FINISHED_WITH_RETURN
separately, then asserts the coverage vector, winners, total cost and terminal
state. It retrieves and compares the GenVM source, and confirms a Ghost
contract exists through the underlying chain's `eth_getCode`.

Transaction journals remain in ignored `artifacts/bradbury-journal/`; sanitized
receipts and manifests are generated under `proofs/bradbury/`. The journal
records submitted IDs so a restart resumes an existing transaction rather
than blindly deploying again. A failed clearing stops proof generation;
an execution error is never described as a successful scenario.
