# Feat Sourcebook Metadata Verification Audit

**Branch:** `audit/feat-sourcebook-metadata-verification`  
**Base main SHA:** `4a2d095d96774c3cd49ab68b6c43e8e9a3db0cde`  
**Scope:** Every feat in `packs/feats.db`, verified against the uploaded Saga Edition sourcebooks.  
**Audit mode:** Source-authoritative. Existing metadata is treated as a claim to prove, not as an authority.

## Purpose

The feat metadata and taxonomy were built quickly across several implementation passes. This audit verifies each feat against its published rules text and records corrections before any bulk metadata rewrite.

The audit checks five distinct layers:

1. **Canonical identity**
   - Name
   - Sourcebook / provenance
   - Published feat type or family where meaningful
   - Whether the record is a real published feat, a generated choice variant, duplicate, or unsupported record

2. **Description fidelity**
   - The compendium description need not reproduce the book verbatim.
   - Truncated summaries are acceptable when they preserve every mechanically important clause and the feat's actual purpose.
   - A description is incorrect when it omits or changes a prerequisite, trigger, action, target, numeric effect, duration, usage limit, exclusion, special case, or other clause that materially changes play.

3. **Semantic taxonomy**
   - Primary bucket
   - Subbucket
   - Secondary tags
   - Removal of misleading semantic tags such as `force`, `vehicle`, `droid`, `grapple`, etc.

4. **Mechanical metadata**
   - Prerequisites
   - Trigger
   - Action cost
   - Target
   - Roll / defense / skill
   - Modifier value and bonus type
   - Effect
   - Duration
   - Usage limit
   - Stacking / exclusions
   - Special clauses

5. **System owner / automation ceiling**
   - Combat runtime
   - Derived actor math
   - Skill/check runtime
   - Progression
   - Workbench/equipment
   - Garage/vehicle/droid customization
   - Vehicle/starship runtime
   - Force runtime
   - Healing/repair/recovery
   - Social/intrigue/skill challenge
   - Follower/minion/squad
   - Manual-by-rule / GM adjudication

## Status vocabulary

- `CORRECT` — metadata and summary are materially faithful to the source.
- `DESCRIPTION_ERROR` — compendium description changes or omits an important rule.
- `SOURCE_ERROR` — sourcebook/provenance is wrong or ambiguous.
- `TAXONOMY_ERROR` — primary bucket/subbucket/tags misdescribe the feat.
- `MECHANICS_PARTIAL` — core idea is represented but one or more source clauses are missing.
- `MECHANICS_ERROR` — implemented metadata directly contradicts the source.
- `WRONG_OWNER` — rule is assigned to the wrong subsystem/application surface.
- `UNSUPPORTED_METADATA` — metadata asserts behavior that is not supported by the feat text.
- `SOURCE_REVIEW` — not yet source-certified.
- `INVALID_DUPLICATE` — not a valid independent published feat or is a duplicate/generated record that must be treated explicitly.
- `MISSING_CONTENT` — a published feat in the audited source set has no feat record in `packs/feats.db`.

---

# Phase 1 — Saga Edition Core Rulebook, Chapter 5 feats

## Source-set reconciliation

The Chapter 5 feat table contains **64 published feats**.

The repository currently has **74 records** whose `system.source` is exactly `Saga Edition Core Rulebook`. The two sets do not match.

### Published Core feats currently attributed to another source

| Feat | Current source | Audit |
|---|---|---|
| Acrobatic Strike | Galaxy at War | `SOURCE_ERROR` |
| Bantha Rush | Galaxy at War | `SOURCE_ERROR` |
| Charging Fire | Galaxy at War | `SOURCE_ERROR` |
| Crush | The Force Unleashed Campaign Guide | `SOURCE_ERROR` |
| Deadeye | Galaxy at War | `SOURCE_ERROR` |
| Mighty Swing | Galaxy at War | `SOURCE_ERROR` |
| Sniper | Galaxy at War | `SOURCE_ERROR` |
| Triple Crit | Galaxy at War | `SOURCE_ERROR` |

These eight names occur as feats in the Core Rulebook Chapter 5 source set. Later books may reprint or reference them, but the current metadata does not preserve canonical first-source provenance.

### Records claiming Core provenance but not independent Chapter 5 entries

These require individual provenance review rather than automatic deletion:

- Advanced Melee Weapon Proficiency
- Fast Talk
- Frightful Presence
- Great Fortitude
- Heavy Weapon Proficiency
- Improved Grapple
- Lightning Reflexes
- Mounted Combat
- Natural Leader
- Saber Throw
- Stealthy
- Tech Specialist
- Trustworthy
- Two-Weapon Fighting
- Weapon Proficiency (Heavy Weapons)
- Weapon Proficiency (Pistols)
- Weapon Proficiency (Rifles)
- Weapon Proficiency (Simple Weapons)

Some are likely later-source feats, while the explicit Weapon Proficiency variants may be system-generated choices derived from the generic published Weapon Proficiency feat. They should not be treated as 18 automatic errors without a provenance pass.

## Confirmed high-confidence corrections

