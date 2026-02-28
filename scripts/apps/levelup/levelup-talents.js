/**
 * Talent selection and tree visualization for SWSE Level Up system
 * Handles talent tree navigation, prerequisite checking, and selection
 *
 * DUAL TALENT PROGRESSION:
 * - Heroic Level Talents: 1 per odd heroic level (1, 3, 5, 7, etc.) - can pick from ANY class tree
 * - Class Level Talents: 1 per odd class level (1, 3, 5, 7, etc.) - ONLY from that class's trees
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { warnGM } from "/systems/foundryvtt-swse/scripts/utils/warn-gm.js";
import { TalentTreeVisualizer } from "/systems/foundryvtt-swse/scripts/apps/talent-tree-visualizer.js";
import { getClassLevel, getCharacterClasses } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js";
import { checkTalentPrerequisites } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-validation.js";
import { getClassProperty, getTalentTrees } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-property-accessor.js";
import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { HouseRuleTalentCombination } from "/systems/foundryvtt-swse/scripts/houserules/houserule-talent-combination.js";
import { SuggestionService } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js";
import {
  getTalentCountAtHeroicLevel,
  getTalentCountAtClassLevel,
  getTalentProgressionInfo,
  getAvailableTalentTreesForHeroicTalent,
  getAvailableTalentTreesForClassTalent
} from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-dual-talent-progression.js";
import { TalentSlotValidator } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/slot-validator.js";
import { getAllowedTalentTrees } from "/systems/foundryvtt-swse/scripts/engine/progression/talents/tree-authority.js";

/**
 * Get the number of talents granted at this level
 * Uses DUAL TALENT PROGRESSION:
 * - 1 talent at odd heroic levels (1, 3, 5, 7, etc.) - any class tree
 * - 1 talent at odd class levels (1, 3, 5, 7, etc.) - class's trees only
 *
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @returns {number} Number of talents to grant (0, 1, or 2)
 */
export function getTalentCount(selectedClass, actor) {
  SWSELogger.log(`[LEVELUP-TALENTS] getTalentCount: Checking talent count for class "${selectedClass?.name}"`);

  if (!selectedClass || !actor) {
    SWSELogger.log(`[LEVELUP-TALENTS] getTalentCount: Missing class or actor, returning 0`);
    return 0;
  }

  // Get progression info using new dual-talent system
  const progression = getTalentProgressionInfo(selectedClass, actor);
  SWSELogger.log(`[LEVELUP-TALENTS] getTalentCount: Dual progression info:`, progression);

  // Only return talent count if character has access to talent trees
  if (progression.total > 0) {
    const trees = getTalentTrees(selectedClass);
    const hasAccess = (selectedClass.system?.forceSensitive || trees?.length > 0);

    if (!hasAccess) {
      SWSELogger.log(`[LEVELUP-TALENTS] getTalentCount: No talent access, returning 0`);
      return 0;
    }
  }

  return progression.total;
}

/**
 * Check if the new level grants a talent from the selected class (boolean version)
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @returns {boolean}
 */
export function getsTalent(selectedClass, actor) {
  return getTalentCount(selectedClass, actor) > 0;
}

/**
 * Get available talent trees for the selected class
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @returns {Promise<Array>} Available talent trees
 */
