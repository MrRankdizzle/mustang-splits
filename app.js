/* Mustang Splits: cross country pace board. See CLAUDE.md before editing. */
(function(){
'use strict';
const APP_VERSION='2.1.0'; // keep in sync with version.json
const MAX=30, KEY='mustang-splits:v1'; // never rename KEY: it holds the coach's saved rosters, workouts and times
const EFFORTS=[['fast','Fast'],['tempo','Tempo'],['cv','CV'],['race','Race pace'],['easy','Easy'],['jog','Jog / float']];
const EFF=Object.fromEntries(EFFORTS);
const MODES=[['total','Section time'],['per400','Per 400m'],['permile','Per mile'],['perkm','Per km']];
const CPS=[[0,'Segment end only'],[100,'Every 100m'],[200,'Every 200m'],[300,'Every 300m'],[400,'Every 400m'],[500,'Every 500m'],[800,'Every 800m'],[1000,'Every 1000m'],[1609,'Every mile']];
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
const WORD={ok:'On pace',fast:'Fast',slow:'Slow',bad:'Slow'};

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
    return s;
  }catch(e){ return null; }
}
function load(){
  try{ const raw=localStorage.getItem(KEY); return raw?migrate(JSON.parse(raw)):null; }catch(e){ return null; }
}
let S=load()||defaults();
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
  const on=S.settings.wake;
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
  return (withNone!==false?`<option value="">Stopwatch only (no pace plan)</option>`:'')+
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
  let h=`<div class="w-head"><input class="w-name" data-act-input="name" value="${esc(w.name)}" maxlength="40" aria-label="Stopwatch name">${(w.status==='idle'||w.status==='done')?`<button class="icon-btn" data-act="del" aria-label="Remove ${esc(w.name)}" title="Remove">×</button>`:''}</div>`;
  h+=membersHTML(w);
  h+=`<select class="w-plan" data-act-input="plan" ${locked?'disabled title="Reset this stopwatch to change its workout"':''} aria-label="Workout for ${esc(w.name)}">${planOptions(w.workoutId)}</select>`;
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
    if(!P){ h+=`<button class="btn split big-btn" data-act="split">Lap</button><button class="btn" data-act="stop">Stop</button>`; }
    else if(run.phase==='run'){
      const cp=P.cps[run.cp];
      h+=`<button class="btn split big-btn" data-act="split"><span>Split</span>${cp?`<small>${fmtDist(cp.d)}</small>`:''}</button><button class="btn" data-act="stop">Stop</button>`;
    } else if(run.phase==='rest'){
      h+=`<button class="btn go big-btn" data-act="gonow">Go now</button><button class="btn" data-act="stop">Stop</button>`;
    }
    if(canUndo) h+=`<button class="btn undo" data-act="undo" aria-label="Undo last split" title="Undo last split">↶</button>`;
  } else if(w.status==='paused'){
    h+=`<button class="btn go big-btn" data-act="resume">Resume</button><button class="btn" data-act="reset">Reset</button>`;
    if(canUndo) h+=`<button class="btn undo" data-act="undo" aria-label="Undo last split" title="Undo last split">↶</button>`;
  } else if(w.status==='done'){
    h+=`<button class="btn big-btn" data-act="reset">Reset</button>`;
    if(canUndo) h+=`<button class="btn undo" data-act="undo" aria-label="Undo last split" title="Undo last split">↶</button>`;
  }
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
  const names=w.athleteNames.filter(Boolean).join(', ');
  if(w.athleteIds.length){
    return w.status==='idle' ? `<button class="members" data-act="members" aria-label="Change athletes on ${esc(w.name)}: ${esc(names)}">${esc(names)} <span class="edit">Edit</span></button>` : `<div class="members">${esc(names)}</div>`;
  }
  return (w.status==='idle' && S.roster.length) ? `<button class="members add" data-act="members">+ Add athletes</button>` : '';
}
function splitTable(P,run,newest){
  let rows='', rep=-1;
  (newest?run.splits.slice().reverse():run.splits).forEach(s=>{
    if(P.reps>1 && s.rep!==rep){ rep=s.rep; rows+=`<tr class="rep-row"><td colspan="5">Rep ${rep+1}</td></tr>`; }
    const c=cls(s.delta);
    rows+=`<tr><td>${fmtDist(s.d)}</td><td class="c-x">${fmtSec(s.exp)}</td><td>${fmtSec(s.act,2)}</td><td class="c-x">${fmtSec(s.lap,2)}</td><td class="${c}">${fmtDelta(s.delta)}</td></tr>`;
  });
  return `<table><thead><tr><th>Mark</th><th class="c-x">Target</th><th>Actual</th><th class="c-x">Section</th><th>Diff</th></tr></thead><tbody>${rows}</tbody></table>`;
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
    let sub = w.status==='idle' ? 'Ready' : (run.laps.length? `Lap ${run.laps.length+1}<br> <b class="num">${fmtClock(t-lastLap)}</b>` : (w.status==='paused'?'Stopped':'Running'));
    setText(node,'sub',R.sub,sub,true);
    return;
  }
  if(w.status==='idle'){
    setText(node,'big',R.big,'0:00.0');
    setText(node,'sub',R.sub,'Ready',true);
    setLeft(node,'ghost',R.ghost,0); setLeft(node,'runner',R.runner,0); setLeft(node,'fill',R.fill,0);
    const cp=P.cps[0];
    setText(node,'next',R.next,`First mark <b>${esc(markLabel(P,cp,0))}</b> at <b class="num">${fmtSec(cp.t)}</b>`,true);
    return;
  }
  if(run.phase==='done'){
    setText(node,'big',R.big,fmtClock(t));
    setText(node,'sub',R.sub,'Workout done',true);
    setLeft(node,'ghost',R.ghost,100); setLeft(node,'runner',R.runner,100); setLeft(node,'fill',R.fill,100);
    const tot=run.splits.filter(s=>{const c=P.cps[s.cpi];return c&&c.end&&s.cpi===P.cps.length-1;});
    setText(node,'next',R.next,tot.length?`Finished ${P.reps>1?tot.length+' reps':'the run'}. Totals are in the log below.`:'',true);
    return;
  }
  if(run.phase==='rest'){
    const left=run.restEndT-t;
    setText(node,'big',R.big,fmtClock(Math.max(0,left)+99));
    setText(node,'sub',R.sub,`Rest<br> Rep ${run.rep+2} of ${P.reps} next`,true);
    setLeft(node,'ghost',R.ghost,100); setLeft(node,'runner',R.runner,100); setLeft(node,'fill',R.fill,100);
    setText(node,'next',R.next,w.status==='paused'?'Paused during rest':`Next rep starts automatically when rest hits zero`,true);
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
      nextHTML=`Next <b>${fmtDist(cp.d)}</b>${chip} due at <b class="num">${fmtSec(cp.t)}</b>, in <b class="num">${fmtSec(remain,0)}</b>`;
    } else {
      const over=-remain; live=Math.max(live,over);
      const oc=cls(over);
      nextHTML=`Next <b>${fmtDist(cp.d)}</b>${chip} was due at <b class="num">${fmtSec(cp.t)}</b> <span class="over ${oc==='bad'?'bad':''}">${oc==='ok'?'':'late '}+${over.toFixed(1)}</span>`;
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
  const b=e.target.closest('[data-act]'); if(!b) return;
  const card=b.closest('.watch'); const w=S.watches.find(x=>x.id===card.dataset.id); if(!w) return;
  audioInit();
  const a=b.dataset.act;
  if(a==='members'){ if(w.status==='idle') openBench({watch:w}); return; }
  // Stop needs two taps so a stray thumb never freezes a live clock
  if(a==='stop' && !(ARM[w.id] && Date.now()-ARM[w.id]<2500)){
    ARM[w.id]=Date.now(); b.textContent='Tap again'; b.classList.add('armed'); buzz(20);
    setTimeout(()=>{ if(ARM[w.id] && Date.now()-ARM[w.id]>=2400){ delete ARM[w.id]; renderCard(w); } },2500);
    return;
  }
  delete ARM[w.id];
  if(a==='reset' && (w.run.splits.length||w.run.laps.length) && !(await confirmBox(`Reset ${w.name||'this stopwatch'}? Its times will be cleared.`,'Reset'))) return;
  await ACT[a](w);
  if(a!=='del'){ renderCard(w); updateToolbar(); save(); }
});
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
    grid.innerHTML=`<div class="empty">No stopwatches yet. Add one for each athlete or pace group, up to ${MAX}.</div>`;
  }
  S.watches.forEach(renderCard);
  updateToolbar();
}
function updateToolbar(){
  $('#count').textContent=`${S.watches.length} of ${MAX}`;
  $('#addWatch').disabled=S.watches.length>=MAX;
  $('#bench').disabled=S.watches.length>=MAX;
  $('#startAll').disabled=!S.watches.some(w=>w.status==='idle');
  $('#stopAll').disabled=!S.watches.some(w=>w.status==='running');
}

