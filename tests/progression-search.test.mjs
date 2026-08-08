import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Canonical rich progression search — the ONE implementation every step
// filters its catalog through instead of a hand-rolled
// `item.name.toLowerCase().includes(query)`.
//
// Coverage tier: (a) the module itself — buildProgressionSearchText() /
// compileProgressionSearchQuery() / matchesProgressionSearch() — driven
// directly with representative catalog-shaped fixtures; (b) real step
// integration — FeatStep and SpeciesStep constructed for real
// (`new FeatStep(descriptor)`, not a reimplementation) and driven through
// their actual _getSearchResultFeats()/_applyFilters(), proving those
// steps consume the shared helper rather than their old inline matcher;
// (c) static contract checks that every migrated step file imports from
// and calls into the canonical module, for steps not covered by (b).

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

registerFoundryPathLoader();
installFoundryShimGlobals();

const { buildProgressionSearchText, compileProgressionSearchQuery, matchesProgressionSearch } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/utils/progression-search.js'
);

/* ==================================================================== *
 * (a) Module-level tests
 * ==================================================================== */

/* ------------------------------------------------------------------ *
 * 1. Searchable fields: name, description, benefit, summary, and HTML
 *    normalization.
 * ------------------------------------------------------------------ */
{
  const byName = { name: 'Skill Focus (Stealth)', system: { description: { value: '' } } };
  assert.ok(matchesProgressionSearch(byName, 'stealth'), 'name match failed');

  const byDescription = { name: 'Shadow Striker', system: { description: { value: 'Gain a bonus when using Stealth to approach a foe.' } } };
  assert.ok(matchesProgressionSearch(byDescription, 'stealth'), 'description-only match failed');
  assert.ok(!matchesProgressionSearch(byDescription, 'perception'), 'description matched a term it does not contain');

  const byBenefit = { name: 'Concealed Approach', system: { benefit: { value: 'You may make a Stealth check as a swift action.' } } };
  assert.ok(matchesProgressionSearch(byBenefit, 'stealth'), 'benefit-only match failed');

  const bySummary = { name: 'Danger Sense', summary: 'Grants a bonus to Perception checks.' };
  assert.ok(matchesProgressionSearch(bySummary, 'perception', { extraFields: [bySummary.summary] }),
    'supplemental-field (summary) match failed');

  const htmlDescription = {
    name: 'Field Medic',
    system: { description: { value: '<p>You gain a <strong>+2</strong> bonus on Treat Injury &amp; Stealth checks.</p><p>Source URL: https://example.com/x</p>' } },
  };
  const text = buildProgressionSearchText(htmlDescription);
  assert.ok(!text.includes('<'), 'HTML tags were not stripped from searchable text');
  assert.ok(!text.includes('source url'), 'source-URL footer junk was not stripped');
  assert.ok(text.includes('treat injury'), 'HTML-stripped description text is missing expected content');
  assert.ok(matchesProgressionSearch(htmlDescription, 'stealth'), 'HTML-bearing description did not match after normalization');
}

/* ------------------------------------------------------------------ *
 * 1b. Field AGGREGATION: description and benefit are not first-match-wins.
 *     An item with BOTH a description and a benefit must be searchable by
 *     either — the display resolver (extractDescriptionText) intentionally
 *     stops at the first usable field, but search must not inherit that.
 * ------------------------------------------------------------------ */
{
  const item = {
    name: 'Covert Assault',
    system: {
      description: { value: 'You may make an attack after moving.' },
      benefit: { value: 'You may make a Stealth check before the attack.' },
    },
  };
  assert.ok(matchesProgressionSearch(item, 'attack'), 'description field lost when benefit is also present');
  assert.ok(matchesProgressionSearch(item, 'stealth'), 'benefit field lost when description came first — first-match-wins regression');
  assert.ok(matchesProgressionSearch(item, 'attack AND stealth'), 'combined description+benefit Boolean match failed');

  // summary / shortSummary / system.shortSummary are canonical defaults now —
  // no extraFields required to reach them.
  const summaryItem = { name: 'Danger Sense', summary: 'Grants a bonus to Perception checks.' };
  assert.ok(matchesProgressionSearch(summaryItem, 'perception'), 'summary is not a canonical default searchable field');

  const shortSummaryItem = { name: 'Quick Draw', shortSummary: 'Draw and fire in one motion.' };
  assert.ok(matchesProgressionSearch(shortSummaryItem, 'draw'), 'shortSummary is not a canonical default searchable field');

  const systemShortSummaryItem = { name: 'Evasive Maneuvers', system: { shortSummary: 'Improves starfighter dodging.' } };
  assert.ok(matchesProgressionSearch(systemShortSummaryItem, 'dodging'), 'system.shortSummary is not a canonical default searchable field');
}

