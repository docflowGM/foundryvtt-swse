// Node module-resolution hook: map Foundry's "/systems/foundryvtt-swse/..." specifiers to this repo.
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';
const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('/systems/foundryvtt-swse/'))
    return next(pathToFileURL(pathResolve(ROOT, specifier.slice('/systems/foundryvtt-swse/'.length))).href, context);
  return next(specifier, context);
}
