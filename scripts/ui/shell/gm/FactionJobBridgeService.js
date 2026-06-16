/**
 * FactionJobBridgeService
 *
 * Thin adapter between the GM Faction Registry and the existing Job Board wizard.
 * It does not create jobs directly; it only produces normalized draft/prefill data
 * that the Job Board/Holonet flow can consume.
 */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

function text(value, fallback = '') {
  return String(value ?? fallback ?? '').trim();
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function slug(value) {
  const raw = text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return raw || Math.random().toString(36).slice(2);
}

function optionLabel(parts = []) {
  return parts.map(part => text(part)).filter(Boolean).join(' — ');
}

function defaultsFor(record = {}, fallback = {}) {
  const source = record?.jobDefaults && typeof record.jobDefaults === 'object'
    ? { ...record.jobDefaults, ...record }
    : record || {};
  const fallbackSource = fallback?.jobDefaults && typeof fallback.jobDefaults === 'object'
    ? { ...fallback.jobDefaults, ...fallback }
    : fallback || {};
  return {
    tone: text(source.defaultJobTone || source.tone || fallbackSource.defaultJobTone || fallbackSource.tone),
    rewardStyle: text(source.defaultRewardStyle || source.rewardStyle || fallbackSource.defaultRewardStyle || fallbackSource.rewardStyle),
    objective: text(source.defaultObjective || source.objective || fallbackSource.defaultObjective || fallbackSource.objective),
    briefing: text(source.defaultBriefing || source.briefing || fallbackSource.defaultBriefing || fallbackSource.briefing),
    instructions: text(source.defaultInstructions || source.instructions || fallbackSource.defaultInstructions || fallbackSource.instructions),
    credits: number(source.defaultCredits ?? source.credits ?? fallbackSource.defaultCredits ?? fallbackSource.credits ?? 0, 0),
    xp: number(source.defaultXp ?? source.xp ?? fallbackSource.defaultXp ?? fallbackSource.xp ?? 0, 0),
    successDelta: number(source.defaultSuccessDelta ?? source.successDelta ?? fallbackSource.defaultSuccessDelta ?? fallbackSource.successDelta ?? 1, 1),
    failureDelta: number(source.defaultFailureDelta ?? source.failureDelta ?? fallbackSource.defaultFailureDelta ?? fallbackSource.failureDelta ?? -1, -1),
    visibility: text(source.defaultVisibility || source.visibility || fallbackSource.defaultVisibility || fallbackSource.visibility || 'posted'),
    legality: text(source.defaultLegality || source.legality || fallbackSource.defaultLegality || fallbackSource.legality),
    payStyle: text(source.defaultPayStyle || source.payStyle || fallbackSource.defaultPayStyle || fallbackSource.payStyle),
    rivalFactionName: text(source.defaultRivalFactionName || source.rivalFactionName || source.rivalFaction || fallbackSource.defaultRivalFactionName || fallbackSource.rivalFactionName || fallbackSource.rivalFaction),
    rivalSuccessDelta: number(source.defaultRivalSuccessDelta ?? source.rivalSuccessDelta ?? fallbackSource.defaultRivalSuccessDelta ?? fallbackSource.rivalSuccessDelta ?? -1, -1),
    rivalFailureDelta: number(source.defaultRivalFailureDelta ?? source.rivalFailureDelta ?? fallbackSource.defaultRivalFailureDelta ?? fallbackSource.rivalFailureDelta ?? 1, 1),
    consequenceNotes: text(source.defaultConsequenceNotes || source.consequenceNotes || fallbackSource.defaultConsequenceNotes || fallbackSource.consequenceNotes)
  };
}


function isReusableJobContact(contact = {}) {
  const tags = Array.isArray(contact?.tags) ? contact.tags.map(tag => text(tag).toLowerCase()) : [];
  const description = text(contact?.description || contact?.notes).toLowerCase();
  const defaults = defaultsFor(contact);
  return Boolean(
    tags.includes('job-board')
    || tags.includes('reusable-contact')
    || tags.includes('saved-contact')
    || description.includes('reusable job board contact')
    || contact?.reusableJobContact === true
    || contact?.saveForReuse === true
    || defaults.objective
    || defaults.briefing
    || defaults.instructions
    || defaults.credits
    || defaults.xp
  );
}

function optionTone(group = '') {
  const normalized = text(group).toLowerCase();
  if (normalized.includes('saved')) return 'saved';
  if (normalized.includes('npc') || normalized.includes('contact')) return 'contact';
  if (normalized.includes('faction')) return 'faction';
  if (normalized.includes('previous')) return 'previous';
  return 'default';
}

function briefingWithContext(base = '', { tone = '', rewardStyle = '', legality = '', payStyle = '' } = {}) {
  const lines = [text(base)];
  const tags = [];
  if (tone) tags.push(`Tone: ${tone}`);
  if (rewardStyle) tags.push(`Reward style: ${rewardStyle}`);
  if (payStyle) tags.push(`Pay style: ${payStyle}`);
  if (legality) tags.push(`Legality: ${legality}`);
  if (tags.length) lines.push(tags.join(' · '));
  return lines.filter(Boolean).join('\n\n');
}

function consequencePayload({ factionName = '', successDelta = 0, failureDelta = 0, notes = '', rivalFactionName = '', rivalSuccessDelta = -1, rivalFailureDelta = 1, consequenceNotes = '' } = {}) {
  const primaryName = text(factionName);
  const rivalName = text(rivalFactionName);
  const payload = {
    factionName: primaryName,
    successDelta: number(successDelta, 0),
    failureDelta: number(failureDelta, 0),
    notes: text(consequenceNotes || notes)
  };
  const extra = [];
  if (rivalName && rivalName.toLowerCase() !== primaryName.toLowerCase()) {
    extra.push({
      type: 'rival',
      factionName: rivalName,
      successDelta: number(rivalSuccessDelta, -1),
      failureDelta: number(rivalFailureDelta, 1),
      notes: text(consequenceNotes || `Rival consequence from ${primaryName || 'job issuer'}.`)
    });
  }
  if (extra.length) payload.additionalConsequences = extra;
  return payload;
}

export class FactionJobBridgeService {
  static buildDraftFromFaction(factionOrId) {
    const faction = typeof factionOrId === 'object'
      ? factionOrId
      : FactionRegistryService.findFaction(factionOrId);
    if (!faction) return null;
    const name = text(faction.name, 'Faction');
    const image = text(faction.image || faction.sigil || '');
    const defaults = defaultsFor(faction);
    const objective = defaults.objective || `Complete the ${name} objective`;
    const briefing = defaults.briefing || text(faction.notes || faction.benefits || `A representative of ${name} has posted a new contract.`);
    return this._normalizeDraft({
      source: 'faction-registry',
      issuer: {
        type: 'faction',
        source: 'faction-registry',
        factionId: text(faction.id),
        factionName: name,
        name,
        image
      },
      client: {
        type: 'faction',
        name,
        factionName: name,
        imageUrl: image
      },
      title: `${name} Contract`,
      primaryObjective: objective,
      briefing: briefingWithContext(briefing, defaults),
      instructions: defaults.instructions,
      primaryCredits: defaults.credits,
      primaryXp: defaults.xp,
      status: defaults.visibility,
      factionConsequences: consequencePayload({
        factionName: name,
        successDelta: defaults.successDelta,
        failureDelta: defaults.failureDelta,
        notes: `Issued by ${name}.`,
        rivalFactionName: defaults.rivalFactionName,
        rivalSuccessDelta: defaults.rivalSuccessDelta,
        rivalFailureDelta: defaults.rivalFailureDelta,
        consequenceNotes: defaults.consequenceNotes
      })
    });
  }

  static buildDraftFromContact(factionOrId, contactOrId) {
    const faction = typeof factionOrId === 'object'
      ? factionOrId
      : FactionRegistryService.findFaction(factionOrId);
    if (!faction) return null;
    const contacts = Array.isArray(faction.contacts) ? faction.contacts : [];
    const contact = typeof contactOrId === 'object'
      ? contactOrId
      : contacts.find(entry => entry.id === contactOrId || entry.name === contactOrId);
    if (!contact) return this.buildDraftFromFaction(faction);
    const factionName = text(faction.name, 'Faction');
    const contactName = text(contact.name, 'Faction Contact');
    const contactRole = text(contact.role || contact.title || 'Contact');
    const image = text(contact.image || faction.image || faction.sigil || '');
    const defaults = defaultsFor(contact, faction);
    const objective = defaults.objective || `Complete ${contactName}'s objective`;
    const briefing = defaults.briefing || text(contact.description || faction.notes || `${contactName}, ${contactRole} for ${factionName}, has posted a new contract.`);
    return this._normalizeDraft({
      source: 'faction-contact',
      issuer: {
        type: 'faction-contact',
        source: 'faction-registry',
        factionId: text(faction.id),
        factionName,
        contactId: text(contact.id),
        contactName,
        contactRole,
        contactActorId: text(contact.actorId),
        contactActorUuid: text(contact.actorUuid),
        contactActorName: text(contact.actorName),
        name: contactName,
        image
      },
      client: {
        type: 'npc',
        name: contactName,
        factionName,
        imageUrl: image,
        notes: contactRole,
        actorId: text(contact.actorId),
        actorUuid: text(contact.actorUuid)
      },
      title: `${factionName}: ${contactName} Contract`,
      primaryObjective: objective,
      briefing: briefingWithContext(briefing, defaults),
      instructions: defaults.instructions,
      primaryCredits: defaults.credits,
      primaryXp: defaults.xp,
      status: defaults.visibility,
      factionConsequences: consequencePayload({
        factionName,
        successDelta: defaults.successDelta,
        failureDelta: defaults.failureDelta,
        notes: `Issued by ${contactName} on behalf of ${factionName}.`,
        rivalFactionName: defaults.rivalFactionName,
        rivalSuccessDelta: defaults.rivalSuccessDelta,
        rivalFailureDelta: defaults.rivalFailureDelta,
        consequenceNotes: defaults.consequenceNotes
      })
    });
  }

  static buildDraftFromPreviousClient(job = {}) {
    const client = job?.client || {};
    const issuer = job?.issuer || {};
    const name = text(issuer.contactName || issuer.name || client.name || job.contactLabel || 'Previous Client');
    const factionName = text(issuer.factionName || client.factionName || '');
    if (!name && !factionName) return null;
    const image = text(issuer.image || client.imageUrl || client.avatar || '');
    return this._normalizeDraft({
      source: 'previous-client',
      issuer: {
        type: text(issuer.type || (factionName ? 'previous-client' : client.type) || 'previous-client'),
        source: 'job-history',
        factionId: text(issuer.factionId),
        factionName,
        contactId: text(issuer.contactId),
        contactName: text(issuer.contactName || (factionName && name !== factionName ? name : '')),
        contactRole: text(issuer.contactRole || client.notes || ''),
        name,
        image
      },
      client: {
        type: text(client.type || 'npc'),
        name,
        factionName,
        imageUrl: image,
        notes: text(client.notes || issuer.contactRole || '')
      },
      title: factionName ? `${factionName} Contract` : `${name} Contract`,
      primaryObjective: 'Complete the client objective',
      briefing: `A known client, ${name}${factionName ? ` of ${factionName}` : ''}, has another contract available.`,
      factionConsequences: {
        factionName,
        successDelta: factionName ? 1 : 0,
        failureDelta: factionName ? -1 : 0,
        notes: factionName ? `Issued by ${name}.` : ''
      }
    });
  }

  static buildKnownIssuerOptions({ jobs = [] } = {}) {
    const options = [];
    const seen = new Set();
    const add = (key, label, group, draft, metadata = {}) => {
      if (!key || seen.has(key) || !draft) return;
      seen.add(key);
      options.push({
        key,
        label,
        group,
        tone: optionTone(group),
        draft,
        isSavedContact: metadata.isSavedContact === true,
        contactId: text(metadata.contactId || draft?.issuer?.contactId),
        factionId: text(metadata.factionId || draft?.issuer?.factionId),
        factionName: text(metadata.factionName || draft?.issuer?.factionName || draft?.client?.factionName),
        role: text(metadata.role || draft?.issuer?.contactRole || draft?.client?.notes),
        image: text(metadata.image || draft?.issuer?.image || draft?.client?.imageUrl),
        summary: text(metadata.summary || draft?.briefing || draft?.primaryObjective),
        source: text(metadata.source || draft?.source)
      });
    };

    for (const faction of FactionRegistryService.getRegistry()) {
      add(`faction:${faction.id}`, faction.name, 'Known Factions', this.buildDraftFromFaction(faction), {
        factionId: faction.id,
        factionName: faction.name,
        image: faction.image || faction.sigil || '',
        source: 'faction-registry'
      });
      for (const contact of Array.isArray(faction.contacts) ? faction.contacts : []) {
        if (contact?.active === false) continue;
        const draft = this.buildDraftFromContact(faction, contact);
        add(`contact:${faction.id}:${contact.id}`, optionLabel([faction.name, contact.name]), 'Known NPCs / Contacts', draft, {
          contactId: contact.id,
          factionId: faction.id,
          factionName: faction.name,
          role: contact.role || contact.title,
          image: contact.image || faction.image || faction.sigil || '',
          isSavedContact: isReusableJobContact(contact),
          source: isReusableJobContact(contact) ? 'saved-job-contact' : 'faction-contact'
        });
      }
    }

    for (const job of Array.isArray(jobs) ? jobs : []) {
      const draft = this.buildDraftFromPreviousClient(job?.rawJob || job);
      if (!draft) continue;
      const key = `previous:${slug(`${draft.client.name}-${draft.client.factionName}`)}`;
      add(key, optionLabel([draft.client.factionName, draft.client.name]) || draft.client.name, 'Previous Job Clients', draft, {
        isSavedContact: Boolean(draft?.client?.saveForReuse),
        source: 'job-history'
      });
    }

    return options.sort((a, b) => a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
  }

  static buildSavedContactOptions({ jobs = [] } = {}) {
    const options = this.buildKnownIssuerOptions({ jobs })
      .filter(option => option.isSavedContact || option.group === 'Previous Job Clients')
      .map(option => ({
        ...option,
        title: option.label,
        subtitle: option.factionName && !option.label.includes(option.factionName) ? option.factionName : option.role,
        hasImage: Boolean(option.image),
        summary: option.summary || option.draft?.primaryObjective || 'Reusable client profile for the contract wizard.'
      }));
    return options.slice(0, 24);
  }


  static normalizeJobIssuer(jobOrCard = {}) {
    const rawJob = jobOrCard?.rawJob || jobOrCard?.metadata?.job || jobOrCard;
    const issuer = rawJob?.issuer || jobOrCard?.issuer || {};
    const client = rawJob?.client || jobOrCard?.client || {};
    const consequences = rawJob?.factionConsequences || {};
    const factionName = text(issuer.factionName || client.factionName || consequences.factionName || jobOrCard?.factionName);
    const contactName = text(issuer.contactName || (issuer.type === 'faction-contact' ? issuer.name : '') || (client.name && client.name !== factionName ? client.name : '') || jobOrCard?.issuerContactName);
    const name = text(issuer.name || contactName || client.name || factionName || jobOrCard?.clientLabel || 'Issuer');
    return {
      type: text(issuer.type || client.type || jobOrCard?.clientTypeLabel || (contactName ? 'faction-contact' : factionName ? 'faction' : 'client')),
      source: text(issuer.source || 'job'),
      factionId: text(issuer.factionId || jobOrCard?.issuerFactionId),
      factionName,
      contactId: text(issuer.contactId || jobOrCard?.issuerContactId),
      contactName,
      contactRole: text(issuer.contactRole || client.notes || ''),
      contactActorId: text(issuer.contactActorId || client.actorId || jobOrCard?.issuerContactActorId),
      contactActorUuid: text(issuer.contactActorUuid || client.actorUuid || jobOrCard?.issuerContactActorUuid),
      name,
      image: text(issuer.image || client.imageUrl || jobOrCard?.clientImage || ''),
      label: optionLabel([factionName, contactName || (name !== factionName ? name : '')]) || name,
      hasFaction: Boolean(factionName || issuer.factionId),
      hasContact: Boolean(contactName || issuer.contactId)
    };
  }

  static issuerFilterFromFaction(factionOrId) {
    const faction = typeof factionOrId === 'object'
      ? factionOrId
      : FactionRegistryService.findFaction(factionOrId);
    if (!faction) return null;
    return {
      type: 'faction',
      factionId: text(faction.id),
      factionName: text(faction.name),
      label: text(faction.name, 'Faction')
    };
  }

  static issuerFilterFromContact(factionOrId, contactOrId) {
    const faction = typeof factionOrId === 'object'
      ? factionOrId
      : FactionRegistryService.findFaction(factionOrId);
    if (!faction) return null;
    const contacts = Array.isArray(faction.contacts) ? faction.contacts : [];
    const contact = typeof contactOrId === 'object'
      ? contactOrId
      : contacts.find(entry => entry.id === contactOrId || entry.name === contactOrId);
    if (!contact) return this.issuerFilterFromFaction(faction);
    return {
      type: 'faction-contact',
      factionId: text(faction.id),
      factionName: text(faction.name),
      contactId: text(contact.id),
      contactName: text(contact.name),
      label: optionLabel([faction.name, contact.name]) || text(contact.name, 'Contact')
    };
  }

  static jobMatchesIssuer(jobOrCard = {}, filter = null) {
    if (!filter || !Object.keys(filter || {}).length) return true;
    const issuer = this.normalizeJobIssuer(jobOrCard);
    const rawJob = jobOrCard?.rawJob || jobOrCard?.metadata?.job || jobOrCard;
    const factionName = text(filter.factionName || filter.name).toLowerCase();
    const factionId = text(filter.factionId).toLowerCase();
    const contactName = text(filter.contactName).toLowerCase();
    const contactId = text(filter.contactId).toLowerCase();
    const issuerFactionName = text(issuer.factionName).toLowerCase();
    const issuerFactionId = text(issuer.factionId).toLowerCase();
    const issuerContactName = text(issuer.contactName).toLowerCase();
    const issuerContactId = text(issuer.contactId).toLowerCase();

    const factionMatch = (!factionId && !factionName)
      || (factionId && issuerFactionId === factionId)
      || (factionName && issuerFactionName === factionName)
      || (factionName && text(rawJob?.factionConsequences?.factionName).toLowerCase() === factionName)
      || (factionName && Array.isArray(rawJob?.factionConsequences?.additionalConsequences)
        && rawJob.factionConsequences.additionalConsequences.some(entry => text(entry?.factionName).toLowerCase() === factionName));
    if (!factionMatch) return false;

    if (!contactId && !contactName) return true;
    return Boolean(
      (contactId && issuerContactId === contactId)
      || (contactName && issuerContactName === contactName)
      || (contactName && text(issuer.name).toLowerCase() === contactName)
    );
  }

  static filterJobsByIssuer(jobs = [], filter = null) {
    const list = Array.isArray(jobs) ? jobs : [];
    if (!filter || !Object.keys(filter || {}).length) return list;
    return list.filter(job => this.jobMatchesIssuer(job, filter));
  }

  static summarizeJobsByIssuer(jobs = [], filter = null, { limit = 4 } = {}) {
    const matched = this.filterJobsByIssuer(jobs, filter);
    const counts = {
      total: matched.length,
      draft: 0,
      open: 0,
      active: 0,
      review: 0,
      payout: 0,
      completed: 0,
      failed: 0,
      archived: 0
    };
    for (const job of matched) {
      const raw = job?.rawJob || job;
      const status = text(job?.status || raw?.status || 'posted');
      if (status === 'draft') counts.draft += 1;
      else if (status === 'posted') counts.open += 1;
      else if (['accepted', 'inProgress'].includes(status)) counts.active += 1;
      else if (status === 'review') counts.review += 1;
      else if (status === 'complete') counts.payout += 1;
      else if (status === 'paid') counts.completed += 1;
      else if (status === 'failed') counts.failed += 1;
      else if (status === 'archived') counts.archived += 1;
    }
    const recentJobs = [...matched]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || b.rawJob?.updatedAt || 0) - new Date(a.updatedAt || a.createdAt || a.rawJob?.createdAt || 0))
      .slice(0, Math.max(0, limit))
      .map(job => {
        const raw = job?.rawJob || job;
        const status = text(job?.status || raw?.status || 'posted');
        return {
          threadId: text(job?.threadId || job?.id || raw?.threadId),
          title: text(job?.title || raw?.title || 'Untitled Job'),
          status,
          statusLabel: status === 'posted' ? 'Open' : status === 'complete' ? 'Ready to Pay' : status.charAt(0).toUpperCase() + status.slice(1),
          issuer: this.normalizeJobIssuer(job)
        };
      });
    return {
      ...counts,
      recentJobs,
      hasJobs: matched.length > 0,
      activeTotal: counts.open + counts.active + counts.review + counts.payout
    };
  }

  static draftForKnownIssuerKey(key = '', options = []) {
    const found = (Array.isArray(options) ? options : []).find(option => option.key === key);
    return found?.draft || null;
  }

  static _normalizeDraft(draft = {}) {
    const client = draft.client || {};
    const consequences = draft.factionConsequences || {};
    const issuer = draft.issuer || {};
    return {
      source: text(draft.source || issuer.source || 'manual'),
      issuer: {
        type: text(issuer.type || client.type || 'custom'),
        source: text(issuer.source || draft.source || 'manual'),
        factionId: text(issuer.factionId),
        factionName: text(issuer.factionName || client.factionName),
        contactId: text(issuer.contactId),
        contactName: text(issuer.contactName),
        contactRole: text(issuer.contactRole),
        contactActorId: text(issuer.contactActorId || client.actorId),
        contactActorUuid: text(issuer.contactActorUuid || client.actorUuid),
        contactActorName: text(issuer.contactActorName || client.actorName),
        name: text(issuer.name || client.name || issuer.contactName || issuer.factionName),
        image: text(issuer.image || client.imageUrl)
      },
      client: {
        type: text(client.type || 'npc'),
        name: text(client.name || issuer.contactName || issuer.name || issuer.factionName),
        factionName: text(client.factionName || issuer.factionName),
        imageUrl: text(client.imageUrl || issuer.image),
        notes: text(client.notes || issuer.contactRole),
        actorId: text(client.actorId || issuer.contactActorId),
        actorUuid: text(client.actorUuid || issuer.contactActorUuid),
        actorName: text(client.actorName || issuer.contactActorName),
        saveForReuse: Boolean(client.saveForReuse)
      },
      title: text(draft.title),
      primaryObjective: text(draft.primaryObjective),
      briefing: text(draft.briefing),
      instructions: text(draft.instructions),
      status: text(draft.status || 'posted'),
      primaryCredits: number(draft.primaryCredits, 0),
      primaryXp: number(draft.primaryXp, 0),
      factionConsequences: {
        factionName: text(consequences.factionName || client.factionName || issuer.factionName),
        successDelta: number(consequences.successDelta, 0),
        failureDelta: number(consequences.failureDelta, 0),
        notes: text(consequences.notes),
        additionalConsequences: Array.isArray(consequences.additionalConsequences)
          ? consequences.additionalConsequences.map(entry => ({
            type: text(entry?.type || 'additional'),
            factionName: text(entry?.factionName),
            successDelta: number(entry?.successDelta, 0),
            failureDelta: number(entry?.failureDelta, 0),
            notes: text(entry?.notes)
          })).filter(entry => entry.factionName)
          : []
      }
    };
  }
}

try {
  globalThis.SWSEFactionJobBridgeService = FactionJobBridgeService;
} catch (_err) {}
