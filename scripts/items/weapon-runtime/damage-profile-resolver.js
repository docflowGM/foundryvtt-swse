// Phase 5B-7 -- structured damage profile. Preserves every damage-bearing structure of the selected profile/payload
// (base, fixed, stun, ion-qualifiers, conditional, critical, triggered, payload, profile-owned damageComponents).
// Never stringifies objects; semantic tags never become mechanics.
// Damage-type rule (planner E): AND = ONE component carrying all simultaneous types; OR = one selected type before
// application; single = one component/one type; a separate rider exists only when canonically a separate damage event.
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';

const STUN_CAPABLE = new Set(['setting', 'native-stun', 'optional-per-attack', 'ammunition-dependent']);

function typeComponent(id, kind, damage, damageType, extra = {}) {
  const types = [...(damageType?.types ?? [])];
  const mode = damageType?.mode ?? 'none';
  const comp = { id, kind, damage, damageTypeMode: mode, damageTypes: types, qualifiers: [...(damageType?.qualifiers ?? [])], ...extra };
  if (mode === 'or') {
    const wanted = extra.requestedType ?? null;
    comp.selectedDamageType = wanted && types.includes(wanted) ? wanted : null;
    comp.requiresDamageTypeSelection = comp.selectedDamageType === null;
  } else if (mode === 'single') comp.selectedDamageType = types[0] ?? null;
  delete comp.requestedType;
  return comp;
}

export function resolveDamageProfile(resolved, profile, context = {}) {
  const def = profile.definition;
  const damageMode = context.damageMode ?? resolved.selection?.damageMode ?? 'normal';
  const diagnostics = [];
  const payload = resolved.selection?.payloadId ? resolved.payloads.find((p) => p.id === resolved.selection.payloadId) : null;
  const stun = def.stun ?? { capability: 'none' };
  if (damageMode !== 'normal' && damageMode !== 'stun') throw new WeaponRuntimeError(ERROR_CODES.UNSUPPORTED_DAMAGE_MODE, `unsupported damageMode ${damageMode}`, { damageMode });
  if (damageMode === 'stun' && !STUN_CAPABLE.has(stun.capability)) {
    throw new WeaponRuntimeError(ERROR_CODES.UNSUPPORTED_DAMAGE_MODE, `profile ${profile.id} has no stun capability`, { profileId: profile.id, capability: stun.capability });
  }
  const components = [];
  const requestedType = context.damageType ?? null;
  const baseVaries = def.damage?.mode === 'varies-by-payload' || def.damage?.mode === 'ammunition' || def.damage?.mode === 'inherited';
  if (baseVaries && payload?.damage) {
    components.push(typeComponent('payload', 'payload', payload.damage, payload.damageType ?? def.damageType, { payloadId: payload.id, requestedType }));
  } else if (baseVaries) {
    components.push(typeComponent('base', 'base', def.damage, def.damageType, { requiresPayload: def.damage.mode === 'varies-by-payload', requestedType }));
    diagnostics.push({ code: 'damage-depends-on-selection', damageMode: def.damage.mode });
  } else if (damageMode === 'stun' && stun.damageMode === 'explicit' && stun.damage) {
    components.push(typeComponent('stun', 'stun', stun.damage, { ...def.damageType, qualifiers: [...(def.damageType?.qualifiers ?? []), 'stun'] }, { requestedType }));
  } else {
    const dt = damageMode === 'stun' ? { ...def.damageType, qualifiers: [...(def.damageType?.qualifiers ?? []), 'stun'] } : def.damageType;
    components.push(typeComponent('base', 'base', def.damage, dt, { requestedType }));
  }
  // profile-owned separate damage events (e.g. rider) -- preserved, never merged into base
  for (const c of def.damageComponents ?? []) {
    if (c.resolution === 'stun' && damageMode !== 'stun') continue;
    // Phase 5D-E: the explicit stun definition above IS this component (same dice); pushing it again would roll stun twice
    if (c.resolution === 'stun' && damageMode === 'stun' && stun.damageMode === 'explicit' && stun.damage) continue;
    if (c.resolution === 'normal' && damageMode === 'stun' && c.id === 'stun') continue;
    components.push(typeComponent(c.id, 'profile-component', c.damage, c.damageType, { resolution: c.resolution ?? 'normal' }));
  }
  return Object.freeze({
    profileId: profile.id,
    damageMode,
    payloadId: payload?.id ?? null,
    components: Object.freeze(components.map((c) => Object.freeze(c))),
    stun: stun,
    conditionalModifiers: def.conditionalModifiers ?? [],
    criticalEffects: def.criticalEffects ?? [],
    triggeredEffects: def.triggeredEffects ?? [],
    damageMultiplier: payload?.damageMultiplier ?? def.damageMultiplier ?? 1,
    damageReductionInteraction: resolved.damageReductionInteraction ?? null,
    specialEffects: payload?.specialEffects ?? [],
    area: payload?.area ?? def.area ?? null,
    diagnostics: Object.freeze(diagnostics),
  });
}
