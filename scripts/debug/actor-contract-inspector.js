/**
 * Actor Contract Health Inspector
 *
 * Developer utility for rapid assessment of actor canonical contract health.
 *
 * Usage:
 *   const report = inspectActorContract(actor);
 *   console.log(report.summary());
 */

export function inspectActorContract(actor) {
  if (!actor || !actor.system) {
    return {
      name: 'Unknown',
      health: 'ERROR',
      summary: () => 'Invalid actor',
      details: { error: 'Actor or system missing' }
    };
  }

  const system = actor.system;
  const derived = system?.derived ?? {};

  const checks = {
    // STORED CONTRACT HEALTH
    stored: {
      abilities: checkStoredAbilities(system),
      skills: checkStoredSkills(system),
      hp: checkStoredHP(system),
      resources: checkStoredResources(system),
      classIdentity: checkStoredClassIdentity(system)
    },

    // DERIVED CONTRACT HEALTH
    derived: {
      attributes: checkDerivedAttributes(derived),
      skills: checkDerivedSkills(derived),
      defenses: checkDerivedDefenses(derived),
      identity: checkDerivedIdentity(derived),
      attacks: checkDerivedAttacks(derived),
      encumbrance: checkDerivedEncumbrance(derived)
    },

    // LEGACY & FALLBACK RISK
    risks: {
      legacyAbilityPaths: checkLegacyAbilityPaths(system),
      legacyXpPaths: checkLegacyXpPaths(system),
      fallbackHotspots: checkFallbackRisks(derived, system)
    }
  };

  return {
    name: actor.name,
    actorId: actor.id,
    checks,
    health: overallHealth(checks),

    summary() {
      const health = this.health;
      const storedOk = Object.values(this.checks.stored).filter(c => c.status === 'OK').length;
      const derivedOk = Object.values(this.checks.derived).filter(c => c.status === 'OK').length;
      const risks = Object.values(this.checks.risks)
        .flatMap(r => Array.isArray(r) ? r : [r])
        .filter(r => r.risk === true || r.length > 0)
        .length;

      return `
[Actor Contract Health Report]
Actor: ${this.name} (${this.actorId})
Overall Health: ${health}

Stored Contract: ${storedOk}/5 OK
Derived Contract: ${derivedOk}/6 OK
Legacy/Fallback Risks: ${risks} detected

${risks > 0 ? '⚠️ RISKS DETECTED — see details()' : '✓ No major risks detected'}
      `.trim();
    },

    details() {
      let report = `\n[DETAILED ACTOR CONTRACT REPORT]\nActor: ${this.name}\n\n`;

      report += '═══ STORED CONTRACT ═══\n';
      for (const [key, check] of Object.entries(this.checks.stored)) {
        report += `${key.padEnd(15)} ${check.status.padEnd(10)} ${check.message}\n`;
      }

      report += '\n═══ DERIVED CONTRACT ═══\n';
      for (const [key, check] of Object.entries(this.checks.derived)) {
        report += `${key.padEnd(15)} ${check.status.padEnd(10)} ${check.message}\n`;
      }

      report += '\n═══ LEGACY & FALLBACK RISKS ═══\n';
      for (const [key, data] of Object.entries(this.checks.risks)) {
        if (Array.isArray(data)) {
          report += `${key}:\n`;
          if (data.length === 0) {
            report += '  ✓ None detected\n';
          } else {
            data.forEach(item => {
              report += `  ⚠️ ${item}\n`;
            });
          }
        } else {
          report += `${key}: ${data.risk ? '⚠️ RISK' : '✓ OK'} - ${data.message}\n`;
        }
      }

      return report;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// STORED CONTRACT CHECKS
// ═══════════════════════════════════════════════════════════════

function checkStoredAbilities(system) {
  const required = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const abilities = system.abilities ?? {};
  const missing = required.filter(k => !abilities[k] || !abilities[k].base);

  if (missing.length === 0) {
    return { status: 'OK', message: 'All abilities have canonical .base' };
  }
  return { status: 'FAIL', message: `Missing: ${missing.join(', ')}` };
}

function checkStoredSkills(system) {
  const skills = system.skills ?? {};
  const skillCount = Object.keys(skills).length;
  if (skillCount >= 20) {
    return { status: 'OK', message: `${skillCount} skills initialized` };
  }
  return { status: 'WARN', message: `Only ${skillCount} skills (expected 25)` };
}

function checkStoredHP(system) {
  const hp = system.hp ?? {};
  if (hp.value !== undefined && hp.max !== undefined) {
    return { status: 'OK', message: `HP: ${hp.value}/${hp.max}` };
  }
  return { status: 'FAIL', message: 'HP value/max missing' };
}

function checkStoredResources(system) {
  const resources = {
    fp: system.forcePoints ?? { value: 0, max: 0 },
    dp: system.destinyPoints ?? { value: 0, max: 0 },
    xp: system.xp ?? { total: 0 }
  };

  if (resources.fp.value !== undefined && resources.dp.value !== undefined) {
    return { status: 'OK', message: 'Force/Destiny points canonical' };
  }
  return { status: 'FAIL', message: 'Resource containers incomplete' };
}

function checkStoredClassIdentity(system) {
  const hasClass = system.class || system.className;
  const hasLevel = system.level !== undefined && system.level !== null;

  if (hasClass && hasLevel) {
    return { status: 'OK', message: `Class set, Level ${system.level}` };
  }
  return { status: 'WARN', message: 'Class or level missing' };
}

// ═══════════════════════════════════════════════════════════════
// DERIVED CONTRACT CHECKS
// ═══════════════════════════════════════════════════════════════

function checkDerivedAttributes(derived) {
  const required = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const attrs = derived.attributes ?? {};
  const missing = required.filter(k => !attrs[k] || attrs[k].mod === undefined);

  if (missing.length === 0) {
    return { status: 'OK', message: 'All attributes have mod' };
  }
  return { status: 'FAIL', message: `Missing mods: ${missing.join(', ')}` };
}

function checkDerivedSkills(derived) {
  const skills = derived.skills ?? {};
  const skillCount = Object.keys(skills).length;
  const withoutTotal = Object.keys(skills).filter(k => skills[k].total === undefined).length;

  if (skillCount >= 20 && withoutTotal === 0) {
    return { status: 'OK', message: `${skillCount} skills with totals` };
  }
  return { status: 'WARN', message: `${skillCount} skills, ${withoutTotal} missing totals` };
}

function checkDerivedDefenses(derived) {
  const defs = derived.defenses ?? {};
  const required = ['fortitude', 'reflex', 'will'];
  const missing = required.filter(k => !defs[k] || defs[k].total === undefined);

  if (missing.length === 0) {
    return { status: 'OK', message: 'All defenses have totals' };
  }
  return { status: 'FAIL', message: `Missing: ${missing.join(', ')}` };
}

function checkDerivedIdentity(derived) {
  const identity = derived.identity ?? {};
  if (identity.className && identity.classDisplay && identity.level) {
    return { status: 'OK', message: `Identity bundle complete` };
  }
  return { status: 'WARN', message: 'Identity bundle incomplete' };
}

function checkDerivedAttacks(derived) {
  const attacks = derived.attacks ?? {};
  const list = attacks.list ?? [];

  if (list.length >= 0) {
    return { status: 'OK', message: `${list.length} attacks in derived.list` };
  }
  return { status: 'WARN', message: 'Attacks list empty or missing' };
}

function checkDerivedEncumbrance(derived) {
  const enc = derived.encumbrance ?? {};
  if (enc.state && enc.label) {
    return { status: 'OK', message: `State: ${enc.state}` };
  }
  return { status: 'WARN', message: 'Encumbrance bundle incomplete' };
}

// ═══════════════════════════════════════════════════════════════
// LEGACY & FALLBACK RISK CHECKS
// ═══════════════════════════════════════════════════════════════

function checkLegacyAbilityPaths(system) {
  const risks = [];
  const abilities = system.abilities ?? {};

  for (const [key, abilityData] of Object.entries(abilities)) {
    if (abilityData.value !== undefined && !abilityData.base) {
      risks.push(`${key}: has .value but missing .base (legacy path active)`);
    }
  }

  return risks;
}

function checkLegacyXpPaths(system) {
  const risks = [];
  const hasOldXp = system.experience !== undefined;
  const hasNewXp = system.xp?.total !== undefined;

  if (hasOldXp && !hasNewXp) {
    risks.push('Using legacy system.experience (should be system.xp.total)');
  }

  return risks;
}

function checkFallbackRisks(derived, system) {
  const risks = [];

  // HP fallback risk: if no derived HP, sheet will compute
  if (!derived.hp) {
    risks.push('No derived.hp bundle → HP display will use actor.system.hp directly (acceptable)');
  }

  // Skills fallback risk: if no derived skills, sheet will compute
  if (!derived.skills || Object.keys(derived.skills).length === 0) {
    risks.push('No derived.skills bundle → skill totals will be rebuilt by sheet');
  }

  // Attacks fallback risk: if no derived attacks, sheet reconstructs from items
  if (!derived.attacks || !derived.attacks.list || derived.attacks.list.length === 0) {
    const equippedWeapons = system.items?.filter(i => i.type === 'weapon' && i.system?.equipped)?.length ?? 0;
    if (equippedWeapons > 0) {
      risks.push('No derived.attacks.list → attacks will be reconstructed from equipped weapons');
    }
  }

  return risks;
}

// ═══════════════════════════════════════════════════════════════
// OVERALL HEALTH ASSESSMENT
// ═══════════════════════════════════════════════════════════════

function overallHealth(checks) {
  const storedFails = Object.values(checks.stored).filter(c => c.status === 'FAIL').length;
  const derivedFails = Object.values(checks.derived).filter(c => c.status === 'FAIL').length;
  const risks = Object.values(checks.risks)
    .flatMap(r => Array.isArray(r) ? r : (r.risk ? [r] : []))
    .length;

  if (storedFails > 0 || derivedFails > 1) {
    return '🔴 CRITICAL — major contract violations';
  }
  if (derivedFails === 1 || risks > 2) {
    return '🟡 WARNING — some missing or fallback paths active';
  }
  if (risks > 0) {
    return '🟢 OK — minor issues, fallback paths present';
  }
  return '✅ HEALTHY — canonical contract intact';
}
