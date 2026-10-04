# Talent/Feat Pass 3B — Cumulative Owner Adjudication

Cumulative owner overlay for Pass 3B batches. Claude executes these rulings and makes no semantic decisions. Decision identity is deterministic: domain + canonical ID + tag; duplicates across batches or evidence channels are rejected. Findings not named here stay PASS3B_OWNER_REVIEW.

## Owner policies

- **ACTION_TYPE_POLICY** — A named action-type tag (reaction, swift_action, move_action, standard_action) applies when the record's Benefit directly requires, allows, grants, changes into/from, imposes as an additional cost, prohibits or restricts, or changes another creature's use of that action type. The character using the feat/talent need not be the creature taking the action. Implications remain: reaction/swift_action/move_action/standard_action -> action_economy.
- **FULL_ROUND_ACTION_POLICY** — A direct full-round-action mechanic receives action_economy. There is no owner authorization to create a full_round_action tag; the full-round-action ontology-gap evidence is preserved for later ontology review.
- **REROLL_POLICY** — reroll applies only when the record actually permits, requires, causes or modifies a reroll. A textual reference to rerolls without creating or modifying a reroll mechanic does not qualify.
- **RELIABILITY_POLICY** — reliability represents an affirmative mechanic that improves or stabilizes outcome reliability (reroll, roll-twice/select-result, Take 10/Take 20 benefit, automatic success, equivalent positive mechanic). Not added because a rule prohibits Take 10/20, a phrase happens to contain "take 10", or a mechanic selects the better of two static modifiers rather than two rolls. Negative restrictions create no positive reliability tag.
- **FORCE_POINT_SPEND_POLICY** — force_point_spend applies when the operative mechanic actually requires, permits or consumes a Force Point expenditure; not for "without spending", "does not count as spending", a resource that expires if not later spent, another power's Force Point condition, or a mechanic that avoids/removes a Force Point cost. Implication remains: force_point_spend -> resource_spend.
- **RESOURCE_SPEND_POLICY** — resource_spend applies when the record directly consumes an explicitly limited/tracked resource or use as part of its operative mechanic. Avoiding a resource cost is not resource spending; mentioning that a temporary resource could later be spent is not itself resource spending.
- **RESOURCE_RECOVERY_POLICY** — resource_recovery applies when the mechanic directly restores, regains, refunds or returns a previously spent or expended resource. Not for creating a new temporary resource, granting an additional temporary Force Point, increasing capacity, restoring hit points, or referencing normal recovery while replacing/foregoing it. Hit-point recovery is healing/recovery semantics, not resource_recovery.
- **ONCE_PER_ENCOUNTER_POLICY** — once-per-encounter represents a global activation/use limitation on the record's own mechanic. Not added for a reference to another normally once-per-encounter ability, restoring an additional use of some other ability, or a per-target once-per-encounter restriction while the ability itself may trigger multiple times.
- **FORCE_CAPACITY_POLICY** — force_capacity applies when the mechanic directly increases the amount of Force-resource capacity available to the character, including persistent/additional Force Point allotment. It does not authorize resource_recovery; capacity and recovery are separate semantics. Resource creation, capacity, expenditure and recovery are four distinct concepts.
- **DAMAGE_THRESHOLD_POLICY** — damage_threshold applies when the record's operative mechanic directly interacts with Damage Threshold: compares damage against it, modifies it, changes the consequences of meeting/exceeding it, uses it as a direct activation condition, or explicitly determines how damage is counted for purposes of overcoming it. Not added merely because Damage Threshold appears as unrelated explanatory text or prerequisite material. A mechanic need not numerically modify Damage Threshold to qualify.
- **DAMAGE_BONUS_POLICY** — damage_bonus represents a mechanic that directly increases or adds to damage dealt by an attack/effect (numeric damage, damage dice, a substituted larger damage modifier, directly increased damage output). Not used for additional damage suffered by the user, damage used as a cost or penalty, damage the mechanic gives up/forgoes, Damage Threshold, Damage Reduction, or text fragments containing the word "damage" that do not increase outgoing damage.
- **SUSTAINED_DAMAGE_POLICY** — sustained_damage represents a damage-enhancing mechanic capable of recurring across multiple attacks, rounds or turns rather than being limited to a single isolated damage event (multiattack damage support, repeated attacks, damage enhancement that can recur each turn, recurring/ongoing damaging effects). A mechanic may be conditional and still qualify if its rules explicitly allow the enhancement to recur. A single one-time enhanced attack does not qualify solely because it deals additional damage.
- **CRITICAL_SUCCESS_POLICY** — critical_success represents a mechanic in which a natural 20, or an effect treated as a natural 20/critical success, directly triggers, grants, restores, substitutes for, or materially activates the record's special mechanic. Not added merely because the record expands critical threat range, reminds the reader that only a natural 20 is an automatic hit, references a natural 20 only to explain the normal critical-hit rules, or uses a natural 20 as an exception that bypasses or prevents a defensive effect. critical_hit and critical_success remain distinct; a natural-20 trigger may justify critical_success without implying critical_hit.
- **GRAB_POLICY** — grab applies when the operative mechanic directly interacts with the SWSE Grab mechanic: initiates a Grab, modifies a Grab attack, modifies the consequences of a successful Grab, modifies escape from a Grab, automatically ends/removes a Grab, or otherwise directly changes the mechanical operation of the Grab state. Not added because a currently grabbed target is excluded from another effect, "grab" is ordinary English, or the rule merely mentions Grab while describing another mechanic. A negative eligibility/exclusion clause does not create a positive Grab semantic.
- **GRAPPLE_POLICY** — grapple applies when the operative mechanic directly initiates a grapple, modifies a grapple check or resolution, modifies escape from a grapple, automatically ends/removes a grapple, or otherwise directly changes the grapple mechanic. Not added because grappled targets are excluded from another effect, grapple is one selectable member of a broad generic category, or the word appears only as explanatory/reference text. Generic selectable scope does not automatically enumerate every possible scope tag.
- **RESTRAIN_POLICY** — restrain applies when the operative mechanic directly restrains/pins/immobilizes a target, modifies a restrained/pinned/immobilized state, frees/removes that state, or directly modifies its mechanical application or escape. Not added for "restraining bolt" appearing only in an immunity comparison, an unrelated rule mentioning what happens while immobilized, or ordinary-language phrases such as "pinning you down".
- **BATTLEFIELD_CONTROL_POLICY** — battlefield_control applies when the mechanic directly imposes or materially manipulates hostile battlefield state: forced enemy movement, prone/knockdown, immobilization/restraint, meaningful enemy positioning restriction, or equivalent direct hostile spatial/control effects. Not added because an ally is voluntarily repositioned, the user prevents a control effect on themself, or an unwanted control effect occurs only as the failure consequence of a supportive maneuver.
- **MOVEMENT_POLICY** — movement applies when the operative mechanic directly changes movement or speed: moving a creature/vehicle, forcing movement, increasing/reducing speed, or changing how much movement can be taken. The affected creature does not have to be the user; direct reduction of an enemy or vehicle's speed is still a movement mechanic.
- **MOBILITY_POLICY** — mobility represents improved/facilitated movement capability, freedom, efficiency or movement access for the user or supported creature. Not added merely because the mechanic forcibly moves an enemy, creates difficult terrain for enemies, manipulates battlefield terrain generally, or references whether movement provokes an attack of opportunity; those may be represented by movement, positioning, control, battlefield_control or other specific mechanics.
- **ATTACK_OF_OPPORTUNITY_POLICY** — attack_of_opportunity applies when the operative mechanic directly generates an attack of opportunity, grants or modifies one, prevents/suppresses one, triggers from one, modifies checks or effects specifically associated with one, or changes the timing or availability of one. Not applied merely because movement is stated to provoke attacks of opportunity as normal, attacks of opportunity are simply exempted from a broader restriction on attacks, or the phrase appears only as unchanged rules reminder/context. The Martial Arts I owner precedent remains intact and does not propagate to Martial Arts II/III.
- **FULL_ATTACK_POLICY** — full_attack applies when the operative mechanic directly interacts with the SWSE Full Attack mechanic: performs a Full Attack, modifies Full Attack penalties, modifies the number/type of attacks made as part of a Full Attack, or directly modifies the resolution of a Full Attack. Not added because the record makes multiple attacks, another action produces attacks similar to a Full Attack, or a normal Full Attack is mentioned only as a comparison, limitation or reference. A mechanic that intentionally replaces or bypasses the Full Attack action is not automatically a full_attack mechanic.
- **DUAL_WIELD_POLICY** — dual_wield represents mechanics in which one character directly fights with or mechanically manages two weapons/two weapon ends as part of the same combat style: attacking with two weapons, using both ends of a double weapon where treated as two-weapon combat, modifying two-weapon attack penalties, or directly improving/enabling two-weapon fighting. Not added because two different characters each use one weapon, two attacks are combined, two weapons happen to contribute to one resolved effect, or the mechanic simply allows multiple attacks. The semantic is the character's two-weapon combat mode, not the number of weapons involved in the event.
- **STUN_POLICY** — stun represents direct interaction with the SWSE stun/stunning mechanic or stun damage/mode: deals or modifies stun damage, changes use of a weapon's stun setting, applies a stated stunning effect, or improves/resists/removes/directly modifies stun mechanics. Ion damage is not stun damage. Not added because a record deals ion damage, resists ion damage, improves ion weapons, mentions stun gauntlets only as an equipment exception, or uses nonlethal/capture-oriented ion mechanics. ion and stun are mechanically distinct concepts. No new ion semantic tag is authorized; recurring ion semantics are a later ontology-gap decision.

