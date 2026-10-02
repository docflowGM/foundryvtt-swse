# Phase 12 — Canonical Talent Semantic Tag Authority

## Status

FINAL_FOR_EXECUTION — OWNER-AUTHORIZED (Phase 12-1 orphan scope only)

The repository owner authorized execution of the completed Phase 12-1 design on 2026-10-02. QA3 plus the 11-record global-QA reconciliation (see the final section; this file plus data/audits/talent-phase-12-1-semantic-tag-authority.json) is the final Phase 12-1 semantic payload and supersedes every earlier Phase 12-1 draft. Execution covers the 309 CERTIFIED assignments only; the two deferred records (UR-022, GOI-002) and the 876 non-orphan talents (Phase 12-2) are out of scope. The body below is the supplied QA3 text, unchanged; statements elsewhere that execution is disabled are historical.

This is the single rolling human-readable authority for Phase 12. It will be updated through every Phase 12-1 and Phase 12-3 batch. Do not create per-book replacement documents. The paired JSON file is the machine execution manifest.

## Frozen baseline

• Canonical talents: 1,187
• Phase 12 orphan census: 311
• Remaining non-orphans for Phase 12-2: 876
• Surviving Phase 11 tag vocabulary: 184 strings
• Talent pack baseline SHA: 6fe0b15020d4c723cb04d506ae8f7c5f4868b33c

## Binding Phase 12 source policy

1. Use the uploaded DJVU/TXT source as the first canonical-reading layer.
2. Escalate to the corresponding PDF only when the TXT is absent, clipped, malformed, or materially ambiguous.
3. Record whether each ruling was TXT_VERIFIED or PDF_VERIFIED.
4. Existing canonical repository benefit/description text can orient the review, but sourcebook text controls semantic adjudication.

## Binding tagging policy

• Use the 184 tags that survived Phase 11 pruning first.
• Assign the complete justified semantic/mechanical/scope/play-behavior tag set. Do not add tags merely to increase tag count.
• One tag is acceptable only when that one concept genuinely represents the talent.
• Talent tree, class, prestige class, sourcebook, category, archetype, and organization identity are not semantic evidence.
• If the existing vocabulary cannot accurately express the talent, do not force a weak approximation. Put the talent in the unresolved bucket for later designer adjudication.
• No new tag is authorized by a batch review alone. New concepts require an explicit later owner/system-designer ruling.

## Claude execution contract

Claude makes no tagging decisions. This rolling file is not executable until it is explicitly marked FINAL_FOR_EXECUTION. At that point Claude must:

1. Read this Markdown and the paired JSON manifest.
2. Mutate only canonical talents explicitly listed with status CERTIFIED.
3. Set system.tags to the JSON finalTags array exactly.
4. Do not infer, add, remove, substitute, normalize, reorder by preference, or otherwise reinterpret tags.
5. Do not mutate entries in unresolvedTagConcepts.
6. Validate IDs/names/sourcebooks before mutation and stop on any identity mismatch.
7. Produce a dry-run report before writing production data.

────────

## Phase 12-1A — Unknown Regions

• Orphans reviewed: 47
• TXT verified: 47
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 46
• Deferred vocabulary gaps: 1

UR-001 — Arrogant Bluster

• Canonical ID: 16d615430294378b · Page: 19 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, control, will_defense, mind-affecting, force_point_spend, resource_spend
• Rationale: Persuasion-based social control that lowers Will Defense; optional Force Point extends duration.

UR-002 — Band Together

• Canonical ID: 03123bd5c86beaa0 · Page: 19 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, leadership, target-designation, damage_bonus, will_defense, persuasion, social, mind-affecting, control, swift_action, action_economy, once-per-encounter, sustained_damage
• Rationale: Three once-per-encounter leadership/support modes: designate a damage target, bolster allied Will, or recruit/direct a temporary ally.

UR-003 — Sense Primal Force

• Canonical ID: a1355dcae60772f5 · Page: 19 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, senses, perception, detection, recon, exploration, nature
• Rationale: Expands Force-based Sense Surroundings in natural wilderness to detect targets through line-of-sight limits.

UR-004 — Coordinated Leadership

• Canonical ID: c349d17c69af3681 · Page: 20 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: leadership, ally_support, support, teamwork, empowerment
• Rationale: Improves one Leadership talent so its granted bonuses stack with allied bonuses.

UR-005 — Oafish

• Canonical ID: 6e57387d51372de7 · Page: 20 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: deception, persuasion, social, skills, reliability, once-per-encounter
• Rationale: Once per encounter salvages a failed Deception or Persuasion check by adding a bonus.

UR-006 — Outsider’s Query

• Canonical ID: d554c045a75af1a3 · Page: 20 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, skills, reliability
• Rationale: Mitigates a failed attitude-change check and grants an additional Persuasion attempt.

UR-007 — Rant

• Canonical ID: 450d2fd8991be551 · Page: 20 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, intimidation, social, control, battlefield_control, ally_support, support, teamwork, action_economy, move_action, reaction
• Rationale: Successful intimidation denies an enemy move action and immediately grants an ally a move action as a reaction.

UR-008 — Self-Reliant

• Canonical ID: 8e0f2208941073d9 · Page: 20 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: support, empowerment, once-per-encounter
• Rationale: Once per encounter converts an Inspiration talent that normally supports others into self-support.

UR-009 — Wary

• Canonical ID: 5d9cd611ff499100 · Page: 20 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: awareness, perception, stealth, deception, ambush_defense, reaction, move_action, action_economy, mobility
• Rationale: Detecting failed enemy Stealth/Deception grants immediate reactive movement.

UR-010 — Deep Space Raider

• Canonical ID: 696f7eed2cc08299 · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, space, ranged, mobility, positioning, control, battlefield_control, pursuit, shields, action_economy, once-per-encounter
• Rationale: Vehicle/starship raiding package: force reposition/disengage, fire while escaping, and disable vehicle systems.

UR-011 — Extended Ambush

• Canonical ID: 62320a2cbed97211 · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ambush, surprise_round, ranged, sniper, targeting, precision, action_economy, setup
• Rationale: During a surprise round, converts aiming into a free setup for a ranged attack against a surprised target.

UR-012 — Piercing Hit

• Canonical ID: c08976a5f4ab88d8 · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, ranged, armor, control, battlefield_control, concealment, mobility, positioning, standard_action, once-per-encounter, action_economy
• Rationale: Three once-per-encounter attack modes compromise armor/flat-foot the target, impair attacks and vision, or reduce speed.

UR-013 — Quicktrap

• Canonical ID: d620ea6e88436467 · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: trap, mechanics, skills, action_economy, move_action
• Rationale: Speeds Tripwire setup from a standard action to a move action.

UR-014 — Silent Movement

• Canonical ID: 084f71defa56162a · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: stealth, skills, mobility, exploration, ally_support, support, teamwork, reliability
• Rationale: Removes environmental noise penalties from Stealth and provides automatic aid to an ally’s Stealth check.

UR-015 — Speedclimber

• Canonical ID: bfb04c89df257f8b · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, mobility, exploration
• Rationale: Removes the penalty for accelerated climbing.

UR-016 — Surprisingly Quick

• Canonical ID: b65f65bc442fd695 · Page: 21 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: surprise_round, ambush_defense, initiative, swift_action, action_economy
• Rationale: Adds a swift action during the surprise round, even when surprised.

UR-017 — Battle Mount

• Canonical ID: f557b3331b5158c8 · Page: 22 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: mount, ride, rider, cover, defense, mobility, positioning, swift_action, action_economy, once-per-encounter
• Rationale: Mounted-combat package improves cover and lets rider or mount attack under compressed action timing.

UR-018 — Mechanized Rider

• Canonical ID: 93b73db64423a7a3 · Page: 22 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, ride, rider, mobility, cover, skills
• Rationale: Extends Ride applications to speeder bikes/swoops using Pilot/Ride expertise.

UR-019 — Terrain Guidance

• Canonical ID: 598c2b9b9bb1136f · Page: 22 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: mount, ride, rider, mobility, exploration, skills, swift_action, action_economy
• Rationale: Swift Ride check lets a mount ignore difficult-terrain speed loss.

UR-020 — Champion

• Canonical ID: a7aea0411eb4fbc0 · Page: 23 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, recovery, condition_removal, resilience, survivability, fear, mind-affecting, damage_threshold, control, melee, unarmed, burst_damage, scaling, precision, healing
• Rationale: Three champion modes improve second-wind recovery, convert threshold damage into a disarm, or scale melee/unarmed damage from attack margin.

UR-021 — Out of Harm’s Way

• Canonical ID: 1946e16d1e6c831c · Page: 23 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, ally_support, support, teamwork, mobility, positioning, evasion, survivability, action_economy
• Rationale: Reactive ally-protection repositioning swaps protector and protected ally without provoking.

UR-023 — Simple Opportunity

• Canonical ID: 7ca8719e6fdf7a2a · Page: 23 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: attack_of_opportunity, ranged, positioning, battlefield_control, overwatch
• Rationale: Allows ranged/thrown simple weapons to make attacks of opportunity and therefore exert ranged threat/control.

UR-024 — Warrior’s Determination

• Canonical ID: ad08d7ea0c5e859e · Page: 23 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, reaction, defense, resilience, survivability, will_defense, mind-affecting, force_point_spend, resource_spend, action_economy
• Rationale: Reactive resistance ignores a non-Force effect that beats Will; Force Point extends protection to mind-affecting Force effects.

UR-025 — Familiar Enemies

• Canonical ID: d20ee3d5e6b8e703 · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: target-designation, pursuit
• Rationale: Expands familiar-foe target designation to a second enemy.

UR-026 — Familiar Situation

• Canonical ID: 5ae43bdec20b714c · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: target-designation, pursuit, defense, will_defense, resilience
• Rationale: Extends familiar-foe benefits into Fortitude/Will defense against the designated target.

UR-027 — Fast Attack Specialist

• Canonical ID: c6708ba5777c248e · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, ranged, full_attack, standard_action, action_economy, sustained_damage, once-per-encounter, force_point_spend, resource_spend
• Rationale: Compresses a vehicle full attack into a standard action and permits an extra encounter use via Force Point.

UR-028 — Master Manipulator

• Canonical ID: 32fb42ce3ee46e6d · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, manipulation, skills, control, action_economy
• Rationale: Successful Persuasion immediately enables a second Persuasion use against the same target.

UR-029 — Overcharged Shot

• Canonical ID: b9894d35f93cae97 · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, ranged, burst_damage, damage_bonus, swift_action, action_economy, setup
• Rationale: Swift overcharge boosts the next vehicle-energy-weapon hit by one die with a subsequent damage drawback.

UR-030 — Quick Cuffs

• Canonical ID: 842d1dfc65cce80a · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: restrain, grab, control, equipment, melee, swift_action, action_economy
• Rationale: After a successful grab, swiftly applies binders to restrain the target.

UR-031 — Roll Out

• Canonical ID: 3524a8f7582708d9 · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, space, evasion, reroll, skills, pursuit, reliability
• Rationale: Rerolls Pilot to disengage from a dogfight and mitigates failure for vehicle gunners.

UR-032 — Small Favor

• Canonical ID: 81e423a476c377fa · Page: 29 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, social_network, resources, knowledge, investigation, skills, support
• Rationale: Uses social contacts to obtain information and grant a major bonus to Gather Information or Knowledge.

UR-033 — Extended Critical Range (simple weapons)

• Canonical ID: 7cbd576e420a36b0 · Page: 30 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: critical_hit, precision, weapon_training
• Rationale: Extends simple-weapon critical threat range without making non-20 rolls automatic hits.

UR-034 — Extended Threat

• Canonical ID: 4699879601d8891c · Page: 30 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, attack_of_opportunity, positioning, battlefield_control, overwatch
• Rationale: Extends ranged attack-of-opportunity threat to a 2-square radius.

UR-035 — Master’s Orders

• Canonical ID: 8149b23aece320fd · Page: 30 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: leadership, ally_support, support, teamwork, reroll, action_economy, reliability
• Rationale: Allies using actions granted by you may reroll an attack or check made during that action.

UR-036 — Multiattack Proficiency (simple weapons)

• Canonical ID: eb37a8bab49f8ab7 · Page: 30 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: full_attack, sustained_damage, precision, weapon_training
• Rationale: Reduces full-attack penalties for repeated attacks with simple weapons; repeated selections stack.

UR-037 — Two-For-One Throw

• Canonical ID: 5730c15fad41ebb3 · Page: 30 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, dual_wield, burst_damage, standard_action, action_economy
• Rationale: Standard action makes two simultaneous thrown-weapon attacks against one target/space.

UR-038 — Irregular Tactics

• Canonical ID: 2be9f49f9c675bfb · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: tactics, knowledge, skills, support, teamwork, defense
• Rationale: Knowledge (tactics) after share talent establishes a defensive DC against enemy Military Tactics effects.

UR-039 — Lead by Example

• Canonical ID: 7369f8ce78ce4821 · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: leadership, ally_support, support, teamwork, empowerment
• Rationale: Enhances a shared talent when you demonstrated it first, improving DC/bonuses or reducing damage taken.

UR-040 — Lingering Debilitation

• Canonical ID: 1250a3dac18104eb · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, control, battlefield_control, pursuit, once-per-encounter
• Rationale: Debilitating Shot can impose a persistent condition that remains after the normal condition-track hit.

UR-041 — Retreating Fire

• Canonical ID: c92468ee73588b90 · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, mobility, positioning, pursuit, action_economy, force_point_spend, resource_spend
• Rationale: Makes a ranged attack while running/withdrawing; Force Point removes the attack penalty.

UR-042 — Slowing Shot

• Canonical ID: c04e66a3f2577e62 · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, control, battlefield_control, mobility, positioning, force_point_spend, resource_spend
• Rationale: Debilitating Shot additionally reduces speed, removes Dexterity to Reflex, and flat-foots the target; Force Point deepens slow.

UR-043 — Swift Shot

• Canonical ID: dccac6744e458608 · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, swift_action, action_economy, once-per-encounter
• Rationale: Once per encounter compresses a handheld ranged attack from standard to swift action.

UR-044 — Turn the Tide

• Canonical ID: 4a3fdcd0f32062b2 · Page: 31 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: tactics, knowledge, skills, initiative, control, battlefield_control, planning, once-per-encounter, reroll, ally_support, support, teamwork, reliability
• Rationale: Tactics check forces affected enemies to reroll Initiative next round while allies may choose to reroll.

UR-045 — Force Directed Shot

