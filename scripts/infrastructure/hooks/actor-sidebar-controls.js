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
import CharacterGenerator from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-main.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { TemplateCharacterCreator } from "/systems/foundryvtt-swse/scripts/apps/template-character-creator.js";
import { GMStoreDashboard } from "/systems/foundryvtt-swse/scripts/apps/gm-store-dashboard.js";

async function onClickChargen(app) {
  // Chargen requires an actor
  const actor = app?.actor ?? app?.document;
  if (!actor) {
    const isGM = game.user?.isGM ?? false;
    if (!isGM) {
      ui?.notifications?.warn?.('No actor selected. GMs can create new actors.');
      return;
    }
    // TODO: Allow opening chargen for new actor creation (no actor passed)
    return;
  }

  if (actor.type !== 'character') {
    ui?.notifications?.warn?.('Chargen is for characters only.');
    return;
  }

  SWSELogger.log(`[Actor Sidebar] Opening Chargen for: ${actor.name}`);
  const chargen = new CharacterGenerator(actor);
  chargen.render(true);
}

async function onClickStore(app) {
  // Store can work with or without a selected actor
  const actor = app?.actor ?? app?.document;

  // If we have a character, open store for that character
  if (actor && actor.type === 'character') {
    SWSELogger.log(`[Actor Sidebar] Opening Store for: ${actor.name}`);
    const store = new SWSEStore(actor);
    store.render(true);
    return;
  }

  // Otherwise open generic store
  SWSELogger.log('[Actor Sidebar] Opening Store (no actor selected)');
  const store = new SWSEStore();
  store.render(true);
}

async function onClickTemplates(app) {
  // Templates can create a new actor from a template
  SWSELogger.log('[Actor Sidebar] Opening Template Character Creator');
  TemplateCharacterCreator.create();
}

async function onClickGMDashboard(app) {
  // GM Store Dashboard - GMs only
  if (!(game.user?.isGM ?? false)) {
    ui?.notifications?.warn?.('Only GMs can access the Store Dashboard.');
    return;
  }
  SWSELogger.log('[Actor Sidebar] Opening GM Store Dashboard');
  const dashboard = new GMStoreDashboard();
  dashboard.render(true);
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
      onClick: () => onClickChargen(app)
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
      onClick: () => onClickStore(app)
    });

    // Templates button (GM only)
    if (game.user?.isGM ?? false) {
      controls.unshift({
        action: 'swse-templates',
        icon: 'fa-solid fa-layer-group',
        label: 'Templates',
        onClick: () => onClickTemplates(app)
      });

      // GM Store Dashboard button (GM only)
      controls.unshift({
        action: 'swse-gm-store-dashboard',
        icon: 'fa-solid fa-cog',
        label: 'Store Dashboard',
        onClick: () => onClickGMDashboard(app)
      });
    }

    SWSELogger.log('[Actor Sidebar] Controls registered');
  }, { id: 'swse-actor-sidebar' });
}

export default registerActorSidebarControls;
