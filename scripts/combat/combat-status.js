/**
 * Combat Status — canonical declared tactical state for character combat.
 *
 * This module intentionally does NOT inspect walls, token geometry, or line of
 * sight. Cover and defensive modes are player/GM declarations. Roll resolution
 * consumes those declarations from one place so the combat tab, attack roller,
 * and future GM controls do not create parallel conditional-math paths.
 */

export const COMBAT_STATUS_FLAG_SCOPE = 'foundryvtt-swse';
export const COMBAT_STATUS_FLAG_KEY = 'combatStatus';

export const DEFAULT_COMBAT_STATUS = Object.freeze({
  cover: 'none',              // none | partial | cover | improved | total
  defensiveMode: 'normal',    // normal | fightingDefensively | fullDefense
  prone: false,
  fightDef: false,            // compatibility alias
  fullDef: false              // compatibility alias
});

const COVER_BONUSES = Object.freeze({
  none: 0,
  partial: 2,
  cover: 5,
  improved: 10,
  total: 0
});

function readFlag(actor, scope, key) {
  try {
    const value = actor?.getFlag?.(scope, key);
    if (value !== undefined && value !== null) return value;
  } catch (_err) {
    // Fall through to raw flag access.
  }
  return actor?.flags?.[scope]?.[key] ?? null;
}

export function normalizeCover(value) {
  const key = String(value ?? 'none').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (!key || key === 'none' || key === 'nocover') return 'none';
  if (key === 'partial' || key === 'partialcover') return 'partial';
  if (key === 'cover' || key === 'regularcover' || key === 'behindcover') return 'cover';
  if (key === 'improved' || key === 'improvedcover' || key === 'enhanced' || key === 'enhancedcover') return 'improved';
  if (key === 'total' || key === 'totalcover' || key === 'blocked') return 'total';
  return 'none';
}

export function normalizeDefensiveMode(value, raw = {}) {
  const key = String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (key === 'normal' || key === 'none' || key === 'off' || key === 'clear' || key === 'no') return 'normal';
  if (key === 'fightingdefensively' || key === 'fightdefensively' || key === 'fightdef') return 'fightingDefensively';
  if (key === 'fulldefense' || key === 'fulldef') return 'fullDefense';
  if (raw?.fullDef === true || raw?.fullDefense === true) return 'fullDefense';
  if (raw?.fightDef === true || raw?.fightingDefensively === true) return 'fightingDefensively';
  return 'normal';
}

function isSuppressCoverContext(context = {}) {
  return context?.suppressesCover === true
    || context?.ignoreCover === true
    || context?.attackOptions?.suppressesCover === true
    || context?.attackOptions?.ignoreCover === true
    || context?.combatOptions?.suppressesCover === true
    || context?.combatOptions?.ignoreCover === true
    || context?.optionModifiers?.suppressesCover === true
    || context?.optionModifiers?.ignoreCover === true;
}

function hasFightingDefensivelyEffect(actor) {
  return Array.from(actor?.effects ?? []).some(effect => effect?.flags?.swse?.combatAction === 'fighting-defensively');
}

