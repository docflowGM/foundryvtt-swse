# Phase 4B — Lightsabers Complete Planner Authority

**Status:** `WEAPON_TAG_PHASE_4B_LIGHTSABER_COMPLETE_PLANNER_AUTHORITY`

- **Canonical identities:** 16
- **Adjudicated:** 16/16
- **Repo-present:** 16
- **Repo-missing:** 0
- **Final semantic-tag assignments:** 74
- **Distinct final semantic tags:** 23
- **Remaining:** 0
- **Production mutation:** none

## QA correction

Short Lightsaber carries ranged/offense_ranged because frozen Phase 3B explicitly certifies thrown capability; this matches the Phase 4A treatment of intrinsically throwable Knife/Spear profiles.

The first eight semantic rulings remain unchanged. The only closeout correction is the Short Lightsaber ranged-role treatment required by frozen Phase 3B throwable authority and the established Phase 4A invariant.

## Assignments

### 1. Crossguard Lightsaber

- **Identity:** `lightsaber-chassis-crossguard`
- **Source:** Jedi Academy Training Manual — description p.52 / table p.52
- **Canonical mechanic:** Standard-damage lightsaber that improves successive Block checks in a round from the normal cumulative -5 to cumulative -2, but imposes -2 on Deflect checks.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `block`
- **Tradeoff tags:** `deflect`
- **exactIdentity:** `weapon:lightsaber-chassis-crossguard`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:crossguard-lightsaber`
- **explicit ability links:**
  - talent **Block** — `POSITIVE_WEAPON_MODIFIER`
  - talent **Deflect** — `NEGATIVE_WEAPON_MODIFIER`
- **Pros vs standard:** Repeated Block checks degrade much more slowly: cumulative -2 instead of cumulative -5.
- **Cons vs standard:** Use the Force checks made with Deflect take a -2 penalty.
- **Recommendation fit:** Prefer for Block-heavy defensive Jedi; avoid elevating it for Deflect-focused characters.

### 2. Dueling Lightsaber

- **Identity:** `lightsaber-chassis-dueling`
- **Source:** Jedi Academy Training Manual — description p.52 / table p.52
- **Canonical mechanic:** Standard-damage curved-hilt lightsaber granting +1 equipment bonus on attacks of opportunity while wielded one-handed.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `attack_of_opportunity`, `precision`
- **exactIdentity:** `weapon:lightsaber-chassis-dueling`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:dueling-lightsaber`
- **Pros vs standard:** +1 equipment bonus on attacks of opportunity while wielded one-handed.
- **Cons vs standard:** Its special benefit is inactive when the qualifying one-handed condition is not met.
- **Recommendation fit:** Prefer for one-handed Jedi builds that deliberately generate or capitalize on attacks of opportunity.

### 3. Guard Shoto

