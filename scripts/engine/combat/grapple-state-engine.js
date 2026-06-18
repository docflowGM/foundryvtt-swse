import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { GrappleLegalityEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js";
import { activeEffectChangeType } from "/systems/foundryvtt-swse/scripts/utils/active-effect-change-utils.js";

const GRAPPLE_FLAG_SCOPE = 'swse';
const GRAPPLE_FLAG_KEY = 'grappleState';

function normalizeState(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (key === 'grab' || key === 'grabbed') return 'grabbed';
  if (key === 'grapple' || key === 'grappled') return 'grappled';
  if (key === 'pin' || key === 'pinned') return 'pinned';
  return null;
}

function actorId(actor) {
  return actor?.id ?? actor?._id ?? null;
}

function actorUuid(actor) {
  return actor?.uuid ?? null;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function stateConfig(state) {
  switch (normalizeState(state)) {
    case 'grabbed':
      return {
        state: 'grabbed',
        label: 'Grabbed',
        icon: 'icons/svg/net.svg',
        summary: 'Grabbed by an opponent. Resolve the next opposed grapple check or escape normally.',
        changes: [
          { key: 'system.defenses.reflex.bonus', ...activeEffectChangeType('add'), value: -5 }
        ]
      };
    case 'grappled':
      return {
        state: 'grappled',
        label: 'Grappled',
        icon: 'icons/svg/anchor.svg',
        summary: 'Grappled with an opponent. Movement is denied and attacks are constrained by the grapple rules.',
        changes: [
          { key: 'system.defenses.reflex.bonus', ...activeEffectChangeType('add'), value: -5 }
        ]
      };
    case 'pinned':
      return {
        state: 'pinned',
        label: 'Pinned',
        icon: 'icons/svg/trap.svg',
        summary: 'Pinned by an opponent. Treat Dexterity bonus to Reflex and available actions according to the Pin rules.',
        changes: [
          { key: 'system.defenses.reflex.bonus', ...activeEffectChangeType('add'), value: -5 }
        ]
      };
    default:
      return null;
  }
}

function grappleFlag(effect) {
  return effect?.flags?.swse?.[GRAPPLE_FLAG_KEY]
    ?? (effect?.flags?.swse?.grapple ? { state: effect.flags.swse.grapple, sourceId: effect.flags.swse.source ?? null } : null);
}

function effectMatches(effect, { sourceActor = null, state = null } = {}) {
  const flag = grappleFlag(effect);
  if (!flag) return false;
  const wantedState = normalizeState(state);
  if (wantedState && normalizeState(flag.state ?? flag) !== wantedState) return false;
  const sourceId = actorId(sourceActor);
  if (sourceId && flag.sourceId && flag.sourceId !== sourceId) return false;
  return true;
}


function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(normalizeList);
  if (typeof value === 'object') return normalizeList(value.key ?? value.id ?? value.name ?? value.label ?? value.value ?? '');
  return [String(value).trim().toLowerCase()].filter(Boolean);
}

function actionText(action = {}) {
  const bits = [];
  const push = (value) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach(push);
      return;
    }
    if (typeof value === 'object') {
      push(value.key ?? value.id ?? value.name ?? value.label ?? value.value ?? value.skill ?? '');
      return;
    }
    bits.push(String(value));
  };
  push(action.id);
  push(action.key);
  push(action.name);
  push(action.label);
  push(action.actionId);
  push(action.resolutionMode);
  push(action.actionType);
  push(action.type);
  push(action.actionCost);
  push(action.contextTags);
  push(action.tags);
  push(action.ruleData?.grappleMode);
  push(action.ruleData?.requestedPackage);
  return bits.join(' ').toLowerCase();
}

function hasAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function actionEconomy(action = {}) {
  return String(action.actionType ?? action.type ?? action.action?.type ?? action.actionCost ?? action.costType ?? '').toLowerCase();
}