• Canonical ID: e1557fe93f2d960c · Page: 33 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, ranged, offense_ranged, positioning, cover, concealment, targeting, swift_action, action_economy
• Rationale: Force-guided ranged attack treats a chosen visible square as the shot origin for cover/concealment.

UR-046 — Negate and Redirect

• Canonical ID: 9687660c05ff7992 · Page: 33 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_defense, force_offense, use_the_force, counterattack, ranged, action_economy
• Rationale: After negate energy succeeds, converts part of the negated ranged energy into an immediate Force-based counterstrike.

UR-047 — Rising Anger

• Canonical ID: 421af33d2ee72101 · Page: 33 · Source: Unknown Regions_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, ally-trigger, morale, scaling, precision, action_economy
• Rationale: Reactive ally-harm trigger builds a stacking morale bonus to the next attack, up to +5.

## 12-1B — Galaxy at War

Status: Design pass complete.

• Orphans reviewed: 43
• Certified: 43
• Deferred: 0
• Source policy: TXT first; PDF only where the TXT was materially corrupted.
• TXT verified without escalation: 34
• PDF escalations: 9 (GAW-020 and GAW-036 through GAW-043)

GAW-001 — Anticipate Movement

• Canonical ID: 64b2d76b27852887 · Page: 18 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, ally_support, support, teamwork, mobility, positioning, action_economy
• Rationale: Reactive enemy-movement trigger grants a visible ally immediate free movement up to speed.

GAW-002 — Heavy Fire Zone

• Canonical ID: 9f46358606d3f8fb · Page: 18 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: swift_action, action_economy, battlefield_control, control, positioning, setup, ally_support, support, teamwork, attack_of_opportunity, overwatch
• Rationale: Swiftly establishes a 3x3 control zone that converts enemy entry into an allied attack of opportunity.

GAW-003 — Prime Targets

• Canonical ID: ce151ce88fd55934 · Page: 18 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: lightsaber, melee, burst_damage, damage_bonus, targeting
• Rationale: A lightsaber hit against a target not attacked since your last turn gains one extra damage die, rewarding fresh-target selection.

GAW-004 — Commanding Presence

• Canonical ID: d442508aa9d9bdf6 · Page: 19 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, standard_action, action_economy, melee, ranged, ally_support, support, teamwork, leadership, command, morale, defense, damage_bonus, mobility, positioning, precision, sustained_damage
• Rationale: Three command attacks can bolster allied defenses, allied attack/damage, or immediate allied movement.

GAW-005 — Easy Prey

• Canonical ID: d7e9ee3d29107c62 · Page: 19 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: standard_action, action_economy, control, precision, targeting, setup
• Rationale: Trades half of one standard-action attack’s damage to deny that target Dexterity to Reflex against your attacks until the end of your next turn.

GAW-006 — Quick Strike

• Canonical ID: d1eab380f7ec9b29 · Page: 19 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ambush, action_economy, burst_damage, melee, ranged, targeting, positioning
• Rationale: During the initial round, damaging an enemy that has not acted grants an immediate free attack against a different nearby target.

GAW-007 — Sly Combatant

• Canonical ID: ad4d87fb9aebe330 · Page: 19 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, standard_action, action_economy, melee, ranged, control, battlefield_control, damage_bonus, teamwork, positioning
• Rationale: Three once-per-encounter attacks impose lasting offensive penalties, a persistent injury, or scaling damage from allied adjacency.

GAW-008 — Summon Aid

• Canonical ID: 107b66a6cc86e6d6 · Page: 19 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, ally_support, support, teamwork, melee, mobility, positioning, action_economy, battlefield_control, overwatch
• Rationale: Enemy movement adjacent to you triggers an immediate allied charge against that enemy.

GAW-009 — Tactical Savvy

• Canonical ID: 913424086fa8f374 · Page: 19 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, leadership, force_point_spend, resource_spend, scaling, precision
• Rationale: Improves a visible ally’s Force Point roll when that ally spends the point to enhance an attack roll.

GAW-010 — Backstabber

• Canonical ID: 367b23802f5f4d8b · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: flanking, precision, positioning, setup, control
• Rationale: While flanking, once per turn one attack treats the target as flat-footed.

GAW-011 — Dig In

• Canonical ID: af5f776f895e6caf · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: swift_action, action_economy, concealment, defense, ranged_defense, positioning, setup, survivability
• Rationale: While prone, a swift action grants temporary concealment until you move or stand.

GAW-012 — Ghost Assailant

• Canonical ID: 6908d612b77c6f92 · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: stealth, skills, swift_action, action_economy, cover, concealment, ambush, precision, setup, control, opposed_check, positioning
• Rationale: From total cover/concealment, a swift opposed Stealth check makes the target flat-footed against you for the turn.

GAW-013 — Improved Sneak Attack

• Canonical ID: edd7a0b36b9e727b · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, precision_damage, precision, positioning, sustained_damage
• Rationale: Extends the range at which Sneak Attack can apply from 6 squares to 12 squares.

GAW-014 — Mobile Combatant

• Canonical ID: ee184e210f8c8935 · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, standard_action, reaction, action_economy, melee, ranged, mobility, positioning, evasion, defense, counterattack, setup, survivability
• Rationale: Three mobile-combat modes pair attacks with Reflex defense, safe repositioning, or reactive withdrawal that sets up the next attack.

GAW-015 — Slip By

• Canonical ID: b1f19c1c86bdcae9 · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: stealth, skills, skill_substitution, evasion, mobility, positioning, attack_of_opportunity, defense, survivability
• Rationale: When movement would provoke, substitutes a Stealth check result for Reflex Defense against the attack of opportunity if higher.

GAW-016 — Trailblazer

• Canonical ID: 2d70ebe43ad9c7b0 · Page: 20 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: swift_action, action_economy, ally_support, support, teamwork, mobility, positioning, exploration, battlefield_control
• Rationale: A swift action lets nearby visible allies ignore the first square of difficult terrain each time they move.

GAW-017 — Battlefield Remedy

• Canonical ID: bc7647fb4684b80f · Page: 21 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: treat_injury, medicine, medical, healing, recovery, condition_removal, skills, support, survivability
• Rationale: Successful First Aid also moves the patient one positive step on the condition track.

GAW-018 — Defensive Jab

• Canonical ID: 4161fc38ed0d7c9a · Page: 21 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, fighting_defensively, defense, melee, action_economy, burst_damage, positioning
• Rationale: Fighting defensively while unarmed grants a free unarmed attack against an adjacent target.

GAW-019 — Defensive Position

• Canonical ID: f9f3530a9e88a530 · Page: 21 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: cover, defense, ranged_defense, survivability, swift_action, action_economy, setup, positioning
• Rationale: Two swift actions upgrade existing cover to improved cover until the start of your next turn.

GAW-020 — Grizzled Warrior

• Canonical ID: 0cd242fd0b3f8062 · Page: 21 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF pages 22, 23) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: once-per-encounter, standard_action, action_economy, melee, ranged, survivability, resilience, defense, ally_support, support, teamwork, damage_bonus, scaling, durability
• Rationale: Three veteran actions grant Constitution-based bonus hit points, improve an aided ally’s successful attack with level-scaled damage, or grant +2 Reflex after attacking.

GAW-021 — Nimble Dodge

• Canonical ID: 913a0ca43e032caa · Page: 21 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, evasion, mobility, positioning, melee_defense, defense, survivability, action_economy
• Rationale: A missed enemy melee attack lets you reactively move up to 2 squares while ending adjacent to the attacker.

GAW-022 — Stunning Shockboxer

• Canonical ID: bde10cfd33efc3d0 · Page: 21 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, stun, nonlethal, damage_bonus, burst_damage, sustained_damage
• Rationale: An unarmed stun attack adds one extra damage die to the hit-point damage remaining after stun damage is halved.

GAW-023 — Autofire Assault

• Canonical ID: 48024c68e89b1f5b · Page: 22 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, weapon_training, setup, sustained_damage, battlefield_control
• Rationale: Allows a proficient autofire-capable weapon to be braced even when it is not restricted to autofire only.

GAW-024 — Reckless

• Canonical ID: 125c8b753d186f6d · Page: 22 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, mobility, positioning, damage_bonus, scaling, burst_damage
• Rationale: A successful charge attack adds your Wisdom bonus to damage.

GAW-025 — Ferocious Assault

• Canonical ID: cebb24b483fb5365 · Page: 30 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, ranged, burst_damage, battlefield_control, control, positioning, resource_spend
• Rationale: Once per encounter converts an autofire attack into a 6-square cone at the cost of 20 shots.

GAW-026 — Bullseye

• Canonical ID: eeb5ebf5835734d2 · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, ranged, offense_ranged, sniper, precision, targeting, target-designation, setup, control, positioning
• Rationale: Against an aimed non-point-blank target, one ranged attack denies the target its Dexterity bonus to Reflex Defense.

GAW-027 — Fall Back

• Canonical ID: 16b020752725d7a9 · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: move_action, action_economy, ally_support, support, teamwork, leadership, command, mobility, positioning, evasion, attack_of_opportunity
• Rationale: A move action orders every squad member to move 2 squares without provoking attacks of opportunity.

GAW-028 — Form Up

• Canonical ID: 29e32c30fda1a234 · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, defense, positioning, survivability
• Rationale: A move action grants squad members a morale bonus to Reflex Defense while they remain mutually supported by nearby squadmates.

GAW-029 — Full Advance

• Canonical ID: 4f60988cc2260277 · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, damage_bonus, sustained_damage
• Rationale: A move action grants all squad members a morale bonus to damage until the end of your next turn.

GAW-030 — Harrying Shot

• Canonical ID: 8306c13c16ae0af8 · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, offense_ranged, sniper, precision, targeting, setup, control, battlefield_control, action_economy, stun
• Rationale: An aimed damaging ranged hit prevents the target from using a standard action to make an attack on its next turn; the effect is stunning.

GAW-031 — Hold Steady

• Canonical ID: 438abc85b1f7d25d · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, standard_action, action_economy, ally_support, support, teamwork, leadership, command, recovery, condition_removal, survivability
• Rationale: Once per encounter, a standard command action moves every squad member one positive step on the condition track.

GAW-032 — Keep Them Honest

• Canonical ID: fe96e6ee2657d14e · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, support, teamwork, control, battlefield_control, targeting
• Rationale: Using Aid Another to suppress an enemy imposes a much larger attack penalty on that enemy until the end of your next turn.

GAW-033 — Search and Destroy

• Canonical ID: 1907d80212a12c68 · Page: 31 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: move_action, action_economy, ally_support, support, teamwork, leadership, command, morale, perception, skills, recon, detection, awareness
• Rationale: A move action grants the squad a morale bonus to Perception checks until the end of your next turn.

GAW-034 — Echani Expertise

• Canonical ID: 88ca4add87c2a86a · Page: 32 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, critical_hit, precision
• Rationale: Extends the critical threat range of unarmed attacks by one while preserving the natural-20 automatic-hit rule.

GAW-035 — Hijkata Expertise

• Canonical ID: 6b55ee89c322b99d · Page: 32 · Source: Galaxy At War_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, control, battlefield_control, defense, scaling
• Rationale: An unarmed hit penalizes the target’s next attack roll by an amount equal to your Strength bonus.

GAW-036 — Flurry of Blows

• Canonical ID: 11b45afc4136594c · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: unarmed, martial_arts, melee, full_attack, sustained_damage, scaling, precision
• Rationale: Reduces multiple-unarmed-attack full-attack penalties by 2; repeated selections reduce the penalty further.

GAW-037 — Hardened Strike

• Canonical ID: a497a8c8c14acb9d · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: unarmed, martial_arts, melee, damage_reduction, setup, sustained_damage
• Rationale: Damaging an opponent unarmed reduces its Damage Reduction by 1 for the encounter, enabling later attacks; repeated hits do not stack.

GAW-038 — K’tara Expertise

• Canonical ID: cafcd19016e17d00 · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: unarmed, martial_arts, melee, control, battlefield_control, swift_action, action_economy, precision
• Rationale: Once per turn after unarmed damage, makes a disarm attempt as a swift action and removes the normal two-handed-weapon disarm penalty.

GAW-039 — K’thri Expertise

• Canonical ID: 9f02751f14ad2de8 · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: martial_arts, melee, attack_of_opportunity, positioning, battlefield_control, control, damage_bonus, scaling, sustained_damage
• Rationale: Enemies beginning their turns adjacent take Strength-based damage when you are able to make an attack of opportunity against them.

GAW-040 — Punishing Strike

• Canonical ID: 8637ce4c8b274df4 · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: unarmed, martial_arts, melee, critical_hit, action_economy, burst_damage, sustained_damage
• Rationale: Once per turn, an unarmed critical hit grants an immediate additional unarmed attack against a target within reach.

GAW-041 — Stava Expertise

• Canonical ID: 41d3f44653a1fe34 · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: martial_arts, melee, grab, grapple, restrain, control, opposed_check, reroll, reliability
• Rationale: A successful grab forces an opposed grapple check to escape, and grapple checks you initiate can be rerolled with the second result required.

GAW-042 — Tae-Jitsu Expertise

• Canonical ID: 6e638242c0af18df · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: unarmed, martial_arts, melee, damage_threshold, control, battlefield_control, precision
• Rationale: Once per turn, an unarmed hit whose attack roll meets the target’s damage threshold moves that target one step down the condition track regardless of damage.

GAW-043 — Wrruushi Expertise

• Canonical ID: 75c0b084b706be38 · Page: 33 · Source: SW_Saga_Galaxy_at_War.pdf (TXT escalation from Galaxy At War_djvu.txt; physical PDF page 34) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: unarmed, martial_arts, melee, control, battlefield_control, action_economy, swift_action, precision
• Rationale: Once per turn after unarmed damage, a free attack against Fortitude can restrict the target to a single swift action on its next turn.

## Phase 12-1C — Jedi Academy Training Manual

• Orphans reviewed: 43
• TXT verified: 41
• PDF escalations: 2
• Certified with final existing-vocabulary tags: 43
• Deferred vocabulary gaps: 0

JATM-001 — Regimen Aptitude

• Canonical ID: 605e0a2ac655e184 · Page: 18 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_training, skills
• Rationale: Improves skill checks made to perform Force regimens, directly representing Force training expressed through skill use.

JATM-002 — Echoes in the Force

• Canonical ID: e26abfa7fe650912 · Page: 20 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, use_the_force, visions, investigation, recon
• Rationale: Extends farseeing from creatures to locations and lets the user investigate meaningful events in a location’s past through a Use the Force check.

JATM-003 — Unclouded Judgment

