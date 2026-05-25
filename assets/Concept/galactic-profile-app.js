/* ============================================================
 * GALACTIC PROFILE PICKER — app logic
 *
 * 3-step flow mirroring scripts/apps/progression-framework/
 *   steps/galactic-profile-step.js:
 *     ProfileClassStep -> ProfileArchetypeStep -> ProfileReviewStep
 *
 * State.profileSelection = { classId, templateId, characterName }
 * State.businessResolved = Set of remaining-keys the player has
 * already addressed during review.
 * ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const state = {
  step: 'class',           // 'class' | 'archetype' | 'review'
  classId: null,
  templateId: null,
  characterName: '',
  businessResolved: new Set(),
};

/* ---------- helpers ---------- */
function abilityMod(score){ return Math.floor((Number(score||10)-10)/2); }
function fmtMod(m){ return (m>=0?'+':'') + m; }
function modKind(m){ return m>0?'pos':m<0?'neg':'zero'; }
function classById(id){ return window.GPP_CLASSES.find(c => c.id === id); }
function tplById(id){ return window.GPP_ARCHETYPES.find(t => t.id === id); }
function tplsForClass(id){ return window.GPP_ARCHETYPES.filter(t => t.classId === id); }
function mentorFor(classId){
  const cls = classById(classId);
  return (cls && window.GPP_MENTORS[cls.mentor]) || window.GPP_MENTORS.miraj;
}

/* ============================================================
 * MENTOR RAIL
 * ============================================================ */
function setMentor(classId, override){
  const cls = classById(classId);
  const m = mentorFor(classId);
  $('#mentor-img').src = m.portrait;
  $('#mentor-img').alt = m.name;
  $('#mentor-name').textContent = m.name.toUpperCase();
  $('#mentor-role').textContent = m.role.toUpperCase();
  $('#mentor-channel').textContent = '▸ ' + m.channel;
  let line = override || (cls && cls.mentorLine) ||
    'Pick a class. The rest of the file follows from there.';
  if (state.step === 'archetype' && state.templateId){
    const t = tplById(state.templateId);
    if (t){
      line = `Archetype on the slab: ${t.archetype} (${t.species}). ${t.description}`;
    }
  }
  if (state.step === 'review' && state.templateId){
    const t = tplById(state.templateId);
    const open = (t?.remaining || []).filter(r => !state.businessResolved.has(r.key));
    const blocking = open.filter(r => r.blocking).length;
    if (blocking === 0 && open.length === 0){
      line = `Manifest looks clean. Apply and the rest of chargen folds in around what's already filled.`;
    } else if (blocking === 0){
      line = `Manifest looks workable. ${open.length} optional choice${open.length===1?'':'s'} can be deferred — flag them if you want a recommendation.`;
    } else {
      line = `Hold up — ${blocking} item${blocking===1?'':'s'} still need${blocking===1?'s':''} your input before commit. The picker routes the rest to normal progression on apply.`;
    }
  }
  $('#mentor-text').innerHTML = line;
}

/* ============================================================
 * THEME (per-class hue)
 * ============================================================ */
function applyHue(hue){
  document.documentElement.style.setProperty('--hue', String(hue));
}

/* ============================================================
 * SUB-STEP RAIL + FOOTER
 * ============================================================ */
