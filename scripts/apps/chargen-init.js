import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { ProgressionRules } from "/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js";
import CharacterGeneratorNarrative from "/systems/foundryvtt-swse/scripts/apps/chargen-narrative.js";
import CharacterGeneratorImproved from "/systems/foundryvtt-swse/scripts/apps/chargen-improved.js";
import { TemplateCharacterCreator } from "/systems/foundryvtt-swse/scripts/apps/template-character-creator.js";
import { ActorCreationEntryDialog } from "/systems/foundryvtt-swse/scripts/apps/actor-creation-entry-dialog.js";
import { DroidTemplateChoiceDialog } from "/systems/foundryvtt-swse/scripts/apps/droid-template-choice-dialog.js";
import { createActor } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { RolloutSettings } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/rollout/rollout-settings.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";

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

            if (documentName === 'Actor') {
                event.preventDefault();
                event.stopPropagation();

                // PHASE 3: Show entry point dialog first
                // User chooses: "Begin New Character" or "Access Galactic Records"
                ActorCreationEntryDialog.create({
                    callback: async (choice) => {
                        if (choice !== 'new-character') {
                            // Access Galactic Records handled by dialog
                            return;
                        }

                        // User chose "Begin New Character" - show chargen options
                        // Check if user can create NPCs (GM or house rule enabled)
                        const isGM = game.user.isGM;
                        const allowPlayersNonheroic = ProgressionRules.allowPlayersNonheroic();
                        const canCreateNPC = isGM || allowPlayersNonheroic;

                        // PHASE 4 STEP 5: Check rollout mode before offering legacy generators
                        const rolloutMode = RolloutSettings.getRolloutMode();
                        const useUnified = RolloutSettings.shouldUseUnifiedProgressionByDefault();
                        const legacyAvailable = RolloutSettings.shouldSupportLegacyFallback();

                        // Build dialog buttons
                        const buttons = {
                            template: {
                                icon: '<i class="fa-solid fa-star"></i>',
                                label: 'PC from Template',
                                callback: () => {
                                    TemplateCharacterCreator.create();
                                }
                            }
                        };

                        // PHASE 4 STEP 5: Offer unified or legacy generator based on rollout mode
                        if (useUnified) {
                            buttons.unified = {
                                icon: '<i class="fa-solid fa-dice-d20"></i>',
                                label: '✓ Custom PC (Unified)',
                                callback: async () => {
                                    // Route to unified ProgressionShell via launchProgression
                                    const { launchProgression } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js');
                                    const ActorClass = CONFIG.Actor.documentClass;
                                    const tempActor = new ActorClass({
                                        name: 'New Character',
                                        type: 'character',
                                        system: { level: 0, swse: { mentorSurveyCompleted: false } }
                                    }, { parent: null });
                                    await launchProgression(tempActor);
                                }
                            };
                        }

                        // PHASE 4 STEP 5: Offer legacy generator only if legacy fallback is supported
                        if (legacyAvailable && rolloutMode !== 'default') {
                            buttons.legacy = {
                                icon: '<i class="fa-solid fa-wrench"></i>',
                                label: '⚠ Legacy PC Generator',
                                callback: async () => {
                                    SWSELogger.warn('[chargen-init] Opening legacy generator (fallback mode)');
                                    const ActorClass = CONFIG.Actor.documentClass;
                                    const tempActor = new ActorClass({
                                        name: 'New Character (Temp)',
                                        type: 'character',
                                        system: {
                                            level: 1,
                                            swse: { mentorSurveyCompleted: false }
                                        }
                                    }, { parent: null });

                                    new CharacterGeneratorNarrative(tempActor).render(true);
                                }
                            };
                        }

                        // Add NPC Generator button only if permitted and legacy fallback available
                        if (canCreateNPC && legacyAvailable) {
                            buttons.npc = {
                                icon: '<i class="fa-solid fa-users"></i>',
                                label: '⚠ Legacy NPC Generator',
                                callback: async () => {
                                    SWSELogger.warn('[chargen-init] Opening legacy NPC generator (fallback mode)');
                                    // Create temporary NPC actor for consistent initialization
                                    const ActorClass = CONFIG.Actor.documentClass;
                                    const tempActor = new ActorClass({
                                        name: 'New NPC (Temp)',
                                        type: 'npc',
                                        system: {
                                            level: 1,
                                            swse: { mentorSurveyCompleted: false }
                                        }
                                    }, { parent: null });

                                    new CharacterGeneratorImproved(tempActor, { actorType: 'npc' }).render(true);
                                }
                            };
                        }

                        // Droid creation
                        buttons.droid = {
                            icon: '<i class="fa-solid fa-robot"></i>',
                            label: 'Create Droid',
                            callback: async () => {
                                SWSELogger.log('[chargen-init] Opening droid template choice dialog');
                                DroidTemplateChoiceDialog.create({
                                    callback: async (result) => {
                                        await _handleDroidCreation(result);
                                    }
                                });
                            }
                        };

                        // Always allow manual creation
                        buttons.manual = {
                            icon: '<i class="fa-solid fa-user"></i>',
                            label: 'Create Manually',
                            callback: async () => {
                                await createActor({
                                    name: 'New Character',
                                    type: 'character',
                                    img: 'systems/foundryvtt-swse/assets/icons/default-character.png'
                                });
                            }
                        };

                        // Show dialog asking if they want to use character generator
                        new SWSEDialogV2({
                            title: 'Create New Actor',
                            content: `
                                <div style="padding: 1rem;">
                                    <p style="text-align: center; margin-bottom: 1rem;">Choose what type of actor to create:</p>
                                    <div style="background: rgba(74, 144, 226, 0.1); padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem; border-left: 3px solid #4a90e2;">
                                        <strong>New!</strong> Quick character templates available with pre-configured builds for all core classes.
                                    </div>
                                </div>
                            `,
                            buttons: buttons,
                            default: 'template'
                        }).render(true);
                    }
                });
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
            templateButton.innerHTML = '<i class="fa-solid fa-star"></i> Templates';
            templateButton.title = 'Create character from template';
            templateButton.addEventListener('click', () => {
                TemplateCharacterCreator.create();
            });
            header.appendChild(templateButton);

            // Character generator button
            const button = document.createElement('button');
            button.className = 'chargen-button';
            button.innerHTML = '<i class="fa-solid fa-hat-wizard"></i> Generator';
            button.title = 'Open custom character generator';
            button.addEventListener('click', async () => {
                // Create temporary actor for consistent initialization and mentor survey handling
                // Ensures L1 mentor survey fires consistently regardless of entry point
                const ActorClass = CONFIG.Actor.documentClass;
                const tempActor = new ActorClass({
                    name: 'New Character (Temp)',
                    type: 'character',
                    system: {
                        level: 1,
                        swse: { mentorSurveyCompleted: false }
                    }
                }, { parent: null });

                new CharacterGeneratorNarrative(tempActor).render(true);
            });
            header.appendChild(button);

            // Store button
            const storeButton = document.createElement('button');
            storeButton.className = 'chargen-button store-button';
            storeButton.innerHTML = '<i class="fa-solid fa-shopping-cart"></i> Store';
            storeButton.title = 'Open the Galactic Trade Exchange';
            storeButton.addEventListener('click', async () => {
                const { SWSEStore } = await import("/systems/foundryvtt-swse/scripts/apps/store/store-main.js");
                await SWSEStore.open();
            });
            header.appendChild(storeButton);
        }
    }
});

