# P6B deferred work (side bucket)

Generated from `data/audits/vehicles/p6b-deferred-work.json` by `tools/audits/vehicles/build-p6b-deferred-work.mjs`; edit the JSON, not this file.

Side bucket for P6B items that could not be implemented safely. Items here are NOT certified and stay fail-closed (not installable / not executable). Rendered to docs/audits/vehicles/p6b-deferred-work.md by tools/audits/vehicles/build-p6b-deferred-work.mjs.

## Summary

| Category | Count |
|---|---|
| RULES_DECISION_REQUIRED | 3 |
| SOURCE_EVIDENCE_MISSING | 1 |
| ENGINEERING_COMPLEXITY | 1 |
| LIVE_RUNTIME_PENDING | 1 |
| NONCRITICAL_DEFECT | 1 |
| DEPENDENCY_BLOCKED | 1 |

## Items (by severity)

| ID | Workstream | Component | Category | Severity | Owner ruling | Linked |
|---|---|---|---|---|---|---|
| P6B-D-001 | P6B-1 | reinforced-bulkheads-10, reinforced-bulkheads-20, reinforced-bulkheads-30 | RULES_DECISION_REQUIRED | IMPORTANT | yes | V-P6-01 |
| P6B-D-002 | P6B-1 | sublight-drive-1 .. sublight-drive-6 | RULES_DECISION_REQUIRED | IMPORTANT | yes | V-P6-02 |
| P6B-D-008 | P6B-1 | all 43 integrated effects; P6B-0 environment and Pilot check | LIVE_RUNTIME_PENDING | IMPORTANT | no | - |
| P6B-D-003 | P6B-1 | jamming-suite, jamming-array | ENGINEERING_COMPLEXITY | MINOR | no | V-P6-05, V-P2-04 |
| P6B-D-004 | P6B-1 | combat-thrusters | DEPENDENCY_BLOCKED | MINOR | no | V-P6-05, V-P2-04 |
| P6B-D-005 | P6B-1 | navicomputer-limited | RULES_DECISION_REQUIRED | MINOR | yes | V-P6B-01 |
| P6B-D-006 | P6B-1 | navicomputer (training clause) | NONCRITICAL_DEFECT | MINOR | no | V-P6-05 |
| P6B-D-007 | P6B-1 | com-jammers | SOURCE_EVIDENCE_MISSING | MINOR | no | - |

## Details

### P6B-D-001 - reinforced-bulkheads-10, reinforced-bulkheads-20, reinforced-bulkheads-30

- **Source:** Starships of the Galaxy pp. 43-44
- **Category / severity:** RULES_DECISION_REQUIRED / IMPORTANT
- **Reason:** Hit points increase by a percentage; the book gives no rounding rule, and it is unruled whether the percentage applies to printed HP only or also to other HP increases.
- **Missing:** Rounding direction and percentage basis.
- **Owner ruling needed:** yes (V-P6-01)
- **Source-supported options:** round down (Core general rounding); round to nearest; percentage of printed HP only vs current maximum
- **Impact:** 3 rows stay SOURCE_VERIFIED and not installable.
- **Recommended action:** Owner rules on V-P6-01; the effect is a one-line hp kind in the effects registry once ruled.

### P6B-D-002 - sublight-drive-1 .. sublight-drive-6

- **Source:** Starships of the Galaxy p. 41, Table 3-3
- **Category / severity:** RULES_DECISION_REQUIRED / IMPORTANT
- **Reason:** Every published hull already has a sublight speed; installing a drive is a replacement, which is unruled (same question as shields/hyperdrives). The 'military vessels only' clause for the fastest drives has no hull 'military' attribute in canonical data.
- **Missing:** Replacement rule (refund, EP of the old drive); a source-backed military-hull classification.
- **Owner ruling needed:** yes (V-P6-02)
- **Source-supported options:** replacement frees the old drive's EP; replacement keeps the old EP consumed; replacement not allowed on stock hulls
- **Impact:** 6 rows stay SOURCE_VERIFIED and not installable; starship-scale speed is never changed by the Shipyard.
- **Recommended action:** Owner rules on V-P6-02; then decide how a hull is classified as military (data field) before enabling the fastest drives.

### P6B-D-003 - jamming-suite, jamming-array

