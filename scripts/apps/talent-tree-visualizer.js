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

    const dialog = new SWSEDialogV2({
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
    new SWSEDialogV2({
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
    return `
      <style>
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