• Canonical ID: 4a0ed533e99848a8 · Page: 20 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_defense, anti-force, mind-affecting, will_defense, defense, reaction, action_economy, force_point_spend, resource_spend
• Rationale: As a reaction, spends a Force Point to completely negate a mind-affecting Force power or talent targeting the user.

JATM-004 — Improvised Weapon Master

• Canonical ID: 17cdb585c58c2f19 · Page: 21 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: improvised_weapon, melee, weapon_training, precision
• Rationale: Removes the attack-roll penalty for improvised weapons, improving accuracy with that weapon scope.

JATM-005 — Folded Space Mastery

• Canonical ID: 93bb4f8c058655f9 · Page: 73 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, use_the_force, vehicle, pilot, space, mobility, exploration, skill_substitution
• Rationale: Uses fold space to move a piloted vehicle across hyperspace-scale distances and substitutes Use the Force for the normal Use Computer hyperspace calculation.

JATM-006 — Liberate

• Canonical ID: 5a858011286f5809 · Page: 73 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, ally_support, support, force_point_spend, resource_spend, swift_action, reaction, action_economy, grab, grapple, restrain, condition_removal, recovery, mobility, positioning
• Rationale: Spends a Force Point as a swift action to free a nearby ally from grab, grapple, or immobilization and immediately lets that ally move as a reaction.

JATM-007 — Many Shades of the Force

• Canonical ID: d444b28e15a5a9c3 · Page: 73 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_control, dark_side, light_side
• Rationale: Changes one selected Force power so its dark-side or light-side descriptor no longer applies to the user.

JATM-008 — Spatial Integrity

• Canonical ID: e40620e2dca73682 · Page: 73 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, vehicle, use_the_force, force_point_spend, resource_spend, reaction, action_economy, damage_reduction, defense, durability, survivability
• Rationale: While aboard a vehicle, spends a Force Point as a reaction and uses a Use the Force check to reduce damage the vehicle takes after DR and SR.

JATM-009 — Expanded Horizon

• Canonical ID: 4a6a7eccce089a4e · Page: 75 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, search_your_feelings, visions, precognition, planning, force_point_spend, resource_spend
• Rationale: Extends Search Your Feelings farther into the future, with Force Point or Destiny Point expenditure increasing the forecasting window.

JATM-010 — Knowledge and Defense

• Canonical ID: 06ab0e40780ea63d · Page: 75 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: defense, ambush_defense, survivability, ability_enhancement
• Rationale: Adds Wisdom to Reflex Defense specifically when Dexterity would be denied, preserving defense in vulnerable states.

JATM-011 — Planetary Attunement

• Canonical ID: 1204459eaaff9efa · Page: 75 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, exploration, survival, nature, defense, mobility, senses, precognition, planning
• Rationale: Force-attunes to a planet to improve defenses against natural hazards, increase speed, and sense local weather up to a day ahead.

JATM-012 — Precognitive Meditation

• Canonical ID: f8ac7fecc8d3c8ff · Page: 75 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, meditation, precognition, visions, planning, setup, force_point_spend, resource_spend, defense, evasion, vehicle, pilot
• Rationale: A daily precognitive meditation spends a Force Point to bank a future attack negation for the user or a vehicle the user pilots.

JATM-013 — Immerse Another

• Canonical ID: 6add44bebe61f2f3 · Page: 77 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, stealth, use_the_force, skills, ally_support, support, teamwork, evasion, positioning, force_point_spend, resource_spend
• Rationale: Lets an adjacent ally use the user’s Stealth or Use the Force result to avoid detection, with a Force Point extending the protection to all adjacent allies.

JATM-014 — Ride the Current

• Canonical ID: df6c20e602190daa · Page: 77 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, reaction, action_economy, force_point_spend, resource_spend, concealment, evasion, defense, recovery, healing, survivability
• Rationale: After taking damage, spends a Force Point as a reaction to gain total concealment and can immediately take an unused second wind.

JATM-015 — Surrender to the Current

• Canonical ID: d1ced133cee0a6fa · Page: 77 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_capacity, resource_recovery, recovery, swift_action, action_economy
• Rationale: Enters a sustained state that restricts Force powers to self-targeting effects but recovers one spent qualifying Force power each turn as a swift action without a Force Point.

JATM-016 — Body Control

• Canonical ID: 65f3bc5663794697 · Page: 81 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, defense, ability_enhancement, resilience, survivability, poison, force_point_spend, resource_spend, swift_action, action_economy
• Rationale: Uses Charisma in place of Constitution for Fortitude Defense and can spend a Force Point as a swift action to become immune to poison, radiation, and disease for the encounter.

JATM-017 — Physical Surge

• Canonical ID: 26e3d987f7b984cf · Page: 81 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: initiative, surprise_round, ambush_defense, swift_action, action_economy
• Rationale: At the start of combat, grants an immediate swift action when Initiative is rolled even if the character is surprised.

JATM-018 — Soft to Solid

• Canonical ID: 004732cba6bfa4a7 · Page: 81 · Source: SW Saga - Jedi Academy Training Manual (optimized).pdf (TXT escalation from Jedi Academy Training Manual_djvu.txt; physical PDF page 82) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: force, reaction, action_economy, force_point_spend, resource_spend, damage_reduction, defense, resilience, survivability
• Rationale: After being damaged, spends a Force Point as a reaction to gain DR 10 until the end of the next turn.

JATM-019 — Wan-Shen Defense

• Canonical ID: 960a9095402d23ee · Page: 81 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, melee_defense, defense, swift_action, action_economy, scaling
• Rationale: Uses a wan-shen as a swift-action defensive stance that grants a scaling deflection bonus to Reflex Defense against melee attacks.

JATM-020 — Wan-Shen Mastery

• Canonical ID: e17a8eea5c111f48 · Page: 81 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, standard_action, action_economy, burst_damage, positioning
• Rationale: Compresses two wan-shen attacks against different targets within reach into a single standard action.

JATM-021 — Mobile Whirlwind

• Canonical ID: 160cab566fd1ea2c · Page: 83 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, mobility, positioning, action_economy
• Rationale: Adds full-speed movement after resolving Whirlwind Attack, turning the attack into a strong repositioning tool.

JATM-022 — Repelling Whirlwind

• Canonical ID: f5bdd03d2767793e · Page: 83 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, defense, survivability
• Rationale: After Whirlwind Attack, grants a Reflex Defense bonus against every target hit until the start of the user’s next turn.

JATM-023 — Sudden Storm

• Canonical ID: c101826c205debf2 · Page: 83 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, unarmed, melee, burst_damage, battlefield_control, mobility, positioning, action_economy
• Rationale: Spends a Force Point to replace the normal melee attack at the end of a charge with an unarmed Whirlwind Attack.

JATM-024 — Tempest Tossed

• Canonical ID: f7b620efd191ac6b · Page: 83 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, control, battlefield_control, movement, positioning, mobility, action_economy
• Rationale: A damaging Whirlwind Attack can reposition each affected target by one square as a free action.

JATM-025 — Combustion

• Canonical ID: 953e539478ea6c3e · Page: 85 · Source: SW Saga - Jedi Academy Training Manual (optimized).pdf (TXT escalation from Jedi Academy Training Manual_djvu.txt; physical PDF page 86) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: force, force_power_synergy, force_offense, force_point_spend, resource_spend, swift_action, action_economy, damage_bonus, burst_damage, sustained_damage
• Rationale: Spends a Force Point as a swift action to add fire damage to a single-target damaging Force power and causes the damaged target to catch fire.

JATM-026 — Earth Buckle

• Canonical ID: 8436e1f101dc438c · Page: 85 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, swift_action, action_economy, battlefield_control, control, positioning, mobility
• Rationale: Creates a 3x3 area of difficult terrain as a swift action while allowing the user to ignore the movement penalties of that terrain.

JATM-027 — Fluidity

• Canonical ID: 5567797336fc8571 · Page: 85 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, skill_substitution, skills, mobility, reroll, grapple, opposed_check, force_point_spend, resource_spend, reliability
• Rationale: Substitutes Use the Force for Acrobatics, carries applicable rerolls to the substituted check, and can spend a Force Point to improve effective size for grapple checks.

JATM-028 — Thunderclap

• Canonical ID: 7f63f6f3fec96bf3 · Page: 85 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_offense, battlefield_control, control, movement, positioning
• Rationale: A damaging Force power can also trigger Bantha Rush against the target, adding forced movement/control to Force offense.

JATM-029 — Wind Vortex

• Canonical ID: 897c61c8054bdd9e · Page: 85 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, swift_action, action_economy, concealment, defense, ranged_defense, evasion, survivability
• Rationale: Spends a Force Point as a swift action to gain encounter-long concealment plus additional Reflex Defense against thrown weapons.

JATM-030 — Cycle of Harmony

• Canonical ID: 7b921008eb97b266 · Page: 87 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, ally-trigger, reaction, action_economy, survivability, scaling, positioning, durability
• Rationale: When one nearby ally is hurt or moved down the condition track, reacts by granting scaling bonus hit points to a different nearby ally.

JATM-031 — Force Stabilize

• Canonical ID: eea7ea6dc3bd0313 · Page: 87 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, healing, recovery, survivability, swift_action, action_economy, positioning
• Rationale: Once per turn as a swift action, lets a nearby ally immediately take an unused second wind.

JATM-032 — Repel Discord

• Canonical ID: 30b5540645eb4287 · Page: 87 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, dark_side, dark_side_score, anti-force, force_defense, use_the_force, reaction, action_economy, force_point_spend, resource_spend, scaling
• Rationale: When targeted by a dark-side Force power, spends a Force Point as a reaction to penalize the attacker’s activation check by the attacker’s Dark Side Score.

JATM-033 — Stifle Conflict

• Canonical ID: 9db016b2e528beb4 · Page: 87 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_control, damage, nonlethal, stun
• Rationale: Allows any damaging Force power the user activates to deal stun damage instead of normal damage.

JATM-034 — Brutal Unarmed Strike

• Canonical ID: dbc150d8f2de73c1 · Page: 89 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, damage, reroll, reliability, sustained_damage
• Rationale: Improves every unarmed damage roll by rerolling damage dice that show 1.

JATM-035 — Martial Resurgence

• Canonical ID: 0fb750f0f0e6f767 · Page: 89 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, critical_hit, force, force_power_synergy, force_capacity, resource_recovery, recovery
• Rationale: A natural 20 on an unarmed attack restores all spent Force powers to the user’s Force suite.

JATM-036 — Rebound Leap

• Canonical ID: 1b41d42e6adb0d46 · Page: 89 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, mobility, movement, positioning, skills, action_economy
• Rationale: Dropping an opponent to 0 hit points with an unarmed attack grants an immediate Jump-based movement as a free action.

JATM-037 — Simultaneous Strike

• Canonical ID: 040e50766b518ea6 · Page: 89 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, standard_action, action_economy, burst_damage, positioning
• Rationale: Makes two unarmed attacks against different targets as a single standard action.

JATM-038 — Telekinetic Throw

• Canonical ID: 1bce5b5ca81d0873 · Page: 89 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: unarmed, martial_arts, melee, grapple, control, battlefield_control, movement, positioning
• Rationale: Extends the Throw feat so a successfully thrown grappled opponent can land prone up to three squares beyond the user’s reach.

JATM-039 — Discblade Arc

• Canonical ID: 3d7da7d62139a6e9 · Page: 91 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: exotic_weapon, ranged, burst_damage, targeting, positioning, action_economy
• Rationale: Uses a discblade for a full-round area attack against three designated targets within point-blank range with one attack roll.

JATM-040 — Distant Discblade Throw

• Canonical ID: 8f172c307cdec956 · Page: 91 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: exotic_weapon, ranged, pistol
• Rationale: Treats a discblade as a pistol rather than a thrown weapon solely for determining range.

JATM-041 — Recall Discblade

• Canonical ID: abbf02a67dbe0c89 · Page: 91 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: exotic_weapon, ranged, force, use_the_force, telekinesis, action_economy
• Rationale: After a ranged discblade attack, a Use the Force check calls the weapon back to the user’s hand as a free action.

JATM-042 — Telekinetic Vigilance

• Canonical ID: 8ddbbeb09758295d · Page: 91 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, telekinesis, force_capacity, resource_recovery, swift_action, action_economy
• Rationale: Returns the intercept Force power to the user’s Force suite as a swift action without spending a Force Point.

JATM-043 — Weapon Specialization (discblade)

• Canonical ID: 5854b821895ffdd9 · Page: 91 · Source: Jedi Academy Training Manual_djvu.txt · Authority: TXT_VERIFIED
• Final tags: exotic_weapon, melee, weapon_specialization, damage_bonus, sustained_damage
• Rationale: Grants a +2 bonus on melee damage rolls with the exotic discblade.

## Phase 12-1D — Force Unleashed Campaign Guide

• Orphans reviewed: 35
• TXT verified: 35
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 35
• Deferred vocabulary gaps: 0

TFU-001 — Idealist

• Canonical ID: e8922370838f2965 · Page: 25 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: will_defense, defense, ability_enhancement, resilience
• Rationale: Substitutes Charisma for Wisdom when determining Will Defense, strengthening mental defense through an alternate ability basis.

TFU-002 — Influential Friends

• Canonical ID: 471f4294820ce5ec · Page: 25 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: social_network, resources, skills, support, reliability, scaling
• Rationale: Calls on established contacts to produce an automatic high skill-check result on the character’s behalf, with the modifier scaling by heroic level.

TFU-003 — Willpower

• Canonical ID: ae9cf46162b4bc42 · Page: 25 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, morale, will_defense, swift_action, action_economy, once-per-encounter
• Rationale: Once per encounter, a swift action grants all visible allies a lasting morale bonus to Will Defense.

TFU-004 — Improved Surveillance

• Canonical ID: 8070dbbea2886bbd · Page: 28 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: perception, recon, target-designation, ally_support, support, teamwork, defense
• Rationale: A successful Surveillance use designates the observed target and grants the user and allies an insight bonus to all defenses against that target.

TFU-005 — Ruthless

• Canonical ID: adfb725d20faade5 · Page: 29 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, ranged, damage_threshold, damage_bonus, sustained_damage, target-designation
• Rationale: Exceeding a target’s damage threshold with a melee or ranged attack grants a persistent damage bonus against that target for the encounter.

TFU-006 — Extended Critical Range (heavy weapons)

• Canonical ID: 04985a42930dff2a · Page: 42 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: heavy_weapon, ranged, critical_hit, precision, weapon_training
• Rationale: Extends the critical threat range of heavy weapons while preserving the natural-20 automatic-hit rule.

TFU-007 — Computer Language

