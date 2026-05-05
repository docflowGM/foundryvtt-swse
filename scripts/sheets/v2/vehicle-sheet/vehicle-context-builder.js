/**
 * Vehicle Sheet Context Builder
 *
 * Builds prepared, serializable panel contexts for the vehicle sheet.
 * Context building is stateless and pure: no mutations, no side effects.
 * Templates receive pre-shaped objects rather than raw actor/system data.
 */

/**
 * Safe numeric coercion.
 *
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Safe array helper.
 *
 * @param {*} value
 * @returns {Array}
 */
function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Build vehicle header summary panel.
 *
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildVehicleHeaderSummaryPanel(actor) {
  const system = actor?.system ?? {};
  const derived = system.derived ?? {};
  const identity = derived.identity ?? {};

  const tags = [];

  for (const tag of safeArray(system.tags)) {
    if (!tag) continue;
    tags.push({
      label: String(tag),
      tone: 'neutral'
    });
  }

  const hp = derived.hp ?? {};
  if (hp.critical) {
    tags.push({
      label: 'Critical',
      tone: 'critical'
    });
  } else if (hp.warning) {
    tags.push({
      label: 'Damaged',
      tone: 'warning'
    });
  }

  return {
    title: null,
    name: actor?.name || 'Unnamed Vehicle',
    typeLabel: identity.typeLabel || 'Vehicle',
    sizeLabel: identity.sizeLabel || 'Medium',
    category: identity.category || system.category || 'Vehicle',
    tags
  };
}

/**
 * Build vehicle defenses panel.
 *
 * @param {Actor} actor
 * @returns {Object|null}
 */
export function buildVehicleDefensesPanel(actor) {
  const derived = actor?.system?.derived ?? {};
  const defenses = derived.defenses ?? {};

  if (!defenses.ref && !defenses.fort && !defenses.will && !defenses.flatFooted) {
    return null;
  }

  const defenseArray = [
    {
      key: 'ref',
      label: 'Reflex',
      base: defenses.ref?.base ?? 10,
      total: defenses.ref?.total ?? 10,
      adjustment: defenses.ref?.adjustment ?? 0,
      stateBonus: defenses.ref?.stateBonus ?? 0
    },
    {
      key: 'fort',
      label: 'Fortitude',
      base: defenses.fort?.base ?? 10,
      total: defenses.fort?.total ?? 10,
      adjustment: defenses.fort?.adjustment ?? 0,
      stateBonus: defenses.fort?.stateBonus ?? 0
    },
    {
      key: 'will',
      label: 'Will',
      base: defenses.will?.base ?? 10,
      total: defenses.will?.total ?? 10,
      adjustment: defenses.will?.adjustment ?? 0,
      stateBonus: defenses.will?.stateBonus ?? 0
    },
    {
      key: 'flatFooted',
      label: 'Flat-Footed',
      base: defenses.flatFooted?.base ?? 10,
      total: defenses.flatFooted?.total ?? 10,
      adjustment: defenses.flatFooted?.adjustment ?? 0,
      stateBonus: defenses.flatFooted?.stateBonus ?? 0
    }
  ];

  return {
    title: 'Defenses',
    defenses: defenseArray,
    damageThreshold: derived.damage?.threshold ?? 10
  };
}

