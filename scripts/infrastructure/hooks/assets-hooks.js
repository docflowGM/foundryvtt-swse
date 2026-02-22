// scripts/hooks/assets-hooks.js
// Keeps actor.system.followers, .droids, .vehicles in sync when relevant entities are created.
// This is best-effort glue for Assets tab integration.
// PHASE 10: All mutations route through ActorEngine for governance.

import { swseLogger } from '../utils/logger.js';

Hooks.on('createActor', async (actor, options, userId) => {
  try {
    if (!actor || !actor.type) {return;}
    // If a follower actor is created and has an 'owner' flag, attach it to owner actor.system.followers
    const ownerId = actor.getFlag?.('swse','owner');
    if (actor.type === 'follower' && ownerId) {
      const owner = game.actors.get(ownerId);
      if (!owner) {return;}
      const cur = owner.system?.followers || [];
      // Add summary entry if not present
      if (!cur.some(f => f._id === actor.id)) {
        const newEntry = {
          _id: actor.id,
          name: actor.name,
          followerType: actor.system?.followerType || 'unknown',
          level: actor.system?.level || owner.system?.lvl || owner.system?.level || owner.system?.attributes?.level || 1,
          species: actor.system?.species || actor.system?.details?.race || 'Unknown'
        };
        // PHASE 10: Route through ActorEngine with guard key
        if (globalThis.SWSE?.ActorEngine?.updateActor) {
          await globalThis.SWSE.ActorEngine.updateActor(owner, { 'system.followers': [...cur, newEntry] }, {
            meta: { guardKey: 'follower-attach' }
          });
        } else {
          await owner.update({ 'system.followers': [...cur, newEntry] });
        }
        swseLogger.log(`Attached follower ${actor.name} to owner ${owner.name}`);
      }
    }

    // If a droid/vehicle actor is created with a 'purchasedBy' flag, attach it
    const purchaser = actor.getFlag?.('swse','purchasedBy');
    if (actor.type === 'droid' && purchaser) {
      const owner = game.actors.get(purchaser);
      if (owner) {
        const cur = owner.system?.droids || [];
        if (!cur.some(d => d._id === actor.id)) {
          // PHASE 10: Route through ActorEngine with guard key
          if (globalThis.SWSE?.ActorEngine?.updateActor) {
            await globalThis.SWSE.ActorEngine.updateActor(owner, { 'system.droids': [...cur, { _id: actor.id, name: actor.name, model: actor.system?.model || '' }] }, {
              meta: { guardKey: 'droid-attach' }
            });
          } else {
            await owner.update({ 'system.droids': [...cur, { _id: actor.id, name: actor.name, model: actor.system?.model || '' }] });
          }
          swseLogger.log(`Attached droid ${actor.name} to owner ${owner.name}`);
        }
      }
    }
    if (actor.type === 'vehicle' && purchaser) {
      const owner = game.actors.get(purchaser);
      if (owner) {
        const cur = owner.system?.vehicles || [];
        if (!cur.some(v => v._id === actor.id)) {
          // PHASE 10: Route through ActorEngine with guard key
          if (globalThis.SWSE?.ActorEngine?.updateActor) {
            await globalThis.SWSE.ActorEngine.updateActor(owner, { 'system.vehicles': [...cur, { _id: actor.id, name: actor.name, vehicleClass: actor.system?.vehicleClass || '' }] }, {
              meta: { guardKey: 'vehicle-attach' }
            });
          } else {
            await owner.update({ 'system.vehicles': [...cur, { _id: actor.id, name: actor.name, vehicleClass: actor.system?.vehicleClass || '' }] });
          }
          swseLogger.log(`Attached vehicle ${actor.name} to owner ${owner.name}`);
        }
      }
    }
  } catch (e) {
    console.warn('assets-hooks createActor handler failed', e);
  }
});

// Add fallback hook on item creation in case store created items with purchasedBy flag
Hooks.on('createItem', async (item, options, userId) => {
  try {
    let purchaser;
    try {
      purchaser = item.getFlag?.('swse', 'purchasedBy');
    } catch (e) {
      // Flag scope may not be initialized yet, fall back to direct access
      purchaser = item.flags?.swse?.purchasedBy;
    }
    purchaser = purchaser || item.flags?.swse?.purchasedBy;
    if (!purchaser) {return;}
    // If an item representing a vehicle or droid was created directly as an Item, try to find an actor with the same name
    const owner = game.actors.get(purchaser);
    if (!owner) {return;}
    if (item.type === 'vehicle') {
      const cur = owner.system?.vehicles || [];
      if (!cur.some(v => v._id === item.id)) {
        // PHASE 10: Route through ActorEngine with guard key
        if (globalThis.SWSE?.ActorEngine?.updateActor) {
          await globalThis.SWSE.ActorEngine.updateActor(owner, { 'system.vehicles': [...cur, { _id: item.id, name: item.name, vehicleClass: item.system?.vehicleClass || '' }] }, {
            meta: { guardKey: 'vehicle-item-attach' }
          });
        } else {
          await owner.update({ 'system.vehicles': [...cur, { _id: item.id, name: item.name, vehicleClass: item.system?.vehicleClass || '' }] });
        }
        swseLogger.log(`Attached vehicle item ${item.name} to owner ${owner.name}`);
      }
    }
    if (item.type === 'droid') {
      const cur = owner.system?.droids || [];
      if (!cur.some(d => d._id === item.id)) {
        // PHASE 10: Route through ActorEngine with guard key
        if (globalThis.SWSE?.ActorEngine?.updateActor) {
          await globalThis.SWSE.ActorEngine.updateActor(owner, { 'system.droids': [...cur, { _id: item.id, name: item.name, model: item.system?.model || '' }] }, {
            meta: { guardKey: 'droid-item-attach' }
          });
        } else {
          await owner.update({ 'system.droids': [...cur, { _id: item.id, name: item.name, model: item.system?.model || '' }] });
        }
        swseLogger.log(`Attached droid item ${item.name} to owner ${owner.name}`);
      }
    }
  } catch (e) {
    console.warn('assets-hooks createItem handler failed', e);
  }
});
