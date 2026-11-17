/**
 * Actor Directory Integration
 * Adds SWSE character creation buttons to the Actor Directory header
 * Safe V13 pattern - no sidebar or layout contamination
 */

import { launchNewProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";

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
  templateBtn.innerHTML = '<i class="fa-solid fa-id-card"></i> Create From Galactic Profile';
  templateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // One creation path: the transient ProgressionSession opens on the Galactic Profile picker; no actor exists until confirm.
    launchNewProgression({ actorType: 'character', profilePicker: true }).catch(err => {
      ui?.notifications?.error?.(`Failed to open Galactic Profile creation: ${err.message}`);
    });
  });

  // Append buttons to container
  container.appendChild(guidedBtn);
  container.appendChild(templateBtn);

  // Add container to header
  header.appendChild(container);
}

/**
 * Register directory hooks
 */
export function registerDirectoryHooks() {
  Hooks.on('renderActorDirectory', handleRenderActorDirectory);
}
