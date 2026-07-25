/**
 * vehicle-attack-math.js — Authoritative vehicle/starship gunnery attack
 * formula (Phase 3 rolling-system alignment addendum).
 *
 *   Vehicle Attack Total = 1d20 + Gunner BAB + Vehicle INT modifier +
 *                           Range modifier + applicable miscellaneous modifiers
 *
 * This is deliberately NOT the generic character resolveAttackBonus()
 * formula: a vehicle weapon's "ability modifier" component is the VEHICLE's
 * Intelligence modifier, never the gunner's own ability score (getWeaponAttackAbility
 * defaults ranged weapons to the attacking actor's own Dex, which is correct
 * for a character firing a personal weapon but wrong for a gunner firing a
 * vehicle-mounted weapon).
 *
 * Every other gunner-scoped component resolveAttackBonus() already computes
 * correctly (BAB, proficiency, range penalty, weapon enhancement, condition/
 * attack penalties, talents, combat options, feats, active-effect intents,
 * scoped feats) is reused verbatim from that resolver — this module only
 * swaps the one wrong component (gunner ability modifier) for the correct
 * one (vehicle INT modifier) and re-labels every component into the
 * required ledger shape so the formula is visible piece-by-piece instead of
 * collapsed into one precomputed bonus.
 *
 * `gunnerActor` here is always the already-resolved crew member operating
 * this specific weapon (resolveVehicleCrewActor()'s station-precedence
 * chain in vehicle-sheet/crew-skill-router.js already picked the right
 * actor before this module is ever called) — never the vehicle actor and
 * never an abstract-crew fallback, which is a separate, mutually exclusive
 * code path (rollFallback() in crew-skill-router.js) that never reaches
 * this resolver.
 */

import { resolveAttackBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js";
import { getWeaponAttackAbility, getRangePenalty } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";

const VEHICLE_ATTACK_DOMAIN = 'vehicle.attack';

// Taxonomy for the gunner-scoped baseline components resolveAttackBonus()
// already computes correctly and that this resolver reuses verbatim as
// individually-labeled misc ledger entries (never collapsed into one
// aggregate "Misc" value).
const MISC_CATEGORY_BY_LABEL = {
  'Enhancement': 'weapon',
  'Firing Into Melee': 'situational',
  'Attack Penalty': 'condition',
  'CT Penalty': 'condition',
  'Proficiency': 'operator',
  'Talent': 'talent',
  'State': 'active-effect',
  'Combat Option': 'attack-mode',
  'Rage': 'resource-bonus',
  'Sith Commander': 'active-effect',
  'Inquisition': 'talent',
  'Unsettling Presence': 'active-effect',
  'Rapid Alchemy': 'equipment',
  'Force Item': 'equipment',
  'Effect Intent': 'active-effect',
  'Scoped Feat': 'feat'
};

function ledgerEntry({ id, label, value, category, sourceId = null, sourceName = null, reason = null, applied = true }) {
  return {
    id,
    label,
    value: Number(value) || 0,
    category,
    sourceId,
    sourceName,
    domain: VEHICLE_ATTACK_DOMAIN,
    applied,
    reason
  };
}

function slugify(label) {
  return String(label ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * @param {Actor} gunnerActor - the resolved crew member firing the weapon.
 * @param {Actor} vehicleActor - the vehicle actor the weapon is mounted on.
 * @param {Item} weapon
 * @param {Object} [context={}]
 * @returns {Promise<{total: number, ledger: Array<Object>, warnings: string[], error: string|null}>}
 */
export async function resolveVehicleAttackBonus(gunnerActor, vehicleActor, weapon, context = {}) {
  const warnings = [];

  // Forbidden fallback guard: never let the vehicle actor itself (or a
  // missing operator) stand in as "the gunner." Structured failure instead
  // of silently defaulting to the vehicle's own BAB (which is 0/undefined
  // by schema) or some other unrelated actor.
  if (!gunnerActor || gunnerActor.type === 'vehicle') {
    warnings.push('No valid gunner/operator actor was resolved for this weapon; refusing to substitute the vehicle actor or any other actor.');
    return { total: 0, ledger: [], warnings, error: 'invalid-gunner-actor' };
  }
  if (!vehicleActor || vehicleActor.type !== 'vehicle') {
    warnings.push('Vehicle actor is missing or not a vehicle-type actor; cannot source an Intelligence modifier. Refusing to substitute the gunner\'s own ability modifier.');
    return { total: 0, ledger: [], warnings, error: 'invalid-vehicle-actor' };
  }

  const baseline = resolveAttackBonus(gunnerActor, weapon, null, context);

  // Edge case: NPC statblock mode returns a single flat override total with
  // no BAB/ability decomposition at all (combat-roll-math.js resolveAttackBonus,
  // npc?.useFlat branch). There is no evidence for how a flat NPC override
  // should interact with the vehicle INT/range formula, so this preserves
  // the actor's pre-existing flat-bonus behavior unchanged rather than
  // inventing a new stacking rule.
  if (baseline.flags?.npcFlat === true) {
    warnings.push('Gunner actor uses an NPC flat attack-bonus override; preserving that behavior unchanged instead of decomposing into Gunner BAB + Vehicle INT (no verified rule for how a flat override should combine with the vehicle formula).');
    return {
      total: baseline.total,
      ledger: [ledgerEntry({
        id: 'npc-flat-override', label: 'NPC Flat Attack Bonus', value: baseline.total, category: 'gunner',
        sourceId: gunnerActor.id ?? null, sourceName: gunnerActor.name ?? null,
        reason: 'actor.type === "npc" statblock-mode flat attack bonus; pre-existing behavior preserved unchanged.'
      })],
      warnings,
      error: null
    };
  }

  const abilityKey = getWeaponAttackAbility(gunnerActor, weapon);
  const gunnerAbilityLabel = `Ability (${abilityKey.toUpperCase()})`;
  const gunnerBab = Number(baseline.components?.['BAB'] ?? 0);
  const vehicleIntModifier = SchemaAdapters.getAbilityMod(vehicleActor, 'int');
  const rangeModifier = getRangePenalty(weapon, context);
  const rangeBand = String(context.rangeBand ?? context.range ?? weapon?.system?.rangeBand ?? '').toLowerCase() || 'unspecified';

  const ledger = [
    ledgerEntry({
      id: 'gunner-bab', label: 'Gunner BAB', value: gunnerBab, category: 'gunner',
      sourceId: gunnerActor.id ?? null, sourceName: gunnerActor.name ?? null,
      reason: 'SchemaAdapters.getBAB(gunnerActor) — the resolved crew member operating this weapon, never the vehicle actor or abstract crew.'
    }),
    ledgerEntry({
      id: 'vehicle-int', label: 'Vehicle INT', value: vehicleIntModifier, category: 'vehicle',
      sourceId: vehicleActor.id ?? null, sourceName: vehicleActor.name ?? null,
      reason: 'SchemaAdapters.getAbilityMod(vehicleActor, "int") — vehicle Intelligence score converted to a modifier exactly once via the schema adapter; never the gunner\'s own ability modifier.'
    }),
    ledgerEntry({
      id: 'range', label: 'Range', value: rangeModifier, category: 'range',
      sourceId: weapon?.id ?? null, sourceName: weapon?.name ?? null,
      reason: `Source: getRangePenalty helper; range band: ${rangeBand}. Sign preserved (negative = penalty); resolved once here, never reapplied by ModifierEngine or recalculated in chat rendering.`
    })
  ];

  // Every other gunner-scoped baseline component becomes its own
  // individually-labeled misc ledger entry.
  for (const [label, value] of Object.entries(baseline.components ?? {})) {
    if (label === 'BAB' || label === gunnerAbilityLabel) continue;
    const numeric = Number(value) || 0;
    if (numeric === 0) continue;
    ledger.push(ledgerEntry({
      id: `misc-${slugify(label)}`, label, value: numeric,
      category: MISC_CATEGORY_BY_LABEL[label] ?? 'custom',
      sourceId: gunnerActor.id ?? null, sourceName: gunnerActor.name ?? null,
      reason: 'Reused verbatim from resolveAttackBonus(gunnerActor, weapon) — a gunner-scoped component unaffected by the vehicle ability-modifier substitution.'
    }));
  }

  // Registered effect/feat/talent modifiers explicitly targeting the
  // 'vehicle.attack' domain — distinct from 'combat.attack' (already
  // resolved inside resolveAttackBonus above via its own effect-intent
  // lookup), so this cannot double-apply the same modifier twice.
  try {
    const vehicleDomainResolution = await ModifierEngine.resolveTarget(gunnerActor, VEHICLE_ATTACK_DOMAIN, { context });
    // Suppressed modifiers are still shown (applied: false, with a reason)
    // for ledger visibility, but excluded from the total sum below.
    for (const entry of vehicleDomainResolution?.ledger ?? []) {
      ledger.push(entry);
    }
  } catch (err) {
    warnings.push(`ModifierEngine.resolveTarget('${VEHICLE_ATTACK_DOMAIN}') failed: ${err?.message ?? err}`);
  }

  const total = ledger
    .filter(entry => entry.applied)
    .reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  return { total, ledger, warnings, error: null };
}
