import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js', 'utf8');
const hbs = readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs', 'utf8');
// UI-17: no silent swallow; failure is logged with the vehicle id, flagged to the template, and never fabricates a browser
assert.doesNotMatch(src, /catch \(_err\) \{ vehicleSystemsBrowser = null; \}/, 'the silent catch is gone');
assert.match(src, /VEHICLE_SYSTEMS_BROWSER_FAILED/); assert.match(src, /systems browser failed for \$\{actor\?\.id/);
assert.match(src, /vehicleSystemsBrowserUnavailable: Boolean\(vehicleSystemsBrowserError\)/);
const catchBlock = src.slice(src.indexOf('} catch (err) {', src.indexOf('buildVehicleSystemsBrowser({ actor')), src.indexOf('const ', src.indexOf('systems browser failed')));
assert.match(catchBlock, /vehicleSystemsBrowser = null;/, 'no fabricated fallback browser');
assert.match(hbs, /\{\{#if vehicleSystemsBrowserUnavailable\}\}[\s\S]*?role="status"[\s\S]*?unavailable/);
assert.doesNotMatch(hbs.match(/vehicleSystemsBrowserUnavailable[\s\S]{0,260}/)[0], /stack|\{\{err/i, 'players never see error details');
console.log('vehicle systems browser error visibility: ok');
