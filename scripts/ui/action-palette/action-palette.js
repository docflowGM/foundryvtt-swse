/**
 * SWSE Action Palette - Radial menu for character/scene actions
 * Foundry v13 ApplicationV2 implementation
 *
 * Two modes:
 *   - Player Mode: Phase-aware player actions, token-required
 *   - GM Mode: GM controls, suggestion summaries, tactical toggles
 */

import { sceneControlRegistry } from '../../scene-controls/api.js';
import { getCurrentPhase, SWSE_PHASES } from '../../state/phase.js';

export class ActionPaletteApp extends foundry.applications.api.ApplicationV2 {
  constructor(options = {}) {
    super(options);

    // User preferences
    this.isOpen = false;
    this.mode = game.user.isGM ? 'gm' : 'player';
    this.suggestionsActive = false;
  }

  /**
   * Default application configuration
   */
  static DEFAULT_OPTIONS = {
    id: 'swse-action-palette',
    window: {
      icon: 'fa-solid fa-circle-dot',
      title: 'Action Palette',
      positioned: false, // Custom positioning
      resizable: true,
      minimizable: true,
      contentClasses: ['action-palette-content']
    },
    position: {
      width: 320,
      height: 320
    },
    actions: {
      toggleMode: 'toggleMode',
      executeTool: 'executeTool'
    }
  };

  /**
   * Get template path
   */
  static TEMPLATE = 'systems/swse/templates/ui/action-palette.hbs';

  /**
   * Prepare context for template
   */
  async _prepareContext() {
    const tools = this._getFilteredTools();
    const isGM = game.user.isGM;
    const hasToken = this._hasSelectedToken();

    return {
      tools,
      mode: this.mode,
      isGM,
      hasToken,
      phase: getCurrentPhase(),
      showPlaceholder: !hasToken && this.mode === 'player',
      suggestionsAvailable: this.suggestionsActive && this.mode === 'gm'
    };
  }

  /**
   * Filter tools based on current mode and state
   * @private
   */
  _getFilteredTools() {
    const tools = [];
    const groups = sceneControlRegistry.groups.values();

    for (const group of groups) {
      for (const tool of group.tools) {
        // Check visibility predicate
        if (tool.visible && !tool.visible(canvas)) continue;

        // Mode-specific filtering
        if (this.mode === 'player') {
          // Player mode: require token selection
          if (!this._hasSelectedToken()) continue;
        } else if (this.mode === 'gm') {
          // GM mode: all tools available (no token requirement)
          // But still respect visibility
        }

        tools.push({
          name: tool.name,
          title: tool.title,
          icon: tool.icon,
          enabled: tool.enabled ? tool.enabled(canvas) : true,
          group: group.id
        });
      }
    }

    // Sort by group, then by name
    return tools.sort((a, b) => {
      if (a.group !== b.group) {
        return a.group.localeCompare(b.group);
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Execute a tool action
   */
  async executeTool(event) {
    const toolName = event.target.closest('[data-tool]')?.dataset.tool;
    if (!toolName) return;

    const groups = sceneControlRegistry.groups.values();
    for (const group of groups) {
      const tool = group.tools.find(t => t.name === toolName);
      if (tool && tool.onClick) {
        await tool.onClick(canvas, { name: toolName });
        break;
      }
    }
  }

  /**
   * Toggle between Player and GM mode
   */
  async toggleMode(event) {
    if (!game.user.isGM) return;
    this.mode = this.mode === 'player' ? 'gm' : 'player';
    await this.render();
  }

  /**
   * Check if a token is selected
   * @private
   */
  _hasSelectedToken() {
    return canvas?.tokens?.controlled?.length > 0;
  }

  /**
   * Listen for suggestion engine updates
   */
  _onSuggestionsUpdated(suggestions) {
    this.suggestionsActive = suggestions && suggestions.length > 0;
    if (this.rendered) {
      this.render();
    }
  }

  /**
   * Initialize hooks and listeners
   */
  _attachListeners() {
    Hooks.on('swse:gm-insights-updated', (suggestions) => {
      this._onSuggestionsUpdated(suggestions);
    });

    // Re-render on phase change
    Hooks.on('swse:phase-changed', () => {
      if (this.rendered) {
        this.render();
      }
    });

    // Re-render on token selection change
    Hooks.on('canvasReady', () => {
      canvas.tokens.on('select', () => {
        if (this.rendered) {
          this.render();
        }
      });
      canvas.tokens.on('deselect', () => {
        if (this.rendered) {
          this.render();
        }
      });
    });
  }

  /**
   * Load user preferences (position, size, mode)
   */
  _loadPreferences() {
    const prefs = game.user.getFlag('swse', 'actionPaletteState') || {};
    if (prefs.position) {
      this.position = prefs.position;
    }
    if (prefs.mode) {
      this.mode = prefs.mode;
    }
  }

  /**
   * Save user preferences
   */
  _savePreferences() {
    game.user.setFlag('swse', 'actionPaletteState', {
      position: this.position,
      mode: this.mode
    });
  }

  /**
   * Lifecycle: On render
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._attachListeners();
  }

  /**
   * Lifecycle: On close
   */
  async _onClose() {
    this._savePreferences();
    this.isOpen = false;
    await super._onClose();
  }
}
