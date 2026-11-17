/**
 * `game.packs` shim backed by the repository's REAL pack sources (packs/*.db).
 *
 * V2's registries (ClassesRegistry, SpeciesRegistry, FeatRegistry, SkillRegistry, TalentRegistry, …) only need
 * `game.packs.get(key)` with `getDocuments()/getDocument()/getIndex()`, and documents exposing `id/_id/name/type/img/
 * system/flags/uuid/toObject()`. This provides exactly that so the production registries and the Galactic Profile
 * service initialize from real data under Node. It emulates NO other Foundry behaviour (no Actor, no ActorEngine,
 * no rendering, no world database).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PACK_DIR = path.join(ROOT, 'packs');
const SYSTEM = 'foundryvtt-swse';
const clone = v => JSON.parse(JSON.stringify(v));

class ShimDocument {
  constructor(raw, packKey) {
    Object.assign(this, clone(raw));
    this.id = raw._id;
    this.pack = packKey;
    this.uuid = `Compendium.${packKey}.${raw._id}`;
    Object.defineProperty(this, '_raw', { value: raw, enumerable: false });
  }
  toObject() { const o = clone(this._raw); return o; }
}

class ShimPack {
  constructor(name) {
    this.collection = `${SYSTEM}.${name}`;
    this.metadata = { id: this.collection, name, packageName: SYSTEM, label: name, type: 'Item', system: SYSTEM };
    this.name = name;
    this._docs = null;
  }
  _load() {
    if (!this._docs) {
      const file = path.join(PACK_DIR, `${this.name}.db`);
      const raws = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
      this._docs = raws.map(r => new ShimDocument(r, this.collection));
    }
    return this._docs;
  }
  get index() { return this._load().map(d => ({ _id: d._id, name: d.name, type: d.type, img: d.img, system: d.system })); }
  async getIndex() { return this.index; }
  async getDocuments() { return [...this._load()]; }
  async getDocument(id) { return this._load().find(d => d._id === id) ?? null; }
}

export function installPackShim() {
  const names = fs.readdirSync(PACK_DIR).filter(f => f.endsWith('.db')).map(f => f.slice(0, -3));
  const packs = new Map(names.map(n => [`${SYSTEM}.${n}`, new ShimPack(n)]));
  globalThis.game ??= {};
  globalThis.game.packs = packs;
  globalThis.game.system = { id: SYSTEM };
  return packs;
}

/**
 * `fetch` shim: serves `/systems/foundryvtt-swse/<path>` (and the relative `systems/foundryvtt-swse/<path>`) straight
 * from the repository checkout, exactly as Foundry would serve the installed system. Anything else is a 404 so a stray
 * network dependency fails loudly instead of silently succeeding.
 */
export function installFetchShim() {
  const real = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input?.url ?? input);
    const m = /^\/?systems\/foundryvtt-swse\/([^?#]+)/.exec(url.split('?')[0]);
    if (!m) return { ok: false, status: 404, statusText: 'Not Found', json: async () => { throw new Error('404'); }, text: async () => '' };
    const file = path.join(ROOT, decodeURIComponent(m[1]));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return { ok: false, status: 404, statusText: 'Not Found', json: async () => { throw new Error('404'); }, text: async () => '' };
    const text = fs.readFileSync(file, 'utf8');
    return { ok: true, status: 200, statusText: 'OK', json: async () => JSON.parse(text), text: async () => text };
  };
  return () => { globalThis.fetch = real; };
}
