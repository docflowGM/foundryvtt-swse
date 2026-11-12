// Shared fixture for reconciliation domain tests (real class data; in-memory actors only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { ClassesDB } = await import('/systems/foundryvtt-swse/scripts/data/classes-db.js');
const { normalizeClass } = await import('/systems/foundryvtt-swse/scripts/data/class-normalizer.js');
for (const line of fs.readFileSync(path.join(ROOT, 'packs/classes.db'), 'utf8').split(/\r?\n/).filter(Boolean)) {
  const model = normalizeClass(JSON.parse(line));
  ClassesDB.classes.set(model.id, model);
}
ClassesDB.isBuilt = true;
let seq = 0;
export const nextId = () => `f${++seq}`;
export const item = (type, name, system = {}, flags = {}) => ({ id: nextId(), type, name, system, flags: { swse: flags } });
export const cls = (name, level) => item('class', name, { level, classId: name.toLowerCase().replace(/\s+/g, '_') });
export const row = (name, level) => ({ class: name, classId: name.toLowerCase().replace(/\s+/g, '_'), level });
export function character({ classes = [['Soldier', 3]], items = [], flags = {}, system = {}, type = 'character' } = {}) {
  const total = classes.reduce((n, [, l]) => n + l, 0);
  return {
    id: nextId(), name: 'Fixture', type, flags: { swse: flags }, _stats: { modifiedTime: 1 },
    items: [...classes.map(([n, l]) => cls(n, l)), ...items],
    system: { level: total, hp: { max: 30 }, attributes: { con: { base: 10 } }, forcePoints: { value: 6, max: 6 }, progression: { classLevels: classes.map(([n, l]) => row(n, l)) }, ...system },
  };
}