/**
 * Build vehicle HP and condition panel.
 *
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildVehicleHpConditionPanel(actor) {
  const system = actor?.system ?? {};
  const derived = system.derived ?? {};
  const hp = derived.hp ?? {
    value: 0,
    max: 1,
    temp: 0,
    percent: 0,
    warning: false,
    critical: false
  };
  const damage = derived.damage ?? {};
  const conditionTrack = system.conditionTrack ?? { current: 0, penalty: 0 };

  const conditionLabels = {
    0: 'Operational',
    1: 'Wounded',
    2: 'Disabled',
    3: 'Incapacitated'
  };

  const conditionSeverities = {
    0: 'normal',
    1: 'warning',
    2: 'critical',
    3: 'destroyed'
  };

  const conditionCurrent = Math.min(3, Math.max(0, safeNumber(conditionTrack.current, 0)));

  return {
    title: 'Hull Integrity',
    hp: {
      value: safeNumber(hp.value, 0),
      max: safeNumber(hp.max, 1),
      temp: safeNumber(hp.temp, 0),
      percent: safeNumber(hp.percent, 0)
    },
    damageThreshold: safeNumber(damage.threshold, 10),
    damageReduction: safeNumber(damage.reduction, 0),
    warning: Boolean(hp.warning),
    critical: Boolean(hp.critical),
    condition: {
      label: conditionLabels[conditionCurrent] || 'Unknown',
      severity: conditionSeverities[conditionCurrent] || 'normal',
      step: conditionCurrent,
      penalty: safeNumber(conditionTrack.penalty, 0)
    }
  };
}

/**
 * Build vehicle weapon mounts panel.
 *
 * @param {Actor} actor
 * @returns {Object|null}
 */
export function buildVehicleWeaponMountPanel(actor) {
  const system = actor?.system ?? {};
  const mounts = [];
  const items = safeArray(actor?.items);

  const embeddedWeapons = items.filter((item) => item?.type === 'weapon');

  for (const weapon of embeddedWeapons) {
    const itemSystem = weapon?.system ?? {};
    const vehicleMount = itemSystem.vehicleMount ?? {};

    mounts.push({
      key: vehicleMount.mountKey || `mount-${mounts.length}`,
      name: weapon?.name || 'Unnamed Weapon',
      arc: vehicleMount.arc || itemSystem.arc || 'unknown',
      linkedGroup: vehicleMount.linkedGroup || null,
      fireControl: vehicleMount.fireControl || itemSystem.fireControl || null,
      gunner: 'Unassigned',
      crewRole: vehicleMount.crewRole || 'gunner',
      attackSummary: itemSystem.bonus || itemSystem.attackBonus || '+0',
      damageSummary: itemSystem.damage || '1d10',
      rangeSummary: itemSystem.range || null,
      notes: itemSystem.notes ? [itemSystem.notes] : [],
      rawSource: vehicleMount.rawSource || null,
      parseConfidence: vehicleMount.parseConfidence || 'structured'
    });
  }

  if (mounts.length === 0 && Array.isArray(system.weapons)) {
    for (let i = 0; i < system.weapons.length; i += 1) {
      const weapon = system.weapons[i];
      if (!weapon || !weapon.name) continue;

      mounts.push({
        key: `mount-${i}`,
        name: weapon.name,
        arc: weapon.arc || 'unknown',
        linkedGroup: null,
        fireControl: weapon.fireControl || null,
        gunner: 'Unassigned',
        crewRole: 'gunner',
        attackSummary: weapon.bonus || weapon.attackBonus || '+0',
        damageSummary: weapon.damage || '1d10',
        rangeSummary: weapon.range || null,
        notes: [],
        rawSource: null,
        parseConfidence: 'fallback'
      });
    }
  }

  if (mounts.length === 0) {
    return null;
  }

  return {
    title: 'Weapon Mounts',
    mounts
  };
}

/**
 * Build vehicle crew summary panel.
 *
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildVehicleCrewSummaryPanel(actor) {
  const system = actor?.system ?? {};
  const ownedActors = safeArray(system.ownedActors);
  const crewQuality = system.crewQuality || 'normal';

  const filledSlots = ownedActors.filter((entry) => entry && entry.id).length;
  const totalSlots = 6;

  return {
    title: 'Crew',
    filledSlots,
    totalSlots,
    quality: crewQuality,
    passengers: system.passengers ? `${system.passengers} passengers` : 'No passengers'
  };
}

/**
 * Build vehicle crew assignment panel.
 *
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildVehicleCrewAssignmentPanel(actor) {
  const system = actor?.system ?? {};
  const crewPositions = system.crewPositions ?? {};
  const ownedActors = safeArray(system.ownedActors);

  const crewMap = {};
  for (const entry of ownedActors) {
    if (!entry?.id) continue;
    crewMap[entry.id] = {
      id: entry.id,
      name: entry.name || 'Unknown'
    };
  }

  const stationKeys = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
  const stations = stationKeys.map((key) => {
    const assignedActorId = crewPositions[key];
    const occupant = assignedActorId ? crewMap[assignedActorId] : null;

    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      occupied: Boolean(occupant),
      occupantName: occupant?.name ?? 'Unassigned',
      occupantId: occupant?.id ?? null,
      notes: null,
      actions: []
    };
  });

  return {
    title: 'Crew Stations',
    stations
  };
}

/**
 * Build vehicle subsystem detail panel.
 *
 * @param {Actor} actor
 * @param {Object|null} subsystemData
 * @param {Object|null} subsystemPenalties
 * @returns {Object|null}
 */
