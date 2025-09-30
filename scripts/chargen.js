// systems/swse/scripts/chargen.js

import { applyRaceBonuses, getRaceFeatures } from "./races.js";

/**
 * Generate a new Actor during character creation.
 * @param {string} name - Character name
 * @param {string} raceKey - key from SWSE_RACES (e.g., "human", "wookiee")
 * @param {string} cls - class name string (should match your system.json actor types/classes)
 * @param {object} baseAttributes - { str, dex, con, int, wis, cha }
 */
export async function createSWSEActor(name, raceKey, cls, baseAttributes) {
  try {
    // Ensure defaults
    const safeName = name || "Unnamed Hero";
    const safeRace = raceKey || "human";
    const safeClass = cls || "heroic";

    // Apply racial bonuses
    const modifiedAttributes = applyRaceBonuses(baseAttributes, safeRace);

    // Apply race-specific features (e.g., Human bonus feat + skill)
    const raceFeatures = getRaceFeatures(safeRace);

    // Build actor data
    const actorData = {
      name: safeName,
      type: "character", // must match system.json actorTypes
      system: {
        attributes: modifiedAttributes,
        details: {
          race: safeRace,
          class: safeClass
        },
        bonusFeats: raceFeatures.bonusFeats || 0,
        bonusSkills: raceFeatures.bonusSkills || 0
      }
    };

    // Create the actor in Foundry
    const actor = await Actor.create(actorData);
    console.log(`SWSE Actor created: ${actor.name}`, actor);

    return actor;
  } catch (err) {
    console.error("Error creating SWSE Actor:", err);
    ui.notifications?.error("Failed to create actor. Check console for details.");
    return null;
  }
}

/**
 * Example usage (remove or adapt this in production):
 */
// const baseAttributes = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
// createSWSEActor("Test Hero", "human", "scoundrel", baseAttributes);
