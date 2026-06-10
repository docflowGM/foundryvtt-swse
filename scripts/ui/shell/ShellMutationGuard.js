/**
 * ShellMutationGuard
 *
 * Development-time guardrails for the holopad shell mutation/render contract.
 *
 * The shell contract is:
 * - surface/view selections live in ShellSurfaceState via patchSurfaceState/patchSurfaceOptions
 * - repaint requests go through requestSurfaceRender
 * - direct _shellSurfaceOptions assignment and direct render(false) are allowed only inside
 *   the shell host implementation itself
 *
 * The guard intentionally warns instead of throwing. Foundry modules can load in different
 * orders and a hard failure here would be worse than the regression it is trying to catch.
 */
const SURFACE_OPTIONS_VALUE = Symbol('swse.shellSurfaceOptions.value');
const SURFACE_OPTIONS_INSTALLED = Symbol('swse.shellSurfaceOptions.installed');
const RENDER_WRAPPED = Symbol('swse.shellRender.wrapped');
const DOCUMENT_MUTATION_GUARDS_INSTALLED = Symbol('swse.documentMutationGuards.installed');
const DOCUMENT_MUTATION_ALLOWED_DEPTH = Symbol('swse.documentMutation.allowedDepth');
const SETTINGS_SET_WRAPPED = Symbol('swse.settingsSet.wrapped');
const WARNED_KEYS = new Set();

function getStackSignature(stack = '') {
  return String(stack)
    .split('\n')
    .slice(2, 6)
    .map(line => line.trim())
    .join(' | ');
}

function isShellStack(stack = '') {
  const text = String(stack);
  return text.includes('/scripts/ui/shell/')
    || text.includes('scripts/ui/shell/')
    || text.includes('/scripts/apps/gm-datapad.js')
    || text.includes('scripts/apps/gm-datapad.js')
    || text.includes('/scripts/sheets/v2/character-sheet.js')
    || text.includes('scripts/sheets/v2/character-sheet.js');
}


function isActorEngineStack(stack = '') {
  const text = String(stack);
  return text.includes('/scripts/governance/actor-engine/')
    || text.includes('scripts/governance/actor-engine/')
    || text.includes('/scripts/utils/actor-utils.js')
    || text.includes('scripts/utils/actor-utils.js');
}

function isFoundryDocumentRenderStack(stack = '') {
  const text = String(stack);
  return text.includes('_onUpdateDescendantDocuments')
    || text.includes('_dispatchDescendantDocumentEvents')
    || text.includes('#handleUpdateDocuments')
    || text.includes('foundry.mjs:36190')
    || text.includes('foundry.mjs:47047')
    || text.includes('foundry.mjs:47099');
}

function shouldWarn() {
  try {
    const worldSetting = game?.settings?.get?.('foundryvtt-swse', 'debugMode');
    if (worldSetting === false) return false;
  } catch (_err) {
    // No registered debugMode setting in some boot phases/tests; keep guard active.
  }
  return true;
}

function emitWarning(logger, key, message, details = {}) {
  if (!shouldWarn() || WARNED_KEYS.has(key)) return;
  WARNED_KEYS.add(key);

  const payload = { ...details };
  try {
    if (logger?.warn) {
      logger.warn(message, payload);
      return;
    }
  } catch (_err) {
    // Fall through to console warning.
  }

  try {
    console.warn(message, payload);
  } catch (_err) {
    // No-op in restricted runtimes.
  }
}