/* ------------------------------------------------------------------ *
 * 2. Internal metadata is never searched by default.
 * ------------------------------------------------------------------ */
{
  const item = {
    name: 'Weapon Focus',
    _id: 'abc123XyzUUID',
    id: 'weapon-focus-internal-id',
    system: {
      description: { value: 'You are especially trained in the use of a particular weapon.' },
      executionModel: 'ruleEngineHandlerV2',
      mechanicsMode: 'auto-resolve',
      sourcebook: 'Core Rulebook Appendix Z',
    },
  };
  assert.ok(!matchesProgressionSearch(item, 'abc123xyzuuid'), 'internal _id leaked into default searchable text');
  assert.ok(!matchesProgressionSearch(item, 'weapon-focus-internal-id'), 'internal id leaked into default searchable text');
  assert.ok(!matchesProgressionSearch(item, 'ruleenginehandlerv2'), 'executionModel flag leaked into default searchable text');
  assert.ok(!matchesProgressionSearch(item, 'autoresolve'), 'mechanicsMode flag leaked into default searchable text');
  assert.ok(!matchesProgressionSearch(item, 'appendix'), 'sourcebook name leaked into default searchable text');
  assert.ok(matchesProgressionSearch(item, 'weapon'), 'legitimate name text stopped matching');
}

/* ------------------------------------------------------------------ *
 * 3. Plain terms: single term, implicit AND across the combined text
 *    (not required to share one field).
 * ------------------------------------------------------------------ */
{
  const item = { name: 'Shadow Strike', system: { description: { value: 'You may use Stealth to set up a devastating attack.' } } };
  assert.ok(matchesProgressionSearch(item, 'stealth'));
  assert.ok(matchesProgressionSearch(item, 'stealth attack'), 'implicit AND across name+description failed');
  assert.ok(matchesProgressionSearch(item, 'shadow stealth'), 'implicit AND with a name-field term failed');
  assert.ok(!matchesProgressionSearch(item, 'stealth armor'), 'implicit AND matched despite a missing term');
}

/* ------------------------------------------------------------------ *
 * 4-6. Boolean AND / OR / NOT, case-insensitivity, precedence.
 * ------------------------------------------------------------------ */
{
  const item = { name: 'Skill Focus (Stealth)', system: { description: { value: 'You gain a +5 bonus on Stealth checks.' } } };
  const armorItem = { name: 'Armor Mastery', system: { description: { value: 'You gain a bonus to armor and defense.' } } };

  for (const q of ['stealth AND attack', 'stealth and attack', 'Stealth And Attack']) {
    assert.equal(matchesProgressionSearch(item, q), false, `"${q}" should require both terms`);
  }
  assert.ok(matchesProgressionSearch(item, 'stealth AND checks'), 'explicit AND with two present terms failed');
  assert.ok(matchesProgressionSearch(item, 'stealth OR perception'), 'OR with one matching term failed');
  assert.ok(matchesProgressionSearch(armorItem, 'stealth OR armor'), 'OR did not match the second alternative');
  assert.ok(matchesProgressionSearch(item, 'stealth AND NOT armor'), 'AND NOT failed to include a legitimate match');
  assert.ok(!matchesProgressionSearch(armorItem, 'bonus AND NOT armor'), 'AND NOT failed to exclude the negated term');
  assert.ok(matchesProgressionSearch(item, 'stealth NOT armor'), 'shorthand "term NOT term" failed');
  assert.ok(!matchesProgressionSearch(armorItem, 'bonus NOT armor'), 'shorthand "term NOT term" failed to exclude');
  assert.ok(matchesProgressionSearch(item, 'NOT vehicle'), 'leading NOT failed');
  assert.ok(!matchesProgressionSearch({ name: 'Vehicle', system: {} }, 'NOT vehicle'), 'leading NOT failed to exclude a real match');

  // "stealth OR perception AND combat" == "stealth OR (perception AND combat)"
  const combatOnly = { name: 'Melee Duelist', system: { description: { value: 'A master of perception and combat maneuvers.' } } };
  const stealthOnly = { name: 'Ghost Walker', system: { description: { value: 'Stealth incarnate.' } } };
  const neither = { name: 'Bureaucrat', system: { description: { value: 'Paperwork specialist.' } } };
  const q = 'stealth OR perception AND combat';
  assert.ok(matchesProgressionSearch(stealthOnly, q), 'precedence: stealth alone should satisfy the OR branch');
  assert.ok(matchesProgressionSearch(combatOnly, q), 'precedence: perception AND combat should satisfy the AND branch');
  assert.ok(!matchesProgressionSearch(neither, q), 'precedence: an item matching neither branch should not match');
}

