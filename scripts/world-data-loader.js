// ============================================
// SWSE World Data Loader (No Compendiums)
// ============================================

export class WorldDataLoader {
  static DATA_SOURCES = {
    classes: "data/classes-db.json",
    feats: "data/feats.json",
    talents: "data/talents.json",
    forcePowers: "data/forcepowers.json",
    weapons: "data/weapons.json",
    armor: "data/armor.json",
    equipment: "data/equipment.json",
    skills: "data/skills.json",
    conditions: "data/conditions.json",
    combatActions: "data/combat-actions.json"
  };

  static async loadAllData() {
    console.log("SWSE | Loading world data...");

    const results = { created: 0, skipped: 0, errors: 0 };

    for (const [key, path] of Object.entries(this.DATA_SOURCES)) {
      try {
        const items = await this.loadDataFile(path);
        const converted = await this.convertToItems(items, key);

        for (const itemData of converted) {
          const existing = game.items.find(i =>
            i.name === itemData.name && i.type === itemData.type
          );

          if (existing) {
            results.skipped++;
            continue;
          }

          await Item.create(itemData);
          results.created++;
        }

        console.log(`✅ Loaded ${converted.length} ${key}`);
      } catch (err) {
        console.error(`❌ Failed to load ${key}:`, err);
        results.errors++;
      }
    }

    ui.notifications.info(
      `SWSE Data Loaded: ${results.created} created, ${results.skipped} skipped`
    );

    return results;
  }

  static async loadDataFile(path) {
    const response = await fetch(`systems/swse/${path}`);
    if (!response.ok) throw new Error(`Failed to load ${path}`);

    const data = await response.json();

    if (data.classes) return data.classes;
    if (data.skills) return data.skills;
    if (data.actions) return data.actions;
    if (data.conditions) return data.conditions;
    if (Array.isArray(data)) return data.flat();

    return data;
  }

  static async convertToItems(data, type) {
    return data.map(item => {
      const baseItem = {
        name: item.name,
        type: this.getItemType(type),
        img: this.getDefaultIcon(type, item.name),
        system: item.system || item
      };

      if (baseItem.system.name) delete baseItem.system.name;
      return baseItem;
    });
  }

  static getItemType(dataType) {
    const typeMap = {
      classes: "class",
      feats: "feat",
      talents: "talent",
      forcePowers: "forcepower",
      weapons: "weapon",
      armor: "armor",
      equipment: "equipment",
      skills: "skill",
      conditions: "condition",
      combatActions: "combat-action"
    };
    return typeMap[dataType] || "equipment";
  }

  static getDefaultIcon(type, name) {
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    return `systems/swse/assets/icons/${type}/${slug}.png`;
  }

  static async autoLoad() {
    const hasLoaded = game.settings.get("swse", "dataLoaded");
    if (!hasLoaded) {
      await this.loadAllData();
      await game.settings.set("swse", "dataLoaded", true);
    }
  }
}
