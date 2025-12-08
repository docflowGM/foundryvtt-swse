// scripts/utils/logger.js
export const swseLogger = {
  _prefix() { return `SWSE`; },
  info(...args) { try { swseLogger.info(this._prefix(), ...args); } catch(e) {} },
  warn(...args) { try { swseLogger.warn(this._prefix(), ...args); } catch(e) {} },
  error(...args) { try { swseLogger.error(this._prefix(), ...args); } catch(e) {} },
  log(...args) { try { swseLogger.log(this._prefix(), ...args); } catch(e) {} }
};
