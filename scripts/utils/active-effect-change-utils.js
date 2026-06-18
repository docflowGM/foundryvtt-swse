// scripts/utils/active-effect-change-utils.js
/**
 * Runtime-safe Active Effect change helpers for Foundry v13/v14+.
 *
 * Foundry v14 changed ActiveEffect change records from numeric `mode` values
 * to string `type` values. Accessing the old numeric-mode constant in v14
 * emits a compatibility warning, so this module intentionally avoids it.
 */

const LEGACY_MODE_BY_TYPE = Object.freeze({
  custom: 0,
  multiply: 1,
  add: 2,
  downgrade: 3,
  upgrade: 4,
  override: 5,
  subtract: 2
});

const TYPE_BY_LEGACY_MODE = Object.freeze({
  0: 'custom',
  1: 'multiply',
  2: 'add',
  3: 'downgrade',
  4: 'upgrade',
  5: 'override'
});

function normalizeType(value, fallback = 'custom') {
  const key = String(value ?? fallback).trim().toLowerCase().replace(/[_\s-]+/g, '');
  const aliases = {
    custom: 'custom',
    multiply: 'multiply',
    mul: 'multiply',
    add: 'add',
    plus: 'add',
    subtract: 'subtract',
    sub: 'subtract',
    downgrade: 'downgrade',
    down: 'downgrade',
    upgrade: 'upgrade',
    up: 'upgrade',
    override: 'override',
    ov: 'override'
  };
  return aliases[key] || fallback;
}

export function activeEffectUsesStringTypes() {
  const rawGeneration = globalThis.game?.release?.generation ?? globalThis.game?.release?.generationAsNumber;
  const generation = Number(rawGeneration);
  if (Number.isFinite(generation) && generation >= 14) return true;
  if (rawGeneration == null && globalThis.CONST?.ACTIVE_EFFECT_CHANGE_TYPES) return true;
  return false;
}

export function activeEffectChangeType(type = 'custom') {
  const normalized = normalizeType(type);
  if (activeEffectUsesStringTypes()) {
    const changeTypes = globalThis.CONST?.ACTIVE_EFFECT_CHANGE_TYPES ?? {};
    return {
      type: changeTypes[normalized] ?? changeTypes[normalized.toUpperCase()] ?? normalized
    };
  }
  return {
    mode: LEGACY_MODE_BY_TYPE[normalized] ?? LEGACY_MODE_BY_TYPE.custom
  };
}

export function normalizeActiveEffectChangeForRuntime(change = {}) {
  if (!change || typeof change !== 'object') return change;
  const out = { ...change };

  if (activeEffectUsesStringTypes()) {
    const explicitType = out.type ?? TYPE_BY_LEGACY_MODE[Number(out.mode)];
    const normalized = normalizeType(explicitType, 'custom');
    delete out.mode;
    return { ...out, ...activeEffectChangeType(normalized) };
  }

  const explicitMode = Number(out.mode);
  const normalized = normalizeType(out.type ?? TYPE_BY_LEGACY_MODE[explicitMode], 'custom');
  delete out.type;
  return { ...out, ...activeEffectChangeType(normalized) };
}

export function normalizeActiveEffectDataForRuntime(effectData = []) {
  return effectData.map((effect) => {
    if (!effect || typeof effect !== 'object') return effect;
    const changes = Array.isArray(effect.changes)
      ? effect.changes.map((change) => normalizeActiveEffectChangeForRuntime(change))
      : effect.changes;
    return { ...effect, ...(changes !== undefined ? { changes } : {}) };
  });
}
