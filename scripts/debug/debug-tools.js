// scripts/debug/debug-tools.js
import { DEBUG_SETTINGS } from './debug-settings.js';
import { runNpcSmokeTest } from './smoke-test.js';
import { reportV2Slippage } from './v2-slippage-lint.js';
import MentorNotesApp from '../apps/mentor-notes/mentor-notes-app.js';

export async function toggleNpcRenderProbe() {
  const key = DEBUG_SETTINGS.NPC_RENDER_PROBE;
  const cur = !!game.settings.get('foundryvtt-swse', key);
  await game.settings.set('foundryvtt-swse', key, !cur);
  ui?.notifications?.info?.(`NPC Render Probe: ${!cur ? 'ON' : 'OFF'}`);
  return !cur;
}

export function openMentorNotes(actor) {
  const a = actor ?? canvas?.tokens?.controlled?.[0]?.actor;
  if (!a) return ui?.notifications?.warn?.('Select an actor first.');
  MentorNotesApp.openForActor(a);
}

export function reportV2SlippageNow() {
  return reportV2Slippage();
}

export async function runSmokeTest(actor) {
  return runNpcSmokeTest(actor);
}
