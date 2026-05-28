/** GM approvals surface view-model. */

import { GameSessionStore } from '/systems/foundryvtt-swse/scripts/games/game-session-store.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

const EMPTY = '—';

function numberOrNull(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function displayNumber(value) {
  const numeric = numberOrNull(value);
  return numeric === null ? EMPTY : numeric.toLocaleString();
}

function displayCredits(value) {
  const numeric = numberOrNull(value);
  return numeric === null ? '0 cr' : `${numeric.toLocaleString()} cr`;
}

function safeGet(object, path, fallback = undefined) {
  try {
    if (globalThis.foundry?.utils?.getProperty) {
      const value = foundry.utils.getProperty(object, path);
      return value === undefined || value === null || value === '' ? fallback : value;
    }
  } catch (_err) {
    // Fall through to local path reader.
  }

  const value = String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => current?.[key], object);
  return value === undefined || value === null || value === '' ? fallback : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function summarizeItemNames(items, type) {
  return asArray(items)
    .filter((item) => !type || item?.type === type)
    .map((item) => item?.name)
    .filter(Boolean);
}

function makeReadonlyRow(label, value, extra = {}) {
  return {
    label,
    value: value === undefined || value === null || value === '' ? EMPTY : value,
    editable: false,
    ...extra
  };
}

function makeEditableRow(label, value, inputName, inputType = 'text', extra = {}) {
  const renderedValue = value === undefined || value === null || value === '' ? '' : value;
  return {
    label,
    value: renderedValue,
    displayValue: renderedValue === '' ? EMPTY : renderedValue,
    inputName,
    inputType,
    editable: true,
    ...extra
  };
}

function makeTextAreaRow(label, value, inputName, extra = {}) {
  const renderedValue = value === undefined || value === null ? '' : String(value);
  return {
    label,
    value: renderedValue,
    displayValue: renderedValue === '' ? EMPTY : renderedValue,
    inputName,
    inputType: 'textarea',
    editable: true,
    ...extra
  };
}

function actorDefense(actor, key) {
  return safeGet(actor, `system.defenses.${key}.total`,
    safeGet(actor, `system.derived.defenses.${key}.total`,
      safeGet(actor, `system.defenses.${key}.base`, EMPTY)));
}

function buildWeaponRows(actor, draftData = {}) {
  const actorWeapons = summarizeItemNames(actor?.items?.contents ?? actor?.items, 'weapon');
  const draftWeapons = asArray(draftData?.weapons).map((weapon) => weapon?.name ?? weapon).filter(Boolean);
  const names = actorWeapons.length ? actorWeapons : draftWeapons;

  if (!names.length) return [makeTextAreaRow('Weapons', '', 'metadata.weaponsSummary', { wide: true, placeholder: 'No listed weapons. Add notes or weapon summary here.' })];

  return [makeTextAreaRow('Weapons', names.join('\n'), 'metadata.weaponsSummary', { wide: true, placeholder: 'One weapon per line, or summarize arcs/damage here.' })];
}

function buildSystemSummary(droidSystems = {}) {
  const parts = [];
  if (droidSystems.locomotion?.name) parts.push(`Locomotion: ${droidSystems.locomotion.name}`);
  if (droidSystems.processor?.name) parts.push(`Processor: ${droidSystems.processor.name}`);
  if (droidSystems.armor?.name) parts.push(`Armor: ${droidSystems.armor.name}`);
  if (asArray(droidSystems.appendages).length) parts.push(`Appendages: ${asArray(droidSystems.appendages).map(item => item?.name ?? item?.id ?? 'Appendage').join(', ')}`);
  if (asArray(droidSystems.sensors).length) parts.push(`Sensors: ${asArray(droidSystems.sensors).map(item => item?.name ?? item?.id ?? 'Sensor').join(', ')}`);
  if (asArray(droidSystems.accessories).length) parts.push(`Accessories: ${asArray(droidSystems.accessories).map(item => item?.name ?? item?.id ?? 'Accessory').join(', ')}`);
  return parts.join('\n');
}

function buildGenericActorCategories({ actor, approval, sourceType }) {
  const system = actor?.system ?? {};
  const draftData = approval?.draftData ?? {};
  const droidSystems = system.droidSystems ?? draftData.droidSystems ?? {};
  const ownerActor = approval?.ownerActorId ? game.actors.get(approval.ownerActorId) : null;
  const currentCredits = numberOrNull(ownerActor?.system?.credits) ?? 0;
  const approvalCost = approval?.costCredits ?? droidSystems?.credits?.spent ?? droidSystems?.totalCost ?? draftData?.cost ?? 0;
  const afterCredits = Math.max(0, currentCredits - (numberOrNull(approvalCost) ?? 0));
  const requestType = approval?.type ?? actor?.type ?? 'asset';
  const isDroid = requestType === 'droid' || actor?.type === 'droid' || !!system.droidSystems;
  const isVehicle = requestType === 'vehicle' || requestType === 'starship' || actor?.type === 'vehicle';

  const categories = [
    {
      id: 'identity',
      label: 'Identity',
      icon: 'fa-solid fa-id-card',
      rows: [
        makeEditableRow('Name', actor?.name ?? draftData?.name ?? 'Unnamed Asset', 'name'),
        makeReadonlyRow('Type', isDroid ? 'Droid' : isVehicle ? 'Starship / Vehicle' : requestType),
        makeReadonlyRow('Requested For', ownerActor?.name ?? approval?.ownerActorName ?? 'Unknown'),
        makeReadonlyRow('Draft Actor', actor?.name ?? 'No draft actor linked')
      ]
    },
    {
      id: 'cost',
      label: 'Cost & Ledger',
      icon: 'fa-solid fa-coins',
      rows: [
        makeReadonlyRow('Current Credits', displayCredits(currentCredits)),
        makeEditableRow('Approved Cost', approvalCost, 'costCredits', 'number', { suffix: 'cr' }),
        makeReadonlyRow('Credits After', displayCredits(afterCredits)),
        makeReadonlyRow('Submitted', approval?.timeSubmitted ?? (approval?.requestedAt ? new Date(approval.requestedAt).toLocaleString() : EMPTY))
      ]
    },
    {
      id: 'durability',
      label: 'Defenses & Durability',
      icon: 'fa-solid fa-shield-halved',
      rows: [
        makeEditableRow('HP Max', safeGet(actor, 'system.hp.max', safeGet(actor, 'system.hp.value', '')), 'system.hp.max', 'number'),
        makeEditableRow('Damage Reduction', safeGet(actor, 'system.damageReduction', safeGet(actor, 'system.dr', '')), 'system.damageReduction', 'number'),
        makeEditableRow('Shield Rating', safeGet(actor, 'system.shields.rating', safeGet(actor, 'system.shieldRating', '')), 'system.shields.rating', 'number'),
        makeEditableRow('Reflex', actorDefense(actor, 'reflex'), 'system.defenses.reflex.total', 'number'),
        makeEditableRow('Fortitude', actorDefense(actor, 'fortitude'), 'system.defenses.fortitude.total', 'number'),
        makeEditableRow('Will', actorDefense(actor, 'will'), 'system.defenses.will.total', 'number')
      ]
    }
  ];

  if (isVehicle) {
    categories.push({
      id: 'movement',
      label: 'Movement & Capacity',
      icon: 'fa-solid fa-gauge-high',
      rows: [
        makeEditableRow('Speed', safeGet(actor, 'system.speed', draftData?.speed ?? ''), 'system.speed'),
        makeEditableRow('Hyperdrive', safeGet(actor, 'system.hyperdrive', safeGet(actor, 'system.hyperdrive_class', '')), 'system.hyperdrive'),
        makeEditableRow('Crew', safeGet(actor, 'system.crew', draftData?.crew ?? ''), 'system.crew'),
        makeEditableRow('Passengers', safeGet(actor, 'system.passengers', draftData?.passengers ?? ''), 'system.passengers'),
        makeEditableRow('Cargo', safeGet(actor, 'system.cargo', draftData?.cargo ?? ''), 'system.cargo')
      ]
    });
  }

  if (isDroid) {
    categories.push({
      id: 'droid-systems',
      label: 'Droid Systems',
      icon: 'fa-solid fa-robot',
      rows: [
        makeEditableRow('Degree', droidSystems.degree ?? '', 'system.droidSystems.degree'),
        makeEditableRow('Size', droidSystems.size ?? '', 'system.droidSystems.size'),
        makeEditableRow('Locomotion', droidSystems.locomotion?.name ?? '', 'system.droidSystems.locomotion.name'),
        makeEditableRow('Processor', droidSystems.processor?.name ?? '', 'system.droidSystems.processor.name'),
        makeEditableRow('Armor', droidSystems.armor?.name ?? '', 'system.droidSystems.armor.name'),
        makeTextAreaRow('Installed Systems', buildSystemSummary(droidSystems), 'metadata.systemsSummary', { wide: true, placeholder: 'Summarize appendages, sensors, accessories, and GM restrictions.' })
      ]
    });
  }

  categories.push({
    id: 'weapons',
    label: 'Weapons & Equipment',
    icon: 'fa-solid fa-crosshairs',
    rows: buildWeaponRows(actor, draftData)
  });

  categories.push({
    id: 'notes',
    label: 'GM Notes & Restrictions',
    icon: 'fa-solid fa-clipboard-list',
    rows: [
      ...(draftData?.details ? [makeReadonlyRow('Request Details', draftData.details, { wide: true })] : []),
      makeTextAreaRow('Approval Notes', approval?.metadata?.gmNotes ?? draftData?.notes ?? '', 'metadata.gmNotes', { wide: true, placeholder: 'Restrictions, assignment notes, changed loadout, local availability, etc.' })
    ]
  });

  return categories.map((category) => ({
    ...category,
    rows: category.rows.map((row) => ({
      ...row,
      fieldId: row.inputName ? `${sourceType}-${category.id}-${row.inputName}`.replace(/[^a-zA-Z0-9_-]/g, '-') : null,
      originalValue: row.value ?? row.displayValue ?? ''
    }))
  }));
}



function buildFactionSuggestionRequest(row) {
  const record = row.record ?? {};
  const categories = [
    {
      id: 'faction-request',
      label: 'Faction Suggestion',
      icon: 'fa-solid fa-people-arrows',
      rows: [
        makeEditableRow('Faction Name', record.name ?? record.factionName ?? 'Suggested Faction', 'name'),
        makeEditableRow('Type', record.type ?? 'Faction', 'type'),
        makeEditableRow('Planet', record.planet ?? '', 'planet'),
        makeEditableRow('System', record.system ?? '', 'system'),
        makeEditableRow('Relationship', record.relationshipType ?? 'known', 'relationshipType'),
        makeTextAreaRow('Player Notes', record.notes ?? '', 'notes', { wide: true })
      ]
    },
    {
      id: 'gm-governance',
      label: 'GM Governance',
      icon: 'fa-solid fa-scale-balanced',
      rows: [
        makeEditableRow('Starting Score', record.score ?? 0, 'score', 'number'),
        makeTextAreaRow('Benefits', record.benefits ?? '', 'benefits', { wide: true, placeholder: 'GM-assessed benefits or consequences.' }),
        makeTextAreaRow('GM Notes', record.gmNotes ?? '', 'gmNotes', { wide: true, placeholder: 'Private governance notes.' })
      ]
    }
  ].map((category) => ({
    ...category,
    rows: category.rows.map((field) => ({
      ...field,
      fieldId: field.inputName ? `faction-suggestion-${category.id}-${field.inputName}`.replace(/[^a-zA-Z0-9_-]/g, '-') : null,
      originalValue: field.value ?? field.displayValue ?? ''
    }))
  }));

  return {
    key: `faction:${row.actorId}:${record.id}`,
    sourceType: 'faction-suggestion',
    actorId: row.actorId,
    factionRecordId: record.id,
    type: 'faction-suggestion',
    typeLabel: 'Faction Suggestion Review',
    title: record.name ?? record.factionName ?? 'Suggested Faction',
    subtitle: `${row.actorName} · ${record.type ?? 'Faction'} · pending approval`,
    ownerLabel: row.actorName,
    costLabel: 'Faction Standing',
    submittedLabel: record.updatedAt ? new Date(record.updatedAt).toLocaleString() : (record.createdAt ? new Date(record.createdAt).toLocaleString() : EMPTY),
    icon: 'fa-solid fa-people-arrows',
    tone: 'faction',
    categories,
    warnings: []
  };
}

function buildGameSettlementRequest(session) {
  const credits = session?.escrow?.credits ?? {};
  const isTableBalanceSettlement = credits.payoutMode === 'table-credit-balances' && credits.payoutBalances && typeof credits.payoutBalances === 'object';
  const payoutBalances = isTableBalanceSettlement ? credits.payoutBalances : {};
  const payoutPolicies = asArray(credits.payoutPolicies);
  const policy = credits.policy ?? payoutPolicies[0]?.policy ?? {};
  const requested = numberOrNull(credits.payoutRequested)
    ?? (isTableBalanceSettlement ? Object.values(payoutBalances).reduce((sum, value) => sum + (numberOrNull(value) ?? 0), 0) : (numberOrNull(credits.pot) ?? 0));
  const recommended = numberOrNull(policy.recommendedPayout ?? credits.payoutApproved)
    ?? (isTableBalanceSettlement
      ? payoutPolicies.reduce((sum, entry) => sum + (numberOrNull(entry?.policy?.approvedPayout ?? entry?.requestedPayout) ?? 0), 0)
      : requested);
  const winnerSeat = asArray(session?.seats).find((seat) => seat?.seatId === credits.winnerSeatId) ?? null;
  const winnerActor = winnerSeat?.actorId ? game.actors.get(winnerSeat.actorId) : null;
  const recipientRows = isTableBalanceSettlement
    ? Object.entries(payoutBalances)
      .filter(([_seatId, amount]) => (numberOrNull(amount) ?? 0) > 0)
      .map(([seatId, amount]) => {
        const seat = asArray(session?.seats).find((entry) => entry?.seatId === seatId) ?? null;
        const actor = seat?.actorId ? game.actors.get(seat.actorId) : null;
        return { seatId, seat, actor, amount: numberOrNull(amount) ?? 0 };
      })
    : [];
  const submitted = credits.pendingSettlementAt ? new Date(credits.pendingSettlementAt).toLocaleString() : EMPTY;
  const settlementLabel = isTableBalanceSettlement ? 'Table-Credit Cash-Out' : 'Winner Payout';
  const recipientSummary = isTableBalanceSettlement
    ? (recipientRows.length ? recipientRows.map((row) => `${row.seat?.displayName ?? row.seatId}: ${displayCredits(row.amount)}`).join('; ') : 'No positive table-credit balances')
    : (winnerSeat?.displayName ?? 'Unknown');
  const categories = [
    {
      id: 'game-result',
      label: 'Game Result',
      icon: 'fa-solid fa-dice',
      rows: [
        makeReadonlyRow('Game', session?.title ?? 'Game Table'),
        makeReadonlyRow('Mode', session?.rulesMode === 'wagered' ? 'Wagered Credits' : 'Practice / Non-wagered'),
        makeReadonlyRow('Settlement Type', settlementLabel),
        makeReadonlyRow(isTableBalanceSettlement ? 'Recipients' : 'Winner', recipientSummary, { wide: isTableBalanceSettlement }),
        ...(isTableBalanceSettlement ? [] : [makeReadonlyRow('Winner Actor', winnerActor?.name ?? 'No actor-backed wallet')]),
        makeReadonlyRow('Requested Payout', displayCredits(requested)),
        makeReadonlyRow('Policy', policy.message ?? credits.settlementMessage ?? 'GM settlement required', { wide: true })
      ]
    },
    {
      id: 'settlement',
      label: 'GM Settlement',
      icon: 'fa-solid fa-scale-balanced',
      rows: [
        makeEditableRow(isTableBalanceSettlement ? 'Approved Total' : 'Approved Payout', recommended, 'approvedPayout', 'number', { suffix: 'cr' }),
        makeTextAreaRow('GM Reason', credits.settlementMessage ?? '', 'metadata.gmSettlementReason', { wide: true, placeholder: 'Explain the approved, capped, voided, or adjusted campaign payout.' })
      ]
    }
  ].map((category) => ({
    ...category,
    rows: category.rows.map((row) => ({
      ...row,
      fieldId: row.inputName ? `game-settlement-${category.id}-${row.inputName}`.replace(/[^a-zA-Z0-9_-]/g, '-') : null,
      originalValue: row.value ?? row.displayValue ?? ''
    }))
  }));

  const missingActorWarnings = isTableBalanceSettlement
    ? recipientRows
      .filter((row) => !row.actor && !['ai', 'npc'].includes(String(row.seat?.type || '').toLowerCase()) && !row.seat?.aiProfile)
      .map((row) => `${row.seat?.displayName ?? row.seatId} does not have an actor-backed wallet.`)
    : (winnerActor ? [] : ['Winner does not have an actor-backed wallet. Approval cannot pay credits until fixed.']);

  return {
    key: `game:${session.id}`,
    sourceType: 'game-settlement',
    sessionId: session.id,
    type: 'game-settlement',
    typeLabel: isTableBalanceSettlement ? 'Game Cash-Out Review' : 'Game Payout Review',
    title: session?.title ?? 'Pending Game Settlement',
    subtitle: `${isTableBalanceSettlement ? 'Table balances' : (winnerSeat?.displayName ?? 'Unknown winner')} · requested ${displayCredits(requested)}`,
    ownerLabel: isTableBalanceSettlement ? 'Multiple recipients' : (winnerSeat?.displayName ?? 'Unknown'),
    costLabel: displayCredits(requested),
    submittedLabel: submitted,
    icon: 'fa-solid fa-dice-d20',
    tone: 'game',
    categories,
    warnings: [
      ...missingActorWarnings,
      ...(requested <= 0 ? ['No requested payout is recorded.'] : []),
      ...(policy?.caps?.effectiveCap ? [`Automated cap was ${displayCredits(policy.caps.effectiveCap)}.`] : [])
    ]
  };
}

function buildDroidActorRequest(pendingDroid) {
  const actor = game.actors.get(pendingDroid.actorId);
  const droidSystems = actor?.system?.droidSystems ?? {};
  const approval = {
    type: 'droid',
    ownerActorName: pendingDroid.ownerName,
    requestedAt: droidSystems.buildHistory?.[0]?.timestamp,
    timeSubmitted: pendingDroid.createdAt,
    costCredits: droidSystems.credits?.spent ?? droidSystems.totalCost ?? pendingDroid.cost ?? 0,
    draftData: { name: actor?.name ?? pendingDroid.actorName, droidSystems }
  };
  const cost = numberOrNull(approval.costCredits) ?? 0;
  const categories = buildGenericActorCategories({ actor, approval, sourceType: 'pending-droid' });

  return {
    key: `droid:${pendingDroid.actorId}`,
    sourceType: 'pending-droid',
    actorId: pendingDroid.actorId,
    requestIndex: null,
    type: 'droid',
    typeLabel: 'Droid Acquisition Review',
    title: actor?.name ?? pendingDroid.actorName ?? 'Pending Droid',
    subtitle: `${pendingDroid.degree ?? 'Unknown degree'} · ${pendingDroid.size ?? 'Medium'} · ${displayCredits(cost)}`,
    ownerLabel: pendingDroid.ownerName ?? 'Unknown',
    costLabel: displayCredits(cost),
    submittedLabel: pendingDroid.createdAt ?? EMPTY,
    icon: 'fa-solid fa-robot',
    tone: 'droid',
    categories,
    warnings: [
      ...(actor ? [] : ['Draft droid actor could not be found.']),
      ...(cost <= 0 ? ['No credit cost recorded for this droid.'] : [])
    ]
  };
}


function buildStoreItemApprovalRequest(approval, index) {
  const ownerActor = game.actors.get(approval.ownerActorId) ?? null;
  const submitted = approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : approval.timeSubmitted ?? EMPTY;
  const items = asArray(approval.approvalItems);
  const cost = numberOrNull(approval.costCredits) ?? items.reduce((sum, item) => sum + (numberOrNull(item?.finalCost ?? item?.cost) ?? 0), 0);
  const currentCredits = numberOrNull(ownerActor?.system?.credits) ?? 0;
  const itemSummary = items.length
    ? items.map((item) => `${item.name ?? 'Store item'} (${displayCredits(item.finalCost ?? item.cost ?? 0)})`).join('\n')
    : (approval.draftData?.details ?? 'No item detail recorded.');
  const categories = [
    {
      id: 'request',
      label: 'Store Request',
      icon: 'fa-solid fa-store',
      rows: [
        makeReadonlyRow('Requested For', ownerActor?.name ?? approval.ownerActorName ?? 'Unknown'),
        makeReadonlyRow('Items', itemSummary, { wide: true }),
        makeReadonlyRow('Submitted', submitted),
        makeReadonlyRow('Policy', 'GM approval required before purchase')
      ]
    },
    {
      id: 'cost',
      label: 'Cost & Ledger',
      icon: 'fa-solid fa-coins',
      rows: [
        makeReadonlyRow('Current Credits', displayCredits(currentCredits)),
        makeEditableRow('Approved Cost', cost, 'costCredits', 'number', { suffix: 'cr' }),
        makeReadonlyRow('Credits After', displayCredits(Math.max(0, currentCredits - cost)))
      ]
    },
    {
      id: 'notes',
      label: 'GM Notes',
      icon: 'fa-solid fa-clipboard-list',
      rows: [
        makeTextAreaRow('Approval Notes', approval?.metadata?.gmNotes ?? '', 'metadata.gmNotes', { wide: true, placeholder: 'Reason, restrictions, altered price, or sourcing note.' })
      ]
    }
  ].map((category) => ({
    ...category,
    rows: category.rows.map((row) => ({
      ...row,
      fieldId: row.inputName ? `store-item-${category.id}-${row.inputName}`.replace(/[^a-zA-Z0-9_-]/g, '-') : null,
      originalValue: row.value ?? row.displayValue ?? ''
    }))
  }));

  return {
    key: `custom:${index}`,
    sourceType: 'store-item-approval',
    actorId: ownerActor?.id ?? null,
    requestIndex: index,
    type: 'store-item',
    typeLabel: 'Store Purchase Review',
    title: approval.draftData?.name ?? (items.length === 1 ? items[0].name : `${items.length} store items`),
    subtitle: `${ownerActor?.name ?? approval.ownerActorName ?? 'Unknown'} · ${displayCredits(cost)}`,
    ownerLabel: ownerActor?.name ?? approval.ownerActorName ?? 'Unknown',
    costLabel: displayCredits(cost),
    submittedLabel: submitted,
    icon: 'fa-solid fa-cart-shopping',
    tone: 'store',
    categories,
    warnings: [
      ...(ownerActor ? [] : ['Owner actor could not be found. Approval cannot deduct credits until fixed.']),
      ...(ownerActor && currentCredits < cost ? [`${ownerActor.name} has ${displayCredits(currentCredits)} but this request costs ${displayCredits(cost)}.`] : []),
      ...(items.length ? [] : ['No approval item payload is recorded.'])
    ]
  };
}

function buildStoreApprovalRequest(approval, index) {
  if (approval?.type === 'store-item' || approval?.approvalKind === 'store-policy-item') return buildStoreItemApprovalRequest(approval, index);

  const draftActor = game.actors.get(approval.draftActorId) ?? null;
  const ownerActor = game.actors.get(approval.ownerActorId) ?? null;
  const type = approval.type === 'vehicle' ? 'starship' : (approval.type || draftActor?.type || 'custom');
  const isDroid = type === 'droid';
  const isShip = type === 'starship' || type === 'vehicle';
  const submitted = approval.requestedAt ? new Date(approval.requestedAt).toLocaleString() : approval.timeSubmitted ?? EMPTY;
  const cost = numberOrNull(approval.costCredits) ?? 0;
  const currentCredits = numberOrNull(ownerActor?.system?.credits) ?? 0;
  const categories = buildGenericActorCategories({ actor: draftActor, approval: { ...approval, ownerActorName: ownerActor?.name ?? approval.ownerActorName, timeSubmitted: submitted }, sourceType: 'store-custom' });
  const warnings = [];

  if (!draftActor) warnings.push('No draft actor is linked to this request. Inline edits will update approval metadata only.');
  if (!ownerActor) warnings.push('Owner actor could not be found. Approval cannot deduct credits until fixed.');
  if (ownerActor && currentCredits < cost) warnings.push(`${ownerActor.name} has ${displayCredits(currentCredits)} but this request costs ${displayCredits(cost)}.`);

  return {
    key: `custom:${index}`,
    sourceType: 'store-custom',
    actorId: draftActor?.id ?? null,
    requestIndex: index,
    type,
    typeLabel: isDroid ? 'Droid Acquisition Review' : isShip ? 'Starship Acquisition Review' : 'GM Approval Review',
    title: draftActor?.name ?? approval.draftData?.name ?? 'Custom Asset',
    subtitle: `${ownerActor?.name ?? approval.ownerActorName ?? 'Unknown'} · ${displayCredits(cost)}`,
    ownerLabel: ownerActor?.name ?? approval.ownerActorName ?? 'Unknown',
    costLabel: displayCredits(cost),
    submittedLabel: submitted,
    icon: isDroid ? 'fa-solid fa-robot' : isShip ? 'fa-solid fa-rocket' : 'fa-solid fa-clipboard-check',
    tone: isDroid ? 'droid' : isShip ? 'vehicle' : 'generic',
    categories,
    warnings
  };
}

export class GMApprovalsSurfaceService {
  static async buildViewModel(host) {
    await host._loadPendingDroids();
    await host._loadStorePendingApprovals();

    const droidRequests = host.pendingDroids.map((pending) => buildDroidActorRequest(pending));
    const storeRequests = host.storeApprovals.map((approval, index) => buildStoreApprovalRequest(approval, index));
    const gameRequests = GameSessionStore.getAllSessions()
      .filter((session) => session?.escrow?.credits?.status === 'pending-gm-settlement')
      .map((session) => buildGameSettlementRequest(session));
    const factionRequests = FactionRegistryService.getPendingSuggestions().map((row) => buildFactionSuggestionRequest(row));
    const approvalRequests = [...gameRequests, ...droidRequests, ...storeRequests, ...factionRequests];

    if (!approvalRequests.some((request) => request.key === host.selectedApprovalKey)) {
      host.selectedApprovalKey = approvalRequests[0]?.key ?? null;
      host.approvalEditMode = false;
      host.approvalDenyMode = false;
    }

    const selectedApproval = approvalRequests.find((request) => request.key === host.selectedApprovalKey) ?? approvalRequests[0] ?? null;
    const hasRequests = approvalRequests.length > 0;

    return {
      pageTitle: 'Approvals',
      pageDescription: 'Review game payout settlements, ship and droid acquisition packets, approve unchanged, approve with inline edits, or deny with a player-facing reason.',
      pendingDroids: host.pendingDroids,
      storeApprovals: host.storeApprovals,
      hasPendingDroids: host.pendingDroids.length > 0,
      hasPendingApprovals: host.storeApprovals.length > 0,
      approvalRequests,
      selectedApproval,
      hasApprovalRequests: hasRequests,
      approvalEditMode: !!host.approvalEditMode,
      approvalDenyMode: !!host.approvalDenyMode,
      approvalQueueCounts: {
        total: approvalRequests.length,
        games: approvalRequests.filter((request) => request.type === 'game-settlement').length,
        droids: approvalRequests.filter((request) => request.type === 'droid').length,
        ships: approvalRequests.filter((request) => request.type === 'starship' || request.type === 'vehicle').length,
        storeItems: approvalRequests.filter((request) => request.type === 'store-item').length,
        factions: approvalRequests.filter((request) => request.type === 'faction-suggestion').length
      }
    };
  }
}