## Batch 3B.1 — Mechanical Primitives

Expected by owner: 28 records with ADD, 33 tag additions, 22 records NO_CHANGE only, 0 removals, 0 new tags.

Owner-directed completion beyond the detector: Scripted Routines (`8d0657e7ade688bd`) `move_action`, `swift_action` — Owner completion ruling beyond the one detector-tag pair that initially surfaced.

| Action | Domain | Name | ID | Tag | Policy | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- |
| ADD | TALENT | Dumb Luck | `7a024dac260bf9ec` | `reaction` | ACTION_TYPE_POLICY | A.cost_reaction |
| ADD | TALENT | Outmaneuver | `95697c5a4459d7e4` | `reaction` | ACTION_TYPE_POLICY | A.cost_reaction |
| ADD | TALENT | Tactical Superiority | `f259cf27c1b62c47` | `reaction` | ACTION_TYPE_POLICY | A.cost_reaction |
| ADD | FEAT | Signature Device | `313095ada7504547` | `swift_action` | ACTION_TYPE_POLICY | A.cost_swift |
| ADD | FEAT | Signature Device | `313095ada7504547` | `action_economy` | ACTION_TYPE_POLICY | A.any_action_cost |
| ADD | TALENT | Out of Harm's Way | `1946e16d1e6c831c` | `swift_action` | ACTION_TYPE_POLICY | A.cost_swift |
| ADD | TALENT | Sow Confusion | `6b09fe0c6fe98367` | `swift_action` | ACTION_TYPE_POLICY | A.cost_swift |
| ADD | TALENT | Hard Target | `7f4edcb8aa830972` | `swift_action` | ACTION_TYPE_POLICY | A.cost_swift |
| ADD | FEAT | Ascension Specialists | `125c328c4573890a` | `move_action` | ACTION_TYPE_POLICY | A.cost_move |
| ADD | FEAT | Ascension Specialists | `125c328c4573890a` | `action_economy` | ACTION_TYPE_POLICY | A.any_action_cost |
| ADD | FEAT | Aquatic Specialists | `55483fd350b3ba28` | `move_action` | ACTION_TYPE_POLICY | A.cost_move |
| ADD | FEAT | Aquatic Specialists | `55483fd350b3ba28` | `action_economy` | ACTION_TYPE_POLICY | A.any_action_cost |
| ADD | TALENT | Jedi Quarry | `dfb9e58c7bcb095c` | `move_action` | ACTION_TYPE_POLICY | A.cost_move |
| ADD | TALENT | Deep Space Raider | `696f7eed2cc08299` | `standard_action` | ACTION_TYPE_POLICY | A.cost_standard |
| ADD | TALENT | Harrying Shot | `8306c13c16ae0af8` | `standard_action` | ACTION_TYPE_POLICY | A.cost_standard |
| ADD | TALENT | Scripted Routines | `8d0657e7ade688bd` | `standard_action` | ACTION_TYPE_POLICY | A.cost_standard |
| ADD | TALENT | Scripted Routines | `8d0657e7ade688bd` | `move_action` | ACTION_TYPE_POLICY | OWNER_COMPLETION_RULING |
| ADD | TALENT | Scripted Routines | `8d0657e7ade688bd` | `swift_action` | ACTION_TYPE_POLICY | OWNER_COMPLETION_RULING |
| ADD | TALENT | Battle Mount | `f557b3331b5158c8` | `standard_action` | ACTION_TYPE_POLICY | A.cost_standard |
| ADD | FEAT | Whirlwind Attack | `600f43af4edb16f7` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | FEAT | Aiming Accuracy | `80805c30ea6dd11e` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | FEAT | Feat of Strength | `9af3ba38a2c671b8` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | FEAT | Logic Upgrade: Skill Swap | `d48614f7ae500a5b` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | FEAT | Metamorph | `f59c9679c02b8896` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | TALENT | Infuse Weapon | `0df15b0ea7721c50` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | TALENT | Planetary Attunement | `1204459eaaff9efa` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | TALENT | Turn the Tide | `4a3fdcd0f32062b2` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | TALENT | Bomb Thrower | `959f16cb707d8360` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | TALENT | Dull the Pain | `d32459fe16029f2a` | `action_economy` | FULL_ROUND_ACTION_POLICY | A.any_action_cost |
| ADD | TALENT | Suppress Force | `ec3e6a05561ddc07` | `resource_spend` | RESOURCE_SPEND_POLICY | C.resource_spend |
| ADD | TALENT | Precognitive Meditation | `f8ac7fecc8d3c8ff` | `resource_recovery` | RESOURCE_RECOVERY_POLICY | C.resource_recovery |
| ADD | TALENT | Armored Augmentation I | `98355ed4f6473028` | `once-per-encounter` | ONCE_PER_ENCOUNTER_POLICY | C.once_per_encounter |
| ADD | FEAT | Force Boon | `53444cc061d81627` | `force_capacity` | FORCE_CAPACITY_POLICY | C.force_capacity |
| NO_CHANGE | TALENT | Visionary Defense | `153f4b3c6510023d` | `reroll` | REROLL_POLICY | B.reroll |
| NO_CHANGE | FEAT | Force of Personality | `baff0da30d0bc8ee` | `reliability` | RELIABILITY_POLICY | B.roll_twice_keep |
| NO_CHANGE | FEAT | Damage Conversion | `1f404db00518aeed` | `reliability` | RELIABILITY_POLICY | B.take_10_20 |
| NO_CHANGE | FEAT | Biotech Specialist | `bf6c01fa590a3f75` | `reliability` | RELIABILITY_POLICY | B.take_10_20 |
| NO_CHANGE | TALENT | Electronic Sabotage | `0290634450ab1637` | `reliability` | RELIABILITY_POLICY | B.take_10_20 |
| NO_CHANGE | TALENT | Past Visions | `462df9a631ee50f4` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Surge of Light | `8223d30bfce0c14d` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Telekinetic Vigilance | `8ddbbeb09758295d` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | WatchCircle Initiate | `ab9f1497d0b2d7c2` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Force Flow | `b0898acb0a19a3cd` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Dark Side Savant | `b47beb909e6fce63` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Influence Savant | `ced81064716debaa` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Surrender to the Current | `d1ced133cee0a6fa` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Telekinetic Savant | `ddacb8e4517da6b5` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Sheltering Stance | `f541b5e57c5af27e` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Wrath of the Dark Side | `f5ebaf5d77257e0c` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Lightsaber Form Savant | `fcc6357b5b33dbb7` | `force_point_spend` | FORCE_POINT_SPEND_POLICY | C.force_point_spend |
| NO_CHANGE | TALENT | Force Flow | `b0898acb0a19a3cd` | `resource_spend` | RESOURCE_SPEND_POLICY | C.resource_spend |
| NO_CHANGE | TALENT | Sheltering Stance | `f541b5e57c5af27e` | `resource_spend` | RESOURCE_SPEND_POLICY | C.resource_spend |
| NO_CHANGE | TALENT | Skillful Recovery | `323cc243fef47675` | `resource_recovery` | RESOURCE_RECOVERY_POLICY | C.resource_recovery |
| NO_CHANGE | TALENT | Force Recovery | `a691cc0212b6176c` | `resource_recovery` | RESOURCE_RECOVERY_POLICY | C.resource_recovery |
| NO_CHANGE | TALENT | Master Advisor | `e6c4f05db6ac6c06` | `resource_recovery` | RESOURCE_RECOVERY_POLICY | C.resource_recovery |
| NO_CHANGE | TALENT | Wrath of the Dark Side | `f5ebaf5d77257e0c` | `resource_recovery` | RESOURCE_RECOVERY_POLICY | C.resource_recovery |
| NO_CHANGE | TALENT | Mystical Link | `45c4e72d74c44acb` | `once-per-encounter` | ONCE_PER_ENCOUNTER_POLICY | C.once_per_encounter |
| NO_CHANGE | TALENT | Feared Warrior | `cfd5d3f677b2bf1a` | `once-per-encounter` | ONCE_PER_ENCOUNTER_POLICY | C.once_per_encounter |
| NO_CHANGE | TALENT | Visionary Defense | `153f4b3c6510023d` | `reliability` | RELIABILITY_POLICY | B.reroll (bundle reroll) |

