// Deterministic parser for the consolidated Prestige Q3 library (160 scenes, 800 answers, Q1 route lists).
// Pure functions; no Foundry. Every record keeps its exact source line.
export const SCENE_RE = /^### ([A-Z]+)-Q3-S(0[1-5]) [—-] (.+?)\s*$/;
const ROUTE_RE = /^\*\*(?:Q1 primary routes|Primary Q1 routes|Default Q1 routes|Default Q1 route IDs|Primary Q1 route IDs)(?: \((\d+)\))?:\*\*\s*(.*)$/;
const ANS_BOLD = /^\*\*([A-E])(?:\s*[—–-]\s*|\.\s+|:\s+)(.+?)\*\*\s*$/;
const ANS_BOLD_LEAD = /^\*\*([A-E])[.:]\*\*\s+(.+?)\s*$/;
const ANS_TABLE = /^\|\s*\*\*([A-E])\*\*\s*\|\s*(.+?)\s*\|(.*)$/;

export function parseQ3(lines) {
  const scenes = [];
  const exceptions = [];
  let cur = null;
  const close = (end) => { if (cur) { cur.endLine = end; scenes.push(cur); cur = null; } };
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    const sm = SCENE_RE.exec(L);
    if (sm) {
      close(i);
      cur = { prefix: sm[1], sceneId: `${sm[1]}-Q3-S${sm[2]}`, title: sm[3], line: i + 1, routes: [], declaredRouteCount: null, answers: [], mentorLine: null, situation: null, question: null };
      continue;
    }
    if (cur && (/^## /.test(L) || /^# /.test(L) || (/^### /.test(L)))) { close(i); continue; }
    if (!cur) continue;
    const rm = ROUTE_RE.exec(L);
    if (rm) {
      cur.declaredRouteCount = rm[1] ? Number(rm[1]) : null;
      cur.routes = [...rm[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      cur.routeLine = i + 1;
      continue;
    }
    let am = ANS_BOLD.exec(L);
    let text = null; let letter = null;
    if (am) { letter = am[1]; text = am[2].trim(); }
    else if ((am = ANS_BOLD_LEAD.exec(L))) { letter = am[1]; text = am[2].trim(); }
    else if ((am = ANS_TABLE.exec(L))) { letter = am[1]; text = am[2].trim(); }
    if (letter) {
      if (cur.answers.some((a) => a.letter === letter)) exceptions.push({ kind: 'duplicate_answer_letter', sceneId: cur.sceneId, letter, line: i + 1 });
      else cur.answers.push({ letter, text, line: i + 1 });
      continue;
    }
    let m;
    if ((m = /^\*\*Question:\*\*\s*(.+)$/.exec(L))) cur.question = m[1].trim();
    else if ((m = /^\*\*Situation:\*\*\s*(.+)$/.exec(L))) cur.situation = m[1].trim();
    else if (!cur.answers.length && (m = /^\*\*(.+\?)\*\*\s*$/.exec(L)) && !cur.question) cur.question = m[1].trim();
    else if (!cur.mentorLine && (/^>\s*\S/.test(L) || /^\*\*[^*:]+(?: \([^)]*\))?:\*\*\s*[“"<]/.test(L)) && !/Shared|shared|DRAFT/.test(L.slice(0, 40))) { cur.mentorLine = L.replace(/^>\s*/, '').trim(); cur.mentorLineNo = i + 1; }
    else if (cur.mentorLine && !cur.situation && !cur.answers.length && L.trim() && !/^[*>|\-#]/.test(L)) cur.situation = L.trim();
  }
  close(lines.length);
  return { scenes, exceptions };
}
