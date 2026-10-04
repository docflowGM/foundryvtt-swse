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
