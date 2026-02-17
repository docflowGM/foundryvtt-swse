/**
 * SWSE Talent Normalizer Engine
 *
 * Runtime utility to audit and normalize talent metadata based on descriptions.
 * This is intentionally heuristic and does not rewrite original description text.
 *
 * What it does:
 * - Extracts action economy (Passive / Free / Swift / Reaction / Standard / Full-Round / Move)
 * - Extracts common tags (Follower, Force, Dark Side, Mind-Affecting, Fear, etc.)
 * - Writes normalized metadata into flags.swse.talentMeta
 *
 * What it does NOT do:
 * - Automatically apply Active Effects for situational talents
 * - Auto-run at boot (must be called manually)
 */

const ACTION_PATTERNS = [
  { type: "fullRound", label: "Full-Round Action", re: /Full[- ]Round Action/i },
  { type: "standard", label: "Standard Action", re: /Standard Action/i },
  { type: "move", label: "Move Action", re: /Move Action/i },
  { type: "swift", label: "Swift Action", re: /Swift Action/i },
  { type: "reaction", label: "Reaction", re: /As a Reaction|as a Reaction|Reaction/i },
  { type: "free", label: "Free Action", re: /Free Action/i },
];

const TAG_PATTERNS = [
  { tag: "Followers", re: /Follower(s)?/i },
  { tag: "Force", re: /Force Power(s)?|Use the Force|Force Point/i },
  { tag: "Dark Side", re: /Dark Side|\[Dark Side\]/i },
  { tag: "Light Side", re: /Light Side|\[Light Side\]/i },
  { tag: "Mind-Affecting", re: /Mind[- ]Affecting/i },
  { tag: "Fear", re: /Fear/i },
  { tag: "Autofire", re: /Autofire/i },
  { tag: "Lightsaber", re: /Lightsaber/i },
  { tag: "Vehicle", re: /Vehicle(s)?|Capital Ship|Weapon Battery/i },
  { tag: "Jet Pack", re: /Jet Pack/i },
  { tag: "Second Wind", re: /Second Wind/i },
  { tag: "Condition Track", re: /Condition Track/i },
  { tag: "Cover", re: /Cover/i },
  { tag: "Disarm", re: /Disarm|Disarming/i },
];

function _getText(item) {
  const d = item?.system?.description ?? item?.system?.details?.description ?? "";
  const desc = typeof d === "string" ? d : (d?.value ?? "");
  return (desc || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function _detectActionType(text) {
  for (const p of ACTION_PATTERNS) {
    if (p.re.test(text)) return { type: p.type, label: p.label };
  }
  return { type: "passive", label: "Passive" };
}

function _detectTags(text) {
  const tags = [];
  for (const p of TAG_PATTERNS) {
    if (p.re.test(text)) tags.push(p.tag);
  }
  return Array.from(new Set(tags));
}

function _inferMultiOption(text) {
  // crude heuristic: bullets + "use each of the following actions" OR "any of the following"
  const hasBullets = /•|
-|
\*/.test(text);
  const hasCue = /use each of the following|any of the following|can use each of the following/i.test(text);
  return hasBullets && hasCue;
}

export class TalentNormalizerEngine {
  static normalizeTalentMeta(item) {
    const text = _getText(item);
    const action = _detectActionType(text);
    const tags = _detectTags(text);
    const isMultiOption = _inferMultiOption(text);

    const meta = {
      actionType: action.type,
      actionLabel: action.label,
      tags,
      isFollowerAffecting: tags.includes("Followers"),
      isMultiOption,
      // Phase marker inference (your 5-phase plan)
      phase: this._inferPhase(action.type),
      updatedAt: Date.now()
    };

    return { meta, text };
  }

  static _inferPhase(actionType) {
    if (!actionType || actionType === "passive") return 1;
    if (["free", "swift", "reaction"].includes(actionType)) return 2;
    if (["standard", "fullRound"].includes(actionType)) return 3;
    if (actionType === "legacy" || actionType === "internal") return 4;
    return 5;
  }

  static diffMeta(oldMeta, nextMeta) {
    const changes = {};
    for (const k of Object.keys(nextMeta)) {
      const a = oldMeta?.[k];
      const b = nextMeta[k];
      if (JSON.stringify(a) !== JSON.stringify(b)) changes[k] = { from: a, to: b };
    }
    return changes;
  }

  /**
   * Audit talents in the world + compendiums (GM recommended).
   * @param {Object} opts
   * @param {boolean} opts.includeWorld - Include world Items (default true)
   * @param {boolean} opts.includePacks - Include compendium packs with type "Item" (default true)
   * @param {boolean} opts.apply - Apply changes (default false)
   * @param {RegExp|null} opts.nameFilter - Optional filter by name
   */
  static async auditAndNormalize(opts = {}) {
    const options = {
      includeWorld: true,
      includePacks: true,
      apply: false,
      nameFilter: null,
      ...opts
    };

    const report = {
      totals: { talents: 0, changed: 0 },
      byActionType: {},
      byPhase: {},
      missingMeta: 0,
      multiOption: 0,
      followerAffecting: 0,
      examples: [],
      topChanged: []
    };

    const record = (meta, changed) => {
      report.totals.talents++;
      report.byActionType[meta.actionType] = (report.byActionType[meta.actionType] || 0) + 1;
      report.byPhase[String(meta.phase)] = (report.byPhase[String(meta.phase)] || 0) + 1;
      if (meta.isMultiOption) report.multiOption++;
      if (meta.isFollowerAffecting) report.followerAffecting++;
      if (changed) report.totals.changed++;
    };

    const handleItem = async (item) => {
      if (item.type !== "talent") return;

      if (options.nameFilter && !options.nameFilter.test(item.name)) return;

      const oldMeta = item.getFlag("swse", "talentMeta") ?? null;
      if (!oldMeta) report.missingMeta++;

      const { meta } = this.normalizeTalentMeta(item);
      const changes = this.diffMeta(oldMeta, meta);
      const changed = Object.keys(changes).length > 0;

      record(meta, changed);

      if (changed && report.topChanged.length < 50) {
        report.topChanged.push({ name: item.name, changes });
      }

      if (!changed && report.examples.length < 10) {
        report.examples.push({ name: item.name, meta });
      }

      if (options.apply && changed) {
        await item.setFlag("swse", "talentMeta", meta);
      }
    };

    if (options.includeWorld) {
      for (const item of game.items) {
        await handleItem(item);
      }
    }

    if (options.includePacks) {
      for (const pack of game.packs) {
        if (pack.documentName !== "Item") continue;
        if (!pack.indexed) await pack.getIndex();

        // Only load talents to minimize cost
        const ids = pack.index.filter(e => e.type === "talent").map(e => e._id);
        for (const id of ids) {
          const doc = await pack.getDocument(id);
          await handleItem(doc);
        }
      }
    }

    return report;
  }
}

// Convenience global for console/macros
globalThis.SWSETalentNormalizer = TalentNormalizerEngine;
