/**
 * SWSE Sentinel Configuration
 * Single source of truth for observability thresholds and limits
 *
 * All observability components (SWSEDebugger, SentinelEngine, SentinelReports)
 * read from this config to ensure consistency.
 *
 * No derived values. All constants are explicit.
 */

export const SentinelConfig = {
  // Frame baseline (60fps target = 16.67ms/frame)
  BASELINE_FRAME_MS: 16,

  // Performance thresholds (explicit, no math relationships)
  RENDER_WARNING_MS: 32,      // 2x baseline = warn on slow renders
  RENDER_SLOW_MS: 120,        // Classification threshold for "slow render"
  PREPARE_WARNING_MS: 32,     // Data preparation warning threshold

  // Buffer limits (enforce rolling buffers with shift)
  MAX_EVENTS: 1000,           // SWSEDebugger.events
  MAX_RENDER_SAMPLES: 500,    // SWSEDebugger.renderTimes
  MAX_PREPARE_SAMPLES: 500,   // SWSEDebugger.prepareTimes
  MAX_REPORT_LOG: 1000,       // SentinelEngine.#reportLog
  MAX_AGGREGATES: 200,        // SentinelEngine.#aggregates (with FIFO eviction)

  // Memory sampling
  MEMORY_SAMPLE_INTERVAL_MS: 30000  // 30 second intervals
};
