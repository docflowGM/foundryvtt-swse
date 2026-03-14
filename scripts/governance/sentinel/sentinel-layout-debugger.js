/**
 * SWSE Sentinel Layout Debugger
 *
 * Read-only runtime inspector for collapsed/squished sheet content in Foundry V13.
 *
 * Detects DOM regions that are technically rendered but visually collapsed due to:
 * - Missing flex: 1 or flex-grow properties
 * - Parent overflow: hidden clipping children
 * - Ancestor chains with height: 0
 * - Missing min-height: 0 in flex containers
 *
 * Reports findings to Sentinel for governance tracking and diagnosis.
 * Safe: Does not mutate layout, does not patch Foundry.
 */

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

const DEFAULT_SELECTORS = [
  ".sheet-body",
  ".window-content",
  ".tab",
  ".tab-content",
  ".tab-panel",
  ".sheet-content",
  ".inventory-section",
  ".inventory-list",
  ".followers-section",
  ".biography-section",
  ".swse-panel",
  ".swse-card-stack",
  ".swse-tab-panel",
  "[data-tab]",
  "[data-layout-watch]"
];

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function shortSelector(el) {
  if (!(el instanceof Element)) return "<non-element>";
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = [...el.classList].slice(0, 3).map(c => `.${c}`).join("");
  const dataTab = el.getAttribute("data-tab");
  const tab = dataTab ? `[data-tab="${dataTab}"]` : "";
  return `${tag}${id}${classes}${tab}`;
}

function styleSnapshot(el) {
  const cs = getComputedStyle(el);
  return {
    display: cs.display,
    position: cs.position,
    overflowX: cs.overflowX,
    overflowY: cs.overflowY,
    flex: cs.flex,
    flexGrow: cs.flexGrow,
    flexShrink: cs.flexShrink,
    flexBasis: cs.flexBasis,
    minHeight: cs.minHeight,
    minWidth: cs.minWidth,
    height: cs.height,
    maxHeight: cs.maxHeight
  };
}

function rectSnapshot(el) {
  const r = el.getBoundingClientRect();
  return {
    width: safeNumber(Math.round(r.width)),
    height: safeNumber(Math.round(r.height))
  };
}

function isElementVisible(el) {
  if (!(el instanceof Element)) return false;
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  if (el.closest("[hidden]")) return false;
  return true;
}

function isInVisibleWindow(el) {
  const app = el.closest(".app, .application, .window-app");
  if (!app) return false;
  return isElementVisible(app);
}

function getAncestorChain(el, maxDepth = 6) {
  const chain = [];
  let cur = el;
  let depth = 0;

  while (cur && cur instanceof Element && depth < maxDepth) {
    chain.push({
      selector: shortSelector(cur),
      rect: rectSnapshot(cur),
      style: styleSnapshot(cur)
    });
    cur = cur.parentElement;
    depth += 1;
  }

  return chain;
}

function findLikelyConstraint(ancestorChain) {
  for (const node of ancestorChain) {
    const s = node.style;

    if (node.rect.height === 0) {
      return {
        reason: "ancestor-height-zero",
        selector: node.selector
      };
    }

    if (s.overflowY === "hidden" || s.overflowX === "hidden") {
      return {
        reason: "ancestor-overflow-hidden",
        selector: node.selector
      };
    }

    if (s.display === "flex" && s.minHeight !== "0px" && s.minHeight !== "0") {
      return {
        reason: "flex-ancestor-missing-min-height-0",
        selector: node.selector
      };
    }

    if (s.display === "flex" && s.flexGrow === "0") {
      return {
        reason: "flex-ancestor-not-growing",
        selector: node.selector
      };
    }
  }

  return null;
}

function looksLikeContentNode(el) {
  if (!(el instanceof Element)) return false;

  if (el.matches(DEFAULT_SELECTORS.join(","))) return true;

  const classText = [...el.classList].join(" ").toLowerCase();
  return [
    "sheet",
    "tab",
    "content",
    "panel",
    "inventory",
    "section",
    "partial",
    "body",
    "list",
    "followers",
    "biography"
  ].some(token => classText.includes(token));
}

function scoreCollapseRisk(el) {
  let score = 0;
  const rect = rectSnapshot(el);
  const style = styleSnapshot(el);

  if (rect.height === 0) score += 5;
  if (rect.width === 0) score += 2;
  if (style.overflowY === "hidden" || style.overflowX === "hidden") score += 1;
  if (style.display === "flex" && style.flexGrow === "0") score += 1;
  if (looksLikeContentNode(el)) score += 2;
  if (el.children.length > 0) score += 1;

  return score;
}

function buildPayload(el) {
  const rect = rectSnapshot(el);
  const style = styleSnapshot(el);
  const chain = getAncestorChain(el, 6);
  const constraint = findLikelyConstraint(chain.slice(1)); // ancestors only

  return {
    selector: shortSelector(el),
    rect,
    style,
    childCount: el.children.length,
    textLength: (el.textContent ?? "").trim().length,
    riskScore: scoreCollapseRisk(el),
    likelyConstraint: constraint,
    ancestorChain: chain.slice(0, 3) // top 3 ancestors only
  };
}

