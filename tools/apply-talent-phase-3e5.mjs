#!/usr/bin/env node
/**
 * Phase 3E-5b — canonical text-defect repair: DRY-RUN (this revision writes no pack).
 *
 * Consumes only the PDF_VERIFIED entries of data/audits/talent-phase-3e5-text-defect-manifest.json and projects them over
 * packs/talents.db in memory. Proves the exact mutation set: which records, which field leaves, zero changes outside them.
 *
 *   --report   write data/audits/talent-phase-3e5-dry-run-report.json + docs/audits/talent-phase-3e5-dry-run.md
 *   --check    fail unless both equal a fresh projection
 *   (default)  print the verification summary
 * Apply / verify are added only after the owner authorises the exact mutation set shown here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, serializePack, gitBlobSha, fingerprint } from './apply-talent-phase-3c.mjs';
import { leavesOf, leafDiff } from './apply-talent-phase-3e4.mjs';
import { build as buildManifest, getField, setField, projectRecord, verified, FIELDS } from './build-talent-phase-3e5-defect-manifest.mjs';

export const REPORT_PATH = 'data/audits/talent-phase-3e5-dry-run-report.json';
export const DOC_PATH = 'docs/audits/talent-phase-3e5-dry-run.md';
const UNTOUCHED = ['packs/talent_trees.db', 'packs/classes.db', 'packs/heroic.db', 'packs/nonheroic.db', 'packs/npc.db', 'packs/talents-homebrew.db', 'packs/talent-trees-homebrew.db',
  'data/generated/talent-trees.registry.json', 'data/fixes/talent-trees.registry.json', 'data/generated/talents.fixed.json', 'data/fixes/talents.fixed.json', 'data/class-archetypes.json', 'system.json'];
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const parse = t => t.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const clone = v => structuredClone(v);
/** Strings that must not survive anywhere in the canonical pack once their entries are applied. */
const RESIDUALS = ['haIf', 'aswift', 'theirspeed', 'Forcesensitive', 'Forceusers', 'covert it', 'posess', 'Executive Leadership', 'New Sense Talents', 'Lightsa-ber', 'Duel-ist', "Twi'Ler", 'ateam', 'you 4 target', 'Battie Analysis', 'Enpower Weapon', 'Shift Defense Il'];
const allText = t => FIELDS.map(f => getField(t, f)).filter(Boolean).join('\n');

export function projectPack(talents, entries) {
  const byRec = new Map();
  for (const e of entries.filter(verified)) (byRec.get(e.productionId) ?? byRec.set(e.productionId, []).get(e.productionId)).push(e);
  const errors = [];
  const after = talents.map(t => {
    const es = byRec.get(t._id); if (!es) return t;
    const touched = [...new Set(es.flatMap(e => e.fields))];
    const cur = projectRecord(Object.fromEntries(touched.map(f => [f, getField(t, f)])), es, errors, `${t.name} `);
    const n = clone(t); for (const f of touched) setField(n, f, cur[f]);
    return n;
  });
  return { after, errors, byRec };
}

