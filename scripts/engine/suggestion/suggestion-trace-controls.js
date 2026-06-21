/**
 * Suggestion trace logging controls.
 *
 * Normal SWSE debug logging should stay compact. Expensive per-candidate
 * suggestion diagnostics must be gated by enableSuggestionTrace instead.
 */

export function isSuggestionTraceEnabled(options = {}) {
  if (options?.trace === true || options?.debug === true || options?.enableSuggestionTrace === true) {
    return true;
  }

  try {
    const service = globalThis.HouseRuleService;
    if (typeof service?.getBoolean === 'function') {
      return service.getBoolean('enableSuggestionTrace', false) === true;
    }
    if (typeof service?.get === 'function') {
      return service.get('enableSuggestionTrace') === true;
    }
  } catch (_err) {
    // Fall through to direct game setting check.
  }

  try {
    return globalThis.game?.settings?.get?.('foundryvtt-swse', 'enableSuggestionTrace') === true;
  } catch (_err) {
    return false;
  }
}

export function logSuggestionTrace(options, ...args) {
  if (!isSuggestionTraceEnabled(options)) return;
  try {
    console.debug('SWSE', ...args);
  } catch (_err) {
    // Console logging should never affect suggestion resolution.
  }
}

export function summarizeSuggestionResults(items = [], { suggestedPredicate = null } = {}) {
  const list = Array.isArray(items) ? items : [];
  const suggested = suggestedPredicate
    ? list.filter(suggestedPredicate).length
    : list.filter(item => item?.isSuggested === true || Number(item?.suggestion?.tier ?? item?.tier ?? 0) > 0).length;
  const tierCounts = {};

  for (const item of list) {
    const tier = Number(item?.suggestion?.tier ?? item?.tier ?? 0);
    const key = Number.isFinite(tier) ? String(tier) : 'unknown';
    tierCounts[key] = (tierCounts[key] || 0) + 1;
  }

  return {
    total: list.length,
    suggested,
    tierCounts,
    top: list.slice(0, 5).map(item => ({
      name: item?.name || item?.label || item?.targetRef?.name || 'Unknown',
      tier: item?.suggestion?.tier ?? item?.tier ?? 0,
      reason: item?.suggestion?.reasonCode || item?.suggestion?.reason || item?.reasonCode || null
    }))
  };
}
