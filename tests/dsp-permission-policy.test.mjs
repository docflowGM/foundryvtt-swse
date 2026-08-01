import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals, resetFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Phase 3 — real behavioral coverage for DarkSideScoreAccessPolicy, using
// the existing Foundry-shim harness. Exercises the real production module,
// not a reimplementation of its decision logic.

registerFoundryPathLoader();

const { DarkSideScoreAccessPolicy } = await import(
  '/systems/foundryvtt-swse/scripts/engine/darkside/dark-side-score-access-policy.js'
);

function actor(overrides = {}) {
  return { id: 'actor-1', name: 'Test Actor', isOwner: false, ...overrides };
}

// HouseRuleService.getString requires a full working settings API
// (get + set + settings.has) to consider the setting "registered" and
// actually read the live value — a get-only stub silently falls through
// to the caller's own default instead.
function settingsShim(policy) {
  return {
    game: {
      settings: {
        get: (_ns, key) => (key === 'darkSideScoreEditPolicy' ? policy : undefined),
        set: async () => {},
        settings: { has: (fullKey) => fullKey === 'foundryvtt-swse.darkSideScoreEditPolicy' }
      }
    }
  };
}

function withGm(gm) {
  return { user: { isGM: gm } };
}

// gmOnly + GM + editable -> allowed
{
  installFoundryShimGlobals(settingsShim('gmOnly'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor(), { ...withGm(true), sheetEditable: true }), true);
  resetFoundryShimGlobals();
}

// gmOnly + GM + non-editable sheet -> blocked (everyone, including GMs, is blocked when the sheet is explicitly non-editable)
{
  installFoundryShimGlobals(settingsShim('gmOnly'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor(), { ...withGm(true), sheetEditable: false }), false);
  resetFoundryShimGlobals();
}

// gmOnly + owner-non-GM -> blocked
{
  installFoundryShimGlobals(settingsShim('gmOnly'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: true }), { ...withGm(false), sheetEditable: true }), false);
  resetFoundryShimGlobals();
}

// gmOnly + non-owner -> blocked
{
  installFoundryShimGlobals(settingsShim('gmOnly'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: false }), { ...withGm(false), sheetEditable: true }), false);
  resetFoundryShimGlobals();
}

// ownerOrGM + GM + editable -> allowed
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor(), { ...withGm(true), sheetEditable: true }), true);
  resetFoundryShimGlobals();
}

// ownerOrGM + GM + non-editable sheet -> blocked
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor(), { ...withGm(true), sheetEditable: false }), false);
  resetFoundryShimGlobals();
}

// ownerOrGM + owner + editable -> allowed
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: true }), { ...withGm(false), sheetEditable: true }), true);
  resetFoundryShimGlobals();
}

// ownerOrGM + owner + sheetEditable:false -> blocked
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: true }), { ...withGm(false), sheetEditable: false }), false);
  resetFoundryShimGlobals();
}

// ownerOrGM + non-owner -> blocked
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: false }), { ...withGm(false), sheetEditable: true }), false);
  resetFoundryShimGlobals();
}

// invalid/garbage policy string -> fails closed to gmOnly behavior
{
  installFoundryShimGlobals(settingsShim('bogus-value'));
  assert.equal(
    DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: true }), { ...withGm(false), sheetEditable: true }),
    false,
    'an unrecognized policy value must not silently behave like ownerOrGM'
  );
  resetFoundryShimGlobals();
}

// missing user -> blocked. `user: null` (not `undefined`) is used
// deliberately — a destructured default only kicks in for `undefined`,
// so `null` is what actually exercises the "no user available" branch
// instead of silently falling back to game.user.
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(actor({ isOwner: true }), { user: null, sheetEditable: true }), false);
  resetFoundryShimGlobals();
}

// missing actor -> blocked
{
  installFoundryShimGlobals(settingsShim('ownerOrGM'));
  assert.equal(DarkSideScoreAccessPolicy.canEdit(null, { ...withGm(true), sheetEditable: true }), false);
  assert.equal(DarkSideScoreAccessPolicy.canEdit(undefined, { ...withGm(true), sheetEditable: true }), false);
  resetFoundryShimGlobals();
}

// getReadOnlyReason returns '' when editable, and the exact policy-specific message otherwise
{
  installFoundryShimGlobals();
  assert.equal(
    DarkSideScoreAccessPolicy.getReadOnlyReason(actor(), { ...withGm(true), sheetEditable: true }),
    ''
  );
  assert.equal(
    DarkSideScoreAccessPolicy.getReadOnlyReason(actor({ isOwner: false }), { user: { isGM: false }, sheetEditable: true, policy: 'gmOnly' }),
    'Only the Gamemaster can edit this Dark Side Score.'
  );
  assert.equal(
    DarkSideScoreAccessPolicy.getReadOnlyReason(actor({ isOwner: false }), { user: { isGM: false }, sheetEditable: true, policy: 'ownerOrGM' }),
    'You do not have permission to edit this Dark Side Score.'
  );
  resetFoundryShimGlobals();
}

resetFoundryShimGlobals();
console.log('DSP permission policy tests passed.');
