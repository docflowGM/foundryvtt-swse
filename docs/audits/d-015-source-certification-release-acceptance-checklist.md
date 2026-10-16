# D-015 — Scope-pinned source certification review and later blocker-lift acceptance checklist

**Status: REVIEW PLAN ONLY.** D-015 is **still open**. This document is not a ledger edit, register resolution, `COMPLETE_MECHANIC` specification or authorization to install upgrades. No blocker lift is requested by inclusion here.
**Baseline inspected:** `main` commit `6ecbed3efcb020ce2b23963c2f207014ca32cfad`, after merged PR #1048.
**Source evidence pending independent acceptance:** `docs/audits/d-015-mechanics-complete-visual-source-reconciliation.md` (on the same draft research PR), superseding the missing-image limitation in the earlier `d-015-mechanics-requirements-source-examination.md`; Core pp. 60 and 68–70, S&V pp. 37–41. Owner's optional GM house-rule direction is separately recorded and is **not** a printed-source fact.

## A. Ledger scope to preserve exactly

| Constraint | Pinned baseline |
|---|---|
| Register entry | `D-015` |
| Blocking component | `installProcedure` |
| Register classification | `PENDING_SOURCE_VERIFICATION` |
| Number of typed definitions | **76** |
| Distinct parent definition IDs | **56** |
| Domain partition | Weapon **25**; armor **36**; equipment **15** |
| Published procedure already specified as *facts* | 76 `installProcedure` records in `data/modifications/specification-records-v1.json`, coverage `PUBLISHED_FACTS`, not `COMPLETE_MECHANIC` |
| Parallel blocker on those same 76 | `D-014` / `installProcedure`, independently open even after all six owner-policy answers |
| Main generator behavior | Remain `NOT_SELECTABLE` and `EXECUTOR_NOT_CERTIFIED`; D-015 research does not elevate `PUBLISHED_FACTS` into an executable mechanic |

This scope is copied from `data/modifications/status-ledger-v1.json` on the pinned baseline. **No names, partial matches or row counts from the Batch A research CSV are used as authority.** Validate the complete exact set from the live ledger again before any later lift PR.

## B. Printed evidence to approve in a later, separate certification review

1. **Core p. 68:** Mechanics is `Trained Only`, and its security-kit requirement is scoped to `Disable Device`.
2. **Core p. 69:** `Handle Explosives`, `Set Detonator`, `Place Explosive Device`, `Disarm Explosive Device` (security kit); **no** printed ordinary equipment-upgrade procedure.
3. **Core p. 70:** tool-kit requirement attaches to `Modify Droid` and `Repair` uses, not to every Mechanics check; Jury-Rig's optional equipment bonus is not a universal install bonus.
4. **S&V pp. 37–41, especially p. 39/Table 2-2:** ordinary installation/removal uses a Mechanics check, with no general tool-kit or workshop prerequisite; the descriptive workshop mention is not a facility rule. Source-specific host/accessory prerequisites remain independent.
5. **Core pp. 60, 70 + S&V p. 39:** in printed baseline, taking 10 is conditionally possible under Core circumstances; taking 20 is barred by the printed failure penalties on the ordinary installation/removal procedure.
6. **House-rule segregation:** GM-option records permitting taking 20, disallowing taking 10, or granting extra tool/workshop numeric bonuses are `OWNER_HOUSE_RULE` exceptions, **not** changes to the printed-source citation or to the status of a canonical installProcedure. The owner has not specified default modes or numeric bonuses.

The evidence review must cite the actual supplied PDF images (or authenticated published scans) and headings, not only the research author's conclusions. A transcription of a secondary wiki is not equivalent to the visually checked Core/S&V primary source.

## C. Exact typed-domain set affected (reference for verification, not an automatic lift)

### weapon — 25

- `sv-cloaked::weapon`
- `sv-electrograpple-handle::weapon`
- `sv-environmental-sealing::weapon`
- `sv-extra-power-source::weapon`
- `sv-miniaturized::weapon`
- `sv-recognition-system::weapon`
- `sv-remote-activation::weapon`
- `sv-secret-compartment::weapon`
- `sv-silverplate::weapon`
- `sv-spring-loaded::weapon`
- `sv-storage-capacity::weapon`
- `sv-bayonet-ring::weapon`
- `sv-bipod::weapon`
- `sv-double-trigger::weapon`
- `sv-ion-charger::weapon`
- `sv-missile-load::weapon`
- `sv-neutronium-reinforcement::weapon`
- `sv-overload-switch::weapon`
- `sv-pulse-charger::weapon`
- `sv-rangefinder::weapon`
- `sv-rapid-recycler::weapon`
- `sv-slinker::weapon`
- `sv-sniper-switch::weapon`
- `sv-targeting-scope-standard::weapon`
- `sv-targeting-scope-low-light::weapon`

