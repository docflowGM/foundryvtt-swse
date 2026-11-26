// UI ports (A-07): engines must not import presentation modules. A UI module registers itself here when it loads; engine code reaches it through
// the port. Leaf module (no imports). Falls back to the global the dialog module already publishes so headless/test runs keep working.
const registry = new Map();

export function registerUiPort(name, implementation) {
  if (implementation) registry.set(name, implementation);
}

/** The registered implementation or null (never throws) for callers that have their own fallback. */
export function peekUiPort(name) {
  return registry.get(name) ?? (name === 'dialogV2' ? globalThis.SWSEDialogV2 : undefined) ?? null;
}

function resolvePort(name) {
  const impl = registry.get(name) ?? (name === 'dialogV2' ? globalThis.SWSEDialogV2 : undefined);
  if (!impl) throw new Error(`UI port "${name}" is not registered (its presentation module has not been loaded)`);
  return impl;
}

/** SWSEDialogV2 prompt/confirm for engine-side talent/feat dialogs. `confirm` stays optional exactly like the class it fronts. */
export const DialogPort = Object.freeze({
  prompt: (...args) => resolvePort('dialogV2').prompt(...args),
  confirm: (...args) => resolvePort('dialogV2').confirm?.(...args),
  wait: (...args) => resolvePort('dialogV2').wait(...args),
});

/** Opens the Force Alchemy workbench (registered by apps/force-alchemy/force-alchemy-workbench-app.js). */
export function openForceAlchemyWorkbenchPort(...args) {
  return resolvePort('forceAlchemyWorkbench')(...args);
}
