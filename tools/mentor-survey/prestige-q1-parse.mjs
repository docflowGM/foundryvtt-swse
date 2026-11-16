// Deterministic parser for Prestige Q1 answer banks in the rolling design (varied table shapes and id formats).
// Rule: a row is a Q1 answer when its first cell is a Q1 id (letters + digits, or *-NEUTRAL) and the row holds a quoted first-person text.
// Class attribution = nearest preceding heading that names a prestige class (section headings without a class reset it).
const ID_CELL = /^\|\s*`?([A-Z][A-Z0-9]*(?:-[A-Z0-9]+){0,3})`?\s*\|/;
const TEXT_RE = /[“"]([^”"]{12,}?)[”"]/;

export function parseQ1(lines, classNames, firstLine = 700) {
  const names = classNames.map((c) => ({ ...c, re: new RegExp(`\\b${c.className.replace(/ /g, '\\s+')}\\b`, 'i') }));
  const rows = [];
  const cand = [];
  let lastLabel = null;
  let introArmed = false;
  let armedClass = null;
  let sectionClass = null;
  let curClass = null; let headingNo = 0; let headingText = '';
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const h = /^(#{2,3}) (.*)$/.exec(L);
    if (h && i >= firstLine) {
      headingNo = i + 1; headingText = h[2]; lastLabel = null;
      const hit = names.filter((n) => n.re.test(h[2]));
      const sub = h[1] === '###';
      if (sub && sectionClass && !(hit.length === 1 && hit[0].classId === sectionClass)) { /* a sub-heading never moves a section that names its own class */ }
      else if (hit.length === 1) { if (hit[0].classId !== curClass) { armedClass = hit[0].classId; introArmed = true; } curClass = hit[0].classId; if (!sub) sectionClass = curClass; }
      else if (hit.length > 1) { curClass = null; if (!sub) sectionClass = null; }
      else if (!sub) { sectionClass = null; if (/^\d+\./.test(h[2]) || true) curClass = null; }
      continue;
    }
    if (i < firstLine) continue;
    if (curClass && introArmed) {
      let label = null; let text = null;
      const bq = /^>\s*(?:\*\*([^*]+?):\*\*\s*)?(\S.*)$/.exec(L);
      const bl = /^(?:-\s+)?\*\*([^*]+?):\*\*\s*(\S.*)$/.exec(L);
      if (bq) { label = bq[1] || (lastLabel && /alternative|preferred|candidate/i.test(lastLabel) ? lastLabel : null); text = bq[2]; } else if (bl) { label = bl[1]; text = bl[2]; lastLabel = label; }
      else if (/^\*\*[^*]+:\*\*\s*$/.test(L)) lastLabel = L.replace(/^\*\*|:\*\*\s*$/g, '');
      const okLabel = !!bq || label === null || /question|prompt|^Q1\b|intro|opening|alternative|preferred|line|player-facing|candidate|concise|shorter|warmer|capstone|voice|more /i.test(label);
      if (text && okLabel && !/guardrail|speech|source|do not|note|status|\btone\b|constraint|rule|check/i.test(label || '')) {
        const clean = text.replace(/^[“"]|[”"]$/g, '').trim();
        const isQ = /question|prompt|^Q1\b|player-facing/i.test(label || '') || (/\?$/.test(clean) && /^(As an? |Now that )/.test(clean));
        if (/^[“"A-Za-z<]/.test(clean) && clean.length > 20) cand.push({ classId: curClass, kind: isQ ? 'question' : 'intro', label: label || null, line: i + 1, heading: headingText, text: clean });
      }
    }
    const m = ID_CELL.exec(L);
    if (!m) continue;
    const id = m[1];
    if (curClass === armedClass) introArmed = false;
    if (!(/\d/.test(id) || /NEUTRAL/.test(id))) continue;
    const t = TEXT_RE.exec(L);
    rows.push({ id, line: i + 1, headingLine: headingNo, heading: headingText, classByHeading: curClass, text: t ? t[1].trim() : null, rest: t ? L.slice(L.indexOf(t[0]) + t[0].length) : L });
  }
  return { rows, candidates: cand };
}
