// Minimal pack IO shared by the talent-tag cleanup tools (Phase 11-2A).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
export const readJson = rel => JSON.parse(read(rel));
export const parse = t => t.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
export const TALENTS = 'packs/talents.db', HOMEBREW = 'packs/talents-homebrew.db', TREES = 'packs/talent_trees.db';
