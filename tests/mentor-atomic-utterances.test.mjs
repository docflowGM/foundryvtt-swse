import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  assert.equal(lateRecommendation, PRESENTATION.REJECTED_PRIORITY,
    'Automatic recommendation must never supersede an existing step introduction');
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
  // The recommendation is rejected before the animation gate; focus,
  // commit and explicit Ask Mentor are rejected by the in-progress sentence.
  assert.equal(controller.stats().midSentenceInterruptionsPrevented, 3);

  // A delayed automatic recommendation must not change the mentor's mind
  // AFTER the introduction finishes, either.
  shell.mentor.isAnimating = false;
  assert.equal(controller.present({
    source: 'recommendation', text: 'Here is another theory.',
    stepId: 'species', temporary: false,
  }), PRESENTATION.REJECTED_PRIORITY);
  assert.equal(written.length, 1, 'Completed introduction was overwritten without player action');

  // Once the reveal completes, a fresh meaningful action can speak.
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

// The shell must put the introduction into the rail before starting an
// asynchronous recommendation for that newly entered step.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shellSource = fs.readFileSync(
  path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-shell.js'), 'utf8');
const activation = shellSource.slice(
  shellSource.indexOf('async _activateStep(stepIndex, options = {})'),
  shellSource.indexOf('async _initializeSteps()'));
const introPos = activation.indexOf('this._presentStepPluginGuidance(plugin, descriptor?.stepId)');
const requestPos = activation.indexOf('this.requestMentorRecommendation(`step-enter:');
assert.ok(introPos >= 0 && requestPos > introPos,
  'Step entry must display its committed introduction before asynchronous advice');

console.log('mentor-atomic-utterances: all assertions passed');