export function buildReport() {
  const m = buildManifest();
  const talentsText = read('packs/talents.db'), talents = parse(talentsText);
  const { after, errors: projErrors, byRec } = projectPack(talents, m.entries);
  const ids = new Set(byRec.keys());
  const beforeBy = new Map(talents.map(t => [t._id, t])), afterBy = new Map(after.map(t => [t._id, t]));
  const records = [...ids].map(id => {
    const es = byRec.get(id), b = beforeBy.get(id), a = afterBy.get(id);
    return { id, name: b.name, entries: es.map(e => e.id).sort(), fieldsTouched: [...new Set(es.flatMap(e => e.fields))], changes: leafDiff(b, a) };
  }).sort((x, y) => x.name.localeCompare(y.name));
  const pendingIds = new Set(m.entries.filter(e => !verified(e)).map(e => e.productionId));
  const out = { b: talents.filter(t => !ids.has(t._id)), a: after.filter(t => !ids.has(t._id)) };
  const sortedFp = arr => fingerprint(arr.slice().sort((x, y) => x._id.localeCompare(y._id)));
  const afterText = serializePack(talentsText, after);
  const v = []; const check = (id, ok, detail = '') => v.push({ id, ok: !!ok, detail });
  check('manifest builds (every entry locates exactly once)', m.errors.length === 0, m.errors.join('; '));
  check('every PDF_VERIFIED edit applies cleanly (exact pre-image)', projErrors.length === 0, projErrors.join('; '));
  check(`target records = the PDF-verified records (${records.length})`, records.length === m.counts.recordsVerified && records.every(r => beforeBy.has(r.id)));
  check('zero changes outside the target records', sortedFp(out.b) === sortedFp(out.a) && out.b.length === talents.length - records.length);
  check('only text leaves change (prerequisites, benefit, description, summary) and only the fields each entry lists', records.every(r => r.changes.every(c => r.fieldsTouched.some(f => c.leaf === `system.${f}` || c.leaf === `system.${f}.value`))));
  check('every target record actually changes', records.every(r => r.changes.length > 0));
  check('no id / name / tree / source / page / tag / flag / effect change', records.every(r => { const b = beforeBy.get(r.id), a = afterBy.get(r.id); return a._id === b._id && a.name === b.name && a.system.treeId === b.system.treeId && a.system.source === b.system.source && a.system.page === b.system.page && JSON.stringify(a.system.tags) === JSON.stringify(b.system.tags) && JSON.stringify(a.flags) === JSON.stringify(b.flags) && JSON.stringify(a.effects) === JSON.stringify(b.effects); }));
  check('description shape preserved (string stays string, {value} stays {value})', records.every(r => typeof beforeBy.get(r.id).system.description === typeof afterBy.get(r.id).system.description));
  check('benefit and description stay mirrors where they mirrored before', records.every(r => { const b = beforeBy.get(r.id), a = afterBy.get(r.id); return getField(b, 'benefit') !== getField(b, 'description') || getField(a, 'benefit') === getField(a, 'description'); }));
  check('Share Talent prerequisite left as certified (print differs only by its terminal period)', getField(afterBy.get(m.entries.find(e => e.name === 'Share Talent').productionId), 'prerequisites') === getField(beforeBy.get(m.entries.find(e => e.name === 'Share Talent').productionId), 'prerequisites'));
  check('no known defect string survives anywhere in the canonical pack after the repair', after.every(t => !RESIDUALS.some(r => allText(t).includes(r))), after.flatMap(t => RESIDUALS.filter(r => allText(t).includes(r)).map(r => `${t.name}:${r}`)).join(', '));
  check('second-wave (PDF_REQUIRED) records are untouched by this repair', [...pendingIds].filter(id => !ids.has(id)).every(id => JSON.stringify(beforeBy.get(id)) === JSON.stringify(afterBy.get(id))));
  check('second run is a zero diff', JSON.stringify(projectPack(after, m.entries).after) === JSON.stringify(after));
  check(`serialization is surgical: only ${records.length} lines of packs/talents.db change`, (() => { const x = talentsText.split('\n'), y = afterText.split('\n'); return x.length === y.length && x.filter((l, i) => l !== y[i]).length === records.length; })());
  const untouched = Object.fromEntries(UNTOUCHED.filter(rel => fs.existsSync(path.join(ROOT, rel))).map(rel => [rel, gitBlobSha(read(rel))]));
  // embedded actor items: reported, never modified
  const items = [];
  for (const pack of ['heroic', 'nonheroic', 'npc']) for (const a of parse(read(`packs/${pack}.db`))) for (const it of a.items ?? []) {
    const mm = /talents\.([0-9a-f]{16})$/.exec(it.flags?.core?.sourceId ?? ''); if (!mm || !ids.has(mm[1])) continue;
    const b = beforeBy.get(mm[1]);
    items.push({ pack, actor: a.name, item: it.name, productionId: mm[1], benefitEqualsProductionBefore: it.system?.benefit === getField(b, 'benefit') });
  }
  const perName = {}; for (const i of items) { const s = (perName[i.item] ??= { items: 0, verbatimCopyOfPreRepair: 0 }); s.items++; if (i.benefitEqualsProductionBefore) s.verbatimCopyOfPreRepair++; }
  return {
    schemaVersion: 1, phase: '3E-5b', dryRun: true, status: v.every(x => x.ok) ? 'DRY_RUN_CERTIFIED' : 'DRY_RUN_FAILED',
    source: 'data/audits/talent-phase-3e5-text-defect-manifest.json (PDF_VERIFIED entries only)',
    counts: { canonicalTalents: talents.length, recordsChanged: records.length, leafChangesTotal: records.reduce((n, r) => n + r.changes.length, 0), changedOutsideTargets: 0, pendingSecondWaveRecords: [...pendingIds].filter(id => !ids.has(id)).length },
    preState: { talents: gitBlobSha(talentsText) }, postState: { talents: gitBlobSha(afterText) }, untouchedFiles: untouched, othersFingerprint: sortedFp(out.a),
    records, embeddedActorItems: { policy: 'NOT MODIFIED (reported only); see the 3E-4 note: embedded items are independent snapshots.', total: items.length, byItemName: perName },
    verification: { results: v }
  };
}