export function buildVehicleSubsystemDetailPanel(actor, subsystemData, subsystemPenalties) {
  if (!subsystemData) {
    return null;
  }

  const subsystemTypes = ['engines', 'weapons', 'shields', 'sensors', 'comms', 'lifeSupport'];
  const subsystems = subsystemTypes.map((type) => {
    const tier = subsystemData[type]?.tier ?? 'normal';
    const penalty = subsystemPenalties?.[type];
    const penaltyText = penalty?.description ?? null;

    return {
      key: type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      tier,
      statusLabel: tier.charAt(0).toUpperCase() + tier.slice(1),
      penaltyText,
      detailLines: penaltyText ? [penaltyText] : [],
      canRepair: tier !== 'destroyed'
    };
  });

  const penalties = [];
  if (subsystemPenalties && typeof subsystemPenalties === 'object') {
    for (const penalty of Object.values(subsystemPenalties)) {
      if (penalty?.description) penalties.push(penalty.description);
    }
  }

  const aggregatePenaltyText = penalties.length > 0 ? penalties.join('; ') : null;

  return {
    title: 'Subsystems',
    subsystems,
    aggregatePenaltyText
  };
}

/**
 * Build vehicle shield management panel.
 *
 * @param {Actor} actor
 * @param {Object|null} shieldZones
 * @returns {Object|null}
 */
export function buildVehicleShieldManagementPanel(actor, shieldZones) {
  if (!shieldZones || typeof shieldZones !== 'object') {
    return null;
  }

  const zoneKeys = ['fore', 'aft', 'port', 'starboard'];
  const max = safeNumber(shieldZones.max, 100);

  const zones = zoneKeys.map((key) => {
    const value = safeNumber(shieldZones[key], 0);
    const state = value <= max * 0.25 ? 'low' : value <= max * 0.5 ? 'moderate' : 'normal';

    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      state
    };
  });

  const total = zones.reduce((sum, zone) => sum + zone.value, 0);
  const rechargeRate = safeNumber(shieldZones.rechargeRate, 0);

  return {
    title: 'Shield Zones',
    zones,
    total,
    max,
    rechargeRate,
    notes: []
  };
}

/**
 * Build vehicle power summary panel.
 *
 * @param {Actor} actor
 * @param {Object|null} powerData
 * @returns {Object}
 */
export function buildVehiclePowerSummaryPanel(actor, powerData) {
  const available = safeNumber(powerData?.available, 350);
  const allocated = safeNumber(powerData?.allocated, 250);
  const budget = safeNumber(powerData?.budget, 600);
  const overAllocated = allocated > budget;

  const subsystemLoads = [];
  if (Array.isArray(powerData?.subsystemLoads)) {
    subsystemLoads.push(...powerData.subsystemLoads);
  }

  return {
    title: 'Power',
    available,
    allocated,
    budget,
    percentAllocated: budget > 0 ? Math.round((allocated / budget) * 100) : 0,
    overAllocated,
    subsystemLoads
  };
}

/**
 * Build vehicle cargo summary panel.
 *
 * @param {Actor} actor
 * @param {number} totalCargoWeight
 * @param {string} cargoState
 * @returns {Object}
 */
