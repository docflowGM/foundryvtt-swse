# Phase 4B — Lightsaber Semantic Tags — Rolling Planner Authority

**Status:** `WEAPON_TAG_PHASE_4B_LIGHTSABER_ROUND_1_PLANNER_ADJUDICATED`

The standard Lightsaber is the comparison baseline because Jedi characters in this project begin with the standard lightsaber by default.

That is system recommendation context, not a new semantic tag and not a claim that this tagging authority grants the item.

## Hard vocabulary rule

No new tags of any kind are allowed.

Every value in these tag-bearing fields must be an exact tag already used by at least one certified feat or talent:

- `sharedTags`
- `advantageTags`
- `tradeoffTags`
- `finalTags`
- `conditionalSynergyTags[].tag`

If a weapon mechanic does not map cleanly to that existing vocabulary, it remains plain text under `unrepresentedMechanics`. Those entries are not tags and must never be inserted into `system.tags`.

The allowed vocabulary remains the exact 183-tag union actually used by certified feats and talents.

## Lightsaber comparison policy

Shared baseline tags: `lightsaber`, `melee`, `offense_melee`

A variant receives additional tags only when an existing feat/talent tag precisely represents a genuine positive mechanic.

A disadvantage may be recorded in `tradeoffTags` only when the tag itself already exists in the feat/talent vocabulary; it is never copied into `finalTags` merely because the weapon penalizes that mechanic.

Variant pros and cons are otherwise preserved as ordinary comparison text.

## Census

- Canonical Lightsaber identities: 16
- Repo-present: 16
- Repo-missing: 0
- Round 1 adjudicated: 8
- Remaining: 8
- Round 1 final tag assignments: 31
- Distinct final tags used: 9
- Next identity: Lightsaber, Archaic

## Round 1 rulings

### 1. Crossguard Lightsaber

- Identity: `lightsaber-chassis-crossguard`
- Source: Jedi Academy Training Manual — description p.52, stat table p.52
- Canonical mechanic: Standard-damage lightsaber that improves successive Block checks in a round from the normal cumulative -5 to cumulative -2, but imposes -2 on Deflect checks.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: `block`
- Tradeoff tags: `deflect`
- Final tags: `lightsaber`, `melee`, `offense_melee`, `block`

**Relative to standard Lightsaber**

- Pros: Repeated Block checks degrade much more slowly: cumulative -2 instead of cumulative -5.
- Cons: Use the Force checks made with Deflect take a -2 penalty.
- Same/baseline-equivalent: 2d8 base damage.
- Recommendation fit: Prefer for Block-heavy defensive Jedi; avoid elevating it for Deflect-focused characters.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — It deals normal lightsaber melee damage.
- `block` — Its defining advantage directly improves repeated Block checks.

### 2. Dueling Lightsaber

- Identity: `lightsaber-chassis-dueling`
- Source: Jedi Academy Training Manual — description p.52, stat table p.52
- Canonical mechanic: Standard-damage curved-hilt lightsaber granting +1 equipment bonus on attacks of opportunity while wielded one-handed.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: `attack_of_opportunity`, `precision`
- Tradeoff tags: none
- Final tags: `lightsaber`, `melee`, `offense_melee`, `attack_of_opportunity`, `precision`

**Relative to standard Lightsaber**

- Pros: +1 equipment bonus on attacks of opportunity while wielded one-handed.
- Cons: Its special benefit is inactive when the qualifying one-handed condition is not met.
- Same/baseline-equivalent: 2d8 base damage.
- Recommendation fit: Prefer for one-handed Jedi builds that deliberately generate or capitalize on attacks of opportunity.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — It deals normal lightsaber melee damage.
- `attack_of_opportunity` — Its explicit special benefit applies to attacks of opportunity.
- `precision` — It grants a direct +1 equipment bonus to the qualifying attack roll.

### 3. Guard Shoto

