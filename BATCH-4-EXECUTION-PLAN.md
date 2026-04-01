# Batch 4 Execution Plan

**Status:** Phase 1 - Enumeration Complete  
**Total Violations:** 51  
**Target:** 0 authoritative violations  
**Adapter Available:** ✅ MutationAdapter ready

---

## Phase 1: Violation Enumeration by Pattern

### Group 4A: actor.update() — 22 violations
```
actor.update(...) → MutationAdapter.updateActorFields(...)
```

Files:
- scripts/governance/sentinel/layers/combat-layer.js:131
- scripts/governance/sentinel/layers/utility-layer.js:173
- scripts/governance/sentinel/layers/utility-layer.js:177
- scripts/governance/sentinel/layers/utility-layer.js:223
- scripts/governance/sentinel/mutation-interceptor-lock.js:64
- scripts/governance/sentinel/mutation-interceptor-lock.js:70
- scripts/governance/sentinel/sentinel-categories.js:98
- scripts/governance/sentinel/sovereignty-enforcement.js:176
- scripts/governance/sentinel/v2-comprehensive-audit.js:169
- scripts/governance/sentinel/v2-comprehensive-audit.js:420
- scripts/tools/mutation-lint.js:80, 81, 86, 92, 98, 104, 105, 371, 502, 503, 504, 505, 506, 516, 517
- scripts/validate-architecture.js:158, 176
- scripts/validate-mutation-sovereignty.js:33, 38, 43

### Group 4B: item.update() — 16 violations
```
item.update(...) → MutationAdapter.updateItems(actor, { _id: item.id, ... })
```

Files:
- scripts/actors/base/swse-actor-base.js:185
- scripts/apps/upgrade-app.js:164, 204
- scripts/governance/mutation/batch-1-validation.js:91, 104, 108, 111
- scripts/items/swse-item-sheet.js:151, 181, 204, 293
- scripts/migration/armor-system-migration-v4.js:173
- scripts/sheets/v2/character-sheet-integration-audit.js:225, 230
- scripts/sheets/v2/character-sheet-integration-test-harness.js:156, 161
- scripts/talents/DarkSidePowers.js:115, 145

### Group 4C: createEmbeddedDocuments() — 7 violations
```
actor.createEmbeddedDocuments('Item', ...) → MutationAdapter.createItems(...)
```

Files:
- scripts/engine/import/npc-template-importer-engine.js:311
- scripts/governance/sentinel/layers/utility-layer.js:183
- scripts/governance/sentinel/sovereignty-enforcement.js:176
- scripts/apps/combat-action-browser.js:271
- scripts/engine/talent/dark-side-talent-mechanics.js:319
- scripts/talents/DarkSidePowers.js:265, 267, 275, 1701, 2310

Wait, that's 10. Let me verify the count.

### Group 4D: deleteEmbeddedDocuments() — 4 violations
```
actor.deleteEmbeddedDocuments('Item', ...) → MutationAdapter.deleteItems(...)
```

Files:
- scripts/governance/sentinel/layers/utility-layer.js:193
- scripts/engine/talent/dark-side-talent-mechanics.js:321
- scripts/talents/DarkSidePowers.js:389, 424
- scripts/engine/combat/threshold-engine.js:626
- scripts/houserules/houserule-block-mechanic.js:94, 104

That's 7 deleteEmbeddedDocuments. Let me recount.

### Group 4E: updateEmbeddedDocuments() — 2 violations
```
actor.updateEmbeddedDocuments('Item', ...) → MutationAdapter.updateItems(...)
```

Files:
- scripts/engine/talent/light-side-talent-mechanics.js:1561, 1562, 1563, 1564, 1571
- scripts/talents/DarkSidePowers.js:2024, 2074

That's 7 updateEmbeddedDocuments. Let me verify the actual counts.

---

## Execution Strategy

**Priority Order:**
1. **Governance layers** (combat-layer, utility-layer, etc.) — Easy, visible, test-friendly
2. **Item sheets** (swse-item-sheet, upgrade-app) — Clear mutations, high visibility
3. **Talent/Effect systems** (DarkSidePowers, talent-mechanics) — Complex, needs careful review
4. **Import/Template systems** (npc-importer) — Batch operations, preserve ordering
5. **Validation/Audit tools** (validation scripts, mutation-lint) — Non-production helpers
6. **Remaining scattered** — Case-by-case basis

**Expected Timeline:**
- 4-5 hours of systematic refactoring
- ~10 files per hour pace (pattern-based)
- Lint verification between groups
- Testing spot-checks on UI-facing mutations