/* ------------------------------------------------------------------ *
 * 7. Parentheses, including nested grouping.
 * ------------------------------------------------------------------ */
{
  const concealment = { name: 'Ghost', system: { description: { value: 'Grants a bonus to your next attack from concealment.' } } };
  const neither = { name: 'Loud Guy', system: { description: { value: 'You are extremely conspicuous.' } } };
  assert.ok(matchesProgressionSearch(concealment, '(stealth OR concealment) AND attack'), 'parenthesized OR/AND grouping failed');
  assert.ok(!matchesProgressionSearch(neither, '(stealth OR concealment) AND attack'), 'parenthesized grouping matched an unrelated item');

  const force = { name: 'Move Object', system: { description: { value: 'A telekinetic force power that grants movement of objects.' } } };
  const dark = { name: 'Dark Move Object', system: { description: { value: 'A telekinetic dark side force power that grants movement and deals damage.' } } };
  const nested = "(force OR telekine*) AND (damage OR movement) AND NOT dark";
  assert.ok(matchesProgressionSearch(force, nested), 'nested Boolean+wildcard grouping failed to match a legitimate item');
  assert.ok(!matchesProgressionSearch(dark, nested), 'nested Boolean+wildcard grouping failed to exclude the NOT dark item');
}

/* ------------------------------------------------------------------ *
 * 8. NOT already covered above (5-7); explicit dedicated assertions here
 *    for the exact phrasing the addendum calls out.
 * ------------------------------------------------------------------ */
{
  const item = { name: 'Improved Defense', system: { description: { value: 'Stealth training improves your reflexes, but wearing armor negates the bonus.' } } };
  assert.ok(matchesProgressionSearch(item, 'stealth AND NOT armor') === false, 'AND NOT should exclude an item containing the negated term');
}

/* ------------------------------------------------------------------ *
 * 9. Quoted phrases: contiguous match, not just co-occurrence.
 * ------------------------------------------------------------------ */
{
  const exact = { name: 'Danger Sense', system: { description: { value: 'You may substitute a skill check for a Reflex Defense roll.' } } };
  const farApart = { name: 'Alertness', system: { description: { value: 'A skill you have trained lets you notice things others miss; roll a check when surprised.' } } };
  assert.ok(matchesProgressionSearch(exact, '"skill check"'), 'phrase match failed on a contiguous phrase');
  assert.ok(!matchesProgressionSearch(farApart, '"skill check"'), 'phrase match matched non-contiguous occurrences of both words');
  assert.ok(matchesProgressionSearch(exact, '"skill check" AND reflex'), 'phrase inside a Boolean expression failed');
}

/* ------------------------------------------------------------------ *
 * 10. Wildcards: * and ?, combined with Boolean.
 * ------------------------------------------------------------------ */
{
  assert.ok(matchesProgressionSearch({ name: 'Telekinesis', system: {} }, 'telekine*'));
  assert.ok(matchesProgressionSearch({ name: 'Telekinetic Burst', system: {} }, 'telekine*'));
  assert.ok(!matchesProgressionSearch({ name: 'Move Object', system: {} }, 'telekine*'), 'wildcard matched an unrelated item');

  assert.ok(matchesProgressionSearch({ name: 'Astromech Droids', system: {} }, 'droid?'), '? wildcard should match a token with exactly one trailing char');
  assert.ok(!matchesProgressionSearch({ name: 'A lone droid', system: {} }, 'droid?'), '? wildcard should NOT match a token with zero trailing chars');

  assert.ok(
    matchesProgressionSearch({ name: 'Force Push', system: { description: { value: 'A telekinetic application of the Force.' } } }, '(force OR telekine*) AND NOT dark'),
    'wildcard combined with Boolean failed to match'
  );
  assert.ok(
    !matchesProgressionSearch({ name: 'Dark Force Push', system: { description: { value: 'A dark side telekinetic application of the Force.' } } }, '(force OR telekine*) AND NOT dark'),
    'wildcard combined with Boolean failed to exclude'
  );
}

