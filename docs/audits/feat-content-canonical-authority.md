# SWSE Feat Rehab - Rolling Authority

Updated: 2026-10-03

## Operating model

- Books were processed from the fewest full feat publications to the most.
- Content, provenance, tags, and automation are certified independently.
- Published TXT is the fast text authority; PDF/source-index verification governs page ambiguity.
- Official errata/clarifications supersede conflicting first-printing text where source-verified.
- The repository is a comparison target, not the definition of canon.
- Secondary indexes can support taxonomy/census cross-checks but do not override primary rules text.

## Phase plan

| Phase | Purpose | Status |
|---|---|---|
| CONTENT | Canonical benefit/description/prerequisites/summary text, book by book | `COMPLETE_SOURCE_BY_SOURCE_AUTHORITY_REVIEW` |
| PROVENANCE | Primary source, printed page, reprints/references, cross-domain identity provenance | `PENDING` |
| TAGS | Canonical semantic taxonomy derived from what the feat actually does | `PENDING` |
| AUTOMATION | Compare runtime implementation against certified rules; classify correct/partial/manual/missing/wrong | `PENDING` |

## Prerequisite-tier guiding model

- Tier measures feat-dependency depth, not minimum character level.
- A feat with no feat prerequisite is Tier 1 even if it has BAB, level, ability-score, species, trained-skill, class, talent, or other non-feat gates.
- A feat that requires a Tier 1 feat is Tier 2; a feat that requires a Tier 2 feat is Tier 3; continue recursively.
- For mandatory multiple feat prerequisites, tier is driven by the deepest required feat dependency.
- For alternative prerequisite paths, preserve the full prerequisite graph first; do not flatten inherited prerequisites into the printed prerequisite string.
- Printed prerequisite text remains literal source text. Inherited prerequisites are represented by graph traversal rather than repeated in descendant feat records.

Examples:
- **Double Attack - Tier 1**: BAB +6 is a non-feat gate; no feat prerequisite.
- **Triple Attack - Tier 2**: Requires Double Attack.
- **Quick Draw - Tier 1**: No feat prerequisite.
- **Lightning Draw - Tier 2**: Requires Quick Draw.
- **Knife Trick - Tier 3**: Requires Lightning Draw; Quick Draw is inherited through Lightning Draw.

## Book order

| # | Source | Full feat publications | Notes |
|---:|---|---:|---|
| 1 | Starships of the Galaxy | 4 | 3 new identities + Tech Specialist full reprint |
| 2 | Threats of the Galaxy | 4 | 4 new identities |
| 3 | Jedi Academy Training Manual | 5 | 5 new identities |
| 4 | Scavenger's Guide to Droids | 17 | 17 new identities |
| 5 | Legacy Era Campaign Guide | 19 | 19 new identities |
| 6 | Knights of the Old Republic Campaign Guide | 21 | 21 new identities |
| 7 | The Force Unleashed Campaign Guide | 21 | 21 new identities |
| 8 | Clone Wars Campaign Guide | 21 | 21 new identities |
| 9 | Unknown Regions | 21 | 21 new identities |
| 10 | Galaxy of Intrigue | 26 | 26 new identities |
| 11 | Scum and Villainy | 27 | 27 new identities |
| 12 | Galaxy at War | 42 | 41 new identities + 1 full reprint |
| 13 | Rebellion Era Campaign Guide | 60 | 60 identities, including 48 species feats |
| 14 | Saga Edition Core Rulebook | 64 | 64 identities |

## Content-phase closeout

- Status: **COMPLETE**
- Books completed: **14**
- Official Web source pass completed: **Yes**
- Full feat publications reviewed: **355**
- Canonical feat identities represented: **353**
- Confirmed full reprints: **2**
- Current repo canonical identities represented: **351 / 353**
- Missing canonical repo identities: **2** - Recall - The Force Unleashed Campaign Guide p.35; Staggering Attack - Scum and Villainy p.24
- Next phase: **PROVENANCE**

## Book 1 - Starships of the Galaxy

Full feat publications: **4**; new canonical identities: **3**; reprints: **1**.


### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Starship Designer | 20 | `GENERAL` | Tech Specialist, trained in the Mechanics skill. | - | `CANONICAL_BASE_TEXT_PRESENT_REPO_SUPPLEMENT_REVIEW` |  |
| Starship Tactics | 20 | `GENERAL` | Vehicular Combat, trained in the Pilot skill. | - | `DESCRIPTION_ERROR` |  |
| Tactical Genius | 21 | `GENERAL` | Starship Tactics, Vehicular Combat, trained in the Pilot skill. | - | `CANONICAL_TEXT_MATCHES_RULE` |  |
| Tech Specialist | 3 | `GENERAL` | Trained in the Mechanics skill. | - | `CANONICAL_BASE_TEXT_PRESENT_REPRINT_PROVENANCE_REVIEW` |  |

### Detailed rules and repository findings

#### Starship Designer

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Tech Specialist, trained in the Mechanics skill.
- Design a starship from scratch using the printed time/DC/cost scaling procedure.
- Other Mechanics-trained characters can Aid Another; additional Starship Designer holders reduce effective cost for design-time calculation.
- Starship modifications are never treated as nonstandard modifications.
- Custom modifications use the printed 5,000-credit base, size modifier, DC 25 Mechanics check, retry escalation, installation time, repeated-customization cost/DC escalation, three-customization limit, and stacking rule.
- Printed examples: Add Emplacement, Improve Hull, Improve Hyperdrive, Improve Shields, Improve Weapons.
- **Repository finding:** Prior repository audit found the base description preserves the printed Starships procedure. Any appended Jedi Counseling/web discussion is supplemental material and must not be treated as part of the Starships p.20 canonical text without separate provenance certification.
- **Provenance observation:** current `Starships of the Galaxy p.30` -> canonical `Starships of the Galaxy p.20` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `starship`, `vehicle`, `mechanics`, `tech`, `design`, `customization`, `crafting`, `downtime`
- **Automation observation for later phase:** Manual/reference handling is a defensible ceiling for open-ended ship design, but the player-facing implementation should expose the concrete printed procedure rather than a vague punt.

#### Starship Tactics

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Vehicular Combat, trained in the Pilot skill.
- Add starship maneuvers equal to 1 + Wisdom modifier, minimum 1.
- The same maneuver may be added more than once.
- The feat is repeatable; each copy grants another 1 + Wisdom modifier maneuvers, minimum 1.
- If Wisdom modifier permanently increases, immediately gain additional maneuvers equal to the number of Starship Tactics feats possessed.
- **Repository finding:** Current description omits the permanent-Wisdom-increase lifecycle clause. Prior audit also notes a Gunnery Specialist exception from Clone Wars is supplemental cross-book material, not part of the printed Starships feat text.
- **Provenance observation:** current `Starships of the Galaxy p.30` -> canonical `Starships of the Galaxy p.20` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `starship`, `vehicle`, `pilot`, `maneuver`, `progression`, `repeatable`, `resource`
- **Automation observation for later phase:** Current grant/unlock metadata has the right general shape, but full picker behavior, repeatable grant accounting, permanent-Wisdom increase handling, and any later Gunnery Specialist restriction require end-to-end verification.

#### Tactical Genius

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Starship Tactics, Vehicular Combat, trained in the Pilot skill.
- Regain all spent starship maneuvers at the end of any round in which you roll a natural 20 on an attack roll.
- Normal rule reminder: only a natural 20 on a Pilot check to activate a starship maneuver normally restores all starship maneuvers.
- **Repository finding:** Prior source comparison found the current description preserves the attack-roll trigger and end-of-round timing.
- **Provenance observation:** current `Starships of the Galaxy p.30` -> canonical `Starships of the Galaxy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `starship`, `vehicle`, `maneuver`, `resource_recovery`, `natural_20`, `attack_trigger`, `pilot`
- **Automation observation for later phase:** Metadata describes the correct trigger, but runtime must prove attack natural-20 detection, end-of-round timing, and spent-maneuver recovery before automation can be certified.

#### Tech Specialist

- **Publication category:** `GENERAL`
- **Identity role:** `FULL_REPRINT_EXISTING_CANONICAL_IDENTITY`
- **Canonical prerequisites:** Trained in the Mechanics skill.
- **Repository finding:** Prior source comparison found the base description faithful. Any appended Scum and Villainy clarification is supplemental and needs its own provenance. Starships is a full reprint, not the primary identity source.
- **Primary provenance:** `Saga Edition Web Enhancement 1 - The Tech Specialist p.3`.
- **Current repo provenance:** `Saga Edition Core Rulebook p.88` (`PRIMARY_SOURCE_AND_PAGE_ERROR`).
- **Tag candidates for later phase:** `tech`, `mechanics`, `crafting`, `equipment`, `armor`, `weapon`, `droid`, `vehicle`, `customization`
- **Automation observation for later phase:** A customization service exists, but current audits do not certify full downtime procedure fidelity, all cross-category trait behavior, or Selective Fire restrictions.

---

## Book 2 - Threats of the Galaxy

Full feat publications: **4**; new canonical identities: **4**; reprints: **0**.

- All four canonical identities are present in the repository with the correct sourcebook but incorrect page provenance.
- Momentum Strike and Mounted Defense are explicitly published under NEW RIDING FEATS; that source heading is publication metadata, not automatic semantic-tag authority.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| A Few Maneuvers | 64 | `GENERAL` | Dodge, Vehicular Combat. | - | `CANONICAL_TEXT_MATCHES_RULE` | Improve a piloted Colossal-or-smaller vehicle's Reflex Defense and cause badly missed missiles or torpedoes to self-destruct. |
| Suppression Fire | 91 | `GENERAL` | Strength 13, Burst Fire, Weapon Proficiency (heavy weapons). | - | `CANONICAL_TEXT_MATCHES_RULE` | Successful suppressive Aid Another can force a lower-level enemy to seek cover on its next turn. |
| Momentum Strike | 127 | `RIDING_FEAT` | Trained in the Pilot or Ride skill. | - | `CANONICAL_TEXT_MATCHES_RULE` | After your mount or speeder bike moves at least its speed, your melee attacks deal +1 die of damage. |
| Mounted Defense | 127 | `RIDING_FEAT` | Trained in the Pilot or Ride skill. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter while mounted, redirect an attack against you to your beast or speeder bike after the roll but before effects resolve. |

### Detailed rules and repository findings

#### A Few Maneuvers

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dodge, Vehicular Combat.
- **Canonical quick summary:** Improve a piloted Colossal-or-smaller vehicle's Reflex Defense and cause badly missed missiles or torpedoes to self-destruct.
- While piloting a Colossal-or-smaller vehicle, grant that vehicle a +2 dodge bonus to Reflex Defense.
- If a missile or torpedo attack targeting you misses by 5 or more, the projectile self-destructs harmlessly.
- **Repository finding:** Source comparison finds the published description faithful.
- **Provenance observation:** current `Threats of the Galaxy p.20` -> canonical `Threats of the Galaxy p.64` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `vehicle`, `starship`, `pilot`, `defense`, `dodge`, `missile`, `torpedo`
- **Automation observation for later phase:** Existing effect description matches the rule, but eligibility and piloting/vehicle context are not fully structured.

#### Suppression Fire

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13, Burst Fire, Weapon Proficiency (heavy weapons).
- **Canonical quick summary:** Successful suppressive Aid Another can force a lower-level enemy to seek cover on its next turn.
- When using Aid Another to impose a penalty on an enemy's attack rolls, compare your attack roll to that enemy's Will Defense.
- On success, that enemy must end its next turn in cover from you if possible.
- Targets whose level is equal to or higher than your character level are immune.
- This is a mind-affecting fear effect.
- **Repository finding:** Published description is faithful; the main gap is metadata/runtime completeness.
- **Provenance observation:** current `Threats of the Galaxy p.21` -> canonical `Threats of the Galaxy p.91` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `heavy_weapon`, `aid_another`, `suppression`, `fear`, `mind_affecting`, `cover`
- **Automation observation for later phase:** Current metadata captures most of the procedure but omits immunity for targets of equal or higher character level; prerequisites are not fully structured.

#### Momentum Strike

- **Publication category:** `RIDING_FEAT`
- **Canonical prerequisites:** Trained in the Pilot or Ride skill.
- **Canonical quick summary:** After your mount or speeder bike moves at least its speed, your melee attacks deal +1 die of damage.
- While riding a beast or speeder bike, as passenger or pilot, add +1 die of damage to melee attacks if the mount or vehicle has already moved at least its speed this turn.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Threats of the Galaxy p.20` -> canonical `Threats of the Galaxy p.127` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `mounted`, `riding`, `speeder_bike`, `melee`, `damage`, `pilot`, `ride`
- **Automation observation for later phase:** Current payload reflects the extra damage die, but context must remain beast/speeder-specific and allow passenger or pilot; Pilot-or-Ride qualification is not structured.

#### Mounted Defense

- **Publication category:** `RIDING_FEAT`
- **Canonical prerequisites:** Trained in the Pilot or Ride skill.
- **Canonical quick summary:** Once per encounter while mounted, redirect an attack against you to your beast or speeder bike after the roll but before effects resolve.
- While riding a beast or speeder bike, as passenger or pilot, once per encounter redirect an attack made against you to the mount or vehicle.
- Choose to redirect after the attack roll result is known but before damage or other effects resolve.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Threats of the Galaxy p.20` -> canonical `Threats of the Galaxy p.127` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `mounted`, `riding`, `speeder_bike`, `defense`, `reaction`, `redirection`, `pilot`, `ride`
- **Automation observation for later phase:** Manual redirection is appropriate, but eligibility and mounted-context enforcement are not fully structured.

---

## Book 3 - Jedi Academy Training Manual

Full feat publications: **5**; new canonical identities: **5**; reprints: **0**.

- All five canonical identities exist, but all five have incorrect page provenance.
- Long Haft Strike is the major content defect: the repository description contains explicit homebrew material mixed into the canonical feat.
- Three extra records currently attributed to JATM are not JATM feat identities: Fast Surge, Intuitive Initiative, and Keen Force Mind.

### Repo records wrongly attributed to this book

| Record | Ruling | Canonical identity |
|---|---|---|
| Fast Surge | `WRONG_SOURCE` | Rebellion Era Campaign Guide p.29 feat |
| Intuitive Initiative | `WRONG_DOMAIN_SPECIES_TRAIT` | Core Rulebook Cerean species trait |
| Keen Force Mind | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Follow Through | 23 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement. |
| Force Regimen Mastery | 23 | `GENERAL` | Force Sensitivity, trained in the Use the Force skill. | - | `CANONICAL_TEXT_MATCHES_RULE` | Learn 1 + Wisdom modifier Force regimens (minimum 1); repeatable, with permanent Wisdom increases granting more regimens per copy. |
| Long Haft Strike | 23 | `GENERAL` | Proficient with weapon used. | - | `DESCRIPTION_ERROR_CONTAMINATED_WITH_HOMEBREW` | Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends. |
| Relentless Attack | 23 | `GENERAL` | Proficient with weapon used, Double Attack with weapon used. | - | `DESCRIPTION_ERROR` | For a chosen Double Attack weapon group/exotic weapon, a miss grants +2 on your next attack against that target before the end of your next turn. |
| Unswerving Resolve | 24 | `GENERAL` | Base attack bonus +2. | - | `CANONICAL_TEXT_MATCHES_RULE` | Resist a fear or mind-affecting effect to gain a temporary Force Point until the end of your next turn, unless you negated the effect. |

### Detailed rules and repository findings

#### Follow Through

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Drop an enemy with a melee attack to immediately move up to your speed once per turn; Cleave can occur after that movement.
- If a melee attack reduces an opponent to 0 hit points, immediately move up to your speed.
- Usable once per turn.
- If you have Cleave, you may move up to your speed before making Cleave's extra melee attack.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Jedi Academy Training Manual p.28` -> canonical `Jedi Academy Training Manual p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `movement`, `mobility`, `cleave`, `action_sequence`
- **Automation observation for later phase:** Main movement rider exists, but the Cleave sequencing clause is absent from the inspected runtime payload.

#### Force Regimen Mastery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Force Sensitivity, trained in the Use the Force skill.
- **Canonical quick summary:** Learn 1 + Wisdom modifier Force regimens (minimum 1); repeatable, with permanent Wisdom increases granting more regimens per copy.
- Learn Force regimens equal to 1 + Wisdom modifier, minimum 1.
- Repeatable; each copy grants another 1 + Wisdom modifier regimens, minimum 1.
- If Wisdom modifier permanently increases, immediately gain additional regimens equal to the number of copies of this feat possessed.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Jedi Academy Training Manual p.31` -> canonical `Jedi Academy Training Manual p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force`, `force_regimen`, `progression`, `wisdom`, `repeatable`, `choice`
- **Automation observation for later phase:** Description is faithful, but current ownership/taxonomy is wrong and metadata does not prove the repeatable/permanent-Wisdom lifecycle exactly.

#### Long Haft Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** Treat a lightsaber pike or long-handle lightsaber as a double weapon and attack with both ends.
- When using a lightsaber pike or long-handle lightsaber, you may attack with both ends and treat the weapon as a double weapon.
- Use the individual weapon description for two-ended attack details.
- **Repository finding:** Current description says prerequisite None and appends a large block explicitly labeled Homebrew Long Haft Strike Data. Canonical source text must be separated from optional/homebrew content.
- **Provenance observation:** current `Jedi Academy Training Manual p.29` -> canonical `Jedi Academy Training Manual p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `lightsaber`, `weapon_property`, `double_weapon`, `lightsaber_pike`, `long_handle_lightsaber`
- **Automation observation for later phase:** Current property override is close to RAW but does not visibly enforce proficiency.

#### Relentless Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used, Double Attack with weapon used.
- **Canonical quick summary:** For a chosen Double Attack weapon group/exotic weapon, a miss grants +2 on your next attack against that target before the end of your next turn.
- Choose one weapon group or exotic weapon for which you have Double Attack.
- After missing a target with that weapon, gain +2 competence on your next attack against that same target made before the end of your next turn.
- Repeatable; each selection applies to a different weapon group or exotic weapon.
- **Repository finding:** Current description omits proficiency with the weapon used.
- **Provenance observation:** current `Jedi Academy Training Manual p.30` -> canonical `Jedi Academy Training Manual p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack`, `weapon_choice`, `double_attack`, `miss_trigger`, `competence_bonus`, `repeatable`
- **Automation observation for later phase:** Runtime metadata captures the weapon choice but not the miss-triggered bonus, target/duration, or repeat-selection behavior.

#### Unswerving Resolve

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +2.
- **Canonical quick summary:** Resist a fear or mind-affecting effect to gain a temporary Force Point until the end of your next turn, unless you negated the effect.
- When a fear or mind-affecting effect targets you and fails to affect you, gain a temporary Force Point.
- The temporary Force Point expires at the end of your next turn if unused.
- If you negate the contingent effect in any way, such as rebuke, you do not gain this benefit.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Jedi Academy Training Manual p.31` -> canonical `Jedi Academy Training Manual p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `will`, `fear`, `mind_affecting`, `force_point`, `temporary_resource`
- **Automation observation for later phase:** Current trigger and expiration are represented, but the explicit no-benefit-if-negated clause is not clearly encoded.

---

## Book 4 - Scavenger's Guide to Droids

Full feat publications: **17**; new canonical identities: **17**; reprints: **0**.

- All 17 canonical identities are present and attributed to the correct book.
- Five records already have the exact canonical printed page; 12 have page mismatches.
- Logic Upgrade: Skill Swap is the most serious semantic/runtime error: RAW explicitly says the swapped-in skill remains untrained, while the current implementation treats it as trained.
- Pinpoint Accuracy contains an internal source conflict between its summary table and detailed Benefit; the detailed Benefit is retained as current text, with the conflict recorded rather than silently resolved.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Aiming Accuracy | 22 | `GENERAL` | Droid, Point Blank Shot, Precise Shot, proficient with weapon. | - | `DESCRIPTION_ERROR` | Spend a full round aiming to gain +5 on your next attack against the same visible target in the following round. |
| Damage Conversion | 22 | `GENERAL` | Droid, Dexterity 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Trade a condition-track step from a qualifying hit for extra damage, increasing the extra damage with repeated use. |
| Distracting Droid | 22 | `GENERAL` | Droid. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Persuasion in a 6-square area to cost enemies a move action and potentially make them flat-footed. |
| Droid Focus | 22 | `GENERAL` | Trained in the Mechanics and Use Computer skills. | - | `CANONICAL_TEXT_MATCHES_RULE` | Choose a droid degree and gain +1 on several interactions with it plus +1 defenses against it; repeatable for different degrees. |
| Droid Shield Mastery | 22 | `GENERAL` | Droid, equipped with shield generator. | - | `CANONICAL_TEXT_MATCHES_RULE` | Automatically recharge 5 SR and do it in two swift actions instead of three with a check. |
| Erratic Target | 22 | `GENERAL` | Droid, equipped with hovering locomotion or flying locomotion, Dexterity 13, Dodge. | - | `CANONICAL_TEXT_MATCHES_RULE` | Trade up to 2 squares of speed for an equal Dodge bonus until your next turn, provided you still move at least 2 squares. |
| Ion Shielding | 22 | `GENERAL` | Droid with Strength 13, or cyborg with Constitution 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Qualifying ion damage moves you only one step down the condition track instead of two. |
| Logic Upgrade: Skill Swap | 22 | `GENERAL` | Droid, equipped with basic processor. | - | `DESCRIPTION_ERROR_MAJOR_MECHANICS_CONTRADICTION` | Temporarily exchange access to a trained skill for an untrained skill, but the swapped-in skill remains untrained. |
| Mechanical Martial Arts | 24 | `GENERAL` | Droid, Martial Arts I, base attack bonus +1. | - | `CANONICAL_TEXT_MATCHES_RULE` | An unarmed hit imposes -5 melee attack and damage; an AoO against an organic enemy uses a different duration. |
| Multi-Targeting | 24 | `GENERAL` | Droid, Intelligence 13, proficient with weapon. | - | `DESCRIPTION_ERROR` | Maintain an aim across rounds and attack other targets while setting it up, but lose the aim if the subject leaves line of sight. |
| Pincer | 24 | `GENERAL` | Droid, equipped with claw or hand appendage, base attack bonus +1, Pin, Crush. | - | `CANONICAL_TEXT_MATCHES_RULE` | Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks. |
| Pinpoint Accuracy | 24 | `GENERAL` | Droid, Aiming Accuracy, Point Blank Shot, Precise Shot, proficient with weapon. | - | `SOURCE_INTERNAL_CONFLICT` | Detailed text blocks Recover after damage with Aiming Accuracy, but the book's summary table contradicts it with a condition-track effect. |
| Sensor Link | 24 | `GENERAL` | Droid, or cyborg with qualifying built-in cybernetic sensors and communications gear. | - | `CANONICAL_TEXT_MATCHES_RULE` | Broadcast your sensor feed within 24 squares so an ally can share awareness and aid Perception; mutual Sensor Link grants +2 Perception. |
| Shield Surge | 25 | `GENERAL` | Droid or cyborg with scomp link or similar direct data link with the vehicle, trained in Mechanics. | - | `CANONICAL_TEXT_MATCHES_RULE` | Spend remaining vehicle shield rating one-for-one as a reaction to reduce incoming damage, then delay shield recharge for one round. |
| Slammer | 25 | `GENERAL` | Small or larger droid, at least two suitable appendages, Strength 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Make a special standard-action unarmed slam with double Strength bonus and a persistent-condition rider; Crush adds one damage die. |
| Tool Frenzy | 25 | `GENERAL` | Small or larger droid, at least two appendages with tools mounted. | - | `CANONICAL_TEXT_MATCHES_RULE` | Make a +2 unarmed tool-appendage attack using the best appendage damage die, at -2 Reflex until the end of your next turn. |
| Turn and Burn | 25 | `GENERAL` | Droid, equipped with hovering, flying, wheeled, or tracked locomotion, Dexterity 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent. |

### Detailed rules and repository findings

#### Aiming Accuracy

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, Point Blank Shot, Precise Shot, proficient with weapon.
- **Canonical quick summary:** Spend a full round aiming to gain +5 on your next attack against the same visible target in the following round.
- Aim at a target as a full-round action instead of two swift actions.
- Gain +5 on your next attack in the following round against that target.
- The target must remain in your line of sight.
- **Repository finding:** Current description omits proficient with weapon from the prerequisite line.
- **Provenance observation:** current `Scavenger's Guide to Droids p.18` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `ranged`, `aim`, `accuracy`, `weapon_proficiency`, `line_of_sight`
- **Automation observation for later phase:** Current metadata has the full-round aim/+5 concept but does not visibly preserve all same-target, following-round, LOS, and proficiency state.

#### Damage Conversion

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, Dexterity 13.
- **Canonical quick summary:** Trade a condition-track step from a qualifying hit for extra damage, increasing the extra damage with repeated use.
- When a non-area, non-ion, non-Force attack meets or exceeds your damage threshold, take 10 additional damage instead of moving down the condition track.
- Each later use in the same encounter increases the additional damage by 5.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.19` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `defense`, `damage_threshold`, `condition_track`, `damage_conversion`, `encounter_scaling`
- **Automation observation for later phase:** Description and threshold-conversion metadata are faithful.

#### Distracting Droid

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid.
- **Canonical quick summary:** Use Persuasion in a 6-square area to cost enemies a move action and potentially make them flat-footed.
- As a standard action, make Persuasion against the Will Defense of enemies within 6 squares that can see or hear you.
- Success removes one move action from the enemy's next turn.
- Success by 10 or more also makes that enemy flat-footed until the start of your next turn.
- Mind-affecting effect.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.19` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `persuasion`, `will_defense`, `action_denial`, `flat_footed`, `mind_affecting`, `area`
- **Automation observation for later phase:** Current action metadata preserves the major rule clauses.

#### Droid Focus

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in the Mechanics and Use Computer skills.
- **Canonical quick summary:** Choose a droid degree and gain +1 on several interactions with it plus +1 defenses against it; repeatable for different degrees.
- Choose one droid degree from first through fifth.
- Gain +1 to Deception, Mechanics, Perception, Persuasion, and Use Computer checks used on or against that droid degree.
- Gain +1 to all defenses against attack rolls and skill checks made by that droid degree.
- Repeatable for different degrees; effects do not stack.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.20` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `choice`, `droid_degree`, `mechanics`, `use_computer`, `defense`, `repeatable`
- **Automation observation for later phase:** Description is faithful; progression still needs proof that repeat selections and nonstacking are enforced.

#### Droid Shield Mastery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, equipped with shield generator.
- **Canonical quick summary:** Automatically recharge 5 SR and do it in two swift actions instead of three with a check.
- Automatically succeed on Endurance checks to restore shield rating by 5, up to normal SR.
- Restore shields using two swift actions rather than the normal three swift actions plus DC 20 Endurance check.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.20` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `shield`, `shield_rating`, `endurance`, `swift_action`, `recharge`
- **Automation observation for later phase:** Mechanics are represented correctly; taxonomy should move toward droid/shield systems.

#### Erratic Target

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, equipped with hovering locomotion or flying locomotion, Dexterity 13, Dodge.
- **Canonical quick summary:** Trade up to 2 squares of speed for an equal Dodge bonus until your next turn, provided you still move at least 2 squares.
- Reduce speed by up to 2 squares to increase Dodge bonus by 1 per square sacrificed until the start of your next turn.
- You must move at least 2 squares to gain the benefit.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.21` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `mobility`, `flight`, `hover`, `dodge`, `defense`, `speed_tradeoff`
- **Automation observation for later phase:** Movement-dependent resolution is reasonably contextual/manual.

#### Ion Shielding

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid with Strength 13, or cyborg with Constitution 13.
- **Canonical quick summary:** Qualifying ion damage moves you only one step down the condition track instead of two.
- If ion damage before being halved equals or exceeds damage threshold, move only 1 step down the condition track instead of the normal 2.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.21` -> canonical `Scavenger's Guide to Droids p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `cyborg`, `ion`, `damage_threshold`, `condition_track`, `defense`
- **Automation observation for later phase:** Description and damage-resolution concept are faithful.

#### Logic Upgrade: Skill Swap

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, equipped with basic processor.
- **Canonical quick summary:** Temporarily exchange access to a trained skill for an untrained skill, but the swapped-in skill remains untrained.
- Choose a skill you are not trained in, other than Use the Force.
- As a full-round action, swap that skill for one trained skill.
- You lose the original trained skill's benefit while swapped.
- The swapped-in skill remains untrained: no trained-only options or trained bonus; roll with normal half-level plus ability.
- If later trained in the selected skill, choose another; repeatable for different skills.
- **Repository finding:** Current abbreviated description hides the decisive rule that the swapped-in skill remains untrained.
- **Provenance observation:** current `Scavenger's Guide to Droids p.22` -> canonical `Scavenger's Guide to Droids p.22` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `droid`, `skill`, `skill_swap`, `basic_processor`, `full_round_action`, `repeatable`, `progression`
- **Automation observation for later phase:** Current implementation treats the selected untrained skill as trained, directly contradicting RAW.

#### Mechanical Martial Arts

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, Martial Arts I, base attack bonus +1.
- **Canonical quick summary:** An unarmed hit imposes -5 melee attack and damage; an AoO against an organic enemy uses a different duration.
- After damaging an enemy with an unarmed attack, impose -5 on all melee attack and damage rolls until the start of your next turn.
- If an organic enemy is struck during an attack of opportunity, the penalty lasts until the start of that enemy's next turn.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.22` -> canonical `Scavenger's Guide to Droids p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `unarmed`, `martial_arts`, `debuff`, `attack_of_opportunity`, `melee`
- **Automation observation for later phase:** Main rider is represented, but the organic-enemy AoO duration special case is not.

#### Multi-Targeting

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, Intelligence 13, proficient with weapon.
- **Canonical quick summary:** Maintain an aim across rounds and attack other targets while setting it up, but lose the aim if the subject leaves line of sight.
- You may spread the swift actions used to aim across more than one round.
- You may attack other targets before finishing the aim action.
- If the aimed-at subject leaves your line of sight, the aim is lost.
- **Repository finding:** Current description omits proficient with weapon.
- **Provenance observation:** current `Scavenger's Guide to Droids p.23` -> canonical `Scavenger's Guide to Droids p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `aim`, `ranged`, `multi_target`, `weapon_proficiency`, `line_of_sight`
- **Automation observation for later phase:** Aim persistence is represented but weapon proficiency is not visibly gated.

#### Pincer

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, equipped with claw or hand appendage, base attack bonus +1, Pin, Crush.
- **Canonical quick summary:** Maintain a Pin and make later grapple checks as a swift action, applying Crush on successful checks.
- After successfully Pinning an enemy, maintain the Pin beyond one round.
- Make later grapple checks against the pinned enemy as a swift action.
- Apply Crush whenever those later checks succeed.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.23` -> canonical `Scavenger's Guide to Droids p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `grapple`, `pin`, `crush`, `swift_action`, `melee_control`
- **Automation observation for later phase:** Description and Pin/Crush interaction are faithful.

#### Pinpoint Accuracy

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, Aiming Accuracy, Point Blank Shot, Precise Shot, proficient with weapon.
- **Canonical quick summary:** Detailed text blocks Recover after damage with Aiming Accuracy, but the book's summary table contradicts it with a condition-track effect.
- Detailed Benefit: when using Aiming Accuracy, a damaged target cannot take the Recover action until the end of its next turn.
- The summary table instead says the feat moves the target 1 step down the condition track, creating an internal source conflict.
- **Repository finding:** The source itself is internally inconsistent; current detailed-text implementation is defensible.
- **Provenance observation:** current `Scavenger's Guide to Droids p.24` -> canonical `Scavenger's Guide to Droids p.24` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `droid`, `aim`, `recover`, `condition_track`, `source_conflict`, `ranged`
- **Automation observation for later phase:** Current record follows the detailed Benefit; preserve the conflict explicitly rather than silently substituting the table summary.

#### Sensor Link

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, or cyborg with qualifying built-in cybernetic sensors and communications gear.
- **Canonical quick summary:** Broadcast your sensor feed within 24 squares so an ally can share awareness and aid Perception; mutual Sensor Link grants +2 Perception.
- As a swift action, broadcast audio, visual, and special sensor input to a droid ally, comlink, communications system, or holographic receiver within 24 squares.
- The ally knows what you know and may Aid Another on your Perception checks without mutual line of sight.
- If both parties have Sensor Link, information is shared simultaneously and grants +2 to Perception checks.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.24` -> canonical `Scavenger's Guide to Droids p.24` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `droid`, `cyborg`, `sensors`, `perception`, `aid_another`, `communication`, `swift_action`
- **Automation observation for later phase:** Description and assisted/manual metadata preserve the main rule.

#### Shield Surge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid or cyborg with scomp link or similar direct data link with the vehicle, trained in Mechanics.
- **Canonical quick summary:** Spend remaining vehicle shield rating one-for-one as a reaction to reduce incoming damage, then delay shield recharge for one round.
- As a reaction when your vehicle takes damage above its shield rating, after SR is reduced, reduce vehicle damage by up to the remaining SR.
- Immediately reduce SR one-for-one by the damage prevented.
- Recharge Shields cannot be used on the vehicle until a full round after Shield Surge.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.25` -> canonical `Scavenger's Guide to Droids p.25` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `droid`, `cyborg`, `vehicle`, `shield`, `reaction`, `damage_reduction`, `mechanics`, `data_link`
- **Automation observation for later phase:** Description and reaction metadata are faithful.

#### Slammer

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Small or larger droid, at least two suitable appendages, Strength 13.
- **Canonical quick summary:** Make a special standard-action unarmed slam with double Strength bonus and a persistent-condition rider; Crush adds one damage die.
- As a standard action, make a melee attack by slamming two appendages around the target.
- On a hit, deal unarmed damage with double your Strength bonus.
- If the attack exceeds damage threshold, inflict a persistent condition removable only by 8 hours of rest or DC 20 Treat Injury.
- With Crush, increase unarmed damage by one die when using Slammer.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.25` -> canonical `Scavenger's Guide to Droids p.25` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `droid`, `unarmed`, `melee`, `strength`, `damage_threshold`, `persistent_condition`, `crush`
- **Automation observation for later phase:** Core attack and persistent-condition rider are represented, but the Crush +1 damage-die clause is not visibly encoded.

#### Tool Frenzy

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Small or larger droid, at least two appendages with tools mounted.
- **Canonical quick summary:** Make a +2 unarmed tool-appendage attack using the best appendage damage die, at -2 Reflex until the end of your next turn.
- As a standard action with appendages not normally considered weapons, make a single unarmed melee attack with +2.
- Take -2 Reflex Defense until the end of your next turn.
- Use the damage die of the highest-rated appendage.
- True melee or ranged weapons are not tools for this feat.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.26` -> canonical `Scavenger's Guide to Droids p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `tool`, `appendage`, `unarmed`, `attack_bonus`, `reflex_penalty`, `melee`
- **Automation observation for later phase:** Bonuses and penalty are represented, but broad matching does not prove the nonweapon-tool and highest-rated-appendage restrictions.