## Batch 3B.2A — Damage + Critical mechanics

Expected by owner: 5 records with ADD, 5 tag additions, 12 records NO_CHANGE only, 0 removals, 0 new tags.


| Action | Domain | Name | ID | Tag | Policy | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- |
| ADD | TALENT | Soft Reset | `2739921a657a49a496885c456bcace65` | `damage_threshold` | DAMAGE_THRESHOLD_POLICY | D.damage_threshold |
| ADD | TALENT | Recruit Enemy | `43ac0c4b1759507a` | `damage_threshold` | DAMAGE_THRESHOLD_POLICY | D.damage_threshold |
| ADD | TALENT | Akk Dog Trainer's Actions | `ad7fd3e1a2b04c30` | `damage_threshold` | DAMAGE_THRESHOLD_POLICY | D.damage_threshold |
| NO_CHANGE | FEAT | Damage Conversion | `1f404db00518aeed` | `damage_bonus` | DAMAGE_BONUS_POLICY | D.damage_bonus |
| NO_CHANGE | FEAT | Hobbling Strike | `ccc7a6e191e811a4` | `damage_bonus` | DAMAGE_BONUS_POLICY | D.damage_bonus |
| NO_CHANGE | FEAT | Metamorph | `f59c9679c02b8896` | `damage_bonus` | DAMAGE_BONUS_POLICY | D.damage_bonus |
| NO_CHANGE | TALENT | Strength in Numbers | `22674c41b3d185be` | `damage_bonus` | DAMAGE_BONUS_POLICY | D.damage_bonus |
| ADD | FEAT | Deadly Sniper | `6fb0f56dd9b9b75c` | `sustained_damage` | SUSTAINED_DAMAGE_POLICY | D.sustained_damage |
| NO_CHANGE | FEAT | Critical Strike | `d9ecf143e6a9f889` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Extended Critical Range (heavy weapons) | `04985a42930dff2a` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Extended Critical Range (rifles) | `141e1a07b365e0fd` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Extended Critical Range (simple weapons) | `7cbd576e420a36b0` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Echani Expertise | `88ca4add87c2a86a` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Knowledge Is Power | `cdf46b8cdde49733` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| ADD | TALENT | Martial Resurgence | `0fb750f0f0e6f767` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Small Target | `70a06f3be4e9c216` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |
| NO_CHANGE | TALENT | Precognitive Meditation | `f8ac7fecc8d3c8ff` | `critical_success` | CRITICAL_SUCCESS_POLICY | E.natural_20 |

