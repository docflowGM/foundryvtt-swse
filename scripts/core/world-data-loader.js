// ============================================
import { SWSELogger } from '../utils/logger.js';
// FILE: scripts/world-data-loader.js
// FIXED: Validates all data before importing
// ============================================

export class WorldDataLoader {
  
  /**
   * Auto-load data on world startup (if not already loaded)
   */
  static async autoLoad() {
    const dataLoaded = game.settings.get("swse", "dataLoaded");
    
    if (dataLoaded) {
      SWSELogger.log("SWSE | World data already loaded");
      return;
    }
    
    SWSELogger.log("SWSE | Loading world data for first time...");
    
    // Disable auto-load to prevent errors from breaking the system
    // await this.loadAll();
    
    SWSELogger.log("SWSE | Auto-load is currently DISABLED");
    SWSELogger.log("SWSE | Use 'WorldDataLoader.loadAll()' in console to manually load data");
    SWSELogger.log("SWSE | Or enable auto-load after fixing JSON validation issues");
  }
  
  /**
   * Load all data from JSON files
   */
  static async loadAll() {
    SWSELogger.log("SWSE | Starting full data import...");
    
    try {
      await this.loadClasses();
      await this.loadFeats();
      await this.loadTalents();
      await this.loadForcePowers();
      await this.loadWeapons();
      await this.loadArmor();
      await this.loadEquipment();
      // await this.loadVehicles();  // Disabled - needs type field
      // await this.loadNPCs();       // Disabled - needs type field
      
      await game.settings.set("swse", "dataLoaded", true);
      SWSELogger.log("SWSE | ✓ Data import complete!");
      
      ui.notifications.info("SWSE data loaded successfully!");
      
    } catch (error) {
      SWSELogger.error("SWSE | Data import failed:", error);
      ui.notifications.error("Failed to load SWSE data. Check console for details.");
    }
  }
  
  /**
   * Validate item data before creating
   */
  static validateItem(data, expectedType) {
    const errors = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.push("Missing or empty 'name' field");
    }
    
    if (!data.type || data.type.trim() === '') {
      errors.push("Missing or empty 'type' field");
    } else if (data.type !== expectedType) {
      errors.push(`Type mismatch: expected '${expectedType}', got '${data.type}'`);
    }
    
