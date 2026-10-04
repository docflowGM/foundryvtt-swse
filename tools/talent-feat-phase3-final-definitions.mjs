// Phase 3 FINAL OWNER DEFINITIONS (transcribed from the owner's final adjudication, sections 1-32).
// This module is DATA: every entry is an owner definition (or an explicit pointer to an already-issued owner policy). Nothing here is a Claude-created semantic rule.
// "policies" lists already-issued owner policy IDs that remain part of the tag's definition ("Use existing X"). EXACT_SKILL_POLICY is owner-named in section 10.

export const FINAL_CLASSIFICATION_RULE = 'A tag applies when the canonical operative mechanic directly satisfies the positive definition. A tag does not apply merely because the concept appears as: prerequisite; example; comparison; exception; excluded target; ordinary-English wording; tree/class/category identity; flavor; generic open-ended choice. When the canonical text does not satisfy the positive definition: NO_CHANGE, or REMOVE if the tag is incorrectly already present. Do not preserve an existing tag solely because it already exists. Do not search for arbitrary new ADDs across the corpus: new ADDs may come only from (1) unresolved Phase 3 findings, (2) explicit hard implications, (3) the four newly authorized ontology concepts and their deterministic scanners, (4) correction of a literal contradiction exposed by the final definitions.';

export const EXACT_SKILL_POLICY_TEXT = 'The skill tags (acrobatics, climb, deception, endurance, gather_information, initiative, intimidation, jump, mechanics, perception, persuasion, pilot, ride, stealth, survival, swim, treat_injury, use_computer, use_the_force) represent direct mechanical interaction with the named skill. Use the exact skill tag when the skill itself directly participates in the operative mechanic through making the check, modifying the check, changing what the skill can do, substituting for/from the skill, or changing success/failure or action use of the skill. Do not infer from prerequisites, examples, role nouns, ordinary English, or another mechanic merely referencing the skill\'s normal rules. Existing Pass 3A exact-skill rulings remain authoritative.';

export const NEW_TAGS = ['condition_track', 'full_round_action', 'ion', 'resource_gain'];
export const RETIRED_TAG = 'force-point';
export const PREVIOUSLY_RETIRED_TAGS = ['skill-mastery', 'balance', 'natural_weapon', 'entangle'];
export const NEW_HARD_IMPLICATION = ['full_round_action', 'action_economy'];

const U = (...ids) => ({ policies: ids, text: `Use existing ${ids.join(' + ')}.` });
const D = (text, ...policies) => ({ text, policies });
const SKILL = (name) => ({ policies: ['EXACT_SKILL_POLICY'], text: `Use EXACT_SKILL_POLICY: direct mechanical interaction with the ${name} skill.` });
const SCOPE_POLICIES = ['CLOSED_SCOPE_POLICY', 'OPEN_GENERIC_SCOPE_POLICY'];

