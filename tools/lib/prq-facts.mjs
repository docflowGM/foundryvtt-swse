// Shared PRQ helpers (census + index builder): mechanically checkable facts in prerequisite TEXT and STRUCTURE, and the clause-bag comparison used to rank
// text differences. Pure functions; nothing here decides which representation is right (that needs the printed source: rules register PRQ-SRC-*).
const ABIL = { strength: 'str', dexterity: 'dex', constitution: 'con', intelligence: 'int', wisdom: 'wis', charisma: 'cha' };

export const textFacts = (txt) => {
  const f = { attr: {}, bab: null };
  for (const m of String(txt ?? '').matchAll(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(\d+)/gi)) f.attr[ABIL[m[1].toLowerCase()]] = Number(m[2]);
  const b = /Base Attack Bonus\s*\+?(\d+)/i.exec(txt ?? '');
  if (b) f.bab = Number(b[1]);
  return f;
};

export const structFacts = (st) => {
  const f = { attr: {}, bab: null };
  const walk = (x) => {
    if (Array.isArray(x)) x.forEach(walk);
    else if (x && typeof x === 'object') {
      if (x.type === 'attribute' && x.ability) f.attr[x.ability] = Number(x.min ?? x.value);
      if (x.type === 'bab') f.bab = Number(x.min ?? x.value);
      Object.values(x).forEach(walk);
    }
  };
  walk(st);
  return f;
};

/** Differences between the checkable facts of the text and of the structure (empty = no mechanically visible disagreement). */
export function textStructureDisagreements(text, structure) {
  const t = textFacts(text), q = structFacts(structure), out = [];
  for (const k of new Set([...Object.keys(t.attr), ...Object.keys(q.attr)])) {
    if (t.attr[k] !== q.attr[k]) out.push(`${k.toUpperCase()}: text ${t.attr[k] ?? 'absent'} vs structure ${q.attr[k] ?? 'absent'}`);
  }
  if (t.bab !== q.bab) out.push(`BAB: text ${t.bab ?? 'absent'} vs structure ${q.bab ?? 'absent'}`);
  return out;
}

export const clauseBag = (x) => String(x ?? '').toLowerCase().replace(/\b(feat|skill|the|trained in|with|an?)\b/g, ' ').replace(/[^a-z0-9+]+/g, ' ').split(' ').filter(Boolean).sort().join(' ');
