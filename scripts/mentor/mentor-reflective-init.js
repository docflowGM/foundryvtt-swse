// scripts/apps/mentor-reflective-init.js
import { HooksRegistry } from '../hooks/hooks-registry.js';
import MentorReflectiveDialog from './mentor-reflective-dialog.js';

/**
 * AppV2: Add Mentor button to ActorSheetV2 header.
 */
export function registerMentorReflectiveInit() {
  HooksRegistry.register('getHeaderControlsApplicationV2', 'swse-mentor-reflective', (app, controls) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.type !== 'character') {return;}

    if (controls.some(c => c?.action === 'swse-mentor-reflective')) {return;}

    controls.push({
      action: 'swse-mentor-reflective',
      icon: 'fa-solid fa-comments',
      label: 'Mentor',
      visible: () => true,
      onClick: () => new MentorReflectiveDialog(actor).render(true)
    });
  });
}

export default registerMentorReflectiveInit;
