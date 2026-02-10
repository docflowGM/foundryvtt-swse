/**
 * store-loading-overlay.js
 *
 * Pure UI controller for Rendarr's loading overlay.
 *
 * Responsibilities:
 * - Create overlay DOM
 * - Manage lifecycle phases
 * - Update status messages (rotating through curated list)
 * - Drive progress bar fill
 * - Respect accessibility settings
 * - Fade out and remove when complete
 *
 * NON-Responsibilities:
 * - Business logic (all delegated to Store app)
 * - Font selection (CSS classes only)
 * - Timing of phases (driven by external events)
 */

const STATUS_MESSAGES = [
  'SYNCHRONIZING VENDOR MANIFESTS',
  'INDEXING INVENTORY LATTICE',
  'CALIBRATING HOLO EMITTERS',
  'NEGOTIATING TRADE ROUTES',
  'VERIFYING CREDIT CHITS',
  'SUPPRESSING COMPETITOR SIGNALS',
  'AUTHENTICATING MERCHANT NODE',
  'LOADING PRICING MATRICES',
  'INITIALIZING SUGGESTION ENGINE',
  'ASSEMBLING MARKETPLACE REVIEWS'
];

const SUBTITLE_DESCRIPTORS = [
  'AUTHORIZED MERCHANT NODE',
  'OUTER RIM TRADE CHANNEL',
  'PRIVATE VENDOR ACCESS',
  'BLACK MARKET INTERFACE ACTIVE'
];

export class StoreLoadingOverlay {
  constructor(options = {}) {
    this.container = null;
    this.statusElement = null;
    this.progressBar = null;

    this.useAurebesh = options.useAurebesh ?? true;
    this.reduceMotion = options.reduceMotion ?? false;
    this.skipOverlay = options.skipOverlay ?? false;

    this.currentPhase = 0;
    this.totalPhases = 5; // cart, inventory, reviews, suggestions, render
    this.currentStatusIndex = 0;
    this.statusCycleInterval = null;
    this.isHidden = false;

    this._createOverlay();
  }

  /**
   * Create overlay DOM structure
   * Uses semantic HTML — no inline styles, all classes
   */
  _createOverlay() {
    if (this.skipOverlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'swse-store-loading-overlay';

    // Add no-animations class if reduced motion is enabled
    if (this.reduceMotion) {
      overlay.classList.add('overlay-no-animations');
    }

    // Add font class based on Aurebesh setting
    if (!this.useAurebesh) {
      overlay.classList.add('font-consolas');
    }

    // Title
    const title = document.createElement('h1');
    title.className = 'overlay-title';
    title.textContent = "WELCOME TO RENDARR'S";

    // Subtitle (randomly select from descriptors)
    const subtitle = document.createElement('p');
    subtitle.className = 'overlay-subtitle';
    const descriptorIdx = Math.floor(Math.random() * SUBTITLE_DESCRIPTORS.length);
    subtitle.textContent = SUBTITLE_DESCRIPTORS[descriptorIdx];

    // Status message (cycling)
    const status = document.createElement('p');
    status.className = 'overlay-status';
    status.textContent = STATUS_MESSAGES[0];
    this.statusElement = status;

    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'overlay-progress-bar';

    const progressFill = document.createElement('div');
    progressFill.className = 'overlay-progress-bar-fill';
    progressContainer.appendChild(progressFill);
    this.progressBar = progressFill;

    // Progress label (optional)
    const progressLabel = document.createElement('p');
    progressLabel.className = 'overlay-progress-label';
    progressLabel.textContent = 'INITIALIZING SYSTEM';

    overlay.appendChild(title);
    overlay.appendChild(subtitle);
    overlay.appendChild(status);
    overlay.appendChild(progressContainer);
    overlay.appendChild(progressLabel);

    document.body.appendChild(overlay);
    this.container = overlay;

    // Start status message cycling
    this._startStatusCycle();
  }

  /**
   * Cycle through status messages
   */
  _startStatusCycle() {
    if (this.reduceMotion || !this.statusElement) {
      return;
    }

    this.statusCycleInterval = setInterval(() => {
      this.currentStatusIndex = (this.currentStatusIndex + 1) % STATUS_MESSAGES.length;
      if (this.statusElement) {
        this.statusElement.textContent = STATUS_MESSAGES[this.currentStatusIndex];
      }
    }, 1200); // Match CSS animation duration
  }

  /**
   * Advance to next phase and update progress bar
   */
  advancePhase() {
    if (this.currentPhase < this.totalPhases) {
      this.currentPhase++;
      this._updateProgressBar();
    }
  }

  /**
   * Update progress bar fill percentage
   */
  _updateProgressBar() {
    if (!this.progressBar) {
      return;
    }

    const percentComplete = (this.currentPhase / this.totalPhases) * 100;
    this.progressBar.style.width = `${percentComplete}%`;
  }

  /**
   * Mark overlay complete and fade out
   */
  complete() {
    if (this.statusCycleInterval) {
      clearInterval(this.statusCycleInterval);
    }

    if (!this.container) {
      return;
    }

    // Set to 100% immediately
    if (this.progressBar) {
      this.progressBar.style.width = '100%';
    }

    // Let CSS animation handle fade-out (0.8s)
    // Then remove element
    setTimeout(() => {
      this.hide();
    }, 800);
  }

  /**
   * Immediately hide overlay (skip animation)
   */
  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      }, 100);
    }
    this.isHidden = true;
  }

  /**
   * Destroy overlay (cleanup)
   */
  destroy() {
    if (this.statusCycleInterval) {
      clearInterval(this.statusCycleInterval);
    }
    this.hide();
  }
}
