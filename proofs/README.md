# Verified StudioNet execution

Main contract: `0x8d0ae7332edFd1E51d03f02563944429881Bbc5f`.

[main.json](main.json) records the immutable inputs, source commit, evidence
URLs and hashes, every transaction hash, and final state. Each accompanying
receipt records FINALIZED lifecycle and SUCCESS leader execution. Deployment
used `leaderOnly: false`. [deployed-source.json](deployed-source.json) records
an exact byte-for-byte comparison of retrieved onchain code with local source.

The main clearing derived coverage `[1, 2, 3]` and selected offers `[0, 1]` for
cost 9. The finalized clearing receipt records three agree votes, one disagree
vote, and one idle vote. This is network consensus, not unanimous inference.
The complete receipt preserves that disagreement rather than hiding it.

These sources are explicitly synthetic documentation. The live test verifies
contract-side evidence acquisition, AI assessment, validator consensus and
allocation; it does not establish real supplier delivery.

[local-checks.json](local-checks.json) records lint, 26 direct tests, and three
live read checks. Tests pin the SDK release archive in addition to the
contract's immutable GenVM runner hash.
