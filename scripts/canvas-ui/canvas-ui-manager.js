/*
  swse-canvas-toolbar.js
  Complete rewrite of the SWSE Canvas Toolbar to avoid Forge scaling/css conflicts.
  - Does NOT extend Foundry Application to avoid canvas scaling issues in Forge.
  - Renders a fixed-position HUD element appended to document.body (not inside the canvas wrapper).
  - Uses scoped CSS to avoid global style collisions.
  - Avoids global jQuery document listeners; uses namespaced window listeners cleaned on close.
  - Provides compatibility fallbacks for chat input selectors and token id differences across Foundry versions.

  Install: Replace the previous toolbar file with this module file in your system, then reload Foundry/Forge.
*/

import { SWSELogger } from '../utils/logger.js';
import SWSEDialogHelper from '../helpers/swse-dialog-helper.js';

const STYLE_ID = 'swse-canvas-toolbar-style';

class SWSECanvasToolbar {
  constructor(options = {}) {
    this.options = Object.assign({
      position: { bottom: '14px', left: '14px' },
      width: 420
    }, options);

    this.tools = this._getToolbarData().tools;
    this._container = null;
    this._openDropdown = null;
    this._onWindowPointerDown = this._onWindowPointerDown.bind(this);
    this._onWindowResize = this._onWindowResize.bind(this);
  }

  /* Public lifecycle */
  render() {
    // If already rendered, re-render contents
    if (this._container) {
      this._renderContents();
      return;
    }

    // Inject styles once
    this._injectStyles();

    // Create container appended to body so it's NOT inside the canvas transform.
    this._container = document.createElement('div');
    this._container.className = 'swse-canvas-toolbar hud swse-canvas-toolbar--fixed';
    this._container.setAttribute('data-swse-toolbar', 'true');
    Object.assign(this._container.style, {
      position: 'fixed',
      zIndex: 2000,
      width: `${this.options.width}px`,
      bottom: this.options.position.bottom,
      left: this.options.position.left
    });

    document.body.appendChild(this._container);

    this._renderContents();

    // Bind global listeners (namespaced)
    window.addEventListener('pointerdown', this._onWindowPointerDown);
    window.addEventListener('resize', this._onWindowResize);
  }

  close() {
    if (!this._container) return;
    window.removeEventListener('pointerdown', this._onWindowPointerDown);
    window.removeEventListener('resize', this._onWindowResize);
    this._container.remove();
    this._container = null;
    this._openDropdown = null;
  }

