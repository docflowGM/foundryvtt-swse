import { SWSELogger } from '../utils/logger.js';
import SWSEApplication from '../apps/base/swse-application.js';
import SWSEDialogHelper from '../helpers/swse-dialog-helper.js';

/**
 * Canvas Toolbar Application
 * Renders as a non-popout UI element on the canvas
 */
class SWSECanvasToolbar extends SWSEApplication {
    constructor(options = {}) {
        super(options);
        this.tools = this._getToolbarData().tools;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: 'swse-canvas-toolbar',
            template: 'systems/swse/templates/canvas-ui/toolbar.hbs',
            popOut: false,  // Don't make it a window
            classes: ['swse', 'swse-canvas-toolbar'],
            minimizable: false,
            resizable: false,
            // Don't use standard window positioning for non-popout
            left: null,
            top: null
        });
    }

    /**
     * Get data for the toolbar template
     */
    getData(options = {}) {
        return this._getToolbarData();
    }

    /**
     * Get toolbar configuration data
     */
    _getToolbarData() {
        return {
            tools: [
                {
                    id: 'roll',
                    icon: 'fas fa-dice-d20',
                    title: 'Quick Roll',
                    action: 'quickRoll',
                    type: 'button'
                },
                {
                    id: 'chat-commands',
                    icon: 'fas fa-terminal',
                    title: 'Chat Commands',
                    action: 'chatCommands',
                    type: 'dropdown',
                    commands: [
                        { label: 'Initiative', command: '/roll 1d20 + @dex' },
                        { label: 'Skill Check', command: '/roll 1d20' },
                        { label: 'Attack Roll', command: '/roll 1d20' },
                        { label: 'Damage', command: '/roll' },
                        { label: 'Force Power', command: '/roll 1d20 + @utf' }
                    ]
                },
                {
                    id: 'conditions',
                    icon: 'fas fa-heart-pulse',
                    title: 'Apply Condition',
                    action: 'applyCondition',
                    type: 'dropdown',
                    conditions: [
                        { id: 'normal', label: 'Normal', value: 0 },
                        { id: 'wounded', label: 'Wounded', value: -1 },
                        { id: 'disabled', label: 'Disabled', value: -5 },
                        { id: 'dying', label: 'Dying', value: -10 },
                        { id: 'dead', label: 'Dead', value: -15 }
                    ]
                },
                {
                    id: 'token-select',
                    icon: 'fas fa-users',
                    title: 'Token Selection',
                    action: 'tokenSelect',
                    type: 'dropdown',
                    options: [
                        { label: 'Select All Friendly', action: 'selectFriendly' },
                        { label: 'Select All Hostile', action: 'selectHostile' },
                        { label: 'Select All in Combat', action: 'selectCombat' },
                        { label: 'Clear Selection', action: 'clearSelection' }
                    ]
                },
                {
                    id: 'rest',
                    icon: 'fas fa-bed',
                    title: 'Rest',
                    action: 'rest',
                    type: 'button'
                },
                {
                    id: 'distance',
                    icon: 'fas fa-ruler',
                    title: 'Measure Distance',
                    action: 'measureDistance',
                    type: 'button'
                }
            ]
        };
    }

    /**
     * Activate event listeners - scoped to this element only
     */
    activateListeners(html) {
        super.activateListeners(html);

        // Delegate click events (scoped to toolbar, not document)
        html.on('click', '[data-action]', this._onToolbarAction.bind(this));

        // Handle dropdown toggles
        html.on('click', '.swse-tool.dropdown > button', this._onDropdownToggle.bind(this));

        // Handle toolbar collapse
        html.on('click', '#swse-toolbar-collapse', this._onToolbarCollapse.bind(this));

        // Close dropdowns when clicking outside (use document, but check scope)
        $(document).on('click.swse-toolbar', (event) => {
            if (!$(event.target).closest('.swse-tool.dropdown').length) {
                html.find('.swse-tool.dropdown').removeClass('open');
            }
        });
    }

    /**
     * Clean up event listeners on close
     */
    close(options = {}) {
        $(document).off('click.swse-toolbar');
        return super.close(options);
    }

    /**
     * Handle dropdown toggle
     */
    _onDropdownToggle(event) {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = $(event.currentTarget).closest('.swse-tool.dropdown');
        const html = this.element;

        // Close other dropdowns
        html.find('.swse-tool.dropdown').not(dropdown).removeClass('open');

        // Toggle this dropdown
        dropdown.toggleClass('open');
    }

    /**
     * Handle toolbar collapse
     */
    _onToolbarCollapse(event) {
        event.preventDefault();
        this.element.toggleClass('collapsed');
    }

    /**
     * Handle toolbar action clicks
     */
    async _onToolbarAction(event) {
        event.preventDefault();
        const action = $(event.currentTarget).data('action');
        const tool = $(event.currentTarget).data('tool');

        await this._handleAction(action, tool, event);

        // Close dropdown after action
        this.element.find('.swse-tool.dropdown').removeClass('open');
    }

    /**
     * Handle toolbar actions
     */
    async _handleAction(action, tool, event) {
        SWSELogger.log(`SWSE | Canvas UI Action: ${action}`, tool);

        switch(action) {
            case 'quickRoll':
                await this._quickRoll();
                break;
            case 'chatCommand':
                await this._executeChatCommand(event);
                break;
            case 'applyCondition':
                await this._applyCondition(event);
                break;
            case 'selectFriendly':
                await this._selectTokens('friendly');
                break;
            case 'selectHostile':
                await this._selectTokens('hostile');
                break;
            case 'selectCombat':
                await this._selectTokens('combat');
                break;
            case 'clearSelection':
                await this._selectTokens('clear');
                break;
            case 'rest':
                await this._rest();
                break;
            case 'measureDistance':
                await this._measureDistance();
                break;
            default:
                SWSELogger.warn(`SWSE | Unknown canvas UI action: ${action}`);
        }
    }

    /**
     * Quick roll dialog with proper positioning
     */
    async _quickRoll() {
        const content = `
            <form>
                <div class="form-group">
                    <label>Roll Formula</label>
                    <input type="text" name="formula" value="1d20" placeholder="1d20" autofocus />
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
            title: "Quick Roll",
            content: content,
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice-d20"></i>',
                    label: "Roll",
                    callback: async (html) => {
                        const formula = html.find('[name="formula"]').val();
                        const modifier = parseInt(html.find('[name="modifier"]').val()) || 0;
                        const label = html.find('[name="label"]').val() || 'Quick Roll';

                        const rollFormula = modifier !== 0
                            ? `${formula} + ${modifier}`
                            : formula;

                        const roll = new Roll(rollFormula);
                        await roll.evaluate();

                        await roll.toMessage({
                            speaker: ChatMessage.getSpeaker(),
                            flavor: label
                        });
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            },
            default: "roll",
            options: { width: 400 }
        });
    }

    /**
     * Execute a chat command
     */
    async _executeChatCommand(event) {
        const command = $(event.currentTarget).data('command');
        if (!command) return;

        // Insert command into chat input
        const chatInput = $('#chat-message');
        chatInput.val(command);
        chatInput.focus();
    }

    /**
     * Apply condition to selected tokens
     */
    async _applyCondition(event) {
        const conditionValue = parseInt($(event.currentTarget).data('condition'));
        const conditionLabel = $(event.currentTarget).text().trim();

        const controlled = canvas?.tokens?.controlled;
        if (!controlled || controlled.length === 0) {
            ui.notifications.warn("No tokens selected");
            return;
        }

        for (let token of controlled) {
            const actor = token.actor;
            if (!actor) continue;

            // Update condition track
            await actor.update({
                'system.condition': conditionValue
            });

            // Send chat message
            ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ token }),
                content: `<div class="swse-chat-card">
                    <strong>${token.name}</strong> condition set to <strong>${conditionLabel}</strong>
                </div>`
            });
        }

        ui.notifications.info(`Condition "${conditionLabel}" applied to ${controlled.length} token(s)`);
    }

    /**
     * Select tokens based on criteria
     */
    async _selectTokens(type) {
        if (!canvas?.ready) return;

        let tokens = [];

        switch(type) {
            case 'friendly':
                tokens = canvas.tokens.placeables.filter(t =>
                    t.document.disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY
                );
                break;
            case 'hostile':
                tokens = canvas.tokens.placeables.filter(t =>
                    t.document.disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE
                );
                break;
            case 'combat':
                if (game.combat) {
                    const combatantIds = game.combat.combatants.map(c => c.tokenId);
                    tokens = canvas.tokens.placeables.filter(t =>
                        combatantIds.includes(t.id)
                    );
                }
                break;
            case 'clear':
                canvas.tokens.releaseAll();
                ui.notifications.info("Token selection cleared");
                return;
        }

        // Release current selection and control new tokens
        canvas.tokens.releaseAll();
        tokens.forEach(t => t.control({ releaseOthers: false }));

        ui.notifications.info(`Selected ${tokens.length} token(s)`);
    }

    /**
     * Rest selected tokens
     */
    async _rest() {
        const controlled = canvas?.tokens?.controlled;
        if (!controlled || controlled.length === 0) {
            ui.notifications.warn("No tokens selected");
            return;
        }

        for (let token of controlled) {
            const actor = token.actor;
            if (!actor) continue;

            // Restore to normal condition
            await actor.update({
                'system.condition': 0
            });

            ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ token }),
                content: `<div class="swse-chat-card">
                    <strong>${token.name}</strong> has rested and recovered
                </div>`
            });
        }

        ui.notifications.info(`${controlled.length} token(s) have rested`);
    }

    /**
     * Activate distance measurement tool
     */
    async _measureDistance() {
        if (!canvas?.ready) return;

        // Activate the ruler tool
        canvas.controls.ruler.activate();
        ui.notifications.info("Distance measurement tool activated. Click and drag to measure.");
    }
}

/**
 * Manages the canvas UI toolbar and tools for SWSE
 */
export class CanvasUIManager {
    static toolbar = null;

    /**
     * Initialize the canvas UI manager
     */
    static initialize() {
        SWSELogger.log("SWSE | Initializing Canvas UI Manager");

        // Check if we should render the toolbar (disabled on Forge by default)
        const forgeActive = game.modules?.get('forgevtt')?.active;
        if (forgeActive) {
            SWSELogger.log("SWSE | Forge detected - Canvas UI toolbar disabled to prevent conflicts");
            SWSELogger.log("SWSE | Enable 'Show Canvas Toolbar on Forge' setting if you want the SWSE toolbar");

            // Check if there's a setting to override (for future use)
            const forceEnable = game.settings?.get?.("swse", "canvasToolbarOnForge");
            if (!forceEnable) {
                return; // Don't initialize on Forge unless explicitly enabled
            }
        }

        // Wait for canvas to be ready
        Hooks.on('canvasReady', () => {
            this.renderToolbar();
        });

        // Re-render on window resize
        Hooks.on('canvasResize', () => {
            this.renderToolbar();
        });
    }

    /**
     * Render the toolbar on the canvas
     */
    static async renderToolbar() {
        // Remove existing toolbar if present
        this.removeToolbar();

        // Create and render new toolbar
        this.toolbar = new SWSECanvasToolbar();
        this.toolbar.render(true);

        SWSELogger.log("SWSE | Canvas toolbar rendered");
    }

    /**
     * Remove the toolbar from the canvas
     */
    static removeToolbar() {
        if (this.toolbar) {
            this.toolbar.close();
            this.toolbar = null;
        }
    }
}