function isGrappleControlAction(action = {}) {
  const text = actionText(action);
  const mode = String(action.ruleData?.grappleMode ?? '').toLowerCase();
  return action.resolutionMode === 'grapple'
    || normalizeList(action.contextTags).includes('grapple')
    || ['grab', 'check', 'pin', 'escape', 'release', 'trip', 'throw', 'crush'].includes(mode)
    || hasAny(text, ['grapple', 'grab', 'pin', 'escape grapple', 'release grapple', 'trip grapple', 'throw grapple', 'crush grapple', 'trip grappled', 'throw grappled', 'crush pinned']);
}

function isEscapeOrRelease(action = {}) {
  const text = actionText(action);
  const mode = String(action.ruleData?.grappleMode ?? '').toLowerCase();
  return ['escape', 'release'].includes(mode) || hasAny(text, ['escape grapple', 'release grapple']);
}

function isMovementAction(action = {}) {
  const text = actionText(action);
  return hasAny(text, ['move action', 'withdraw', 'run', 'charge', 'stand up', 'crawl', 'tumble past', 'move object']);
}

function isFullAttackAction(action = {}) {
  const text = actionText(action);
  const economy = actionEconomy(action);
  return action.resolutionMode === 'fullAttack' || economy === 'full-round' || hasAny(text, ['full attack', 'double attack', 'triple attack', 'two weapon fighting']);
}

