/**
 * SkillFeatResolver
 *
 * Central skill-roll support for feat-driven skill bonuses, skill-use
 * substitutions, and post-roll reroll rights. This does not replace the
 * ModifierEngine; it handles roll-context-specific rules that need access to
 * the skill use being attempted or to the roll that was just produced.
 */

import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";

const SKILL_ALIASES = Object.freeze({
  acrobatics: 'acrobatics',
  climb: 'climb',
  deception: 'deception',
  endurance: 'endurance',
  gatherinformation: 'gatherInformation',
  gather_information: 'gatherInformation',
  gatherInformation: 'gatherInformation',
  initiative: 'initiative',
  jump: 'jump',
  knowledge: 'knowledge',
  knowledgebureaucracy: 'knowledgeBureaucracy',
  knowledge_bureaucracy: 'knowledgeBureaucracy',
  knowledgeBureaucracy: 'knowledgeBureaucracy',
  knowledgegalacticlore: 'knowledgeGalacticLore',
  knowledge_galactic_lore: 'knowledgeGalacticLore',
  knowledgeGalacticLore: 'knowledgeGalacticLore',
  knowledgelifesciences: 'knowledgeLifeSciences',
  knowledge_life_sciences: 'knowledgeLifeSciences',
  knowledgeLifeSciences: 'knowledgeLifeSciences',
  knowledgephysicalsciences: 'knowledgePhysicalSciences',
  knowledge_physical_sciences: 'knowledgePhysicalSciences',
  knowledgePhysicalSciences: 'knowledgePhysicalSciences',
  knowledgesocialsciences: 'knowledgeSocialSciences',
  knowledge_social_sciences: 'knowledgeSocialSciences',
  knowledgeSocialSciences: 'knowledgeSocialSciences',
  knowledgetactics: 'knowledgeTactics',
  knowledge_tactics: 'knowledgeTactics',
  knowledgeTactics: 'knowledgeTactics',
  knowledgetechnology: 'knowledgeTechnology',
  knowledge_technology: 'knowledgeTechnology',
  knowledgeTechnology: 'knowledgeTechnology',
  mechanics: 'mechanics',
  perception: 'perception',
  persuasion: 'persuasion',
  pilot: 'pilot',
  ride: 'ride',
  stealth: 'stealth',
  survival: 'survival',
  swim: 'swim',
  treatinjury: 'treatInjury',
  treat_injury: 'treatInjury',
  treatInjury: 'treatInjury',
  usecomputer: 'useComputer',
  use_computer: 'useComputer',
  useComputer: 'useComputer',
  usetheforce: 'useTheForce',
  use_the_force: 'useTheForce',
  useTheForce: 'useTheForce'
});

const KNOWLEDGE_KEYS = new Set([
  'knowledge',
  'knowledgeBureaucracy',
  'knowledgeGalacticLore',
  'knowledgeLifeSciences',
  'knowledgePhysicalSciences',
  'knowledgeSocialSciences',
  'knowledgeTactics',
  'knowledgeTechnology'
]);

const SKILL_LABELS = Object.freeze({
  acrobatics: 'Acrobatics',
  climb: 'Climb',
  deception: 'Deception',
  endurance: 'Endurance',
  gatherInformation: 'Gather Information',
  initiative: 'Initiative',
  jump: 'Jump',
  knowledge: 'Knowledge',
  knowledgeBureaucracy: 'Knowledge (Bureaucracy)',
  knowledgeGalacticLore: 'Knowledge (Galactic Lore)',
  knowledgeLifeSciences: 'Knowledge (Life Sciences)',
  knowledgePhysicalSciences: 'Knowledge (Physical Sciences)',
  knowledgeSocialSciences: 'Knowledge (Social Sciences)',
  knowledgeTactics: 'Knowledge (Tactics)',
  knowledgeTechnology: 'Knowledge (Technology)',
  mechanics: 'Mechanics',
  perception: 'Perception',
  persuasion: 'Persuasion',
  pilot: 'Pilot',
  ride: 'Ride',
  stealth: 'Stealth',
  survival: 'Survival',
  swim: 'Swim',
  treatInjury: 'Treat Injury',
  useComputer: 'Use Computer',
  useTheForce: 'Use the Force'
});

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactKey(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function getPropertySafe(object, path, fallback = undefined) {
  if (!object || !path) return fallback;
  try {
    if (typeof foundry?.utils?.getProperty === 'function') {
      const value = foundry.utils.getProperty(object, path);
      return value === undefined ? fallback : value;
    }
  } catch (_err) {}

  const parts = String(path).split('.');
  let current = object;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) return fallback;
    current = current[part];
  }
  return current === undefined ? fallback : current;
}