| Feat | Current metadata | Source-authoritative interpretation | Status |
|---|---|---|---|
| Acrobatic Strike | Skills / Skill Training & Focus; post-tumble attack rider +2 | Combat mobility/tumble feat; successful Tumble to avoid an AoO grants **+5** on the next attack against that foe before end of turn | `MECHANICS_ERROR`, `TAXONOMY_ERROR` |
| Armor Proficiency (light) | Recovery & Survival / Endurance & Environmental | Armor proficiency grant | `TAXONOMY_ERROR` |
| Armor Proficiency (medium) | Recovery & Survival / Endurance & Environmental | Armor proficiency grant | `TAXONOMY_ERROR` |
| Armor Proficiency (heavy) | Recovery & Survival / Endurance & Environmental | Armor proficiency grant | `TAXONOMY_ERROR` |
| Burst Fire | Starship & Vehicle / Gunnery Weapons; `vehicle` tag | General ranged/autofire combat feat usable outside vehicle combat | `TAXONOMY_ERROR`; attack-option clauses need full source certification |
| Careful Shot | Starship & Vehicle / Pilot Maneuvers | General aimed ranged combat feat | `TAXONOMY_ERROR` |
| Cleave | Character / Hit Points & Durability; includes `grapple` | Melee combat extra-attack-on-drop feat | `TAXONOMY_ERROR` |
| Coordinated Attack | Starship & Vehicle / Gunnery Weapons | Aid Another/teamwork combat support feat | `TAXONOMY_ERROR` |
| Crush | `featType: force`; `force` tag | Ordinary grapple feat building on Pin; successful Pin can deal unarmed/claw damage | `TAXONOMY_ERROR`, identity/type error |
| Cybernetic Surgery | GM / Metadata | Treat Injury / cybernetic-installation procedure; natural application owner is cybernetics/workbench/procedure UI | `TAXONOMY_ERROR`, `WRONG_OWNER` |
| Deadeye | Starship & Vehicle / Pilot Maneuvers | General aimed ranged combat feat | `TAXONOMY_ERROR` |
| Dodge | Starship & Vehicle / Pilot Maneuvers | General targeted Reflex-defense combat feat | `TAXONOMY_ERROR` |
| Double Attack | Starship & Vehicle / Gunnery Weapons | General Full Attack / multiattack feat for a chosen weapon group or exotic weapon | `TAXONOMY_ERROR` |
| Dual Weapon Mastery I | Starship & Vehicle / Gunnery Weapons | Two-weapon Full Attack chain | `TAXONOMY_ERROR` |
| Dual Weapon Mastery II | Starship & Vehicle / Gunnery Weapons | Two-weapon Full Attack chain | `TAXONOMY_ERROR` |
| Dual Weapon Mastery III | Starship & Vehicle / Gunnery Weapons | Two-weapon Full Attack chain | `TAXONOMY_ERROR` |
| Dreadful Rage | Combat / Damage Threshold | Rage enhancement, not Damage Threshold | `TAXONOMY_ERROR` |
| Far Shot | Starship & Vehicle / Gunnery Weapons | General ranged range-band feat | `TAXONOMY_ERROR` |
| Improved Defenses | Starship & Vehicle / Vehicle Defense | General persistent Fortitude/Reflex/Will defense feat | `TAXONOMY_ERROR` |
| Improved Disarm | Force / Force Training & Powers; `force_mechanics` | Mundane melee Disarm maneuver feat | `TAXONOMY_ERROR`; Force identity is unsupported |
| Linguist | GM / Metadata | Character/progression language-selection feat | `TAXONOMY_ERROR`; current progression owner is sensible |
| Martial Arts I | Weapon & Armor / Lightsaber Weapon Styles | Unarmed martial-combat feat | `TAXONOMY_ERROR` |
| Martial Arts II | Weapon & Armor / Lightsaber Weapon Styles | Unarmed martial-combat feat | `TAXONOMY_ERROR` |
| Martial Arts III | Weapon & Armor / Lightsaber Weapon Styles | Unarmed martial-combat feat | `TAXONOMY_ERROR` |
| Mighty Swing | Weapon & Armor / Multiattack & Dual Weapon | Melee damage/action-economy attack option | `TAXONOMY_ERROR` |
| Mobility | Combat / Area & Explosives | Defensive movement/AoO feat | `TAXONOMY_ERROR` |
| Point-Blank Shot | Starship & Vehicle / Gunnery Weapons | General ranged combat feat | `TAXONOMY_ERROR` |
| Power Attack | Starship & Vehicle / Starship Systems | General melee attack/damage tradeoff feat | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` pending consumer check |
| Precise Shot | Starship & Vehicle / Pilot Maneuvers | General ranged combat feat | `TAXONOMY_ERROR` |
| Quick Draw | Weapon & Armor / Weapon Proficiency | Weapon handling/action-economy feat, not proficiency | `TAXONOMY_ERROR` |
| Rapid Shot | Character / Ability & Defenses | Ranged combat attack option | `TAXONOMY_ERROR` |
| Rapid Strike | Character / Ability & Defenses | Melee combat attack option | `TAXONOMY_ERROR` |
| Sniper | Droid / Droid Combat | Generic ranged combat feat dealing with intervening soft cover | `TAXONOMY_ERROR` |
| Triple Attack | Starship & Vehicle / Gunnery Weapons | General Full Attack / multiattack feat | `TAXONOMY_ERROR` |
| Triple Crit | Starship & Vehicle / Gunnery Weapons | Selected-weapon critical feat | `TAXONOMY_ERROR` |
| Weapon Focus | Weapon & Armor / Weapon Proficiency | Weapon focus/specialization family, not proficiency | `TAXONOMY_ERROR` |
| Weapon Proficiency | Starship & Vehicle / Gunnery Weapons | Weapon proficiency grant | `TAXONOMY_ERROR` |
| Whirlwind Attack | Combat / Area & Explosives | Multi-target melee Full-Round attack | `TAXONOMY_ERROR` |

## Core mechanical notes

### Acrobatic Strike — confirmed mechanical error

Current metadata uses:

```json
{
  "trigger": "afterSuccessfulTumbleAvoidAoO",
  "attackModifier": 2,
  "bonusType": "competence"
}
```

The source rule grants **+5**, not +2. The trigger/target/duration concept is otherwise close: after successfully Tumbling to avoid an attack of opportunity, the benefit applies to the next attack against that foe before the end of the current turn.

### Improved Disarm — classic semantic-classification failure

Current metadata places the feat under Force and marks it with `force_mechanics`. The feat is an ordinary melee combat maneuver feat. Its actual attack-option concept — a bonus specifically on a disarm attempt and suppression of the normal failed-disarm counterattack — is mechanically aligned with the source, but its identity/taxonomy is not.

Recommended owner:

`Combat -> Maneuvers -> Disarm`

No Force semantic tag should remain.

### Crush — feat type is wrong

The current record is marked `featType: force` and tagged `force`, but the feat is a grapple-chain feat building on Pin. The existing `GRAPPLE_RIDER` metadata is substantially closer to the source than the identity metadata.

Recommended owner:

`Combat -> Grapple & Unarmed`

### Power Attack — not yet certified

The current attack option correctly models an attack/damage trade:

```json
{
  "resource": "baseAttackBonus",
  "attackModifierFormula": "-value",
  "damageModifierFormula": "value"
}
```

However, the metadata also contains `max: 5`, and the source has additional clauses involving the chosen penalty, two-handed melee weapons, and object/vehicle interactions. The resolver must be inspected before deciding whether the cap or missing clauses are implementation defects.

Status: `MECHANICS_PARTIAL` until the consumer is traced.

### Burst Fire — suspicious attached clauses

The feat's central source rule is a single-target use of autofire with an attack penalty, increased damage, and ammunition expenditure. The current metadata also contains Strength-below-13 handling. Because Strength 13 is a feat prerequisite, those below-prerequisite clauses may belong to a broader autofire/weapon rule rather than this feat. Do not remove them until the consuming runtime is traced, but do not certify them as feat-derived behavior.

## Description-fidelity policy for the remainder of the audit

Descriptions will be graded on **material fidelity**, not word-for-word reproduction.

A shortened description is accepted if it still communicates the feat's actual purpose and preserves all rules that would change a player's decision or result. The audit will flag descriptions that:

- change a numeric value;
- omit an action cost or trigger;
- omit a required target/weapon/context;
- omit duration or usage limits;
- omit a mandatory prerequisite or choice;
- omit exclusions/non-stacking clauses;
- imply the feat is Force-, vehicle-, droid-, species-, or combat-specific when the source does not;
- describe only one half of a multi-part feat;
- overstate automation as though a conditional/manual rule were always active.

---

# Phase 2 — Clone Wars Campaign Guide

## Source-set reconciliation

The Chapter 2 feat table contains **21 published feats**. The repository has **20** records tagged exactly `Clone Wars Campaign Guide`.

The missing provenance match is:

| Published feat | Current source | Status |
|---|---|---|
| Unstoppable Force | The Force Unleashed Campaign Guide | `SOURCE_ERROR` |

There are no additional rows currently tagged Clone Wars that are absent from the published Clone Wars feat table.

## Per-feat verification

| Feat | Description fidelity | Metadata / taxonomy findings | Status |
|---|---|---|---|
| Anointed Hunter | Materially faithful | Mechanics correctly require movement of at least 2 squares before a +1 competence bonus on thrown-weapon attacks. Primary taxonomy should expose the Nelvaanian species restriction rather than generic Character/Passive. | `TAXONOMY_ERROR` |
| Artillery Shot | **Prerequisite wrong:** description says none, while the benefit requires proficiency with the weapon used | Area expansion is represented, but proficiency is not explicitly gated. Tech/Demolitions is weaker than a combat area-weapon classification. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Coordinated Barrage | Faithful | Aid Another damage scaling is represented correctly. Stray `rage` / `resource_spend` tags are unsupported. | `CORRECT` mechanics; secondary `TAXONOMY_ERROR` |
| Droidcraft | Faithful | Repair Droid time override from 1 hour to 10 minutes is represented. | `CORRECT` |
| Droid Hunter | **Prerequisite wrong:** description says none rather than proficiency with weapon used | +2 damage vs droids / +4 with ion is modeled, but proficiency is not visibly gated. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Experienced Medic | Faithful | Multi-target Surgery count `max(2, Int modifier)` is correctly represented. | `CORRECT` |
| Expert Droid Repair | Faithful | Multi-target Repair Droid count `max(2, Int modifier)` is correctly represented. | `CORRECT` |
| Flash and Clear | Faithful | Concealment rider is represented. Primary Tech/Demolitions taxonomy is misleading for a Burst/Splash combat feat. | `TAXONOMY_ERROR` |
| Flood of Fire | **Prerequisite wrong:** description says none rather than proficiency with weapon used | Loss of dodge/deflection bonuses against autofire area attack is modeled, but proficiency gate is absent. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Grand Army of the Republic Training | **Prerequisite too narrow:** description says Armor Proficiency (Light) | Source requires proficiency with the armor being worn, not specifically the light-armor feat. Runtime metadata is better than the description and correctly requires armor proficiency. | `DESCRIPTION_ERROR` |
| Gunnery Specialist | Faithful | Vehicle-weapon proficiency while gunning and once/encounter keep-second reroll are modeled. Starship Tactics special prerequisite/maneuver clause is not source-certified in progression metadata. Subbucket should be Gunnery, not Pilot Maneuvers. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Jedi Familiarity | Faithful | Temporary Force Point, once/encounter trigger, and damage/condition-track exclusions are represented. | `CORRECT` |
| Leader of Droids | Faithful | Willing-droid exception to mind-affecting immunity and Int-mod target count are preserved as assisted/manual context. | `CORRECT` |
| Overwhelming Attack | Faithful | Two-swift activation and -5 penalty to attempts to negate the next attack are represented. Current Vehicle Defense bucket is too narrow; this is generic combat. | `TAXONOMY_ERROR` |
| Pall of the Dark Side | Faithful | Half Dark Side Score, minimum +1, to Use the Force checks resisting Sense Force detection is modeled. | `CORRECT` |
| Separatist Military Training | Faithful | +1 circumstance on one attack while adjacent to an ally is represented. Current Species & Origin classification is unsupported; this is faction/military training. | `TAXONOMY_ERROR` |
| Spray Shot | Faithful | Autofire area mutation to one square is represented. | `CORRECT` |
| Trench Warrior | Faithful | Current rule incorrectly requires the user's attack to be ranged. The source only requires that the adjacent wall/object provide cover from the **target's ranged attacks**; the bonus can apply to the qualifying attack regardless of the user's attack type. | `MECHANICS_ERROR` |
| **Unstoppable Force** | Faithful mechanical description | **Canonical example of name-based misclassification.** It is published in Clone Wars, has no Force prerequisite, and is a general defensive feat. Current source, `featType: force`, Force bucket, and Force tags are wrong. The +5 insight Fortitude/Will defense metadata against effects requiring Use the Force is mechanically faithful. | `SOURCE_ERROR`, `TAXONOMY_ERROR` |
| Unwavering Resolve | Faithful | +5 insight Will vs Deception/Persuasion is represented. Skills/Stealth & Perception is based on the prerequisite rather than the effect; Social/Intrigue defense or Defense/Avoidance is a better primary semantic home. | `TAXONOMY_ERROR` |
| Wary Defender | Faithful | Fight Defensively grants +2 competence Fortitude/Will until next turn; metadata matches. | `CORRECT` |

### Clone Wars conclusion

The Clone Wars pass demonstrates a recurring pattern: **prerequisites were often stripped or replaced with “None” while the mechanical benefit was kept**, and taxonomy frequently follows a keyword or prerequisite instead of the feat's actual effect.

---

# Phase 3 — Galaxy at War

## Source-set reconciliation

Galaxy at War publishes **42 feats** in Chapter 1:

- **21 general feats**
- **8 Martial Arts feats**
- **13 Team Feats**

The repository also happens to have **42 records tagged `Galaxy at War`**, but this numeric equality is misleading. The sets are heavily mismatched.

### Published Galaxy at War feats with wrong or missing provenance

| Group | Feats | Current source problem |
|---|---|---|
| General | Forceful Blast | Tagged The Force Unleashed Campaign Guide |
| Martial Arts | Echani Training, Hijkata Training, K'tara Training, K'thri Training, Stava Training, Tae-Jitsu Training, Wrruushi Training | Tagged generic Star Wars Saga Edition |
| Martial Arts | Teräs Käsi Training | Source missing / not Galaxy at War |
| Team Feats | Aquatic Specialists, Ascension Specialists, Covert Operatives, Medical Team, Mounted Regiment, Nimble Team, Slicer Team, Technical Experts, Tireless Squad, Unhindered Approach, Unified Squadron, Wary Sentries, Wilderness Specialists | Tagged generic Star Wars Saga Edition |

That is **22 published Galaxy at War feats whose current provenance does not identify Galaxy at War**.

### Current Galaxy at War-tagged records that are not in its feat tables

These need individual source reconciliation; they must not be assumed to be Galaxy at War merely because of the current field:

Acrobatic Strike, Assured Attack, Autofire Assault, Bantha Rush, Burst of Speed, Charging Fire, Conditioned, Deadeye, Headstrong, Low Profile, Mighty Swing, Reactive Awareness, Reactive Stealth, Resilient Reflexes, Resilient Will, Savage Attack, Scavenger, Slippery Maneuver, Sniper, Surgical Precision, Triple Crit, Triple Crit Specialist.

Several are already resolved by other audited books: Acrobatic Strike, Bantha Rush, Charging Fire, Deadeye, Mighty Swing, Sniper, and Triple Crit are Core Rulebook feats; Savage Attack and Scavenger are Force Unleashed feats.

## Galaxy at War — general feats

| Feat | Findings | Status |
|---|---|---|
| Bantha Herder | Description omits proficiency-with-weapon prerequisite. Metadata models the ranged damage / attack-total-vs-Will push, but lacks visible proficiency gate. `offense_melee` tag is wrong. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Battering Attack | Description and Bantha Rush -> prone rider are faithful. Grapple/Unarmed subbucket is misleading. | `TAXONOMY_ERROR` |
| Destructive Force | Description and object/vehicle destruction rider are faithful. Character/HP primary taxonomy is wrong; the feat is a destruction/combat rider. | `TAXONOMY_ERROR` |
| Disabler | Description incorrectly says no prerequisite; source requires proficiency with the weapon used. Ion grenade/pistol/rifle benefits are otherwise represented. Tech/Demolitions is weaker than weapon specialization as primary taxonomy. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Dive for Cover | Description is faithful. Metadata only names a generic reaction and does not encode once/turn, ranged-target trigger, long-jump resolution, cover qualification, or mandatory prone result. Skill Training primary bucket is based on its Jump prerequisite rather than its defensive reaction effect. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Fight Through Pain | Description and optional Will-instead-of-Fortitude Damage Threshold behavior are faithful. | `CORRECT` |
| **Forceful Blast** | **Wrong source and wrong identity. It is not a Force feat.** Description uses Weapon Proficiency (Simple Weapons) instead of proficiency with the weapon used. Source requires grenade/thermal detonator damage, attack total vs Fortitude, Large-or-smaller target, movement in any direction, and movement restrictions. Current rule uses forced movement “away” and omits several of those qualifications. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `DESCRIPTION_ERROR`, `MECHANICS_ERROR` |
| Force of Personality | Despite its name, this is not a Force feat. Current `not_force_feat` semantic and better-of-Wisdom/Charisma Will Defense rule are correct. | `CORRECT` |
| Fortifying Recovery | Description is faithful. Metadata captures bonus HP amount on Recover but not all source lifecycle clauses: damage consumes bonus HP first, leftovers expire at encounter end, and bonus HP do not stack. | `MECHANICS_PARTIAL` |
| Mission Specialist | Description is faithful. Current Force taxonomy is wrong; Use the Force is only a special case. Metadata captures only the selected trained skill, not the +2 competence aura, 12-square range, untrained-allies restriction, repeatability, or Force Sensitivity restriction for Use the Force. | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Never Surrender | Description is faithful. Generic action metadata does not fully encode first occurrence per encounter, reaction timing, DC equal to incoming damage, and reduction to exactly 1 HP on success. | `MECHANICS_PARTIAL` |
| Officer Candidacy Training | Description and +2 Rank and Privilege Organization Score metadata are faithful. | `CORRECT` |
| Opportunistic Shooter | Description and +2 on ranged attacks of opportunity are faithfully represented. | `CORRECT` |
| Pistoleer | Main weapon-family mechanics are represented. Description hardcodes Weapon Proficiency (Pistols), while source prerequisite is proficiency with the weapon used. Subbucket should be specialization/use, not proficiency acquisition. | `DESCRIPTION_ERROR`, `TAXONOMY_ERROR` |
| Predictive Defense | Better of Dexterity or Intelligence for Reflex Defense is correctly represented. | `CORRECT` |
| Resilient Strength | Better of Strength or Constitution for Fortitude Defense is correctly represented. | `CORRECT` |
| Riflemaster | All four rifle-family benefits are represented. Description hardcodes Weapon Proficiency (Rifles) rather than source's proficiency-with-weapon requirement. | `DESCRIPTION_ERROR`, `TAXONOMY_ERROR` |
| Risk Taker | Description is faithful. Current Force primary bucket is wrong simply because one use spends a Force Point. Metadata is only a generic Climb/Jump hook and omits the changed Climb failure threshold and the failed-jump Force Point rescue procedure. | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Sport Hunter | Weapon benefits are substantially represented, including rerolling 1s for the sporting blaster pistol. Description hardcodes pistol/rifle proficiency feats rather than proficiency with the weapon used. | `DESCRIPTION_ERROR`, `TAXONOMY_ERROR` |
| **Staggering Attack** | **Internal record collision.** Current description describes a different feat: sacrifice extra damage dice for forced movement. The Galaxy at War feat instead trades -2 or -5 on a melee attack for an equal skill-check penalty after dealing damage. The current `abilityMeta.rules` actually match the Galaxy at War rule, while the description and taxonomy do not. | `DESCRIPTION_ERROR`, `TAXONOMY_ERROR`; duplicate-name/source reconciliation required |
| Steadying Position | Description and prone+Aim denial of target Dex-to-Reflex are faithful. `knock_prone` tag is misleading because prone is the attacker's state, not an inflicted condition. | `CORRECT` mechanics; tag cleanup |

## Galaxy at War — Martial Arts feats

The book presents these eight feats as a coherent **Martial Arts** family. Current taxonomy fragments them across Lightsaber Weapon Styles, Armor Proficiency Use, and Character/Hit Points depending on incidental clauses. They should share a Martial Arts / Unarmed primary family, with armor, grapple, critical, HP, etc. as secondary semantics.

| Feat | Findings | Status |
|---|---|---|
| Echani Training | Description is faithful. Main single-unarmed extra Strength damage and once/encounter Fortitude follow-up are modeled, but source size-based Fortitude modifiers and unusually-stable creature bonus are not represented. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Hijkata Training | Description is faithful. Metadata captures the -5 unarmed AoO concept and encounter rider but under-specifies the triggering adjacent melee hit and reaction/once-round contract. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| K'tara Training | Main flat-footed extra-die and once/encounter Fortitude follow-up/mute effects are represented. | `SOURCE_ERROR`, `TAXONOMY_ERROR`; main mechanics `CORRECT` |
| K'thri Training | Swift unarmed attack and once/encounter half damage on a miss are represented. The source's Light Armor-or-no-Armor gate is not visible in the inspected rule metadata. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Stava Training | Size treatment and unarmed-charge free Grab rider are modeled. Light/no-armor gate is not visibly encoded. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Tae-Jitsu Training | Critical damage die step is modeled, but the source caps that increase at d12. The designated-adversary rider does not visibly preserve the second chosen enemy that also gains the Dodge benefit. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Teräs Käsi Training | Main once/round -5 Damage Threshold rider for a successful unarmed attack is represented. | `SOURCE_ERROR`, `TAXONOMY_ERROR`; main mechanics `CORRECT` |
| Wrruushi Training | Main bonus-HP and Fortitude-targeting pieces are represented. Armor gate is present on the bonus-HP rider but not visibly on the Fortitude attack option, even though the source gates the feat's benefits behind Light Armor or no armor. | `SOURCE_ERROR`, `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |

## Galaxy at War — Team Feats

All **13 Team Feats** currently use generic `Star Wars Saga Edition` provenance instead of Galaxy at War.

The descriptions are materially faithful, the base +3 competence skill bonuses are represented, and nearby-ally scaling is deliberately marked manual/table-managed. The special second clauses are also preserved in `teamworkRules`:

- Aquatic Specialists — Swim movement rate
- Ascension Specialists — Climb movement rate
- Covert Operatives — Stealth movement-penalty reduction
- Medical Team — extra healing when aiding another qualifying team member
- Mounted Regiment — Ride reaction to substitute mount defense
- Nimble Team — extra Tumble square
- Slicer Team — +4 Aid Another instead of +2
- Technical Experts — +4 Aid Another instead of +2
- Tireless Squad — +4 Aid Another instead of +2
- Unhindered Approach — +1 square jump distance
- Unified Squadron — automatic Avoid Collision with qualifying allied vehicles
- Wary Sentries — Take 10 on Perception under pressure
- Wilderness Specialists — +4 Aid Another instead of +2

**Status:** all 13 have `SOURCE_ERROR`. Their mechanics are broadly faithful. For taxonomy consistency, the book's explicit Team Feat family should normally be the primary category (Leadership & Allies / Teamwork), with healing, survival, Pilot, etc. retained as secondary domains.