- **Identity:** `lightsaber-chassis-guard-shoto`
- **Source:** Jedi Academy Training Manual — description p.50 / table p.52
- **Canonical mechanic:** Defensive lightsaber tonfa granting +2 equipment bonus on Block and Deflect checks; a phrik-laced handle also resists lightsaber DR bypass, but base damage is only 2d4.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `block`, `deflect`
- **exactIdentity:** `weapon:lightsaber-chassis-guard-shoto`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:shoto`, `weapon-family:guard-shoto`
- **explicit ability links:**
  - talent **Shoto Focus** — `EXPLICIT_WEAPON_FAMILY_MATCH`
  - talent **Shoto Master** — `EXPLICIT_WEAPON_FAMILY_MATCH`
  - talent **Block** — `POSITIVE_WEAPON_MODIFIER`
  - talent **Deflect** — `POSITIVE_WEAPON_MODIFIER`
- **Pros vs standard:** +2 equipment bonus to Block checks. | +2 equipment bonus to Deflect checks. | A phrik-laced handle prevents lightsabers from ignoring the weapon's DR.
- **Cons vs standard:** 2d4 base damage instead of the standard lightsaber's 2d8.
- **Recommendation fit:** Strong defensive specialization when Block/Deflect reliability matters more than weapon damage.
- **Structured / unrepresented mechanics:**
  - `NO_EXISTING_FEAT_TALENT_TAG` — Lightsabers do not ignore the guard shoto's damage reduction. No certified feat/talent-used tag precisely represents resistance to lightsaber DR bypass.

### 4. Lightfoil

- **Identity:** `weapon-lightfoil`
- **Source:** Knights of the Old Republic Campaign Guide — description p.65 / table p.64
- **Canonical mechanic:** One-handed 2d8 lightfoil that may count as Small whenever beneficial but cannot be wielded two-handed.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`
- **exactIdentity:** `weapon:weapon-lightfoil`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:lightfoil`
- **Pros vs standard:** May be treated as a Small weapon whenever doing so is beneficial while retaining 2d8 base damage.
- **Cons vs standard:** Cannot be wielded two-handed.
- **Recommendation fit:** Choose when a build gains a concrete benefit from Small-weapon classification and does not need two-handed wielding.
- **Structured / unrepresented mechanics:**
  - `NO_EXISTING_FEAT_TALENT_TAG` — May be treated as a Small weapon whenever beneficial. No certified feat/talent-used tag encodes beneficial weapon-size reclassification.

### 5. Lightfoil, Archaic

- **Identity:** `lightsaber-chassis-archaic-lightfoil`
- **Source:** Jedi Academy Training Manual — description p.50 / table p.52
- **Canonical mechanic:** Archaic one-handed 2d8 lightfoil that may count as Small whenever beneficial but cannot be wielded two-handed.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`
- **exactIdentity:** `weapon:lightsaber-chassis-archaic-lightfoil`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:lightfoil`, `weapon-family:archaic-lightfoil`
- **Pros vs standard:** May be treated as a Small weapon whenever beneficial while retaining 2d8 base damage.
- **Cons vs standard:** Cannot be wielded two-handed.
- **Recommendation fit:** Same mechanical niche as the KOTOR-era Lightfoil: Small-weapon-classification utility without two-handed use.
- **Structured / unrepresented mechanics:**
  - `NO_EXISTING_FEAT_TALENT_TAG` — May be treated as a Small weapon whenever beneficial. No certified feat/talent-used tag encodes beneficial weapon-size reclassification.

### 6. Lightfoil, Modern

- **Identity:** `lightsaber-chassis-modern-lightfoil`
- **Source:** Jedi Academy Training Manual — description p.50 / table p.52
- **Canonical mechanic:** Modern one-handed lightfoil that may count as Small whenever beneficial, cannot be wielded two-handed, and deals 2d6 base damage.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`
- **exactIdentity:** `weapon:lightsaber-chassis-modern-lightfoil`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:lightfoil`, `weapon-family:modern-lightfoil`
- **Pros vs standard:** May be treated as a Small weapon whenever doing so is beneficial.
- **Cons vs standard:** 2d6 base damage instead of the standard lightsaber's 2d8. | Cannot be wielded two-handed.
- **Recommendation fit:** Only prefer when Small-weapon classification materially benefits the build enough to justify lower damage and loss of two-handed use.
- **Structured / unrepresented mechanics:**
  - `NO_EXISTING_FEAT_TALENT_TAG` — May be treated as a Small weapon whenever beneficial. No certified feat/talent-used tag encodes beneficial weapon-size reclassification.

### 7. Lightsaber

- **Identity:** `weapon-lightsaber`
- **Source:** Core Rulebook — description p.122 / table p.122
- **Canonical mechanic:** Standard 2d8 Jedi lightsaber and comparison baseline for all Lightsaber-category recommendations.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`
- **exactIdentity:** `weapon:weapon-lightsaber`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:standard-lightsaber`
- **Pros vs standard:** This is the standard itself: 2d8 damage with no variant-specific penalty or specialization requirement.
- **Cons vs standard:** No variant-specific specialization bonus.
- **Recommendation fit:** Default/fallback choice when no specialized lightsaber variant has a clearly supported advantage for the character.

### 8. Lightsaber Pike

- **Identity:** `lightsaber-chassis-pike`
- **Source:** Jedi Academy Training Manual — description p.53 / table p.52
- **Canonical mechanic:** 2d8 reach lightsaber pike with phrik-alloy haft; +1 square reach, -2 Block/Deflect, and conditional double-weapon functionality with Long Haft Form.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `lightsaber_polearm`, `positioning`
- **Tradeoff tags:** `block`, `deflect`
- **Conditional semantic:** `double_weapon` when wielder has Long Haft Form — Double-weapon functionality is conditional rather than intrinsic and therefore is not promoted into unconditional finalTags.
- **exactIdentity:** `weapon:lightsaber-chassis-pike`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:lightsaber-polearm`, `weapon-family:long-haft-compatible`
- **explicit ability links:**
  - feat **Long Haft Strike** — `UNLOCKS_DOUBLE_WEAPON_MODE`
  - talent **Block** — `NEGATIVE_WEAPON_MODIFIER`
  - talent **Deflect** — `NEGATIVE_WEAPON_MODIFIER`
