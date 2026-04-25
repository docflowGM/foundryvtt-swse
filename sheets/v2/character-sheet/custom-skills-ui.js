/**
 * Custom Skills panel UI activation
 *
 * Handles custom skill creation, deletion, and rolling from the character sheet.
 * Pure sheet-local feature with no progression integration.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { rollCustomSkill } from "/systems/foundryvtt-swse/scripts/rolls/custom-skill-roller.js";

/**
 * Activate custom skills panel UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateCustomSkillsUI(sheet, html, { signal } = {}) {
  const actor = sheet.actor;

  // Add Custom Skill button
  html.querySelectorAll('[data-action="add-custom-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      await addCustomSkill(actor);
    }, { signal });
  });

  // Delete Custom Skill button
  html.querySelectorAll('[data-action="delete-custom-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const skillId = button.dataset.customSkillId;
      if (skillId) {
        await deleteCustomSkill(actor, skillId);
      }
    }, { signal });
  });

  // Roll Custom Skill button
  html.querySelectorAll('[data-action="roll-custom-skill"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const skillId = button.dataset.customSkillId;
      if (skillId) {
        await rollCustomSkill(actor, skillId);
      }
    }, { signal });
  });
}

/**
 * Add a new custom skill to the actor
 * @param {Actor} actor - The character actor
 * @returns {Promise<void>}
 */
async function addCustomSkill(actor) {
  if (!actor || !actor.isOwner) {
    ui.notifications.warn('You do not have permission to edit this actor.');
    return;
  }

  const customSkills = actor.system.customSkills || [];

  // Create new custom skill with unique ID
  const newSkill = {
    id: `custom-${Date.now()}`,
    label: 'New Custom Skill',
    ability: 'int',
    trained: false,
    focused: false,
    miscMod: 0,
    notes: ''
  };

  const updatedSkills = [...customSkills, newSkill];

  await actor.update({
    'system.customSkills': updatedSkills
  });

  swseLogger.log('[CustomSkills] Added new custom skill:', newSkill.id);
}

/**
 * Delete a custom skill from the actor
 * @param {Actor} actor - The character actor
 * @param {string} skillId - The custom skill ID to delete
 * @returns {Promise<void>}
 */
async function deleteCustomSkill(actor, skillId) {
  if (!actor || !actor.isOwner) {
    ui.notifications.warn('You do not have permission to edit this actor.');
    return;
  }

  if (!skillId) return;

  const customSkills = actor.system.customSkills || [];
  const updatedSkills = customSkills.filter(skill => skill.id !== skillId);

  await actor.update({
    'system.customSkills': updatedSkills
  });

  swseLogger.log('[CustomSkills] Deleted custom skill:', skillId);
}

export { addCustomSkill, deleteCustomSkill };
