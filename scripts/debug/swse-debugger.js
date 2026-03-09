/**
 * SWSE Structured Debugger
 * Lifecycle + Error + Sentinel Integration
 */

export class SWSEDebugger {
  static enabled = false;
  static events = [];
  static bootTime = Date.now();

  static enable() {
    this.enabled = true;
    console.log("SWSE DEBUG ENABLED");
  }

  static disable() {
    this.enabled = false;
    console.log("SWSE DEBUG DISABLED");
  }

  static record(type, payload = {}) {
    const event = {
      timestamp: Date.now(),
      uptime: Date.now() - this.bootTime,
      type,
      payload
    };

    this.events.push(event);

    if (this.enabled) {
      console.log("SWSE DEBUG:", event);
    }

    // Forward to Sentinel if available
    if (window.__SWSE_SENTINEL__?.reportEvent) {
      window.__SWSE_SENTINEL__.reportEvent("debug", event);
    }
  }

  static exportJSON() {
    const data = {
      exportedAt: new Date().toISOString(),
      systemId: game.system.id,
      foundryVersion: game.version,
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

    console.log("SWSE DEBUG EXPORT COMPLETE");
  }

  static patch() {
    if (this._patched) return;
    this._patched = true;

    const App = foundry.applications.api.ApplicationV2.prototype;

    // Application Init
    const origInit = App._initializeApplication;
    App._initializeApplication = async function (...args) {
      SWSEDebugger.record("app:init:start", { class: this.constructor.name });
      const result = await origInit.apply(this, args);
      SWSEDebugger.record("app:init:end", { class: this.constructor.name });
      return result;
    };

    // Prepare Context
    const origPrepare = App._prepareContext;
    App._prepareContext = async function (...args) {
      SWSEDebugger.record("app:prepare:start", { class: this.constructor.name });
      const result = await origPrepare.apply(this, args);
      SWSEDebugger.record("app:prepare:end", { class: this.constructor.name });
      return result;
    };

    // Render
    const origRender = App._render;
    App._render = async function (...args) {
      SWSEDebugger.record("app:render:start", { class: this.constructor.name });
      const result = await origRender.apply(this, args);
      SWSEDebugger.record("app:render:end", { class: this.constructor.name });
      return result;
    };

    // Actor Update
    const origActorUpdate = Actor.prototype.update;
    Actor.prototype.update = async function (data, options) {
      SWSEDebugger.record("actor:update", {
        actor: this.name,
        data
      });
      return origActorUpdate.apply(this, arguments);
    };

    // Settings Get
    const origSettingsGet = game.settings.get;
    game.settings.get = function (scope, key) {
      SWSEDebugger.record("settings:get", { scope, key });
      return origSettingsGet.call(this, scope, key);
    };

    // Flag Access
    const origGetFlag = foundry.abstract.Document.prototype.getFlag;
    foundry.abstract.Document.prototype.getFlag = function (scope, key) {
      SWSEDebugger.record("flag:get", {
        document: this.constructor.name,
        scope,
        key
      });
      return origGetFlag.call(this, scope, key);
    };

    const origSetFlag = foundry.abstract.Document.prototype.setFlag;
    foundry.abstract.Document.prototype.setFlag = function (scope, key, value) {
      SWSEDebugger.record("flag:set", {
        document: this.constructor.name,
        scope,
        key
      });
      return origSetFlag.call(this, scope, key, value);
    };

    // Global Errors
    window.addEventListener("error", (event) => {
      SWSEDebugger.record("error:global", {
        message: event.message,
        stack: event.error?.stack
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      SWSEDebugger.record("error:unhandledPromise", {
        reason: event.reason?.stack || event.reason
      });
    });
  }
}
