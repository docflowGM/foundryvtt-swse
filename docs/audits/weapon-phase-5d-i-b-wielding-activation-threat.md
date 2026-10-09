# Phase 5D-I-B — Wielding, activation state, threat / reach, host state

Branch `audit/weapon-phase-5d-i-b-wielding-activation-threat`, created from merged `main` (`edfa42941f3eaad9d232d64dbe5f38a32f072e8b`, the #1014 merge). One draft PR against `main`. 5D-I-C / I-D are **not** started here.

## 1. #1014 merge and I-B baseline
- 5D-I-A (#1014) merged into `main` as `edfa42941f3eaad9d232d64dbe5f38a32f072e8b` (normal merge commit). I-B baseline SHA = that commit. Rolling suite on the merged main: **334 passed / 0 failed / 5 documented exclusions**.
- Remote deletion of merged branches still fails with `remote end hung up unexpectedly` (recorded since 5D-G; manual cleanup).

## 2. Scope and authority
Executions that depend on **persistent owned-weapon state**: hands / wielding, configuration, mounted / detached, stock state, persistent activation (Retrosaber, Dual-Phase, Interchangeable Weapon System), usage limits (Venom Spit), crew state, threat / reach, attack-of-opportunity eligibility, loaded payload delegation.

No new registry, store or ledger. Owned state is the existing `flags.swse.fireState` of the owned Item, written through `FireStateStore` → `ActorEngine.updateOwnedItems`. The canonical registry is never written at runtime and stores no mutable state. New pure rule modules live inside `scripts/items/weapon-runtime/`:
- `owned-state.js` — hands resolution, reach resolver, AoO eligibility, state-machine / usage-ledger / crew-record rules, `ownedStateStep` (pure; returns the actions to spend and the blockers).
- `activation-requirements.js` — evaluates a selected profile's structured `activationRequirements` (`true` holds / `false` illegal / `null` unobserved → asked once, stored).

State validation order at the attack: resolve identity / profile → read owned state → validate profile, configuration, wielding → proficiency / feat / crew / usage → choices (AoO choice, hands) → preflight actions and resources → roll → spend. Nothing is spent until every illegal state has been found. The chosen / resolved state (profile, configuration, hands, AoO choice, reach, loaded payload, machine state) is written into the workflow context and survives the chat → damage round trip (`combat-context-serializer.js`).

## 3. Input manifest (evidence, not authority)
`tools/census-weapon-phase-5d-i-b-inputs.mjs` (`--check`) → `data/audits/weapon-phase-5d-i-b-input-manifest.json`; ledger `tools/lib/weapon-phase-5d-i-b-ledger.mjs` (data only; no runtime module imports either). The mandatory set is verified equal to the 17 I-B-owned rows of the I-A manifest.

| counter | value |
|---|---|
| MANDATORY_I_B_INPUT_KEYS | 17 |
| ADDITIONAL_SIBLING_KEYS_REVIEWED | 40 (reach-and-threat, crew-and-emplacement, configuration-and-wielding) |
| ADDITIONAL_SIBLING_KEYS_CONSUMED | 25 |
| IMPLEMENTED | 23 (mandatory 12) |
| DUPLICATE | 18 (mandatory 4) |
| DATA_DEFECT | 0 |
| DATA_COMPLETENESS | 0 open (closed by source-certified amendments, §8) |
| BLOCKED_BY_SUBSYSTEM | 12 (mandatory 1) |
| DEFERRED_WITH_EXPLICIT_OWNER | 4 |
| **I_B_UNCLASSIFIED_KEYS** | **0** |

### 17 mandatory keys
| key | disposition | resolution |
|---|---|---|
| attackOfOpportunityChoices | IMPLEMENTED | Siang Lance choice → profile (structured map added, §8); asked once or refused; persisted |
| canMakeAttacksOfOpportunity | IMPLEMENTED | weapon-declared capability widens the Core base rule (Siang Lance, mounted Vibrobayonet) |
| canMakeAttackOfOpportunityEvenWithStockExtended | DUPLICATE | Core AoO rule: a carbine can always (§5) |
| canMakeAttacksOfOpportunityWithoutFoldedStock | DUPLICATE | same |
| detachedTreatAs | DUPLICATE | `configurationResolution.detached` delegates to the canonical Vibrodagger profile (Bayonet gained it by amendment) |
| unregulatedAttackPenalty | IMPLEMENTED | E-Web: −2 unless a second crewman regulated; observed from the stored round adjudication else asked once |
| hurledObjectDamageRule | BLOCKED_BY_SUBSYSTEM (owner I-C) | Tractor Beam needs a grabbed-object model; object size is never invented |
| twoHandedDamageChoice | DUPLICATE | Long-Handle: the structured profile pair wielding two-handed + choice forgo-double-Str, executed (§6) |
| damageTypeAndBurstDeterminedByGrenade | IMPLEMENTED | delegation to the loaded canonical grenade (§7) |
| activationRequirements.action | IMPLEMENTED | persisted activation costs (Retrosaber state machine, Dual-Phase / Interchangeable settings, configuration switches) |
| activationRequirements.choice | IMPLEMENTED | AoO choice profile legal only for an AoO; forgo-doubling by selecting its profile |
| activationRequirements.configuration | IMPLEMENTED | already consumed by 5D-B; the OWNED configuration is now remembered, switching pays its `transitionAction`, an unusable configuration refuses |
| activationRequirements.feat | IMPLEMENTED | by canonical feat identity (§4) |
| activationRequirements.operators | IMPLEMENTED | Battering Ram: two operators; definite "no" refuses, unobserved is asked once |
| activationRequirements.proficiency | IMPLEMENTED | Amphistaff whip Pin / Trip via the canonical proficiency resolver |
| activationRequirements.usage-limit | IMPLEMENTED | Venom Spit ledger (§9) |
| activationRequirements.wielding | IMPLEMENTED | hands are the wielder's choice (§6) |

## 4. Long Haft Form — source reconciliation (not guessed)
**Source evidence (Jedi Academy Training Manual)**
- Weapon entries, p.53 (Long-Handle Lightsaber and Lightsaber Pike): *"a character with the **Long Haft Form** feat (see page 23) can use the … as a double weapon"*.
- Page 23 feat heading: **Long Haft Strike**. Benefit: *"When you use a lightsaber pike or a long-handle lightsaber, you can attack with both ends of the weapon, treating it as a double weapon."*
- No feat named "Long Haft Form" exists in the certified feat corpus or on page 23; Long Haft Strike is the only feat there.

**Classification: published internal name mismatch.** The weapon entries carry an explicit pointer ("see page 23") to the one feat on that page, the benefit text names exactly these two weapons and the same double-weapon effect, and no other candidate exists. They are therefore one canonical ability cited under two printed names, not two abilities.

**Runtime.** The `haft-end` profile's feat requirement is the canonical feat identity `feat::…::p23::long-haft-strike`; "Long Haft Form" is recorded as a `printedNameAliases` provenance entry on the feat. Execution uses the canonical identity only, never either display string: a feat with a decoy printed name or another canonical identity is refused; a renamed label that carries the canonical identity works; a legacy feat with no canonical identity still falls back to its real name (existing documented legacy fallback). The evidence is stored in the amendment log (`postCertificationAmendments`: book, page, quoted text). No other feat was substituted.

## 5. Attacks of opportunity — the Core rule
Eligible: a melee weapon, a natural weapon, a pistol, a carbine (stock extended or folded), a folded-stock rifle-class weapon, and unarmed attacks only with Martial Arts I (existing feat rule, now using the same list). An ordinary rifle with an extended stock is refused before anything is spent. The four carbine operation flags are `DUPLICATE_OF_CORE_AOO_RULE`: eligibility and the attack are identical without them (tested). A weapon-declared `canMakeAttacksOfOpportunity` only widens the base rule (Siang Lance, mounted Vibrobayonet).

Siang Lance (Rebellion Era Campaign Guide p.50): an AoO makes the wielder choose the ranged shot or the affixed bayonet; each choice names its attack profile through the structured `attackOfOpportunityProfiles` map. The choice is asked once (or taken from the roll options) and persisted into the workflow, so damage uses the chosen profile.

## 6. Wielding, reach, Long-Handle
- **Hands** = the wielder's choice. Precedence: attack option → owned state → a weapon that requires two hands. Canonical data only constrains legality (`requiresTwoHands` Garrote, `cannotWieldTwoHanded` / `cannotBeWieldedTwoHanded` lightfoils). An impossible wielding refuses before any cost. Hands never derive from size (size-derived wielding is I-D).
- **Two-handed damage**: a two-handed melee attack doubles the Strength bonus (not for light weapons); the choice and hands persist.
- **Long-Handle Lightsaber**: the 2d10 base profile requires two-handed wielding *and* the choice to forgo doubling Strength. Selecting it is the choice (2d10 + one Str, never doubled); the default two-handed profile doubles Str. One-handed with the forgo profile is refused.
- **Reach** (`resolveReach`): one resolver for the SELECTED form — weapon-wide bonus (the two spellings echo one fact and are never summed), absolute whip reach only for its profiles, the extended setting's bonus only while its profile is selected, Wan-Shen only assembled. No names. Pike reach comes from this resolver.

## 7. Activation, configuration, host and crew state
- **Configuration** (Amphistaff quarterstaff / spear / whip, Wan-Shen, Targeting Blaster Rifle, Snap Baton): the owned configuration is remembered; switching pays the configuration's published `transitionAction` once; an attack that names nothing uses the owned form; an unpayable switch writes nothing; `attackUsable: false` (disassembled) refuses; `attackUsable` unstated (collapsed Snap Baton) is **not** read as false.
- **Persistent settings**: Dual-Phase blade (swift per switch) and Interchangeable Weapon System (standard per switch, default mode free) persist across rounds and combats and are never repaid at damage.
- **Retrosaber**: the certified state machine runs on the combat clock — swift dial-up in round *r*: overcharge *r…r+1*, one locked burnout round *r+2*, normal from *r+3*. Locks are evaluated before declared transitions. Nothing is persisted out of combat (no clock invented).
- **Stock state**: `setStockState` costs the published move action; an unchanged state is free; unknown states are refused.
- **Detached host weapons**: the Vibrobayonet / Bayonet `detached` configuration resolves through `configurationResolution` to the canonical Vibrodagger / Knife profile (damage differs from the mounted blade; the mounted profile is unavailable while detached).
- **Crew**: E-Web mounted state and generator regulation are asked once and stored on the owned weapon (regulation per combat round; no combat → nothing stored); an observed record is used without a prompt; Battering Ram needs two operators (definite no refuses, unobserved asked once). Tactical Tractor Beam shares the crew-regulation fact; its hurled-object damage stays BLOCKED.
- **Grenade Launcher** (`damageTypeAndBurstDeterminedByGrenade`): damage, damage type, burst and effects come from the loaded canonical grenade (owned `loadedIdentityKey` or the attack's explicit choice); the launcher keeps its own range, proficiency and cost. A Thermal Detonator (`cannotFireThermalDetonators`), a non-grenade and a payload outside the accepted family are refused with nothing spent; no loaded identity leaves damage `deferred` (never a guessed grenade). The Micro Grenade Launcher declares no delegation and never borrows a loaded identity.

## 8. Controlled data amendments (all in `postCertificationAmendments`, pre-condition asserted, source recorded)
1. `weapon-siang-lance` — `operation.attackOfOpportunityProfiles` (DATA_COMPLETENESS; REC p.50).
2. `lightsaber-chassis-longhandle`, `lightsaber-chassis-pike` — `haft-end` feat requirement → canonical Long Haft Strike identity (JATM pp.53 / 23); `printedNameAliases` on the feat.
3. `unmapped::Bayonet` — configuration states + `configurationResolution.detached` → Knife (Core p.121).
4. `unmapped::Wan-Shen` — assembled state `transitionAction` (JATM p.54).
Builders `--check`, `verify-canonical-production`, feat production and 5B / 5B-R / authority classification were regenerated. The 5B rule table now classifies `attackOfOpportunityProfiles` with `attackOfOpportunityChoices`.

## 9. Venom Spit (usage-limit)
`24-standard-hours` → 86400 s on `game.time.worldTime`. The use is recorded in the owned `usage` ledger; a second use before the window ends is refused before any cost (one second early is refused). With no campaign clock the use stays used until a GM / manual `resetUsage` — never approximated.

## 10. Closure census (before → after I-B)
| counter | I-A baseline | I-B |
|---|---|---|
| UNIQUE_OPERATION_KEYS_WITHOUT_CONSUMER | 161 | **126** |
| RAW_OPERATION_KEY_OCCURRENCES_WITHOUT_CONSUMER | 212 | **167** |
| UNIQUE_OPERATION_MECHANIC_FAMILIES_WITHOUT_CONSUMER | 15 | **14** |
| execution field families fully / partial / unconsumed | 33 / 14 / 10 | 34 / 15 / 8 |

One family became fully consumed (reach-and-threat) and two moved from unconsumed to partial; the remaining keys are owned by I-C / I-D or BLOCKED. The counters were not inflated: no key was relabelled to make them fall.

## 11. Findings recorded, not fixed here
- **Power Attack object / vehicle exclusion is not enforced anywhere** (noted in I-A); out of I-B scope.
- Retractable stock: folded → pistol / extended one-handed −5 is not consumed (rule uncertainty recorded, not automated).
- `requiresTwoHands`-style size-derived wielding (tripod effective size, size gates, "two sizes smaller") is BLOCKED on a size-derived wielding model (I-D).
- 12 BLOCKED rows total: hurled object (I-C); tripod / size / sizeGate / sizeRule / small-when-beneficial (I-D); encumbrance, worn-slot facts (I-D).
- CONSUMER_DEFECT list: none found beyond the fixes above (carbine AoO category, stock setter cost, owned hands now remembered).

## 12. Tests
`tests/weapon-phase-5d-i-b-wielding-activation-threat.test.mjs`: 17 grouped checks / 261 assertions covering AoO (melee, pistol, carbine, folded stock, ordinary rifle refusal, Martial Arts I, Siang choices + persistence), reach, wielding and Long-Handle, Long Haft identity, Amphistaff configuration / proficiency / Venom Spit, Dual-Phase / Interchangeable / Retrosaber, detached delegation, crew / tripod / operators, grenade payload delegation, stock / configuration state and spend-nothing refusals, legacy weapons keeping the legacy path, and both manifests. Every ability that matters carries a canonical identity under a deliberately wrong display name; weapons use wrong names.

## 13. Foundry smoke checklist (prepared, NOT claimed passed)
1. Attack of opportunity with a carbine (extended stock), a rifle (extended → refused, folded → allowed), a Siang Lance (choice prompt, chosen profile reaches damage).
2. Long-Handle Lightsaber one-handed vs two-handed; forgo-doubling profile.
3. Amphistaff: switch form (swift), Venom Spit twice within a day, advance world time 24 h, again.
4. Retrosaber dial-up across rounds in a live combat; end combat mid-state.
5. Dual-Phase / Interchangeable switching across scenes.
6. E-Web: unmounted refusal, regulation prompt once per round; Battering Ram with one vs two operators.
7. Grenade Launcher loaded with frag / stun; Thermal Detonator refused.
8. Detach a Vibrobayonet and attack.

## 14. Recommended I-C scope
Outcome / persistent effects at Apply Damage (`disintegratesOnKillOrDestruction`, status and condition effects), the grabbed-object / hurled-object model (Tractor Beam, `hurledObjectDamageRule`), and the remaining damage-packet / mitigation / threshold keys the I-A manifest deferred to I-C. Size-derived wielding, encumbrance, worn slots, durability and dual-wield accounting remain I-D.

## 15. Validation
Focused I-B test; I-A…5D-A tests; I-B / I-A manifests `--check`; closure / special-mechanic / fire-state census regenerated; `build-canonical-weapons`, `build-canonical-feats`, `build-feat-production`, `build-weapon-production`, `build-weapon-runtime-registry`, 5B, 5B-R, 5C classification; `verify-canonical-production`; `validate-partials`; `validate-data`; `system.json` parse; `run-rolling-syntax-check`; full rolling suite (see PR for the result).
