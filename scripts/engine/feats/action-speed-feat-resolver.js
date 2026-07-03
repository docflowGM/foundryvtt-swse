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

function actionMatches(rule = {}, actionId = '') {
  const wanted = normalizeKey(actionId);
  if (!wanted) return false;
  if (normalizeKey(rule.actionId) === wanted) return true;
  return Array.isArray(rule.aliases) && rule.aliases.some(alias => normalizeKey(alias) === wanted);
}

function collectActionSpeedMutations(actor, actionId) {
  const mutations = [];
  for (const item of actorItems(actor)) {
    if (item?.type !== 'feat' || item?.system?.disabled === true) continue;
    for (const rule of getAttackOptionRules(item)) {
      if (rule?.type !== 'ACTION_SPEED_MUTATION') continue;
      if (!actionMatches(rule, actionId)) continue;
      mutations.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  }
  return mutations;
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
}

export default ActionSpeedFeatResolver;
