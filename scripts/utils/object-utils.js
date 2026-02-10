/**
 * Get a nested object value using dot notation.
 * e.g. get({a: {b: {c: 1}}}, "a.b.c") => 1
 */
export function get(obj, path, defaultValue = undefined) {
  if (!obj || !path) {return defaultValue;}

  const keys = String(path).split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {return defaultValue;}
    if (Array.isArray(current)) {
      const index = Number(key);
      if (Number.isNaN(index)) {return defaultValue;}
      current = current[index];
    } else {
      current = current[key];
    }
  }

  return current ?? defaultValue;
}