  _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const css = `
.swse-canvas-toolbar--fixed.swse-canvas-toolbar {\n  font-family: var(--font-family);\n  background: rgba(22,22,22,0.88);\n  color: #eee;\n  border-radius: 10px;\n  padding: 6px;\n  box-shadow: 0 6px 18px rgba(0,0,0,0.6);\n  --swse-button-size: 36px;\n}\n.swse-canvas-toolbar .swse-toolbar-row {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n}\n.swse-canvas-toolbar .swse-tool {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: var(--swse-button-size);\n  height: var(--swse-button-size);\n  border-radius: 6px;\n  background: rgba(255,255,255,0.04);\n  cursor: pointer;\n  user-select: none;\n}
.swse-canvas-toolbar .swse-tool:active{ transform: translateY(1px); }
.swse-canvas-toolbar .swse-tool .fa { pointer-events: none; }
.swse-canvas-toolbar .swse-tool.dropdown { position: relative; }
.swse-canvas-toolbar .swse-tool.dropdown .dropdown-panel {\n  position: absolute;\n  left: 0;\n  top: calc(var(--swse-button-size) + 8px);\n  min-width: 200px;\n  max-height: 320px;\n  overflow: auto;\n  background: rgba(12,12,12,0.96);\n  border-radius: 8px;\n  box-shadow: 0 8px 24px rgba(0,0,0,0.6);\n  padding: 6px;\n  display: none;\n  z-index: 2100;\n}
.swse-canvas-toolbar .swse-tool.dropdown.open .dropdown-panel { display: block; }
.swse-canvas-toolbar .dropdown-item {\n  padding: 6px 10px;\n  border-radius: 6px;\n  cursor: pointer;\n}\n.swse-canvas-toolbar .dropdown-item:hover { background: rgba(255,255,255,0.03); }
.swse-canvas-toolbar .swse-toolbar-spacer { flex: 1; }
.swse-canvas-toolbar .swse-collapse { position: absolute; right: 8px; top: 6px; font-size: 12px; opacity: 0.7; cursor: pointer; }
.swse-canvas-toolbar .swse-label { margin-left: 8px; font-size: 12px; opacity: 0.9; }
`; 
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  _renderContents() {
    if (!this._container) return;

    // Build DOM using simple DOM APIs (no external template dependency)
    this._container.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'swse-toolbar-row';

    for (const tool of this.tools) {
      const el = document.createElement('div');
      el.className = 'swse-tool';
      el.setAttribute('role', 'button');
      el.setAttribute('data-tool-id', tool.id);
      el.title = tool.title || '';

      if (tool.type === 'dropdown') el.classList.add('dropdown');

      // Icon
      const icon = document.createElement('i');
      icon.className = tool.icon || 'fas fa-question';
      el.appendChild(icon);

      // For dropdowns, attach a panel
      if (tool.type === 'dropdown') {
        const panel = document.createElement('div');
        panel.className = 'dropdown-panel';

        // Build dropdown contents depending on tool config
        if (tool.commands) {
          for (const cmd of tool.commands) {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = cmd.label || cmd.command;
            item.setAttribute('data-action', 'chatCommand');
            item.setAttribute('data-command', cmd.command);
            panel.appendChild(item);
          }
        }

        if (tool.conditions) {
          for (const c of tool.conditions) {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = c.label || c.id;
            item.setAttribute('data-action', 'applyCondition');
            item.setAttribute('data-condition', String(c.value));
            panel.appendChild(item);
          }
        }

        if (tool.options) {
          for (const o of tool.options) {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.textContent = o.label || o.action;
            item.setAttribute('data-action', o.action);
            panel.appendChild(item);
          }
        }

        el.appendChild(panel);

        // Add a caret label for clarity
        const label = document.createElement('span');
        label.className = 'swse-label';
        label.textContent = tool.title || '';
        el.appendChild(label);
      } else {
        // Non-dropdown button
        el.setAttribute('data-action', tool.action);
        // Optional label for larger buttons
        if (tool.title && tool.type !== 'button-compact') {
          const label = document.createElement('span');
          label.className = 'swse-label';
          label.textContent = tool.title;
          el.appendChild(label);
        }
      }

      // Attach basic click handler
      el.addEventListener('click', (ev) => this._onToolClick(ev, tool));

      row.appendChild(el);
    }

    // Collapse control
    const collapse = document.createElement('div');
    collapse.className = 'swse-collapse';
    collapse.title = 'Collapse toolbar';
    collapse.textContent = '▾';
    collapse.addEventListener('click', (e) => {
      e.stopPropagation();
      this._container.classList.toggle('collapsed');
      // Maintain minimal width when collapsed
      if (this._container.classList.contains('collapsed')) {
        this._container.style.width = '48px';
      } else {
        this._container.style.width = `${this.options.width}px`;
      }
    });

    this._container.appendChild(row);
    this._container.appendChild(collapse);
  }

  /* Event routing */
  _onToolClick(event, tool) {
    event.stopPropagation();
    // If this was a dropdown root, toggle
    const el = event.currentTarget;
    if (el.classList.contains('dropdown')) {
      const isOpen = el.classList.contains('open');
      this._closeAllDropdowns();
      if (!isOpen) {
        el.classList.add('open');
        this._openDropdown = el;
      }
      return;
    }

    const action = el.getAttribute('data-action');
    this._handleAction(action, tool, event);
  }

  _onWindowPointerDown(ev) {
    // Close dropdowns if click outside the toolbar
    if (!this._container) return;
    if (!this._container.contains(ev.target)) {
      this._closeAllDropdowns();
    }
  }

  _onWindowResize() {
    // Keep toolbar inside the viewport
    if (!this._container) return;
    const rect = this._container.getBoundingClientRect();
    const pad = 8;
    let left = rect.left;
    let bottom = rect.bottom;
    if (rect.right > window.innerWidth - pad) left = window.innerWidth - rect.width - pad;
    if (rect.left < pad) left = pad;
    this._container.style.left = `${Math.max(left, pad)}px`;
  }

  _closeAllDropdowns() {
    if (!this._container) return;
    const dropdowns = this._container.querySelectorAll('.swse-tool.dropdown.open');
    dropdowns.forEach(d => d.classList.remove('open'));
    this._openDropdown = null;
  }

  /* Toolbar behavior */
  async _handleAction(action, tool, event) {
    SWSELogger.log(`SWSE | Canvas UI Action: ${action}`, tool?.id);

    switch (action) {
      case 'quickRoll':
        return this._quickRoll();
      case 'chatCommand':
        return this._executeChatCommand(event);
      case 'applyCondition':
        return this._applyCondition(event);
      case 'selectFriendly':
      case 'selectHostile':
      case 'selectCombat':
      case 'clearSelection':
        return this._selectTokens(action.replace('select', '').toLowerCase());
      case 'rest':
        return this._rest();
      case 'measureDistance':
        return this._measureDistance();
      default:
        SWSELogger.warn(`SWSE | Unknown canvas UI action: ${action}`);
    }
  }