- Identity: `lightsaber-chassis-guard-shoto`
- Source: Jedi Academy Training Manual — description p.50, stat table p.52
- Canonical mechanic: Defensive lightsaber tonfa granting +2 equipment bonus on Block and Deflect checks; a phrik-laced handle also resists lightsaber DR bypass, but base damage is only 2d4.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: `block`, `deflect`
- Tradeoff tags: none
- Final tags: `lightsaber`, `melee`, `offense_melee`, `block`, `deflect`

**Relative to standard Lightsaber**

- Pros: +2 equipment bonus to Block checks.; +2 equipment bonus to Deflect checks.; A phrik-laced handle prevents lightsabers from ignoring the weapon's DR.
- Cons: 2d4 base damage instead of the standard lightsaber's 2d8.
- Same/baseline-equivalent: none
- Recommendation fit: Strong defensive specialization when Block/Deflect reliability matters more than weapon damage.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — It remains an offensive melee lightsaber despite its defensive specialization.
- `block` — A proficient wielder gains +2 equipment bonus on Use the Force checks made with Block.
- `deflect` — A proficient wielder gains +2 equipment bonus on Use the Force checks made with Deflect.

Mechanics with no existing feat/talent tag:

- Lightsabers do not ignore the guard shoto's damage reduction. Condition: handle is phrik-laced. No certified feat/talent-used tag precisely represents resistance to lightsaber DR bypass.

### 4. Lightfoil

- Identity: `weapon-lightfoil`
- Source: Knights of the Old Republic Campaign Guide — description p.65, stat table p.64
- Canonical mechanic: One-handed 2d8 lightfoil that may count as Small whenever beneficial but cannot be wielded two-handed.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: none
- Tradeoff tags: none
- Final tags: `lightsaber`, `melee`, `offense_melee`

**Relative to standard Lightsaber**

- Pros: May be treated as a Small weapon whenever doing so is beneficial while retaining 2d8 base damage.
- Cons: Cannot be wielded two-handed.
- Same/baseline-equivalent: 2d8 base damage.
- Recommendation fit: Choose when a build gains a concrete benefit from Small-weapon classification and does not need two-handed wielding.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — It deals normal 2d8 lightsaber melee damage.

Mechanics with no existing feat/talent tag:

- May be treated as a Small weapon whenever beneficial. No certified feat/talent-used tag encodes beneficial weapon-size reclassification.

### 5. Lightfoil, Archaic

- Identity: `lightsaber-chassis-archaic-lightfoil`
- Source: Jedi Academy Training Manual — description p.50, stat table p.52
- Canonical mechanic: Archaic one-handed 2d8 lightfoil that may count as Small whenever beneficial but cannot be wielded two-handed.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: none
- Tradeoff tags: none
- Final tags: `lightsaber`, `melee`, `offense_melee`

**Relative to standard Lightsaber**

- Pros: May be treated as a Small weapon whenever beneficial while retaining 2d8 base damage.
- Cons: Cannot be wielded two-handed.
- Same/baseline-equivalent: 2d8 base damage.
- Recommendation fit: Same mechanical niche as the KOTOR-era Lightfoil: Small-weapon-classification utility without two-handed use.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — It deals 2d8 lightsaber melee damage.

Mechanics with no existing feat/talent tag:

- May be treated as a Small weapon whenever beneficial. No certified feat/talent-used tag encodes beneficial weapon-size reclassification.

### 6. Lightfoil, Modern

- Identity: `lightsaber-chassis-modern-lightfoil`
- Source: Jedi Academy Training Manual — description p.50, stat table p.52
- Canonical mechanic: Modern one-handed lightfoil that may count as Small whenever beneficial, cannot be wielded two-handed, and deals 2d6 base damage.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: none
- Tradeoff tags: none
- Final tags: `lightsaber`, `melee`, `offense_melee`

**Relative to standard Lightsaber**

- Pros: May be treated as a Small weapon whenever doing so is beneficial.
- Cons: 2d6 base damage instead of the standard lightsaber's 2d8.; Cannot be wielded two-handed.
- Same/baseline-equivalent: none
- Recommendation fit: Only prefer when Small-weapon classification materially benefits the build enough to justify lower damage and loss of two-handed use.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — It deals lightsaber melee damage.

