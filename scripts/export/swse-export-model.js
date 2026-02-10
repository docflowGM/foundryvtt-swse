/**
 * Build a semantic, PDF-agnostic export model from a SWSE Actor.
 * This is the authoritative representation of character data for export.
 */
export function buildExportModel(actor) {
  if (!actor) {throw new Error('Actor required');}

  const sys = actor.system || {};

  return {
    header: buildHeader(actor, sys),
    abilities: buildAbilities(sys),
    hp: buildHp(sys),
    damageThreshold: sys.damageThreshold || 10,
    defenses: buildDefenses(sys),
    combat: buildCombat(sys),
    force: buildForce(sys),
    condition: buildCondition(sys),
    weapons: buildWeapons(actor),
    equipment: buildEquipment(actor),
    languages: buildLanguages(actor),
    skills: buildSkills(sys),
    feats: buildFeats(actor),
    talents: buildTalents(actor),
    forcePowers: buildForcePowers(actor)
  };
}

function buildHeader(actor, sys) {
  return {
    name: actor.name || '',
    player: sys.player || '',
    class: sys.class?.name || sys.className || sys.class || '',
    species: sys.species?.name || sys.species || '',
    level: sys.level || 1,
    age: sys.age || '',
    gender: sys.gender || '',
    height: sys.height || '',
    weight: sys.weight || '',
    destiny: sys.destiny?.type || ''
  };
}

function buildAbilities(sys) {
  const abilities = sys.abilities || sys.attributes || {};
  const out = {};

  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const a = abilities[key] || {};
    const score = a.total ?? a.value ?? a.base ?? 10;
    out[key] = {
      score: Number(score),
      mod: Number(a.mod ?? Math.floor((score - 10) / 2))
    };
  }

  return out;
}

function buildHp(sys) {
  const hp = sys.hp || {};
  return {
    total: Number(hp.max || 10),
    current: Number(hp.value || 0)
  };
}

function buildDefenses(sys) {
  const defenses = sys.defenses || {};
  const buildDefense = (d) => ({
    total: Number(d?.total || 10),
    armor: Number(d?.armor || 0),
    class: Number(d?.class || 0),
    ability: Number(d?.ability || 0),
    misc: Number(d?.misc || 0)
  });

  return {
    fort: buildDefense(defenses.fortitude || defenses.fort),
    ref: buildDefense(defenses.reflex || defenses.ref),
    will: buildDefense(defenses.will)
  };
}

function buildCombat(sys) {
  return {
    speed: Number(sys.speed?.total ?? sys.speed ?? 6),
    initiative: Number(sys.initiative || 0),
    perception: Number(sys.perception || 0),
    baseAttack: Number(sys.bab?.total ?? sys.bab ?? sys.baseAttackBonus ?? 0)
  };
}

function buildForce(sys) {
  return {
    forcePoints: Number(sys.forcePoints?.value ?? 0),
    destinyPoints: Number(sys.destinyPoints?.value ?? 0)
  };
}

function buildCondition(sys) {
  return {
    state: sys.conditionTrack || 'normal',
    darkSideScore: Number(sys.darkSideScore || 0)
  };
}

function buildWeapons(actor) {
  const weapons = (actor?.items || [])
    .filter((i) => i.type === 'weapon' && i.system?.equipped)
    .slice(0, 4); // Max 4 rows on PDF

  return weapons.map((w) => {
    const sys = w.system || {};
    return {
      name: w.name || '',
      attack: String(sys.attackBonus || sys.attack || ''),
      damage: String(sys.damage || ''),
      crit: String(sys.criticalMultiplier || sys.crit || ''),
      type: String(sys.damageType || sys.type || ''),
      notes: String(sys.notes || '')
    };
  });
}

function buildEquipment(actor) {
  return (actor?.items || [])
    .filter((i) => i.type === 'equipment')
    .slice(0, 20)
    .map((e) => ({
      name: e.name || '',
      weight: Number(e.system?.weight || 0)
    }));
}

function buildLanguages(actor) {
  const langs = (actor?.system?.languages || []);
  return Array.isArray(langs)
    ? langs.map((l) => String(l))
    : [];
}

function buildSkills(sys) {
  const skills = sys.skills || {};
  const buildSkill = (s) => ({
    total: Number(s?.total || 0),
    half: Number(s?.half || 0),
    ability: String(s?.selectedAbility || s?.ability || ''),
    trained: s?.trained === true,
    focus: s?.focused === true,
    misc: Number(s?.misc || 0)
  });

  const skillNames = [
    'acrobatics',
    'climb',
    'deception',
    'endurance',
    'gatherInfo',
    'initiative',
    'jump',
    'knowledge1',
    'knowledge2',
    'mechanics',
    'perception',
    'persuasion',
    'pilot',
    'ride',
    'stealth',
    'survival',
    'swim',
    'treatInjury',
    'useComputer',
    'useTheForce'
  ];

  const out = {};
  for (const key of skillNames) {
    out[key] = buildSkill(skills[key]);
  }

  return out;
}

function buildFeats(actor) {
  return (actor?.items || [])
    .filter((i) => i.type === 'feat')
    .map((f) => f.name || '');
}

function buildTalents(actor) {
  return (actor?.items || [])
    .filter((i) => i.type === 'talent')
    .map((t) => t.name || '');
}

function buildForcePowers(actor) {
  return (actor?.items || [])
    .filter((i) => i.type === 'forcepower' || i.type === 'force-power')
    .map((p) => p.name || '');
}
