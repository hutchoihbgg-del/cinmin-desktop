// Desktop.js — Mint replica: wallpaper, icons (image-accurate), clock, mint menu

import { events } from '../core/EventBus.js';
import { fs } from '../core/FileSystem.js';

// Exactly as in screenshot: Computer, Home, Trash, Firefox Web Browser
const ICONS = [
  { id: 'explorer', label: 'Computer', icon: '🖥️', sublabel: '' },
  { id: 'explorer', label: 'Home', icon: '🏠', sublabel: '' },
  { id: 'explorer', label: 'Trash', icon: '🗑️', sublabel: '' },
  { id: 'htmlviewer', label: 'Firefox Web', sublabel: 'Browser', icon: '🦊' },
];

// Mint categories -> apps (real Cinmin apps mapped)
const MINT_APPS = [
  { name: 'Firefox Web Browser', cat: 'internet', icon: '🦊', app: 'htmlviewer' },
  { name: 'LibreOffice Writer', cat: 'office', icon: '📝', app: 'notepad' },
  { name: 'LibreOffice Calc', cat: 'office', icon: '📊', app: 'notepad' },
  { name: 'Terminal', cat: 'admin', icon: '>_', app: 'terminal' },
  { name: 'Files', cat: 'places', icon: '📁', app: 'explorer' },
  { name: 'Settings', cat: 'admin', icon: '⚙', app: 'settings' },
  { name: 'Software Manager', cat: 'admin', icon: '🧩', app: 'settings' },
  { name: 'Text Editor', cat: 'office', icon: '📄', app: 'notepad' },
];