/* ------------------------------------------------------------------ *
 * Case: every operator/match is case-insensitive.
 * ------------------------------------------------------------------ */
{
  const item = { name: 'STEALTH MASTERY', system: { description: { value: 'GRANTS A BONUS.' } } };
  assert.ok(matchesProgressionSearch(item, 'stealth'));
  assert.ok(matchesProgressionSearch(item, 'STEALTH'));
  assert.ok(matchesProgressionSearch(item, 'StEaLtH aNd BoNuS'));
  assert.ok(matchesProgressionSearch(item, 'STEALTH* AND NOT ARMOR'));
}

/* ------------------------------------------------------------------ *
 * Diacritic folding: canonical normalization, not a per-caller fallback.
 * Positive and NOT queries MUST agree with each other — if the plain-ASCII
 * spelling matches, NOT that same spelling must exclude, for both simple
 * and compound Boolean expressions. This is what a one-sided fallback
 * (fold the searchable text only, after a failed match) cannot guarantee:
 * a NOT clause is evaluated against the UN-folded text first and can
 * "succeed" (wrongly) before the folded fallback is ever reached.
 * ------------------------------------------------------------------ */
{
  const fleche = { name: 'Flèche', system: { description: { value: 'A fencing lunge.' } } };
  assert.ok(matchesProgressionSearch(fleche, 'fleche'), 'plain-ASCII query did not match an accented name');
  assert.ok(matchesProgressionSearch(fleche, 'flèche'), 'accented query did not match its own accented spelling');
  assert.ok(!matchesProgressionSearch(fleche, 'NOT fleche'),
    'NOT excluded inconsistently with the positive match — diacritic folding is not symmetric between text and query');
  assert.ok(matchesProgressionSearch(fleche, 'fencing AND fleche'), 'compound AND with an accented term failed');
  assert.ok(!matchesProgressionSearch(fleche, 'fencing AND NOT fleche'),
    'compound AND NOT wrongly included an accented match — NOT was evaluated before diacritic folding');

  const teras = { name: 'Teräs Käsi Training', system: { description: { value: 'A brutal unarmed combat style.' } } };
  assert.ok(matchesProgressionSearch(teras, 'teras'), 'plain-ASCII query did not match an accented multi-word name');
  assert.ok(matchesProgressionSearch(teras, '"kasi training"'), 'quoted phrase did not match across accented + plain words');
  assert.ok(matchesProgressionSearch(teras, 'teras AND training'), 'implicit AND across accented + plain terms failed');
  assert.ok(!matchesProgressionSearch(teras, 'NOT teras'), 'NOT failed to exclude an item its positive spelling matches');
}

/* ------------------------------------------------------------------ *
 * 12. Invalid / incomplete queries never throw and remain usable.
 * ------------------------------------------------------------------ */
{
  const item = { name: 'Skill Focus (Stealth)', system: { description: { value: 'You gain a bonus on Stealth checks.' } } };
  const malformed = ['stealth AND', 'stealth AND (', '"stealth', '(force OR', 'stealth AND NOT', '((()))', '**??', '"""'];
  for (const q of malformed) {
    assert.doesNotThrow(() => compileProgressionSearchQuery(q), `compileProgressionSearchQuery threw on malformed input: ${JSON.stringify(q)}`);
    assert.doesNotThrow(() => matchesProgressionSearch(item, q), `matchesProgressionSearch threw on malformed input: ${JSON.stringify(q)}`);
  }
  // A genuinely incomplete but still-typing query stays usable: "stealth AND"
  // degrades gracefully (trailing dangling operator is dropped) rather than
  // going blank.
  assert.ok(matchesProgressionSearch(item, 'stealth AND'), '"stealth AND" mid-typing should still match on "stealth"');
}

