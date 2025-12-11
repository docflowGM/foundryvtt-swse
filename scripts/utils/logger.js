// scripts/utils/logger.js
const SWSELogger = {
  _prefix() { return `SWSE`; },
  info(...args) { try { console.info(this._prefix(), ...args); } catch(e) {} },
  warn(...args) { try { console.warn(this._prefix(), ...args); } catch(e) {} },
  error(...args) { try { console.error(this._prefix(), ...args); } catch(e) {} },
  log(...args) { try { console.log(this._prefix(), ...args); } catch(e) {} }
};

// Export both names for backward compatibility
const swseLogger = SWSELogger;

export { SWSELogger, swseLogger };