- **Pros vs standard:** +1 square reach. | Phrik-alloy haft resists lightsaber DR bypass. | With Long Haft Form it can function as a double weapon with a 1d6 haft end.
- **Cons vs standard:** -2 on Use the Force checks made with Block. | -2 on Use the Force checks made with Deflect.
- **Recommendation fit:** Prefer for reach/polearm positioning builds, especially with Long Haft Form; penalize for Block/Deflect-centric defensive Jedi.
- **Structured / unrepresented mechanics:**
  - `NO_EXISTING_FEAT_TALENT_TAG` — Increases reach by 1 square. positioning captures the recommendation consequence, but no certified feat/talent-used tag precisely identifies intrinsic weapon reach.
  - `NO_EXISTING_FEAT_TALENT_TAG` — The phrik-alloy haft is not subject to lightsaber DR bypass. No certified feat/talent-used tag precisely represents resistance to lightsaber DR bypass.

### 9. Lightsaber, Archaic

- **Identity:** `lightsaber-chassis-archaic-lightsaber`
- **Source:** Jedi Academy Training Manual — description p.51 / table p.52
- **Canonical mechanic:** 2d6 archaic lightsaber powered by a special 600-credit external power pack worn on the belt or back and connected to the hilt by a cord. Force applied to the cord, including a disarm attempt, can disconnect it and disable the blade until reconnected.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`
- **exactIdentity:** `weapon:lightsaber-chassis-archaic-lightsaber`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:archaic-lightsaber`, `weapon-family:corded-lightsaber`
- **Cons vs standard:** 2d6 base damage instead of 2d8. | External power cord can be disconnected, disabling the weapon until restored.
- **Recommendation fit:** Primarily an era/flavor choice rather than a mechanical upgrade; recommend only when archaic equipment identity matters more than damage and reliability.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_CONFIGURATION_STATE` — External power cord can be disconnected by force applied to the cord, including a disarm attempt, causing the weapon to become unusable until reconnected. No certified semantic tag faithfully represents a cord-disconnection vulnerability.

### 10. Lightsaber, Double

- **Identity:** `weapon-double-bladed-lightsaber`
- **Source:** Core Rulebook — description p.123 / table p.122
- **Canonical mechanic:** Large 2d8/2d8 double-bladed lightsaber. One or both blades can be ignited. With both blades active it is a double weapon and can attack with both ends as a full-round action using normal double-weapon penalties.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `double_weapon`, `full_attack`
- **exactIdentity:** `weapon:weapon-double-bladed-lightsaber`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:double-bladed-lightsaber`, `weapon-family:double-weapon`
- **Pros vs standard:** Can function as a 2d8/2d8 double weapon when both blades are active. | Supports double-weapon full-attack builds.
- **Cons vs standard:** Large weapon using normal double-weapon penalties when attacking with both ends. | Requires two special energy cells.
- **Recommendation fit:** Prefer for characters explicitly invested in double-weapon/full-attack fighting; otherwise the standard lightsaber is simpler and less specialized.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_CONFIGURATION_STATE` — One or both blades can be ignited independently. Blade activation state determines whether double-weapon rules apply.

### 11. Lightsaber, Dual-Phase

- **Identity:** `lightsaber-chassis-dual-phase`
- **Source:** Jedi Academy Training Manual — description p.51 / table p.52
- **Canonical mechanic:** 2d8 lightsaber with a swift-action extended mode. Extended mode increases reach by 1 square but imposes -2 Reflex Defense against attacks from adjacent targets.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `positioning`, `swift_action`, `action_economy`
- **Tradeoff tags:** `defense`
- **exactIdentity:** `weapon:lightsaber-chassis-dual-phase`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:dual-phase-lightsaber`, `weapon-family:variable-reach-lightsaber`
- **Pros vs standard:** Swift-action extended mode grants +1 square reach.
- **Cons vs standard:** While extended, Reflex Defense is -2 against attacks from adjacent targets.
- **Recommendation fit:** Prefer for positioning/reach builds that can manage the adjacent-defense drawback and make good use of swift-action mode changes.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_MODE_STATE` — Extended mode gives +1 square reach and -2 Reflex Defense against adjacent attackers. positioning/action tags capture recommendation role; exact defense penalty remains mode-specific.

### 12. Lightsaber, Great

- **Identity:** `lightsaber-chassis-great`
- **Source:** Jedi Academy Training Manual — description p.53 / table p.52
- **Canonical mechanic:** Large 2d10 oversized lightsaber. Only Large or larger creatures can use it in conjunction with feats or talents that affect light weapons or lightsabers, such as Weapon Finesse.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`
- **exactIdentity:** `weapon:lightsaber-chassis-great`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:great-lightsaber`, `weapon-family:oversized-lightsaber`
- **selector guardrail:** Do not infer `damage_bonus` solely from the printed 2d10 base dice.
- **selector guardrail:** Feat/talent eligibility keyed to light weapons or lightsabers is size-gated to Large-or-larger wielders.
- **Pros vs standard:** 2d10 base damage instead of 2d8.
- **Cons vs standard:** Only Large or larger wielders can combine it with feats/talents that affect light weapons or lightsabers.
- **Recommendation fit:** High-base-damage option for Large+ wielders; de-prioritize for smaller characters or builds relying on light-weapon/lightsaber feat interactions.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_WIELDER_SIZE_ELIGIBILITY` — Only Large or larger creatures can use the weapon with feats/talents that affect light weapons or lightsabers. This is an applicability gate, not a semantic tag.