/* ------------------------------------------------------------------ *
 * Safety: regex-significant literal input never escapes the parser or
 * throws, and is treated as a literal wildcard/plain term, not injected
 * into an unsafe regex.
 * ------------------------------------------------------------------ */
{
  const item = { name: 'Test Item', system: { description: { value: 'A description with a + sign and a [bracket] and a . dot.' } } };
  for (const q of ['+', '.', '[', '(', '*', '[a-z]+', '.*', '(((', ')))']) {
    assert.doesNotThrow(() => matchesProgressionSearch(item, q), `regex-significant literal input threw: ${JSON.stringify(q)}`);
  }
  // A literal '+' or '.' in a query should not silently match everything via
  // regex metacharacter injection.
  assert.ok(matchesProgressionSearch(item, '+'), 'literal "+" should match text containing a literal +');
  assert.ok(!matchesProgressionSearch({ name: 'No plus here', system: {} }, '+'), 'literal "+" incorrectly matched text with no +');
}

console.log('progression-search (module): all assertions passed');

/* ==================================================================== *
 * (b) Real step integration — FeatStep and SpeciesStep constructed for
 *     real and driven through their actual search methods.
 * ==================================================================== */

globalThis.foundry.applications = {
  api: {
    ApplicationV2: class ApplicationV2Stub {},
    HandlebarsApplicationMixin: (Base) => class extends Base {},
    DocumentSheetV2: class DocumentSheetV2Stub {},
    DialogV2: class DialogV2Stub {},
  },
  handlebars: { renderTemplate: async () => '' },
  ux: { TextEditor: { implementation: { enrichHTML: async (v) => v } } },
};
globalThis.window = globalThis.window ?? {
  addEventListener: () => {}, removeEventListener: () => {}, __SWSE_CONTRACT_INITIALIZED__: false,
};
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = globalThis.document ?? {
  readyState: 'complete', addEventListener: () => {}, removeEventListener: () => {}, activeElement: null,
};

const { FeatStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/feat-step.js'
);
const { SpeciesStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/species-step.js'
);
const { TalentStep } = await import(
  '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/talent-step.js'
);

