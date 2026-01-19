/**
 * Mentor Reflective Dialogue System Initialization
 * Hooks and initialization for the reflective dialogue UI
 */

import { MentorReflectiveDialog, setupMentorDialogueHooks } from './mentor-reflective-dialog.js';
import { MentorChatDialog } from './mentor-chat-dialog.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Initialize mentor dialogue system on Foundry ready
 */
Hooks.once('ready', () => {
  SWSELogger.log('SWSE Mentor | Initializing reflective dialogue system');
  setupMentorDialogueHooks();
});

/**
 * Add mentor dialogue button to actor sheet
 * This provides quick access to reflective conversations
 */
Hooks.on('renderActorSheet', (sheet, html, data) => {
  // Only for character sheets
  if (sheet.actor.type !== 'character') return;

  // Find the actor name header
  const header = html.find('.window-header, .sheet-header');
  if (header.length === 0) return;

  // Get the actor's mentor (level 1 class)
  const level1Class = sheet.actor.getFlag('swse', 'level1Class');
  if (!level1Class) return; // No mentor assigned yet

  // Create mentor button
  const mentorBtn = $(
    `<button class="mentor-reflective-btn" type="button" title="Consult Your Mentor">
      <i class="fas fa-comments"></i>
      <span>Mentor</span>
    </button>`
  );

  mentorBtn.click((e) => {
    e.preventDefault();
    MentorReflectiveDialog.show(sheet.actor, level1Class);
  });

  // Add to window controls
  html.find('.window-controls').prepend(mentorBtn);
});

/**
 * Register global helper for easy console access
 */
window.SWSE = window.SWSE || {};
window.SWSE.Mentor = {
  showReflectiveDialogue: (actor, mentorId) => {
    if (!actor) {
      const selection = canvas.tokens.controlled[0];
      actor = selection?.actor;
    }
    if (!actor) {
      ui.notifications.error('No actor selected');
      return;
    }
    const level1Class = actor.getFlag('swse', 'level1Class') || mentorId;
    MentorReflectiveDialog.show(actor, level1Class);
  },
  showChatDialog: (actor) => {
    if (!actor) {
      const selection = canvas.tokens.controlled[0];
      actor = selection?.actor;
    }
    if (!actor) {
      ui.notifications.error('No actor selected');
      return;
    }
    MentorChatDialog.show(actor);
  }
};

SWSELogger.log('SWSE Mentor | Reflective dialogue system ready');
SWSELogger.log('SWSE Mentor | Use SWSE.Mentor.showReflectiveDialogue(actor, mentorId) to open dialogue');
SWSELogger.log('SWSE Mentor | Use SWSE.Mentor.showChatDialog(actor) to open mentor chat');
