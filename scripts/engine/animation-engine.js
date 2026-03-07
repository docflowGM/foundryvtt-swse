/**
 * AnimationEngine — Visual feedback for gameplay events
 *
 * Handles:
 * - Combat roll animations (hit/miss feedback)
 * - Force power activation effects
 * - Critical success/failure visual cues
 * - Damage resolution animations
 * - UI state transitions
 *
 * All animations are non-blocking and CSS-based for performance.
 */

export class AnimationEngine {
  /**
   * Inject animation styles into the document once
   */
  static injectStyles() {
    if (document.getElementById('swse-animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'swse-animation-styles';
    style.textContent = `
      /* SWSE Combat Animation Styles */

      /* Combat roll flash */
      @keyframes swse-roll-flash {
        0% { background: transparent; }
        50% { background: rgba(0, 200, 255, 0.3); }
        100% { background: transparent; }
      }

      .swse-roll-result {
        animation: swse-roll-flash 0.6s ease-out;
      }

      /* Critical success glow */
      @keyframes swse-crit-glow {
        0% { box-shadow: 0 0 0 0 rgba(0, 255, 100, 0.7); }
        50% { box-shadow: 0 0 10px 5px rgba(0, 255, 100, 0.3); }
        100% { box-shadow: 0 0 0 0 rgba(0, 255, 100, 0); }
      }

      .swse-crit-success {
        animation: swse-crit-glow 1.2s ease-out;
        color: #00ff64;
        font-weight: bold;
      }

      /* Critical failure flash */
      @keyframes swse-fumble-flash {
        0%, 100% { color: #ff0000; text-shadow: 0 0 0 transparent; }
        50% { color: #ff6666; text-shadow: 0 0 10px rgba(255, 0, 0, 0.8); }
      }

      .swse-crit-failure {
        animation: swse-fumble-flash 1.2s ease-out;
      }

      /* Force power activation */
      @keyframes swse-force-activate {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }

      .swse-force-active {
        animation: swse-force-activate 0.8s ease-out;
        border-color: #00d4ff;
        box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
      }

      /* Force power discard */
      @keyframes swse-force-discard {
        0% { opacity: 1; transform: scale(1); filter: grayscale(0%); }
        100% { opacity: 0.5; transform: scale(0.95); filter: grayscale(100%); }
      }

      .swse-force-discarded {
        animation: swse-force-discard 0.6s ease-in forwards;
      }

      /* Damage pop */
      @keyframes swse-damage-pop {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
      }

      .swse-damage-pop {
        animation: swse-damage-pop 1.5s ease-out forwards;
        position: relative;
        font-weight: bold;
        color: #ff4444;
        pointer-events: none;
      }

      /* Healing pop */
      @keyframes swse-healing-pop {
        0% { transform: translateY(0) scale(1); opacity: 1; }
        100% { transform: translateY(-40px) scale(1.2); opacity: 0; }
      }

      .swse-healing-pop {
        animation: swse-healing-pop 1.5s ease-out forwards;
        position: relative;
        font-weight: bold;
        color: #44ff44;
        pointer-events: none;
      }

      /* Initiative order change */
      @keyframes swse-initiative-pulse {
        0%, 100% { background: transparent; }
        50% { background: rgba(255, 200, 0, 0.2); }
      }

      .swse-initiative-changed {
        animation: swse-initiative-pulse 1.2s ease-in-out;
      }

      /* Roll result fade in */
      @keyframes swse-result-fade {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .swse-result-display {
        animation: swse-result-fade 0.4s ease-out;
      }

      /* Pulse for active elements */
      @keyframes swse-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .swse-pulse {
        animation: swse-pulse 2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Animate a combat roll result
   * @param {HTMLElement} element - The element to animate
   * @param {Object} result - Roll result data
   * @param {number} result.total - Roll total
   * @param {boolean} result.isCritical - Critical success?
   * @param {boolean} result.isFumble - Critical failure?
   * @param {Function} callback - Callback on animation complete
   */
  static animateRollResult(element, result, callback = null) {
    if (!element) return;

    element.classList.remove('swse-roll-result', 'swse-crit-success', 'swse-crit-failure');

    // Determine animation class
    if (result.isCritical) {
      element.classList.add('swse-crit-success');
    } else if (result.isFumble) {
      element.classList.add('swse-crit-failure');
    } else {
      element.classList.add('swse-roll-result');
    }

    // Call callback after animation
    if (callback) {
      const duration = result.isCritical || result.isFumble ? 1200 : 600;
      setTimeout(callback, duration);
    }
  }

  /**
   * Animate force power activation
   * @param {HTMLElement} element - Force card element
   * @param {Function} callback - Callback on complete
   */
  static animateForceActivation(element, callback = null) {
    if (!element) return;

    element.classList.add('swse-force-active');
    if (callback) {
      setTimeout(() => {
        element.classList.remove('swse-force-active');
        callback();
      }, 800);
    }
  }

  /**
   * Animate force power discard
   * @param {HTMLElement} element - Force card element
   * @param {Function} callback - Callback on complete
   */
  static animateForceDiscard(element, callback = null) {
    if (!element) return;

    element.classList.add('swse-force-discarded');
    if (callback) {
      setTimeout(callback, 600);
    }
  }

  /**
   * Show damage number popup
   * @param {HTMLElement} element - Element to attach animation to
   * @param {number} damage - Damage amount
   * @param {Object} options - Animation options
   * @param {string} options.type - 'damage' or 'healing'
   * @param {string} options.color - Custom color (default: based on type)
   */
  static showDamageNumber(element, damage, options = {}) {
    const { type = 'damage', color = null } = options;

    if (!element) return;

    // Create temporary pop element
    const pop = document.createElement('div');
    pop.textContent = String(damage);
    pop.className = type === 'healing' ? 'swse-healing-pop' : 'swse-damage-pop';

    if (color) {
      pop.style.color = color;
    }

    // Position relative to element
    pop.style.position = 'absolute';
    pop.style.left = '50%';
    pop.style.top = '0';
    pop.style.transform = 'translateX(-50%)';

    element.appendChild(pop);

    // Remove after animation
    setTimeout(() => pop.remove(), 1500);
  }

  /**
   * Pulse an element to draw attention
   * @param {HTMLElement} element - Element to pulse
   * @param {Object} options - Options
   * @param {number} options.duration - Duration in ms (default: 2000)
   * @param {Function} options.onComplete - Callback when done
   */
  static pulse(element, options = {}) {
    const { duration = 2000, onComplete = null } = options;

    if (!element) return;

    element.classList.add('swse-pulse');

    setTimeout(() => {
      element.classList.remove('swse-pulse');
      if (onComplete) onComplete();
    }, duration);
  }

  /**
   * Flash an element in/out
   * @param {HTMLElement} element - Element to flash
   * @param {number} count - Number of flashes (default: 3)
   * @param {number} speed - Duration per flash in ms (default: 200)
   * @param {Function} onComplete - Callback when done
   */
  static flash(element, count = 3, speed = 200, onComplete = null) {
    if (!element) return;

    let flashes = 0;
    const originalOpacity = element.style.opacity || '1';

    const toggle = () => {
      flashes++;
      element.style.opacity = flashes % 2 === 0 ? originalOpacity : '0.3';

      if (flashes < count * 2) {
        setTimeout(toggle, speed);
      } else {
        element.style.opacity = originalOpacity;
        if (onComplete) onComplete();
      }
    };

    toggle();
  }

  /**
   * Fade element in
   * @param {HTMLElement} element - Element to fade
   * @param {number} duration - Duration in ms (default: 400)
   * @param {Function} onComplete - Callback
   */
  static fadeIn(element, duration = 400, onComplete = null) {
    if (!element) return;

    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-out`;

    // Trigger reflow
    element.offsetHeight;

    element.style.opacity = '1';

    if (onComplete) {
      setTimeout(onComplete, duration);
    }
  }

  /**
   * Fade element out
   * @param {HTMLElement} element - Element to fade
   * @param {number} duration - Duration in ms (default: 400)
   * @param {Function} onComplete - Callback
   */
  static fadeOut(element, duration = 400, onComplete = null) {
    if (!element) return;

    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease-out`;

    // Trigger reflow
    element.offsetHeight;

    element.style.opacity = '0';

    if (onComplete) {
      setTimeout(onComplete, duration);
    }
  }

  /**
   * Slide element in from direction
   * @param {HTMLElement} element - Element to slide
   * @param {string} direction - 'left', 'right', 'up', 'down'
   * @param {number} distance - Distance in px (default: 40)
   * @param {number} duration - Duration in ms (default: 400)
   * @param {Function} onComplete - Callback
   */
  static slideIn(element, direction = 'left', distance = 40, duration = 400, onComplete = null) {
    if (!element) return;

    let transform = '';
    switch (direction) {
      case 'left':
        transform = `translateX(-${distance}px)`;
        break;
      case 'right':
        transform = `translateX(${distance}px)`;
        break;
      case 'up':
        transform = `translateY(-${distance}px)`;
        break;
      case 'down':
        transform = `translateY(${distance}px)`;
        break;
    }

    element.style.transform = transform;
    element.style.opacity = '0';
    element.style.transition = `all ${duration}ms ease-out`;

    // Trigger reflow
    element.offsetHeight;

    element.style.transform = 'translate(0, 0)';
    element.style.opacity = '1';

    if (onComplete) {
      setTimeout(onComplete, duration);
    }
  }

  /**
   * Shake animation (for errors, combat impacts, etc)
   * @param {HTMLElement} element - Element to shake
   * @param {number} distance - Shake distance in px (default: 5)
   * @param {number} duration - Duration in ms (default: 400)
   * @param {Function} onComplete - Callback
   */
  static shake(element, distance = 5, duration = 400, onComplete = null) {
    if (!element) return;

    const originalTransform = element.style.transform;
    const shakes = 4;
    let shakeIndex = 0;

    const doShake = () => {
      const offset = (shakeIndex % 2 === 0 ? distance : -distance);
      element.style.transform = `translateX(${offset}px)`;
      shakeIndex++;

      if (shakeIndex < shakes * 2) {
        setTimeout(doShake, duration / (shakes * 2));
      } else {
        element.style.transform = originalTransform;
        if (onComplete) onComplete();
      }
    };

    doShake();
  }
}

// Auto-inject styles when module loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimationEngine.injectStyles());
  } else {
    AnimationEngine.injectStyles();
  }
}
