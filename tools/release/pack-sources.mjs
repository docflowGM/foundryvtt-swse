/**
 * Release pack sources -- pure, dependency-free helpers shared by the release pack build and its test.
 *
 * The repository versions every compendium as a legacy line-delimited NeDB file (`packs/<name>.db`). system.json declares the V13
 * LevelDB directory (`packs/<name>`), which is a build artifact. These helpers map one to the other and read a `.db` the way NeDB
 * replays it (later lines win, `$$deleted` removes, index records are ignored) so the compiled output can be checked independently of
 * the compiler. Nothing here writes a file.
 */
import { createHash } from 'node:crypto';

/** Document type -> LevelDB collection, for the types this system's manifest declares. */
export const TYPE_COLLECTION = Object.freeze({ Actor: 'actors', Item: 'items', JournalEntry: 'journal' });

/** Embedded collections stored under their own keys (the subset of Foundry's hierarchy these types use). */
export const EMBEDDED = Object.freeze({ actors: ['items', 'effects'], items: ['effects'], journal: ['pages', 'categories'] });

/**
 * Map system.json packs to their committed source and compiled target.
 * @returns {{packs: Array<{name, type, collection, path, source}>, problems: string[]}}
 */
export function planPacks(manifest) {
  const problems = [];
  const packs = [];
  for (const pack of Array.isArray(manifest?.packs) ? manifest.packs : []) {
    const where = pack?.name ?? '<unnamed>';
    if (typeof pack?.path !== 'string' || !pack.path.startsWith('packs/')) { problems.push(`${where}: path must be under packs/`); continue; }
    if (pack.path.endsWith('.db')) { problems.push(`${where}: declares a .db file; V13 packs are LevelDB directories`); continue; }
    const collection = TYPE_COLLECTION[pack.type];
    if (!collection) { problems.push(`${where}: document type ${pack.type} has no collection mapping`); continue; }
    packs.push({ name: pack.name, type: pack.type, collection, path: pack.path, source: `${pack.path}.db` });
  }
  return { packs, problems };
}

/**
 * Replay a NeDB file's text into its live documents.
 * @returns {{docs: object[], problems: string[]}}
 */
export function parseNedb(text) {
  const live = new Map();
  const problems = [];
  String(text ?? '').split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let rec;
    try { rec = JSON.parse(line); } catch (err) { problems.push(`line ${i + 1}: ${err.message}`); return; }
    if (!rec || typeof rec !== 'object' || Array.isArray(rec)) { problems.push(`line ${i + 1}: not an object`); return; }
    if (rec.$$indexCreated || rec.$$indexRemoved) return;
    if (typeof rec._id !== 'string' || !rec._id) { problems.push(`line ${i + 1}: missing _id`); return; }
    if (rec.$$deleted === true) { live.delete(rec._id); return; }
    live.delete(rec._id); // re-insert so the replay order matches NeDB's last write
    live.set(rec._id, rec);
  });
  return { docs: [...live.values()], problems };
}

/**
 * Deterministic id for an embedded document the source stores without one: 16 hex characters of SHA-256 over the parent key, the
 * embedded collection and the entry's position. Stable for an unchanged source, so the build is reproducible.
 */
export function synthesizedEmbeddedId(parentKey, collection, index) {
  return createHash('sha256').update(`${parentKey}|${collection}|${index}`).digest('hex').slice(0, 16);
}

/**
 * Prepare documents for the official LevelDB compiler (@foundryvtt/foundryvtt-cli compilePack): deep copies with Foundry's `_key`
 * (`!<sublevel>!<id path>`) on every document and embedded document. An embedded document without an `_id` (the actor packs carry
 * Active Effects stored that way) gets a synthesized one -- only in the built artifact; the source is not modified. Duplicate keys are
 * reported because the compiler would refuse or overwrite them. The originals are not modified.
 * @returns {{docs: object[], keys: Set<string>, synthesized: number, problems: string[]}}
 */
