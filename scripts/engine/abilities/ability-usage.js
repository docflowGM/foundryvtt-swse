/**
 * AbilityUsage
 * Single source of truth for usage tracking.
 *
 * Storage:
 *   actor.flags.swse.abilityUsage[usageKey] = { current, max, kind, updatedAt }
 *
 * Legacy read-compat:
 *   actor.flags['foundryvtt-swse']['ability-uses-${talentItemId}']
 */

const FLAG_SCOPE = 'swse';
const FLAG_KEY = 'abilityUsage';

const LEGACY_SCOPE = 'foundryvtt-swse';
const LEGACY_PREFIX = 'ability-uses-';

function _maxFromDef(def = {}) {
  if (Number.isFinite(def.perEncounter)) return def.perEncounter;
  if (Number.isFinite(def.perDay)) return def.perDay;
  if (Number.isFinite(def.perRound)) return def.perRound;
  if (Number.isFinite(def.custom)) return def.custom;
  return null;
}

function _kindFromDef(def = {}) {
  if (Number.isFinite(def.perEncounter)) return 'encounter';
  if (Number.isFinite(def.perDay)) return 'day';
  if (Number.isFinite(def.perRound)) return 'round';
  if (Number.isFinite(def.custom)) return 'custom';
  return 'unlimited';
}

export class AbilityUsage {
  static getUsageKey(ability) {
    return ability?.usageKey || ability?.id;
  }

  static _getStore(actor) {
    return actor?.getFlag?.(FLAG_SCOPE, FLAG_KEY) || {};
  }

  static async _setStore(actor, store) {
    if (!actor?.setFlag) return;
    await actor.setFlag(FLAG_SCOPE, FLAG_KEY, store);
  }

  static _getLegacyValue(actor, usageKey) {
    if (!usageKey?.startsWith?.('talent__')) return null;
    const talentItemId = usageKey.replace(/^talent__/, '');
    const legacyKey = `${LEGACY_PREFIX}${talentItemId}`;
    const legacyVal = actor?.getFlag?.(LEGACY_SCOPE, legacyKey);
    return Number.isFinite(legacyVal) ? legacyVal : null;
  }

  static getStateSync(actor, ability) {
    const def = ability?.usage || {};
    const max = _maxFromDef(def);
    const kind = _kindFromDef(def);

    const usesData = {
      max,
      isLimited: Number.isFinite(max),
      current: null,
      refreshLabel: null,
      canUse: true,
      perEncounter: kind === 'encounter',
      perDay: kind === 'day',
      perRound: kind === 'round'
    };

    if (!usesData.isLimited) return usesData;

    usesData.refreshLabel =
      kind === 'encounter' ? 'per encounter' :
      kind === 'day' ? 'per day' :
      kind === 'round' ? 'per round' :
      'limited';

    const usageKey = this.getUsageKey(ability);

    const store = this._getStore(actor);
    const stored = store?.[usageKey];

    if (stored && Number.isFinite(stored.current)) {
      usesData.current = Math.max(0, Math.min(max, stored.current));
      usesData.canUse = usesData.current > 0;
      return usesData;
    }

    const legacyVal = this._getLegacyValue(actor, usageKey);
    usesData.current = Number.isFinite(legacyVal) ? Math.max(0, Math.min(max, legacyVal)) : max;
    usesData.canUse = usesData.current > 0;
    return usesData;
  }

  static async consume(actor, ability, amount = 1) {
    const def = ability?.usage || {};
    const max = _maxFromDef(def);
    if (!Number.isFinite(max)) return true;

    const usageKey = this.getUsageKey(ability);
    const store = this._getStore(actor);
    const stored = store?.[usageKey] || { current: max, max, kind: _kindFromDef(def), updatedAt: Date.now() };

    const cur = Number.isFinite(stored.current) ? stored.current : max;
    const next = Math.max(0, cur - Math.max(1, amount));

    store[usageKey] = { ...stored, current: next, max, kind: _kindFromDef(def), updatedAt: Date.now() };
    await this._setStore(actor, store);

    return next < cur;
  }

  static async resetKind(actor, abilities = [], kind = 'encounter') {
    const store = this._getStore(actor);
    let changed = false;

    for (const ability of abilities) {
      const def = ability?.usage || {};
      const max = _maxFromDef(def);
      const k = _kindFromDef(def);
      if (!Number.isFinite(max)) continue;
      if (k !== kind) continue;

      const usageKey = this.getUsageKey(ability);
      store[usageKey] = { current: max, max, kind: k, updatedAt: Date.now() };
      changed = true;
    }

    if (changed) await this._setStore(actor, store);
  }

  static async resetEncounter(actor, abilities = []) { return this.resetKind(actor, abilities, 'encounter'); }
  static async resetDay(actor, abilities = []) { return this.resetKind(actor, abilities, 'day'); }
  static async resetRound(actor, abilities = []) { return this.resetKind(actor, abilities, 'round'); }
}
