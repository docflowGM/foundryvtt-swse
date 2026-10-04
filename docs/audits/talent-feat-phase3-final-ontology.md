# Phase 3 — Final Ontology

Status: `PHASE3_FINAL_ONTOLOGY_ALL_TAGS_OWNER_DEFINED`. 190 tags, all `OWNER_DEFINED`.

Added: `condition_track`, `full_round_action`, `ion`, `resource_gain`. Retired: `force-point`.

## Hard implications

- `reroll` → `reliability`
- `reaction` → `action_economy`
- `swift_action` → `action_economy`
- `move_action` → `action_economy`
- `standard_action` → `action_economy`
- `force_point_spend` → `resource_spend`
- `condition_removal` → `recovery`
- `use_the_force` → `force`
- `force_power_synergy` → `force`
- `ally_support` → `support`
- `full_round_action` → `action_economy`

| Tag | Records | Definition |
| --- | --- | --- |
| `ability_enhancement` | 49 | The operative mechanic directly adds, replaces, increases, or substitutes an ability score/modifier in a mechanical calculation beyond its normal baseline use. |
| `action_economy` | 648 | Directly changes action cost, action type, action availability, action timing, or converts one action type to another. Includes direct free-action and full-round-action manipulation. A mere action mention does not qualify. |
| `alchemy` | 6 | Direct published alchemical creation/modification mechanics, especially Sith alchemy. |
| `ally-trigger` | 26 | An ally's action, success, damage, position, use of an ability, or other state directly triggers the record's mechanic. The resulting benefit may affect the user or someone else. Do not infer ally_support unless an ally actually receives support. |
| `ally_support` | 290 | The ally/other friendly creature directly receives the benefit, action, movement, defense, resource, healing, bonus, or equivalent support. IMPLIES support. Do not use merely because an ally is mentioned as a trigger for a self-only benefit. |
| `ambush` | 46 | The mechanic directly exploits an enemy being unaware, surprised, flat-footed, denied Dexterity, hidden from the attacker, or otherwise caught unprepared. Primarily offensive/exploitative. |
| `ambush_defense` | 17 | The mechanic directly protects against or functions while surprised, flat-footed, denied Dexterity, attacked by hidden/unseen enemies, or caught before normal readiness. |
| `anti-force` | 25 | Directly suppresses, resists, counters, negates, detects against, or impairs Force powers/Force users. |
| `armor` | 31 | Directly requires, equips, grants proficiency with, modifies, or uses armor's mechanical bonuses/penalties. |
| `attack_of_opportunity` | 89 | [ATTACK_OF_OPPORTUNITY_POLICY] Use existing ATTACK_OF_OPPORTUNITY_POLICY. |
| `awareness` | 44 | Directly improves situational awareness/readiness or the ability to notice threats/events, usually through Perception, Initiative-like readiness, or sensory awareness. |
| `battlefield_control` | 199 | [BATTLEFIELD_CONTROL_POLICY] Use existing BATTLEFIELD_CONTROL_POLICY. |
| `beast` | 14 | Direct mechanical scope involving beasts/animals as creatures. |
| `beast_companion` | 6 | Direct mechanics involving a bonded/controlled beast companion. |
| `biotech` | 18 | Direct biological technology, bioengineering, biological augmentation, or biotech devices. |
| `block` | 16 | Direct interaction with the Block lightsaber/talent mechanic or mechanically equivalent explicit Block usage. |
| `burst_damage` | 94 | Directly creates a concentrated spike in damage in a limited attack, activation, short window, or restricted-use event. burst_damage = spike/limited damage output; sustained_damage = repeatable damage output across attacks/turns. |
| `command` | 11 | The mechanic directly issues orders, grants/directs actions, changes subordinate behavior, or performs explicit tactical command. |
| `concealment` | 56 | Direct interaction with the Concealment mechanic. |
| `condition_removal` | 32 | Directly removes/reduces a negative condition, persistent condition, impairment, or Condition Track penalty. If the mechanic specifically changes the Condition Track, also apply condition_track. |
| `control` | 254 | The mechanic directly restricts, compels, denies, redirects, penalizes, or otherwise meaningfully limits another creature's choices/actions/state. control is broader than spatial battlefield manipulation. Do not use merely because an effect is harmful. |
| `counterattack` | 46 | The mechanic directly grants or modifies an attack made in response to an enemy's attack or hostile action. Do not use for every reaction. Attacks of opportunity remain their own mechanic. |
| `cover` | 42 | Direct interaction with the Cover mechanic. |
| `crafting` | 38 | Directly constructs/creates an item, device, weapon, armor, droid component, trap, or similar object. |
| `critical_hit` | 27 | Direct interaction with critical threat range; scoring critical hits; critical-hit damage; triggering from a critical hit; modifying critical-hit resolution. Do not equate with critical_success. |
| `critical_success` | 15 | [CRITICAL_SUCCESS_POLICY] Use existing CRITICAL_SUCCESS_POLICY. |
| `damage` | 42 | The record itself directly deals damage or creates a damaging effect. Do not use solely because the mechanic modifies damage already dealt by another attack; use more specific tags such as damage_bonus where appropriate. |
| `damage_bonus` | 153 | [DAMAGE_BONUS_POLICY] Use existing DAMAGE_BONUS_POLICY. |
| `damage_reduction` | 34 | Direct interaction with Damage Reduction. |
| `damage_threshold` | 50 | [DAMAGE_THRESHOLD_POLICY] Use existing DAMAGE_THRESHOLD_POLICY. |
| `dark_side` | 41 | Direct interaction with Dark Side powers/descriptors/alignment mechanics. |
| `dark_side_score` | 23 | Direct use, increase, decrease, comparison, or mechanical dependence on Dark Side Score. |
| `deception` | 48 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Deception skill. |
| `defense` | 284 | Directly modifies, substitutes, uses, or improves Reflex, Fortitude, or Will Defense, or directly changes whether an attack/effect hits or is avoided. Do not use for pure DR/HP effects. |
| `deflect` | 17 | Direct interaction with the Deflect lightsaber/talent mechanic or mechanically explicit Deflect usage. |
| `detection` | 37 | Direct ability to locate, reveal, notice, expose, or detect hidden/concealed/invisible/Force/etc. targets, objects, or effects. |
| `double_weapon` | 10 | Directly operates on double weapons or both ends of a double weapon. |
| `droid` | 52 | Direct mechanical scope involving droids, droid traits, droid systems, or droid-specific effects. Generic reference to a droid example does not qualify. |
| `dual_wield` | 22 | [DUAL_WIELD_POLICY] Use existing DUAL_WIELD_POLICY. |
| `durability` | 49 | Directly increases or preserves physical staying power such as hit points, bonus/temporary hit points, structural integrity, or comparable capacity to absorb damage. Do not use solely for Defense bonuses. |
| `empowerment` | 39 | The mechanic directly strengthens, shares, upgrades, amplifies, or temporarily enhances another ability, power, talent, ally, or effect beyond its ordinary baseline. Do not use for every numeric attack or damage bonus when a specific mechanical tag fully describes the effect. |
| `equipment` | 132 | Direct interaction with equipment as an item/object: creating, modifying, equipping, choosing, transferring, maintaining, granting an equipment property. Do not apply to every weapon-scoped combat ability merely because a weapon is equipment. |
| `evasion` | 125 | The mechanic directly avoids, negates, redirects, escapes, or reduces exposure to an attack/effect rather than merely absorbing its damage. A static Defense bonus alone does not automatically imply evasion. |
| `exotic_weapon` | 9 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Directly requires, modifies, or operates on exotic weapons as a closed scope. Open generic weapon selection does not qualify. |
| `exploration` | 26 | Direct mechanics for exploring environments, traversing unknown areas, locating environmental features, or expedition-style discovery. |
| `fear` | 28 | Directly applies, modifies, resists, or exploits fear. |
| `feint` | 8 | Direct interaction with the Feint mechanic or combat feinting. |
| `fighting_defensively` | 10 | Directly uses/modifies the Fighting Defensively combat option. |
| `flanking` | 11 | Directly creates, modifies, requires, or benefits from the flanking state. |
| `followers` | 23 | Directly uses or modifies the follower subsystem or owned/following NPC followers. |
| `force` | 301 | The operative mechanic directly involves the Force; Force powers; Force talents/techniques/secrets; Use the Force; Force sensitivity/training; Force-specific resources or effects. Ordinary English "force" does not qualify. use_the_force -> force remains mandatory. |
| `force_capacity` | 29 | [FORCE_CAPACITY_POLICY] Use existing FORCE_CAPACITY_POLICY. |
| `force_control` | 2 | Directly alters the mode, descriptor, damage form, alignment descriptor, or functional behavior of an activated Force power (for example changing light/dark descriptor treatment, converting Force-power damage to stun). |
| `force_defense` | 33 | Direct use of Force mechanics for defense or direct defense/resistance against Force attacks/powers. |
| `force_multiplier` | 14 | Directly increases the magnitude/die/effectiveness of an existing Force-based numerical benefit, especially Force Point bonus dice or similar amplification. It does not create more resource units. |
| `force_offense` | 23 | A direct offensive Force mechanic against enemies: damaging, attacking, or hostile Force application. |
| `force_point_spend` | 143 | [FORCE_POINT_SPEND_POLICY] Use existing FORCE_POINT_SPEND_POLICY. |
| `force_power` | 5 | Directly changes acquisition, availability, suite membership, recovery, selection, or possession of Force powers as discrete powers/resources. Do not use merely because a record modifies the effect of a particular Force power. |
| `force_power_synergy` | 82 | Directly modifies, enhances, combines with, changes, or depends on activation/effect of one or more Force powers. IMPLIES force. |
| `force_support` | 24 | Uses a Force mechanic to directly aid another creature. |
| `force_training` | 6 | Directly grants or modifies Force training/sensitivity, Force Training entitlement, Force-power suite training/access, or equivalent Force-training capacity. |
| `full_attack` | 33 | [FULL_ATTACK_POLICY] Use existing FULL_ATTACK_POLICY. |
| `galactic_lore` | 8 | Direct interaction specifically with Knowledge (galactic lore). |
| `grab` | 16 | [GRAB_POLICY] Use existing GRAB_POLICY. |
| `grapple` | 24 | [GRAPPLE_POLICY] Use existing GRAPPLE_POLICY. |
| `healing` | 53 | Directly restores hit points or explicitly increases hit-point healing. |
| `heavy_weapon` | 5 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Directly requires, modifies, or operates on heavy weapons. |
| `illusion` | 5 | Direct creation, manipulation, resistance, or detection of Force illusions. |
| `implant` | 9 | Direct implant/cybernetic installation, use, modification, or effects. |
| `improvised_weapon` | 7 | Directly uses/modifies improvised weapons. |
| `infiltration` | 38 | Directly enables covert entry, disguise, bypassing access/security, hidden presence, or operating inside hostile/restricted areas. |
| `initiative` | 27 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Initiative skill. |
| `intimidation` | 20 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Intimidation skill. |
| `intrigue` | 3 | Direct mechanics involving political/social schemes, secrets, plots, influence networks, or intrigue-oriented manipulation/information. |
| `investigation` | 31 | Direct analysis/search of clues, evidence, records, secrets, or investigative information. |
| `jury_rig` | 8 | Direct temporary/emergency repair or temporary improvised modification used to keep equipment functioning or improve it provisionally. |
| `knowledge` | 35 | Direct interaction with Knowledge checks generally, multiple Knowledge categories, or an unspecified Knowledge skill. Do not use merely because the character learns information. |
| `leadership` | 18 | The mechanic represents leadership presence, authority, inspiration, organization, or management of allies/followers as a continuing role. |
| `light_side` | 8 | Direct interaction with Light Side powers/descriptors/alignment mechanics. |
| `lightsaber` | 79 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Directly requires, modifies, attacks with, defends with, or otherwise operates on lightsabers as a closed scope. Prerequisite/reference/example alone does not qualify. |
| `lightsaber_polearm` | 2 | Directly operates on lightsaber polearms as the specific scope. |
| `manipulation` | 35 | Directly changes another creature's behavior/attitude/choice through deception, persuasion, coercion, mind-affecting manipulation, or equivalent influence. |
| `martial_arts` | 38 | Direct interaction with the Martial Arts feat family, martial-arts combat techniques, or mechanically explicit martial-arts/unarmed style mechanics. Do not use for every unarmed mechanic automatically. |
| `mechanics` | 51 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Mechanics skill. |
| `medical` | 38 | Direct interaction with medical equipment, procedures, surgery, implants, medpacs, or medical technology. |
| `medicine` | 25 | Direct therapeutic treatment of creatures, including diagnosis/treatment of injury, disease, poison, or harmful conditions. It does not require the exact Treat Injury skill. |
| `meditation` | 2 | A substantive mechanic requires or operates through meditation as an action/state/process. |
| `melee` | 315 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Direct operative scope is melee attacks/melee combat. |
| `melee_defense` | 23 | Direct defensive benefit specifically against melee attacks. |
| `mind-affecting` | 80 | The operative mechanic is explicitly mind-affecting or directly modifies/resists a mind-affecting effect. |
| `minion` | 13 | Directly uses or modifies minions as a subordinate/minion mechanic. |
| `mobility` | 194 | [MOBILITY_POLICY] Use existing MOBILITY_POLICY. |
| `modification` | 29 | Directly alters an existing item's/device's properties or capabilities. |
| `morale` | 41 | Directly modifies morale, courage, morale bonuses/penalties, or morale/fear-related group state. |
| `mount` | 10 | Direct mechanics of mounted combat, a mount, or mount-dependent actions. |
| `move_action` | 46 | [ACTION_TYPE_POLICY] Use existing ACTION_TYPE_POLICY. |
| `movement` | 181 | [MOVEMENT_POLICY] Use existing MOVEMENT_POLICY. |
| `nature` | 11 | Direct natural-environment, ecology, weather, beast-lore, wilderness, or environmental-domain mechanics. |
| `network` | 11 | Direct use of an interconnected communication/information/linked network, including mechanical sharing through network links. Do not automatically equate with social_network. |
| `nonlethal` | 10 | The mechanic directly causes nonlethal/capture-oriented damage resolution; prevents killing when damage would otherwise do so; explicitly treats a target as stable/nonlethally defeated; or directly modifies nonlethal damage. Do not infer merely because a mechanic is useful for capture. |
| `offense_melee` | 10 | A direct melee-scoped offensive improvement whose substantive effect improves attack or damage output. Mere melee scope does not qualify. |
| `offense_ranged` | 16 | A direct ranged-scoped offensive improvement whose substantive effect improves attack or damage output. Mere ranged scope does not qualify. |
| `once-per-encounter` | 211 | [ONCE_PER_ENCOUNTER_POLICY] Use existing ONCE_PER_ENCOUNTER_POLICY. |
| `opposed_check` | 25 | The operative mechanic directly creates, modifies, rerolls, or resolves an opposed check. |
| `overwatch` | 5 | The mechanic establishes or modifies a prepared/reactive attack posture covering an area, movement, or enemy action, where an attack can be triggered by later battlefield activity. Do not use for every reaction attack or counterattack. |
| `perception` | 51 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Perception skill. |
| `persuasion` | 73 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Persuasion skill. |
| `pilot` | 51 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Pilot skill. |
| `pistol` | 19 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Directly requires, modifies, or operates on pistols. |
| `planning` | 5 | The mechanic derives benefit from preparation/planning materially in advance of immediate resolution, usually before an encounter, mission, or later event. Do not use for ordinary combat-round setup. |
| `poison` | 11 | Directly creates, applies, modifies, resists, treats, or interacts with poison. |
| `positioning` | 217 | The mechanic directly depends on or changes tactically meaningful relative position: adjacency; square occupation; flanking geometry; relative placement; moving into/out of advantageous locations. Movement by itself does not automatically imply positioning. |
| `power_systems` | 18 | Direct interaction with generators, power supplies, batteries, recharge, rerouting power, or similar power-system mechanics. |
| `precision` | 242 | Directly improves the chance or accuracy of hitting a target: attack-roll bonuses; attack penalty reduction; accuracy-related rerouting/substitution; ignoring accuracy penalties. Do not use for pure extra damage, Damage Threshold reduction, or generic weapon scope. |
| `precision_damage` | 7 | Directly grants extra damage because a target is vulnerable in a precision-style way (flat-footed, denied Dexterity, unaware, otherwise specifically exposed for precision damage). Do not use for generic extra damage. |
| `precognition` | 15 | Direct future-sensing/foreknowledge that mechanically affects later outcomes. |
| `pursuit` | 30 | Direct chase, pursuit, following, disengagement prevention, dogfight pursuit, or closing/maintaining distance against a moving target. |
| `ranged` | 276 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Direct operative scope is ranged attacks/ranged combat. |
| `ranged_defense` | 25 | Direct defensive benefit specifically against ranged attacks. |
| `reaction` | 154 | [ACTION_TYPE_POLICY] Use existing ACTION_TYPE_POLICY. |
| `recon` | 31 | Direct scouting/reconnaissance gathering of battlefield/location/enemy information. |
| `recovery` | 95 | Directly restores a character from injury, impairment, or depleted combat state, including second wind, Condition Track recovery, and other non-resource combat recovery. Do not use for recovery of expendable resources; use resource_recovery. |
| `reliability` | 175 | [RELIABILITY_POLICY] Use existing RELIABILITY_POLICY. |
| `repair` | 14 | Directly restores functionality, HP, condition, or operation to droids, vehicles, objects, or equipment through repair. |
| `reroll` | 109 | [REROLL_POLICY] Use existing REROLL_POLICY. |
| `resilience` | 96 | Direct resistance to adverse effects, conditions, impairment, forced failure, or loss of function. Use for resistance/endurance against harmful states rather than simple accuracy avoidance. |
| `resource_recovery` | 32 | [RESOURCE_RECOVERY_POLICY] Use existing RESOURCE_RECOVERY_POLICY. |
| `resource_spend` | 159 | [RESOURCE_SPEND_POLICY] Use existing RESOURCE_SPEND_POLICY. |
| `resources` | 60 | The substantive mechanic changes availability, management, amount, access, or use of a limited consumable resource or limited-use capability. Do not add merely because a resource is paid as a routine activation cost. Specific tags remain preferred. |
| `restrain` | 13 | [RESTRAIN_POLICY] Use existing RESTRAIN_POLICY. |
| `ride` | 11 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Ride skill. |
| `rider` | 10 | Direct benefit/restriction applied to the rider or rider/mount relationship. |
| `scaling` | 192 | The magnitude, count, duration, range, uses, or similar benefit directly scales according to another value such as level, class level, BAB, ability modifier, number of allies, number of selections, or another explicitly varying mechanical quantity. Static bonuses are not scaling. |
| `science` | 8 | Direct scientific analysis, experimentation, technical scientific knowledge, or laboratory-style mechanics. |
| `search_your_feelings` | 5 | Direct interaction with the Search Your Feelings Force application. |
| `self_repair` | 3 | The subject directly repairs/restores itself, especially droid/mechanical self-maintenance. |
| `senses` | 23 | Direct modification or use of a sensory capability such as scent, vision modes, hearing, special senses. |
| `sensors` | 10 | Direct interaction with sensor systems/scanning technology. |
| `setup` | 177 | The mechanic requires or creates a deliberate preparatory state before a later payoff: aiming/preparing, maintaining an action sequence, priming a target/effect, spending actions now for a later attack/effect. Ordinary prerequisites or ordinary trigger conditions are not setup. |
| `shields` | 17 | Direct interaction with shields or Shield Rating. |
| `skill_mastery` | 19 | The mechanic directly changes advanced/reliable use of a skill: Take 10 / Take 20 permissions; automatic skill success; ignoring restrictions on routine skill use; equivalent mastery of skill resolution. Do not use solely for numeric skill bonuses. |
| `skill_substitution` | 38 | One skill, ability modifier, defense, or other check basis is directly substituted for another skill/check basis. |
| `skills` | 320 | Direct interaction with skills or skill checks generically/multiply rather than one specific named skill. A record involving only one explicitly named skill does not automatically require skills. |
| `slicing` | 11 | Direct computer intrusion, hacking, slicing, unauthorized system access, or counter-slicing. |
| `sniper` | 16 | Direct mechanical support for sniper-style combat: aimed single-target ranged attacks; long-range precision; attacks from concealment/unawareness; comparable deliberate precision-shot mechanics. Generic ranged offense does not qualify. |
| `social` | 111 | Directly operates through social interaction, attitudes, interpersonal influence, or social skill resolution. |
| `social_network` | 14 | Direct use of contacts, allies, organizations, or social networks to obtain information/resources/benefits. |
| `space` | 22 | Directly operates in starship/space-combat or space-environment mechanics. Generic vehicle mechanics do not automatically imply space. |
| `spellcasting` | 1 | Direct interaction with an explicitly published spellcasting/witchcraft/spell mechanic. Do not apply because something merely resembles a spell. |
| `standard_action` | 152 | [ACTION_TYPE_POLICY] Use existing ACTION_TYPE_POLICY. |
| `stealth` | 65 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Stealth skill. |
| `stun` | 12 | [STUN_POLICY] Use existing STUN_POLICY. |
| `support` | 310 | The operative mechanic directly provides a beneficial mechanical effect to another creature/group or enables another creature to perform better. Self-only benefit is not support. |
| `surprise_round` | 20 | Directly changes actions, participation, initiative, surprise status, or benefits during a Surprise Round. Do not use merely because a mechanic is useful early in combat. |
| `survivability` | 171 | A broad mechanic whose substantive purpose materially helps a character avoid defeat, incapacitation, or death through durability, defenses, mitigation, emergency recovery, or similar staying power. Do not add to every defensive record automatically; survivability must be a substantive outcome of the mechanic. |
| `survival` | 10 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Survival skill. |
| `sustained_damage` | 134 | [SUSTAINED_DAMAGE_POLICY] Use existing SUSTAINED_DAMAGE_POLICY. |
| `swift_action` | 232 | [ACTION_TYPE_POLICY] Use existing ACTION_TYPE_POLICY. |
| `tactics` | 16 | Direct tactical planning, formation, maneuver choice, battlefield coordination, or tactical advantage as the operative mechanic. |
| `talisman` | 8 | Direct creation/use/modification of Force/Sith talismans. |
| `target-designation` | 94 | The mechanic explicitly marks/designates/selects a creature/object as a special ongoing target for a later or continuing mechanical effect. Do not apply when "designate" means choose equipment, choose a weapon, choose an option, or make a generic one-time choice. Signature Device-style equipment designation is not target designation. |
| `targeting` | 153 | Direct interaction with target acquisition or target-specific attack/effect resolution: aim; choosing a combat target; line-of-sight targeting; targeting software; target-specific attack modifiers; changing where an attack is considered to originate for targeting purposes. Do not use merely because every attack naturally has a target. |
| `teamwork` | 283 | The mechanic requires or rewards active cooperation, coordinated participation, shared positioning, Aid Another, shared feat ownership, or combined actions among allied characters. Unilateral support does not automatically imply teamwork. |
| `tech` | 67 | The operative mechanic directly involves technological devices, engineering, electronics, machinery, technical systems, or technical modification. A broad domain tag, not a synonym for Mechanics or Use Computer. |
| `telekinesis` | 13 | Direct Force-based telekinetic movement/manipulation. |
| `telepath` | 1 | Use only for specialized deep telepathic probing/intrusion/mind-reading capability where telepathy is a defining operative mechanic, not merely any generic telepathic communication. May coexist with telepathy. Must never be assigned because the talent belongs to a Telepath tree. |
| `telepathy` | 10 | Direct Force-based mental communication, mental influence, mind reading, or telepathic interaction. |
| `temporary-talent` | 3 | Direct temporary access to/use of a talent the character does not permanently possess. Do not use for ordinary talent sharing unless the recipient actually gains temporary access to the talent itself. |
| `tracking` | 6 | Directly follows trails, traces, signatures, targets, or pursuit information over time. |
| `trap` | 10 | Direct creation, deployment, triggering, detection, disabling, or modification of traps/mines/fixed hazards. |
| `treat_injury` | 40 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Treat Injury skill. |
| `unarmed` | 56 | [CLOSED_SCOPE_POLICY + OPEN_GENERIC_SCOPE_POLICY] Direct operative scope is unarmed attacks/unarmed strikes. |
| `use_computer` | 26 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Use Computer skill. |
| `use_the_force` | 122 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Use the Force skill. |
| `vehicle` | 101 | Direct operation, piloting, attacking with, modifying, repairing, defending, or otherwise mechanically interacting with vehicles. Do not use when vehicles appear only as an exception ("does not apply to vehicles", "non-vehicle weapon", "not against objects or vehicles"). |
| `visions` | 23 | Direct visions/foresight/revelatory vision mechanics. |
| `weapon_empowerment` | 18 | Directly augments or imbues a weapon as an object, changing its offensive properties, damage, attack quality, or special capabilities. Do not use merely because the character receives a weapon-scoped bonus without altering/empowering the weapon. |
| `weapon_specialization` | 10 | Directly grants a specialized persistent combat benefit tied to a chosen/specific weapon or weapon group beyond mere proficiency. |
| `weapon_training` | 65 | Directly improves proficiency, handling penalties, attack competence, or trained use of a weapon/group. |
| `will_defense` | 107 | Direct interaction specifically with Will Defense. |
| `acrobatics` | 16 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Acrobatics skill. |
| `climb` | 12 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Climb skill. |
| `endurance` | 10 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Endurance skill. |
| `gather_information` | 16 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Gather Information skill. |
| `jump` | 12 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Jump skill. |
| `swim` | 11 | [EXACT_SKILL_POLICY] Use EXACT_SKILL_POLICY: direct mechanical interaction with the Swim skill. |
| `condition_track` (new) | 81 | USE WHEN the operative mechanic directly moves a creature up or down the Condition Track; changes the number of Condition Track steps moved; prevents Condition Track movement; modifies recovery from a Condition Track state; or directly changes how a Condition Track result is applied. DO NOT USE for merely mentioning the Condition Track, Damage Threshold mechanics that do not alter Condition Track movement, or conditions unrelated to the SWSE Condition Track. No automatic implication of condition_removal, recovery, control or battlefield_control. |
| `full_round_action` (new) | 60 | USE WHEN the operative mechanic directly costs a full-round action; grants a full-round action; changes another action into/from a full-round action; modifies what can be done during a full-round action; or restricts or changes full-round-action timing. IMPLIES action_economy. DO NOT USE merely because a normal Full Attack is mentioned; full_attack and full_round_action remain distinct. |
| `ion` (new) | 6 | USE WHEN the operative mechanic directly interacts with ion damage; ion weapons; resistance to ion damage; enhancement of ion attacks; conversion to/from ion damage; or special consequences of ion damage. DO NOT equate ion with stun or nonlethal; those apply only when their own mechanics are present. Not for prerequisite, example, exclusion or reference. |
| `resource_gain` (new) | 18 | Applies when a mechanic creates or grants a new spendable resource now without restoring a previously spent unit and without merely changing persistent maximum capacity (for example gaining a temporary Force Point, receiving a new expendable use, generating a temporary spendable resource). Not for recovering a spent resource, increasing permanent capacity/allotment, or merely spending a resource. |
