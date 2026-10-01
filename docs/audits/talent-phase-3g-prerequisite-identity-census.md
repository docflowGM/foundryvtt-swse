# Phase 3G-1 — Structured talent-prerequisite identity census

Read-only. Generator: `node tools/census-talent-prerequisite-identity.mjs` · data: `data/audits/talent-phase-3g-prerequisite-identity-census.json`. Baseline: merged `main` `a3a94c958`.

**331 canonical talents** carry `system.prerequisitesStructured` (the only structured field in production: `structuredPrerequisites` 0, `prereqClauses` 0). They hold **315 talent-to-talent conditions**; other structured conditions are untouched by this phase: skillTrained 19, attribute 16, bab 9.

292 of the owning records also carry printed prerequisite text (the checker's text path wins there); 8 have structured data only. Display/normalization consumers prefer the structured data over text.

## Identity forms and static resolution

| | Count |
|---|---|
| leaf id form `SWSE_FLAG_ID` | 310 |
| leaf id form `PRODUCTION_ID` | 5 |
| target resolution `UNIQUE` | 314 |
| target resolution `AMBIGUOUS` | 1 |
| target name globally unique | 302 |
| target in a same-name cross-tree group | 12 |
| target record has no `flags.swse.id` | 3 |

## What the real checker does (per leaf, real `PrerequisiteChecker`)

| Runtime shape | Met | Not met | via identity | via name fallback |
|---|---|---|---|---|
| embedded copy exactly as the finalizer creates it (new `_id`, flags kept, no source link) | 309 | 5 | 309 | 0 |
| embedded copy with `flags.core.sourceId` set | 309 | 5 | 309 | 0 |
| pending selection exactly as the talent step commits it | 0 | 314 | 0 | 0 |

Wrong same-name copy: 0 of 12 same-name targets are satisfied by the WRONG-tree talent.

## Phase 3D repairs

- Fearsome -> Saga Edition Core Rulebook|Bounty Hunter|Notorious
- Ruthless Negotiator -> Saga Edition Core Rulebook|Bounty Hunter|Notorious
- Shared Notoriety -> Saga Edition Core Rulebook|Infamy|Notorious
- Weakening Strike -> Saga Edition Core Rulebook|Misfortune|Dastardly Strike
- Unsavory Reputation -> Saga Edition Core Rulebook|Infamy|Notorious
