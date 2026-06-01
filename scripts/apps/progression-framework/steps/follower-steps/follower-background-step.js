/**
 * FollowerBackgroundStep
 *
 * Thin adapter over the mature BackgroundStep. It uses the normal background UI,
 * details rail, filtering, and background ledger, then mirrors the selected
 * background into follower persistent choices for follower materialization.
 */

import { BackgroundStep } from '../background-step.js';

export class FollowerBackgroundStep extends BackgroundStep {
  async onItemCommitted(id, shell) {
    await super.onItemCommitted(id, shell);
    const draftBackground = shell?.progressionSession?.draftSelections?.background || null;
    if (draftBackground) {
      const backgroundId = Array.isArray(draftBackground.backgroundIds) && draftBackground.backgroundIds.length
        ? draftBackground.backgroundIds[0]
        : (draftBackground.id || draftBackground.backgroundId || id);
      shell.progressionSession.draftSelections.backgroundChoice = backgroundId;
      shell.progressionSession.draftSelections.followerBackground = draftBackground;
    }
  }
}
