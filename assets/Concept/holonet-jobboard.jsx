// holonet-jobboard.jsx — Job Board (player + GM views)

const { JOBS, NPCS, PLAYERS, person, byId } = window.HOLO;

const STATUS_META = {
  open:        { label:'Open',        color:'var(--accent)' },
  accepted:    { label:'Accepted',    color:'var(--pos)' },
  in_progress: { label:'In Progress', color:'var(--zero)' },
  completed:   { label:'Completed',   color:'var(--ink-faint)' },
  expired:     { label:'Expired',     color:'var(--neg)' },
  closed:      { label:'Closed',      color:'var(--ink-faint)' },
};

function JobBoard({ viewAs, layout, onLayoutToggle, onOpenThread }) {
  const [filter, setFilter]   = React.useState('all');
  const [selected, setSelected] = React.useState(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [jobs, setJobs] = React.useState(JOBS);
  const isGm = viewAs === 'gm';

  const filters = ['all','open','accepted','completed'];
  const visible = jobs.filter(j => filter === 'all' || j.status === filter ||
    (filter === 'accepted' && ['accepted','in_progress'].includes(j.status)));

  const handleAccept = (jobId) => {
    setJobs(prev => prev.map(j => j.id === jobId ? {...j, status:'accepted', accepted:[...j.accepted,'p_kier']} : j));
    setSelected(jobId);
  };

  const handlePost = (jobData) => {
    const newJob = { id:'job_'+Date.now(), ...jobData, status:'open', accepted:[], thread:null };
    setJobs(prev => [newJob, ...prev]);
    setComposerOpen(false);
  };

  return (
    <div className="jb-root">
      {/* Toolbar */}
      <div className="jb-toolbar">
        <div className="jb-toolbar-left">
          <span className="jb-title">
            <span style={{fontFamily:'var(--font-display)',fontSize:20,letterSpacing:'.24em',color:'var(--accent)'}}>JOB BOARD</span>
            {isGm && <span className="hl-chip" style={{color:'var(--f-noble-r)',borderColor:'var(--f-noble-r)44',marginLeft:8}}>GM</span>}
          </span>
          <div className="jb-filters">
            {filters.map(f => (
              <button key={f} className={cx('jb-filter', filter===f && 'on')} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <div className="hl-viewas">
            <button className={cx(layout==='grid'&&'on')} onClick={()=>onLayoutToggle('grid')}>⊞ Grid</button>
            <button className={cx(layout==='list'&&'on')} onClick={()=>onLayoutToggle('list')}>≡ List</button>
          </div>
          {isGm && (
            <button className="hl-btn-accent" onClick={()=>setComposerOpen(true)}>＋ Post Job</button>
          )}
        </div>
      </div>

      <div className={cx('jb-content', selected && 'has-detail')}>
        {/* Cards */}
        <div className={cx('jb-cards', layout)}>
          {visible.length === 0 && (
            <div style={{padding:24,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--ink-faint)',letterSpacing:'.14em',textTransform:'uppercase'}}>No postings found.</div>
          )}
          {visible.map(job => (
            <JobCard key={job.id} job={job} layout={layout} active={selected===job.id}
              onClick={()=>setSelected(selected===job.id?null:job.id)} />
          ))}
        </div>

        {/* Detail */}
        {selected && (() => {
          const job = jobs.find(j=>j.id===selected);
          if(!job) return null;
          return <JobDetail job={job} isGm={isGm} onAccept={handleAccept} onClose={()=>setSelected(null)} onOpenThread={onOpenThread} />;
        })()}
      </div>

      {/* GM Composer */}
      {composerOpen && <JobComposer onClose={()=>setComposerOpen(false)} onPost={handlePost} />}
    </div>
  );
}

function JobCard({ job, layout, active, onClick }) {
  const poster = person(job.posterId);
  const color = poster?.tone ? `var(${poster.tone})` : 'var(--accent)';
  const st = STATUS_META[job.status] || STATUS_META.open;
  const isList = layout === 'list';

  if (isList) {
    return (
      <button className={cx('jb-list-row', active && 'on')} onClick={onClick}>
        <div className="jb-list-title">{job.title}</div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {job.tags.map(t=><span key={t} className="hl-chip">{t}</span>)}
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--pos)',whiteSpace:'nowrap'}}>₢ {job.reward.credits.toLocaleString()}</div>
        <span className="hl-chip" style={{color:st.color,borderColor:st.color+'44',whiteSpace:'nowrap'}}>{st.label}</span>
        <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--ink-faint)',whiteSpace:'nowrap'}}>{poster?.name}</div>
      </button>
    );
  }

  return (
    <button className={cx('jb-card', active && 'on')} onClick={onClick} style={{'--card-color':color}}>
      <div className="jb-card-header">
        <div className="jb-card-poster">
          <div className="jb-card-avatar" style={{background:`color-mix(in oklch,${color} 14%,transparent)`,border:`1px solid ${color}44`,color}}>{poster?.glyph||'◇'}</div>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'var(--ink)'}}>{poster?.name}</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--ink-faint)'}}>{poster?.org||poster?.posterRole}</div>
          </div>
        </div>
        <span className="hl-chip" style={{color:st.color,borderColor:st.color+'44'}}>{st.label}</span>
      </div>
      <div className="jb-card-title">{job.title}</div>
      <p className="jb-card-brief">{job.brief.slice(0,100)}…</p>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
        {job.tags.map(t=><span key={t} className="hl-chip">{t}</span>)}
      </div>
      <div className="jb-card-footer">
        <div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:13,color:'var(--pos)',fontWeight:700}}>₢ {job.reward.credits.toLocaleString()}</div>
          {job.reward.items?.length > 0 && <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--ink-faint)'}}>+{job.reward.items.length} item reward</div>}
        </div>
        <div style={{fontFamily:'var(--font-mono)',fontSize:9,color:'var(--ink-faint)',textAlign:'right'}}>
          <div>XP {job.reward.xp?.toLocaleString()}</div>
          <div>{job.deadline}</div>
        </div>
      </div>
    </button>
  );
}

