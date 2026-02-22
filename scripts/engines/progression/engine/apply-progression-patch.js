/**
 * Apply a ProgressionPatch to a characterData-like object.
 *
 * Supported operations:
 *   - { op: 'set', path: 'a.b.c', value }
 */

/**
 * @param {any} value
 * @returns {any}
 */
function deepClone(value) {
  try {
    return structuredClone(value);
  } catch (_err) {
    return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Set a value on an object using a dot-separated path.
 * @param {Object} root
 * @param {string} path
 * @param {any} value
 */
function setAtPath(root, path, value) {
  if (!path) {return;}
  const parts = String(path).split('.').filter(Boolean);
  let cursor = root;

  for (let i = 0; i < parts.length; i += 1) {
    const keyRaw = parts[i];
    const isLast = i === parts.length - 1;
    const key = /^[0-9]+$/.test(keyRaw) ? Number(keyRaw) : keyRaw;

    if (isLast) {
      cursor[key] = value;
      return;
    }

    if (cursor[key] == null || typeof cursor[key] !== 'object') {
      const nextRaw = parts[i + 1];
      const nextIsIndex = /^[0-9]+$/.test(nextRaw);
      cursor[key] = nextIsIndex ? [] : {};
    }

    cursor = cursor[key];
  }
}

/**
 * @param {Object} current
 * @param {{ ops?: Array<{op: string, path: string, value: any}> }} patch
 * @returns {Object}
 */
export function applyProgressionPatch(current, patch) {
  const next = deepClone(current ?? {});
  const ops = patch?.ops ?? [];

  for (const op of ops) {
    if (!op || op.op !== 'set') {continue;}
    setAtPath(next, op.path, op.value);
  }

  return next;
}
