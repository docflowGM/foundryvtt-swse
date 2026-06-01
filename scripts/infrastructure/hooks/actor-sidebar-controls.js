// scripts/infrastructure/hooks/actor-sidebar-controls.js
/**
 * Actor Directory Sidebar Controls (ApplicationV2)
 *
 * Adds quick-access buttons to the Actor Directory sidebar header:
 * - Chargen: Create/edit character via character generator
 * - Store: Open equipment/shopping interface
 * - Templates: Create actor from template
 *
 * These complement the character sheet header buttons for quick navigation.
 */
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { launchProgression, launchNewProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { TemplateCharacterCreator } from "/systems/foundryvtt-swse/scripts/apps/template-character-creator.js";
import { NPCTemplateImporter } from "/systems/foundryvtt-swse/scripts/apps/npc-template-importer.js";
import { GMDatapad } from "/systems/foundryvtt-swse/scripts/apps/gm-datapad.js";

function onClickChargen(app) {
  // Chargen requires an actor
  const actor = app?.actor ?? app?.document;
  if (!actor) {
    const isGM = game.user?.isGM ?? false;
    if (!isGM) {
      ui?.notifications?.warn?.('No actor selected. GMs can create new actors.');
      return;
    }

    SWSELogger.log('[Actor Sidebar] Opening new-character progression from sidebar');
    launchNewProgression({ actorType: 'character' }).catch(err => {
      SWSELogger.error('[Actor Sidebar] Error opening new-character progression:', err);
      ui?.notifications?.error?.(`Failed to open progression: ${err.message}`);
    });
    return;
  }

  if (actor.type !== 'character') {
    ui?.notifications?.warn?.('Progression is for characters only.');
    return;
  }

  SWSELogger.log(`[Actor Sidebar] Opening Progression for: ${actor.name}`);
  // FIXED: Route through unified progression entry point (chargen vs levelup routing is done there)
  launchProgression(actor).catch(err => {
    SWSELogger.error('[Actor Sidebar] Error opening progression:', err);
    ui?.notifications?.error?.(`Failed to open progression: ${err.message}`);
  });
}

function onClickStore(app) {
  // Store can work with or without a selected actor
  const actor = app?.actor ?? app?.document;

  // If we have a character, open store for that character
  if (actor && actor.type === 'character') {
    SWSELogger.log(`[Actor Sidebar] Opening Store for: ${actor.name}`);
    // Route through shell when available, fall back to standalone
    ShellRouter.openSurface(actor, 'store').catch(err => {
      SWSELogger.error('[Actor Sidebar] Error opening store:', err);
      ui?.notifications?.error?.(`Failed to open store: ${err.message}`);
    });
    return;
  }

  // Otherwise open generic store (no actor context available)
  SWSELogger.log('[Actor Sidebar] Opening Store (no actor selected)');
  SWSEStore.open().catch(err => {
    SWSELogger.error('[Actor Sidebar] Error opening generic store:', err);
    ui?.notifications?.error?.(`Failed to open store: ${err.message}`);
  });
}

function onClickTemplates(app) {
  // Templates can create a new actor from a template
  SWSELogger.log('[Actor Sidebar] Opening Template Character Creator');
  try {
    TemplateCharacterCreator.create();
  } catch (err) {
    SWSELogger.error('[Actor Sidebar] Error opening template creator:', err);
    ui?.notifications?.error?.(`Failed to open template creator: ${err.message}`);
  }
}

function onClickGMDashboard(app) {
  // GM Store Dashboard - GMs only
  if (!(game.user?.isGM ?? false)) {
    ui?.notifications?.warn?.('Only GMs can access the Store Dashboard.');
    return;
  }
  SWSELogger.log('[Actor Sidebar] Opening GM Datapad Store surface');
  try {
    GMDatapad.open('store');
  } catch (err) {
    SWSELogger.error('[Actor Sidebar] Error opening GM Store surface:', err);
    ui?.notifications?.error?.(`Failed to open GM Store surface: ${err.message}`);
  }
}

function onClickGMDatapad(app) {
  // GM Datapad launcher - GMs only
  if (!(game.user?.isGM ?? false)) {
    ui?.notifications?.warn?.('Only GMs can access the GM Datapad.');
    return;
  }
  SWSELogger.log('[Actor Sidebar] Opening GM Datapad');
  try {
    GMDatapad.open('home');
  } catch (err) {
    SWSELogger.error('[Actor Sidebar] Error opening GM Datapad:', err);
    ui?.notifications?.error?.(`Failed to open GM Datapad: ${err.message}`);
  }
}

function onClickNPCTemplates(app) {
  // NPC Template Importer - GMs only
  if (!(game.user?.isGM ?? false)) {
    ui?.notifications?.warn?.('Only GMs can import NPC templates.');
    return;
  }
  SWSELogger.log('[Actor Sidebar] Opening NPC Template Importer');
  try {
    NPCTemplateImporter.create();
  } catch (err) {
    SWSELogger.error('[Actor Sidebar] Error opening NPC template importer:', err);
    ui?.notifications?.error?.(`Failed to open NPC template importer: ${err.message}`);
  }
}

function getActorDirectoryElement(html) {
  if (!html) return null;
  if (html instanceof HTMLElement) return html;
  if (html[0] instanceof HTMLElement) return html[0];
  if (html.element instanceof HTMLElement) return html.element;
  return null;
}

function isInsideSidebarTabs(element) {
  return Boolean(element?.closest?.('#sidebar-tabs, nav#sidebar-tabs, .sidebar-tabs'));
}

function hasDirectoryChrome(element) {
  if (!(element instanceof HTMLElement)) return false;
  return Boolean(
    element.querySelector?.('.directory-header, .directory-list, [data-application-part="directory"]')
      || element.matches?.('.directory, .actor-directory, .actors-sidebar, [data-document-name="Actor"]')
      || element.id === 'actors'
  );
}

function isActorDirectoryRoot(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (isInsideSidebarTabs(element)) return false;

  const documentName = String(element.dataset?.documentName || '').toLowerCase();
  const tab = String(element.dataset?.tab || element.dataset?.sidebarTab || '').toLowerCase();
  const id = String(element.id || '').toLowerCase();
  const classes = element.classList;

  const actorIdentity = id === 'actors'
    || documentName === 'actor'
    || tab === 'actors'
    || classes?.contains?.('actor-directory')
    || classes?.contains?.('actors-sidebar');

  if (!actorIdentity) return false;
  return hasDirectoryChrome(element);
}

function getLiveActorDirectoryRoot(root = null) {
  const rawCandidates = [
    root,
    root?.closest?.('#actors, .actor-directory, .actors-sidebar, [data-document-name="Actor"], [data-sidebar-tab="actors"], [data-tab="actors"]'),
    root?.querySelector?.('#actors'),
    root?.querySelector?.('.actor-directory'),
    root?.querySelector?.('.actors-sidebar'),
    root?.querySelector?.('[data-document-name="Actor"]'),
    root?.querySelector?.('[data-sidebar-tab="actors"]'),
    root?.querySelector?.('[data-tab="actors"]'),
    document.querySelector('#sidebar #actors'),
    document.querySelector('#sidebar .actor-directory'),
    document.querySelector('#sidebar .actors-sidebar'),
    document.querySelector('#sidebar [data-document-name="Actor"]'),
    document.querySelector('#sidebar [data-sidebar-tab="actors"]'),
    document.querySelector('#sidebar .tab[data-tab="actors"]'),
    document.querySelector('#sidebar section[data-tab="actors"]'),
    document.querySelector('#actors')
  ].filter(Boolean);

  const candidates = rawCandidates.filter(isActorDirectoryRoot);
  return candidates.find((el) => el.offsetParent || el.matches?.('.active, [aria-hidden="false"]')) ?? candidates[0] ?? null;
}

function cleanupMisplacedDirectoryLaunchers() {
  for (const launcher of document.querySelectorAll('.swse-directory-launcher, .swse-directory-launcher-row')) {
    const actorRoot = launcher.closest?.('#actors, .actor-directory, .actors-sidebar, [data-document-name="Actor"], [data-sidebar-tab="actors"], [data-tab="actors"]');
    if (!isActorDirectoryRoot(actorRoot)) {
      launcher.remove();
    }
  }
}

function findDirectoryActionBar(root) {
  const scope = getLiveActorDirectoryRoot(root) ?? root;
  if (!isActorDirectoryRoot(scope)) return null;

  const existingRow = scope.querySelector?.('.directory-header .swse-directory-launcher-row, header .swse-directory-launcher-row, [data-application-part="header"] .swse-directory-launcher-row');
  if (existingRow) return existingRow;

  const actionBar = scope.querySelector?.('.directory-header .action-buttons')
    ?? scope.querySelector?.('.directory-header .header-actions')
    ?? scope.querySelector?.('.directory-header .actions')
    ?? scope.querySelector?.('.directory-header .directory-actions')
    ?? scope.querySelector?.('header .action-buttons')
    ?? scope.querySelector?.('header .header-actions')
    ?? scope.querySelector?.('[data-application-part="header"] .action-buttons')
    ?? scope.querySelector?.('[data-application-part="directory"] .action-buttons');

  if (actionBar) return actionBar;

  const header = scope.querySelector?.('.directory-header')
    ?? scope.querySelector?.('header')
    ?? scope.querySelector?.('[data-application-part="header"]');
  if (!header) return null;

  const row = document.createElement('div');
  row.className = 'swse-directory-launcher-row';
  header.append(row);
  return row;
}

function makeDirectoryButton({ className, icon, label, action, onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `swse-directory-launcher ${className}`;
  button.dataset.action = action || className;
  button.dataset.tooltip = label;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = `<i class="${String(icon || 'fas fa-circle').replace(/\bfa-solid\b/g, 'fas')}"></i> <span>${label}</span>`;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    onClick?.();
  });
  return button;
}