function JobDetail({ job, isGm, onAccept, onClose, onOpenThread }) {
  const poster = person(job.posterId);
  const color = poster?.tone ? `var(${poster.tone})` : 'var(--accent)';
  const st = STATUS_META[job.status] || STATUS_META.open;
  const canAccept = job.status === 'open' && !job.accepted.includes('p_kier');

  return (
    <div className="jb-detail">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <span className="hl-chip" style={{color:st.color,borderColor:st.color+'44'}}>{st.label}</span>
        <button className="hl-ghost-btn" onClick={onClose}>✕</button>
      </div>

      <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:12}}>
        <div className="jb-card-avatar" style={{background:`color-mix(in oklch,${color} 14%,transparent)`,border:`1px solid ${color}44`,color,width:40,height:40,fontSize:20}}>{poster?.glyph||'◇'}</div>
        <div>
          <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--ink-faint)'}}>{poster?.org||''}</div>
          <div style={{fontSize:11,fontWeight:600,color}}>{poster?.name}</div>
        </div>
      </div>

      <div style={{fontFamily:'var(--font-syne)',fontWeight:800,fontSize:17,color:'var(--ink)',marginBottom:10,lineHeight:1.2}}>{job.title}</div>

      <p style={{fontSize:12,color:'var(--ink-dim)',lineHeight:1.6,marginBottom:14}}>{job.brief}</p>

      <div className="jb-detail-rewards">
        <div className="jb-reward-block">
          <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.2em',color:'var(--ink-faint)',textTransform:'uppercase',marginBottom:4}}>Credits</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:24,color:'var(--pos)',letterSpacing:'.06em'}}>₢ {job.reward.credits.toLocaleString()}</div>
        </div>
        {job.reward.xp > 0 && (
          <div className="jb-reward-block">
            <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.2em',color:'var(--ink-faint)',textTransform:'uppercase',marginBottom:4}}>XP</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:24,color:'var(--zero)',letterSpacing:'.06em'}}>{job.reward.xp.toLocaleString()}</div>
          </div>
        )}
        {job.reward.items?.map((it,i)=>(
          <div key={i} className="jb-reward-block">
            <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.2em',color:'var(--ink-faint)',textTransform:'uppercase',marginBottom:4}}>Item</div>
            <div style={{fontSize:12,color:'var(--f-noble-r)',fontWeight:600}}>{it.name}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'10px 0'}}>
        {job.tags.map(t=><span key={t} className="hl-chip">{t}</span>)}
        <span className="hl-chip" style={{color:'var(--ink-faint)'}}>{job.deadline}</span>
        <span className="hl-chip" style={{color:'var(--ink-faint)'}}>{job.visibility}</span>
      </div>

      {job.accepted.length > 0 && (
        <div style={{marginBottom:12}}>
          <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:6}}>Accepted by</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {job.accepted.map(id=>{ const p=person(id); return <span key={id} className="hl-chip" style={{color:p?.tone?`var(${p.tone})`:'var(--accent)'}}>{p?.name||id}</span>; })}
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:'auto'}}>
        {canAccept && (
          <button className="hl-btn-accent" style={{width:'100%',padding:'10px'}} onClick={()=>onAccept(job.id)}>
            Accept Job
          </button>
        )}
        {job.status === 'accepted' && (
          <button className="hl-ghost-btn" style={{width:'100%',padding:'9px'}} onClick={()=>onOpenThread&&onOpenThread(job.thread)}>
            Open Job Thread →
          </button>
        )}
        {isGm && (
          <>
            <button className="hl-action-btn gm" style={{width:'100%'}}>Pay Job Reward</button>
            <button className="hl-action-btn gm" style={{width:'100%'}}>Close Job</button>
          </>
        )}
      </div>
    </div>
  );
}

