/**
 * LevelupReviewStep
 *
 * Dedicated final review surface for level-up progression.
 * Reuses SummaryStep's level-up delta and HP resolution machinery so the
 * system has one review implementation instead of a parallel preview path.
 */

import { SummaryStep } from './summary-step.js';
import { handleAskMentor } from './mentor-step-integration.js';

export class LevelupReviewStep extends SummaryStep {
  async onStepEnter(shell) {
    await super.onStepEnter(shell);
    if (shell?.mentor) {
      shell.mentor.askMentorEnabled = true;
    }
  }

  getMentorContext() {
    return 'Review the level-up plan before it is committed. Explain what will change, flag unresolved choices, and reassure the player that this is the final checkpoint before advancement.';
  }

  getMentorMode() {
    return 'context-only';
  }

  async onAskMentor(shell) {
    return handleAskMentor(shell, this, {
      fallback: 'Review the advancement readout carefully. If the class, choices, and derived changes match your intent, you are ready to finalize this level-up.',
    });
  }
}
