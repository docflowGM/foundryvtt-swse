/**
 * Class selection and species handling for SWSE Level Up system
 * Includes level 0 character creation (species, attributes)
 */

import { SWSELogger } from '../../utils/logger.js';
import { getMentorForClass, getMentorGreeting, getLevel1Class, setLevel1Class } from '../mentor-dialogues.js';
import { isBaseClass, getCharacterClasses, getClassDefenseBonuses, calculateHPGain } from './levelup-shared.js';
import { meetsClassPrerequisites } from './levelup-validation.js';
import { getClassProperty } from '../chargen/chargen-property-accessor.js';

/**
 * Get class metadata (icon and description)
 * @param {string} className - The class name
 * @returns {Object} Metadata with icon and description
 */
function getClassMetadata(className) {
  const metadata = {
    'Jedi': { icon: 'fa-jedi', description: 'Force-wielding guardians of peace and justice' },
    'Noble': { icon: 'fa-crown', description: 'Leaders, diplomats, and aristocrats of influence' },
    'Scoundrel': { icon: 'fa-mask', description: 'Rogues, smugglers, and fortune seekers' },
    'Scout': { icon: 'fa-binoculars', description: 'Explorers, trackers, and wilderness experts' },
    'Soldier': { icon: 'fa-shield-alt', description: 'Warriors, tacticians, and military specialists' }
  };
  return metadata[className] || { icon: 'fa-user', description: '' };
}

/**
 * Get available classes from the compendium
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Promise<Array>} Available classes
 */
export async function getAvailableClasses(actor, pendingData) {
  const classPack = game.packs.get('swse.classes');
  if (!classPack) {
    SWSELogger.error("SWSE LevelUp | Classes compendium pack not found!");
    ui.notifications.error("Failed to load classes compendium. Classes will not be available.");
    return [];
  }

  const allClasses = await classPack.getDocuments();
  const availableClasses = [];

  // Check prerequisites for each class
  for (const classDoc of allClasses) {
    const isBase = isBaseClass(classDoc.name) || classDoc.system.base_class === true;

    // meetsClassPrerequisites is now async (loads from JSON)
    if (await meetsClassPrerequisites(classDoc, actor, pendingData)) {
      const metadata = getClassMetadata(classDoc.name);
      availableClasses.push({
        id: classDoc._id,
        name: classDoc.name,
        system: classDoc.system,
        img: classDoc.img,
        isBase: isBase,
        isPrestige: !isBase,
        icon: metadata.icon,
        description: metadata.description
      });
    }
  }

  return availableClasses;
}

/**
 * Get available species from the species compendium
 * @returns {Promise<Array>} Array of species objects
 */
export async function getAvailableSpecies() {
  const speciesPack = game.packs.get('swse.species');
  if (!speciesPack) {
    SWSELogger.error('SWSE LevelUp | Species compendium not found!');
    ui.notifications.error("Failed to load species compendium. Species will not be available.");
    return [];
  }

  const allSpecies = await speciesPack.getDocuments();
  SWSELogger.log(`SWSE LevelUp | Loaded ${allSpecies.length} species from compendium`);

  const availableSpecies = [];

  for (const speciesDoc of allSpecies) {
    availableSpecies.push({
      id: speciesDoc.id || speciesDoc._id,
      name: speciesDoc.name,
      system: speciesDoc.system,
      img: speciesDoc.img
    });
    SWSELogger.log(`SWSE LevelUp | Species: ${speciesDoc.name} (ID: ${speciesDoc.id || speciesDoc._id})`);
  }

  if (availableSpecies.length === 0) {
    SWSELogger.warn('SWSE LevelUp | No species found in compendium!');
  }

  // Sort by source material (Core first, then alphabetically)
  return sortSpeciesBySource(availableSpecies);
}

/**
 * Sort species by source material, prioritizing Core Rulebook first
 * @param {Array} species - Array of species documents
 * @returns {Array} Sorted species array
 */
