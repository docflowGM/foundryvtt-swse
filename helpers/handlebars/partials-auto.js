/* ========================================================================== */
/* SWSE PARTIAL REGISTRATION — EXACT KEY MATCH                               */
/* Must match template usage exactly                                          */
/* ========================================================================== */

const CHARACTER_V2_CONCEPT_PARTIALS = [
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/hud-bar.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/title-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/header-block.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/resource-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/tabs-bar.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/frame/sidebar.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/summary-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/abilities-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/skills-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/combat-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/talents-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/force-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/gear-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/biography-tab.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/tabs/relationships-tab.hbs"
];

const SHARED_PARTIALS = [
  // Shared/general partials
  "systems/foundryvtt-swse/templates/partials/suggestion-card.hbs"
];

const PARTIALS = [
  ...CHARACTER_V2_CONCEPT_PARTIALS,
  ...SHARED_PARTIALS,

  // Character V2 Panels
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/action-economy-indicator.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/attacks-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/dark-side-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/defenses-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/force-powers-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/identity-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-item-row.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/inventory-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/languages-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/second-wind-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/skills-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/special-combat-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/starship-maneuvers-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/talents-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2/partials/xp-panel.hbs",

  // Droid V2 Partials
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-appendages-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-armor-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-history.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-build-status-card.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-integrated-systems-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-integrated-weapons-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-locomotion-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-processor-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-sensors-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-systems-summary-strip.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/v2/partials/droid-validation-panel.hbs",

  // Vehicle V2 Partials
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-cargo-manifest-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-cargo-summary-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-commander-order-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-crew-assignment-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-crew-summary-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-defenses-panel-full.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-header-summary-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-hp-condition-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-pilot-maneuver-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-power-summary-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-shield-management-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-subsystem-detail-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-turn-phase-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/v2/partials/vehicle-weapon-mount-panel.hbs",

  // NPC V2 Partials
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-beast-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-mode-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-mount-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-owner-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-profile-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-progression-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-related-actor-card.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-relationships-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-statblock-authority-panel.hbs",

  // NPC V2 Phase 2 Upgrade Partials
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-header-dossier.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-gear-panel.hbs",

  // NPC V2 Sheet Partials
  "systems/foundryvtt-swse/templates/v2/npc/npc-sheet-header.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/npc-sheet-tabs.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/npc-sheet-body.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/portrait-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/biography-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/health-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/defense-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/abilities-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/skills-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/inventory-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/talents-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/feats-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/languages-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/combat-panel.hbs",
  "systems/foundryvtt-swse/templates/v2/npc/panels/combat-notes-panel.hbs",

  // NPC Legacy Partials
  "systems/foundryvtt-swse/templates/actors/npc/npc-summary-hud.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-image.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-core-stats.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-weapon-block.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-talent-block.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-specials-block.hbs",
  "systems/foundryvtt-swse/templates/actors/npc/npc-diagnostics-block.hbs",

  // Droid Legacy Partials
  "systems/foundryvtt-swse/templates/actors/droid/droid-image-operational.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-image-blueprint.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-callouts-operational.hbs",
  "systems/foundryvtt-swse/templates/actors/droid/droid-callouts-blueprint.hbs",

  // Vehicle Legacy Partials
  "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-image.hbs",
  "systems/foundryvtt-swse/templates/actors/vehicle/vehicle-callouts.hbs",

  // Shared Actor Partials
  "systems/foundryvtt-swse/templates/partials/actor/persistent-header.hbs",
  "systems/foundryvtt-swse/templates/actors/shared/partials/current-conditions-panel.hbs",

  // V2-Concept Character Panels
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/defense-breakdown-tooltip.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/inventory-item-row.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/force-powers-known-panel.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/inventory-weapon-card.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/inventory-armor-card.hbs",
  "systems/foundryvtt-swse/templates/actors/character/v2-concept/partials/panels/inventory-item-card.hbs",

  // Shell / Datapad Surface Partials
  "systems/foundryvtt-swse/templates/shell/shell-surface.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/shell-drawer-layer.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/shell-overlay-layer.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-home.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-progression.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-chargen.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-upgrade.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-settings.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-mentor.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-messenger.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-store.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-workbench.hbs",
  "systems/foundryvtt-swse/templates/shell/partials/surface-customization.hbs",

  // Store and Upgrade Partials
  "systems/foundryvtt-swse/templates/apps/store/store-splash.hbs",
  "systems/foundryvtt-swse/templates/apps/upgrade/upgrade-app.hbs",
  "systems/foundryvtt-swse/templates/apps/upgrade/partials/upgrade-detail-pane.hbs",
  "systems/foundryvtt-swse/templates/apps/upgrade/partials/upgrade-footer.hbs",
  "systems/foundryvtt-swse/templates/apps/upgrade/partials/lightsaber-detail.hbs",

  // Progression Framework Partials
  "systems/foundryvtt-swse/templates/apps/progression-framework/diagnostic-banner.hbs",
  "systems/foundryvtt-swse/templates/apps/progression-framework/progress-rail.hbs",
  "systems/foundryvtt-swse/templates/apps/progression-framework/progression-shell.hbs",
  "systems/foundryvtt-swse/templates/apps/progression-framework/splash.hbs",

  // Shared Content Partials
  "systems/foundryvtt-swse/templates/partials/starship-maneuvers-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/ability-card.hbs",
  "systems/foundryvtt-swse/templates/partials/skill-actions-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/skill-action-card.hbs",
  "systems/foundryvtt-swse/templates/partials/ui/condition-track.hbs",
  "systems/foundryvtt-swse/templates/partials/droid-builder-budget.hbs",
  "systems/foundryvtt-swse/templates/partials/assets-panel.hbs",
  "systems/foundryvtt-swse/templates/partials/crew-action-cards.hbs",

  // Component Partials
  "systems/foundryvtt-swse/templates/components/stepper.hbs",
  "systems/foundryvtt-swse/templates/components/narrator.hbs",
  "systems/foundryvtt-swse/templates/components/hud.hbs",

  // Sheet Layout and Component Partials
  "systems/foundryvtt-swse/templates/sheets/components/attribute-block.hbs",
  "systems/foundryvtt-swse/templates/sheets/partials/sheet-header.hbs",
  "systems/foundryvtt-swse/templates/sheets/partials/sheet-tabs.hbs",
  "systems/foundryvtt-swse/templates/sheets/_sheet-skeleton.hbs"
];

export async function registerSWSEPartials() {

  for (const path of PARTIALS) {
    try {
      const template = await fetch(path).then(r => r.text());

      // Register using EXACT same string as template reference
      Handlebars.registerPartial(path, template);

    } catch (err) {
      console.error(`SWSE | Failed to register partial: ${path}`, err);
    }
  }

  console.log(`SWSE | Registered ${PARTIALS.length} partials (exact keys)`);

}