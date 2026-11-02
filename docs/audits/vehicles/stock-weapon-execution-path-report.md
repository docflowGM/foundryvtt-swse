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
| Attack math | `vehicle-attack-math.js` | generic crew used an unsourced tier table (skilled +5) | source-backed ships use the **published crew Base Attack**; reproduces the printed total |
| Damage | `combat-roll-math.js` | printed `6d10x2` string would reach the dice engine (Foundry reads `x2` as exploding dice) | Core formula `(6d10) * 2` from the source group, never the Item |
| Applying damage | `ActorEngine.applyDamage` | unchanged | unchanged (existing authority, exercised by the test) |

## Result (offline; nothing is live-verified)

- 846 published groups; 446 SOURCE_VERIFIED (configuration established); **62 OFFLINE_EXECUTABLE on 51 vehicles**, each driven
  through arm -> attack -> damage by the CORPUS test; 0 LIVE_VERIFIED. See `stock-weapon-coverage.md`.
- Includes the X-wing laser cannons (6d10 x 2, pilot, +5), TIE fighter, TIE interceptor, Y-wing, ARC-170, YT-1300, AAT and others.
  The X-wing proton torpedoes stay reference-only (splash, finite payload).

## The one decision that blocks play: V-P6C-01 (firing arcs)

Published statblocks never state weapon firing arcs. The existing policy only lets an arc-dependent attack proceed on a
source-silent arc with a per-attack GM adjudication, and the Fire action carries none. Until the owner rules, the stock
weapons are armed but blocked. The world setting **Published vehicle weapons: unstated firing arcs** selects
`GM approves each attack` (default, fail-closed) or `No arc restriction`. Targets, crew, permissions, autofire refusal and
every other check apply either way.

## What genuinely needs new mechanics (all recorded in the deferred register, P6B-D-033..039)

- 564 groups print an attack total the Core formula does not reproduce (unexplained modifiers): source check needed.
- Batteries and multi-gunner stations (291), capital-scale x5 damage (192), splash/ion/ammunition groups (142), point-defense.
- 345 groups on records whose arc was never reviewed.

## Also fixed along the way

- The vehicle sheet's weapon panel never listed owned weapon Items on a live actor (`items` is a Foundry Collection, not an Array).
- Autofire/burst requests are refused for vehicle-managed weapons (their printed vehicle autofire bonuses are not automated).
- Generic-crew attacks used an unsourced tier table; source-backed and constructed ships now use verified crew Base Attack.