export function buildVehicleCargoSummaryPanel(actor, totalCargoWeight, cargoState) {
  const system = actor?.system ?? {};
  const cargoCapacity = safeNumber(system.cargo?.capacity, 500);
  const cargoWeight = safeNumber(totalCargoWeight, 0);
  const percentUsed = cargoCapacity > 0 ? (cargoWeight / cargoCapacity) * 100 : 0;

  return {
    title: 'Cargo',
    totalWeight: Math.round(cargoWeight * 100) / 100,
    capacity: Math.round(cargoCapacity * 100) / 100,
    percentUsed: Math.round(percentUsed),
    state: cargoState,
    stateLabel:
      cargoState === 'over'
        ? 'Over Capacity'
        : cargoState === 'near'
          ? 'Near Capacity'
          : 'Normal'
  };
}

/**
 * Build vehicle cargo manifest panel.
 *
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildVehicleCargoManifestPanel(actor) {
  const items = safeArray(actor?.items);

  const cargoItems = items
    .filter((item) => item?.type === 'equipment')
    .map((item) => ({
      name: item.name || 'Unnamed Item',
      quantity: safeNumber(item.system?.quantity, 1),
      weight: safeNumber(item.system?.weight, 0),
      notes: item.system?.notes || null
    }));

  if (cargoItems.length === 0) {
    return {
      title: 'Cargo Manifest',
      items: [],
      emptyText: 'No cargo manifest entries.'
    };
  }

  return {
    title: 'Cargo Manifest',
    items: cargoItems,
    emptyText: null
  };
}

/**
 * Build pilot maneuver panel from rule context.
 *
 * @param {Object|null} pilotData
 * @returns {Object|null}
 */
function buildPilotManeuverPanel(pilotData) {
  if (!pilotData) return null;

  const currentKey = typeof pilotData.currentManeuver === 'string'
    ? pilotData.currentManeuver
    : pilotData.currentManeuver?.key || 'none';

  const maneuvers = [
    { key: 'none', label: 'Standard Flying', summary: 'No special vehicle modifiers.' },
    { key: 'evasive', label: 'Evasive Action', summary: '+2 Reflex Defense; -2 vehicle attacks.' },
    { key: 'attackRun', label: 'Attack Run', summary: '+2 vehicle attacks; -2 Reflex Defense.' },
    { key: 'allOut', label: 'All-Out Movement', summary: 'Double speed, no attacks, -2 Reflex Defense.' },
    { key: 'trick', label: 'Trick Maneuver', summary: 'Opposed Pilot check for tactical advantage.' }
  ].map((maneuver) => ({
    ...maneuver,
    active: maneuver.key === currentKey
  }));

  return {
    title: 'Pilot Maneuvers',
    currentManeuver: maneuvers.find((m) => m.active) || maneuvers[0],
    maneuvers
  };
}

/**
 * Build commander order panel from rule context.
 *
 * @param {Object|null} commanderData
 * @returns {Object|null}
 */
function buildCommanderOrderPanel(commanderData) {
  if (!commanderData) return null;

  const currentKey = typeof commanderData.currentOrder === 'string'
    ? commanderData.currentOrder
    : commanderData.currentOrder?.key || 'none';

  const orders = [
    { key: 'none', label: 'No Orders', summary: 'Commander is not issuing a special order.' },
    { key: 'coordinateFire', label: 'Coordinate Fire', summary: 'All gunners gain an attack bonus this round.' },
    { key: 'inspire', label: 'Inspire Crew', summary: 'Crew gains a morale bonus to skill checks.' },
    { key: 'tacticalAdvantage', label: 'Tactical Advantage', summary: 'Grant one crew member additional tactical tempo.' },
    { key: 'battleAnalysis', label: 'Battle Analysis', summary: 'Analyze a target for tactical information.' }
  ].map((order) => ({
    ...order,
    active: order.key === currentKey
  }));

  return {
    title: 'Commander Orders',
    currentOrder: orders.find((o) => o.active) || orders[0],
    orders
  };
}

/**
 * Build turn phase panel from rule context.
 *
 * @param {Object|null} turnPhaseData
 * @returns {Object|null}
 */
