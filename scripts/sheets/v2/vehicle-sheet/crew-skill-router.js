import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";

const STATION_SKILLS = {
  pilot: [
    { key: 'pilot', label: 'Pilot', use: 'Maneuver' }
  ],
  copilot: [
    { key: 'pilot', label: 'Pilot', use: 'Aid Pilot' },
    { key: 'useComputer', label: 'Use Computer', use: 'Assist Systems' }
  ],
  gunner: [
    { key: 'attack', label: 'Attack', use: 'Fire Weapon' }
  ],
  engineer: [
    { key: 'mechanics', label: 'Mechanics', use: 'Repair/Boost' }
  ],
  shields: [
    { key: 'mechanics', label: 'Mechanics', use: 'Modulate Shields' },
    { key: 'useComputer', label: 'Use Computer', use: 'Route Shields' }
  ],
  commander: [
    { key: 'knowledgeTactics', label: 'Knowledge (Tactics)', use: 'Command' },
    { key: 'persuasion', label: 'Persuasion', use: 'Rally' }
  ]
};

const SKILL_KEY_ALIASES = {
  use_computer: 'useComputer',
  usecomputer: 'useComputer',
  'use computer': 'useComputer',
  knowledge_tactics: 'knowledgeTactics',
  knowledgetactics: 'knowledgeTactics',
  'knowledge (tactics)': 'knowledgeTactics',
  pilot: 'pilot',
  mechanics: 'mechanics',
  persuasion: 'persuasion',
  perception: 'perception',
  attack: 'attack'
};

const CREW_QUALITY_BONUS = {
  untrained: 0,
  normal: 2,
  skilled: 5,
  expert: 8,
  ace: 10
};

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
}

export function normalizeVehicleSkillKey(skillKey) {
  const raw = String(skillKey ?? '').trim();
  return SKILL_KEY_ALIASES[raw] || SKILL_KEY_ALIASES[raw.toLowerCase()] || SKILL_KEY_ALIASES[normalizeKey(raw)] || raw;
}

export function getStationSkillActions(stationKey) {
  return (STATION_SKILLS[stationKey] ?? []).map((action) => ({ ...action }));
}

function actorFromId(id) {
  if (!id) return null;
  return game?.actors?.get?.(id) ?? null;
}

async function actorFromUuid(uuid) {
  if (!uuid) return null;
  try {
    return await fromUuid(uuid);
  } catch (err) {
    console.warn(`SWSE | Could not resolve crew UUID ${uuid}`, err);
    return null;
  }
}

function getCrewEntry(vehicle, stationKey) {
  const system = vehicle?.system ?? {};
  const positions = system.crewPositions ?? {};
  const entry = positions?.[stationKey];
  if (entry) return entry;

  const owned = Array.isArray(system.ownedActors) ? system.ownedActors : [];
  return owned.find((candidate) => candidate?.position === stationKey || candidate?.role === stationKey) ?? null;
}

export async function resolveVehicleCrewActor(vehicle, stationKey) {
  const entry = getCrewEntry(vehicle, stationKey);
  if (!entry) {
    return { actor: null, entry: null, label: 'Crew Quality', source: 'fallback' };
  }

  if (typeof entry === 'string') {
    const fromDirectUuid = await actorFromUuid(entry);
    const fromDirectId = actorFromId(entry);
    const actor = fromDirectUuid || fromDirectId;
    return { actor, entry, label: actor?.name || entry, source: actor ? 'actor' : 'fallback' };
  }

  const actor = await actorFromUuid(entry.uuid) || actorFromId(entry.id) || actorFromId(entry.actorId);
  return {
    actor,
    entry,
    label: actor?.name || entry.name || entry.label || 'Crew Quality',
    source: actor ? 'actor' : 'fallback'
  };
}

function buildFallbackFormula(vehicle, skillKey) {
  const quality = String(vehicle?.system?.crewQuality || 'normal').toLowerCase();
  const qualityBonus = CREW_QUALITY_BONUS[quality] ?? CREW_QUALITY_BONUS.normal;
  const vehicleBonus = Number(vehicle?.system?.[skillKey] ?? vehicle?.system?.attackBonus ?? 0) || 0;
  const totalBonus = skillKey === 'attack' ? vehicleBonus + qualityBonus : qualityBonus;
  return { formula: `1d20 + ${totalBonus}`, quality, totalBonus };
}

async function rollFallback(vehicle, stationKey, skillKey, options = {}) {
  const { formula, quality, totalBonus } = buildFallbackFormula(vehicle, skillKey);
  const roll = await globalThis.SWSE?.RollEngine?.safeRoll?.(formula) ?? await new Roll(formula).evaluate();
  const stationLabel = stationKey.charAt(0).toUpperCase() + stationKey.slice(1);
  const skillLabel = options.skillLabel || skillKey;
  await SWSEChat.postRoll({
    roll,
    actor: vehicle,
    flavor: `${vehicle.name} ${stationLabel} ${skillLabel} — Crew Quality ${quality} (${totalBonus >= 0 ? '+' : ''}${totalBonus})`,
    context: {
      type: 'vehicle-crew',
      station: stationKey,
      skillKey,
      actingCrew: 'Crew Quality',
      vehicleName: vehicle.name
    }
  });
  return { roll, actor: vehicle, fallback: true, stationKey, skillKey };
}

export async function rollVehicleCrewSkill(vehicle, stationKey, skillKey, options = {}) {
  if (!vehicle) return null;
  const normalizedSkill = normalizeVehicleSkillKey(skillKey);
  const resolution = await resolveVehicleCrewActor(vehicle, stationKey);
  const actor = resolution.actor;
  const stationLabel = stationKey.charAt(0).toUpperCase() + stationKey.slice(1);

  if (normalizedSkill === 'attack') {
    const weaponId = options.weaponId;
    const weapon = weaponId ? vehicle.items?.get?.(weaponId) : null;
    if (!weapon) {
      ui?.notifications?.warn?.('No vehicle weapon found for this gunner action.');
      return null;
    }
    if (actor) {
      const roll = await rollAttack(actor, weapon);
      ui?.notifications?.info?.(`${actor.name} fires ${weapon.name} from ${vehicle.name}.`);
      return { roll, actor, fallback: false, stationKey, skillKey: normalizedSkill, weapon };
    }
    return rollFallback(vehicle, stationKey, normalizedSkill, { ...options, skillLabel: `${weapon.name} Attack` });
  }

  if (actor) {
    const result = await rollSkillCheck(actor, normalizedSkill, {
      ...options,
      sourceType: 'vehicle',
      sourceLabel: `${vehicle.name} ${stationLabel}`,
      skillUse: options.skillUse || `${stationLabel} action`,
      vehicleName: vehicle.name,
      crewPosition: stationKey
    });
    if (result?.roll) {
      ui?.notifications?.info?.(`${actor.name} acts as ${stationLabel} for ${vehicle.name}.`);
    }
    return { ...(result ?? {}), actor, fallback: false, stationKey, skillKey: normalizedSkill };
  }

  return rollFallback(vehicle, stationKey, normalizedSkill, options);
}
