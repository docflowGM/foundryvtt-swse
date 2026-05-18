// holonet-messenger.jsx — Thread List, Conversation, Info, GM Dashboard

const { THREADS, MESSAGES, INVITE, PLAYERS, GM, NPCS, person } = window.HOLO;

/* ── tiny helpers ── */
const cx = (...args) => args.filter(Boolean).join(' ');
const toneColor = (id) => {
  const p = person(id);
  if (!p) return 'var(--accent)';
  const map = { '--f-jedi':'var(--f-jedi)','--f-noble-r':'var(--f-noble-r)','--f-noble-c':'var(--f-noble-c)',
    '--f-sith':'var(--f-sith)','--f-mil':'var(--f-mil)','--f-scout':'var(--f-scout)','--f-crim':'var(--f-crim)',
    '--f-jedi-2':'var(--f-jedi-2)','--accent':'var(--accent)' };
  return map[p.tone] || 'var(--accent)';
};
const initials = (name) => name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || '??';

/* ── Avatar ── */
function Avatar({ id, size = 36 }) {
  const p = person(id);
  const color = toneColor(id);
  const label = p?.glyph || initials(p?.name || '?');
  return (
    <div className="hl-avatar" style={{ width: size, height: size, minWidth: size,
      border: `1.5px solid ${color}40`, background: `color-mix(in oklch, ${color} 10%, transparent)`,
      boxShadow: `inset 0 0 16px ${color}18, 0 0 8px ${color}12` }}>
      <span style={{ color, fontFamily: 'var(--font-display)', fontSize: size * 0.52, lineHeight: 1 }}>{label}</span>
    </div>
  );
}

