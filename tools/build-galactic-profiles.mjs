#!/usr/bin/env node
/**
 * Galactic Profiles v3 — unified build.
 *
 * Reads the two authoring packages (organic/nonheroic/beast + custom heroic droids) and emits the ONE
 * runtime contract:
 *
 *   data/galactic-profiles/v3/galactic-profiles.json          profiles: catalog + choices + extension + provenance
 *   data/galactic-profiles/v3/galactic-profiles.catalog.json  generated browse catalog (single definition)
 *   data/galactic-profiles/v3/galactic-profiles.evidence.json original authored records, verbatim (CI/audit only)
 *
 * Nothing is derived by guessing: every `choices` value is a re-keying of an authored value. Anything that
 * cannot be mapped to a canonical key is carried in `choices.unresolved` and blocks compilation. Redundant or
 * derived authored values (hardware ledgers, class-credit math, final scores, alias candidates, tree
 * assertions, …) are NOT in the runtime file; they are preserved in the evidence file.
 *
 *   node tools/build-galactic-profiles.mjs           write the three files
 *   node tools/build-galactic-profiles.mjs --check   fail if the committed files differ from a fresh build
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'data/galactic-profiles/v3');
const SOURCES = {
  organic: path.join(DIR, 'SWSE_Galactic_Profiles_v3.json'),
  droid: path.join(DIR, 'droids/SWSE_Eight_Droid_Galactic_Profiles_v3.json')
};
const OUT = {
  profiles: path.join(DIR, 'galactic-profiles.json'),
  catalog: path.join(DIR, 'galactic-profiles.catalog.json'),
  evidence: path.join(DIR, 'galactic-profiles.evidence.json')
};

/** Authored participant kinds -> V2 subtype adapter ids (no crosswalk beyond this rename). */
const SUBTYPE_BY_KIND = Object.freeze({ heroic: 'actor', droid: 'droid', nonheroic: 'nonheroic', beast: 'beast' });

/**
 * Explicit, evidence-backed authoring corrections. Each entry is verified by a test against the canonical
 * V2 pack identity (exactly one document with that exact name) — nothing here is a fuzzy match.
 */
export const AUTHORING_CORRECTIONS = Object.freeze({
  items: {
    'Energy Cell': { id: 'tool-energy-cell', reason: 'PC-1: authored with id:null; exactly one exact-name V2 equipment document exists', verify: { pack: 'equipment', name: 'Energy Cell' } },
    'Datapad, Basic': { id: 'computer-datapad-basic', reason: 'authored with id:null and resolution sourceNameLookupRequired; exactly one exact-name V2 equipment document exists', verify: { pack: 'equipment', name: 'Datapad, Basic' } }
  },
  // soldier_brawler: the archive note states "STR 22 (after +4 racial), CON 20 (after +4 racial)" against stored 18/16,
  // i.e. the stored scores are base values. Other profiles stay 'unresolved' (see audit §R.3).
  attributeBasis: {
    soldier_brawler: { basis: 'base', reason: 'authored note: "STR 22 (after +4 racial), CON 20 (after +4 racial)" vs stored STR 18 / CON 16' }
  }
});

/**
 * Profiles that are blocked by an open owner ruling. The compiler refuses them with these codes.
 * (GP-RD-003 Jedi Force Training and GP-RD-005 Athletics are expressed structurally — see `unresolved`
 *  and the compiler's Force-entitlement check — not here.)
 */
export const RULING_BLOCKS = Object.freeze({
  'beast-wolf': ['GP-RD-001', 'GP-RD-010'],
  'beast-bear': ['GP-RD-010']
});

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const clone = v => JSON.parse(JSON.stringify(v));

function refId(ref) {
  return ref?.canonicalIdCandidate ?? ref?.sourceRef?.id ?? null;
}

function buildChoices(p, subtype) {
  const b = p.build;
  const unresolved = [];
  const authoredScores = b.attributes.scores;

  const attributes = (() => {
    if (subtype === 'droid') {
      const { con, ...base } = b.attributes.preDegreeAndSizeScores;
      return { basis: 'droidPreModifier', base };
    }
    const corr = AUTHORING_CORRECTIONS.attributeBasis[p.profileId];
    return { basis: corr?.basis ?? 'unresolved', base: { ...authoredScores } };
  })();

  const skills = [];
  for (const s of b.skills.trained) {
    if (s.canonicalKeyCandidate) skills.push(s.canonicalKeyCandidate);
    else unresolved.push({ path: 'skills', authored: s.sourceEntry?.name ?? s.sourceEntry ?? null, code: 'SKILL_KEY_UNRESOLVED' });
  }

  const feats = b.feats.sourceSelections.map(sel => ({
    name: sel.displayName,
    sourceIds: sel.sourceCandidates.map(c => c.id)
  }));

  const talents = [];
  const slot = b.talents?.classSlot;
  if (slot?.selection) {
    const alt = (slot.alternateSourceCandidates || []).map(c => c.id);
    talents.push({
      name: slot.selection.sourceRef.name,
      sourceIds: [slot.selection.canonicalIdCandidate ?? slot.selection.sourceRef.id, ...alt],
      ...(slot.parameters && Object.keys(slot.parameters).length ? { parameters: slot.parameters } : {})
    });
  }

  const equipment = b.startingPackage.items.map(it => {
    const corr = it.item.canonicalIdCandidate ? null : AUTHORING_CORRECTIONS.items[it.displayName];
    return {
      name: it.displayName,
      sourceId: it.item.canonicalIdCandidate ?? corr?.id ?? null,
      qty: it.quantity,
      pack: it.item.sourceRef.pack
    };
  });

  return {
    class: subtype === 'nonheroic' || subtype === 'beast' ? 'nonheroic' : refId(p.identity.classRef),
    species: subtype === 'droid' ? null : refId(p.identity.speciesRef),
    background: refId(p.identity.backgroundRef),
    attributes,
    skills,
    feats,
    talents,
    languages: [...(b.languages?.legacyKnownLanguages || [])],
    forcePowers: (b.forcePowers?.sourceSelections || []).map(f => ({ name: f.sourceRef.name, sourceId: refId(f) })),
    equipment,
    wallet: { mode: 'exactFinalBalance', credits: b.startingPackage.wallet.credits },
    unresolved,
    rulingBlocks: [...(RULING_BLOCKS[p.profileId] || [])]
  };
}