### armor — 36

- `sv-cloaked::armor`
- `sv-environmental-sealing::armor`
- `sv-extra-power-source::armor`
- `sv-miniaturized::armor`
- `sv-recognition-system::armor`
- `sv-remote-activation::armor`
- `sv-secret-compartment::armor`
- `sv-silverplate::armor`
- `sv-storage-capacity::armor`
- `sv-aquatic-adaptation::armor`
- `sv-armorplast::armor`
- `sv-climbing-claws::armor`
- `sv-diagnostics-system::armor`
- `sv-environmental-systems::armor`
- `sv-gyro::armor`
- `sv-helmet-package::armor`
- `sv-holoshroud::armor`
- `sv-integrated-equipment-1-slot::armor`
- `sv-integrated-equipment-2-slots::armor`
- `sv-integrated-equipment-5-slots::armor`
- `sv-integrated-equipment-10-slots::armor`
- `sv-internal-generator::armor`
- `sv-jump-servos::armor`
- `sv-powered-exoskeleton::armor`
- `sv-radiation-shielding::armor`
- `sv-armor-rangefinder::armor`
- `sv-ready-harness::armor`
- `sv-repulsorlift::armor`
- `sv-shadowskin::armor`
- `sv-shadowskin-reflec::armor`
- `sv-shield-generator-sr5::armor`
- `sv-shield-generator-sr10::armor`
- `sv-shockweb::armor`
- `sv-vacuum-seals::armor`
- `sv-vacuum-seals-improved::armor`
- `sv-weapon-mount::armor`

### equipment — 15

- `sv-cheater::equipment`
- `sv-cloaked::equipment`
- `sv-dual-gear::equipment`
- `sv-electrograpple-handle::equipment`
- `sv-environmental-sealing::equipment`
- `sv-extra-power-source::equipment`
- `sv-memory-upgrade::equipment`
- `sv-memory-upgrade-advanced::equipment`
- `sv-miniaturized::equipment`
- `sv-recognition-system::equipment`
- `sv-remote-activation::equipment`
- `sv-secret-compartment::equipment`
- `sv-silverplate::equipment`
- `sv-spring-loaded::equipment`
- `sv-storage-capacity::equipment`

## D. Safe sequence for a **future independently authorized** D-015 source lift

1. Independent reviewer verifies the printed PDF pages and their applicability to S&V's fixed-upgrade-point Table 2-2 definitions, including Core p. 69 now available.
2. Confirm that printed-source research does not depend on the GM house-rule options, errata candidates, or an unverified bonus.
3. Compare this exact 76-member set to the **current** ledger, and confirm no scope drift; if changed, stop and re-reconcile before seeking a lift.
4. Prepare an **append-only D-015 source examination/resolution entry** with the actual certified evidence. Follow the existing register contract rather than rewriting the original question or smuggling policy into `SOURCE_VERIFIED` metadata.
5. Propose narrowly scoped ledger and/or pinned-scope lift changes using the repository's actual validator contract, under independent review and explicit authorization. Do **not** edit `data/audits/modification-rolling-authority-v1.5.json` (immutable G1 registry).
6. Rerun the G1 validator, G2 generator `--check`/`--validate`, modification tests and relevant rolling CI; assert that **only D-015** can change scope (never D-014, D-013 or D-005) and that all 232 typed IDs remain valid.
7. Assert all 76 remain `runtimeSelectable=false` while any other open blocker and missing host/effect/cost/implementation/Foundry validation gate remains. No G4–G9, workbench, loader or cutover in a D-015 source-lift PR.

## E. Rejection tests the reviewer should insist on

| Attempt | Expected result |
|---|---|
| Take-20 house-rule approval submitted as published `SOURCE_VERIFIED` evidence | **Reject**; mixed authority classes |
| Insert a universal +5 tool-kit bonus from Core Jury-Rig into the 76 | **Reject**; wrong skill use |
| Require a workshop for *all* installations because p. 39 uses the word “workshop” | **Reject**; narrative text is not a prerequisite |
| Allow untrained installer on the basis of an untrained `Aid Another` clarification | **Reject**; assistance is not installer skill qualification |
| Treat D-015 evidence as resolving D-014 deactivation, retry cost or failed-installation states | **Reject**; separate owner policies and unsolved mechanical work |
| Remove D-015 for 77 entries by also including conditional Retractable Stock | **Reject**; excluded from this 76; still D-004/D-013 |
| Alter another domain or a different book's rule due to a similar item name | **Reject**; only exact IDs and this printed procedure |
| Make any typed definition selectable after the source lift | **Reject**; other independent gates remain |

**Handoff:** Submit a separate, explicitly reviewed lift PR only after this **research** PR and primary source evidence have independent acceptance. Until then, the ledger, generator and runtime remain unchanged.
