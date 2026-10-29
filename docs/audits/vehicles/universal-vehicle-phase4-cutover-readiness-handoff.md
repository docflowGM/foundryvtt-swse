# SWSE Vehicle Compendium Cutover — Next Conversation Decision Handoff

**Branch:** `audit/universal-vehicles-phase1`. Refer to the verified latest Git HEAD and exact-head CI run when beginning. **Do not assume main has been merged.**

## What is complete now

Phases 0–2 retain their historical scopes. Phase 3 has accepted **429** source-specific claims from **14** books, 48/48 final-seven-book field QA, 10 targeted anomalies, and the additive, SHA-anchored Core Vulture page/title correction. See `docs/audits/vehicles/universal-vehicle-phase3-final-source-acceptance.md` and `data/audits/vehicles/swse-universal-phase3-targeted-exceptions.json`. The frozen raw 316-ship authority and Phase 1 census remain original; use the approved resolver to obtain correct **effective** source records.

**No new compendium, canonical 429-record SSOT, V2-import wiring, migration or actor has been deployed yet.** The safe current work is source-only.

## Agenda for the next session: replacing vehicle compendiums

1. **Phase 4A: build canonical SSOT.** Agree on `data/canonical/vehicles/vehicles.json` as the single 429-line NDJSON source authority. Generate it from the accepted Phase 3 staged vehicle records using `tools/build-universal-vehicle-phase3-source-preview.mjs`, never raw frozen Core page/title. Preserve all source-specific keys, cross-book duplicates as separate publication claims, printed unknowns/contradictions, conditional loadouts, and untrusted mounts. Include deterministic builder and exact-line/readback checks.
2. **Phase 4B: deterministic category packs.** Decide the final compendium taxonomy (starfighters, space transports, capital ships/stations, atmospheric and ground, hybrid droid-vehicles, etc.) and how hybrid publications appear once, not twice. Generate official Foundry V13 **native LevelDB** from SSOT, with reproducible export/count checks; no hand-edited competing JSON or DB authorities.
3. **Importer blocker before activating world Actors.** Replace or bypass `normalizeVehicleImportData` only with an audited projection that preserves numeric Initiative and distinguishes source-silent values from actual zero/none. See `docs/audits/vehicles/swse-sotg-cp23c4c-canonical-import-normalization-blocker.md`; preserve the existing CP23-C4C deny-by-default import gate until tests and owner acceptance.
4. **Phase 4C: V2 framework integration.** Map category packs into `system.json`, existing vehicle browser, compendium discovery/import wizard and V2 Pure/Modified vehicle engine. Avoid parallel calculators; do not assume firingGroup implies installed weaponMount or an executable attack.
5. **Phase 4D: live Foundry test.** In a controlled test world inspect native pack readback, Actor creation, V2 sheets, defenses, movement/modes, source-only presentation, and safe GM import. Compare existing world Actor data before/after and verify no accidental user-world writes or auto-migrations.
6. **Phase 4E: controlled release decision.** Only after exact-head CI, native pack checks, authenticated installation receipts, fail-closed attack permission checks, documented rollback and independent review consider registering the new compendiums and retiring old ship-specific packs. Never direct-merge the audit branch to main as a substitute.

## Decisions to make before cutover

- Which categories and pack names become the public canonical compendiums?
- Should existing world vehicles be replaced, mapped conservatively by source key, or offered as GM opt-in migrations?
- How should unapproved weapon mounts and unknown stats appear in the V2 UI without becoming executable attacks?
- What rollback snapshot, staged version boundary and acceptance receipt are required?

**Hard boundary:** Phase 3 source acceptance allows **Phase 4A source-only assembly**, not automatically Phase 4B pack registration, Phase 4C imports, Phase 4D world mutation, or a release. Imported stock attacks remain untrusted until independently certified.