function buildProfile(p) {
  const kind = p.identity.participantKind;
  const subtype = SUBTYPE_BY_KIND[kind];
  if (!subtype) throw new Error(`Unknown participantKind "${kind}" in ${p.profileId}`);
  const catalog = { ...p.catalog };
  const out = {
    schemaVersion: 3,
    profileId: p.profileId,
    revision: p.revision,
    subtype,
    level: p.identity.level,
    catalog: {
      name: catalog.name,
      archetype: catalog.archetype,
      description: catalog.description,
      quote: catalog.quote ?? null,
      imagePath: catalog.imagePath ?? null,
      mentorKey: catalog.mentorKey ?? null,
      dialogueKey: catalog.dialogueKey ?? null,
      roleTags: [...(catalog.roleTags || [])],
      classKey: catalog.classKey,
      className: catalog.className
    },
    choices: buildChoices(p, subtype),
    extension: {},
    provenance: {
      ...clone(p.provenance),
      legacyClassification: {
        participantKind: p.identity.participantKind,
        rulesTrack: p.identity.rulesTrack,
        legacySubtype: p.identity.legacySubtype ?? null,
        legacyParticipantKind: p.identity.legacyParticipantKind ?? null
      },
      sourceRefs: {
        class: clone(p.identity.classRef ?? null),
        species: clone(p.identity.speciesRef ?? null),
        background: clone(p.identity.backgroundRef ?? null)
      }
    },
    certification: {
      status: p.certification.status,
      publishableAsReadyToPlay: false,
      issues: [...(p.certification.issues || [])]
    }
  };
  if (subtype === 'droid') {
    const d = p.build.droid;
    out.extension.droid = {
      mode: d.creationMode,
      degree: d.droidDegree,
      size: d.droidSize,
      systems: clone(d.droidSystems)
    };
  }
  if (subtype === 'beast') out.extension.beast = clone(p.build.beastSourceMechanics);
  return out;
}

function buildCatalogEntry(profile) {
  const c = profile.catalog;
  return {
    profileId: profile.profileId,
    revision: profile.revision,
    subtype: profile.subtype,
    name: c.name,
    archetype: c.archetype,
    description: c.description,
    quote: c.quote,
    imagePath: c.imagePath,
    classKey: c.classKey,
    className: c.className,
    mentorKey: c.mentorKey,
    dialogueKey: c.dialogueKey,
    roleTags: c.roleTags,
    certificationStatus: profile.certification.status
  };
}

export function buildAll() {
  const organic = read(SOURCES.organic);
  const droid = read(SOURCES.droid);
  const authored = [...organic.profiles, ...droid.profiles];
  const ids = new Set();
  for (const p of authored) {
    if (ids.has(p.profileId)) throw new Error(`Duplicate profileId ${p.profileId}`);
    ids.add(p.profileId);
  }
  const profiles = authored.map(buildProfile);
  const header = { schemaVersion: 3, format: 'swse.galactic-profiles.v3', sources: [path.relative(ROOT, SOURCES.organic), path.relative(ROOT, SOURCES.droid)] };
  return {
    profiles: { ...header, profiles },
    catalog: { ...header, totalProfiles: profiles.length, profiles: profiles.map(buildCatalogEntry) },
    evidence: { ...header, profiles: Object.fromEntries(authored.map(p => [p.profileId, p])) }
  };
}

const serialize = v => `${JSON.stringify(v, null, 2)}\n`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const built = buildAll();
  const check = process.argv.includes('--check');
  let drift = 0;
  for (const [key, file] of Object.entries(OUT)) {
    const next = serialize(built[key]);
    if (check) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (current !== next) { console.error(`DRIFT: ${path.relative(ROOT, file)} differs from a fresh build`); drift += 1; }
    } else {
      fs.writeFileSync(file, next);
      console.log(`wrote ${path.relative(ROOT, file)} (${built[key].profiles.length ?? Object.keys(built[key].profiles).length} profiles)`);
    }
  }
  if (check) {
    if (drift) process.exit(1);
    console.log('galactic-profiles: committed output matches a fresh build');
  }
}
