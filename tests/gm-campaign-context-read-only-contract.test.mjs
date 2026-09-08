import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Datapad ecosystem redesign — Phase 6: static proof that
// GMCampaignContextService is genuinely read-only, per its own explicit
// design contract (Phase 6N/6AK) — it may READ any authority, but must
// never call a mutation method on any of them. This is deliberately a
// source-text scan rather than a mock-call-count test: the whole point is
// that NO mutation call site should exist at all, so scanning the text is
// the strongest possible proof (a runtime test could only prove the paths
// it happened to exercise).

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('scripts/ui/shell/gm/GMCampaignContextService.js', root), 'utf8');

const forbidden = [
  /game\.settings\.set\(/,
  /\.update\(/,
  /\.create\(/,
  /\.delete\(/,
  /LocationRegistryService\.(upsert|save|link|create|delete|remove)/,
  /FactionRegistryService\.(upsert|save|create|delete|remove)/,
  /HolonetIntelService\.(create|update|archive|destroy|deliver|release|mark|force)/,
  /HolonetStorage\.(save|delete|create)/,
  /SkillChallengeStore\.(save|set|create|update|delete)/,
  /TransactionEngine\./,
  /GameSessionStore\.(save|set|create|update|delete)/
];

for (const pattern of forbidden) {
  assert.doesNotMatch(source, pattern, `GMCampaignContextService must never call a mutation method matching ${pattern}`);
}

assert.match(source, /export class GMCampaignContextService/);
// Every public method name the Phase 6 contract requires must exist.
for (const method of ['party', 'forLocation', 'forFaction', 'forJob', 'forIntel', 'forActor', 'attentionItems']) {
  assert.match(source, new RegExp(`static async ${method}\\(`), `GMCampaignContextService must implement ${method}()`);
}

console.log('GMCampaignContextService read-only contract passed (no mutation call site found; every required method present).');
