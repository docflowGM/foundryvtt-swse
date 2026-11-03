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
 * `gunnerActor` in resolveVehicleAttackBonus() is always the already-resolved
 * crew member operating this specific weapon (resolveVehicleCrewActor()'s
 * station-precedence chain in vehicle-sheet/crew-skill-router.js already
 * picked the right actor before this module is ever called) — never the
 * vehicle actor.
 *
 * Phase 4 addendum: resolveAbstractCrewAttackBonus() below handles the
 * separate, mutually exclusive case where a station has NO assigned crew
 * actor at all (an unnamed "Crew Quality" tier stands in for a gunner). It
 * is a distinct function, not a fallback branch inside
 * resolveVehicleAttackBonus(), because there is no gunner actor to source
 * BAB/proficiency/condition/talent components from — see "Abstract-crew
 * formula authority" in docs/audits/rolling-system-alignment-phase-4.md for
 * the evidence behind which formula components apply.
 */

import { resolveAttackBonus, getTargetActorFromOptions } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js";
import { getEffectiveVehicleSource } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-published-derived.js";
import { capitalShipAttackPenalty } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-capital-penalty.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { resolveVehicleCrewActor } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-actor-authority.js";
import { getWeaponAttackAbility, getRangePenalty, getWeaponFlatAttackBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-stat-rules.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";

const VEHICLE_ATTACK_DOMAIN = 'vehicle.attack';

// Abstract "Crew Quality" tier -> flat bonus. Canonical source for both the
// formula-aligned abstract-crew attack path below and the pre-existing
// non-attack skill-check fallback (crew-skill-router.js#buildFallbackFormula
// imports this instead of keeping its own duplicate copy, closing a
// duplicate-table drift risk found in the Phase 4 stacked-PR integration
// review).
export const CREW_QUALITY_BONUS = {
  untrained: 0,
  normal: 2,
  skilled: 5,
  expert: 8,
  ace: 10
};

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


/** Size of a vehicle (verified record / construction frame) or of any actor (system.size). null = unknown. */
function actorSize(actor) {
  if (!actor) return null;
  const src = actor.type === 'vehicle' ? getEffectiveVehicleSource(actor) : null;
  return src?.record?.classification?.printedSize ?? actor.system?.size ?? null;
}

/**
 * Core Vehicle Combat, Capital Ships: a vehicle of Colossal (frigate) size or larger takes -20 on attack rolls against
 * targets smaller than Colossal; point-defense weapons are exempt. Point-defense status comes ONLY from the certified
 * weapon specification of a sealed installation (never from an Item name or editable field).
 * @returns {{entry:object|null, error:string|null, warnings:string[]}}
 */
function capitalShipPenaltyEntry(vehicleActor, weapon, context) {
  const authority = resolveVehicleWeaponAuthority(weapon);
  const pointDefense = authority?.ok === true && authority.installed?.spec?.pointDefense === true;
  const target = getTargetActorFromOptions(context);
  const r = capitalShipAttackPenalty({ attackerSize: actorSize(vehicleActor), targetSize: actorSize(target), pointDefense });
  const base = { id: 'capital-ship-attack-penalty', label: 'Capital ship vs. target smaller than Colossal', category: 'vehicle',
    sourceId: vehicleActor.id ?? null, sourceName: vehicleActor.name ?? null };
  switch (r.status) {
    case 'APPLIES':
      return { entry: ledgerEntry({ ...base, value: r.value, reason: 'Core Rulebook, Vehicle Combat (Capital Ships): a vehicle of Colossal (frigate) size or larger takes -20 on attack rolls against targets smaller than Colossal.' }), error: null, warnings: [] };
    case 'TARGET_SIZE_UNKNOWN':
      // a capital-size attacker with a target of unknown size: refuse rather than guess the target is not small
      return target ? { entry: null, error: 'capital-ship-target-size-unknown', warnings: [] }
        : { entry: null, error: null, warnings: ['Capital ship attack has no target yet; the -20 penalty against targets smaller than Colossal cannot be evaluated.'] };
    case 'ATTACKER_SIZE_UNKNOWN':
      return authority?.ok ? { entry: null, error: 'capital-ship-attacker-size-unknown', warnings: [] }
        : { entry: null, error: null, warnings: ['Attacking vehicle size is unknown; the capital-ship attack penalty was not evaluated.'] };
    default:
      return { entry: null, error: null, warnings: [] };
  }
}

/**
 * Core Vehicle Combat: "If you are trained in the Pilot skill, you gain a +2 bonus on attack rolls made with any
 * vehicle weapon identified as being crewed by the pilot." Applied only when ALL hold: the weapon is a sealed certified
 * installation or a verified published stock group whose operator is the pilot; the resolved gunner Actor IS the vehicle's assigned pilot-station
 * Actor; that Actor is trained in Pilot; and no Pilot component is already in the ledger. Never for abstract crew.
 */
async function trainedPilotWeaponEntry(gunnerActor, vehicleActor, weapon, ledger) {
  const authority = resolveVehicleWeaponAuthority(weapon);
  if (!authority?.ok || authority.operator !== 'pilot') return null;
  const pilot = await resolveVehicleCrewActor(vehicleActor, 'pilot');
  if (pilot.source !== 'actor' || !pilot.actor || (pilot.actor !== gunnerActor && !(pilot.actor.id && pilot.actor.id === gunnerActor.id))) return null;
  const row = gunnerActor.system?.derived?.skills?.pilot ?? gunnerActor.system?.skills?.pilot;
  if (row?.trained !== true) return null;
  if (ledger.some(e => /pilot/i.test(`${e.id} ${e.label}`))) return null;
  return ledgerEntry({ id: 'pilot-trained-weapon-crew', label: 'Trained Pilot (pilot-crewed weapon)', value: 2, category: 'operator',
    sourceId: gunnerActor.id ?? null, sourceName: gunnerActor.name ?? null,
    reason: 'Core Rulebook, Vehicle Combat (Pilot): +2 on attack rolls with a vehicle weapon crewed by the pilot, when trained in Pilot. Weapon operator taken from the sealed installation or the verified source group; pilot from the vehicle\'s pilot station.' });
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

  // A flat NPC statblock total cannot be decomposed into the printed
  // Gunner BAB + Vehicle INT formula. Never substitute the flat total:
  // that can conceal the NPC's own DEX or other baked-in bonuses.
  if (baseline.flags?.npcFlat === true) {
    warnings.push('NPC flat attack total cannot be decomposed into Gunner BAB + Vehicle INT; require verified crew BAB and a source-specific modifier ledger.');
    return { total: 0, ledger: [], warnings, error: 'npc-flat-vehicle-attack-unreconciled' };
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

  const pilotBonus = await trainedPilotWeaponEntry(gunnerActor, vehicleActor, weapon, ledger);
  if (pilotBonus) ledger.push(pilotBonus);
  const capital = capitalShipPenaltyEntry(vehicleActor, weapon, context);
  if (capital.error) { warnings.push(...capital.warnings); return { total: 0, ledger: [], warnings, error: capital.error }; }
  warnings.push(...capital.warnings);
  if (capital.entry) ledger.push(capital.entry);

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

/**
 * Authoritative formula for a vehicle weapon fired by ABSTRACT crew — a
 * station with no assigned gunner/pilot Actor, represented only by a
 * "Crew Quality" tier on the vehicle (untrained/normal/skilled/expert/ace).
 *
 * Evidence-based formula choice (Phase 4; see docs/audits/rolling-system-alignment-phase-4.md
 * "Abstract-crew formula authority" for the full reasoning): `crewQuality`
 * is stored as a single free-text tier string (no template.json schema
 * entry — read defensively with `?? 'normal'` everywhere) mapped through
 * CREW_QUALITY_BONUS to one flat number. There is no separate BAB/ability/
 * proficiency breakdown anywhere in the data model — it cannot be "the
 * gunner's ability modifier" because there is no gunner. Its value range
 * (0/+2/+5/+8/+10) tracks a character BAB progression, not a fully-loaded
 * combined attack total, so it is used here as a direct substitute for the
 * "Gunner BAB" component only — Vehicle INT modifier and Range modifier
 * still apply exactly as they do for a named gunner, since both are
 * properties of the vehicle/weapon, not the (absent) operator:
 *
 *   Vehicle Attack Total = 1d20 + Crew Quality (as BAB-equivalent)
 *                           + Vehicle INT modifier + Range modifier
 *                           + applicable miscellaneous modifiers
 *
 * This is the closest supported equivalent, not a verified SWSE rule
 * citation — flagged as such in the audit.
 *
 * @param {Actor} vehicleActor
 * @param {Item} weapon
 * @param {string} [crewQualityKey] - explicit override; defaults to vehicleActor.system.crewQuality.
 * @param {Object} [context={}]
 * @returns {Promise<{total: number, ledger: Array<Object>, warnings: string[], error: string|null}>}
 */
export async function resolveAbstractCrewAttackBonus(vehicleActor, weapon, crewQualityKey, context = {}) {
  const warnings = [];

  if (!vehicleActor || vehicleActor.type !== 'vehicle') {
    warnings.push('Vehicle actor is missing or not a vehicle-type actor; abstract crew attack cannot be resolved.');
    return { total: 0, ledger: [], warnings, error: 'invalid-vehicle-actor' };
  }

  const rawQuality = String(crewQualityKey ?? vehicleActor.system?.crewQuality ?? 'normal').toLowerCase();
  const recognizedQuality = Object.prototype.hasOwnProperty.call(CREW_QUALITY_BONUS, rawQuality) ? rawQuality : 'normal';
  if (recognizedQuality !== rawQuality) {
    // Invalid abstract crew data gets a visible warning rather than a
    // silently-wrong roll, but still defaults to 'normal' (matching the
    // pre-Phase-4 rollFallback() behavior) rather than hard-failing the
    // roll outright, to preserve compatibility with existing vehicle
    // records that may have stray/legacy crewQuality text.
    warnings.push(`Unrecognized crew quality "${rawQuality}" on ${vehicleActor.name ?? 'vehicle'}; defaulting to "normal".`);
  }
  // Generic crew Base Attack. For a source-backed ship the statblock prints the crew's Base Attack (it matches the Core crew
  // quality attack column in 365 of 427 published records), and a constructed ship derives it from the Core crew quality
  // table; both are verified sources and replace the unsourced legacy tier table below. Legacy actors keep the tier.
  const crewSource = getEffectiveVehicleSource(vehicleActor);
  let crewBab = CREW_QUALITY_BONUS[recognizedQuality], crewBabLabel = `Crew Quality (${recognizedQuality})`, crewBabReason = null;
  if (crewSource?.origin === 'published') {
    const printed = crewSource.record.combat?.baseAttackBonusPrinted;
    if (!Number.isFinite(printed)) return { total: 0, ledger: [], warnings, error: 'published-crew-bab-unknown' };
    crewBab = printed; crewBabLabel = 'Crew Base Attack (published statblock)';
    crewBabReason = `Published statblock Base Atk of ${crewSource.record.identity?.name ?? 'the vehicle'} (${crewSource.record.publication?.book ?? 'source'} p. ${crewSource.record.publication?.page ?? '?'}): the generic crew's Base Attack Bonus.`;
  } else if (crewSource?.origin === 'custom-constructed') {
    const derived = crewSource.construction.derived?.baseAttackBonus;
    if (!Number.isFinite(derived)) return { total: 0, ledger: [], warnings, error: 'constructed-crew-bab-unknown' };
    crewBab = derived; crewBabLabel = `Crew Base Attack (${crewSource.construction.crewQuality} crew, Core crew quality)`;
    crewBabReason = 'Constructed ship: Base Attack from the chosen crew quality (Core Rulebook crew quality table).';
  }
  const crewQualityBonus = crewBab;

  const vehicleIntModifier = SchemaAdapters.getAbilityMod(vehicleActor, 'int');
  const rangeModifier = getRangePenalty(weapon, context);
  const rangeBand = String(context.rangeBand ?? context.range ?? weapon?.system?.rangeBand ?? '').toLowerCase() || 'unspecified';
  const weaponEnhancement = getWeaponFlatAttackBonus(weapon);

  // PUBLISHED STOCK weapon with generic crew: the statblock's printed attack total IS the generic crew's complete attack
  // modifier. It is the baseline (nothing is recomposed or added to it); its known components are listed as included
  // (applied: false) so the breakdown shows what the number contains. Range, conditions, the capital-ship penalty and
  // registered effects are the genuine attack-time modifiers and stack on top.
  const stockAuthority = resolveVehicleWeaponAuthority(weapon);
  // the basis of the MODE this Item runs in (a printed battery's independent weapon has the battery assistance removed)
  const stockBasis = stockAuthority?.ok && stockAuthority.origin === 'stock' ? { label: stockAuthority.stock.group.label, attackBasis: stockAuthority.stock.attackBasis } : null;
  const rangeEntry = ledgerEntry({
    id: 'range', label: 'Range', value: rangeModifier, category: 'range',
    sourceId: weapon?.id ?? null, sourceName: weapon?.name ?? null,
    reason: `Source: getRangePenalty helper; range band: ${rangeBand}. Sign preserved; resolved once.`
  });
  const ledger = stockBasis ? [
    ledgerEntry({
      id: 'published-statblock-attack', label: `Published statblock attack (${stockBasis.label})`, value: stockBasis.attackBasis.printed, category: 'gunner',
      sourceId: vehicleActor.id ?? null, sourceName: `${vehicleActor.name ?? 'Vehicle'} — published generic crew`,
      reason: `Printed attack total of the stock group: the generic crew's complete modifier (${stockBasis.attackBasis.kind}). Range and attack-time conditions apply on top; its components are listed below and are not added again.`
    }),
    ...stockBasis.attackBasis.components.map(c => ledgerEntry({
      id: `included-${c.id}`, label: `${c.label} (included in the printed total)`, value: c.value, category: 'included', applied: false,
      sourceId: vehicleActor.id ?? null, sourceName: vehicleActor.name ?? null,
      reason: 'Already part of the published statblock attack total; shown for transparency, not added again.'
    })),
    rangeEntry
  ] : [
    ledgerEntry({
      id: 'crew-quality-bab', label: crewBabLabel, value: crewQualityBonus, category: 'gunner',
      sourceId: vehicleActor.id ?? null, sourceName: `${vehicleActor.name ?? 'Vehicle'} — abstract crew`,
      reason: crewBabReason ?? 'CREW_QUALITY_BONUS tier value used as a direct Gunner-BAB-equivalent substitute — the only decomposable component abstract crew data provides; not a combined total (no ability/proficiency/condition components exist to source, since no gunner Actor exists).'
    }),
    ledgerEntry({
      id: 'vehicle-int', label: 'Vehicle INT', value: vehicleIntModifier, category: 'vehicle',
      sourceId: vehicleActor.id ?? null, sourceName: vehicleActor.name ?? null,
      reason: 'SchemaAdapters.getAbilityMod(vehicleActor, "int") — same vehicle Intelligence source as the named-gunner formula; the vehicle\'s own targeting system assists any operator, named or abstract.'
    }),
    rangeEntry
  ];

  if (weaponEnhancement !== 0) {
    ledger.push(ledgerEntry({
      id: 'misc-enhancement', label: 'Enhancement', value: weaponEnhancement, category: 'weapon',
      sourceId: weapon?.id ?? null, sourceName: weapon?.name ?? null,
      reason: 'getWeaponFlatAttackBonus(weapon) — weapon item flat attack bonus, same source as the named-gunner formula.'
    }));
  }

  const capital = capitalShipPenaltyEntry(vehicleActor, weapon, context);
  if (capital.error) { warnings.push(...capital.warnings); return { total: 0, ledger: [], warnings, error: capital.error }; }
  warnings.push(...capital.warnings);
  if (capital.entry) ledger.push(capital.entry);

  // No gunner Actor exists for abstract crew, so registered-modifier
  // resolution targets the vehicle actor itself rather than an operator —
  // the only actor object this attack has. Documented deviation from the
  // named-gunner path (which resolves against gunnerActor), not a silent
  // choice: see the Phase 4 audit.
  try {
    const vehicleDomainResolution = await ModifierEngine.resolveTarget(vehicleActor, VEHICLE_ATTACK_DOMAIN, { context });
    for (const entry of vehicleDomainResolution?.ledger ?? []) {
      ledger.push(entry);
    }
  } catch (err) {
    warnings.push(`ModifierEngine.resolveTarget('${VEHICLE_ATTACK_DOMAIN}') failed for abstract crew: ${err?.message ?? err}`);
  }

  const total = ledger
    .filter(entry => entry.applied)
    .reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  return { total, ledger, warnings, error: null };
}