## Batch 3B.2B — Battlefield control + reactive combat

Expected by owner: 15 records with ADD, 15 tag additions, 17 records NO_CHANGE only, 0 removals, 0 new tags.


| Action | Domain | Name | ID | Tag | Policy | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- |
| NO_CHANGE | FEAT | Bantha Herder | `982b00394a73719e` | `grab` | GRAB_POLICY | G.grab |
| NO_CHANGE | FEAT | Forceful Blast | `c2538c3a906700ae` | `grab` | GRAB_POLICY | G.grab |
| NO_CHANGE | FEAT | Bantha Rush | `fc1e5f0a2367debb` | `grab` | GRAB_POLICY | G.grab |
| NO_CHANGE | TALENT | Knockback | `9d235eba6b3e5daf` | `grab` | GRAB_POLICY | G.grab |
| NO_CHANGE | TALENT | Seize Object | `e97177f243cb2b0a` | `grab` | GRAB_POLICY | G.grab |
| NO_CHANGE | TALENT | Tempest Tossed | `f7b620efd191ac6b` | `grab` | GRAB_POLICY | G.grab |
| NO_CHANGE | FEAT | Bantha Herder | `982b00394a73719e` | `grapple` | GRAPPLE_POLICY | G.grapple |
| NO_CHANGE | FEAT | Forceful Blast | `c2538c3a906700ae` | `grapple` | GRAPPLE_POLICY | G.grapple |
| NO_CHANGE | FEAT | Weapon Focus | `c41814601364b643` | `grapple` | GRAPPLE_POLICY | G.grapple |
| NO_CHANGE | FEAT | Bantha Rush | `fc1e5f0a2367debb` | `grapple` | GRAPPLE_POLICY | G.grapple |
| NO_CHANGE | TALENT | Knockback | `9d235eba6b3e5daf` | `grapple` | GRAPPLE_POLICY | G.grapple |
| NO_CHANGE | TALENT | Tempest Tossed | `f7b620efd191ac6b` | `grapple` | GRAPPLE_POLICY | G.grapple |
| NO_CHANGE | TALENT | Droid Jammer | `80a24150fd2f3163` | `restrain` | RESTRAIN_POLICY | G.restrain |
| NO_CHANGE | TALENT | Uncanny Dodge I | `df9c364e91826cbf` | `restrain` | RESTRAIN_POLICY | G.restrain |
| NO_CHANGE | TALENT | Mobile Combatant | `ee184e210f8c8935` | `restrain` | RESTRAIN_POLICY | G.restrain |
| NO_CHANGE | FEAT | Acrobatic Ally | `723563f70bd7f28f` | `battlefield_control` | BATTLEFIELD_CONTROL_POLICY | G.forced_movement |
| ADD | FEAT | Echani Training | `f362e5a4ad0a98bd` | `battlefield_control` | BATTLEFIELD_CONTROL_POLICY | G.forced_movement |
| NO_CHANGE | TALENT | Acrobatic Recovery | `5d4a63123e5a5eb4` | `battlefield_control` | BATTLEFIELD_CONTROL_POLICY | G.forced_movement |
| ADD | TALENT | Deep Space Raider | `696f7eed2cc08299` | `movement` | MOVEMENT_POLICY | G.speed_change |
| ADD | TALENT | Slowing Shot | `c04e66a3f2577e62` | `movement` | MOVEMENT_POLICY | G.speed_change |
| ADD | TALENT | Piercing Hit | `c08976a5f4ab88d8` | `movement` | MOVEMENT_POLICY | G.speed_change |
| NO_CHANGE | FEAT | Staggering Attack | `c9c4130a55761330` | `mobility` | MOBILITY_POLICY | G.mobility |
| NO_CHANGE | TALENT | Aversion | `13cc978a8023eaa4` | `mobility` | MOBILITY_POLICY | G.mobility |
| NO_CHANGE | TALENT | Prepared Explosive | `32029a2f0dbb7104` | `mobility` | MOBILITY_POLICY | G.mobility |
| NO_CHANGE | TALENT | Frighten | `50273d5ce8f84c31` | `mobility` | MOBILITY_POLICY | G.mobility |
| NO_CHANGE | TALENT | Defensive Measures | `67186d921e94d636` | `mobility` | MOBILITY_POLICY | G.mobility |
| ADD | TALENT | Out of Harm's Way | `1946e16d1e6c831c` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Transposing Strike | `39b5423e255e14b1` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Beloved | `444c032c563c18a1` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Frighten | `50273d5ce8f84c31` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Liberate | `5a858011286f5809` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Dumb Luck | `7a024dac260bf9ec` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| NO_CHANGE | TALENT | Slip By | `893c4fd12df55469` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| NO_CHANGE | TALENT | Lifesaver | `8eace9d86fc60711` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Lose Pursuit | `b1bfca51996bb303` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Lure Closer | `c2d2d55ee60f886f` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| NO_CHANGE | TALENT | Two-Faced | `cef9b7ca6a26f4a6` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Treacherous | `e289618b92890003` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Mobile Combatant | `ee184e210f8c8935` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |
| ADD | TALENT | Tempest Tossed | `f7b620efd191ac6b` | `attack_of_opportunity` | ATTACK_OF_OPPORTUNITY_POLICY | H.attack_of_opportunity |

## Batch 3B.2C — Combat mode primitives

Expected by owner: 0 records with ADD, 0 tag additions, 9 records NO_CHANGE only, 0 removals, 0 new tags.


