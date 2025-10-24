/**
 * SWSE Character Sheet - Condition Button Handler
 * Automatically updates affected values when condition changes
 */

export class SWSECharacterSheetHandlers {
    
    /**
     * Activate condition button listeners
     * @param {HTMLElement} html - The sheet HTML
     * @param {Actor} actor - The actor being edited
     */
    static activateConditionButtons(html, actor) {
        html.find('.condition-btn').click(async (event) => {
            event.preventDefault();
            const button = $(event.currentTarget);
            const condition = button.data('condition');
            
            // Update the hidden input
            html.find('input[name="system.condition"]').val(condition);
            
            // Update active state
            html.find('.condition-btn').removeClass('active');
            button.addClass('active');
            
            // Update the actor
            await actor.update({
                'system.condition': condition
            });
            
            // Apply condition penalties automatically
            SWSECharacterSheetHandlers.applyConditionPenalties(actor, condition);
            
            ui.notifications.info(`Condition set to: ${SWSECharacterSheetHandlers.getConditionLabel(condition)}`);
        });
    }
    
    /**
     * Get human-readable condition label
     * @param {string} condition - The condition value
     * @returns {string} - The readable label
     */
    static getConditionLabel(condition) {
        const labels = {
            'normal': 'Normal',
            '-2': '-2 penalty',
            '-5': '-5 penalty',
            '-10': '-10 penalty',
            'debilitated': 'Debilitated',
            'persistent': 'Persistent'
        };
        return labels[condition] || condition;
    }
    
    /**
     * Apply condition penalties to rolls and stats
     * @param {Actor} actor - The actor
     * @param {string} condition - The condition value
     */
    static applyConditionPenalties(actor, condition) {
        // This method can be expanded to automatically apply penalties
        // to attack rolls, skill checks, etc.
        
        let penalty = 0;
        
        switch(condition) {
            case '-2':
                penalty = -2;
                break;
            case '-5':
                penalty = -5;
                break;
            case '-10':
                penalty = -10;
                break;
            case 'debilitated':
                // Debilitated: Can only take swift actions
                penalty = -10; // Or apply special restrictions
                break;
            case 'persistent':
                // Persistent condition: doesn't go away automatically
                penalty = -5; // Or whatever your system defines
                break;
            default:
                penalty = 0;
        }
        
        // Store the penalty for use in roll calculations
        if (actor.system.conditionPenalty !== penalty) {
            actor.update({
                'system.conditionPenalty': penalty
            });
        }
    }
    
    /**
     * Auto-calculate defense values when inputs change
     * @param {HTMLElement} html - The sheet HTML
     * @param {Actor} actor - The actor being edited
     */
    static activateDefenseCalculations(html, actor) {
        // Listen for changes to defense inputs
        html.find('.defense-input-sm, .defense-select-sm').change(async (event) => {
            const defenseType = $(event.currentTarget).closest('.defense-table-row').data('defense');
            
            if (defenseType) {
                await SWSECharacterSheetHandlers.recalculateDefense(actor, defenseType);
            }
        });
    }
    
    /**
     * Recalculate a specific defense
     * @param {Actor} actor - The actor
     * @param {string} defenseType - The defense to recalculate (reflex, fortitude, will)
     */
    static async recalculateDefense(actor, defenseType) {
        const defense = actor.system.defenses[defenseType];
        
        if (!defense) return;
        
        // Get ability modifier
        const abilityMod = actor.system.abilities[defense.abilityMod]?.mod || 0;
        
        // Calculate: 10 + level/armor + class + ability mod + misc
        const total = 10 + 
                     (defense.levelArmor || 0) + 
                     (defense.classBonus || 0) + 
                     abilityMod + 
                     (defense.misc || 0);
        
        // Update the defense total
        await actor.update({
            [`system.defenses.${defenseType}.total`]: total
        });
    }
    
    /**
     * Activate all sheet handlers
     * @param {HTMLElement} html - The sheet HTML
     * @param {Actor} actor - The actor being edited
     */
    static activate(html, actor) {
        this.activateConditionButtons(html, actor);
        this.activateDefenseCalculations(html, actor);
    }
}
