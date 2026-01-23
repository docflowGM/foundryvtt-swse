/**
 * Talent selection and tree visualization for SWSE Level Up system
 * Handles talent tree navigation, prerequisite checking, and selection
 *
 * DUAL TALENT PROGRESSION:
 * - Heroic Level Talents: 1 per odd heroic level (1, 3, 5, 7, etc.) - can pick from ANY class tree
 * - Class Level Talents: 1 per odd class level (1, 3, 5, 7, etc.) - ONLY from that class's trees
 */

import { SWSELogger } from '../../utils/logger.js';
import { warnGM } from '../../utils/warn-gm.js';
import { TalentTreeVisualizer } from '../talent-tree-visualizer.js';
import { getClassLevel, getCharacterClasses } from './levelup-shared.js';
import { checkTalentPrerequisites } from './levelup-validation.js';
import { getClassProperty, getTalentTrees } from '../chargen/chargen-property-accessor.js';
import { PrerequisiteRequirements } from '../../progression/feats/prerequisite_engine.js';
import { HouseRuleTalentCombination } from '../../houserules/houserule-talent-combination.js';
import { SuggestionEngine } from '../../engine/SuggestionEngine.js';
import {
  getTalentCountAtHeroicLevel,
  getTalentCountAtClassLevel,
  getTalentProgressionInfo,
  getAvailableTalentTreesForHeroicTalent,
  getAvailableTalentTreesForClassTalent
} from './levelup-dual-talent-progression.js';

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

  const talentTreeRestriction = game.settings.get('foundryvtt-swse', "talentTreeRestriction");
  SWSELogger.log(`[LEVELUP-TALENTS] getAvailableTalentTrees: talentTreeRestriction setting: "${talentTreeRestriction}"`);

  let availableTrees = [];

  if (talentTreeRestriction === "unrestricted") {
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
  } else if (talentTreeRestriction === "current") {
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
    availableTrees = availableTrees.filter(tree => tree !== "Dark Side");
  }

  // -----------------------------------------------------------
  // GM WARNINGS FOR TALENT TREE VALIDATION
  // -----------------------------------------------------------

  // Load all talent documents once for tree validation
  const talentPack = game.packs.get('foundryvtt-swse.talents');
  const allTalents = talentPack ? await talentPack.getDocuments() : [];

  for (const treeName of availableTrees) {

      // 1 — Check if tree exists in the talent tree compendium
      const treePack = game.packs.get('foundryvtt-swse.talenttrees');
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
    ui.notifications.error("Failed to load talents compendium. Talents will not be available.", { permanent: true });
    return [];
  }

  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Fetching talents from pack...`);
  let talents = await talentPack.getDocuments();
  SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Retrieved ${talents?.length || 0} talents from compendium`);

  if (!talents || talents.length === 0) {
    SWSELogger.error(`[LEVELUP-TALENTS] ERROR: Talents compendium is empty!`);
    ui.notifications.error("Talents compendium is empty. Please check your SWSE installation.", { permanent: true });
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
    const talentsWithPrereqs = talentObjects.map(talent => {
      const prereqCheck = PrerequisiteRequirements.checkTalentPrerequisites(actor, talent, pendingData);
      return {
        ...talent,
        isQualified: prereqCheck.valid,
        prereqReasons: prereqCheck.reasons
      };
    });

    // Apply suggestions using coordinator API if available, otherwise fallback
    // Include future availability scoring for unqualified talents
    let talentsWithSuggestions = talentsWithPrereqs;
    if (game.swse?.suggestions?.suggestTalents) {
      SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Using game.swse.suggestions.suggestTalents...`);
      talentsWithSuggestions = await game.swse.suggestions.suggestTalents(
        talentsWithPrereqs,
        actor,
        pendingData,
        { includeFutureAvailability: true }
      );
      SWSELogger.log(`[LEVELUP-TALENTS] loadTalentData: Suggestions applied, returned ${talentsWithSuggestions.length} talents`);
    } else {
      talentsWithSuggestions = await SuggestionEngine.suggestTalents(
        talentsWithPrereqs,
        actor,
        pendingData,
        { includeFutureAvailability: true }
      );
    }

    // Log suggestion statistics
    const suggestionCounts = SuggestionEngine.countByTier(talentsWithSuggestions);
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
  new Dialog({
    title: `${treeName} Talent Tree`,
    content: treeHtml,
    buttons: {
      close: {
        icon: '<i class="fas fa-times"></i>',
        label: "Close"
      }
    },
    default: "close",
    render: (html) => {
      // Add click handlers for talent selection
      html.find('.talent-node').click((e) => {
        const talentName = $(e.currentTarget).data('talent-name');
        selectCallback(talentName);
        $(e.currentTarget).closest('.dialog').find('.window-close').click();
      });

      // Highlight prerequisites on hover
      html.find('.talent-node').hover(
        (e) => {
          const talentName = $(e.currentTarget).data('talent-name');
          const node = talentGraph[talentName];
          if (node) {
            node.prereqs.forEach(prereq => {
              html.find(`[data-talent-name="${prereq}"]`).addClass('highlight-prereq');
            });
            node.dependents.forEach(dep => {
              html.find(`[data-talent-name="${dep}"]`).addClass('highlight-dependent');
            });
          }
        },
        () => {
          html.find('.talent-node').removeClass('highlight-prereq highlight-dependent');
        }
      );
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
  const groupDeflectBlock = game.settings.get('foundryvtt-swse', "groupDeflectBlock") || false;

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
    if (!talentPos) return;

    node.prereqs.forEach(prereqName => {
      const prereqPos = talentPositions[prereqName];
      if (!prereqPos) return;

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
  <style>
    .talent-tree-container {
      position: relative;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 8px;
      padding: 1rem;
      min-height: 500px;
    }
    .talent-tree-canvas {
      position: relative;
      width: 100%;
      height: 500px;
    }
    .talent-connections {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      pointer-events: none;
    }
    .talent-nodes {
      position: relative;
      z-index: 2;
      height: 100%;
    }
    .talent-node {
      position: absolute;
      width: 80px;
      text-align: center;
      cursor: pointer;
      transform: translate(-50%, 0);
      transition: all 0.3s;
    }
    .talent-node:hover {
      transform: translate(-50%, -5px) scale(1.1);
      z-index: 10;
    }
    .talent-icon {
      width: 60px;
      height: 60px;
      margin: 0 auto;
      border: 3px solid #0a74da;
      border-radius: 50%;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.5);
    }
    .talent-icon img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .talent-name {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #e0e0e0;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    }
    .prereq-indicator {
      position: absolute;
      top: -5px;
      right: 10px;
      color: #ffd700;
      font-size: 1.2rem;
      text-shadow: 0 0 5px rgba(255, 215, 0, 0.8);
    }
    .grouped-talent .talent-icon {
      border-color: #ffa500;
      box-shadow: 0 0 10px rgba(255, 165, 0, 0.6);
    }
    .highlight-prereq {
      filter: brightness(1.5);
    }
    .highlight-prereq .talent-icon {
      border-color: #00ff00;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
    }
    .highlight-dependent {
      filter: brightness(1.3);
    }
    .highlight-dependent .talent-icon {
      border-color: #ff00ff;
      box-shadow: 0 0 15px rgba(255, 0, 255, 0.8);
    }
    .hint {
      text-align: center;
      color: #00d9ff;
      font-style: italic;
      margin-bottom: 1rem;
    }
  </style>
  `;

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
  if (!talent) return null;

  // Check prerequisites
  const check = checkTalentPrerequisites(talent, actor, pendingData);
  if (!check.valid) {
    ui.notifications.warn(`Cannot select ${talentName}: ${check.reasons.join(', ')}`);
    return null;
  }

  SWSELogger.log(`SWSE LevelUp | Selected talent: ${talentName}`);
  return talent;
}