| Action | Domain | Name | ID | Tag | Policy | Evidence reference |
| --- | --- | --- | --- | --- | --- | --- |
| NO_CHANGE | FEAT | Rapid Assault | `4be60753991eec43` | `full_attack` | FULL_ATTACK_POLICY | O.full_attack |
| NO_CHANGE | TALENT | Synchronized Fire | `388f30468a80f221` | `dual_wield` | DUAL_WIELD_POLICY | O.dual_wield |
| NO_CHANGE | FEAT | Ion Shielding | `43a4b873d9a9984d` | `stun` | STUN_POLICY | O.stun |
| NO_CHANGE | FEAT | Droid Hunter | `5d17898fc9652370` | `stun` | STUN_POLICY | O.stun |
| NO_CHANGE | TALENT | Sudden Storm | `c101826c205debf2` | `stun` | STUN_POLICY | O.stun |
| NO_CHANGE | TALENT | Ion Resistance 10 | `c113b29cde344fafb6aa376a843639d3` | `stun` | STUN_POLICY | O.stun |
| NO_CHANGE | TALENT | Ion Turret | `c2f332d1e74e3e1a` | `stun` | STUN_POLICY | O.stun |
| NO_CHANGE | TALENT | Seyugi Cyclone | `cc90a9fc255f4dc4` | `stun` | STUN_POLICY | O.stun |
| NO_CHANGE | TALENT | Ion Mastery | `df9c25340dcb7c95` | `stun` | STUN_POLICY | O.stun |

## Rationale

