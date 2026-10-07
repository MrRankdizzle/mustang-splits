// Every stopwatch tile state on one phone without a team (3.6.1), for tests/e2e34.js and tools/shots361.js:
// waiting group, running stopwatch with laps, a group resting (its names to send), stopped, finished, a split-off,
// a running group with long names; Edit mode with two selected. WebKit (Safari's engine) through Playwright, iPhone
// size, at an iOS text size (17 px = the default "Large"; 19, 21, 23 larger). Fake names only.
const { webkit } = require('playwright-core');
const W=ms=>new Promise(r=>setTimeout(r,ms||250));
const ROSTER=[['r1','Maximiliana Featherstonehaugh'],['r2','Bartholomew Vanderhoeven'],['r3','Aubree Rosenkranz'],['r4','Gavyn Brinkerhoff'],['r5','Benedikt Toepfer-Lindqvist'],['r6','Ivy Delacroix-Moss'],['r7','Jo Park']];
function seed(compact){ return {v:1,settings:{tol:1,compact,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach Ann',coachAsked:true,genderGroups2100:true},
  workouts:[{id:'wkA',name:'400 × 3 at 1:20',reps:3,rest:'1:00',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:400,mode:'total',value:'1:20',cp:200}]},
    {id:'wkD',name:'200 once',reps:1,rest:'',restUnit:'mss',segments:[{id:'s2',effort:'fast',dist:200,mode:'total',value:'0:40',cp:0}]}],
  roster:ROSTER.map(([id,name],i)=>({id,name,group:'',gender:i%2?'B':'G'})),courses:[],prs:{},raceLog:[],series:[],meets:[],merges:[],places:[],weather:[],race:null,watches:[]}; }
async function open(browser,{url='http://localhost:8765/',compact=false,text=17,w=390,h=844}={}){
  const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(([sd,text])=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
    document.addEventListener('DOMContentLoaded',()=>{ const s=document.createElement('style'); s.textContent=`html{font-size:${text}px!important}`; document.head.appendChild(s); }); },[JSON.stringify(seed(compact)),text]);
  const p=await ctx.newPage(); p.errs=[]; p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(url); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=watches]')); await W(500);
  await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); });
  return p; }
// Builds every state with real taps. Returns {name: watch id}.
async function build(p){
  const add=(n,wk,ids)=>p.evaluate(([n,wk,ids])=>ids?MSApp.addGroup(n,wk,ids):MSApp.addWatch(n,wk),[n,wk,ids]);
  const tap=async(id,a,x)=>{ await p.evaluate(([id,a,x])=>{ const q=document.querySelector(`.watch[data-id="${id}"] [data-act="${a}"]${x||''}`); if(q) q.click(); },[id,a,x||'']); await W(120); };
  const T={};
  T.waiting=await add('Waiting group with a long name','wkA',['r1','r2','r3']);
  T.running=await add('Quick stopwatch',null);
  T.rest=await add('Group 1','wkA',['r1','r2','r3','r4']);
  T.stopped=await add('Stopped','wkA',['r5']);
  T.finished=await add('Finished','wkD',['r6']);
  T.group=await add('Group 2','wkA',['r2','r5','r6','r7']);
  await W(600);
  for(const k of ['running','rest','stopped','finished','group']) await tap(T[k],'start');
  await W(1300);
  await tap(T.running,'split'); await W(700); await tap(T.running,'split');
  await tap(T.rest,'split'); await W(300); await tap(T.rest,'split');
  await tap(T.stopped,'split'); await tap(T.stopped,'stop'); await tap(T.stopped,'stop');
  await tap(T.finished,'split');
  await tap(T.group,'split');
  await W(300);
  await tap(T.rest,'send','[data-aid="r1"]'); await W(700);
  T.split=await p.evaluate(()=>[...document.querySelectorAll('#grid .watch[data-id]')].map(n=>n.dataset.id).find(id=>{ const m=MSApp.watchMeta(id); return m&&m.from&&m.ids.join()==='r1'; }));
  await W(4300); // the "recorded" notes end
  await tap(T.running,'split'); // a fresh "Lap 3 recorded · Undo" on one tile
  return T; }
async function editMode(p,ids){ await p.evaluate(()=>document.querySelector('#editW').click()); await W(200);
  for(const id of ids) await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"]`).click(),id); await W(200); }
module.exports={webkit,open,build,editMode,W,ROSTER};
