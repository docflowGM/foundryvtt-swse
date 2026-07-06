import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const UNKNOWN_REGIONS_ACTIONS = [
  {
    _id: 'unknown-regions-combat-trickery',
    name: 'Combat Trickery',
    type: 'combat-action',
    img: 'icons/svg/mystery-man.svg',
    system: {
      key: 'combat-trickery',
      domain: 'character',
      category: 'combat',
      actionType: 'two-swift',
      actionTypeRaw: 'two-swift',
      actionCost: 'two-swift-same-turn',
      summary: 'Spend two successive Swift Actions on the same turn to Feint with Deception against Will Defense.',
      notes: 'On success, the target is Flat-Footed against your next attack before the end of your next turn. You may spend a Force Point to extend the target penalty until end of encounter.',
      sourcebook: 'Star Wars Saga Edition The Unknown Regions',
      executable: true,
      resolutionMode: 'specialAction',
      contextTags: ['deception', 'feint', 'swift', 'flatFooted'],
      ruleData: { actionKey: 'combat-trickery', helper: 'CombatOptionResolver.getSpecialCombatActions' }
    },
    effects: [], folder: null, sort: 4.81, ownership: { default: 0 }, flags: { swse: { coreInjected: true } }
  },
  {
    _id: 'unknown-regions-instinctive-defense',
    name: 'Instinctive Defense',
    type: 'combat-action',
    img: 'icons/svg/shield.svg',
    system: {
      key: 'instinctive-defense',
      domain: 'character',
      category: 'combat',
      actionType: 'free',
      actionTypeRaw: 'free',
      actionCost: 'free',
      summary: 'On your turn, spend a Force Point as a Free Action to gain +2 to all defenses until the start of your next turn.',
      notes: 'Cannot be used by Droids. Action execution should spend the Force Point and apply the temporary defense effect.',
      sourcebook: 'Star Wars Saga Edition The Unknown Regions',
      executable: true,
      resolutionMode: 'specialAction',
      contextTags: ['forcePoint', 'defense', 'freeAction'],
      ruleData: { actionKey: 'instinctive-defense', helper: 'CombatOptionResolver.getSpecialCombatActions' }
    },
    effects: [], folder: null, sort: 4.82, ownership: { default: 0 }, flags: { swse: { coreInjected: true } }
  },
  {
    _id: 'unknown-regions-rapid-assault',
    name: 'Rapid Assault',
    type: 'combat-action',
    img: 'icons/svg/sword.svg',
    system: {
      key: 'rapid-assault',
      domain: 'character',
      category: 'combat',
      actionType: 'standard',
      actionTypeRaw: 'standard',
      actionCost: 'standard',
      summary: 'Optional rule: spend a Force Point to make two attacks as a Standard Action with normal multiattack penalties.',
      notes: 'Default-enabled optional-rule action. Requires Double Attack or Dual Weapon Mastery I and BAB +6 by feat prerequisite. Cannot produce more than two attacks.',
      sourcebook: 'Star Wars Saga Edition Web Enhancements / FAQ',
      executable: true,
      resolutionMode: 'specialAction',
      contextTags: ['forcePoint', 'multiattack', 'optionalRule'],
      ruleData: { actionKey: 'rapid-assault', helper: 'CombatOptionResolver.getOptionalRuleCombatActions', optionalRule: { key: 'enableRapidAssaultOptionalFeat', defaultEnabled: true } }
    },
    effects: [], folder: null, sort: 4.83, ownership: { default: 0 }, flags: { swse: { coreInjected: true } }
  }
];

function normalize(value) { return String(value ?? '').trim().toLowerCase(); }
function actorHasFeat(actor, featName) { const wanted = normalize(featName); try { return Array.from(actor?.items ?? []).some(item => item?.type === 'feat' && item?.system?.disabled !== true && normalize(item?.name) === wanted); } catch (_err) { return false; } }
function optionalRuleEnabled(key, fallback = true) { try { return game?.settings?.get?.('foundryvtt-swse', key) ?? fallback; } catch (_err) { return fallback; } }
function inject(actions = []) { const keys = new Set(actions.map(a => a?.system?.key ?? a?.key ?? a?._id).filter(Boolean)); const out = [...actions]; for (const action of UNKNOWN_REGIONS_ACTIONS) if (!keys.has(action.system.key)) out.push(action); return out; }
function actorCanSeeAction(actor, action) { if (!actor) return true; const key = action?.key ?? action?.system?.key; if (key === 'combat-trickery') return actorHasFeat(actor, 'Combat Trickery'); if (key === 'instinctive-defense') return actorHasFeat(actor, 'Instinctive Defense'); if (key === 'rapid-assault') return actorHasFeat(actor, 'Rapid Assault') && optionalRuleEnabled('enableRapidAssaultOptionalFeat', true); return true; }

function patchMapper() {
  if (CombatActionsMapper.__swseUnknownRegionsCombatActionsPatched === true) return;
  const originalEnsure = CombatActionsMapper._ensureCoreManualCombatActions?.bind(CombatActionsMapper);
  if (typeof originalEnsure === 'function') {
    CombatActionsMapper._ensureCoreManualCombatActions = function patchedUnknownRegionsActions(actions = []) { return inject(originalEnsure(actions)); };
  }
  const originalGetAllActionsBySkill = CombatActionsMapper.getAllActionsBySkill?.bind(CombatActionsMapper);
  if (typeof originalGetAllActionsBySkill === 'function') {
    CombatActionsMapper.getAllActionsBySkill = function patchedUnknownRegionsGetAllActionsBySkill(actor = null, options = {}) {
      const result = originalGetAllActionsBySkill(actor, options) ?? {};
      for (const bucket of Object.values(result)) bucket.combatActions = (bucket.combatActions ?? []).filter(action => actorCanSeeAction(actor, action));
      return result;
    };
  }
  if (Array.isArray(CombatActionsMapper._combatActions)) CombatActionsMapper._combatActions = inject(CombatActionsMapper._combatActions);
  CombatActionsMapper.__swseUnknownRegionsCombatActionsPatched = true;
}

export function registerUnknownRegionsCombatActionAdapter() {
  if (registered) return;
  registered = true;
  patchMapper();
  SWSELogger.log('[UnknownRegionsCombatActionAdapter] Action adapter registered');
}

export default registerUnknownRegionsCombatActionAdapter;
