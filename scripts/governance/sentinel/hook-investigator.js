/**
 * HookInvestigator
 *
 * Detects illegal hook registrations at runtime.
 * Flags any hook registration where handler is not a function.
 */

export class HookInvestigator {

  static initialize() {
    if (!globalThis.Hooks) return;

    const originalOn = Hooks.on;
    const originalOnce = Hooks.once;

    Hooks.on = function(hook, fn) {
      HookInvestigator._validate(hook, fn, "on");
      return originalOn.call(this, hook, fn);
    };

    Hooks.once = function(hook, fn) {
      HookInvestigator._validate(hook, fn, "once");
      return originalOnce.call(this, hook, fn);
    };

    console.log("[Sentinel] HookInvestigator active.");
  }

  static _validate(hook, fn, method) {
    if (typeof fn === "function") return;

    const stack = new Error().stack;

    console.error(
      `[HOOK-INVESTIGATOR] Invalid hook registration detected\n` +
      `Method: Hooks.${method}\n` +
      `Hook: ${hook}\n` +
      `Type: ${typeof fn}\n` +
      `Value:`,
      fn,
      "\nStack:\n",
      stack
    );
  }
}