function sortSpeciesBySource(species) {
  if (!species || species.length === 0) return species;

  // Define source priority order (Core first, then alphabetically)
  const sourcePriority = {
    "Core": 0,
    "Core Rulebook": 0,
    "Knights of the Old Republic": 1,
    "KotOR": 1,
    "KOTOR": 1,
    "Clone Wars": 2,
    "Rebellion Era": 3,
    "Legacy Era": 4,
    "The Force Unleashed": 5,
    "Galaxy at War": 6,
    "Unknown Regions": 7,
    "Scum and Villainy": 8,
    "Threats of the Galaxy": 9,
    "Jedi Academy": 10
  };

  // Sort species
  return species.sort((a, b) => {
    const sourceA = a.system?.source || "Unknown";
    const sourceB = b.system?.source || "Unknown";

    // Get priority (default to 999 for unknown sources)
    const priorityA = sourcePriority[sourceA] ?? 999;
    const priorityB = sourcePriority[sourceB] ?? 999;

    // First sort by source priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // If same priority (or both unknown), sort by source name alphabetically
    if (sourceA !== sourceB) {
      return sourceA.localeCompare(sourceB);
    }

    // Within same source, sort by species name alphabetically
    return (a.name || "").localeCompare(b.name || "");
  });
}

/**
 * Handle species selection for level 0 characters
 * @param {string} speciesId - The species ID
 * @param {string} speciesName - The species name
 * @returns {Promise<Object|null>} The selected species document or null
 */