function buildTurnPhasePanel(turnPhaseData) {
  if (!turnPhaseData) return null;

  const turnState = turnPhaseData.turnState || {};
  const currentPhaseKey = String(turnState.currentPhase || 'initiative').toLowerCase();

  const phases = [
    { key: 'commander', label: 'Commander' },
    { key: 'pilot', label: 'Pilot' },
    { key: 'engineer', label: 'Engineer' },
    { key: 'shields', label: 'Shields' },
    { key: 'gunners', label: 'Gunners' },
    { key: 'end', label: 'End' }
  ].map((phase, index, all) => {
    const active = phase.key === currentPhaseKey;
    const activeIndex = all.findIndex((entry) => entry.key === currentPhaseKey);
    const completed = activeIndex > -1 ? index < activeIndex : false;

    return {
      ...phase,
      active,
      completed
    };
  });

  const activePhase = phases.find((phase) => phase.active);

  return {
    title: 'Turn Status',
    currentPhase: activePhase?.label || turnState.currentPhase || 'Commander',
    phases,
    roundLabel: turnState.roundLabel || 'Vehicle Turn'
  };
}

/**
 * Main context builder for vehicle sheet.
 *
 * @param {Actor} actor
 * @param {Object} rawContext
 * @param {Object} options
 * @returns {Object}
 */
export function buildVehicleSheetContext(actor, rawContext, options = {}) {
  const subsystemData = options.subsystemData || null;
  const subsystemPenalties = options.subsystemPenalties || null;
  const shieldZones = options.shieldZones || null;
  const powerData = options.powerData || null;
  const pilotData = options.pilotData || null;
  const commanderData = options.commanderData || null;
  const turnPhaseData = options.turnPhaseData || null;
  const totalCargoWeight = safeNumber(options.totalCargoWeight, 0);
  const cargoState = options.cargoState || 'normal';

  const headerSummaryPanel = buildVehicleHeaderSummaryPanel(actor);
  const defensesPanel = buildVehicleDefensesPanel(actor);
  const hpConditionPanel = buildVehicleHpConditionPanel(actor);
  const weaponMountPanel = buildVehicleWeaponMountPanel(actor);
  const crewSummaryPanel = buildVehicleCrewSummaryPanel(actor);
  const crewAssignmentPanel = buildVehicleCrewAssignmentPanel(actor);
  const subsystemDetailPanel = buildVehicleSubsystemDetailPanel(actor, subsystemData, subsystemPenalties);
  const shieldManagementPanel = buildVehicleShieldManagementPanel(actor, shieldZones);
  const powerSummaryPanel = buildVehiclePowerSummaryPanel(actor, powerData);
  const cargoSummaryPanel = buildVehicleCargoSummaryPanel(actor, totalCargoWeight, cargoState);
  const cargoManifestPanel = buildVehicleCargoManifestPanel(actor);

  const pilotManeuverPanel = buildPilotManeuverPanel(pilotData);
  const commanderOrderPanel = buildCommanderOrderPanel(commanderData);
  const turnPhasePanel = buildTurnPhasePanel(turnPhaseData);

  return {
    vehiclePanels: {
      headerSummaryPanel,
      defensesPanel,
      hpConditionPanel,
      weaponMountPanel,
      crewSummaryPanel,
      crewAssignmentPanel,
      subsystemDetailPanel,
      shieldManagementPanel,
      powerSummaryPanel,
      cargoSummaryPanel,
      cargoManifestPanel,
      pilotManeuverPanel,
      commanderOrderPanel,
      turnPhasePanel
    },
    vehicleTabs: {
      overview: {
        headerSummaryPanel,
        defensesPanel,
        hpConditionPanel,
        crewSummaryPanel,
        cargoSummaryPanel,
        turnPhasePanel
      },
      weapons: {
        weaponMountPanel,
        pilotManeuverPanel
      },
      crew: {
        crewSummaryPanel,
        crewAssignmentPanel,
        commanderOrderPanel
      },
      systems: {
        subsystemDetailPanel,
        shieldManagementPanel,
        powerSummaryPanel
      },
      cargo: {
        cargoSummaryPanel,
        cargoManifestPanel
      }
    }
  };
}

export {
  buildPilotManeuverPanel,
  buildCommanderOrderPanel,
  buildTurnPhasePanel
};