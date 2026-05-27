/** GM approvals surface view-model. */

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

function buildStoreApprovalRequest(approval, index) {
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
    const approvalRequests = [...droidRequests, ...storeRequests];

    if (!approvalRequests.some((request) => request.key === host.selectedApprovalKey)) {
      host.selectedApprovalKey = approvalRequests[0]?.key ?? null;
      host.approvalEditMode = false;
      host.approvalDenyMode = false;
    }

    const selectedApproval = approvalRequests.find((request) => request.key === host.selectedApprovalKey) ?? approvalRequests[0] ?? null;
    const hasRequests = approvalRequests.length > 0;
    let approvalHistory = [];
    try {
      approvalHistory = game.settings.get('foundryvtt-swse', 'gmApprovalHistory') ?? [];
    } catch (_err) {
      approvalHistory = [];
    }
    const approvalHistoryViews = asArray(approvalHistory).slice(0, 12).map((entry) => ({
      ...entry,
      atLabel: entry.at ? new Date(entry.at).toLocaleString() : EMPTY,
      decisionLabel: String(entry.decision || '').replace(/\w/g, (letter) => letter.toUpperCase()),
      costLabel: displayCredits(entry.cost ?? 0),
      title: entry.title || 'Approval request'
    }));

    return {
      pageTitle: 'Approvals',
      pageDescription: 'Review ship and droid acquisition packets, approve unchanged, approve with inline edits, or deny with a player-facing reason.',
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
        droids: approvalRequests.filter((request) => request.type === 'droid').length,
        ships: approvalRequests.filter((request) => request.type === 'starship' || request.type === 'vehicle').length
      },
      approvalHistory: approvalHistoryViews,
      hasApprovalHistory: approvalHistoryViews.length > 0
    };
  }
}
