/**
 * ProgressionPatch
 *
 * A small, serializable description of state changes which can be applied
 * to chargen/level-up working state without mutating the original object.
 */

/**
 * @typedef {Object} ProgressionPatchOp
 * @property {'set'} op
 * @property {string} path Dot-separated path (e.g. "name", "abilities.str.racial")
 * @property {any} value
 */

/**
 * @typedef {Object} ProgressionPatch
 * @property {ProgressionPatchOp[]} ops
 * @property {Object} [meta]
 */

/**
 * Create a patch from ops.
 * @param {ProgressionPatchOp[]} ops
 * @param {Object} [meta]
 * @returns {ProgressionPatch}
 */
export function makePatch(ops = [], meta = undefined) {
  return { ops: Array.isArray(ops) ? ops : [], ...(meta ? { meta } : {}) };
}

/**
 * Concatenate multiple patches into a single atomic patch.
 * @param  {...ProgressionPatch} patches
 * @returns {ProgressionPatch}
 */
export function concatPatches(...patches) {
  const flat = patches.filter(Boolean);
  const ops = flat.flatMap(p => p.ops || []);
  const meta = flat.reduce((acc, p) => Object.assign(acc, p.meta || {}), {});
  return makePatch(ops, Object.keys(meta).length ? meta : undefined);
}

/**
 * Create a set op.
 * @param {string} path
 * @param {any} value
 * @returns {ProgressionPatchOp}
 */
export function setField(path, value) {
  return { op: 'set', path, value };
}

/**
 * Patch helpers for core chargen choices.
 */

/**
 * @param {string} name
 * @returns {ProgressionPatch}
 */
export function patchName(name) {
  const trimmed = String(name ?? '').trim();
  return makePatch([setField('name', trimmed)]);
}

/**
 * @param {string} speciesName
 * @param {{ speciesSource?: string }} [opts]
 * @returns {ProgressionPatch}
 */
export function patchSpecies(speciesName, opts = {}) {
  return makePatch([
    setField('species', String(speciesName ?? '')),
    setField('speciesSource', String(opts.speciesSource ?? ''))
  ]);
}

/**
 * @param {string} className
 * @returns {ProgressionPatch}
 */
export function patchClass(className) {
  return makePatch([
    setField('classes', [{ name: String(className ?? ''), level: 1 }])
  ]);
}
