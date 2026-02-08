/**
 * Enhanced Talent Tree Visualizer
 * Provides an interactive, animated talent tree selection and visualization system
 */

import { SWSELogger } from '../utils/logger.js';
import { PrerequisiteChecker } from '../data/prerequisite-checker.js';
import { SuggestionService } from '../engine/SuggestionService.js';
import { getTalentTreeName } from './chargen/chargen-property-accessor.js';

export class TalentTreeVisualizer {

  /**
   * Show the talent tree selection interface with hover previews
   * @param {Array} talentTrees - Array of available talent tree names
   * @param {Array} talentData - Full talent compendium data
   * @param {Actor} actor - The actor selecting talents
   * @param {Function} onSelectTalent - Callback when a talent is selected
   */
  static async showTreeSelection(talentTrees, talentData, actor, onSelectTalent) {
    // Pre-organize talents by tree for quick access
    const talentsByTree = this._organizeTalentsByTree(talentData);

    // Get actor's existing talents
    const ownedTalents = new Set(
      actor.items
        .filter(i => i.type === 'talent')
        .map(i => i.name)
    );

    const content = this._generateTreeSelectionHtml(talentTrees, talentsByTree, ownedTalents);

    const dialog = new Dialog({
      title: "Select a Talent Tree",
      content: content,
      buttons: {
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: "Cancel"
        }
      },
      render: (html) => {
        this._bindTreeSelectionListeners(html, talentTrees, talentsByTree, ownedTalents, talentData, actor, onSelectTalent, dialog);
      }
    }, {
      width: 900,
      height: 700,
      classes: ['swse', 'talent-tree-selection']
    });

