import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

// Test the actual picker normalization without booting the Foundry app.
// Only the Foundry base class import is stubbed. The filtering, DTO mapping
// and fallback summary logic run from the production module source.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(ROOT, 'scripts/apps/mentor/mentor-suggestion-picker-dialog.js');
const source = fs.readFileSync(file, 'utf8');
const testSource = source
  .replace(/^import \{ BaseSWSEAppV2 \} from .+;\s*$/m, '')
  .replace('export class MentorSuggestionPickerDialog', 'class MentorSuggestionPickerDialog');
assert.notEqual(testSource, source, 'The source import and export anchors must remain recognizable');

const Dialog = vm.runInNewContext(
  testSource + '\nMentorSuggestionPickerDialog;',
  { BaseSWSEAppV2: class {} },
  { filename: file },
);

const options = [
  {
    name: 'Starkiller Base Origin',
    suggestion: {
      reasonSummary: 'Starkiller Base Origin patches a useful gap in your build.',
      reasons: [
        'Adds novel class-skill access your class does not already provide: Knowledge (Technology), Mechanics.',
        'Starkiller Base Origin patches a useful gap in your build.',
        'It has an extra mechanical hook such as a bonus, reroll, language, or class-skill benefit.',
        'Its bonus text lines up with a stated build lane.',
        'The background is narratively coherent with your species.',
        'Its skills lean on your stronger attribute plan: Knowledge (Technology) (INT).',
      ],
      cautions: ['The benefit overlaps with Mechanics training you already planned.'],
      forecast: ['Knowledge (Technology) remains available as a class skill.'],
    },
  },
  {
    name: 'Empty Filler',
    suggestion: {
      reason: 'Empty Filler patches a useful gap in your build.',
      reasons: ['Empty Filler patches a useful gap in your build.'],
    },
  },
  {
    name: 'Cerea Origin',
    suggestion: {
      reasonSummary: 'Adds new class-skill access: Acrobatics and Survival.',
      reasons: [
        'Adds new class-skill access: Acrobatics and Survival.',
        'Survival benefits from your Wisdom modifier.',
      ],
    },
  },
];

const dialog = new Dialog({ suggestions: options, mentor: { name: 'JO-N1' }, stepLabel: 'backgrounds' });
const rows = dialog._prepareContext().suggestions;

assert.equal(rows.length, 3, 'Suggestion identity and ranking must remain unchanged');

const first = rows[0];
assert.match(first.reasonSummary, /Knowledge \(Technology\), Mechanics/, 'Prefer a specific reason over generic narration');
assert.equal(first.bullets.length, 1, 'Remove boilerplate and the repeated summary');
assert.match(first.bullets[0].text, /stronger attribute plan/);
assert.equal(first.cautions.length, 1, 'Cautions remain untouched');
assert.equal(first.forecast.length, 1, 'Forecast remains untouched');

const empty = rows[1];
assert.equal(empty.reasonSummary, null, 'Do not fabricate a reason when there is no specific explanation');
assert.equal(empty.bullets.length, 0, 'Vague-only recommendations may have no explanation bullets');

const specific = rows[2];
assert.match(specific.reasonSummary, /Acrobatics and Survival/);
assert.equal(specific.bullets.length, 1, 'Only exact summary duplication is eliminated');
assert.match(specific.bullets[0].text, /Wisdom modifier/);
assert.equal(specific.rank, 3);
// More evidence is not automatically better. The picker should render as many
// independently useful observations as exist, up to four, with no padding.
for (const count of [0, 1, 2, 3, 4, 5]) {
  const supplied = Array.from({ length: count }, (_, index) =>
    `Provides class-skill access to verified skill ${index + 1}.`);
  const result = new Dialog({
    suggestions: [{ name: 'Variable Evidence', suggestion: { reasons: supplied } }],
  })._prepareContext().suggestions[0];
  const expected = Math.min(count, 4);
  assert.equal(result.reasonSummary, count ? supplied[0] : null,
    'First concrete observation becomes the summary, never a placeholder');
  assert.equal(result.bullets.length, Math.max(0, expected - 1),
    `Expected ${Math.max(0, expected - 1)} bullets after the summary for ${count} supplied`);
  assert.deepEqual(Array.from(result.bullets, bullet => bullet.text), supplied.slice(1, 4),
    'Summary must not be duplicated, and no padding or generic text should be appended');
}

// The template omits the reasons section when the list is empty.
const template = fs.readFileSync(
  path.join(ROOT, 'templates/apps/mentor-suggestion-picker-dialog.hbs'), 'utf8');
assert.match(template, /{{#if bullets.length}}/);
assert.match(template, /{{#each bullets}}/);

console.log('mentor-suggestion-picker-reasons: all assertions passed');