---

# Phase 4 — The Force Unleashed Campaign Guide

## Source-set reconciliation

The published feat table contains **20 feats**.

The repository currently has **31 records** tagged `The Force Unleashed Campaign Guide`, but the sets do not match.

### Published Force Unleashed feats with wrong/missing repository identity

| Feat | Current repository state | Status |
|---|---|---|
| Recall | No feat record exists | `MISSING_CONTENT` |
| Savage Attack | Source says Galaxy at War | `SOURCE_ERROR` |
| Scavenger | Source says Galaxy at War | `SOURCE_ERROR` |

### Current Force Unleashed-tagged rows absent from the published feat table

Crush, Forceful Blast, Forceful Grip, Forceful Recovery, Forceful Saber Throw, Forceful Slam, Forceful Strike, Forceful Stun, Forceful Telekinesis, Forceful Throw, Forceful Vitality, Forceful Weapon, Forceful Will, Unstoppable Force.

Already resolved:

- Crush is a Core Rulebook feat.
- Forceful Blast is a Galaxy at War feat.
- Unstoppable Force is a Clone Wars feat.
- Forceful Recovery is confirmed by the Galaxy of Intrigue source index/table as a Galaxy of Intrigue feat.

The remaining `Forceful *` rows must be reconciled against later sourcebooks. They are **not** certified as Force Unleashed feats merely because their current source field says so. The inspected Force Unleashed Force chapter uses the separate “Unleashed” ability naming family and does not establish these records as feats.

## Per-feat verification

