// Canvas UI Manager - consolidated, Forge-safe, and robust
import { SWSELogger } from '../utils/logger.js';
import SWSEDialogHelper from '../helpers/swse-dialog-helper.js';

const STYLE_ID = 'swse-canvas-toolbar-style-v2';

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
    this._onDocumentKeyDown = this._onDocumentKeyDown.bind(this);
  }

  /* Public lifecycle */
  render() {
    if (this._container) {
      this._renderContents();
      return;
    }

    this._injectStyles();

    this._container = document.createElement('div');
    this._container.className = 'swse-canvas-toolbar hud swse-canvas-toolbar--fixed';
    this._container.setAttribute('data-swse-toolbar', 'true');

    Object.assign(this._container.style, {
      position: 'fixed',
      zIndex: 2000,
      width: `${this.options.width}px`,
      bottom: this.options.position.bottom,
      left: this.options.position.left,
      pointerEvents: 'auto'
    });

    document.body.appendChild(this._container);

    this._renderContents();

    window.addEventListener('pointerdown', this._onWindowPointerDown, { capture: true });
    window.addEventListener('resize', this._onWindowResize);
    document.addEventListener('keydown', this._onDocumentKeyDown);
    // Keep toolbar safely inside the viewport initially
    this._keepInViewport();
  }

  close() {
    if (!this._container) return;
    window.removeEventListener('pointerdown', this._onWindowPointerDown, { capture: true });
    window.removeEventListener('resize', this._onWindowResize);
    document.removeEventListener('keydown', this._onDocumentKeyDown);
    this._container.remove();
    this._container = null;
    this._openDropdown = null;
  }

  _injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    // Consolidated CSS for UI fixes and toolbar - safe, namespaced and minimal overrides
    const css = `
/* SWSE consolidated UI fixes + toolbar (namespaced) */
@layer swse-system {
  :root {
    --swse-primary: #ffd700;
    --swse-background: rgba(0,0,0,0.8);
    --swse-border: rgba(255,215,0,0.22);
    --swse-sidebar-width: var(--sidebar-width, 300px);
    --swse-nav-height: var(--navigation-height, 32px);
    --swse-controls-width: 80px;
  }

  /* Minimal safe resets for system elements only */
  .swse { transform: none !important; }

  /* Keep context menus on top */
  .context-menu { position: fixed !important; z-index: 10000 !important; }

  /* Window helpers - don't override Foundry core layout, just make draggable headers usable */
  .window-app.swse { background: var(--swse-background); border: 1px solid var(--swse-border); }
  .window-app .window-header { cursor: move; }
  .window-app .window-content { overflow: auto; }

  /* Toolbar styling (component-specific) */
  .swse-canvas-toolbar--fixed.swse-canvas-toolbar {
    font-family: var(--font-family, Signika, sans-serif);
    background: rgba(22,22,22,0.88);
    color: #eee;
    border-radius: 10px;
    padding: 6px;
    box-shadow: 0 6px 18px rgba(0,0,0,0.6);
    --swse-button-size: 36px;
  }
  .swse-canvas-toolbar .swse-toolbar-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .swse-canvas-toolbar .swse-tool {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--swse-button-size);
    height: var(--swse-button-size);
    border-radius: 6px;
    background: rgba(255,255,255,0.04);
    cursor: pointer;
    user-select: none;
  }
  .swse-canvas-toolbar .swse-tool:active{ transform: translateY(1px); }
  .swse-canvas-toolbar .swse-tool .fa { pointer-events: none; }
  .swse-canvas-toolbar .swse-tool.dropdown { position: relative; }
  .swse-canvas-toolbar .swse-tool.dropdown .dropdown-panel {
    position: absolute;
    left: 0;
    top: calc(var(--swse-button-size) + 8px);
    min-width: 200px;
    max-height: 320px;
    overflow: auto;
    background: rgba(12,12,12,0.96);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.6);
    padding: 6px;
    display: none;
    z-index: 2100;
  }
  .swse-canvas-toolbar .swse-tool.dropdown.open .dropdown-panel { display: block; }
  .swse-canvas-toolbar .dropdown-item {
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
  }
  .swse-canvas-toolbar .dropdown-item:hover { background: rgba(255,255,255,0.03); }
  .swse-canvas-toolbar .swse-toolbar-spacer { flex: 1; }
  .swse-canvas-toolbar .swse-collapse { position: absolute; right: 8px; top: 6px; font-size: 12px; opacity: 0.7; cursor: pointer; }
  .swse-canvas-toolbar .swse-label { margin-left: 8px; font-size: 12px; opacity: 0.9; }

  /* Responsive */
  @media (max-width: 768px) {
    .swse-canvas-toolbar { right: 5px; }
    .swse-canvas-toolbar .swse-tool { min-height: 40px; }
  }
}

/* Ensure the toolbar does not block pointer-events globally */
.swse-canvas-toolbar { pointer-events: auto; }
`;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  _renderContents() {
    if (!this._container) return;

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

      const icon = document.createElement('i');
      icon.className = tool.icon || 'fas fa-question';
      el.appendChild(icon);

      if (tool.type === 'dropdown') {
        const panel = document.createElement('div');
        panel.className = 'dropdown-panel';

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

        const label = document.createElement('span');
        label.className = 'swse-label';
        label.textContent = tool.title || '';
        el.appendChild(label);
      } else {
        el.setAttribute('data-action', tool.action);
        if (tool.title && tool.type !== 'button-compact') {
          const label = document.createElement('span');
          label.className = 'swse-label';
          label.textContent = tool.title;
          el.appendChild(label);
        }
      }

      el.addEventListener('click', (ev) => this._onToolClick(ev, tool));
      row.appendChild(el);
    }

    const collapse = document.createElement('div');
    collapse.className = 'swse-collapse';
    collapse.title = 'Collapse toolbar';
    collapse.textContent = '▾';
    collapse.addEventListener('click', (e) => {
      e.stopPropagation();
      this._container.classList.toggle('collapsed');
      if (this._container.classList.contains('collapsed')) {
        this._container.style.width = '48px';
      } else {
        this._container.style.width = `${this.options.width}px`;
      }
      this._keepInViewport();
    });

    this._container.appendChild(row);
    this._container.appendChild(collapse);
  }

  /* Event routing */
  _onToolClick(event, tool) {
    event.stopPropagation();
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
    if (!this._container) return;
    if (!this._container.contains(ev.target)) {
      this._closeAllDropdowns();
    }
  }

  _onWindowResize() {
    this._keepInViewport();
  }

  _onDocumentKeyDown(ev) {
    // close dropdowns on Escape
    if (ev.key === 'Escape') this._closeAllDropdowns();
  }

  _closeAllDropdowns() {
    if (!this._container) return;
    const dropdowns = this._container.querySelectorAll('.swse-tool.dropdown.open');
    dropdowns.forEach(d => d.classList.remove('open'));
    this._openDropdown = null;
  }

  _keepInViewport() {
    if (!this._container) return;
    const rect = this._container.getBoundingClientRect();
    const pad = 8;
    let left = rect.left;
    let bottom = rect.bottom;
    if (rect.right > window.innerWidth - pad) left = Math.max(pad, window.innerWidth - rect.width - pad);
    if (rect.left < pad) left = pad;
    this._container.style.left = `${Math.max(left, pad)}px`;
  }

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
    const trigger = event.target.closest('[data-command]');
    const command = trigger?.getAttribute('data-command');
    if (!command) return;

    const selectors = ['#chat-message', 'textarea.chat-input', 'input#chat-message'];
    let chatInput = null;
    for (const s of selectors) {
      chatInput = document.querySelector(s);
      if (chatInput) break;
    }

    if (chatInput) {
      chatInput.value = command;
      chatInput.focus();
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (!command.startsWith('/')) {
      ChatMessage.create({ content: command });
    } else {
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
    if (canvas.controls?.ruler) {
      canvas.controls.ruler.activate();
      ui.notifications.info('Distance measurement tool activated. Click and drag to measure.');
    } else if (canvas.controls) {
      try {
        canvas.controls.activeControl = 'ruler';
        ui.notifications.info('Distance measurement tool activated. Click and drag to measure.');
      } catch (err) {
        SWSELogger.warn('Could not activate ruler tool', err);
        ui.notifications.warn('Distance measurement not available');
      }
    }
  }

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

    // Ensure the canvasToolbarOnForge setting exists (guard against missing registration)
    let forgeSetting = true;
    try {
      // If setting is registered, read it; otherwise default to true.
      if (game.settings && game.settings.get) {
        forgeSetting = game.settings.get('swse', 'canvasToolbarOnForge');
      }
    } catch (err) {
      // Setting missing or access error - register a client fallback if possible
      try {
        game.settings.register('swse', 'canvasToolbarOnForge', {
          name: 'SWSE.Settings.CanvasToolbarOnForge.Name',
          hint: 'SWSE.Settings.CanvasToolbarOnForge.Hint',
          scope: 'client',
          config: true,
          type: Boolean,
          default: true
        });
        forgeSetting = game.settings.get('swse', 'canvasToolbarOnForge');
      } catch (e) {
        // Can't register here (permission or duplicate) - just assume true and continue
        SWSELogger.warn("SWSE | Could not verify or register 'canvasToolbarOnForge' setting, using default=true.", e);
        forgeSetting = true;
      }
    }

    // Initialize when canvas is ready; safe rendering on resize too
    Hooks.on('canvasReady', () => this.renderToolbar());
    Hooks.on('canvasResize', () => this.renderToolbar());

    // Also render when the scene becomes active (keep toolbar present on scene change)
    Hooks.on('renderScene', () => this.renderToolbar());
  }

  static renderToolbar() {
    try {
      this.removeToolbar();
      this.toolbar = new SWSECanvasToolbar();
      this.toolbar.render();
      SWSELogger.log('SWSE | Canvas toolbar rendered (new implementation)');
    } catch (err) {
      SWSELogger.error('SWSE | Failed to render canvas toolbar', err);
    }
  }

  static removeToolbar() {
    if (this.toolbar) {
      try { this.toolbar.close(); } catch (e) { /* ignore */ }
      this.toolbar = null;
    }
  }
}

/* Fail-safe Chatbox Clamp (kept minimal) */
Hooks.on('renderChatLog', () => {
  const fixChatbox = () => {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const chat = sidebar.querySelector('#chat');
    if (!chat) return;
    chat.style.marginTop = '0px';
    chat.style.paddingTop = '0px';
  };
  // Run once after render and again shortly after to counter timing quirks.
  setTimeout(fixChatbox, 200);
  setTimeout(fixChatbox, 800);
});
