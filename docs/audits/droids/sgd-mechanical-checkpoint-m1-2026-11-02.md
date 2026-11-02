# SGD Mechanical Certification — M1 Partial Checkpoint (2026-11-02)

## Authority boundary

This work certifies **published source mechanics independently of Foundry runtime**. Mechanical certification is permissible before merge when complete, independently validated source evidence and legal mechanic identity/ownership exist. Runtime implementation is handled separately by Claude, and live Foundry V13 verification is deferred until changes are committed and merged. **Runtime not tested is not, by itself, a mechanical certification blocker.**

No replacement compendium, production pack, or active actor/vehicle mutation is authorized in this checkpoint.

## Verified baseline and totals

| Dimension | SGD | 14-book project |
|---|---:|---:|
| Published identities/source records | 46/46 | 234/234 |
| Selected PDF field comparisons, prior audit | 811 | 3,615 |
| Newly source-mechanically certified | 0/46 | 0/234 |
| Foundry runtime verified | 0/46 | 0/234 |
| Mechanically complete books | 0 | 0/14 |

The exact SGD identity set was compared with the frozen publication census before mutation. SGD contains 45 droid-character presentations and one vehicle-format source (DP-2, SGD-DROID-008). No claim identities changed.

## M1 completed audit correction

Commit `c63215f52ec46068e9702358bcf7da2cbda0c4c5`, verified by GitHub content readback:

- `SGD-DROID-001`, 8D Smelter Droid, printed p.68 / PDF p.69: retain the normal Fortitude Defense 14 and separately describe the printed conditional Fortitude 24 against fire and extreme heat. This is not a blanket resistance or always-on defense. Correct printed claw dice OCR from `ld4` to `1d4`. Execution remains source-only.
- `SGD-DROID-002`, A9G-Series Archive Droid, printed p.70 / PDF p.71: record unresolved **action-economy contradiction** between the Archive Processor prose (full-round action) and protocol representation (two swift actions, once per turn). No action grant or arbitration. Add the explicitly named code cylinder and 20-memory-unit storage device as possessions with factory-versus-example status unknown.

Both remain `mechanicalStatus: partial`; no unsupported runtime permissions or feat grants were added.

## Finite SGD gap matrix (current ledger inspection)

| Category | Missing/incomplete | Next certification action |
|---|---:|---|
| `anatomy`, `processor`, `programming` | 46/46 each empty | Establish from complete printed model and source rules; preserve unknown children |
| `equipment` | 45/46 empty after M1 | Distinguish factory installed systems, held possessions, and optional loadouts |
| `modifications`, `capacity`, `vehicleLink` | 46/46 each empty | Populate source-proven values; link DP-2 to vehicle authority, no duplicate actor |
| `progression.classes` structured | 46/46 absent | Resolve class levels and legal feat/talent identities without granting runtime effects |
| `systems` only raw text | 45/46 | Map each verified component to canonical part/ownership authority |
| `movement` only raw text | 37/46 | Resolve modes, transformations, movement restrictions; preserve speed zero |
| Printed attack rows marked source-only | 133 rows | Authenticate weapon, integrated mount, attack choice and predicates |
| Conditional rule claims marked source-only | 82 before M1 | Reconcile source conditions, triggers and legal effect/permissions; M1 added the separately documented conditional defense |

These are *overlapping incompleteness indicators*, not claims that source pages have never been examined.

## Specific blockers

- `SGD-DROID-002`: unresolved Archive Processor action-cost source contradiction (M1).
- `SGD-DROID-026`: preexisting unresolved MK-Series degree conflict, primary statblock 2nd versus protocol 3rd (p.118).
- `SGD-DROID-008`: vehicle-primary DP-2 must link to canonical vehicle source identity without duplicating HP, movement or attacks.
- Wheeled transformation, multiple mounted weapons, explicit attack alternatives, tactical components and shield/vehicle repair abilities must be independently checked before certifying associated records.
- 30 factory models labeled hero-eligible and 16 prohibited in draft source evidence. Eligibility does not itself confer all PC construction options.

## Next mechanical certification sequence

1. Independently reconcile 8D and A9G full primary/protocol text and all printed subsystem/equipment facts; record complete source-backed fields and all exclusions.
2. Resolve source-only attributes into existing canonical feat, talent, equipment, component and vehicle identities.
3. Assert exhaustive schema + null evidence, original publication parity, and positive/negative mechanical acceptance fixtures.
4. Certify an individual droid's **source mechanics** only after those gates pass; otherwise retain `partial` or `blocked`.
5. Continue IDs 003–046, checkpoint each verifiable tranche, without waiting for Foundry runtime implementation.

**Tests actually performed in M1:** GitHub baseline compare; 46-ID source/census parity assertion; no-certified-count assertion; exact mutation readback. **Not performed:** full JSON Schema run; independent end-to-end mechanical test suite; Foundry runtime. Do not claim either.
