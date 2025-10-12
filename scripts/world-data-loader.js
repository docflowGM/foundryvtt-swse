/**
 * SWSE World Data Loader
 * Automatically loads JSON data from /systems/swse/data/ into compendiums.
 */

Hooks.once("ready", async function() {
  console.log("🚀 Starting SWSE Compendium Auto-Import...");

  const systemId = "swse";
  const dataPath = `systems/${systemId}/data`;
  const files = [
    "classes.json",
    "npc-classes.json",
    "feats.json",
    "talents.json",
    "equipment.json",
    "weapons.json",
    "armor.json",
    "vehicles.json",
    "forcepowers.json"
  ];

  for (const file of files) {
    const url = `${dataPath}/${file}`;
    const packName = `${systemId}.${file.replace(".json", "")}`;

    console.log(`📦 Importing ${file} from ${url}`);
    const pack = game.packs.get(packName);

    if (!pack) {
      ui.notifications.warn(`⚠️ No compendium found for ${packName}`);
      continue;
    }

    // Try fetching JSON file
    let data;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data = await response.json();
    } catch (err) {
      console.error(`❌ Failed to load ${file}`, err);
      ui.notifications.error(`❌ Failed to import ${file}: ${err.message}`);
      continue;
    }

    // Unlock compendium temporarily
    const wasLocked = pack.locked;
    if (wasLocked) await pack.configure({ locked: false });

    // Determine document type (Actor or Item)
    const type = data[0]?.type === "character" || data[0]?.type === "npc" ? "Actor" : "Item";
    const cls = CONFIG[type].documentClass;

    try {
      await pack.documentClass.createDocuments(data, { pack: pack.collection });
      console.log(`✅ Imported ${data.length} entries into ${pack.collection}`);
      ui.notifications.info(`✅ Imported ${data.length} entries into ${pack.collection}`);
    } catch (err) {
      console.error(`❌ Failed to import ${file}`, err);
      ui.notifications.error(`❌ Failed to import ${file}: ${err.message}`);
    }

    // Re-lock compendium after import
    if (wasLocked) await pack.configure({ locked: true });
  }

  console.log("✨ SWSE Compendium Import Complete.");
});
