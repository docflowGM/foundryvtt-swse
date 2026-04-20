/**
 * Vehicle Sheet Context Builder (Phase 2)
 *
 * PHASE 2: Expanded to provide all 11 panel contexts for mature sheet architecture.
 * Converts raw actor/system/derived data into prepared sheet contexts.
 * All context building is STATELESS and PURE — no mutations, no side effects.
 * Template receives pre-formed objects, not raw data.
 */

/**
 * Safe numeric coercion
 */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Build vehicle header summary panel
 * Identity block with name, type, size, category, and tags
 */
export function buildVehicleHeaderSummaryPanel(actor) {
  const system = actor.system ?? {};
  const derived = system.derived ?? {};
  const identity = derived.identity ?? {};

  const tags = [];
  if (system.tags && Array.isArray(system.tags)) {
    system.tags.forEach(tag => {
      tags.push({
        label: tag,
        tone: 'neutral'
      });
    });
  }

  // Add damage/condition warning tags
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
    name: actor.name || 'Unnamed Vehicle',
    typeLabel: identity.typeLabel || 'Vehicle',
    sizeLabel: identity.sizeLabel || 'Medium',
    category: identity.category || system.category || 'Vehicle',
    tags
  };
}

/**
 * Build vehicle defenses panel context
 * Transforms system.derived.defenses into template-ready array format
 */
