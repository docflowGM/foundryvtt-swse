# Phase 5C — Historical Verifier Transitions

Rule applied: **a historical verifier verifies its frozen historical input; the Phase 5C parity gate (`tools/verify-canonical-production.mjs`) verifies the current operational SSOT.** Expected hashes of old phases were not changed to match new production; where a historical check meant "production unchanged at that checkpoint", its input was frozen or its subject exempted as Phase 5C-owned.

| Historical check | Why it saw the cutover | Treatment |
|---|---|---|
| Phase 3B/3C/3D, 4H-D cert, `verify-item-weapons-authority.mjs` (production baseline = `packs/weapons.db` sha256) | `packs/weapons.db` is now generated | Input frozen: `data/audits/frozen/pre-cutover-weapons.db` (exact pre-cutover bytes, classified HISTORICAL_AUDIT_EVIDENCE). Recorded baseline hashes unchanged. |
| Phase 3C ledger rebuild + dependency-gate recomputation | Gates were a snapshot of the pre-cutover reference scan; references have since been migrated | After cutover: rebuild-equality and live gate recomputation are skipped; the committed ledger is cross-checked against the corpus (repo-only = retired records, present/missing counts). |
| Talent 3E-4 / 3E-5 / 3F / 3G "untouched file" checks | Actor packs (`heroic/nonheroic/npc/droids/beasts`) and `data/class-archetypes.json` received the reference migration | Those paths are declared Phase 5C-owned in each checker (not re-hashed). |
| Talent/feat pass 3B-1/2A/2B/2C owner-adjudication tests (pinned `packs/feats.db`, `data/feat-catalog.json`) | Feat production regenerated | Live-feat pins removed (talents pin kept); live feat files gated by the Phase 5C parity gate. |
| Phase 3 final adjudication test "identical to main" (feat files) | Feat production regenerated | Main-equality kept for `packs/talents.db` only; feat files gated by the 5C parity gate. |
| `build-talent-feat-phase3-final-authority.mjs` closeout (`productionFilesSha256`) | Embedded live hashes | Frozen to the certified pre-cutover values (`PRE_CUTOVER_PRODUCTION_SHA256`). |
| `feat-tags-production-reconciliation` test | Compared the tag authority to the 390-record production | Committed pre-cutover report asserted as frozen evidence; post-cutover production asserted from the corpus. |
| `feat-catalog-validity-regression` | Duplicate-name rule | Only Phase 1A-certified `DISTINCT_FEAT_IDENTITIES` names may repeat. |
| 4H-B/4H-D "exact ability name" checks | Sith Lanvarok join to the noncanonical feat | Join removed (4H-F1); structural facts asserted instead. |
| Four action-authority tests | ATTACK_OPTION records 136 → 134 | Counts updated; proven (in `action-authority-136-record-reconciliation.test.mjs`) that both lost records came solely from removed noncanonical feats and none of the 134 originate from a removed record. |
| `grab-grapple-resistance-channel-split` | Orphan `packs/feat-catalog.db` retired | Loop reduced to `packs/feats.db`. |
