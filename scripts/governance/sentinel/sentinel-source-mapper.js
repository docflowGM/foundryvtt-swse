/**
 * sentinel-source-mapper.js — Parse stack traces and map to source locations
 *
 * Enriches Sentinel reports with file + line information.
 * Provides best-effort source location extraction from Error stacks.
 */

export class SentinelSourceMapper {
  static SWSE_PATHS = [
    'scripts/',
    'templates/',
    'styles/'
  ];

  static RATE_LIMIT_MS = 10000; // Re-enrich same stack only every 10s
  static #enrichCache = new Map(); // stack hash → { file, line, column }

  /**
   * Extract source location from Error stack
   * Returns { file, line, column, function } or null
   */
  static parseStack(stack) {
    if (!stack || typeof stack !== 'string') return null;

    const lines = stack.split('\n');

    // Find first SWSE-owned frame
    for (const line of lines) {
      const match = line.match(
        /at\s+(?:(\w+)\s+)?\(?(?:.*?)(\/systems\/[^:]+):(\d+):(\d+)\)?/
      );

      if (match) {
        return {
          file: match[2], // Full path from /systems/
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
          function: match[1] || 'anonymous'
        };
      }
    }

    // Fallback: take first line with any path
    for (const line of lines) {
      const match = line.match(/at\s+(?:(\w+)\s+)?\(?(?:.*?)([\w/-]+\.js):(\d+):(\d+)\)?/);
      if (match && this.SWSE_PATHS.some(p => match[2].includes(p))) {
        return {
          file: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
          function: match[1] || 'anonymous'
        };
      }
    }

    return null;
  }

  /**
   * Enrich report with source location from stack
   * Called asynchronously after report creation
   * @returns { file, line, column, function, stack }
   */
  static enrich(report) {
    if (!report.meta?.stack) return null;

    const stack = report.meta.stack;
    const cacheKey = this._hashStack(stack);

    // Check cache
    if (this.#enrichCache.has(cacheKey)) {
      const cached = this.#enrichCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.RATE_LIMIT_MS) {
        return cached.source;
      }
    }

    // Parse stack
    const source = this.parseStack(stack);

    // Cache result
    if (source) {
      this.#enrichCache.set(cacheKey, {
        source,
        timestamp: Date.now()
      });
    }

    return source || null;
  }

  /**
   * Hash stack for cache key
   * @private
   */
  static _hashStack(stack) {
    // Simple hash of first + last lines
    const lines = stack.split('\n');
    const key = `${lines[0]}-${lines[lines.length - 1]}`;
    return `stack-${key.slice(0, 50)}`;
  }

  /**
   * Parse a file path to extract short name + line
   * Input: /systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js:150:20
   * Output: { name: "sentinel-core.js", path: "scripts/governance/sentinel/", line: 150, column: 20 }
   */
  static formatLocation(file, line, column = null) {
    if (!file) return null;

    const match = file.match(/([^/]+)\.js$/);
    const name = match ? match[0] : file.split('/').pop();
    const pathMatch = file.match(/\/([^/]+\/[^/]+\/[^/]+)$/);
    const path = pathMatch ? pathMatch[1] : null;

    return {
      name,
      path,
      file,
      line,
      column,
      display: `${name}:${line}` + (column ? `:${column}` : '')
    };
  }
}
