#!/usr/bin/env node
/**
 * SWSE V2 architecture census — Phase 0 generator.
 *
 * READ-ONLY with respect to the system: reads `git ls-files` and file
 * contents, writes ONLY under data/audits/architecture-census/.
 * Not imported by index.js; not part of the runtime.
 *
 * Usage:
 *   node tools/architecture-census/build-census.mjs           # write outputs
 *   node tools/architecture-census/build-census.mjs --check   # rebuild in memory, verify outputs match
 *
 * Parsing: acorn (ESM) when resolvable; files that fail to parse are recorded
 * with parseError and analysed with a regex fallback.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { DOMAINS, classifyDomain, inferRole, keywordDomain } from './taxonomy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'audits', 'architecture-census');
const CHECK = process.argv.includes('--check');

// ---------- acorn resolution (dev dependency only) ----------
function loadAcorn() {
  const candidates = [ROOT, '/opt/node-tools', process.env.NODE_TOOLS || ''].filter(Boolean);
  for (const c of candidates) {
    try {
      const req = createRequire(path.join(c, 'noop.js'));
      return { acorn: req('acorn'), walk: req('acorn-walk') };
    } catch { /* next */ }
  }
  return null;
}
const AC = loadAcorn();
if (!AC) { console.error('acorn + acorn-walk are required (npm i -D acorn acorn-walk, or set NODE_TOOLS).'); process.exit(2); }
const { acorn, walk } = AC;

// ---------- repository snapshot ----------
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
// The audited commit is the last commit that touched anything OUTSIDE the audit's own
// paths, so committing audit outputs never changes what is being audited.
const SELF_PREFIXES = ['data/audits/architecture-census/', 'tools/architecture-census/', 'docs/audits/architecture-census/', 'docs/architecture/v2-contracts/'];
// Repository registries that must list the audit's own new evidence files (the Phase 5C
// classification test requires every data/audits/** file to be classified). Changes to
// these files only register audit outputs; the census reads them as of the audited commit.
const REGISTRY_SIDE_EFFECTS = ['data/audits/phase-5c-authority-classification.json', 'docs/audits/phase-5c-authority-classification.md'];
const EXCLUDE = [...SELF_PREFIXES, ...REGISTRY_SIDE_EFFECTS].map(p => `:(exclude)${p}`);
const HEAD = git('log', '-1', '--format=%H', '--', '.', ...EXCLUDE).trim();
{
  const drift = git('diff', '--name-only', HEAD, '--', '.', ...EXCLUDE).trim();
  if (drift) { console.error(`Working tree differs from audited commit ${HEAD.slice(0, 7)} outside audit paths:\n${drift}`); process.exit(3); }
}
const ALL_TRACKED = git('ls-tree', '-r', '--name-only', '-z', HEAD).split('\0').filter(Boolean);
const FILES = ALL_TRACKED.filter(f => !SELF_PREFIXES.some(p => f.startsWith(p))).sort();
const FILESET = new Set(FILES);

const TEXT_EXT = /\.(m?js|ts|json|ndjson|md|hbs|html|css|txt|yml|yaml|sh|py|csv|db|svg|ini|tmp|sha256|prettierignore)$/i;
const isText = f => TEXT_EXT.test(f) || /(^|\/)(\.gitignore|\.gitattributes|LICENSE|SHA256SUMS|\.prettierignore)$/.test(f);
const isJs = f => /\.(m?js)$/.test(f);
const ext = f => (f.match(/\.([A-Za-z0-9]+)$/)?.[1] || '(none)').toLowerCase();
const top = f => f.includes('/') ? f.split('/')[0] : '(root)';

const content = new Map();
const sizeOf = new Map();
for (const f of FILES) {
  const abs = path.join(ROOT, f);
  let st; try { st = fs.statSync(abs); } catch { sizeOf.set(f, -1); continue; }
  sizeOf.set(f, st.size);
  if (REGISTRY_SIDE_EFFECTS.includes(f)) {
    const t = git('show', `${HEAD}:${f}`); content.set(f, t); sizeOf.set(f, Buffer.byteLength(t)); continue;
  }
  if (isText(f) && st.size < 40_000_000) content.set(f, fs.readFileSync(abs, 'utf8'));
}
const sha1 = s => crypto.createHash('sha1').update(s).digest('hex');
const lineCount = t => (t ? t.split('\n').length : 0);
const slocOf = t => (t ? t.split('\n').filter(l => l.trim() && !/^\s*(\/\/|\*|\/\*)/.test(l)).length : 0);

const SYSPREFIX = /^\/?systems\/foundryvtt-swse\//;
function resolveSpec(fromFile, spec) {
  if (!spec || typeof spec !== 'string') return null;
  let p;
  if (spec.startsWith('.')) p = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), spec));
  else if (SYSPREFIX.test(spec)) p = spec.replace(SYSPREFIX, '');
  else if (spec.startsWith('/')) p = spec.slice(1);
  else return { external: spec };
  for (const cand of [p, p + '.js', p + '.mjs', p + '/index.js', p + '/index.mjs']) if (FILESET.has(cand)) return { file: cand };
  return { missing: p };
}