export async function getAvailableTalentTrees(selectedClass, actor) {
  SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: START - Class: "${selectedClass?.name}", Actor: ${actor?.id}`);

  const talentTreeRestriction = game.settings.get('foundryvtt-swse', 'talentTreeRestriction');
  SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: talentTreeRestriction setting: "${talentTreeRestriction}"`);

  let availableTrees = [];

  if (talentTreeRestriction === 'unrestricted') {
    // Free build mode: all talent trees from all talents
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Unrestricted mode - loading all talent trees`);
    const talentPack = game.packs.get('foundryvtt-swse.talents');
    if (talentPack) {
      const allTalents = await talentPack.getDocuments();
      const treeSet = new Set();
      allTalents.forEach(talent => {
        const tree = talent.system?.tree;
        if (tree) {
          treeSet.add(tree);
        }
      });
      availableTrees = Array.from(treeSet);
      SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Unrestricted - found ${availableTrees.length} talent trees`);
    } else {
      SWSELogger.error(`[LEVELUP-TALENTS] ERROR: Talents compendium not found`);
    }
  } else if (talentTreeRestriction === 'current') {
    // Only talent trees from the selected class
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Current mode - using selected class trees only`);
    if (!selectedClass) {
      SWSELogger.error(`[LEVELUP-TALENTS] ERROR: Cannot get talent trees - no class selected`);
      return [];
    }

    availableTrees = getTalentTrees(selectedClass);
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Current - Class "${selectedClass.name}" has ${availableTrees?.length || 0} talent trees:`, availableTrees);

    if (!availableTrees || availableTrees.length === 0) {
      SWSELogger.warn(`[LEVELUP-TALENTS] WARNING: Selected class "${selectedClass.name}" has no talent trees`);
    }
  } else {
    // Talent trees from any class the character has levels in
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Multiclass mode - collecting trees from all character classes`);
    const characterClasses = getCharacterClasses(actor);
    const classPack = game.packs.get('foundryvtt-swse.classes');
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Character has classes:`, Object.keys(characterClasses));

    for (const className of Object.keys(characterClasses)) {
      const classDoc = await classPack.index.find(c => c.name === className);
      if (classDoc) {
        const fullClass = await classPack.getDocument(classDoc._id);
        const trees = getTalentTrees(fullClass);
        SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Class "${className}" - trees: ${trees?.length || 0}`);
        if (trees && trees.length > 0) {
          availableTrees.push(...trees);
        }
      }
    }

    // Add current class trees
    const trees = getTalentTrees(selectedClass);
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Current class "${selectedClass?.name}" - trees: ${trees?.length || 0}`);
    if (trees && trees.length > 0) {
      availableTrees.push(...trees);
    }

    // Remove duplicates
    const beforeDedup = availableTrees.length;
    availableTrees = [...new Set(availableTrees)];
    SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: Multiclass - before dedup: ${beforeDedup}, after dedup: ${availableTrees.length}`);
  }

  // -----------------------------------------------------------
  // FILTER TREES BASED ON ACTOR REQUIREMENTS
  // -----------------------------------------------------------

  // Dark Side talent tree requires DSP > 0
  const darkSideScore = actor?.system?.darkSideScore || 0;
  if (darkSideScore === 0) {
    availableTrees = availableTrees.filter(tree => tree !== 'Dark Side');
  }

  // -----------------------------------------------------------
  // GM WARNINGS FOR TALENT TREE VALIDATION
  // -----------------------------------------------------------

  // Load all talent documents once for tree validation
  const talentPack = game.packs.get('foundryvtt-swse.talents');
  const allTalents = talentPack ? await talentPack.getDocuments() : [];

  for (const treeName of availableTrees) {

      // 1 — Check if tree exists in the talent tree compendium
      const treePack = game.packs.get('foundryvtt-swse.talent_trees');
      const treeIndex = treePack?.index.find(t => t.name === treeName);

      if (!treeIndex) {
          warnGM(
              `${selectedClass.name} references a Talent Tree "${treeName}" that does NOT exist in the talentTrees compendium.`
          );
          continue; // still check if any talents exist with that name
      }

      // 2 — Check if any talents actually belong to this tree
      const talentsInTree = allTalents.filter(t => {
          return t.system?.talent_tree === treeName ||
                 t.system?.tree === treeName ||
                 t.name.includes(treeName);
      });

      if (talentsInTree.length === 0) {
          warnGM(
              `Talent Tree "${treeName}" exists but contains ZERO talents. Class: ${selectedClass.name}`
          );
      }
  }

  return availableTrees;
}

/**
 * Load talent data from compendium
 * @param {Actor} actor - Optional actor for suggestion generation
 * @param {Object} pendingData - Optional pending data for suggestion context
 * @returns {Promise<Array>} Array of talent documents with optional suggestions
 */
export async function loadTalentData(actor = null, pendingData = {}) {
  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: START - Actor: ${actor?.id}, pendingData keys:`, Object.keys(pendingData));

  const talentPack = game.packs.get('foundryvtt-swse.talents');
  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Talents pack lookup:`, talentPack ? 'FOUND' : 'NOT FOUND');

  if (!talentPack) {
    SWSELogger.error(`[LEVELUP-TALENTS] ERROR: Talents compendium pack not found!`);
    SWSELogger.error(`[LEVELUP-TALENTS] Available packs:`, Array.from(game.packs.keys()));
    ui.notifications.error('Failed to load talents compendium. Talents will not be available.', { permanent: true });
    return [];
  }

  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Fetching talents from pack...`);
  let talents = await talentPack.getDocuments();
  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Retrieved ${talents?.length || 0} talents from compendium`);

  if (!talents || talents.length === 0) {
    SWSELogger.error(`[LEVELUP-TALENTS] ERROR: Talents compendium is empty!`);
    ui.notifications.error('Talents compendium is empty. Please check your SWSE installation.', { permanent: true });
    return [];
  }

  // Apply Block/Deflect combination if house rule enabled
  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Applying Block/Deflect combination house rule...`);
  talents = HouseRuleTalentCombination.processBlockDeflectCombination(talents);
  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: After house rules: ${talents?.length || 0} talents`);

  // If actor provided, apply suggestion engine
  if (actor) {
    SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Actor provided, applying talent suggestions...`);
    // Convert to plain objects for suggestion processing
    const talentObjects = talents.map(t => t.toObject ? t.toObject() : t);

    // Add prerequisite checking results to each talent (before suggestions for future availability analysis)
    const talentsWithPrereqs = AbilityEngine.filterQualifiedTalents(talentObjects, actor, pendingData).map(talent => ({
      ...talent,
      prereqReasons: talent.prerequisiteReasons
    }));

    // Apply suggestions using coordinator API if available, otherwise fallback
    // Include future availability scoring for unqualified talents
    let talentsWithSuggestions = talentsWithPrereqs;
    if (game.swse?.suggestions?.suggestTalents) {
    talentsWithSuggestions = await SuggestionService.getSuggestions(actor, 'levelup', {
      domain: 'talents',
      available: talentObjects,
      pendingData,
      engineOptions: { talentMetadata: metadata.talents || {}, includeFutureAvailability: true },
      persist: true
    });

  }
