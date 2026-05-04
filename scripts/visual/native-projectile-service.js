/**
 * NATIVE PROJECTILE SERVICE
 *
 * Renders projectiles using native PIXI without external animation libraries.
 * Driven by combat context: weapon type, beam style, target location, hit/miss state.
 *
 * Features:
 * - 6 beam styles (laser, bolt, heavy, pulse, ion, plasma)
 * - 6 combat effects (impact flash, screen shake, ricochet, shield deflection, speed scaling, lightsaber deflection)
 * - Pure cosmetic (never influences combat math)
 * - Dynamic scaling based on distance
 * - Color-matched visual feedback
 *
 * Architecture:
 * - All rendering via PIXI.Graphics and PIXI.Container
 * - Context-driven (attacker, target, hit, targetHasShield, deflectedBy)
 * - RequestAnimationFrame for smooth animation
 */

import { BEAM_STYLES, getBoltColor } from "/systems/foundryvtt-swse/scripts/constants/beam-styles.js";
import { BLASTER_FX_TYPES, DEFAULT_BOLT_COLOR, DEFAULT_FX_TYPE } from "/systems/foundryvtt-swse/scripts/data/blaster-config.js";
import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class NativeProjectileService {
  /**
   * Fire a projectile from attacker to target
   * Handles all visual effects based on combat context
   *
   * @param {Token} attackerToken - Source token
   * @param {Token|Object} targetToken - Target token or {x, y} position
   * @param {Item} weapon - The weapon being fired
   * @param {Object} context - Combat context: { hit, targetHasShield, deflectedBy, distance }
   * @param {boolean} [enableEffects=true] - Respect system cinematic setting
   */
  static async fire(attackerToken, targetToken, weapon, context = {}, enableEffects = true) {
    if (!attackerToken || !targetToken) return;

    // Get beam style and color from weapon flags/workbench selections.
    // Workbench persists fxType + boltColor; beamStyle remains supported for older items.
    const visual = this.#resolveWeaponVisuals(weapon);
    const beamStyle = visual.beamStyle;
    const boltColor = visual.boltColor;

    // Calculate positions
    const attackPos = {
      x: attackerToken.center?.x ?? attackerToken.x,
      y: attackerToken.center?.y ?? attackerToken.y
    };

    const targetPos =
      targetToken.center || targetToken.document?.center
        ? {
            x: targetToken.center?.x ?? targetToken.document.center?.x ?? 0,
            y: targetToken.center?.y ?? targetToken.document.center?.y ?? 0
          }
        : targetToken;

    const distance = Math.hypot(targetPos.x - attackPos.x, targetPos.y - attackPos.y);

    try {
      // Handle deflection: bolt travels to deflector, then back to attacker
      if (context.deflectedBy && enableEffects) {
        await this.#deflectBolt(attackPos, targetPos, context.deflectedBy, beamStyle, boltColor);
        return;
      }

      // Handle miss: bolt ricochets to miss location
      if (!context.hit && enableEffects) {
        await this.#ricochet(attackPos, targetPos, beamStyle, boltColor, distance);
        return;
      }

      // Normal hit: render beam based on style
      await this.#renderBeam(attackPos, targetPos, beamStyle, boltColor, distance);

      // Apply hit effects
      if (enableEffects) {
        // Impact flash (always on hit)
        this.#impactFlash(targetPos, boltColor);

        // Shield deflection effect
        if (context.targetHasShield) {
          this.#shieldDeflect(targetPos);
        }

        // Screen shake for heavy bolts
        if (beamStyle === "heavy") {
          this.#screenShake();
        }
      }
    } catch (err) {
      swseLogger.error("[NativeProjectileService] Projectile fire failed:", err);
    }
  }


  /**
   * Resolve weapon projectile visuals from canonical workbench item flags.
   * Purely cosmetic; no combat math.
   * @private
   */
  static #resolveWeaponVisuals(weapon) {
    const swseFlags = weapon?.flags?.swse || weapon?.flags?.["foundryvtt-swse"] || {};
    const fxType = swseFlags.fxType || DEFAULT_FX_TYPE;
    const beamStyle = swseFlags.beamStyle || BLASTER_FX_TYPES[fxType]?.beamStyle || "bolt";
    const boltColor = swseFlags.boltColor || DEFAULT_BOLT_COLOR;

    return { beamStyle, boltColor, fxType };
  }

  /* ============================================================
     BEAM RENDERING (STYLE-SPECIFIC)
  ============================================================ */

  /**
   * Render beam based on style
   * @private
   */
  static async #renderBeam(fromPos, toPos, beamStyle, boltColor, distance) {
    const style = BEAM_STYLES[beamStyle];
    if (!style) return;

    switch (beamStyle) {
      case "laser":
        await this.#laserLine(fromPos, toPos, boltColor);
        break;
      case "bolt":
        await this.#travelBolt(fromPos, toPos, boltColor, distance);
        break;
      case "heavy":
        await this.#travelBolt(fromPos, toPos, boltColor, distance, 8);
        break;
      case "pulse":
        await this.#travelBolt(fromPos, toPos, boltColor, distance, 6);
        break;
      case "ion":
        await this.#ionStream(fromPos, toPos, boltColor);
        break;
      case "plasma":
        await this.#plasmaShot(fromPos, toPos, boltColor, distance);
        break;
    }
  }

  /**
   * Instant laser line effect
   * @private
   */
  static async #laserLine(fromPos, toPos, boltColor) {
    const hex = getBoltColor(boltColor);
    const container = new PIXI.Container();

    // Create laser line
    const line = new PIXI.Graphics();
    line.lineStyle(2, parseInt(hex.slice(1), 16), 1);
    line.moveTo(0, 0);
    line.lineTo(toPos.x - fromPos.x, toPos.y - fromPos.y);
    container.addChild(line);

    // Center on attacker
    container.position.set(fromPos.x, fromPos.y);
    canvas.stage.addChild(container);

    // Flash out over 100ms
    return new Promise((resolve) => {
      let elapsed = 0;
      const flashDuration = 100;

      const animate = () => {
        elapsed += 16; // ~60fps
        container.alpha = Math.max(0, 1 - elapsed / flashDuration);

        if (elapsed < flashDuration) {
          requestAnimationFrame(animate);
        } else {
          canvas.stage.removeChild(container);
          container.destroy();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Traveling bolt projectile (4px-10px sphere)
   * Uses dynamic travel duration based on distance
   * @private
   */
  static async #travelBolt(fromPos, toPos, boltColor, distance, size = 4) {
    const hex = getBoltColor(boltColor);
    const color = parseInt(hex.slice(1), 16);

    const container = new PIXI.Container();
    container.position.set(fromPos.x, fromPos.y);

    // Create glowing sphere
    const bolt = new PIXI.Graphics();
    bolt.beginFill(color, 0.8);
    bolt.drawCircle(0, 0, size);
    bolt.endFill();

    // Add glow layer
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.3);
    glow.drawCircle(0, 0, size * 1.5);
    glow.endFill();
    container.addChild(glow);
    container.addChild(bolt);

    canvas.stage.addChild(container);

    // Dynamic duration: base 200-300ms, scaled by distance
    const baseDuration = Math.max(150, distance * 4);
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;

    return new Promise((resolve) => {
      let elapsed = 0;

      const animate = () => {
        elapsed += 16; // ~60fps
        const progress = Math.min(1, elapsed / baseDuration);

        // Linear interpolation to target
        container.x = fromPos.x + dx * progress;
        container.y = fromPos.y + dy * progress;

        if (elapsed < baseDuration) {
          requestAnimationFrame(animate);
        } else {
          canvas.stage.removeChild(container);
          container.destroy();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Ion stream thin cyan line
   * @private
   */
  static async #ionStream(fromPos, toPos, boltColor) {
    const hex = getBoltColor(boltColor);
    const container = new PIXI.Container();

    // Create thin ion line
    const line = new PIXI.Graphics();
    line.lineStyle(2, parseInt(hex.slice(1), 16), 1);
    line.moveTo(0, 0);
    line.lineTo(toPos.x - fromPos.x, toPos.y - fromPos.y);
    container.addChild(line);

    // Add electrical shimmer effect
    const shimmer = new PIXI.Graphics();
    shimmer.lineStyle(1, parseInt(hex.slice(1), 16), 0.5);
    shimmer.moveTo(Math.random() * 20 - 10, 0);
    shimmer.lineTo(toPos.x - fromPos.x + Math.random() * 20 - 10, toPos.y - fromPos.y);
    container.addChild(shimmer);

    container.position.set(fromPos.x, fromPos.y);
    canvas.stage.addChild(container);

    // Fade out over 120ms
    return new Promise((resolve) => {
      let elapsed = 0;
      const duration = 120;

      const animate = () => {
        elapsed += 16;
        container.alpha = Math.max(0, 1 - elapsed / duration);

        if (elapsed < duration) {
          requestAnimationFrame(animate);
        } else {
          canvas.stage.removeChild(container);
          container.destroy();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Plasma shot — large glowing orb with intense effect
   * @private
   */
  static async #plasmaShot(fromPos, toPos, boltColor, distance) {
    const hex = getBoltColor(boltColor);
    const color = parseInt(hex.slice(1), 16);
    const size = 10;

    const container = new PIXI.Container();
    container.position.set(fromPos.x, fromPos.y);

    // Create intense glow
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.4);
    glow.drawCircle(0, 0, size * 2);
    glow.endFill();

    // Create core plasma sphere
    const plasma = new PIXI.Graphics();
    plasma.beginFill(color, 0.9);
    plasma.drawCircle(0, 0, size);
    plasma.endFill();

    container.addChild(glow);
    container.addChild(plasma);
    canvas.stage.addChild(container);

    const baseDuration = Math.max(200, distance * 4);
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;

    return new Promise((resolve) => {
      let elapsed = 0;

      const animate = () => {
        elapsed += 16;
        const progress = Math.min(1, elapsed / baseDuration);

        container.x = fromPos.x + dx * progress;
        container.y = fromPos.y + dy * progress;

        // Pulsing glow effect
        glow.alpha = 0.3 + Math.sin(elapsed / 50) * 0.2;

        if (elapsed < baseDuration) {
          requestAnimationFrame(animate);
        } else {
          canvas.stage.removeChild(container);
          container.destroy();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /* ============================================================
     COMBAT EFFECTS
  ============================================================ */

  /**
   * Impact flash — expanding circle on hit
   * Color-matched to bolt
   * @private
   */
  static #impactFlash(targetPos, boltColor) {
    const hex = getBoltColor(boltColor);
    const color = parseInt(hex.slice(1), 16);

    const container = new PIXI.Container();
    container.position.set(targetPos.x, targetPos.y);

    const flash = new PIXI.Graphics();
    flash.beginFill(color, 0.6);
    flash.drawCircle(0, 0, 10);
    flash.endFill();

    container.addChild(flash);
    canvas.stage.addChild(container);

    // Expand and fade over 200ms
    let elapsed = 0;
    const duration = 200;

    const animate = () => {
      elapsed += 16;
      const progress = elapsed / duration;

      // Scale up from 10 to 40px radius
      const scale = 1 + progress * 3;
      flash.scale.set(scale, scale);
      flash.alpha = Math.max(0, 0.6 - progress * 0.6);

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        canvas.stage.removeChild(container);
        container.destroy();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Screen shake effect — intense vibration
   * Used for heavy bolts and impacts
   * @private
   */
  static #screenShake() {
    const duration = 200;
    const intensity = 3;
    let elapsed = 0;

    const originalPos = { x: canvas.stage.position.x, y: canvas.stage.position.y };

    const shake = () => {
      elapsed += 16;
      const progress = elapsed / duration;

      if (progress < 1) {
        // Random offset within intensity
        canvas.stage.position.x = originalPos.x + (Math.random() - 0.5) * intensity * (1 - progress);
        canvas.stage.position.y = originalPos.y + (Math.random() - 0.5) * intensity * (1 - progress);
        requestAnimationFrame(shake);
      } else {
        // Reset to original position
        canvas.stage.position.x = originalPos.x;
        canvas.stage.position.y = originalPos.y;
      }
    };

    requestAnimationFrame(shake);
  }

  /**
   * Ricochet effect — bolt deflects to miss location
   * @private
   */
  static async #ricochet(fromPos, targetPos, beamStyle, boltColor, distance) {
    // Offset target position by random angle/distance
    const angle = Math.random() * Math.PI * 2;
    const offset = 60; // 60px ricochet offset
    const missPos = {
      x: targetPos.x + Math.cos(angle) * offset,
      y: targetPos.y + Math.sin(angle) * offset
    };

    // Render bolt to miss location
    await this.#travelBolt(fromPos, missPos, boltColor, distance);

    // Brief spark effect at miss location
    const hex = getBoltColor(boltColor);
    const color = parseInt(hex.slice(1), 16);
    const sparkContainer = new PIXI.Container();
    sparkContainer.position.set(missPos.x, missPos.y);

    const spark = new PIXI.Graphics();
    spark.beginFill(color, 0.5);
    spark.drawCircle(0, 0, 3);
    spark.endFill();

    sparkContainer.addChild(spark);
    canvas.stage.addChild(sparkContainer);

    // Fade spark
    let elapsed = 0;
    const duration = 150;

    const animate = () => {
      elapsed += 16;
      sparkContainer.alpha = Math.max(0, 1 - elapsed / duration);

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        canvas.stage.removeChild(sparkContainer);
        sparkContainer.destroy();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Shield deflection effect — cyan ring expanding from target
   * Indicates shield absorption
   * @private
   */
  static #shieldDeflect(targetPos) {
    const container = new PIXI.Container();
    container.position.set(targetPos.x, targetPos.y);

    // Cyan ring for shield
    const ring = new PIXI.Graphics();
    ring.lineStyle(2, 0x00ffff, 1); // Cyan
    ring.drawCircle(0, 0, 15);

    container.addChild(ring);
    canvas.stage.addChild(container);

    // Expand and fade over 250ms
    let elapsed = 0;
    const duration = 250;

    const animate = () => {
      elapsed += 16;
      const progress = elapsed / duration;

      ring.scale.set(1 + progress * 2, 1 + progress * 2);
      ring.alpha = Math.max(0, 1 - progress);

      if (elapsed < duration) {
        requestAnimationFrame(animate);
      } else {
        canvas.stage.removeChild(container);
        container.destroy();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Lightsaber deflection effect
   * Bolt travels to deflector token, then back to attacker
   * @private
   */
  static async #deflectBolt(attackPos, targetPos, deflectorToken, beamStyle, boltColor) {
    const deflectorPos = deflectorToken.center || deflectorToken.document?.center || deflectorToken;

    const distance1 = Math.hypot(deflectorPos.x - attackPos.x, deflectorPos.y - attackPos.y);
    const distance2 = Math.hypot(attackPos.x - deflectorPos.x, attackPos.y - deflectorPos.y);

    // Bolt travels to deflector
    await this.#travelBolt(attackPos, deflectorPos, boltColor, distance1);

    // Bolt returns to attacker
    await this.#travelBolt(deflectorPos, attackPos, boltColor, distance2);

    // Impact flash at deflector
    this.#impactFlash(deflectorPos, boltColor);
  }
}

export default NativeProjectileService;
