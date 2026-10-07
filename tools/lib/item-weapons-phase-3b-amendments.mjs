// Phase 5B-R: source-backed Phase 3B content-completeness amendments (planner rulings, Phase 5B-R).
// SCHEMA SHAPE IS FROZEN: only existing v2.9 fields are populated (attackProfiles, configurationStates, modeProfiles,
// payloadProfiles, ammo.scopedToAttackProfiles, wieldingRules, triggeredEffects, activationRequirements, operation.*,
// proficiencyRules[].species). Every value is either copied programmatically from an already-certified identity or is
// stated verbatim in the identity's own canonicalPlayerText. Every amendment asserts its pre-condition so a source shift fails the build.
const clone = (x) => JSON.parse(JSON.stringify(x));
const need = (cond, msg) => { if (!cond) throw new Error(`3B amendment pre-condition failed: ${msg}`); };

export const AMENDMENT_IDS = ['amphistaff-forms-and-special-attacks', 'amphistaff-yuuzhan-vong-familiarity', 'atlatl-energy-ball-launcher', 'cesta-energy-ball-launcher', 'electropole-gungan-route-structured', 'shock-stick-configurations', 'vibrobayonet-configurations', 'vibrobayonet-mounted-rifle-double-weapon'];

export function applyCompletenessAmendments(identities) {
  const by = (k) => { const i = identities.find((x) => x.identityKey === k); need(i, `identity ${k}`); return i; };
  const log = [];
  const note = (id, identityKey, fields, basis) => log.push({ id, identityKey, fields, basis, schemaShapeChange: false });

  // ---- Amphistaff ------------------------------------------------------------------------------------------------
  {
    const a = by('unmapped::Amphistaff'), qs = by('unmapped::Quarterstaff'), sp = by('unmapped::Spear'), ep = by('weapon-gungan-electropole');
    need(a.canonicalStats.attackProfiles.length === 1 && a.canonicalStats.attackProfiles[0].id === 'primary', 'Amphistaff has only the placeholder primary profile');
    need(qs.canonicalStats.attackProfiles.length === 2 && sp.canonicalStats.attackProfiles.length === 1, 'Quarterstaff/Spear certified profiles');
    const base = a.canonicalStats.attackProfiles[0];
    const sf = (branch) => ({ branch, subcategory: 'exotic', proficiency: 'exotic', exoticWeaponIdentity: 'Amphistaff' });
    const cfgReq = (id) => [{ type: 'configuration', id }];
    const mk = (id, label, branch, from, over = {}) => {
      const p = clone(base);
      p.id = id; p.label = label; p.schemaFamily = sf(branch);
      for (const k of ['damage', 'damageType', 'range', 'qualities']) p[k] = clone(from[k]);
      return Object.assign(p, over);
    };
    const conditionTrack = (id, trigger) => ({ id, trigger, defense: 'fortitude', effect: 'move-target-condition-track', steps: -1, persistent: true, notes: ['Amphistaff poison condition-track effect (source text).'] });
    const spearHit = 'damage-dealt-and-attack-roll-equals-or-exceeds-defense';
    const e1 = clone(qs.canonicalStats.attackProfiles[0]), e2 = clone(qs.canonicalStats.attackProfiles[1]);
    const profiles = [
      mk('quarterstaff-end1', 'Quarterstaff form (end 1)', 'melee', e1, { activationRequirements: cfgReq('quarterstaff'), notes: ['Quarterstaff form has all the qualities of a quarterstaff (source text).', 'Deterministically inherited at build time from certified identity unmapped::Quarterstaff profile end1 (damage, type, qualities); re-verified against it by verify-item-weapons-authority.'] }),
      mk('quarterstaff-end2', 'Quarterstaff form (end 2)', 'melee', e2, { activationRequirements: cfgReq('quarterstaff'), notes: ['Deterministically inherited at build time from certified identity unmapped::Quarterstaff profile end2.'] }),
    ];
    const spearTrig = (id) => [conditionTrack(id, spearHit)];
    const spearMelee = mk('spear-melee', 'Spear form (melee)', 'melee', sp.canonicalStats.attackProfiles[0], { activationRequirements: cfgReq('spear'), triggeredEffects: spearTrig('spear-poison-condition-track'), notes: ['Deterministically inherited at build time from certified identity unmapped::Spear profile primary (damage, type, qualities).'] });
    const thrownRange = clone(ep.canonicalStats.attackProfiles.find((p) => p.id === 'thrown').range);
    const spearThrownSrc = clone(sp.canonicalStats.attackProfiles[0]); spearThrownSrc.range = thrownRange; spearThrownSrc.qualities.thrown = true;
    const spearThrown = mk('spear-thrown', 'Spear form (thrown)', 'ranged', spearThrownSrc, { activationRequirements: cfgReq('spear'), triggeredEffects: spearTrig('spear-thrown-poison-condition-track'), notes: ['Spear damage inherited from unmapped::Spear; range is the global thrown-weapons table (copied from the certified Electropole thrown profile), not a weapon-specific table.'] });
    const whipSrc = { damage: { mode: 'dice', diceCount: 1, dieSize: 4, flatBonus: 0, formula: '1d4' }, damageType: { mode: 'single', types: ['piercing'], qualifiers: [] }, range: clone(base.range), qualities: { ...clone(base.qualities), reach: true } };
    const whip = mk('whip-melee', 'Whip form (tail)', 'melee', whipSrc, { activationRequirements: cfgReq('whip'), triggeredEffects: [conditionTrack('whip-poison-condition-track', spearHit)], notes: ['Tail deals 1d4 piercing plus the wielder\'s Strength modifier; reach 2 squares (source text).'] });
    const pinTripSrc = () => ({ damage: { mode: 'none', diceCount: 0, dieSize: null, flatBonus: 0, formula: '-' }, damageType: { mode: 'none', types: [], qualifiers: [] }, range: clone(base.range), qualities: { ...clone(base.qualities), reach: true } });
    const pinTrip = (which) => mk(`whip-${which}`, `Whip form (${which === 'pin' ? 'Pin' : 'Trip'} instead of damage)`, 'melee', pinTripSrc(), {
      kind: 'special', activationRequirements: [...cfgReq('whip'), { type: 'proficiency', condition: 'proficient-wielder' }],
      triggeredEffects: [{ id: `${which}-without-feat`, trigger: 'in-place-of-whip-damage', effect: `resolve-as-${which}-feat-without-feat` }],
      notes: [`Instead of dealing whip damage, a proficient wielder may ${which} the target as though using the ${which === 'pin' ? 'Pin' : 'Trip'} feat without needing the feat (source text).`],
    });
    const venom = mk('venom-spit', 'Venom spit (any form)', 'ranged', { damage: { mode: 'none', diceCount: 0, dieSize: null, flatBonus: 0, formula: '-' }, damageType: { mode: 'none', types: [], qualifiers: [] }, range: { ...clone(base.range), mode: 'fixed-maximum', maxSquares: 10 }, qualities: clone(base.qualities) }, {
      kind: 'special',
      activationRequirements: [{ type: 'action', action: 'standard' }, { type: 'usage-limit', uses: 1, per: '24-standard-hours' }],
      triggeredEffects: [{ id: 'venom-spit-condition-track', trigger: 'attack-roll-equals-or-exceeds-both-defenses', defenses: ['reflex', 'fortitude'], effect: 'move-target-condition-track', steps: -1, persistent: true }],
      notes: ['In any form the wielder can coax it to spit venom up to 10 squares as a standard action; usable once every 24 standard hours (source text).'],
    });
    profiles.push(spearMelee, spearThrown, whip, pinTrip('pin'), pinTrip('trip'), venom);
    a.canonicalStats.attackProfiles = profiles;
    a.canonicalStats.configurationStates = [
      { id: 'quarterstaff', label: 'Quarterstaff form', default: true, attackUsable: true, transitionAction: 'swift' },
      { id: 'spear', label: 'Spear form', default: false, attackUsable: true, transitionAction: 'swift' },
      { id: 'whip', label: 'Whip form', default: false, attackUsable: true, transitionAction: 'swift' },
    ];
    a.canonicalStats.modeProfiles = [{ id: 'double-weapon-full-round', label: 'Attack with both ends (quarterstaff form)', attackProfileIds: ['quarterstaff-end1', 'quarterstaff-end2'], attackRollModifierEach: -10, notes: ['Quarterstaff qualities: attack with both ends as a full-round action; certain feats and talents reduce these penalties.'], attackProfileId: null, switchAction: 'full-round' }];
    a.canonicalStats.triggeredEffects = profiles.flatMap((p) => p.triggeredEffects.map(clone));
    for (const q of a.conditionalQualities) q.when = { ...q.when, configurationId: /quarterstaff/.test(q.when.description) ? 'quarterstaff' : /spear/.test(q.when.description) ? 'spear' : 'whip' };
    a.operation = { ...(a.operation || {}), switchFormAction: 'swift', reachSquares: 2, reachProfileIds: ['whip'], allowedGrappleFeats: ['Pin', 'Trip'], pinTripSubstitution: { profileIds: ['whip-pin', 'whip-trip'], requiresProficientWielder: true, feat: 'none-required' }, venomSpit: { profileId: 'venom-spit', rangeSquares: 10, action: 'standard', usage: { uses: 1, per: '24-standard-hours' } } };
    note('amphistaff-forms-and-special-attacks', a.identityKey, ['canonicalStats.attackProfiles', 'canonicalStats.configurationStates', 'canonicalStats.modeProfiles', 'canonicalStats.triggeredEffects', 'conditionalQualities[].when.configurationId', 'operation.*'], 'Amphistaff canonicalPlayerText (three forms, spear wielded/thrown, whip reach 2 + Pin/Trip, venom spit 10 squares once/24h); damage/qualities cloned from certified Quarterstaff, Spear and Electropole-thrown range');
  }

  // ---- Amphistaff: Yuuzhan Vong familiarity (structured alternate proficiency route; native Exotic classification unchanged) ----
  {
    const a = by('unmapped::Amphistaff');
    need(Array.isArray(a.proficiencyRules) && a.proficiencyRules.length === 0 && a.schemaFamily.proficiency === 'exotic', 'Amphistaff has no alternate proficiency rule and stays Exotic');
    a.proficiencyRules = [{ condition: 'wielder is Yuuzhan Vong and has Weapon Proficiency (simple weapons)', effect: 'considered proficient with the amphistaff', sourceClassification: 'Exotic Weapon', classifications: ['simple'], species: 'Yuuzhan Vong' }];
    note('amphistaff-yuuzhan-vong-familiarity', a.identityKey, ['proficiencyRules[0]'], 'Planner-supplied source ruling: Yuuzhan Vong with Weapon Proficiency (simple weapons) are considered proficient with the amphistaff; native Exotic classification unchanged; same rule shape as the Gungan Electropole route');
  }

  // ---- Atlatl / Cesta -----------------------------------------------------------------------------------------------
  {
    const ball = by('weapon-energy-ball'), bow = by('weapon-bow');
    need(ball.canonicalStats.range.variants.some((v) => v.condition === 'hurled by atlatl') && ball.canonicalStats.range.variants.some((v) => v.condition === 'hurled by cesta' && v.accurate === true), 'Energy Ball range variants (atlatl simple / cesta accurate simple)');
    const simpleRange = clone(bow.canonicalStats.attackProfiles[0].range); need(simpleRange.profileId === 'simple-weapons', 'simple-weapons range template');
    for (const [key, ident, accurate, id] of [['unmapped::Atlatl', 'Atlatl', false, 'atlatl-energy-ball-launcher'], ['unmapped::Cesta', 'Cesta', true, 'cesta-energy-ball-launcher']]) {
      const w = by(key);
      need(w.canonicalStats.attackProfiles.length === 1 && w.canonicalStats.attackProfiles[0].id === 'primary' && w.canonicalStats.payloadProfiles.length === 0, `${ident} has only melee primary`);
      const p = clone(w.canonicalStats.attackProfiles[0]);
      p.id = 'launcher'; p.label = 'Energy Ball launcher'; p.schemaFamily = { branch: 'ranged', subcategory: 'exotic', proficiency: 'exotic', exoticWeaponIdentity: ident };
      p.damage = { mode: 'varies-by-payload', diceCount: null, dieSize: null, flatBonus: 0, formula: 'Varies' };
      p.damageType = { mode: 'varies', types: [], qualifiers: [] };
      p.rateOfFire = clone(ball.canonicalStats.rateOfFire); p.range = clone(simpleRange);
      p.qualities = { ...clone(p.qualities), reach: false, accurate };
      p.resourceConsumption = { resource: 'energy-ball', baseUnits: 1, multiplier: 1 };
      p.notes = [`Damage comes from the loaded Energy Ball payload, not from the ${ident}'s melee damage. ${accurate ? 'Energy balls hurled by a cesta are Accurate and use simple-weapon range.' : 'Energy balls hurled by an atlatl use simple-weapon range.'}`];
      w.canonicalStats.attackProfiles.push(p);
      w.canonicalStats.payloadProfiles = [{ id: 'energy-ball', label: 'Energy Ball', default: true, costCredits: ball.canonicalStats.costCredits, weightKg: ball.canonicalStats.weightKg, availability: clone(ball.canonicalStats.availability), rateOfFire: clone(ball.canonicalStats.rateOfFire), damage: clone(ball.canonicalStats.baseDamage), damageMultiplier: 1, stun: clone(ball.canonicalStats.stun), damageType: clone(ball.canonicalStats.damageType), area: { enabled: false, shape: null, radiusSquares: null, notes: null }, specialEffects: [], notes: ['Payload-owned damage and type copied from the certified Energy Ball identity (weapon-energy-ball); the Energy Ball is not a second launcher identity.'] }];
      w.canonicalStats.ammo = { mode: 'single', status: 'established', required: true, type: 'energy-ball', capacityShots: null, capacityUnit: null, consumesPerAttack: 1, reloadAction: null, replaceable: true, integrated: false, rechargeable: false, acceptedPayloadFamily: 'energy-ball', acceptedAmmoIdentities: ['Energy Ball'], damageSource: 'loaded-ammo', payloadDerived: true, scopedToAttackProfiles: ['launcher'], sourceStatus: 'Only the launcher profile consumes an Energy Ball; the melee profile uses no ammunition. Loaded capacity is not stated by the source.' };
      note(id, key, ['canonicalStats.attackProfiles[launcher]', 'canonicalStats.payloadProfiles', 'canonicalStats.ammo'], `${ident} canonicalPlayerText (hurls energy balls; usable in melee); payload values copied from weapon-energy-ball; range from the certified simple-weapons range template (${accurate ? 'Accurate per the Energy Ball cesta rule' : 'not Accurate'})`);
    }
  }

  // ---- Electropole: make the Gungan proficiency route structured (profiles already exist) -----------------------------
  {
    const e = by('weapon-gungan-electropole');
    need(e.canonicalStats.attackProfiles.map((p) => p.id).join() === 'melee,thrown' && e.proficiencyRules.length === 1 && !e.proficiencyRules[0].species, 'Electropole has melee+thrown profiles and one prose-only rule');
    e.proficiencyRules[0].species = 'Gungan';
    note('electropole-gungan-route-structured', e.identityKey, ['proficiencyRules[0].species'], 'Electropole canonicalPlayerText (Gungans with Weapon Proficiency (simple weapons) are proficient); melee and thrown attack profiles already certified');
  }

  // ---- Shock Stick ---------------------------------------------------------------------------------------------------
  {
    const s = by('unmapped::Shock Stick');
    need(s.canonicalStats.configurationStates.length === 0 && s.operation.bayonetMount?.rifleProficiencyWaivesAdvancedMeleeNonproficiencyPenalty === true, 'Shock Stick bayonetMount structured predicate');
    s.canonicalStats.configurationStates = [
      { id: 'handheld', label: 'Handheld', default: true, attackUsable: true },
      { id: 'mounted-bayonet', label: 'Mounted on a rifle as a bayonet', default: false, attackUsable: true },
    ];
    note('shock-stick-configurations', s.identityKey, ['canonicalStats.configurationStates'], 'Shock Stick canonicalPlayerText (can be mounted as a rifle bayonet; wielder proficient with that rifle takes no nonproficiency penalty) — no second attack profile; proficiency waiver stays in operation.bayonetMount');
  }

  // ---- Vibrobayonet ----------------------------------------------------------------------------------------------------
  {
    const v = by('unmapped::Vibrobayonet'), vd = by('weapon-vibrodagger');
    need(v.canonicalStats.configurationStates.length === 0 && v.operation.detachedTreatAs === 'Vibrodagger' && vd.canonicalStats.attackProfiles[0].id === 'primary', 'Vibrobayonet detachedTreatAs + Vibrodagger primary');
    v.canonicalStats.configurationStates = [
      { id: 'mounted-on-rifle', label: 'Mounted on a rifle', default: true, attackUsable: true },
      { id: 'detached', label: 'Detached (functions as a Vibrodagger)', default: false, attackUsable: true },
    ];
    v.canonicalStats.wieldingRules = [
      { id: 'mounted-requires-two-hands', effect: 'requires-two-hands', condition: 'mounted-on-rifle' },
      { id: 'mounted-incompatible-with-folded-stock', effect: 'unavailable', condition: 'host-rifle-stock-folded' },
    ];
    v.canonicalStats.attackProfiles[0].activationRequirements = [{ type: 'configuration', id: 'mounted-on-rifle' }];
    v.operation = { ...v.operation, mountedOnRifle: { ...v.operation.mountedOnRifle, threatensAfterHostRifleRangedAttack: true, canMakeAttacksOfOpportunity: true }, configurationResolution: { detached: { resolveAsIdentityKey: vd.identityKey, resolveAsProfileId: 'primary' } } };
    note('vibrobayonet-configurations', v.identityKey, ['canonicalStats.configurationStates', 'canonicalStats.wieldingRules', 'attackProfiles[primary].activationRequirements', 'operation.mountedOnRifle', 'operation.configurationResolution'], 'Vibrobayonet canonicalPlayerText (mounted: two hands, no folded stock, threatens/AoO after rifle fire; detached functions as a vibrodagger) — detached delegates to the certified Vibrodagger attack, no duplicated stats');
  }
  // ---- Vibrobayonet: mounted-on-rifle host weapon becomes a double weapon (host-weapon configuration augmentation) ----------
  {
    const v = by('unmapped::Vibrobayonet'), club = by('unmapped::Club/Baton');
    need(club.canonicalStats.attackProfiles[0].id === 'primary' && !v.operation.hostWeaponAugmentation && v.qualities.doubleWeapon === false, 'Club primary profile exists; Vibrobayonet not globally a double weapon');
    v.operation = { ...v.operation, hostWeaponAugmentation: { 'mounted-on-rifle': {
      hostWeaponGroup: 'rifle',
      availableWhen: [{ condition: 'mounted-on-rifle' }, { condition: 'host-rifle-stock-folded', negate: true }],
      grantsDoubleWeapon: { ends: [
        { id: 'vibrobayonet-end', resolveAsIdentityKey: v.identityKey, resolveAsProfileId: 'primary' },
        { id: 'rifle-butt-club-end', resolveAsIdentityKey: club.identityKey, resolveAsProfileId: 'primary' },
      ] },
      notes: ['A rifle with a mounted vibrobayonet may be wielded as a double weapon: the vibrobayonet end is treated normally, the other end as a club (Core rule). Attack count, penalties and full-round behaviour belong to the existing double-weapon rules.'],
    } } };
    note('vibrobayonet-mounted-rifle-double-weapon', v.identityKey, ['operation.hostWeaponAugmentation'], 'Planner-supplied Core rule: rifle + mounted vibrobayonet = double weapon (vibrobayonet end + club end). Club end delegated to certified Club/Baton; neither Vibrobayonet nor rifles are globally double weapons');
  }
  return log;
}
