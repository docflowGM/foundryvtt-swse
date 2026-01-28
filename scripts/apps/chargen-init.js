import { SWSELogger } from '../utils/logger.js';
import CharacterGeneratorNarrative from './chargen-narrative.js';
import CharacterGeneratorImproved from './chargen-improved.js';
import { TemplateCharacterCreator } from './template-character-creator.js';

// Single hook to handle both create button interception and header button addition
Hooks.on('renderActorDirectory', (app, html, data) => {
    // Note: html is now an HTMLElement in Foundry v13+, not a jQuery object
    // Check if html exists
    if (!html) {
        SWSELogger.warn('SWSE | renderActorDirectory hook received invalid html parameter');
        return;
    }

    // Get the actual HTMLElement (html might be jQuery array or HTMLElement)
    const element = html instanceof HTMLElement ? html : html[0];

    if (!element) {
        SWSELogger.warn('SWSE | renderActorDirectory hook: could not get HTMLElement');
        return;
    }

    // Intercept the create button click
    const createButton = element.querySelector('.create-entity, .document-create');

    if (createButton) {
        createButton.addEventListener('click', async (event) => {
            const documentName = event.currentTarget.dataset.documentClass || event.currentTarget.dataset.type;

            if (documentName === "Actor") {
                event.preventDefault();
                event.stopPropagation();

                // Check if user can create NPCs (GM or house rule enabled)
                const isGM = game.user.isGM;
                const allowPlayersNonheroic = game.settings.get('foundryvtt-swse', "allowPlayersNonheroic");
                const canCreateNPC = isGM || allowPlayersNonheroic;

                // Build dialog buttons
                const buttons = {
                    template: {
                        icon: '<i class="fas fa-star"></i>',
                        label: "PC from Template",
                        callback: () => {
                            TemplateCharacterCreator.create();
                        }
                    },
                    generator: {
                        icon: '<i class="fas fa-dice-d20"></i>',
                        label: "Custom PC Generator",
                        callback: async () => {
                            // Create temporary actor for consistent initialization and mentor survey handling
                            // Ensures L1 mentor survey fires consistently regardless of entry point
                            const tempActor = new Actor({
                                name: "New Character (Temp)",
                                type: "character",
                                system: {
                                    level: 1,
                                    swse: { mentorSurveyCompleted: false }
                                }
                            }, { temporary: true });

                            new CharacterGeneratorNarrative(tempActor).render(true);
                        }
                    }
                };

                // Add NPC Generator button only if permitted
                if (canCreateNPC) {
                    buttons.npc = {
                        icon: '<i class="fas fa-users"></i>',
                        label: "NPC Generator",
                        callback: async () => {
                            // Create temporary NPC actor for consistent initialization
                            const tempActor = new Actor({
                                name: "New NPC (Temp)",
                                type: "npc",
                                system: {
                                    level: 1,
                                    swse: { mentorSurveyCompleted: false }
                                }
                            }, { temporary: true });

                            new CharacterGeneratorImproved(tempActor, { actorType: "npc" }).render(true);
                        }
                    };
                }

                // Always allow manual creation
                buttons.manual = {
                    icon: '<i class="fas fa-user"></i>',
                    label: "Create Manually",
                    callback: () => {
                        Actor.create({
                            name: "New Character",
                            type: "character",
                            img: "systems/foundryvtt-swse/assets/icons/default-character.png"
                        });
                    }
                };

                // Show dialog asking if they want to use character generator
                new Dialog({
                    title: "Create New Actor",
                    content: `
                        <div style="padding: 1rem;">
                            <p style="text-align: center; margin-bottom: 1rem;">Choose what type of actor to create:</p>
                            <div style="background: rgba(74, 144, 226, 0.1); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid #4a90e2;">
                                <strong>New!</strong> Quick character templates available with pre-configured builds for all core classes.
                            </div>
                        </div>
                    `,
                    buttons: buttons,
                    default: "template"
                }).render(true);
            }
        });
    }

    // Add character generator buttons to header
    if (game.user.isGM) {
        const header = element.querySelector('.directory-header');
        if (header && !header.querySelector('.chargen-button')) {
            // Template button
            const templateButton = document.createElement('button');
            templateButton.className = 'chargen-button template-button';
            templateButton.innerHTML = '<i class="fas fa-star"></i> Templates';
            templateButton.title = 'Create character from template';
            templateButton.addEventListener('click', () => {
                TemplateCharacterCreator.create();
            });
            header.appendChild(templateButton);

            // Character generator button
            const button = document.createElement('button');
            button.className = 'chargen-button';
            button.innerHTML = '<i class="fas fa-hat-wizard"></i> Generator';
            button.title = 'Open custom character generator';
            button.addEventListener('click', async () => {
                // Create temporary actor for consistent initialization and mentor survey handling
                // Ensures L1 mentor survey fires consistently regardless of entry point
                const tempActor = new Actor({
                    name: "New Character (Temp)",
                    type: "character",
                    system: {
                        level: 1,
                        swse: { mentorSurveyCompleted: false }
                    }
                }, { temporary: true });

                new CharacterGeneratorNarrative(tempActor).render(true);
            });
            header.appendChild(button);
        }
    }
});