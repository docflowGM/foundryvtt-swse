#!/usr/bin/env node
// Phase 3B: deterministic build of the 203-identity canonical weapon authority.
// Authority-only: reads the certified Phase 1/Phase 2/v2.9/3A authorities, writes
// data/audits/item-weapons-phase-3b-canonical-authority.json and its markdown summary.
// Usage: node tools/build-item-weapons-phase-3b-canonical-authority.mjs [--check]
//   --check  rebuild in memory and fail if the committed files differ (byte-stability proof)
import fs from 'node:fs';
import { applyCompletenessAmendments } from './lib/item-weapons-phase-3b-amendments.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT_JSON = 'data/audits/item-weapons-phase-3b-canonical-authority.json';
export const OUT_MD = 'docs/audits/item-weapons-phase-3b-canonical-authority.md';
const readJson = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const clone = (x) => structuredClone(x);
const canon = (x) => JSON.stringify(sortKeys(x));
function sortKeys(x) {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortKeys(x[k])]));
  return x;
}
const sha = (x) => crypto.createHash('sha256').update(typeof x === 'string' ? x : canon(x)).digest('hex');
const normBook = (b) => b.replace(/^The /, '');
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const AUTH = 'data/audits/item-canonicalization-rolling-authority.json';
const OVERLAY = 'data/audits/item-weapons-schema-v2.9-ammo-normalization.json';
const P3A = 'data/audits/item-weapons-phase-3a-cross-publication-reconciliation.json';

/** The six cross-published identities: certified pair order, base (controlling/richest) claim, relationships and merged player text. */
const PAIRS = {
  'Guard Shoto': {
    order: ['2D', '2F'], base: '2F', rel: { '2D': 'superseded-conflict', '2F': 'controlling' },
    rulings: ['guard-shoto-phrik-dr', 'guard-shoto-availability'],
    text: "A guard shoto, or lightsaber tonfa, has a secondary handle at a right angle. A proficient wielder gains a +2 equipment bonus on Use the Force checks made with Block or Deflect. If its handle is phrik-laced, lightsabers do not ignore the guard shoto's damage reduction. It requires an energy cell.",
    summary: null,
  },
  'Lightsaber Pike': {
    order: ['2D', '2F'], base: '2F', rel: { '2D': 'compatible', '2F': 'additive' },
    rulings: ['lightsaber-pike-phrik-dr'],
    text: "A lightsaber pike has a phrik-alloy haft, so lightsabers do not ignore the weapon's damage reduction. It increases reach by 1 square but imposes a -2 penalty on Use the Force checks made with Block or Deflect. With Long Haft Form it can be used as a double weapon; the non-lightsaber end deals 1d6 damage. It requires an energy cell.",
    summary: null,
  },
  'Flechette Launcher': {
    order: ['2D', '2I'], base: '2I', rel: { '2D': 'compatible', '2I': 'compatible' }, rulings: [], text: null, summary: null,
  },
  'BlasTech 500 Riot Gun': {
    order: ['2E', '2I'], base: '2I', rel: { '2E': 'superseded-conflict', '2I': 'controlling' },
    rulings: ['riot-gun-precedence'], text: null, summary: null,
  },
  'Stunning Gauntlet': {
    order: ['2B', '2E'], base: '2B', rel: { '2B': 'additive', '2E': 'compatible' }, rulings: [],
    textFrom: '2E', summaryFrom: '2B',
  },
  'Long-Handle Lightsaber': {
    order: ['2F', '2G'], base: '2F', rel: { '2F': 'additive', '2G': 'compatible' }, rulings: [], text: null, summary: null,
  },
};

