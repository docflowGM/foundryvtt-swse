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

- 846 published groups; 557 SOURCE_VERIFIED (configuration established); **348 OFFLINE_EXECUTABLE on 256 vehicles** (123 vehicles have every group executable; each group counted once however many modes it supports) after the evidence-gate hardening that followed the P6C-2B correction and P6C-2C, each driven
  through arm -> attack -> damage by the CORPUS test; 0 LIVE_VERIFIED. See `stock-weapon-coverage.md`.
- Includes the X-wing laser cannons (6d10 x 2, pilot, +5), TIE fighter, TIE interceptor, Y-wing, ARC-170, YT-1300, AAT and others.
  The X-wing proton torpedoes stay reference-only (splash, finite payload).

## Firing arcs: owner ruling V-P6C-01 (2026-11-03)

Hierarchy: a published arc the system understands is enforced (the Ghtroc 720's fixed-forward double laser cannon, SotG p. 88);
a source-confirmed unstated arc imposes no automated restriction (the default, so X-wing and TIE cannons fire without GM
intervention); a stated arc the system cannot interpret is refused; unreviewed arc evidence is refused; aftermarket installations
keep their certified mount and arc. The world setting can switch unstated arcs to "GM approves each attack".

## What genuinely needs new mechanics (all recorded in the deferred register, P6B-D-033..039)

- Printed attack totals: explained for the 348 executable groups (crew BAB + Int; +2 on pilot-crewed groups = Core p. 171); the battery +2 per additional gunner is documented but batteries need their own model; about 50 single-operator groups stay unexplained.
- Weapon batteries: 102 printed batteries do not print their number of weapons (owner ruling V-P6C-02); multi-gunner stations that are not printed batteries; splash/ammunition groups; ion groups that are batteries or fail another gate; point-defense.
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

## P6C-2B: weapon batteries (2026-11-03)

Core p. 170 (rule text verified by the owner) is implemented once, as pure functions in `vehicle-weapon-battery.js`: +2 per
assisting gunner (2 gunners +2 ... 6 gunners +10); one extra weapon hits per full 3 points the attack roll exceeds Reflex
Defense (exactly Reflex, +2 over: none; +3: one; +6: two), capped by the identical weapons actually participating (never
more than six); each extra hit adds ONE weapon die to the dice BEFORE the multiplier ((5d10 + 2d10) x 5); a battery aiding
another battery rolls against Reflex 10 for +2 per two weapons and creates no margin hits.

Where it plugs in (no second engine):
- the stock gate reads a PRINTED battery ("battery (N gunners)" on a group the record marks as a printed weapon battery),
  requires the gunner count and the number of identical weapons to be printed and to agree, and requires the printed total to
  equal crew Base Attack + vehicle Intelligence modifier + 2 per assisting gunner exactly (basis `BAB_PLUS_INT_PLUS_BATTERY_ASSISTANCE`);
- generic (published) crew: the printed total already contains the assistance, so it is applied once and the assistance is
  shown as included (applied: false); range, the capital -20 and effects still stack on top;
- the attack roll computes the margin hits once (against Reflex) and carries them on the card's workflow context; the damage
  authority (`resolveVehicleWeaponDamage`) re-validates them against the weapons participating, adds the dice before the
  multiplier and refuses hits for any weapon that is not an established battery; a critical still doubles the total once;
- named gunners on a battery are refused (`BATTERY_ASSIGNED_CREW_ROSTER_UNMODELED`): crew assignment holds one actor per
  station and does not say which gunners assist which battery, and the bonus is never inferred from a displayed number.

Result: 104 published batteries print a gunner count; 2 also print the number of weapons (Krayt's Honor, p. 91; Rendili Light
Corvette, p. 102); 1 passes every gate and is OFFLINE_EXECUTABLE (Krayt's Honor turbolaser battery, 5d10x5, driven through
arm -> attack -> card -> damage by the P26 tests); the Rendili battery is refused only for its flank-turret arc. The other 102
are refused as `STOCK_BATTERY_WEAPON_COUNT_NOT_STATED` pending owner ruling V-P6C-02; this is NOT a 291-group unlock. Not
done and recorded: named-gunner rosters (P6B-D-043), battery-aids-battery runtime and independent firing (P6B-D-044, V-P6C-03).
Reroll note: a reroll supersedes the attack card (its Damage button is refused), so a stale margin outcome cannot be reused.

## P6C-2C: ion damage (2026-11-03)

Core pp. 159-160 (rule text verified by the owner) runs on the EXISTING damage authorities; there is no ion engine.

- Typing: a stock group is ion only when its SOURCE types the damage (the printed damage line "4d10x2 ion" or the structured
  evidence `damageType: "ion"`), read as the whole word (the old check also matched "concussion"). A name alone never types
  damage: the R-28's "medium ion cannons", whose damage line does not say ion, stay refused. The type travels from the source
  group through `resolveVehicleWeaponAuthority` / `resolveVehicleWeaponDamage` into the damage card (`damage.js`), so the Apply
  Damage packet is ion without trusting any Item field.
- Packet rules (`damage-packet-rules.js`): droid, vehicle, object and device targets, and creatures flagged cybernetic, take the
  ion packet (HP x 0.5, full rolled amount to the threshold); an ordinary organic takes the half-damage HP effect only.
- Threshold (`threshold-engine.js`): an ion hit that reaches the threshold moves the target 2 steps (`ION_THRESHOLD_CT_STEPS`);
  the Ion Shielding cap of one step now has a baseline to cap; ordinary and stun thresholds are unchanged.
- 0 HP (`damage-resolution-engine.js`): ion that reduces HP to 0 moves the target 5 steps and disables it (the droid state is
  `disabled`; a creature is unconscious) as ONE outcome: the 2-step shift is not added and the threshold destruction path does
  not also fire.
- Duplicate application: one `ActorEngine.applyDamage` writes HP and condition track once (tested). The EMP grenade's own
  `zero-hp-ct-disable` rider belongs to that weapon's records and is unchanged.
- Order as implemented: bonus HP, shield rating, damage reduction, HP damage x 0.5, threshold on the full ROLLED amount (before
  shields and damage reduction, unlike ordinary damage), then condition track. That ordering, ion at 0 HP that also reaches
  the threshold, the organic threshold basis and the two-step/optional-variant interplay are owner question V-P6C-04.
- AAT-1: "takes double damage from ion weapons" is preserved text on the only record that carries it; nothing is automated
  and nothing generalizes it (V-P6C-05).

Result: 69 groups are typed ion by their source; 32 are OFFLINE_EXECUTABLE (single-operator, plain, no other blocker); the others
are batteries (the same weapon-count refusal as every battery), unexplained attack totals, point-defense, ammunition or splash.

## P6C correction (2026-11-03): batteries and ion, per the owner's review of fc510fc

**Batteries (V-P6C-02).** The 2B model required a battery's gunner count to equal its weapon count. That is not in Core p. 170
("up to six identical weapons") and is removed. Weapon quantities (total, available, participating) and the gunners are now
independent, and neither is inferred from the other. A printed battery runs in up to two MODES, each its own owned Item,
one group counted once:
- FULL-BATTERY (assistance already inside the printed total + margin hits): needs the printed gunners AND the printed weapon count (1 group: Krayt's Honor turbolaser battery);
- INDEPENDENT-WEAPON (Core p. 170: a battery's weapons may fire independently without battery assistance): ONE weapon, no assistance, no margin hits, no weapon count needed; the printed total less exactly 2 x (gunners - 1), accepted only when that arithmetic reconciles. 64 printed batteries (63 independent-only) pass every other gate; the named-gunner roster is not needed for it, so a named gunner may fire it.
Fire-linked weapons that a statblock calls "batteries" are not weapon batteries in game terms (Starships of the Galaxy, Fire-Linked
Weapons): a group text-marked fire-linked is never given battery rules (none of the 104 printed batteries is).

**Ion (Core pp. 159-160, p. 137).** Corrected: an ordinary organic takes half hit-point damage and NO other ill effect (no threshold or
condition-track effect); a creature with cybernetic prosthetics (structured equipment tags `cybernetic` + `prosthesis`, or the per-attack
cybernetic class answer) takes FULL ion damage and the extra effects; droids, vehicles, devices and objects take half and the extra effects.
The AAT-1's double ion damage is read from its source record by a vulnerability authority and recorded, not applied. Shield rating is
applied before damage reduction (Core); the order of the ion threshold comparison against them, and an ion hit that both reaches 0 HP
and the threshold, are reported on the result as unsettled (`ionRuleDeferred`, V-P6C-04). 43 ion groups are OFFLINE_EXECUTABLE (31
single-operator + 12 batteries as one independent weapon; the Subjugator's area ion pulse cannons are refused, see the next section).

## Gate hardening found during P6C-2D (2026-11-04): 356 -> 348 executable groups

The audit for launchers and ammunition showed that the stock gate read the damage line of each group but not the group's
structured source evidence. Eight groups that were counted executable carried evidence for a mechanic the runtime does not
model, and are now refused by name (the correction is stated plainly, as the 274 -> 230 one was):
- Subjugator-class Heavy Cruiser "ion pulse cannons" (9d10x10): a 5-square area weapon with hit, miss and recharge rules (STOCK_DAMAGE_AREA_OR_SPLASH);
- Belbullab Heavy Starfighter "Belbullab-22" and "Belbullab-23/24" triple laser cannons: groups that apply to only some variants (STOCK_VARIANT_SPECIFIC_GROUP_UNMODELED);
- Scurrg H-6 forward-mounted laser cannons: a qualitative direction the source calls "not a fully defined firing arc" (STOCK_FIRING_ARC_STATED_UNPARSED, per the V-P6C-01 hierarchy);
- Aurek Tactical Strikefighter, Conductor-class Landing Craft, Herald-class Shuttle, Ministry-class Orbital Shuttle: special attack notations the gate does not model (STOCK_SPECIAL_ATTACK_NOTATION_UNMODELED; the Herald group also carries an unreconciled size-dependent figure).
The evidence object is now read as a whole: informational and handled keys pass; a key that carries an unmodeled mechanic refuses; a key the gate has never seen refuses
(STOCK_EVIDENCE_UNMODELED); null figures mean "the source states nothing" and refuse nothing. A test pins the invariant over the whole corpus.

## P6C-2D: launchers and ammunition (2026-11-04) - no family is enabled

The weapon kinds the source distinguishes are now reported apart (overlapping, never summed): ordinary energy weapons, printed weapon
batteries (104; 64 executable), fire-linked weapons (18; 7 executable: they are not batteries and get no battery rules), ammunition-limited
launchers (169; 0 executable), area / splash weapons (110; 0 executable) and ion (69; 43 executable).

A finite-ammunition family needs every one of these, and none exists yet:
1. Area / splash damage for vehicle weapons: the Core prints "4-square splash" for concussion missiles and proton torpedoes, and the
   record's structured evidence states it for 102 of the 169 groups (the damage line alone missed many); a hit without splash would drop a published mechanic.
2. The Core "Missiles and Torpedoes" rule: aiming locks the weapon on; a missed missile or torpedo attacks again on the next turn at -5 and then self-destructs; it has Reflex 30 and 10 HP and can be shot down.
3. An ammunition ledger. The existing `AmmoSystem` is gated on the optional `trackBlasterCharges` house rule (off by default => unlimited), so it cannot be the authority for a finite vehicle supply. The Core statblock "Payload" is "the vehicle's complement of grenades, rockets, missiles, and torpedoes"; a launcher's loaded capacity is a different, separately printed figure (Starships of the Galaxy pp. 45-46: light 6, medium 16, heavy 30, proton torpedo 3, shieldbuster 4, mines 6); only 24 groups print a payload at all.
4. A reload rule for vehicle launchers: the Core gives one only for personal launchers (a full-round action), and spending when the vehicle carries fire-linked launchers (one shot per linked launcher, SotG Fire-Linked Weapons) needs the launcher count.
Registered as deferred items P6B-D-047 (lock-on), P6B-D-048 (vehicle area damage), P6B-D-049 (ledger, payload versus capacity, reload) and owner question V-P6C-06. 33 groups are refused for ammunition alone; they stay refused because enabling one without 1-4 would either spend wrongly or drop mechanics.

## P6C-3A: ion pipeline per the approved ordering (2026-11-04)

Implemented as PROJECT_INTERPRETATION (V-P6C-04, V-P6C-05; decision matrix: `ion-damage-decision-matrix.md`):
- the ion threshold is compared to the full amount that survives shield rating and damage reduction, before the hit-point halving (the
  packet no longer carries a raw-amount override; the shield-less, DR-less case is unchanged);
- the damage TYPE stays ion for every target. An ordinary organic keeps its ion identity (type-specific protections, reporting and
  effects still see ion damage); only the ion special effects are switched off (`ionEffectsApply: false`, threshold effects suppressed);
- at 0 HP the specific ion disable (-5 steps, disabled/unconscious) governs the generic destroy rule for an ion-only hit, with no extra -2;
- the AAT-1's published x2 (Core p. 176) is applied once through `damage-vulnerability-authority.js` to the incoming ion damage before
  shield rating, damage reduction and halving: 40 -> 80 -> DR 15 -> 65 kept -> HP 32; 65 vs threshold 33 -> -2 steps. No vehicle name is tested;
  only a digest-verified source record carries the vulnerability;
- a hit that exercises an interpretation reports it in `result.projectInterpretations`.
The R-28's "medium ion cannons" stay refused: the damage line is untyped and canonical evidence is not edited (see the matrix).

## Battery Aid Another (2026-11-04) - ordinary single-aid case implemented

PUBLISHED_RULE (Core p. 170, Aid Another): a standard action that benefits an ally's NEXT attack roll; a gunner aids by making an
attack against Reflex Defense 10. For a battery assisting a battery: +2 per complete pair of the ASSISTING battery's weapons (an
incomplete pair gives nothing), no margin hits from the aid, consumed once, no end-of-round expiry.
- `vehicle-battery-aid.js` (pure) plans and describes the aid; `vehicle-battery-aid-service.js` runs it: the standard action through
  `ActionEconomyConsumption` (rolled back if anything fails), the aid roll through the attack outcome resolver (natural 1 / 20 as for
  every attack), one pending record written on the aided battery's vehicle through `ActorEngine`.
- The attack ledger adds a `battery-aid` entry to the aided battery's next attack roll (preview included) and `attacks.js` consumes it
  once after that attack's card is posted (hit or miss); a refused attack leaves it pending; the aid never reaches the assisting battery,
  the same group's independent weapon, or the aid roll itself.
- Refused, by name: a battery aiding itself, an independent weapon as assisting/aided weapon, a second pending aid on the same battery
  (stacking is SOURCE_UNRESOLVED), an incomplete pair, a named gunner on the assisting station, a user who may not operate the vehicle.
- Limits: the published corpus has ONE full battery, so no published ship can use it yet (tests use a synthetic two-battery fixture whose
  record digest verifies; Item sync would reject it by design, so the test builds its Items with the sync's own builder); no sheet button is wired (P6B-D-044).
