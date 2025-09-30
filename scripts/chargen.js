// systems/swse/scripts/chargen.js

import { applyRaceBonuses, getRaceFeatures, SWSE_RACES } from "./races.js";

/* Existing functions from before … launchCharacterCreator + createSWSEActor … */

// Add a button to the Actors sidebar
Hooks.on("renderActorDirectory", (app, html, data) => {
  const button = $(
    `<button class="swse-chargen"><i class="fas fa-user-plus"></i> Create SWSE Character</button>`
  );

  // Prevent duplicates
  html.find(".swse-chargen").remove();

  // Add button to header controls
  const header = html.find(".directory-header .header-actions");
  if (header.length) {
    header.append(button);

    // Launch chargen when clicked
    button.click(() => {
      launchCharacterCreator();
    });
  }
});
export function launchCharacterCreator() {
  const raceOptions = Object.keys(SWSE_RACES)
    .map(r => `<option value="${r}">${SWSE_RACES[r].label}</option>`)
    .join("");

  const classOptions = `
    <option value="jedi">Jedi</option>
    <option value="noble">Noble</option>
    <option value="scoundrel">Scoundrel</option>
    <option value="scout">Scout</option>
    <option value="soldier">Soldier</option>
    <option value="nonheroic">Non-Heroic</option>
    <option value="droid">Droid</option>
  `;

  const content = `
    <form>
      <div class="form-group">
        <label>Character Name:</label>
        <input type="text" name="charName" value="New Hero"/>
      </div>

      <div class="form-group">
        <label>Race:</label>
        <select name="race">${raceOptions}</select>
      </div>

      <div class="form-group">
        <label>Class:</label>
        <select name="class">${classOptions}</select>
      </div>

      <hr/>
      <h3>Base Attributes</h3>
      <div class="form-group"><label>Strength</label><input type="number" name="str" value="10"/></div>
      <div class="form-group"><label>Dexterity</label><input type="number" name="dex" value="10"/></div>
      <div class="form-group"><label>Constitution</label><input type="number" name="con" value="10"/></div>
      <div class="form-group"><label>Intelligence</label><input type="number" name="int" value="10"/></div>
      <div class="form-group"><label>Wisdom</label><input type="number" name="wis" value="10"/></div>
      <div class="form-group"><label>Charisma</label><input type="number" name="cha" value="10"/></div>
    </form>
  `;

  new Dialog({
    title: "SWSE Character Creation",
    content,
    buttons: {
      create: {
        label: "Create Character",
        callback: html => {
          const form = html[0].querySelector("form");
          const formData = new FormData(form);

          const name = formData.get("charName");
          const raceKey = formData.get("race");
          const cls = formData.get("class");

          const baseAttributes = {
            str: Number(formData.get("str") || 10),
            dex: Number(formData.get("dex") || 10),
            con: Number(formData.get("con") || 10),
            int: Number(formData.get("int") || 10),
            wis: Number(formData.get("wis") || 10),
            cha: Number(formData.get("cha") || 10),
          };

          createSWSEActor(name, raceKey, cls, baseAttributes);
        }
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "create"
  }).render(true);
}

/**
 * Core Actor creation logic
 */
export async function createSWSEActor(name, raceKey, cls, baseAttributes) {
  try {
    const safeName = name || "Unnamed Hero";
    const safeRace = raceKey || "human";
    const safeClass = cls || "heroic";

    // Apply racial bonuses
    const modifiedAttributes = applyRaceBonuses(baseAttributes, safeRace);

    // Apply race-specific features (Humans get bonus feat + skill)
    const raceFeatures = getRaceFeatures(safeRace);

    const actorData = {
      name: safeName,
      type: "character", // must match your system.json actorTypes
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

    const actor = await Actor.create(actorData);
    ui.notifications?.info(`Created character: ${actor.name}`);
    console.log(`SWSE Actor created: ${actor.name}`, actor);

    return actor;
  } catch (err) {
    console.error("Error creating SWSE Actor:", err);
    ui.notifications?.error("Failed to create actor. Check console for details.");
    return null;
  }
}