export class SkillFeatResolver {
  static normalizeSkillKey(value) {
    if (!value) return null;
    const direct = SKILL_ALIASES[value];
    if (direct) return direct;

    const compact = compactKey(value);
    return SKILL_ALIASES[compact] ?? SKILL_ALIASES[compact.replace(/skill$/i, '')] ?? null;
  }

  static getSkillLabel(skillKey) {
    return SKILL_LABELS[skillKey] ?? skillKey ?? 'Skill';
  }

  static getActorSkillTotal(actor, skillKey) {
    const normalized = this.normalizeSkillKey(skillKey) ?? skillKey;
    const derived = actor?.system?.derived?.skills?.[normalized]?.total;
    if (Number.isFinite(Number(derived))) return Number(derived);
    const raw = actor?.system?.skills?.[normalized]?.total;
    if (Number.isFinite(Number(raw))) return Number(raw);
    return 0;
  }

  static getSkillUseIdentity(skillUse = {}) {
    const source = skillUse?._source ?? skillUse;
    const system = source?.system ?? skillUse?.system ?? {};
    const application = skillUse?.application
      ?? skillUse?.label
      ?? skillUse?.name
      ?? system?.application
      ?? source?.name
      ?? '';

    const labels = [
      application,
      skillUse?.label,
      skillUse?.name,
      skillUse?.key,
      skillUse?.useKey,
      skillUse?.id,
      system?.application,
      system?.key,
      source?._id
    ].filter(Boolean).map(String);

    return {
      application,
      key: skillUse?.useKey ?? skillUse?.key ?? system?.key ?? source?._id ?? null,
      labels,
      normalizedLabels: labels.map(normalizeText),
      compactLabels: labels.map(compactKey)
    };
  }

  static resolveSkillUseSkillKey(skillUse = {}) {
    const source = skillUse?._source ?? skillUse;
    const system = source?.system ?? skillUse?.system ?? {};
    return this.normalizeSkillKey(
      skillUse?.skillKey
      ?? skillUse?.skill
      ?? system?.skill
      ?? system?.skillKey
      ?? null
    );
  }

  static getSkillItems(actor) {
    if (!actor?.items) return [];
    const collection = typeof actor.items.filter === 'function'
      ? actor.items.filter(item => item?.type === 'feat' || item?.type === 'talent')
      : Array.from(actor.items).filter(item => item?.type === 'feat' || item?.type === 'talent');
    return collection.filter(item => item?.system?.disabled !== true);
  }

  static getSkillCheckBonuses(actor, skillKey, context = {}) {
    const normalizedSkill = this.normalizeSkillKey(skillKey) ?? skillKey;
    const bonuses = [];

    for (const item of this.getSkillItems(actor)) {
      const rules = item?.system?.abilityMeta?.skillCheckBonuses;
      if (!Array.isArray(rules)) continue;

      for (const rule of rules) {
        if (!this._ruleMatchesSkill(rule, normalizedSkill)) continue;
        if (!this._ruleMatchesContext(rule, context)) continue;

        const value = this._resolveRuleValue(actor, rule);
        if (!Number.isFinite(value) || value === 0) continue;

        bonuses.push({
          id: rule.id ?? `${item.id}-${bonuses.length}`,
          sourceId: item.id,
          sourceName: item.name,
          type: rule.type ?? 'untyped',
          value,
          description: rule.description ?? `${item.name}: ${value >= 0 ? '+' : ''}${value}`,
          rule
        });
      }
    }

    return {
      total: bonuses.reduce((sum, bonus) => sum + Number(bonus.value || 0), 0),
      bonuses
    };
  }

