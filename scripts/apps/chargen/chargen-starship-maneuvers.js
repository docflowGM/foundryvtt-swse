// ============================================
// Starship Maneuver selection for CharGen
// ============================================

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StarshipManeuverManager } from "/systems/foundryvtt-swse/scripts/utils/starship-maneuver-manager.js";

/**
 * Handle starship maneuver selection
 */
export async function _onSelectStarshipManeuver(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.maneuverid;

  // Lazy-initialize maneuvers from the StarshipManeuverManager's static definitions
  if (!this._packs.maneuvers || this._packs.maneuvers.length === 0) {
    this._packs.maneuvers = StarshipManeuverManager._getAllManeuverDefinitions();
  }

  const maneuver = this._packs.maneuvers.find(m => m._id === id || m.name === id);

  if (!maneuver) {
    ui.notifications.warn('Starship Maneuver not found!');
    return;
  }

  // Check for duplicates in characterData
  const alreadySelected = this.characterData.starshipManeuvers.find(m => m.name === maneuver.name || m._id === maneuver._id);
  if (alreadySelected) {
    ui.notifications.warn(`You've already selected "${maneuver.name}"!`);
    return;
  }

  // If leveling up, also check existing actor items
  if (this.actor) {
    const existsOnActor = this.actor.items.some(item =>
      item.type === 'maneuver' && (item.name === maneuver.name || item.id === maneuver._id)
    );
    if (existsOnActor) {
      ui.notifications.warn(`"${maneuver.name}" is already on your character sheet!`);
      return;
    }
  }

  // Check prerequisites (unless in Free Build mode)
  if (!this.freeBuild) {
    const tempActor = this.actor || this._createTempActorForValidation();

    // Check maneuver prerequisites
    const prereqCheck = await StarshipManeuverManager._checkManeuverPrerequisites(tempActor, maneuver);
    if (!prereqCheck.valid) {
      ui.notifications.warn(`Cannot select "${maneuver.name}": ${prereqCheck.reasons.join(', ')}`);
      return;
    }
  }

  // DEFENSIVE CLONE: Prevent mutation of cached compendium data
  this.characterData.starshipManeuvers.push(foundry.utils.deepClone(maneuver));
  ui.notifications.info(`Selected starship maneuver: ${maneuver.name}`);

  // Re-render to show updated maneuver selection and enable Next button if requirement met
  await this.render();
}

/**
 * Handle removing a starship maneuver
 */
export async function _onRemoveStarshipManeuver(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.maneuverid;

  this.characterData.starshipManeuvers = this.characterData.starshipManeuvers.filter(m => m._id !== id && m.name !== id);
  ui.notifications.info('Starship maneuver removed');
  await this.render();
}

/**
 * Calculate how many starship maneuvers the character should get at character creation
 */
export function _getStarshipManeuversNeeded() {
  // Only grant maneuvers if character has Starship Tactics feat
  const hasStartshipTactics = this.characterData.feats?.some(f =>
    f.name === 'Starship Tactics' || f.name?.includes('Starship Tactics')
  );

  if (!hasStartshipTactics) {
    return 0;
  }

  // Starship Tactics grants 1 + WIS modifier maneuvers
  const wisModifier = this.characterData.abilities.wis?.mod || 0;
  const maneuverCount = 1 + Math.max(0, wisModifier);

  SWSELogger.log(`CharGen | Starship maneuvers needed: ${maneuverCount}`, {
    hasStartshipTactics: true,
    wisModifier: wisModifier
  });

  return maneuverCount;
}

/**
 * Get available starship maneuvers for selection during chargen
 */
export async function _getAvailableStarshipManeuvers() {
  // Lazy-initialize maneuvers from the StarshipManeuverManager's static definitions
  if (!this._packs.maneuvers || this._packs.maneuvers.length === 0) {
    this._packs.maneuvers = StarshipManeuverManager._getAllManeuverDefinitions();
  }

  const tempActor = this.actor || this._createTempActorForValidation();
  const availableManeuvers = [];

  for (const maneuver of this._packs.maneuvers) {
    // Skip already selected
    if (this.characterData.starshipManeuvers.find(m => m.name === maneuver.name)) {
      continue;
    }

    // Check prerequisites (unless in Free Build mode)
    let prerequisitesMet = true;
    let prerequisiteReasons = [];

    if (!this.freeBuild) {
      const prereqCheck = await StarshipManeuverManager._checkManeuverPrerequisites(tempActor, maneuver);
      prerequisitesMet = prereqCheck.valid;
      prerequisiteReasons = prereqCheck.reasons || [];
    }

    availableManeuvers.push({
      ...maneuver,
      prerequisitesMet: prerequisitesMet,
      prerequisiteReasons: prerequisiteReasons
    });
  }

  SWSELogger.log(`CharGen | Available starship maneuvers: ${availableManeuvers.length}`);

  return availableManeuvers;
}

/**
 * Bind Starship Maneuver card UX (flip).
 */
export function _bindManeuverCardUI(root) {
  const step = root.querySelector('.step-starship-maneuvers');
  if (!step) {return;}

  step.onclick = (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) {return;}

    if (!btn.classList.contains('maneuver-details-toggle')) {return;}

    ev.preventDefault();
    const card = btn.closest('.maneuver-card');
    card?.classList.toggle('is-flipped');
  };
}
