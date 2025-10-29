/**
 * Character Generator Initialization
 * Handles hooking the character generator into Foundry's Actor Directory
 */

import CharacterGenerator from './chargen.js';

/**
 * Initialize character generator hooks
 */
export function initChargenHooks() {
    // Single hook for renderActorDirectory - handles both button injection and create intercept
    Hooks.on('renderActorDirectory', (app, html, data) => {
        // Intercept create button clicks
        const createButton = html.find('.create-entity, .document-create');
        
        createButton.on('click', async (event) => {
            const documentName = event.currentTarget.dataset.documentClass || 
                                event.currentTarget.dataset.type;
            
            if (documentName === "Actor") {
                event.preventDefault();
                event.stopPropagation();
                
                // Show dialog asking if they want to use character generator
                new Dialog({
                    title: "Create New Actor",
                    content: `
                        <p>Would you like to use the character generator?</p>
                    `,
                    buttons: {
                        generator: {
                            icon: '<i class="fas fa-dice-d20"></i>',
                            label: "Use Character Generator",
                            callback: () => {
                                new CharacterGenerator().render(true);
                            }
                        },
                        manual: {
                            icon: '<i class="fas fa-user"></i>',
                            label: "Create Manually",
                            callback: () => {
                                Actor.create({
                                    name: "New Character",
                                    type: "character",
                                    img: "icons/svg/mystery-man.svg"
                                }).catch(err => {
                                    console.error("Failed to create actor:", err);
                                    assets/ui.notifications.error("Failed to create character.");
                                });
                            }
                        }
                    },
                    default: "generator"
                }).render(true);
            }
        });
        
        // Add Character Generator button to header (GM only)
        if (game.user.isGM) {
            const header = html.find('.directory-header');
            if (header.find('.chargen-button').length === 0) {
                const button = $(`
                    <button class="chargen-button" title="Open Character Generator">
                        <i class="fas fa-hat-wizard"></i> Character Generator
                    </button>
                `);
                button.on('click', () => {
                    new CharacterGenerator().render(true);
                });
                header.append(button);
            }
        }
    });
}

// Auto-initialize on ready
Hooks.once('ready', () => {
    initChargenHooks();
    console.log("SWSE | Character Generator hooks initialized");
});
