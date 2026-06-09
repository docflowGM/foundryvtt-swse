/**
 * CombatContextBuilder
 *
 * Builds the shared context object for combat workflows. This object is meant
 * to travel across existing authorities so later phases can stop reconstructing
 * rule intent from scattered button data.
 */

function hasTag(action, needle) {
  const search = String(needle || '').toLowerCase();
  return (action?.contextTags ?? []).some(tag => String(tag).toLowerCase().includes(search));
}

function inferAmmoCost(action) {
  const resource = (action?.resources ?? []).find(r => String(r?.type ?? '').toLowerCase().includes('ammo'));
  if (resource && Number.isFinite(Number(resource.amount))) return Number(resource.amount);

  const text = [action?.key, action?.name, action?.notes, action?.description, ...(action?.contextTags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (text.includes('burst fire')) return 5;
  if (text.includes('autofire')) return 10;
  if (action?.resolutionMode === 'attack') return 1;
  return 0;
}

function firstTargetActor() {
  try {
    return game?.user?.targets?.first?.()?.actor ?? null;
  } catch (_err) {
    return null;
  }
}

export class CombatContextBuilder {
  static build({ actor, action, options = {}, sheet = null } = {}) {
    const weapon = options.weapon ?? options.item ?? null;
    const target = options.target ?? firstTargetActor();
    const text = [action?.key, action?.name, action?.notes, action?.description, ...(action?.contextTags ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const isAutofire = hasTag(action, 'autofire') || text.includes('autofire');
    const isBurstFire = hasTag(action, 'burst') || text.includes('burst fire');
    const isArea = hasTag(action, 'area') || (isAutofire && !isBurstFire);
    const isCharging = hasTag(action, 'charge') || text.includes('charge') || options?.situational?.charging === true || options?.charging === true;
    const isAiming = hasTag(action, 'aim') || options?.situational?.aiming === true || options?.aiming === true || options?.aim === true;

    return {
      actor,
      sourceActor: actor,
      target,
      sheet,
      action,
      actionId: action?.id ?? options.actionId ?? null,
      weapon,
      attack: {
        mode: isBurstFire ? 'burstFire' : (isAutofire ? 'autofire' : null),
        isArea,
        isAutofire,
        isBurstFire,
        isFiringIntoMelee: options?.firingIntoMelee === true || options?.situational?.firingIntoMelee === true,
        isAiming,
        isCharging,
        maneuver: options?.maneuver ?? (hasTag(action, 'disarm') || text.includes('disarm') ? 'disarm' : null),
        rangeBand: options?.rangeBand ?? options?.range ?? null,
        defense: options?.defense ?? (isArea ? 'reflex' : null)
      },
      damage: {
        packets: options?.damage?.packets ?? [],
        crit: options?.crit === true,
        hit: options?.hit ?? null,
        natural1: false,
        natural20: false,
        areaHitState: null
      },
      resources: {
        ammoCost: inferAmmoCost(action),
        enforceAmmo: options?.enforceAmmo === true,
        reloadAvailable: false,
        costs: action?.resources ?? []
      },
      states: {
        apply: [],
        consume: [],
        expire: []
      },
      economy: {
        cost: action?.actionCost ?? {},
        preview: null,
        spent: false,
        spendAction: action?.spendAction !== false
      },
      automationBoundary: action?.automationBoundary ?? 'automate',
      gmNotes: [],
      source: {
        sheet,
        element: options?.sourceElement ?? null,
        rollDialog: null,
        invocation: options?.source ?? null
      },
      options: { ...options }
    };
  }
}
