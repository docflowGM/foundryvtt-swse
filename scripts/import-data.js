// scripts/import-data.js
export async function importAllData() {
  const mappings = [
    { file: "classes.json", pack: "swse.swse-classes", type: "class" },
    { file: "equipment.json", pack: "swse.swse-equipment", type: "equipment" },
    { file: "feats.json", pack: "swse.swse-feats", type: "feat" },
    { file: "talents.json", pack: "swse.swse-talents", type: "talent" },
    { file: "vehicles.json", pack: "swse.swse-vehicles", type: "vehicle" },
    { file: "skills.json", pack: "swse.swse-skills", type: "skill" },
    { file: "species.json", pack: "swse.swse-species", type: "species" }
    // 👆 Add more here if you add new JSON files and packs
  ];

  for (let map of mappings) {
    try {
      console.log(`📥 Importing ${map.file} into ${map.pack}...`);

      const response = await fetch(`systems/swse/data/${map.file}`);
      if (!response.ok) {
        ui.notifications.warn(`❌ Could not load ${map.file}`);
        continue;
      }
      const data = await response.json();

      const pack = game.packs.get(map.pack);
      if (!pack) {
        ui.notifications.warn(`❌ Pack not found: ${map.pack}`);
        continue;
      }

      // Convert JSON into Item documents
      const docs = data.map(entry => ({
        name: entry.name ?? "Unnamed",
        type: map.type,
        system: entry
      }));

      // Clear old contents before reimporting
      const existing = await pack.getDocuments();
      if (existing.length > 0) {
        await pack.deleteDocuments(existing.map(e => e.id));
      }

      await pack.importDocuments(docs);
      ui.notifications.info(`✅ Imported ${docs.length} entries into ${map.pack}`);
    } catch (err) {
      console.error(err);
      ui.notifications.error(`❌ Failed to import ${map.file}: ${err.message}`);
    }
  }
}

// Expose to game namespace so you can call it easily in dev console
Hooks.once("ready", () => {
  game.swse = game.swse || {};
  game.swse.importAllData = importAllData;
  console.log("SWSE Importer Ready → use game.swse.importAllData()");
});
