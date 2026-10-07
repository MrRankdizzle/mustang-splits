/* Mustang Splits: cross country pace board. See CLAUDE.md before editing. */
(function(){
'use strict';
const APP_VERSION='3.4.0'; // keep in sync with version.json
// 3.0.1: portrait only. Android's installed app honors this; iOS can't lock, so styles.css covers a sideways phone.
try{ const o=screen.orientation; if(o&&o.lock) o.lock('portrait').catch(()=>{}); }catch(e){}
const MAX=30, KEY='mustang-splits:v1'; // never rename KEY: it holds the coach's saved rosters, workouts and times
const EFFORTS=[['fast','Fast'],['tempo','Tempo'],['cv','CV'],['race','Race pace'],['easy','Easy'],['jog','Jog / float']];
const EFF=Object.fromEntries(EFFORTS);
// 2.13: a part with an effort and a distance but no time is effort-based (each runner's own pace), like "By effort":
// CV = CV pace, Tempo = threshold, Fast = interval, Race pace = 5K pace, Easy and Jog = easy.
const EFF_REF={fast:'interval',tempo:'threshold',cv:'cv',race:'5k',easy:'easy',jog:'easy'};
function segEffort(s){ return !!s&&(s.mode==='effort'||(+s.dist>0&&parseTime(s.value)==null&&!!EFF_REF[s.effort])); }
const segRef=s=>s.mode==='effort'?(s.paceRef||'cv'):(EFF_REF[s.effort]||'cv');
const MODES=[['total','Total time for this part'],['per400','Per 400m'],['permile','Per mile'],['perkm','Per km'],['effort','By effort (each runner’s own pace)']]; // effort: 2.11
const CPS=[[0,'Only at the end'],[100,'Every 100m'],[200,'Every 200m'],[300,'Every 300m'],[400,'Every 400m'],[500,'Every 500m'],[800,'Every 800m'],[1000,'Every 1000m'],[1609,'Every mile']];
const $=(s,r=document)=>r.querySelector(s);
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- time helpers ---------- */
function parseTime(str){
  if(str==null) return null; str=String(str).trim(); if(!str) return null;
  const parts=str.split(':'); if(parts.length>3) return null;
  let s=0; for(const p of parts){ if(p.trim()===''||isNaN(p)) return null; s=s*60+parseFloat(p); }
  return s>0?s:null;
}
function fmtClock(ms){
  if(!(ms>0)) ms=0;
  const t=Math.floor(ms/100), tenth=t%10, s=Math.floor(t/10);
  const h=Math.floor(s/3600), m=Math.floor(s%3600/60), sec=s%60;
  return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(sec).padStart(2,'0')+'.'+tenth;
}
function fmtSec(sec,dec){
  if(sec==null||!isFinite(sec)) return '–';
  if(dec===undefined) dec=1;
  const neg=sec<0; sec=Math.abs(sec);
  const r=dec?Math.round(sec*10)/10:Math.round(sec);
  const m=Math.floor(r/60+1e-9); const s=Math.max(0,r-m*60);
  let ss=(dec===2 || (dec && Math.abs(s-Math.round(s))>0.04))? s.toFixed(1) : String(Math.round(s));
  if(s<9.95) ss='0'+ss;
  return (neg?'-':'')+m+':'+ss;
}
function fmtDelta(d){
  if(Math.abs(d)<0.05) return '±0.0';
  return (d>0?'+':'−')+Math.abs(d).toFixed(1);
}
function fmtDist(m){
  m=Math.round(m);
  if(m>0 && m%1609===0) return (m/1609===1?'1 mile':(m/1609)+' miles');
  return m+'m';
}
function cls(d){
  const tol=+S.settings.tol||1;
  if(Math.abs(d)<=tol) return 'ok';
  if(d<0) return 'fast';
  return d>tol*3?'bad':'slow';
}
const WORD={ok:'On pace',fast:'Too fast',slow:'Behind',bad:'Well behind'}; // workouts: faster than plan is something to fix

/* ---------- state ---------- */
function freshRun(){ return {rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]}; }
function newWatch(name,workoutId){ const w={id:uid(),name:name,workoutId:workoutId||null,status:'idle',startAt:0,pausedT:0,run:freshRun(),athleteIds:[],athleteNames:[],autoName:null}; if(teamNow()) w.tm=1; return w; }
// 3.3: made while on a team (shared at once). Stopwatches from before joining are shared once they're started.
function teamNow(){ try{ return !!(SYNC&&syncMode()==='joined'); }catch(e){ return false; } }
function seg(effort,dist,mode,value,cp){ return {id:uid(),effort,dist,mode,value,cp}; }
function defaults(){
  const w1={id:uid(),name:'800 @ 2:24 (400 splits)',reps:1,rest:'',segments:[seg('race',800,'total','2:24',400)]};
  const w2={id:uid(),name:'200 fast / 800 tempo / 200 fast',reps:1,rest:'',segments:[seg('fast',200,'total','0:32',0),seg('tempo',800,'total','3:12',200),seg('fast',200,'total','0:32',0)]};
  const w3={id:uid(),name:'CV 5 × 1000m, 90s rest',reps:5,rest:'1:30',segments:[seg('cv',1000,'per400','1:28',200)]};
  return {v:1,settings:{tol:1,compact:false,sound:true,wake:false,liveLog:true,raceCols:2,coachName:'',coachAsked:false},workouts:[w1,w2,w3],roster:[],courses:[],prs:{},raceLog:[],series:[],meets:[],merges:[],places:[],weather:[],race:null,
    watches:[newWatch('Athlete 1',w1.id),newWatch('Group A',w2.id),newWatch('Group B',null)]};
}
// Brings saved data (from localStorage or a backup file) up to the current shape; null if it isn't ours.
function migrate(s){
  try{
    if(!s||!Array.isArray(s.watches)||!Array.isArray(s.workouts)) return null;
    s.settings=Object.assign({tol:1,compact:false,sound:true,wake:false,liveLog:true,raceCols:2,coachName:'',coachAsked:false},s.settings||{}); // liveLog 1.1.0; race columns and coach name 2.4.0
    if(!Array.isArray(s.roster)) s.roster=[]; // team roster added in 1.2.0
    s.watches.forEach(w=>{
      if(!w.run) w.run=freshRun(); if(!w.run.laps) w.run.laps=[]; if(!w.run.splits) w.run.splits=[];
      if(!Array.isArray(w.athleteIds)) w.athleteIds=[]; if(!Array.isArray(w.athleteNames)) w.athleteNames=[]; if(w.autoName===undefined) w.autoName=null;
      if(!String(w.name||'').trim()){ const n=w.athleteNames.filter(Boolean); if(n.length){ w.name=(n.length===1?n[0]:`${n[0]} + ${n.length-1}`).slice(0,40); w.autoName=w.name; } } // 2.13: stopwatches saved without a name (the autoName clash) get their runners' name
      // 2.0.1: started stopwatches carry their own plan copy. Saves from before get one from the current workout.
      if(w.plan===undefined) w.plan=(w.status!=='idle' && w.workoutId) ? planCopy(s.workouts.find(x=>x.id===w.workoutId)) : null;
    });
    if(s.race===undefined) s.race=null; // Race Mode (2.2.0)
    if(!Array.isArray(s.courses)) s.courses=[];   // 2.5.0: saved courses
    if(!s.prs||typeof s.prs!=='object') s.prs={};  // 2.5.0: {athleteId: [{dist, t}]}
    if(!Array.isArray(s.raceLog)) s.raceLog=[];   // 2.5.0: races saved on this phone
    if(!Array.isArray(s.series)) s.series=[];     // 2.7.0: meet series (link a meet across years)
    if(!Array.isArray(s.meets)) s.meets=[];       // 2.7.0: the meet schedule
    if(!Array.isArray(s.merges)) s.merges=[];     // 2.9.2: merged runners [{id: duplicate, to: real, at, byName}]
    if(!Array.isArray(s.places)) s.places=[];     // 3.2: race locations [{id, name, lat, lon, label, src, confirmed}]
    if(!Array.isArray(s.weather)) s.weather=[];   // 3.2: race-day weather (see the weather section)
    if(!Array.isArray(s.practice)) s.practice=[]; // 3.3.1: practice history on a phone without a team (End workout), latest 30
    if(!s.paceAdj||typeof s.paceAdj!=='object') s.paceAdj={}; // 2.11: target adjustments per runner (or group) and workout, sec per mile
    // 2.9.0: this season's series get their official meet names. Ids never change, so every link survives; a series
    // a coach already renamed by hand keeps that name (only the 2.7 seed name is replaced).
    s.series.forEach(x=>{ const r=SERIES_RENAME[x.id]; if(r&&x.name===r[0]) x.name=r[1]; });
    if(s.race){ if(s.race.goalSrc===undefined) s.race.goalSrc='custom'; if(s.race.courseId===undefined) s.race.courseId=null; if(s.race.meetId===undefined){ s.race.meetId=null; s.race.division=''; } }
    return s;
  }catch(e){ return null; }
}
let loadedSize=0;
const RESCUE='mustang-splits:race-rescue'; // the live race and stopwatches alone, written only when a full save fails
function load(){
  try{
    const raw=localStorage.getItem(KEY), s=raw?migrate(JSON.parse(raw)):null; loadedSize=raw?raw.length:0;
    const rs=JSON.parse(localStorage.getItem(RESCUE)||'null');
    if(s && rs && rs.at>(s.savedAt||0)){ s.race=rs.race||null; if(Array.isArray(rs.watches)) s.watches=rs.watches; } // newer than the last full save
    return s;
  }catch(e){ return null; }
}
const SERIES_RENAME={'s-winagamie-invite':['Winagamie Invite','Appleton West Terror Invite'],'s-kiel-invite':['Kiel Invite','Kiel Raiders Invite'],
  's-winagamie-meet':['Winagamie Meet','Nightfall Classic'],'s-wausau-east-invite':['Wausau East Invite','Smiley Invitational'],'s-mishicot-invite':['Mishicot Invite','Jim Bremser Memorial'],
  's-waupaca-invite':['Waupaca Invite','Waupaca Invitational'],'s-albany-invite':['Albany Invite','Albany Baertschi Invite'],'s-nec-conference':['NEC Conference','NEC Championship']};
const LOADED=load(); // null on a brand-new phone (shows the quick tour)
let S=LOADED||defaults();
let saveTimer=null;
let SYNC=null; // team sync API from sync.js; null means local-only (see the team sync bridge section)
// Never fails silently (2.6). If the phone's storage is full: drop the race log's quick copies (they're in
// IndexedDB) and retry; if that still fails, save the live race and stopwatches alone under RESCUE and say so.
// The trash, snapshots and race archive never live in this entry, so they can't crowd out a live race.
let saveFail=false, liveSize=loadedSize, hadRescue=(()=>{ try{ return !!localStorage.getItem(RESCUE); }catch(e){ return false; } })();
function saveNow(){
  S.savedAt=Date.now();
  const write=()=>{ const js=JSON.stringify(S); localStorage.setItem(KEY,js); liveSize=js.length; };
  try{ write(); }
  catch(e){
    let ok=false;
    if(S.raceLog && S.raceLog.length){ S.raceLog=[]; try{ write(); ok=true; }catch(e2){} }
    if(!ok){
      try{ localStorage.setItem(RESCUE,JSON.stringify({at:S.savedAt,race:S.race,watches:S.watches})); hadRescue=true; }catch(e3){}
      if(!saveFail){ saveFail=true; storageUI(); }
      return false;
    }
  }
  if(hadRescue){ try{ localStorage.removeItem(RESCUE); }catch(e){} hadRescue=false; }
  if(saveFail){ saveFail=false; storageUI(); }
  return true;
}
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ try{ shPush(); }catch(e){} saveNow(); if(SYNC) SYNC.localChanged(); },200); } // 3.3: shared stopwatch headers too
window.addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') saveNow(); });

/* ---------- data safety: local store, trash, snapshots (2.6) ---------- */
// Nothing is ever hard-deleted. Removing something puts a copy in the trash (TRASH, kept in IndexedDB, never in
// the live-data localStorage entry) and Recently deleted can put it back. In a team, Firestore also keeps every
// soft-deleted document. Snapshots of all local data (last 10) are taken before bulk actions. See CLAUDE.md.
const IDB_STORES=['trash','snapshots','races','official']; // official: imported career history (2.9)
let idbP=null;
function idb(){
  if(!idbP) idbP=new Promise(res=>{ try{ const q=indexedDB.open('mustang-splits',2); // v2 (2.9.0) adds 'official'
    q.onupgradeneeded=()=>IDB_STORES.forEach(n=>{ if(!q.result.objectStoreNames.contains(n)) q.result.createObjectStore(n,{keyPath:'key'}); });
    q.onsuccess=()=>res(q.result); q.onerror=q.onblocked=()=>res(null); }catch(e){ res(null); } });
  return idbP;
}
const lsStore=n=>'mustang-splits:store:'+n; // only if IndexedDB is unavailable (rare)
async function storeAll(n){
  const d=await idb();
  if(!d){ try{ return JSON.parse(localStorage.getItem(lsStore(n))||'[]'); }catch(e){ return []; } }
  return new Promise(res=>{ try{ const q=d.transaction(n).objectStore(n).getAll(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>res([]); }catch(e){ res([]); } });
}
async function storeWrite(n,fn){ // fn(objectStore) inside one transaction; resolves true when stored
  const d=await idb();
  if(!d){ let L=await storeAll(n); const os={put:o=>{ L=L.filter(x=>x.key!==o.key); L.push(o); },delete:k=>{ L=L.filter(x=>x.key!==k); }}; fn(os);
    try{ localStorage.setItem(lsStore(n),JSON.stringify(L)); return true; }catch(e){ return false; } }
  return new Promise(res=>{ try{ const t=d.transaction(n,'readwrite'); fn(t.objectStore(n)); t.oncomplete=()=>res(true); t.onerror=t.onabort=()=>res(false); }catch(e){ res(false); } });
}
const storePut=(n,o)=>storeWrite(n,os=>os.put(o));
const storeDel=(n,k)=>storeWrite(n,os=>os.delete(k)); // only for: an item restored, a snapshot past the 10th, a trash copy already kept in Firestore

let TRASH=[];    // [{key, kind, id, label, item, extra, deletedAt, deletedBy, deletedByName, synced}]
let RACELOG=[];  // every race saved on this phone, newest first (S.raceLog keeps the latest 5 for a quick start)
const myId=()=>(SYNC&&SYNC.uid&&SYNC.uid())||DEVICE;
const STORE_READY=(async()=>{
  try{
    TRASH=await storeAll('trash');
    const R=await storeAll('races'), have=new Set(R.map(x=>x.key));
    for(const x of (S.raceLog||[])){ if(!have.has(x.id)){ const e={...x,key:x.id}; R.push(e); await storePut('races',e); } } // 2.5 saves: all were in the live entry
    RACELOG=R.sort((a,b)=>(b.savedAtMs||0)-(a.savedAtMs||0));
    if((S.raceLog||[]).length>5){ S.raceLog=RACELOG.slice(0,5); saveNow(); }
    offSet(await storeAll('official'));
    setTimeout(fixPlaceCourses,1500); // after team sync has started (2.9.1)
    setTimeout(convertGenderGroups,2500); // once: groups named Girls/Boys become sections (2.10)
    if(!S.settings.oneList2130&&LOADED){ S.settings.oneList2130=true; save(); takeSnapshot('Before 2.13 showed Varsity and JV as one list'); } // once (2.13): nothing saved changes, a restore point anyway
    pruneTrash();
  }catch(e){}
})();
function raceLog(){ return RACELOG.length?RACELOG:(S.raceLog||[]); }
function logPut(x){ x.key=x.id; RACELOG=[x,...RACELOG.filter(y=>y.id!==x.id)]; S.raceLog=RACELOG.slice(0,5); storePut('races',x); save(); }

function trashPut(e){
  e.key=e.key||e.kind+':'+e.id; e.deletedAt=e.deletedAt||Date.now();
  if(e.deletedBy===undefined){ e.deletedBy=myId(); e.deletedByName=S.settings.coachName||''; }
  TRASH=[...TRASH.filter(x=>x.key!==e.key),e]; storePut('trash',e);
  if(e.synced) pruneTrash(); // a coach's old soft delete arriving now may already be past the phone's 90 days
  return e.key;
}
function trashTake(key){ const e=TRASH.find(x=>x.key===key); if(!e) return null; TRASH=TRASH.filter(x=>x.key!==key); storeDel('trash',key); return e; }
// In a team the phone keeps the last 90 days of trash (at most 300 items); anything older is already kept in
// Firestore (synced) and "Show older" loads it from there. On a phone without a team, everything stays.
function pruneTrash(){
  if(syncMode()!=='joined') return;
  const cut=Date.now()-90*864e5, L=[...TRASH].sort((a,b)=>b.deletedAt-a.deletedAt);
  L.forEach((e,i)=>{ if(e.synced && (i>=300 || e.deletedAt<cut)){ TRASH=TRASH.filter(x=>x!==e); storeDel('trash',e.key); } });
}
// Undo toast for anything recoverable (instead of a confirm).
function removedSnack(msg,key,after){ snack(msg,'Undo',()=>{ trashRestore(key,true); if(after) after(); },8000); }

// Snapshots: everything on this phone, before bulk actions, team join/merge, leave, restores. Last 10 kept.
async function takeSnapshot(reason){
  try{
    saveNow();
    const snap={key:'s'+Date.now()+uid(),at:Date.now(),reason,version:APP_VERSION,state:JSON.stringify(S),trash:JSON.stringify(TRASH),races:JSON.stringify(RACELOG),official:JSON.stringify(OFFICIAL),
      counts:{runners:S.roster.length,workouts:S.workouts.length,watches:S.watches.length,races:RACELOG.length}};
    await storePut('snapshots',snap);
    const all=(await storeAll('snapshots')).sort((a,b)=>b.at-a.at);
    for(const x of all.slice(10)) await storeDel('snapshots',x.key);
    return true;
  }catch(e){ return false; }
}
async function snapshotSheet(){
  const L=(await storeAll('snapshots')).sort((a,b)=>b.at-a.at);
  modal(`<div class="snap-sheet"><h2>Restore a snapshot</h2><p class="hint">The app saves everything on this phone before big changes (Clear, team join, Leave, restores). The last 10 are kept.</p>
    ${L.length?L.map(x=>`<div class="set-row"><span>${esc(x.reason)}<span class="hint">${esc(new Date(x.at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}))} · ${x.counts.runners} runners, ${x.counts.workouts} workouts, ${x.counts.watches} stopwatches, ${x.counts.races} races</span></span><button class="btn" data-snap="${x.key}">Restore</button></div>`).join(''):'<p>No snapshots yet.</p>'}
    <div class="modal-btns"><button class="btn primary" data-x="no">Close</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-snap]').forEach(b=>b.onclick=async()=>{
      const x=L.find(y=>y.key===b.dataset.snap); if(!x) return;
      if(!(await confirmBox('Restore this snapshot?','Restore',`Everything on this phone goes back to ${new Date(x.at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})} (${x.reason}). A snapshot of right now is saved first, so this can be undone the same way.${syncMode()!=='local'?' The team’s shared lists are not changed; next you choose how to merge.':''}`))) return;
      await takeSnapshot('Before restoring a snapshot');
      const s=migrate(JSON.parse(x.state)); if(!s){ toast('That snapshot could not be read'); return; }
      // Trash and saved races are merged, never shrunk: restoring can't lose anything deleted or saved since.
      for(const e of JSON.parse(x.trash||'[]')) if(!TRASH.some(y=>y.key===e.key)) await storePut('trash',e);
      for(const e of JSON.parse(x.races||'[]')) if(!RACELOG.some(y=>y.key===e.key)) await storePut('races',e);
      await mergeOfficial(JSON.parse(x.official||'[]')); // 2.9.1
      S=s; saveNow(); if(SYNC) SYNC.markRestored();
      try{ sessionStorage.setItem('mustang-splits:restored','snapshot'); }catch(err){}
      location.reload();
    });
  });
}
// Storage line in Settings, the warning dot, and the "storage full" banner.
const LS_LIMIT=5*1024*1024; // iPhone localStorage: about 5 MB per site (counted as UTF-16, 2 bytes a character)
const liveBytes=()=>liveSize*2;
async function storageText(){
  let idbTxt='';
  try{ if(navigator.storage&&navigator.storage.estimate){ const e=await navigator.storage.estimate(); if(e.usage!=null) idbTxt=`, ${(e.usage/1048576).toFixed(1)} MB for history, trash and snapshots`; } }catch(e){}
  const pct=liveBytes()/LS_LIMIT;
  return {pct,text:`This phone: ${(liveBytes()/1048576).toFixed(2)} MB of about 5 MB used for live data${idbTxt}.`};
}
function storageUI(){
  const b=$('#storageBanner'); if(b) b.hidden=!saveFail;
  if(typeof updateSyncUI==='function') try{ updateSyncUI(); }catch(e){}
}
try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(e){}

/* ---------- workouts ---------- */
function segSeconds(s,ctx){
  if(segEffort(s)){ const D=+s.dist, spm=ctx&&ctx.pace?ctx.pace(s):null; return D>0&&spm>0?spm*D/1609.34:null; } // 2.11: the runner's own pace
  const v=parseTime(s.value), D=+s.dist; if(v==null||!(D>0)) return null;
  switch(s.mode){ case 'per400': return v*D/400; case 'permile': return v*D/1609.34; case 'perkm': return v*D/1000; default: return v; }
}
function compile(wk,ctx){
  const segs=[],cps=[]; let d=0,t=0;
  for(const s of (wk.segments||[])){
    const D=+s.dist, T=segSeconds(s,ctx);
    if(!(D>0)||!(T>0)) continue;
    const i=segs.length;
    segs.push({d0:d,d1:d+D,t0:t,t1:t+T,dist:D,time:T,effort:s.effort});
    const c=+s.cp||0;
    if(c>0&&c<D){ for(let k=c;k<D-0.5;k+=c) cps.push({d:d+k,t:t+T*k/D,seg:i,end:false}); }
    cps.push({d:d+D,t:t+T,seg:i,end:true});
    d+=D; t+=T;
  }
  const reps=clamp(Math.round(+wk.reps||1),1,50);
  const rest=parseTime(wk.rest)||0;
  const out={ok:segs.length>0&&(!isEffortWk(wk)||(wk.segments||[]).every(s=>!segEffort(s)||segSeconds(s,ctx)>0)),segs,cps,repDist:d,repTime:t,reps,rest,name:wk.name};
  if(ctx&&ctx.prof) out.pace={basis:ctx.prof.basis,who:ctx.who.name,group:!!ctx.group,warn:!!ctx.warn,spread:ctx.spread||0,adj:ctx.adj||0}; // shown on the card (2.11)
  return out;
}
let CC={};
// A started stopwatch runs on the plan copy it saved at Start (w.plan) until it's reset or cleared,
// so workout edits (local, or from another coach) and app reloads never change a run in progress.
function planCopy(wk,w){ return wk ? JSON.parse(JSON.stringify(compile(wk,w&&isEffortWk(wk)?watchCtx(w,wk):null))) : null; } // 2.11: effort targets fixed at Start
function planOf(w){
  if(w.status!=='idle' && w.plan!==undefined) return (w.plan && w.plan.ok) ? w.plan : null;
  if(!w.workoutId) return null;
  const wk=S.workouts.find(x=>x.id===w.workoutId); if(!wk) return null;
  if(isEffortWk(wk)){ const P=memoize('plan|'+w.id+'|'+wk.id,()=>compile(wk,watchCtx(w,wk))); return P.ok?P:null; } // waiting: this stopwatch's runners (2.11)
  if(!CC[wk.id]) CC[wk.id]=compile(wk);
  return CC[wk.id].ok?CC[wk.id]:null;
}
function ghostDist(P,r){
  if(r<=0) return 0;
  for(const s of P.segs){ if(r<=s.t1) return s.d0+(r-s.t0)/s.time*s.dist; }
  return P.repDist;
}
function lastInRep(run){ const l=run.splits[run.splits.length-1]; return (l&&l.rep===run.rep)?l:null; }
function runnerDist(P,run,repSec){
  const i=run.cp; if(i>=P.cps.length) return P.repDist;
  const prev=i>0?P.cps[i-1]:{d:0,t:0}; const cp=P.cps[i];
  const last=lastInRep(run); const a0=(i>0&&last)?last.act:0;
  const dur=cp.t-prev.t; if(!(dur>0)) return prev.d;
  return prev.d+clamp((repSec-a0)/dur,0,0.97)*(cp.d-prev.d);
}
function markLabel(P,cp,rep){
  const s=P.segs[cp.seg];
  let lab=fmtDist(cp.d);
  if(P.segs.length>1 && !cp.end){ lab=fmtDist(cp.d-s.d0)+' of '+EFF[s.effort].toLowerCase()+' ('+fmtDist(cp.d)+')'; }
  return (P.reps>1?'Rep '+(rep+1)+', ':'')+lab;
}
function shortMark(P,cp){ return fmtDist(cp.d); }

/* ---------- elapsed ---------- */
const el=w=> w.status==='running' ? nowMs()-w.startAt : (w.pausedT||0); // nowMs(): the replay clock while a shared stopwatch is rebuilt (3.3), else Date.now()

/* ---------- audio / haptics / wake ---------- */
let AC=null;
function audioInit(){
  try{
    if(!AC){ const C=window.AudioContext||window.webkitAudioContext; if(C) AC=new C(); }
    if(AC&&AC.state==='suspended') AC.resume();
  }catch(e){}
}
function beep(f,d){
  if(REPLAY||!S.settings.sound||!AC) return;
  try{
    const o=AC.createOscillator(), g=AC.createGain(), n=AC.currentTime;
    o.type='sine'; o.frequency.value=f||880;
    g.gain.setValueAtTime(0.0001,n); g.gain.exponentialRampToValueAtTime(0.35,n+0.01); g.gain.exponentialRampToValueAtTime(0.0001,n+(d||0.15));
    o.connect(g); g.connect(AC.destination); o.start(n); o.stop(n+(d||0.15)+0.03);
  }catch(e){}
}
function buzz(p){ if(REPLAY) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
// Keep the screen on (2.9.1). The Screen Wake Lock API first. iOS before 18.4 refuses it in home-screen apps, and
// Safari refuses a request made without a tap (at launch, on return), so: retry on the next tap, and if iOS still
// says no, play a tiny silent looping video (the NoSleep.js method and media, MIT, Rich Tibbett), which also keeps
// an iPhone awake. The screen stays on whenever "Keep screen on" is set, a stopwatch is running, or a race is live.
const WAKE_WEBM='data:video/webm;base64,GkXfowEAAAAAAAAfQoaBAUL3gQFC8oEEQvOBCEKChHdlYm1Ch4EEQoWBAhhTgGcBAAAAAAAVkhFNm3RALE27i1OrhBVJqWZTrIHfTbuMU6uEFlSua1OsggEwTbuMU6uEHFO7a1OsghV17AEAAAAAAACkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmAQAAAAAAAEUq17GDD0JATYCNTGF2ZjU1LjMzLjEwMFdBjUxhdmY1NS4zMy4xMDBzpJBlrrXf3DCDVB8KcgbMpcr+RImIQJBgAAAAAAAWVK5rAQAAAAAAD++uAQAAAAAAADLXgQFzxYEBnIEAIrWcg3VuZIaFVl9WUDiDgQEj44OEAmJaAOABAAAAAAAABrCBsLqBkK4BAAAAAAAPq9eBAnPFgQKcgQAitZyDdW5khohBX1ZPUkJJU4OBAuEBAAAAAAAAEZ+BArWIQOdwAAAAAABiZIEgY6JPbwIeVgF2b3JiaXMAAAAAAoC7AAAAAAAAgLUBAAAAAAC4AQN2b3JiaXMtAAAAWGlwaC5PcmcgbGliVm9yYmlzIEkgMjAxMDExMDEgKFNjaGF1ZmVudWdnZXQpAQAAABUAAABlbmNvZGVyPUxhdmM1NS41Mi4xMDIBBXZvcmJpcyVCQ1YBAEAAACRzGCpGpXMWhBAaQlAZ4xxCzmvsGUJMEYIcMkxbyyVzkCGkoEKIWyiB0JBVAABAAACHQXgUhIpBCCGEJT1YkoMnPQghhIg5eBSEaUEIIYQQQgghhBBCCCGERTlokoMnQQgdhOMwOAyD5Tj4HIRFOVgQgydB6CCED0K4moOsOQghhCQ1SFCDBjnoHITCLCiKgsQwuBaEBDUojILkMMjUgwtCiJqDSTX4GoRnQXgWhGlBCCGEJEFIkIMGQcgYhEZBWJKDBjm4FITLQagahCo5CB+EIDRkFQCQAACgoiiKoigKEBqyCgDIAAAQQFEUx3EcyZEcybEcCwgNWQUAAAEACAAAoEiKpEiO5EiSJFmSJVmSJVmS5omqLMuyLMuyLMsyEBqyCgBIAABQUQxFcRQHCA1ZBQBkAAAIoDiKpViKpWiK54iOCISGrAIAgAAABAAAEDRDUzxHlETPVFXXtm3btm3btm3btm3btm1blmUZCA1ZBQBAAAAQ0mlmqQaIMAMZBkJDVgEACAAAgBGKMMSA0JBVAABAAACAGEoOogmtOd+c46BZDppKsTkdnEi1eZKbirk555xzzsnmnDHOOeecopxZDJoJrTnnnMSgWQqaCa0555wnsXnQmiqtOeeccc7pYJwRxjnnnCateZCajbU555wFrWmOmkuxOeecSLl5UptLtTnnnHPOOeecc84555zqxekcnBPOOeecqL25lpvQxTnnnE/G6d6cEM4555xzzjnnnHPOOeecIDRkFQAABABAEIaNYdwpCNLnaCBGEWIaMulB9+gwCRqDnELq0ehopJQ6CCWVcVJKJwgNWQUAAAIAQAghhRRSSCGFFFJIIYUUYoghhhhyyimnoIJKKqmooowyyyyzzDLLLLPMOuyssw47DDHEEEMrrcRSU2011lhr7jnnmoO0VlprrbVSSimllFIKQkNWAQAgAAAEQgYZZJBRSCGFFGKIKaeccgoqqIDQkFUAACAAgAAAAABP8hzRER3RER3RER3RER3R8RzPESVREiVREi3TMjXTU0VVdWXXlnVZt31b2IVd933d933d+HVhWJZlWZZlWZZlWZZlWZZlWZYgNGQVAAACAAAghBBCSCGFFFJIKcYYc8w56CSUEAgNWQUAAAIACAAAAHAUR3EcyZEcSbIkS9IkzdIsT/M0TxM9URRF0zRV0RVdUTdtUTZl0zVdUzZdVVZtV5ZtW7Z125dl2/d93/d93/d93/d93/d9XQdCQ1YBABIAADqSIymSIimS4ziOJElAaMgqAEAGAEAAAIriKI7jOJIkSZIlaZJneZaomZrpmZ4qqkBoyCoAABAAQAAAAAAAAIqmeIqpeIqoeI7oiJJomZaoqZoryqbsuq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq7ruq4LhIasAgAkAAB0JEdyJEdSJEVSJEdygNCQVQCADACAAAAcwzEkRXIsy9I0T/M0TxM90RM901NFV3SB0JBVAAAgAIAAAAAAAAAMybAUy9EcTRIl1VItVVMt1VJF1VNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVN0zRNEwgNWQkAkAEAkBBTLS3GmgmLJGLSaqugYwxS7KWxSCpntbfKMYUYtV4ah5RREHupJGOKQcwtpNApJq3WVEKFFKSYYyoVUg5SIDRkhQAQmgHgcBxAsixAsiwAAAAAAAAAkDQN0DwPsDQPAAAAAAAAACRNAyxPAzTPAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABA0jRA8zxA8zwAAAAAAAAA0DwP8DwR8EQRAAAAAAAAACzPAzTRAzxRBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABA0jRA8zxA8zwAAAAAAAAAsDwP8EQR0DwRAAAAAAAAACzPAzxRBDzRAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAEOAAABBgIRQasiIAiBMAcEgSJAmSBM0DSJYFTYOmwTQBkmVB06BpME0AAAAAAAAAAAAAJE2DpkHTIIoASdOgadA0iCIAAAAAAAAAAAAAkqZB06BpEEWApGnQNGgaRBEAAAAAAAAAAAAAzzQhihBFmCbAM02IIkQRpgkAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAGHAAAAgwoQwUGrIiAIgTAHA4imUBAIDjOJYFAACO41gWAABYliWKAABgWZooAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAYcAAACDChDBQashIAiAIAcCiKZQHHsSzgOJYFJMmyAJYF0DyApgFEEQAIAAAocAAACLBBU2JxgEJDVgIAUQAABsWxLE0TRZKkaZoniiRJ0zxPFGma53meacLzPM80IYqiaJoQRVE0TZimaaoqME1VFQAAUOAAABBgg6bE4gCFhqwEAEICAByKYlma5nmeJ4qmqZokSdM8TxRF0TRNU1VJkqZ5niiKommapqqyLE3zPFEURdNUVVWFpnmeKIqiaaqq6sLzPE8URdE0VdV14XmeJ4qiaJqq6roQRVE0TdNUTVV1XSCKpmmaqqqqrgtETxRNU1Vd13WB54miaaqqq7ouEE3TVFVVdV1ZBpimaaqq68oyQFVV1XVdV5YBqqqqruu6sgxQVdd1XVmWZQCu67qyLMsCAAAOHAAAAoygk4wqi7DRhAsPQKEhKwKAKAAAwBimFFPKMCYhpBAaxiSEFEImJaXSUqogpFJSKRWEVEoqJaOUUmopVRBSKamUCkIqJZVSAADYgQMA2IGFUGjISgAgDwCAMEYpxhhzTiKkFGPOOScRUoox55yTSjHmnHPOSSkZc8w556SUzjnnnHNSSuacc845KaVzzjnnnJRSSuecc05KKSWEzkEnpZTSOeecEwAAVOAAABBgo8jmBCNBhYasBABSAQAMjmNZmuZ5omialiRpmud5niiapiZJmuZ5nieKqsnzPE8URdE0VZXneZ4oiqJpqirXFUXTNE1VVV2yLIqmaZqq6rowTdNUVdd1XZimaaqq67oubFtVVdV1ZRm2raqq6rqyDFzXdWXZloEsu67s2rIAAPAEBwCgAhtWRzgpGgssNGQlAJABAEAYg5BCCCFlEEIKIYSUUggJAAAYcAAACDChDBQashIASAUAAIyx1lprrbXWQGettdZaa62AzFprrbXWWmuttdZaa6211lJrrbXWWmuttdZaa6211lprrbXWWmuttdZaa6211lprrbXWWmuttdZaa6211lprrbXWWmstpZRSSimllFJKKaWUUkoppZRSSgUA+lU4APg/2LA6wknRWGChISsBgHAAAMAYpRhzDEIppVQIMeacdFRai7FCiDHnJKTUWmzFc85BKCGV1mIsnnMOQikpxVZjUSmEUlJKLbZYi0qho5JSSq3VWIwxqaTWWoutxmKMSSm01FqLMRYjbE2ptdhqq7EYY2sqLbQYY4zFCF9kbC2m2moNxggjWywt1VprMMYY3VuLpbaaizE++NpSLDHWXAAAd4MDAESCjTOsJJ0VjgYXGrISAAgJACAQUooxxhhzzjnnpFKMOeaccw5CCKFUijHGnHMOQgghlIwx5pxzEEIIIYRSSsaccxBCCCGEkFLqnHMQQgghhBBKKZ1zDkIIIYQQQimlgxBCCCGEEEoopaQUQgghhBBCCKmklEIIIYRSQighlZRSCCGEEEIpJaSUUgohhFJCCKGElFJKKYUQQgillJJSSimlEkoJJYQSUikppRRKCCGUUkpKKaVUSgmhhBJKKSWllFJKIYQQSikFAAAcOAAABBhBJxlVFmGjCRcegEJDVgIAZAAAkKKUUiktRYIipRikGEtGFXNQWoqocgxSzalSziDmJJaIMYSUk1Qy5hRCDELqHHVMKQYtlRhCxhik2HJLoXMOAAAAQQCAgJAAAAMEBTMAwOAA4XMQdAIERxsAgCBEZohEw0JweFAJEBFTAUBigkIuAFRYXKRdXECXAS7o4q4DIQQhCEEsDqCABByccMMTb3jCDU7QKSp1IAAAAAAADADwAACQXAAREdHMYWRobHB0eHyAhIiMkAgAAAAAABcAfAAAJCVAREQ0cxgZGhscHR4fICEiIyQBAIAAAgAAAAAggAAEBAQAAAAAAAIAAAAEBB9DtnUBAAAAAAAEPueBAKOFggAAgACjzoEAA4BwBwCdASqwAJAAAEcIhYWIhYSIAgIABhwJ7kPfbJyHvtk5D32ych77ZOQ99snIe+2TkPfbJyHvtk5D32ych77ZOQ99YAD+/6tQgKOFggADgAqjhYIAD4AOo4WCACSADqOZgQArADECAAEQEAAYABhYL/QACIBDmAYAAKOFggA6gA6jhYIAT4AOo5mBAFMAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCAGSADqOFggB6gA6jmYEAewAxAgABEBAAGAAYWC/0AAiAQ5gGAACjhYIAj4AOo5mBAKMAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCAKSADqOFggC6gA6jmYEAywAxAgABEBAAGAAYWC/0AAiAQ5gGAACjhYIAz4AOo4WCAOSADqOZgQDzADECAAEQEAAYABhYL/QACIBDmAYAAKOFggD6gA6jhYIBD4AOo5iBARsAEQIAARAQFGAAYWC/0AAiAQ5gGACjhYIBJIAOo4WCATqADqOZgQFDADECAAEQEAAYABhYL/QACIBDmAYAAKOFggFPgA6jhYIBZIAOo5mBAWsAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCAXqADqOFggGPgA6jmYEBkwAxAgABEBAAGAAYWC/0AAiAQ5gGAACjhYIBpIAOo4WCAbqADqOZgQG7ADECAAEQEAAYABhYL/QACIBDmAYAAKOFggHPgA6jmYEB4wAxAgABEBAAGAAYWC/0AAiAQ5gGAACjhYIB5IAOo4WCAfqADqOZgQILADECAAEQEAAYABhYL/QACIBDmAYAAKOFggIPgA6jhYICJIAOo5mBAjMAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCAjqADqOFggJPgA6jmYECWwAxAgABEBAAGAAYWC/0AAiAQ5gGAACjhYICZIAOo4WCAnqADqOZgQKDADECAAEQEAAYABhYL/QACIBDmAYAAKOFggKPgA6jhYICpIAOo5mBAqsAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCArqADqOFggLPgA6jmIEC0wARAgABEBAUYABhYL/QACIBDmAYAKOFggLkgA6jhYIC+oAOo5mBAvsAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCAw+ADqOZgQMjADECAAEQEAAYABhYL/QACIBDmAYAAKOFggMkgA6jhYIDOoAOo5mBA0sAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCA0+ADqOFggNkgA6jmYEDcwAxAgABEBAAGAAYWC/0AAiAQ5gGAACjhYIDeoAOo4WCA4+ADqOZgQObADECAAEQEAAYABhYL/QACIBDmAYAAKOFggOkgA6jhYIDuoAOo5mBA8MAMQIAARAQABgAGFgv9AAIgEOYBgAAo4WCA8+ADqOFggPkgA6jhYID+oAOo4WCBA+ADhxTu2sBAAAAAAAAEbuPs4EDt4r3gQHxghEr8IEK';
const WAKE_MP4='data:video/mp4;base64,AAAAHGZ0eXBNNFYgAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAGF21kYXTeBAAAbGliZmFhYyAxLjI4AABCAJMgBDIARwAAArEGBf//rdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNDIgcjIgOTU2YzhkOCAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMTQgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz02IGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTI1IHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCB2YnZfbWF4cmF0ZT03NjggdmJ2X2J1ZnNpemU9MzAwMCBjcmZfbWF4PTAuMCBuYWxfaHJkPW5vbmUgZmlsbGVyPTAgaXBfcmF0aW89MS40MCBhcT0xOjEuMDAAgAAAAFZliIQL8mKAAKvMnJycnJycnJycnXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXiEASZACGQAjgCEASZACGQAjgAAAAAdBmjgX4GSAIQBJkAIZACOAAAAAB0GaVAX4GSAhAEmQAhkAI4AhAEmQAhkAI4AAAAAGQZpgL8DJIQBJkAIZACOAIQBJkAIZACOAAAAABkGagC/AySEASZACGQAjgAAAAAZBmqAvwMkhAEmQAhkAI4AhAEmQAhkAI4AAAAAGQZrAL8DJIQBJkAIZACOAAAAABkGa4C/AySEASZACGQAjgCEASZACGQAjgAAAAAZBmwAvwMkhAEmQAhkAI4AAAAAGQZsgL8DJIQBJkAIZACOAIQBJkAIZACOAAAAABkGbQC/AySEASZACGQAjgCEASZACGQAjgAAAAAZBm2AvwMkhAEmQAhkAI4AAAAAGQZuAL8DJIQBJkAIZACOAIQBJkAIZACOAAAAABkGboC/AySEASZACGQAjgAAAAAZBm8AvwMkhAEmQAhkAI4AhAEmQAhkAI4AAAAAGQZvgL8DJIQBJkAIZACOAAAAABkGaAC/AySEASZACGQAjgCEASZACGQAjgAAAAAZBmiAvwMkhAEmQAhkAI4AhAEmQAhkAI4AAAAAGQZpAL8DJIQBJkAIZACOAAAAABkGaYC/AySEASZACGQAjgCEASZACGQAjgAAAAAZBmoAvwMkhAEmQAhkAI4AAAAAGQZqgL8DJIQBJkAIZACOAIQBJkAIZACOAAAAABkGawC/AySEASZACGQAjgAAAAAZBmuAvwMkhAEmQAhkAI4AhAEmQAhkAI4AAAAAGQZsAL8DJIQBJkAIZACOAAAAABkGbIC/AySEASZACGQAjgCEASZACGQAjgAAAAAZBm0AvwMkhAEmQAhkAI4AhAEmQAhkAI4AAAAAGQZtgL8DJIQBJkAIZACOAAAAABkGbgCvAySEASZACGQAjgCEASZACGQAjgAAAAAZBm6AnwMkhAEmQAhkAI4AhAEmQAhkAI4AhAEmQAhkAI4AhAEmQAhkAI4AAAAhubW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAABDcAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAzB0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+kAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAALAAAACQAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPpAAAAAAABAAAAAAKobWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAB1MAAAdU5VxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAACU21pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAhNzdGJsAAAAr3N0c2QAAAAAAAAAAQAAAJ9hdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAALAAkABIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGP//AAAALWF2Y0MBQsAN/+EAFWdCwA3ZAsTsBEAAAPpAADqYA8UKkgEABWjLg8sgAAAAHHV1aWRraEDyXyRPxbo5pRvPAyPzAAAAAAAAABhzdHRzAAAAAAAAAAEAAAAeAAAD6QAAABRzdHNzAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAAIxzdHN6AAAAAAAAAAAAAAAeAAADDwAAAAsAAAALAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAACgAAAAoAAAAKAAAAiHN0Y28AAAAAAAAAHgAAAEYAAANnAAADewAAA5gAAAO0AAADxwAAA+MAAAP2AAAEEgAABCUAAARBAAAEXQAABHAAAASMAAAEnwAABLsAAATOAAAE6gAABQYAAAUZAAAFNQAABUgAAAVkAAAFdwAABZMAAAWmAAAFwgAABd4AAAXxAAAGDQAABGh0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAACAAAAAAAABDcAAAAAAAAAAAAAAAEBAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAQkAAADcAABAAAAAAPgbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAC7gAAAykBVxAAAAAAALWhkbHIAAAAAAAAAAHNvdW4AAAAAAAAAAAAAAABTb3VuZEhhbmRsZXIAAAADi21pbmYAAAAQc21oZAAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAADT3N0YmwAAABnc3RzZAAAAAAAAAABAAAAV21wNGEAAAAAAAAAAQAAAAAAAAAAAAIAEAAAAAC7gAAAAAAAM2VzZHMAAAAAA4CAgCIAAgAEgICAFEAVBbjYAAu4AAAADcoFgICAAhGQBoCAgAECAAAAIHN0dHMAAAAAAAAAAgAAADIAAAQAAAAAAQAAAkAAAAFUc3RzYwAAAAAAAAAbAAAAAQAAAAEAAAABAAAAAgAAAAIAAAABAAAAAwAAAAEAAAABAAAABAAAAAIAAAABAAAABgAAAAEAAAABAAAABwAAAAIAAAABAAAACAAAAAEAAAABAAAACQAAAAIAAAABAAAACgAAAAEAAAABAAAACwAAAAIAAAABAAAADQAAAAEAAAABAAAADgAAAAIAAAABAAAADwAAAAEAAAABAAAAEAAAAAIAAAABAAAAEQAAAAEAAAABAAAAEgAAAAIAAAABAAAAFAAAAAEAAAABAAAAFQAAAAIAAAABAAAAFgAAAAEAAAABAAAAFwAAAAIAAAABAAAAGAAAAAEAAAABAAAAGQAAAAIAAAABAAAAGgAAAAEAAAABAAAAGwAAAAIAAAABAAAAHQAAAAEAAAABAAAAHgAAAAIAAAABAAAAHwAAAAQAAAABAAAA4HN0c3oAAAAAAAAAAAAAADMAAAAaAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAACMc3RjbwAAAAAAAAAfAAAALAAAA1UAAANyAAADhgAAA6IAAAO+AAAD0QAAA+0AAAQAAAAEHAAABC8AAARLAAAEZwAABHoAAASWAAAEqQAABMUAAATYAAAE9AAABRAAAAUjAAAFPwAABVIAAAVuAAAFgQAABZ0AAAWwAAAFzAAABegAAAX7AAAGFwAAAGJ1ZHRhAAAAWm1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAALWlsc3QAAAAlqXRvbwAAAB1kYXRhAAAAAQAAAABMYXZmNTUuMzMuMTAw';
let nameT=null;
let wakeLock=null, wakeVid=null, wakeVidOn=false, wakeMsg='While the app is open', wakeBusy=false;
const wantWake=()=>!!S.settings.wake||(typeof timingNow==='function'&&timingNow());
function wakeVideo(){
  if(wakeVid) return wakeVid;
  const v=document.createElement('video'); v.setAttribute('title','Keep screen on'); v.setAttribute('playsinline',''); v.setAttribute('aria-hidden','true');
  v.style.cssText='position:fixed;left:0;bottom:0;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-1';
  [['webm',WAKE_WEBM],['mp4',WAKE_MP4]].forEach(([t,src])=>{ const so=document.createElement('source'); so.src=src; so.type='video/'+t; v.appendChild(so); });
  v.addEventListener('loadedmetadata',()=>{ if(v.duration<=1) v.setAttribute('loop',''); else v.addEventListener('timeupdate',()=>{ if(v.currentTime>0.5) v.currentTime=Math.random(); }); });
  v.addEventListener('pause',()=>{ wakeVidOn=false; });
  document.body.appendChild(v); wakeVid=v; return v;
}
async function applyWake(){
  if(wakeBusy) return; wakeBusy=true;
  const on=wantWake();
  try{
    if(on){
      if(!wakeLock && navigator.wakeLock){ try{ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{ wakeLock=null; }); }catch(e){ wakeLock=null; } }
      if(wakeLock){ if(wakeVidOn){ wakeVid.pause(); wakeVidOn=false; } }
      else if(!wakeVidOn){ try{ await wakeVideo().play(); wakeVidOn=true; }catch(e){ wakeVidOn=false; } }
      wakeMsg=wakeLock?'Screen will stay on':wakeVidOn?'Screen will stay on (iPhone backup method)':'Tap anywhere to keep the screen on';
    } else {
      if(wakeLock){ try{ await wakeLock.release(); }catch(e){} wakeLock=null; }
      if(wakeVidOn){ wakeVid.pause(); wakeVidOn=false; }
      wakeMsg='While the app is open. Always on while a stopwatch runs or a race is live.';
    }
  }finally{ wakeBusy=false; }
  const h=$('#wakeHint'); if(h) h.textContent=wakeMsg;
}
const wakeHeld=()=>!!wakeLock||wakeVidOn;
// A tap is what iOS needs: after any tap (and after the tap's own action has run), take the screen if it's wanted.
document.addEventListener('click',()=>{ setTimeout(()=>{ if(wantWake()!==wakeHeld()) applyWake(); },0); });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') applyWake(); });
setInterval(()=>{ if(wantWake()!==wakeHeld()) applyWake(); },3000); // a stopwatch started or stopped, a race ended

/* ---------- toast + modal ---------- */
let toastT=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true,2600); }
function modal(html,onMount,kind){ // 3.0: a sheet with a grab handle; kind 'action' = an action sheet
  const ov=$('#overlay'), m=$('#modal'); m.className='modal'+(kind?' '+kind:''); m.innerHTML=html+(kind==='action'?'':'<div class="grab" aria-hidden="true"></div>'); ov.hidden=false; m.scrollTop=0; // the handle goes last: sheets read their own first child
  ov.classList.toggle('ov-action',kind==='action');
  const sn=$('#snack'); if(sn) sn.hidden=true; // an Undo bar must never sit over a sheet's buttons
  const close=()=>{ ov.hidden=true; m.innerHTML=''; };
  ov.onclick=e=>{ if(e.target===ov) close(); };
  const g=m.querySelector('.grab'); if(g) dragToClose(g,m,close);
  if(onMount) onMount(m,close);
  const f=m.querySelector('textarea,button.primary'); // don't pop the phone keyboard for number fields if(f) setTimeout(()=>f.focus(),30);
  return close;
}
// 3.0: an iOS action sheet. The choice (red when it removes or replaces something) and Cancel, separate, at the bottom.
function confirmBox(msg,okLabel,detail,safe){
  return new Promise(res=>{
    modal(`<div class="as-group"><div class="as-head"><h2>${esc(msg)}</h2>${detail?`<p>${esc(detail)}</p>`:''}</div><button class="as-btn${safe?'':' destructive'}" data-x="yes">${esc(okLabel||'OK')}</button></div><div class="as-group"><button class="as-btn as-cancel" data-x="no">Cancel</button></div>`,(m,close)=>{
      m.querySelector('[data-x=no]').onclick=()=>{close();res(false);};
      m.querySelector('[data-x=yes]').onclick=()=>{close();res(true);};
    },'action');
  });
}
// An action sheet of choices: [{label, id?, red?, fn}] (3.0).
function actionSheet(title,items){
  modal(`<div class="as-group">${title?`<div class="as-head"><h2>${esc(title)}</h2></div>`:''}${items.map((it,i)=>`<button class="as-btn${it.red?' destructive':''}" data-as="${i}"${it.id?` id="${it.id}"`:''}>${esc(it.label)}</button>`).join('')}</div><div class="as-group"><button class="as-btn as-cancel" data-x="no">Cancel</button></div>`,(m,close)=>{
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-as]').forEach(b=>b.onclick=()=>{ close(); items[+b.dataset.as].fn(); });
  },'action');
}
// Drag a sheet down by its grab handle to close it.
function dragToClose(g,m,close){ let y0=null;
  g.addEventListener('pointerdown',e=>{ y0=e.clientY; g.setPointerCapture(e.pointerId); m.style.transition='none'; });
  g.addEventListener('pointermove',e=>{ if(y0==null) return; const dy=Math.max(0,e.clientY-y0); m.style.transform=`translateY(${dy}px)`; });
  const up=e=>{ if(y0==null) return; const dy=e.clientY-y0; y0=null; m.style.transition=''; m.style.transform=''; if(dy>90) close(); };
  g.addEventListener('pointerup',up); g.addEventListener('pointercancel',up); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && !$('#overlay').hidden){ $('#overlay').hidden=true; } });

/* ---------- watch cards ---------- */
const grid=$('#grid');
const cardEls={}; const OPEN={}; const SHUT={}; const HIST={}; const beepMark={}; const ARM={};
// OPEN: log opened by hand (liveLog off). SHUT: log collapsed by hand (liveLog on).

function planOptions(sel,withNone){
  return (withNone!==false?`<option value="">No workout (just a stopwatch)</option>`:'')+
    S.workouts.map(wk=>`<option value="${wk.id}"${wk.id===sel?' selected':''}>${esc(wk.name)}</option>`).join('');
}
function laneHTML(P){
  const bands=P.segs.map(s=>`<i class="band e-${s.effort}" style="left:${s.d0/P.repDist*100}%;width:${s.dist/P.repDist*100}%"></i>`).join('');
  let lastX=-100;
  const ticks=P.cps.map((c,i)=>{
    const x=c.d/P.repDist*100, isLast=i===P.cps.length-1;
    const show=isLast || (x-lastX>=13 && 100-x>=18);
    if(show) lastX=x;
    const lab=show?`<span>${fmtDist(c.d)}</span>`:'';
    return `<i class="tick${c.end?' end':''}${x>92?' r':''}" style="left:${x}%">${lab}</i>`;
  }).join('');
  return `<div class="lane" aria-hidden="true"><div class="track">${bands}<i class="fill" data-r="fill"></i></div>${ticks}<i class="ghost" data-r="ghost"></i><i class="runner" data-r="runner"></i></div>`;
}
// 2.13: a compact tile. Title = runner or group name; the time large; current rep and next target small; the last split
// vs target in colour and shape (▲ behind, ▼ too fast, ● on pace); Lap (primary) and Stop (tap twice) on the tile; Undo on
// the tile too (TUNDO), never a bar across the screen. Everything else is in the ⋯ menu (cardMenu).
const TUNDO={}; // stopwatch id -> {msg, key|fn, until}
const SHAPE_OF={ok:'●',fast:'▼',slow:'▲',bad:'▲'}, WORD_OF={ok:'on pace',fast:'too fast',slow:'behind',bad:'behind'};
function tileName(w){ const n=String(w.name||'').trim(); if(n) return n; const a=w.athleteNames.filter(Boolean); return a.length?(a.length===1?a[0]:`${a[0]} + ${a.length-1}`):'Stopwatch'; }
function cardHTML(w){
  const P=planOf(w), run=w.run;
  const phase=!P?'free':(w.status==='idle'?'idle':run.phase);
  const wkMissing=w.workoutId && !P, nm=tileName(w);
  let h=`<div class="w-head"><button class="w-name" data-act="rename" aria-label="Rename ${esc(nm)}">${esc(nm)}</button><button class="icon-btn more-btn" data-act="menu" aria-label="More for ${esc(nm)}">⋯</button></div>`;
  h+=membersHTML(w);
  const ewk=w.workoutId&&S.workouts.find(x=>x.id===w.workoutId);
  if(wkMissing){ const c=isEffortWk(ewk)?watchCtx(w,ewk):null;
    h+=`<div class="plan-note">${!ewk?'This workout was deleted. Change it in ⋯.':c&&c.missing&&c.missing.length?`No pace yet for ${esc(c.missing.join(', '))}: needs a race this season (⋯ to change).`:c?'Add runners: targets come from each runner’s races.':'This workout has a part with no distance. Fix it on the Workouts tab.'}</div>`; }
  if(P&&P.pace&&P.pace.warn) h+=`<div class="pace-note"><b class="pace-warn">Paces in this group differ by ${(P.pace.spread*100).toFixed(1)}%</b></div>`;
  h+=`<div class="clock"><div class="big" data-r="big">0:00.0</div><div class="sub" data-r="sub"></div></div><div class="next" data-r="next"></div>`;
  const last=P?run.splits[run.splits.length-1]:null;
  if(last){ const c=cls(last.delta); h+=`<div class="pace-row"><span class="pill ${c}"><span class="shp" aria-hidden="true">${SHAPE_OF[c]}</span><span class="lbl">${esc(fmtDist(last.d))}</span><span class="d">${fmtDelta(last.delta)}</span><span class="w">${WORD_OF[c]}</span></span></div>`; }
  // controls
  h+=`<div class="controls">`;
  const canUndo = P ? run.splits.length>0 : run.laps.length>0;
  if(w.status==='idle') h+=`<button class="btn go big-btn" data-act="start">Start</button>`;
  else if(w.status==='running'){
    if(!P) h+=`<button class="btn split big-btn" data-act="split">Lap</button>`;
    else if(run.phase==='run'){ const cp=P.cps[run.cp]; h+=`<button class="btn split big-btn" data-act="split">${cp?'Lap · '+fmtDist(cp.d):'Lap'}</button>`; }
    else if(run.phase==='rest') h+=`<button class="btn go big-btn" data-act="gonow">Next rep now</button>`;
    h+=`<button class="btn stop-btn" data-act="stop">Stop</button>`;
  } else if(w.status==='paused') h+=`<div class="big-status">Stopped · <span class="num">${fmtClock(el(w))}</span></div><button class="btn" data-act="resume">Keep timing</button>`;
  else h+=`<div class="big-status">✓ Done · <span class="num">${fmtClock(el(w))}</span></div>`;
  h+=`</div>`;
  const tu=TUNDO[w.id], ln=LAPNOTE[w.id]; if(tu&&tu.until>Date.now()) h+=`<div class="t-undo" role="status"><span>${esc(tu.msg)}</span><button class="btn" data-act="tundo">Undo</button></div>`;
  else if(ln&&ln.until>Date.now()&&canUndo&&w.status!=='idle') h+=`<div class="t-undo lap-note" role="status"><span>${esc(ln.msg)}</span><button class="btn" data-act="undo">Undo</button></div>`; // 3.3.1: after each lap
  else if(canUndo && w.status!=='idle'){ const ul=undoLabel(w,P); if(ul) h+=`<button class="btn undo-lbl" data-act="undo">${esc(ul)}</button>`; } // 3.3.1: says what it undoes
  // log
  const n=P?run.splits.length:run.laps.length;
  if(!n) delete SHUT[w.id]; // a new run opens the list again at its first lap
  if(n){
    const live=!!S.settings.liveLog, open=live?!SHUT[w.id]:OPEN[w.id];
    h+=`<details class="log"${open?' open':''}><summary>${P?'Splits':'Laps'} (${n})</summary><div class="tbl-wrap">${P?splitTable(P,run,live,w):lapTable(run,live,w)}</div></details>`;
  }
  return {html:h,phase};
}
// 3.3.1: what Undo would take back: "Undo lap 3 (2:24.1)", "Undo rep 2 · 800m (2:24.1)", "Undo early start of rep 3".
function undoLabel(w,P){ const run=w.run;
  if(w.sh){ const t=shLastTap(w); if(t&&t.e.type==='gonow') return `Undo early start of rep ${run.rep+1}`; }
  if(P){ const sp=run.splits[run.splits.length-1]; if(!sp) return ''; return `Undo ${P.reps>1?`rep ${sp.rep+1} · `:''}${fmtDist(sp.d)} (${fmtSec(sp.act,1)})`; }
  const n=run.laps.length; if(!n) return ''; return `Undo lap ${n} (${fmtClock(run.laps[n-1]-(n>1?run.laps[n-2]:0))})`; }
// "Lap 3 recorded · Undo" on the tile for 4 s after a lap (3.3.1).
const LAPNOTE={};
function lapNote(w){ const P=planOf(w), run=w.run; let msg;
  if(P){ const sp=run.splits[run.splits.length-1]; if(!sp) return; msg=`${P.reps>1?`Rep ${sp.rep+1} · `:''}${fmtDist(sp.d)} recorded · ${fmtSec(sp.act,1)}`; }
  else { const n=run.laps.length; if(!n) return; msg=`Lap ${n} recorded · ${fmtClock(run.laps[n-1]-(n>1?run.laps[n-2]:0))}`; }
  LAPNOTE[w.id]={msg,until:Date.now()+4000}; setTimeout(()=>{ const l=LAPNOTE[w.id]; if(l&&l.until<=Date.now()){ delete LAPNOTE[w.id]; if(S.watches.includes(w)) renderCard(w); } },4100); }
// An Undo on the tile itself (2.13), for 8 s.
function tileUndo(w,msg,undo){ TUNDO[w.id]={msg,undo,until:Date.now()+8000}; setTimeout(()=>{ const t=TUNDO[w.id]; if(t&&t.until<=Date.now()){ delete TUNDO[w.id]; if(S.watches.includes(w)) renderCard(w); } },8100); }
// newest: latest row on top. Columns marked c-x are hidden on cards in compact view.
function membersHTML(w){
  // Shown only when it adds something (a group, or a card renamed away from its runner). Change runners is in ⋯.
  const names=w.athleteNames.filter(Boolean);
  if(!w.athleteIds.length || (names.length===1 && names[0]===w.name)) return '';
  const txt=esc(names.join(', '));
  return w.status==='idle' ? `<button class="members" data-act="members" aria-label="Change runners on ${esc(w.name)}: ${txt}">${txt} <span class="edit">Edit</span></button>` : `<div class="members">${txt}</div>`;
}
// 3.3: on a shared stopwatch's card, who tapped each lap, and a second coach's tap merged into it (tap to use it instead).
function tapInfo(tap,w){ if(!w||!w.sh||!tap) return ''; return `${tap.byName?`<span class="tap-by">${esc(tap.byName)}</span>`:''}${(tap.alts||[]).map(a=>`<button type="button" class="tap-alt" data-alt="${esc(a.id)}">also ${esc(a.byName||'another coach')} (${a.dt>=0?'+':''}${a.dt.toFixed(1)} s) · use this</button>`).join('')}`; }
function splitTable(P,run,newest,w){
  let rows='', rep=-1;
  (newest?run.splits.slice().reverse():run.splits).forEach(s=>{
    if(P.reps>1 && s.rep!==rep){ rep=s.rep; rows+=`<tr class="rep-row"><td colspan="5">Rep ${rep+1}</td></tr>`; }
    const c=cls(s.delta);
    rows+=`<tr><td>${fmtDist(s.d)}</td><td class="c-x">${fmtSec(s.exp)}</td><td>${fmtSec(s.act,2)}${tapInfo(s.tap,w)}</td><td class="c-x">${fmtSec(s.lap,2)}</td><td class="${c}">${fmtDelta(s.delta)}</td></tr>`;
  });
  return `<table><thead><tr><th>Mark</th><th class="c-x">Goal</th><th>Time</th><th class="c-x">Split</th><th>vs goal</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function lapTable(run,newest,w){
  let prev=0;
  const rows=run.laps.map((t,i)=>{const r=`<tr><td>${i+1}</td><td>${fmtClock(t-prev)}${tapInfo((run.lapTaps||[])[i],w)}</td><td class="c-x">${fmtClock(t)}</td></tr>`; prev=t; return r;});
  if(newest) rows.reverse();
  return `<table><thead><tr><th>Lap</th><th>Lap time</th><th class="c-x">Total</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
function renderCard(w){
  const {html,phase}=cardHTML(w);
  let node=cardEls[w.id];
  const active=document.activeElement;
  const hadFocus=node && active && node.contains(active) && active.classList.contains('w-name');
  const selStart=hadFocus?active.selectionStart:0, selEnd=hadFocus?active.selectionEnd:0;
  if(!node){ node=document.createElement('article'); node.dataset.id=w.id; cardEls[w.id]=node; grid.appendChild(node); }
  node.className=`watch st-${w.status} ph-${phase}${showable(w)?'':' f-hide'}`; // 3.3: the Show filter
  node.innerHTML=html;
  node._r={big:node.querySelector('[data-r=big]'),sub:node.querySelector('[data-r=sub]'),ghost:node.querySelector('[data-r=ghost]'),runner:node.querySelector('[data-r=runner]'),fill:node.querySelector('[data-r=fill]'),next:node.querySelector('[data-r=next]')};
  node._cache={};
  const det=node.querySelector('details.log'); if(det) det.addEventListener('toggle',()=>{ OPEN[w.id]=det.open; if(det.open) delete SHUT[w.id]; else SHUT[w.id]=true; });
  if(hadFocus){ const inp=node.querySelector('.w-name'); inp.focus(); try{inp.setSelectionRange(selStart,selEnd);}catch(e){} }
  updateLive(w,node,el(w),planOf(w));
}
function setText(node,key,el,val,isHTML){
  if(!el) return; if(node._cache[key]===val) return; node._cache[key]=val;
  if(isHTML) el.innerHTML=val; else el.textContent=val;
}
function setLeft(node,key,el,pct){
  if(!el) return; const v=pct.toFixed(2); if(node._cache[key]===v) return; node._cache[key]=v;
  if(key==='fill') el.style.width=v+'%'; else el.style.left=v+'%';
}
function updateLive(w,node,t,P){
  const R=node._r, run=w.run;
  if(!P){
    setText(node,'big',R.big,fmtClock(t));
    const lastLap=run.laps.length?run.laps[run.laps.length-1]:0;
    let sub = w.status==='idle' ? 'Ready' : (run.laps.length? `Lap ${run.laps.length+1} <b class="num">${fmtClock(t-lastLap)}</b>` : ''); // 2.13: only what matters
    setText(node,'sub',R.sub,sub,true);
    return;
  }
  if(w.status==='idle'){
    setText(node,'big',R.big,'0:00.0');
    setText(node,'sub',R.sub,P.reps>1?`${P.reps} reps`:'Ready',true);
    setLeft(node,'ghost',R.ghost,0); setLeft(node,'runner',R.runner,0); setLeft(node,'fill',R.fill,0);
    const cp=P.cps[0];
    setText(node,'next',R.next,`First: <b>${esc(fmtDist(cp.d))}</b> at <b class="num">${fmtSec(cp.t)}</b>`,true);
    return;
  }
  if(run.phase==='done'){
    setText(node,'big',R.big,fmtClock(t));
    setText(node,'sub',R.sub,'Done',true);
    setLeft(node,'ghost',R.ghost,100); setLeft(node,'runner',R.runner,100); setLeft(node,'fill',R.fill,100);
    const tot=run.splits.filter(s=>{const c=P.cps[s.cpi];return c&&c.end&&s.cpi===P.cps.length-1;});
    setText(node,'next',R.next,'',true);
    return;
  }
  if(run.phase==='rest'){
    const left=run.restEndT-t;
    setText(node,'big',R.big,fmtClock(Math.max(0,left)+99));
    setText(node,'sub',R.sub,`Rest · rep ${run.rep+2}/${P.reps} next`,true);
    setLeft(node,'ghost',R.ghost,100); setLeft(node,'runner',R.runner,100); setLeft(node,'fill',R.fill,100);
    setText(node,'next',R.next,w.status==='paused'?'Stopped during rest':'Starts by itself at 0:00',true);
    return;
  }
  // running a rep
  const repMs=t-run.repStartT, repSec=repMs/1000;
  setText(node,'big',R.big,fmtClock(repMs));
  setText(node,'sub',R.sub,(P.reps>1?`Rep ${run.rep+1}/${P.reps}`:`Goal <b class="num">${fmtSec(P.repTime)}</b>`),true);
  const g=ghostDist(P,repSec)/P.repDist*100;
  const rd=runnerDist(P,run,repSec)/P.repDist*100;
  setLeft(node,'ghost',R.ghost,g); setLeft(node,'runner',R.runner,rd); setLeft(node,'fill',R.fill,rd);
  const cp=P.cps[run.cp];
  const last=lastInRep(run);
  let live=last?last.delta:0;
  let nextHTML='';
  if(cp){
    const remain=cp.t-repSec;
    const s=P.segs[cp.seg];
    const chip=P.segs.length>1?` <span class="chip e-${s.effort}">${esc(EFF[s.effort])}</span>`:'';
    if(remain>=0){
      nextHTML=`Next <b>${fmtDist(cp.d)}</b>${chip} at <b class="num">${fmtSec(cp.t)}</b>`;
    } else {
      const over=-remain; live=Math.max(live,over);
      const oc=cls(over);
      nextHTML=`<b>${fmtDist(cp.d)}</b>${chip} due <b class="num">${fmtSec(cp.t)}</b> · <span class="over ${oc==='bad'?'bad':''}">▲ ${over.toFixed(1)} s late</span>`;
    }
  }
  setText(node,'next',R.next,nextHTML,true);
  const rc='runner '+(last||live>0?cls(live):'');
  if(R.runner&&node._cache.rc!==rc){ node._cache.rc=rc; R.runner.className=rc; }
}

/* ---------- actions ---------- */
function pushHist(w){ (HIST[w.id]=HIST[w.id]||[]).push(JSON.stringify(w.run)); if(HIST[w.id].length>80) HIST[w.id].shift(); }
const ACT={
  start(w){ w.status='running'; w.startAt=Date.now(); w.pausedT=0; w.run=freshRun(); w.plan=w.workoutId?planCopy(S.workouts.find(x=>x.id===w.workoutId),w):null; HIST[w.id]=[]; buzz(40); },
  stop(w){ w.pausedT=el(w); w.status='paused'; },
  resume(w){ w.startAt=nowMs()-(w.pausedT||0); w.status='running'; },
  reset(w){ w.status='idle'; w.pausedT=0; w.startAt=0; w.run=freshRun(); w.plan=null; HIST[w.id]=[]; },
  split(w){
    if(w.status!=='running') return;
    const t=el(w), P=planOf(w), run=w.run;
    buzz(30);
    if(!P){ pushHist(w); run.laps.push(t); return; }
    if(run.phase!=='run') return;
    if(run.cp>=P.cps.length){ run.cp=P.cps.length-1; }
    pushHist(w);
    const cp=P.cps[run.cp], repSec=(t-run.repStartT)/1000;
    const prevExp=run.cp>0?P.cps[run.cp-1].t:0, prevD=run.cp>0?P.cps[run.cp-1].d:0;
    const last=lastInRep(run), prevAct=(run.cp>0&&last)?last.act:0;
    run.splits.push({rep:run.rep,cpi:run.cp,d:cp.d,exp:cp.t,act:repSec,delta:repSec-cp.t,lap:repSec-prevAct,lapExp:cp.t-prevExp,lapD:cp.d-prevD,t:t});
    run.cp++;
    if(run.cp>=P.cps.length){
      if(run.rep+1<P.reps){
        if(P.rest>0){ run.phase='rest'; run.restEndT=t+P.rest*1000; }
        else { run.rep++; run.cp=0; run.repStartT=t; }
      } else { run.phase='done'; w.pausedT=t; w.status='done'; beep(1046,0.25); }
    }
  },
  gonow(w){ const run=w.run; if(run.phase!=='rest') return; pushHist(w); run.rep++; run.cp=0; run.repStartT=el(w); run.phase='run'; beep(880,0.3); buzz([120]); },
  undo(w){
    const P=planOf(w), stack=HIST[w.id]||[];
    if(!P){ if(w.run.laps.length) w.run.laps.pop(); return; }
    if(stack.length){ w.run=JSON.parse(stack.pop()); }
    else if(w.run.splits.length){ // after reload, no history: roll back last split simply
      const s=w.run.splits.pop(); w.run.rep=s.rep; w.run.cp=s.cpi; w.run.phase='run';
    }
    if(w.status==='done'){ w.status='running'; }
    toast('Last split removed');
  },
  del(w){ // 2.6: no confirm; a stopwatch with times goes to Recently deleted, and Undo brings it back
    const key=trashWatch(w,w.name||'Stopwatch');
    S.watches=S.watches.filter(x=>x!==w);
    // 2.13: the tile stays for 8 s as "Removed · Undo" (Undo on the tile, never a bar)
    const node=cardEls[w.id]; delete cardEls[w.id];
    if(w.sh&&isTeam()&&SYNC.watchHeaderDel) SYNC.watchHeaderDel(w.id,true); // 3.3: off every coach's phone (soft delete)
    const undo=()=>{ if(key) trashRestore(key,true); else if(S.watches.length<MAX && !S.watches.includes(w)){ S.watches.push(w); if(w.sh&&isTeam()&&SYNC.watchHeaderDel) SYNC.watchHeaderDel(w.id,false); } renderGrid(); save(); };
    if(node){ node.className='watch gone'; node.innerHTML=`<p class="gone-txt">Removed ${esc(tileName(w))}</p><button class="btn" data-gone>Undo</button>`; node._undo=undo; setTimeout(()=>{ if(node.isConnected&&node.classList.contains('gone')){ node.remove(); if(!S.watches.length) renderGrid(); } },8000); }
    updateToolbar(); save();
  }
};
grid.addEventListener('click',async e=>{
  if(EDITW){ const card=e.target.closest('.watch:not(.gone)'); if(card&&card.dataset.id){ const id=card.dataset.id, on=!EDITW.has(id); if(on) EDITW.add(id); else EDITW.delete(id); card.classList.toggle('sel',on); card.setAttribute('aria-selected',String(on)); edBar(); } e.preventDefault(); return; } // 3.3.1
  const ch=e.target.closest('[data-new]'); if(ch){ newChoice(ch.dataset.new); return; } // empty-state cards
  const alt=e.target.closest('[data-alt]'); if(alt){ const card=alt.closest('.watch'), w2=card&&S.watches.find(x=>x.id===card.dataset.id); if(w2) shChoose(w2,alt.dataset.alt); return; } // 3.3
  const gone=e.target.closest('[data-gone]'); if(gone){ const g=gone.closest('.watch'), f=g&&g._undo; if(g) g.remove(); if(f) f(); return; } // Undo on a removed tile (2.13)
  if(e.target.closest('[data-help]')){ helpSheet(); return; }
  const b=e.target.closest('[data-act]'); if(!b) return;
  const card=b.closest('.watch'); if(!card) return; const w=S.watches.find(x=>x.id===card.dataset.id); if(!w) return;
  audioInit();
  const a=b.dataset.act;
  if(a==='members'){ if(w.status==='idle') openBench({watch:w}); return; }
  if(a==='menu'){ cardMenu(w); return; }
  if(a==='rename'){ renameSheet(w); return; }
  // Stop anywhere outside a menu needs two taps so a stray thumb never freezes a live clock.
  // (Inside the ⋯ menu it's one tap: opening the menu is the safeguard.)
  if(a==='stop' && !(ARM[w.id] && Date.now()-ARM[w.id]<3000)){ // 2.13: 3 s on the tile
    ARM[w.id]=Date.now(); b.textContent='Tap again to stop'; b.classList.add('armed'); buzz(20);
    setTimeout(()=>{ if(ARM[w.id] && Date.now()-ARM[w.id]>=2900){ delete ARM[w.id]; renderCard(w); } },3000);
    return;
  }
  if(a==='tundo'){ const t=TUNDO[w.id]; delete TUNDO[w.id]; if(t&&t.undo) t.undo(); renderCard(w); updateToolbar(); save(); return; }
  delete ARM[w.id];
  await runAct(w,a);
});
// A stopwatch's times are copied to the trash before anything clears them (2.6).
const hasTimes=w=>w.run.splits.length>0||w.run.laps.length>0;
function trashWatch(w,label,reset){
  if(!hasTimes(w)) return null;
  return trashPut({kind:'watch',id:w.id+(reset?'@'+Date.now():''),label,item:JSON.parse(JSON.stringify(w)),extra:{elapsed:el(w),reset:!!reset,watchId:w.id}});
}
async function runAct(w,a){
  if(isTeam()) shEnsure(w);
  if(w.sh&&a==='reset'){ const key=trashWatch(w,`${w.name||'Stopwatch'} (before Start over)`,true), ep=w.ep||0; shReset(w); tileUndo(w,'Started over',()=>{ shUnreset(w,ep); if(key) trashTake(key); }); renderCard(w); updateToolbar(); save(); return; }
  if(a==='split'||a==='undo') delete LAPNOTE[w.id];
  if(w.sh&&['start','split','gonow','stop','resume','undo'].includes(a)){ shAct(w,a); if(a==='split') lapNote(w); renderCard(w); updateToolbar(); save(); return; }
  if(a==='reset'){ const key=trashWatch(w,`${w.name||'Stopwatch'} (before Start over)`,true); ACT.reset(w); if(key) tileUndo(w,'Started over',()=>trashRestore(key,true)); renderCard(w); updateToolbar(); save(); return; }
  await ACT[a](w);
  if(a==='split') lapNote(w);
  if(a!=='del'){ renderCard(w); updateToolbar(); save(); }
}
/* ---------- shared stopwatches (3.3) ---------- */
// In a team every stopwatch is shared with every coach phone. A shared stopwatch (w.sh) is:
// - a header: teams/{t}/watches/{id} = {name, workoutId, athleteIds, athleteNames, autoName, day, ep} (w.hs = the
//   header as last sent or received, so only changes are written);
// - append-only tap events: teams/{t}/wevents/{id} = {w, day, ep, type 'start'|'lap'|'gonow'|'stop'|'resume', at, off,
//   by, byName, plan (start only)}. A removed tap is a new version (deleted, in hist), never a deleted document.
// Every phone rebuilds the stopwatch by replaying the events of its current epoch (ep; Start over = ep + 1) through the
// timing engine (ACT) on a virtual clock (VNOW) in this phone's time: server time (at + the tapping phone's clock
// offset) minus this phone's offset. So all phones show the same clock and the same laps, a reload or an update
// rebuilds everything from the saved events, and nothing is written per tick: only on taps. Two coaches' Lap taps
// within 2 s are one lap (the earlier counts unless a coach picks the other); both stay in the lap history.
// Local stopwatches (no team) work exactly as before (ACT directly).
let VNOW=null, REPLAY=false;
const nowMs=()=>VNOW!=null?VNOW:Date.now();
const SH_MERGE=2000;
const isTeam=()=>!!(SYNC&&syncMode()==='joined');
const offNow=()=>CLOCK&&CLOCK.off!=null?CLOCK.off:0;
const srvOf=e=>e.at+(e.off!=null?e.off:offNow());
const locOf=e=>srvOf(e)-offNow();
const coachNm=()=>(S.settings.coachName||'').slice(0,30);
// Two coaches tapping Lap within 2 s: one lap. The earlier counts, unless a coach chose another of the taps.
function lapClusters(L){ const out=[]; let cur=null;
  L.forEach(e=>{ const s=srvOf(e); if(cur&&s-cur.t0<SH_MERGE&&!cur.list.some(x=>x.by===e.by)) cur.list.push(e); else { cur={t0:s,list:[e]}; out.push(cur); } });
  return out.map(c=>{ const pick=c.list.find(x=>x.chosen)||c.list[0]; return {e:pick,all:c.list,alts:c.list.filter(x=>x!==pick)}; }); }
function epEvents(w){ return (w.ev||[]).filter(e=>(e.ep||0)===(w.ep||0)&&!e.deleted).sort((a,b)=>srvOf(a)-srvOf(b)||(a.id<b.id?-1:1)); }
function replayWatch(w){
  const E=epEvents(w), C=lapClusters(E.filter(e=>e.type==='lap')), keep=new Map(C.map(c=>[c.e.id,c]));
  const seq=E.filter(e=>e.type!=='lap'||keep.has(e.id)), hist=HIST[w.id];
  REPLAY=true;
  try{
    w.status='idle'; w.startAt=0; w.pausedT=0; w.run=freshRun(); w.plan=null; w.startBy='';
    for(const e of seq){ VNOW=locOf(e);
      const P=w.status==='running'?planOf(w):null; // a rest that ended before this tap: the next rep started at its end (as tick() does)
      if(P&&w.run.phase==='rest'&&VNOW-w.startAt>=w.run.restEndT){ w.run.rep++; w.run.cp=0; w.run.repStartT=w.run.restEndT; w.run.phase='run'; }
      if(e.type==='start'){ if(w.status!=='idle') continue; w.status='running'; w.startAt=VNOW; w.pausedT=0; w.run=freshRun(); w.plan=e.plan||null; w.startBy=e.byName||''; }
      else if(e.type==='lap'){ if(w.status!=='running') continue; const n0=w.run.splits.length, l0=w.run.laps.length, c=keep.get(e.id); ACT.split(w);
        const info={id:e.id,by:e.by,byName:e.byName||'',ids:c.all.map(x=>x.id),alts:c.alts.map(a=>({id:a.id,byName:a.byName||'',dt:Math.round((srvOf(a)-srvOf(e))/100)/10}))};
        if(w.run.splits.length>n0) w.run.splits[w.run.splits.length-1].tap=info; else if(w.run.laps.length>l0){ (w.run.lapTaps||(w.run.lapTaps=[]))[w.run.laps.length-1]=info; } }
      else if(e.type==='gonow') ACT.gonow(w);
      else if(e.type==='stop'){ if(w.status==='running') ACT.stop(w); }
      else if(e.type==='resume'){ if(w.status==='paused') ACT.resume(w); }
    }
  } finally { VNOW=null; REPLAY=false; HIST[w.id]=hist||[]; }
}
const shHeader=w=>({name:String(w.name||'').slice(0,60),workoutId:w.workoutId||null,athleteIds:(w.athleteIds||[]).slice(0,40),athleteNames:(w.athleteNames||[]).slice(0,40).map(x=>String(x).slice(0,40)),autoName:w.autoName||null,day:w.day||localDate(new Date()),ep:w.ep||0});
function newEvent(w,type,at){ return {id:uid()+uid().slice(0,4),w:w.id,day:w.day,ep:w.ep||0,type,at:at||Date.now(),off:CLOCK&&CLOCK.off!=null?CLOCK.off:null,by:myId(),byName:coachNm()}; }
// Start one stopwatch (at a given instant, so several start together). Shared: a start tap.
function startWatch(w,at){ if(isTeam()) shEnsure(w); if(w.sh){ shAct(w,'start',at); return; } ACT.start(w); if(at) w.startAt=at; }
// Share a local stopwatch with the team: a header, and its times so far as events (start, laps, early rep starts, stop).
function shEnsure(w){ if(w.sh||!isTeam()) return; w.sh=true; w.ep=w.ep||0; w.day=localDate(new Date()); w.ev=w.ev||[];
  if(w.status!=='idle'){ const t=el(w), st=Date.now()-t, at=x=>st+x;
    const s=newEvent(w,'start',st); s.plan=w.plan||null; w.ev.push(s);
    const P=planOf(w); if(P){ let prevEnd=null; w.run.splits.forEach((x,i)=>{ const pr=w.run.splits[i-1]; if(pr&&pr.rep!==x.rep&&P.rest>0){ const rs=x.t-x.act*1000; if(Math.abs(rs-(pr.t+P.rest*1000))>500) w.ev.push(newEvent(w,'gonow',at(rs))); } w.ev.push(newEvent(w,'lap',at(x.t))); }); }
    else w.run.laps.forEach(x=>w.ev.push(newEvent(w,'lap',at(x))));
    if(w.status==='paused') w.ev.push(newEvent(w,'stop',at(t))); }
  replayWatch(w); if(SYNC&&SYNC.watchEvent) w.ev.forEach(e=>SYNC.watchEvent(e)); shPush(); }
// Send changed headers (rename, runners, workout, Start over). Called after every save. An idle stopwatch from before joining stays on this phone until it's used.
function shPush(){ if(!isTeam()||!SYNC.watchHeader) return; S.watches.forEach(w=>{ if(!isTeam()) return; if(!w.sh){ if(w.tm||w.status!=='idle') shEnsure(w); return; } const h=JSON.stringify(shHeader(w)); if(h!==w.hs){ w.hs=h; SYNC.watchHeader(w.id,JSON.parse(h)); } }); }
// A tap on a shared stopwatch: an event, then the stopwatch is rebuilt from its events.
function shAddEv(w,e){ (w.ev||(w.ev=[])).push(e); if(w.day!==localDate(new Date())){ w.day=localDate(new Date()); e.day=w.day; } replayWatch(w); if(SYNC&&SYNC.watchEvent) SYNC.watchEvent(e); }
function shChange(w,e,patch){ const v={deleted:!!patch.deleted,chosen:!!patch.chosen,uid:myId(),byName:coachNm(),at:Date.now()};
  Object.assign(e,{deleted:!!patch.deleted,chosen:!!patch.chosen}); e.hist=[...(e.hist||[]),v]; replayWatch(w); if(SYNC&&SYNC.watchEventChange) SYNC.watchEventChange(e,v); }
// The latest tap that counts (a lap, or an early start of the next rep), with every tap merged into it.
function shLastTap(w){ const E=epEvents(w).filter(e=>e.type==='lap'||e.type==='gonow'); if(!E.length) return null; const last=E[E.length-1];
  if(last.type!=='lap') return {list:[last],e:last}; const C=lapClusters(E.filter(e=>e.type==='lap')), c=C[C.length-1]; return {list:c.all,e:c.e}; }
function shAct(w,a,at){
  if(a==='start'){ if(w.status!=='idle') return; const e=newEvent(w,'start',at); const wk=w.workoutId&&S.workouts.find(x=>x.id===w.workoutId); e.plan=wk?planCopy(wk,w):null; shAddEv(w,e); buzz(40); return; }
  if(a==='split'){ if(w.status!=='running') return; const P=planOf(w); if(P&&w.run.phase!=='run') return; shAddEv(w,newEvent(w,'lap',at)); buzz(30); if(w.status==='done') beep(1046,0.25); return; }
  if(a==='gonow'){ if(w.run.phase!=='rest') return; shAddEv(w,newEvent(w,'gonow',at)); beep(880,0.3); buzz([120]); return; }
  if(a==='stop'){ if(w.status!=='running') return; shAddEv(w,newEvent(w,'stop',at)); return; }
  if(a==='resume'){ if(w.status!=='paused') return; shAddEv(w,newEvent(w,'resume',at)); return; }
  if(a==='undo'){ const t=shLastTap(w); if(!t) return; t.list.forEach(e=>shChange(w,e,{deleted:true})); toast('Last split removed'); return; }
}
// Start over on a shared stopwatch: a new epoch for every phone (the old taps stay; Undo goes back to them).
function shReset(w){ w.ep=(w.ep||0)+1; replayWatch(w); shPush(); }
function shUnreset(w,ep){ w.ep=ep; replayWatch(w); shPush(); }
// Use another coach's tap for a lap (both stay in the history).
function shChoose(w,id){ const e=(w.ev||[]).find(x=>x.id===id); if(!e) return; const C=lapClusters(epEvents(w).filter(x=>x.type==='lap')), c=C.find(k=>k.all.includes(e)); if(!c) return;
  c.all.forEach(x=>{ if(x!==e&&x.chosen) shChange(w,x,{chosen:false}); }); shChange(w,e,{chosen:true}); renderCard(w); save(); toast(`Lap uses ${e.byName||'the other coach'}’s tap`); }
// Remote changes (sync.js): headers and events from other phones.
function shRemoteHeader(id,h){ let w=S.watches.find(x=>x.id===id);
  if(h.deleted){ if(w){ SH_SEEN[w.id]=(w.ev||[]).slice(); trashWatch(w,`${w.name||'Stopwatch'} (removed by another coach)`); S.watches=S.watches.filter(x=>x!==w); const n=cardEls[w.id]; delete cardEls[w.id]; if(n) n.remove(); return 'del'; } return null; }
  let added=false; if(!w){ if(S.watches.length>=MAX) return null; added=true; w={...newWatch(h.name,h.workoutId),id,sh:true,ev:(SH_SEEN[id]||[]).slice()}; delete SH_PENDING[id]; S.watches.push(w); } // a restored stopwatch gets back every tap seen for it
  const was=w.ep||0; Object.assign(w,{name:h.name,workoutId:h.workoutId||null,athleteIds:h.athleteIds||[],athleteNames:h.athleteNames||[],autoName:h.autoName||null,day:h.day,ep:h.ep||0,sh:true});
  w.hs=JSON.stringify(shHeader(w)); if(was!==w.ep||!cardEls[w.id]) replayWatch(w); return added?'add':'upd'; }
const SH_PENDING={}, SH_SEEN={}; // events that arrive before their stopwatch's header; every event received, by stopwatch (this session)
function shRemoteEvent(e){ const seen=SH_SEEN[e.w]||(SH_SEEN[e.w]=[]), k=seen.findIndex(x=>x.id===e.id); if(k>=0) seen[k]=e; else seen.push(e);
  const w=S.watches.find(x=>x.id===e.w); if(!w){ (SH_PENDING[e.w]||(SH_PENDING[e.w]=[])).push(e); return null; }
  const ev=w.ev||(w.ev=[]), had=ev.find(x=>x.id===e.id);
  if(had){ if((e.hist||[]).length<(had.hist||[]).length&&!(e.off!=null&&had.off==null)) return null; Object.assign(had,e); } else ev.push(e);
  return w; }
// After the clock offset is measured: this phone's taps saved without one get it, and every shared clock is rebuilt.
function shClockFixed(off){ S.watches.forEach(w=>{ if(!w.sh) return; (w.ev||[]).forEach(e=>{ if(e.by===myId()&&e.off==null){ e.off=off; if(SYNC&&SYNC.watchEventOff) SYNC.watchEventOff(e); } }); replayWatch(w); renderCard(w); }); }
// "Coach Jen offline": coaches who tapped today's shared stopwatches and whose phone hasn't been heard from lately.
let DEVICES=[];
function coachNote(){ const n=$('#coachNote'); if(!n) return; if(!isTeam()){ n.textContent=''; return; }
  const today=localDate(new Date()), who=new Map(); S.watches.forEach(w=>{ if(!w.sh||w.status==='idle') return; (w.ev||[]).forEach(e=>{ if(e.day===today&&e.by!==myId()) who.set(e.by,e.byName||''); }); });
  const srvNow=Date.now()+offNow(), off=[...who.entries()].filter(([u])=>{ const d=DEVICES.find(x=>x.uid===u); return !d||srvNow-d.seen>150000; }).map(([u,nm])=>{ const d=DEVICES.find(x=>x.uid===u); return (d&&d.name)||nm||'A coach'; });
  const me=navigator.onLine===false?'This phone is offline: its taps are saved and sync when the signal is back.':'';
  n.textContent=[me,...off.map(x=>`${x} offline`)].filter(Boolean).join(' · '); }
// While a shared clock runs, this phone says it's here once a minute (not per tick), so others can tell who's offline.
setInterval(()=>{ if(isTeam()&&S.watches.some(w=>w.sh&&w.status==='running')&&SYNC.heartbeat) SYNC.heartbeat(); coachNote(); },60000);

grid.addEventListener('input',e=>{
  const t=e.target; if(t.dataset.actInput!=='name') return;
  const w=S.watches.find(x=>x.id===t.closest('.watch').dataset.id); if(!w) return;
  w.name=t.value; save();
});
grid.addEventListener('change',e=>{
  const t=e.target; if(t.dataset.actInput!=='plan') return;
  const w=S.watches.find(x=>x.id===t.closest('.watch').dataset.id); if(!w) return;
  w.workoutId=t.value||null; if(w.status==='done'){ if(w.sh) shReset(w); else ACT.reset(w); } if(!w.sh) w.run=freshRun();
  renderCard(w); save();
});

function renderGrid(){
  grid.innerHTML=''; for(const k in cardEls) delete cardEls[k];
  $('#newBtn').hidden=!S.watches.length; // 2.7.1 / 3.0: the three choices with no stopwatches, otherwise the nav bar + (never both)
  if(!S.watches.length){
    grid.innerHTML=`<div class="empty-start"><h2>Time your runners</h2>${choicesHTML()}<button type="button" class="linkish" data-help>How to read a stopwatch card</button></div>`;
  }
  S.watches.forEach(renderCard);
  updateToolbar();
}
// Start all / Stop all only appear when there are 2+ to start or stop.
function updateToolbar(){
  const idle=S.watches.filter(w=>w.status==='idle').length, run=S.watches.filter(w=>w.status==='running').length;
  const sa=$('#startAll'), so=$('#stopAll');
  sa.hidden=idle<2; so.hidden=run<2;
  sa.textContent=`Start all ${idle}`; so.textContent=`Stop all ${run}`; // 3.4: short, so the toolbar is one row
  $('#bulkRow').hidden=idle<2 && run<2;
  const ew=$('#endWk'), ed=$('#editW'); if(ew) ew.hidden=!S.watches.length; if(ed){ ed.hidden=!S.watches.length; if(!S.watches.length&&EDITW) setEditW(false); }
  const f=S.settings.watchShow, bar=$('#watchBar'); if(bar){ coachNote(); const nOff=S.watches.filter(w=>!showable(w)).length;
    $('#showBtn').textContent=f?`Show: ${S.watches.length-nOff} of ${S.watches.length}`:'Show: All'; bar.hidden=!S.watches.length&&!$('#coachNote').textContent; $('#showBtn').hidden=S.watches.length<2&&!f; }
}
// 3.3: "Show" on the Stopwatches tab: All, or chosen groups and runners (this phone only).
const showable=w=>{ const f=S.settings.watchShow; if(!f) return true; return (w.athleteIds||[]).some(id=>(f.ids||[]).includes(id))||(f.g||[]).includes(w.name)||(f.w||[]).includes(w.id); };
function showSheet(){ const f=S.settings.watchShow||{ids:[],g:[],w:[]}, sel={ids:new Set(f.ids||[]),g:new Set(f.g||[]),w:new Set(f.w||[])};
  const groups=[...new Set(S.watches.filter(w=>(w.athleteIds||[]).length>1).map(w=>w.name).filter(Boolean))], runners=[], seen=new Set();
  S.watches.forEach(w=>(w.athleteIds||[]).forEach((id,i)=>{ if(seen.has(id)) return; seen.add(id); runners.push({id,name:(S.roster.find(a=>a.id===id)||{}).name||w.athleteNames[i]||'Runner'}); }));
  const loose=S.watches.filter(w=>!(w.athleteIds||[]).length);
  const chip=(k,v,label)=>`<button type="button" class="chip" data-sk="${k}" data-sv="${esc(v)}" aria-pressed="${sel[k].has(v)}">${esc(label)}</button>`;
  modal(`<div class="sheet-head"><h2>Show</h2><button class="btn plain" data-x="done">Done</button></div>
    <p class="hint">Pick the groups and runners you’re timing. Only this phone changes; other coaches still see everything.</p>
    <button type="button" class="btn${S.settings.watchShow?'':' primary'}" data-sall>All stopwatches</button>
    ${groups.length?`<h3>Groups</h3><div class="chips">${groups.map(g=>chip('g',g,g)).join('')}</div>`:''}
    ${runners.length?`<h3>Runners</h3><div class="chips">${runners.sort((a,b)=>a.name.localeCompare(b.name)).map(r=>chip('ids',r.id,r.name)).join('')}</div>`:''}
    ${loose.length?`<h3>Other stopwatches</h3><div class="chips">${loose.map(w=>chip('w',w.id,w.name||'Stopwatch')).join('')}</div>`:''}`,(m,close)=>{
    const apply=()=>{ const any=sel.ids.size||sel.g.size||sel.w.size; S.settings.watchShow=any?{ids:[...sel.ids],g:[...sel.g],w:[...sel.w]}:null; save(); S.watches.forEach(renderCard); updateToolbar(); };
    m.querySelector('[data-x=done]').onclick=close;
    m.querySelector('[data-sall]').onclick=()=>{ sel.ids.clear(); sel.g.clear(); sel.w.clear(); apply(); close(); };
    m.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{ const k=b.dataset.sk, v=b.dataset.sv; if(sel[k].has(v)) sel[k].delete(v); else sel[k].add(v); b.setAttribute('aria-pressed',String(sel[k].has(v))); apply(); });
  }); }

/* ---------- + New, ⋯ menu, ? help, quick tour ---------- */
const NEW_CHOICES=[
  ['quick','⏱','Quick stopwatch','Starts timing now. Name it later.'],
  ['workout','🏃','Workout','Pick runners, pick a workout, go.'],
  ['race','🏁','Race','One clock for everyone. Tap names as they pass.']];
function choicesHTML(){
  return `<div class="choices">${NEW_CHOICES.map(([k,i,t,d])=>`<button type="button" class="choice" data-new="${k}"><span class="ic" aria-hidden="true">${i}</span><span class="tx"><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>`;
}
function newChoice(k){ if(k==='quick') quickStopwatch(); if(k==='workout') openWorkoutFlow(); if(k==='race') raceEntry(); }
function newSheet(){
  modal(`<div class="new-sheet"><div class="sheet-head"><h2>New</h2><button class="icon-btn" data-x="no" aria-label="Close">×</button></div>
    ${choicesHTML()}<p class="hint">${S.watches.length} of ${MAX} stopwatches used.</p></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>{ close(); newChoice(b.dataset.new); });
  });
}
$('#newBtn').onclick=newSheet;
const nextRunnerName=()=>{ const used=new Set(S.watches.map(w=>w.name)); let k=1; while(used.has('Runner '+k)) k++; return 'Runner '+k; };
function quickStopwatch(){
  if(S.watches.length>=MAX){ toast(`The limit is ${MAX} stopwatches. Clear finished ones in Settings.`); return; }
  const w=newWatch(nextRunnerName(),null); w.autoName=w.name;
  S.watches.push(w); audioInit(); startWatch(w);
  if(curTab!=='watches') showTab('watches'); else renderGrid();
  save(); cardEls[w.id].scrollIntoView({block:'nearest',behavior:'smooth'});
  toast(`${w.name} is timing. Tap the name to rename it.`);
}
function sheetHead(title){ return `<div class="sheet-head"><h2>${title}</h2><button class="icon-btn" data-x="no" aria-label="Close">×</button></div>`; }
// The ⋯ menu shows only what fits the card's state.
function cardMenu(w){
  const P=planOf(w), st=w.status, canUndo=P?w.run.splits.length>0:w.run.laps.length>0, items=[];
  if(st==='running') items.push(['stop','Stop','Freezes the clock. You can keep timing after.']);
  if(st==='paused') items.push(['resume','Keep timing','Picks up where it stopped.']);
  if(st==='paused'||st==='done') items.push(['reset','Start over','Clears the times and goes back to Start.']);
  if(canUndo && st!=='idle') items.push(['undo',undoLabel(w,P)||'Undo last tap','']);
  if(st==='idle'){ items.push(['plan','Change workout',P?'Now: '+(P.name||'Workout'):'Now: no workout']); if(S.roster.length) items.push(['members','Change runners','']);
    const ewk=w.workoutId&&S.workouts.find(x=>x.id===w.workoutId); if(isEffortWk(ewk)) items.push(['targets','Targets…','See or adjust this stopwatch’s paces (estimates)']); } // 2.11
  items.push(['rename','Rename','']);
  if(st!=='running') items.push(['del','Remove stopwatch','']);
  modal(`<div class="menu-sheet">${sheetHead(esc(w.name||'Stopwatch'))}<div class="menu-list">${items.map(([k,l,h])=>`<button type="button" class="menu-item${k==='del'||k==='stop'?' warn':''}" data-m="${k}">${l}${h?`<small>${esc(h)}</small>`:''}</button>`).join('')}</div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-m]').forEach(b=>b.onclick=async()=>{
      const k=b.dataset.m; close();
      if(k==='plan') return planSheet(w);
      if(k==='members') return openBench({watch:w});
      if(k==='rename') return renameSheet(w);
      if(k==='targets') return targetsSheet(w);
      audioInit(); delete ARM[w.id];
      await runAct(w,k); // one tap here, including Stop: opening the menu was the safeguard
    });
  });
}
function planSheet(w){
  const opts=[['','No workout (just a stopwatch)'],...S.workouts.map(k=>[k.id,k.name||'Untitled workout'])], cur=w.workoutId||'';
  modal(`<div class="menu-sheet">${sheetHead('Workout for '+esc(w.name||'this stopwatch'))}<div class="menu-list">${opts.map(([id,l])=>`<button type="button" class="menu-item" data-wk="${id}" aria-pressed="${id===cur}">${id===cur?'✓ ':''}${esc(l)}</button>`).join('')}</div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-wk]').forEach(b=>b.onclick=()=>{
      if(hasTimes(w)) trashWatch(w,`${w.name||'Stopwatch'} (before changing workout)`,true);
      w.workoutId=b.dataset.wk||null; if(w.status==='done'){ if(w.sh) shReset(w); else ACT.reset(w); } if(!w.sh) w.run=freshRun();
      close(); renderCard(w); save();
    });
  });
}
function renameSheet(w){
  modal(`<h2>Rename</h2><label class="field">Name<input id="rnName" maxlength="40" value="${esc(w.name)}" autocomplete="off" autocapitalize="words"></label>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Save</button></div>`,(m,close)=>{
    const i=m.querySelector('#rnName'); m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ const v=i.value.trim().slice(0,40); if(v) w.name=v; close(); renderCard(w); save(); };
    i.addEventListener('keydown',e=>{ if(e.key==='Enter') m.querySelector('[data-x=yes]').click(); });
    setTimeout(()=>{ i.focus(); i.select(); },30);
  });
}
function helpSheet(){
  const tol=+S.settings.tol||1;
  modal(`<h2>How to read a card</h2>
    <div class="help-row"><span class="ghost-k"></span><span><b>Dashed ring</b>: where the runner should be at target pace.</span></div>
    <div class="help-row"><span class="run-k"></span><span><b>Dot</b>: where the runner is, from your last tap.</span></div>
    <div class="help-row"><span class="sw ok"></span><span><b>On pace</b>: within ${tol} s of the plan.</span></div>
    <div class="help-row"><span class="sw fast"></span><span><b>Too fast</b>: ahead of the plan. Time to ease off.</span></div>
    <div class="help-row"><span class="sw slow"></span><span><b>Behind</b>: slower than the plan.</span></div>
    <div class="help-row"><span class="sw bad"></span><span><b>Well behind</b>: more than ${tol*3} s slow.</span></div>
    <p>↶ undoes a mis-tap. Change what counts as on pace in Settings.</p>
    <div class="modal-btns"><button class="btn" data-x="tour">Show the quick tour</button><button class="btn primary" data-x="no">Got it</button></div>`,(m,close)=>{
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=tour]').onclick=()=>{ close(); showTour(0); };
  });
}
// 3.0: help is in Settings > Help (#helpBtn)
const TOUR_KEY='mustang-splits:tour';
const TOUR=[
  ['Add your runners','Tap + New, then Workout. Pick names one by one, or a whole group at once, then pick a workout.'],
  ['Start','Tap Start on a card, or Start all to start everyone together.'],
  ['Tap as they pass','Tap the big button each time a runner passes a mark. Colors show on pace, too fast, or behind. ↶ undoes a mis-tap.']];
function showTour(i){
  const end=()=>{ try{ localStorage.setItem(TOUR_KEY,'1'); }catch(e){} };
  modal(`<div class="tour"><p class="tour-step">${i+1} of ${TOUR.length}</p><h2>${TOUR[i][0]}</h2><p>${TOUR[i][1]}</p>
    <div class="modal-btns">${i<TOUR.length-1?'<button class="btn" data-x="skip">Skip</button><button class="btn primary" data-x="next">Next</button>':'<button class="btn primary" data-x="done">Got it</button>'}</div></div>`,(box,close)=>{
    const m=box.firstElementChild;
    $('#overlay').onclick=e=>{ if(e.target.id==='overlay'){ end(); close(); } };
    const b=k=>m.querySelector(`[data-x=${k}]`);
    if(b('skip')) b('skip').onclick=()=>{ end(); close(); };
    if(b('next')) b('next').onclick=()=>showTour(i+1);
    if(b('done')) b('done').onclick=()=>{ end(); close(); };
  });
}
// Workout flow: step 1 who's running, step 2 which workout, then start now or later.
// The bar at the top of every runner picker (2.13): Select all, Girls, Boys, Clear (and Suggest pace groups in the workout flow).
const pickBar=groups=>`<div class="pick-bar" role="group" aria-label="Select runners"><button type="button" class="btn" data-pk="all">Select all</button><button type="button" class="btn" data-pk="G">Girls</button><button type="button" class="btn" data-pk="B">Boys</button><button type="button" class="btn" data-pk="clear">Clear</button>${groups?'<button type="button" class="btn pk-groups" data-pk="groups">Suggest pace groups</button>':''}</div>`;
// Which runners a pick-bar button selects (free runners only); 'clear' = none.
const pickIds=(k,people,held)=>people.filter(a=>!a.ghost&&!(held&&held[a.id])&&(k==='all'||a.gender===k)).map(a=>a.id);
// Runners by Girls / Boys for the pickers (2.12: groups are no longer kept on the Team tab).
function genderSecs(list){ const by=g=>list.filter(a=>!a.ghost&&(g?a.gender===g:a.gender!=='G'&&a.gender!=='B')).sort((p,q)=>p.name.localeCompare(q.name));
  return [['Girls',by('G')],['Boys',by('B')],['No Girls/Boys yet',by('')],['No longer on the team',list.filter(a=>a.ghost)]].filter(x=>x[1].length); }
// Step 2 of the workout flow (2.14): each picked runner's target for the first effort part, by its standard pace name,
// with the basis ("Based on 5K season best 18:32.6, 9/19"). Runners with no race this season are flagged, with a time
// trial or a group to run with.
function targetsList(list,wk){ const seg=(wk.segments||[]).find(segEffort), d=+seg.dist, ref=segRef(seg);
  return `<h3 class="tg-h">Targets <span class="n">${esc(PACE_WORD[ref])} · ${esc(fmtDist(d))}</span></h3><div class="tg-list">${list.map(a=>{ const p=paceProfile(a), spm=p?refPace(p,seg):null;
    return p&&spm?`<div class="tg-row"><span><b>${esc(a.name)}</b><small>${esc(p.basis)}</small></span><b class="num">${fmtSec(spm*d/MILE,d<=400?1:0)}</b></div>`
      :`<div class="tg-row warn"><span><b>${esc(a.name)}</b><small>No race this season: no pace yet.</small></span><span class="tg-fix"><button type="button" class="btn" data-x="tt" data-id="${a.id}">Time trial</button><button type="button" class="btn" data-x="withgrp">Run with a group</button></span></div>`; }).join('')}</div>`; }
// Pace groups (2.12): each runner's training pace for the workout's effort (its first "by effort" part; 5K pace when the
// workout has none), fastest first; a group grows while its slowest is within 3% of its fastest. Runners with no pace
// yet (no race this season) end up together in a last group. Returns [[ids...], ...] and the pace per runner.
function paceOfFor(a,wk){ const prof=paceProfile(a); if(!prof) return null; const seg=wk&&(wk.segments||[]).find(segEffort); return refPace(prof,seg||{mode:'effort',paceRef:'5k'}); }
function suggestGroups(list,wk){
  const P=list.map(a=>({a,p:paceOfFor(a,wk)})), have=P.filter(o=>o.p).sort((x,y)=>x.p-y.p), none=P.filter(o=>!o.p), out=[];
  have.forEach(o=>{ const g=out[out.length-1]; if(g&&(o.p-g[0].p)/g[0].p<=0.029) g.push(o); else out.push([o]); });
  if(none.length) out.push(none);
  return out.map(g=>g.map(o=>o.a.id));
}
const effortWord=wk=>{ const seg=wk&&(wk.segments||[]).find(segEffort); return seg?PACE_WORD[segRef(seg)]+(seg.mode==='effort'&&seg.paceRef==='pct'?' '+(+seg.pct||100)+'%':''):'5K pace'; };
function groupSpread(ids,wk){ const P=ids.map(id=>paceOfFor(S.roster.find(a=>a.id===id),wk)).filter(Boolean).sort((x,y)=>x-y); if(P.length<2) return 0; return (P[P.length-1]-P[0])/P[Math.floor((P.length-1)/2)]; }
function openWorkoutFlow(o){
  o=o||{};
  const held=heldBy(null), sel=new Set(o.ids||[]), people=S.roster.filter(a=>a.name.trim()), secs=genderSecs(people);
  let step=o.ids&&o.ids.length?2:1, wkId=o.workoutId!==undefined?o.workoutId:undefined, mode=o.mode||'each', grp={}; // grp: runner id -> group number (1, 2, ...)
  const wkOf=()=>wkId?S.workouts.find(k=>k.id===wkId):null, picked=()=>people.filter(a=>sel.has(a.id));
  const groupsNow=()=>{ const by={}; picked().forEach(a=>{ const g=grp[a.id]||1; (by[g]||(by[g]=[])).push(a.id); }); return Object.keys(by).map(Number).sort((x,y)=>x-y).map(k=>by[k]); };
  const suggest=()=>{ grp={}; suggestGroups(picked(),wkOf()).forEach((ids,i)=>ids.forEach(id=>{ grp[id]=i+1; })); };
  modal(`<div class="flow"></div>`,(box,close)=>{
    box.classList.add('wide');
    const m=box.firstElementChild;
    const draw=()=>{
      const room=MAX-S.watches.length;
      if(step===1){
        const chip=a=>{ const hw=held[a.id]; return `<button type="button" class="chip-a g-${a.gender||'u'}${hw?' busy':''}" data-a="${a.id}" aria-pressed="${sel.has(a.id)}"${hw?' aria-disabled="true"':''}><span class="nm">${esc(a.name)}</span>${hw?`<small>on ${esc(hw.name||'a stopwatch')}</small>`:''}</button>`; };
        m.innerHTML=`${sheetHead('Who’s running?')}<p class="race-sec">Step 1 of 2. Tap names, or use the buttons. You can make groups in step 2.</p>
          ${people.length?pickBar(true):''}${people.length?`<div class="bench">${secs.map(([g,as],gi)=>`<section class="bench-grp"><button type="button" class="bench-gh" data-gi="${gi}" data-g="${g==='Girls'?'G':g==='Boys'?'B':''}">${esc(g)} <span class="n">${as.filter(a=>!held[a.id]).length} free</span></button><div class="chips">${as.map(chip).join('')}</div></section>`).join('')}</div>`
            :`<div class="empty">No runners on your team yet. Add them once on the Team tab.</div><button type="button" class="btn" data-x="team">Add runners on the Team tab</button>`}
          ${room<1?`<p class="form-err">The limit is ${MAX} stopwatches. Clear finished ones in Settings first.</p>`:''}
          <button type="button" class="btn primary flow-next" data-x="next" ${room<1?'disabled':''}>${sel.size?`Next (${sel.size} picked)`:'Skip: one stopwatch, no names'}</button>`;
      } else {
        const opts=[[null,'No workout, just stopwatches'],...S.workouts.map(k=>[k.id,k.name||'Untitled workout'])], G=mode==='groups'?groupsNow():[], wk=wkOf();
        const nG=Math.max(1,...Object.values(grp),1), groupsHTML=mode!=='groups'?'':`<div class="grp-make">
            <button type="button" class="btn" data-x="suggest">Suggest pace groups</button><p class="hint">Uses each runner’s ${esc(effortWord(wk))} from their races (within 3% in a group). Change any runner’s group below.</p>
            ${G.map((ids,i)=>{ const sp=groupSpread(ids,wk), noPace=ids.filter(id=>!paceOfFor(S.roster.find(a=>a.id===id),wk));
              return `<section class="grp-card"><h4>Group ${i+1} <span class="n">${ids.length} runner${ids.length===1?'':'s'}${ids.length===1?' · own stopwatch':''}</span></h4>
                ${sp>0.03?`<p class="ts-warn">Paces differ by ${(sp*100).toFixed(1)}% (more than 3%).</p>`:''}${noPace.length?`<p class="hint">No pace yet (no race this season): ${esc(noPace.map(id=>S.roster.find(a=>a.id===id).name).join(', '))}</p>`:''}
                ${ids.map(id=>{ const a=S.roster.find(x=>x.id===id), p=paceOfFor(a,wk), cur=grp[id]||1;
                  return `<div class="grp-row"><span class="nm">${esc(a.name)}${p?`<small>${fmtSec(p,0)}/mi</small>`:''}</span><select data-grp="${id}" aria-label="Group for ${esc(a.name)}">${Array.from({length:nG},(_,k)=>`<option value="${k+1}"${k+1===cur?' selected':''}>Group ${k+1}</option>`).join('')}<option value="new">New group</option></select></div>`; }).join('')}</section>`; }).join('')}</div>`;
        m.innerHTML=`${sheetHead('Which workout?')}<p class="race-sec">Step 2 of 2. <button type="button" class="linkish" data-x="back">← Back to runners</button></p>
          <div class="menu-list">${opts.map(([id,l])=>`<button type="button" class="menu-item" data-wk="${id||''}" aria-pressed="${wkId!==undefined&&(wkId||'')===(id||'')}">${wkId!==undefined&&(wkId||'')===(id||'')?'✓ ':''}${esc(l)}</button>`).join('')}</div>
          ${sel.size>1?`<div class="seg2 seg3" role="group" aria-label="Stopwatches"><button type="button" data-mode="each" aria-pressed="${mode==='each'}">One each</button><button type="button" data-mode="group" aria-pressed="${mode==='group'}">One for all</button><button type="button" data-mode="groups" aria-pressed="${mode==='groups'}">Make groups</button></div>`:''}
          ${groupsHTML}
          ${wk&&isEffortWk(wk)&&sel.size?targetsList(picked(),wk):''}
          ${mode==='each'&&sel.size>room?`<p class="hint">Room for ${room} more: ${sel.size-room} won't get their own.</p>`:''}${mode==='groups'&&G.length>room?`<p class="hint">Room for ${room} more stopwatches: ${G.length-room} group${G.length-room===1?'':'s'} won't fit.</p>`:''}
          <div class="btn-row"><button type="button" class="btn go" data-x="startnow" ${wkId===undefined?'disabled':''}>Start now</button><button type="button" class="btn" data-x="later" ${wkId===undefined?'disabled':''}>Set up, start later</button></div>`;
      }
    };
    const create=startNow=>{
      const room=MAX-S.watches.length, list=picked(), made=[];
      if(!list.length){ const w=newWatch(nextRunnerName(),wkId||null); w.autoName=w.name; made.push(w); }
      else if(mode==='group' && list.length>1){ const w=newWatch('',wkId||null); link(w,list); w.name=w.autoName; made.push(w); }
      else if(mode==='groups' && list.length>1){ groupsNow().slice(0,room).forEach((ids,i)=>{ const L2=ids.map(id=>list.find(a=>a.id===id)), w=newWatch('',wkId||null); link(w,L2); w.name=L2.length>1?`Group ${i+1}`:w.autoName; made.push(w); }); }
      else list.slice(0,room).forEach(a=>{ const w=newWatch('',wkId||null); link(w,[a]); w.name=w.autoName; made.push(w); });
      S.watches.push(...made);
      if(startNow){ audioInit(); const now=Date.now(); made.forEach(w=>startWatch(w,now)); } // same instant for all
      close(); if(curTab!=='watches') showTab('watches'); else renderGrid(); save();
      const left=mode==='group'?0:mode==='groups'?Math.max(0,groupsNow().length-room):list.length-Math.min(list.length,room);
      toast(`${startNow?'Started':'Added'} ${made.length} stopwatch${made.length===1?'':'es'}${left?`. ${left} didn't fit (limit ${MAX}).`:''}`);
    };
    m.addEventListener('change',e=>{ const s=e.target.closest('[data-grp]'); if(!s) return; const id=s.dataset.grp; grp[id]=s.value==='new'?Math.max(0,...Object.values(grp),...groupsNow().map((_,i)=>i+1))+1:+s.value;
      // renumber 1..n in order, so an emptied group disappears
      const order=[...new Set(picked().map(a=>grp[a.id]||1))].sort((x,y)=>x-y), map=Object.fromEntries(order.map((g,i)=>[g,i+1])); picked().forEach(a=>{ grp[a.id]=map[grp[a.id]||1]; }); draw(); });
    m.addEventListener('click',e=>{
      const t=e.target;
      const c=t.closest('[data-a]');
      if(c){ const id=c.dataset.a, hw=held[id]; if(hw){ toast(`${people.find(a=>a.id===id).name} is on ${hw.name||'another stopwatch'}`); return; }
        if(sel.has(id)) sel.delete(id); else sel.add(id); draw(); return; }
      const gh=t.closest('[data-gi]');
      if(gh){ const free=secs[+gh.dataset.gi][1].filter(a=>!held[a.id]), all=free.length&&free.every(a=>sel.has(a.id));
        free.forEach(a=>{ if(all) sel.delete(a.id); else sel.add(a.id); }); draw(); return; }
      const pk=t.closest('[data-pk]');
      if(pk){ const k=pk.dataset.pk; if(k==='clear') sel.clear(); else if(k==='groups'){ if(!sel.size) pickIds('all',people,held).forEach(id=>sel.add(id)); step=2; mode='groups'; suggest(); } else { sel.clear(); pickIds(k,people,held).forEach(id=>sel.add(id)); } draw(); return; }
      const wk=t.closest('[data-wk]'); if(wk){ wkId=wk.dataset.wk||null; draw(); return; }
      const md=t.closest('[data-mode]'); if(md){ mode=md.dataset.mode; if(mode==='groups'&&!Object.keys(grp).length) suggest(); draw(); return; }
      const x=t.closest('[data-x]'); if(!x) return;
      const k=x.dataset.x;
      if(k==='no') close();
      if(k==='team'){ close(); showTab('team'); }
      if(k==='next'){ step=2; draw(); }
      if(k==='back'){ step=1; draw(); }
      if(k==='suggest'){ suggest(); draw(); toast(`${groupsNow().length} pace group${groupsNow().length===1?'':'s'} suggested`); }
      if(k==='tt'){ const a=people.find(y=>y.id===x.dataset.id); const keep={ids:[...sel],workoutId:wkId,mode}; close(); timeTrialSheet(a,()=>openWorkoutFlow(keep)); return; }
      if(k==='withgrp'){ mode='groups'; if(!Object.keys(grp).length) suggest(); draw(); toast('Pick a group for each runner without a pace'); }
      if(k==='startnow') create(true);
      if(k==='later') create(false);
    });
    if(mode==='groups') suggest();
    draw();
  });
}
$('#showBtn').onclick=()=>showSheet(); // 3.3
// 3.3.1: remove several stopwatches at once (Edit mode, End workout): each with times to Recently deleted, shared ones off
// every coach's phone; returns the Undo.
function removeWatches(list,label){ const keys=[];
  list.forEach(w=>{ const k=trashWatch(w,`${w.name||'Stopwatch'} (${label})`); if(k) keys.push(k); if(w.sh&&isTeam()&&SYNC.watchHeaderDel) SYNC.watchHeaderDel(w.id,true); delete TUNDO[w.id]; delete LAPNOTE[w.id]; });
  S.watches=S.watches.filter(w=>!list.includes(w)); renderGrid(); save();
  return ()=>{ keys.forEach(k=>trashTake(k)); list.forEach(w=>{ if(!S.watches.includes(w)&&S.watches.length<MAX){ S.watches.push(w); if(w.sh&&isTeam()&&SYNC.watchHeaderDel) SYNC.watchHeaderDel(w.id,false); } }); renderGrid(); save(); }; }
// End workout (3.3.1): every stopwatch's laps and splits go to practice history, then every tile is cleared, with one Undo.
// Running clocks stop at that moment. Shared: for every coach ("End for all coaches?").
async function endWorkout(){ const L=S.watches.slice(); if(!L.length) return; const shared=isTeam(), withT=L.filter(w=>hasTimes(w)||w.status==='running');
  if(!(await confirmBox(shared?'End for all coaches?':'End the workout?',shared?'End for all coaches':'End workout',
    `${withT.length?`Saves the laps and splits of ${withT.length} stopwatch${withT.length===1?'':'es'} to practice history${shared?' (every coach sees it)':''} (Data tab), then clears`:'Clears'} all ${L.length} stopwatch${L.length===1?'':'es'}${shared?' on every coach’s phone':''}. Running clocks stop now. Undo puts everything back.`,true))) return;
  await takeSnapshot('Before End workout');
  const now=Date.now(), stopped=[];
  L.forEach(w=>{ if(w.status!=='running') return; if(w.sh) shAct(w,'stop',now); else { w._was=w.startAt; w.pausedT=now-w.startAt; w.status='paused'; } stopped.push(w); });
  const rec=historyRecord(L); let hid=null, lid=null;
  if(rec.watches.length){ if(isTeam()) hid=SYNC.saveHistory(rec); else { lid='lp-'+uid(); S.practice=[{...rec,id:lid},...(S.practice||[])].slice(0,30); } }
  const undoRm=removeWatches(L,'workout ended'); updateToolbar();
  snack(`Workout ended${rec.watches.length?' · saved to practice history':''}`,'Undo',()=>{ undoRm();
    stopped.forEach(w=>{ if(w.sh){ const st=epEvents(w).filter(e=>e.type==='stop').pop(); if(st) shChange(w,st,{deleted:true}); } else if(w._was!=null){ w.status='running'; w.startAt=w._was; } delete w._was; });
    if(hid&&SYNC&&SYNC.deleteHistory) SYNC.deleteHistory(hid); if(lid){ const e=(S.practice||[]).find(x=>x.id===lid); if(e) e.deleted=true; }
    renderGrid(); save(); if(curTab==='results') renderResults(); },10000);
  if(curTab==='results') renderResults(); }
// Edit mode (3.3.1): tap tiles to select them, then Remove them together (one Undo).
let EDITW=null;
function setEditW(on){ EDITW=on?new Set():null; document.body.classList.toggle('w-editing',!!on); $('#editW').textContent=on?'Done':'Edit'; S.watches.forEach(w=>{ const n=cardEls[w.id]; if(n) n.classList.remove('sel'); }); edBar(); }
function edBar(){ const b=$('#editBar'); if(!b) return; b.hidden=!EDITW; if(!EDITW) return; const r=$('#edRemove'); r.textContent=EDITW.size?`Remove ${EDITW.size}`:'Tap stopwatches to select'; r.disabled=!EDITW.size; $('#edAll').textContent=EDITW.size===S.watches.length&&S.watches.length?'Select none':'Select all'; }
$('#editW').onclick=()=>setEditW(!EDITW);
$('#endWk').onclick=()=>endWorkout();
$('#edAll').onclick=()=>{ if(!EDITW) return; const all=EDITW.size===S.watches.length; EDITW.clear(); S.watches.forEach(w=>{ if(!all) EDITW.add(w.id); const n=cardEls[w.id]; if(n){ n.classList.toggle('sel',!all); n.setAttribute('aria-selected',String(!all)); } }); edBar(); };
$('#edRemove').onclick=()=>{ if(!EDITW||!EDITW.size) return; const list=S.watches.filter(w=>EDITW.has(w.id)), n=list.length; setEditW(false); const undo=removeWatches(list,'removed together'); updateToolbar();
  snack(`Removed ${n} stopwatch${n===1?'':'es'}`,'Undo',()=>{ undo(); updateToolbar(); },10000); };
$('#startAll').onclick=()=>{
  audioInit(); const now=Date.now(); let n=0;
  S.watches.forEach(w=>{ if(w.status==='idle'){ startWatch(w,now); n++; renderCard(w);} });
  updateToolbar(); save(); if(n) toast(`Started ${n} stopwatch${n===1?'':'es'} together`);
};
$('#stopAll').onclick=async()=>{
  const now=Date.now();
  if(!(await confirmBox('Stop every running stopwatch at this moment?','Stop all'))) return;
  takeSnapshot('Before Stop all');
  S.watches.forEach(w=>{ if(w.status==='running'){ if(w.sh) shAct(w,'stop',now); else { w.pausedT=now-w.startAt; w.status='paused'; } renderCard(w);} });
  updateToolbar(); save();
};
// Cleared: idle and finished stopwatches, plus stopped stopwatch-only cards that have laps
// (a stopwatch-only card never "finishes"; Stop is its end). Running cards and stopped workout cards stay.
const stoppedLaps=w=>w.status==='paused' && !planOf(w) && w.run.laps.length>0;
const clearable=w=>w.status==='idle'||w.status==='done'||stoppedLaps(w);
async function clearTrack(){
  const gone=S.watches.filter(clearable), n=gone.length;
  if(!n){ toast('Nothing to clear. Running stopwatches and stopped workouts stay.'); return; }
  const team=syncMode()==='joined';
  const stopped=gone.filter(stoppedLaps).map(w=>`${w.name||'Unnamed'} (${w.run.laps.length} lap${w.run.laps.length===1?'':'s'})`);
  if(!(await confirmBox(`Clear ${n} stopwatch${n===1?'':'es'}?`,'Clear',
    (stopped.length?`Stopped and ${team?'saved':'cleared'}: ${stopped.join(', ')}. `:'')+
    (team?'Results are saved to Team history on the Data tab. ':'Copy your results first: their times will be gone. ')+
    'Everyone on them goes back to the bench. Running stopwatches and stopped workouts stay.'))) return;
  await takeSnapshot('Before Clear finished stopwatches');
  gone.forEach(w=>trashWatch(w,`${w.name||'Stopwatch'} (cleared)`));
  const rec=historyRecord(gone);
  const saved=team && rec.watches.length>0 && SYNC.saveHistory(rec); // queued; never waits on the network
  gone.forEach(w=>{ if(w.sh&&isTeam()&&SYNC.watchHeaderDel) SYNC.watchHeaderDel(w.id,true); }); // 3.3: cleared on every coach's phone
  S.watches=S.watches.filter(w=>!clearable(w));
  renderGrid(); save(); toast(`Cleared ${n} stopwatch${n===1?'':'es'}${saved?'. Results saved to Team history.':''}`);
}
async function resetAll(){
  if(!(await confirmBox('Clear all times?','Clear all times','Every stopwatch goes back to Start. The times are kept in Recently deleted.'))) return;
  await takeSnapshot('Before Clear all times');
  S.watches.forEach(w=>{ trashWatch(w,`${w.name||'Stopwatch'} (before Clear all times)`,true); if(w.sh) shReset(w); else ACT.reset(w); }); renderGrid(); save(); toast('All stopwatches reset');
}
async function assignAll(id){
  await takeSnapshot('Before giving every waiting stopwatch a workout');
  let n=0,skip=0;
  S.watches.forEach(w=>{ if(w.status==='idle'||w.status==='done'){ trashWatch(w,`${w.name||'Stopwatch'} (before a new workout)`,true); w.workoutId=id||null; if(w.sh) shReset(w); else ACT.reset(w); n++; } else skip++; });
  renderGrid(); save();
  toast(`Updated ${n} stopwatch${n===1?'':'es'}${skip?`, skipped ${skip} in progress`:''}`);
}

// One Clear track = one team history entry: the stopwatches that have times.
function historyRecord(list){
  return {date:localDate(new Date()), savedAtMs:Date.now(), watches:list.filter(w=>w.run.splits.length||w.run.laps.length).map(w=>{
    const P=planOf(w);
    return {name:w.name||'', members:w.athleteNames.filter(Boolean), workout:P?P.name||'':'', reps:P?P.reps:1, total:el(w),
      splits:P?w.run.splits.map(s=>({rep:s.rep,d:s.d,exp:s.exp,act:s.act,lap:s.lap,delta:s.delta})):[], laps:P?[]:w.run.laps.slice()};
  })};
}
// Team mode keeps student info minimal: "Maya Lopez" -> "Maya L." (coaches can edit a name to override).
function shortName(n){
  const p=String(n||'').trim().split(/\s+/);
  if(p.length<2) return p[0]||'';
  return `${p[0]} ${p[p.length-1].charAt(0).toUpperCase()}.`;
}

/* ---------- roster + bench ---------- */
// Who is on the track is worked out from the stopwatches every time (never stored on the athlete).
// Idle, running and paused stopwatches hold their athletes; finished ones release them.
const grpOf=a=>String(a.group||'').trim();
const genderOf=v=>{ v=String(v||'').trim().toLowerCase(); return /^(g|girls?|f|w|women)$/.test(v)?'G':/^(b|boys?|m|men)$/.test(v)?'B':''; }; // 2.7
function groupsOf(list){ // [[group, athletes]], groups sorted with numbers in order, no group last
  const m=new Map(); list.forEach(a=>{ const g=grpOf(a); if(!m.has(g)) m.set(g,[]); m.get(g).push(a); });
  return [...m.entries()].sort((x,y)=>(x[0]===''?1:0)-(y[0]===''?1:0) || x[0].localeCompare(y[0],undefined,{numeric:true,sensitivity:'base'}));
}
function heldBy(except){
  const m={};
  S.watches.forEach(w=>{ if(w===except||w.status==='done') return; w.athleteIds.forEach(id=>{ if(!m[id]) m[id]=w; }); });
  return m;
}
function autoName(list){
  if(!list.length) return '';
  const g=grpOf(list[0]);
  if(list.length>1 && g && !list[0].ghost && list.every(a=>grpOf(a)===g)) return g.slice(0,40);
  return (list.length===1 ? list[0].name : `${list[0].name} + ${list.length-1}`).slice(0,40);
}
function link(w,list){ w.athleteIds=list.map(a=>a.id); w.athleteNames=list.map(a=>a.name); w.autoName=list.length?autoName(list):null; }
function refreshIdle(){ // roster edits reach idle stopwatches only; others keep the names they started with
  S.watches.forEach(w=>{
    if(w.status!=='idle'||!w.athleteIds.length) return;
    const list=w.athleteIds.map(id=>S.roster.find(a=>a.id===id));
    list.forEach((a,i)=>{ if(a) w.athleteNames[i]=a.name; });
    if(list.every(Boolean) && w.name===w.autoName){ w.autoName=autoName(list); w.name=w.autoName; }
  });
}
// o: {workoutId, after} to add stopwatches, or {watch} to change one idle stopwatch's members
function openBench(o){
  o=o||{}; const W=o.watch||null;
  const held=heldBy(W), sel=new Set(W?W.athleteIds:[]);
  const people=S.roster.filter(a=>a.name.trim());
  if(W) W.athleteIds.forEach((id,i)=>{ if(!people.some(a=>a.id===id)) people.push({id,name:W.athleteNames[i]||'Removed athlete',group:'No longer on the team',ghost:true}); });
  const groups=genderSecs(people); // 2.12: Girls / Boys (groups are made in the workout flow)
  const chip=a=>{ const hw=held[a.id];
    return `<button type="button" class="chip-a g-${a.gender||'u'}${hw?' busy':''}" data-a="${a.id}" aria-pressed="${sel.has(a.id)}"${hw?' aria-disabled="true"':''}><span class="nm">${esc(a.name)}</span>${hw?`<small>on ${esc(hw.name||'a stopwatch')}</small>`:''}</button>`; };
  const list=people.length ? `<div class="bench">${groups.map(([g,as],gi)=>`<section class="bench-grp"><button type="button" class="bench-gh" data-gi="${gi}" data-g="${g==='Girls'?'G':g==='Boys'?'B':''}">${esc(g)} <span class="n">${as.filter(a=>!held[a.id]).length} free</span></button><div class="chips">${as.map(chip).join('')}</div></section>`).join('')}</div>`
    : `<div class="empty">No runners on the team yet. Add them once on the Team tab and they stay for every practice.</div><button class="btn primary" data-x="team">Open the Team tab</button>`;
  const foot=!people.length ? '' : W
    ? `<div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="save">Save runners</button></div>`
    : `<div class="bench-foot"><label class="field">Workout<select id="benchWk">${planOptions(o.workoutId||null)}</select></label>
       <div class="btn-row"><button class="btn primary" data-x="each">One stopwatch each</button><button class="btn" data-x="group">One stopwatch for the group</button></div><button class="btn" data-x="groups">Make groups…</button><p class="hint" data-r="room"></p></div>`;
  modal(`<div class="bench-sheet"><div class="sheet-head"><h2>${W?'Runners on '+esc(W.name||'this stopwatch'):'Pick runners'}</h2><button class="icon-btn" data-x="no" aria-label="Close">×</button></div>
    ${people.length?`<p>Tap runners to select them.</p>${pickBar(!W)}`:''}${list}${foot}</div>`,(box,close)=>{
    box.classList.add('wide');
    const m=box.firstElementChild; // listen on fresh content: #modal itself is reused by every sheet
    const picks=()=>people.filter(a=>sel.has(a.id));
    const sync=()=>{
      if(W||!people.length) return;
      const n=sel.size, room=MAX-S.watches.length;
      m.querySelector('[data-x=each]').textContent=`One stopwatch each${n?` (${n})`:''}`;
      m.querySelector('[data-x=each]').disabled=!n||!room;
      m.querySelector('[data-x=group]').disabled=!n||!room; m.querySelector('[data-x=groups]').disabled=n<2||!room;
      m.querySelector('[data-r=room]').textContent= !n&&room ? 'Pick runners first: the buttons below make their stopwatches.' : n===1&&room ? `Room for ${room} more stopwatch${room===1?'':'es'}. Make groups needs 2 or more runners.` : !room ? `The track is full (${MAX} stopwatches). Clear it in Settings first.`
        : n>room ? `Room for ${room} more stopwatch${room===1?'':'es'}: ${n-room} won't get their own.` : `Room for ${room} more stopwatch${room===1?'':'es'}.`;
    };
    const done=(msg)=>{ close(); save(); if(o.after) o.after(); else renderGrid(); if(msg) toast(msg); };
    m.addEventListener('click',e=>{
      const c=e.target.closest('[data-a]');
      if(c){
        const id=c.dataset.a, hw=held[id];
        if(hw){ toast(`${people.find(a=>a.id===id).name} is on ${hw.name||'another stopwatch'}`); return; }
        if(sel.has(id)) sel.delete(id); else sel.add(id);
        c.setAttribute('aria-pressed',String(sel.has(id))); sync(); return;
      }
      const pk=e.target.closest('[data-pk]');
      if(pk){ const k=pk.dataset.pk; if(k==='groups'){ const wk=m.querySelector('#benchWk'); close(); openWorkoutFlow({ids:(sel.size?[...sel]:pickIds('all',people,held)),workoutId:wk?wk.value||null:null,mode:'groups'}); return; }
        sel.clear(); if(k!=='clear') pickIds(k,people,held).forEach(id=>sel.add(id)); m.querySelectorAll('[data-a]').forEach(x=>x.setAttribute('aria-pressed',String(sel.has(x.dataset.a)))); sync(); return; }
      const gh=e.target.closest('[data-gi]');
      if(gh){
        const free=groups[+gh.dataset.gi][1].filter(a=>!held[a.id]), all=free.length&&free.every(a=>sel.has(a.id));
        free.forEach(a=>{ if(all) sel.delete(a.id); else sel.add(a.id); });
        gh.parentNode.querySelectorAll('[data-a]').forEach(x=>x.setAttribute('aria-pressed',String(sel.has(x.dataset.a))));
        sync(); return;
      }
      const x=e.target.closest('[data-x]'); if(!x) return;
      const act=x.dataset.x;
      if(act==='no') close();
      if(act==='team'){ close(); showTab('team'); }
      if(act==='save'){
        const wasAuto=W.name===W.autoName || !W.name.trim() || (!W.athleteIds.length && /^Athlete \d+$/.test(W.name));
        link(W,picks()); if(wasAuto && W.athleteIds.length) W.name=W.autoName;
        close(); renderCard(W); save();
      }
      if(act==='groups'){ const wk=m.querySelector('#benchWk').value||null; close(); openWorkoutFlow({ids:picks().map(a=>a.id),workoutId:wk,mode:'groups'}); return; } // 2.12: make groups on the spot
      if(act==='each'||act==='group'){
        const wk=m.querySelector('#benchWk').value||null, list=picks(), room=MAX-S.watches.length;
        if(act==='group'){
          const w=newWatch('',wk); link(w,list); w.name=w.autoName; S.watches.push(w);
          done(`Added ${w.name} with ${list.length} runner${list.length===1?'':'s'}`);
        } else {
          const add=list.slice(0,room);
          add.forEach(a=>{ const w=newWatch('',wk); link(w,[a]); w.name=w.autoName; S.watches.push(w); });
          done(`Added ${add.length} stopwatch${add.length===1?'':'es'}`+(list.length>add.length?`. ${list.length-add.length} didn't fit (limit ${MAX}).`:''));
        }
      }
    });
    sync();
  });
}

/* ---------- team ---------- */
// 2.12: one line per runner (full name, grade, season average); tap a row to edit that runner (name, Girls/Boys,
// results, remove). Girls and Boys sections collapse (remembered per phone), a search box, and a sort switch shared with
// Data > Runners: Average (default), Season best, Name. Groups are no longer edited here: they're made when choosing
// runners for a workout (openWorkoutFlow). The old a.group values stay in the data (and synced) but aren't shown.
const SECS=[['G','Girls'],['B','Boys'],['','No Girls/Boys yet']];
let teamQuery='';
// Season average 5K (2.12): this season's 5K results, adjusted for each race day's difficulty where that day has a rating (3.1; plain otherwise),
// official times preferred (resultsFor keeps the official one of a same-day pair), Injury/Illness-tagged results left out.
function seasonAvg(a){ return memoize('avg|'+a.id+'|'+a.name,()=>{ const F=dayRatings(), y=seasonOf(Date.now());
  const L=resultsFor(a).filter(x=>x.at>0&&seasonOf(x.at)===y&&sameDist(x.fin,5000)&&!hurt(x)); if(!L.length) return null;
  const ts=L.map(x=>{ const f=dayFactor(F,x); return f?{t:x.t/f,adj:true}:{t:x.t,adj:false}; });
  return {t:ts.reduce((s,v)=>s+v.t,0)/ts.length,n:ts.length,adj:ts.some(v=>v.adj),all:ts.every(v=>v.adj)}; }); }
const rosterSort=()=>['avg','sb','name'].includes(S.settings.rosterSort)?S.settings.rosterSort:'avg';
function sortRunners(L){ const k=rosterSort(), y=seasonOf(Date.now()), v=a=>{ if(k==='name') return null; const r=k==='avg'?seasonAvg(a):sbOf(a,y); return r?r.t:null; };
  const byName=(p,q)=>p.name.localeCompare(q.name,undefined,{sensitivity:'base'}); if(k==='name') return L.slice().sort(byName);
  return L.map(a=>({a,t:v(a)})).sort((p,q)=>(p.t==null)-(q.t==null)||(p.t-q.t)||byName(p.a,q.a)).map(o=>o.a); } // no race this season: last
const sortSwitch=w=>`<div class="seg2 seg3 sort-sw" role="group" aria-label="Sort runners"><button type="button" data-rsort="avg" data-w="${w}" aria-pressed="${rosterSort()==='avg'}">Average</button><button type="button" data-rsort="sb" data-w="${w}" aria-pressed="${rosterSort()==='sb'}">Season best</button><button type="button" data-rsort="name" data-w="${w}" aria-pressed="${rosterSort()==='name'}">Name</button></div>`;
const avgTxt=a=>{ const v=seasonAvg(a); return v?`${fmtRace(v.t)}${v.adj?'<small> adj.</small>':''}`:'–'; };
// Grade now: from the runner's official results (the latest one, moved on by the seasons since). '' if unknown.
function gradeNow(a){ return memoize('gr|'+a.id,()=>{ let best=null; OFFICIAL.forEach(d=>{ if(d.deleted) return; (d.results||[]).forEach(r=>{ if(r.grade&&mergedTo(r.aid)===a.id&&(!best||r.date>best.date)) best=r; }); });
  if(!best) return ''; const g=+best.grade+(seasonOf(Date.now())-seasonOf(dayMs(best.date))); return g>=6&&g<=12?g:''; }); }
function renderTeam(){
  const L=$('#teamList'), n=S.roster.length;
  $('#teamCount').textContent=`${n} runner${n===1?'':'s'}`;
  const ts=$('#teamSearch'); if(ts) ts.placeholder=n?`Find a runner (${n})`:'Find a runner'; // 3.4: the count lives in the search field (the count line is hidden)
  const tools=$('#teamTools'); if(tools){ tools.hidden=!n; const sw=tools.querySelector('.sort-sw'); if(sw) sw.outerHTML=sortSwitch('team'); else tools.insertAdjacentHTML('beforeend',sortSwitch('team')); }
  const hint=syncMode()!=='local'?`<p class="team-hint">Shared with <b>${esc(SYNC.info().teamName)}</b>. Tap a runner to edit.</p>`:'';
  if(!n){ L.innerHTML=hint+`<div class="empty">No runners yet. Add your team once and they stay here for every practice. Then tap + New, then Workout, on the Stopwatches tab.</div>`; return; }
  const q=teamQuery.trim().toLowerCase(), shut=S.settings.teamShut||{};
  const row=a=>{ const g=gradeNow(a);
    return `<div class="ath swipe" data-id="${a.id}"><div class="sw-trail"><button type="button" class="sw-act red" data-t="swrm">Remove</button></div><div class="sw-front"><button type="button" class="ath-row" data-t="open" aria-label="Edit ${esc(a.name)}"><span class="ath-nm">${esc(a.name)}</span><span class="ath-gr">${g?'Gr '+g:''}</span><span class="ath-avg num" title="Season average 5K">${avgTxt(a)}</span></button>
      ${a.gender==='G'||a.gender==='B'?'':`<span class="seg2 sec-pick" role="group" aria-label="Girls or Boys for ${esc(a.name)}"><button type="button" data-t="sec" data-g="G">Girls</button><button type="button" data-t="sec" data-g="B">Boys</button></span>`}</div></div>`; }; // 3.0: swipe left to Remove
  const html=SECS.map(([g,label])=>{ const all=S.roster.filter(a=>(a.gender==='G'||a.gender==='B'?a.gender:'')===g); if(!g&&!all.length) return '';
    const as=sortRunners(all.filter(a=>!q||a.name.toLowerCase().includes(q))); if(q&&!as.length) return '';
    return `<details class="team-sec" data-sec="${g}"${shut[g||'-']&&!q?'':' open'}><summary class="team-sh"><h3>${label} <span class="n">${all.length}</span></h3>${g?`<button type="button" class="btn" data-t="addsec" data-g="${g}">+ Add to ${label}</button>`:''}</summary>
      ${!g?`<p class="hint">Pick Girls or Boys for each runner: their results then count in the right division.</p>`:''}
      ${as.length?`<div class="ath-head" aria-hidden="true"><span>Name</span><span>Grade</span><span>Avg 5K</span></div>${as.map(row).join('')}`:'<p class="hint">No runners here yet.</p>'}</details>`; }).join('');
  L.innerHTML=hint+(html||`<p class="empty">No runners match “${esc(teamQuery)}”.</p>`);
}
// One-time (2.10): groups named like Girls/Boys become the Girls/Boys setting; the rest of the name stays as a label
// ("Girls JV" -> Girls, group "JV"). Shows what changed, with Undo. Runs on the first phone that opens 2.10.
const GEN_GROUP=/^\s*(girls?|boys?|women'?s?|men'?s?|ladies|gents)\b[\s\-:]*(.*)$|^(.*?)[\s\-:]*\b(girls?|boys?|women'?s?|men'?s?)\s*$/i;
function convertGenderGroups(){
  if(S.settings.genderGroups2100) return;
  const out=[];
  S.roster.forEach(a=>{ const m=String(a.group||'').match(GEN_GROUP); if(!m) return; const word=(m[1]||m[4]||'').toLowerCase(), rest=(m[1]?m[2]:m[3]||'').trim(), g=/^(girl|women|ladies)/.test(word)?'G':'B';
    if(a.gender&&a.gender!==g){ out.push({a,from:{group:a.group,gender:a.gender},note:'kept: marked '+(a.gender==='G'?'Girls':'Boys')+' already'}); return; }
    out.push({a,from:{group:a.group,gender:a.gender||''}}); a.gender=g; a.group=rest; });
  S.settings.genderGroups2100=true; save();
  const ch=out.filter(x=>!x.note); if(!out.length) return;
  refreshIdle(); if(curTab==='team') renderTeam();
  modal(`<div class="conv-sheet"><h2>Girls and Boys sections</h2><p>The Team tab now has Girls and Boys sections. Groups named like Girls or Boys were converted:</p>
    <div class="menu-list">${out.map(x=>`<div class="set-row"><span><b>${esc(x.a.name)}</b><span class="hint">group “${esc(x.from.group)}” → ${x.note?esc(x.note):`${x.a.gender==='G'?'Girls':'Boys'}${x.a.group?`, group “${esc(x.a.group)}”`:', no group'}`}</span></span></div>`).join('')}</div>
    <div class="modal-btns"><button class="btn" data-x="undo">Undo</button><button class="btn primary" data-x="no">OK</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=undo]').onclick=()=>{ ch.forEach(x=>{ x.a.group=x.from.group; x.a.gender=x.from.gender; }); save(); refreshIdle(); close(); if(curTab==='team') renderTeam(); toast('Groups put back'); };
  });
  return ch.length;
}
let teamDirty=false;
function removeRunner(a){ // soft delete with Undo (2.6)
  const key=trashPut({kind:'athlete',id:a.id,label:a.name||'Runner',item:{...a}});
  S.roster=S.roster.filter(x=>x!==a); renderTeam(); save();
  removedSnack(`Removed ${a.name||'runner'}${syncMode()==='joined'?' for every coach':''}`,key);
}
// Remove from the runner sheet: admin devices choose Remove (restorable) or Delete permanently.
function removeRunnerAsk(a){
  if(SYNC && syncMode()==='joined' && syncInfo.isAdmin){
    modal(`<div class="menu-sheet"><h2>${esc(a.name||'Runner')}</h2><div class="menu-list">
      <button type="button" class="menu-item" data-x="rm">Remove<small>For every coach. Recently deleted can restore it.</small></button>
      <button type="button" class="menu-item warn" data-x="purge">Delete permanently…<small>Privacy request: removes all of this runner’s data. Can’t be restored.</small></button></div>
      <div class="modal-btns"><button class="btn" data-x="no">Cancel</button></div></div>`,(box,close)=>{
      const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
      m.querySelector('[data-x=purge]').onclick=()=>{ close(); purgeSheet(a.id); };
      m.querySelector('[data-x=rm]').onclick=()=>{ close(); removeRunner(a); };
    });
    return;
  }
  removeRunner(a);
}
const athOf=t=>S.roster.find(a=>a.id===t.closest('.ath').dataset.id);
$('#teamList').addEventListener('click',async e=>{
  const b=e.target.closest('[data-t]'); if(!b) return;
  if(b.dataset.t==='open'){ const a=athOf(b); if(a) resultSheet(a); }
  if(b.dataset.t==='swrm'){ const a=athOf(b); closeSwipes(); if(a) removeRunnerAsk(a); }
  if(b.dataset.t==='sec'){ const a=athOf(b); if(!a) return; a.gender=b.dataset.g; save(); memo.clear(); renderTeam(); toast(`${a.name}: ${b.dataset.g==='G'?'Girls':'Boys'}`); } // 2.10: sections replace the G/B button
  if(b.dataset.t==='addsec'){ e.preventDefault(); addRunnerSheet(b.dataset.g); }
});
$('#teamList').addEventListener('toggle',e=>{ const d=e.target; if(!d.matches||!d.matches('details.team-sec')||teamQuery.trim()) return; S.settings.teamShut=S.settings.teamShut||{}; const k=d.dataset.sec||'-';
  if(d.open) delete S.settings.teamShut[k]; else S.settings.teamShut[k]=true; save(); },true);
$('#teamSearch').addEventListener('input',e=>{ teamQuery=e.target.value; renderTeam(); });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-rsort]'); if(!b) return; S.settings.rosterSort=b.dataset.rsort; save(); if(b.dataset.w==='team') renderTeam(); else renderRunners(); });
// PRs per runner per distance (5K, 2 mi, 4K, 3200m, plus custom), typed with the m:ss keypad.
// ---- Race results typed by hand (2.10) ----
// A runner's typed results live in the old PR list (S.prs[id], synced as teams/{t}/prs/{id}): {id, dist, t, date, meet,
// src}. A PR typed before 2.10 is just {dist, t}: it stays as a result with an unknown date, so nothing is lost.
// PRs and season bests are always worked out from results (typed, hand-timed races and official); nothing is typed as a PR.
const typedResults=id=>((S.prs||{})[id]||[]).filter(p=>!p.deleted&&p.t>0&&p.dist>0);
function resultSheet(a,keep){
  const L=()=>typedResults(a.id).slice().sort((x,y)=>(y.date||'').localeCompare(x.date||'')||x.dist-y.dist);
  const bests=PR_DISTS.map(([d,l])=>[l,careerBest(a,d)]).filter(x=>x[1]);
  const seriesNames=[...new Set((S.series||[]).map(x=>x.name))].sort();
  const f=keep||{date:'',unknown:false,meet:'',dist:5000,src:'hand'};
  modal(`<div class="res-sheet"><label class="field">Name<input data-af="name" value="${esc(a.name)}" maxlength="30" autocomplete="off" autocapitalize="words" aria-label="Name"></label>
    <div class="field">Girls or Boys<div class="seg2" role="group" aria-label="Girls or Boys"><button type="button" data-rg="G" aria-pressed="${a.gender==='G'}">Girls</button><button type="button" data-rg="B" aria-pressed="${a.gender==='B'}">Boys</button></div></div>
    <h3>PRs <span class="n">from every result</span></h3><p>${bests.length?bests.map(([l,t])=>`<span class="pr-chip">${esc(l)} <b>${fmtRace(t)}</b></span>`).join(' '):'No results yet.'}</p>
    <h3>Add a race result</h3>
    <div class="res-form">
      <label class="field">Date<input type="date" data-rf="date" value="${esc(f.date)}"${f.unknown?' disabled':''}></label>
      <label class="set-row"><span>Date unknown</span><input type="checkbox" class="switch" data-rf="unknown"${f.unknown?' checked':''}></label>
      <label class="field">Meet<input data-rf="meet" maxlength="60" list="resMeets" value="${esc(f.meet)}" placeholder="e.g. Kiel Raiders Invite" autocomplete="off" autocapitalize="words"><datalist id="resMeets">${seriesNames.map(n=>`<option value="${esc(n)}">`).join('')}</datalist></label>
      <div class="field">Distance<div class="seg2 res-dist" role="group" aria-label="Distance">${PR_DISTS.map(([d,l])=>`<button type="button" data-rd="${d}" aria-pressed="${sameDist(d,f.dist)}">${l}</button>`).join('')}<button type="button" data-rd="other" aria-pressed="${!PR_DISTS.some(([d])=>sameDist(d,f.dist))}">Other</button></div>
        <div class="res-other"${PR_DISTS.some(([d])=>sameDist(d,f.dist))?' hidden':''}>${distField({attrs:'data-rf="dist"',dist:PR_DISTS.some(([d])=>sameDist(d,f.dist))?null:f.dist,unit:'mi',label:'Distance'})}</div></div>
      <label class="field">Time (m:ss.t)${timeField({id:'rfT',attrs:'data-rf="t" data-tenths',value:'',unit:'mss',ph:{mss:'e.g. 18:32.6',sec:'e.g. 1112.6'},label:'Time'})}</label>
      <div class="field">Timing<div class="seg2" role="group" aria-label="Official or hand-timed"><button type="button" data-rs="official" aria-pressed="${f.src==='official'}">Official</button><button type="button" data-rs="hand" aria-pressed="${f.src!=='official'}">Hand-timed</button></div></div>
      <p class="form-err" id="rfErr" hidden></p>
      <button class="btn primary" data-x="add">Add result</button>
    </div>
    <h3>Typed results <span class="n">${L().length}</span></h3>
    <div class="menu-list">${L().map(p=>`<div class="set-row"><span><b>${esc(distLabel(p.dist))} ${fmtRace(p.t)}</b> ${p.src==='official'?'<span class="off-badge">Official</span>':''}<span class="hint">${esc(p.date?fmtDay(p.date):'Date unknown')}${p.meet?' · '+esc(p.meet):''}${!p.src?' · typed as a PR before 2.10':p.src==='hand'?' · hand-timed':''}</span></span><button class="btn warn" data-rdel="${esc(p.id||'')}" data-rdist="${p.dist}" data-rt="${p.t}">Remove</button></div>`).join('')||'<p class="hint">None. Results from races and imported official results count by themselves.</p>'}</div>
    <div class="modal-btns"><button class="btn warn" data-x="remove">Remove runner</button><button class="btn primary" data-x="done">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; bindTimeFields(m); bindDistFields(m);
    const q=k=>m.querySelector(`[data-rf="${k}"]`), st={dist:f.dist,src:f.src}, nm=m.querySelector('[data-af=name]');
    nm.oninput=()=>{ const v=nm.value.trim().replace(/\s+/g,' '); if(v){ a.name=v; refreshIdle(); save(); memo.clear(); } };
    nm.onchange=()=>{ if(!nm.value.trim()) nm.value=a.name; if(curTab==='team') renderTeam(); };
    m.querySelector('[data-x=done]').onclick=()=>{ close(); renderTeam(); };
    m.querySelector('[data-x=remove]').onclick=()=>{ close(); removeRunnerAsk(a); };
    m.querySelectorAll('[data-rg]').forEach(b=>b.onclick=()=>{ a.gender=b.dataset.rg; save(); memo.clear(); m.querySelectorAll('[data-rg]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    q('unknown').onchange=()=>{ q('date').disabled=q('unknown').checked; };
    m.querySelectorAll('[data-rd]').forEach(b=>b.onclick=()=>{ m.querySelectorAll('[data-rd]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); const o=b.dataset.rd==='other'; m.querySelector('.res-other').hidden=!o; st.dist=o?null:+b.dataset.rd; });
    m.querySelectorAll('[data-rs]').forEach(b=>b.onclick=()=>{ m.querySelectorAll('[data-rs]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); st.src=b.dataset.rs; });
    m.querySelector('[data-x=add]').onclick=()=>{ const err=m.querySelector('#rfErr'), fail=t=>{ err.textContent=t; err.hidden=false; };
      const dist=st.dist||parseDist(q('dist').value,q('dist').closest('.df').dataset.unit), t=parseTime(q('t').value), unknown=q('unknown').checked, date=unknown?'':q('date').value;
      if(!dist) return fail('Pick or type the distance.'); if(!t) return fail('Type the time, like 18:32.6.'); if(!unknown&&!date) return fail('Pick the date, or switch on "Date unknown".');
      const p={id:'r'+uid(),dist:Math.round(dist*100)/100,t:Math.round(t*10)/10,date,meet:q('meet').value.trim().slice(0,60),src:st.src};
      S.prs[a.id]=[...(S.prs[a.id]||[]),p]; save(); memo.clear();
      resultSheet(a,{date,unknown,meet:p.meet,dist:p.dist,src:p.src}); toast(`Added ${distLabel(p.dist)} ${fmtRace(p.t)}`); };
    m.querySelectorAll('[data-rdel]').forEach(b=>b.onclick=()=>{ const k=removeTypedResult(a,b.dataset.rdel,+b.dataset.rdist,+b.dataset.rt); resultSheet(a); if(k) removedSnack('Result removed',k,()=>{ if(document.querySelector('#modal .res-sheet')) resultSheet(a); }); });
  });
}
function removeTypedResult(a,id,dist,t){
  const cur=(S.prs[a.id]||[]).find(p=>!p.deleted&&(id?p.id===id:(sameDist(p.dist,dist)&&p.t===t))); if(!cur) return null;
  Object.assign(cur,{deleted:true,deletedAt:Date.now(),deletedBy:myId()}); save(); memo.clear();
  return trashPut({kind:'result',id:a.id+'@'+(cur.id||Math.round(dist)+'-'+t),label:`${a.name}, ${distLabel(cur.dist)} ${fmtRace(cur.t)}`,item:{...cur},extra:{athleteId:a.id}});
}
$('#addAth').onclick=()=>addRunnerSheet(null);
function addRunnerSheet(sec){ // sec: 'G' / 'B' from a section's + Add, or null (choose)
  const last=S.roster[S.roster.length-1], g0=sec!=null?sec:(last?last.gender:'');
  modal(`<h2>Add runner</h2>
    <label class="field">Name<input id="athName" maxlength="30" autocomplete="off" autocapitalize="words"></label>
    <div class="field">Section<div class="seg2" id="athGen" role="group" aria-label="Girls or Boys"><button type="button" data-gen="G" aria-pressed="${g0==='G'}">Girls</button><button type="button" data-gen="B" aria-pressed="${g0==='B'}">Boys</button></div></div>
    <div class="modal-btns"><button class="btn" data-x="no">Done</button><button class="btn" data-x="more">Add another</button><button class="btn primary" data-x="yes">Add</button></div>`,(m,close)=>{
    const nm=m.querySelector('#athName');
    m.querySelectorAll('[data-gen]').forEach(b=>b.onclick=()=>{ const on=b.getAttribute('aria-pressed')!=='true'; m.querySelectorAll('[data-gen]').forEach(x=>x.setAttribute('aria-pressed','false')); b.setAttribute('aria-pressed',String(on)); });
    const add=()=>{ const n=nm.value.trim().replace(/\s+/g,' ').slice(0,30); if(!n){ nm.focus(); return ''; } // full names (2.11.1)
      const g=(m.querySelector('[data-gen][aria-pressed=true]')||{dataset:{}}).dataset.gen||''; S.roster.push({id:uid(),name:n,group:'',gender:g}); renderTeam(); save(); return n; };
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ if(add()) close(); };
    m.querySelector('[data-x=more]').onclick=()=>{ const n=add(); if(n){ toast(`Added ${n}`); nm.value=''; nm.focus(); } };
    setTimeout(()=>nm.focus(),30);
  });
}
$('#teamMore').onclick=()=>actionSheet('',[{label:'Paste a list',id:'pasteAth',fn:pasteSheet},...(canImport()&&S.roster.length>1?[{label:'Merge runners',id:'mergeAth',fn:()=>mergeSheet()}]:[])]); // 3.0
function pasteSheet(){
  modal(`<h2>Paste a list</h2><p>One runner per line, full name, with Girls or Boys after a comma, like <b>Maya Lopez, Girls</b>. (Groups are made when you pick runners for a workout.)</p>
    <textarea id="pasteTxt" placeholder="Maya Lopez, Girls&#10;Jonah Kim, Boys&#10;Sam Ortiz, Boys"></textarea>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Add runners</button></div>`,(m,close)=>{
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{
      const key=n=>n.toLowerCase(); // 2.12: no group labels, so a name already on the team is skipped
      const seen=new Set(S.roster.map(a=>key(a.name)));
      let added=0, skipped=0;
      m.querySelector('#pasteTxt').value.split(/\r?\n/).forEach(line=>{
        const f=line.split(/[,\t]/).map(x=>x.trim()); // Name, Group, Girls/Boys (2.7: the third is optional)
        const g2=genderOf(f[1]); // 2.10: "Name, Girls" or "Name, Group, Girls"
        const raw=f[0]||'', name=raw.replace(/\s+/g,' ').slice(0,30), gender=g2||genderOf(f[2]); // "Name, Group, Girls" still reads; the group is left out (2.12)
        if(!name) return;
        if(seen.has(key(name))){ skipped++; return; }
        seen.add(key(name)); S.roster.push({id:uid(),name,group:'',gender}); added++;
      });
      close(); renderTeam(); save();
      toast(`Added ${added} runner${added===1?'':'s'}${skipped?`, skipped ${skipped} already on the team`:''}`);
    };
  });
}

/* ---------- settings sheet ---------- */
document.body.classList.toggle('compact',!!S.settings.compact);
let wxSetT=0;
// 3.4: Settings like the iOS Settings app: a short list of categories, each opening its own page with a back button.
// Every setting from 3.3 is here, each on the page where it belongs. Rows are one line (44 pt); explanations sit under
// each group. Numbers show their value on the right and open a stepper (valueSheet). A category shows a badge only when
// something there needs attention. (Tests may set localStorage 'mustang-splits:test-flat-settings' to see every page at
// once, so older suites can reach any control right after opening Settings.)
const SET_PAGES=[['team','Team','👥'],['weather','Weather','🌤'],['workouts','Workouts and paces','⏱'],['race','Race Mode','🏁'],['data','Data','🗂'],['display','Display and sound','🔆'],['about','About','ℹ️']];
const WX_ROWS=[['warm','Warm flag','',1,90,200,'temperature + dew point, °F'],['hot','Hot flag','',1,90,220,'temperature + dew point, °F'],['cold','Cold flag','°F',1,-20,60,'this temperature or colder'],['wind','Windy flag','mph',1,1,60,'sustained wind'],['mud','Likely muddy flag','″',0.1,0.1,5,'rain in the 48 hours before (any rain during the race counts too)']];
function setBadges(){ const n=healthIssues().length, pl=placesToConfirm().length, ts=syncInfo&&(syncInfo.mode==='out'||syncInfo.code==='error');
  return {team:ts?'!':'',weather:pl?String(pl):'',data:n?String(n):''}; }
// Why "Fill in weather now" can't fill anything right now, in plain words ('' = it can).
function wxFillWhy(){ const W=(S.weather||[]).filter(w=>!w.deleted), pc=placesToConfirm().length, ok=(S.places||[]).some(p=>p.confirmed&&p.lat!=null);
  if(!ok) return pc?`Confirm your race locations first (${pc} to confirm): weather is only looked up for confirmed places.`:'No races or meets with a place yet.';
  if(navigator.onLine===false) return 'No signal: the weather fills in by itself when the phone is back online.';
  return ''; }
function settingsRoot(){ const B=setBadges(), i=syncInfo||{};
  const sum={team:!SYNC?'':i.mode==='joined'?(i.teamName||'Joined'):i.mode==='out'?'Signed out':'Not set up',weather:`${(S.weather||[]).filter(w=>w.status==='ok').length} days`,race:'',data:'',display:'',about:APP_VERSION,workouts:''};
  return `<div class="ios-group set-cats">${SET_PAGES.map(([k,l,ic])=>`<button type="button" class="ios-row ios-nav set-cat" data-spage="${k}"><span class="set-ic" aria-hidden="true">${ic}</span><span class="ios-l">${l}</span>${sum[k]?`<span class="ios-v">${esc(sum[k])}</span>`:''}${B[k]?`<span class="hb">${B[k]}</span>`:''}<span class="chev" aria-hidden="true">›</span></button>`).join('')}</div>`; }
function settingsPage(pg){
  const sw=(id,on,extra)=>`<input type="checkbox" class="switch" id="${id}"${on?' checked':''}${extra||''}>`;
  const row=(label,ctl,id)=>`<label class="ios-row"${id?` id="${id}"`:''}><span class="ios-l">${label}</span>${ctl}</label>`;
  const nav=(id,label,extra)=>`<button type="button" class="ios-row ios-nav" id="${id}"><span class="ios-l">${label}</span>${extra||''}<span class="chev" aria-hidden="true">›</span></button>`;
  const val=(k,label,v)=>`<button type="button" class="ios-row ios-nav ios-val" data-val="${k}"><span class="ios-l">${label}</span><span class="ios-v">${esc(v)}</span><span class="chev" aria-hidden="true">›</span></button>`;
  const act=(id,label,cls)=>`<button type="button" class="ios-row ios-act${cls?' '+cls:''}" id="${id}"><span class="ios-l">${label}</span></button>`;
  const T=wxT(), fmtWx=(k,u)=>`${k==='mud'?T[k].toFixed(1):T[k]}${u==='mph'?' mph':u}`, n=healthIssues().length, nPl=placesToConfirm().length, why=wxFillWhy();
  if(pg==='team') return `<div class="ios-group"><label class="ios-row ios-field"><span class="ios-l">Your name</span><input id="coachNm" maxlength="30" value="${esc(S.settings.coachName||'')}" placeholder="e.g. Coach Jen" autocomplete="off" autocapitalize="words"></label></div>
      <p class="ios-foot">Other coaches see it next to the times and laps you record.</p>
      <div class="sheet-sec team-page" id="teamSec">${teamSecHTML()}</div>`;
  if(pg==='weather') return `<div class="ios-group">${nav('openPlaces','Race locations',`<span class="hb"${nPl?'':' hidden'}>${nPl||''}</span>`)}
      ${why&&!/^No signal/.test(why)?`<button type="button" class="ios-row ios-nav" id="wxFill" data-why="1"><span class="ios-l">Fill in weather now</span><span class="ios-v">Locations first</span><span class="chev" aria-hidden="true">›</span></button>`:act('wxFill','Fill in weather now')}</div>
      <p class="ios-foot" id="wxStat" aria-live="polite">${esc(why||wxStatus())}</p>
      <h3 class="ios-sec">Flags</h3><div class="ios-group">${WX_ROWS.map(([k,l,u])=>val(k,l,fmtWx(k,u))).join('')}</div>
      <p class="ios-foot">Warm and Hot: temperature + dew point. Flags are context only: they never leave a result out of anything. Tap a flag on a race to dismiss it.</p>${WX_ATTR}`;
  if(pg==='workouts') return `<div class="ios-group">${val('tol','On-pace window',`${S.settings.tol} s`)}
      <label class="ios-row ios-field"><span class="ios-l">Give every waiting stopwatch</span><select id="assignAll"><option value="__">a workout…</option>${planOptions(null,true)}</select></label></div>
      <p class="ios-foot">On pace = within this many seconds of the plan (shown green).</p>
      <h3 class="ios-sec">Clear</h3><div class="ios-group">${act('clearTrack','Clear finished stopwatches','destructive')}${act('resetAll','Clear all times','destructive')}</div>
      <p class="ios-foot">End workout on the Stopwatches tab saves a session and clears every stopwatch at once.</p>`;
  if(pg==='race') return `<div class="ios-group">
      <div class="ios-row"><span class="ios-l">Name buttons</span><span class="seg2 set-seg" role="group" aria-label="Name button columns"><button type="button" data-setcols="2" aria-pressed="${S.settings.raceCols!==3}">2 columns</button><button type="button" data-setcols="3" aria-pressed="${S.settings.raceCols===3}">3 columns</button></span></div>
      ${row('Phone location at the gun',sw('setGeo',!!S.settings.raceGeo))}</div>
      <p class="ios-foot">The phone’s location is saved when the gun fires, for that race’s weather. The gun never waits for it. Your name (Team) shows next to the times you record.</p>`;
  if(pg==='data') return `<div class="ios-group">${nav('openMeets','Meets')}${canImport()?nav('openImport','Import history file'):''}${nav('openHealth','Data health',`<span class="hb"${n?'':' hidden'}>${n||''}</span>`)}${nav('openDeleted','Recently deleted')}</div>
      <h3 class="ios-sec">Backups</h3><div class="ios-group">${nav('backup','Back up')}${nav('restore','Restore from a backup')}${nav('openSnaps','Restore a snapshot')}</div>
      <p class="ios-foot">Back up saves your team, workouts and times to Files. Restore replaces everything on this phone. Snapshots are saved before big changes.</p>
      <h3 class="ios-sec">Trends</h3><div class="ios-group">${row('Leave tagged results out',sw('exTagged',exTagged(),' data-extag'))}</div>
      <p class="ios-foot">Injury, Illness, Fell, Shoe issue, Heavy training week, Course long/short, and races tagged Heat, Mud or Wind.</p>
      <p class="ios-foot storage-line" id="storageLine"></p><p class="ios-foot">Nothing is ever lost: removed runners, workouts, times, races and stopwatches wait in Recently deleted.</p>`;
  if(pg==='display') return `<div class="ios-group">${row('Smaller cards',sw('compact',S.settings.compact))}${row('Show times as they come in',sw('liveLog',S.settings.liveLog))}${row('Keep screen on',sw('wake',S.settings.wake))}${row('Beep before each rep',sw('sound',S.settings.sound))}</div>
      <p class="ios-foot"><span id="wakeHint">${esc(wakeMsg)}</span> Smaller cards: two stopwatches per row. Times as they come in: each card’s lap list opens at the first lap, newest on top. Beeps count down the end of rest; the silent switch mutes them.</p>`;
  if(pg==='about') return `<div class="ios-group"><div class="ios-row"><span class="ios-l">Version</span><span class="ios-v ver">Mustang Splits ${APP_VERSION}</span></div>${act('checkUpd','Check for updates')}</div>
      <h3 class="ios-sec">Help</h3><div class="ios-group">${nav('helpBtn','How to read a stopwatch card')}${nav('showTour','Show the quick tour')}</div>
      <h3 class="ios-sec">Credits</h3><div class="ios-group credits"><div class="ios-row"><span class="ios-l">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a></span></div>
      <div class="ios-row"><span class="ios-l">Keep-screen-on video: NoSleep.js (MIT)</span></div><div class="ios-row"><span class="ios-l">Clock digits: Barlow Condensed (SIL OFL)</span></div><div class="ios-row"><span class="ios-l">Team sync: Firebase</span></div></div>`;
  return ''; }
function openSettings(pg){ // 3.4
  let flat=false; try{ flat=localStorage.getItem('mustang-splits:test-flat-settings')==='1'; }catch(e){}
  const title=pg?(SET_PAGES.find(p=>p[0]===pg)||[,'Settings'])[1]:'Settings';
  const body=flat?SET_PAGES.map(([k,l])=>`<h3 class="ios-sec">${l}</h3>${settingsPage(k)}`).join(''):pg?settingsPage(pg):settingsRoot();
  modal(`<div class="sheet-head ios-head set-head">${pg&&!flat?`<button type="button" class="btn plain set-back" data-sback>‹ Settings</button>`:''}<h2>${esc(flat?'Settings':title)}</h2><button class="btn plain" data-x="done">Done</button></div>
    <div class="set-body" data-page="${pg||''}">${body}</div>`,(m,close)=>{
    const on=(sel,ev,f)=>{ const e=m.querySelector(sel); if(e) e[ev]=f; };
    on('[data-x=done]','onclick',close);
    on('[data-sback]','onclick',()=>openSettings());
    m.querySelectorAll('[data-spage]').forEach(b=>b.onclick=()=>openSettings(b.dataset.spage));
    on('#exTagged','onchange',e=>{ S.settings.excludeTagged=e.target.checked; save(); memo.clear(); if(curTab==='results') showResultsView(); });
    on('#helpBtn','onclick',()=>{ close(); helpSheet(); });
    on('#compact','onchange',e=>{ S.settings.compact=e.target.checked; document.body.classList.toggle('compact',S.settings.compact); save(); });
    on('#liveLog','onchange',e=>{ S.settings.liveLog=e.target.checked; save(); S.watches.forEach(renderCard); });
    on('#sound','onchange',e=>{ S.settings.sound=e.target.checked; audioInit(); if(S.settings.sound) beep(880,0.12); save(); });
    on('#wake','onchange',e=>{ S.settings.wake=e.target.checked; save(); applyWake(); });
    on('#setGeo','onchange',e=>{ S.settings.raceGeo=e.target.checked; save(); if(e.target.checked&&navigator.geolocation) navigator.geolocation.getCurrentPosition(()=>toast('Location allowed: it’s saved at the gun'),()=>toast('Location not allowed: the course location is used instead'),{timeout:15000,maximumAge:10*60e3}); });
    m.querySelectorAll('[data-setcols]').forEach(b=>b.onclick=()=>{ S.settings.raceCols=+b.dataset.setcols; save(); m.querySelectorAll('[data-setcols]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); if(curTab==='race') renderRace(); });
    on('#coachNm','oninput',e=>{ S.settings.coachName=e.target.value.trim().slice(0,30); S.settings.coachAsked=true; save();
      clearTimeout(nameT); nameT=setTimeout(()=>{ if(SYNC&&SYNC.touchDevice) SYNC.touchDevice(); },1500); }); // other coaches see the name in Settings > Team (2.9.1)
    on('#assignAll','onchange',e=>{ const id=e.target.value; if(id==='__') return; close(); assignAll(id); });
    on('#resetAll','onclick',()=>{ close(); resetAll(); });
    on('#clearTrack','onclick',()=>{ close(); clearTrack(); });
    on('#checkUpd','onclick',()=>{ checkVersion(true); });
    on('#showTour','onclick',()=>{ close(); showTour(0); });
    on('#openDeleted','onclick',()=>{ close(); deletedSheet(); });
    on('#openMeets','onclick',()=>{ close(); meetsSheet(); });
    on('#openHealth','onclick',()=>{ close(); healthSheet(); });
    on('#openImport','onclick',()=>{ close(); importEntry(); });
    on('#openSnaps','onclick',()=>{ close(); snapshotSheet(); });
    on('#openPlaces','onclick',()=>{ close(); placesSheet(); }); // 3.2
    // 3.4: never a silent button: without confirmed locations it goes to them; otherwise it says what happened
    on('#wxFill','onclick',async()=>{ const st=m.querySelector('#wxStat'), b=m.querySelector('#wxFill'), why=wxFillWhy();
      if(why&&b.dataset.why){ close(); placesSheet(); return; }
      if(why){ st.textContent=why; return; }
      st.textContent='Looking up the weather…'; b.setAttribute('aria-busy','true'); const before=(S.weather||[]).filter(w=>w.status==='ok').length; const k=await wxRun('force'); b.removeAttribute('aria-busy');
      const waiting=(S.weather||[]).filter(w=>w.status!=='ok'&&!w.deleted).length;
      st.textContent=k?`Filled in ${k} race day${k===1?'':'s'}. ${wxStatus()}.`:wxNote&&wxNote!=='offline'?`The weather service didn’t answer (${wxNote.replace(/^Weather service: /,'')}). It tries again by itself. ${wxStatus()}.`
        :waiting?`Nothing new yet: ${waiting} race day${waiting===1?' is':'s are'} waiting (a race that just ended, or a date the weather service doesn’t have yet). ${wxStatus()}.`:`Nothing to fill in: every race day at a confirmed place has weather (${before}).`; });
    m.querySelectorAll('[data-val]').forEach(b=>b.onclick=()=>{ const k=b.dataset.val;
      if(k==='tol') return valueSheet({title:'On-pace window',value:+S.settings.tol||1,step:0.5,min:0.5,max:10,unit:' s',dec:1,hint:'Within this many seconds of the plan shows green.'},v=>{ S.settings.tol=v; save(); S.watches.forEach(renderCard); },()=>openSettings(pg));
      const r=WX_ROWS.find(x=>x[0]===k); if(!r) return; const [,l,u,step,min,max,hint]=r;
      valueSheet({title:l,value:wxT()[k],step,min,max,unit:u?(u==='°F'?'°F':u==='″'?'″':' '+u):'',dec:k==='mud'?1:0,hint:hint.charAt(0).toUpperCase()+hint.slice(1)+'.'},v=>{ S.settings.wx={...(S.settings.wx||{}),[k]:v}; save(); memo.clear(); clearTimeout(wxSetT); wxSetT=setTimeout(()=>{ if(curTab==='results') renderResults(); refreshAll(); },250); },()=>openSettings(pg)); });
    storageText().then(x=>{ const el2=m.querySelector('#storageLine'); if(!el2) return;
      el2.textContent=x.text+(x.pct>=0.5?' Live data is getting large: back up, and tell your team admin.':'');
      el2.dataset.level=x.pct>=0.75?'bad':x.pct>=0.5?'warn':''; });
    if(m.querySelector('#phones')) loadPhones(m);
    on('#backup','onclick',()=>{ backup(); });
    on('#restore','onclick',()=>{ $('#restoreFile').click(); });
    bindTeamSec(m,close);
  });
}
// A number setting: the value large, − and + (44 pt), Done goes back to the page it came from. Saved as it changes.
// an older value outside the steps stays reachable (the range widens to include it)
function valueSheet(o,set,back){ let v=o.value; o={...o,min:Math.min(o.min,v),max:Math.max(o.max,v)}; const f=x=>(o.dec?x.toFixed(o.dec):String(Math.round(x)))+(o.unit||'');
  modal(`<div class="sheet-head ios-head"><button type="button" class="btn plain set-back" data-x="back">‹ Back</button><h2>${esc(o.title)}</h2><button class="btn plain" data-x="done">Done</button></div>
    <div class="val-sheet"><button type="button" class="btn val-btn" data-vd="-1" aria-label="${esc(o.title)} down">−</button><output class="val-num" id="valNum" aria-live="polite">${esc(f(v))}</output><button type="button" class="btn val-btn" data-vd="1" aria-label="${esc(o.title)} up">+</button></div>
    <p class="ios-foot val-why" id="valWhy" aria-live="polite"></p>${o.hint?`<p class="ios-foot">${esc(o.hint)}</p>`:''}`,(m,close)=>{
    const show=()=>{ m.querySelector('#valNum').textContent=f(v); const lo=v<=o.min, hi=v>=o.max; m.querySelector('[data-vd="-1"]').disabled=lo; m.querySelector('[data-vd="1"]').disabled=hi; m.querySelector('#valWhy').textContent=lo?`Lowest: ${f(o.min)}`:hi?`Highest: ${f(o.max)}`:''; };
    m.querySelectorAll('[data-vd]').forEach(b=>b.onclick=()=>{ v=Math.round(Math.min(o.max,Math.max(o.min,v+o.step*(+b.dataset.vd)))*100)/100; set(v); show(); });
    m.querySelector('[data-x=done]').onclick=()=>{ close(); if(back) back(); }; m.querySelector('[data-x=back]').onclick=()=>{ close(); if(back) back(); }; show(); }); }

/* ---------- backup + restore ---------- */
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
// Official result records from a backup or snapshot (2.9.1): add the ones this phone doesn't have; a record it has
// keeps its own deleted/restored state and gains any extra level edits. A restore never removes anything. In a team,
// only an admin phone sends added records to the team (anyone else's would be refused).
async function mergeOfficial(list){
  await STORE_READY; let n=0;
  for(const x of (list||[])){ if(!x||!x.id||!Array.isArray(x.results)) continue; const have=OFFICIAL.find(y=>y.id===x.id);
    if(!have){ const d={...x,key:x.id,synced:!(syncMode()==='joined'&&canImport())?!!x.synced:false}; OFFICIAL.push(d); await storePut('official',d); n++; }
    else if((x.edits||[]).length>(have.edits||[]).length){ have.edits=x.edits; await storePut('official',have); n++; } }
  if(n) offSet([...OFFICIAL]); return n;
}
async function backupData(){
  saveNow(); await STORE_READY;
  return {app:'mustang-splits',version:APP_VERSION,savedAt:new Date().toISOString(),state:S,official:OFFICIAL.map(x=>{ const y={...x}; delete y.key; return y; })}; // official results (2.9.1)
}
async function backup(){
  const data=await backupData(), d=new Date(data.savedAt);
  await shareFile(new File([JSON.stringify(data,null,1)],`mustang-splits-backup-${localDate(d)}.json`,{type:'application/json'}),'Mustang Splits backup');
}
$('#restoreFile').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  let data=null;
  try{ data=JSON.parse(await f.text()); }catch(err){}
  const s=migrate(data&&data.state?data.state:data);
  if(!s){ $('#overlay').hidden=true; toast("That file isn't a Mustang Splits backup."); return; }
  const when=data.savedAt?new Date(data.savedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'an unknown date';
  const running=S.watches.filter(w=>w.status==='running'||w.status==='paused').length;
  const n=(k,a,pl)=>`${a.length} ${a.length===1?k:(pl||k+'s')}`, off=Array.isArray(data&&data.official)?data.official.filter(x=>x&&x.id&&Array.isArray(x.results)):[];
  const offN=off.filter(x=>!x.deleted).reduce((a,x)=>a+x.results.length,0);
  if(!(await confirmBox('Replace everything on this phone with this backup?','Restore',
    `Backup from ${when}: ${n('runner',s.roster)}, ${n('workout',s.workouts)}, ${n('stopwatch',s.watches,'stopwatches')}${offN?`, ${offN} official results`:''}. `+
    `Your current team, workouts, stopwatches and times will be replaced.${running?` ${running} running or paused stopwatch${running===1?' is':'es are'} included in that.`:''}${syncMode()!=='local'?' The team\u2019s shared lists are not changed; next you choose whether to add these to the team.':''} Back up first if you're not sure.`))) return;
  await takeSnapshot('Before restoring a backup');
  await mergeOfficial(off); // official results are added, never removed (like the trash and saved races)
  S=s; saveNow();
  if(SYNC) SYNC.markRestored(); // in a team: asks "add mine / use the team's" after the reload instead of overwriting the team
  try{ sessionStorage.setItem('mustang-splits:restored','1'); }catch(err){}
  location.reload();
});
$('#openSettings').onclick=()=>openSettings();
// 3.0: Recently deleted, Import history and Data health are in Settings > Data; Merge runners in Team > ⋯

/* ---------- tick ---------- */
function tick(){
  const now=Date.now();
  for(const w of S.watches){
    const node=cardEls[w.id]; if(!node) continue;
    if(w.status!=='running') continue;
    const t=now-w.startAt, P=planOf(w);
    if(P && w.run.phase==='rest'){
      const left=w.run.restEndT-t, sec=Math.ceil(left/1000);
      if(left<=0){
        w.run.rep++; w.run.cp=0; w.run.repStartT=w.run.restEndT; w.run.phase='run';
        beep(988,0.4); buzz([180]); renderCard(w); save(); continue;
      }
      if(sec<=3 && beepMark[w.id]!==sec){ beepMark[w.id]=sec; beep(660,0.12); }
    }
    updateLive(w,node,t,P);
  }
  requestAnimationFrame(tick);
}

/* ---------- today's workout: goal, schedule, suggestions (2.14) ---------- */
// The Workouts tab starts with "What's today's goal?". The schedule (days to the next meet, since the last one) picks a
// suggested goal; each goal offers 2-3 established high school cross country sessions with effort-based parts, so every
// runner gets their own targets from Jack Daniels's VDOT paces (easy, threshold, interval, repetition) or Tom Schwartz's
// CV. Flow: goal -> a suggestion (or build your own) -> reps/rest with steppers -> runners -> Start. A suggestion is saved
// as an ordinary workout (same fields as any workout, so older versions and the sync rules read it; the template id rides
// along inside its parts as `tpl`).
const GOALS=[['base','Aerobic base','Easy volume, strides'],['threshold','Threshold / CV','Comfortably hard, controlled'],['speed','Speed (VO2max)','Hard reps, full jog rest'],
  ['sharpen','Race sharpening','Short, fast, crisp'],['recovery','Recovery','Easy, short'],['premeet','Pre-meet','Shakeout and strides'],['long','Long run','The week’s longest, easy']];
const GOAL_WORD=Object.fromEntries(GOALS.map(g=>[g[0],g[1]]));
// The recognized pace systems, by their standard names (2.14).
const PACE_SYS={easy:'Easy (E), Daniels VDOT',threshold:'Threshold (T), Daniels VDOT',interval:'Interval (I), Daniels VDOT',repetition:'Repetition (R, about mile pace), Daniels VDOT',cv:'Critical velocity (CV), Tom Schwartz','5k':'5K race pace, from VDOT',mile:'Mile race pace, from VDOT'};
const P_=(dist,ref,cp,effort)=>({dist,mode:'effort',paceRef:ref,cp:cp||0,effort:effort||({easy:'easy',threshold:'tempo',cv:'cv',interval:'fast',repetition:'fast','5k':'race',mile:'fast'}[ref]),value:''});
// load: how hard (hard sessions are kept away from meet days); note: what to tell the runners
const WK_TPL=[
  {id:'cv5x1000',goal:'threshold',load:'moderate',name:'5 × 1000 at CV',reps:5,rest:'1:00',parts:[P_(1000,'cv',200)],note:'Short rest keeps it controlled. CV sits between threshold and 5K pace.'},
  {id:'t20',goal:'threshold',load:'moderate',name:'Threshold run, about 20 min (4000 m)',reps:1,rest:'',parts:[P_(4000,'threshold',400)],note:'Comfortably hard, even pace; check every 400.'},
  {id:'t3xmile',goal:'threshold',load:'moderate',name:'3 × 1 mile at threshold',reps:3,rest:'1:00',parts:[P_(1609,'threshold',400)],note:'Daniels cruise intervals: one minute rest.'},
  {id:'i6x800',goal:'speed',load:'hard',name:'6 × 800 at interval pace',reps:6,rest:'2:00',parts:[P_(800,'interval',200)],note:'Jog rest about as long as the rep.'},
  {id:'i5x1000',goal:'speed',load:'hard',name:'5 × 1000 at interval pace',reps:5,rest:'2:30',parts:[P_(1000,'interval',200)],note:'VO2max work: stop if form breaks down.'},
  {id:'i12x400',goal:'speed',load:'hard',name:'12 × 400 at interval pace',reps:12,rest:'1:30',parts:[P_(400,'interval',200)],note:'Even 400s; no faster than interval pace.'},
  {id:'r8x200',goal:'sharpen',load:'light',name:'8 × 200 at repetition (mile) pace',reps:8,rest:'1:00',parts:[P_(200,'repetition',100)],note:'Fast and relaxed, full recovery (200 jog).'},
  {id:'r3xmile5k',goal:'sharpen',load:'moderate',name:'3 × 1 mile at 5K pace',reps:3,rest:'2:00',parts:[P_(1609,'5k',400)],note:'Race rhythm; the last one no faster than the first.'},
  {id:'hills8',goal:'sharpen',load:'moderate',name:'Hill repeats: 8 × 200 m uphill',reps:8,rest:'1:30',parts:[P_(200,'repetition',0)],note:'Run by effort (repetition feel) on the hill; jog down. Targets are a guide only.'},
  {id:'b6k',goal:'base',load:'easy',name:'Easy run 6 km + 6 × 20 s strides',reps:1,rest:'',parts:[P_(6000,'easy',1000)],note:'Conversational pace, then strides after the run.'},
  {id:'bprog',goal:'base',load:'moderate',name:'Progression: 3 km easy, 2 km at CV',reps:1,rest:'',parts:[P_(3000,'easy',1000),P_(2000,'cv',400)],note:'Finish strong but controlled.'},
  {id:'rec5k',goal:'recovery',load:'easy',name:'Recovery run 5 km easy',reps:1,rest:'',parts:[P_(5000,'easy',1000)],note:'Easy means easy: slower is fine.'},
  {id:'rec4k',goal:'recovery',load:'easy',name:'Easy 4 km + 4 strides',reps:1,rest:'',parts:[P_(4000,'easy',1000)],note:'Short and loose.'},
  {id:'pre3k',goal:'premeet',load:'easy',name:'Pre-meet shakeout: 3 km easy + 4 × 100 strides',reps:1,rest:'',parts:[P_(3000,'easy',1000)],note:'Stay fresh: strides after, then done.'},
  {id:'pre2x400',goal:'premeet',load:'light',name:'Pre-meet tune-up: 2 × 400 at 5K pace',reps:2,rest:'2:00',parts:[P_(400,'5k',200)],note:'Just a reminder of race rhythm.'},
  {id:'long12',goal:'long',load:'moderate',name:'Easy long run 12 km (about 60–75 min)',reps:1,rest:'',parts:[P_(12000,'easy',1609)],note:'Easy all the way; the week’s longest run.'},
  {id:'long10t',goal:'long',load:'moderate',name:'Long run 10 km, last 2 km at threshold',reps:1,rest:'',parts:[P_(8000,'easy',1609),P_(2000,'threshold',400)],note:'Easy, then a controlled finish.'}];
// The schedule: the next meet (today counts) and the last one before today, in days.
function schedule(now){ now=now||Date.now(); const today=localDate(new Date(now)), dd=d=>Math.round((dayMs(d)-dayMs(today))/864e5), L=(S.meets||[]).filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date));
  const nx=L.find(m=>m.date>=today), ls=L.slice().reverse().find(m=>m.date<today), nm=m=>seriesName(m.seriesId);
  return {next:nx?{m:nx,name:nm(nx),days:dd(nx.date)}:null,last:ls?{m:ls,name:nm(ls),days:-dd(ls.date)}:null}; }
// The goal the schedule points to, and why.
function suggestedGoal(sc){ const n=sc.next&&sc.next.days, l=sc.last&&sc.last.days;
  if(n===0) return {goal:'premeet',why:`Race day: ${sc.next.name}. Warm up and race.`};
  if(n===1) return {goal:'premeet',why:`1 day before ${sc.next.name}: shake out and stay fresh.`};
  if(l===1) return {goal:'recovery',why:`1 day after ${sc.last.name}: recover.`};
  if(n===2) return {goal:'sharpen',why:`2 days before ${sc.next.name}: keep it short and sharp.`};
  if(l===2) return {goal:'base',why:`2 days after ${sc.last.name}: easy aerobic running.`};
  if(n!=null&&n<=4) return {goal:'threshold',why:`${n} days before ${sc.next.name}: a controlled threshold or CV session.`};
  return {goal:'speed',why:n!=null?`${n} days until ${sc.next.name}: room for a hard VO2max session.`:'No meet coming up: room for a hard session.'}; }
// Why a template fits (or doesn't) today, from the schedule.
function whyFor(t,sc){ const n=sc.next&&sc.next.days, l=sc.last&&sc.last.days, nm=sc.next&&sc.next.name;
  if(t.load==='hard'&&n!=null&&n<=2) return {ok:false,txt:`${n===0?'Race day':n+' day'+(n===1?'':'s')+' before '+nm}: too hard this close to a meet.`};
  if(t.load==='hard'&&l!=null&&l<=1) return {ok:false,txt:`${l} day after ${sc.last.name}: too soon after a race.`};
  if(t.goal==='sharpen'&&n!=null&&n<=2) return {ok:true,txt:`${n} day${n===1?'':'s'} before ${nm}: keep it short and sharp.`};
  if(t.goal==='premeet'&&n!=null&&n<=1) return {ok:true,txt:n===0?`Race day: ${nm}.`:`1 day before ${nm}: stay fresh.`};
  if(t.goal==='recovery'&&l!=null&&l<=2) return {ok:true,txt:`${l} day${l===1?'':'s'} after ${sc.last.name}: let the legs come back.`};
  if((t.load==='hard'||t.load==='moderate')&&n!=null&&n>=3) return {ok:true,txt:`${n} days until ${nm}: time to recover from it.`};
  if(n==null) return {ok:true,txt:'No meet on the schedule.'};
  return {ok:true,txt:`${n} day${n===1?'':'s'} until ${nm}.`}; }
// 2-3 suggestions for a goal, the ones that fit the schedule first.
function suggestionsFor(goal,sc){ return WK_TPL.filter(t=>t.goal===goal).map(t=>({t,w:whyFor(t,sc)})).sort((a,b)=>(b.w.ok-a.w.ok)).slice(0,3); }
// A template as a workout; reps/rest from the steppers. Reuses a saved workout with the same name and content.
function wkFromTpl(t,reps,rest){ const name=t.name.replace(/^\d+ ×/,`${reps} ×`), wk={id:uid(),name,reps:String(reps),rest:rest||'',restUnit:'mss',segments:t.parts.map(p=>({...p,id:uid(),tpl:t.id}))};
  const same=S.workouts.find(w=>w.name===wk.name&&String(w.reps)===wk.reps&&(w.rest||'')===wk.rest&&JSON.stringify((w.segments||[]).map(s=>[+s.dist,s.paceRef,s.mode]))===JSON.stringify(wk.segments.map(s=>[+s.dist,s.paceRef,s.mode])));
  if(same) return same; S.workouts.push(wk); CC={}; save(); return wk; }
let todayGoal=null; // this visit's goal (null = the suggested one)
function todayHTML(){
  const sc=schedule(), sg=suggestedGoal(sc), g=todayGoal||sg.goal, L=suggestionsFor(g,sc);
  const when=[sc.next?`Next meet: <b>${esc(sc.next.name)}</b>, ${esc(fmtDay(sc.next.m.date))} (${sc.next.days===0?'today':sc.next.days===1?'tomorrow':'in '+sc.next.days+' days'})`:'No meet on the schedule',sc.last?`last: ${esc(sc.last.name)}, ${sc.last.days} day${sc.last.days===1?'':'s'} ago`:''].filter(Boolean).join(' · ');
  return `<section class="today" aria-labelledby="todayH"><h2 id="todayH">What’s today’s goal?</h2><p class="hint today-sched">${when}</p>
    <div class="goal-grid" role="group" aria-label="Today’s goal">${GOALS.map(([k,l,d])=>`<button type="button" class="goal-btn" data-goal-pick="${k}" aria-pressed="${k===g}"><b>${esc(l)}</b><small>${k===sg.goal?'Suggested today':esc(d)}</small></button>`).join('')}</div>
    ${g===sg.goal?`<p class="today-why">${esc(sg.why)}</p>`:''}
    <div class="sugg-list">${L.map(({t,w})=>`<article class="sugg${w.ok?'':' warn'}" data-tpl="${t.id}"><h3>${esc(t.name)}</h3>
      <p class="sugg-paces">${[...new Set(t.parts.map(p=>PACE_SYS[p.paceRef]))].map(esc).join(' · ')}</p>
      ${w.ok&&g===sg.goal&&w.txt===sg.why?'':`<p class="sugg-why">${w.ok?'':'⚠︎ '}${esc(w.txt)}</p>`}<p class="hint">${esc(t.note)}</p>
      <button type="button" class="btn${w.ok?' primary':''}" data-tpl-use="${t.id}">Use this</button></article>`).join('')}</div>
    <p class="today-own"><button type="button" class="linkish" data-x="ownwk">Build your own workout</button> · Suggestions are starting points: change anything.</p></section>`;
}
// Step: adjust reps/rest (steppers), see each part's pace system, then choose runners.
function tplSheet(t){
  let reps=t.reps, rest=t.rest;
  const draw=()=>`<div class="tpl-sheet">${sheetHead(esc(t.name.replace(/^\d+ ×/,reps+' ×')))}<p class="hint">${esc(t.note)}</p>
    ${t.parts.map(p=>`<div class="set-row"><span><b>${esc(fmtDist(p.dist))}</b> at each runner’s <b>${esc(PACE_WORD[p.paceRef])}</b><span class="hint">${esc(PACE_SYS[p.paceRef])}</span></span></div>`).join('')}
    ${t.reps>1?`<div class="field"><label for="tplReps">Reps</label>${stepper(`<input id="tplReps" type="number" inputmode="numeric" min="1" max="30" value="${reps}">`,1,'Reps')}</div>
      <div class="field tf-field"><label for="tplRest">Rest between reps</label>${stepper(timeField({id:'tplRest',attrs:'',value:rest,unit:'mss',ph:{mss:'1:30',sec:'90'},label:'Rest'}),15,'Rest',true)}</div>`:''}
    <div class="modal-btns"><button class="btn" data-x="no">Back</button><button class="btn primary" data-x="runners">Choose runners</button></div></div>`;
  modal(draw(),(box,close)=>{ const m=box.firstElementChild; bindTimeFields(m);
    m.querySelector('[data-x=no]').onclick=close;
    const rI=m.querySelector('#tplReps'), sI=m.querySelector('#tplRest');
    if(rI) rI.addEventListener('input',()=>{ reps=clamp(+rI.value||1,1,30); m.querySelector('h2').textContent=t.name.replace(/^\d+ ×/,reps+' ×'); });
    if(sI) sI.addEventListener('input',()=>{ rest=sI.value; });
    m.querySelector('[data-x=runners]').onclick=()=>{ const wk=wkFromTpl(t,reps,rest); close(); renderWkList(); openWorkoutFlow({workoutId:wk.id}); };
  });
}
// Runners without a pace (no race this season): a recent time trial gives them one, or they run with a group.
function timeTrialSheet(a,after){
  modal(`<div class="tt-sheet">${sheetHead('Time trial for '+esc(a.name))}<p class="hint">A recent time trial (1500 m or longer) sets ${esc(a.name)}’s training paces, like a race.</p>
    <div class="field">Distance<div class="seg2 seg3" role="group" aria-label="Distance">${[[1609.34,'Mile'],[3200,'3200m'],[5000,'5K']].map(([d,l],i)=>`<button type="button" data-ttd="${d}" aria-pressed="${i===2}">${l}</button>`).join('')}</div></div>
    <div class="field tf-field"><label for="ttT">Time (m:ss.t)</label>${timeField({id:'ttT',attrs:'data-tenths',value:'',unit:'mss',ph:{mss:'e.g. 21:30.0',sec:'e.g. 1290'},label:'Time'})}</div>
    <p class="form-err" id="ttErr" hidden></p><div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Use this time</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; bindTimeFields(m); let dist=5000;
    m.querySelectorAll('[data-ttd]').forEach(b=>b.onclick=()=>{ dist=+b.dataset.ttd; m.querySelectorAll('[data-ttd]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ const t=parseTime(m.querySelector('#ttT').value), err=m.querySelector('#ttErr'); if(!t){ err.textContent='Type the time, like 21:30.0.'; err.hidden=false; return; }
      const p={id:'r'+uid(),dist:Math.round(dist*100)/100,t:Math.round(t*10)/10,date:localDate(new Date()),meet:'Time trial',src:'hand'};
      S.prs[a.id]=[...(S.prs[a.id]||[]),p]; save(); memo.clear(); close(); toast(`${a.name}: paces from the ${distLabel(p.dist)} time trial`); if(after) after(); };
  });
}

/* ---------- workouts view ---------- */
let editingId=null;
function describe(wk,P){
  if(isEffortWk(wk)){ // 2.13: effort parts have no fixed time: each runner's own pace
    const segs=(wk.segments||[]).filter(s=>+s.dist>0), reps=clamp(Math.round(+wk.reps||1),1,50), rest=parseTime(wk.rest)||0, D=segs.reduce((a,s)=>a+(+s.dist),0);
    if(!segs.length) return 'Needs a distance';
    const how=segs.map(s=>segEffort(s)?PACE_WORD[segRef(s)]:fmtSec(segSeconds(s)||0)).filter((v,i,A)=>A.indexOf(v)===i).join(' / ');
    return `${reps>1?reps+' × ':''}${fmtDist(D)} at each runner’s ${how}${rest?', '+fmtSec(rest,0)+' rest':''}`; }
  if(!P.ok) return 'Needs a distance and target time';
  const parts=[(P.reps>1?P.reps+' × ':'')+fmtDist(P.repDist)+' in '+fmtSec(P.repTime)];
  if(P.rest) parts.push(fmtSec(P.rest,0)+' rest');
  parts.push(P.cps.length+' tap'+(P.cps.length===1?'':'s')+' per rep');
  return parts.join(', ');
}
function miniBar(P){
  if(!P.ok) return '';
  const total=P.repTime*P.reps+P.rest*(P.reps-1);
  let h='';
  for(let r=0;r<P.reps;r++){
    P.segs.forEach(s=>{ h+=`<i class="e-${s.effort}" style="flex:${s.time/total}" title="${esc(EFF[s.effort])} ${fmtDist(s.dist)}"></i>`; });
    if(r<P.reps-1 && P.rest) h+=`<i class="rest" style="flex:${P.rest/total}" title="Rest"></i>`;
  }
  return `<div class="minibar">${h}</div>`;
}
function renderWkList(){
  const T=$('#wkToday'); if(T) T.innerHTML=todayHTML(); // 2.14
  const L=$('#wkList');
  if(!S.workouts.length){ L.innerHTML=`<div class="empty">No workouts yet. Build one to pace a runner or group.</div>`; return; }
  L.innerHTML=`<div class="ios-group wk-group">${S.workouts.map(wk=>{
    const P=compile(wk);
    return `<div class="wk swipe" data-id="${wk.id}"><div class="sw-lead"><button type="button" class="sw-act tint" data-w="send">Use</button><button type="button" class="sw-act gray" data-w="edit">Edit</button></div>
      <div class="sw-trail"><button type="button" class="sw-act gray" data-w="dup">Duplicate</button><button type="button" class="sw-act red" data-w="del">Delete</button></div>
      <div class="sw-front" data-w="menu" role="button" tabindex="0" aria-label="${esc(wk.name||'Untitled workout')}: actions"><div class="wk-name">${esc(wk.name||'Untitled workout')}</div>
      <div class="wk-sum">${esc(describe(wk,P))}</div>${miniBar(P)}</div></div>`;
  }).join('')}</div><p class="ios-foot">Tap a workout for Use, Edit, Duplicate and Delete. Swipe left or right for the same.</p>`;
}
$('#v-workouts').addEventListener('click',e=>{ // 2.14: today's goal and suggestions
  const g=e.target.closest('[data-goal-pick]'); if(g){ todayGoal=g.dataset.goalPick; $('#wkToday').innerHTML=todayHTML(); return; }
  const u=e.target.closest('[data-tpl-use]'); if(u){ const t=WK_TPL.find(x=>x.id===u.dataset.tplUse); if(t) tplSheet(t); return; }
  if(e.target.closest('[data-x=ownwk]')){ $('#newWk').click(); }
});
// Share (3.0): one button per exported view; its action sheet runs the view's own (hidden) Copy results / CSV buttons.
document.addEventListener('click',e=>{ const b=e.target.closest('[data-share]'); if(!b) return; const box=b.parentNode.querySelector('.share-acts'); if(!box) return;
  actionSheet('Share results',[...box.querySelectorAll('button')].map(x=>({label:x.textContent.trim(),fn:()=>x.click()}))); });
/* ---------- swipe rows and press-and-hold menus (3.0) ---------- */
// A row .swipe holds .sw-front (the row) and optional .sw-lead / .sw-trail action buttons behind it. Drag sideways to
// reveal them (iOS swipe actions); a tap elsewhere closes. Vertical scrolling is untouched (touch-action: pan-y).
function closeSwipes(except){ document.querySelectorAll('.swipe.sw-open').forEach(r=>{ if(r!==except){ r.classList.remove('sw-open'); r.querySelector('.sw-front').style.transform=''; } }); }
(function(){ let st=null;
  document.addEventListener('pointerdown',e=>{ const f=e.target.closest('.swipe>.sw-front'); if(!f){ if(!e.target.closest('.swipe')) closeSwipes(); return; } st={f,row:f.parentNode,x0:e.clientX,y0:e.clientY,base:f._x||0,on:false}; });
  document.addEventListener('pointermove',e=>{ if(!st) return; const dx=e.clientX-st.x0, dy=e.clientY-st.y0;
    if(!st.on){ if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)*1.3){ st.on=true; closeSwipes(st.row); st.f.style.transition='none'; } else if(Math.abs(dy)>10){ st=null; return; } else return; }
    const lead=st.row.querySelector('.sw-lead'), trail=st.row.querySelector('.sw-trail'), lw=lead?lead.offsetWidth:0, tw=trail?trail.offsetWidth:0;
    const x=Math.max(-tw-20,Math.min(lw+20,st.base+dx)); st.f.style.transform=`translateX(${x}px)`; st.f._x=x; });
  const up=()=>{ if(!st) return; const s2=st; st=null; if(!s2.on) return; s2.f.style.transition='';
    const lead=s2.row.querySelector('.sw-lead'), trail=s2.row.querySelector('.sw-trail'), x=s2.f._x||0;
    let to=0; if(x<-50&&trail) to=-trail.offsetWidth; else if(x>50&&lead) to=lead.offsetWidth;
    s2.f.style.transform=to?`translateX(${to}px)`:''; s2.f._x=to; s2.row.classList.toggle('sw-open',!!to); s2.row._swiped=Date.now(); };
  document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up);
  // a click right after a swipe is the end of the drag, not a tap
  document.addEventListener('click',e=>{ const r=e.target.closest('.swipe'); if(r&&r._swiped&&Date.now()-r._swiped<350&&e.target.closest('.sw-front')){ e.stopPropagation(); e.preventDefault(); } },true);
})();
// Press and hold (550 ms) on rows and tiles opens their menu, like an iOS context menu. Never on buttons inside a tile.
function longPress(sel,fn,skip){ let t=null, x0=0, y0=0, fired=0;
  document.addEventListener('pointerdown',e=>{ const el=e.target.closest(sel); if(!el||(skip&&e.target.closest(skip))) return; x0=e.clientX; y0=e.clientY; clearTimeout(t); t=setTimeout(()=>{ buzz(15); fn(el); fired=Date.now(); },550); });
  document.addEventListener('pointermove',e=>{ if(t&&(Math.abs(e.clientX-x0)>10||Math.abs(e.clientY-y0)>10)){ clearTimeout(t); t=null; } });
  ['pointerup','pointercancel'].forEach(k=>document.addEventListener(k,()=>{ clearTimeout(t); t=null; }));
  document.addEventListener('click',e=>{ if(fired&&Date.now()-fired<600&&e.target.closest(sel)){ e.stopPropagation(); e.preventDefault(); fired=0; } },true);
  document.addEventListener('contextmenu',e=>{ if(e.target.closest(sel)) e.preventDefault(); }); }
longPress('#wkList .sw-front',f=>{ f.click(); });
longPress('#teamList .ath-row',el=>{ const a=athOf(el); if(a) actionSheet(a.name,[{label:'Edit',fn:()=>resultSheet(a)},{label:'Add a race result',fn:()=>resultSheet(a)},{label:'Remove',red:true,fn:()=>removeRunnerAsk(a)}]); });
longPress('.watch',el=>{ const w=S.watches.find(x=>x.id===el.dataset.id); if(w) cardMenu(w); },'button,input,select,summary,details,a,.controls'); // a tile: its ⋯ menu
/* ---------- time fields ---------- */
// A text field for a duration with an "m:ss | sec" toggle. Values stay strings that parseTime reads.
// m:ss fills from the right like a microwave (224 -> 2:24); sec takes plain seconds with optional tenths.
const PH={total:['2:24','144'],per400:['1:12','72'],permile:['5:40','340'],perkm:['3:30','210']};
const segPh=mode=>{ const p=PH[mode]||PH.total; return {mss:'e.g. '+p[0],sec:'e.g. '+p[1]}; };
const TF_OK=/^(\d+:\d\d(\.\d)?)?$/;
function fmtMss(v){ // seconds -> "m:ss" (keeps tenths); '' when empty
  if(!(v>0)) return '';
  const r=Math.round(v*10)/10, m=Math.floor(r/60+1e-9), s=Math.round((r-m*60)*10)/10;
  return m+':'+(s<10?'0':'')+(s%1?s.toFixed(1):String(s));
}
const fmtSecs=v=> v>0 ? String(Math.round(v*10)/10) : '';
function microwave(d){ d=String(d).replace(/^0+/,'').slice(0,4); if(!d) return ''; d=d.padStart(3,'0'); return (+d.slice(0,-2))+':'+d.slice(-2); }
// m:ss.t (inputs with data-tenths, 2.6 results editor): 18423 -> 18:42.3
function microwaveT(d){ d=String(d).replace(/\D/g,'').replace(/^0+/,'').slice(0,5); if(!d) return ''; d=d.padStart(4,'0'); return (+d.slice(0,-3))+':'+d.slice(-3,-1)+'.'+d.slice(-1); }
const tfWhole=v=>String(v).split('.')[0].replace(/\D/g,'');
const tfUnit=inp=>{ const b=inp.closest('.tf'); return b&&b.dataset.unit==='sec'?'sec':'mss'; };
function timeField(o){ // o: {id, attrs, value, unit, ph:{mss,sec}, label}
  const u=o.unit==='sec'?'sec':'mss', ph=o.ph||{mss:'',sec:''};
  return `<div class="tf" data-unit="${u}"><input id="${o.id}" ${o.attrs} data-tf autocomplete="off" inputmode="${u==='sec'?'decimal':'numeric'}" value="${esc(o.value)}" placeholder="${esc(ph[u])}" data-ph-mss="${esc(ph.mss)}" data-ph-sec="${esc(ph.sec)}">`+
    `<div class="tf-unit" role="group" aria-label="${esc(o.label)} format"><button type="button" data-tu="mss" aria-pressed="${u==='mss'}">m:ss</button><button type="button" data-tu="sec" aria-pressed="${u==='sec'}">sec</button></div></div>`;
}
function tfSet(inp,val){
  inp.value=val; try{ inp.setSelectionRange(val.length,val.length); }catch(e){}
  inp.dispatchEvent(new Event('input',{bubbles:true}));
}
// Fields fire 'input' as usual, plus 'tfunit' (detail: 'mss'|'sec') when the toggle changes.
function bindTimeFields(root){
  const isTF=t=>t&&t.matches&&t.matches('[data-tf]');
  root.addEventListener('beforeinput',e=>{
    const t=e.target; if(!isTF(t)||tfUnit(t)!=='mss') return;
    const it=e.inputType||'', v=t.value, sel=t.selectionStart!==t.selectionEnd;
    if(t.hasAttribute('data-tenths')){
      if(it==='insertText'){ e.preventDefault(); const add=(e.data||'').replace(/\D/g,''); if(!add && !sel) return; tfSet(t,microwaveT((sel?'':v)+add)); }
      else if(it.startsWith('delete')){ e.preventDefault(); tfSet(t,sel||!v?'':microwaveT(v.replace(/\D/g,'').slice(0,-1))); }
      return; }
    if(it==='insertText'){
      e.preventDefault();
      const add=(e.data||'').replace(/\D/g,''); if(!add && !sel) return;
      tfSet(t,microwave((sel?'':tfWhole(v))+add));
    } else if(it.startsWith('delete')){
      e.preventDefault();
      tfSet(t, sel||!v ? '' : v.includes('.') ? v.split('.')[0] : microwave(tfWhole(v).slice(0,-1)));
    }
  });
  // fallback for edits beforeinput didn't catch; runs before the editor's own input listener
  root.addEventListener('input',e=>{
    const t=e.target; if(!isTF(t)) return;
    let v=t.value;
    if(tfUnit(t)==='mss'){ if(TF_OK.test(v)) return; v=t.hasAttribute('data-tenths')?microwaveT(v):microwave(v.replace(/\D/g,'')); }
    else {
      v=v.replace(/,/g,'.').replace(/[^\d.]/g,'');
      const i=v.indexOf('.'); if(i>=0) v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'').slice(0,1);
    }
    if(v!==t.value){ t.value=v; try{ t.setSelectionRange(v.length,v.length); }catch(err){} }
  },true);
  root.addEventListener('paste',e=>{
    const t=e.target; if(!isTF(t)) return;
    const txt=(e.clipboardData&&e.clipboardData.getData('text'))||'', mss=tfUnit(t)==='mss';
    if(txt.includes(':')){ e.preventDefault(); const v=parseTime(txt); tfSet(t,mss?fmtMss(v):fmtSecs(v)); }
    else if(mss){ e.preventDefault(); tfSet(t,microwave(tfWhole(txt))); }
  });
  root.addEventListener('focusout',e=>{ // 0:72 -> 1:12, 72. -> 72
    const t=e.target; if(!isTF(t)||!t.value) return;
    const v=parseTime(t.value); let n=tfUnit(t)==='mss'?fmtMss(v):fmtSecs(v);
    if(n && tfUnit(t)==='mss' && t.hasAttribute('data-tenths') && !n.includes('.')) n+='.0'; // m:ss.t keeps its tenth, so more digits still fill from the right
    if(n!==t.value){ t.value=n; t.dispatchEvent(new Event('input',{bubbles:true})); }
  });
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-tu]'); if(!b||!root.contains(b)) return;
    const box=b.closest('.tf'), inp=box.querySelector('[data-tf]'), u=b.dataset.tu;
    if(box.dataset.unit===u) return;
    const v=parseTime(inp.value);
    box.dataset.unit=u;
    box.querySelectorAll('[data-tu]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.tu===u)));
    inp.setAttribute('inputmode',u==='sec'?'decimal':'numeric');
    inp.placeholder=(u==='sec'?inp.dataset.phSec:inp.dataset.phMss)||'';
    if(inp.value){ inp.value=u==='sec'?fmtSecs(v):fmtMss(v); inp.dispatchEvent(new Event('input',{bubbles:true})); }
    inp.dispatchEvent(new CustomEvent('tfunit',{bubbles:true,detail:u}));
  });
}

function segRow(s,i,n){
  const effort=EFFORTS.map(([k,l])=>`<option value="${k}"${k===s.effort?' selected':''}>${l}</option>`).join('');
  const modes=MODES.map(([k,l])=>`<option value="${k}"${k===s.mode?' selected':''}>${l}</option>`).join('');
  const cps=CPS.map(([k,l])=>`<option value="${k}"${+k===+s.cp?' selected':''}>${l}</option>`).join('');
  return `<div class="seg" data-i="${i}"><span class="seg-num">Part ${i+1}</span>
    <label class="field">Effort<select data-sf="effort">${effort}</select></label>
    <label class="field">Distance (meters)<input data-sf="dist" inputmode="numeric" list="dists" value="${esc(s.dist)}" placeholder="800"></label>
    <label class="field">Pace given as<select data-sf="mode">${modes}</select></label>
    <div class="field tf-field"${s.mode==='effort'?' hidden':''}><label for="tf-${s.id||i}">Time</label>${timeField({id:'tf-'+(s.id||i),attrs:'data-sf="value"',value:s.value,unit:s.timeUnit,ph:segPh(s.mode),label:'Time'})}</div>
    <label class="field eff-field"${s.mode==='effort'?'':' hidden'}>Effort pace<select data-sf="paceRef">${PACE_REFS.map(([k,l])=>`<option value="${k}"${k===(s.paceRef||'cv')?' selected':''}>${l}</option>`).join('')}</select></label>
    <label class="field eff-pct"${s.mode==='effort'&&s.paceRef==='pct'?'':' hidden'}>Percent of 5K speed (105 = 5% faster than 5K pace)<input data-sf="pct" inputmode="decimal" value="${esc(s.pct||'100')}"></label>
    <label class="field">Tap points<select data-sf="cp">${cps}</select></label>
    <div class="seg-btns"><button class="btn" data-w="up" ${i===0?'disabled':''} aria-label="Move up">↑</button><button class="btn" data-w="down" ${i===n-1?'disabled':''} aria-label="Move down">↓</button><button class="btn warn" data-w="rmseg" ${n===1?'disabled':''} aria-label="Remove section">×</button></div>
    <div class="seg-calc" data-calc></div></div>`;
}
function segCalc(s){
  const T=segSeconds(s), D=+s.dist;
  if(!(D>0)) return {err:true,html:'Add a distance in meters.'};
  if(s.mode!=='effort'&&segEffort(s)) return {err:false,html:`${fmtDist(D)} at each runner’s own <b>${esc(PACE_WORD[segRef(s)])}</b> (no time typed, so each runner gets their own target from their races this season)`};
  if(s.mode==='effort') return {err:false,html:`${fmtDist(D)} at each runner’s own <b>${esc(PACE_WORD[s.paceRef||'cv'])}${s.paceRef==='pct'?' ('+esc(s.pct||100)+'% of 5K speed)':''}</b>, from their races this season. Targets are set when they go on a stopwatch (estimates).`};
  if(!(T>0)) return {err:true,html:'Add a target time like 1:12 or 72.'};
  return {err:false,html:`${fmtDist(D)} in <b class="num">${fmtSec(T)}</b>, which is <b class="num">${fmtSec(T*400/D)}</b> per 400m and <b class="num">${fmtSec(T*1609.34/D,0)}</b> per mile`};
}
function renderEditor(){
  const box=$('#wkEditor'); const wk=S.workouts.find(x=>x.id===editingId);
  document.body.classList.toggle('wk-editing',!!wk); // 3.0: the editor is a large sheet
  if(!wk){ box.innerHTML=''; return; }
  box.innerHTML=`<section class="editor" data-id="${wk.id}"><div class="grab" aria-hidden="true"></div>
    <div class="ed-head"><h2>Edit workout</h2><button class="btn plain" data-w="close">Done</button></div>
    <label class="field">Workout name<input data-wf="name" value="${esc(wk.name)}" maxlength="60" placeholder="e.g. CV 6 × 800m"></label>
    <div class="ed-row">
      <div class="field"><label for="wf-reps-${wk.id}">How many times</label>${stepper(`<input id="wf-reps-${wk.id}" data-wf="reps" type="number" inputmode="numeric" min="1" max="50" value="${esc(wk.reps)}">`,1,'Reps')}</div>
      <div class="field tf-field"><label for="tf-rest-${wk.id}">Rest between</label>${stepper(timeField({id:'tf-rest-'+wk.id,attrs:'data-wf="rest"',value:wk.rest,unit:wk.restUnit,ph:{mss:'1:30',sec:'90'},label:'Rest'}),15,'Rest',true)}</div>
    </div>
    <div class="segs">${wk.segments.map((s,i)=>segRow(s,i,wk.segments.length)).join('')}</div>
    <div><button class="btn" data-w="addseg">+ Add a part</button></div>
    <div class="preview" data-preview></div>
  </section>`;
  wk.segments.forEach((s,i)=>updateSegCalc(i,s));
  renderPreview(wk);
}
function updateSegCalc(i,s){
  const c=$(`#wkEditor .seg[data-i="${i}"] [data-calc]`); if(!c) return;
  const r=segCalc(s); c.innerHTML=r.html; c.classList.toggle('err',r.err);
}
function renderPreview(wk){
  const box=$('#wkEditor [data-preview]'); if(!box) return;
  const P=compile(wk);
  if(isEffortWk(wk)){ box.innerHTML=`<h3>Targets</h3><p class="hint">Parts by effort get each runner’s own pace from their races this season (Jack Daniels’s VDOT method; estimates). A group stopwatch uses the group’s middle runner. See or adjust them on each stopwatch: ⋯ &gt; Targets.</p>`; return; }
  if(!P.ok){ box.innerHTML=''; return; }
  let rows='', prev={d:0,t:0};
  P.cps.forEach(c=>{
    const s=P.segs[c.seg];
    rows+=`<tr><td>${fmtDist(c.d)}</td><td><span class="chip e-${s.effort}">${esc(EFF[s.effort])}</span></td><td>${fmtSec(c.t-prev.t)}</td><td>${fmtSec(c.t)}</td></tr>`;
    prev=c;
  });
  box.innerHTML=`<h3>What the stopwatch expects${P.reps>1?', each rep':''}</h3>${miniBar(P)}
    <div class="tbl-wrap"><table><thead><tr><th>Mark</th><th>Effort</th><th>Time for this part</th><th>Clock should show</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="wk-sum" style="margin:10px 0 0">${esc(describe(wk,P))}.${P.reps>1&&P.rest?' The rest countdown starts when you tap the final split of each rep.':''}</p>`;
}
function wkChanged(wk){ delete CC[wk.id]; renderWkList(); renderPreview(wk); save(); }

$('#newWk').onclick=()=>{
  const wk={id:uid(),name:'New workout',reps:1,rest:'',segments:[seg('tempo',400,'total','',0)]};
  S.workouts.push(wk); editingId=wk.id; renderWkList(); renderEditor(); save();
  const n=$('#wkEditor [data-wf=name]'); if(n){ n.focus(); n.select(); }
};
$('#wkList').addEventListener('click',async e=>{
  const b=e.target.closest('[data-w]'); if(!b) return;
  const id=b.closest('.wk').dataset.id, wk=S.workouts.find(x=>x.id===id); if(!wk) return;
  const row=b.closest('.swipe'); if(row&&row.classList.contains('sw-open')){ closeSwipes(); if(b.dataset.w==='menu') return; } closeSwipes();
  if(b.dataset.w==='menu'){ const go=w=>{ const x=row.querySelector(`[data-w="${w}"]`); if(x) x.click(); }; // 3.0: tap = its actions
    actionSheet(wk.name||'Workout',[{label:'Use this workout',fn:()=>go('send')},{label:'Edit',fn:()=>go('edit')},{label:'Duplicate',fn:()=>go('dup')},{label:'Delete',red:true,fn:()=>go('del')}]); return; }
  if(b.dataset.w==='send'){ if(S.watches.length>=MAX){ toast(`The track is full (${MAX} stopwatches). Clear it in Settings first.`); return; } openWorkoutFlow({workoutId:id}); }
  if(b.dataset.w==='edit'){ editingId=id; renderWkList(); renderEditor(); }
  if(b.dataset.w==='dup'){
    const c=JSON.parse(JSON.stringify(wk)); c.id=uid(); c.name=wk.name+' (copy)'; c.segments.forEach(s=>s.id=uid());
    S.workouts.splice(S.workouts.indexOf(wk)+1,0,c); editingId=c.id; renderWkList(); renderEditor(); save();
  }
  if(b.dataset.w==='del'){
    // 2.6: running, paused and finished stopwatches keep their own plan copy and are never touched. Idle ones
    // switch to stopwatch-only, and restoring the workout gives it back to them (if still idle and unassigned).
    const idle=S.watches.filter(w=>w.workoutId===id&&w.status==='idle');
    const key=trashPut({kind:'workout',id,label:wk.name||'Untitled workout',item:JSON.parse(JSON.stringify(wk)),extra:{idleWatchIds:idle.map(w=>w.id)}});
    S.workouts=S.workouts.filter(x=>x!==wk); idle.forEach(w=>{ w.workoutId=null; });
    delete CC[id]; if(editingId===id) editingId=null; renderWkList(); renderEditor(); save();
    removedSnack(`Deleted “${wk.name||'workout'}”${idle.length?`. ${idle.length} waiting stopwatch${idle.length===1?'':'es'} switched to stopwatch only`:''}`,key);
  }
});
$('#wkEditor').addEventListener('input',e=>{
  const ed=e.target.closest('.editor'); if(!ed) return; const wk=S.workouts.find(x=>x.id===ed.dataset.id); if(!wk) return;
  const t=e.target;
  if(t.dataset.wf){ wk[t.dataset.wf]= t.dataset.wf==='reps' ? t.value : t.value; wkChanged(wk); return; }
  if(t.dataset.sf){
    const i=+t.closest('.seg').dataset.i, s=wk.segments[i];
    s[t.dataset.sf]= (t.dataset.sf==='dist'||t.dataset.sf==='cp') ? (t.value===''?'':+t.value) : t.value;
    if(t.dataset.sf==='mode'){ const v=t.closest('.seg').querySelector('[data-sf=value]'), ph=segPh(s.mode); v.dataset.phMss=ph.mss; v.dataset.phSec=ph.sec; v.placeholder=ph[tfUnit(v)];
      const sg=t.closest('.seg'); sg.querySelector('.tf-field').hidden=s.mode==='effort'; sg.querySelector('.eff-field').hidden=s.mode!=='effort'; sg.querySelector('.eff-pct').hidden=!(s.mode==='effort'&&s.paceRef==='pct'); if(s.mode==='effort'&&!s.paceRef) s.paceRef='cv'; }
    if(t.dataset.sf==='paceRef'){ t.closest('.seg').querySelector('.eff-pct').hidden=s.paceRef!=='pct'; }
    updateSegCalc(i,s); wkChanged(wk);
  }
});
bindTimeFields($('#wkEditor'));
$('#wkEditor').addEventListener('tfunit',e=>{ // remember m:ss or sec per field
  const ed=e.target.closest('.editor'); if(!ed) return; const wk=S.workouts.find(x=>x.id===ed.dataset.id); if(!wk) return;
  const t=e.target;
  if(t.dataset.sf){ wk.segments[+t.closest('.seg').dataset.i].timeUnit=e.detail; }
  else if(t.dataset.wf==='rest'){ wk.restUnit=e.detail; }
  save();
});
$('#wkEditor').addEventListener('change',e=>{ if(e.target.tagName==='SELECT') e.target.dispatchEvent(new Event('input',{bubbles:true})); });
$('#wkEditor').addEventListener('click',e=>{
  const b=e.target.closest('[data-w]'); if(!b) return;
  const ed=b.closest('.editor'); const wk=S.workouts.find(x=>x.id===ed.dataset.id); if(!wk) return;
  const a=b.dataset.w;
  if(a==='close'){ editingId=null; renderWkList(); renderEditor(); return; }
  if(a==='addseg'){ const last=wk.segments[wk.segments.length-1]; wk.segments.push(seg(last?last.effort:'tempo',200,last?last.mode:'total','',0)); }
  const segEl=b.closest('.seg');
  if(segEl){
    const i=+segEl.dataset.i;
    if(a==='rmseg' && wk.segments.length>1) wk.segments.splice(i,1);
    if(a==='up' && i>0) wk.segments.splice(i-1,0,wk.segments.splice(i,1)[0]);
    if(a==='down' && i<wk.segments.length-1) wk.segments.splice(i+1,0,wk.segments.splice(i,1)[0]);
  }
  delete CC[wk.id]; renderEditor(); renderWkList(); save();
  if(a==='addseg'){ const inputs=$('#wkEditor').querySelectorAll('.seg [data-sf=value]'); const l=inputs[inputs.length-1]; if(l) l.focus(); }
});

/* ---------- results ---------- */
let resFetched=false;
function resultsData(){
  return S.watches.map(w=>{
    const P=planOf(w);
    return {w,P,has:P?w.run.splits.length>0:w.run.laps.length>0};
  }).filter(x=>x.has);
}
function renderResults(){
  setTimeout(updateHealthBadge,0);
  renderHistory(); showResultsView();
  if(SYNC&&syncMode()==='joined'&&!teamRacesP&&!resFetched){ resFetched=true; const had=new Set(allRaces().map(x=>x.h.id)); loadTeamRaces().then(()=>{ if(curTab==='results'&&allRaces().some(x=>!had.has(x.h.id))) renderResults(); }); /* redraw only when it brings races not shown yet */ setTimeout(()=>{ resFetched=false; },60000); } // every saved race, not only the latest 30
  const data=resultsData(), G=$('#resGrid');
  if(!data.length){ G.innerHTML=`<div class="empty">No times yet. Splits and laps show up here as you record them.</div>`; $('#resText').value=''; return; }
  G.innerHTML=data.map(({w,P})=>{
    const meta=P?`${esc(P.name)}, ${w.status==='done'?'finished':'in progress'}`:'No workout';
    return `<div class="res-card"><h3>${esc(w.name||'Unnamed')}</h3><div class="meta">${meta}, total ${fmtClock(el(w))}</div>${showMembers(w)?`<div class="meta">Runners: ${esc(w.athleteNames.join(', '))}</div>`:''}<div class="tbl-wrap">${P?splitTable(P,w.run):lapTable(w.run)}</div></div>`;
  }).join('');
  $('#resText').value=resultsText(data);
}
const showMembers=w=>w.athleteNames.length>1 || (w.athleteNames.length===1 && w.athleteNames[0]!==w.name);
function resultsText(data){
  const d=new Date();
  let out=`Mustang Splits, ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}\n`;
  data.forEach(({w,P})=>{
    out+=`\n${w.name}${P?' ('+P.name+')':''}\n`;
    if(showMembers(w)) out+=`  Runners: ${w.athleteNames.join(', ')}\n`;
    if(P){
      w.run.splits.forEach(s=>{ out+=`  ${P.reps>1?'Rep '+(s.rep+1)+'  ':''}${fmtDist(s.d).padEnd(8)} target ${fmtSec(s.exp).padStart(6)}  actual ${fmtSec(s.act,2).padStart(6)}  section ${fmtSec(s.lap,2).padStart(6)}  ${fmtDelta(s.delta)}s\n`; });
    } else {
      let prev=0; w.run.laps.forEach((t,i)=>{ out+=`  Lap ${i+1}  ${fmtClock(t-prev)}  (total ${fmtClock(t)})\n`; prev=t; });
    }
  });
  return out;
}
function resultsCSV(data){
  const q=v=>`"${String(v).replace(/"/g,'""')}"`;
  let rows=[['Name','Workout','Rep','Mark','Target','Actual','Section','Diff (s)','Members'].map(q).join(',')];
  data.forEach(({w,P})=>{
    const mem=w.athleteNames.join('; ');
    if(P) w.run.splits.forEach(s=>rows.push([w.name,P.name,s.rep+1,fmtDist(s.d),fmtSec(s.exp),fmtSec(s.act,2),fmtSec(s.lap,2),s.delta.toFixed(1),mem].map(q).join(',')));
    else { let prev=0; w.run.laps.forEach((t,i)=>{ rows.push([w.name,'Stopwatch only','','Lap '+(i+1),'',fmtClock(t),fmtClock(t-prev),'',mem].map(q).join(',')); prev=t; }); }
  });
  return rows.join('\n');
}
async function copyToday(){
  const ta=$('#resText'); if(!ta.value){ toast('Nothing to copy yet'); return; }
  try{ await navigator.clipboard.writeText(ta.value); toast('Results copied'); return; }catch(e){}
  try{ ta.focus(); ta.select(); if(document.execCommand('copy')){ toast('Results copied'); return; } }catch(e){}
  ta.focus(); ta.select(); toast('Text is selected. Copy it from your keyboard or menu.');
}
async function csvToday(){
  const data=resultsData(); if(!data.length){ toast('Nothing to export yet'); return; }
  const name=`xc-splits-${new Date().toISOString().slice(0,10)}.csv`;
  await shareFile(new File([resultsCSV(data)],name,{type:'text/csv'}),'XC splits');
}
$('#shareToday').onclick=()=>actionSheet('Today’s stopwatches',[{label:'Copy results',id:'copyRes',fn:copyToday},{label:'Save as spreadsheet (CSV)',id:'dlRes',fn:csvToday}]); // 3.0: Share
// Share sheet when the phone can share files, otherwise a download
async function shareFile(file,title){
  try{
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file],title}); return; }
  }catch(e){ if(e && e.name==='AbortError') return; }
  const url=URL.createObjectURL(file); const a=document.createElement('a');
  a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

/* ---------- race mode ---------- */
// Its own screen and data (S.race). It does not use the stopwatch timing engine.
// Every time is a timestamp: race time = (tap time + offset) - (gun time + offset), where offset is this
// device's measured difference from Firestore server time (CLOCK.off). Nothing counts, so reloads can't drift.
const MILE=1609.34;
const DEVICE=(()=>{ try{ let d=localStorage.getItem('mustang-splits:device'); if(!d){ d=uid()+uid(); localStorage.setItem('mustang-splits:device',d); } return d; }catch(e){ return 'dev-'+uid(); } })();
let CLOCK=(()=>{ try{ return JSON.parse(localStorage.getItem('mustang-splits:clock')||'null')||{off:null}; }catch(e){ return {off:null}; } })();
const offOf=ev=>ev.off!=null?ev.off:(CLOCK.off||0);     // an event saved before any offset was known uses ours
const srv=ev=>ev.local+offOf(ev);                        // event time in server-clock milliseconds
const nowSrv=()=>Date.now()+(CLOCK.off||0);
let activeRaces=[];       // other coaches' setup/running races (team mode), from sync.js
let selMark=null;         // running: an unassigned mark picked for assigning
let raceResOpen=true;
// Distances are stored in meters; `unit` ('mi' or 'm') is only how the coach typed it.
const QUICK_DISTS=[['Mile 1',MILE,'mi'],['Mile 2',2*MILE,'mi'],['2 mi',2*MILE,'mi'],['3200m',3200,'m'],['4K',4000,'m'],['5K',5000,'m']];
const PR_DISTS=[[5000,'5K'],[2*MILE,'2 mi'],[4000,'4K'],[3200,'3200m']];
const sameDist=(a,b)=>a>0&&b>0&&Math.abs(a-b)<5;   // 3200m and 2 mi (18.7 m apart) are different distances
function distLabel(d,unit){
  if(!(d>0)) return '';
  const k=PR_DISTS.find(([v])=>sameDist(v,d)); if(k) return k[1];
  if(unit==='m'||(!unit&&Math.abs(d/MILE-Math.round(d/MILE*100)/100)>0.002)) return Math.round(d)%1000===0?Math.round(d)/1000+'K':Math.round(d)+'m';
  return +(d/MILE).toFixed(3)+' mi';
}
const distVal=(d,unit)=>!(d>0)?'':unit==='m'?String(Math.round(d)):String(+(d/MILE).toFixed(3));
const parseDist=(v,unit)=>{ const n=parseFloat(String(v).replace(',','.')); return n>0?(unit==='m'?n:n*MILE):null; };
// A distance input with an "mi | m" toggle (like the m:ss field): decimal keypad, normalized on blur.
function distField(o){ // o: {attrs, dist, unit, label}
  const u=o.unit==='m'?'m':'mi';
  return `<div class="tf df" data-unit="${u}"><input ${o.attrs} data-df inputmode="decimal" autocomplete="off" value="${esc(distVal(o.dist,u))}" placeholder="${u==='m'?'e.g. 1200':'e.g. 1.5'}" aria-label="${esc(o.label)}">`+
    `<div class="tf-unit" role="group" aria-label="${esc(o.label)} unit"><button type="button" data-du="mi" aria-pressed="${u==='mi'}">mi</button><button type="button" data-du="m" aria-pressed="${u==='m'}">m</button></div></div>`;
}
function bindDistFields(root){
  root.addEventListener('input',e=>{ const t=e.target; if(!t.matches||!t.matches('[data-df]')) return;
    let v=t.value.replace(/,/g,'.').replace(/[^\d.]/g,''); const i=v.indexOf('.'); if(i>=0) v=v.slice(0,i+1)+v.slice(i+1).replace(/\./g,'');
    if(t.closest('.df').dataset.unit==='m') v=v.split('.')[0];
    if(v!==t.value) t.value=v; },true);
  root.addEventListener('click',e=>{ const b=e.target.closest('[data-du]'); if(!b) return; const box=b.closest('.df'), inp=box.querySelector('[data-df]'), from=box.dataset.unit, to=b.dataset.du; if(from===to) return;
    const d=parseDist(inp.value,from); box.dataset.unit=to; box.querySelectorAll('[data-du]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.du===to)));
    inp.placeholder=to==='m'?'e.g. 1200':'e.g. 1.5'; inp.value=distVal(d,to); inp.dispatchEvent(new CustomEvent('dfunit',{bubbles:true,detail:to})); });
}
function newRace(){
  const r={id:uid(),name:'',status:'setup',createdAt:Date.now(),gun:null,courseId:null,goalSrc:'sb',meetId:null,division:'',
    checkpoints:[{id:uid(),name:'Mile 1',dist:MILE,unit:'mi'},{id:uid(),name:'Mile 2',dist:2*MILE,unit:'mi'},{id:uid(),name:'Finish',dist:5000,unit:'m'}],
    runners:[],marks:[]};
  const m=defaultMeet(); if(m) applyMeet(r,m); // today's meet, else the next one (2.7)
  return r;
}
const raceSecs=(r,m)=>(srv(m)-srv(r.gun))/1000;
const curCp=()=>{ const r=S.race; return (r && r.checkpoints.find(c=>c.id===S.settings.raceCp)) || (r && r.checkpoints[0]) || null; };
function ord(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
const fmtRace=sec=>fmtSec(sec,2);
const finishOf=cps=>{ let d=null; cps.forEach(c=>{ if(c.dist>0 && (!d||c.dist>d)) d=c.dist; }); return d; };

// Marks are never removed (2.6): a removed time is a new version with deleted:true. Every change to a mark appends
// a version to m.hist (append-only; the top-level fields are always the newest version). A fresh tap has no hist,
// so it is written in the same shape older versions and older rules accept.
const liveMarks=r=>r.marks.filter(m=>!m.deleted);
const verOf=m=>({cp:m.cp,runnerId:m.runnerId||null,local:m.local,off:m.off==null?null:m.off,deleted:!!m.deleted,chosen:!!m.chosen});
function markChange(m,ch,warn){
  if(!Array.isArray(m.hist)||!m.hist.length) m.hist=[{...verOf(m),uid:'',dev:m.by||'',byName:m.byName==null?'':m.byName,at:m.local}]; // the original tap
  Object.assign(m,ch);
  m.hist.push({...verOf(m),uid:myId(),dev:DEVICE,byName:S.settings.coachName||'',at:Date.now(),...(warn?{warn}:{})}); // warn: saved despite a warning (2.7.1)
}
// The time that counts at a checkpoint: the one chosen in the editor, else the earliest.
function counts(list,tOf){ const L=list.filter(m=>!m.deleted); if(!L.length) return null; return L.find(m=>m.chosen)||L.reduce((a,b)=>tOf(b)<tOf(a)?b:a); }
// Fill in rows[].cells from marks: official time per runner and checkpoint, ⚠ when two count equally.
function withCells(M){
  const by={}; (M.marks||[]).forEach(m=>{ if(m.deleted||m.rid==null) return; (by[m.rid+'|'+m.ci]||(by[m.rid+'|'+m.ci]=[])).push(m); });
  M.rows.forEach(r=>{ r.cells=M.checkpoints.map((c,ci)=>{ const L=by[r.id+'|'+ci]; if(!L) return null; const k=counts(L,m=>m.t); return {t:k.t,dup:L.length>1&&!L.some(m=>m.chosen),mid:k.id}; }); });
  return M;
}
// The race as a plain model (also what Team history stores). From 2.6 it carries every mark (with its versions),
// so a saved race can be corrected later and every recorded time is still visible.
function raceModel(r){
  const course=r.courseId&&(S.courses||[]).find(c=>c.id===r.courseId), ci={}; r.checkpoints.forEach((c,i)=>{ ci[c.id]=i; });
  const T=m=>Math.round(raceSecs(r,m)*10)/10;
  const marks=!r.gun?[]:r.marks.filter(m=>m.runnerId&&ci[m.cp]!=null).map(m=>({id:m.id,ci:ci[m.cp],rid:m.runnerId,t:T(m),dev:m.by||'',byName:m.byName==null?null:m.byName,at:m.local,chosen:!!m.chosen,deleted:!!m.deleted,
    hist:(m.hist||[]).map(v=>({ci:ci[v.cp]!=null?ci[v.cp]:-1,rid:v.runnerId,t:Math.round(raceSecs(r,{local:v.local,off:v.off})*10)/10,deleted:!!v.deleted,chosen:!!v.chosen,uid:v.uid||'',dev:v.dev||'',byName:v.byName||'',at:v.at||0,...(v.warn?{warn:v.warn}:{})}))}));
  const mt=meetOf(r.meetId);
  return withCells({name:r.name||'', raceId:r.id, courseId:r.courseId||null, courseName:course?course.name:'', goalSrc:r.goalSrc||'custom',
    meetId:r.meetId||null, seriesId:mt?mt.seriesId:null, division:r.division||'',
    checkpoints:r.checkpoints.map(c=>({id:c.id,name:c.name,dist:c.dist||null,unit:c.unit||null})),
    rows:r.runners.map(rn=>({id:rn.id,name:rn.name,group:rn.group||'',goal:rn.goal||null,goalTag:rn.goalTag||null,pr:rn.pr||null,sb:rn.sb||null,cells:[]})), marks});
}
// A saved race (Team history or this phone) with its corrections applied. Corrections are append-only versions in
// h.edits: {mid, ci, rid, t, deleted, chosen, uid, dev, byName, at}; the newest per mark wins.
const modelCache=new WeakMap();
function modelOf(h){
  if(!h||!h.race||!h.race.rows) return h&&h.race;
  const c=modelCache.get(h); if(c && c.n===(h.edits||[]).length) return c.M;
  const M=JSON.parse(JSON.stringify(h.race));
  M.checkpoints.forEach((c,i)=>{ if(!c.id) c.id='ci'+i; });
  if(!Array.isArray(M.marks)){ M.marks=[]; M.rows.forEach((r,ri)=>(r.cells||[]).forEach((x,ci)=>{ if(x) M.marks.push({id:'c'+ri+'_'+ci,ci,rid:r.id,t:x.t,dev:'',byName:undefined,at:null,legacy:true}); })); } // saved before 2.6
  M.tags={}; M.raceTags=[];
  (h.edits||[]).forEach(v=>{ if(v.op==='tag'){ if(v.rid) M.tags[v.rid]={tags:v.tags||[],note:v.note||''}; else M.raceTags=v.tags||[]; return; } // context tags (2.8), newest wins
    if(v.op==='link'){ M.meetId=v.meetId||null; M.seriesId=v.seriesId||null; M.division=v.division||''; if(v.courseId&&!M.courseId) M.courseId=v.courseId; return; } // Link past races (2.7)
    let m=M.marks.find(x=>x.id===v.mid);
    if(!m){ m={id:v.mid,dev:v.dev,byName:v.byName,at:v.at,hist:[]}; M.marks.push(m); }
    else if(!m.hist||!m.hist.length) m.hist=[{ci:m.ci,rid:m.rid,t:m.t,deleted:!!m.deleted,chosen:!!m.chosen,uid:'',dev:m.dev||'',byName:m.byName||'',at:m.at||0}];
    Object.assign(m,{ci:v.ci,rid:v.rid,t:v.t,deleted:!!v.deleted,chosen:!!v.chosen}); m.hist.push(v); });
  withCells(M); modelCache.set(h,{n:(h.edits||[]).length,M}); return M;
}
// Per checkpoint: split since the previous recorded checkpoint, its pace per mile, and the change from the
// previous segment. Pace is compared when both segments have distances (fair for an uneven last segment);
// otherwise the raw splits are compared (basis 'raw'). Within 1% of the previous segment counts as even.
function splitsOf(cps,cells){
  const out=[]; let prev=null; // {i, t, d}
  cells.forEach((cell,ci)=>{
    if(!cell){ out.push(null); return; }
    const c=cps[ci], t0=prev?prev.t:0, d0=prev?prev.d:0, split=cell.t-t0;
    const segD=(c.dist>0 && (prev?prev.d!=null:true) && c.dist>d0)?c.dist-d0:null;
    const pace=segD?split/(segD/MILE):null, x={split,segD,pace,chg:null,basis:null,cls:''};
    const p=prev&&out[prev.i];
    if(p){
      if(pace!=null && p.pace!=null){ x.chg=pace-p.pace; x.basis='pace'; x.cls=Math.abs(x.chg)<=p.pace*0.01?'even':x.chg>0?'slower':'faster'; }
      else { x.chg=split-p.split; x.basis='raw'; x.cls=Math.abs(x.chg)<=p.split*0.01?'even':x.chg>0?'slower':'faster'; }
    }
    out.push(x); prev={i:ci,t:cell.t,d:c.dist>0?c.dist:null};
  });
  return out;
}
const fmtChg=x=>{ const s=Math.round(x.chg); return (s===0?'±0':(s>0?'+':'−')+Math.abs(s))+(x.basis==='pace'?'s/mi':'s split'); };
// Goal compare: even-pace target at this distance; within 1% is on pace, over 3% is well behind.
function goalClass(delta,target){ const w=target*0.01; if(Math.abs(delta)<=w) return 'ok'; if(delta<0) return 'fast'; return delta>w*3?'bad':'slow'; }
// Everything the table, the cards, Copy and CSV show, computed once.
function raceCalc(M){
  const cps=M.checkpoints, fin=finishOf(cps), fi=fin?cps.map(c=>c.dist).lastIndexOf(fin):-1;
  const places=cps.map((c,ci)=>{ const ts=M.rows.map(r=>r.cells[ci]&&r.cells[ci].t).filter(t=>t!=null).sort((a,b)=>a-b); return t=>ts.indexOf(t)+1; });
  const rows=M.rows.map((r,ri)=>{
    const sp=splitsOf(cps,r.cells), ft=fi>=0&&r.cells[fi]?r.cells[fi].t:null;
    const cells=cps.map((c,ci)=>{ const cell=r.cells[ci]; if(!cell) return null;
      let gd=null, gcls=''; if(r.goal && c.dist && fin){ const target=r.goal*c.dist/fin; gd=cell.t-target; gcls=goalClass(gd,target); }
      return {t:cell.t,dup:cell.dup,place:places[ci](cell.t),sp:sp[ci],gd,gcls,ht:cell.handT,off:!!cell.off}; });
    return {r,ri,cells,ft,pr:ft!=null&&r.pr&&ft<r.pr,sb:ft!=null&&r.sb&&ft<r.sb,n:r.cells.filter(Boolean).length,
      last:(()=>{ for(let i=r.cells.length-1;i>=0;i--) if(r.cells[i]) return r.cells[i].t; return Infinity; })()};
  }).sort((a,b)=>b.n-a.n||a.last-b.last);
  return {cps,fin,rows};
}
const badges=x=>(x.pr?'<span class="badge pr">New PR!</span>':'')+(x.sb?'<span class="badge sb">Season best!</span>':''); // both when both apply
const goalWord={last:'last race',sb:'season best',pr:'PR',course:'last time here',meet:'last year here',custom:'goal',none:'goal'};
// Results: one card per runner on a phone (portrait), the wide table on bigger screens (CSS picks).
function raceTable(M,editable,opts){
  const tg=!!(opts&&opts.tags), tagLine=r=>{ const t=tagOf(M,r.id); return t?`<span class="tagline" title="Tagged">⚑ ${esc(t.tags.join(', '))}${t.note?(t.tags.length?' · ':'')+esc(t.note):''}</span>`:''; };
  const V=raceCalc(M), rc=(ri,ci)=>{ const c=M.rows[ri].cells[ci]; return c&&c.off?' data-offcell':editable?` data-rc="${ri}:${ci}" data-rcid="${esc(M.rows[ri].id)}:${ci}"`:''; }, gw=goalWord[M.goalSrc]||'goal';
  const htN=c=>c&&c.ht!=null&&Math.abs(c.ht-c.t)>=0.05?`<span class="sub2 hand-note">hand ${fmtRace(c.ht)}</span>`:''; // 2.11.1
  const spLine=x=>x?`${fmtSec(x.split,0)}${x.pace!=null?' · '+fmtSec(x.pace,0)+'/mi':''}${x.chg!=null?` <span class="chg ${x.cls}">${fmtChg(x)}</span>`:''}`:'';
  const gdHTML=c=>c.gd!=null?`<span class="gd ${c.gcls}">${fmtDelta(c.gd)}</span>`:'';
  const body=V.rows.map(({r,ri,cells,...x})=>`<tr${x.pr||x.sb?' class="hl"':''}><td>${esc(r.name)}${tagLine(r)}${tg?` <button type="button" class="linkish rc-tag" data-rtag="${esc(r.id)}">Tag</button>`:''}${r.goal?`<span class="sub2">${gw==='goal'?'Goal':'vs '+gw} ${fmtSec(r.goal,0)} ${tagHTML(r.goalTag)}</span>`:''}${badges(x)}</td>${cells.map((c,ci)=>!c?`<td class="rc"${rc(ri,ci)}>–</td>`:
    `<td class="rc"${rc(ri,ci)}>${c.dup?'<span class="dup" title="Two times recorded">⚠ </span>':''}${fmtRace(c.t)}${htN(c)}<span class="sub2">${spLine(c.sp)}</span><span class="sub2">${ord(c.place)}${c.gd!=null?' · '+gdHTML(c):''}</span></td>`).join('')}</tr>`).join('');
  const table=`<div class="tbl-wrap race-wide"><table class="race-table"><thead><tr><th>Runner</th>${V.cps.map(c=>`<th>${esc(c.name)}${c.dist?`<span class="sub2">${esc(distLabel(c.dist,c.unit))}</span>`:''}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  const cards=`<div class="race-cards">${V.rows.map(({r,ri,cells,...x})=>`<div class="rcard${x.pr||x.sb?' hl':''}" data-rrow="${esc(r.id)}"><div class="rc-head"><b>${esc(r.name)}</b>${r.group?`<small>${esc(r.group)}</small>`:''}${x.ft!=null?`<span class="ft">${fmtRace(x.ft)}</span>`:''}</div>
    ${tagLine(r)||tg?`<div class="rc-tags">${tagLine(r)}${tg?`<button type="button" class="btn rc-tag" data-rtag="${esc(r.id)}">${tagOf(M,r.id)?'Edit tags':'Tag'}</button>`:''}</div>`:''}
    ${badges(x)?`<div class="rc-badges">${badges(x)}</div>`:''}${r.goal?`<div class="rc-goal">${gw==='goal'?'Goal':'Compared to '+gw}: ${fmtSec(r.goal,0)} ${tagHTML(r.goalTag)}</div>`:''}
    ${V.cps.map((c,ci)=>{ const v=cells[ci], tag=editable||M.rows[ri].cells[ci]&&M.rows[ri].cells[ci].off?'button':'div'; return `<${tag}${tag==='button'?' type="button"':''} class="rc-row"${rc(ri,ci)}><span class="cp">${esc(c.name)}</span>${!v?'<span class="t">–</span>':
      `<span class="t">${v.dup?'<span class="dup">⚠ </span>':''}${fmtRace(v.t)}</span>${htN(v)}<span class="l2">${spLine(v.sp)}</span><span class="l3">${ord(v.place)}${v.gd!=null?' · vs '+gw+' '+gdHTML(v):''}</span>`}</${tag}>`; }).join('')}</div>`).join('')}</div>`;
  const rt=(M.raceTags||[]).length||tg?`<div class="race-tags">${(M.raceTags||[]).length?`<span class="tagline">⚑ Race: ${esc(M.raceTags.join(', '))}</span>`:''}${tg?` <button type="button" class="btn" data-rtag="">Race tags</button>`:''}</div>`:'';
  if(V.cps.length===1){ // 3.4: a finish-only list: one line per runner (place, name, time, pace)
    const list=`<ol class="race-list race-cards">${V.rows.map(({r,ri,cells,...x})=>{ const v=cells[0]; return `<li class="rcard rl-row${x.pr||x.sb?' hl':''}" data-rrow="${esc(r.id)}"><span class="rl-p">${v?ord(v.place):'–'}</span><span class="rl-n"><b>${esc(r.name)}</b>${badges(x)?` <span class="rc-badges">${badges(x)}</span>`:''}${tagLine(r)}${tg?` <button type="button" class="linkish rc-tag" data-rtag="${esc(r.id)}">${tagOf(M,r.id)?'Tags':'Tag'}</button>`:''}</span><${editable||(v&&v.off)?'button type="button"':'div'} class="rc-row rl-t"${rc(ri,0)}><small>${v&&v.sp&&v.sp.pace!=null?fmtSec(v.sp.pace,0)+'/mi':''}</small><b>${v?(v.dup?'⚠ ':'')+fmtRace(v.t):'–'}</b>${v?htN(v):''}</${editable||(v&&v.off)?'button':'div'}></li>`; }).join('')}</ol>`;
    return rt+list+table; }
  return rt+cards+table;
}
function raceText(M){
  const V=raceCalc(M), gw=goalWord[M.goalSrc]||'goal';
  let out=`${M.name||'Race'}${M.courseName?' ('+M.courseName+')':''}\n`;
  V.rows.forEach(({r,cells,...x})=>{ out+=`\n${r.name}${r.goal?` (${gw} ${fmtSec(r.goal,0)})`:''}${x.pr?'  New PR!':''}${x.sb?'  Season best!':''}\n`;
    V.cps.forEach((c,ci)=>{ const v=cells[ci];
      out+=`  ${c.name.padEnd(10)} ${v?fmtRace(v.t)+(v.dup?' (two times recorded)':'')+`  split ${fmtSec(v.sp.split,0)}`+(v.sp.pace!=null?` ${fmtSec(v.sp.pace,0)}/mi`:'')+(v.sp.chg!=null?` ${fmtChg(v.sp)}`:'')+`  ${ord(v.place)}`+(v.gd!=null?`  vs ${gw} ${fmtDelta(v.gd)}`:''):'–'}\n`; }); });
  return out;
}
// CSV: the 2.2 columns first (so older sheets still line up), then the 2.5 columns at the end of each row.
function raceCSV(M){
  const q=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`, V=raceCalc(M);
  const head=['Runner','Group','Goal']; V.cps.forEach(c=>head.push(c.name,c.name+' place',c.name+' pace/mi',c.name+' vs goal (s)'));
  V.cps.forEach(c=>head.push(c.name+' split',c.name+' split pace/mi',c.name+' change (s)',c.name+' change basis')); head.push('New PR','Season best');
  const lines=[head.map(q).join(',')];
  V.rows.forEach(({r,cells,...x})=>{ const row=[r.name,r.group,r.goal?fmtSec(r.goal,0):''];
    cells.forEach(v=>{ if(!v){ row.push('','','',''); return; } row.push(fmtRace(v.t),v.place,v.sp.pace!=null?fmtSec(v.sp.pace,0):'',v.gd!=null?v.gd.toFixed(1):''); });
    cells.forEach(v=>{ if(!v){ row.push('','','',''); return; } row.push(fmtSec(v.sp.split,1),v.sp.pace!=null?fmtSec(v.sp.pace,0):'',v.sp.chg!=null?v.sp.chg.toFixed(1):'',v.sp.basis==='pace'?'pace per mile':v.sp.basis==='raw'?'raw split':''); });
    row.push(x.pr?'yes':'',x.sb?'yes':''); lines.push(row.map(q).join(',')); });
  return lines.join('\n');
}
function raceHistory(r){ return {kind:'race',date:localDate(new Date(r.gun?r.gun.local:Date.now())),savedAtMs:Date.now(),watches:[],race:raceModel(r),edits:(r.tagEdits||[]).slice()}; } // live tags become edits (2.8.1)

// ---- goals from history (2.5) ----
let teamRaces=[];  // past races in Team history (kind 'race'), fetched when race setup opens
const seasonStart=()=>{ const d=new Date(), y=d.getMonth()>=7?d.getFullYear():d.getFullYear()-1; return new Date(y,7,1).getTime(); }; // August 1
// Every past race this phone knows: Team history plus races saved on this phone, newest first, no duplicates.
function pastRaces(){
  const seen=new Set(), out=[];
  // official results first (2.9): an official copy wins over the same race saved twice
  [...offHS(),...teamRaces,...teamHistory.filter(h=>h.kind==='race'),...raceLog()].forEach(h=>{ if(h.deleted) return; const M=mapModel(modelOf(h)); if(!M||!M.rows) return; // corrections applied, deleted entries skipped, merges mapped
    const k=M.raceId||(h.date+'|'+M.name+'|'+M.rows.length); if(seen.has(k)) return; seen.add(k);
    out.push({at:dayMs(h.date)||h.savedAtMs||0,M}); });
  return out.sort((a,b)=>b.at-a.at);
}
function finishTime(M,rn){ // a runner's finish time in a past race model (by id, else by name)
  const fin=finishOf(M.checkpoints); if(!fin) return null; const fi=M.checkpoints.map(c=>c.dist).lastIndexOf(fin);
  const row=M.rows.find(x=>x.id===rn.id)||M.rows.find(x=>x.name===rn.name); return row&&row.cells[fi]?row.cells[fi].t:null;
}
const livePRs=id=>((S.prs||{})[id]||[]).filter(p=>!p.deleted).length;
const prOf=(id,dist)=>{ const L=typedResults(id).filter(p=>sameDist(p.dist,dist)).map(p=>p.t); return L.length?Math.min(...L):null; }; // fastest typed result (2.10)
// PR = the fastest result at that distance: typed results, hand-timed races and official results (2.10: PRs are
// always worked out from results; 2.9 used typed PRs and official results only).
function careerBest(rn,fin){ if(!fin) return null; return memoize('cb|'+rn.id+'|'+rn.name+'|'+Math.round(fin),()=>{ let best=prOf(rn.id,fin);
  pastRaces().forEach(p=>{ if(!sameDist(finishOf(p.M.checkpoints),fin)) return; const t=finishTime(p.M,rn); if(t&&(!best||t<best)) best=t; }); return best; }); }
function goalFor(src,rn,fin,r){
  const courseId=r&&r.courseId;
  if(src==='pr') return careerBest(rn,fin);
  const past=pastRaces();
  if(src==='last'){ for(const p of past){ if(!sameDist(finishOf(p.M.checkpoints),fin)) continue; const t=finishTime(p.M,rn); if(t) return t; } return null; }
  if(src==='sb'){ let best=null; const s0=seasonStart(); past.forEach(p=>{ if(p.at<s0||!sameDist(finishOf(p.M.checkpoints),fin)) return; const t=finishTime(p.M,rn); if(t&&(!best||t<best)) best=t; });
    typedResults(rn.id).forEach(p=>{ if(p.date&&dayMs(p.date)>=s0&&sameDist(p.dist,fin)&&(!best||p.t<best)) best=p.t; }); return best; } // typed results with a date count (2.10)
  if(src==='course'){ if(!courseId) return null; for(const p of past){ if(p.M.courseId!==courseId) continue; const t=finishTime(p.M,rn); if(t) return t; } return null; }
  if(src==='meet'){ // same series and division, the season before (matched by ids, never names)
    const m=r&&meetOf(r.meetId); if(!m||!r.division) return null; const y=meetSeason(m);
    for(const p of past){ if(p.M.seriesId!==m.seriesId||gkey(p.M.division)!==gkey(r.division)||seasonOf(p.at)!==y-1) continue; const t=finishTime(p.M,rn); if(t) return t; } return null; }
  return null;
}
// Taken at the gun so "New PR!" / "Season best!" compare against what stood before this race.
function stampBests(r){ const fin=finishOf(r.checkpoints); r.runners.forEach(x=>{ x.pr=fin?careerBest(x,fin):null; x.sb=fin?goalFor('sb',x,fin):null; }); }

// Tappable toast with an action (the plain toast ignores taps on purpose).
let snackT=null;
function snack(msg,label,fn,ms){
  const s=$('#snack'); $('#snackText').textContent=msg; const b=$('#snackBtn'); b.textContent=label||'Undo';
  b.onclick=()=>{ s.hidden=true; clearTimeout(snackT); fn(); };
  s.hidden=false; clearTimeout(snackT); snackT=setTimeout(()=>{ s.hidden=true; },Math.max(ms||7000,6000)); // at least 6 s (2.6)
}

// Entry: the Race button and the banner.
async function raceEntry(){
  if(S.race && S.race.status!=='done'){ showTab('race'); return; }
  const other=activeRaces.find(x=>!S.race||x.id!==S.race.id);
  if(other){
    modal(`<h2>A race is already running</h2><p>${esc(other.name||'Unnamed race')} (${other.status==='running'?'clock running':'not started'}). One race at a time per team.</p><p class="form-err" id="rcErr" hidden></p>
      <div class="merge-btns"><button class="btn primary" data-x="open">Open it</button><button class="btn warn" data-x="end">End it and start a new race</button><button class="btn" data-x="no">Cancel</button></div>`,(m,close)=>{
      m.querySelector('[data-x=no]').onclick=close;
      const busy=on=>m.querySelectorAll('button').forEach(b=>b.disabled=on);
      m.querySelector('[data-x=open]').onclick=async()=>{ busy(true); try{ await SYNC.openRace(other.id); close(); showTab('race'); }catch(e){ const er=m.querySelector('#rcErr'); er.textContent=e.message; er.hidden=false; busy(false); } };
      m.querySelector('[data-x=end]').onclick=async()=>{ busy(true); try{ await SYNC.endRace(other.id,raceHistory); close(); startNewRace(); toast('Ended it. Its results are in Team history.'); }catch(e){ const er=m.querySelector('#rcErr'); er.textContent=e.message; er.hidden=false; busy(false); } };
    });
    return;
  }
  startNewRace();
}
async function startNewRace(){
  // No confirm (2.6): a finished race is already kept (Team history or Races on this phone).
  S.race=newRace(); selMark=null; raceReady=false; save(); showTab('race');
}
$('#raceBannerOpen').onclick=()=>{ if(S.race && S.race.status!=='done') showTab('race'); else raceEntry(); };
// 2.7.1: the tab bar shows in setup and results and hides only on the live recording screen (and the Ready
// screen). While this phone's race is live, every other tab shows the "Race running, tap to return" bar.
let raceReady=false; // setup -> Ready screen (one huge Gun)
function raceChrome(){
  const r=S.race, on=curTab==='race', running=!!(r&&r.status==='running'), setup=!!(r&&r.status==='setup');
  if(!setup) raceReady=false;
  document.body.classList.toggle('race-live',on&&(running||(setup&&raceReady)));
  document.body.classList.toggle('race-setup',on&&setup&&!raceReady);
  $('#raceClose').hidden=!(on&&running);
  const bar=running&&!on; $('#liveBar').hidden=!bar; document.body.classList.toggle('has-livebar',bar);
  if(bar) $('#liveName').textContent=r.name||'Race';
  const rb=$('#readyBar'); rb.hidden=!(on&&setup&&!raceReady);
  if(!rb.hidden){ const n=r.runners.length, b=$('#readyBtn'); b.disabled=!n; b.textContent=n?`Ready for the gun · ${n} runner${n===1?'':'s'}`:'Pick runners first'; }
}
$('#liveBar').onclick=()=>{ showTab('race'); gridGuard=Date.now()+GUARD; }; // the screen just appeared: no stray tap lands
$('#readyBtn').onclick=()=>{ if(!S.race||!S.race.runners.length) return; raceReady=true; renderRace(); window.scrollTo({top:0}); };
function updateRaceBanner(){
  raceChrome();
  const mine=S.race && S.race.status==='setup', other=activeRaces.find(x=>!S.race||x.id!==S.race.id); // a live race has the bar instead
  $('#raceBanner').hidden=!(mine||other);
  if(mine) $('#raceBannerText').textContent=`Race being set up: ${S.race.name||'Unnamed race'}`;
  else if(other) $('#raceBannerText').textContent=`A coach has a race ${other.status==='running'?'running':'set up'}: ${other.name||'Unnamed race'}`;
}
$('#raceClose').onclick=()=>showTab('watches');

// Screen
// Recording rule (2.4): name buttons never move during a race. The grid is built once per layout (race, checkpoint,
// columns, Tidy up) and after that every change is patched into the existing buttons. A rebuild ignores taps for
// GUARD ms; a button another coach just changed ignores taps for GUARD ms. This phone's own taps never lock other
// buttons, so a pack can be tapped as fast as it comes. Nothing above the grid changes height.
const GUARD=400, MARK_HINT='mustang-splits:markhint';
let gridKey='', gridGuard=0, btnGuard={}, prevRec={}, lastRes='';
// Full names on the name buttons (2.11.1): wrap to two lines and shrink only as much as needed, never cut off. Fitted
// once when the grid is built (with room for the "✓ time" and coach lines), so the buttons never change during a race.
function fitNames(){ const g=$('#raceGrid'); if(!g) return;
  g.querySelectorAll('[data-rn]').forEach(b=>{ const nm=b.querySelector('.nm'), t=b.querySelector('.t'), by=b.querySelector('.by'), keepT=t.textContent, keepBy=by.textContent;
    t.textContent='✓ 18:32.4'; by.textContent=''; let fs=b.closest('.cols-3')?16:18; nm.style.fontFamily=''; nm.style.overflowWrap=''; const set=v=>{ nm.style.setProperty('--fs',v+'px'); nm.style.fontSize=''; }; set(fs);
    const room=()=>b.clientHeight-8-t.offsetHeight, bad=()=>nm.scrollWidth>nm.clientWidth+1||nm.offsetHeight>room()+1||nm.offsetHeight>fs*1.05*2+2; // fits the button, at most two lines
    while(fs>10&&bad()){ fs-=1; set(fs); if(fs<=14) nm.style.letterSpacing='-0.02em'; } // 3.0: the system font (condensed only for clock digits) // a recorded button scales its lines down in CSS
    if(bad()) nm.style.overflowWrap='anywhere'; // last resort for a very long single word: break it rather than hide it
    t.textContent=keepT; by.textContent=keepBy; }); }
window.addEventListener('resize',()=>{ if(curTab==='race') fitNames(); });
const localTouch=new Set();   // runners this phone just changed (not another coach)
const tidied={};              // raceId:cpId -> Set of runner ids hidden by Tidy up
const manualOrder=new Set();  // races whose order was dragged on this phone: no more auto-sort by goal
let presence=[];              // coaches in this race (team mode), from sync.js: [{uid, me, cp, name, ver, at}]
const firstName=n=>String(n||'').trim().split(/\s+/)[0].toLowerCase();
// Expected finish: the goal, else the runner's PR at this race's distance, fastest first; then the rest by first name.
function sortByGoal(r){
  const fin=finishOf(r.checkpoints), key=x=>x.goal||(fin&&prOf(x.id,fin))||Infinity;
  r.runners.sort((a,b)=>(key(a)-key(b))||firstName(a.name).localeCompare(firstName(b.name))||a.name.localeCompare(b.name));
}
const recAt=(r,rid,cpid)=>counts(r.marks.filter(m=>m.runnerId===rid&&m.cp===cpid),srv);
const whoBy=m=>m.by===DEVICE?'':(m.byName||'another coach');
const verLt=(a,b)=>{ const x=String(a||'0').split('.').map(Number), y=String(b).split('.').map(Number); for(let i=0;i<3;i++){ if((x[i]||0)!==(y[i]||0)) return (x[i]||0)<(y[i]||0); } return false; };
const markHintSeen=()=>{ try{ return !!localStorage.getItem(MARK_HINT); }catch(e){ return true; } };
function visibleRunners(r){ const cp=curCp(), h=tidied[r.id+':'+cp.id]; return r.runners.filter(x=>!(h&&h.has(x.id)&&recAt(r,x.id,cp.id))); }
const runKey=r=>[r.id,curCp().id,S.settings.raceCols,r.checkpoints.map(c=>c.id+':'+c.name).join(),visibleRunners(r).map(x=>x.id).join()].join('|');

function renderRace(){
  const r=S.race; if(!r) return;
  $('#raceName').textContent=r.name||'Race';
  $('#raceState').textContent={setup:'Set up, then Gun',running:'Clock running',done:'Finished'}[r.status]||'';
  const B=$('#raceBody'); raceView.dataset.status=r.status;
  if(r.status==='running'){
    const key=runKey(r);
    if(key!==gridKey || !$('#raceGrid')){ const fresh=!$('#raceGrid'); B.innerHTML=raceRunHTML(r); gridKey=key; gridGuard=Date.now()+GUARD; prevRec={}; lastRes=''; fitNames();
      if(fresh && curTab==='race') window.scrollTo({top:0}); } // from setup (Gun near the bottom): start with the names in view
    patchRace();
  } else { gridKey=''; lastRes=''; B.innerHTML=r.status==='setup'?(raceReady?readyHTML(r):raceSetupHTML(r)):`<p class="race-status" id="raceStatus">${esc(raceSaveText())}</p>`+raceResHTML(r)+`<div class="race-actions"><button class="btn primary" data-ra="new">New race</button></div>`; }
  updateRaceClock(true); raceChrome();
}
function readyHTML(r){ // the Ready screen: one huge Gun, single tap (2.7.1)
  const mt=meetOf(r.meetId), n=r.runners.length;
  return `<div class="ready-screen"><p class="ready-meta">${mt?esc(seriesName(mt.seriesId))+(r.division?' · '+esc(divName(r.division)):'')+' · ':''}${n} runner${n===1?'':'s'}</p>
    <button class="btn go race-gun ready-gun" data-ra="gun">Gun</button>
    <button class="btn" data-ra="backsetup">Back to setup</button></div>`;
}
let goalNote='';
// Checkpoint editor, shared by setup and the "Edit checkpoints" sheet during a race (bindCpEditor).
function distWarn(r){ let hi=0; for(const c of r.checkpoints){ if(!(c.dist>0)) continue; if(c.dist<=hi) return `Distances should get longer along the course: check ${c.name}.`; hi=c.dist; } return ''; }
function cpEditorHTML(r){
  const n=r.checkpoints.length;
  return r.checkpoints.map((c,i)=>`<div class="race-cp" data-cpid="${c.id}"><div class="cp-top"><input data-cpn value="${esc(c.name)}" maxlength="20" aria-label="Checkpoint name"><span class="btns"><button class="btn" data-cpmv="-1" ${i===0?'disabled':''} aria-label="Move ${esc(c.name)} up">↑</button><button class="btn" data-cpmv="1" ${i===n-1?'disabled':''} aria-label="Move ${esc(c.name)} down">↓</button><button class="btn warn" data-cprm ${n===1?'disabled':''} aria-label="Remove ${esc(c.name)}">×</button></span></div>
    ${distField({attrs:'data-cpd',dist:c.dist,unit:c.unit||'mi',label:'Distance of '+c.name})}<div class="quick">${QUICK_DISTS.map(([l],qi)=>`<button type="button" data-qd="${qi}">${l}</button>`).join('')}</div></div>`).join('')
    +`<p class="cp-warn" data-cpwarn>${esc(distWarn(r))}</p><div><button class="btn" data-cpadd ${n>=12?'disabled':''}>+ Add checkpoint</button></div>`;
}
function bindCpEditor(root,rerender){
  const cpOf=t=>{ const r=S.race, row=t.closest('[data-cpid]'); return r&&row?r.checkpoints.find(c=>c.id===row.dataset.cpid):null; };
  const warn=()=>root.querySelectorAll('[data-cpwarn]').forEach(w=>w.textContent=distWarn(S.race));
  root.addEventListener('input',e=>{ const t=e.target; if(!t.closest('.cp-ed')) return; const c=cpOf(t); if(!c) return;
    if(t.matches('[data-cpn]')){ c.name=t.value.slice(0,20); save(); }
    if(t.matches('[data-cpd]')){ const u=t.closest('.df').dataset.unit; c.dist=parseDist(t.value,u); c.unit=u; save(); warn(); } });
  root.addEventListener('dfunit',e=>{ const c=e.target.closest('.cp-ed')&&cpOf(e.target); if(c){ c.unit=e.detail; save(); } });
  root.addEventListener('change',e=>{ const t=e.target; if(!t.matches||!t.matches('.cp-ed [data-cpd]')) return; const c=cpOf(t); if(c) t.value=distVal(c.dist,c.unit); });
  root.addEventListener('click',async e=>{ const t=e.target, r=S.race; if(!r||!t.closest('.cp-ed')) return;
    const q=t.closest('[data-qd]'), mv=t.closest('[data-cpmv]'), rm=t.closest('[data-cprm]'), add=t.closest('[data-cpadd]');
    if(!(q||mv||rm||add)) return;
    if(add){ if(r.checkpoints.length>=12) return; r.checkpoints.push({id:uid(),name:'Checkpoint '+(r.checkpoints.length+1),dist:null,unit:'mi'}); }
    else { const c=cpOf(t); if(!c) return; const i=r.checkpoints.indexOf(c);
      if(q){ const [l,d,u]=QUICK_DISTS[+q.dataset.qd]; c.dist=d; c.unit=u; if(!c.name.trim()||/^Checkpoint \d+$/.test(c.name)) c.name=l; }
      if(mv){ const j=i+(+mv.dataset.cpmv); if(j<0||j>=r.checkpoints.length) return; r.checkpoints.splice(j,0,r.checkpoints.splice(i,1)[0]); }
      if(rm){ if(r.checkpoints.length<=1) return; const ms=liveMarks(r).filter(m=>m.cp===c.id);
        r.checkpoints=r.checkpoints.filter(x=>x!==c);
        if(ms.length){ // its times are removed as versions and come back with it
          ms.forEach(m=>markChange(m,{deleted:true}));
          const key=trashPut({kind:'checkpoint',id:r.id+'/'+c.id,label:`${c.name} (${ms.length} time${ms.length===1?'':'s'})`,item:{...c},extra:{raceId:r.id,index:i,markIds:ms.map(m=>m.id)}});
          save(); rerender(); removedSnack(`Removed ${c.name} and its ${ms.length} time${ms.length===1?'':'s'}`,key,rerender); return; } } }
    save(); rerender(); });
}
// During a race: edit checkpoints in a sheet. Paces recalculate on their own (everything is derived from the marks).
function cpSheet(){
  const r=S.race; if(!r) return;
  modal(`<div class="cp-sheet"><h2>Checkpoints</h2><p class="hint">Rename, move, add, or change a distance. It changes for every coach, and paces update right away.</p><div class="cp-ed">${cpEditorHTML(r)}</div>
    <div class="modal-btns"><button class="btn primary" data-x="done">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; bindDistFields(m); bindCpEditor(m,()=>{ renderRace(); cpSheet(); });
    m.querySelector('[data-x=done]').onclick=()=>{ close(); renderRace(); };
  });
}
// Compare to: fill each runner's goal from their history (any goal can still be typed over).
// Compare to (2.7): each runner gets the chosen source, else season best, else PR, else blank, with a tag
// (SB, PR, Last, Course, Meet). A typed goal is Custom. History = saved results with corrections applied.
async function fillGoals(r,only){
  const src=r.goalSrc||'sb', fin=finishOf(r.checkpoints), list=only?r.runners.filter(x=>only.includes(x.id)):r.runners;
  if(src==='custom'){ if(!only) goalNote='Type each runner’s goal below.'; return; }
  if(src==='none'){ list.forEach(x=>{ x.goal=null; x.goalTag=null; }); goalNote='No goals: results show times and splits only.'; return; }
  if(SYNC && syncMode()==='joined') await loadTeamRaces();
  const chain=[src,...['sb','pr'].filter(x=>x!==src)], got={};
  list.forEach(x=>{ x.goal=null; x.goalTag=null;
    for(const k of chain){ if(k!=='course'&&k!=='meet'&&!fin) continue; const g=goalFor(k,x,fin,r); if(g){ x.goal=Math.round(g); x.goalTag=GOAL_TAG[k]; got[k]=(got[k]||0)+1; break; } } });
  if(only) return;
  const what={last:'their last race at '+distLabel(fin),sb:'their season best at '+distLabel(fin),pr:'their PR at '+distLabel(fin),course:'their last time on this course',meet:'last year at this meet'};
  const n=Object.values(got).reduce((a,b)=>a+b,0), parts=chain.filter(k=>got[k]).map(k=>`${got[k]} from ${what[k]}`);
  let diff='';
  if(src==='meet'){ const m=meetOf(r.meetId); if(!m) diff=' Pick a meet first.'; else if(!r.division) diff=' Pick Girls, Boys or Both first.';
    else if(pastRaces().some(p=>p.M.seriesId===m.seriesId&&gkey(p.M.division)===gkey(r.division)&&seasonOf(p.at)===meetSeason(m)-1&&p.M.courseId&&r.courseId&&p.M.courseId!==r.courseId)) diff=' Last year was on a different course.'; }
  if(!fin && src!=='course' && src!=='meet') diff+=' Give the last checkpoint a distance for season bests and PRs.';
  goalNote=(parts.length===1&&got[src]?`Filled ${n} of ${list.length} runner${list.length===1?'':'s'} from ${what[src]}.`:`Filled ${n} of ${list.length} runner${list.length===1?'':'s'}${parts.length?': '+parts.join(', '):''}.`)+(n<list.length?' The others have none yet; type a goal if you like.':'')+diff;
}
let teamRacesP=null;
function loadTeamRaces(){
  if(!SYNC||syncMode()!=='joined'||!SYNC.fetchRaceHistory) return Promise.resolve();
  if(!teamRacesP) teamRacesP=SYNC.fetchRaceHistory().then(l=>{ teamRaces=l||[]; }).catch(()=>{}).finally(()=>{ setTimeout(()=>{ teamRacesP=null; },60000); });
  return teamRacesP;
}
function raceSetupHTML(r){
  const picked=new Set(r.runners.map(x=>x.id)), cols=S.settings.raceCols===3?3:2;
  const people=S.roster.filter(a=>a.name.trim()), groups=genderSecs(people); // Girls / Boys (2.12)
  const chips=people.length?groups.map(([g,as],gi)=>`<section class="bench-grp"><button type="button" class="bench-gh" data-rg="${gi}" data-g="${g==='Girls'?'G':g==='Boys'?'B':''}">${esc(g)} <span class="n">${as.filter(a=>picked.has(a.id)).length}/${as.length}</span></button><div class="chips">${as.map(a=>`<button type="button" class="chip-a g-${a.gender||'u'}" data-rr="${a.id}" aria-pressed="${picked.has(a.id)}"><span class="nm">${esc(a.name)}</span></button>`).join('')}</div></section>`).join('')
    :`<div class="empty">No runners yet. Add them on the Team tab, then come back.</div>`;
  const order=ordRows(r);
  const courses=S.courses||[], course=courses.find(c=>c.id===r.courseId);
  const src=r.goalSrc||'sb', GS=[['sb','Season best at this distance'],['pr','PR at this distance'],['last','Last race at this distance'],['course','Last time on this course'],['meet','Last year at this meet'],['custom','Custom (type them)'],['none','None']];
  const mt=meetOf(r.meetId), seasonNow=seasonOf(Date.now());
  const meets=[...(S.meets||[])].filter(m=>meetSeason(m)>=seasonNow-1||m.id===r.meetId).sort((a,b)=>(a.date||'9').localeCompare(b.date||'9'));
  return `<h3>Meet <span class="n">Today’s or the next meet is picked for you.</span></h3>
    <div class="course-row"><select data-meet aria-label="Meet"><option value="">No meet</option>${meets.map(m=>`<option value="${m.id}"${m.id===r.meetId?' selected':''}>${esc(meetLabel(m))}</option>`).join('')}</select><button class="btn" data-ra="meets">Meets</button></div>
    <div class="field">Team<div class="div-row seg3" role="group" aria-label="Girls, Boys or Both">${divsOf(mt).map(d=>`<button type="button" data-div="${d}" aria-pressed="${r.division===d}">${divName(d)}</button>`).join('')}</div></div>
    ${meetNote?`<p class="hint goal-note">${esc(meetNote)}</p>`:''}
    <label class="field">Race name (optional)<input data-rname value="${esc(r.name)}" maxlength="60" placeholder="e.g. Bay Conference Invite" autocapitalize="words"></label>
    <h3>Runners <span class="n">${r.runners.length} picked. Tap names, or use the buttons.</span></h3>${S.roster.length?pickBar(false):''}${chips}
    <h3>Course and checkpoints</h3>
    <div class="course-row"><select data-course aria-label="Saved course"><option value="">${courses.length?'No saved course':'No saved courses yet'}</option>${courses.map(c=>`<option value="${c.id}"${c.id===r.courseId?' selected':''}>${esc(c.name)}</option>`).join('')}</select><button class="btn" data-ra="savecourse">${course?'Update course':'Save as course'}</button></div>
    ${course?`<button type="button" class="linkish" data-ra="delcourse">Delete the course “${esc(course.name)}”</button>`:''}
    <div class="cp-ed">${cpEditorHTML(r)}</div>
    <div class="field wx-geo-row"><span id="wxGeoL">Weather: use this phone’s location at the gun<span class="hint">For this race’s weather. The gun never waits for it.</span></span><button type="button" class="switch sw-btn" role="switch" aria-labelledby="wxGeoL" aria-checked="${!!S.settings.raceGeo}" data-wxgeo></button></div>
    ${r.runners.length?`<label class="field">Compare to<select data-goalsrc>${GS.map(([v,l])=>`<option value="${v}"${v===src?' selected':''}${(v==='course'&&!r.courseId)||(v==='meet'&&!(r.meetId&&r.division))?' disabled':''}>${l}</option>`).join('')}</select></label>
    <p class="hint goal-note" id="goalNote">${esc(goalNote)}</p>
    <h3>Order and goals <span class="n">Name buttons stay in this order for the whole race. Fastest goal first; drag ☰ to move someone.</span></h3>
    <div class="ord-list" id="ordList">${order}</div>
    <div class="race-actions"><button class="btn" data-ra="sortgoal">Sort by goal</button></div>
    <div class="field">Name buttons<div class="seg2" role="group" aria-label="Name button columns"><button type="button" data-cols="2" aria-pressed="${cols===2}">2 columns</button><button type="button" data-cols="3" aria-pressed="${cols===3}">3 columns</button></div></div>`:''}
    <div class="race-actions"><button class="btn warn" data-ra="discard">Discard this race</button></div>`;
}
const tagHTML=t=>t?`<span class="gtag">${esc(t)}</span>`:'';
const ordRows=r=>r.runners.map(x=>`<div class="ord-row" data-oid="${x.id}"><span class="drag" role="button" aria-label="Drag ${esc(x.name)} to move">☰</span><span class="nm">${esc(x.name)}<small>${esc(x.group||'')}${x.goal?' '+tagHTML(x.goalTag||'Custom'):''}</small></span>${timeField({id:'goal-'+x.id,attrs:`data-goal="${x.id}"`,value:x.goal?fmtSec(x.goal,0):'',unit:'mss',ph:{mss:'Goal',sec:'Goal (s)'},label:'Goal for '+x.name})}</div>`).join('');
function raceRunHTML(r){
  const cp=curCp(), cols=S.settings.raceCols===3?3:2;
  return `<div class="race-at"><span class="lbl">I'm at:</span>${r.checkpoints.map(c=>`<button type="button" data-at="${c.id}" aria-pressed="${c.id===cp.id}">${esc(c.name)}</button>`).join('')}</div>
    <p class="race-status${syncMode()==='joined'?' two':''}" id="raceStatus" aria-live="polite"></p>
    <div class="race-now"><button type="button" class="btn race-mark" data-ra="mark">Time now, name later</button><div class="mark-strip" id="markStrip"></div></div>
    <div class="race-grid cols-${cols}" id="raceGrid">${visibleRunners(r).map(x=>`<button type="button" data-rn="${x.id}"><span class="nm">${esc(x.name)}</span><span class="t"></span><span class="by"></span></button>`).join('')}</div>
    <div class="race-below" id="raceBelow"><div class="race-actions" id="raceTidy"></div>
    <div class="race-actions"><button class="btn" data-ra="restart" id="raceRestart">Restart clock</button><button class="btn" data-ra="editcp">Edit checkpoints</button><button class="btn warn" data-ra="end">End race</button></div>
    <div id="raceRes"></div></div>`;
}
const raceSrc=r=>(r.status==='done'&&savedSrc(r))||{live:r};
function raceResHTML(r){
  return `<details class="race-res"${raceResOpen?' open':''}><summary>Results</summary>${raceTable(srcModel(raceSrc(r)),true,{tags:!!r.gun})}
    <div class="race-actions"><button class="btn" data-ra="edittimes">Edit times</button><span class="share-acts" hidden><button class="btn" data-ra="copy">Copy results</button><button class="btn" data-ra="csv">Save as spreadsheet (CSV)</button></span><button type="button" class="btn share-btn" data-share aria-label="Share these results"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>Share</button></div></details>`;
}
// Updates the running screen in place. Never adds, removes or reorders name buttons (renderRace does that, with the guard).
function patchRace(){
  const r=S.race, cp=curCp(), now=Date.now(), grid=$('#raceGrid'); if(!grid) return;
  grid.querySelectorAll('[data-rn]').forEach(b=>{
    const id=b.dataset.rn, m=recAt(r,id,cp.id), t=m?'✓ '+fmtRace(raceSecs(r,m)):'', by=m?whoBy(m):'', k=t+'|'+by;
    if(prevRec[id]!==undefined && prevRec[id]!==k && !localTouch.has(id)) btnGuard[id]=now+GUARD; // another coach changed this one
    prevRec[id]=k;
    b.classList.toggle('rec',!!m); b.setAttribute('aria-disabled',String(!!m));
    const te=b.querySelector('.t'), be=b.querySelector('.by');
    if(te.textContent!==t) te.textContent=t;
    if(be.textContent!==by) be.textContent=by;
  });
  localTouch.clear();
  const un=liveMarks(r).filter(m=>!m.runnerId&&m.cp===cp.id).sort((a,b)=>srv(a)-srv(b));
  if(selMark && !un.some(m=>m.id===selMark)) selMark=null;
  $('#markStrip').innerHTML=un.map(m=>`<button type="button" data-um="${m.id}" aria-pressed="${m.id===selMark}">${fmtRace(raceSecs(r,m))}</button>`).join('')
    +(!un.length&&!markHintSeen()?`<span class="now-hint">Tap once per runner when a pack passes. Assign names after.</span>`:'');
  $('#raceStatus').textContent=raceStatusText(r,cp);
  const vis=visibleRunners(r), passed=vis.filter(x=>recAt(r,x.id,cp.id)).length, hidden=r.runners.length-vis.length;
  $('#raceTidy').innerHTML=(passed?`<button class="btn" data-ra="tidy">Tidy up (${passed} passed)</button>`:'')+(hidden?`<button class="btn" data-ra="showall">Show all (${hidden} hidden)</button>`:'');
  $('#raceRestart').hidden=!!liveMarks(r).length;
  const res=raceResHTML(r); if(res!==lastRes){ $('#raceRes').innerHTML=res; lastRes=res; }
  // Everything below the grid may grow but never shrink during a race: if the page is scrolled to the bottom,
  // a shorter page would pull the scroll position, and with it every name button, up under the finger.
  const bl=$('#raceBelow'), h=bl.offsetHeight; if(h>(+bl.dataset.mh||0)){ bl.dataset.mh=h; bl.style.minHeight=h+'px'; }
}
// One status line with a fixed height (so the grid below never moves).
function raceStatusText(r,cp){
  if(selMark) return 'Now tap the runner for that time.';
  if(syncMode()!=='joined') return '';
  const out=[raceSaveText()].filter(Boolean), fresh=presence.filter(p=>p.at && Date.now()-p.at<3*3600e3);
  const old=new Set(fresh.filter(p=>!p.me && verLt(p.ver,APP_VERSION)).map(p=>p.name||'A coach'));
  if(r.marks.some(m=>m.byName==null && m.by!==DEVICE)) old.add('A coach on an older version'); // 2.3 phones send no name and no presence
  old.forEach(n=>out.push(n+' needs to update'));
  const here=fresh.filter(p=>!p.me && p.cp===cp.id).length+1;
  if(here>1) out.push(`${here} coaches at ${cp.name}`);
  if(CLOCK.off==null) out.push('Clock not synced with the other coaches yet (needs signal). Times on this phone are still right.');
  return out.join(' · ');
}
// Clock display (its own frame loop, only while the race screen is open)
let lastClockTxt='';
function updateRaceClock(force){
  const r=S.race, el2=$('#raceClock');
  let txt='0:00.0';
  if(r && r.gun){ const L=liveMarks(r), end=r.status==='done'?Math.max(0,...L.map(m=>srv(m))):nowSrv(); txt=fmtClock(r.status==='done'&&!L.length?0:end-srv(r.gun)); }
  if(force||txt!==lastClockTxt){ el2.textContent=txt; lastClockTxt=txt; }
}
let liveTxt='';
function raceFrame(){
  if(curTab==='race') updateRaceClock();
  else if(S.race && S.race.gun && S.race.status==='running'){ const t=fmtClock(nowSrv()-srv(S.race.gun)).replace(/\.\d$/,''); if(t!==liveTxt){ $('#liveClock').textContent=t; liveTxt=t; } }
  requestAnimationFrame(raceFrame);
}
requestAnimationFrame(raceFrame);

function addMark(runnerId){
  const r=S.race, cp=curCp(), m={id:uid(),cp:cp.id,local:Date.now(),off:CLOCK.off,runnerId:runnerId||null,by:DEVICE,byName:S.settings.coachName||''};
  r.marks.push(m); buzz(25); if(runnerId) localTouch.add(runnerId); save(); renderRace();
  const who=runnerId?(r.runners.find(x=>x.id===runnerId)||{}).name:'Time';
  // Undo removes it as a new version (kept in Recently deleted), never by erasing the tap.
  snack(`${who}, ${fmtRace(raceSecs(r,m))} at ${cp.name}`,'Undo',()=>{ if(m.deleted) return; trashMarks({live:r},[m],`${who} ${fmtRace(raceSecs(r,m))} at ${cp.name} (undone)`); markChange(m,{deleted:true}); if(runnerId) localTouch.add(runnerId); save(); renderRace(); });
}
// Press and hold a recorded name: remove its time at this checkpoint (every coach's marks for it).
// Press and hold a recorded name: remove its time at this checkpoint right away (every coach's marks for it),
// with Undo at the top of the screen (2.6: no confirm; nothing is lost).
function removeTime(rid){
  const r=S.race, cp=curCp(), rn=r.runners.find(x=>x.id===rid), m0=recAt(r,rid,cp.id); if(!rn||!m0) return;
  buzz(30);
  const ms=liveMarks(r).filter(m=>m.runnerId===rid&&m.cp===cp.id), t=fmtRace(raceSecs(r,m0)), who=whoBy(m0);
  const key=trashMarks({live:r},ms,`${rn.name} ${t} at ${cp.name}`);
  ms.forEach(m=>markChange(m,{deleted:true})); localTouch.add(rid); save(); renderRace();
  removedSnack(`Removed ${rn.name}’s ${cp.name} time (${t}${who?', '+who:''})`,key,()=>{ localTouch.add(rid); renderRace(); });
}
// ---- editing times (2.6): one sheet for the live race, a finished race, Team history and races on this phone ----
// src = {live: race} (marks on screen) or {entry: h, where: 'team'|'local'} (a saved race; corrections go to h.edits).
// Every change is a new version (append-only); nothing is overwritten. Versions here are in model terms:
// {mid, ci, rid, t, deleted, chosen}.
function srcModel(src){ return src.live?liveTags(raceModel(src.live),src.live.tagEdits):modelOf(src.entry); }
// Tags added while a race is live (2.8.1) stay on this phone in race.tagEdits and go into the saved results'
// edits at End race (or when another coach saves it), so the race document and the rules don't change.
function liveTags(M,L){ M.tags={}; M.raceTags=[]; (L||[]).forEach(v=>{ if(v.rid) M.tags[v.rid]={tags:v.tags||[],note:v.note||''}; else M.raceTags=v.tags||[]; }); return M; }
function savedSrc(r){ // a finished race's saved copy, once it exists (its corrections live there)
  const s=r&&r.saved; if(!s) return null;
  const h=s.where==='team'?teamEntry(s.id):raceLog().find(x=>x.id===s.id);
  return h?{entry:h,where:s.where}:null;
}
const stateOf=m=>({mid:m.id,ci:m.ci,rid:m.rid,t:m.t,deleted:!!m.deleted,chosen:!!m.chosen});
function applyToModel(M,vs){ // a preview copy with versions applied
  const N={...M,rows:M.rows.map(r=>({...r})),marks:M.marks.map(m=>({...m}))};
  vs.forEach(v=>{ let m=N.marks.find(x=>x.id===v.mid); if(!m){ m={id:v.mid,dev:DEVICE,byName:S.settings.coachName||'',at:Date.now()}; N.marks.push(m); } Object.assign(m,{ci:v.ci,rid:v.rid,t:v.t,deleted:!!v.deleted,chosen:!!v.chosen}); });
  return withCells(N);
}
function applyVersions(src,vs){
  if(src.live){ const r=src.live;
    vs.forEach(v=>{ const cp=r.checkpoints[v.ci]; if(!cp) return; let m=r.marks.find(x=>x.id===v.mid);
      if(!m){ m={id:v.mid,cp:cp.id,local:Math.round(srv(r.gun)+v.t*1000-(CLOCK.off||0)),off:CLOCK.off,runnerId:v.rid,by:DEVICE,byName:S.settings.coachName||''}; r.marks.push(m);
        if(v.chosen||v.warn) markChange(m,{chosen:!!v.chosen},v.warn); }
      else { const cur=Math.round(raceSecs(r,m)*10)/10, ch={cp:cp.id,runnerId:v.rid,deleted:!!v.deleted,chosen:!!v.chosen};
        if(Math.abs(cur-v.t)>0.04) ch.local=Math.round(srv(r.gun)+v.t*1000-offOf(m)); // a typed time; moving keeps the exact tap
        markChange(m,ch,v.warn); }
      localTouch.add(v.rid); });
    save(); renderRace(); return; }
  const h=src.entry, stamp=vs.map(v=>({...v,uid:myId(),dev:DEVICE,byName:S.settings.coachName||'',at:Date.now()}));
  h.edits=[...(h.edits||[]),...stamp];
  if(src.where==='team'){ if(SYNC) SYNC.appendHistoryEdits(h.id,stamp); } else logPut(h);
  refreshResults();
}
function refreshResults(){ if(curTab==='race') renderRace(); if(curTab==='results') renderResults(); }
// Before -> after for the rows a change touches: time, split, pace and change here and at the next checkpoint.
function previewHTML(M,N,cells){
  const A=raceCalc(M), B=raceCalc(N), seen=new Set(), out=[];
  cells.forEach(([rid,ci])=>[ci,ci+1].forEach(c=>{ if(c<0||c>=M.checkpoints.length||seen.has(rid+'|'+c)) return; seen.add(rid+'|'+c);
    const a=(A.rows.find(x=>x.r.id===rid)||{cells:[]}).cells[c], b=(B.rows.find(x=>x.r.id===rid)||{cells:[]}).cells[c], nm=(M.rows.find(x=>x.id===rid)||{}).name;
    const f=x=>!x?'–':`${fmtRace(x.t)}${x.sp?` · split ${fmtSec(x.sp.split,0)}${x.sp.pace!=null?' · '+fmtSec(x.sp.pace,0)+'/mi':''}${x.sp.chg!=null?' · '+fmtChg(x.sp):''}`:''}`;
    if(f(a)!==f(b)) out.push(`<div class="pv"><b>${esc(nm)}, ${esc(M.checkpoints[c].name)}</b><span class="was">${f(a)}</span><span class="now">→ ${f(b)}</span></div>`); }));
  return out.length?out.join(''):'<p class="hint">No change to the results yet.</p>';
}
function timeSheet(src,rid,ci,auto){ // auto: open straight into editing (Save & next)
  const M=srcModel(src), row=M.rows.find(x=>x.id===rid), cp=M.checkpoints[ci]; if(!row||!cp) return;
  if(src.live && !src.live.gun) return;
  const here=M.marks.filter(m=>m.rid===rid&&m.ci===ci), live=here.filter(m=>!m.deleted).sort((a,b)=>a.t-b.t), cnt=row.cells[ci]&&row.cells[ci].mid;
  const ever=M.marks.filter(m=>(m.rid===rid&&m.ci===ci)||(m.hist||[]).some(v=>v.rid===rid&&v.ci===ci));
  const who=m=>m.legacy?'Recorded before 2.6':m.dev===DEVICE?'This phone':(m.byName||'Another coach');
  const clock=at=>at?new Date(at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'}):'tap time not recorded';
  const rName=id=>(M.rows.find(x=>x.id===id)||{name:'(no runner)'}).name, cName=i=>(M.checkpoints[i]||{name:'(removed checkpoint)'}).name;
  const vers=[]; ever.forEach(m=>{ const H=m.hist&&m.hist.length?m.hist:[{ci:m.ci,rid:m.rid,t:m.t,deleted:!!m.deleted,chosen:!!m.chosen,dev:m.dev,byName:m.byName,at:m.at}];
    H.forEach((v,i)=>vers.push({m,v,i,cur:i===H.length-1})); });
  vers.sort((a,b)=>(b.v.at||0)-(a.v.at||0));
  const tagVers=((src.live?src.live.tagEdits:src.entry.edits)||[]).filter(v=>v.op==='tag'&&v.rid===rid).slice().reverse(); // tag changes for this runner (2.8.1)
  const vText=v=>v.deleted?'removed':`${fmtRace(v.t)} · ${esc(rName(v.rid))} · ${esc(cName(v.ci))}${v.chosen?' · counts':''}`;
  modal(`<div class="ts"><h2>${esc(row.name)} at ${esc(cp.name)}</h2>
    ${live.length>1&&!live.some(m=>m.chosen)?'<p class="ts-warn">⚠ More than one time recorded. The earliest counts until you choose one.</p>':''}
    <div class="ts-list">${live.map(m=>`<div class="ts-row" data-mid="${m.id}"><div class="ts-t"><b>${fmtRace(m.t)}</b>${m.id===cnt?'<span class="badge sb">counts</span>':''}<span class="hint">${esc(who(m))} · ${esc(clock(m.at))}</span></div>
      <div class="race-actions">${live.length>1&&m.id!==cnt?'<button class="btn" data-ts="count">This one counts</button>':''}<button class="btn" data-ts="edit">Correct or move</button><button class="btn warn" data-ts="remove">Remove</button></div></div>`).join('')||'<p>No time here yet.</p>'}</div>
    <button class="btn" data-ts="add">+ Add a missing time</button>
    <div class="ts-edit" hidden><h3 class="ts-eh"></h3>
      <label class="field">Time (m:ss.t)${timeField({id:'tsT',attrs:'data-tst data-tenths',value:'',unit:'mss',ph:{mss:'e.g. 18:42.3',sec:'e.g. 1122.3'},label:'Time'})}</label>
      <label class="field">Runner<select data-tsr>${M.rows.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
      <label class="field">Checkpoint<select data-tsc>${M.checkpoints.map((c,i)=>`<option value="${i}">${esc(c.name)}</option>`).join('')}</select></label>
      <p class="hint ts-clash"></p><div class="ts-warns" hidden></div><div class="ts-prev"></div>
      <div class="modal-btns"><button class="btn" data-ts="cancel">Cancel</button><button class="btn primary" data-ts="save">Save</button></div>
      <div class="race-actions ts-next"><button class="btn" data-ts="nextrunner">Save &amp; next runner</button><button class="btn" data-ts="nextcp">Save &amp; next checkpoint</button></div></div>
    <details class="ts-hist"><summary>History (${vers.length} version${vers.length===1?'':'s'}${tagVers.length?`, ${tagVers.length} tag change${tagVers.length===1?'':'s'}`:''})</summary>
      ${tagVers.map(v=>`<div class="set-row ts-tagv"><span>⚑ Tags: ${v.tags&&v.tags.length?esc(v.tags.join(', ')):'none'}${v.note?' · '+esc(v.note):''}<span class="hint">by ${esc(v.dev===DEVICE?'this phone':(v.byName||'another coach'))} · ${esc(v.at?new Date(v.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'')}</span></span></div>`).join('')}
      ${vers.map(x=>`<div class="set-row"><span>${vText(x.v)}${x.v.warn?' <span class="dup">⚠ '+esc(x.v.warn)+'</span>':''}<span class="hint">${x.i===0?'recorded':'changed'} by ${esc(x.v.dev===DEVICE?'this phone':(x.v.byName||'another coach'))} · ${esc(x.v.at?new Date(x.v.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit'}):'time not recorded')}${x.cur?' · now':''}</span></span>${x.cur||x.v.ci<0?'':`<button class="btn" data-tsv="${x.m.id}:${x.i}">Restore</button>`}</div>`).join('')}</details>
    <div class="modal-btns"><button class="btn primary" data-x="done">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; bindTimeFields(m);
    const ed=m.querySelector('.ts-edit'), tIn=m.querySelector('[data-tst]'), rSel=m.querySelector('[data-tsr]'), cSel=m.querySelector('[data-tsc]');
    let editing=null; // the mark being changed (null = adding)
    m.querySelector('[data-x=done]').onclick=()=>{ close(); setTimeout(flashEdited,60); }; // back where you were; the edited cell flashes
    const reopen=()=>timeSheet(src,rid,ci);
    const sheetOpen=()=>!$('#overlay').hidden && !!document.querySelector('#modal .ts');
    const commit=(vs,undo,msg)=>{ applyVersions(src,vs); noteEdited(src,[[rid,ci],...vs.map(v=>[v.rid,v.ci])]); reopen();
      const show=()=>snack(msg,'Undo',()=>{ applyVersions(src,undo); refreshResults(); if(sheetOpen()) reopen(); },8000); show(); return show; }; // Undo also refreshes an open editor
    const pending=()=>{ const t=parseTime(tIn.value); if(t==null) return null;
      return {mid:editing?editing.id:'m'+uid(),ci:+cSel.value,rid:rSel.value,t:Math.round(t*10)/10,deleted:false,chosen:editing?!!editing.chosen&&(+cSel.value===ci&&rSel.value===rid):false}; };
    const showPrev=()=>{ const v=pending(), pv=m.querySelector('.ts-prev'), cl=m.querySelector('.ts-clash');
      if(!v){ pv.innerHTML='<p class="hint">Type a time to see how the results change.</p>'; cl.textContent=''; return; }
      const other=M.marks.find(x=>!x.deleted&&x.rid===v.rid&&x.ci===v.ci&&(!editing||x.id!==editing.id));
      cl.textContent=other&&(v.rid!==rid||v.ci!==ci)?`${rName(v.rid)} already has ${fmtRace(other.t)} at ${cName(v.ci)}. Both are kept; the earlier counts until you choose.`:'';
      pv.innerHTML=previewHTML(M,applyToModel(M,[v]),[[rid,ci],[v.rid,v.ci]]);
      const W=timeWarnings(applyToModel(M,[v]),[[v.rid,v.ci]]), wb=m.querySelector('.ts-warns'); // warnings only (2.7.1)
      wb.hidden=!W.length; wb.innerHTML=W.map(z=>'⚠ '+esc(z.text)).join('<br>'); m.querySelector('[data-ts=save]').textContent=W.length?'Save anyway':'Save'; };
    const openEd=mk=>{ editing=mk; ed.hidden=false; m.querySelector('.ts-eh').textContent=mk?'Correct or move this time':'Add a missing time';
      tIn.value=mk?fmtMss(mk.t)+(Math.round(mk.t*10)%10?'':'.0'):''; rSel.value=rid; cSel.value=String(ci); showPrev(); tIn.focus(); };
    m.addEventListener('input',showPrev); m.addEventListener('change',showPrev);
    if(auto) setTimeout(()=>openEd(live.find(x=>x.id===cnt)||live[0]||null),0);
    m.addEventListener('click',e=>{
      const b=e.target.closest('[data-ts]'), vb=e.target.closest('[data-tsv]');
      if(vb){ const [mid,i]=vb.dataset.tsv.split(':'), mk=M.marks.find(x=>x.id===mid), v=mk&&mk.hist[+i]; if(!v) return;
        commit([{mid,ci:v.ci,rid:v.rid,t:v.t,deleted:!!v.deleted,chosen:!!v.chosen}],[stateOf(mk)],'Restored that version'); return; }
      if(!b) return; const act=b.dataset.ts, mk=M.marks.find(x=>x.id===(b.closest('[data-mid]')||{}).dataset?.mid);
      if(act==='count'&&mk){ const vs=[{...stateOf(mk),chosen:true}], undo=[stateOf(mk)];
        live.filter(x=>x.chosen&&x.id!==mk.id).forEach(x=>{ vs.push({...stateOf(x),chosen:false}); undo.push(stateOf(x)); });
        commit(vs,undo,`${fmtRace(mk.t)} counts for ${row.name}`); return; }
      if(act==='remove'&&mk){ const key=trashMarks(src,[mk],`${row.name} ${fmtRace(mk.t)} at ${cp.name}`);
        applyVersions(src,[{...stateOf(mk),deleted:true}]); reopen(); removedSnack(`Removed ${row.name}’s ${fmtRace(mk.t)}`,key,()=>{ if(sheetOpen()) reopen(); }); return; }
      if(act==='edit'&&mk){ openEd(mk); return; }
      if(act==='add'){ openEd(null); return; }
      if(act==='cancel'){ ed.hidden=true; return; }
      if(act==='save'||act==='nextrunner'||act==='nextcp'){ const v=pending(); if(!v){ toast('Type a time like 18:42.3'); tIn.focus(); return; }
        if(timeWarnings(applyToModel(M,[v]),[[v.rid,v.ci]]).length) v.warn='saved despite a warning';
        const reshow=commit([v],[editing?stateOf(editing):{...v,deleted:true}],editing?`Saved ${rName(v.rid)}, ${fmtRace(v.t)} at ${cName(v.ci)}`:`Added ${rName(v.rid)}, ${fmtRace(v.t)} at ${cName(v.ci)}`);
        if(act!=='save'){ // Save & next runner (results order) / Save & next checkpoint
          const N=srcModel(src), order=raceCalc(N).rows.map(x=>x.r.id);
          const nr=act==='nextrunner'?order[order.indexOf(rid)+1]:rid, nc=act==='nextcp'?ci+1:ci;
          if(!nr||nc>=N.checkpoints.length){ toast(act==='nextrunner'?'That was the last runner':'That was the last checkpoint'); return; }
          timeSheet(src,nr,nc,true); reshow(); } } // the next sheet keeps this save's Undo
    });
  });
}
// Removed times go to the trash too (grouped per race in Recently deleted).
function trashMarks(src,ms,label){
  const raceId=src.live?src.live.id:(src.entry.race&&src.entry.race.raceId)||src.entry.id, raceName=src.live?src.live.name:(src.entry.race&&src.entry.race.name);
  return trashPut({kind:'marks',id:raceId+'/'+ms.map(m=>m.id).join(','),label,extra:{raceId,raceName:raceName||'Race',markIds:ms.map(m=>m.id),entryId:src.entry?src.entry.id:null,where:src.where||null},synced:false});
}
// ---- faster editing (2.7.1): keep your place, flash the edited cell, warnings, Edit times ----
// The edited cells flash when the editor closes (srcKey + rid + ci), and saved races keep their open/closed state.
let flashCells=[];
const srcKey=src=>src.live?'live:'+src.live.id:src.where+':'+src.entry.id;
function noteEdited(src,cells){ flashCells=cells.map(([rid,ci])=>({k:srcKey(src),rid,ci})); }
function flashEdited(){
  const L=flashCells; flashCells=[];
  L.forEach(f=>{ const box=f.k.startsWith('live:')?$('#raceRes'):document.querySelector(`[data-entry="${CSS.escape(f.k.split(':').slice(1).join(':'))}"]`);
    if(!box) return; box.querySelectorAll(`[data-rcid="${CSS.escape(f.rid+':'+f.ci)}"]`).forEach(el=>{ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1600); }); });
}
// Implausible times: a checkpoint at or before the runner's previous one (or at/after the next), or a segment
// pace outside 4:00-15:00 per mile. Warnings only: the coach can always "Save anyway".
const PACE_MIN=240, PACE_MAX=900;
function timeWarnings(N,cells){
  const out=[], C=raceCalc(N);
  cells.forEach(([rid,ci])=>{
    const row=N.rows.find(r=>r.id===rid); if(!row||!row.cells[ci]) return;
    const t=row.cells[ci].t, prev=row.cells.slice(0,ci).reverse().find(Boolean), next=row.cells.slice(ci+1).find(Boolean), cp=N.checkpoints[ci].name;
    if(prev && t<=prev.t) out.push({rid,ci,text:`${row.name}: ${cp} (${fmtRace(t)}) is at or before ${N.checkpoints[row.cells.indexOf(prev)].name} (${fmtRace(prev.t)})`});
    else if(next && t>=next.t) out.push({rid,ci,text:`${row.name}: ${cp} (${fmtRace(t)}) is at or after ${N.checkpoints[row.cells.indexOf(next)].name} (${fmtRace(next.t)})`});
    const cr=(C.rows.find(x=>x.r.id===rid)||{cells:[]}).cells[ci], sp=cr&&cr.sp;
    if(sp && sp.pace!=null && (sp.pace<PACE_MIN||sp.pace>PACE_MAX)) out.push({rid,ci,text:`${row.name}: ${cp} pace ${fmtSec(sp.pace,0)}/mi is outside 4:00–15:00 per mile`});
  });
  return out;
}
// Edit times: every time in a race as a typeable field. On an upright phone, one checkpoint at a time (a list of
// runners, so the keyboard's up/down arrows go runner to runner); sideways and on wider screens, the full grid.
// Unsaved changes survive switching checkpoint or turning the phone. "Save all" = one batch of versions, one Undo.
const portraitPhone=()=>window.matchMedia('(max-width:640px) and (orientation:portrait)').matches;
function editTimesSheet(src,state){
  const M=srcModel(src), V=raceCalc(M), order=V.rows.map(x=>x.r); if(!order.length){ toast('No runners in this race.'); return; }
  const st=state||{ci:Math.max(0,M.checkpoints.length-1),pend:{}}; // pend: "rid|ci" -> typed text ('' = cleared)
  const cellOf=(rid,ci)=>(M.rows.find(r=>r.id===rid)||{cells:[]}).cells[ci];
  const orig=(rid,ci)=>{ const c=cellOf(rid,ci); return c?fmtMss(c.t)+(Math.round(c.t*10)%10?'':'.0'):''; };
  const val=(rid,ci)=>{ const k=rid+'|'+ci; return k in st.pend?st.pend[k]:orig(rid,ci); };
  const changed=()=>Object.keys(st.pend).filter(k=>{ const [rid,ci]=k.split('|'); const a=parseTime(st.pend[k]), c=cellOf(rid,+ci); return c?(a==null||Math.abs(a-c.t)>0.04):a!=null; });
  const field=(r,ci)=>{ const c=cellOf(r.id,ci), k=r.id+'|'+ci;
    if(c&&c.dup) return `<button type="button" class="btn et-dup" data-etdup="${r.id}:${ci}">⚠ ${fmtRace(c.t)} · choose</button>`;
    return `<input class="et-in${changed().includes(k)?' changed':''}" data-et="${r.id}|${ci}" data-tf data-tenths inputmode="numeric" autocomplete="off" value="${esc(val(r.id,ci))}" placeholder="–" aria-label="${esc(r.name)}, ${esc(M.checkpoints[ci].name)}">`; };
  const upright=portraitPhone();
  const body=upright
    ? `<div class="div-row et-cps" role="group" aria-label="Checkpoint">${M.checkpoints.map((c,i)=>`<button type="button" data-etcp="${i}" aria-pressed="${i===st.ci}">${esc(c.name)}</button>`).join('')}</div>
       <div class="et-list">${order.map(r=>`<label class="et-row"><span>${esc(r.name)}</span>${field(r,st.ci)}</label>`).join('')}</div>`
    : `<div class="tbl-wrap et-grid"><table class="race-table"><thead><tr><th>Runner</th>${M.checkpoints.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${order.map(r=>`<tr><td>${esc(r.name)}</td>${M.checkpoints.map((c,ci)=>`<td>${field(r,ci)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const n=changed().length;
  modal(`<div class="et-sheet"><h2>Edit times</h2><p class="hint">${esc(M.name||'Race')}. Type m:ss.t (18423 → 18:42.3). Clear a field to remove a time. Changed times are highlighted.</p>
    ${body}<div class="et-warn" hidden></div>
    <div class="modal-btns"><button class="btn" data-x="cancel">Cancel</button><button class="btn primary" data-x="saveall"${n?'':' disabled'}>${n?`Save all (${n})`:'No changes yet'}</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; bindTimeFields(m);
    const mq=window.matchMedia('(max-width:640px) and (orientation:portrait)'), relayout=()=>{ if(m.isConnected) editTimesSheet(src,st); else mq.removeEventListener('change',relayout); };
    mq.addEventListener('change',relayout); // turning the phone keeps every unsaved change
    const count=()=>{ const k=changed(), b=m.querySelector('[data-x=saveall]'); b.disabled=!k.length; b.textContent=k.length?`Save all (${k.length})`:'No changes yet'; };
    m.addEventListener('input',e=>{ const t=e.target; if(!t.matches('[data-et]')) return; st.pend[t.dataset.et]=t.value; t.classList.toggle('changed',changed().includes(t.dataset.et)); m.querySelector('.et-warn').hidden=true; count(); });
    m.addEventListener('click',async e=>{
      const cp=e.target.closest('[data-etcp]'); if(cp){ st.ci=+cp.dataset.etcp; editTimesSheet(src,st); return; }
      const dup=e.target.closest('[data-etdup]'); if(dup){ if(changed().length){ toast('Save all first, then choose which time counts.'); return; } const [rid,ci]=dup.dataset.etdup.split(':'); timeSheet(src,rid,+ci); return; }
      const x=e.target.closest('[data-x]'); if(!x) return;
      if(x.dataset.x==='cancel'){ if(changed().length && !(await confirmBox(`Discard ${changed().length} unsaved change${changed().length===1?'':'s'}?`,'Discard'))){ editTimesSheet(src,st); return; } mq.removeEventListener('change',relayout); close(); return; }
      if(x.dataset.x==='saveall'||x.dataset.x==='anyway'){
        const keys=changed(), vs=[], undo=[], cells=[];
        for(const k of keys){ const [rid,cis]=k.split('|'), ci=+cis, t=parseTime(st.pend[k]), live=M.marks.filter(mk=>!mk.deleted&&mk.rid===rid&&mk.ci===ci), c=cellOf(rid,ci);
          cells.push([rid,ci]);
          if(t==null){ live.forEach(mk=>{ vs.push({...stateOf(mk),deleted:true}); undo.push(stateOf(mk)); }); continue; }   // cleared: removed as versions
          const mk=c&&M.marks.find(z=>z.id===c.mid);
          if(mk){ vs.push({...stateOf(mk),t:Math.round(t*10)/10}); undo.push(stateOf(mk)); }
          else { const nv={mid:'m'+uid(),ci,rid,t:Math.round(t*10)/10,deleted:false,chosen:false}; vs.push(nv); undo.push({...nv,deleted:true}); } }
        if(!vs.length){ close(); return; }
        if(x.dataset.x==='saveall'){ const W=timeWarnings(applyToModel(M,vs),cells);
          if(W.length){ const w=m.querySelector('.et-warn'); w.hidden=false;
            w.innerHTML=`<b>${W.length} time${W.length===1?' looks':'s look'} wrong</b>${W.map(z=>`<div class="et-w">${esc(z.text)} <button type="button" class="linkish" data-etfix="${z.rid}|${z.ci}">Fix</button></div>`).join('')}<button type="button" class="btn warn" data-x="anyway">Save anyway</button>`;
            w.scrollIntoView({block:'nearest'}); return; } }
        const warned=new Set(x.dataset.x==='anyway'?timeWarnings(applyToModel(M,vs),cells).map(z=>z.rid+'|'+z.ci):[]);
        vs.forEach(v=>{ if(warned.has(v.rid+'|'+v.ci)) v.warn='saved despite a warning'; });
        applyVersions(src,vs); noteEdited(src,cells); mq.removeEventListener('change',relayout); close(); setTimeout(flashEdited,60);
        snack(`Saved ${keys.length} time${keys.length===1?'':'s'}`,'Undo',()=>{ applyVersions(src,undo); noteEdited(src,cells); setTimeout(flashEdited,60); },10000);
        return; }
    });
    m.addEventListener('click',e=>{ const f=e.target.closest('[data-etfix]'); if(!f) return; const [rid,ci]=f.dataset.etfix.split('|');
      if(portraitPhone() && +ci!==st.ci){ st.ci=+ci; editTimesSheet(src,st); setTimeout(()=>{ const i=document.querySelector(`#modal [data-et="${CSS.escape(rid+'|'+ci)}"]`); if(i){ i.focus(); i.select(); } },50); return; }
      const i=m.querySelector(`[data-et="${CSS.escape(rid+'|'+ci)}"]`); if(i){ i.focus(); i.select(); } });
  });
}
// End race: save the results, or discard the race (for every coach in a team).
function endRaceSheet(){
  const team=syncMode()==='joined', r=S.race;
  modal(`<div class="as-group"><div class="as-head"><h2>End the race?</h2><p>${team?'Save puts the results in Team history, and every coach sees the final results.':'Save keeps the results on this phone (Data tab, Races on this phone).'}</p></div>
    <button class="as-btn" data-x="save">${team?'Save to team history':'Save results'}</button><button class="as-btn destructive" data-x="discard">Discard</button></div>
    <div class="as-group"><button class="as-btn as-cancel" data-x="no">Keep racing</button></div>`,(m,close)=>{ // 3.0: an action sheet
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=save]').onclick=()=>{ close(); if(S.race!==r) return; r.status='done';
      const h=raceHistory(r), tid=team?SYNC.saveHistory(h):null, lid=logRace(h,!!tid);
      r.saved=tid?{where:'team',id:tid}:{where:'local',id:lid}; save(); // later corrections go to the saved copy
      wxEnded(r); // 3.2: the race's weather is filled in once it's over
      renderRace(); applyWake(); updateRaceBanner(); toast(team?'Race saved to Team history':'Race saved on this phone');
    }; // 2.10: no "Update PRs?" offer: PRs come from results
    m.querySelector('[data-x=discard]').onclick=()=>{ close(); discardRace(r,false); };
  },'action');
}
// Saved races stay on this phone too (goals from history work offline; a phone that joins a team later can upload them).
function logRace(h,uploaded){
  const old=raceLog().find(x=>x.race&&x.race.raceId===h.race.raceId), id=old?old.id:uid();
  logPut({id,date:h.date,savedAtMs:h.savedAtMs,race:h.race,edits:old?old.edits||[]:(h.edits||[]).slice(),uploaded:!!uploaded});
  return id;
}
// A cleared PR stays in the list marked deleted (2.6), and its value goes to Recently deleted.
function setPR(id,dist,t){
  if(!S.prs) S.prs={};
  const all=S.prs[id]||[], cur=all.find(p=>sameDist(p.dist,dist)&&!p.deleted);
  if(!(t>0)){ if(!cur) return null; Object.assign(cur,{deleted:true,deletedAt:Date.now(),deletedBy:myId()});
    const a=S.roster.find(x=>x.id===id); save();
    return trashPut({kind:'pr',id:id+'@'+Math.round(dist),label:`${a?a.name:'Runner'}, ${distLabel(dist)} ${fmtSec(cur.t,1)}`,item:{...cur},extra:{athleteId:id,dist}}); }
  const L=all.filter(p=>!(sameDist(p.dist,dist)&&!p.deleted)); // replaced value: earlier deleted ones stay in the list
  L.push({dist:Math.round(dist*100)/100,t:Math.round(t*10)/10});
  L.sort((a,b)=>a.dist-b.dist); S.prs[id]=L; save(); return null;
}
// "Saved to team ✓" / "Offline, saving when connected" (team mode, from sync.js).
function raceSaveText(){
  if(syncMode()!=='joined') return '';
  return {saved:'Saved to team ✓',saving:'Saving to team…',offline:'Offline, saving when connected'}[syncInfo.race]||'';
}
// Discard: instant, with Undo. The race and every mark are kept (status 'discarded') and Recently deleted restores it.
function discardRace(r,setup){
  if(S.race!==r) return;
  const team=!!(SYNC && syncMode()==='joined');
  const key=trashPut({kind:'race',id:r.id,label:r.name||(setup?'Race setup':'Race'),item:JSON.parse(JSON.stringify(r)),extra:{team,from:r.status},synced:false});
  if(team) SYNC.discardRace(r.id,r.status);
  S.race=null; selMark=null; save(); showTab('watches');
  removedSnack(team?'Race discarded for every coach':'Race discarded',key,()=>{ if(S.race) showTab('race'); });
}
// Asked once, the first time the race screen opens in a team. Editable in Settings.
function askCoachName(){
  if(S.settings.coachName || S.settings.coachAsked || syncMode()!=='joined') return;
  S.settings.coachAsked=true; save();
  modal(`<h2>Your name</h2><p>Other coaches see it next to the times you record, like “✓ 18:42 · Coach Jen”. You can change it in Settings.</p>
    <label class="field">Your name<input id="coachName" maxlength="30" autocomplete="off" autocapitalize="words" placeholder="e.g. Coach Jen"></label>
    <div class="modal-btns"><button class="btn" data-x="no">Skip</button><button class="btn primary" data-x="yes">Save</button></div>`,(m,close)=>{
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ S.settings.coachName=m.querySelector('#coachName').value.trim().slice(0,30); save(); close(); };
  });
}
function nope(b){ b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); buzz(12); setTimeout(()=>b.classList.remove('nope'),400); }

const raceView=$('#v-race');
raceView.addEventListener('click',e=>{ const g=e.target.closest('[data-wxgeo]'); if(!g) return; const on=!S.settings.raceGeo; S.settings.raceGeo=on; g.setAttribute('aria-checked',String(on)); save(); // 3.2: asks for permission now, not at the gun
  if(on&&navigator.geolocation) navigator.geolocation.getCurrentPosition(()=>toast('Location allowed: it’s saved at the gun'),()=>{ toast('Location not allowed: the course location is used instead'); },{timeout:15000,maximumAge:10*60e3}); });
raceView.addEventListener('click',async e=>{
  const r=S.race; if(!r) return; const t=e.target;
  const tgb=t.closest('[data-rtag]'); if(tgb){ tagSheet(raceSrc(r),tgb.dataset.rtag||null); return; }
  const a=t.closest('[data-ra]');
  if(a){ const act=a.dataset.ra;
    if(act==='gun'){ if(!r.runners.length) return; if(!manualOrder.has(r.id)) sortByGoal(r); stampBests(r); // the order is fixed from here on
      r.gun={local:Date.now(),off:CLOCK.off,by:DEVICE}; r.status='running'; buzz([60]); audioInit(); beep(988,0.25); save(); renderRace(); applyWake(); updateRaceBanner();
      if(SYNC && syncMode()==='joined') SYNC.measureClock();
      setTimeout(()=>wxGun(r),0); // 3.2: weather for this race (never waited for)
      raceReady=false;
      snack('Gun! Clock running','Undo gun',()=>{ wxUngun(r); r.gun=null; r.status='setup'; raceReady=true; save(); renderRace(); applyWake(); updateRaceBanner(); },10000); } // Undo gun: back to the Ready screen
    if(act==='restart'){ const prev=r.gun; r.gun={local:Date.now(),off:CLOCK.off,by:DEVICE}; buzz([60]); save(); renderRace();
      snack('Clock restarted from now','Undo',()=>{ r.gun=prev; save(); renderRace(); },10000); }
    if(act==='mark'){ try{ localStorage.setItem(MARK_HINT,'1'); }catch(err){} addMark(null); }
    if(act==='tidy'){ const cp=curCp(), k=r.id+':'+cp.id, h=tidied[k]||(tidied[k]=new Set()); r.runners.forEach(x=>{ if(recAt(r,x.id,cp.id)) h.add(x.id); }); renderRace(); }
    if(act==='showall'){ delete tidied[r.id+':'+curCp().id]; renderRace(); }
    if(act==='end') endRaceSheet();
    if(act==='new'){ S.race=null; startNewRace(); }
    if(act==='discard') discardRace(r,true);
    if(act==='sortgoal'){ manualOrder.delete(r.id); sortByGoal(r); save(); renderRace(); }
    if(act==='editcp') cpSheet();
    if(act==='edittimes'){ if(!r.gun){ toast('Times start at the gun.'); return; } editTimesSheet(raceSrc(r)); }
    if(act==='meets') meetsSheet();
    if(act==='backsetup'){ raceReady=false; renderRace(); }
    if(act==='savecourse') saveCourse(r);
    if(act==='delcourse'){ const c=(S.courses||[]).find(x=>x.id===r.courseId); if(c){ const key=trashPut({kind:'course',id:c.id,label:c.name,item:JSON.parse(JSON.stringify(c))});
      S.courses=S.courses.filter(x=>x!==c); r.courseId=null; save(); renderRace(); removedSnack(`Deleted the course “${c.name}”. This race keeps its checkpoints`,key); } }
    if(act==='copy'){ const txt=raceText(srcModel(raceSrc(r))); try{ await navigator.clipboard.writeText(txt); toast('Results copied'); }catch(err){ modal(`<h2>Results</h2><textarea readonly>${esc(txt)}</textarea><div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div>`,(m,close)=>{ m.querySelector('[data-x=no]').onclick=close; }); } }
    if(act==='csv'){ await shareFile(new File([raceCSV(srcModel(raceSrc(r)))],`race-${(r.name||'results').replace(/[^\w-]+/g,'-').toLowerCase()}-${localDate(new Date())}.csv`,{type:'text/csv'}),'Race results'); }
    return; }
  const at=t.closest('[data-at]'); if(at){ if(at.dataset.at!==curCp().id){ S.settings.raceCp=at.dataset.at; selMark=null; save(); renderRace(); } return; }
  const um=t.closest('[data-um]'); if(um){ selMark=selMark===um.dataset.um?null:um.dataset.um; patchRace(); return; }
  const rn=t.closest('[data-rn]');
  if(rn){ const id=rn.dataset.rn, now=Date.now();
    if(lpFired) return;                                                         // that was a press and hold
    if(now<gridGuard || now<(btnGuard[id]||0)){ nope(rn); return; }             // the grid just changed: tap again
    if(recAt(r,id,curCp().id)){ toast('Already recorded. Press and hold to remove it.'); return; }
    if(selMark){ const m=r.marks.find(x=>x.id===selMark); selMark=null; if(m){ markChange(m,{runnerId:id}); localTouch.add(id); save(); renderRace(); const who=r.runners.find(x=>x.id===id).name;
      snack(`${who}, ${fmtRace(raceSecs(r,m))} at ${curCp().name}`,'Undo',()=>{ markChange(m,{runnerId:null}); localTouch.add(id); save(); renderRace(); }); } return; }
    addMark(id); return; }
  const rc=t.closest('[data-rc]'); if(rc){ const [ri,ci]=rc.dataset.rc.split(':').map(Number), src=raceSrc(r), M=srcModel(src); if(M.rows[ri]) timeSheet(src,M.rows[ri].id,ci); return; }
  // setup
  const dv=t.closest('[data-div]'); if(dv){ await applyDivision(r,dv.dataset.div); save(); renderRace(); return; }
  const cb=t.closest('[data-cols]'); if(cb){ S.settings.raceCols=+cb.dataset.cols; save(); renderRace(); return; }
  const rr=t.closest('[data-rr]');
  if(rr){ const a2=S.roster.find(x=>x.id===rr.dataset.rr); if(!a2) return;
    if(r.runners.some(x=>x.id===a2.id)) r.runners=r.runners.filter(x=>x.id!==a2.id); else { r.runners.push({id:a2.id,name:a2.name,group:grpOf(a2),goal:null}); await fillGoals(r,[a2.id]); if(!manualOrder.has(r.id)) sortByGoal(r); }
    save(); renderRace(); return; }
  const rg=t.closest('[data-rg]');
  const pk=e.target.closest('[data-pk]');
  if(pk&&r&&r.status==='setup'){ const k=pk.dataset.pk, people=S.roster.filter(x=>x.name.trim()), want=k==='clear'?[]:pickIds(k,people,null), keep=r.runners.filter(x=>want.includes(x.id));
    const add=people.filter(a=>want.includes(a.id)&&!keep.some(y=>y.id===a.id)); r.runners=[...keep,...add.map(x=>({id:x.id,name:x.name,group:grpOf(x),goal:null}))];
    if(add.length) await fillGoals(r,add.map(x=>x.id)); if(!manualOrder.has(r.id)) sortByGoal(r); save(); renderRace(); return; }
  if(rg){ const as=genderSecs(S.roster.filter(x=>x.name.trim()))[+rg.dataset.rg][1], all=as.every(x=>r.runners.some(y=>y.id===x.id));
    if(all) r.runners=r.runners.filter(x=>!as.some(y=>y.id===x.id)); else { const add=as.filter(x=>!r.runners.some(y=>y.id===x.id)); add.forEach(x=>r.runners.push({id:x.id,name:x.name,group:grpOf(x),goal:null})); await fillGoals(r,add.map(x=>x.id)); if(!manualOrder.has(r.id)) sortByGoal(r); }
    save(); renderRace(); return; }
});
// Press and hold (recorded name buttons) and drag to reorder (setup), both from pointerdown.
// When a hold opens the confirm, the click that follows lifting the finger would land on the sheet's backdrop
// and close it: swallow that one click.
let lpTimer=null, lpFired=false, swallowUntil=0;
window.addEventListener('click',e=>{ if(Date.now()<swallowUntil){ swallowUntil=0; e.stopPropagation(); e.preventDefault(); } },true);
raceView.addEventListener('pointerdown',e=>{
  const rec=e.target.closest('#raceGrid [data-rn].rec');
  if(rec){ clearTimeout(lpTimer); lpFired=false;
    const end=()=>{ clearTimeout(lpTimer); window.removeEventListener('pointerup',end); window.removeEventListener('pointercancel',end);
      if(lpFired){ swallowUntil=Date.now()+700; setTimeout(()=>{ lpFired=false; },700); } };
    window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
    lpTimer=setTimeout(()=>{ lpFired=true; swallowUntil=Date.now()+60000; removeTime(rec.dataset.rn); },600);
    return; }
  const h=e.target.closest('.ord-row .drag'); if(!h) return;
  e.preventDefault();
  const row=h.closest('.ord-row'), list=row.parentElement; row.classList.add('dragging');
  const move=ev=>{ if(ev.clientY<90) window.scrollBy(0,-14); else if(ev.clientY>window.innerHeight-90) window.scrollBy(0,14); // long lists
    let before=null; for(const x of list.children){ if(x===row) continue; const bx=x.getBoundingClientRect(); if(ev.clientY<bx.top+bx.height/2){ before=x; break; } }
    if(before!==row.nextElementSibling && before!==row) list.insertBefore(row,before); };
  const up=()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); row.classList.remove('dragging');
    const r=S.race; if(!r) return; const ids=[...list.children].map(x=>x.dataset.oid);
    if(ids.join()!==r.runners.map(x=>x.id).join()){ r.runners.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)); manualOrder.add(r.id); save(); } };
  window.addEventListener('pointermove',move); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
});
raceView.addEventListener('contextmenu',e=>{ if(e.target.closest('#raceGrid')) e.preventDefault(); });
raceView.addEventListener('toggle',e=>{ if(e.target.classList&&e.target.classList.contains('race-res')){ raceResOpen=e.target.open; lastRes=''; } },true);
bindTimeFields(raceView);
let goalsDirty=false;
raceView.addEventListener('input',e=>{
  const r=S.race, t=e.target; if(!r) return;
  if(t.matches('[data-rname]')){ r.name=t.value.slice(0,60); r.nameAuto=null; $('#raceName').textContent=r.name||'Race'; save(); }
  if(t.matches('[data-goal]')){ const x=r.runners.find(y=>y.id===t.dataset.goal); if(x){ x.goal=parseTime(t.value)||null; x.goalTag=x.goal?'Custom':null; goalsDirty=true; save(); } }
});
// Re-sort by goal only after leaving the goal list, so tapping from goal to goal keeps the keyboard up.
raceView.addEventListener('focusout',e=>{
  const list=$('#ordList'); if(!goalsDirty || !list || (e.relatedTarget && list.contains(e.relatedTarget))) return;
  goalsDirty=false; const r=S.race; if(!r || r.status!=='setup' || manualOrder.has(r.id)) return;
  const before=r.runners.map(x=>x.id).join(); sortByGoal(r);
  if(r.runners.map(x=>x.id).join()!==before){ save(); setTimeout(()=>{ if(S.race===r && r.status==='setup' && list.isConnected) list.innerHTML=ordRows(r); },0); } // only the list: focus elsewhere stays put
});
raceView.addEventListener('change',async e=>{
  const r=S.race, t=e.target; if(!r||r.status!=='setup') return;
  if(t.matches('[data-course]')){ const c=(S.courses||[]).find(x=>x.id===t.value);
    if(c){ r.checkpoints=c.checkpoints.map(x=>({id:uid(),name:x.name,dist:x.dist||null,unit:x.unit||'mi'})); r.courseId=c.id; S.settings.raceCp=null; } else r.courseId=null;
    if(r.goalSrc==='course'){ if(r.courseId) await fillGoals(r); else { r.goalSrc='custom'; goalNote=''; } if(!manualOrder.has(r.id)) sortByGoal(r); }
    save(); renderRace(); }
  if(t.matches('[data-meet]')){ applyMeet(r,meetOf(t.value)); meetNote=''; if(r.runners.length) await fillGoals(r); save(); renderRace(); return; }
  if(t.matches('[data-goalsrc]')){ r.goalSrc=t.value; await fillGoals(r); if(!manualOrder.has(r.id)) sortByGoal(r); save(); renderRace(); }
});
bindDistFields(raceView);
bindCpEditor(raceView,()=>renderRace());
// Save this race's checkpoints as a named course (synced to the team), or update the one it came from.
function saveCourse(r){
  const cur=(S.courses||[]).find(c=>c.id===r.courseId);
  modal(`<div class="course-sheet"><h2>${cur?'Update course':'Save as course'}</h2><p>Saves these ${r.checkpoints.length} checkpoints and their distances, so you can pick the course next time.</p>
    <label class="field">Course name<input id="courseName" maxlength="40" value="${esc(cur?cur.name:r.name)}" placeholder="e.g. Heritage Park 5K" autocomplete="off" autocapitalize="words"></label>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Save course</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ const name=m.querySelector('#courseName').value.trim().slice(0,40); if(!name){ m.querySelector('#courseName').focus(); return; }
      if(!S.courses) S.courses=[];
      const c=cur&&cur.name.toLowerCase()===name.toLowerCase()?cur:(S.courses.find(x=>x.name.toLowerCase()===name.toLowerCase())||cur&&Object.assign(cur,{name})||null);
      const cps=r.checkpoints.map(x=>({id:x.id,name:x.name,dist:x.dist||null,unit:x.unit||'mi'}));
      if(c){ c.name=name; c.checkpoints=cps; r.courseId=c.id; } else { const n={id:uid(),name,checkpoints:cps}; S.courses.push(n); r.courseId=n.id; }
      save(); close(); renderRace(); toast(`Course “${name}” saved`); };
  });
}

/* ---------- meets, seasons and goals from history (2.7) ---------- */
// Course (a place with checkpoints) -> Meet (a dated event at a course, in a series that links the years, like
// "Kiel Invite") -> Race (one division of a meet). Year-to-year matches use the series id and course id, never
// typed names. A season runs August 1 to July 31 (season 2026 = Aug 1 2026 to Jul 31 2027).
// 2.13: no Varsity/JV anywhere. A race is Girls, Boys or Both. The stored codes stay as they were (the rules and older
// versions know GV/BV/GJV/BJV/OPEN), so Girls is saved as GV, Boys as BV, Both as OPEN; a JV code reads as its gender.
const DIVS=[['GV','Girls'],['BV','Boys'],['OPEN','Both']];
const gkey=d=>/^G/.test(d||'')?'G':/^B/.test(d||'')?'B':'';
const divName=d=>d==='OPEN'?'Both':gkey(d)==='G'?'Girls':gkey(d)==='B'?'Boys':'';
const divsOf=()=>['GV','BV','OPEN'];
const dayMs=s=>s?Date.parse(s+'T12:00'):NaN;
const seasonOf=t=>{ const d=new Date(t); return d.getMonth()>=7?d.getFullYear():d.getFullYear()-1; };
const seasonLabel=y=>String(y); // the fall year: Aug 1 to Jul 31 (2.11.1)
const fmtDay=s=>s?new Date(dayMs(s)).toLocaleDateString([], {weekday:'short',month:'numeric',day:'numeric'}):'Date not set';
const meetOf=id=>(S.meets||[]).find(m=>m.id===id)||null;
const seriesName=id=>((S.series||[]).find(x=>x.id===id)||{}).name||'Meet';
const courseNameOf=id=>((S.courses||[]).find(x=>x.id===id)||{}).name||'';
const meetSeason=m=>m.date?seasonOf(dayMs(m.date)):(m.season||seasonOf(Date.now()));
const meetLabel=m=>`${seriesName(m.seriesId)} · ${fmtDay(m.date)}`;
function defaultMeet(){ // today's meet, else the next one this season (never one from another season)
  const today=localDate(new Date()), y=seasonOf(Date.now()), L=(S.meets||[]).filter(m=>m.date).sort((a,b)=>a.date.localeCompare(b.date));
  return L.find(m=>m.date===today)||L.find(m=>m.date>today&&meetSeason(m)===y)||null; }
const GOAL_TAG={sb:'SB',pr:'PR',last:'Last',course:'Course',meet:'Meet'};

// A meet picked in race setup: its course and checkpoints load (everything can still be changed).
function applyMeet(r,m){
  r.meetId=m?m.id:null; r.division='';
  if(m && m.courseId){ const c=(S.courses||[]).find(x=>x.id===m.courseId);
    if(c){ r.courseId=c.id; if((c.checkpoints||[]).length){ r.checkpoints=c.checkpoints.map(x=>({id:uid(),name:x.name,dist:x.dist||null,unit:x.unit||'mi'})); S.settings.raceCp=null; } } }
  raceAutoName(r);
}
function raceAutoName(r){ // the race name follows the meet and Girls/Boys until the coach types one (renamed in 2.13: it shared a name with the stopwatch autoName(list), which it replaced, so stopwatches got no name)
  const m=meetOf(r.meetId), want=m?`${seriesName(m.seriesId)}${r.division?', '+divName(r.division):''}`:'';
  if(!r.name || r.name===r.nameAuto){ r.name=want; r.nameAuto=want; }
}
// Who ran this division at the last meet (still on the roster); for a first race in a division, the runners
// marked Girls or Boys on the Team tab. Open preselects no one.
function preselectFor(r){
  const d=r.division; if(!d||d==='OPEN') return {ids:[],from:''};
  const last=pastRaces().filter(p=>gkey(p.M.division)===gkey(d)).sort((a,b)=>b.at-a.at)[0];
  if(last) return {ids:last.M.rows.map(x=>x.id).filter(id=>S.roster.some(a=>a.id===id)),from:'last'};
  return {ids:S.roster.filter(a=>a.gender===d[0]).map(a=>a.id),from:'gender'};
}
let meetNote='';
async function applyDivision(r,d){
  r.division=d; raceAutoName(r); meetNote='';
  if(!r.runners.length){
    if(SYNC && syncMode()==='joined') await loadTeamRaces();
    const p=preselectFor(r);
    p.ids.forEach(id=>{ const a=S.roster.find(y=>y.id===id); if(a) r.runners.push({id,name:a.name,group:grpOf(a),goal:null}); });
    meetNote=p.ids.length?(p.from==='last'?`Picked the ${p.ids.length} runner${p.ids.length===1?'':'s'} who ran ${divName(d)} at the last meet.`:`Picked the ${p.ids.length} ${d[0]==='G'?'girls':'boys'} on the Team tab (first ${divName(d)} race).`)
      :(d==='OPEN'?'':d[0]==='G'||d[0]==='B'?`No one picked yet: mark runners Girls or Boys on the Team tab, or tap names below.`:'');
  }
  await fillGoals(r); if(!manualOrder.has(r.id)) sortByGoal(r);
}

// Meets screen (Settings > Meets, or Meets in race setup).
function meetsSheet(){
  const by={}; (S.meets||[]).forEach(m=>{ const y=meetSeason(m); (by[y]||(by[y]=[])).push(m); });
  const years=Object.keys(by).map(Number).sort((a,b)=>b-a), hasSeed=(S.meets||[]).some(m=>m.id.startsWith('m26-'))||(S.meets||[]).some(m=>meetSeason(m)===2026);
  const unlinked=linkCandidates().length;
  modal(`<div class="meets-sheet"><h2>Meets</h2>
    ${years.length?years.map(y=>`<h3>${seasonLabel(y)} season</h3>${by[y].sort((a,b)=>(a.date||'9').localeCompare(b.date||'9')).map(m=>`<button type="button" class="menu-item meet-row" data-meet-ed="${m.id}"><span><b>${esc(seriesName(m.seriesId))}</b> · ${esc(fmtDay(m.date))}${m.time?' · '+esc(m.time):''}</span><small>${esc(courseNameOf(m.courseId)||'No course')} · ${esc((m.levels||[]).join('/')||'—')}${m.kind?' · '+esc(m.kind):''}</small></button>`).join('')}`).join(''):'<p>No meets yet.</p>'}
    <div class="btn-row"><button class="btn" data-mx="add">+ Add a meet</button>${years.length?'<button class="btn" data-mx="season">Start a new season</button>':''}</div>
    ${hasSeed?'':'<button class="btn primary" data-mx="seed">Load the 2026 schedule</button>'}
    ${unlinked?`<button class="btn" data-mx="link">Link past races (${unlinked})</button>`:''}
    <div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=()=>{ close(); if(curTab==='race'&&S.race) renderRace(); };
    m.addEventListener('click',async e=>{
      const ed=e.target.closest('[data-meet-ed]'); if(ed){ meetEditSheet(meetOf(ed.dataset.meetEd)); return; }
      const b=e.target.closest('[data-mx]'); if(!b) return;
      if(b.dataset.mx==='add') meetEditSheet(null);
      if(b.dataset.mx==='seed'){ const n=seed2026(); save(); meetsSheet(); toast(`Loaded the 2026 schedule: ${n} meets`); }
      if(b.dataset.mx==='season') newSeason();
      if(b.dataset.mx==='link') linkSheet();
    });
  });
}
function meetEditSheet(mt){
  const isNew=!mt, m=mt?JSON.parse(JSON.stringify(mt)):{id:'m'+uid(),seriesId:'',courseId:'',date:'',time:'',kind:'Invite',levels:['JV','V'],season:seasonOf(Date.now())};
  const series=[...(S.series||[])].sort((a,b)=>a.name.localeCompare(b.name)), courses=[...(S.courses||[])].sort((a,b)=>a.name.localeCompare(b.name));
  modal(`<div class="meet-edit"><h2>${isNew?'Add a meet':'Edit meet'}</h2>
    <label class="field">Series (links this meet across years)<select data-me="series"><option value="">Choose…</option>${series.map(x=>`<option value="${x.id}"${x.id===m.seriesId?' selected':''}>${esc(x.name)}</option>`).join('')}<option value="__new">New series…</option></select></label>
    <label class="field me-new-series" hidden>New series name<input data-me="seriesName" maxlength="40" placeholder="e.g. Kiel Invite" autocapitalize="words"></label>
    ${m.seriesId?`<label class="field">Rename this series (every year follows)<input data-me="rename" maxlength="40" value="${esc(seriesName(m.seriesId))}" autocapitalize="words"></label>`:''}
    <label class="field">Course<select data-me="course"><option value="">No course</option>${courses.map(x=>`<option value="${x.id}"${x.id===m.courseId?' selected':''}>${esc(x.name)}</option>`).join('')}<option value="__new">New course…</option></select></label>
    <label class="field me-new-course" hidden>New course name<input data-me="courseName" maxlength="40" placeholder="e.g. Kiel HS" autocapitalize="words"></label>
    <label class="field">Date<input type="date" data-me="date" value="${esc(m.date)}"></label>
    <label class="field">Time<input data-me="time" maxlength="12" value="${esc(m.time)}" placeholder="e.g. 4:00 PM, or blank for TBA"></label>
    <label class="field">Kind<input data-me="kind" maxlength="30" value="${esc(m.kind)}" list="meetKinds"><datalist id="meetKinds"><option value="Invite"><option value="Meet"><option value="Dual"><option value="NEC Conference"><option value="WIAA Sectionals"><option value="WIAA State Meet"></datalist></label>
    <p class="form-err" id="meErr" hidden></p>
    <div class="modal-btns">${isNew?'':'<button class="btn warn" data-x="del">Delete</button>'}<button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Save</button></div></div>`,(box,close)=>{
    const f=box.firstElementChild, q=k=>f.querySelector(`[data-me="${k}"]`);
    q('series').onchange=()=>{ f.querySelector('.me-new-series').hidden=q('series').value!=='__new'; };
    q('course').onchange=()=>{ f.querySelector('.me-new-course').hidden=q('course').value!=='__new'; };
    f.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true')));
    f.querySelector('[data-x=no]').onclick=()=>meetsSheet();
    const del=f.querySelector('[data-x=del]');
    if(del) del.onclick=()=>{ const key=trashPut({kind:'meet',id:mt.id,label:meetLabel(mt),item:JSON.parse(JSON.stringify(mt))}); S.meets=S.meets.filter(x=>x.id!==mt.id); save(); meetsSheet(); removedSnack(`Deleted ${meetLabel(mt)}`,key,()=>{ if(!$('#overlay').hidden&&document.querySelector('#modal .meets-sheet')) meetsSheet(); }); };
    f.querySelector('[data-x=yes]').onclick=()=>{
      const err=f.querySelector('#meErr'), fail=t=>{ err.textContent=t; err.hidden=false; };
      let sid=q('series').value;
      if(sid==='__new'){ const n=q('seriesName').value.trim().slice(0,40); if(!n) return fail('Name the new series.');
        const ex=(S.series||[]).find(x=>x.name.toLowerCase()===n.toLowerCase()); sid=ex?ex.id:'s'+uid(); if(!ex) S.series.push({id:sid,name:n}); }
      if(!sid) return fail('Choose a series (or New series…).');
      const rn=q('rename'); if(rn && sid===m.seriesId){ const n=rn.value.trim().slice(0,40); const s=S.series.find(x=>x.id===sid); if(n&&s) s.name=n; }
      let cid=q('course').value;
      if(cid==='__new'){ const n=q('courseName').value.trim().slice(0,40); if(!n) return fail('Name the new course.'); cid=newCourse(n); }
      m.seriesId=sid; m.courseId=cid||''; m.date=q('date').value||''; m.time=q('time').value.trim().slice(0,12); m.kind=q('kind').value.trim().slice(0,30);
      if(!(m.levels||[]).length) m.levels=['JV','V']; // 2.13: levels aren't shown; kept for older versions
      if(m.date) m.season=seasonOf(dayMs(m.date));
      if(isNew) S.meets.push(m); else Object.assign(mt,m);
      save(); meetsSheet(); toast(isNew?'Meet added':'Meet saved');
    };
  });
}
// A course for a new place: the usual Mile 1, Mile 2 and Finish (5K) until edited in race setup.
function newCourse(name,id){
  const ex=(S.courses||[]).find(c=>c.name.toLowerCase()===name.toLowerCase()); if(ex) return ex.id;
  const c={id:id||'c'+uid(),name,checkpoints:[{id:uid(),name:'Mile 1',dist:MILE,unit:'mi'},{id:uid(),name:'Mile 2',dist:2*MILE,unit:'mi'},{id:uid(),name:'Finish',dist:5000,unit:'m'}]};
  S.courses.push(c); return c.id;
}
// The 2026 schedule (Boys and Girls). Fixed ids, so two coaches loading it at once still get one schedule.
const SEED_2026=[
  ['2026-08-28','8:30 AM','Invite',['JV','V'],'Winagamie GC','Winagamie Invite'],
  ['2026-09-03','4:00 PM','Invite',['JV','V'],'Kiel HS','Kiel Invite'],
  ['2026-09-11','7:45 PM','Meet',['V'],'Winagamie GC','Winagamie Meet'],
  ['2026-09-19','8:00 AM','Invite',['JV','V'],'Smiley / Wausau East','Wausau East Invite'],
  ['2026-09-24','4:30 PM','Invite',['JV','V'],'Mishicot','Mishicot Invite'],
  ['2026-10-01','5:00 PM','Invite',['V'],'Waupaca','Waupaca Invite'],
  ['2026-10-08','4:00 PM','Invite',['JV'],'Brillion / Deer Run GC','Brillion Invite'],
  ['2026-10-10','','Invite',['V'],'Albany - Madison','Albany Invite'],
  ['2026-10-16','3:30 PM','NEC Conference',['JV','V'],'UWGB','NEC Conference'],
  ['2026-10-23','3:30 PM','WIAA Sectionals',['V'],'Two Rivers','WIAA Sectional'],
  ['2026-10-31','','WIAA State Meet',['V'],'Wisconsin Rapids','WIAA State']];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function seed2026(){
  let n=0;
  SEED_2026.forEach(([date,time,kind,levels,course,series])=>{
    const cid=newCourse(course,'c-'+slug(course));
    const sid='s-'+slug(series), nm=(SERIES_RENAME[sid]||[0,series])[1]; // 2.7 ids, official names (2.9.0)
    let s=(S.series||[]).find(x=>x.id===sid)||(S.series||[]).find(x=>x.name.toLowerCase()===nm.toLowerCase()||x.name.toLowerCase()===series.toLowerCase()); if(!s){ s={id:sid,name:nm}; S.series.push(s); }
    const id='m26-'+date+'-'+slug(series); if((S.meets||[]).some(m=>m.id===id)) return;
    S.meets.push({id,seriesId:s.id,courseId:cid,date,time,kind,levels,season:2026}); n++;
  });
  return n;
}
async function newSeason(){
  const Y=Math.max(...(S.meets||[]).map(meetSeason)), from=S.meets.filter(m=>meetSeason(m)===Y), have=new Set(S.meets.filter(m=>meetSeason(m)===Y+1).map(m=>m.seriesId));
  const L=from.filter(m=>!have.has(m.seriesId));
  if(!L.length){ toast(`The ${seasonLabel(Y+1)} season already has these meets.`); return; }
  if(!(await confirmBox(`Start the ${seasonLabel(Y+1)} season?`,'Start season',`Copies ${L.length} meet${L.length===1?'':'s'} from ${seasonLabel(Y)} with the same series, course and levels. Dates are left blank for you to fill in.`))) { meetsSheet(); return; }
  await takeSnapshot(`Before starting the ${seasonLabel(Y+1)} season`);
  L.forEach(m=>S.meets.push({id:'m'+uid(),seriesId:m.seriesId,courseId:m.courseId,date:'',time:m.time,kind:m.kind,levels:[...m.levels],season:Y+1}));
  save(); meetsSheet(); toast(`${seasonLabel(Y+1)} season started: fill in the dates`);
}
// Link past races (one time): each saved race without a meet, with a suggested meet by date.
function linkCandidates(){
  const out=[], seen=new Set();
  [...teamHistory.filter(h=>h.kind==='race').map(h=>({h,where:'team'})),...raceLog().map(h=>({h,where:'local'}))].forEach(x=>{ if(x.h.deleted||!x.h.race) return;
    const M=modelOf(x.h); if(!M||M.meetId) return; const k=M.raceId||x.h.id; if(seen.has(k)) return; seen.add(k); out.push({...x,M}); });
  return out;
}
const linkSkipped=new Set();
function linkSheet(){
  const L=linkCandidates().filter(x=>!linkSkipped.has(x.h.id)), meets=[...(S.meets||[])].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const suggest=x=>{ const t=dayMs(x.h.date); return meets.find(m=>m.date===x.h.date)||meets.find(m=>m.date&&Math.abs(dayMs(m.date)-t)<=864e5+1)||null; };
  const guessDiv=x=>{ const n=(x.M.name||'').toLowerCase(), g=/girl/.test(n)?'G':/boy/.test(n)?'B':'', j=/\bjv\b/.test(n); return g?g+(j?'JV':'V'):''; };
  modal(`<div class="link-sheet"><h2>Link past races</h2><p class="hint">Pick the meet each saved race belongs to, so “Last year at this meet” can find it. Suggested by date.</p>
    ${L.length?L.map((x,i)=>{ const s=suggest(x), g=guessDiv(x); return `<div class="link-row" data-li="${i}"><b>${esc(x.M.name||'Race')}</b><span class="hint">${esc(fmtDay(x.h.date))} · ${(x.M.rows||[]).length} runners</span>
      <select data-lm aria-label="Meet"><option value="">Choose a meet…</option>${meets.map(m=>`<option value="${m.id}"${s&&s.id===m.id?' selected':''}>${esc(meetLabel(m))}</option>`).join('')}</select>
      <select data-ld aria-label="Division"><option value="">Division…</option>${DIVS.map(([d,l])=>`<option value="${d}"${d===g?' selected':''}>${l}</option>`).join('')}</select>
      <div class="race-actions"><button class="btn" data-lk="skip">Skip</button><button class="btn primary" data-lk="link">Link</button></div></div>`; }).join(''):'<p>Every saved race is linked to a meet.</p>'}
    <div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div></div>`,(box,close)=>{
    const f=box.firstElementChild; f.querySelector('[data-x=no]').onclick=()=>meetsSheet();
    f.addEventListener('click',e=>{ const b=e.target.closest('[data-lk]'); if(!b) return; const row=b.closest('[data-li]'), x=L[+row.dataset.li];
      if(b.dataset.lk==='skip'){ linkSkipped.add(x.h.id); linkSheet(); return; }
      const mt=meetOf(row.querySelector('[data-lm]').value), d=row.querySelector('[data-ld]').value;
      if(!mt||!d){ toast('Pick the meet and the division'); return; }
      const v={op:'link',meetId:mt.id,seriesId:mt.seriesId,division:d,courseId:mt.courseId||null,uid:myId(),dev:DEVICE,byName:S.settings.coachName||'',at:Date.now()};
      x.h.edits=[...(x.h.edits||[]),v]; // append-only, like a correction (Undo below adds an "unlink")
      if(x.where==='team'){ if(SYNC) SYNC.appendHistoryEdits(x.h.id,[v]); } else logPut(x.h);
      linkSheet(); snack(`Linked to ${meetLabel(mt)}, ${divName(d)}`,'Undo',()=>{ const u={...v,meetId:null,seriesId:null,division:'',courseId:null,at:Date.now()};
        x.h.edits=[...x.h.edits,u]; if(x.where==='team'){ if(SYNC) SYNC.appendHistoryEdits(x.h.id,[u]); } else logPut(x.h); if(document.querySelector('#modal .link-sheet')) linkSheet(); },8000);
    });
  });
}

/* ---------- recently deleted (2.6) ---------- */
// Restores one trash entry. quiet: called from an Undo toast (no extra toast).
function trashRestore(key,quiet){
  const e=TRASH.find(x=>x.key===key); if(!e) return false;
  const ok=restoreKind(e); if(ok===false) return false;
  trashTake(key); save();
  if(!quiet) toast(`Restored ${e.label}`);
  refreshAll(); return true;
}
function refreshAll(){ setTimeout(updateHealthBadge,0); // Data health badge (2.11.1)
  if(curTab==='watches') renderGrid(); if(curTab==='team') renderTeam(); if(curTab==='workouts'){ renderWkList(); renderEditor(); }
  if(curTab==='results') renderResults(); if(curTab==='race'&&S.race) renderRace(); updateToolbar(); updateRaceBanner();
}
function restoreKind(e){
  const it=e.item, x=e.extra||{};
  switch(e.kind){
    case 'athlete': if(!S.roster.some(a=>a.id===it.id)) S.roster.push(it); refreshIdle(); return true;
    case 'workout': if(!S.workouts.some(w=>w.id===it.id)) S.workouts.push(it); delete CC[it.id];
      // idle stopwatches that switched to stopwatch-only when it was deleted get it back, if still idle and unassigned
      (x.idleWatchIds||[]).forEach(id=>{ const w=S.watches.find(y=>y.id===id); if(w && w.status==='idle' && !w.workoutId){ w.workoutId=it.id; } }); return true;
    case 'course': if(!S.courses.some(c=>c.id===it.id)) S.courses.push(it); return true;
    case 'meet': if(!S.meets.some(m=>m.id===it.id)) S.meets.push(it); return true;
    case 'series': if(!S.series.some(m=>m.id===it.id)) S.series.push(it); return true;
    case 'pr': setPR(x.athleteId,x.dist,it.t); if(curTab==='team') renderTeam(); return true;
    case 'result': { const L=S.prs[x.athleteId]||(S.prs[x.athleteId]=[]), cur=L.find(p=>p.deleted&&(it.id?p.id===it.id:(sameDist(p.dist,it.dist)&&p.t===it.t))); // typed result (2.10)
      if(cur){ delete cur.deleted; delete cur.deletedAt; delete cur.deletedBy; } else { const c={...it}; delete c.deleted; delete c.deletedAt; delete c.deletedBy; L.push(c); } memo.clear(); if(curTab==='team') renderTeam(); return true; }
    case 'watch': { if(S.watches.length>=MAX){ toast(`Already ${MAX} stopwatches. Remove one first.`); return false; }
      const w=JSON.parse(JSON.stringify(it)), same=S.watches.find(y=>y.id===w.id);
      if(w.sh && !same){ S.watches.push(w); replayWatch(w); if(isTeam()&&SYNC.watchHeaderDel) SYNC.watchHeaderDel(w.id,false); return true; } // 3.3: a shared stopwatch comes back for every coach
      if(w.sh){ delete w.sh; delete w.ev; delete w.hs; delete w.ep; delete w.day; } // a copy next to the original: shared again as a new stopwatch
      if(x.reset && same && same.status==='idle' && !hasTimes(same)){ // Undo of Start over: the times go back on the same card
        Object.assign(same,w); if(same.status==='running'){ same.pausedT=x.elapsed; same.status='paused'; } HIST[same.id]=[]; return true; }
      if(same) w.id=uid();
      if(w.status==='running'){ w.pausedT=(x.elapsed!=null?x.elapsed:Date.now()-w.startAt); w.status='paused'; } // comes back stopped, never running
      if(w.status==='idle' && (w.run.laps.length||w.run.splits.length)) w.status='paused';
      S.watches.push(w); return true; }
    case 'racelog': logPut(it); return true;
    case 'history': if(SYNC && syncMode()==='joined'){ SYNC.restoreHistory(e.id); return true; } toast('Join the team to restore this.'); return false;
    case 'race': {
      if(S.race && S.race.status!=='done' && S.race.id!==e.id){ toast('Finish or discard the race on screen first.'); return false; }
      if(x.team && SYNC && syncMode()==='joined'){ SYNC.restoreRace(e.id,it).then(()=>{ if(S.race&&S.race.id===e.id) showTab('race'); }); return true; }
      S.race=JSON.parse(JSON.stringify(it)); S.race.status=x.from||'setup'; setTimeout(()=>showTab('race'),0); return true; }
    case 'checkpoint': {
      const r=S.race; if(!r||r.id!==x.raceId){ toast('Open that race to restore its checkpoint.'); return false; }
      if(!r.checkpoints.some(c=>c.id===it.id)) r.checkpoints.splice(Math.min(x.index,r.checkpoints.length),0,it);
      r.marks.forEach(m=>{ if((x.markIds||[]).includes(m.id)&&m.deleted) markChange(m,{deleted:false}); }); return true; }
    case 'marks': return restoreMarks(x);
    case 'import': return restoreImport(e);
    case 'merge': return undoMerge(e);
  }
  return false;
}
function restoreMarks(x){
  const r=S.race;
  if(r && r.id===x.raceId && !x.entryId){ r.marks.forEach(m=>{ if(x.markIds.includes(m.id)&&m.deleted){ markChange(m,{deleted:false}); localTouch.add(m.runnerId); } }); return true; }
  const h=x.entryId?(x.where==='team'?teamEntry(x.entryId):raceLog().find(y=>y.id===x.entryId))
    :(teamHistory.find(y=>y.race&&y.race.raceId===x.raceId)||raceLog().find(y=>y.race&&y.race.raceId===x.raceId));
  if(h){ const M=modelOf(h), vs=M.marks.filter(m=>x.markIds.includes(m.id)&&m.deleted).map(m=>({...stateOf(m),deleted:false}));
    if(vs.length) applyVersions({entry:h,where:x.where||(teamHistory.includes(h)?'team':'local')},vs); return true; }
  if(r && r.id===x.raceId){ r.marks.forEach(m=>{ if(x.markIds.includes(m.id)&&m.deleted) markChange(m,{deleted:false}); }); return true; }
  toast('Open that race to restore its times.'); return false;
}
const KIND_WORD={result:'Result',merge:'Merge',import:'Imported history',meet:'Meet',series:'Series',athlete:'Runner',workout:'Workout',course:'Course',pr:'PR',watch:'Stopwatch',racelog:'Race on this phone',history:'Team history',race:'Race',checkpoint:'Checkpoint',marks:'Times'};
async function deletedSheet(older){
  await STORE_READY;
  const L=[...TRASH].sort((a,b)=>b.deletedAt-a.deletedAt), admin=SYNC&&syncInfo.isAdmin&&syncMode()==='joined';
  // marks grouped per race, so a busy finish is one row
  const groups=[]; const byRace={};
  L.forEach(e=>{ if(e.kind!=='marks'){ groups.push({e}); return; } const k=e.extra.raceId; if(!byRace[k]){ byRace[k]={race:e.extra.raceName,list:[],at:e.deletedAt}; groups.push({g:byRace[k]}); } byRace[k].list.push(e); });
  const who=e=>e.deletedBy===myId()||e.deletedBy===DEVICE?'you':(e.deletedByName||'another coach');
  const when=t=>new Date(t).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const row=e=>`<div class="set-row del-row"><span>${esc(KIND_WORD[e.kind]||'')}: ${esc(e.label)}<span class="hint">Removed by ${esc(who(e))} · ${esc(when(e.deletedAt))}</span></span><span class="race-actions"><button class="btn" data-rs="${esc(e.key)}">Restore</button>${admin&&e.kind==='athlete'?`<button class="btn warn" data-purge="${esc(e.id)}">Delete permanently</button>`:''}</span></div>`;
  const body=groups.length?groups.map(x=>x.e?row(x.e):`<details class="del-grp"><summary>${x.g.list.length} time${x.g.list.length===1?'':'s'} in ${esc(x.g.race||'a race')}<span class="hint">newest ${esc(when(x.g.at))}</span></summary>${x.g.list.map(row).join('')}<button class="btn" data-rsall="${esc(x.g.list.map(e=>e.key).join('|'))}">Restore all ${x.g.list.length}</button></details>`).join('')
    :'<p>Nothing has been deleted.</p>';
  const olderHTML=(older||[]).map(o=>`<div class="set-row del-row"><span>${esc(KIND_WORD[o.kind]||o.kind)}: ${esc(o.label)}<span class="hint">Removed ${esc(when(o.deletedAt||0))} (kept in the team's records)</span></span><button class="btn" data-rso="${esc(o.kind+':'+o.id)}">Restore</button></div>`).join('');
  modal(`<div class="del-sheet"><h2>Recently deleted</h2><p class="hint">Everything removed, newest first. Nothing here expires.${syncMode()==='joined'?' This phone keeps the last 90 days; older items are kept by the team.':''}</p>
    ${body}${olderHTML}${syncMode()==='joined'&&!older?'<button class="btn" data-older>Show older (needs signal)</button>':''}
    <div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.addEventListener('click',async ev=>{
      const b=ev.target.closest('[data-rs]'); if(b){ const k=b.dataset.rs, isRace=k.startsWith('race:'); if(trashRestore(k)){ if(isRace) close(); else deletedSheet(older); } return; } // a restored race opens on screen
      const all=ev.target.closest('[data-rsall]'); if(all){ all.dataset.rsall.split('|').forEach(k=>trashRestore(k,true)); toast('Restored'); deletedSheet(older); return; }
      const o=ev.target.closest('[data-rso]'); if(o){ const [k,id]=o.dataset.rso.split(/:(.*)/s); try{ await SYNC.restoreOlder(k,id); toast('Restored'); close(); }catch(err){ toast((err&&err.message)||'Needs signal'); } return; }
      if(ev.target.closest('[data-older]')){ try{ const list=await SYNC.fetchDeleted(); const have=new Set(TRASH.map(e=>e.kind+':'+e.id)); deletedSheet(list.filter(x=>!have.has(x.kind+':'+x.id))); }catch(err){ toast('That needs signal.'); } return; }
      const p=ev.target.closest('[data-purge]'); if(p){ close(); purgeSheet(p.dataset.purge); }
    });
  });
}

// ---- Delete permanently (admin only, privacy requests, 2.6) ----
function scrubModel(M,aid){ // a saved race model without one runner
  if(!M||!M.rows||!M.rows.some(r=>r.id===aid)&&!(M.marks||[]).some(m=>m.rid===aid||(m.hist||[]).some(v=>v.rid===aid))) return null;
  const N=JSON.parse(JSON.stringify(M)); N.rows=N.rows.filter(r=>r.id!==aid);
  if(N.marks) N.marks=N.marks.filter(m=>m.rid!==aid).map(m=>({...m,hist:(m.hist||[]).map(v=>v.rid===aid?{...v,rid:null}:v)}));
  return N;
}
function scrubEntry(h,aid,name){ // returns the changed fields, or null
  const out={};
  if(h.race){ const N=scrubModel(h.race,aid); if(N) out.race=N; }
  if((h.edits||[]).some(v=>v.rid===aid)) out.edits=h.edits.filter(v=>v.rid!==aid);
  if(name && (h.watches||[]).some(w=>(w.members||[]).includes(name))) out.watches=h.watches.map(w=>({...w,members:(w.members||[]).filter(n=>n!==name)}));
  return Object.keys(out).length?out:null;
}
function scrubState(st,aid,name){
  st.roster=(st.roster||[]).filter(a=>a.id!==aid); if(st.prs) delete st.prs[aid];
  (st.watches||[]).forEach(w=>{ const i=(w.athleteIds||[]).indexOf(aid); if(i>=0){ w.athleteIds.splice(i,1); (w.athleteNames||[]).splice(i,1); } });
  if(st.race){ st.race.runners=(st.race.runners||[]).filter(x=>x.id!==aid); st.race.marks=(st.race.marks||[]).filter(m=>m.runnerId!==aid).map(m=>({...m,hist:(m.hist||[]).map(v=>v.runnerId===aid?{...v,runnerId:null}:v)})); }
  (st.raceLog||[]).forEach(x=>{ const c=scrubEntry(x,aid,name); if(c) Object.assign(x,c); });
  return st;
}
function scrubOfficialDoc(d,aid,name){ // returns the changed fields, or null
  const hit=r=>r.aid===aid||(!r.aid&&name&&r.name===name);
  if(!(d.results||[]).some(hit)&&!Object.values(d.matches||{}).includes(aid)) return null;
  return {results:d.results.filter(r=>!hit(r)),matches:Object.fromEntries(Object.entries(d.matches||{}).filter(([,v])=>v!==aid))};
}
const scrubTrash=(L,aid,name)=>L.filter(e=>!((e.kind==='athlete'&&e.id===aid)||(e.kind==='pr'&&e.extra&&e.extra.athleteId===aid)||(e.kind==='marks'&&name&&String(e.label).startsWith(name+' '))))
  .map(e=>{ if(e.kind==='watch'&&e.item) scrubState({watches:[e.item]},aid,name); if(e.kind==='racelog'&&e.item){ const c=scrubEntry(e.item,aid,name); if(c) Object.assign(e.item,c); } if(e.kind==='race'&&e.item) scrubState({race:e.item},aid,name); return e; });
async function purgeLocal(aid){
  await STORE_READY;
  const a=S.roster.find(x=>x.id===aid)||(TRASH.find(e=>e.kind==='athlete'&&e.id===aid)||{}).item, name=a&&a.name;
  const touched=RACELOG.filter(x=>scrubEntry(x,aid,name)); // before scrubState: the newest 5 are the same objects as S.raceLog (2.8 fix)
  scrubState(S,aid,name);
  const keep=scrubTrash(TRASH,aid,name), drop=TRASH.filter(e=>!keep.includes(e));
  TRASH=keep; for(const e of drop) await storeDel('trash',e.key); for(const e of keep) await storePut('trash',e);
  for(const x of RACELOG){ const c=scrubEntry(x,aid,name); if(c) Object.assign(x,c); if(c||touched.includes(x)) await storePut('races',x); }
  for(const d of OFFICIAL){ const c=scrubOfficialDoc(d,aid,name); if(c){ Object.assign(d,c); await storePut('official',d); } } offSet([...OFFICIAL]); // imported results too (2.9)
  S.raceLog=RACELOG.slice(0,5);
  for(const sn of await storeAll('snapshots')){ // snapshots too: nothing about this runner stays on the phone
    try{ sn.state=JSON.stringify(scrubState(JSON.parse(sn.state),aid,name)); sn.trash=JSON.stringify(scrubTrash(JSON.parse(sn.trash||'[]'),aid,name));
      sn.races=JSON.stringify(JSON.parse(sn.races||'[]').map(x=>{ const c=scrubEntry(x,aid,name); return c?{...x,...c}:x; })); await storePut('snapshots',sn); }catch(e){}
  }
  saveNow(); refreshAll();
}
function purgeSheet(aid){
  const e=TRASH.find(x=>x.kind==='athlete'&&x.id===aid), a=S.roster.find(x=>x.id===aid)||(e&&e.item); if(!a) return;
  modal(`<div class="purge-sheet"><h2>Delete ${esc(a.name)} permanently?</h2>
    <p>For a privacy request. This removes ${esc(a.name)}’s runner record, PRs, every time recorded for them in every race, and their row in saved results, for every coach. It can’t be restored. A snapshot of this phone is saved first.</p>
    <p class="hint">Backup files someone already saved (Files, Mail) can’t be reached.</p>
    <label class="field">Type the runner’s name to confirm<input id="purgeName" autocomplete="off" autocapitalize="words" placeholder="${esc(a.name)}"></label>
    <p class="form-err" id="purgeErr" hidden></p>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn warn" data-x="yes" disabled>Delete permanently</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild, inp=m.querySelector('#purgeName'), go=m.querySelector('[data-x=yes]'), match=()=>inp.value.trim().toLowerCase()===String(a.name).trim().toLowerCase();
    m.querySelector('[data-x=no]').onclick=close;
    inp.oninput=()=>{ go.disabled=!match(); };
    go.onclick=async()=>{ if(!match()) return; go.disabled=true; go.textContent='Working…';
      try{ await takeSnapshot(`Before Delete permanently: ${a.name}`); if(SYNC&&syncMode()==='joined') await SYNC.purgeRunner(aid,a.name); await purgeLocal(aid); close(); toast(`${a.name} was deleted permanently`); }
      catch(err){ const er=m.querySelector('#purgeErr'); er.textContent=(err&&err.message)||'That needs signal.'; er.hidden=false; go.disabled=false; go.textContent='Delete permanently'; } };
  });
}

/* ---------- tabs ---------- */
let curTab='watches';
const NAV_TITLE={watches:'Stopwatches',workouts:'Workouts',team:'Team',results:'Data',race:'Race'};
function navBar(){ $('#navTitle').textContent=NAV_TITLE[curTab]||''; $('#navSmall').textContent=NAV_TITLE[curTab]||''; document.querySelectorAll('.nav-for').forEach(x=>{ x.hidden=x.dataset.for!==curTab; });
  const nl=$('#navLeft'); nl.innerHTML=curTab==='results'&&rvRunner&&!$('#rvRunners').hidden?`<button type="button" class="nav-back" data-rvback>‹ Runners</button>`:'';
  const lg=$('#navLogo'); if(lg) lg.hidden=!!nl.innerHTML; }
// iOS: once the large title has scrolled under the nav bar, a small title shows in the bar (3.0)
if('IntersectionObserver' in window) new IntersectionObserver(es=>{ es.forEach(e=>document.body.classList.toggle('title-gone',!e.isIntersecting)); },{rootMargin:'-60px 0px 0px 0px'}).observe($('#navTitle'));
function showTab(name){
  if(name!=='workouts'&&editingId){ editingId=null; renderEditor(); }
  if(name!=='watches'&&EDITW) setEditW(false); // 3.3.1
  curTab=name; navBar();
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===name)));
  ['watches','workouts','team','results','race'].forEach(v=>$('#v-'+v).hidden=(v!==name));
  document.body.classList.toggle('race-open',name==='race'); if(name!=='race') document.body.classList.remove('race-live','race-setup');
  if(name==='race'){ renderRace(); if(SYNC && syncMode()==='joined'){ SYNC.measureClock(); askCoachName(); } }
  applyWake(); updateRaceBanner();
  if(name==='watches'){ CC={}; renderGrid(); }
  if(name==='workouts'){ renderWkList(); renderEditor(); }
  if(name==='team'){ renderTeam(); }
  if(name==='results'){ renderResults(); }
  window.scrollTo({top:0});
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));

/* ---------- PWA: offline, updates, install ---------- */
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); });
}
try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}

// Auto-update (2.9.0). The app checks version.json on open, on return to the app and every 10 minutes. A newer
// version installs by itself (files downloaded first, then a reload) only when nothing is timing on this phone: no
// stopwatch running and no live race. It never reloads during timing; it waits and tries again when the clocks stop.
// While the phone is in use (a sheet open, typing, a tap in the last 30 s) it also waits, except right at open/return.
// The team's minimum version (admin setting, team doc) makes a phone below it show a full-screen "Updating…".
const AU_KEY='mustang-splits:autoupd', UPD_FLAG='mustang-splits:updated';
let lastCheck=0, serverVer=null, upd={busyNote:false,applying:false,deferredUntil:0}, lastTouch=0, forceSkip=false;
['pointerdown','keydown'].forEach(ev=>document.addEventListener(ev,()=>{ lastTouch=Date.now(); },true));
const timingNow=()=>S.watches.some(w=>w.status==='running')||!!(S.race&&S.race.status==='running'&&S.race.gun);
const inUse=()=>!$('#overlay').hidden||(document.activeElement&&document.activeElement.matches&&document.activeElement.matches('input,select,textarea'))||Date.now()-lastTouch<30000;
const auRec=()=>{ try{ return JSON.parse(localStorage.getItem(AU_KEY)||'null')||{}; }catch(e){ return {}; } };
const minVer=()=>(SYNC&&syncMode()==='joined'&&syncInfo.minVersion)||'';
const belowMin=()=>!!minVer()&&verLt(APP_VERSION,minVer());
async function checkVersion(force,why){
  if(!location.protocol.startsWith('http')){ if(force) toast('Updates are checked once the app is online'); return; }
  if(!force && Date.now()-lastCheck<30*1000) return;
  lastCheck=Date.now();
  try{
    const r=await fetch('version.json',{cache:'no-store'}); if(!r.ok) throw 0;
    const j=await r.json(); serverVer=j.version||null;
    if(serverVer && verLt(APP_VERSION,serverVer)) autoUpdate(why||'check');
    else { if(force) toast(`You're on the latest version (${APP_VERSION})`); updUI(); }
  }catch(e){ if(force) toast("Couldn't check. Are you online?"); updUI(); }
}
// Can the phone update right now? why: 'open' and 'return' ignore "in use" (the coach just arrived).
function autoUpdate(why){
  updUI();
  if(!serverVer||!verLt(APP_VERSION,serverVer)||upd.applying) return;
  if(timingNow()) return; // never during timing; tick re-checks when the clocks stop
  const forced=belowMin()&&!forceSkip;
  if(!forced && why!=='open' && why!=='return' && why!=='check' && inUse()) return; // 'check' = Check for updates in Settings
  const rec=auRec(); // never a reload loop: at most 2 tries per version per 30 minutes
  if(rec.to===serverVer && rec.n>=2 && Date.now()-rec.at<30*60e3){ updUI('stuck'); return; }
  applyUpdate();
}
async function applyUpdate(){
  if(timingNow()||upd.applying) return; upd.applying=true; updUI();
  const to=serverVer, rec=auRec();
  try{ localStorage.setItem(AU_KEY,JSON.stringify({to,at:Date.now(),n:rec.to===to&&Date.now()-rec.at<30*60e3?(rec.n||0)+1:1})); }catch(e){}
  let ok=true;
  try{ const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration(); const sw=reg&&(reg.active||reg.waiting);
    if(sw) ok=await new Promise(res=>{ const ch=new MessageChannel(); const t=setTimeout(()=>res(false),15000); ch.port1.onmessage=e=>{ clearTimeout(t); res(!!(e.data&&e.data.ok)); }; sw.postMessage({type:'refresh'},[ch.port2]); });
    if(reg&&reg.waiting) reg.waiting.postMessage('skipWaiting'); }catch(e){}
  if(!ok){ upd.applying=false; updUI('offline'); return; } // couldn't download: keep this version, try again later
  if(timingNow()){ upd.applying=false; updUI(); return; } // a clock started while downloading: wait
  saveNow();
  try{ sessionStorage.setItem(UPD_FLAG,JSON.stringify({from:APP_VERSION,to})); }catch(e){}
  location.reload();
}
// The banner (and the full-screen screen for a phone below the team's minimum).
function updUI(state){
  const newer=serverVer&&verLt(APP_VERSION,serverVer), timing=timingNow(), b=$('#updateBanner'), fu=$('#forceUpd');
  if(newer){ b.hidden=false;
    $('#updText').textContent=timing?`Version ${serverVer} is ready. It installs by itself when the clocks stop.`:state==='offline'?`Version ${serverVer} is ready. It needs signal to install.`:upd.applying?`Updating to ${serverVer}…`:`Version ${serverVer} is ready.`;
    $('#doUpdate').hidden=timing||upd.applying; }
  else b.hidden=true;
  const must=belowMin()&&!forceSkip;
  if(must&&timing){ b.hidden=false; $('#doUpdate').hidden=true; } // below the team's minimum while a clock runs: a banner, never a reload
  if(must&&timing) $('#updText').textContent=`Your team needs version ${minVer()}. This phone updates by itself when the clocks stop.`;
  fu.hidden=!must||timing;
  if(must){ $('#fuText').textContent=!newer?`Your team needs version ${minVer()} or newer. This phone has ${APP_VERSION} and couldn’t find ${minVer()} yet${navigator.onLine?'':' (no signal)'}.`
      :state==='offline'||state==='stuck'?`Couldn’t download version ${serverVer} yet. It needs signal.`:`Updating to ${serverVer}…`;
    const stuck=state==='offline'||state==='stuck'||!newer; $('#fuSkip').hidden=!stuck; $('#fuRetry').hidden=!stuck; $('#fuTitle').textContent=stuck?'Update needed':'Updating…'; }
  document.body.classList.toggle('must-update',must&&timing); // a running clock: a banner instead, never a reload
}
$('#doUpdate').onclick=()=>{ if(timingNow()){ toast('It installs by itself when the clocks stop.'); return; } applyUpdate(); };
$('#fuSkip').onclick=()=>{ forceSkip=true; updUI(); toast(`Using ${APP_VERSION} for now. It updates when there is signal.`); };
$('#fuRetry').onclick=()=>{ forceSkip=false; try{ localStorage.removeItem(AU_KEY); }catch(e){} checkVersion(true,'open'); };
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') checkVersion(false,'return'); });
setInterval(()=>{ lastCheck=0; checkVersion(false,'timer'); },10*60*1000); // every 10 minutes
let wasTiming=false;
setInterval(()=>{ const t=timingNow(); if(wasTiming&&!t){ updUI(); lastCheck=0; checkVersion(false,'stopped'); } else if(serverVer&&!t&&!upd.applying) autoUpdate('idle'); wasTiming=t; },5000); // clocks stopped: try now
(()=>{ try{ const f=JSON.parse(sessionStorage.getItem(UPD_FLAG)||'null'); if(!f) return; sessionStorage.removeItem(UPD_FLAG);
  if(f.to===APP_VERSION){ localStorage.removeItem(AU_KEY); setTimeout(()=>toast(`Updated to ${APP_VERSION}`),600); } }catch(e){} })();

const INSTALL_KEY='mustang-splits:install-dismissed';
let deferredPrompt=null;
function installDismissed(){ try{ return localStorage.getItem(INSTALL_KEY)==='1'; }catch(e){ return false; } }
function showInstall(msg,withButton){
  if(isStandalone()||installDismissed()) return;
  $('#installText').textContent=msg; $('#doInstall').hidden=!withButton; $('#installBanner').hidden=false;
}
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; showInstall('Install Mustang Splits on this phone for full-screen, offline use.',true); });
$('#doInstall').onclick=async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); try{ await deferredPrompt.userChoice; }catch(e){} deferredPrompt=null; $('#installBanner').hidden=true; };
$('#closeInstall').onclick=()=>{ $('#installBanner').hidden=true; try{ localStorage.setItem(INSTALL_KEY,'1'); }catch(e){} };
if(/iPhone|iPad|iPod/.test(navigator.userAgent||'') && !isStandalone()){ showInstall('To install: tap Share, then Add to Home Screen.',false); }

/* ---------- team sync bridge ---------- */
// sync.js (an ES module) calls these. Everything here is local and instant; sync.js does the network.
let syncInfo={mode:'local',code:'',text:'',teamName:''};
let teamHistory=[];
const syncMode=()=>SYNC?syncInfo.mode:'local';
window.MSApp={
  syncReady(api){ SYNC=api; syncInfo=api.info(); updateSyncUI(); if(syncInfo.pendingMerge) promptMerge(); STORE_READY.then(pruneTrash); },
  getRoster:()=>S.roster,
  // Race Mode
  getRace:()=>S.race,
  getMarks:()=>S.race?S.race.marks:[],
  setRace(r){ S.race=r; selMark=null; saveNow(); if(curTab==='race') renderRace(); updateRaceBanner(); },
  applyRemoteRace(id,f){ // remote edits to the race document (name, status, gun, checkpoints, runners)
    if(!S.race||S.race.id!==id) return;
    Object.assign(S.race,f); saveNow(); if(curTab==='race') renderRace(); applyWake(); updateRaceBanner();
  },
  activeRaces(list){ activeRaces=list||[]; updateRaceBanner(); },
  // What this phone tells the other coaches in a running race (sync.js writes it only when it changes).
  getPresence:()=>{ const r=S.race; if(!r||r.status!=='running') return null; return {cp:curCp().id,name:S.settings.coachName||'',ver:APP_VERSION}; },
  racePresence(list){ presence=list||[]; const st=$('#raceStatus'); if(st && S.race && S.race.status==='running') st.textContent=raceStatusText(S.race,curCp()); },
  raceDiscarded(id){ // another coach discarded the race this phone has open: kept in Recently deleted here too
    if(!S.race||S.race.id!==id) return;
    trashPut({kind:'race',id,label:S.race.name||'Race',item:JSON.parse(JSON.stringify(S.race)),extra:{team:true,from:S.race.status},deletedBy:'',deletedByName:'another coach',synced:true});
    S.race=null; selMark=null; saveNow(); if(curTab==='race') showTab('watches'); updateRaceBanner(); applyWake(); toast('A coach discarded the race. Recently deleted (Settings) can restore it.');
  },
  clockOffset(off,rtt){ // measured by sync.js; fills in this device's race events saved before any offset was known
    CLOCK={off,rtt,at:Date.now()}; try{ localStorage.setItem('mustang-splits:clock',JSON.stringify(CLOCK)); }catch(e){}
    try{ shClockFixed(off); }catch(e){} // 3.3: shared stopwatches
    const r=S.race; let fixed=false;
    if(r){ if(r.gun&&r.gun.by===DEVICE&&r.gun.off==null){ r.gun.off=off; fixed=true; }
      r.marks.forEach(m=>{ if(m.by===DEVICE&&m.off==null&&!(m.hist&&m.hist.length)){ m.off=off; fixed=true; } }); } // never rewrites a versioned mark
    if(fixed) save();
    if(curTab==='race') renderRace();
  },
  raceElapsed:()=>S.race&&S.race.gun?nowSrv()-srv(S.race.gun):null, // for tests
  dayRatings:()=>{ memo.clear(); const F=dayRatings(), info={}; Object.entries(F.info).forEach(([k,i])=>{ const {races,...rest}=i; info[k]=rest; }); return {d:F.d,conf:F.conf,info,rated:F.rated,wxPart:F.wxPart,wxShare:F.wxShare,wxBeta:F.wxBeta,wxRec:Object.fromEntries(Object.entries(F.wxRec||{}).map(([k,r])=>[k,r.id]))}; }, // for tests (3.1; weather 3.2)
  wx:{run:why=>wxRun(why||'force'),plan:()=>{ const n=wxPlan(); save(); return n; },days:()=>[...wxDays().values()].map(d=>({...d,names:[...d.names]})),flags:(w,T)=>wxFlagsOf(w,T),summary:(h,a,b)=>wxSummary(h,a,b),toConfirm:()=>placesToConfirm().map(e=>({id:e.id,name:e.name})),suggest:async id=>{ const e=placesNeeded().find(x=>x.id===id); return e?suggestPlace(e):null; },setPlace:(id,g,src)=>{ const p=placeSet(id,g,src||'test'); return {...p}; },needed:()=>placesNeeded().map(e=>({id:e.id,name:e.name,used:[...e.used]})),note:()=>wxNote,heat:td=>heatCost(td),placeOf:nm=>racePlaceId({M:{printed:nm}}),key:nm=>meetKey(nm)}, // for tests (3.2)
  teamRows:(g,mode,y)=>{ memo.clear(); return teamRows(g,dayRatings(),mode,y).map(r=>({date:r.x.date,meet:raceMeet(r.x),course:courseNameOf(r.x.M.courseId)||'',n:r.n,short:!!r.short,avg:r.avg,raw:r.rawAvg})); }, // for tests and the real-data report
  checkUpdate:why=>{ lastCheck=0; return checkVersion(false,why||'open'); }, // for tests (2.9.0)
  backupData:()=>backupData(), // for tests (2.9.1)
  health:()=>{ memo.clear(); return healthIssues().map(x=>({kind:x.kind,text:x.text})); }, // for tests (2.12)
  seasonAvg:id=>{ const a=S.roster.find(x=>x.id===id); return a?seasonAvg(a):null; }, // for tests (2.12)
  paceMath:(d,t)=>{ const V=vdotOf(d,t); return {V,...pacesFor(V),t5:raceTimeAt(V,5000)}; }, // for tests (2.11)
  planFor:id=>{ const w=S.watches.find(x=>x.id===id); const P=w&&planOf(w); return P?JSON.parse(JSON.stringify(P)):null; },
  wakeState:()=>({want:wantWake(),lock:!!wakeLock,video:wakeVidOn,msg:wakeMsg}), // for tests (2.9.1)
  updState:()=>({serverVer,timing:timingNow(),applying:upd.applying,belowMin:belowMin(),minVersion:minVer(),rec:auRec()}),
  getWorkouts:()=>S.workouts,
  getCourses:()=>S.courses||[],
  getSeries:()=>S.series||[],
  getMeets:()=>S.meets||[],
  getPlaces:()=>S.places||[], // 3.2
  watchRemote(hs,es){ // 3.3: other coaches' stopwatch headers and taps
    const touched=new Set(); let rebuild=false, removed=false; hs.forEach(h=>{ const r=shRemoteHeader(h.id,h); if(r==='add') rebuild=true; if(r==='del') removed=true; if(r) touched.add(h.id); }); es.forEach(e=>{ const w=shRemoteEvent(e); if(w) touched.add(w.id); });
    if(removed&&!S.watches.length) rebuild=true; // the empty state (a removed tile's own Undo is never wiped by a redraw)
    touched.forEach(id=>{ const w=S.watches.find(x=>x.id===id); if(!w) return; replayWatch(w); if(cardEls[w.id]) renderCard(w); else rebuild=true; });
    if(rebuild) renderGrid(); else updateToolbar(); save(); coachNote(); applyWake(); },
  devices(list){ DEVICES=list; coachNote(); }, // 3.3
  addWatch:(name,workoutId)=>{ const w=newWatch(name,workoutId); S.watches.push(w); renderGrid(); save(); return w.id; }, // for tests (3.3)
  coachNoteText:()=>{ coachNote(); return ($('#coachNote')||{}).textContent||''; }, // for tests (3.3)
  watchState:id=>{ const w=S.watches.find(x=>x.id===id); return w?{status:w.status,el:el(w),laps:w.run.laps.slice(),splits:w.run.splits.map(s=>({t:s.t,rep:s.rep,cpi:s.cpi,by:s.tap&&s.tap.byName,alts:s.tap?s.tap.alts.length:0})),lapTaps:(w.run.lapTaps||[]).map(x=>x&&{by:x.byName,alts:x.alts.length}),phase:w.run.phase,rep:w.run.rep,ep:w.ep,sh:!!w.sh,events:(w.ev||[]).length}:null; }, // for tests (3.3)
  getWeather:()=>S.weather||[], // 3.2
  getMerges:()=>S.merges||[], // 2.9.2
  getPrs:()=>Object.entries(S.prs||{}).map(([id,list])=>({id,list})), // one item per runner, like athletes
  // ch: {athletes:{upsert:[],remove:[]}, workouts:{upsert:[],remove:[]}}. Returns ids it chose to skip.
  applyRemote(ch){
    const skipped=[]; // nothing is skipped now: started stopwatches use their own plan copy (planOf)
    const n=x=>({upsert:[],remove:[],trash:[],...(x||{})}), A=n(ch.athletes), W=n(ch.workouts), C=n(ch.courses), P=n(ch.prs);
    if(ch.marks) ch.marks=n(ch.marks);
    // A soft delete by another coach: off the live list and into this phone's Recently deleted (2.6).
    const remoteTrash=(kind,r,label,extra)=>{ if(TRASH.some(e=>e.key===kind+':'+r.id)) return;
      const d=r._del||{}; const it={...r}; delete it._del;
      trashPut({kind,id:r.id,label,item:it,extra,deletedAt:d.deletedAt||Date.now(),deletedBy:d.deletedBy||'',deletedByName:d.deletedBy===myId()?S.settings.coachName||'':'another coach',synced:true}); };
    const restored=(kind,id)=>{ const e=TRASH.find(x=>x.key===kind+':'+id); if(e){ if(kind==='workout') restoreKind(e); trashTake(e.key); } }; // restored by another coach
    for(const [k,list,word] of [['series','series','Series'],['meets','meets','Meet']]){ const X=n(ch[k]), kind=k==='meets'?'meet':'series'; // 2.7
      X.upsert.forEach(r=>{ const c=S[list].find(x=>x.id===r.id); if(c) Object.assign(c,r); else { S[list].push(r); restored(kind,r.id); } });
      X.trash.forEach(r=>{ S[list]=S[list].filter(c=>c.id!==r.id); remoteTrash(kind,r,kind==='meet'?meetLabel(r):(r.name||word)); });
      if(X.remove.length){ const rm=new Set(X.remove); S[list]=S[list].filter(c=>!rm.has(c.id)); } }
    for(const k of ['places','weather']){ const X=n(ch[k]); if(!S[k]) S[k]=[]; let hit=false; // 3.2: race locations and weather (soft delete: just off the list)
      X.upsert.forEach(r=>{ const c=S[k].find(x=>x.id===r.id); if(c) Object.assign(c,r); else S[k].push(r); hit=true; });
      X.trash.forEach(r=>{ S[k]=S[k].filter(c=>c.id!==r.id); hit=true; }); if(X.remove.length){ const rm=new Set(X.remove); S[k]=S[k].filter(c=>!rm.has(c.id)); hit=true; }
      if(hit){ memo.clear(); setTimeout(()=>{ wxRefresh(); refreshAll(); },0); } }
    const G=n(ch.merges); // merged runners (2.9.2): this phone's stopwatches and live race follow a coach's merge
    G.upsert.forEach(r=>{ const had=(S.merges||[]).some(x=>x.id===r.id); S.merges=[...(S.merges||[]).filter(x=>x.id!==r.id),r]; if(!had) mergeLocal(r.id,r.to); });
    G.trash.forEach(r=>{ S.merges=(S.merges||[]).filter(x=>x.id!==r.id); }); if(G.remove.length) S.merges=(S.merges||[]).filter(x=>!G.remove.includes(x.id));
    if(G.upsert.length||G.trash.length||G.remove.length){ memo.clear(); offSet([...OFFICIAL]); }
    A.upsert.forEach(r=>{ const a=S.roster.find(x=>x.id===r.id); if(a){ a.name=r.name; a.group=r.group; a.gender=r.gender||''; } else { S.roster.push({id:r.id,name:r.name,group:r.group,gender:r.gender||''}); restored('athlete',r.id); } });
    A.trash.forEach(r=>{ const a=S.roster.find(x=>x.id===r.id); S.roster=S.roster.filter(x=>x.id!==r.id); remoteTrash('athlete',a?{...a,_del:r._del}:r,(a||r).name||'Runner'); });
    if(A.remove.length){ const rm=new Set(A.remove); S.roster=S.roster.filter(a=>!rm.has(a.id)); }
    W.upsert.forEach(r=>{ const w=S.workouts.find(x=>x.id===r.id); if(w) Object.assign(w,r); else { S.workouts.push(r); restored('workout',r.id); } delete CC[r.id]; });
    W.trash.forEach(r=>{ const idle=S.watches.filter(w=>w.workoutId===r.id&&w.status==='idle'); idle.forEach(w=>{ w.workoutId=null; }); // running/paused/finished keep their plan copy
      S.workouts=S.workouts.filter(w=>w.id!==r.id); delete CC[r.id]; if(editingId===r.id) editingId=null;
      remoteTrash('workout',r,r.name||'Untitled workout',{idleWatchIds:idle.map(w=>w.id)}); });
    W.remove.forEach(id=>{ S.workouts=S.workouts.filter(w=>w.id!==id); delete CC[id]; if(editingId===id) editingId=null; });
    C.upsert.forEach(r=>{ const c=S.courses.find(x=>x.id===r.id); if(c) Object.assign(c,r); else { S.courses.push(r); restored('course',r.id); } });
    C.trash.forEach(r=>{ S.courses=S.courses.filter(c=>c.id!==r.id); remoteTrash('course',r,r.name||'Course'); });
    if(C.remove.length){ const rm=new Set(C.remove); S.courses=S.courses.filter(c=>!rm.has(c.id)); }
    P.upsert.forEach(r=>{ if(r.list&&r.list.length) S.prs[r.id]=r.list; else delete S.prs[r.id]; });
    P.remove.forEach(id=>{ delete S.prs[id]; });
    if((P.upsert.length||P.remove.length) && curTab==='team' && !$('#teamList').contains(document.activeElement)) renderTeam();
    if((C.upsert.length||C.trash.length) && curTab==='race' && S.race && S.race.status==='setup' && !raceView.contains(document.activeElement)) renderRace();
    if(ch.marks && S.race){ const r=S.race;
      ch.marks.upsert.forEach(x=>{ const m=r.marks.find(y=>y.id===x.id), was=m&&!m.deleted;
        if(m) Object.assign(m,x); else r.marks.push(x);
        if(x.deleted && (was||!m)) trashPut({kind:'marks',id:r.id+'/'+x.id,label:`${(r.runners.find(y=>y.id===x.runnerId)||{name:'Time'}).name} ${fmtRace(raceSecs(r,x))} at ${(r.checkpoints.find(c=>c.id===x.cp)||{name:''}).name}`,
          extra:{raceId:r.id,raceName:r.name||'Race',markIds:[x.id]},deletedByName:(x.hist&&x.hist.length?x.hist[x.hist.length-1].byName:'')||'another coach',deletedBy:'',synced:true}); });
      if(ch.marks.remove.length){ const rm=new Set(ch.marks.remove); r.marks=r.marks.filter(m=>!rm.has(m.id)); } // admin purge only
      if(curTab==='race') renderRace();
    }
    refreshIdle(); saveNow(); rerenderAfterSync();
    return {skipped};
  },
  softDeleted(kind,id){ const k={athletes:'athlete',workouts:'workout',courses:'course',series:'series',meets:'meet',merges:'merge'}[kind]; const e=k&&TRASH.find(x=>x.key===k+':'+id); if(e&&!e.synced){ e.synced=true; storePut('trash',e); } },
  version:()=>APP_VERSION,
  syncStats:()=>SYNC&&SYNC.stats?SYNC.stats():null, // refusals / quiet rejoins (diagnostics; the tests check a refusal never loops)
  trashCount:()=>TRASH.length,
  coachName:()=>S.settings.coachName||'',
  // Admin "Delete permanently": scrub this phone's copies of one runner (roster, PRs, trash, races, stopwatch names, snapshots).
  purgeRunner(aid){ purgeLocal(aid); },
  scrubHistory:(h,aid,name)=>scrubEntry(h,aid,name),
  syncStatus(info){ const was=syncInfo.minVersion; syncInfo=info; updateSyncUI();
    if((info.minVersion||'')!==(was||'')){ updUI(); if(belowMin()){ if(serverVer) autoUpdate('min'); else { lastCheck=0; checkVersion(false,'open'); } } } },
  teamHistory(list){
    teamHistory=list||[];
    const lr=S.race; if(lr&&lr.status==='done'&&!lr.saved&&(lr.tagEdits||[]).length&&!lr.tagsSent&&SYNC){ // another coach pressed End race (2.8.1)
      const h=teamHistory.find(x=>x.race&&x.race.raceId===lr.id); if(h){ SYNC.appendHistoryEdits(h.id,lr.tagEdits); h.edits=[...(h.edits||[]),...lr.tagEdits]; lr.tagsSent=true; save(); } }
    teamHistory.forEach(h=>{ const k='history:'+h.id, have=TRASH.find(e=>e.key===k); // soft deletes by any coach show in Recently deleted
      if(h.deleted&&!have) trashPut({kind:'history',id:h.id,label:h.kind==='race'&&h.race?(h.race.name||'Race')+' ('+h.date+')':'Practice '+h.date,item:null,deletedAt:h.deletedAt&&h.deletedAt.toMillis?h.deletedAt.toMillis():Date.now(),deletedBy:h.deletedBy||'',deletedByName:h.deletedBy===myId()?S.settings.coachName||'':'another coach',synced:true});
      if(!h.deleted&&have) trashTake(k); });
    if(curTab==='results') renderHistory(); if(curTab==='race'&&S.race&&S.race.status==='done') renderRace();
  },
  notify(msg){ toast(msg); },
  // Official results (2.9): import records from the team, and this phone's ones not on the server yet.
  officialRemote(list){
    let ch=false;
    list.forEach(d=>{ const l=OFFICIAL.find(x=>x.id===d.id);
      if(!l){ const n={...d,key:d.id,synced:true}; OFFICIAL.push(n); storePut('official',n); ch=true; return; }
      const ed=(d.edits||[]).length>=(l.edits||[]).length?d.edits||[]:l.edits; // edits only grow
      if(!!l.deleted!==!!d.deleted||!l.synced||JSON.stringify(l.results)!==JSON.stringify(d.results)||(ed||[]).length!==(l.edits||[]).length){ Object.assign(l,{deleted:!!d.deleted,results:d.results,matches:d.matches||l.matches,edits:ed,synced:true}); storePut('official',l); ch=true; } });
    if(ch){ offSet([...OFFICIAL]); fixPlaceCourses(); if(curTab==='results') renderResults(); }
  },
  pendingOfficial:()=>OFFICIAL.filter(d=>!d.synced),
  officialSynced(id){ const d=OFFICIAL.find(x=>x.id===id); if(d&&!d.synced){ d.synced=true; storePut('official',d); } },
  scrubOfficial:(d,aid,name)=>scrubOfficialDoc(d,aid,name),
  officialStats:()=>({records:OFFICIAL.length,live:OFFICIAL.filter(d=>!d.deleted).reduce((n,d)=>n+d.results.length,0),models:offEntries().length}) // for tests
};
// Redraw what's on screen without yanking a field someone is typing in.
function rerenderAfterSync(){
  const act=document.activeElement;
  if(curTab==='team'){ if($('#teamList').contains(act)) teamDirty=true; else renderTeam(); }
  if(curTab==='workouts'){ renderWkList(); if(!$('#wkEditor').contains(act)) renderEditor(); }
  if(curTab==='watches') S.watches.forEach(w=>{ if(w.status==='idle'||w.status==='done') renderCard(w); });
}
function updateSyncUI(){
  $('#openSettings').dataset.sync=saveFail?'error':(syncInfo.code==='waiting'||syncInfo.code==='error')?syncInfo.code:(liveBytes()/LS_LIMIT>0.75?'waiting':'');
  const rs=$('#raceStatus'); if(rs && S.race && curTab==='race') rs.textContent=S.race.status==='running'?raceStatusText(S.race,curCp()):S.race.status==='done'?raceSaveText():'';
  const st=$('#teamStatus'); if(st){ st.textContent=syncInfo.text; st.dataset.code=syncInfo.code; }
  if(syncInfo.mode==='local') teamHistory=[];
}

// Coach phones and their app versions (2.6): from each phone's device record, plus presence in the open race.
async function loadPhones(m){
  const box=m.querySelector('#phones'); if(!box||!SYNC||!SYNC.fetchDevices) return;
  let L=[]; try{ L=await SYNC.fetchDevices(); }catch(e){ box.innerHTML='<p class="hint">Coach phones: needs signal.</p>'; return; }
  const cut=Date.now()-60*864e5; L=L.filter(d=>d.seen>cut||d.me);
  presence.forEach(p=>{ if(!L.some(d=>d.uid===p.uid)) L.push({uid:p.uid,ver:p.ver,name:p.name,seen:p.at,me:p.me}); }); // 2.4/2.5 phones in a race
  L.forEach(d=>{ if(!d.name){ const p=presence.find(x=>x.uid===d.uid&&x.name); if(p) d.name=p.name; else if(d.me) d.name=S.settings.coachName||''; } }); // a name from the race screen, or this phone's own (2.9.1)
  const old=L.filter(d=>verLt(d.ver,APP_VERSION));
  const ago=t=>{ if(!t) return 'not seen'; const mi=Math.round((Date.now()-t)/60000); return mi<2?'just now':mi<60?mi+' min ago':mi<1440?Math.round(mi/60)+' h ago':Math.round(mi/1440)+' days ago'; };
  box.innerHTML=`<div class="ios-group">${L.sort((a,b)=>b.seen-a.seen).map(d=>`<div class="ios-row phone-row"><span class="ios-l">${esc(d.name||'Coach (no name set)')}${d.me?' (this phone)':''}</span><span class="ios-v ${verLt(d.ver,APP_VERSION)?'old':''}">${esc(d.ver||'?')} · ${esc(ago(d.seen))}</span></div>`).join('')}</div>
    <p class="ios-foot phones-sum ${old.length?'warn':'ok'}">${old.length?`${old.length} phone${old.length===1?' needs':'s need'} to update`:`All phones current — safe to publish rules`}. Phones still on 2.5 or older don’t report here until they update.</p>`;
}
// Settings > Team
function teamSecHTML(){ // 3.4: iOS-style groups (status, phones, actions); the ids are unchanged
  const act=(id,label,cls)=>`<button type="button" class="ios-row ios-act${cls?' '+cls:''}" id="${id}"><span class="ios-l">${label}</span></button>`;
  const grp=(rows,foot)=>`<div class="ios-group">${rows}</div>${foot?`<p class="ios-foot">${foot}</p>`:''}`;
  if(!SYNC){
    let joined=false; try{ joined=!!(JSON.parse(localStorage.getItem('mustang-splits:sync')||'{}')||{}).teamId; }catch(e){}
    return grp(`<div class="ios-row"><span class="ios-l">Team</span><span class="ios-v">${joined?'Starting…':'Not loaded'}</span></div>`,joined?'Team sync is starting. It needs signal the first time this version opens.':'Team sync loads with a connection. Everything else works offline.');
  }
  const i=syncInfo, name=esc(i.teamName||'your team');
  if(i.mode==='local') return grp(act('tmJoin','Join a team','primary-act')+act('tmCreate','Create a team'),'Share the roster, workouts, results history and live stopwatches with your other coaches.');
  if(i.mode==='out') return grp(`<div class="ios-row"><span class="ios-l">${name}</span><span class="ios-v sync-line" id="teamStatus" data-code="error">${esc(i.text)}</span></div>`)
      +grp(act('tmJoin','Enter new password','primary-act')+act('tmLeave','Leave team','destructive'));
  const head=grp(`<div class="ios-row"><span class="ios-l">${name}${i.isAdmin?' <span class="admin-badge">Admin</span>':''}</span><span class="ios-v sync-line" id="teamStatus" data-code="${i.code}">${esc(i.text)}</span></div>`)
      +`<h3 class="ios-sec">Coach phones</h3><div class="phones" id="phones"><p class="hint">Coach phones: checking…</p></div>`;
  // Admin-only actions are also enforced by firestore.rules; hiding them here is just tidiness.
  const mv=i.minVersion||'';
  if(i.isAdmin) return head+`<h3 class="ios-sec">Minimum app version</h3>`+grp(`<div class="ios-row"><span class="ios-l">Required</span><span class="ios-v" id="minVerVal">${mv?esc(mv):'Off'}</span></div>${mv===APP_VERSION?'':act('tmMinSet',`Require ${esc(APP_VERSION)}`)}${mv?act('tmMinOff','Turn off'):''}`,'Phones below it update by themselves as soon as no clock is running (from 2.9.0 on).')
      +`<h3 class="ios-sec">Admin</h3>`+grp(act('tmPw','Change team password')+act('tmAdminPw','Change admin passphrase')+act('tmRename','Rename team')+act('tmDropAdmin','Stop being admin on this device'))
      +grp(act('tmLeave','Leave team','destructive'));
  if(!i.teamHasAdmin) return head+grp(act('tmSetAdmin','Set admin passphrase','primary-act'),'This team has no admin yet. The first coach to set an admin passphrase becomes admin and is the only one who can change the team password.')+grp(act('tmLeave','Leave team','destructive'));
  return head+grp(act('tmBeAdmin','I’m the admin'),'Ask your team admin to change the password.')+grp(act('tmLeave','Leave team','destructive'));
}
function bindTeamSec(m,close){
  const on=(id,f)=>{ const b=m.querySelector(id); if(b) b.onclick=()=>{ close(); f(); }; };
  on('#tmCreate',()=>teamForm('create')); on('#tmJoin',()=>teamForm('join')); on('#tmPw',()=>teamForm('change'));
  on('#tmSetAdmin',()=>teamForm('setAdmin')); on('#tmBeAdmin',()=>teamForm('becomeAdmin')); on('#tmAdminPw',()=>teamForm('changeAdmin')); on('#tmRename',()=>teamForm('rename'));
  const setMin=async v=>{ try{ await SYNC.setMinVersion(v); toast(v?`Every phone now needs ${v} or newer`:'Minimum app version turned off'); }catch(e){ toast(e&&e.code==='permission-denied'?'Refused: publish the 2.9.0 rules first (see REQUESTS.md).':(e&&e.message)||'Something went wrong.'); } };
  on('#tmMinSet',()=>setMin(APP_VERSION)); on('#tmMinOff',()=>setMin(''));
  on('#tmDropAdmin',async()=>{
    if(!(await confirmBox('Stop being admin on this device?','Stop being admin','The team keeps its admin passphrase. Enter it again on this device anytime with "I\u2019m the admin".'))) return;
    try{ await SYNC.dropAdmin(); toast('This device is no longer admin'); }catch(e){ toast((e&&e.message)||'Something went wrong.'); }
  });
  on('#tmLeave',async()=>{
    if(!(await confirmBox(`Leave ${syncInfo.teamName||'the team'}?`,'Leave team','This phone keeps its copy of the roster and workouts and stops syncing. You can rejoin anytime with the team password.'))) return;
    await takeSnapshot('Before leaving the team');
    SYNC.leave(); toast('Left the team. This phone is local-only now.');
  });
}
const PW_HINT=`At least 12 characters. A 3–4 word passphrase is easiest to share, like "gravel otter lantern 44". Capitals and extra spaces don't matter.`;
const ADMIN_HINT=`Only you should know this. It lets a device change the team password, change this passphrase, and rename the team. At least 12 characters, different from the team password.`;
function pwField(id,label,auto){
  return `<label class="field">${label}<span class="pw"><input id="${id}" type="password" autocomplete="${auto}" autocapitalize="none" autocorrect="off" spellcheck="false"><button type="button" class="btn" data-show="${id}">Show</button></span></label>`;
}
// kind: create | join | change | setAdmin | becomeAdmin | changeAdmin | rename
function teamForm(kind){
  const title={create:'Create a team',join:syncInfo.mode==='out'?'Enter the new team password':'Join a team',change:'Change team password',
    setAdmin:'Set admin passphrase',becomeAdmin:'Enter admin passphrase',changeAdmin:'Change admin passphrase',rename:'Rename team'}[kind];
  const body={
    create:`<label class="field">Team name<input id="tmName" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="e.g. Little Chute XC"></label>${pwField('tmPw1','Team password','new-password')}<p class="hint">${esc(PW_HINT)} Share it with your coaches.</p>${pwField('tmAd1','Admin passphrase (just for you)','new-password')}<p class="hint">${esc(ADMIN_HINT)}</p>`,
    setAdmin:`${pwField('tmAd1','Admin passphrase','new-password')}<p class="hint">${esc(ADMIN_HINT)} Once it's set, only admin devices see the password options.</p>`,
    becomeAdmin:`${pwField('tmAd1','Admin passphrase','current-password')}<p class="hint">Makes this device an admin of ${esc(syncInfo.teamName||'the team')}.</p>`,
    changeAdmin:`${pwField('tmAd0','Current admin passphrase','current-password')}${pwField('tmAd1','New admin passphrase','new-password')}<p class="hint">${esc(ADMIN_HINT)} Your other admin devices stop being admin until you enter the new one there.</p>`,
    rename:`<label class="field">Team name<input id="tmName" maxlength="40" autocomplete="off" autocapitalize="words" value="${esc(syncInfo.teamName||'')}"></label>`,
    join:`${pwField('tmPw1','Team password','current-password')}<p class="hint">Ask a coach on your team for it. You only enter it once on this phone.</p>`,
    change:`${pwField('tmPw0','Current password','current-password')}${pwField('tmPw1','New password','new-password')}<p class="hint">${esc(PW_HINT)} Every other phone is signed out of the team until it enters the new password.</p>`
  }[kind];
  modal(`<h2>${title}</h2>${body}<p class="form-err" id="tmErr" hidden></p>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">${{create:'Create team',join:'Join',change:'Change password',setAdmin:'Set passphrase',becomeAdmin:'Make this device admin',changeAdmin:'Change passphrase',rename:'Save'}[kind]}</button></div>`,(m,close)=>{
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-show]').forEach(b=>b.onclick=()=>{ const i=m.querySelector('#'+b.dataset.show); const show=i.type==='password'; i.type=show?'text':'password'; b.textContent=show?'Hide':'Show'; });
    const go=m.querySelector('[data-x=yes]'), err=m.querySelector('#tmErr'), val=id=>{ const i=m.querySelector(id); return i?i.value:''; };
    go.onclick=async()=>{
      err.hidden=true; go.disabled=true; const label=go.textContent; go.textContent='Working…';
      try{
        if(kind==='create'||kind==='join') await takeSnapshot(kind==='create'?'Before creating a team':'Before joining a team');
        if(kind==='create'){ const r=await SYNC.createTeam(val('#tmName'),val('#tmPw1'),val('#tmAd1')); close(); toast(`Created ${r.teamName}. This device is its admin.`); promptMerge(); }
        if(kind==='setAdmin'){ await SYNC.setAdmin(val('#tmAd1')); close(); toast('Admin passphrase set. This device is the team admin.'); }
        if(kind==='becomeAdmin'){ await SYNC.becomeAdmin(val('#tmAd1')); close(); toast('This device is now an admin.'); }
        if(kind==='changeAdmin'){ await SYNC.changeAdmin(val('#tmAd0'),val('#tmAd1')); close(); toast('Admin passphrase changed.'); }
        if(kind==='rename'){ await SYNC.renameTeam(val('#tmName')); close(); toast('Team renamed'); }
        if(kind==='join'){ const r=await SYNC.joinTeam(val('#tmPw1')); close(); if(r.sameTeam) toast(`Back in ${r.teamName}`); else { toast(`Joined ${r.teamName}`); promptMerge(); } }
        if(kind==='change'){ await SYNC.changePassword(val('#tmPw0'),val('#tmPw1')); close(); toast('Password changed. Other phones need the new one to rejoin.'); }
      }catch(e){ err.textContent=(e&&e.message)||'Something went wrong.'; err.hidden=false; go.disabled=false; go.textContent=label; }
    };
  });
}

// First create or join of a team: share this phone's roster and workouts, or take the team's.
async function promptMerge(){
  if(!SYNC) return;
  const nA=S.roster.filter(a=>a.name.trim()).length, nW=S.workouts.length, team=esc(syncInfo.teamName||'the team');
  if(!nA && !nW){ try{ await runMerge('mine'); }catch(e){ toast((e&&e.message)||'Could not reach the team.'); } return; }
  modal(`<h2>Share with ${team}?</h2>
    <p>This phone has ${nA} runner${nA===1?'':'s'} and ${nW} workout${nW===1?'':'s'}. Adding them merges any that match what's already on the team, and keeps full names.</p>
    <p class="form-err" id="mgErr" hidden></p>
    <div class="merge-btns"><button class="btn primary" data-x="mine">Add mine to the team</button><button class="btn" data-x="team">Use the team's only</button><button class="btn" data-x="backup">Back up this phone first</button></div>`,(m,close)=>{
    $('#overlay').onclick=null; // a choice is needed; tapping outside doesn't dismiss
    m.querySelector('[data-x=backup]').onclick=()=>backup();
    const pick=async how=>{
      m.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{ await runMerge(how); close(); toast(how==='mine'?'Your runners and workouts are on the team':'Using the team’s runners and workouts'); }
      catch(e){ const er=m.querySelector('#mgErr'); er.textContent=(e&&e.message)||'Something went wrong.'; er.hidden=false; m.querySelectorAll('button').forEach(b=>b.disabled=false); }
    };
    m.querySelector('[data-x=mine]').onclick=()=>pick('mine');
    m.querySelector('[data-x=team]').onclick=()=>pick('team');
  });
}
const wkSig=w=>JSON.stringify([String(w.reps==null?1:w.reps),String(w.rest||''),(w.segments||[]).map(s=>[s.effort,+s.dist,s.mode,String(s.value),+s.cp])]);
async function runMerge(how){
  const remote=await SYNC.fetchRemote();   // needs signal; throws a friendly message if offline
  await takeSnapshot(how==='mine'?'Before adding this phone to the team':'Before using the team\u2019s lists only');
  const inUse=new Set(S.watches.filter(w=>w.status==='running'||w.status==='paused').map(w=>w.workoutId));
  const mapA={}, mapW={};
  if(how==='mine'){
    const k=a=>a.name.trim().toLowerCase()+'\n'+grpOf(a).toLowerCase();
    const rA=new Map(remote.athletes.map(a=>[k(a),a]));
    S.roster=S.roster.filter(a=>a.name.trim()).map(a=>({...a,name:a.name.trim().slice(0,30)})).filter(a=>{ const m=rA.get(k(a)); if(m){ mapA[a.id]=m.id; return false; } return true; });
    const taken=new Set(remote.workouts.map(w=>String(w.name||'').trim().toLowerCase()));
    S.workouts=S.workouts.filter(w=>{
      const same=remote.workouts.find(x=>String(x.name||'').trim().toLowerCase()===String(w.name||'').trim().toLowerCase());
      if(!same) return true;
      if(wkSig(same)===wkSig(w) && !inUse.has(w.id)){ mapW[w.id]=same.id; return false; }
      let i=2; while(taken.has(`${w.name} (${i})`.toLowerCase())) i++;
      w.name=`${w.name} (${i})`; taken.add(w.name.toLowerCase()); return true;
    });
  } else {
    S.roster=[]; S.workouts=S.workouts.filter(w=>inUse.has(w.id)); // a running plan is never pulled out from under a stopwatch
  }
  S.watches.forEach(w=>{ w.athleteIds=w.athleteIds.map(id=>mapA[id]||id); if(mapW[w.workoutId]) w.workoutId=mapW[w.workoutId]; });
  if(how==='mine'){ const P={}; Object.entries(S.prs||{}).forEach(([id,l])=>{ P[mapA[id]||id]=l; }); S.prs=P; } // PRs follow merged runners
  else { S.courses=[]; S.prs={}; S.series=[]; S.meets=[]; }
  // Bring the team's items in now so remapped stopwatches never see a missing workout.
  remote.athletes.forEach(a=>{ if(!S.roster.some(x=>x.id===a.id)) S.roster.push(a); });
  remote.workouts.forEach(w=>{ if(!S.workouts.some(x=>x.id===w.id)) S.workouts.push(w); });
  CC={}; editingId=null; refreshIdle(); saveNow();
  SYNC.start();
  rerenderAfterSync(); if(curTab==='watches') renderGrid();
  setTimeout(offerUpload,900);
}
// Races saved on this phone before it joined the team: offer to put them in Team history.
function offerUpload(){
  const L=raceLog().filter(x=>!x.uploaded); if(!L.length||!SYNC||syncMode()!=='joined') return;
  modal(`<div class="up-sheet"><h2>Upload ${L.length} race${L.length===1?'':'s'}?</h2><p>This phone has ${L.length===1?'a race':'races'} saved only here: ${L.slice(0,3).map(x=>esc((x.race.name||'Race')+' ('+x.date+')')).join(', ')}${L.length>3?'…':''}. Upload ${L.length===1?'it':'them'} to Team history so every coach sees ${L.length===1?'it':'them'} and goals can use ${L.length===1?'it':'them'}.</p>
    <div class="modal-btns"><button class="btn" data-x="no">Not now</button><button class="btn primary" data-x="yes">Upload</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ close(); uploadRaces(); };
  });
}
function uploadRaces(){
  const L=raceLog().filter(x=>!x.uploaded); let n=0;
  L.forEach(x=>{ if(SYNC.saveHistory({kind:'race',date:x.date,savedAtMs:x.savedAtMs,watches:[],race:x.race,edits:x.edits||[]})){ x.uploaded=true; logPut(x); n++; } });
  save(); if(curTab==='results') renderResults(); toast(n?`Uploaded ${n} race${n===1?'':'s'} to Team history`:'Join a team first');
}

/* ---------- results views, runner cards, trends, context tags (2.8) ---------- */
// Everything here is read from saved races (Team history, all of it, plus Races on this phone), with corrections and
// tags applied by modelOf(). Adjusted times take out each race day's difficulty (dayRatings(), 3.1; before 3.1 a
// factor per course). Tags are append-only edits ({op:'tag', rid, tags, note}) like corrections.
const TAGS_RUNNER=['Injury','Illness','Fell','Shoe issue','Heavy training week','Course long/short'];
const TAGS_RACE=['Heat','Mud','Wind'];
const exTagged=()=>S.settings.excludeTagged!==false; // "Leave tagged results out of trends" (on unless switched off)
const teamEntry=id=>teamHistory.find(x=>x.id===id)||teamRaces.find(x=>x.id===id);
function allRaces(ms){ return memoize('all|'+!!ms,()=>allRaces0(ms)); }
function allRaces0(ms,handOnly){ // every saved race, newest first, one copy each; official results too (MS only when asked)
  const out=[], seen=new Set();
  const add=(h,where)=>{ if(!h||h.deleted||!h.race||!h.race.rows) return; const M=where==='official'?mapModel(modelOf(h)):attachMeet(mapModel(modelOf(h)),h.date), k=M.raceId||h.id; if(seen.has(k)) return; seen.add(k); // merges mapped (2.9.2); same-day meet (2.11.1)
    const fin=finishOf(M.checkpoints), fi=fin?M.checkpoints.map(c=>c.dist).lastIndexOf(fin):-1;
    out.push({h,where,M,at:dayMs(h.date)||h.savedAtMs||0,date:h.date,fin,fi}); };
  teamHistory.filter(h=>h.kind==='race').forEach(h=>add(h,'team'));
  teamRaces.forEach(h=>add(teamHistory.find(x=>x.id===h.id)||h,'team'));
  raceLog().forEach(h=>add(h,'local'));
  if(!handOnly) (ms?offEntries():offHS()).forEach(h=>add(h,'official'));
  return out.sort((a,b)=>b.at-a.at);
}
const tagOf=(M,rid)=>{ const t=(M.tags||{})[rid]; return t&&(t.tags.length||t.note)?t:null; };
const isTagged=(M,rid)=>!!((tagOf(M,rid)||{tags:[]}).tags.length||(M.raceTags||[]).length);
// One runner's finishes, newest first: time, pace per mile, team place, tags.
function resultsFor(a,ms){ return memoize('res|'+a.id+'|'+a.name+'|'+!!ms,()=>resultsFor0(a,ms)); }
// Official and hand-timed on the same day at the same distance: one result, the official time, the hand time beside it.
function resultsFor0(a,ms){
  const L=allRaces(ms).map(x=>{ const row=x.M.rows.find(r=>r.id===a.id)||x.M.rows.find(r=>r.name===a.name); if(!row||x.fi<0||!row.cells[x.fi]) return null;
    const t=row.cells[x.fi].t; return {...x,row,t,pace:t/(x.fin/MILE),place:1+x.M.rows.filter(r=>r.cells[x.fi]&&r.cells[x.fi].t<t).length,tagged:isTagged(x.M,row.id),tag:tagOf(x.M,row.id),official:x.where==='official'}; }).filter(Boolean);
  typedResults(a.id).forEach(p=>{ const at=p.date?dayMs(p.date):0, M={name:p.meet||(p.src?'Typed result':'Typed PR (date unknown)'),checkpoints:[{id:'fin',name:'Finish',dist:p.dist}],rows:[],tags:{},raceTags:[]};
    L.push({h:{id:'typed:'+(p.id||p.dist+'-'+p.t),level:'HS',date:p.date||''},where:'typed',M,at,date:p.date||'',fin:p.dist,fi:0,row:{id:a.id,name:a.name,cells:[{t:p.t}]},t:p.t,pace:p.t/(p.dist/MILE),place:null,tagged:false,tag:null,official:p.src==='official',typed:true}); }); // 2.10
  L.sort((x,y)=>y.at-x.at);
  const off=L.filter(x=>x.official);
  return L.filter(x=>{ if(x.official) return true; const o=off.find(y=>y.date===x.date&&sameDist(y.fin,x.fin)); if(!o) return true; o.hand=x; if(x.tagged){ o.tagged=true; o.tag=o.tag||x.tag; } return false; });
}
// Race-day difficulty (3.1). Replaces the 2.8 course factors (one factor per course, chained from Winagamie GC), which
// treated two layouts of one venue, and every year's layout, as one course. Each season is rated on its own:
// - every result becomes a 5K-equivalent log time (Riegel, exponent RIEGEL), one per runner per race day (official
//   preferred). Injury/Illness-tagged results never count; other runner tags only while "Leave tagged results out of
//   trends" is on. Race tags (Heat, Mud, Wind) stay in: they're part of what a rating measures.
// - a runner's fitness at a race = a straight line through their OTHER rated races that season, its slope pulled
//   toward the team's typical slope (ridge, RD_LAMBDA), so one fast or slow meet can't dominate.
// - a day's rating d = the team's robust mean of (actual − what each runner's trend predicts without that day). The
//   other races are themselves adjusted, so this repeats until it settles.
// - ratings are centred on the season's average race day, and any straight-line drift through the season is taken
//   out (a season-long drift can't be told apart from fitness gains, which the runners' trends carry).
// - a day needs RD_MIN runners who each have RD_OTHER other rated races that season; otherwise "Not enough data".
// - confidence: se = sd/√n of the runners' differences (High: 8+ runners and se ≤ 0.7%; Medium: se ≤ 1.5%; else Low);
//   early in a season it's capped (3 rated days: Low; 4: at most Medium), since only part of a pattern can be told apart then.
// Adjusted time = time ÷ e^d: the raw time with that day's difficulty taken out. Raw times stay the record.
const RD_MIN=5, RD_OTHER=2, RD_LAMBDA=1, RD_ITER=60, RIEGEL=1.06, RD_UNIT=30*864e5;
const ADJ_NOTE='Adjusted times remove how hard each race day was, so trends reflect fitness, not the course.';
function dayRatings(){ return memoize('rd',dayRatings0); }
function dayRatings0(){
  const ex=exTagged(), per={}, A=allRaces();
  A.forEach(x=>{ if(x.date) (per[x.date]||(per[x.date]=new Set())).add(x.M.meetId||''); });
  const key=x=>!x||!x.date||x.where==='typed'?null:x.date+([...(per[x.date]||[])].filter(Boolean).length>1?'|'+(x.M.meetId||''):''); // a race day; two meets on one date stay apart
  const recs={}, info={}, med=v=>{ const q=[...v].sort((p,r)=>p-r), n=q.length; return n?(n%2?q[(n-1)/2]:(q[n/2-1]+q[n/2])/2):0; };
  A.forEach(x=>{ const k=key(x); if(!k||x.fi<0||!(x.fin>=3000&&x.fin<=10000)) return;
    const inf=info[k]||(info[k]={key:k,date:x.date,at:dayMs(x.date)||x.at,season:seasonOf(dayMs(x.date)||x.at),name:raceMeet(x)}); if(x.M.meetId&&!inf.meet){ inf.meet=1; inf.name=raceMeet(x); } (inf.races||(inf.races=[])).push(x);
    x.M.rows.forEach(r=>{ const c=r.cells[x.fi]; if(!c||!(c.t>0)) return; const tg=tagOf(x.M,r.id), tags=tg?tg.tags||[]:[];
      if(tags.some(t=>t==='Injury'||t==='Illness')||(ex&&tags.length)) return;
      const rk=r.id+'|'+k, rec={rid:r.id,k,x:inf.at/RD_UNIT,y:Math.log(c.t)+RIEGEL*Math.log(5000/x.fin),t5:c.t*Math.pow(5000/x.fin,RIEGEL),off:x.where==='official'};
      if(recs[rk]){ if(rec.off&&!recs[rk].off) recs[rk]=rec; return; } recs[rk]=rec; }); }); // official + hand-timed on one day: once, official
  const R=Object.values(recs), conf={};
  const group=L=>{ const by={}; L.forEach(r=>(by[r.rid]||(by[r.rid]=[])).push(r)); return by; };
  const ridge=(pts,bT)=>{ const n=pts.length, xm=pts.reduce((s,p)=>s+p[0],0)/n, ym=pts.reduce((s,p)=>s+p[1],0)/n; let sxx=0,sxy=0; pts.forEach(([x,y])=>{ sxx+=(x-xm)**2; sxy+=(x-xm)*(y-ym); }); const b=(sxy+RD_LAMBDA*bT)/(sxx+RD_LAMBDA); return x=>ym+b*(x-xm); };
  const robust=e=>{ const m=med(e), c=Math.max(2.5*1.4826*med(e.map(v=>Math.abs(v-m))),0.01); return e.reduce((s,v)=>s+Math.min(m+c,Math.max(m-c,v)),0)/e.length; };
  // centre on the average day and take out a straight-line drift through the season (H), over one season's days
  const Hof=(D,col)=>{ const xs=D.map(k=>info[k].at/RD_UNIT), n=D.length, xm=xs.reduce((s,v)=>s+v,0)/n, ym=col.reduce((s,v)=>s+v,0)/n; let sxx=0,sxy=0; xs.forEach((x,i)=>{ sxx+=(x-xm)**2; sxy+=(x-xm)*(col[i]-ym); }); const b=n>=3&&sxx>0?sxy/sxx:0; return col.map((v,i)=>v-ym-b*(xs[i]-xm)); };
  // which days can be rated: RD_MIN runners with RD_OTHER other rated races, until nothing changes
  const seasons=[...new Set(Object.values(info).map(i=>i.season))], E={};
  seasons.forEach(y=>{ const L=R.filter(r=>info[r.k].season===y); let days=new Set(L.map(r=>r.k)), cnt={}, first=true;
    for(;;){ const by=group(L.filter(r=>days.has(r.k))); cnt={};
      L.forEach(r=>{ const o=(by[r.rid]||[]).filter(q=>q.k!==r.k).length; if(o>=RD_OTHER) cnt[r.k]=(cnt[r.k]||0)+1; });
      if(first){ Object.keys(cnt).forEach(k=>{ info[k].nOk=cnt[k]; }); first=false; } // shown for a day without a rating: counted against the whole season
      const keep=new Set([...days].filter(k=>(cnt[k]||0)>=RD_MIN)); if(keep.size===days.size) break; days=keep; }
    L.forEach(r=>{ info[r.k].nAll=(info[r.k].nAll||0)+1; if(days.has(r.k)) info[r.k].nOk=cnt[r.k]||0; });
    const D=[...days].sort((p,q)=>info[p].at-info[q].at); if(!D.length) return; const U=L.filter(r=>days.has(r.k)), by=group(U);
    E[y]={D,U,by,use:U.filter(r=>by[r.rid].length-1>=RD_OTHER)}; });
  // 3.2: a day's difficulty = its weather (w, from the temperature + dew point guide and the fitted wind, mud and cold
  // costs, as it was: not centred) + everything else, the course (c, centred and without a season-long drift).
  // A day with no weather gets the season's average weather.
  const wrec={}; Object.values(info).forEach(i=>{ const r=wxForDay(i.races||[]); if(r) wrec[i.key]=r; });
  const wOf=(k,beta)=>{ const r=wrec[k]; return r&&r.status==='ok'?wxFeat(r.wx).reduce((s,v,j)=>s+v*beta[j],0):null; };
  const solve=beta=>{ const d={}, S2={};
    Object.entries(E).forEach(([y,{D,U,by,use}])=>{ const known=D.filter(k=>wOf(k,beta)!=null), wm=known.length?known.reduce((s,k)=>s+wOf(k,beta),0)/known.length:0, w={};
      D.forEach(k=>{ const v=wOf(k,beta); w[k]=v==null?wm:v; d[k]=w[k]; });
      let res={}, who={}, c={};
      for(let it=0;it<RD_ITER;it++){
        const sl=[]; Object.values(by).forEach(rs=>{ if(rs.length<3) return; const f=ridge(rs.map(r=>[r.x,r.y-d[r.k]]),0); sl.push(f(1)-f(0)); }); // each runner's own slope
        const bT=sl.length?med(sl):0; res={}; who={};
        use.forEach(r=>{ const f=ridge(by[r.rid].filter(q=>q!==r).map(q=>[q.x,q.y-d[q.k]]),bT); (res[r.k]||(res[r.k]=[])).push(r.y-f(r.x)); (who[r.k]||(who[r.k]=[])).push(r.rid); });
        const cc=Hof(D,D.map(k=>robust(res[k])-w[k])); let ch=0;
        D.forEach((k,i)=>{ c[k]=cc[i]; const v=w[k]+cc[i]; ch=Math.max(ch,Math.abs(v-d[k])); d[k]=v; }); if(ch<1e-6) break; }
      D.forEach(k=>{ d[k]-=wm; }); // against the season's average race day (average weather, average course)
      S2[y]={D,U,res,who,c,w,wm,known}; });
    return {d,S2}; };
  let beta=WX_PRIOR.slice(), out=solve(beta);
  // wind, mud and cold costs: fitted to this team's days (ridge toward typical values, worth WX_PRIOR_DAYS days); heat
  // stays the published guide. Then solved again with them.
  const rows=[]; Object.values(out.S2).forEach(({D,c,known})=>{ const K=D.filter(k=>known.includes(k)); if(K.length<3) return;
    const F2=K.map(k=>wxFeat(wrec[k].wx)), z=Hof(K,K.map((k,i)=>c[k]+[1,2,3].reduce((s,j)=>s+beta[j]*F2[i][j],0))), X=[1,2,3].map(j=>Hof(K,F2.map(f=>f[j])));
    K.forEach((k,i)=>rows.push({x:X.map(col=>col[i]),y:z[i]})); });
  if(rows.length>=3){ const A2=[[0,0,0],[0,0,0],[0,0,0]], bv=[0,0,0];
    rows.forEach(r=>{ for(let i=0;i<3;i++){ bv[i]+=r.x[i]*r.y; for(let j=0;j<3;j++) A2[i][j]+=r.x[i]*r.x[j]; } });
    for(let i=0;i<3;i++){ const lam=WX_PRIOR_DAYS*Math.max(A2[i][i]/rows.length,1e-9); A2[i][i]+=lam; bv[i]+=lam*WX_PRIOR[i+1]; }
    const b3=solveLin(A2,bv).map(v=>Math.max(0,v)); beta=[WX_PRIOR[0],...b3]; out=solve(beta); }
  const d=out.d, wxPart={}, wxRec={}; let ss=0, se2=0;
  Object.values(out.S2).forEach(({D,U,res,who,c,w,wm,known})=>{
    D.forEach(k=>{ const e=res[k], n=e.length, m=e.reduce((s,v)=>s+v,0)/n, sd=n>1?Math.sqrt(e.reduce((s,v)=>s+(v-m)**2,0)/(n-1)):0, se=sd/Math.sqrt(n);
      const t5=med(U.filter(r=>r.k===k).map(r=>r.t5));
      const lv=n>=8&&se<=0.007?'High':se<=0.015?'Medium':'Low', cap=D.length<=3?'Low':D.length===4&&lv==='High'?'Medium':lv; // early season: few days to compare
      conf[k]={n,sd,se,t5,days:D.length,diffs:e.map((v,j)=>({rid:who[k][j],e:v})),secs:t5*(1-Math.exp(-d[k])),pm:1.96*se*t5,level:cap,early:cap!==lv};
      if(known.includes(k)){ wxPart[k]=w[k]-wm; ss+=d[k]*d[k]; se2+=c[k]*c[k]; } }); });
  Object.keys(wrec).forEach(k=>{ wxRec[k]=wrec[k]; });
  return {d,conf,info,key,rated:Object.keys(d).length,wxPart,wxRec,wxBeta:beta,wxShare:ss>0?Math.max(0,1-se2/ss):null};
}
const dayFactor=(F,x)=>{ const k=F.key(x); return k!=null&&F.d[k]!=null?Math.exp(F.d[k]):null; };
const adjPace=(x,F)=>{ const f=dayFactor(F,x); return f?x.pace/f:null; };
// A race day's rating in words: "0:24 harder than an average race day (±0:08, for a 21:10.0 5K runner) · 12 runners".
function ratingText(F,k){ const c=F.conf[k], i=F.info[k]; if(!c) return i?`Not enough data (${i.nOk||0} runner${i.nOk===1?'':'s'} with ${RD_OTHER}+ other races; ${RD_MIN} needed)`:'';
  const s=Math.abs(c.secs), w=s<1?'about the same as an average race day':`${fmtSec(s,0)} ${c.secs>0?'harder':'easier'} than an average race day`;
  return `${w} (±${fmtSec(c.pm,0)}, for a ${fmtSec(c.t5,0)} 5K runner) · ${c.n} runners${c.early?` · early season (${c.days} race days rated)`:''}`; }
const ratingBadge=(F,k)=>{ const c=F.conf[k]; return c?`<span class="rd-conf rd-${c.level.toLowerCase()}">${c.level==='Low'?'⚠ ':''}${c.level} confidence</span>`:'<span class="rd-conf rd-none">Not enough data</span>'; };
// Improving / Steady / Slowing over the last 3-4 untagged races at one distance (adjusted pace, or raw on one course).
function trendOf(res,F){
  const L=res.filter(x=>!(exTagged()&&x.tagged)); if(!L.length) return {label:'Not enough races yet'};
  const same=L.filter(x=>sameDist(x.fin,L[0].fin)), adjL=same.filter(x=>adjPace(x,F)!=null), course=L[0].M.courseId, oneL=course?same.filter(x=>x.M.courseId===course):[];
  const adj=adjL.length>=3, use=(adj?adjL:oneL).slice(0,4).reverse(); if(use.length<3) return {label:'Not enough races yet'};
  const v=use.map(x=>adj?adjPace(x,F):x.pace), n=v.length, mx=(n-1)/2, my=v.reduce((a,b)=>a+b,0)/n;
  const slope=v.reduce((s,y,i)=>s+(i-mx)*(y-my),0)/v.reduce((s,_,i)=>s+(i-mx)**2,0), first=my-slope*mx, last=my+slope*mx, ch=(last-first)/first;
  return {label:ch<-0.015?'Improving':ch>0.015?'Slowing':'Steady',change:ch,adjusted:adj,n};
}
const noFactorNote=(L,F)=>{ const ks=[...new Set(L.map(x=>F.key(x)).filter(k=>k&&F.d[k]==null&&F.info[k]))]; // race days without a rating
  return ks.length?`Not enough data to rate ${ks.map(k=>`${F.info[k].name} (${fmtDay(F.info[k].date)})`).join(', ')}: a race day needs ${RD_MIN} runners with ${RD_OTHER}+ other races that season.`:''; };
// How a runner splits races: first segment vs race pace, and where they slow most.
function pacingOf(res){
  const firsts=[], worst={};
  res.forEach(x=>{ if(x.typed||x.M.checkpoints.length<2) return; // only races with checkpoint splits (not typed or official finish-only results)
    const sp=splitsOf(x.M.checkpoints,x.row.cells), p=sp.find(s=>s&&s.pace!=null); if(!p||sp[x.fi]==null) return;
    firsts.push((p.pace-x.pace)/x.pace);
    let w=null; sp.forEach((s,ci)=>{ if(s&&s.chg!=null&&s.chg>0&&(!w||s.chg>w.c)) w={c:s.chg,name:x.M.checkpoints[ci].name}; }); if(w) worst[w.name]=(worst[w.name]||0)+1; });
  if(firsts.length<2) return '';
  const d=firsts.reduce((a,b)=>a+b,0)/firsts.length, pct=Math.abs(Math.round(d*1000)/10), most=Object.entries(worst).sort((a,b)=>b[1]-a[1])[0];
  return (d<-0.015?`Starts fast: first segment ${pct}% quicker than race pace on average`:d>0.015?`Starts slow: first segment ${pct}% slower than race pace on average`:'Even pacing: first segment within 1.5% of race pace')
    +(most&&most[1]>=2?`; slows most by ${most[0]}.`:'.')+` (${firsts.length} races)`;
}

// ---- Results views: Meets | Runners | Team ----
let rvRunner=null, rvListY=0, rvQuery='', rvChart='raw';
function showResultsView(v){
  v=v||S.settings.resView||'meets'; S.settings.resView=v;
  document.querySelectorAll('[data-rv]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rv===v)));
  $('#rvMeets').hidden=v!=='meets'; $('#rvRunners').hidden=v!=='runners'; $('#rvTeam').hidden=v!=='team';
  if(v==='runners') renderRunners(); if(v==='team') renderTeamView();
  else { const cur=seasonOf(Date.now()), yrs=[...new Set([cur,...allRaces().map(x=>seasonOf(x.at))])].sort((a,b)=>b-a); seasonPicker(yrs,tvSeason!=null&&yrs.includes(tvSeason)?tvSeason:cur); }
  navBar();
  if(v!=='meets' && SYNC && syncMode()==='joined'){ const had=new Set(allRaces().map(x=>x.h.id)); loadTeamRaces().then(()=>{ if(curTab==='results'&&S.settings.resView===v&&allRaces().some(x=>!had.has(x.h.id))){ if(v==='runners') renderRunners(); else renderTeamView(); } }); }
}
const exSwitch=()=>`<label class="set-row ex-row"><span>Leave tagged results out of trends<span class="hint">Injury, Illness, Fell, Shoe issue, Heavy training week, Course long/short, and races tagged Heat, Mud or Wind</span></span><input type="checkbox" class="switch" data-extag${exTagged()?' checked':''}></label>`;
const trendChip=t=>`<span class="trend t-${slug(t.label)}">${esc(t.label)}</span>`;
function renderRunners(){
  const box=$('#rvRunners'); if(rvRunner) return renderRunnerCard(box,rvRunner);
  const F=dayRatings(), q=rvQuery.toLowerCase(), people=S.roster.filter(a=>a.name.trim()&&(!q||a.name.toLowerCase().includes(q)));
  // 2.12: sorted by the switch (season average 5K by default; no race this season = last), the average on each row
  const sec=(title,L)=>L.length?`<h3 class="rv-gh" data-g="${title==='Girls'?'G':title==='Boys'?'B':''}">${title} <span class="n">${L.length}</span></h3>${sortRunners(L).map(a=>{ const R=resultsFor(a), sb=sbOf(a,seasonOf(Date.now())), v=seasonAvg(a);
      return `<button type="button" class="menu-item rv-row" data-runner="${a.id}"><span><b>${esc(a.name)}</b> ${R.length?trendChip(trendOf(R,F)):''}</span><small>${v?`<span class="rv-avg">Avg ${fmtRace(v.t)}${v.adj?' adj.':''}</span> · ${v.n} race${v.n===1?'':'s'}`:'No 5K this season'}${sb?` · SB ${fmtRace(sb.t)}`:''}${R.length?` · Last: ${esc(R[0].M.name||'Race')} ${fmtRace(R[0].t)}`:''}</small></button>`; }).join('')}`:'';
  box.innerHTML=`<input class="rv-search" data-rvq placeholder="Find a runner" value="${esc(rvQuery)}" autocomplete="off" aria-label="Find a runner">${sortSwitch('runners')}
    ${sec('Girls',people.filter(a=>a.gender==='G'))}${sec('Boys',people.filter(a=>a.gender==='B'))}${sec('Not marked Girls or Boys',people.filter(a=>a.gender!=='G'&&a.gender!=='B'))}
    <p class="hint">Average = this season’s 5K results, adjusted (adj.) where the race day has a rating, official times when there are both, Injury/Illness-tagged races left out.</p><p class="hint adj-note">${ADJ_NOTE}</p>
    ${people.length?'':'<p class="empty">No runners match.</p>'}`;
}
function renderRunnerCard(box,id){
  const a=S.roster.find(x=>x.id===id); if(!a){ rvRunner=null; return renderRunners(); }
  const R=resultsFor(a), F=dayRatings(), s0=seasonStart(), season=R.filter(x=>x.at>=s0), tr=trendOf(R,F);
  // PR and season best per distance
  const dists=[...new Set([...R.map(x=>Math.round(x.fin)),...((S.prs[a.id]||[]).filter(p=>!p.deleted).map(p=>Math.round(p.dist)))])].sort((p,q)=>q-p);
  const bestRows=dists.map(d=>{ const at=R.filter(x=>sameDist(x.fin,d)), pr=prOf(a.id,d), raced=at.slice().sort((p,q)=>p.t-q.t)[0], sb=at.filter(x=>x.at>=s0).sort((p,q)=>p.t-q.t)[0];
    const prT=pr&&raced?Math.min(pr,raced.t):(pr||(raced&&raced.t));
    return `<tr><td>${esc(distLabel(d))}</td><td>${prT?fmtRace(prT):'–'}</td><td>${sb?`${fmtRace(sb.t)}<span class="sub2">${esc(sb.M.name||'Race')}, ${esc(fmtDay(sb.date))}</span>`:'–'}</td></tr>`; }).join('');
  // every race this season, with vs season best at the time
  const rows=season.map((x,i)=>{ const before=season.slice(i+1).filter(y=>sameDist(y.fin,x.fin)).map(y=>y.t), sbt=before.length?Math.min(...before):null;
    const vs=sbt==null?'first':x.t<sbt?'SB':'+'+fmtSec(x.t-sbt,1); const c=raceCalc(x.M).rows.find(z=>z.r.id===x.row.id)||{};
    return `<button type="button" class="menu-item rv-race" data-openrace="${x.where}|${esc(x.h.id)}|${esc(x.row.id)}"><span><b>${esc(x.M.name||'Race')}</b> · ${esc(fmtDay(x.date))}${x.tagged?' <span class="tagi" title="Tagged">⚑</span>':''}</span>
      <small>${x.official?'<span class="off-badge">Official</span> ':''}${fmtRace(x.t)}${x.hand?` (hand-timed ${fmtRace(x.hand.t)})`:''} · ${fmtSec(x.pace,0)}/mi${rvChart==='adj'&&adjPace(x,F)!=null?` (adjusted ${fmtSec(adjPace(x,F),0)}/mi)`:''} · ${ord(x.place)} on the team · ${vs==='SB'?'season best':vs==='first'?'first race at '+esc(distLabel(x.fin)):'vs SB '+vs}</small>${badges(c)?`<span class="rc-badges">${badges(c)}</span>`:''}${x.tag?`<small class="tagline">⚑ ${esc(x.tag.tags.join(', '))}${x.tag.note?' · '+esc(x.tag.note):''}</small>`:''}${(()=>{ const w=wxForRace(x), f=flagsHTML(w); return f?`<small class="wx-flags">${f}</small>`:''; })()}</button>`; }).join('');
  const lastYear=season.filter(x=>x.M.seriesId).map(x=>{ const ly=R.find(y=>y.M.seriesId===x.M.seriesId&&gkey(y.M.division)===gkey(x.M.division)&&seasonOf(y.at)===seasonOf(x.at)-1); if(!ly) return '';
    const d=x.t-ly.t; return `<tr><td>${esc(seriesName(x.M.seriesId))}</td><td>${fmtRace(ly.t)}</td><td>${fmtRace(x.t)}</td><td class="${d<0?'chg faster':'chg slower'}">${fmtDelta(d)}</td></tr>`; }).filter(Boolean).join('');
  const pacing=pacingOf(R);
  navBar(); // 3.0: "‹ Runners" in the nav bar
  box.dataset.g=a.gender||''; // 3.3.1: a boy's charts in Boys blue
  box.innerHTML=`    <h2 class="rv-name">${esc(a.name)} ${R.length?trendChip(tr):''}</h2><p class="hint">${esc([grpOf(a),a.gender==='G'?'Girls':a.gender==='B'?'Boys':''].filter(Boolean).join(' · '))}${tr.change!=null?` · last ${tr.n} races ${tr.change>0?'+':''}${(tr.change*100).toFixed(1)}% (${tr.adjusted?'adjusted':'same course'})`:''}</p>
    <h3>PR and season best</h3>${dists.length?`<div class="tbl-wrap"><table class="race-table"><thead><tr><th>Distance</th><th>PR</th><th>Season best</th></tr></thead><tbody>${bestRows}</tbody></table></div>`:'<p class="hint">No races or PRs yet.</p>'}
    <h3>Season chart</h3>${seasonChart(season,F,a)}
    ${vsSbBars(season)?`<h3>Each 5K vs season best</h3>${vsSbBars(season)}`:''}
    <h3>Compare runners</h3><div class="cmp-wrap">${compareChart(a)}</div>
    <h3>This season <span class="n">${season.length} race${season.length===1?'':'s'}. Tap one to open it.</span></h3><div class="menu-list">${rows||'<p class="hint">No races this season yet.</p>'}</div>${rows.includes('wx-flag')?WX_ATTR:''}
    <h3>Pacing</h3><p>${esc(pacing||'Needs 2 or more races with checkpoint splits.')}</p>
    <h3>Suggested training paces <span class="n">estimates</span></h3>${paceTableHTML(a)}
    ${lastYear?`<h3>Last year at these meets</h3><div class="tbl-wrap"><table class="race-table"><thead><tr><th>Meet</th><th>Last year</th><th>This year</th><th>Change</th></tr></thead><tbody>${lastYear}</tbody></table></div>`:''}
    ${careerHTML(a)}`;
  box.insertAdjacentHTML('beforeend',`<p class="hint adj-note">${ADJ_NOTE}</p>`); // 3.4: once per card
  bindChartHover(box); inlineKeys(box);
}
// ---- Career (2.9): high school 5K by default; middle school in its own section ----
const ARC=[['Early','to Sep 10'],['Mid','Sep 11 – Oct 5'],['Late','Oct 6 on']];
const arcOf=date=>{ const m=+date.slice(5,7), d=+date.slice(8,10); return m<9||(m===9&&d<=10)?0:(m===9||(m===10&&d<=5))?1:2; };
function careerHTML(a){
  const all=resultsFor(a,true).filter(x=>x.at>0), HS=all.filter(x=>x.h.level!=='MS'), MS=all.filter(x=>x.h.level==='MS'), K5=HS.filter(x=>sameDist(x.fin,5000)).slice().reverse(); // oldest first
  if(!HS.length&&!MS.length) return '';
  // grade per season: from official results, carried to other seasons by the year difference
  const gs=all.filter(x=>x.row.grade).map(x=>[seasonOf(x.at),x.row.grade]), gradeOf=y=>{ const g=gs[0]; return g?g[1]+(y-g[0]):null; };
  const tag=x=>x.official?' <span class="off-badge">Official</span>':'';
  // 5K PR progression: each new best, as a step line
  const steps=[]; K5.forEach(x=>{ if(!steps.length||x.t<steps[steps.length-1].t) steps.push(x); });
  const prChart=steps.length>=2?stepChart(steps,K5):'';
  const prRows=steps.slice().reverse().map(x=>`<tr><td><b>${fmtRace(x.t)}</b></td><td class="wrap">${esc(x.M.name||'Race')}${tag(x)}<span class="sub2">${esc(fmtDay(x.date))} · ${esc(seasonLabel(seasonOf(x.at)))}</span></td></tr>`).join('');
  // every season by grade
  const seasons=[...new Set(HS.map(x=>seasonOf(x.at)))].sort((p,q)=>q-p);
  let prevSB=null; const sbBy={}; seasons.slice().reverse().forEach(y=>{ const L=K5.filter(x=>seasonOf(x.at)===y); sbBy[y]=L.length?Math.min(...L.map(x=>x.t)):null; });
  const seasonRows=seasons.map(y=>{ const L=HS.filter(x=>seasonOf(x.at)===y), sb=sbBy[y], prior=seasons.filter(z=>z<y&&sbBy[z]!=null)[0], d=sb!=null&&prior!=null?sb-sbBy[prior]:null, g=gradeOf(y);
    return `<tr><td>${esc(seasonLabel(y))}${g?`<span class="sub2">grade ${g}</span>`:''}</td><td>${L.length}</td><td>${sb!=null?fmtRace(sb):'–'}</td><td class="${d==null?'':d<0?'chg faster':'chg slower'}">${d==null?'–':fmtDelta(d)}</td></tr>`; }).join('');
  // the same meet year over year (by series, never by typed name)
  const bySeries={}; HS.filter(x=>x.M.seriesId&&sameDist(x.fin,5000)).forEach(x=>{ const y=seasonOf(x.at), o=bySeries[x.M.seriesId]||(bySeries[x.M.seriesId]={}); if(!o[y]||x.t<o[y].t) o[y]=x; });
  const yoy=Object.entries(bySeries).filter(([,o])=>Object.keys(o).length>=2).map(([sid,o])=>{ const ys=Object.keys(o).map(Number).sort();
    return `<div class="yoy"><b>${esc(seriesName(sid))}</b><span>${ys.map((y,i)=>`${esc(seasonLabel(y))}: <b>${fmtRace(o[y].t)}</b>${i?` <span class="${o[y].t<o[ys[i-1]].t?'chg faster':'chg slower'}">${fmtDelta(o[y].t-o[ys[i-1]].t)}</span>`:''}`).join(' · ')}</span></div>`; }).join('');
  // early / mid / late season arc (best pace per mile in each part; any distance)
  const arcRows=seasons.map(y=>{ const L=HS.filter(x=>seasonOf(x.at)===y), best=[0,1,2].map(i=>{ const P=L.filter(x=>arcOf(x.date)===i).map(x=>x.pace); return P.length?Math.min(...P):null; });
    const f=best.find(v=>v!=null), l=[...best].reverse().find(v=>v!=null);
    return `<tr><td>${esc(seasonLabel(y))}</td>${best.map(v=>`<td>${v!=null?fmtSec(v,0):'–'}</td>`).join('')}<td class="${f!=null&&l!=null&&l<f?'chg faster':f!=null&&l!=null&&l>f?'chg slower':''}">${f!=null&&l!=null&&best.filter(v=>v!=null).length>1?fmtDelta(l-f):'–'}</td></tr>`; }).join('');
  // official vs hand-timed
  const both=HS.filter(x=>x.official&&x.hand).map(x=>`<tr><td>${esc(fmtDay(x.date))}</td><td>${esc(x.M.name||'Race')}</td><td>${fmtRace(x.t)}</td><td>${fmtRace(x.hand.t)}</td><td>${fmtDelta(x.hand.t-x.t)}</td></tr>`).join('');
  // middle school
  const msD=[...new Set(MS.map(x=>Math.round(x.fin)))].sort((p,q)=>q-p);
  const msHTML=MS.length?`<h3>Middle school</h3><div class="tbl-wrap"><table class="race-table"><thead><tr><th>Distance</th><th>Best</th><th>Races</th></tr></thead><tbody>${msD.map(d=>{ const L=MS.filter(x=>sameDist(x.fin,d)); const b=L.slice().sort((p,q)=>p.t-q.t)[0]; return `<tr><td>${esc(distLabel(d))}</td><td>${fmtRace(b.t)}<span class="sub2">${esc(fmtDay(b.date))}</span></td><td>${L.length}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="menu-list ms-list">${MS.map(x=>`<div class="menu-item static"><span><b>${esc(x.M.name||'Race')}</b> · ${esc(fmtDay(x.date))}${x.row.grade?` · grade ${x.row.grade}`:''}</span><small>${esc(distLabel(x.fin))} · ${fmtRace(x.t)} · ${fmtSec(x.pace,0)}/mi${x.row.place?' · '+ord(x.row.place)+' overall':''}</small></div>`).join('')}</div>`:'';
  return `<section class="career"><h2 class="career-h">Career <span class="n">high school 5K unless marked</span></h2>
    ${K5.length?`<h3>5K PR progression</h3>${prChart}<div class="tbl-wrap"><table class="race-table"><thead><tr><th>New PR</th><th>Meet and date</th></tr></thead><tbody>${prRows}</tbody></table></div>`:''}
    ${gradeBars(HS,gradeOf)?`<h3>Grade by grade</h3>${gradeBars(HS,gradeOf)}`:''}
    ${seasons.length?`<h3>Season by season</h3><div class="tbl-wrap"><table class="race-table"><thead><tr><th>Season</th><th>Races</th><th>5K best</th><th>vs year before</th></tr></thead><tbody>${seasonRows}</tbody></table></div>`:''}
    ${yoy?`<h3>Same meet, year over year</h3><div class="yoy-list">${yoy}</div>`:''}
    ${seasons.length?`<h3>Season arc <span class="n">best pace per mile</span></h3><div class="tbl-wrap"><table class="race-table arc"><thead><tr><th>Season</th>${ARC.map(([n,w])=>`<th>${n}<span class="sub2">${w}</span></th>`).join('')}<th>Early → late</th></tr></thead><tbody>${arcRows}</tbody></table></div>`:''}
    ${both?`<h3>Official vs hand-timed</h3><div class="tbl-wrap"><table class="race-table"><thead><tr><th>Date</th><th>Meet</th><th>Official</th><th>Hand</th><th>Diff</th></tr></thead><tbody>${both}</tbody></table></div>`:''}
    ${msHTML}</section>`;
}
// ---- Chart kit (2.12) ----
// Every chart draws through these: round time ticks on a range fitted to the data, labels measured and spread so they
// never touch each other, a dot or a line, and a key built from the same list of series that draws the marks (each mark
// carries data-key; the key shows exactly those keys). Shapes as well as colours: Girls / series 1 = circle,
// Boys / series 2 = square, series 3 = triangle. Time axes: line and trend charts put smaller times lower ("faster ↓");
// the team ladder is a ranking, fastest at the top ("faster ↑"); horizontal charts put faster on the left.
const dayKey=at=>Math.floor((at+6*36e5)/864e5); // one key per calendar day (race dates are local noon-ish)
const VW=340, T_STEPS=[5,10,15,20,30,60,120,300,600,900,1200,1800,3600]; // whole 5 s at least
function timeScale(lo,hi,max){ max=max||6; const p=Math.max(2,(hi-lo)*0.06); let d0=lo-p, d1=hi+p, step=T_STEPS[T_STEPS.length-1];
  for(const s of T_STEPS){ if(Math.floor(d1/s)-Math.ceil(d0/s)+1<=max){ step=s; break; } }
  const mk=()=>{ const t=[]; for(let v=Math.ceil(d0/step-1e-9)*step; v<=d1+1e-9; v+=step) t.push(Math.round(v*1000)/1000); return t; };
  let ticks=mk(); if(ticks.length<2){ d0=Math.min(d0,Math.floor(lo/step)*step); d1=Math.max(d1,Math.ceil(hi/step)*step); ticks=mk(); }
  return {d0,d1,ticks,step}; }
const tickTxt=(v,step)=>fmtSec(v,step<1?1:0);
const CHART_FONT="-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue','Segoe UI',Roboto,Arial,sans-serif"; // 3.0: the system font
let mctx=null;
function textW(s,px,bold){ px=px||11; if(mctx===null){ try{ mctx=document.createElement('canvas').getContext('2d')||false; }catch(e){ mctx=false; } }
  if(!mctx) return String(s).length*px*0.6; mctx.font=`${bold?'700 ':'400 '}${px}px ${CHART_FONT}`; return mctx.measureText(String(s)).width*1.08+1; } // +8%: a fallback font may be wider
// Words into lines no wider than w.
function wrapWords(s,w,px,bold){ const out=[]; let cur=''; String(s).split(/\s+/).filter(Boolean).forEach(x=>{ const t=cur?cur+' '+x:x; if(!cur||textW(t,px,bold)<=w) cur=t; else { out.push(cur); cur=x; } }); if(cur) out.push(cur); return out; }
// A runner's name in a tight label: the full name, else first and last name on two lines, else "First L.", never cut off.
function nameLines(name,w,px,bold,suffix){ suffix=suffix||''; const n=String(name||'').trim(), p=n.split(/\s+/), first=p[0]||'', rest=p.slice(1).join(' '), fits=s=>textW(s,px,bold)<=w;
  if(fits(n+suffix)) return [n+suffix];
  if(rest&&fits(first)&&fits(rest+suffix)) return [first,rest+suffix];
  if(rest&&suffix&&fits(first)&&fits(rest)&&fits(suffix.trim())) return [first,rest,suffix.trim()]; // a long last name: the time on its own line
  const ini=rest?first+' '+rest[0].toUpperCase()+'.':first;
  if(fits(ini+suffix)) return [ini+suffix];
  if(rest&&fits(first)&&fits(rest[0].toUpperCase()+'.'+suffix)) return [first,rest[0].toUpperCase()+'.'+suffix];
  return suffix?[first,suffix.trim()]:[first]; }
// SVG text with one tspan per line; y = the first line's baseline.
const LH=13;
function tLines(lines,x,y,cls,anchor,extra){ return `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}"${anchor?` text-anchor="${anchor}"`:''}${extra||''}>${lines.map((l,i)=>`<tspan x="${x.toFixed(1)}"${i?` dy="${LH}"`:''}>${esc(l)}</tspan>`).join('')}</text>`; }
// Spread label centres so boxes (height h) keep a gap, in their original order, inside lo..hi when there is room.
function spreadY(items,gap,lo,hi){ const L=items.map((o,i)=>({i,y:o.y,h:o.h})).sort((a,b)=>a.y-b.y||a.i-b.i);
  const fwd=()=>L.forEach((o,k)=>{ const p=L[k-1], min=p?p.y+p.h/2+gap+o.h/2:lo+o.h/2; if(o.y<min) o.y=min; });
  fwd(); for(let k=L.length-1;k>=0;k--){ const o=L[k], n=L[k+1], max=n?n.y-n.h/2-gap-o.h/2:hi-o.h/2; if(o.y>max) o.y=max; } fwd();
  const out=[]; L.forEach(o=>{ out[o.i]=o.y; }); return out; }
const stackH=(hs,gap)=>hs.reduce((a,h)=>a+h,0)+gap*Math.max(0,hs.length-1);
// Marks: circle (series 1, Girls), square (series 2, Boys), triangle (series 3), diamond (no Girls/Boys).
const SHAPE={s1:'circle',s2:'square',s3:'triangle',su:'diamond'};
function markSVG(shape,x,y,r,cls){ const c=`dot ${cls||''}`.trim(), X=x.toFixed(1), Y=y.toFixed(1);
  if(shape==='square'){ const a=r*0.85, p=[[x-a,y-a],[x+a,y-a],[x+a,y+a],[x-a,y+a]]; return `<polygon class="${c}" points="${p.map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' ')}"/>`; } // a polygon: the stopwatch .dot rule's width/height would resize a <rect>
  if(shape==='triangle'){ const a=r*1.25; return `<polygon class="${c}" points="${X},${(y-a).toFixed(1)} ${(x+a).toFixed(1)},${(y+a*0.8).toFixed(1)} ${(x-a).toFixed(1)},${(y+a*0.8).toFixed(1)}"/>`; }
  if(shape==='diamond'){ const a=r*1.3; return `<polygon class="${c}" points="${X},${(y-a).toFixed(1)} ${(x+a).toFixed(1)},${Y} ${X},${(y+a).toFixed(1)} ${(x-a).toFixed(1)},${Y}"/>`; }
  return `<circle class="${c}" cx="${X}" cy="${Y}" r="${r}"/>`; }
// The key, from the same series list the chart draws: {key, cls, shape?, hollow?, line?:'solid'|'dash'|'dot'|'ref', band?, label}.
function keyHTML(K){ return K.length?`<div class="viz-legend">${K.map(k=>`<span data-key="${esc(k.key)}"${k.title?` title="${esc(k.title)}"`:''}><svg class="sw" viewBox="0 0 24 14" aria-hidden="true">${k.icon?`<text class="wx-ico wx-${k.icon}" x="12" y="11.5" text-anchor="middle">${WX_FLAGS[k.icon][0]}</text>`:''}${k.band?`<rect class="kb ${k.cls}" x="1" y="1" width="22" height="12" rx="2"/>`:''}${k.line?`<line class="kl ${k.cls} ${k.line}" x1="1" x2="23" y1="7" y2="7"/>`:''}${k.shape?markSVG(k.shape,12,7,4,`${k.cls}${k.hollow?' hollow':''}${k.faint?' faint':''}`):''}</svg>${esc(k.label)}</span>`).join('')}</div>`:''; }
// A vertical time axis: smaller times lower (line and trend charts), with "faster ↓" above it.
function vTime(sc,L,R,T,H,B,unit){ const Y=v=>T+(sc.d1-v)/(sc.d1-sc.d0)*(H-T-B);
  return {Y,svg:`<text class="axis dir" x="2" y="13">faster ↓${unit?` · ${esc(unit)}`:''}</text>`+sc.ticks.map(v=>`<line class="grid" x1="${L}" x2="${VW-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="axis" x="${L-6}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end">${tickTxt(v,sc.step)}</text>`).join('')}; }
// A horizontal time axis: faster on the left, round ticks, "← faster" under the first tick.
function hTime(sc,L,R,top,y){ const X=t=>L+(sc.d1===sc.d0?(VW-L-R)/2:(t-sc.d0)/(sc.d1-sc.d0)*(VW-L-R));
  return {X,svg:sc.ticks.map(v=>`<line class="grid" x1="${X(v).toFixed(1)}" x2="${X(v).toFixed(1)}" y1="${top}" y2="${y}"/><text class="axis" x="${X(v).toFixed(1)}" y="${y+14}" text-anchor="middle">${tickTxt(v,sc.step)}</text>`).join('')+`<text class="axis dir" x="${L}" y="${y+28}">← faster</text>`}; }
const dateAxis=(L,R,H,a,b)=>`<text class="axis" x="${L}" y="${H-6}">${esc(a)}</text><text class="axis" x="${VW-R}" y="${H-6}" text-anchor="end">${esc(b)}</text>`;
const xOf=(L,R,x0,x1)=>t=>L+(x1===x0?(VW-L-R)/2:(t-x0)/(x1-x0)*(VW-L-R));
// 3.4: a chart's key moves up into its title line when it fits there (one line instead of two).
function inlineKeys(box){ box.querySelectorAll('figure.viz').forEach(f=>{ const k=f.querySelector(':scope>.viz-legend'), h=f.previousElementSibling; if(!k||!h||!/^H[34]$/.test(h.tagName)||h.querySelector('.viz-legend')) return;
  const w=box.clientWidth||f.clientWidth; if(!w) return; const probe=k.cloneNode(true); probe.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;display:inline-flex'; document.body.appendChild(probe); const kw=probe.getBoundingClientRect().width; probe.remove();
  const hw=[...h.childNodes].reduce((a,n)=>a+(n.nodeType===3?n.textContent.length*9:(n.getBoundingClientRect?n.getBoundingClientRect().width:0)),0);
  if(hw+kw+16<=w){ h.classList.add('h-key'); k.classList.add('in-title'); h.appendChild(k); } }); }
const fig=(svg,legend,note)=>`<figure class="viz">${legend||''}${svg}<figcaption class="viz-tip" hidden></figcaption>${note?`<p class="hint viz-note">${note}</p>`:''}</figure>`;

// 5K PR progression as a step line (each new PR holds until the next), every 5K race as a faint point.
function stepChart(steps,all){
  const H=194,L=46,R=36,T=26,B=24, x0=Math.min(...all.map(x=>x.at)), x1=Math.max(...all.map(x=>x.at)), sc=timeScale(Math.min(...all.map(x=>x.t)),Math.max(...all.map(x=>x.t))), X=xOf(L,R,x0,x1), A=vTime(sc,L,R,T,H,B), Y=A.Y;
  const dx=place(steps.map(p=>({x:X(p.at),y:Y(p.t)})),'x',11,[0,1,2,3],11), SX=i=>X(steps[i].at)+dx[i]; // PRs a few days apart sit side by side
  let d=''; steps.forEach((p,i)=>{ d+=i?`H${SX(i).toFixed(1)}V${Y(p.t).toFixed(1)}`:`M${SX(i).toFixed(1)},${Y(p.t).toFixed(1)}`; }); d+=`H${(VW-R).toFixed(1)}`;
  const K=[{key:'pr',cls:'s1',line:'solid',shape:'circle',label:'5K PR'},{key:'race',cls:'s1',shape:'circle',faint:true,label:'Every 5K'}];
  return fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="5K PR progression">${A.svg}
    ${all.map(x=>`<circle class="dot faint" data-key="race" cx="${X(x.at).toFixed(1)}" cy="${Y(x.t).toFixed(1)}" r="2.5"/>`).join('')}
    <path class="s1" data-key="pr" d="${d}"/>
    ${steps.map((p,i)=>`<g class="pt" data-key="pr" tabindex="0" data-tip="${esc(`PR ${fmtRace(p.t)} · ${p.M.name||'Race'} · ${fmtDay(p.date)}`)}"><circle class="hit" cx="${SX(i).toFixed(1)}" cy="${Y(p.t).toFixed(1)}" r="12"/>${markSVG('circle',SX(i),Y(p.t),4.5,'s1')}</g>`).join('')}
    ${dateAxis(L,R,H,seasonLabel(seasonOf(x0)),seasonLabel(seasonOf(x1)))}</svg>`,keyHTML(K),'Lower on the chart = faster. Each step is a new PR.');
}
// Season chart: pace per mile by date, one series, PR and season-best reference lines (named in the key), hollow = tagged.
function seasonChart(season,F,a){
  const anyAdj=season.some(x=>adjPace(x,F)!=null), mode=rvChart==='adj'&&anyAdj?'adj':'raw';
  const pts=season.slice().reverse().map(x=>({x,y:mode==='adj'?adjPace(x,F):x.pace})).filter(p=>p.y!=null);
  const tog=`<div class="seg2 rv-tog" role="group" aria-label="Chart times"><button type="button" data-rvchart="raw" aria-pressed="${mode==='raw'}">Raw</button><button type="button" data-rvchart="adj" aria-pressed="${mode==='adj'}"${anyAdj?'':' disabled data-why="Adjusted times need a race-day rating: see the note below." title="Adjusted times need a race-day rating"'}>Adjusted</button></div>`;
  let note=(mode==='adj'?`<p class="hint">Adjusted = the time on an average race day this season. Race days without a rating are left out.</p>`:(anyAdj?'':`<p class="hint">Adjusted times need a race-day rating: ${RD_MIN} runners at that meet with ${RD_OTHER}+ other races this season.</p>`));
  const nf=noFactorNote(season,F); if(nf) note+=`<p class="hint nofactor">${esc(nf)}</p>`;
  if(pts.length<2) return tog+note+`<p class="hint">The chart starts after 2 races.</p>`;
  // PR line: raw = the PR list or the fastest race at this distance; adjusted (2.8.1) = the fastest adjusted race.
  const fin=season[0]&&season[0].fin, atD=fin?resultsFor(a).filter(x=>sameDist(x.fin,fin)):[];
  const prT=fin&&mode==='raw'?Math.min(...[prOf(a.id,fin),...atD.map(x=>x.t)].filter(Boolean)):null, adjs=atD.map(x=>adjPace(x,F)).filter(v=>v!=null);
  const prP0=mode==='adj'?(adjs.length?Math.min(...adjs):null):(prT&&isFinite(prT)?prT/(fin/MILE):null), ys=pts.map(p=>p.y), best=Math.min(...ys), prP=prP0&&prP0<best-0.5?prP0:null;
  const L=46,R=12,B=24, xs=pts.map(p=>p.x.at), X=xOf(L,R,Math.min(...xs),Math.max(...xs)), WB=wxBand(pts.map(p=>({at:p.x.at,date:p.x.date,rec:wxForRace(p.x)})),X,26), T=26+WB.h, H=194+WB.h; // 3.2: weather flags in a band above
  const sc=timeScale(Math.min(...ys,prP||Infinity),Math.max(...ys)), A=vTime(sc,L,R,T,H,B,'per mile'), Y=A.Y;
  const has=k=>pts.some(p=>(k==='off'?p.x.official:!p.x.official)), tagged=pts.some(p=>p.x.tagged);
  const K=[has('off')&&{key:'off',cls:'s1',line:'solid',shape:'circle',label:'Official'},has('hand')&&{key:'hand',cls:'s1',line:'solid',shape:'square',label:'Hand-timed'},tagged&&{key:'tag',cls:'s1',shape:'circle',hollow:true,label:'Tagged'},
    {key:'sb',cls:'ref',line:'ref',label:`Season best ${fmtSec(best,0)}/mi`},prP&&{key:'pr',cls:'ref pr',line:'ref',label:`PR ${fmtSec(prP,0)}/mi (${distLabel(fin)}${mode==='adj'?', adjusted':''})`},...WB.keys].filter(Boolean);
  const line=pts.map((p,i)=>`${i?'L':'M'}${X(p.x.at).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  return tog+note+fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="Pace per mile by race date, ${mode==='adj'?'adjusted for race-day difficulty':'raw'}">${A.svg}${WB.svg}
    <line class="ref" data-key="sb" x1="${L}" x2="${VW-R}" y1="${Y(best).toFixed(1)}" y2="${Y(best).toFixed(1)}"/>
    ${prP?`<line class="ref pr" data-key="pr" x1="${L}" x2="${VW-R}" y1="${Y(prP).toFixed(1)}" y2="${Y(prP).toFixed(1)}"/>`:''}
    <path class="s1" data-key="${has('off')?'off':'hand'}" d="${line}"/>
    ${pts.map(p=>{ const cx=X(p.x.at), cy=Y(p.y), tip=`${fmtSec(p.y,0)}/mi · ${p.x.official?'official':'hand-timed'} · ${p.x.M.name||'Race'} · ${fmtDay(p.x.date)}${p.x.tagged?' · tagged':''}`;
      return `<g class="pt" data-key="${p.x.official?'off':'hand'}${p.x.tagged?' tag':''}" tabindex="0" data-tip="${esc(tip)}"><circle class="hit" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="12"/>${markSVG(p.x.official?'circle':'square',cx,cy,4.5,`s1${p.x.tagged?' hollow':''}`)}</g>`; }).join('')}
    ${dateAxis(L,R,H,fmtDay(pts[0].x.date),fmtDay(pts[pts.length-1].x.date))}</svg>`,keyHTML(K),'Lower on the chart = faster. Tap a point for details.')+WB.attr;
}
function bindChartHover(box){
  box.querySelectorAll('figure.viz').forEach(fig=>{ const tip=fig.querySelector('.viz-tip');
    const show=g=>{ tip.textContent=g.dataset.tip; tip.hidden=false; fig.querySelectorAll('.pt.on').forEach(x=>x.classList.remove('on')); g.classList.add('on'); };
    fig.querySelectorAll('.pt').forEach(g=>{ g.addEventListener('pointerenter',()=>show(g)); g.addEventListener('focus',()=>show(g)); g.addEventListener('click',()=>show(g)); }); });
}
// Team view: Girls and Boys, top-5 average and the 1-5 spread at each meet (each team's five fastest, any race, 2.13).
// 2.12: every meet with a finisher at this level is a row; fewer than 5 finishers = short (no top-5, still in the pack chart).
let tvSeason=null; // Team view season (2.9); null = this season
function teamRows(g,F,mode,season){ // g: 'G' or 'B'. 2.13: every race that day counts (Varsity and JV together)
  const y=season==null?seasonOf(Date.now()):season, ex=exTagged(), A=allRaces().filter(x=>seasonOf(x.at)===y&&x.fi>=0&&sameDist(x.fin,5000)), byMeet={};
  // official results win: a hand-timed race is used only when no official list exists for that day and team
  const offDay=new Set(); A.forEach(x=>{ if(x.where==='official'&&x.M.rows.some(r=>runnerG(x.M,r.id)===g)) offDay.add(x.date); });
  A.forEach(x=>{ if(x.where!=='official'&&offDay.has(x.date)) return; const f=mode==='adj'?dayFactor(F,x):1; if(!f) return; const k=x.M.meetId||x.h.id;
    x.M.rows.forEach(r=>{ const c=r.cells[x.fi]; if(!c||runnerG(x.M,r.id)!==g||(ex&&isTagged(x.M,r.id))) return;
      const m=byMeet[k]||(byMeet[k]={x,f,best:{},official:x.where==='official'}); if(x.where==='official') m.official=true;
      if(!m.best[r.id]||c.t<m.best[r.id].t) m.best[r.id]={id:r.id,name:r.name,t:c.t}; }); }); // a runner counts once per meet, their fastest
  return Object.values(byMeet).map(m=>{ const pk=Object.values(m.best).sort((a,b)=>a.t-b.t), ts=pk.map(p=>p.t), f=m.f;
    if(ts.length<5) return {x:m.x,pack:pk.slice(0,7),official:m.official,n:ts.length,short:true};
    const top=ts.slice(0,5).map(t=>t/f), raw=ts.slice(0,5);
    return {x:m.x,pack:pk.slice(0,7),n:ts.length,official:m.official,avg:top.reduce((a,b)=>a+b,0)/5,first:top[0],fifth:top[4],spread:top[4]-top[0],rawAvg:raw.reduce((a,b)=>a+b,0)/5,rawSpread:raw[4]-raw[0]}; }).sort((a,b)=>a.x.at-b.x.at);
}
const fullRows=L=>L.filter(r=>!r.short);
const raceMeet=x=>x.M.meetId?seriesName(x.M.seriesId):x.M.name||'Race';
// 3.1: every race day of the season with its difficulty rating and confidence, or "Not enough data".
function ratingsHTML(F,Y){ const ks=Object.keys(F.info).filter(k=>F.info[k].season===Y).sort((a,b)=>F.info[a].at-F.info[b].at); if(!ks.length) return '';
  const sgn=v=>v<0?'−':'+';
  return `<h3>Race-day ratings <span class="n">${esc(seasonLabel(Y))}</span></h3><div class="tbl-wrap"><table class="race-table rd-table"><thead><tr><th>Meet</th><th>Rating</th></tr></thead><tbody>${ks.map(k=>{ const i=F.info[k], c=F.conf[k];
    return `<tr data-rd="${esc(k)}"><td>${esc(i.name)}<span class="sub2">${esc(fmtDay(i.date))}</span></td><td>${c?`<b>${Math.abs(c.secs)<1?'Average':`${fmtSec(Math.abs(c.secs),0)} ${c.secs>0?'harder':'easier'}`}</b><span class="sub2">±${fmtSec(c.pm,0)} · ${sgn(F.d[k])}${Math.abs(100*F.d[k]).toFixed(1)}% · ${c.n} runners</span>${wxSplitText(F,k)?`<span class="sub2 rd-wx">${esc(wxSplitText(F,k))}</span>`:''}`:`<b>Not enough data</b><span class="sub2">${i.nOk||0} with ${RD_OTHER}+ other races (${RD_MIN} needed)</span>`}${ratingBadge(F,k)}${(f=>f?`<span class="wx-flags">${f}</span>`:'')(flagsHTML(F.wxRec&&F.wxRec[k]||wxForDay(i.races||[])))}</td></tr>`; }).join('')}</tbody></table></div>${ks.some(k=>F.wxRec&&F.wxRec[k])?WX_ATTR:''}
  <p class="hint">A rating compares how every runner ran that day with their own trend through the season, against the season’s average race day. Seconds are for that day’s typical 5K time; ± is the likely range. ⚠ Low confidence = few runners or very mixed results: treat it as a rough guess. Injury and Illness tags are left out.${F.wxBeta?` Weather: heat follows the temperature + dew point guide (2% slower at 130, 4.5% at 150); wind, mud and cold are fitted to your race days${F.wxShare!=null?`, and together explain ${Math.round(100*F.wxShare)}% of how the ratings vary`:''}.`:''}</p>`; }
function renderTeamView(){
  const box=$('#rvTeam'), F=dayRatings(), mode=rvChart==='adj'&&F.rated>0?'adj':'raw';
  const cur=seasonOf(Date.now()), yrs=[...new Set([cur,...allRaces().map(x=>seasonOf(x.at))])].sort((a,b)=>b-a), Y=tvSeason!=null&&yrs.includes(tvSeason)?tvSeason:cur;
  // every season at a glance: the best top-5 average of the season (5K)
  const sum=yrs.map(y=>{ const g=fullRows(teamRows('G',F,mode,y)), b=fullRows(teamRows('B',F,mode,y)), best=L=>L.length?L.slice().sort((p,q)=>p.avg-q.avg)[0]:null; return {y,g:best(g),b:best(b),n:g.length+b.length}; }).filter(r=>r.n);
  const G=teamRows('G',F,mode,Y), Bo=teamRows('B',F,mode,Y), meets=[...new Map([...G,...Bo].sort((a,b)=>a.x.at-b.x.at).map(r=>[r.x.M.meetId||r.x.h.id,r.x])).entries()];
  const rowFor=(L,k)=>L.find(r=>(r.x.M.meetId||r.x.h.id)===k);
  const raw=r=>mode==='adj'?`<span class="sub2">raw ${fmtRace(r.rawAvg)}</span>`:'', rawS=r=>mode==='adj'?`<span class="sub2">raw ${fmtSec(r.rawSpread,1)}</span>`:'';
  // upright phone: Girls and Boys as two rows per meet (2.12), so nothing is cut off
  const cell=r=>!r?`<td colspan="2" class="tv-none">No runners</td>`:r.short?`<td colspan="2" class="tv-short">${r.n} runner${r.n===1?'':'s'}, no top-5</td>`:`<td>${fmtRace(r.avg)}${raw(r)}</td><td>${fmtSec(r.spread,1)}${rawS(r)}</td>`;
  const table=meets.map(([k,x])=>{ const g=rowFor(G,k), b=rowFor(Bo,k), off=(g&&g.official)||(b&&b.official);
    return `<tbody class="tv-meet"><tr><th rowspan="2" scope="rowgroup">${esc(raceMeet(x))}<span class="sub2">${esc(fmtDay(x.date))} · ${off?'official':'hand-timed'}</span>${(f=>f?`<span class="wx-flags">${f}</span>`:'')(flagsHTML(wxForRace(x)))}</th><td class="tv-g tv-gG">● Girls</td>${cell(g)}</tr><tr><td class="tv-g tv-gB">■ Boys</td>${cell(b)}</tr></tbody>`; }).join('');
  seasonPicker(yrs,Y);
  box.innerHTML=`    <div class="seg2 rv-tog" role="group" aria-label="Chart times"><button type="button" data-rvchart="raw" aria-pressed="${mode==='raw'}">Raw</button><button type="button" data-rvchart="adj" aria-pressed="${mode==='adj'}"${F.rated>0?'':' disabled data-why="Adjusted times need a race-day rating: see the note below." title="Adjusted times need a race-day rating"'}>Adjusted</button></div>
    <p class="hint adj-note">${ADJ_NOTE}</p>
    ${mode==='adj'?`<p class="hint">Adjusted = the time on an average race day this season, with the raw time under each one; race days without a rating are left out.</p>`:F.rated>0?'':`<p class="hint">Adjusted times need a race-day rating: ${RD_MIN} runners at a meet with ${RD_OTHER}+ other races that season.</p>`}
    ${(()=>{ const u=offEntries().filter(h=>h.race.unassigned&&h.level!=='MS'&&seasonOf(dayMs(h.date))===Y).reduce((a,h)=>a+h.race.rows.length,0);
      return u?`<p class="ts-warn lvl-note">${u} official result${u===1?' is':'s are'} Unassigned in ${esc(seasonLabel(Y))}: the runner has no Girls/Boys setting. Set it on the Team tab, or on that race in Data &gt; Meets.</p>`:''; })()}
    <h3>Team ladder <span class="n">5K season bests, ${esc(seasonLabel(Y))}</span></h3>${teamLadder(Y)}
    ${ratingsHTML(F,Y)}
    <h3>Top-5 average, meet to meet</h3>${teamChart(fullRows(G),fullRows(Bo))}
    ${table?`<div class="tbl-wrap tv-wrap"><table class="race-table tv-meets"><thead><tr><th>Meet</th><th></th><th>Top-5 avg</th><th>1–5 spread</th></tr></thead>${table}</table></div>`
      :`<p class="hint">No 5K races in ${esc(seasonLabel(Y))} yet. Races need a meet and division (race setup, or Meets > Link past races).</p>`}
    ${G.length?`<h3>Girls pack at each meet</h3>${packChart(G,'G')}`:''}${Bo.length?`<h3>Boys pack at each meet</h3>${packChart(Bo,'B')}`:''}
    <h3>Improvement leaderboard <span class="n">5K season best, ${esc(seasonLabel(Y))}</span></h3>${improvementBoard(Y)}
    ${sum.length?`<h3>Season by season <span class="n">best top-5 average of each season</span></h3><div class="tbl-wrap"><table class="race-table"><thead><tr><th>Season</th><th>Girls</th><th>Boys</th></tr></thead><tbody>${sum.map(r=>`<tr><td>${esc(seasonLabel(r.y))}</td>${[r.g,r.b].map(v=>v?`<td>${fmtRace(v.avg)}<span class="sub2">${esc(raceMeet(v.x))}, spread ${fmtSec(v.spread,1)}</span></td>`:'<td>–</td>').join('')}</tr>`).join('')}</tbody></table></div>`:''}
    <p class="hint">Official results are used when they exist; otherwise your hand-timed races. A runner is counted once per day. 5K only.</p>`;
  bindChartHover(box); inlineKeys(box); // 3.4
}
// Top-5 average per meet: a line per team with its #1-#5 range as a band in the team's colour. Smaller times lower.
// 3.0: the season picker sits in the nav bar (Data). It sets the Team view's season and, in Meets, jumps to that season.
function seasonPicker(yrs,Y){ const p=$('#seasonPick'); if(!p) return; p.innerHTML=yrs.map(y=>`<option value="${y}"${y===Y?' selected':''}>${esc(seasonLabel(y))}</option>`).join(''); }
$('#seasonPick').addEventListener('change',e=>{ tvSeason=+e.target.value; const v=S.settings.resView||'meets'; if(v==='team') renderTeamView(); else if(v==='meets'){ const h=[...document.querySelectorAll('#histList .hist-season')].find(x=>x.textContent.trim().startsWith(e.target.value)); if(h){ const d=h.closest('details'); if(d) d.open=true; h.scrollIntoView({block:'start'}); } } });
// 3.2: weather flags in a band above a chart: one group of icons per race day, on its own row when two would touch.
// Each flag has a key entry with its words, so it's never icon or colour alone.
function wxBand(items,X,top){ const seen=new Set(), G=[]; items.forEach(it=>{ if(!it.rec||seen.has(it.date)) return; seen.add(it.date); const f=wxFlags(it.rec); if(f.length) G.push({x:X(it.at),f,date:it.date}); });
  if(!G.length) return {h:0,svg:'',keys:[],attr:''};
  const rows=[]; G.sort((a,b)=>a.x-b.x).forEach(g=>{ const w=g.f.length*17+2; g.cx=Math.min(Math.max(g.x,w/2+2),VW-w/2-2); let r=0; while(rows[r]!=null&&rows[r]>g.cx-w/2-3) r++; rows[r]=g.cx+w/2; g.row=r; });
  const svg=G.map(g=>`<text class="wx-band" data-key="${g.f.map(k=>'wx-'+k).join(' ')}" x="${g.cx.toFixed(1)}" y="${(top+14+g.row*18).toFixed(1)}" text-anchor="middle"><title>${esc(fmtDay(g.date)+': '+g.f.map(k=>WX_FLAGS[k][1]).join(', '))}</title>${g.f.map(k=>WX_FLAGS[k][0]).join('')}</text>`).join('');
  const kinds=WX_ORDER.filter(k=>G.some(g=>g.f.includes(k)));
  return {h:rows.length*18+6,svg,keys:kinds.map(k=>({key:'wx-'+k,icon:k,label:WX_FLAGS[k][1],title:`${WX_FLAGS[k][1]}: ${WX_RULE(k)}`})),attr:''}; } // 3.4: short keys; the attribution once per screen
function teamChart(G,Bo){
  const all=[...G,...Bo]; if(all.length<2) return '<p class="hint">The chart starts after 2 meets with 5 or more finishers.</p>';
  const L=46,R=12,B=24, xs=all.map(r=>r.x.at), X=xOf(L,R,Math.min(...xs),Math.max(...xs)), WB=wxBand(all.map(r=>({at:r.x.at,date:r.x.date,rec:wxForRace(r.x)})),X,26), T=26+WB.h, H=214+WB.h; // 3.2: weather flags in a band above
  const sc=timeScale(Math.min(...all.map(r=>r.first)),Math.max(...all.map(r=>r.fifth))), A=vTime(sc,L,R,T,H,B), Y=A.Y;
  const SER=[['G',G,'s1','Girls'],['B',Bo,'s2','Boys']].filter(s=>s[1].length);
  const K=[...SER.map(([g,,c,n])=>({key:g,cls:c,line:'solid',shape:SHAPE[c],label:n})),...SER.map(([g,,c,n])=>({key:g+'band',cls:c,band:true,label:`${n} #1–#5`})),...WB.keys];
  const series=([g,L2,cls,name])=>{ const band=L2.map((r,i)=>`${i?'L':'M'}${X(r.x.at).toFixed(1)},${Y(r.first).toFixed(1)}`).join('')+L2.slice().reverse().map(r=>`L${X(r.x.at).toFixed(1)},${Y(r.fifth).toFixed(1)}`).join('')+'Z';
    const line=L2.map((r,i)=>`${i?'L':'M'}${X(r.x.at).toFixed(1)},${Y(r.avg).toFixed(1)}`).join('');
    return `<path class="band ${cls}" data-key="${g}band" d="${band}"/><path class="${cls}" data-key="${g}" d="${line}"/>${L2.map(r=>`<g class="pt" data-key="${g}" tabindex="0" data-tip="${esc(`${name}: top-5 ${fmtRace(r.avg)}, #1 ${fmtRace(r.first)} to #5 ${fmtRace(r.fifth)} · ${raceMeet(r.x)} · ${fmtDay(r.x.date)}`)}"><circle class="hit" cx="${X(r.x.at).toFixed(1)}" cy="${Y(r.avg).toFixed(1)}" r="12"/>${markSVG(SHAPE[cls],X(r.x.at),Y(r.avg),4.5,cls)}</g>`).join('')}`; };
  const d0=all.reduce((a,r)=>r.x.at<a.x.at?r:a), d1=all.reduce((a,r)=>r.x.at>a.x.at?r:a);
  return fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="Top-5 average time by meet, Girls and Boys">${A.svg}${WB.svg}${SER.map(series).join('')}${dateAxis(L,R,H,fmtDay(d0.x.date),fmtDay(d1.x.date))}</svg>`,
    keyHTML(K),'Lower on the chart = faster. The shaded band runs from each team’s #1 to #5. Tap a point for details.')+WB.attr;
}
// ---- Data charts (2.10, redrawn with the chart kit in 2.12): inline SVG, no libraries (works offline). Every dot or
// line for a runner on the roster opens that runner (data-goto). Girls = --series-1 circles, Boys = --series-2 squares.
const onRoster=id=>!!id&&S.roster.some(a=>a.id===id);
const gcls=g=>g==='B'?'s2':g==='G'?'s1':'su', gWord=g=>g==='G'?'Girls':g==='B'?'Boys':'Unassigned';
const genderOfModel=M=>(M.g||(M.division||'')[0]||'').replace(/[^GB]/,'');
const runnerG=(M,id)=>{ const a=S.roster.find(x=>x.id===id); return a&&(a.gender==='G'||a.gender==='B')?a.gender:genderOfModel(M); };
const goto=(id,tip)=>`${onRoster(id)?` data-goto="${esc(id)}" role="button" aria-label="${esc(tip)}. Open this runner."`:''} tabindex="0" data-tip="${esc(tip)}"`;
// near-equal dots in one row get a small vertical offset (alternating), so each one is visible and tappable
// Dots that would touch get a small offset (axis 'y': up/down; 'x': sideways) from the first lane in `order` that's free,
// so every dot is visible and tappable; a run of near-equal times fans out over as many lanes as it needs. P: [{x, y}].
function place(P,axis,step,order,minD){ minD=minD||10; order=order||[0,-1,1,-2,2,-3,3,-4,4]; const done=[], out=P.map(()=>0);
  P.map((p,i)=>i).sort((a,b)=>axis==='y'?P[a].x-P[b].x:P[a].y-P[b].y).forEach(i=>{ const p=P[i], at=o=>axis==='y'?[p.x,p.y+o]:[p.x+o,p.y];
    const clash=o=>{ const [x,y]=at(o); return done.some(q=>Math.abs(q[0]-x)<minD&&Math.abs(q[1]-y)<minD); };
    const near=o=>{ const [x,y]=at(o); return Math.min(1e9,...done.map(q=>Math.max(Math.abs(q[0]-x),Math.abs(q[1]-y)))); }, lane=order.find(k=>!clash(k*step)); const o=(lane===undefined?order.reduce((b2,k)=>near(k*step)>near(b2*step)?k:b2,order[0]):lane)*step; out[i]=o; done.push(at(o)); });
  return out; }
const span=off=>({up:Math.max(0,...off.map(o=>-o)),down:Math.max(0,...off.map(o=>o))});

// Data > Meets: the meet's races, best source per division (official over hand-timed), at the main distance.
function meetRaces(L2){
  const off=new Set(L2.filter(x=>x.where==='official').map(x=>divKey(x)+'|'+x.date)), use=L2.filter(x=>x.fi>=0&&(x.where==='official'||!off.has(divKey(x)+'|'+x.date)));
  const dists={}; use.forEach(x=>{ const k=Math.round(x.fin); dists[k]=(dists[k]||0)+x.M.rows.length; }); const D=+Object.keys(dists).sort((a,b)=>dists[b]-dists[a])[0];
  return {use:use.filter(x=>sameDist(x.fin,D)),D};
}
function meetCharts(L2){
  const {use,D}=meetRaces(L2); if(!use.length) return '';
  const pts=[]; use.forEach(x=>x.M.rows.forEach(r=>{ const c=r.cells[x.fi]; if(c) pts.push({id:r.id,name:r.name,t:c.t,g:runnerG(x.M,r.id),lv:'V'}); })); // 2.13: no levels: every runner is filled
  if(!pts.length) return '';
  // strip chart: one strip per Girls/Boys, every runner's time
  const rows=['G','B',''].filter(g=>pts.some(p=>p.g===g)), top=18, sc=timeScale(Math.min(...pts.map(p=>p.t)),Math.max(...pts.map(p=>p.t))), X0=hTime(sc,74,20,0,0).X;
  const RW=rows.map(g=>{ const P=pts.filter(p=>p.g===g).sort((a,b)=>a.t-b.t), off=place(P.map(p=>({x:X0(p.t),y:0})),'y',10), s=span(off); return {g,P,off,h:Math.max(34,s.up+s.down+24),up:s.up}; });
  const plotB=top+RW.reduce((a,r)=>a+r.h,0), H=plotB+34, A=hTime(sc,74,20,8,plotB);
  const LV={V:'',JV:'','':''}, K=[];
  rows.forEach(g=>K.push({key:g+'V',cls:gcls(g),shape:SHAPE[gcls(g)],label:gWord(g)}));
  let ry=top; const dots=RW.map(({g,P,off,h,up})=>{ const yc=ry+12+up; ry+=h;
    return `<text class="axis lbl" x="4" y="${yc+4}">${gWord(g)}</text>`+P.map((p,i)=>{ const x=A.X(p.t), y=yc+off[i];
      return `<g class="pt" data-key="${g+p.lv}"${goto(p.id,`${p.name} ${fmtRace(p.t)}`)}><circle class="hit" cx="${x.toFixed(1)}" cy="${y}" r="10"/>${markSVG(SHAPE[gcls(g)],x,y,4.5,`${gcls(g)}${p.lv==='JV'?' hollow':p.lv===''?' nolv':''}`)}</g>`; }).join(''); }).join('');
  const strip=fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="Every runner's ${distLabel(D)} time at this meet">${A.svg}${dots}</svg>`,keyHTML(K),'Further left = faster. Tap a dot to open that runner.');
  // this year vs last year at the same meet (series), each runner's two times linked; smaller times lower
  const x0=use[0], sid=x0.M.seriesId, y=seasonOf(x0.at); let yoy='';
  if(sid){ const prev=allRaces().filter(x=>x.M.seriesId===sid&&seasonOf(x.at)===y-1&&x.fi>=0&&sameDist(x.fin,D)), {use:pu}=meetRaces(prev), before={};
    pu.forEach(x=>x.M.rows.forEach(r=>{ const c=r.cells[x.fi]; if(c&&(!before[r.id]||c.t<before[r.id])) before[r.id]=c.t; }));
    const pairs=pts.filter(p=>before[p.id]!=null).map(p=>({...p,b:before[p.id]})).sort((p,q)=>q.t-p.t);
    if(pairs.length){ const XL=88, XR=196, LW=VW-XR-34, lab=pairs.map(p=>nameLines(p.name,LW,11,false,' '+fmtSec(p.t,0))), hs=lab.map(l=>l.length*LH);
      const H2=Math.max(230,stackH(hs,4)+64), T=26, B=34, sc2=timeScale(Math.min(...pairs.flatMap(p=>[p.t,p.b])),Math.max(...pairs.flatMap(p=>[p.t,p.b]))), Y=v=>T+(sc2.d1-v)/(sc2.d1-sc2.d0)*(H2-T-B);
      const dB=place(pairs.map(p=>({x:0,y:Y(p.b)})),'x',10), dT=place(pairs.map(p=>({x:0,y:Y(p.t)})),'x',10); // near-equal times side by side
      const ly=spreadY(pairs.map((p,i)=>({y:Y(p.t),h:hs[i]})),4,T-6,H2-B+6), KY=[...new Set(pairs.map(p=>p.g))].map(g=>({key:g,cls:gcls(g),line:'solid',shape:SHAPE[gcls(g)],label:gWord(g)}));
      yoy=fig(`<svg viewBox="0 0 ${VW} ${H2}" role="img" aria-label="This year and last year at this meet"><text class="axis dir" x="2" y="13">faster ↓</text>
        ${sc2.ticks.map(v=>`<line class="grid" x1="${XL-24}" x2="${XR+24}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="axis" x="${XL-34}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end">${tickTxt(v,sc2.step)}</text>`).join('')}
        <text class="axis lbl" x="${XL}" y="${H2-8}" text-anchor="middle">${esc(seasonLabel(y-1))}</text><text class="axis lbl" x="${XR}" y="${H2-8}" text-anchor="middle">${esc(seasonLabel(y))}</text>
        ${pairs.map((p,i)=>{ const tip=`${p.name}: ${fmtRace(p.b)} → ${fmtRace(p.t)} (${fmtDelta(p.t-p.b)})`, c=gcls(p.g), yt=ly[i]-hs[i]/2+10;
          return `<g class="pt ln" data-key="${p.g}"${goto(p.id,tip)}><line class="hitln" x1="${XL+dB[i]}" y1="${Y(p.b).toFixed(1)}" x2="${XR+dT[i]}" y2="${Y(p.t).toFixed(1)}"/><line class="slope ${c}" x1="${XL+dB[i]}" y1="${Y(p.b).toFixed(1)}" x2="${XR+dT[i]}" y2="${Y(p.t).toFixed(1)}"/>${markSVG(SHAPE[c],XL+dB[i],Y(p.b),4,c)}${markSVG(SHAPE[c],XR+dT[i],Y(p.t),4,c)}
            <line class="lead" x1="${XR+dT[i]+6}" y1="${Y(p.t).toFixed(1)}" x2="${XR+30}" y2="${ly[i].toFixed(1)}"/>${tLines(lab[i],XR+32,yt,'axis')}</g>`; }).join('')}</svg>`,
        keyHTML(KY),`${pairs.length} runner${pairs.length===1?'':'s'} ran it both years. Lower = faster. Tap a line to open that runner.`); } }
  // pacing through checkpoints (hand-timed races with splits); smaller paces lower
  const pace=use.filter(x=>x.M.checkpoints.filter(c=>c.dist>0).length>=2&&x.where!=='official').map(x=>{ const cps=x.M.checkpoints, rs=x.M.rows.map(r=>({r,sp:splitsOf(cps,r.cells)})).filter(o=>o.sp.filter(s=>s&&s.pace!=null).length>=2);
    if(!rs.length) return ''; const P=rs.flatMap(o=>o.sp.filter(s=>s&&s.pace!=null).map(s=>s.pace)), H3=214, L=46, R=24, T=26, B=40, sc3=timeScale(Math.min(...P),Math.max(...P)), A3=vTime(sc3,L,R,T,H3,B,'per mile'), X=i=>L+i/(Math.max(1,cps.length-1))*(VW-L-R);
    const cpw=(VW-L-R)/Math.max(1,cps.length-1), gs=[...new Set(rs.map(o=>runnerG(x.M,o.r.id)))], KP=gs.map(g=>({key:g,cls:gcls(g),line:'solid',shape:SHAPE[gcls(g)],label:gWord(g)}));
    return `<h5>${esc(divName(x.M.division)||x.M.name)}: pace through the race</h5>`+fig(`<svg viewBox="0 0 ${VW} ${H3}" role="img" aria-label="Pace per mile at each checkpoint">${A3.svg}
      ${cps.map((c,i)=>tLines(wrapWords(c.name,Math.max(40,cpw-6),11),X(i),H3-B+16,'axis','middle')).join('')}
      ${rs.map(o=>{ const g=runnerG(x.M,o.r.id), c=gcls(g), P2=o.sp.map((s,i)=>s&&s.pace!=null?[X(i),A3.Y(s.pace)]:null).filter(Boolean), tip=`${o.r.name}: ${o.sp.map((s,i)=>s&&s.pace!=null?cps[i].name+' '+fmtSec(s.pace,0)+'/mi':'').filter(Boolean).join(', ')}`, d=P2.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('');
        return `<g class="pt ln" data-key="${g}"${goto(o.r.id,tip)}><path class="hitln" d="${d}"/><path class="${c} thin" d="${d}"/>${P2.map(p=>markSVG(SHAPE[c],p[0],p[1],3,c)).join('')}</g>`; }).join('')}</svg>`,keyHTML(KP),'Pace per mile in each part of the race. Lower = faster. Tap a line to open that runner.'); }).join('');
  return `<div class="mt-charts"><h5>Every runner, ${esc(distLabel(D))}</h5>${strip}${yoy?`<h5>This year vs last year</h5>${yoy}`:''}${pace}</div>`;
}
const meetChartsInner=L2=>meetCharts(L2);

// Data > Runners: grade-by-grade bars, each race vs season best, and a compare chart.
function gradeBars(HS,gradeOf){
  const by={}; HS.filter(x=>sameDist(x.fin,5000)).forEach(x=>{ const g=gradeOf(seasonOf(x.at)); if(!g) return; if(!by[g]||x.t<by[g].t) by[g]=x; });
  const G=Object.keys(by).map(Number).sort((a,b)=>a-b); if(!G.length) return '';
  const T=G.map(g=>by[g].t), lo=Math.min(...T), hi=Math.max(...T), H=G.length*36+10, L=72, W=VW-L-70;
  const len=t=>hi===lo?W*0.8:W*(0.35+0.65*(hi-t)/(hi-lo)); // faster = longer bar
  return fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="Best 5K by grade">${G.map((g,i)=>{ const y=8+i*36, x=by[g];
    return `<g class="pt" tabindex="0" data-tip="${esc(`Grade ${g}: ${fmtRace(x.t)} · ${x.M.name||'Race'} · ${fmtDay(x.date)}`)}"><text class="axis lbl" x="4" y="${y+17}">Grade ${g}</text><rect class="bar" x="${L}" y="${y}" width="${len(x.t).toFixed(1)}" height="24" rx="4"/><text class="axis lbl" x="${(L+len(x.t)+6).toFixed(1)}" y="${y+17}">${fmtRace(x.t)}</text></g>`; }).join('')}</svg>`,'','Best 5K in each grade. Longer = faster.');
}
function vsSbBars(season){
  const L=season.filter(x=>sameDist(x.fin,5000)).slice().reverse(); if(L.length<2) return '';
  let sb=null; const rows=L.map(x=>{ const d=sb==null?null:x.t-sb; const o={x,d,first:sb==null,sbNow:sb==null||x.t<sb}; if(sb==null||x.t<sb) sb=x.t; return o; });
  const D=rows.filter(r=>r.d!=null).map(r=>r.d), m=Math.max(10,...D.map(Math.abs)), H=rows.length*30+20, mid=VW/2+30, sc=Math.min(VW-mid-56,mid-56-46)/m; // room for the date on the left and a label on either side
  return fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="Each 5K this season compared with the season best before it"><line class="ref" x1="${mid}" x2="${mid}" y1="4" y2="${H-14}"/><text class="axis" x="${mid}" y="${H-2}" text-anchor="middle">season best so far</text>
    ${rows.map((r,i)=>{ const y=6+i*30, w=r.d==null?0:Math.abs(r.d)*sc, faster=r.d!=null&&r.d<0, tip=`${r.x.M.name||'Race'} ${fmtDay(r.x.date)}: ${fmtRace(r.x.t)}${r.first?' (first 5K)':faster?` new season best by ${fmtSec(-r.d,1)}`:` ${fmtSec(r.d,1)} off`}`;
      return `<g class="pt" tabindex="0" data-tip="${esc(tip)}"><text class="axis" x="4" y="${y+15}">${esc(fmtDay(r.x.date).replace(/^\w+, /,''))}</text>${r.d==null?`<text class="axis" x="${mid+6}" y="${y+15}">first</text>`:`<rect class="bar ${faster?'good':'off'}" x="${(faster?mid-w:mid).toFixed(1)}" y="${y}" width="${Math.max(2,w).toFixed(1)}" height="20" rx="3"/><text class="axis lbl" x="${(faster?mid-w-4:mid+w+4).toFixed(1)}" y="${y+15}" text-anchor="${faster?'end':'start'}">${faster?'−'+fmtSec(-r.d,1):'+'+fmtSec(r.d,1)}</text>`}</g>`; }).join('')}</svg>`,'','Left of the line = a new season best (by that much); right = off the season best so far.');
}
let rvCompare=[];
function compareChart(a){
  const ids=[a.id,...rvCompare.filter(id=>id!==a.id&&S.roster.some(x=>x.id===id))].slice(0,3), cls=['s1','s2','s3'];
  const y1=seasonOf(Date.now())-1, sets=ids.map(id=>{ const r=S.roster.find(x=>x.id===id); return {r,L:resultsFor(r).filter(x=>x.at>0&&seasonOf(x.at)>=y1&&sameDist(x.fin,5000)).slice().reverse()}; }); // this season and last (2.12; the career chart has the rest)
  const pick=`<label class="field">Compare with (up to 2 more)<select data-cmp><option value="">Add a runner…</option>${S.roster.filter(x=>!ids.includes(x.id)&&x.name.trim()).sort((p,q)=>p.name.localeCompare(q.name)).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label>
    ${ids.length>1?`<div class="cmp-chips">${ids.slice(1).map((id,i)=>`<button type="button" class="btn" data-uncmp="${id}" aria-label="Stop comparing ${esc(S.roster.find(x=>x.id===id).name)}"><svg class="sw" viewBox="0 0 24 14" aria-hidden="true">${markSVG(SHAPE[cls[i+1]],12,7,4,cls[i+1])}</svg>${esc(S.roster.find(x=>x.id===id).name)} ×</button>`).join('')}</div>`:''}`;
  const all=sets.flatMap(s=>s.L); if(all.length<2) return pick+'<p class="hint">The chart starts with 2 dated 5K results this season or last.</p>';
  const days=[...new Set(all.map(x=>dayKey(x.at)))].sort((p,q)=>p-q), H=204, L=46, R=20, T=26, B=24, X=at=>L+12+(days.length<2?(VW-L-R-24)/2:days.indexOf(dayKey(at))/(days.length-1)*(VW-L-R-24)), sc=timeScale(Math.min(...all.map(x=>x.t)),Math.max(...all.map(x=>x.t))), A=vTime(sc,L,R,T,H,B), Y=A.Y;
  const K=sets.map((s,i)=>s.L.length&&{key:'r'+i,cls:cls[i],line:'solid',shape:SHAPE[cls[i]],label:s.r.name}).filter(Boolean);
  // a dot that would touch an earlier one (same day, or races a few days apart) moves right just enough
  const flat=sets.flatMap((s,i)=>s.L.map(x=>({i,x}))), dxs=place(flat.map(o=>({x:X(o.x.at),y:Y(o.x.t)})),'x',Math.min(10,Math.max(7,(VW-L-R-24)/Math.max(1,days.length-1)/2)),[0,1,-1,2,-2,3,-3],8), pos=new Map(flat.map((o,k)=>[o.x,X(o.x.at)+dxs[k]]));
  const PX=(i,x)=>pos.get(x); // x = race order (2.12): each race day gets an even slot
  const x0=Math.min(...all.map(x=>x.at)), x1=Math.max(...all.map(x=>x.at));
  return pick+fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="5K times compared">${A.svg}
    ${sets.map((s,i)=>s.L.length?`<path class="${cls[i]}" data-key="r${i}" d="${s.L.map((x,j)=>(j?'L':'M')+PX(i,x).toFixed(1)+','+Y(x.t).toFixed(1)).join('')}"/>${s.L.map(x=>`<g class="pt" data-key="r${i}"${goto(s.r.id,`${s.r.name}: ${fmtRace(x.t)} · ${x.M.name||'Race'} · ${fmtDay(x.date)}`)}><circle class="hit" cx="${PX(i,x).toFixed(1)}" cy="${Y(x.t).toFixed(1)}" r="10"/>${markSVG(SHAPE[cls[i]],PX(i,x),Y(x.t),days.length>14?3:4,cls[i])}</g>`).join('')}`:'').join('')}
    ${dateAxis(L,R,H,seasonLabel(seasonOf(x0)),seasonLabel(seasonOf(x1)))}</svg>`,keyHTML(K),'Every dated 5K this season and last, in race order (oldest on the left). Lower = faster. Tap a dot to open that runner.');
}

// Data > Team: ladder of season bests, the pack at each meet, and an improvement leaderboard.
function sbOf(a,y){ const L=resultsFor(a).filter(x=>x.at>0&&seasonOf(x.at)===y&&sameDist(x.fin,5000)); return L.length?L.reduce((p,q)=>q.t<p.t?q:p):null; }
// The ladder (2.13): two stacked ranked lists, Girls then Boys, fastest at the top. Each row: rank, full name, a dot on
// one time axis shared by both lists (further left = faster), the time. Rows are list items, so they can't overlap.
// Tapping a row opens the runner.
function teamLadder(y){
  const cols=['G','B'].map(g=>({g,L:S.roster.filter(a=>a.gender===g).map(a=>({a,b:sbOf(a,y)})).filter(o=>o.b).sort((p,q)=>p.b.t-q.b.t)})).filter(c=>c.L.length); if(!cols.length) return '<p class="hint">No 5K results this season yet.</p>';
  const all=cols.flatMap(c=>c.L.map(o=>o.b.t)), sc=timeScale(Math.min(...all),Math.max(...all),4), pct=v=>((v-sc.d0)/(sc.d1-sc.d0)*100).toFixed(1);
  const axis=`<div class="ld-axis" aria-hidden="true"><span class="ld-faster">faster ←</span><span class="ld-ticks">${sc.ticks.map(v=>`<i style="left:${pct(v)}%">${tickTxt(v,sc.step)}</i>`).join('')}</span><span></span></div>`;
  const list=c=>`<h4 class="ld-h">${gWord(c.g)} <span class="n">${c.L.length}</span></h4>${axis}<ol class="ladder ${gcls(c.g)}">${c.L.map((o,i)=>`<li><button type="button" class="ld-row" data-goto="${esc(o.a.id)}" aria-label="${esc(`${i+1}. ${o.a.name}, season best ${fmtRace(o.b.t)}. Open this runner.`)}"><span class="ld-rk">${i+1}</span><span class="ld-nm">${esc(o.a.name)}</span><span class="ld-tr" aria-hidden="true">${sc.ticks.map(v=>`<i class="ld-g" style="left:${pct(v)}%"></i>`).join('')}<b class="ld-dot ${gcls(c.g)}" style="left:${pct(o.b.t)}%"></b></span><span class="ld-t num">${fmtSec(o.b.t,0)}</span></button></li>`).join('')}</ol>`;
  return `<div class="ladders">${cols.map(list).join('')}</div><p class="hint">Every runner’s 5K season best, fastest at the top. Girls ● and Boys ■ share one time scale. Tap a runner to open them.</p>`;
}
// The top seven at each meet: filled = #1-#5, ring = #6-#7, solid line = the #1-#5 gap, dashed = the #1-#7 gap, in the
// team's colour. Gap labels sit in their own line under each meet; a meet with fewer than five shows its dots and a note.
function packChart(rows,g){
  if(!rows.length) return ''; const c=gcls(g), sh=SHAPE[c], NW=92, L=NW+10, R=20, top=20;
  const all=rows.flatMap(r=>r.pack.map(p=>p.t)), sc=timeScale(Math.min(...all),Math.max(...all));
  const blocks=rows.map(r=>{ let nm=raceMeet(r.x), ln=wrapWords(nm,NW,11,true); if(ln.length>2){ nm=nm.replace(/\bInvitational\b/,'Invite').replace(/\bMemorial\b/,'Mem.').replace(/\bConference\b/,'Conf.'); ln=wrapWords(nm,NW,11,true); }
    const X0=hTime(sc,L,R,0,0).X, off=place(r.pack.map(q=>({x:X0(q.t),y:0})),'y',10), sp=span(off), yd=8+sp.up, l5=yd+sp.down+11, l7=l5+5, gy=l7+16;
    return {r,ln,off,yd,l5,l7,gy,h:Math.max((ln.length+1)*LH+12,gy+10)}; });
  const plotB=top+blocks.reduce((a,b)=>a+b.h,0), H=plotB+36, A=hTime(sc,L,R,plotB-4,plotB);
  const has={top5:rows.some(r=>r.pack.length),six7:rows.some(r=>r.pack.length>5),g5:rows.some(r=>r.pack.length>=5),g7:rows.some(r=>r.pack.length>=7)};
  const K=[has.top5&&{key:'top5',cls:c,shape:sh,label:'#1–#5'},has.six7&&{key:'six7',cls:c,shape:sh,hollow:true,label:'#6–#7'},has.g5&&{key:'g5',cls:c,line:'solid',label:'#1–#5 gap'},has.g7&&{key:'g7',cls:c,line:'dash',label:'#1–#7 gap'}].filter(Boolean);
  let y0=top; const body=blocks.map(({r,ln,h,off,yd:ydr,l5,l7,gy})=>{ const p=r.pack, yd=y0+ydr, xs=p.map(q=>A.X(q.t)), nm=raceMeet(r.x);
    const gap=[p.length>=5?`1–5 gap ${fmtSec(p[4].t-p[0].t,0)}`:'',p.length>=7?`1–7 gap ${fmtSec(p[6].t-p[0].t,0)}`:''].filter(Boolean).join(' · ')||`${r.n} runner${r.n===1?'':'s'}, no top-5`;
    const out=`${sc.ticks.map(v=>`<line class="grid" x1="${A.X(v).toFixed(1)}" x2="${A.X(v).toFixed(1)}" y1="${y0+2}" y2="${y0+l7+3}"/>`).join('')}${tLines(ln,4,y0+12,'axis lbl')}<text class="axis" x="4" y="${y0+12+ln.length*LH}">${esc(fmtDay(r.x.date).replace(/^\w+, /,''))}</text>
      ${p.length>=5?`<line class="spread5 ${c}" data-key="g5" x1="${xs[0].toFixed(1)}" x2="${xs[4].toFixed(1)}" y1="${y0+l5}" y2="${y0+l5}"/>`:''}
      ${p.length>=7?`<line class="spread7 ${c}" data-key="g7" x1="${xs[0].toFixed(1)}" x2="${xs[6].toFixed(1)}" y1="${y0+l7}" y2="${y0+l7}"/>`:''}
      <text class="axis gap${r.short?' short':''}" x="${L}" y="${y0+gy}">${esc(gap)}</text>
      ${p.map((q,j)=>`<g class="pt" data-key="${j>=5?'six7':'top5'}"${goto(q.id,`${q.name}: ${fmtRace(q.t)} (#${j+1}) · ${nm}`)}><circle class="hit" cx="${xs[j].toFixed(1)}" cy="${yd+off[j]}" r="9"/>${markSVG(sh,xs[j],yd+off[j],4.5,`${c}${j>=5?' hollow':''}`)}</g>`).join('')}`;
    y0+=h; return out; }).join('');
  return fig(`<svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="${gWord(g)}: the top seven at each meet">${A.svg}${body}</svg>`,keyHTML(K),'The top seven at each meet. Further left = faster. Tap a dot to open that runner.');
}
function improvementBoard(y){
  const L=S.roster.filter(a=>a.name.trim()).map(a=>{ const now=sbOf(a,y); if(!now) return null; const prev=sbOf(a,y-1);
    if(prev) return {a,now,base:prev,how:'vs last season’s best',d:now.t-prev.t};
    const first=resultsFor(a).filter(x=>x.at>0&&seasonOf(x.at)===y&&sameDist(x.fin,5000)).sort((p,q)=>p.at-q.at)[0]; if(!first||first===now) return null;
    return {a,now,base:first,how:'vs first 5K this season',d:now.t-first.t}; }).filter(Boolean).sort((p,q)=>(p.d/p.base.t)-(q.d/q.base.t));
  if(!L.length) return '<p class="hint">Needs a 5K this season and an earlier 5K (this season or last).</p>';
  const m=Math.max(...L.map(o=>Math.abs(o.d/o.base.t)));
  return `<div class="board">${L.map((o,i)=>{ const pct=o.d/o.base.t*100; return `<button type="button" class="board-row" data-goto="${o.a.id}"><span class="rk">${i+1}</span><span class="nm"><b>${esc(o.a.name)}</b><small>${fmtRace(o.base.t)} → ${fmtRace(o.now.t)} · ${esc(o.how)}</small></span><span class="bar-w"><i class="${o.d<=0?'good':'off'}" style="width:${(Math.abs(pct)/(m*100)*100||0).toFixed(1)}%"></i></span><span class="pc ${o.d<=0?'chg faster':'chg slower'}">${o.d<=0?'−':'+'}${Math.abs(pct).toFixed(1)}%</span></button>`; }).join('')}</div>`;
}

/* ---------- suggested training paces (2.11) ---------- */
// Jack Daniels's VDOT method (Daniels' Running Formula): with v in meters per minute and t in minutes,
//   VO2 = -4.60 + 0.182258 v + 0.000104 v^2,  %VO2max(t) = 0.8 + 0.1894393 e^(-0.012778 t) + 0.2989558 e^(-0.1932605 t),
//   VDOT = VO2 / %VO2max. Training paces are the speeds at a share of VDOT: easy 62-70%, threshold 88%, interval
//   97.5%, repetition 105% (these match Daniels' published tables within about a second per 400 at VDOT 40-70; tested).
//   CV = the pace held for about 30 minutes at the same VDOT. 5K and mile pace = the predicted race times.
// Estimates only. A runner's basis is their best performance this season (any race 1500m or longer: hand-timed,
// official or a dated typed result), else a race in the last 120 days; never an old PR; Injury/Illness-tagged races
// are left out.
const VD={vo2:v=>-4.60+0.182258*v+0.000104*v*v, pmax:t=>0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t)};
const vdotOf=(d,sec)=>{ const t=sec/60; return VD.vo2(d/t)/VD.pmax(t); };
const velAt=vo2=>{ const a=0.000104,b=0.182258,c=-4.60-vo2; return (-b+Math.sqrt(b*b-4*a*c))/(2*a); }; // m/min
function raceTimeAt(V,d){ let lo=60,hi=40000; for(let i=0;i<60;i++){ const m=(lo+hi)/2; if(vdotOf(d,m)>V) lo=m; else hi=m; } return (lo+hi)/2; }
const PACE_REFS=[['cv','CV pace'],['threshold','Threshold'],['interval','Interval'],['repetition','Repetition'],['5k','5K pace'],['mile','Mile pace'],['easy','Easy'],['pct','Custom % of 5K pace']];
const PACE_WORD=Object.fromEntries(PACE_REFS);
function pacesFor(V){ const mi=v=>MILE/v*60; // seconds per mile
  return {easyFast:mi(velAt(0.70*V)),easySlow:mi(velAt(0.62*V)),easy:mi(velAt(0.66*V)),cv:mi(velAt(V*VD.pmax(30))),threshold:mi(velAt(0.88*V)),interval:mi(velAt(0.975*V)),repetition:mi(velAt(1.05*V)),
    '5k':raceTimeAt(V,5000)/(5000/MILE),mile:raceTimeAt(V,MILE)}; }
const hurt=x=>!!(x.tag&&(x.tag.tags||[]).some(t=>t==='Injury'||t==='Illness'));
function paceProfile(a){ if(!a) return null; return memoize('pp|'+a.id,()=>{
  const now=Date.now(), y=seasonOf(now), L=resultsFor(a).filter(x=>x.at>0&&x.fin>=1500&&!hurt(x));
  const season=L.filter(x=>seasonOf(x.at)===y), pool=season.length?season:L.filter(x=>now-x.at<=120*864e5); if(!pool.length) return null;
  const best=pool.map(x=>({x,V:vdotOf(x.fin,x.t)})).sort((p,q)=>q.V-p.V)[0], x=best.x, d=new Date(x.at);
  const sb=season.length&&!season.some(y2=>sameDist(y2.fin,x.fin)&&y2.t<x.t);
  return {V:best.V,x,paces:pacesFor(best.V),basis:`Based on ${distLabel(x.fin)} ${sb?'season best':'race'} ${fmtRace(x.t)}, ${d.getMonth()+1}/${d.getDate()}`}; }); }
// A part's target in seconds per mile for one profile (before the runner's remembered adjustment).
function refPace(prof,s){ if(!prof) return null; const P=prof.paces; if(s.mode==='effort'&&s.paceRef==='pct'){ const pct=+s.pct||100; return P['5k']*100/pct; } return P[segRef(s)]||null; }
function isEffortWk(wk){ return !!wk&&(wk.segments||[]).some(segEffort); } // a function: compile() runs during load (migrate)
// Who a stopwatch's targets are for: its runner, or a group's middle runner (by VDOT). Warns when a group's paces
// differ by more than 3%. Adjustments are remembered per runner (or group) and workout: S.paceAdj[key] = sec/mile.
const adjKey=(w,wk)=>(w.athleteIds||[]).slice().sort().join('+')+'|'+wk.id;
function watchCtx(w,wk){
  const ps=(w.athleteIds||[]).map(id=>S.roster.find(a=>a.id===id)).filter(Boolean).map(a=>({a,p:paceProfile(a)}));
  const have=ps.filter(o=>o.p).sort((p,q)=>q.p.V-p.p.V); if(!have.length) return {missing:ps.map(o=>o.a.name),adj:0};
  const mid=have[Math.floor((have.length-1)/2)], P5=have.map(o=>o.p.paces['5k']), spread=(Math.max(...P5)-Math.min(...P5))/mid.p.paces['5k'];
  const adj=+((S.paceAdj||{})[adjKey(w,wk)]||0);
  return {prof:mid.p,who:mid.a,group:ps.length>1,spread,warn:spread>0.03,adj,missing:ps.filter(o=>!o.p).map(o=>o.a.name),
    pace:s=>{ const b=refPace(mid.p,s); return b?b+adj:null; }};
}
// Pace table for a runner card: every effort per 100, 200, 400, 800, 1000 and mile.
const PT_DISTS=[[100,'100'],[200,'200'],[400,'400'],[800,'800'],[1000,'1000'],[MILE,'mile']];
function paceTableHTML(a){
  const prof=paceProfile(a); if(!prof) return '<p class="hint">Needs a race this season (or in the last 120 days) of 1500m or longer. Old PRs are never used.</p>';
  const P=prof.paces, row=(label,spm,range)=>`<div class="pt-row"><b>${esc(label)}</b><span>${range?`${fmtSec(range[0],0)}–${fmtSec(range[1],0)}/mi`:PT_DISTS.map(([d,l])=>`<span class="pt-c"><small>${l}</small>${fmtSec(spm*d/MILE,d<=200?1:0)}</span>`).join('')}</span></div>`;
  return `<p class="hint">${esc(prof.basis)}. VDOT ${prof.V.toFixed(1)}. Estimates (Jack Daniels’s VDOT method); adjust any target on a stopwatch.</p>
    <div class="pace-table">${row('Easy',null,[P.easyFast,P.easySlow])}${row('CV (about 30 min)',P.cv)}${row('Threshold',P.threshold)}${row('Interval',P.interval)}${row('Repetition',P.repetition)}${row('5K pace',P['5k'])}${row('Mile pace',P.mile)}</div>`;
}
// Targets sheet for a waiting stopwatch: the targets per part, the basis, and +/- (remembered for that runner and workout).
function targetsSheet(w){
  const wk=S.workouts.find(x=>x.id===w.workoutId); if(!wk||!isEffortWk(wk)) return;
  const draw=()=>{ const c=watchCtx(w,wk), segs=wk.segments.filter(segEffort);
    return `<div class="tg-sheet"><h2>Targets: ${esc(w.name||'Stopwatch')}</h2>
      ${c.prof?`<p class="hint">${c.group?`For the group’s middle runner, ${esc(c.who.name)}. `:''}${esc(c.prof.basis)}. Estimates.</p>`:`<p class="ts-warn">No pace yet for ${esc(c.missing.join(', ')||'this stopwatch')}: needs a race this season.</p>`}
      ${c.warn?`<p class="ts-warn">This group’s paces differ by ${(c.spread*100).toFixed(1)}% (more than 3%). Consider splitting it.</p>`:''}
      ${c.prof?segs.map(s=>{ const p=c.pace(s); return `<div class="set-row"><span><b>${esc(fmtDist(+s.dist))} ${esc(PACE_WORD[segRef(s)])}${s.mode==='effort'&&s.paceRef==='pct'?' '+(+s.pct||100)+'%':''}</b><span class="hint">${fmtSec(p*400/MILE,1)} per 400 · ${fmtSec(p*(+s.dist)/MILE,1)} for ${esc(fmtDist(+s.dist))} · ${fmtSec(p,0)}/mi</span></span></div>`; }).join(''):''}
      ${c.prof?`<div class="field">Adjust every target<div class="adj-row"><button type="button" class="btn" data-adj="-2" aria-label="2 seconds per mile faster">−2 s/mi</button><b class="adj-v">${c.adj?((c.adj>0?'+':'−')+Math.abs(c.adj)+' s/mi'):'as estimated'}</b><button type="button" class="btn" data-adj="2" aria-label="2 seconds per mile slower">+2 s/mi</button></div><span class="hint">Remembered for ${esc(c.group?'this group':c.who.name)} on this workout.</span>${c.adj?'<button type="button" class="btn" data-adj="0">Back to the estimate</button>':''}</div>`:''}
      <div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div></div>`; };
  const open=()=>modal(draw(),(box,close)=>{ const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-adj]').forEach(b=>b.onclick=()=>{ const k=adjKey(w,wk); S.paceAdj=S.paceAdj||{}; const v=+b.dataset.adj; S.paceAdj[k]=v===0?0:(+S.paceAdj[k]||0)+v; if(!S.paceAdj[k]) delete S.paceAdj[k]; save(); memo.clear(); renderCard(w); open(); }); });
  open();
}

// Context tags on a runner's result or a whole race (append-only edits; Undo appends the previous tags back).
function tagSheet(src,rid){
  const hist=((src.live?src.live.tagEdits:src.entry.edits)||[]).filter(v=>v.op==='tag'&&(v.rid||null)===(rid||null)).slice().reverse();
  const M=srcModel(src), row=rid&&M.rows.find(r=>r.id===rid), cur=rid?(tagOf(M,rid)||{tags:[],note:''}):{tags:M.raceTags||[],note:''}, list=rid?TAGS_RUNNER:TAGS_RACE;
  modal(`<div class="tag-sheet"><h2>${rid?`Tags: ${esc(row?row.name:'Runner')}`:`Race tags: ${esc(M.name||'Race')}`}</h2>
    <p class="hint">${rid?'Context for this result. Shared with your coaches; tagged results can be left out of trends.':'Conditions for the whole race.'}${src.live?' While the race is live, tags stay on this phone and are saved with the results when the race ends.':''}</p>
    <div class="chips">${list.map(t=>`<button type="button" class="chip-a" data-tg="${esc(t)}" aria-pressed="${cur.tags.includes(t)}"><span class="nm">${esc(t)}</span></button>`).join('')}</div>
    ${rid?`<label class="field">Short note (optional)<input data-tgnote maxlength="60" value="${esc(cur.note||'')}" placeholder="No medical details" autocomplete="off"></label>`:''}
    ${hist.length?`<details class="ts-hist"><summary>History (${hist.length} change${hist.length===1?'':'s'})</summary>${hist.map(v=>`<div class="set-row"><span>${v.tags&&v.tags.length?esc(v.tags.join(', ')):'No tags'}${v.note?' · '+esc(v.note):''}<span class="hint">by ${esc(v.dev===DEVICE?'this phone':(v.byName||'another coach'))} · ${esc(v.at?new Date(v.at).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'')}</span></span></div>`).join('')}</details>`:''}
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Save</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-tg]').forEach(b=>b.onclick=()=>b.setAttribute('aria-pressed',String(b.getAttribute('aria-pressed')!=='true')));
    m.querySelector('[data-x=yes]').onclick=()=>{ const tags=[...m.querySelectorAll('[data-tg][aria-pressed=true]')].map(b=>b.dataset.tg), note=rid?m.querySelector('[data-tgnote]').value.trim().slice(0,60):'';
      const put=(tg,nt)=>tagEdit(src,{op:'tag',rid:rid||null,tags:tg,note:nt});
      put(tags,note); close(); refreshResults(); if(curTab==='results') showResultsView();
      snack(tags.length||note?'Tags saved':'Tags cleared','Undo',()=>{ put(cur.tags,cur.note||''); refreshResults(); if(curTab==='results') showResultsView(); },8000); };
  });
}
function tagEdit(src,v){
  const e0={...v,uid:myId(),dev:DEVICE,byName:S.settings.coachName||'',at:Date.now()};
  if(src.live){ src.live.tagEdits=[...(src.live.tagEdits||[]),e0]; save(); return; }
  const h=src.entry, e=e0;
  h.edits=[...(h.edits||[]),e];
  if(src.where==='team'){ if(SYNC) SYNC.appendHistoryEdits(h.id,[e]); } else logPut(h);
}
// Opening a race from a runner card: Meets view, that race open, the runner's card flashing.
function openRaceAt(where,id,rid){
  if(where==='typed'){ toast('A typed result: there is no race to open.'); return; }
  showResultsView('meets'); renderResults();
  const box=where==='local'?$('#raceLogList'):$('#histList'), d=box&&[...box.querySelectorAll('details[data-entry]')].find(x=>x.dataset.entry===id||x.dataset.also===id);
  if(d){ const mt=d.closest('details.hist-meet'); if(mt) mt.open=true; }
  if(!d){ toast('That race isn’t on this phone yet (needs signal).'); return; }
  d.open=true; const c=d.querySelector(`.rcard[data-rrow="${CSS.escape(rid)}"]`)||d.querySelector(`[data-rrow="${CSS.escape(rid)}"]`)||d;
  c.scrollIntoView({block:'center'}); c.classList.remove('flash'); void c.offsetWidth; c.classList.add('flash'); setTimeout(()=>c.classList.remove('flash'),1600);
}

// Results view switch and everything inside the Runners and Team views (one delegated listener).
document.addEventListener('click',e=>{ if(e.target.closest('[data-rvback]')){ rvRunner=null; renderRunners(); navBar(); window.scrollTo(0,rvListY); } }); // 3.0: nav bar back
$('#v-results').addEventListener('click',e=>{
  const v=e.target.closest('[data-rv]'); if(v){ rvRunner=null; showResultsView(v.dataset.rv); save(); return; }
  const rn=e.target.closest('[data-runner]'); if(rn){ rvListY=window.scrollY; rvRunner=rn.dataset.runner; renderRunners(); window.scrollTo(0,0); return; }

  const ch=e.target.closest('[data-rvchart]'); if(ch&&!ch.disabled){ rvChart=ch.dataset.rvchart; showResultsView(); return; }
  const gt=e.target.closest('[data-goto]'); if(gt){ const id=gt.dataset.goto; if(S.roster.some(a=>a.id===id)){ rvListY=0; rvRunner=id; showResultsView('runners'); save(); window.scrollTo(0,0); } return; } // any chart dot or line (2.10)
  const uc=e.target.closest('[data-uncmp]'); if(uc){ rvCompare=rvCompare.filter(x=>x!==uc.dataset.uncmp); renderRunners(); return; }
  const ls=e.target.closest('[data-lvlset]'); if(ls){ levelSheet({season:+ls.dataset.lvlset}); return; }
  const lv=e.target.closest('[data-teamlvl]'); if(lv){ S.settings.teamLevel=lv.dataset.teamlvl; save(); renderTeamView(); return; }
  const op=e.target.closest('[data-openrace]'); if(op){ const [w,id,rid]=op.dataset.openrace.split('|'); openRaceAt(w,id,rid); return; }
});
$('#v-results').addEventListener('change',e=>{ if(e.target.matches('[data-cmp]')&&e.target.value){ rvCompare=[...rvCompare.filter(x=>x!==e.target.value),e.target.value].slice(-2); renderRunners(); return; }
  if(e.target.matches('[data-tvseason]')){ tvSeason=+e.target.value; renderTeamView(); return; } if(e.target.matches('[data-extag]')){ S.settings.excludeTagged=e.target.checked; save(); showResultsView(); } });
$('#v-results').addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-goto]')){ e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click',{bubbles:true})); } }); // chart dots by keyboard
$('#v-results').addEventListener('input',e=>{ if(e.target.matches('[data-rvq]')){ rvQuery=e.target.value; const pos=e.target.selectionStart; renderRunners(); const i=$('#rvRunners [data-rvq]'); if(i){ i.focus(); try{ i.setSelectionRange(pos,pos); }catch(err){} } } });

// Results > Team history
// Redraws keep which saved races are open, so a save or a sync update never collapses them (2.7.1).
const dKey=d=>d.dataset.meet?'m:'+d.dataset.meet:d.dataset.combo?'c:'+d.dataset.combo:d.dataset.entry; // meets and combined races stay open too (2.11.1)
const openIds=box=>new Set([...box.querySelectorAll('details[open][data-entry],details[open][data-meet]')].map(dKey));
const reopenIds=(box,ids)=>box.querySelectorAll('details[data-entry],details[data-meet]').forEach(d=>{ if(ids.has(dKey(d))) d.open=true; });
function renderRaceLog(){
  const an=$('#adjNoteMeets'); if(an) an.innerHTML=`${esc(ADJ_NOTE)} <span class="wx-attr-in">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a></span>`; // 3.1: the one-line explanation; 3.4: and the weather credit, once for the screen
  const keepOpen=openIds($('#raceLogList'));
  const team=syncMode()==='joined', L=raceLog().filter(x=>!team||!x.uploaded), box=$('#raceLogWrap');
  box.hidden=!L.length; if(!L.length){ $('#raceLogList').innerHTML=''; return; }
  $('#raceLogList').innerHTML=(team?`<p class="count">Saved before this phone joined the team. <button class="btn" data-rlup>Upload to Team history</button></p>`:'')+L.map(x=>{ const M=modelOf(x), n=(M.rows||[]).length, d=new Date(x.savedAtMs||Date.parse(x.date+'T12:00'));
    return `<details class="hist" data-entry="${esc(x.id)}" data-where="local"><summary><span>${esc(d.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'}))} · ${esc(M.name||'Race')}</span><span class="n">Race, ${n} runner${n===1?'':'s'}</span></summary>
      ${rdLine([{date:x.date,where:'local',M}])}<div class="res-card">${raceTable(M,true,{tags:true})}</div><div class="race-actions"><button class="btn" data-rledit="${x.id}">Edit times</button><span class="share-acts" hidden><button class="btn" data-rlcopy="${x.id}">Copy results</button></span><button type="button" class="btn share-btn" data-share aria-label="Share these results"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>Share</button><button class="btn warn" data-rldel="${x.id}">Delete from this phone</button></div></details>`; }).join('');
  reopenIds($('#raceLogList'),keepOpen);
}
function savedTagTap(e){ // Tag / Race tags on a saved race (2.8)
  const b=e.target.closest('[data-rtag]'), box=b&&b.closest('[data-entry]'); if(!box) return false;
  const where=box.dataset.where, h=where==='team'?teamEntry(box.dataset.entry):raceLog().find(y=>y.id===box.dataset.entry); if(h) tagSheet({entry:h,where},b.dataset.rtag||null); return true;
}
// Tapping a time in a saved race opens the same editor as the race screen.
function savedCellTap(e){
  const oc=e.target.closest('[data-offcell]'); if(oc&&oc.closest('[data-entry]')){ toast('Official time (imported). Hand-timed splits are kept with it.'); return true; }
  const rc=e.target.closest('[data-rc]'), box=rc&&rc.closest('[data-entry]'); if(!box) return false;
  if(box.dataset.combo&&rc.dataset.rcid){ const where=box.dataset.where, h=where==='team'?teamEntry(box.dataset.entry):raceLog().find(y=>y.id===box.dataset.entry); if(!h) return true;
    const [rid,ci]=rc.dataset.rcid.split(':'); timeSheet({entry:h,where},rid,+ci); return true; } // a combined race (2.11.1): by runner id
  const where=box.dataset.where, h=where==='team'?teamEntry(box.dataset.entry):raceLog().find(y=>y.id===box.dataset.entry); if(!h) return true;
  const [ri,ci]=rc.dataset.rc.split(':').map(Number), M=modelOf(h); if(M.rows[ri]) timeSheet({entry:h,where},M.rows[ri].id,ci); return true;
}
$('#raceLogList').addEventListener('click',async e=>{
  if(savedCellTap(e)||savedTagTap(e)) return;
  if(e.target.closest('[data-rlup]')){ uploadRaces(); return; }
  const ed=e.target.closest('[data-rledit]'); if(ed){ const x=raceLog().find(y=>y.id===ed.dataset.rledit); if(x) editTimesSheet({entry:x,where:'local'}); return; }
  const c=e.target.closest('[data-rlcopy]'); if(c){ const x=raceLog().find(y=>y.id===c.dataset.rlcopy); if(x){ try{ await navigator.clipboard.writeText(raceText(modelOf(x))); toast('Results copied'); }catch(err){ toast('Copy did not work here'); } } return; }
  const d=e.target.closest('[data-rldel]'); if(!d) return;
  const x=raceLog().find(y=>y.id===d.dataset.rldel); if(!x) return;
  const key=trashPut({kind:'racelog',id:x.id,label:(x.race&&x.race.name)||'Race',item:x});
  RACELOG=RACELOG.filter(y=>y.id!==x.id); S.raceLog=RACELOG.slice(0,5); storeDel('races',x.key||x.id); save(); renderRaceLog(); // the copy now lives in the trash
  removedSnack('Race removed from this phone',key);
});
function renderHistory(){
  renderRaceLog();
  const box=$('#histWrap'), L=$('#histList'), PL=$('#practiceList');
  const OFF=allRaces(true).filter(x=>x.where==='official');
  box.hidden=syncMode()==='local'&&!OFF.length; // official results (2.9) show here on a phone without a team too (with that phone's races combined, 2.11.1)
  $('#histTitle').textContent=syncMode()==='local'?'Official results':'Team history';
  const LP=(S.practice||[]).filter(h=>!h.deleted); // 3.3.1: End workout on a phone without a team
  if(box.hidden){ $('#practiceWrap').hidden=!LP.length; const kp=openIds(PL); PL.innerHTML=practiceHTML(LP); reopenIds(PL,kp); return; }
  const keepOpen=openIds(L), keepP=openIds(PL), P=[...teamHistory.filter(h=>!h.deleted&&!(h.kind==='race'&&h.race)),...LP].sort((a,b)=>(b.savedAtMs||0)-(a.savedAtMs||0)), R=allRaces().filter(x=>x.where==='team'||x.where==='official'||(x.where==='local'&&syncMode()!=='joined')), MS=OFF.filter(x=>x.h.level==='MS');
  $('#practiceWrap').hidden=!P.length;
  if(!P.length&&!R.length){ L.innerHTML=`<p class="count">Nothing yet. Clear track on the Stopwatches tab saves that day's results here.</p>`; PL.innerHTML=''; return; }
  const whenOf=h=>{ const d=new Date(h.savedAtMs||Date.parse(h.date+'T12:00')); return d.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'})+', '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); };
  const raceHTML=x=>{ if(x.where==='official') return officialHTML(x,R); const h=x.h, M=x.M, n=(M.rows||[]).length, tagged=(M.raceTags||[]).length||Object.values(M.tags||{}).some(t=>t.tags.length||t.note);
    return `<details class="hist" data-id="${esc(h.id)}" data-entry="${esc(h.id)}" data-where="team"><summary><span>${M.meetId?esc(divName(M.division)||M.name||'Race'):esc(fmtDay(h.date)+' · '+(M.name||'Race'))}${tagged?' <span class="tagi" title="Has context tags">⚑</span>':''}</span><span class="n">${M.meetId?esc(M.name||'Race')+', ':''}${n} runner${n===1?'':'s'}</span></summary>
      ${rdLine([x])}<div class="res-card">${raceTable(M,true,{tags:true})}</div><div class="race-actions"><button class="btn" data-hedit="${esc(h.id)}">Edit times</button><span class="share-acts" hidden><button class="btn" data-hcopy="${esc(h.id)}">Copy results</button><button class="btn" data-hcsv="${esc(h.id)}">Save as spreadsheet (CSV)</button></span><button type="button" class="btn share-btn" data-share aria-label="Share these results"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>Share</button><button class="btn warn" data-hdel="${esc(h.id)}">Delete this entry</button></div></details>`; };
  // Races by season, then meet (newest first); races without a meet after them.
  const linked=R.filter(x=>x.M.meetId), loose=R.filter(x=>!x.M.meetId), seasons=[...new Set(linked.map(x=>seasonOf(x.at)))].sort((a,b)=>b-a);
  let html=seasons.map(y=>{ const inS=linked.filter(x=>seasonOf(x.at)===y), meets=[...new Set(inS.map(x=>x.M.meetId))];
    const order=meets.map(id=>({id,d:(meetOf(id)||{}).date||inS.find(x=>x.M.meetId===id).date})).sort((a,b)=>String(b.d).localeCompare(String(a.d)));
    return `<h4 class="hist-season">${esc(seasonLabel(y))} season</h4>`+order.map(({id})=>meetHTML(id,inS.filter(x=>x.M.meetId===id))).join(''); }).join(''); // one item per meet, its races inside (2.11.1)
  if(loose.length) html+=`<h4 class="hist-season">Not linked to a meet <button type="button" class="linkish" data-hlink>Link past races</button></h4>`+loose.map(raceHTML).join('');
  if(MS.length) html+=`<h4 class="hist-season">Middle school (official results)</h4>`+MS.map(x=>officialHTML(x,R)).join('');
  if(!html) html=`<p class="count">No races yet. Practice history is below.</p>`;
  // Practice history comes after Races on this phone (2.8.1, as planned for 2.8).
  PL.innerHTML=practiceHTML(P);
  L.innerHTML=html;
  reopenIds(L,keepOpen); reopenIds(PL,keepP); bindChartHover(L);
  if(!L._keys){ L._keys=1; L.addEventListener('toggle',e=>{ if(e.target.open) inlineKeys(e.target); },true); } // 3.4
}
function practiceHTML(P){ const whenOf=h=>{ const d=new Date(h.savedAtMs||Date.parse(h.date+'T12:00')); return d.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'})+', '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); };
  return P.map(h=>{
    const ws=h.watches||[];
    const cards=ws.map(w=>{
      const P2={reps:w.reps||1};
      const tbl=(w.splits&&w.splits.length)?splitTable(P2,{splits:w.splits}):lapTable({laps:w.laps||[]});
      return `<div class="res-card"><h3>${esc(w.name||'Unnamed')}</h3><div class="meta">${esc(w.workout||'No workout')}${w.total?', total '+fmtClock(w.total):''}</div>${(w.members||[]).length?`<div class="meta">Runners: ${esc(w.members.join(', '))}</div>`:''}<div class="tbl-wrap">${tbl}</div></div>`;
    }).join('');
    return `<details class="hist" data-id="${esc(h.id)}" data-entry="${esc(h.id)}"><summary><span>${esc(whenOf(h))}</span><span class="n">${ws.length} stopwatch${ws.length===1?'':'es'}</span></summary>
      <div class="res-grid">${cards}</div><button class="btn warn" data-hdel="${esc(h.id)}">Delete this entry</button></details>`;
  }).join(''); }
// ---- One race per division per meet (2.11.1) ----
// A meet shows at most one race per division (Girls Varsity, Girls JV, Boys Varsity, Boys JV). The hand-timed race
// and the imported official results for that meet and division become one race: every runner has one row, the
// official finish is the result, hand-timed checkpoint splits stay attached (so the last split runs to the official
// finish), and where hand and official finishes differ the hand time shows as a small note. Nothing saved is
// rewritten: this is how the races are shown (and what Copy and CSV use for that race).
const DIV_ORDER=['G','B','U']; // 2.13: one Girls list and one Boys list per meet (Varsity and JV together)
const divKey=x=>gkey(x.M.division)||(x.M.g==='G'||x.M.g==='B'?x.M.g:genderOfModel(x.M))||'U';
const divLabel=k=>k==='G'?'Girls':k==='B'?'Boys':'Unassigned (no Girls/Boys)';
function combineDiv(key,list){
  const hand=list.filter(x=>x.where!=='official').sort((a,b)=>b.M.rows.length-a.M.rows.length), off=list.filter(x=>x.where==='official').sort((a,b)=>b.M.rows.length-a.M.rows.length);
  const base=hand[0]||null, extra=[];
  let M, fi;
  if(base&&base.fi>=0){
    M={...base.M,rows:base.M.rows.map(r=>({...r,cells:r.cells.slice()}))}; fi=base.fi;
    hand.slice(1).forEach(x=>{ if(x.M.checkpoints.length===M.checkpoints.length&&sameDist(x.fin,base.fin)) x.M.rows.forEach(r=>{ if(!M.rows.some(z=>z.id===r.id)) M.rows.push({...r,cells:r.cells.slice()}); }); else extra.push(x); });
    off.forEach(o=>{ if(!sameDist(o.fin,base.fin)){ extra.push(o); return; }
      o.M.rows.forEach(orow=>{ const c=orow.cells[o.fi]; if(!c) return; let row=M.rows.find(z=>z.id===orow.id);
        if(!row){ row={...orow,cells:M.checkpoints.map(()=>null)}; M.rows.push(row); }
        const h=row.cells[fi]; row.cells[fi]={t:c.t,off:true,handT:h&&!h.off?h.t:null,mid:h&&h.mid}; row.place=orow.place; row.grade=orow.grade; }); });
  } else if(off.length){ const o=off[0]; M={...o.M,rows:o.M.rows.map(r=>({...r,cells:r.cells.map(c=>c&&{...c,off:true})}))}; fi=o.fi;
    off.slice(1).forEach(x=>{ if(!sameDist(x.fin,o.fin)){ extra.push(x); return; } x.M.rows.forEach(r=>{ if(!M.rows.some(z=>z.id===r.id)) M.rows.push({...r,cells:r.cells.map(c=>c&&{...c,off:true})}); }); }); // Varsity + JV lists: one list (2.13)
    hand.forEach(x=>extra.push(x)); }
  else { M=base.M; fi=base.fi; }
  const splits=!!base&&M.checkpoints.filter(c=>c.dist>0).length>=2, diff=M.rows.filter(r=>{ const c=fi>=0&&r.cells[fi]; return c&&c.handT!=null&&Math.abs(c.handT-c.t)>=0.05; }).length;
  return {key,label:divLabel(key),M,fi,hand:base,off:off[0]||null,offs:off,hands:hand,extra,splits,diff};
}
function meetDivisions(L2){ // the races of one meet -> its division races
  // A hand-timed race's rows follow each runner's own Girls/Boys setting (a runner switched to Girls moves to the Girls
  // race of the same level), so a Girls/Boys change re-sorts every view at once (2.11.1).
  const parts=[]; L2.forEach(x=>{ const d=x.M.division||''; if(x.where==='official'){ parts.push(x); return; }
    const by={}; x.M.rows.forEach(r=>{ const a=S.roster.find(y=>y.id===r.id), g=a&&(a.gender==='G'||a.gender==='B')?a.gender:(gkey(d)||'U'); (by[g]||(by[g]=[])).push(r); }); // Both races split by each runner's Girls/Boys (2.13)
    Object.entries(by).forEach(([g,rows])=>parts.push(g===gkey(d)&&rows.length===x.M.rows.length?x:{...x,M:{...x.M,rows,division:g==='U'?'':g+'V'}})); });
  const by={}; parts.forEach(x=>{ const k=divKey(x); (by[k]||(by[k]=[])).push(x); });
  const rank=k=>{ const i=DIV_ORDER.indexOf(k); return i<0?10+k.charCodeAt(0):i; };
  return Object.keys(by).sort((a,b)=>rank(a)-rank(b)).map(k=>combineDiv(k,by[k]));
}
const comboCache={};
function divRaceHTML(dv,mid){
  const h=dv.hand&&dv.hand.h, o=dv.off&&dv.off.h, M=dv.M, n=M.rows.filter(r=>dv.fi>=0&&r.cells[dv.fi]).length||M.rows.length, ck=mid+'|'+dv.key; comboCache[ck]=dv;
  const tagged=(M.raceTags||[]).length||Object.values(M.tags||{}).some(t=>t.tags.length||t.note);
  const badges=`${dv.off?'<span class="off-badge">Official</span>':''}${dv.splits?'<span class="sp-badge">Splits</span>':dv.hand?'<span class="sp-badge">Hand-timed</span>':''}${tagged?' <span class="tagi" title="Has context tags">⚑</span>':''}`;
  const notes=[dv.diff?`Hand-timed and official finish differ for ${dv.diff} runner${dv.diff===1?'':'s'}: the hand time shows under the official one.`:'',
    dv.extra.length?`${dv.extra.length} more result list${dv.extra.length===1?'':'s'} for this division couldn’t be combined (a different distance or checkpoints).`:''].filter(Boolean);
  const where=h?(teamEntry(h.id)?'team':'local'):'official';
  return `<details class="hist div-race" data-entry="${esc(h?h.id:o.id)}" data-where="${where}" data-combo="${esc(ck)}"${o?` data-also="${esc(o.id)}"`:''}><summary><span class="dr-name">${esc(dv.label)} ${badges}</span><span class="n">${n} runner${n===1?'':'s'}</span></summary>
    ${notes.map(t=>`<p class="hint dr-note">${esc(t)}</p>`).join('')}
    ${M.unassigned&&!h?unassignedHTML(M.rows):''}
    <div class="res-card">${raceTable(M,!!h,{tags:!!h})}</div>
    <div class="race-actions">${h?`<button class="btn" data-hedit="${esc(h.id)}">Edit hand times</button>`:''}<span class="share-acts" hidden><button class="btn" data-ccopy="${esc(ck)}">Copy results</button><button class="btn" data-ccsv="${esc(ck)}">Save as spreadsheet (CSV)</button></span><button type="button" class="btn share-btn" data-share aria-label="Share these results"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>Share</button>${h&&where==='team'?`<button class="btn warn" data-hdel="${esc(h.id)}">Delete hand-timed race</button>`:''}</div></details>`;
}
// 3.1: the race day's difficulty rating at the top of each meet (or "Not enough data"), with its confidence.
function rdLine(L2,noWx){ const F=dayRatings(), x=L2.find(y=>F.key(y)&&F.info[F.key(y)]); const k=x&&F.key(x), sp=k?wxSplitText(F,k):'', c=k&&F.conf[k];
  const short=!k?'':!c?'Race day: not enough data':Math.abs(c.secs)<1?'Race day: average':`Race day: ${fmtSec(Math.abs(c.secs),0)} ${c.secs>0?'harder':'easier'}`;
  return (k?`<details class="rd-line"><summary><span>${esc(short)}</span> ${ratingBadge(F,k)}</summary><p class="rd-more">${esc(ratingText(F,k))}</p>${sp?`<p class="rd-split">${esc(sp)}</p>`:''}</details>`:'')+(noWx?'':wxHere(L2)); } // 3.4: one line; the details on tap
// 3.2: the weather of a race (or a meet's races): numbers, flags, attribution; or why there's none yet.
function wxHere(L2){ const rec=wxForDay(L2); if(rec&&rec.status==='ok') return `<p class="wx-mini">${wxTag(rec)}</p>`; if(rec) return wxBlock(rec); const pid=L2.map(racePlaceId).find(Boolean), p=pid&&placeById(pid);
  if(!pid) return ''; if(p&&p.confirmed&&p.lat==null) return ''; return wxBlock(null,{why:p&&p.confirmed?'waiting to be looked up':`confirm the location of ${placeName(pid)} (Settings > Weather > Race locations)`}); } // 3.4: a compact tag; the details on tap
// 3.2: the same meet across years, weather side by side (newest first), with flags.
function wxYearsHTML(mt,date){ if(!mt||!mt.seriesId) return ''; const A=allRaces(true);
  const rows=(S.meets||[]).filter(m=>!m.deleted&&m.seriesId===mt.seriesId&&m.date).sort((a,b)=>b.date.localeCompare(a.date)).map(m=>{ const L=A.filter(x=>x.M.meetId===m.id||(x.date===m.date&&x.M.seriesId===m.seriesId)); const rec=L.length?wxForDay(L):wxRec(m.date+'_'+m.courseId); return {m,rec}; }).filter(r=>r.rec&&r.rec.status==='ok');
  if(rows.length<2) return '';
  return `<h4 class="mc-h">Weather at this meet, year by year</h4><div class="tbl-wrap"><table class="race-table wx-years"><thead><tr><th>Year</th><th>Weather</th></tr></thead><tbody>${rows.map(({m,rec})=>`<tr${m.date===date?' class="hl"':''}><td>${esc(m.date.slice(0,4))}<span class="sub2">${esc(fmtDay(m.date))}</span></td><td>${esc(wxShort(rec.wx))}<span class="sub2">${rec.wx.pr>=0.01?esc(rec.wx.pr.toFixed(2))+'″ rain during':'no rain during'} · ${esc(rec.wx.pr48.toFixed(2))}″ before</span>${wxFlags(rec).length?`<span class="wx-flags">${flagsHTML(rec)}</span>`:''}</td></tr>`).join('')}</tbody></table></div>${WX_ATTR}`; }
function meetHTML(id,L2){
  const mt=meetOf(id), x0=L2[0], name=mt?seriesName(mt.seriesId):(seriesName(x0.M.seriesId)||x0.M.name||'Meet'), date=mt&&mt.date||x0.date, divs=meetDivisions(L2);
  const wr=wxForDay(L2), tg=wxTag(wr);
  return `<details class="hist-meet" data-meet="${esc(id)}"><summary><span class="mt-name">${esc(name)}<span class="mt-date">${esc(fmtDay(date))}</span></span>${tg?`<span class="mt-side">${tg}</span>`:''}</summary>
    ${rdLine(L2,!!tg)}${divs.map(dv=>divRaceHTML(dv,id)).join('')}${meetChartsInner(L2)}${wxYearsHTML(mt,date)}</details>`;
}

// An imported official result list, with the hand-timed time beside each runner when this team also timed that race.
function officialHTML(x,R){
  const M=x.M, fi=x.fi, hand=allRaces().find(y=>y.where!=='official'&&y.date===x.date&&y.M.division===M.division&&sameDist(y.fin,x.fin));
  const hrow=r=>{ if(!hand) return null; const row=hand.M.rows.find(z=>z.id===r.id)||hand.M.rows.find(z=>z.name===r.name); return row&&row.cells[hand.fi]?row.cells[hand.fi].t:null; };
  const rows=M.rows.filter(r=>r.cells[fi]).sort((a,b)=>a.cells[fi].t-b.cells[fi].t);
  return `<details class="hist off" data-entry="${esc(x.h.id)}" data-where="official"><summary><span>${esc(M.meetId?(divName(M.division)||M.name):fmtDay(x.date)+' · '+M.name)} <span class="off-badge">Official</span></span><span class="n">${rows.length} runner${rows.length===1?'':'s'}</span></summary>
    <p class="hint">${esc(fmtDay(x.date))} · ${esc(distLabel(x.fin))}${M.printed&&M.printed!==M.name?` · printed as “${esc(M.printed)}”`:''}${hand?' · hand-timed by your coaches too':''}</p>
    ${M.unassigned?unassignedHTML(rows):''}${x.h.level==='MS'?wxHere([x]):''}
    <div class="tbl-wrap"><table class="race-table off-table"><thead><tr><th>#</th><th>Runner</th><th>Official</th>${hand?'<th>Hand-timed</th>':''}<th>Pace</th><th>Place</th></tr></thead><tbody>
    ${rows.map((r,i)=>{ const t=r.cells[fi].t, ht=hrow(r); return `<tr data-rrow="${esc(r.id)}"><td>${i+1}</td><td>${esc(r.name)}${r.grade?`<span class="sub2">grade ${r.grade}</span>`:''}</td><td>${fmtRace(t)}</td>${hand?`<td>${ht!=null?fmtRace(ht)+`<span class="sub2">${fmtDelta(ht-t)}</span>`:'–'}</td>`:''}<td>${fmtSec(t/(x.fin/MILE),0)}/mi</td><td>${r.place?ord(r.place):'–'}</td></tr>`; }).join('')}
    </tbody></table></div></details>`;
}
// Unassigned (2.9.2): runners with no Girls/Boys setting, with buttons to set it (re-sorts their results everywhere).
function unassignedHTML(rows){
  const L=rows.map(r=>S.roster.find(a=>a.id===r.id)).filter(a=>a&&a.gender!=='G'&&a.gender!=='B');
  return `<div class="ts-warn unassigned"><p>Unassigned: ${L.length?'these runners have':'these results are not linked to a runner with'} no Girls/Boys setting, so they count in no division.${L.length?' Set it here or on the Team tab:':''}</p>
    ${L.map(a=>`<div class="lvl-row"><span><b>${esc(a.name)}</b></span><span class="seg2 lvl-seg" role="group" aria-label="Girls or Boys for ${esc(a.name)}"><button type="button" data-setg="${a.id}:G">Girls</button><button type="button" data-setg="${a.id}:B">Boys</button></span></div>`).join('')}</div>`;
}
async function histClick(e){
  const cc=e.target.closest('[data-ccopy],[data-ccsv]'); if(cc){ const dv=comboCache[cc.dataset.ccopy||cc.dataset.ccsv]; if(!dv) return; const M=dv.M;
    if(cc.dataset.ccopy){ try{ await navigator.clipboard.writeText(raceText(M)); toast('Results copied'); }catch(err){ toast('Copy did not work here'); } }
    else await shareFile(new File([raceCSV(M)],`race-${(M.name||'results').replace(/[^\w-]+/g,'-').toLowerCase()}-${dv.key}.csv`,{type:'text/csv'}),'Race results');
    return; }
  const sg=e.target.closest('[data-setg]'); if(sg){ const [id,g]=sg.dataset.setg.split(':'), a=S.roster.find(x=>x.id===id); if(a){ a.gender=g; save(); memo.clear(); offSet([...OFFICIAL]); refreshAll(); toast(`${a.name}: ${g==='G'?'Girls':'Boys'}`); } return; }
  const ol=e.target.closest('[data-offlvl]'); if(ol){ const h=offEntries().find(x=>x.id===ol.dataset.offlvl); if(h) levelSheet({keys:h.race.keys,missing:false}); return; }
  if(savedCellTap(e)||savedTagTap(e)) return;
  if(e.target.closest('[data-hlink]')){ linkSheet(); return; }
  const he=e.target.closest('[data-hedit]'); if(he){ const h=teamEntry(he.dataset.hedit); if(h) editTimesSheet({entry:h,where:'team'}); return; }
  const hc=e.target.closest('[data-hcopy],[data-hcsv]');
  if(hc){ const h=teamEntry(hc.dataset.hcopy||hc.dataset.hcsv); if(!h) return; const M=modelOf(h);
    if(hc.dataset.hcopy){ try{ await navigator.clipboard.writeText(raceText(M)); toast('Results copied'); }catch(err){ toast('Copy did not work here'); } }
    else await shareFile(new File([raceCSV(M)],`race-${(M.name||'results').replace(/[^\w-]+/g,'-').toLowerCase()}-${h.date}.csv`,{type:'text/csv'}),'Race results');
    return; }
  const lb=e.target.closest('[data-hdel^="lp-"]'); if(lb){ const h=(S.practice||[]).find(x=>x.id===lb.dataset.hdel); if(!h) return; h.deleted=true; save(); renderHistory(); snack('Practice entry removed','Undo',()=>{ h.deleted=false; save(); renderHistory(); },8000); return; } // 3.3.1: soft
  const b=e.target.closest('[data-hdel]'); if(!b||!SYNC) return;
  const h=teamEntry(b.dataset.hdel); if(!h) return;
  const key=trashPut({kind:'history',id:h.id,label:h.kind==='race'&&h.race?(h.race.name||'Race')+' ('+h.date+')':'Practice '+h.date,item:null,synced:true});
  h.deleted=true; SYNC.deleteHistory(h.id); renderHistory(); // soft delete: the entry stays in the team's records
  removedSnack('Entry removed for every coach',key);
}
$('#histList').addEventListener('click',histClick);
$('#practiceList').addEventListener('click',histClick);

/* ---------- merge runners (2.9.2) ---------- */
// Admin only (or a phone without a team). A merge record {id: duplicate, to: real runner, at, byName} lives in
// S.merges (synced, kind 'merges', soft-deleted by Undo). Saved results are never rewritten: every view maps the
// duplicate's id to the real runner (official results, hand-timed races, race marks, tags; mergedTo()/mapModel()).
// This phone's own data moves for real: stopwatch links, the live race (as append-only mark versions), PRs. The
// duplicate goes to Recently deleted with everything needed to undo the whole merge as one action.
// A hand-timed race not linked to a meet, on the date of a scheduled meet, belongs to that meet (2.11.1). With no
// division, it takes one from its runners' Girls/Boys and the race name or the meet's one level. Shown that way only;
// "Link past races" still records a link for good.
const attachCache=new WeakMap();
function attachMeet(M,date){
  if(!M||!M.rows) return M; const sig=(S.meets||[]).map(m=>m.id+m.date+(m.levels||[]).join('')).join(',')+'|'+S.roster.map(a=>a.id+(a.gender||'')).join('');
  const c=attachCache.get(M); if(c&&c.sig===sig) return c.N;
  let N=M; const same=!M.meetId&&date?(S.meets||[]).filter(m=>m.date===date):[];
  if(same.length===1){ const m=same[0]; N={...M,meetId:m.id,seriesId:m.seriesId,courseId:M.courseId||m.courseId,autoMeet:true}; }
  if(N.meetId&&!N.division){ const gs=[...new Set(N.rows.map(r=>(S.roster.find(a=>a.id===r.id)||{}).gender||''))], g=gs.length===1&&(gs[0]==='G'||gs[0]==='B')?gs[0]:'', nm=String(N.name||'').toLowerCase(), mt=meetOf(N.meetId);
    const lv=/\b(jv|junior)\b/.test(nm)?'JV':/\bvarsity\b/.test(nm)?'V':mt&&(mt.levels||[]).length===1?mt.levels[0]:'';
    if(g) N={...N,g,division:lv?g+lv:'',autoDiv:true}; }
  attachCache.set(M,{sig,N}); return N;
}
function mergeIndex(){ const L=S.merges||[]; return memoize('mergeIdx',()=>Object.fromEntries(L.map(m=>[m.id,m.to]))); }
function mergedTo(id){ if(!id) return id; const M=(S.merges||[]).length?mergeIndex():null; if(!M) return id; let x=id; for(let i=0;i<10&&M[x];i++) x=M[x]; return x; }
const mergeSig=()=>(S.merges||[]).map(m=>m.id+'>'+m.to).join(',');
const mapCache=new WeakMap();
function mapModel(M){
  if(!M||!M.rows||!(S.merges||[]).length) return M;
  const sig=mergeSig(), c=mapCache.get(M); if(c&&c.sig===sig) return c.N;
  if(!M.rows.some(r=>mergedTo(r.id)!==r.id)&&!Object.keys(M.tags||{}).some(k=>mergedTo(k)!==k)){ mapCache.set(M,{sig,N:M}); return M; }
  const N={...M,rows:[],marks:(M.marks||[]).map(m=>m.rid&&mergedTo(m.rid)!==m.rid?{...m,rid:mergedTo(m.rid)}:m),tags:{}};
  const seen=new Map();
  M.rows.forEach(r=>{ const id=mergedTo(r.id), a=S.roster.find(x=>x.id===id); const row={...r,id,name:a?a.name:r.name};
    const had=seen.get(id); if(had){ row.cells.forEach((c,i)=>{ if(c&&(!had.cells[i]||c.t<had.cells[i].t)) had.cells[i]=c; }); return; } // both in one race: the faster time
    seen.set(id,row); N.rows.push(row); });
  Object.entries(M.tags||{}).forEach(([k,v])=>{ N.tags[mergedTo(k)]=v; });
  mapCache.set(M,{sig,N}); return N;
}
function mergeCounts(dup){
  const all=allRaces(true), off=all.filter(x=>x.where==='official'&&x.M.rows.some(r=>r.id===dup)).length, hand=all.filter(x=>x.where!=='official'&&x.M.rows.some(r=>r.id===dup)).length;
  return {off,hand,prs:((S.prs||{})[dup]||[]).filter(p=>!p.deleted).length,watches:S.watches.filter(w=>w.athleteIds.includes(dup)).length,race:!!(S.race&&S.race.runners.some(x=>x.id===dup))};
}
function mergeSheet(pre){
  if(!canImport()){ toast('Only the team admin can merge runners.'); return; }
  const R=[...S.roster].filter(a=>a.name.trim()).sort((a,b)=>a.name.localeCompare(b.name)), opt=sel=>R.map(a=>`<option value="${a.id}"${a.id===sel?' selected':''}>${esc(a.name)}${a.group?' · '+esc(a.group):''}${a.gender?' · '+(a.gender==='G'?'Girls':'Boys'):''}</option>`).join('');
  modal(`<div class="merge-sheet"><h2>Merge runners</h2><p class="hint">For one runner entered twice (for example "Ben To." from an import and "Ben T."). Every result, time, tag, PR and stopwatch of the duplicate moves to the real runner, and the duplicate goes to Recently deleted. One Undo reverses all of it.</p>
    <label class="field">Duplicate (goes away)<select data-mg="dup"><option value="">Choose…</option>${opt(pre&&pre.dup)}</select></label>
    <label class="field">Real runner (keeps everything)<select data-mg="real"><option value="">Choose…</option>${opt(pre&&pre.real)}</select></label>
    <div class="mg-sum hint"></div><p class="form-err" id="mgErr2" hidden></p>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes" disabled>Merge</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild, d=m.querySelector('[data-mg=dup]'), r=m.querySelector('[data-mg=real]'), go=m.querySelector('[data-x=yes]'), sum=m.querySelector('.mg-sum');
    m.querySelector('[data-x=no]').onclick=close;
    const upd=()=>{ const ok=d.value&&r.value&&d.value!==r.value; go.disabled=!ok; if(!ok){ sum.textContent=d.value&&d.value===r.value?'Pick two different runners.':'Pick both runners first.'; return; }
      const c=mergeCounts(d.value), A=S.roster.find(x=>x.id===d.value), B=S.roster.find(x=>x.id===r.value);
      sum.innerHTML=`Moves to <b>${esc(B.name)}</b>: ${c.off} official result${c.off===1?'':'s'}, ${c.hand} hand-timed race${c.hand===1?'':'s'}, ${c.prs} PR${c.prs===1?'':'s'}, ${c.watches} stopwatch${c.watches===1?'':'es'}${c.race?', the race on screen':''}. ${esc(A.name)} goes to Recently deleted.${A.gender&&B.gender&&A.gender!==B.gender?` <b>Note:</b> ${esc(A.name)} is marked ${A.gender==='G'?'Girls':'Boys'}, ${esc(B.name)} ${B.gender==='G'?'Girls':'Boys'}; ${esc(B.name)}’s setting is kept and the results follow it.`:''}`; };
    d.onchange=upd; r.onchange=upd; upd();
    go.onclick=async()=>{ go.disabled=true; await takeSnapshot('Before merging runners'); const key=doMerge(d.value,r.value); close(); refreshAll();
      updateHealthBadge(); const A=TRASH.find(e=>e.key===key); removedSnack(`Merged ${A?A.item.name:'the duplicate'} into ${(S.roster.find(x=>x.id===r.value)||{}).name}`,key); };
  });
}
// This phone's own copies of the duplicate move to the real runner (stopwatches, the live race). Returns what changed.
function mergeLocal(dup,real){
  const B=S.roster.find(x=>x.id===real), out={watches:[],marks:[],raceRunner:null};
  S.watches.forEach(w=>{ const i=w.athleteIds.indexOf(dup); if(i<0) return; out.watches.push({id:w.id,ids:[...w.athleteIds],names:[...w.athleteNames],name:w.name});
    if(w.athleteIds.includes(real)){ w.athleteIds.splice(i,1); w.athleteNames.splice(i,1); } else { w.athleteIds[i]=real; if(B) w.athleteNames[i]=B.name; } });
  const r=S.race; if(r&&r.status!=='done'&&r.runners.some(x=>x.id===dup)){
    const i=r.runners.findIndex(x=>x.id===dup); out.raceRunner={i,rn:{...r.runners[i]},realExisted:r.runners.some(x=>x.id===real)};
    if(r.runners.some(x=>x.id===real)) r.runners.splice(i,1); else r.runners[i]={...r.runners[i],id:real,name:B?B.name:r.runners[i].name};
    r.marks.forEach(m=>{ if(m.runnerId===dup){ markChange(m,{runnerId:real}); out.marks.push(m.id); } }); }
  return out;
}
function doMerge(dup,real){
  const A=S.roster.find(x=>x.id===dup), B=S.roster.find(x=>x.id===real); if(!A||!B) return null;
  const prs={dup:JSON.parse(JSON.stringify((S.prs||{})[dup]||null)),real:JSON.parse(JSON.stringify((S.prs||{})[real]||null))}, gender=B.gender||'';
  const local=mergeLocal(dup,real);
  if(!B.gender&&A.gender) B.gender=A.gender;
  if(prs.dup){ const L=[...(S.prs[real]||[])]; prs.dup.filter(p=>!p.deleted).forEach(p=>{ const i=L.findIndex(q=>!q.deleted&&sameDist(q.dist,p.dist)); if(i<0) L.push({dist:p.dist,t:p.t}); else if(p.t<L[i].t) L[i]={dist:p.dist,t:p.t}; }); S.prs[real]=L; delete S.prs[dup]; }
  S.merges=[...(S.merges||[]).filter(m=>m.id!==dup),{id:dup,to:real,at:Date.now(),byName:S.settings.coachName||''}];
  S.roster=S.roster.filter(x=>x.id!==dup); refreshIdle(); memo.clear(); offSet([...OFFICIAL]);
  const key=trashPut({kind:'merge',id:dup,label:`${A.name} merged into ${B.name}`,item:{...A},extra:{to:real,prs,gender,local}});
  save(); return key;
}
function undoMerge(e){
  const x=e.extra||{}, dup=e.id, real=x.to;
  S.merges=(S.merges||[]).filter(m=>m.id!==dup);
  if(!x.offRoster&&!S.roster.some(a=>a.id===dup)) S.roster.push(e.item); // offRoster (2.12): it wasn't on the roster before either
  const B=S.roster.find(a=>a.id===real); if(B&&x.gender!==undefined) B.gender=x.gender; // back to the real runner's own setting
  if(x.prs){ if(x.prs.dup) S.prs[dup]=x.prs.dup; if(x.prs.real) S.prs[real]=x.prs.real; else delete S.prs[real]; }
  const L=x.local||{};
  (L.watches||[]).forEach(o=>{ const w=S.watches.find(y=>y.id===o.id); if(w){ w.athleteIds=o.ids; w.athleteNames=o.names; } });
  const r=S.race; if(r&&L.raceRunner){ if(!r.runners.some(y=>y.id===dup)){ if(L.raceRunner.realExisted) r.runners.splice(L.raceRunner.i,0,L.raceRunner.rn); else { const i=r.runners.findIndex(y=>y.id===real); if(i>=0) r.runners[i]=L.raceRunner.rn; } }
    r.marks.forEach(m=>{ if((L.marks||[]).includes(m.id)&&m.runnerId===real) markChange(m,{runnerId:dup}); }); }
  memo.clear(); offSet([...OFFICIAL]); refreshIdle(); return true;
}

/* ---------- official results: career history import (2.9) ---------- */
// An admin (or a phone without a team) imports a career history file (format mustang-splits-history/v1). The file
// holds minors' full names. Since 2.11.1 runners are saved with first and last name (the coach's request); a confirmed
// match for a name in the file is remembered only as a hash of that name. Imported results are Official results,
// separate from hand-timed races. Each import is one record (IndexedDB 'official'; in a team also
// teams/{t}/official/{id}, admin-only writes), split in parts of OFF_PART results. Undo soft-deletes the whole
// import (and the runners, meets, series and courses it created) as one action; Recently deleted restores it.
// Re-importing the same file adds nothing: every result has a key (name hash, date, distance, time).
// For the views, official results become read-only race models (offEntries()), so Meets, Runners, Team, goals,
// PRs and course factors use them. When an official and a hand-timed time exist for the same runner on the same
// day, the official one counts and the hand-timed one is shown next to it (never counted twice).
const OFF_PART=600, OFF_FORMAT=/^mustang-splits-history\/v1/;
let OFFICIAL=[], offGen=0; // every import record (deleted ones flagged); offGen bumps on any change
function offSet(list){ OFFICIAL=list; offGen++; memo.clear(); }
const memo=new Map(); // per-render memo for the heavy result views (cleared on data changes and every tick)
function memoize(k,f){ if(memo.has(k)) return memo.get(k); const v=f(); memo.set(k,v); if(memo.size===1) setTimeout(()=>memo.clear(),0); return v; }
const normName=n=>String(n||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/['’`.]/g,'').replace(/[^a-z -]/g,' ').replace(/-/g,' ').replace(/\s+/g,' ').trim();
async function nameHash(n){
  const txt='mustang-splits/history-name/v1|'+normName(n);
  try{ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt)); return [...new Uint8Array(b)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join(''); }
  catch(e){ let h1=0x811c9dc5,h2=0x1b873593; for(const ch of txt){ const c=ch.charCodeAt(0); h1=Math.imul(h1^c,16777619); h2=Math.imul(h2^c,2246822519); } return 'f'+(h1>>>0).toString(16)+(h2>>>0).toString(16); } // no WebCrypto (plain http)
}
// Nickname groups: a file name and a roster name match when their first names are in one group.
const NICK=[['benjamin','ben','benji','benny'],['isabella','isabelle','izzy','izzie','bella','isa'],['william','will','liam','bill','billy'],['alexander','alex','xander','al'],
  ['alexandra','alex','lexi','alexa','sasha'],['alexis','lexi','alex'],['samuel','sam','sammy'],['samantha','sam','sammie'],['maxwell','max'],['maximilian','max'],['katherine','kate','katie','kat','kathryn','catherine','cate','kathy'],
  ['abigail','abby','abbie','abi'],['elizabeth','liz','lizzie','beth','eliza','betsy','ellie'],['jacob','jake','jakob'],['joshua','josh'],['matthew','matt','matty'],['nicholas','nick','nicky','nico'],
  ['christopher','chris'],['christian','chris'],['christina','chris','tina','christine'],['anthony','tony'],['michael','mike','mikey','mick'],['daniel','dan','danny'],['danielle','dani'],['david','dave','davey'],
  ['thomas','tom','tommy'],['joseph','joe','joey'],['jonathan','jon','jonny','john','johnny'],['nathan','nate'],['nathaniel','nate','nat'],['zachary','zach','zack','zak'],['andrew','andy','drew'],
  ['eleanor','ellie','nora','elle','ella'],['madison','maddie','maddy'],['madeline','maddie','maddy','madelyn'],['emily','em','emmy'],['emma','em','emmy'],['gabriel','gabe'],['gabriella','gabby','gabrielle','ella'],
  ['jennifer','jen','jenny'],['rebecca','becca','becky'],['victoria','tori','vicky'],['sophia','sophie'],['olivia','liv','livvy','livy'],['addison','addie'],['adeline','addie','addy'],['charles','charlie','chuck'],
  ['charlotte','charlie','lottie'],['tyler','ty'],['edward','ed','eddie','ted'],['robert','rob','bob','bobby','robbie'],['gregory','greg'],['oliver','ollie'],['theodore','teddy','theo','ted'],
  ['jessica','jess','jessie'],['jeffrey','jeff'],['steven','steve'],['stephen','steve'],['timothy','tim','timmy'],['patrick','pat'],['margaret','maggie','meg','peggy'],['evelyn','evie'],['natalie','nat'],
  ['cameron','cam'],['benedict','ben'],['harrison','harry'],['henry','hank','harry'],['jackson','jack'],['jack','jackie'],['lucas','luke'],['kennedy','kenni'],['mackenzie','kenzie'],['mckenna','kenna']];
const sameFirst=(a,b)=>a===b||NICK.some(g=>g.includes(a)&&g.includes(b));
const SUFFIX=new Set(['jr','sr','ii','iii','iv']);
function splitName(n){ const p=normName(String(n||'').replace(/(\S)-(?=\S)/g,'$1')).split(' ').filter(x=>x&&!SUFFIX.has(x)); // a hyphenated last name is one name (2.12): "Ivy D." = Ivy Delacroix-Moss
  return {first:p[0]||'',last:p.length>1?p[p.length-1]:''}; }
// Roster runners a file runner could be (names = name + aliases). score 4 full name, 3 first + initial, 2 nickname, 1 first only.
// 2.9.2: a Girls/Boys difference no longer hides a candidate (a stray "Girls" label in the file hid "Ben T." and the
// import created "Ben To."); it's shown as a warning instead, and every plausible match is confirmed by the coach.
function rosterCands(names,gender){
  const out=[];
  S.roster.forEach(a=>{ if(!String(a.name||'').trim()) return; const gmis=!!(gender&&a.gender&&a.gender!==gender);
    const r=splitName(a.name), abbr=/\.\s*$/.test(String(a.name).trim())||r.last.length===1; let best=0; // "Ben T." / "Ben To." are abbreviations
    names.forEach(n=>{ const f=splitName(n); if(!f.first||!(sameFirst(r.first,f.first))) return;
      // last name: full match 4; an abbreviation that starts the file's last name 3; only the same initial 2 (still plausible: asked)
      const lk=!r.last?1:!f.last?0:r.last===f.last?4:abbr&&f.last.startsWith(r.last)?3:r.last[0]===f.last[0]?2:0; if(!lk) return;
      const sc=r.first===f.first?lk:Math.min(lk,2); // a nickname is never more than "plausible"
      if(sc>best) best=sc; });
    if(best) out.push({a,score:best,gmis}); });
  return out.sort((x,y)=>y.score-x.score||(x.gmis-y.gmis));
}
const capWord=w=>w?w.charAt(0).toUpperCase()+w.slice(1):'';
// Full names (2.11.1, at the coach's request): first and last name as printed in the file ("Ben Tollefsrud").
const fullName=n=>String(n||'').trim().split(/\s+/).filter(x=>!SUFFIX.has(normName(x))).map(w=>w===w.toUpperCase()||w===w.toLowerCase()?w.split('-').map(capWord2).join('-'):w).join(' ').slice(0,30);
const capWord2=w=>w?w.charAt(0).toUpperCase()+w.slice(1).toLowerCase():'';
function storeName(full,taken){ const nm=fullName(full)||'Runner'; if(!taken.has(nm.toLowerCase())) return nm; let i=2; while(taken.has(`${nm} ${i}`.toLowerCase())) i++; return `${nm} ${i}`; }
// A roster name that is a short form of the file's name ("Ben T." or "Ben" for Ben Tollefsrud) gets the full last name;
// the first name stays as the team uses it. A different name typed by a coach is never changed.
function fullNameFor(a,display){ const r=splitName(a.name), f=splitName(display), raw=String(a.name).trim(); if(!f.last||!r.first||!sameFirst(r.first,f.first)) return null;
  const short=!r.last||(/\.$/.test(raw)||r.last.length===1)&&f.last.startsWith(r.last); if(!short) return null;
  const first=raw.split(/\s+/)[0], last=fullName(display).split(' ').slice(1).join(' '); const to=(first+' '+last).slice(0,30); return to!==a.name?to:null; }
function parseDiv(div,level,gender){ // -> {g:'G'|'B'|'', division:'GV'|'BJV'|'OPEN'|'GMS'|''}
  const d=' '+String(div||'').toLowerCase().replace(/fr\/so|f\/s/g,' frosh ').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim()+' '; // "Frosh/Soph" -> words
  const g=/ (girls?|women|womens|female|ladies|g) /.test(d)?'G':/ (boys?|men|mens|male|b) /.test(d)?'B':(gender||'');
  if(level==='MS') return {g,division:(g||'')+'MS'};
  // 2.9.1: more ways a level is printed. Frosh/soph, open, reserve and similar non-varsity races count as JV.
  // 2.11.1: labels cut off on printouts: "Junior", "Junior V", "Junior Varsi", "Jr" = JV; "Varsity -", "Varsity D2/3", "Varsi" = V.
  const lv=/ (jv|junior|junio|jr|j v|sub varsity|subvarsity|b race|silver|reserve|reserves|open|frosh|soph|freshman|sophomore|fs|novice) /.test(d)||/ jv/.test(d)?'JV'
    :/ (varsity|varsit|varsi|vars|var|v|championship|champ|champs|gold|elite|a race) /.test(d)?'V':'';
  return {g,lv,division:g&&lv?g+lv:''};
}
// Meet names: one series for every way a meet's name was printed.
const meetKey=n=>normName(n).replace(/\b(19|20)\d\d\b/g,' ').replace(/\b\d+(st|nd|rd|th)\b/g,' ').replace(/\bannual\b/g,' ')
  .replace(/\b(invitational|invitationa|invitation|invit|invi|inv)\b/g,'invite').replace(/\b(cross country|xc|high school|hs|meet of)\b/g,' ').replace(/\s+/g,' ').trim();
const MEET_ALIASES=[
  ['s-winagamie-invite','Appleton West Terror Invite',['appleton west terror invite','terror invite','appleton west invite','winagamie invite','appleton west terror']],
  ['s-kiel-invite','Kiel Raiders Invite',['kiel invite','kiel raiders invite','kiel raider invite','kiel raiders']],
  ['s-winagamie-meet','Nightfall Classic',['nightfall classic','winagamie meet','nightfall','nightfall invite']],
  ['s-wausau-east-invite','Smiley Invitational',['smiley invite','bill smiley invite','wausau east invite','smiley','bill smiley']],
  ['s-mishicot-invite','Jim Bremser Memorial',['jim bremser memorial','bremser memorial','jim bremser memorial invite','mishicot invite','jim bremser']],
  ['s-waupaca-invite','Waupaca Invitational',['waupaca invite','waupaca']],
  ['s-albany-invite','Albany Baertschi Invite',['albany baertschi invite','baertschi invite','albany invite','baertschi']],
  ['s-brillion-invite','Brillion Invite',['brillion invite','brillion']],
  ['s-nec-conference','NEC Championship',['nec championship','nec conference','nec','north eastern conference','nec meet','north eastern conference championship','nec championships','nec conference championship']],
  ['s-wiaa-sectional','WIAA Sectional',[/sectional/]],
  ['s-wiaa-state','WIAA State',[/\bstate\b/]],
  ['s-red-raider-invite','Red Raider Invite',['red raider invite','red raiders invite']]];
const KNOWN_COURSE={'s-winagamie-invite':'Winagamie GC','s-kiel-invite':'Kiel HS','s-winagamie-meet':'Winagamie GC','s-wausau-east-invite':'Smiley / Wausau East','s-mishicot-invite':'Mishicot',
  's-waupaca-invite':'Waupaca','s-brillion-invite':'Brillion / Deer Run GC','s-albany-invite':'Albany - Madison','s-nec-conference':'UWGB','s-wiaa-state':'Wisconsin Rapids'};
const KIND_OF={'s-nec-conference':'NEC Conference','s-wiaa-sectional':'WIAA Sectionals','s-wiaa-state':'WIAA State Meet','s-winagamie-meet':'Meet'};
// Sectional and State move every year: the place in the printed name picks the course (2.9.1).
// "WIAA D2 Sectional - Kiel", "Sectional 4 - Waupaca", "WIAA State @ Wisconsin Rapids", "Sectional at New London".
const PLACE_SERIES=['s-wiaa-sectional','s-wiaa-state'];
function placeOf(raw){
  const parts=String(raw||'').split(/\s+[-–—@]\s+|\s+at\s+|\s*\(\s*|\s*\)\s*|,\s*/i).map(x=>x.trim()).filter(Boolean); if(parts.length<2) return '';
  const last=parts.slice(1).reverse().find(x=>!/sectional|state|wiaa|division|^d\d$|^div|boys|girls|varsity|^jv$|^\d+$/i.test(x)); if(!last) return '';
  return last.replace(/\s+(hs|high school|middle school)$/i,'').trim().slice(0,40);
}
// An existing course for a place ("Kiel" -> "Kiel HS", "Wausau East" -> "Smiley / Wausau East"), else a new one.
function courseByPlace(place,made){
  const k=normName(place); if(!k) return null;
  const ex=(S.courses||[]).find(c=>{ const n=' '+normName(c.name)+' '; return n.includes(' '+k+' '); }); if(ex) return ex.id;
  const id='c-'+slug(place), had=(S.courses||[]).find(c=>c.id===id); if(had) return had.id;
  const cid=newCourse(place,id); if(made) made.push(S.courses.find(c=>c.id===cid)); return cid;
}
// Meets this phone's imports created for Sectional and State before 2.9.1 got this season's course: fix them from the
// printed names (admin / no-team phones; the meet change syncs to everyone). Never touches this season's schedule.
function fixPlaceCourses(){
  if(!canImport()) return 0; let n=0;
  const res=[]; OFFICIAL.forEach(d=>{ if(!d.deleted) (d.results||[]).forEach(r=>res.push(r)); });
  (S.meets||[]).forEach(m=>{ if(!m.id.startsWith('mh-')||!PLACE_SERIES.includes(m.seriesId)) return;
    const r=res.find(x=>x.meetId===m.id&&placeOf(x.meet)); if(!r) return;
    const cid=courseByPlace(placeOf(r.meet)); if(cid&&cid!==m.courseId){ m.courseId=cid; n++; } });
  if(n){ save(); offSet([...OFFICIAL]); }
  return n;
}
const sigTok=k=>k.split(' ').filter(t=>t&&!['invite','meet','classic','the','and','of','at'].includes(t));
const MS_KEY=/\b(middle school|middle|ms|jh|junior high|intermediate)\b/; // a middle school meet never folds into a high school series by similarity
function knownSeries(key,cut){
  const ms=MS_KEY.test(key);
  for(const [id,name,al] of MEET_ALIASES){ if(ms) break; for(const a of al){ if(a instanceof RegExp?a.test(key):(a===key||(cut&&a.startsWith(key)&&key.length>=6))) return {id,name}; } }
  if(ms){ const ex=(S.series||[]).find(x=>meetKey(x.name)===key); return ex?{id:ex.id,name:ex.name}:null; }
  const ex=(S.series||[]).find(x=>meetKey(x.name)===key||(cut&&meetKey(x.name).startsWith(key)&&key.length>=6)); if(ex) return {id:ex.id,name:ex.name};
  const T=sigTok(key); if(!T.length) return null;
  for(const [id,name,al] of MEET_ALIASES) for(const a of al){ if(a instanceof RegExp) continue; const A=sigTok(a); if(A.length&&(A.every(t=>T.includes(t))||T.every(t=>A.includes(t)))) return {id,name}; }
  return null;
}
// Combine unknown names that are one meet printed two ways (one name's words inside the other's, or a cut-off prefix).
function groupMeetNames(raws){
  const keys=new Map(); raws.forEach(({raw,cut})=>{ const k=meetKey(raw); if(!k) return; const e=keys.get(k)||{key:k,raw:new Map(),cut:true,n:0}; e.raw.set(raw,(e.raw.get(raw)||0)+1); e.cut=e.cut&&cut; e.n++; keys.set(k,e); });
  const out=[], join=(host,e)=>{ e.raw.forEach((n,r)=>host.raw.set(r,(host.raw.get(r)||0)+n)); host.n+=e.n; host.alsoKeys=[...(host.alsoKeys||[]),e.key]; };
  [...keys.values()].sort((a,b)=>b.key.length-a.key.length).forEach(e=>{
    const kn=knownSeries(e.key,e.cut); if(kn){ const same=out.find(o=>o.sid===kn.id); if(same){ join(same,e); return; } out.push({...e,sid:kn.id,sname:kn.name,known:true}); return; }
    const T=sigTok(e.key), host=out.find(o=>!o.known&&MS_KEY.test(o.key)===MS_KEY.test(e.key)&&(o.key.startsWith(e.key)&&e.cut||(T.length&&T.every(t=>sigTok(o.key).includes(t)))));
    if(host){ join(host,e); return; }
    const best=[...e.raw.entries()].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length)[0][0];
    const nm=best.replace(/\b(19|20)\d\d\b/g,'').replace(/\b\d+(st|nd|rd|th)\b/gi,'').replace(/\bannual\b/gi,'').replace(/\binvitational\b/gi,'Invite').replace(/\s+/g,' ').trim().slice(0,40);
    const sid='s-'+slug(nm), same=out.find(o=>o.sid===sid); if(same){ join(same,e); return; }
    out.push({...e,sid,sname:nm,known:false}); });
  return out;
}
const secsOf=r=>{ const t=r.time_s!=null&&isFinite(+r.time_s)?+r.time_s:parseTime(r.time); return t>0?Math.round(t*10)/10:null; };
// Reads a file into an import plan (nothing is saved here).
async function importPlan(json){
  if(!json||!OFF_FORMAT.test(String(json.format||''))||!Array.isArray(json.athletes)) throw new Error('This isn’t a Mustang Splits history file (format mustang-splits-history/v1).');
  await STORE_READY;
  const have=new Set(), remembered={}; OFFICIAL.forEach(d=>{ Object.assign(remembered,d.matches||{}); if(!d.deleted) (d.results||[]).forEach(r=>have.add(r.k)); });
  const people=[], rawMeets=[], levelFix=[]; // levelFix (2.9.1): results already imported that the file now gives a level
  for(const [i,ath] of json.athletes.entries()){
    const names=[ath.name,...(Array.isArray(ath.aliases)?ath.aliases:[])].filter(x=>String(x||'').trim()); if(!names.length) continue;
    const hash=await nameHash(ath.name), rs=[], skip={dup:0,have:0,bad:0};
    const list=(ath.results||[]).map((r,j)=>({r,j,t:secsOf(r),dist:Math.round(+r.distance_m||0),date:/^\d{4}-\d\d-\d\d$/.test(r.date||'')?r.date:''}));
    const existing=[];
    const genders=list.map(x=>parseDiv(x.r.division,x.r.level).g).filter(Boolean), nG=genders.filter(g=>g==='G').length, nB=genders.length-nG;
    const gender=nG>nB?'G':nB>nG?'B':'', genderSure=!!genders.length&&(!nG||!nB); // never a default to Girls (2.9.2); a new runner gets it only when every label agrees
    const dropped=new Set();
    list.forEach(x=>{ if(!x.r.possible_duplicate_of||dropped.has(x.j)) return; // a flagged pair: keep the one with a division label
      const grp=list.filter(y=>!dropped.has(y.j)&&y.date===x.date&&y.dist===x.dist&&x.t!=null&&y.t!=null&&Math.abs(y.t-x.t)<=2);
      if(grp.length<2) return; const keep=grp.find(y=>String(y.r.division||'').trim())||grp[0]; grp.forEach(y=>{ if(y!==keep) dropped.add(y.j); }); });
    const keys=new Set();
    list.forEach(x=>{ const r=x.r;
      if(!x.t||!x.dist||!x.date){ skip.bad++; return; }
      if(dropped.has(x.j)){ skip.dup++; return; }
      const k=`${hash}|${x.date}|${x.dist}|${x.t.toFixed(1)}`; if(keys.has(k)){ skip.dup++; return; } keys.add(k);
      if(have.has(k)){ skip.have++; existing.push(k); const dv=parseDiv(r.division,String(r.level||'HS').toUpperCase()==='MS'?'MS':'HS',''); if(dv.lv&&dv.lv!=='OPEN') levelFix.push({k,level:dv.lv}); return; } // updates (2.11.1)
      const lv=String(r.level||'HS').toUpperCase()==='MS'?'MS':'HS', dv=parseDiv(r.division,lv,''); // this result's own label only
      rs.push({k,t:x.t,dist:x.dist,date:x.date,level:lv,grade:+r.grade||null,place:+r.place||null,meet:String(r.meet||'').slice(0,80),cut:!!r.meet_name_cut_off,division:dv.division,g:dv.g,...(dv.lv&&!dv.division?{lv:dv.lv}:{})});
      rawMeets.push({raw:String(r.meet||'').trim()||'Unknown meet',cut:!!r.meet_name_cut_off}); });
    const lastHS=list.filter(x=>x.r.grade&&x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
    const projGrade=lastHS?(+lastHS.r.grade)+(seasonOf(Date.now())-seasonOf(dayMs(lastHS.date))):null;
    const cands=rosterCands(names,gender), top=cands[0], rem=remembered[hash]&&mergedTo(remembered[hash]);
    // Automatic only when remembered, or one runner whose full last name matches and nobody else is plausible.
    // Any other plausible match (same first name or nickname + last initial, or an alias) is asked in the preview.
    let status='new', aid=null;
    if(rem&&S.roster.some(a=>a.id===rem)){ status='remembered'; aid=rem; }
    else if(top&&top.score===4&&!top.gmis&&cands.length===1){ status='certain'; aid=top.a.id; }
    else if(top){ status='check'; aid=top.a.id; }
    people.push({i,display:ath.name,school:ath.school||'',hash,gender:genderSure?gender:'',results:rs,skip,existing,cands,status,aid,create:status==='new'&&rs.length>0&&(projGrade==null||projGrade<=12),projGrade,confirmed:status!=='check'});
  }
  const meets=groupMeetNames(rawMeets);
  const E=levelEdits(), byK={}; OFFICIAL.forEach(d=>{ if(!d.deleted) (d.results||[]).forEach(r=>{ byK[r.k]=r; }); });
  // a level from the file updates a result whose level wasn't set by a coach and differs from what it shows now (2.11.1)
  const fixes=levelFix.filter(f=>{ const r=byK[f.k]; if(!r) return false; const cur=offLevel(r,E); return cur.src!=='set'&&cur.lv!==f.level; });
  void fixes; return {levelFix:[],file:{format:String(json.format).slice(0,40),source:String(json.source||'').slice(0,80),generated:String(json.generated||'').slice(0,40)},people,meets,schools:[...new Set(people.map(p=>p.school).filter(Boolean))]};
}
const meetOfRaw=(plan,raw)=>{ const k=meetKey(raw||'Unknown meet'); return plan.meets.find(m=>m.key===k||(m.alsoKeys||[]).includes(k))||null; };
// Settings > Import history file, and Results > Import history.
function canImport(){ // admin only in a team; any phone without one
  if(!SYNC){ try{ return !(JSON.parse(localStorage.getItem('mustang-splits:sync')||'{}')||{}).teamId; }catch(e){ return true; } }
  return syncMode()==='local'||!!syncInfo.isAdmin; }
function importEntry(){
  if(!canImport()){ toast('Only the team admin can import history. Ask your admin.'); return; }
  importSheet();
}
function importSheet(){
  const live=OFFICIAL.filter(d=>!d.deleted&&!d.part); // one row per import (part 0)
  modal(`<div class="imp-sheet"><h2>Official results</h2><p class="hint">Import a career history file (mustang-splits-history/v1). You see a preview before anything is saved. Runners are saved with their full names.</p>
    <button class="btn primary" id="impPick">Import history file</button>
    ${live.length?`<h3>Imported</h3>${live.map(d=>`<div class="set-row"><span>${esc(d.source||'History file')}<span class="hint">${esc(new Date(d.importedAt).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}))} · ${OFFICIAL.filter(x=>x.importId===d.importId&&!x.deleted).reduce((n,x)=>n+x.results.length,0)} results${d.byName?' · '+esc(d.byName):''}</span></span>${canImport()?`<button class="btn warn" data-impundo="${esc(d.importId)}">Remove</button>`:''}</div>`).join('')}`:''}
    <div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('#impPick').onclick=()=>{ if(!canImport()){ toast('Only the team admin can import history.'); return; } $('#histFile').value=''; $('#histFile').click(); };
    m.querySelectorAll('[data-impundo]').forEach(b=>b.onclick=()=>{ close(); undoImport(b.dataset.impundo); });
  });
}
$('#histFile').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  let plan; try{ plan=await importPlan(JSON.parse(await f.text())); }catch(err){ toast(err instanceof SyntaxError?'That file isn’t JSON.':(err&&err.message)||'Could not read that file.'); return; }
  previewSheet(plan);
});
// Updates for results already imported (2.11.1): Varsity/JV levels (from the plan), runner links and full names
// (from the matches chosen in the preview). All applied together, with one Undo; nothing is ever added twice.
function linkEdits(){ const L={}; OFFICIAL.forEach(d=>{ if(d.deleted) return; (d.edits||[]).forEach(v=>{ if(v.op==='link'&&(!L[v.k]||(L[v.k].at||0)<=(v.at||0))) L[v.k]=v; }); }); return L; }
function planUpdates(plan){
  const LE=linkEdits(), byK={}; OFFICIAL.forEach(d=>{ if(!d.deleted) (d.results||[]).forEach(r=>{ byK[r.k]=r; }); });
  const links=[], names=[];
  plan.people.forEach(p=>{ if(!p.aid) return; const real=mergedTo(p.aid);
    (p.existing||[]).forEach(k=>{ const r=byK[k]; if(!r) return; const cur=LE[k]?LE[k].aid:r.aid; if(mergedTo(cur)!==real) links.push({k,aid:real}); });
    const a=S.roster.find(x=>x.id===real), to=a&&fullNameFor(a,p.display); if(to&&!names.some(n=>n.id===a.id)) names.push({id:a.id,from:a.name,to}); });
  return {levels:[],links,names,n:links.length+names.length}; // 2.13: no Varsity/JV levels (each result keeps the division text from the file)
}
function setLinks(list,quiet){
  const by={}, at=Date.now(), LE=linkEdits(), undo=[];
  list.forEach(f=>{ const d=OFFICIAL.find(x=>!x.deleted&&(x.results||[]).some(r=>r.k===f.k)); if(!d) return; const r=d.results.find(x=>x.k===f.k);
    undo.push({k:f.k,aid:LE[f.k]?LE[f.k].aid:r.aid}); (by[d.id]||(by[d.id]=[])).push({op:'link',k:f.k,aid:f.aid||null,uid:myId(),dev:DEVICE,byName:S.settings.coachName||'',at}); });
  Object.entries(by).forEach(([id,vs])=>{ const d=OFFICIAL.find(x=>x.id===id); d.edits=[...(d.edits||[]),...vs]; storePut('official',d); if(SYNC&&syncMode()==='joined') SYNC.officialEdits(id,vs); });
  offSet([...OFFICIAL]); return undo;
}
function previewSheet(plan){
  const P=plan.people, n=P.reduce((a,p)=>a+p.results.length,0), dup=P.reduce((a,p)=>a+p.skip.dup,0), have=P.reduce((a,p)=>a+p.skip.have,0), bad=P.reduce((a,p)=>a+p.skip.bad,0);
  const S0=new Set((S.series||[]).map(x=>x.id)), newSeries=plan.meets.filter(m=>!S0.has(m.sid)).map(m=>m.sid);
  const meetsNew=new Set(); P.forEach(p=>p.results.forEach(r=>{ if(r.level!=='HS') return; const mm=meetOfRaw(plan,r.meet); if(mm&&!(S.meets||[]).some(x=>x.seriesId===mm.sid&&x.date===r.date)) meetsNew.add(mm.sid+'|'+r.date); }));
  const seriesOpts=sid=>{ const all=[...(S.series||[]).map(x=>[x.id,x.name]),...plan.meets.filter(m=>!S0.has(m.sid)).map(m=>[m.sid,m.sname+' (new)'])].filter((x,i,a)=>a.findIndex(y=>y[0]===x[0])===i).sort((a,b)=>a[1].localeCompare(b[1]));
    return all.map(([id,nm])=>`<option value="${esc(id)}"${id===sid?' selected':''}>${esc(nm)}</option>`).join(''); };
  const word={remembered:'Matched (remembered)',certain:'Matched',check:'Check this match',new:'Not on the roster'};
  const rows=P.filter(p=>p.results.length||p.skip.have).map(p=>{ const k=p.i;
    const pick=p.status==='check'||p.status==='new'?`<select data-pm="${k}" aria-label="Who is ${esc(p.display)}">${p.cands.map(c=>`<option value="${c.a.id}"${c.a.id===p.aid&&p.status==='check'?' selected':''}>${esc(c.a.name)}${c.score===2?' (nickname)':''}${c.gmis?' (marked '+(c.a.gender==='G'?'Girls':'Boys')+')':''}</option>`).join('')}<option value="__new"${p.status==='new'&&p.create?' selected':''}>Add as a new runner</option><option value="__none"${p.status==='new'&&!p.create?' selected':''}>Don’t link (keep results unnamed on cards)</option></select>`:'';
    const a=p.aid&&S.roster.find(x=>x.id===p.aid);
    return `<div class="imp-row" data-st="${p.status}" data-i="${k}"><div><b>${esc(p.display)}</b>${p.school?`<span class="hint"> · ${esc(p.school)}</span>`:''}<span class="hint">${p.results.length} new result${p.results.length===1?'':'s'}${p.skip.dup?` · ${p.skip.dup} duplicate${p.skip.dup===1?'':'s'} skipped`:''}${p.skip.have?` · ${p.skip.have} already imported`:''}${p.projGrade!=null?(p.projGrade>12?' · graduated':` · grade ${p.projGrade} now`):''}</span></div>
      <div class="imp-st"><span class="pill2 ${p.status}">${word[p.status]}</span>${a&&!pick?` → ${esc(a.name)}`:''}${pick}</div></div>`; }).join('');
  const mrows=plan.meets.map((m,i)=>`<div class="imp-meet"><span>${[...m.raw.keys()].map(r=>esc(r)).join(' / ')}<span class="hint">${m.n} result${m.n===1?'':'s'}</span></span><select data-mm="${i}" aria-label="Series for ${esc(m.key)}">${seriesOpts(m.sid)}</select></div>`).join('');
  const checks=P.filter(p=>p.status==='check').length;
  modal(`<div class="imp-prev"><h2>Preview the import</h2>
    <p><b>${P.filter(p=>p.results.length).length}</b> runners · <b>${n}</b> new results${dup?` · ${dup} duplicate${dup===1?'':'s'} skipped (kept the one with a division)`:''}${have?` · ${have} already imported`:''}${bad?` · ${bad} without a time, date or distance`:''}</p>
    <p class="hint">New: ${newSeries.length} meet series, ${meetsNew.size} past meets. ${plan.schools.length?'Schools: '+esc(plan.schools.join(', '))+'.':''} PRs and season bests are worked out from the times (the file’s PR flags are ignored).</p>
    <div class="imp-upd"></div>
    ${checks?`<p class="ts-warn">${checks} possible match${checks===1?'':'es'} to confirm: pick the right runner, or confirm the suggestions. Nothing is saved until you do. <button type="button" class="btn" data-confirmall>Confirm all ${checks} suggested match${checks===1?'':'es'}</button></p>`:''}
    <h3>Runners</h3><div class="imp-list">${rows||'<p class="hint">No runners with results.</p>'}</div>
    <h3>Meets <span class="n">every way a name was printed goes to one series</span></h3><div class="imp-list">${mrows}</div>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes"${n||plan.levelFix.length?'':' disabled'}>${n?`Save ${n} result${n===1?'':'s'}`:`Save ${plan.levelFix.length} level${plan.levelFix.length===1?'':'s'}`}</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    const gate=()=>{ const left=P.filter(p=>p.status==='check'&&!p.confirmed&&(p.results.length||(p.existing||[]).length)).length, go=m.querySelector('[data-x=yes]'), U=planUpdates(plan);
      m.querySelector('.imp-upd').innerHTML=(U.n?`<p class="imp-updates"><b>Updates</b> for results already imported: ${[U.levels.length?`${U.levels.length} Varsity/JV level${U.levels.length===1?'':'s'}`:'',U.links.length?`${U.links.length} runner link${U.links.length===1?'':'s'}`:'',U.names.length?`${U.names.length} full name${U.names.length===1?'':'s'}`:''].filter(Boolean).join(' · ')}</p>${U.names.length?`<details class="imp-names"><summary>Full names</summary>${U.names.map(x=>`<div class="set-row"><span>${esc(x.from)} → <b>${esc(x.to)}</b></span></div>`).join('')}</details>`:''}`:'')
        +(n||U.n?'':`<p class="ts-warn">Nothing new and nothing to update: everything in this file is already imported.</p>`);
      go.disabled=left>0||!(n||U.n); if(left) go.textContent=`Confirm ${left} match${left===1?'':'es'} first`; else go.textContent=[n?`Save ${n} result${n===1?'':'s'}`:'',U.n?`${n?'and ':'Apply '}${U.n} update${U.n===1?'':'s'}`:''].filter(Boolean).join(' ')||'Save';
      m.querySelectorAll('.imp-row').forEach(r=>{ const p=P.find(x=>x.i===+r.dataset.i); if(p) r.classList.toggle('confirmed',!!p.confirmed&&p.status==='check'); }); };
    m.querySelectorAll('[data-pm]').forEach(s=>s.onchange=()=>{ const p=P.find(x=>x.i===+s.dataset.pm); p.confirmed=true;
      if(s.value==='__new'){ p.aid=null; p.create=true; } else if(s.value==='__none'){ p.aid=null; p.create=false; } else { p.aid=s.value; p.create=false; } gate(); });
    const ca=m.querySelector('[data-confirmall]'); if(ca) ca.onclick=()=>{ P.forEach(p=>{ if(p.status==='check'&&!p.confirmed){ const s=m.querySelector(`[data-pm="${p.i}"]`); p.confirmed=true; if(s&&!s.value.startsWith('__')){ p.aid=s.value; p.create=false; } } }); gate(); };
    gate();
    m.querySelectorAll('[data-mm]').forEach(s=>s.onchange=()=>{ const mm=plan.meets[+s.dataset.mm], ex=(S.series||[]).find(x=>x.id===s.value)||plan.meets.find(x=>x.sid===s.value); mm.sid=s.value; mm.sname=ex.name||ex.sname; });
    m.querySelector('[data-x=yes]').onclick=async()=>{ const go=m.querySelector('[data-x=yes]'); go.disabled=true; go.textContent='Saving…';
      P.forEach(p=>{ if(p.status==='check'&&!p.confirmed){ const s=m.querySelector(`[data-pm="${p.i}"]`); if(s&&s.value&&!s.value.startsWith('__')) p.aid=s.value; } });
      try{ const U=planUpdates(plan);
        if(U.n){ if(!n) await takeSnapshot('Before updating imported results');
          const lv=U.levels.length?setLevels(U.levels,true):[], lk=U.links.length?setLinks(U.links,true):[];
          U.names.forEach(x=>{ const a=S.roster.find(y=>y.id===x.id); if(a) a.name=x.to; }); if(U.names.length){ save(); refreshIdle(); }
          plan.undoUpdates=()=>{ if(lv.length) setLevels(lv,true); if(lk.length) setLinks(lk,true); U.names.forEach(x=>{ const a=S.roster.find(y=>y.id===x.id); if(a&&a.name===x.to) a.name=x.from; }); save(); refreshIdle(); }; }
        if(!n){ close(); refreshAll(); snack(`Applied ${U.n} update${U.n===1?'':'s'}`,'Undo',()=>{ plan.undoUpdates(); refreshAll(); toast('Updates undone'); },10000); return; }
        const r=await saveImport(plan); r.undoUpdates=plan.undoUpdates; r.updates=U.n; close(); afterImport(r); }catch(err){ go.disabled=false; go.textContent='Save'; toast((err&&err.message)||'Could not save.'); } };
  });
}
// Saves an import as one record (in parts), creating the runners, series, courses and meets it needs.
async function saveImport(plan){
  await takeSnapshot('Before importing history');
  const importId='imp'+Date.now().toString(36)+uid(), created={athletes:[],series:[],courses:[],meets:[]}, taken=new Set(S.roster.map(a=>a.name.trim().toLowerCase()));
  const matches={};
  plan.people.forEach(p=>{ if(!p.results.length&&!p.aid) return;
    if(!p.aid&&p.create){ const a={id:uid(),name:storeName(p.display,taken),group:'',gender:p.gender||''}; taken.add(a.name.toLowerCase()); S.roster.push(a); created.athletes.push(a); p.aid=a.id; p.newName=a.name; }
    if(p.aid) matches[p.hash]=p.aid; });
  const ensureSeries=(sid,name)=>{ if((S.series||[]).some(x=>x.id===sid)) return; const s={id:sid,name:String(name||'Meet').slice(0,40)}; S.series.push(s); created.series.push(s); };
  const courseFor=(sid,raw)=>{ if(PLACE_SERIES.includes(sid)&&placeOf(raw)) return courseByPlace(placeOf(raw),created.courses); // 2.9.1
    const m=(S.meets||[]).filter(x=>x.seriesId===sid&&x.courseId).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]; if(m) return m.courseId;
    const name=KNOWN_COURSE[sid]||seriesName(sid), id='c-'+slug(name); const had=(S.courses||[]).find(c=>c.id===id||c.name.toLowerCase()===name.toLowerCase()); if(had) return had.id;
    const cid=newCourse(name,id); created.courses.push(S.courses.find(c=>c.id===cid)); return cid; };
  const results=[];
  plan.people.forEach(p=>p.results.forEach(r=>{ const mm=meetOfRaw(plan,r.meet); let sid=mm?mm.sid:null, meetId=null, courseId=null;
    if(sid){ ensureSeries(sid,mm.sname);
      if(r.level==='HS'){ courseId=courseFor(sid,r.meet); let mt=(S.meets||[]).find(x=>x.seriesId===sid&&x.date===r.date);
        if(!mt){ mt={id:'mh-'+r.date+'-'+sid.replace(/^s-/,'').slice(0,40),seriesId:sid,courseId,date:r.date,time:'',kind:KIND_OF[sid]||'Invite',levels:[],season:seasonOf(dayMs(r.date))}; S.meets.push(mt); created.meets.push(mt); }
        const lv=r.division.endsWith('JV')?'JV':r.division.endsWith('V')?'V':''; if(lv&&!mt.levels.includes(lv)&&created.meets.includes(mt)) mt.levels.push(lv);
        meetId=mt.id; courseId=mt.courseId||courseId; } }
    results.push({k:r.k,aid:p.aid||null,name:p.aid?(S.roster.find(a=>a.id===p.aid)||{}).name||storeName(p.display,new Set()):storeName(p.display,new Set()),g:r.g||'',
      season:seasonOf(dayMs(r.date)),grade:r.grade,level:r.level,dist:r.dist,date:r.date,t:r.t,place:r.place,meet:r.meet,seriesId:sid,meetId,courseId,division:r.division,...(r.lv?{lv:r.lv}:{})}); }));
  created.meets.forEach(m=>{ if(!m.levels.length) m.levels=['V']; m.levels.sort((a,b)=>b.localeCompare(a)); });
  if(!results.length) throw new Error('Nothing new to import.');
  const parts=[], now=Date.now(), base={importId,importedAt:now,by:myId(),byName:S.settings.coachName||'',format:plan.file.format,source:plan.file.source,generated:plan.file.generated};
  for(let i=0;i<results.length;i+=OFF_PART) parts.push({...base,id:importId+(i?'-'+i/OFF_PART:''),part:i/OFF_PART,parts:Math.ceil(results.length/OFF_PART),results:results.slice(i,i+OFF_PART),matches:i?{}:matches,synced:false});
  for(const d of parts){ d.key=d.id; await storePut('official',d); }
  offSet([...OFFICIAL,...parts]); save();
  if(SYNC&&syncMode()==='joined') parts.forEach(d=>SYNC.saveOfficial(d));
  return {importId,n:results.length,created,parts:parts.length};
}
function afterImport(r){
  trashImportInfo[r.importId]=r.created;
  try{ localStorage.setItem('mustang-splits:imp-created:'+r.importId,JSON.stringify({athletes:r.created.athletes.map(a=>a.id),series:r.created.series.map(x=>x.id),courses:r.created.courses.map(x=>x.id),meets:r.created.meets.map(x=>x.id)})); }catch(e){}
  refreshAll(); memo.clear(); setTimeout(updateHealthBadge,0); const c=r.created;
  snack(`Imported ${r.n} official results${c.athletes.length?`, ${c.athletes.length} new runner${c.athletes.length===1?'':'s'}`:''}${r.updates?`, ${r.updates} update${r.updates===1?'':'s'}`:''}`,'Undo',()=>{ undoImport(r.importId,true); if(r.undoUpdates) r.undoUpdates(); refreshAll(); },10000);
}
const trashImportInfo={};
// Undo / Remove: the whole import, as one action (soft delete; Recently deleted restores it all).
async function undoImport(importId,quiet){
  const docs=OFFICIAL.filter(d=>d.importId===importId&&!d.deleted); if(!docs.length) return;
  let ids={}; try{ ids=JSON.parse(localStorage.getItem('mustang-splits:imp-created:'+importId)||'{}'); }catch(e){}
  const pick=(list,want)=>(list||[]).filter(x=>(want||[]).includes(x.id));
  const created={athletes:pick(S.roster,ids.athletes),series:pick(S.series,ids.series),courses:pick(S.courses,ids.courses),meets:pick(S.meets,ids.meets)};
  const inUse=a=>S.watches.some(w=>w.athleteIds.includes(a.id))||(S.race&&S.race.runners.some(x=>x.id===a.id));
  created.athletes=created.athletes.filter(a=>!inUse(a)); // a runner already on a stopwatch or in a race stays
  S.roster=S.roster.filter(a=>!created.athletes.includes(a)); S.series=S.series.filter(x=>!created.series.includes(x)); S.courses=S.courses.filter(x=>!created.courses.includes(x)); S.meets=S.meets.filter(x=>!created.meets.includes(x));
  const at=Date.now(); for(const d of docs){ d.deleted=true; d.deletedAt=at; await storePut('official',d); }
  offSet([...OFFICIAL]);
  const n=docs.reduce((a,d)=>a+d.results.length,0);
  const key=trashPut({kind:'import',id:importId,label:`${n} official results (${docs[0].source||'history file'})`,item:null,extra:{created}});
  if(SYNC&&syncMode()==='joined') SYNC.officialFlag(docs.map(d=>d.id),true);
  save(); refreshAll();
  if(quiet) toast('Import undone. Recently deleted can restore it.'); else removedSnack(`Removed ${n} official results`,key);
}
function restoreImport(e){
  const docs=OFFICIAL.filter(d=>d.importId===e.id); if(!docs.length){ toast('That import isn’t on this phone.'); return false; }
  docs.forEach(d=>{ d.deleted=false; delete d.deletedAt; storePut('official',d); }); offSet([...OFFICIAL]);
  const c=(e.extra||{}).created||{};
  (c.athletes||[]).forEach(a=>{ if(!S.roster.some(x=>x.id===a.id)) S.roster.push(a); }); (c.series||[]).forEach(a=>{ if(!S.series.some(x=>x.id===a.id)) S.series.push(a); });
  (c.courses||[]).forEach(a=>{ if(!S.courses.some(x=>x.id===a.id)) S.courses.push(a); }); (c.meets||[]).forEach(a=>{ if(!S.meets.some(x=>x.id===a.id)) S.meets.push(a); });
  if(SYNC&&syncMode()==='joined') SYNC.officialFlag(docs.map(d=>d.id),false);
  return true;
}
// Varsity / JV for an official result (2.9.1): a level set by the admin (append-only edits on the import record,
// newest wins), else the division in the file, else the schedule (a meet held for one level only, or this season's
// meet in that series if it has one level: Sectional, State and Nightfall are Varsity, Brillion JV).
function levelEdits(){ const L={}; OFFICIAL.forEach(d=>{ if(d.deleted) return; (d.edits||[]).forEach(v=>{ if(v.op==='level'&&(!L[v.k]||(L[v.k].at||0)<=(v.at||0))) L[v.k]=v; }); }); return L; }
function levelGuess(r){
  if(r.level==='MS') return '';
  const m=meetOf(r.meetId); if(m&&(m.levels||[]).length===1&&!m.id.startsWith('mh-')) return m.levels[0];
  if(PLACE_SERIES.includes(r.seriesId)) return 'V'; // WIAA Sectional and State are varsity-only
  return ''; // 2.11.1: other past meets aren't guessed from this season's schedule: unlabeled results go to Data health
}
// The level of each runner's hand-timed race that day (2.11.1): if a coach timed the runner in Boys JV, their official
// result that day is JV too (when the file has no label).
function handLevels(){ return memoize('handLv',()=>{ const L={}; allRaces0(false,true).forEach(x=>{ /* hand-timed only (official would loop) */ const lv=/JV$/.test(x.M.division||'')?'JV':/V$/.test(x.M.division||'')?'V':''; if(!lv) return; x.M.rows.forEach(r=>{ L[r.id+'|'+x.date]=lv; }); }); return L; }); }
function offLevel(r,E){ const e=(E||levelEdits())[r.k]; if(e&&e.level) return {lv:e.level,src:'set'}; // a cleared level (Undo) falls back
  // A label printed for the other gender isn't trusted (2.11.1): Ben's 2026 results were labeled "Girls Varsity" in the
  // file, so their level split him from the other boys (his own one-runner "Boys Varsity" race at each meet).
  const lg=/^[GB]/.test(r.division||'')?r.division[0]:(r.g==='G'||r.g==='B'?r.g:''), rg=offGender(r), bad=!!(lg&&rg&&lg!==rg);
  const d=bad?'':r.division||''; if(!bad&&(/JV$/.test(d)||r.lv==='JV')) return {lv:'JV',src:'file'}; if(!bad&&(/V$/.test(d)||r.lv==='V')) return {lv:'V',src:'file'}; // r.lv: a level printed without Girls/Boys (2.9.2)
  const hl=r.aid&&handLevels()[mergedTo(r.aid)+'|'+r.date]; if(hl) return {lv:hl,src:'hand-timed race'};
  const g=levelGuess(r); return g?{lv:g,src:'schedule'}:{lv:'',src:''}; }
// Girls/Boys (2.9.2): a linked runner's own setting on the Team tab, never a guess. A result whose runner has none is
// Unassigned (and says so). Results not linked to a runner keep the label printed in the file.
function offGender(r){ const id=r.aid&&mergedTo(r.aid), a=id&&S.roster.find(x=>x.id===id); if(a) return a.gender==='G'||a.gender==='B'?a.gender:''; return r.aid?'':(r.g==='G'||r.g==='B'?r.g:''); }
const offDivOf=(r,E)=>{ const g=offGender(r); if(r.level==='MS') return g?g+'MS':''; const l=offLevel(r,E).lv; return g&&l?g+l:''; };
// Sets Varsity/JV on official results: [{k, level:'V'|'JV'|''}] -> append-only edits on the records holding them.
function setLevels(list,quiet){
  const by={}, at=Date.now(), E=levelEdits(), undo=[];
  list.forEach(f=>{ const d=OFFICIAL.find(x=>!x.deleted&&(x.results||[]).some(r=>r.k===f.k)); if(!d) return; const r=d.results.find(x=>x.k===f.k);
    undo.push({k:f.k,level:E[f.k]?E[f.k].level||'':''}); (by[d.id]||(by[d.id]=[])).push({op:'level',k:f.k,level:f.level,uid:myId(),dev:DEVICE,byName:S.settings.coachName||'',at}); void r; });
  Object.entries(by).forEach(([id,vs])=>{ const d=OFFICIAL.find(x=>x.id===id); d.edits=[...(d.edits||[]),...vs]; storePut('official',d); if(SYNC&&syncMode()==='joined') SYNC.officialEdits(id,vs); });
  offSet([...OFFICIAL]);
  if(!quiet&&undo.length) snack(`Set ${list.length} level${list.length===1?'':'s'}`,'Undo',()=>{ setLevels(undo,true); refreshAll(); if(document.querySelector('#modal .lvl-sheet')) levelSheet(lvlOpts); },8000);
  return undo;
}
// "Varsity / JV" sheet (admin / no team): every high school official result with its level; tap V or JV, or set a whole race.
let lvlOpts={};
function levelSheet(o){
  lvlOpts=o||{}; const E=levelEdits(), all=[]; OFFICIAL.forEach(d=>{ if(!d.deleted) (d.results||[]).forEach(r=>{ if(r.level!=='MS'&&!all.some(x=>x.k===r.k)) all.push(r); }); });
  let L=all; if(lvlOpts.keys) L=L.filter(r=>lvlOpts.keys.includes(r.k)); else if(lvlOpts.missing!==false) L=L.filter(r=>!offLevel(r,E).lv);
  if(lvlOpts.season!=null) L=L.filter(r=>seasonOf(dayMs(r.date))===lvlOpts.season);
  const groups=new Map(); L.sort((a,b)=>b.date.localeCompare(a.date)||a.t-b.t).forEach(r=>{ const k=r.date+'|'+(r.seriesId||r.meet)+'|'+(r.g||''); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(r); });
  const pend={}, cur=r=>pend[r.k]!==undefined?pend[r.k]:offLevel(r,E).lv, src={set:'set by a coach',file:'from the file',schedule:'from the schedule','':'no level'};
  const draw=()=>{ const m=document.querySelector('#modal .lvl-sheet'); if(!m) return;
    m.querySelector('.lvl-body').innerHTML=groups.size?[...groups.values()].map(G=>{ const r0=G[0];
      return `<section class="lvl-grp"><h3>${esc(r0.seriesId?seriesName(r0.seriesId):r0.meet)} <span class="n">${esc(fmtDay(r0.date))} · ${r0.g==='G'?'Girls':r0.g==='B'?'Boys':''}</span></h3>
        <div class="btn-row"><button class="btn" data-lvall="V" data-grp="${esc(r0.date+'|'+(r0.seriesId||r0.meet)+'|'+(r0.g||''))}">All Varsity</button><button class="btn" data-lvall="JV" data-grp="${esc(r0.date+'|'+(r0.seriesId||r0.meet)+'|'+(r0.g||''))}">All JV</button></div>
        ${G.map(r=>`<div class="lvl-row"><span><b>${esc(r.name)}</b> ${fmtRace(r.t)}<span class="hint">${esc(pend[r.k]!==undefined?'changed':src[offLevel(r,E).src])}</span></span><span class="seg2 lvl-seg" role="group" aria-label="Level for ${esc(r.name)}"><button type="button" data-lv="V" data-k="${esc(r.k)}" aria-pressed="${cur(r)==='V'}">Varsity</button><button type="button" data-lv="JV" data-k="${esc(r.k)}" aria-pressed="${cur(r)==='JV'}">JV</button></span></div>`).join('')}</section>`; }).join('')
      :'<p>Every official result has a Varsity or JV level.</p>';
    const c=Object.keys(pend).length, go=m.querySelector('[data-x=yes]'); go.disabled=!c; go.textContent=c?`Save ${c} change${c===1?'':'s'}`:'No changes yet'; };
  modal(`<div class="lvl-sheet"><h2>Varsity / JV</h2><p class="hint">${lvlOpts.keys?'Every result in this race.':'Official results without a Varsity or JV level, so they can count in the Team view.'} Your choice is saved as a change for every coach and can be undone.</p>
    ${lvlOpts.keys?'':`<label class="set-row"><span>Show every result, not just the ones without a level</span><input type="checkbox" class="switch" data-lvshowall${lvlOpts.missing===false?' checked':''}></label>`}
    <div class="lvl-body"></div><div class="modal-btns"><button class="btn" data-x="no">Close</button><button class="btn primary" data-x="yes" disabled>Save</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    const sw=m.querySelector('[data-lvshowall]'); if(sw) sw.onchange=()=>levelSheet({...lvlOpts,missing:!sw.checked});
    m.addEventListener('click',e=>{ const b=e.target.closest('[data-lv]'); if(b){ const r=L.find(x=>x.k===b.dataset.k); if(offLevel(r,E).lv===b.dataset.lv) delete pend[r.k]; else pend[r.k]=b.dataset.lv; draw(); return; }
      const a=e.target.closest('[data-lvall]'); if(a){ (groups.get(a.dataset.grp)||[]).forEach(r=>{ if(offLevel(r,E).lv===a.dataset.lvall) delete pend[r.k]; else pend[r.k]=a.dataset.lvall; }); draw(); } });
    m.querySelector('[data-x=yes]').onclick=()=>{ const ch=Object.entries(pend).map(([k,level])=>({k,level})); if(!ch.length) return; setLevels(ch); close(); refreshAll(); };
    draw();
  });
}
// Official results as read-only race models (one per meet day, division and distance), memoized per data change.
let offCache={gen:-1,list:[]};
function offEntries(){
  const hsig=teamHistory.length+'/'+teamRaces.length+'/'+raceLog().length+'/'+[...teamHistory,...teamRaces,...raceLog()].reduce((a,h)=>a+((h.edits||[]).length),0); // hand-timed races feed levels (2.11.1)
  const ck=offGen+'|'+hsig+'|'+mergeSig()+'|'+S.roster.map(a=>a.id+(a.gender||'')).join('')+'|'+(S.meets||[]).map(m=>m.id+':'+(m.levels||[]).join('/')+':'+m.courseId).join(',')+'|'+(S.series||[]).map(x=>x.name).join(','); // schedule changes affect levels and courses
  if(offCache.gen===ck) return offCache.list;
  const seen=new Set(), groups=new Map(), E=levelEdits(), LE=linkEdits();
  OFFICIAL.forEach(d=>{ if(d.deleted) return; (d.results||[]).forEach(r00=>{ if(seen.has(r00.k)) return; seen.add(r00.k); const r0=LE[r00.k]?{...r00,aid:LE[r00.k].aid}:r00; /* re-import links (2.11.1) */ const r={...r0,aid:r0.aid&&mergedTo(r0.aid),division:offDivOf(r0,E),g:offGender(r0)};
    const gk=[r.date,r.seriesId||r.meet,r.division||r.g||'U',r.dist,r.level].join('|'); if(!groups.has(gk)) groups.set(gk,[]); groups.get(gk).push(r); }); });
  const list=[...groups.entries()].map(([gk,rs])=>{ const r0=rs[0], id='off:'+gk.replace(/[^\w.-]/g,'_');
    const rows=rs.sort((a,b)=>a.t-b.t).map(r=>({id:r.aid||'x:'+r.k.split('|')[0],name:(r.aid&&(S.roster.find(a=>a.id===r.aid)||{}).name)||r.name,group:'',goal:null,goalTag:null,pr:null,sb:null,grade:r.grade,place:r.place,cells:[]}));
    const nm=(r0.seriesId?seriesName(r0.seriesId):r0.meet||'Meet');
    return {id,date:r0.date,savedAtMs:dayMs(r0.date),official:true,level:r0.level,
      race:{name:nm+', '+(r0.division&&divName(r0.division)?divName(r0.division):(r0.g==='G'?'Girls':r0.g==='B'?'Boys':'Unassigned')+(r0.level==='MS'?' MS':'')),unassigned:!r0.g,raceId:id,official:true,level:r0.level,printed:r0.meet,
        courseId:(meetOf(r0.meetId)||{}).courseId||r0.courseId||null,courseName:courseNameOf((meetOf(r0.meetId)||{}).courseId||r0.courseId)||'',goalSrc:'none',meetId:r0.meetId||null,seriesId:r0.seriesId||null,division:r0.division||'',
        checkpoints:[{id:'fin',name:'Finish',dist:r0.dist,unit:r0.dist%1000===0?'m':'mi'}],rows,
        marks:rows.map((x,i)=>({id:'o'+i,ci:0,rid:x.id,t:rs[i].t,dev:'',byName:'Official',at:null})),keys:rs.map(x=>x.k),g:r0.g||''}};
  });
  offCache={gen:ck,list}; return list;
}
const offHS=()=>offEntries().filter(h=>h.level!=='MS');

/* ---------- weather (3.2) ---------- */
// Race weather from Open-Meteo (open-meteo.com: free for non-commercial use, no API key, CORS). The data is CC BY 4.0,
// so everything that shows weather also shows "Weather data by Open-Meteo.com" (WX_ATTR). This is a public weather
// API, not a results site: the no-fetching rule (CLAUDE.md rule 12) doesn't apply to it.
// Nothing here is on the timing path: the gun, taps and saves never wait for it. A failed fetch only leaves a record
// waiting; it's tried again later (backoff), and nothing is lost.
// - S.places = [{id, name, lat, lon, label, src, confirmed, confirmedBy}]: one per course (id = the course id) or per
//   meet name without a course ('n-…', middle school). Synced (kind places). Weather only uses confirmed places;
//   a place confirmed with no coordinates means "skip, no weather".
// - S.weather = [{id, date, place, lat, lon, start, end, src, status, wx, at, tries, next, raceId, dismissed}]: one per
//   race day and place (id = date_place; a race whose phone captured its location at the gun: date_g-<raceId>).
//   status 'pending' | 'ok'. wx = {t, at, dp, rh, ws, wg, pr, pr48, cc} in °F, %, mph, inches (averages over the
//   race; gusts = the highest; pr = rain during the race, pr48 = the 48 hours before). Synced (kind weather). Past
//   weather never changes, so a filled record is kept for good and works offline.
const WX_ATTR=`<p class="wx-attr">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo.com</a></p>`;
const WX_DEF={warm:130,hot:150,cold:35,wind:15,mud:0.5};
const wxT=()=>({...WX_DEF,...((S.settings&&S.settings.wx)||{})});
const WX_VARS='temperature_2m,apparent_temperature,dew_point_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,precipitation,cloud_cover';
const WX_FLAGS={hot:['🔥','Hot'],warm:['☀️','Warm'],cold:['❄️','Cold'],windy:['💨','Windy'],mud:['💧','Likely muddy']};
const WX_ORDER=['hot','warm','cold','windy','mud'];
const WX_RULE=k=>{ const T=wxT(); return {hot:`temperature + dew point ≥ ${T.hot}`,warm:`temperature + dew point ≥ ${T.warm}`,cold:`${T.cold}°F or colder`,windy:`wind ${T.wind} mph or more`,mud:`${T.mud}″+ of rain in the 48 hours before, or rain during the race`}[k]; };
// Flags from the numbers (thresholds in Settings). Context only: they never take a result out of anything.
function wxFlagsOf(w,T){ if(!w) return []; T=T||wxT(); const f=[], td=w.t+w.dp;
  if(td>=T.hot) f.push('hot'); else if(td>=T.warm) f.push('warm');
  if(w.t<=T.cold) f.push('cold');
  if(w.ws>=T.wind) f.push('windy');
  if(w.pr48>=T.mud||w.pr>=0.01) f.push('mud');
  return f; }
const wxFlags=rec=>rec&&rec.status==='ok'?wxFlagsOf(rec.wx).filter(k=>!(rec.dismissed||[]).includes(k)):[];
const flagChip=(k,rec)=>`<span class="wx-flag wx-${k}"${rec?` role="button" tabindex="0" data-wxflag="${esc(rec.id)}:${k}"`:''} title="${esc(WX_FLAGS[k][1]+': '+WX_RULE(k))}"><span aria-hidden="true">${WX_FLAGS[k][0]}</span> ${WX_FLAGS[k][1]}</span>`;
const flagsHTML=(rec,tap)=>wxFlags(rec).map(k=>flagChip(k,tap?rec:null)).join(' ');
const f0=v=>Math.round(v);
// "54°F (feels like 51°) · dew point 45° · humidity 71% · wind 9 mph, gusts 21 · no rain (0.12″ in the 48 hours before) · 80% cloud"
function wxText(w){ if(!w) return ''; const rain=w.pr>=0.01?`${w.pr.toFixed(2)}″ of rain during the race`:'no rain during the race';
  return `${f0(w.t)}°F (feels like ${f0(w.at)}°) · dew point ${f0(w.dp)}° · humidity ${f0(w.rh)}% · wind ${f0(w.ws)} mph, gusts ${f0(w.wg)} · ${rain} (${w.pr48.toFixed(2)}″ in the 48 hours before) · ${f0(w.cc)}% cloud`; }
const wxShort=w=>w?`${f0(w.t)}°F, feels ${f0(w.at)}° · dew ${f0(w.dp)}° · wind ${f0(w.ws)} mph`:'';
// One weather block: the numbers, the flags (tap one to dismiss it), and the attribution.
function wxBlock(rec,opt){ opt=opt||{};
  if(!rec) return opt.quiet?'':`<p class="wx-line wx-none">Weather: ${esc(opt.why||'no location for this race yet')}</p>`;
  if(rec.status!=='ok') return `<p class="wx-line wx-wait">Weather: waiting${rec.lat==null?' for a location':navigator.onLine===false?' for a signal':''}…</p>`;
  const dis=(rec.dismissed||[]).filter(k=>wxFlagsOf(rec.wx).includes(k));
  return `<div class="wx-block"><p class="wx-line"><span class="wx-k">Weather</span> ${esc(wxText(rec.wx))}</p>${wxFlags(rec).length||dis.length?`<p class="wx-flags">${flagsHTML(rec,true)}${dis.length?` <button type="button" class="linkish" data-wxundis="${esc(rec.id)}">${dis.length} dismissed · show</button>`:''}</p>`:''}${WX_ATTR}</div>`; }

// 3.4: the compact weather tag ("☀️ 78° · dew 62 · Warm"); tapping it opens wxSheet() with everything.
const wxIcon=(w,f)=>f.length?WX_FLAGS[f[0]][0]:w.pr>=0.01?'🌧':w.cc<30?'☀️':w.cc<70?'⛅':'☁️';
function wxTag(rec){ if(!rec||rec.status!=='ok') return ''; const w=rec.wx, f=wxFlags(rec), words=f.map(k=>WX_FLAGS[k][1]);
  const txt=`${f0(w.t)}°${words.length?' · '+words[0]+(words.length>1?` +${words.length-1}`:''):` · dew ${f0(w.dp)}`}`; // 3.4: short enough for the meet row
  return `<button type="button" class="wx-tag${f.length?' wx-tag-f':''}" data-wxd="${esc(rec.id)}" aria-label="Weather: ${esc(wxText(w))}${words.length?'. '+esc(words.join(', ')):''}"><span aria-hidden="true">${wxIcon(w,f)}</span> ${esc(txt)}</button>`; }
function wxSheet(id){ const rec=wxRec(id); if(!rec) return;
  modal(`<div class="sheet-head"><h2>Weather</h2><button class="btn plain" data-x="done">Done</button></div><p class="hint">${esc(fmtDay(rec.date))}${rec.src==='phone'?' · this race’s phone location':''}</p>${wxBlock(rec)}`,(m,close)=>{ m.querySelector('[data-x=done]').onclick=close; }); }
document.addEventListener('click',e=>{ const t=e.target.closest('[data-wxd]'); if(!t) return; e.preventDefault(); e.stopPropagation(); wxSheet(t.dataset.wxd); },true);
/* places */
const placeById=id=>(S.places||[]).find(p=>p.id===id&&!p.deleted);
const okPlace=id=>{ const p=placeById(id); return p&&p.confirmed&&p.lat!=null&&isFinite(p.lat)&&isFinite(p.lon)?p:null; };
// Town hints for courses whose name isn't a town (2026 schedule).
const PLACE_HINT=[[/winagamie/,'Neenah'],[/\buwgb\b/,'Green Bay'],[/^albany\b/,'Albany'],[/wausau east|smiley/,'Wausau'],[/brillion|deer run/,'Brillion']]; // by course name
const placeHint=nm=>{ const k=normName(nm||''); const h=PLACE_HINT.find(([re])=>re.test(k)); return h?h[1]:null; };
const WX_FILL=/\b(middle|school|ms|high|hs|cc|cross|country|coun|count|countr|invitational|invite|invit|inv|meet|mee|me|m|c|conference|conf|team|memorial|classic|annual|championship|championships|the|of|season|beginning|end|time|trial|varsity|jv|boys|girls|wisconsin|wiaa|course|gc|golf|park|xc|year|\d+)\b/g;
const townWords=nm=>meetKey(nm).replace(WX_FILL,' ').replace(/\s+/g,' ').trim();
// The place a saved race ran at: its meet's course, its own course, else (middle school: no course) its meet name,
// through the same series names the importer knows ("Mishicot Bremser Invite" = Mishicot), else the town in it.
function racePlaceId(x){ const M=x.M, mt=meetOf(M.meetId), c=(mt&&mt.courseId)||M.courseId; if(c) return c;
  const nm=M.printed||M.name||''; if(!nm) return null; const sc=(M.seriesId&&seriesCourse(M.seriesId))||((s2=>s2&&seriesCourse(s2))(seriesOfName(nm))); if(sc) return sc;
  const tw=townWords(nm); if(tw) return 'n-'+slug(tw); const w=meetKey(nm).split(' '); if(w.length>1&&w[w.length-1].length<=2) w.pop(); return /time trial/.test(meetKey(nm))?'n-time-trial':'n-'+slug(w.slice(0,4).join(' ')); } // cut-off names stay one place
function seriesOfName(nm){ try{ const k=meetKey(nm).replace(/\b(middle school|ms)\b/g,' ').replace(/\s+/g,' ').trim(); const r=k&&knownSeries(k,true); return r&&!PLACE_SERIES.includes(r.id)?r.id:null; }catch(e){ return null; } }
function seriesCourse(sid){ const kc=KNOWN_COURSE[sid]; if(kc){ const c=(S.courses||[]).find(x=>x.name===kc); return c?c.id:'c-'+slug(kc); }
  const m=(S.meets||[]).filter(x=>x.seriesId===sid&&x.courseId&&!x.deleted).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0]; return m?m.courseId:null; }
const placeName=id=>{ if(!id) return ''; const c=(S.courses||[]).find(x=>x.id===id); if(c) return c.name; const p=placeById(id); return p&&p.name||id.replace(/^n-/,'').replace(/-/g,' '); };
// Every place a race in this app ran at (and every scheduled meet's course), with the meet names that use it.
function placesNeeded(){ const m=new Map(), add=(id,nm,used)=>{ if(!id) return; const e=m.get(id)||{id,name:nm||placeName(id),used:new Set()}; if(used) e.used.add(used); m.set(id,e); };
  (S.meets||[]).filter(x=>!x.deleted&&x.courseId).forEach(x=>add(x.courseId,placeName(x.courseId),seriesName(x.seriesId)));
  allRaces(true).forEach(x=>{ const id=racePlaceId(x); if(!id) return; const mt=meetOf(x.M.meetId); add(id,id==='n-time-trial'?'Time trials':id.startsWith('n-')?(townWords(x.M.printed||x.M.name||'')?titleCase(townWords(x.M.printed||x.M.name)):(x.M.printed||x.M.name)):placeName(id),mt?seriesName(mt.seriesId):(x.M.printed||x.M.name)); });
  return [...m.values()]; }
const titleCase=s=>String(s||'').replace(/\b[a-z]/g,c=>c.toUpperCase());
const placesToConfirm=()=>placesNeeded().filter(e=>{ const p=placeById(e.id); return !p||!p.confirmed; });

/* network */
async function wxGet(url,ms){ const ac=typeof AbortController!=='undefined'?new AbortController():null, t=setTimeout(()=>ac&&ac.abort(),ms||20000);
  try{ const r=await fetch(url,{signal:ac&&ac.signal,cache:'no-store'}); if(!r.ok){ let why=''; try{ why=(await r.json()).reason||''; }catch(e){} throw new Error('Weather service: '+(why||r.status)); } return await r.json(); } finally{ clearTimeout(t); } }
// A town in Wisconsin (exact name), from Open-Meteo's geocoding. typed: any US match is fine when the coach types it.
async function geocode(q,typed){ q=String(q||'').trim(); if(q.length<2) return null;
  const j=await wxGet(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=50&language=en&format=json&countryCode=US`);
  const L=(j.results||[]), same=r=>normName(r.name)===normName(q), wi=L.filter(r=>r.admin1==='Wisconsin'), r=wi.find(same)||(typed&&(wi[0]||L.find(same)||L[0]));
  return r?{lat:Math.round(r.latitude*1e4)/1e4,lon:Math.round(r.longitude*1e4)/1e4,label:`${r.name}, ${r.admin1||r.country_code||''}`}:null; }
// A suggestion for a place: the hint, then the name's parts ("Smiley / Wausau East" → "Wausau East", "Wausau").
async function suggestPlace(e){ const c=(S.courses||[]).find(x=>x.id===e.id), base=e.id.startsWith('n-')?townWords(e.name):String((c&&c.name)||e.name||'');
  const tries=[], hint=placeHint(c?c.name:e.name); if(hint) tries.push(hint);
  base.split(/\s*[\/,–—-]\s*|\s+@\s+/).map(s=>s.replace(/\b(hs|high school|gc|golf course|invite|invitational|course|park|cc)\b/gi,'').trim()).filter(Boolean).forEach(p=>{ const w=p.split(/\s+/); for(let n=w.length;n>=(e.id.startsWith('n-')?w.length:1);n--) tries.push(w.slice(0,n).join(' ')); }); // a meet name (no course) is tried whole: "Valley Bay" is a conference, not Valley
  for(const q of [...new Set(tries)].slice(0,6)){ const g=await geocode(q); if(g) return {...g,q}; } return null; }
const wxMeta=()=>{ try{ return JSON.parse(localStorage.getItem('mustang-splits:wxsug')||'{}'); }catch(e){ return {}; } }; // suggestions (this phone)
const wxMetaSet=o=>{ try{ localStorage.setItem('mustang-splits:wxsug',JSON.stringify(o)); }catch(e){} };

/* race days */
// When a race day started: the gun of a hand-timed race (from its taps), else the meet's time, else a typical start
// (weekdays 4:30 PM, weekends 9:00 AM). It ended at its slowest finish (+30 min when more races ran that day).
function parseClock(s){ const m=String(s||'').match(/(\d{1,2})(?::(\d\d))?\s*([ap])?/i); if(!m) return null; let h=+m[1]; const mi=+(m[2]||0), ap=(m[3]||'').toLowerCase();
  if(ap==='p'&&h<12) h+=12; if(ap==='a'&&h===12) h=0; if(!ap&&h<7) h+=12; return h<24&&mi<60?[h,mi]:null; }
function dayStart(date,time){ const [y,mo,d]=date.split('-').map(Number), c=parseClock(time), wd=new Date(y,mo-1,d).getDay(), hm=c||((wd===0||wd===6)?[9,0]:[16,30]); return {at:new Date(y,mo-1,d,hm[0],hm[1]).getTime(),src:c?'schedule':'typical'}; }
function gunOf(M){ const v=(M.marks||[]).filter(m=>m.at&&m.t>0&&!m.deleted).map(m=>m.at-m.t*1000).sort((a,b)=>a-b); return v.length?v[Math.floor(v.length/2)]:null; }
function wxDays(){ const days=new Map();
  allRaces(true).forEach(x=>{ if(!x.date||x.fi<0) return; const pid=racePlaceId(x); if(!pid) return; const id=x.date+'_'+pid, mt=meetOf(x.M.meetId);
    const fin=Math.max(0,...x.M.rows.map(r=>r.cells[x.fi]?r.cells[x.fi].t:0)), g=x.where!=='official'?gunOf(x.M):null, st=g?{at:g,src:'gun'}:dayStart(x.date,mt&&mt.time||'');
    const d=days.get(id)||{id,date:x.date,place:pid,start:Infinity,end:0,n:0,src:'',names:new Set(),ends:[]}; d.n++; d.ends.push({src:st.src,at:st.at,end:st.at+Math.max(fin,600)*1000});
    d.names.add(mt?seriesName(mt.seriesId):(x.M.printed||x.M.name||'')); days.set(id,d); });
  days.forEach(d=>{ const gun=d.ends.filter(e=>e.src==='gun'), use=gun.length?gun:d.ends; // a gun beats the schedule, the schedule beats a typical time
    d.src=gun.length?'gun':use[0].src; d.start=Math.min(...use.map(e=>e.at)); d.end=Math.max(...use.map(e=>e.end));
    if(!gun.length&&d.n>1) d.end+=30*60e3; // races run one after another after a scheduled start
    d.end=Math.max(d.end,d.start+10*60e3); delete d.ends; });
  return days; }
const wxRec=id=>(S.weather||[]).find(w=>w.id===id&&!w.deleted);
// The weather for a saved race: the location its phone captured at the gun, else its place that day.
function wxForRace(x){ if(!x||!x.date) return null; const g=x.M&&x.M.raceId&&wxRec(x.date+'_g-'+x.M.raceId); if(g&&g.lat!=null) return g;
  const pid=racePlaceId(x); return pid?wxRec(x.date+'_'+pid)||null:null; }
const wxForDay=L=>{ for(const x of L){ const r=wxForRace(x); if(r&&r.status==='ok') return r; } for(const x of L){ const r=wxForRace(x); if(r) return r; } return null; };
// New records for every race day at a confirmed place that has none yet (backfill, then each new day).
function wxPlan(){ if(!S.weather) S.weather=[]; const have=new Set(S.weather.map(w=>w.id)); let n=0;
  wxDays().forEach(d=>{ if(have.has(d.id)) return; const p=okPlace(d.place); if(!p) return;
    S.weather.push({id:d.id,date:d.date,place:d.place,lat:p.lat,lon:p.lon,start:d.start,end:d.end,src:d.src,status:'pending',wx:null,at:0,tries:0,next:0,dismissed:[]}); n++; });
  // a place confirmed somewhere else later: records waiting for it get its coordinates
  S.weather.forEach(w=>{ if(w.status==='pending'&&w.lat==null&&w.place&&!w.place.startsWith('g-')){ const p=okPlace(w.place); if(p){ w.lat=p.lat; w.lon=p.lon; n++; } } });
  return n; }

/* fetching */
const WX_RECENT=85*864e5; // the forecast API keeps about 90 days of the past; older dates come from the archive
const ymd=ms=>new Date(ms).toISOString().slice(0,10); // UTC dates: the request asks for GMT hours
// Averages over the race (temperatures, humidity, wind, cloud: sampled every 5 minutes between the hourly values),
// the highest gust, and rain: Open-Meteo's precipitation is the sum over the hour before each time.
function wxSummary(h,start,end){ const T=h.time; if(!T||!T.length) return null; const s=start/1000, e=Math.max(end/1000,s+600);
  const at=(k,t)=>{ const v=h[k]; let i=T.findIndex(x=>x>t); if(i<=0) return i===0?v[0]:v[T.length-1]; const a=v[i-1], b=v[i]; if(a==null||b==null) return a==null?b:a; return a+(b-a)*(t-T[i-1])/(T[i]-T[i-1]); };
  const avg=k=>{ const xs=[]; for(let t=s;t<=e+1;t+=300) xs.push(at(k,t)); if(xs.some(v=>v==null)) return null; return xs.reduce((p,q)=>p+q,0)/xs.length; };
  const rainIn=(a,b)=>{ let sum=0, any=false; T.forEach((t,i)=>{ const lo=t-3600, ov=Math.min(b,t)-Math.max(a,lo); if(ov<=0) return; const v=h.precipitation[i]; if(v==null) return; any=true; sum+=v*ov/3600; }); return any?sum:null; };
  if(s<T[0]||e>T[T.length-1]+3600) return null;
  const w={t:avg('temperature_2m'),at:avg('apparent_temperature'),dp:avg('dew_point_2m'),rh:avg('relative_humidity_2m'),ws:avg('wind_speed_10m'),cc:avg('cloud_cover'),pr:rainIn(s,e),pr48:rainIn(s-48*3600,s)};
  const gs=[]; for(let t=s;t<=e+1;t+=300) gs.push(at('wind_gusts_10m',t)); w.wg=gs.some(v=>v==null)?null:Math.max(...gs);
  if(Object.values(w).some(v=>v==null||!isFinite(v))) return null;
  const r1=v=>Math.round(v*10)/10, r2=v=>Math.round(v*100)/100;
  return {t:r1(w.t),at:r1(w.at),dp:r1(w.dp),rh:Math.round(w.rh),ws:r1(w.ws),wg:r1(w.wg),pr:r2(w.pr),pr48:r2(w.pr48),cc:Math.round(w.cc)}; }
async function wxFetchGroup(G){ const recent=G.recent, s0=Math.min(...G.list.map(w=>w.start))-49*3600e3, e0=Math.max(...G.list.map(w=>w.end))+3600e3;
  const host=recent?'https://api.open-meteo.com/v1/forecast':'https://archive-api.open-meteo.com/v1/archive';
  const u=`${host}?latitude=${G.lat}&longitude=${G.lon}&start_date=${ymd(s0)}&end_date=${ymd(e0)}&hourly=${WX_VARS}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timeformat=unixtime&timezone=GMT`;
  const j=await wxGet(u,30000); return j&&j.hourly||null; }
let wxBusy=false, wxLastRun=0, wxNote='';
// Fill in every waiting record whose race is over (and retry failed ones with a growing wait). Never throws.
async function wxRun(why){ if(wxBusy) return 0; wxBusy=true; let filled=0;
  try{ if(!S.weather) S.weather=[]; const planned=wxPlan(); if(planned) save();
    if(typeof navigator!=='undefined'&&navigator.onLine===false){ wxNote='offline'; return 0; }
    const now=Date.now(), due=S.weather.filter(w=>w.status==='pending'&&!w.deleted&&w.lat!=null&&w.end+10*60e3<=now&&(why==='force'||why==='online'||!(w.next>now))); // back online: try everything now
    const groups=new Map(); due.forEach(w=>{ const recent=now-w.start<WX_RECENT, k=[recent?'f':'a',w.lat.toFixed(3),w.lon.toFixed(3),recent?'':seasonOf(dayMs(w.date))].join('|');
      const g=groups.get(k)||{recent,lat:w.lat,lon:w.lon,list:[]}; g.list.push(w); groups.set(k,g); });
    const down=new Set(); // a server that didn't answer is skipped for the rest of this run (tried again later)
    for(const G of groups.values()){
      // archive ranges stay within one season; split very long lists so one bad date can't hold up the rest
      for(let i=0;i<G.list.length;i+=40){ const part={...G,list:G.list.slice(i,i+40)};
        let h=null; if(!down.has(G.recent)) try{ h=await wxFetchGroup(part); wxNote=''; }catch(err){ wxNote=String(err&&err.message||err); if(!/^Weather service:/.test(wxNote)) down.add(G.recent); }
        part.list.forEach(w=>{ const wx=h&&wxSummary(h,w.start,w.end); if(wx){ w.status='ok'; w.wx=wx; w.at=Date.now(); delete w.next; filled++; }
          else { w.tries=(w.tries||0)+1; w.next=Date.now()+Math.min(6*3600e3,60e3*Math.pow(2,w.tries)); } }); // archive lag or no signal: later
        save(); } }
    if(filled){ memo.clear(); wxRefresh(); }
  }catch(err){ wxNote=String(err&&err.message||err); }
  finally{ wxBusy=false; wxLastRun=Date.now(); }
  return filled; }
// "142 race days with weather · 3 waiting · 4 places to confirm"
function wxStatus(){ const W=(S.weather||[]).filter(w=>!w.deleted), ok=W.filter(w=>w.status==='ok').length, wait=W.length-ok, pc=placesToConfirm().length;
  return [`${ok} race day${ok===1?'':'s'} with weather`,wait?`${wait} waiting`:'',pc?`${pc} location${pc===1?'':'s'} to confirm`:'',wxNote==='offline'?'offline':wxNote?'last try failed':''].filter(Boolean).join(' · '); }
function wxRefresh(){ try{ if(curTab==='results'&&$('#overlay').hidden) renderResults(); }catch(e){} }
// The gun: a record for this race at the gun time, at its course's place; with "use this phone's location", the
// phone's position once it arrives (never waited for). The race's end is set when it's saved.
function wxGun(r){ try{ if(!r||!r.gun) return; const start=srv(r.gun), date=localDate(new Date(start)), id=date+'_g-'+r.id, mt=meetOf(r.meetId), pid=(mt&&mt.courseId)||r.courseId, p=pid&&okPlace(pid);
    if(!S.weather) S.weather=[]; S.weather=S.weather.filter(w=>w.id!==id);
    const rec={id,date,place:'g-'+r.id,raceId:r.id,lat:p?p.lat:null,lon:p?p.lon:null,start,end:start+45*60e3,src:p?'course':'gun',status:'pending',wx:null,at:0,tries:0,next:0,dismissed:[]};
    S.weather.push(rec); save();
    if(S.settings.raceGeo&&navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>{ const w=wxRec(id); if(!w) return;
      w.lat=Math.round(pos.coords.latitude*1e4)/1e4; w.lon=Math.round(pos.coords.longitude*1e4)/1e4; w.src='phone'; w.acc=Math.round(pos.coords.accuracy||0); save(); },()=>{},{enableHighAccuracy:false,timeout:20000,maximumAge:10*60e3});
  }catch(e){} }
function wxUngun(r){ try{ S.weather=(S.weather||[]).filter(w=>!(w.raceId===r.id&&w.status!=='ok')); save(); }catch(e){} }
function wxEnded(r){ try{ const w=(S.weather||[]).find(x=>x.raceId===r.id); if(!w||w.status==='ok') return; const ts=(r.marks||[]).filter(m=>!m.deleted&&m.runnerId).map(m=>raceSecs(r,m)).filter(t=>t>0);
    w.end=w.start+Math.max(600,ts.length?Math.max(...ts):0)*1000; save(); setTimeout(()=>wxRun('ended'),Math.max(0,w.end+10*60e3-Date.now())+1000); }catch(e){} }

/* flags: dismiss */
function wxDismiss(id,k){ const w=wxRec(id); if(!w) return; w.dismissed=[...new Set([...(w.dismissed||[]),k])]; save(); memo.clear(); wxRefresh(); refreshAll();
  snack(`“${WX_FLAGS[k][1]}” dismissed for this race day`,'Undo',()=>{ w.dismissed=(w.dismissed||[]).filter(x=>x!==k); save(); memo.clear(); wxRefresh(); refreshAll(); },8000); }
document.addEventListener('click',e=>{ const f=e.target.closest('[data-wxflag]'); if(f){ e.preventDefault(); e.stopPropagation(); const i=f.dataset.wxflag.lastIndexOf(':'), id=f.dataset.wxflag.slice(0,i), k=f.dataset.wxflag.slice(i+1);
    actionSheet(`${WX_FLAGS[k][1]}: ${WX_RULE(k)}`,[{label:`Dismiss “${WX_FLAGS[k][1]}” for this race day`,fn:()=>wxDismiss(id,k)}]); return; }
  const u=e.target.closest('[data-wxundis]'); if(u){ e.preventDefault(); e.stopPropagation(); const w=wxRec(u.dataset.wxundis); if(!w) return; const was=(w.dismissed||[]).slice(); w.dismissed=[]; save(); memo.clear(); wxRefresh();
    snack('Dismissed flags shown again','Undo',()=>{ w.dismissed=was; save(); memo.clear(); wxRefresh(); },8000); } },true);

/* the course locations sheet: every place once */
// Confirm a place (g = {lat, lon, label}, or null = skip: no weather there). Waiting records get its coordinates; if it
// moved, weather already fetched there is fetched again.
function placeSet(id,g,src,name){ if(!S.places) S.places=[]; const p=placeById(id)||{id,name:String(name||placeName(id)||id).slice(0,40)};
  Object.assign(p,{lat:g?g.lat:null,lon:g?g.lon:null,label:g?String(g.label||'').slice(0,60):'',src,confirmed:true,confirmedBy:(S.settings.coachName||'').slice(0,30)});
  if(!S.places.includes(p)) S.places.push(p);
  (S.weather||[]).forEach(w=>{ if(w.place!==id) return; const moved=w.lat==null||p.lat==null||Math.abs(w.lat-p.lat)>0.02||Math.abs(w.lon-p.lon)>0.02;
    if(w.status!=='ok'||moved){ w.lat=p.lat; w.lon=p.lon; if(moved&&w.status==='ok'){ w.status='pending'; w.wx=null; w.tries=0; w.next=0; } } });
  save(); memo.clear(); refreshAll(); return p; }
function placesSheet(){ const meta=wxMeta(), all=placesNeeded().sort((a,b)=>(!!(placeById(a.id)||{}).confirmed)-(!!(placeById(b.id)||{}).confirmed)||a.name.localeCompare(b.name));
  const sug=id=>{ const p=placeById(id); return p&&p.lat!=null?{lat:p.lat,lon:p.lon,label:p.label}:meta[id]||null; };
  const rowHTML=e=>{ const p=placeById(e.id), s=sug(e.id), done=p&&p.confirmed;
    return `<div class="pl-row${done?' pl-done':''}" data-pl="${esc(e.id)}"><div class="pl-name"><b>${esc(e.name)}</b><span class="hint">${esc([...e.used].filter(Boolean).slice(0,3).join(' · '))}</span></div>
      <div class="pl-sug">${done?(p.lat==null?'Skipped: no weather':`✓ ${esc(p.label||'')} <span class="hint">${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}</span>`):s?`${esc(s.label)} <span class="hint">${s.lat.toFixed(3)}, ${s.lon.toFixed(3)}</span> <a href="https://maps.apple.com/?ll=${s.lat},${s.lon}&q=${encodeURIComponent(s.label)}" target="_blank" rel="noopener">Map</a>`:meta[e.id]===0?'<span class="hint">No town found in the name. Type one.</span>':navigator.onLine===false?'<span class="hint">Looking up when there’s a signal</span>':'<span class="hint">Looking up…</span>'}</div>
      <div class="pl-acts">${!done&&s?`<button type="button" class="btn primary" data-plok="${esc(e.id)}">Confirm</button>`:''}<input class="pl-q" data-plq="${esc(e.id)}" placeholder="Town, e.g. Kiel" autocomplete="off" aria-label="Town for ${esc(e.name)}"><button type="button" class="btn" data-plfind="${esc(e.id)}">Find</button><button type="button" class="btn" data-plgeo="${esc(e.id)}">I’m here</button>${done?'':`<button type="button" class="btn plain" data-plskip="${esc(e.id)}">Skip</button>`}</div></div>`; };
  const todo=all.filter(e=>!(placeById(e.id)||{}).confirmed), sugd=todo.filter(e=>sug(e.id));
  modal(`<div class="sheet-head"><h2>Race locations</h2><button class="btn plain" data-x="done">Done</button></div>
    <p class="hint">Each course gets a location once, for race weather. Town-level is close enough. Check each suggestion (Map opens it), then Confirm, or type a town. “I’m here” uses this phone’s location; Skip means no weather for that place.</p>
    ${sugd.length>1?`<button type="button" class="btn" data-plall>Confirm all ${sugd.length} suggestions</button>`:''}
    <div class="pl-list">${all.map(rowHTML).join('')||'<p class="empty">No races or meets yet.</p>'}</div>${WX_ATTR}`,(m,close)=>{
    m.querySelector('[data-x=done]').onclick=()=>{ close(); wxRun('places'); };
    const setP=(id,g,src)=>{ const e=all.find(x=>x.id===id); placeSet(id,g,src,e&&e.name); };
    const redraw=()=>{ const keep=m.querySelector('.pl-list').scrollTop; close(); placesSheet(); const L=document.querySelector('#modal .pl-list'); if(L) L.scrollTop=keep; };
    m.querySelectorAll('[data-plok]').forEach(b=>b.onclick=()=>{ const s=sug(b.dataset.plok); if(s){ setP(b.dataset.plok,s,'geocode'); redraw(); } });
    const all1=m.querySelector('[data-plall]'); if(all1) all1.onclick=()=>{ sugd.forEach(e=>setP(e.id,sug(e.id),'geocode')); toast(`${sugd.length} locations confirmed`); redraw(); };
    m.querySelectorAll('[data-plskip]').forEach(b=>b.onclick=()=>{ setP(b.dataset.plskip,null,'skip'); redraw(); });
    m.querySelectorAll('[data-plfind]').forEach(b=>b.onclick=async()=>{ const id=b.dataset.plfind, q=m.querySelector(`[data-plq="${CSS.escape(id)}"]`).value; b.disabled=true;
      try{ const g=await geocode(q,true); if(!g){ toast('No town by that name'); b.disabled=false; return; } const mm=wxMeta(); mm[id]=g; wxMetaSet(mm); setP(id,g,'typed'); toast(`${g.label} confirmed`); redraw(); }catch(err){ toast('No signal: try again later'); b.disabled=false; } });
    m.querySelectorAll('[data-plgeo]').forEach(b=>b.onclick=()=>{ const id=b.dataset.plgeo; if(!navigator.geolocation){ toast('This phone can’t share its location'); return; } b.disabled=true;
      navigator.geolocation.getCurrentPosition(pos=>{ setP(id,{lat:Math.round(pos.coords.latitude*1e4)/1e4,lon:Math.round(pos.coords.longitude*1e4)/1e4,label:'This phone’s location'},'phone'); redraw(); },()=>{ toast('Location not allowed'); b.disabled=false; },{timeout:20000,maximumAge:60e3}); });
    // look up suggestions for the places that don't have one yet (once per place on this phone)
    (async()=>{ const need=todo.filter(e=>meta[e.id]===undefined&&!sug(e.id)); let got=0; for(const e of need){ if(!m.isConnected) return; try{ const g=await suggestPlace(e); const mm=wxMeta(); mm[e.id]=g||0; wxMetaSet(mm); got++; }catch(err){ return; } }
      if(got&&m.isConnected) redraw(); })();
  }); }

/* the model: how much of a race day's rating the weather explains */
// Heat: Mark Hadley's temperature + dew point guide (100 → 0%, 130 → 2%, 150 → 4.5%, 180 → 10%), as given.
// Wind (per mph over 10), mud (per inch of rain before, rain during counts double) and cold (per °F under 40) start
// from typical values and are fitted to this team's race days (ridge, worth WX_PRIOR_DAYS days of evidence).
const HEAT_PTS=[[100,0],[110,0.005],[120,0.01],[130,0.02],[140,0.03],[150,0.045],[160,0.06],[170,0.08],[180,0.1]];
const heatCost=td=>{ if(td<=100) return 0; for(let i=1;i<HEAT_PTS.length;i++){ const [x0,y0]=HEAT_PTS[i-1],[x1,y1]=HEAT_PTS[i]; if(td<=x1) return y0+(y1-y0)*(td-x0)/(x1-x0); } return 0.1+(td-180)*0.002; };
const WX_PRIOR=[1,0.0007,0.02,0.0005], WX_PRIOR_DAYS=6;
const wxFeat=w=>[heatCost(w.t+w.dp),Math.max(0,w.ws-10),Math.min(1.5,w.pr48)+2*Math.min(0.5,w.pr),Math.max(0,40-w.t)];
function solveLin(A,b){ const n=b.length, M=A.map((r,i)=>[...r,b[i]]); for(let c=0;c<n;c++){ let piv=c; for(let r=c+1;r<n;r++) if(Math.abs(M[r][c])>Math.abs(M[piv][c])) piv=r; [M[c],M[piv]]=[M[piv],M[c]]; const d=M[c][c]||1e-12;
    for(let r=0;r<n;r++){ if(r===c) continue; const f=M[r][c]/d; for(let k=c;k<=n;k++) M[r][k]-=f*M[c][k]; } } return M.map((r,i)=>r[n]/(r[i]||1e-12)); }
// "Weather explains 0:15 of it (Warm); course and the rest: 0:07"
function wxSplitText(F,k){ const c=F.conf[k], w=F.wxPart&&F.wxPart[k]; if(!c||w==null) return ''; const T=c.t5, ws=T*(1-Math.exp(-w)), rest=c.secs-ws, s=v=>`${v<0?'−':''}${fmtSec(Math.abs(v),0)}`;
  return `Weather explains ${s(ws)} of it; course and everything else ${s(rest)}`; }

/* when it runs */
function wxKick(why){ if(Date.now()-wxLastRun<60e3&&why!=='force'&&why!=='online') return; setTimeout(()=>wxRun(why),why==='open'?4000:200); }
window.addEventListener('online',()=>wxKick('online'));
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) wxKick('return'); });
setInterval(()=>wxKick('timer'),5*60e3);
STORE_READY.then(()=>wxKick('open'));

/* ---------- data health (2.11.1) ---------- */
// One screen (Settings and Data) that lists what keeps results from sorting cleanly, each with a one-tap fix:
// runners with no Girls/Boys, suspected duplicate runners, results with no division or level, meets with more than one
// race for a division, meets outside their season, and results from runners not on the roster. Checked whenever
// something changes (after an import or a merge too); a badge shows the count.
function healthIssues(){ return memoize('health',()=>{
  const out=[], admin=canImport(), R=S.roster.filter(a=>a.name.trim());
  // 1. no Girls/Boys
  R.filter(a=>a.gender!=='G'&&a.gender!=='B').forEach(a=>out.push({kind:'gender',id:a.id,text:`${a.name} has no Girls/Boys setting`,fix:`<span class="seg2 lvl-seg"><button type="button" data-hfix="g:${a.id}:G">Girls</button><button type="button" data-hfix="g:${a.id}:B">Boys</button></span>`}));
  // 2. suspected duplicates: same first name (or nickname) and the same last initial / a short form of the other
  for(let i=0;i<R.length;i++) for(let j=i+1;j<R.length;j++){ const a=R[i], b=R[j], x=splitName(a.name), y=splitName(b.name);
    if(!x.first||!y.first||!sameFirst(x.first,y.first)||!x.last||!y.last||x.last[0]!==y.last[0]) continue;
    if(!(x.last.startsWith(y.last)||y.last.startsWith(x.last))) continue;
    const dup=x.last.length<=y.last.length?a:b, real=dup===a?b:a;
    out.push({kind:'dup',id:dup.id+'|'+real.id,text:`${dup.name} and ${real.name} may be the same runner`,fix:admin?`<button type="button" class="btn" data-hfix="merge:${dup.id}:${real.id}">Merge into ${esc(real.name)}</button><button type="button" class="btn" data-hfix="merge:${real.id}:${dup.id}">Merge into ${esc(dup.name)}</button><button type="button" class="btn" data-hfix="mergeother:${dup.id}">Merge into…</button>`:'<span class="hint">Your admin can merge them.</span>'}); }
  // 3.2: race locations to confirm (for weather)
  { const pc=placesToConfirm(); if(pc.length) out.push({kind:'places',id:'places',text:`${pc.length} race location${pc.length===1?'':'s'} to confirm for race weather (${pc.slice(0,4).map(e=>e.name).join(', ')}${pc.length>4?'…':''})`,fix:'<button type="button" class="btn" data-hfix="places:x:x">Review locations</button>'}); }
  // 3. official results with no division or no level
  const E=levelEdits(); let noLv=0, noG=0; const seen=new Set();
  offEntries().forEach(h=>{ if(h.level==='MS') return; h.race.rows.forEach(r=>{ if(seen.has(r.id+h.id)) return; seen.add(r.id+h.id); if(!h.race.g) noG++; else if(!/V$/.test(h.race.division||'')) noLv++; }); });
  // 2.13: no Varsity/JV, so no level check
  if(noG) out.push({kind:'nodiv',id:'nodiv',text:`${noG} official result${noG===1?' has':'s have'} no division (the runner has no Girls/Boys, or isn’t on the roster)`,fix:'<span class="hint">Fixed by the Girls/Boys and runner items here.</span>'});
  // 4. meets with more than one race for a division
  const byMeet={}; allRaces().filter(x=>x.M.meetId&&(x.where!=='local'||syncMode()!=='joined')).forEach(x=>{ (byMeet[x.M.meetId]||(byMeet[x.M.meetId]=[])).push(x); });
  Object.entries(byMeet).forEach(([id,L2])=>{ const extra=meetDivisions(L2).reduce((n,d)=>n+d.extra.length,0);
    if(extra){ const mt=meetOf(id); out.push({kind:'split',id,text:`${mt?seriesName(mt.seriesId)+' '+fmtDay(mt.date):'A meet'} has a result list that couldn’t be combined (another distance or other checkpoints)`,fix:`<button type="button" class="btn" data-hfix="meet:${id}">Open</button>`}); } });
  // 5. meets outside their season
  (S.meets||[]).forEach(m=>{ const want=m.date?seasonOf(dayMs(m.date)):null; if((want!=null&&m.season!==want)||(!m.date&&!m.season)) out.push({kind:'season',id:m.id,text:`${seriesName(m.seriesId)} ${m.date?fmtDay(m.date):'(no date)'} is filed under the wrong season`,fix:m.date?`<button type="button" class="btn" data-hfix="season:${m.id}">Move to ${seasonOf(dayMs(m.date))}</button>`:`<button type="button" class="btn" data-hfix="meetedit:${m.id}">Set a date</button>`}); });
  // 6. official results from runners not on the roster
  const unk={}; const LE=linkEdits(); OFFICIAL.forEach(d=>{ if(d.deleted) return; (d.results||[]).forEach(r=>{ const aid=LE[r.k]?LE[r.k].aid:r.aid; if(aid&&S.roster.some(a=>a.id===mergedTo(aid))) return; (unk[r.name]||(unk[r.name]=[])).push(r.k); }); });
  const gone=id=>TRASH.find(e=>(e.kind==='athlete'||e.kind==='merge')&&e.id===id);
  Object.entries(unk).forEach(([nm,ks])=>{ const aid=(()=>{ for(const d of OFFICIAL) for(const r of d.results||[]) if(ks.includes(r.k)) return LE[r.k]?LE[r.k].aid:r.aid; return null; })(), t=aid&&gone(aid), sug=t?likelySame(nm,R):null;
    if(t&&admin){ out.push({kind:'removed',id:'r:'+aid,text:`${ks.length} official result${ks.length===1?'':'s'} for ${nm}, who was removed (in Recently deleted)${sug?`. Probably ${sug.name}.`:''}`,aid,name:nm,
      fix:`${sug?`<button type="button" class="btn" data-hfix="mergeoff:${aid}:${sug.id}">Merge into ${esc(sug.name)}</button>`:''}<select data-hmerge="${esc(aid)}" aria-label="Merge ${esc(nm)} into"><option value="">Merge into…</option>${R.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`}); return; }
    out.push({kind:'unknown',id:'u:'+nm,text:`${ks.length} official result${ks.length===1?'':'s'} for ${nm}, who isn’t on the roster`,keys:ks,name:nm,fix:admin?`<select data-hlink="${esc(nm)}" aria-label="Link ${esc(nm)}"><option value="">Link to a runner…</option>${R.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select><button type="button" class="btn" data-hfix="addrunner:${esc(nm)}">Add as a runner</button>`:''}); });
  // 7. merges this phone made that the team's published rules refuse (rules older than 2.9.2): other phones don't have them
  if(syncMode()==='joined'&&syncInfo.mergesBlocked&&(S.merges||[]).length) out.push({kind:'blocked',id:'blocked',text:`${(S.merges||[]).length} merged runner${(S.merges||[]).length===1?'':'s'} can’t reach your other phones: the team’s published rules are older than 2.9.2.`,fix:'<span class="hint">Publish firestore.rules in the Firebase console (Firestore Database > Rules). Until then other phones show the duplicate’s results as “not on the roster”.</span>'});
  // 8. short names: runners with official results whose name is first name + initial (re-importing the history file fills in last names)
  const shortN=R.filter(a=>/^\S+ \S\.?$/.test(a.name.trim())&&OFFICIAL.some(d=>!d.deleted&&(d.results||[]).some(r=>mergedTo(r.aid)===a.id)));
  if(shortN.length) out.push({kind:'short',id:'short',text:`${shortN.length} runner${shortN.length===1?' has':'s have'} only a last initial (${shortN.slice(0,3).map(a=>a.name).join(', ')}${shortN.length>3?'…':''})`,fix:admin?'<button type="button" class="btn" data-hfix="reimport">Import the history file again</button><span class="hint">Or tap a name on the Team tab.</span>':'<span class="hint">Tap a name on the Team tab to type the full name.</span>'});
  return out; }); }
// The roster runner a removed name most likely is: same first name (or nickname) and a matching last name or initial.
function likelySame(nm,R){ const x=splitName(nm); if(!x.first) return null; const c=R.filter(a=>{ const y=splitName(a.name); return y.first&&sameFirst(x.first,y.first)&&(!x.last||!y.last||x.last[0]===y.last[0]); }); return c.length===1?c[0]:null; }
// Merge a runner who is no longer on the roster (removed, or removed by another phone's merge that never arrived) into a
// roster runner: only the merge record is added, so every result maps over. Undo removes it again (2.12).
function mergeOff(dup,name,real){
  const B=S.roster.find(x=>x.id===real); if(!B) return null;
  S.merges=[...(S.merges||[]).filter(m=>m.id!==dup),{id:dup,to:real,at:Date.now(),byName:S.settings.coachName||''}];
  memo.clear(); offSet([...OFFICIAL]);
  const key=trashPut({kind:'merge',id:dup,label:`${name} merged into ${B.name}`,item:{id:dup,name,group:'',gender:''},extra:{to:real,offRoster:true}});
  save(); return key;
}
async function quickMerge(dup,real,name){ // one tap from Data health: a snapshot, the full merge, then Undo
  await takeSnapshot('Before merging runners'); const onR=S.roster.some(a=>a.id===dup), key=onR?doMerge(dup,real):mergeOff(dup,name,real); if(!key) return;
  refreshAll(); updateHealthBadge(); const A=TRASH.find(e=>e.key===key); removedSnack(`Merged ${A?A.item.name:'the duplicate'} into ${(S.roster.find(x=>x.id===real)||{}).name}`,key);
}
function updateHealthBadge(){ const n=healthIssues().length, g=$('#gearBadge'); if(g){ g.textContent=n?String(n):''; g.hidden=!n; } const b=$('#openHealth'); if(b){ b.querySelector('.hb').textContent=n?String(n):''; b.classList.toggle('attn',!!n); } }
function healthSheet(){
  memo.clear(); const L=healthIssues(), W={places:'Race locations (weather)',gender:'Runners with no Girls/Boys',dup:'Possible duplicate runners',removed:'Results from a removed runner',blocked:'Merges not shared yet',short:'Short names',nodiv:'Results with no division',split:'Meets with a list that couldn’t be combined',season:'Meets outside their season',unknown:'Results from runners not on the roster'};
  const kinds=[...new Set(L.map(x=>x.kind))];
  modal(`<div class="health-sheet"><h2>Data health</h2><p class="hint">${L.length?`${L.length} thing${L.length===1?'':'s'} to look at. Each has a one-tap fix.`:'Everything sorts cleanly: every runner has Girls/Boys, every result a division and level, one race per division at every meet.'}</p>
    ${kinds.map(k=>`<h3>${esc(W[k])} <span class="n">${L.filter(x=>x.kind===k).length}</span></h3>${L.filter(x=>x.kind===k).map(x=>`<div class="health-row"><span>${esc(x.text)}</span><span class="hfix">${x.fix}</span></div>`).join('')}`).join('')}
    <div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-hmerge]').forEach(sel=>sel.onchange=()=>{ if(!sel.value) return; const it=L.find(x=>x.kind==='removed'&&x.aid===sel.dataset.hmerge); close(); quickMerge(it.aid,sel.value,it.name); });
    m.querySelectorAll('[data-hlink]').forEach(sel=>sel.onchange=()=>{ if(!sel.value) return; const it=L.find(x=>x.kind==='unknown'&&x.name===sel.dataset.hlink); const undo=setLinks(it.keys.map(k=>({k,aid:sel.value})),true); refreshAll(); healthSheet(); snack(`Linked ${it.keys.length} result${it.keys.length===1?'':'s'}`,'Undo',()=>{ setLinks(undo,true); refreshAll(); },8000); });
    m.addEventListener('click',e=>{ const b=e.target.closest('[data-hfix]'); if(!b) return; const [k,a,c]=b.dataset.hfix.split(':');
      if(k==='g'){ const r=S.roster.find(x=>x.id===a); if(r){ r.gender=c; save(); memo.clear(); offSet([...OFFICIAL]); refreshAll(); healthSheet(); } }
      if(k==='merge'){ close(); quickMerge(a,c); } // the sheet closes so the Undo bar shows
      if(k==='mergeother'){ close(); mergeSheet({dup:a}); }
      if(k==='mergeoff'){ const it=L.find(x=>x.kind==='removed'&&x.aid===a); close(); quickMerge(a,c,it?it.name:'Runner'); }
      if(k==='reimport'){ close(); importEntry(); }
      if(k==='places'){ close(); placesSheet(); }
      if(k==='levels'){ close(); levelSheet({}); }
      if(k==='meet'){ close(); showTab('results'); showResultsView('meets'); const d=document.querySelector(`#histList details.hist-meet[data-meet="${CSS.escape(a)}"]`); if(d){ d.open=true; d.scrollIntoView({block:'start'}); } }
      if(k==='season'){ const mt=meetOf(a); if(mt){ mt.season=seasonOf(dayMs(mt.date)); save(); refreshAll(); healthSheet(); } }
      if(k==='meetedit'){ close(); meetEditSheet(meetOf(a)); }
      if(k==='addrunner'){ const it=L.find(x=>x.kind==='unknown'&&x.name===a); const nr={id:uid(),name:a.slice(0,30),group:'',gender:''}; S.roster.push(nr); save(); const undo=setLinks(it.keys.map(kk=>({k:kk,aid:nr.id})),true); refreshAll(); healthSheet();
        snack(`Added ${nr.name}`,'Undo',()=>{ setLinks(undo,true); trashPut({kind:'athlete',id:nr.id,label:nr.name,item:{...nr}}); S.roster=S.roster.filter(x=>x!==nr); save(); refreshAll(); },8000); }
    });
  });
}

/* ---------- steppers (2.13): − and + beside a number or time field, so most changes need no keyboard ---------- */
const stepper=(field,step,label,time)=>`<div class="stepper" data-stepper="${step}"${time?' data-time':''}><button type="button" class="btn st-btn" data-step="-1" aria-label="${esc(label)} down">−</button><div class="st-field">${field}</div><button type="button" class="btn st-btn" data-step="1" aria-label="${esc(label)} up">+</button></div>`;
document.addEventListener('click',e=>{ const b=e.target.closest('[data-step]'); if(!b) return; const st=b.closest('[data-stepper]'), inp=st&&st.querySelector('input'); if(!inp) return;
  const step=+st.dataset.stepper*(+b.dataset.step), time=st.hasAttribute('data-time');
  if(time){ const cur=parseTime(inp.value)||0, v=Math.max(0,Math.round((cur+step)/Math.abs(+st.dataset.stepper))*Math.abs(+st.dataset.stepper)), sec=inp.closest('.tf')&&inp.closest('.tf').dataset.unit==='sec';
    inp.value=v?(sec?String(v):fmtSec(v,0)):''; }
  else { const mn=inp.min!==''?+inp.min:-Infinity, mx=inp.max!==''?+inp.max:Infinity; inp.value=String(clamp((+inp.value||0)+step,mn,mx)); }
  inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); });

/* ---------- keyboard ---------- */
// iOS doesn't shrink the page for the keyboard. Measure it from visualViewport, expose it as --kb,
// and keep the focused field in view.
(function(){
  const vv=window.visualViewport; if(!vv) return;
  let raf=0;
  const measure=()=>{ raf=0;
    const kb=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));
    document.documentElement.style.setProperty('--kb',kb+'px');
    document.body.classList.toggle('kb-open',kb>80);
  };
  const queue=()=>{ if(!raf) raf=requestAnimationFrame(measure); };
  vv.addEventListener('resize',queue); vv.addEventListener('scroll',queue);
})();
const NO_KB=/^(checkbox|radio|button|submit|reset|range|file|color)$/;
// 2.13: keep the focused field in the part of the screen the keyboard leaves visible (visualViewport), never under it or
// under the header: first inside its sheet (which already ends above the keyboard), then the page. Checked on focus, and
// again whenever the keyboard changes size (it animates in, and the suggestion bar comes and goes).
function keepVisible(t){
  if(!t||!t.isConnected||document.activeElement!==t) return;
  const vv=window.visualViewport, vh=vv?vv.height:window.innerHeight, top=(vv?vv.offsetTop:0), head=document.querySelector('header.top'), hp=head?getComputedStyle(head).position:'', hb=t.closest('.modal, #wkEditor')||!/sticky|fixed/.test(hp)?8:head.getBoundingClientRect().bottom;
  const box=t.closest('.tf,.stepper,.field')||t; let r=box.getBoundingClientRect(); const lo=top+Math.max(8,hb), hi=top+vh-12;
  if(r.top>=lo&&r.bottom<=hi) return;
  // 3.0: the workout editor is a sheet too
  const sheet=t.closest('.modal, body.wk-editing #wkEditor'); if(sheet&&sheet.scrollHeight>sheet.clientHeight){ const sr=sheet.getBoundingClientRect(), want=(Math.max(sr.top,lo)+Math.min(sr.bottom,hi))/2; sheet.scrollTop+=r.top+r.height/2-want; r=box.getBoundingClientRect(); }
  if(r.top<lo||r.bottom>hi) window.scrollBy(0,r.top+r.height/2-(lo+hi)/2);
}
document.addEventListener('focusin',e=>{
  const t=e.target;
  if(!t.matches || !t.matches('input,select,textarea') || NO_KB.test(t.type)) return;
  if(!window.matchMedia('(pointer: coarse)').matches) return; // phones and tablets only
  setTimeout(()=>keepVisible(t),300); setTimeout(()=>keepVisible(t),700);
});
if(window.visualViewport) window.visualViewport.addEventListener('resize',()=>setTimeout(()=>keepVisible(document.activeElement),60));

/* ---------- boot ---------- */
renderGrid(); updateRaceBanner();
try{ if(!localStorage.getItem(TOUR_KEY)){ if(LOADED) localStorage.setItem(TOUR_KEY,'1'); else setTimeout(()=>showTour(0),400); } }catch(e){} // existing phones skip it
applyWake(); // 2.9.1: also when something is timing
requestAnimationFrame(tick);
setTimeout(()=>checkVersion(false,'open'),1500); // on open (2.9.0)
try{ const rs=sessionStorage.getItem('mustang-splits:restored'); if(rs){ sessionStorage.removeItem('mustang-splits:restored'); toast(rs==='snapshot'?'Snapshot restored':'Backup restored'); } }catch(e){}
})();
