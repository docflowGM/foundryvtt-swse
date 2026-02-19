// scripts/debug/smoke-test.js
import { ensureNpcProgressionMode, revertNpcToStatblock } from '../engine/npc-levelup.js';
import { getLevelSplit } from '../actors/derived/level-split.js';
import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
import { isStatblockNpc, shouldSkipDerivedData } from '../utils/hardening.js';
import { isEpicOverrideEnabled } from '../settings/epic-override.js';

const TEST_ACTOR_NAME = '__SWSE_SMOKE_TEST_NPC__';

function getSelectedActor() {
  const token = canvas?.tokens?.controlled?.[0];
  return token?.actor ?? null;
}

async function getOrCreateTestNpc() {
  const existing = game.actors?.getName?.(TEST_ACTOR_NAME);
  if (existing) {return existing;}

  const data = {
    name: TEST_ACTOR_NAME,
    type: 'npc',
    img: 'icons/svg/mystery-man.svg',
    system: { level: 1 }
  };

  return await Actor.create(data, { renderSheet: true });
}

function li(ok, label, details = '') {
  const icon = ok ? '✅' : '⚠️';
  const d = details ? ` <span class="swse-smoke-details">${details}</span>` : '';
  return `<li>${icon} <strong>${label}</strong>${d}</li>`;
}

function summarize(actor) {
  const mode = actor.getFlag('foundryvtt-swse', 'npcLevelUp.mode') ?? 'statblock';
  const split = getLevelSplit(actor);
  const ehl = getEffectiveHalfLevel(actor);
  const epic = isEpicOverrideEnabled();

  return `
    <div class="swse-smoke-summary">
      <p><strong>Actor:</strong> ${actor.name}</p>
      <ul>
        <li><strong>mode</strong>: ${mode}</li>
        <li><strong>heroicLevel</strong>: ${split.heroicLevel}</li>
        <li><strong>nonheroicLevel</strong>: ${split.nonheroicLevel}</li>
        <li><strong>totalLevel</strong>: ${Number(actor.system?.level) || split.totalLevel}</li>
        <li><strong>effectiveHalfLevel</strong>: ${ehl}</li>
        <li><strong>Epic Override</strong>: ${epic ? 'ON' : 'OFF'}</li>
      </ul>
    </div>
  `;
}

/**
 * Run the NPC smoke test checklist (fast sanity check).
 *
 * Usage (macro):
 *   await game.swse.debug.runSmokeTest();
 */
export async function runNpcSmokeTest(actor = null) {
  if (!game.user?.isGM) {
    ui?.notifications?.warn?.('GM only.');
    return;
  }

  actor ??= getSelectedActor();
  actor ??= await getOrCreateTestNpc();

  if (actor.type !== 'npc') {
    ui?.notifications?.warn?.('Select an NPC actor (or run with none selected to auto-create).');
    return;
  }

  const results = [];
  const initialItems = actor.items?.size ?? actor.items?.length ?? 0;

  results.push(li(true, 'Loaded actor', `${actor.id}`));
  results.push(li(isStatblockNpc(actor), 'Statblock mode recognized', `mode=${actor.getFlag('foundryvtt-swse', 'npcLevelUp.mode') ?? 'statblock'}`));
  results.push(li(shouldSkipDerivedData(actor) === isStatblockNpc(actor), 'Derived-data skip is consistent', `skip=${shouldSkipDerivedData(actor)}`));

  try {
    await ensureNpcProgressionMode(actor, { track: 'heroic' });
    const snap = actor.getFlag('foundryvtt-swse', 'npcLevelUp.snapshot');
    const okSnap = !!snap?.system && Array.isArray(snap?.items) && Array.isArray(snap?.effects);
    results.push(li(okSnap, 'Snapshot captured (system/items/effects)', okSnap ? 'ok' : 'missing fields'));

    const modeNow = actor.getFlag('foundryvtt-swse', 'npcLevelUp.mode');
    results.push(li(modeNow === 'progression', 'Switched to progression mode', `mode=${modeNow}`));

    await revertNpcToStatblock(actor);
    const modeAfter = actor.getFlag('foundryvtt-swse', 'npcLevelUp.mode') ?? 'statblock';
    results.push(li(modeAfter !== 'progression', 'Reverted to statblock mode', `mode=${modeAfter}`));

    const itemsAfter = actor.items?.size ?? actor.items?.length ?? 0;
    results.push(li(itemsAfter === initialItems, 'Rollback restored item count', `${initialItems} → ${itemsAfter}`));
  } catch (err) {
    console.error('SWSE Smoke Test failed', err);
    results.push(li(false, 'Snapshot/rollback roundtrip', err?.message ?? 'error'));
  }

  const { heroicLevel } = getLevelSplit(actor);
  const epic = isEpicOverrideEnabled();
  const heroicNext = (Number(heroicLevel) || 0) + 1;
  const epicBlocked = heroicNext > 20 && !epic;

  results.push(li(true, 'Epic gating computed', epicBlocked ? 'blocked (expected if Epic Override OFF)' : 'not blocked'));

  const html = `
    <div class="swse-smoke-test">
      <h3>SWSE NPC Smoke Test</h3>
      ${summarize(actor)}
      <ol>${results.join('')}</ol>
      <hr/>
      <p><strong>Manual 30s checks:</strong></p>
      <ul>
        <li>Open the NPC sheet: confirm attacks/damage are flat totals in statblock mode.</li>
        <li>Use <em>Level Up</em> → Heroic: confirm derived math activates and no drift.</li>
        <li>Use <em>Level Up</em> → Nonheroic: confirm no talent prompts.</li>
        <li>Try level 20→21 with Epic Override OFF: confirm blocked. Turn it ON: confirm advisory banner.</li>
      </ul>
    </div>
  `;

  ChatMessage.create({
    speaker: { alias: 'SWSE Smoke Test' },
    content: html,
    whisper: [game.user.id]
  });
}
