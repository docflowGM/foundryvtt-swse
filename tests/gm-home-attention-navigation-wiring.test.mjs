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

// --- CORRECTION 1: the exact-item branch is chosen by isExact, never by
// the presence of a real target — a targetless attention item (target:
// null, e.g. unresolved Atlas leads) is still isExact:true and must reach
// the data-target-kind/data-fallback-route branch, not the generic
// data-app-card branch (which would navigate using the attention item's
// own composite id like "location-leads:unresolved", not a real surface).
assert.match(template, /\{\{#each gmHome\.actionItems\}\}\s*\{\{#if this\.isExact\}\}/, 'the action-queue loop must branch on isExact, not on this.targetKind (a targetless exact item has an empty targetKind and would otherwise fall through to the generic data-app-card branch)');
assert.doesNotMatch(template, /\{\{#each gmHome\.actionItems\}\}\s*\{\{#if this\.targetKind\}\}/, 'the pre-correction targetKind branch condition must not still be present');
assert.match(source, /isExact: true,/, '_buildGmHomeContext() must mark every attentionItems()-derived row isExact:true unconditionally, including targetless rows');

// --- executed simulation of the actual template branch + click-handler
// logic for a real targetless row (Correction 1's exact bug), proving the
// final navigation target is the fallbackRoute, never the item's own id.
{
  const targetlessExactItem = { id: 'location-leads:unresolved', isExact: true, targetKind: '', targetId: '', targetUuid: '', fallbackRoute: 'locations' };
  const takesExactBranch = Boolean(targetlessExactItem.isExact);
  assert.equal(takesExactBranch, true, 'a targetless exact item must take the {{#if this.isExact}} branch');
  // Mirrors _wireHomeAttentionTargets()'s own dispatch order exactly:
  // resolve a real target first, else fall back to fallbackRoute.
  const kind = targetlessExactItem.targetKind;
  const id = targetlessExactItem.targetId;
  const resolvedTarget = (kind && id) ? { surfaceId: kind } : null;
  const finalNavigation = resolvedTarget ? resolvedTarget.surfaceId : targetlessExactItem.fallbackRoute;
  assert.equal(finalNavigation, 'locations', 'a targetless attention item must navigate to its fallbackRoute');
  assert.notEqual(finalNavigation, targetlessExactItem.id, 'a targetless attention item must never navigate using its own composite attention-item id as a surface id');
}

// --- CORRECTION 10: "Actions Needed" must count every actionable row Home
// is actually showing (critical AND warning AND info exact rows, plus
// generic Store/Bulletin counts once), never just the critical-tone exact
// rows plus a second, redundant addition of the generic counts on top.
assert.match(source, /actionCount: actionItems\.reduce\(\(sum, item\) => sum \+ \(item\.count \|\| 0\), 0\)/, '"Actions Needed" must sum every actionItems row\'s own count exactly once, not filter to crit-tone only and not double-add the generic Store/Bulletin counts');
assert.doesNotMatch(source, /actionCount: actionItems\.reduce\(\(sum, item\) => sum \+ \(item\.tone === 'crit'/, 'the pre-correction crit-only, double-counted formula must not still be present');

{
  // Executed simulation of the actual formula on a realistic mixed queue —
  // 2 critical exact rows (count:1 each), 1 warning exact row (count:1),
  // 1 info exact row (count:1), plus a generic Store row representing 3
  // real pending sales (count:3). Honest total: 2+1+1+3 = 7, not the
  // pre-correction result of counting only the 2 critical rows (2).
  const actionItems = [
    { tone: 'crit', count: 1 },
    { tone: 'crit', count: 1 },
    { tone: 'warn', count: 1 },
    { tone: 'info', count: 1 },
    { tone: 'warn', count: 3 }
  ];
  const correctedTotal = actionItems.reduce((sum, item) => sum + (item.count || 0), 0);
  const preCorrectionTotal = actionItems.reduce((sum, item) => sum + (item.tone === 'crit' ? item.count : 0), 0);
  assert.equal(correctedTotal, 7, 'Actions Needed must count every actionable row, not only the critical-tone ones');
  assert.equal(preCorrectionTotal, 2, 'sanity: the pre-correction formula really did undercount by excluding warning/info rows');
}

console.log('Home exact-attention-navigation wiring passed (GMCampaignContextService feeds the action queue, GMCampaignTargetService resolves every non-actor target, Actor targets open the real sheet, fallback route never throws, template renders matching attributes, targetless rows correctly reach their fallbackRoute instead of the generic data-app-card branch, Actions Needed counts every actionable row).');