function updateRails(){
  const steps = ['class','archetype','review'];
  const ids = {class:'ss-class', archetype:'ss-arch', review:'ss-review'};
  steps.forEach((s,i) => {
    const el = $('#'+ids[s]);
    el.classList.remove('active','done');
    const curIdx = steps.indexOf(state.step);
    if (i < curIdx) el.classList.add('done');
    if (i === curIdx) el.classList.add('active');
  });

  $('#ss-class-v').textContent  = state.classId ? classById(state.classId).name.toUpperCase() : '—';
  $('#ss-arch-v').textContent   = state.templateId ? tplById(state.templateId).name.toUpperCase() : '—';
  const open = openBusinessCount();
  $('#ss-review-v').textContent = state.templateId ? (open === 0 ? 'CLEAN' : open + ' OPEN') : '—';

  $('#pr-class').textContent = state.classId ? classById(state.classId).name : '—';
  $('#pr-arch').textContent  = state.templateId ? tplById(state.templateId).name : '—';
  const blocking = openBusiness().filter(r => r.blocking).length;
  const o = $('#pr-open');
  o.textContent = state.templateId ? String(open) : '—';
  o.className = '';
  if (state.templateId){
    if (blocking > 0) o.className = 'warn';
    else if (open === 0) o.className = 'ok';
  }

  $('#step-readout').textContent = `STEP ${{class:1,archetype:2,review:3}[state.step]} / 3`;

  // Footer
  const back = $('#btn-back');
  const next = $('#btn-next');

  if (state.step === 'class'){
    back.textContent = '◂ Cancel · Back to Splash';
    next.textContent = 'Choose Archetype ▸';
    next.classList.remove('commit');
    next.classList.add('primary');
    next.disabled = !state.classId;
  } else if (state.step === 'archetype'){
    back.textContent = '◂ Change Class';
    next.textContent = 'Review &amp; Apply ▸';
    next.classList.remove('commit');
    next.classList.add('primary');
    next.disabled = !state.templateId;
  } else {
    back.textContent = '◂ Change Archetype';
    next.classList.remove('primary');
    next.classList.add('commit');
    const block = blocking - (state.businessResolved.has('name') ? 0 : 0);
    const truBlock = openBusiness().filter(r => r.blocking).length;
    if (truBlock === 0){
      next.textContent = 'Apply Profile · Begin Chargen ▸';
      next.disabled = false;
    } else {
      next.textContent = `${truBlock} required choice${truBlock===1?'':'s'} pending`;
      next.disabled = true;
    }
  }
}

function openBusiness(){
  if (!state.templateId) return [];
  const t = tplById(state.templateId);
  // 'name' is auto-resolved if state.characterName has length
  return (t.remaining || []).filter(r => {
    if (r.key === 'name') return !state.characterName.trim();
    return !state.businessResolved.has(r.key);
  });
}
function openBusinessCount(){ return openBusiness().length; }

/* ============================================================
 * STEP 1 — CLASS GRID
 * ============================================================ */
const CLASS_SIGILS = {
  jedi: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <line x1="50" y1="14" x2="50" y2="82"/>
    <line x1="34" y1="80" x2="66" y2="80" stroke-width="3"/>
    <line x1="40" y1="86" x2="60" y2="86" stroke-width="2"/>
    <circle cx="50" cy="80" r="3" fill="currentColor"/>
    <circle cx="50" cy="48" r="22" stroke-dasharray="2 5" opacity=".35"/>
  </svg>`,
  noble: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 28 L50 18 L80 28 L80 50 Q80 76 50 88 Q20 76 20 50 Z"/>
    <path d="M50 32 L55 46 L70 48 L58 56 L62 70 L50 62 L38 70 L42 56 L30 48 L45 46 Z" fill="currentColor" opacity=".6"/>
    <line x1="50" y1="18" x2="50" y2="6" opacity=".5"/>
  </svg>`,
  scoundrel: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <path d="M22 42 L42 42 L52 32 L74 32 L74 50 L66 50 L60 60 L42 60 L36 50 L22 50 Z"/>
    <line x1="60" y1="60" x2="68" y2="76"/>
    <circle cx="42" cy="50" r="3" fill="currentColor"/>
    <path d="M30 72 L42 78 L58 76 L66 82" opacity=".5" stroke-dasharray="2 3"/>
  </svg>`,
  scout: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <circle cx="50" cy="50" r="32"/>
    <circle cx="50" cy="50" r="18" opacity=".6"/>
    <circle cx="50" cy="50" r="6"/>
    <circle cx="50" cy="50" r="2" fill="currentColor"/>
    <line x1="50" y1="10" x2="50" y2="20"/>
    <line x1="50" y1="80" x2="50" y2="90"/>
    <line x1="10" y1="50" x2="20" y2="50"/>
    <line x1="80" y1="50" x2="90" y2="50"/>
    <line x1="22" y1="22" x2="32" y2="32" opacity=".55"/>
    <line x1="68" y1="68" x2="78" y2="78" opacity=".55"/>
  </svg>`,
  soldier: `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 24 L50 14 L80 24 L80 52 Q80 76 50 90 Q20 76 20 52 Z"/>
    <line x1="32" y1="42" x2="68" y2="42"/>
    <line x1="32" y1="54" x2="68" y2="54" opacity=".7"/>
    <line x1="50" y1="14" x2="50" y2="90" opacity=".4"/>
    <path d="M28 76 L72 76 M30 66 L70 66" opacity=".4" stroke-width="1"/>
  </svg>`,
};

