/**
 * GM Bulletin source/contact registry.
 *
 * Lightweight world-level directory for recurring Bulletin/HoloNews senders.
 * This is intentionally not an Actor registry: some news desks, factions, and
 * anonymous sources are just presentation metadata for player home feed cards.
 */

const SYSTEM_ID = 'foundryvtt-swse';
const SETTING_KEY = 'holonetBulletinContacts';

function randomId() {
  return foundry.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 10);
}

function normalizeKind(value) {
  const kind = String(value || 'source').trim().toLowerCase();
  return ['source', 'news', 'faction', 'npc', 'mentor', 'vendor', 'system'].includes(kind) ? kind : 'source';
}

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function defaultContacts() {
  return [
    {
      id: 'galaxy-news-net',
      kind: 'news',
      name: 'Galaxy News Net',
      label: 'Galaxy News Net',
      imageUrl: '',
      dateline: 'Coruscant',
      sector: 'Core Worlds',
      defaultCategory: 'general',
      notes: 'Default neutral HoloNews wire source.',
      system: true
    },
    {
      id: 'sector-civic-wire',
      kind: 'news',
      name: 'Sector Civic Wire',
      label: 'Sector Civic Wire',
      imageUrl: '',
      dateline: 'Regional Relay',
      sector: 'Mid Rim',
      defaultCategory: 'civic',
      notes: 'Low-stakes local notices, transport updates, and civic reports.',
      system: true
    },
    {
      id: 'port-authority-desk',
      kind: 'source',
      name: 'Port Authority Desk',
      label: 'Port Authority Desk',
      imageUrl: '',
      dateline: 'Local Starport',
      sector: 'Outer Rim',
      defaultCategory: 'traffic',
      notes: 'Docking schedules, customs advisories, and travel notices.',
      system: true
    }
  ];
}

function normalizeContact(raw = {}) {
  const id = cleanString(raw.id, randomId());
  const name = cleanString(raw.name || raw.label, 'Unnamed Source');
  const label = cleanString(raw.label, name);
  const now = new Date().toISOString();
  return {
    id,
    kind: normalizeKind(raw.kind),
    name,
    label,
    imageUrl: cleanString(raw.imageUrl),
    dateline: cleanString(raw.dateline),
    sector: cleanString(raw.sector),
    defaultCategory: cleanString(raw.defaultCategory || raw.category, 'general'),
    notes: cleanString(raw.notes),
    system: raw.system === true,
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    useCount: Math.max(0, Number(raw.useCount || 0) || 0),
    lastUsedAt: raw.lastUsedAt || null
  };
}

export class BulletinContactRegistry {
  static SETTING_KEY = SETTING_KEY;

  static defaultContacts() {
    return defaultContacts();
  }

  static async getAll() {
    let raw = [];
    try {
      raw = await game.settings.get(SYSTEM_ID, SETTING_KEY) ?? [];
    } catch (err) {
      console.warn('[BulletinContactRegistry] Could not read contacts:', err);
    }
    const contacts = Array.isArray(raw) && raw.length ? raw : defaultContacts();
    return contacts.map(normalizeContact).sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getById(contactId) {
    if (!contactId) return null;
    const contacts = await this.getAll();
    return contacts.find((contact) => contact.id === contactId) ?? null;
  }

  static normalizeContact(raw = {}) {
    return normalizeContact(raw);
  }

  static async saveContact(raw = {}) {
    if (!game.user?.isGM) return null;
    const contacts = await this.getAll();
    const now = new Date().toISOString();
    const incoming = normalizeContact({ ...raw, updatedAt: now });
    const index = contacts.findIndex((contact) => contact.id === incoming.id);
    if (index >= 0) {
      contacts[index] = {
        ...contacts[index],
        ...incoming,
        createdAt: contacts[index].createdAt || incoming.createdAt,
        system: contacts[index].system === true && raw.system !== false
      };
    } else {
      contacts.push({ ...incoming, createdAt: now });
    }
    await game.settings.set(SYSTEM_ID, SETTING_KEY, contacts.map(normalizeContact));
    return incoming;
  }

  static async deleteContact(contactId) {
    if (!game.user?.isGM || !contactId) return false;
    const contacts = await this.getAll();
    const contact = contacts.find((entry) => entry.id === contactId);
    if (contact?.system) return false;
    await game.settings.set(SYSTEM_ID, SETTING_KEY, contacts.filter((entry) => entry.id !== contactId));
    return true;
  }

  static async markUsed(contactId) {
    if (!game.user?.isGM || !contactId) return null;
    const contacts = await this.getAll();
    const index = contacts.findIndex((contact) => contact.id === contactId);
    if (index < 0) return null;
    const now = new Date().toISOString();
    contacts[index] = normalizeContact({
      ...contacts[index],
      useCount: Number(contacts[index].useCount || 0) + 1,
      lastUsedAt: now,
      updatedAt: now
    });
    await game.settings.set(SYSTEM_ID, SETTING_KEY, contacts);
    return contacts[index];
  }

  static toView(contact = {}) {
    const normalized = normalizeContact(contact);
    return {
      ...normalized,
      kindLabel: normalized.kind.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      imageLabel: normalized.imageUrl ? 'Image set' : 'No image',
      lastUsedLabel: normalized.lastUsedAt ? new Date(normalized.lastUsedAt).toLocaleString() : 'Never used'
    };
  }
}