- ADD `reaction` — Dumb Luck (TALENT `7a024dac260bf9ec`): The talent directly grants reaction movement.
- ADD `reaction` — Outmaneuver (TALENT `95697c5a4459d7e4`): The mechanic directly permits an opposing Officer to make the opposed check as a Reaction. Action-type semantics apply to directly affected participants, not only the talent user.
- ADD `reaction` — Tactical Superiority (TALENT `f259cf27c1b62c47`): The talent directly grants selected allies reaction movement.
- ADD `swift_action` — Signature Device (FEAT `313095ada7504547`): Switching the active Tech Specialist trait is explicitly a swift action.
- ADD `action_economy` — Signature Device (FEAT `313095ada7504547`): Switching the active Tech Specialist trait is explicitly a swift action.
- ADD `swift_action` — Out of Harm's Way (TALENT `1946e16d1e6c831c`): Its operative interaction with Harm's Way explicitly preserves the required swift-action activation cost while adding the reaction behavior. action_economy already exists.
- ADD `swift_action` — Sow Confusion (TALENT `6b09fe0c6fe98367`): The talent directly imposes an additional swift-action cost on affected enemies. action_economy already exists.
- ADD `swift_action` — Hard Target (TALENT `7f4edcb8aa830972`): The talent explicitly converts second wind from its swift-action timing into a reaction. It directly modifies both action types. reaction and action_economy already exist.
- ADD `move_action` — Ascension Specialists (FEAT `125c328c4573890a`): The feat directly allows climbing at half speed as a move action.
- ADD `action_economy` — Ascension Specialists (FEAT `125c328c4573890a`): The feat directly allows climbing at half speed as a move action.
- ADD `move_action` — Aquatic Specialists (FEAT `55483fd350b3ba28`): The feat directly allows swimming at half speed as a move action.
- ADD `action_economy` — Aquatic Specialists (FEAT `55483fd350b3ba28`): The feat directly allows swimming at half speed as a move action.
- ADD `move_action` — Jedi Quarry (TALENT `dfb9e58c7bcb095c`): The talent directly modifies movement specifically when the character spends a move action to move. action_economy already exists.
- ADD `standard_action` — Deep Space Raider (TALENT `696f7eed2cc08299`): Clear a Path is explicitly performed as a standard action. action_economy already exists.
- ADD `standard_action` — Harrying Shot (TALENT `8306c13c16ae0af8`): The talent directly prohibits the target from using a standard action to make an attack. action_economy already exists.
- ADD `standard_action` — Scripted Routines (TALENT `8d0657e7ade688bd`): Explicit owner completion ruling beyond the detector's single surfaced tag: Attack Script directly changes action costs (full-round -> standard, standard -> move, move -> swift, swift -> free) and Skill Script references skills requiring a standard action or less, so the talent directly manipulates all three currently modeled specific action types. action_economy already exists. No full_round_action or free_action tag is created.
- ADD `move_action` — Scripted Routines (TALENT `8d0657e7ade688bd`): Explicit owner completion ruling beyond the detector's single surfaced tag: Attack Script directly changes action costs (full-round -> standard, standard -> move, move -> swift, swift -> free) and Skill Script references skills requiring a standard action or less, so the talent directly manipulates all three currently modeled specific action types. action_economy already exists. No full_round_action or free_action tag is created.
- ADD `swift_action` — Scripted Routines (TALENT `8d0657e7ade688bd`): Explicit owner completion ruling beyond the detector's single surfaced tag: Attack Script directly changes action costs (full-round -> standard, standard -> move, move -> swift, swift -> free) and Skill Script references skills requiring a standard action or less, so the talent directly manipulates all three currently modeled specific action types. action_economy already exists. No full_round_action or free_action tag is created.
- ADD `standard_action` — Battle Mount (TALENT `f557b3331b5158c8`): The talent directly permits an attack as a standard action and also converts the mount's normal standard-action attack into a swift action. swift_action and action_economy already exist.
- ADD `action_economy` — Whirlwind Attack (FEAT `600f43af4edb16f7`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Aiming Accuracy (FEAT `80805c30ea6dd11e`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Feat of Strength (FEAT `9af3ba38a2c671b8`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Logic Upgrade: Skill Swap (FEAT `d48614f7ae500a5b`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Metamorph (FEAT `f59c9679c02b8896`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Infuse Weapon (TALENT `0df15b0ea7721c50`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Planetary Attunement (TALENT `1204459eaaff9efa`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Turn the Tide (TALENT `4a3fdcd0f32062b2`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Bomb Thrower (TALENT `959f16cb707d8360`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `action_economy` — Dull the Pain (TALENT `d32459fe16029f2a`): Directly specifies a full-round-action cost or timing in its operative mechanic. No full_round_action tag is created.
- ADD `resource_spend` — Suppress Force (TALENT `ec3e6a05561ddc07`): The talent directly spends one use of the mind trick Force power as part of its reaction mechanic: explicit consumption of a limited tracked resource/use.
- ADD `resource_recovery` — Precognitive Meditation (TALENT `f8ac7fecc8d3c8ff`): If the stored defensive effect is not used, the character directly regains the Force Point previously spent on the meditation: a literal refund/restoration of an expended resource.
- ADD `once-per-encounter` — Armored Augmentation I (TALENT `98355ed4f6473028`): The talent itself explicitly begins "Once per encounter...": the record's own activation limitation.
- ADD `force_capacity` — Force Boon (FEAT `53444cc061d81627`): The feat directly grants three additional Force Points at each level, increasing the character's available Force Point allotment. No change to its existing tags in this batch; capacity and recovery are separate semantics.
- NO_CHANGE `reroll` — Visionary Defense (TALENT `153f4b3c6510023d`): The talent does not itself grant or require a reroll. The sentence about multiple characters not being able to use the talent on the same attack to allow multiple rerolls is contextual/reference wording, not the operative effect. One owner decision for this canonical ID and tag regardless of how many discovery channels preserve evidence.
- NO_CHANGE `reliability` — Force of Personality (FEAT `baff0da30d0bc8ee`): Choosing the better applicable Wisdom or Charisma modifier for Will Defense is not rolling twice/selecting a roll result and is not the reliability mechanic represented by this tag.
- NO_CHANGE `reliability` — Damage Conversion (FEAT `1f404db00518aeed`): "Take 10 additional damage" is unrelated to the Take 10 skill mechanic.
- NO_CHANGE `reliability` — Biotech Specialist (FEAT `bf6c01fa590a3f75`): The rule explicitly prohibits Take 10/20. A prohibition does not create the positive reliability semantic.
- NO_CHANGE `reliability` — Electronic Sabotage (TALENT `0290634450ab1637`): The talent explicitly prohibits taking 20 on the check. This is not a positive reliability mechanic.
- NO_CHANGE `force_point_spend` — Past Visions (TALENT `462df9a631ee50f4`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Surge of Light (TALENT `8223d30bfce0c14d`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Telekinetic Vigilance (TALENT `8ddbbeb09758295d`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — WatchCircle Initiate (TALENT `ab9f1497d0b2d7c2`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Force Flow (TALENT `b0898acb0a19a3cd`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Dark Side Savant (TALENT `b47beb909e6fce63`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Influence Savant (TALENT `ced81064716debaa`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Surrender to the Current (TALENT `d1ced133cee0a6fa`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Telekinetic Savant (TALENT `ddacb8e4517da6b5`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Sheltering Stance (TALENT `f541b5e57c5af27e`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Wrath of the Dark Side (TALENT `f5ebaf5d77257e0c`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `force_point_spend` — Lightsaber Form Savant (TALENT `fcc6357b5b33dbb7`): Match generated by avoiding a Force Point expenditure, stating something does not count as spending one, describing later optional expenditure of a resource, referencing another Force power's Force Point condition, or replacing/avoiding an otherwise normal expenditure; not an actual Force Point expenditure created by the record's operative mechanic.
- NO_CHANGE `resource_spend` — Force Flow (TALENT `b0898acb0a19a3cd`): The talent generates a temporary Force Point. That it may later be spent before expiration does not mean the talent itself consumes a resource.
- NO_CHANGE `resource_spend` — Sheltering Stance (TALENT `f541b5e57c5af27e`): The talent removes/avoids a Force Point expenditure. It does not spend a resource.
- NO_CHANGE `resource_recovery` — Skillful Recovery (TALENT `323cc243fef47675`): The talent creates a new temporary Force Point after a failed skill check. It does not restore a previously spent resource.
- NO_CHANGE `resource_recovery` — Force Recovery (TALENT `a691cc0212b6176c`): Despite the name, this talent increases hit points regained from second wind: healing/recovery, not recovery of a tracked expendable resource.
- NO_CHANGE `resource_recovery` — Master Advisor (TALENT `e6c4f05db6ac6c06`): It grants a new temporary Force Point to an ally. It does not restore a previously spent resource.
- NO_CHANGE `resource_recovery` — Wrath of the Dark Side (TALENT `f5ebaf5d77257e0c`): The talent explicitly replaces/foregoes the normal spent-Force-power recovery triggered by the natural 20. The selected effect is extra damage, not resource recovery.
- NO_CHANGE `once-per-encounter` — Mystical Link (TALENT `45c4e72d74c44acb`): It can grant an additional use of another Force-related ability normally restricted to once per encounter. The quoted limitation belongs to the recovered/extended ability, not to Mystical Link's own activation frequency. Its existing resource-recovery semantics already represent that interaction.
- NO_CHANGE `once-per-encounter` — Feared Warrior (TALENT `cfd5d3f677b2bf1a`): The talent may trigger more than once; any given target can only be affected once per encounter. A per-target immunity/restriction, not a global once-per-encounter use limit on the talent.
- NO_CHANGE `reliability` — Visionary Defense (TALENT `153f4b3c6510023d`): Visionary Defense does not itself permit, require, cause, modify or stabilize a roll. Its sentence explaining that multiple characters cannot affect the same attack "to allow multiple rerolls" is contextual wording explaining the non-stacking limitation. The operative mechanic grants a Force bonus to Reflex Defense; it does not create a reroll or other affirmative reliability mechanic. Closes the last 3B.1 primitive finding; the separate reroll NO_CHANGE ruling is unchanged.
- ADD `damage_threshold` — Soft Reset (TALENT `2739921a657a49a496885c456bcace65`): The recovery mechanic explicitly distinguishes whether the droid reached the bottom of the condition track through damage exceeding its Damage Threshold. Damage Threshold directly controls whether the talent's recovery effect applies.
- ADD `damage_threshold` — Recruit Enemy (TALENT `43ac0c4b1759507a`): The talent's activation condition directly requires the triggering damage to equal or exceed both the target's remaining Hit Points and its Damage Threshold. Damage Threshold is part of the talent's operative trigger, not incidental explanatory text.
- ADD `damage_threshold` — Akk Dog Trainer's Actions (TALENT `ad7fd3e1a2b04c30`): Attack in Concert explicitly states that the akk dog's additional damage becomes part of the attack for purposes of overcoming Damage Threshold. The mechanic directly determines how damage interacts with Damage Threshold.
- NO_CHANGE `damage_bonus` — Damage Conversion (FEAT `1f404db00518aeed`): The additional damage is damage suffered by the character as the cost/consequence of avoiding condition-track movement. The feat does not increase damage dealt by the character.
- NO_CHANGE `damage_bonus` — Hobbling Strike (FEAT `ccc7a6e191e811a4`): The feat does not grant additional damage. It explicitly gives up damage that would have been supplied by another ability in exchange for reducing the target's speed. Forgone damage does not create a positive damage_bonus semantic.
- NO_CHANGE `damage_bonus` — Metamorph (FEAT `f59c9679c02b8896`): The detector matched "+5 Damage Threshold." This increases Damage Threshold, not damage dealt.
- NO_CHANGE `damage_bonus` — Strength in Numbers (TALENT `22674c41b3d185be`): The talent increases Damage Reduction. It does not increase damage dealt.
- ADD `sustained_damage` — Deadly Sniper (FEAT `6fb0f56dd9b9b75c`): The feat's damage enhancement applies to the first qualifying ranged attack each turn. Although conditional on attacking an unaware target, the rule explicitly supports recurring enhanced damage across turns rather than a single isolated burst.
- NO_CHANGE `critical_success` — Critical Strike (FEAT `d9ecf143e6a9f889`): The feat expands critical threat range. "Only a natural 20 remains an automatic hit" is a normal-rules limitation/reminder attached to the expanded critical range. The natural 20 does not independently trigger the feat's special benefit.
- NO_CHANGE `critical_success` — Extended Critical Range (heavy weapons) (TALENT `04985a42930dff2a`): The talent expands critical threat range. The natural-20 wording only distinguishes automatic hits from expanded critical threats. critical_hit already represents the operative mechanic.
- NO_CHANGE `critical_success` — Extended Critical Range (rifles) (TALENT `141e1a07b365e0fd`): Same policy and rationale as the heavy-weapons version. The talent expands critical threat range. The natural-20 wording only distinguishes automatic hits from expanded critical threats. critical_hit already represents the operative mechanic.
- NO_CHANGE `critical_success` — Extended Critical Range (simple weapons) (TALENT `7cbd576e420a36b0`): Same policy and rationale as the other Extended Critical Range talents. The talent expands critical threat range. The natural-20 wording only distinguishes automatic hits from expanded critical threats. critical_hit already represents the operative mechanic.
- NO_CHANGE `critical_success` — Echani Expertise (TALENT `88ca4add87c2a86a`): The talent expands unarmed critical threat range. The natural-20 wording preserves the normal automatic-hit rule for the expanded critical range. The operative semantic is critical_hit, not critical_success.
- NO_CHANGE `critical_success` — Knowledge Is Power (TALENT `cdf46b8cdde49733`): The talent expands the critical threat range against the designated target. The natural-20 text only explains that expanded critical-threat results are not automatic hits. The special mechanic is already represented by critical_hit.
- ADD `critical_success` — Martial Resurgence (TALENT `0fb750f0f0e6f767`): Rolling a natural 20 on an unarmed attack directly triggers the talent's special benefit: recovering all spent Force powers. The natural 20 is an operative trigger rather than a critical-range reminder. No additional tags are inferred; its existing resource_recovery remains unchanged.
- NO_CHANGE `critical_success` — Small Target (TALENT `70a06f3be4e9c216`): The talent changes whether an enemy's natural-20 attack against the vehicle actually becomes a critical hit. Its mechanic is directly about mitigating critical_hit; it does not grant or trigger a separate critical-success benefit for the character. Existing critical_hit semantic kept.
- NO_CHANGE `critical_success` — Precognitive Meditation (TALENT `f8ac7fecc8d3c8ff`): The talent allows an attack to be negated except when the attack roll is a natural 20. The natural 20 is an exception that prevents the defensive effect from functioning; it does not trigger or grant the talent's special benefit. The existing 3B.1 resource_recovery ADD remains unchanged.
- NO_CHANGE `grab` — Bantha Herder (FEAT `982b00394a73719e`): Grabbed targets are merely excluded from the feat's forced-movement effect. The feat neither initiates nor modifies Grab.
- NO_CHANGE `grab` — Forceful Blast (FEAT `c2538c3a906700ae`): Grabbed targets are merely ineligible for the forced movement.
- NO_CHANGE `grab` — Bantha Rush (FEAT `fc1e5f0a2367debb`): The Grab state appears only as an exclusion from the push effect. The previously certified Bantha Rush family disposition is preserved.
- NO_CHANGE `grab` — Knockback (TALENT `9d235eba6b3e5daf`): The talent cannot affect a target currently being grabbed. It does not alter Grab itself.
- NO_CHANGE `grab` — Seize Object (TALENT `e97177f243cb2b0a`): "Grab the object" is ordinary-English physical handling following a Disarm attack, not the SWSE Grab combat mechanic.
- NO_CHANGE `grab` — Tempest Tossed (TALENT `f7b620efd191ac6b`): Grabbed targets are excluded from the forced-movement effect.
- NO_CHANGE `grapple` — Bantha Herder (FEAT `982b00394a73719e`): Grappled targets are only excluded from forced movement.
- NO_CHANGE `grapple` — Forceful Blast (FEAT `c2538c3a906700ae`): Grappled targets are only excluded from forced movement.
- NO_CHANGE `grapple` — Weapon Focus (FEAT `c41814601364b643`): Weapon Focus is a generic selectable weapon/group mechanic. Grapple is one possible selectable scope alongside many others; generic selections are not enumerated as semantic tags.
- NO_CHANGE `grapple` — Bantha Rush (FEAT `fc1e5f0a2367debb`): Grappled targets are only excluded from the push effect.
- NO_CHANGE `grapple` — Knockback (TALENT `9d235eba6b3e5daf`): Grappled targets are only excluded from the forced-movement effect.
- NO_CHANGE `grapple` — Tempest Tossed (TALENT `f7b620efd191ac6b`): Grappled targets are only excluded from the forced-movement effect.
- NO_CHANGE `restrain` — Droid Jammer (TALENT `80a24150fd2f3163`): The reference to immunity from a restraining bolt defines which droids are immune to the jammer. The talent does not mechanically apply a restraining bolt or the ontology's restraint mechanic.
- NO_CHANGE `restrain` — Uncanny Dodge I (TALENT `df9c364e91826cbf`): The rule merely states that the existing benefit is lost while immobilized. It does not impose, remove, or modify immobilization.
- NO_CHANGE `restrain` — Mobile Combatant (TALENT `ee184e210f8c8935`): "Keeping your enemies from pinning you down" is descriptive/flavor language, not a Pin/Restrain mechanic.
- NO_CHANGE `battlefield_control` — Acrobatic Ally (FEAT `723563f70bd7f28f`): The operative benefit repositions an ally. The prone result occurs as the failure consequence of the supportive maneuver rather than as hostile battlefield control applied to an enemy. Existing support/movement/mobility/positioning semantics remain sufficient.
- ADD `battlefield_control` — Echani Training (FEAT `f362e5a4ad0a98bd`): The feat directly allows a successful follow-up attack to knock the opponent prone: direct hostile battlefield-state control.
- NO_CHANGE `battlefield_control` — Acrobatic Recovery (TALENT `5d4a63123e5a5eb4`): The talent lets the user avoid falling prone. It is defensive movement/evasion, not application of battlefield control to another creature.
- ADD `movement` — Deep Space Raider (TALENT `696f7eed2cc08299`): Disabling Fire directly reduces the damaged vehicle's speed to 2 squares. The previous 3B.1 standard_action ADD is preserved.
- ADD `movement` — Slowing Shot (TALENT `c04e66a3f2577e62`): The talent directly reduces the target's speed by 2 squares, or by a greater amount when a Force Point is spent.
- ADD `movement` — Piercing Hit (TALENT `c08976a5f4ab88d8`): Its Slowing Shot option directly reduces the target's speed to 2 squares.
- NO_CHANGE `mobility` — Staggering Attack (FEAT `c9c4130a55761330`): The feat forcibly moves the target. That is already represented through movement/positioning/control semantics and does not improve the user's movement capability.
- NO_CHANGE `mobility` — Aversion (TALENT `13cc978a8023eaa4`): The talent makes terrain around the user difficult terrain for enemies. It impairs enemy movement; it does not grant improved mobility.
- NO_CHANGE `mobility` — Prepared Explosive (TALENT `32029a2f0dbb7104`): The talent modifies terrain state through explosives. It does not directly grant a creature improved movement capability. Existing trap/crafting/equipment/control/battlefield_control/movement/positioning semantics kept.
- NO_CHANGE `mobility` — Frighten (TALENT `50273d5ce8f84c31`): The talent forcibly moves enemies away from the minion. Forced enemy movement is not a positive mobility mechanic.
- NO_CHANGE `mobility` — Defensive Measures (TALENT `67186d921e94d636`): The talent makes the Safe Zone difficult terrain for enemies. It impairs enemy movement rather than improving mobility.
- ADD `attack_of_opportunity` — Out of Harm's Way (TALENT `1946e16d1e6c831c`): The talent's reaction movement explicitly does not provoke an attack of opportunity. Previous swift_action ADD preserved.
- ADD `attack_of_opportunity` — Transposing Strike (TALENT `39b5423e255e14b1`): The position swap explicitly does not provoke attacks of opportunity.
- ADD `attack_of_opportunity` — Beloved (TALENT `444c032c563c18a1`): To Me! directly grants reaction movement to allies that explicitly does not provoke attacks of opportunity.
- ADD `attack_of_opportunity` — Frighten (TALENT `50273d5ce8f84c31`): The forced enemy movement explicitly does not provoke attacks of opportunity. This ADD is independent of the mobility NO_CHANGE ruling.
- ADD `attack_of_opportunity` — Liberate (TALENT `5a858011286f5809`): The granted reaction movement after escaping the grab/grapple/immobilization explicitly does not provoke attacks of opportunity.
- ADD `attack_of_opportunity` — Dumb Luck (TALENT `7a024dac260bf9ec`): Escape grants reaction movement explicitly without provoking attacks of opportunity. Previous 3B.1 reaction ADD preserved.
- NO_CHANGE `attack_of_opportunity` — Slip By (TALENT `893c4fd12df55469`): The rule says that moving through the target's space might still provoke attacks of opportunity as normal. It does not alter the AoO mechanic.
- NO_CHANGE `attack_of_opportunity` — Lifesaver (TALENT `8eace9d86fc60711`): The granted movement explicitly provokes attacks of opportunity as normal. That is a rules reminder/consequence, not a modification of the AoO mechanic.
- ADD `attack_of_opportunity` — Lose Pursuit (TALENT `b1bfca51996bb303`): The talent directly grants a +5 bonus to Pilot checks specifically used to avoid being pulled into a Dogfight as an Attack of Opportunity. This directly modifies resolution of an AoO mechanic.
- ADD `attack_of_opportunity` — Lure Closer (TALENT `c2d2d55ee60f886f`): The talent's involuntary movement explicitly does not provoke Attacks of Opportunity.
- NO_CHANGE `attack_of_opportunity` — Two-Faced (TALENT `cef9b7ca6a26f4a6`): Nonthreatening prohibits attacks against the user while leaving attacks of opportunity as an exception. It does not generate, enhance, suppress, or otherwise modify attacks of opportunity themselves; the exception does not create a positive AoO semantic.
- ADD `attack_of_opportunity` — Treacherous (TALENT `e289618b92890003`): The talent creates reaction movement during resolution of another attack and explicitly permits a threatening creature to make an attack of opportunity before the original attack is resolved: direct AoO generation/timing interaction rather than a generic "provokes as normal" reminder.
- ADD `attack_of_opportunity` — Mobile Combatant (TALENT `ee184e210f8c8935`): Both Expeditious Attack and Yielding Assault grant movement that explicitly does not provoke attacks of opportunity.
- ADD `attack_of_opportunity` — Tempest Tossed (TALENT `f7b620efd191ac6b`): The talent's forced movement explicitly does not provoke attacks of opportunity.
- NO_CHANGE `full_attack` — Rapid Assault (FEAT `4be60753991eec43`): Rapid Assault does not perform a Full Attack. It spends a Force Point to make exactly two attacks as a standard action, using a qualifying two-weapon or Double Attack setup. The reference to how many attacks the character's normal Full Attack could produce establishes only a ceiling/comparison. The feat deliberately provides a different action path rather than modifying or executing the Full Attack action itself. Its existing dual_wield, sustained_damage, standard_action, action_economy, force_point_spend and resource_spend semantics remain unchanged.
- NO_CHANGE `dual_wield` — Synchronized Fire (TALENT `388f30468a80f221`): The talent coordinates one weapon fired by the user and one weapon fired by an ally. The two damage results are combined before applying SR/DR and Damage Threshold. This is coordinated fire from two characters, not one character wielding/fighting with two weapons. No additional tags inferred.
- NO_CHANGE `stun` — Ion Shielding (FEAT `43a4b873d9a9984d`): The feat directly modifies the consequences of ion damage exceeding Damage Threshold. Ion damage is not stun damage.
- NO_CHANGE `stun` — Droid Hunter (FEAT `5d17898fc9652370`): The feat grants additional damage against droids, with a larger bonus when using a weapon that deals ion damage. It does not interact with stun damage or a stunning effect.
- NO_CHANGE `stun` — Sudden Storm (TALENT `c101826c205debf2`): Stun gauntlets appear only in the permitted-equipment exception to the otherwise unarmed requirement. The talent does not use or modify the stun function of those gauntlets.
- NO_CHANGE `stun` — Ion Resistance 10 (TALENT `c113b29cde344fafb6aa376a843639d3`): The talent grants DR specifically against ion damage. It does not resist stun damage or a stunning effect.
- NO_CHANGE `stun` — Ion Turret (TALENT `c2f332d1e74e3e1a`): The turret converts its damage into ion damage. That is an ion mechanic, not a stun mechanic.
- NO_CHANGE `stun` — Seyugi Cyclone (TALENT `cc90a9fc255f4dc4`): Stun gauntlets are listed only as an exception to the otherwise no-weapons requirement. The talent does not interact with their stun mechanics.
- NO_CHANGE `stun` — Ion Mastery (TALENT `df9c25340dcb7c95`): The talent directly improves attacks made with ion weapons and increases ion damage. Its capture-oriented purpose does not make ion damage semantically equivalent to stun damage. Its existing nonlethal semantic is preserved; this ruling does not reopen that tag.