  static getSkillRerollOptions(actor, skillKey, context = {}) {
    const normalizedSkill = this.normalizeSkillKey(skillKey) ?? skillKey;
    const options = [];

    for (const item of this.getSkillItems(actor)) {
      const rules = item?.system?.abilityMeta?.skillRerolls;
      if (!Array.isArray(rules)) continue;

      for (const rule of rules) {
        if (!this._ruleMatchesSkill(rule, normalizedSkill)) continue;
        if (!this._ruleMatchesContext(rule, context)) continue;

        options.push({
          id: rule.id ?? `${item.id}-${options.length}`,
          sourceId: item.id,
          sourceName: item.name,
          label: rule.label ?? item.name,
          outcome: this._normalizeOutcome(rule.outcome),
          skillKey: normalizedSkill,
          description: rule.description ?? item.system?.description?.value ?? '',
          oncePer: rule.oncePer ?? null
        });
      }
    }

    return options;
  }

  static resolveSkillUseSubstitution(actor, skillUse = {}, currentSkillKey = null, context = {}) {
    const normalizedCurrent = this.normalizeSkillKey(currentSkillKey) ?? this.resolveSkillUseSkillKey(skillUse);
    const sourceUse = this.getSkillUseIdentity(skillUse);

    for (const item of this.getSkillItems(actor)) {
      const rules = item?.system?.abilityMeta?.skillUseSubstitutions;
      if (!Array.isArray(rules)) continue;

      for (const rule of rules) {
        if (rule.fromSkill && normalizedCurrent && !this._skillMatchesAny(normalizedCurrent, [rule.fromSkill])) continue;
        if (!this._ruleMatchesContext(rule, { ...context, skillUse })) continue;

        const toSkill = this.normalizeSkillKey(rule.toSkill);
        if (!toSkill) continue;

        return {
          skillKey: toSkill,
          sourceName: item.name,
          sourceId: item.id,
          description: rule.description ?? `${item.name}: use ${this.getSkillLabel(toSkill)} for ${sourceUse.application || 'this skill use'}`,
          originalSkillKey: normalizedCurrent
        };
      }
    }

    return null;
  }

  static buildRerollChatOptions(actor, skillKey, roll, context = {}) {
    const options = this.getSkillRerollOptions(actor, skillKey, context);
    if (!options.length || !roll) return [];

    return options.map(option => ({
      ...option,
      actorId: actor?.id ?? '',
      originalTotal: roll.total,
      formula: roll.formula ?? '1d20',
      outcomeLabel: option.outcome === 'keepBetter' ? 'Keep better result' : 'Must accept reroll'
    }));
  }

  static async resolveChatRerollButton(button, { message = null } = {}) {
    if (!(button instanceof HTMLElement)) return null;

    const actor = game.actors?.get?.(button.dataset.actorId);
    if (!actor) {
      ui?.notifications?.warn?.('Skill reroll actor could not be resolved.');
      return null;
    }
    if (!actor.isOwner) {
      ui?.notifications?.warn?.('You do not control this actor.');
      return null;
    }

    const formula = button.dataset.formula || '1d20';
    const originalTotal = Number(button.dataset.originalTotal || 0);
    const outcome = this._normalizeOutcome(button.dataset.outcome);
    const skillKey = button.dataset.skillKey || '';
    const sourceName = button.dataset.sourceName || 'Reroll';

    const newRoll = await RollEngine.safeRoll(formula, actor.getRollData?.() ?? {}, {
      actor,
      domain: `skill.${skillKey}`,
      context: { skillKey, rerollSource: sourceName, sourceMessageId: message?.id ?? null }
    });

    if (!newRoll) {
      ui?.notifications?.error?.('Skill reroll failed.');
      return null;
    }

    const finalTotal = outcome === 'keepBetter'
      ? Math.max(originalTotal, Number(newRoll.total ?? 0))
      : Number(newRoll.total ?? 0);
    const usedNew = finalTotal === Number(newRoll.total ?? 0);

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Reroll used';

    const content = `
      <div class="swse-chat-card swse-skill-reroll-card">
        <header class="card-header">
          <h3>${sourceName}: Reroll</h3>
          <div class="card-subtitle">${this.getSkillLabel(skillKey)}</div>
        </header>
        <div class="card-content">
          <div><strong>Original:</strong> ${originalTotal}</div>
          <div><strong>Reroll:</strong> ${newRoll.total}</div>
          <div><strong>Result:</strong> ${finalTotal} ${outcome === 'keepBetter' ? (usedNew ? '(reroll kept)' : '(original kept)') : '(must accept reroll)'}</div>
        </div>
      </div>
    `;

    await createChatMessage({
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content,
      rolls: [newRoll.toJSON()],
      flags: { swse: { skillReroll: true, sourceName, skillKey, outcome, originalTotal, finalTotal } }
    });

    return { actor, message, skillKey, sourceName, originalTotal, newRoll, finalTotal, outcome };
  }

