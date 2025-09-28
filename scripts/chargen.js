// systems/swse/scripts/chargen.js
import { SWSE_RACES, applyRaceBonuses } from "./races.js";

// --- Helpers ---
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

// --- Dialog helpers ---
async function askRadioQuestion(title, prompt, options) {
  return new Promise((resolve) => {
    const optionsHtml = options.map(opt =>
      `<label>
        <input type="radio" name="choice" value="${opt.id}" />
        ${opt.name}
      </label><br/>`
    ).join("");

    new Dialog({
      title,
      content: `<p>${prompt}</p><form><div>${optionsHtml}</div></form>`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const selected = html.find('input[name="choice"]:checked').val();
            resolve(selected || null);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

async function askYesNoQuestion(title, prompt) {
  return new Promise((resolve) => {
    new Dialog({
      title,
      content: `<p>${prompt}</p>`,
      buttons: {
        yes: { label: "Yes", callback: () => resolve(true) },
        no: { label: "No", callback: () => resolve(false) }
      },
      default: "yes",
      close: () => resolve(false)
    }).render(true);
  });
}

async function askForName() {
  return new Promise(resolve => {
    new Dialog({
      title: "Character Name",
      content: `<p>What is your character's name?</p><input type="text" name="charName" />`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const name = html.find('input[name="charName"]').val().trim();
            resolve(name || null);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

// Ask user to assign stats with point-buy style validation
async function askForStats() {
  return new Promise(resolve => {
    const stats = ["str", "dex", "con", "int", "wis", "cha"];
    let htmlContent = `<p>Distribute 10 additional points among your stats (min 8, max 18).</p><form>`;
    stats.forEach(stat => {
      htmlContent += `
        <label>${stat.toUpperCase()}: </label>
        <input type="number" name="${stat}" value="10" min="8" max="18" style="width:50px;" /><br/>
      `;
    });
    htmlContent += `</form>`;

    new Dialog({
      title: "Assign Stats",
      content: htmlContent,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const base = 10;
            const min = 8;
            const max = 18;
            const allocated = {};
            let totalPoints = 0;
            let valid = true;

            for (const stat of stats) {
              const val = parseInt(html.find(`input[name="${stat}"]`).val(), 10);
              if (isNaN(val) || val < min || val > max) {
                valid = false;
                break;
              }
              allocated[stat] = val;
              totalPoints += val - base;
            }

            if (!valid || totalPoints > 10) {
              ui.notifications.error("Invalid stats assignment: min 8, max 18 per stat, max 10 points distributed.");
              resolve(null);
            } else {
              resolve(allocated);
            }
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

// Multi-select skills
async function askForSkills(classSkills, extraSkills = []) {
  return new Promise(resolve => {
    if ((!classSkills || classSkills.length === 0) && (!extraSkills || extraSkills.length === 0)) {
      resolve([]);
      return;
    }

    const combinedSkills = [...(classSkills || []), ...(extraSkills || [])];

    const skillsHtml = combinedSkills.map(skill => `
      <label>
        <input type="checkbox" name="skills" value="${skill.id}" />
        ${skill.name}
      </label><br/>
    `).join("");

    new Dialog({
      title: "Select Skills",
      content: `<p>Select your skills:</p><form>${skillsHtml}</form>`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const selectedSkills = html.find('input[name="skills"]:checked').map((i, el) => el.value).get();
            resolve(selectedSkills);
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve([])
        }
      },
      default: "ok",
      close: () => resolve([])
    }).render(true);
  });
}

// Force power picker (Jedi only)
async function askForForcePowers(forcePowersList, maxChoices) {
  return new Promise(resolve => {
    if (!forcePowersList || forcePowersList.length === 0 || maxChoices <= 0) {
      resolve([]);
      return;
    }

    const powersHtml = forcePowersList.map(power => `
      <label>
        <input type="checkbox" name="forcePower" value="${power.id}" />
        ${power.name}
      </label><br/>
    `).join("");

    new Dialog({
      title: "Select Force Powers",
      content: `<p>Select up to ${maxChoices} Force Powers:</p><form>${powersHtml}</form>`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const selected = html.find('input[name="forcePower"]:checked').map((i, el) => el.value).get();
            if (selected.length > maxChoices) {
              ui.notifications.error(`You can only select up to ${maxChoices} Force Powers.`);
              resolve([]);
            } else {
              resolve(selected);
            }
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve([])
        }
      },
      default: "ok",
      close: () => resolve([])
    }).render(true);
  });
}

// --- Main Character Generator ---
async function characterGenerator(classesList, classDB, forcePowersList) {
  const speciesOptions = Object.entries(SWSE_RACES).map(([id, data]) => ({
    id,
    name: data.label
  }));

  const speciesId = await askRadioQuestion("Species", "Choose your species:", speciesOptions);
  if (!speciesId) return null;
  const speciesName = SWSE_RACES[speciesId]?.label || speciesId;

  const classId = await askRadioQuestion("Class", `You chose ${speciesName}. Now pick your class:`, classesList);
  if (!classId) return null;
  const chosenClass = classesList.find(c => c.id === classId);
  const className = chosenClass?.name || classId;

  const classBonus = classDB[classId]?.defenses || {};

  const charName = await askForName();
  if (!charName) return null;

  const baseAttributes = await askForStats();
  if (!baseAttributes) return null;

  const finalAttributes = applyRaceBonuses(baseAttributes, speciesId);

  // Skills
  const classSkills = chosenClass.skills || [];
  let extraSkills = [];
  if (speciesId === "human") {
    extraSkills = [
      { id: "negotiation", name: "Negotiation (Bonus for Humans)" },
      { id: "streetwise", name: "Streetwise (Bonus for Humans)" },
      { id: "pilot", name: "Pilot (Bonus for Humans)" }
    ];
  }
  const selectedSkills = await askForSkills(classSkills, extraSkills);

  // Feats & talents
  let assignedFeats = chosenClass.feats || [];
  let assignedTalents = chosenClass.talents || [];

  if (speciesId === "human") {
    assignedFeats = [...assignedFeats, "bonusFeatForHuman"];
  }

  // Jedi force powers
  let assignedForcePowers = [];
  if (classId === "jedi") {
    assignedFeats = [...assignedFeats, "forceTraining"];
    const wisScore = finalAttributes.wis || 10;
    const wisMod = Math.floor((wisScore - 10) / 2);
    const maxForcePowers = Math.max(1, wisMod + 1);
    assignedForcePowers = await askForForcePowers(forcePowersList, maxForcePowers);
  }

  return {
    name: charName,
    type: "character",
    system: {
      species: speciesId,
      class: classId,
      attributes: finalAttributes,

      defenses: {
        reflex: {
          ability: "dex",
          classBonus: classBonus.reflex || 0,
          misc: 0,
          total: 10
        },
        fortitude: {
          ability: "con",
          classBonus: classBonus.fortitude || 0,
          misc: 0,
          total: 10
        },
        will: {
          ability: "wis",
          classBonus: classBonus.will || 0,
          misc: 0,
          total: 10
        }
      },

      skills: selectedSkills,
      feats: assignedFeats,
      talents: assignedTalents,
      forcePowers: assignedForcePowers,
      equipment: []
    }
  };
}

// Droid generator
async function droidGenerator() {
  const droidModels = [
    { id: "utility", name: "Utility Droid" },
    { id: "security", name: "Security Droid" },
    { id: "protocol", name: "Protocol Droid" }
  ];

  const modelId = await askRadioQuestion("Droid Model", "Choose your droid model:", droidModels);
  if (!modelId) return null;
  const modelName = droidModels.find(m => m.id === modelId)?.name || modelId;

  return {
    name: modelName,
    type: "droid",
    system: {
      model: modelId,
      systems: [],
      abilities: [],
      equipment: []
    }
  };
}

// Main entrypoint
async function main() {
  const classesPath = "systems/swse/data/classes.json";
  const classDBPath = "systems/swse/data/classes-db.json";
  const forcePowersPath = "systems/swse/data/forcepowers.json";

  let classesList = [];
  let classDB = {};
  let forcePowersList = [];

  try {
    classesList = await loadJSON(classesPath);
    classDB = await loadJSON(classDBPath);
    forcePowersList = await loadJSON(forcePowersPath);
  } catch (err) {
    ui.notifications.error(`Error loading JSON: ${err.message}`);
    return;
  }

  const actorType = await new Promise(resolve => {
    new Dialog({
      title: "New Actor",
      content: "<p>Are you creating a Character or a Droid?</p>",
      buttons: {
        character: { label: "Character", callback: () => resolve("character") },
        droid: { label: "Droid", callback: () => resolve("droid") },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "character",
      close: () => resolve(null)
    }).render(true);
  });

  if (!actorType) return;

  const useGenerator = await askYesNoQuestion("Character Generator", `Use the ${actorType} generator?`);

  if (useGenerator) {
    let actorData = null;
    if (actorType === "character") {
      actorData = await characterGenerator(classesList, classDB, forcePowersList);
    } else if (actorType === "droid") {
      actorData = await droidGenerator();
    }

    if (!actorData) {
      ui.notifications.warn("Generation cancelled.");
      return;
    }

    const actor = await Actor.create(actorData);
    actor.sheet?.render(true);
  } else {
    const blankActor = await Actor.create({
      name: `New ${capitalize(actorType)}`,
      type: actorType,
      system: {}
    });
    blankActor.sheet?.render(true);
  }
}

main();
