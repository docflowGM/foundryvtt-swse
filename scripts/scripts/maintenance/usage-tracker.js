/**
 * SWSE Usage Tracker
 * Runtime instrumentation to identify which systems are actually used
 *
 * Add markUsed("identifier") calls in key initialization points
 * After startup + chargen + level-up, inspect window.SWSE_USAGE to find unused code
 */

export class UsageTracker {
  static _used = new Set();
  static _loaded = new Set();
  static _initialized = new Set();

  /**
   * Mark a system/registry as actively used
   */
  static markUsed(id) {
    this._used.add(id);
  }

  /**
   * Mark a system as loaded
   */
  static markLoaded(id) {
    this._loaded.add(id);
  }

  /**
   * Mark a system as initialized
   */
  static markInitialized(id) {
    this._initialized.add(id);
  }

  /**
   * Get all used systems
   */
  static getUsed() {
    return Array.from(this._used).sort();
  }

  /**
   * Get all loaded but not used
   */
  static getUnused() {
    return Array.from(this._loaded).filter(id => !this._used.has(id)).sort();
  }

  /**
   * Get usage statistics
   */
  static getStats() {
    return {
      used: this._used.size,
      loaded: this._loaded.size,
      initialized: this._initialized.size,
      unused: this.getUnused().length,
      report: {
        used: this.getUsed(),
        unused: this.getUnused(),
        initialized: Array.from(this._initialized).sort()
      }
    };
  }

  /**
   * Log usage report
   */
  static logReport() {
    const stats = this.getStats();
    console.group('%c📊 SWSE USAGE TRACKER REPORT', 'color: cyan; font-weight: bold; font-size: 14px');
    console.log(`✅ Used: ${stats.used}`);
    console.log(`📦 Loaded: ${stats.loaded}`);
    console.log(`🔧 Initialized: ${stats.initialized}`);
    console.log(`⚠️  Unused: ${stats.unused}`);

    if (stats.unused > 0) {
      console.group('%c⚠️  POTENTIALLY ORPHANED SYSTEMS', 'color: orange; font-weight: bold');
      console.table(stats.report.unused);
      console.groupEnd();
    }

    console.groupEnd();
    return stats;
  }

  /**
   * Clear tracking
   */
  static reset() {
    this._used.clear();
    this._loaded.clear();
    this._initialized.clear();
  }
}

// Export global reference
if (typeof window !== 'undefined') {
  if (!window.SWSE) {window.SWSE = {};}
  window.SWSE.usage = UsageTracker;
}

export default UsageTracker;
