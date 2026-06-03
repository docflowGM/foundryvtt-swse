// scripts/sheets/v2/character-sheet/chargen-onboarding.js
/**
 * Datapad registration prompt for first player access to incomplete character sheets.
 *
 * This is intentionally a thin onboarding layer:
 * - detects incomplete progression state using existing authorities
 * - asks before launching chargen/progression
 * - stores only prompt-suppression state, never character data
 */

import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { ActorAbilityBridge } from "/systems/foundryvtt-swse/scripts/adapters/ActorAbilityBridge.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const FLAG_SCOPE = 'foundryvtt-swse';
const FLAG_DISABLED_USERS = 'datapad.registrationPromptDisabledUsers';
const SESSION_SUPPRESSION_KEY = 'swse.datapadRegistrationPromptSuppressed';
const PROMPT_LOCK_KEY = 'swse.datapadRegistrationPromptLock';

function getSessionSuppressionSet() {
  if (!globalThis[SESSION_SUPPRESSION_KEY]) {
    globalThis[SESSION_SUPPRESSION_KEY] = new Set();
  }
  return globalThis[SESSION_SUPPRESSION_KEY];
}

function getActorUserKey(actor, userId) {
  return `${actor?.id ?? actor?.uuid ?? 'unknown'}:${userId ?? 'unknown'}`;
}

function userOwnsActor(actor, user = game?.user) {
  if (!actor || !user) return false;
  const ownerLevel = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  if (typeof actor.testUserPermission === 'function') {
    return actor.testUserPermission(user, ownerLevel);
  }
  return actor.isOwner === true;
}

function isSupportedActor(actor) {
  return actor?.documentName === 'Actor' && actor.type === 'character';
}

function hasUsableAbilityScores(actor) {
  const abilities = actor?.system?.abilities ?? {};
  return Object.values(abilities).some((ability) => {
    const base = Number(ability?.base ?? ability?.value ?? ability?.score ?? 0);
    return Number.isFinite(base) && base > 0 && base !== 10;
  });
}

function hasProgressionClass(actor) {
  try {
    return ActorAbilityBridge.getClasses(actor).length > 0;
  } catch (err) {
    swseLogger.warn('[Datapad Registration] Class detection failed; falling back to item scan.', err);
    return Array.from(actor?.items ?? []).some((item) => item?.type === 'class');
  }
}

export function shouldPromptForDatapadRegistration(actor, { user = game?.user } = {}) {
  if (!isSupportedActor(actor)) return false;
  if (!user || user.isGM) return false;
  if (!userOwnsActor(actor, user)) return false;

  const system = actor.system ?? {};
  const explicitComplete = actor.getFlag?.(FLAG_SCOPE, 'chargen.completed') === true
    || system?.progression?.chargenComplete === true
    || system?.swse?.chargenComplete === true;
  if (explicitComplete) return false;

  const hasClass = hasProgressionClass(actor);
  if (hasClass) return false;

  const level = Number(system.level ?? system.details?.level?.value ?? 0);
  const placeholderName = !actor.name || actor.name.trim() === '' || actor.name === 'New Character';
  const noUsableScores = !hasUsableAbilityScores(actor);

  return level <= 1 || placeholderName || noUsableScores;
}

async function getDisabledPromptUsers(actor) {
  const users = actor.getFlag?.(FLAG_SCOPE, FLAG_DISABLED_USERS) ?? {};
  return users && typeof users === 'object' ? { ...users } : {};
}

async function setPromptDisabledForUser(actor, userId) {
  const users = await getDisabledPromptUsers(actor);
  users[userId] = Date.now();
  await actor.setFlag(FLAG_SCOPE, FLAG_DISABLED_USERS, users);
}

function buildDatapadRegistrationContent(actor) {
  const theme = ThemeResolutionService.buildSurfaceContext({ actor });
  const actorName = foundry.utils.escapeHTML(actor?.name ?? 'Unregistered User');
  return `
    <section class="swse-datapad-registration-prompt" data-theme="${theme.themeKey}" style="${theme.surfaceStyleInline}">
      <div class="swse-datapad-registration-prompt__kicker">FIRST ACCESS DETECTED</div>
      <h2>New Datapad Granted</h2>
      <p class="swse-datapad-registration-prompt__lead">
        You have been granted a new datapad, <strong>${actorName}</strong>.
      </p>
      <p>
        This unit has not completed registration. Initialization will route you to the same
        training/chargen sequence available from the home screen training app.
      </p>
      <p class="swse-datapad-registration-prompt__question">
        Would you like to initialize registration?
      </p>
    </section>
  `;
}

async function showDatapadRegistrationPrompt(actor) {
  return SWSEDialogV2.wait({
    title: 'New Datapad Granted',
    content: buildDatapadRegistrationContent(actor),
    buttons: {
      yes: {
        icon: '<i class="fa-solid fa-fingerprint"></i>',
        label: 'Yes — Initialize Registration',
        class: 'swse-dialog-button--primary',
        callback: () => 'yes'
      },
      no: {
        icon: '<i class="fa-solid fa-ban"></i>',
        label: 'No — Do Not Show Again',
        class: 'swse-dialog-button--danger',
        callback: () => 'no'
      }
    },
    default: 'yes',
    render: (html) => {
      const root = html?.[0] ?? html;
      if (root instanceof HTMLElement) {
        ThemeResolutionService.applyToElement(root, { actor });
      }
    }
  }, {
    classes: ['swse-datapad-registration-dialog'],
    position: { width: 560, height: 'auto' },
    window: { title: 'New Datapad Granted', icon: 'fa-solid fa-tablet-screen-button' }
  });
}