| Feat | Findings | Status |
|---|---|---|
| **Advantageous Attack** | Description is correct: successful attack against an enemy that has not yet acted allows full heroic level to **damage** instead of the normal half. Current metadata instead checks `targetSpeedLower` and adds heroic level to the **attack roll**. This is a direct mechanics contradiction. Damage Threshold subbucket is also unrelated. | `MECHANICS_ERROR`, `TAXONOMY_ERROR` |
| Advantageous Cover | Description is faithful. Current Skill/Stealth taxonomy follows the prerequisite, not the effect. Generic `COVER_BENEFIT_UPGRADE` metadata under-specifies the exact area-damage immunity while covered. | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Angled Throw | Description is faithful. Source requires the attack result to exceed 15 to ignore Cover/Improved Cover, never Total Cover. Current rule simply suppresses grenade cover without visibly preserving the threshold or Total Cover exception. | `MECHANICS_ERROR` / `MECHANICS_PARTIAL` |
| Bad Feeling | Surprise-round Move Action capability is faithfully represented. | `CORRECT` |
| Blaster Barrage | Description and +2 circumstance ally-autofire rider are correct. Stray `offense_melee`, `rage`, and `resource_spend` tags are unsupported. | `CORRECT` mechanics; secondary `TAXONOMY_ERROR` |
| Controlled Rage | Description is faithful. Source says declaring the rage finished causes it to end **one round later** and cannot extend the available rage duration. Metadata says `canEndAtWill: true`, which may imply immediate ending and omits the no-extension clause. | `MECHANICS_PARTIAL` |
| Crossfire | Description and once/round follow-up attack against the soft-cover provider are represented. Droid/Droid Combat primary taxonomy is wrong; the cover provider merely may be a droid. | `TAXONOMY_ERROR` |
| Cunning Attack | Description is faithful: +2 against a flat-footed target **or** a target denied its Dex bonus to Reflex. Metadata visibly keys on flat-footed only, which may miss other denied-Dex cases. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Focused Rage | Description and -5 use of patience/concentration skills while raging are represented. Force taxonomy is unsupported; Use the Force is merely an example skill affected by the general rule. | `TAXONOMY_ERROR` |
| Improved Bantha Rush | Description and push-distance formula are faithful. | `CORRECT` |
| Informer | Description is faithful. Perception substitution, considered-trained status, reroll substitution, and favorable-condition time reduction are represented. | `CORRECT` |
| Mighty Throw | Description is faithful. Strength addition to thrown ranged attack and range extension are represented, with range extension appropriately advisory until range UI owns it. | `CORRECT` |
| Powerful Rage | Description and +4 Strength / Strength-based skill checks while raging are represented. Primary Skills/Training taxonomy is weaker than Combat/Rage. | `TAXONOMY_ERROR` |
| Rapport | Description is faithful. Additional +2 insight Aid Another bonus and nonstacking with Coordinate are represented. | `CORRECT` |
| **Recall** | Published feat is absent from the pack. Source effect: once/day reroll a Knowledge check in which the character is trained and keep the better result. | `MISSING_CONTENT` |
| Savage Attack | Description is materially faithful, but source is wrong. Metadata only captures the selected Double Attack weapon choice; it does not encode the Full Attack sequence in which a first-hit causes each remaining successful attack against that target to deal +1 damage die. Weapon Proficiency subbucket is wrong. | `SOURCE_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Scavenger | Description is faithful, but source is wrong. One-hour Perception x30-credit materials rule is represented; single-object-at-a-time and once-per-object limits are not visibly encoded. Knowledge/Recall taxonomy is wrong; this belongs with crafting/scavenging/workbench-style procedure ownership. | `SOURCE_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR`, `WRONG_OWNER` |
| Strafe | Main 1x4 autofire line mutation is correct. Source special case for using Strafe across squares flown over with a jet pack is not represented in the inspected rule. | `MECHANICS_PARTIAL` |
| Swarm | +1 melee attack per allied character adjacent to target is represented. Metadata includes `maxContextValue: 8`, which is not stated by the feat text and should be documented as an engine/grid assumption rather than source-derived RAW. | `CORRECT` in spirit; `UNSUPPORTED_METADATA` caution on hard cap |
| Unleashed | System-access behavior is broadly faithful: Destiny Point activation and Force Sensitivity requirement for Force-related Unleashed abilities. Primary Force taxonomy is too narrow because the feat grants access to the broader Unleashed ability system. Progression/system-access ownership is more accurate. | `TAXONOMY_ERROR`, `WRONG_OWNER` |

## Force Unleashed conclusion

This pass found one of the most serious content issues so far: **Advantageous Attack has a correct compendium description but an unrelated runtime rule**. That confirms description verification and metadata verification must remain separate audit dimensions.

It also establishes that the current `source` field cannot be used to derive canonical book ownership without independent sourcebook reconciliation.

---

# Cross-book findings after four audited source sets

Source-authoritative sets now reviewed:

| Source | Published feats audited |
|---|---:|
| Saga Edition Core Rulebook | 64 |
| Clone Wars Campaign Guide | 21 |
| Galaxy at War | 42 |
| The Force Unleashed Campaign Guide | 20 |
| **Total source entries reviewed** | **147** |

These are source entries, not necessarily 147 unique repository records because several current records have collided or been attributed to the wrong source.

## Recurring defect classes

1. **Name-based semantic inference**
   - Unstoppable Force and Force of Personality are defensive/general feats despite “Force” in the name.
   - Forceful Blast is not a Force feat.
   - Improved Disarm was incorrectly classified as Force.

2. **Prerequisite-driven taxonomy**
   - Dive for Cover is treated as a skill feat because it requires Jump.
   - Unwavering Resolve is treated as Perception-oriented because Perception is its prerequisite.
   - Several Martial Arts feats are classified as armor feats because they require light/no armor.

3. **Domain keyword contamination**
   - Crossfire became Droid Combat because soft cover can be provided by a droid.
   - Generic ranged feats were assigned to Starship/Vehicle because they can also function there.
   - Mission Specialist became Force-oriented because Use the Force has a special clause.

4. **Description/metadata divergence**
   - Advantageous Attack: description correct, runtime metadata wrong.
   - Staggering Attack: metadata matches one published feat while description describes a different same-name rule.
   - Grand Army of the Republic Training: mechanics metadata is more correct than its description.

5. **Dropped prerequisites**
   - Artillery Shot, Droid Hunter, Flood of Fire, Bantha Herder, Disabler, and several weapon-family feats omit or over-specialize source proficiency requirements.

6. **Incomplete multi-clause feats**
   - Automation frequently captures the headline modifier while dropping duration, armor gate, special case, lifecycle, repeatability, or progression interaction.
   - These should be `MECHANICS_PARTIAL`, not treated as fully certified merely because one executable hook exists.

7. **Provenance equality masking set drift**
   - Galaxy at War has 42 published feats and 42 rows currently tagged Galaxy at War, yet **22 actual GAW feats have wrong/missing provenance** and an equal number of unrelated rows occupy those source slots.

## Next source-authority targets

The highest-value next books for provenance resolution are:

- **Galaxy of Intrigue** — already confirms Forceful Recovery as a feat there and contains the skill-challenge feat family.
- **Jedi Academy Training Manual** — likely resolves additional Force / tradition / lightsaber-oriented rows.
- **The Unknown Regions** — has a clean 21-feat table and will help resolve several currently generic or misattributed records.
- Remaining campaign guides and supplements, followed by a final duplicate/missing-content reconciliation over all 390 records.


# Phase 5 — Galaxy of Intrigue

## Source-set reconciliation

Galaxy of Intrigue Chapter 1 publishes **26 feats**. All 26 names exist in the repository. Twenty-five already identify `Galaxy of Intrigue` as their source; **Forceful Recovery** is incorrectly attributed to `The Force Unleashed Campaign Guide`.

Published feat set:

Adaptable Talent, Bone Crusher, Brilliant Defense, Channel Rage, Cut the Red Tape, Demoralizing Strike, Disturbing Presence, Expert Briber, Flèche, Forceful Recovery, Grazing Shot, Hobbling Strike, Improved Opportunistic Trickery, Indomitable Personality, Master of Disguise, Meat Shield, Opportunistic Trickery, Recurring Success, Resolute Stance, Sadistic Strike, Silver Tongue, Skill Challenge: Catastrophic Avoidance, Skill Challenge: Last Resort, Skill Challenge: Recovery, Stand Tall, Wookiee Grip.

## Per-feat verification

| Feat | Findings | Status |
|---|---|---|
| Adaptable Talent | Description is faithful. Current metadata summary says “choose one owned talent,” but the source choice is a talent you **do not necessarily own**: it must be one you qualify for from a class you possess. The feat also needs the once/day/6-hours-rest swap workflow, cannot swap out a talent that is prerequisite to another owned talent, and permits swapping back after another 6 hours. Social/Intrigue is not the mechanical owner; this is progression/talent-loadout state. | `MECHANICS_ERROR`, `TAXONOMY_ERROR`, `WRONG_OWNER` |
| Bone Crusher | Description is faithful. Primary Social/Intrigue taxonomy is wrong; this is a grapple/condition-track combat rider. Existing metadata identifies the CT rider but does not expose a strong explicit rule payload in the inspected record. | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Brilliant Defense | Description and reaction metadata are faithful: once/encounter, reaction, add Int modifier to Reflex until start of next turn. Social/Intrigue is a thematic book grouping, not the best mechanical taxonomy; Defense/Reaction is. | `TAXONOMY_ERROR`; mechanics `CORRECT` |
| Channel Rage | Description is faithful. Source is once/day, replaces entering Rage, grants +5 Will until encounter end, and counts as the rage use for that day. Current metadata captures alternate +5 Will mode but does not visibly encode once/day, duration, or resource consumption. Social/Intrigue taxonomy is wrong; Combat/Rage or Recovery/Will is closer. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Cut the Red Tape | Description is faithful. Knowledge (bureaucracy) substitution is modeled, but the inspected metadata does not visibly encode the source’s considered-trained status for Gather Information or the reroll substitution. | `MECHANICS_PARTIAL` |
| Demoralizing Strike | Description is faithful and metadata summary matches the AoO-damage -> free Persuasion Intimidate trigger. | `CORRECT` |
| Disturbing Presence | Description and DC 15 Deception movement rule, doubled square cost, and no-AoO effect are represented. | `CORRECT` |
| Expert Briber | Detailed source text states the Haggle application and a DC reduction of 10; the table summary uses broader bribery language. Current metadata applies the -10 to both Haggle and Bribery. This is a **source-text ambiguity inside the book**; do not expand beyond the detailed Benefit without an errata decision. | `SOURCE_REVIEW`, `UNSUPPORTED_METADATA` caution for generic Bribery application |
| Flèche | Description and once/encounter charge natural-17+ critical rule are faithfully represented. Social/Intrigue taxonomy is wrong; this is a charge/combat attack option. | `TAXONOMY_ERROR` |
| Forceful Recovery | Description and Second Wind -> regain one expended Force power are faithful. Current source is wrong; Galaxy of Intrigue is the published source. Recovery/Second Wind is a good mechanical owner despite Force prerequisites. | `SOURCE_ERROR`; mechanics `CORRECT` |
| Grazing Shot | Description and second-target/6-square/LOS/split-damage/fail-no-damage sequence are represented well. Social/Intrigue taxonomy is wrong; this is ranged multi-target combat. | `TAXONOMY_ERROR` |
| Hobbling Strike | Description and trade-extra-damage-for--1-Speed-until-encounter-end rule are faithful. Multiattack/Dual Weapon subbucket is too narrow because Sneak Attack is also a valid source. | `TAXONOMY_ERROR`; mechanics `CORRECT` |
| Improved Opportunistic Trickery | Description is faithful. Metadata captures the once/turn sacrifice of a provoked AoO for -5 Reflex through end of target’s next turn, though the ATTACK_OPTION/targetEffectsOnHit shape is semantically awkward because no hit occurs. | `CORRECT` in spirit; runtime representation should be reviewed under reaction/AoO authority |
| Indomitable Personality | Description and reaction behavior are faithful. Social/Intrigue is thematically plausible but Defense/Reaction is the mechanical owner. | `CORRECT` mechanics; `TAXONOMY_ERROR` if taxonomy is mechanical-first |
| Master of Disguise | Source gives +5 insight to Deception for **Deceptive Appearance or forged document**, and rushed creation is only -2 instead of -10. Current description mentions +5 only for Deceptive Appearance; current metadata does include forged document, but no inspected rule encodes the rush-penalty override. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Meat Shield | Description and soft-cover defensive rule are faithful. Current Droid/Droid Shields taxonomy is wrong; droids are merely one possible soft-cover provider. | `TAXONOMY_ERROR` |
| Opportunistic Trickery | Description is faithful. Metadata captures the once/turn sacrificed AoO and -2 Reflex for the following round. As with the improved version, ATTACK_OPTION is an awkward owner for a sacrificed reaction. | `CORRECT` in spirit; reaction/AoO owner review |
| Recurring Success | Description is faithful. Metadata captures only the required choice of once/encounter feat or talent. It does not visibly grant the additional use, enforce that the choice normally is once/encounter, or support multiple selections choosing different abilities. This is progression/resource-usage logic, not Social/Intrigue. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR`, `WRONG_OWNER` |
| Resolute Stance | Description and +2 / +5 morale Will branches are represented faithfully. Command/Morale classification is reasonable. | `CORRECT` |
| **Sadistic Strike** | Description is faithful, but metadata is wrong. The source moves **all opponents within line of sight** -1 CT until encounter end after a coup de grace to a helpless creature. Current rule says “move the target -1 CT,” turning an area fear-like consequence into a single-target effect. | `MECHANICS_ERROR` |
| Silver Tongue | Description and standard-action Intimidate/Change Attitude rule are faithful. | `CORRECT` |
| Skill Challenge: Catastrophic Avoidance | Current description is too vague to preserve the important rule. Source: catastrophic failure threshold becomes failure by **15+ instead of 10+**, and a catastrophic failure accrues **one failure instead of two**. Current manual metadata only says frequency/severity is reduced. Skill Challenge is the correct owner. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Skill Challenge: Last Resort | Current description says reroll a “third failed Skill Check,” which is broadly in spirit but omits the precise trigger: once per skill challenge, when you or an ally **accrues a third failure** that would normally end the challenge, that character rerolls the attempt and keeps the better result. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Skill Challenge: Recovery | Description is a faithful concise summary: once per skill challenge, treat it as having the Recovery effect even if it normally does not. Current manual Skill Challenge owner is appropriate. | `CORRECT` |
| Stand Tall | Description and manual/context metadata preserve once/encounter, taking damage, allied creatures within 6 squares and LOS, reaction, and single attack against the attacker. | `CORRECT` |
| **Wookiee Grip** | Name-based taxonomy error: the feat has **no Wookiee prerequisite**; source prerequisite is Str 13. Current Species/Species Traits classification is unsupported. Mechanics are also incomplete: source allows a proficient two-handed weapon in one hand **at -2 on attacks**; current rule grants one-handed handling but omits the -2 attack penalty. | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |

## Galaxy of Intrigue conclusion

This source reinforces two audit rules:

1. A sourcebook’s theme is not automatically the feat’s mechanical taxonomy. Many feats printed in an intrigue book are still combat, defense, grapple, or progression rules.
2. Description fidelity must include **mechanically decisive clauses**, not just a thematic summary. The Skill Challenge feats show where an overly compressed description stops being sufficient for rules use.

---

## Audit progress after Phase 5

| Source | Published feat entries reviewed |
|---|---:|
| Saga Edition Core Rulebook | 64 |
| Clone Wars Campaign Guide | 21 |
| Galaxy at War | 42 |
| The Force Unleashed Campaign Guide | 20 |
| Galaxy of Intrigue | 26 |
| **Total source entries reviewed** | **173** |


# Phase 6 — The Unknown Regions

## Source-set reconciliation

The Unknown Regions Chapter 1 feat table publishes **21 feats**. The repository has **20** records tagged exactly `Unknown Regions`.

The sole missing provenance match is **Mounted Combat**, which the repository currently labels `Saga Edition Core Rulebook`. The feat text and table in The Unknown Regions establish this version as an Unknown Regions feat.

No extra rows are currently tagged Unknown Regions beyond the published 20 matching names.

## Per-feat verification

