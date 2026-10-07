// Phase 5B-6 -- pure, profile-specific proficiency resolution for canonical weapons.
// Reads frozen authority (profile schemaFamily, Phase 4H proficiency/species/ability routes) plus the actor's entitlements.
// Does NOT read weapon names/text, does NOT read system.proficient, does NOT cache anything actor-dependent, and does
// NOT replace actorIsProficientForAttack (consumer migration is a later phase).
// Future integrations (Implant / Spacehound) are explicit inputs: context.proficiencyIntegrations.
import { WeaponRuntimeError, ERROR_CODES } from './errors.js';

const norm = (v) => String(v ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');

const GROUPS = new Map([
  ['simple', 'simple'], ['simpleweapons', 'simple'], ['simpleweapon', 'simple'],
  ['pistols', 'pistols'], ['pistol', 'pistols'],
  ['rifles', 'rifles'], ['rifle', 'rifles'],
  ['heavyweapons', 'heavy-weapons'], ['heavyweapon', 'heavy-weapons'], ['heavy', 'heavy-weapons'],
  ['advancedmelee', 'advanced-melee'], ['advancedmeleeweapons', 'advanced-melee'], ['advancedmeleeweapon', 'advanced-melee'],
  ['lightsabers', 'lightsabers'], ['lightsaber', 'lightsabers'],
  ['exotic', 'exotic'],
]);
export function normalizeGroup(value) {
  const k = norm(String(value ?? '').replace(/^weapon-proficiency:/, ''));
  return GROUPS.get(k) ?? null;
}
const MELEE_GROUPS = new Set(['advanced-melee', 'lightsabers']);
const RANGED_GROUPS = new Set(['pistols', 'rifles', 'heavy-weapons']);
function groupFitsBranch(group, branch) {
  if (MELEE_GROUPS.has(group)) return branch === 'melee';
  if (RANGED_GROUPS.has(group)) return branch === 'ranged';
  return true;
}

const asArray = (v) => (Array.isArray(v) ? v : v instanceof Set ? [...v] : v == null ? [] : [v]);

/** Actor-side entitlement snapshot. Computed per call (never cached: planner ruling B). */
export function extractActorEntitlements(actor) {
  const groups = new Set(), exotic = new Set(), abilities = new Set();
  const addGroup = (v) => { const g = normalizeGroup(v); if (g) groups.add(g); };
  try {
    const sys = actor?.system ?? {};
    const structured = sys.proficiencies?.weapon;
    if (structured && typeof structured === 'object' && !Array.isArray(structured) && !(structured instanceof Set)) {
      for (const [k, v] of Object.entries(structured)) if (v === true) addGroup(k);
    } else asArray(structured).forEach(addGroup);
    const legacy = sys.weaponProficiencies ?? sys.proficiencies?.weapons;
    if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
      for (const [k, v] of Object.entries(legacy)) if (v === true) addGroup(k);
    } else asArray(legacy).forEach(addGroup);
    asArray(actor?._unlockGrants?.proficiencies?.weapon).forEach(addGroup);
    for (const item of actor?.items ?? []) {
      const name = String(item?.name ?? '');
      if (item?.type === 'feat' || item?.type === 'talent') abilities.add(norm(name));
      if (item?.type !== 'feat') continue;
      let m = /^Exotic Weapon Proficiency\s*\((.+)\)\s*$/i.exec(name);
      if (m) { exotic.add(norm(m[1])); continue; }
      m = /^Weapon Proficiency\s*\((.+)\)\s*$/i.exec(name);
      if (m) addGroup(m[1]);
      if (norm(name) === 'advancedmeleeweaponproficiency') groups.add('advanced-melee');
      if (norm(name) === 'lightsaberproficiency') groups.add('lightsabers');
    }
  } catch (_e) { /* partial snapshot is returned */ }
  const sp = actor?.system?.species;
  const species = norm(typeof sp === 'string' ? sp : (sp?.name ?? actor?.system?.race ?? actor?.items?.find?.((i) => i.type === 'species')?.name ?? ''));
  return { groups, exotic, abilities, species };
}

function exoticIdentityFor(resolved, profile) {
  const direct = profile?.exoticWeaponIdentity ?? null;
  if (direct) return direct;
  for (const n of resolved?.proficiency?.normal ?? []) {
    const m = n.type === 'feat' ? /^Exotic Weapon Proficiency\s*\(([^)]+)\)/i.exec(n.requirement ?? '') : null;
    if (m) return m[1].trim();
  }
  return null;
}

