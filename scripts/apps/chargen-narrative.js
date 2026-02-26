// ============================================
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
// SWSE Character Generator - NARRATIVE ENHANCED
// Personalized responses by Ol' Salty the Space Pirate
// Talent tree visualization
// ============================================

import CharacterGeneratorImproved from "/systems/foundryvtt-swse/scripts/apps/chargen-improved.js";
import {
  guardOnRender,
  logChargenRender,
  verifyPrepareContext,
  validateSelectors,
  guardActorAccess,
  trackAsyncPhase,
  logContextKey
} from "/systems/foundryvtt-swse/scripts/debug/appv2-probe.js';
import { MENTORS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";
import { MentorResolver } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-resolver.js";
import { TalentTreeVisualizer } from "/systems/foundryvtt-swse/scripts/apps/talent-tree-visualizer.js";
import { getTalentTreeName } from "/systems/foundryvtt-swse/scripts/apps/chargen/chargen-property-accessor.js";
import { normalizeTalentData } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/item-normalizer.js";
import { TalentDB } from "/systems/foundryvtt-swse/scripts/data/talent-db.js";
import { TalentTreeDB } from "/systems/foundryvtt-swse/scripts/data/talent-tree-db.js";

export default class CharacterGeneratorNarrative extends CharacterGeneratorImproved {

  constructor(actor = null, options = {}) {
    super(actor, options);
    // FIX 3 (Lazy Binding): Don't resolve mentor here
    // It will be resolved in getData() when the UI actually opens
    this.narrator = MENTORS.Scoundrel; // Temporary default only
    this.narratorPersonality = 'salty';
    this.selectedTalentTree = null;
    this.talentData = null;

    // Track shown dialogues to avoid repetition
    this.narrativeState = {
      shownComments: {
        name: new Set(),
        talents: new Set(),
        skills: new Set()
      }
    };
  }

  async _prepareContext() {
    const context = await super._prepareContext();

    // FIX 3 (Lazy Binding): Resolve mentor now when rendering
    // This ensures actor state is complete before mentor selection
    this._resolveMentorLazy();

    // Log critical context keys
    logContextKey(this, 'characterData', this.characterData);
    logContextKey(this, 'currentStep', this.currentStep);
    logContextKey(this, 'narrator', this.narrator);

    // Add narrator commentary
    context.narratorComment = this._getNarratorComment();

    // Load talent data if not already loaded
    if (!this.talentData) {
      await trackAsyncPhase(this, '_loadTalentData', this._loadTalentData());
    }

    return verifyPrepareContext(context, this);
  }

  /**
   * FIX 3: Lazy mentor binding
   * Resolve the mentor at render time instead of construction time
   * Ensures all actor data is available before resolution
   * @private
   */
  _resolveMentorLazy() {
    const classes = this.characterData.classes || [];

    if (classes.length === 0) {
      // FIX 1 (Context-aware): No class yet - use chargen default (Ol' Salty)
      this.narrator = MentorResolver.resolveFor(this.actor, { phase: 'chargen' });
      this.narratorPersonality = 'salty';
      SWSELogger.log(`[CHARGEN-NARRATIVE] Lazy resolved mentor (no class): "${this.narrator?.name}"`);
      return;
    }

    // Class selected - resolve class-specific mentor
    const className = classes[0].name;
    this.narrator = MentorResolver.getForClass(className);
    this.narratorPersonality = className.toLowerCase();
    SWSELogger.log(`[CHARGEN-NARRATIVE] Lazy resolved mentor for class "${className}": "${this.narrator?.name}"`);
  }

  /**
   * DEPRECATED: Kept for backward compatibility
   * Now uses the lazy mentor resolver
   * @private
   */
  _updateNarratorByClass() {
    // Call the new lazy binding method
    this._resolveMentorLazy();
  }

  // ========================================
  // OL' SALTY NARRATOR SYSTEM
  // ========================================

  _getNarratorComment() {
    const step = this.currentStep;

    switch (step) {
      case 'name':
        return this._getNameComment();
      case 'species':
        return this._getSpeciesComment();
      case 'abilities':
        return this._getAbilitiesComment();
      case 'class':
        return this._getClassComment();
      case 'talents':
        return this._getTalentsComment();
      case 'skills':
        return this._getSkillsComment();
      case 'summary':
        return this._getSummaryComment();
      default:
        return '';
    }
  }

  _getNameComment() {
    const comments = [
      "Arr, every great spacer needs a name that strikes fear in the hearts of Imperials! What'll it be?",
      "A name, ye say? Choose one that'll look good on a bounty poster, har har!",
      'Pick a name that the cantina singers will remember when they sing yer shanties!',
      "What shall we call ye, me young buccaneer? Make it memorable like 'Ol' Salty himself!",
      'Arr! First things first - what name will echo through the spaceways when ye plunder and pillage?'
    ];

    return this._getUniqueComment('name', comments);
  }

  _getAbilitiesComment() {
    const abilities = this.characterData.abilities;

    // Determine highest ability
    let highest = null;
    let highestVal = 0;
    for (const [key, data] of Object.entries(abilities)) {
      if (data.total > highestVal) {
        highestVal = data.total;
        highest = key;
      }
    }

    const abilityComments = {
      str: "Arr! Strong as a Wookiee, ye are! Perfect for smashin' skulls and liftin' treasure chests!",
      dex: "Quick as a Mynock in a power coupling! Ye'll be dodgin' blaster bolts like a true spacer!",
      con: 'Tough as durasteel hull plating! Takes more than a few shots to sink this ship!',
      int: "Smart as a protocol droid! Ye'll be hackin' security systems and outsmartin' Imps in no time!",
      wis: "Perceptive like a scanner! Ye won't fall for no Jedi mind tricks or smuggler's cons!",
      cha: "Charmin' as a Corellian con artist! Ye could talk a Hutt out of his credits, har har!"
    };

    if (highest && abilityComments[highest]) {
      return abilityComments[highest];
    }

    return "Arr, a well-balanced scallywag! Ye'll be ready for whatever the galaxy throws at ye!";
  }

  _getClassComment() {
    const classes = this.characterData.classes;
    if (classes.length === 0) {return '';}

    const narrator = this.narrator;

    // Use the mentor's class guidance if available
    if (narrator && narrator.classGuidance) {
      return narrator.classGuidance;
    }

    return '';
  }

  _getSpeciesComment() {
    return '';  // Could add Ol' Salty comments for species
  }

  _getTalentsComment() {
    const comments = [
      "Talents, ye say? Pick the ones that'll help ye plunder more loot and survive more battles!",
      'Special abilities make the difference between a dead pirate and a RICH pirate, savvy?',
      "Choose yer talents wisely, matey! They're yer secret weapons in the battle for survival!",
      "Arr! These talents are like tools in a smuggler's kit - pick the best for the job!"
    ];
    return this._getUniqueComment('talents', comments);
  }

  _getSkillsComment() {
    const comments = [
      "Skills! Can't pilot a ship, slice a computer, or talk yer way past guards without 'em!",
      'A good scoundrel needs to know how to do EVERYTHING! Pick yer skills carefully, matey!',
      'Skills are what separate the professional pirates from the dead ones, har har!',
      'Arr! Ye need skills to survive in the galaxy - piloting, shooting, sweet-talking, the works!'
    ];
    return this._getUniqueComment('skills', comments);
  }

  /**
   * Get a unique comment that hasn't been shown before
   * @param {string} category - Category of comments (name, talents, skills)
   * @param {Array} comments - Array of possible comments
   * @returns {string} Selected comment
   */
  _getUniqueComment(category, comments) {
    const shown = this.narrativeState.shownComments[category];

    // Filter out already-shown comments
    const available = comments.filter(c => !shown.has(c));

    // If all shown, reset and use all comments
    if (available.length === 0) {
      shown.clear();
      return comments[Math.floor(Math.random() * comments.length)];
    }

    // Pick random from available
    const selected = available[Math.floor(Math.random() * available.length)];
    shown.add(selected);

    return selected;
  }

  _getSummaryComment() {
    const totalMods = Object.values(this.characterData.abilities)
      .reduce((sum, ab) => sum + (ab.mod || 0), 0);

    if (totalMods >= 12) {
      return this._getEpicSummaryComment();
    } else if (totalMods <= -2) {
      return this._getTerribleSummaryComment();
    } else {
      return this._getAverageSummaryComment();
    }
  }

  _getEpicSummaryComment() {
    const comments = [
      "BLOW ME DOWN! Look at those stats! Ye're gonna be a LEGEND across the galaxy, ye magnificent scoundrel!",
      "Shiver me hyperdrives! That's one powerful character! The Empire itself should be shakin' in their boots!",
      "HAR HAR! With stats like those, ye'll be the most feared pirate from here to the Corporate Sector!",
      'Arr! Ye rolled better than a Sabacc champion! This character is destined for GREATNESS!'
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  _getTerribleSummaryComment() {
    const comments = [
      "Oof... those stats are rougher than a space slug's belly. But hey, underdogs make the best stories, savvy?",
      'Arr... well... at least ye have HEART, right? Right? ...May the Force be with ye, ye poor soul.',
      'Those numbers are lower than me expectations for Imperial intelligence! But a true pirate survives anyway!',
      "Har... not the best rolls, but Ol' Salty's seen worse. Grab a blaster and hope for the best!"
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  _getAverageSummaryComment() {
    const comments = [
      "Solid numbers, matey! Not legendary, but ye'll do just fine plunderin' the spaceways!",
      "Arr, a respectable character! Ye won't be the strongest, but ye'll be crafty enough to survive!",
      "Good enough for me! These stats'll get ye through most scrapes, especially if ye play it smart!",
      "Har! Average is just fine - most of the galaxy's heroes started out just like ye!"
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  // ========================================
  // TALENT TREE SYSTEM
  // ========================================

  async _loadTalentData() {
    SWSELogger.log(`[CHARGEN-NARRATIVE] ===== TALENT DATA LOAD START =====`);
    try {
      // Use TalentDB instead of loading raw talents from compendium
      if (!TalentDB.isBuilt) {
        SWSELogger.warn(`[CHARGEN-NARRATIVE] _loadTalentData: TalentDB not built, attempting to use it anyway`);
      }

      // Store all talents for reference (TalentDB is the SSOT)
      this.talentData = TalentDB.talents;

      SWSELogger.log(`[CHARGEN-NARRATIVE] _loadTalentData: ✓ TalentDB ready`, {
        totalTalents: TalentDB.talents.length,
        treesWithTalents: TalentDB.talentsByTree.size
      });
    } catch (err) {
      SWSELogger.error(`[CHARGEN-NARRATIVE] _loadTalentData: EXCEPTION:`, err);
      SWSELogger.error(`[CHARGEN-NARRATIVE] _loadTalentData: ERROR STACK:`, err.stack);
      this.talentData = [];
    }
    SWSELogger.log(`[CHARGEN-NARRATIVE] ===== TALENT DATA LOAD END (talentData.length=${this.talentData?.length || 0}) =====`);
  }

  async _onSelectTalentTree(event) {
    event.preventDefault();

    // If clicking on a tree name directly (old behavior)
    if (event.currentTarget.dataset.tree) {
      const treeName = event.currentTarget.dataset.tree;
      this.selectedTalentTree = treeName;
      await this._showEnhancedTalentTree(treeName);
      return;
    }

    // Show enhanced tree selection interface
    await this._showEnhancedTreeSelection();
  }

  /**
   * Show enhanced tree selection interface with hover previews
   */
  async _showEnhancedTreeSelection() {
    // Load talent data if not already loaded
    if (!this.talentData) {
      await this._loadTalentData();
    }

    // Get available talent trees from selected class
    const selectedClass = this.characterData.class;
    const talentTrees = selectedClass?.system?.talentTrees || [];

    // Create a temporary actor for visualization
    const tempActorData = {
      items: []
    };

    // Show enhanced tree selection
    await TalentTreeVisualizer.showTreeSelection(
      talentTrees,
      this.talentData,
      tempActorData,
      (talent) => this._selectTalent(talent.name)
    );
  }

  /**
   * Show enhanced talent tree for a specific tree
   */
  async _showEnhancedTalentTree(treeName) {
    // Load talent data if not already loaded
    if (!this.talentData) {
      await this._loadTalentData();
    }

    // Use TalentTreeDB to get the tree and its ID
    const treeDoc = TalentTreeDB.byName(treeName);
    if (!treeDoc) {
      SWSELogger.error(`CharGen Narrative | _showEnhancedTalentTree: Tree not found: ${treeName}`);
      ui.notifications.error(`Talent tree "${treeName}" not found.`);
      return;
    }

    // Get talents for this tree using TalentDB (the SSOT)
    const talents = TalentDB.byTree(treeDoc.id);
    SWSELogger.log(`CharGen Narrative | _showEnhancedTalentTree(${treeName}): ✓ Found ${talents.length} talents for tree "${treeDoc.name}" (ID: ${treeDoc.id})`);

    if (talents.length === 0) {
      SWSELogger.warn(`CharGen Narrative | _showEnhancedTalentTree: No talents found for tree "${treeName}"`);
      ui.notifications.warn(`No talents found for ${treeName}`);
      return;
    }

    // Create a temporary actor for visualization
    const tempActorData = {
      items: []
    };

    await TalentTreeVisualizer.showEnhancedTalentTree(
      treeName,
      talents,  // Pass the filtered talents directly
      tempActorData,
      (talent) => this._selectTalent(talent.name)
    );
  }

  async _showTalentTreeDialog(treeName) {
    // Use TalentTreeDB to get the tree and its ID
    const treeDoc = TalentTreeDB.byName(treeName);
    if (!treeDoc) {
      SWSELogger.error(`CharGen Narrative | _showTalentTreeDialog: Tree not found: ${treeName}`);
      ui.notifications.error(`Talent tree "${treeName}" not found.`);
      return;
    }

    // Get talents for this tree using TalentDB (the SSOT)
    const talents = TalentDB.byTree(treeDoc.id);

    if (talents.length === 0) {
      ui.notifications.warn(`No talents found for ${treeName}`);
      return;
    }

    // Build prerequisite map
    const talentMap = {};
    const talentGraph = {};

    talents.forEach(talent => {
      talentMap[talent.name] = talent;
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

    // Generate HTML for talent tree
    const treeHtml = this._generateTalentTreeHtml(treeName, talentGraph);

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
        // Add click handlers for talent selection
        root.querySelectorAll('.talent-node').forEach(el => el.addEventListener('click', (e) => {
          const talentName = e.currentTarget?.dataset?.talentName;
          this._selectTalent(talentName);
        }));

        // Highlight prerequisites
        root.querySelectorAll('.talent-node').forEach(el => {
          el.addEventListener('mouseenter', (e) => {
            const talentName = e.currentTarget?.dataset?.talentName;
            const node = talentGraph[talentName];
            if (node) {
              node.prereqs.forEach(prereq => {
                root.querySelectorAll(`[data-talent-name="${prereq}"]`).forEach(el => el.classList.add('highlight-prereq'));
              });
              node.dependents.forEach(dep => {
                root.querySelectorAll(`[data-talent-name="${dep}"]`).forEach(el => el.classList.add('highlight-dependent'));
              });
            }
          });
          el.addEventListener('mouseleave', () => {
            root?.querySelectorAll?.('.talent-node')?.forEach(el => el.classList.remove('highlight-prereq', 'highlight-dependent'));
          });
        });
      }
    }, {
      width: 800,
      height: 600,
      classes: ['talent-tree-dialog']
    }).render(true);
  }

  _generateTalentTreeHtml(treeName, talentGraph) {
    // Check if deflect/block should be grouped (houserule)
    let groupDeflectBlock = false;
    try {
      groupDeflectBlock = game.settings.get('foundryvtt-swse', 'groupDeflectBlock') || false;
    } catch (err) {
      groupDeflectBlock = false;
    }

    let html = `
      <div class="talent-tree-container">
        <h3>${treeName}</h3>
        <div class="talent-tree-canvas">
          <svg class="talent-connections" width="100%" height="100%">
    `;

    // Draw connection lines
    let svgLines = '';
    let yPos = 50;
    const talentPositions = {};

    // Organize talents into tiers (by prerequisite depth)
    const tiers = this._organizeTalentsIntoTiers(talentGraph);

    // Position and render talents
    tiers.forEach((tier, tierIndex) => {
      const xSpacing = 100 / (tier.length + 1);
      tier.forEach((talentName, index) => {
        const xPos = (index + 1) * xSpacing;
        talentPositions[talentName] = { x: xPos, y: yPos };
      });
      yPos += 120;
    });

    // Draw connection lines between prerequisites
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

      html += `
        <div class="talent-node ${isGrouped ? 'grouped-talent' : ''}"
             style="left: ${pos.x}%; top: ${pos.y}px;"
             data-talent-name="${talentName}"
             title="${talent.system?.benefit || 'No description'}">
          <div class="talent-icon">
            <img src="${talent.img}" alt="${talentName}" />
          </div>
          <div class="talent-name">${talentName}</div>
          ${isGrouped ? '<div class="grouped-indicator">Grouped</div>' : ''}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    </div>
    `;

    return html;
  }

  _organizeTalentsIntoTiers(talentGraph) {
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

    // Assign remaining talents to tiers based on prerequisite depth
    let currentTier = roots;
    while (assigned.size < Object.keys(talentGraph).length && currentTier.length > 0) {
      const nextTier = [];

      currentTier.forEach(talentName => {
        const node = talentGraph[talentName];
        node.dependents.forEach(depName => {
          if (!assigned.has(depName)) {
            const depNode = talentGraph[depName];
            // Check if all prerequisites are assigned
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

  _selectTalent(talentName) {
    const talent = this.talentData.find(t => t.name === talentName);
    if (!talent) {return;}

    // Check if already selected
    if (this.characterData.talents.find(t => t.name === talentName)) {
      ui.notifications.warn(`You already have ${talentName}`);
      return;
    }

    // Add to character
    this.characterData.talents.push(talent);
    ui.notifications.info(`${talentName} added!`);

    SWSELogger.log(`SWSE CharGen | Selected talent: ${talentName}`);
  }

  // ========================================
  // ENHANCED ACTIVATION
  // ========================================

  async _onRender(context, options) {
    guardOnRender(context, options, this);
    logChargenRender(this, context);
    guardActorAccess(this, 'actor');

    await super._onRender(context, options);

    // Validate all selectors BEFORE attaching listeners
    validateSelectors(this, [
      '.select-talent-tree',
      '[data-action]'
    ]);

    // Talent tree selection - AppV2 DOM API
    const root = this.element;
    root.querySelectorAll('.select-talent-tree').forEach(el => {
      el.addEventListener('click', this._onSelectTalentTree.bind(this));
    });
  }
}