/* ------------------------------------------------------------------ *
 * 13. FeatStep: description search returns a feat whose NAME does not
 *     contain the query at all, proving the real _getSearchResultFeats()
 *     consumes the canonical rich matcher, not a name-only substring check.
 * ------------------------------------------------------------------ */
{
  const step = new FeatStep({ stepId: 'general-feat', slotType: 'heroic' });
  step._allFeats = [
    { id: 'f1', name: 'Shadow Striker', system: { description: { value: 'Gain a bonus when using Stealth to approach a target.' } } },
    { id: 'f2', name: 'Armor Mastery', system: { description: { value: 'You gain a bonus to armor.' } } },
    { id: 'f3', name: 'Skill Focus (Stealth)', system: { description: { value: 'You are exceptionally skilled.' } } },
  ];
  step._legalFeats = step._allFeats;
  step._searchQuery = 'stealth';
  const results = step._getSearchResultFeats().map(f => f.name);
  assert.ok(results.includes('Skill Focus (Stealth)'), 'FeatStep search lost the name-tier match');
  assert.ok(results.includes('Shadow Striker'), 'FeatStep search did not return the description-only match — canonical helper not wired in');
  assert.ok(!results.includes('Armor Mastery'), 'FeatStep search returned a non-matching feat');
  // Name-tier ranking is preserved: exact/name-priority match sorts first.
  assert.equal(results[0], 'Skill Focus (Stealth)', 'FeatStep name-priority ranking regressed');

  // Boolean query support through the real step.
  step._searchQuery = 'stealth AND NOT armor';
  const boolResults = step._getSearchResultFeats().map(f => f.name);
  assert.ok(boolResults.includes('Shadow Striker'));
  assert.ok(!boolResults.includes('Armor Mastery'), 'FeatStep Boolean AND NOT query did not exclude the negated feat');

  // Cross-field Boolean: a term in the NAME and a term in the DESCRIPTION
  // together, where neither field alone satisfies the whole expression.
  // "Shadow Strike" contains "shadow" but not "stealth"; its description
  // contains "stealth" but not "shadow" — only the combined whole-item text
  // has both. _getSearchResultFeats() must gate on that combined text, not
  // score name/tags/prerequisites/description as independent all-or-nothing
  // matches (the pre-fix defect: none of those isolated fields individually
  // contains both terms, so the feat was wrongly dropped).
  step._allFeats = [
    { id: 'f4', name: 'Shadow Strike', system: { description: { value: 'You may use Stealth before attacking.' } } },
    { id: 'f5', name: 'Loud Strike', system: { description: { value: 'A noisy, direct attack with no finesse.' } } },
  ];
  step._legalFeats = step._allFeats;

  for (const q of ['shadow stealth', 'shadow AND stealth']) {
    step._searchQuery = q;
    const names = step._getSearchResultFeats().map(f => f.name);
    assert.ok(names.includes('Shadow Strike'), `cross-field whole-item match failed for query "${q}"`);
  }

  step._searchQuery = 'shadow AND NOT armor';
  assert.ok(step._getSearchResultFeats().map(f => f.name).includes('Shadow Strike'),
    'cross-field "shadow AND NOT armor" incorrectly excluded a legitimate match');

  step._searchQuery = 'shadow AND armor';
  assert.ok(!step._getSearchResultFeats().map(f => f.name).includes('Shadow Strike'),
    '"shadow AND armor" incorrectly matched a feat with no "armor" anywhere in its searchable text');

  // One term in prerequisite text, another in the name — proves the match is
  // truly whole-item, not just name+description.
  step._allFeats = [
    {
      id: 'f6', name: 'Zealous Riposte',
      prerequisiteText: 'Requires Weapon Focus (Vibroswords)',
      system: { description: { value: 'A defensive counter-attack technique.' } },
    },
  ];
  step._legalFeats = step._allFeats;
  step._searchQuery = 'zealous AND vibroswords';
  assert.ok(step._getSearchResultFeats().map(f => f.name).includes('Zealous Riposte'),
    'whole-item match failed across name + prerequisite text');

  // Real Feat description + benefit: proves _searchMatchesFeat() passes the
  // WHOLE feat object to the canonical aggregator (buildProgressionSearchText(feat, ...))
  // rather than a synthetic { name } stand-in plus the display-only
  // _getFeatDescription() extraField, which collapses back to first-usable-
  // field-wins via extractDescriptionText() and can silently lose the
  // benefit when a description is also present. Exercises FeatStep's real
  // _getSearchResultFeats(), not matchesProgressionSearch() directly.
  step._allFeats = [
    {
      id: 'f7', name: 'Covert Assault',
      system: {
        description: { value: 'You may make an attack after moving.' },
        benefit: { value: 'You may make a Stealth check before the attack.' },
      },
    },
  ];
  step._legalFeats = step._allFeats;
  for (const q of ['attack', 'stealth', 'attack AND stealth']) {
    step._searchQuery = q;
    assert.ok(step._getSearchResultFeats().map(f => f.name).includes('Covert Assault'),
      `FeatStep lost the description or benefit field for query "${q}"`);
  }

  // Canonical gate precedes name-priority ranking: a feat whose name is a
  // verbatim, full-phrase match for the plain-text (non-Boolean-aware) form
  // of the query must still be EXCLUDED when the canonical Boolean
  // expression itself rejects it. "Armor Not Shadow" contains the word
  // "shadow" in its own name — so a query of "armor NOT shadow" must reject
  // it (NOT shadow fails, since the name itself contains "shadow"), even
  // though the plain-text exact/starts-with/includes tiers, run in isolation
  // without Boolean awareness, would otherwise rank it a perfect name match.
  // This only holds if the canonical gate is checked BEFORE those tiers.
  step._allFeats = [
    { id: 'f8', name: 'Armor Not Shadow', system: { description: { value: 'A defensive stance.' } } },
  ];
  step._legalFeats = step._allFeats;
  step._searchQuery = 'armor NOT shadow';
  assert.ok(!step._getSearchResultFeats().map(f => f.name).includes('Armor Not Shadow'),
    'canonical NOT semantics were bypassed by a coincidental full-phrase name-priority match — gate is not running before ranking');

  // Restore the original fixtures for the assertions below (name-priority
  // ranking must still hold for simple literal queries).
  step._allFeats = [
    { id: 'f1', name: 'Shadow Striker', system: { description: { value: 'Gain a bonus when using Stealth to approach a target.' } } },
    { id: 'f2', name: 'Armor Mastery', system: { description: { value: 'You gain a bonus to armor.' } } },
    { id: 'f3', name: 'Skill Focus (Stealth)', system: { description: { value: 'You are exceptionally skilled.' } } },
  ];
  step._legalFeats = step._allFeats;
  step._searchQuery = 'stealth';
  assert.equal(step._getSearchResultFeats().map(f => f.name)[0], 'Skill Focus (Stealth)',
    'FeatStep name-priority ranking regressed after the whole-item gate change');

  // Accented catalog names (real data: "Flèche", "Teräs Käsi Training") must
  // stay findable by the plain-ASCII text a player would actually type, AND
  // must obey NOT/Boolean semantics consistently with that plain spelling —
  // both directions, through the real _getSearchResultFeats() path.
  step._allFeats = [
    { id: 'f9', name: 'Flèche', system: { description: { value: 'A fencing lunge.' } } },
  ];
  step._legalFeats = step._allFeats;

  step._searchQuery = 'fleche';
  assert.ok(step._getSearchResultFeats().map(f => f.name).includes('Flèche'),
    'accented feat name became unfindable by its plain-ASCII spelling after the gate-first reorder');

  step._searchQuery = 'fencing AND fleche';
  assert.ok(step._getSearchResultFeats().map(f => f.name).includes('Flèche'),
    'compound AND with an accented term failed through the real step');

  step._searchQuery = 'NOT fleche';
  assert.ok(!step._getSearchResultFeats().map(f => f.name).includes('Flèche'),
    'NOT failed to exclude an accented feat matched by its own positive plain-ASCII query — diacritic folding is not symmetric');

  step._searchQuery = 'fencing AND NOT fleche';
  assert.ok(!step._getSearchResultFeats().map(f => f.name).includes('Flèche'),
    'compound AND NOT wrongly included an accented feat through the real step');

  // Static contract: the file actually imports and calls the canonical module.
  const src = read('scripts/apps/progression-framework/steps/feat-step.js');
  assert.match(src, /from ['"]\.\.\/utils\/progression-search\.js['"]/, 'feat-step.js does not import the canonical search module');
  assert.match(src, /compileProgressionSearchQuery\(/, 'feat-step.js does not call compileProgressionSearchQuery');
}

/* ------------------------------------------------------------------ *
 * 14. SpeciesStep: description search, real _applyFilters().
 * ------------------------------------------------------------------ */
{
  const step = new SpeciesStep({ stepId: 'species' });
  step._allSpecies = [
    { id: 's1', name: 'Kel Dor', source: 'Core Rulebook', description: 'A species adapted to low-light, low-oxygen environments who wear breath masks.' },
    { id: 's2', name: 'Human', source: 'Core Rulebook', description: 'The most common species in the galaxy.' },
    { id: 's3', name: 'Wookiee', source: 'Core Rulebook', description: 'A tall, strong, hirsute species known for Stealth in dense forests.' },
  ];
  step._filters = {};
  step._searchQuery = 'stealth';
  step._applyFilters();
  const names = step._filteredSpecies.map(s => s.name);
  assert.deepEqual(names, ['Wookiee'], 'SpeciesStep description search did not use the canonical matcher — expected only the description match');

  step._searchQuery = 'kel* OR wookiee';
  step._applyFilters();
  const wildcardNames = step._filteredSpecies.map(s => s.name).sort();
  assert.deepEqual(wildcardNames, ['Kel Dor', 'Wookiee'], 'SpeciesStep wildcard+OR query failed through the real step');

  const src = read('scripts/apps/progression-framework/steps/species-step.js');
  assert.match(src, /from ['"]\.\.\/utils\/progression-search\.js['"]/, 'species-step.js does not import the canonical search module');
  assert.match(src, /compileProgressionSearchQuery\(/, 'species-step.js does not call compileProgressionSearchQuery');
}

/* ------------------------------------------------------------------ *
 * 15. TalentStep: real _filterTreesBySearch(), a second catalog proving
 *     the shared helper (not just Feat/Species) is actually consumed.
 * ------------------------------------------------------------------ */
{
  const step = Object.create(TalentStep.prototype);
  const trees = [
    { id: 'guardian', name: 'Jedi Guardian', system: { description: 'A path focused on lightsaber combat and Stealth-defying presence.' } },
    { id: 'consular', name: 'Jedi Consular', system: { description: 'A path focused on the Force and diplomacy.' } },
  ];
  step._searchQuery = 'stealth';
  const filtered = step._filterTreesBySearch(trees);
  assert.deepEqual(filtered.map(t => t.id), ['guardian'], 'TalentStep tree description search did not use the canonical matcher');

  const src = read('scripts/apps/progression-framework/steps/talent-step.js');
  assert.match(src, /from ['"]\.\.\/utils\/progression-search\.js['"]/, 'talent-step.js does not import the canonical search module');
  assert.match(src, /compileProgressionSearchQuery\(/, 'talent-step.js does not call compileProgressionSearchQuery');
}

console.log('progression-search (step integration): all assertions passed');

/* ==================================================================== *
 * (c) Static contract: every other migrated step imports from and calls
 *     into the canonical module — not a reintroduced hand-rolled matcher.
 * ==================================================================== */
{
  const migratedSteps = [
    'background-step.js',
    'class-step.js',
    'force-power-step.js',
    'force-regimen-step.js',
    'force-secret-step.js',
    'force-technique-step.js',
    'medical-secret-step.js',
    'starship-maneuver-step.js',
  ];
  const offenders = [];
  for (const name of migratedSteps) {
    const src = read(`scripts/apps/progression-framework/steps/${name}`);
    const importsModule = /from ['"]\.\.\/utils\/progression-search\.js['"]/.test(src);
    const callsCompile = /compileProgressionSearchQuery\(/.test(src);
    const callsBuildText = /buildProgressionSearchText\(/.test(src);
    if (!importsModule || !callsCompile || !callsBuildText) {
      offenders.push(`${name}: importsModule=${importsModule} callsCompile=${callsCompile} callsBuildText=${callsBuildText}`);
    }
  }
  assert.deepEqual(offenders, [],
    `step(s) not wired into the canonical search module:\n  ${offenders.join('\n  ')}`);

  // No step should still carry a hand-rolled name-only substring matcher as
  // its ACTIVE search implementation (a `.toLowerCase().includes(` call
  // sitting directly in an _applyFilters()/_getFilteredX() body, unguarded
  // by the canonical compiled matcher, would be the old pattern creeping
  // back in).
  for (const name of migratedSteps) {
    const src = read(`scripts/apps/progression-framework/steps/${name}`);
    const filterMethodMatch = src.match(/_applyFilters\([^)]*\)\s*\{[\s\S]*?\n  \}/) || src.match(/_getFilteredBackgrounds\([^)]*\)\s*\{[\s\S]*?\n\}/);
    if (!filterMethodMatch) continue; // covered by the search-query gate above regardless
    const body = filterMethodMatch[0];
    if (/_searchQuery/.test(body)) {
      assert.ok(/compiled\.test\(/.test(body) || /compileProgressionSearchQuery/.test(body),
        `${name}: its filter method reads _searchQuery but does not route through the compiled canonical matcher`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Phase 2 partial rendering is untouched: search-triggering requestRender()
 * calls in every migrated step still declare the work-surface/utility
 * region scope established in Phase 2.1 — rich search must not have quietly
 * regressed these back to structural rendering.
 * ------------------------------------------------------------------ */
{
  const searchDrivenSteps = [
    'background-step.js', 'feat-step.js', 'force-power-step.js', 'force-regimen-step.js',
    'force-secret-step.js', 'force-technique-step.js', 'medical-secret-step.js',
    'species-step.js', 'starship-maneuver-step.js',
  ];
  const offenders = [];
  for (const name of searchDrivenSteps) {
    const src = read(`scripts/apps/progression-framework/steps/${name}`);
    // Every onSearch handler (wired to prog:utility:search) in these files
    // must still request the partial region scope.
    const onSearchIdx = src.indexOf('onSearch');
    if (onSearchIdx < 0) continue;
    const nearby = src.slice(onSearchIdx, src.indexOf('\n  ', src.indexOf('};', onSearchIdx)) + 1);
    if (/requestRender\(/.test(nearby) && !/regions\s*:/.test(nearby) && !/structural\s*:\s*true/.test(nearby)) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, [],
    `search handler(s) lost their Phase 2 partial-render region scope:\n  ${offenders.join('\n  ')}`);
}

console.log('progression-search: all assertions passed');