// ---------- JS analysis ----------
const WRITE_METHODS = new Set(['update', 'setFlag', 'unsetFlag', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments', 'updateSource', 'toMessage', 'delete', 'create', 'updateDocuments', 'createDocuments', 'deleteDocuments']);
const HOOK_METHODS = new Set(['on', 'once', 'off', 'call', 'callAll']);
const MARKER_RES = {
  deprecated: /@deprecated|\bDEPRECATED\b|\bdeprecated\b/g,
  legacy: /\blegacy\b/gi,
  compat: /\bcompat(ibility)?\b|\bshim\b|\bpolyfill\b/gi,
  fallback: /\bfallback\b/gi,
  hotfix: /\bhotfix\b/gi,
  todo: /\bTODO\b|\bFIXME\b|\bXXX\b|\bHACK\b/g,
};
const src = (code, n) => code.slice(n.start, n.end);
const short = s => (s.length > 80 ? s.slice(0, 77) + '...' : s).replace(/\s+/g, ' ');

function parse(code) {
  const base = { ecmaVersion: 'latest', allowHashBang: true, allowAwaitOutsideFunction: true, allowImportExportEverywhere: true, allowReturnOutsideFunction: true, locations: true };
  try { return { ast: acorn.parse(code, { ...base, sourceType: 'module' }) }; }
  catch (e1) {
    try { return { ast: acorn.parse(code, { ...base, sourceType: 'script' }) }; }
    catch { return { error: `${e1.message}` }; }
  }
}

function receiverClass(t) {
  if (/ActorEngine/.test(t)) return 'ActorEngine';
  if (/^ChatMessage$/.test(t)) return 'ChatMessage';
  if (/game\.settings/.test(t)) return 'game.settings';
  if (/^(Actor|CONFIG\.Actor\.documentClass)$/.test(t)) return 'Actor(class)';
  if (/^(Item|CONFIG\.Item\.documentClass)$/.test(t)) return 'Item(class)';
  if (/^(ActiveEffect|Combat|Combatant|Scene|JournalEntry|Folder|Macro|User|Token(Document)?|RollTable|Playlist)$/.test(t)) return `${t}(class)`;
  if (/combat/i.test(t)) return 'combat-doc';
  if (/token/i.test(t)) return 'token-doc';
  if (/effect/i.test(t)) return 'effect-doc';
  if (/actor|owner|character|target|droid|vehicle|npc|follower|minion|parent/i.test(t)) return 'actor-like';
  if (/item|weapon|armor|power|feat|talent|gear|upgrade|equip|doc|document|embedded/i.test(t)) return 'item-or-doc-like';
  if (/message|msg|chat/i.test(t)) return 'chat-message';
  if (/settings/i.test(t)) return 'settings';
  if (/user|game\.user/i.test(t)) return 'user';
  if (/scene|journal|folder|macro/i.test(t)) return 'world-doc';
  if (/^(this|super)$/.test(t)) return 'self';
  if (/map|set|cache|registry|store|state|list|array|index|queue|ledger|session|draft|buffer|this\.\w+$/i.test(t)) return 'in-memory';
  return 'unknown';
}

const FN_MIN_LINES = 12;
const functionClones = []; // {file, name, line, lines, exact, struct}

function analyzeJs(f, code) {
  const r = {
    imports: [], dynamicImports: [], reexports: [], exports: [], hasDefaultExport: false,
    importedNames: [], // {target, names[], namespace, default}
    hooks: [], settings: [], sheets: [], helpers: [], partials: [], sockets: [], globals: [],
    writes: [], derivedWrites: [], actorEngineCalls: 0, chatCreates: 0,
    templateRefs: [], pathStrings: [], templatePatterns: [], workers: 0, parseError: null, functions: 0, classes: [], fnNames: [],
    nodeBuiltins: false,
  };
  const { ast, error } = parse(code);
  if (error) {
    r.parseError = error;
    for (const m of code.matchAll(/(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g)) r.imports.push(m[1]);
    for (const m of code.matchAll(/import\s*['"]([^'"]+)['"]/g)) r.imports.push(m[1]);
    for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) r.dynamicImports.push({ spec: m[1] });
    for (const m of code.matchAll(/Hooks\.(on|once)\(\s*['"]([^'"]+)['"]/g)) r.hooks.push({ method: m[1], name: m[2], line: null });
    for (const m of code.matchAll(/\.(update|setFlag|unsetFlag|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\(/g)) r.writes.push({ method: m[1], receiver: '(regex)', cls: 'unknown', line: null });
    r.actorEngineCalls = (code.match(/ActorEngine\.\w+\(/g) || []).length;
    for (const m of code.matchAll(/['"`]([^'"`\n]*\.hbs)['"`]/g)) r.templateRefs.push(m[1]);
    return r;
  }
  const lineOf = n => n.loc?.start?.line ?? null;
  walk.full(ast, (n) => {
    switch (n.type) {
      case 'ImportDeclaration': {
        r.imports.push(n.source.value);
        const names = []; let ns = false, def = false;
        for (const s of n.specifiers) {
          if (s.type === 'ImportNamespaceSpecifier') ns = true;
          else if (s.type === 'ImportDefaultSpecifier') def = true;
          else names.push(s.imported.name ?? s.imported.value);
        }
        r.importedNames.push({ spec: n.source.value, names, namespace: ns, default: def });
        if (/^node:|^(fs|path|url|child_process|crypto|os)$/.test(n.source.value)) r.nodeBuiltins = true;
        break;
      }
      case 'ExportNamedDeclaration':
        if (n.source) { r.reexports.push(n.source.value); r.importedNames.push({ spec: n.source.value, names: n.specifiers.map(s => s.local.name ?? s.local.value), namespace: false, default: false, reexport: true }); }
        if (n.declaration) {
          if (n.declaration.id) r.exports.push(n.declaration.id.name);
          if (n.declaration.declarations) for (const d of n.declaration.declarations) if (d.id?.name) r.exports.push(d.id.name);
        }
        for (const s of n.specifiers || []) if (!n.source) r.exports.push(s.exported.name ?? s.exported.value);
        break;
      case 'ExportAllDeclaration':
        r.reexports.push(n.source.value);
        r.importedNames.push({ spec: n.source.value, names: [], namespace: true, default: false, reexport: true });
        break;
      case 'ExportDefaultDeclaration': r.hasDefaultExport = true; break;
      case 'ImportExpression': {
        const s = n.source;
        if (s.type === 'Literal') r.dynamicImports.push({ spec: s.value });
        else if (s.type === 'TemplateLiteral') r.dynamicImports.push({ pattern: s.quasis.map(q => q.value.cooked).join('*') });
        else r.dynamicImports.push({ expr: short(src(code, s)) });
        break;
      }
      case 'NewExpression':
        if (n.callee.type === 'Identifier' && /Worker$/.test(n.callee.name)) r.workers++;
        break;
      case 'ClassDeclaration': if (n.id) r.classes.push(n.id.name); break;
      case 'MethodDefinition': case 'Property': case 'PropertyDefinition':
        if (n.key && (n.value?.type === 'FunctionExpression' || n.value?.type === 'ArrowFunctionExpression') && (n.key.name || typeof n.key.value === 'string')) r.fnNames.push({ name: n.key.name ?? n.key.value, line: lineOf(n), lines: n.loc.end.line - n.loc.start.line + 1 });
        break;
      case 'VariableDeclarator':
        if (n.id?.name && (n.init?.type === 'FunctionExpression' || n.init?.type === 'ArrowFunctionExpression')) r.fnNames.push({ name: n.id.name, line: lineOf(n), lines: n.loc.end.line - n.loc.start.line + 1 });
        break;
      case 'CallExpression': {
        const c = n.callee;
        if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier') {
          const prop = c.property.name; const obj = src(code, c.object);
          const arg0 = n.arguments[0]; const lit0 = arg0?.type === 'Literal' ? arg0.value : (arg0?.type === 'TemplateLiteral' ? arg0.quasis.map(q => q.value.cooked).join('*') : null);
          if (obj === 'Hooks' && HOOK_METHODS.has(prop)) r.hooks.push({ method: prop, name: lit0 ?? `(expr:${short(arg0 ? src(code, arg0) : '')})`, line: lineOf(n) });
          else if (/game\.settings$/.test(obj) && prop === 'register') r.settings.push({ ns: n.arguments[0]?.value ?? null, key: n.arguments[1]?.type === 'Literal' ? n.arguments[1].value : `(expr)`, line: lineOf(n) });
          else if (/game\.settings$/.test(obj) && prop === 'registerMenu') r.settings.push({ ns: n.arguments[0]?.value ?? null, key: `menu:${n.arguments[1]?.value ?? '(expr)'}`, line: lineOf(n) });
          else if (prop === 'registerSheet') r.sheets.push({ registrar: short(obj), args: short(n.arguments.map(a => src(code, a)).join(', ')), line: lineOf(n) });
          else if (obj === 'Handlebars' && prop === 'registerHelper') r.helpers.push(lit0 ?? '(expr)');
          else if (obj === 'Handlebars' && prop === 'registerPartial') r.partials.push(lit0 ?? '(expr)');
          else if (/game\.socket$/.test(obj) && prop === 'on') r.sockets.push(lit0 ?? '(expr)');
          if (/ActorEngine/.test(obj)) r.actorEngineCalls++;
          if (obj === 'ChatMessage' && prop === 'create') r.chatCreates++;
          if (WRITE_METHODS.has(prop) || (prop === 'set' && /game\.settings$/.test(obj))) {
            const cls = receiverClass(obj);
            if (!(prop === 'delete' && ['in-memory', 'unknown', 'self'].includes(cls)) && !(prop === 'create' && ['in-memory', 'unknown', 'self'].includes(cls))) {
              r.writes.push({ method: prop, receiver: short(obj), cls, line: lineOf(n) });
            }
          }
        }
        break;
      }
      case 'AssignmentExpression': {
        const left = src(code, n.left);
        if (/\.system\.derived\b|\bderived\.\w+/.test(left) && /system/.test(left)) r.derivedWrites.push({ target: short(left), line: lineOf(n) });
        const gm = left.match(/^(game\.swse|globalThis|window|CONFIG\.SWSE|game\.SWSE|globalThis\.SWSE|window\.SWSE)\.([A-Za-z_$][\w$]*)$/);
        if (gm) r.globals.push(`${gm[1]}.${gm[2]}`);
        break;
      }
      case 'Literal':
        if (typeof n.value === 'string' && n.value.length < 300) {
          if (/\.hbs$|\.html$/.test(n.value) && /templates\//.test(n.value)) r.templateRefs.push(n.value);
          else if (/(^|\/)(templates|data|assets|styles|packs|lang|fonts|schemas|scripts)\/[^\s'"]+\.[A-Za-z0-9]+$/.test(n.value)) r.pathStrings.push(n.value);
        }
        break;
      case 'TemplateLiteral': {
        const pat = n.quasis.map(q => q.value.cooked).join('*');
        if (n.expressions.length && /(templates|data|assets|styles)\//.test(pat) && pat.length < 300) r.templatePatterns.push(pat);
        else if (!n.expressions.length && /templates\/.+\.(hbs|html)$/.test(pat)) r.templateRefs.push(pat);
        break;
      }
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': {
        r.functions++;
        if (n.type === 'FunctionDeclaration' && n.id?.name) r.fnNames.push({ name: n.id.name, line: lineOf(n), lines: n.loc.end.line - n.loc.start.line + 1 });
        if (n.body?.type === 'BlockStatement') {
          const l0 = n.loc.start.line, l1 = n.loc.end.line;
          if (l1 - l0 + 1 >= FN_MIN_LINES) functionClones.push({ file: f, line: l0, lines: l1 - l0 + 1, start: n.body.start, end: n.body.end, name: n.id?.name || null });
        }
        break;
      }
      default: break;
    }
  });
  return r;
}

function fingerprints(code, start, end) {
  const body = code.slice(start, end);
  const exact = []; const struct = [];
  try {
    for (const t of acorn.tokenizer(body, { ecmaVersion: 'latest', allowHashBang: true, allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true, allowImportExportEverywhere: true })) {
      const lbl = t.type.label;
      exact.push(t.value !== undefined ? `${lbl}:${t.value}` : lbl);
      struct.push(lbl === 'name' ? 'I' : lbl === 'string' || lbl === 'template' ? 'S' : lbl === 'num' ? 'N' : (t.value !== undefined && t.type.keyword ? t.value : lbl));
    }
  } catch { return null; }
  if (exact.length < 120) return null;
  return { exact: sha1(exact.join(' ')), struct: sha1(struct.join(' ')), tokens: exact.length };
}

// ---------- pass 1: per-file analysis ----------
const js = new Map();
for (const f of FILES) if (isJs(f) && content.has(f)) js.set(f, analyzeJs(f, content.get(f)));

// edges
const edges = []; // {from,to,kind}
const missingImports = [];
const externalImports = new Map();
const dynPatterns = []; // {from, pattern}
const dynUnresolved = []; // {from, expr}
for (const [f, a] of js) {
  const add = (spec, kind) => {
    const res = resolveSpec(f, spec);
    if (!res) return;
    if (res.file) edges.push({ from: f, to: res.file, kind });
    else if (res.missing) missingImports.push({ from: f, spec, kind });
    else if (res.external) externalImports.set(res.external, (externalImports.get(res.external) || 0) + 1);
  };
  for (const s of a.imports) add(s, 'static');
  for (const s of a.reexports) add(s, 'reexport');
  for (const d of a.dynamicImports) {
    if (d.spec) add(d.spec, 'dynamic');
    else if (d.pattern) dynPatterns.push({ from: f, pattern: d.pattern });
    else {
      // helper wrappers such as abs('scripts/x.js'), u('scripts/x.js'), new URL('../x.js', import.meta.url)
      const lit = d.expr.match(/['"`]([^'"`$]+\.m?js)(?:\?[^'"`]*)?['"`]/);
      let res = null;
      if (lit) {
        res = resolveSpec(f, lit[1].startsWith('.') || lit[1].startsWith('/') ? lit[1] : './' + lit[1]);
        if (!res?.file) res = resolveSpec('index.js', './' + lit[1].replace(/^\.?\//, ''));
        if (!res?.file && /new URL/.test(d.expr)) res = resolveSpec(f, lit[1]);
      }
      if (res?.file) edges.push({ from: f, to: res.file, kind: 'dynamic' });
      else dynUnresolved.push({ from: f, expr: d.expr });
    }
  }
}
const out = new Map(), inn = new Map();
for (const e of edges) {
  if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e);
  if (!inn.has(e.to)) inn.set(e.to, []); inn.get(e.to).push(e);
}

function bfs(roots, kinds) {
  const seen = new Map(); const q = [];
  for (const r of roots) if (!seen.has(r)) { seen.set(r, 0); q.push(r); }
  while (q.length) {
    const x = q.shift();
    for (const e of out.get(x) || []) if (kinds.has(e.kind) && !seen.has(e.to)) { seen.set(e.to, seen.get(x) + 1); q.push(e.to); }
  }
  return seen;
}
const RUNTIME_ROOTS = ['index.js'];
const staticReach = bfs(RUNTIME_ROOTS, new Set(['static', 'reexport']));
const fullReach = bfs(RUNTIME_ROOTS, new Set(['static', 'reexport', 'dynamic']));

// dynamic template-literal import patterns from reachable files
const globRe = pat => new RegExp('^' + pat.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
const patternReach = new Map();
for (const { from, pattern } of dynPatterns) {
  if (!fullReach.has(from)) continue;
  let p = pattern;
  if (p.startsWith('.')) p = path.posix.normalize(path.posix.join(path.posix.dirname(from), p)).replace(/\/\*$/, '/*');
  p = p.replace(SYSPREFIX, '').replace(/^\//, '');
  const re = globRe(p);
  for (const f of FILES) if (isJs(f) && re.test(f) && !fullReach.has(f)) { if (!patternReach.has(f)) patternReach.set(f, []); patternReach.get(f).push({ from, pattern }); }
}
// close over pattern-reached files' own imports
const patRoots = [...patternReach.keys()];
const patClosure = bfs(patRoots, new Set(['static', 'reexport', 'dynamic']));

// test / tool reach
const TEST_FILES = FILES.filter(f => f.startsWith('tests/') && isJs(f));
const CI_TESTS = new Set(TEST_FILES.filter(f => /^tests\/[^/]+\.test\.mjs$/.test(f)));
const testReach = new Map(); // file -> {direct:Set, transitive:Set, ci:Set}
for (const t of TEST_FILES) {
  const reach = bfs([t], new Set(['static', 'reexport', 'dynamic']));
  for (const [f, depth] of reach) {
    if (f === t) continue;
    if (!testReach.has(f)) testReach.set(f, { direct: new Set(), transitive: new Set(), ci: new Set() });
    const o = testReach.get(f);
    if (depth === 1) o.direct.add(t); else o.transitive.add(t);
    if (CI_TESTS.has(t)) o.ci.add(t);
  }
}
const TOOL_FILES = FILES.filter(f => isJs(f) && (f.startsWith('tools/') || f.startsWith('scripts/dev/') || f.startsWith('scripts/build/') || f.startsWith('build/') || f.startsWith('helpers/') || f.startsWith('scripts/maintenance/')));
const toolReach = bfs(TOOL_FILES, new Set(['static', 'reexport', 'dynamic']));

// ---------- string-reference index (non-JS consumers) ----------
// Collect path-like strings from every text file; resolve relative CSS urls.
const PATHTOK = /(?:systems\/foundryvtt-swse\/)?((?:templates|data|assets|styles|packs|lang|fonts|schemas|scripts|tools|docs|reference|build|helpers|Config|design-docs|tests)\/[A-Za-z0-9_@%.\/()\- ]*?[A-Za-z0-9_\-)]\.[A-Za-z0-9]{1,6})(?![A-Za-z0-9])/g;
const refsTo = new Map(); // target -> Map(referrer -> kind)
function addRef(target, referrer) { if (!FILESET.has(target) || target === referrer) return; if (!refsTo.has(target)) refsTo.set(target, new Set()); refsTo.get(target).add(referrer); }
for (const [f, t] of content) {
  if (/\.(db|ndjson)$/.test(f) && t.length > 5_000_000) { /* still scan big packs */ }
  for (const m of t.matchAll(PATHTOK)) addRef(decodeURIComponent(m[1].replace(/%(?![0-9A-Fa-f]{2})/g, '%25')), f);
  if (f.endsWith('.css')) {
    for (const m of t.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const u = m[1]; if (/^(data:|https?:|#)/.test(u)) continue;
      const p = u.startsWith('/') ? u.replace(SYSPREFIX, '').replace(/^\//, '') : path.posix.normalize(path.posix.join(path.posix.dirname(f), u));
      addRef(p.split(/[?#]/)[0], f);
    }
    for (const m of t.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]/g)) addRef(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1])), f);
  }
  if (f.endsWith('.hbs')) {
    for (const m of t.matchAll(/\{\{>\s*["']?([^\s"'}]+)/g)) {
      const name = m[1].replace(SYSPREFIX, '');
      if (FILESET.has(name)) addRef(name, f);
    }
  }
}
// partial-name references (registered names without paths)
const hbsByBase = new Map();
for (const f of FILES) if (f.endsWith('.hbs')) { const b = path.posix.basename(f, '.hbs'); if (!hbsByBase.has(b)) hbsByBase.set(b, []); hbsByBase.get(b).push(f); }
const partialNameRefs = new Map();
for (const [f, t] of content) if (f.endsWith('.hbs')) for (const m of t.matchAll(/\{\{>\s*["']?([A-Za-z0-9_\-]+)["']?[\s}]/g)) {
  for (const target of hbsByBase.get(m[1]) || []) { if (!partialNameRefs.has(target)) partialNameRefs.set(target, new Set()); partialNameRefs.get(target).add(f); }
}
// JS template-literal path patterns (templates/data/assets) from reachable JS
const jsPathPatterns = [];
for (const [f, a] of js) if (fullReach.has(f)) for (const p of a.templatePatterns) {
  let q = p.replace(SYSPREFIX, '').replace(/^\//, '');
  const m = q.match(/(templates|data|assets|styles)\/.*$/); if (!m) continue;
  if (m.index > 0 && !/^\.\.\//.test(q)) q = '*' + m[0]; else q = m[0];
  // generic = nothing literal after the top directory before the first wildcard (e.g. data/${filename})
  const lit = m[0].split('*')[0];
  const generic = lit.split('/').filter(Boolean).length <= 1 && !/[A-Za-z]/.test(lit.split('/').slice(1).join(''));
  jsPathPatterns.push({ from: f, re: globRe(q), pattern: p, generic });
}

const sys = JSON.parse(content.get('system.json'));
const manifestStyles = new Set(sys.styles || []);
const manifestPacks = new Map((sys.packs || []).map(p => [p.path, p.name]));
const manifestLangs = new Set((sys.languages || []).map(l => l.path));
const manifestMedia = new Set(JSON.stringify(sys).match(/(assets|styles|fonts)\/[^"]+/g) || []);

const isRuntimeReferrer = r => (fullReach.has(r) || patClosure.has(r)) || /^(templates|styles|lang|packs)\//.test(r) || r === 'system.json' || r === 'template.json' || (r.startsWith('data/') && !r.startsWith('data/audits/'));

// ---------- per-file registry ----------
const registry = [];
const domainCounts = {};
const consumersOf = f => [...new Set((inn.get(f) || []).map(e => e.from))].sort();

for (const f of FILES) {
  const t = content.get(f);
  const a = js.get(f);
  const dom = classifyDomain(f);
  const entry = {
    id: 'F-' + sha1(f).slice(0, 10),
    path: f, top: top(f), ext: ext(f), bytes: sizeOf.get(f),
    lines: t !== undefined ? lineCount(t) : null,
    sloc: a ? slocOf(t) : null,
    primarySystem: dom.domain, domainBasis: dom.basis,
  };
  if (dom.directoryDomain) entry.directoryDomain = dom.directoryDomain;
  const refs = [...(refsTo.get(f) || [])];
  const runtimeRefs = refs.filter(isRuntimeReferrer);
  if (a) {
    const consumers = consumersOf(f);
    const writes = a.writes;
    const tr = testReach.get(f);
    let reach;
    if (staticReach.has(f)) reach = 'reachable-static';
    else if (fullReach.has(f)) reach = 'reachable-dynamic';
    else if (patternReach.has(f) || patClosure.has(f)) reach = 'reachable-dynamic-pattern';
    else if (f.startsWith('tests/')) reach = 'test-file';
    else if (TOOL_FILES.includes(f) || toolReach.has(f)) reach = f.startsWith('scripts/') && !/^scripts\/(dev|build|maintenance)\//.test(f) ? 'tool-only-import' : 'node-tool';
    else if (a.nodeBuiltins || /^#!/.test(t)) reach = 'node-script';
    else if (tr) reach = 'test-only-import';
    else if (runtimeRefs.length) reach = 'string-referenced-only';
    else if (consumers.some(c => !/^(tests|tools|docs)\//.test(c))) reach = 'unreachable-importers-only';
    else reach = 'orphan-unreferenced';
    const secondary = new Set();
    for (const e of out.get(f) || []) { const d = classifyDomain(e.to).domain; if (d !== dom.domain) secondary.add(d); }
    Object.assign(entry, {
      role: inferRole(f, { stateWrites: writes.length }),
      runtimeReachability: reach,
      importDepthFromIndex: fullReach.get(f) ?? null,
      imports: (out.get(f) || []).map(e => e.kind === 'static' ? e.to : `${e.to} [${e.kind}]`),
      unresolvedImports: missingImports.filter(m => m.from === f).map(m => m.spec),
      dynamicImportPatterns: a.dynamicImports.filter(d => !d.spec).map(d => d.pattern || d.expr),
      exports: [...a.exports, ...(a.hasDefaultExport ? ['default'] : [])],
      classes: a.classes,
      consumers, consumerCount: consumers.length,
      secondarySystems: [...secondary].sort(),
      hooks: a.hooks.map(h => `${h.method}:${h.name}`),
      settingsRegistered: a.settings.map(s => `${s.ns}.${s.key}`),
      sheetRegistrations: a.sheets.length, handlebarsHelpers: a.helpers.length, sockets: a.sockets,
      globalsAssigned: [...new Set(a.globals)],
      stateWrites: { total: writes.length, byClass: writes.reduce((o, w) => (o[w.cls] = (o[w.cls] || 0) + 1, o), {}) },
      derivedWrites: a.derivedWrites.length,
      actorEngineCalls: a.actorEngineCalls, chatMessageCreates: a.chatCreates,
      templatesReferenced: [...new Set(a.templateRefs.map(x => x.replace(SYSPREFIX, '').replace(/^\//, '')))],
      tests: tr ? { direct: [...tr.direct].sort(), transitiveCount: tr.transitive.size, ciTestCount: tr.ci.size } : { direct: [], transitiveCount: 0, ciTestCount: 0 },
      markers: Object.fromEntries(Object.entries(MARKER_RES).map(([k, re]) => [k, (t.match(re) || []).length]).filter(([, v]) => v)),
      parseError: a.parseError,
    });
  } else {
    let reach;
    const allRefs = new Set([...refs, ...(partialNameRefs.get(f) || [])]);
    const rtRefs = [...allRefs].filter(isRuntimeReferrer);
    const patRef = f.match(/^(templates|data|assets|styles)\//) ? (jsPathPatterns.find(p => !p.generic && p.re.test(f)) || jsPathPatterns.find(p => p.re.test(f))) : null;
    if (f === 'system.json' || f === 'template.json') reach = 'manifest';
    else if (manifestStyles.has(f)) reach = 'manifest-style';
    else if (manifestLangs.has(f)) reach = 'manifest-language';
    else if (f.startsWith('packs/')) reach = manifestPacks.has(f.replace(/\.db$/, '')) ? 'manifest-pack-source' : (rtRefs.length ? 'pack-referenced' : 'pack-undeclared');
    else if (manifestMedia.has(f)) reach = 'manifest-media';
    else if (rtRefs.length) reach = 'runtime-referenced';
    else if (patRef && !patRef.generic) reach = 'runtime-pattern-referenced';
    else if (patRef && patRef.generic && [...allRefs].some(r => r.startsWith('tests/'))) reach = 'test-referenced+generic-loader-possible';
    else if (patRef && patRef.generic && [...allRefs].some(r => /^(tools|scripts\/(dev|build)|build|helpers)\//.test(r))) reach = 'tool-referenced+generic-loader-possible';
    else if (patRef && patRef.generic) reach = 'generic-loader-possible-only';
    else if ([...allRefs].some(r => r.startsWith('tests/'))) reach = 'test-referenced';
    else if ([...allRefs].some(r => r.startsWith('tools/') || r.startsWith('scripts/dev/') || r.startsWith('scripts/build/') || r.startsWith('build/') || r.startsWith('helpers/'))) reach = 'tool-referenced';
    else if (allRefs.size) reach = 'doc-or-data-referenced-only';
    else reach = 'unreferenced';
    Object.assign(entry, {
      role: inferRole(f),
      runtimeReachability: reach,
      referencedBy: [...allRefs].sort().slice(0, 25), referencedByCount: allRefs.size,
      runtimeReferrerCount: rtRefs.length,
    });
    if (patRef) entry.patternReferencedBy = patRef.from;
    if (t !== undefined && /\.(md|hbs|css)$/.test(f)) {
      const mk = Object.fromEntries(Object.entries(MARKER_RES).map(([k, re]) => [k, (t.match(re) || []).length]).filter(([, v]) => v));
      if (Object.keys(mk).length) entry.markers = mk;
    }
    if (f.endsWith('.md') && t) {
      const open = (t.match(/- \[ \]/g) || []).length;
      if (open) entry.uncheckedItems = open;
      if (/FOUNDRY_ACCEPTANCE|not yet foundry|FOUNDRY_TESTED|DEFERRED_RULES_REVIEW|live Foundry/i.test(t)) entry.mentionsFoundryAcceptanceOrDeferral = true;
    }
  }
  registry.push(entry);
  domainCounts[entry.primarySystem] = (domainCounts[entry.primarySystem] || 0) + 1;
}

// for unreachable runtime JS: does the file stem appear in any reachable JS/template/data text?
const reachableText = [...content.entries()].filter(([f]) => fullReach.has(f) || patClosure.has(f) || /^(templates\/|packs\/|system\.json)/.test(f) || (f.startsWith('data/') && !f.startsWith('data/audits/'))).map(([, t]) => t).join('\n');
for (const e of registry) {
  if (!e.imports || !e.path.startsWith('scripts/')) continue;
  if (!['orphan-unreferenced', 'unreachable-importers-only', 'test-only-import', 'tool-only-import', 'string-referenced-only'].includes(e.runtimeReachability)) continue;
  const stem = path.posix.basename(e.path).replace(/\.m?js$/, '');
  e.stemMentionedInRuntimeText = stem.length > 4 && reachableText.includes(stem);
  e.unreachableConfidence = e.stemMentionedInRuntimeText ? 'unverified-name-mentioned-at-runtime' : (e.globalsAssigned?.length || e.hooks?.length ? 'unverified-self-registering' : 'static-proof-no-runtime-path');
}

// refine tests/tools primary system by import majority
const byPath = new Map(registry.map(e => [e.path, e]));
for (const e of registry) {
  if (!e.imports || !(e.top === 'tests' || e.top === 'tools')) continue;
  const tally = {};
  for (const imp of e.imports) { const p = imp.split(' [')[0]; if (!/^(tests|tools)\//.test(p)) { const d = byPath.get(p)?.primarySystem; if (d) tally[d] = (tally[d] || 0) + 1; } }
  const best = Object.entries(tally).sort((x, y) => y[1] - x[1])[0];
  const kw = keywordDomain(e.path.split('/').slice(1).join('/'));
  if (best) { domainCounts[e.primarySystem]--; e.primarySystem = best[0]; e.domainBasis = 'import-majority'; domainCounts[e.primarySystem] = (domainCounts[e.primarySystem] || 0) + 1; }
  else if (kw) { domainCounts[e.primarySystem]--; e.primarySystem = kw; e.domainBasis = 'keyword'; domainCounts[e.primarySystem] = (domainCounts[e.primarySystem] || 0) + 1; }
}
// test-target coverage per runtime file flagged on tests side
for (const e of registry) if (e.top === 'tests' && e.imports) e.ciRun = CI_TESTS.has(e.path);

// verification level
for (const e of registry) {
  if (e.parseError) e.verification = 'source-inspected-regex-fallback';
  else if (e.imports) e.verification = 'dependency-traced';
  else if (content.has(e.path)) e.verification = 'reference-traced';
  else e.verification = 'binary-inventoried';
}

// ---------- graph analytics ----------
// Tarjan SCC over runtime JS (static + reexport + dynamic)
function tarjan(nodes, adj) {
  let idx = 0; const st = []; const on = new Set(); const index = new Map(); const low = new Map(); const sccs = [];
  const strong = (v) => {
    const stack = [[v, 0]]; index.set(v, idx); low.set(v, idx); idx++; st.push(v); on.add(v);
    while (stack.length) {
      const [x, i] = stack[stack.length - 1];
      const ns = adj.get(x) || [];
      if (i < ns.length) {
        stack[stack.length - 1][1]++;
        const w = ns[i];
        if (!index.has(w)) { index.set(w, idx); low.set(w, idx); idx++; st.push(w); on.add(w); stack.push([w, 0]); }
        else if (on.has(w)) low.set(x, Math.min(low.get(x), index.get(w)));
      } else {
        stack.pop();
        if (stack.length) { const p = stack[stack.length - 1][0]; low.set(p, Math.min(low.get(p), low.get(x))); }
        if (low.get(x) === index.get(x)) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== x); if (c.length > 1) sccs.push(c.sort()); }
      }
    }
  };
  for (const v of nodes) if (!index.has(v)) strong(v);
  return sccs;
}
const runtimeJs = registry.filter(e => e.imports && !/^(tests|tools)\//.test(e.path)).map(e => e.path);
const adjStatic = new Map(); for (const e of edges) if (e.kind !== 'dynamic') { if (!adjStatic.has(e.from)) adjStatic.set(e.from, []); adjStatic.get(e.from).push(e.to); }
const cycles = tarjan(runtimeJs, adjStatic).sort((a, b) => b.length - a.length);

// domain-to-domain edges
const domOf = p => byPath.get(p)?.primarySystem;
const domEdges = {};
for (const e of edges) {
  if (/^(tests|tools)\//.test(e.from)) continue;
  const a = domOf(e.from), b = domOf(e.to); if (!a || !b || a === b) continue;
  const k = `${a} -> ${b}`; domEdges[k] = (domEdges[k] || 0) + 1;
}
// domain-level cycles
const domAdj = new Map(); for (const k of Object.keys(domEdges)) { const [a, b] = k.split(' -> '); if (!domAdj.has(a)) domAdj.set(a, []); domAdj.get(a).push(b); }
const domainCycles = tarjan([...new Set(Object.keys(domEdges).flatMap(k => k.split(' -> ')))], domAdj);

// unused named exports (runtime JS only)
const importedNamesByTarget = new Map();
for (const [f, a] of js) for (const imp of a.importedNames) {
  const res = resolveSpec(f, imp.spec); if (!res?.file) continue;
  if (!importedNamesByTarget.has(res.file)) importedNamesByTarget.set(res.file, { names: new Set(), namespace: false, default: false });
  const o = importedNamesByTarget.get(res.file);
  imp.names.forEach(n => o.names.add(n)); if (imp.namespace) o.namespace = true; if (imp.default) o.default = true;
}
const allText = [...content.entries()].filter(([f]) => isJs(f) || f.endsWith('.hbs')).map(([, t]) => t).join('\n');
const unusedExports = [];
for (const e of registry) {
  if (!e.exports || /^(tests|tools)\//.test(e.path) || !e.runtimeReachability?.startsWith('reachable')) continue;
  const o = importedNamesByTarget.get(e.path);
  if (o?.namespace) continue;
  const unused = e.exports.filter(n => n !== 'default' && !(o?.names.has(n)));
  if (!unused.length) continue;
  // textual usage elsewhere (globals, string access) downgrades confidence
  const textual = unused.filter(n => n.length > 3 && (allText.split(n).length - 1) > (content.get(e.path).split(n).length - 1));
  unusedExports.push({ path: e.path, unusedNamedExports: unused, nameAppearsElsewhere: textual });
}

// duplicate symbol definitions across runtime files (classes and exported names)
const symbolDefs = new Map();
for (const e of registry) if (e.exports && !/^(tests|tools|scripts\/dev|scripts\/build)\//.test(e.path)) for (const n of new Set([...(e.classes || []), ...e.exports.filter(x => x !== 'default')])) {
  if (n.length < 5 || /^(init|register|setup|default|DEFAULT_OPTIONS|PARTS|run|main|apply|build|render|create|get|set)$/.test(n)) continue;
  if (!symbolDefs.has(n)) symbolDefs.set(n, []); symbolDefs.get(n).push(e.path);
}
const duplicateSymbols = [...symbolDefs.entries()].filter(([, v]) => v.length > 1).map(([name, files]) => ({ name, files: files.sort() })).sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name));

// function clone detection
const fp = [];
for (const c of functionClones) { const g = fingerprints(content.get(c.file), c.start, c.end); if (g) fp.push({ ...c, ...g }); }
const group = key => { const m = new Map(); for (const x of fp) { if (!m.has(x[key])) m.set(x[key], []); m.get(x[key]).push(x); } return [...m.values()].filter(g => new Set(g.map(x => x.file)).size > 1); };
const exactClones = group('exact').map(g => ({ tokens: g[0].tokens, lines: g[0].lines, sites: g.map(x => ({ path: x.file, line: x.line, name: x.name })) })).sort((a, b) => b.tokens * b.sites.length - a.tokens * a.sites.length);
const exactKeys = new Set(fp.filter(x => exactClones.length).map(() => null));
const structClones = group('struct').filter(g => new Set(g.map(x => x.exact)).size > 1).map(g => ({ tokens: g[0].tokens, lines: g[0].lines, sites: g.map(x => ({ path: x.file, line: x.line, name: x.name })) })).sort((a, b) => b.tokens * b.sites.length - a.tokens * a.sites.length);
void exactKeys;
const scopeOf = p => /^(tests)\//.test(p) ? 'test' : /^(tools|scripts\/dev|scripts\/build|build|helpers)\//.test(p) ? 'tool' : 'runtime';

// hooks inventory
const hookIndex = new Map();
for (const [f, a] of js) if (!/^(tests|tools)\//.test(f)) for (const h of a.hooks) if (h.method === 'on' || h.method === 'once') {
  if (!hookIndex.has(h.name)) hookIndex.set(h.name, []); hookIndex.get(h.name).push({ path: f, line: h.line, method: h.method, reachable: byPath.get(f).runtimeReachability.startsWith('reachable') });
}
const hooks = [...hookIndex.entries()].map(([name, sites]) => ({ name, listeners: sites.length, reachableListeners: sites.filter(s => s.reachable).length, sites })).sort((a, b) => b.listeners - a.listeners);

// settings inventory + duplicates
const settingIndex = new Map();
for (const [f, a] of js) if (!/^(tests|tools)\//.test(f)) for (const s of a.settings) { const k = `${s.ns}.${s.key}`; if (!settingIndex.has(k)) settingIndex.set(k, []); settingIndex.get(k).push({ path: f, line: s.line }); }
const settings = [...settingIndex.entries()].map(([key, sites]) => ({ key, sites })).sort((a, b) => a.key.localeCompare(b.key));

// state-writer census
const writerSites = [];
for (const [f, a] of js) {
  if (/^(tests)\//.test(f)) continue;
  for (const w of a.writes) writerSites.push({ path: f, domain: byPath.get(f).primarySystem, scope: scopeOf(f), reach: byPath.get(f).runtimeReachability, ...w });
  for (const d of a.derivedWrites) writerSites.push({ path: f, domain: byPath.get(f).primarySystem, scope: scopeOf(f), reach: byPath.get(f).runtimeReachability, method: '(assign)', receiver: d.target, cls: 'system.derived', line: d.line });
}
const directDocWrites = writerSites.filter(w => w.scope === 'runtime' && ['actor-like', 'item-or-doc-like', 'Actor(class)', 'Item(class)', 'effect-doc', 'token-doc', 'combat-doc'].includes(w.cls) && ['update', 'setFlag', 'unsetFlag', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments', 'delete', 'create', 'updateDocuments', 'createDocuments', 'deleteDocuments'].includes(w.method));
const ACTOR_ENGINE_HOME = /^scripts\/governance\/actor-engine\//;
const writersByDomain = {};
for (const w of directDocWrites) {
  const k = w.domain; writersByDomain[k] = writersByDomain[k] || { sites: 0, files: new Set(), insideActorEngine: 0 };
  writersByDomain[k].sites++; writersByDomain[k].files.add(w.path); if (ACTOR_ENGINE_HOME.test(w.path)) writersByDomain[k].insideActorEngine++;
}
const chatOutsideSwseChat = [];
for (const [f, a] of js) if (a.chatCreates && scopeOf(f) === 'runtime' && f !== 'scripts/chat/swse-chat.js') chatOutsideSwseChat.push({ path: f, count: a.chatCreates, reach: byPath.get(f).runtimeReachability });

// ---------- mechanical-responsibility census ----------
// Function/method NAMES that implement a named SWSE responsibility. Name-based: an
// evidence lead for Phase 1/2, not proof that two sites compute the same thing.
const RESPONSIBILITIES = [
  ['defense-totals', /^(calc|calculate|compute|derive|build|recompute|get)\w*(defen[cs]es?|reflex|fortitude|willdefense)(totals?|scores?|values?|breakdown)?$/i],
  ['base-attack-bonus', /^(calc|calculate|compute|derive|get)\w*(bab|baseattack(bonus)?)$/i],
  ['hit-points-max', /^(calc|calculate|compute|derive|recompute|get)\w*(max(imum)?hp|hp(max|total)|hitpoints)$/i],
  ['damage-threshold', /damagethreshold/i],
  ['condition-track-penalty', /^(calc|calculate|compute|get|apply|resolve)\w*condition(track)?(penalty|step|modifier)s?$/i],
  ['skill-total', /^(calc|calculate|compute|derive|get)\w*skill(totals?|modifiers?|bonus(es)?|mods?)$/i],
  ['ability-modifier', /^(calc|calculate|compute|get|derive)?\w*abilitymod(ifier)?s?$/i],
  ['half-heroic-level', /halflevel|halfheroic/i],
  ['heroic-level', /^(calc|calculate|compute|get|derive)\w*(heroic|character|total)level$/i],
  ['damage-formula', /^(calc|calculate|compute|build|resolve|get)\w*damage(formula|roll|total|bonus|parts)?$/i],
  ['damage-reduction', /^(apply|compute|resolve|calc|get)\w*(damagereduction|shieldrating)$/i],
  ['damage-application', /^(apply|deal|resolve|process)\w*damage(packet|toactor|totarget)?$/i],
  ['attack-bonus', /^(calc|calculate|compute|build|get|resolve)\w*attack(bonus|modifier|total)s?$/i],
  ['critical-hit', /^(calc|compute|resolve|apply|get|is)\w*crit(ical)?(hit|range|multiplier|damage)?$/i],
  ['initiative', /^(calc|compute|get|roll)\w*initiative\w*$/i],
  ['grapple', /^(calc|compute|resolve|roll|get)\w*grapple\w*$/i],
  ['force-point-spend', /^(spend|use|deduct|consume|regain|restore|adjust)\w*forcepoints?$/i],
  ['dark-side-score', /^(add|increase|decrease|set|get|calc|compute|adjust)\w*darkside(score|points)?$/i],
  ['destiny-points', /^(spend|use|add|get|set|adjust)\w*destinypoints?$/i],
  ['credit-mutation', /^(add|spend|deduct|transfer|adjust|set|grant|charge|debit|credit|refund)\w*credits?$/i],
  ['price-computation', /^(calc|calculate|compute|get|resolve|derive)\w*(price|cost)s?$/i],
  ['encumbrance', /encumbrance|carry(ing)?capacity/i],
  ['speed-movement', /^(calc|calculate|compute|get|derive)\w*(speed|movement)s?$/i],
  ['xp-level', /^(calc|calculate|compute|get)\w*(xp|experience)(for|to)?(level|next)?\w*$/i],
  ['prerequisite-evaluation', /^(check|evaluate|meets|validate|assess|test)\w*prereq(uisite)?s?\w*$/i],
  ['feat-talent-grant', /^(grant|apply|add|award)\w*(feat|talent)s?(toactor)?$/i],
  ['modifier-aggregation', /^(aggregate|collect|sum|compute|resolve|gather)\w*modifiers?$/i],
  ['upgrade-slots', /^(calc|compute|get|count|resolve)\w*(upgrade)?slots?$/i],
  ['second-wind', /secondwind/i],
  ['size-modifier', /^(get|calc|compute)\w*size(mod|modifier|bonus)s?$/i],
  ['force-power-dc-or-roll', /^(roll|resolve|calc|compute|get)\w*(usetheforce|forcepower)(check|roll|dc|result)?$/i],
  ['skill-roll', /^roll\w*skill(check)?$/i],
  ['defense-bonus-armor', /^(calc|compute|get)\w*armor(bonus|check(penalty)?|defense)s?$/i],
];
const mechanics = [];
for (const [resp, re] of RESPONSIBILITIES) {
  const sites = [];
  for (const [f, a] of js) {
    if (scopeOf(f) !== 'runtime' || f.startsWith('tests/')) continue;
    const reach = byPath.get(f).runtimeReachability;
    for (const fn of a.fnNames) if (re.test(fn.name)) sites.push({ path: f, line: fn.line, name: fn.name, lines: fn.lines, domain: byPath.get(f).primarySystem, reachable: reach.startsWith('reachable') });
  }
  const reachable = sites.filter(s => s.reachable && s.lines >= 4);
  const domains = [...new Set(reachable.map(s => s.domain))].sort();
  mechanics.push({ responsibility: resp, pattern: String(re), sites: sites.length, reachableNonTrivialSites: reachable.length, reachableFiles: new Set(reachable.map(s => s.path)).size, domains, multiDomain: domains.length > 1, siteList: sites.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line) });
}

// ---------- baseline ----------
const countBy = (arr, k) => arr.reduce((o, x) => (o[k(x)] = (o[k(x)] || 0) + 1, o), {});
const runtimeEntries = registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && !/^tests\//.test(e.path) && !['node-script', 'node-tool'].includes(e.runtimeReachability));
const slocByDomain = {};
for (const e of registry) if (e.sloc != null) { const s = scopeOf(e.path) === 'runtime' ? 'runtime' : scopeOf(e.path); slocByDomain[e.primarySystem] = slocByDomain[e.primarySystem] || { runtime: 0, tool: 0, test: 0, runtimeFiles: 0 }; slocByDomain[e.primarySystem][s] += e.sloc; if (s === 'runtime') slocByDomain[e.primarySystem].runtimeFiles++; }
const sorted = o => Object.fromEntries(Object.entries(o).sort((a, b) => (typeof b[1] === 'number' ? b[1] - a[1] : 0) || a[0].localeCompare(b[0])));

const baseline = {
  schema: 'swse.architecture-census.baseline/1',
  auditedCommit: HEAD,
  generator: 'tools/architecture-census/build-census.mjs',
  parser: 'acorn ' + acorn.version,
  trackedFilesAtHead: ALL_TRACKED.length,
  censusExcludedSelfFiles: ALL_TRACKED.length - FILES.length,
  filesInventoried: FILES.length,
  filesByTopDirectory: sorted(countBy(registry, e => e.top)),
  filesByExtension: sorted(countBy(registry, e => e.ext)),
  filesByRole: sorted(countBy(registry, e => e.role)),
  filesByPrimarySystem: sorted(countBy(registry, e => e.primarySystem)),
  domainAssignmentBasis: sorted(countBy(registry, e => e.domainBasis)),
  bytesTotal: registry.reduce((s, e) => s + Math.max(0, e.bytes), 0),
  js: {
    filesAnalysed: js.size, parseErrors: registry.filter(e => e.parseError).map(e => ({ path: e.path, error: e.parseError })),
    runtimeModulesUnderScriptsOrIndex: registry.filter(e => e.imports && (e.path === 'index.js' || e.path.startsWith('scripts/'))).length,
    runtimeReachability: sorted(countBy(registry.filter(e => e.imports && (e.path === 'index.js' || e.path.startsWith('scripts/'))), e => e.runtimeReachability)),
    slocRuntime: runtimeEntries.reduce((s, e) => s + e.sloc, 0),
    slocAllJs: registry.reduce((s, e) => s + (e.sloc || 0), 0),
    slocByPrimarySystem: Object.fromEntries(Object.entries(slocByDomain).sort((a, b) => b[1].runtime - a[1].runtime)),
    importEdges: countBy(edges, e => e.kind),
    unresolvedImportSpecifiers: missingImports.length,
    unresolvedDynamicImportExpressions: dynUnresolved.length,
    dynamicImportPatterns: dynPatterns.length,
    externalImports: Object.fromEntries([...externalImports.entries()].sort((a, b) => b[1] - a[1])),
    staticImportCycles: cycles.length, filesInStaticCycles: cycles.reduce((s, c) => s + c.length, 0), largestCycle: cycles[0]?.length || 0,
    domainCycles: domainCycles.length,
    workers: [...js.values()].reduce((s, a) => s + a.workers, 0),
  },
  tests: { testFiles: TEST_FILES.length, ciRunTestFiles: CI_TESTS.size, nonCiTestFiles: TEST_FILES.length - CI_TESTS.size,
    runtimeModulesWithAnyTest: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && !e.path.startsWith('tests/') && (e.tests.direct.length || e.tests.transitiveCount)).length,
    runtimeModulesWithCiTest: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && !e.path.startsWith('tests/') && e.tests.ciTestCount > 0).length },
  templates: { hbs: registry.filter(e => e.ext === 'hbs').length, reachability: sorted(countBy(registry.filter(e => e.ext === 'hbs'), e => e.runtimeReachability)) },
  styles: { css: registry.filter(e => e.ext === 'css').length, manifestStyles: manifestStyles.size, reachability: sorted(countBy(registry.filter(e => e.ext === 'css'), e => e.runtimeReachability)) },
  assets: { files: registry.filter(e => e.role === 'asset').length, reachability: sorted(countBy(registry.filter(e => e.role === 'asset'), e => e.runtimeReachability)), bytesUnreferenced: registry.filter(e => e.role === 'asset' && e.runtimeReachability === 'unreferenced').reduce((s, e) => s + e.bytes, 0) },
  data: { files: registry.filter(e => e.top === 'data').length, auditEvidence: registry.filter(e => e.path.startsWith('data/audits/')).length, reachability: sorted(countBy(registry.filter(e => e.top === 'data'), e => e.runtimeReachability)) },
  packs: { files: registry.filter(e => e.top === 'packs').length, manifestPacks: manifestPacks.size, reachability: sorted(countBy(registry.filter(e => e.top === 'packs'), e => e.runtimeReachability)) },
  docs: { files: registry.filter(e => e.role === 'evidence-or-doc').length, withUncheckedItems: registry.filter(e => e.uncheckedItems).length, mentioningFoundryAcceptanceOrDeferral: registry.filter(e => e.mentionsFoundryAcceptanceOrDeferral).length },
  registrations: {
    hooksDistinct: hooks.length, hookListenerSites: hooks.reduce((s, h) => s + h.listeners, 0),
    settingsDistinct: settings.length, settingsRegisteredMoreThanOnce: settings.filter(s => s.sites.length > 1).length,
    sheetRegistrationCalls: registry.reduce((s, e) => s + (e.sheetRegistrations || 0), 0),
    handlebarsHelperRegistrations: registry.reduce((s, e) => s + (e.handlebarsHelpers || 0), 0),
    globalsAssignedDistinct: new Set(registry.flatMap(e => e.globalsAssigned || [])).size,
  },
  stateWrites: {
    runtimeDirectDocumentWriteSites: directDocWrites.length,
    runtimeDirectDocumentWriteFiles: new Set(directDocWrites.map(w => w.path)).size,
    sitesInsideActorEngineHome: directDocWrites.filter(w => ACTOR_ENGINE_HOME.test(w.path)).length,
    sitesInReachableFiles: directDocWrites.filter(w => w.reach.startsWith('reachable')).length,
    byDomain: Object.fromEntries(Object.entries(writersByDomain).map(([k, v]) => [k, { sites: v.sites, files: v.files.size }]).sort((a, b) => b[1].sites - a[1].sites)),
    actorEngineCallSitesRuntime: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime').reduce((s, e) => s + (e.actorEngineCalls || 0), 0),
    systemDerivedAssignmentSites: writerSites.filter(w => w.cls === 'system.derived' && w.scope === 'runtime').length,
    chatMessageCreateOutsideSwseChat: chatOutsideSwseChat.reduce((s, x) => s + x.count, 0),
  },
  complexity: {
    duplicateExportedSymbolNames: duplicateSymbols.length,
    exactFunctionCloneGroups: { runtime: exactClones.filter(c => c.sites.some(s => scopeOf(s.path) === 'runtime')).length, all: exactClones.length },
    structuralFunctionCloneGroups: { runtime: structClones.filter(c => c.sites.filter(s => scopeOf(s.path) === 'runtime').length > 1).length, all: structClones.length },
    reachableModulesWithUnusedNamedExports: unusedExports.length,
    unusedNamedExports: unusedExports.reduce((s, x) => s + x.unusedNamedExports.length, 0),
    compatPatchModules: registry.filter(e => e.role === 'compat-patch').length,
    migrationModules: registry.filter(e => e.imports && e.role === 'migration' && scopeOf(e.path) === 'runtime').length,
    runtimeFilesWithDeprecatedMarkers: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && e.markers?.deprecated).length,
    runtimeFilesWithLegacyMarkers: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && e.markers?.legacy).length,
    runtimeFilesWithCompatMarkers: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && e.markers?.compat).length,
    runtimeFilesOver1500Sloc: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime' && e.sloc > 1500).map(e => ({ path: e.path, sloc: e.sloc })).sort((a, b) => b.sloc - a.sloc),
    todoMarkersRuntime: registry.filter(e => e.imports && scopeOf(e.path) === 'runtime').reduce((s, e) => s + (e.markers?.todo || 0), 0),
  },
};

// ---------- write outputs ----------
const outputs = new Map();
const put = (name, obj) => outputs.set(name, JSON.stringify(obj, null, 1) + '\n');
put('census-baseline.json', baseline);
put('taxonomy.json', { schema: 'swse.architecture-census.taxonomy/1', auditedCommit: HEAD, note: 'Directory and vocabulary rules live in tools/architecture-census/taxonomy.mjs. Domain = intended (location/vocabulary) ownership; responsibility-level authority is assigned in Phase 1.', domains: Object.fromEntries(Object.entries(DOMAINS).map(([k, v]) => [k, { ...v, files: domainCounts[k] || 0, runtimeSloc: slocByDomain[k]?.runtime || 0, runtimeFiles: slocByDomain[k]?.runtimeFiles || 0 }])) });
// registry split by top-level dir (scripts further split by second segment group)
const shard = e => {
  if (e.top !== 'scripts') return e.top === '(root)' ? 'root' : e.top.replace(/^\./, '');
  const s = e.path.split('/')[1];
  if (s === 'engine') { const t = e.path.split('/')[2]; return ['progression', 'combat', 'suggestion', 'feats'].includes(t) ? `scripts-engine-${t}` : 'scripts-engine-other'; }
  if (s === 'apps') return e.path.startsWith('scripts/apps/progression-framework/') ? 'scripts-apps-progression-framework' : 'scripts-apps-other';
  return ['generation', 'ui', 'domain', 'sheets', 'governance', 'holonet'].includes(s) ? `scripts-${s}` : 'scripts-other';
};
const shards = {};
for (const e of registry) (shards[shard(e)] = shards[shard(e)] || []).push(e);
for (const [k, v] of Object.entries(shards)) put(`registry/${k}.json`, { schema: 'swse.architecture-census.registry/1', auditedCommit: HEAD, shard: k, count: v.length, files: v });
put('registry/index.json', { schema: 'swse.architecture-census.registry-index/1', auditedCommit: HEAD, total: registry.length, shards: Object.fromEntries(Object.entries(shards).map(([k, v]) => [k, v.length])) });
put('import-graph.json', { schema: 'swse.architecture-census.import-graph/1', auditedCommit: HEAD, edgeCount: edges.length, edges: edges.map(e => [e.from, e.to, e.kind]), unresolvedImports: missingImports, dynamicImportPatterns: dynPatterns, unresolvedDynamicImports: dynUnresolved, domainEdges: sorted(domEdges), domainCycles, staticImportCycles: cycles });
put('reachability.json', { schema: 'swse.architecture-census.reachability/1', auditedCommit: HEAD, roots: RUNTIME_ROOTS, method: 'BFS over resolved static/re-export/dynamic imports from system.json esmodules; template-literal dynamic imports expanded as glob patterns from reachable importers; non-JS files reached via manifest entries or path strings in runtime referrers (JS reachable from index.js, templates, styles, packs, lang, non-audit data, system.json/template.json). Zero static importers is NOT treated as proof of dead code.',
  runtimeScripts: Object.fromEntries(Object.entries(countBy(registry.filter(e => e.imports && (e.path === 'index.js' || e.path.startsWith('scripts/'))), e => e.runtimeReachability))),
  unreferencedRuntimeScripts: registry.filter(e => e.imports && e.path.startsWith('scripts/') && ['orphan-unreferenced', 'unreachable-importers-only', 'test-only-import', 'tool-only-import', 'string-referenced-only'].includes(e.runtimeReachability)).map(e => ({ path: e.path, reach: e.runtimeReachability, confidence: e.unreachableConfidence, sloc: e.sloc, domain: e.primarySystem, importers: e.consumers, tests: e.tests.direct.length, markers: e.markers })),
  patternReached: Object.fromEntries([...patternReach.entries()]),
  templates: registry.filter(e => e.ext === 'hbs' && !e.runtimeReachability.startsWith('runtime') && e.runtimeReachability !== 'manifest-style').map(e => ({ path: e.path, reach: e.runtimeReachability, referencedBy: e.referencedBy })),
  styles: registry.filter(e => e.ext === 'css' && !['manifest-style', 'runtime-referenced'].includes(e.runtimeReachability)).map(e => ({ path: e.path, reach: e.runtimeReachability, referencedBy: e.referencedBy })),
  assetsUnreferenced: registry.filter(e => e.role === 'asset' && ['unreferenced', 'doc-or-data-referenced-only'].includes(e.runtimeReachability)).map(e => ({ path: e.path, bytes: e.bytes, reach: e.runtimeReachability })),
  dataNotRuntimeReferenced: registry.filter(e => e.top === 'data' && !e.path.startsWith('data/audits/') && !['runtime-referenced', 'runtime-pattern-referenced'].includes(e.runtimeReachability)).map(e => ({ path: e.path, bytes: e.bytes, reach: e.runtimeReachability, referencedBy: e.referencedBy?.slice(0, 5) })),
  packsUndeclared: registry.filter(e => e.top === 'packs' && e.runtimeReachability === 'pack-undeclared').map(e => e.path),
  manifestPacksWithoutSource: [...manifestPacks.keys()].filter(p => !FILESET.has(p + '.db') && !FILES.some(f => f.startsWith(p + '/'))),
});
put('state-writers.json', { schema: 'swse.architecture-census.state-writers/1', auditedCommit: HEAD, method: 'acorn CallExpression on member methods {update,setFlag,unsetFlag,*EmbeddedDocuments,delete,create,toMessage,...} and assignments to *.system.derived.*; receiver classified by expression text (heuristic: see receiverClass in build-census.mjs). Classification is an evidence lead, not a proof of the receiver type.',
  summary: baseline.stateWrites, actorEngineHome: 'scripts/governance/actor-engine/', chatMessageCreateOutsideSwseChat: chatOutsideSwseChat,
  sites: writerSites.filter(w => w.scope === 'runtime').map(w => [w.path, w.line, w.method, w.cls, w.receiver, w.domain, w.reach]),
  siteColumns: ['path', 'line', 'method', 'receiverClass', 'receiverExpr', 'domain', 'reachability'] });
put('registrations.json', { schema: 'swse.architecture-census.registrations/1', auditedCommit: HEAD, hooks, settings,
  sheets: [...js.entries()].flatMap(([f, a]) => a.sheets.map(s => ({ path: f, ...s }))),
  globals: Object.entries(registry.reduce((o, e) => { for (const g of e.globalsAssigned || []) (o[g] = o[g] || []).push(e.path); return o; }, {})).map(([g, files]) => ({ global: g, files })).sort((a, b) => b.files.length - a.files.length),
  sockets: [...js.entries()].flatMap(([f, a]) => a.sockets.map(s => ({ path: f, channel: s }))) });
put('duplication.json', { schema: 'swse.architecture-census.duplication/1', auditedCommit: HEAD, method: `functions with block bodies >= ${FN_MIN_LINES} lines and >= 120 tokens; exact = identical token stream; structural = identical after renaming identifiers/literals.`,
  exactFunctionClones: exactClones.map(c => ({ ...c, scopes: [...new Set(c.sites.map(s => scopeOf(s.path)))] })),
  structuralFunctionClones: structClones.slice(0, 400).map(c => ({ ...c, scopes: [...new Set(c.sites.map(s => scopeOf(s.path)))] })),
  structuralFunctionClonesTotal: structClones.length,
  duplicateSymbolNames: duplicateSymbols, unusedNamedExports: unusedExports });

put('mechanical-authority-census.json', { schema: 'swse.architecture-census.mechanics/1', auditedCommit: HEAD, method: 'Runtime (non-tool, non-test) function/method/arrow names matched against a responsibility vocabulary. reachableNonTrivialSites counts definitions >= 4 lines in index.js-reachable files. A multi-domain responsibility is a duplicate-authority CANDIDATE to be verified in Phase 2, not a finding.', responsibilities: mechanics });

const coverage = {
  schema: 'swse.architecture-census.coverage/1', auditedCommit: HEAD,
  trackedFilesAtHead: ALL_TRACKED.length, excludedCensusSelfFiles: SELF_PREFIXES, inventoried: registry.length,
  everyFileHasPrimarySystem: registry.every(e => e.primarySystem && DOMAINS[e.primarySystem]),
  everyFileHasRole: registry.every(e => e.role), everyFileHasReachability: registry.every(e => e.runtimeReachability),
  missingFromRegistry: FILES.filter(f => !byPath.has(f)), duplicateIds: registry.length - new Set(registry.map(e => e.id)).size,
  verificationLevels: sorted(countBy(registry, e => e.verification)),
  lowConfidenceDomainAssignments: registry.filter(e => e.domainBasis === 'fallback').length,
};
put('coverage.json', coverage);

if (CHECK) {
  let bad = 0;
  for (const [name, text] of outputs) { const p = path.join(OUT, name); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.error('stale:', name); bad++; } }
  console.log(bad ? `${bad} output(s) stale` : 'census outputs up to date');
  process.exit(bad ? 1 : 0);
}
fs.mkdirSync(path.join(OUT, 'registry'), { recursive: true });
for (const [name, text] of outputs) fs.writeFileSync(path.join(OUT, name), text);
console.log(JSON.stringify({ head: HEAD, inventoried: registry.length, outputs: outputs.size, coverageOk: coverage.everyFileHasPrimarySystem && !coverage.missingFromRegistry.length }, null, 1));