| Feat | Findings | Status |
|---|---|---|
| Acrobatic Ally | Description is materially faithful, including shared initiative, adjacency, DC 20 Acrobatics, standard action, destination, failure-prone consequence, turn ending, and possible AoOs. Current action metadata captures only the headline movement stunt; it omits shared initiative, starting adjacency, failure consequences, turn-ending behavior, and AoO exposure. | `MECHANICS_PARTIAL` |
| Acrobatic Dodge | Description is faithful. Reaction metadata captures once/encounter move after missed melee attack, but not the requirement to be aware of the attacker or the special second use by spending a Force Point. Force/Force Point primary taxonomy overweights an optional recharge clause; this is principally defensive mobility/reaction. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Combat Trickery | Description is faithful. Metadata captures two swift actions and Deception but omits check vs target Will, “flat-footed against your next attack before end of next turn,” and the Force Point extension through encounter end. Force primary taxonomy again follows an optional Force Point extension rather than the feat’s core Deception combat trick. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Elder's Knowledge | Description is faithful. Substitution family is represented, but source limit is once per encounter and that limit is not visible in the inspected substitution metadata. | `MECHANICS_PARTIAL` |
| Frightening Cleave | Description is faithful. Explicit GM-managed handling is reasonable for LOS/radius/multiple enemies/stacking. Skills/Social primary taxonomy is misleading; this is a Cleave-triggered combat/fear rider. | `TAXONOMY_ERROR` |
| Grab Back | Description and metadata preserve +2 Reflex vs Grab/Grapple, reaction counter-grab, and qualifying Grapple feat substitution. | `CORRECT` |
| Halt | Description is faithful. Main AoO -> compare same roll to Grapple -> stop/prone and DT -> lose remaining actions sequence is represented. Metadata should be source-certified for selected Weapon Focus choice, one-size-larger cap, and the special rule ending an in-progress charge; those clauses are not all explicit in the inspected payload. | `MECHANICS_PARTIAL` |
| Heavy Hitter | Description and attack-margin damage / threshold rider are represented well. Current Vehicle Defense subbucket is wrong; this is vehicle/heavy-weapon gunnery offense. | `TAXONOMY_ERROR` |
| Hold Together | Description is faithful. Current generic action metadata omits reaction timing, Force Point cost, requirement that the character be riding in or piloting the vehicle, Colossal-or-smaller size limit, and delayed application specifically until end of round. Force primary taxonomy follows the resource spent rather than the vehicle-damage rule. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Hyperblazer | Description and astrogation/mapping reductions are represented well. Stray `grapple` tag is unsupported. | `CORRECT` mechanics; tag cleanup |
| Improved Sleight of Hand | Description is faithful. Metadata is too generic: source requires a swift Deception check before Stealth, opposing Perception must exceed **both** results, hidden weapon must be two size categories smaller, initial simultaneous draw/palm has its own action treatment, drawing includes a free Stealth check, and re-palming after use is a swift action. | `MECHANICS_PARTIAL` |
| Improvised Weapon Mastery | Description is faithful. Current metadata correctly marks itself partial: improvised-as-simple proficiency is represented, while +1d6 damage and Simple Weapon feat/talent interaction remain manual. | `MECHANICS_PARTIAL` |
| Instinctive Attack | Source prerequisite is **proficient with weapon used, living character (not a droid)**. Current description lists only “Cannot be a Droid” under Prerequisites and moves proficiency into the Effect sentence. Reroll/keep-better behavior and applying the Force Point die to the better result are faithful in description; metadata captures the reroll but must enforce proficiency and preserve Force Point result application. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Instinctive Defense | Description and Force Point -> +2 all defenses as free action on own turn until next turn are faithfully represented. | `CORRECT` |
| Intimidator | Description is faithful. Metadata captures -5 skills/-2 attacks but omits the condition that the user remain in the target’s line of sight, the vehicle see/detect clause, and the explicit incompatibility with Maniacal Charge. Force taxonomy is wrong; Use the Force is merely one skill affected by the general penalty. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Maniacal Charge | Description is faithful and action metadata preserves the core charge/Intimidate/AoO/flat-footed/incompatibility behavior. Stray `rage` and `resource_spend` tags are unsupported. | `CORRECT` mechanics; secondary tag cleanup |
| **Mounted Combat** | Current source is wrong. Description is highly faithful: DC 20 Ride swift action to increase living mount speed by 2; failure moves mount -1 CT; cannot Take 10; subsequent attempts require DC 20 Endurance; plus once/round reaction Ride check to negate weapon hit against rider or mount. Current metadata implements **only the reaction half**. | `SOURCE_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| **Nikto Survival** | Description is faithful and choice/native-environment concept is represented. **Mechanical error:** source says reroll Survival and take the **better** result; current `skillRerolls` metadata says `outcome: keepSecond`. | `MECHANICS_ERROR` |
| Targeted Area | Current description omits source prerequisite Weapon Proficiency in the selected weapon and lists only BAB +5. Metadata models +5 area damage but does not visibly preserve the proficient-weapon gate, single selected target among those hit, or “before Evasion” timing. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Trample | Description is faithful. Metadata captures mounted-charge trample attack against enemies whose squares are traversed and mount Strength damage. Skills/Training primary taxonomy follows the Ride prerequisite rather than the mounted-combat action. | `TAXONOMY_ERROR`; mechanics broadly `CORRECT` |
| Wilderness First Aid | Description is faithful. Current metadata reduces the rule to an equipment waiver, omitting once/day DC 20 Survival check, use of Basic Survival, duration until end of day, and GM-adjustable environmental DC. | `MECHANICS_PARTIAL` |

## Unknown Regions conclusion

This book strongly reinforces the distinction between **description fidelity** and **runtime completeness**. Many descriptions are nearly source-perfect, but their `abilityMeta` payloads only encode a headline effect and omit failure cases, resource costs, limits, or secondary procedures.

---

# Phase 7 — Jedi Academy Training Manual

## Source-set reconciliation

The explicit **FEATS** section beginning on printed page 23 contains **five published feats**:

- Follow Through
- Force Regimen Mastery
- Long Haft Strike
- Relentless Attack
- Unswerving Resolve

All five records exist and are attributed to Jedi Academy Training Manual.

However, the repository has **eight** records tagged to this source. The following three are **not entries in the book's feat section** and therefore cannot retain Jedi Academy feat provenance without another supporting source location:

- Fast Surge
- Keen Force Mind
- Intuitive Initiative

Their rules may exist elsewhere in the wider Saga corpus, but this audit does not treat the current JATM source field as proven merely because the record says so.

## Per-feat verification

| Feat | Findings | Status |
|---|---|---|
| Follow Through | Description is faithful. Main drop-target-with-melee -> move up to Speed once/turn rider is represented. The source’s special interaction allowing that movement **before** the extra Cleave attack is present in the description but absent from the inspected rule payload. Character/Hit Points taxonomy follows the trigger, not the effect; this is combat movement/extra-attack sequencing. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Force Regimen Mastery | Description is faithful: Force Sensitivity + trained Use the Force; learn 1 + Wisdom modifier regimens, minimum 1; repeatable; permanent Wisdom increases grant additional regimens per copies of the feat. Current owner is wrongly GM/Source Reference; this is Force progression. Metadata refers to a “configured Force Training ability modifier” rather than source-specific Wisdom and does not prove all repeat/persistent-Wisdom clauses. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR`, `WRONG_OWNER` |
| **Long Haft Strike** | **Major description contamination.** Canonical source prerequisite is “Proficient with weapon used,” and the benefit is limited to lightsaber pike or long-handle lightsaber being treated as a double weapon. Current description says prerequisite None and appends a large block explicitly labeled **Homebrew Long Haft Strike Data**, including generalized oversized melee weapons and extra damage tables not present in this source feat. The runtime WEAPON_PROPERTY_OVERRIDE correctly reflects the canonical weapon-property benefit but does not visibly enforce proficiency. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Relentless Attack | Source prerequisites are proficiency with weapon used **and** Double Attack with weapon used. Current description omits proficiency. Source then grants +2 competence to the next attack against the same missed target before end of next turn and permits repeat selections for different weapon groups/exotic weapons. Current metadata captures only the persistent weapon choice, not the miss-triggered bonus/duration/target or repeat-selection behavior. Weapon Proficiency subbucket is also wrong. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Unswerving Resolve | Description is faithful. Temporary Force Point trigger and expiration are represented, but source explicitly denies the benefit if the character **negates** the contingent fear/mind-affecting effect rather than simply resisting/failing to be affected; that exclusion is not explicit in inspected metadata. | `MECHANICS_PARTIAL` |

### Unsupported JATM source assignments

| Record | Current content | Audit |
|---|---|---|
| Fast Surge | Second Wind becomes free action on own turn | Not in JATM feat section; `SOURCE_REVIEW` / current `source` unsupported |
| Keen Force Mind | +2 Use the Force to activate mind-affecting Force powers | Not in JATM feat section; `SOURCE_REVIEW` / current `source` unsupported |
| Intuitive Initiative | Initiative reroll record | Not in JATM feat section; `SOURCE_REVIEW` / current `source` unsupported |

## Jedi Academy conclusion

The most serious issue here is not taxonomy but **content contamination**: Long Haft Strike contains an explicitly homebrew extension inside the canonical feat description. Canonical content and optional/homebrew data need separate records or separate clearly noncanonical extension metadata; they should never be merged into the source description.

---

## Audit progress after Phase 7

| Source | Published feat entries reviewed |
|---|---:|
| Saga Edition Core Rulebook | 64 |
| Clone Wars Campaign Guide | 21 |
| Galaxy at War | 42 |
| The Force Unleashed Campaign Guide | 20 |
| Galaxy of Intrigue | 26 |
| The Unknown Regions | 21 |
| Jedi Academy Training Manual | 5 |
| **Total source entries reviewed** | **199** |


# Phase 8 — Scavenger's Guide to Droids

## Source-set reconciliation

The Scavenger's Guide to Droids feat table publishes **17 feats**, and the repository has exactly **17** records attributed to this source. In this book the name/source set matches cleanly; the remaining problems are description fidelity, taxonomy, and mechanics.

