// systems/swse/system/swse.js

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

export async function importData() {
  try {
    const attributes = await loadJSON("systems/swse/data/attributes.json");
    const equipment = await loadJSON("systems/swse/data/equipment.json");
    const feats = await loadJSON("systems/swse/data/feats.json");
    const talents = await loadJSON("systems/swse/data/talents.json");
    const forcepowers = await loadJSON("systems/swse/data/forcepowers.json");

    console.log("SWSE | Data loaded", {
      attributes,
      equipment,
      feats,
      talents,
      forcepowers
    });
    return { attributes, equipment, feats, talents, forcepowers };
  } catch (err) {
    console.error("SWSE | Failed to load data:", err);
    ui.notifications.error(`SWSE data load failed: ${err.message}`);
    return null;
  }
}
