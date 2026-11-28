import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRulesModeCards, creditBuyInDisabledReason, economyLine } from '../scripts/games/game-rules-modes.js';
const sabacc = { id: 'sabacc', title: 'Sabacc', supportsCreditWagers: true };
const base = { enabled: true, allowWagers: false, allowCreditWagers: false, maxCreditWager: 100 };
let [practice, credit] = buildRulesModeCards({ settings: base, selectedGame: sabacc });
assert.equal(practice.shortTitle, 'Practice Table'); assert.match(practice.description, /virtual table chips/); assert.doesNotMatch(practice.description, /No betting/);
assert.equal(practice.id, 'republic-senate', 'engine contract id unchanged'); assert.equal(credit.id, 'wagered');
assert.equal(credit.enabled, false); assert.match(credit.disabledReason, /Allow Wagers/);
[, credit] = buildRulesModeCards({ settings: { ...base, allowWagers: true }, selectedGame: sabacc });
assert.match(credit.disabledReason, /Allow Credit Wagers/);
[, credit] = buildRulesModeCards({ settings: { ...base, allowWagers: true, allowCreditWagers: true }, selectedGame: sabacc });
assert.equal(credit.enabled, true); assert.equal(credit.disabledReason, '');
[, credit] = buildRulesModeCards({ settings: { ...base, allowWagers: true, allowCreditWagers: true }, selectedGame: { id: 'dejarik', title: 'Dejarik', supportsCreditWagers: false } });
assert.equal(credit.enabled, false); assert.match(credit.disabledReason, /does not support credit buy-ins/);
[practice] = buildRulesModeCards({ settings: { ...base, enabled: false }, selectedGame: sabacc });
assert.equal(practice.enabled, false); assert.match(practice.disabledReason, /turned off/);
// a game without in-game betting keeps the original wording
[practice] = buildRulesModeCards({ settings: base, selectedGame: { id: 'pazaak', title: 'Pazaak', supportsCreditWagers: true } });
assert.equal(practice.shortTitle, 'Republic Senate'); assert.match(practice.description, /No betting/);
assert.equal(creditBuyInDisabledReason({ ...base, allowWagers: true, allowCreditWagers: true }, sabacc), '');
// economy line never calls practice chips campaign credits (or vice versa)
assert.match(economyLine('sabacc', { enabled: false }), /Practice chips/); assert.match(economyLine('hintaro', { enabled: true }), /Campaign credits/);
assert.equal(economyLine('pazaak', {}), null);
// wiring
const svc = readFileSync('scripts/ui/shell/GamesSurfaceService.js', 'utf8');
assert.match(svc, /modeCards: buildRulesModeCards\(/); assert.match(svc, /economyLine\('sabacc', GameCreditEscrowService\.describe\(session\)\)/);
assert.match(readFileSync('templates/shell/partials/games/session-composer.hbs', 'utf8'), /swse-games-mode-reason/);
console.log('games rules modes: ok');
