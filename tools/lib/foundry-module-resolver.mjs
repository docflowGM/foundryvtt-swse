/**
 * Minimal Node ESM loader hook that lets node scripts import Foundry-style
 * absolute module specifiers ("/systems/foundryvtt-swse/scripts/...") the
 * same way the running game client resolves them, so pure/dependency-light
 * engine modules can be exercised by real node smoke tests without a full
 * Foundry runtime.
 *
 * Only rewrites the "/systems/foundryvtt-swse/" prefix to the repo root
 * (read from SWSE_REPO_ROOT, set by the invoking script); everything else is
 * passed through to the default resolver unchanged. This does not, and is
 * not meant to, make Foundry-global-dependent modules (game/canvas/ui)
 * importable — only modules that are themselves dependency-free or only
 * import other dependency-free modules.
 */
const PREFIX = '/systems/foundryvtt-swse/';

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(PREFIX)) {
    const root = process.env.SWSE_REPO_ROOT;
    if (!root) throw new Error('foundry-module-resolver: SWSE_REPO_ROOT is not set');
    const rel = specifier.slice(PREFIX.length);
    return nextResolve(new URL(rel, `file://${root}/`).href, context);
  }
  return nextResolve(specifier, context);
}
