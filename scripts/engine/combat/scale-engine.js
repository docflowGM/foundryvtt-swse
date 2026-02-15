/**
 * ScaleEngine — Routes distance, speed, and damage between Character and Starship scale.
 *
 * SWSE Scale Rules:
 *   - 1 starship square = 10 character squares
 *   - Character-scale weapons deal half damage to starship-scale targets
 *   - Starship-scale weapons deal double damage to character-scale targets
 *   - Size determines scale category
 *
 * Toggleable via enableScaleEngine world setting.
 * Does NOT modify stored values — only provides conversion utilities.
 */

export class ScaleEngine {

  static SCALES = Object.freeze({
    CHARACTER: 'character',
    STARSHIP: 'starship'
  });

  /** 1 starship square = this many character squares */
  static SCALE_FACTOR = 10;

  /* -------------------------------------------------------------------------- */
  /*  SETTINGS                                                                  */
  /* -------------------------------------------------------------------------- */

  static get enabled() {
    try {
      return game.settings?.get('foundryvtt-swse', 'enableScaleEngine') ?? false;
    } catch {
      return false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  SCALE DETECTION                                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Determine the combat scale of an actor based on size.
   * Characters (Medium and smaller) = Character Scale
   * Vehicles and Large+ creatures = Starship Scale (when configured)
   *
   * @param {Actor} actor
   * @returns {'character'|'starship'}
   */
  static getActorScale(actor) {
    if (!actor) return this.SCALES.CHARACTER;

    // Vehicles are always starship scale
    if (actor.type === 'vehicle') return this.SCALES.STARSHIP;

    // Characters/NPCs/Droids: check size
    const size = (actor.system?.size || 'medium').toLowerCase();
    const starshipSizes = ['colossal', 'colossal (frigate)', 'colossal (cruiser)', 'colossal (station)'];

    // Gargantuan and above can operate at starship scale
    if (starshipSizes.includes(size) || size === 'gargantuan') {
      return this.SCALES.STARSHIP;
    }

    return this.SCALES.CHARACTER;
  }

  /**
   * Check if two actors are at different scales.
   *
   * @param {Actor} actorA
   * @param {Actor} actorB
   * @returns {boolean}
   */
  static isMixedScale(actorA, actorB) {
    return this.getActorScale(actorA) !== this.getActorScale(actorB);
  }

  /* -------------------------------------------------------------------------- */
  /*  DISTANCE CONVERSION                                                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Convert squares between scales.
   *
   * @param {number} squares - Number of squares
   * @param {'character'|'starship'} fromScale - Source scale
   * @param {'character'|'starship'} toScale - Target scale
   * @returns {number}
   */
  static convertDistance(squares, fromScale, toScale) {
    if (fromScale === toScale) return squares;

    if (fromScale === this.SCALES.CHARACTER && toScale === this.SCALES.STARSHIP) {
      return Math.floor(squares / this.SCALE_FACTOR);
    }

    if (fromScale === this.SCALES.STARSHIP && toScale === this.SCALES.CHARACTER) {
      return squares * this.SCALE_FACTOR;
    }

    return squares;
  }

  /**
   * Get effective range between two tokens, accounting for scale differences.
   *
   * @param {Token} attackerToken
   * @param {Token} targetToken
   * @param {Actor} attackerActor
   * @param {Actor} targetActor
   * @returns {{ squares: number, scale: string }}
   */
  static getEffectiveRange(attackerToken, targetToken, attackerActor, targetActor) {
    if (!attackerToken || !targetToken) return { squares: 0, scale: this.SCALES.CHARACTER };

    const gridDistance = canvas.scene?.grid?.distance ?? 1;
    const rawDistance = Math.sqrt(
      Math.pow(attackerToken.x - targetToken.x, 2) +
      Math.pow(attackerToken.y - targetToken.y, 2)
    );
    const rawSquares = Math.floor(rawDistance / (canvas.scene?.grid?.size ?? 50));

    // Use the attacker's scale as the reference
    const attackerScale = this.getActorScale(attackerActor);
    const targetScale = this.getActorScale(targetActor);

    // If same scale, return as-is
    if (attackerScale === targetScale) {
      return { squares: rawSquares, scale: attackerScale };
    }

    // Mixed scale: convert to attacker's scale
    return {
      squares: this.convertDistance(rawSquares, this.SCALES.CHARACTER, attackerScale),
      scale: attackerScale
    };
  }

  /* -------------------------------------------------------------------------- */
  /*  DAMAGE SCALING                                                           */
  /* -------------------------------------------------------------------------- */

  /**
   * Apply scale-based damage modifier.
   *
   * SWSE Rules:
   *   - Character weapon vs Starship target: half damage
   *   - Starship weapon vs Character target: double damage
   *   - Same scale: no modifier
   *
   * @param {number} damage - Base damage
   * @param {Actor} attacker
   * @param {Actor} target
   * @returns {{ damage: number, multiplier: number, reason: string }}
   */
  static scaleDamage(damage, attacker, target) {
    if (!this.enabled) return { damage, multiplier: 1, reason: '' };

    const attackerScale = this.getActorScale(attacker);
    const targetScale = this.getActorScale(target);

    if (attackerScale === targetScale) {
      return { damage, multiplier: 1, reason: '' };
    }

    if (attackerScale === this.SCALES.CHARACTER && targetScale === this.SCALES.STARSHIP) {
      const scaled = Math.floor(damage / 2);
      return {
        damage: scaled,
        multiplier: 0.5,
        reason: 'Character-scale weapon vs Starship-scale target (half damage)'
      };
    }

    if (attackerScale === this.SCALES.STARSHIP && targetScale === this.SCALES.CHARACTER) {
      const scaled = damage * 2;
      return {
        damage: scaled,
        multiplier: 2,
        reason: 'Starship-scale weapon vs Character-scale target (double damage)'
      };
    }

    return { damage, multiplier: 1, reason: '' };
  }

  /* -------------------------------------------------------------------------- */
  /*  SPEED CONVERSION                                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Convert speed between scales.
   *
   * @param {number} speed - Speed in squares
   * @param {'character'|'starship'} fromScale
   * @param {'character'|'starship'} toScale
   * @returns {number}
   */
  static convertSpeed(speed, fromScale, toScale) {
    return this.convertDistance(speed, fromScale, toScale);
  }

  /**
   * Get an actor's speed in a specific scale.
   *
   * @param {Actor} actor
   * @param {'character'|'starship'} targetScale
   * @returns {number}
   */
  static getSpeedInScale(actor, targetScale) {
    if (!actor) return 0;

    const actorScale = this.getActorScale(actor);
    const speed = actor.system?.speed ?? actor.system?.effectiveSpeed ?? 0;

    return this.convertDistance(speed, actorScale, targetScale);
  }

  /* -------------------------------------------------------------------------- */
  /*  WEAPON SCALE DETECTION                                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Determine the scale of a weapon.
   *
   * @param {Item} weapon
   * @param {Actor} wielder - The actor using the weapon
   * @returns {'character'|'starship'}
   */
  static getWeaponScale(weapon, wielder) {
    // Explicit vehicle weapon flag
    if (weapon?.system?.isVehicleWeapon) return this.SCALES.STARSHIP;

    // Weapons on vehicles are starship scale
    if (wielder?.type === 'vehicle') return this.SCALES.STARSHIP;

    return this.SCALES.CHARACTER;
  }

  /* -------------------------------------------------------------------------- */
  /*  SIZE MODIFIER                                                            */
  /* -------------------------------------------------------------------------- */

  /**
   * Get attack modifier for attacking across scales.
   * Larger targets are easier to hit from smaller scale.
   *
   * @param {Actor} attacker
   * @param {Actor} target
   * @returns {number} Attack modifier
   */
  static getScaleAttackModifier(attacker, target) {
    if (!this.enabled) return 0;

    const aScale = this.getActorScale(attacker);
    const tScale = this.getActorScale(target);

    // Character attacking starship: +5 (large target)
    if (aScale === this.SCALES.CHARACTER && tScale === this.SCALES.STARSHIP) {
      return 5;
    }

    // Starship attacking character: -5 (small target)
    if (aScale === this.SCALES.STARSHIP && tScale === this.SCALES.CHARACTER) {
      return -5;
    }

    return 0;
  }
}
