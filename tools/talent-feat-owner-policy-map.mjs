// Mechanical map from vocabulary tags to the EXPLICIT owner policies that define them (cumulative owner authority, data/audits/talent-feat-pass3b-owner-adjudication.json).
// Nothing here defines a tag: it only records which already-issued owner policy names the tag as its own subject (FULL), or touches it without defining it (PARTIAL).
// Partial authority references cite existing owner-ruling files (not policy IDs) where the owner ruled on usage without issuing a tag-level policy.
export const POLICY_DEFINES = {
  reaction: ['ACTION_TYPE_POLICY'], swift_action: ['ACTION_TYPE_POLICY'], move_action: ['ACTION_TYPE_POLICY'], standard_action: ['ACTION_TYPE_POLICY'],
  reroll: ['REROLL_POLICY'], reliability: ['RELIABILITY_POLICY'], force_point_spend: ['FORCE_POINT_SPEND_POLICY'], resource_spend: ['RESOURCE_SPEND_POLICY'],
  resource_recovery: ['RESOURCE_RECOVERY_POLICY'], 'once-per-encounter': ['ONCE_PER_ENCOUNTER_POLICY'], force_capacity: ['FORCE_CAPACITY_POLICY'],
  damage_threshold: ['DAMAGE_THRESHOLD_POLICY'], damage_bonus: ['DAMAGE_BONUS_POLICY'], sustained_damage: ['SUSTAINED_DAMAGE_POLICY'], critical_success: ['CRITICAL_SUCCESS_POLICY'],
  grab: ['GRAB_POLICY'], grapple: ['GRAPPLE_POLICY'], restrain: ['RESTRAIN_POLICY'], battlefield_control: ['BATTLEFIELD_CONTROL_POLICY'], movement: ['MOVEMENT_POLICY'], mobility: ['MOBILITY_POLICY'],
  attack_of_opportunity: ['ATTACK_OF_OPPORTUNITY_POLICY'], full_attack: ['FULL_ATTACK_POLICY'], dual_wield: ['DUAL_WIELD_POLICY'], stun: ['STUN_POLICY']
};
export const POLICY_PARTIAL = {
  action_economy: ['ACTION_TYPE_POLICY', 'FULL_ROUND_ACTION_POLICY'], critical_hit: ['CRITICAL_SUCCESS_POLICY', 'SPECIFIC_OVER_BROAD_POLICY'], positioning: ['SPECIFIC_OVER_BROAD_POLICY'], control: ['SPECIFIC_OVER_BROAD_POLICY'],
  melee: ['CLOSED_SCOPE_POLICY', 'OPEN_GENERIC_SCOPE_POLICY'], ranged: ['CLOSED_SCOPE_POLICY', 'OPEN_GENERIC_SCOPE_POLICY'], unarmed: ['CLOSED_SCOPE_POLICY', 'OPEN_GENERIC_SCOPE_POLICY'],
  lightsaber: ['CLOSED_SCOPE_POLICY', 'OPEN_GENERIC_SCOPE_POLICY'], pistol: ['CLOSED_SCOPE_POLICY', 'OPEN_GENERIC_SCOPE_POLICY'], heavy_weapon: ['OPEN_GENERIC_SCOPE_POLICY'], exotic_weapon: ['OPEN_GENERIC_SCOPE_POLICY'],
  nonlethal: ['STUN_POLICY']
};
// Pass 3A / Pass 2 owner skill rulings: exact skill tags have an owner-ruled usage standard but no tag-level policy ID.
export const SKILL_TAGS = ['acrobatics', 'climb', 'deception', 'endurance', 'gather_information', 'initiative', 'jump', 'knowledge', 'mechanics', 'perception', 'persuasion', 'pilot', 'ride', 'stealth', 'survival', 'swim', 'treat_injury', 'use_computer', 'use_the_force'];
export const PARTIAL_AUTHORITY_REFS = {
  skill: ['data/audits/talent-feat-pass3a-skill-owner-adjudication.json', 'data/audits/feat-tags-pass2-owner-adjudication.json'],
  family: ['data/audits/feat-tags-pass2-owner-adjudication.json']
};
// Distinctions the owner policies state explicitly (SPECIFIC_OVER_BROAD_POLICY and tag-specific policies). Related-but-distinct pairs only.
export const RELATED_DISTINCT = [
  ['movement', 'mobility'], ['movement', 'positioning'], ['control', 'battlefield_control'], ['critical_hit', 'critical_success'], ['resource_spend', 'resource_recovery'],
  ['force_capacity', 'resource_recovery'], ['stun', 'nonlethal'], ['damage_bonus', 'damage_threshold'], ['damage_bonus', 'damage_reduction'], ['grab', 'grapple'], ['grapple', 'restrain'], ['reroll', 'reliability']
];
