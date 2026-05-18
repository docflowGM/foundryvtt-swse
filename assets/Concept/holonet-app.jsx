// holonet-app.jsx — Main app shell + state

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "viewAs": "player",
  "activeApp": "messenger",
  "chatStyle": "modern",
  "jobLayout": "grid",
  "showInvite": true,
  "accentHue": 190
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const isGm = t.viewAs === 'gm';

  // Mutable state
  const [activeThread, setActiveThread] = React.useState('t_party');
  const [infoOpen, setInfoOpen]         = React.useState(false);
  const [newThreadOpen, setNewThreadOpen] = React.useState(false);
  const [hijacking, setHijacking]       = React.useState(false);
  const [searchQ, setSearchQ]           = React.useState('');
  const [msgMap, setMsgMap]             = React.useState(() => ({...window.HOLO.MESSAGES}));
  const [threads, setThreads]           = React.useState(() => [...window.HOLO.THREADS]);

  // Expose hijack trigger for GMDashboard
  React.useEffect(() => {
    window.__triggerHijack = () => setHijacking(true);
    return () => { delete window.__triggerHijack; };
  }, []);

  const thread = threads.find(th => th.id === activeThread) || null;

  const handleSend = ({ thread, text, persona, attach }) => {
    if (!text.trim() && !attach) return;
    const newMsg = {
      id: 'msg_' + Date.now(),
      type: attach || 'text',
      from: persona || (isGm ? 'gm_table' : 'p_kier'),
      text: text.trim(),
      time: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:false}),
      ...(attach === 'credits' ? {amount:500,memo:'Sent from app',to:'p_vexa',status:'received'} : {}),
      ...(attach === 'attach' ? {kind:'item',name:'New Item',subtitle:'Attached'} : {}),
    };
    setMsgMap(prev => ({...prev, [thread.id]: [...(prev[thread.id]||[]), newMsg]}));
    // Update thread preview
    setThreads(prev => prev.map(th => th.id===thread.id ? {...th, preview: text.trim().slice(0,60)||`[${attach}]`, time:'Just now'} : th));
  };

  const handleNewThread = ({ kind, name, participants }) => {
    const id = 'thread_'+Date.now();
    const newT = {
      id, kind, title: kind==='private' ? window.HOLO.person(participants[0])?.name||'Direct' : name||'New Channel',
      subtitle: kind==='private' ? 'Private holochat' : 'Side thread',
      participants: ['p_kier', ...participants, 'gm_table'],
      owner: 'p_kier', notify:'on', unread:0, gmVisible:true, locked:false,
      preview:'Thread created.', time:'Just now',
    };
    setThreads(prev=>[...prev, newT]);
    setMsgMap(prev=>({...prev,[id]:[{id:'sys_'+Date.now(),type:'system',text:`Kier created "${newT.title}".`,time:'Just now'}]}));
    setActiveThread(id);
  };

  const handleInviteAccept = () => {
    const id = 'thread_seris';
    const seris = window.HOLO.NPCS.find(n=>n.id==='n_seris');
    const newT = {
      id, kind:'contact', title:seris.name, subtitle:'NPC contact · Ord Mantell',
      participants:['p_kier','n_seris','gm_table'], owner:'n_seris',
      notify:'on', unread:1, gmVisible:true, locked:false,
      preview:'Seris Ko: So glad you answered.', time:'Just now',
    };
    setThreads(prev=>[...prev, newT]);
    setMsgMap(prev=>({...prev,[id]:[
      {id:'sys1',type:'system',text:'Kier accepted Seris Ko\'s holochat request.',time:'Just now'},
      {id:'m_seris1',type:'text',from:'n_seris',text:'So glad you answered. I have a proposition. Somewhere private.',time:'Just now'},
    ]}));
    setActiveThread(id);
  };

  const messengerMsgs = msgMap[activeThread] || [];

  return (
    <div className="stage">
      <div className="datapad">
        <div className="rivet tl"></div><div className="rivet tr"></div>
        <div className="rivet bl"></div><div className="rivet br"></div>
        <div className="bezel-label">SWSE · HOLOCOM DATAPAD</div>
        <div className="bezel-serial">SN-7749-KV</div>

        <div className="screen">
          {/* HUD */}
          <div className="hud">
            <div className="hud-l">
              <span className="hud-title">HOLOCOM</span>
              <span className="hud-pill">
                <span className={`hud-dot ${isGm ? 'gm' : ''}`}></span>
                {isGm ? 'GM ONLINE' : 'ONLINE'}
              </span>
            </div>
            <div className="hud-r">
              <div className="viewas">
                <button className={cx(!isGm && 'on')} onClick={()=>setTweak('viewAs','player')}>Player · Kier</button>
                <button className={cx(isGm && 'on gm')} onClick={()=>setTweak('viewAs','gm')}>GM</button>
              </div>
            </div>
          </div>

          {/* Shell */}
          <div className="shell">
            {/* App rail */}
            <div className="applist">
              <button className={cx('appbtn', t.activeApp==='messenger' && 'on')}
                onClick={()=>setTweak('activeApp','messenger')}>
                <span className="ic">✉</span>
                <span>Chat</span>
                {threads.reduce((s,th)=>s+(th.unread||0),0)>0 &&
                  <span className="pip">{threads.reduce((s,th)=>s+(th.unread||0),0)}</span>}
              </button>
              <button className={cx('appbtn', t.activeApp==='jobs' && 'on')}
                onClick={()=>setTweak('activeApp','jobs')}>
                <span className="ic">⊞</span>
                <span>Jobs</span>
                {window.HOLO.JOBS.filter(j=>j.status==='open').length>0 &&
                  <span className="pip">{window.HOLO.JOBS.filter(j=>j.status==='open').length}</span>}
              </button>
            </div>

            {/* Main content */}
            <div className="main-area">
              {t.activeApp === 'messenger' ? (
                <MessengerSurface
                  threads={threads} activeThread={activeThread} thread={thread}
                  msgs={messengerMsgs} viewAs={t.viewAs} chatStyle={t.chatStyle}
                  infoOpen={infoOpen} hijacking={hijacking} searchQ={searchQ}
                  showInvite={t.showInvite} newThreadOpen={newThreadOpen}
                  onSelectThread={setActiveThread}
                  onInfoToggle={()=>setInfoOpen(v=>!v)}
                  onHijack={()=>setHijacking(true)}
                  onDismissHijack={()=>setHijacking(false)}
                  onSend={handleSend}
                  onSearch={setSearchQ}
                  onNew={()=>setNewThreadOpen(true)}
                  onNewClose={()=>setNewThreadOpen(false)}
                  onNewCreate={handleNewThread}
                  onInviteAccept={handleInviteAccept}
                  onInviteDecline={()=>{}}
                />
              ) : (
                <JobBoard viewAs={t.viewAs} layout={t.jobLayout}
                  onLayoutToggle={(v)=>setTweak('jobLayout',v)}
                  onOpenThread={(id)=>{ if(id){ setTweak('activeApp','messenger'); setActiveThread(id); } }} />
              )}
            </div>
          </div>
        </div>

        {/* Tweaks */}
        <window.TweaksPanel>
          <window.TweakSection label="View" />
          <window.TweakRadio label="View as" value={t.viewAs}
            options={['player','gm']} onChange={v=>setTweak('viewAs',v)} />
          <window.TweakRadio label="App" value={t.activeApp}
            options={['messenger','jobs']} onChange={v=>setTweak('activeApp',v)} />
          <window.TweakSection label="Messenger" />
          <window.TweakRadio label="Chat style" value={t.chatStyle}
            options={['modern','terminal']} onChange={v=>setTweak('chatStyle',v)} />
          <window.TweakToggle label="Show invite banner" value={t.showInvite}
            onChange={v=>setTweak('showInvite',v)} />
          <window.TweakSection label="Job Board" />
          <window.TweakRadio label="Layout" value={t.jobLayout}
            options={['grid','list']} onChange={v=>setTweak('jobLayout',v)} />
        </window.TweaksPanel>
      </div>
    </div>
  );
}

