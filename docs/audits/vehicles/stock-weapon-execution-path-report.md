# Stock weapon execution path: what blocked published weapons, and what changed

Scope: the factory weapon groups of the 429 published vehicles. Two provenance paths now feed ONE combat runtime:
**installed** (certified aftermarket, sealed Shipyard ledger) and **stock** (published, derived from the digest-verified
record). Stock weapons never pass through the ledger, EP or credits and are never converted into installations.

## The chain, and where a stock weapon was stopped

| Step | Authority | Before | Now |
|---|---|---|---|
| Source data | canonical record `armament.firingGroups` | label, printed attack total and free-text notes; no structured damage/operator; arcs not stated | unchanged (records are protected); parsed by a strict reviewed parser (`vehicle-stock-weapon-groups.js`) that refuses what it cannot read |
| Owned weapon Item | `createActor` / Resync | none created ("firing groups are reference evidence") | executable groups are armed as managed Items at import (`armStockWeaponsOnCreate`) or by **Resync weapons**; Items only represent the source group |
| Provenance | `vehicle-attack-provenance.js` | any source-backed weapon without a ledger entry was UNRESOLVED | stock Items classify as `STOCK_CANDIDATE` |
| Trust | `vehicle-stock-attack-authority.js` | always `null` (empty registry) | re-derived at each use from the verified record: group present and executable, Item mirrors it |
| Preflight | `vehicle-attack-preflight.js` | blocked (no trust) | user permission, target, crew station, arc policy (below) |
| Crew station | `vehicle-crew-station-evidence.js` | read editable Item fields | operator taken from the source group |
| Attack math | `vehicle-attack-math.js` | generic crew used an unsourced tier table (skilled +5) | a stock weapon's **printed total is the baseline, applied once** (its components are shown as included, never added again); aftermarket generic-crew attacks on published ships use the published crew Base Attack; range, capital penalty and effects stack on top |
| Damage | `combat-roll-math.js` | printed `6d10x2` string would reach the dice engine (Foundry reads `x2` as exploding dice) | Core formula `(6d10) * 2` from the source group, never the Item |
| Applying damage | `ActorEngine.applyDamage` | unchanged | unchanged (existing authority, exercised by the test) |

## Result (offline; nothing is live-verified)

- 846 published groups; 466 SOURCE_VERIFIED (configuration established); **260 OFFLINE_EXECUTABLE on 232 vehicles** (110 vehicles have every group executable) after P6C-2A, each driven
  through arm -> attack -> damage by the CORPUS test; 0 LIVE_VERIFIED. See `stock-weapon-coverage.md`.
- Includes the X-wing laser cannons (6d10 x 2, pilot, +5), TIE fighter, TIE interceptor, Y-wing, ARC-170, YT-1300, AAT and others.
  The X-wing proton torpedoes stay reference-only (splash, finite payload).

## Firing arcs: owner ruling V-P6C-01 (2026-11-03)

Hierarchy: a published arc the system understands is enforced (the Ghtroc 720's fixed-forward double laser cannon, SotG p. 88);
a source-confirmed unstated arc imposes no automated restriction (the default, so X-wing and TIE cannons fire without GM
intervention); a stated arc the system cannot interpret is refused; unreviewed arc evidence is refused; aftermarket installations
keep their certified mount and arc. The world setting can switch unstated arcs to "GM approves each attack".

## What genuinely needs new mechanics (all recorded in the deferred register, P6B-D-033..039)

- Printed attack totals: explained for the 260 executable groups (crew BAB + Int; +2 on pilot-crewed groups = Core p. 171); the battery +2 per additional gunner is documented but batteries need their own model; about 50 single-operator groups stay unexplained.
- Batteries and multi-gunner stations (291), splash/ion/ammunition groups (142), point-defense.
- 12 groups on records with no arc evidence; 5 groups with arcs the system cannot yet interpret.

## Also fixed along the way

- The vehicle sheet's weapon panel never listed owned weapon Items on a live actor (`items` is a Foundry Collection, not an Array).
- Autofire/burst requests are refused for vehicle-managed weapons (their printed vehicle autofire bonuses are not automated).
- Generic-crew attacks used an unsourced tier table; source-backed and constructed ships now use verified crew Base Attack.

## Correction (2026-11-03)

The first push of the printed-total work (8f88c34) counted 274 executable groups. About 45 of them were finite-ammunition
weapons (concussion missiles, proton and shieldbuster torpedoes, mines) and one ion cannon, which have no magazine or
ion-versus-vehicle authority. They are now denied by wording (a name can only deny, never authorize): the executable set is
**230 groups on 207 vehicles**, all laser, blaster and mass-driver cannons. Copilot-operated groups were added (11).

## P6C-2A: ordinary damage closure (2026-11-03)

Owner ruling: an omitted multiplier is x1 (a valid vehicle weapon, not a personal weapon; no x2 is invented). Any printed
`xN` multiplier (x1, x2, x5, x10...) is read by the one damage authority (`resolveDamageComposition` / `buildDamageFormula`),
which emits `(NdM) * N`; Foundry never sees `xN` as exploding dice. Critical handling doubles the composed total once and adds
no second multiplier. The capital-scale attack penalty (-20, Core p. 171) and the point-defense exceptions are untouched.

The previous blanket "capital-scale x5 damage" refusal is removed. Replacing it is a consistency check: a size-dependent figure
on a capital ship is accepted only when the verified figure equals the printed one minus the 20 attack penalty. Groups that
still carry other unsupported mechanics (finite ammunition, splash, ion, battery staffing, point-defense, unexplained attack
totals) stay refused for those reasons; the removed refusal only unlocks groups that had no other blocker.

Newly executable examples: BARC speeder twin light blaster cannons (5d10), SPHA-T heavy turbolaser (7d10 x5),
Munificent-class heavy turbolasers (11d10 x5), Venator medium double turbolasers (6d10 x5), Lancet proton beam cannon (6d10 x5).
