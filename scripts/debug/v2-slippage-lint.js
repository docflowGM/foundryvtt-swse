// scripts/debug/v2-slippage-lint.js
/**
 * Runtime V2 slippage report.
 *
 * What it catches (best-effort):
 * - Hook registrations for legacy 'renderActorSheet'
 * - Functions containing 'html.find', 'jq-call', 'activateListeners('
 * - Hook handlers using jQuery patterns
 *
 * Usage (macro):
 *   game.swse.debug.reportV2Slippage();
 */
const DEFAULT_PATTERNS = [
  { id: 'html.find', re: /\bhtml\.find\b/ },
  { id: 'jQuery-call', re: /\$\s*\(/ },
  { id: 'activateListeners', re: /activateListeners\s*\(/ },
  { id: 'renderActorSheet', re: /renderActorSheet/ }
];

function hookEntries() {
  const entries = [];
  const events = Hooks?.events ?? {};
  for (const [event, fns] of Object.entries(events)) {
    if (!Array.isArray(fns)) {continue;}
    for (const fn of fns) {entries.push({ event, fn });}
  }
  return entries;
}

function scanFn(fn, patterns = DEFAULT_PATTERNS) {
  const src = String(fn ?? '');
  const hits = [];
  for (const p of patterns) {
    if (p.re.test(src)) {hits.push(p.id);}
  }
  return hits;
}

export function reportV2Slippage(patterns = DEFAULT_PATTERNS) {
  const rows = [];

  // Hook name slippage
  const events = Object.keys(Hooks?.events ?? {});
  if (events.includes('renderActorSheet')) {
    rows.push({ where: 'Hooks.events', what: 'renderActorSheet registered', detail: 'Legacy hook present' });
  }

  for (const { event, fn } of hookEntries()) {
    const hits = scanFn(fn, patterns);
    if (hits.length) {rows.push({ where: 'Hook handler', what: hits.join(', '), detail: event });}
  }

  // Sheet classes
  const sheetClasses = Object.values(CONFIG?.Actor?.sheetClasses ?? {}).flatMap(m => Object.values(m ?? {}));
  for (const sc of sheetClasses) {
    const cls = sc?.cls;
    if (!cls) {continue;}
    const hits = scanFn(cls, patterns);
    if (hits.length) {rows.push({ where: 'Actor sheet class', what: hits.join(', '), detail: cls.name });}
  }

  // Report
  const header = `<h3>SWSE V2 Slippage Report</h3>`;
  const body = rows.length
    ? `<table style="width:100%"><thead><tr><th>Where</th><th>What</th><th>Detail</th></tr></thead><tbody>${
        rows.map(r => `<tr><td>${r.where}</td><td>${r.what}</td><td>${r.detail}</td></tr>`).join('')
      }</tbody></table>`
    : `<p>✅ No obvious V1 slippage found at runtime.</p>`;

  ChatMessage.create({
    speaker: { alias: 'SWSE Linter' },
    content: `<section class="swse-v2-lint">${header}${body}</section>`,
    whisper: [game.user.id]
  });

  return rows;
}

export default reportV2Slippage;