### 13. Lightsaber, Short

- **Identity:** `lightsaber-chassis-short`
- **Source:** Core Rulebook — description p.123 / table p.122
- **Canonical mechanic:** Small 2d6 shoto lightsaber favored by Small Jedi and often used as an off-hand weapon. The source grants no intrinsic off-hand attack bonus; its major build value comes through shoto-specific abilities.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `ranged`, `offense_ranged`
- **exactIdentity:** `weapon:lightsaber-chassis-short`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:shoto`, `weapon-family:short-lightsaber`, `weapon-family:throwable-melee`
- **explicit ability links:**
  - talent **Shoto Focus** — `EXPLICIT_WEAPON_FAMILY_MATCH`
  - talent **Shoto Master** — `EXPLICIT_WEAPON_FAMILY_MATCH`
- **selector guardrail:** Do not add `dual_wield` to the weapon itself; the source grants no intrinsic two-weapon bonus.
- **selector guardrail:** Do not add a `thrown` semantic tag; thrown capability is structural while `ranged`/`offense_ranged` capture its build-facing ranged role.
- **Pros vs standard:** Small shoto identity enables explicit Shoto Focus and Shoto Master interactions. | Frozen Phase 3B certifies intrinsic thrown capability, giving it a ranged fallback profile.
- **Cons vs standard:** 2d6 base damage instead of 2d8.
- **Recommendation fit:** Prefer for shoto/off-hand builds specifically supported by Shoto Focus or Shoto Master; do not recommend merely because flavor text mentions two-weapon fighting.

### 14. Lightwhip

- **Identity:** `lightsaber-chassis-lightwhip`
- **Source:** Jedi Academy Training Manual — description p.53 / table p.52
- **Canonical mechanic:** 2d4 reach-2 lightsaber whip. On a hit it can initiate a grab or grapple. A held target can escape with DC 15 Acrobatics; Pin and Trip are allowed, Crush and Throw are prohibited. A target ending its turn held by the lightwhip takes the weapon's unmodified base damage again.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `positioning`, `grab`, `grapple`, `restrain`, `control`, `battlefield_control`, `sustained_damage`
- **exactIdentity:** `weapon:lightsaber-chassis-lightwhip`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:lightwhip`, `weapon-family:reach-lightsaber`, `weapon-family:grab-weapon`
- **explicit ability links:**
  - feat **Pin** — `SUPPORTED`
  - feat **Trip** — `SUPPORTED`
  - feat **Crush** — `PROHIBITED`
  - feat **Throw** — `PROHIBITED`