• Canonical ID: 662eb601a2686349 · Page: 47 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: use_computer, persuasion, skill_substitution, skills, tech, reroll, reliability
• Rationale: Substitutes Persuasion for Use Computer, including training qualification and any rerolls that would apply to the original Use Computer check.

TFU-008 — Computer Master

• Canonical ID: 8d7cbcbbf1dc58bb · Page: 47 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: use_computer, tech, skills, reroll, opposed_check, reliability
• Rationale: Allows opposed Use Computer checks to be rerolled while keeping the better result.

TFU-009 — Enhanced Manipulation

• Canonical ID: 37cdbac0dee1b93a · Page: 47 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, skill_mastery, reliability
• Rationale: Allows taking 10 on any Dexterity-based skill check even under threat or circumstances that normally prevent taking 10.

TFU-010 — Hotwired Processor

• Canonical ID: e9a5fe40ce95a053 · Page: 47 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, tech, ability_enhancement, skills, ranged, precision, swift_action, action_economy, scaling, sustained_damage
• Rationale: A swift-action processor overclock grants temporary bonuses to Intelligence/Wisdom skill checks and ranged attacks, scaling in duration by level, followed by a persistent condition penalty.

TFU-011 — Skill Conversion

• Canonical ID: 3d17761d072eeb53 · Page: 48 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, tech, modification, skills, skill_mastery
• Rationale: During reprogramming, converts one trained skill into a bonus Skill Focus feat for another trained skill.

TFU-012 — Attract Privateer

• Canonical ID: 7a049ee1ecc3891b · Page: 52 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: followers, minion, support, resources, scaling
• Rationale: Attracts a loyal nonheroic privateer lieutenant whose class level scales with the character; repeated selections add additional followers.

TFU-013 — Ion Mastery

• Canonical ID: df9c25340dcb7c95 · Page: 52 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, offense_ranged, precision, damage_bonus, nonlethal, droid, vehicle, sustained_damage
• Rationale: Improves ion-weapon accuracy and ion damage against the droid/vehicle targets that ion weapons are designed to disable rather than destroy.

TFU-014 — Multiattack Proficiency (advanced melee weapons)

• Canonical ID: d7ba5fb8b677a2f4 · Page: 52 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, full_attack, sustained_damage, precision, weapon_training
• Rationale: Reduces full-attack penalties for multiple attacks with advanced melee weapons; repeated selections reduce the penalty further.

TFU-015 — Conceal Other

• Canonical ID: ea3bdb2a7d6b44db · Page: 92 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, ally_support, support, concealment, stealth, evasion, scaling
• Rationale: Extends Buried Presence or Vanish to adjacent willing allies, with repeated selections increasing the number of allies concealed.

TFU-016 — Insightful Aim

• Canonical ID: c60790c84a0be9cf · Page: 92 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, swift_action, action_economy, use_the_force, skill_substitution, ranged, offense_ranged, precision
• Rationale: Spends a Force Point as a swift action to substitute the Use the Force modifier for ranged attack bonus until the next turn.

TFU-017 — Vanish

• Canonical ID: 4816e7970b4241c2 · Page: 92 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, swift_action, action_economy, concealment, stealth, evasion, force_defense
• Rationale: A swift Use the Force check can grant total concealment from one target until the next turn or until the user acts against that target.

TFU-018 — Detonate

• Canonical ID: bf1a79b50e129dc7 · Page: 93 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_offense, use_the_force, force_point_spend, resource_spend, burst_damage, battlefield_control, positioning
• Rationale: Spending a Force Point when using Force blast expands the effect into a secondary 2-square area attack around the original target.

TFU-019 — Hive Mind

• Canonical ID: ba740330cf490549 · Page: 93 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, telepathy, use_the_force, swift_action, action_economy, reliability
• Rationale: Makes the Telepathy application of Use the Force a swift action and automatically succeeds with a willing recipient on the same planet.

TFU-020 — Infuse Weapon

• Canonical ID: 0df15b0ea7721c50 · Page: 93 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, empowerment, weapon_empowerment, equipment, melee, damage_reduction, durability, damage_bonus, sustained_damage
• Rationale: Force-infuses an unpowered melee weapon, improving its resistance to damage and lightsabers and adding damage when a Force Point is used to improve its attack.

TFU-021 — Sickening Blast

• Canonical ID: 6f32f14243bd4856 · Page: 93 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_offense, use_the_force, dark_side, dark_side_score, control, battlefield_control
• Rationale: A Force blast that beats Fortitude can also move the target down the condition track at the cost of increasing the user’s Dark Side Score.

TFU-022 — Adept Assistant

• Canonical ID: 7cbae1f695df81c5 · Page: 102 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, mechanics, pilot, use_computer, tech, skills
• Rationale: Greatly improves Aid Another when assisting an ally with Mechanics, Pilot, or Use Computer.

TFU-023 — Dull the Pain

• Canonical ID: d32459fe16029f2a · Page: 102 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: treat_injury, medicine, medical, recovery, condition_removal, ally_support, support, skills
• Rationale: A Treat Injury check on an adjacent living creature moves that creature one positive step on the condition track.

TFU-024 — Interrogator

• Canonical ID: aab9d63888f12dba · Page: 102 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: treat_injury, medicine, medical, persuasion, intimidation, social, skill_substitution, skills, control, manipulation
• Rationale: Substitutes Treat Injury for Persuasion when changing attitude or intimidating an adjacent target, combining medical expertise with social coercion.

TFU-025 — Mechanics Mastery

• Canonical ID: 88d01facdd76940e · Page: 102 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: mechanics, tech, skills, skill_mastery, reliability
• Rationale: Allows taking 10 on Mechanics checks even when distractions or hazards would normally prevent it.

TFU-026 — Vehicle Mechanic

• Canonical ID: 5ea7a0fd9015b29c · Page: 102 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, mechanics, tech, skills, repair, healing, recovery, condition_removal, durability, support, swift_action, action_economy, scaling
• Rationale: Over three successive swift actions, a Mechanics check restores vehicle hit points and moves the vehicle one positive step on the condition track, with extra healing for exceeding the DC.

TFU-027 — Cargo Hauler

• Canonical ID: ce141cbd257003bc · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, ability_enhancement
• Rationale: Improves Strength-based skill performance and doubles carrying capacity, representing enhanced Strength-derived capability.

TFU-028 — Combat Repairs

• Canonical ID: 428896be183fadb1 · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, mechanics, tech, skills, self_repair, repair, recovery, durability, action_economy
• Rationale: Once per day, compresses the repair-droid application of Mechanics into a full-round self-repair instead of the normal hour.

TFU-029 — Droid Smash

• Canonical ID: 236bf4d940eb6b12 · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, offense_melee, damage_bonus, scaling, ability_enhancement, sustained_damage
• Rationale: Doubles the Strength contribution to one-handed melee weapon damage.

TFU-030 — Environmentally Shielded

• Canonical ID: aadcae548952b7eb · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: defense, resilience, survivability, exploration, survival
• Rationale: Provides an equipment bonus to Fortitude Defense against environmental hazards such as extreme atmospheres and corrosion.

TFU-031 — Etiquette

• Canonical ID: 9a0c74195f3d4ac3 · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, skills, manipulation, control
• Rationale: A successful Persuasion check to change attitude shifts the target one additional attitude step.

TFU-032 — Helpful

• Canonical ID: 342fd105ca6369c7 · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, skills, swift_action, action_economy
• Rationale: Once per turn, compresses Aid Another on an adjacent ally’s skill check from a standard action to a swift action.

TFU-033 — Power Supply

• Canonical ID: 56a3b3c9b57f11fa · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: power_systems, tech, equipment, support, vehicle, shields, swift_action, action_economy
• Rationale: Reroutes internal power to operate generator-dependent equipment and reduces the swift-action cost of recharging shields or rerouting vehicle/starship power.

TFU-034 — Protocol

• Canonical ID: 058898a456a9a8fb · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, skills, deception, knowledge, persuasion, social, reliability
• Rationale: Automatically succeeds on Aid Another attempts involving Deception, Knowledge, or Persuasion.

TFU-035 — Targeting Package

• Canonical ID: ac8c46e1f6365c4a · Page: 103 · Source: Force Unleashed Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: targeting, precision, setup, swift_action, action_economy, damage_bonus, melee, ranged, offense_melee, offense_ranged, positioning, tech
• Rationale: Two swift actions activate targeting software that boosts the next point-blank or melee attack and damage roll if line of sight and action sequencing are preserved.

## Phase 12-1E — Galaxy of Intrigue

• Orphans reviewed: 29
• Certified: 28
• Deferred ontology gaps: 1
• Source method: TXT-first
• TXT verified: 29
• PDF escalations: 0
• New tags authorized: 0

GOI-001 — Blend In

• Canonical ID: 4a6da8249db460f6 · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: concealment, positioning, defense, evasion, swift_action, action_economy
• Rationale: A swift action converts adjacency to a crowd into total concealment against nonadjacent attackers, creating a positional defensive state.

GOI-003 — Get into Position

• Canonical ID: bb7ee79cbdd2c018 · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, mobility, positioning, reaction, action_economy, once-per-encounter, setup
• Rationale: Once per encounter at the start of the user’s first turn, two visible allies can immediately move up to speed as reactions, establishing opening positions.

GOI-004 — Guaranteed Boon

• Canonical ID: 669aae58e8d0d90f · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force_point_spend, resource_spend, resource_recovery, skills
• Rationale: A Force Point spent on a failed skill-challenge check is refunded, preserving the resource when the boosted check still fails.

GOI-005 — Leading Skill

• Canonical ID: efd54ffa36d5a2b4 · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, support, setup
• Rationale: A skill-challenge success sets up a +2 insight bonus on the user’s next check with a different skill in the same challenge.

GOI-006 — Learn from Mistakes

• Canonical ID: 6dcf10db37160d23 · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, ally_support, support, teamwork, setup
• Rationale: A failed skill-challenge action creates a +2 insight setup bonus for the next ally who attempts a different action with a different skill.

GOI-007 — Master Manipulator

• Canonical ID: c5a043b596f544d0 · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, condition_removal, recovery, morale, control, manipulation, defense, reaction, swift_action, action_economy, once-per-encounter, reliability, skills
• Rationale: Three once-per-encounter manipulation modes recover an ally and bolster attacks/skills, replace a visible character’s d20 result, or temporarily substitute the user’s defense score for an ally’s.

GOI-008 — Retaliation

• Canonical ID: 8ed2a9fd50053e3b · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: damage_threshold, counterattack, melee, ranged, control
• Rationale: After threshold damage moves the user down the condition track, the next damaging melee or ranged hit before the end of the next turn also moves the target down one condition step.

GOI-009 — Try Your Luck

• Canonical ID: bf27fc2e540e2ed5 · Page: 20 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, ally_support, support, teamwork, reroll, reliability, setup
• Rationale: A failed skill-challenge check sets up an ally to roll the same skill twice and keep the better result later in the challenge.

GOI-010 — Bomb Thrower

• Canonical ID: 959f16cb707d8360 · Page: 21 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: mechanics, skills, crafting, equipment, tech
• Rationale: Improves Mechanics for explosives and permits field-crafting a frag-grenade equivalent from suitable spare parts.

GOI-011 — For the Cause

• Canonical ID: df8f36d21dc4d23c · Page: 21 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: damage_threshold, ally-trigger, ally_support, support, teamwork, damage_bonus, sustained_damage, positioning, precision
• Rationale: Threshold-exceeding damage to the user or a nearby ally triggers a short-lived group bonus to attack and damage rolls within 6 squares.

GOI-012 — Fade Out

• Canonical ID: 77293789b3e9e38a · Page: 22 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: stealth, deception, skill_substitution, skills, infiltration, setup
• Rationale: Uses Stealth in place of Deception to create a diversion to hide, with trained Deception improving the substituted check.

GOI-013 — Keep Together

• Canonical ID: de31c189f3416df7 · Page: 22 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, action_economy, mobility, positioning, evasion, melee, ranged, teamwork, attack_of_opportunity
• Rationale: Any melee or ranged attack hit or miss can trigger full-speed reactive movement that must end adjacent to an ally and does not provoke attacks of opportunity.

GOI-014 — Prudent Escape

• Canonical ID: 70929db4d14b8ae8 · Page: 22 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, reaction, action_economy, mobility, positioning, evasion, attack_of_opportunity
• Rationale: Dropping or incapacitating a target lets the user and two nearby visible allies immediately move up to speed as reactions without provoking opportunity attacks.

GOI-015 — Reactive Stealth

• Canonical ID: 810160a476804e61 · Page: 22 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, reaction, action_economy, mobility, positioning, stealth, concealment, cover, evasion
• Rationale: A missed ranged attack while the user has cover or concealment can trigger half-speed movement followed by a Stealth attempt to become hidden.

GOI-016 — Revolutionary Rhetoric

• Canonical ID: 46ebeef2d6de4837 · Page: 22 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, skills, mind-affecting, control, manipulation, battlefield_control, will_defense, standard_action, action_economy
• Rationale: A standard-action Persuasion check against Will imposes a mind-affecting action restriction, limiting the target to move and swift actions until the end of the next turn unless attacked.

GOI-017 — Coordinated Effort

• Canonical ID: 527289442596a891 · Page: 23 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, damage_bonus, melee, ranged
• Rationale: Aid Another on the Dedicated Protector target’s attack also grants that ally a +2 damage bonus, improving coordinated melee or ranged offense.

GOI-018 — Crowd Control

• Canonical ID: 8a412e9a700b06d5 · Page: 23 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: grab, restrain, control, battlefield_control, positioning
• Rationale: Expands the grab mechanic to restrain two adjacent creatures simultaneously, increasing close-range control coverage.

GOI-019 — Disarm and Engage

• Canonical ID: f61d70448c4cd14e · Page: 23 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: control, battlefield_control, action_economy, burst_damage, equipment, melee, ranged
• Rationale: A successful disarm immediately converts the captured weapon into a free follow-up attack, creating control plus burst offense regardless of whether the weapon is melee or ranged.

GOI-020 — Reverse Strength

• Canonical ID: 002c2d4fd8383a3e · Page: 23 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: grapple, control, battlefield_control, melee, unarmed, damage, scaling
• Rationale: A successful grapple deals damage based on the opponent’s Strength modifier, turning close-control success into scaling damage.

GOI-021 — Sizing Up

• Canonical ID: 95579a44ff466f19 · Page: 23 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: perception, awareness, skills, will_defense, target-designation, targeting, setup, precision, once-per-encounter
• Rationale: Once per encounter, a Perception check against a visible target’s Will designates that target for encounter-long bonuses to the user’s attacks and skill checks against it.

