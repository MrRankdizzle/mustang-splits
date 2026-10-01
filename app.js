/* Mustang Splits: cross country pace board. See CLAUDE.md before editing. */
(function(){
'use strict';
const APP_VERSION='2.3.0'; // keep in sync with version.json
const MAX=30, KEY='mustang-splits:v1'; // never rename KEY: it holds the coach's saved rosters, workouts and times
const EFFORTS=[['fast','Fast'],['tempo','Tempo'],['cv','CV'],['race','Race pace'],['easy','Easy'],['jog','Jog / float']];
const EFF=Object.fromEntries(EFFORTS);
const MODES=[['total','Total time for this part'],['per400','Per 400m'],['permile','Per mile'],['perkm','Per km']];
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
function newWatch(name,workoutId){ return {id:uid(),name:name,workoutId:workoutId||null,status:'idle',startAt:0,pausedT:0,run:freshRun(),athleteIds:[],athleteNames:[],autoName:null}; }
function seg(effort,dist,mode,value,cp){ return {id:uid(),effort,dist,mode,value,cp}; }
function defaults(){
  const w1={id:uid(),name:'800 @ 2:24 (400 splits)',reps:1,rest:'',segments:[seg('race',800,'total','2:24',400)]};
  const w2={id:uid(),name:'200 fast / 800 tempo / 200 fast',reps:1,rest:'',segments:[seg('fast',200,'total','0:32',0),seg('tempo',800,'total','3:12',200),seg('fast',200,'total','0:32',0)]};
  const w3={id:uid(),name:'CV 5 × 1000m, 90s rest',reps:5,rest:'1:30',segments:[seg('cv',1000,'per400','1:28',200)]};
  return {v:1,settings:{tol:1,compact:false,sound:true,wake:false,liveLog:true},workouts:[w1,w2,w3],roster:[],
    watches:[newWatch('Athlete 1',w1.id),newWatch('Group A',w2.id),newWatch('Group B',null)]};
}
// Brings saved data (from localStorage or a backup file) up to the current shape; null if it isn't ours.
function migrate(s){
  try{
    if(!s||!Array.isArray(s.watches)||!Array.isArray(s.workouts)) return null;
    s.settings=Object.assign({tol:1,compact:false,sound:true,wake:false,liveLog:true},s.settings||{}); // liveLog added in 1.1.0: on for existing saves
    if(!Array.isArray(s.roster)) s.roster=[]; // team roster added in 1.2.0
    s.watches.forEach(w=>{
      if(!w.run) w.run=freshRun(); if(!w.run.laps) w.run.laps=[]; if(!w.run.splits) w.run.splits=[];
      if(!Array.isArray(w.athleteIds)) w.athleteIds=[]; if(!Array.isArray(w.athleteNames)) w.athleteNames=[]; if(w.autoName===undefined) w.autoName=null;
      // 2.0.1: started stopwatches carry their own plan copy. Saves from before get one from the current workout.
      if(w.plan===undefined) w.plan=(w.status!=='idle' && w.workoutId) ? planCopy(s.workouts.find(x=>x.id===w.workoutId)) : null;
    });
    if(s.race===undefined) s.race=null; // Race Mode (2.2.0)
    return s;
  }catch(e){ return null; }
}
function load(){
  try{ const raw=localStorage.getItem(KEY); return raw?migrate(JSON.parse(raw)):null; }catch(e){ return null; }
}
const LOADED=load(); // null on a brand-new phone (shows the quick tour)
let S=LOADED||defaults();
let saveTimer=null;
let SYNC=null; // team sync API from sync.js; null means local-only (see the team sync bridge section)
function saveNow(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} }
function save(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ saveNow(); if(SYNC) SYNC.localChanged(); },200); }
window.addEventListener('pagehide',saveNow);
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') saveNow(); });

/* ---------- workouts ---------- */
function segSeconds(s){
  const v=parseTime(s.value), D=+s.dist; if(v==null||!(D>0)) return null;
  switch(s.mode){ case 'per400': return v*D/400; case 'permile': return v*D/1609.34; case 'perkm': return v*D/1000; default: return v; }
}
function compile(wk){
  const segs=[],cps=[]; let d=0,t=0;
  for(const s of (wk.segments||[])){
    const D=+s.dist, T=segSeconds(s);
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
  return {ok:segs.length>0,segs,cps,repDist:d,repTime:t,reps,rest,name:wk.name};
}
let CC={};
// A started stopwatch runs on the plan copy it saved at Start (w.plan) until it's reset or cleared,
// so workout edits (local, or from another coach) and app reloads never change a run in progress.
function planCopy(wk){ return wk ? JSON.parse(JSON.stringify(compile(wk))) : null; }
function planOf(w){
  if(w.status!=='idle' && w.plan!==undefined) return (w.plan && w.plan.ok) ? w.plan : null;
  if(!w.workoutId) return null;
  const wk=S.workouts.find(x=>x.id===w.workoutId); if(!wk) return null;
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
const el=w=> w.status==='running' ? Date.now()-w.startAt : (w.pausedT||0);

/* ---------- audio / haptics / wake ---------- */
let AC=null;
function audioInit(){
  try{
    if(!AC){ const C=window.AudioContext||window.webkitAudioContext; if(C) AC=new C(); }
    if(AC&&AC.state==='suspended') AC.resume();
  }catch(e){}
}
function beep(f,d){
  if(!S.settings.sound||!AC) return;
  try{
    const o=AC.createOscillator(), g=AC.createGain(), n=AC.currentTime;
    o.type='sine'; o.frequency.value=f||880;
    g.gain.setValueAtTime(0.0001,n); g.gain.exponentialRampToValueAtTime(0.35,n+0.01); g.gain.exponentialRampToValueAtTime(0.0001,n+(d||0.15));
    o.connect(g); g.connect(AC.destination); o.start(n); o.stop(n+(d||0.15)+0.03);
  }catch(e){}
}
function buzz(p){ try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
let wakeLock=null, wakeMsg='While the app is open';
async function applyWake(){
  const on=S.settings.wake || (curTab==='race' && !!S.race && S.race.status==='running'); // a running race keeps the screen on
  try{
    if(on && !wakeLock && navigator.wakeLock){ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{wakeLock=null;}); }
    if(!on && wakeLock){ await wakeLock.release(); wakeLock=null; }
    wakeMsg= on ? (wakeLock?'Screen will stay on':'Not supported on this device') : 'While the app is open';
  }catch(e){ wakeMsg='This device blocked it'; }
  const h=$('#wakeHint'); if(h) h.textContent=wakeMsg;
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&S.settings.wake&&!wakeLock) applyWake(); });