function isAttackAction(action = {}) {
  const text = actionText(action);
  return action.isAttack === true
    || action.resolutionMode === 'attack'
    || String(action.domain ?? '').toLowerCase() === 'attack'
    || String(action.category ?? '').toLowerCase() === 'attack'
    || hasAny(text, ['attack', 'strike', 'shoot', 'fire weapon']);
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function findActorItem(actor, id) {
  if (!actor || !id) return null;
  return actor.items?.get?.(id)
    ?? actorItems(actor).find(item => item?.id === id || item?._id === id || item?.uuid === id)
    ?? null;
}

function itemPropertyTags(item) {
  const system = item?.system ?? {};
  const flags = item?.flags?.swse ?? {};
  return normalizeList([
    item?.name,
    item?.type,
    system.slug,
    system.key,
    system.weaponType,
    system.weaponGroup,
    system.weaponCategory,
    system.category,
    system.subtype,
    system.classification,
    system.size,
    system.handedness,
    system.hands,
    system.properties,
    system.traits,
    flags.weaponType,
    flags.weaponGroup,
    flags.grappleWeaponCategory
  ]);
}

function actionWeapon(actor, action = {}) {
  return action.weapon
    ?? action.item
    ?? findActorItem(actor, action.itemId ?? action.sourceItemId ?? action.weaponId ?? action.ruleData?.itemId ?? action.ruleData?.weaponId);
}

function weaponTags(actor, action = {}) {
  const item = actionWeapon(actor, action);
  return normalizeList([
    action.weaponType,
    action.weaponGroup,
    action.weaponCategory,
    action.ruleData?.weaponType,
    action.ruleData?.weaponGroup,
    action.ruleData?.weaponCategory,
    action.weapon?.type,
    action.weapon?.system?.weaponType,
    action.weapon?.system?.weaponGroup,
    action.weapon?.system?.category,
    itemPropertyTags(item)
  ]);
}

function classifyGrappledAttack(actor, action = {}) {
  const tags = weaponTags(actor, action);
  const text = `${actionText(action)} ${tags.join(' ')}`.toLowerCase();
  const item = actionWeapon(actor, action);
  const explicitLegal = action.ruleData?.grappleLegalAttack === true
    || action.grappleLegalAttack === true
    || item?.system?.grappleLegalAttack === true
    || item?.flags?.swse?.grappleLegalAttack === true;
  const explicitIllegal = action.ruleData?.grappleLegalAttack === false
    || action.grappleLegalAttack === false
    || item?.system?.grappleLegalAttack === false
    || item?.flags?.swse?.grappleLegalAttack === false;

  if (explicitLegal) {
    return { legal: true, known: true, label: 'Grapple attack legal', reason: 'This attack is explicitly marked as legal while Grappled.' };
  }
  if (explicitIllegal) {
    return { legal: false, known: true, label: 'Blocked by Grapple', reason: 'This attack is explicitly marked as illegal while Grappled.' };
  }

  const legalTerms = ['unarmed', 'natural', 'natural weapon', 'claw', 'bite', 'talon', 'pincer', 'tentacle', 'light', 'light weapon', 'lightsaber-light'];
  if (legalTerms.some(term => text.includes(term))) {
    return { legal: true, known: true, label: 'Grapple attack legal', reason: 'This attack is marked as unarmed, natural, or light and is compatible with grapple restrictions.' };
  }

  const illegalTerms = ['two-handed', 'two handed', '2-handed', '2 handed', 'rifle', 'carbine', 'heavy', 'launcher', 'cannon', 'staff', 'polearm', 'longarm', 'double weapon', 'double-bladed', 'double bladed'];
  if (illegalTerms.some(term => text.includes(term))) {
    return { legal: false, known: true, label: 'Blocked by Grapple', reason: 'Known two-handed, heavy, rifle, launcher, staff, or other non-light attacks are not allowed while Grappled.' };
  }

  return { legal: true, known: false, label: 'Grappled: GM confirm', reason: 'Attacks while grappled are limited to unarmed, natural, or light weapons. Confirm this weapon before rolling.' };
}

function isGrappleLegalAttack(actorOrAction = {}, maybeAction = null) {
  const actor = maybeAction ? actorOrAction : null;
  const action = maybeAction ?? actorOrAction;
  return classifyGrappledAttack(actor, action).legal === true;
}

function buildEffectData(actor, state, sourceActor = null, options = {}) {
  const config = stateConfig(state);
  if (!config) return null;
  const sourceId = actorId(sourceActor);
  const targetId = actorId(actor);
  const origin = actorUuid(sourceActor) ?? options.origin ?? null;
  const sourceName = sourceActor?.name ?? options.sourceName ?? null;
  const description = options.description ?? config.summary;
  return {
    label: config.label,
    name: config.label,
    icon: config.icon,
    origin,
    disabled: false,
    duration: options.duration ?? {},
    changes: config.changes,
    description: `<p>${escapeHTML(description)}</p>${sourceName ? `<p><strong>Source:</strong> ${escapeHTML(sourceName)}</p>` : ''}`,
    flags: {
      swse: {
        grapple: config.state,
        [GRAPPLE_FLAG_KEY]: {
          state: config.state,
          sourceId,
          sourceUuid: actorUuid(sourceActor),
          sourceName,
          targetId,
          targetUuid: actorUuid(actor),
          appliedAt: Date.now(),
          actionId: options.actionId ?? null,
          workflowId: options.workflowId ?? null
        }
      }
    }
  };
}

export class GrappleStateEngine {
  static normalizeState(value) {
    return normalizeState(value);
  }

  static getGrappleEffects(actor, filters = {}) {
    const effects = Array.from(actor?.effects ?? []);
    return effects.filter(effect => effectMatches(effect, filters));
  }

  static getState(actor) {
    const effects = this.getGrappleEffects(actor);
    if (!effects.length) return null;
    const rank = { grabbed: 1, grappled: 2, pinned: 3 };
    let best = null;
    for (const effect of effects) {
      const flag = grappleFlag(effect);
      const state = normalizeState(flag?.state ?? flag);
      if (!state) continue;
      if (!best || (rank[state] ?? 0) > (rank[best.state] ?? 0)) {
        best = {
          state,
          effect,
          sourceId: flag?.sourceId ?? effect?.flags?.swse?.source ?? null,
          sourceName: flag?.sourceName ?? null,
          targetId: flag?.targetId ?? actorId(actor)
        };
      }
    }
    return best;
  }

  static hasState(actor, state = null) {
    return this.getGrappleEffects(actor, { state }).length > 0;
  }


  static getRestrictionSummary(actor) {
    const stateInfo = this.getState(actor);
    const state = stateInfo?.state ?? null;
    if (!state) {
      return { restricted: false, state: null, label: '', summary: '' };
    }

    if (state === 'grabbed') {
      return {
        restricted: true,
        state,
        label: 'Grabbed',
        summary: 'Grabbed: finish the opposed grapple sequence or escape/release as appropriate.',
        hard: false
      };
    }

    if (state === 'grappled') {
      return {
        restricted: true,
        state,
        label: 'Grappled',
        summary: 'Grappled: movement/full-attack style actions are restricted. Use grapple actions, escape, release, or GM-confirmed light/unarmed attacks.',
        hard: false
      };
    }

    if (state === 'pinned') {
      return {
        restricted: true,
        state,
        label: 'Pinned',
        summary: 'Pinned: only escape/release style grapple actions are available until the pin ends.',
        hard: true
      };
    }

    return { restricted: false, state: null, label: '', summary: '' };
  }

  static evaluateAction(actor, action = {}) {
    const summary = this.getRestrictionSummary(actor);
    if (!summary.restricted) return { allowed: true, restricted: false, state: null, label: 'Available' };

    const state = summary.state;
    const text = actionText(action);
    const grappleAction = isGrappleControlAction(action);
    const escapeOrRelease = isEscapeOrRelease(action);

    if (state === 'grabbed') {
      const blocked = isFullAttackAction(action) || hasAny(text, ['charge', 'run', 'withdraw']);
      return {
        allowed: !blocked,
        restricted: true,
        state,
        label: blocked ? 'Blocked by Grabbed' : 'Grabbed: GM confirm',
        reason: blocked ? 'Grabbed creatures should resolve or escape the grab before movement/full-attack actions.' : summary.summary,
        soft: !blocked
      };
    }

    if (state === 'grappled') {
      if (grappleAction || escapeOrRelease) {
        return { allowed: true, restricted: true, state, label: 'Grapple legal', reason: 'This action resolves the current grapple.' };
      }
      if (isFullAttackAction(action) || isMovementAction(action)) {
        return {
          allowed: false,
          restricted: true,
          state,
          label: 'Blocked by Grapple',
          reason: 'Grappled creatures cannot use movement/full-attack style actions until they escape or the grapple ends.'
        };
      }
      if (isAttackAction(action)) {
        const attackLegality = classifyGrappledAttack(actor, action);
        return {
          allowed: attackLegality.legal !== false,
          restricted: true,
          state,
          label: attackLegality.label,
          reason: attackLegality.reason,
          soft: attackLegality.legal !== false && attackLegality.known !== true,
          details: {
            attackerSize: GrappleLegalityEngine.getSizeInfo(actor),
            reachSquares: GrappleLegalityEngine.getReachSquares(actor),
            grappleAttackKnown: attackLegality.known === true,
            grappleAttackLegal: attackLegality.legal !== false
          }
        };
      }
      return {
        allowed: true,
        restricted: true,
        state,
        label: 'Grappled: GM confirm',
        reason: summary.summary,
        soft: true
      };
    }

    if (state === 'pinned') {
      if (escapeOrRelease) {
        return { allowed: true, restricted: true, state, label: 'Pin escape legal', reason: 'Pinned creatures may try to escape the pin/grapple.' };
      }
      return {
        allowed: false,
        restricted: true,
        state,
        label: 'Blocked by Pin',
        reason: 'Pinned creatures cannot use this action until the pin is escaped or released.'
      };
    }

    return { allowed: true, restricted: false, state: null, label: 'Available' };
  }

  static async confirmAction(actor, action = {}, options = {}) {
    const result = this.evaluateAction(actor, action);
    if (result?.allowed === false) {
      ui?.notifications?.warn?.(result.reason || result.label || 'This action is blocked by the current grapple state.');
      return false;
    }
    if (result?.soft === true && options.confirmSoft !== false) {
      if (typeof globalThis.Dialog?.confirm === 'function') {
        const title = options.title ?? 'Confirm Grapple Action';
        const actionName = action?.name ?? action?.label ?? action?.id ?? 'Action';
        const content = `<form class="swse-grapple-confirm"><p><strong>${escapeHTML(actionName)}</strong></p><p>${escapeHTML(result.reason || result.label || 'This action needs table confirmation while Grappled.')}</p></form>`;
        const confirmed = await globalThis.Dialog.confirm({ title, content, yes: 'Proceed', no: 'Cancel', defaultYes: false });
        return confirmed !== false;
      }
      ui?.notifications?.warn?.(result.reason || result.label || 'This action needs GM/player confirmation while Grappled.');
    }
    return true;
  }

  static async setState(actor, state, sourceActor = null, options = {}) {
    const normalized = normalizeState(state);
    if (!actor || !normalized) return null;
    await this.clearState(actor, { sourceActor: options.keepOtherSources ? sourceActor : null, quiet: true });
    const effectData = buildEffectData(actor, normalized, sourceActor, options);
    if (!effectData) return null;
    const created = await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effectData], {
      render: options.render ?? true
    });
    return Array.isArray(created) ? created[0] : created;
  }

  static async clearState(actor, { sourceActor = null, state = null, quiet = false } = {}) {
    if (!actor) return [];
    const effects = this.getGrappleEffects(actor, { sourceActor, state });
    const ids = effects.map(effect => effect.id).filter(Boolean);
    if (!ids.length) return [];
    await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', ids, { render: true });
    if (!quiet) ui?.notifications?.info?.(`${actor.name} is no longer ${state ? normalizeState(state) : 'in a grapple state'}.`);
    return ids;
  }

  static async clearPair(actorA, actorB, options = {}) {
    const cleared = [];
    let clearedA = [];
    let clearedB = [];
    if (actorA) clearedA = await this.clearState(actorA, { sourceActor: actorB, quiet: true });
    if (actorB) clearedB = await this.clearState(actorB, { sourceActor: actorA, quiet: true });

    // Legacy data did not always store source ids reliably. If a source-scoped
    // clear found nothing for either actor, clear that actor's remaining grapple
    // effects so escape/release does not leave stale pinned/grappled state behind.
    if (actorA && !clearedA.length) clearedA = await this.clearState(actorA, { quiet: true });
    if (actorB && !clearedB.length) clearedB = await this.clearState(actorB, { quiet: true });

    cleared.push(...clearedA, ...clearedB);
    if (!options.quiet && cleared.length) ui?.notifications?.info?.('Grapple state cleared.');
    return cleared;
  }

  static async advancePair(attacker, defender, state, options = {}) {
    const normalized = normalizeState(state);
    if (!attacker || !defender || !normalized) return null;

    if (normalized === 'grabbed') {
      return await this.setState(defender, 'grabbed', attacker, options);
    }

    if (normalized === 'grappled') {
      const attackerEffect = await this.setState(attacker, 'grappled', defender, options);
      const defenderEffect = await this.setState(defender, 'grappled', attacker, options);
      return { attackerEffect, defenderEffect };
    }

    if (normalized === 'pinned') {
      // The grappler remains grappled; the pinned creature receives the stronger
      // state. Do not mutate condition track here: Pin is a control state, not CT damage.
      await this.setState(attacker, 'grappled', defender, { ...options, quiet: true });
      const defenderEffect = await this.setState(defender, 'pinned', attacker, options);
      return { defenderEffect };
    }

    return null;
  }
}

export default GrappleStateEngine;
