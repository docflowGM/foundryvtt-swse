function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function getAttackOptionRules(item) {
  const rules = item?.system?.abilityMeta?.attackOptionRules;
  return Array.isArray(rules) ? rules : [];
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeKey(featName);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeKey(item?.name) === wanted);
}

function actionMatches(rule = {}, actionId = '') {
  const wanted = normalizeKey(actionId);
  if (!wanted) return false;
  if (normalizeKey(rule.actionId) === wanted) return true;
  return Array.isArray(rule.aliases) && rule.aliases.some(alias => normalizeKey(alias) === wanted);
}

function collectActionRules(actor, actionId, type) {
  const matches = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    for (const rule of getAttackOptionRules(item)) {
      if (rule?.type !== type) continue;
      if (!actionMatches(rule, actionId)) continue;
      if (rule.prerequisiteFeat && !actorHasFeat(actor, rule.prerequisiteFeat)) continue;
      matches.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  }
  return matches;
}

function collectActionSpeedMutations(actor, actionId) {
  return collectActionRules(actor, actionId, 'ACTION_SPEED_MUTATION');
}

function collectActionCompositionMutations(actor, actionId) {
  return collectActionRules(actor, actionId, 'ACTION_COMPOSITION_MUTATION');
}

function costRank(cost) {
  const key = normalizeKey(cost);
  const ranks = { free: 0, reaction: 1, swift: 2, move: 3, standard: 4, fullround: 5, 'full-round': 5 };
  return ranks[key] ?? 99;
}

export class ActionSpeedFeatResolver {
  static getActionSpeedMutations(actor, actionId) {
    return collectActionSpeedMutations(actor, actionId);
  }

  static getActionCompositionMutations(actor, actionId) {
    return collectActionCompositionMutations(actor, actionId);
  }

  static resolveActionCost(actor, actionId, baseCost, context = {}) {
    let bestCost = baseCost;
    let applied = null;
    const mutations = collectActionSpeedMutations(actor, actionId);
    for (const mutation of mutations) {
      const nextCost = mutation.mutatedActionCost ?? mutation.actionEconomy?.to ?? mutation.actionEconomy?.spend;
      if (!nextCost) continue;
      if (mutation.requiresWorkflowValidation === true && context?.validated !== true && context?.workflowValidated !== true) {
        continue;
      }
      if (!bestCost || costRank(nextCost) < costRank(bestCost)) {
        bestCost = nextCost;
        applied = mutation;
      }
    }
    return {
      actionId,
      baseCost,
      cost: bestCost,
      mutated: !!applied,
      mutation: applied,
      mutations
    };
  }

  static resolveActionComposition(actor, actionId, context = {}) {
    const mutations = collectActionCompositionMutations(actor, actionId);
    const valid = mutations.filter(mutation => {
      if (mutation.requiresWorkflowValidation === true && context?.validated !== true && context?.workflowValidated !== true) return false;
      if (mutation.usesPerEncounter && context?.encounterUsesRemaining === 0) return false;
      return true;
    });
    return {
      actionId,
      available: valid.length > 0,
      mutation: valid[0] ?? null,
      mutations
    };
  }
}

export default ActionSpeedFeatResolver;
