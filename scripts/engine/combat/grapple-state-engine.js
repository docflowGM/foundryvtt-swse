import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { GrappleLegalityEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js";
import {
  normalizeGrappleState as normalizeState,
  getGrappleEffects as queryGrappleEffects,
  actorHasGrappleState,
  getGrappleStateInfo
} from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-query.js";

const GRAPPLE_FLAG_SCOPE = 'swse';
const GRAPPLE_FLAG_KEY = 'grappleState';

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

// Math Integrity Freeze, round 7: none of these three states carry a
// generic flat Reflex penalty. The pre-round-7 code applied
// `system.defenses.reflex.bonus += -5` to all three (via a Foundry
// ActiveEffect ADD-mode change) -- but that number appears nowhere in the
// published Grab/Grapple/Pin rules text, and `system.defenses.reflex.bonus`
// is not even a field DefenseCalculator's canonical Reflex total reads (see
// docs/audits/v2-math-integrity-authority-ledger.md's Grapple domain
// section, "Certification-correction addendum 7"). Real baseline effects:
//   Grabbed:  cannot move; -2 on attack rolls except natural/light weapons.
//             No Reflex Defense penalty.
//   Grappled: same baseline restrictions as Grabbed. No Reflex penalty.
//   Pinned:   loses its POSITIVE Dexterity bonus to Reflex Defense -- a
//             component-aware reduction, not a flat number (a Dex -1
//             character loses nothing further; a Dex +5 character loses
//             exactly 5). This can't be expressed as a static ActiveEffect
//             ADD change, so it's computed contextually in
//             DefenseCalculator.calculate() (mirroring the same
//             component-aware philosophy already used for flat-footed's
//             own Dex-bonus removal) by querying this engine's own
//             actorHasGrappleState(actor, 'pinned') via the shared
//             grapple-state-query.js leaf module. None of these three
//             states carry an ActiveEffect `changes` payload for Reflex.
//             The attack-roll penalty (-2 while Grabbed/Grappled, non-
//             natural/light weapons) is a separate, not-yet-automated
//             effect -- see the ledger for that flagged, deferred item.
function stateConfig(state) {
  switch (normalizeState(state)) {
    case 'grabbed':
      return {
        state: 'grabbed',
        label: 'Grabbed',
        icon: 'icons/svg/net.svg',
        summary: 'Grabbed by an opponent. Cannot move; -2 on attack rolls except natural/light weapons. Resolve the next opposed grapple check or escape normally.',
        changes: []
      };
    case 'grappled':
      return {
        state: 'grappled',
        label: 'Grappled',
        icon: 'icons/svg/anchor.svg',
        summary: 'Grappled with an opponent. Same baseline restrictions as Grabbed: cannot move; -2 on attack rolls except natural/light weapons. Movement is denied and attacks are constrained by the grapple rules.',
        changes: []
      };
    case 'pinned':
      return {
        state: 'pinned',
        label: 'Pinned',
        icon: 'icons/svg/trap.svg',
        summary: 'Pinned by an opponent. Loses its positive Dexterity bonus to Reflex Defense; only escape/release actions are available until the pin ends.',
        changes: []
      };
    default:
      return null;
  }
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
    return queryGrappleEffects(actor, filters);
  }

  static getState(actor) {
    return getGrappleStateInfo(actor);
  }

  static hasState(actor, state = null) {
    return actorHasGrappleState(actor, state);
  }

  // Math Integrity Freeze, round 8: SWSE RAW gives Grabbed/Grappled a real
  // numeric penalty -- -2 on attack rolls, except attacks with natural
  // weapons or light weapons -- that round 7's grapple-state cleanup
  // correctly identified as still missing (the summary text already
  // described it; nothing computed it). Pinned is deliberately excluded:
  // a Pinned creature's attacks are already prevented by Pin's own action
  // legality (evaluateAction()'s 'pinned' branch), so layering a numeric
  // penalty on top of an already-fully-blocked action would be meaningless
  // double-gating, not a math fix.
  //
  // Reuses this engine's own existing classifyGrappledAttack() -- the same
  // classifier evaluateAction()'s 'grappled' attack-legality branch already
  // uses for exactly the same unarmed/natural/light exemption categories --
  // rather than a second, independently-maintained light/natural weapon
  // heuristic. No single codebase-wide canonical light/natural-weapon
  // classifier exists to delegate to instead (a confirmed, separately
  // flagged gap -- see the ledger's Grapple domain section, addendum 8);
  // reusing this domain's own established classifier keeps the numeric
  // penalty and the legality gate from ever disagreeing with each other.
  //
  // Presence-based, not effect-count-based: an actor either has the
  // Grabbed/Grappled category or doesn't (GrappleStateEngine.getState()
  // already collapses multiple effects to one best state), so this can
  // never double-apply even if stale/multiple grapple-state effects exist.
  static getAttackPenalty(actor, weapon) {
    if (!actorHasGrappleState(actor, 'grabbed') && !actorHasGrappleState(actor, 'grappled')) return 0;
    const classification = classifyGrappledAttack(actor, { weapon });
    const exempt = classification.legal === true && classification.known === true;
    return exempt ? 0 : -2;
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
