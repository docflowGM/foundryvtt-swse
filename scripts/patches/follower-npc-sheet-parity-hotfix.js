import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { isFollower, normalize } from '/systems/foundryvtt-swse/scripts/sheets/v2/npc/follower-sheet-parity.js';

// Sheet context/events and follower feat de-duplication are folded into SWSEV2NpcSheet / FollowerCreator (F-PAT-002).
// What remains is the GM-only startup duplicate-feat repair. Follower defenses live in the canonical DefenseCalculator (F-NPC-003).
const REGISTERED = Symbol.for('swse.followerNpcSheetParity.v3');
async function repairFollowerDuplicateFeats() {
  if (!game.user?.isGM) return;
  for (const actor of Array.from(game.actors || []).filter(isFollower)) {
    const seen = new Set();
    const duplicates = [];
    for (const feat of Array.from(actor.items || []).filter(item => item.type === 'feat')) {
      const key = normalize(feat.name);
      if (seen.has(key)) duplicates.push(feat.id);
      else seen.add(key);
    }
    if (!duplicates.length) continue;
    await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', duplicates, {
      source: 'follower-feat-deduplication',
    });
    swseLogger.log('[Follower NPC Sheet] Removed duplicate follower feats', {
      actor: actor.name,
      removed: duplicates.length,
    });
  }
}

export function registerFollowerNpcSheetParityHotfix() {
  if (globalThis[REGISTERED]) return;
  globalThis[REGISTERED] = true;
  Hooks.once('ready', () => globalThis.setTimeout?.(() => repairFollowerDuplicateFeats(), 1000));
}
