/**
 * SWSE Structured Debugger (Extended Observability)
 *
 * Comprehensive lifecycle + performance + error instrumentation
 * Zero behavior mutation. Zero error suppression. Toggleable.
 */

import { SentinelConfig } from "./sentinel-config.js";

export class SWSEDebugger {
  static enabled = false;
  static bootTime = Date.now();
  static events = [];
  static metrics = {
    renderTimes: [],
    prepareTimes: [],
    crashFingerprints: {}
  };
  static _memoryInterval = null;
  static _patched = false;

  static enable() {
    this.enabled = true;
    console.log("SWSE DEBUG ENABLED");
  }

  static disable() {
    this.enabled = false;
    if (this._memoryInterval) {
      clearInterval(this._memoryInterval);
      this._memoryInterval = null;
    }
    console.log("SWSE DEBUG DISABLED");
  }

  static now() {
    return performance.now();
  }

  static record(type, payload = {}) {
    const event = {
      timestamp: Date.now(),
      uptime: Date.now() - this.bootTime,
      type,
      payload
    };

    this.events.push(event);
    if (this.events.length > SentinelConfig.MAX_EVENTS) {
      this.events.shift();
    }

    // DISABLED: Console logging was flooding output
    // if (this.enabled) {
    //   console.log("SWSE DEBUG:", event);
    // }

    // Forward to Sentinel if available
    // DISABLED: Sentinel debugger logging was causing console spam
    // if (window.__SWSE_SENTINEL__?.reportEvent) {
    //   window.__SWSE_SENTINEL__.reportEvent("debug", event);
    // }
  }

  /* ===============================
     PERFORMANCE METRICS
  =============================== */

  static recordRenderDuration(className, duration) {
    this.metrics.renderTimes.push({ className, duration, timestamp: Date.now() });
    if (this.metrics.renderTimes.length > SentinelConfig.MAX_RENDER_SAMPLES) {
      this.metrics.renderTimes.shift();
    }
    this.record("metric:renderTime", { className, duration });
  }

  static recordPrepareDuration(className, duration) {
    this.metrics.prepareTimes.push({ className, duration, timestamp: Date.now() });
    if (this.metrics.prepareTimes.length > SentinelConfig.MAX_PREPARE_SAMPLES) {
      this.metrics.prepareTimes.shift();
    }
    this.record("metric:prepareTime", { className, duration });
  }

  static recordMemorySnapshot() {
    if (!performance.memory) return;

    const snapshot = {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    };

    this.record("metric:memory", snapshot);
  }

  /* ===============================
     CRASH FINGERPRINTING
  =============================== */

  static fingerprint(error) {
    const key = `${error?.message}|${error?.stack?.split("\n")[1] || "unknown"}`;
    if (!this.metrics.crashFingerprints[key]) {
      this.metrics.crashFingerprints[key] = 0;
    }
    this.metrics.crashFingerprints[key]++;
  }

  /* ===============================
     STATISTICS & ANALYSIS
  =============================== */

  static getStats() {
    return {
      totalEvents: this.events.length,
      totalRenders: this.metrics.renderTimes.length,
      avgRenderTime: this.metrics.renderTimes.length > 0
        ? this.metrics.renderTimes.reduce((sum, r) => sum + r.duration, 0) / this.metrics.renderTimes.length
        : 0,
      maxRenderTime: Math.max(...this.metrics.renderTimes.map(r => r.duration || 0), 0),
      totalPrepares: this.metrics.prepareTimes.length,
      avgPrepareTime: this.metrics.prepareTimes.length > 0
        ? this.metrics.prepareTimes.reduce((sum, p) => sum + p.duration, 0) / this.metrics.prepareTimes.length
        : 0,
      maxPrepareTime: Math.max(...this.metrics.prepareTimes.map(p => p.duration || 0), 0),
      crashSignatures: Object.keys(this.metrics.crashFingerprints).length,
      topCrash: Object.entries(this.metrics.crashFingerprints).sort((a, b) => b[1] - a[1])[0]
    };
  }

  /* ===============================
     EXPORT
  =============================== */

  static exportJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      systemId: game.system.id,
      foundryVersion: game.version,
      stats: this.getStats(),
      metrics: this.metrics,
      events: this.events
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swse-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log("SWSE DEBUG EXPORT COMPLETE", this.getStats());
  }

  /* ===============================
     LIFECYCLE PATCHING
  =============================== */

  static patch() {
    if (this._patched) return;
    this._patched = true;

    const App = foundry.applications.api.ApplicationV2.prototype;

    // Context Preparation Timing
    const origPrepare = App._prepareContext;
    App._prepareContext = async function (...args) {
      const start = SWSEDebugger.now();

      SWSEDebugger.record("app:prepare:start", {
        class: this.constructor.name
      });

      const result = await origPrepare.apply(this, args);

      const duration = SWSEDebugger.now() - start;
      SWSEDebugger.recordPrepareDuration(this.constructor.name, duration);

      SWSEDebugger.record("app:prepare:end", {
        class: this.constructor.name,
        duration
      });

      return result;
    };

    // Render Timing
    const origRender = App._render;
    App._render = async function (...args) {
      const start = SWSEDebugger.now();

      SWSEDebugger.record("app:render:start", {
        class: this.constructor.name
      });

      const result = await origRender.apply(this, args);

      const duration = SWSEDebugger.now() - start;
      SWSEDebugger.recordRenderDuration(this.constructor.name, duration);

      SWSEDebugger.record("app:render:end", {
        class: this.constructor.name,
        duration
      });

      return result;
    };

    // Actor Update Tracking - DISABLED (PERMANENT FIX)
    // SWSE removed all prototype patching of Actor.prototype.update
    // Diagnostic logging now goes through hooks instead
    // const origActorUpdate = Actor.prototype.update;
    // Actor.prototype.update = async function (data, options) { ... };

    // Settings Access Logging
    const origGet = game.settings.get;
    game.settings.get = function (scope, key) {
      SWSEDebugger.record("settings:get", { scope, key });
      return origGet.call(this, scope, key);
    };

    // Flag Get Logging
    const origGetFlag = foundry.abstract.Document.prototype.getFlag;
    foundry.abstract.Document.prototype.getFlag = function (scope, key) {
      SWSEDebugger.record("flag:get", {
        doc: this.constructor.name,
        scope,
        key
      });
      return origGetFlag.call(this, scope, key);
    };

    // Flag Set Logging
    const origSetFlag = foundry.abstract.Document.prototype.setFlag;
    foundry.abstract.Document.prototype.setFlag = function (scope, key, value) {
      SWSEDebugger.record("flag:set", {
        doc: this.constructor.name,
        scope,
        key
      });
      return origSetFlag.call(this, scope, key, value);
    };

    // Global Errors (Uncaught)
    window.addEventListener("error", (event) => {
      SWSEDebugger.fingerprint(event.error);
      SWSEDebugger.record("error:global", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled Promise Rejections
    window.addEventListener("unhandledrejection", (event) => {
      SWSEDebugger.fingerprint(event.reason);
      SWSEDebugger.record("error:unhandledPromise", {
        reason: event.reason?.stack || String(event.reason)
      });
    });

    // Periodic Memory Sampling (30 second intervals)
    this._memoryInterval = setInterval(() => {
      SWSEDebugger.recordMemorySnapshot();
    }, SentinelConfig.MEMORY_SAMPLE_INTERVAL_MS);
  }
}