// Log suggestion statistics
    const suggestionCounts = SuggestionService.countByTier(talentsWithSuggestions);
    SWSELogger.log(`SWSE LevelUp | Talent suggestions: Chain=${suggestionCounts[4]}, Skill=${suggestionCounts[3]}, Ability=${suggestionCounts[2]}, Class=${suggestionCounts[1]}`);

    return talentsWithSuggestions;
  }

  return talents;
}

/**
 * Show enhanced tree selection interface with hover previews
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @param {Array} talentData - Talent documents
 * @param {Function} selectCallback - Callback when talent is selected
 */
export async function showEnhancedTreeSelection(selectedClass, actor, talentData, selectCallback) {
  // Get available talent trees
  const talentTrees = await getAvailableTalentTrees(selectedClass, actor);

  // Show enhanced tree selection
  await TalentTreeVisualizer.showTreeSelection(
    talentTrees,
    talentData,
    actor,
    selectCallback
  );
}

/**
 * Show enhanced talent tree for a specific tree
 * @param {string} treeName - The talent tree name
 * @param {Array} talentData - Talent documents
 * @param {Actor} actor - The actor
 * @param {Function} selectCallback - Callback when talent is selected
 */
export async function showEnhancedTalentTree(treeName, talentData, actor, selectCallback) {
  await TalentTreeVisualizer.showEnhancedTalentTree(
    treeName,
    talentData,
    actor,
    selectCallback
  );
}

/**
 * Show legacy talent tree dialog
 * @param {string} treeName - The talent tree name
 * @param {Array} talentData - Talent documents
 * @param {Actor} actor - The actor
 * @param {Function} selectCallback - Callback when talent is selected
 */
