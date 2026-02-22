// ============================================
// FILE: scripts/data/talent-tree-normalizer.js
// Talent Tree Data Normalizer (SSOT + Sentinel Aggregated Diagnostics)
// ============================================
//
// Read-only transformation layer.
// Never mutates source compendium data.
// All diagnostics routed through Sentinel (aggregated).
// ============================================

import { SentinelEngine } from '../governance/sentinel/sentinel-core.js';

/**
 * Normalize a talent tree ID from a name string.
 */
export function normalizeTalentTreeId(name) {
    if (!name) return 'unknown';

    return String(name)
        .toLowerCase()
        .replace(/['']/g, '')
        .replace(/\W+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Infer role from tree name.
 */
function inferTreeRole(name) {
    const n = name.toLowerCase();

    if (n.includes('jedi') || n.includes('force') || n.includes('sith') ||
        n.includes('lightsaber') || n.includes('vitality')) return 'force';

    if (n.includes('commando') || n.includes('trooper') || n.includes('weapon') ||
        n.includes('armor') || n.includes('duelist') || n.includes('gunslinger') ||
        n.includes('soldier') || n.includes('guardian') || n.includes('gladiator'))
        return 'combat';

    if (n.includes('slicer') || n.includes('tech') || n.includes('engineer') ||
        n.includes('mechanic') || n.includes('droid') || n.includes('saboteur'))
        return 'tech';

    if (n.includes('leadership') || n.includes('influence') ||
        n.includes('inspiration') || n.includes('noble') ||
        n.includes('officer') || n.includes('diplomat'))
        return 'leader';

    return 'general';
}

/**
 * Infer category from tree name.
 */
function inferTreeCategory(name) {
    const n = name.toLowerCase();

    if (n.includes('jedi')) return 'jedi';
    if (n.includes('sith')) return 'sith';
    if (n.includes('droid')) return 'droid';
    if (n.includes('force') && !n.includes('jedi') && !n.includes('sith')) return 'force';
    if (n.includes('bounty hunter')) return 'bounty_hunter';
    if (n.includes('soldier') || n.includes('trooper')) return 'military';
    if (n.includes('noble') || n.includes('officer')) return 'leadership';
    if (n.includes('scoundrel') || n.includes('outlaw')) return 'scoundrel';
    if (n.includes('scout') || n.includes('fringer')) return 'scout';

    return 'universal';
}

/**
 * Normalize raw tree document.
 */
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
        compendiumName: sys.talent_tree || name,
        description: sys.description || '',
        img: rawTree.img || 'icons/svg/item-bag.svg'
    };
}

/**
 * Exact-match lookup only (no fuzzy fallback).
 */
export function findTalentTreeByName(name, treeMap) {
    if (!name || !treeMap) return null;

    const id = normalizeTalentTreeId(name);

    if (treeMap.has(id)) {
        return treeMap.get(id);
    }

    SentinelEngine.report(
        'data',
        SentinelEngine.SEVERITY.WARN,
        'Talent tree not found by exact ID',
        { name, normalized: id },
        { aggregateKey: 'talent-tree-not-found', sample: true, threshold: 50 }
    );

    return null;
}

/**
 * Validate normalized tree definition.
 */
export function validateTalentTree(normalizedTree) {
    const required = ['id', 'name', 'role', 'category'];
    const missing = required.filter(field => !normalizedTree[field]);

    if (missing.length > 0) {
        throw new Error(
            `[TalentTreeNormalizer] Invalid tree definition - missing fields: ${missing.join(', ')}`
        );
    }

    return true;
}

/**
 * Normalize a talent document.
 * Never throws. Never blocks.
 */
export function normalizeDocumentTalent(talentDoc) {
    if (!talentDoc || !talentDoc.system) return talentDoc;

    try {
        const sys = talentDoc.system;

        if (sys.talent_tree) {
            sys.talent_tree = String(sys.talent_tree).trim().replace(/\s+/g, ' ');
        }

        if (sys.prerequisites) {
            sys.prerequisites = String(sys.prerequisites).trim().replace(/\s+/g, ' ');
        }

        if (sys.benefit) {
            sys.benefit = String(sys.benefit).trim().replace(/\s+/g, ' ');
        }

        sys.description = sys.description ?? '';

        if (sys.talent_tree) {
            const validFormat = /^[A-Za-z0-9\s\-'()]+$/.test(sys.talent_tree);
            if (!validFormat) {
                SentinelEngine.report(
                    'data',
                    SentinelEngine.SEVERITY.WARN,
                    'Talent has unusual tree name format',
                    { talent: talentDoc.name, tree: sys.talent_tree },
                    { aggregateKey: 'talent-tree-format', sample: true, threshold: 50 }
                );
            }
        }

    } catch (err) {
        SentinelEngine.report(
            'data',
            SentinelEngine.SEVERITY.ERROR,
            'Talent normalization failed',
            { talent: talentDoc?.name, error: err?.message }
        );
    }

    return talentDoc;
}

/**
 * Validate talent tree assignment (aggregated diagnostic).
 * Non-fatal.
 */
export function validateTalentTreeAssignment(talentDoc) {
    try {
        if (!talentDoc?.system?.talent_tree) {
            SentinelEngine.report(
                'data',
                SentinelEngine.SEVERITY.WARN,
                'Talent missing tree assignment',
                { talent: talentDoc?.name, id: talentDoc?._id },
                { aggregateKey: 'talent-missing-tree', sample: true, threshold: 100 }
            );
            return true;
        }

        const treeName = talentDoc.system.talent_tree;

        if (typeof treeName !== 'string') {
            SentinelEngine.report(
                'data',
                SentinelEngine.SEVERITY.WARN,
                'Talent tree assignment not a string',
                { talent: talentDoc.name, value: treeName },
                { aggregateKey: 'talent-invalid-tree-type', sample: true, threshold: 50 }
            );
            return true;
        }

        normalizeTalentTreeId(treeName);

    } catch (err) {
        SentinelEngine.report(
            'data',
            SentinelEngine.SEVERITY.ERROR,
            'Talent tree validation crashed',
            { talent: talentDoc?.name, error: err?.message }
        );
    }

    return true;
}