  static _ruleMatchesSkill(rule, skillKey) {
    if (!rule) return false;
    const keys = [];
    if (rule.skillKey) keys.push(rule.skillKey);
    if (rule.skill) keys.push(rule.skill);
    if (Array.isArray(rule.skillKeys)) keys.push(...rule.skillKeys);
    if (Array.isArray(rule.skills)) keys.push(...rule.skills);
    if (!keys.length || keys.includes('any')) return true;
    return this._skillMatchesAny(skillKey, keys);
  }

  static _skillMatchesAny(skillKey, values = []) {
    const normalized = this.normalizeSkillKey(skillKey) ?? skillKey;
    for (const value of values) {
      if (value === 'any') return true;
      const candidate = this.normalizeSkillKey(value) ?? value;
      if (candidate === normalized) return true;
      if (candidate === 'knowledge' && KNOWLEDGE_KEYS.has(normalized)) return true;
      if (normalized === 'knowledge' && KNOWLEDGE_KEYS.has(candidate)) return true;
    }
    return false;
  }

  static _ruleMatchesContext(rule, context = {}) {
    const skillUse = context?.skillUse ?? context?.use ?? null;
    const identity = this.getSkillUseIdentity(skillUse ?? {});

    const applications = [
      ...(Array.isArray(rule.applications) ? rule.applications : []),
      ...(Array.isArray(rule.applicationIncludes) ? rule.applicationIncludes : [])
    ];
    if (applications.length) {
      const matched = applications.some(fragment => {
        const normalized = normalizeText(fragment);
        const compact = compactKey(fragment);
        return identity.normalizedLabels.some(label => label.includes(normalized))
          || identity.compactLabels.some(label => label.includes(compact));
      });
      if (!matched) return false;
    }

    const useKeys = Array.isArray(rule.useKeys) ? rule.useKeys : [];
    if (useKeys.length) {
      const key = compactKey(identity.key ?? '');
      const matched = useKeys.some(useKey => key && key === compactKey(useKey));
      if (!matched) return false;
    }

    const requiredFlags = Array.isArray(rule.requiresContextFlags) ? rule.requiresContextFlags : [];
    if (requiredFlags.length) {
      const flags = new Set([
        ...(Array.isArray(context?.flags) ? context.flags : []),
        ...(Array.isArray(context?.contextFlags) ? context.contextFlags : [])
      ].map(String));
      if (!requiredFlags.every(flag => flags.has(String(flag)))) return false;
    }

    return true;
  }

  static _resolveRuleValue(actor, rule = {}) {
    if (Number.isFinite(Number(rule.value))) return Number(rule.value);

    switch (rule.valueFormula) {
      case 'halfDarkSideScore': {
        const dsp = Number(
          actor?.system?.darkSide?.value
          ?? actor?.system?.darkSideScore
          ?? actor?.system?.details?.darkSideScore
          ?? 0
        );
        return Math.floor(Math.max(0, dsp) / 2);
      }
      case 'abilityModifier': {
        const ability = String(rule.ability ?? '').toLowerCase();
        if (!ability) return 0;
        const value = getPropertySafe(actor, `system.abilities.${ability}.mod`, null)
          ?? getPropertySafe(actor, `system.attributes.${ability}.mod`, null)
          ?? getPropertySafe(actor, `system.derived.attributes.${ability}.mod`, null)
          ?? 0;
        return Number(value) || 0;
      }
      default:
        return 0;
    }
  }

  static _normalizeOutcome(value) {
    const normalized = compactKey(value);
    if (normalized === 'keepbetter' || normalized === 'better' || normalized === 'best') return 'keepBetter';
    return 'keepSecond';
  }
}

export default SkillFeatResolver;