export function buildPhase3B() {
  const auth = readJson(AUTH);
  const p1 = auth.phases['1-weapons-content'];
  const s2 = auth.phases['2-weapons-numeric-stat-schema'];
  const overlay = readJson(OVERLAY);
  const p3a = readJson(P3A);
  const inputs = [
    { id: 'phase1-weapons-content', sha256: sha(p1) },
    { id: 'phase2a-core-records', sha256: sha(s2.books[0]) },
  ];

  // Phase 2 claims keyed by (book, name)
  const p2 = new Map();
  const addP2 = (phase, rec, file) => p2.set(`${normBook(rec.source.book)}|${rec.canonicalName}`, { phase, rec, file });
  for (const r of s2.books[0].records) addP2('2A', r, `${AUTH}#phases.2-weapons-numeric-stat-schema.books[0]`);
  for (const sb of s2.standaloneBookAuthorities) {
    const d = readJson(sb.file);
    inputs.push({ id: `phase${sb.phase.toLowerCase()}`, file: sb.file, sha256: sha(d) });
    for (const r of d.records) addP2(sb.phase, r, sb.file);
  }
  inputs.push({ id: 'ammo-overlay', file: OVERLAY, sha256: sha(overlay) }, { id: 'phase3a', file: P3A, sha256: sha(p3a) });
  const ammoByKey = new Map(overlay.entries.map((e) => [`${e.phase}|${e.canonicalName}`, e]));

  // Phase 1 claim records keyed by (book, name)
  const p1rec = new Map();
  for (const b of p1.books) for (const r of b.records) p1rec.set(`${normBook(r.source.book)}|${r.canonicalName}`, { phase1: b.phase, rec: r });

  const identities = [];
  let claimTotal = 0;
  for (const u of p1.uniqueIdentityIndex) {
    const cfg = PAIRS[u.canonicalName] || null;
    if ((u.claimCount === 2) !== !!cfg) throw new Error(`pair config mismatch for ${u.canonicalName}`);
    const claims = u.sourceClaims.map((c) => {
      const k = `${normBook(c.book)}|${c.canonicalName}`;
      const a = p1rec.get(k); const b = p2.get(k);
      if (!a || !b) throw new Error(`unjoined claim ${k}`);
      const ov = ammoByKey.get(`${b.phase}|${b.rec.canonicalName}`);
      if (!ov) throw new Error(`no ammo overlay entry for ${k}`);
      if (canon(ov.ammo) !== canon(b.rec.canonicalStats.ammo)) throw new Error(`ammo overlay differs from Phase 2 for ${k}`);
      claimTotal++;
      return { phase1: a.phase1, phase2: b.phase, p1: a.rec, p2: b.rec, p2file: b.file };
    });
    if (cfg) claims.sort((x, y) => cfg.order.indexOf(x.phase2) - cfg.order.indexOf(y.phase2));
    const baseClaim = cfg ? claims.find((c) => c.phase2 === cfg.base) : claims[0];
    const base = baseClaim.p2;

    const stats = clone(base.canonicalStats);
    let text = baseClaim.p1.canonicalPlayerText;
    let summary = baseClaim.p1.summary;
    const supersededFields = [];
    const rulingsApplied = [];
    let conditionalQualities = clone(base.conditionalQualities);
    let operation = clone(base.operation);
    let qualities = clone(base.qualities);
    let extra = {};

    if (cfg) {
      const others = claims.filter((c) => c !== baseClaim);
      for (const o of others) operation = { ...clone(o.p2.operation), ...operation };
      if (cfg.text) text = cfg.text;
      if (cfg.textFrom) text = claims.find((c) => c.phase2 === cfg.textFrom).p1.canonicalPlayerText;
      if (cfg.summaryFrom) summary = claims.find((c) => c.phase2 === cfg.summaryFrom).p1.summary;
      const hist = p3a.records.find((r) => r.canonicalIdentity === u.canonicalName);
      for (const h of hist.conflictHistory || []) supersededFields.push(h);
      for (const rid of cfg.rulings) rulingsApplied.push(rid);
      if (u.canonicalName === 'Lightsaber Pike') {
        stats.defensiveInteractions = [{
          type: 'lightsaber-does-not-ignore-own-dr', condition: null, value: true, id: 'lightsaber-does-not-ignore-own-dr',
          effect: 'incoming-lightsaber-does-not-ignore-weapon-dr', basis: 'standard-haft-is-phrik-alloy',
        }];
        rulingsApplied.push(...hist.rulingsApplied.map((x) => x.id));
      }
      if (u.canonicalName === 'BlasTech 500 Riot Gun') { /* Rebellion Era claim is the base; Clone Wars values live on in sourceClaims */ }
      if (u.canonicalName === 'Stunning Gauntlet') {
        const ex = claims.find((c) => c.phase2 === '2E').p2.canonicalStats;
        // KOTOR table rows are WEAPON sizes; Clone Wars publishes the Tiny weapon row (Human -> Tiny). Wearer variants derive through sizeRule.
        const tiny = { weaponSize: ex.size, costCredits: ex.costCredits, weightKg: ex.weightKg, source: 'Clone Wars Campaign Guide p.60' };
        stats.variantsByWeaponSize = [tiny, ...stats.variantsByWeaponSize];
        stats.variantsByWearerSize = [{ wearerSize: 'Medium', weaponSize: ex.size, costCredits: ex.costCredits, weightKg: ex.weightKg, derivedBy: stats.sizeRule, source: 'Clone Wars Campaign Guide p.60 (Human wears a Tiny gauntlet)' }, ...stats.variantsByWearerSize];
      }
    }

    // derived ambiguities (never filled from repo data)
    const ambiguities = [];
    if (stats.range.mode === 'unresolved') {
      ambiguities.push({ id: `${u.identityKey}-range-profile`, field: 'canonicalStats.range.profileId', status: 'SOURCE_NOT_EXPLICIT', value: null,
        plannerRuling: u.canonicalName === 'Bowcaster' ? 'KEEP_SOURCE_UNRESOLVED' : null,
        detail: u.canonicalName === 'Bowcaster'
          ? 'Core establishes Exotic identity, Wookiee rifle-proficiency substitution, ammunition and Accurate (errata) but does not assign the Bowcaster to a Table 8-5 range row; proficiency substitution is not range classification. Any rifles fallback is implementation policy, not canonical source fact.'
          : 'Source does not assign a range row.',
        blocksProductionRangeMutation: true });
    } else if (stats.range.mode === 'ranged' && stats.range.profileId === null) {
      ambiguities.push({ id: `${u.identityKey}-range-profile`, field: 'canonicalStats.range.profileId', status: 'SOURCE_ASSIGNS_NO_RANGE_PROFILE', value: null, detail: stats.range.sourceStatus || 'Source assigns no pistol/rifle/heavy numeric range profile.', blocksProductionRangeMutation: true });
    }
    if (stats.ammo && (stats.ammo.status === 'not-stated' || stats.ammo.status === 'partially-established')) {
      ambiguities.push({ id: `${u.identityKey}-ammo`, field: 'canonicalStats.ammo', status: stats.ammo.status === 'not-stated' ? 'AMMO_NOT_STATED_BY_SOURCE' : 'AMMO_PARTIALLY_STATED_BY_SOURCE', value: null, detail: stats.ammo.sourceStatus || 'Source does not fully state the ammunition.' });
    }
    ambiguities.sort((x, y) => cmp(x.id, y.id));

    // sourceClaims with immutable references to the certified Phase 2 claims
    const relOf = (c) => (cfg ? cfg.rel[c.phase2] : 'sole');
    const sourceClaims = claims.map((c) => ({
      phase1: c.phase1,
      phase2: c.phase2,
      book: c.p1.source.book,
      canonicalName: c.p1.canonicalName,
      publishedName: c.p2.publishedName ?? null,
      descriptionPage: c.p1.source.descriptionPage,
      ...(c.p1.source.descriptionPages ? { descriptionPages: c.p1.source.descriptionPages } : {}),
      statTablePage: c.p1.source.statTablePage ?? null,
      canonicalPlayerText: c.p1.canonicalPlayerText,
      summary: c.p1.summary,
      phase1Discrepancy: c.p1.phase1Discrepancy,
      phase1ContentAction: c.p1.phase1ContentAction,
      relationship: relOf(c),
      phase2Ref: { file: c.p2file, phase: c.phase2, sha256: sha(c.p2) },
    }));

    const conflictHistory = supersededFields;
    const repoRec = baseClaim.p1.repo;
    identities.push({
      identityKey: u.identityKey,
      canonicalName: u.canonicalName,
      repo: { present: u.repoPresent, id: u.repoId, currentName: repoRec.currentName ?? null, phase0NameNormalizationPending: !!repoRec.phase0NameNormalizationPending },
      sourceClaims,
      firstPublication: { book: sourceClaims[0].book, phase2: sourceClaims[0].phase2 },
      canonicalPlayerText: text,
      summary,
      weaponGroup: base.weaponGroup,
      schemaFamily: clone(base.schemaFamily),
      canonicalStats: stats,
      qualities,
      conditionalQualities,
      conditionalDamageProfiles: clone(base.conditionalDamageProfiles),
      proficiencyRules: clone(base.proficiencyRules),
      operation,
      sourceFootnotes: clone(base.sourceFootnotes),
      qualityParameters: clone(base.qualityParameters),
      qualityAuthority: clone(base.qualityAuthority),
      ...extra,
      crossPublication: cfg
        ? { claimCount: 2, status: 'RESOLVED', conflictHistory, rulingsApplied: [...new Set(rulingsApplied)].sort(), phase3aStatus: p3a.records.find((r) => r.canonicalIdentity === u.canonicalName).reconciliationStatus }
        : { claimCount: 1, status: 'SINGLE_SOURCE', conflictHistory: [], rulingsApplied: [] },
      repoComparison: { phase1: sourceClaims.map((c) => ({ book: c.book, discrepancy: c.phase1Discrepancy, action: c.phase1ContentAction })), phase2: clone(base.repoComparison) },
      ambiguities,
      mergeAudit: {
        claimCount: claims.length,
        baseClaim: baseClaim.phase2,
        mergedClaims: claims.map((c) => c.phase2),
        textPolicy: cfg ? 'merged-from-certified-claim-facts' : 'phase1-canonical-player-text-unchanged',
        weaponGroupPhase1: baseClaim.p1.weaponGroup,
        supersededFieldCount: supersededFields.length,
      },
    });
    // normalize: the gate on a resolved claim must not leak into the identity record
    delete identities[identities.length - 1].conflictGate;
  }
  const completenessAmendments = applyCompletenessAmendments(identities);
  identities.sort((a, b) => cmp(a.canonicalName, b.canonicalName) || cmp(a.identityKey, b.identityKey));
  if (claimTotal !== 209 || identities.length !== 203) throw new Error(`count failure ${claimTotal}/${identities.length}`);

  const doc = {
    schemaVersion: 'weapon-phase-3b-canonical-authority-v1',
    phase: '3B',
    family: 'weapons',
    status: 'WEAPON_PHASE_3B_203_IDENTITY_CANONICAL_AUTHORITY_CERTIFIED',
    authoritySchema: s2.schemaVersion,
    authorityOnly: true,
    productionMutationAuthorized: false,
    counts: {
      certifiedSourceClaims: claimTotal,
      uniqueCanonicalIdentities: identities.length,
      singleClaimIdentities: identities.filter((i) => i.sourceClaims.length === 1).length,
      twoClaimIdentities: identities.filter((i) => i.sourceClaims.length === 2).length,
      repoPresentIdentities: identities.filter((i) => i.repo.present).length,
      repoMissingIdentities: identities.filter((i) => !i.repo.present).length,
      identitiesWithAmbiguities: identities.filter((i) => i.ambiguities.length).length,
      sourceBooks: new Set(identities.flatMap((i) => i.sourceClaims.map((c) => c.book))).size,
    },
    publicationPrecedencePolicy: 'Field-local later-publication precedence for exact same-identity direct contradictions; silence never supersedes; earlier-only compatible mechanics survive; both claims stay preserved (planner ruling, Phase 3B).',
    completenessAmendments,
    plannerRulingsApplied: ['guard-shoto-phrik-dr', 'lightsaber-pike-phrik-dr', 'guard-shoto-availability', 'riot-gun-precedence', 'bowcaster-range-profile', 'cr1-area-effect', 'concussion-grenade-description-page', 'xerrol-nightstinger-group'],
    productionBaseline: {
      note: 'SHA-256 of the production files at 3B certification; the build must not change them.',
      'packs/weapons.db': sha(fs.readFileSync(path.join(ROOT, 'data/audits/frozen/pre-cutover-weapons.db'), 'utf8')),
      'template.json': sha(fs.readFileSync(path.join(ROOT, 'template.json'), 'utf8')),
    },
    inputs,
    identities,
  };
  const json = JSON.stringify(doc, null, 2) + '\n';

  // markdown summary (deterministic)
  const rows = identities.map((i) => `| ${i.canonicalName} | ${i.sourceClaims.length} | ${i.weaponGroup} | ${i.repo.present ? i.repo.id : '(missing)'} | ${i.canonicalStats.ammo ? i.canonicalStats.ammo.status : 'none (null)'} | ${i.ambiguities.length ? i.ambiguities.map((a) => a.status).join(', ') : ''} |`);
  const six = identities.filter((i) => i.sourceClaims.length === 2).map((i) => `- **${i.canonicalName}** — ${i.sourceClaims.map((c) => `${c.book} p.${c.descriptionPage} (${c.relationship})`).join(' + ')}${i.crossPublication.conflictHistory.length ? `; precedence resolved: ${i.crossPublication.conflictHistory.map((h) => h.field).join(', ')}` : ''}`);
  const md = `# Weapons Phase 3B — 203-Identity Canonical Authority

**Status:** \`${doc.status}\` (authority-only; production mutation not authorized)

Generated deterministically by \`tools/build-item-weapons-phase-3b-canonical-authority.mjs\` from the certified Phase 1 content, Phase 2A–2L mechanics (schema ${doc.authoritySchema}), the v2.9 ammo overlay and the Phase 3A reconciliation. Do not edit by hand; rebuild instead. Data: \`${OUT_JSON}\`.

## Counts

- Certified source claims: **${doc.counts.certifiedSourceClaims}** across ${doc.counts.sourceBooks} books
- Canonical production identities: **${doc.counts.uniqueCanonicalIdentities}** (${doc.counts.singleClaimIdentities} single-claim, ${doc.counts.twoClaimIdentities} two-claim)
- Repo-present identities: ${doc.counts.repoPresentIdentities}; repo-missing: ${doc.counts.repoMissingIdentities}
- Identities carrying explicit source ambiguities: ${doc.counts.identitiesWithAmbiguities}

## Cross-published identities (6)

${six.join('\n')}

## Planner rulings applied

${doc.plannerRulingsApplied.map((r) => `- \`${r}\``).join('\n')}