function renderClassStep(){
  const grid = $('#class-grid');
  grid.innerHTML = window.GPP_CLASSES.map(c => `
    <div class="class-card ${state.classId===c.id?'selected':''}" data-class-id="${c.id}" style="--cc: oklch(.82 .17 ${c.hue})">
      <div class="id">${('0'+(window.GPP_CLASSES.indexOf(c)+1)).slice(-2)}/05</div>
      <div class="glyph">
        ${CLASS_SIGILS[c.sigil] || ''}
        ${c.portrait ? `<img class="cls-photo" src="${c.portrait}" alt="${c.name}" onerror="this.style.display='none'"/>` : ''}
      </div>
      <div class="meta">
        <div class="name">${c.name}</div>
        <div class="tag">${c.tagline}</div>
        <div class="stats">
          <span>HD <b>${c.hd}</b></span>
          <span>Skl <b>${c.trainedSkills}</b></span>
          <span>F<b>+${c.def.f}</b> R<b>+${c.def.r}</b> W<b>+${c.def.w}</b></span>
        </div>
      </div>
    </div>
  `).join('');
  grid.querySelectorAll('[data-class-id]').forEach(card => {
    card.addEventListener('click', () => {
      state.classId = card.dataset.classId;
      // auto-pick first template of class if not already in this class
      const tpls = tplsForClass(state.classId);
      if (!state.templateId || (state.templateId && tplById(state.templateId).classId !== state.classId)){
        state.templateId = tpls[0]?.id || null;
      }
      const c = classById(state.classId);
      applyHue(c.hue);
      setMentor(state.classId);
      renderClassDetail();
      // re-render cards' selected state
      grid.querySelectorAll('[data-class-id]').forEach(el => {
        el.classList.toggle('selected', el.dataset.classId === state.classId);
      });
      updateRails();
    });
  });
  renderClassDetail();
}

function renderClassDetail(){
  const c = state.classId ? classById(state.classId) : null;
  const root = $('#class-detail');
  if (!c){
    root.innerHTML = `<div style="grid-column:1/-1;padding:40px 8px;text-align:center;font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;color:var(--ink-faint);text-transform:uppercase;">Select a class above to view briefing</div>`;
    return;
  }
  const tpls = tplsForClass(c.id);
  root.innerHTML = `
    <div>
      <h4>◈ Vocation Brief — ${c.name}</h4>
      <p>${c.desc}</p>
      <p style="font-family:var(--font-mono);font-size:11px;letter-spacing:.05em;color:var(--ink-faint);margin-top:10px;">
        HD ${c.hd} · ${c.trainedSkills} trained skills · Fort +${c.def.f} / Ref +${c.def.r} / Will +${c.def.w}
      </p>
    </div>
    <div>
      <h4>◈ Available Archetypes (${tpls.length})</h4>
      <ul>
        ${tpls.map(t => `<li><span>${t.archetype}</span><b>${t.species}</b></li>`).join('')}
      </ul>
    </div>
  `;
}

/* ============================================================
 * STEP 2 — ARCHETYPE GRID
 * ============================================================ */