export class ShellMutationGuard {
  static install(host, { label = host?.constructor?.name ?? 'ShellHost', logger = null } = {}) {
    if (!host || host[SURFACE_OPTIONS_INSTALLED]) return host;

    const initial = host._shellSurfaceOptions ?? {};
    Object.defineProperty(host, '_shellSurfaceOptions', {
      configurable: true,
      enumerable: false,
      get() {
        return this[SURFACE_OPTIONS_VALUE] ?? {};
      },
      set(value) {
        if (!this.__swseShellSurfaceOptionsMutationAllowed) {
          const stack = new Error().stack ?? '';
          emitWarning(
            logger,
            `${label}:surface-options:${getStackSignature(stack)}`,
            `[SWSE Shell] Direct _shellSurfaceOptions assignment detected in ${label}. Use patchSurfaceState/patchSurfaceOptions instead.`,
            { surface: this._shellSurface ?? this.currentPage ?? null, value, stack: getStackSignature(stack) }
          );
        }
        this[SURFACE_OPTIONS_VALUE] = value && typeof value === 'object' ? value : {};
      }
    });

    host.__swseShellSurfaceOptionsMutationAllowed = true;
    host._shellSurfaceOptions = initial;
    host.__swseShellSurfaceOptionsMutationAllowed = false;
    host[SURFACE_OPTIONS_INSTALLED] = true;

    ShellMutationGuard.installDocumentMutationGuards({ logger });

    if (!host[RENDER_WRAPPED] && typeof host.render === 'function') {
      const originalRender = host.render;
      host.render = function swseGuardedShellRender(...args) {
        ShellMutationGuard.warnDirectRender(this, { label, logger, args });
        return originalRender.apply(this, args);
      };
      host[RENDER_WRAPPED] = true;
    }

    return host;
  }


  static installDocumentMutationGuards({ logger = null } = {}) {
    const globalScope = globalThis;
    if (globalScope[DOCUMENT_MUTATION_GUARDS_INSTALLED]) return;
    globalScope[DOCUMENT_MUTATION_GUARDS_INSTALLED] = true;

    const patchPrototypeMethod = (prototype, methodName, label) => {
      if (!prototype || typeof prototype[methodName] !== 'function') return;
      const original = prototype[methodName];
      const wrappedKey = Symbol.for(`swse.${label}.${methodName}.wrapped`);
      if (original?.[wrappedKey]) return;

      const wrapped = function swseGuardedDocumentMutation(...args) {
        ShellMutationGuard.warnDirectDocumentMutation(this, {
          label,
          methodName,
          logger,
          args
        });
        return original.apply(this, args);
      };
      wrapped[wrappedKey] = true;
      prototype[methodName] = wrapped;
    };

    try {
      const documentPrototype = globalScope.foundry?.abstract?.Document?.prototype;
      patchPrototypeMethod(documentPrototype, 'update', 'Document');
      patchPrototypeMethod(documentPrototype, 'setFlag', 'Document');
      patchPrototypeMethod(documentPrototype, 'unsetFlag', 'Document');
    } catch (_err) {
      // Foundry prototypes may not exist in isolated unit-test contexts.
    }

    try {
      const settings = globalScope.game?.settings;
      if (settings && typeof settings.set === 'function' && !settings[SETTINGS_SET_WRAPPED]) {
        const originalSet = settings.set.bind(settings);
        settings.set = function swseGuardedSettingsSet(...args) {
          ShellMutationGuard.warnDirectDocumentMutation(settings, {
            label: 'game.settings',
            methodName: 'set',
            logger,
            args
          });
          return originalSet(...args);
        };
        settings[SETTINGS_SET_WRAPPED] = true;
      }
    } catch (_err) {
      // game.settings may not exist before ready.
    }
  }

