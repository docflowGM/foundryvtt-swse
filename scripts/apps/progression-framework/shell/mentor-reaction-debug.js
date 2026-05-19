/**
 * Mentor reaction debug console helpers.
 *
 * These helpers intentionally live beside the progression shell instead of in a
 * step plugin so they can inspect the full mentor pipeline: shell state,
 * session mentorContext, router tuning, and diagnostic breadcrumbs.
 */

import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const SYSTEM_ID = 'foundryvtt-swse';

function isGM() {
  return globalThis.game?.user?.isGM === true;
}

function getSetting(key, fallback = null) {
  try {
    return globalThis.game?.settings?.get?.(SYSTEM_ID, key) ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function resolveShell(target = null) {
  if (target?.progressionSession && target?.mentorChoiceReactions) return target;

  const active = globalThis.game?.__swseActiveProgressionShell || null;
  if (!target) return active;

  const token = String(target?.id || target || '').trim();
  if (!token) return active;

  if (active?.actor?.id === token || active?.actor?.uuid === token || active?.actor?.name === token) return active;
  return active;
}

function cloneSafe(value, fallback = null) {
  try {
    if (value == null) return fallback;
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

function last(list, count = 10) {
  return Array.isArray(list) ? list.slice(-count) : [];
}

export function buildMentorRailDebugSnapshot(shell = null) {
  const resolved = resolveShell(shell);
  if (!resolved) {
    return {
      ok: false,
      reason: 'No active progression shell found.',
      hint: 'Open chargen/level-up, then run game.swse.debugMentorRail().',
    };
  }

  const descriptor = resolved.steps?.[resolved.currentStepIndex] || resolved.currentDescriptor || null;
  const session = resolved.progressionSession || null;
  const diagnostics = session?.mentorDiagnostics || {};
  const router = resolved.mentorChoiceReactions || null;

  return {
    ok: true,
    actor: resolved.actor ? { id: resolved.actor.id, name: resolved.actor.name, type: resolved.actor.type } : null,
    mode: resolved.mode || null,
    currentStep: descriptor ? {
      index: resolved.currentStepIndex,
      stepId: descriptor.stepId,
      label: descriptor.label,
      category: descriptor.category,
    } : null,
    mentorState: cloneSafe(resolved.mentor, {}),
    mentorContext: typeof session?.getMentorContext === 'function'
      ? session.getMentorContext()
      : cloneSafe(session?.mentorContext, null),
    reactionSettings: router?.getTuningSnapshot?.() || {
      mode: getSetting('mentorReactionMode', 'full'),
      focusReactionsEnabled: getSetting('mentorFocusReactionsEnabled', true),
      debugEnabled: getSetting('mentorReactionDebug', false),
    },
    router: router?.getDebugSnapshot?.() || null,
    focusedItem: cloneSafe(resolved.focusedItem, null),
    committedSelection: cloneSafe(resolved.committedSelection, null),
    diagnostics: {
      contextUpdates: last(diagnostics.contextUpdates, 10),
      preservedContexts: last(diagnostics.preservedContexts, 10),
      choiceReactions: last(diagnostics.choiceReactions, 10),
      skippedReactions: last(diagnostics.skippedReactions, 10),
      coverageWarnings: last(diagnostics.coverageWarnings, 10),
      fallbackPaths: last(diagnostics.fallbackPaths, 10),
    },
  };
}

function printSnapshot(snapshot) {
  if (!snapshot?.ok) {
    console.warn('[SWSE MentorRail Debug]', snapshot?.reason || 'No snapshot available.', snapshot?.hint || '');
    return snapshot;
  }

  console.groupCollapsed(`%cSWSE Mentor Rail Debug%c ${snapshot.actor?.name || 'Unknown Actor'} :: ${snapshot.currentStep?.stepId || 'no-step'}`, 'color:#67e8f9;font-weight:bold', 'color:inherit');
  console.log('Actor', snapshot.actor);
  console.log('Current step', snapshot.currentStep);
  console.log('Mentor state', snapshot.mentorState);
  console.log('Mentor context', snapshot.mentorContext);
  console.log('Reaction settings', snapshot.reactionSettings);
  console.log('Router', snapshot.router);
  console.log('Focused item', snapshot.focusedItem);
  console.log('Committed selection', snapshot.committedSelection);

  if (snapshot.diagnostics?.choiceReactions?.length) {
    console.table(snapshot.diagnostics.choiceReactions);
  }
  if (snapshot.diagnostics?.skippedReactions?.length) {
    console.table(snapshot.diagnostics.skippedReactions);
  }
  if (snapshot.diagnostics?.coverageWarnings?.length) {
    console.table(snapshot.diagnostics.coverageWarnings);
  }
  console.groupEnd();
  return snapshot;
}

export function registerMentorReactionDebug(shell = null) {
  try {
    const gameRef = globalThis.game;
    if (!gameRef) return;
    gameRef.swse = gameRef.swse || {};

    gameRef.swse.debugMentorRail = (target = null) => {
      const snapshot = buildMentorRailDebugSnapshot(resolveShell(target) || shell);
      return printSnapshot(snapshot);
    };

    gameRef.swse.validateMentorReactions = (target = null) => {
      const active = resolveShell(target) || shell;
      const report = active?.mentorChoiceReactions?.validateReactionCoverage?.({ force: true }) || {
        ok: false,
        reason: 'No active mentor reaction router found.',
      };
      if (report?.ok) console.table(report.coverage || []);
      else console.warn('[SWSE MentorRail Debug] Reaction coverage unavailable', report);
      return report;
    };

    gameRef.swse.setMentorReactionMode = async (mode = 'full') => {
      const next = String(mode || 'full').trim().toLowerCase();
      if (!['full', 'important', 'off'].includes(next)) {
        throw new Error(`Invalid mentor reaction mode: ${mode}. Use full, important, or off.`);
      }
      await gameRef.settings?.set?.(SYSTEM_ID, 'mentorReactionMode', next);
      swseLogger.info?.('[MentorRail] Mentor reaction mode changed', { mode: next });
      return next;
    };

    gameRef.swse.setMentorFocusReactions = async (enabled = true) => {
      const next = enabled === true || enabled === 'true' || enabled === 1;
      await gameRef.settings?.set?.(SYSTEM_ID, 'mentorFocusReactionsEnabled', next);
      swseLogger.info?.('[MentorRail] Mentor focus reactions changed', { enabled: next });
      return next;
    };

    if (isGM() && getSetting('mentorReactionDebug', false)) {
      swseLogger.debug?.('[MentorRail] Debug helpers registered: game.swse.debugMentorRail(), game.swse.validateMentorReactions()');
    }
  } catch (err) {
    swseLogger.warn('[MentorRail] Failed to register mentor reaction debug helpers', err);
  }
}

export default registerMentorReactionDebug;
