import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Production-path regression: the mentor never changes sentences mid-reveal.
// The translation animation is intentionally not modified by this fix.
registerFoundryPathLoader();
installFoundryShimGlobals();

globalThis.foundry.applications = globalThis.foundry.applications ?? {
  api: {
    ApplicationV2: class {},
    HandlebarsApplicationMixin: Base => class extends Base {},
    DocumentSheetV2: class {},
    DialogV2: class {},
  },
  handlebars: { renderTemplate: async () => '' },
  ux: { TextEditor: { implementation: { enrichHTML: async text => text } } },
};

const { MentorRecommendationController, PRESENTATION } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/mentor-recommendation-controller.js'
);

function createShell(stepId = 'species') {
  const written = [];
  const shell = {
    mode: 'chargen',
    currentStepIndex: 0,
    steps: [{ stepId }],
    progressionSession: { currentStepId: stepId },
    mentor: { isAnimating: false },
    mentorRail: {
      presentMessage(message) {
        written.push(message);
        // Actual MentorRail.speak() sets this synchronously upon presentation.
        shell.mentor.isAnimating = true;
        return true;
      },
    },
  };
  const controller = new MentorRecommendationController(shell);
  shell.mentorRecommendations = controller;
  return { shell, controller, written };
}

// Enter a step, then a slower asynchronous suggestion arrives.
{
  const { shell, controller, written } = createShell();
  assert.equal(controller.presentStepGuidance({ text: 'Consider your species.', stepId: 'species' }),
    PRESENTATION.DISPLAYED);
  assert.equal(written.length, 1);

  // None of these may tear down an in-progress Aurebesh reveal.
  const lateRecommendation = controller.present({
    source: 'recommendation', text: 'Actually, choose Twi\u0027lek.',
    stepId: 'species', temporary: false,
  });
  assert.equal(lateRecommendation, PRESENTATION.REJECTED_SPEAKING);
  assert.equal(controller.presentFocusReaction({
    text: 'Maybe a Rodian?', stepId: 'species',
  }), PRESENTATION.REJECTED_SPEAKING);
  assert.equal(controller.presentCommitReaction({
    text: 'Good choice.', stepId: 'species',
  }), PRESENTATION.REJECTED_SPEAKING);
  assert.equal(controller.presentAskMentor({
    text: 'Let me explain.', stepId: 'species',
  }), PRESENTATION.REJECTED_SPEAKING);
  assert.equal(written.length, 1, 'Mentor replaced its own unfinished sentence');
  assert.equal(controller.activeMessage.text, 'Consider your species.');
  assert.equal(controller.stats().midSentenceInterruptionsPrevented, 4);

  // Once the reveal completes, a fresh meaningful action can speak.
  shell.mentor.isAnimating = false;
  assert.equal(controller.presentCommitReaction({
    text: 'Your choice is settled.', stepId: 'species',
  }), PRESENTATION.DISPLAYED);
  assert.equal(written.length, 2);
}

// Moving to a different step must supersede obsolete dialogue immediately.
{
  const { shell, controller, written } = createShell('species');
  controller.presentStepGuidance({ text: 'Choose a species.', stepId: 'species' });
  assert.equal(shell.mentor.isAnimating, true);

  shell.progressionSession.currentStepId = 'class';
  shell.steps = [{ stepId: 'class' }];
  controller.reset(); // Real ProgressionShell resets the controller on step entry.
  assert.equal(controller.presentStepGuidance({
    text: 'Now choose your class.', stepId: 'class',
  }), PRESENTATION.DISPLAYED);
  assert.equal(written.length, 2);
  assert.equal(written[1].text, 'Now choose your class.');

  assert.equal(controller.presentAskMentor({
    text: 'Old species advice.', stepId: 'species',
  }), PRESENTATION.REJECTED_STALE);
  assert.equal(written.length, 2);
}

// Identical messages still get deduplicated; no extra reveal starts.
{
  const { controller, written } = createShell('attribute');
  const payload = { text: 'Allocate your attributes.', stepId: 'attribute' };
  controller.presentStepGuidance(payload);
  assert.equal(controller.presentStepGuidance(payload), PRESENTATION.REJECTED_DUPLICATE);
  assert.equal(written.length, 1);
}

console.log('mentor-atomic-utterances: all assertions passed');