/* ── Thread List ── */
function ThreadList({ activeId, onSelect, viewAs, showInvite, onAccept, onDecline, onNew, searchQ, onSearch }) {
  const mine = viewAs === 'player';
  const threads = mine ? THREADS.filter(t => t.participants.includes('p_kier')) : THREADS;
  const cats = [
    { key:'party', label:'Channels',     kinds:['party'] },
    { key:'side',  label:'Side Threads', kinds:['side'] },
    { key:'priv',  label:'Private',      kinds:['private'] },
    { key:'cont',  label:'Contacts',     kinds:['contact','gm'] },
  ];
  const filtered = searchQ ? threads.filter(t => t.title.toLowerCase().includes(searchQ.toLowerCase()) || t.preview?.toLowerCase().includes(searchQ.toLowerCase())) : threads;
  const totalUnread = threads.reduce((s,t) => s + (t.unread||0), 0);

  return (
    <div className="hl-tlist">
      <div className="hl-tlist-top">
        <div className="hl-tlist-hd">
          <span className="hl-label" style={{ fontSize: 10, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--accent)' }}>
            Transmissions {totalUnread > 0 && <span className="hl-badge" style={{marginLeft:6}}>{totalUnread}</span>}
          </span>
          <button className="hl-ghost-btn" onClick={onNew}>＋ New</button>
        </div>
        <div className="hl-search-wrap">
          <span className="hl-search-icon">◌</span>
          <input className="hl-search" placeholder="Search threads…" value={searchQ} onChange={e=>onSearch(e.target.value)} />
        </div>
      </div>

      <div className="hl-tlist-scroll">
        {showInvite && mine && <InviteCard onAccept={onAccept} onDecline={onDecline} />}
        {cats.map(cat => {
          const items = filtered.filter(t => cat.kinds.includes(t.kind));
          if (!items.length) return null;
          return (
            <div key={cat.key} className="hl-cat">
              <div className="hl-cat-label">{cat.label}</div>
              {items.map(t => <ThreadItem key={t.id} t={t} active={activeId===t.id} viewAs={viewAs} onClick={() => onSelect(t.id)} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThreadItem({ t, active, viewAs, onClick }) {
  const isGmPrivate = viewAs === 'gm' && t.kind === 'private';
  const kindIcon = { party:'#', side:'◈', private:'⊕', contact:'◇', gm:'★' }[t.kind] || '✦';
  return (
    <button className={cx('hl-titem', active && 'on', isGmPrivate && 'gm-priv')} onClick={onClick}>
      <span className="hl-titem-icon">{kindIcon}</span>
      <span className="hl-titem-body">
        <span className="hl-titem-top">
          <span className="hl-titem-title">{t.title}</span>
          <span className="hl-titem-right">
            {t.unread > 0 && <span className="hl-badge">{t.unread}</span>}
            <span className="hl-titem-time">{t.time}</span>
          </span>
        </span>
        {isGmPrivate && <span className="hl-chip warn" style={{marginBottom:2}}>PRIVATE · GM VIEW</span>}
        <span className="hl-titem-preview">{t.preview}</span>
        <div className="hl-titem-chips">
          {t.kind==='party' && <span className="hl-chip party">Party</span>}
          {t.locked && <span className="hl-chip locked">Locked</span>}
          {t.notify==='muted' && <span className="hl-chip muted">Muted</span>}
          {t.notify==='mentions' && <span className="hl-chip muted">Mentions only</span>}
        </div>
      </span>
    </button>
  );
}

function InviteCard({ onAccept, onDecline }) {
  const sender = person(INVITE.from);
  return (
    <div className="hl-invite">
      <div className="hl-invite-badge">
        <span className="hl-pulse-dot"></span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.25em', textTransform:'uppercase', color:'var(--accent)' }}>Holochat Request</span>
      </div>
      <div className="hl-invite-from">
        <Avatar id={INVITE.from} size={32} />
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)' }}>{sender?.name}</div>
          <div style={{ fontSize:10, color:'var(--ink-faint)', fontFamily:'var(--font-mono)' }}>{sender?.org}</div>
        </div>
      </div>
      <p style={{ fontSize:11, color:'var(--ink-dim)', margin:'6px 0 8px', lineHeight:1.4 }}>{INVITE.body}</p>
      <div style={{ display:'flex', gap:8 }}>
        <button className="hl-btn-accent" style={{ flex:1 }} onClick={onAccept}>Accept</button>
        <button className="hl-btn-ghost" style={{ flex:1 }} onClick={onDecline}>Decline</button>
      </div>
    </div>
  );
}

/* ── Conversation ── */
function ConversationView({ thread, viewAs, chatStyle, onInfoToggle, infoOpen, onSend, onHijack }) {
  const [text, setText] = React.useState('');
  const [attachMenu, setAttachMenu] = React.useState(false);
  const [persona, setPersona] = React.useState('gm_table');
  const [pendingAttach, setPendingAttach] = React.useState(null);
  const scrollRef = React.useRef(null);
  const msgs = thread ? (MESSAGES[thread.id] || []) : [];
  const isGm = viewAs === 'gm';

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread?.id, msgs.length]);

  if (!thread) return (
    <div className="hl-conv-empty">
      <div style={{ fontFamily:'var(--font-display)', fontSize:48, color:'var(--accent)', opacity:.4 }}>✉</div>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--ink-faint)', marginTop:8 }}>Select a thread</div>
    </div>
  );

  const parts = thread.participants.map(id => person(id)).filter(Boolean);
  const attachTypes = [
    {k:'credits',  icon:'₢', label:'Credits'},
    {k:'actor',    icon:'◇', label:'Actor'},
    {k:'item',     icon:'⌬', label:'Item'},
    {k:'journal',  icon:'◉', label:'Journal'},
    {k:'roll',     icon:'⚄', label:'Roll Result'},
    {k:'job',      icon:'⊞', label:'Job Posting'},
  ];
  const personas = [GM, ...NPCS].map(p => ({id:p.id, name:p.name}));

  const handleSend = () => {
    if (!text.trim() && !pendingAttach) return;
    onSend({ thread, text, persona: isGm ? persona : 'p_kier', attach: pendingAttach });
    setText(''); setPendingAttach(null); setAttachMenu(false);
  };

  return (
    <div className={cx('hl-conv', chatStyle === 'terminal' && 'terminal')}>
      {/* Header */}
      <div className="hl-conv-header">
        <div className="hl-conv-header-left">
          <div style={{ fontSize:15, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-syne)' }}>{thread.title}</div>
          <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
            {parts.map(p => (
              <span key={p.id} className="hl-chip" style={{ color: toneColor(p.id), borderColor: toneColor(p.id)+'44' }}>{p.name}</span>
            ))}
            {thread.gmVisible && <span className="hl-chip gm-vis">GM visible</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {isGm && <button className="hl-icon-btn red" title="Intercept / Hijack thread" onClick={onHijack}>⌧ INTERCEPT</button>}
          <button className={cx('hl-icon-btn', infoOpen && 'on')} onClick={onInfoToggle}>ⓘ Info</button>
        </div>
      </div>

      {/* Messages */}
      <div className="hl-messages" ref={scrollRef}>
        {msgs.map(m => <Message key={m.id} msg={m} viewAs={viewAs} style={chatStyle} />)}
      </div>

      {/* Composer */}
      <div className="hl-composer">
        {isGm && (
          <div className="hl-persona-row">
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--ink-faint)' }}>Sending as</span>
            <select className="hl-persona-select" value={persona} onChange={e => setPersona(e.target.value)}>
              <option value="gm_table">GM (yourself)</option>
              {NPCS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
        )}
        {pendingAttach && (
          <div className="hl-attach-preview">
            <span style={{ fontSize:18 }}>{attachTypes.find(a=>a.k===pendingAttach)?.icon}</span>
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{pendingAttach} attachment</span>
            <button className="hl-ghost-btn" onClick={()=>setPendingAttach(null)}>✕</button>
          </div>
        )}
        <div className="hl-composer-input-row">
          <button className="hl-attach-btn" onClick={()=>setAttachMenu(v=>!v)} title="Attach">⊞</button>
          <textarea className="hl-composer-ta" rows={2}
            placeholder={`Message ${thread.title}…`}
            value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }} />
          <button className="hl-send-btn" onClick={handleSend} disabled={!text.trim() && !pendingAttach}>
            <span>Send</span><span style={{fontSize:14}}>▶</span>
          </button>
        </div>
        {attachMenu && (
          <div className="hl-attach-menu">
            {attachTypes.map(a => (
              <button key={a.k} className="hl-attach-opt" onClick={()=>{ setPendingAttach(a.k); setAttachMenu(false); }}>
                <span className="hl-attach-opt-icon">{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Messages ── */
function Message({ msg, viewAs, style }) {
  const isTerminal = style === 'terminal';
  if (msg.type === 'system') return <SystemMsg msg={msg} />;
  if (msg.type === 'pin') return <PinMsg msg={msg} />;
  if (msg.type === 'credits') return <CreditCard msg={msg} />;
  if (msg.type === 'attach') return <AttachCard msg={msg} />;
  if (msg.type === 'job') return <JobMsgCard jobId={msg.jobId} />;

  const sender = person(msg.from);
  const isOwn = msg.from === 'p_kier' || (viewAs === 'gm' && msg.from === 'gm_table');
  const color = toneColor(msg.from);
  const isGmMsg = msg.from === 'gm_table';

  if (isTerminal) {
    return (
      <div className="hl-msg terminal">
        <div className="hl-msg-term-meta" style={{ color }}>
          [{msg.time}] {sender?.handle || sender?.name}
          {isGmMsg && <span style={{ marginLeft:8, padding:'1px 6px', border:`1px solid ${color}60`, fontSize:8, letterSpacing:'.2em' }}>GM</span>}
        </div>
        <div className="hl-msg-term-body">&gt; {msg.text}</div>
      </div>
    );
  }

  return (
    <div className={cx('hl-msg', isOwn && 'own')}>
      {!isOwn && <Avatar id={msg.from} size={34} />}
      <div className="hl-msg-bubble" style={isOwn
        ? { background: `color-mix(in oklch, var(--accent) 14%, oklch(.16 .04 280))`, borderColor: 'var(--accent)44' }
        : { background: isGmMsg ? `color-mix(in oklch, var(--f-noble-r) 8%, oklch(.13 .05 278))` : 'oklch(.16 .04 280 / .7)', borderColor: isGmMsg ? 'var(--f-noble-r)33' : 'oklch(.85 .18 200 / .13)' }
      }>
        {!isOwn && (
          <div className="hl-msg-meta">
            <span style={{ color, fontFamily:'var(--font-mono)', fontSize:10, fontWeight:600 }}>{sender?.name}</span>
            {isGmMsg && <span className="hl-chip gm-vis" style={{padding:'1px 5px',fontSize:8}}>GM</span>}
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)', marginLeft:'auto' }}>{msg.time}</span>
          </div>
        )}
        <div className="hl-msg-text">{msg.text}</div>
        {isOwn && <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)', textAlign:'right', marginTop:4 }}>{msg.time}</div>}
      </div>
      {isOwn && <Avatar id={msg.from} size={34} />}
    </div>
  );
}

function SystemMsg({ msg }) {
  return (
    <div className="hl-sys-msg">
      <span className="hl-sys-line"></span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:9.5, color:'var(--ink-faint)', letterSpacing:'.08em', whiteSpace:'nowrap', padding:'0 10px' }}>{msg.text}</span>
      <span className="hl-sys-line"></span>
    </div>
  );
}

function PinMsg({ msg }) {
  return (
    <div className="hl-pin-msg">
      <span style={{ color:'var(--zero)', fontSize:12 }}>◉</span>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--zero)', letterSpacing:'.1em' }}>PINNED</span>
      <span style={{ fontSize:11, color:'var(--ink-dim)', fontStyle:'italic' }}>{msg.text}</span>
    </div>
  );
}

function CreditCard({ msg }) {
  const [anim, setAnim] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(()=>setAnim(true), 300); return ()=>clearTimeout(t); }, []);
  const sender = person(msg.from);
  const recipient = person(msg.to);
  return (
    <div className="hl-credit-card">
      <div className="hl-credit-card-shimmer" style={{ opacity: anim ? 1 : 0 }}></div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ fontSize:28, color:'var(--pos)', lineHeight:1 }}>₢</div>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:22, color:'var(--pos)', letterSpacing:'.08em' }}>
            {anim ? `${msg.amount.toLocaleString()} CR` : '--- CR'}
          </div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)', marginTop:2, letterSpacing:'.12em' }}>
            {sender?.name} → {recipient?.name}
          </div>
        </div>
      </div>
      {msg.memo && (
        <div style={{ borderTop:'1px solid oklch(.85 .18 145 / .18)', marginTop:8, paddingTop:6, fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-dim)', fontStyle:'italic' }}>
          "{msg.memo}"
        </div>
      )}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
        <span className="hl-chip" style={{ color:'var(--pos)', borderColor:'var(--pos)44', fontSize:9 }}>{anim ? '✓ RECEIVED' : '⟳ PROCESSING'}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)' }}>{msg.time}</span>
      </div>
    </div>
  );
}

function AttachCard({ msg }) {
  const icons = { journal:'◉', item:'⌬', actor:'✦', roll:'⚄' };
  const colors = { journal:'var(--f-jedi)', item:'var(--f-noble-r)', actor:'var(--accent)', roll:'var(--zero)' };
  const icon = icons[msg.kind] || '◈';
  const color = colors[msg.kind] || 'var(--accent)';
  const sender = person(msg.from);
  return (
    <div className={cx('hl-msg', msg.from === 'p_kier' && 'own')} style={{ marginBottom: 8 }}>
      {msg.from !== 'p_kier' && <Avatar id={msg.from} size={34} />}
      <div className="hl-attach-card" style={{ borderColor: `${color}44` }}>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div style={{ width:36, height:36, borderRadius:8, background:`color-mix(in oklch, ${color} 12%, transparent)`, border:`1px solid ${color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color, flexShrink:0 }}>{icon}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.2em', textTransform:'uppercase', color, marginBottom:2 }}>{msg.kind}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.name}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-faint)', marginTop:1 }}>{msg.subtitle}</div>
          </div>
          <button className="hl-ghost-btn" style={{ marginLeft:'auto', flexShrink:0 }}>View →</button>
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)', marginTop:6, textAlign:'right' }}>Shared by {sender?.name} · {msg.time}</div>
      </div>
      {msg.from === 'p_kier' && <Avatar id={msg.from} size={34} />}
    </div>
  );
}

function JobMsgCard({ jobId }) {
  const job = window.HOLO.JOBS.find(j => j.id === jobId);
  if (!job) return null;
  const poster = person(job.posterId);
  const color = toneColor(job.posterId);
  return (
    <div className="hl-job-embed" style={{ borderColor: `${color}44` }}>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <Avatar id={job.posterId} size={32} />
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--ink-faint)' }}>Job Posting via {poster?.name}</div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--ink)', fontFamily:'var(--font-syne)', marginTop:2 }}>{job.title}</div>
        </div>
      </div>
      <p style={{ fontSize:12, color:'var(--ink-dim)', margin:'0 0 8px', lineHeight:1.5 }}>{job.brief.slice(0,140)}…</p>
      <div style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6 }}>
          {job.tags.map(t => <span key={t} className="hl-chip">{t}</span>)}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--pos)' }}>₢ {job.reward.credits.toLocaleString()}</span>
          <button className="hl-btn-accent" style={{ padding:'5px 12px', fontSize:11 }}>View Job →</button>
        </div>
      </div>
    </div>
  );
}

/* ── Thread Info Panel ── */
function ThreadInfoPanel({ thread, onClose, viewAs }) {
  const [notif, setNotif] = React.useState(thread?.notify || 'on');
  if (!thread) return null;
  const parts = thread.participants.map(id => person(id)).filter(Boolean);
  const owner = person(thread.owner);
  const isGm = viewAs === 'gm';

  return (
    <div className="hl-info-panel">
      <div className="hl-info-header">
        <span style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.28em', textTransform:'uppercase', color:'var(--accent)' }}>Thread Info</span>
        <button className="hl-ghost-btn" onClick={onClose}>✕</button>
      </div>

      <div className="hl-info-section">
        <div className="hl-info-label">Participants ({parts.length})</div>
        {parts.map(p => (
          <div key={p.id} className="hl-info-person">
            <Avatar id={p.id} size={28} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)' }}>{p.role || p.org || ''}</div>
            </div>
            {p.id === thread.owner && <span className="hl-chip" style={{ color:'var(--f-noble-r)', borderColor:'var(--f-noble-r)44', flexShrink:0 }}>Owner</span>}
            {p.id === 'gm_table' && <span className="hl-chip gm-vis" style={{ flexShrink:0 }}>GM</span>}
            {isGm && p.id !== 'gm_table' && (
              <button className="hl-ghost-btn" style={{ padding:'2px 6px', fontSize:10 }} title="Remove">✕</button>
            )}
          </div>
        ))}
        {isGm && (
          <button className="hl-ghost-btn" style={{ width:'100%', marginTop:6, padding:'6px', fontSize:10 }}>＋ Insert Actor</button>
        )}
      </div>

      <div className="hl-info-section">
        <div className="hl-info-label">Notifications</div>
        {['on','mentions','muted'].map(v => (
          <label key={v} className="hl-radio-row">
            <input type="radio" name="notif" checked={notif===v} onChange={()=>setNotif(v)} />
            <span style={{ fontSize:12, color: notif===v ? 'var(--accent)' : 'var(--ink-dim)' }}>
              {{ on:'All messages', mentions:'Mentions only', muted:'Muted' }[v]}
            </span>
          </label>
        ))}
      </div>

      {thread.pinned?.length > 0 && (
        <div className="hl-info-section">
          <div className="hl-info-label">Pinned</div>
          {thread.pinned.map(pid => {
            const msgs = MESSAGES[thread.id] || [];
            const m = msgs.find(m => m.id === pid);
            if (!m) return null;
            return (
              <div key={pid} style={{ fontSize:11, color:'var(--ink-dim)', padding:'6px 8px', background:'oklch(0 0 0 / .28)', borderRadius:6, border:'1px solid oklch(.85 .18 200 / .12)', fontStyle:'italic' }}>
                "{m.text}"
              </div>
            );
          })}
        </div>
      )}

      <div className="hl-info-section">
        <div className="hl-info-label">Actions</div>
        <button className="hl-action-btn">◉ Pin a message</button>
        <button className="hl-action-btn">⊕ Add member</button>
        {!thread.locked && <button className="hl-action-btn warn">Leave thread</button>}
        <button className="hl-action-btn">Archive</button>
        {isGm && <>
          <div style={{ height:1, background:'oklch(.85 .18 200 / .1)', margin:'6px 0' }}></div>
          <button className="hl-action-btn gm">Lock thread for all</button>
          <button className="hl-action-btn gm">Close for everyone</button>
          <button className="hl-action-btn gm">Convert to Mission Log</button>
        </>}
      </div>
    </div>
  );
}

/* ── GM Dashboard ── */
function GMDashboard({ hijacking, onDismissHijack, onSelectThread, activeThread }) {
  const [selectedNpc, setSelectedNpc] = React.useState('n_unknown');
  const [targetThread, setTargetThread] = React.useState(activeThread?.id || 't_party');
  const [dramaMode, setDramaMode] = React.useState(true);
  const [insertDone, setInsertDone] = React.useState(false);

  return (
    <>
      {/* Dramatic hijack overlay */}
      {hijacking && (
        <div className="hl-hijack-overlay" onClick={onDismissHijack}>
          <div className="hl-hijack-content">
            <div className="hl-hijack-glitch">SIGNAL INTERCEPTED</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--neg)', letterSpacing:'.2em', marginTop:8 }}>
              CHANNEL COMPROMISED · ORIGIN MASKED
            </div>
            <div style={{ marginTop:16, fontFamily:'var(--font-mono)', fontSize:11, color:'var(--ink-faint)' }}>
              {NPCS.find(n=>n.id===selectedNpc)?.name || 'UNKNOWN SENDER'} inserted into thread
            </div>
            <button className="hl-btn-accent" style={{ marginTop:20 }} onClick={e=>{e.stopPropagation();onDismissHijack();}}>
              Confirm &amp; Proceed
            </button>
          </div>
        </div>
      )}

      <div className="hl-gm-panel">
        <div className="hl-info-header" style={{ marginBottom:12 }}>
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:'.24em', color:'var(--f-noble-r)' }}>GM OVERSIGHT</span>
          <span className="hl-chip" style={{ color:'var(--f-noble-r)', borderColor:'var(--f-noble-r)44' }}>Full Access</span>
        </div>

        <div className="hl-info-section">
          <div className="hl-info-label" style={{ color:'var(--f-noble-r)' }}>Thread Intercept</div>
          <div style={{ fontSize:11, color:'var(--ink-faint)', marginBottom:8, fontFamily:'var(--font-mono)' }}>Insert an NPC into an existing thread</div>
          <select className="hl-select" value={targetThread} onChange={e=>setTargetThread(e.target.value)} style={{ marginBottom:6 }}>
            {THREADS.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <select className="hl-select" value={selectedNpc} onChange={e=>setSelectedNpc(e.target.value)} style={{ marginBottom:6 }}>
            {NPCS.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <label className="hl-radio-row" style={{ marginBottom:8 }}>
            <input type="checkbox" checked={dramaMode} onChange={e=>setDramaMode(e.target.checked)} />
            <span style={{ fontSize:11, color: dramaMode ? 'var(--neg)' : 'var(--ink-dim)' }}>Dramatic intercept effect</span>
          </label>
          <button className="hl-action-btn gm" style={{ fontWeight:700 }}
            onClick={() => { if(dramaMode){ onSelectThread && onSelectThread(targetThread); setTimeout(()=>{ window.__triggerHijack && window.__triggerHijack(); },100); } else { alert('Subtle: '+selectedNpc+' silently added to thread'); } }}>
            ⌧ Execute Intercept
          </button>
        </div>

        <div className="hl-info-section">
          <div className="hl-info-label" style={{ color:'var(--f-noble-r)' }}>Credit Injection</div>
          <div style={{ fontSize:11, color:'var(--ink-faint)', marginBottom:8, fontFamily:'var(--font-mono)' }}>Award credits directly to a player</div>
          <select className="hl-select" style={{ marginBottom:6 }}>
            {PLAYERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="hl-input" type="number" placeholder="Amount (CR)" style={{ marginBottom:6 }} />
          <input className="hl-input" type="text" placeholder="Memo (optional)" style={{ marginBottom:6 }} />
          <button className="hl-btn-accent" style={{ width:'100%' }}>₢ Send Credits</button>
        </div>

        <div className="hl-info-section">
          <div className="hl-info-label" style={{ color:'var(--f-noble-r)' }}>Thread Stats</div>
          {[
            { label:'Total Threads', val: THREADS.length },
            { label:'Private Threads', val: THREADS.filter(t=>t.kind==='private').length },
            { label:'Party Channels', val: THREADS.filter(t=>t.kind==='party'||t.kind==='side').length },
            { label:'Active NPCs', val: NPCS.length },
          ].map(s => (
            <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid oklch(.85 .18 200 / .08)' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-faint)' }}>{s.label}</span>
              <span style={{ fontFamily:'var(--font-display)', fontSize:16, color:'var(--f-noble-r)', lineHeight:1 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── New Thread modal ── */
function NewThreadModal({ onClose, onCreate }) {
  const [kind, setKind] = React.useState('side');
  const [name, setName] = React.useState('');
  const [selected, setSelected] = React.useState([]);
  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const everyone = [...PLAYERS, GM, ...NPCS];
  const canCreate = kind === 'private' ? selected.length >= 1 : name.trim().length > 0;

  return (
    <div className="hl-modal-bg" onClick={onClose}>
      <div className="hl-modal" onClick={e=>e.stopPropagation()}>
        <div className="hl-info-header">
          <span style={{ fontFamily:'var(--font-display)', fontSize:16, letterSpacing:'.24em', color:'var(--accent)' }}>New Transmission</span>
          <button className="hl-ghost-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {[['side','Side Thread'],['private','Private Chat']].map(([v,l])=>(
            <button key={v} className={cx('hl-ghost-btn', kind===v&&'on')} onClick={()=>setKind(v)} style={{ flex:1, padding:'8px', justifyContent:'center' }}>{l}</button>
          ))}
        </div>

        {kind === 'side' && (
          <input className="hl-input" style={{ marginBottom:10 }} placeholder="Channel name…" value={name} onChange={e=>setName(e.target.value)} />
        )}

        <div style={{ fontFamily:'var(--font-mono)', fontSize:9, letterSpacing:'.2em', textTransform:'uppercase', color:'var(--ink-faint)', marginBottom:8 }}>
          {kind==='private' ? 'Who to message' : 'Add Members'}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflowY:'auto', paddingRight:4 }}>
          {everyone.filter(p=>p.id!=='p_kier').map(p => (
            <label key={p.id} className={cx('hl-recipient-row', selected.includes(p.id)&&'on')}>
              <input type="checkbox" style={{ display:'none' }} checked={selected.includes(p.id)} onChange={()=>toggle(p.id)} />
              <Avatar id={p.id} size={28} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--ink)' }}>{p.name}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--ink-faint)' }}>{p.role||p.org||''}</div>
              </div>
              <span style={{ fontSize:18, color: selected.includes(p.id) ? 'var(--accent)' : 'var(--ink-faint)' }}>{selected.includes(p.id) ? '✦' : '◇'}</span>
            </label>
          ))}
        </div>

        <button className="hl-btn-accent" style={{ width:'100%', marginTop:14 }} disabled={!canCreate}
          onClick={()=>{ onCreate({ kind, name, participants: selected }); onClose(); }}>
          {kind==='private' ? `Open Holochat` : `Create "${name||'Channel'}"`}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ThreadList, ConversationView, ThreadInfoPanel, GMDashboard, NewThreadModal });
