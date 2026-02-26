// ============================================
// FILE: scripts/data/talent-tree-normalizer.js
// Talent Tree Data Normalizer (Formatting Only)
// ============================================
//
// Pure formatting layer.
// Tree ownership is handled exclusively by TalentTreeDB.
// ============================================

import { SentinelEngine } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export function normalizeTalentTreeId(name) {
    if (!name) return 'unknown';

    return String(name)
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/\W+/g, '_')
        .replace(/^_|_$/g, '');
}

function inferTreeRole(name) {
    const n = name.toLowerCase();
    if (n.includes('jedi') || n.includes('force') || n.includes('sith')) return 'force';
    if (n.includes('soldier') || n.includes('trooper') || n.includes('weapon')) return 'combat';
    if (n.includes('tech') || n.includes('droid')) return 'tech';
    if (n.includes('leader') || n.includes('noble')) return 'leader';
    return 'general';
}

function inferTreeCategory(name) {
    const n = name.toLowerCase();
    if (n.includes('jedi')) return 'jedi';
    if (n.includes('sith')) return 'sith';
    if (n.includes('droid')) return 'droid';
    return 'universal';
}

export function normalizeTalentTree(rawTree) {
    const name = rawTree.name || 'Unknown Tree';
    const sys = rawTree.system || {};

    return {
        id: normalizeTalentTreeId(name),
        name,
        sourceId: rawTree._id,
        talentIds: sys.talentIds || [],
        role: inferTreeRole(name),
        category: inferTreeCategory(name),
        tags: sys.tags || [],
        description: sys.description || '',
        img: rawTree.img || 'icons/svg/item-bag.svg'
    };
}

export function findTalentTreeByName(name, treeMap) {
    if (!name || !treeMap) return null;
    const id = normalizeTalentTreeId(name);
    return treeMap.get(id) || null;
}

export function validateTalentTree(normalizedTree) {
    if (!normalizedTree.id || !normalizedTree.name) {
        throw new Error("Invalid tree definition");
    }
    return true;
}

export function normalizeDocumentTalent(talentDoc) {
    if (!talentDoc || !talentDoc.system) return talentDoc;

    const sys = talentDoc.system;

    if (sys.talent_tree) {
        sys.talent_tree = String(sys.talent_tree).trim();
    }

    sys.description = sys.description ?? '';

    return talentDoc;
}

export function validateTalentTreeAssignment() {
    return true;
}