export class SentinelLayoutDebugger {
  static #enabled = false;
  static #observer = null;
  static #scanScheduled = null;
  static #reportCache = new Map();
  static #lastScanAt = 0;

  static SCAN_DELAY_MS = 150;
  static MAX_REPORTS_PER_SCAN = 30;
  static CACHE_TTL_MS = 4000;

  static init() {
    SentinelEngine.registerLayer("layout-debugger", {
      enabled: true,
      readOnly: true,
      description: "Layout collapse detection for Foundry V13 sheets",
      init: () => {
        console.log("[SWSE Sentinel] Layout-Debugger layer ready");
      }
    });

    console.log("[SWSE Sentinel] Layout-Debugger layer initialized");
  }

  static start() {
    if (this.#enabled) return;
    this.#enabled = true;

    this._observeDocument();
    this.scheduleScan("start");
  }

  static stop() {
    this.#enabled = false;

    if (this.#observer) {
      this.#observer.disconnect();
      this.#observer = null;
    }

    if (this.#scanScheduled) {
      clearTimeout(this.#scanScheduled);
      this.#scanScheduled = null;
    }

    this.#reportCache.clear();
  }

  static scheduleScan(reason = "mutation") {
    if (!this.#enabled) return;
    if (this.#scanScheduled) return;

    this.#scanScheduled = setTimeout(() => {
      this.#scanScheduled = null;
      this.scan(reason);
    }, this.SCAN_DELAY_MS);
  }

  static _observeDocument() {
    if (this.#observer) return;

    this.#observer = new MutationObserver((mutations) => {
      const relevant = mutations.some(m =>
        m.type === "childList" ||
        (m.type === "attributes" && m.target instanceof Element)
      );

      if (relevant) this.scheduleScan("dom-mutation");
    });

    this.#observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "data-tab", "aria-hidden"]
    });
  }

  static scan(reason = "manual") {
    if (!this.#enabled) return;

    const now = performance.now();
    this.#lastScanAt = now;

    const roots = [...document.querySelectorAll(".app, .application, .window-app")];
    let reports = 0;

    for (const root of roots) {
      if (!isElementVisible(root)) continue;

      const targets = this._collectTargets(root);
      for (const el of targets) {
        if (reports >= this.MAX_REPORTS_PER_SCAN) break;
        if (!this._shouldReport(el, now)) continue;

        const payload = buildPayload(el);
        if (payload.riskScore < 5) continue;

        this._report(reason, root, payload);

        this._markReported(el, now);
        reports += 1;
      }
    }
  }

  static _collectTargets(root) {
    const selector = DEFAULT_SELECTORS.join(",");
    const direct = [...root.querySelectorAll(selector)];

    const fallback = [...root.querySelectorAll(".window-content *")]
      .filter(el => el instanceof Element && looksLikeContentNode(el));

    const set = new Set([...direct, ...fallback]);

    return [...set].filter(el => {
      if (!(el instanceof Element)) return false;
      if (!isElementVisible(el)) return false;
      if (!isInVisibleWindow(el)) return false;
      return true;
    });
  }

  static _cacheKey(el) {
    const selector = shortSelector(el);
    const rect = rectSnapshot(el);
    return `${selector}|${rect.width}x${rect.height}`;
  }

  static _shouldReport(el, now) {
    const key = this._cacheKey(el);
    const prev = this.#reportCache.get(key);
    if (!prev) return true;
    return (now - prev) > this.CACHE_TTL_MS;
  }

  static _markReported(el, now) {
    const key = this._cacheKey(el);
    this.#reportCache.set(key, now);

    // Prune old cache entries
    for (const [k, ts] of this.#reportCache) {
      if ((now - ts) > this.CACHE_TTL_MS * 2) {
        this.#reportCache.delete(k);
      }
    }
  }

  static _report(reason, root, payload) {
    const appSelector = shortSelector(root);
    let severity = SentinelEngine.SEVERITY.WARN;

    // Escalate to ERROR if highly risky
    if (payload.riskScore >= 8) {
      severity = SentinelEngine.SEVERITY.ERROR;
    }

    SentinelEngine.report(
      "layout-debugger",
      severity,
      `Sheet content collapsed: ${payload.selector} (${payload.likelyConstraint?.reason || "unknown"})`,
      {
        reason,
        app: appSelector,
        ...payload
      },
      {
        aggregateKey: `layout-collapse-${appSelector}-${payload.selector}`,
        category: "layout-collapse",
        subcode: payload.likelyConstraint?.reason || "UNKNOWN_CONSTRAINT",
        source: "SentinelLayoutDebugger.scan()"
      }
    );
  }
}

// Auto-init on system ready
if (typeof Hooks !== "undefined") {
  Hooks.once("ready", () => {
    const diagnosticMode =
      globalThis.SWSE?.diagnosticMode === true ||
      game.settings.get?.("foundryvtt-swse", "sentinelLayoutDebugger") ?? false;

    if (!diagnosticMode) {
      return;
    }

    SentinelLayoutDebugger.init();
    SentinelLayoutDebugger.start();

    console.log("[SWSE Sentinel] Layout debugger active");
  });

  // Trigger scans on major render events
  Hooks.on("renderApplicationV2", () => {
    SentinelLayoutDebugger.scheduleScan("renderApplicationV2");
  });
}
