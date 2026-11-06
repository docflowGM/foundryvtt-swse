/**
 * Encounter scale for vehicle weapons (Core Rulebook, Vehicle Combat, Scale; PUBLISHED_RULE):
 *   "If the encounter involves both vehicles and characters on foot, use character scale. If the scene involves vehicles only,
 *    use starship scale."
 * and, for area attacks (Core, Vehicle Combat; PUBLISHED_RULE):
 *   "Area attacks (including autofire, burst radius weapons, and splash weapons) are resolved as attacks on a single target in
 *    starship scale unless the weapon is specifically listed as having a starship-scale area attack."
 *
 * The scale is a property of the ENCOUNTER, derived from who takes part in it -- never from a weapon's name or a target's type
 * alone. Participants are the combatants of the active combat when the attacker is among them; outside a combat they are the
 * attacker's vehicle and the target. Anything that is not a vehicle actor puts the encounter in character scale. An encounter
 * whose participants cannot be established is UNDETERMINED and callers must fail closed.
 * Pure of Foundry globals.
 */
export const ENCOUNTER_SCALE = Object.freeze({ STARSHIP: 'starship', CHARACTER: 'character', UNDETERMINED: 'undetermined' });

const actorOf = c => c?.actor ?? c ?? null;
const idOf = a => a?.id ?? a?._id ?? null;

/**
 * @param {{attacker:object|null, target?:object|null, combat?:object|null}} p  attacker = the VEHICLE whose weapon fires
 * @returns {{scale:string, reason:string, participants:number}}
 */
export function resolveEncounterScale({ attacker, target = null, combat = null } = {}) {
  if (!attacker) return { scale: ENCOUNTER_SCALE.UNDETERMINED, reason: 'ATTACKER_MISSING', participants: 0 };
  const combatants = Array.from(combat?.combatants?.contents ?? combat?.combatants ?? []).map(actorOf).filter(Boolean);
  const inCombat = combatants.some(a => idOf(a) !== null && idOf(a) === idOf(attacker));
  const participants = inCombat ? combatants : [attacker, target].filter(Boolean);
  if (!inCombat && !target) return { scale: ENCOUNTER_SCALE.UNDETERMINED, reason: 'NO_TARGET_AND_NO_ACTIVE_COMBAT', participants: participants.length };
  if (inCombat && target && !participants.some(a => idOf(a) === idOf(target))) participants.push(target);
  const nonVehicle = participants.find(a => a.type !== 'vehicle');
  if (nonVehicle) return { scale: ENCOUNTER_SCALE.CHARACTER, reason: 'NON_VEHICLE_PARTICIPANT', participants: participants.length };
  return { scale: ENCOUNTER_SCALE.STARSHIP, reason: 'VEHICLES_ONLY', participants: participants.length };
}

/**
 * How an area attack resolves in the encounter's scale.
 * @param {{kind:string}|null} area  the weapon's published area (null = a single-target weapon)
 * @returns {{mode:'single-target'|'character-scale-area'|'starship-scale-area'|'refused', reason?:string}}
 */
export function resolveAreaAtScale(area, scale) {
  if (!area) return { mode: 'single-target' };
  if (scale === ENCOUNTER_SCALE.UNDETERMINED) return { mode: 'refused', reason: 'ENCOUNTER_SCALE_UNDETERMINED' };
  if (area.kind === 'starship-area') return { mode: 'refused', reason: 'STARSHIP_SCALE_AREA_NOT_IMPLEMENTED' };       // an explicit starship-scale area is its own mechanic
  if (scale === ENCOUNTER_SCALE.STARSHIP) return { mode: 'single-target' };                                           // PUBLISHED_RULE: ordinary splash / burst -> a single target
  return { mode: 'refused', reason: 'CHARACTER_SCALE_AREA_NOT_IMPLEMENTED' };                                        // multi-target splash is a later slice
}