function archetypePlaceholderSVG(role){
  const isForce = (role||[]).includes('Force');
  const isMelee = (role||[]).includes('Melee');
  const isRanged = (role||[]).includes('Ranged');
  if (isForce){
    return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <circle cx="50" cy="38" r="14"/>
      <path d="M30 80 Q30 56 50 56 Q70 56 70 80"/>
      <path d="M30 38 L70 38" stroke-dasharray="2 4" opacity=".4"/>
      <circle cx="50" cy="50" r="36" opacity=".25" stroke-dasharray="3 5"/>
      <line x1="50" y1="14" x2="50" y2="6" opacity=".5"/>
    </svg>`;
  }
  if (isMelee){
    return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <line x1="20" y1="80" x2="76" y2="24"/>
      <path d="M70 30 L80 20 L82 28 L80 30 Z" fill="currentColor"/>
      <path d="M18 78 L26 70 L34 78 L26 86 Z" opacity=".6"/>
    </svg>`;
  }
  if (isRanged){
    return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M16 50 L60 50 L60 42 L74 42 L74 50 L84 50"/>
      <rect x="60" y="50" width="14" height="10"/>
      <circle cx="22" cy="50" r="5"/>
      <line x1="84" y1="50" x2="92" y2="50" opacity=".5"/>
    </svg>`;
  }
  return `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="50" cy="38" r="14"/>
    <path d="M30 82 Q30 58 50 58 Q70 58 70 82"/>
    <rect x="40" y="60" width="20" height="8" opacity=".5"/>
  </svg>`;
}

function tplImagePath(t){
  // Map archetype id → real portrait from assets/templates/.
  // Where the data id doesn't match a real asset (e.g. composite Just-A-Dude,
  // Engineer, Pistoleer-Scout, Commando) we fall back to the closest cousin
  // already in the system.
  const MAP = {
    jedi_guardian:        'assets/templates/jedi_guardian.webp',
    jedi_consular:        'assets/templates/jedi_consular.webp',
    jedi_defender:        'assets/templates/jedi_defender.webp',
    jedi_sentinel:        'assets/templates/jedi_sentinel.webp',
    noble_diplomat:       'assets/templates/noble_diplomat.webp',
    noble_leader:         'assets/templates/noble_leader.webp',
    noble_aristocrat:     'assets/templates/noble_aristocrat.webp',
    noble_duelist:        'assets/templates/noble_duelist.webp',
    scoundrel_pistoleer:  'assets/templates/scoundrel_pistoleer.webp',
    scoundrel_skillmonkey:'assets/templates/scoundrel_skill_monkey.webp',
    scoundrel_knuckledragger:'assets/templates/scoundrel_knuckledragger.webp',
    scoundrel_outlaw:     'assets/templates/scoundrel_outlaw.webp',
    scoundrel_brigand:    'assets/templates/scoundrel_brigand.webp',
    scout_sniper:         'assets/templates/scout_sniper.webp',
    scout_engineer:       'assets/templates/scout_skirmisher.webp',
    scout_pistoleer:      'assets/templates/scout_skirmisher.webp',
    scout_survivalist:    'assets/templates/scout_survivalist.webp',
    scout_infiltrator:    'assets/templates/scout_infiltrator.webp',
    soldier_just_a_dude:  'assets/templates/soldier_rifleman.webp',
    soldier_gunner:       'assets/templates/soldier_gunner.webp',
    soldier_brawler:      'assets/templates/soldier_brawler.webp',
    soldier_tank:         'assets/templates/soldier_tank.webp',
    soldier_commando:     'assets/templates/soldier_rifleman.webp',
  };
  return MAP[t.id] || null;
}

function renderArchetypeStep(){
  const c = state.classId ? classById(state.classId) : window.GPP_CLASSES[0];
  if (!state.classId){ state.classId = c.id; applyHue(c.hue); }
  $('#arch-title').innerHTML = `${c.name} · Archetype Profile <em>5 packaged builds — pick one</em>`;
  const tpls = tplsForClass(c.id);
  $('#arch-count').textContent = tpls.length;
  if (!state.templateId || tplById(state.templateId)?.classId !== c.id){
    state.templateId = tpls[0]?.id || null;
  }
  const grid = $('#arch-grid');
  grid.innerHTML = tpls.map(t => {
    const photo = tplImagePath(t);
    const ab = t.abilities;
    return `
      <div class="arch-card ${state.templateId===t.id?'selected':''}" data-template-id="${t.id}" style="--cc: oklch(.82 .17 ${t.hue||c.hue})">
        <div class="photo">
          <div class="pid">${t.id.toUpperCase()}</div>
          <div class="placeholder">${archetypePlaceholderSVG(t.role)}</div>
          ${photo ? `<img src="${photo}" alt="${t.archetype}" onerror="this.style.display='none'"/>` : ''}
          <div class="role-tags">${(t.role||[]).map(r => `<span>${r}</span>`).join('')}</div>
        </div>
        <div class="body">
          <div class="arch-name">${t.archetype}</div>
          <div class="species">${t.species} · ${t.background}</div>
          <div class="arch-desc">${t.description}</div>
          <div class="arch-stats">
            <div class="s"><div class="k">HP</div><div class="v">${t.hp}</div></div>
            <div class="s"><div class="k">REF</div><div class="v">${t.defenses.ref}</div></div>
            <div class="s"><div class="k">ATK</div><div class="v">${t.attack}</div></div>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-template-id]').forEach(card => {
    card.addEventListener('click', () => {
      state.templateId = card.dataset.templateId;
      state.businessResolved.clear();
      const t = tplById(state.templateId);
      const cls = classById(t.classId);
      applyHue(t.hue || cls.hue);
      setMentor(cls.id);
      renderArchetypeDetail();
      grid.querySelectorAll('[data-template-id]').forEach(el => {
        el.classList.toggle('selected', el.dataset.templateId === state.templateId);
      });
      updateRails();
    });
  });
  renderArchetypeDetail();
}

