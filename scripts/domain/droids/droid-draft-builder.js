/**
 * Droid draft builder (pure; no actor writes, no Foundry globals).
 *
 * ONE place that turns a droid construction SELECTION (degree, size, component identities) into the exact
 * `draftSelections.droid` shape the Droid Builder step writes, using only canonical definitions and the existing
 * quote / installation authorities:
 *
 *   identities --(DROID_SYSTEMS)--> builder-shaped rows --(quoteDroidBuild)--> price, grants, status
 *                                                      --(buildInitialDroidInstallation, dry)--> installation gate
 *
 * It is generic: no profile ids, no per-droid cases. A custom droid produced by the builder UI, a saved draft or
 * a Galactic Profile all pass through the same function. Nothing the caller supplies is trusted for price or
 * grants: costs come from the quote, `type` of an appendage comes from its canonical definition.
 *
 * Failure is fail-closed: any unknown component, non-OK quote, over-budget total or unresolved installation
 * returns `ok:false` with explicit codes. It never degrades or substitutes.
 */
import { DROID_SYSTEMS } from '../../data/droid-systems.js';
import { quoteDroidBuild } from './droid-build-quote.js';
import { buildInitialDroidInstallation } from './droid-initial-installation-service.js';
import { getDroidSizeDefaultLocomotion } from '../../engine/progression/droids/droid-trait-rules.js';

const str = v => (typeof v === 'string' ? v.trim() : '');
/** The two baseline free hands are addressed by slot id; the physical part is the canonical `hand`. */
export const normalizeAppendageId = id => (id === 'hand-1' || id === 'hand-2' ? 'hand' : id);

const find = (list, id) => (Array.isArray(list) ? list.find(d => d.id === id) ?? null : null);

/**
 * Resolve identities to builder-shaped rows.
 * @param {{size:string, systems:object}} selection
 * @returns {{ok:boolean, systems?:object, blocked:object[]}}
 */
export function resolveDroidSystemsSelection({ size, systems } = {}) {
  const blocked = [];
  const sys = systems && typeof systems === 'object' ? systems : {};
  const unknown = (group, id) => blocked.push({ code: 'UNKNOWN_COMPONENT', path: `droid.systems.${group}`, detail: `${group}:${id || '(none)'}` });

  let locomotion = null;
  const locoId = str(sys.locomotion?.id);
  const locoDef = find(DROID_SYSTEMS.locomotion, locoId);
  if (!locoDef) unknown('locomotion', locoId);
  else {
    const speed = locoDef.speeds?.[size] ?? locoDef.baseSpeed?.[size] ?? null;
    locomotion = { id: locoId, name: locoDef.name, speed, isDefault: locoId === getDroidSizeDefaultLocomotion(size) };
  }

  let processor = null;
  const procId = str(sys.processor?.id);
  const procDef = find(DROID_SYSTEMS.processors, procId);
  if (!procDef) unknown('processor', procId);
  else processor = { id: procId, name: procDef.name };

  const appendages = [];
  for (const entry of Array.isArray(sys.appendages) ? sys.appendages : []) {
    const slotId = str(entry?.id);
    const def = find(DROID_SYSTEMS.appendages, normalizeAppendageId(slotId));
    if (!def) { unknown('appendages', slotId); continue; }
    // `type` is the canonical physical part; the installation projection reads it for slot-style ids.
    appendages.push({ id: slotId, name: def.name, type: def.id });
  }

  const accessories = [];
  for (const entry of Array.isArray(sys.accessories) ? sys.accessories : []) {
    const id = str(entry?.id); const category = str(entry?.category ?? entry?.subcategory);
    const def = find(DROID_SYSTEMS.accessories?.[category], id);
    if (!def) { unknown('accessories', `${category}:${id}`); continue; }
    accessories.push({ id, category, name: def.name });
  }

  const enhancement = (key, defs) => (Array.isArray(sys[key]) ? sys[key] : []).flatMap(entry => {
    const id = str(entry?.id); const def = find(defs, id);
    if (!def) { unknown(key, id); return []; }
    return [{ id, name: def.name }];
  });
  const locomotionEnhancements = enhancement('locomotionEnhancements', DROID_SYSTEMS.locomotionEnhancements);
  const appendageEnhancements = enhancement('appendageEnhancements', DROID_SYSTEMS.appendageEnhancements);

  if (blocked.length) return { ok: false, blocked };
  return { ok: true, blocked, systems: { locomotion, processor, appendages, accessories, locomotionEnhancements, appendageEnhancements } };
}

