/**
 * Drop event handling for SWSEV2CharacterSheet
 *
 * Handles actor and item drops, relationships, and adoption
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";

/**
 * Add actor as relationship (linked reference)
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {Actor} actor - The actor to add as relationship
 */
async function addActorRelationship(sheet, actor) {
  const relationships = sheet.actor.system?.relationships ?? [];
  const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);

  if (alreadyLinked) {
    // console.debug(`Already linked: ${actor.name}`);
    return;
  }

  const mutationPlan = {
    update: {
      'system.relationships': [
        ...relationships,
        {
          uuid: actor.uuid,
          name: actor.name,
          type: actor.type
        }
      ]
    }
  };

  try {
    await ActorEngine.apply(sheet.actor, mutationPlan);
  } catch (err) {
    // console.error('Failed to add actor relationship:', err);
    ui?.notifications?.error?.(`Failed to add relationship: ${err.message}`);
  }
}

/**
 * Adopt actor stat block (identity mutation)
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {Actor} sourceActor - The actor to adopt from
 */
async function adoptActor(sheet, sourceActor) {
  const mutationPlan = AdoptionEngine.buildAdoptionPlan({
    targetActor: sheet.actor,
    sourceActor: sourceActor
  });

  if (!mutationPlan) {
    ui?.notifications?.warn?.(`Cannot adopt from ${sourceActor.name}`);
    return;
  }

  try {
    await ActorEngine.apply(sheet.actor, mutationPlan);
    ui?.notifications?.info?.(`${sheet.actor.name} adopted stat block from ${sourceActor.name}`);
  } catch (err) {
    // console.error('Adoption failed:', err);
    ui?.notifications?.error?.(`Adoption failed: ${err.message}`);
  }
}

/**
 * Handle actor drop: Show modal for GM, simple add for players
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {Actor} droppedActor - The dropped actor
 */
async function handleActorDrop(sheet, droppedActor) {
  // Cross-type or player drop: only add (no adoption)
  if (droppedActor.type !== sheet.actor.type || !game.user.isGM) {
    return addActorRelationship(sheet, droppedActor);
  }

  // Same type + GM: show modal
  new AdoptOrAddDialog(droppedActor, async (choice) => {
    if (choice === "add") {
      await addActorRelationship(sheet, droppedActor);
    } else if (choice === "adopt") {
      await adoptActor(sheet, droppedActor);
    }
  }).render(true);
}

async function maybePromptForFeatTalentGrant(sheet, item) {
  if (!item || !['feat', 'talent'].includes(item.type)) return null;
  if (!game.user?.isGM) return null;
  if (sheet.actor?.type !== 'character') return null;
  if (item.system?.acquisition || item.flags?.['foundryvtt-swse']?.acquisition) return null;

  try {
    const { GMGrantDialog } = await import('/systems/foundryvtt-swse/scripts/apps/gm-grant-dialog.js');
    const result = await GMGrantDialog.prompt({ actor: sheet.actor, item });
    return result || false;
  } catch (err) {
    ui?.notifications?.error?.(`GM grant prompt failed: ${err.message}`);
    return false;
  }
}

/**
 * Handle drop events on the character sheet
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {DragEvent} event - The drop event
 */
export async function onDrop(sheet, event) {
  event.preventDefault();

  // Extract drag data
  const data = TextEditor.getDragEventData(event);
  if (!data) return;

  // Resolve the dropped document once so sheet-level intercepts can inspect it.
  let droppedDocument = null;
  try {
    droppedDocument = await DropResolutionEngine.resolveDroppedDocument(data);
  } catch (err) {
    // Not a resolvable Foundry document; treat as a normal item drop attempt.
  }

  // ACTOR DROP: Check if GM can adopt
  if (droppedDocument && droppedDocument.documentName === 'Actor') {
    return handleActorDrop(sheet, droppedDocument);
  }

  // ITEM DROP: optionally intercept GM feat/talent grants before standard resolution.
  let acquisition = null;
  if (droppedDocument && droppedDocument.documentName === 'Item') {
    acquisition = await maybePromptForFeatTalentGrant(sheet, droppedDocument);
    if (acquisition === false) return;
  }

  const result = await DropResolutionEngine.resolve({
    actor: sheet.actor,
    dropData: data,
    acquisition
  });

  // If no plan (duplicate or invalid), silently skip
  if (!result || !result.mutationPlan) return;

  // Apply mutations via sovereign ActorEngine
  try {
    await ActorEngine.apply(sheet.actor, result.mutationPlan);
    // UI feedback: pulse the target tab
    if (result.uiTargetTab) {
      sheet._pulseTab(result.uiTargetTab);
    }
  } catch (err) {
    // console.error('Drop application failed:', err);
    ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
  }
}

// Export helper functions for external use
export { handleActorDrop, addActorRelationship, adoptActor };