function MessengerSurface({ threads, activeThread, thread, msgs, viewAs, chatStyle,
  infoOpen, hijacking, searchQ, showInvite, newThreadOpen,
  onSelectThread, onInfoToggle, onHijack, onDismissHijack, onSend, onSearch,
  onNew, onNewClose, onNewCreate, onInviteAccept, onInviteDecline }) {
  const isGm = viewAs === 'gm';
  const showGmPanel = isGm && infoOpen;
  const showInfoPanel = !isGm && infoOpen;

  return (
    <div className="ms-root">
      <window.ThreadList
        activeId={activeThread} onSelect={onSelectThread} viewAs={viewAs}
        showInvite={showInvite} onAccept={onInviteAccept} onDecline={onInviteDecline}
        onNew={onNew} searchQ={searchQ} onSearch={onSearch} />

      <window.ConversationView
        thread={thread} viewAs={viewAs} chatStyle={chatStyle}
        infoOpen={infoOpen} onInfoToggle={onInfoToggle}
        onSend={onSend} onHijack={onHijack} msgs={msgs} />

      {showInfoPanel && (
        <window.ThreadInfoPanel thread={thread} onClose={onInfoToggle} viewAs={viewAs} />
      )}
      {showGmPanel && (
        <window.GMDashboard hijacking={hijacking} onDismissHijack={onDismissHijack}
          onSelectThread={onSelectThread} activeThread={thread} />
      )}

      {newThreadOpen && (
        <window.NewThreadModal onClose={onNewClose} onCreate={onNewCreate} />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