export function resolveProficiency(resolved, profile, actor, context = {}) {
  if (!resolved || resolved.source !== 'canonical') throw new WeaponRuntimeError(ERROR_CODES.CANONICAL_ENTRY_MISSING, 'resolveProficiency requires a canonical ResolvedWeapon');
  if (!profile) throw new WeaponRuntimeError(ERROR_CODES.UNKNOWN_PROFILE, 'resolveProficiency requires a resolved profile');
  const ent = context.entitlements ?? extractActorEntitlements(actor);
  const requiredGroup = normalizeGroup(profile.proficiencyGroup);
  const considered = [];
  const diagnostics = [];
  const result = (proficient, route, extra = {}) => Object.freeze({
    proficient, penalty: proficient ? 0 : -5, route, profileId: profile.id, requiredGroup,
    exoticIdentity: requiredGroup === 'exotic' ? exoticIdentityFor(resolved, profile) : null,
    consideredRoutes: Object.freeze(considered), diagnostics: Object.freeze(diagnostics), ...extra,
  });

  // explicit future integrations (inputs only)
  const integ = context.proficiencyIntegrations ?? {};
  if (integ.ignoresProficiencyPenalty) { considered.push({ kind: 'integration:implant', applicable: true }); return result(true, { kind: 'integration:implant' }); }
  if (integ.spacehoundVehicleWeapon) { considered.push({ kind: 'integration:spacehound', applicable: true }); return result(true, { kind: 'integration:spacehound' }); }

  // normal route
  let normalHeld = false;
  if (requiredGroup === 'exotic') {
    const identity = exoticIdentityFor(resolved, profile);
    if (!identity) {
      diagnostics.push({ code: ERROR_CODES.EXOTIC_IDENTITY_UNRESOLVED, profileId: profile.id });
      throw new WeaponRuntimeError(ERROR_CODES.EXOTIC_IDENTITY_UNRESOLVED, `exotic identity unresolved for ${resolved.identity.identityKey}/${profile.id}`, { identityKey: resolved.identity.identityKey, profileId: profile.id });
    }
    normalHeld = ent.exotic.has(norm(identity));
    considered.push({ kind: 'normal-exotic-feat', requires: `Exotic Weapon Proficiency (${identity})`, applicable: true, held: normalHeld });
  } else if (requiredGroup) {
    normalHeld = ent.groups.has(requiredGroup);
    considered.push({ kind: 'normal-group', requires: requiredGroup, applicable: true, held: normalHeld });
  } else {
    diagnostics.push({ code: 'profile-proficiency-group-unrecognized', value: profile.proficiencyGroup ?? null });
  }
  if (normalHeld) return result(true, { kind: requiredGroup === 'exotic' ? 'normal-exotic-feat' : 'normal-group' });

  // species routes (profile-specific by branch fit)
  for (const o of resolved.proficiency?.speciesOverrides ?? []) {
    const via = normalizeGroup(o.requiresProficiency) ?? normalizeGroup(o.treatAsGroup);
    const speciesMatch = norm(o.species) === ent.species && ent.species !== '';
    const fits = via ? groupFitsBranch(via, profile.branch) : false;
    const held = !!via && ent.groups.has(via);
    considered.push({ kind: 'species-override', species: o.species, via, applicable: speciesMatch && fits, speciesMatch, branchFit: fits, held });
    if (speciesMatch && fits && held) return result(true, { kind: 'species-override', species: o.species, treatAsGroup: via, authority: o.authority ?? null });
  }
  // ability routes
  for (const o of resolved.proficiency?.abilityOverrides ?? []) {
    const via = normalizeGroup(o.treatAsGroup);
    const has = ent.abilities.has(norm(o.ability));
    const fits = via ? groupFitsBranch(via, profile.branch) : false;
    const held = !!via && ent.groups.has(via);
    considered.push({ kind: 'ability-override', ability: o.ability, via, applicable: has && fits, abilityHeld: has, branchFit: fits, held });
    if (has && fits && held) return result(true, { kind: 'ability-override', ability: o.ability, treatAsGroup: via, attackBonus: o.attackBonus ?? 0 });
  }
  // condition-only alternate routes are never auto-applied
  for (const r of resolved.proficiency?.alternateRoutesPhase3B ?? []) {
    if (!r.species) diagnostics.push({ code: 'conditional-route-not-auto-applied', condition: r.condition ?? null, classifications: r.classifications ?? null });
  }
  return result(false, null);
}
