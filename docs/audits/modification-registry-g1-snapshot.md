# Modification Registry v1.5 — G1 Snapshot and Validator

**Status:** G1 package, for independent review. **Nothing here is loaded at runtime.** No adapter, crosswalk, consumer, catalog, pack or gameplay change is part of G1.
**Governing contract:** `docs/audits/modification-canonical-registry-phase-1b-contract.md` (merged, PR #1036), sections 2, 3, 8 (G1) and 10-11.
**Branch / PR:** `audit/modification-v1-5-source-transfer-20261014`, draft PR #1038.

## 1. What G1 delivers

| Item | Path |
|---|---|
| Immutable registry snapshot (unchanged, staged by the owner) | `data/audits/modification-rolling-authority-v1.5.json` |
| Supplementary research Markdown (unchanged, staged by the owner) | `docs/audits/modification-rolling-authority-v1.5.md` |
| Version-pinned manifest (hashes, counts, vocabularies, known deviations, waiver) | `data/audits/modification-rolling-authority-v1.5.manifest.json` |
| Read-only validator and CLI | `tools/validate-modification-registry.mjs` |
| Positive and negative tests (28 checks) | `tests/modification-registry-validator.test.mjs` |
| CI step | `.github/workflows/rolling-system-validation.yml` ("Guard — modification registry snapshot (G1, read-only)") |
| Byte-preservation attributes | `.gitattributes` (`-text` for the two source files) |
| Authority classification (regenerated, not hand-edited) | `data/audits/phase-5c-authority-classification.json`, `docs/audits/phase-5c-authority-classification.md` |

Both source files were committed by the owner and are not modified by G1.

**Why the classification files changed.** The existing guard `tests/phase-5c-canonical-production-negative.test.mjs` (via `tools/lib/canonical-authority-classification.mjs`) requires every file under `data/audits/` to be listed in `data/audits/phase-5c-authority-classification.json`. The owner-staged registry JSON alone already tripped it ("classification file out of date"), and so did the new manifest. The two files were classified by running the repository's own generator, `node tools/build-phase-5c-authority-classification.mjs`, which assigns `HISTORICAL_AUDIT_EVIDENCE` (never read by runtime or generators) by its existing `data/audits/` rule. The regenerated diff is exactly two new entries, the count 237 to 239, and the matching two lines in the Markdown summary (189 to 191). No rule in the generator was changed.

## 2. Artifact identity and verification status

| Artifact | Bytes | SHA-256 | Status |
|---|---|---|---|
| Registry JSON | 960,022 | `7be427414a95216a8bec45078e62ea2a7fb6e185f24b1f4c2ee250bac7093d00` | **Verified.** The committed file is byte-identical (`cmp`) to the original v1.5 JSON uploaded to the implementation session, and both hash to this value. |
| Companion Markdown | 137,237 | `70e7cdff09fe612c9a68cfb6344eb553f64ee747d2ddfaed0262b6d270eab597` | **Supplementary. Original-byte verification waived by the owner.** The recorded hash identifies the committed file for change detection only. |

### Owner waiver W1 (recorded in the manifest)

On 2026-10-14 the owner ruled that independent verification of the Markdown against its original raw bytes is no longer a release blocker, and that the Markdown stays in the repository as supplementary research documentation. **The Markdown has not been verified against its original bytes and must never be represented as original-byte certified.** The authoritative registry is the JSON snapshot. The validator enforces this: a manifest that states any other `originalByteVerification` value than `waived-by-owner` fails with `MARKDOWN_VERIFICATION_OVERSTATED`, and the Markdown's hash check is reported as "committed identity only".

## 3. Validator behaviour

`node tools/validate-modification-registry.mjs [--json]` exits `0` when valid and `1` otherwise. It is read-only: it never writes, repairs, normalizes, re-serializes or ignores anything, and a static test asserts the absence of write, clock, random, network and child-process calls.

| Check | Enforced |
|---|---|
| V1 | Manifest shape; registry length and SHA-256 over the exact bytes; JSON parses; `version` equals the manifest's; Markdown committed-identity check; waiver wording |
| V2 | Exact counts: 186 definitions, 57 procedures, 128 `EFFECTS_CERTIFIED`, 58 `PENDING_RULES_TEXT`, 0 `FULL_CERTIFIED`, table-certification and procedure-status tallies, 58 Scum rows; 232 typed definitions (equipment 38, weapon 121, armor 73) versus 231 eligible upgrade candidates (38 / 120 / 73) by the defined rule (excluded `sourceRole` `temporary_talent_actuator_not_installed_upgrade`, exactly `web-outlaw-tech-personalized-modifications`); the registry's own `indexSummary` must agree with the defined populations |
| V3 | Unique definition, procedure and typed ids; no id shared between definitions and procedures; typed id equals parent id plus `::` plus domain |
| V4 | Required fields from `definitionsSchema.required` |
| V5 | Only weapon, armor, equipment typed domains; `candidateHostDomains` equals the typed-definition keys; typed `domain` equals its key |
| V6 | `bookId`, `sourceFamily` and `procedureId` references resolve; page numbers are positive integers or null |
| V7 | Certification-state consistency (pending, effects-certified, no `FULL_CERTIFIED`); recognized `consumerStatus` and `effectStatus` values only |
| V8 | Known slot-cost types; `fixed` requires an integer `slots` >= 0 |
| V9 | Known price types; `credits` requires a finite amount >= 0; `not_stated` may never carry a number |
| V10 | Not applicable in G1 (no crosswalk exists) and reported as such |

### Known deviations (exact, version-pinned)

Matching requires the registry version, error code, exact path, observed value and expected value to agree. An unlisted failure, a stale or drifted exception, an invalid or duplicate exception, or an exception for another registry version fails validation. Matched exceptions are always printed.

| Code | Path | Observed | Expected |
|---|---|---|---|
| `REF_SOURCE_FAMILY_UNDECLARED` | `/definitions/136/sourceFamily` | `armor_template` | member of `sourceFamilies` |
| `REF_SOURCE_FAMILY_UNDECLARED` | `/definitions/137/sourceFamily` | `purchase_quality_talent` | member of `sourceFamilies` |
| `REF_SOURCE_FAMILY_UNDECLARED` | `/definitions/138/sourceFamily` | `improvised_equipment_explosive` | member of `sourceFamilies` |

These are the three owner-approved R1 findings (definitions `reb-stygian-triprismatic-polymer-armor`, `reb-excellent-kit-purchased-quality`, `reb-jury-rigged-power-pack-bomb`). The snapshot is not repaired. R4 and R5 (Phase 1b contract) remain documented limitations of the registry, not validator failures.

## 4. Release packaging and runtime-loading inspection

- `system.json` points `download` at a GitHub release `swse.zip`. No workflow in this repository builds it; the only packaging script is `scripts/build/package-system.js`.
- That script uses an explicit allowlist (`system.json`, `template.json`, `templates/`, `scripts/`, `helpers/`, `styles/`, `assets/`, `lang/`, `index.js`, `LICENSE`). Neither `data/` nor `docs/` is included, so the registry, manifest and Markdown are **not** shipped by that script. A test pins the allowlist so adding `data` or `docs` to it fails.
- No file under `scripts/`, `templates/`, `helpers/`, `styles/`, `lang/`, `system.json`, `template.json` or `index.js` references the registry or the validator (static test). The manifest states `runtimeLoading: "prohibited"`, and the validator fails if that changes.
- `.gitattributes` previously normalized `*.json` and `*.md` to LF. Both source files are now marked `-text` so no line-ending conversion can alter their pinned bytes. The files already contain only LF, so nothing in the repository changes.
- No packaging change was made. A release process outside this repository could still bundle `data/audits/` if someone runs it by hand; that is a release-process decision for the owner.

## 5. Tests and CI

`node tests/modification-registry-validator.test.mjs` runs 28 checks with independently specified literal expectations (hashes, counts, ids, error codes). They cover the real snapshot and negative variants for every check V1-V9, known-deviation drift (changed observed value, stale or mismatched expected value, moved path, other version, incomplete or duplicate exception, defect no longer present), non-mutation and determinism, the Markdown waiver, the runtime-reference and packaging guards, and the CLI exit code. The existing rolling-system runner (`tools/run-rolling-tests.mjs`) discovers every `tests/*.test.mjs` file, so the new test runs in CI without a runner change; the new workflow step runs the validator itself.

## 6. Deliberately not done

No adapter, crosswalk, page attestation, host-applicability attestation, trusted validation handle, certified lookup, consumer, catalog, pack or gameplay change; no change to Phase 1a or to any existing test; no runtime dependency on the registry. The trusted, branded validation handle described in Phase 1b section 4.1 belongs to G2 and is not implemented here: the G1 validator returns a report, not a handle.

## 7. Observations for G2 (not defects of G1)

- `web-outlaw-tech-personalized-modifications` has `originalCost.type: talent_action_only` with `amount: 0` and `credits: 0`. That zero is not a price; a G2 price lookup must return `unknown` or a tagged non-price for that type, never `0`.
- `existingCatalogKeys` stays untrusted (R3); the crosswalk is G2.
