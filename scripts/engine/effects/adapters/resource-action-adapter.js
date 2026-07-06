/**
 * Resource Action Adapter
 *
 * Collects available temporary defense resource actions.
 * Preserves exact behavior: action type, rule ID, actor ID, cost and effect details.
 */

import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";

function costDetail(rule = {}) {
  if (rule.cost === 'forcePoint') return 'Cost: 1 Force Point';
  if (rule.cost === 'reaction') return 'Cost: Reaction';
  if (rule.cost) return `Cost: ${rule.cost}`;
  return null;
}

function durationDetail(rule = {}) {
  if (rule.duration === 'untilBeginningOfNextTurn') return 'Duration: until beginning of your next turn';
  return rule.duration ? `Duration: ${rule.duration}` : 'Duration: 1 round';
}

export class ResourceActionAdapter {
  /**
   * Collect available resource action cards.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of resource action cards
   */
  static collect(actor, context = {}) {
    const rules = MetaResourceFeatResolver.getTemporaryDefenseRules(actor);
    return rules.map(rule => ({
      id: `available-${rule.id}`,
      label: rule.sourceName,
      type: 'resourceAction',
      severity: 'info',
      source: rule.sourceName,
      text: rule.description || `${rule.sourceName}: gain +${rule.value} to defenses.`,
      details: [
        costDetail(rule),
        `Effect: +${rule.value} to ${Array.isArray(rule.targets) ? rule.targets.map(target => String(target).replace('defense.', '')).join(', ') : 'defenses'}`,
        durationDetail(rule),
        rule.oncePer ? `Limit: once per ${rule.oncePer}` : null
      ].filter(Boolean),
      gmEnforced: false,
      mechanical: true,
      action: {
        type: 'temporaryDefense',
        label: `Use ${rule.sourceName}`,
        ruleId: rule.id,
        actorId: actor?.id ?? ''
      }
    }));
  }
}

export default ResourceActionAdapter;