  static withDocumentMutation(host, fn, { reason = 'shell-document-mutation', surfaceId = host?.shellSurface ?? host?.currentPage ?? null } = {}) {
    if (typeof fn !== 'function') return undefined;
    const globalScope = globalThis;
    const priorGlobalDepth = globalScope[DOCUMENT_MUTATION_ALLOWED_DEPTH] ?? 0;
    const priorHostDepth = host?.[DOCUMENT_MUTATION_ALLOWED_DEPTH] ?? 0;
    const restore = () => {
      globalScope[DOCUMENT_MUTATION_ALLOWED_DEPTH] = priorGlobalDepth;
      if (host) {
        host[DOCUMENT_MUTATION_ALLOWED_DEPTH] = priorHostDepth;
        if (priorHostDepth === 0) {
          delete host.__swseShellMutationReason;
          delete host.__swseShellMutationSurfaceId;
        }
      }
    };

    globalScope[DOCUMENT_MUTATION_ALLOWED_DEPTH] = priorGlobalDepth + 1;
    if (host) {
      host[DOCUMENT_MUTATION_ALLOWED_DEPTH] = priorHostDepth + 1;
      host.__swseShellMutationReason = reason;
      host.__swseShellMutationSurfaceId = surfaceId;
    }

    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.finally(restore);
      }
      restore();
      return result;
    } catch (err) {
      restore();
      throw err;
    }
  }

  static warnDirectDocumentMutation(document, { label = 'Document', methodName = 'update', logger = null, args = [] } = {}) {
    const globalScope = globalThis;
    if ((globalScope[DOCUMENT_MUTATION_ALLOWED_DEPTH] ?? 0) > 0) return;

    const stack = new Error().stack ?? '';
    if (!isShellStack(stack)) return;
    if (isActorEngineStack(stack)) return;

    const documentName = String(document?.documentName ?? document?.constructor?.documentName ?? document?.constructor?.name ?? '');
    if (documentName === 'Token' || documentName === 'TokenDocument') return;

    const docName = document?.name ?? document?.constructor?.name ?? label;
    emitWarning(
      logger,
      `${label}:${methodName}:${getStackSignature(stack)}`,
      `[SWSE Shell] Direct ${label}.${methodName} mutation detected from shell code. Use mutateAndRepaint(...) or mutateShellOnly(...) so mutation and repaint stay coordinated.`,
      {
        document: docName,
        methodName,
        argsSummary: args?.map?.(arg => {
          if (arg == null) return arg;
          if (typeof arg !== 'object') return arg;
          return Array.isArray(arg) ? `Array(${arg.length})` : Object.keys(arg).slice(0, 12);
        }) ?? [],
        stack: getStackSignature(stack)
      }
    );
  }

  static withSurfaceOptionsMutation(host, fn) {
    if (!host || typeof fn !== 'function') return undefined;
    const prior = host.__swseShellSurfaceOptionsMutationAllowed;
    host.__swseShellSurfaceOptionsMutationAllowed = true;
    try {
      return fn();
    } finally {
      host.__swseShellSurfaceOptionsMutationAllowed = prior;
    }
  }

  static withSurfaceRender(host, fn, { reason = 'shell-render', surfaceId = host?.shellSurface ?? host?._shellSurface ?? host?.currentPage ?? null } = {}) {
    if (!host || typeof fn !== 'function') return undefined;
    const priorAllowed = host.__swseShellRenderAllowed;
    const priorReason = host.__swseShellRenderReason;
    const priorSurfaceId = host.__swseShellRenderSurfaceId;
    const restore = () => {
      host.__swseShellRenderAllowed = priorAllowed;
      host.__swseShellRenderReason = priorReason;
      host.__swseShellRenderSurfaceId = priorSurfaceId;
    };

    host.__swseShellRenderAllowed = true;
    host.__swseShellRenderReason = reason;
    host.__swseShellRenderSurfaceId = surfaceId;

    try {
      const result = fn();
      if (result && typeof result.then === 'function') return result.finally(restore);
      restore();
      return result;
    } catch (err) {
      restore();
      throw err;
    }
  }

  static warnDirectRender(host, { label = host?.constructor?.name ?? 'ShellHost', logger = null, args = [] } = {}) {
    if (!host) return;
    if (host.__swseShellRenderAllowed) {
      if (!host.__swseShellRenderReason) {
        const stack = new Error().stack ?? '';
        emitWarning(
          logger,
          `${label}:render:no-reason:${getStackSignature(stack)}`,
          `[SWSE Shell] Coordinated render in ${label} did not provide a render reason. Pass { reason, surfaceId } to requestSurfaceRender/requestShellRender.`,
          { surface: host._shellSurface ?? host.currentPage ?? null, stack: getStackSignature(stack) }
        );
      }
      return;
    }
    if (args?.[0] !== false) return;

    const stack = new Error().stack ?? '';
    if (isActorEngineStack(stack) || isFoundryDocumentRenderStack(stack)) return;
    emitWarning(
      logger,
      `${label}:render:false:${getStackSignature(stack)}`,
      `[SWSE Shell] Direct render(false) detected in ${label}. Use requestSurfaceRender({ reason, surfaceId }) instead.`,
      { surface: host._shellSurface ?? host.currentPage ?? null, stack: getStackSignature(stack) }
    );
  }
}
