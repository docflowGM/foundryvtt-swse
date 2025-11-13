import CharacterGeneratorImproved from './chargen-improved.js';

Hooks.on('renderActorDirectory', (app, html, data) => {
    const createButton = $(html).find('.create-entity, .document-create');

    createButton.on('click', async (event) => {
        const documentName = event.currentTarget.dataset.documentClass || event.currentTarget.dataset.type;

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
                default: "generator"
            }).render(true);
        }
    });
});

// Also add button to actor directory header
Hooks.on('renderActorDirectory', (app, html, data) => {
    if (game.user.isGM) {
        const header = $(html).find('.directory-header');
        if (header.find('.chargen-button').length === 0) {
            const button = $(`<button class="chargen-button"><i class="fas fa-hat-wizard"></i> Character Generator</button>`);
            button.on('click', () => {
                new CharacterGeneratorImproved().render(true);
            });
            header.append(button);
        }
    }
});