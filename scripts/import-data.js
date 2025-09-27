export async function importAllData() {
  const dataFiles = [
    {file: "classes.json", pack: "swse.swse-classes", type: "Item"},
    {file: "equipment.json", pack: "swse.swse-equipment", type: "Item"},
    {file: "feats.json", pack: "swse.swse-feats", type: "Item"},
    {file: "talents.json", pack: "swse.swse-talents", type: "Item"},
    {file: "vehicles.json", pack: "swse.swse-vehicles", type: "Actor"},
    {file: "skills.json", pack: "swse.swse-skills", type: "Item"},
    {file: "species.json", pack: "swse.swse-species", type: "Item"}
  ];

  for (let {file, pack, type} of dataFiles) {
    console.log(`📥 Importing ${file} into ${pack}...`);
    try {
      const response = await fetch(`systems/swse/data/${file}`);
      if (!response.ok) throw new Error(`Could not load ${file}`);
      const json = await response.json();

      const compendium = game.packs.get(pack);
      if (!compendium) throw new Error(`Compendium ${pack} not found`);

      // Convert JSON into documents
      const docs = await Promise.all(json.map(entry => {
        return type === "Actor" ? new Actor(entry).toObject() : new Item(entry).toObject();
      }));

      // Insert into compendium
      await compendium.importDocuments(docs);

      console.log(`✅ Imported ${docs.length} entries into ${pack}`);
    } catch (err) {
      console.error(`❌ Failed to import ${file}:`, err);
      ui.notifications.error(`❌ Failed to import ${file}: ${err.message}`);
    }
  }
}
