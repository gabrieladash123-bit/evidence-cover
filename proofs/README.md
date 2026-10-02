# Verified StudioNet execution

Main contract: `0x8d0ae7332edFd1E51d03f02563944429881Bbc5f`.

| Scenario | Contract | Verified outcome |
| --- | --- | --- |
| [Main](main.json) | `0x8d0ae7332edFd1E51d03f02563944429881Bbc5f` | CLEARED, cost 9, winners 0 and 1 |
| [Budget 8](over-budget.json) | `0xe153Dd331BBAF4f899b97F44Ff9a727dF2d819B4` | OVER_BUDGET, minimum 9, no winners |
| [XML only](uncoverable-minimal.json) | `0x4B3C7a82Dde6145b18c19e9bdd162A67345e626E` | UNCOVERABLE, coverage 0, no winners |

[main.json](main.json) records the immutable inputs, source commit, evidence
URLs and hashes, every transaction hash, and final state. Each accompanying
receipt records FINALIZED lifecycle and SUCCESS leader execution. Deployment
used `leaderOnly: false`. [deployed-source.json](deployed-source.json) records
an exact byte-for-byte comparison of retrieved deployed code with local source.

The main clearing derived coverage `[1, 2, 3]` and selected offers `[0, 1]` for
cost 9. The finalized clearing receipt records three agree votes, one disagree
vote, and one idle vote. This is network consensus, not unanimous inference.
The complete receipt preserves that disagreement rather than hiding it.

These sources are explicitly synthetic documentation. The live test verifies
contract-side evidence acquisition, AI assessment, validator consensus and
allocation; it does not establish real supplier delivery.

StudioNet is the hosted development network. These receipts do not claim a
Bradbury public testnet deployment.

[failure-rollback.json](failure-rollback.json) records a live failed clearing:
the model supplied a supporting quote absent from the document. Execution
rolled back, and a subsequent `get_auction` read confirmed SEALED with the
original offers. The failed receipt is retained separately; it is not counted
as successful clearing.

The three-criterion XML board encountered invalid supporting quotes twice:
[first attempt](uncoverable-failed-clear-receipt.json),
[second attempt](uncoverable-clear-receipt.json). Both receipts remain visible.
The successful UNCOVERABLE proof uses a separate auction with one XML criterion
and one CSV offer; it does not claim recovery of the three-criterion board.

[local-checks.json](local-checks.json) records lint, 26 direct tests, and three
live read checks. Tests pin the SDK release archive in addition to the
contract's immutable GenVM runner hash.
