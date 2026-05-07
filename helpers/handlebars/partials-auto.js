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
  "systems/foundryvtt-swse/templates/actors/npc/v2/partials/npc-statblock-authority-panel.hbs"
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