export async function showTalentTreeDialog(treeName, talentData, actor, selectCallback) {
  const talents = talentData.filter(t =>
    t.system?.tree === treeName || t.name.includes(treeName)
  );

  if (talents.length === 0) {
    ui.notifications.warn(`No talents found for ${treeName}`);
    return;
  }

  // Build prerequisite graph
  const talentGraph = buildTalentGraph(talents);

  // Generate HTML with talent tree visualization
  const treeHtml = generateTalentTreeHtml(treeName, talentGraph);

  // Show dialog
  new SWSEDialogV2({
    title: `${treeName} Talent Tree`,
    content: treeHtml,
    buttons: {
      close: {
        icon: '<i class="fa-solid fa-times"></i>',
        label: 'Close'
      }
    },
    default: 'close',
    render: (html) => {
      // Get the DOM element (handle both jQuery and DOM element inputs)
      const htmlElement = html instanceof HTMLElement ? html : (html?.[0] instanceof HTMLElement ? html[0] : null);

      // Add click handlers for talent selection
      htmlElement.querySelectorAll('.talent-node').forEach(el => {
        el.addEventListener('click', (e) => {
          const talentName = e.currentTarget.dataset.talentName;
          selectCallback(talentName);
          e.currentTarget.closest('.dialog').querySelector('.window-close').click();
        });
      });

      // Highlight prerequisites on hover
      htmlElement.querySelectorAll('.talent-node').forEach(el => {
        el.addEventListener('mouseenter', (e) => {
          const talentName = e.currentTarget.dataset.talentName;
          const node = talentGraph[talentName];
          if (node) {
            node.prereqs.forEach(prereq => {
              htmlElement.querySelector(`[data-talent-name="${prereq}"]`)?.classList.add('highlight-prereq');
            });
            node.dependents.forEach(dep => {
              htmlElement.querySelector(`[data-talent-name="${dep}"]`)?.classList.add('highlight-dependent');
            });
          }
        });
        el.addEventListener('mouseleave', () => {
          htmlElement.querySelectorAll('.talent-node').forEach(node => {
            node.classList.remove('highlight-prereq', 'highlight-dependent');
          });
        });
      });
    }
  }, {
    width: 800,
    height: 600,
    classes: ['talent-tree-dialog']
  }).render(true);
}

/**
 * Build talent prerequisite graph
 * @param {Array} talents - Array of talent documents
 * @returns {Object} Talent graph with prereqs and dependents
 */
function buildTalentGraph(talents) {
  const talentGraph = {};

  talents.forEach(talent => {
    talentGraph[talent.name] = {
      talent: talent,
      prereqs: [],
      dependents: []
    };
  });

  // Map prerequisites
  talents.forEach(talent => {
    const prereq = talent.system?.prerequisites || talent.system?.prereqassets;
    if (prereq && prereq !== 'null') {
      const prereqNames = prereq.split(',').map(p => p.trim());
      prereqNames.forEach(pName => {
        if (talentGraph[pName]) {
          talentGraph[talent.name].prereqs.push(pName);
          talentGraph[pName].dependents.push(talent.name);
        }
      });
    }
  });

  return talentGraph;
}

/**
 * Generate HTML for talent tree visualization
 * @param {string} treeName - The talent tree name
 * @param {Object} talentGraph - Talent graph with prereqs
 * @returns {string} HTML string
 */
