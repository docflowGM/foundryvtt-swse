import { ForceRules } from "/systems/foundryvtt-swse/scripts/engine/force/ForceRules.js";

const TAG_ALIAS_GROUPS = {
  melee: ['offense_melee','melee','lightsaber','duelist','finesse','counterattack','weapon_light_melee','weapon_heavy_melee','martial_arts'],
  ranged: ['offense_ranged','ranged','blaster','rifle','pistol','sniper','thrown','heavy_weapon','accuracy'],
  force: ['force','force_power','force_training','force_capacity','force_execution','use_the_force','lightsaber'],
  stealth: ['stealth','concealment','infiltration','sniping','ambush','hidden'],
  social: ['social','persuasion','deception','gather_information','face','leadership'],
  tech: ['tech','hacking','security','droid','repair','mechanics','use_computer','engineering','sabotage'],
  leadership: ['leadership','leader','ally_support','command','teamwork','morale','action_sharing'],
  support: ['support','ally_support','healing','protection','resource_transfer','action_economy'],
  survival: ['survival','tracking','perception','initiative','endurance','scout','wilderness'],
  striker: ['striker','offense_melee','offense_ranged','precision_damage'],
  defender: ['defense','survivability','melee_defense','ranged_defense','shielding','guard'],
  controller: ['control','area_control','target_marking','battlefield_control','mind_affecting'],
  scout: ['tracking','perception','initiative','stealth','mobility','survival'],
  utility: ['utility','knowledge','tech','contacts','resources','medical']
};

const MECHANICAL_BIAS_TO_TAGS = {
  forceSecret: ['force','force_secret'],
  forceDC: ['force_execution','use_the_force'],
  forceRecovery: ['force_recovery','resource_recovery'],
  burstDamage: ['damage','burst_damage','offense_ranged','offense_melee'],
  singleTargetDamage: ['damage','single_target','precision_damage'],
  areaDamage: ['damage','area','area_control'],
  areaControl: ['control','area_control'],
  conditionTrack: ['condition_track','control'],
  counterAttack: ['counterattack','reaction','offense_melee'],
  reactionDefense: ['reaction','defense'],
  damageReduction: ['survivability','damage_reduction','defense'],
  damageMitigationAura: ['ally_support','defense','aura'],
  evasion: ['mobility','reflex_defense','evasion'],
  accuracy: ['accuracy','offense_ranged','offense_melee'],
  critRange: ['critical','accuracy'],
  critDamage: ['critical','damage'],
  initiative: ['initiative','reaction_speed'],
  dualWield: ['dual_wield','offense_melee','offense_ranged'],
  sithAlchemy: ['sith_alchemy','dark_side','crafting'],
  darkSideAffinity: ['dark_side','force'],
  lightSideAffinity: ['light_side','force'],
  formMastery: ['lightsaber_form','lightsaber','duelist'],
  meleeDamage: ['offense_melee','damage'],
  firepower: ['offense_ranged','damage'],
  pilotMastery: ['pilot','vehicle','starship'],
  vehicularDamage: ['vehicle','starship','damage'],
  unarmeddMastery: ['unarmed','martial_arts','offense_melee'],
  strikeForce: ['striker','damage','mobility'],
  flowState: ['action_economy','combat_flow'],
  combatFlow: ['action_economy','combat_flow'],
  combatStamina: ['survivability','resource_recovery'],
  commandAuthority: ['leadership','command','ally_support'],
  formation: ['teamwork','ally_support','leader'],
  allySupport: ['ally_support','support'],
  moraleBonus: ['leadership','morale','ally_support'],
  moraleImpact: ['leadership','social','ally_support'],
  stealth: ['stealth'],
  infiltration: ['stealth','infiltration'],
  trackingMastery: ['tracking','survival'],
  deceptionMastery: ['deception','social'],
  knowledgeMastery: ['knowledge','intelligence_synergy'],
  skillUtility: ['skill_synergy','utility'],
  resourceControl: ['resource_management','utility'],
  informationControl: ['intel','control'],
  networkInfluence: ['contacts','resources','leadership'],
  tacticalAwareness: ['initiative','perception','control'],
  armorMastery: ['armor','defense'],
  grappling: ['grapple','offense_melee','control'],
  droidControl: ['droid','tech','leader'],
  hackingSkills: ['hacking','tech','use_computer'],
  sabotageExpertise: ['sabotage','tech','control'],
  explosiveMastery: ['explosives','area_damage','control'],
  surgicalMastery: ['medical','healing','support'],
  healingMastery: ['healing','support'],
  treatingInjury: ['medical','skill_treat_injury'],
  engineeringMastery: ['engineering','mechanics','tech'],
  tacticalSupport: ['ally_support','leader','control'],
  fortifications: ['defense','engineering','control'],
  improvisation: ['utility','resourcefulness'],
  resourcefulness: ['utility','resourcefulness'],
  criminalExpertise: ['stealth','deception','social'],
  explorationMastery: ['survival','tracking','mobility'],
};

