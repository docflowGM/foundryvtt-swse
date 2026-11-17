> **Superseded (implementation, P0).** The staging catalogs and schemas named below were replaced by the unified contract; see `README.md` in this folder. The original files remain in git history at `cdd5d33`.

# SWSE Galactic Profiles v3 — Eight Custom Heroic Droids (STAGED)

> **NOT INSTALLED, NOT MECHANICALLY CERTIFIED, NOT READY TO PLAY.**
> Data and implementation instructions only. No code or production registry changes are authorized by this package.

This directory extends the **33 staged organic/nonheroic/beast profiles** in the parent `data/galactic-profiles/v3/` package with **eight custom heroic droids**. The intended combined regression population is **41** profiles. Both use `schemaVersion: 3` and the mechanical authoring `format: "swse.galactic-profiles.v3"`; the lightweight droid browse catalog uses its own `swse.galactic-droid-profiles.catalog.v3` format.

## Files

- `SWSE_Eight_Droid_Galactic_Profiles_v3.json` — **authoritative authoring intent**, eight fully specified mechanical profiles. Contains raw pre-degree-and-size scores and intended final scores, class/feat/talent/skill selections, degree, size, systems, provisional hardware quote details, external gear, selected starting-credit rolls, final wallet and open certification gates.
- `SWSE_Eight_Droid_Galactic_Profiles_Catalog_v3.json` — derived, **display-only** class/role/summary list. Never grant feats, items or credits from catalog display values.
- `SWSE_Eight_Droid_Galactic_Profiles_v3.schema.json` — Draft 2020-12 **structural** schema extended from the adjacent organic v3 authoring schema. It requires the droid payload, custom heroic-droid identity, no Constitution score, initial hardware selections, and `publishableAsReadyToPlay=false`.
- `docs/audits/SWSE_Galactic_Profiles_v3_Claude_Implementation_Handoff.md` — repository-wide architecture, known hazards, implementation phases and regression acceptance criteria.

**Do not** replace `data/character-templates.json` or `data/nonheroic-templates.json` with this source. These v3 datasets require a canonical compiler/session integration, not a raw v2 drop-in. Existing 33 staged profiles are unchanged.

## Included profiles

| Class | Focus | Profile ID | Display name |
|---|---|---|---|
| Scout | DEX | `droid_scout_dex_recon_probe` | Reconnaissance Probe |
| Scout | INT | `droid_scout_int_astromech_pathfinder` | Astromech Pathfinder |
| Soldier | DEX | `droid_soldier_dex_security_enforcer` | Security Enforcer |
| Soldier | STR | `droid_soldier_str_industrial_vanguard` | Industrial Vanguard |
| Noble | INT | `droid_noble_int_medical_coordinator` | Medical Coordinator |
| Noble | CHA | `droid_noble_cha_protocol_envoy` | Protocol Envoy |
| Scoundrel | CHA | `droid_scoundrel_cha_service_operative` | Service-Sector Operative |
| Scoundrel | DEX | `droid_scoundrel_dex_systems_infiltrator` | Systems Infiltrator |

## Locked assumptions and RAW framing

- Level 1, `participantKind=droid`, `rulesTrack=heroic-droid`, `creationMode=custom`: **not** stock chassis and **not** the published standard-model purchase path. These names describe roles, not stock-model mechanical shortcuts.
- Five-ability standard array `15, 14, 13, 12, 10` before degree/size modifiers; `con=null` (never 0 or 10). V2 must apply modifiers **once**. Final scores are cross-checks, not independent actor assignments.
- Droid degree governs behavioral inhibitors and traits. Validate against `droid-trait-rules.js` and the applicable RAW.
- V2 baseline heuristic processor, two physical hand appendages, and **size-default locomotion when selected** are free; changed locomotion is quoted. Do not trust the JSON's `costCredits`, `grantAuthority`, or `sourceDecision` as an authority.
- The authoring hardware ledgers total **1,000/1,000 credits** in local static reconstruction; this is **not** proof that V2 `quoteDroidBuild`, component source review, prerequisites, or installation host accepts them. **No class-credit overflow** or carry-forward construction budget.
- Weapons/ammunition/portable items are **external equipment** purchased from a separate preselected legal `3d4` first-class-credit roll. Preserve the **final net wallet exactly once**; never re-credit initial funds or double-charge equipment.
- No Jedi, no Force powers. Droid cannot qualify for Scout's Constitution-dependent Shake It Off; Noble Linguist is conditional on final INT. Automatic class grants are derived from V2, not inserted as extra general feats. One general feat and one class talent per profile, pending V2 validation. Optional Talent Wiki general-talent entitlement applies only when the GM setting enables it.
- Initial installation must use the **existing** `applyInitialInstallationToPlan` path and materialized installed-system ledger, with no stock-statblock double bonus.
- Pending certification remains in all source records. If any profile is refused by a canonical gate, **correct that profile selection**; do not bypass the gate or silently drop failed picks.

## Git/source authority and current runtime status

Authoring provenance is pinned to source commit `c8c1c4b121575e5848b8e06d940f734e19048bcb` on `feature/chargen-splash-prewarm`. This pinned value records the **rules/architecture snapshot used to author the profiles**, not the deployment commit for this staging package.

Current live loaders still use v2 JSON; no v3 compiler and no Foundry v13 production certification are provided by this data commit. Use the handoff for the planned integration. All sourcebook citations are research locators; compare the actual rules and official errata before certifying.

## Release gates (all must pass)

1. Structural schema, eight unique profile IDs, and 33 + 8 catalog routing with no record loss.
2. Canonical class/species/skill/feat/talent reference resolution and slot/grant/prerequisite validity; all unresolved selections block profile application.
3. Exact `quoteDroidBuild(droidSystems)` status `OK` and total `1000`; every grant, component/source review, prerequisite and installation-host gate satisfied.
4. External weapons/gear/ammo resolved through production V2 items, legal pricing/proficiency/availability, and **one** net wallet balance.
5. Initial droid ledger projected into same final mutation plan with stable IDs and no double bonuses; safe rollback on failed actor transaction.
6. Selection and explicit Apply/Profile Review behavior, persistence/back-forward/close-resume, no actor mutation before final confirmation, preview/final plan parity; regression suite across **all 41** profiles.
7. Live Foundry v13 certification and reviewed authorization to mark any profile as ready to play.

**No runtime source files are modified by this staging package.**