function ensureActorDirectoryLaunchers(app = null, html = null) {
  cleanupMisplacedDirectoryLaunchers();
  if (!(game.user?.isGM ?? false)) return false;

  const hookRoot = getActorDirectoryElement(html);
  const root = getLiveActorDirectoryRoot(hookRoot);
  if (!isActorDirectoryRoot(root)) return false;
  if (root.querySelector('.swse-gm-datapad-launcher')) return true;

  const actionBar = findDirectoryActionBar(root);
  if (!actionBar) return false;

  const gmDatapadButton = makeDirectoryButton({
    className: 'swse-gm-datapad-launcher',
    action: 'swse-gm-datapad',
    icon: 'swse-scene-control swse-scene-control-datapad',
    label: 'GM Datapad',
    onClick: () => onClickGMDatapad(app)
  });

  const gmStoreButton = makeDirectoryButton({
    className: 'swse-gm-store-dashboard-launcher',
    action: 'swse-gm-store-dashboard',
    icon: 'swse-scene-control swse-scene-control-store',
    label: 'Store Dashboard',
    onClick: () => onClickGMDashboard(app)
  });

  actionBar.append(gmDatapadButton, gmStoreButton);
  SWSELogger.log('[Actor Sidebar] GM Datapad DOM launchers injected');
  return true;
}

