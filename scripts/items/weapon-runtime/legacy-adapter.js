// Phase 5B-10 -- legacy compatibility adapter. The ONLY place name/text/field heuristics may live.
// Used solely for weapons with NO canonical identity (world/custom/unmapped items). Never invoked for a resolvable
// canonical weapon. Output is tagged source:'legacy' with the heuristics it relied on, so consumers can see the difference.
import { getWeaponBranch } from '../weapon-branch-resolver.js';

export function adaptLegacyWeapon(item, _context = {}) {
  const sys = item?.system ?? {};
  const heuristics = [];
  const branch = getWeaponBranch(item); heuristics.push('weapon-branch-resolver.getWeaponBranch');
  const group = sys.proficiency ?? sys.subcategory ?? null; heuristics.push('system.proficiency/subcategory field read');
  const profile = Object.freeze({
    id: 'legacy-primary', label: item?.name ?? 'Weapon', kind: 'attack', branch,
    subcategory: sys.subcategory ?? null, proficiencyGroup: group, exoticWeaponIdentity: null,
    executable: true, matchedModes: [], reconciliation: 'legacy', definition: null,
    legacy: Object.freeze({ damage: sys.damage ?? null, damageType: sys.damageType ?? null, range: sys.range ?? null, attackAttribute: sys.attackAttribute ?? null }),
  });
  return Object.freeze({
    source: 'legacy',
    identity: null,
    profiles: Object.freeze([profile]),
    defaultProfileId: profile.id,
    payloads: Object.freeze([]),
    configurationStates: Object.freeze([]),
    selectors: null,
    semanticTags: Object.freeze([]),
    abilityInteractions: Object.freeze([]),
    ownedState: Object.freeze({ equipped: sys.equipped ?? null, ammo: Object.freeze({ type: sys.ammunition?.type ?? null, current: sys.ammunition?.current ?? null, max: sys.ammunition?.max ?? null }) }),
    selection: Object.freeze({ profileId: profile.id, payloadId: null, configurationId: null, damageMode: 'normal' }),
    diagnostics: Object.freeze({ heuristics: Object.freeze(heuristics) }),
    heuristics: Object.freeze(heuristics),
  });
}
