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
import { GMStoreDashboard } from "/systems/foundryvtt-swse/scripts/apps/gm-store-dashboard.js";
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
  SWSELogger.log('[Actor Sidebar] Opening GM Store Dashboard');
  try {
    const dashboard = new GMStoreDashboard();
    dashboard.render(true);
  } catch (err) {
    SWSELogger.error('[Actor Sidebar] Error opening GM dashboard:', err);
    ui?.notifications?.error?.(`Failed to open GM dashboard: ${err.message}`);
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
    const datapad = new GMDatapad();
    datapad.render(true);
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

export function registerActorSidebarControls() {
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
      icon: 'fa-solid fa-dice-d20',
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
      icon: 'fa-solid fa-store',
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
        icon: 'fa-solid fa-dragon',
        label: 'Import NPC',
        handler: () => onClickNPCTemplates(app)
      });

      controls.unshift({
        action: 'swse-templates',
        icon: 'fa-solid fa-layer-group',
        label: 'Templates',
        handler: () => onClickTemplates(app)
      });

      // GM Store Dashboard button (GM only)
      controls.unshift({
        action: 'swse-gm-store-dashboard',
        icon: 'fa-solid fa-cog',
        label: 'Store Dashboard',
        handler: () => onClickGMDashboard(app)
      });

      // GM Datapad button (GM only)
      controls.unshift({
        action: 'swse-gm-datapad',
        icon: 'fa-solid fa-display',
        label: 'GM Datapad',
        handler: () => onClickGMDatapad(app)
      });
    }

    SWSELogger.log('[Actor Sidebar] Controls registered');
  }, { id: 'swse-actor-sidebar' });
}

export default registerActorSidebarControls;
