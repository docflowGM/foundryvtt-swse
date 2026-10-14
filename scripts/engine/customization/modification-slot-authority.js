/**
 * ModificationSlotAuthority -- Phase 1a (read-only).
 *
 * Implements docs/audits/modification-slot-authority-phase-1a-contract.md (revision 5) and nothing more.
 * `resolveSlotState(item, context?)` returns a deterministic, JSON-serializable description of an Item's upgrade-slot
 * state. It never reports a number it cannot certify: unknown, unverified, ambiguous and contradictory inputs are
 * reported as such, and `total`, `used`, `free` and `overflow` stay `null` unless the whole state is certified.
 *
 * This module is pure. It imports nothing, reads only the Item snapshot and the injected context, writes nothing,
 * and is not called by any existing consumer.
 */

export const CONTRACT_VERSION = 1;

const BASELINE_SOURCE = Object.freeze({ ref: 'scum-and-villainy:p37', certification: 'reviewer-verified-pdf' });

/** Certified starting upgrade slots (contract section 5.1). */
export const BASELINE_TABLE = Object.freeze({
  source: BASELINE_SOURCE,
  values: Object.freeze({
    'weapon:ordinary': 1,
    equipment: 1,
    'armor:light': 1,
    'armor:medium': 2,
    'armor:heavy': 3
  })
});

const DOMAINS = Object.freeze(['weapon', 'armor', 'equipment']);

// Valid strippable areas per domain, as defined by the existing UpgradeSlotEngine.getStrippableAreas.
const STRIP_AREAS = Object.freeze({
  weapon: Object.freeze(['damage', 'range', 'design', 'stun_setting', 'autofire']),
  armor: Object.freeze(['defensive_material', 'joint_protection']),
  equipment: Object.freeze([])
});

const ARMOR_CLASSES = Object.freeze(['light', 'medium', 'heavy']);
// Existing structural transition (StructuralChangeEngine): light -> medium -> heavy; heavy has no next class.
const NEXT_ARMOR_CLASS = Object.freeze({ light: 'medium', medium: 'heavy', heavy: 'heavy' });

const TECH_DEVICE_SLOT_TRAIT_ID = 'tech_device_upgrade_slot';
const LEGACY_KEY_ARRAYS = Object.freeze(['blasterUpgrades', 'meleeUpgrades', 'armorUpgrades', 'gearMods']);

const ADJUSTMENT_SOURCE = Object.freeze({ ref: 'scum-and-villainy:p37', certification: 'reviewer-verified-pdf' });

