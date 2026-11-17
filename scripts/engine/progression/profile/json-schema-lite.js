/**
 * Minimal JSON Schema (2020-12 subset) validator.
 *
 * Exists because the repository's test suite and Foundry runtime ship no npm dependencies. Supports exactly
 * what galactic-profiles.schema.json uses: type, enum, const, required, properties, additionalProperties(false),
 * items, minItems, maxItems, minLength, minimum, maximum, pattern, not, allOf, if/then, $ref (#/$defs/…).
 * Unknown keywords are ignored (never silently "pass" a keyword it claims to support).
 */
const SUPPORTED = new Set(['type', 'enum', 'const', 'required', 'properties', 'additionalProperties', 'items', 'minItems', 'maxItems',
  'minLength', 'minimum', 'maximum', 'pattern', 'not', 'allOf', 'if', 'then', '$ref', '$schema', '$id', '$defs', 'title', 'description']);

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}
const typeMatches = (v, t) => (t === 'number' ? typeof v === 'number' : typeOf(v) === t || (t === 'number' && typeOf(v) === 'integer'));
const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref ${ref}`);
  return ref.slice(2).split('/').reduce((n, k) => n?.[k], root);
}

/** @returns {string[]} error messages (empty = valid) */
export function validate(schema, value, root = schema, at = '') {
  const errors = [];
  const push = msg => errors.push(`${at || '/'} ${msg}`);
  if (schema === true || schema === undefined) return errors;
  for (const k of Object.keys(schema)) if (!SUPPORTED.has(k)) throw new Error(`json-schema-lite: unsupported keyword "${k}"`);

  if (schema.$ref) return validate(resolveRef(root, schema.$ref), value, root, at);

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some(t => typeMatches(value, t))) { push(`must be ${types.join('|')} (got ${typeOf(value)})`); return errors; }
  }
  if ('const' in schema && !deepEqual(schema.const, value)) push(`must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some(e => deepEqual(e, value))) push(`must be one of ${JSON.stringify(schema.enum)}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) push(`must be >= ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) push(`must be <= ${schema.maximum}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) push(`must have length >= ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) push(`must match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) push(`must have >= ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) push(`must have <= ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, root, `${at}/${i}`)));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const r of schema.required || []) if (!(r in value)) push(`missing required property "${r}"`);
    const props = schema.properties || {};
    for (const [k, sub] of Object.entries(props)) if (k in value) errors.push(...validate(sub, value[k], root, `${at}/${k}`));
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(value)) if (!(k in props)) push(`has unexpected property "${k}"`);
    }
  }
  if (schema.not && validate(schema.not, value, root, at).length === 0) push('must not match the forbidden shape');
  for (const sub of schema.allOf || []) errors.push(...validate(sub, value, root, at));
  if (schema.if && validate(schema.if, value, root, at).length === 0 && schema.then) errors.push(...validate(schema.then, value, root, at));
  return errors;
}
