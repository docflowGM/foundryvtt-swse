import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { FakeElement, createFakeDocument } from './helpers/foundry-shim/fakes/mini-dom.fake.mjs';

// SWSE OOC chat card — extends chat-surface-enhancer.js's existing IC/EMOTE
// "plain dialogue -> holo card" upgrade path to ordinary OOC chat, using the
// same swse-dialogue-card family (a swse-dialogue-card--ooc modifier) so OOC
// shares the holo-card visual language while staying visually quieter than
// roll/combat cards. Scope: UI/chat rendering only -- no Attack/Damage math
// touched.
//
// Uses a small self-contained fake DOM (tests/helpers/foundry-shim/fakes/
// mini-dom.fake.mjs; no jsdom dependency in this repo) rather than testing
// against source text, so these checks exercise the real parsing/upgrade
// logic, not just its presence.
//
// Expected console noise: enhanceSWSEChatMessage() also runs
// AbilityWordHighlighter/SignedNumberHighlighter over every found surface;
// both need document.createTreeWalker/NodeFilter, which this mini DOM
// deliberately does not implement (out of this task's scope). Both calls
// are individually try/caught by the production code itself, so the
// "[SWSE Chat] ... highlighting failed" warnings below are harmless and do
// not affect any assertion here -- same documented harness boundary as
// other test files in this repo that don't shim the full visual-enhancer
// stack.

registerFoundryPathLoader();
installFoundryShimGlobals({
  CONST: { CHAT_MESSAGE_STYLES: { OTHER: 0, OOC: 1, IC: 2, EMOTE: 3 } }
});

globalThis.HTMLElement = FakeElement;
globalThis.document = createFakeDocument();
globalThis.window = globalThis.window ?? {};

const { enhanceSWSEChatMessage } = await import(
  '/systems/foundryvtt-swse/scripts/ui/chat/chat-surface-enhancer.js'
);

let step = 0;
function ok(label) { step += 1; console.log(`  [${step}] ${label} OK`); }

function makeRoot(contentHtml) {
  const root = new FakeElement('li');
  root.setAttribute('class', 'chat-message');
  const content = new FakeElement('div');
  content.setAttribute('class', 'message-content');
  content.innerHTML = contentHtml;
  content.parentElement = root;
  root.childNodes = [content];
  return root;
}

function messageContentOf(root) {
  return root.querySelector('.message-content');
}

function makeMessage({ style, speakerAlias = 'Cody', timestamp = Date.UTC(2026, 0, 1, 8, 32), whisper = [], flags = {} } = {}) {
  return { id: 'msg-1', style, speaker: { alias: speakerAlias }, timestamp, whisper, flags };
}

const { OOC, IC, EMOTE } = CONST.CHAT_MESSAGE_STYLES;

// ─── 1. OOC plain message -> SWSE OOC card ─────────────────────────────────
{
  const root = makeRoot('I think we should check the west door before we head downstairs.');
  const message = makeMessage({ style: OOC });

  const changed = enhanceSWSEChatMessage(message, root);
  assert.equal(changed, true, 'enhancer should report a change for a plain OOC message');

  const card = messageContentOf(root).querySelector('.swse-dialogue-card--ooc');
  assert.ok(card, 'an OOC card must be created');
  assert.equal(card.getAttribute('data-swse-chat-surface'), 'ooc');
  assert.equal(card.getAttribute('data-swse-chat-card-v2'), 'true');
  assert.ok(card.classList.contains('swse-chat-card'), 'OOC card stays in the shared swse-chat-card family');
  assert.ok(card.classList.contains('swse-dialogue-card'), 'OOC card reuses the dialogue-card base, not a new card type');

  assert.ok(card.querySelector('.corners'), 'holo-card corner chrome is present');
  assert.ok(card.querySelector('.headtick'), 'holo-card headtick chrome is present');

  const chip = card.querySelector('.type-chip--ooc');
  assert.ok(chip, 'the OOC-specific type chip must be present');
  assert.ok(chip.textContent.includes('OOC'), 'chip label reads OOC, not Dialogue/Emote');

  const who = card.querySelector('.who');
  assert.equal(who.textContent, 'Cody');

  const ts = card.querySelector('.ts');
  assert.equal(ts.textContent, '08:32');

  const body = card.querySelector('.swse-ooc-body');
  assert.ok(body, 'the OOC body container must use the swse-ooc-body class for scoped styling');
  assert.equal(body.textContent, 'I think we should check the west door before we head downstairs.', 'original message text must survive verbatim inside the OOC body');
}
ok('OOC plain message -> SWSE OOC card (swse-dialogue-card--ooc, type-chip--ooc, swse-ooc-body)');

// ─── 2. IC -> existing Dialogue card unchanged ─────────────────────────────
{
  const root = makeRoot('Move to the door.');
  const message = makeMessage({ style: IC });

  enhanceSWSEChatMessage(message, root);

  const card = messageContentOf(root).querySelector('.swse-dialogue-card');
  assert.ok(card, 'IC message must still get the existing Dialogue card');
  assert.ok(!card.classList.contains('swse-dialogue-card--ooc'), 'IC card must never carry the OOC modifier class');
  assert.equal(card.getAttribute('data-swse-chat-surface'), 'dialogue');

  const chip = card.querySelector('.type-chip');
  assert.equal(chip.textContent.trim(), 'Dialogue', 'IC label text is unchanged by adding OOC support');
  assert.equal(card.querySelector('.type-chip--ooc'), null, 'IC card must not pick up the OOC chip variant');
}
ok('IC -> existing Dialogue card unchanged (label, classes, structure)');

