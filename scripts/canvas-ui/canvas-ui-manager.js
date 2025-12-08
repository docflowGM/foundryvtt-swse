import { ProgressionEngine } from "./scripts/progression/engine/progression-engine.js";
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
            const roll = globalThis.SWSE.RollEngine.safeRoll(rollFormula);
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
// AUTO-CONVERT: confidence=0.00
// TODO: manual migration required. Original: await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue });
globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue }); */

await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue });
globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue }); */

/* ORIGINAL (for review): await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue });
globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': conditionValue }); */
 */
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
// AUTO-CONVERT: confidence=0.00
// TODO: manual migration required. Original: await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 });
globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 }); */

await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 });
globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 }); */

/* ORIGINAL (for review): await // AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 });
globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, { 'system.condition': 0 }); */
 */
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
        // AUTO-GENERATED: merged UI CSS injected by script
        const EXISTING = document.getElementById('swse-merged-ui-style');
        if (!EXISTING) {
            const style = document.createElement('style');
            style.id = 'swse-merged-ui-style';
            style.textContent = `/* From styles/canvas/canvas-ui.css */
/* SWSE Canvas UI Toolbar */
#swse-canvas-toolbar {
    z-index: 100;
    pointer-events: none;
}

#swse-canvas-toolbar .toolbar-container {
    background: rgba(0, 0, 0, 0.85);
    border: 2px solid var(--color-border-dark-primary, #444);
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    min-width: 60px;
    transition: all 0.3s ease;
}

#swse-canvas-toolbar.collapsed .toolbar-container {
}

#swse-canvas-toolbar .toolbar-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 8px 4px;
    color: #ffd700;
    font-weight: bold;
    font-size: 12px;
    letter-spacing: 1px;
}

#swse-canvas-toolbar .toolbar-header i {
    font-size: 16px;
}

#swse-canvas-toolbar .toolbar-tools {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px 0;
}

#swse-canvas-toolbar .swse-tool {
}

#swse-canvas-toolbar .swse-tool button {
    width: 100%;
    min-height: 44px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 8px;
    transition: all 0.2s ease;
    font-size: 11px;
}

#swse-canvas-toolbar .swse-tool button:hover {
    background: rgba(255, 215, 0, 0.2);
    border-color: rgba(255, 215, 0, 0.5);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

#swse-canvas-toolbar .swse-tool button:active {
    background: rgba(255, 215, 0, 0.3);
}

#swse-canvas-toolbar .swse-tool button i {
    font-size: 18px;
    line-height: 1;
}

#swse-canvas-toolbar .swse-tool .tool-label {
    font-size: 9px;
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Dropdown styles */
#swse-canvas-toolbar .swse-tool.dropdown {
}

#swse-canvas-toolbar .swse-tool.dropdown .dropdown-arrow {
    font-size: 10px;
    transition: transform 0.2s ease;
}

#swse-canvas-toolbar .swse-tool.dropdown.open .dropdown-arrow {
}

#swse-canvas-toolbar .dropdown-menu {
    display: none;
    background: rgba(0, 0, 0, 0.95);
    border: 1px solid rgba(255, 215, 0, 0.5);
    border-radius: 6px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    min-width: 180px;
    max-width: 250px;
    z-index: 1000;
    overflow: hidden;
}

#swse-canvas-toolbar .swse-tool.dropdown.open .dropdown-menu {
    display: block;
    animation: slideInRight 0.2s ease;
}

@keyframes slideInRight {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

#swse-canvas-toolbar .dropdown-item {
    padding: 10px 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #fff;
    font-size: 12px;
}

#swse-canvas-toolbar .dropdown-item:last-child {
}

#swse-canvas-toolbar .dropdown-item:hover {
    background: rgba(255, 215, 0, 0.2);
    border-color: rgba(255, 215, 0, 0.3);
}

#swse-canvas-toolbar .dropdown-item span {
    display: block;
}

/* Toolbar toggle button */
#swse-canvas-toolbar .toolbar-toggle {
}

#swse-canvas-toolbar .toolbar-toggle button {
    width: 100%;
    height: 32px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

#swse-canvas-toolbar .toolbar-toggle button:hover {
    background: rgba(255, 215, 0, 0.2);
    border-color: rgba(255, 215, 0, 0.5);
}

#swse-canvas-toolbar.collapsed .toolbar-toggle button i {
}

/* Mobile responsive */
@media (max-width: 768px) {
    #swse-canvas-toolbar {
    }

    #swse-canvas-toolbar .toolbar-container {
        min-width: 50px;
        padding: 6px;
    }

    #swse-canvas-toolbar .swse-tool button {
        min-height: 40px;
        padding: 5px 6px;
    }

    #swse-canvas-toolbar .swse-tool button i {
        font-size: 16px;
    }

    #swse-canvas-toolbar .swse-tool .tool-label {
        font-size: 8px;
    }

    #swse-canvas-toolbar .dropdown-menu {
        min-width: 150px;
    }
}

/* Animation for initial load */
@keyframes toolbarFadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

#swse-canvas-toolbar {
    animation: toolbarFadeIn 0.3s ease;
}

/* Quick roll dialog styling */
.swse-chat-card {
    padding: 8px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
}

.swse-chat-card strong {
    color: var(--color-text-dark-primary, #000);
}

/* From styles/foundry/swse-ui-fix.css */
/* ==========================================
   SWSE UI Fix - Foundry V13 Compatible
   ==========================================
   Fixes layout issues without conflicting with core positioning
   - Forge VTT compatibility fixes
   - Restore Foundry default UI behavior
   - Fix window dragging and positioning
   - Prevent windows from rendering off-screen
*/

/* Wrap all fixes in the system layer for V13 CSS cascade layer compatibility */
@layer system {

/* ============================================
   CSS CUSTOM PROPERTIES (Safe to define)
   ============================================ */
:root {
    --swse-primary: #ffd700;
    --swse-background: rgba(0, 0, 0, 0.8);
    --swse-border: rgba(255, 215, 0, 0.3);

    /* Reference Foundry's variables where possible */
    --swse-sidebar-width: var(--sidebar-width, 300px);
    --swse-nav-height: var(--navigation-height, 32px);
    --swse-controls-width: 80px;
}

/* ============================================
   RESET PROBLEMATIC POSITIONING
   Remove any rules that offset core UI elements
   Only apply minimal resets - let Foundry/Forge handle positioning
   ============================================ */

/* Foundry and Forge handle their own positioning */

/* Only ensure no unexpected transforms are applied by our system */
.swse {
}

/* ============================================
   FORGE VTT BODY/HTML RESETS
   ============================================ */
/* REMOVED: These aggressive resets were conflicting with Forge's UI */
/* Let Foundry and Forge handle their own layout */

/* ============================================
   WINDOW POSITIONING CONSTRAINTS
   ============================================ */
/* Restore window functionality: draggable headers, resizable edges, proper centering */
.window-app, .dialog {
  /* Only apply minimal constraints - let Foundry handle positioning */
  /* Don't override z-index, max-width, or max-height - Foundry handles these */
}

.window-app.minimized {
}

.window-header {
}

.window-resizable-handle {
}

.window-app .window-content {
}

/* Ensure SWSE-specific windows stay in bounds */
.window-app.swse {
    /* System styling - avoid position overrides */
    background: var(--swse-background);
    border: 1px solid var(--swse-border);
}

/* ============================================
   CONTEXT MENUS
   ============================================ */
/* Ensure context menus appear on top */
.context-menu {
}

/* ============================================
   MOBILE / RESPONSIVE
   ============================================ */
/* Mobile / narrow-screen adjustments */
@media (max-width: 600px) {
  .window-app {
  }
}

} /* End @layer system */

/* From styles/src/base/_foundry-fixes.scss */
// ============================================================================
// FOUNDRY VTT FIXES
// System-agnostic Foundry bug fixes (NOT scoped to .swse)
// These are necessary fixes for Foundry VTT issues
// ============================================================================

// ============================================
// ENHANCED SIDEBAR SPACE REMOVAL
// More specific selectors to override Foundry core
// ============================================

// Fix for Foundry v13/The Forge sidebar height bug
// Override broken height restrictions on sidebar tabs
#sidebar {
  // Ensure sidebar itself has proper display and sizing

  // Remove ALL top spacing from sidebar tabs
  .sidebar-tab[data-tab] {

    // Show active tab
    &.active {
    }

    &.directory {
    }

    // Specific fixes for chat tab
    &#chat {

      #chat-log {
      }

      #chat-controls {
      }

      #chat-form {
      }
    }
  }

  // Specific tab content areas - more explicit targeting
  #chat-log,
  .directory-list,
  #combat-tracker,
  #scenes .directory-list,
  #actors .directory-list,
  #items .directory-list,
  #journal .directory-list,
  #tables .directory-list,
  #cards .directory-list,
  #playlists .directory-list,
  #compendium .directory-list {
  }

  // Remove spacing from directory headers
  .directory-header,
  .directory-header.keep-collapsed {
  }

  // Ensure search filters don't add space
  .directory-list .directory-header input[type="search"] {
  }

  // Fix for sidebar tabs navigation
  nav.tabs {
  }
}

// ============================================
// LEFT TOOLBAR - REMOVE EDGE SPACING
// ============================================

#ui-left {
}

#controls {

  .scene-control,
  .control-tools {
  }

  // Remove any gaps in the control buttons themselves
  ol.control-tools {
  }

  .scene-control {
  }
}

// Add any other Foundry-specific fixes here as needed
// Keep this file minimal - only for fixing Foundry bugs`;
            document.head.appendChild(style);
        }
    
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
