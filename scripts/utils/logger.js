// scripts/utils/logger.js
function shouldEmitDiagnostics() {
  try {
    if (globalThis.SWSE_DEBUG_LOGGING === true) return true;
    const svc = globalThis.HouseRuleService;
    if (svc?.getBoolean) {
      const enabled = svc.getBoolean('debugMode', false) === true;
      globalThis.SWSE_DEBUG_LOGGING = enabled;
      return enabled;
    }
  } catch (_err) {
    // Never let diagnostics checks break runtime logging.
  }
  return false;
}

const SWSELogger = {
  _prefix() { return `SWSE`; },

  info(...args) {
    if (!shouldEmitDiagnostics()) return;
    try { console.info(this._prefix(), ...args); } catch (_err) {}
  },
  warn(...args) { try { console.warn(this._prefix(), ...args); } catch (_err) {} },
  error(...args) { try { console.error(this._prefix(), ...args); } catch (_err) {} },
  log(...args) {
    if (!shouldEmitDiagnostics()) return;
    try { console.log(this._prefix(), ...args); } catch (_err) {}
  },
  debug(...args) {
    if (!shouldEmitDiagnostics()) return;
    try { console.debug(this._prefix(), ...args); } catch (_err) {}
  },
  isDev() {
    return shouldEmitDiagnostics();
  }
};

const swseLogger = SWSELogger;

export { SWSELogger, swseLogger };
