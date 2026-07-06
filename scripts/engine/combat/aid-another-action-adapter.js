import { CombatActionsMapper } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js";
import { SWSECombat } from "/systems/foundryvtt-swse/scripts/combat/systems/enhanced-combat-system.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

let registered = false;

const AID_ANOTHER_ACTIONS = [
  {
    _id: 'core-aid-another-skill',
    name: 'Aid Another (Skill)',
    type: 'combat-action',
    img: 'icons/svg/d20.svg',
    system: {
      key: 'aid-another-skill',
      domain: 'character',
      category: 'combat',
      actionType: 'standard',
      actionTypeRaw: 'standard',
      cost: 1,
      summary: 'As a Standard Action, help an ally with a Skill Check or Ability Check. Roll the same kind of check; on 10 or higher, the ally gets +2 on their check.',
      notes: 'You cannot Take 10 to Aid Another on a Skill Check or Ability Check. The aided check type, target ally, and timing are selected by the table/workflow.',
      notesAdvanced: 'Aid Another (Skill) exposes aidAnotherContext=skill for feat/talent riders. Riders can modify the aid check, bonus amount, eligible skills, action economy, or recipient effect through AidAnotherActionAdapter.collectAidAnotherRiders(actor, context).',
      relatedSkills: [
        { skill: 'Any Skill', outcome: 'Roll the same Skill or Ability Check; DC 10 grants ally +2.' }
      ],
      tags: ['aidAnother', 'aidAnotherSkill', 'standardAction', 'skillCheck', 'abilityCheck'],
      contextTags: ['aidAnother', 'skill', 'abilityCheck', 'standardAction'],
      resolutionMode: 'aidAnotherSkill',
      actionCost: 'standard',
      executable: true,
      manualResolution: true,
      automationBoundary: 'guided',
      gmManaged: false,
      targetHint: 'Choose an allied creature and the skill or ability check being aided.',
      ruleData: {
        aidAnother: true,
        aidAnotherContext: 'skill',
        checkType: 'skillOrAbility',
        checkDC: 10,
        successBonus: 2,
        bonusTarget: 'allyNextSkillOrAbilityCheck',
        canTake10: false,
        actionEconomy: 'standard'
      }
    },
    effects: [],
    folder: null,
    sort: 5.1,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, aidAnotherVariant: 'skill' } }
  },
  {
    _id: 'core-aid-another-attack',
    name: 'Aid Another (Attack)',
    type: 'combat-action',
    img: 'icons/svg/sword.svg',
    system: {
      key: 'aid-another-attack',
      domain: 'character',
      category: 'combat',
      actionType: 'standard',
      actionTypeRaw: 'standard',
      cost: 1,
      summary: 'As a Standard Action, make an attack against Reflex Defense 10. On success, one ally gains +2 on their next attack roll against that opponent.',
      notes: 'Select an opponent, make an attack against Reflex 10, and choose the ally who receives the +2 bonus on a single next attack against that opponent.',
      notesAdvanced: 'Aid Another (Attack) exposes aidAnotherContext=attack for feat/talent riders. This is the hook for effects such as extra damage riders, larger aid bonuses, or alternate recipients.',
      relatedSkills: [
        { skill: 'Attack Roll', outcome: 'Attack Reflex 10; success grants ally +2 on one next attack against that opponent.' }
      ],
      tags: ['aidAnother', 'aidAnotherAttack', 'standardAction', 'attack'],
      contextTags: ['aidAnother', 'attack', 'standardAction'],
      resolutionMode: 'aidAnotherAttack',
      actionCost: 'standard',
      executable: true,
      manualResolution: true,
      automationBoundary: 'guided',
      gmManaged: false,
      targetHint: 'Choose an opponent and one ally who will receive the attack bonus.',
      ruleData: {
        aidAnother: true,
        aidAnotherContext: 'attack',
        attackVsDefense: 'reflex',
        targetDefenseValue: 10,
        successBonus: 2,
        bonusTarget: 'allyNextAttackAgainstOpponent',
        actionEconomy: 'standard'
      }
    },
    effects: [],
    folder: null,
    sort: 5.2,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, aidAnotherVariant: 'attack' } }
  },
  {
    _id: 'core-aid-another-suppress',
    name: 'Aid Another (Suppress)',
    type: 'combat-action',
    img: 'icons/svg/daze.svg',
    system: {
      key: 'aid-another-suppress',
      domain: 'character',
      category: 'combat',
      actionType: 'standard',
      actionTypeRaw: 'standard',
      cost: 1,
      summary: 'As a Standard Action, make an attack against Reflex Defense 10. On success, the opponent takes -2 on its next attack roll.',
      notes: 'Select an opponent and make an attack against Reflex 10. On success, that opponent takes -2 on its next attack roll.',
      notesAdvanced: 'Aid Another (Suppress) exposes aidAnotherContext=suppress for feat/talent riders. Riders can modify the penalty amount, duration, eligible targets, or follow-up effects.',
      relatedSkills: [
        { skill: 'Attack Roll', outcome: 'Attack Reflex 10; success gives the opponent -2 on its next attack roll.' }
      ],
      tags: ['aidAnother', 'aidAnotherSuppress', 'standardAction', 'attackPenalty'],
      contextTags: ['aidAnother', 'suppress', 'standardAction'],
      resolutionMode: 'aidAnotherSuppress',
      actionCost: 'standard',
      executable: true,
      manualResolution: true,
      automationBoundary: 'guided',
      gmManaged: false,
      targetHint: 'Choose an opponent to suppress.',
      ruleData: {
        aidAnother: true,
        aidAnotherContext: 'suppress',
        attackVsDefense: 'reflex',
        targetDefenseValue: 10,
        successPenalty: -2,
        penaltyTarget: 'enemyNextAttack',
        actionEconomy: 'standard'
      }
    },
    effects: [],
    folder: null,
    sort: 5.3,
    ownership: { default: 0 },
    flags: { swse: { coreInjected: true, aidAnotherVariant: 'suppress' } }
  }
];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeKey(value = '') {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); }
  catch (_err) { return []; }
}

