import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { TEMPLATE_CATALOG, getTemplateDefinition } from '/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js';
import { getMostRestrictive, normalizeRestriction } from '/systems/foundryvtt-swse/scripts/engine/customization/restriction-model.js';

function clone(data) { return foundry.utils.deepClone(data); }

export class TemplateEngine {
  constructor(profileResolver, slotEngine, eligibilityEngine) {
    this.profileResolver = profileResolver;
    this.slotEngine = slotEngine;
    this.eligibilityEngine = eligibilityEngine;
  }

  getEligibleTemplates(item) {
    return this.eligibilityEngine.getEligibleTemplates(item);
  }

  previewApplyTemplate(item, templateKey) {
    const eligible = this.getEligibleTemplates(item).find(t => t.key === templateKey);
    if (!eligible) return { success: false, reason: 'unknown_template' };
    if (!eligible.allowed) return { success: false, reason: eligible.reason };
    return {
      success: true,
      template: eligible,
      notes: 'Template effects currently apply restriction, rarity, and metadata. Detailed stat deltas require source template effect data.'
    };
  }

  async applyTemplate(actor, item, templateKey) {
    const preview = this.previewApplyTemplate(item, templateKey);
    if (!preview.success) return preview;
    const customization = clone(this.slotEngine.getCustomizationState(item));
    customization.appliedTemplates = Array.isArray(customization.appliedTemplates) ? customization.appliedTemplates : [];
    customization.operationLog = Array.isArray(customization.operationLog) ? customization.operationLog : [];
    const instance = {
      instanceId: foundry.utils.randomID(),
      templateKey,
      source: preview.template.restriction,
      stackOrder: customization.appliedTemplates.length,
      operationCost: 0,
      rare: !!preview.template.rarity,
      effectiveRestriction: normalizeRestriction(preview.template.restriction)
    };
    customization.appliedTemplates.push(instance);
    customization.operationLog.push({
      id: foundry.utils.randomID(),
      type: 'template_apply',
      timestamp: Date.now(),
      appliedBy: actor.id,
      details: { templateKey, instanceId: instance.instanceId }
    });
    const restriction = getMostRestrictive(item.system?.restriction, ...customization.appliedTemplates.map(t => t.effectiveRestriction));
    const update = {
      'flags.foundryvtt-swse.customization': customization,
      'system.restriction': restriction
    };
    if (!item.system?.gearTemplate) {
      update['system.gearTemplate'] = preview.template.key;
    } else if (!item.system?.gearTemplateSecondary && preview.template.stackable) {
      update['system.gearTemplateSecondary'] = preview.template.key;
    }
    await ActorEngine.applyMutationPlan(actor, { set: update }, item);
    return { success: true, templateKey };
  }
}


export { TEMPLATE_CATALOG, getTemplateDefinition };
