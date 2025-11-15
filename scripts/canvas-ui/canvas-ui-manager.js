/**
 * Manages the canvas UI toolbar and tools for SWSE
 */
export class CanvasUIManager {
    static TOOLBAR_ID = 'swse-canvas-toolbar';
    static toolbar = null;

    /**
     * Initialize the canvas UI manager
     */
    static initialize() {
        console.log("SWSE | Initializing Canvas UI Manager");

        // Wait for canvas to be ready
        Hooks.on('canvasReady', () => {
            this.renderToolbar();
        });

        // Re-render on window resize
        Hooks.on('canvasResize', () => {
            this.renderToolbar();
        });

        // Setup event listeners
        this._setupEventListeners();
    }

    /**
     * Render the toolbar on the canvas
     */
    static async renderToolbar() {
        // Remove existing toolbar if present
        this.removeToolbar();

        // Render new toolbar
        const template = 'systems/swse/templates/canvas-ui/toolbar.hbs';
        const data = this._getToolbarData();
        const html = await renderTemplate(template, data);

        // Append to body
        $('body').append(html);
        this.toolbar = $(`#${this.TOOLBAR_ID}`);

        console.log("SWSE | Canvas toolbar rendered");
    }

    /**
     * Remove the toolbar from the canvas
     */
    static removeToolbar() {
        $(`#${this.TOOLBAR_ID}`).remove();
        this.toolbar = null;
    }

    /**
     * Get data for the toolbar template
     */
    static _getToolbarData() {
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
     * Setup event listeners for toolbar actions
     */
    static _setupEventListeners() {
        // Delegate click events
        $(document).on('click', '#swse-canvas-toolbar [data-action]', async (event) => {
            event.preventDefault();
            const action = $(event.currentTarget).data('action');
            const tool = $(event.currentTarget).data('tool');

            await this._handleAction(action, tool, event);
        });

        // Handle dropdown toggles
        $(document).on('click', '.swse-tool.dropdown > button', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const dropdown = $(event.currentTarget).closest('.swse-tool.dropdown');

            // Close other dropdowns
            $('.swse-tool.dropdown').not(dropdown).removeClass('open');

            // Toggle this dropdown
            dropdown.toggleClass('open');
        });

        // Close dropdowns when clicking outside
        $(document).on('click', (event) => {
            if (!$(event.target).closest('.swse-tool.dropdown').length) {
                $('.swse-tool.dropdown').removeClass('open');
            }
        });

        // Handle toolbar collapse
        $(document).on('click', '#swse-toolbar-collapse', (event) => {
            event.preventDefault();
            $(`#${this.TOOLBAR_ID}`).toggleClass('collapsed');
        });
    }

    /**
     * Handle toolbar actions
     */
    static async _handleAction(action, tool, event) {
        console.log(`SWSE | Canvas UI Action: ${action}`, tool);

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
                console.warn(`SWSE | Unknown canvas UI action: ${action}`);
        }

        // Close dropdown after action
        $('.swse-tool.dropdown').removeClass('open');
    }

    /**
     * Quick roll dialog
     */
    static async _quickRoll() {
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

        new Dialog({
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
            default: "roll"
        }).render(true);
    }

    /**
     * Execute a chat command
     */
    static async _executeChatCommand(event) {
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
    static async _applyCondition(event) {
        const conditionValue = parseInt($(event.currentTarget).data('condition'));
        const conditionLabel = $(event.currentTarget).text().trim();

        const controlled = canvas.tokens.controlled;
        if (controlled.length === 0) {
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
    static async _selectTokens(type) {
        if (!canvas.ready) return;

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
    static async _rest() {
        const controlled = canvas.tokens.controlled;
        if (controlled.length === 0) {
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

            // Restore all uses if the system tracks that
            // This would depend on your specific implementation

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
    static async _measureDistance() {
        if (!canvas.ready) return;

        // Activate the ruler tool
        canvas.controls.ruler.activate();
        ui.notifications.info("Distance measurement tool activated. Click and drag to measure.");
    }
}