- **Pros vs standard:** Reach 2 squares. | Can initiate grab or grapple on a hit. | Supports Pin and Trip. | Held targets take recurring base damage at end of their turns.
- **Cons vs standard:** 2d4 base damage instead of 2d8. | Crush and Throw cannot be used with it.
- **Recommendation fit:** Strong control/reach option for grab, grapple, Pin, Trip, and sustained restraint builds; poor for raw weapon-damage builds.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_ESCAPE_RULE` — Held target can escape with DC 15 Acrobatics. The target's escape method is not a user-build semantic tag.
  - `STRUCTURED_TRIGGERED_DAMAGE` — End-turn recurring damage uses only the weapon's base damage and excludes Strength, half heroic level, and all other modifiers. Exact modifier exclusions must be preserved.

### 15. Long-Handle Lightsaber

- **Identity:** `lightsaber-chassis-longhandle`
- **Source:** Jedi Academy Training Manual — description p.53 / table p.52
- **Canonical mechanic:** 2d8 long-handle lightsaber. When wielded two-handed, the wielder may forgo doubling Strength bonus to damage and instead increase base damage to 2d10. Long Haft Strike (called Long Haft Form in the equipment text) conditionally enables a 1d6 haft-end double-weapon mode.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `damage_bonus`
- **Conditional semantic:** `double_weapon` when wielder has Long Haft Strike (called Long Haft Form in equipment text) — Double-weapon functionality is feat-gated and therefore not unconditional.
- **exactIdentity:** `weapon:lightsaber-chassis-longhandle`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:long-handle-lightsaber`, `weapon-family:long-haft-compatible`
- **explicit ability links:**
  - feat **Long Haft Strike** — `UNLOCKS_DOUBLE_WEAPON_MODE`
- **Pros vs standard:** When wielded two-handed, can choose a 2d10 base-damage profile instead of doubled Strength bonus. | With Long Haft Strike/Form it can function as a double weapon with a 1d6 haft end.
- **Cons vs standard:** The 2d10 option explicitly gives up the normal doubled Strength bonus from two-handed wielding.
- **Recommendation fit:** Prefer for two-handed Jedi whose Strength and build make the 2d10 alternate profile favorable, especially if they also have Long Haft Strike.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_WIELDING_CHOICE` — Two-handed wielder chooses between normal base damage with doubled Strength bonus or 2d10 base damage without doubled Strength bonus. Exact comparison depends on wielder Strength; do not treat 2d10 as universally superior.
  - `SOURCE_UNSPECIFIED` — Haft-end damage type is not stated by the source. Do not infer bludgeoning or lightsaber DR bypass for the haft end.

### 16. Retrosaber

- **Identity:** `lightsaber-chassis-retrosaber`
- **Source:** Jedi Academy Training Manual — description p.50 / table p.None
- **Canonical mechanic:** 2d8 corded lightsaber with a three-state output cycle. As a swift action it overcharges to 2d10 until the end of the wielder's next turn, then is forced to 2d4 for one round before returning to normal; overcharge cannot be reactivated during burnout.
- **Final tags:** `lightsaber`, `melee`, `offense_melee`, `swift_action`, `action_economy`, `damage_bonus`, `burst_damage`
- **Tradeoff tags:** `sustained_damage`
- **exactIdentity:** `weapon:lightsaber-chassis-retrosaber`
- **weaponGroup:** `weapon-group:lightsaber`
- **proficiency:** `weapon-proficiency:lightsabers`
- **families:** `weapon-family:retrosaber`, `weapon-family:corded-lightsaber`, `weapon-family:variable-output-lightsaber`
- **Pros vs standard:** Swift-action overcharge raises base damage from 2d8 to 2d10 through the end of the wielder's next turn.
- **Cons vs standard:** After overcharge, base damage is forced down to 2d4 for one round. | Cannot overcharge again during the burnout round.
- **Recommendation fit:** Burst-damage lightsaber for characters who can exploit a planned damage window and tolerate a forced low-output recovery round.
- **Structured / unrepresented mechanics:**
  - `STRUCTURED_STATE_MACHINE` — State machine: normal 2d8 -> swift-action overcharge 2d10 -> forced one-round burnout 2d4 -> normal; burnout locks out re-overcharge. Exact transition timing must remain structured.
  - `STRUCTURED_CONSTRUCTION_RULE` — Construction DC 25. Construction difficulty is not promoted into semantic tags.

## Claude implementation contract

- Preserve planner semantic rulings exactly.
- Validate every tag-bearing field against the frozen certified-used feat/talent vocabulary.
- Keep rule selectors out of `system.tags`.
- Preserve exact profile/mode/configuration/ability interactions.
- Do not mutate `packs/weapons.db` or `template.json` during semantic certification.
- Do not claim repository certification until implementation and verification actually pass.
