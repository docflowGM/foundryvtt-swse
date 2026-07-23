/**
 * Drop event handling for SWSEV2CharacterSheet
 *
 * Handles actor and item drops, relationships, and adoption
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DropResolutionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/drop-resolution-engine.js";
import { AdoptionEngine } from "/systems/foundryvtt-swse/scripts/engine/interactions/adoption-engine.js";
import { AdoptOrAddDialog } from "/systems/foundryvtt-swse/scripts/apps/adopt-or-add-dialog.js";
import { cloneDroppedItemData } from "/systems/foundryvtt-swse/scripts/engine/interactions/dropped-item-clone.js";
import { isForcePowerItem } from "/systems/foundryvtt-swse/scripts/utils/item-classification.js";

/**
 * Add actor as relationship (linked reference)
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {Actor} actor - The actor to add as relationship
 */
async function addActorRelationship(sheet, actor) {
  const relationships = sheet.actor.system?.relationships ?? [];
  const alreadyLinked = relationships.some(r => r.uuid === actor.uuid);

  if (alreadyLinked) return;

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
    ui?.notifications?.error?.(`Adoption failed: ${err.message}`);
  }
}

/**
 * Handle actor drop: Show modal for GM, simple add for players
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {Actor} droppedActor - The dropped actor
 */
async function handleActorDrop(sheet, droppedActor) {
  if (droppedActor.type !== sheet.actor.type || !game.user.isGM) {
    return addActorRelationship(sheet, droppedActor);
  }

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

async function addSemanticForcePower(sheet, item) {
  const data = cloneDroppedItemData(item);
  const mutationPlan = {
    createEmbedded: [{
      type: 'Item',
      data
    }]
  };

  try {
    await ActorEngine.apply(sheet.actor, mutationPlan);
    sheet._pulseTab?.('force');
    ui?.notifications?.info?.(`${item.name} added to ${sheet.actor.name}'s Force suite.`);
    return true;
  } catch (err) {
    ui?.notifications?.error?.(`Failed to add Force Power: ${err.message}`);
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

  const data = TextEditor.getDragEventData(event);
  if (!data) return;

  let droppedDocument = null;
  try {
    droppedDocument = await DropResolutionEngine.resolveDroppedDocument(data);
  } catch (err) {
    // Not a resolvable Foundry document; treat as a normal item drop attempt.
  }

  if (droppedDocument && droppedDocument.documentName === 'Actor') {
    return handleActorDrop(sheet, droppedDocument);
  }

  let acquisition = null;
  if (droppedDocument && droppedDocument.documentName === 'Item') {
    // Some legacy/imported powers are stored as generic Item types but carry
    // canonical FORCE_POWER execution metadata. Route those semantically so
    // they are embedded and immediately appear in the Force suite.
    if (isForcePowerItem(droppedDocument)) {
      return addSemanticForcePower(sheet, droppedDocument);
    }

    acquisition = await maybePromptForFeatTalentGrant(sheet, droppedDocument);
    if (acquisition === false) return;
  }

  const result = await DropResolutionEngine.resolve({
    actor: sheet.actor,
    dropData: data,
    acquisition
  });

  if (!result || !result.mutationPlan) return;

  try {
    await ActorEngine.apply(sheet.actor, result.mutationPlan);
    if (result.uiTargetTab) sheet._pulseTab(result.uiTargetTab);
  } catch (err) {
    ui?.notifications?.error?.(`Failed to add dropped item: ${err.message}`);
  }
}

export { handleActorDrop, addActorRelationship, adoptActor };