  /* Tool implementations */
  async _quickRoll() {
    const content = `
      <form>
        <div class="form-group">
          <label>Roll Formula</label>
          <input type="text" name="formula" value="1d20" placeholder="1d20" />
        </div>
        <div class="form-group">
          <label>Modifier</label>
          <input type="number" name="modifier" value="0" />
        </div>
        <div class="form-group">
          <label>Label (optional)</label>
          <input type="text" name="label" placeholder="Quick Roll" />
        </div>
      </form>
    `;

    await SWSEDialogHelper.show({
      title: 'Quick Roll',
      content,
      buttons: {
        roll: {
          icon: '<i class="fas fa-dice-d20"></i>',
          label: 'Roll',
          callback: async (html) => {
            const formula = html.find('[name="formula"]').val();
            const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
            const label = html.find('[name="label"]').val() || 'Quick Roll';
            const rollFormula = modifier !== 0 ? `${formula} + ${modifier}` : formula;
            const roll = new Roll(rollFormula);
            await roll.evaluate({async: true});
            await roll.toMessage({ speaker: ChatMessage.getSpeaker(), flavor: label });
          }
        },
        cancel: { icon: '<i class="fas fa-times"></i>', label: 'Cancel' }
      },
      default: 'roll',
      options: { width: 420 }
    });
  }

