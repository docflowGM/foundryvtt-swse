// systems/swse/scripts/chargen.js
import { SWSE_RACES, applyRaceBonuses } from "./races.js";

/* ---------------- Helpers ---------------- */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

/* ---------------- Dialog Helpers ---------------- */
async function askRadioQuestion(title, prompt, options) {
  return new Promise((resolve) => {
    const optionsHtml = options.map(opt =>
      `<label><input type="radio" name="choice" value="${opt.id}" /> ${opt.name}</label><br/>`
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
        cancel: { label: "Cancel", callback: () => resolve(null) }
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
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

/* ---------------- Stat Assignment ---------------- */
async function askForStats() {
  return new Promise(resolve => {
    const stats = ["str", "dex", "con", "int", "wis", "cha"];
    let htmlContent = `<p>Distribute 10 additional points among your stats (min 8, max 18).</p><form>`;
    stats.forEach(stat => {
      htmlContent += `<label>${stat.toUpperCase()}:</label>
        <input type="number" name="${stat}" value="10" min="8" max="18" style="width:50px;" /><br/>`;
    });
    htmlContent += `</form>`;

    new Dialog({
      title: "Assign Stats",
      content: htmlContent,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const base = 10, min = 8, max = 18;
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
        cancel: { label: "Cancel", callback: () => resolve(null) }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

/* ---------------- Skills & Powers ---------------- */
async function askForSkills(classSkills, extraSkills = []) {
  return new Promise(resolve => {
    if ((!classSkills?.length) && (!extraSkills?.length)) return resolve([]);

    const combined = [...(classSkills || []), ...(extraSkills || [])];
    const skillsHtml = combined.map(skill =>
      `<label><input type="checkbox" name="skills" value="${skill.id}" /> ${skill.name}</label><br/>`
    ).join("");

    new Dialog({
      title: "Select Skills",
      content: `<p>Select your skills:</p><form>${skillsHtml}</form>`,
      buttons: {
        ok: {
          label: "OK",
          callback: (html) => {
            const selected = html.find('input[name="skills"]:checked').map((i, el) => el.value).get();
            resolve(selected);
          }
        },
        cancel: { label: "Cancel", callback: () => resolve([]) }
      },
      default: "ok",
      close: () => resolve([])
    }).render(true);
  });
}

async function askForForcePowers(forcePowersList, maxChoices) {
  return new Promise(resolve => {
    if (!forcePowersList?.length || maxChoices <= 0) return resolve([]);

    const powersHtml = forcePowersList.map(p =>
      `<label><input type="checkbox" name="forcePower" value="${p.id}" /> ${p.name}</label><br/>`
    ).join("");

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
            } else resolve(selected);
          }
        },
        cancel: { label: "Cancel", callback: () => resolve([]) }
      },
      default: "ok",
      close: () => resolve([])
    }).render(true);
  });
}

/* ---------------- Generators ---------------- */
async function characterGenerator(classesList, classDB, forcePowersList) {
  const speciesOptions = Object.entries(SWSE_RACES).map(([id, data]) => ({ id, name: data.label }));

  const speciesId = await askRadioQuestion("Species", "Choose your species:", speciesOptions);
  if (!speciesId) return null;

  const classId = await askRadioQuestion("Class", `You chose ${speciesId}. Now pick your class:`, classesList);
  if (!classId) return null;
  const chosenClass = classesList.find(c => c.id === classId);
  const classBonus = classDB[classId]?.defenses || {};

  const charName = await askForName();
  if (!charName) return null;

  const baseAttributes = await askForStats();
  if (!baseAttributes) return null;
  const finalAttributes = applyRaceBonuses(baseAttributes, speciesId);

  const selectedSkills = await askForSkills(chosenClass.skills || []);

  let assignedFeats = chosenClass.feats || [];
  let assignedTalents = chosenClass.talents || [];
  let assignedForcePowers = [];

  if (speciesId === "human") assignedFeats = [...assignedFeats, "bonusFeatForHuman"];
  if (classId === "jedi") {
    assignedFeats = [...assignedFeats, "forceTraining"];
    const wisMod = Math.floor(((finalAttributes.wis ?? 10) - 10) / 2);
    const maxForcePowers = Math.max(1, wisMod + 1);
    assignedForcePowers = await askForForcePowers(forcePowersList, maxForcePowers);
  }

  return {
    name: charName,
    type: "character",
    img: "icons/svg/mystery-man.svg",
    system: {
      species: speciesId,
      class: classId,
      level: 1,
      abilities: Object.fromEntries(Object.entries(finalAttributes).map(([k, v]) => [k, { base: v, temp: 0 }])),
      defenses: {
        reflex: { ability: "dex", class: classBonus.reflex || 0, armor: 0, misc: 0, total: 10 },
        fortitude: { ability: "con", class: classBonus.fortitude || 0, armor: 0, misc: 0, total: 10 },
        will: { ability: "wis", class: classBonus.will || 0, armor: 0, misc: 0, total: 10 }
      },
      hp: { value: 1, max: 1, threshold: 10 },
      skills: selectedSkills,
      feats: assignedFeats,
      talents: assignedTalents,
      forcePowersList: assignedForcePowers,
      equipment: []
    }
  };
}

async function droidGenerator() {
  const models = [
    { id: "utility", name: "Utility Droid" },
    { id: "security", name: "Security Droid" },
    { id: "protocol", name: "Protocol Droid" }
  ];

  const modelId = await askRadioQuestion("Droid Model", "Choose your droid model:", models);
  if (!modelId) return null;
  const modelName = models.find(m => m.id === modelId)?.name || modelId;

  return {
    name: modelName,
    type: "droid",
    img: "icons/svg/robot.svg",
    system: {
      species: "droid",
      subtype: modelId,
      level: 1,
      abilities: {
        str: { base: 10, temp: 0 },
        dex: { base: 10, temp: 0 },
        con: { base: null, temp: 0 },
        int: { base: 10, temp: 0 },
        wis: { base: 10, temp: 0 },
        cha: { base: 10, temp: 0 }
      },
      defenses: {
        reflex: { ability: "dex", class: 0, armor: 0, misc: 0, total: 10 },
        fortitude: { ability: "con", class: 0, armor: 0, misc: 0, total: 10 },
        will: { ability: "wis", class: 0, armor: 0, misc: 0, total: 10 }
      },
      hp: { value: 0, max: 0 },
      skills: [], feats: [], talents: [], gear: []
    }
  };
}

/* ---------------- Entrypoint ---------------- */
async function main() {
  const classesPath = "systems/swse/data/classes.json";
  const classDBPath = "systems/swse/data/classes-db.json";
  const forcePowersPath = "systems/swse/data/forcepowers.json";

  let classesList = [], classDB = {}, forcePowersList = [];
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
  if (!useGenerator) {
    const blankActor = await Actor.create({
      name: `New ${capitalize(actorType)}`,
      type: actorType,
      img: actorType === "droid" ? "icons/svg/robot.svg" : "icons/svg/mystery-man.svg",
      system: {}
    });
    return blankActor.sheet?.render(true);
  }

  let actorData = null;
  if (actorType === "character") actorData = await characterGenerator(classesList, classDB, forcePowersList);
  else if (actorType === "droid") actorData = await droidGenerator();

  if (!actorData) return ui.notifications.warn("Generation cancelled.");
  const actor = await Actor.create(actorData);
  actor.sheet?.render(true);
}

main();