function renderArchetypeDetail(){
  const root = $('#arch-detail');
  const t = state.templateId ? tplById(state.templateId) : null;
  if (!t){ root.innerHTML = `<div style="grid-column:1/-1;padding:30px;text-align:center;font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;color:var(--ink-faint);text-transform:uppercase;">Select an archetype to preview</div>`; return; }
  const cls = classById(t.classId);
  const photo = tplImagePath(t);
  const ab = t.abilities;
  const abilities = ['str','dex','con','int','wis','cha'].map(k => {
    const m = abilityMod(ab[k]);
    return `<div class="ab"><div class="k">${k.toUpperCase()}</div><div class="v">${ab[k]}</div><div class="m ${modKind(m)}">${fmtMod(m)}</div></div>`;
  }).join('');
  root.innerHTML = `
    <div class="hero">
      ${photo ? `<img src="${photo}" alt="${t.archetype}" onerror="this.remove()"/>` : ''}
    </div>
    <div class="info">
      <div class="crumbs">${cls.name}<span class="sep">/</span>${t.archetype}<span class="sep">/</span>${(t.role||[]).join(' · ')}</div>
      <h2>${t.archetype}</h2>
      <div class="quote">“${t.quote}”</div>
      <div class="desc">${t.description}</div>
      <div class="ab-strip">${abilities}</div>
    </div>
  `;
}

/* ============================================================
 * STEP 3 — REVIEW / BUSINESS RESOLUTION
 * ============================================================ */
const BUSINESS_ICONS = {name:'✎', skills:'◇', skill:'◇', feat:'★', lang:'☰', tech:'⚙', talent:'◆'};
const BUSINESS_TARGETS = {
  name:'Identity Step',
  skills:'Skills Step',
  skill:'Skills Step',
  feat:'Feats Step',
  lang:'Identity / Language',
  tech:'Equipment Step',
  talent:'Talent Step',
};

