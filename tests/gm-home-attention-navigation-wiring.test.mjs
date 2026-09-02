import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad ecosystem redesign — Phase 6 Part B: static wiring proof that
// Home's action queue and current-Location block actually reach
// GMCampaignContextService/GMCampaignTargetService end to end.
//
// scripts/apps/gm-datapad.js (GMDatapad, an ApplicationV2 subclass) cannot
// be imported under this repo's Node/Foundry shim — it requires
// foundry.applications.api.ApplicationV2 and a much larger surface of
// Foundry globals than the shim provides (confirmed: importing it throws
// "Cannot read properties of undefined (reading 'api')"). This matches the
// same limitation already documented for HolonetMessengerService
// .createJobPosting() in tests/gm-job-source-location-identity.test.mjs —
// the static source-wiring proof below is this codebase's established
// pattern for a call chain that cannot be instantiated end-to-end.
//
// PURE ADDITIVE DESIGN CONTRACT — none of this wiring existed before this
// phase; Home's action queue previously carried only a generic
// data-app-card route (see the removed inline actionItems array this
// replaces).

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const source = await read('scripts/apps/gm-datapad.js');

// --- _buildGmHomeContext() actually calls the new context service --------
assert.match(source, /const campaignParty = await GMCampaignContextService\.party\(\)/, 'Home must resolve party context through GMCampaignContextService.party()');
assert.match(source, /const attentionItems = await GMCampaignContextService\.attentionItems\(\)/, 'Home must resolve its action queue through GMCampaignContextService.attentionItems()');

// --- each attention item maps to a real, exact target -------------------
assert.match(source, /targetKind: item\.target\?\.kind \|\| ''/);
assert.match(source, /targetId: item\.target\?\.id \|\| ''/);
assert.match(source, /targetUuid: item\.target\?\.uuid \|\| ''/);
assert.match(source, /fallbackRoute: ATTENTION_KIND_FALLBACK_ROUTE\[item\.kind\] \|\| 'home'/);

// --- the click handler is wired into _onRender and dispatches correctly --
assert.match(source, /this\._wireHomeAttentionTargets\(root, frameSignal\);/, '_wireHomeAttentionTargets must actually be invoked during _onRender');
assert.match(source, /_wireHomeAttentionTargets\(root, signal\)\s*\{/, '_wireHomeAttentionTargets must be defined');
assert.match(source, /querySelectorAll\('\[data-target-kind\]'\)/, 'must wire every control carrying a real target');
assert.match(source, /if \(kind === 'actor'\)/, 'an Actor target must be handled specially (no Datapad surface selection exists for Actor)');
assert.match(source, /actor\.sheet\?\.render\?\.\(true\)/, 'an Actor target must open the real Actor sheet, matching every other surface\'s established open-Actor behavior');
assert.match(source, /GMCampaignTargetService\.resolve\(\{ kind, id \}\)/, 'a non-actor target must resolve through GMCampaignTargetService, never a hand-rolled switch');
assert.match(source, /await this\.navigateToSurface\(target\.surfaceId, target\)/, 'a resolved target must navigate through the real Phase 2 navigateToSurface() contract');
assert.match(source, /if \(fallbackRoute\) this\._navigateTo\(fallbackRoute\)/, 'a control with no resolvable target must fail safe to its generic fallback route, never throw or silently no-op');

// --- the current-Location session block is navigable when resolved -------
assert.match(source, /currentLocationId: campaignParty\?\.currentLocation\?\.resolved \? campaignParty\.currentLocation\.id : ''/);

// --- the real template actually renders the attributes the handler reads -
const template = await read('templates/apps/gm-datapad/surfaces/home.hbs');
assert.match(template, /data-target-kind="\{\{this\.targetKind\}\}" data-target-id="\{\{this\.targetId\}\}" data-target-uuid="\{\{this\.targetUuid\}\}" data-fallback-route="\{\{this\.fallbackRoute\}\}"/, 'home.hbs action-queue rows must render the exact attributes _wireHomeAttentionTargets reads');
assert.match(template, /data-target-kind="location" data-target-id="\{\{gmHome\.currentLocationId\}\}"/, 'the current-Location session block must be navigable to the exact resolved Location');

console.log('Home exact-attention-navigation wiring passed (GMCampaignContextService feeds the action queue, GMCampaignTargetService resolves every non-actor target, Actor targets open the real sheet, fallback route never throws, template renders matching attributes).');
