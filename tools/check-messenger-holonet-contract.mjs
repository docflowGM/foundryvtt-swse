#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const strict = process.argv.includes('--strict');

function read(relPath) {
  const abs = path.resolve(root, relPath);
  if (!fs.existsSync(abs)) throw new Error(`Missing required file: ${relPath}`);
  return fs.readFileSync(abs, 'utf8');
}

function has(text, pattern) {
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
}

const files = {
  messengerService: 'scripts/holonet/subsystems/holonet-messenger-service.js',
  notificationBridge: 'scripts/holonet/subsystems/messenger-notification-bridge.js',
  maintenanceService: 'scripts/holonet/subsystems/messenger-maintenance-service.js',
  socketService: 'scripts/holonet/subsystems/holonet-socket-service.js',
  noticeCenter: 'scripts/holonet/subsystems/holonet-notice-center-service.js',
  engine: 'scripts/holonet/holonet-engine.js',
  controller: 'scripts/ui/shell/MessengerSurfaceController.js',
  shellHost: 'scripts/ui/shell/ShellHost.js',
  characterSheet: 'scripts/sheets/v2/character-sheet.js',
  template: 'templates/shell/partials/surface-messenger.hbs',
  drawer: 'templates/shell/partials/shell-drawer-layer.hbs',
  index: 'scripts/holonet/index.js'
};

const contents = Object.fromEntries(Object.entries(files).map(([key, relPath]) => [key, read(relPath)]));

const checks = [
  ['messenger createGameInvite API', 'messengerService', /static\s+async\s+createGameInvite\s*\(/],
  ['messenger GM createGameInvite API', 'messengerService', /static\s+async\s+_gmCreateGameInvite\s*\(/],
  ['messenger threadAction has accept game invite', 'messengerService', /accept-game-invite/],
  ['messenger threadAction has decline game invite', 'messengerService', /decline-game-invite/],
  ['messenger threadAction has cancel game invite', 'messengerService', /cancel-game-invite/],
  ['messenger read sync emits socket sync', 'messengerService', /emitSync\(payload\)/],
  ['messenger notification bridge class', 'notificationBridge', /class\s+MessengerNotificationBridge/],
  ['notification bridge action routing', 'notificationBridge', /routeOptionsForRecord/],
  ['notification bridge muted filtering', 'notificationBridge', /filterMutedRecords/],
  ['notice center muted filtering uses bridge', 'noticeCenter', /filterMutedRecords/],
  ['engine local messenger notification hook', 'engine', /notifyLocalMessengerRecord/],
  ['socket create-game-invite handling', 'socketService', /create-game-invite/],
  ['controller class exists', 'controller', /class\s+MessengerSurfaceController/],
  ['controller wires load older messages', 'controller', /load-older-messages/],
  ['controller debounced thread filters', 'controller', /_scheduleThreadFilterRefresh/],
  ['controller delayed read timer', 'controller', /setTimeout[\s\S]*1200/],
  ['ShellHost delegates to MessengerSurfaceController', 'shellHost', /MessengerSurfaceController/],
  ['ShellHost no longer imports composer assist', 'shellHost', text => !text.includes('HolonetComposerAssist')],
  ['character sheet delegates messenger controller', 'characterSheet', /MessengerSurfaceController/],
  ['template has thread search', 'template', /name="threadSearch"/],
  ['template has archived toggle', 'template', /name="includeArchived"/],
  ['template has load older control', 'template', /load-older-messages/],
  ['template has game invite cards', 'template', /gameInvite/],
  ['template has job objective controls', 'template', /job-objective-status/],
  ['drawer can open source thread', 'drawer', /data-holonet-thread-id/],
  ['maintenance service class exists', 'maintenanceService', /class\s+MessengerMaintenanceService/],
  ['maintenance audit exists', 'maintenanceService', /static\s+async\s+audit\s*\(/],
  ['maintenance prune exists', 'maintenanceService', /static\s+async\s+pruneThreadMessages\s*\(/],
  ['maintenance compact exists', 'maintenanceService', /static\s+async\s+compact\s*\(/],
  ['Holonet index exports maintenance', 'index', /MessengerMaintenanceService/]
];

const failures = [];
for (const [label, key, pattern] of checks) {
  const text = contents[key];
  const ok = typeof pattern === 'function' ? pattern(text) : has(text, pattern);
  if (!ok) failures.push(`${label} (${files[key]})`);
}

if (strict) {
  const strictChecks = [
    ['MessengerService facade exposes auditStorage', 'messengerService', /static\s+async\s+auditStorage\s*\(/],
    ['MessengerService facade exposes pruneMessages', 'messengerService', /static\s+async\s+pruneMessages\s*\(/],
    ['HolonetEngine exposes messenger maintenance getter', 'engine', /get\s+messengerMaintenance\s*\(/],
    ['HolonetEngine exposes auditMessengerStorage', 'engine', /static\s+async\s+auditMessengerStorage\s*\(/]
  ];
  for (const [label, key, pattern] of strictChecks) {
    if (!has(contents[key], pattern)) failures.push(`${label} (${files[key]})`);
  }
}

if (failures.length) {
  console.error('SWSE Messenger/Holonet contract violations found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SWSE Messenger/Holonet contract check passed (${checks.length}${strict ? ' + strict' : ''} checks).`);
