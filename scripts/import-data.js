async function importJSONToCompendium(jsonPath, packName, type) {
  // Fetch JSON
  const response = await fetch(`systems/swse/data/${jsonPath}`);
  if (!response.ok) {
    ui.notifications.error(`Failed to load ${jsonPath}`);
    return;
  }
  const data = await response.json();

  // Get the pack
  const pack = game.packs.get(`swse.${packName}`);
  if (!pack) {
    ui.notifications.error(`Compendium ${packName} not found`);
    return;
  }

  // Convert JSON into Item documents
  const items = data.map(entry => ({
    name: entry.name,
    type: type,
    system: entry
  }));

  // Import into the compendium
  await pack.importDocuments(items);
  ui.notifications.info(`Imported ${items.length} entries into ${packName}`);
}

// Example calls:
importJSONToCompendium("classes.json", "swse-classes", "class");
importJSONToCompendium("equipment.json", "swse-equipment", "equipment");
importJSONToCompendium("feats.json", "swse-feats", "feat");
importJSONToCompendium("talents.json", "swse-talents", "talent");
importJSONToCompendium("vehicles.json", "swse-vehicles", "vehicle");