export function prepareDocuments(docs, collection) {
  const keys = new Set();
  const problems = [];
  let synthesized = 0;
  const assign = (doc, sublevel, idPath) => {
    const key = `!${sublevel}!${idPath}`;
    if (keys.has(key)) problems.push(`duplicate key ${key}`);
    keys.add(key);
    const copy = { ...doc, _key: key };
    const leaf = sublevel.split('.').at(-1);
    for (const child of EMBEDDED[leaf] ?? []) {
      if (!Array.isArray(doc[child])) continue;
      copy[child] = doc[child].map((sub, i) => {
        if (!sub || typeof sub !== 'object' || Array.isArray(sub)) { problems.push(`${key}: embedded ${child}[${i}] is not a document`); return sub; }
        let id = sub._id;
        if (typeof id !== 'string' || !id) { id = synthesizedEmbeddedId(key, child, i); synthesized += 1; }
        return assign({ ...sub, _id: id }, `${sublevel}.${child}`, `${idPath}.${id}`);
      });
    }
    return copy;
  };
  const out = docs.map((doc) => assign(structuredClone(doc), collection, doc._id));
  return { docs: out, keys, synthesized, problems };
}

/** The document as it is expected to read back from the compiled pack: `_key` removed at every level, absent embedded lists as []. */
export function expectedReadBack(prepared, collection) {
  const leaf = collection.split('.').at(-1);
  const { _key, ...copy } = prepared;
  for (const child of EMBEDDED[leaf] ?? []) copy[child] = Array.isArray(prepared[child]) ? prepared[child].map((d) => expectedReadBack(d, child)) : [];
  return copy;
}

/**
 * Package layout: what the release ZIP must contain, relative to the system root.
 * `data/audits` and `data/audit` are review evidence that no runtime module loads; everything else under data/ ships because several
 * loaders build data paths at runtime.
 */
export const PACKAGE_INCLUDE = Object.freeze(['system.json', 'template.json', 'index.js', 'LICENSE', 'templates', 'scripts', 'helpers', 'styles', 'assets', 'lang', 'data']);
export const PACKAGE_EXCLUDE_DIRS = Object.freeze(['data/audits', 'data/audit']);

/**
 * Every path system.json makes Foundry load, checked against a staged package: esmodules, scripts, styles, languages and each pack
 * (a LevelDB directory with a CURRENT file naming an existing MANIFEST).
 * @param {object} manifest system.json
 * @param {{isFile:(p:string)=>boolean, isDir:(p:string)=>boolean, read:(p:string)=>string}} fsView relative to the package root
 * @returns {string[]} problems; empty when the package satisfies the manifest
 */
export function manifestCoverage(manifest, fsView) {
  const problems = [];
  const files = [...(manifest.esmodules ?? []), ...(manifest.scripts ?? []), ...(manifest.styles ?? []).map((s) => (typeof s === 'string' ? s : s?.src)), ...(manifest.languages ?? []).map((l) => l?.path)];
  for (const f of files) if (typeof f !== 'string' || !fsView.isFile(f)) problems.push(`missing file ${f}`);
  for (const pack of manifest.packs ?? []) {
    if (!fsView.isDir(pack.path)) { problems.push(`missing pack directory ${pack.path}`); continue; }
    const current = fsView.isFile(`${pack.path}/CURRENT`) ? fsView.read(`${pack.path}/CURRENT`).trim() : '';
    if (!current || !fsView.isFile(`${pack.path}/${current}`)) problems.push(`pack ${pack.path} is not a LevelDB store (CURRENT/MANIFEST)`);
  }
  return problems;
}

export default { manifestCoverage, TYPE_COLLECTION, EMBEDDED, planPacks, parseNedb, prepareDocuments, expectedReadBack, synthesizedEmbeddedId, PACKAGE_INCLUDE, PACKAGE_EXCLUDE_DIRS };