#### Turn and Burn

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid, equipped with hovering, flying, wheeled, or tracked locomotion, Dexterity 13.
- **Canonical quick summary:** Withdraw farther and at full speed; optionally spend a Force Point to withdraw as a reaction when an enemy finishes adjacent.
- When withdrawing, clear threatened squares with up to 2 squares of movement without provoking and move your full speed.
- Spend a Force Point as a reaction when an enemy ends its movement adjacent to you to withdraw.
- **Repository finding:** Published description is faithful.
- **Provenance observation:** current `Scavenger's Guide to Droids p.26` -> canonical `Scavenger's Guide to Droids p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `mobility`, `withdraw`, `reaction`, `force_point`, `locomotion`
- **Automation observation for later phase:** Improved Withdraw is represented, but the Force Point reaction is omitted.

---

## Book 5 - Legacy Era Campaign Guide

Full feat publications: **19**; new canonical identities: **19**; reprints: **0**.

- Legacy Era publishes exactly 19 canonical feat identities, all present somewhere in the repository.
- All 19 currently have incorrect provenance at the source/page level: 18 have the correct book but wrong page, while Autofire Assault is wrongly attributed to Galaxy at War.
- Autofire Assault is a same-name cross-domain collision: Legacy Era publishes the feat; Galaxy at War publishes a separate talent.
- The three Attack Combo feats are separate canonical identities, not scoped variants of one feat.
- Return Fire is one repeatable canonical feat with a selected weapon-group/exotic-weapon scope.
- Most Legacy base benefit text is sound; the principal content defects are omitted Special clauses/restrictions rather than wholly wrong mechanics.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Attack Combo (Fire and Strike) | 34 | `GENERAL` | Attack Combo (Melee), Attack Combo (Ranged), base attack bonus +9. | - | `CANONICAL_TEXT_MATCHES_RULE` | Two consecutive hits on one target prime +1 die damage on later melee, unarmed, or ranged attacks through the end of your next turn. |
| Attack Combo (Melee) | 34 | `GENERAL` | Base attack bonus +3. | - | `CANONICAL_TEXT_MATCHES_RULE` | Two consecutive melee/unarmed hits on one target prime +1 die damage on later melee/unarmed attacks through the end of your next turn. |
| Attack Combo (Ranged) | 34 | `GENERAL` | Base attack bonus +3. | - | `CANONICAL_TEXT_MATCHES_RULE` | Two consecutive ranged hits on one target prime +1 die damage on later ranged attacks through the end of your next turn. |
| Autofire Assault | 34 | `GENERAL` | Weapon Focus (chosen weapon). | - | `DESCRIPTION_PARTIAL_MISSING_SPECIAL_RESTRICTIONS` | Sustain autofire on the same area across consecutive turns to reduce the penalty and gain +1 die of damage. |
| Autofire Sweep | 34 | `GENERAL` | Weapon Focus (chosen weapon). | - | `DESCRIPTION_PARTIAL_MISSING_SPECIAL_RESTRICTIONS` | Turn an autofire attack into a 6-square cone originating from a visible point-blank square. |
| Biotech Specialist | 34 | `GENERAL` | Trained in the Mechanics skill. | - | `CANONICAL_BASE_TEXT_PRESENT_VERIFY_FULL_TABLE_AND_SPECIAL` | Use Mechanics to perform Tech-Specialist-style custom upgrades on Yuuzhan Vong biotechnology, with its own assistance and biotech rules. |
| Biotech Surgery | 35 | `GENERAL` | Trained in the Treat Injury skill. | - | `DESCRIPTION_PARTIAL_MISSING_SPECIAL_CLAUSES` | Install biotech prostheses with Treat Injury; self-surgery is harder and Surgical Expertise reduces the procedure to 10 minutes. |
| Brink of Death | 35 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Choose to leave a target unconscious at 0 HP instead of killing it with an otherwise lethal attack. |
| Feat of Strength | 35 | `GENERAL` | Strength 15. | - | `DESCRIPTION_PARTIAL_AND_SUMMARY_ERROR` | Take 20 on a Strength or trained Strength-based skill check in one full round, with an Endurance check potentially granting a second use. |
| Fatal Hit | 36 | `GENERAL` | Strength 13, Dexterity 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | When you drop a target to 0 HP, choose to kill it outright; coup de grace becomes a standard action. |
| Galactic Alliance Military Training | 36 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Ignore the condition-track movement from the first attack each encounter that exceeds your damage threshold. |
| Grapple Resistance | 36 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +5 defenses/checks against grabs and grapples, and protect held/carried objects with +5 Reflex Defense. |
| Knock Heads | 36 | `GENERAL` | Dexterity 13, Strength 13, Multi-Grab. | - | `CANONICAL_TEXT_MATCHES_RULE` | After a successful two-target Multi-Grab, deal automatic 1d6 + Strength bludgeoning damage to both with effectively -5 damage threshold. |
| Multi-Grab | 36 | `GENERAL` | Dexterity 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use a standard action to make separate grab attacks against two adjacent targets while both hands are empty. |
| Rancor Crush | 36 | `GENERAL` | Strength 15, Crush, Pin, base attack bonus +1. | - | `CANONICAL_TEXT_MATCHES_RULE` | A successful Pin + Crush also moves the enemy one step down the condition track. |
| Return Fire | 37 | `GENERAL` | Dexterity 15, Quick Draw, Weapon Focus (chosen exotic ranged weapon or weapon group). | - | `DESCRIPTION_PARTIAL_MISSING_MULTIPLE_SPECIAL_CLAUSES` | With a chosen ranged weapon family, react to a missed ranged attack by shooting back; Combat Reflexes increases uses and the feat is repeatable for other weapon scopes. |
| Returning Bug | 37 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | A missed razor bug or thud bug immediately returns to your hand. |
| Vehicle Systems Expertise | 37 | `GENERAL` | Tech Specialist, trained in the Mechanics skill. | - | `CANONICAL_TEXT_MATCHES_RULE` | Recharge Shields or Reroute Power in two swift actions, or once per encounter try to do it in one swift action with DC 30 Mechanics. |
| Zero Range | 37 | `GENERAL` | Point Blank Shot. | - | `DESCRIPTION_PARTIAL_MISSING_RESTRICTIONS` | At zero range, gain +1 attack and +1 die damage with eligible ranged weapons, excluding heavy/vehicle/starship use and Burst Fire/Rapid Shot stacking. |

### Detailed rules and repository findings

#### Attack Combo (Fire and Strike)

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Attack Combo (Melee), Attack Combo (Ranged), base attack bonus +9.
- **Canonical quick summary:** Two consecutive hits on one target prime +1 die damage on later melee, unarmed, or ranged attacks through the end of your next turn.
- If you hit one target with two consecutive ranged, melee, and/or unarmed attacks during the same turn, later ranged, melee, or unarmed attacks through the end of your next turn deal +1 die of damage on a hit.
- The later attacks include attacks of opportunity and attacks made as reactions.
- The extra damage stacks with extra damage from other feats or talents.
- **Repository finding:** Current detailed rules text matches the published benefit.
- **Provenance observation:** current `Legacy Era Campaign Guide p.15` -> canonical `Legacy Era Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack_combo`, `melee`, `ranged`, `unarmed`, `damage`, `sequence`, `reaction`, `attack_of_opportunity`
- **Automation observation for later phase:** The repo now exposes this as an attack-option style rule, but the later automation phase must prove consecutive-hit priming, same-target tracking, duration, and reaction/AoO coverage.

#### Attack Combo (Melee)

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +3.
- **Canonical quick summary:** Two consecutive melee/unarmed hits on one target prime +1 die damage on later melee/unarmed attacks through the end of your next turn.
- If you hit one target with two consecutive melee and/or unarmed attacks during the same turn, later melee or unarmed attacks through the end of your next turn deal +1 die of damage on a hit.
- The later attacks include attacks of opportunity and attacks made as reactions.
- The extra damage stacks with extra damage from other feats or talents.
- **Repository finding:** Current detailed rules text matches the published benefit.
- **Provenance observation:** current `Legacy Era Campaign Guide p.15` -> canonical `Legacy Era Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack_combo`, `melee`, `unarmed`, `damage`, `sequence`, `reaction`, `attack_of_opportunity`
- **Automation observation for later phase:** Current attack-option representation has the right broad shape; later runtime certification must prove the sequence, target, and duration state.

#### Attack Combo (Ranged)

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +3.
- **Canonical quick summary:** Two consecutive ranged hits on one target prime +1 die damage on later ranged attacks through the end of your next turn.
- If you hit one target with two consecutive ranged attacks during the same turn, later ranged attacks through the end of your next turn deal +1 die of damage on a hit.
- The later attacks include attacks of opportunity and attacks made as reactions.
- The extra damage stacks with extra damage from other feats or talents.
- **Repository finding:** Current detailed rules text matches the published benefit.
- **Provenance observation:** current `Legacy Era Campaign Guide p.15` -> canonical `Legacy Era Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack_combo`, `ranged`, `damage`, `sequence`, `reaction`, `attack_of_opportunity`
- **Automation observation for later phase:** Current attack-option representation has the right broad shape; later runtime certification must prove consecutive hits, same-target tracking, and duration.

#### Autofire Assault

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Weapon Focus (chosen weapon).
- **Canonical quick summary:** Sustain autofire on the same area across consecutive turns to reduce the penalty and gain +1 die of damage.
- If you target the same area with autofire that you targeted with autofire on your last turn, the autofire attack penalty becomes -2.
- The penalty becomes -1 if using a braced autofire-only weapon or Controlled Burst.
- On a hit, deal +1 die of damage.
- Cannot be used with Autofire Sweep or Burst Fire.
- **Repository finding:** The benefit text is substantially correct, but the current source is wrong and the canonical Special incompatibility clauses are not preserved in the abbreviated description.
- **Provenance observation:** current `Galaxy at War p.23` -> canonical `Legacy Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `autofire`, `weapon_focus`, `area`, `damage`, `sustained_fire`
- **Automation observation for later phase:** Current metadata represents the sustained-autofire concept, but later certification must verify same-area/last-turn state, bracing/Controlled Burst, and incompatibility with Autofire Sweep/Burst Fire.

#### Autofire Sweep

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Weapon Focus (chosen weapon).
- **Canonical quick summary:** Turn an autofire attack into a 6-square cone originating from a visible point-blank square.
- When making an autofire attack, attack all targets in a 6-square cone.
- The cone's origin square may be any square in line of sight and within point-blank range.
- Cannot be used with Autofire Assault or Burst Fire.
- May be used with the Suppression Fire talent.
- **Repository finding:** Current base benefit is correct, but the abbreviated description does not preserve the important Special compatibility/incompatibility clauses.
- **Provenance observation:** current `Legacy Era Campaign Guide p.16` -> canonical `Legacy Era Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `autofire`, `cone`, `area`, `weapon_focus`, `suppression`
- **Automation observation for later phase:** The 6-square cone concept exists in repo metadata; later automation must verify legal origin, LOS/point-blank constraints, and feat incompatibilities.

#### Biotech Specialist

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in the Mechanics skill.
- **Canonical quick summary:** Use Mechanics to perform Tech-Specialist-style custom upgrades on Yuuzhan Vong biotechnology, with its own assistance and biotech rules.
- Modify Yuuzhan Vong biotech devices, armor, weapons, or vehicles with one of the printed biotech traits.
- Only one modification may be performed at a time; normal one-benefit-per-item and no-duplicate-benefit limits apply unless noted otherwise.
- Pay one-tenth item cost or 1,000 credits, whichever is more; modification time is one day per 1,000 credits.
- Make a DC 20 Mechanics check; Take 10/20 is not allowed; failure loses the spent credits but allows another attempt.
- Only other characters with Biotech Specialist may assist; assistance can reduce time and aid the final Mechanics check.
- Modified market value equals base cost plus twice successful modification cost.
- Nobles and scoundrels may add the feat to their bonus-feat lists.
- The feat removes the -5 Treat Injury penalty for biotechnology.
- **Repository finding:** Current repository text contains the main procedure, but the content phase should preserve the complete printed trait table and Special clauses in the canonical description.
- **Provenance observation:** current `Legacy Era Campaign Guide p.16` -> canonical `Legacy Era Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `biotech`, `yuuzhan_vong`, `mechanics`, `crafting`, `customization`, `armor`, `weapon`, `vehicle`, `downtime`
- **Automation observation for later phase:** The feat is represented as metadata/procedure support; later automation should remain workbench/manual rather than inventing passive modifiers and must preserve the printed biotech trait list and special Treat Injury rule.

#### Biotech Surgery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in the Treat Injury skill.
- **Canonical quick summary:** Install biotech prostheses with Treat Injury; self-surgery is harder and Surgical Expertise reduces the procedure to 10 minutes.
- Install a biotech prosthesis onto a living being.
- Surgery takes 1 uninterrupted hour followed by a DC 20 Treat Injury check; failure permits another attempt after another uninterrupted hour.
- Self-installation is allowed at -5 on the Treat Injury check.
- Surgical Expertise reduces installation time from 1 hour to 10 minutes.
- **Repository finding:** The current base installation procedure is correct but does not fully preserve the published self-installation and Surgical Expertise Special clauses.
- **Provenance observation:** current `Legacy Era Campaign Guide p.17` -> canonical `Legacy Era Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `biotech`, `surgery`, `treat_injury`, `prosthesis`, `medical`, `downtime`
- **Automation observation for later phase:** Current record is procedure/reference oriented; later automation must preserve time, retry, self-surgery penalty, and Surgical Expertise interaction if any workflow is built.

#### Brink of Death

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Choose to leave a target unconscious at 0 HP instead of killing it with an otherwise lethal attack.
- When an attack would deal enough damage to kill a target, you may instead reduce that target to 0 hit points, leaving it unconscious but alive.
- Normal 0-hit-point rules then apply.
- **Repository finding:** Current detailed description is faithful.
- **Provenance observation:** current `Legacy Era Campaign Guide p.17` -> canonical `Legacy Era Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `nonlethal`, `hit_points`, `mercy`, `lethal_damage`
- **Automation observation for later phase:** This is a contextual damage-resolution choice; later automation should be a prompt/choice, not a passive modifier.

#### Feat of Strength

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 15.
- **Canonical quick summary:** Take 20 on a Strength or trained Strength-based skill check in one full round, with an Endurance check potentially granting a second use.
- Once per encounter as a full-round action, Take 20 on one Strength check or a Strength-based skill check in which you are trained, even while distracted or threatened.
- After the first use in an encounter, make a DC 15 Endurance check as a free action.
- On a successful Endurance check, you may use the feat once more during that encounter.
- **Repository finding:** The current detailed benefit captures the first use, but the repository summary incorrectly says 'Take 10 or Take 20' and the published DC 15 Endurance check for a possible second use is omitted from the abbreviated description.
- **Provenance observation:** current `Legacy Era Campaign Guide p.18` -> canonical `Legacy Era Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `strength`, `skill`, `take_20`, `full_round_action`, `endurance`, `encounter_resource`
- **Automation observation for later phase:** Later automation must support Take 20 in a full round and the conditional second use; a generic metadata marker is insufficient.

#### Fatal Hit

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13, Dexterity 13.
- **Canonical quick summary:** When you drop a target to 0 HP, choose to kill it outright; coup de grace becomes a standard action.
- When your attack drops a target to 0 hit points, you may automatically kill it even if the damage does not exceed its damage threshold.
- You may perform a coup de grace as a standard action instead of a full-round action.
- **Repository finding:** Current detailed benefit matches the source.
- **Provenance observation:** current `Legacy Era Campaign Guide p.18` -> canonical `Legacy Era Campaign Guide p.36` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `lethal`, `zero_hp`, `coup_de_grace`, `action_economy`
- **Automation observation for later phase:** Later automation should treat the kill as an explicit choice and the coup-de-grace change as action-economy behavior.

#### Galactic Alliance Military Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Ignore the condition-track movement from the first attack each encounter that exceeds your damage threshold.
- The first time in an encounter that an attack exceeds your damage threshold, you do not move down the condition track.
- **Repository finding:** Current text matches the source.
- **Provenance observation:** current `Legacy Era Campaign Guide p.19` -> canonical `Legacy Era Campaign Guide p.36` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `damage_threshold`, `condition_track`, `once_per_encounter`, `military_training`
- **Automation observation for later phase:** A runtime condition-track gate is plausible, but later certification must prove 'first attack each encounter' tracking.

#### Grapple Resistance

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Gain +5 defenses/checks against grabs and grapples, and protect held/carried objects with +5 Reflex Defense.
- Gain +5 Reflex Defense against enemy grab and grapple attacks.
- Gain +5 on all opposed grapple checks.
- Objects you hold or carry gain +5 Reflex Defense when attacked.
- **Repository finding:** Current detailed description is faithful.
- **Provenance observation:** current `Legacy Era Campaign Guide p.19` -> canonical `Legacy Era Campaign Guide p.36` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `grapple`, `grab`, `reflex_defense`, `opposed_check`, `object_defense`
- **Automation observation for later phase:** Current implementation-status audit finds no executable modifiers/actions; later automation must cover all three clauses rather than only a generic grapple bonus.

#### Knock Heads

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13, Strength 13, Multi-Grab.
- **Canonical quick summary:** After a successful two-target Multi-Grab, deal automatic 1d6 + Strength bludgeoning damage to both with effectively -5 damage threshold.
- After successfully Multi-Grabbing two targets that are adjacent to you and to each other, immediately knock their heads together.
- Each takes automatic bludgeoning damage equal to 1d6 + Strength modifier.
- Treat each target's damage threshold as 5 lower for this damage.
- Both targets remain grabbed afterward.
- **Repository finding:** Current detailed description matches the source.
- **Provenance observation:** current `Legacy Era Campaign Guide p.20` -> canonical `Legacy Era Campaign Guide p.36` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `grapple`, `multi_grab`, `unarmed`, `bludgeoning`, `damage_threshold`, `two_targets`
- **Automation observation for later phase:** This requires multi-target grapple state and automatic damage; later automation should not reduce it to a generic metadata effect.

#### Multi-Grab

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13.
- **Canonical quick summary:** Use a standard action to make separate grab attacks against two adjacent targets while both hands are empty.
- As a standard action, make a separate grab attack against each of two targets adjacent to you.
- You must have two empty hands.
- **Repository finding:** Current detailed description matches the source.
- **Provenance observation:** current `Legacy Era Campaign Guide p.20` -> canonical `Legacy Era Campaign Guide p.36` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `grapple`, `grab`, `two_targets`, `standard_action`, `empty_hands`
- **Automation observation for later phase:** Later automation must support two separate grab attacks and the two-empty-hands requirement.

#### Rancor Crush

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 15, Crush, Pin, base attack bonus +1.
- **Canonical quick summary:** A successful Pin + Crush also moves the enemy one step down the condition track.
- When you successfully Pin an enemy and use Crush at the same time, that enemy also moves 1 step down the condition track in addition to taking Crush damage.
- **Repository finding:** Current detailed description matches the source.
- **Provenance observation:** current `Legacy Era Campaign Guide p.21` -> canonical `Legacy Era Campaign Guide p.36` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `grapple`, `pin`, `crush`, `condition_track`, `melee_control`
- **Automation observation for later phase:** Later automation should hook the CT rider specifically to a successful combined Pin/Crush event.

#### Return Fire

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 15, Quick Draw, Weapon Focus (chosen exotic ranged weapon or weapon group).
- **Canonical quick summary:** With a chosen ranged weapon family, react to a missed ranged attack by shooting back; Combat Reflexes increases uses and the feat is repeatable for other weapon scopes.
- Choose one exotic ranged weapon or weapon group.
- Once per encounter as a reaction, make one ranged attack with that chosen weapon/group against an enemy that misses you with a ranged attack, provided you have line of sight.
- With Combat Reflexes, uses per encounter equal your Dexterity bonus, but never more than once during a given enemy's turn.
- Does not apply to vehicle weapons or heavy weapons.
- The weapon must already be in hand.
- Repeatable; each feat selection applies to a different weapon group or exotic weapon.
- **Repository finding:** Current base reaction benefit is correct, but the repository's abbreviated description omits several mechanically decisive Special clauses.
- **Provenance observation:** current `Legacy Era Campaign Guide p.21` -> canonical `Legacy Era Campaign Guide p.37` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `reaction`, `weapon_choice`, `weapon_focus`, `combat_reflexes`, `repeatable`, `line_of_sight`
- **Automation observation for later phase:** A simple reactive attack rule is insufficient: later automation must enforce weapon scope, LOS, weapon-in-hand, no heavy/vehicle weapons, encounter use count, Combat Reflexes scaling, enemy-turn cap, and repeatable selections.

#### Returning Bug

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** A missed razor bug or thud bug immediately returns to your hand.
- When you miss with a razor bug or thud bug, the weapon immediately returns to your hand.
- **Repository finding:** The current repository prerequisite is Weapon Proficiency (Simple Weapons); the published prerequisite is the more general 'Proficient with weapon used.'
- **Provenance observation:** current `Legacy Era Campaign Guide p.22` -> canonical `Legacy Era Campaign Guide p.37` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `yuuzhan_vong`, `thrown_weapon`, `razor_bug`, `thud_bug`, `weapon_proficiency`
- **Automation observation for later phase:** Later automation can be a thrown-weapon return/recovery hook, but must be restricted to razor bugs and thud bugs.

#### Vehicle Systems Expertise

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Tech Specialist, trained in the Mechanics skill.
- **Canonical quick summary:** Recharge Shields or Reroute Power in two swift actions, or once per encounter try to do it in one swift action with DC 30 Mechanics.
- Recharge Shields or Reroute Power using two swift actions instead of three.
- Once per encounter, attempt either action as one swift action with a DC 30 Mechanics check.
- **Repository finding:** Current detailed benefit matches the published rule.
- **Provenance observation:** current `Legacy Era Campaign Guide p.22` -> canonical `Legacy Era Campaign Guide p.37` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `vehicle`, `mechanics`, `tech_specialist`, `recharge_shields`, `reroute_power`, `swift_action`, `action_economy`
- **Automation observation for later phase:** Later automation should integrate with actual vehicle actions and preserve the once/encounter DC 30 one-swift attempt.

#### Zero Range

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot.
- **Canonical quick summary:** At zero range, gain +1 attack and +1 die damage with eligible ranged weapons, excluding heavy/vehicle/starship use and Burst Fire/Rapid Shot stacking.
- When firing a ranged weapon at a target within or adjacent to your fighting space, gain +1 on the attack roll and +1 die of damage on a hit.
- Does not stack with the extra damage from Burst Fire or Rapid Shot.
- Does not apply to heavy weapons, vehicle weapons, or starship combat.
- **Repository finding:** Current base benefit is correct but the repository's abbreviated description omits the published non-stacking and heavy/vehicle/starship exclusions.
- **Provenance observation:** current `Legacy Era Campaign Guide p.23` -> canonical `Legacy Era Campaign Guide p.37` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `point_blank`, `adjacent`, `damage`, `attack_bonus`, `weapon_restriction`
- **Automation observation for later phase:** Current implementation-status data shows an attack modifier exists; later certification must prove adjacency/fighting-space gating, extra damage, exclusions, and non-stacking behavior.

---

## Book 6 - Knights of the Old Republic Campaign Guide

Full feat publications: **21**; new canonical identities: **21**; reprints: **0**.

- KOTOR publishes exactly 21 canonical feat identities, all present somewhere in the repository.
- All 21 currently have incorrect final provenance: 20 have the correct book but wrong page; Echani Training is generically sourced at page 0.
- Echani Training's KOTOR feat is the base identity; later Galaxy at War material extends the same feat rather than creating a duplicate identity.
- Official KOTOR errata resolves Implant Training: the canonical rule is protection from the implant's extra condition-track step; the printed table's Will-defense summary is superseded.
- Power Blast, Tumble Defense, and Withdrawal Strike retain unresolved table/detail conflicts that should remain explicit until an errata ruling is verified.
- Many KOTOR descriptions are textually sound, but runtime metadata often omits frequency, duration, eligibility, alternate-use, or target-state clauses.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Accelerated Strike | 32 | `GENERAL` | Base attack bonus +6. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, compress a full attack into a standard action when using only proficient weapons. |
| Conditioning | 32 | `GENERAL` | Strength 13, Constitution 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction. |
| Critical Strike | 32 | `GENERAL` | Base attack bonus +9, proficient with melee weapon used, Weapon Focus for the melee weapon used. | - | `DESCRIPTION_ERROR_PREREQUISITES` | Spend two consecutive swift actions to widen the next melee attack's critical range by 1, provided the sequence and line of sight are maintained. |
| Echani Training | 33 | `GENERAL` | Dexterity 13, Martial Arts I. | - | `CANONICAL_BASE_TEXT_MATCHES_RULE` | Strengthen a single unarmed strike and once per encounter make a Fortitude-targeting follow-up that can knock the opponent prone. |
| Force Readiness | 33 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Spend Force Points as a free action even outside your turn, without changing other Force Point restrictions. |
| Flurry | 33 | `GENERAL` | Dexterity 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Trade -5 Reflex for +2 melee attacks while wielding only light weapons/lightsabers; also substitutes for Point Blank Shot for elite trooper qualification. |
| Gearhead | 33 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, dramatically speed up Mechanics or Use Computer checks, with a -10 penalty for long tasks reduced to half time. |
| Implant Training | 33 | `GENERAL` | Must possess a cybernetic implant. | - | `DESCRIPTION_ERROR_ERRATA_RESOLVED` | Ignore the extra condition-track step normally caused by possessing a cybernetic implant. |
| Improved Rapid Strike | 33 | `GENERAL` | Rapid Strike, light melee weapon. | - | `CANONICAL_TEXT_MATCHES_RULE` | Upgrade Rapid Strike with a light melee weapon/lightsaber to +2 damage dice for -5 attack, or -10 if Dexterity is below 13. |
| Increased Agility | 33 | `GENERAL` | Conditioning. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +2 squares to climb/swim/jump movement and retain Dexterity to Reflex while climbing. |
| Logic Upgrade: Self-Defense | 34 | `GENERAL` | Droid only. | - | `DESCRIPTION_ERROR` | Once per encounter as a reaction, give one chosen defense +2 morale through the end of your next turn. |
| Logic Upgrade: Tactician | 34 | `GENERAL` | Droid only, base attack bonus +4. | - | `DESCRIPTION_ERROR` | Once per encounter, improve Aid Another so one ally gains +5 on its next attack against the chosen opponent. |
| Mandalorian Training | 34 | `GENERAL` | Charging Fire. | - | `CANONICAL_TEXT_MATCHES_RULE` | Charging Fire gains +2 attack and +2 morale Will through your next turn while retaining the normal charge Reflex penalty. |
| Poison Resistance | 34 | `GENERAL` | Constitution 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +5 Fortitude against poison and halve damage from a successful poison attack. |
| Power Blast | 34 | `GENERAL` | SOURCE CONFLICT: table lists Dexterity 13; detailed feat text has no prerequisite paragraph. | - | `SOURCE_INTERNAL_CONFLICT` | Trade ranged attack bonus for equal ranged damage until your next turn, with exclusions for area/object/vehicle damage and an extra low-Strength penalty. |
| Quick Skill | 34 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, either Take 10 while rushed on a trained skill or Take 20 on a trained skill in half normal time. |
| Republic Military Training | 35 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, react to an incoming attack while in cover to gain DR 10, even if Aim ignores the cover's Reflex bonus. |
| Sith Military Training | 35 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, debilitating a target can impose -2 all defenses on nearby enemies through the end of your next turn. |
| Sniper Shot | 35 | `GENERAL` | Proficient with ranged weapon used, excluding heavy weapons. | - | `PREREQUISITE_LINE_ERROR` | Trade -5 Reflex for +2 ranged attacks through your next turn with proficient nonheavy, nonvehicle weapons. |
| Tumble Defense | 35 | `GENERAL` | SOURCE CONFLICT: detailed prerequisite is proficient with melee weapon used; table also lists Dexterity 13. | - | `SOURCE_INTERNAL_CONFLICT_AND_PREREQUISITE_LINE_ERROR` | Raise the Acrobatics DC to tumble through your threatened squares by your BAB; failure can provoke the normal AoO. |
| Withdrawal Strike | 35 | `GENERAL` | Base attack bonus +5, proficient with melee weapon used. | - | `SOURCE_INTERNAL_CONFLICT` | Choose a melee weapon family; adjacent enemies cannot Withdraw from your threatened squares, though they may still tumble. |

### Detailed rules and repository findings

#### Accelerated Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +6.
- **Canonical quick summary:** Once per encounter, compress a full attack into a standard action when using only proficient weapons.
- Once per encounter, while using only weapons with which you are proficient, take a full attack as a standard action.
- **Repository finding:** Current description is faithful. The feat is not melee-only despite its flavor sentence.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.25` -> canonical `Knights of the Old Republic Campaign Guide p.32` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `full_attack`, `action_economy`, `standard_action`, `proficiency`, `once_per_encounter`
- **Automation observation for later phase:** Manual/action-card handling is a reasonable current ceiling; later automation must enforce once/encounter and all-weapons-proficient gating.

#### Conditioning

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13, Constitution 13.
- **Canonical quick summary:** Reroll trained Strength/Constitution-based skills and once per encounter add Strength bonus to Fortitude as a reaction.
- Reroll any Strength- or Constitution-based skill check for a skill in which you are trained; accept the second result.
- Once per encounter as a reaction, add your Strength bonus to Fortitude Defense until the beginning of your next turn.
- **Repository finding:** Description is faithful; runtime representation is incomplete.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.25` -> canonical `Knights of the Old Republic Campaign Guide p.32` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `skill`, `reroll`, `strength`, `constitution`, `fortitude`, `reaction`, `once_per_encounter`
- **Automation observation for later phase:** Current reroll metadata omits the trained-skill gate, and the once/encounter Fortitude reaction is absent from the inspected payload.

#### Critical Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +9, proficient with melee weapon used, Weapon Focus for the melee weapon used.
- **Canonical quick summary:** Spend two consecutive swift actions to widen the next melee attack's critical range by 1, provided the sequence and line of sight are maintained.
- Spend two consecutive swift actions in the same round to increase the critical threat range of your next melee attack by 1.
- Only a natural 20 remains an automatic hit.
- Lose the benefit if you lose line of sight to the target or take another action before the attack.
- **Repository finding:** Current description omits the full published proficiency/Weapon Focus prerequisite set.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.25` -> canonical `Knights of the Old Republic Campaign Guide p.32` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `critical`, `swift_action`, `weapon_focus`, `line_of_sight`, `setup`
- **Automation observation for later phase:** Current runtime hardcodes natural 19 rather than a generic +1 threat-range increase and does not fully prove sequence/LOS interruption behavior.

#### Echani Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13, Martial Arts I.
- **Canonical quick summary:** Strengthen a single unarmed strike and once per encounter make a Fortitude-targeting follow-up that can knock the opponent prone.
- If you make only one unarmed attack during the turn, double the damage bonus from Strength on that attack, minimum +1.
- Once per encounter after dealing unarmed damage, make an immediate free-action unarmed attack against the target's Fortitude Defense.
- On success, knock the target prone if it is no more than one size larger than you.
- Large/Huge/Gargantuan/Colossal targets gain +5/+10/+20/+50 Fortitude against the knockdown; unusually stable creatures gain +5.
- **Repository finding:** Base KOTOR description is faithful. Later Galaxy at War Echani material is an extension to the same identity and must remain separately sourced.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`, `damage`, `fortitude`, `prone`, `once_per_encounter`, `size`
- **Automation observation for later phase:** Current payload misses the size/stability Fortitude modifiers and appears to couple the knockdown follow-up too tightly to the single-attack damage mode.

#### Force Readiness

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Spend Force Points as a free action even outside your turn, without changing other Force Point restrictions.
- Spend Force Points as a free action even when it is not your turn.
- All other Force Point restrictions still apply.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.26` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force_point`, `reaction_timing`, `free_action`, `resource`
- **Automation observation for later phase:** Later automation must preserve all normal Force Point restrictions while allowing out-of-turn timing.

#### Flurry

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13.
- **Canonical quick summary:** Trade -5 Reflex for +2 melee attacks while wielding only light weapons/lightsabers; also substitutes for Point Blank Shot for elite trooper qualification.
- While wielding only light weapons or lightsabers, take -5 Reflex Defense and gain +2 on melee attack rolls until the start of your next turn.
- May substitute for Point Blank Shot when qualifying for elite trooper.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.26` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `light_weapon`, `lightsaber`, `attack_bonus`, `reflex_penalty`, `prestige_qualification`
- **Automation observation for later phase:** Later automation must check all wielded weapons, preserve duration across attacks, and support the elite-trooper qualification substitution.

#### Gearhead

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per encounter, dramatically speed up Mechanics or Use Computer checks, with a -10 penalty for long tasks reduced to half time.
- Once per encounter, accelerate Mechanics and Use Computer checks: full-round→standard, standard→move, move→swift.
- Checks requiring multiple swift actions require one fewer swift action.
- Checks taking more than a full round take half normal time at -10 on the check.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.26` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `mechanics`, `use_computer`, `skill`, `action_economy`, `time_reduction`, `once_per_encounter`
- **Automation observation for later phase:** Existing generic time-reduction metadata does not fully preserve the published action-step procedure or exact -10 long-task penalty.

#### Implant Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Must possess a cybernetic implant.
- **Canonical quick summary:** Ignore the extra condition-track step normally caused by possessing a cybernetic implant.
- You are not moved one extra step down the condition track when an implant would normally cause that extra step.
- Official KOTOR errata confirms this condition-track protection and supersedes the printed table's conflicting Will-defense summary.
- **Repository finding:** Current description includes a -2 Will normal-rule statement not supported by the corrected feat. The errata resolves the table/detail conflict in favor of the condition-track rule.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.26` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `cybernetic`, `implant`, `condition_track`, `defense`, `errata`
- **Automation observation for later phase:** Current CT protection is correct, but any metadata suppressing an implant Will-defense penalty is unsupported by the official errata and should be removed later.

