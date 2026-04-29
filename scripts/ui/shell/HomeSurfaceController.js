/**
 * HomeSurfaceController — Encapsulates compass/home-surface interaction.
 *
 * Responsibilities:
 * - Initialize compass needle behavior (cursor tracking, tile aiming)
 * - Measure center AFTER layout finalization (critical fix)
 * - Manage all listeners with proper cleanup via AbortController
 * - Support attach/destroy for reuse across renders
 *
 * Architecture:
 * - All DOM queries scoped to root (never global document for live elements)
 * - Single AbortController per attachment lifecycle
 * - Listener cleanup on signal abort or explicit destroy()
 * - No stale node refs or duplicate listeners
 */

export class HomeSurfaceController {
  constructor({ root, host }) {
    this.root = root;
    this.host = host;

    // Node references
    this._disc = null;
    this._needle = null;
    this._bearing = null;
    this._label = null;
    this._tiles = [];

    // State
    this._centerX = 0;
    this._centerY = 0;
    this._targetDeg = 0;
    this._currentDeg = 0;
    this._lastAimedTile = null;
    this._animationFrameId = null;

    // Lifecycle
    this._abortController = null;
  }

  /**
   * Attach controller and initialize compass behavior.
   * Must be called after the home surface root is in the DOM.
   */
  attach() {
    // Cancel any previous attachment
    this.destroy();

    this._abortController = new AbortController();

    // Cache DOM node references (scoped to root)
    this._cacheNodes();
    if (!this._disc || !this._needle) return; // Missing required elements

    // Measure center AFTER layout finalization
    this._scheduleInitialMeasure();

    // Wire listeners (scoped to root or window/document with signal cleanup)
    this._wireListeners();
  }

  /**
   * Destroy controller and clean up all listeners.
   */
  destroy() {
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    this._lastAimedTile = null;
  }

  /**
   * Cache all required DOM nodes (scoped to root).
   */
  _cacheNodes() {
    this._disc = this.root.querySelector('#swse-home-disc-wrap');
    this._needle = this.root.querySelector('#swse-home-compass-needle');
    this._bearing = this.root.querySelector('#swse-home-compass-bearing');
    this._label = this.root.querySelector('#swse-home-compass-label');
    this._tiles = [...this.root.querySelectorAll('.swse-home-tile')];
  }

  /**
   * Schedule center measurement to occur AFTER browser layout finalization.
   * Uses requestAnimationFrame to defer measurement one frame.
   */
  _scheduleInitialMeasure() {
    // Measure immediately (this will use cached pre-layout dimensions)
    this._measure();

    // Re-measure after one RAF to ensure layout is finalized
    // This ensures getBoundingClientRect() returns final dimensions
    if (this._abortController) {
      const rafId = requestAnimationFrame(() => {
        if (!this._abortController) return; // Already destroyed
        this._measure();
        // Start the animation loop after we have correct center
        this._startAnimationLoop();
      });

      // Register cleanup
      this._abortController.signal.addEventListener('abort', () => {
        cancelAnimationFrame(rafId);
      });
    }
  }

  /**
   * Measure disc center point from getBoundingClientRect().
   */
  _measure() {
    if (!this._disc) return;
    const rect = this._disc.getBoundingClientRect();
    this._centerX = rect.left + rect.width / 2;
    this._centerY = rect.top + rect.height / 2;
  }

  /**
   * Wire all event listeners (cursor tracking, resize, scroll, accessibility).
   */
  _wireListeners() {
    const { signal } = this._abortController;

    // Check accessibility: respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return; // Skip interaction entirely

    // Re-measure center on window resize and scroll (CSS layout changes)
    window.addEventListener('resize', () => this._measure(), { signal });
    window.addEventListener('scroll', () => this._measure(), { signal, passive: true });

    // Track cursor movement (global, but cleaned up by signal)
    document.addEventListener('mousemove', (e) => this._onMouseMove(e), { signal });
  }

  /**
   * Handle mousemove event and update target bearing.
   */
  _onMouseMove(e) {
    const dx = e.clientX - this._centerX;
    const dy = e.clientY - this._centerY;

    if (dx === 0 && dy === 0) return; // Cursor at exact center

    // Calculate bearing (compass: 0° = north, 90° = east, etc.)
    this._targetDeg = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  }

  /**
   * Start the animation loop (called after initial measure completes).
   */
  _startAnimationLoop() {
    const frame = () => {
      if (!this._abortController) return; // Destroyed

      // Check if disc is still visible/in-flow
      if (!this._disc.offsetParent) {
        this._animationFrameId = requestAnimationFrame(frame);
        return;
      }

      // Smooth shortest-arc interpolation toward target bearing
      let delta = ((this._targetDeg - this._currentDeg + 540) % 360) - 180;
      this._currentDeg = (this._currentDeg + delta * 0.18 + 360) % 360;

      // Update needle rotation
      this._updateNeedle(this._currentDeg);

      // Update tile aiming
      this._updateNearestTile(this._currentDeg);

      // Schedule next frame
      this._animationFrameId = requestAnimationFrame(frame);
    };

    this._animationFrameId = requestAnimationFrame(frame);
  }

  /**
   * Update needle SVG rotation.
   */
  _updateNeedle(angleDeg) {
    if (!this._needle) return;
    this._needle.style.transform = `rotate(${angleDeg}deg)`;

    // Update bearing display if it exists
    if (this._bearing) {
      this._bearing.textContent = String(Math.round(angleDeg)).padStart(3, '0') + '°';
    }
  }

  /**
   * Find nearest tile and update "aimed" state.
   */
  _updateNearestTile(angleDeg) {
    const nearest = this._findNearestTile(angleDeg);

    if (nearest && nearest.delta < 26) {
      // Tile is within aiming threshold
      if (nearest.tile !== this._lastAimedTile) {
        // Remove aimed class from all tiles
        this._tiles.forEach(t => t.classList.remove('aimed'));
        // Add aimed class to nearest tile
        nearest.tile.classList.add('aimed');
        // Update label
        if (this._label) {
          const tileLabel = nearest.tile.querySelector('.swse-home-tile-label')?.textContent?.trim() || 'HOLD';
          this._label.textContent = '▸ ' + tileLabel.replace(/\s+/g, ' ').toUpperCase();
        }
        this._lastAimedTile = nearest.tile;
      }
    } else if (this._lastAimedTile) {
      // No tile is aimed
      this._tiles.forEach(t => t.classList.remove('aimed'));
      if (this._label) this._label.textContent = '▸ HOLD';
      this._lastAimedTile = null;
    }
  }

  /**
   * Find the nearest tile to a bearing angle.
   */
  _findNearestTile(angleDeg) {
    let best = null, bestDelta = 999;

    this._tiles.forEach(tile => {
      const tr = tile.getBoundingClientRect();
      const tx = tr.left + tr.width / 2 - this._centerX;
      const ty = tr.top + tr.height / 2 - this._centerY;

      // Calculate tile bearing
      const tDeg = (Math.atan2(tx, -ty) * 180 / Math.PI + 360) % 360;

      // Calculate shortest angular distance
      let d = Math.abs(((angleDeg - tDeg + 540) % 360) - 180);

      if (d < bestDelta) {
        bestDelta = d;
        best = { tile, deg: tDeg, delta: d };
      }
    });

    return best;
  }
}
