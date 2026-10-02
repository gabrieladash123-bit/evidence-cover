# Gasless StudioNet scenario proofs

Three auctions deployed the same `contracts/evidence_cover.py` source on
StudioNet (chain 61999). All transactions below finalized with successful
execution. State reads confirmed the coverage masks, allocation and terminal
phase. Retrieved deployed source matched the local source byte for byte.

| Scenario | Contract | Coverage masks | Selected offers | Cost | Clearing transaction |
| --- | --- | --- | --- | --- | --- |
| [Bundle wins](bundle-wins.json) | `0x20970D72aa24FBc760D61e52553D6eE7340548eF` | `[1, 2, 3]` | `[2]` | 7 | [receipt](bundle-wins-clear-receipt.json) |
| [Equal cost](equal-cost.json) | `0xdd9847DfD19619566F6B36d11C64746F1360c259` | `[1, 2, 3]` | `[2]` | 9 | [receipt](equal-cost-clear-receipt.json) |
| [Deceptive bid](deceptive-bid.json) | `0x05B8DE6e63E2E6A27a6E44Bad5edcF15fb76b2dF` | `[1, 2, 0]` | `[0, 1]` | 9 | [receipt](deceptive-bid-clear-receipt.json) |

The first auction selects a bundle priced below the two specialists combined.
The second chooses the one-supplier bundle at the same total price. The third
rejects the price-1 promise-only document despite its capability words and
prompt injection; its zero coverage leaves the two documented specialists as
the minimum complete portfolio. The manifests link commit-pinned evidence
documents and list every deployment, offer, seal and clearing transaction.

All evidence documents are synthetic. These executions demonstrate
contract-side document acquisition, AI coverage assessment, validator
consensus and deterministic allocation. They do not prove supplier delivery.
StudioNet is a hosted development network; these are not Bradbury transactions.