function scheduleActorDirectoryLauncherInjection(app = null, html = null) {
  for (const delay of [0, 50, 250, 750]) {
    globalThis.setTimeout(() => ensureActorDirectoryLaunchers(app, html), delay);
  }
}


let actorDirectoryLauncherObserverInstalled = false;

function installActorDirectoryLauncherObserver() {
  if (actorDirectoryLauncherObserverInstalled) return;
  actorDirectoryLauncherObserverInstalled = true;

  Hooks.once('ready', () => {
    scheduleActorDirectoryLauncherInjection();
    const observer = new MutationObserver(() => scheduleActorDirectoryLauncherInjection());
    observer.observe(document.body, { childList: true, subtree: true });
    globalThis.SWSE ??= {};
    globalThis.SWSE.debug ??= {};
    globalThis.SWSE.debug.injectGMDatapadLaunchers = () => ensureActorDirectoryLaunchers();
    globalThis.SWSE.debug.openGMDatapad = () => GMDatapad.open('home');
    globalThis.SWSE.debug.openGMDatapadStore = () => GMDatapad.open('store');
  });
}

export function registerActorSidebarControls() {
  installActorDirectoryLauncherObserver();
  // Sidebar controls appear on ActorDirectory app
  HooksRegistry.register('getHeaderControlsApplicationV2', (app, controls) => {
    // Only add to ActorDirectory sidebar
    if (app?.constructor?.name !== 'ActorDirectory') {
      return;
    }

    // Prevent duplicates
    if (Array.isArray(controls)) {
      if (controls.some(c => c?.action === 'swse-chargen')) return;
    }

    // Chargen button (for characters, or GM for new creation)
    controls.unshift({
      action: 'swse-chargen',
      icon: 'fas fa-dice-d20',
      label: 'Chargen',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => {
        const actor = app?.actor ?? app?.document;
        if (!actor) return game.user?.isGM ?? false; // Allow GMs to open chargen standalone
        return actor.type === 'character'; // Show for characters
      },
      handler: () => onClickChargen(app)
    });

    // Store button (for any character, or standalone)
    controls.unshift({
      action: 'swse-store',
      icon: 'swse-scene-control swse-scene-control-store',
      label: 'Store',
      ownership: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3,
      visible: () => {
        const actor = app?.actor ?? app?.document;
        // Show if character, or if no actor (standalone store)
        return !actor || actor.type === 'character';
      },
      handler: () => onClickStore(app)
    });

    // Templates button (GM only)
    if (game.user?.isGM ?? false) {
      controls.unshift({
        action: 'swse-npc-templates',
        icon: 'fas fa-dragon',
        label: 'Import NPC',
        handler: () => onClickNPCTemplates(app)
      });

      controls.unshift({
        action: 'swse-templates',
        icon: 'fas fa-layer-group',
        label: 'Templates',
        handler: () => onClickTemplates(app)
      });

      // GM Store Dashboard button (GM only)
      controls.unshift({
        action: 'swse-gm-store-dashboard',
        icon: 'fas fa-cog',
        label: 'Store Dashboard',
        handler: () => onClickGMDashboard(app)
      });

      // GM Datapad button (GM only)
      controls.unshift({
        action: 'swse-gm-datapad',
        icon: 'fas fa-display',
        label: 'GM Datapad',
        handler: () => onClickGMDatapad(app)
      });
    }

    SWSELogger.log('[Actor Sidebar] Header controls registered');
  }, { id: 'swse-actor-sidebar' });

  HooksRegistry.register('renderActorDirectory', (app, html) => {
    scheduleActorDirectoryLauncherInjection(app, html);
  }, {
    id: 'swse-actor-directory-gm-launchers',
    priority: 0,
    description: 'Inject GM Datapad launchers into the Actor Directory action bar.',
    category: 'ui'
  });


  HooksRegistry.register('renderSidebar', (app, html) => {
    scheduleActorDirectoryLauncherInjection(app, html);
  }, {
    id: 'swse-sidebar-gm-launchers',
    priority: 0,
    description: 'Retry GM Datapad launcher injection when the sidebar renders.',
    category: 'ui'
  });
}

export default registerActorSidebarControls;