/**
 * Build the complete provisional droid draft for `draftSelections.droid`.
 *
 * @param {object} p
 * @param {string} p.degree
 * @param {string} p.size
 * @param {object} p.systems            identities (see resolveDroidSystemsSelection)
 * @param {number} p.budget             construction credits (ProgressionRules.getDroidConstructionCredits())
 * @param {boolean} [p.allowOverflow=false]
 * @returns {{ok:boolean, draft?:object, quote?:object, installation?:object, blocked:object[]}}
 */
export function buildDroidDraft({ degree, size, systems, budget, allowOverflow = false } = {}) {
  const blocked = [];
  const resolved = resolveDroidSystemsSelection({ size, systems });
  if (!resolved.ok) return { ok: false, blocked: resolved.blocked };

  const quote = quoteDroidBuild({ droidSystems: resolved.systems, droidSize: size, droidDegree: degree });
  if (quote.status !== 'OK') {
    blocked.push({ code: 'DROID_QUOTE_NOT_OK', path: 'droid', detail: `${quote.status}: ${quote.reasons.join('; ')}` });
    return { ok: false, quote, blocked };
  }
  if (!allowOverflow && quote.totalCredits > budget) {
    blocked.push({ code: 'DROID_OVER_BUDGET', path: 'droid', detail: `${quote.totalCredits} > ${budget}` });
    return { ok: false, quote, blocked };
  }

  // Enrich rows with the QUOTED cost/weight and grant flags (display + sheet consumers read these; none is authority).
  const lineFor = (group, id, index) => quote.lines.find(l => l.group === group && l.id === id && l.index === index);
  const decorate = (row, group, index) => {
    const line = lineFor(group, row.id, index);
    return line ? { ...row, cost: line.credits ?? 0, weight: line.weight ?? 0, ...(line.grant ? { isGranted: true } : {}) } : row;
  };
  const s = resolved.systems;
  const droidSystems = {
    locomotion: decorate(s.locomotion, 'locomotion', 0),
    processor: decorate(s.processor, 'processor', 0),
    appendages: s.appendages.map((r, i) => decorate(r, 'appendage', i)),
    accessories: s.accessories.map((r, i) => decorate(r, 'accessory', i)),
    locomotionEnhancements: s.locomotionEnhancements.map((r, i) => decorate(r, 'locomotionEnhancement', i)),
    appendageEnhancements: s.appendageEnhancements.map((r, i) => decorate(r, 'appendageEnhancement', i)),
    totalCost: quote.totalCredits,
    totalWeight: quote.totalWeight
  };

  // Dry installation gate (host validation, published-source review, initial-build quote). Never persisted here:
  // the ledger is seeded exactly once by DroidSubtypeAdapter.contributeMutationPlan at finalization.
  const installation = buildInitialDroidInstallation({ actor: null, seed: 'galactic-profile-dry-check', droidSystems, size });
  if (installation.unresolved.length) {
    for (const u of installation.unresolved) blocked.push({ code: 'DROID_INSTALLATION_UNRESOLVED', path: `droid.${u.field}`, detail: `${u.id}: ${u.reason}` });
    return { ok: false, quote, installation, blocked };
  }

  const draft = {
    isDroid: true,
    creationMode: 'custom',
    droidDegree: degree,
    droidSize: size,
    droidSystems,
    droidCredits: { base: budget, spent: quote.totalCredits, remaining: budget - quote.totalCredits, allowOverflow },
    buildState: { mode: 'provisional', isDeferred: false, isFinalized: false, completedInitially: true }
  };
  return { ok: true, draft, quote, installation, blocked };
}
