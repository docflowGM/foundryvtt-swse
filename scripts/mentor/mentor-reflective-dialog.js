/**
 * Mentor Reflective Dialog
 * Displays mentor reflective content during gameplay
 */

import { SWSEFormApplicationV2 } from '../apps/base/swse-form-application-v2.js';

export class MentorReflectiveDialog extends SWSEFormApplicationV2 {
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ['swse', 'mentor-reflective-dialog'],
    template: 'systems/foundryvtt-swse/templates/apps/mentor-reflective-dialog.hbs',
    width: 600,
    height: 400,
    resizable: true
  });

  async _prepareContext() {
    return {
      actor: this.actor
    };
  }
}

export default MentorReflectiveDialog;

// Auto-setup hooks on module load
function setupMentorDialogueHooks() {
  // Placeholder for any mentor dialogue hook setup
}

// Auto-setup hooks on module load
if (typeof Hooks !== 'undefined') {
  Hooks.once('ready', setupMentorDialogueHooks);
}