export const FINAL_DEFINITIONS = {
  // ---- new tags (sections 6-8, 4) ----
  condition_track: D('USE WHEN the operative mechanic directly moves a creature up or down the Condition Track; changes the number of Condition Track steps moved; prevents Condition Track movement; modifies recovery from a Condition Track state; or directly changes how a Condition Track result is applied. DO NOT USE for merely mentioning the Condition Track, Damage Threshold mechanics that do not alter Condition Track movement, or conditions unrelated to the SWSE Condition Track. No automatic implication of condition_removal, recovery, control or battlefield_control.'),
  full_round_action: D('USE WHEN the operative mechanic directly costs a full-round action; grants a full-round action; changes another action into/from a full-round action; modifies what can be done during a full-round action; or restricts or changes full-round-action timing. IMPLIES action_economy. DO NOT USE merely because a normal Full Attack is mentioned; full_attack and full_round_action remain distinct.'),
  ion: D('USE WHEN the operative mechanic directly interacts with ion damage; ion weapons; resistance to ion damage; enhancement of ion attacks; conversion to/from ion damage; or special consequences of ion damage. DO NOT equate ion with stun or nonlethal; those apply only when their own mechanics are present. Not for prerequisite, example, exclusion or reference.'),
  resource_gain: D('Applies when a mechanic creates or grants a new spendable resource now without restoring a previously spent unit and without merely changing persistent maximum capacity (for example gaining a temporary Force Point, receiving a new expendable use, generating a temporary spendable resource). Not for recovering a spent resource, increasing permanent capacity/allotment, or merely spending a resource.'),
  // ---- action / timing ----
  action_economy: D('Directly changes action cost, action type, action availability, action timing, or converts one action type to another. Includes direct free-action and full-round-action manipulation. A mere action mention does not qualify.'),
  reaction: U('ACTION_TYPE_POLICY'), swift_action: U('ACTION_TYPE_POLICY'), move_action: U('ACTION_TYPE_POLICY'), standard_action: U('ACTION_TYPE_POLICY'),
  'once-per-encounter': U('ONCE_PER_ENCOUNTER_POLICY'),
  setup: D('The mechanic requires or creates a deliberate preparatory state before a later payoff: aiming/preparing, maintaining an action sequence, priming a target/effect, spending actions now for a later attack/effect. Ordinary prerequisites or ordinary trigger conditions are not setup.'),
  planning: D('The mechanic derives benefit from preparation/planning materially in advance of immediate resolution, usually before an encounter, mission, or later event. Do not use for ordinary combat-round setup.'),
  scaling: D('The magnitude, count, duration, range, uses, or similar benefit directly scales according to another value such as level, class level, BAB, ability modifier, number of allies, number of selections, or another explicitly varying mechanical quantity. Static bonuses are not scaling.'),
  // ---- skills ----
  acrobatics: SKILL('Acrobatics'), climb: SKILL('Climb'), deception: SKILL('Deception'), endurance: SKILL('Endurance'), gather_information: SKILL('Gather Information'),
  initiative: SKILL('Initiative'), intimidation: SKILL('Intimidation'), jump: SKILL('Jump'), mechanics: SKILL('Mechanics'), perception: SKILL('Perception'), persuasion: SKILL('Persuasion'),
  pilot: SKILL('Pilot'), ride: SKILL('Ride'), stealth: SKILL('Stealth'), survival: SKILL('Survival'), swim: SKILL('Swim'), treat_injury: SKILL('Treat Injury'),
  use_computer: SKILL('Use Computer'), use_the_force: SKILL('Use the Force'),
  galactic_lore: D('Direct interaction specifically with Knowledge (galactic lore).'),
  knowledge: D('Direct interaction with Knowledge checks generally, multiple Knowledge categories, or an unspecified Knowledge skill. Do not use merely because the character learns information.'),
  skills: D('Direct interaction with skills or skill checks generically/multiply rather than one specific named skill. A record involving only one explicitly named skill does not automatically require skills.'),
  skill_substitution: D('One skill, ability modifier, defense, or other check basis is directly substituted for another skill/check basis.'),
  skill_mastery: D('The mechanic directly changes advanced/reliable use of a skill: Take 10 / Take 20 permissions; automatic skill success; ignoring restrictions on routine skill use; equivalent mastery of skill resolution. Do not use solely for numeric skill bonuses.'),
  opposed_check: D('The operative mechanic directly creates, modifies, rerolls, or resolves an opposed check.'),
  ability_enhancement: D('The operative mechanic directly adds, replaces, increases, or substitutes an ability score/modifier in a mechanical calculation beyond its normal baseline use.'),
  // ---- reliability ----
  reroll: U('REROLL_POLICY'), reliability: U('RELIABILITY_POLICY'),
  // ---- damage / offense ----
  damage: D('The record itself directly deals damage or creates a damaging effect. Do not use solely because the mechanic modifies damage already dealt by another attack; use more specific tags such as damage_bonus where appropriate.'),
  damage_bonus: U('DAMAGE_BONUS_POLICY'),
  burst_damage: D('Directly creates a concentrated spike in damage in a limited attack, activation, short window, or restricted-use event. burst_damage = spike/limited damage output; sustained_damage = repeatable damage output across attacks/turns.'),
  sustained_damage: U('SUSTAINED_DAMAGE_POLICY'),
  precision: D('Directly improves the chance or accuracy of hitting a target: attack-roll bonuses; attack penalty reduction; accuracy-related rerouting/substitution; ignoring accuracy penalties. Do not use for pure extra damage, Damage Threshold reduction, or generic weapon scope.'),
  precision_damage: D('Directly grants extra damage because a target is vulnerable in a precision-style way (flat-footed, denied Dexterity, unaware, otherwise specifically exposed for precision damage). Do not use for generic extra damage.'),
  critical_hit: D('Direct interaction with critical threat range; scoring critical hits; critical-hit damage; triggering from a critical hit; modifying critical-hit resolution. Do not equate with critical_success.'),
  critical_success: U('CRITICAL_SUCCESS_POLICY'),
  nonlethal: D('The mechanic directly causes nonlethal/capture-oriented damage resolution; prevents killing when damage would otherwise do so; explicitly treats a target as stable/nonlethally defeated; or directly modifies nonlethal damage. Do not infer merely because a mechanic is useful for capture.'),
  stun: U('STUN_POLICY'),
  // ---- attack scope ----
  melee: D('Direct operative scope is melee attacks/melee combat.', ...SCOPE_POLICIES),
  ranged: D('Direct operative scope is ranged attacks/ranged combat.', ...SCOPE_POLICIES),
  unarmed: D('Direct operative scope is unarmed attacks/unarmed strikes.', ...SCOPE_POLICIES),
  martial_arts: D('Direct interaction with the Martial Arts feat family, martial-arts combat techniques, or mechanically explicit martial-arts/unarmed style mechanics. Do not use for every unarmed mechanic automatically.'),
  pistol: D('Directly requires, modifies, or operates on pistols.', ...SCOPE_POLICIES),
  heavy_weapon: D('Directly requires, modifies, or operates on heavy weapons.', ...SCOPE_POLICIES),
  exotic_weapon: D('Directly requires, modifies, or operates on exotic weapons as a closed scope. Open generic weapon selection does not qualify.', ...SCOPE_POLICIES),
  improvised_weapon: D('Directly uses/modifies improvised weapons.'),
  lightsaber: D('Directly requires, modifies, attacks with, defends with, or otherwise operates on lightsabers as a closed scope. Prerequisite/reference/example alone does not qualify.', ...SCOPE_POLICIES),
  lightsaber_polearm: D('Directly operates on lightsaber polearms as the specific scope.'),
  double_weapon: D('Directly operates on double weapons or both ends of a double weapon.'),
  dual_wield: U('DUAL_WIELD_POLICY'), full_attack: U('FULL_ATTACK_POLICY'),
  fighting_defensively: D('Directly uses/modifies the Fighting Defensively combat option.'),
  flanking: D('Directly creates, modifies, requires, or benefits from the flanking state.'),
  offense_melee: D('A direct melee-scoped offensive improvement whose substantive effect improves attack or damage output. Mere melee scope does not qualify.'),
  offense_ranged: D('A direct ranged-scoped offensive improvement whose substantive effect improves attack or damage output. Mere ranged scope does not qualify.'),
  sniper: D('Direct mechanical support for sniper-style combat: aimed single-target ranged attacks; long-range precision; attacks from concealment/unawareness; comparable deliberate precision-shot mechanics. Generic ranged offense does not qualify.'),
  // ---- weapon development ----
  weapon_training: D('Directly improves proficiency, handling penalties, attack competence, or trained use of a weapon/group.'),
  weapon_specialization: D('Directly grants a specialized persistent combat benefit tied to a chosen/specific weapon or weapon group beyond mere proficiency.'),
  weapon_empowerment: D('Directly augments or imbues a weapon as an object, changing its offensive properties, damage, attack quality, or special capabilities. Do not use merely because the character receives a weapon-scoped bonus without altering/empowering the weapon.'),
  // ---- reactive combat ----
  attack_of_opportunity: U('ATTACK_OF_OPPORTUNITY_POLICY'),
  counterattack: D('The mechanic directly grants or modifies an attack made in response to an enemy\'s attack or hostile action. Do not use for every reaction. Attacks of opportunity remain their own mechanic.'),
  overwatch: D('The mechanic establishes or modifies a prepared/reactive attack posture covering an area, movement, or enemy action, where an attack can be triggered by later battlefield activity. Do not use for every reaction attack or counterattack.'),
  // ---- grapple / control ----
  grab: U('GRAB_POLICY'), grapple: U('GRAPPLE_POLICY'), restrain: U('RESTRAIN_POLICY'),
  control: D('The mechanic directly restricts, compels, denies, redirects, penalizes, or otherwise meaningfully limits another creature\'s choices/actions/state. control is broader than spatial battlefield manipulation. Do not use merely because an effect is harmful.'),
  battlefield_control: U('BATTLEFIELD_CONTROL_POLICY'), movement: U('MOVEMENT_POLICY'), mobility: U('MOBILITY_POLICY'),
  positioning: D('The mechanic directly depends on or changes tactically meaningful relative position: adjacency; square occupation; flanking geometry; relative placement; moving into/out of advantageous locations. Movement by itself does not automatically imply positioning.'),
  pursuit: D('Direct chase, pursuit, following, disengagement prevention, dogfight pursuit, or closing/maintaining distance against a moving target.'),
  // ---- ambush / surprise ----
  ambush: D('The mechanic directly exploits an enemy being unaware, surprised, flat-footed, denied Dexterity, hidden from the attacker, or otherwise caught unprepared. Primarily offensive/exploitative.'),
  ambush_defense: D('The mechanic directly protects against or functions while surprised, flat-footed, denied Dexterity, attacked by hidden/unseen enemies, or caught before normal readiness.'),
  surprise_round: D('Directly changes actions, participation, initiative, surprise status, or benefits during a Surprise Round. Do not use merely because a mechanic is useful early in combat.'),
  // ---- defense / mitigation ----
  defense: D('Directly modifies, substitutes, uses, or improves Reflex, Fortitude, or Will Defense, or directly changes whether an attack/effect hits or is avoided. Do not use for pure DR/HP effects.'),
  will_defense: D('Direct interaction specifically with Will Defense.'),
  melee_defense: D('Direct defensive benefit specifically against melee attacks.'),
  ranged_defense: D('Direct defensive benefit specifically against ranged attacks.'),
  evasion: D('The mechanic directly avoids, negates, redirects, escapes, or reduces exposure to an attack/effect rather than merely absorbing its damage. A static Defense bonus alone does not automatically imply evasion.'),
  cover: D('Direct interaction with the Cover mechanic.'),
  concealment: D('Direct interaction with the Concealment mechanic.'),
  armor: D('Directly requires, equips, grants proficiency with, modifies, or uses armor\'s mechanical bonuses/penalties.'),
  shields: D('Direct interaction with shields or Shield Rating.'),
  damage_reduction: D('Direct interaction with Damage Reduction.'),
  damage_threshold: U('DAMAGE_THRESHOLD_POLICY'),
  block: D('Direct interaction with the Block lightsaber/talent mechanic or mechanically equivalent explicit Block usage.'),
  deflect: D('Direct interaction with the Deflect lightsaber/talent mechanic or mechanically explicit Deflect usage.'),
  // ---- durability / survival / recovery ----
  durability: D('Directly increases or preserves physical staying power such as hit points, bonus/temporary hit points, structural integrity, or comparable capacity to absorb damage. Do not use solely for Defense bonuses.'),
  survivability: D('A broad mechanic whose substantive purpose materially helps a character avoid defeat, incapacitation, or death through durability, defenses, mitigation, emergency recovery, or similar staying power. Do not add to every defensive record automatically; survivability must be a substantive outcome of the mechanic.'),
  resilience: D('Direct resistance to adverse effects, conditions, impairment, forced failure, or loss of function. Use for resistance/endurance against harmful states rather than simple accuracy avoidance.'),
  healing: D('Directly restores hit points or explicitly increases hit-point healing.'),
  recovery: D('Directly restores a character from injury, impairment, or depleted combat state, including second wind, Condition Track recovery, and other non-resource combat recovery. Do not use for recovery of expendable resources; use resource_recovery.'),
  condition_removal: D('Directly removes/reduces a negative condition, persistent condition, impairment, or Condition Track penalty. If the mechanic specifically changes the Condition Track, also apply condition_track.'),
  // ---- medical / repair ----
  medical: D('Direct interaction with medical equipment, procedures, surgery, implants, medpacs, or medical technology.'),
  medicine: D('Direct therapeutic treatment of creatures, including diagnosis/treatment of injury, disease, poison, or harmful conditions. It does not require the exact Treat Injury skill.'),
  repair: D('Directly restores functionality, HP, condition, or operation to droids, vehicles, objects, or equipment through repair.'),
  self_repair: D('The subject directly repairs/restores itself, especially droid/mechanical self-maintenance.'),
  biotech: D('Direct biological technology, bioengineering, biological augmentation, or biotech devices.'),
  implant: D('Direct implant/cybernetic installation, use, modification, or effects.'),
  poison: D('Directly creates, applies, modifies, resists, treats, or interacts with poison.'),
  // ---- support / group ----
  support: D('The operative mechanic directly provides a beneficial mechanical effect to another creature/group or enables another creature to perform better. Self-only benefit is not support.'),
  ally_support: D('The ally/other friendly creature directly receives the benefit, action, movement, defense, resource, healing, bonus, or equivalent support. IMPLIES support. Do not use merely because an ally is mentioned as a trigger for a self-only benefit.'),
  'ally-trigger': D('An ally\'s action, success, damage, position, use of an ability, or other state directly triggers the record\'s mechanic. The resulting benefit may affect the user or someone else. Do not infer ally_support unless an ally actually receives support.'),
  teamwork: D('The mechanic requires or rewards active cooperation, coordinated participation, shared positioning, Aid Another, shared feat ownership, or combined actions among allied characters. Unilateral support does not automatically imply teamwork.'),
  leadership: D('The mechanic represents leadership presence, authority, inspiration, organization, or management of allies/followers as a continuing role.'),
  command: D('The mechanic directly issues orders, grants/directs actions, changes subordinate behavior, or performs explicit tactical command.'),
  morale: D('Directly modifies morale, courage, morale bonuses/penalties, or morale/fear-related group state.'),
  followers: D('Directly uses or modifies the follower subsystem or owned/following NPC followers.'),
  minion: D('Directly uses or modifies minions as a subordinate/minion mechanic.'),
  // ---- beast / mount ----
  beast: D('Direct mechanical scope involving beasts/animals as creatures.'),
  beast_companion: D('Direct mechanics involving a bonded/controlled beast companion.'),
  mount: D('Direct mechanics of mounted combat, a mount, or mount-dependent actions.'),
  rider: D('Direct benefit/restriction applied to the rider or rider/mount relationship.'),
  // ---- resources ----
  resources: D('The substantive mechanic changes availability, management, amount, access, or use of a limited consumable resource or limited-use capability. Do not add merely because a resource is paid as a routine activation cost. Specific tags remain preferred.'),
  resource_spend: U('RESOURCE_SPEND_POLICY'), resource_recovery: U('RESOURCE_RECOVERY_POLICY'), force_capacity: U('FORCE_CAPACITY_POLICY'), force_point_spend: U('FORCE_POINT_SPEND_POLICY'),
  // ---- force general ----
  force: D('The operative mechanic directly involves the Force; Force powers; Force talents/techniques/secrets; Use the Force; Force sensitivity/training; Force-specific resources or effects. Ordinary English "force" does not qualify. use_the_force -> force remains mandatory.'),
  force_power: D('Directly changes acquisition, availability, suite membership, recovery, selection, or possession of Force powers as discrete powers/resources. Do not use merely because a record modifies the effect of a particular Force power.'),
  force_power_synergy: D('Directly modifies, enhances, combines with, changes, or depends on activation/effect of one or more Force powers. IMPLIES force.'),
  force_training: D('Directly grants or modifies Force training/sensitivity, Force Training entitlement, Force-power suite training/access, or equivalent Force-training capacity.'),
  force_multiplier: D('Directly increases the magnitude/die/effectiveness of an existing Force-based numerical benefit, especially Force Point bonus dice or similar amplification. It does not create more resource units.'),
  force_control: D('Directly alters the mode, descriptor, damage form, alignment descriptor, or functional behavior of an activated Force power (for example changing light/dark descriptor treatment, converting Force-power damage to stun).'),
  force_offense: D('A direct offensive Force mechanic against enemies: damaging, attacking, or hostile Force application.'),
  force_defense: D('Direct use of Force mechanics for defense or direct defense/resistance against Force attacks/powers.'),
  'anti-force': D('Directly suppresses, resists, counters, negates, detects against, or impairs Force powers/Force users.'),
  force_support: D('Uses a Force mechanic to directly aid another creature.'),
  // ---- alignment / mystic subdomains ----
  dark_side: D('Direct interaction with Dark Side powers/descriptors/alignment mechanics.'),
  dark_side_score: D('Direct use, increase, decrease, comparison, or mechanical dependence on Dark Side Score.'),
  light_side: D('Direct interaction with Light Side powers/descriptors/alignment mechanics.'),
  telekinesis: D('Direct Force-based telekinetic movement/manipulation.'),
  telepathy: D('Direct Force-based mental communication, mental influence, mind reading, or telepathic interaction.'),
  telepath: D('Use only for specialized deep telepathic probing/intrusion/mind-reading capability where telepathy is a defining operative mechanic, not merely any generic telepathic communication. May coexist with telepathy. Must never be assigned because the talent belongs to a Telepath tree.'),
  precognition: D('Direct future-sensing/foreknowledge that mechanically affects later outcomes.'),
  visions: D('Direct visions/foresight/revelatory vision mechanics.'),
  search_your_feelings: D('Direct interaction with the Search Your Feelings Force application.'),
  meditation: D('A substantive mechanic requires or operates through meditation as an action/state/process.'),
  illusion: D('Direct creation, manipulation, resistance, or detection of Force illusions.'),
  talisman: D('Direct creation/use/modification of Force/Sith talismans.'),
  spellcasting: D('Direct interaction with an explicitly published spellcasting/witchcraft/spell mechanic. Do not apply because something merely resembles a spell.'),
  // ---- tech / equipment ----
  tech: D('The operative mechanic directly involves technological devices, engineering, electronics, machinery, technical systems, or technical modification. A broad domain tag, not a synonym for Mechanics or Use Computer.'),
  equipment: D('Direct interaction with equipment as an item/object: creating, modifying, equipping, choosing, transferring, maintaining, granting an equipment property. Do not apply to every weapon-scoped combat ability merely because a weapon is equipment.'),
  crafting: D('Directly constructs/creates an item, device, weapon, armor, droid component, trap, or similar object.'),
  modification: D('Directly alters an existing item\'s/device\'s properties or capabilities.'),
  jury_rig: D('Direct temporary/emergency repair or temporary improvised modification used to keep equipment functioning or improve it provisionally.'),
  power_systems: D('Direct interaction with generators, power supplies, batteries, recharge, rerouting power, or similar power-system mechanics.'),
  sensors: D('Direct interaction with sensor systems/scanning technology.'),
  slicing: D('Direct computer intrusion, hacking, slicing, unauthorized system access, or counter-slicing.'),
  science: D('Direct scientific analysis, experimentation, technical scientific knowledge, or laboratory-style mechanics.'),
  trap: D('Direct creation, deployment, triggering, detection, disabling, or modification of traps/mines/fixed hazards.'),
  alchemy: D('Direct published alchemical creation/modification mechanics, especially Sith alchemy.'),
  // ---- droid / vehicle / space ----
  droid: D('Direct mechanical scope involving droids, droid traits, droid systems, or droid-specific effects. Generic reference to a droid example does not qualify.'),
  vehicle: D('Direct operation, piloting, attacking with, modifying, repairing, defending, or otherwise mechanically interacting with vehicles. Do not use when vehicles appear only as an exception ("does not apply to vehicles", "non-vehicle weapon", "not against objects or vehicles").'),
  space: D('Directly operates in starship/space-combat or space-environment mechanics. Generic vehicle mechanics do not automatically imply space.'),
  // ---- awareness / information ----
  awareness: D('Directly improves situational awareness/readiness or the ability to notice threats/events, usually through Perception, Initiative-like readiness, or sensory awareness.'),
  senses: D('Direct modification or use of a sensory capability such as scent, vision modes, hearing, special senses.'),
  detection: D('Direct ability to locate, reveal, notice, expose, or detect hidden/concealed/invisible/Force/etc. targets, objects, or effects.'),
  recon: D('Direct scouting/reconnaissance gathering of battlefield/location/enemy information.'),
  tracking: D('Directly follows trails, traces, signatures, targets, or pursuit information over time.'),
  investigation: D('Direct analysis/search of clues, evidence, records, secrets, or investigative information.'),
  exploration: D('Direct mechanics for exploring environments, traversing unknown areas, locating environmental features, or expedition-style discovery.'),
  nature: D('Direct natural-environment, ecology, weather, beast-lore, wilderness, or environmental-domain mechanics.'),
  // ---- infiltration / social ----
  infiltration: D('Directly enables covert entry, disguise, bypassing access/security, hidden presence, or operating inside hostile/restricted areas.'),
  social: D('Directly operates through social interaction, attitudes, interpersonal influence, or social skill resolution.'),
  manipulation: D('Directly changes another creature\'s behavior/attitude/choice through deception, persuasion, coercion, mind-affecting manipulation, or equivalent influence.'),
  intrigue: D('Direct mechanics involving political/social schemes, secrets, plots, influence networks, or intrigue-oriented manipulation/information.'),
  social_network: D('Direct use of contacts, allies, organizations, or social networks to obtain information/resources/benefits.'),
  network: D('Direct use of an interconnected communication/information/linked network, including mechanical sharing through network links. Do not automatically equate with social_network.'),
  fear: D('Directly applies, modifies, resists, or exploits fear.'),
  'mind-affecting': D('The operative mechanic is explicitly mind-affecting or directly modifies/resists a mind-affecting effect.'),
  feint: D('Direct interaction with the Feint mechanic or combat feinting.'),
  // ---- target / aim ----
  targeting: D('Direct interaction with target acquisition or target-specific attack/effect resolution: aim; choosing a combat target; line-of-sight targeting; targeting software; target-specific attack modifiers; changing where an attack is considered to originate for targeting purposes. Do not use merely because every attack naturally has a target.'),
  'target-designation': D('The mechanic explicitly marks/designates/selects a creature/object as a special ongoing target for a later or continuing mechanical effect. Do not apply when "designate" means choose equipment, choose a weapon, choose an option, or make a generic one-time choice. Signature Device-style equipment designation is not target designation.'),
  // ---- tactics / empowerment ----
  tactics: D('Direct tactical planning, formation, maneuver choice, battlefield coordination, or tactical advantage as the operative mechanic.'),
  empowerment: D('The mechanic directly strengthens, shares, upgrades, amplifies, or temporarily enhances another ability, power, talent, ally, or effect beyond its ordinary baseline. Do not use for every numeric attack or damage bonus when a specific mechanical tag fully describes the effect.'),
  'temporary-talent': D('Direct temporary access to/use of a talent the character does not permanently possess. Do not use for ordinary talent sharing unless the recipient actually gains temporary access to the talent itself.')
};