// ─── 3. EMOTE -> existing behavior unchanged ───────────────────────────────
{
  const root = makeRoot('waves at the group.');
  const message = makeMessage({ style: EMOTE });

  enhanceSWSEChatMessage(message, root);

  const card = messageContentOf(root).querySelector('.swse-dialogue-card');
  assert.ok(card);
  assert.ok(!card.classList.contains('swse-dialogue-card--ooc'));
  const chip = card.querySelector('.type-chip');
  assert.equal(chip.textContent.trim(), 'Emote', 'EMOTE label text is unchanged by adding OOC support');
}
ok('EMOTE -> existing behavior unchanged');

// ─── 4. Existing SWSE card -> not double-wrapped ───────────────────────────
{
  const existingCardHtml = '<div class="swse-chat-card swse-holonet-card" data-swse-chat-surface="holonet" data-swse-chat-card-v2="true"><div class="head">Incoming Transmission</div></div>';
  const root = makeRoot(existingCardHtml);
  const message = makeMessage({ style: OOC });

  enhanceSWSEChatMessage(message, root);

  // The existing surface is still found/annotated by the generic surface
  // pipeline (data-swse-enhanced etc., unrelated to this task) -- what this
  // proves is that the OOC/dialogue upgrade step never touched it: exactly
  // one top-level card, still the original holonet card, inner content
  // ("Incoming Transmission") preserved, and no OOC wrapper layered around
  // or inside it.
  const cards = root.querySelectorAll('.swse-chat-card');
  assert.equal(cards.length, 1, 'exactly one card must exist -- the original, not a wrapped copy');
  assert.ok(cards[0].classList.contains('swse-holonet-card'), 'the original holonet card must remain the surface, untouched by the OOC/dialogue upgrade');
  assert.equal(root.querySelectorAll('.swse-dialogue-card--ooc').length, 0, 'no OOC card should be layered on top of an existing SWSE surface');
  assert.ok(cards[0].querySelector('.head').textContent.includes('Incoming Transmission'), 'original card content must be preserved');
}
ok('existing SWSE card -> not double-wrapped');

// ─── 5. Roll/system message -> not converted into OOC ──────────────────────
{
  // Foundry's own core Roll chat content always includes a .dice-roll
  // block; this is the exact guard chat-surface-enhancer.js already uses
  // to distinguish a roll from plain chat, regardless of message style.
  const root = makeRoot('<div class="dice-roll"><div class="dice-formula">1d20+5</div><div class="dice-result"><h4 class="dice-total">18</h4></div></div>');
  const message = makeMessage({ style: OOC });

  enhanceSWSEChatMessage(message, root);

  assert.equal(root.querySelectorAll('.swse-dialogue-card--ooc').length, 0, 'a roll message must never become an OOC card even if its style is OOC');
}
ok('roll/system message -> not converted into OOC');

// ─── 6. Re-running enhancer -> no duplicate wrapper ────────────────────────
{
  const root = makeRoot('Well, that went sideways.');
  const message = makeMessage({ style: OOC });

  enhanceSWSEChatMessage(message, root);
  const firstPass = messageContentOf(root).innerHTML;

  enhanceSWSEChatMessage(message, root);
  const secondPass = messageContentOf(root).innerHTML;

  assert.equal(secondPass, firstPass, 'a second enhancer pass over an already-upgraded OOC message must be a no-op');
  assert.equal(root.querySelectorAll('.swse-dialogue-card--ooc').length, 1, 'exactly one OOC card must exist after re-running the enhancer');
}
ok('re-running enhancer -> no duplicate wrapper (idempotent)');

// ─── 7. Whisper + OOC style -> still an OOC card (style-driven, not whisper-driven) ───
{
  const root = makeRoot('Psst, over here.');
  const message = makeMessage({ style: OOC, whisper: ['user-2'] });

  enhanceSWSEChatMessage(message, root);

  const card = messageContentOf(root).querySelector('.swse-dialogue-card--ooc');
  assert.ok(card, 'a whispered message that Foundry itself classifies as OOC style must still get the OOC card');
}
ok('whisper + OOC style -> OOC card (style governs, not whisper presence)');

// ─── 8. Whisper + IC style -> Dialogue card, never OOC ─────────────────────
{
  const root = makeRoot('(whispered) Watch the flank.');
  const message = makeMessage({ style: IC, whisper: ['user-2'] });

  enhanceSWSEChatMessage(message, root);

  assert.equal(root.querySelectorAll('.swse-dialogue-card--ooc').length, 0, 'a whispered IC message must never be reclassified as OOC just because it is private');
  assert.ok(messageContentOf(root).querySelector('.swse-dialogue-card'), 'it still gets the ordinary Dialogue card');
}
ok('whisper + IC style -> Dialogue card, never inferred as OOC');

console.log(`\nAll ${step} OOC chat card surface checks passed.`);