Precedence policy: ${doc.publicationPrecedencePolicy}

## Identities

| Identity | Claims | Group | Repo id | Ammo | Ambiguities |
|---|---:|---|---|---|---|
${rows.join('\n')}
`;
  return { doc, json, md };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = buildPhase3B();
  const b = buildPhase3B();
  if (a.json !== b.json || a.md !== b.md) { console.error('FAIL: builder output is not deterministic'); process.exit(1); }
  if (process.argv.includes('--check')) {
    const cur = fs.readFileSync(path.join(ROOT, OUT_JSON), 'utf8');
    const curMd = fs.readFileSync(path.join(ROOT, OUT_MD), 'utf8');
    if (cur !== a.json || curMd !== a.md) { console.error('FAIL: committed Phase 3B files differ from the builder output; rebuild'); process.exit(1); }
    console.log(`Phase 3B build is current and byte-stable: ${a.doc.counts.uniqueCanonicalIdentities} identities / ${a.doc.counts.certifiedSourceClaims} claims`);
  } else {
    fs.writeFileSync(path.join(ROOT, OUT_JSON), a.json);
    fs.writeFileSync(path.join(ROOT, OUT_MD), a.md);
    console.log(`Wrote ${OUT_JSON} and ${OUT_MD}: ${a.doc.counts.uniqueCanonicalIdentities} identities / ${a.doc.counts.certifiedSourceClaims} claims (${a.doc.counts.singleClaimIdentities} single, ${a.doc.counts.twoClaimIdentities} two-claim)`);
  }
}
