/**
 * sheet-position.js — Shared utilities for centering SWSE app windows
 * in the visible Foundry canvas/work area.
 *
 * The Foundry sidebar is docked to the RIGHT side of the viewport.
 * Naively centering against `window.innerWidth` biases sheets toward
 * the sidebar. This utility subtracts sidebar width first, so the
 * result lands in the true work area.
 */

const MARGIN = 24; // px gap from any screen edge
const DEFAULTS = {
  width: 900,
  height: 950,
  recenterWindowMs: 5000,
  deferMs: 200,
};

/**
 * Compute a centered, fully-clamped position for an app window.
 * Accounts for sidebar's actual bounding rect, not assumed right-docking.
 *
 * @param {number} [targetWidth=900] Desired window width
 * @param {number} [targetHeight=950] Desired window height
 * @returns {{ width: number, height: number, left: number, top: number }}
 */
export function computeCenteredPosition(targetWidth = DEFAULTS.width, targetHeight = DEFAULTS.height) {
  const sidebarEl = ui?.sidebar?.element ?? document.querySelector('#sidebar');
  const sidebarRect = sidebarEl?.getBoundingClientRect();

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Determine actual work area based on sidebar's occupied space
  let workAreaLeft = 0;
  let workAreaRight = viewportW;

  if (sidebarRect) {
    // Sidebar exists — determine which side it occupies
    const sidebarCenterX = sidebarRect.left + (sidebarRect.width / 2);

    if (sidebarCenterX < viewportW / 2) {
      // Sidebar occupies LEFT side → usable area is to the RIGHT of it
      workAreaLeft = Math.round(sidebarRect.right);
    } else {
      // Sidebar occupies RIGHT side → usable area is to the LEFT of it
      workAreaRight = Math.round(sidebarRect.left);
    }
  }

  const availW = Math.max(500, workAreaRight - workAreaLeft - 16);
  const width = Math.min(targetWidth, availW);
  const height = Math.min(targetHeight, Math.max(600, viewportH - 60));

  // Center within the actual work area
  const rawLeft = workAreaLeft + Math.round((availW - width) / 2);
  const rawTop = Math.round((viewportH - height) / 2);

  const left = Math.max(MARGIN + workAreaLeft, Math.min(rawLeft, workAreaRight - width - MARGIN));
  const top = Math.max(MARGIN, Math.min(rawTop, viewportH - height - MARGIN));

  // Diagnostic logging
  const sidebarDetected = !!sidebarEl;
  console.log('[sheet-position] ════ STEP 1: Sidebar Detection (Actual Rect) ════', {
    sidebarElement_found: sidebarDetected,
    sidebarRect: sidebarRect ? { left: sidebarRect.left, right: sidebarRect.right, width: sidebarRect.width } : 'none',
    sidebarSide: sidebarRect ? (sidebarRect.left + (sidebarRect.width / 2) < viewportW / 2 ? 'LEFT' : 'RIGHT') : 'none'
  });

  console.log('[sheet-position] ════ STEP 2: Work Area Calculation ════', {
    viewport_width: viewportW,
    viewport_height: viewportH,
    work_area_left: workAreaLeft,
    work_area_right: workAreaRight,
    available_width: availW,
    note: `Canvas area: x=${workAreaLeft} to x=${workAreaRight}`
  });

  console.log('[sheet-position] ════ STEP 3: Window Size (Target vs Final) ════', {
    target_width: targetWidth,
    target_height: targetHeight,
    final_width: width,
    final_height: height
  });

  console.log('[sheet-position] ════ STEP 4: Centered Position ════', {
    raw_left: rawLeft,
    raw_top: rawTop,
    final_left: left,
    final_top: top,
    note: `Centered within work area [${workAreaLeft}, ${workAreaRight}]`
  });

  return { width, height, left, top };
}

/**
 * Read the best-available target dimensions for an ApplicationV2 instance.
 *
 * @param {ApplicationV2} app
 * @param {{ width?: number, height?: number }} [overrides]
 * @returns {{ width: number, height: number }}
 */
export function getApplicationTargetSize(app, overrides = {}) {
  const width = overrides.width
    ?? app?.position?.width
    ?? app?.options?.position?.width
    ?? app?.constructor?.DEFAULT_OPTIONS?.position?.width
    ?? DEFAULTS.width;

  const height = overrides.height
    ?? app?.position?.height
    ?? app?.options?.position?.height
    ?? app?.constructor?.DEFAULT_OPTIONS?.position?.height
    ?? DEFAULTS.height;

  return {
    width: Number.isFinite(Number(width)) ? Number(width) : DEFAULTS.width,
    height: Number.isFinite(Number(height)) ? Number(height) : DEFAULTS.height,
  };
}

/**
 * Force a SWSE application to a deterministic centered position.
 * Uses both the Foundry API and a deferred DOM override to defeat
 * late persistent-position restores during startup renders.
 *
 * @param {ApplicationV2} app
 * @param {{ width?: number, height?: number, deferMs?: number }} [overrides]
 * @returns {{ width: number, height: number, left: number, top: number } | null}
 */
export function centerApplication(app, overrides = {}) {
  if (!app?.setPosition) return null;

  const { width, height } = getApplicationTargetSize(app, overrides);
  const pos = computeCenteredPosition(width, height);

  app.setPosition(pos);

  const deferMs = Number.isFinite(Number(overrides.deferMs)) ? Number(overrides.deferMs) : DEFAULTS.deferMs;
  clearTimeout(app._swseCenterTimer);
  app._swseCenterTimer = setTimeout(() => {
    if (!app.rendered) return;
    app.setPosition(pos);
    const el = app.element instanceof HTMLElement ? app.element : app.element?.[0];
    if (el) {
      // CRITICAL: Must set position: absolute for left/top to work as absolute coordinates!
      // Use setProperty with !important to override any conflicting CSS
      el.style.setProperty('position', 'absolute', 'important');
      el.style.setProperty('left', `${pos.left}px`, 'important');
      el.style.setProperty('top', `${pos.top}px`, 'important');
      el.style.setProperty('width', `${pos.width}px`, 'important');
      el.style.setProperty('height', `${pos.height}px`, 'important');
    }
  }, deferMs);

  return pos;
}

/**
 * Re-center a SWSE application during its startup stabilization window.
 * This defeats Foundry position persistence during the flurry of early renders,
 * while still allowing manual drags after the app has settled.
 *
 * @param {ApplicationV2} app
 * @param {{ width?: number, height?: number, recenterWindowMs?: number, deferMs?: number }} [overrides]
 * @returns {{ width: number, height: number, left: number, top: number } | null}
 */
export function centerApplicationDuringStartup(app, overrides = {}) {
  if (!app) return null;
  if (!app._swseOpenedAt) app._swseOpenedAt = Date.now();

  const recenterWindowMs = Number.isFinite(Number(overrides.recenterWindowMs))
    ? Number(overrides.recenterWindowMs)
    : DEFAULTS.recenterWindowMs;

  const age = Date.now() - app._swseOpenedAt;
  const shouldCenter = age < recenterWindowMs || app?.position?.left == null || app?.position?.top == null;
  if (!shouldCenter) return null;

  return centerApplication(app, overrides);
}

/**
 * Cleanup helper for centered SWSE apps.
 * @param {ApplicationV2} app
 */
export function resetApplicationCentering(app) {
  if (!app) return;
  clearTimeout(app._swseCenterTimer);
  app._swseCenterTimer = null;
  app._swseOpenedAt = null;
}