function renderDoc(r) {
  const flat = x => String(x).replace(/\n/g, '⏎');
  // show only the changed window (common prefix/suffix trimmed, 30 chars of context, long changes clipped)
  const window = (b, a) => {
    b = flat(b); a = flat(a); let i = 0; while (i < b.length && i < a.length && b[i] === a[i]) i++;
    let j = 0; while (j < b.length - i && j < a.length - i && b[b.length - 1 - j] === a[a.length - 1 - j]) j++;
    const cut = (x, n) => x.length > n ? x.slice(0, n / 2) + ' … ' + x.slice(-n / 2) : x;
    const lead = Math.max(0, i - 30), trail = Math.min(30, j);
    const mk = x => (lead > 0 ? '…' : '') + b.slice(lead, i) + '[' + cut(x.slice(i, x.length - j), 160) + ']' + (j ? b.slice(b.length - j, b.length - j + trail) + (j > trail ? '…' : '') : '');
    return [mk(b), mk(a)];
  };
  return ['# Phase 3E-5b — text-defect repair dry-run', '', `Status: **${r.status}** · ${r.counts.recordsChanged} records · ${r.counts.leafChangesTotal} leaf changes · ${r.counts.changedOutsideTargets} changes outside the targets · ${r.counts.pendingSecondWaveRecords} second-wave records left untouched. **No pack has been written.**`, '',
    `Regenerate: \`node tools/apply-talent-phase-3e5.mjs --report\`. Only PDF_VERIFIED manifest entries are projected.`, '',
    '## Verification', '', ...r.verification.results.map(x => `- ${x.ok ? 'PASS' : 'FAIL'} ${x.id}${x.ok || !x.detail ? '' : ' — ' + x.detail}`), '',
    '## Exact mutation set', '', ...r.records.flatMap(rec => [`### ${rec.name} (\`${rec.id}\`) — ${rec.entries.join(', ')}`, '', '| Leaf | Before | After |', '|---|---|---|', ...rec.changes.map(c => { const [x, y] = window(c.before, c.after); return `| \`${c.leaf}\` | ${x.replace(/\|/g, '\\|')} | ${y.replace(/\|/g, '\\|')} |`; }), '']),
    '## Embedded actor items', '', `${r.embeddedActorItems.total} embedded actor items point at these records; none is modified. Items whose benefit is a verbatim copy of the pre-repair production text would now lag behind (see 3E-4 for the same policy):`, '', '| Item | Embedded items | Verbatim copies of pre-repair production |', '|---|---|---|', ...Object.entries(r.embeddedActorItems.byItemName).map(([k, v]) => `| ${k} | ${v.items} | ${v.verbatimCopyOfPreRepair} |`), ''].join('\n');
}

export function main(argv = process.argv.slice(2)) {
  const r = buildReport();
  for (const x of r.verification.results) console.log(`${x.ok ? 'PASS' : 'FAIL'}  ${x.id}${x.ok || !x.detail ? '' : '  [' + x.detail + ']'}`);
  console.log(`\n[talent-phase-3e5] ${r.status}: ${r.counts.recordsChanged} records, ${r.counts.leafChangesTotal} leaf changes, ${r.counts.changedOutsideTargets} outside targets`);
  if (r.status !== 'DRY_RUN_CERTIFIED') return 1;
  const json = JSON.stringify(r, null, 2) + '\n', doc = renderDoc(r);
  if (argv.includes('--report')) { fs.writeFileSync(path.join(ROOT, REPORT_PATH), json); fs.writeFileSync(path.join(ROOT, DOC_PATH), doc); console.log(`[talent-phase-3e5] wrote ${REPORT_PATH} and ${DOC_PATH} (no pack was written)`); }
  if (argv.includes('--check')) {
    if (!fs.existsSync(path.join(ROOT, REPORT_PATH)) || read(REPORT_PATH) !== json || !fs.existsSync(path.join(ROOT, DOC_PATH)) || read(DOC_PATH) !== doc) { console.error('[talent-phase-3e5] STALE: committed dry-run report differs from a fresh projection (run --report)'); return 1; }
    console.log('[talent-phase-3e5] committed dry-run report matches a fresh projection');
  }
  return 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { process.exit(main()); } catch (e) { console.error(e.message); process.exit(1); } }
