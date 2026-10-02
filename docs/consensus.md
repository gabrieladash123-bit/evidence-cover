# Consensus and clearing specification

## Evidence boundary

The buyer fixes normative criteria and invitation addresses at construction. Each supplier commits a raw.githubusercontent.com URL with a 40-character commit ID, an exact-response SHA-256, and a positive integer quote. Mutable branches, query-bearing URLs and traversal paths are rejected. Each UTF-8 document is bounded at 16,000 bytes. Failed or changed evidence aborts the entire clearing; it is never silently treated as zero coverage.

## Semantic output

For every supplier/requirement pair, independent analysis returns SUPPORTED, UNSUPPORTED or UNCERTAIN. SUPPORTED needs a source-anchored quote and sets one coverage bit; both other labels fail closed. Validators independently fetch the documents and run the full assessment before comparison. Leader documents must match independently fetched bytes, masks must match reported decisions, and the entire coverage-vector signature must exactly match the independent result. No tolerance can cross a decision boundary.

Unsupported versus uncertain can differ because neither authorizes allocation. Quotes may differ when coverage is identical, but each stored quote must occur in the committed source. Quotes anchor evidence; independent semantic evaluation verifies the substance.

Source text is treated as untrusted data. Prompt-injection resistance is best effort, not guaranteed. Models may share errors. Exact coverage agreement trades liveness for decision consistency. Malformed AI output never authorizes an award.

## Allocation

At most 8 suppliers and 6 requirements produce at most 256 subsets. A feasible subset covers every requirement. Exhaustive search minimizes total integer cost, then supplier count, then ordered submission indices. This establishes global optimality for the consensus-agreed coverage table, unlike greedy selection.

UNCOVERABLE stores the reachable coverage mask with no winners. OVER_BUDGET stores the cheapest complete cost with no winners. CLEARED stores winners and total cost. Prices are positive and bounded.

The evidence root hashes canonical JSON of the mechanism version, budget, requirements, the full ordered offer board including supplier addresses, URLs, evidence hashes and costs, and agreed masks. It binds the adjudicated inputs and consequential table. It is not a delivery certificate or signature.

## Authority and liveness

Only the buyer seals. One offer per invited address prevents uninvited slot exhaustion. The buyer can seal before all invited parties bid; that authority is explicit. Anyone clears. Offers and criteria cannot be amended. Terminal outcomes are immutable.

There is no custom application appeal method; network appeals and finality apply. Consumers must wait for finalized execution success. Sources can disappear and validators can disagree, leaving the auction SEALED. Changed documents require a new auction. No token transfer or message is emitted during clearing.

This mechanism differs from versioned graph proposals, certificate lifecycles, one-time consumption, ledger matching and pricing-program compilation: semantic evidence determines a coverage table consumed by a bounded combinatorial procurement optimizer.

## API references

- https://sdk.genlayer.com/main/_static/ai/api.txt
- https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle
- https://skills.genlayer.com/

SDK APIs were checked for HTTP responses, JSON prompts, result wrappers, typed storage and transaction finality.