/* ---------- toast + modal ---------- */
let toastT=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true,2600); }
function modal(html,onMount){
  const ov=$('#overlay'), m=$('#modal'); m.className='modal'; m.innerHTML=html; ov.hidden=false;
  const sn=$('#snack'); if(sn) sn.hidden=true; // an Undo bar must never sit over a sheet's buttons
  const close=()=>{ ov.hidden=true; m.innerHTML=''; };
  ov.onclick=e=>{ if(e.target===ov) close(); };
  if(onMount) onMount(m,close);
  const f=m.querySelector('textarea,button.primary'); // don't pop the phone keyboard for number fields if(f) setTimeout(()=>f.focus(),30);
  return close;
}
function confirmBox(msg,okLabel,detail){
  return new Promise(res=>{
    modal(`<h2>${esc(msg)}</h2>${detail?`<p>${esc(detail)}</p>`:''}<div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">${esc(okLabel||'OK')}</button></div>`,(m,close)=>{
      m.querySelector('[data-x=no]').onclick=()=>{close();res(false);};
      m.querySelector('[data-x=yes]').onclick=()=>{close();res(true);};
    });
  });
}
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
function cardHTML(w){
  const P=planOf(w), run=w.run;
  const phase=!P?'free':(w.status==='idle'?'idle':run.phase);
  const locked=(w.status==='running'||w.status==='paused');
  const wkMissing=w.workoutId && !P;
  // One big button changes with the state; everything else lives in the ⋯ menu (cardMenu).
  let h=`<div class="w-head"><button class="w-name" data-act="rename" aria-label="Rename ${esc(w.name||'stopwatch')}">${esc(w.name||'Unnamed')}</button><button class="icon-btn more-btn" data-act="menu" aria-label="More for ${esc(w.name||'stopwatch')}">⋯</button></div>`;
  h+=membersHTML(w);
  h+=`<div class="w-plan-txt">${P?esc(P.name||'Workout'):(wkMissing?'':'No workout (just a stopwatch)')}</div>`;
  if(wkMissing) h+=`<div class="plan-note">This workout needs a distance and target time. Fix it on the Workouts tab.</div>`;
  h+=`<div class="clock"><div class="big" data-r="big">0:00.0</div><div class="sub" data-r="sub"></div></div>`;
  if(P){
    if(P.reps>1){
      h+=`<div class="reps" title="Reps">`+Array.from({length:P.reps},(_,i)=>{
        const c=(i<run.rep||(run.phase==='done'&&i<=run.rep)||(run.phase==='rest'&&i===run.rep))?'done':(i===run.rep&&w.status!=='idle'?'cur':'');
        return `<span class="dot ${c}"></span>`;}).join('')+`</div>`;
    }
    h+=laneHTML(P);
    const last=run.splits[run.splits.length-1];
    h+=`<div class="pace-row">`;
    if(last){
      const c=cls(last.delta);
      h+=`<span class="pill ${c}"><span class="lbl">${P.reps>1?'Rep '+(last.rep+1)+', ':''}${esc(fmtDist(last.d))} in ${fmtSec(last.act,2)}</span><span class="d">${fmtDelta(last.delta)}</span><span>${WORD[c]}</span></span>`;
      if(last.lapExp && Math.abs(last.lapExp-last.exp)>0.01){
        const lc=cls(last.lap-last.lapExp);
        h+=`<span class="pill ${lc}" title="Just the last section"><span class="lbl">Last ${fmtDist(last.lapD)}</span><span class="d">${fmtSec(last.lap,2)}</span></span>`;
      }
    } else if(w.status==='idle'){
      h+=`<span class="pill goal"><span class="lbl">Goal</span><span class="d">${fmtSec(P.repTime)}</span><span class="lbl">for ${fmtDist(P.repDist)}${P.reps>1?', '+P.reps+' reps':''}</span></span>`;
    }
    h+=`</div><div class="next" data-r="next"></div>`;
  }
  // controls
  h+=`<div class="controls">`;
  const canUndo = P ? run.splits.length>0 : run.laps.length>0;
  if(w.status==='idle'){
    h+=`<button class="btn go big-btn" data-act="start">Start</button>`;
  } else if(w.status==='running'){
    if(!P){ h+=`<button class="btn split big-btn" data-act="split">Lap</button>`; }
    else if(run.phase==='run'){
      const cp=P.cps[run.cp];
      h+=`<button class="btn split big-btn" data-act="split">${cp?'Tap at '+fmtDist(cp.d):'Tap'}</button>`;
    } else if(run.phase==='rest'){
      h+=`<button class="btn go big-btn" data-act="gonow">Start next rep now</button>`;
    }
  } else { // stopped or finished: a calm status, not a button (Keep timing / Start over are in ⋯)
    h+=`<div class="big-status">✓ ${w.status==='done'?'Done':'Stopped'} · <span class="num">${fmtClock(el(w))}</span></div>`;
  }
  if(canUndo && w.status!=='idle') h+=`<button class="btn undo" data-act="undo" aria-label="Undo last tap" title="Undo last tap">↶</button>`;
  h+=`</div>`;
  // log
  const n=P?run.splits.length:run.laps.length;
  if(!n) delete SHUT[w.id]; // a new run opens the list again at its first lap
  if(n){
    const live=!!S.settings.liveLog, open=live?!SHUT[w.id]:OPEN[w.id];
    h+=`<details class="log"${open?' open':''}><summary>${P?'Splits':'Laps'} (${n})</summary><div class="tbl-wrap">${P?splitTable(P,run,live):lapTable(run,live)}</div></details>`;
  }
  return {html:h,phase};
}
// newest: latest row on top. Columns marked c-x are hidden on cards in compact view.
function membersHTML(w){
  // Shown only when it adds something (a group, or a card renamed away from its runner). Change runners is in ⋯.
  const names=w.athleteNames.filter(Boolean);
  if(!w.athleteIds.length || (names.length===1 && names[0]===w.name)) return '';
  const txt=esc(names.join(', '));
  return w.status==='idle' ? `<button class="members" data-act="members" aria-label="Change runners on ${esc(w.name)}: ${txt}">${txt} <span class="edit">Edit</span></button>` : `<div class="members">${txt}</div>`;
}
function splitTable(P,run,newest){
  let rows='', rep=-1;
  (newest?run.splits.slice().reverse():run.splits).forEach(s=>{
    if(P.reps>1 && s.rep!==rep){ rep=s.rep; rows+=`<tr class="rep-row"><td colspan="5">Rep ${rep+1}</td></tr>`; }
    const c=cls(s.delta);
    rows+=`<tr><td>${fmtDist(s.d)}</td><td class="c-x">${fmtSec(s.exp)}</td><td>${fmtSec(s.act,2)}</td><td class="c-x">${fmtSec(s.lap,2)}</td><td class="${c}">${fmtDelta(s.delta)}</td></tr>`;
  });
  return `<table><thead><tr><th>Mark</th><th class="c-x">Goal</th><th>Time</th><th class="c-x">Split</th><th>vs goal</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function lapTable(run,newest){
  let prev=0;
  const rows=run.laps.map((t,i)=>{const r=`<tr><td>${i+1}</td><td>${fmtClock(t-prev)}</td><td class="c-x">${fmtClock(t)}</td></tr>`; prev=t; return r;});
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
  node.className=`watch st-${w.status} ph-${phase}`;
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
    let sub = w.status==='idle' ? 'Ready to start' : (run.laps.length? `Lap ${run.laps.length+1}<br> <b class="num">${fmtClock(t-lastLap)}</b>` : (w.status==='paused'?'Stopped':'Running'));
    setText(node,'sub',R.sub,sub,true);
    return;
  }
  if(w.status==='idle'){
    setText(node,'big',R.big,'0:00.0');
    setText(node,'sub',R.sub,'Ready to start',true);
    setLeft(node,'ghost',R.ghost,0); setLeft(node,'runner',R.runner,0); setLeft(node,'fill',R.fill,0);
    const cp=P.cps[0];
    setText(node,'next',R.next,`First tap: <b>${esc(markLabel(P,cp,0))}</b> at <b class="num">${fmtSec(cp.t)}</b>`,true);
    return;
  }
  if(run.phase==='done'){
    setText(node,'big',R.big,fmtClock(t));
    setText(node,'sub',R.sub,'Done',true);
    setLeft(node,'ghost',R.ghost,100); setLeft(node,'runner',R.runner,100); setLeft(node,'fill',R.fill,100);
    const tot=run.splits.filter(s=>{const c=P.cps[s.cpi];return c&&c.end&&s.cpi===P.cps.length-1;});
    setText(node,'next',R.next,tot.length?`Finished ${P.reps>1?tot.length+' reps':'the run'}. Totals are in the log below.`:'',true);
    return;
  }
  if(run.phase==='rest'){
    const left=run.restEndT-t;
    setText(node,'big',R.big,fmtClock(Math.max(0,left)+99));
    setText(node,'sub',R.sub,`Rest<br> Rep ${run.rep+2} of ${P.reps} starts at 0:00`,true);
    setLeft(node,'ghost',R.ghost,100); setLeft(node,'runner',R.runner,100); setLeft(node,'fill',R.fill,100);
    setText(node,'next',R.next,w.status==='paused'?'Paused during rest':`The next rep starts by itself when rest reaches 0:00`,true);
    return;
  }
  // running a rep
  const repMs=t-run.repStartT, repSec=repMs/1000;
  setText(node,'big',R.big,fmtClock(repMs));
  setText(node,'sub',R.sub,(P.reps>1?`Rep ${run.rep+1} of ${P.reps}<br> Total <b class="num">${fmtClock(t)}</b>`:`Goal <b class="num">${fmtSec(P.repTime)}</b><br> for ${fmtDist(P.repDist)}`),true);
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
      nextHTML=`Next: <b>${fmtDist(cp.d)}</b>${chip} at <b class="num">${fmtSec(cp.t)}</b> (in <b class="num">${fmtSec(remain,0)}</b>)`;
    } else {
      const over=-remain; live=Math.max(live,over);
      const oc=cls(over);
      nextHTML=`<b>${fmtDist(cp.d)}</b>${chip} was due at <b class="num">${fmtSec(cp.t)}</b> · <span class="over ${oc==='bad'?'bad':''}">${over.toFixed(1)} s late</span>`;
    }
  }
  setText(node,'next',R.next,nextHTML,true);
  const rc='runner '+(last||live>0?cls(live):'');
  if(node._cache.rc!==rc){ node._cache.rc=rc; R.runner.className=rc; }
}

/* ---------- actions ---------- */
function pushHist(w){ (HIST[w.id]=HIST[w.id]||[]).push(JSON.stringify(w.run)); if(HIST[w.id].length>80) HIST[w.id].shift(); }
const ACT={
  start(w){ w.status='running'; w.startAt=Date.now(); w.pausedT=0; w.run=freshRun(); w.plan=w.workoutId?planCopy(S.workouts.find(x=>x.id===w.workoutId)):null; HIST[w.id]=[]; buzz(40); },
  stop(w){ w.pausedT=el(w); w.status='paused'; },
  resume(w){ w.startAt=Date.now()-(w.pausedT||0); w.status='running'; },
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
  async del(w){
    const busy=w.status!=='idle' || w.run.splits.length || w.run.laps.length;
    if(busy && !(await confirmBox(`Remove ${w.name||'this stopwatch'}? Its times will be lost.`,'Remove'))) return;
    S.watches=S.watches.filter(x=>x!==w);
    const node=cardEls[w.id]; if(node) node.remove(); delete cardEls[w.id];
    updateToolbar(); save(); if(!S.watches.length) renderGrid();
  }
};
grid.addEventListener('click',async e=>{
  const ch=e.target.closest('[data-new]'); if(ch){ newChoice(ch.dataset.new); return; } // empty-state cards
  const b=e.target.closest('[data-act]'); if(!b) return;
  const card=b.closest('.watch'); if(!card) return; const w=S.watches.find(x=>x.id===card.dataset.id); if(!w) return;
  audioInit();
  const a=b.dataset.act;
  if(a==='members'){ if(w.status==='idle') openBench({watch:w}); return; }
  if(a==='menu'){ cardMenu(w); return; }
  if(a==='rename'){ renameSheet(w); return; }
  // Stop anywhere outside a menu needs two taps so a stray thumb never freezes a live clock.
  // (Inside the ⋯ menu it's one tap: opening the menu is the safeguard.)
  if(a==='stop' && !(ARM[w.id] && Date.now()-ARM[w.id]<2500)){
    ARM[w.id]=Date.now(); b.textContent='Tap again to stop'; b.classList.add('armed'); buzz(20);
    setTimeout(()=>{ if(ARM[w.id] && Date.now()-ARM[w.id]>=2400){ delete ARM[w.id]; renderCard(w); } },2500);
    return;
  }
  delete ARM[w.id];
  await runAct(w,a);
});
async function runAct(w,a){
  if(a==='reset' && (w.run.splits.length||w.run.laps.length) && !(await confirmBox(`Start ${w.name||'this stopwatch'} over?`,'Start over','Its times will be cleared.'))) return;
  await ACT[a](w);
  if(a!=='del'){ renderCard(w); updateToolbar(); save(); }
}
grid.addEventListener('input',e=>{
  const t=e.target; if(t.dataset.actInput!=='name') return;
  const w=S.watches.find(x=>x.id===t.closest('.watch').dataset.id); if(!w) return;
  w.name=t.value; save();
});
grid.addEventListener('change',e=>{
  const t=e.target; if(t.dataset.actInput!=='plan') return;
  const w=S.watches.find(x=>x.id===t.closest('.watch').dataset.id); if(!w) return;
  w.workoutId=t.value||null; if(w.status==='done'){ ACT.reset(w); } w.run=freshRun();
  renderCard(w); save();
});

function renderGrid(){
  grid.innerHTML=''; for(const k in cardEls) delete cardEls[k];
  if(!S.watches.length){
    grid.innerHTML=`<div class="empty-start"><h2>Time your runners</h2>${choicesHTML()}</div>`;
  }
  S.watches.forEach(renderCard);
  updateToolbar();
}
// Start all / Stop all only appear when there are 2+ to start or stop.
function updateToolbar(){
  const idle=S.watches.filter(w=>w.status==='idle').length, run=S.watches.filter(w=>w.status==='running').length;
  const sa=$('#startAll'), so=$('#stopAll');
  sa.hidden=idle<2; so.hidden=run<2;
  sa.textContent=`Start all ${idle} waiting`; so.textContent=`Stop all ${run} running`;
  $('#bulkRow').hidden=idle<2 && run<2;
}

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
  S.watches.push(w); audioInit(); ACT.start(w);
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
  if(canUndo && st!=='idle') items.push(['undo','Undo last tap','']);
  if(st==='idle'){ items.push(['plan','Change workout',P?'Now: '+(P.name||'Workout'):'Now: no workout']); if(S.roster.length) items.push(['members','Change runners','']); }
  items.push(['rename','Rename','']);
  if(st!=='running') items.push(['del','Remove stopwatch','']);
  modal(`<div class="menu-sheet">${sheetHead(esc(w.name||'Stopwatch'))}<div class="menu-list">${items.map(([k,l,h])=>`<button type="button" class="menu-item${k==='del'||k==='stop'?' warn':''}" data-m="${k}">${l}${h?`<small>${esc(h)}</small>`:''}</button>`).join('')}</div></div>`,(box,close)=>{
    const m=box.firstElementChild; m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-m]').forEach(b=>b.onclick=async()=>{
      const k=b.dataset.m; close();
      if(k==='plan') return planSheet(w);
      if(k==='members') return openBench({watch:w});
      if(k==='rename') return renameSheet(w);
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
      w.workoutId=b.dataset.wk||null; if(w.status==='done'){ ACT.reset(w); } w.run=freshRun();
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
$('#helpBtn').onclick=helpSheet;
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
function openWorkoutFlow(o){
  o=o||{};
  const held=heldBy(null), sel=new Set(), people=S.roster.filter(a=>a.name.trim()), groups=groupsOf(people);
  let step=1, wkId=o.workoutId!==undefined?o.workoutId:undefined, mode='each';
  modal(`<div class="flow"></div>`,(box,close)=>{
    box.classList.add('wide');
    const m=box.firstElementChild;
    const draw=()=>{
      const room=MAX-S.watches.length;
      if(step===1){
        const chip=a=>{ const hw=held[a.id]; return `<button type="button" class="chip-a${hw?' busy':''}" data-a="${a.id}" aria-pressed="${sel.has(a.id)}"${hw?' aria-disabled="true"':''}><span class="nm">${esc(a.name)}</span>${hw?`<small>on ${esc(hw.name||'a stopwatch')}</small>`:''}</button>`; };
        m.innerHTML=`${sheetHead('Who’s running?')}<p class="race-sec">Step 1 of 2. Tap names, or a group name for the whole group.</p>
          ${people.length?`<div class="bench">${groups.map(([g,as],gi)=>`<section class="bench-grp"><button type="button" class="bench-gh" data-gi="${gi}">${esc(g||'No group')} <span class="n">${as.filter(a=>!held[a.id]).length} free</span></button><div class="chips">${as.map(chip).join('')}</div></section>`).join('')}</div>`
            :`<div class="empty">No runners on your team yet. Add them once on the Team tab.</div><button type="button" class="btn" data-x="team">Add runners on the Team tab</button>`}
          ${room<1?`<p class="form-err">The limit is ${MAX} stopwatches. Clear finished ones in Settings first.</p>`:''}
          <button type="button" class="btn primary flow-next" data-x="next" ${room<1?'disabled':''}>${sel.size?`Next (${sel.size} picked)`:'Skip: one stopwatch, no names'}</button>`;
      } else {
        const opts=[[null,'No workout, just stopwatches'],...S.workouts.map(k=>[k.id,k.name||'Untitled workout'])];
        m.innerHTML=`${sheetHead('Which workout?')}<p class="race-sec">Step 2 of 2. <button type="button" class="linkish" data-x="back">← Back to runners</button></p>
          <div class="menu-list">${opts.map(([id,l])=>`<button type="button" class="menu-item" data-wk="${id||''}" aria-pressed="${wkId!==undefined&&(wkId||'')===(id||'')}">${wkId!==undefined&&(wkId||'')===(id||'')?'✓ ':''}${esc(l)}</button>`).join('')}</div>
          ${sel.size>1?`<div class="seg2" role="group" aria-label="Stopwatches"><button type="button" data-mode="each" aria-pressed="${mode==='each'}">One stopwatch each</button><button type="button" data-mode="group" aria-pressed="${mode==='group'}">One for the group</button></div>`:''}
          ${mode==='each'&&sel.size>room?`<p class="hint">Room for ${room} more: ${sel.size-room} won't get their own.</p>`:''}
          <div class="btn-row"><button type="button" class="btn go" data-x="startnow" ${wkId===undefined?'disabled':''}>Start now</button><button type="button" class="btn" data-x="later" ${wkId===undefined?'disabled':''}>Set up, start later</button></div>`;
      }
    };
    const create=startNow=>{
      const room=MAX-S.watches.length, list=people.filter(a=>sel.has(a.id)), made=[];
      if(!list.length){ const w=newWatch(nextRunnerName(),wkId||null); w.autoName=w.name; made.push(w); }
      else if(mode==='group' && list.length>1){ const w=newWatch('',wkId||null); link(w,list); w.name=w.autoName; made.push(w); }
      else list.slice(0,room).forEach(a=>{ const w=newWatch('',wkId||null); link(w,[a]); w.name=w.autoName; made.push(w); });
      S.watches.push(...made);
      if(startNow){ audioInit(); const now=Date.now(); made.forEach(w=>{ ACT.start(w); w.startAt=now; }); } // same instant for all
      close(); if(curTab!=='watches') showTab('watches'); else renderGrid(); save();
      const left=mode==='group'?0:list.length-Math.min(list.length,room);
      toast(`${startNow?'Started':'Added'} ${made.length} stopwatch${made.length===1?'':'es'}${left?`. ${left} didn't fit (limit ${MAX}).`:''}`);
    };
    m.addEventListener('click',e=>{
      const t=e.target;
      const c=t.closest('[data-a]');
      if(c){ const id=c.dataset.a, hw=held[id]; if(hw){ toast(`${people.find(a=>a.id===id).name} is on ${hw.name||'another stopwatch'}`); return; }
        if(sel.has(id)) sel.delete(id); else sel.add(id); draw(); return; }
      const gh=t.closest('[data-gi]');
      if(gh){ const free=groups[+gh.dataset.gi][1].filter(a=>!held[a.id]), all=free.length&&free.every(a=>sel.has(a.id));
        free.forEach(a=>{ if(all) sel.delete(a.id); else sel.add(a.id); }); draw(); return; }
      const wk=t.closest('[data-wk]'); if(wk){ wkId=wk.dataset.wk||null; draw(); return; }
      const md=t.closest('[data-mode]'); if(md){ mode=md.dataset.mode; draw(); return; }
      const x=t.closest('[data-x]'); if(!x) return;
      const k=x.dataset.x;
      if(k==='no') close();
      if(k==='team'){ close(); showTab('team'); }
      if(k==='next'){ step=2; draw(); }
      if(k==='back'){ step=1; draw(); }
      if(k==='startnow') create(true);
      if(k==='later') create(false);
    });
    draw();
  });
}
$('#startAll').onclick=()=>{
  audioInit(); const now=Date.now(); let n=0;
  S.watches.forEach(w=>{ if(w.status==='idle'){ ACT.start(w); w.startAt=now; n++; renderCard(w);} });
  updateToolbar(); save(); if(n) toast(`Started ${n} stopwatch${n===1?'':'es'} together`);
};
$('#stopAll').onclick=async()=>{
  const now=Date.now();
  if(!(await confirmBox('Stop every running stopwatch at this moment?','Stop all'))) return;
  S.watches.forEach(w=>{ if(w.status==='running'){ w.pausedT=now-w.startAt; w.status='paused'; renderCard(w);} });
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
    (team?'Results are saved to Team history on the Results tab. ':'Copy your results first: their times will be gone. ')+
    'Everyone on them goes back to the bench. Running stopwatches and stopped workouts stay.'))) return;
  const rec=historyRecord(gone);
  const saved=team && rec.watches.length>0 && SYNC.saveHistory(rec); // queued; never waits on the network
  S.watches=S.watches.filter(w=>!clearable(w));
  renderGrid(); save(); toast(`Cleared ${n} stopwatch${n===1?'':'es'}${saved?'. Results saved to Team history.':''}`);
}
async function resetAll(){
  if(!(await confirmBox('Clear all times?','Clear all times','Every stopwatch goes back to Start.'))) return;
  S.watches.forEach(w=>{ ACT.reset(w); }); renderGrid(); save(); toast('All stopwatches reset');
}
function assignAll(id){
  let n=0,skip=0;
  S.watches.forEach(w=>{ if(w.status==='idle'||w.status==='done'){ w.workoutId=id||null; ACT.reset(w); n++; } else skip++; });
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
  const groups=groupsOf(people);
  const chip=a=>{ const hw=held[a.id];
    return `<button type="button" class="chip-a${hw?' busy':''}" data-a="${a.id}" aria-pressed="${sel.has(a.id)}"${hw?' aria-disabled="true"':''}><span class="nm">${esc(a.name)}</span>${hw?`<small>on ${esc(hw.name||'a stopwatch')}</small>`:''}</button>`; };
  const list=people.length ? `<div class="bench">${groups.map(([g,as],gi)=>`<section class="bench-grp"><button type="button" class="bench-gh" data-gi="${gi}">${esc(g||'No group')} <span class="n">${as.filter(a=>!held[a.id]).length} free</span></button><div class="chips">${as.map(chip).join('')}</div></section>`).join('')}</div>`
    : `<div class="empty">No runners on the team yet. Add them once on the Team tab and they stay for every practice.</div><button class="btn primary" data-x="team">Open the Team tab</button>`;
  const foot=!people.length ? '' : W
    ? `<div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="save">Save runners</button></div>`
    : `<div class="bench-foot"><label class="field">Workout<select id="benchWk">${planOptions(o.workoutId||null)}</select></label>
       <div class="btn-row"><button class="btn primary" data-x="each">One stopwatch each</button><button class="btn" data-x="group">One stopwatch for the group</button></div><p class="hint" data-r="room"></p></div>`;
  modal(`<div class="bench-sheet"><div class="sheet-head"><h2>${W?'Runners on '+esc(W.name||'this stopwatch'):'Pick runners'}</h2><button class="icon-btn" data-x="no" aria-label="Close">×</button></div>
    ${people.length?`<p>Tap runners to select them. Tap a group name for the whole group.</p>`:''}${list}${foot}</div>`,(box,close)=>{
    box.classList.add('wide');
    const m=box.firstElementChild; // listen on fresh content: #modal itself is reused by every sheet
    const picks=()=>people.filter(a=>sel.has(a.id));
    const sync=()=>{
      if(W||!people.length) return;
      const n=sel.size, room=MAX-S.watches.length;
      m.querySelector('[data-x=each]').textContent=`One stopwatch each${n?` (${n})`:''}`;
      m.querySelector('[data-x=each]').disabled=!n||!room;
      m.querySelector('[data-x=group]').disabled=!n||!room;
      m.querySelector('[data-r=room]').textContent= !room ? `The track is full (${MAX} stopwatches). Clear it in Settings first.`
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
function renderTeam(){
  const L=$('#teamList'), n=S.roster.length;
  $('#teamCount').textContent=`${n} runner${n===1?'':'s'}`;
  $('#grpList').innerHTML=groupsOf(S.roster).map(([g])=>g).filter(Boolean).map(g=>`<option value="${esc(g)}">`).join('');
  const hint=syncMode()!=='local'?`<p class="team-hint">Shared with <b>${esc(SYNC.info().teamName)}</b>. New names are saved as first name and last initial; edit a name here to override it.</p>`:'';
  if(!n){ L.innerHTML=hint+`<div class="empty">No runners yet. Add your team once and they stay here for every practice. Then tap + New, then Workout, on the Stopwatches tab.</div>`; return; }
  L.innerHTML=hint+groupsOf(S.roster).map(([g,as])=>`<section class="team-grp" data-g="${esc(g)}">
    <button type="button" class="team-gh" data-t="rengrp" aria-label="Rename ${esc(g||'No group')}"><span class="g">${esc(g||'No group')}</span><span class="n">${as.length}</span><span class="ren">Rename</span></button>
    ${as.map(a=>`<div class="ath" data-id="${a.id}"><input data-af="name" value="${esc(a.name)}" maxlength="30" aria-label="Name" placeholder="Name" autocomplete="off" autocapitalize="words"><input data-af="group" value="${esc(a.group||'')}" list="grpList" maxlength="30" aria-label="Group for ${esc(a.name)}" placeholder="Group" autocomplete="off"><button class="icon-btn" data-t="del" aria-label="Remove ${esc(a.name)}">×</button></div>`).join('')}
  </section>`).join('');
}
let teamDirty=false;
const athOf=t=>S.roster.find(a=>a.id===t.closest('.ath').dataset.id);
$('#teamList').addEventListener('input',e=>{
  const t=e.target, a=t.dataset.af&&athOf(t); if(!a) return;
  a[t.dataset.af]=t.dataset.af==='name'?t.value.trim():t.value;
  if(t.dataset.af==='group') teamDirty=true;
  refreshIdle(); save();
});
$('#teamList').addEventListener('change',e=>{
  const t=e.target, a=t.dataset.af&&athOf(t); if(!a) return;
  if(t.dataset.af==='name' && !t.value.trim()){ t.value=t.defaultValue; a.name=t.value.trim(); refreshIdle(); save(); }
  if(t.dataset.af==='group'){ a.group=t.value.trim(); t.value=a.group; }
});
// regroup only after leaving the list, so tapping from field to field keeps the keyboard up
$('#teamList').addEventListener('focusout',e=>{
  if(!teamDirty || (e.relatedTarget && $('#teamList').contains(e.relatedTarget))) return;
  teamDirty=false; setTimeout(renderTeam,0);
});
$('#teamList').addEventListener('click',async e=>{
  const b=e.target.closest('[data-t]'); if(!b) return;
  if(b.dataset.t==='del'){
    const a=athOf(b); if(!a) return;
    if(!(await confirmBox(`Remove ${a.name||'this runner'} from the team?`,'Remove','Stopwatches already set up keep their names and times.'))) return;
    S.roster=S.roster.filter(x=>x!==a); renderTeam(); save();
  }
  if(b.dataset.t==='rengrp'){
    const g=b.closest('.team-grp').dataset.g, n=S.roster.filter(a=>grpOf(a)===g).length;
    modal(`<h2>${g?'Rename '+esc(g):'Put everyone without a group into a group'}</h2><p>${n} runner${n===1?'':'s'}. Waiting stopwatches named after this group follow the new name.</p>
      <label class="field">Group name<input id="grpName" value="${esc(g)}" maxlength="30" list="grpList" autocomplete="off" autocapitalize="words"></label>
      <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Save</button></div>`,(m,close)=>{
      m.querySelector('[data-x=no]').onclick=close;
      m.querySelector('[data-x=yes]').onclick=()=>{
        const nv=m.querySelector('#grpName').value.trim();
        S.roster.forEach(a=>{ if(grpOf(a)===g) a.group=nv; });
        refreshIdle(); close(); renderTeam(); save();
      };
    });
  }
});
$('#addAth').onclick=()=>{
  const last=S.roster[S.roster.length-1];
  modal(`<h2>Add runner</h2>
    <label class="field">Name<input id="athName" maxlength="30" autocomplete="off" autocapitalize="words"></label>${syncMode()!=='local'?`<p>Saved as first name and last initial. You can change it on the Team tab.</p>`:''}
    <label class="field">Group (optional)<input id="athGrp" maxlength="30" list="grpList" value="${esc(last?grpOf(last):'')}" placeholder="e.g. Varsity" autocomplete="off" autocapitalize="words"></label>
    <div class="modal-btns"><button class="btn" data-x="no">Done</button><button class="btn" data-x="more">Add another</button><button class="btn primary" data-x="yes">Add</button></div>`,(m,close)=>{
    const nm=m.querySelector('#athName'), gp=m.querySelector('#athGrp');
    const add=()=>{ const n=(syncMode()!=='local'?shortName(nm.value):nm.value.trim()).slice(0,30); if(!n){ nm.focus(); return ''; } S.roster.push({id:uid(),name:n,group:gp.value.trim()}); renderTeam(); save(); return n; };
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{ if(add()) close(); };
    m.querySelector('[data-x=more]').onclick=()=>{ const n=add(); if(n){ toast(`Added ${n}`); nm.value=''; nm.focus(); } };
    setTimeout(()=>nm.focus(),30);
  });
};
$('#pasteAth').onclick=()=>{
  modal(`<h2>Paste a list</h2><p>One runner per line. Add a group after a comma, like <b>Maya Lopez, Varsity</b>.</p>
    <textarea id="pasteTxt" placeholder="Maya Lopez, Varsity&#10;Jonah Kim, Varsity&#10;Sam Ortiz, JV"></textarea>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Add runners</button></div>`,(m,close)=>{
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelector('[data-x=yes]').onclick=()=>{
      const key=(n,g)=>n.toLowerCase()+'\n'+g.toLowerCase();
      const seen=new Set(S.roster.map(a=>key(a.name,grpOf(a))));
      let added=0, skipped=0;
      m.querySelector('#pasteTxt').value.split(/\r?\n/).forEach(line=>{
        const i=line.search(/[,\t]/);
        const raw=(i<0?line:line.slice(0,i)).trim(), name=(syncMode()!=='local'?shortName(raw):raw).slice(0,30), group=(i<0?'':line.slice(i+1)).trim().slice(0,30);
        if(!name) return;
        if(seen.has(key(name,group))){ skipped++; return; }
        seen.add(key(name,group)); S.roster.push({id:uid(),name,group}); added++;
      });
      close(); renderTeam(); save();
      toast(`Added ${added} runner${added===1?'':'s'}${skipped?`, skipped ${skipped} already on the team`:''}`);
    };
  });
};

/* ---------- settings sheet ---------- */
document.body.classList.toggle('compact',!!S.settings.compact);
function openSettings(){
  const sw=(id,on)=>`<input type="checkbox" class="switch" id="${id}"${on?' checked':''}>`;
  modal(`<h2>Settings</h2>
    <label class="set-row"><span>How close counts as on pace (seconds)<span class="hint">Within this many seconds of the plan shows green</span></span><input type="number" id="tol" min="0.1" max="10" step="0.1" inputmode="decimal" value="${esc(S.settings.tol)}"></label>
    <label class="set-row"><span>Smaller cards<span class="hint">Two stopwatches per row on a phone</span></span>${sw('compact',S.settings.compact)}</label>
    <label class="set-row"><span>Show times as they come in<span class="hint">Each card's lap list opens at the first lap, newest on top</span></span>${sw('liveLog',S.settings.liveLog)}</label>
    <label class="set-row"><span>Beep before each rep<span class="hint">Counts down the end of rest. The silent switch mutes these.</span></span>${sw('sound',S.settings.sound)}</label>
    <label class="set-row"><span>Keep screen on<span class="hint" id="wakeHint">${esc(wakeMsg)}</span></span>${sw('wake',S.settings.wake)}</label>
    <div class="sheet-sec" id="teamSec">${teamSecHTML()}</div>
    <div class="sheet-sec">
      <label class="field">Give every waiting stopwatch this workout<select id="assignAll"><option value="__">Choose a workout…</option>${planOptions(null,true)}</select></label>
      <div class="btn-row"><button class="btn warn" id="clearTrack">Clear finished stopwatches</button><button class="btn warn" id="resetAll">Clear all times</button></div>
    </div>
    <div class="sheet-sec">
      <span class="set-row"><span>Backup<span class="hint">Save your team, workouts and times to Files or send them to yourself. Restore replaces everything on this phone.</span></span></span>
      <div class="btn-row"><button class="btn" id="backup">Back up</button><button class="btn" id="restore">Restore</button></div>
    </div>
    <div class="sheet-sec">
      <button class="btn" id="showTour">Show the quick tour</button>
      <p class="ver">Mustang Splits version ${APP_VERSION}</p>
      <button class="btn" id="checkUpd">Check for updates</button>
    </div>
    <div class="modal-btns"><button class="btn primary" data-x="done">Done</button></div>`,(m,close)=>{
    m.querySelector('[data-x=done]').onclick=close;
    m.querySelector('#tol').oninput=e=>{ const v=parseFloat(e.target.value); if(v>0){ S.settings.tol=v; save(); S.watches.forEach(renderCard);} };
    m.querySelector('#compact').onchange=e=>{ S.settings.compact=e.target.checked; document.body.classList.toggle('compact',S.settings.compact); save(); };
    m.querySelector('#liveLog').onchange=e=>{ S.settings.liveLog=e.target.checked; save(); S.watches.forEach(renderCard); };
    m.querySelector('#sound').onchange=e=>{ S.settings.sound=e.target.checked; audioInit(); if(S.settings.sound) beep(880,0.12); save(); };
    m.querySelector('#wake').onchange=e=>{ S.settings.wake=e.target.checked; save(); applyWake(); };
    m.querySelector('#assignAll').onchange=e=>{ const id=e.target.value; if(id==='__') return; close(); assignAll(id); };
    m.querySelector('#resetAll').onclick=()=>{ close(); resetAll(); };
    m.querySelector('#clearTrack').onclick=()=>{ close(); clearTrack(); };
    m.querySelector('#checkUpd').onclick=()=>{ checkVersion(true); };
    m.querySelector('#showTour').onclick=()=>{ close(); showTour(0); };
    m.querySelector('#backup').onclick=()=>{ backup(); };
    m.querySelector('#restore').onclick=()=>{ $('#restoreFile').click(); };
    bindTeamSec(m,close);
  });
}

/* ---------- backup + restore ---------- */
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
async function backup(){
  saveNow();
  const d=new Date(), data={app:'mustang-splits',version:APP_VERSION,savedAt:d.toISOString(),state:S};
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
  const n=(k,a,pl)=>`${a.length} ${a.length===1?k:(pl||k+'s')}`;
  if(!(await confirmBox('Replace everything on this phone with this backup?','Restore',
    `Backup from ${when}: ${n('runner',s.roster)}, ${n('workout',s.workouts)}, ${n('stopwatch',s.watches,'stopwatches')}. `+
    `Your current team, workouts, stopwatches and times will be replaced.${running?` ${running} running or paused stopwatch${running===1?' is':'es are'} included in that.`:''}${syncMode()!=='local'?' The team\u2019s shared lists are not changed; next you choose whether to add these to the team.':''} Back up first if you're not sure.`))) return;
  S=s; saveNow();
  if(SYNC) SYNC.markRestored(); // in a team: asks "add mine / use the team's" after the reload instead of overwriting the team
  try{ sessionStorage.setItem('mustang-splits:restored','1'); }catch(err){}
  location.reload();
});
$('#openSettings').onclick=openSettings;

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

