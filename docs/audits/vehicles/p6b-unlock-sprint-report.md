# P6B mechanical-unlock sprint report

Branch `audit/universal-vehicles-phase1`, PR #1092 (draft, unmerged). Starting HEAD `1e1c5f1`. Offline only:
nothing here is LIVE_RUNTIME_VERIFIED. The 429 canonical published vehicle identities are unchanged.

## Owner rulings applied

- **V-P2-04:** a GM may certify the mount and firing arc of a newly installed weapon. This is stored as
  `GM_ADJUDICATED` (GM id, time and reason), never as printed evidence.
- **V-P6B-02:** 1 t = 1,000 kg and 1 week = 7 days. Months and years use a project convention of 30 and 365 days,
  which is not a published rule. Extended range adds 10% of the original duration, rounded down in days, at least
  1 day, and never compounds.

## Counts (catalog 187)

| Status | Sprint start | Now |
|---|---|---|
| MECHANIC_SPECIFIED / installable | 54 | 57 |
| Operationally integrated (offline) | 51 | 54 |
| Combat-usable weapons | 0 | 3 (laser cannon light / medium / heavy) |
| Hulls with convertible cargo / consumables | 215 / 114 | 398 / 393 |

## Delivered

| Priority | Commit | What works now |
|---|---|---|
| 1 Unit conversions | f878c2e | Cargo pods on kg-printed hulls; extended range on week/month/year hulls; 67 annotated hulls refused one by one |
| 2 First working weapon | a34c4ef | Laser cannons end to end: certified spec, GM-certified mount (Shipyard dialog), sealed executable entry, owned Item synced through ActorEngine, user permission, arc/target/station preflight, vehicle attack math (crew BAB + vehicle Int + range), Core damage (dice x multiplier) |
| 3 Launcher groundwork | c1ce9c9 | Printed standard capacities (6/16/30, 3, 4, 6); expansion recorded but deferred (V-P6A-03) |
| 4 Accessory checks | this commit | Escape pods, medical suite and passenger capacity checked against the text: they need rulings V-P6B-05 and V-P6B-06. The 25 *Scum and Villainy* effect strings can't be verified from the OCR. |

## Defect fixed along the way

The printed vehicle damage strings (`3d10x2`) reached the dice engine unchanged. Foundry reads `x2` as "explode on
a 2", so any vehicle weapon Item using them rolled wrong. Installed vehicle weapons now use the Core formula
`(3d10) * 2` in the single damage composition authority.

## Not done, and why

- **Weapons on frigate-size or larger hulls:** Core gives those ships -20 against targets smaller than Colossal.
  That penalty has no runtime consumer yet, so installs on those hulls are refused (P6B-D-023).
- **Turbolasers, blaster cannons, ion cannons:** each depends on a rule not yet covered: the capital-ship penalty, an
  unreadable starship-scale range cell, and ion-versus-vehicle damage (P6B-D-023, -025, -026).
- **Pilot +2 with pilot-crewed weapons:** the Core text is partly unreadable in the OCR. This gap predates the
  sprint and affects named pilots only (P6B-D-024).
- **Launcher loading and expenditure:** no launcher attack path exists yet (P6B-D-032).

## Decisions for the owner (unlock order)

1. V-P6B-04: is laser cannon damage typed (energy) or untyped?
2. V-P6B-05: escape pod size restriction, prose versus table.
3. V-P6B-06: "size modifier" in the medical suite and passenger formulas.
4. V-P6A-03 (expansion only), V-P6-01, V-P6-02, V-P6B-01, V-P6B-03: unchanged.

Engineering unlocks that need no ruling: the capital-ship -20 component (lifts the frigate+ refusal and allows
turbolasers), a PDF check of the blaster cannon ranges and the Pilot +2 wording, and the ion damage audit.

## Live V13 checklist additions

- A GM certifies a laser cannon mount and installs it. Confirm the weapon Item appears, the pilot fires inside the
  arc, a shot outside the arc is blocked, a non-owner is refused, and damage rolls `(3d10) * 2`.
- Uninstall the cannon and confirm the Item is removed.
- Cargo pod on an X-wing (kg cargo); extended range on a YT-1300 (2 months = 66 days with one installation).