- **Source:** Starships of the Galaxy p. 43
- **Category / severity:** ENGINEERING_COMPLEXITY / MINOR
- **Reason:** The rule is printed clearly, but applying it needs an effect on ANOTHER vehicle: a swift action that picks a target within 6 starship squares, a per-target size-based penalty on Use Computer (communications/sensors) and on fire control (not reducing the Intelligence modifier below +0), and an opposed Use Computer check. None of these consumers exists: no starship-scale range measurement, no cross-actor temporary condition store, and fire control is not used by any executable weapon (V-P2-04).
- **Missing:** Cross-vehicle temporary effect state, starship-scale range check, opposed-check flow, fire-control penalty consumer.
- **Owner ruling needed:** no (V-P6-05, V-P2-04)
- **Impact:** 2 rows stay SOURCE_VERIFIED and not installable.
- **Recommended action:** Build after weapon execution (V-P2-04) exists, using the combat ActiveEffect path for the target condition.

### P6B-D-004 - combat-thrusters

- **Source:** Starships of the Galaxy p. 41
- **Category / severity:** DEPENDENCY_BLOCKED / MINOR
- **Reason:** Effects are 'treated as one size smaller when targeted by capital-ship weapons' and 'treated as a starfighter for dogfighting and starship combat maneuvers'. The system has no dogfight eligibility check, no starship-maneuver eligibility by size, and no executable capital-ship weapon targeting.
- **Missing:** Dogfight / starship maneuver eligibility consumer; capital-weapon targeting (blocked by V-P2-04).
- **Owner ruling needed:** no (V-P6-05, V-P2-04)
- **Impact:** Row stays SOURCE_VERIFIED and not installable.
- **Recommended action:** Implement as a size-category override read by the dogfight and capital-weapon targeting code once those exist.

### P6B-D-005 - navicomputer-limited

- **Source:** Starships of the Galaxy p. 41
- **Category / severity:** RULES_DECISION_REQUIRED / MINOR
- **Reason:** The printed text says only that it stores two jumps' worth of information. It does not state whether it grants the navicomputer's +5 astrogation bonus, or what happens on a third jump.
- **Missing:** Bonus value (if any) and the consequence of exceeding two stored jumps.
- **Owner ruling needed:** yes (V-P6B-01)
- **Source-supported options:** no astrogation bonus; storage limit only; same +5 as a standard navicomputer while within its two stored jumps
- **Impact:** Row stays SOURCE_VERIFIED and not installable.
- **Recommended action:** Owner rules on V-P6B-01.

### P6B-D-006 - navicomputer (training clause)

- **Source:** Starships of the Galaxy p. 41
- **Category / severity:** NONCRITICAL_DEFECT / MINOR
- **Reason:** The +5 bonus is integrated. Any trained-only gate for astrogation in the skill roller is not vehicle-aware, so a navicomputer clause about untrained astrogation has no consumer; the roll is never blocked by the vehicle code either way.
- **Missing:** A trained-only check consumer for Use Computer (astrogate) that can see the vehicle.
- **Owner ruling needed:** no (V-P6-05)
- **Impact:** No incorrect mechanic: the bonus applies; the training permission is not enforced either way.
- **Recommended action:** Wire when the skill roller gains trained-only enforcement for skill uses.

### P6B-D-007 - com-jammers

- **Source:** legacy catalog row (effectVerification UNVERIFIED)
- **Category / severity:** SOURCE_EVIDENCE_MISSING / MINOR
- **Reason:** The row's effect text is legacy and unverified; the census does not match it to a printed SotG row.
- **Missing:** A printed source for the component and its effect.
- **Owner ruling needed:** no
- **Impact:** Row stays reference-only; not installable.
- **Recommended action:** Locate a printed source or retire the legacy row.

### P6B-D-008 - all 43 integrated effects; P6B-0 environment and Pilot check

- **Source:** -
- **Category / severity:** LIVE_RUNTIME_PENDING / IMPORTANT
- **Reason:** Verified offline (Node tests with Handlebars). Foundry V13 runtime is not available in this environment.
- **Missing:** Live V13 session run of docs/audits/vehicles/p6a-final-acceptance-report.md checklist plus P6B-1 items (recharge shields restores 10 with regenerating shields; SLAM bonus in speed Pilot check; astrogation roll bonus).
- **Owner ruling needed:** no
- **Impact:** Status stays OFFLINE_INTEGRATED_LIVE_PENDING; nothing is marked LIVE_RUNTIME_VERIFIED.
- **Recommended action:** Run the live checklist in a V13 world.
