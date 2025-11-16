import CharacterGeneratorImproved from './chargen-improved.js';

// Single hook to handle both create button interception and header button addition
Hooks.on('renderActorDirectory', (app, html, data) => {
    // Intercept the create button click
    const createButton = html[0].querySelector('.create-entity, .document-create');

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
    }

    // Add character generator button to header
    if (game.user.isGM) {
        const header = html[0].querySelector('.directory-header');
        if (header && !header.querySelector('.chargen-button')) {
            const button = document.createElement('button');
            button.className = 'chargen-button';
            button.innerHTML = '<i class="fas fa-hat-wizard"></i> Character Generator';
            button.addEventListener('click', () => {
                new CharacterGeneratorImproved().render(true);
            });
            header.appendChild(button);
        }
    }
});