function renderReviewStep(){
  const root = $('#review');
  const t = state.templateId ? tplById(state.templateId) : null;
  if (!t){ root.innerHTML = `<div style="grid-column:1/-1;padding:40px;text-align:center;font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;color:var(--ink-faint);text-transform:uppercase;">No archetype selected</div>`; return; }
  const cls = classById(t.classId);
  const photo = tplImagePath(t);
  const ab = t.abilities;
  const open = openBusiness();
  $('#rev-remain').textContent = open.length;

  const idBlock = `
    <div class="id-block">
      <div class="id-row"><span class="k">Class</span><span class="v">${cls.name}</span></div>
      <div class="id-row"><span class="k">Archetype</span><span class="v">${t.archetype}</span></div>
      <div class="id-row"><span class="k">Species</span><span class="v">${t.species}</span></div>
      <div class="id-row"><span class="k">Background</span><span class="v">${t.background}</span></div>
      <div class="id-row"><span class="k">Credits</span><span class="v">${t.credits}</span></div>
      <div class="id-row"><span class="k">HP</span><span class="v">${t.hp}</span></div>
    </div>
  `;

  // Business list — every "remaining" + auto-handled "name" row
  const businessRows = (t.remaining||[]).map(r => {
    const isName = r.key === 'name';
    const resolved = isName ? !!state.characterName.trim() : state.businessResolved.has(r.key);
    const cls = resolved ? 'resolved' : (r.blocking ? 'block' : '');
    const icon = resolved ? '✓' : (BUSINESS_ICONS[r.key] || '·');
    const target = BUSINESS_TARGETS[r.key] || 'Progression';
    return `
      <div class="biz-row ${cls}" data-biz="${r.key}">
        <div class="ico">${icon}</div>
        <div class="info">
          <div class="label">${r.label}</div>
          <div class="detail">${r.detail}</div>
        </div>
        <div class="step-hint">${resolved ? 'resolved' : '▸ ' + target}</div>
      </div>`;
  }).join('');

  const blocking = open.filter(r => r.blocking).length;
  const businessClass = (open.length === 0) ? 'clean' : '';
  const mentor = mentorFor(cls.id);

  root.innerHTML = `
    <div class="review-hero">
      <div class="photo">${photo ? `<img src="${photo}" alt="${t.archetype}" onerror="this.remove()"/>` : ''}</div>
      <input type="text" class="name-input" id="char-name" placeholder="Enter character name" value="${state.characterName.replace(/"/g,'&quot;')}" maxlength="32" />
      ${idBlock}
    </div>

    <div class="review-body">
      <div class="review-name">${t.archetype.toUpperCase()}</div>
      <div class="review-quote">“${t.quote}”</div>
      <div class="metrics">
        ${['str','dex','con','int','wis','cha'].map(k => {
          const m = abilityMod(ab[k]);
          return `<div class="metric"><div class="k">${k.toUpperCase()}</div><div class="v">${ab[k]}</div><div class="m ${modKind(m)}">${fmtMod(m)}</div></div>`;
        }).join('')}
      </div>
      <div class="defenses">
        <div class="d"><span class="k">Fort</span><span class="v">${t.defenses.fort}</span></div>
        <div class="d"><span class="k">Ref</span><span class="v">${t.defenses.ref}</span></div>
        <div class="d"><span class="k">Will</span><span class="v">${t.defenses.will}</span></div>
        <div class="d"><span class="k">Attack</span><span class="v">${t.attack}</span></div>
      </div>

      <div class="package">
        <div class="pkg-card">
          <div class="ph"><span>◈ Trained Skills</span><span class="ct">${t.trainedSkills.length}</span></div>
          <ul>${t.trainedSkills.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="pkg-card">
          <div class="ph"><span>◈ Feats</span><span class="ct">${t.feats.length}</span></div>
          <ul>${t.feats.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="pkg-card">
          <div class="ph"><span>◈ Talents</span><span class="ct">${t.talents.length}</span></div>
          <ul>${t.talents.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div class="pkg-card ${t.forcePowers.length===0?'empty':''}">
          <div class="ph"><span>◈ Force Powers</span><span class="ct">${t.forcePowers.length||'—'}</span></div>
          <ul>${t.forcePowers.length ? t.forcePowers.map(s => `<li>${s}</li>`).join('') : `<li>not a Force user</li>`}</ul>
        </div>
        <div class="pkg-card" style="grid-column:1/-1">
          <div class="ph"><span>◈ Starting Equipment</span><span class="ct">${t.equipment.length}</span></div>
          <ul style="columns:2;column-gap:18px;">${t.equipment.map(s => `<li>${s}</li>`).join('')}</ul>
        </div>
      </div>
    </div>

    <div class="business ${businessClass}">
      <div class="bh">
        <span>${open.length === 0 ? '◈ Manifest Clean' : '⚠ Remaining Business'}</span>
        <span class="ct">${open.length}/${(t.remaining||[]).length}</span>
      </div>
      <div class="business-list">${businessRows || '<div style="color:var(--ink-faint);font-family:var(--font-mono);font-size:11px;padding:8px;">No open items.</div>'}</div>
      <div class="mentor-rec">
        <b>${mentor.name}:</b> ${t.notes}
      </div>
      <div class="mentor-rec" style="border-color:color-mix(in oklch,var(--accent) 30%,transparent);">
        On apply, the picker seeds the progression session with these selections and routes you straight into the normal chargen flow. Open items above are surfaced inside the matching step — no rules are bypassed.
      </div>
    </div>
  `;

  // Name input
  const ni = $('#char-name');
  if (ni){
    ni.addEventListener('input', () => {
      state.characterName = ni.value;
      // re-render the affected biz row + footer counters
      const nameRow = root.querySelector('[data-biz="name"]');
      if (nameRow){
        const resolved = !!state.characterName.trim();
        nameRow.classList.toggle('resolved', resolved);
        nameRow.classList.toggle('block', !resolved);
        nameRow.querySelector('.ico').textContent = resolved ? '✓' : BUSINESS_ICONS.name;
        nameRow.querySelector('.step-hint').textContent = resolved ? 'resolved' : '▸ ' + BUSINESS_TARGETS.name;
      }
      $('#rev-remain').textContent = openBusiness().length;
      updateRails();
      setMentor(t.classId);
    });
  }
  // Biz row clicks toggle resolved (prototype-only — in real chargen this would route to the matching step)
  root.querySelectorAll('.biz-row').forEach(row => {
    row.addEventListener('click', () => {
      const k = row.dataset.biz;
      if (k === 'name'){ ni && ni.focus(); return; }
      if (state.businessResolved.has(k)) state.businessResolved.delete(k);
      else state.businessResolved.add(k);
      renderReviewStep();
      updateRails();
      setMentor(t.classId);
    });
  });
}

