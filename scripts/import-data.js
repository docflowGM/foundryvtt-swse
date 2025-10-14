// ============================================
// FILE: scripts/import-data.js (UPDATED)
// ============================================
/**
 * Import helper to convert your JSON data into Foundry Items/Actors
 */

export async function importClassesFromDB() {
  try {
    const response = await fetch("systems/swse/data/classes-db.json");
    if (!response.ok) throw new Error("Could not load classes-db.json");
    
    const data = await response.json();
    const classes = data.classes;
    
    const items = classes.map(cls => ({
      name: cls.name,
      type: "class",
      img: `systems/swse/assets/icons/classes/${cls.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      system: {
        description: `${cls.type} Class`,
        hitDie: cls.type === "Heroic" ? "1d10" : "1d8",
        level: 1,
        baseAttackProgression: cls.type === "Heroic" ? "high" : "medium",
        defenseBonuses: cls.defense_bonus,
        sourcebook: "Core Rulebook",
        classType: cls.type
      }
    }));
    
    console.log(`SWSE | Converted ${items.length} classes`);
    return items;
  } catch (err) {
    console.error("SWSE | Failed to import classes:", err);
    return [];
  }
}

export async function importSkillsFromDB() {
  try {
    const response = await fetch("systems/swse/data/skills.json");
    if (!response.ok) throw new Error("Could not load skills.json");
    
    const data = await response.json();
    const skills = data.skills;
    
    const items = skills.map(skill => ({
      name: skill.name,
      type: "skill",
      img: `systems/swse/assets/icons/skills/${skill.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      system: {
        attribute: skill.ability.toLowerCase(),
        trainedOnly: false,
        description: `${skill.name} skill based on ${skill.ability}`,
        classes: skill.classes
      }
    }));
    
    console.log(`SWSE | Converted ${items.length} skills`);
    return items;
  } catch (err) {
    console.error("SWSE | Failed to import skills:", err);
    return [];
  }
}

export async function importForcePowersFromDB() {
  try {
    const response = await fetch("systems/swse/data/forcepowers.json");
    if (!response.ok) throw new Error("Could not load forcepowers.json");
    
    let forcePowers = await response.json();
    
    // Handle if it's an array of arrays (your file has this structure)
    if (Array.isArray(forcePowers) && Array.isArray(forcePowers[0])) {
      forcePowers = forcePowers.flat();
    }
    
    const items = forcePowers.map(power => ({
      name: power.name,
      type: "forcepower",
      img: `systems/swse/assets/icons/forcepowers/${power.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      system: {
        type: power.type || "Force",
        descriptor: power.descriptor || [],
        action: power.action || "Standard",
        target: power.target || "",
        checkType: power.check_type || "Use the Force",
        dcChart: power.dc_chart || [],
        forcePointEffect: power.force_point_effect || "",
        maintainable: power.maintainable || false,
        description: power.dc_chart?.map(dc => `DC ${dc.dc}: ${dc.effect}`).join("\n") || "",
        sourcebook: power.sourcebook || "Core Rulebook",
        page: power.page || null,
        tags: power.tags || [],
        uses: { current: 1, max: 1 }
      }
    }));
    
    console.log(`SWSE | Converted ${items.length} force powers`);
    return items;
  } catch (err) {
    console.error("SWSE | Failed to import force powers:", err);
    return [];
  }
}

export async function importCombatActionsFromDB() {
  try {
    const response = await fetch("systems/swse/data/combat-actions.json");
    if (!response.ok) throw new Error("Could not load combat-actions.json");
    
    const data = await response.json();
    const actions = data.actions;
    
    const items = actions.map(action => ({
      name: action.name,
      type: "combat-action",
      img: `systems/swse/assets/icons/actions/${action.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      system: {
        actionCost: action.action?.type || "Standard",
        notes: action.notes || "",
        relatedSkills: action.relatedSkills || [],
        description: action.notes || ""
      }
    }));
    
    console.log(`SWSE | Converted ${items.length} combat actions`);
    return items;
  } catch (err) {
    console.error("SWSE | Failed to import combat actions:", err);
    return [];
  }
}

export async function importConditionsFromDB() {
  try {
    const response = await fetch("systems/swse/data/conditions.json");
    if (!response.ok) throw new Error("Could not load conditions.json");
    
    let data = await response.json();
    
    // Your conditions.json has invalid JSON structure - fix it
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    
    const conditions = data.conditions || [];
    
    const items = conditions.filter(c => c.name).map(condition => ({
      name: condition.name || condition.id,
      type: "equipment",
      img: `systems/swse/assets/icons/conditions/${(condition.name || condition.id).toLowerCase().replace(/\s+/g, '-')}.png`,
      system: {
        description: condition.description || "",
        effects: condition.effects || [],
        conditionTrack: condition.conditionTrack || []
      }
    }));
    
    console.log(`SWSE | Converted ${items.length} conditions`);
    return items;
  } catch (err) {
    console.error("SWSE | Failed to import conditions:", err);
    return [];
  }
}

export async function importAllData() {
  console.log("SWSE | Starting data import...");
  
  const classes = await importClassesFromDB();
  const skills = await importSkillsFromDB();
  const forcePowers = await importForcePowersFromDB();
  const combatActions = await importCombatActionsFromDB();
  const conditions = await importConditionsFromDB();
  
  // Create world items
  const allItems = [...classes, ...skills, ...forcePowers, ...combatActions, ...conditions];
  
  for (const itemData of allItems) {
    try {
      const existing = game.items.find(i => i.name === itemData.name && i.type === itemData.type);
      if (!existing) {
        await Item.create(itemData);
        console.log(`Created: ${itemData.name}`);
      }
    } catch (err) {
      console.error(`Failed to create ${itemData.name}:`, err);
    }
  }
  
  ui.notifications.info(`SWSE | Imported ${allItems.length} items!`);
  console.log("SWSE | Data import complete!");
}