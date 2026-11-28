# Domain contract format (Level B with embedded Level C)

Every domain contract is a pair:

- `docs/architecture/v2-contracts/B-<CODE>-<domain>.md` (human-readable)
- `data/audits/architecture-census/contracts/domains/<domain>.json` (machine-readable sidecar; the Phase 2 finding register is assembled from these sidecars)

## Markdown sections

1. **Purpose and boundaries**
2. **Responsibility ownership** — table: `R-<CODE>-nn` · responsibility · owner (path + symbol) · status label · verification level · evidence (`path:line`)
3. **Authorities** — canonical data, rules, calculation, mutation/persistence; each with a status label
4. **Public interfaces** — symbol, `path:line`, consumer count, inputs/outputs
5. **Dependencies** — allowed, prohibited, observed violations
6. **Integration points and lifecycle** — hooks, registrations, entry points, ordering
7. **Failure behavior and domain invariants** — reference Level A IDs instead of restating them
8. **Level C subsystem interface contracts** — `C-<CODE>-n`, only where a subsystem boundary is real
9. **Tests and certification** — CI tests that exercise the responsibilities; Foundry acceptance status
10. **Reconciliation with existing contracts** — agreements and contradictions (`CR-<CODE>-nn`)
11. **Phase 2 conformance summary** — findings `F-<CODE>-nnn` (full detail in the sidecar)
12. **Unimplemented, deferred and acceptance-required items**

## Status labels

`OBSERVED` (proven in code) · `APPROVED` (existing authoritative contract or owner decision; cite it) · `PROPOSED` (recommendation awaiting owner) · `CONFLICT` (observed contradicts an approved authority or another contract) · `UNVERIFIED` · `UNIMPLEMENTED` · `DEFERRED_RULES_REVIEW` · `FOUNDRY_ACCEPTANCE_REQUIRED`. Several may apply (e.g. `APPROVED · CONFLICT`). `PROPOSED` is never silently promoted to `APPROVED`.

## Verification levels

`source-inspected` · `dependency-traced` · `behavior-code-verified` · `test-verified` (name the test) · `live-foundry-verified` (none in Phases 0–2) · `inferred` · `unverified`.

## Sidecar schema (`swse.v2-contract.domain/1`)

```json
{
  "schema": "swse.v2-contract.domain/1",
  "contractId": "B-<CODE>",
  "domain": "<domain>",
  "auditedCommit": "f734b4d33f0e7603856b262f06dd705cc02ab5b8",
  "summary": "one paragraph",
  "responsibilities": [
    { "id": "R-<CODE>-01", "responsibility": "", "owner": { "path": "", "symbol": "" },
      "status": ["OBSERVED"], "verification": "behavior-code-verified",
      "evidence": ["scripts/x.js:123"], "tests": ["tests/x.test.mjs"], "notes": "" }
  ],
  "publicInterfaces": [ { "symbol": "", "path": "", "line": 0, "consumers": 0, "contract": "" } ],
  "dependencies": { "allowed": [], "prohibited": [], "observedViolations": [ { "from": "", "to": "", "evidence": "" } ] },
  "subsystemContracts": [ { "id": "C-<CODE>-1", "boundary": "", "interface": "", "status": [] } ],
  "contradictions": [ { "id": "CR-<CODE>-01", "existingSource": "docs/...md §", "claim": "", "observed": "", "evidence": [], "status": "CONFLICT" } ],
  "unimplemented": [ { "id": "U-<CODE>-01", "item": "", "source": "", "status": "UNIMPLEMENTED" } ],
  "deferredRules": [ { "item": "", "registerRef": "RD-…" } ],
  "foundryAcceptance": [ { "item": "", "source": "" } ],
  "findings": [
    { "id": "F-<CODE>-001", "category": "", "severity": "high", "status": "confirmed",
      "title": "", "affectedFiles": [], "evidence": ["path:line"], "observed": "", "intendedOwnership": "",
      "contractRef": "A-02 | R-<CODE>-nn", "proposedSolution": "", "alternatives": "",
      "dependencies": [], "ownerDecisionRequired": false, "rulesQuestion": false,
      "regressionTests": "", "foundryAcceptance": "", "scope": "S", "simplificationBenefit": "", "risk": "", "perfImpact": "none" }
  ]
}
```

Finding categories: `ownership-violation`, `duplicate-authority`, `multiple-writers`, `presentation-rules`, `bypass-engine`, `duplicate-schema-interpretation`, `unauthorized-persistence`, `dependency`, `conflicting-interface`, `contract-contradiction`, `dead-code`, `legacy-compat`, `wrapper-indirection`, `duplicate-normalization`, `redundant-state`, `oversized-module`, `consolidation`, `performance`, `documentation`, `unimplemented`.

Severity: `critical` (data loss, broken atomicity, wrong mechanics in a live path) · `high` (approved invariant violated on a live path) · `medium` (duplication/bloat with real maintenance or correctness risk) · `low` (cleanup) · `info`.

Status: `confirmed` (behavior-code-verified) or `suspected` (lead not fully traced). Every finding cites `path:line` evidence that exists at the audited commit.