#### Improved Rapid Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rapid Strike, light melee weapon.
- **Canonical quick summary:** Upgrade Rapid Strike with a light melee weapon/lightsaber to +2 damage dice for -5 attack, or -10 if Dexterity is below 13.
- With a light melee weapon or lightsaber and Rapid Strike, take -5 on the attack to gain +2 dice of damage.
- Does not stack with Rapid Strike itself or other extra-damage sources that do not stack with Rapid Strike, such as Mighty Swing.
- If Dexterity is below 13, the attack penalty becomes -10.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.27` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `rapid_strike`, `light_weapon`, `lightsaber`, `damage`, `attack_penalty`
- **Automation observation for later phase:** Current payload always uses -5 and lacks the Dex<13 -10 branch and explicit nonstacking exclusions.

#### Increased Agility

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Conditioning.
- **Canonical quick summary:** Gain +2 squares to climb/swim/jump movement and retain Dexterity to Reflex while climbing.
- Increase Climb speed, Swim speed, and Jump distance by 2 squares.
- Do not lose Dexterity bonus to Reflex Defense while climbing.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.27` -> canonical `Knights of the Old Republic Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `movement`, `climb`, `swim`, `jump`, `reflex_defense`, `conditioning`
- **Automation observation for later phase:** Effect metadata is broadly correct; later progression certification must ensure Conditioning is enforced.

#### Logic Upgrade: Self-Defense

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid only.
- **Canonical quick summary:** Once per encounter as a reaction, give one chosen defense +2 morale through the end of your next turn.
- Once per encounter as a reaction, choose one defense and gain +2 morale to it until the end of your next turn.
- **Repository finding:** Current one-line description loses several mechanically decisive clauses.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.27` -> canonical `Knights of the Old Republic Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `defense`, `reaction`, `morale_bonus`, `once_per_encounter`, `choice`
- **Automation observation for later phase:** Current payload lacks the full once/encounter, reaction, morale-type, and exact expiration contract.

#### Logic Upgrade: Tactician

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Droid only, base attack bonus +4.
- **Canonical quick summary:** Once per encounter, improve Aid Another so one ally gains +5 on its next attack against the chosen opponent.
- Once per encounter, use Aid Another to grant one ally +5 on its next attack against the designated opponent.
- Normal Aid Another grants +2.
- **Repository finding:** Current abbreviated description omits important frequency/targeting details.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.27` -> canonical `Knights of the Old Republic Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `aid_another`, `attack_bonus`, `ally`, `once_per_encounter`
- **Automation observation for later phase:** Current metadata omits once/encounter and does not fully bind the +5 to one ally's next attack against the designated opponent.

#### Mandalorian Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Charging Fire.
- **Canonical quick summary:** Charging Fire gains +2 attack and +2 morale Will through your next turn while retaining the normal charge Reflex penalty.
- When using Charging Fire, gain +2 on the ranged attack made at the end of the charge.
- Keep the normal -2 Reflex penalty for charging.
- Gain +2 morale Will Defense until the beginning of your next turn.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.28` -> canonical `Knights of the Old Republic Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `charge`, `charging_fire`, `attack_bonus`, `will_defense`, `morale_bonus`
- **Automation observation for later phase:** Current payload has the attack bonus but omits the +2 morale Will component.

#### Poison Resistance

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Constitution 13.
- **Canonical quick summary:** Gain +5 Fortitude against poison and halve damage from a successful poison attack.
- Gain +5 Fortitude Defense against poison attacks.
- If the poison attack succeeds, take only half damage.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.28` -> canonical `Knights of the Old Republic Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `poison`, `fortitude`, `resistance`, `damage_reduction`
- **Automation observation for later phase:** Current payload represents +5 Fortitude but omits the half-damage clause.

#### Power Blast

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** SOURCE CONFLICT: table lists Dexterity 13; detailed feat text has no prerequisite paragraph.
- **Canonical quick summary:** Trade ranged attack bonus for equal ranged damage until your next turn, with exclusions for area/object/vehicle damage and an extra low-Strength penalty.
- As a swift action before attacking, choose a number up to base attack bonus; subtract it from all ranged attack rolls and add it to all ranged damage rolls until the start of your next turn.
- No bonus damage applies to area attacks or attacks against objects or vehicles.
- If Strength is below 13, take an additional -5 attack penalty when using the feat with nonvehicle weapons.
- **Repository finding:** Do not silently resolve the printed prerequisite conflict; current description follows the detailed feat text while structured data uses the table's Dex 13.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.28` -> canonical `Knights of the Old Republic Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `attack_tradeoff`, `damage`, `swift_action`, `strength`, `source_conflict`
- **Automation observation for later phase:** Current tradeoff exists, but payload omits object/vehicle damage exclusions, the Str<13 extra -5 branch, and full state duration.

#### Quick Skill

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per encounter, either Take 10 while rushed on a trained skill or Take 20 on a trained skill in half normal time.
- Once per encounter, either Take 10 when rushed on one trained skill check unless that skill forbids it, or Take 20 on one trained skill in half the normal time.
- Taking 20 normally requires 20 times the normal check time.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.29` -> canonical `Knights of the Old Republic Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `skill`, `take_10`, `take_20`, `time_reduction`, `trained_skill`, `once_per_encounter`
- **Automation observation for later phase:** Current payload omits the shared once/encounter resource, trained-skill gate, and exact alternative-use structure.

#### Republic Military Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per encounter, react to an incoming attack while in cover to gain DR 10, even if Aim ignores the cover's Reflex bonus.
- Once per encounter as a reaction, gain DR 10 against an incoming attack if you have cover from the attacker.
- The cover still qualifies even if the attacker Aims to ignore the cover bonus to Reflex Defense.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.29` -> canonical `Knights of the Old Republic Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `cover`, `damage_reduction`, `reaction`, `once_per_encounter`, `military_training`
- **Automation observation for later phase:** Current generic cover-reaction marker does not fully preserve DR 10, once/encounter, incoming-attack timing, or the Aim interaction.

#### Sith Military Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per encounter, debilitating a target can impose -2 all defenses on nearby enemies through the end of your next turn.
- Once per encounter as a reaction when you reduce a target to 0 HP or deal damage exceeding its damage threshold, all enemies within 6 squares of that target take -2 to all defenses until the end of your next turn.
- This is a mind-affecting effect.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.29` -> canonical `Knights of the Old Republic Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `debuff`, `reaction`, `zero_hp`, `damage_threshold`, `mind_affecting`, `area`
- **Automation observation for later phase:** Current effect metadata substantially matches the source; later runtime certification should confirm the exact trigger and target radius.

#### Sniper Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with ranged weapon used, excluding heavy weapons.
- **Canonical quick summary:** Trade -5 Reflex for +2 ranged attacks through your next turn with proficient nonheavy, nonvehicle weapons.
- While wielding only weapons with which you are proficient, gain +2 on ranged attacks and take -5 Reflex Defense until the beginning of your next turn.
- Cannot be used with vehicle weapons or heavy weapons.
- Official clarification confirms the attack bonus persists across attacks through the start of your next turn.
- **Repository finding:** The published requirement is omitted from the current prerequisite line even though later prose preserves the restriction.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.30` -> canonical `Knights of the Old Republic Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `attack_bonus`, `reflex_penalty`, `proficiency`, `weapon_restriction`
- **Automation observation for later phase:** Current modifiers are close, but later runtime certification must enforce the proficiency/all-wielded-weapons gate and vehicle/heavy exclusions.

#### Tumble Defense

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** SOURCE CONFLICT: detailed prerequisite is proficient with melee weapon used; table also lists Dexterity 13.
- **Canonical quick summary:** Raise the Acrobatics DC to tumble through your threatened squares by your BAB; failure can provoke the normal AoO.
- When an opponent tumbles through a square you threaten with a melee weapon, add your base attack bonus to that Acrobatics DC.
- If the target fails, you may make an attack of opportunity as normal.
- Cannot be used while flat-footed.
- **Repository finding:** Current prerequisite line says None. The source also conflicts internally over whether Dexterity 13 is required.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.30` -> canonical `Knights of the Old Republic Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `acrobatics`, `tumble`, `threatened_square`, `base_attack_bonus`, `attack_of_opportunity`, `source_conflict`
- **Automation observation for later phase:** Current runtime incorrectly uses a fixed +5 instead of your BAB and does not fully prove all proficiency/flat-footed conditions.

#### Withdrawal Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +5, proficient with melee weapon used.
- **Canonical quick summary:** Choose a melee weapon family; adjacent enemies cannot Withdraw from your threatened squares, though they may still tumble.
- Select one exotic weapon or weapon group when taking the feat.
- While wielding a melee weapon from that chosen group, adjacent opponents may not Withdraw from squares you threaten.
- They may still use Acrobatics to tumble normally.
- The source table summarizes this as making attacks of opportunity against Withdraw, which conflicts with the detailed Benefit that prevents Withdraw.
- **Repository finding:** Current description preserves the detailed Benefit; retain the table/detail conflict for later errata adjudication.
- **Provenance observation:** current `Knights of the Old Republic Campaign Guide p.30` -> canonical `Knights of the Old Republic Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `withdraw`, `movement_control`, `weapon_choice`, `acrobatics`, `source_conflict`
- **Automation observation for later phase:** Current metadata captures the choice but not the movement-control effect. UI-assisted adjudication is preferable to inventing an automatic attack from the conflicting table summary.

---

## Book 7 - The Force Unleashed Campaign Guide

Full feat publications: **21**; new canonical identities: **21**; reprints: **0**.

- The Force Unleashed Campaign Guide publishes 21 canonical feat identities, not 20. Natural Leader is a full feat on p.34 even though the printed feat table omits it.
- Twenty canonical TFU identities exist somewhere in the current feat repo; Recall is the one missing canonical feat record.
- Recall is a genuine TFU feat and collides by name with a separate Rebellion Era talent. The existing name-only domain deny rule is therefore invalid.
- Natural Leader, Savage Attack, and Scavenger have wrong sourcebook provenance in the current repo.
- Only Angled Throw, Bad Feeling, Controlled Rage, and Crossfire currently have exact source/page provenance.
- Ten Forceful-X records currently attributed to TFU are not canonical published feats in the available SWSE source corpus.
- Crush, Forceful Blast, Forceful Recovery, and Unstoppable Force are real feats but belong to other sourcebooks.
- Several current short summaries are mechanically inaccurate even where the full description is correct; summaries must be derived from certified text rather than treated as authority.

### Repo records wrongly attributed to this book

| Record | Ruling | Canonical identity |
|---|---|---|
| Forceful Grip | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Saber Throw | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Slam | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Strike | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Stun | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Telekinesis | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Throw | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Vitality | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Weapon | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Forceful Will | `NONCANONICAL_REPO_ONLY_TFU_ATTRIBUTION` | None found |
| Crush | `WRONG_SOURCE` | Saga Edition Core Rulebook feat |
| Forceful Blast | `WRONG_SOURCE` | Galaxy at War feat |
| Forceful Recovery | `WRONG_SOURCE` | Galaxy of Intrigue feat |
| Unstoppable Force | `WRONG_SOURCE` | Clone Wars Campaign Guide feat |

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Advantageous Attack | 31 | `GENERAL` | Base attack bonus +1. | - | `SUMMARY_ERROR_RUNTIME_MECHANICS_ERROR` | Against an enemy that has not yet acted, a successful attack adds full heroic level to damage instead of half. |
| Advantageous Cover | 31 | `GENERAL` | Trained in the Stealth skill. | - | `CANONICAL_TEXT_MATCHES_RULE` | While you have cover, area attacks deal no damage to you even on a successful attack roll. |
| Angled Throw | 32 | `GENERAL` | Dexterity 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Bounce a grenade-like attack to ignore cover/improved cover when the attack roll exceeds 15, but never total cover. |
| Bad Feeling | 32 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Always gain a move action in the surprise round; if not surprised, it is additional. |
| Blaster Barrage | 32 | `GENERAL` | Coordinated Attack. | - | `CANONICAL_TEXT_MATCHES_RULE` | Damage a target with autofire to give allies +2 circumstance on autofire attacks against that target until your next turn. |
| Controlled Rage | 33 | `GENERAL` | Rage species trait. | - | `SUMMARY_ERROR` | Start Rage as a free action and choose when to finish it, with the rage ending one round after that declaration. |
| Crossfire | 33 | `GENERAL` | Point Blank Shot, Precise Shot, base attack bonus +6. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per round, a ranged miss against a target with soft cover can redirect the same attack to the cover provider. |
| Cunning Attack | 33 | `GENERAL` | None. | - | `SUMMARY_PARTIAL` | Gain +2 to attack a flat-footed target or any target denied its Dexterity bonus to Reflex Defense. |
| Focused Rage | 33 | `GENERAL` | Rage species trait, Controlled Rage. | - | `CANONICAL_TEXT_MATCHES_RULE` | While raging, use patience/concentration skills at a -5 penalty instead of being barred from them. |
| Improved Bantha Rush | 33 | `GENERAL` | Bantha Rush, Strength 15, base attack bonus +1. | - | `SUMMARY_ERROR` | Bantha Rush pushes extra squares equal to half your Strength modifier, with at least 2 squares pushed total. |
| Informer | 33 | `GENERAL` | SOURCE CONFLICT: feat table requires trained Perception plus Skill Focus (Perception); detailed feat entry requires only trained Perception. | - | `SOURCE_INTERNAL_CONFLICT` | Use Perception in place of Gather Information, inherit eligible rerolls, and halve information-gathering time under favorable conditions. |
| Mighty Throw | 33 | `GENERAL` | Strength 13. | - | `SUMMARY_PARTIAL` | Thrown weapons add Strength to ranged attack rolls and extend each range category by your Strength modifier in squares. |
| Natural Leader | 34 | `GENERAL` | Charisma 13. | - | `DESCRIPTION_NONCANONICAL_ADDITION` | Found an organization with scale based on half heroic level plus Charisma bonus and begin with +10 organization score. |
| Powerful Rage | 34 | `GENERAL` | Rage species trait. | - | `CANONICAL_TEXT_MATCHES_RULE` | While raging, gain +4 on Strength checks and Strength-based skill checks. |
| Rapport | 34 | `GENERAL` | SOURCE CONFLICT: feat table lists Wisdom 13; detailed feat entry has no prerequisite paragraph. | - | `SOURCE_INTERNAL_CONFLICT` | Aid Another grants an additional +2 insight bonus on attacks or skills, not stacking with Coordinate. |
| Recall | 35 | `GENERAL` | Trained in at least one Knowledge skill. | - | `MISSING_CANONICAL_REPO_RECORD` | Once per day, reroll a trained Knowledge check and keep the better result. |
| Savage Attack | 35 | `GENERAL` | Double Attack (chosen weapon), proficient with chosen weapon. | - | `PREREQUISITE_ERROR` | For a chosen Double Attack weapon, hitting the first attack of a full attack gives +1 die damage to later successful attacks against that same target. |
| Scavenger | 35 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Spend an hour scavenging to generate Perception × 30 credits of raw materials for one specific construction project. |
| Strafe | 35 | `GENERAL` | SOURCE CONFLICT: feat table lists Running Attack; detailed feat entry lists base attack bonus +1. | - | `SOURCE_INTERNAL_CONFLICT_AND_SUMMARY_ERROR` | Turn autofire into a 1×4 line; with a jetpack, strafe every square you fly over. |
| Swarm | 35 | `GENERAL` | Coordinated Attack. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +1 melee attack for each ally adjacent to your target. |
| Unleashed | 35 | `GENERAL` | Must have chosen a destiny (or secret destiny). | - | `PREREQUISITE_NONCANONICAL_ADDITION` | Spend Destiny Points to access Unleashed abilities; Force-related Unleashed options additionally require Force Sensitivity. |

### Detailed rules and repository findings

#### Advantageous Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Canonical quick summary:** Against an enemy that has not yet acted, a successful attack adds full heroic level to damage instead of half.
- When you make a successful attack against an enemy that has not yet acted in combat, add your full heroic level to the damage roll.
- Normally only one-half heroic level is added to damage.
- **Repository finding:** The full description is canonical, but the short summary says 'attacks against slower enemies,' which changes both the trigger and what receives the bonus.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.32` -> canonical `The Force Unleashed Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `initiative`, `damage`, `heroic_level`, `target_state`
- **Automation observation for later phase:** Current runtime is directly wrong: it checks a slower target and adds heroic level to the attack roll instead of damage.

#### Advantageous Cover

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in the Stealth skill.
- **Canonical quick summary:** While you have cover, area attacks deal no damage to you even on a successful attack roll.
- When you have cover, take no damage from area attacks even if the attack roll exceeds your Reflex Defense.
- Normally cover prevents area damage only when the attack roll misses.
- **Repository finding:** Detailed description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.32` -> canonical `The Force Unleashed Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `cover`, `area_attack`, `damage_avoidance`
- **Automation observation for later phase:** Existing metadata is generic and later automation must prove exact area-damage immunity while covered.

#### Angled Throw

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13.
- **Canonical quick summary:** Bounce a grenade-like attack to ignore cover/improved cover when the attack roll exceeds 15, but never total cover.
- When throwing a grenade or grenadelike weapon, you may bounce it off a nearby surface.
- If the attack roll exceeds Reflex Defense 15, ignore cover and improved cover, but not total cover.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.32` -> canonical `The Force Unleashed Campaign Guide p.32` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `thrown`, `grenade`, `cover`, `reflex_15`
- **Automation observation for later phase:** Current cover-suppression rule does not visibly preserve the >15 threshold or total-cover exception.

#### Bad Feeling

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Always gain a move action in the surprise round; if not surprised, it is additional.
- You may always take a move action during a surprise round, even if surprised.
- If not surprised, that move action is in addition to the actions you normally receive in the surprise round.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.32` -> canonical `The Force Unleashed Campaign Guide p.32` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `surprise_round`, `move_action`, `action_economy`
- **Automation observation for later phase:** Current representation is substantially faithful.

#### Blaster Barrage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Coordinated Attack.
- **Canonical quick summary:** Damage a target with autofire to give allies +2 circumstance on autofire attacks against that target until your next turn.
- When your autofire attack damages at least one target in its area, allies gain +2 circumstance on autofire attacks against that same target until the beginning of your next turn.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.33` -> canonical `The Force Unleashed Campaign Guide p.32` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `autofire`, `ally_bonus`, `circumstance_bonus`, `coordinated_attack`
- **Automation observation for later phase:** Effect metadata is broadly correct; later runtime verification should prove same-target and duration handling.

#### Controlled Rage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rage species trait.
- **Canonical quick summary:** Start Rage as a free action and choose when to finish it, with the rage ending one round after that declaration.
- Enter rage as a free action.
- After declaring rage finished, it ends 1 round later.
- This feat cannot extend the number of rage rounds available.
- **Repository finding:** The full description is faithful, but the summary 'end Rage at will' omits the one-round delay and can misstate the rule.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.33` -> canonical `The Force Unleashed Campaign Guide p.33` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `rage`, `free_action`, `duration`, `species_trait`
- **Automation observation for later phase:** Current metadata's canEndAtWill wording risks implying immediate termination and omits the no-extension rule.

#### Crossfire

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot, Precise Shot, base attack bonus +6.
- **Canonical quick summary:** Once per round, a ranged miss against a target with soft cover can redirect the same attack to the cover provider.
- If a ranged attack misses a target with soft cover, immediately make an attack with the same weapon and attack bonus against the creature providing that soft cover.
- Usable only once per round.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.33` -> canonical `The Force Unleashed Campaign Guide p.33` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `ranged`, `soft_cover`, `follow_up_attack`, `once_per_round`
- **Automation observation for later phase:** Current effect is substantially correct; later automation should confirm exact same-weapon/same-bonus and once-per-round state.

#### Cunning Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Gain +2 to attack a flat-footed target or any target denied its Dexterity bonus to Reflex Defense.
- Gain +2 on attack rolls against a flat-footed enemy or an enemy denied its Dexterity bonus to Reflex Defense.
- **Repository finding:** Detailed description is faithful; short summary mentions only flat-footed enemies and omits the broader denied-Dexterity condition.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.34` -> canonical `The Force Unleashed Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack_bonus`, `flat_footed`, `denied_dexterity`
- **Automation observation for later phase:** Current metadata appears to key only on flat-footed and may miss other denied-Dexterity cases.

#### Focused Rage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rage species trait, Controlled Rage.
- **Canonical quick summary:** While raging, use patience/concentration skills at a -5 penalty instead of being barred from them.
- While raging, you may use skills requiring patience and concentration at a -5 penalty.
- Normally those skills cannot be used while raging.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.34` -> canonical `The Force Unleashed Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `rage`, `skill`, `concentration`, `penalty`
- **Automation observation for later phase:** Current rule is broadly faithful; later taxonomy should not treat this as inherently Force-specific.

#### Improved Bantha Rush

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Bantha Rush, Strength 15, base attack bonus +1.
- **Canonical quick summary:** Bantha Rush pushes extra squares equal to half your Strength modifier, with at least 2 squares pushed total.
- When making a Bantha Rush, push the opponent additional squares equal to one-half your Strength modifier, rounded down.
- The total push is at least 2 squares.
- **Repository finding:** Detailed description is faithful, but the short summary incorrectly says the push is equal to the Strength modifier rather than half the modifier.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.34` -> canonical `The Force Unleashed Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `bantha_rush`, `forced_movement`, `strength`
- **Automation observation for later phase:** The underlying push-distance formula is represented correctly.

#### Informer

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** SOURCE CONFLICT: feat table requires trained Perception plus Skill Focus (Perception); detailed feat entry requires only trained Perception.
- **Canonical quick summary:** Use Perception in place of Gather Information, inherit eligible rerolls, and halve information-gathering time under favorable conditions.
- Use your Perception modifier instead of Gather Information for Gather Information checks and count as trained in Gather Information for this use.
- If entitled to a Gather Information reroll, reroll the substituted Perception check under the same restrictions.
- Under favorable Gather Information conditions, halve the time required.
- **Repository finding:** Current repo follows the detailed feat entry and requires trained Perception only; the printed table additionally lists Skill Focus (Perception).
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.35` -> canonical `The Force Unleashed Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `skill`, `perception`, `gather_information`, `substitution`, `reroll`, `time_reduction`, `source_conflict`
- **Automation observation for later phase:** Existing mechanics are substantially faithful, but prerequisite certification must wait on resolution of the table/detail conflict.

#### Mighty Throw

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13.
- **Canonical quick summary:** Thrown weapons add Strength to ranged attack rolls and extend each range category by your Strength modifier in squares.
- Add Strength modifier in addition to Dexterity modifier to ranged attack bonus with thrown weapons, including grenades and grenadelike weapons.
- Increase the length of each range category by squares equal to your Strength modifier.
- **Repository finding:** Detailed description is faithful; short summary omits the range-extension benefit.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.35` -> canonical `The Force Unleashed Campaign Guide p.33` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `thrown_weapon`, `strength`, `attack_bonus`, `range`
- **Automation observation for later phase:** Strength-to-attack is represented; range extension remains advisory until range UI/runtime owns it.

#### Natural Leader

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Charisma 13.
- **Canonical quick summary:** Found an organization with scale based on half heroic level plus Charisma bonus and begin with +10 organization score.
- Become leader of an organization of your design.
- Organization scale equals one-half heroic level plus Charisma bonus.
- Begin with +10 organization score for the new organization.
- **Repository finding:** Current detailed text adds that the organization 'continues to grow in scale as you gain levels.' That is a reasonable derivation from the formula but is not printed in the canonical feat text. Provenance is also wrong: this is TFU p.34, not Core p.88.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `The Force Unleashed Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `organization`, `leadership`, `charisma`, `organization_score`, `progression`
- **Automation observation for later phase:** This belongs to organization/progression ownership, not combat automation.

#### Powerful Rage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rage species trait.
- **Canonical quick summary:** While raging, gain +4 on Strength checks and Strength-based skill checks.
- While raging, gain +4 on Strength checks and Strength-based skill checks.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.35` -> canonical `The Force Unleashed Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `rage`, `strength`, `skill_bonus`
- **Automation observation for later phase:** Current mechanics are substantially faithful.

#### Rapport

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** SOURCE CONFLICT: feat table lists Wisdom 13; detailed feat entry has no prerequisite paragraph.
- **Canonical quick summary:** Aid Another grants an additional +2 insight bonus on attacks or skills, not stacking with Coordinate.
- When using Aid Another, grant an additional +2 insight bonus on skill checks and attack rolls to the assisted character.
- This additional bonus does not stack with a bonus from the noble's Coordinate talent.
- **Repository finding:** Current repo uses Wisdom 13 from the printed table; the detailed feat definition provides no prerequisite.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.36` -> canonical `The Force Unleashed Campaign Guide p.34` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `aid_another`, `insight_bonus`, `ally`, `skill`, `attack`, `source_conflict`
- **Automation observation for later phase:** Current effect is substantially faithful; prerequisite certification remains unresolved because the source conflicts internally.

#### Recall

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in at least one Knowledge skill.
- **Canonical quick summary:** Once per day, reroll a trained Knowledge check and keep the better result.
- Once per day, reroll any Knowledge skill check in which you are trained and keep the better result.
- **Repository finding:** Phase 0 proves this feat is missing from the live feat corpus even though older update/report artifacts contain a Recall row.
- **Provenance observation:** no live feat record -> canonical `The Force Unleashed Campaign Guide p.35` (`MISSING_REPO_RECORD_DOMAIN_GUARD_FALSE_NEGATIVE`).
- **Tag candidates for later phase:** `knowledge`, `reroll`, `once_per_day`, `trained_skill`
- **Automation observation for later phase:** A new canonical feat record is required. It must remain distinct from the separate Rebellion Era talent named Recall; name-only domain guards are invalid here.

#### Savage Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Double Attack (chosen weapon), proficient with chosen weapon.
- **Canonical quick summary:** For a chosen Double Attack weapon, hitting the first attack of a full attack gives +1 die damage to later successful attacks against that same target.
- Choose a weapon group or exotic weapon already selected for Double Attack.
- During a full attack, if the first attack hits the target, each remaining successful attack against that target deals +1 die of damage.
- **Repository finding:** Current prerequisite representation omits explicit proficiency with the chosen weapon; source provenance is also wrong.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `The Force Unleashed Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `full_attack`, `double_attack`, `weapon_choice`, `damage`, `same_target`
- **Automation observation for later phase:** Current metadata captures the weapon choice but not the full-attack first-hit sequence, same-target requirement, or later-hit damage rider.

#### Scavenger

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Spend an hour scavenging to generate Perception × 30 credits of raw materials for one specific construction project.
- Spend 1 hour scavenging materials from vehicles or objects.
- Make a Perception check and produce raw materials worth check result × 30 credits.
- Materials must be applied to constructing one specific object.
- You may scavenge for only one object at a time and only once for any given object being built.
- **Repository finding:** Description is faithful; source provenance is wrong.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `The Force Unleashed Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `crafting`, `scavenging`, `perception`, `materials`, `downtime`, `build_object`
- **Automation observation for later phase:** Current procedure captures the core value calculation but does not visibly enforce one-project-at-a-time and once-per-object limits.

#### Strafe

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** SOURCE CONFLICT: feat table lists Running Attack; detailed feat entry lists base attack bonus +1.
- **Canonical quick summary:** Turn autofire into a 1×4 line; with a jetpack, strafe every square you fly over.
- When making an autofire attack, replace the normal 2×2 area with a line 1 square wide and 4 squares long.
- With a jetpack, Strafe may instead make an autofire attack against all squares you fly over.
- **Repository finding:** Current short summary implies the general feat attacks targets as you move past them, which is only the jetpack Special case. The source also conflicts on the prerequisite.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.36` -> canonical `The Force Unleashed Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `autofire`, `line`, `jetpack`, `movement`, `source_conflict`
- **Automation observation for later phase:** Current 1×4 autofire transformation is represented, but the jetpack special is not.

#### Swarm

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Coordinated Attack.
- **Canonical quick summary:** Gain +1 melee attack for each ally adjacent to your target.
- Gain +1 circumstance on melee attack rolls for each allied character adjacent to your target.
- **Repository finding:** Description is faithful.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.37` -> canonical `The Force Unleashed Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `ally`, `adjacency`, `circumstance_bonus`
- **Automation observation for later phase:** Current mechanics are correct in spirit, but a hard maximum context value of 8 is an engine/grid assumption not stated by RAW.

#### Unleashed

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Must have chosen a destiny (or secret destiny).
- **Canonical quick summary:** Spend Destiny Points to access Unleashed abilities; Force-related Unleashed options additionally require Force Sensitivity.
- Spend a Destiny Point to activate Unleashed abilities.
- Force Sensitivity is additionally required to activate Unleashed abilities for Force powers and talents.
- Normally Unleashed abilities and powers are unavailable without this feat.
- **Repository finding:** Current prerequisite data adds Gamemaster approval as if it were a hard prerequisite. The book introduction says the feat usually requires GM approval, but the printed feat prerequisite itself is only having chosen a destiny/secret destiny.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.37` -> canonical `The Force Unleashed Campaign Guide p.35` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `destiny`, `destiny_point`, `unleashed`, `system_access`, `force_sensitivity`
- **Automation observation for later phase:** This is progression/system-access behavior rather than a generic Force modifier.

---

## Book 8 - Clone Wars Campaign Guide

Full feat publications: **21**; new canonical identities: **21**; reprints: **0**.

- Clone Wars publishes exactly 21 canonical feat identities.
- Direct PDF verification corrects a major provenance error in the existing Phase 0 census: the feat definitions are on printed pp.28-29 and 31-32, not pp.20-29.
- The feat summary table is on printed p.30 and should not be mistaken for the definition page of every feat.
- Because of the corrected page map, none of the 21 current repo records has correct final source/page provenance; Unstoppable Force also has the wrong sourcebook.
- Expert Droid Repair has no printed minimum-2 clause. The current repo/Fandom-style wording incorrectly imports the minimum-2 rule that belongs to Experienced Medic.
- Artillery Shot, Droid Hunter, and Flood of Fire are missing the canonical 'proficient with weapon used' prerequisite in current prerequisite data.
- Grand Army of the Republic Training requires proficiency with the armor worn, not specifically Armor Proficiency (Light).
- Most remaining Clone Wars benefit text is faithful; the larger problems are prerequisite fidelity, provenance, taxonomy, and incomplete/narrow runtime consumers.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Anointed Hunter | 28 | `GENERAL` | Nelvaanian species. | - | `CANONICAL_TEXT_MATCHES_RULE` | Move at least 2 squares and gain +1 competence on thrown-weapon attacks for the rest of the turn. |
| Artillery Shot | 28 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | At beyond point-blank range, expand a proficient burst/splash weapon's affected area by two adjacent squares. |
| Coordinated Barrage | 28 | `GENERAL` | Coordinated Attack, base attack bonus +5. | - | `CANONICAL_TEXT_MATCHES_RULE` | Aid an ally's attack to convert every 3 points above Reflex into +1 damage die, capped by aiding feat-holders or 5 dice. |
| Droidcraft | 28 | `GENERAL` | Trained in Mechanics. | - | `CANONICAL_TEXT_MATCHES_RULE` | Repair a droid in 10 minutes instead of 1 hour. |
| Droid Hunter | 29 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | With a proficient weapon, deal +2 damage to droids, or +4 with ion damage. |
| Experienced Medic | 29 | `GENERAL` | Trained in Treat Injury. | - | `CANONICAL_TEXT_MATCHES_RULE` | Perform surgery on multiple creatures at once: Intelligence bonus targets, minimum 2, with separate checks. |
| Expert Droid Repair | 29 | `GENERAL` | Trained in Mechanics. | - | `DESCRIPTION_ERROR_NONCANONICAL_MINIMUM` | Repair a number of droids at once equal to your Intelligence bonus, making separate Mechanics checks. |
| Flash and Clear | 29 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Damage a target with burst/splash to gain concealment against it until your next turn. |
| Flood of Fire | 29 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | With a proficient autofire weapon, strip dodge and deflection Reflex bonuses from targets in the area for that attack. |
| Grand Army of the Republic Training | 31 | `GENERAL` | Proficient with armor worn. | - | `PREREQUISITE_ERROR` | While proficient in your armor, apply its Fortitude equipment bonus to Will Defense too. |
| Gunnery Specialist | 31 | `GENERAL` | Base attack bonus +1. | - | `CANONICAL_TEXT_MATCHES_RULE` | Become proficient with vehicle weapons while gunning and once per encounter reroll one vehicle-weapon attack; also enables limited Starship Tactics qualification. |
| Jedi Familiarity | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, a non-harmful allied Force effect grants a temporary Force Point that expires at encounter end. |
| Leader of Droids | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Let a limited number of willing allied droids receive your beneficial mind-affecting effects. |
| Overwhelming Attack | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Spend two swift actions so attempts to negate your next attack this round take -5. |
| Pall of the Dark Side | 31 | `GENERAL` | Dark Side Score 1+. | - | `CANONICAL_TEXT_MATCHES_RULE` | Add half your Dark Side Score, minimum +1, when resisting Sense Force detection. |
| Separatist Military Training | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | While adjacent to an ally, gain +1 circumstance on one attack roll during your turn. |
| Spray Shot | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Reduce an autofire attack's area to a single square. |
| Trench Warrior | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | While adjacent to cover that protects you from a target's ranged attacks, gain +1 circumstance on attacks against that target. |
| Unstoppable Force | 31 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +5 insight Fortitude and Will against attacks/effects resolved with Use the Force. |
| Unwavering Resolve | 32 | `GENERAL` | Trained in Perception. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +5 insight Will Defense against Deception and Persuasion. |
| Wary Defender | 32 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Fighting Defensively also grants +2 competence Fortitude and Will until your next turn. |

### Detailed rules and repository findings

#### Anointed Hunter

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Nelvaanian species.
- **Canonical quick summary:** Move at least 2 squares and gain +1 competence on thrown-weapon attacks for the rest of the turn.
- If you end your move at least 2 squares from where you started, gain +1 competence on attacks with thrown weapons until the end of your turn.
- **Repository finding:** Description is faithful. Repository page is wrong; direct PDF certification places the feat on printed p.28.
- **Provenance observation:** current `Clone Wars Campaign Guide p.20` -> canonical `Clone Wars Campaign Guide p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `nelvaanian`, `movement`, `thrown_weapon`, `attack_bonus`
- **Automation observation for later phase:** Current movement-triggered attack bonus is substantially correct; later taxonomy should expose the Nelvaanian gate.

#### Artillery Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** At beyond point-blank range, expand a proficient burst/splash weapon's affected area by two adjacent squares.
- With a burst or splash weapon against a target beyond point-blank range, affect two additional squares adjacent to the normal burst/splash area.
- **Repository finding:** Current prerequisite is None. Canonical prerequisite is proficiency with the weapon used.
- **Provenance observation:** current `Clone Wars Campaign Guide p.20` -> canonical `Clone Wars Campaign Guide p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `area_attack`, `burst`, `splash`, `weapon_proficiency`, `range`
- **Automation observation for later phase:** Area expansion is represented, but the progression/proficiency gate must be certified later.

#### Coordinated Barrage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Coordinated Attack, base attack bonus +5.
- **Canonical quick summary:** Aid an ally's attack to convert every 3 points above Reflex into +1 damage die, capped by aiding feat-holders or 5 dice.
- When you aid an ally's attack, every 3 points by which that ally's attack exceeds the target's Reflex Defense adds +1 damage die.
- Maximum bonus dice equals the number of allies with Coordinated Barrage who aided the attack, or +5 dice, whichever is lower.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 28.
- **Provenance observation:** current `Clone Wars Campaign Guide p.21` -> canonical `Clone Wars Campaign Guide p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `aid_another`, `ally`, `damage_scaling`, `coordinated_attack`
- **Automation observation for later phase:** Current scaling model is broadly faithful; later certification should prove the cap and qualifying aider count.

#### Droidcraft

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Mechanics.
- **Canonical quick summary:** Repair a droid in 10 minutes instead of 1 hour.
- Perform Repair Droid in 10 minutes instead of the normal 1 hour.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 28.
- **Provenance observation:** current `Clone Wars Campaign Guide p.21` -> canonical `Clone Wars Campaign Guide p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `mechanics`, `repair`, `time_reduction`
- **Automation observation for later phase:** Current repair-time override is straightforward and substantially correct.

#### Droid Hunter

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** With a proficient weapon, deal +2 damage to droids, or +4 with ion damage.
- Gain +2 damage against droids, or +4 damage when using a weapon that deals ion damage.
- **Repository finding:** Current prerequisite is None. Canonical prerequisite is proficiency with the weapon used.
- **Provenance observation:** current `Clone Wars Campaign Guide p.21` -> canonical `Clone Wars Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `droid`, `damage_bonus`, `ion`, `weapon_proficiency`
- **Automation observation for later phase:** The +2/+4 damage logic is represented, but the proficiency eligibility is not fully structured.

#### Experienced Medic

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Treat Injury.
- **Canonical quick summary:** Perform surgery on multiple creatures at once: Intelligence bonus targets, minimum 2, with separate checks.
- Perform surgery on a number of creatures simultaneously equal to your Intelligence bonus, minimum 2.
- Make Treat Injury checks separately for each creature as normal.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 29.
- **Provenance observation:** current `Clone Wars Campaign Guide p.22` -> canonical `Clone Wars Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `medical`, `treat_injury`, `surgery`, `multi_target`, `intelligence`
- **Automation observation for later phase:** Current multi-patient surgery representation is substantially faithful.

