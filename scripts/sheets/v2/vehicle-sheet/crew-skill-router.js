import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";

const STATION_SKILLS = {
  pilot: [
    { key: 'pilot', label: 'Pilot', use: 'Maneuver' },
    // Fixed-forward, pilot-operated weapon mounts (vehicle-weapon items with
    // system.crewRole/crewPosition === 'pilot') fire from this station.
    { key: 'attack', label: 'Attack', use: 'Fire Weapon' }
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


function getVehicleWeapon(vehicle, weaponId) {
  if (!vehicle || !weaponId) return null;
  const item = vehicle.items?.get?.(weaponId);
  if (item) return item;
  const match = String(weaponId).match(/^system-weapons-(\d+)$/);
  if (!match) return null;
  const index = Number(match[1]);
  const weapon = vehicle.system?.weapons?.[index];
  if (!weapon) return null;
  return {
    id: weaponId,
    name: weapon.name || `Vehicle Weapon ${index + 1}`,
    type: 'system-vehicle-weapon',
    system: {
      bonus: weapon.bonus ?? weapon.attackBonus ?? '+0',
      attackBonus: weapon.attackBonus ?? weapon.bonus ?? '+0',
      damage: weapon.damage ?? weapon.damageFormula ?? '1d10',
      range: weapon.range ?? 'Close'
    }
  };
}

function getCrewEntry(vehicle, stationKey) {
  const system = vehicle?.system ?? {};
  const positions = system.crewPositions ?? {};
  const entry = positions?.[stationKey];
  if (entry) return entry;

  const owned = Array.isArray(system.ownedActors) ? system.ownedActors : [];
  return owned.find((candidate) => candidate?.position === stationKey || candidate?.role === stationKey) ?? null;
}

/**
 * Resolve the operator/crew actor for one vehicle crew station.
 *
 * `source` distinguishes three cases that Phase 2 audit work found were
 * silently collapsed into one another:
 * - 'actor': the station has an assigned crew reference and it resolved to
 *   a real actor. Use this actor's own stats.
 * - 'unassigned': the station has no crew reference at all. This is the
 *   legitimate abstract Crew Quality case (SWSE vehicles with no named
 *   gunner use a flat crew-quality bonus instead).
 * - 'invalid': the station HAS a crew reference, but it failed to resolve
 *   (e.g. the assigned actor was deleted, or the UUID/id is stale). This is
 *   a data-integrity problem, not an intentional abstract-crew choice, and
 *   must not be silently treated the same as 'unassigned' — callers should
 *   warn rather than quietly rolling as generic crew quality under a
 *   deleted actor's stale name.
 *
 * @param {Actor} vehicle
 * @param {string} stationKey
 * @returns {Promise<{actor: Actor|null, entry: Object|string|null, label: string, source: 'actor'|'unassigned'|'invalid'}>}
 */
export async function resolveVehicleCrewActor(vehicle, stationKey) {
  const entry = getCrewEntry(vehicle, stationKey);
  if (!entry) {
    return { actor: null, entry: null, label: 'Crew Quality', source: 'unassigned' };
  }

  if (typeof entry === 'string') {
    const fromDirectUuid = await actorFromUuid(entry);
    const fromDirectId = actorFromId(entry);
    const actor = fromDirectUuid || fromDirectId;
    return { actor, entry, label: actor?.name || entry, source: actor ? 'actor' : 'invalid' };
  }

  const actor = await actorFromUuid(entry.uuid) || actorFromId(entry.id) || actorFromId(entry.actorId);
  return {
    actor,
    entry,
    label: actor?.name || entry.name || entry.label || 'Crew Quality',
    source: actor ? 'actor' : 'invalid'
  };
}

function numericBonus(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(String(value).replace(/[^0-9+\-.]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

function buildFallbackFormula(vehicle, skillKey, options = {}) {
  const quality = String(vehicle?.system?.crewQuality || 'normal').toLowerCase();
  const qualityBonus = CREW_QUALITY_BONUS[quality] ?? CREW_QUALITY_BONUS.normal;
  const vehicleBonus = numericBonus(options.attackBonus ?? vehicle?.system?.[skillKey] ?? vehicle?.system?.attackBonus, 0);
  const totalBonus = skillKey === 'attack' ? vehicleBonus + qualityBonus : qualityBonus;
  return { formula: `1d20 + ${totalBonus}`, quality, totalBonus };
}

async function rollFallback(vehicle, stationKey, skillKey, options = {}) {
  const { formula, quality, totalBonus } = buildFallbackFormula(vehicle, skillKey, options);
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

  // An 'invalid' source means the station HAS an assignment that failed to
  // resolve (e.g. a deleted actor) — a data-integrity problem, not the
  // intentional abstract-crew-quality case ('unassigned'). Warn instead of
  // silently rolling as generic crew quality under a stale reference.
  if (resolution.source === 'invalid') {
    ui?.notifications?.warn?.(`${stationLabel} assignment on ${vehicle.name} could not be resolved (the assigned crew member may have been deleted). Reassign crew before rolling, or clear the station to use Crew Quality.`);
    return { actor: null, fallback: false, invalidCrew: true, stationKey, skillKey: normalizedSkill, resolution };
  }

  if (normalizedSkill === 'attack') {
    const weaponId = options.weaponId;
    const weapon = weaponId ? getVehicleWeapon(vehicle, weaponId) : null;
    if (!weapon) {
      ui?.notifications?.warn?.('No vehicle weapon found for this gunner action.');
      return null;
    }
    if (actor) {
      // vehicleActor/operator are carried through purely for diagnostics
      // (AttackRollDiagnostics) — rollAttack() itself always uses `actor`
      // (the resolved crew member) as the attacking actor for BAB/ability/
      // proficiency, never the vehicle.
      const roll = await rollAttack(actor, weapon, { vehicleActor: vehicle, operator: actor, crewStation: stationKey });
      ui?.notifications?.info?.(`${actor.name} fires ${weapon.name} from ${vehicle.name}.`);
      return { roll, actor, fallback: false, stationKey, skillKey: normalizedSkill, weapon };
    }
    return rollFallback(vehicle, stationKey, normalizedSkill, {
      ...options,
      skillLabel: `${weapon.name} Attack`,
      attackBonus: weapon.system?.attackBonus ?? weapon.system?.bonus
    });
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