const ROLE_TO_TAGS = {
  striker: ['striker','damage'],
  defender: ['defense','survivability','melee_defense','ranged_defense'],
  controller: ['control','area_control','target_marking'],
  support: ['support','ally_support','healing'],
  scout: ['stealth','tracking','initiative','perception','mobility'],
  utility: ['utility','tech','knowledge'],
  leader: ['leadership','command','ally_support'],
  flex: ['utility','mobility'],
  skirmisher: ['mobility','positioning','striker'],
  bruiser: ['offense_melee','survivability','damage'],
  offense: ['damage','offense_melee','offense_ranged'],
  defense: ['defense','survivability']
};

const ATTRIBUTE_TO_TAGS = {
  str: ['ability_str','offense_melee','grapple','athletics','jump','damage'],
  dex: ['ability_dex','offense_ranged','mobility','reflex_defense','initiative','pilot','stealth'],
  con: ['ability_con','survivability','fortitude_defense','endurance','healing'],
  int: ['ability_int','knowledge','tech','skill_training','use_computer','mechanics'],
  wis: ['ability_wis','perception','survival','healing','force_capacity'],
  cha: ['ability_cha','social','leadership','persuasion','deception','force_execution','use_the_force']
};

function normalize(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean).map(normalize))];
}

function abilityMod(score) {
  return Math.floor(((Number(score) || 10) - 10) / 2);
}

function getAbilityValue(actor, key) {
  return actor?.system?.abilities?.[key]?.value || actor?.system?.attributes?.[key]?.value || 10;
}

export function getCandidateTags(candidate) {
  return unique(candidate?.context?.allTags || candidate?.tags || candidate?.system?.tags || []);
}

export function getBiasTagsFromMentor(mentorBiases = {}) {
  const tags = {};
  for (const [bias, value] of Object.entries(mentorBiases || {})) {
    if (!value) continue;
    for (const tag of TAG_ALIAS_GROUPS[bias] || []) {
      tags[tag] = Math.max(tags[tag] || 0, value);
    }
  }
  return tags;
}

export function getBiasTagsFromIdentity(identityBias = {}) {
  const out = {};
  for (const [key, value] of Object.entries(identityBias.mechanicalBias || {})) {
    if (!value) continue;
    for (const tag of MECHANICAL_BIAS_TO_TAGS[key] || []) {
      out[tag] = Math.max(out[tag] || 0, value);
    }
  }
  for (const [key, value] of Object.entries(identityBias.roleBias || {})) {
    if (!value) continue;
    for (const tag of ROLE_TO_TAGS[key] || []) {
      out[tag] = Math.max(out[tag] || 0, value);
    }
  }
  for (const [key, value] of Object.entries(identityBias.attributeBias || {})) {
    if (!value) continue;
    for (const tag of ATTRIBUTE_TO_TAGS[key] || []) {
      out[tag] = Math.max(out[tag] || 0, value);
    }
  }
  return out;
}

export function getBiasTagsFromArchetype(archetype = null) {
  if (!archetype) return {};
  const out = {};
  for (const [tag, value] of Object.entries(archetype.tagBias || {})) {
    out[normalize(tag)] = Math.max(out[normalize(tag)] || 0, value);
  }
  for (const [key, value] of Object.entries(archetype.roleBias || {})) {
    for (const tag of ROLE_TO_TAGS[key] || []) {
      out[tag] = Math.max(out[tag] || 0, value);
    }
  }
  for (const [key, value] of Object.entries(archetype.attributeBias || {})) {
    for (const tag of ATTRIBUTE_TO_TAGS[key] || []) {
      out[tag] = Math.max(out[tag] || 0, value);
    }
  }
  return out;
}