GOI-022 — Clip

• Canonical ID: 52bedcae0b3729de · Page: 24 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, damage_reduction, survivability, durability
• Rationale: When ramming, the user’s ship is treated as two size categories smaller only for collision damage it receives, improving vehicle durability without reducing damage dealt to the target.

GOI-023 — Dedicated Guardian

• Canonical ID: 562148487d7aa43c · Page: 24 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, ally-trigger, support, teamwork, defense, evasion, damage_reduction, flanking, positioning, melee, reaction, swift_action, action_economy, once-per-encounter, survivability
• Rationale: Three once-per-encounter protector modes grant an ally area-attack defense, transfer condition-track loss from the ally to the user, or create flanking through adjacency.

GOI-024 — Master Defender

• Canonical ID: 5ba7da84697a94dd · Page: 24 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, defense, fighting_defensively, survivability
• Rationale: Fighting defensively trades attack accuracy for a large dodge bonus to the vehicle’s Reflex Defense, with the attack penalty shared by the user and gunners.

GOI-025 — Shunt Damage

• Canonical ID: a12b5e12c3358182 · Page: 24 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, skills, damage_reduction, survivability, positioning, once-per-encounter
• Rationale: Once per encounter, a Pilot check can redirect damage from the user’s ship to an adjacent allied ship, protecting the user’s vehicle through positional damage shunting.

GOI-026 — Attract Superior Minion

• Canonical ID: 9ef268e31963cf70 · Page: 25 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: minion, followers, scaling, resources
• Rationale: Upgrades Attract Minion to provide a nonheroic follower whose class level scales directly with the user’s character level.

GOI-027 — Contingency Plan

• Canonical ID: 7a8b247639d32740 · Page: 25 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, reaction, action_economy, mobility, positioning, evasion, skills, opposed_check
• Rationale: Once per encounter, failure on an attack, skill check, or opposed-check talent can be converted into immediate full-speed reactive movement.

GOI-028 — Damaging Disarm

• Canonical ID: dceb4b975170edda · Page: 25 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, control, battlefield_control, damage, precision
• Rationale: A successful ranged disarm retains half the attack’s damage, combining ranged precision/control with direct damage.

GOI-029 — Revealing Secrets

• Canonical ID: 71908efcdb7e6711 · Page: 25 · Source: Galaxy of Intrigue_djvu.txt · Authority: TXT_VERIFIED
• Final tags: investigation, intrigue, skills, social, social_network, network, resources
• Rationale: Gather Information checks for secret information become substantially easier and cheaper, improving investigative social-network access to hidden information.

## Phase 12-1F — Saga Edition Core Rulebook

Status: Design pass complete
Orphans reviewed: 28
Certified: 28
Deferred: 0
Source method: TXT first; PDF only where extraction was materially corrupted or incomplete
PDF escalations: 6

The Core Rulebook TXT was sufficient for 22 records. Six records were verified against the rendered PDF because the TXT dropped headings/values, changed a meaningful word, or interleaved two-column text: Attune Armor, Flight, Force Cloak Mastery, Linked Defense, Greater Weapon Specialization, and Severing Strike.

CORE-001 — Ignite Fervor

• Canonical ID: 0703de963a247170 · Page: 43 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, damage_bonus, melee, ranged, scaling, action_economy
• Rationale: After the user hits with a melee or ranged attack, a free action grants one visible ally level-scaled bonus damage on that ally’s next attack.

CORE-002 — Improved Weaken Resolve

• Canonical ID: f3ac8054a0c60760 · Page: 43 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, intimidation, social, fear, mind-affecting, control, battlefield_control, damage_threshold, will_defense, mobility
• Rationale: Enhances Weaken Resolve so its damage-threshold-triggered, Persuasion-vs-Will fear effect continues forcing the target to flee even after the target is wounded.

CORE-003 — Weaken Resolve

• Canonical ID: 28c306c37ccb9fcf · Page: 43 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, intimidation, social, fear, mind-affecting, control, battlefield_control, damage_threshold, will_defense, mobility, action_economy, force_point_spend, resource_spend
• Rationale: Once per round after dealing threshold-level damage, a free-action Persuasion check against Will can force a lower-level target to flee; a Force Point can negate the mind-affecting fear effect.

CORE-004 — Coordinate

• Canonical ID: a52044feeab3fe05 · Page: 44 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, leadership, standard_action, action_economy, scaling
• Rationale: A standard action improves the Aid Another bonuses granted by visible allies, with repeated selections increasing the bonus up to +5.

CORE-005 — Distant Command

• Canonical ID: 64fa257cd511314d · Page: 44 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, leadership, positioning
• Rationale: Extends Born Leader support so affected allies retain its benefit even after line of sight to the leader is broken.

CORE-006 — Fearless Leader

• Canonical ID: 226e4f61e29df36f · Page: 44 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, leadership, morale, fear, will_defense, defense, swift_action, action_economy
• Rationale: A swift action grants allies an encounter-long morale bonus to Will Defense against fear while they retain line of sight to the leader.

CORE-007 — Wealth

• Canonical ID: 37bf53b4b2c0e539 · Page: 44 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: resources, scaling
• Rationale: Provides recurring credits equal to 5,000 times noble level whenever the character gains a level.

CORE-008 — Walk the Line

• Canonical ID: 3f8f5305eabc525e · Page: 46 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: control, battlefield_control, positioning, standard_action, action_economy, setup
• Rationale: A standard action imposes a temporary penalty to all defenses on every visible opponent within 6 squares, creating broad short-duration battlefield vulnerability.

CORE-009 — Hyperdriven

• Canonical ID: 29f73c36cabdeaf5 · Page: 47 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, space, skills, ability_enhancement, precision, scaling, reliability
• Rationale: Once per day aboard a starship, adds class level to one attack roll, skill check, or ability check, with the bonus allowed after seeing the original result.

CORE-010 — Starship Raider

• Canonical ID: 224906e573330bf2 · Page: 47 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, space, precision
• Rationale: Provides a persistent +1 attack bonus while aboard a starship, applying to both starship weapons and personal weapons used aboard the vessel.

CORE-011 — Total Concealment

• Canonical ID: 9d183b40a16b1376 · Page: 49 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: concealment, stealth, defense, evasion, survivability
• Rationale: Upgrades any source of concealment into total concealment, materially improving stealth, defense, and evasion.

CORE-012 — Unbalance Opponent

• Canonical ID: e293cb03d35c2bff · Page: 52 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, control, target-designation, melee_defense, defense
• Rationale: Designates a size-comparable opponent and suppresses that opponent’s Strength bonus on attack rolls against the user, improving melee defense through targeted control.

CORE-013 — Devastating Attack

• Canonical ID: 383915a7d11e1225 · Page: 53 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: weapon_training, damage_threshold, melee, ranged, targeting
• Rationale: For a chosen proficient exotic weapon or weapon group, successful attacks treat the target’s Damage Threshold as 5 lower; Heavy Weapons can extend the mechanic to vehicle weapon attacks.

CORE-014 — Attune Armor

• Canonical ID: b315da0532ce8b75 · Page: 107 · Source: Star Wars Saga Edition.pdf · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: force, armor, equipment, empowerment, modification, defense, force_point_spend, resource_spend, action_economy
• Rationale: A full-round Force Point expenditure permanently modifies a suit of armor for the user, increasing its armor bonus and maximum Dexterity bonus.

CORE-015 — Charm Beast

• Canonical ID: c919d7682bd9df40 · Page: 107 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, beast, persuasion, social, skills, skill_substitution, manipulation, control
• Rationale: Substitutes Use the Force for Persuasion when changing the attitude of low-Intelligence undomesticated creatures and removes the normal language penalty.

CORE-016 — Command Beast

• Canonical ID: 6f158211516da82a · Page: 107 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: beast, nature, control, mount, ride, rider
• Rationale: Turns a beast whose attitude has been improved to indifferent or friendly into a domesticated animal for the user and permits qualifying beasts to serve as mounts.

CORE-017 — Flight

• Canonical ID: c518a366d0eb0a8a · Page: 107 · Source: Star Wars Saga Edition.pdf · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: force, force_point_spend, resource_spend, swift_action, action_economy, mobility, movement, positioning, exploration
• Rationale: A swift-action Force Point expenditure grants temporary flight at land speed, with altered ascent/descent rates until the start of the next turn.

CORE-018 — Force Cloak Mastery

• Canonical ID: f3b8b39d4906007d · Page: 107 · Source: Star Wars Saga Edition.pdf · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: force, concealment, stealth, ally_support, support, teamwork, sensors, infiltration, scaling, swift_action, action_economy
• Rationale: Expands Force Cloak from self-only protection to a bubble covering a number of creatures, including the user, equal to character level while retaining the cloak’s sensor/surveillance concealment.

CORE-019 — Linked Defense

• Canonical ID: dd7a357a59b8ebc0 · Page: 107 · Source: Star Wars Saga Edition.pdf · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: force, force_support, force_defense, ally_support, support, teamwork, defense, positioning, scaling, swift_action, action_economy
• Rationale: A swift action trades up to -5 from the user’s attacks for an equal Force bonus to a visible ally’s Reflex Defense, capped by base attack bonus.

CORE-020 — Dogfight Gunner

• Canonical ID: f52cadb1ae252d0c · Page: 207 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, space, ranged, targeting, pursuit
• Rationale: Removes the normal dogfight attack penalty from vehicle-weapon attacks even when the user is serving as gunner rather than pilot.

CORE-021 — Quick Trigger

• Canonical ID: 12ffb24378b60c13 · Page: 207 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, ranged, attack_of_opportunity, reaction, counterattack, positioning, pursuit, targeting, action_economy
• Rationale: Enemy vehicle movement out of the user’s square or an adjacent square triggers a vehicle attack as an attack of opportunity.

CORE-022 — Relentless Pursuit

• Canonical ID: b7caecab09bb3f77 · Page: 207 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, skills, opposed_check, reroll, reliability, pursuit, space
• Rationale: Rolls twice and keeps the better result on opposed Pilot checks made to initiate a dogfight.

CORE-023 — Notorious

• Canonical ID: c67cbd59abd1cc53 · Page: 209 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: social, persuasion, intimidation, fear, skills, reroll, reliability
• Rationale: When undisguised, rerolls Persuasion checks made to intimidate and keeps the better result.

CORE-024 — Exotic Weapon Mastery

• Canonical ID: fb103ac0e4501e95 · Page: 212 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: exotic_weapon, weapon_training
• Rationale: Treats the user as proficient with every exotic weapon, removing the normal need for individual Exotic Weapon Proficiency feats.

CORE-025 — Greater Weapon Specialization

• Canonical ID: e9820b341bf94de1 · Page: 212 · Source: Star Wars Saga Edition.pdf · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: weapon_specialization, weapon_training, damage_bonus, melee, ranged, sustained_damage
• Rationale: For a chosen exotic weapon or weapon group, grants another +2 damage that stacks with Weapon Specialization; the selectable groups span melee and ranged weapons.

CORE-026 — Severing Strike

• Canonical ID: efd3308a8ccc22c6 · Page: 218 · Source: Star Wars Saga Edition.pdf · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: lightsaber, melee, damage_threshold, precision, control, battlefield_control, mobility
• Rationale: When a lightsaber hit would otherwise kill and also meets the target’s Damage Threshold, converts the attack into half damage, a condition-track penalty, and a precise limb-severing injury with lasting combat/mobility penalties.

CORE-027 — Shift Defense II

• Canonical ID: c6739fcf6d2107d6 · Page: 222 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: swift_action, action_economy, defense, setup
• Rationale: A swift action trades a -5 penalty to one defense for a +2 competence bonus to another defense until the next turn.

CORE-028 — Shift Defense III

• Canonical ID: 6996c6ba09d63ab7 · Page: 222 · Source: Core Rulebook_djvu.txt · Authority: TXT_VERIFIED
• Final tags: swift_action, action_economy, defense, setup
• Rationale: A swift action grants +5 competence to one defense by imposing -5 on the other two defenses until the next turn.

## Phase 12-1G — Knights of the Old Republic Campaign Guide

• Orphans reviewed: 20
• TXT verified: 20
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 20
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 245 / 311 reviewed · 243 certified · 2 deferred · 66 pending

KOTOR-001 — Weak Point

• Canonical ID: 18bbce2836989fc5 · Page: 28 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: damage_reduction, targeting, swift_action, action_economy, once-per-encounter, sustained_damage, target-designation
• Rationale: Once per encounter, a swift action designates one visible target and ignores that target’s Damage Reduction for the rest of the user’s turn, allowing repeated attacks that turn to bypass DR.

KOTOR-002 — Improved Redirect

• Canonical ID: 366ac9dea2e484d3 · Page: 39 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, deflect, ranged, ranged_defense, counterattack, reaction, action_economy, use_the_force, reliability
• Rationale: Once per turn, a successful Redirect Shot does not count the triggering Deflect toward the cumulative Use the Force penalty, preserving repeated ranged defense and redirect reliability.

KOTOR-003 — Call Out

• Canonical ID: 5c3036b82c047490 · Page: 44 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: social, mind-affecting, control, battlefield_control, target-designation, ally_support, support
• Rationale: Enhances Personal Vendetta against one designated target, increasing the mind-affecting taunt penalty when that enemy attacks anyone other than the user and thereby protecting allies through target control.

KOTOR-004 — Improved Riposte

• Canonical ID: 91c910b9c46a8649 · Page: 39 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, block, melee, melee_defense, counterattack, reaction, action_economy, use_the_force, reliability
• Rationale: Once per turn, a successful Riposte does not count the triggering Block toward the cumulative Use the Force penalty, preserving repeated melee defense and counterattack reliability.

KOTOR-005 — Mandalorian Ferocity

• Canonical ID: 9d1c806bdee12411 · Page: 38 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, ranged, damage_bonus, burst_damage, sustained_damage, once-per-encounter, weapon_training
• Rationale: Once per encounter while making multiple attacks, adds one damage die to every successful hit with one selected proficient weapon group or exotic weapon, producing a multi-hit damage burst across melee or ranged weapon scopes.

KOTOR-006 — Slippery Strike

• Canonical ID: a1a905019e7f17c0 · Page: 27 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: once-per-encounter, reaction, action_economy, attack_of_opportunity, evasion, mobility, positioning, setup
• Rationale: After damaging an opponent, a once-per-encounter reaction prevents that opponent from making attacks of opportunity against the user through the end of the next turn, enabling safer repositioning and Strike and Run movement.

KOTOR-007 — Distracting Attack

