/**
 * Talent Effects Hooks
 *
 * Applies and removes Active Effects defined in scripts/talents/talents.js
 * when talent Items are created or deleted on an Actor.
 *
 * Provenance:
 * - Each created ActiveEffect gets flags.swse.talentEffect = { talentItemId, talentName }
 * - On talent deletion, only effects with matching provenance are removed.
 */

import { TALENT_EFFECTS } from "/systems/foundryvtt-swse/scripts/engine/talent/talents.js";
import { TalentNormalizerEngine } from "/systems/foundryvtt-swse/scripts/engine/talent/TalentNormalizerEngine.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function _buildEffectData(actor, talentItem, effectDef, idx) {
  const label = `${talentItem.name} (${idx + 1})`;
  return {
    label,
    icon: talentItem.img,
    origin: talentItem.uuid,
    disabled: false,
    transfer: false,
    changes: effectDef.effects.map(c => ({
      key: c.key,
      mode: c.mode,
      value: c.value,
      priority: c.priority ?? 20
    })),
    flags: {
      swse: {
        talentEffect: {
          talentItemId: talentItem.id,
          talentName: talentItem.name
        }
      }
    }
  };
}

async function _applyTalentEffects(talentItem) {
  const actor = talentItem.actor;
  if (!actor) return;

  const def = TALENT_EFFECTS[talentItem.name];
  if (!def?.effects?.length) return;

  // Prevent duplicates if re-created / imported
  const existing = actor.effects.filter(e =>
    e.getFlag?.('swse', 'talentEffect')?.talentItemId === talentItem.id
  );

  if (existing.length) return;

  const effectsData = def.effects.map((_, idx) => _buildEffectData(actor, talentItem, def, idx));

  try {
    await actor.createEmbeddedDocuments('ActiveEffect', effectsData);
  } catch (e) {
    swseLogger.warn(`Failed to apply talent effects for ${talentItem.name}:`, e);
  }
}

async function _removeTalentEffects(talentItem) {
  const actor = talentItem.actor;
  if (!actor) return;

  const ids = actor.effects
    .filter(e => e.getFlag?.('swse', 'talentEffect')?.talentItemId === talentItem.id)
    .map(e => e.id);

  if (!ids.length) return;

  try {
    await actor.deleteEmbeddedDocuments('ActiveEffect', ids);
  } catch (e) {
    swseLogger.warn(`Failed to remove talent effects for ${talentItem.name}:`, e);
  }
}

async function _ensureTalentMeta(talentItem) {
  try {
    const oldMeta = talentItem.getFlag('foundryvtt-swse', 'talentMeta') ?? null;
    const { meta } = TalentNormalizerEngine.normalizeTalentMeta(talentItem);
    const changed = Object.keys(TalentNormalizerEngine.diffMeta(oldMeta, meta)).length > 0;
    if (changed) {
      await talentItem.setFlag('foundryvtt-swse', 'talentMeta', meta);
    }
  } catch (e) {
    // Never break creation for metadata
  }
}

export function initializeTalentEffectsHooks() {
  Hooks.on('createItem', async (item, options, userId) => {
    if (game.user.id !== userId) return;
    if (item.type !== 'talent') return;

    await _ensureTalentMeta(item);
    await _applyTalentEffects(item);
  });

  Hooks.on('updateItem', async (item, changes, options, userId) => {
    if (game.user.id !== userId) return;
    if (item.type !== 'talent') return;

    // If description changed, refresh tags/actionType metadata.
    if (changes?.system?.description || changes?.system?.details?.description) {
      await _ensureTalentMeta(item);
    }
  });

  Hooks.on('deleteItem', async (item, options, userId) => {
    if (game.user.id !== userId) return;
    if (item.type !== 'talent') return;

    await _removeTalentEffects(item);
  });
}