export function buildTagBiasMap(buildIntent = {}, identityBias = {}, options = {}) {
  const merged = {};
  const apply = (obj, factor = 1) => {
    for (const [tag, value] of Object.entries(obj || {})) {
      merged[tag] = Math.max(merged[tag] || 0, (Number(value) || 0) * factor);
    }
  };
  apply(getBiasTagsFromIdentity(identityBias), 1.0);
  apply(getBiasTagsFromMentor(buildIntent.mentorBiases || {}), 1.1);
  apply(getBiasTagsFromArchetype(buildIntent.primaryArchetypeMeta || null), 1.15);
  for (const theme of buildIntent.primaryThemes || []) {
    for (const tag of TAG_ALIAS_GROUPS[normalize(theme)] || [normalize(theme)]) {
      merged[tag] = Math.max(merged[tag] || 0, 1.0);
    }
  }
  return merged;
}

export function scoreTagAlignment(candidate, buildIntent = {}, identityBias = {}, options = {}) {
  const tags = getCandidateTags(candidate);
  if (!tags.length) return { score: 0, matches: [], tagWeights: {} };
  const biasMap = buildTagBiasMap(buildIntent, identityBias, options);
  let total = 0;
  const matches = [];
  for (const tag of tags) {
    const weight = biasMap[tag] || 0;
    if (weight > 0) {
      total += weight;
      matches.push({ tag, weight });
    }
  }
  matches.sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag));
  const score = Math.max(0, Math.min(1, total / 5));
  return { score, matches, tagWeights: biasMap };
}

export function scoreAttributeRealization(candidate, actor) {
  const tags = getCandidateTags(candidate);
  if (!tags.length || !actor) return { score: 0, axes: [] };
  const trainingAttr = normalize(ForceRules.getForceTrainingAttribute());
  const utfAttr = normalize(ForceRules.getUseTheForceAttribute());
  const axes = [];
  const addAxis = (key, tagsFor, w=1) => {
    if (tags.some(t => tagsFor.includes(t))) axes.push({ ability: key, weight: w });
  };
  addAxis('str', ['offense_melee','grapple','athletics','jump','strength_synergy','martial_arts'], 1.1);
  addAxis('dex', ['offense_ranged','mobility','reflex_defense','initiative','pilot','stealth','finesse','dexterity_synergy'], 1.1);
  addAxis('con', ['survivability','fortitude_defense','endurance','durability','healing'], 1.0);
  addAxis('int', ['knowledge','tech','skill_training','use_computer','mechanics','engineering'], 1.0);
  addAxis('wis', ['perception','survival','tracking','healing'], 1.0);
  addAxis('cha', ['social','leadership','persuasion','deception'], 1.0);
  if (tags.includes('force_capacity') || tags.includes('force_training') || tags.includes('force_multiplier')) {
    addAxis(trainingAttr.slice(0,3), ['force_capacity'], 1.3);
  }
  if (tags.includes('force_execution') || tags.includes('use_the_force') || tags.includes('force_power_check')) {
    addAxis(utfAttr.slice(0,3), ['force_execution'], 1.3);
  }
  if (!axes.length) return { score: 0, axes: [] };
  const abilityMap = { wisdom:'wis', charisma:'cha', strength:'str', dexterity:'dex', constitution:'con', intelligence:'int', wis:'wis', cha:'cha', str:'str', dex:'dex', con:'con', int:'int'};
  let totalWeight = 0;
  let weighted = 0;
  const realized = [];
  for (const axis of axes) {
    const key = abilityMap[axis.ability] || axis.ability;
    const mod = abilityMod(getAbilityValue(actor, key));
    const score = Math.max(0, Math.min(1, (mod + 2) / 6));
    weighted += score * axis.weight;
    totalWeight += axis.weight;
    realized.push({ ability: key, score, mod, weight: axis.weight });
  }
  return { score: totalWeight ? weighted / totalWeight : 0, axes: realized };
}

export function buildMentorBiasAliases() {
  const aliases = {};
  for (const [bias, tags] of Object.entries(TAG_ALIAS_GROUPS)) {
    aliases[bias] = unique([bias, ...tags]);
  }
  return aliases;
}