#### Expert Droid Repair

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Mechanics.
- **Canonical quick summary:** Repair a number of droids at once equal to your Intelligence bonus, making separate Mechanics checks.
- Repair a number of droids simultaneously equal to your Intelligence bonus.
- Make Mechanics checks separately for each droid as normal.
- Unlike Experienced Medic, the printed feat text does not state a minimum of 2.
- **Repository finding:** Direct PDF review resolves the OCR/repo discrepancy: Expert Droid Repair has no printed 'minimum 2' clause. The repository/Fandom-derived wording adds one.
- **Provenance observation:** current `Clone Wars Campaign Guide p.22` -> canonical `Clone Wars Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `mechanics`, `repair`, `multi_target`, `intelligence`
- **Automation observation for later phase:** Current implementation/report data adds a minimum-2 target rule that the printed feat does not contain.

#### Flash and Clear

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Damage a target with burst/splash to gain concealment against it until your next turn.
- When you damage a target with a burst or splash weapon, gain concealment against that target until the beginning of your next turn.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 29.
- **Provenance observation:** current `Clone Wars Campaign Guide p.23` -> canonical `Clone Wars Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `burst`, `splash`, `concealment`, `defense`
- **Automation observation for later phase:** The concealment rider is represented; later runtime certification should prove target-specific duration.

#### Flood of Fire

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** With a proficient autofire weapon, strip dodge and deflection Reflex bonuses from targets in the area for that attack.
- When making an autofire area attack, all targets in the area lose dodge and deflection bonuses to Reflex Defense against that attack.
- **Repository finding:** Current prerequisite is None. Canonical prerequisite is proficiency with the weapon used.
- **Provenance observation:** current `Clone Wars Campaign Guide p.23` -> canonical `Clone Wars Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `autofire`, `area_attack`, `reflex_defense`, `dodge`, `deflection`, `weapon_proficiency`
- **Automation observation for later phase:** The defensive-bonus suppression is represented, but the proficiency requirement is not properly carried by the prerequisite field.

#### Grand Army of the Republic Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with armor worn.
- **Canonical quick summary:** While proficient in your armor, apply its Fortitude equipment bonus to Will Defense too.
- If your worn armor grants an equipment bonus to Fortitude Defense, also apply that armor's equipment bonus to Will Defense.
- **Repository finding:** Current prerequisite says Armor Proficiency (Light), but the source requires proficiency with whatever armor is being worn.
- **Provenance observation:** current `Clone Wars Campaign Guide p.24` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `armor`, `proficiency`, `fortitude`, `will_defense`, `equipment_bonus`, `military_training`
- **Automation observation for later phase:** Runtime armor-proficiency handling is closer to RAW than the stored prerequisite text.

#### Gunnery Specialist

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Canonical quick summary:** Become proficient with vehicle weapons while gunning and once per encounter reroll one vehicle-weapon attack; also enables limited Starship Tactics qualification.
- While serving as a vehicle gunner, count as proficient with vehicle weapons.
- Once per encounter, reroll a vehicle-weapon attack after learning the result but before damage; keep the second result even if worse.
- This feat satisfies Starship Tactics prerequisites.
- Unless also trained in Pilot and possessing Vehicular Combat, Starship Tactics gained through this qualification is limited to [gunner] maneuvers.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.24` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `vehicle`, `gunnery`, `vehicle_weapon`, `proficiency`, `reroll`, `starship_tactics`, `progression`
- **Automation observation for later phase:** Attack proficiency/reroll are modeled; the Starship Tactics qualification and [gunner]-only restriction require later progression certification.

#### Jedi Familiarity

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per encounter, a non-harmful allied Force effect grants a temporary Force Point that expires at encounter end.
- Once per encounter, when an ally's Force power or Force talent targets or affects you, gain one temporary Force Point.
- The temporary Force Point expires at encounter end.
- No benefit if that Force power/talent damages you or moves you down the condition track.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.25` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force_point`, `ally`, `force_power`, `force_talent`, `temporary_resource`, `once_per_encounter`
- **Automation observation for later phase:** Current mechanics substantially preserve the trigger, temporary resource, and harmful-effect exclusions.

#### Leader of Droids

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Let a limited number of willing allied droids receive your beneficial mind-affecting effects.
- When you provide a beneficial mind-affecting effect to allies, choose a number of allied droids equal to your Intelligence modifier, minimum 1.
- Chosen willing droids may ignore their immunity to mind-affecting effects for that beneficial effect.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.25` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `droid`, `ally`, `mind_affecting`, `beneficial_effect`, `intelligence`
- **Automation observation for later phase:** This remains partly context/manual because willing immunity suppression must be tied to the specific beneficial effect.

#### Overwhelming Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Spend two swift actions so attempts to negate your next attack this round take -5.
- Spend two swift actions in the same round to activate.
- If the target tries to negate your next attack with a feat, talent, or ability, it takes -5 on the attack roll or skill check used to negate it.
- Applies only to the next attack made before the end of the same round.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.26` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `swift_action`, `attack_negation`, `block`, `deflect`, `vehicular_combat`, `penalty`
- **Automation observation for later phase:** Current metadata is broadly faithful; later runtime certification should confirm setup consumption and end-of-round expiration.

#### Pall of the Dark Side

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dark Side Score 1+.
- **Canonical quick summary:** Add half your Dark Side Score, minimum +1, when resisting Sense Force detection.
- Add one-half your Dark Side Score, minimum +1, to Use the Force checks made to resist detection via Sense Force.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.26` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `dark_side`, `use_the_force`, `sense_force`, `detection`, `resistance`
- **Automation observation for later phase:** Current effect representation is substantially faithful.

#### Separatist Military Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** While adjacent to an ally, gain +1 circumstance on one attack roll during your turn.
- While adjacent to at least one ally, gain +1 circumstance on any one attack roll you make on your turn.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.27` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ally`, `adjacency`, `attack_bonus`, `circumstance_bonus`, `military_training`
- **Automation observation for later phase:** Later automation must preserve 'one attack roll on your turn,' not convert this into a persistent adjacent-ally bonus.

#### Spray Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Reduce an autofire attack's area to a single square.
- When using a weapon set on autofire, you may reduce the targeted autofire area to 1 square.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 31.
- **Provenance observation:** current `Clone Wars Campaign Guide p.27` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `autofire`, `area_attack`, `single_target`
- **Automation observation for later phase:** Current autofire-area mutation is straightforward and substantially correct.

#### Trench Warrior

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** While adjacent to cover that protects you from a target's ranged attacks, gain +1 circumstance on attacks against that target.
- When adjacent to a wall or object that gives you cover from a target's ranged attacks, gain +1 circumstance on your attack rolls against that target.
- **Repository finding:** Description is faithful; automation is narrower than the printed rule. Repository page is also wrong.
- **Provenance observation:** current `Clone Wars Campaign Guide p.28` -> canonical `Clone Wars Campaign Guide p.31` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `cover`, `attack_bonus`, `circumstance_bonus`, `target_state`
- **Automation observation for later phase:** Current runtime incorrectly appears to require your own qualifying attack to be ranged; RAW only requires cover from the target's ranged attacks.

#### Unstoppable Force

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Gain +5 insight Fortitude and Will against attacks/effects resolved with Use the Force.
- Gain +5 insight to Fortitude Defense and Will Defense against any attack or effect requiring a Use the Force check.
- **Repository finding:** Canonical source is Clone Wars p.31. The current Force Unleashed provenance is wrong; this is a general defensive feat with no Force prerequisite.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.35` -> canonical `Clone Wars Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `fortitude`, `will_defense`, `use_the_force`, `insight_bonus`
- **Automation observation for later phase:** The defense modifier is faithful, but later taxonomy must not infer a Force-feat prerequisite from the name.

#### Unwavering Resolve

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Perception.
- **Canonical quick summary:** Gain +5 insight Will Defense against Deception and Persuasion.
- Gain +5 insight to Will Defense against Deception and Persuasion checks.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 32.
- **Provenance observation:** current `Clone Wars Campaign Guide p.28` -> canonical `Clone Wars Campaign Guide p.32` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `will_defense`, `deception`, `persuasion`, `insight_bonus`
- **Automation observation for later phase:** Current effect is faithful; later taxonomy should classify by social/mind defense rather than the Perception prerequisite.

#### Wary Defender

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Fighting Defensively also grants +2 competence Fortitude and Will until your next turn.
- When you Fight Defensively, gain +2 competence to Fortitude Defense and Will Defense until the beginning of your next turn.
- **Repository finding:** Description is faithful. Repository page is wrong; canonical printed page is 32.
- **Provenance observation:** current `Clone Wars Campaign Guide p.29` -> canonical `Clone Wars Campaign Guide p.32` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `fight_defensively`, `fortitude`, `will_defense`, `competence_bonus`
- **Automation observation for later phase:** Current metadata substantially matches the source.

---

## Book 10 - Galaxy of Intrigue

Full feat publications: **26**; new canonical identities: **26**; reprints: **0**.

- Galaxy of Intrigue publishes exactly 26 canonical feat identities: 23 general feats and 3 explicitly source-defined Skill Challenge feats.
- All 26 canonical identities exist somewhere in the repository, but none currently has exact final source/page provenance.
- Forceful Recovery is misattributed to The Force Unleashed Campaign Guide; its canonical source is Galaxy of Intrigue p.27.
- Four records currently attributed to Galaxy of Intrigue are not GOI feat identities: Desperate Gambit, Intimidating Presence, Frightening Presence, and Resilient Talent.
- Expert Briber's detailed printed rule is narrower than the repo: it applies to Haggle. The book's summary uses broader bribery language, so the discrepancy remains visible instead of expanding the detailed Benefit.
- Recurring Success is genuinely misprinted in the source: its repeat-selection sentence refers to a different 'skill' and 'this talent.' Repeatability is explicit, but the exact repeated-choice constraint requires errata/adjudication.
- Master of Disguise's current description omits forged documents from the +5 insight bonus.
- Skill Challenge: Catastrophic Avoidance and Skill Challenge: Last Resort are too compressed in the current description to serve as canonical player-facing rules text.
- Sadistic Strike's description is correct but current automation changes an all-opponents-in-line-of-sight effect into a single-target effect.
- Wookiee Grip has no Wookiee prerequisite; it requires Strength 13. Current runtime also omits its -2 attack penalty when wielding a two-handed weapon in one hand.

### Repo records wrongly attributed to this book

| Record | Ruling | Canonical identity |
|---|---|---|
| Desperate Gambit | `WRONG_SOURCE` | Scum and Villainy feat |
| Intimidating Presence | `INVALID_NONFEAT_IDENTITY_COLLISION` | Saga species-trait name collision; not a GOI feat |
| Frightening Presence | `UNSUPPORTED_NON_GOI_FEAT_RECORD` | None found |
| Resilient Talent | `UNSUPPORTED_NON_GOI_FEAT_RECORD` | None found |

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Adaptable Talent | 25 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Choose a qualifying talent from one of your classes and, once per day after 6 hours' rest, temporarily swap it with a current non-prerequisite talent. |
| Bone Crusher | 25 | `GENERAL` | Crush, Pin. | - | `CANONICAL_TEXT_MATCHES_RULE` | Damaging a grappled opponent also moves it -1 step on the condition track. |
| Brilliant Defense | 25 | `GENERAL` | Intelligence 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, react to add Intelligence bonus to Reflex Defense until your next turn. |
| Channel Rage | 25 | `GENERAL` | Rage species trait. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per day, spend your Rage use to gain +5 Will Defense for the encounter instead of raging. |
| Cut the Red Tape | 27 | `GENERAL` | Trained in Knowledge (Bureaucracy). | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Knowledge (Bureaucracy) for Gather Information, including eligible rerolls, and count as trained for the substituted check. |
| Demoralizing Strike | 27 | `GENERAL` | Charisma 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Damage an opponent with an AoO to immediately Intimidate it as a free action. |
| Disturbing Presence | 27 | `GENERAL` | Trained in Deception. | - | `CANONICAL_TEXT_MATCHES_RULE` | DC 15 Deception lets you move through enemy threatened/occupied squares without provoking, at double movement cost. |
| Expert Briber | 27 | `GENERAL` | Charisma 13. | - | `DESCRIPTION_ERROR_SOURCE_INTERNAL_CONFLICT` | Detailed rule lowers the Haggle DC for reducing an item's price by 10; the book's summary uses broader bribery language. |
| Flèche | 27 | `GENERAL` | Base attack bonus +1. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter during a charge, turn a natural 17+ attack roll into a critical hit. |
| Forceful Recovery | 27 | `GENERAL` | Force Sensitivity, Force Training. | - | `CANONICAL_TEXT_MATCHES_RULE` | Catch a second wind to recover one expended Force power. |
| Grazing Shot | 27 | `GENERAL` | Point Blank Shot. | - | `CANONICAL_TEXT_MATCHES_RULE` | After hitting one ranged target, test a second nearby LOS target; success splits one damage roll between both, failure deals no damage to either. |
| Hobbling Strike | 28 | `GENERAL` | Sneak Attack, Rapid Shot, or Rapid Strike. | - | `CANONICAL_TEXT_MATCHES_RULE` | Trade Sneak Attack/Rapid Shot/Rapid Strike extra damage to reduce the target's speed by 1 for the encounter. |
| Improved Opportunistic Trickery | 28 | `GENERAL` | Combat Reflexes, Opportunistic Trickery. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per turn, sacrifice a provoked AoO to give the target -5 Reflex through its next turn. |
| Indomitable Personality | 28 | `GENERAL` | Charisma 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, react to add Charisma bonus to Will Defense through the end of your next turn. |
| Master of Disguise | 28 | `GENERAL` | Trained in Deception, Charisma 13. | - | `DESCRIPTION_ERROR` | Gain +5 insight to deceptive appearances and forged documents, and rush either at only -2 instead of -10. |
| Meat Shield | 28 | `GENERAL` | Point Blank Shot, Precise Shot, base attack bonus +4. | - | `CANONICAL_TEXT_MATCHES_RULE` | If another creature provides your cover, retain cover against attacks from that opponent. |
| Opportunistic Trickery | 28 | `GENERAL` | Combat Reflexes, Sneak Attack. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per turn, sacrifice a provoked AoO to reduce the target's Reflex by 2 for the following round. |
| Recurring Success | 28 | `GENERAL` | None. | - | `DESCRIPTION_PARTIAL_SOURCE_EDITORIAL_ERROR` | Grant one extra use per encounter to a chosen once-per-encounter feat or talent; printed repeat-selection wording contains an editorial error. |
| Resolute Stance | 28 | `GENERAL` | Base attack bonus +1. | - | `CANONICAL_TEXT_MATCHES_RULE` | Fighting Defensively grants +2 morale Will, or +5 if you make no attacks before your next turn. |
| Sadistic Strike | 28 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Coup de grace a helpless creature to move every opponent in line of sight -1 CT for the encounter. |
| Silver Tongue | 29 | `GENERAL` | Trained in Persuasion. | - | `CANONICAL_TEXT_MATCHES_RULE` | Intimidate or Change Attitude as a standard action. |
| Skill Challenge: Catastrophic Avoidance | 29 | `SKILL_CHALLENGE_FEAT` | Only available in campaigns using the Skill Challenge rules. | - | `DESCRIPTION_ERROR` | Once per skill challenge, raise catastrophic-failure threshold to 15+ and make catastrophe count as only one failure. |
| Skill Challenge: Last Resort | 29 | `SKILL_CHALLENGE_FEAT` | Only available in campaigns using the Skill Challenge rules. | - | `DESCRIPTION_ERROR` | Once per skill challenge, a third failure that would end the challenge can be rerolled by the failing character, keeping the better result. |
| Skill Challenge: Recovery | 29 | `SKILL_CHALLENGE_FEAT` | Only available in campaigns using the Skill Challenge rules. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per skill challenge, give the challenge the Recovery effect. |
| Stand Tall | 29 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter when damaged, nearby visible allies may react with one attack against your attacker. |
| Wookiee Grip | 29 | `GENERAL` | Strength 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use a proficient two-handed weapon in one hand at a -2 attack penalty. |

### Detailed rules and repository findings

#### Adaptable Talent

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Choose a qualifying talent from one of your classes and, once per day after 6 hours' rest, temporarily swap it with a current non-prerequisite talent.
- Choose one talent you qualify for from a class you possess.
- Once per day after at least 6 hours of rest, swap one current talent for the chosen talent.
- The swapped-out talent cannot be a prerequisite for another talent you possess.
- After at least 6 hours of rest, you may swap back to the original talent.
- **Repository finding:** Detailed description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.23` -> canonical `Galaxy of Intrigue p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `progression`, `talent`, `temporary_choice`, `rest`, `once_per_day`
- **Automation observation for later phase:** Current metadata incorrectly frames the chosen talent as an owned talent and does not fully model the rest/swap/prerequisite workflow.

#### Bone Crusher

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Crush, Pin.
- **Canonical quick summary:** Damaging a grappled opponent also moves it -1 step on the condition track.
- Whenever you deal damage to a grappled opponent, that opponent also moves -1 step on the condition track.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.15` -> canonical `Galaxy of Intrigue p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `grapple`, `damage`, `condition_track`, `crush`, `pin`
- **Automation observation for later phase:** Current payload identifies the CT rider but should later be certified under grapple/combat ownership.

#### Brilliant Defense

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Intelligence 13.
- **Canonical quick summary:** Once per encounter, react to add Intelligence bonus to Reflex Defense until your next turn.
- Once per encounter as a reaction, add your Intelligence bonus to Reflex Defense until the start of your next turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.16` -> canonical `Galaxy of Intrigue p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `reflex_defense`, `reaction`, `intelligence`, `once_per_encounter`
- **Automation observation for later phase:** Current reaction metadata is substantially faithful.

#### Channel Rage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rage species trait.
- **Canonical quick summary:** Once per day, spend your Rage use to gain +5 Will Defense for the encounter instead of raging.
- Once per day, instead of entering rage, gain +5 Will Defense until the end of the encounter.
- Using this benefit counts as using your rage ability for that day.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.16` -> canonical `Galaxy of Intrigue p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `rage`, `will_defense`, `once_per_day`, `resource_conversion`
- **Automation observation for later phase:** Current metadata does not visibly encode once/day, encounter duration, or consumption of the Rage use.

#### Cut the Red Tape

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Knowledge (Bureaucracy).
- **Canonical quick summary:** Use Knowledge (Bureaucracy) for Gather Information, including eligible rerolls, and count as trained for the substituted check.
- Use Knowledge (Bureaucracy) modifier in place of Gather Information.
- If entitled to a Gather Information reroll, reroll the substituted Knowledge check under the same restrictions.
- Count as trained in Gather Information for this check.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.17` -> canonical `Galaxy of Intrigue p.27` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `knowledge_bureaucracy`, `gather_information`, `skill_substitution`, `reroll`
- **Automation observation for later phase:** Substitution exists but later automation should explicitly preserve considered-trained status and reroll inheritance.

#### Demoralizing Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Charisma 13.
- **Canonical quick summary:** Damage an opponent with an AoO to immediately Intimidate it as a free action.
- After successfully dealing damage with an attack of opportunity, immediately make a Persuasion check to Intimidate that opponent as a free action.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.17` -> canonical `Galaxy of Intrigue p.27` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `attack_of_opportunity`, `persuasion`, `intimidate`, `free_action`
- **Automation observation for later phase:** Current trigger/action representation is substantially faithful.

#### Disturbing Presence

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Deception.
- **Canonical quick summary:** DC 15 Deception lets you move through enemy threatened/occupied squares without provoking, at double movement cost.
- DC 15 Deception allows movement through an enemy's threatened area or fighting space without provoking.
- Each threatened or occupied square traversed this way costs 2 squares of movement.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.18` -> canonical `Galaxy of Intrigue p.27` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `deception`, `movement`, `threatened_area`, `attack_of_opportunity`, `fighting_space`
- **Automation observation for later phase:** Current rule is substantially faithful.

#### Expert Briber

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Charisma 13.
- **Canonical quick summary:** Detailed rule lowers the Haggle DC for reducing an item's price by 10; the book's summary uses broader bribery language.
- Detailed printed Benefit: when using the Haggle application of Persuasion, reduce by 10 the DC to reduce the price of the item haggled over.
- The chapter summary describes the feat more broadly as reducing the time and cost of bribery attempts, creating an internal source mismatch.
- **Repository finding:** Direct PDF inspection confirms the detailed rule is Haggle-only. The current description expands it to 'Haggle or Bribery' and should not be treated as canonical.
- **Provenance observation:** current `Galaxy of Intrigue p.18` -> canonical `Galaxy of Intrigue p.27` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `persuasion`, `haggle`, `bribery`, `dc_reduction`, `source_conflict`
- **Automation observation for later phase:** Current metadata applies the -10 to both Haggle and Bribery. The detailed printed Benefit supports Haggle only, so broader Bribery automation is unsupported absent errata.

#### Flèche

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Canonical quick summary:** Once per encounter during a charge, turn a natural 17+ attack roll into a critical hit.
- Once per encounter when charging, any natural attack roll of 17 or higher becomes a critical hit.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.19` -> canonical `Galaxy of Intrigue p.27` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `charge`, `critical`, `once_per_encounter`
- **Automation observation for later phase:** Current mechanics are substantially faithful.

#### Forceful Recovery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Force Sensitivity, Force Training.
- **Canonical quick summary:** Catch a second wind to recover one expended Force power.
- Whenever you catch a second wind, choose one expended Force power and return it to your Force suite.
- **Repository finding:** Canonical source is Galaxy of Intrigue p.27, not The Force Unleashed Campaign Guide.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.34` -> canonical `Galaxy of Intrigue p.27` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `force_power`, `recovery`, `force_sensitivity`
- **Automation observation for later phase:** Current mechanic is substantially faithful; provenance is wrong.

#### Grazing Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot.
- **Canonical quick summary:** After hitting one ranged target, test a second nearby LOS target; success splits one damage roll between both, failure deals no damage to either.
- After a successful ranged attack against one target, make a second attack against another target in direct line of sight and within 6 squares of the first.
- If the second attack succeeds, roll damage once and divide it equally between both targets.
- If the second attack misses, neither target takes damage.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.19` -> canonical `Galaxy of Intrigue p.27` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `multi_target`, `line_of_sight`, `split_damage`
- **Automation observation for later phase:** Current sequence is represented well; later runtime certification should verify the fail-no-damage rollback semantics.

#### Hobbling Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Sneak Attack, Rapid Shot, or Rapid Strike.
- **Canonical quick summary:** Trade Sneak Attack/Rapid Shot/Rapid Strike extra damage to reduce the target's speed by 1 for the encounter.
- Whenever one of those abilities would deal extra damage, forgo that extra damage to reduce the target's speed by 1 square until encounter end.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.20` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `speed_reduction`, `sneak_attack`, `rapid_shot`, `rapid_strike`, `tradeoff`
- **Automation observation for later phase:** Current mechanics are substantially faithful.

#### Improved Opportunistic Trickery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Combat Reflexes, Opportunistic Trickery.
- **Canonical quick summary:** Once per turn, sacrifice a provoked AoO to give the target -5 Reflex through its next turn.
- Once per turn when an opponent provokes an AoO from you, sacrifice that attack to reduce its Reflex Defense by 5 until the end of its next turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.20` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `attack_of_opportunity`, `reaction`, `reflex_defense`, `debuff`, `once_per_turn`
- **Automation observation for later phase:** Effect is correct in spirit, though ATTACK_OPTION-style ownership is semantically awkward because no attack is actually made.

#### Indomitable Personality

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Charisma 13.
- **Canonical quick summary:** Once per encounter, react to add Charisma bonus to Will Defense through the end of your next turn.
- Once per encounter as a reaction, add Charisma bonus to Will Defense until the end of your next turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.21` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `will_defense`, `charisma`, `reaction`, `once_per_encounter`
- **Automation observation for later phase:** Current mechanics are substantially faithful.

#### Master of Disguise

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Deception, Charisma 13.
- **Canonical quick summary:** Gain +5 insight to deceptive appearances and forged documents, and rush either at only -2 instead of -10.
- Gain +5 insight on Deception checks to create a deceptive appearance or a forged document.
- You may rush either process at only -2 instead of the normal -10 penalty.
- **Repository finding:** Current detailed description gives +5 only to Deceptive Appearance and omits forged documents from that bonus.
- **Provenance observation:** current `Galaxy of Intrigue p.21` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `deception`, `disguise`, `forgery`, `insight_bonus`, `rush_penalty`
- **Automation observation for later phase:** Current metadata includes forged-document context but does not visibly encode the rush-penalty override.

#### Meat Shield

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot, Precise Shot, base attack bonus +4.
- **Canonical quick summary:** If another creature provides your cover, retain cover against attacks from that opponent.
- Whenever an opponent attacks you while you have cover provided by another character, creature, or droid, you are treated as having cover from that opponent's attacks.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.22` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `cover`, `soft_cover`, `combat`
- **Automation observation for later phase:** Current rule is substantially faithful; taxonomy should not classify this as droid-specific.

#### Opportunistic Trickery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Combat Reflexes, Sneak Attack.
- **Canonical quick summary:** Once per turn, sacrifice a provoked AoO to reduce the target's Reflex by 2 for the following round.
- Once per turn when an opponent provokes an AoO from you, sacrifice that attack to reduce its Reflex Defense by 2 for the following round.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.22` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `attack_of_opportunity`, `reaction`, `reflex_defense`, `debuff`, `once_per_turn`
- **Automation observation for later phase:** Mechanics are correct in spirit; later owner review should place this under reaction/AoO authority rather than a hit-based attack option.

#### Recurring Success

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Grant one extra use per encounter to a chosen once-per-encounter feat or talent; printed repeat-selection wording contains an editorial error.
- Choose one feat or talent that can normally be used only once per encounter; you may use it one additional time per encounter.
- The feat may be selected multiple times.
- The printed repeat-selection sentence is internally corrupted: it says each repeat must choose a different 'skill' to gain the benefits of 'this talent,' despite the feat choosing a talent or feat.
- **Repository finding:** Current description omits the source's repeatability sentence. Direct PDF review confirms that sentence itself is malformed, so the exact repeated-choice constraint needs errata/adjudication rather than silent repair.
- **Provenance observation:** current `Galaxy of Intrigue p.23` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `progression`, `resource_usage`, `once_per_encounter`, `repeatable`, `source_conflict`
- **Automation observation for later phase:** Current metadata records the choice but does not visibly grant the extra use, validate the once/encounter target, or implement repeat selections.

#### Resolute Stance

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Canonical quick summary:** Fighting Defensively grants +2 morale Will, or +5 if you make no attacks before your next turn.
- When fighting defensively, gain +2 morale Will Defense.
- If you make no attacks until your next turn, gain +5 morale Will Defense until the start of that turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.23` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `fight_defensively`, `will_defense`, `morale_bonus`
- **Automation observation for later phase:** Current branches are substantially faithful.

#### Sadistic Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Coup de grace a helpless creature to move every opponent in line of sight -1 CT for the encounter.
- After delivering a coup de grace to a helpless creature, all opponents within line of sight move -1 step on the condition track until encounter end.
- **Repository finding:** Description is faithful; automation is not.
- **Provenance observation:** current `Galaxy of Intrigue p.24` -> canonical `Galaxy of Intrigue p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `coup_de_grace`, `condition_track`, `line_of_sight`, `area_debuff`
- **Automation observation for later phase:** Current runtime is wrong: it applies the CT step to the target rather than all opponents in line of sight.

#### Silver Tongue

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Persuasion.
- **Canonical quick summary:** Intimidate or Change Attitude as a standard action.
- Intimidate a creature or Change Attitude as a standard action instead of the normal full-round action.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.24` -> canonical `Galaxy of Intrigue p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `persuasion`, `intimidate`, `change_attitude`, `action_economy`
- **Automation observation for later phase:** Current action-speed rule is substantially faithful.

#### Skill Challenge: Catastrophic Avoidance

- **Publication category:** `SKILL_CHALLENGE_FEAT`
- **Canonical prerequisites:** Only available in campaigns using the Skill Challenge rules.
- **Canonical quick summary:** Once per skill challenge, raise catastrophic-failure threshold to 15+ and make catastrophe count as only one failure.
- Once per skill challenge with catastrophic failure, catastrophic failure occurs only when you fail a check by 15 or more.
- A catastrophic failure accrues one failure instead of two.
- **Repository finding:** Current description only says catastrophes happen less often and are milder, which is insufficiently precise for player rules text.
- **Provenance observation:** current `Galaxy of Intrigue p.25` -> canonical `Galaxy of Intrigue p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `skill_challenge`, `catastrophic_failure`, `failure_threshold`, `failure_count`
- **Automation observation for later phase:** Current manual metadata is too vague; it must preserve both the 15+ threshold and one-failure consequence.

#### Skill Challenge: Last Resort

- **Publication category:** `SKILL_CHALLENGE_FEAT`
- **Canonical prerequisites:** Only available in campaigns using the Skill Challenge rules.
- **Canonical quick summary:** Once per skill challenge, a third failure that would end the challenge can be rerolled by the failing character, keeping the better result.
- Once per skill challenge, when you or an ally accrues a third failure that would normally end the challenge, that character rerolls the attempt and keeps the better result.
- **Repository finding:** Current description says reroll a third failed skill check, which does not fully preserve the actual trigger and affected character.
- **Provenance observation:** current `Galaxy of Intrigue p.25` -> canonical `Galaxy of Intrigue p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `skill_challenge`, `reroll`, `third_failure`, `ally`, `once_per_challenge`
- **Automation observation for later phase:** Current manual representation lacks the precise third-failure/end-the-challenge trigger.

#### Skill Challenge: Recovery

- **Publication category:** `SKILL_CHALLENGE_FEAT`
- **Canonical prerequisites:** Only available in campaigns using the Skill Challenge rules.
- **Canonical quick summary:** Once per skill challenge, give the challenge the Recovery effect.
- Once per skill challenge, treat the challenge as having the Recovery effect even if it normally does not.
- **Repository finding:** Description is a faithful concise summary; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.26` -> canonical `Galaxy of Intrigue p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `skill_challenge`, `recovery`, `once_per_challenge`
- **Automation observation for later phase:** Manual Skill Challenge ownership is appropriate.

#### Stand Tall

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per encounter when damaged, nearby visible allies may react with one attack against your attacker.
- Once per encounter when you take damage, every ally within 6 squares and line of sight may, as a reaction, make one attack against the creature that damaged you.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.26` -> canonical `Galaxy of Intrigue p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `ally`, `reaction`, `attack`, `damage_trigger`, `line_of_sight`, `once_per_encounter`
- **Automation observation for later phase:** Current manual/context representation substantially preserves the source.

#### Wookiee Grip

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13.
- **Canonical quick summary:** Use a proficient two-handed weapon in one hand at a -2 attack penalty.
- When proficient with a weapon that normally requires two hands, wield it in one hand.
- Take -2 on attack rolls with the weapon while using it one-handed this way.
- **Repository finding:** Description is faithful and correctly has only Strength 13 as prerequisite; page metadata is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.27` -> canonical `Galaxy of Intrigue p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `weapon_handling`, `two_handed_weapon`, `one_handed`, `attack_penalty`, `strength`
- **Automation observation for later phase:** Current mechanics grant one-handed handling but omit the -2 attack penalty; taxonomy must not infer a Wookiee species restriction from the name.

---

## Book 11 - Scum and Villainy

Full feat publications: **27**; new canonical identities: **27**; reprints: **0**.

- Scum and Villainy publishes exactly 27 canonical feat identities, all general feats.
- Twenty-six of the 27 Scum identities exist somewhere in the repo. The missing identity is the Scum and Villainy version of Staggering Attack.
- Scum Staggering Attack (canonical ID c9c4130a55761330) and Galaxy at War Staggering Attack (repo/canonical ID 192923f60db38831) are distinct same-name feat identities and must never be merged.
- Burst of Speed, Desperate Gambit, and Slippery Maneuver are Scum feats currently attributed to other books.
- Only Cornered and Deadly Sniper currently have exact Scum source/page provenance.
- Knife Trick's printed prerequisite is exactly Lightning Draw plus trained Stealth. Quick Draw is inherited through Lightning Draw and belongs in the prerequisite dependency graph rather than being redundantly inserted into Knife Trick's printed prerequisite field.
- Under the recorded prerequisite-tier model: Quick Draw is Tier 1, Lightning Draw is Tier 2, and Knife Trick is Tier 3.
- Deadly Sniper and Resurgence contain table-vs-detailed-text discrepancies; current repo behavior follows the detailed Benefit and the conflict remains explicit.
- Four official errata corrections are part of canonical content for this book: Collateral Damage, Knife Trick, Superior Tech, and Wicked Strike.
- Metamorph's current runtime substitutes a grapple-size modifier for a printed Damage Threshold effect and is therefore mechanically wrong in that branch.
- Most other feat descriptions are source-faithful; common remaining issues are wrong page metadata, missing structured prerequisites, incomplete action limits, and incomplete customization/runtime procedures.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Burst of Speed | 21 | `GENERAL` | Trained in Endurance. | - | `CANONICAL_TEXT_MATCHES_RULE` | Move up to twice your speed as a move action, then take -1 CT. |
| Close Combat Escape | 21 | `GENERAL` | Trained in Acrobatics. | - | `CANONICAL_TEXT_MATCHES_RULE` | Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed. |
| Collateral Damage | 21 | `GENERAL` | Rapid Shot, base attack bonus +6. | - | `CANONICAL_ERRATA_APPLIED` | Once per turn on your turn, a damaging non-area Rapid Shot can make a -2 follow-up against a nearby second target for half the original damage. |
| Cornered | 21 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | While threatened and unable to Withdraw, gain +2 attacks against the opponents threatening you. |
| Deadly Sniper | 21 | `GENERAL` | Sniper, trained in Stealth, base attack bonus +9. | - | `SOURCE_INTERNAL_CONFLICT_DETAILED_RULE_PREFERRED` | Against an unaware target, your first ranged attack each turn gains +2 attack and +1 damage die. |
| Deceptive Drop | 21 | `GENERAL` | Trained in Initiative. | - | `CANONICAL_TEXT_MATCHES_RULE` | During the surprise round, damaging a flat-footed target can knock it prone if the attack also beats size-adjusted Fortitude. |
| Desperate Gambit | 21 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per turn, reroll a missed attack but accept the second roll and take -2 Reflex (-5 after a natural 1) through your next turn. |
| Duck and Cover | 21 | `GENERAL` | Trained in Stealth. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per turn when an area attack misses you, react by moving 2 squares without provoking. |
| Fleet-Footed | 21 | `GENERAL` | Running Attack. | - | `CANONICAL_TEXT_MATCHES_RULE` | When Running Attack includes movement both before and after the attack, gain +2 Speed for the turn. |
| Friends in Low Places | 21 | `GENERAL` | Trained in Gather Information. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Gather Information for Restricted/Military licensing and reduce those items' Black Market multiplier by 1. |
| Hasty Modification | 22 | `GENERAL` | Tech Specialist. | - | `CANONICAL_TEXT_MATCHES_RULE` | Spend 1 minute and DC 20 Mechanics to temporarily swap a Tech Specialist trait; when the encounter ends, all Tech Specialist traits on that device are lost. |
| Hideous Visage | 22 | `GENERAL` | Shapeshift species trait. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, frighten a visible opponent with Deception vs Will, pushing it 1 square and giving -1 attacks through your next turn. |
| Impersonate | 23 | `GENERAL` | Shapeshift species trait, Skill Focus (Deception). | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Shapeshift and Deception to impersonate a specific person's appearance and voice as a Moderate Deception. |
| Impetuous Move | 23 | `GENERAL` | Constitution 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Trade half your second-wind healing for immediate half-speed movement without provoking. |
| Impulsive Flight | 23 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Withdraw one extra square. |
| Knife Trick | 23 | `GENERAL` | Lightning Draw, trained in Stealth. | - | `CANONICAL_ERRATA_APPLIED` | A successfully concealed weapon lets you threaten and draw it for an attack of opportunity. |
| Lightning Draw | 23 | `GENERAL` | Quick Draw. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, draw a holstered weapon and attack as one standard action. |
| Metamorph | 23 | `GENERAL` | Constitution 13, Shapeshift species trait, trained in Deception. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Shapeshift as a full-round action to become one size smaller or larger, gaining the corresponding Reflex/Stealth/carrying/DT/reach changes. |
| Opportunistic Retreat | 23 | `GENERAL` | Combat Reflexes. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per turn, trade a provoked AoO for half-speed movement without provoking. |
| Resurgence | 24 | `GENERAL` | Trained in Endurance. | - | `SOURCE_INTERNAL_CONFLICT_DETAILED_RULE_PREFERRED` | Detailed rule grants an immediate move action when you catch a second wind; the table incorrectly says swift action. |
| Signature Device | 24 | `GENERAL` | Tech Specialist. | - | `CANONICAL_TEXT_MATCHES_RULE` | Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action. |
| Slippery Maneuver | 24 | `GENERAL` | Dodge. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Dodge against two opponents and Withdraw at full speed from a Dodge target, with normal multi-square AoO exposure. |
| Staggering Attack | 24 | `GENERAL` | Sneak Attack talent, Rapid Shot, or Rapid Strike. | - | `MISSING_CANONICAL_REPO_RECORD_SOURCE_WORDING_TENSION` | Trade qualifying extra damage dice for 2 squares of forced movement per die, without provoking. |
| Stay Up | 24 | `GENERAL` | Trained in Endurance. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, halve incoming attack damage by moving -1 CT. |
| Superior Tech | 24 | `GENERAL` | Intelligence 17, Tech Specialist, 9th level. | - | `CANONICAL_ERRATA_APPLIED` | Install superior Tech Specialist upgrades in a chosen equipment category using the published cost/time/DC procedure; repeat for other categories. |
| Tactical Advantage | 25 | `GENERAL` | Combat Reflexes. | - | `CANONICAL_TEXT_MATCHES_RULE` | Damage with an AoO to immediately move 1 square in any direction without provoking. |
| Wicked Strike | 25 | `GENERAL` | Rapid Strike. | - | `CANONICAL_ERRATA_APPLIED` | Once per turn on your turn, a damaging non-area Rapid Strike can make a -2 follow-up against a second target in reach for half damage. |

### Detailed rules and repository findings

#### Burst of Speed

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Endurance.
- **Canonical quick summary:** Move up to twice your speed as a move action, then take -1 CT.
- As a move action, move up to twice your speed.
- At the end of this movement, move -1 step on the condition track.
- **Repository finding:** Description is faithful; source/page provenance is wrong.
- **Provenance observation:** current `Galaxy at War p.24` -> canonical `Scum and Villainy p.21` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `movement`, `move_action`, `speed`, `condition_track`
- **Automation observation for later phase:** Current movement/CT metadata is substantially faithful.

#### Close Combat Escape

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Acrobatics.
- **Canonical quick summary:** Escape a grapple with Acrobatics, then spend a swift action for a melee/unarmed counterattack that can leave the former grappler flat-footed.
- After successfully using Acrobatics to escape a grapple, spend a swift action to make one melee or unarmed attack against the former grappler.
- On a hit, deal normal damage and the opponent is flat-footed until the start of its next turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.20` -> canonical `Scum and Villainy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `grapple`, `acrobatics`, `escape`, `swift_action`, `counterattack`, `flat_footed`
- **Automation observation for later phase:** Existing shorthand omits the successful-escape trigger, swift cost, former-grappler target, weapon restriction, and exact flat-footed duration.

#### Collateral Damage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rapid Shot, base attack bonus +6.
- **Canonical quick summary:** Once per turn on your turn, a damaging non-area Rapid Shot can make a -2 follow-up against a nearby second target for half the original damage.
- Official errata: when you deal damage with a single non-area attack using Rapid Shot, once per turn on your turn immediately make a second attack at -2 against a second target within 2 squares of the first.
- On a hit, the second target takes half the original attack's damage.
- **Repository finding:** Current description includes the errata-correct use limit; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.20` -> canonical `Scum and Villainy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `rapid_shot`, `follow_up_attack`, `once_per_turn`, `errata`
- **Automation observation for later phase:** Current rider needs exact own-turn, 2-square separation, and non-area restrictions certified.

#### Cornered

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** While threatened and unable to Withdraw, gain +2 attacks against the opponents threatening you.
- When threatened by an opponent and unable to Withdraw, gain +2 on attack rolls against opponents threatening you.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Scum and Villainy p.21` -> canonical `Scum and Villainy p.21` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `threatened`, `withdraw`, `attack_bonus`
- **Automation observation for later phase:** Current runtime keys on inability to Withdraw but must also enforce threatened state and target only threatening opponents.

