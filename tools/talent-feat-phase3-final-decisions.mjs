// Phase 3 final application of the owner definitions to the 196 former unresolved findings and to the existing-tag compliance candidates.
// Each entry applies ONE owner definition (FINAL_DEFINITIONS[tag] + its policies) to the canonical mechanic text of ONE record. No new semantic policy is created.
// Findings not listed in FINDING_ADDS are NO_CHANGE (the positive inclusion rule is not directly satisfied). Records are addressed by domain letter + first 8 hex of canonicalId;
// the builder resolves each to a full canonicalId and fails closed on zero or multiple matches.

// [domain letter, canonicalId prefix, tag]
export const FINDING_ADDS = [
  ['T', '2be9f49f', 'ally_support'], ['T', '3aeee38a', 'ally_support'], ['T', '7acc479d', 'ally_support'], ['T', '50073b86', 'ally_support'], ['T', 'a6e38142', 'ally_support'],
  ['T', 'c483676c', 'concealment'],
  ['T', 'a67a1a65', 'cover'], ['T', 'c483676c', 'cover'], ['T', 'f25d2825', 'cover'], ['T', 'f29d5c06', 'cover'],
  ['T', 'ad7fd3e1', 'damage_reduction'], ['T', 'eb4f3e86', 'damage_reduction'],
  ['T', '2fc019fa', 'dark_side_score'], ['T', '3331d4b2', 'dark_side_score'], ['T', '81b2b88d', 'dark_side_score'], ['T', '97a771d1', 'dark_side_score'], ['T', 'bd797d3f', 'dark_side_score'],
  ['F', '2866d953', 'defense'],
  ['T', 'cf4b1e5b', 'force_defense'],
  ['F', '0536f81e', 'lightsaber'], ['T', '0df15b0e', 'lightsaber'],
  ['F', '61c05319', 'melee'], ['F', 'cda6cb7b', 'melee'], ['T', '153f4b3c', 'melee'], ['T', '16aa9efd', 'melee'], ['T', '444c032c', 'melee'], ['T', '7f63f6f3', 'melee'], ['T', 'd043a3c0', 'melee'], ['T', 'de751f28', 'melee'],
  ['F', '191aacae', 'morale'], ['F', '223a5c14', 'morale'], ['F', '63dbb0e9', 'morale'], ['F', '67232702', 'morale'], ['F', 'a9a59c85', 'morale'], ['F', 'df58db54', 'morale'],
  ['F', '8778b427', 'pistol'], ['F', '94023012', 'pistol'],
  ['T', '181da7f3', 'poison'],
  ['F', '2866d953', 'ranged'], ['T', '153f4b3c', 'ranged'], ['T', '16aa9efd', 'ranged'], ['T', 'a7aea041', 'ranged'], ['T', 'da5096b4', 'ranged'],
  ['F', '6dcb59b1', 'target-designation'], ['F', 'a75d5d6b', 'target-designation'], ['T', '0178e98b', 'target-designation'], ['T', '0991f432', 'target-designation'], ['T', '1d50b01d', 'target-designation'],
  ['T', '2b44b253', 'target-designation'], ['T', '4acfb3b5', 'target-designation'], ['T', '4c7eb9c6', 'target-designation'], ['T', '50273d5c', 'target-designation'], ['T', '5ea6368f', 'target-designation'],
  ['T', 'a1a90501', 'target-designation'], ['T', 'd137ae2e', 'target-designation'], ['T', 'd1c2e9bd', 'target-designation'], ['T', 'e55e9497', 'target-designation'], ['T', 'ea9a4f11', 'target-designation'], ['T', 'f9a2bda9', 'target-designation'],
  ['F', '42e24047', 'teamwork'], ['F', 'a717435c', 'teamwork'], ['F', 'e9147ce6', 'teamwork'], ['F', 'e95252c0', 'teamwork'], ['T', '367b2380', 'teamwork'], ['T', 'b2b2176b', 'teamwork'], ['T', 'ef3ec550', 'teamwork'],
  ['T', '383915a7', 'vehicle'], ['T', '700ec3d7', 'vehicle'], ['T', '7d547902', 'vehicle'], ['T', 'e15adb60', 'vehicle']
];

