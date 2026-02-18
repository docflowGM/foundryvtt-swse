/**
 * AppV2 Render-Contract Validator (DEV)
 *
 * Goals:
 * - Fail fast with actionable logs when an app violates AppV2 render contract.
 * - Catch null/empty template strings before Foundry internals call `.startsWith(...)`.
 * - Keep scope surgical: only runs in dev/debug mode, only validates once per app instance.
 *
 * This is NOT error suppression. It either fixes a trivially-inferable template (from DEFAULT_OPTIONS)
 * or throws with a detailed diagnostic.
 */

function isEnabled() {
  try {
    return !!game?.settings?.get?.('foundryvtt-swse', 'debugMode');
  } catch {
    // fall through
  }
  return game?.modules?.get?.('_dev-mode')?.active ?? false;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function inferLegacyTemplate(app) {
  const ctor = app?.constructor;
  const legacy = ctor?.DEFAULT_OPTIONS?.template;
  return normalizeString(legacy) || '';
}

function validateParts(app) {
  const parts = app?.constructor?.PARTS;
  if (!parts) {return;}

  for (const [key, part] of Object.entries(parts)) {
    const tpl = normalizeString(part?.template);
    if (!tpl) {
      throw new Error(`Invalid PARTS template: ${key}`);
    }
  }
}

function validateOptions(app) {
  if (!app) {return;}

  // Defensive normalization for common string-ish options.
  const opts = app.options ?? (app.options = {});
  if (opts.classes == null) {opts.classes = [];}
  if (!Array.isArray(opts.classes)) {opts.classes = [String(opts.classes)];}
  if (opts.title == null && typeof app.title === 'string') {opts.title = app.title;}

  // If PARTS exists, validate those templates (AppV2 declarative surface).
  validateParts(app);

  // If template is used (FormApplication / Sheet-like), it must be a non-empty string.
  const tpl = normalizeString(opts.template);
  if (tpl) {return;}

  // Try to auto-repair from legacy DEFAULT_OPTIONS (only if unambiguous).
  const inferred = inferLegacyTemplate(app);
  if (inferred) {
    console.warn(`[SWSE] AppV2 validator: repaired missing template from DEFAULT_OPTIONS`, {
      app: app.constructor?.name,
      inferred
    });
    opts.template = inferred;
    return;
  }

  // Hard failure: Foundry is going to crash with `.startsWith()` soon.
  const name = app.constructor?.name ?? 'UnknownApplication';
  const details = {
    app: name,
    optionsTemplate: opts.template,
    hasPARTS: !!app.constructor?.PARTS,
    defaultOptionsExists: typeof app.constructor?.defaultOptions !== 'undefined',
    defaultOptionsKeys: Object.keys(app.constructor?.defaultOptions ?? {}),
    legacyDefaultOptionsTemplate: app.constructor?.DEFAULT_OPTIONS?.template
  };

  const err = new Error(
    `[SWSE] AppV2 render-contract violation: missing/invalid template for ${name}.`
  );
  // Attach diagnostics for your custom error handler.
  err.swse = { details };
  console.error(err.message, details);
  throw err;
}

/**
 * Install render hook/wrapper.
 * Uses libWrapper when available; falls back to a minimal monkeypatch in dev mode.
 */
export function initAppV2RenderContractValidator() {
  if (!isEnabled()) {return;}
  if (globalThis.__swse_appv2_contract_validator__) {return;}
  globalThis.__swse_appv2_contract_validator__ = true;

  const validated = new WeakSet();

  function validateOnce(app) {
    if (!app || validated.has(app)) {return;}
    validated.add(app);
    validateOptions(app);
  }

  // Prefer libWrapper if present (non-invasive).
  const lw = globalThis.libWrapper;
  if (lw?.register) {
    try {
      lw.register(
        'foundryvtt-swse',
        'Application.prototype.render',
        function (wrapped, ...args) {
          validateOnce(this);
          return wrapped(...args);
        },
        'WRAPPER'
      );
      console.log('[SWSE] AppV2 validator installed via libWrapper: Application.prototype.render');
      return;
    } catch (e) {
      console.warn('[SWSE] libWrapper validator install failed; falling back to monkeypatch.', e);
    }
  }

  // Fallback monkeypatch (dev only).
  const proto = globalThis.Application?.prototype;
  if (!proto?.render || proto.render.__swse_wrapped__) {return;}

  const original = proto.render;
  proto.render = function (...args) {
    validateOnce(this);
    return original.apply(this, args);
  };
  proto.render.__swse_wrapped__ = true;
  console.log('[SWSE] AppV2 validator installed via monkeypatch: Application.prototype.render');
}
