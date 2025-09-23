// Helper for capitalization
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

// Load JSON from system data folder
async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

// Show radio button question dialog
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

// Show simple yes/no question dialog
async function askYesNoQuestion(title, prompt) {
  return new Promise((resolve) => {
    new Dialog({
      title,
      content: `<p>${prompt}</p>`,
      buttons: {
        yes: {
          label: "Yes",
          callback: () => resolve(true)
        },
        no: {
          label: "No",
          callback: () => resolve(false)
        }
      },
      default: "yes",
      close: () => resolve(false)
    }).render(true);
  });
}

// Character generator with dynamic JSON species/classes
async function characterGenerator(speciesList, classesList) {
  const speciesId = await askRadioQuestion("Species", "Choose your species:", speciesList);
  if (!speciesId) return null;
  const speciesName = speciesList.find(s => s.id === speciesId)?.name || speciesId;

  const classId = await askRadioQuestion("Class", `You chose ${speciesName}. Now pick your class:`, classesList);
  if (!classId) return null;
  const className = classesList.find(c => c.id === classId)?.name || classId;

  return {
    name: `${speciesName} ${className}`,
    type: "character",
    data: {
      species: speciesId,
      class: classId,
      attributes: {},
      talents: [],
      feats: [],
      equipment: []
    }
  };
}

// Droid generator placeholder
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
    data: {
      model: modelId,
      systems: [],
      abilities: [],
      equipment: []
    }
  };
}

async function main() {
  // Load JSON data
  const systemName = game.system.id;  // automatically get current system id
  const speciesPath = `/systems/${systemName}/data/species.json`;
  const classesPath = `/systems/${systemName}/data/classes.json`;

  let speciesList = [];
  let classesList = [];

  try {
    speciesList = await loadJSON(speciesPath);
    classesList = await loadJSON(classesPath);
  } catch (err) {
    ui.notifications.error(`Error loading species or classes JSON: ${err.message}`);
    return;
  }

  // Ask actor type
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

  // Ask if user wants to use generator
  const useGenerator = await askYesNoQuestion("Character Generator", `Use the ${actorType} generator?`);

  if (useGenerator) {
    let actorData = null;
    if (actorType === "character") {
      actorData = await characterGenerator(speciesList, classesList);
    } else if (actorType === "droid") {
      actorData = await droidGenerator();
    }
    if (!actorData) {
      ui.notifications.warn("Character generation cancelled.");
      return;
    }
    const actor = await Actor.create(actorData);
    actor.sheet.render(true);
  } else {
    // Create blank actor
    const blankActor = await Actor.create({
      name: `New ${actorType.capitalize()}`,
      type: actorType,
      data: {}
    });
    blankActor.sheet.render(true);
  }
}

main();