#### Deadly Sniper

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Sniper, trained in Stealth, base attack bonus +9.
- **Canonical quick summary:** Against an unaware target, your first ranged attack each turn gains +2 attack and +1 damage die.
- Detailed Benefit: when making a ranged attack against a target unaware of you, gain +2 attack and +1 die damage on the first attack each turn.
- The printed summary table differs in wording and does not cleanly preserve the detailed prerequisite/effect.
- **Repository finding:** Repo follows the detailed rule. Keep the table/detail discrepancy visible rather than replacing the detailed text.
- **Provenance observation:** current `Scum and Villainy p.21` -> canonical `Scum and Villainy p.21` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `ranged`, `sniper`, `stealth`, `unaware_target`, `damage`
- **Automation observation for later phase:** Runtime should follow the detailed Benefit and enforce the Sniper prerequisite.

#### Deceptive Drop

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Initiative.
- **Canonical quick summary:** During the surprise round, damaging a flat-footed target can knock it prone if the attack also beats size-adjusted Fortitude.
- During the surprise round, when you damage a flat-footed target, knock it prone if the same attack roll also exceeds its Fortitude Defense.
- Apply size modifiers to Fortitude: Medium or smaller +0, Large +5, Huge +10, Gargantuan +20, Colossal +50.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.22` -> canonical `Scum and Villainy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `surprise_round`, `flat_footed`, `prone`, `fortitude`, `size`
- **Automation observation for later phase:** UI-assisted adjudication is appropriate; preserve the explicit size adjustments.

#### Desperate Gambit

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Once per turn, reroll a missed attack but accept the second roll and take -2 Reflex (-5 after a natural 1) through your next turn.
- Once per turn when you miss an attack, reroll it and keep the second result.
- Take -2 Reflex Defense until end of your next turn; if the first miss was a natural 1, take -5 instead.
- **Repository finding:** Description is faithful; source/page provenance is wrong.
- **Provenance observation:** current `Galaxy of Intrigue p.24` -> canonical `Scum and Villainy p.21` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack_reroll`, `reflex_penalty`, `once_per_turn`
- **Automation observation for later phase:** Current reroll handling omits exact once-per-turn and expiration details in structured runtime.

#### Duck and Cover

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Stealth.
- **Canonical quick summary:** Once per turn when an area attack misses you, react by moving 2 squares without provoking.
- When an area attack targeting you misses, once per turn move 2 squares as a reaction.
- This movement does not provoke attacks of opportunity.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.22` -> canonical `Scum and Villainy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `area_attack`, `reaction`, `movement`, `once_per_turn`
- **Automation observation for later phase:** Do not conflate this with Dive for Cover; no actual cover destination is required.

#### Fleet-Footed

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Running Attack.
- **Canonical quick summary:** When Running Attack includes movement both before and after the attack, gain +2 Speed for the turn.
- If you move both before and after an attack using Running Attack, your speed increases by 2 squares until the end of your turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.23` -> canonical `Scum and Villainy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `movement`, `running_attack`, `speed`
- **Automation observation for later phase:** Effect is represented; later progression must enforce the Running Attack prerequisite.

#### Friends in Low Places

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Gather Information.
- **Canonical quick summary:** Use Gather Information for Restricted/Military licensing and reduce those items' Black Market multiplier by 1.
- When acquiring a license for a Restricted or Military object, substitute Gather Information for Knowledge (Bureaucracy).
- Reduce the Black Market cost multiplier of such items by 1.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.23` -> canonical `Scum and Villainy p.21` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `commerce`, `license`, `black_market`, `gather_information`, `skill_substitution`
- **Automation observation for later phase:** Any hard minimum multiplier floor belongs to general commerce authority, not this feat text.

#### Hasty Modification

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Tech Specialist.
- **Canonical quick summary:** Spend 1 minute and DC 20 Mechanics to temporarily swap a Tech Specialist trait; when the encounter ends, all Tech Specialist traits on that device are lost.
- Spend 1 minute and make DC 20 Mechanics to exchange one Tech Specialist trait on equipment or a droid for another.
- On success the new trait lasts until encounter end, then the device loses all traits previously acquired through Tech Specialist.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.24` -> canonical `Scum and Villainy p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `tech_specialist`, `mechanics`, `equipment`, `temporary_modification`
- **Automation observation for later phase:** Should route through existing customization authority; current automation remains partial.

#### Hideous Visage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Shapeshift species trait.
- **Canonical quick summary:** Once per encounter, frighten a visible opponent with Deception vs Will, pushing it 1 square and giving -1 attacks through your next turn.
- Once per encounter as a swift action, make Deception vs one opponent's Will Defense; the target must be able to see you.
- On success, move it 1 square away and impose -1 attacks until start of your next turn.
- Mind-affecting fear effect.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.24` -> canonical `Scum and Villainy p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `shapeshift`, `fear`, `deception`, `will_defense`, `forced_movement`, `once_per_encounter`
- **Automation observation for later phase:** Current payload omits the explicit 'target can see you' condition.

#### Impersonate

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Shapeshift species trait, Skill Focus (Deception).
- **Canonical quick summary:** Use Shapeshift and Deception to impersonate a specific person's appearance and voice as a Moderate Deception.
- Use Deception to alter your features to a specific person and change your voice to match.
- Always treat impersonating a specific person as a Moderate Deception.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.24` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `shapeshift`, `deception`, `impersonation`, `social`
- **Automation observation for later phase:** Manual/social adjudication is appropriate; later progression must enforce both prerequisites.

#### Impetuous Move

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Constitution 13.
- **Canonical quick summary:** Trade half your second-wind healing for immediate half-speed movement without provoking.
- When catching a second wind, choose to regain only half the normal HP and immediately move up to half speed.
- This movement does not provoke attacks of opportunity.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.25` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `healing`, `movement`, `attack_of_opportunity`
- **Automation observation for later phase:** Current description and payload are substantially faithful.

#### Impulsive Flight

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Withdraw one extra square.
- Withdraw one extra square when using the Withdraw action.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.25` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `withdraw`, `movement`, `action_economy`
- **Automation observation for later phase:** Current generic Withdraw metadata should preserve the exact +1-square allowance.

#### Knife Trick

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Lightning Draw, trained in Stealth.
- **Canonical quick summary:** A successfully concealed weapon lets you threaten and draw it for an attack of opportunity.
- Official errata: if you have a successfully concealed weapon, you threaten squares as though armed with a melee weapon.
- When an attack of opportunity is available, you may draw a successfully concealed weapon and make the attack.
- The weapon qualification is based on successful concealment, not on weapon-name keywords.
- **Repository finding:** Printed prerequisite is exactly Lightning Draw + trained Stealth. Quick Draw is inherited through Lightning Draw and belongs in the dependency graph, making this structurally Tier 3 under the recorded tier model.
- **Provenance observation:** current `Scum and Villainy p.25` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `attack_of_opportunity`, `concealed_weapon`, `weapon_draw`, `stealth`, `errata`
- **Automation observation for later phase:** Current name-based weapon filter is unsupported; action/runtime should check successful concealment state.

#### Lightning Draw

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Quick Draw.
- **Canonical quick summary:** Once per encounter, draw a holstered weapon and attack as one standard action.
- Once per encounter, draw a holstered weapon and attack with it as a single standard action.
- **Repository finding:** Description is faithful; page metadata is wrong. Structurally Tier 2 because it requires Quick Draw.
- **Provenance observation:** current `Scum and Villainy p.26` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `weapon_draw`, `attack`, `standard_action`, `once_per_encounter`
- **Automation observation for later phase:** Current action rule must preserve once/encounter and holstered-weapon scope; the attack is not limited to ranged weapons.

#### Metamorph

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Constitution 13, Shapeshift species trait, trained in Deception.
- **Canonical quick summary:** Use Shapeshift as a full-round action to become one size smaller or larger, gaining the corresponding Reflex/Stealth/carrying/DT/reach changes.
- Full-round action while using Shapeshift to increase or decrease size by one step; maintain for rounds/day equal Constitution score.
- Small: +1 Reflex, +5 Stealth, carrying capacity x0.75.
- Large: -1 Reflex, -5 Stealth, carrying capacity x2, +5 Damage Threshold, reach +1.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.26` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `shapeshift`, `size`, `reflex_defense`, `stealth`, `carrying_capacity`, `damage_threshold`, `reach`
- **Automation observation for later phase:** Current metadata misses several size-state effects and wrongly substitutes a grapple-size modifier where the feat explicitly grants Damage Threshold.

#### Opportunistic Retreat

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Combat Reflexes.
- **Canonical quick summary:** Once per turn, trade a provoked AoO for half-speed movement without provoking.
- Once per turn when an opponent provokes an attack of opportunity from you, sacrifice that attack to move up to half your speed.
- This movement does not provoke attacks of opportunity.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.27` -> canonical `Scum and Villainy p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `attack_of_opportunity`, `reaction`, `movement`, `once_per_turn`
- **Automation observation for later phase:** Current payload lacks the once-per-turn limit.

#### Resurgence

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Endurance.
- **Canonical quick summary:** Detailed rule grants an immediate move action when you catch a second wind; the table incorrectly says swift action.
- Detailed Benefit: when you catch your second wind, immediately gain a move action that must be used immediately.
- The printed table summarizes this as a bonus swift action, creating an internal source conflict.
- **Repository finding:** Preserve the table/detail conflict; detailed Benefit is the operative text unless errata says otherwise.
- **Provenance observation:** current `Scum and Villainy p.27` -> canonical `Scum and Villainy p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `move_action`, `action_economy`, `source_conflict`
- **Automation observation for later phase:** Current repo follows the detailed move-action rule.

#### Signature Device

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Tech Specialist.
- **Canonical quick summary:** Designate one signature item, Take 10 on its Tech Specialist modifications, install two traits, and switch the active trait as a swift action.
- Designate one weapon, armor, vehicle, or other item as your signature item.
- You may Take 10 on Mechanics checks to modify it.
- It may have two Tech Specialist traits; installing the second requires DC 30 Mechanics.
- Only one trait can be active at a time; switch active trait as a swift action.
- Only one signature device at a time; designating another removes all Tech Specialist traits from the former signature item.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.28` -> canonical `Scum and Villainy p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `tech_specialist`, `equipment`, `signature_item`, `mechanics`, `swift_action`
- **Automation observation for later phase:** Existing customization service covers much of the data model, but action-cost and complete procedure certification remain partial.

#### Slippery Maneuver

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dodge.
- **Canonical quick summary:** Use Dodge against two opponents and Withdraw at full speed from a Dodge target, with normal multi-square AoO exposure.
- Apply Dodge against attacks from two opponents.
- When Withdrawing from a target against whom you use Dodge, move at full speed.
- You still provoke an AoO if more than 1 square is needed to escape a threatened area.
- **Repository finding:** Description is faithful; source/page provenance is wrong.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Scum and Villainy p.24` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `dodge`, `withdraw`, `movement`, `defense`
- **Automation observation for later phase:** Effect is represented; later progression must enforce Dodge.

#### Staggering Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Sneak Attack talent, Rapid Shot, or Rapid Strike.
- **Canonical quick summary:** Trade qualifying extra damage dice for 2 squares of forced movement per die, without provoking.
- Any time you would deal additional damage from a feat that grants one or more extra dice of damage, you may forgo the extra damage.
- For each extra die sacrificed, move the target 2 squares.
- This forced movement does not provoke attacks of opportunity.
- The printed prerequisite includes Sneak Attack (a talent) even though the Benefit is worded around extra dice granted by a feat; preserve this source tension rather than silently broadening the rule.
- **Repository finding:** Canonical ID c9c4130a55761330 is missing. The existing repo Staggering Attack ID 192923f60db38831 is the distinct Galaxy at War feat.
- **Provenance observation:** no live feat record -> canonical `Scum and Villainy p.24` (`MISSING_DISTINCT_IDENTITY`).
- **Tag candidates for later phase:** `combat`, `extra_damage`, `forced_movement`, `rapid_shot`, `rapid_strike`, `sneak_attack`, `same_name_collision`
- **Automation observation for later phase:** Requires a distinct source-safe identity. Do not reuse the Galaxy at War Staggering Attack runtime, which is a different mechanic.

#### Stay Up

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Endurance.
- **Canonical quick summary:** Once per encounter, halve incoming attack damage by moving -1 CT.
- Once per encounter when you would take damage from an attack, instead take half damage and move -1 step on the condition track.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.28` -> canonical `Scum and Villainy p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `damage_reduction`, `condition_track`, `once_per_encounter`, `endurance`
- **Automation observation for later phase:** Current description/payload are substantially faithful.

#### Superior Tech

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Intelligence 17, Tech Specialist, 9th level.
- **Canonical quick summary:** Install superior Tech Specialist upgrades in a chosen equipment category using the published cost/time/DC procedure; repeat for other categories.
- Choose one category: armor, weapons, droids, vehicles, or devices; install advanced traits for that category in place of normal Tech Specialist traits.
- Pay one-fifth item cost or 2,000 credits, whichever is greater; work 1 day per 1,000 credits of modification cost; DC 30 Mechanics, no Take 10/20; failure loses spent credits.
- Tech Specialist assistants may reduce time and Aid Another on the final check; modified market value increases by base price plus double modification cost.
- Repeatable, choosing a different category each time.
- Official errata: Superior Protective Armor increases the armor's armor bonus to Reflex Defense by +2.
- **Repository finding:** Current description is substantially faithful and should retain the errata-correct +2 Superior Protective Armor value.
- **Provenance observation:** current `Scum and Villainy p.29` -> canonical `Scum and Villainy p.24` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `tech_specialist`, `equipment`, `mechanics`, `crafting`, `repeatable`, `errata`
- **Automation observation for later phase:** Existing customization authority handles category/DC/pricing portions, but work-time, assistance, one-job-at-a-time, resale, and prerequisite certification remain incomplete.

#### Tactical Advantage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Combat Reflexes.
- **Canonical quick summary:** Damage with an AoO to immediately move 1 square in any direction without provoking.
- When you successfully damage an opponent with an attack of opportunity, immediately move 1 square in any direction without provoking.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.29` -> canonical `Scum and Villainy p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `attack_of_opportunity`, `movement`, `reaction`, `combat_reflexes`
- **Automation observation for later phase:** Effect metadata is substantially faithful; later progression must enforce Combat Reflexes.

#### Wicked Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rapid Strike.
- **Canonical quick summary:** Once per turn on your turn, a damaging non-area Rapid Strike can make a -2 follow-up against a second target in reach for half damage.
- Official errata: when you damage a target with a single non-area Rapid Strike attack, once per turn on your turn make a second attack at -2 against another target within reach.
- On a hit, deal half the original attack's damage to the second target.
- **Repository finding:** Current description includes errata-correct behavior; page metadata is wrong.
- **Provenance observation:** current `Scum and Villainy p.30` -> canonical `Scum and Villainy p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `rapid_strike`, `follow_up_attack`, `once_per_turn`, `errata`
- **Automation observation for later phase:** Current payload must explicitly preserve own-turn, once-per-turn, and non-area limits.

---

## Book 12 - Galaxy at War

Full feat publications: **42**; new canonical identities: **41**; reprints: **1**.

- Galaxy at War contains 42 full feat publications: 21 general feats, 8 Martial Arts Feats, and 13 Team Feats.
- It contributes 41 new canonical identities because Echani Training is a full reprint of the KOTOR p.33 identity with an added Galaxy at War p.26 Special clause tied to Echani Expertise.
- All 42 publication appearances are represented by current repo feat records, but provenance is heavily drifted.
- Only six current Galaxy at War publication records have exact source/page provenance: Force of Personality, Fortifying Recovery, Mission Specialist, Never Surrender, Officer Candidacy Training, and Opportunistic Shooter.
- Forceful Blast is canonically Galaxy at War p.23, not The Force Unleashed Campaign Guide; it is not a Force feat merely because of its name.
- The seven new Martial Arts feat records and all 13 Team Feats are currently flattened to generic Star Wars Saga Edition p.0 and remain summary-level rather than full canonical rules records.
- Echani Training must remain one canonical identity with layered KOTOR primary provenance and Galaxy at War reprint/extension provenance.
- The book explicitly defines Martial Arts Feats and Team Feats as publication families; those source-defined families should survive the later taxonomy phase.
- Bantha Herder, Disabler, Forceful Blast, Pistoleer, Riflemaster, and Sport Hunter all require exact proficiency-with-weapon-used handling; several current prerequisite fields narrow or omit that printed language.
- Galaxy at War Staggering Attack (ID 192923f60db38831) is distinct from the missing Scum and Villainy Staggering Attack (ID c9c4130a55761330). The current GAW detailed mechanic is correct in shape, but its summary/prerequisite fields remain contaminated.
- Under the recorded prerequisite-tier model, Team Feats are structurally Tier 1 because they have only trained-skill gates; the Martial Arts Training feats are generally at least Tier 2 because they require Martial Arts I. These are guiding observations pending the dedicated prerequisite phase.

### Repo records wrongly attributed to this book

| Record | Ruling | Canonical identity |
|---|---|---|
| Slippery Maneuver | `CANONICAL_FEAT_WRONG_SOURCE` | Scum and Villainy p.24 |
| Low Profile | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | Saga conversion: N/A |
| Reactive Awareness | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |
| Triple Crit Specialist | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |
| Reactive Stealth | `WRONG_DOMAIN_TALENT` | Galaxy of Intrigue talent |
| Triple Crit | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.89 |
| Acrobatic Strike | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.82 |
| Headstrong | `LEGACY_D20_FEAT_NO_SAGA_EQUIVALENT` | Saga conversion: N/A |
| Sniper | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.88 |
| Scavenger | `CANONICAL_FEAT_WRONG_SOURCE` | The Force Unleashed Campaign Guide p.35 |
| Deadeye | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.84 |
| Charging Fire | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.82 |
| Savage Attack | `CANONICAL_FEAT_WRONG_SOURCE` | The Force Unleashed Campaign Guide p.35 |
| Assured Attack | `CANONICAL_FEAT_WRONG_SOURCE` | Rebellion Era Campaign Guide p.28 |
| Autofire Assault | `CANONICAL_FEAT_WRONG_SOURCE_AND_NAME_COLLISION` | Legacy p.34 feat; Galaxy at War p.22 is a talent |
| Burst of Speed | `CANONICAL_FEAT_WRONG_SOURCE` | Scum and Villainy p.21 |
| Mighty Swing | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.86 |
| Resilient Reflexes | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |
| Conditioned | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |
| Surgical Precision | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |
| Resilient Will | `NO_CANONICAL_SWSE_FEAT_DEFINITION_FOUND` | None found |
| Bantha Rush | `CANONICAL_FEAT_WRONG_SOURCE` | Core p.82 |

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Bantha Herder | 22 | `GENERAL` | Proficient with weapon used, base attack bonus +1. | - | `PREREQUISITE_ERROR` | A damaging proficient ranged attack can move a Large-or-smaller target 1 square if the attack roll also beats Will. |
| Battering Attack | 22 | `GENERAL` | Bantha Rush, Trip. | - | `CANONICAL_TEXT_MATCHES_RULE` | A successful Bantha Rush also knocks the moved target prone. |
| Destructive Force | 22 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Destroying an object/vehicle with threshold-beating damage also deals 1 die of the same damage type to everything adjacent. |
| Disabler | 23 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | Gain weapon-specific benefits when attacking with a proficient ion grenade, ion pistol, or ion rifle. |
| Dive for Cover | 23 | `GENERAL` | Trained in Jump. | - | `CANONICAL_TEXT_MATCHES_RULE` | Once per turn, react to a ranged attack by jumping into cover; if you reach cover it protects against that attack, and you land prone. |
| Fight Through Pain | 23 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Will Defense instead of Fortitude Defense to determine Damage Threshold. |
| Forceful Blast | 23 | `GENERAL` | Proficient with weapon used, base attack bonus +1. | - | `PREREQUISITE_ERROR` | A damaging proficient grenade/thermal-detonator attack can move eligible targets 1 square if the attack roll also beats Fortitude. |
| Force of Personality | 23 | `GENERAL` | Charisma 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use the better applicable Wisdom or Charisma modifier for Will Defense. |
| Fortifying Recovery | 23 | `GENERAL` | Constitution 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Recover also grants temporary bonus HP equal to twice Constitution bonus (minimum 2), consumed first and lost at encounter end. |
| Mission Specialist | 24 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Choose a trained skill; nearby allies untrained in it gain +2 competence, with a Force Sensitivity gate for Use the Force. |
| Never Surrender | 24 | `GENERAL` | Trained in Endurance. | - | `CANONICAL_TEXT_MATCHES_RULE` | The first time each encounter damage would drop you to 0 HP, react with Endurance vs damage to remain at 1 HP. |
| Officer Candidacy Training | 25 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +2 Rank and Privilege organization score. |
| Opportunistic Shooter | 25 | `GENERAL` | None. | - | `CANONICAL_TEXT_MATCHES_RULE` | Gain +2 on ranged attacks of opportunity. |
| Pistoleer | 25 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | Gain a different specialization benefit with a proficient blaster pistol, heavy blaster pistol, or hold-out blaster pistol. |
| Predictive Defense | 25 | `GENERAL` | Intelligence 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Dexterity or Intelligence to determine Reflex Defense. |
| Resilient Strength | 25 | `GENERAL` | Strength 13. | - | `CANONICAL_TEXT_MATCHES_RULE` | Use Strength or Constitution to determine Fortitude Defense. |
| Riflemaster | 25 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | Gain weapon-specific specialization benefits with proficient rifles/carbines. |
| Risk Taker | 25 | `GENERAL` | Trained in Climb or Jump. | - | `CANONICAL_TEXT_MATCHES_RULE` | Fail Climb more safely, and spend a Force Point after a failed Jump to extend distance to the first safe square. |
| Sport Hunter | 25 | `GENERAL` | Proficient with weapon used. | - | `PREREQUISITE_ERROR` | Gain weapon-specific benefits with proficient slugthrowers and sporting weapons. |
| Staggering Attack | 26 | `GENERAL` | Proficient with weapon used, base attack bonus +1. | - | `PREREQUISITE_AND_SUMMARY_ERROR` | Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn. |
| Steadying Position | 26 | `GENERAL` | Careful Shot. | - | `CANONICAL_TEXT_MATCHES_RULE` | While prone and aiming, deny the target's Dexterity bonus to Reflex Defense for the ranged attack. |
| Echani Training | 26 | `MARTIAL_ARTS_FEAT` | Dexterity 13, Martial Arts I. | - | `CANONICAL_BASE_TEXT_PRESENT_REPRINT_EXTENSION_REVIEW` | KOTOR's Echani Training is fully reprinted here and gains an Echani Expertise special interaction. |
| Hijkata Training | 26 | `MARTIAL_ARTS_FEAT` | Combat Reflexes, Martial Arts I. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Counter adjacent melee attackers with unarmed AoOs and impose an attack penalty; Hijkata Expertise adds ally-guarding behavior. |
| K'tara Training | 27 | `MARTIAL_ARTS_FEAT` | Martial Arts I, trained in Stealth. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Deal extra unarmed damage to flat-footed enemies and once per encounter potentially render one unable to speak. |
| K'thri Training | 27 | `MARTIAL_ARTS_FEAT` | Dual Weapon Mastery I, Martial Arts I. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | In light/no armor, make swift-action unarmed attacks and once per encounter deal half damage on an unarmed miss. |
| Stava Training | 27 | `MARTIAL_ARTS_FEAT` | Martial Arts I, Running Attack. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | In light/no armor, count larger for grabs/grapples and make a free Grab after a successful unarmed charge attack. |
| Tae-Jitsu Training | 28 | `MARTIAL_ARTS_FEAT` | Dodge, Martial Arts I, trained in Initiative. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Improve unarmed critical damage and designate a primary adversary to broaden Dodge coverage. |
| Teräs Käsi Training | 28 | `MARTIAL_ARTS_FEAT` | Strength 13, Martial Arts I. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Once per round, a successful unarmed attack treats the target's Damage Threshold as 5 lower. |
| Wrruushi Training | 28 | `MARTIAL_ARTS_FEAT` | Constitution 13, Martial Arts I, Wookiee. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | In light/no armor, successful unarmed attacks can grant bonus HP and once per encounter strip equipment Fortitude bonuses. |
| Aquatic Specialists | 28 | `TEAM_FEAT` | Trained in Swim. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Swim, scaling by nearby allies with the same feat to +7, plus a Swim-specific teamwork benefit. |
| Ascension Specialists | 28 | `TEAM_FEAT` | Trained in Climb. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Climb, scaling by nearby allies with the same feat to +7, plus a Climb-specific teamwork benefit. |
| Covert Operatives | 28 | `TEAM_FEAT` | Trained in Stealth. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Stealth, scaling by nearby allies with the same feat to +7, plus a Stealth-specific teamwork benefit. |
| Medical Team | 29 | `TEAM_FEAT` | Trained in Treat Injury. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Treat Injury, scaling by nearby allies with the same feat to +7, plus a Treat Injury-specific teamwork benefit. |
| Mounted Regiment | 29 | `TEAM_FEAT` | Trained in Ride. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Ride, scaling by nearby allies with the same feat to +7, plus a Ride-specific teamwork benefit. |
| Nimble Team | 29 | `TEAM_FEAT` | Trained in Acrobatics. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Acrobatics, scaling by nearby allies with the same feat to +7, plus a Acrobatics-specific teamwork benefit. |
| Slicer Team | 29 | `TEAM_FEAT` | Trained in Use Computer. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Use Computer, scaling by nearby allies with the same feat to +7, plus a Use Computer-specific teamwork benefit. |
| Technical Experts | 29 | `TEAM_FEAT` | Trained in Mechanics. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Mechanics, scaling by nearby allies with the same feat to +7, plus a Mechanics-specific teamwork benefit. |
| Tireless Squad | 30 | `TEAM_FEAT` | Trained in Endurance. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Endurance, scaling by nearby allies with the same feat to +7, plus a Endurance-specific teamwork benefit. |
| Unhindered Approach | 30 | `TEAM_FEAT` | Trained in Jump. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Jump, scaling by nearby allies with the same feat to +7, plus a Jump-specific teamwork benefit. |
| Unified Squadron | 30 | `TEAM_FEAT` | Trained in Pilot. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Pilot, scaling by nearby allies with the same feat to +7, plus a Pilot-specific teamwork benefit. |
| Wary Sentries | 30 | `TEAM_FEAT` | Trained in Perception. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Perception, scaling by nearby allies with the same feat to +7, plus a Perception-specific teamwork benefit. |
| Wilderness Specialists | 30 | `TEAM_FEAT` | Trained in Survival. | - | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Team Feat: +3 Survival, scaling by nearby allies with the same feat to +7, plus a Survival-specific teamwork benefit. |

### Detailed rules and repository findings

#### Bantha Herder

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used, base attack bonus +1.
- **Canonical quick summary:** A damaging proficient ranged attack can move a Large-or-smaller target 1 square if the attack roll also beats Will.
- When a ranged attack damages a Large-or-smaller creature, compare the attack roll to the target's Will Defense.
- If the roll equals or exceeds Will Defense, move the target 1 square in any direction as a free action.
- Apply separately to every eligible creature damaged by the attack.
- Cannot move a grabbed/grappled target, into a solid object, or into another creature's fighting space.
- **Repository finding:** Current prerequisite line omits 'Proficient with weapon used.'
- **Provenance observation:** current `Galaxy at War p.20` -> canonical `Galaxy at War p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `forced_movement`, `will_defense`, `weapon_proficiency`
- **Automation observation for later phase:** Core push logic is represented, but the explicit proficiency gate is not carried by the stored prerequisite line.

#### Battering Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Bantha Rush, Trip.
- **Canonical quick summary:** A successful Bantha Rush also knocks the moved target prone.
- Whenever Bantha Rush successfully moves a creature, also knock that creature prone.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.20` -> canonical `Galaxy at War p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `bantha_rush`, `trip`, `prone`, `forced_movement`
- **Automation observation for later phase:** Current mechanical rider is substantially faithful.

#### Destructive Force

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Destroying an object/vehicle with threshold-beating damage also deals 1 die of the same damage type to everything adjacent.
- When damage to an object or vehicle both equals/exceeds its Damage Threshold and reduces it to 0 HP, deal 1 die of the same damage type to all adjacent targets, including allies.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.21` -> canonical `Galaxy at War p.22` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `object`, `vehicle`, `damage_threshold`, `area_damage`
- **Automation observation for later phase:** Current destruction rider is substantially faithful.

#### Disabler

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** Gain weapon-specific benefits when attacking with a proficient ion grenade, ion pistol, or ion rifle.
- Ion grenade: burst radius becomes 3 squares instead of 2.
- Ion pistol: damage dice increase from d6 to d8.
- Ion rifle: treat it as an accurate weapon.
- **Repository finding:** Current prerequisite line says None.
- **Provenance observation:** current `Galaxy at War p.21` -> canonical `Galaxy at War p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ion`, `weapon_specialization`, `grenade`, `pistol`, `rifle`
- **Automation observation for later phase:** Weapon-specific effects are represented, but eligibility must preserve proficiency with the weapon used.

#### Dive for Cover

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Jump.
- **Canonical quick summary:** Once per turn, react to a ranged attack by jumping into cover; if you reach cover it protects against that attack, and you land prone.
- Once per turn, as a reaction to being targeted by a ranged attack, make a horizontal Jump check.
- If you land in a square providing cover from the attacker, gain that cover bonus against the triggering attack even though you lacked it when targeted.
- You always land prone.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.22` -> canonical `Galaxy at War p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `reaction`, `ranged_attack`, `jump`, `cover`, `prone`
- **Automation observation for later phase:** Current metadata is only a generic reaction and does not fully encode the jump, cover qualification, once-per-turn limit, or mandatory prone result.

#### Fight Through Pain

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Use Will Defense instead of Fortitude Defense to determine Damage Threshold.
- You may use Will Defense instead of Fortitude Defense when determining your Damage Threshold.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.22` -> canonical `Galaxy at War p.23` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `damage_threshold`, `will_defense`, `fortitude`
- **Automation observation for later phase:** Current defense substitution is substantially faithful.