function JobComposer({ onClose, onPost }) {
  const [form, setForm] = React.useState({
    title:'', brief:'', posterId:'n_venn', rewardCredits:0, rewardXp:1000, rewardItems:'',
    tags:'', deadline:'Open', visibility:'All Party'
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = (e) => {
    e.preventDefault();
    onPost({
      title: form.title || 'Untitled Job',
      posterId: form.posterId,
      posterRole: person(form.posterId)?.org || '',
      tags: form.tags.split(',').map(t=>t.trim()).filter(Boolean),
      reward: { credits: parseInt(form.rewardCredits)||0, xp: parseInt(form.rewardXp)||0,
        items: form.rewardItems ? [{name:form.rewardItems}] : [] },
      brief: form.brief || 'No details provided.',
      visibility: form.visibility,
      deadline: form.deadline,
    });
  };

  return (
    <div className="hl-modal-bg" onClick={onClose}>
      <div className="hl-modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
        <div className="hl-info-header">
          <span style={{fontFamily:'var(--font-display)',fontSize:16,letterSpacing:'.24em',color:'var(--f-noble-r)'}}>GM · POST JOB</span>
          <button className="hl-ghost-btn" onClick={onClose}>✕</button>
        </div>
        <form className="jb-composer-form" onSubmit={handleSubmit}>
          <label className="jb-field">
            <span>Post as NPC</span>
            <select className="hl-select" value={form.posterId} onChange={e=>set('posterId',e.target.value)}>
              {NPCS.map(n=><option key={n.id} value={n.id}>{n.name} — {n.org}</option>)}
            </select>
          </label>
          <label className="jb-field">
            <span>Job Title</span>
            <input className="hl-input" placeholder="Kessel Run Escort, Quiet Retrieval…" value={form.title} onChange={e=>set('title',e.target.value)} />
          </label>
          <label className="jb-field">
            <span>Brief</span>
            <textarea className="hl-input" rows={4} style={{resize:'vertical'}} placeholder="Describe the job, risks, and expectations…" value={form.brief} onChange={e=>set('brief',e.target.value)} />
          </label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            <label className="jb-field">
              <span>Credits ₢</span>
              <input className="hl-input" type="number" min={0} value={form.rewardCredits} onChange={e=>set('rewardCredits',e.target.value)} />
            </label>
            <label className="jb-field">
              <span>XP</span>
              <input className="hl-input" type="number" min={0} value={form.rewardXp} onChange={e=>set('rewardXp',e.target.value)} />
            </label>
            <label className="jb-field">
              <span>Item Reward</span>
              <input className="hl-input" placeholder="Optional" value={form.rewardItems} onChange={e=>set('rewardItems',e.target.value)} />
            </label>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <label className="jb-field">
              <span>Tags (comma-separated)</span>
              <input className="hl-input" placeholder="Combat, Stealth…" value={form.tags} onChange={e=>set('tags',e.target.value)} />
            </label>
            <label className="jb-field">
              <span>Visibility</span>
              <select className="hl-select" value={form.visibility} onChange={e=>set('visibility',e.target.value)}>
                <option>All Party</option>
                <option>Direct · Kier</option>
                <option>Direct · Vexa</option>
                <option>Direct · J0-N1</option>
                <option>Direct · Mara</option>
              </select>
            </label>
          </div>
          {/* Preview */}
          <div style={{background:'oklch(0 0 0 / .3)',border:'1px solid oklch(.85 .18 200 / .15)',borderRadius:10,padding:12}}>
            <div style={{fontFamily:'var(--font-mono)',fontSize:9,letterSpacing:'.2em',textTransform:'uppercase',color:'var(--ink-faint)',marginBottom:8}}>Preview</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--ink)',fontFamily:'var(--font-syne)',marginBottom:4}}>{form.title||'Job Title'}</div>
            <p style={{fontSize:11,color:'var(--ink-dim)',margin:'0 0 8px',lineHeight:1.5}}>{(form.brief||'No brief yet.').slice(0,120)}{form.brief.length>120?'…':''}</p>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontFamily:'var(--font-mono)',fontSize:12,color:'var(--pos)'}}>₢ {parseInt(form.rewardCredits)||0}</span>
              <span style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--zero)'}}>+{parseInt(form.rewardXp)||0} XP</span>
            </div>
          </div>
          <button className="hl-btn-accent" type="submit" style={{width:'100%',padding:'11px'}}>Post to {form.visibility}</button>
        </form>
      </div>
    </div>
  );
}

Object.assign(window, { JobBoard });
