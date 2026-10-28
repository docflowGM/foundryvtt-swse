/**
 * Intent fingerprint (E4-C1 WP3-A) -- PURE.
 *
 * Canonical serialization plus a dependency-free SHA-256, used to bind a request id to the exact intent it was issued for and to compare
 * stable plan/basis fingerprints. A digest binds data to data: it does NOT authenticate the sender and proves nothing about who produced it.
 *
 * Canonical form (deterministic, injective over the accepted value space):
 *   null | boolean | finite number | string | array | plain object with own enumerable string keys.
 *   Object keys are sorted by UTF-16 code unit order; strings are emitted JSON-escaped; the result is encoded as UTF-8.
 *   Rejected (CanonicalizationError): undefined, NaN, +/-Infinity, bigint, symbol, function, Date/Map/Set/class instances, symbol keys, sparse
 *   arrays, cycles, nesting deeper than MAX_DEPTH, and strings containing lone surrogates (they have no valid UTF-8 encoding). -0 is canonical `0`.
 *   Unicode is never normalized: distinct code point sequences stay distinct.
 */

export const MAX_DEPTH = 32;

/** Codes: UNSUPPORTED_TYPE, NON_FINITE_NUMBER, LONE_SURROGATE, CYCLE, TOO_DEEP, SPARSE_ARRAY, SYMBOL_KEY, NOT_PLAIN_OBJECT. */
export class CanonicalizationError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'CanonicalizationError';
    this.code = code;
  }
}

function assertWellFormed(str, where) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = str.charCodeAt(i + 1);
      if (!(d >= 0xdc00 && d <= 0xdfff)) throw new CanonicalizationError('LONE_SURROGATE', `${where} contains a lone high surrogate`);
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) throw new CanonicalizationError('LONE_SURROGATE', `${where} contains a lone low surrogate`);
  }
}

function emit(value, path, depth, stack) {
  if (depth > MAX_DEPTH) throw new CanonicalizationError('TOO_DEEP', `${path} is nested deeper than ${MAX_DEPTH}`);
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean': return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalizationError('NON_FINITE_NUMBER', `${path} is not a finite number`);
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'string':
      assertWellFormed(value, path);
      return JSON.stringify(value);
    case 'object': break;
    default: throw new CanonicalizationError('UNSUPPORTED_TYPE', `${path} has unsupported type ${typeof value}`);
  }
  if (stack.has(value)) throw new CanonicalizationError('CYCLE', `${path} is part of a cycle`);
  stack.add(value);
  try {
    if (Array.isArray(value)) {
      const parts = [];
      for (let i = 0; i < value.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(value, i)) throw new CanonicalizationError('SPARSE_ARRAY', `${path}[${i}] is a hole`);
        parts.push(emit(value[i], `${path}[${i}]`, depth + 1, stack));
      }
      return `[${parts.join(',')}]`;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new CanonicalizationError('NOT_PLAIN_OBJECT', `${path} is not a plain object`);
    if (Object.getOwnPropertySymbols(value).length) throw new CanonicalizationError('SYMBOL_KEY', `${path} has a symbol key`);
    const keys = Object.keys(value).sort();
    const parts = keys.map((k) => {
      assertWellFormed(k, `${path} key`);
      return `${JSON.stringify(k)}:${emit(value[k], `${path}.${k}`, depth + 1, stack)}`;
    });
    return `{${parts.join(',')}}`;
  } finally {
    stack.delete(value);
  }
}

/** @returns {string} the canonical text of a supported value. @throws {CanonicalizationError} */
export function canonicalize(value) {
  return emit(value, '$', 0, new Set());
}

/** UTF-8 bytes of a well-formed string. */
export function utf8Bytes(str) {
  if (typeof str !== 'string') throw new CanonicalizationError('UNSUPPORTED_TYPE', 'utf8Bytes needs a string');
  assertWellFormed(str, 'string');
  const out = [];
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
  }
  return Uint8Array.from(out);
}

const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 of a byte array, as lowercase hex. */
export function sha256Hex(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new CanonicalizationError('UNSUPPORTED_TYPE', 'sha256Hex needs a Uint8Array');
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const h = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

/** SHA-256 (hex) of the canonical form of a supported value. Binds data to data; it authenticates nobody. */
export function fingerprintIntent(value) {
  return sha256Hex(utf8Bytes(canonicalize(value)));
}

export default { canonicalize, utf8Bytes, sha256Hex, fingerprintIntent, CanonicalizationError, MAX_DEPTH };