export function buildVehicleDefensesPanel(actor) {
  const derived = actor.system?.derived ?? {};
  const defenses = derived.defenses ?? {};

  // If defenses are missing, return null (panel will not render)
  if (!defenses.ref && !defenses.fort && !defenses.will && !defenses.flatFooted) {
    return null;
  }

  // Map defenses to array format for template iteration
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
 * Build vehicle HP and condition panel
 */
export function buildVehicleHpConditionPanel(actor) {
  const system = actor.system ?? {};
  const derived = system.derived ?? {};
  const hp = derived.hp ?? { value: 0, max: 1, temp: 0, percent: 0, warning: false, critical: false };
  const damage = derived.damage ?? {};
  const conditionTrack = system.conditionTrack ?? { current: 0, penalty: 0 };

  // Map condition track to label
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

  const conditionCurrent = Math.min(3, Math.max(0, conditionTrack.current));

  return {
    title: 'Hull Integrity',
    hp: {
      value: hp.value,
      max: hp.max,
      temp: hp.temp,
      percent: hp.percent
    },
    damageThreshold: damage.threshold ?? 10,
    damageReduction: damage.reduction ?? 0,
    warning: hp.warning,
    critical: hp.critical,
    condition: {
      label: conditionLabels[conditionCurrent] || 'Unknown',
      severity: conditionSeverities[conditionCurrent] || 'normal',
      step: conditionCurrent,
      penalty: conditionTrack.penalty
    }
  };
}

/**
 * Build vehicle weapon mounts panel
 * PHASE 2: Adapter for current weapon data into mount structure
 */
export function buildVehicleWeaponMountPanel(actor) {
  const system = actor.system ?? {};
  const weapons = actor.items.filter(item => item.type === 'weapon') || [];

  if (weapons.length === 0) {
    return null;
  }

  const mounts = weapons.map((weapon, idx) => {
    const itemSystem = weapon.system ?? {};
    return {
      key: `mount-${idx}`,
      name: weapon.name,
      arc: itemSystem.arc || 'Omnidirectional',
      linkedGroup: null,  // Phase 3: Implement linked batteries
      fireControl: itemSystem.fireControl || 'Manual',
      gunner: 'Unassigned',  // Phase 3: Implement crew assignments
      attackSummary: itemSystem.bonus || '+0',
      damageSummary: itemSystem.damage || '1d10',
      notes: itemSystem.notes ? [itemSystem.notes] : []
    };
  });

  return {
    title: 'Weapon Mounts',
    mounts
  };
}

/**
 * Build vehicle crew summary panel
 */
export function buildVehicleCrewSummaryPanel(actor) {
  const system = actor.system ?? {};
  const ownedActors = system.ownedActors ?? [];
  const crewQuality = system.crewQuality || 'normal';

  const filledSlots = ownedActors.filter(e => e && e.id).length;
  const totalSlots = 6;  // Standard crew stations

  return {
    title: 'Crew',
    filledSlots,
    totalSlots,
    quality: crewQuality,
    passengers: system.passengers ? `${system.passengers} passengers` : 'No passengers'
  };
}

/**
 * Build vehicle crew assignment panel
 * PHASE 2: Proper station assignment structure
 */
export function buildVehicleCrewAssignmentPanel(actor) {
  const system = actor.system ?? {};
  const crewPositions = system.crewPositions ?? {};
  const ownedActors = system.ownedActors ?? [];

  // Build crew map for quick lookup
  const crewMap = {};
  for (const entry of ownedActors) {
    if (entry && entry.id) {
      crewMap[entry.id] = {
        id: entry.id,
        name: entry.name || 'Unknown'
      };
    }
  }

  // Map crew positions to station cards
  const stationKeys = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
  const stations = stationKeys.map(key => {
    const assignedActorId = crewPositions[key];
    const occupant = assignedActorId ? crewMap[assignedActorId] : null;

    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      occupied: !!occupant,
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
 * Build vehicle subsystem detail panel
 * PHASE 2: Expanded from Phase 1 scaffold
 */
export function buildVehicleSubsystemDetailPanel(actor, subsystemData, subsystemPenalties) {
  if (!subsystemData) {
    return null;
  }

  const subsystemTypes = ['engines', 'weapons', 'shields', 'sensors', 'comms', 'lifeSupport'];
  const subsystems = subsystemTypes.map(type => {
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

  // Build aggregate penalty text
  const penalties = [];
  if (subsystemPenalties) {
    Object.values(subsystemPenalties).forEach(p => {
      if (p?.description) penalties.push(p.description);
    });
  }
  const aggregatePenaltyText = penalties.length > 0 ? penalties.join('; ') : null;

  return {
    title: 'Subsystems',
    subsystems,
    aggregatePenaltyText
  };
}

/**
 * Build vehicle shield management panel
 * PHASE 2: Expanded from Phase 1 scaffold
 */
export function buildVehicleShieldManagementPanel(actor, shieldZones) {
  if (!shieldZones || typeof shieldZones !== 'object') {
    return null;
  }

  // Map zones to card format
  const zoneKeys = ['fore', 'aft', 'port', 'starboard'];
  const zones = zoneKeys.map(key => {
    const value = safeNumber(shieldZones[key], 0);
    const max = safeNumber(shieldZones.max, 100);
    const state = value <= max * 0.25 ? 'low' : value <= max * 0.5 ? 'moderate' : 'normal';

    return {
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      state
    };
  });

  const total = zones.reduce((sum, z) => sum + z.value, 0);
  const max = safeNumber(shieldZones.max, 100);
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
 * Build vehicle power summary panel
 * PHASE 2: Summary display (Phase 3 will add interactivity)
 */
export function buildVehiclePowerSummaryPanel(actor, powerData) {
  // Fallback to safe defaults if power data not available
  const available = powerData?.available ?? 350;
  const allocated = powerData?.allocated ?? 250;
  const budget = powerData?.budget ?? 600;
  const overAllocated = allocated > budget;

  // Build subsystem load list if available
  const subsystemLoads = [];
  if (powerData?.subsystemLoads) {
    subsystemLoads.push(...powerData.subsystemLoads);
  }

  return {
    title: 'Power',
    available,
    allocated,
    budget,
    overAllocated,
    subsystemLoads
  };
}

/**
 * Build vehicle cargo summary panel
 */
export function buildVehicleCargoSummaryPanel(actor, totalCargoWeight, cargoState) {
  const system = actor.system ?? {};
  const cargoCapacity = safeNumber(system.cargo?.capacity, 500);

  const percentUsed = cargoCapacity > 0 ? (totalCargoWeight / cargoCapacity) * 100 : 0;

  return {
    title: 'Cargo',
    totalWeight: Math.round(totalCargoWeight * 100) / 100,
    capacity: Math.round(cargoCapacity * 100) / 100,
    percentUsed: Math.round(percentUsed),
    state: cargoState,
    stateLabel: cargoState === 'over' ? 'Over Capacity' : cargoState === 'near' ? 'Near Capacity' : 'Normal'
  };
}

/**
 * Build vehicle cargo manifest panel
 * PHASE 2: Manifest-style panel
 */
export function buildVehicleCargoManifestPanel(actor) {
  const cargoItems = actor.items
    .filter(item => item.type === 'equipment')
    .map(item => ({
      name: item.name,
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
 * Main context builder for vehicle sheet — Phase 2
 * Builds all 11 panel contexts and tab structures
 */
export function buildVehicleSheetContext(actor, rawContext, options = {}) {
  // Extract house-rule data from options
  const subsystemData = options.subsystemData || null;
  const subsystemPenalties = options.subsystemPenalties || null;
  const shieldZones = options.shieldZones || null;
  const powerData = options.powerData || null;
  const totalCargoWeight = options.totalCargoWeight || 0;
  const cargoState = options.cargoState || 'normal';

  // Build all panel contexts
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
      cargoManifestPanel
    },
    vehicleTabs: {
      overview: {
        headerSummaryPanel,
        defensesPanel,
        hpConditionPanel,
        crewSummaryPanel,
        cargoSummaryPanel
      },
      weapons: {
        weaponMountPanel
      },
      crew: {
        crewSummaryPanel,
        crewAssignmentPanel
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

/**
 * Export all builders for testing/reuse
 */
export {
  buildVehicleHeaderSummaryPanel,
  buildVehicleDefensesPanel,
  buildVehicleHpConditionPanel,
  buildVehicleWeaponMountPanel,
  buildVehicleCrewSummaryPanel,
  buildVehicleCrewAssignmentPanel,
  buildVehicleSubsystemDetailPanel,
  buildVehicleShieldManagementPanel,
  buildVehiclePowerSummaryPanel,
  buildVehicleCargoSummaryPanel,
  buildVehicleCargoManifestPanel
};