export async function selectSpecies(speciesId, speciesName) {
  SWSELogger.log(`SWSE LevelUp | Attempting to select species: ${speciesName} (ID: ${speciesId})`);

  const speciesPack = game.packs.get('swse.species');
  if (!speciesPack) {
    SWSELogger.error('SWSE LevelUp | Species compendium not found!');
    ui.notifications.error("Species compendium not found! Please check that the swse.species compendium exists.");
    return null;
  }

  // Try to get the document using the ID if provided
  let speciesDoc = null;
  if (speciesId && speciesId !== 'null' && speciesId !== 'undefined') {
    speciesDoc = await speciesPack.getDocument(speciesId);
  }

  // If not found by ID, try searching by name as a fallback
  if (!speciesDoc && speciesName) {
    const allSpecies = await speciesPack.getDocuments();
    speciesDoc = allSpecies.find(s => s.name === speciesName);
  }

  if (!speciesDoc) {
    SWSELogger.error(`SWSE LevelUp | Species not found with ID: ${speciesId} or name: ${speciesName}`);
    SWSELogger.log('SWSE LevelUp | Available species in pack:', await speciesPack.getDocuments());
    ui.notifications.error(`Species "${speciesName}" not found! The species compendium may be empty or the ID is incorrect.`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected species: ${speciesName}`, speciesDoc.system);
  return speciesDoc;
}

/**
 * Handle class selection
 * @param {string} classId - The class ID
 * @param {Actor} actor - The actor
 * @param {Object} context - Level-up context with currentStep, mentor, etc.
 * @returns {Promise<Object|null>} The selected class document or null
 */
export async function selectClass(classId, actor, context) {
  const classPack = game.packs.get('swse.classes');
  const classDoc = await classPack.getDocument(classId);

  if (!classDoc) {
    ui.notifications.error("Class not found!");
    return null;
  }

  // Check if multiclassing (choosing a different class than current classes)
  const currentClasses = getCharacterClasses(actor);
  const classNames = Object.keys(currentClasses);
  const isMulticlassing = classNames.length > 0 && !classNames.includes(classDoc.name);

  // If multiclassing and not already confirmed, show confirmation dialog
  if (isMulticlassing && context.selectedClass?.name !== classDoc.name) {
    const confirmed = await Dialog.confirm({
      title: "Multiclass Confirmation",
      content: `
        <p>You are about to multiclass into <strong>${classDoc.name}</strong>.</p>
        <p><strong>Current class(es):</strong> ${classNames.join(', ')}</p>
        <p><strong>Multiclassing considerations:</strong></p>
        <ul>
          <li>You may need to meet prestige class prerequisites</li>
          <li>Your class features will progress separately</li>
          <li>You may gain additional skills or feats based on settings</li>
        </ul>
        <p>Continue with multiclassing?</p>
      `,
      defaultYes: false
    });

    if (!confirmed) {
      SWSELogger.log(`SWSE LevelUp | Multiclass to ${classDoc.name} cancelled by user`);
      return null;
    }
  }

  SWSELogger.log(`SWSE LevelUp | Selected class: ${classDoc.name}`, classDoc.system);

  // Update mentor based on class type and character level
  const isPrestige = !isBaseClass(classDoc.name);
  const currentLevel = actor.system.level || 0;

  if (isPrestige) {
    // For prestige classes, use the prestige class mentor
    context.mentor = getMentorForClass(classDoc.name);
    context.currentMentorClass = classDoc.name;
    SWSELogger.log(`SWSE LevelUp | Switched to prestige class mentor: ${context.mentor.name}`);
  } else if (currentLevel === 0 || currentLevel === 1) {
    // For level 0->1 or level 1->2, use the selected base class mentor
    context.mentor = getMentorForClass(classDoc.name);
    context.currentMentorClass = classDoc.name;
    SWSELogger.log(`SWSE LevelUp | Switched to base class mentor: ${context.mentor.name}`);
  } else {
    // For higher levels, use the level 1 class mentor
    const level1Class = getLevel1Class(actor);
    context.mentor = getMentorForClass(level1Class || classDoc.name);
    context.currentMentorClass = level1Class || classDoc.name;
  }

  // Get appropriate greeting for the current class level
  currentClasses = getCharacterClasses(actor);
  const classLevel = (currentClasses[classDoc.name] || 0) + 1;
  context.mentorGreeting = getMentorGreeting(context.mentor, classLevel, actor);

  return classDoc;
}

/**
 * Apply prestige class features at level 1
 * @param {Object} classDoc - The class document
 */
export async function applyPrestigeClassFeatures(classDoc) {
  SWSELogger.log(`SWSE LevelUp | Applying prestige class features for ${classDoc.name}`);

  const startingFeatures = getClassProperty(classDoc, 'startingFeatures', []);

  // Apply all level 1 features (except max HP which is handled separately)
  for (const feature of startingFeatures) {
    if (feature.type === 'proficiency' || feature.type === 'class_feature') {
      SWSELogger.log(`SWSE LevelUp | Auto-applying: ${feature.name}`);
      // Features will be applied in the complete level-up process
    }
  }
}

/**
 * Apply class features for a specific level
 * @param {Object} classDoc - The class document
 * @param {number} classLevel - The level in this class
 * @param {Actor} actor - The actor
 */
export async function applyClassFeatures(classDoc, classLevel, actor) {
  const levelProgression = getClassProperty(classDoc, 'levelProgression', null);
  if (!levelProgression || !Array.isArray(levelProgression)) return;

  const levelData = levelProgression.find(lp => lp.level === classLevel);
  if (!levelData) return;

  SWSELogger.log(`SWSE LevelUp | Applying class features for ${classDoc.name} level ${classLevel}:`, levelData);

  // Apply Force Points if specified
  if (levelData.force_points && levelData.force_points > 0) {
    const currentMax = actor.system.forcePoints?.max || 5;
    const newMax = currentMax + levelData.force_points;
    const currentValue = actor.system.forcePoints?.value || 5;
    const newValue = currentValue + levelData.force_points;

    await actor.update({
      "system.forcePoints.max": newMax,
      "system.forcePoints.value": newValue
    });

    SWSELogger.log(`SWSE LevelUp | Increased Force Points by ${levelData.force_points} (${currentMax} → ${newMax})`);
    ui.notifications.info(`Force Points increased by ${levelData.force_points}!`);
  }

  // Process each feature that's not a choice (talents and feats are already handled)
  if (levelData.features) {
    for (const feature of levelData.features) {
      if (feature.type === 'proficiency' || feature.type === 'class_feature' || feature.type === 'feat_grant') {
        SWSELogger.log(`SWSE LevelUp | Granting class feature: ${feature.name}`);

        // Create a feature item on the actor
        const featureItem = {
          name: feature.name,
          type: "feat", // Use feat type for class features
          img: "icons/svg/upgrade.svg",
          system: {
            description: `Class feature from ${classDoc.name} level ${classLevel}`,
            source: `${classDoc.name} ${classLevel}`,
            type: feature.type
          }
        };

        // Check if this feature already exists
        const existingFeature = actor.items.find(i =>
          i.name === feature.name && i.system.source === featureItem.system.source
        );

        if (!existingFeature) {
          await actor.createEmbeddedDocuments("Item", [featureItem]);
          ui.notifications.info(`Gained class feature: ${feature.name}`);
        }
      }
    }
  }
}

/**
 * Create or update class item on actor
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @returns {Promise<number>} The new class level
 */
export async function createOrUpdateClassItem(classDoc, actor) {
  // Check if character already has this class
  const existingClass = actor.items.find(i => i.type === 'class' && i.name === classDoc.name);

  // Calculate what level in this class the character will be
  const classLevel = existingClass ? (existingClass.system.level || 0) + 1 : 1;

  if (existingClass) {
    // Level up existing class
    await existingClass.update({
      'system.level': classLevel
    });
  } else {
    // Create new class item with full class data
    // Get defense bonuses for this class
    const defenses = classDoc.system.defenses?.fortitude ||
                    classDoc.system.defenses?.reflex ||
                    classDoc.system.defenses?.will
      ? classDoc.system.defenses
      : getClassDefenseBonuses(classDoc.name);

    const classItem = {
      name: classDoc.name,
      type: "class",
      img: classDoc.img,
      system: {
        level: 1,
        hitDie: getClassProperty(classDoc, 'hitDie', '1d6'),
        babProgression: getClassProperty(classDoc, 'babProgression', 0.75),
        defenses: {
          fortitude: defenses.fortitude || 0,
          reflex: defenses.reflex || 0,
          will: defenses.will || 0
        },
        description: classDoc.system.description || '',
        classSkills: getClassProperty(classDoc, 'classSkills', []),
        talentTrees: getClassProperty(classDoc, 'talentTrees', []),
        forceSensitive: classDoc.system.forceSensitive || false
      }
    };

    SWSELogger.log(`SWSE LevelUp | Creating ${classItem.name} with defense bonuses: Fort +${classItem.system.defenses.fortitude}, Ref +${classItem.system.defenses.reflex}, Will +${classItem.system.defenses.will}`);

    await actor.createEmbeddedDocuments("Item", [classItem]);
  }

  return classLevel;
}

/**
 * Bind the abilities UI for point buy, standard roll, and organic roll
 * Adapted from chargen.js
 * @param {HTMLElement} root - Root element
 */
export function bindAbilitiesUI(root) {
  const doc = root || this.element[0];
  const ablist = ["str", "dex", "con", "int", "wis", "cha"];

  // Point buy system
  let pool = 32;
  const pointCosts = (from, to) => {
    const costForIncrement = (v) => {
      if (v < 12) return 1;
      if (v < 14) return 2;
      return 3;
    };
    let cost = 0;
    for (let v = from; v < to; v++) cost += costForIncrement(v);
    return cost;
  };

  const updatePointRemaining = () => {
    const el = doc.querySelector("#point-remaining");
    if (el) el.textContent = pool;
  };

  const initPointBuy = () => {
    pool = 32;
    ablist.forEach(a => {
      const inp = doc.querySelector(`[name="ability_${a}"]`);
      if (inp) inp.value = 8;
      const plus = doc.querySelector(`[data-plus="${a}"]`);
      const minus = doc.querySelector(`[data-minus="${a}"]`);
      if (plus) plus.onclick = () => adjustAttribute(a, +1);
      if (minus) minus.onclick = () => adjustAttribute(a, -1);
    });
    updatePointRemaining();
    recalcPreview();
  };

  const adjustAttribute = (ab, delta) => {
    const el = doc.querySelector(`[name="ability_${ab}"]`);
    if (!el) return;

    let cur = Number(el.value || 8);
    const newVal = Math.max(8, Math.min(18, cur + delta));
    const costNow = pointCosts(8, cur);
    const costNew = pointCosts(8, newVal);
    const deltaCost = costNew - costNow;

    if (deltaCost > pool) {
      ui.notifications.warn("Not enough point-buy points remaining.");
      return;
    }

    pool -= deltaCost;
    el.value = newVal;
    updatePointRemaining();
    recalcPreview();
  };

  // Standard array roll
  const rollStandard = async () => {
    const results = [];
    for (let i = 0; i < 6; i++) {
      const r = await new Roll("4d6kh3").evaluate();
      const total = r.total;
      results.push({ total });
    }

    const container = doc.querySelector("#roll-results");
    if (container) {
      container.innerHTML = "";
      results.forEach(res => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "assign-roll";
        btn.textContent = `${res.total}`;
        btn.dataset.value = res.total;
        btn.onclick = () => assignRollToNext(res.total);
        container.appendChild(btn);
      });
      ui.notifications.info("Standard rolls generated — click a result then click an ability to assign.");
    }
  };

  const assignRollToNext = (val) => {
    let target = doc.querySelector(".ability-input:focus");
    if (!target) {
      const inputs = ablist.map(a => doc.querySelector(`[name="ability_${a}"]`)).filter(Boolean);
      inputs.sort((x, y) => Number(x.value) - Number(y.value));
      target = inputs[0];
    }
    if (target) {
      target.value = val;
      recalcPreview();
    }
  };

  // Organic roll
  const rollOrganic = async () => {
    const r = await new Roll("24d6").evaluate();
    if (!r.dice || !r.dice[0] || !r.dice[0].results) {
      ui.notifications.error("Failed to roll dice. Please try again.");
      SWSELogger.error("SWSE | Roll failed:", r);
      return;
    }
    const rolls = r.dice[0].results.map(x => x.result).sort((a, b) => b - a);
    const kept = rolls.slice(0, 18);

    const groups = [];
    for (let i = 0; i < 6; i++) {
      groups.push(kept.slice(i * 3, (i + 1) * 3));
    }

    const container = doc.querySelector("#organic-groups");
    if (container) {
      container.innerHTML = "";
      groups.forEach((g, idx) => {
        const div = document.createElement("div");
        div.className = "organic-group";
        const s = g.reduce((a, b) => a + b, 0);
        div.textContent = `${g.join(", ")} = ${s}`;
        div.dataset.sum = s;
        div.onclick = () => selectOrganicGroup(div);
        container.appendChild(div);
      });
      ui.notifications.info("Organic roll completed — click a group, then click an ability to assign.");
    }
    doc._selectedOrganic = null;
  };

  const selectOrganicGroup = (div) => {
    doc.querySelectorAll(".organic-group").forEach(d => d.classList.remove("selected-group"));
    div.classList.add("selected-group");
    doc._selectedOrganic = Number(div.dataset.sum);

    ablist.forEach(a => {
      const input = doc.querySelector(`[name="ability_${a}"]`);
      if (input) {
        input.onclick = () => {
          if (doc._selectedOrganic == null) return;
          input.value = doc._selectedOrganic;
          recalcPreview();
          doc.querySelectorAll(".organic-group").forEach(d => d.classList.remove("selected-group"));
          doc._selectedOrganic = null;
        };
      }
    });
  };

  const recalcPreview = () => {
    ablist.forEach(a => {
      const inp = doc.querySelector(`[name="ability_${a}"]`);
      const display = doc.querySelector(`#display_${a}`);
      const base = Number(inp?.value || 10);
      const total = base;
      const mod = Math.floor((total - 10) / 2);

      if (display) display.textContent = `Total: ${total} (Mod: ${mod >= 0 ? "+" : ""}${mod})`;
    });
  };

  // Mode switching function
  const switchMode = (modeName) => {
    // Hide all mode divs
    const modes = ['point-mode', 'standard-mode', 'organic-mode', 'free-mode'];
    modes.forEach(mode => {
      const modeDiv = doc.querySelector(`#${mode}`);
      if (modeDiv) modeDiv.style.display = 'none';
    });

    // Show selected mode
    const selectedMode = doc.querySelector(`#${modeName}`);
    if (selectedMode) selectedMode.style.display = 'block';

    // Update button states
    const buttons = doc.querySelectorAll('.method-button');
    buttons.forEach(btn => btn.classList.remove('active'));
  };

  // Wire buttons with mode switching
  const stdBtn = doc.querySelector("#std-roll-btn");
  if (stdBtn) {
    stdBtn.onclick = () => {
      switchMode('standard-mode');
      stdBtn.classList.add('active');
      rollStandard();
    };
  }

  const orgBtn = doc.querySelector("#org-roll-btn");
  if (orgBtn) {
    orgBtn.onclick = () => {
      switchMode('organic-mode');
      orgBtn.classList.add('active');
      rollOrganic();
    };
  }

  const pbInit = doc.querySelector("#pb-init");
  if (pbInit) {
    pbInit.onclick = () => {
      switchMode('point-mode');
      pbInit.classList.add('active');
      initPointBuy();
    };
  }

  // Initialize
  switchMode('point-mode');
  if (pbInit) pbInit.classList.add('active');
  initPointBuy();
}
