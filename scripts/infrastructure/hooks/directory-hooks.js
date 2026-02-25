/**
 * Actor Directory Integration
 * Adds SWSE character creation buttons to the Actor Directory header
 * Safe V13 pattern - no sidebar or layout contamination
 */

import CharacterGenerator from '../../apps/chargen/chargen-main.js';
import { TemplateCharacterCreator } from '../../apps/template-character-creator.js';

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
  guidedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const app = new CharacterGenerator();
    app.render(true);
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

  // Add container to header
  header.appendChild(container);
}

/**
 * Register directory hooks
 */
export function registerDirectoryHooks() {
  Hooks.on('renderActorDirectory', handleRenderActorDirectory);
}
