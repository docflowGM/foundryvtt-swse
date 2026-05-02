const POWER_ROLE_METADATA = {
  // Standard Force powers
  'battle strike': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['attackBuff', 'meleeSupport', 'weaponCombat', 'setup'],
    notes: 'Core martial self-buff for saber or melee Force users.'
  },
  surge: {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['mobility', 'positioning', 'setup', 'tempo'],
    notes: 'Excellent martial setup and delivery power.'
  },
  battlemind: {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['selfBuff', 'durability', 'weaponCombat'],
    notes: 'Martial reinforcement and combat endurance.'
  },
  'force weapon': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['weaponBuff', 'attackBuff', 'setup'],
    notes: 'Directly improves weapon-centric Force users.'
  },
  'force defense': {
    primaryRole: 'hybrid',
    secondaryRole: 'martial',
    roleTags: ['defense', 'survivability', 'antiForce'],
    notes: 'Defensive staple, especially in Force-heavy games.'
  },
  'negate energy': {
    primaryRole: 'hybrid',
    secondaryRole: 'martial',
    roleTags: ['defense', 'rangedDefense', 'survivability'],
    notes: 'Broad defensive answer with martial crossover.'
  },
  'force disarm': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['debuff', 'weaponControl', 'tempo'],
    notes: 'Helps weapon users win exchanges.'
  },
  'force track': {
    primaryRole: 'utility',
    secondaryRole: 'hybrid',
    roleTags: ['tracking', 'pursuit', 'exploration'],
    notes: 'Narrative and pursuit utility.'
  },
  'force sense': {
    primaryRole: 'utility',
    secondaryRole: 'support',
    roleTags: ['awareness', 'detection', 'scouting'],
    notes: 'General awareness and detection support.'
  },
  rebuke: {
    primaryRole: 'support',
    secondaryRole: 'hybrid',
    roleTags: ['reaction', 'antiForce', 'defense'],
    notes: 'Counter-Force support pick.'
  },
  'battle meditation': {
    primaryRole: 'support',
    secondaryRole: 'caster',
    roleTags: ['allyBuff', 'leadership', 'teamwide'],
    notes: 'Classic suite-wide support power.'
  },
  inspire: {
    primaryRole: 'support',
    secondaryRole: 'hybrid',
    roleTags: ['allyBuff', 'leadership', 'morale'],
    notes: 'Broad support and leadership identity.'
  },
  'vital transfer': {
    primaryRole: 'support',
    secondaryRole: 'hybrid',
    roleTags: ['healing', 'allySupport', 'resourceTrade'],
    notes: 'Healing/support lane power.'
  },
  'move object': {
    primaryRole: 'caster',
    secondaryRole: 'hybrid',
    roleTags: ['telekinesis', 'control', 'utility', 'ranged'],
    notes: 'Canonical versatile Force-caster power.'
  },
  'mind trick': {
    primaryRole: 'caster',
    secondaryRole: 'support',
    roleTags: ['control', 'social', 'debuff'],
    notes: 'Classic control/social Force power.'
  },
  'force slam': {
    primaryRole: 'caster',
    secondaryRole: 'hybrid',
    roleTags: ['control', 'directDamage', 'area'],
    notes: 'Area disruption with caster lean.'
  },
  'force lightning': {
    primaryRole: 'caster',
    secondaryRole: 'hybrid',
    roleTags: ['directDamage', 'ranged', 'offense'],
    notes: 'Signature Force-caster damage power.'
  },
  'force grip': {
    primaryRole: 'caster',
    secondaryRole: 'hybrid',
    roleTags: ['control', 'singleTarget', 'debuff'],
    notes: 'Single-target control/caster lane.'
  },
  'force storm': {
    primaryRole: 'caster',
    secondaryRole: 'hybrid',
    roleTags: ['directDamage', 'area', 'control'],
    notes: 'Big caster payoff power.'
  },
  'force scream': {
    primaryRole: 'caster',
    secondaryRole: 'hybrid',
    roleTags: ['directDamage', 'area', 'debuff'],
    notes: 'Aggressive dark-side caster pressure.'
  },
  'force stun': {
    primaryRole: 'caster',
    secondaryRole: 'support',
    roleTags: ['control', 'debuff', 'singleTarget'],
    notes: 'UTF-dependent control power.'
  },
  malacia: {
    primaryRole: 'caster',
    secondaryRole: 'support',
    roleTags: ['control', 'debuff'],
    notes: 'Soft-control caster lane.'
  },
  'sever force (lesser)': {
    primaryRole: 'caster',
    secondaryRole: 'support',
    roleTags: ['antiForce', 'control', 'debuff'],
    notes: 'Force-versus-Force control option.'
  },
  'drain life': {
    primaryRole: 'caster',
    secondaryRole: 'support',
    roleTags: ['directDamage', 'healing', 'darkSide'],
    notes: 'Dark-side caster sustain power.'
  },
  'drain energy': {
    primaryRole: 'caster',
    secondaryRole: 'support',
    roleTags: ['debuff', 'resourceDrain', 'darkSide'],
    notes: 'Dark-side control/drain lane.'
  },
  'force cloak': {
    primaryRole: 'utility',
    secondaryRole: 'hybrid',
    roleTags: ['stealth', 'mobility', 'infiltration'],
    notes: 'Stealth utility with sentinel crossover.'
  },
  farseeing: {
    primaryRole: 'utility',
    secondaryRole: 'support',
    roleTags: ['information', 'scouting'],
    notes: 'Long-range informational utility.'
  },

  // Lightsaber form powers — default martial
  'assured strike': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'attackBuff', 'accuracy', 'offense']
  },
  'barrier of blades': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'defense', 'rangedDefense', 'counter']
  },
  'circle of shelter': {
    primaryRole: 'martial',
    secondaryRole: 'support',
    roleTags: ['lightsaberForm', 'defense', 'allyDefense']
  },
  'contentious opportunity': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'control', 'aooPlay', 'counter']
  },
  'deflecting slash': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'counter', 'rangedDefense', 'offense']
  },
  'disarming slash': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'control', 'weaponControl']
  },
  'draw closer': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'mobility', 'meleeDelivery', 'setup']
  },
  'falling avalanche': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'offense', 'control', 'meleePressure']
  },
  'fluid riposte': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'counter', 'offense', 'reaction']
  },
  'hawk-bat swoop': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'mobility', 'offense', 'meleeDelivery']
  },
  'high ground defense': {
    primaryRole: 'martial',
    secondaryRole: 'utility',
    roleTags: ['lightsaberForm', 'defense', 'terrainDependent', 'aooPlay']
  },
  'makashi riposte': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'counter', 'duelist', 'reaction']
  },
  'pass the blade': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'control', 'antiDefense', 'duelist']
  },
  'pushing slash': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'control', 'offense', 'telekinetic']
  },
  'rising whirlwind': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'offense', 'mobility', 'dualSabers']
  },
  'saber swarm': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'offense', 'attackBuff', 'aggressive']
  },
  'sarlacc sweep': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'control', 'offense', 'multiTarget']
  },
  'shien deflection': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'defense', 'rangedDefense', 'mobility']
  },
  'swift flank': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'mobility', 'offense', 'positioning']
  },
  'tempered aggression': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'offense', 'attackBuff', 'darkSide']
  },
  'twin strike': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'offense', 'dualSabers', 'attackBuff']
  },
  'unbalancing block': {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'defense', 'control', 'reaction']
  },
  'unhindered charge': {
    primaryRole: 'martial',
    secondaryRole: 'utility',
    roleTags: ['lightsaberForm', 'mobility', 'meleeDelivery', 'terrainIgnore']
  },
  "vornskr's ferocity": {
    primaryRole: 'martial',
    secondaryRole: 'hybrid',
    roleTags: ['lightsaberForm', 'offense', 'attackBuff', 'darkSide']
  }
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferRoleMetadata(option) {
  const tags = new Set((option?.tags || []).map((tag) => String(tag || '').toLowerCase()));
  const isForm = tags.has('formpower') || tags.has('lightsaberform') || tags.has('lightsaberformpower') || tags.has('lightsaber_form') || tags.has('lightsaber') && tags.has('formpower');
  if (isForm) {
    return {
      primaryRole: 'martial',
      secondaryRole: 'hybrid',
      roleTags: ['lightsaberForm']
    };
  }
  if (tags.has('damage') || tags.has('force_offense') || tags.has('offense_ranged')) {
    return {
      primaryRole: 'caster',
      secondaryRole: 'hybrid',
      roleTags: ['directDamage']
    };
  }
  if (tags.has('buff') && (tags.has('lightsaber') || tags.has('offense_melee'))) {
    return {
      primaryRole: 'martial',
      secondaryRole: 'hybrid',
      roleTags: ['attackBuff']
    };
  }
  if (tags.has('support') || tags.has('ally_support') || tags.has('healing')) {
    return {
      primaryRole: 'support',
      secondaryRole: 'hybrid',
      roleTags: ['support']
    };
  }
  if (tags.has('control') || tags.has('controller') || tags.has('debuff')) {
    return {
      primaryRole: 'caster',
      secondaryRole: 'support',
      roleTags: ['control']
    };
  }
  if (tags.has('mobility') || tags.has('defense') || tags.has('utility')) {
    return {
      primaryRole: 'hybrid',
      secondaryRole: 'utility',
      roleTags: ['utility']
    };
  }
  return {
    primaryRole: 'hybrid',
    secondaryRole: 'utility',
    roleTags: []
  };
}

export function getForcePowerRoleMetadata(option) {
  const byId = POWER_ROLE_METADATA[normalizeKey(option?.id)];
  if (byId) return byId;
  const byName = POWER_ROLE_METADATA[normalizeKey(option?.name)];
  if (byName) return byName;
  return inferRoleMetadata(option);
}

export function getForcePowerRoleTagSet(option) {
  const metadata = getForcePowerRoleMetadata(option);
  return new Set((metadata?.roleTags || []).map((tag) => String(tag || '').toLowerCase()));
}
