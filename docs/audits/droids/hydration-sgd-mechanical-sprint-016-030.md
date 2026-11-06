# Scavenger's Guide to Droids — Mechanical Sprint M3 (016–030)

**Checkpoint:** 2026-11-02  
**Audit branch:** `audit/droid-publication-census-2026-10-29`  
**Ledger implementation commit:** `e98c084e78768610935856d9c588058d62eed0ad`  
**Machine-readable manifest commit:** `0bdc013a58a1eeee89722716d564e2415237bbb4`  
**Authoritative source:** *Scavenger's Guide to Droids*, printed pp. 98–127, physically displayed source-page montages and PDF column extraction.

## Sprint acceptance

The second **15-droid sprint** structured `SGD-DROID-016` through `SGD-DROID-030`. The previous sprint `001–015` remains unchanged.

- **15 records** reviewed and structurally hydrated; **30 / 46** SGD source claims now have a second-pass component/progression/movement hydration. Remaining scope: `031–046` (**16 claims**).
- **133 component instances**, **46 physical appendage locations**, **15 locomotion entries**, and **19 equipment possession types (26 printed quantity units)** newly recorded across this sprint.
- **72 printed feat-line claims**, **19 talent claims**, **34 attack lines** remain source-scoped and need canonical/permission checks. A feat-line claim such as multi-skill Skill Focus **is not yet proof of individually mapped feat instances**.
- The published **11 player-eligible / 4 player-prohibited** statuses in this batch remain unchanged. Printed character build suggestions do not authorize adopting all NPC features for free.
- **0 new strict source-mechanical certifications**; overall SGD remains **0 / 46**; entire frozen census **0 / 234**. Source hydration is substantive but not the same as whole-record certification.
- **0 Foundry runtime certifications**; runtime testing is explicitly deferred until committed and merged, and not used as a gate for independent source-mechanical certification.
- No production compendium, authority module, world actor, ship or integrated attack was created or modified. No merge.

### Per-record progress

| ID | Printed identity | Component instances | Physical appendages | Possession types | Feat/talent claims | PC eligibility | Mechanical certificate |
|---|---|---:|---:|---:|---:|---|---|
| 016 | G2 Repair Droid | 8 | 2 | 1 | 1/0 | allowed | partial |
| 017 | GD16-Series Pilot Droid | 9 | 4 | 0 | 6/3 | allowed | partial |
| 018 | GX1-Series Battle Droid | 10 | 5 | 3 | 8/3 | prohibited | partial |
| 019 | GY-I Information Analysis Droid | 6 | 2 | 0 | 3/1 | allowed | partial |
| 020 | H-1ME Battle Mechanic Droid | 15 | 8 | 1 | 2/1 | allowed | partial |
| 021 | HK-77 Assassin Droid | 9 | 2 | 1 | 6/2 | prohibited | partial |
| 022 | HKB-3 Hunter-Killer Droid | 9 | 2 | 1 | 7/3 | allowed | partial |
| 023 | KM1 Mining Droid | 8 | 2 | 1 | 4/0 | prohibited | partial |
| 024 | M38 Explorer Droid | 9 | 2 | 0 | 3/1 | allowed | partial |
| 025 | MEV-Series Medical Evacuation Droid | 10 | 4 | 3 | 5/0 | allowed | partial |
| 026 | MK-Series Maintenance Droid | 8 | 2 | 0 | 5/1 | allowed | partial |
| 027 | Model 88-Series Administration Droid | 7 | 2 | 1 | 9/2 | allowed | partial |
| 028 | PG-5 Gunnery Droid | 9 | 4 | 1 | 3/0 | allowed | partial |
| 029 | PLNK-Series Power Droid | 7 | 2 | 2 | 3/0 | prohibited | partial |
| 030 | RO-D-Series Droid | 9 | 3 | 4 | 7/2 | allowed | partial |

### Primary-source distinctions retained

1. **G2 (016), H-1ME (020), MK (026):** Printed tool kit inventory, tool appendages, and the MK's explicitly *virtual* tool-kit equivalence are distinct. Do not create an extra chassis system from ordinary owned equipment.
2. **GD16 (017):** Copilot and vehicle operations are constrained to vehicle actions and printed swift-action limits; Simultaneous Operation is not a generalized action-economy bonus.
3. **GX1 (018), HK-77 (021), KM1 (023), PLNK (029):** Their printed heroic PC prohibition is retained even when they have impressive feats or capabilities.
4. **HKB-3 (022):** A **5-km remote processor** is an identified processor/controller instance. It is deliberately **not** silently changed to heuristic local processing. Its own teamwork features have target/ally/range predicates.
5. **HK-77 (021):** Two printed rifles; special overcharge consumes extra shots and forces cooling, and dual-wielding does not imply third or free attacks.
6. **KM1 (023):** Two printed laser cutters (treated as heavy blaster pistols, maximum range **12 squares**) and a separate shield/stability source rule. These are source possessions and printed attacks, not executable rights.
7. **MEV (025):** **Six medpacs** and separate medical and surgery kits are quantity-bearing consumables/equipment. The folding repulsorlift bed has a move-action deployment and changes the fighting-space envelope; no unconditional extra bed action.
8. **MK (026):** Main statblock explicitly says **2nd-degree**, protocol presentation **3rd-degree**, and `SGD-026-CONFLICT-DEGREE` remains **unresolved**. Printed PC mechanic-chassis suggestion is a separate route.
9. **PG-5 (028):** The vehicle battery-fire feature belongs in the vehicle gunnery authority and carries an attack penalty per weapon; laser welder is an individually printed item.
10. **RO-D (030):** Club, concealed stun baton, programmable light rack and audio monitor are separately named possessions; reaction aid/quick-fix is usage-bound.

### Actual validation

- All **46 source records** pass a recursive JSON property/type/enum/$ref **structural walk** and the source `fieldStates` null/empty-pointer semantic rules.
- All **15** have census/backlog exact identity, printed page, structured class/component/movement/physical-location and certification-state checks; **0 failures**.
- All **15** have source-only published attacks, no invented factory/default activation, no duplicate component identities, valid physical location/movement component references.
- All **9** named semantic safety gates passed, including remote versus heuristic, unresolved MK conflict, forbidden-PC enforcement, unchosen languages, unknown/null-to-zero behavior and attack authority.

**Not claimed:** The original repository `tools/audits/droids/verify_schema.py` Python `Draft202012Validator` was not executed against the repository's current source ledger; its bundled synthetic fixture test was not rerun. A custom tool-internal structural and semantic validation is not a substitute for running that test in CI. The full legal progression/feat/talent/mount/rule verification and Foundry runtime suites likewise have not been run. No source-mechanical certificate can be granted on this evidence alone.

### GitHub artifacts

- `data/canonical/droids/source-books/sgd.json` — source-backed fields, original 46 IDs preserved.
- `data/audits/droids/sgd-mechanical-sprint-016-030.json` — every record's structured counts, source conflicts, partial status and validation receipt.
- This checkpoint document.

### Next authorized sprint

Complete `SGD-DROID-031` through `SGD-DROID-045`, then the remaining publication entry `046`. Separately, return to `001–030` to prove individually canonical feat/talent instances, item/equipment and weapon-mount identity, conditional rule predicates, and disputed-source decisions. Keep the source-mechanical certificate independent of any post-merge runtime work.
