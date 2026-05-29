#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const scanned = [
  'scripts/ui/shell',
  'scripts/apps/gm-datapad.js',
  'scripts/sheets/v2/character-sheet.js'
];

const ignoredSegments = [
  `${path.sep}scripts${path.sep}scripts${path.sep}`,
  `${path.sep}node_modules${path.sep}`
];

const assignmentPattern = /_shellSurfaceOptions\s*=/;
const directRenderFalsePattern = /render\??\.?\(false\)/;
const documentMutationPattern = /\.(?:update|setFlag|unsetFlag)\s*\(/;
const settingsMutationPattern = /(?:game\.settings\.set|SettingsHelper\.set|HouseRuleService\.set|ThemeManager\.setTheme)\s*\(/;

function walk(entry) {
  const absolute = path.resolve(root, entry);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  const out = [];
  for (const child of fs.readdirSync(absolute)) {
    const next = path.join(absolute, child);
    const nextStat = fs.statSync(next);
    if (nextStat.isDirectory()) out.push(...walk(path.relative(root, next)));
    else out.push(next);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function isIgnored(file) {
  return ignoredSegments.some(segment => file.includes(segment));
}

function context(lines, index, radius = 5) {
  return lines.slice(Math.max(0, index - radius), Math.min(lines.length, index + radius + 1)).join('\n');
}

function isControllerOrHost(file) {
  const r = rel(file);
  return r === 'scripts/apps/gm-datapad.js'
    || r === 'scripts/sheets/v2/character-sheet.js'
    || /Controller\.js$/.test(r)
    || r === 'scripts/ui/shell/ShellHost.js'
    || r === 'scripts/ui/shell/ShellRouter.js'
    || r === 'scripts/ui/shell/ShellSurfaceRegistry.js';
}

function allowedSurfaceOptionsAssignment(file, line) {
  const r = rel(file);
  if (r === 'scripts/ui/shell/ShellHost.js' && line.includes('ShellMutationGuard.withSurfaceOptionsMutation')) return true;
  if (r === 'scripts/sheets/v2/character-sheet.js' && line.includes('ShellMutationGuard.withSurfaceOptionsMutation')) return true;
  if (line.includes('ShellMutationGuard.install')) return true;
  if (r === 'scripts/ui/shell/ShellMutationGuard.js') return true;
  // Initial constructor value before guard installation is acceptable.
  if ((r === 'scripts/sheets/v2/character-sheet.js' || r === 'scripts/apps/gm-datapad.js') && line.includes('_shellSurfaceOptions = {};')) return true;
  // Class field declaration in the mixin is acceptable.
  if (r === 'scripts/ui/shell/ShellHost.js' && line.trim() === '_shellSurfaceOptions = {};') return true;
  return false;
}

function allowedRenderFalse(file, line) {
  const r = rel(file);
  if (line.trim().startsWith('*') || line.trim().startsWith('//')) return true;
  if (r === 'scripts/ui/shell/ShellMutationGuard.js') return true;
  if (r === 'scripts/ui/shell/request-shell-render.js') return true;
  if (line.includes('ShellMutationGuard.withSurfaceRender')) return true;
  if (line.includes('requestSurfaceRender')) return true;
  if (r === 'scripts/ui/shell/ShellRouter.js' && line.includes('requestSurfaceRender')) return true;
  // Optional fallbacks are non-ideal but intentionally permitted outside strict mode.
  if (!strict && line.includes('??') && line.includes('requestSurfaceRender')) return true;
  return false;
}

function allowedDocumentOrSettingsMutation(file, line, lines, index) {
  const r = rel(file);
  if (!isControllerOrHost(file)) return true;
  if (r === 'scripts/ui/shell/ShellMutationGuard.js') return true;
  if (r === 'scripts/ui/shell/mutate-and-repaint.js') return true;
  if (line.trim().startsWith('*') || line.trim().startsWith('//')) return true;
  if (line.includes('@mutation-exception')) return true;

  const localContext = context(lines, index, 6);
  return localContext.includes('mutateAndRepaint')
    || localContext.includes('mutateShellOnly')
    || localContext.includes('this._mutate')
    || localContext.includes('ShellMutationGuard.withDocumentMutation')
    || localContext.includes('ActorEngine.')
    || localContext.includes('requestShellRender(');
}

const files = [...new Set(scanned.flatMap(walk))]
  .filter(file => /\.(?:js|mjs)$/.test(file))
  .filter(file => !isIgnored(file));

const violations = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (assignmentPattern.test(line) && !allowedSurfaceOptionsAssignment(file, line)) {
      violations.push({ type: 'direct-surface-options-assignment', file: rel(file), line: index + 1, text: line.trim() });
    }
    if (directRenderFalsePattern.test(line) && !allowedRenderFalse(file, line)) {
      violations.push({ type: 'direct-render-false', file: rel(file), line: index + 1, text: line.trim() });
    }
    if ((documentMutationPattern.test(line) || settingsMutationPattern.test(line)) && !allowedDocumentOrSettingsMutation(file, line, lines, index)) {
      violations.push({ type: 'uncoordinated-document-or-settings-mutation', file: rel(file), line: index + 1, text: line.trim() });
    }
  });
}

if (violations.length) {
  console.error('\nSWSE shell mutation contract violations found:');
  for (const violation of violations) {
    console.error(`- ${violation.type}: ${violation.file}:${violation.line}`);
    console.error(`  ${violation.text}`);
  }
  console.error('\nUse patchSurfaceState/patchSurfaceOptions for shell state, mutateAndRepaint/mutateShellOnly for shell-originated document/settings writes, and requestSurfaceRender for repaint.');
  if (!strict) {
    console.error('Run with --strict to also reject requestSurfaceRender ?? render(false) fallbacks.');
  }
  process.exit(1);
}

console.log(`SWSE shell mutation contract check passed (${files.length} files scanned${strict ? ', strict mode' : ''}).`);