function generateTalentTreeHtml(treeName, talentGraph) {
  const groupDeflectBlock = game.settings.get('foundryvtt-swse', 'groupDeflectBlock') || false;

  let html = `
    <div class="talent-tree-container">
      <h3>${treeName}</h3>
      <p class="hint">Click a talent to select it for your level-up</p>
      <div class="talent-tree-canvas">
        <svg class="talent-connections" width="100%" height="100%">
  `;

  // Organize talents into tiers
  const tiers = organizeTalentsIntoTiers(talentGraph);
  const talentPositions = {};
  let yPos = 50;

  // Position talents
  tiers.forEach((tier, tierIndex) => {
    const xSpacing = 100 / (tier.length + 1);
    tier.forEach((talentName, index) => {
      const xPos = (index + 1) * xSpacing;
      talentPositions[talentName] = { x: xPos, y: yPos };
    });
    yPos += 120;
  });

  // Draw connection lines
  let svgLines = '';
  Object.entries(talentGraph).forEach(([talentName, node]) => {
    const talentPos = talentPositions[talentName];
    if (!talentPos) {return;}

    node.prereqs.forEach(prereqName => {
      const prereqPos = talentPositions[prereqName];
      if (!prereqPos) {return;}

      svgLines += `
        <line
          x1="${prereqPos.x}%"
          y1="${prereqPos.y + 30}"
          x2="${talentPos.x}%"
          y2="${talentPos.y}"
          class="talent-connection"
          stroke="#00d9ff"
          stroke-width="2"
        />
      `;
    });
  });

  html += svgLines + '</svg><div class="talent-nodes">';

  // Render talent nodes
  Object.entries(talentPositions).forEach(([talentName, pos]) => {
    const talent = talentGraph[talentName].talent;
    const isGrouped = groupDeflectBlock && (talentName === 'Block' || talentName === 'Deflect');
    const hasPrereq = talentGraph[talentName].prereqs.length > 0;

    html += `
      <div class="talent-node ${isGrouped ? 'grouped-talent' : ''}"
           style="left: ${pos.x}%; top: ${pos.y}px;"
           data-talent-name="${talentName}"
           title="${talent.system?.benefit || 'No description'}">
        <div class="talent-icon">
          <img src="${talent.img}" alt="${talentName}" />
        </div>
        <div class="talent-name">${talentName}</div>
        ${hasPrereq ? '<div class="prereq-indicator">★</div>' : ''}
      </div>
    `;
  });

  html += `
      </div>
    </div>
  </div>
  `; // Styling now in styles/apps/talent-tree-common.css

  return html;
}

/**
 * Organize talents into tiers based on prerequisites
 * @param {Object} talentGraph - Talent graph with prereqs
 * @returns {Array} Array of tiers, each tier is an array of talent names
 */
function organizeTalentsIntoTiers(talentGraph) {
  const tiers = [];
  const assigned = new Set();

  // Find root talents (no prerequisites)
  const roots = Object.entries(talentGraph)
    .filter(([name, node]) => node.prereqs.length === 0)
    .map(([name]) => name);

  if (roots.length > 0) {
    tiers.push(roots);
    roots.forEach(r => assigned.add(r));
  }

  // Assign remaining talents to tiers
  let currentTier = roots;
  while (assigned.size < Object.keys(talentGraph).length && currentTier.length > 0) {
    const nextTier = [];

    currentTier.forEach(talentName => {
      const node = talentGraph[talentName];
      node.dependents.forEach(depName => {
        if (!assigned.has(depName)) {
          const depNode = talentGraph[depName];
          if (depNode.prereqs.every(p => assigned.has(p))) {
            nextTier.push(depName);
            assigned.add(depName);
          }
        }
      });
    });

    if (nextTier.length > 0) {
      tiers.push(nextTier);
      currentTier = nextTier;
    } else {
      break;
    }
  }

  return tiers;
}

/**
 * Select a talent and check prerequisites
 * @param {string} talentName - The talent name
 * @param {Array} talentData - Array of talent documents
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Object|null} The selected talent or null
 */
export function selectTalent(talentName, talentData, actor, pendingData) {
  const talent = talentData.find(t => t.name === talentName);
  if (!talent) {return null;}

  // ========== PHASE 2.1: UNIFIED SLOT VALIDATION ==========
  // Validate using the same path as chargen
  // Determine slot type: heroic is default, class if in class-level progression
  const isClassTalent = pendingData?.isClassTalent || false;
  const slotType = isClassTalent ? 'class' : 'heroic';

  // Get current class context if available
  const classId = pendingData?.classId || null;

  const slot = {
    slotType,
    classId,
    consumed: false
  };

  // Validate talent for this slot using unified validator
  const validation = TalentSlotValidator.validateTalentForSlot(
    talent,
    slot,
    [],  // unlockedTrees - derived from actor via getAllowedTalentTrees
    { _actor: actor, ...pendingData }
  );

  if (!validation.valid) {
    SWSELogger.log(
      `[LEVELUP-TALENTS] selectTalent: Tree authority FAILED for "${talentName}": ${validation.message}`
    );
    ui.notifications.warn(`Cannot select ${talentName}: ${validation.message}`);
    return null;
  }

  SWSELogger.log(
    `[LEVELUP-TALENTS] selectTalent: Tree authority PASSED for "${talentName}"`
  );
  // =========================================================

  // Check prerequisites (existing logic, kept for completeness)
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
