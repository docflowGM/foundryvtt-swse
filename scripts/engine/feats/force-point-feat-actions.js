import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ForcePointFeatRules } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-rules.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch (_err) { return []; }
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeName(featName);
  return actorItems(actor).some(item => item?.type === 'feat' && item?.system?.disabled !== true && normalizeName(item?.name) === wanted);
}

function activeEncounterId() {
  return game?.combat?.started && game.combat?.id ? game.combat.id : null;
}

function actorLevel(actor) {
  const value = actor?.system?.level?.heroic
    ?? actor?.system?.details?.level
    ?? actor?.system?.level
    ?? actor?.system?.progression?.level
    ?? 1;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function forcePointGainRules(actor, type) {
  return ForcePointFeatRules.getForcePointGainRules(actor).filter(rule => rule?.type === type);
}

function bonusPoolEntries(pool = {}) {
  const entries = Array.isArray(pool.entries) ? pool.entries.map((entry, index) => ({
    id: String(entry?.id ?? `bonus-${index}`),
    source: String(entry?.source ?? 'Bonus Force Point'),
    value: Math.max(0, Number(entry?.value ?? 0) || 0),
    max: Math.max(0, Number(entry?.max ?? entry?.value ?? 0) || 0),
    restrictions: entry?.restrictions ?? entry?.restriction ?? '',
    expires: entry?.expires ?? '',
    encounterId: entry?.encounterId ?? null,
    createdAt: entry?.createdAt ?? null
  })).filter(entry => entry.value > 0) : [];

  const legacyValue = Math.max(0, Number(pool.value ?? 0) || 0);
  const entryTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
  if (!entries.length && legacyValue > 0) {
    entries.push({ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: legacyValue, max: legacyValue, restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
  } else if (legacyValue > entryTotal) {
    entries.push({ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: legacyValue - entryTotal, max: legacyValue - entryTotal, restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
  }
  return entries;
}

function buildBonusPool(entries = [], existing = {}) {
  const clean = entries.filter(entry => Math.max(0, Number(entry.value) || 0) > 0);
  const value = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
  const max = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
  return {
    ...existing,
    value,
    max: Math.max(value, max),
    sources: [...new Set(clean.map(entry => entry.source).filter(Boolean))],
    entries: clean,
    note: existing.note || 'Bonus Force Points are spent before normal Force Points and may have source-specific restrictions.'
  };
}

async function postForcePointFeatMessage(actor, title, body, flags = {}) {
  return createChatMessage({
    speaker: ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor?.name ?? 'Force Point Feat' },
    content: `<section class="swse-chat-card swse-force-point-feat-card"><header class="swse-chat-card__header"><strong>${title}</strong></header><div class="swse-chat-card__body">${body}</div></section>`,
    flags: { 'foundryvtt-swse': { forcePointFeatAction: true, ...flags } }
  });
}

export class ForcePointFeatActions {
  static canUse(actor, featName) {
    if (!actor) return false;
    const normalized = normalizeName(featName);
    switch (normalized) {
      case 'force boon':
      case 'strong in the force':
      case 'force readiness':
      case 'jedi familiarity':
      case 'pall of the dark side':
      case 'unstoppable force':
      case 'confident success':
      case 'spacer s surge':
      case "spacer's surge":
      case 'gungan weapon master':
      case 'jedi heritage':
        return actorHasFeat(actor, featName) || ForcePointFeatRules.collectResourceRules(actor, 'forcePoints').some(rule => normalizeName(rule.source ?? rule.sourceName ?? '') === normalized);
      default:
        return actorHasFeat(actor, featName);
    }
  }

  static getForcePointActionPolicy(actor) {
    return ForcePointFeatRules.getForcePointActionPolicy(actor);
  }

  static canSpendForcePointOffTurn(actor) {
    return ForcePointFeatRules.canSpendOffTurn(actor);
  }

  static getForcePointDieSize(actor, context = {}) {
    return ForcePointFeatRules.getForcePointDieSize(actor, context);
  }

  static getUseTheForceDefenseBonus(actor, context = {}) {
    return ForcePointFeatRules.getUseTheForceDefenseBonus(actor, context);
  }

  static getSenseForceDetectionResistanceBonus(actor, context = {}) {
    return ForcePointFeatRules.getSenseForceDetectionResistanceBonus(actor, context);
  }

  static getForceTrainingExtraPowerTotal(actor) {
    return ForcePointFeatRules.getForceTrainingExtraPowerTotal(actor);
  }

  static async grantTemporaryForcePoint(actor, options = {}) {
    if (!actor) return { granted: 0, reason: 'missing-actor' };
    const amount = Math.max(1, Number(options.amount ?? 1) || 1);
    const source = String(options.source ?? 'Temporary Force Point');
    const encounterId = options.encounterId ?? activeEncounterId();
    const existingPool = actor.getFlag?.('swse', 'bonusForcePoints') ?? {};
    const entries = bonusPoolEntries(existingPool);
    const id = options.id ?? `${normalizeToken(source)}-${encounterId ?? 'no-encounter'}-${Date.now()}`;

    entries.push({
      id,
      source,
      value: amount,
      max: amount,
      restrictions: options.restrictions ?? options.restriction ?? 'Temporary Force Point',
      expires: options.expires ?? 'encounter',
      encounterId,
      createdAt: Date.now()
    });

    await ActorEngine.updateActor(actor, {
      'flags.swse.bonusForcePoints': buildBonusPool(entries, existingPool)
    }, { source: 'ForcePointFeatActions.grantTemporaryForcePoint', render: false });

    if (options.postChat !== false) {
      await postForcePointFeatMessage(actor, source, `<p>${actor.name} gains <strong>${amount}</strong> temporary Force Point${amount === 1 ? '' : 's'}${encounterId ? ' for this encounter' : ''}.</p>`, { source, amount, temporary: true, encounterId });
    }

    return { granted: amount, source, encounterId, id };
  }

  static async grantJediFamiliarity(actor, context = {}) {
    const rule = forcePointGainRules(actor, 'TEMP_FP_ON_ALLIED_FORCE_EFFECT')[0];
    if (!rule && !actorHasFeat(actor, 'Jedi Familiarity')) return { granted: 0, reason: 'missing-feat' };
    const encounterId = activeEncounterId() ?? context.encounterId ?? null;
    if (!encounterId) return { granted: 0, reason: 'no-active-encounter' };

    const flag = actor.getFlag?.('foundryvtt-swse', 'jediFamiliarityUsedThisEncounter');
    if (flag === encounterId) return { granted: 0, reason: 'already-used-this-encounter' };

    const ally = context.ally === true || context.sourceIsAlly === true || context.originatingAlly === true;
    const forceEffect = context.forcePower === true || context.forceTalent === true || context.requiresUseTheForceCheck === true || ['force-power', 'force-talent'].includes(normalizeToken(context.effectType));
    const harmful = context.damage > 0 || context.damagesTarget === true || context.conditionShift > 0 || context.movesDownConditionTrack === true;
    if (!ally) return { granted: 0, reason: 'source-not-ally' };
    if (!forceEffect) return { granted: 0, reason: 'not-force-power-or-talent' };
    if (harmful) return { granted: 0, reason: 'effect-damaged-or-moved-ct' };

    const result = await this.grantTemporaryForcePoint(actor, {
      source: rule?.sourceName ?? rule?.source ?? 'Jedi Familiarity',
      amount: Number(rule?.amount ?? 1) || 1,
      restrictions: 'Must be spent before the end of the encounter.',
      expires: 'encounter',
      encounterId,
      id: `jedi-familiarity-${encounterId}`,
      postChat: context.postChat
    });
    await actor.setFlag?.('foundryvtt-swse', 'jediFamiliarityUsedThisEncounter', encounterId);
    return result;
  }

  static async grantSpacersSurge(actor, context = {}) {
    const rule = forcePointGainRules(actor, 'TEMP_FP_ON_NATURAL_20_SKILL_CHECK')[0];
    if (!rule && !actorHasFeat(actor, "Spacer's Surge")) return { granted: 0, reason: 'missing-feat' };
    const skill = normalizeToken(context.skill ?? context.skillKey ?? context.check ?? '');
    const natural = Number(context.natural ?? context.d20 ?? context.diceTotal ?? 0);
    if (skill && skill !== 'pilot') return { granted: 0, reason: 'not-pilot' };
    if (natural !== 20) return { granted: 0, reason: 'not-natural-20' };

    return this.grantTemporaryForcePoint(actor, {
      source: rule?.sourceName ?? rule?.source ?? "Spacer's Surge",
      amount: Number(rule?.amount ?? 1) || 1,
      restrictions: 'Must be spent before the end of the encounter.',
      expires: 'encounter',
      encounterId: activeEncounterId() ?? context.encounterId ?? null,
      id: `spacers-surge-${activeEncounterId() ?? context.encounterId ?? Date.now()}`,
      postChat: context.postChat
    });
  }

  static async grantConfidentSuccess(actor, context = {}) {
    const rule = forcePointGainRules(actor, 'GAIN_NORMAL_FP_ON_SKILL_APPLICATION_SUCCESS')[0];
    if (!rule && !actorHasFeat(actor, 'Confident Success')) return { gained: 0, reason: 'missing-feat' };
    const skill = normalizeToken(context.skill ?? context.skillKey ?? context.check ?? '');
    const application = normalizeToken(context.application ?? context.use ?? context.action ?? '');
    if (context.success === false || context.succeeded === false) return { gained: 0, reason: 'not-successful' };
    if (skill && skill !== 'gather-information') return { gained: 0, reason: 'not-gather-information' };
    if (application && application !== 'learn-secret-information') return { gained: 0, reason: 'not-learn-secret-information' };

    const level = actorLevel(actor);
    const flag = actor.getFlag?.('foundryvtt-swse', 'confidentSuccessForcePointGains') ?? {};
    const used = Number(flag.level === level ? flag.count : 0) || 0;
    const maxPerLevel = Math.max(1, Number(rule?.maxPerLevel ?? 3) || 3);
    if (used >= maxPerLevel) return { gained: 0, reason: 'level-cap-reached', count: used, maxPerLevel };

    const amount = Math.max(1, Number(rule?.amount ?? 1) || 1);
    const result = await ActorEngine.gainForcePoints(actor, amount);
    if (result?.gained > 0) {
      await actor.setFlag?.('foundryvtt-swse', 'confidentSuccessForcePointGains', { level, count: used + result.gained });
      if (context.postChat !== false) {
        await postForcePointFeatMessage(actor, 'Confident Success', `<p>${actor.name} gains <strong>${result.gained}</strong> Force Point after successfully learning secret information.</p>`, { source: 'Confident Success', amount: result.gained, level, count: used + result.gained });
      }
    }
    return { ...result, level, count: used + Number(result?.gained ?? 0), maxPerLevel };
  }

  static registerGlobals() {
    globalThis.SWSE ??= {};
    globalThis.SWSE.ForcePointFeatActions = ForcePointFeatActions;
    if (globalThis.game?.swse) game.swse.ForcePointFeatActions = ForcePointFeatActions;
  }
}

export function registerForcePointFeatActions() {
  ForcePointFeatActions.registerGlobals();
}

export default ForcePointFeatActions;
