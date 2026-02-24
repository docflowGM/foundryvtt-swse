/**
 * AdoptionEngine
 *
 * PHASE 3: Build adoption mutation plan (stat block replacement).
 *
 * Responsibility:
 * - Accept target actor and source actor
 * - Validate type compatibility
 * - Build declarative adoption plan
 * - Return plan only (no mutations)
 *
 * Architecture:
 * - Pure data builder
 * - No sheet access
 * - No ActorEngine calls
 * - No permissions checking (caller validates)
 * - No derived computation
 *
 * Adoption Plan Structure:
 * - Replaces actor system entirely
 * - Removes all old embedded documents
 * - Creates new embedded documents
 * - Preserves actor.id, ownership, folder, permissions
 * - Does NOT copy derived or flags
 *
 * Usage:
 *   const plan = AdoptionEngine.buildAdoptionPlan({
 *     targetActor: actor,
 *     sourceActor: adoptedActor
 *   });
 *   if (plan) await ActorEngine.apply(actor, plan);
 */

export class AdoptionEngine {
  /**
   * Build adoption mutation plan
   *
   * Validates:
   * - Type matching (target.type === source.type)
   * - Source is not synthetic/compendium
   * - Source has valid system data
   *
   * @param {Object} config
   * @param {Actor} config.targetActor - actor being modified (will adopt)
   * @param {Actor} config.sourceActor - actor providing stat block (source)
   * @returns {Object|null} mutationPlan or null if invalid
   */
  static buildAdoptionPlan({ targetActor, sourceActor }) {
    try {
      // Validate inputs
      if (!targetActor || !sourceActor) {
        console.warn('AdoptionEngine: missing target or source actor');
        return null;
      }

      // Type must match
      if (targetActor.type !== sourceActor.type) {
        console.debug(`AdoptionEngine: type mismatch (${targetActor.type} vs ${sourceActor.type})`);
        return null;
      }

      // Cannot adopt from compendium-locked actor
      if (sourceActor.compendium) {
        console.debug('AdoptionEngine: cannot adopt from compendium-locked source');
        return null;
      }

      // Cannot adopt from synthetic actor (unowned actor)
      if (sourceActor.collection === null) {
        console.debug('AdoptionEngine: cannot adopt from synthetic/unowned actor');
        return null;
      }

      // Validate source has system data
      if (!sourceActor.system) {
        console.warn('AdoptionEngine: source actor missing system data');
        return null;
      }

      // Build adoption plan
      const plan = {
        // Mark as adoption (for logging)
        _adoptionSource: sourceActor.uuid,

        // Delete all existing embedded documents first
        deleteEmbedded: this._buildDeleteEmbedded(targetActor),

        // Create new embedded documents
        createEmbedded: this._buildCreateEmbedded(sourceActor),

        // Replace system
        replaceSystem: this._buildSystemReplacement(sourceActor)
      };

      return plan;

    } catch (err) {
      console.error('AdoptionEngine.buildAdoptionPlan failed:', err);
      return null;
    }
  }

  /**
   * Build deleteEmbedded operations for all existing items + effects
   *
   * @private
   * @param {Actor} actor
   * @returns {Array<Object>} deletion specs
   */
  static _buildDeleteEmbedded(actor) {
    const toDelete = [];

    // Delete all items
    for (const item of actor.items ?? []) {
      toDelete.push({
        type: 'Item',
        _id: item.id
      });
    }

    // Delete all active effects
    for (const effect of actor.effects ?? []) {
      toDelete.push({
        type: 'ActiveEffect',
        _id: effect.id
      });
    }

    return toDelete;
  }

  /**
   * Build createEmbedded operations for source actor items + effects
   *
   * @private
   * @param {Actor} sourceActor
   * @returns {Array<Object>} creation specs
   */
  static _buildCreateEmbedded(sourceActor) {
    const toCreate = [];

    // Copy all items
    for (const item of sourceActor.items ?? []) {
      toCreate.push({
        type: 'Item',
        data: item.toObject()
      });
    }

    // Copy all active effects
    for (const effect of sourceActor.effects ?? []) {
      toCreate.push({
        type: 'ActiveEffect',
        data: effect.toObject()
      });
    }

    return toCreate;
  }

  /**
   * Build system replacement object
   *
   * Copies system data entirely, preserving:
   * - actor.id (not copied, preserved by ActorEngine)
   * - ownership (not copied, preserved by ActorEngine)
   * - permissions (not copied, preserved by ActorEngine)
   * - folder (not copied, preserved by ActorEngine)
   *
   * Does NOT copy:
   * - derived.* (recalculated post-adoption)
   * - flags (actor identity, not copied)
   *
   * @private
   * @param {Actor} sourceActor
   * @returns {Object} system object
   */
  static _buildSystemReplacement(sourceActor) {
    if (!sourceActor.system) return {};

    // Deep copy system (exclude derived and problematic fields)
    const systemCopy = foundry.utils.deepClone(sourceActor.system);

    // Remove computed/derived fields
    if (systemCopy.derived) {
      delete systemCopy.derived;
    }

    return systemCopy;
  }
}