Published set:

Aiming Accuracy, Damage Conversion, Distracting Droid, Droid Focus, Droid Shield Mastery, Erratic Target, Ion Shielding, Logic Upgrade: Skill Swap, Mechanical Martial Arts, Multi-Targeting, Pincer, Pinpoint Accuracy, Sensor Link, Shield Surge, Slammer, Tool Frenzy, Turn and Burn.

## Per-feat verification

| Feat | Findings | Status |
|---|---|---|
| Aiming Accuracy | Current description omits “proficient with weapon” from the prerequisite line, though the benefit later mentions a proficient weapon. Source requires Droid, Point Blank Shot, Precise Shot, **and proficiency with weapon**. Metadata captures full-round Aim and +5, but does not visibly preserve next-round same-target/LOS/proficiency state. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Damage Conversion | Description and threshold conversion metadata are faithful: non-area/non-ion/non-Force hit exceeding DT can trade the CT step for +10 damage, increasing by +5 each subsequent use that encounter. | `CORRECT` |
| Distracting Droid | Description and action metadata preserve standard action, Persuasion vs Will, 6 squares, see/hear qualification, lost move action, success-by-10 flat-footed rider, and mind-affecting nature. | `CORRECT` |
| Droid Focus | Description is faithful. Selected droid degree, +1 listed skills, and +1 defenses are represented. Repeat selections for different droid degrees and nonstacking behavior should be confirmed in progression rather than inferred from the single-choice payload. | `MECHANICS_PARTIAL` pending repeat-selection certification |
| Droid Shield Mastery | Description and action metadata correctly preserve automatic shield-recharge check success, +5 SR restoration cap, and two-swift-action recharge. Recovery/Survival taxonomy is wrong; this belongs in Droid / Shields & Systems. | `TAXONOMY_ERROR`; mechanics `CORRECT` |
| Erratic Target | Description is faithful and current GM-managed resolution is appropriate for movement sacrifice after actual token movement. Droid Systems is acceptable but Combat/Defense is a stronger mechanical subfamily. | `CORRECT` / taxonomy refinement only |
| Ion Shielding | Description and damage-resolution concept are faithful: qualifying pre-halving ion damage causes only -1 CT instead of the normal -2. | `CORRECT` |
| **Logic Upgrade: Skill Swap** | **Major mechanics contradiction.** Source does **not** make the selected untrained skill trained. As a full-round action the droid temporarily swaps one trained skill for the chosen untrained skill: it loses the original trained benefit while swapped, the new skill is **still untrained**, cannot use trained-only options, and is rolled at normal untrained half-level + ability. Current metadata permanently treats the selected untrained skill as trained through progression. Current description (“Swap a Trained Skill for an Untrained Skill on the fly”) is too abbreviated to expose this decisive distinction. | `MECHANICS_ERROR`, `DESCRIPTION_ERROR`, `WRONG_OWNER` |
| Mechanical Martial Arts | Description is faithful. Main unarmed-hit -5 melee attack/damage rider is represented, but source special clause changes duration against an **organic enemy struck during an AoO** to the start of that enemy's next turn. Current payload uses the normal “start of your next turn” duration universally. | `MECHANICS_PARTIAL` |
| Multi-Targeting | Source prerequisite includes proficiency with the weapon; current description lists only Droid and Int 13. Aim persistence across rounds and attacks against other targets are represented, but proficiency is not visibly gated. | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Pincer | Description and Pin-maintenance/swift follow-up/Crush rider metadata are faithful. | `CORRECT` |
| Pinpoint Accuracy | The **summary table and detailed feat text conflict internally**: the table says the feat moves the target -1 CT, while the detailed Benefit says a target damaged using Aiming Accuracy cannot Recover until end of its next turn. Current record follows the detailed feat text. Preserve this as an explicit source discrepancy rather than silently “correcting” to the table. | `SOURCE_REVIEW`; current detailed-text implementation is internally defensible |
| Sensor Link | Description and assisted/manual metadata preserve swift sensor broadcast, 24-square range, Aid Another Perception without LOS, and mutual-Sensor-Link +2 Perception concept. | `CORRECT` |
| Shield Surge | Description and reaction metadata are faithful: after SR reduction, trade remaining SR one-for-one to reduce vehicle damage, with data-link requirement and one-round Recharge Shields lockout. | `CORRECT` |
| Slammer | Description is faithful. Runtime option correctly models the extra Strength contribution and persistent-condition-on-DT rider, but does not visibly encode the source special clause that Crush increases Slammer unarmed damage by one die. | `MECHANICS_PARTIAL` |
| Tool Frenzy | Description is faithful. +2 attack and -2 Reflex through end of next turn are represented, but source specifically requires **nonweapon tool appendages**, uses the highest-rated appendage's damage die, and excludes true melee/ranged weapons. Current broad weapon-group matching does not prove all those restrictions. | `MECHANICS_PARTIAL` |
| Turn and Burn | Description is faithful. Current action metadata captures the improved Withdraw movement but omits the source's Force Point reaction to an enemy ending movement adjacent to the droid. Force/Force Point is therefore also the wrong primary taxonomy; it is a droid mobility/withdraw feat with an optional FP reaction. | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |

## Scavenger's Guide conclusion

This is the cleanest source-provenance set audited so far, but it contains one of the most consequential runtime errors: **Logic Upgrade: Skill Swap is implemented as permanent training when RAW explicitly says the swapped-in skill remains untrained**. This is exactly the kind of problem a metadata-only census would miss because the record looks “implemented.”

---

## Audit progress after Phase 8

| Source | Published feat entries reviewed |
|---|---:|
| Saga Edition Core Rulebook | 64 |
| Clone Wars Campaign Guide | 21 |
| Galaxy at War | 42 |
| The Force Unleashed Campaign Guide | 20 |
| Galaxy of Intrigue | 26 |
| The Unknown Regions | 21 |
| Jedi Academy Training Manual | 5 |
| Scavenger's Guide to Droids | 17 |
| **Total source entries reviewed** | **216** |

---

# Phase 9 — Knights of the Old Republic Campaign Guide

## Evidence and reconciliation

Resumed on 2026-09-25 from audit branch commit `8ebb265fedfd5c2bcc0efd7456ed30bd7837d223`, which already contains Phases 6–8. The earlier handoff is stale; those sections were preserved. Pack baseline: 390 records, blob `b072ca3980e7edd87c5c71ffdbca1d5d46be4643`.

Primary evidence: uploaded **Knights of the Old Republic Campaign Guide**, printed pp. 31–35 (PDF pages 32–36). The scanned pages were rendered, OCR-indexed, and the table and complete feat text on pp. 32–35 visually checked. Page numbers below are **printed page numbers**, not PDF indices. Findings compare the source to each pack record, including description, prerequisite fields, taxonomy, and `abilityMeta`; they do not certify execution of untraced runtime consumers. A faithful metadata payload is not an end-to-end runtime test.

Table 2-1 has **21 feats**. All 21 have pack records: 20 carry the correct book name; **Echani Training** carries the generic `Star Wars Saga Edition` source. Its base feat is published here, p. 33; the Galaxy at War addition must remain a separately cited extension to the same feat. This refines Phase 3 provenance rather than creating a duplicate Echani feat. Twenty-one source entries therefore do not add 21 previously unseen pack identities.

All 20 KOTOR-tagged records have incorrect nonzero `system.page` values (currently 25–30, rather than 32–35). Echani Training has page 0. **Every row below has `SOURCE_ERROR` for page/provenance**, in addition to the other statuses shown. Keep `source` and `sourcebook` consistent when corrections are eventually implemented.

## Per-feat ledger

