// scripts/debug/debug-tools.js
import MentorNotesApp from '../apps/mentor-notes/mentor-notes-app.js';

export async function toggleNpcRenderProbe() {
  // DEBUG_SETTINGS not available - removed broken import
  return false;
}

export function openMentorNotes(actor) {
  const a = actor ?? canvas?.tokens?.controlled?.[0]?.actor;
  if (!a) {return ui?.notifications?.warn?.('Select an actor first.');}
  MentorNotesApp.openForActor(a);
}

export function reportV2SlippageNow() {
  // reportV2Slippage not available - removed broken import
  return null;
}

export async function runSmokeTest(actor) {
  // runNpcSmokeTest not available - removed broken import
  return null;
}
