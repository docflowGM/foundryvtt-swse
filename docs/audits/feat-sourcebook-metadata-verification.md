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

# Phase 2 — Next sourcebooks

_In progress. The next passes will be appended here with the same source-authoritative method._
