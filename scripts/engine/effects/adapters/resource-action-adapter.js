/**
 * Resource Action Adapter
 *
 * Collects available temporary defense resource actions.
 * Preserves exact behavior: action type, rule ID, actor ID, cost and effect details.
 */

import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";

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
      text: rule.description || `Spend a Force Point to gain +${rule.value} to defenses for 1 round.`,
      details: [
        rule.cost === 'forcePoint' ? 'Cost: 1 Force Point' : null,
        `Effect: +${rule.value} to defenses`,
        'Duration: 1 round'
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