export async function maybePromptForDatapadRegistration(sheet) {
  const actor = sheet?.actor ?? sheet?.document;
  const user = game?.user;
  if (!actor || !user) return;
  if (sheet?._swseDatapadRegistrationPromptActive) return;
  if (!shouldPromptForDatapadRegistration(actor, { user })) return;

  const actorUserKey = getActorUserKey(actor, user.id);
  if (getSessionSuppressionSet().has(actorUserKey)) return;

  const disabledUsers = await getDisabledPromptUsers(actor);
  if (disabledUsers?.[user.id]) return;

  const lock = getPromptLock();
  if (lock.active) return;

  sheet._swseDatapadRegistrationPromptActive = true;
  lock.active = true;
  try {
    const choice = await showDatapadRegistrationPrompt(actor);

    if (choice === 'yes') {
      getSessionSuppressionSet().add(actorUserKey);
      await launchProgression(actor, { source: 'datapad-registration-prompt' });
      return;
    }

    if (choice === 'no') {
      // "No" is permanent for this user/actor pair. This prevents the prompt
      // from returning after canvas reloads or future sheet renders.
      await setPromptDisabledForUser(actor, user.id);
    }

    // Closing the prompt suppresses only this browser session.
    getSessionSuppressionSet().add(actorUserKey);
  } catch (err) {
    swseLogger.error('[Datapad Registration] Prompt failed', err);
  } finally {
    lock.active = false;
    sheet._swseDatapadRegistrationPromptActive = false;
  }
}


function getPromptLock() {
  if (!globalThis[PROMPT_LOCK_KEY]) {
    globalThis[PROMPT_LOCK_KEY] = { active: false };
  }
  return globalThis[PROMPT_LOCK_KEY];
}

function getOwnedRegistrationCandidates({ user = game?.user } = {}) {
  if (!game?.actors || !user || user.isGM) return [];
  return Array.from(game.actors)
    .filter((actor) => shouldPromptForDatapadRegistration(actor, { user }))
    .sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? '')));
}

async function promptForActorFromCanvas(actor, { source = 'canvas' } = {}) {
  const user = game?.user;
  if (!actor || !user || user.isGM) return false;
  if (!shouldPromptForDatapadRegistration(actor, { user })) return false;

  const actorUserKey = getActorUserKey(actor, user.id);
  if (getSessionSuppressionSet().has(actorUserKey)) return false;

  const disabledUsers = await getDisabledPromptUsers(actor);
  if (disabledUsers?.[user.id]) return false;

  const lock = getPromptLock();
  if (lock.active) return false;

  lock.active = true;
  try {
    const choice = await showDatapadRegistrationPrompt(actor);

    if (choice === 'yes') {
      getSessionSuppressionSet().add(actorUserKey);
      await launchProgression(actor, { source: `datapad-registration-${source}` });
      return true;
    }

    if (choice === 'no') {
      await setPromptDisabledForUser(actor, user.id);
    }
    getSessionSuppressionSet().add(actorUserKey);
    return true;
  } catch (err) {
    swseLogger.error('[Datapad Registration] Canvas prompt failed', err);
    return false;
  } finally {
    lock.active = false;
  }
}

export async function maybePromptForDatapadRegistrationFromCanvas({ source = 'canvas' } = {}) {
  const user = game?.user;
  if (!user || user.isGM) return false;

  const candidates = getOwnedRegistrationCandidates({ user });
  if (!candidates.length) return false;

  return promptForActorFromCanvas(candidates[0], { source });
}

export function initializeDatapadRegistrationOnboarding() {
  if (!game?.user || game.user.isGM) return;
  if (globalThis.__swseDatapadRegistrationOnboardingInitialized) return;
  globalThis.__swseDatapadRegistrationOnboardingInitialized = true;

  const scheduleCanvasPrompt = (source = 'canvas') => {
    window.setTimeout(() => {
      maybePromptForDatapadRegistrationFromCanvas({ source }).catch((err) => {
        swseLogger.warn('[Datapad Registration] Scheduled onboarding prompt failed', err);
      });
    }, 250);
  };

  if (canvas?.ready) scheduleCanvasPrompt('ready');
  else Hooks.once('canvasReady', () => scheduleCanvasPrompt('canvasReady'));

  Hooks.on('createActor', (actor) => {
    if (shouldPromptForDatapadRegistration(actor, { user: game?.user })) {
      scheduleCanvasPrompt('actor-created');
    }
  });

  Hooks.on('updateActor', (actor, changes = {}) => {
    const ownershipChanged = Object.prototype.hasOwnProperty.call(changes ?? {}, 'ownership')
      || Object.prototype.hasOwnProperty.call(changes ?? {}, 'permission');
    if (ownershipChanged || shouldPromptForDatapadRegistration(actor, { user: game?.user })) {
      scheduleCanvasPrompt('actor-updated');
    }
  });
}
