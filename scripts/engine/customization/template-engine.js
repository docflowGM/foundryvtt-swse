import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { TEMPLATE_CATALOG, getTemplateDefinition } from '/systems/foundryvtt-swse/scripts/engine/customization/upgrade-catalog.js';
import { getMostRestrictive, normalizeRestriction } from '/systems/foundryvtt-swse/scripts/engine/customization/restriction-model.js';
import { EffectResolver } from '/systems/foundryvtt-swse/scripts/engine/customization/effect-resolver.js';

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

    // Resolve effect payloads to show what the template will actually change
    // Effect meaning belongs in engines/catalogs, not in UI layer
    const templateDef = TEMPLATE_CATALOG[templateKey];
    const effectResolution = EffectResolver.resolveTemplateEffects(item, templateDef);

    return {
      success: true,
      template: eligible,
      effectPreview: effectResolution.success ? effectResolution.preview : null,
      effectMutations: effectResolution.mutations,
      notes: 'Template effects apply rarity, restriction, and cost modifiers. Detailed stat effects depend on template type.'
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
      effectiveRestriction: normalizeRestriction(preview.template.restriction),
      // Store effect mutations for potential removal/reversion later
      appliedEffects: preview.effectMutations || {}
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
    const mutationPlan = {
      set: {
        'flags.foundryvtt-swse.customization': customization,
        'system.restriction': restriction
      }
    };

    if (!item.system?.gearTemplate) {
      mutationPlan.set['system.gearTemplate'] = preview.template.key;
    } else if (!item.system?.gearTemplateSecondary && preview.template.stackable) {
      mutationPlan.set['system.gearTemplateSecondary'] = preview.template.key;
    }

    // Apply effect mutations to the item state
    // This is the canonical point where template effects change item stats/restrictions/costs
    if (preview.effectMutations) {
      const expandedEffects = foundry.utils.expandObject(preview.effectMutations);
      mutationPlan.set = {
        ...mutationPlan.set,
        ...foundry.utils.flattenObject(expandedEffects)
      };
    }

    await ActorEngine.applyMutationPlan(actor, mutationPlan, item);
    return { success: true, templateKey, appliedEffects: preview.effectMutations ? Object.keys(preview.effectMutations) : [] };
  }
}


export { TEMPLATE_CATALOG, getTemplateDefinition };
