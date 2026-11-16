/**
 * Mentor Survey V2: read-only, provenance-backed projection of FINALIZED actor strengths.
 *
 * Reads only what is persisted on the actor (owned class levels, feats, talents, trained skills). It never reads
 * survey responses, pending progression selections, class eligibility or recommendations, so it cannot assert
 * ownership of anything the actor does not actually have. It is not a scorer.
 *
 * Every fact cites its source (itemId or system path). Any past-tense mechanical claim shown to a player must be
 * rendered from a fact returned here.
 */

const KIND_ORDER = Object.freeze({ class_level: 0, talent: 1, feat: 2, trained_skill: 3 });

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Canonical identity of an owned item: the repository's own canonical ids when present, otherwise a labelled slug. */
export function canonicalIdOf(item) {
  const swse = item?.flags?.swse ?? item?.flags?.['foundryvtt-swse'] ?? {};
  const id = swse.canonicalFeat?.canonicalId ?? swse.canonicalTalent?.canonicalId ?? swse.canonicalId ?? swse.id ?? null;
  return id ? { canonicalId: String(id), certified: true } : { canonicalId: `name:${slug(item?.name)}`, certified: false };
}

/** ONE normalization for skill identity: lowercase letters and digits only, so `useTheForce`, "Use the Force" and `Knowledge (Tactics)` / `knowledgeTactics` compare equal. */
export const canonicalSkillKey = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
/** The skill named by a "Skill Focus (X)" feat; X may itself contain parentheses ("Skill Focus (Knowledge (Tactics))"). */
export function skillFocusTarget(featName) {
  const m = /^skill focus\s*\((.+)\)\s*$/i.exec(String(featName ?? '').trim());
  return m ? m[1].trim() : null;
}

const SMALL = new Set(['the', 'of', 'a', 'an', 'in', 'and']);
/** Display name for a skill key: the document's own label when present, else the key split and title-cased ("useTheForce" -> "Use the Force"). */
export function skillLabel(key, skill) {
  const own = skill?.label ?? skill?.name;
  if (typeof own === 'string' && own.trim()) return own.trim();
  const words = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().split(/\s+/);
  return words.map((w, i) => { const lw = w.toLowerCase(); return i > 0 && SMALL.has(lw) ? lw : lw.charAt(0).toUpperCase() + lw.slice(1); }).join(' ');
}

const items = (actor) => Array.from(actor?.items?.contents ?? actor?.items ?? []);

/**
 * @param {object} actor finalized actor document (or a plain test double)
 * @returns {{facts: object[], classLevels: Record<string,number>, characterLevel: number}}
 */
export function projectActorEvidence(actor) {
  const facts = [];
  const classLevels = {};
  for (const item of items(actor)) {
    if (item?.type === 'class') {
      const level = Number(item.system?.level ?? item.system?.levels);
      if (Number.isSafeInteger(level) && level > 0) {
        const key = slug(item.name).replace(/-/g, '_');
        classLevels[key] = (classLevels[key] || 0) + level;
        facts.push({ kind: 'class_level', ...canonicalIdOf(item), classKey: key, label: item.name, level, source: { itemId: item.id ?? item._id ?? null } });
      }
    } else if (item?.type === 'feat' || item?.type === 'talent') {
      facts.push({ kind: item.type, ...canonicalIdOf(item), label: item.name, source: { itemId: item.id ?? item._id ?? null } });
    }
  }
  const skills = actor?.system?.skills || {};
  for (const [key, skill] of Object.entries(skills)) {
    if (skill?.trained === true) facts.push({ kind: 'trained_skill', canonicalId: `skill:${key}`, certified: true, label: skillLabel(key, skill), source: { path: `system.skills.${key}.trained` } });
  }
  facts.sort((a, b) => (KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) || a.label.localeCompare(b.label) || a.canonicalId.localeCompare(b.canonicalId));
  facts.forEach((f, i) => { f.factId = `fact.${i}.${f.kind}.${slug(f.canonicalId)}`; });
  const characterLevel = Object.values(classLevels).reduce((a, b) => a + b, 0);
  return { facts, classLevels, characterLevel };
}

/**
 * Choose at most `max` observations for a reading. Deterministic and NOT a scorer: it prefers certified canonical
 * identities, then spreads across kinds, then falls back to the projection's stable order. Returns fewer than `max`
 * when evidence is thin; never pads.
 */
export function selectObservations(projection, { max = 3, exclude = [] } = {}) {
  const skip = new Set(exclude);
  // Owned items are real evidence whether or not they carry a canonical id; certified ones are preferred (stable sort).
  const pool = projection.facts.filter((f) => !skip.has(f.factId) && f.kind !== 'class_level')
    .map((f, i) => ({ f, i })).sort((a, b) => (b.f.certified - a.f.certified) || (a.i - b.i)).map((x) => x.f);
  const out = [];
  const usedKinds = new Set();
  for (const f of pool) { if (out.length >= max) break; if (!usedKinds.has(f.kind)) { out.push(f); usedKinds.add(f.kind); } }
  for (const f of pool) { if (out.length >= max) break; if (!out.includes(f)) out.push(f); }
  return out;
}

/** True only if every referenced factId exists in the projection (used to guard past-tense claims). */
export function allFactsGrounded(projection, factIds) {
  const known = new Set(projection.facts.map((f) => f.factId));
  return (factIds || []).every((id) => known.has(id));
}
