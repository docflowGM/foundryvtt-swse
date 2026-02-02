/**
 * AppV2 Render Lifecycle Probe
 * Detects V1 assumptions and contracts violations
 */

export function probeAppV2(app, label = "AppV2") {
  console.groupCollapsed(`🧪 ${label} Probe`);
  console.log("App class:", app.constructor.name);
  console.log("Base class:", Object.getPrototypeOf(app.constructor)?.name);
  console.log("Template:", app.options?.template);
  console.log("Editable:", app.isEditable);
  console.log("Has _prepareContext:", typeof app._prepareContext === "function");
  console.log("Has _onRender:", typeof app._onRender === "function");
  console.groupEnd();
}

/**
 * Guard for _onRender contract
 * Detects V1 html.find patterns and other violations
 */
export function guardOnRender(context, options, app) {
  const name = app?.constructor?.name || "Unknown";

  // ❌ V1 jQuery pattern detection
  if (context?.find) {
    throw new Error(
      `${name} _onRender received jQuery/html object. V1 code path still active.`
    );
  }

  // ❌ Missing element before render
  if (!app?.element) {
    throw new Error(`${name} _onRender called before element exists.`);
  }

  // ✅ Log what AppV2 actually provided
  console.debug(`🧩 ${name} _onRender`, {
    contextKeys: Object.keys(context ?? {}),
    hasOptions: !!options
  });
}

/**
 * Verifies _prepareContext returns expected keys
 */
export function verifyPrepareContext(contextObj, app) {
  const name = app?.constructor?.name || "Unknown";
  console.debug(`📦 ${name} _prepareContext:`, Object.keys(contextObj ?? {}));
  return contextObj;
}

/**
 * Detects template/actor type mismatches on sheets
 */
export function validateTemplate(app) {
  const template = app?.options?.template;
  const actorType = app?.document?.type;

  if (template && actorType && !template.includes(actorType)) {
    console.error("🚨 TEMPLATE/ACTOR TYPE MISMATCH", {
      actorType,
      template,
      sheet: app.constructor.name
    });
  }
}

/**
 * Logs chargen render state
 */
export function logChargenRender(app, context) {
  console.groupCollapsed(
    `🧬 Chargen Render: ${app.constructor.name}`
  );
  console.log("Context keys:", Object.keys(context ?? {}));
  console.log("Current step:", context?.currentStep);
  console.log("Character data:", !!context?.characterData);
  console.log("Root element:", app.element?.tagName);
  console.groupEnd();
}

/**
 * Global V1 usage tripwire (dev-mode only)
 */
export function initV1Tripwire() {
  if (globalThis.game?.settings?.get?.("swse", "devMode")) {
    const patterns = ["html.find(", "html.on(", "activateListeners("];

    console.warn("⚠️ V1 tripwire active. Watching for patterns:", patterns);

    // Override console.warn for V1 patterns
    const origWarn = console.warn;
    console.warn = function(...args) {
      const msg = args[0]?.toString?.() || "";
      if (patterns.some(p => msg.includes(p))) {
        throw new Error(`❌ V1 PATTERN DETECTED: ${msg}`);
      }
      origWarn(...args);
    };
  }
}