function actionKey(action) {
  return action?.key ?? action?.id ?? action?.system?.key ?? '';
}

function aidContextFromAction(actionOrKey) {
  const key = normalizeKey(typeof actionOrKey === 'string' ? actionOrKey : actionKey(actionOrKey));
  if (key === 'aid-another-skill') return 'skill';
  if (key === 'aid-another-attack') return 'attack';
  if (key === 'aid-another-suppress') return 'suppress';
  return null;
}

function itemRules(item) {
  const rules = [];
  rules.push(...asArray(item?.system?.abilityMeta?.rules));
  rules.push(...asArray(item?.system?.aidAnotherRules));
  rules.push(...asArray(item?.system?.abilityMeta?.aidAnotherRules));
  return rules;
}

function ruleMatchesAidContext(rule, context = {}) {
  const wanted = normalizeKey(context.aidAnotherContext ?? context.mode ?? context.variant ?? '');
  const ruleContext = normalizeKey(rule?.aidAnotherContext ?? rule?.aidAnotherMode ?? rule?.context ?? rule?.mode ?? '');
  if (!wanted || !ruleContext) return true;
  if (ruleContext === 'any') return true;
  return ruleContext === wanted;
}

function collectAidAnotherRiders(actor, context = {}) {
  const riders = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
    for (const rule of itemRules(item)) {
      const type = normalizeKey(rule?.type ?? rule?.ruleType ?? '');
      const isAidRule = type.includes('aid-another') || rule?.aidAnother === true || rule?.aidAnotherContext || rule?.aidAnotherMode;
      if (!isAidRule) continue;
      if (!ruleMatchesAidContext(rule, context)) continue;
      riders.push({ ...rule, sourceName: item.name, sourceType: item.type, sourceId: item.id });
    }
  }
  return riders;
}

function ensureAidAnotherCoreActions(actions = []) {
  const existingKeys = new Set(actions.map(action => action?.system?.key ?? action?.key ?? action?._id).filter(Boolean));
  const existingNames = new Set(actions.map(action => String(action?.name ?? '').trim().toLowerCase()).filter(Boolean));
  const injected = [];
  for (const action of AID_ANOTHER_ACTIONS) {
    const key = action.system?.key;
    const name = String(action.name ?? '').trim().toLowerCase();
    if ((key && existingKeys.has(key)) || (name && existingNames.has(name))) continue;
    injected.push(action);
  }
  return injected.length ? [...actions, ...injected] : actions;
}