#### Forceful Blast

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used, base attack bonus +1.
- **Canonical quick summary:** A damaging proficient grenade/thermal-detonator attack can move eligible targets 1 square if the attack roll also beats Fortitude.
- When a grenade or thermal detonator damages a Large-or-smaller creature, compare the attack roll to Fortitude Defense.
- If the attack equals/exceeds Fortitude, move the target 1 square in any direction as a free action.
- Apply to every eligible creature damaged.
- Cannot move grabbed/grappled targets, into solid objects, or into another creature's fighting space.
- **Repository finding:** Current prerequisite hardcodes Weapon Proficiency (Simple Weapons); source says proficient with the weapon used. Provenance is also wrong.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.34` -> canonical `Galaxy at War p.23` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `grenade`, `thermal_detonator`, `forced_movement`, `fortitude`, `weapon_proficiency`
- **Automation observation for later phase:** Current runtime is materially wrong if it forces movement only away from the blast; RAW allows any direction and includes several movement restrictions.

#### Force of Personality

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Charisma 13.
- **Canonical quick summary:** Use the better applicable Wisdom or Charisma modifier for Will Defense.
- Use either Wisdom modifier or Charisma modifier to determine Will Defense.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Galaxy at War p.23` -> canonical `Galaxy at War p.23` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `defense`, `will_defense`, `charisma`, `wisdom`
- **Automation observation for later phase:** Current defense-choice rule is substantially faithful; despite the name, this is not a Force feat.

#### Fortifying Recovery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Constitution 13.
- **Canonical quick summary:** Recover also grants temporary bonus HP equal to twice Constitution bonus (minimum 2), consumed first and lost at encounter end.
- When taking the Recover action, gain bonus HP equal to 2 x Constitution bonus, minimum 2.
- Damage is removed from these bonus HP first.
- Remaining bonus HP disappear at encounter end.
- Bonus HP do not stack.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Galaxy at War p.23` -> canonical `Galaxy at War p.23` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `recover`, `bonus_hit_points`, `constitution`, `temporary_hp`
- **Automation observation for later phase:** Current metadata captures the amount but must preserve consumption priority, nonstacking, and encounter-end expiration.

#### Mission Specialist

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Choose a trained skill; nearby allies untrained in it gain +2 competence, with a Force Sensitivity gate for Use the Force.
- Choose one skill in which you are trained.
- Untrained allies within 12 squares gain +2 competence on that skill.
- Repeatable; each selection chooses a different skill.
- For Use the Force, only allies with Force Sensitivity receive the bonus.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Galaxy at War p.24` -> canonical `Galaxy at War p.24` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `ally`, `skill`, `competence_bonus`, `aura`, `repeatable`
- **Automation observation for later phase:** Current metadata captures the chosen skill but not the full aura, range, untrained-only restriction, repeatability, or Use the Force special case.

#### Never Surrender

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Endurance.
- **Canonical quick summary:** The first time each encounter damage would drop you to 0 HP, react with Endurance vs damage to remain at 1 HP.
- The first time each encounter you would be reduced to 0 HP, make an Endurance check as a reaction.
- DC equals the incoming damage amount.
- On success, you are reduced to 1 HP instead.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Galaxy at War p.24` -> canonical `Galaxy at War p.24` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `endurance`, `reaction`, `zero_hp`, `survival`, `once_per_encounter`
- **Automation observation for later phase:** Current generic action metadata does not fully encode first-use-only timing, dynamic DC, or exact 1-HP result.

#### Officer Candidacy Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Gain +2 Rank and Privilege organization score.
- Gain +2 to Rank and Privilege organization score.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Galaxy at War p.25` -> canonical `Galaxy at War p.25` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `organization`, `rank`, `privilege`, `leadership`
- **Automation observation for later phase:** Current organization-score modifier is substantially faithful.

#### Opportunistic Shooter

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Canonical quick summary:** Gain +2 on ranged attacks of opportunity.
- Gain +2 to attacks of opportunity made with ranged weapons.
- **Repository finding:** Description and provenance are correct.
- **Provenance observation:** current `Galaxy at War p.25` -> canonical `Galaxy at War p.25` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `ranged`, `attack_of_opportunity`, `attack_bonus`
- **Automation observation for later phase:** Current modifier is substantially faithful.

#### Pistoleer

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** Gain a different specialization benefit with a proficient blaster pistol, heavy blaster pistol, or hold-out blaster pistol.
- Blaster pistol: treat as accurate.
- Heavy blaster pistol: do not treat as inaccurate.
- Hold-out blaster pistol: against a target that has not yet acted, gain +2 attacks with that weapon until that target acts.
- **Repository finding:** Current prerequisite hardcodes Weapon Proficiency (Pistols); printed prerequisite is proficient with weapon used.
- **Provenance observation:** current `Galaxy at War p.26` -> canonical `Galaxy at War p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `pistol`, `weapon_specialization`, `accuracy`, `initiative`
- **Automation observation for later phase:** Weapon-family benefits are represented; prerequisite storage is too narrow.

#### Predictive Defense

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Intelligence 13.
- **Canonical quick summary:** Use Dexterity or Intelligence to determine Reflex Defense.
- Use either Dexterity modifier or Intelligence modifier to determine Reflex Defense.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.26` -> canonical `Galaxy at War p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `reflex_defense`, `intelligence`, `dexterity`
- **Automation observation for later phase:** Current defense-choice rule is substantially faithful.

#### Resilient Strength

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13.
- **Canonical quick summary:** Use Strength or Constitution to determine Fortitude Defense.
- Use either Strength modifier or Constitution modifier to determine Fortitude Defense.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Galaxy at War p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `fortitude`, `strength`, `constitution`
- **Automation observation for later phase:** Current defense-choice rule is substantially faithful.

#### Riflemaster

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** Gain weapon-specific specialization benefits with proficient rifles/carbines.
- Blaster carbine: may brace it on autofire even though it is not autofire-only.
- Blaster rifle: treat as accurate.
- Heavy blaster rifle: damage dice increase from d10 to d12.
- Light repeating blaster: treat as Medium instead of Large.
- **Repository finding:** Current prerequisite hardcodes Weapon Proficiency (Rifles); source says proficient with weapon used.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Galaxy at War p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `rifle`, `weapon_specialization`, `autofire`, `accuracy`, `damage`
- **Automation observation for later phase:** All four family benefits are represented, but prerequisite storage is too narrow.

#### Risk Taker

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Climb or Jump.
- **Canonical quick summary:** Fail Climb more safely, and spend a Force Point after a failed Jump to extend distance to the first safe square.
- You fall from a Climb check only when you fail by 10 or more instead of 5 or more.
- After a failed Jump that would not land safely, spend a Force Point as a free action and add its roll to jump distance.
- You must land in the first available safe square.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Galaxy at War p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `climb`, `jump`, `force_point`, `failure_threshold`, `movement`
- **Automation observation for later phase:** Current metadata does not fully encode either the changed Climb-failure threshold or the failed-jump rescue procedure.

#### Sport Hunter

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used.
- **Canonical quick summary:** Gain weapon-specific benefits with proficient slugthrowers and sporting weapons.
- Slugthrower pistol at point-blank range: +1 damage die.
- Slugthrower rifle: damage dice increase from d8 to d12.
- Sporting blaster pistol: reroll damage-die results of 1 until a non-1 result.
- Sporting blaster rifle: +1 attack when you aim before firing.
- **Repository finding:** Current prerequisite is expressed as pistol/rifle proficiency choices rather than the printed 'proficient with weapon used.'
- **Provenance observation:** current `Galaxy at War p.28` -> canonical `Galaxy at War p.25` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `slugthrower`, `sporting_weapon`, `weapon_specialization`, `damage`, `aim`
- **Automation observation for later phase:** Main weapon-specific effects are represented; prerequisite storage is too narrow.

#### Staggering Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with weapon used, base attack bonus +1.
- **Canonical quick summary:** Take -2 or -5 on a melee attack to impose the same penalty on the damaged target's skill checks through your next turn.
- With a melee weapon, choose -2 attack; if the attack deals damage, target takes -2 skill checks until end of your next turn.
- Alternatively choose -5 attack; on damage, target takes -5 skill checks until end of your next turn.
- **Repository finding:** This is the Galaxy at War identity, distinct from Scum p.24. Current summary/prerequisite fields do not accurately state the GAW feat.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Galaxy at War p.26` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `attack_penalty`, `skill_penalty`, `same_name_collision`
- **Automation observation for later phase:** Current detailed GAW rule payload is aligned, but the short summary/prerequisite data remain contaminated by older Staggering Attack variants.

#### Steadying Position

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Careful Shot.
- **Canonical quick summary:** While prone and aiming, deny the target's Dexterity bonus to Reflex Defense for the ranged attack.
- When prone and aiming before a ranged attack, the target does not benefit from its Dexterity bonus to Reflex Defense.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Galaxy at War p.28` -> canonical `Galaxy at War p.26` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `aim`, `prone`, `denied_dexterity`
- **Automation observation for later phase:** Current mechanic is substantially faithful; taxonomy should not imply the feat knocks targets prone.

#### Echani Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Identity role:** `FULL_REPRINT_SAME_IDENTITY_WITH_ADDITIONAL_SPECIAL_CLAUSE`
- **Canonical prerequisites:** Dexterity 13, Martial Arts I.
- **Canonical quick summary:** KOTOR's Echani Training is fully reprinted here and gains an Echani Expertise special interaction.
- If you make only one unarmed attack on your turn, double the Strength-modifier damage bonus (minimum +1).
- Once per encounter after dealing unarmed damage, make an immediate unarmed attack vs Fortitude as a free action; on success, knock the target prone if it is no more than one size larger.
- Fortitude modifier against the knockdown: Medium or smaller +0, Large +5, Huge +10, Gargantuan +20, Colossal +50; unusually stable creatures gain +5.
- Galaxy at War Special: with Echani Expertise, a critical unarmed hit immediately knocks the target prone if it is no more than one size larger.
- **Repository finding:** This is not a new identity. Primary provenance is KOTOR p.33; Galaxy at War p.26 is a full reprint with an added Special clause.
- **Primary provenance:** `Knights of the Old Republic Campaign Guide p.33`.
- **This-book publication:** `Galaxy at War p.26`.
- **Current repo provenance:** `Star Wars Saga Edition p.0` (`PRIMARY_AND_REPRINT_PROVENANCE_MISSING`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`, `prone`, `fortitude`, `echani`, `reprint`
- **Automation observation for later phase:** Base unarmed/knockdown mechanics exist; size/stability modifiers and the Galaxy at War Echani Expertise extension need explicit runtime certification.

#### Hijkata Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Combat Reflexes, Martial Arts I.
- **Canonical quick summary:** Counter adjacent melee attackers with unarmed AoOs and impose an attack penalty; Hijkata Expertise adds ally-guarding behavior.
- Once per round after an adjacent enemy damages you with a melee attack, make an unarmed AoO at -5 against that enemy even if the attack normally would not provoke.
- Once per encounter after damaging an enemy with an unarmed AoO, that enemy takes an attack-roll penalty equal to your Dexterity modifier (minimum 1) until end of your next turn.
- Special - Hijkata Expertise: once per encounter, full-round designate adjacent ally; attacks against that ally by enemies adjacent to you or the ally provoke from you until next turn; if ally moves, you may react and move up to speed to remain adjacent.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.26` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### K'tara Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Martial Arts I, trained in Stealth.
- **Canonical quick summary:** Deal extra unarmed damage to flat-footed enemies and once per encounter potentially render one unable to speak.
- One unarmed attack during your turn deals +1 damage die against a flat-footed enemy.
- Once per encounter after unarmed damage to a target denied Dexterity to Reflex, make a free unarmed attack vs Fortitude; on success, target cannot speak until end of your next turn; stunning effect.
- Special - K'tara Expertise: spend two swift actions to make one adjacent enemy flat-footed against your first attack that round.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.27` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### K'thri Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Dual Weapon Mastery I, Martial Arts I.
- **Canonical quick summary:** In light/no armor, make swift-action unarmed attacks and once per encounter deal half damage on an unarmed miss.
- Once per round, spend a swift action to make one unarmed attack within reach for base unarmed damage, with no Strength or heroic-level damage bonus.
- Once per encounter, an unarmed miss deals half damage.
- You must wear light or no armor to gain the feat's benefit.
- Special - K'thri Expertise: once per encounter during a full attack, reroll one unarmed attack and keep the reroll; light/no armor required.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.27` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### Stava Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Martial Arts I, Running Attack.
- **Canonical quick summary:** In light/no armor, count larger for grabs/grapples and make a free Grab after a successful unarmed charge attack.
- For Grab target-size limits, count as one size category larger.
- If capable of grapple attacks, count as one size category larger for grapple size modifier.
- After a successful unarmed attack while charging, immediately make a Grab as a free action.
- You must wear light or no armor.
- Special - Stava Expertise: add both Strength and Dexterity bonuses to grapple checks; light/no armor required.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.27` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### Tae-Jitsu Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Dodge, Martial Arts I, trained in Initiative.
- **Canonical quick summary:** Improve unarmed critical damage and designate a primary adversary to broaden Dodge coverage.
- An unarmed critical increases its damage die one step, maximum d12.
- Once per encounter after a successful unarmed attack, spend a swift action to designate that enemy as primary adversary; until encounter end, Dodge applies against that enemy and one other enemy you choose.
- Special - Tae-Jitsu Expertise: critical hit against your primary adversary imposes -2 attacks until end of your next turn.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### Teräs Käsi Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Strength 13, Martial Arts I.
- **Canonical quick summary:** Once per round, a successful unarmed attack treats the target's Damage Threshold as 5 lower.
- Once per round on a successful unarmed attack, reduce the target's Damage Threshold by 5 for determining that attack's effect.
- Special - with Teräs Käsi Basics, count as one size category larger when determining unarmed damage.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### Wrruushi Training

- **Publication category:** `MARTIAL_ARTS_FEAT`
- **Canonical prerequisites:** Constitution 13, Martial Arts I, Wookiee.
- **Canonical quick summary:** In light/no armor, successful unarmed attacks can grant bonus HP and once per encounter strip equipment Fortitude bonuses.
- Once per round after a successful unarmed attack, gain bonus HP equal to Constitution modifier; damage removes these first, leftovers expire at encounter end, and they do not stack.
- Once per encounter, make an unarmed attack against Fortitude instead of Reflex; on success, deal damage and remove the target's equipment bonuses to Fortitude until encounter end.
- You must wear light or no armor.
- Special - Wrruushi Expertise: once per encounter on an unarmed critical, deal normal damage and move target -2 CT regardless of damage result; light/no armor required.
- **Repository finding:** Current repo record is flattened to generic Star Wars Saga Edition p.0 and does not preserve the full published player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `martial_arts`, `unarmed`
- **Automation observation for later phase:** Current record is effectively summary-level; full rules, limits, armor gates, and Expertise interactions require canonical text and later runtime certification.

#### Aquatic Specialists

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Swim.
- **Canonical quick summary:** Team Feat: +3 Swim, scaling by nearby allies with the same feat to +7, plus a Swim-specific teamwork benefit.
- Gain +3 competence on Swim checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, swim at half speed as a move action or full speed as a full-round action.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `swim`, `movement`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Ascension Specialists

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Climb.
- **Canonical quick summary:** Team Feat: +3 Climb, scaling by nearby allies with the same feat to +7, plus a Climb-specific teamwork benefit.
- Gain +3 competence on Climb checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, climb at half speed as a move action or normal speed as a full-round action.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `climb`, `movement`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Covert Operatives

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Stealth.
- **Canonical quick summary:** Team Feat: +3 Stealth, scaling by nearby allies with the same feat to +7, plus a Stealth-specific teamwork benefit.
- Gain +3 competence on Stealth checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when moving more than your speed or more than twice your speed, reduce the Stealth penalties by 2.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `stealth`, `movement_penalty`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Medical Team

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Treat Injury.
- **Canonical quick summary:** Team Feat: +3 Treat Injury, scaling by nearby allies with the same feat to +7, plus a Treat Injury-specific teamwork benefit.
- Gain +3 competence on Treat Injury checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when you Aid Another an ally with this feat on a Treat Injury check to restore HP, that ally restores 4 extra HP.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.29` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `treat_injury`, `healing`, `aid_another`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Mounted Regiment

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Ride.
- **Canonical quick summary:** Team Feat: +3 Ride, scaling by nearby allies with the same feat to +7, plus a Ride-specific teamwork benefit.
- Gain +3 competence on Ride checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, once per round as a reaction when your mount is attacked, make Ride; if the result exceeds the mount's Reflex Defense, use the Ride result against the attack instead.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.29` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `ride`, `mount`, `reaction`, `defense`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Nimble Team

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Acrobatics.
- **Canonical quick summary:** Team Feat: +3 Acrobatics, scaling by nearby allies with the same feat to +7, plus a Acrobatics-specific teamwork benefit.
- Gain +3 competence on Acrobatics checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when using Acrobatics to tumble, tumble 1 extra square.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.29` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `acrobatics`, `tumble`, `movement`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Slicer Team

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Use Computer.
- **Canonical quick summary:** Team Feat: +3 Use Computer, scaling by nearby allies with the same feat to +7, plus a Use Computer-specific teamwork benefit.
- Gain +3 competence on Use Computer checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when using Aid Another to assist an ally with this feat on Use Computer, provide +4 instead of +2.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.29` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `use_computer`, `aid_another`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Technical Experts

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Mechanics.
- **Canonical quick summary:** Team Feat: +3 Mechanics, scaling by nearby allies with the same feat to +7, plus a Mechanics-specific teamwork benefit.
- Gain +3 competence on Mechanics checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when using Aid Another to assist an ally with this feat on Mechanics, provide +4 instead of +2.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.29` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `mechanics`, `aid_another`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Tireless Squad

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Endurance.
- **Canonical quick summary:** Team Feat: +3 Endurance, scaling by nearby allies with the same feat to +7, plus a Endurance-specific teamwork benefit.
- Gain +3 competence on Endurance checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when using Aid Another to assist an ally with this feat on Endurance, provide +4 instead of +2.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.30` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `endurance`, `aid_another`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Unhindered Approach

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Jump.
- **Canonical quick summary:** Team Feat: +3 Jump, scaling by nearby allies with the same feat to +7, plus a Jump-specific teamwork benefit.
- Gain +3 competence on Jump checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, add 1 square to total Jump distance.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.30` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `jump`, `movement`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Unified Squadron

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Pilot.
- **Canonical quick summary:** Team Feat: +3 Pilot, scaling by nearby allies with the same feat to +7, plus a Pilot-specific teamwork benefit.
- Gain +3 competence on Pilot checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, automatically succeed at avoiding collisions with vehicles piloted by allies who also have this feat, including at character scale.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.30` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `pilot`, `vehicle`, `collision`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Wary Sentries

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Perception.
- **Canonical quick summary:** Team Feat: +3 Perception, scaling by nearby allies with the same feat to +7, plus a Perception-specific teamwork benefit.
- Gain +3 competence on Perception checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, take 10 on Perception checks even when threatened or rushed.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.30` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `perception`, `take_10`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

#### Wilderness Specialists

- **Publication category:** `TEAM_FEAT`
- **Canonical prerequisites:** Trained in Survival.
- **Canonical quick summary:** Team Feat: +3 Survival, scaling by nearby allies with the same feat to +7, plus a Survival-specific teamwork benefit.
- Gain +3 competence on Survival checks.
- At the time of the check, add +1 for each ally within 12 squares who also has this feat, to a maximum competence bonus of +7.
- Additionally, when using Aid Another to assist an ally with this feat on Survival, provide +4 instead of +2.
- **Repository finding:** Current record is flattened to generic Star Wars Saga Edition p.0 and is summary-level rather than full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Galaxy at War p.30` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `team_feat`, `teamwork`, `ally_scaling`, `competence_bonus`, `survival`, `aid_another`
- **Automation observation for later phase:** Base competence scaling is suited to a shared Team Feat authority; each feat's special clause needs its own certified consumer or explicit manual handling.

---

## Book 13 - Rebellion Era Campaign Guide

Full feat publications: **60**; new canonical identities: **60**; reprints: **0**.

- Rebellion Era publishes exactly 60 new canonical feat identities: 12 general feats and 48 explicitly categorized Species Feats.
- All 60 identities already exist somewhere in the repository; none are missing.
- No Rebellion feat currently has exact final source/page provenance.
- Assured Attack is wrongly sourced to Galaxy at War, and Fast Surge is wrongly sourced to Jedi Academy Training Manual.
- All 48 Species Feats are currently flattened to generic Star Wars Saga Edition p.0 and the compendium update report shows them as summary-only rather than full canonical player-facing rules text.
- The older provenance-only Rebellion audit is superseded for content purposes by this direct source-text pass; the actual Rebellion source is now available in the project.
- Keen Scent is currently summarized incorrectly: canon increases Scent range to 20 squares, not by 20 squares.
- Scion of Dorin is currently summarized too narrowly: canon grants +5 species Fortitude against all natural hazards, not only atmospheric hazards.
- Strong Bellow's exact rule is once per encounter moving one fewer step down the condition track when using Bellow; its short summary can overstate that as eliminating the CT cost categorically.
- Assured Attack canon requires keeping the second damage-die reroll even if worse; prior repo metadata had a keep-better contradiction that must be fixed during automation certification.
- Under the prerequisite-tier model, 47 of 48 Species Feats are Tier 1 because species gates do not affect tier. Jedi Heritage is Tier 2 because it also requires Force Sensitivity.
- Among the 12 general feats, Moving Target, Prime Shot, Rebel Military Training, Unstoppable Combatant, and Vitality Surge are Tier 2 because they require another feat; the other seven are Tier 1.

### Source-defined Species Feat families

- **Bothan:** Bothan Will, Confident Success, Lasting Influence
- **Cerean:** Binary Mind, Mind of Reason, Perfect Intuition
- **Duros:** Flawless Pilot, Spacer's Surge, Veteran Spacer
- **Ewok:** Ample Foraging, Forest Stalker, Keen Scent
- **Gamorrean:** Increased Resistance, Primitive Warrior, Quick Comeback
- **Gungan:** Gungan Weapon Master, Perfect Swimmer, Warrior Heritage
- **Ithorian:** Devastating Bellow, Nature Specialist, Strong Bellow
- **Kel Dor:** Justice Seeker, Read the Winds, Scion of Dorin
- **Mon Calamari:** Fast Swimmer, Mon Calamari Shipwright, Sharp Senses
- **Quarren:** Clawed Subspecies, Deep Sight, Shrewd Bargainer
- **Rodian:** Fringe Benefits, Hunter's Instincts, Master Tracker
- **Sullustan:** Darkness Dweller, Disarming Charm, Sure Climber
- **Trandoshan:** Pitiless Warrior, Regenerative Healing, Thick Skin
- **Twi'lek:** Imperceptible Liar, Jedi Heritage, Survivor of Ryloth
- **Wookiee:** Bowcaster Marksman, Resurgent Vitality, Wroshyr Rage
- **Zabrak:** Inborn Resilience, Instinctive Perception, Unwavering Focus

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Assured Attack | 28 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Reroll the lowest damage die of a successful multi-die attack, keeping the second result. |
| Deft Charge | 28 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | After charging, you may still take swift, reaction, and free actions before the turn ends. |
| Fast Surge | 29 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Catch a second wind as a free action on your turn. |
| Imperial Military Training | 29 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter on your turn, freely negate one mind-affecting effect on or targeting you. |
| Moving Target | 29 | `GENERAL` | Dodge. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Move at least 3 squares from your starting position by turn end to gain +1 dodge Reflex until next turn. |
| Prime Shot | 29 | `GENERAL` | Point Blank Shot. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | At short range or closer, gain +1 ranged attack when no ally is closer to the target than you are. |
| Rapid Reaction | 29 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Once per encounter, respond to one trigger with two different reactions. |
| Rebel Military Training | 30 | `GENERAL` | Running Attack. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Move before and after a Running Attack to gain +2 dodge Reflex until next turn. |
| Recovering Surge | 30 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Catching a second wind also moves you +1 step on the condition track. |
| Unstoppable Combatant | 30 | `GENERAL` | Extra Second Wind. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Extra Second Wind uses are no longer limited to one second wind per encounter. |
| Vehicular Surge | 30 | `GENERAL` | Trained in Pilot. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Once per day, give your badly damaged Colossal-or-smaller vehicle temporary bonus HP equal to one-quarter max HP. |
| Vitality Surge | 30 | `GENERAL` | Extra Second Wind. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | You may use second wind even above half maximum HP. |
| Bothan Will | 31 | `SPECIES_FEAT` | Bothan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | After an enemy fails against your Will Defense, gain +2 circumstance Will until next turn. |
| Confident Success | 31 | `SPECIES_FEAT` | Bothan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Learn Secret Information successfully to gain a Force Point, subject to per-level and current-level Force Point caps. |
| Lasting Influence | 34 | `SPECIES_FEAT` | Bothan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | A successful Persuasion-vs-Will check grants favorable circumstances on Persuasion against that target for 24 hours. |
| Binary Mind | 31 | `SPECIES_FEAT` | Cerean species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Enemies roll mind-affecting attempts twice against you and keep the lower result. |
| Mind of Reason | 34 | `SPECIES_FEAT` | Cerean species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Use Wisdom bonus instead of Intelligence bonus for Intelligence-based skill checks. |
| Perfect Intuition | 34 | `SPECIES_FEAT` | Cerean species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Initiative rerolls always keep the better result. |
| Flawless Pilot | 33 | `SPECIES_FEAT` | Duros species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Pilot rerolls always keep the better result. |
| Spacer's Surge | 35 | `SPECIES_FEAT` | Duros species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | A natural 20 on Pilot grants a temporary Force Point for the encounter. |
| Veteran Spacer | 36 | `SPECIES_FEAT` | Duros species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Gain +5 species to Use Computer checks for starship astrogation. |
| Ample Foraging | 31 | `SPECIES_FEAT` | Ewok species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Food found with Basic Survival grants consumers +2 morale Fortitude until the next day. |
| Forest Stalker | 33 | `SPECIES_FEAT` | Ewok species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Stealth rerolls always keep the better result. |
| Keen Scent | 34 | `SPECIES_FEAT` | Ewok species. | 1 | `SUMMARY_ERROR_AND_DESCRIPTION_INCOMPLETE` | Your Scent ability has a range of 20 squares. |
| Increased Resistance | 34 | `SPECIES_FEAT` | Gamorrean species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | After an enemy fails against your Fortitude Defense, gain +2 circumstance Fortitude until next turn. |
| Primitive Warrior | 34 | `SPECIES_FEAT` | Gamorrean species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Deal +1 damage die with simple melee weapons. |
| Quick Comeback | 34 | `SPECIES_FEAT` | Gamorrean species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | After threshold-beating damage moves you down the CT, you may recover +1 CT with one swift action before your next turn ends. |
| Gungan Weapon Master | 33 | `SPECIES_FEAT` | Gungan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Force Points added to atlatl/cesta attacks use a die one step larger. |
| Perfect Swimmer | 34 | `SPECIES_FEAT` | Gungan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Swim rerolls always keep the better result. |
| Warrior Heritage | 36 | `SPECIES_FEAT` | Gungan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Gain +2 morale Will Defense while wielding an atlatl or cesta. |
| Devastating Bellow | 31 | `SPECIES_FEAT` | Ithorian species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Your Bellow deals 4d6 on a hit and half damage on a miss. |
| Nature Specialist | 34 | `SPECIES_FEAT` | Ithorian species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Force Points added to Knowledge (Life Sciences) use a die two steps larger. |
| Strong Bellow | 36 | `SPECIES_FEAT` | Ithorian species. | 1 | `SUMMARY_PARTIAL_AND_DESCRIPTION_INCOMPLETE` | Once per encounter, reduce Bellow's condition-track cost by one step. |
| Justice Seeker | 34 | `SPECIES_FEAT` | Kel Dor species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Gain +2 damage against a target that has harmed one of your allies since your last turn ended. |
| Read the Winds | 34 | `SPECIES_FEAT` | Kel Dor species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Ignore cover and concealment on Perception checks against targets within 10 squares. |
| Scion of Dorin | 35 | `SPECIES_FEAT` | Kel Dor species. | 1 | `SUMMARY_ERROR_AND_DESCRIPTION_INCOMPLETE` | Gain +5 species Fortitude against natural hazards. |
| Fast Swimmer | 33 | `SPECIES_FEAT` | Mon Calamari species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Increase swim speed by 2 squares. |
| Mon Calamari Shipwright | 34 | `SPECIES_FEAT` | Mon Calamari species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Reroute vehicle power in two swift actions and automatically succeed on the Mechanics check. |
| Sharp Senses | 35 | `SPECIES_FEAT` | Mon Calamari species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Force Points added to Perception use a die two steps larger. |
| Clawed Subspecies | 31 | `SPECIES_FEAT` | Quarren species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Gain 1d6 slashing claw natural weapons and count as armed with them. |
| Deep Sight | 31 | `SPECIES_FEAT` | Quarren species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Gain darkvision that ignores darkness concealment, but you cannot see color in total darkness. |
| Shrewd Bargainer | 35 | `SPECIES_FEAT` | Quarren species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Persuasion-vs-Will ignores the target's insight and morale bonuses to Will. |
| Fringe Benefits | 33 | `SPECIES_FEAT` | Rodian species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Reduce black-market cost multipliers by 2, minimum x1. |
| Hunter's Instincts | 33 | `SPECIES_FEAT` | Rodian species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Perception rerolls always keep the better result. |
| Master Tracker | 34 | `SPECIES_FEAT` | Rodian species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Force Points added to Survival use a die two steps larger. |
| Darkness Dweller | 31 | `SPECIES_FEAT` | Sullustan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Enemies within 10 squares take -2 Stealth; multiple Darkness Dwellers do not stack. |
| Disarming Charm | 31 | `SPECIES_FEAT` | Sullustan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Successful Change Attitude grants +2 circumstance Deception/Persuasion against that target for 24 hours. |
| Sure Climber | 36 | `SPECIES_FEAT` | Sullustan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | When not distracted or threatened, gain a natural Climb speed of 4. |
| Pitiless Warrior | 34 | `SPECIES_FEAT` | Trandoshan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Dropping a target to 0 HP grants temporary bonus HP equal to 5 + half your level. |
| Regenerative Healing | 34 | `SPECIES_FEAT` | Trandoshan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Once per day, turn second wind into regeneration: 5 HP at each turn end until full or encounter end. |
| Thick Skin | 36 | `SPECIES_FEAT` | Trandoshan species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Gain +2 species Fortitude Defense. |
| Imperceptible Liar | 34 | `SPECIES_FEAT` | Twi'lek species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Force Points added to Deception use a die two steps larger. |
| Jedi Heritage | 34 | `SPECIES_FEAT` | Twi'lek species, Force Sensitivity. | 2 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Treat Wisdom as 4 higher for Force Training power count, granting two extra powers per Force Training. |
| Survivor of Ryloth | 36 | `SPECIES_FEAT` | Twi'lek species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Once per hour in extreme heat/cold, Survival can replace Fortitude for you and up to 10 allies against the hazard's hourly attack. |
| Bowcaster Marksman | 31 | `SPECIES_FEAT` | Wookiee species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | A Force Point spent on a bowcaster attack also adds the same amount to damage if the attack hits. |
| Resurgent Vitality | 35 | `SPECIES_FEAT` | Wookiee species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Second wind restores extra HP equal to twice Constitution bonus, minimum 2. |
| Wroshyr Rage | 36 | `SPECIES_FEAT` | Wookiee species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Entering rage grants temporary bonus HP equal to 10 + half your level. |
| Inborn Resilience | 34 | `SPECIES_FEAT` | Zabrak species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | Permanently shift your Zabrak species Defense bonus from one Defense to another. |
| Instinctive Perception | 34 | `SPECIES_FEAT` | Zabrak species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | If a forced Perception reroll is worse, gain a temporary Force Point usable only on Perception this encounter. |
| Unwavering Focus | 36 | `SPECIES_FEAT` | Zabrak species. | 1 | `DESCRIPTION_INCOMPLETE_SUMMARY_ONLY` | React to a mind-affecting skill check against your Will by imposing -2 on the check. |

### Detailed rules and repository findings

#### Assured Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Reroll the lowest damage die of a successful multi-die attack, keeping the second result.
- Whenever an attack deals damage and rolls multiple damage dice, reroll the lowest damage die and keep the second result even if worse.
- **Repository finding:** Full description is canonical. Source is wrong: this is Rebellion Era p.28, not Galaxy at War.
- **Provenance observation:** current `Galaxy at War p.23` -> canonical `Rebellion Era Campaign Guide p.28` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `damage`, `reroll`
- **Automation observation for later phase:** Current implementation audit classified this as data/text only; older repo metadata also used keepBetter in one layer, which contradicts canon's keep-second rule.

#### Deft Charge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** After charging, you may still take swift, reaction, and free actions before the turn ends.
- After resolving a charge, you may still take swift actions, reactions, and free actions before your turn ends.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.18` -> canonical `Rebellion Era Campaign Guide p.28` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `charge`, `action_economy`
- **Automation observation for later phase:** Needs charge-end action-authority handling rather than a generic numeric modifier.

#### Fast Surge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Catch a second wind as a free action on your turn.
- On your turn, catch a second wind as a free action instead of a swift action.
- **Repository finding:** Full description is faithful. Source is wrong: this is Rebellion Era p.29, not Jedi Academy.
- **Provenance observation:** current `Jedi Academy Training Manual p.30` -> canonical `Rebellion Era Campaign Guide p.29` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `free_action`, `action_economy`
- **Automation observation for later phase:** Current rule metadata recognizes the action-speed change, but later runtime certification must prove it is consumed only on your turn.

#### Imperial Military Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per encounter on your turn, freely negate one mind-affecting effect on or targeting you.
- Once per encounter, as a free action on your turn, negate one mind-affecting effect targeting you or currently affecting you.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.19` -> canonical `Rebellion Era Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `mind_affecting`, `free_action`, `once_per_encounter`, `defense`
- **Automation observation for later phase:** Current metadata has a passive rule marker, but the once/encounter free-action negation needs explicit action/effect authority.

#### Moving Target

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dodge.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Move at least 3 squares from your starting position by turn end to gain +1 dodge Reflex until next turn.
- If you end your turn at least 3 squares from where you started, gain +1 dodge Reflex Defense until the start of your next turn.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.20` -> canonical `Rebellion Era Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `movement`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Needs turn-start/turn-end displacement measurement and timed defense application.

#### Prime Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** At short range or closer, gain +1 ranged attack when no ally is closer to the target than you are.
- If no ally is closer to your target than you are when making a ranged attack, gain +1 circumstance to the attack roll; target must be at short range or closer.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.20` -> canonical `Rebellion Era Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `ranged`, `attack_bonus`, `positioning`, `range`
- **Automation observation for later phase:** Requires target/allied-distance comparison plus short-range gating.

#### Rapid Reaction

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per encounter, respond to one trigger with two different reactions.
- Once per encounter, use two different reactions in response to the same trigger.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.21` -> canonical `Rebellion Era Campaign Guide p.29` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `reaction`, `action_economy`, `once_per_encounter`
- **Automation observation for later phase:** Requires reaction-stack/action-authority support; a passive modifier alone cannot enforce this.

