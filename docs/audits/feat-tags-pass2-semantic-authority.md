# Feat Tags — Pass 2 Working Semantic Authority (Owner Adjudication Batch 1)

Derived deterministically from the immutable Pass 1 authority (`data/audits/feat-tags-semantic-authority.json`) plus the owner overlay (`data/audits/feat-tags-pass2-owner-adjudication.json`). Status: `PASS2_OWNER_ADJUDICATION_BATCH_1_APPLIED`. **Not production-final; no production record was changed.**

## Tag changes

| Feat | Ruling | Before | After |
| --- | --- | --- | --- |
| Great Cleave (`8a5cb28f625d6f02`) | PASS2_OWNER_APPROVED | `melee`, `action_economy`, `sustained_damage` | `melee`, `action_economy`, `sustained_damage`, `setup` |
| Pin (`c238f3f722689a3a`) | PASS2_OWNER_APPROVED | `grab`, `grapple`, `restrain`, `control` | `grab`, `grapple`, `restrain`, `control`, `unarmed`, `melee`, `battlefield_control` |
| Crush (`7bc21d4a74b95be5`) | PASS2_OWNER_APPROVED | `grab`, `grapple`, `restrain`, `unarmed`, `damage`, `control` | `grab`, `grapple`, `restrain`, `unarmed`, `damage`, `control`, `melee` |
| Throw (`3eed0b4f1227cf91`) | PASS2_OWNER_CORRECTED | `grab`, `grapple`, `restrain`, `control`, `movement`, `positioning`, `damage`, `unarmed` | `grab`, `grapple`, `control`, `movement`, `positioning`, `damage`, `unarmed`, `melee`, `battlefield_control` |
| Trip (`a8511e47656ef4dd`) | PASS2_OWNER_APPROVED | `grab`, `grapple`, `control`, `battlefield_control`, `melee` | `grab`, `grapple`, `control`, `battlefield_control`, `melee`, `unarmed` |
| Martial Arts I (`92f927c92ded9fcf`) | PASS2_OWNER_APPROVED | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense` | `martial_arts`, `unarmed`, `melee`, `damage_bonus`, `defense`, `attack_of_opportunity` |
| Cut the Red Tape (`2bb34366776f0371`) | PASS2_OWNER_APPROVED | `knowledge`, `gather_information`, `skill_substitution`, `skills` | `knowledge`, `gather_information`, `skill_substitution`, `skills`, `reroll`, `reliability` |
| Informer (`f313d17068d1cdea`) | PASS2_OWNER_APPROVED | `perception`, `investigation`, `skill_substitution`, `skills`, `social`, `reliability`, `gather_information` | `perception`, `investigation`, `skill_substitution`, `skills`, `social`, `reliability`, `gather_information`, `reroll` |
| Gunnery Specialist (`70962165bed8e5ed`) | PASS2_OWNER_APPROVED | `vehicle`, `ranged`, `weapon_training`, `reroll`, `reliability`, `once-per-encounter` | `vehicle`, `ranged`, `weapon_training`, `reroll`, `reliability`, `once-per-encounter`, `pilot` |
| Slammer (`9c9e98a70538855c`) | PASS2_OWNER_APPROVED | `unarmed`, `melee`, `damage`, `damage_bonus`, `damage_threshold`, `standard_action`, `action_economy`, `control` | `unarmed`, `melee`, `damage`, `damage_bonus`, `damage_threshold`, `standard_action`, `action_economy`, `control`, `treat_injury` |

### Operations

- **Great Cleave**: ADD `setup`; REMOVE —
- **Pin**: ADD `unarmed`, `melee`, `battlefield_control`; REMOVE —
- **Crush**: ADD `melee`; REMOVE —
- **Throw**: ADD `melee`, `battlefield_control`; REMOVE `restrain`
- **Trip**: ADD `unarmed`; REMOVE —
- **Martial Arts I**: ADD `attack_of_opportunity`; REMOVE —
- **Cut the Red Tape**: ADD `reroll`, `reliability`; REMOVE —
- **Informer**: ADD `reroll`; REMOVE —
- **Gunnery Specialist**: ADD `pilot`; REMOVE —
- **Slammer**: ADD `treat_injury`; REMOVE —

## Publication-category structural changes

| Feat | Pass 1 | Pass 2 |
| --- | --- | --- |
| Skill Challenge: Catastrophic Avoidance (`2cc20fb67232f92f`) | GENERAL | SKILL_CHALLENGE_FEAT |
| Skill Challenge: Last Resort (`db547ac84af63b06`) | GENERAL | SKILL_CHALLENGE_FEAT |
| Skill Challenge: Recovery (`ef64dc738a6afeeb`) | GENERAL | SKILL_CHALLENGE_FEAT |
| Echani Training (`f362e5a4ad0a98bd`) | MARTIAL_ARTS_FEAT | GENERAL (claims: Knights of the Old Republic Campaign Guide p.33: GENERAL; Galaxy at War p.26: MARTIAL_ARTS_FEAT) |

## Reviewed false positives (no tag change)

- Vehicular Surge (`5e471161ad85b040`): not `pilot` — PASS2_FALSE_POSITIVE. Pilot is a prerequisite. "Vehicle you pilot" describes character role, not use or modification of the Pilot skill.
- Mounted Defense (`acb7efcc70769b9f`): not `pilot` — PASS2_FALSE_POSITIVE. The Benefit works while riding a beast or speeder bike as passenger or pilot. Pilot appears only as an alternative prerequisite.
- Momentum Strike (`cf278001c780f3f9`): not `pilot` — PASS2_FALSE_POSITIVE. Same ruling as Mounted Defense.
- Mission Specialist (`b7f51561e60fefe6`): not `use_the_force` — PASS2_FALSE_POSITIVE. Generic choose-one-trained-skill feat, correctly represented by `skills`. The Use the Force sentence is an eligibility exception for one possible choice, not Force-specialized semantics.
- Logic Upgrade: Skill Swap (`d48614f7ae500a5b`): not `use_the_force` — PASS2_FALSE_POSITIVE. Use the Force is explicitly excluded from selectable skills. An exclusion does not create positive Use the Force semantics.
- Flurry (`0536f81eff886234`): not `skill_substitution` — PASS2_FALSE_POSITIVE. Flurry substitutes for a feat when qualifying for a prestige class, not one skill for another.
- Weapon Finesse (`252b67d6e31c377e`): not `skill_substitution` — PASS2_FALSE_POSITIVE. Weapon Finesse substitutes Dexterity for Strength on attack rolls, not a skill.
- Droid Shield Mastery (`d518e8c1220af930`): not `skill_substitution` — PASS2_FALSE_POSITIVE. Changes Endurance success/action timing, not skill identity; it already carries `endurance`.

## Family reviews closed without tag change

- Power Attack / Powerful Charge / Bantha Rush — PASS2_INTENTIONAL_DIVERGENCE. The common `melee` relationship is real, but the differing tags represent differing mechanics: Power Attack is an attack-for-damage trade; Powerful Charge is movement/charge plus attack/damage enhancement; Bantha Rush is forced movement/control. Tag parity is not forced.
- Ranged precision family — PASS2_INTENTIONAL_DIVERGENCE. `ranged` + `precision` is the valid common core. Aim, cover, positioning, range-band, sniper, setup, targeting, and damage tags remain mechanic-specific.
- Tech Specialist family — PASS2_INTENTIONAL_DIVERGENCE. The valid common core is tech + mechanics + modification + equipment. The wider object/trait tags on Tech Specialist and Superior Tech are justified by their modification tables; Signature Device's `reliability` is justified by its take-10 mechanic; Hasty Modification does not inherit the parent feat's entire semantic payload.
- martial-arts — PASS2_INTENTIONAL_DIVERGENCE. Martial Arts I alone records the Core cross-rule interaction that lets an otherwise unarmed character threaten and make attacks of opportunity. Martial Arts II and III independently advance unarmed damage and dodge Reflex Defense only. Prerequisite inheritance is not semantic inheritance; attack_of_opportunity is not propagated to II or III.
- Grapple family (Pin / Crush / Throw / Trip) — PASS2_INTENTIONAL_DIVERGENCE. Remaining tag-set differences are mechanically justified: Pin restrains and prevents actions/movement; Crush deals damage through an established Pin; Throw forcibly relocates the target, knocks it prone and ends the grapple; Trip knocks the target prone. The Batch 1 corrections already set the common grapple/unarmed/melee semantics; tag parity is not forced. Member-level Batch 1 rulings (approved/corrected) remain recorded on the feat records.

## Invalid family references

- Rapid Shot / Improved Rapid Shot — PASS2_INVALID_FAMILY_REFERENCE. There is no canonical Improved Rapid Shot identity in the 353-feat authority. The owner-named family reference was erroneous; no identity is invented. Rapid Strike / Improved Rapid Strike remains the valid canonical family.

Full per-feat records (including `pass1FinalTags` and `pass2Adjudication`) are in the JSON.
