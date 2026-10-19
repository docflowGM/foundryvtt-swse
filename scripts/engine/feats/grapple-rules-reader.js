/**
 * Read-only readers for the feat and grapple-rule facts an actor carries. Extracted unchanged from grapple-feat-actions.js (E4-C1 WP5-C3) so
 * that the unarmed-attack authority can resolve a variant's eligibility (Slammer / Crush) from the same facts the grapple actions use, without
 * importing the actions module (which imports the unarmed authority). Nothing here mutates anything or decides a rule.
 */

export function normalizeFeatName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function actorHasFeat(actor, featName) {
  const wanted = normalizeFeatName(featName);
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat'
      && item?.system?.disabled !== true
      && normalizeFeatName(item?.name) === wanted);
  } catch (_err) {
    return false;
  }
}

export function actorGrappleRules(actor) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      const grappleRules = item?.system?.abilityMeta?.grappleRules;
      if (!Array.isArray(grappleRules)) continue;
      for (const rule of grappleRules) rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  } catch (_err) {
    // Treat malformed actor/items as having no grapple rules.
  }
  return rules;
}

export function findGrappleRule(actor, type, predicate = null) {
  return actorGrappleRules(actor).find(rule => rule?.type === type && (!predicate || predicate(rule)));
}

