import { SWSE_RACES, applyRaceBonuses } from "../data/races.js";

// --- Helpers ---

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

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

async function askMultiSelect(title, prompt, options, maxChoices = null) {
  return new Promise(resolve => {
    const optionsHtml = options.map(opt => `
      <label>
        <input type="checkbox" name="choice" value="${opt.id}" />
        ${opt.name}
      </label><br/>
    `).join("");

    new Dialog({
      title,
      content: `<p>${prompt}</p><form>${optionsHtml}</form>`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const selected = html.find('input[name="choice"]:checked')
              .map((i, el) => el.value)
              .get();

            if (maxChoices !== null && selected.length > maxChoices) {
              ui.notifications.error(`You can only select up to ${maxChoices}.`);
              resolve([]);
            } else {
              resolve(selected);
            }
          }
        },
        cancel: { label: "Cancel", callback: () => resolve([]) }
      },
      default: "ok",
      close: () => resolve([])
    }).render(true);
  });
}

// Ask user to assign stats
async function askForStats() {
  return new Promise(resolve => {
    const stats = ["str", "dex", "con", "int", "wis", "cha"];
    let htmlContent = `<p>Distribute 10 additional points (min 8, max 18).</p><form>`;
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
              ui.notifications.error("Invalid stats: max 10 points distributed.");
              resolve(null);
            } else {
              resolve(allocated);
            }
          }
        },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

// --- Main Character Generator ---

async function characterGenerator(classesList, skillsList, featsList, forcePowersList) {
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

  const charName = await new Promise(resolve => {
    new Dialog({
      title: "Character Name",
      content: `<p>Enter your character's name:</p><input type="text" name="charName" />`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const name = html.find('input[name="charName"]').val().trim();
            resolve(name || null);
          }
        },
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
  if (!charName) return null;

  const baseAttributes = await askForStats();
  if (!baseAttributes) return null;
  const finalAttributes = applyRaceBonuses(baseAttributes, speciesId);

  // Skills
  const classSkills = chosenClass.skills?.map(sid => skillsList.find(s => s.id === sid)) || [];
  let extraSkills = [];
  if (speciesId === "human") {
    extraSkills = skillsList; // Humans can pick any skill
  }
  const selectedSkills = await askMultiSelect("Skills", "Select your skills:", [...classSkills, ...extraSkills]);

  // Feats
  let assignedFeats = chosenClass.feats || [];
  if (speciesId === "human") {
    const bonusFeat = await askRadioQuestion("Bonus Feat", "Humans gain a bonus feat. Choose one:", featsList);
    if (bonusFeat) assignedFeats.push(bonusFeat);
  }

  // Talents (optional – same logic as feats)
  let assignedTalents = chosenClass.talents || [];

  // Force Powers
  let assignedForcePowers = [];
  if (classId === "jedi") {
    assignedFeats.push("forceTraining");
    const wisScore = finalAttributes.wis || 10;
    const wisMod = Math.floor((wisScore - 10) / 2);
    const maxForcePowers = Math.max(1, wisMod + 1);
    assignedForcePowers = await askMultiSelect("Force Powers", `Select up to ${maxForcePowers} Force Powers:`, forcePowersList, maxForcePowers);
  }

  return {
    name: charName,
    type: "character",
    system: {
      species: speciesId,
      class: classId,
      attributes: finalAttributes,
      skills: selectedSkills,
      feats: assignedFeats,
      talents: assignedTalents,
      forcePowers: assignedForcePowers,
      equipment: []
    }
  };
}

// Droid generator stays same
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

// --- Main entrypoint ---
async function main() {
  const classesPath = `/systems/foundryvtt-swse/data/classes.json`;
  const skillsPath = `/systems/foundryvtt-swse/data/skills.json`;
  const featsPath = `/systems/foundryvtt-swse/data/feats.json`;
  const forcePowersPath = `/systems/foundryvtt-swse/data/forcepowers.json`;

  let classesList = [], skillsList = [], featsList = [], forcePowersList = [];
  try {
    classesList = await loadJSON(classesPath);
    skillsList = await loadJSON(skillsPath);
    featsList = await loadJSON(featsPath);
    forcePowersList = await loadJSON(forcePowersPath);
  } catch (err) {
    ui.notifications.error(`Error loading JSON: ${err.message}`);
    return;
  }

  const actorType = await new Promise(resolve => {
    new Dialog({
      title: "New Actor",
      content: "<p>Create a Character or Droid?</p>",
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

  const useGenerator = await new Promise(resolve => {
    new Dialog({
      title: "Character Generator",
      content: `<p>Use the ${actorType} generator?</p>`,
      buttons: {
        yes: { label: "Yes", callback: () => resolve(true) },
        no: { label: "No", callback: () => resolve(false) }
      },
      default: "yes",
      close: () => resolve(false)
    }).render(true);
  });

  if (useGenerator) {
    let actorData = null;
    if (actorType === "character") {
      actorData = await characterGenerator(classesList, skillsList, featsList, forcePowersList);
    } else {
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
      type: actorType
    });
    blankActor.sheet?.render(true);
  }
}

main();
