/**
 * Talent selection and tree visualization for SWSE Level Up system
 * Handles talent tree navigation, prerequisite checking, and selection
 */

import { SWSELogger } from '../../utils/logger.js';
import { TalentTreeVisualizer } from '../talent-tree-visualizer.js';
import { getClassLevel, getCharacterClasses } from './levelup-shared.js';
import { checkTalentPrerequisites } from './levelup-validation.js';

/**
 * Check if the new level grants a talent from the selected class
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @returns {boolean}
 */
export function getsTalent(selectedClass, actor) {
  if (!selectedClass) return false;

  // NONHEROIC RULE: Nonheroic characters do not gain talents
  if (selectedClass.system.isNonheroic) return false;

  // Check house rule: talent every level
  const talentEveryLevel = game.settings.get("swse", "talentEveryLevel");
  if (talentEveryLevel) {
    // Check if class has talent trees available
    const trees = selectedClass.system.talent_trees || selectedClass.system.talentTrees;
    return (selectedClass.system.forceSensitive || trees?.length > 0);
  }

  const classLevel = getClassLevel(actor, selectedClass.name) + 1;

  // Check level_progression for this class level
  const levelProgression = selectedClass.system.level_progression;
  if (!levelProgression || !Array.isArray(levelProgression)) {
    // Fallback: if no level_progression, check if class has talent trees
    const trees = selectedClass.system.talent_trees || selectedClass.system.talentTrees;
    return (selectedClass.system.forceSensitive || trees?.length > 0);
  }

  const levelData = levelProgression.find(lp => lp.level === classLevel);
  if (!levelData || !levelData.features) return false;

  // Check if this level grants a talent_choice feature
  return levelData.features.some(f => f.type === 'talent_choice');
}

/**
 * Get available talent trees for the selected class
 * @param {Object} selectedClass - The selected class
 * @param {Actor} actor - The actor
 * @returns {Promise<Array>} Available talent trees
 */
export async function getTalentTrees(selectedClass, actor) {
  const talentTreeRestriction = game.settings.get("swse", "talentTreeRestriction");
  let availableTrees = [];

  if (talentTreeRestriction === "unrestricted") {
    // Free build mode: all talent trees from all talents
    const talentPack = game.packs.get('swse.talents');
    if (talentPack) {
      const allTalents = await talentPack.getDocuments();
      const treeSet = new Set();
      allTalents.forEach(talent => {
        const tree = talent.system?.talent_tree || talent.system?.tree;
        if (tree) {
          treeSet.add(tree);
        }
      });
      availableTrees = Array.from(treeSet);
    }
  } else if (talentTreeRestriction === "current") {
    // Only talent trees from the selected class
    availableTrees = selectedClass.system.talent_trees || selectedClass.system.talentTrees || [];
  } else {
    // Talent trees from any class the character has levels in
    const characterClasses = getCharacterClasses(actor);
    const classPack = game.packs.get('swse.classes');

    for (const className of Object.keys(characterClasses)) {
      const classDoc = await classPack.index.find(c => c.name === className);
      if (classDoc) {
        const fullClass = await classPack.getDocument(classDoc._id);
        const trees = fullClass.system.talent_trees || fullClass.system.talentTrees;
        if (trees) {
          availableTrees.push(...trees);
        }
      }
    }

    // Add current class trees
    const trees = selectedClass.system.talent_trees || selectedClass.system.talentTrees;
    if (trees) {
      availableTrees.push(...trees);
    }

    // Remove duplicates
    availableTrees = [...new Set(availableTrees)];
  }

  return availableTrees;
}

/**
 * Load talent data from compendium
 * @returns {Promise<Array>} Array of talent documents
 */
export async function loadTalentData() {
  const talentPack = game.packs.get('swse.talents');
  if (!talentPack) return [];

  return await talentPack.getDocuments();
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
  const talentTrees = await getTalentTrees(selectedClass, actor);

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
    t.system?.talent_tree === treeName || t.name.includes(treeName)
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
  const groupDeflectBlock = game.settings.get("swse", "groupDeflectBlock") || false;

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