/* ---------- workouts view ---------- */
let editingId=null;
function describe(wk,P){
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
  const L=$('#wkList');
  if(!S.workouts.length){ L.innerHTML=`<div class="empty">No workouts yet. Build one to pace a runner or group.</div>`; return; }
  L.innerHTML=S.workouts.map(wk=>{
    const P=compile(wk);
    return `<div class="wk${wk.id===editingId?' sel':''}" data-id="${wk.id}">
      <div class="wk-name">${esc(wk.name||'Untitled workout')}</div>
      <div class="wk-sum">${esc(describe(wk,P))}</div>${miniBar(P)}
      <div class="wk-btns"><button class="btn" data-w="send">Use this workout</button><button class="btn" data-w="edit">Edit</button><button class="btn" data-w="dup">Duplicate</button><button class="btn warn" data-w="del">Delete</button></div></div>`;
  }).join('');
}
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
    if(tfUnit(t)==='mss'){ if(TF_OK.test(v)) return; v=microwave(v.replace(/\D/g,'')); }
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
    const v=parseTime(t.value), n=tfUnit(t)==='mss'?fmtMss(v):fmtSecs(v);
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
    <div class="field tf-field"><label for="tf-${s.id||i}">Time</label>${timeField({id:'tf-'+(s.id||i),attrs:'data-sf="value"',value:s.value,unit:s.timeUnit,ph:segPh(s.mode),label:'Time'})}</div>
    <label class="field">Tap points<select data-sf="cp">${cps}</select></label>
    <div class="seg-btns"><button class="btn" data-w="up" ${i===0?'disabled':''} aria-label="Move up">↑</button><button class="btn" data-w="down" ${i===n-1?'disabled':''} aria-label="Move down">↓</button><button class="btn warn" data-w="rmseg" ${n===1?'disabled':''} aria-label="Remove section">×</button></div>
    <div class="seg-calc" data-calc></div></div>`;
}
function segCalc(s){
  const T=segSeconds(s), D=+s.dist;
  if(!(D>0)) return {err:true,html:'Add a distance in meters.'};
  if(!(T>0)) return {err:true,html:'Add a target time like 1:12 or 72.'};
  return {err:false,html:`${fmtDist(D)} in <b class="num">${fmtSec(T)}</b>, which is <b class="num">${fmtSec(T*400/D)}</b> per 400m and <b class="num">${fmtSec(T*1609.34/D,0)}</b> per mile`};
}
function renderEditor(){
  const box=$('#wkEditor'); const wk=S.workouts.find(x=>x.id===editingId);
  if(!wk){ box.innerHTML=`<div class="empty">Pick a workout to edit, or create a new one. A workout can be one steady effort, a mix like fast, tempo, fast, or repeats with rest.</div>`; return; }
  box.innerHTML=`<section class="editor" data-id="${wk.id}">
    <div class="ed-head"><h2>Edit workout</h2><button class="btn primary" data-w="close">Done</button></div>
    <label class="field">Workout name<input data-wf="name" value="${esc(wk.name)}" maxlength="60" placeholder="e.g. CV 6 × 800m"></label>
    <div class="ed-row">
      <label class="field">How many times<input data-wf="reps" type="number" min="1" max="50" value="${esc(wk.reps)}"></label>
      <div class="field tf-field"><label for="tf-rest-${wk.id}">Rest between</label>${timeField({id:'tf-rest-'+wk.id,attrs:'data-wf="rest"',value:wk.rest,unit:wk.restUnit,ph:{mss:'1:30',sec:'90'},label:'Rest'})}</div>
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
  if(b.dataset.w==='send'){ if(S.watches.length>=MAX){ toast(`The track is full (${MAX} stopwatches). Clear it in Settings first.`); return; } openWorkoutFlow({workoutId:id}); }
  if(b.dataset.w==='edit'){ editingId=id; renderWkList(); renderEditor(); if(innerWidth<900) $('#wkEditor').scrollIntoView({behavior:'smooth'}); }
  if(b.dataset.w==='dup'){
    const c=JSON.parse(JSON.stringify(wk)); c.id=uid(); c.name=wk.name+' (copy)'; c.segments.forEach(s=>s.id=uid());
    S.workouts.splice(S.workouts.indexOf(wk)+1,0,c); editingId=c.id; renderWkList(); renderEditor(); save();
  }
  if(b.dataset.w==='del'){
    const used=S.watches.filter(w=>w.workoutId===id);
    if(used.some(w=>w.status==='running'||w.status==='paused')){ toast('That workout is in use on a running stopwatch. Reset it first.'); return; }
    if(!(await confirmBox(`Delete "${wk.name}"?${used.length?` ${used.length} stopwatch${used.length===1?'':'es'} will switch to stopwatch only.`:''}`,'Delete'))) return;
    S.workouts=S.workouts.filter(x=>x!==wk); used.forEach(w=>{w.workoutId=null; ACT.reset(w);});
    delete CC[id]; if(editingId===id) editingId=null; renderWkList(); renderEditor(); save();
  }
});
$('#wkEditor').addEventListener('input',e=>{
  const ed=e.target.closest('.editor'); if(!ed) return; const wk=S.workouts.find(x=>x.id===ed.dataset.id); if(!wk) return;
  const t=e.target;
  if(t.dataset.wf){ wk[t.dataset.wf]= t.dataset.wf==='reps' ? t.value : t.value; wkChanged(wk); return; }
  if(t.dataset.sf){
    const i=+t.closest('.seg').dataset.i, s=wk.segments[i];
    s[t.dataset.sf]= (t.dataset.sf==='dist'||t.dataset.sf==='cp') ? (t.value===''?'':+t.value) : t.value;
    if(t.dataset.sf==='mode'){ const v=t.closest('.seg').querySelector('[data-sf=value]'), ph=segPh(s.mode); v.dataset.phMss=ph.mss; v.dataset.phSec=ph.sec; v.placeholder=ph[tfUnit(v)]; }
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
function resultsData(){
  return S.watches.map(w=>{
    const P=planOf(w);
    return {w,P,has:P?w.run.splits.length>0:w.run.laps.length>0};
  }).filter(x=>x.has);
}
function renderResults(){
  renderHistory();
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
$('#copyRes').onclick=async()=>{
  const ta=$('#resText'); if(!ta.value){ toast('Nothing to copy yet'); return; }
  try{ await navigator.clipboard.writeText(ta.value); toast('Results copied'); return; }catch(e){}
  try{ ta.focus(); ta.select(); if(document.execCommand('copy')){ toast('Results copied'); return; } }catch(e){}
  ta.focus(); ta.select(); toast('Text is selected. Copy it from your keyboard or menu.');
};
$('#dlRes').onclick=async()=>{
  const data=resultsData(); if(!data.length){ toast('Nothing to export yet'); return; }
  const name=`xc-splits-${new Date().toISOString().slice(0,10)}.csv`;
  await shareFile(new File([resultsCSV(data)],name,{type:'text/csv'}),'XC splits');
};
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
const RACE_DISTS=[['', 'No distance'],[MILE,'1 mile'],[2*MILE,'2 miles'],[3*MILE,'3 miles'],[1000,'1K'],[2000,'2K'],[3000,'3K'],[4000,'4K'],[5000,'5K'],[6000,'6K'],[8000,'8K'],[10000,'10K']];
let activeRaces=[];       // other coaches' setup/running races (team mode), from sync.js
let raceSel=new Set();    // setup: picked athlete ids are S.race.runners; this mirrors them for chips
let selMark=null;         // running: an unassigned mark picked for assigning
let raceResOpen=true;
function newRace(){
  return {id:uid(),name:'',status:'setup',createdAt:Date.now(),gun:null,
    checkpoints:[{id:uid(),name:'Mile 1',dist:MILE},{id:uid(),name:'Mile 2',dist:2*MILE},{id:uid(),name:'Finish',dist:5000}],
    runners:[],marks:[]};
}
const raceSecs=(r,m)=>(srv(m)-srv(r.gun))/1000;
const curCp=()=>{ const r=S.race; return (r && r.checkpoints.find(c=>c.id===S.settings.raceCp)) || (r && r.checkpoints[0]) || null; };
function ord(n){ const s=['th','st','nd','rd'], v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); }
const fmtRace=sec=>fmtSec(sec,2);

// The race as a plain table model (also what Team history stores): official time = earliest mark.
function raceModel(r){
  return {name:r.name||'', checkpoints:r.checkpoints.map(c=>({name:c.name,dist:c.dist||null})),
    rows:r.runners.map(rn=>({id:rn.id,name:rn.name,group:rn.group||'',goal:rn.goal||null,cells:r.checkpoints.map(c=>{
      if(!r.gun) return null;
      const ts=r.marks.filter(m=>m.runnerId===rn.id&&m.cp===c.id).map(m=>raceSecs(r,m)).sort((a,b)=>a-b);
      return ts.length?{t:Math.round(ts[0]*10)/10,dup:ts.length>1}:null;
    })}))};
}
// Goal compare: even-pace target at this distance; within 1% is on pace, over 3% is well behind.
function goalClass(delta,target){ const w=target*0.01; if(Math.abs(delta)<=w) return 'ok'; if(delta<0) return 'fast'; return delta>w*3?'bad':'slow'; }
function raceTable(M,editable){
  const cps=M.checkpoints, fin=([...cps].reverse().find(c=>c.dist)||{}).dist||null;
  const places=cps.map((c,ci)=>{ const ts=M.rows.map(r=>r.cells[ci]&&r.cells[ci].t).filter(t=>t!=null).sort((a,b)=>a-b); return t=>ts.indexOf(t)+1; });
  const rows=M.rows.map((r,ri)=>({r,ri,n:r.cells.filter(Boolean).length,last:(()=>{ for(let i=r.cells.length-1;i>=0;i--) if(r.cells[i]) return r.cells[i].t; return Infinity; })()}))
    .sort((a,b)=>b.n-a.n||a.last-b.last);
  const body=rows.map(({r,ri})=>{
    let prevT=0, prevD=0;
    const tds=cps.map((c,ci)=>{
      const cell=r.cells[ci];
      if(!cell) return `<td class="rc"${editable?` data-rc="${ri}:${ci}"`:''}>–</td>`;
      const bits=[ord(places[ci](cell.t))];
      if(c.dist && c.dist>prevD) bits.push(fmtSec((cell.t-prevT)/((c.dist-prevD)/MILE),0)+'/mi');
      let gd='';
      if(r.goal && c.dist && fin){ const target=r.goal*c.dist/fin, d=cell.t-target; gd=` <span class="gd ${goalClass(d,target)}">${fmtDelta(d)}</span>`; }
      if(c.dist){ prevT=cell.t; prevD=c.dist; }
      return `<td class="rc"${editable?` data-rc="${ri}:${ci}"`:''}>${cell.dup?'<span class="dup" title="Two times recorded">⚠ </span>':''}${fmtRace(cell.t)}<span class="sub2">${bits.join(' · ')}${gd}</span></td>`;
    }).join('');
    return `<tr><td>${esc(r.name)}${r.goal?`<span class="sub2">Goal ${fmtSec(r.goal,0)}</span>`:''}</td>${tds}</tr>`;
  }).join('');
  return `<div class="tbl-wrap"><table class="race-table"><thead><tr><th>Runner</th>${cps.map(c=>`<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function raceText(M){
  let out=`${M.name||'Race'}\n`;
  M.rows.forEach(r=>{ out+=`\n${r.name}${r.goal?' (goal '+fmtSec(r.goal,0)+')':''}\n`;
    M.checkpoints.forEach((c,ci)=>{ const x=r.cells[ci]; out+=`  ${c.name.padEnd(10)} ${x?fmtRace(x.t)+(x.dup?' (two times recorded)':''):'–'}\n`; }); });
  return out;
}
function raceCSV(M){
  const q=v=>`"${String(v==null?'':v).replace(/"/g,'""')}"`, fin=([...M.checkpoints].reverse().find(c=>c.dist)||{}).dist||null;
  const head=['Runner','Group','Goal']; M.checkpoints.forEach(c=>head.push(c.name,c.name+' place',c.name+' pace/mi',c.name+' vs goal (s)'));
  const places=M.checkpoints.map((c,ci)=>{ const ts=M.rows.map(r=>r.cells[ci]&&r.cells[ci].t).filter(t=>t!=null).sort((a,b)=>a-b); return t=>ts.indexOf(t)+1; });
  const lines=[head.map(q).join(',')];
  M.rows.forEach(r=>{ let pT=0,pD=0; const row=[r.name,r.group,r.goal?fmtSec(r.goal,0):''];
    M.checkpoints.forEach((c,ci)=>{ const x=r.cells[ci]; if(!x){ row.push('','','',''); return; }
      const pace=(c.dist&&c.dist>pD)?fmtSec((x.t-pT)/((c.dist-pD)/MILE),0):''; const gd=(r.goal&&c.dist&&fin)?(x.t-r.goal*c.dist/fin).toFixed(1):'';
      row.push(fmtRace(x.t),places[ci](x.t),pace,gd); if(c.dist){ pT=x.t; pD=c.dist; } });
    lines.push(row.map(q).join(',')); });
  return lines.join('\n');
}
function raceHistory(r){ return {kind:'race',date:localDate(new Date(r.gun?r.gun.local:Date.now())),savedAtMs:Date.now(),watches:[],race:raceModel(r)}; }

// Tappable toast with an action (the plain toast ignores taps on purpose).
let snackT=null;
function snack(msg,label,fn,ms){
  const s=$('#snack'); $('#snackText').textContent=msg; const b=$('#snackBtn'); b.textContent=label||'Undo';
  b.onclick=()=>{ s.hidden=true; clearTimeout(snackT); fn(); };
  s.hidden=false; clearTimeout(snackT); snackT=setTimeout(()=>{ s.hidden=true; },ms||5000);
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
  if(S.race && S.race.status==='done' && syncMode()!=='joined' && S.race.marks.length &&
    !(await confirmBox('Start a new race?','New race','The last race’s results will be cleared from this phone. Copy them first if you need them.'))) return;
  S.race=newRace(); selMark=null; save(); showTab('race');
}
$('#raceBannerOpen').onclick=()=>{ if(S.race && S.race.status!=='done') showTab('race'); else raceEntry(); };
function updateRaceBanner(){
  const mine=S.race && S.race.status!=='done', other=activeRaces.find(x=>!S.race||x.id!==S.race.id);
  $('#raceBanner').hidden=!(mine||other);
  if(mine) $('#raceBannerText').textContent=`Race ${S.race.status==='running'?'running':'being set up'}: ${S.race.name||'Unnamed race'}`;
  else if(other) $('#raceBannerText').textContent=`A coach has a race ${other.status==='running'?'running':'set up'}: ${other.name||'Unnamed race'}`;
}
$('#raceClose').onclick=()=>showTab('watches');

// Screen
function renderRace(){
  const r=S.race; if(!r) return;
  $('#raceName').textContent=r.name||'Race';
  $('#raceState').textContent={setup:'Set up, then Gun',running:'Clock running',done:'Finished'}[r.status];
  const B=$('#raceBody');
  if(r.status==='setup') B.innerHTML=raceSetupHTML(r);
  else B.innerHTML=raceRunHTML(r);
  updateRaceClock(true);
}
function raceSetupHTML(r){
  const picked=new Set(r.runners.map(x=>x.id));
  const people=S.roster.filter(a=>a.name.trim()), groups=groupsOf(people);
  const chips=people.length?groups.map(([g,as],gi)=>`<section class="bench-grp"><button type="button" class="bench-gh" data-rg="${gi}">${esc(g||'No group')} <span class="n">${as.filter(a=>picked.has(a.id)).length}/${as.length}</span></button><div class="chips">${as.map(a=>`<button type="button" class="chip-a" data-rr="${a.id}" aria-pressed="${picked.has(a.id)}"><span class="nm">${esc(a.name)}</span></button>`).join('')}</div></section>`).join('')
    :`<div class="empty">No runners yet. Add them on the Team tab, then come back.</div>`;
  const goals=r.runners.map(x=>`<div class="goal-row"><span>${esc(x.name)}</span>${timeField({id:'goal-'+x.id,attrs:`data-goal="${x.id}"`,value:x.goal?fmtSec(x.goal,0):'',unit:'mss',ph:{mss:'e.g. 19:30',sec:'e.g. 1170'},label:'Goal for '+x.name})}</div>`).join('');
  const cpRows=r.checkpoints.map((c,i)=>`<div class="race-cp" data-cpid="${c.id}"><input data-cpn value="${esc(c.name)}" maxlength="20" aria-label="Checkpoint name"><select data-cpd aria-label="Distance">${RACE_DISTS.map(([v,l])=>`<option value="${v}"${(c.dist||'')==v||(c.dist&&Math.abs(c.dist-v)<1)?' selected':''}>${l}</option>`).join('')}</select><span class="btns"><button class="btn" data-cpmv="-1" ${i===0?'disabled':''} aria-label="Move up">↑</button><button class="btn warn" data-cprm ${r.checkpoints.length===1?'disabled':''} aria-label="Remove checkpoint">×</button></span></div>`).join('');
  return `<label class="field">Race name (optional)<input data-rname value="${esc(r.name)}" maxlength="60" placeholder="e.g. Bay Conference Invite" autocapitalize="words"></label>
    <h3>Runners <span class="n">${r.runners.length} picked. Tap names, or a group name for the whole group.</span></h3>${chips}
    ${r.runners.length?`<h3>Goal times <span class="n">optional, finish time</span></h3>${goals}`:''}
    <h3>Checkpoints</h3>${cpRows}<div><button class="btn" data-ra="addcp">+ Add checkpoint</button></div>
    <button class="btn go race-gun" data-ra="gun" ${r.runners.length?'':'disabled'}>Gun</button>
    <div class="race-actions"><button class="btn warn" data-ra="discard">Discard this race</button></div>`;
}
function raceRunHTML(r){
  const M=raceModel(r), res=`<details class="race-res"${raceResOpen?' open':''}><summary>Results</summary>${raceTable(M,true)}
    <div class="race-actions"><button class="btn" data-ra="copy">Copy results</button><button class="btn" data-ra="csv">Export CSV</button></div></details>`;
  if(r.status==='done') return res+`<div class="race-actions"><button class="btn primary" data-ra="new">New race</button></div>`;
  const cp=curCp(), at=`<div class="race-at"><span class="lbl">I'm at:</span>${r.checkpoints.map(c=>`<button type="button" data-at="${c.id}" aria-pressed="${c.id===cp.id}">${esc(c.name)}</button>`).join('')}</div>`;
  const timeAt=rid=>{ const ts=r.marks.filter(m=>m.runnerId===rid&&m.cp===cp.id).map(m=>raceSecs(r,m)).sort((a,b)=>a-b); return ts.length?ts[0]:null; };
  const waiting=r.runners.filter(x=>timeAt(x.id)==null), passed=r.runners.filter(x=>timeAt(x.id)!=null).sort((a,b)=>timeAt(a.id)-timeAt(b.id));
  const un=r.marks.filter(m=>!m.runnerId&&m.cp===cp.id).sort((a,b)=>srv(a)-srv(b));
  if(selMark && !un.some(m=>m.id===selMark)) selMark=null;
  const sync=syncMode()==='joined'&&CLOCK.off==null?`<p class="race-sec">Clock not synced with the other coaches yet (needs signal). Times on this phone are still correct.</p>`:'';
  return `${at}${sync}<button class="btn race-mark" data-ra="mark">Mark</button>
    <div class="mark-strip">${un.map(m=>`<button type="button" data-um="${m.id}" aria-pressed="${m.id===selMark}">${fmtRace(raceSecs(r,m))}</button>`).join('')}</div>
    ${selMark?`<p class="race-sec">Now tap the runner for that time.</p>`:''}
    <div class="race-grid">${waiting.map(x=>`<button type="button" data-rn="${x.id}">${esc(x.name)}${x.group?`<small>${esc(x.group)}</small>`:''}</button>`).join('')}</div>
    ${passed.length?`<p class="race-sec">Passed ${esc(cp.name)}</p><div class="race-grid passed">${passed.map(x=>`<button type="button" data-rp="${x.id}">${esc(x.name)}<span class="t">${fmtRace(timeAt(x.id))}</span></button>`).join('')}</div>`:''}
    <div class="race-actions">${r.marks.length?'':`<button class="btn" data-ra="restart">Restart clock</button>`}<button class="btn warn" data-ra="end">End race</button></div>${res}`;
}
// Clock display (its own frame loop, only while the race screen is open)
let lastClockTxt='';
function updateRaceClock(force){
  const r=S.race, el2=$('#raceClock');
  let txt='0:00.0';
  if(r && r.gun){ const end=r.status==='done'?Math.max(0,...r.marks.map(m=>srv(m))):nowSrv(); txt=fmtClock(r.status==='done'&&!r.marks.length?0:end-srv(r.gun)); }
  if(force||txt!==lastClockTxt){ el2.textContent=txt; lastClockTxt=txt; }
}
function raceFrame(){ if(curTab==='race') updateRaceClock(); requestAnimationFrame(raceFrame); }
requestAnimationFrame(raceFrame);

function addMark(runnerId){
  const r=S.race, cp=curCp(), m={id:uid(),cp:cp.id,local:Date.now(),off:CLOCK.off,runnerId:runnerId||null,by:DEVICE};
  r.marks.push(m); buzz(25); save(); renderRace();
  const who=runnerId?(r.runners.find(x=>x.id===runnerId)||{}).name:'Mark';
  snack(`${who}, ${fmtRace(raceSecs(r,m))} at ${cp.name}`,'Undo',()=>{ r.marks=r.marks.filter(x=>x.id!==m.id); save(); renderRace(); });
}
function cellModal(rid,cpid){
  const r=S.race, rn=r.runners.find(x=>x.id===rid), cp=r.checkpoints.find(c=>c.id===cpid); if(!rn||!cp||!r.gun) return;
  const ms=r.marks.filter(m=>m.runnerId===rid&&m.cp===cpid).sort((a,b)=>srv(a)-srv(b));
  const off=ms[0];
  modal(`<div class="cell-edit"><h2>${esc(rn.name)} at ${esc(cp.name)}</h2>
    ${ms.length>1?`<p>Two coaches recorded this. The earlier time counts.</p>`:''}
    ${ms.map((m,i)=>`<div class="set-row"><span>${fmtRace(raceSecs(r,m))}${i===0?' (counts)':''}<span class="hint">${m.by===DEVICE?'This phone':'Another coach'}</span></span><span class="race-actions">${ms.length>1&&i>0?`<button class="btn" data-keep="${m.id}">Keep this one</button>`:''}<button class="btn warn" data-clr="${m.id}">Clear</button></span></div>`).join('')}
    ${off?`<label class="field">Edit the time${timeField({id:'cellT',attrs:'data-cellt',value:fmtSec(raceSecs(r,off),2),unit:'mss',ph:{mss:'6:12',sec:'372.4'},label:'Time'})}</label>`:'<p>No time here yet.</p>'}
    <div class="modal-btns"><button class="btn" data-x="no">Close</button>${off?'<button class="btn primary" data-x="yes">Save time</button>':''}</div></div>`,(box,close)=>{
    const m=box.firstElementChild; bindTimeFields(m);
    m.querySelector('[data-x=no]').onclick=close;
    m.querySelectorAll('[data-clr]').forEach(b=>b.onclick=()=>{ r.marks=r.marks.filter(x=>x.id!==b.dataset.clr); save(); close(); renderRace(); toast('Time cleared'); });
    m.querySelectorAll('[data-keep]').forEach(b=>b.onclick=()=>{ r.marks=r.marks.filter(x=>!(x.runnerId===rid&&x.cp===cpid)||x.id===b.dataset.keep); save(); close(); renderRace(); });
    const yes=m.querySelector('[data-x=yes]');
    if(yes) yes.onclick=()=>{ const v=parseTime(m.querySelector('[data-cellt]').value); if(v==null){ toast('Enter a time like 6:12'); return; }
      off.local=Math.round(srv(r.gun)+v*1000-offOf(off)); save(); close(); renderRace(); toast(`${rn.name}: ${fmtRace(v)} at ${cp.name}`); };
  });
}
async function endRace(){
  const team=syncMode()==='joined';
  if(!(await confirmBox('End the race?','End race',team?'The results are saved to Team history, and every coach sees the final results.':'The results stay on this phone until you start a new race. Copy or export them.'))) return;
  const r=S.race; r.status='done'; save();
  if(team) SYNC.saveHistory(raceHistory(r));
  renderRace(); applyWake(); updateRaceBanner(); toast(team?'Race saved to Team history':'Race finished');
}
const raceView=$('#v-race');
raceView.addEventListener('click',async e=>{
  const r=S.race; if(!r) return; const t=e.target;
  const a=t.closest('[data-ra]');
  if(a){ const act=a.dataset.ra;
    if(act==='gun'){ if(!r.runners.length) return; r.gun={local:Date.now(),off:CLOCK.off,by:DEVICE}; r.status='running'; buzz([60]); audioInit(); beep(988,0.25); save(); renderRace(); applyWake(); updateRaceBanner();
      if(SYNC && syncMode()==='joined') SYNC.measureClock();
      snack('Gun! Clock running','Undo gun',()=>{ r.gun=null; r.status='setup'; save(); renderRace(); applyWake(); updateRaceBanner(); },10000); }
    if(act==='restart'){ const prev=r.gun; r.gun={local:Date.now(),off:CLOCK.off,by:DEVICE}; buzz([60]); save(); renderRace();
      snack('Clock restarted from now','Undo',()=>{ r.gun=prev; save(); renderRace(); },10000); }
    if(act==='mark') addMark(null);
    if(act==='end') endRace();
    if(act==='new'){ S.race=null; startNewRace(); }
    if(act==='discard'){ if(await confirmBox('Discard this race setup?','Discard')){ if(SYNC && syncMode()==='joined') SYNC.closeRace(r.id); S.race=null; save(); showTab('watches'); } }
    if(act==='addcp'){ r.checkpoints.push({id:uid(),name:'Checkpoint '+(r.checkpoints.length+1),dist:null}); save(); renderRace(); }
    if(act==='copy'){ const txt=raceText(raceModel(r)); try{ await navigator.clipboard.writeText(txt); toast('Results copied'); }catch(err){ modal(`<h2>Results</h2><textarea readonly>${esc(txt)}</textarea><div class="modal-btns"><button class="btn primary" data-x="no">Done</button></div>`,(m,close)=>{ m.querySelector('[data-x=no]').onclick=close; }); } }
    if(act==='csv'){ await shareFile(new File([raceCSV(raceModel(r))],`race-${(r.name||'results').replace(/[^\w-]+/g,'-').toLowerCase()}-${localDate(new Date())}.csv`,{type:'text/csv'}),'Race results'); }
    return; }
  const at=t.closest('[data-at]'); if(at){ S.settings.raceCp=at.dataset.at; selMark=null; save(); renderRace(); return; }
  const um=t.closest('[data-um]'); if(um){ selMark=selMark===um.dataset.um?null:um.dataset.um; renderRace(); return; }
  const rn=t.closest('[data-rn],[data-rp]');
  if(rn){ const id=rn.dataset.rn||rn.dataset.rp;
    if(selMark){ const m=r.marks.find(x=>x.id===selMark); selMark=null; if(m){ m.runnerId=id; save(); renderRace(); const who=r.runners.find(x=>x.id===id).name;
      snack(`${who}, ${fmtRace(raceSecs(r,m))} at ${curCp().name}`,'Undo',()=>{ m.runnerId=null; save(); renderRace(); }); } return; }
    if(rn.dataset.rp){ cellModal(id,curCp().id); return; }
    addMark(id); return; }
  const rc=t.closest('[data-rc]'); if(rc){ const [ri,ci]=rc.dataset.rc.split(':').map(Number); cellModal(r.runners[ri].id,r.checkpoints[ci].id); return; }
  // setup
  const rr=t.closest('[data-rr]');
  if(rr){ const a2=S.roster.find(x=>x.id===rr.dataset.rr); if(!a2) return;
    if(r.runners.some(x=>x.id===a2.id)) r.runners=r.runners.filter(x=>x.id!==a2.id); else r.runners.push({id:a2.id,name:a2.name,group:grpOf(a2),goal:null});
    save(); renderRace(); return; }
  const rg=t.closest('[data-rg]');
  if(rg){ const as=groupsOf(S.roster.filter(x=>x.name.trim()))[+rg.dataset.rg][1], all=as.every(x=>r.runners.some(y=>y.id===x.id));
    if(all) r.runners=r.runners.filter(x=>!as.some(y=>y.id===x.id)); else as.forEach(x=>{ if(!r.runners.some(y=>y.id===x.id)) r.runners.push({id:x.id,name:x.name,group:grpOf(x),goal:null}); });
    save(); renderRace(); return; }
  const mv=t.closest('[data-cpmv]'), rm=t.closest('[data-cprm]');
  if(mv||rm){ const i=r.checkpoints.findIndex(c=>c.id===t.closest('[data-cpid]').dataset.cpid);
    if(rm && r.checkpoints.length>1) r.checkpoints.splice(i,1);
    if(mv && i>0) r.checkpoints.splice(i-1,0,r.checkpoints.splice(i,1)[0]);
    save(); renderRace(); }
});
raceView.addEventListener('toggle',e=>{ if(e.target.classList&&e.target.classList.contains('race-res')) raceResOpen=e.target.open; },true);
bindTimeFields(raceView);
raceView.addEventListener('input',e=>{
  const r=S.race, t=e.target; if(!r) return;
  if(t.matches('[data-rname]')){ r.name=t.value.slice(0,60); $('#raceName').textContent=r.name||'Race'; save(); }
  if(t.matches('[data-cpn]')){ const c=r.checkpoints.find(x=>x.id===t.closest('[data-cpid]').dataset.cpid); if(c){ c.name=t.value.slice(0,20); save(); } }
  if(t.matches('[data-goal]')){ const x=r.runners.find(y=>y.id===t.dataset.goal); if(x){ x.goal=parseTime(t.value)||null; save(); } }
});
raceView.addEventListener('change',e=>{
  const r=S.race, t=e.target; if(!r) return;
  if(t.matches('[data-cpd]')){ const c=r.checkpoints.find(x=>x.id===t.closest('[data-cpid]').dataset.cpid); if(c){ c.dist=t.value?+t.value:null; save(); } }
});

/* ---------- tabs ---------- */
let curTab='watches';
function showTab(name){
  curTab=name;
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===name)));
  ['watches','workouts','team','results','race'].forEach(v=>$('#v-'+v).hidden=(v!==name));
  document.body.classList.toggle('race-open',name==='race');
  if(name==='race'){ renderRace(); if(SYNC && syncMode()==='joined') SYNC.measureClock(); }
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

let lastCheck=0;
async function checkVersion(force){
  if(!location.protocol.startsWith('http')){ if(force) toast('Updates are checked once the app is online'); return; }
  if(!force && Date.now()-lastCheck<5*60*1000) return;
  lastCheck=Date.now();
  try{
    const r=await fetch('version.json',{cache:'no-store'}); if(!r.ok) throw 0;
    const j=await r.json();
    if(j.version && j.version!==APP_VERSION){ $('#updText').textContent=`Version ${j.version} is ready.`; $('#updateBanner').hidden=false; }
    else if(force) toast(`You're on the latest version (${APP_VERSION})`);
  }catch(e){ if(force) toast("Couldn't check. Are you online?"); }
}
$('#doUpdate').onclick=async()=>{
  if(S.watches.some(w=>w.status==='running') && !(await confirmBox('Stopwatches are running. Update now? Running clocks are saved and keep going.','Update'))) return;
  saveNow();
  try{ const reg=await navigator.serviceWorker.getRegistration(); if(reg && reg.waiting) reg.waiting.postMessage('skipWaiting'); }catch(e){}
  location.reload();
};
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') checkVersion(false); });

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
  syncReady(api){ SYNC=api; syncInfo=api.info(); updateSyncUI(); if(syncInfo.pendingMerge) promptMerge(); },
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
  clockOffset(off,rtt){ // measured by sync.js; fills in this device's race events saved before any offset was known
    CLOCK={off,rtt,at:Date.now()}; try{ localStorage.setItem('mustang-splits:clock',JSON.stringify(CLOCK)); }catch(e){}
    const r=S.race; let fixed=false;
    if(r){ if(r.gun&&r.gun.by===DEVICE&&r.gun.off==null){ r.gun.off=off; fixed=true; }
      r.marks.forEach(m=>{ if(m.by===DEVICE&&m.off==null){ m.off=off; fixed=true; } }); }
    if(fixed) save();
    if(curTab==='race') renderRace();
  },
  raceElapsed:()=>S.race&&S.race.gun?nowSrv()-srv(S.race.gun):null, // for tests
  getWorkouts:()=>S.workouts,
  // ch: {athletes:{upsert:[],remove:[]}, workouts:{upsert:[],remove:[]}}. Returns ids it chose to skip.
  applyRemote(ch){
    const skipped=[]; // nothing is skipped now: started stopwatches use their own plan copy (planOf)
    ch.athletes.upsert.forEach(r=>{ const a=S.roster.find(x=>x.id===r.id); if(a){ a.name=r.name; a.group=r.group; } else S.roster.push({id:r.id,name:r.name,group:r.group}); });
    if(ch.athletes.remove.length){ const rm=new Set(ch.athletes.remove); S.roster=S.roster.filter(a=>!rm.has(a.id)); }
    ch.workouts.upsert.forEach(r=>{
      const w=S.workouts.find(x=>x.id===r.id);
      if(w) Object.assign(w,r); else S.workouts.push(r);
      delete CC[r.id];
    });
    ch.workouts.remove.forEach(id=>{
      S.workouts=S.workouts.filter(w=>w.id!==id); delete CC[id];
      if(editingId===id) editingId=null;
    });
    if(ch.marks && S.race){
      ch.marks.upsert.forEach(r=>{ const m=S.race.marks.find(x=>x.id===r.id); if(m) Object.assign(m,r); else S.race.marks.push(r); });
      if(ch.marks.remove.length){ const rm=new Set(ch.marks.remove); S.race.marks=S.race.marks.filter(m=>!rm.has(m.id)); }
      if(curTab==='race') renderRace();
    }
    refreshIdle(); saveNow(); rerenderAfterSync();
    return {skipped};
  },
  syncStatus(info){ syncInfo=info; updateSyncUI(); },
  teamHistory(list){ teamHistory=list||[]; if(curTab==='results') renderHistory(); },
  notify(msg){ toast(msg); }
};
// Redraw what's on screen without yanking a field someone is typing in.
function rerenderAfterSync(){
  const act=document.activeElement;
  if(curTab==='team'){ if($('#teamList').contains(act)) teamDirty=true; else renderTeam(); }
  if(curTab==='workouts'){ renderWkList(); if(!$('#wkEditor').contains(act)) renderEditor(); }
  if(curTab==='watches') S.watches.forEach(w=>{ if(w.status==='idle'||w.status==='done') renderCard(w); });
}
function updateSyncUI(){
  $('#openSettings').dataset.sync=(syncInfo.code==='waiting'||syncInfo.code==='error')?syncInfo.code:'';
  const st=$('#teamStatus'); if(st){ st.textContent=syncInfo.text; st.dataset.code=syncInfo.code; }
  if(syncInfo.mode==='local') teamHistory=[];
}

// Settings > Team
function teamSecHTML(){
  if(!SYNC){
    let joined=false; try{ joined=!!(JSON.parse(localStorage.getItem('mustang-splits:sync')||'{}')||{}).teamId; }catch(e){}
    return `<span class="set-row"><span>Team<span class="hint">${joined?'Team sync is starting. It needs signal the first time this version opens.':'Team sync loads with a connection. Everything else works offline.'}</span></span></span>`;
  }
  const i=syncInfo, name=esc(i.teamName||'your team');
  if(i.mode==='local') return `<span class="set-row"><span>Team<span class="hint">Share the roster, workouts and results history with your other coaches. Stopwatches stay on each phone.</span></span></span>
      <div class="btn-row"><button class="btn" id="tmCreate">Create a team</button><button class="btn primary" id="tmJoin">Join a team</button></div>`;
  if(i.mode==='out') return `<span class="set-row"><span>Team: <b>${name}</b><span class="hint sync-line" id="teamStatus" data-code="error">${esc(i.text)}</span></span></span>
      <div class="btn-row"><button class="btn primary" id="tmJoin">Enter new password</button><button class="btn warn" id="tmLeave">Leave team</button></div>`;
  const head=`<span class="set-row"><span>Team: <b>${name}</b>${i.isAdmin?' <span class="admin-badge">Admin</span>':''}<span class="hint sync-line" id="teamStatus" data-code="${i.code}">${esc(i.text)}</span></span></span>`;
  // Admin-only actions are also enforced by firestore.rules; hiding them here is just tidiness.
  if(i.isAdmin) return head+`
      <div class="btn-row"><button class="btn" id="tmPw">Change team password</button><button class="btn" id="tmAdminPw">Change admin passphrase</button></div>
      <div class="btn-row"><button class="btn" id="tmRename">Rename team</button><button class="btn" id="tmDropAdmin">Stop being admin on this device</button></div>
      <button class="btn warn" id="tmLeave">Leave team</button>`;
  if(!i.teamHasAdmin) return head+`<p class="hint">This team has no admin yet. The first coach to set an admin passphrase becomes admin and is the only one who can change the team password.</p>
      <div class="btn-row"><button class="btn primary" id="tmSetAdmin">Set admin passphrase</button><button class="btn warn" id="tmLeave">Leave team</button></div>`;
  return head+`<p class="hint">Ask your team admin to change the password.</p>
      <div class="btn-row"><button class="btn" id="tmBeAdmin">I'm the admin</button><button class="btn warn" id="tmLeave">Leave team</button></div>`;
}
function bindTeamSec(m,close){
  const on=(id,f)=>{ const b=m.querySelector(id); if(b) b.onclick=()=>{ close(); f(); }; };
  on('#tmCreate',()=>teamForm('create')); on('#tmJoin',()=>teamForm('join')); on('#tmPw',()=>teamForm('change'));
  on('#tmSetAdmin',()=>teamForm('setAdmin')); on('#tmBeAdmin',()=>teamForm('becomeAdmin')); on('#tmAdminPw',()=>teamForm('changeAdmin')); on('#tmRename',()=>teamForm('rename'));
  on('#tmDropAdmin',async()=>{
    if(!(await confirmBox('Stop being admin on this device?','Stop being admin','The team keeps its admin passphrase. Enter it again on this device anytime with "I\u2019m the admin".'))) return;
    try{ await SYNC.dropAdmin(); toast('This device is no longer admin'); }catch(e){ toast((e&&e.message)||'Something went wrong.'); }
  });
  on('#tmLeave',async()=>{
    if(!(await confirmBox(`Leave ${syncInfo.teamName||'the team'}?`,'Leave team','This phone keeps its copy of the roster and workouts and stops syncing. You can rejoin anytime with the team password.'))) return;
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
    <p>This phone has ${nA} runner${nA===1?'':'s'} and ${nW} workout${nW===1?'':'s'}. Adding them merges any that match what's already on the team, and saves names as first name and last initial (Maya Lopez becomes Maya L.).</p>
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
  const inUse=new Set(S.watches.filter(w=>w.status==='running'||w.status==='paused').map(w=>w.workoutId));
  const mapA={}, mapW={};
  if(how==='mine'){
    const k=a=>a.name.trim().toLowerCase()+'\n'+grpOf(a).toLowerCase();
    const rA=new Map(remote.athletes.map(a=>[k(a),a]));
    S.roster=S.roster.filter(a=>a.name.trim()).map(a=>({...a,name:shortName(a.name).slice(0,30)})).filter(a=>{ const m=rA.get(k(a)); if(m){ mapA[a.id]=m.id; return false; } return true; });
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
  // Bring the team's items in now so remapped stopwatches never see a missing workout.
  remote.athletes.forEach(a=>{ if(!S.roster.some(x=>x.id===a.id)) S.roster.push(a); });
  remote.workouts.forEach(w=>{ if(!S.workouts.some(x=>x.id===w.id)) S.workouts.push(w); });
  CC={}; editingId=null; refreshIdle(); saveNow();
  SYNC.start();
  rerenderAfterSync(); if(curTab==='watches') renderGrid();
}

// Results > Team history
function renderHistory(){
  const box=$('#histWrap'), L=$('#histList');
  box.hidden=syncMode()==='local';
  if(box.hidden) return;
  if(!teamHistory.length){ L.innerHTML=`<p class="count">Nothing yet. Clear track on the Stopwatches tab saves that day's results here.</p>`; return; }
  L.innerHTML=teamHistory.map(h=>{
    const d=new Date(h.savedAtMs||Date.parse(h.date+'T12:00'));
    const when=d.toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'})+', '+d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    if(h.kind==='race' && h.race){
      const M=h.race, n=(M.rows||[]).length;
      return `<details class="hist" data-id="${esc(h.id)}"><summary><span>${esc(when)} · ${esc(M.name||'Race')}</span><span class="n">Race, ${n} runner${n===1?'':'s'}</span></summary>
        <div class="res-card">${raceTable(M,false)}</div><button class="btn warn" data-hdel="${esc(h.id)}">Delete this entry</button></details>`;
    }
    const ws=h.watches||[];
    const cards=ws.map(w=>{
      const P={reps:w.reps||1};
      const tbl=(w.splits&&w.splits.length)?splitTable(P,{splits:w.splits}):lapTable({laps:w.laps||[]});
      return `<div class="res-card"><h3>${esc(w.name||'Unnamed')}</h3><div class="meta">${esc(w.workout||'No workout')}${w.total?', total '+fmtClock(w.total):''}</div>${(w.members||[]).length?`<div class="meta">Runners: ${esc(w.members.join(', '))}</div>`:''}<div class="tbl-wrap">${tbl}</div></div>`;
    }).join('');
    return `<details class="hist" data-id="${esc(h.id)}"><summary><span>${esc(when)}</span><span class="n">${ws.length} stopwatch${ws.length===1?'':'es'}</span></summary>
      <div class="res-grid">${cards}</div><button class="btn warn" data-hdel="${esc(h.id)}">Delete this entry</button></details>`;
  }).join('');
}
$('#histList').addEventListener('click',async e=>{
  const b=e.target.closest('[data-hdel]'); if(!b||!SYNC) return;
  if(!(await confirmBox('Delete this Team history entry?','Delete','It disappears for every coach on the team.'))) return;
  SYNC.deleteHistory(b.dataset.hdel); toast('Entry deleted');
});

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
document.addEventListener('focusin',e=>{
  const t=e.target;
  if(!t.matches || !t.matches('input,select,textarea') || NO_KB.test(t.type)) return;
  if(!window.matchMedia('(pointer: coarse)').matches) return; // phones and tablets only
  setTimeout(()=>{ if(document.activeElement===t && t.isConnected) t.scrollIntoView({block:'center'}); },300);
});

/* ---------- boot ---------- */
renderGrid(); updateRaceBanner();
try{ if(!localStorage.getItem(TOUR_KEY)){ if(LOADED) localStorage.setItem(TOUR_KEY,'1'); else setTimeout(()=>showTour(0),400); } }catch(e){} // existing phones skip it
if(S.settings.wake) applyWake();
requestAnimationFrame(tick);
setTimeout(()=>checkVersion(false),3000);
try{ if(sessionStorage.getItem('mustang-splits:restored')){ sessionStorage.removeItem('mustang-splits:restored'); toast('Backup restored'); } }catch(e){}
})();
