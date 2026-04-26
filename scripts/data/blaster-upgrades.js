/**
 * BLASTER UPGRADES DATA
 *
 * First-wave structured blaster modifications used by the unified customization workbench.
 * These upgrades persist in item.flags.swse.blasterUpgrades[].
 */

export const BLASTER_UPGRADES = {
  "targeting-scope": {
    name: "Targeting Scope",
    description: "Adds magnified targeting optics and a calibrated aim assist package.",
    effect: "+1 attack at range",
    costCredits: 400,
    slotCost: 1,
    affectedArea: "targeting"
  },
  "sonic-dampener": {
    name: "Sonic Dampener",
    description: "Wraps the blaster in baffling and dampened cycling components to reduce audible discharge.",
    effect: "+5 Stealth vs sound-based detection, -1 damage",
    costCredits: 520,
    slotCost: 1,
    affectedArea: "muzzle"
  },
  "extended-battery": {
    name: "Extended Battery",
    description: "Expands the weapon's charge reserve with a larger or more efficient power cell.",
    effect: "+50% shots before reload",
    costCredits: 280,
    slotCost: 1,
    affectedArea: "power"
  },
  "autofire-mod": {
    name: "Auto-fire Modification",
    description: "Reworks the firing assembly to support burst fire and suppressive output.",
    effect: "Autofire / burst-fire mode",
    costCredits: 720,
    slotCost: 1,
    affectedArea: "autofire"
  }
};