• Canonical ID: cdf3e44536031f53 · Page: 44 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, ranged, will_defense, control, battlefield_control, setup, targeting, precision
• Rationale: A damaging melee or ranged attack that also meets the target’s Will Defense imposes a Reflex Defense penalty until the end of the user’s next turn, setting that target up for follow-on attacks.

KOTOR-008 — Sith Alchemy

• Canonical ID: eeecb3737aabf789 · Page: 41 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, dark_side, dark_side_score, alchemy, crafting, equipment, talisman, weapon_empowerment, empowerment, modification, force_point_spend, resource_spend, damage_bonus, force_offense, force_power_synergy, lightsaber, melee, action_economy, sustained_damage
• Rationale: Spends Force Points to create a dark-side talisman or Sith-alchemical weapon; the talisman persistently boosts Force-power damage and can support lightsaber offense, while the weapon branch applies the Sith alchemical weapon template.

KOTOR-009 — Multiattack Proficiency (exotic weapons)

• Canonical ID: 66c8f9d94547b5e6 · Page: 45 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: exotic_weapon, full_attack, sustained_damage, precision, weapon_training
• Rationale: Reduces full-attack penalties for multiple attacks with exotic weapons; repeated selections reduce the penalty further.

KOTOR-010 — Multiattack Proficiency (advanced melee weapons)

• Canonical ID: 35375c6c9505e6f5 · Page: 47 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: melee, full_attack, sustained_damage, precision, weapon_training
• Rationale: Reduces full-attack penalties for multiple attacks with advanced melee weapons; repeated selections reduce the penalty further.

KOTOR-011 — Action Exchange

• Canonical ID: 837af2972223104f · Page: 57 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_support, ally_support, support, teamwork, action_economy, move_action, standard_action, once-per-encounter
• Rationale: A successful Force Delay lets one nearby ally trade a move action for an additional standard action on the ally’s next turn, directly improving allied action economy.

KOTOR-012 — Imbue Item

• Canonical ID: 5e972b61a1f9ecce · Page: 58 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, equipment, crafting, modification, empowerment, resources, force_point_spend, resource_spend, swift_action, action_economy
• Rationale: Imbues a specially crafted item so it can store one transferred Force Point and later spend that stored point as a swift action, creating an equipment-based Force resource reserve.

KOTOR-013 — Knowledge of the Force

• Canonical ID: 04eca2813630e8d4 · Page: 58 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, force_support, ally_support, support, teamwork, skills, reaction, action_economy, force_point_spend, resource_spend
• Rationale: Spends a Force Point as a reaction to Aid Another on a nearby ally’s Use the Force check, directly converting the user’s Force resource into skill support.

KOTOR-014 — Conceal Force Use

• Canonical ID: deb5ce7af3c824ff · Page: 58 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, deception, skills, stealth, concealment, infiltration, swift_action, action_economy
• Rationale: Whenever the user makes a Use the Force check, a swift-action Deception check can conceal the outward effects of that Force use, supporting covert and infiltrative Force activity.

KOTOR-015 — Force Direction

• Canonical ID: d65ad7fb7a374762 · Page: 58 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_offense, ranged, offense_ranged, precision, reliability, force_point_spend, resource_spend
• Rationale: When a Force Point is spent to improve a ranged attack roll, replaces the Force die with a guaranteed high result, making Force-assisted ranged accuracy more reliable.

KOTOR-016 — Force Momentum

• Canonical ID: 4cb2cf521a4d2175 · Page: 58 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_offense, melee, offense_melee, precision, damage_bonus, burst_damage, force_point_spend, resource_spend
• Rationale: A Force Point spent to improve a melee attack roll also adds that same result to damage if the attack hits, converting the accuracy resource spend into additional melee burst damage.

KOTOR-017 — Past Visions

• Canonical ID: 462df9a631ee50f4 · Page: 58 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, use_the_force, visions, senses, investigation, recon, exploration
• Rationale: Improves farseeing into the past by halving its DCs and revealing the area around the viewed target without the normal Force Point expenditure, strengthening historical investigation and remote reconnaissance.

KOTOR-018 — Improved Force Sight

• Canonical ID: 38f57c9f9cd0b727 · Page: 60 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, perception, skills, senses, detection, recon, awareness, swift_action, action_economy, reliability
• Rationale: Makes Perception Search a swift action and makes Sense Surroundings automatically succeed, improving Force-based detection, awareness, and reconnaissance reliability.

KOTOR-019 — Luka Sene Master

• Canonical ID: b0427980c49cd650 · Page: 60 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, use_the_force, senses, visions, search_your_feelings, recon, detection, resources, force_point_spend, resource_spend, once-per-encounter
• Rationale: Once per encounter, generates a temporary Force Point restricted to sense-related talents, farseeing, Search Your Feelings, or Sense Force, providing a dedicated Force-perception resource that must be spent during the encounter.

KOTOR-020 — Quickseeing

• Canonical ID: 537afb4984d1ca61 · Page: 60 · Source: Knights of the Old Republic Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, force_offense, use_the_force, visions, senses, targeting, precision, will_defense, melee, ranged, action_economy, resource_spend
• Rationale: As a free action, expends one farseeing use to make a Use the Force check against a living target’s Will Defense; success grants an attack-roll bonus against that target for the rest of the turn.

Deferred bucket

UR-022 — Quick Study

• Concept family: TEMPORARY_TALENT_ACCESS
• Canonical ID: fd37b68c6fb620f6 · Page: 23 · Authority: TXT_VERIFIED
• Status: AWAITING_DESIGNER_ADJUDICATION
• Reason: Copies an enemy non-Force talent for use on the next turn. Existing counterattack/reaction/support tags are materially incomplete or misleading for the core mimicry mechanic.
• Concept needed: Talent/ability mimicry or temporary copied-option access. No new tag is authorized yet.

GOI-002 — Done It All

• Concept family: TEMPORARY_TALENT_ACCESS
• Canonical ID: d376f165f1a47281 · Page: 20 · Authority: TXT_VERIFIED
• Status: AWAITING_DESIGNER_ADJUDICATION
• Reason: Selects two qualifying talents the character does not possess, then spends a Force Point to gain one temporarily. Existing Force/resource/action tags describe the activation cost but not the defining mechanic of temporary talent access.
• Concept needed: Temporary access to a talent/ability the character does not possess. No new tag is authorized yet.

────────

## Phase 12-1H — Scavenger’s Guide to Droids

• Orphans reviewed: 19
• TXT verified: 19
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 19
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 264 / 311 reviewed · 262 certified · 2 deferred · 47 pending

SGD-001 — Directed Movement

• Canonical ID: 510d4b2aadbbc2de · Page: 28 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, move_action, action_economy, mobility, movement, skills, ability_enhancement
• Rationale: A move action grants one droid its movement, permits movement-related skill checks during that movement, and lets those checks use the controller’s Intelligence modifier in place of the droid’s relevant ability modifier.

SGD-002 — Full Control

• Canonical ID: 67c0e483d52bee0d · Page: 28 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, full_attack, sustained_damage, action_economy, precision, ability_enhancement
• Rationale: A full-round action grants one droid a full attack and lets its attack rolls use the controller’s Intelligence modifier in place of the droid’s relevant ability modifier.

SGD-003 — Remote Attack

• Canonical ID: 86da8cfcddb94adb · Page: 28 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, standard_action, action_economy, melee, ranged, precision, ability_enhancement
• Rationale: A standard action grants one droid a melee or ranged attack and lets that attack roll use the controller’s Intelligence modifier in place of the droid’s relevant ability modifier.

SGD-004 — Known Vulnerability

• Canonical ID: 852c4b043904102f · Page: 26 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: knowledge, science, skills, setup, melee, unarmed, control, battlefield_control
• Rationale: A life-sciences check identifies a species’ vulnerable points; for the encounter, damaging melee or unarmed hits against that species impose an attack penalty through the user’s next turn.

SGD-005 — Medical Analyzer

• Canonical ID: 7fb6b7d078bdb493 · Page: 26 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, medical, medicine, treat_injury, skills, poison, recovery, ability_enhancement
• Rationale: For a medical droid, adds Intelligence to Treat Injury checks used to treat disease, poison, or radiation, improving medical-condition treatment rather than direct hit-point healing.

SGD-006 — Science Analyzer

• Canonical ID: 739397eded522cd8 · Page: 26 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: knowledge, science, skills, ability_enhancement
• Rationale: Adds double the user’s Intelligence modifier to Knowledge (life sciences) or Knowledge (physical sciences) checks.

SGD-007 — Triage Scan

• Canonical ID: c9433c6bcb4133d5 · Page: 26 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, medical, medicine, treat_injury, skills, standard_action, action_economy, detection, awareness
• Rationale: A standard-action Treat Injury check scans nearby visible organic characters and identifies who is below half hit points and each target’s condition-track position.

SGD-008 — On-Board System Link

• Canonical ID: 31461ebe45c5f4c9 · Page: 26 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, tech, power_systems, shields, swift_action, action_economy
• Rationale: While physically linked to a vehicle or starship, reduces the action cost of rerouting power or recharging shields from three swift actions to two.

SGD-009 — Quick Astrogation

• Canonical ID: cdbaa45c44141d9c · Page: 26 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: use_computer, skills, space, exploration, standard_action, action_economy
• Rationale: Cuts astrogation calculation time in half and allows an Astrogate Use Computer check as a standard action instead of a full-round action.

SGD-010 — Scomp Link Slicer

• Canonical ID: 3b38783594bcebce · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: slicing, use_computer, tech, skills, once-per-encounter, control, opposed_check, reaction, action_economy, infiltration, reliability
• Rationale: While physically linked to a computer, provides three once-per-encounter slicing advantages: faster program eradication, opposed-check lockout control, and reaction-based prevention of tracing.

SGD-011 — Nuanced

• Canonical ID: 8f4fed2c36ab4c2a · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: persuasion, social, skills, once-per-encounter, ability_enhancement
• Rationale: Once per encounter, adds the user’s Wisdom bonus in addition to Charisma bonus on a Persuasion check.

SGD-012 — Supervising Droid

• Canonical ID: 0025737e7198390e · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, skills, standard_action, swift_action, action_economy, once-per-encounter, reliability
• Rationale: Provides three once-per-encounter supervisory modes for droid allies: automatic attack Aid Another, automatic trained-skill assistance, or an immediately usable extra swift action for an ally.

SGD-013 — Talkdroid

• Canonical ID: 4e52d41e355b5923 · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, persuasion, social, skills
• Rationale: When translating between an ally and a creature that cannot understand that ally, improves the ally’s Persuasion check to change the creature’s attitude.

SGD-014 — Just a Scratch

• Canonical ID: 81acbac191981ace · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: armor, defense, damage_reduction, resilience, survivability, reaction, action_economy, once-per-encounter
• Rationale: Once per encounter as a reaction, reduces damage from one attack targeting Reflex Defense by an amount equal to the user’s Fortitude Defense.

SGD-015 — Target Lock

• Canonical ID: 3d2805cd83bb0cc4 · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: targeting, target-designation, perception, skills, detection, stealth, reaction, action_economy, reliability
• Rationale: Maintains a Target Acquisition lock by automatically reacquiring the target as a reaction when line of sight returns and grants +5 Perception against that target’s Stealth.

SGD-016 — Weapons Power Surge

• Canonical ID: 09e7eeda16a7814f · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, damage_bonus, burst_damage, once-per-encounter, action_economy, resource_spend, equipment, power_systems
• Rationale: Once per encounter, overdrives a chassis-mounted internally powered weapon for one or two extra damage dice by paying one condition-track step per added die.

SGD-017 — Durable

• Canonical ID: c5410351fc7c7aa7 · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, durability, resilience, survivability, force_point_spend, resource_spend, reaction, action_economy, once-per-encounter
• Rationale: Prevents the first encounter effect that would move the droid to the bottom of the condition track from moving it below -10; a Force Point reaction can also reduce a multi-step condition loss from one attack to a single step.

SGD-018 — Load Launcher

• Canonical ID: b1090fa2d2ebc982 · Page: 27 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: improvised_weapon, ranged, weapon_training, damage_bonus, scaling
• Rationale: Grants proficiency with improvised thrown weapons, expands throwable object size and range from Strength, and adds Strength bonus to damage.

SGD-019 — Task Optimization

• Canonical ID: 8f26ca25481d612f · Page: 28 · Source: Scavenger's Guide to Droids_djvu.txt · Authority: TXT_VERIFIED
• Final tags: skills, once-per-encounter, action_economy
• Rationale: For one selected trained skill, once per encounter performs an eligible application one action category faster, never faster than a swift action.

## Phase 12-1I — Clone Wars Campaign Guide

• Orphans reviewed: 13
• TXT verified: 13
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 13
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 277 / 311 reviewed · 275 certified · 2 deferred · 34 pending

CW-001 — Quick Modifications

• Canonical ID: 1e32cec439c5ecad · Page: 45 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: crafting, tech, modification, equipment
• Rationale: When creating a field-created weapon, applies one Tech Specialist weapon modification at creation, extending rapid weapon crafting with a direct equipment modification.

CW-002 — Undying Loyalty

• Canonical ID: 2a209f3e58d8528c · Page: 23 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: followers, minion, ally_support, support, survivability, durability
• Rationale: Improves every follower’s durability by granting each the Toughness feat.

CW-003 — Coordinated Tactics

• Canonical ID: 4559e2e975f552fa · Page: 26 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: followers, minion, ally_support, support, teamwork, tactics
• Rationale: Grants every qualifying follower Coordinated Attack, improving coordinated attacks among the user’s followers.

CW-004 — Exploit Weakness

• Canonical ID: 8ba50ebccb1f938e · Page: 42 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, setup, control, battlefield_control, targeting, precision
• Rationale: After Assault Tactics marks a target, each allied damaging hit cumulatively lowers that target’s Reflex Defense, making subsequent attacks against it progressively easier.

CW-005 — Ambush

• Canonical ID: c5996de1e3c69c04 · Page: 40 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ambush, burst_damage, damage_bonus, melee, ranged
• Rationale: A successful hit against an opponent that has not yet acted in combat deals two extra damage dice, rewarding opening attacks without requiring an actual surprise round.

CW-006 — Hunt the Hunter

• Canonical ID: cb018e0f620614fd · Page: 25 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: perception, skills, detection, awareness, stealth, recon, standard_action, action_economy, melee, ranged
• Rationale: A standard-action active search for hidden enemies also grants one melee or ranged attack against an enemy revealed by that Perception check.

CW-007 — Keep Them at Bay

• Canonical ID: ff3b4c48d0a05a16 · Page: 26 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ranged, support, teamwork, control, battlefield_control, targeting
• Rationale: Using Aid Another to suppress an enemy imposes a -5 penalty on that enemy’s next attack instead of the normal -2.