    return errors;
  }
  
  /**
   * Validate actor data before creating
   */
  static validateActor(data, expectedType) {
    const errors = [];
    
    if (!data.name || data.name.trim() === '') {
      errors.push("Missing or empty 'name' field");
    }
    
    if (!data.type || data.type.trim() === '') {
      errors.push("Missing or empty 'type' field");
    } else if (!['character', 'npc', 'vehicle', 'droid'].includes(data.type)) {
      errors.push(`Invalid type: '${data.type}' (must be: character, npc, vehicle, or droid)`);
    }
    
    return errors;
  }
  
  /**
   * Safe item creation with validation
   */
  static async createItem(itemData, itemType) {
    const errors = this.validateItem(itemData, itemType);
    
    if (errors.length > 0) {
      SWSELogger.warn(`SWSE | Skipping invalid ${itemType}:`, itemData.name || 'UNNAMED', errors);
      return null;
    }
    
    try {
      // Check if already exists
      const existing = game.items.find(i => 
        i.name === itemData.name && i.type === itemData.type
      );
      
      if (existing) {
        return existing;
      }
      
      return await Item.create(itemData);
    } catch (error) {
      SWSELogger.error(`SWSE | Failed to create ${itemType}:`, itemData.name, error);
      return null;
    }
  }
  
  /**
   * Safe actor creation with validation
   */
  static async createActor(actorData, actorType) {
    const errors = this.validateActor(actorData, actorType);
    
    if (errors.length > 0) {
      SWSELogger.warn(`SWSE | Skipping invalid ${actorType}:`, actorData.name || 'UNNAMED', errors);
      return null;
    }
    
    try {
      // Check if already exists
      const existing = game.actors.find(a => 
        a.name === actorData.name && a.type === actorData.type
      );
      
      if (existing) {
        return existing;
      }
      
      return await Actor.create(actorData);
    } catch (error) {
      SWSELogger.error(`SWSE | Failed to create ${actorType}:`, actorData.name, error);
      return null;
    }
  }
  
  /**
   * Load classes from JSON
   */
  static async loadClasses() {
    try {
      const response = await fetch("systems/swse/data/classes.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | classes.json not found - skipping");
        return;
      }
      
      const classes = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const classData of classes) {
        const itemData = {
          name: classData.name,
          type: "class",
          system: classData
        };
        
        const created = await this.createItem(itemData, "class");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} classes (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load classes:", error);
    }
  }
  
  /**
   * Load feats from JSON
   */
  static async loadFeats() {
    try {
      const response = await fetch("systems/swse/data/feats.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | feats.json not found - skipping");
        return;
      }
      
      const feats = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const featData of feats) {
        const itemData = {
          name: featData.name,
          type: "feat",
          system: featData
        };
        
        const created = await this.createItem(itemData, "feat");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} feats (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load feats:", error);
    }
  }
  
  /**
   * Load talents from JSON
   */
  static async loadTalents() {
    try {
      const response = await fetch("systems/swse/data/talents.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | talents.json not found - skipping");
        return;
      }
      
      const talents = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const talentData of talents) {
        const itemData = {
          name: talentData.name,
          type: "talent",
          system: talentData
        };
        
        const created = await this.createItem(itemData, "talent");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} talents (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load talents:", error);
    }
  }
  
  /**
   * Load force powers from JSON
   */
  static async loadForcePowers() {
    try {
      const response = await fetch("systems/swse/data/forcepowers.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | forcepowers.json not found - skipping");
        return;
      }
      
      const powers = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const powerData of powers) {
        const itemData = {
          name: powerData.name,
          type: "forcepower",
          system: powerData
        };
        
        const created = await this.createItem(itemData, "forcepower");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} force powers (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load force powers:", error);
    }
  }
  
  /**
   * Load weapons from JSON
   */
  static async loadWeapons() {
    try {
      const response = await fetch("systems/swse/data/weapons.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | weapons.json not found - skipping");
        return;
      }
      
      const weapons = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const weaponData of weapons) {
        const itemData = {
          name: weaponData.name,
          type: "weapon",
          system: weaponData
        };
        
        const created = await this.createItem(itemData, "weapon");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} weapons (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load weapons:", error);
    }
  }
  
  /**
   * Load armor from JSON
   */
  static async loadArmor() {
    try {
      const response = await fetch("systems/swse/data/armor.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | armor.json not found - skipping");
        return;
      }
      
      const armors = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const armorData of armors) {
        const itemData = {
          name: armorData.name,
          type: "armor",
          system: armorData
        };
        
        const created = await this.createItem(itemData, "armor");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} armor (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load armor:", error);
    }
  }
  
  /**
   * Load equipment from JSON
   */
  static async loadEquipment() {
    try {
      const response = await fetch("systems/swse/data/equipment.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | equipment.json not found - skipping");
        return;
      }
      
      const equipment = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const equipData of equipment) {
        const itemData = {
          name: equipData.name,
          type: "item",  // or "equipment" if that's a valid type
          system: equipData
        };
        
        const created = await this.createItem(itemData, "item");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} equipment (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load equipment:", error);
    }
  }
  
  /**
   * Load vehicles from JSON
   * NOTE: Vehicles need 'type' field set to 'vehicle'
   */
  static async loadVehicles() {
    try {
      const response = await fetch("systems/swse/data/vehicles.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | vehicles.json not found - skipping");
        return;
      }
      
      const vehicles = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const vehicleData of vehicles) {
        // Ensure type is set
        const actorData = {
          name: vehicleData.name,
          type: vehicleData.type || "vehicle",  // Default to 'vehicle'
          system: vehicleData
        };
        
        const created = await this.createActor(actorData, "vehicle");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} vehicles (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load vehicles:", error);
    }
  }
  
  /**
   * Load NPCs from JSON
   * NOTE: NPCs need 'type' field set to 'npc' or 'droid'
   */
  static async loadNPCs() {
    try {
      const response = await fetch("systems/swse/data/npc.json");
      if (!response.ok) {
        SWSELogger.log("SWSE | npc.json not found - skipping");
        return;
      }
      
      const npcs = await response.json();
      let loaded = 0;
      let skipped = 0;
      
      for (const npcData of npcs) {
        // Ensure type is set
        const actorData = {
          name: npcData.name,
          type: npcData.type || "npc",  // Default to 'npc'
          system: npcData
        };
        
        const created = await this.createActor(actorData, npcData.type || "npc");
        if (created) loaded++;
        else skipped++;
      }
      
      SWSELogger.log(`SWSE | Loaded ${loaded} NPCs (${skipped} skipped)`);
      
    } catch (error) {
      SWSELogger.warn("SWSE | Could not load NPCs:", error);
    }
  }
  
  /**
   * Clear all loaded data (for testing)
   */
  static async clearAll() {
    const confirm = await Dialog.confirm({
      title: "Clear All SWSE Data?",
      content: "<p>This will delete ALL items and actors imported from JSON files. Are you sure?</p>",
      defaultYes: false
    });
    
    if (!confirm) return;
    
    SWSELogger.log("SWSE | Clearing all imported data...");
    
    // Delete all world items
    const itemIds = game.items.map(i => i.id);
    await Item.deleteDocuments(itemIds);
    
    // Reset the dataLoaded flag
    await game.settings.set("swse", "dataLoaded", false);
    
    SWSELogger.log("SWSE | All data cleared");
    ui.notifications.info("SWSE data cleared. Reload to re-import.");
  }
}

// Make available globally
window.WorldDataLoader = WorldDataLoader;