/* ------------------------------------------------------------------------------------------------ */
/* Small pure helpers                                                                               */
/* ------------------------------------------------------------------------------------------------ */

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSlotInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Safe nested read: never throws, never returns anything but the stored value or `undefined`. */
function read(root, ...path) {
  let cursor = root;
  for (const key of path) {
    if (cursor === null || cursor === undefined) return undefined;
    if (typeof cursor !== 'object' && typeof cursor !== 'function') return undefined;
    try {
      cursor = cursor[key];
    } catch (_err) {
      return undefined;
    }
  }
  return cursor;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

/** JSON-safe, reference-free copy of arbitrary input (used only for evidence echoed into the output). */
function safeCopy(value, depth = 0) {
  if (value === null || value === undefined) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') return Number.isFinite(value) ? value : String(value);
  if (type === 'bigint') return String(value);
  if (type === 'function' || type === 'symbol') return `[${type}]`;
  if (depth >= 5) return '[depth-limit]';
  try {
    if (Array.isArray(value)) return value.slice(0, 50).map((entry) => safeCopy(entry, depth + 1));
    const copy = {};
    for (const key of Object.keys(value).sort().slice(0, 50)) copy[key] = safeCopy(value[key], depth + 1);
    return copy;
  } catch (_err) {
    return '[unreadable]';
  }
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortBy(list, keyFn) {
  return list
    .map((entry) => ({ entry, key: keyFn(entry) }))
    .sort((a, b) => compareText(a.key, b.key))
    .map((wrapped) => wrapped.entry);
}

/** Collects conflicts, unresolved entries and diagnostics; sorted deterministically at the end. */
function createCollector() {
  const conflicts = [];
  const unresolved = [];
  const diagnostics = [];
  return {
    conflicts,
    unresolved,
    diagnostics,
    conflict(code, subject, detail = {}) {
      conflicts.push({ code, subject, detail: safeCopy(detail) });
    },
    block(code, subject, detail = null) {
      const entry = { code, subject, blocksCertification: true };
      if (detail !== null) entry.detail = safeCopy(detail);
      unresolved.push(entry);
    },
    diagnostic(code, detail = {}) {
      diagnostics.push({ code, detail: safeCopy(detail) });
    },
    sorted() {
      const key = (entry) => `${entry.code}\u0000${entry.subject ?? ''}\u0000${stableStringify(entry.detail ?? null)}`;
      return {
        conflicts: sortBy(conflicts, key),
        unresolved: sortBy(unresolved, key),
        diagnostics: sortBy(diagnostics, key)
      };
    }
  };
}

/* ------------------------------------------------------------------------------------------------ */
/* Context                                                                                          */
/* ------------------------------------------------------------------------------------------------ */

function normalizeContext(context, collector) {
  const ctx = isObject(context) ? context : {};

  let trusted = null;
  if (ctx.trustedClassification !== undefined && ctx.trustedClassification !== null) {
    const candidate = ctx.trustedClassification;
    if (isObject(candidate) && isNonEmptyString(candidate.evidenceRef)) {
      trusted = {
        evidenceRef: candidate.evidenceRef,
        weaponClass: candidate.weaponClass === 'ordinary' || candidate.weaponClass === 'lightsaber' ? candidate.weaponClass : null,
        armorStockClass: ARMOR_CLASSES.includes(candidate.armorStockClass) ? candidate.armorStockClass : null,
        powered: typeof candidate.powered === 'boolean' ? candidate.powered : null,
        legacySlotValueOrigin:
          candidate.legacySlotValueOrigin === 'authored-stock' || candidate.legacySlotValueOrigin === 'calculated-total'
            ? candidate.legacySlotValueOrigin
            : null
      };
    } else {
      // Trusted classification needs verified provenance (an evidenceRef); without it nothing is trusted.
      collector.diagnostic('TRUSTED_INPUT_INVALID', { input: 'trustedClassification', reason: 'evidenceRef-missing-or-not-an-object' });
    }
  }

  let baseline = BASELINE_TABLE;
  if (ctx.baselineTable !== undefined && ctx.baselineTable !== null) {
    if (isObject(ctx.baselineTable) && isObject(ctx.baselineTable.values) && isObject(ctx.baselineTable.source)) baseline = ctx.baselineTable;
    else collector.diagnostic('TRUSTED_INPUT_INVALID', { input: 'baselineTable', reason: 'malformed' });
  }

  return {
    trusted,
    baseline,
    canonicalWeaponLookup: typeof ctx.canonicalWeaponLookup === 'function' ? ctx.canonicalWeaponLookup : null,
    certifiedDefinitionLookup: typeof ctx.certifiedDefinitionLookup === 'function' ? ctx.certifiedDefinitionLookup : null
  };
}

function baselineValue(ctx, key) {
  const value = read(ctx.baseline, 'values', key);
  return isSlotInteger(value) ? value : null;
}

function baselineSource(ctx) {
  return safeCopy(ctx.baseline.source);
}

/* ------------------------------------------------------------------------------------------------ */
/* Base resolution                                                                                  */
/* ------------------------------------------------------------------------------------------------ */

function emptyBase() {
  return { status: 'unresolved', value: null, basis: null, source: null, classification: { weapon: null, armor: null }, reasons: [] };
}

function certifyBase(base, ctx, key) {
  const value = baselineValue(ctx, key);
  if (value === null) {
    base.reasons.push('BASELINE_NOT_CERTIFIED');
    return false;
  }
  base.status = 'certified';
  base.value = value;
  base.basis = 'raw-default';
  base.source = baselineSource(ctx);
  return true;
}

function failBase(base, collector, code, subject, detail = null) {
  if (!base.reasons.includes(code)) base.reasons.push(code);
  collector.block(code, subject, detail);
}

function lookupWeapon(item, ctx, collector) {
  if (ctx.canonicalWeaponLookup === null) return { state: 'absent' };
  let result;
  try {
    result = ctx.canonicalWeaponLookup(item);
  } catch (_err) {
    collector.diagnostic('TRUSTED_INPUT_INVALID', { input: 'canonicalWeaponLookup', reason: 'threw' });
    return { state: 'unresolved', reason: 'lookup-threw' };
  }
  if (!isObject(result)) return { state: 'unresolved', reason: 'lookup-returned-no-result' };
  if (result.state === 'legacy') return { state: 'legacy' };
  if (result.state === 'canonical') {
    const weaponClass = result.weaponClass === 'ordinary' || result.weaponClass === 'lightsaber' ? result.weaponClass : 'unknown';
    return {
      state: 'canonical',
      identityKey: isNonEmptyString(result.identityKey) ? result.identityKey : null,
      weaponClass,
      source: safeCopy(result.source)
    };
  }
  if (result.state === 'unresolved') return { state: 'unresolved', reason: isNonEmptyString(result.reason) ? result.reason : null };
  return { state: 'unresolved', reason: 'lookup-returned-unknown-state' };
}

function resolveWeapon(item, ctx, collector, base) {
  const lookup = lookupWeapon(item, ctx, collector);
  const trustedClass = ctx.trusted ? ctx.trusted.weaponClass : null;
  const secondary = trustedClass ? { weaponClass: trustedClass, evidenceRef: ctx.trusted.evidenceRef } : null;

  const weapon = { class: 'unverified', evidence: 'none', canonical: null, secondary };
  const ignoreTrusted = () => {
    if (trustedClass) collector.diagnostic('TRUSTED_WEAPON_CLASS_IGNORED', { weaponClass: trustedClass, evidenceRef: ctx.trusted.evidenceRef });
  };

  if (lookup.state === 'canonical') {
    weapon.canonical = { state: 'canonical', identityKey: lookup.identityKey, weaponClass: lookup.weaponClass, source: lookup.source };
    if (lookup.weaponClass === 'unknown') {
      ignoreTrusted();
      failBase(base, collector, 'WEAPON_CLASS_UNKNOWN_CANONICAL', 'base.classification.weapon');
    } else {
      weapon.class = lookup.weaponClass;
      weapon.evidence = 'canonical-lookup';
      if (trustedClass && trustedClass !== lookup.weaponClass) {
        // D15: two authorities disagree. Neither is chosen and neither is rewritten.
        collector.conflict('WEAPON_CLASS_CONTRADICTION', 'base.classification.weapon', {
          canonical: { identityKey: lookup.identityKey, weaponClass: lookup.weaponClass, source: lookup.source },
          secondary
        });
        if (!base.reasons.includes('WEAPON_CLASS_CONTRADICTION')) base.reasons.push('WEAPON_CLASS_CONTRADICTION');
      }
    }
  } else if (lookup.state === 'unresolved') {
    ignoreTrusted();
    failBase(base, collector, 'CANONICAL_IDENTITY_UNRESOLVED', 'base.classification.weapon', lookup.reason ? { reason: lookup.reason } : null);
  } else if (lookup.state === 'absent') {
    ignoreTrusted();
    failBase(base, collector, 'CANONICAL_LOOKUP_ABSENT', 'base.classification.weapon');
  } else if (trustedClass) {
    // lookup.state === 'legacy': a genuinely legacy or custom weapon may be classified by trusted input.
    weapon.class = trustedClass;
    weapon.evidence = 'trusted-input';
  } else {
    failBase(base, collector, 'WEAPON_CLASS_UNVERIFIED', 'base.classification.weapon');
  }

  base.classification.weapon = weapon;
  const contradicted = base.reasons.includes('WEAPON_CLASS_CONTRADICTION');

  if (weapon.class === 'lightsaber') {
    if (!contradicted) failBase(base, collector, 'LIGHTSABER_GENERAL_CAPACITY_UNCERTIFIED', 'base');
  } else if (weapon.class === 'ordinary' && !contradicted) {
    certifyBase(base, ctx, 'weapon:ordinary');
  }
  return weapon;
}

function sizeIncreaseRecords(item) {
  const sources = [
    ['flags.foundryvtt-swse.customization.structural.sizeIncreaseApplied', read(item, 'flags', 'foundryvtt-swse', 'customization', 'structural', 'sizeIncreaseApplied')],
    ['flags.swse.customizationStructural.sizeIncreaseApplied', read(item, 'flags', 'swse', 'customizationStructural', 'sizeIncreaseApplied')],
    ['system.sizeIncreaseApplied', read(item, 'system', 'sizeIncreaseApplied')]
  ];
  return sources.filter(([, value]) => value === true).map(([path]) => path);
}

function resolveArmor(item, ctx, collector, base, sizePaths) {
  const trusted = ctx.trusted;
  const rawArmorType = normalizeText(read(item, 'system', 'armorType'));
  const sizeRecorded = sizePaths.length > 0;

  // Stock class (contract 5.3).
  const stockClass = { value: null, status: 'unclassified', evidence: null };
  if (trusted && trusted.armorStockClass) {
    stockClass.value = trusted.armorStockClass;
    stockClass.status = 'trusted';
    stockClass.evidence = trusted.evidenceRef;
  } else if (!sizeRecorded) {
    if (rawArmorType === 'medium' || rawArmorType === 'heavy') {
      stockClass.value = rawArmorType;
      stockClass.status = 'declared-unmodified';
      stockClass.evidence = 'system.armorType';
    } else if (rawArmorType === 'light') {
      stockClass.status = 'declared-unproven';
      stockClass.evidence = 'system.armorType';
      failBase(base, collector, 'ARMOR_STOCK_CLASS_UNPROVEN', 'base.classification.armor.stockClass');
    } else {
      failBase(base, collector, 'ARMOR_CLASS_UNCERTIFIED', 'base.classification.armor.stockClass', { armorType: safeCopy(read(item, 'system', 'armorType')) });
    }
  } else {
    stockClass.status = 'unrecoverable';
    stockClass.evidence = 'system.armorType';
    failBase(base, collector, 'ARMOR_STOCK_CLASS_UNRECOVERABLE', 'base.classification.armor.stockClass', { sizeIncreaseRecordedAt: sizePaths });
  }

  // Powered status (contract 5.3, correction B).
  const rawPowered = read(item, 'system', 'isPoweredArmor');
  const rawPoweredBoolean = typeof rawPowered === 'boolean' ? rawPowered : null;
  const powered = { value: null, status: 'unknown' };
  if (trusted && trusted.powered !== null) {
    powered.value = trusted.powered;
    powered.status = 'trusted';
    if (rawPoweredBoolean !== null && rawPoweredBoolean !== trusted.powered) {
      collector.diagnostic('POWERED_RAW_DISAGREES_WITH_TRUSTED', { raw: rawPoweredBoolean, trusted: trusted.powered, evidenceRef: trusted.evidenceRef });
    }
    if (trusted.powered === true) failBase(base, collector, 'POWERED_ARMOR_PRECEDENCE_UNRESOLVED', 'base.classification.armor.powered');
  } else if (rawPoweredBoolean !== null) {
    powered.value = rawPoweredBoolean;
    powered.status = 'declared-unproven';
    failBase(
      base,
      collector,
      rawPoweredBoolean ? 'POWERED_ARMOR_PRECEDENCE_UNRESOLVED' : 'POWERED_STATUS_UNPROVEN',
      'base.classification.armor.powered'
    );
  } else {
    failBase(base, collector, 'POWERED_STATUS_UNKNOWN', 'base.classification.armor.powered');
  }

  // Consistency (D13, with the D14 provenance caution).
  const consistency = { performed: false, reason: 'NO_TRUSTED_STOCK_CLASS', expectedCurrentClasses: null };
  if (stockClass.status === 'trusted') {
    if (!sizeRecorded) {
      consistency.reason = 'NO_RECORDED_SIZE_INCREASE';
      if (ARMOR_CLASSES.includes(rawArmorType) && rawArmorType !== stockClass.value) {
        collector.diagnostic('ARMOR_CLASS_DIFFERS_FROM_TRUSTED_STOCK', { stock: stockClass.value, current: rawArmorType });
      }
    } else if (!ARMOR_CLASSES.includes(rawArmorType)) {
      consistency.reason = 'CURRENT_CLASS_UNREADABLE';
      collector.block('ARMOR_CLASS_CONSISTENCY_UNRESOLVED', 'base.classification.armor.currentClass', { current: safeCopy(read(item, 'system', 'armorType')) });
    } else {
      const expected = [...new Set([stockClass.value, NEXT_ARMOR_CLASS[stockClass.value]])].sort();
      consistency.performed = true;
      consistency.expectedCurrentClasses = expected;
      if (expected.includes(rawArmorType)) {
        consistency.reason = 'CONSISTENT';
      } else if (rawArmorType === 'light') {
        // A raw `light` may be a schema default, so it cannot independently contradict trusted stock history.
        consistency.reason = 'ARMOR_CLASS_CONSISTENCY_UNRESOLVED';
        collector.block('ARMOR_CLASS_CONSISTENCY_UNRESOLVED', 'base.classification.armor.currentClass', { stock: stockClass.value, current: rawArmorType, expected });
      } else {
        consistency.reason = 'ARMOR_CLASS_INCONSISTENT';
        collector.conflict('ARMOR_CLASS_INCONSISTENT', 'base.classification.armor.currentClass', { stock: stockClass.value, current: rawArmorType, expected });
      }
    }
  }

  base.classification.armor = {
    stockClass,
    currentClass: { value: rawArmorType, status: 'declared-evidence' },
    powered,
    consistency
  };

  if (stockClass.value && powered.status === 'trusted' && powered.value === false) {
    certifyBase(base, ctx, `armor:${stockClass.value}`);
  }
  return base.classification.armor;
}

/* ------------------------------------------------------------------------------------------------ */
/* Adjustments                                                                                      */
/* ------------------------------------------------------------------------------------------------ */

// Legacy strip flag -> canonical area, as recovered by SafetyEngine.#recoverFromLegacySources.
const LEGACY_STRIP_FLAGS = {
  damage: 'damage',
  range: 'range',
  design: 'design',
  stun: 'stun_setting',
  autofire: 'autofire',
  defensiveMaterial: 'defensive_material',
  jointProtection: 'joint_protection'
};

// Legacy structural strip evidence is never counted. It is only compared with the canonical record: any legacy
// strip that canonical state does not represent blocks certification; legacy that is fully mirrored adds nothing.
function reconcileLegacyStrips(item, canonicalRaw, validAreas, collector) {
  const canonical = new Set(Array.isArray(canonicalRaw) ? canonicalRaw.filter((entry) => typeof entry === 'string' && validAreas.includes(entry)) : []);
  const legacy = new Map(); // area -> paths
  const unreadable = [];
  const note = (area, path) => legacy.set(area, [...(legacy.get(area) ?? []), path]);

  const features = read(item, 'system', 'strippedFeatures');
  if (isObject(features)) {
    for (const key of Object.keys(features).sort()) {
      if (features[key] !== true) continue;
      note(LEGACY_STRIP_FLAGS[key] ?? `unmapped:${key}`, 'system.strippedFeatures');
    }
  } else if (features !== undefined && features !== null) {
    unreadable.push({ path: 'system.strippedFeatures', value: safeCopy(features) });
  }

  const flagAreas = read(item, 'flags', 'swse', 'customizationStructural', 'strippedAreas');
  if (Array.isArray(flagAreas)) {
    for (const entry of flagAreas) {
      if (typeof entry === 'string') note(entry, 'flags.swse.customizationStructural.strippedAreas');
      else unreadable.push({ path: 'flags.swse.customizationStructural.strippedAreas', value: safeCopy(entry) });
    }
  } else if (flagAreas !== undefined && flagAreas !== null) {
    unreadable.push({ path: 'flags.swse.customizationStructural.strippedAreas', value: safeCopy(flagAreas) });
  }

  const unrepresented = [...legacy.keys()].filter((area) => !canonical.has(area)).sort();
  if (unrepresented.length > 0 || unreadable.length > 0) {
    collector.block('LEGACY_STRUCTURAL_UNRECONCILED', 'structural.strippedAreas', {
      kind: 'strip',
      unrepresentedLegacyAreas: unrepresented,
      canonicalAreas: [...canonical].sort(),
      legacyPaths: unrepresented.map((area) => ({ area, paths: [...new Set(legacy.get(area))].sort() })),
      unreadable
    });
  }
}

function resolveAdjustments(item, domain, base, collector, sizePaths) {
  const adjustments = [];

  // Size increase: counted once, however many representations record it.
  if (sizePaths.length > 0) {
    const armorStock = domain === 'armor' ? read(base, 'classification', 'armor', 'stockClass') : null;
    const notPermitted = armorStock && armorStock.status === 'trusted' && armorStock.value === 'heavy';
    const canonicalSize = read(item, 'flags', 'foundryvtt-swse', 'customization', 'structural', 'sizeIncreaseApplied') === true;
    if (!canonicalSize) {
      // Legacy-only record: not reconciled with canonical state, so never counted and never assumed legal.
      collector.block('LEGACY_STRUCTURAL_UNRECONCILED', 'adjustments.structural:size-increase', { kind: 'size-increase', recordedAt: sizePaths });
      adjustments.push({
        id: 'structural:size-increase',
        kind: 'size-increase',
        status: 'unresolved',
        slots: null,
        provenance: { path: sizePaths.join(' | '), instanceId: null },
        source: null,
        reasons: ['LEGACY_STRUCTURAL_UNRECONCILED']
      });
    } else if (notPermitted) {
      collector.conflict('SIZE_INCREASE_NOT_PERMITTED', 'adjustments.structural:size-increase', { stockClass: 'heavy', recordedAt: sizePaths });
      adjustments.push({
        id: 'structural:size-increase',
        kind: 'size-increase',
        status: 'unresolved',
        slots: null,
        provenance: { path: sizePaths.join(' | '), instanceId: null },
        source: null,
        reasons: ['SIZE_INCREASE_NOT_PERMITTED']
      });
    } else {
      adjustments.push({
        id: 'structural:size-increase',
        kind: 'size-increase',
        status: 'verified',
        slots: 1,
        provenance: { path: sizePaths.join(' | '), instanceId: null },
        source: safeCopy(ADJUSTMENT_SOURCE),
        reasons: []
      });
    }
  }

  // Strips.
  const stripPath = 'flags.foundryvtt-swse.customization.structural.strippedAreas';
  const rawStrips = read(item, 'flags', 'foundryvtt-swse', 'customization', 'structural', 'strippedAreas');
  const validAreas = STRIP_AREAS[domain] ?? [];
  if (rawStrips !== undefined && rawStrips !== null) {
    if (!Array.isArray(rawStrips)) {
      collector.conflict('INVALID_STRIP_AREA', 'structural.strippedAreas', { reason: 'not-an-array', value: safeCopy(rawStrips) });
    } else {
      const counts = new Map();
      const invalid = new Map();
      for (const entry of rawStrips) {
        if (typeof entry === 'string' && validAreas.includes(entry)) {
          counts.set(entry, (counts.get(entry) ?? 0) + 1);
        } else {
          invalid.set(stableStringify(safeCopy(entry)), safeCopy(entry));
        }
      }
      for (const [key, value] of [...invalid.entries()].sort((a, b) => compareText(a[0], b[0]))) {
        collector.conflict('INVALID_STRIP_AREA', 'structural.strippedAreas', { area: value, validAreas: [...validAreas] });
        adjustments.push({
          id: `structural:strip:invalid:${key}`,
          kind: 'strip',
          status: 'unresolved',
          slots: null,
          provenance: { path: stripPath, instanceId: null },
          source: null,
          reasons: ['INVALID_STRIP_AREA']
        });
      }
      // D16: no host-specific feature evidence exists in Phase 1a, so a recorded strip never grants capacity.
      const distinct = [...counts.keys()].sort();
      for (const area of distinct) {
        const duplicated = counts.get(area) > 1;
        if (duplicated) collector.conflict('DUPLICATE_ADJUSTMENT', `adjustments.structural:strip:${area}`, { area, occurrences: counts.get(area) });
        const reasons = ['STRIP_HOST_EVIDENCE_UNESTABLISHED'];
        if (duplicated) reasons.push('DUPLICATE_ADJUSTMENT');
        if (distinct.length > 1) reasons.push('MULTIPLE_STRIPS_UNRESOLVED');
        adjustments.push({
          id: `structural:strip:${area}`,
          kind: 'strip',
          status: 'unresolved',
          slots: null,
          provenance: { path: stripPath, instanceId: null },
          source: null,
          reasons
        });
      }
      if (distinct.length > 0) collector.block('STRIP_HOST_EVIDENCE_UNESTABLISHED', 'structural.strippedAreas', { areas: distinct });
      if (distinct.length > 1) collector.block('MULTIPLE_STRIPS_UNRESOLVED', 'structural.strippedAreas', { areas: distinct });
    }
  }

  reconcileLegacyStrips(item, rawStrips, validAreas, collector);

  // Tech Specialist device slot: source unverified, never a certified grant and never a certified zero.
  const traits = read(item, 'flags', 'swse', 'techSpecialist', 'traits');
  if (Array.isArray(traits)) {
    let ordinal = 0;
    const found = [];
    for (const record of traits) {
      if (isObject(record) && record.traitId === TECH_DEVICE_SLOT_TRAIT_ID) found.push(record);
    }
    const ids = found.map((record) => (isNonEmptyString(record.id) ? record.id : null));
    for (let index = 0; index < found.length; index += 1) {
      ordinal += 1;
      const recordId = ids[index];
      adjustments.push({
        id: recordId ? `tech-specialist:${recordId}` : `tech-specialist:device-slot:${ordinal}`,
        kind: 'tech-specialist-device-slot',
        status: 'unverified',
        slots: null,
        provenance: { path: 'flags.swse.techSpecialist.traits', instanceId: recordId },
        source: null,
        reasons: ['TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED']
      });
    }
    if (found.length > 0) collector.block('TECH_SPECIALIST_DEVICE_SLOT_UNVERIFIED', 'adjustments.tech-specialist-device-slot', { records: found.length });
  }

  return sortBy(adjustments, (entry) => entry.id);
}

/* ------------------------------------------------------------------------------------------------ */
/* Occupied slots                                                                                   */
/* ------------------------------------------------------------------------------------------------ */

function recordedCostOf(value) {
  return isSlotInteger(value) ? value : null;
}

function collectOccupantEntries(item, collector) {
  const entries = [];

  const canonical = read(item, 'flags', 'foundryvtt-swse', 'customization', 'installedUpgrades');
  const summary = read(item, 'system', 'installedUpgrades');

  const pushObjectEntries = (list, representation, idField, costField) => {
    for (const raw of list) {
      if (isObject(raw)) {
        entries.push({
          representation,
          instanceId: isNonEmptyString(raw[idField]) ? raw[idField] : null,
          upgradeKey: isNonEmptyString(raw.upgradeKey) ? raw.upgradeKey : isNonEmptyString(raw.key) ? raw.key : null,
          recordedCost: recordedCostOf(raw[costField]),
          readable: true
        });
      } else {
        // A string, null or other value in an installed-upgrade list: its identity and cost cannot be read.
        entries.push({ representation, instanceId: null, upgradeKey: null, recordedCost: null, readable: false });
      }
    }
  };

  if (canonical !== undefined && canonical !== null) {
    if (Array.isArray(canonical)) pushObjectEntries(canonical, 'canonical', 'instanceId', 'slotCost');
    else collector.block('SLOT_COST_UNRESOLVED', 'occupied.canonical', { reason: 'installedUpgrades-not-an-array' });
  }
  if (summary !== undefined && summary !== null) {
    if (Array.isArray(summary)) pushObjectEntries(summary, 'system.installedUpgrades', 'id', 'slotsUsed');
    else collector.block('SLOT_COST_UNRESOLVED', 'occupied.system.installedUpgrades', { reason: 'installedUpgrades-not-an-array' });
  }
  for (const name of LEGACY_KEY_ARRAYS) {
    const list = read(item, 'flags', 'swse', name);
    if (list === undefined || list === null) continue;
    if (!Array.isArray(list)) {
      collector.block('SLOT_COST_UNRESOLVED', `occupied.flags.swse.${name}`, { reason: 'key-array-not-an-array' });
      continue;
    }
    for (const raw of list) {
      entries.push({
        representation: `flags.swse.${name}`,
        instanceId: null,
        upgradeKey: isNonEmptyString(raw) ? raw : null,
        recordedCost: null,
        readable: isNonEmptyString(raw)
      });
    }
  }
  return entries;
}

function lookupCertifiedDefinition(ctx, upgradeKey, collector) {
  if (!ctx.certifiedDefinitionLookup || upgradeKey === null) return null;
  let result;
  try {
    result = ctx.certifiedDefinitionLookup(upgradeKey);
  } catch (_err) {
    collector.diagnostic('TRUSTED_INPUT_INVALID', { input: 'certifiedDefinitionLookup', upgradeKey, reason: 'threw' });
    return null;
  }
  if (result === null || result === undefined) return null;
  const valid =
    isObject(result) &&
    isNonEmptyString(result.definitionId) &&
    result.upgradeKey === upgradeKey &&
    isSlotInteger(result.certifiedCost) &&
    isObject(result.source) &&
    isNonEmptyString(result.source.ref) &&
    isNonEmptyString(result.source.certification);
  if (!valid) {
    collector.diagnostic('TRUSTED_INPUT_INVALID', { input: 'certifiedDefinitionLookup', upgradeKey, reason: 'malformed-definition' });
    return null;
  }
  return { definitionId: result.definitionId, cost: result.certifiedCost, source: safeCopy(result.source) };
}

function describeOccupant(unit, ctx, collector, ambiguous) {
  const certified = lookupCertifiedDefinition(ctx, unit.upgradeKey, collector);
  const recorded = unit.recordedCosts;
  const distinctRecorded = [...new Set(recorded)].sort((a, b) => a - b);
  const recordedCost = distinctRecorded.length === 1 ? distinctRecorded[0] : null;

  let cost = null;
  let costStatus = 'unresolved';
  const reasons = [];

  if (ambiguous) {
    reasons.push(unit.ambiguityCode ?? 'AMBIGUOUS_IDENTITY');
  } else if (certified) {
    if (distinctRecorded.some((value) => value !== certified.cost)) {
      costStatus = 'conflict';
      reasons.push('COST_DISAGREES_WITH_CERTIFIED');
      collector.conflict('COST_DISAGREES_WITH_CERTIFIED', `occupied.${unit.id}`, {
        upgradeKey: unit.upgradeKey,
        recorded: distinctRecorded,
        certified: { definitionId: certified.definitionId, cost: certified.cost, source: certified.source }
      });
    } else {
      costStatus = 'certified';
      cost = certified.cost;
    }
  } else if (distinctRecorded.length > 0) {
    costStatus = 'recorded-uncertified';
    reasons.push('COST_UNCERTIFIED');
    collector.block('COST_UNCERTIFIED', `occupied.${unit.id}`, { upgradeKey: unit.upgradeKey });
  } else {
    reasons.push('SLOT_COST_UNRESOLVED');
    collector.block('SLOT_COST_UNRESOLVED', `occupied.${unit.id}`, { upgradeKey: unit.upgradeKey });
  }

  return {
    id: unit.id,
    upgradeKey: unit.upgradeKey,
    identity: unit.instanceId ? 'instance-id' : 'key-only',
    representations: sortBy(unit.representations, (rep) => `${rep.source}\u0000${rep.ref ?? ''}`),
    recordedCost,
    certified,
    cost,
    costStatus,
    reasons
  };
}

function resolveOccupied(item, ctx, collector) {
  const entries = collectOccupantEntries(item, collector);

  // Proven mirrors: entries sharing a non-empty instance id.
  const byInstance = new Map();
  const keyOnly = [];
  for (const entry of entries) {
    if (entry.instanceId) {
      if (!byInstance.has(entry.instanceId)) byInstance.set(entry.instanceId, []);
      byInstance.get(entry.instanceId).push(entry);
    } else {
      keyOnly.push(entry);
    }
  }

  const units = []; // { id, instanceId, upgradeKey, recordedCosts, representations, members }

  for (const instanceId of [...byInstance.keys()].sort()) {
    const group = byInstance.get(instanceId);
    // A mirror that carries no key (the InstallRemoveEngine summary stores a name only) does not contradict a keyed record.
    const keys = new Set(group.map((member) => member.upgradeKey).filter((key) => key !== null));
    const sameRepeat = new Set(group.map((member) => member.representation)).size !== group.length;
    if (keys.size > 1 || sameRepeat) {
      collector.conflict('DUPLICATE_INSTANCE_ID', `occupied.${instanceId}`, {
        instanceId,
        upgradeKeys: [...keys].sort(),
        representations: group.map((member) => member.representation).sort()
      });
      // Listed unmerged, one candidate per entry, with no cost attributed.
      const orderedGroup = sortBy(group, (member) => `${member.representation}\u0000${member.upgradeKey ?? ''}\u0000${member.recordedCost ?? ''}`);
      orderedGroup.forEach((member, index) => {
        units.push({
          id: `${instanceId}#${member.representation}#${index}`,
          instanceId,
          upgradeKey: member.upgradeKey,
          recordedCosts: member.recordedCost === null ? [] : [member.recordedCost],
          representations: [{ source: member.representation, ref: instanceId }],
          forceAmbiguous: true,
          ambiguityCode: 'DUPLICATE_INSTANCE_ID'
        });
      });
    } else {
      units.push({
        id: instanceId,
        instanceId,
        upgradeKey: [...keys][0] ?? null,
        recordedCosts: group.filter((member) => member.recordedCost !== null).map((member) => member.recordedCost),
        representations: group.map((member) => ({ source: member.representation, ref: instanceId })),
        forceAmbiguous: false
      });
    }
  }

  // Which representations hold each key (id-bearing and key-only), to detect unprovable mirrors.
  const keyRepresentations = new Map();
  const noteKey = (key, representation) => {
    if (key === null) return;
    if (!keyRepresentations.has(key)) keyRepresentations.set(key, []);
    keyRepresentations.get(key).push(representation);
  };
  for (const entry of entries) noteKey(entry.upgradeKey, entry.representation);

  const ambiguousKeys = new Set();
  for (const entry of keyOnly) {
    if (entry.upgradeKey === null) continue;
    const reps = keyRepresentations.get(entry.upgradeKey) ?? [];
    const distinctReps = new Set(reps);
    const repeatedInOne = distinctReps.size !== reps.length;
    // A key-only record cannot be proven to mirror any other record: appearing in a second representation, or twice in one, is ambiguous.
    // (Two id-bearing records with the same key but different ids are distinct installations and are not ambiguous by themselves.)
    const idBearingElsewhere = units.some((unit) => unit.upgradeKey === entry.upgradeKey);
    if (distinctReps.size >= 2 || repeatedInOne || idBearingElsewhere) ambiguousKeys.add(entry.upgradeKey);
  }
  for (const key of [...ambiguousKeys].sort()) {
    const candidates = entries.filter((entry) => entry.upgradeKey === key);
    collector.conflict('AMBIGUOUS_IDENTITY', `occupied.${key}`, {
      upgradeKey: key,
      representations: candidates.map((entry) => entry.representation).sort(),
      candidates: candidates.length
    });
  }

  // Id-bearing units whose key is ambiguous are listed as unmerged candidates with no attributed cost.
  for (const unit of units) {
    if (unit.upgradeKey !== null && ambiguousKeys.has(unit.upgradeKey)) unit.forceAmbiguous = true;
  }

  // Key-only units, ordered so derived ids are stable under input reordering.
  const keyOnlySorted = sortBy(keyOnly, (entry) => `${entry.upgradeKey ?? ''}\u0000${entry.representation}\u0000${entry.recordedCost ?? ''}`);
  const seenDerived = new Map();
  for (const entry of keyOnlySorted) {
    const base = `key:${entry.upgradeKey ?? 'unreadable'}@${entry.representation}`;
    const n = (seenDerived.get(base) ?? 0) + 1;
    seenDerived.set(base, n);
    units.push({
      id: n === 1 ? base : `${base}#${n}`,
      instanceId: null,
      upgradeKey: entry.upgradeKey,
      recordedCosts: entry.recordedCost === null ? [] : [entry.recordedCost],
      representations: [{ source: entry.representation, ref: entry.upgradeKey }],
      forceAmbiguous: entry.upgradeKey !== null && ambiguousKeys.has(entry.upgradeKey),
      unreadable: !entry.readable
    });
  }

  for (const entry of entries) {
    if (entry.representation === 'canonical' && entry.readable && !entry.instanceId) {
      collector.diagnostic('INSTANCE_ID_MISSING', { upgradeKey: entry.upgradeKey, representation: entry.representation });
    }
  }

  const occupied = units.map((unit) => describeOccupant(unit, ctx, collector, unit.forceAmbiguous === true));
  return sortBy(occupied, (entry) => `${entry.id}\u0000${stableStringify(entry.representations)}`);
}

/* ------------------------------------------------------------------------------------------------ */
/* Legacy evidence and comparison                                                                   */
/* ------------------------------------------------------------------------------------------------ */

function legacyEvidence(item) {
  const evidence = [];
  const stored = read(item, 'system', 'upgradeSlots');
  if (stored !== undefined) {
    evidence.push({ field: 'system.upgradeSlots', value: safeCopy(stored), classification: 'unknown', usedInTotals: false });
  }
  const override = read(item, 'flags', 'foundryvtt-swse', 'customization', 'overrides', 'stockSlotOverride');
  if (override !== undefined && override !== null) {
    evidence.push({
      field: 'flags.foundryvtt-swse.customization.overrides.stockSlotOverride',
      value: safeCopy(override),
      classification: 'legacy-evidence',
      usedInTotals: false
    });
  }
  const stripped = read(item, 'system', 'strippedFeatures');
  if (isObject(stripped) && Object.values(stripped).some((value) => value === true)) {
    evidence.push({ field: 'system.strippedFeatures', value: safeCopy(stripped), classification: 'legacy-evidence', usedInTotals: false });
  }
  const structural = read(item, 'flags', 'swse', 'customizationStructural');
  if (isObject(structural) && ((Array.isArray(structural.strippedAreas) && structural.strippedAreas.length > 0) || (structural.strippedAreas != null && !Array.isArray(structural.strippedAreas)) || structural.sizeIncreaseApplied === true)) {
    evidence.push({ field: 'flags.swse.customizationStructural', value: safeCopy(structural), classification: 'legacy-evidence', usedInTotals: false });
  }
  return evidence;
}

/* ------------------------------------------------------------------------------------------------ */
/* Assembly                                                                                         */
/* ------------------------------------------------------------------------------------------------ */

function emptyPools() {
  return {
    general: { status: 'unresolved', reasons: [] },
    lightsaber: {
      applicable: false,
      chassisCapacityEvidence: { value: null, status: 'evidence-only' },
      crystal: { status: 'not-applicable', reasons: [] },
      constructionAccessory: { status: 'not-applicable', reasons: [] }
    }
  };
}

function nullTotals(status, adjustments, occupied) {
  return {
    status,
    total: null,
    used: null,
    free: null,
    overflow: null,
    unverifiedAdjustmentCount: adjustments.filter((entry) => entry.status !== 'verified').length,
    uncertifiedOccupiedCount: occupied.filter((entry) => entry.costStatus !== 'certified').length
  };
}

function unsupportedState(itemRef, collector) {
  collector.diagnostic('UNSUPPORTED_DOMAIN', { type: itemRef.type });
  const sorted = collector.sorted();
  return {
    contractVersion: CONTRACT_VERSION,
    domain: null,
    item: itemRef,
    status: 'unsupported',
    base: emptyBase(),
    adjustments: [],
    occupied: [],
    pools: emptyPools(),
    totals: nullTotals('unresolved', [], []),
    legacy: {
      evidence: [],
      valueOrigin: 'unknown',
      comparison: { performed: false, basis: null, reason: 'LEGACY_VALUE_ABSENT', explainedBy: null }
    },
    conflicts: sorted.conflicts,
    unresolved: sorted.unresolved,
    diagnostics: sorted.diagnostics
  };
}

function compareLegacy(item, ctx, domain, base, adjustments, collector, certifiedBeforeLegacy, conflictsBeforeLegacy) {
  const origin = ctx.trusted && ctx.trusted.legacySlotValueOrigin ? ctx.trusted.legacySlotValueOrigin : 'unknown';
  const stored = read(item, 'system', 'upgradeSlots');
  const storedUsable = isSlotInteger(stored);
  const comparison = { performed: false, basis: null, reason: null, explainedBy: null };
  const isLightsaber = domain === 'weapon' && read(base, 'classification', 'weapon', 'class') === 'lightsaber';
  const verifiedSum = adjustments.reduce((sum, entry) => sum + (entry.status === 'verified' ? entry.slots : 0), 0);
  const allVerified = adjustments.every((entry) => entry.status === 'verified');

  if (origin === 'unknown') {
    comparison.reason = 'LEGACY_VALUE_ORIGIN_UNKNOWN';
    if (storedUsable && certifiedBeforeLegacy) {
      const total = base.value + verifiedSum;
      collector.diagnostic('LEGACY_VALUE_PROVENANCE_UNKNOWN', {
        stored,
        stockBaseline: base.value,
        computedTotal: total,
        differsFromStock: stored !== base.value,
        differsFromTotal: stored !== total
      });
    }
    return { origin, comparison };
  }
  if (!storedUsable) {
    comparison.reason = 'LEGACY_VALUE_ABSENT';
    return { origin, comparison };
  }
  if (base.status !== 'certified') {
    comparison.reason = 'BASELINE_NOT_CERTIFIED';
    return { origin, comparison };
  }
  if (isLightsaber) {
    comparison.reason = 'LIGHTSABER_POOL_UNRESOLVED';
    return { origin, comparison };
  }

  if (origin === 'authored-stock') {
    comparison.performed = true;
    comparison.basis = 'stock-baseline';
    if (stored === base.value) {
      comparison.explainedBy = 'stock-baseline';
    } else {
      // An authored stock value that differs from the baseline may be an item-specific exception; no exception rule is certified.
      collector.block('STOCK_EXCEPTION_UNCERTIFIED', 'legacy.system.upgradeSlots', { stored, stockBaseline: base.value });
    }
    return { origin, comparison };
  }

  // origin === 'calculated-total'
  if (!allVerified || conflictsBeforeLegacy) {
    comparison.reason = 'ADJUSTMENT_HISTORY_INCOMPLETE';
    return { origin, comparison };
  }
  comparison.performed = true;
  comparison.basis = 'baseline-plus-adjustments';
  const expected = base.value + verifiedSum;
  if (stored === expected) comparison.explainedBy = 'baseline-plus-adjustments';
  else collector.conflict('LEGACY_VALUE_MISMATCH', 'legacy.system.upgradeSlots', { stored, expected, stockBaseline: base.value, adjustments: verifiedSum });
  return { origin, comparison };
}

function buildState(item, rawContext) {
  const collector = createCollector();
  const ctx = normalizeContext(rawContext, collector);

  const type = read(item, 'type');
  const id = read(item, 'id');
  const itemRef = { id: isNonEmptyString(id) ? id : null, type: isNonEmptyString(type) ? type : null };
  if (!isObject(item) && typeof item !== 'function') return unsupportedState(itemRef, collector);
  const domain = DOMAINS.includes(itemRef.type) ? itemRef.type : null;
  if (domain === null) return unsupportedState(itemRef, collector);

  const base = emptyBase();
  const pools = emptyPools();
  const sizePaths = sizeIncreaseRecords(item);

  if (domain === 'weapon') {
    const weapon = resolveWeapon(item, ctx, collector, base);
    if (weapon.class === 'lightsaber') {
      const stored = read(item, 'system', 'upgradeSlots');
      pools.lightsaber.applicable = true;
      pools.lightsaber.chassisCapacityEvidence = { value: isSlotInteger(stored) ? stored : null, status: 'evidence-only' };
      pools.lightsaber.crystal = { status: 'unresolved', reasons: ['LIGHTSABER_POOL_UNCERTIFIED'] };
      pools.lightsaber.constructionAccessory = { status: 'unresolved', reasons: ['LIGHTSABER_POOL_UNCERTIFIED'] };
      collector.block('LIGHTSABER_POOL_UNCERTIFIED', 'pools.lightsaber');
    }
  } else if (domain === 'armor') {
    resolveArmor(item, ctx, collector, base, sizePaths);
  } else {
    certifyBase(base, ctx, 'equipment');
  }

  pools.general = { status: base.status === 'certified' ? 'certified' : 'unresolved', reasons: [...base.reasons] };

  const adjustments = resolveAdjustments(item, domain, base, collector, sizePaths);
  const occupied = resolveOccupied(item, ctx, collector);
  const evidence = legacyEvidence(item);

  // Certification state before the legacy comparison, so the comparison is gated on a meaningful history.
  const conflictsBeforeLegacy = collector.conflicts.length > 0;
  const certifiedBeforeLegacy =
    base.status === 'certified' &&
    adjustments.every((entry) => entry.status === 'verified') &&
    !conflictsBeforeLegacy &&
    !collector.unresolved.some((entry) => entry.blocksCertification) &&
    occupied.every((entry) => entry.costStatus === 'certified') &&
    !pools.lightsaber.applicable;
  const legacyResult = compareLegacy(item, ctx, domain, base, adjustments, collector, certifiedBeforeLegacy, conflictsBeforeLegacy);

  const hasConflicts = collector.conflicts.length > 0;
  const hasBlockingUnresolved = collector.unresolved.some((entry) => entry.blocksCertification);
  const adjustmentsVerified = adjustments.every((entry) => entry.status === 'verified');
  const occupantsCertified = occupied.every((entry) => entry.costStatus === 'certified');
  const poolsClear = pools.general.status === 'certified' && (!pools.lightsaber.applicable);
  const certified =
    base.status === 'certified' && adjustmentsVerified && !hasConflicts && !hasBlockingUnresolved && occupantsCertified && poolsClear;

  let totals;
  if (certified) {
    const total = base.value + adjustments.reduce((sum, entry) => sum + entry.slots, 0);
    const used = occupied.reduce((sum, entry) => sum + entry.cost, 0);
    totals = {
      status: 'certified',
      total,
      used,
      free: total - used,
      overflow: total - used < 0,
      unverifiedAdjustmentCount: 0,
      uncertifiedOccupiedCount: 0
    };
  } else {
    totals = nullTotals(hasConflicts ? 'conflicted' : 'unresolved', adjustments, occupied);
  }

  let status;
  if (totals.status === 'certified') status = 'resolved';
  else if (totals.status === 'conflicted') status = 'conflicted';
  else if (base.status === 'certified') status = 'partial';
  else status = 'unresolved';

  const sorted = collector.sorted();
  return {
    contractVersion: CONTRACT_VERSION,
    domain,
    item: itemRef,
    status,
    base: {
      status: base.status,
      value: base.value,
      basis: base.basis,
      source: base.source,
      classification: base.classification,
      reasons: [...base.reasons].sort()
    },
    adjustments,
    occupied,
    pools,
    totals,
    legacy: {
      evidence,
      valueOrigin: legacyResult.origin,
      comparison: legacyResult.comparison
    },
    conflicts: sorted.conflicts,
    unresolved: sorted.unresolved,
    diagnostics: sorted.diagnostics
  };
}

/**
 * Resolve the upgrade-slot state of one Item. Read-only and deterministic; never throws.
 * @param {object} item  Item snapshot (`type`, `id`, `system`, `flags`).
 * @param {object} [context]  Injected, optional: canonicalWeaponLookup, trustedClassification, certifiedDefinitionLookup, baselineTable.
 * @returns {object} SlotState (contract section 4).
 */
export function resolveSlotState(item, context) {
  try {
    return buildState(item, context);
  } catch (_err) {
    // Safety net: an internal fault is reported as an unresolved state, never as a number.
    return {
      contractVersion: CONTRACT_VERSION,
      domain: null,
      item: { id: null, type: null },
      status: 'unresolved',
      base: emptyBase(),
      adjustments: [],
      occupied: [],
      pools: emptyPools(),
      totals: nullTotals('unresolved', [], []),
      legacy: {
        evidence: [],
        valueOrigin: 'unknown',
        comparison: { performed: false, basis: null, reason: 'LEGACY_VALUE_ABSENT', explainedBy: null }
      },
      conflicts: [],
      unresolved: [{ code: 'RESOLVER_INTERNAL_ERROR', subject: 'resolver', blocksCertification: true }],
      diagnostics: []
    };
  }
}