#### Rebel Military Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Running Attack.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Move before and after a Running Attack to gain +2 dodge Reflex until next turn.
- Whenever Running Attack moves you both before and after the attack, gain +2 dodge Reflex Defense until the start of your next turn.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.21` -> canonical `Rebellion Era Campaign Guide p.30` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `running_attack`, `movement`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Must detect both movement legs of Running Attack and apply a timed dodge bonus.

#### Recovering Surge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Catching a second wind also moves you +1 step on the condition track.
- Whenever you catch a second wind, move +1 step on the condition track.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.22` -> canonical `Rebellion Era Campaign Guide p.30` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `condition_track`, `recovery`
- **Automation observation for later phase:** Current rule marker is straightforward but must integrate with second-wind resolution.

#### Unstoppable Combatant

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Extra Second Wind.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Extra Second Wind uses are no longer limited to one second wind per encounter.
- You may catch more than one second wind per encounter.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.22` -> canonical `Rebellion Era Campaign Guide p.30` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `resource_limit`
- **Automation observation for later phase:** This changes encounter-level resource limits rather than granting a numeric modifier.

#### Vehicular Surge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Pilot.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per day, give your badly damaged Colossal-or-smaller vehicle temporary bonus HP equal to one-quarter max HP.
- If a Colossal-or-smaller vehicle you pilot is below half maximum HP, once per day as a swift action give it bonus HP equal to one-quarter maximum HP.
- Damage is removed from bonus HP first; remaining bonus HP expire at encounter end; bonus HP do not stack.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.23` -> canonical `Rebellion Era Campaign Guide p.30` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `vehicle`, `pilot`, `bonus_hit_points`, `swift_action`, `once_per_day`
- **Automation observation for later phase:** Requires vehicle relationship, size/HP threshold, daily use, swift action, and temporary bonus-HP lifecycle.

#### Vitality Surge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Extra Second Wind.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** You may use second wind even above half maximum HP.
- You may catch a second wind even when above one-half maximum HP.
- **Repository finding:** Full description is faithful; page metadata is wrong.
- **Provenance observation:** current `Rebellion Era Campaign Guide p.23` -> canonical `Rebellion Era Campaign Guide p.30` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `healing`, `eligibility`
- **Automation observation for later phase:** Changes the second-wind eligibility gate and should be owned by recovery authority.

#### Bothan Will

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Bothan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** After an enemy fails against your Will Defense, gain +2 circumstance Will until next turn.
- Whenever an attack or skill check targets your Will Defense and fails to equal or exceed it, gain +2 circumstance Will Defense until the start of your next turn.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `bothan`, `will_defense`, `circumstance_bonus`
- **Automation observation for later phase:** Conditional timed defense bonus; current summary omits the exact trigger/duration.

#### Confident Success

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Bothan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Learn Secret Information successfully to gain a Force Point, subject to per-level and current-level Force Point caps.
- Whenever you successfully use Gather Information to Learn Secret Information, gain 1 Force Point.
- You can gain no more than 3 Force Points per level this way, and cannot hold more Force Points than you gained upon reaching your current level.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `bothan`, `gather_information`, `force_point`
- **Automation observation for later phase:** Needs skill-application trigger and both Force Point caps.

#### Lasting Influence

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Bothan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** A successful Persuasion-vs-Will check grants favorable circumstances on Persuasion against that target for 24 hours.
- After a successful Persuasion check against a target's Will Defense, gain favorable circumstances on future Persuasion checks against that target for 24 hours.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `bothan`, `persuasion`, `favorable_circumstances`
- **Automation observation for later phase:** Target-specific 24-hour skill state; summary is too vague.

#### Binary Mind

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Cerean species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Enemies roll mind-affecting attempts twice against you and keep the lower result.
- Whenever an enemy uses a mind-affecting effect against you, that enemy rolls twice and keeps the lower result.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `cerean`, `mind_affecting`, `roll_twice`
- **Automation observation for later phase:** Requires roll-replacement logic on hostile mind-affecting effects.

#### Mind of Reason

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Cerean species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use Wisdom bonus instead of Intelligence bonus for Intelligence-based skill checks.
- Use your Wisdom bonus instead of your Intelligence bonus for all Intelligence-based skill checks.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `cerean`, `skill`, `ability_substitution`
- **Automation observation for later phase:** Current rule marker appears aligned but needs broad skill-check consumer coverage.

#### Perfect Intuition

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Cerean species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Initiative rerolls always keep the better result.
- Whenever you reroll an Initiative check, always keep the better result, even if multiple reroll abilities apply.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `cerean`, `initiative`, `reroll`
- **Automation observation for later phase:** Current record is data/text only; reroll outcome needs initiative authority.

#### Flawless Pilot

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Duros species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Pilot rerolls always keep the better result.
- Whenever you reroll a Pilot check, always keep the better result, even if multiple reroll abilities apply.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `duros`, `pilot`, `reroll`
- **Automation observation for later phase:** Current record is data/text only; reroll outcome needs Pilot skill authority.

#### Spacer's Surge

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Duros species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** A natural 20 on Pilot grants a temporary Force Point for the encounter.
- Whenever you roll a natural 20 on a Pilot check, gain 1 temporary Force Point; it expires at encounter end if unused.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `duros`, `pilot`, `natural_20`, `force_point`
- **Automation observation for later phase:** Needs Pilot natural-20 trigger and temporary resource lifecycle.

#### Veteran Spacer

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Duros species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +5 species to Use Computer checks for starship astrogation.
- Gain +5 species bonus to Use Computer checks made to perform astrogation aboard a starship.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `duros`, `use_computer`, `astrogation`, `species_bonus`
- **Automation observation for later phase:** Current record is data/text only; contextual skill modifier is not certified.

#### Ample Foraging

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Ewok species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Food found with Basic Survival grants consumers +2 morale Fortitude until the next day.
- When you use Basic Survival, every creature that consumes the food you find gains +2 morale Fortitude Defense until the start of the next day.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `ewok`, `survival`, `fortitude`, `morale_bonus`
- **Automation observation for later phase:** Needs Basic Survival result, consumer tracking, and next-day duration.

#### Forest Stalker

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Ewok species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Stealth rerolls always keep the better result.
- Whenever you reroll a Stealth check, always keep the better result, even if multiple reroll abilities apply.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `ewok`, `stealth`, `reroll`
- **Automation observation for later phase:** Current record is data/text only; reroll outcome needs Stealth authority.

#### Keen Scent

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Ewok species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Your Scent ability has a range of 20 squares.
- The range of your Scent ability increases to 20 squares.
- **Repository finding:** Current generic summary says increase the Scent range by 20 squares. The source says the range increases to 20 squares.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `ewok`, `scent`, `sense_range`
- **Automation observation for later phase:** Current record is data/text only; species-sense range needs actor/sense authority.

#### Increased Resistance

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Gamorrean species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** After an enemy fails against your Fortitude Defense, gain +2 circumstance Fortitude until next turn.
- Whenever an attack or skill check targets Fortitude Defense and fails to equal or exceed it, gain +2 circumstance Fortitude until the start of your next turn.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `gamorrean`, `fortitude`, `circumstance_bonus`
- **Automation observation for later phase:** Conditional timed defense bonus; summary lacks trigger/duration.

#### Primitive Warrior

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Gamorrean species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Deal +1 damage die with simple melee weapons.
- Deal +1 die of damage with simple melee weapons.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `gamorrean`, `simple_melee`, `damage`
- **Automation observation for later phase:** Current record is data/text only; needs weapon-category damage-die rider.

#### Quick Comeback

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Gamorrean species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** After threshold-beating damage moves you down the CT, you may recover +1 CT with one swift action before your next turn ends.
- When an attack deals damage at least equal to your Damage Threshold and moves you down the condition track, until end of your next turn you can move +1 CT as a single swift action.
- Use only once per attack that moved you down the condition track.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `gamorrean`, `condition_track`, `swift_action`, `damage_threshold`
- **Automation observation for later phase:** Needs attack-specific trigger, temporary action permission, and once-per-attack limit.

#### Gungan Weapon Master

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Gungan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Force Points added to atlatl/cesta attacks use a die one step larger.
- Whenever you spend a Force Point to add to an attack roll with an atlatl or cesta, increase the Force Point die type one step (d6 to d8, or d8 to d10).
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `gungan`, `force_point`, `atlatl`, `cesta`
- **Automation observation for later phase:** Current record is data/text only; needs weapon-context Force Point die upgrade.

#### Perfect Swimmer

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Gungan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Swim rerolls always keep the better result.
- Whenever you reroll a Swim check, always keep the better result, even if multiple reroll abilities apply.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `gungan`, `swim`, `reroll`
- **Automation observation for later phase:** Current record is data/text only; reroll outcome needs Swim authority.

#### Warrior Heritage

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Gungan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +2 morale Will Defense while wielding an atlatl or cesta.
- Gain +2 morale Will Defense while wielding an atlatl or cesta.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `gungan`, `will_defense`, `atlatl`, `cesta`, `morale_bonus`
- **Automation observation for later phase:** Requires equipped-weapon context for a conditional defense bonus.

#### Devastating Bellow

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Ithorian species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Your Bellow deals 4d6 on a hit and half damage on a miss.
- Your Bellow attack deals 4d6 damage on a hit and half damage on a miss.
- Normally Bellow deals 3d6 on a hit.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `ithorian`, `bellow`, `damage`
- **Automation observation for later phase:** Needs species-ability damage override.

#### Nature Specialist

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Ithorian species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Force Points added to Knowledge (Life Sciences) use a die two steps larger.
- Whenever you spend a Force Point to add to Knowledge (Life Sciences), increase the die type by two steps (d6 to d10, or d8 to d12).
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `ithorian`, `force_point`, `knowledge_life_sciences`
- **Automation observation for later phase:** Current record is data/text only; needs skill-context Force Point die upgrade.

#### Strong Bellow

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Ithorian species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per encounter, reduce Bellow's condition-track cost by one step.
- Once per encounter when you use Bellow, move one fewer step down the condition track.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `ithorian`, `bellow`, `condition_track`, `once_per_encounter`
- **Automation observation for later phase:** Summary overstates the result as simply using Bellow without CT movement; the exact rule is one fewer step.

#### Justice Seeker

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Kel Dor species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +2 damage against a target that has harmed one of your allies since your last turn ended.
- Gain +2 damage on attacks against targets that have damaged one of your allies since the end of your last turn.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `kel_dor`, `damage`, `ally_trigger`
- **Automation observation for later phase:** Needs recent-target/allied-damage state.

#### Read the Winds

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Kel Dor species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Ignore cover and concealment on Perception checks against targets within 10 squares.
- For Perception checks against targets within 10 squares, ignore concealment and cover.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `kel_dor`, `perception`, `cover`, `concealment`
- **Automation observation for later phase:** Requires Perception target context within 10 squares.

#### Scion of Dorin

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Kel Dor species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +5 species Fortitude against natural hazards.
- Gain +5 species Fortitude Defense against all natural hazards.
- **Repository finding:** Current generic summary narrows the feat to Atmospheric Hazards. The printed rule applies to all natural hazards.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `kel_dor`, `fortitude`, `natural_hazard`, `species_bonus`
- **Automation observation for later phase:** Current rule marker must apply to the broader natural-hazard category, not just atmosphere.

#### Fast Swimmer

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Mon Calamari species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Increase swim speed by 2 squares.
- Your swim speed increases by 2 squares.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `mon_calamari`, `swim_speed`, `movement`
- **Automation observation for later phase:** Current modifier appears simple but needs derived movement certification.

#### Mon Calamari Shipwright

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Mon Calamari species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Reroute vehicle power in two swift actions and automatically succeed on the Mechanics check.
- Spend only two swift actions to move a vehicle you occupy +1 step on the condition track.
- Automatically succeed on Mechanics checks to reroute power.
- Normally reroute power takes three swift actions.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `mon_calamari`, `vehicle`, `mechanics`, `condition_track`, `action_economy`
- **Automation observation for later phase:** Needs vehicle action procedure and automatic-success handling.

#### Sharp Senses

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Mon Calamari species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Force Points added to Perception use a die two steps larger.
- Whenever you spend a Force Point to add to Perception, increase the die type by two steps (d6 to d10, or d8 to d12).
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `mon_calamari`, `force_point`, `perception`
- **Automation observation for later phase:** Current record is data/text only; needs skill-context Force Point die upgrade.

#### Clawed Subspecies

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Quarren species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain 1d6 slashing claw natural weapons and count as armed with them.
- You have claw natural weapons; an unarmed attack may deal 1d6 slashing instead of normal unarmed damage.
- You are always considered armed with your natural weapons.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `quarren`, `natural_weapon`, `unarmed`, `slashing`
- **Automation observation for later phase:** Current record is data/text only; requires natural-weapon integration.

#### Deep Sight

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Quarren species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain darkvision that ignores darkness concealment, but you cannot see color in total darkness.
- Gain darkvision and ignore concealment, including total concealment, from darkness.
- You cannot perceive colors in total darkness.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `quarren`, `darkvision`, `concealment`, `sense`
- **Automation observation for later phase:** Current record is data/text only; needs vision-mode handling.

#### Shrewd Bargainer

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Quarren species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Persuasion-vs-Will ignores the target's insight and morale bonuses to Will.
- When making Persuasion against a target's Will Defense, that target receives no insight or morale bonuses to Will Defense.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `quarren`, `persuasion`, `will_defense`, `bonus_suppression`
- **Automation observation for later phase:** Needs defense-component suppression only for qualifying Persuasion checks.

#### Fringe Benefits

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Rodian species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Reduce black-market cost multipliers by 2, minimum x1.
- Whenever you buy goods on the black market, reduce the cost multiplier by 2, minimum x1.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `rodian`, `black_market`, `cost`
- **Automation observation for later phase:** Needs commerce pricing authority; current summary omits the minimum.

#### Hunter's Instincts

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Rodian species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Perception rerolls always keep the better result.
- Whenever you reroll a Perception check, always keep the better result, even if multiple reroll abilities apply.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.33` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `rodian`, `perception`, `reroll`
- **Automation observation for later phase:** Current record is data/text only; reroll outcome needs Perception authority.

#### Master Tracker

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Rodian species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Force Points added to Survival use a die two steps larger.
- Whenever you spend a Force Point to add to Survival, increase the die type by two steps (d6 to d10, or d8 to d12).
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `rodian`, `force_point`, `survival`
- **Automation observation for later phase:** Current record is data/text only; needs skill-context Force Point die upgrade.

#### Darkness Dweller

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Sullustan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Enemies within 10 squares take -2 Stealth; multiple Darkness Dwellers do not stack.
- Any enemy making a Stealth check within 10 squares of you takes -2; this penalty does not stack with the same feat from others.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `sullustan`, `stealth`, `aura`, `penalty`
- **Automation observation for later phase:** Needs enemy proximity aura and nonstacking rule.

#### Disarming Charm

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Sullustan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Successful Change Attitude grants +2 circumstance Deception/Persuasion against that target for 24 hours.
- After successfully using Change Attitude on a target, gain +2 circumstance on all Deception and Persuasion checks against that target for 24 hours.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `sullustan`, `persuasion`, `deception`, `change_attitude`, `circumstance_bonus`
- **Automation observation for later phase:** Needs target-specific 24-hour social-state tracking.

#### Sure Climber

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Sullustan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** When not distracted or threatened, gain a natural Climb speed of 4.
- When not distracted or threatened, gain a natural climb speed of 4 squares.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `sullustan`, `climb_speed`, `movement`
- **Automation observation for later phase:** Current record is data/text only; movement mode is conditional on threat/distraction state.

#### Pitiless Warrior

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Trandoshan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Dropping a target to 0 HP grants temporary bonus HP equal to 5 + half your level.
- Whenever you reduce a target to 0 HP, gain bonus HP equal to 5 + one-half your level.
- Damage removes bonus HP first; leftovers expire at encounter end; bonus HP do not stack.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `trandoshan`, `zero_hp`, `bonus_hit_points`
- **Automation observation for later phase:** Needs kill/drop trigger and full temporary-HP lifecycle.

#### Regenerative Healing

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Trandoshan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per day, turn second wind into regeneration: 5 HP at each turn end until full or encounter end.
- Once per day when catching a second wind, regain no HP immediately; instead regain 5 HP at the end of each of your turns until full HP or encounter end.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `trandoshan`, `second_wind`, `regeneration`, `once_per_day`
- **Automation observation for later phase:** Needs replacement of immediate second-wind healing with a timed regeneration effect.

#### Thick Skin

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Trandoshan species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +2 species Fortitude Defense.
- Gain +2 species bonus to Fortitude Defense.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `trandoshan`, `fortitude`, `species_bonus`
- **Automation observation for later phase:** Simple defense modifier; current modifier appears straightforward.

#### Imperceptible Liar

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Twi'lek species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Force Points added to Deception use a die two steps larger.
- Whenever you spend a Force Point to add to Deception, increase the die type by two steps (d6 to d10, or d8 to d12).
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `twilek`, `force_point`, `deception`
- **Automation observation for later phase:** Needs skill-context Force Point die upgrade.

#### Jedi Heritage

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Twi'lek species, Force Sensitivity.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Treat Wisdom as 4 higher for Force Training power count, granting two extra powers per Force Training.
- For determining Force powers gained from Force Training, treat Wisdom as 4 points higher.
- This grants two extra Force powers for each Force Training feat.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `twilek`, `force_sensitivity`, `force_training`, `force_power`, `progression`
- **Automation observation for later phase:** Progression effect must alter Force Training power-count calculation, not general Wisdom.

#### Survivor of Ryloth

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Twi'lek species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per hour in extreme heat/cold, Survival can replace Fortitude for you and up to 10 allies against the hazard's hourly attack.
- Once per hour in extreme heat or cold, make a Survival check.
- You and up to 10 allies may use that result in place of Fortitude Defense against the environment's hourly attack.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `twilek`, `survival`, `extreme_temperature`, `ally`
- **Automation observation for later phase:** Needs hourly hazard procedure and up-to-10-allies substitution.

#### Bowcaster Marksman

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Wookiee species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** A Force Point spent on a bowcaster attack also adds the same amount to damage if the attack hits.
- Whenever you spend a Force Point to add to a bowcaster attack, if the attack hits, add a competence bonus to damage equal to the amount the Force Point added to the attack.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.31` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `wookiee`, `bowcaster`, `force_point`, `damage`, `competence_bonus`
- **Automation observation for later phase:** Needs attack Force Point result carried into hit damage.

#### Resurgent Vitality

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Wookiee species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Second wind restores extra HP equal to twice Constitution bonus, minimum 2.
- Whenever you catch a second wind, regain additional HP equal to twice your Constitution bonus, minimum 2.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.35` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `wookiee`, `second_wind`, `healing`, `constitution`
- **Automation observation for later phase:** Needs second-wind healing augmentation.

#### Wroshyr Rage

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Wookiee species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Entering rage grants temporary bonus HP equal to 10 + half your level.
- When you first enter rage, gain bonus HP equal to 10 + one-half your level.
- Damage removes bonus HP first; leftovers expire at encounter end; bonus HP do not stack.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `wookiee`, `rage`, `bonus_hit_points`
- **Automation observation for later phase:** Current record is data/text only; needs rage-entry trigger and bonus-HP lifecycle.

#### Inborn Resilience

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Zabrak species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Permanently shift your Zabrak species Defense bonus from one Defense to another.
- Reduce your species bonus to one Defense to +0 and increase your species bonus to another Defense to +2.
- Once changed, these species bonuses cannot be changed back.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `zabrak`, `defense`, `species_bonus`, `permanent_choice`
- **Automation observation for later phase:** Needs persistent character-build choice and derived-defense recalculation.

#### Instinctive Perception

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Zabrak species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** If a forced Perception reroll is worse, gain a temporary Force Point usable only on Perception this encounter.
- Whenever you reroll Perception and keep the second result, if the second result is lower than the first, gain 1 temporary Force Point.
- That Force Point may be spent only to add to a Perception check and expires at encounter end.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.34` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `zabrak`, `perception`, `reroll`, `force_point`
- **Automation observation for later phase:** Needs comparison of first/second reroll results and restricted temporary resource.

#### Unwavering Focus

- **Publication category:** `SPECIES_FEAT`
- **Canonical prerequisites:** Zabrak species.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** React to a mind-affecting skill check against your Will by imposing -2 on the check.
- When targeted by a mind-affecting effect requiring a skill check against Will Defense, as a reaction impose -2 on that skill check.
- **Repository finding:** Current repository record is generic Star Wars Saga Edition p.0 and preserves only a short summary, not the full canonical player-facing rules text.
- **Provenance observation:** current `Star Wars Saga Edition p.0` -> canonical `Rebellion Era Campaign Guide p.36` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `species_feat`, `zabrak`, `mind_affecting`, `will_defense`, `reaction`, `skill_penalty`
- **Automation observation for later phase:** Needs pre-resolution reaction window against qualifying mind-affecting skill checks.

---

## Book 14 - Saga Edition Core Rulebook

Full feat publications: **64**; new canonical identities: **64**; reprints: **0**.

- Core publishes exactly 64 canonical feat identities on printed pp.82-89; all 64 identities exist somewhere in the repository.
- Only 12 of 64 currently have exact Core source/page metadata; 8 are misattributed to later books and 44 have the correct book but wrong page.
- Official Core errata is part of this content authority. In particular, Acrobatic Strike is +2, not the first-printing +5.
- Burst Fire, Rapid Shot, and Rapid Strike use errata prerequisites/special penalties rather than the first-printing ability-score prerequisite model.
- Force Training's repeat-selection grant is 1 + Wisdom modifier under official errata, and permanent Wisdom increases grant one additional power per Force Training feat held.
- Weapon Proficiency is one canonical repeatable grouped-choice feat. Six scope-specific repository records remain implementation derivatives and must not become separate canonical identities.
- Double Attack is Tier 1 under the prerequisite-depth model despite BAB +6 because it has no feat prerequisite; Triple Attack is Tier 2 because it requires Double Attack.
- The armor-proficiency chain illustrates prerequisite depth cleanly: Light Tier 1, Medium Tier 2, Heavy Tier 3.
- Dual Weapon Mastery I/II/III and Martial Arts I/II/III likewise form Tier 1/2/3 chains.
- Several short Core descriptions preserve the headline effect but omit material Specials such as repeatability, nonstacking, selected scopes, or interaction restrictions; these are recorded individually below.

### Content findings

| Feat | Page | Category | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---:|---|---|---:|---|---|
| Acrobatic Strike | 82 | `GENERAL` | Trained in Acrobatics. | 1 | `CANONICAL_ERRATA_MATCHES_RULE` | After tumbling to avoid an AoO, gain +2 competence on your next attack against that foe this turn. |
| Armor Proficiency (Heavy) | 82 | `GENERAL` | Armor Proficiency (Light), Armor Proficiency (Medium). | 3 | `CANONICAL_TEXT_MATCHES_RULE` | Use heavy armor without nonproficiency penalties and gain its special equipment bonuses. |
| Armor Proficiency (Light) | 82 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Use light armor without nonproficiency penalties and gain its special equipment bonuses. |
| Armor Proficiency (Medium) | 82 | `GENERAL` | Armor Proficiency (Light). | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Use medium armor without nonproficiency penalties and gain its special equipment bonuses. |
| Bantha Rush | 82 | `GENERAL` | Strength 13, base attack bonus +1. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | After a melee hit, push an eligible target 1 square in any direction. |
| Burst Fire | 82 | `GENERAL` | Proficient with heavy weapons, proficient with weapon used. | 1 | `PREREQUISITE_AND_ERRATA_SPECIAL_RESTORE` | Use autofire against one target at -5 for +2 damage dice; low Strength makes the penalty -10 with non-vehicle weapons. |
| Careful Shot | 82 | `GENERAL` | Point Blank Shot, base attack bonus +2. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Aim before a ranged attack to gain +1 attack. |
| Charging Fire | 82 | `GENERAL` | Base attack bonus +4. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Charge into a ranged attack: no charge attack bonus, but still take -2 Reflex. |
| Cleave | 83 | `GENERAL` | Strength 13, Power Attack. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Drop an opponent to 0 HP with melee to gain one immediate extra melee attack, once per round. |
| Combat Reflexes | 83 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Gain extra AoOs equal to Dexterity modifier and make AoOs while flat-footed. |
| Coordinated Attack | 83 | `GENERAL` | Base attack bonus +2. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Automatically succeed on qualifying combat Aid Another checks at adjacent/point-blank range. |
| Crush | 83 | `GENERAL` | Pin, base attack bonus +1. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | A successful Pin can immediately deal your unarmed/claw damage. |
| Cybernetic Surgery | 83 | `GENERAL` | Trained in Treat Injury. | 1 | `CANONICAL_BASE_TEXT_PRESENT_SPECIAL_REQUIRED` | Install cybernetics with a DC 20 Treat Injury procedure; self-install is harder and Surgical Expertise speeds it up. |
| Deadeye | 84 | `GENERAL` | Point Blank Shot, Precise Shot, base attack bonus +4. | 3 | `CANONICAL_BASE_TEXT_PRESENT_NONSTACKING_REQUIRED` | Aim before a ranged hit to deal +1 weapon die; does not stack with Burst Fire or Rapid Shot. |
| Dodge | 84 | `GENERAL` | Dexterity 13. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Designate an opponent for +1 dodge Reflex against its attacks. |
| Double Attack | 84 | `GENERAL` | Base attack bonus +6, proficient with chosen weapon. | 1 | `PREREQUISITE_LINE_ERROR` | Choose a proficient weapon scope; Full Attack gains one extra attack at -5 to all attacks. |
| Dreadful Rage | 84 | `GENERAL` | Rage species trait, base attack bonus +1. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | While raging, increase the rage melee attack/damage bonus to +5. |
| Dual Weapon Mastery I | 84 | `GENERAL` | Dexterity 13, base attack bonus +1. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Reduce two-weapon/double-weapon Full Attack penalty to -5. |
| Dual Weapon Mastery II | 84 | `GENERAL` | Dexterity 15, Dual Weapon Mastery I, base attack bonus +6. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Reduce two-weapon/double-weapon Full Attack penalty to -2. |
| Dual Weapon Mastery III | 84 | `GENERAL` | Dexterity 17, Dual Weapon Mastery I, Dual Weapon Mastery II, base attack bonus +11. | 3 | `CANONICAL_TEXT_MATCHES_RULE` | Eliminate two-weapon/double-weapon Full Attack penalties. |
| Exotic Weapon Proficiency | 84 | `GENERAL` | Base attack bonus +1. | 1 | `CANONICAL_BASE_TEXT_PRESENT_REPEATABILITY_REQUIRED` | Become proficient with one chosen exotic weapon; repeatable for other exotic weapons. |
| Extra Rage | 85 | `GENERAL` | Rage species trait. | 1 | `DESCRIPTION_PARTIAL_MISSING_REPEATABILITY` | Gain one additional Rage use per day; repeatable. |
| Extra Second Wind | 85 | `GENERAL` | Trained in Endurance. | 1 | `DESCRIPTION_PARTIAL_MISSING_SPECIAL` | Gain another second wind per day; normal encounter limit still applies unless another rule changes it. |
| Far Shot | 85 | `GENERAL` | Point Blank Shot. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Reduce ranged distance penalties by one range category. |
| Force Boon | 85 | `GENERAL` | Force Sensitivity. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Gain 3 additional Force Points each level. |
| Force Sensitivity | 85 | `GENERAL` | Cannot be a droid. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Unlock Use the Force and access to Force talents. |
| Force Training | 85 | `GENERAL` | Force Sensitivity, trained in Use the Force. | 2 | `DESCRIPTION_PARTIAL_ERRATA_SPECIAL_REQUIRED` | Gain 1 + Wisdom modifier Force powers per selection; permanent Wisdom increases grant one extra power per Force Training feat. |
| Great Cleave | 85 | `GENERAL` | Strength 13, Power Attack, Cleave, base attack bonus +4. | 3 | `CANONICAL_TEXT_MATCHES_RULE` | Use Cleave any number of times per round when its trigger occurs. |
| Improved Charge | 85 | `GENERAL` | Dexterity 13, Dodge, Mobility. | 3 | `CANONICAL_TEXT_MATCHES_RULE` | Charge around obstacles instead of only in a straight line. |
| Improved Defenses | 85 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Gain +1 to all three defenses. |
| Improved Disarm | 85 | `GENERAL` | Intelligence 13, Melee Defense. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Gain +5 to melee disarm and prevent the normal failed-disarm counterattack. |
| Improved Damage Threshold | 86 | `GENERAL` | None. | 1 | `DESCRIPTION_PARTIAL_MISSING_REPEATABILITY` | Increase Damage Threshold by 5; repeatable and stacking. |
| Linguist | 86 | `GENERAL` | Intelligence 13. | 1 | `DESCRIPTION_PARTIAL_MISSING_REPEATABILITY` | Gain 1 + Intelligence bonus languages; repeatable. |
| Martial Arts I | 86 | `GENERAL` | None. | 1 | `CANONICAL_FEAT_TEXT_PLUS_CROSS_RULE_INTERACTION` | Increase unarmed damage one die step and gain +1 dodge Reflex. |
| Martial Arts II | 86 | `GENERAL` | Martial Arts I, base attack bonus +3. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Increase unarmed damage another die step and gain another +1 dodge Reflex. |
| Martial Arts III | 86 | `GENERAL` | Martial Arts I, Martial Arts II, base attack bonus +6. | 3 | `CANONICAL_TEXT_MATCHES_RULE` | Increase unarmed damage another die step and gain another +1 dodge Reflex. |
| Melee Defense | 86 | `GENERAL` | Intelligence 13. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Trade up to 5 melee attack bonus for equal dodge Reflex until next turn. |
| Mighty Swing | 86 | `GENERAL` | Strength 13. | 1 | `CANONICAL_BASE_TEXT_PRESENT_NONSTACKING_REQUIRED` | Spend two swift actions for +1 damage die on your next melee attack this round; does not stack with Rapid Strike. |
| Mobility | 86 | `GENERAL` | Dexterity 13, Dodge. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Gain +5 dodge Reflex against movement-triggered AoOs. |
| Pin | 87 | `GENERAL` | Base attack bonus +1. | 1 | `CANONICAL_BASE_TEXT_PRESENT_SPECIAL_REQUIRED` | Win a grapple to pin the target until your next turn, preventing actions and denying Dexterity to Reflex. |
| Point-Blank Shot | 87 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Gain +1 ranged attack and damage within point-blank range. |
| Power Attack | 87 | `GENERAL` | Strength 13. | 1 | `DESCRIPTION_PARTIAL_MISSING_SPECIAL` | Trade melee attack for damage up to BAB; two-handed use doubles the damage gain; no bonus damage against objects/vehicles. |
| Powerful Charge | 87 | `GENERAL` | Medium or larger size, base attack bonus +1. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Charge for an extra +2 melee attack and +half-level damage. |
| Precise Shot | 87 | `GENERAL` | Point Blank Shot. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Ignore the -5 penalty for ranged attacks into melee. |
| Quick Draw | 87 | `GENERAL` | Base attack bonus +1. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Draw or holster a weapon as a swift action. |
| Rapid Shot | 88 | `GENERAL` | Base attack bonus +1, proficient with weapon used. | 1 | `PREREQUISITE_LINE_AND_ERRATA_SPECIAL_REQUIRED` | Make a proficient ranged attack at -2 for +1 damage die; low Strength makes it -5 with non-vehicle weapons. |
| Rapid Strike | 88 | `GENERAL` | Base attack bonus +1, proficient with weapon used. | 1 | `PREREQUISITE_LINE_AND_ERRATA_SPECIAL_REQUIRED` | Make a proficient melee attack at -2 for +1 damage die; low Dexterity makes it -5 with non-light weapons. |
| Running Attack | 88 | `GENERAL` | Dexterity 13. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Split movement before and after a weapon attack without exceeding Speed. |
| Shake It Off | 88 | `GENERAL` | Constitution 13, trained in Endurance. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Recover +1 CT in two swift actions instead of three. |
| Skill Focus | 88 | `GENERAL` | None; choose a trained skill. | 1 | `DESCRIPTION_PARTIAL_MISSING_SPECIAL` | Choose a trained skill for +5 competence; repeatable for different skills. |
| Skill Training | 88 | `GENERAL` | None; choose an untrained class skill. | 1 | `DESCRIPTION_PARTIAL_MISSING_REPEATABILITY` | Become trained in one untrained class skill; repeatable. |
| Sniper | 88 | `GENERAL` | Point Blank Shot, Precise Shot, base attack bonus +4. | 3 | `CANONICAL_TEXT_MATCHES_RULE` | Ignore creature-provided soft cover with ranged attacks. |
| Strong in the Force | 88 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Use d8s instead of d6s for Force Points added to attacks, skills, or ability checks. |
| Surgical Expertise | 88 | `GENERAL` | Trained in Treat Injury. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Perform surgery in 10 minutes. |
| Throw | 88 | `GENERAL` | Trip, base attack bonus +1. | 2 | `CANONICAL_TEXT_MATCHES_RULE` | Trip a grappled opponent to throw it prone up to 1 square beyond reach and deal unarmed damage. |
| Toughness | 88 | `GENERAL` | None. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Gain +1 HP per character level. |
| Trip | 88 | `GENERAL` | Base attack bonus +1. | 1 | `CANONICAL_BASE_TEXT_PRESENT_SPECIAL_REQUIRED` | Win a grapple to knock the target prone and end the grapple. |
| Triple Attack | 89 | `GENERAL` | Base attack bonus +11, Double Attack (chosen weapon), proficient with chosen weapon. | 2 | `PREREQUISITE_LINE_ERROR` | For a Double Attack weapon scope, Full Attack gains a third attack and another -5 penalty. |
| Triple Crit | 89 | `GENERAL` | Proficient with chosen weapon, base attack bonus +8. | 1 | `PREREQUISITE_AND_SPECIAL_RESTORE` | Choose a proficient weapon; its critical hits deal triple damage; repeatable for different weapons. |
| Vehicular Combat | 89 | `GENERAL` | Trained in Pilot. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Once per round, Pilot can negate a hit on your vehicle; you are proficient with pilot-operated vehicle weapons. |
| Weapon Finesse | 89 | `GENERAL` | Base attack bonus +1. | 1 | `CANONICAL_TEXT_MATCHES_RULE` | Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers. |
| Weapon Focus | 89 | `GENERAL` | Proficient with selected exotic weapon or weapon group. | 1 | `CANONICAL_BASE_TEXT_PRESENT_SPECIAL_REQUIRED` | Choose a proficient weapon/group for +1 attacks; repeatable for different selections. |
| Weapon Proficiency | 89 | `GENERAL` | None; choose a weapon group. | 1 | `DESCRIPTION_INCOMPLETE_GROUPED_CHOICE_RULE` | Choose a weapon group and become proficient with it; repeatable for other groups, while exotic weapons use Exotic Weapon Proficiency. |
| Whirlwind Attack | 89 | `GENERAL` | Dexterity 13, Intelligence 13, Melee Defense, base attack bonus +4. | 2 | `CANONICAL_ERRATA_MATCHES_RULE` | Full-round melee area attack against every target within reach using one attack roll. |

### Detailed rules and repository findings

#### Acrobatic Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Acrobatics.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** After tumbling to avoid an AoO, gain +2 competence on your next attack against that foe this turn.
- Official errata reduces the post-tumble bonus from the first-printing +5 to +2 competence.
- After successfully tumbling to avoid an attack of opportunity, gain +2 competence on your next attack against that foe before the end of your current turn.
- **Repository finding:** Current +2 rule is correct after official Core errata; do not restore the first-printing +5. Source provenance is wrong.
- **Provenance observation:** current `Galaxy at War p.23` -> canonical `Saga Edition Core Rulebook p.82` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `acrobatics`, `tumble`, `attack_bonus`, `errata`
- **Automation observation for later phase:** The existing +2 rider is source-correct after errata; later automation should prove foe-specific and end-of-turn scope.

