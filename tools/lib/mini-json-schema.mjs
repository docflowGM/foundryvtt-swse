// D-005 T4c: a restricted, dependency-free JSON Schema checker.
//
// It exists so the offline host-requirements validator can prove that a sidecar conforms to the committed schema file
// without a third-party library. It supports ONLY the validation keywords the host-requirements schema uses and FAILS
// CLOSED on anything else: a schema that uses an unsupported validation keyword is reported as unsupported, never
// silently ignored. Pure; no filesystem; no Foundry.

const ANNOTATIONS = new Set(['$schema', '$id', 'title', 'description', '$defs']);
const SUPPORTED = new Set([
  '$ref', 'type', 'const', 'enum', 'required', 'properties', 'additionalProperties', 'items', 'oneOf',
  'minItems', 'maxItems', 'uniqueItems', 'minLength', 'minimum', 'pattern'
]);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function typeOk(type, value) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'null': return value === null;
    case 'object': return isObj(value);
    case 'array': return Array.isArray(value);
    default: return false;
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * @returns {{ valid: boolean, unsupported: {path:string,keyword:string}[], errors: {path:string,keyword:string,detail:any}[] }}
 */
export function checkJsonSchema(rootSchema, value) {
  const unsupported = [];
  const errors = [];

  const resolve = (ref, at) => {
    const m = /^#\/\$defs\/([A-Za-z0-9_-]+)$/.exec(ref);
    const target = m && isObj(rootSchema?.$defs) ? rootSchema.$defs[m[1]] : undefined;
    if (target === undefined) unsupported.push({ path: at, keyword: `$ref:${ref}` });
    return target;
  };

  const validate = (schema, v, at) => {
    if (!isObj(schema)) { unsupported.push({ path: at, keyword: 'non-object schema' }); return false; }
    for (const k of Object.keys(schema)) {
      if (!SUPPORTED.has(k) && !ANNOTATIONS.has(k)) unsupported.push({ path: at, keyword: k });
    }
    if ('$ref' in schema) {
      const target = resolve(schema.$ref, at);
      return target === undefined ? false : validate(target, v, at);
    }
    let ok = true;
    const bad = (keyword, detail = null) => { errors.push({ path: at, keyword, detail }); ok = false; };

    if ('type' in schema && !typeOk(schema.type, v)) { bad('type', { expected: schema.type }); return false; }
    if ('const' in schema && !same(schema.const, v)) bad('const', { expected: schema.const });
    if ('enum' in schema && !(Array.isArray(schema.enum) && schema.enum.some((e) => same(e, v)))) bad('enum');
    if (typeof v === 'string') {
      if ('minLength' in schema && v.length < schema.minLength) bad('minLength');
      if ('pattern' in schema && !new RegExp(schema.pattern).test(v)) bad('pattern', { pattern: schema.pattern });
    }
    if (Number.isInteger(v) && 'minimum' in schema && v < schema.minimum) bad('minimum');
    if (Array.isArray(v)) {
      if ('minItems' in schema && v.length < schema.minItems) bad('minItems');
      if ('maxItems' in schema && v.length > schema.maxItems) bad('maxItems');
      if (schema.uniqueItems === true && new Set(v.map((x) => JSON.stringify(x))).size !== v.length) bad('uniqueItems');
      if ('items' in schema) v.forEach((x, i) => { if (!validate(schema.items, x, `${at}/${i}`)) ok = false; });
    }
    if (isObj(v)) {
      for (const r of schema.required ?? []) if (!Object.prototype.hasOwnProperty.call(v, r)) bad('required', { key: r });
      const props = isObj(schema.properties) ? schema.properties : {};
      for (const [k, sub] of Object.entries(props)) {
        if (Object.prototype.hasOwnProperty.call(v, k) && !validate(sub, v[k], `${at}/${k}`)) ok = false;
      }
      if ('additionalProperties' in schema) {
        if (schema.additionalProperties === false) {
          for (const k of Object.keys(v)) if (!Object.prototype.hasOwnProperty.call(props, k)) bad('additionalProperties', { key: k });
        } else if (schema.additionalProperties !== true) unsupported.push({ path: at, keyword: 'additionalProperties:schema' });
      }
    }
    if ('oneOf' in schema) {
      const branches = Array.isArray(schema.oneOf) ? schema.oneOf : [];
      const snapshot = errors.length;
      let matches = 0;
      for (const b of branches) {
        const before = errors.length;
        if (validate(b, v, at)) matches += 1;
        errors.length = before; // branch-local failures are not reported individually
      }
      void snapshot;
      if (matches !== 1) bad('oneOf', { matches });
    }
    return ok;
  };

  const rootOk = validate(rootSchema, value, '');
  return { valid: rootOk && unsupported.length === 0 && errors.length === 0, unsupported, errors };
}
