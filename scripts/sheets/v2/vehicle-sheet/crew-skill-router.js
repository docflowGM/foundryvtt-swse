import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { rollSkillCheck } from "/systems/foundryvtt-swse/scripts/rolls/skills.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { CREW_QUALITY_BONUS } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle-attack-math.js";
import { recordFireResult } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-diagnostics-log.js";

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
    { key: 'useComputer', label: 'Use Computer', use: 'Route Shields' },
    // Explicit canonical identity (not label-sniffed) so the button click
    // handler routes to rollVehicleRechargeShields() rather than the
    // generic Mechanics skill check. See resolveShieldRechargeTarget() in
    // skill-use-filter.js for why this must recharge the vehicle, not the
    // operator's own shields.
    { key: 'mechanics', label: 'Mechanics', use: 'Recharge Shields', skillUseId: 'mechanics.recharge-shields' }
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

// CREW_QUALITY_BONUS is imported from vehicle-attack-math.js — the
// authoritative vehicle-attack-formula module — rather than declared here,
// so the abstract-crew attack formula and this file's non-attack skill-check
// fallback (buildFallbackFormula, below) can never drift out of sync with
// each other (Phase 4 stacked-PR integration finding: they were previously
// two independent copies of the same table).

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
      recordFireResult(vehicle?.id, { stationKey, weaponId: weaponId ?? null, ok: false, reason: 'no-weapon' });
      return null;
    }
    if (actor) {
      // vehicleActor/operator are carried through purely for diagnostics
      // (AttackRollDiagnostics) — rollAttack() itself always uses `actor`
      // (the resolved crew member) as the attacking actor for BAB/ability/
      // proficiency, never the vehicle.
      const roll = await rollAttack(actor, weapon, { vehicleActor: vehicle, operator: actor, crewStation: stationKey });
      ui?.notifications?.info?.(`${actor.name} fires ${weapon.name} from ${vehicle.name}.`);
      recordFireResult(vehicle?.id, { stationKey, weaponId, operatorName: actor.name, abstractCrew: false, ok: true });
      return { roll, actor, fallback: false, stationKey, skillKey: normalizedSkill, weapon };
    }
    // Abstract crew (no assigned actor at this station): Phase 4 routes this
    // through the same rollAttack() pipeline as a named gunner — RollEngine
    // dice execution, AttackOutcomeResolver, ModifierEngine.resolveTarget(),
    // the same component-ledger/chat/reroll/damage-workflow machinery —
    // instead of the standalone unflagged roll the non-attack skill checks
    // below still use. `vehicle` is
    // passed as both actor and (via abstractCrewQuality) the crew-quality
    // signal; resolveAbstractCrewAttackBonus() in vehicle-attack-math.js
    // resolves the formula. See docs/audits/rolling-system-alignment-phase-4.md
    // "Abstract-crew formula authority" for why crew quality substitutes for
    // Gunner BAB specifically rather than the whole formula.
    const abstractRoll = await rollAttack(vehicle, weapon, {
      abstractCrewQuality: vehicle.system?.crewQuality || 'normal',
      crewStation: stationKey
    });
    if (abstractRoll) {
      ui?.notifications?.info?.(`${vehicle.name}'s ${stationLabel.toLowerCase()} crew fires ${weapon.name}.`);
    }
    recordFireResult(vehicle?.id, { stationKey, weaponId, abstractCrew: true, ok: Boolean(abstractRoll) });
    return { roll: abstractRoll, actor: vehicle, fallback: false, abstractCrew: true, stationKey, skillKey: normalizedSkill, weapon };
  }

  if (options.skillUseId === 'mechanics.recharge-shields') {
    return rollVehicleRechargeShields(vehicle, stationKey, stationLabel, resolution, options);
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

/**
 * Recharge Shields (Mechanics): the operator recharges the VEHICLE's
 * shields, never their own -- see SkillUseFilter.resolveShieldRechargeTarget()
 * for the full RAW rationale. This routes through the SAME canonical
 * mechanics.recharge-shields skill-use record and dispatch seam the
 * character-sheet skill-use menu uses (ExtraSkillUseRegistry +
 * SkillUseFilter.rollSkillUseApplication) rather than a second, standalone
 * roll implementation -- one data definition, multiple surfaces.
 *
 * Named crew only: this repo has no established trained-skill policy for
 * abstract Crew Quality (rollFallback()'s flat bonus has no "trained"
 * concept at all), and Recharge Shields is trained-only per RAW, so
 * abstract/unassigned crew fails closed for this action specifically
 * rather than silently treating Crew Quality as satisfying training. The
 * ordinary abstract-crew fallback for every OTHER station skill is
 * untouched.
 * @private
 */
async function rollVehicleRechargeShields(vehicle, stationKey, stationLabel, resolution, options) {
  const actor = resolution.actor;

  if (!actor) {
    ui?.notifications?.warn?.(`${stationLabel} station on ${vehicle.name} has no assigned crew member -- Recharge Shields requires a named, trained operator (abstract Crew Quality has no defined Mechanics training).`);
    return { actor: null, fallback: false, stationKey, skillKey: 'mechanics', abstractCrewBlocked: true };
  }

  const [{ ExtraSkillUseRegistry }, { SkillUseFilter }] = await Promise.all([
    import('/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js'),
    import('/systems/foundryvtt-swse/scripts/utils/skill-use-filter.js')
  ]);

  const uses = await ExtraSkillUseRegistry.getForSkill('mechanics', { actor, includeInaccessible: true });
  const skillUse = SkillUseFilter.findShieldRechargeUse(uses, { selfTarget: false });
  if (!skillUse) {
    ui?.notifications?.warn?.('Recharge Shields is not available (no matching skill-use data found).');
    return { actor, fallback: false, stationKey, skillKey: 'mechanics', missingSkillUse: true };
  }

  // The generic skill-use dialog enforces trainedOnly at the caller
  // (character-like-sheet.js's _runCanonicalExtraSkillUse), not inside
  // SkillUseFilter.rollSkillUseApplication itself -- this vehicle path
  // calls rollSkillUseApplication directly, so it must enforce it itself
  // for this specific trained-only action. (The broader gap -- that
  // rollSkillUseApplication does not enforce trainedOnly for any skill use
  // -- is recorded in the ledger, not fixed repo-wide here.)
  if (skillUse.trainedOnly && actor.system?.skills?.mechanics?.trained !== true) {
    ui?.notifications?.warn?.(`${actor.name} is not trained in Mechanics and cannot attempt Recharge Shields.`);
    return { actor, fallback: false, stationKey, skillKey: 'mechanics', trainingBlocked: true };
  }

  const roll = await SkillUseFilter.rollSkillUseApplication(actor, skillUse, {
    ...options,
    vehicleActor: vehicle,
    sourceType: 'vehicle',
    sourceLabel: `${vehicle.name} ${stationLabel}`,
    vehicleName: vehicle.name,
    crewPosition: stationKey
  });

  return { roll, actor, fallback: false, stationKey, skillKey: 'mechanics', vehicleActor: vehicle };
}
