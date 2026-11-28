/**
 * Vehicle crew action catalog (VC-06 / VC-07). PURE. One place that says, for each button the crew panel offers:
 *  - whether it IS a printed Core action (category 'raw-action') or only a skill-check helper ('roll-helper'),
 *  - the printed action cost (only where the button is that printed action),
 *  - what is and is not automated.
 * Printed sources: Saga Edition Core Rulebook, Chapter 10 "Vehicle Combat Actions", pp. 170-172 (Aid Another p.170;
 * Recharge Shields p.172). A roll-helper has NO action cost: charging one would invent a rule.
 * Costs are charged to the crew ACTOR's own turn state (ActionEconomyConsumption), never to the vehicle, so one actor
 * holding several roles still has one action budget (Core p.169-170).
 */
const E = (o) => Object.freeze(o);

export const VEHICLE_CREW_ACTIONS = Object.freeze([
  E({ id: 'pilot.maneuver', station: 'pilot', use: 'Maneuver', skillKey: 'pilot', category: 'roll-helper', cost: null, effect: 'Pilot skill check only; movement is performed on the map.' }),
  E({ id: 'pilot.fire-weapon', station: 'pilot', use: 'Fire Weapon', skillKey: 'attack', category: 'raw-action', cost: 'standard', page: 'Core p.170', effect: 'Resolved by the vehicle attack pipeline (own action handling).', chargedByPipeline: true }),
  E({ id: 'copilot.aid-pilot', station: 'copilot', use: 'Aid Pilot', skillKey: 'pilot', category: 'raw-action', cost: 'standard', page: 'Core p.170 (Aid Another)', effect: 'Rolls the Pilot check. The +2 to the pilot\'s next check on a result of 10+ is applied at the table.' }),
  E({ id: 'copilot.assist-systems', station: 'copilot', use: 'Assist Systems', skillKey: 'useComputer', category: 'roll-helper', cost: null, effect: 'Use Computer skill check only.' }),
  E({ id: 'gunner.fire-weapon', station: 'gunner', use: 'Fire Weapon', skillKey: 'attack', category: 'raw-action', cost: 'standard', page: 'Core p.170', effect: 'Resolved by the vehicle attack pipeline (own action handling).', chargedByPipeline: true }),
  E({ id: 'engineer.repair-boost', station: 'engineer', use: 'Repair/Boost', skillKey: 'mechanics', category: 'roll-helper', cost: null, effect: 'Mechanics skill check only. This is not the printed Reroute Power action.' }),
  E({ id: 'shields.modulate', station: 'shields', use: 'Modulate Shields', skillKey: 'mechanics', category: 'roll-helper', cost: null, effect: 'Mechanics skill check only.' }),
  E({ id: 'shields.route', station: 'shields', use: 'Route Shields', skillKey: 'useComputer', category: 'roll-helper', cost: null, effect: 'Use Computer skill check only.' }),
  E({ id: 'shields.recharge', station: 'shields', use: 'Recharge Shields', skillKey: 'mechanics', category: 'raw-action', cost: 'three-swift', page: 'Core p.172', effect: 'DC 20 Mechanics, restores 5 SR via the skill-use path. Three swift actions over one or consecutive turns are NOT tracked yet.', costTracked: false }),
  E({ id: 'commander.command', station: 'commander', use: 'Command', skillKey: 'knowledgeTactics', category: 'roll-helper', cost: null, effect: 'Knowledge (Tactics) skill check only.' }),
  E({ id: 'commander.rally', station: 'commander', use: 'Rally', skillKey: 'persuasion', category: 'roll-helper', cost: null, effect: 'Persuasion skill check only.' })
]);

const baseStation = (key) => String(key || '').replace(/-\d+$/, '');

export function catalogEntryFor(stationKey, use) {
  const station = baseStation(stationKey);
  return VEHICLE_CREW_ACTIONS.find((a) => a.station === station && a.use === use) ?? null;
}

/** Button view-model fields derived from the catalog (HBS never guesses these). */
export function describeCrewAction(stationKey, use) {
  const entry = catalogEntryFor(stationKey, use);
  if (!entry) return { id: null, category: 'unclassified', categoryLabel: 'Skill check', costLabel: '', effectSummary: '' };
  const costLabel = entry.cost === 'standard' ? 'Standard action' : entry.cost === 'three-swift' ? '3 swift actions' : '';
  return {
    id: entry.id,
    category: entry.category,
    categoryLabel: entry.category === 'raw-action' ? 'Core action' : 'Roll helper',
    costLabel,
    effectSummary: entry.effect,
    source: entry.page ?? ''
  };
}

/**
 * Charge a catalog action's printed cost to the crew actor's own budget. Returns { charged, refused, reason, handle }.
 * - roll-helper, pipeline-charged (attacks) and untracked-cost actions are never charged here (no invented costs, no double charge).
 * - `spend` is ActionEconomyConsumption.spend (injected for tests). It no-ops outside combat.
 */
export async function chargeCrewAction(entry, actor, spend, metadata = {}) {
  if (!entry || entry.cost !== 'standard' || entry.chargedByPipeline || entry.costTracked === false || !actor || typeof spend !== 'function') {
    return { charged: false, refused: false, reason: 'not-charged', handle: null };
  }
  const handle = await spend(actor, 'standard', { actionName: entry.use, source: 'vehicle-crew', ...metadata });
  if (handle && (handle.allowed === false || handle.permitted === false)) return { charged: false, refused: true, reason: 'insufficient-action-budget', handle };
  return { charged: Boolean(handle?.committed), refused: false, reason: handle?.committed ? 'charged' : (handle?.reason ?? 'no-op'), handle };
}
