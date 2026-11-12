/**
 * House-rule feat/talent grants - the single canonical table and rule-key list.
 *
 * Before this module the same setting -> feat/talent mapping existed three times (houserule-feat-grants.js,
 * feat-housekeeping-runtime-patches.js, prerequisite-checker.js). Granting services, the ability patches and
 * reconciliation now read THIS table; it is data plus thin reads through the canonical readers
 * (FeatRulesAdapter / HouseRuleService) and owns no rules and no mutation.
 *
 * Distinctions preserved:
 *   - a setting that grants a SPECIFIC feat/talent ("automatic grant") is NOT a free feat selection and never
 *     consumes an ordinary progression slot;
 *   - `talentEveryLevelExtraL1` is a house-rule CHOICE entitlement (one additional talent selection), tracked
 *     as its own entitlement by reconciliation.
 */
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { FeatRulesAdapter } from '/systems/foundryvtt-swse/scripts/houserules/adapters/FeatRulesAdapter.js';

/** setting -> the specific item it grants automatically */
export const HOUSE_RULE_GRANTS = Object.freeze([
  { setting: 'armoredDefenseForAll', type: 'talent', name: 'Armored Defense', id: '4c236343b01ea763' },
  { setting: 'weaponFinesseDefault', type: 'feat', name: 'Weapon Finesse', id: '252b67d6e31c377e' },
  { setting: 'pointBlankShotDefault', type: 'feat', name: 'Point-Blank Shot', id: '05459ac4d439f229' },
  { setting: 'powerAttackDefault', type: 'feat', name: 'Power Attack', id: '3f76464c43c73f84' },
  { setting: 'preciseShotDefault', type: 'feat', name: 'Precise Shot', id: 'c180eee7d3bc29b2' },
  { setting: 'dodgeDefault', type: 'feat', name: 'Dodge', id: '45366d4f3a5e443d' },
]);

/**
 * EVERY setting that changes feat/talent quantities, availability, entitlement sources or automatic awards.
 * The reconciliation memo key is derived from this one list (not from scattered per-feature lists).
 *  entitlement : changes how many selections / which grants exist
 *  eligibility : changes what may be chosen (no quantity change)
 *  unwired     : registered and listed as 'wired' in the manifest but with NO consumer in engine code (audited)
 */
export const FEAT_TALENT_RULE_KEYS = Object.freeze([
  ...HOUSE_RULE_GRANTS.map(g => g.setting),
  'talentEveryLevel', 'talentEveryLevelExtraL1',
  'multiclassExtraStartingFeats', 'multiclassEnhancedEnabled',
  'talentDoubleLevels', 'multiclassBonusChoice',
  'talentTreeRestriction', 'classTreeOverrides', 'enableDarkSideTreeAccess', 'forceSensitiveJediOnly',
  'blockDeflectTalents', 'groupDeflectBlock', 'retrainingEnabled', 'allowHumanFollowerNormalBonus',
]);

export function isFeatTalentRuleKey(key) {
  return FEAT_TALENT_RULE_KEYS.includes(String(key || '').split('.').pop());
}

/** One canonical effective-settings signature for feat/talent rules (used as the reconciliation cache dimension). */
export function getFeatTalentRulesSignature() {
  const out = {};
  for (const key of FEAT_TALENT_RULE_KEYS) {
    try { out[key] = HouseRuleService.getSafe(key, null); } catch (_err) { out[key] = null; }
  }
  return JSON.stringify(out);
}

export function isGrantEnabled(setting) {
  try {
    switch (setting) {
      case 'weaponFinesseDefault': return FeatRulesAdapter.weaponFinesseDefaultEnabled();
      case 'pointBlankShotDefault': return FeatRulesAdapter.pointBlankShotDefaultEnabled();
      case 'powerAttackDefault': return FeatRulesAdapter.powerAttackDefaultEnabled();
      case 'preciseShotDefault': return FeatRulesAdapter.preciseShotDefaultEnabled();
      case 'dodgeDefault': return FeatRulesAdapter.dodgeDefaultEnabled();
      default: return HouseRuleService.getBoolean(setting, false);
    }
  } catch (_err) {
    return false;
  }
}

export function normalizeGrantName(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '');
}

export function enabledGrants() {
  return HOUSE_RULE_GRANTS.filter(g => isGrantEnabled(g.setting));
}