export const CombatStatusResolver = {
  getStatus(actor) {
    const raw = readFlag(actor, COMBAT_STATUS_FLAG_SCOPE, COMBAT_STATUS_FLAG_KEY)
      ?? readFlag(actor, 'swse', COMBAT_STATUS_FLAG_KEY)
      ?? {};
    const defensiveMode = normalizeDefensiveMode(raw.defensiveMode, raw);
    const cover = normalizeCover(raw.cover);
    return {
      ...DEFAULT_COMBAT_STATUS,
      ...raw,
      cover,
      defensiveMode,
      fightDef: defensiveMode === 'fightingDefensively',
      fullDef: defensiveMode === 'fullDefense',
      prone: raw.prone === true
    };
  },

  async setStatus(actor, patch = {}) {
    if (!actor?.setFlag) return null;
    const current = this.getStatus(actor);
    const resetConditions = patch.resetConditions === true
      || patch.resetAll === true
      || String(patch.defensiveMode ?? '').toLowerCase() === 'normal';
    const rawForMode = resetConditions
      ? { ...patch, fightDef: false, fullDef: false, fightingDefensively: false, fullDefense: false }
      : { ...current, ...patch };
    const next = {
      ...current,
      ...patch,
      cover: normalizeCover(patch.cover ?? current.cover),
      defensiveMode: resetConditions ? 'normal' : normalizeDefensiveMode(patch.defensiveMode, rawForMode),
      prone: resetConditions ? false : (patch.prone ?? current.prone ?? false)
    };
    next.fightDef = next.defensiveMode === 'fightingDefensively';
    next.fullDef = next.defensiveMode === 'fullDefense';
    next.updatedRound = patch.updatedRound ?? patch.round ?? current.updatedRound ?? globalThis.game?.combat?.round ?? null;
    next.updatedTurn = patch.updatedTurn ?? patch.turn ?? current.updatedTurn ?? globalThis.game?.combat?.turn ?? null;
    next.updatedCombatId = patch.updatedCombatId ?? patch.combatId ?? current.updatedCombatId ?? globalThis.game?.combat?.id ?? null;
    await actor.setFlag(COMBAT_STATUS_FLAG_SCOPE, COMBAT_STATUS_FLAG_KEY, next);
    Hooks.callAll('swse.combatStatusChanged', { actorId: actor.id, status: next, source: patch.source ?? 'system' });
    return next;
  },

  async expireTurnStartModes(actor, context = {}) {
    const status = this.getStatus(actor);
    if (status.defensiveMode !== 'fightingDefensively' && status.defensiveMode !== 'fullDefense') return status;

    return this.setStatus(actor, {
      defensiveMode: 'normal',
      source: context.source ?? 'turn-start-expire',
      round: context.round ?? globalThis.game?.combat?.round ?? null,
      turn: context.turn ?? globalThis.game?.combat?.turn ?? null,
      combatId: context.combatId ?? globalThis.game?.combat?.id ?? null
    });
  },

  getCover(actor, context = {}) {
    const explicit = normalizeCover(context.cover ?? context.coverType ?? context.targetCover ?? 'none');
    if (explicit !== 'none') return explicit;
    return this.getStatus(actor).cover;
  },

  getCoverBonusFor(actor, context = {}) {
    if (isSuppressCoverContext(context)) return 0;
    return COVER_BONUSES[this.getCover(actor, context)] ?? 0;
  },

  resolveTargetDefense(actor, defenseType, baseValue, context = {}) {
    const numericBase = Number(baseValue);
    const hasBase = Number.isFinite(numericBase);
    const normalizedDefense = String(defenseType || 'reflex').toLowerCase();
    const reflexDefense = normalizedDefense === 'reflex' || normalizedDefense === 'ref';
    const cover = reflexDefense ? this.getCover(actor, context) : 'none';
    const coverSuppressed = isSuppressCoverContext(context);
    const mods = [];
    let blocked = false;

    if (reflexDefense && !coverSuppressed) {
      const coverBonus = COVER_BONUSES[cover] ?? 0;
      if (cover === 'total') {
        blocked = context.overrideTotalCover !== true && context.gmOverrideTotalCover !== true;
        mods.push({ key: 'cover', label: 'Total Cover', value: 0, blocked: true });
      } else if (coverBonus) {
        mods.push({ key: 'cover', label: cover === 'improved' ? 'Improved Cover' : cover === 'partial' ? 'Partial Cover' : 'Cover', value: coverBonus });
      }
    }

    const status = this.getStatus(actor);
    if (reflexDefense && status.defensiveMode === 'fightingDefensively') {
      mods.push({ key: 'defensiveMode', label: 'Fighting Defensively', value: 2 });
    } else if (reflexDefense && status.defensiveMode === 'fullDefense') {
      mods.push({ key: 'defensiveMode', label: 'Full Defense', value: 5 });
    }

    if (reflexDefense && status.prone === true) {
      const mode = String(context.attackType ?? context.rangeType ?? context.weapon?.system?.meleeOrRanged ?? '').toLowerCase();
      const melee = mode.includes('melee');
      mods.push({ key: 'prone', label: melee ? 'Prone vs Melee' : 'Prone vs Ranged', value: melee ? -5 : 5 });
    }

    const adjustment = mods.reduce((total, mod) => total + (Number(mod.value) || 0), 0);
    return {
      base: hasBase ? numericBase : null,
      value: hasBase ? numericBase + adjustment : null,
      adjustment,
      mods,
      cover,
      coverSuppressed,
      blocked
    };
  },

  getAttackAdjustment(actor, context = {}) {
    const status = this.getStatus(actor);
    const fightingDefensively = context.fightingDefensively === true
      || status.defensiveMode === 'fightingDefensively'
      || hasFightingDefensivelyEffect(actor);
    const fullDefense = context.fullDefense === true || status.defensiveMode === 'fullDefense';
    const preparedPenalty = Number(actor?.system?.attackPenalty ?? 0) || 0;
    const attackPenalty = fightingDefensively && preparedPenalty > -5 ? -5 : 0;
    return {
      attackPenalty,
      fightingDefensively,
      fullDefense,
      blocked: fullDefense && context.allowAttackDuringFullDefense !== true && context.ignoreFullDefenseLock !== true,
      reason: fullDefense ? 'Full Defense is active. Attacks are locked until the mode is cleared or the GM overrides it.' : ''
    };
  }
};

Hooks.once('init', () => {
  game.swse = game.swse || {};
  game.swse.CombatStatusResolver = CombatStatusResolver;
});