  async _executeChatCommand(event) {
    // The dropdown item attaches data-command
    const trigger = event.target.closest('[data-command]');
    const command = trigger?.getAttribute('data-command');
    if (!command) return;

    // Try to find the chat input in multiple places
    const selectors = ['#chat-message', 'textarea.chat-input', 'input#chat-message'];
    let chatInput = null;
    for (const s of selectors) {
      chatInput = document.querySelector(s);
      if (chatInput) break;
    }

    if (chatInput) {
      chatInput.value = command;
      chatInput.focus();
      // Trigger Foundry's chat input update if present
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Fallback: create a ChatMessage with the command as content (only when it is not a slash command)
    if (!command.startsWith('/')) {
      ChatMessage.create({ content: command });
    } else {
      // If it's a slash command and there's no chat input element, show a notification
      ui.notifications.warn('Chat input not available to paste the command.');
    }
  }

  async _applyCondition(event) {
    const trigger = event.target.closest('[data-condition]');
    const conditionValue = parseInt(trigger?.getAttribute('data-condition')) || 0;
    const conditionLabel = trigger?.textContent?.trim() || String(conditionValue);

    const controlled = canvas?.tokens?.controlled;
    if (!controlled || controlled.length === 0) {
      ui.notifications.warn('No tokens selected');
      return;
    }

    for (const token of controlled) {
      const actor = token.actor;
      if (!actor) continue;
      await actor.update({ 'system.condition': conditionValue });
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ token }), content: `<div class="swse-chat-card"><strong>${token.name}</strong> condition set to <strong>${conditionLabel}</strong></div>` });
    }

    ui.notifications.info(`Condition "${conditionLabel}" applied to ${controlled.length} token(s)`);
  }

  async _selectTokens(type) {
    if (!canvas?.ready) return;

    let tokens = [];
    if (type === 'friendly') {
      tokens = canvas.tokens.placeables.filter(t => (t.document?.disposition ?? t.disposition) === CONST.TOKEN_DISPOSITIONS.FRIENDLY);
    } else if (type === 'hostile') {
      tokens = canvas.tokens.placeables.filter(t => (t.document?.disposition ?? t.disposition) === CONST.TOKEN_DISPOSITIONS.HOSTILE);
    } else if (type === 'combat') {
      if (game.combat) {
        const combatantIds = game.combat.combatants.map(c => c.tokenId ?? c.token?.id ?? String(c.tokenId));
        tokens = canvas.tokens.placeables.filter(t => combatantIds.includes(t.id) || combatantIds.includes(`${canvas.scene?.id}.${t.id}`));
      }
    } else if (type === 'clear') {
      canvas.tokens.releaseAll();
      ui.notifications.info('Token selection cleared');
      return;
    }

    canvas.tokens.releaseAll();
    tokens.forEach(t => t.control({ releaseOthers: false }));
    ui.notifications.info(`Selected ${tokens.length} token(s)`);
  }

  async _rest() {
    const controlled = canvas?.tokens?.controlled;
    if (!controlled || controlled.length === 0) {
      ui.notifications.warn('No tokens selected');
      return;
    }

    for (const token of controlled) {
      const actor = token.actor;
      if (!actor) continue;
      await actor.update({ 'system.condition': 0 });
      ChatMessage.create({ speaker: ChatMessage.getSpeaker({ token }), content: `<div class="swse-chat-card"><strong>${token.name}</strong> has rested and recovered</div>` });
    }

    ui.notifications.info(`${controlled.length} token(s) have rested`);
  }

  async _measureDistance() {
    if (!canvas?.ready) return;
    // Foundry Ruler activation: ensure controls exist
    if (canvas.controls?.ruler) {
      canvas.controls.ruler.activate();
      ui.notifications.info('Distance measurement tool activated. Click and drag to measure.');
    } else if (canvas.controls) {
      // Fallback: attempt to set active tool to ruler via controls API
      try {
        canvas.controls.activeControl = 'ruler';
        ui.notifications.info('Distance measurement tool activated. Click and drag to measure.');
      } catch (err) {
        SWSELogger.warn('Could not activate ruler tool', err);
        ui.notifications.warn('Distance measurement not available');
      }
    }
  }

  /* Toolbar data copied & ported (same structure as original but safe) */
  _getToolbarData() {
    return {
      tools: [
        { id: 'roll', icon: 'fas fa-dice-d20', title: 'Quick Roll', action: 'quickRoll', type: 'button' },
        { id: 'chat-commands', icon: 'fas fa-terminal', title: 'Chat', action: 'chatCommands', type: 'dropdown', commands: [ { label: 'Initiative', command: '/roll 1d20 + @dex' }, { label: 'Skill Check', command: '/roll 1d20' }, { label: 'Attack Roll', command: '/roll 1d20' }, { label: 'Damage', command: '/roll' }, { label: 'Force Power', command: '/roll 1d20 + @utf' } ] },
        { id: 'conditions', icon: 'fas fa-heart-pulse', title: 'Apply Condition', action: 'applyCondition', type: 'dropdown', conditions: [ { id: 'normal', label: 'Normal', value: 0 }, { id: 'wounded', label: 'Wounded', value: -1 }, { id: 'disabled', label: 'Disabled', value: -5 }, { id: 'dying', label: 'Dying', value: -10 }, { id: 'dead', label: 'Dead', value: -15 } ] },
        { id: 'token-select', icon: 'fas fa-users', title: 'Token Selection', action: 'tokenSelect', type: 'dropdown', options: [ { label: 'Select All Friendly', action: 'selectFriendly' }, { label: 'Select All Hostile', action: 'selectHostile' }, { label: 'Select All in Combat', action: 'selectCombat' }, { label: 'Clear Selection', action: 'clearSelection' } ] },
        { id: 'rest', icon: 'fas fa-bed', title: 'Rest', action: 'rest', type: 'button' },
        { id: 'distance', icon: 'fas fa-ruler', title: 'Measure Distance', action: 'measureDistance', type: 'button' }
      ]
    };
  }
}

export class CanvasUIManager {
  static toolbar = null;

  static initialize() {
    SWSELogger.log('SWSE | Initializing Canvas UI Manager (Forge-safe)');

    // Respect Forge: allow enabling via setting; default to enabled for maximum compatibility
    const forgeActive = game.modules?.get('forgevtt')?.active;
    const forceEnable = game.settings?.get?.('swse', 'canvasToolbarOnForge');
    if (forgeActive && !forceEnable) {
      SWSELogger.log('SWSE | Forge detected - using Forge-safe toolbar placement (app-style)');
      // We still initialize; the toolbar is appended to document.body and is safe for Forge.
    }

    Hooks.on('canvasReady', () => this.renderToolbar());
    Hooks.on('canvasResize', () => this.renderToolbar());
  }

  static renderToolbar() {
    this.removeToolbar();
    this.toolbar = new SWSECanvasToolbar();
    this.toolbar.render();
    SWSELogger.log('SWSE | Canvas toolbar rendered (new implementation)');
  }

  static removeToolbar() {
    if (this.toolbar) {
      this.toolbar.close();
      this.toolbar = null;
    }
  }
}

// --- Fail-safe Chatbox Clamp ---
Hooks.on('renderChatLog', () => {
  const fixChatbox = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const chat = sidebar.querySelector('#chat');
    if (!chat) return;
    chat.style.marginTop = '0px';
    chat.style.paddingTop = '0px';
  };
  setInterval(fixChatbox, 500);
});