export function grantForSetting(setting) {
  return HOUSE_RULE_GRANTS.find(g => g.setting === setting) || null;
}

/** Grant whose canonical identity (compendium id or name) this item has, regardless of whether the rule is currently on. */
export function grantForItem(item) {
  if (!item) return null;
  const nameKey = normalizeGrantName(item.name);
  const ids = [item.flags?.core?.sourceId, item.flags?.swse?.canonicalGrantId, item.system?.canonicalGrantId, item.flags?.['foundryvtt-swse']?.canonicalGrantId]
    .filter(Boolean).map(String);
  return HOUSE_RULE_GRANTS.find(g => g.type === item.type && (normalizeGrantName(g.name) === nameKey || ids.some(id => id.includes(g.id)))) || null;
}

/**
 * Explicit house-rule provenance written by a granting service (any of the markers current code writes):
 * `system.houseRuleGranted`, `flags.swse.houseRuleGranted`, or `system.acquisition.source === 'house-rule'`.
 * @returns {{settingKey:string|null, grantKind:'automatic'|'replacement', active:boolean}|null}
 */
export function readHouseRuleMarker(item) {
  const acq = item?.system?.acquisition || item?.flags?.swse?.acquisition || null;
  const flagged = item?.system?.houseRuleGranted === true || item?.flags?.swse?.houseRuleGranted === true || item?.flags?.['foundryvtt-swse']?.houseRuleGranted === true;
  const viaAcq = acq?.source === 'house-rule';
  if (!flagged && !viaAcq) return null;
  const settingKey = acq?.houseRuleKey || item?.system?.houseRuleSetting || item?.flags?.swse?.houseRuleSetting || item?.flags?.['foundryvtt-swse']?.houseRuleSetting || grantForItem(item)?.setting || null;
  return {
    settingKey,
    grantKind: acq?.grantKind === 'replacement' ? 'replacement' : 'automatic',
    active: settingKey ? isGrantEnabled(settingKey) : false,
  };
}

/** Does the actor already own this grant (by canonical id or normalized name)? Shared by the grant service and reconciliation. */
export function actorHasGrant(actor, grant) {
  const wanted = normalizeGrantName(grant.name);
  for (const item of Array.from(actor?.items ?? [])) {
    if (item?.type !== grant.type) continue;
    if (normalizeGrantName(item.name) === wanted) return true;
    if (grantForItem(item)?.id === grant.id) return true;
  }
  return false;
}

/**
 * Single-writer election for AUTOMATIC grant paths (setting change, world load). `isGM` alone lets every GM
 * client write; Foundry's `game.users.activeGM` is the one client designated to act on world-level events.
 * Unknown activeGM => this GM (matches the rest of the system's pattern).
 */
export function canWriteGrants() {
  const user = globalThis.game?.user;
  if (user?.isGM !== true) return false;
  const active = globalThis.game?.users?.activeGM;
  return !active || active.id === undefined || active.id === user.id;
}

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Deterministic 16-character embedded-document id for one grant instance (actor + setting + kind). Created with
 * `keepId`, Foundry's own primary-key uniqueness makes a concurrent second create fail instead of producing a
 * duplicate item - duplicate safety that does not depend on any client-side coordination.
 */
export function deterministicGrantItemId(actorId, settingKey, grantKind = 'automatic') {
  const seed = `swse-houserule|${actorId}|${settingKey}|${grantKind}`;
  let out = '';
  for (let i = 0; i < 4; i += 1) out += cyrb53(seed, i + 1).toString(36).padStart(11, '0').slice(-4);
  return out;
}

/** Acquisition record for a NEW grant (written by the granting service through ActorEngine). */
export function buildGrantAcquisition({ settingKey, grantKind = 'automatic', replacesName = null, actorId = null, now = new Date().toISOString() } = {}) {
  return {
    source: 'house-rule',
    sourceType: 'house-rule',
    houseRuleKey: settingKey,
    grantKind,
    replacesName,
    grantedBy: 'house-rule',
    grantedAt: now,
    actorId,
    countsAgainstSlot: false,
    // identity of this grant instance: one per actor + setting + kind (+ replaced item for replacements)
    grantId: `houserule:${settingKey}:${grantKind}${replacesName ? `:${normalizeGrantName(replacesName)}` : ''}`,
  };
}

export default { HOUSE_RULE_GRANTS, FEAT_TALENT_RULE_KEYS };
