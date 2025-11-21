import { SWSELogger } from '../utils/logger.js';
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

                // Show dialog asking if they want to use character generator
                new Dialog({
                    title: "Create New Actor",
                    content: `
                        <div style="padding: 1rem;">
                            <p style="text-align: center; margin-bottom: 1rem;">Choose how you'd like to create your character:</p>
                            <div style="background: rgba(74, 144, 226, 0.1); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid #4a90e2;">
                                <strong>New!</strong> Quick character templates available with pre-configured builds for all core classes.
                            </div>
                        </div>
                    `,
                    buttons: {
                        template: {
                            icon: '<i class="fas fa-star"></i>',
                            label: "Use Character Template",
                            callback: () => {
                                TemplateCharacterCreator.create();
                            }
                        },
                        generator: {
                            icon: '<i class="fas fa-dice-d20"></i>',
                            label: "Custom Character Generator",
                            callback: () => {
                                new CharacterGeneratorImproved().render(true);
                            }
                        },
                        manual: {
                            icon: '<i class="fas fa-user"></i>',
                            label: "Create Manually",
                            callback: () => {
                                Actor.create({
                                    name: "New Character",
                                    type: "character",
                                    img: "systems/swse/assets/icons/default-character.png"
                                });
                            }
                        }
                    },
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
            button.addEventListener('click', () => {
                new CharacterGeneratorImproved().render(true);
            });
            header.appendChild(button);
        }
    }
});