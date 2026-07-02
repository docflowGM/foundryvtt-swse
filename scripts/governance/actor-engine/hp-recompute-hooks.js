/**
 * HP Recomputation Hook Registry
 * Registers hooks to trigger ActorEngine.recomputeHP() when relevant actor/item changes occur
 *
 * Triggers:
 * - actor.system.level change
 * - actor.system.attributes.con.* changes
 * - actor.system.hp.bonus changes
 * - Class item create/update/delete
 * - HP-affecting feat create/update/delete, such as Toughness
 * - Durable feat rule normalization for Toughness, Improved Damage Threshold, static defense feats, attack option feats, and resource feats
 *
 * Guard:
 * - Skips if options.meta.guardKey === "hp-recompute" (prevents recursion)
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { traceLog, actorSummary } from "/systems/foundryvtt-swse/scripts/utils/mutation-trace.js";

function normalizeFeatName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function itemAffectsHpMax(item) {
  if (!item) return false;
  if (item.type === 'class') return true;
  if (item.type !== 'feat') return false;
  if (normalizeFeatName(item.name) === 'toughness') return true;
  const rules = item.system?.abilityMeta?.resourceRules?.hitPoints;
  return Array.isArray(rules) && rules.length > 0;
}

function normalizeTarget(value) {
  return String(value ?? '').trim().toLowerCase();
}

function hasModifierTarget(item, targetNames = []) {
  const targets = new Set(targetNames.map(normalizeTarget));
  const modifiers = item?.system?.abilityMeta?.modifiers;
  if (!Array.isArray(modifiers)) return false;
  for (const modifier of modifiers) {
    const modifierTargets = Array.isArray(modifier?.target) ? modifier.target : [modifier?.target];
    if (modifierTargets.some(target => targets.has(normalizeTarget(target)))) return true;
  }
  return false;
}

function hasExistingModifierImplementation(item) {
  return Array.isArray(item?.system?.abilityMeta?.modifiers) && item.system.abilityMeta.modifiers.length > 0;
}

function hasExistingAttackOptionImplementation(item) {
  const meta = item?.system?.abilityMeta ?? {};
  if (meta.attackOption && typeof meta.attackOption === 'object') return true;
  const rules = Array.isArray(meta.rules) ? meta.rules : [];
  if (rules.some(rule => rule?.type === 'ATTACK_OPTION' || rule?.option || rule?.id)) return true;
  const primitives = Array.isArray(meta.primitives) ? meta.primitives : [];
  return primitives.some(primitive => primitive?.type === 'ATTACK_OPTION' || primitive?.data?.option || primitive?.data?.id);
}

function hasExistingResourceRule(item, resourceKey) {
  const rules = item?.system?.abilityMeta?.resourceRules?.[resourceKey];
  return Array.isArray(rules) && rules.length > 0;
}

function staticDefenseModifiersForFeat(featName) {
  switch (featName) {
    case 'improved defenses':
      return [
        {
          target: 'defense.reflex',
          type: 'untyped',
          value: 1,
          enabled: true,
          priority: 500,
          description: 'Improved Defenses: Reflex'
        },
        {
          target: 'defense.fortitude',
          type: 'untyped',
          value: 1,
          enabled: true,
          priority: 500,
          description: 'Improved Defenses: Fortitude'
        },
        {
          target: 'defense.will',
          type: 'untyped',
          value: 1,
          enabled: true,
          priority: 500,
          description: 'Improved Defenses: Will'
        }
      ];
    default:
      return null;
  }
}

function attackOptionForFeat(featName) {
  switch (featName) {
    case 'power attack':
      return { type: 'ATTACK_OPTION', option: 'powerAttack' };
    case 'melee defense':
      return { type: 'ATTACK_OPTION', option: 'meleeDefense' };
    case 'rapid shot':
      return { type: 'ATTACK_OPTION', option: 'rapidShot' };
    case 'rapid strike':
      return { type: 'ATTACK_OPTION', option: 'rapidStrike' };
    case 'careful shot':
      return { type: 'ATTACK_OPTION', option: 'carefulShot' };
    case 'deadeye':
      return { type: 'ATTACK_OPTION', option: 'deadeye' };
    case 'burst fire':
      return { type: 'ATTACK_OPTION', option: 'burstFire' };
    case 'far shot':
      return { type: 'ATTACK_OPTION', option: 'farShot' };
    case 'powerful charge':
      return { type: 'ATTACK_OPTION', option: 'powerfulCharge' };
    case 'charging fire':
      return { type: 'ATTACK_OPTION', option: 'chargingFire' };
    case 'improved disarm':
      return { type: 'ATTACK_OPTION', option: 'improvedDisarm' };
    case 'mighty swing':
      return { type: 'ATTACK_OPTION', option: 'mightySwing' };
    default:
      return null;
  }
}

function resourceRulePatchForFeat(featName) {
  switch (featName) {
    case 'force boon':
      return {
        key: 'forcePoints',
        rules: [
          {
            type: 'MAX_BONUS',
            value: 3,
            source: 'Force Boon'
          }
        ]
      };
    case 'strong in the force':
      return {
        key: 'forcePoints',
        rules: [
          {
            type: 'DIE_SIZE',
            value: 8,
            dieSize: 8,
            source: 'Strong in the Force'
          }
        ]
      };
    case 'extra second wind':
      return {
        key: 'secondWind',
        rules: [
          {
            type: 'EXTRA_DAILY_USE_MULTIPLIER',
            value: 1,
            source: 'Extra Second Wind'
          }
        ]
      };
    default:
      return null;
  }
}

function featRuleNormalizationPatch(item) {
  if (!item || item.type !== 'feat') return null;
  const featName = normalizeFeatName(item.name);
  const resourceRules = item.system?.abilityMeta?.resourceRules ?? {};
  const patch = { _id: item.id };

  if (featName === 'toughness' && !Array.isArray(resourceRules.hitPoints)) {
    patch['system.abilityMeta.resourceRules.hitPoints'] = [
      {
        type: 'MAX_BONUS_PER_LEVEL',
        value: 1,
        source: 'Toughness'
      }
    ];
  }

  if (featName === 'improved damage threshold'
    && !Array.isArray(resourceRules.damageThreshold)
    && !hasModifierTarget(item, ['defense.damageThreshold', 'damageThreshold', 'damage.threshold'])) {
    patch['system.abilityMeta.resourceRules.damageThreshold'] = [
      {
        type: 'FLAT_BONUS',
        value: 5,
        source: 'Improved Damage Threshold'
      }
    ];
  }

  const resourceRule = resourceRulePatchForFeat(featName);
  if (resourceRule && !hasExistingResourceRule(item, resourceRule.key)) {
    patch[`system.abilityMeta.resourceRules.${resourceRule.key}`] = resourceRule.rules;
    patch['system.executionModel'] = 'PASSIVE';
    patch['system.subType'] = 'RESOURCE';
    patch['system.abilityMeta.mechanicsMode'] = 'passive_resource';
  }

  const defenseModifiers = staticDefenseModifiersForFeat(featName);
  if (defenseModifiers && !hasExistingModifierImplementation(item)) {
    patch['system.executionModel'] = 'PASSIVE';
    patch['system.subType'] = 'MODIFIER';
    patch['system.abilityMeta.mechanicsMode'] = 'passive';
    patch['system.abilityMeta.applicationScope'] = 'static_actor';
    patch['system.abilityMeta.staticSheetPolicy'] = 'include';
    patch['system.abilityMeta.modifiers'] = defenseModifiers;
  }

  const attackOption = attackOptionForFeat(featName);
  if (attackOption && !hasExistingAttackOptionImplementation(item)) {
    patch['system.executionModel'] = 'ACTIVE';
    patch['system.subType'] = 'ATTACK_OPTION';
    patch['system.abilityMeta.mechanicsMode'] = 'attack_option';
    patch['system.abilityMeta.attackOption'] = attackOption;
  }

  return Object.keys(patch).length > 1 ? patch : null;
}

export class HPRecomputeHooks {
  static _initialized = false;

  /**
   * Initialize HP recomputation hooks
   * Called once during system ready
   * @static
   */
  static initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this._registerActorUpdateHook();
    this._registerItemHooks();

    SWSELogger.log("[HPRecomputeHooks] HP recalculation triggers registered");
  }

  /**
   * On actor update, watch for HP trigger keys (using flattened keys for nested detection)
   * @private
   */
  static _registerActorUpdateHook() {
    Hooks.on("updateActor", async (actor, data, options, userId) => {
      // Skip tokens
      if (!actor || actor.isToken) return;

      // Skip if this update came from recomputeHP itself (recursion guard)
      if (options?.meta?.guardKey === "hp-recompute") {
        return;
      }

      // PHASE 3: Skip if actor is currently in an in-flight mutation transaction
      // This prevents re-entrant writes during the original update
      if (ActorEngine.isActorMutationInFlight(actor.id)) {
        traceLog('HOOK:updateActor[HPRecomputeHooks]', 'deferred due to in-flight mutation guard', {
          actor: actorSummary(actor),
          reason: 'actor mutation already in flight'
        });
        SWSELogger.debug(`[HPRecomputeHooks] Deferring HP recompute for ${actor.name} — mutation in flight`);
        return;
      }

      // Flatten the update to detect nested changes like system.attributes.con.base
      const flat = foundry.utils.flattenObject(data);

      const triggerKeys = [
        "system.level",
        "system.attributes.con.base",
        "system.attributes.con.racial",
        "system.attributes.con.enhancement",
        "system.attributes.con.temp",
        "system.hp.bonus"
      ];

      const changed = triggerKeys.some(key => key in flat);

      if (changed) {
        const changedKeys = Object.keys(flat).filter(k => triggerKeys.some(tk => k === tk || k.startsWith(tk)));
        SWSELogger.debug(`[HPRecomputeHooks] Trigger detected for ${actor.name}`, { changedKeys });

        // [MUTATION TRACE] HOOK:updateActor — HPRecomputeHooks about to trigger recomputeHP → updateActor
        traceLog('HOOK:updateActor[HPRecomputeHooks]', 'triggering recomputeHP (writes back to actor via ActorEngine.updateActor)', {
          actor:        actorSummary(actor),
          changedKeys,
          guardKeyUsed: 'hp-recompute'
        });

        try {
          await ActorEngine.recomputeHP(actor, { fromHook: true });
        } catch (err) {
          SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP for ${actor.name}`, { error: err });
        }
      }
    });
  }

  /**
   * On class or HP-affecting feat CREATE, UPDATE, or DELETE, recompute HP.
   * @private
   */
  static _registerItemHooks() {
    const maybeNormalizeFeatRules = async (item, options = {}) => {
      if (options?.swseFeatRuleNormalization === true) return false;
      if (!item?.actor) return false;
      const patch = featRuleNormalizationPatch(item);
      if (!patch) return false;

      try {
        await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [patch], {
          source: 'Phase11A.feat-rule-normalization',
          swseFeatRuleNormalization: true,
          render: false
        });
        return true;
      } catch (err) {
        SWSELogger.error(`[HPRecomputeHooks] Failed to normalize durable feat rules for ${item.name}`, { error: err });
        return false;
      }
    };

    const maybeRecomputeFromItem = async (item, reason) => {
      if (!itemAffectsHpMax(item)) return;
      if (!item.actor) return;

      SWSELogger.debug(`[HPRecomputeHooks] HP-affecting item ${reason} for ${item.actor.name}`, {
        item: item.name,
        itemType: item.type
      });

      try {
        await ActorEngine.recomputeHP(item.actor, { fromHook: true });
      } catch (err) {
        SWSELogger.error(`[HPRecomputeHooks] Failed to recompute HP after item ${reason}`, { error: err });
      }
    };

    Hooks.on("createItem", async (item, options, userId) => {
      await maybeNormalizeFeatRules(item, options);
      await maybeRecomputeFromItem(item, 'create');
    });

    Hooks.on("updateItem", async (item, data, options, userId) => {
      await maybeNormalizeFeatRules(item, options);
      await maybeRecomputeFromItem(item, 'update');
    });

    Hooks.on("deleteItem", async (item, options, userId) => {
      await maybeRecomputeFromItem(item, 'delete');
    });
  }
}