async function renderAidAnotherCard(actor, action) {
  const context = aidContextFromAction(action);
  if (!actor || !context) return false;
  const ruleData = action?.ruleData ?? action?.system?.ruleData ?? {};
  const riders = collectAidAnotherRiders(actor, { aidAnotherContext: context, action });
  const riderList = riders.length
    ? `<ul>${riders.map(r => `<li><strong>${r.sourceName}</strong>: ${r.label ?? r.summary ?? r.note ?? r.type ?? 'Aid Another rider'}</li>`).join('')}</ul>`
    : '<p>No feat or talent riders detected for this Aid Another context.</p>';

  const bodyByContext = {
    skill: `Roll the same Skill Check or Ability Check as the ally. On <strong>10+</strong>, the ally gets <strong>+2</strong> on that check. You cannot Take 10.`,
    attack: `Select an opponent and make an attack against <strong>Reflex Defense 10</strong>. On success, one ally gets <strong>+2</strong> on one next attack against that opponent.`,
    suppress: `Select an opponent and make an attack against <strong>Reflex Defense 10</strong>. On success, that opponent takes <strong>-2</strong> on its next attack roll.`
  };

  const html = `
    <div class="swse-aid-another-card" data-aid-another-context="${context}">
      <h3>${action.name}</h3>
      <p><strong>Action:</strong> Standard Action</p>
      <p>${bodyByContext[context]}</p>
      <p><strong>Base rule:</strong> ${JSON.stringify(ruleData)}</p>
      <h4>Available Riders</h4>
      ${riderList}
    </div>
  `;

  await createChatMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER
  });
  return true;
}

function patchCombatActionsMapper() {
  if (CombatActionsMapper.__swseAidAnotherPatched === true) return;
  const original = CombatActionsMapper._ensureCoreManualCombatActions?.bind(CombatActionsMapper);
  CombatActionsMapper._ensureCoreManualCombatActions = function patchedEnsureCoreManualCombatActions(actions = []) {
    const base = typeof original === 'function' ? original(actions) : actions;
    return ensureAidAnotherCoreActions(base);
  };
  if (Array.isArray(CombatActionsMapper._combatActions)) {
    CombatActionsMapper._combatActions = ensureAidAnotherCoreActions(CombatActionsMapper._combatActions);
  }
  CombatActionsMapper.getAidAnotherCoreActions = () => foundry.utils?.deepClone?.(AID_ANOTHER_ACTIONS) ?? JSON.parse(JSON.stringify(AID_ANOTHER_ACTIONS));
  CombatActionsMapper.collectAidAnotherRiders = collectAidAnotherRiders;
  CombatActionsMapper.__swseAidAnotherPatched = true;
}

function patchSWSECombat() {
  if (SWSECombat.__swseAidAnotherPatched === true) return;
  const original = SWSECombat.runCombatAction?.bind(SWSECombat);
  SWSECombat.runCombatAction = async function patchedRunCombatAction(actor, action, options = {}) {
    const context = aidContextFromAction(action);
    if (context) return renderAidAnotherCard(actor, action, options);
    if (typeof original === 'function') return original(actor, action, options);
    SWSELogger.warn('[AidAnotherActionAdapter] No generic runCombatAction handler is registered for this action', { action });
    ui.notifications?.info?.(`${action?.name ?? 'Combat action'} is listed as a guided/manual action.`);
    return null;
  };
  SWSECombat.__swseAidAnotherPatched = true;
}

export function registerAidAnotherActionAdapter() {
  if (registered) return;
  registered = true;
  patchCombatActionsMapper();
  patchSWSECombat();
  game.swse ??= {};
  game.swse.combat ??= {};
  game.swse.combat.aidAnother ??= {};
  game.swse.combat.aidAnother.actions = AID_ANOTHER_ACTIONS;
  game.swse.combat.aidAnother.collectRiders = collectAidAnotherRiders;
  game.swse.combat.aidAnother.renderCard = renderAidAnotherCard;
  SWSELogger.log('[AidAnotherActionAdapter] Registered Aid Another action cards and rider adapter');
}

export { AID_ANOTHER_ACTIONS, collectAidAnotherRiders, renderAidAnotherCard };

export default registerAidAnotherActionAdapter;
