/**
 * Actor Directory Integration
 * Adds SWSE character creation buttons to the Actor Directory header
 * Safe V13 pattern - no sidebar or layout contamination
 */

import { launchNewProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { TemplateCharacterCreator } from "/systems/foundryvtt-swse/scripts/apps/template-character-creator.js";

/**
 * Add character creation buttons to Actor Directory header
 * @param {ActorDirectory} app - The directory application
 * @param {HTMLElement} html - The rendered HTML
 * @param {Object} data - Context data
 */
function handleRenderActorDirectory(app, html, data) {
  // Prevent duplicate buttons on re-renders
  if (html.querySelector('.swse-directory-buttons')) {
    return;
  }

  // Find the directory header
  const header = html.querySelector('.directory-header');
  if (!header) {
    return;
  }

  // Create container for buttons
  const container = document.createElement('div');
  container.classList.add('swse-directory-buttons');

  // Create "Chargen" button
  const guidedBtn = document.createElement('button');
  guidedBtn.classList.add('swse-chargen-btn');
  guidedBtn.type = 'button';
  guidedBtn.innerHTML = '<i class="fa-solid fa-person"></i> Chargen';
  guidedBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await launchNewProgression({ actorType: 'character' });
  });

  // Create "Template Character" button
  const templateBtn = document.createElement('button');
  templateBtn.classList.add('swse-template-chargen-btn');
  templateBtn.type = 'button';
  templateBtn.innerHTML = '<i class="fa-solid fa-file-alt"></i> Create From Template';
  templateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const app = new TemplateCharacterCreator();
    app.render(true);
  });

  // Append buttons to container
  container.appendChild(guidedBtn);
  container.appendChild(templateBtn);

  // GM-only NPC creation through the canonical progression shell. The track is
  // chosen explicitly here (no inferred default), so the new NPC's identity is
  // established from creation data.
  if (game.user?.isGM) {
    for (const [track, label, icon] of [['heroic', 'Heroic NPC', 'fa-user-shield'], ['nonheroic', 'Nonheroic NPC', 'fa-user']]) {
      const npcBtn = document.createElement('button');
      npcBtn.classList.add('swse-npc-chargen-btn', `swse-npc-chargen-btn--${track}`);
      npcBtn.type = 'button';
      npcBtn.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
      npcBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await launchNewProgression({ actorType: 'npc', subtype: track, source: `actor-directory.npc-${track}` });
      });
      container.appendChild(npcBtn);
    }
  }

  // Add container to header
  header.appendChild(container);
}

/**
 * Register directory hooks
 */
export function registerDirectoryHooks() {
  Hooks.on('renderActorDirectory', handleRenderActorDirectory);
}
