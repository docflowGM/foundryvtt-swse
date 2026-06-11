/**
 * Vehicle Sheet Context Builder
 *
 * Builds prepared, serializable panel contexts for the vehicle sheet.
 * Context building is stateless and pure: no mutations, no side effects.
 * Templates receive pre-shaped objects rather than raw actor/system data.
 */

import { PanelContextBuilder } from "/systems/foundryvtt-swse/scripts/sheets/v2/context/PanelContextBuilder.js";
import { getStationSkillActions } from "/systems/foundryvtt-swse/scripts/sheets/v2/vehicle-sheet/crew-skill-router.js";

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
 * Safe string coercion.
 *
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
function safeString(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function lower(value) {
  return safeString(value).trim().toLowerCase();
}

function firstPresent(...values) {
  for (const value of values) {
    if (value === 0 || value === false) return value;
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
}

function safeVehicleNumber(...values) {
  const fallback = typeof values[values.length - 1] === 'number' ? values.pop() : 0;
  const value = firstPresent(...values);
  return safeNumber(value, fallback);
}


function vehicleModelName(system = {}, actor = null, fallback = '') {
  const candidates = [
    system.model,
    system.vehicleModel,
    system.modelName,
    system.stockShip?.name,
    system.modificationData?.stockShip?.name,
    system.buildMetadata?.model,
    system.buildMetadata?.modelName,
    system.buildMetadata?.frameName,
    system.shipyard?.model,
    system.shipyard?.modelName,
    system.shipyard?.frameName,
    actor?.flags?.['foundryvtt-swse']?.shipyardBuild?.stockShip?.name,
    fallback
  ];
  for (const candidate of candidates) {
    const value = safeString(candidate).trim();
    if (value) return value;
  }
  return '';
}

function signedNumberString(value, fallback = '+0') {
  const raw = firstPresent(value);
  if (raw === null) return fallback;
  const n = Number(String(raw).replace(/[^0-9+\-.]/g, ''));
  if (!Number.isFinite(n)) return String(raw);
  return n >= 0 ? `+${n}` : `${n}`;
}

function normalizeVehicleWeaponEntry(weapon = {}, index = 0, source = 'system') {
  const name = safeString(weapon.name || weapon.label || `Weapon ${index + 1}`, `Weapon ${index + 1}`);
  const rawBonus = firstPresent(weapon.bonus, weapon.attackBonus, weapon.attack, weapon.toHit, weapon.total, '+0');
  const attackSummary = signedNumberString(rawBonus, '+0');
  const damageSummary = safeString(firstPresent(weapon.damage, weapon.damageFormula, weapon.formula, weapon.damageRoll, '1d10'), '1d10');
  const rangeSummary = safeString(firstPresent(weapon.range, weapon.rangeSummary, weapon.rangeProfile, 'Close'), 'Close');
  return {
    key: weapon.key || weapon.id || weapon._id || `${source}-weapon-${index}`,
    name,
    arc: safeString(firstPresent(weapon.arc, weapon.firingArc, 'Forward'), 'Forward'),
    linkedGroup: weapon.linkedGroup || null,
    fireControl: firstPresent(weapon.fireControl, weapon.fireControlBonus, null),
    weaponId: source === 'item' ? weapon.id : `system-weapons-${index}`,
    source,
    index,
    gunner: 'Unassigned',
    crewRole: weapon.crewRole || 'gunner',
    attackSummary,
    attackBonus: attackSummary,
    damageSummary,
    damageFormula: damageSummary,
    rangeSummary,
    notes: safeArray(weapon.notes ? [weapon.notes] : weapon.special ? [weapon.special] : []),
    actions: getStationSkillActions('gunner').map((action) => ({ ...action, stationKey: 'gunner' })),
    rawSource: weapon.rawSource || null,
    parseConfidence: weapon.parseConfidence || (source === 'item' ? 'structured' : 'statblock')
  };
}

/**
 * Parse the canonical vehicle cargo string field into a display object.
 * Examples: "100 Tons", "70 Kilograms", "5 kg", "not publicly available".
 *
 * @param {*} value
 * @returns {{raw:string, value:number|null, unit:string, kilograms:number|null, display:string, known:boolean}}
 */
export function parseCargoString(value) {
  const raw = safeString(value).trim();
  if (!raw) return { raw: '', value: null, unit: '', kilograms: null, display: 'Unknown', known: false };

  const normalized = raw.toLowerCase();
  if (/not public|unknown|none|n\/?a|—|-/.test(normalized)) {
    return { raw, value: null, unit: '', kilograms: null, display: raw, known: false };
  }

  const match = raw.match(/([\d,.]+)\s*([a-zA-Z]+)?/);
  if (!match) return { raw, value: null, unit: '', kilograms: null, display: raw, known: false };

  const valueNum = Number(match[1].replace(/,/g, ''));
  const unitRaw = (match[2] || '').toLowerCase();
  const unit = unitRaw.startsWith('ton') ? 'tons'
    : unitRaw === 'kg' || unitRaw.startsWith('kilo') ? 'kg'
      : unitRaw || '';
  const kilograms = Number.isFinite(valueNum)
    ? unit === 'tons' ? valueNum * 1000 : valueNum
    : null;

  return {
    raw,
    value: Number.isFinite(valueNum) ? valueNum : null,
    unit,
    kilograms,
    display: raw,
    known: Number.isFinite(valueNum)
  };
}

/**
 * Parse compound vehicle speed strings from canonical packs.
 *
 * @param {*} value
 * @returns {{raw:string, mode:string, character:string, starship:string, summary:string}}
 */
export function parseVehicleSpeed(value) {
  const raw = safeString(value).trim();
  if (!raw) return { raw: '', mode: '', character: '—', starship: '—', summary: '—' };

  const modeMatch = raw.match(/^(\w+)/);
  const mode = modeMatch ? modeMatch[1].toLowerCase() : '';
  const characterMatch = raw.match(/(\d+)\s*squares?\s*\(\s*character\s*scale\s*\)/i);
  const starshipMatch = raw.match(/(\d+)\s*squares?\s*\(\s*starship\s*scale\s*\)/i);
  const firstSquares = raw.match(/(\d+)\s*squares?/i);

  const character = characterMatch ? `${characterMatch[1]} sq.` : firstSquares ? `${firstSquares[1]} sq.` : raw;
  const starship = starshipMatch ? `${starshipMatch[1]} sq.` : '—';

  return {
    raw,
    mode,
    character,
    starship,
    summary: starshipMatch ? `${character} character / ${starship} starship` : character
  };
}

function hasMeaningfulHyperdrive(value) {
  const raw = lower(value);
  return !!raw && raw !== 'none' && raw !== 'null' && raw !== '0' && raw !== '—' && raw !== '-';
}

/**
 * Derive vehicle type capabilities from canonical pack fields.
 * No schema-level vehicleType enum exists; this is a context-only classifier.
 *
 * @param {Object} system
 * @returns {Object}
 */
export function buildVehicleTypeFlags(system = {}) {
  const cat = `${system.category || ''} ${system.type || ''} ${safeArray(system.tags).join(' ')}`.toLowerCase();
  const size = lower(system.size || 'colossal');
  const hasHyperdrive = hasMeaningfulHyperdrive(system.hyperdrive_class ?? system.hyperdrive);
  const hasBackupHyperdrive = hasMeaningfulHyperdrive(system.backup_class ?? system.backupHyperdrive);
  const hasShields = safeNumber(system.shields?.max ?? system.shieldRating, 0) > 0 || !!system.shieldRating;

  const isWalker = /walker|at-at|at-st|at-ap|at-te/.test(cat);
  const isSpeeder = /speeder|airspeeder|swoop|landspeeder|bike|hoverbike/.test(cat);
  const isGround = /wheeled|ground vehicle|tank|repulsor tank|crawler/.test(cat) && !isWalker && !isSpeeder;
  const isStation = /station|space station|battle station/.test(cat) || size.includes('station');
  const isCapital = isStation || /capital|corvette|frigate|cruiser|destroyer|carrier/.test(cat) || /cruiser|frigate|station/.test(size);
  const isStarship = (hasHyperdrive || hasBackupHyperdrive || /starfighter|transport|gunship|shuttle|fighter|freighter|starship/.test(cat) || isCapital)
    && !isWalker && !isSpeeder && !isGround;

  const vehicleType = isCapital ? 'capital'
    : isStarship ? 'starship'
      : isWalker ? 'walker'
        : isSpeeder ? 'speeder'
          : isGround ? 'ground'
            : 'vehicle';

  const labels = {
    overview: 'Overview',
    stats: 'Stats',
    crew: isCapital ? 'Command Deck' : isStarship ? 'Crew Stations' : isWalker ? 'Crew' : 'Crew',
    cargo: isCapital || isStarship ? 'Cargo Bay' : isSpeeder ? 'Payload' : 'Cargo',
    maneuvers: 'Maneuvers',
    operations: isCapital ? 'Combat' : isStarship ? 'Combat' : isWalker ? 'Combat' : 'Combat'
  };

  return {
    vehicleType,
    typeLabel: vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1),
    isStarship: isStarship || isCapital,
    isCapitalShip: isCapital,
    isWalker,
    isSpeeder,
    isGroundVehicle: isGround,
    isStation,
    supportsHyperdrive: hasHyperdrive,
    supportsBackupHyperdrive: hasBackupHyperdrive,
    supportsShields: hasShields || isStarship || isCapital,
    supportsStarshipManeuvers: isStarship || isCapital,
    supportsShipyard: isStarship || isCapital || isWalker || isSpeeder || isGround,
    supportsOperationsTab: isStarship || isCapital || isWalker || isGround,
    supportsManeuversTab: isStarship || isCapital,
    supportsTurnPhase: isStarship || isCapital,
    supportsPowerRouting: isCapital,
    supportsSubsystems: isCapital,
    supportsCrewCommandPanel: isCapital,
    labels,
    cssClass: `swse-vehicle-type-${vehicleType}`
  };
}

function buildVehicleResourceStrip(actor, panels, typeFlags, parsedCargo) {
  const hp = panels.hpConditionPanel?.hp ?? {};
  const hpPercent = Math.max(0, Math.min(100, safeNumber(hp.percent, 0)));
  const srValue = safeNumber(actor?.system?.shields?.value ?? actor?.system?.shieldRating, 0);
  const srMax = safeNumber(actor?.system?.shields?.max ?? srValue, srValue);
  const ep = panels.powerSummaryPanel ?? null;
  const crew = panels.crewSummaryPanel ?? {};
  const cargo = panels.cargoSummaryPanel ?? {};
  const condition = panels.hpConditionPanel?.condition ?? {};

  return {
    entries: [
      { key: 'hull', label: 'Hull', value: `${hp.value ?? 0} / ${hp.max ?? 0}`, bar: hpPercent, tone: hpPercent <= 25 ? 'critical' : hpPercent <= 50 ? 'warning' : 'normal' },
      { key: 'sr', label: 'SR', value: srMax ? `${srValue} / ${srMax}` : '0', bar: srMax ? Math.round((srValue / srMax) * 100) : 0, tone: srValue <= 0 ? 'neutral' : 'normal' },
      { key: 'ep', label: 'EP', value: ep ? `${ep.available} / ${ep.budget}` : 'Phase 2', bar: ep ? Math.min(100, Math.max(0, 100 - safeNumber(ep.percentAllocated, 0))) : 0, tone: ep?.overAllocated ? 'critical' : ep ? 'normal' : 'neutral', badge: ep?.enabled === false ? 'RULE OFF' : ep ? null : 'WIRE GAP' },
      { key: 'crew', label: 'Crew', value: `${crew.filledSlots ?? 0} / ${crew.totalSlots ?? 0}`, bar: crew.totalSlots ? Math.round(((crew.filledSlots ?? 0) / crew.totalSlots) * 100) : 0, tone: crew.filledSlots ? 'normal' : 'warning' },
      { key: 'cargo', label: typeFlags.labels.cargo, value: parsedCargo?.display || `${cargo.totalWeight ?? 0} / ${cargo.capacity ?? 0}`, bar: Math.max(0, Math.min(100, safeNumber(cargo.percentUsed, 0))), tone: cargo.state === 'over' ? 'critical' : cargo.state === 'near' ? 'warning' : 'normal' },
      { key: 'condition', label: 'Condition', value: condition.label || 'Operational', bar: null, tone: condition.severity || 'normal' }
    ]
  };
}

function buildVehicleConceptTabs(typeFlags, editable) {
  const tabs = [
    { key: 'overview', label: typeFlags.labels.overview, active: true, visible: true },
    { key: 'stats', label: typeFlags.labels.stats, visible: true },
    { key: 'crew', label: typeFlags.labels.crew, visible: true },
    { key: 'cargo', label: typeFlags.labels.cargo, visible: true },
    { key: 'maneuvers', label: typeFlags.labels.maneuvers, visible: !!typeFlags.supportsManeuversTab },
    { key: 'operations', label: typeFlags.labels.operations, visible: !!typeFlags.supportsOperationsTab }
  ];
  if (editable) tabs.push({ key: 'edit', label: 'Edit', visible: true, gm: true });
  return tabs.filter((tab) => tab.visible);
}


function buildVehicleEditContext(actor, options = {}) {
  const system = actor?.system ?? {};
  const derived = system.derived ?? {};
  const identity = derived.identity ?? {};
  const hp = system.hull ?? system.hp ?? {};
  const shields = system.shields ?? {};
  return {
    identity: {
      model: vehicleModelName(system, actor, options.sourceModelName),
      category: identity.category || system.category || '',
      type: identity.typeLabel || system.type || '',
      size: identity.sizeLabel || system.size || ''
    },
    details: {
      challengeLevel: system.challengeLevel ?? system.cl ?? '',
      cost: typeof system.cost === 'object' ? JSON.stringify(system.cost) : (system.cost ?? ''),
      availability: system.availability ?? '',
      cover: system.cover ?? ''
    },
    hull: { value: safeNumber(hp.value, 0), max: safeNumber(hp.max, 0) },
    shields: { value: safeNumber(shields.value, 0), max: safeNumber(shields.max, 0), sr: system.shieldRating ?? shields.max ?? '' },
    defenses: {
      reflex: system.reflexDefense ?? derived.defenses?.ref?.total ?? '',
      fortitude: system.fortitudeDefense ?? derived.defenses?.fort?.total ?? '',
      will: system.willDefense ?? derived.defenses?.will?.total ?? '',
      flatFooted: system.flatFooted ?? derived.defenses?.flatFooted?.total ?? '',
      damageThreshold: system.damageThreshold ?? derived.damage?.threshold ?? '',
      armorBonus: system.armorBonus ?? '',
      damageReduction: system.damageReduction ?? derived.damage?.reduction ?? '',
      initiative: system.initiative ?? '',
      baseAttackBonus: system.baseAttackBonus ?? ''
    },
    movement: {
      speed: system.speed ?? '',
      maxVelocity: system.maxVelocity ?? '',
      maneuver: system.maneuver ?? ''
    },
    crew: {
      crew: typeof system.crew === 'string' ? system.crew : JSON.stringify(system.crew ?? ''),
      crewQuality: system.crewQuality ?? system.crew?.quality ?? '',
      passengers: system.passengers ?? '',
      cargo: system.cargo ?? '',
      payload: system.payload ?? ''
    },
    weapons: safeArray(system.weapons).map((weapon, index) => ({
      index,
      name: weapon?.name ?? '',
      arc: weapon?.arc ?? 'Forward',
      bonus: weapon?.bonus ?? weapon?.attackBonus ?? '+0',
      damage: weapon?.damage ?? weapon?.damageFormula ?? '',
      range: weapon?.range ?? 'Close',
      fireControl: weapon?.fireControl ?? '',
      notes: weapon?.notes ?? ''
    }))
  };
}

function buildVehicleAnnotationBar(typeFlags) {
  return {
    visible: true,
    chips: [
      { label: `Type: ${typeFlags.typeLabel}` },
      { label: `Maneuvers: ${typeFlags.supportsManeuversTab ? 'shown' : 'hidden'}` },
      { label: `Operations: ${typeFlags.supportsOperationsTab ? 'shown' : 'hidden'}` },
      { label: `Hyperdrive: ${typeFlags.supportsHyperdrive ? 'yes' : 'no'}` },
      { label: `Shields: ${typeFlags.supportsShields ? 'yes' : 'no'}` }
    ]
  };
}

const VEHICLE_ABILITY_KEYS = new Set(['str', 'dex', 'int', 'wis', 'cha']);

function buildVehicleAbilitiesPanel(actor) {
  const panelBuilder = new PanelContextBuilder(actor, { isEditable: actor?.isOwner === true });
  const basePanel = panelBuilder.buildAbilitiesPanel();
  const abilities = safeArray(basePanel?.abilities).filter((ability) => VEHICLE_ABILITY_KEYS.has(ability?.key));
  return {
    ...basePanel,
    abilities,
    canEdit: actor?.isOwner === true
  };
}

/**
 * Build vehicle header summary panel.
 *
 * @param {Actor} actor
 * @returns {Object}
 */
export function buildVehicleHeaderSummaryPanel(actor, options = {}) {
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
    model: vehicleModelName(system, actor, options.sourceModelName),
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
  const system = actor?.system ?? {};
  const derived = system.derived ?? {};
  const defenses = derived.defenses ?? {};

  const refTotal = safeVehicleNumber(system.reflexDefense, system.defenses?.reflex?.total, system.defenses?.reflex, defenses.ref?.total, defenses.reflex?.total, 10);
  const fortTotal = safeVehicleNumber(system.fortitudeDefense, system.defenses?.fortitude?.total, system.defenses?.fortitude, defenses.fort?.total, defenses.fortitude?.total, 10);
  const willTotal = safeVehicleNumber(system.willDefense, system.defenses?.will?.total, system.defenses?.will, defenses.will?.total, 10);
  const flatTotal = safeVehicleNumber(system.flatFooted, system.flatFootedDefense, system.defenses?.flatFooted?.total, system.defenses?.flatFooted, defenses.flatFooted?.total, refTotal);

  const defenseArray = [
    { key: 'ref', label: 'Reflex', base: defenses.ref?.base ?? 10, total: refTotal, adjustment: refTotal - 10, stateBonus: defenses.ref?.stateBonus ?? 0 },
    { key: 'fort', label: 'Fortitude', base: defenses.fort?.base ?? 10, total: fortTotal, adjustment: fortTotal - 10, stateBonus: defenses.fort?.stateBonus ?? 0 },
    { key: 'will', label: 'Will', base: defenses.will?.base ?? 10, total: willTotal, adjustment: willTotal - 10, stateBonus: defenses.will?.stateBonus ?? 0 },
    { key: 'flatFooted', label: 'Flat-Footed', base: defenses.flatFooted?.base ?? 10, total: flatTotal, adjustment: flatTotal - 10, stateBonus: defenses.flatFooted?.stateBonus ?? 0 }
  ];

  return {
    title: 'Defenses',
    defenses: defenseArray,
    damageThreshold: safeVehicleNumber(system.damageThreshold, derived.damage?.threshold, 10)
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
  const derivedHp = derived.hp ?? {};
  const hull = system.hull ?? system.hp ?? {};
  const hullValue = safeVehicleNumber(hull.value, derivedHp.value, 0);
  const hullMax = Math.max(1, safeVehicleNumber(hull.max, derivedHp.max, 1));
  const hp = {
    value: hullValue,
    max: hullMax,
    temp: safeVehicleNumber(hull.temp, derivedHp.temp, 0),
    percent: Math.max(0, Math.min(100, (hullValue / hullMax) * 100)),
    warning: hullValue / hullMax <= 0.5 && hullValue / hullMax > 0.25,
    critical: hullValue / hullMax <= 0.25
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
    damageThreshold: safeVehicleNumber(system.damageThreshold, damage.threshold, 10),
    damageReduction: safeVehicleNumber(system.damageReduction, damage.reduction, 0),
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

  const embeddedWeapons = items.filter((item) => ['weapon', 'vehicle-weapon', 'vehicleWeapon', 'vehicleWeaponRange'].includes(item?.type));

  for (const weapon of embeddedWeapons) {
    const itemSystem = weapon?.system ?? {};
    const vehicleMount = itemSystem.vehicleMount ?? {};
    mounts.push(normalizeVehicleWeaponEntry({
      id: weapon.id,
      name: weapon?.name,
      arc: vehicleMount.arc || itemSystem.arc,
      linkedGroup: vehicleMount.linkedGroup,
      fireControl: vehicleMount.fireControl || itemSystem.fireControl,
      bonus: itemSystem.bonus || itemSystem.attackBonus || itemSystem.attack?.bonus,
      damage: itemSystem.damage || itemSystem.damageFormula || itemSystem.combat?.damage?.dice,
      range: itemSystem.range,
      notes: itemSystem.notes,
      rawSource: vehicleMount.rawSource,
      parseConfidence: vehicleMount.parseConfidence || 'structured',
      crewRole: vehicleMount.crewRole || 'gunner'
    }, mounts.length, 'item'));
  }

  if (Array.isArray(system.weapons)) {
    for (let i = 0; i < system.weapons.length; i += 1) {
      const weapon = system.weapons[i];
      if (!weapon || !weapon.name) continue;
      mounts.push(normalizeVehicleWeaponEntry(weapon, i, 'system'));
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
  const crewPositions = system.crewPositions ?? {};
  const ownedActors = safeArray(system.ownedActors);
  const crewQuality = typeof system.crew === 'object' ? (system.crew?.quality || system.crewQuality || 'normal') : (system.crewQuality || 'normal');

  const positionValues = Object.values(crewPositions || {});
  const filledFromPositions = positionValues.filter((entry) => {
    if (!entry) return false;
    if (typeof entry === 'string') return !!entry;
    return !!(entry.uuid || entry.id || entry.actorId || entry.name);
  }).length;
  const filledSlots = filledFromPositions || ownedActors.filter((entry) => entry && (entry.id || entry.uuid || entry.name)).length;

  const crewRaw = system.crew;
  let totalSlots = 6;
  if (crewRaw && typeof crewRaw === 'object') totalSlots = safeNumber(crewRaw.total, Object.keys(crewPositions || {}).length || 6);
  else {
    const match = safeString(crewRaw).match(/(\d+)/);
    totalSlots = match ? safeNumber(match[1], 6) : (Object.keys(crewPositions || {}).length || 6);
  }

  return {
    title: 'Crew',
    filledSlots,
    totalSlots: Math.max(1, totalSlots),
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
    if (!entry) continue;
    const id = entry.id || entry.actorId || entry.uuid;
    if (!id) continue;
    crewMap[id] = { id, uuid: entry.uuid || null, name: entry.name || entry.label || 'Unknown' };
  }

  const stationKeys = ['pilot', 'copilot', 'gunner', 'engineer', 'shields', 'commander'];
  const stations = stationKeys.map((key) => {
    const entry = crewPositions[key];
    let occupant = null;

    if (entry) {
      if (typeof entry === 'string') {
        occupant = crewMap[entry] || { id: entry, uuid: entry.startsWith('Actor.') ? entry : null, name: entry };
      } else {
        const id = entry.id || entry.actorId || entry.uuid || null;
        occupant = id && crewMap[id] ? crewMap[id] : {
          id,
          uuid: entry.uuid || null,
          name: entry.name || entry.label || entry.roleName || 'Assigned Crew'
        };
      }
    }

    if (!occupant) {
      const legacy = ownedActors.find((candidate) => candidate?.position === key || candidate?.role === key);
      if (legacy) occupant = {
        id: legacy.id || legacy.actorId || null,
        uuid: legacy.uuid || null,
        name: legacy.name || legacy.label || 'Assigned Crew'
      };
    }

    const actions = getStationSkillActions(key).map((action) => ({
      ...action,
      stationKey: key,
      disabled: false
    }));

    return {
      key,
      label: key === 'copilot' ? 'Co-Pilot' : key.charAt(0).toUpperCase() + key.slice(1),
      occupied: Boolean(occupant && (occupant.id || occupant.uuid || occupant.name)),
      occupantName: occupant?.name ?? 'Unassigned',
      occupantId: occupant?.id ?? null,
      occupantUuid: occupant?.uuid ?? null,
      notes: occupant ? null : 'Fallback crew quality applies until a crew actor is assigned.',
      actions
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
    enabled: powerData?.enabled !== false,
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
  const parsed = parseCargoString(system.cargo);
  const cargoCapacity = safeNumber(parsed.kilograms, 0);
  const cargoWeight = safeNumber(totalCargoWeight, 0);
  const percentUsed = cargoCapacity > 0 ? (cargoWeight / cargoCapacity) * 100 : 0;
  const derivedState = cargoCapacity > 0
    ? cargoWeight > cargoCapacity * 1.1 ? 'over' : cargoWeight > cargoCapacity * 0.8 ? 'near' : 'normal'
    : cargoState || 'unknown';

  return {
    title: 'Cargo',
    totalWeight: Math.round(cargoWeight * 100) / 100,
    capacity: parsed.value ?? Math.round(cargoCapacity * 100) / 100,
    capacityUnit: parsed.unit || 'kg',
    capacityDisplay: parsed.display,
    percentUsed: Math.round(percentUsed),
    state: derivedState,
    stateLabel:
      derivedState === 'over'
        ? 'Over Capacity'
        : derivedState === 'near'
          ? 'Near Capacity'
          : parsed.known ? 'Normal' : 'Unparsed'
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
    enabled: pilotData?.enabled !== false,
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
    enabled: commanderData?.enabled !== false,
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
    { key: 'gunner', label: 'Gunners' },
    { key: 'cleanup', label: 'Cleanup' }
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
    enabled: turnPhaseData?.enabled !== false,
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

  const vehicleTypeFlags = buildVehicleTypeFlags(actor?.system ?? {});
  const parsedCargo = parseCargoString(actor?.system?.cargo);
  const parsedSpeed = parseVehicleSpeed(actor?.system?.speed);

  const headerSummaryPanel = buildVehicleHeaderSummaryPanel(actor, { sourceModelName: options.sourceModelName });
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
  const abilitiesPanel = buildVehicleAbilitiesPanel(actor);
  const abilities = safeArray(abilitiesPanel?.abilities);

  const pilotManeuverPanel = buildPilotManeuverPanel(pilotData);
  const commanderOrderPanel = buildCommanderOrderPanel(commanderData);
  const turnPhasePanel = buildTurnPhasePanel(turnPhaseData);
  const panelSet = {
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
  };
  const vehicleResourceStrip = buildVehicleResourceStrip(actor, panelSet, vehicleTypeFlags, parsedCargo);
  const vehicleConceptTabs = buildVehicleConceptTabs(vehicleTypeFlags, rawContext?.editable ?? actor?.isOwner === true);
  const vehicleAnnotation = buildVehicleAnnotationBar(vehicleTypeFlags);

  return {
    vehicleTypeFlags,
    vehicleResourceStrip,
    vehicleConceptTabs,
    vehicleAnnotation,
    parsedCargo,
    parsedSpeed,
    editContext: buildVehicleEditContext(actor, { sourceModelName: options.sourceModelName }),
    abilitiesPanel,
    abilities,
    conceptLayout: {
      abilities,
      abilitiesTab: {
        entries: abilities
      }
    },
    vehiclePanels: panelSet,
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