    dialog.render(true);
  }

  /**
   * Organize talents by their tree name for efficient lookup
   */
  static _organizeTalentsByTree(talentData) {
    const talentsByTree = {};

    talentData.forEach(talent => {
      const treeName = getTalentTreeName(talent);
      if (treeName) {
        if (!talentsByTree[treeName]) {
          talentsByTree[treeName] = [];
        }
        talentsByTree[treeName].push(talent);
      }
    });

    return talentsByTree;
  }

  /**
   * Generate HTML for the tree selection screen
   */
  static _generateTreeSelectionHtml(talentTrees, talentsByTree, ownedTalents) {
    let html = `
      <div class="talent-tree-selection-container">
        <div class="selection-header">
          <h3>Choose Your Path</h3>
          <p class="hint">Hover over a tree to preview its talents. Click to explore the full talent tree.</p>
        </div>

        <div class="tree-selection-grid">
    `;

    talentTrees.forEach(treeName => {
      const talents = talentsByTree[treeName] || [];
      const ownedCount = talents.filter(t => ownedTalents.has(t.name)).length;

      html += `
        <div class="tree-card" data-tree-name="${treeName}">
          <div class="tree-card-header">
            <h4>${treeName}</h4>
            <span class="talent-count">${talents.length} Talents</span>
            ${ownedCount > 0 ? `<span class="owned-count">${ownedCount} Owned</span>` : ''}
          </div>
          <div class="tree-card-icon">
            <i class="fas fa-tree"></i>
          </div>
          <div class="tree-preview-panel" style="display: none;">
            <div class="preview-talents-list">
              ${this._generateTalentPreviewList(talents, ownedTalents)}
            </div>
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="tree-preview-sidebar">
          <div class="preview-content">
            <div class="preview-placeholder">
              <i class="fas fa-hand-pointer"></i>
              <p>Hover over a tree to preview talents</p>
            </div>
          </div>
        </div>
      </div>

      ${this._generateTreeSelectionStyles()}
    `;

    return html;
  }

  /**
   * Generate preview list of talents for a tree
   */
  static _generateTalentPreviewList(talents, ownedTalents) {
    if (talents.length === 0) {
      return '<p class="no-talents">No talents available</p>';
    }

    let html = '<ul class="talent-preview-list">';
    talents.forEach(talent => {
      const isOwned = ownedTalents.has(talent.name);
      const hasPrereq = talent.system?.prerequisites && talent.system.prerequisites !== 'null';

      html += `
        <li class="preview-talent-item ${isOwned ? 'owned' : ''}">
          <span class="talent-name">
            ${isOwned ? '<i class="fas fa-circle-check"></i>' : ''}
            ${talent.name}
          </span>
          ${hasPrereq ? '<span class="prereq-marker"><i class="fas fa-link"></i></span>' : ''}
        </li>
      `;
    });
    html += '</ul>';

    return html;
  }

  /**
   * Bind event listeners for tree selection
   */
  static _bindTreeSelectionListeners(html, talentTrees, talentsByTree, ownedTalents, talentData, actor, onSelectTalent, dialog) {
    const root = html?.[0] ?? html;
    const previewSidebar = root.querySelector('.preview-content');

    // Hover to show preview
    // hover migrated to mouseenter/mouseleave
    // Click to open full tree with animation
    root.querySelectorAll('.tree-card').forEach(card => card.addEventListener('click', async function() {
      const treeName = this?.dataset?.treeName;

      // Show loading animation
      TalentTreeVisualizer._showLoadingAnimation(html, treeName);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Close selection dialog
      dialog.close();

      // Show enhanced talent tree
      await TalentTreeVisualizer.showEnhancedTalentTree(
        treeName,
        talentData,
        actor,
        onSelectTalent
      );
    }));
  }

  /**
   * Show loading animation when tree is selected
   */
  static _showLoadingAnimation(html, treeName) {
    const loadingHtml = `
      <div class="tree-loading-overlay">
        <div class="loading-content">
          <div class="loading-spinner">
            <i class="fas fa-arrows-rotate fa-spin"></i>
          </div>
          <h3>Loading ${treeName}...</h3>
          <div class="loading-bar">
            <div class="loading-progress"></div>
          </div>
          <p class="loading-text">Connecting to the Force...</p>
        </div>
      </div>
    `;

    const root = html?.[0] ?? html;
    root?.querySelector?.('.talent-tree-selection-container')?.insertAdjacentHTML?.('beforeend', loadingHtml);

    // Animate loading bar
    setTimeout(() => {
      root.querySelectorAll('.loading-progress').css('width', '100%');
    }, 100);
  }

  /**
   * Show enhanced talent tree visualization
   */
  static async showEnhancedTalentTree(treeName, talentData, actor, onSelectTalent) {
    SWSELogger.log(`[TALENT-TREE-VIS] ===== showEnhancedTalentTree START =====`);
    SWSELogger.log(`[TALENT-TREE-VIS] showEnhancedTalentTree("${treeName}"):`, {
      talentDataLength: talentData?.length || 0,
      talentDataIsArray: Array.isArray(talentData)
    });

    if (!talentData || talentData.length === 0) {
      SWSELogger.error(`[TALENT-TREE-VIS] ERROR - talentData is empty or undefined!`);
      ui.notifications.error(`No talent data available for ${treeName}`);
      return;
    }

    // Talents are already filtered by tree when passed to this function
    // (chargen-narrative.js uses TalentTreeDB and TalentDB to get pre-filtered talents)
    let talents = talentData;

    SWSELogger.log(`[TALENT-TREE-VIS] Received pre-filtered talents for tree "${treeName}":`, {
      treeName: treeName,
      talentCount: talents.length,
      firstTalent: talents[0] ? { name: talents[0].name, id: talents[0].id } : 'N/A'
    });

    if (talents.length === 0) {
      SWSELogger.error(`[TALENT-TREE-VIS] ERROR - No talents provided for tree "${treeName}"!`);
      ui.notifications.warn(`No talents found for ${treeName}`);
      return;
    }

    SWSELogger.log(`[TALENT-TREE-VIS] ✓ Found ${talents.length} talents for tree "${treeName}"`);

    // Filter talents based on prerequisites - add isQualified property
    talents = PrerequisiteChecker.filterQualifiedTalents(talents, actor, {});

    // Apply suggestion engine to add tier-based recommendations
    talents = await SuggestionService.getSuggestions(actor, 'sheet', { domain: 'talents', available: talents, pendingData: {}, persist: false });

    // Get owned talents
    const ownedTalents = new Set(
      actor.items
        .filter(i => i.type === 'talent')
        .map(i => i.name)
    );

    // Build prerequisite graph
    const talentGraph = this._buildTalentGraph(talents);

    // Generate enhanced HTML
    const treeHtml = this._generateEnhancedTreeHtml(treeName, talentGraph, ownedTalents);

    // Show dialog
    new Dialog({
      title: `${treeName} - Talent Tree`,
      content: treeHtml,
      buttons: {
        back: {
          icon: '<i class="fas fa-arrow-left"></i>',
          label: "Back to Trees",
          callback: async () => {
            // Re-open tree selection
            await this.showTreeSelection(
              [treeName], // Would need to pass all trees here
              talentData,
              actor,
              onSelectTalent
            );
          }
        },
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      },
      default: "close",
      render: (html) => {
        this._bindEnhancedTreeListeners(html, talentGraph, ownedTalents, actor, onSelectTalent);
      }
    }, {
      width: 1000,
      height: 700,
      classes: ['swse', 'talent-tree-enhanced']
    }).render(true);
  }

  /**
   * Build talent prerequisite graph
   */
  static _buildTalentGraph(talents) {
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
   * Generate enhanced tree HTML with central node
   */
  static _generateEnhancedTreeHtml(treeName, talentGraph, ownedTalents) {
    const groupDeflectBlock = game.settings.get('foundryvtt-swse', "groupDeflectBlock") || false;

    let html = `
      <div class="talent-tree-enhanced-container">
        <div class="tree-header">
          <h2>${treeName}</h2>
          <p class="tree-subtitle">Click a talent to select it. Hover to see prerequisites and dependents.</p>
        </div>

        <div class="tree-canvas-wrapper">
          <svg class="talent-connections" width="100%" height="100%">
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#00d9ff;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#0a74da;stop-opacity:1" />
              </linearGradient>
            </defs>
    `;

    // Organize talents into tiers
    const tiers = this._organizeTalentsIntoTiers(talentGraph);
    const talentPositions = {};

    // Add central tree node at top
    const centerX = 50;
    const centerY = 60;

    html += `
      <circle cx="${centerX}%" cy="${centerY}" r="40"
              fill="url(#lineGradient)"
              filter="url(#glow)"
              opacity="0.3"/>
      <text x="${centerX}%" y="${centerY}"
            text-anchor="middle"
            dominant-baseline="middle"
            fill="#00d9ff"
            font-size="16"
            font-weight="bold"
            filter="url(#glow)">
        ${treeName}
      </text>
    `;

    // Position talents (start below central node)
    let yPos = 150;
    tiers.forEach((tier, tierIndex) => {
      const xSpacing = 90 / (tier.length + 1);
      tier.forEach((talentName, index) => {
        const xPos = 5 + (index + 1) * xSpacing;
        talentPositions[talentName] = { x: xPos, y: yPos };
      });
      yPos += 140;
    });

    // Draw glowing connection lines
    let svgLines = '';
    Object.entries(talentGraph).forEach(([talentName, node]) => {
      const talentPos = talentPositions[talentName];
      if (!talentPos) return;

      node.prereqs.forEach(prereqName => {
        const prereqPos = talentPositions[prereqName];
        if (!prereqPos) return;

        const isOwnedChain = ownedTalents.has(talentName) && ownedTalents.has(prereqName);

        svgLines += `
          <line
            x1="${prereqPos.x}%"
            y1="${prereqPos.y + 35}"
            x2="${talentPos.x}%"
            y2="${talentPos.y - 5}"
            class="talent-connection ${isOwnedChain ? 'owned-connection' : ''}"
            stroke="url(#lineGradient)"
            stroke-width="3"
            filter="url(#glow)"
            data-from="${prereqName}"
            data-to="${talentName}"
          />
        `;
      });
    });

    html += svgLines + '</svg>';

    // Render talent nodes
    html += '<div class="talent-nodes-container">';

    Object.entries(talentPositions).forEach(([talentName, pos]) => {
      const node = talentGraph[talentName];
      const talent = node.talent;
      const isOwned = ownedTalents.has(talentName);
      const isGrouped = groupDeflectBlock && (talentName === 'Block' || talentName === 'Deflect');
      const hasPrereq = node.prereqs.length > 0;
      const isUnavailable = !talent.isQualified && !isOwned; // Don't mark owned talents as unavailable

      // Get suggestion data
      const isSuggested = talent.isSuggested && !isOwned && !isUnavailable;
      const suggestionClass = isSuggested ? `is-suggested ${talent.suggestion?.cssClass || ''}` : '';
      const suggestionBadge = isSuggested
        ? `<span class="suggestion-badge ${talent.suggestion?.cssClass || ''}" title="${talent.suggestion?.reason || ''}">
             <i class="${talent.suggestion?.iconClass || ''}"></i>
           </span>`
        : '';

      html += `
        <div class="talent-node ${isOwned ? 'owned-talent' : ''} ${isGrouped ? 'grouped-talent' : ''} ${isUnavailable ? 'unavailable' : ''} ${suggestionClass}"
             style="left: ${pos.x}%; top: ${pos.y}px;"
             data-talent-name="${talentName}"
             data-suggestion-tier="${talent.suggestion?.tier || 0}"
             title="${talent.system?.benefit || 'No description'}">
          <div class="talent-icon-wrapper">
            <img src="${talent.img}" alt="${talentName}" class="talent-icon" />
            ${isOwned ? '<div class="owned-badge"><i class="fas fa-check"></i></div>' : ''}
            ${suggestionBadge}
          </div>
          <div class="talent-label">${talentName}</div>
          ${hasPrereq ? '<div class="prereq-indicator"><i class="fas fa-link"></i></div>' : ''}
          <div class="talent-tooltip">
            <strong>${talentName}</strong>
            ${isSuggested ? `<div class="tooltip-suggestion"><i class="${talent.suggestion?.iconClass || ''}"></i> ${talent.suggestion?.reason || ''}</div>` : ''}
            <p>${talent.system?.benefit || 'No description available'}</p>
            ${hasPrereq ? `<small><em>Requires: ${node.prereqs.join(', ')}</em></small>` : ''}
            ${talent.prereqReasons && talent.prereqReasons.length > 0 ? `<div style="color: #ff5555; margin-top: 0.5em; font-weight: bold; font-size: 0.9em;">⚠ Cannot take:<ul style="margin: 0.3em 0 0 1.2em; padding: 0;">${talent.prereqReasons.map(r => `<li style="font-size: 0.9em;">${r}</li>`).join('')}</ul></div>` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div class="tree-legend">
        <div class="legend-item">
          <div class="legend-icon available"></div>
          <span>Available</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon owned"></div>
          <span>Already Owned</span>
        </div>
        <div class="legend-item">
          <div class="legend-icon locked"></div>
          <span>Locked (Prerequisites not met)</span>
        </div>
        <div class="legend-divider"></div>
        <div class="legend-item suggestion-legend-item">
          <span class="suggestion-badge suggestion-tier-chain"><i class="fas fa-link"></i></span>
          <span>Chain</span>
        </div>
        <div class="legend-item suggestion-legend-item">
          <span class="suggestion-badge suggestion-tier-skill"><i class="fas fa-bullseye"></i></span>
          <span>Skill</span>
        </div>
        <div class="legend-item suggestion-legend-item">
          <span class="suggestion-badge suggestion-tier-ability"><i class="fas fa-fist-raised"></i></span>
          <span>Ability</span>
        </div>
        <div class="legend-item suggestion-legend-item">
          <span class="suggestion-badge suggestion-tier-class"><i class="fas fa-users-cog"></i></span>
          <span>Class</span>
        </div>
      </div>
    </div>

    ${this._generateEnhancedTreeStyles()}
    `;

    return html;
  }

  /**
   * Organize talents into tiers based on prerequisite depth
   */
  static _organizeTalentsIntoTiers(talentGraph) {
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
    let iterations = 0;
    const maxIterations = 20;

    while (assigned.size < Object.keys(talentGraph).length && currentTier.length > 0 && iterations < maxIterations) {
      const nextTier = [];

      currentTier.forEach(talentName => {
        const node = talentGraph[talentName];
        node.dependents.forEach(depName => {
          if (!assigned.has(depName)) {
            const depNode = talentGraph[depName];
            if (depNode.prereqs.every(p => assigned.has(p))) {
              if (!nextTier.includes(depName)) {
                nextTier.push(depName);
                assigned.add(depName);
              }
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

      iterations++;
    }

    return tiers;
  }

  /**
   * Bind listeners for enhanced tree
   */
  static _bindEnhancedTreeListeners(html, talentGraph, ownedTalents, actor, onSelectTalent) {
    // Click to select talent
    root.querySelectorAll('.talent-node').click(function(e) {
      const talentName = this?.dataset?.talentName;
      const node = talentGraph[talentName];

      if (!node) return;

      // Check if talent is unavailable
      if ($(this).hasClass('unavailable')) {
        const prereqReasons = node.talent.prerequisiteReasons || [];
        const message = prereqReasons.length > 0
          ? `Cannot select ${talentName}:\n${prereqReasons.join('\n')}`
          : `${talentName} is not available (prerequisites not met)`;
        ui.notifications.warn(message);
        return;
      }

      // Check if already owned
      if (ownedTalents.has(talentName)) {
        ui.notifications.info(`You already have the ${talentName} talent.`);
        return;
      }

      // Select talent (prerequisite checking happens in the callback)
      if (onSelectTalent) {
        onSelectTalent(node.talent);
      }

      // Close dialog
      $(this).closest('.dialog').find('.window-close').click();
    });

    // Hover to highlight prerequisites and dependents
    root.querySelectorAll('.talent-node').hover(
      function() {
        const talentName = this?.dataset?.talentName;
        const node = talentGraph[talentName];

        if (node) {
          // Highlight prerequisites (green)
          node.prereqs.forEach(prereq => {
            (root.querySelectorAll(`[data-talent-name="${prereq}"]`)||[]).forEach(el=>el.classList.add('highlight-prereq'));
            (root.querySelectorAll(`line[data-from="${prereq}"][data-to="${talentName}"]`)||[]).forEach(el=>el.classList.add('line-highlight-prereq'));
          });

          // Highlight dependents (purple)
          node.dependents.forEach(dep => {
            (root.querySelectorAll(`[data-talent-name="${dep}"]`)||[]).forEach(el=>el.classList.add('highlight-dependent'));
            (root.querySelectorAll(`line[data-from="${talentName}"][data-to="${dep}"]`)||[]).forEach(el=>el.classList.add('line-highlight-dependent'));
          });

          $(this).addClass('highlight-current');
        }
      },
      function() {
        root.querySelectorAll('.talent-node').removeClass('highlight-prereq highlight-dependent highlight-current');
        root.querySelectorAll('line').removeClass('line-highlight-prereq line-highlight-dependent');
      }
    );
  }

  /**
   * Generate styles for tree selection screen
   */
  static _generateTreeSelectionStyles() {
    return `
      <style>
        .talent-tree-selection-container {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 8px;
          min-height: 600px;
        }

        .selection-header {
          grid-column: 1 / -1;
          text-align: center;
          padding: 1rem;
          background: rgba(0, 217, 255, 0.1);
          border-radius: 6px;
          border-bottom: 2px solid #00d9ff;
        }

        .selection-header h3 {
          margin: 0 0 0.5rem 0;
          color: #00d9ff;
          font-size: 1.8rem;
        }

        .tree-selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          max-height: 500px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }

        .tree-card {
          background: rgba(255, 255, 255, 0.05);
          border: 3px solid #0a74da;
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
        }

        .tree-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 217, 255, 0.3), transparent);
          transition: left 0.5s;
        }

        .tree-card:hover::before {
          left: 100%;
        }

        .tree-card:hover,
        .tree-card-hover {
          transform: translateY(-8px) scale(1.05);
          border-color: #00d9ff;
          box-shadow: 0 10px 30px rgba(0, 217, 255, 0.4),
                      0 0 20px rgba(0, 217, 255, 0.2);
          background: rgba(0, 217, 255, 0.1);
        }

        .tree-card-header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .tree-card-header h4 {
          margin: 0 0 0.5rem 0;
          color: #00d9ff;
          font-size: 1.3rem;
          text-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
        }

        .talent-count {
          display: block;
          font-size: 0.9rem;
          color: #aaa;
        }

        .owned-count {
          display: inline-block;
          margin-top: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: rgba(0, 217, 102, 0.2);
          border: 1px solid #00d966;
          border-radius: 4px;
          color: #00d966;
          font-size: 0.85rem;
          font-weight: bold;
        }

        .tree-card-icon {
          text-align: center;
          font-size: 4rem;
          color: #0a74da;
          transition: all 0.3s;
        }

        .tree-card:hover .tree-card-icon {
          color: #00d9ff;
          transform: scale(1.2) rotate(10deg);
          filter: drop-shadow(0 0 10px rgba(0, 217, 255, 0.8));
        }

        .tree-preview-sidebar {
          background: rgba(0, 0, 0, 0.3);
          border: 2px solid #0a74da;
          border-radius: 8px;
          padding: 1.5rem;
          max-height: 500px;
          overflow-y: auto;
        }

        .preview-placeholder {
          text-align: center;
          color: #666;
          padding: 3rem 1rem;
        }

        .preview-placeholder i {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .preview-active h4 {
          color: #00d9ff;
          margin: 0 0 1rem 0;
          font-size: 1.4rem;
          border-bottom: 2px solid #00d9ff;
          padding-bottom: 0.5rem;
        }

        .preview-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
        }

        .preview-stats span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #aaa;
        }

        .preview-stats i {
          color: #00d9ff;
        }

        .talent-preview-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .preview-talent-item {
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          background: rgba(255, 255, 255, 0.05);
          border-left: 3px solid #0a74da;
          border-radius: 4px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }

        .preview-talent-item:hover {
          background: rgba(0, 217, 255, 0.1);
          border-left-color: #00d9ff;
          transform: translateX(5px);
        }

        .preview-talent-item.owned {
          background: rgba(0, 217, 102, 0.1);
          border-left-color: #00d966;
        }

        .preview-talent-item.owned .talent-name {
          color: #00d966;
        }

        .talent-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #e4e4e4;
        }

        .prereq-marker {
          color: #ffc107;
        }

        /* Loading Animation */
        .tree-loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .loading-content {
          text-align: center;
          max-width: 400px;
        }

        .loading-spinner {
          font-size: 4rem;
          color: #00d9ff;
          margin-bottom: 1.5rem;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        .loading-content h3 {
          color: #00d9ff;
          margin-bottom: 1.5rem;
          font-size: 1.8rem;
        }

        .loading-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .loading-progress {
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #0a74da, #00d9ff);
          border-radius: 4px;
          transition: width 1s ease-out;
          box-shadow: 0 0 10px rgba(0, 217, 255, 0.5);
        }

        .loading-text {
          color: #aaa;
          font-style: italic;
          animation: fadeInOut 2s infinite;
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      </style>
    `;
  }

  /**
   * Generate styles for enhanced tree visualization
   */
  static _generateEnhancedTreeStyles() {
    return `
      <style>
        .talent-tree-enhanced-container {
          background: linear-gradient(135deg, #0a0e1a 0%, #16213e 100%);
          border-radius: 8px;
          padding: 1.5rem;
          min-height: 600px;
          position: relative;
        }

        .tree-header {
          text-align: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 3px solid #00d9ff;
        }

        .tree-header h2 {
          margin: 0 0 0.5rem 0;
          color: #00d9ff;
          font-size: 2.2rem;
          text-shadow: 0 0 20px rgba(0, 217, 255, 0.8);
        }

        .tree-subtitle {
          color: #aaa;
          font-style: italic;
          margin: 0;
        }

        .tree-canvas-wrapper {
          position: relative;
          width: 100%;
          min-height: 500px;
          background: radial-gradient(ellipse at center, rgba(0, 217, 255, 0.05) 0%, transparent 70%);
        }

        .talent-connections {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        .talent-connection {
          opacity: 0.6;
          transition: all 0.3s;
        }

        .talent-connection.owned-connection {
          stroke: #00d966 !important;
          opacity: 0.9;
          stroke-width: 4;
        }

        .talent-connection.line-highlight-prereq {
          stroke: #00ff88 !important;
          opacity: 1;
          stroke-width: 5;
          filter: drop-shadow(0 0 8px #00ff88);
        }

        .talent-connection.line-highlight-dependent {
          stroke: #ff00ff !important;
          opacity: 1;
          stroke-width: 5;
          filter: drop-shadow(0 0 8px #ff00ff);
        }

        .talent-nodes-container {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
        }

        .talent-node {
          position: absolute;
          width: 90px;
          text-align: center;
          cursor: pointer;
          transform: translate(-50%, 0);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .talent-node:hover {
          transform: translate(-50%, -10px) scale(1.15);
          z-index: 100;
        }

        .talent-icon-wrapper {
          position: relative;
          width: 70px;
          height: 70px;
          margin: 0 auto 0.5rem auto;
          border: 4px solid #0a74da;
          border-radius: 50%;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.5);
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(10, 116, 218, 0.3);
        }

        .talent-node:hover .talent-icon-wrapper {
          border-color: #00d9ff;
          box-shadow: 0 0 25px rgba(0, 217, 255, 0.8);
        }

        .talent-icon {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .talent-label {
          font-size: 0.8rem;
          color: #e4e4e4;
          font-weight: bold;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8);
          margin-top: 0.25rem;
        }

        .owned-talent .talent-icon-wrapper {
          border-color: #00d966;
          box-shadow: 0 0 20px rgba(0, 217, 102, 0.6);
        }

        .owned-talent .talent-label {
          color: #00d966;
        }

        /* Unavailable talent styles */
        .talent-node.unavailable {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .talent-node.unavailable .talent-icon-wrapper {
          border-color: #555;
          box-shadow: none;
        }

        .talent-node.unavailable .talent-label {
          color: #888;
        }

        .talent-node.unavailable:hover {
          transform: none;
        }

        .owned-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 28px;
          height: 28px;
          background: #00d966;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 0.9rem;
          box-shadow: 0 0 10px rgba(0, 217, 102, 0.8);
        }

        .prereq-indicator {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          color: #ffc107;
          font-size: 1rem;
          filter: drop-shadow(0 0 5px rgba(255, 193, 7, 0.8));
        }

        .grouped-talent .talent-icon-wrapper {
          border-color: #ffa500;
          box-shadow: 0 0 15px rgba(255, 165, 0, 0.6);
        }

        .highlight-current .talent-icon-wrapper {
          border-color: #00d9ff;
          box-shadow: 0 0 30px rgba(0, 217, 255, 1);
          animation: pulse-glow 1s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 217, 255, 0.8);
          }
          50% {
            box-shadow: 0 0 40px rgba(0, 217, 255, 1);
          }
        }

        .highlight-prereq .talent-icon-wrapper {
          border-color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.9);
        }

        .highlight-dependent .talent-icon-wrapper {
          border-color: #ff00ff;
          box-shadow: 0 0 20px rgba(255, 0, 255, 0.9);
        }

        .talent-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.95);
          border: 2px solid #00d9ff;
          border-radius: 8px;
          padding: 1rem;
          min-width: 250px;
          max-width: 350px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          z-index: 1000;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
        }

        .talent-node:hover .talent-tooltip {
          opacity: 1;
        }

        .talent-tooltip strong {
          display: block;
          color: #00d9ff;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #0a74da;
          padding-bottom: 0.25rem;
        }

        .talent-tooltip p {
          margin: 0.5rem 0;
          color: #e4e4e4;
          line-height: 1.4;
          font-size: 0.9rem;
        }

        .talent-tooltip small {
          color: #ffc107;
        }

        .tree-legend {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 2rem;
          padding: 1rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          border-top: 2px solid #0a74da;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #aaa;
          font-size: 0.9rem;
        }

        .legend-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid;
        }

        .legend-icon.available {
          border-color: #0a74da;
          background: rgba(10, 116, 218, 0.3);
        }

        .legend-icon.owned {
          border-color: #00d966;
          background: rgba(0, 217, 102, 0.3);
        }

        .legend-icon.locked {
          border-color: #666;
          background: rgba(100, 100, 100, 0.3);
        }

        .legend-divider {
          width: 2px;
          height: 20px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 0.5rem;
        }

        .suggestion-legend-item .suggestion-badge {
          width: 20px;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 10px;
        }

        /* Suggestion badges in talent nodes */
        .talent-icon-wrapper .suggestion-badge {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 10px;
          z-index: 10;
          animation: suggestion-pulse 2s infinite;
        }

        @keyframes suggestion-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }

        .suggestion-badge.suggestion-tier-chain {
          background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
          color: #1a1a2e;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
        }

        .suggestion-badge.suggestion-tier-skill {
          background: linear-gradient(135deg, #00d9ff 0%, #00a8cc 100%);
          color: #1a1a2e;
          box-shadow: 0 0 8px rgba(0, 217, 255, 0.8);
        }

        .suggestion-badge.suggestion-tier-ability {
          background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
          color: #ffffff;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.8);
        }

        .suggestion-badge.suggestion-tier-class {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #ffffff;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
        }

        /* Suggested talent node highlight */
        .talent-node.is-suggested .talent-icon-wrapper {
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }

        .talent-node.suggestion-tier-chain .talent-icon-wrapper {
          border-color: #ffd700;
        }

        .talent-node.suggestion-tier-skill .talent-icon-wrapper {
          border-color: #00d9ff;
        }

        .talent-node.suggestion-tier-ability .talent-icon-wrapper {
          border-color: #a855f7;
        }

        .talent-node.suggestion-tier-class .talent-icon-wrapper {
          border-color: #22c55e;
        }

        /* Tooltip suggestion info */
        .tooltip-suggestion {
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 4px;
          padding: 0.4rem 0.6rem;
          margin: 0.5rem 0;
          font-size: 0.85rem;
          color: #ffd700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tooltip-suggestion i {
          font-size: 0.9rem;
        }
      </style>
    `;
  }
}
