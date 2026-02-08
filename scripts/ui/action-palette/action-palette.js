/**
 * SWSE Action Palette - Radial menu for character/scene actions
 * Foundry v13 ApplicationV2 implementation
 *
 * Two modes:
 *   - Player Mode: Phase-aware player actions, token-required, radial layout with docked favorites
 *   - GM Mode: Three zones (Spawners, Commands, Utilities) with customizable drag-and-drop slots
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

    // GM Zone customization (loaded from user flags)
    this.gmZones = {
      spawners: [{}, {}, {}],      // 3 NPC/encounter slots
      commands: [{}, {}, {}],      // 3 scene command slots
      utilities: [{}, {}, {}]      // 3 utility/insight slots
    };

    this._loadGMZones();
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
      height: 400
    },
    actions: {
      toggleMode: 'toggleMode',
      executeTool: 'executeTool',
      executeSlot: 'executeSlot',
      removeSlot: 'removeSlot',
      openGMPanel: 'openGMPanel'
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
      suggestionsAvailable: this.suggestionsActive && this.mode === 'gm',
      gmZones: this.gmZones
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
        if (tool.visible && !tool.visible(canvas)) {continue;}

        // Mode-specific filtering
        if (this.mode === 'player') {
          // Player mode: require token selection
          if (!this._hasSelectedToken()) {continue;}
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
   * Execute a player mode tool action
   */
  async executeTool(event) {
    const toolName = event.target.closest('[data-tool]')?.dataset.tool;
    if (!toolName) {return;}

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
   * Execute a GM zone slot action
   */
  async executeSlot(event) {
    const slot = event.target.closest('[data-zone]');
    if (!slot) {return;}

    const zone = slot.dataset.zone;
    const slotIndex = parseInt(slot.dataset.slot);
    const item = this.gmZones[zone]?.[slotIndex]?.item;

    if (!item) {return;}

    // Validate item is still valid
    if (item.type === 'actor') {
      // Spawn NPC dialog
      this._showSpawnDialog(item);
    } else if (item.type === 'command') {
      // Execute command with confirmation
      await this._executeCommand(item);
    } else if (item.type === 'utility') {
      // Execute utility hook
      await this._executeUtility(item);
    }
  }

  /**
   * Remove an item from a slot
   */
  async removeSlot(event) {
    event.stopPropagation();
    const zone = event.target.closest('[data-zone]')?.dataset.zone;
    const slotIndex = parseInt(event.target.closest('[data-zone]')?.dataset.slot);

    if (zone && slotIndex !== undefined) {
      this.gmZones[zone][slotIndex] = {};
      await this._saveGMZones();
      await this.render();
    }
  }

  /**
   * Open GM suggestion panel
   */
  async openGMPanel(event) {
    const { openGMPanel } = await import('../../gm-suggestions/init.js');
    openGMPanel();
  }

  /**
   * Toggle between Player and GM mode
   */
  async toggleMode(event) {
    if (!game.user.isGM) {return;}
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
   * Show spawn dialog for NPC
   * @private
   */
  async _showSpawnDialog(item) {
    const content = `
      <form>
        <div class="form-group">
          <label>Quantity:</label>
          <input type="number" name="quantity" value="1" min="1" max="10" />
        </div>
        <div class="form-group">
          <label>Placement:</label>
          <select name="placement">
            <option value="cursor">At Cursor</option>
            <option value="random">Random</option>
            <option value="edge">Edge</option>
          </select>
        </div>
      </form>
    `;

    return new Promise((resolve) => {
      new Dialog({
        title: `Spawn ${item.label}`,
        content,
        buttons: {
          spawn: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Spawn',
            callback: (html) => {
              const quantity = parseInt(html.find('input[name="quantity"]').val()) || 1;
              const placement = html.find('select[name="placement"]').val() || 'cursor';
              this._spawnActors(item, quantity, placement);
              resolve();
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve()
          }
        }
      }).render(true);
    });
  }

  /**
   * Spawn actors from compendium
   * @private
   */
  async _spawnActors(item, quantity, placement) {
    const compendium = game.packs.get(item.compendium);
    if (!compendium) {
      ui.notifications.error(`Compendium "${item.compendium}" not found`);
      return;
    }

    const actor = await compendium.getDocument(item.id);
    if (!actor) {
      ui.notifications.error(`Actor not found in compendium`);
      return;
    }

    for (let i = 0; i < quantity; i++) {
      const spawnPos = this._getSpawnPosition(placement);
      const token = await actor.getTokenDocument(spawnPos);
      await canvas.scene.createEmbeddedDocuments('Token', [token.toObject()]);
    }

    ui.notifications.info(`Spawned ${quantity} ${actor.name}${quantity > 1 ? 's' : ''}`);
  }

  /**
   * Calculate spawn position based on placement mode
   * @private
   */
  _getSpawnPosition(placement) {
    const gridSize = canvas.grid.size;

    if (placement === 'cursor') {
      return { x: canvas.mousePosition.x, y: canvas.mousePosition.y };
    } else if (placement === 'random') {
      return {
        x: Math.random() * canvas.dimensions.width,
        y: Math.random() * canvas.dimensions.height
      };
    } else if (placement === 'edge') {
      const edge = Math.floor(Math.random() * 4);
      const pos = Math.random();
      if (edge === 0) {return { x: pos * canvas.dimensions.width, y: 0 };}
      if (edge === 1) {return { x: pos * canvas.dimensions.width, y: canvas.dimensions.height };}
      if (edge === 2) {return { x: 0, y: pos * canvas.dimensions.height };}
      return { x: canvas.dimensions.width, y: pos * canvas.dimensions.height };
    }

    return { x: canvas.dimensions.width / 2, y: canvas.dimensions.height / 2 };
  }

  /**
   * Execute a GM command with confirmation
   * @private
   */
  async _executeCommand(item) {
    // Command types: heal, damage, condition, morale
    const content = this._buildCommandDialog(item);

    return new Promise((resolve) => {
      new Dialog({
        title: item.label,
        content,
        buttons: {
          execute: {
            icon: '<i class="fas fa-check"></i>',
            label: 'Execute',
            callback: (html) => {
              this._applyCommand(item, html);
              resolve();
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve()
          }
        }
      }).render(true);
    });
  }

  /**
   * Build dialog content for command
   * @private
   */
  _buildCommandDialog(item) {
    // Placeholder - customize based on command type
    return `<p>Confirm execution of <strong>${item.label}</strong>?</p>`;
  }

  /**
   * Apply GM command
   * @private
   */
  async _applyCommand(item, html) {
    // Placeholder - implement per command type
    ui.notifications.info(`Executed: ${item.label}`);
  }

  /**
   * Execute a GM utility (insight, overlay toggle, etc)
   * @private
   */
  async _executeUtility(item) {
    if (item.action === 'evaluate-threat') {
      // Re-evaluate encounter threat
      Hooks.callAll('swse:evaluate-encounter', { force: true });
      ui.notifications.info('Re-evaluating encounter threat...');
    } else if (item.action === 'toggle-overlay') {
      // Toggle tactical overlay
      Hooks.callAll('swse:toggle-tactical-overlay');
    } else if (item.action === 'escalate-scene') {
      // Mark scene as escalated
      Hooks.callAll('swse:scene-beat-changed', 'escalation');
    } else if (item.action === 'de-escalate-scene') {
      // Mark scene as de-escalated
      Hooks.callAll('swse:scene-beat-changed', 'resolution');
    }
  }

  /**
   * Load GM zones from user flags
   * @private
   */
  _loadGMZones() {
    const saved = game.user.getFlag('swse', 'actionPaletteGMZones') || {};
    this.gmZones = {
      spawners: saved.spawners || [{}, {}, {}],
      commands: saved.commands || [{}, {}, {}],
      utilities: saved.utilities || [{}, {}, {}]
    };
  }

  /**
   * Save GM zones to user flags
   * @private
   */
  async _saveGMZones() {
    await game.user.setFlag('swse', 'actionPaletteGMZones', this.gmZones);
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
   * Set up drag-and-drop handling
   */
  _attachDragAndDrop() {
    const slots = this.element?.querySelectorAll('.ap-slot');
    if (!slots) {return;}

    for (const slot of slots) {
      slot.addEventListener('dragover', (e) => this._onDragOver(e));
      slot.addEventListener('dragleave', (e) => this._onDragLeave(e));
      slot.addEventListener('drop', (e) => this._onDrop(e));
    }
  }

  /**
   * Handle drag over slot
   * @private
   */
  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.target.closest('.ap-slot')?.classList.add('dragover');
  }

  /**
   * Handle drag leave slot
   * @private
   */
  _onDragLeave(event) {
    event.target.closest('.ap-slot')?.classList.remove('dragover');
  }

  /**
   * Handle drop on slot
   * @private
   */
  async _onDrop(event) {
    event.preventDefault();
    const slot = event.target.closest('.ap-slot');
    if (!slot) {return;}

    slot.classList.remove('dragover');

    const zone = slot.dataset.zone;
    const slotIndex = parseInt(slot.dataset.slot);
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));

    // Validate and store item
    if (this._validateDroppedItem(data, zone)) {
      this.gmZones[zone][slotIndex] = {
        item: data,
        icon: data.img || 'fa-solid fa-circle-dot',
        label: data.name
      };
      await this._saveGMZones();
      await this.render();
    }
  }

  /**
   * Validate dropped item can go in this zone
   * @private
   */
  _validateDroppedItem(data, zone) {
    if (zone === 'spawners') {
      return data.type === 'Actor'; // Only actors
    } else if (zone === 'commands') {
      return data.type === 'command' || data.type === 'RollTable';
    } else if (zone === 'utilities') {
      return data.type === 'utility' || data.type === 'Macro';
    }
    return false;
  }

  /**
   * Initialize hooks and listeners
   */
  _attachListeners() {
    Hooks.on('swse:gm-insights-updated', (suggestions) => {
      this._onSuggestionsUpdated(suggestions);
    });

    Hooks.on('swse:phase-changed', () => {
      if (this.rendered) {
        this.render();
      }
    });

    Hooks.on('canvasReady', () => {
      canvas.tokens.on('select', () => {
        if (this.rendered && this.mode === 'player') {
          this.render();
        }
      });
      canvas.tokens.on('deselect', () => {
        if (this.rendered && this.mode === 'player') {
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
    if (prefs.mode && game.user.isGM) {
      this.mode = prefs.mode;
    }
  }

  /**
   * Save user preferences
   */
  async _savePreferences() {
    await game.user.setFlag('swse', 'actionPaletteState', {
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
    this._attachDragAndDrop();
  }

  /**
   * Lifecycle: On close
   */
  async _onClose() {
    await this._savePreferences();
    this.isOpen = false;
    await super._onClose();
  }
}
