/**
 * ShellSurfaceState
 *
 * Canonical, render-safe UI state for datapad shell surfaces.
 *
 * Gameplay data still belongs in actors, items, settings, and engines. This
 * store is only for route/view state that must survive repaint cycles: active
 * tabs, selected records, searches, transient choices, and surface options.
 */
export class ShellSurfaceState {
  constructor(initialState = {}) {
    this._state = this._clone(initialState);
  }

  get(surfaceId = null) {
    if (!surfaceId) return this._clone(this._state);
    return this._clone(this._state?.[surfaceId] ?? {});
  }

  replace(surfaceId, value = {}) {
    if (!surfaceId) return this.get();
    this._state[surfaceId] = this._clone(value);
    return this.get(surfaceId);
  }

  patch(surfaceId, patch = {}) {
    if (!surfaceId || !patch || typeof patch !== 'object') return this.get(surfaceId);
    const current = this._state[surfaceId] && typeof this._state[surfaceId] === 'object'
      ? this._state[surfaceId]
      : {};
    this._state[surfaceId] = { ...current, ...this._clone(patch) };
    return this.get(surfaceId);
  }

  clear(surfaceId) {
    if (!surfaceId) return;
    delete this._state[surfaceId];
  }

  _clone(value) {
    if (!value || typeof value !== 'object') return value ?? {};
    try {
      return foundry?.utils?.deepClone?.(value) ?? structuredClone(value);
    } catch (_err) {
      return Array.isArray(value) ? [...value] : { ...value };
    }
  }
}