$('#addWatch').onclick=()=>{
  if(S.watches.length>=MAX) return;
  const e=grid.querySelector('.empty'); if(e) e.remove();
  const w=newWatch('Athlete '+(S.watches.length+1),null); w.autoName=w.name;
  S.watches.push(w); renderCard(w); updateToolbar(); save();
  const inp=cardEls[w.id].querySelector('.w-name'); inp.focus(); inp.select();
  cardEls[w.id].scrollIntoView({block:'nearest',behavior:'smooth'});
};
$('#bench').onclick=()=>openBench();
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
  if(!(await confirmBox(`Clear ${n} stopwatch${n===1?'':'es'}?`,'Clear track',
    (stopped.length?`Stopped and ${team?'saved':'cleared'}: ${stopped.join(', ')}. `:'')+
    (team?'Results are saved to Team history on the Results tab. ':'Copy your results first: their times will be gone. ')+
    'Everyone on them goes back to the bench. Running stopwatches and stopped workouts stay.'))) return;
  const rec=historyRecord(gone);
  const saved=team && rec.watches.length>0 && SYNC.saveHistory(rec); // queued; never waits on the network
  S.watches=S.watches.filter(w=>!clearable(w));
  renderGrid(); save(); toast(`Cleared ${n} stopwatch${n===1?'':'es'}${saved?'. Results saved to Team history.':''}`);
}
async function resetAll(){
  if(!(await confirmBox('Reset every stopwatch? All times will be cleared.','Reset all'))) return;
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
    : `<div class="empty">No athletes on the team yet. Add them once on the Team tab and they stay for every practice.</div><button class="btn primary" data-x="team">Open the Team tab</button>`;
  const foot=!people.length ? '' : W
    ? `<div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="save">Save members</button></div>`
    : `<div class="bench-foot"><label class="field">Workout<select id="benchWk">${planOptions(o.workoutId||null)}</select></label>
       <div class="btn-row"><button class="btn primary" data-x="each">One stopwatch each</button><button class="btn" data-x="group">One group stopwatch</button></div><p class="hint" data-r="room"></p></div>`;
  modal(`<div class="bench-sheet"><div class="sheet-head"><h2>${W?'Athletes on '+esc(W.name||'this stopwatch'):'Bench'}</h2><button class="icon-btn" data-x="no" aria-label="Close">×</button></div>
    ${people.length?`<p>Tap athletes to select them. Tap a group name for the whole group.</p>`:''}${list}${foot}</div>`,(box,close)=>{
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
          done(`Added ${w.name} with ${list.length} athlete${list.length===1?'':'s'}`);
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
  $('#teamCount').textContent=`${n} athlete${n===1?'':'s'}`;
  $('#grpList').innerHTML=groupsOf(S.roster).map(([g])=>g).filter(Boolean).map(g=>`<option value="${esc(g)}">`).join('');
  const hint=syncMode()!=='local'?`<p class="team-hint">Shared with <b>${esc(SYNC.info().teamName)}</b>. New names are saved as first name and last initial; edit a name here to override it.</p>`:'';
  if(!n){ L.innerHTML=hint+`<div class="empty">No athletes yet. Add your team once and they stay here for every practice. Then use Bench on the Stopwatches tab to put them on stopwatches.</div>`; return; }
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
    if(!(await confirmBox(`Remove ${a.name||'this athlete'} from the team?`,'Remove','Stopwatches already set up keep their names and times.'))) return;
    S.roster=S.roster.filter(x=>x!==a); renderTeam(); save();
  }
  if(b.dataset.t==='rengrp'){
    const g=b.closest('.team-grp').dataset.g, n=S.roster.filter(a=>grpOf(a)===g).length;
    modal(`<h2>${g?'Rename '+esc(g):'Put everyone without a group into a group'}</h2><p>${n} athlete${n===1?'':'s'}. Idle stopwatches named after this group follow the new name.</p>
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
  modal(`<h2>Add athlete</h2>
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
  modal(`<h2>Paste a list</h2><p>One athlete per line. Add a group after a comma, like <b>Maya Lopez, Varsity</b>.</p>
    <textarea id="pasteTxt" placeholder="Maya Lopez, Varsity&#10;Jonah Kim, Varsity&#10;Sam Ortiz, JV"></textarea>
    <div class="modal-btns"><button class="btn" data-x="no">Cancel</button><button class="btn primary" data-x="yes">Add athletes</button></div>`,(m,close)=>{
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
      toast(`Added ${added} athlete${added===1?'':'s'}${skipped?`, skipped ${skipped} already on the team`:''}`);
    };
  });
};

/* ---------- settings sheet ---------- */
document.body.classList.toggle('compact',!!S.settings.compact);
function openSettings(){
  const sw=(id,on)=>`<input type="checkbox" class="switch" id="${id}"${on?' checked':''}>`;
  modal(`<h2>Settings</h2>
    <label class="set-row"><span>On-pace window (± seconds)<span class="hint">Within this counts as on pace</span></span><input type="number" id="tol" min="0.1" max="10" step="0.1" inputmode="decimal" value="${esc(S.settings.tol)}"></label>
    <label class="set-row"><span>Compact view<span class="hint">Two stopwatches per row on a phone</span></span>${sw('compact',S.settings.compact)}</label>
    <label class="set-row"><span>Show splits as you go<span class="hint">Each card's lap list opens at the first lap, newest on top</span></span>${sw('liveLog',S.settings.liveLog)}</label>
    <label class="set-row"><span>Beeps<span class="hint">Countdown at the end of rest. The silent switch mutes these.</span></span>${sw('sound',S.settings.sound)}</label>
    <label class="set-row"><span>Keep screen on<span class="hint" id="wakeHint">${esc(wakeMsg)}</span></span>${sw('wake',S.settings.wake)}</label>
    <div class="sheet-sec" id="teamSec">${teamSecHTML()}</div>
    <div class="sheet-sec">
      <label class="field">Apply a workout to every idle stopwatch<select id="assignAll"><option value="__">Choose a workout…</option>${planOptions(null,true)}</select></label>
      <div class="btn-row"><button class="btn warn" id="clearTrack">Clear track</button><button class="btn warn" id="resetAll">Reset all</button></div>
    </div>
    <div class="sheet-sec">
      <span class="set-row"><span>Backup<span class="hint">Save your team, workouts and times to Files or send them to yourself. Restore replaces everything on this phone.</span></span></span>
      <div class="btn-row"><button class="btn" id="backup">Back up</button><button class="btn" id="restore">Restore</button></div>
    </div>
    <div class="sheet-sec">
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
    `Backup from ${when}: ${n('athlete',s.roster)}, ${n('workout',s.workouts)}, ${n('stopwatch',s.watches,'stopwatches')}. `+
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
  parts.push(P.cps.length+' mark'+(P.cps.length===1?'':'s')+' per rep');
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
  if(!S.workouts.length){ L.innerHTML=`<div class="empty">No workouts yet. Build one to pace an athlete or group.</div>`; return; }
  L.innerHTML=S.workouts.map(wk=>{
    const P=compile(wk);
    return `<div class="wk${wk.id===editingId?' sel':''}" data-id="${wk.id}">
      <div class="wk-name">${esc(wk.name||'Untitled workout')}</div>
      <div class="wk-sum">${esc(describe(wk,P))}</div>${miniBar(P)}
      <div class="wk-btns"><button class="btn" data-w="send">Send athletes</button><button class="btn" data-w="edit">Edit</button><button class="btn" data-w="dup">Duplicate</button><button class="btn warn" data-w="del">Delete</button></div></div>`;
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
  return `<div class="seg" data-i="${i}"><span class="seg-num">Section ${i+1}</span>
    <label class="field">Effort<select data-sf="effort">${effort}</select></label>
    <label class="field">Distance (m)<input data-sf="dist" inputmode="numeric" list="dists" value="${esc(s.dist)}" placeholder="800"></label>
    <label class="field">Target type<select data-sf="mode">${modes}</select></label>
    <div class="field tf-field"><label for="tf-${s.id||i}">Target</label>${timeField({id:'tf-'+(s.id||i),attrs:'data-sf="value"',value:s.value,unit:s.timeUnit,ph:segPh(s.mode),label:'Target'})}</div>
    <label class="field">Check-ins<select data-sf="cp">${cps}</select></label>
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
      <label class="field">Repeats<input data-wf="reps" type="number" min="1" max="50" value="${esc(wk.reps)}"></label>
      <div class="field tf-field"><label for="tf-rest-${wk.id}">Rest between repeats</label>${timeField({id:'tf-rest-'+wk.id,attrs:'data-wf="rest"',value:wk.rest,unit:wk.restUnit,ph:{mss:'1:30',sec:'90'},label:'Rest'})}</div>
    </div>
    <div class="segs">${wk.segments.map((s,i)=>segRow(s,i,wk.segments.length)).join('')}</div>
    <div><button class="btn" data-w="addseg">+ Add section</button></div>
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
  box.innerHTML=`<h3>What the stopwatch will expect${P.reps>1?', each rep':''}</h3>${miniBar(P)}
    <div class="tbl-wrap"><table><thead><tr><th>Mark</th><th>Effort</th><th>Section time</th><th>Clock should read</th></tr></thead><tbody>${rows}</tbody></table></div>
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
  if(b.dataset.w==='send'){ if(S.watches.length>=MAX){ toast(`The track is full (${MAX} stopwatches). Clear it in Settings first.`); return; } openBench({workoutId:id,after:()=>showTab('watches')}); }
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
    const meta=P?`${esc(P.name)}, ${w.status==='done'?'finished':'in progress'}`:'Stopwatch only';
    return `<div class="res-card"><h3>${esc(w.name||'Unnamed')}</h3><div class="meta">${meta}, total ${fmtClock(el(w))}</div>${showMembers(w)?`<div class="meta">Members: ${esc(w.athleteNames.join(', '))}</div>`:''}<div class="tbl-wrap">${P?splitTable(P,w.run):lapTable(w.run)}</div></div>`;
  }).join('');
  $('#resText').value=resultsText(data);
}
const showMembers=w=>w.athleteNames.length>1 || (w.athleteNames.length===1 && w.athleteNames[0]!==w.name);
function resultsText(data){
  const d=new Date();
  let out=`Mustang Splits, ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}\n`;
  data.forEach(({w,P})=>{
    out+=`\n${w.name}${P?' ('+P.name+')':''}\n`;
    if(showMembers(w)) out+=`  Members: ${w.athleteNames.join(', ')}\n`;
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

/* ---------- tabs ---------- */
let curTab='watches';
function showTab(name){
  curTab=name;
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===name)));
  ['watches','workouts','team','results'].forEach(v=>$('#v-'+v).hidden=(v!==name));
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
    <p>This phone has ${nA} athlete${nA===1?'':'s'} and ${nW} workout${nW===1?'':'s'}. Adding them merges any that match what's already on the team, and saves names as first name and last initial (Maya Lopez becomes Maya L.).</p>
    <p class="form-err" id="mgErr" hidden></p>
    <div class="merge-btns"><button class="btn primary" data-x="mine">Add mine to the team</button><button class="btn" data-x="team">Use the team's only</button><button class="btn" data-x="backup">Back up this phone first</button></div>`,(m,close)=>{
    $('#overlay').onclick=null; // a choice is needed; tapping outside doesn't dismiss
    m.querySelector('[data-x=backup]').onclick=()=>backup();
    const pick=async how=>{
      m.querySelectorAll('button').forEach(b=>b.disabled=true);
      try{ await runMerge(how); close(); toast(how==='mine'?'Your athletes and workouts are on the team':'Using the team’s athletes and workouts'); }
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
    const ws=h.watches||[];
    const cards=ws.map(w=>{
      const P={reps:w.reps||1};
      const tbl=(w.splits&&w.splits.length)?splitTable(P,{splits:w.splits}):lapTable({laps:w.laps||[]});
      return `<div class="res-card"><h3>${esc(w.name||'Unnamed')}</h3><div class="meta">${esc(w.workout||'Stopwatch only')}${w.total?', total '+fmtClock(w.total):''}</div>${(w.members||[]).length?`<div class="meta">Members: ${esc(w.members.join(', '))}</div>`:''}<div class="tbl-wrap">${tbl}</div></div>`;
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
renderGrid();
if(S.settings.wake) applyWake();
requestAnimationFrame(tick);
setTimeout(()=>checkVersion(false),3000);
try{ if(sessionStorage.getItem('mustang-splits:restored')){ sessionStorage.removeItem('mustang-splits:restored'); toast('Backup restored'); } }catch(e){}
})();