/**
 * Handle droid creation from template choice dialog
 * Routes based on selected template type:
 * - droid-template: Import droid template, then launch progression
 * - class-template: Create droid with class template, launch progression
 * - custom: Create empty droid, launch progression
 *
 * Note: All paths ultimately launch progression with droid actor
 */
async function _handleDroidCreation(result) {
  try {
    if (result.choice === 'droid-template') {
      // Droid was already imported by GalacticRecordsBrowser
      // Now launch progression with the imported droid actor
      const importedDroid = result.actor;
      if (importedDroid && importedDroid.type === 'droid') {
        SWSELogger.log('[chargen-init] Launching progression for imported droid:', importedDroid.name);
        // Set droid flag to mark this as a droid character
        await importedDroid.update({ 'system.isDroid': true });
        // Launch progression to continue chargen
        await launchProgression(importedDroid);
      } else {
        ui?.notifications?.error?.('Failed to import droid template');
      }
    } else if (result.choice === 'class-template') {
      // Create a new droid actor, then open template selector for class template
      const ActorClass = CONFIG.Actor.documentClass;
      const droidActor = await ActorClass.create({
        name: 'New Droid',
        type: 'droid',
        system: {
          isDroid: true,
          level: 0,
          droidSystems: {
            degree: '',
            size: 'Medium',
            locomotion: { id: '', name: '', cost: 0, speed: 0 },
            processor: { id: '', name: '', cost: 0, bonus: 0 },
            armor: { id: '', name: '', cost: 0, bonus: 0 },
            appendages: [],
            sensors: [],
            weapons: [],
            accessories: [],
            credits: { total: 2000, spent: 0, remaining: 2000 },
            stateMode: 'DRAFT'
          }
        }
      });

      SWSELogger.log('[chargen-init] Created droid actor for class template:', droidActor.name);

      // TODO: In future, pass class template context to progression
      // For now, launch progression which will guide through full chargen
      await launchProgression(droidActor);
    } else if (result.choice === 'custom') {
      // Create a new empty droid actor and launch progression
      const ActorClass = CONFIG.Actor.documentClass;
      const droidActor = await ActorClass.create({
        name: 'New Droid',
        type: 'droid',
        system: {
          isDroid: true,
          level: 0,
          droidSystems: {
            degree: '',
            size: 'Medium',
            locomotion: { id: '', name: '', cost: 0, speed: 0 },
            processor: { id: '', name: '', cost: 0, bonus: 0 },
            armor: { id: '', name: '', cost: 0, bonus: 0 },
            appendages: [],
            sensors: [],
            weapons: [],
            accessories: [],
            credits: { total: 2000, spent: 0, remaining: 2000 },
            stateMode: 'DRAFT'
          }
        }
      });

      SWSELogger.log('[chargen-init] Created custom droid actor:', droidActor.name);

      // Launch progression for custom build
      await launchProgression(droidActor);
    }
  } catch (err) {
    SWSELogger.error('[chargen-init] Error handling droid creation:', err);
    ui?.notifications?.error?.(`Failed to create droid: ${err.message}`);
  }
}