export function initDesktop() {
  const desktopEl = document.getElementById('desktop');
  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');
  const clockEl = document.getElementById('clock');

  // --- icon positions ---
  function loadPos() { try { return JSON.parse(localStorage.getItem('cinmin:iconPos')||'{}'); } catch { return {}; } }
  function savePos(p) { localStorage.setItem('cinmin:iconPos', JSON.stringify(p)); }
  let iconPos = loadPos();

  function renderIcons() {
    const show = localStorage.getItem('cinmin:showIcons');
    if (show === 'false') { desktopEl.innerHTML=''; return; }
    desktopEl.innerHTML='';
    desktopEl.style.position='absolute';
    ICONS.forEach((item, idx) => {
      const el = document.createElement('button');
      el.className = 'desktop-icon mint-desktop-icon';
      el.dataset.app = item.id;
      // allow two-line label for Firefox
      const labelHtml = item.sublabel ? `${item.label}<br>${item.sublabel}` : item.label;
      el.innerHTML = `<span class="d-icon">${item.icon}</span><span class="d-label">${labelHtml}</span>`;
      const defaultX = 18;
      const defaultY = 16 + idx*92;
      const pos = iconPos[item.label] || { x: defaultX, y: defaultY };
      el.style.position='absolute';
      el.style.left=pos.x+'px';
      el.style.top=pos.y+'px';

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.desktop-icon').forEach(i=>i.classList.remove('selected'));
        el.classList.add('selected');
      });
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        events.emit('app:launch', item.id);
        trackRecent(item.id);
      });

      // draggable
      let dragging=false, sx=0, sy=0, ox=0, oy=0, moved=false;
      el.addEventListener('mousedown', (e)=>{
        if(e.button!==0) return;
        dragging=true; moved=false; sx=e.clientX; sy=e.clientY;
        ox=parseInt(el.style.left,10); oy=parseInt(el.style.top,10);
        el.style.zIndex=10;
      });
      const onMove=(e)=>{
        if(!dragging) return;
        const dx=e.clientX-sx, dy=e.clientY-sy;
        if(Math.abs(dx)>3||Math.abs(dy)>3) moved=true;
        let nx=ox+dx, ny=oy+dy;
        const maxX=desktopEl.clientWidth - el.offsetWidth - 8;
        const maxY=desktopEl.clientHeight - el.offsetHeight - 8;
        nx=Math.max(0,Math.min(nx,maxX)); ny=Math.max(0,Math.min(ny,maxY));
        el.style.left=nx+'px'; el.style.top=ny+'px';
      };
      const onUp=()=>{
        if(dragging){
          dragging=false; el.style.zIndex='';
          if(moved){ iconPos[item.label]={x:parseInt(el.style.left,10), y:parseInt(el.style.top,10)}; savePos(iconPos); }
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      desktopEl.appendChild(el);
    });
  }
  renderIcons();
  events.on('settings:changed', ()=>{ iconPos=loadPos(); renderIcons(); });

  desktopEl.addEventListener('click', (e)=>{ if(e.target===desktopEl) document.querySelectorAll('.desktop-icon').forEach(i=>i.classList.remove('selected')); });
  desktopEl.addEventListener('contextmenu', (e)=>{ e.preventDefault(); showDesktopMenu(e.clientX,e.clientY); });

  function showDesktopMenu(x,y){
    closeCtx();
    const menu=document.createElement('div'); menu.className='ctx-menu'; menu.style.left=x+'px'; menu.style.top=y+'px';
    menu.innerHTML=`<button data-a="refresh">↻ Refresh</button><button data-a="newFolder">📁 Create Folder</button><button data-a="newFile">📄 Create Text File</button><div class="ctx-sep"></div><button data-a="personalize">🎨 Personalize</button>`;
    document.body.appendChild(menu); clamp(menu);
    menu.querySelector('[data-a="refresh"]').addEventListener('click',()=>{renderIcons(); menu.remove();});
    menu.querySelector('[data-a="newFolder"]').addEventListener('click',()=>{const n=prompt('Folder name:','New Folder'); if(n){const r=fs.createFolder('/Home',n); if(!r.ok) alert(r.error);} menu.remove();});
    menu.querySelector('[data-a="newFile"]').addEventListener('click',()=>{const n=prompt('File name:','newfile.txt'); if(n){const r=fs.createFile('/Home',n,''); if(!r.ok) alert(r.error);} menu.remove();});
    menu.querySelector('[data-a="personalize"]').addEventListener('click',()=>{events.emit('app:launch','settings'); menu.remove();});
    setTimeout(()=>{const h=(ev)=>{if(!menu.contains(ev.target)){menu.remove(); document.removeEventListener('click',h);}}; document.addEventListener('click',h);},0);
  }
  function clamp(m){const r=m.getBoundingClientRect(); if(r.right>window.innerWidth) m.style.left=(window.innerWidth-r.width-8)+'px'; if(r.bottom>window.innerHeight-48) m.style.top=(window.innerHeight-48-r.height-8)+'px';}
  function closeCtx(){document.querySelectorAll('.ctx-menu').forEach(el=>el.remove());}

  // --- Mint menu logic ---
  const searchInput=document.getElementById('start-search');
  const catsEl=document.getElementById('mint-cats');
  const appsEl=document.getElementById('mint-apps');
  const noResults=document.getElementById('start-no-results');
  let activeCat='all';
  let searchQuery='';

  function renderMintApps(){
    appsEl.innerHTML='';
    let list = MINT_APPS.filter(a => {
      const matchCat = activeCat==='all' || a.cat===activeCat || (activeCat==='recent' && false);
      const matchSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
    // Recent pseudo-category: show trackRecent apps
    if(activeCat==='recent'){
      let ids=[]; try{ids=JSON.parse(localStorage.getItem('cinmin:recent')||'[]')}catch{}
      const map={explorer:'Files', terminal:'Terminal', notepad:'Text Editor', htmlviewer:'Firefox Web Browser', settings:'Settings'};
      list = ids.map(id=> MINT_APPS.find(a=>a.app===id) || { name: map[id]||id, icon:'◈', app:id, cat:'recent'}).filter(Boolean);
      if(searchQuery) list=list.filter(a=>a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    // Places category: show filesystem places
    if(activeCat==='places'){
      const places=[
        {name:'Home', icon:'🏠', app:'explorer'},
        {name:'Documents', icon:'📁', app:'explorer'},
        {name:'Downloads', icon:'📥', app:'explorer'},
        {name:'Pictures', icon:'🖼', app:'explorer'},
        {name:'Computer', icon:'🖥️', app:'explorer'},
      ];
      list = searchQuery ? places.filter(p=>p.name.toLowerCase().includes(searchQuery.toLowerCase())) : places;
    }
    if(list.length===0){ noResults.classList.remove('hidden'); return; }
    noResults.classList.add('hidden');
    list.forEach(item=>{
      const btn=document.createElement('button');
      btn.className='mint-app';
      btn.innerHTML=`<span class="mint-app-icon">${item.icon}</span> ${item.name}`;
      btn.addEventListener('click',()=>{
        startMenu.classList.add('hidden');
        events.emit('app:launch', item.app);
        trackRecent(item.app);
      });
      appsEl.appendChild(btn);
    });
  }

  catsEl.querySelectorAll('.mint-cat').forEach(btn=>{
    btn.addEventListener('click',()=>{
      catsEl.querySelectorAll('.mint-cat').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      activeCat=btn.dataset.cat;
      renderMintApps();
    });
  });
  searchInput?.addEventListener('input',()=>{ searchQuery=searchInput.value; renderMintApps(); });
  // taskbar quick icons
  document.querySelectorAll('.task-icon').forEach(btn=>{
    btn.addEventListener('click',()=>{ events.emit('app:launch', btn.dataset.app); trackRecent(btn.dataset.app); });
  });

  function toggleStart(){
    const willOpen=startMenu.classList.contains('hidden');
    startMenu.classList.toggle('hidden');
    if(willOpen){
      activeCat='all';
      catsEl.querySelectorAll('.mint-cat').forEach(b=>b.classList.toggle('active', b.dataset.cat==='all'));
      searchInput.value=''; searchQuery=''; renderMintApps();
      setTimeout(()=>searchInput?.focus(),40);
    }
  }
  startBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleStart(); });

  document.addEventListener('click', (e)=>{
    if(!startMenu.contains(e.target) && e.target!==startBtn && !e.target.closest('#start-btn')){
      startMenu.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){ startMenu.classList.add('hidden'); closeCtx(); }
    if(e.key==='Meta' || e.key==='OS'){ e.preventDefault(); toggleStart(); }
  });

  // initial
  renderMintApps();

  // clock
  function tick(){ clockEl.textContent=new Date().toLocaleTimeString([], {hour:'numeric', minute:'2-digit'}); }
  tick(); setInterval(tick, 1000*30);

  // wallpaper settings (keep purple default)
  function applyWallpaper(){
    const wp=localStorage.getItem('cinmin:wallpaper')||'default';
    const wall=document.getElementById('wallpaper');
    const map={
      default:'',
      blue:'linear-gradient(135deg,#0b1e3a,#1a5fb4)',
      purple:'linear-gradient(135deg,#1a0b2e,#7c3aed)',
      midnight:'linear-gradient(135deg,#0a0a14,#1e293b)',
    };
    if(wp==='default') wall.style.background='';
    else wall.style.background=map[wp];
  }
  applyWallpaper(); events.on('settings:changed', applyWallpaper);

  function trackRecent(appId){
    try{
      const raw=JSON.parse(localStorage.getItem('cinmin:recent')||'[]');
      const next=[appId, ...raw.filter(id=>id!==appId)].slice(0,5);
      localStorage.setItem('cinmin:recent', JSON.stringify(next));
    }catch{}
  }
  events.on('window:created', ({title})=>{
    const map={'File Explorer':'explorer','Terminal':'terminal','Notepad':'notepad','Browser':'htmlviewer','Settings':'settings'};
    if(map[title]) trackRecent(map[title]);
  });
}