/* ============================================================
 * STEP NAV
 * ============================================================ */
function goStep(s){
  state.step = s;
  $$('.step-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === s));
  if (s === 'class') renderClassStep();
  if (s === 'archetype') renderArchetypeStep();
  if (s === 'review') renderReviewStep();
  setMentor(state.classId);
  updateRails();
  window.scrollTo({top:0, behavior:'smooth'});
}

$('#btn-back').addEventListener('click', () => {
  if (state.step === 'class'){
    // simulated splash return — flash mentor line
    setMentor(state.classId, 'Returning to chargen splash. Hit "Galactic Profile" again to resume, or pick "Build From Scratch" to enter the full progression engine without a template.');
    return;
  }
  if (state.step === 'archetype') return goStep('class');
  if (state.step === 'review') return goStep('archetype');
});
$('#btn-next').addEventListener('click', () => {
  if (state.step === 'class' && state.classId) return goStep('archetype');
  if (state.step === 'archetype' && state.templateId) return goStep('review');
  if (state.step === 'review'){
    const blocking = openBusiness().filter(r => r.blocking).length;
    if (blocking > 0) return;
    // Simulate commit
    const t = tplById(state.templateId);
    const cls = classById(t.classId);
    setMentor(cls.id,
      `<b>Profile applied.</b> Progression session seeded with <b>${t.archetype}</b> · ${t.species} · ${cls.name}.<br>
       Routing into normal chargen — only unresolved choices remain on the rails.`);
    document.querySelector('.work').style.opacity = .5;
    document.querySelector('.work').style.filter = 'blur(2px)';
    setTimeout(() => {
      document.querySelector('.work').style.opacity = '';
      document.querySelector('.work').style.filter = '';
    }, 1800);
  }
});

// Click sub-step pills to jump (only if allowed)
$$('.substep').forEach(s => {
  s.addEventListener('click', () => {
    const to = s.dataset.go;
    if (to === 'class') return goStep('class');
    if (to === 'archetype' && state.classId) return goStep('archetype');
    if (to === 'review' && state.templateId) return goStep('review');
  });
});

/* clock */
function tickClock(){
  const d = new Date();
  $('#clock').textContent = `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')} · UTC`;
}
tickClock(); setInterval(tickClock, 1000);

/* ============================================================
 * BOOT
 * ============================================================ */
function boot(){
  // default state: jedi pre-selected so the picker doesn't open empty
  state.classId = 'jedi';
  state.templateId = 'jedi_guardian';
  applyHue(classById(state.classId).hue);
  setMentor(state.classId);
  goStep('class');
}
boot();