#### Armor Proficiency (Heavy)

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Armor Proficiency (Light), Armor Proficiency (Medium).
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use heavy armor without nonproficiency penalties and gain its special equipment bonuses.
- Wear heavy armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses.
- **Repository finding:** Canonical chain is Light -> Medium -> Heavy. Current page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.85` -> canonical `Saga Edition Core Rulebook p.82` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `armor`, `proficiency`, `heavy_armor`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Armor Proficiency (Light)

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use light armor without nonproficiency penalties and gain its special equipment bonuses.
- Wear light armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses.
- **Repository finding:** Canonical source/page is Core p.82; current page is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.85` -> canonical `Saga Edition Core Rulebook p.82` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `armor`, `proficiency`, `light_armor`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Armor Proficiency (Medium)

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Armor Proficiency (Light).
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use medium armor without nonproficiency penalties and gain its special equipment bonuses.
- Wear medium armor without its nonproficiency attack/skill penalties and gain its special equipment bonuses.
- **Repository finding:** Canonical chain is Light -> Medium. Current page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.85` -> canonical `Saga Edition Core Rulebook p.82` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `armor`, `proficiency`, `medium_armor`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Bantha Rush

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13, base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** After a melee hit, push an eligible target 1 square in any direction.
- After a successful melee attack against a target no more than one size larger, move it 1 square in any direction as a free action.
- Cannot move a grabbed/grappled target, into a solid object, or into another creature's fighting space.
- **Repository finding:** Description is faithful; source is wrongly attributed to Galaxy at War.
- **Provenance observation:** current `Galaxy at War p.23` -> canonical `Saga Edition Core Rulebook p.82` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `forced_movement`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Burst Fire

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with heavy weapons, proficient with weapon used.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use autofire against one target at -5 for +2 damage dice; low Strength makes the penalty -10 with non-vehicle weapons.
- Official errata removes Strength 13 as a prerequisite.
- With an autofire-capable ranged weapon in autofire mode, make a single-target attack at -5 for +2 damage dice.
- Does not stack with Deadeye or Rapid Shot extra damage.
- Expends 5 shots and requires at least 5 shots remaining.
- If Strength is below 13, the attack penalty becomes -10 when using non-vehicle weapons.
- **Repository finding:** Current prerequisite metadata does not fully express the errata form; low-Strength handling is canonical, not contamination.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.82` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `autofire`, `damage`, `ammunition`, `errata`
- **Automation observation for later phase:** Later automation must preserve single-target autofire, five-shot spend, nonstacking, and the errata low-Strength/non-vehicle branch.

#### Careful Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot, base attack bonus +2.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Aim before a ranged attack to gain +1 attack.
- If you aim before a ranged attack, gain +1 on the attack roll.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.82` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `aim`, `attack_bonus`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Charging Fire

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +4.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Charge into a ranged attack: no charge attack bonus, but still take -2 Reflex.
- When charging, make a ranged attack instead of the normal melee attack at the end of movement.
- You gain no normal charge attack bonus, but still take the -2 Reflex Defense penalty.
- **Repository finding:** Description is faithful; source is wrongly attributed to Galaxy at War.
- **Provenance observation:** current `Galaxy at War p.24` -> canonical `Saga Edition Core Rulebook p.82` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `charge`, `ranged`, `reflex_penalty`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Cleave

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13, Power Attack.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Drop an opponent to 0 HP with melee to gain one immediate extra melee attack, once per round.
- When a melee attack reduces an opponent to 0 HP, immediately make one extra melee attack against another opponent within reach.
- Use the same weapon and attack bonus; usable once per round.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.85` -> canonical `Saga Edition Core Rulebook p.83` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `follow_up_attack`, `zero_hp`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Combat Reflexes

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain extra AoOs equal to Dexterity modifier and make AoOs while flat-footed.
- Gain additional attacks of opportunity per round equal to your Dexterity modifier.
- You may make attacks of opportunity while flat-footed.
- You still cannot make more than one attack of opportunity for the same provoking action.
- **Repository finding:** Canonical rules are source-certified; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.85` -> canonical `Saga Edition Core Rulebook p.83` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `attack_of_opportunity`, `reaction`, `dexterity`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Coordinated Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +2.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Automatically succeed on qualifying combat Aid Another checks at adjacent/point-blank range.
- Automatically succeed when using Aid Another to aid an ally's attack or suppress an enemy if the target is adjacent or within point-blank range.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.85` -> canonical `Saga Edition Core Rulebook p.83` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `aid_another`, `ally`, `suppression`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Crush

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Pin, base attack bonus +1.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** A successful Pin can immediately deal your unarmed/claw damage.
- After successfully pinning with a grapple attack, immediately deal bludgeoning damage equal to unarmed or claw damage, whichever is greater.
- **Repository finding:** Description is faithful; source is wrongly attributed to The Force Unleashed and the feat must not be typed as Force.
- **Provenance observation:** current `The Force Unleashed Campaign Guide p.34` -> canonical `Saga Edition Core Rulebook p.83` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `grapple`, `pin`, `damage`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Cybernetic Surgery

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Treat Injury.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Install cybernetics with a DC 20 Treat Injury procedure; self-install is harder and Surgical Expertise speeds it up.
- Install a cybernetic prosthesis/device on a living being with 1 hour of uninterrupted work and a DC 20 Treat Injury check.
- Failure does not install it; retry after another uninterrupted hour.
- Self-installation takes -5 on the check.
- Surgical Expertise reduces installation time to 10 minutes.
- **Repository finding:** Main procedure is represented; ensure the self-install penalty and Surgical Expertise timing remain in full player-facing text.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.83` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `cybernetics`, `treat_injury`, `procedure`, `downtime`
- **Automation observation for later phase:** This belongs to a cybernetics/procedure owner rather than passive modifier automation.

#### Deadeye

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot, Precise Shot, base attack bonus +4.
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Aim before a ranged hit to deal +1 weapon die; does not stack with Burst Fire or Rapid Shot.
- After aiming, a successful ranged attack deals +1 weapon die.
- Does not stack with Burst Fire or Rapid Shot extra damage.
- **Repository finding:** Core identity is wrongly sourced to Galaxy at War; preserve the nonstacking clause in full text.
- **Provenance observation:** current `Galaxy at War p.24` -> canonical `Saga Edition Core Rulebook p.84` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `aim`, `damage`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Dodge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Designate an opponent for +1 dodge Reflex against its attacks.
- During your turn designate an opponent; gain +1 dodge Reflex Defense against that opponent's attacks.
- You may designate a new opponent on any action.
- Lose dodge bonuses when you lose Dexterity bonus to Reflex; dodge bonuses stack.
- **Repository finding:** Description and exact source/page are correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.84` -> canonical `Saga Edition Core Rulebook p.84` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `defense`, `reflex_defense`, `dodge`, `target_choice`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Double Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +6, proficient with chosen weapon.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Choose a proficient weapon scope; Full Attack gains one extra attack at -5 to all attacks.
- Choose one exotic weapon or weapon group.
- With that choice, a Full Attack gains one additional attack.
- Take -5 on all attacks until your next turn.
- Repeatable; each selection applies to a different exotic weapon or weapon group.
- **Repository finding:** Current prerequisite line omits proficiency with the chosen weapon, although the description carries the qualification.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.84` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `full_attack`, `multiattack`, `weapon_choice`, `repeatable`
- **Automation observation for later phase:** Persistent selectedChoice scope and repeatability must remain canonical; do not model this as a generic universal extra attack.

#### Dreadful Rage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rage species trait, base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** While raging, increase the rage melee attack/damage bonus to +5.
- While raging, the rage bonus to melee attacks and melee damage becomes +5 instead of +2.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.84` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `rage`, `melee`, `attack_bonus`, `damage_bonus`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Dual Weapon Mastery I

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13, base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Reduce two-weapon/double-weapon Full Attack penalty to -5.
- When full-attacking with two weapons or both ends of a double weapon, take -5 instead of -10 on all attacks until the start of your next turn.
- Benefit applies only with weapons you are proficient with.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.84` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `dual_wield`, `full_attack`, `multiattack`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Dual Weapon Mastery II

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 15, Dual Weapon Mastery I, base attack bonus +6.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Reduce two-weapon/double-weapon Full Attack penalty to -2.
- Reduce the two-weapon/double-weapon Full Attack penalty to -2 instead of -10, with proficient weapons.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.84` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `dual_wield`, `full_attack`, `multiattack`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Dual Weapon Mastery III

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 17, Dual Weapon Mastery I, Dual Weapon Mastery II, base attack bonus +11.
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Eliminate two-weapon/double-weapon Full Attack penalties.
- Take no attack penalty when full-attacking with two weapons or both ends of a double weapon, provided you are proficient with them.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.84` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `dual_wield`, `full_attack`, `multiattack`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Exotic Weapon Proficiency

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Become proficient with one chosen exotic weapon; repeatable for other exotic weapons.
- Choose one exotic weapon; make attacks with it without the normal -5 nonproficiency penalty.
- Repeatable for a different exotic weapon each time.
- **Repository finding:** Ensure the repeatable single-exotic-weapon scope remains in full canonical text.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.84` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `weapon`, `proficiency`, `exotic_weapon`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Extra Rage

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Rage species trait.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain one additional Rage use per day; repeatable.
- Rage one additional time per day.
- Repeatable; each selection grants one additional daily use.
- **Repository finding:** Current short description preserves the extra daily use but not the published repeatability clause.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `rage`, `resource`, `daily`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Extra Second Wind

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Endurance.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain another second wind per day; normal encounter limit still applies unless another rule changes it.
- Gain one additional second wind per day, while retaining the normal one-second-wind-per-encounter limit.
- A nonheroic character taking this feat for the first time gains one second wind per day.
- Repeatable; each selection adds another daily second wind.
- **Repository finding:** Current short text omits published encounter-limit, nonheroic, and repeatability clauses.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `second_wind`, `recovery`, `daily`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Far Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Reduce ranged distance penalties by one range category.
- Treat short, medium, and long range as one category closer for ranged attack penalties: 0 at short, -2 at medium, -5 at long.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `range`, `attack_penalty`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Force Boon

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Force Sensitivity.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain 3 additional Force Points each level.
- Gain three additional Force Points at each level.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.94` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force`, `force_point`, `resource`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Force Sensitivity

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Cannot be a droid.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Unlock Use the Force and access to Force talents.
- You may make Use the Force checks and Use the Force becomes a class skill.
- Whenever you gain a talent, you may choose a Force talent instead if you meet its prerequisites.
- **Repository finding:** Canonical prerequisite is the non-droid gate; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force`, `use_the_force`, `progression`, `talent_access`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Force Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Force Sensitivity, trained in Use the Force.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain 1 + Wisdom modifier Force powers per selection; permanent Wisdom increases grant one extra power per Force Training feat.
- Gain Force powers equal to 1 + Wisdom modifier, minimum 1; duplicate powers are allowed.
- Official errata: every additional Force Training selection also grants 1 + Wisdom modifier powers.
- If Wisdom modifier permanently increases, immediately gain powers equal to the number of Force Training feats you possess.
- **Repository finding:** Current short description preserves the initial grant but must include repeatability, the official 1 + Wisdom erratum, and permanent-Wisdom clause.
- **Provenance observation:** current `Saga Edition Core Rulebook p.94` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force`, `force_power`, `progression`, `repeatable`, `errata`
- **Automation observation for later phase:** This is primarily progression/Force-suite authority, not a passive combat modifier.

#### Great Cleave

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13, Power Attack, Cleave, base attack bonus +4.
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use Cleave any number of times per round when its trigger occurs.
- Use Cleave with no per-round limit.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `cleave`, `follow_up_attack`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Improved Charge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13, Dodge, Mobility.
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Charge around obstacles instead of only in a straight line.
- Charge without moving in a straight line and change direction to avoid obstacles; all other charge rules still apply.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `charge`, `movement`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Improved Defenses

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +1 to all three defenses.
- Gain +1 Reflex, +1 Fortitude, and +1 Will Defense.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `reflex_defense`, `fortitude`, `will_defense`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Improved Disarm

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Intelligence 13, Melee Defense.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +5 to melee disarm and prevent the normal failed-disarm counterattack.
- Gain +5 on melee attack rolls to disarm.
- If your disarm attempt fails, the opponent does not receive the normal free counterattack.
- **Repository finding:** Description is faithful; taxonomy must not classify this as Force.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.85` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `maneuver`, `disarm`, `melee`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Improved Damage Threshold

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Increase Damage Threshold by 5; repeatable and stacking.
- Increase Damage Threshold by 5.
- Repeatable; effects stack, adding +5 each time.
- **Repository finding:** Current short description omits the published repeatable/stacking Special.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.86` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `defense`, `damage_threshold`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Linguist

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Intelligence 13.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain 1 + Intelligence bonus languages; repeatable.
- Gain bonus languages equal to 1 + Intelligence bonus, minimum 1.
- Repeatable; each selection grants that many additional languages again.
- **Repository finding:** Current short description omits repeatability.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.86` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `language`, `progression`, `intelligence`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Martial Arts I

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Increase unarmed damage one die step and gain +1 dodge Reflex.
- Increase unarmed damage by one die step.
- Gain +1 dodge Reflex Defense.
- General combat rules also let a character with Martial Arts I threaten/make attacks of opportunity while unarmed.
- **Repository finding:** The feat entry itself gives damage and dodge; unarmed AoO behavior is a separate Core combat-rule interaction and should not be mistaken for extra feat-entry text.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.86` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `unarmed`, `damage`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Martial Arts II

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Martial Arts I, base attack bonus +3.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Increase unarmed damage another die step and gain another +1 dodge Reflex.
- Increase unarmed damage one additional die step.
- Gain another +1 dodge Reflex Defense, stacking with Martial Arts I.
- **Repository finding:** Description is faithful; exact source/page is correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.86` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `unarmed`, `damage`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Martial Arts III

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Martial Arts I, Martial Arts II, base attack bonus +6.
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Increase unarmed damage another die step and gain another +1 dodge Reflex.
- Increase unarmed damage one additional die step, up to the printed progression.
- Gain another +1 dodge Reflex Defense, stacking with Martial Arts I and II.
- **Repository finding:** Description is faithful; exact source/page is correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.86` -> canonical `Saga Edition Core Rulebook p.86` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `unarmed`, `damage`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Melee Defense

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Intelligence 13.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Trade up to 5 melee attack bonus for equal dodge Reflex until next turn.
- When using a standard action for a melee attack, take an attack penalty up to -5 and add the same amount as dodge Reflex Defense.
- The chosen amount cannot exceed base attack bonus and lasts until the start of your next turn.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.86` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `attack_tradeoff`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Mighty Swing

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Spend two swift actions for +1 damage die on your next melee attack this round; does not stack with Rapid Strike.
- Spend two swift actions in the same round to add +1 damage die to your next melee attack that round.
- Does not stack with Rapid Strike extra damage.
- **Repository finding:** Core identity is wrongly sourced to Galaxy at War; preserve the Rapid Strike nonstacking clause.
- **Provenance observation:** current `Galaxy at War p.26` -> canonical `Saga Edition Core Rulebook p.86` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `swift_action`, `damage`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Mobility

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13, Dodge.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +5 dodge Reflex against movement-triggered AoOs.
- Gain +5 dodge Reflex Defense against attacks of opportunity caused by moving into or out of threatened areas.
- Lose dodge bonuses when denied Dexterity bonus to Reflex; dodge bonuses stack.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.86` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `movement`, `attack_of_opportunity`, `reflex_defense`, `dodge`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Pin

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Win a grapple to pin the target until your next turn, preventing actions and denying Dexterity to Reflex.
- After winning the grapple attack/opposed grapple, pin the opponent until the start of your next turn.
- Pinned target cannot move or act and loses Dexterity bonus to Reflex.
- Cannot use Pin and Trip during the same round; Pin and Crush can be used together.
- **Repository finding:** Full player-facing text should retain the Pin/Trip incompatibility and Pin/Crush compatibility.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.87` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `grapple`, `pin`, `immobilize`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Point-Blank Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +1 ranged attack and damage within point-blank range.
- Gain +1 on ranged attack and damage rolls against targets within point-blank range.
- **Repository finding:** Description and exact source/page are correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.87` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `ranged`, `attack_bonus`, `damage_bonus`, `range`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Power Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Strength 13.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Trade melee attack for damage up to BAB; two-handed use doubles the damage gain; no bonus damage against objects/vehicles.
- Before attacking, choose a value up to base attack bonus; subtract it from all melee attacks and add it to all melee damage until your next turn.
- With a two-handed weapon, or one-handed weapon wielded in two hands, add twice the chosen value to damage.
- The Power Attack bonus cannot be added to damage against objects or vehicles.
- **Repository finding:** Current short rule preserves the basic trade but omits the two-handed doubling and object/vehicle exclusion.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.87` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `attack_tradeoff`, `damage`
- **Automation observation for later phase:** Existing metadata has historically included a max 5 cap; source maximum is base attack bonus and must be certified during automation.

#### Powerful Charge

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Medium or larger size, base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Charge for an extra +2 melee attack and +half-level damage.
- When charging, gain an additional +2 melee attack; on a hit add damage equal to one-half your level.
- **Repository finding:** Description and exact source/page are correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.87` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `charge`, `melee`, `attack_bonus`, `damage`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Precise Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Ignore the -5 penalty for ranged attacks into melee.
- Ignore the normal -5 penalty for shooting/throwing a ranged weapon at an opponent engaged in melee with one or more allies.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.87` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `shooting_into_melee`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Quick Draw

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Draw or holster a weapon as a swift action.
- Draw or holster a weapon as a swift action instead of a move action.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.87` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `weapon`, `action_economy`, `swift_action`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Rapid Shot

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1, proficient with weapon used.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Make a proficient ranged attack at -2 for +1 damage die; low Strength makes it -5 with non-vehicle weapons.
- Official errata removes Strength 13 as a prerequisite.
- With a proficient ranged weapon, make two shots as one attack at -2; on success deal +1 damage die.
- Consumes two shots and requires sufficient ammunition.
- Does not stack with Burst Fire or Deadeye extra damage.
- If Strength is below 13, the attack penalty becomes -5 with non-vehicle weapons.
- **Repository finding:** Current prerequisite line omits proficiency with the weapon used; official errata removes Strength as a prerequisite and adds the low-Strength penalty branch.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.88` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `ranged`, `damage`, `ammunition`, `errata`
- **Automation observation for later phase:** Runtime already has a low-Strength branch in current audits; later certification must prove non-vehicle scope and nonstacking.

#### Rapid Strike

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1, proficient with weapon used.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Make a proficient melee attack at -2 for +1 damage die; low Dexterity makes it -5 with non-light weapons.
- Official errata removes Dexterity 13 as a prerequisite.
- With a proficient melee weapon, make two strikes as one attack at -2; on success deal +1 damage die.
- Does not stack with Mighty Swing extra damage.
- If Dexterity is below 13, the attack penalty becomes -5 with non-light weapons.
- **Repository finding:** Current prerequisite line omits proficiency with the weapon used; official errata removes Dexterity as a prerequisite and adds the low-Dexterity/non-light penalty branch.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.88` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `melee`, `damage`, `errata`
- **Automation observation for later phase:** Later automation must prove the non-light weapon gate and Mighty Swing nonstacking.

#### Running Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Split movement before and after a weapon attack without exceeding Speed.
- When making a melee or ranged weapon attack, move both before and after it as long as total movement does not exceed speed.
- **Repository finding:** Description and exact source/page are correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.88` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `combat`, `movement`, `attack`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Shake It Off

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Constitution 13, trained in Endurance.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Recover +1 CT in two swift actions instead of three.
- Spend two swift actions instead of three to move +1 step on the condition track.
- **Repository finding:** Description is faithful; current page is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.88` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `recovery`, `condition_track`, `swift_action`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Skill Focus

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None; choose a trained skill.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Choose a trained skill for +5 competence; repeatable for different skills.
- Choose one trained skill and gain +5 competence on checks with it.
- Repeatable for a different trained skill; effects do not stack on the same skill.
- **Repository finding:** Current short description should retain repeatability and nonstacking.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.88` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `skill`, `competence_bonus`, `choice`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Skill Training

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None; choose an untrained class skill.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Become trained in one untrained class skill; repeatable.
- Choose one untrained class skill and become trained in it.
- Repeatable for a different class skill each time.
- **Repository finding:** Current short description omits repeatability.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.88` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `skill`, `training`, `choice`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Sniper

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Point Blank Shot, Precise Shot, base attack bonus +4.
- **Tier observation:** Tier 3 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Ignore creature-provided soft cover with ranged attacks.
- Always ignore soft cover from characters, creatures, or droids on ranged attacks.
- **Repository finding:** Description is faithful; source is wrongly attributed to Galaxy at War.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Saga Edition Core Rulebook p.88` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `ranged`, `soft_cover`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Strong in the Force

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use d8s instead of d6s for Force Points added to attacks, skills, or ability checks.
- When spending a Force Point to adjust an attack roll, skill check, or ability check, roll d8s instead of d6s.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.88` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `force`, `force_point`, `die_upgrade`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Surgical Expertise

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Treat Injury.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Perform surgery in 10 minutes.
- Perform surgery in 10 minutes instead of the normal 1 hour.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.88` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `treat_injury`, `surgery`, `time_reduction`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Throw

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trip, base attack bonus +1.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Trip a grappled opponent to throw it prone up to 1 square beyond reach and deal unarmed damage.
- After successfully tripping an opponent with a grapple attack, place it prone in an unoccupied space up to 1 square beyond your reach.
- Deal bludgeoning damage equal to your unarmed damage and end the grapple.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.88` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `grapple`, `trip`, `forced_movement`, `damage`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Toughness

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Gain +1 HP per character level.
- Gain +1 HP per character level.
- **Repository finding:** Description and exact source/page are correct.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.88` (`EXACT_MATCH`).
- **Tag candidates for later phase:** `hit_points`, `durability`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Trip

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Win a grapple to knock the target prone and end the grapple.
- After winning a grapple attack/opposed grapple, target falls prone in its space and is no longer grappled.
- Cannot use Pin and Trip during the same round.
- **Repository finding:** Full text should retain the Pin/Trip incompatibility.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.88` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `grapple`, `trip`, `prone`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Triple Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +11, Double Attack (chosen weapon), proficient with chosen weapon.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** For a Double Attack weapon scope, Full Attack gains a third attack and another -5 penalty.
- Choose an exotic weapon or weapon group for which you have Double Attack.
- Full Attack gains one additional attack and another -5 penalty; both stack with Double Attack.
- Repeatable for different exotic weapons/weapon groups.
- **Repository finding:** Current prerequisite line omits proficiency with the chosen weapon.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.89` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `full_attack`, `multiattack`, `weapon_choice`, `repeatable`
- **Automation observation for later phase:** Must preserve selected weapon scope and interaction with Double Attack.

#### Triple Crit

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with chosen weapon, base attack bonus +8.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Choose a proficient weapon; its critical hits deal triple damage; repeatable for different weapons.
- Choose one weapon, including unarmed attack if desired.
- Critical hits with the selected weapon deal triple damage instead of double.
- Repeatable for different weapons; effects do not stack.
- **Repository finding:** Current prerequisite line omits proficiency with the chosen weapon; full text should retain repeatability/nonstacking. Source is wrongly attributed to Galaxy at War.
- **Provenance observation:** current `Galaxy at War p.27` -> canonical `Saga Edition Core Rulebook p.89` (`SOURCE_PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `critical`, `weapon_choice`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Vehicular Combat

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Trained in Pilot.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Once per round, Pilot can negate a hit on your vehicle; you are proficient with pilot-operated vehicle weapons.
- Once per round as a reaction while piloting a vehicle/starship, negate a weapon hit with Pilot vs the triggering attack roll.
- While piloting, count as proficient with pilot-operated vehicle weapons.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.89` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `vehicle`, `pilot`, `reaction`, `attack_negation`, `proficiency`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Weapon Finesse

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Base attack bonus +1.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Use Dexterity instead of Strength for attacks with light melee weapons and lightsabers.
- With a light melee weapon or lightsaber, use Dexterity modifier instead of Strength modifier on attack rolls.
- **Repository finding:** Description is faithful; page metadata is wrong.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.89` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `dexterity`, `attack`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Weapon Focus

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Proficient with selected exotic weapon or weapon group.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Choose a proficient weapon/group for +1 attacks; repeatable for different selections.
- Choose one exotic weapon or weapon group, including unarmed strike or grapple if desired, and gain +1 attacks with it.
- Repeatable for different selections; effects do not stack on the same selection.
- **Repository finding:** Full text should retain unarmed/grapple choice permission and repeatability/nonstacking.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.89` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `weapon_choice`, `attack_bonus`, `repeatable`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

#### Weapon Proficiency

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** None; choose a weapon group.
- **Tier observation:** Tier 1 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Choose a weapon group and become proficient with it; repeatable for other groups, while exotic weapons use Exotic Weapon Proficiency.
- Choose advanced melee weapons, heavy weapons, lightsabers, pistols, rifles, or simple weapons; become proficient with all weapons in that group.
- Normally nonproficiency gives -5 attacks.
- Repeatable for a different weapon group each time.
- Exotic weapons are not a valid group choice; use Exotic Weapon Proficiency for a specific exotic weapon.
- **Repository finding:** Current short description is insufficient for the canonical grouped-choice feat. The six per-scope records are implementation derivatives, not six published identities.
- **Provenance observation:** current `Saga Edition Core Rulebook p.87` -> canonical `Saga Edition Core Rulebook p.89` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `weapon`, `proficiency`, `weapon_group`, `choice`, `repeatable`
- **Automation observation for later phase:** Production architecture should remain one canonical Weapon Proficiency identity plus persistent selectedChoice/migration compatibility.

#### Whirlwind Attack

- **Publication category:** `GENERAL`
- **Canonical prerequisites:** Dexterity 13, Intelligence 13, Melee Defense, base attack bonus +4.
- **Tier observation:** Tier 2 under the prerequisite-depth model; not yet prerequisite-phase certified.
- **Canonical quick summary:** Full-round melee area attack against every target within reach using one attack roll.
- As a full-round action, make one melee area attack roll and apply it against every target within your reach.
- Official errata changes the first-printing word 'opponent' to 'target'.
- **Repository finding:** Use the errata 'target' wording rather than narrowing the attack to opponents only.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Core Rulebook p.89` (`PAGE_ERROR`).
- **Tag candidates for later phase:** `combat`, `melee`, `area_attack`, `full_round_action`, `errata`
- **Automation observation for later phase:** Defer exact runtime certification to the AUTOMATION phase.

---

## Official Web Sources - Web Enhancements / Official Web Rules

Full feat publications: **3**; canonical identity contribution: **3**.

- The official-web pass contributes three canonical identities: Tech Specialist, Dreadful Countenance, and Rapid Assault.
- Tech Specialist's primary publication is the 2007 Web Enhancement; Starships p.21 is the same identity as a full reprint.
- Dreadful Countenance is an official Wizards web-article feat and should use article-level provenance rather than Web Enhancements p.1.
- Rapid Assault is an official optional-rule feat with FAQ locator E2 and must remain distinguishable from mandatory rules.
- Both Dreadful Countenance and Rapid Assault have mechanically faithful long descriptions but weak flavor-only short summaries.
- Dreadful Countenance runtime matching is too broad if ordinary Intimidate checks qualify without fear-effect context.
- Rapid Assault runtime representations must be reconciled to exactly two attacks as a Standard Action for one Force Point, preserving normal multiattack penalties.

### Web feat findings

| Feat | Locator | Rule status | Prerequisites | Tier obs. | Content status | Quick summary |
|---|---|---|---|---:|---|---|
| Tech Specialist | page 3 of 7 | `OFFICIAL` | Trained in Mechanics. | 1 | `CANONICAL_BASE_TEXT_PRESENT` | Use Mechanics and downtime to install one canonical Tech Specialist modification on equipment, droids, or vehicles. |
| Dreadful Countenance | web article; archived rendering page 4 of 4 | `OFFICIAL_WEB_ARTICLE` | Charisma 13, member of the Sith tradition. | 1 | `CANONICAL_TEXT_MATCHES_RULE_SUMMARY_NEEDS_MECHANICAL_REWRITE` | Reroll Persuasion or Use the Force checks used to activate fear effects, but keep the reroll even if worse. |
| Rapid Assault | E2 | `OFFICIAL_OPTIONAL_RULE` | Double Attack or Dual Weapon Mastery I, base attack bonus +6. | 2 | `CANONICAL_TEXT_MATCHES_RULE_SUMMARY_NEEDS_MECHANICAL_REWRITE` | Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties. |

### Detailed web rules and repository findings

#### Tech Specialist

- **Rule status:** `OFFICIAL`
- **Canonical prerequisites:** Trained in Mechanics.
- **Tier observation:** Tier 1.
- **Canonical quick summary:** Use Mechanics and downtime to install one canonical Tech Specialist modification on equipment, droids, or vehicles.
- Modify a device, armor, weapon, droid, or vehicle with one special trait unless otherwise noted.
- Normally only one Tech Specialist benefit may be applied to an item, and the same benefit cannot be applied more than once.
- Modification cost is one-tenth item cost or 1,000 credits, whichever is greater; work takes 1 day per 1,000 credits of modification cost.
- DC 20 Mechanics; cannot Take 10 or Take 20; failure loses the spent credits.
- Assistants can reduce work time and use Aid Another on the final check.
- Modified market value increases by the base item price plus twice the modification cost.
- Nobles and scoundrels may select Tech Specialist as a bonus feat.
- Trait tables cover armor, devices, droids, vehicles, and weapons, including Selective Fire's printed restrictions.
- **Repository finding:** Current repo incorrectly lists Core p.88 as primary provenance. Starships p.21 is a full reprint of this Web Enhancement identity, not a second feat.
- **Provenance observation:** current `Saga Edition Core Rulebook p.88` -> canonical `Saga Edition Web Enhancement 1: The Tech Specialist` / `page 3 of 7` (`PRIMARY_SOURCE_AND_PAGE_ERROR`).
- **Automation observation for later phase:** A customization service exists, but current audits do not certify the complete cost/time/check/assistance/resale procedure or every trait's runtime behavior.

#### Dreadful Countenance

- **Rule status:** `OFFICIAL_WEB_ARTICLE`
- **Canonical prerequisites:** Charisma 13, member of the Sith tradition.
- **Tier observation:** Tier 1.
- **Canonical quick summary:** Reroll Persuasion or Use the Force checks used to activate fear effects, but keep the reroll even if worse.
- Whenever you make a Persuasion check or Use the Force check to activate a fear effect, you may reroll the check.
- You must accept the reroll result even if it is worse.
- **Repository finding:** Full description is faithful, but the current flavor-only summary does not tell the player what the feat does.
- **Provenance observation:** current `Web Enhancements p.1` -> canonical `Behind the Threat: The Sith, Part 2 - The Becoming` / `web article; archived rendering page 4 of 4` (`SOURCE_FAMILY_MATCH_LOCATOR_NORMALIZATION_REQUIRED`).
- **Automation observation for later phase:** Current consumed Persuasion reroll matching is too broad because it can key on ordinary Intimidate labels. Canon requires fear-effect context; the reroll must keep the second result.

#### Rapid Assault

- **Rule status:** `OFFICIAL_OPTIONAL_RULE`
- **Canonical prerequisites:** Double Attack or Dual Weapon Mastery I, base attack bonus +6.
- **Tier observation:** Tier 2.
- **Canonical quick summary:** Spend a Force Point to make exactly two attacks as a standard action using a qualifying two-weapon or Double Attack setup, with normal multiattack penalties.
- While wielding two weapons, or a weapon with which you can use Double Attack, spend a Force Point to make exactly two attacks as a standard action.
- Normal penalties for two-weapon fighting or Double Attack still apply.
- You cannot make more than two attacks through Rapid Assault regardless of how many attacks your normal Full Attack could produce.
- This is an official optional rule, not a mandatory Core rule.
- **Repository finding:** Full description is faithful; current flavor-only summary is inadequate. Preserve OFFICIAL_OPTIONAL_RULE status.
- **Provenance observation:** current `Web Enhancements p.1` -> canonical `Saga Edition FAQ - Official Optional Rules` / `E2` (`SOURCE_FAMILY_MATCH_LOCATOR_NORMALIZATION_REQUIRED`).
- **Automation observation for later phase:** Existing runtime metadata has conflicting 'full attack after movement' representations. Canon is exactly two attacks as a Standard Action for one Force Point with normal penalties; source-specific Unknown Regions ownership is wrong.

---

## CONTENT sub-phase closed

- **355** full feat publications reviewed.
- **353** canonical feat identities.
- **352** unique normalized display names.
- **2** confirmed full reprints.
- Repo baseline: **390** records = **351** canonical identities represented + **6** implementation derivatives + **33** noncanonical/wrong-domain/legacy records, with **2** canonical identities still missing.

### Retained source conflicts

- **Pinpoint Accuracy** - Scavenger's Guide to Droids: `SOURCE_INTERNAL_CONFLICT`
- **Power Blast** - Knights of the Old Republic Campaign Guide: `SOURCE_INTERNAL_CONFLICT`
- **Tumble Defense** - Knights of the Old Republic Campaign Guide: `SOURCE_INTERNAL_CONFLICT_AND_PREREQUISITE_LINE_ERROR`
- **Withdrawal Strike** - Knights of the Old Republic Campaign Guide: `SOURCE_INTERNAL_CONFLICT`
- **Informer** - The Force Unleashed Campaign Guide: `SOURCE_INTERNAL_CONFLICT`
- **Rapport** - The Force Unleashed Campaign Guide: `SOURCE_INTERNAL_CONFLICT`
- **Strafe** - The Force Unleashed Campaign Guide: `SOURCE_INTERNAL_CONFLICT_AND_SUMMARY_ERROR`
- **Expert Briber** - Galaxy of Intrigue: `DESCRIPTION_ERROR_SOURCE_INTERNAL_CONFLICT`
- **Recurring Success** - Galaxy of Intrigue: `DESCRIPTION_PARTIAL_SOURCE_EDITORIAL_ERROR`
- **Deadly Sniper** - Scum and Villainy: `SOURCE_INTERNAL_CONFLICT_DETAILED_RULE_PREFERRED`
- **Resurgence** - Scum and Villainy: `SOURCE_INTERNAL_CONFLICT_DETAILED_RULE_PREFERRED`
- **Staggering Attack** - Scum and Villainy: `MISSING_CANONICAL_REPO_RECORD_SOURCE_WORDING_TENSION`

### Authority corrections to back-propagate

- Clone Wars Campaign Guide feat-definition page map must be repaired from the old Phase 0 p.20-29 map to the directly verified printed pp.28-29 and 31-32, with summary table on p.30.
- The Force Unleashed feat count is 21, not the older 20-feat table-derived count; Natural Leader is a full feat on p.34 despite omission from the printed feat table.
- Core official errata must supersede first-printing feat text where listed in the Core source authority.

**Production mutation remains unauthorized by this rolling audit.** The next phase is **PROVENANCE**: normalize first-source/page/locator/reprint authority and reconcile the repo against this completed content authority.