| Feat / pack ID | Printed page | Source comparison and correction specification | Owner / intended primary family | Other status |
|---|---:|---|---|---|
| Accelerated Strike / `167c394e90424916` | 32 | Description, once/encounter, proficient-weapons-only gate, full attack as standard action, and explicitly manual action card agree with the source. Its benefit is not melee-only despite the introductory flavor sentence. Broaden the Melee & Close Combat subbucket to full-attack/action economy. Manual sequencing is a valid present ceiling. | Action & Reaction Runtime; Combat / action economy | `TAXONOMY_ERROR`; metadata/description `CORRECT` |
| Conditioning / `0ac76f1c0c1677cb` | 32 | Description is faithful. `skillRerolls` lists the four Str/Con skills with `keepSecond`, but does not encode **trained skills only**. The separate once/encounter reaction adding Strength bonus to Fortitude until beginning of next turn is absent from the payload. Preserve both benefits. | Skill / Check Runtime + Action & Reaction Runtime | `MECHANICS_PARTIAL` |
| Critical Strike / `d9ecf143e6a9f889` | 32–33 | Description omits proficiency from prerequisites; structured prerequisites retain only BAB +9, omitting Weapon Focus. Source requires proficiency and Weapon Focus with the melee weapon used. Rule captures two swift actions and Weapon Focus match but hardcodes natural 19 instead of a **one-point increase** in threat range. Preserve consecutive actions in the same round, next melee attack only, loss on interrupted sequence or lost LOS, and no automatic hit except natural 20. | Combat Runtime + Action & Reaction Runtime; melee critical setup | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL`, `MECHANICS_ERROR` (fixed threshold representation) |
| Echani Training / `f362e5a4ad0a98bd` | 33 | Base description is faithful; Galaxy at War extension already has a separate heading. Preserve the single-unarmed-attack damage restriction and independently available once/encounter, free-action follow-up after dealing unarmed damage. Follow-up requires size cap, size-based Fortitude adjustments (+5/+10/+20/+50), and unusually stable +5; payload omits those adjustments and bundles follow-up under the damage toggle. Structured prerequisites omit Martial Arts I. Do not infer that follow-up requires the single-attack damage mode. | Combat Runtime + Progression; Martial Arts / unarmed | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` |
| Force Readiness / `8a78270d15aa4738` | 33 | Description and out-of-turn Force Point permission agree. It is a general feat whose effect genuinely concerns Force Point timing; a Force Point mechanical family is appropriate without inventing Force Sensitivity eligibility. Carry the free-action timing and **all other Force Point restrictions remain** into the consumer contract. | Action & Reaction Runtime / resource timing | `CORRECT` at description/permission level; consumer restrictions untested |
| Flurry / `0536f81eff886234` | 33 | Description and +2 melee/-5 Reflex values and start-next-turn expiration agree. Check all wielded weapons satisfy light weapon/lightsaber restriction, not just the selected attack weapon. Preserve benefit across qualifying attacks for the duration. Elite Trooper prerequisite substitution for Point Blank Shot is in the description but absent from this payload. Defense & Avoidance is a poor primary family for an offensive tradeoff. | Combat Runtime + Progression; melee attack option | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Gearhead / `3b9b60551a3379ce` | 33 | Description faithfully gives once/encounter full-round→standard→move→swift reductions, multiple-swift reduction by one, and longer tasks at half time with **-10** check penalty. Generic `REDUCE_RUSH_PENALTY_OR_TIME` does not preserve this procedure and its reduced-penalty wording is unsupported. | Skill / Check Runtime + Action & Reaction Runtime | `MECHANICS_PARTIAL`, `UNSUPPORTED_METADATA` |
| Implant Training / `ce009e054ef1681f` | 33 | Detailed Benefit prevents the implant's extra CT step; payload captures it. Table p. 32 instead describes suppression of a Will penalty, and payload also grants that. Current description adds a -2 Will normal rule absent from this feat's detailed Normal paragraph. Record this **table/detail discrepancy**, and check implant equipment rules/errata before certifying the extra Will rule. Do not silently pick either publication clause. Implant possession is not structured in the record. | Derived Actor Math / implant consequences + Progression | `SOURCE_REVIEW`, `MECHANICS_PARTIAL` |
| Improved Rapid Strike / `cb6aea7e256e4c8c` | 33 | Description preserves light melee/lightsaber restriction, nonstacking with Rapid Strike and incompatible extra-damage sources such as Mighty Swing, and Dex below 13 changing penalty to **-10**. Payload always uses `attackModifier: -5` and lacks explicit exclusions. Structured prerequisite for Rapid Strike is absent. | Combat Runtime; melee damage option | `MECHANICS_ERROR`, `MECHANICS_PARTIAL` |
| Increased Agility / `be1b2f8015c971a5` | 33 | Description and all three rule components agree: +2 squares climb/swim, +2 squares jump distance, retain Dex to Reflex while climbing. Conditioning prerequisite is plain text, not structured. Family should be movement capabilities, not training/focus acquisition. | Derived Actor Math + Exploration / Environment + Progression | `TAXONOMY_ERROR`, `MECHANICS_PARTIAL` (eligibility representation); effect metadata `CORRECT` |
| Logic Upgrade: Self-Defense / `191aacaecaa92ce1` | 34 | One-line description loses droid prerequisite, once/encounter, reaction, **morale** type, and exact expiration **end of your next turn**. Payload supplies +2 defense choice but only `durationRounds: 1`, with no resource limit, reaction, or bonus type. | Action & Reaction Runtime; Droid / defensive reaction | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Logic Upgrade: Tactician / `a75d5d6b3ce5bc6f` | 34 | Description and payload retain +5 Aid Another replacement but omit **once per encounter**, one ally's **next attack against the designated opponent**. Structured prerequisites retain BAB +4 but omit droid restriction, although plain prerequisite text contains it. | Combat Runtime / Aid Another + Progression | `DESCRIPTION_ERROR`, `MECHANICS_PARTIAL` |
| Mandalorian Training / `6723270208549f73` | 34 | Description faithful. Payload grants +2 Charging Fire attack but omits **+2 morale Will until beginning next turn**; normal charge -2 Reflex must remain. Charging Fire prerequisite is not structured. No species requirement; current Species Traits is wrong. | Combat Runtime + Derived Actor Math; ranged charge | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Poison Resistance / `2624254a23604d5b` | 34 | Description faithful; +5 Fortitude versus poison represented. **Half damage on a successful poison attack** is absent from payload. | Derived Actor Math + damage resolution; environmental resistance | `MECHANICS_PARTIAL` |
| Power Blast / `935212056c7968c8` | 34 | Detailed feat has no prerequisite paragraph, but table p. 32 requires **Dex 13**. Description says None while structured prerequisites require Dex 13: mark source conflict, not a proven invented prerequisite. Tradeoff is represented, but payload lacks explicit object/vehicle target damage exclusion, Strength below 13 **additional -5** with nonvehicle weapons, and full duration/action state. Summary alone does not enforce those clauses. Character / Ability & Defenses is wrong. | Combat Runtime + Action & Reaction Runtime; ranged damage tradeoff | `SOURCE_REVIEW`, `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Quick Skill / `95020f2ce5ad0e88` | 34 | Description faithful. Payload omits once/encounter/shared alternative use, trained-skill requirement, and explicit skill prohibition override rule. Take 10 permission is only when **rushed**, not a blanket threatened permission; Take 20 remains subject to normal legality. | Skill / Check Runtime | `MECHANICS_PARTIAL` |
| Republic Military Training / `2bdb31b248f680e3` | 35 | Description faithful. Bare `COVER_DAMAGE_REDUCTION_REACTION` does not preserve DR 10, once/encounter, incoming attack, or cover still qualifying when Aim ignores its Reflex bonus. No species prerequisite. | Action & Reaction Runtime / damage resolution; defensive cover | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR` |
| Sith Military Training / `526109c14cc81285` | 35 | Description and reaction payload preserve once/encounter, zero HP or exceeding DT trigger, enemies within 6 squares of that target, -2 all defenses, end-next-turn duration, and mind-affecting tag. No Sith species or Force-training prerequisite. | Action & Reaction Runtime + Combat Runtime; combat morale/debuff | `TAXONOMY_ERROR`; description/effect metadata `CORRECT` |
| Sniper Shot / `94fc90a53d747f84` | 35 | Proficient-ranged-weapon requirement is omitted from prerequisite line, though later prose preserves it. +2 attack/-5 Reflex and heavy/vehicle exclusions represented; explicit proficiency/all-wielded-weapon gate absent. Starship/Gunnery taxonomy is particularly misleading because the feat **excludes vehicle weapons**. | Combat Runtime; personal ranged attack option | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR`; prerequisite-line normalization |
| Tumble Defense / `1e21ddf471811265` | 35 | Confirmed payload error: `TUMBLE_DC_BONUS_AGAINST_YOU.value: 5` must use **your BAB**, not constant 5. Preserve proficient melee weapon, threatened square, ordinary AoO on failed Tumble, and no use while flat-footed. Description preserves these conditions despite saying prerequisite None. Table also adds Dex 13, which detailed prerequisite omits; keep that dispute explicit. | Skill / Check Runtime + Action & Reaction Runtime; threatened-area defense | `MECHANICS_ERROR`, `MECHANICS_PARTIAL`, `SOURCE_REVIEW` |
| Withdrawal Strike / `caad1a8c13bf01a1` | 35 | Description preserves weapon choice, proficiency, adjacent threatened squares, forbidden Withdraw, and allowed Tumble; prerequisite heading lists BAB only. Metadata captures just choice. Source table says AoOs against Withdraw, but detailed Benefit **prevents Withdraw** in the stated squares. Preserve detailed behavior and flag the table conflict. UI-assisted movement adjudication is appropriate; do not manufacture an automatic attack. Weapon Proficiency taxonomy is wrong. | Action & Reaction Runtime + Progression / UI-Assisted adjudication; melee movement control | `MECHANICS_PARTIAL`, `TAXONOMY_ERROR`, `SOURCE_REVIEW` |

## Cross-book and evidence cautions

- The table/detail disagreements affect **Echani Training** (table critical-hit summary versus detailed follow-up), **Implant Training**, **Power Blast**, **Tumble Defense**, and **Withdrawal Strike**. Keep source locations and the ambiguity visible for a later errata decision.
- Missing structured prerequisites are metadata findings, not proof that the full progression evaluator ignores the plain-text prerequisite. Consumer tracing is still needed before claiming an actual illegal character build is allowed.
- Consistent with the user's summary policy, moving a qualification from the prerequisite heading into the benefit does not by itself make the complete description materially wrong. Phase 9 uses prerequisite-line normalization for such cases; it reserves `DESCRIPTION_ERROR` for lost or changed mechanical meaning.
- Printed p. 31 contains six combinations of existing feats, **not six new feat identities**. Track combination rules under the existing authorities: Dodge + Charging Fire; Dodge + Running Attack; Dual Weapon Mastery I + Quick Draw; Force Training + Improved Disarm; Quick Draw + Weapon Proficiency (lightsabers); Weapon Focus + Weapon Finesse. They should not inflate the independent feat census.
- All corrections remain a specification. No feat-pack or runtime code was changed.

**Cumulative source-entry count:** 216 + 21 = **237** (includes cross-book overlap; not 237 unique certified pack records).