// Why the positive inclusion rule IS directly satisfied (ADD) and why it is NOT (NO_CHANGE), per tag. Each sentence restates the owner definition's operative test / exclusion.
export const ADD_BASIS = {
  ally_support: 'The ally (or allies) directly receives the protection/benefit/bonus the mechanic creates, not merely an ally-trigger or condition.',
  concealment: 'The operative mechanic requires/depends on the Concealment state as part of how the effect resolves.',
  cover: 'The operative mechanic requires, moves to, or conditions its effect on the Cover state.',
  damage_reduction: 'The operative mechanic directly states how damage interacts with Damage Reduction (counts toward overcoming it or defines a weapon\'s DR).',
  dark_side_score: 'The operative mechanic depends on a Dark Side Score comparison/threshold.',
  defense: 'The operative mechanic directly changes whether an attack hits or is avoided.',
  force_defense: 'The operative mechanic directly defends against Force powers targeting the user.',
  lightsaber: 'The operative mechanic names lightsabers as a closed scope (wielding/with lightsabers, or how lightsabers interact with the effect).',
  melee: 'The operative scope is melee attacks/melee combat as a named closed scope (CLOSED_SCOPE_POLICY).',
  morale: 'The operative mechanic grants, modifies or negates a morale bonus/penalty.',
  pistol: 'The operative mechanic names pistols as a closed scope.',
  poison: 'The operative mechanic directly treats poison.',
  ranged: 'The operative scope is ranged attacks/ranged combat as a named closed scope (CLOSED_SCOPE_POLICY).',
  'target-designation': 'The mechanic marks/designates a specific creature as a special target for a later or continuing effect (not equipment, option, area or one-time choice).',
  teamwork: 'The mechanic involves Aid Another, shared feat ownership, or shared flanking position among allied characters.',
  vehicle: 'The mechanic directly interacts with vehicle-specific rules (vehicle weapons, shielded vehicles, occupied vehicle), not a generic target list or exception.'
};
export const NO_CHANGE_BASIS = {
  ally_support: 'The ally appears only as a trigger, condition, target of a self-only benefit, or the beneficiary is the user; no ally directly receives support.',
  concealment: 'Concealment appears only as ordinary English/reference.',
  cover: 'Cover appears only as ordinary English (cover story, trait tables) or as an incidental reference without operative dependence.',
  damage_reduction: 'DR appears only as an abbreviation inside another rule without operative interaction.',
  dark_side: 'Dark Side appears only as a bonus-type name or tree identity; no direct interaction with Dark Side powers/descriptors/alignment mechanics.',
  dark_side_score: 'n/a',
  defense: 'The mechanic does not change whether an attack hits or is avoided.',
  evasion: 'Evasion appears only as a reference to the existing talent; the record does not avoid/negate an attack.',
  force_defense: 'The mechanic is not defense against Force powers (offense, self-targeting redirection).',
  healing: 'The mechanic does not restore hit points ("healed" or second wind used only as a trigger/duration).',
  lightsaber: 'Lightsabers appear only as flavor.',
  melee: 'Melee appears only as exclusion, comparison, or a state; not the operative scope.',
  modification: 'Ordinary-English "modify" with no item/device modification.',
  morale: 'Morale/fear appears only as ordinary English or a fear effect; no morale bonus/penalty is modified.',
  pistol: 'The pistol is a stat reference for a device, not a pistol mechanic.',
  poison: 'n/a',
  ranged: 'Ranged appears only as exclusion, reference, or an incidental weapon type.',
  ranged_defense: 'No defense against ranged attacks is created.',
  recovery: 'The mechanic does not restore from injury/impairment (it blocks recovery, is triggered by second wind, or reduces steps moved).',
  repair: 'Repair appears only as the condition under which an existing penalty ends; the record does not restore functionality.',
  shields: 'Ordinary-English "shield" or a talent/action name; no interaction with shields or Shield Rating.',
  surprise_round: 'Acts after the Surprise Round; no change during a Surprise Round.',
  'target-designation': 'Designation is equipment/option/area/form choice or an immediate one-time effect, not a continuing special target.',
  teamwork: 'Flanking against the user or an unrelated reference; no cooperation or shared position is required/rewarded.',
  vehicle: 'Vehicles appear only as an exception, generic target list, or incidental reference.'
};

// Compliance REMOVEs of existing tags: [domain, prefix, tag, controlling policy ids, reason]. Applied only where the canonical text clearly contradicts the final definition
// or qualifies solely through an explicitly forbidden basis.
export const COMPLIANCE_REMOVES = [
  ['T', '2da74bc3', 'telepath', [], 'Perfect Telepathy improves ordinary telepathic communication; telepath is only for deep probing/intrusion/mind reading and never for generic telepathic communication or tree identity.'],
  ['T', '9e209225', 'exotic_weapon', ['OPEN_GENERIC_SCOPE_POLICY'], 'Flurry Attack lets the character choose "a single weapon group or exotic weapon": open generic weapon selection does not qualify.'],
  ['T', 'e9820', 'melee', ['OPEN_GENERIC_SCOPE_POLICY'], 'Greater Weapon Specialization selects one exotic weapon or one of several weapon groups: open generic selection does not qualify.'],
  ['T', 'e9820', 'ranged', ['OPEN_GENERIC_SCOPE_POLICY'], 'Greater Weapon Specialization selects one exotic weapon or one of several weapon groups: open generic selection does not qualify.'],
  ['T', '5db43', 'power_systems', ['REFERENCE_ONLY_POLICY'], 'Device Jammer names a "personal shield generator" only as an example of an electronic device; no direct power-system interaction.'],
  ['T', '4ae84', 'recovery', [], 'Greater Focused Force Talisman concerns recovering a Force power with a Force Point (expendable resource); recovery is not used for recovery of expendable resources.']
];