CW-008 — Automated Strike

• Canonical ID: 6b2b31d1b90739d1 · Page: 43 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, tactics, knowledge, skills, swift_action, action_economy, full_attack, sustained_damage, weapon_training
• Rationale: A swift-action Knowledge (tactics) check temporarily grants all droid allies that can hear the user the benefits of Double Attack for one proficient weapon group.

CW-009 — Droid Mettle

• Canonical ID: e55e9497ecf6303d · Page: 43 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, survivability, durability, swift_action, action_economy, scaling
• Rationale: Once per turn as a swift action, grants one visible droid ally bonus hit points equal to 10 plus class level.

CW-010 — Inspire Competence

• Canonical ID: 853d7f87a4610f85 · Page: 44 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, targeting, precision, swift_action, action_economy, scaling
• Rationale: Once per turn as a swift action, grants one visible droid ally a class-level-scaling competence bonus on its next attack and lets Networked Mind targets count as having a heuristic processor when beneficial.

CW-011 — Maintain Focus

• Canonical ID: 1e984785c24ab9c0 · Page: 44 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, recovery, condition_removal, swift_action, action_economy
• Rationale: Once per turn as a swift action, lets all visible droid allies use Recover with two swift actions instead of three, accelerating positive condition-track recovery.

CW-012 — Overclocked Troops

• Canonical ID: f09bb97395175598 · Page: 44 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, mobility, movement, positioning, swift_action, action_economy
• Rationale: Once per turn, a swift action lets every networked droid ally immediately move up to its speed.

CW-013 — Reinforced Commands

• Canonical ID: 6bfdeeec8ccd21bb · Page: 44 · Source: Clone Wars Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: droid, ally_support, support, teamwork, morale, empowerment
• Rationale: Improves commands that grant a droid ally a morale or insight bonus by increasing the granted bonus by 1.

## Phase 12-1J — Legacy Era Campaign Guide

• Orphans reviewed: 12
• TXT verified: 12
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 12
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 289 / 311 reviewed · 287 certified · 2 deferred · 22 pending

LEG-001 — Unbalancing Adaptation

• Canonical ID: 02bf213d8104b017 · Page: 30 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: control, battlefield_control, morale
• Rationale: When Adapt and Survive copies a morale or insight bonus, also denies that triggering bonus to one visible enemy, turning the enemy’s temporary advantage into a controlled debuff.

LEG-002 — Surprising Weapons

• Canonical ID: 6ef0900cd62869e7 · Page: 29 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: biotech, melee, ranged, will_defense, precision, control, setup
• Rationale: A hit with an amphistaff, thud bug, or razor bug that also beats Will Defense leaves the target flat-footed against the user through the next turn.

LEG-003 — Adapt and Survive

• Canonical ID: ef8a59509a45df46 · Page: 30 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: morale, empowerment
• Rationale: Whenever a visible enemy receives a morale or insight bonus, the user copies that bonus through the end of the next turn.

LEG-004 — Cloak of Shadow

• Canonical ID: b3fe6f7659b40a55 · Page: 57 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, swift_action, action_economy, concealment, stealth, mobility, movement, evasion, defense
• Rationale: Spends a Force Point as a swift action to create an encounter-long state in which moving at least 3 squares grants concealment until the next turn.

LEG-005 — Phantasm

• Canonical ID: 943f8753f56f3a63 · Page: 57 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, mind-affecting, illusion, concealment, ally_support, support, force_point_spend, resource_spend, swift_action, action_economy, defense, evasion
• Rationale: After successfully affecting a target with a mind-affecting Force power, a Force Point and swift action create phantoms that give the user and visible allies concealment from that target.

LEG-006 — Revelation

• Canonical ID: 35af8366f831bd8b · Page: 58 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, use_the_force, standard_action, action_economy, detection, concealment, targeting, precision, will_defense, control
• Rationale: A standard-action Use the Force check against Will exposes a concealed enemy and removes that target’s concealment bonus to Reflex Defense through the next turn.

LEG-007 — Shadow Armor

• Canonical ID: 4916dbbae0f18ee1 · Page: 58 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, defense, evasion, swift_action, action_economy, scaling
• Rationale: A swift action grants a Force bonus to Reflex Defense, with repeated selections scaling the bonus up to +4.

LEG-008 — Shadow Vision

• Canonical ID: 66b3278292626e27 · Page: 58 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, senses, detection, awareness, concealment, swift_action, action_economy
• Rationale: A swift action grants low-light vision and allows the user to ignore ordinary concealment from darkness for five minutes or the encounter.

LEG-009 — Reading the Flame

• Canonical ID: 12f61917f809a3fb · Page: 59 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_power_synergy, use_the_force, visions, search_your_feelings, precognition, meditation, reroll, reliability
• Rationale: While using farseeing or Search Your Feelings, rerolls the Use the Force check and keeps the better result, representing flame-mediated divination.

LEG-010 — Sword of Vahl

• Canonical ID: b1a9d6277428e6c0 · Page: 59 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, weapon_training, precision, melee, ranged
• Rationale: Grants a Force bonus on attack rolls with simple weapons, improving accuracy across simple melee and ranged weapons.

LEG-011 — Vahl’s Brand

• Canonical ID: a5f8ec365ef2b699 · Page: 59 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, weapon_empowerment, empowerment, equipment, damage
• Rationale: Changes the additional damage from an empowered weapon into fire damage, modifying the damage behavior of the empowered weapon.

LEG-012 — Vahl’s Flame

• Canonical ID: 8ba6abad84c6d9ef · Page: 59 · Source: Legacy Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, swift_action, action_economy, melee, damage_bonus, sustained_damage
• Rationale: A swift action wreathes the user’s melee weapon in flame so every successful melee attack through the next turn deals an extra 1d6 damage.

## Phase 12-1K — Scum and Villainy

• Orphans reviewed: 11
• TXT source attempted: 11
• PDF escalations after OCR corruption: 11
• PDF verified: 11
• Certified with final existing-vocabulary tags: 11
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 300 / 311 reviewed · 298 certified · 2 deferred · 11 pending

SAV-001 — Wealth of Allies

• Canonical ID: 397ba7dc962f6ebc · Page: 27 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: followers, minion, resources, resource_recovery
• Rationale: When one of the user’s minions is killed, a same-level replacement arrives 24 hours later, restoring the character’s minion resource.

SAV-002 — Bodyguard II

• Canonical ID: 7679eae1004af0cc · Page: 27 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: followers, minion, ally_support, support, teamwork, defense, survivability, scaling
• Rationale: When Bodyguard I redirects an attack to a minion, that minion gains a defense bonus equal to half the user’s class level against the redirected attack.

SAV-003 — Bodyguard III

• Canonical ID: 9c2a4cbe82e922ec · Page: 27 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: followers, minion, ally_support, support, teamwork, counterattack, melee, ranged, defense, survivability, scaling
• Rationale: When Bodyguard I redirects an attack, the minion may immediately counterattack in melee or at range, and Bodyguard II’s defense bonus increases to the user’s full class level.

SAV-004 — Punch Through

• Canonical ID: a0099db14b3fc3e7 · Page: 25 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: vehicle, pilot, opposed_check, pursuit, control, evasion
• Rationale: When the user pilots a vehicle, smaller vehicles take a -10 penalty rather than -5 on Pilot checks made to engage it in a dogfight, making engagement substantially harder.

SAV-005 — Better Lucky than Dead

• Canonical ID: bea59db82b097eea · Page: 14 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: once-per-encounter, reaction, action_economy, defense, survivability
• Rationale: Once per encounter as a reaction, grants a +5 luck bonus to any one defense until the start of the user’s next turn.

SAV-006 — Inspire Wrath

• Canonical ID: dbe08a93276b6c25 · Page: 27 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: ally_support, support, teamwork, morale, standard_action, action_economy, target-designation, targeting, skills, precision
• Rationale: A standard action designates one enemy as the object of allied wrath, granting allies morale bonuses to attack rolls and skill checks against that target while they retain line of sight.

SAV-007 — Labyrinthine Mind

• Canonical ID: e07f87b5dbcf035f · Page: 15 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: once-per-encounter, reaction, action_economy, mind-affecting, defense, resilience, condition_removal, recovery
• Rationale: Once per encounter as a reaction, becomes immune to harmful mind-affecting effects through the next turn and removes harmful mind-affecting effects already present.

SAV-008 — Crushing Assault

• Canonical ID: e1cb0fd81f7f6d44 · Page: 18 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: weapon_specialization, setup, precision, damage_bonus
• Rationale: After damaging an opponent with a specialized bludgeoning weapon, the user’s next attack against that opponent before the encounter ends gains +2 to both attack and damage; multiple triggers do not stack.

SAV-009 — Uncanny Luck

• Canonical ID: e435b618793d8bc7 · Page: 15 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: once-per-encounter, critical_success, reliability
• Rationale: Once per encounter, treats one d20 roll of 16 or higher as a natural 20.

SAV-010 — Flanking Fire

• Canonical ID: 1f6b9d509a07f881 · Page: 28 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: pistol, ranged, dual_wield, flanking, full_attack, standard_action, action_economy, sustained_damage, positioning
• Rationale: While flanked and wielding two pistols, compresses a qualifying multi-target full attack from a full-round action to a standard action.

SAV-011 — Keep Them Reeling

• Canonical ID: 9fe189e1376feec5 · Page: 33 · Source: SAGA EDITION - Scum and Villainy.pdf (TXT escalation from Scum and Villainy_djvu.txt) · Authority: PDF_VERIFIED_AFTER_TXT_CORRUPTION
• Final tags: melee, standard_action, action_economy, control, battlefield_control, movement, positioning
• Rationale: A standard-action melee hit deals no damage but forces the target to move or withdraw away from the user on its next turn.

## Phase 12-1L — Rebellion Era Campaign Guide

• Orphans reviewed: 8
• TXT verified: 8
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 8
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 308 / 311 reviewed · 306 certified · 2 deferred · 3 pending

REB-001 — Risk for Reward

• Canonical ID: 04b9cb3683c6e485 · Page: 25 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: reaction, action_economy, counterattack, attack_of_opportunity, melee, ranged
• Rationale: Once per turn, being damaged by an attack of opportunity triggers a reaction attack against any target in range.

REB-002 — Noble Sacrifice

• Canonical ID: 1fc568c1bbdd94e0 · Page: 40 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, reaction, action_economy, survivability, durability, scaling
• Rationale: When a successfully recruited target is defeated by someone other than the user or allies, a reaction grants the user and all visible allies class-level-scaling bonus hit points.

REB-003 — Bolstered Numbers

• Canonical ID: 4348c2bca983e4a9 · Page: 40 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, teamwork, morale, precision
• Rationale: Successfully recruiting an enemy grants the user and all visible allies a +2 morale bonus to attack rolls for the rest of the encounter.

REB-004 — Destructive Ambusher

• Canonical ID: 5d608b1083cfc31d · Page: 28 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ambush, targeting, target-designation, damage_bonus, sustained_damage
• Rationale: After designating a prime target, every attack against that target deals one extra damage die for the rest of the encounter.

REB-005 — Luck Favors the Bold

• Canonical ID: c2447676a43a70a2 · Page: 24 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: survivability, durability, scaling, cover, positioning
• Rationale: At the start of each turn, remaining exposed to an aware visible enemy without cover grants level-scaled bonus hit points while the user remains conscious.

REB-006 — Stay in the Fight

• Canonical ID: 6cf364c5b9556770 · Page: 41 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: ally_support, support, reaction, action_economy, healing, recovery, survivability
• Rationale: A successfully recruited target that can catch a second wind may immediately do so as a reaction, producing immediate healing and recovery.

REB-007 — Empower Siang Lance

• Canonical ID: 2bae1dc009d4f2d2 · Page: 37 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: force, force_point_spend, resource_spend, weapon_empowerment, empowerment, equipment, exotic_weapon, ranged, damage_bonus, sustained_damage, action_economy
• Rationale: Spends a Force Point and a full-round action to permanently empower a siang lance for the user, adding one damage die whenever the user wields it.

REB-008 — Shield Gauntlet Redirect

• Canonical ID: 2fe6d21e112e43cd · Page: 37 · Source: Rebellion Era Campaign Guide_djvu.txt · Authority: TXT_VERIFIED
• Final tags: shields, equipment, deflect, ranged_defense, counterattack, ranged, targeting, reaction, action_economy
• Rationale: After successfully deflecting a blaster bolt with an active shield gauntlet, immediately redirects it as a ranged attack against another visible target within 6 squares.

## Phase 12-1M — Starships of the Galaxy

• Orphans reviewed: 3
• TXT verified: 3
• PDF escalations: 0
• Certified with final existing-vocabulary tags: 3
• Deferred vocabulary gaps: 0
• Running Phase 12-1 total after this batch: 311 / 311 reviewed · 309 certified · 2 deferred · 0 pending

SOTG-001 — Personalized Modifications

• Canonical ID: 111b0a9d1f8d5111 · Page: 17 · Source: Starships of the Galaxy_djvu.txt · Authority: TXT_VERIFIED
• Final tags: tech, modification, equipment, standard_action, action_economy, precision, damage_bonus, melee, ranged, sustained_damage
• Rationale: A standard action tunes a powered weapon for the remainder of the encounter, granting persistent equipment bonuses to attack and damage with that weapon, including vehicle and starship weapons.

SOTG-002 — Vehicle Focus

• Canonical ID: 4764dc69f0d11695 · Page: 17 · Source: Starships of the Galaxy_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, pilot, skills, reliability, precision, ranged, targeting
• Rationale: For one vehicle type, improves vehicle-weapon attack rolls as pilot or gunner and allows taking 10 on Pilot checks even under circumstances that normally prevent it.

SOTG-003 — Fleet Tactics

• Canonical ID: d8d7218123a28f39 · Page: 18 · Source: Starships of the Galaxy_djvu.txt · Authority: TXT_VERIFIED
• Final tags: vehicle, tactics, knowledge, skills, standard_action, action_economy, ally_support, support, teamwork, target-designation, targeting, ranged, damage_bonus, sustained_damage, mind-affecting
• Rationale: A standard-action tactics check designates one vehicle for a coordinated assault, causing all visible allied gunners to deal one extra damage die per successful ranged hit until the next turn; the effect is mind-affecting.

## Phase 12-1G–M Quality Sweep — Second Semantic Pass

