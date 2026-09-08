import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad ecosystem redesign — Phase 1T: static template contract.
//
// Proves the campaign-hub information architecture is actually rendered —
// Current Situation, the four Campaign Relationships cards (Factions,
// Contacts & NPCs, Jobs, Intel & Leads), Preparation (Encounter Seeds,
// Scenes), and World Detail (Child Locations, Atlas Facts) — and that the
// relationship rows carry stable identifiers (data-faction-id,
// data-actor-uuid / data-contact-id, data-job-id, data-intel-id,
// data-lead-id) rather than depending on matching visible text, per the
// Phase 1 "no text-name identity" requirement.

const root = new URL('../', import.meta.url);
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/locations.hbs', root), 'utf8');

const SECTION_HEADINGS = [
  'Current Situation',
  'Campaign Relationships',
  'Factions Present',
  'Contacts &amp; NPCs',
  'Jobs Here',
  'Intel &amp; Leads',
  'Encounter Seeds',
  'Scenes &amp; Maps',
  'Child Locations',
  'Atlas Facts',
  'World Detail'
];
for (const heading of SECTION_HEADINGS) {
  assert.ok(template.includes(heading), `expected the campaign-hub template to render a "${heading}" section`);
}

// Current Situation strip — live campaign state fields.
const situationBlock = template.match(/gm-location-current-situation[\s\S]*?gm-location-situation-grid[\s\S]*?<\/section>/);
assert.ok(situationBlock, 'expected the Current Situation section to render its situation grid');
for (const field of ['currentSituation.partyHere', 'currentSituation.controllingFaction', 'currentSituation.activeJobCount', 'currentSituation.unresolvedLeadCount', 'currentSituation.encounterSeedCount', 'currentSituation.sceneReady']) {
  assert.ok(template.includes(field), `expected the Current Situation strip to reference ${field}`);
}

// Campaign Relationships — stable identity, not text identity.
const STABLE_ID_ATTRS = {
  'data-faction-id': /data-faction-id="\{\{this\.id\}\}"/,
  'data-job-id': /data-job-id="\{\{this\.id\}\}"/,
  'data-intel-id': /data-intel-id="\{\{this\.id\}\}"/,
  'data-lead-id': /data-lead-id="\{\{this\.id\}\}"/
};
for (const [label, pattern] of Object.entries(STABLE_ID_ATTRS)) {
  assert.match(template, pattern, `expected a relationship row carrying a stable ${label} identifier`);
}
assert.match(template, /data-contact-id="\{\{this\.id\}\}" data-actor-uuid="\{\{this\.actorUuid\}\}"/, 'expected Contacts & NPCs rows to carry stable contact/actor identity');

// Relationships must resolve real labels, not raw ids or copied text.
assert.match(template, /this\.relationships\.jobs/, 'Jobs Here must iterate relationships.jobs (resolved rows), not a raw jobRows id list');
assert.match(template, /this\.relationships\.intel/, 'Intel & Leads must iterate relationships.intel (resolved rows), not a raw intelRows id list');
assert.doesNotMatch(template, /Intel record \{\{id\}\}/, 'the old "Intel record {{id}}" placebo label must be gone — Intel titles must resolve for real');
assert.doesNotMatch(template, /Job record \{\{id\}\}/, 'the old "Job record {{id}}" placebo label must be gone — Job titles must resolve for real');

// Preparation stays a separate concept from Campaign Relationships (Atlas
// Lead / Intel / Encounter Seed / Atlas Fact must not be collapsed into one
// card).
const relationshipsSection = template.match(/Campaign Relationships[\s\S]*?<\/section>/)[0];
assert.doesNotMatch(relationshipsSection, /Encounter Seed/, 'Encounter Seeds must not appear inside the Campaign Relationships section — it belongs to Preparation');
const preparationSection = template.match(/GM Preparation[\s\S]*?<\/section>/)[0];
assert.doesNotMatch(preparationSection, /Factions Present|Jobs Here/, 'Campaign Relationships content must not leak into the Preparation section');

// Existing Phase 0-Stage 3 controls preserved: Atlas Fact / Encounter Seed
// authoring forms, and the Phase 2 action-value vocabulary this template
// already had to keep (checked in full by
// gm-locations-operational-ui-action-matrix.test.mjs; spot-checked here as
// part of the ecosystem contract).
assert.match(template, /<form data-atlas-fact-form>/, 'the Atlas Fact authoring form must still render inside World Detail');
assert.match(template, /<form data-encounter-seed-form>/, 'the Encounter Seed authoring form must still render inside Preparation');
assert.match(template, /data-location-action="stage-encounter-seeds"/);
assert.match(template, /data-location-action="create-scene"/);
assert.match(template, /data-location-action="remove-seed"/);

// The registry list keeps real filtering/search capability, not a
// search-only reduction (Phase 1K).
for (const filter of ['data-location-filter="search"', 'data-filter-key="category"', 'data-filter-key="type"', 'data-filter-key="revealState"', 'data-filter-key="special"']) {
  assert.ok(template.includes(filter), `expected the registry list to preserve the ${filter} filter`);
}

console.log('GM Locations ecosystem template contract passed (Current Situation / four Campaign Relationships cards / Preparation / World Detail all render, relationship rows carry stable ids, Intel and Jobs resolve real labels, Preparation/Relationships stay conceptually separate, existing filters and authoring forms preserved).');