Mechanics with no existing feat/talent tag:

- May be treated as a Small weapon whenever beneficial. No certified feat/talent-used tag encodes beneficial weapon-size reclassification.

### 7. Lightsaber

- Identity: `weapon-lightsaber`
- Source: Core Rulebook — description p.122, stat table p.122
- Canonical mechanic: Standard 2d8 Jedi lightsaber and comparison baseline for all Lightsaber-category recommendations.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: none
- Tradeoff tags: none
- Final tags: `lightsaber`, `melee`, `offense_melee`

**Relative to standard Lightsaber**

- Pros: This is the standard itself: 2d8 damage with no variant-specific penalty or specialization requirement.
- Cons: No variant-specific specialization bonus.
- Same/baseline-equivalent: Baseline identity.
- Recommendation fit: Default/fallback choice when no specialized lightsaber variant has a clearly supported advantage for the character.

Tag rationale:

- `lightsaber` — Canonical standard Lightsaber-group weapon.
- `melee` — Its canonical attack profile is melee.
- `offense_melee` — Its standard role is 2d8 melee offense.

### 8. Lightsaber Pike

- Identity: `lightsaber-chassis-pike`
- Source: Jedi Academy Training Manual — description p.53, stat table p.52
- Canonical mechanic: 2d8 reach lightsaber pike with phrik-alloy haft; +1 square reach, -2 Block/Deflect, and conditional double-weapon functionality with Long Haft Form.
- Shared tags: `lightsaber`, `melee`, `offense_melee`
- Advantage tags: `lightsaber_polearm`, `positioning`
- Tradeoff tags: `block`, `deflect`
- Final tags: `lightsaber`, `melee`, `offense_melee`, `lightsaber_polearm`, `positioning`

**Relative to standard Lightsaber**

- Pros: +1 square reach.; Phrik-alloy haft resists lightsaber DR bypass.; With Long Haft Form it can function as a double weapon with a 1d6 haft end.
- Cons: -2 on Use the Force checks made with Block.; -2 on Use the Force checks made with Deflect.
- Same/baseline-equivalent: 2d8 lightsaber-end base damage.
- Recommendation fit: Prefer for reach/polearm positioning builds, especially with Long Haft Form; penalize for Block/Deflect-centric defensive Jedi.

Tag rationale:

- `lightsaber` — Canonical Lightsaber-group weapon.
- `melee` — Its primary attack profile is melee.
- `offense_melee` — Its lightsaber end deals standard 2d8 melee damage.
- `lightsaber_polearm` — It is explicitly a lightsaber pike/polearm and this tag already exists in certified feat/talent semantics.
- `positioning` — Its +1 square reach directly changes attack/threat positioning.

Conditional synergy tags:

- `double_weapon` when wielder has Long Haft Form — Double-weapon functionality is conditional rather than intrinsic and therefore is not promoted into unconditional finalTags.

Mechanics with no existing feat/talent tag:

- Increases reach by 1 square. positioning captures the recommendation consequence, but no certified feat/talent-used tag precisely identifies intrinsic weapon reach.
- The phrik-alloy haft is not subject to lightsaber DR bypass. No certified feat/talent-used tag precisely represents resistance to lightsaber DR bypass.

## Claude implementation contract

Implement/update:

- `data/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.json`
- `docs/audits/item-weapons-phase-4b-lightsaber-semantic-rolling.md`

Claude must preserve the planner rulings exactly.

Verifier requirements:

- derive the allowed tag vocabulary from the certified feat/talent assignments;
- prove every value in every tag-bearing field is in that exact used vocabulary;
- reject any tag not already used by a certified feat or talent;
- reject any attempt to convert `unrepresentedMechanics` text into a tag;
- prove `finalTags` contains shared tags plus genuine positive specialization tags only;
- prove tradeoff-only tags are not promoted into `finalTags`;
- standard Lightsaber remains the recommendation baseline;
- no runtime or production mutation occurs;
- Phase 3D remains frozen.

Do not begin Round 2 until planner review.