• Scope: 86 / 86 talents from KOTOR through Starships of the Galaxy re-reviewed.
• Tag arrays revised: 48.
• Tag arrays retained unchanged: 38.
• New vocabulary strings authorized: 0.
• Deferred ontology cases changed: 0.
• Scum and Villainy: 11 / 11 records visually reverified against the PDF after materially corrupted TXT/OCR.
• Claude execution remains disabled.

Quality corrections applied

• Removed structural/context leakage such as droid or minion when the mechanic itself did not establish that scope.
• Removed skill_substitution from ability-modifier replacement mechanics.
• Tightened reliability to outcome-stabilizing mechanics rather than generic bonuses/action compression.
• Tightened condition_removal/recovery to actual recovery or ongoing-effect removal.
• Removed sustained_damage where no repeated/ongoing damage increase exists.
• Added missing direct-scope tags where the mechanic clearly supports them, including precision, condition_removal, healing, target-designation, cover, and action_economy where appropriate.

## Phase 12-1A–F Semantic Tag Quality Sweep (QA3)

Result

• 225 talents re-reviewed across the six early Phase 12-1 sourcebook batches.
• 35 certified tag arrays revised; 188 certified arrays retained unchanged.
• 2 existing TEMPORARY_TALENT_ACCESS deferrals remain unchanged.
• 0 new tags authorized and 0 new ontology gaps created.
• No new source escalation was required.
• Cumulative QA2 + QA3 coverage: 311 / 311 Phase 12-1 orphans re-reviewed.

Revised records

Unknown Regions

• UR-002 — Band Together: added sustained_damage.
  • Directed Attack adds damage to every qualifying allied hit against the designated target through the next turn, so the effect is genuinely repeated/sustained damage support.
• UR-012 — Piercing Hit: added action_economy.
  • The talent explicitly packages standard-action attack modes; action_economy belongs with the existing standard_action scope.
• UR-014 — Silent Movement: added reliability.
  • The talent automatically succeeds at Aid Another for an ally’s Stealth check once per round, which is a direct outcome-stabilizing reliability mechanic.
• UR-020 — Champion: added healing.
  • Champion’s Pride directly augments second wind, so healing is a justified domain tag in addition to condition-track recovery/removal.
• UR-024 — Warrior’s Determination: added action_economy.
  • Warrior’s Determination is explicitly used as a reaction; action_economy was missing from that reaction mechanic.
• UR-031 — Roll Out: added reliability.
  • Roll Out rerolls the disengage Pilot check and keeps the better result, matching the tightened reliability standard.
• UR-035 — Master’s Orders: added reliability.
  • Master’s Orders grants a keep-the-better reroll on an attack or check made during a granted action, directly supporting reliability.
• UR-044 — Turn the Tide: added reroll, ally_support, support, teamwork.
  • Turn the Tide explicitly rerolls Initiative and gives allies an optional beneficial reroll, so reroll plus ally-support/teamwork semantics were missing.
• UR-046 — Negate and Redirect: removed sustained_damage; added action_economy.
  • Negate and Redirect creates an immediate free-action counterstrike, not a sustained-damage state; action_economy replaces the misleading sustained_damage tag.
• UR-047 — Rising Anger: removed dark_side, dark_side_score; added action_economy.
  • Rising Anger’s Dark Side Score is only a prerequisite; the actual benefit is a reaction-based stacking morale attack bonus. Prerequisite-only dark-side tags were removed and action_economy added.

Galaxy at War

• GAW-004 — Commanding Presence: added precision, sustained_damage.
  • Lead the Assault grants allied attack and damage bonuses through the next turn; precision and sustained_damage capture the actual offensive buff.
• GAW-007 — Sly Combatant: removed sustained_damage.
  • Sly Combatant’s three encounter options are discrete attacks/control effects; none creates repeated or ongoing damage output as a core mechanic.
• GAW-020 — Grizzled Warrior: added durability.
  • Defy the Odds grants bonus hit points, making durability a direct defensive mechanic.
• GAW-022 — Stunning Shockboxer: added sustained_damage.
  • Stunning Shockboxer adds an extra damage die to every qualifying unarmed stun attack, directly improving repeated damage output.
• GAW-030 — Harrying Shot: removed sustained_damage.
  • Harrying Shot restricts the target’s next standard-action attack; its rider is control, not sustained damage.
• GAW-032 — Keep Them Honest: removed sustained_damage.
  • Keep Them Honest increases an enemy attack penalty from suppression; it is control/support rather than damage output.
• GAW-042 — Tae-Jitsu Expertise: removed sustained_damage.
  • Tae-Jitsu Expertise moves a target down the condition track; it does not improve damage output.

Jedi Academy Training Manual

• JATM-030 — Cycle of Harmony: added durability.
  • Cycle of Harmony grants scaling bonus hit points to an ally, so durability is directly applicable.
• JATM-032 — Repel Discord: added scaling.
  • Repel Discord’s penalty is explicitly equal to the attacker’s Dark Side Score, so its magnitude scales with a score.
• JATM-043 — Weapon Specialization (discblade): added sustained_damage.
  • Weapon Specialization (discblade) applies a persistent +2 melee damage bonus to qualifying attacks, a direct sustained-damage profile.

Force Unleashed Campaign Guide

• TFU-013 — Ion Mastery: added sustained_damage.
  • Ion Mastery applies its extra ion damage on every qualifying ion-weapon attack, so sustained_damage is justified.
• TFU-023 — Dull the Pain: removed healing.
  • Dull the Pain moves a target up the condition track but restores no hit points; recovery/condition_removal are accurate, healing is not.
• TFU-029 — Droid Smash: added sustained_damage.
  • Droid Smash persistently increases one-handed melee damage through Strength contribution, directly improving sustained damage output.
• TFU-030 — Environmentally Shielded: removed equipment.
  • Environmentally Shielded grants an equipment-type bonus but does not manipulate or depend on an item; the equipment tag was bonus-type leakage.

Galaxy of Intrigue

• GOI-004 — Guaranteed Boon: removed reliability.
  • Guaranteed Boon refunds a Force Point after a failed skill-challenge check; this is resource recovery, not roll reliability.
• GOI-005 — Leading Skill: removed reliability.
  • Leading Skill grants a numerical setup bonus to a later check; it does not reroll, fix, floor, or otherwise stabilize the roll.
• GOI-006 — Learn from Mistakes: removed reliability.
  • Learn from Mistakes grants an ally a numerical setup bonus; that is support/setup rather than reliability.
• GOI-008 — Retaliation: removed condition_removal.
  • Retaliation inflicts a condition-track step on the target; it does not remove or recover a condition.
• GOI-011 — For the Cause: added precision.
  • For the Cause grants a direct bonus to allied attack rolls as well as damage, so precision was missing.
• GOI-023 — Dedicated Guardian: removed condition_removal, recovery.
  • Take the Pain prevents an ally’s condition loss by transferring the same loss to the user; it does not remove an existing condition or recover condition-track position.
• GOI-029 — Revealing Secrets: removed reliability.
  • Revealing Secrets reduces a Gather Information DC and bribery cost; those are investigation/resource improvements, not a reliability mechanic.

Saga Edition Core Rulebook

• CORE-008 — Walk the Line: removed defense; added setup.
  • Walk the Line penalizes opponents’ defenses to set up later actions. It is offensive setup/control, not a defensive benefit to the user.
• CORE-020 — Dogfight Gunner: removed reliability.
  • Dogfight Gunner removes an attack penalty; this is targeting/accuracy scope rather than a reroll/take-10/fixed-result reliability mechanic.
• CORE-024 — Exotic Weapon Mastery: removed equipment, reliability.
  • Exotic Weapon Mastery grants exotic-weapon proficiency. weapon_training and exotic_weapon fully describe it; generic equipment and reliability were redundant/misleading.
• CORE-025 — Greater Weapon Specialization: added sustained_damage.
  • Greater Weapon Specialization permanently increases damage with the selected weapon scope, directly supporting sustained damage output.

Cumulative Phase 12-1 integrity state

• Reviewed: 311 / 311
• Certified: 309
• Deferred: 2
• Certified arrays revised by QA2 + QA3: 83
• Certified arrays retained unchanged after both sweeps: 226
• New vocabulary authorized: 0
• Claude execution contract: disabled

## Phase 12-1A–F Quality Sweep — Global Consistency Pass

• 225 / 225 early-batch orphan talents re-reviewed against the same tightened semantic standard used for 12-1G–M.
• 35 certified tag arrays revised.
• 188 certified tag arrays retained unchanged.
• 2 pre-existing TEMPORARY_TALENT_ACCESS deferrals remain unchanged.
• 0 new tag strings authorized.
• 0 new ontology gaps created.
• No new PDF escalation was required; existing TXT/PDF authority remained sufficient for the disputed assignments.
• Cumulative Phase 12-1 quality-sweep result: 311 / 311 reviewed, 83 certified arrays revised, 226 certified arrays retained, 2 deferred.

## QA3 consistency rules applied

• Structural identity and prerequisites do not justify semantic tags by themselves.
• reliability is reserved for rerolls, take-10/automatic-success, fixed-result, failure-rescue, or comparable outcome-stabilizing mechanics.
• condition_removal / recovery describe actual removal or positive recovery, not inflicted/transferred condition-track loss.
• healing requires actual hit-point/second-wind healing semantics rather than a Treat Injury label alone.
• sustained_damage requires repeated/ongoing damage-output improvement, not generic control or attack penalties.
• Action-type tags are paired with action_economy where the talent itself creates or changes that action behavior.
• Direct attack-roll improvement uses precision; bonus hit points use durability.
• Direct mechanical evidence takes precedence over tree identity, class identity, prerequisite flavor, or bonus-type wording.

## Phase 12-1 Closeout — Orphan Semantic Coverage

• 311 / 311 Phase 12 orphan talents individually reviewed.
• 309 certified with exact final tag arrays from the surviving 184-tag vocabulary.
• 2 deferred for explicit designer ontology adjudication: UR-022 — Quick Study and GOI-002 — Done It All.
• 0 remaining unreviewed orphans.
• 0 new tag strings authorized during Phase 12-1.
• QA2 + QA3 semantic quality sweep complete across all 311 Phase 12-1 orphans.
• Claude execution remains disabled; this rolling authority is still design-only until explicitly marked FINAL_FOR_EXECUTION.

## Rolling batch ledger

|Batch|Sourcebook                                |Orphans|Certified|Deferred|PDF escalations|Status                                                     |
|-----|------------------------------------------|------:|--------:|-------:|--------------:|-----------------------------------------------------------|
|12-1A|Unknown Regions                           |47     |46       |1       |0              |Design pass complete; 1 gap deferred                       |
|12-1B|Galaxy at War                             |43     |43       |0       |9              |Design pass complete                                       |
|12-1C|Jedi Academy Training Manual              |43     |43       |0       |2              |Design pass complete                                       |
|12-1D|Force Unleashed Campaign Guide            |35     |35       |0       |0              |Design pass complete                                       |
|12-1E|Galaxy of Intrigue                        |29     |28       |1       |0              |Design pass complete; 1 gap deferred                       |
|12-1F|Saga Edition Core Rulebook                |28     |28       |0       |6              |Design pass complete                                       |
|12-1G|Knights of the Old Republic Campaign Guide|20     |20       |0       |0              |Design pass complete                                       |
|12-1H|Scavenger’s Guide to Droids               |19     |19       |0       |0              |Design pass complete                                       |
|12-1I|Clone Wars Campaign Guide                 |13     |13       |0       |0              |Design pass complete                                       |
|12-1J|Legacy Era Campaign Guide                 |12     |12       |0       |0              |Design pass complete                                       |
|12-1K|Scum and Villainy                         |11     |11       |0       |11             |Design pass complete; PDF-verified after TXT OCR corruption|
|12-1L|Rebellion Era Campaign Guide              |8      |8        |0       |0              |Design pass complete                                       |
|12-1M|Starships of the Galaxy                   |3      |3        |0       |0              |Design pass complete                                       |

## Global-QA reconciliation (applied on top of QA3)

At the owner's instruction (2026-10-02) the 11 Phase 12-1 revisions of the global consistency sweep (QA-1 through QA-5) were applied to the QA3 arrays above; the entries in the batch sections already show the reconciled final tags. 0 new tag strings. The machine record (QA3 tags, final tags, added/removed, reason) is `globalQaReconciliation` in the JSON authority.

• CORE-015 — Charm Beast (QA-1): added manipulation, control; removed nature.
  • Core and Jedi Academy explicitly identify Charm Beast as the same talent. Normalize to the direct mechanic: Force-based Persuasion substitution against beasts, with social manipulation/control; remove broad `nature` leakage.
• CORE-023 — Notorious (QA-1): removed mind-affecting.
  • The two Core Notorious records have the same intimidation-reroll mechanic. The text does not explicitly make the talent itself a mind-affecting effect, so remove the inconsistent `mind-affecting` tag.
• CORE-027 — Shift Defense II (QA-1): added setup; removed resilience, survivability.
  • Shift Defense I–III are one progression with the same defensive trade mechanic. Normalize to action/defense/setup semantics; generic survivability/resilience overstates the mechanic.
• CORE-028 — Shift Defense III (QA-1): added setup; removed resilience, survivability.
  • Shift Defense I–III are one progression with the same defensive trade mechanic. Normalize to action/defense/setup semantics; generic survivability/resilience overstates the mechanic.
• UR-044 — Turn the Tide (QA-2): added reliability.
  • Turn the Tide explicitly causes Initiative rerolls; under the tightened global rule, every actual reroll mechanic also carries `reliability`.
• GAW-041 — Stava Expertise (QA-2): added reliability.
  • Stava Expertise explicitly rerolls grapple checks; add `reliability` to match every other direct reroll mechanic.
• JATM-027 — Fluidity (QA-2): added reliability.
  • Fluidity carries applicable Acrobatics rerolls to the substituted Use the Force check; add `reliability` for reroll consistency.
• TFU-007 — Computer Language (QA-2): added reroll, reliability.
  • Computer Language transfers applicable Use Computer rerolls to Persuasion. It was the only substitution talent with this printed clause missing both `reroll` and `reliability`.
• KOTOR-017 — Past Visions (QA-2): removed reliability.
  • Past Visions halves farseeing DCs and removes a Force Point requirement; that is difficulty/resource improvement, not reroll/fixed-result/failure-rescue reliability.
• CORE-013 — Devastating Attack (QA-3): added melee, ranged, targeting; removed precision.
  • Devastating Attack and Greater Devastating Attack are the same threshold-bypass family at different magnitudes. `precision` is reserved for attack-roll improvement, not threshold reduction.
• KOTOR-001 — Weak Point (QA-4): added target-designation.
  • Weak Point explicitly designates one visible target before bypassing that target's DR; add `target-designation`.
