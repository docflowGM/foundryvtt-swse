// SWSEChat has no postMessage(); a call throws a TypeError, in the reaction engine AFTER a paid reaction had completed (slice 6Y).
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = new URL('../', import.meta.url).pathname;
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); const s = statSync(p); if (s.isDirectory()) { if (e !== 'node_modules') walk(p, out); } else if (p.endsWith('.js')) out.push(p); } return out; };
const chat = readFileSync(join(root, 'scripts/chat/swse-chat.js'), 'utf8');
assert.doesNotMatch(chat, /static\s+(async\s+)?postMessage\s*\(/, 'if SWSEChat gains postMessage, revisit this guard');
const offenders = walk(join(root, 'scripts')).filter((f) => /SWSEChat\.postMessage\s*\(/.test(readFileSync(f, 'utf8'))).map((f) => relative(root, f));
assert.deepEqual(offenders, [], `calls to the nonexistent SWSEChat.postMessage: ${offenders.join(', ')}`);
console.log('swse-chat-no-phantom-postmessage: 2 checks passed');
