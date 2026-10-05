// 2.6 data safety + editing results. Needs the emulators (runall.sh).
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const owner=(path,opt={})=>fetch(REST+'/'+path,{headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},...opt}).then(r=>r.json());
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){}
    try{ Object.defineProperty(navigator,'canShare',{value:undefined}); }catch(e){} HTMLAnchorElement.prototype.click=function(){ window.__dl=this.download; }; const oc=URL.createObjectURL; URL.createObjectURL=f=>{ window.__blob=f; return oc(f); };
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{ window.__clip=t; }}}); }catch(e){} });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const paste=async(p,txt)=>{ await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(300); };
const tab=async(p,t)=>{ await p.click(`.tab[data-tab=${t}]`); await W(); };
const snackText=p=>p.$eval('#snack',s=>s.hidden?'':s.textContent);
const undo=async p=>{ await p.click('#snackBtn'); await W(); };
const rid=(p,n)=>p.evaluate(n=>(MSApp.getRoster().find(a=>a.name.startsWith(n))||{}).id,n);
const settings=async(p,btn)=>{ await p.click('#openSettings'); await W(); if(btn){ await p.click(btn); await W(400); } };
const closeModal=async p=>{ if(!(await p.$eval('#overlay',o=>o.hidden))){ const x=await p.$('#modal [data-x=done],#modal [data-x=no]'); if(x) await x.click(); else await p.evaluate(()=>document.querySelector('#overlay').hidden=true); await W(); } };
const restoreRow=async(p,text)=>{ await settings(p,'#openDeleted'); const okk=await p.evaluate(t=>{ const r=[...document.querySelectorAll('#modal .del-row')].find(x=>x.textContent.includes(t)); if(!r) return false; r.querySelector('[data-rs]').click(); return true; },text); await W(500); await closeModal(p); return okk; };
const deletedText=async p=>{ await settings(p,'#openDeleted'); const t=await p.$eval('#modal',m=>m.innerText); await closeModal(p); return t; };
const race=p=>p.evaluate(()=>MSApp.getRace());
const inject=(p,list)=>p.evaluate(list=>{ const r=MSApp.getRace(); MSApp.applyRemote({marks:{upsert:list.map(([n,ci,t,id])=>({id:id||'m'+n+ci+Math.random().toString(36).slice(2,6),cp:r.checkpoints[ci].id,local:r.gun.local+t*1000,off:r.gun.off,runnerId:r.runners.find(x=>x.name.startsWith(n)).id,by:'other',byName:'Coach Jen'})),remove:[]}}); },list);
const openCellBy=async(p,name,ci)=>{ await closeModal(p); const ri=await p.evaluate(n=>MSApp.getRace().runners.findIndex(x=>x.name.startsWith(n)),name); await p.evaluate(()=>{ const d=document.querySelector('.race-res'); if(d) d.open=true; });
  await p.$eval(`.race-cards [data-rc="${ri}:${ci}"]`,e=>e.scrollIntoView({block:'center'})); await p.click(`.race-cards [data-rc="${ri}:${ci}"]`); await W(); };
const typeT=async(p,digits)=>{ await p.$eval('[data-tst]',i=>{ i.focus(); i.select(); }); await p.keyboard.type(digits); await W(); };
const cellT=(p,name,ci)=>p.evaluate((n,ci)=>{ const r=MSApp.getRace(), rn=r.runners.find(x=>x.name.startsWith(n)); const L=r.marks.filter(m=>!m.deleted&&m.runnerId===rn.id&&m.cp===r.checkpoints[ci].id); if(!L.length) return null;
  const off=e=>e.off!=null?e.off:0, t=m=>((m.local+off(m))-(r.gun.local+off(r.gun)))/1000; const c=L.find(m=>m.chosen)||L.sort((a,b)=>t(a)-t(b))[0]; return Math.round(t(c)*10)/10; },name,ci);

console.log('1. one phone: soft delete + Undo + Recently deleted for everything');
const L=await phone('L',{block:true});
await paste(L,'Maya Lopez, Varsity\nJonah Kim, Varsity\nSam Ortiz, JV');
const maya=await rid(L,'Maya');
await L.click(`.ath[data-id="${maya}"] [data-t=del]`); await W();
ok('removing a runner: no confirm, Undo toast ≥ 44 px', await L.$eval('#overlay',o=>o.hidden) && (await snackText(L)).startsWith('Removed Maya Lopez') && await L.$eval('#snackBtn',b=>b.getBoundingClientRect().height>=44));
ok('runner gone from the Team tab', !(await L.evaluate(id=>MSApp.getRoster().some(a=>a.id===id),maya)));
const t0=Date.now(); await waitFor(L,()=>document.querySelector('#snack').hidden,null,12000); const dur=Date.now()-t0;
ok('Undo toast stays at least 6 s', dur>=5500, dur+' ms');
ok('Recently deleted lists the runner', (await deletedText(L)).includes('Runner: Maya Lopez'));
ok('restore from Recently deleted, same id', await restoreRow(L,'Maya Lopez') && await L.evaluate(id=>MSApp.getRoster().some(a=>a.id===id&&a.name==='Maya Lopez'),maya));
await L.click(`.ath[data-id="${maya}"] [data-t=del]`); await W(); await undo(L);
ok('Undo right away also restores', await L.evaluate(id=>MSApp.getRoster().some(a=>a.id===id),maya));
// PR
await L.click(`.ath[data-id="${maya}"] [data-t=res]`); await W(); // 2.10: typed results replace typed PRs
await L.$eval('#modal [data-rf=unknown]',c=>{ c.checked=true; c.dispatchEvent(new Event('change')); }); await L.click('#modal [data-rf=t]'); await L.keyboard.type('19010'); await L.click('#modal [data-x=add]'); await W();
await L.click('#modal [data-rdel]'); await W();
ok('removing a typed result keeps it (marked deleted) and offers Undo', (await snackText(L)).includes('Result removed') && await L.evaluate(id=>MSApp.getPrs().find(x=>x.id===id).list.some(p=>p.deleted&&p.t===1141),maya));
await undo(L);
ok('Undo brings the result back', await L.evaluate(id=>MSApp.getPrs().find(x=>x.id===id).list.some(p=>!p.deleted&&p.t===1141),maya));
await closeModal(L);
// workouts: running/paused/finished untouched, idle switch and reconnect
await tab(L,'watches');
await L.evaluate(()=>{ /* three stopwatches on the "CV" workout: idle, running, finished */ });
const cv=await L.evaluate(()=>MSApp.getWorkouts().find(w=>w.name.startsWith('CV')).id);
await L.evaluate(()=>{ const S=JSON.parse(localStorage.getItem('mustang-splits:v1')); return 0; });
// build them through the app state for determinism
await L.evaluate(cv=>{ const S=JSON.parse(localStorage.getItem('mustang-splits:v1')); const now=Date.now(), wk=S.workouts.find(w=>w.id===cv);
  const base=(id,name)=>({id,name,workoutId:cv,status:'idle',startAt:0,pausedT:0,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]},athleteIds:[],athleteNames:[],autoName:null,plan:null});
  const idle=base('wIdle','Idle CV'), run=base('wRun','Running CV'), done=base('wDone','Done CV');
  run.status='running'; run.startAt=now-60000; run.plan=JSON.parse(JSON.stringify({name:wk.name,reps:wk.reps,rest:wk.rest,restUnit:wk.restUnit,segments:wk.segments}));
  done.status='done'; done.pausedT=500000; done.plan=run.plan; done.run.splits=[{rep:0,cpi:0,d:200,exp:44,act:45,delta:1,lap:45,lapExp:44,lapD:200,t:45000}];
  S.watches=[idle,run,done]; localStorage.setItem('mustang-splits:v1',JSON.stringify(S));
  const o=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='mustang-splits:v1') return; return o.call(this,k,v); }; },cv); // keep the seed through the reload
await L.reload(); await L.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await W(500);
await tab(L,'workouts');
await L.evaluate(cv=>{ const b=document.querySelector(`[data-w=del][data-id="${cv}"]`)||[...document.querySelectorAll('[data-w=del]')].find(x=>x.closest('[data-id]')&&x.closest('[data-id]').dataset.id===cv); b.click(); },cv); await W();
const ws=()=>L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.map(w=>({id:w.id,wk:w.workoutId,st:w.status,sp:w.run.splits.length,plan:!!w.plan})));
await L.evaluate(()=>{}); await W(300);
let wl=await ws();
ok('deleting a workout: no confirm; Undo says 1 waiting stopwatch switched', (await snackText(L)).includes('1 waiting stopwatch switched to stopwatch only'), await snackText(L));
ok('idle stopwatch switched to stopwatch-only', wl.find(w=>w.id==='wIdle').wk===null);
ok('running stopwatch untouched (keeps its plan copy)', wl.find(w=>w.id==='wRun').st==='running' && wl.find(w=>w.id==='wRun').plan && wl.find(w=>w.id==='wRun').wk===cv);
ok('finished stopwatch keeps its results (the old bug wiped them)', wl.find(w=>w.id==='wDone').sp===1 && wl.find(w=>w.id==='wDone').st==='done');
await undo(L); await W(300); wl=await ws();
ok('restoring the workout reconnects the idle stopwatch', wl.find(w=>w.id==='wIdle').wk===cv && await L.evaluate(cv=>MSApp.getWorkouts().some(w=>w.id===cv),cv));
// stopwatch with times
await tab(L,'watches');
const menu=async(id,k)=>{ await L.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),id); await W(); await L.click(`#modal [data-m="${k}"]`); await W(); };
await menu('wDone','del');
ok('removing a finished stopwatch: no confirm, Undo', (await snackText(L)).startsWith('Removed Done CV') && !(await ws()).some(w=>w.id==='wDone'));
ok('Recently deleted has the stopwatch', (await deletedText(L)).includes('Stopwatch: Done CV'));
ok('restore brings the card back with its times', await restoreRow(L,'Done CV') && (await ws()).some(w=>w.id==='wDone'&&w.sp===1));
await menu('wDone','reset');
ok('Start over: no confirm; times kept in Recently deleted', (await snackText(L)).includes('started over') && (await ws()).find(w=>w.id==='wDone').sp===0 && (await deletedText(L)).includes('Done CV (before Start over)'));
ok('restoring "before Start over" puts the times back on the same card', await restoreRow(L,'Done CV (before Start over)') && (await ws()).find(w=>w.id==='wDone').sp===1);
await settings(L,'#clearTrack'); await L.click('#modal [data-x=yes]'); await W(800);
ok('Clear finished stopwatches clears the finished card (with a snapshot first)', !(await ws()).some(w=>w.id==='wDone'));
ok('cleared card restores from Recently deleted with its times', await restoreRow(L,'Done CV (cleared)') && (await ws()).some(w=>w.id==='wDone'&&w.sp===1));

console.log('2. results editor: every time, choose, correct (m:ss.t), add, move, history, preview');
await L.click('#newBtn'); await W(); await L.click('[data-new=race]'); await W();
for(const n of ['Maya','Jonah','Sam']){ await L.click(`[data-rr="${await rid(L,n)}"]`); await W(); }
ok('grid order without goals: PR at this distance first (Maya, 5K PR), then first names', (await race(L)).runners.map(x=>x.name).join()==='Maya Lopez,Jonah Kim,Sam Ortiz', (await race(L)).runners.map(x=>x.name).join());
await L.$eval('[data-ra=savecourse]',b=>b.scrollIntoView({block:'center'})); await L.click('[data-ra=savecourse]'); await W(); await L.$eval('#courseName',i=>i.value='Kiel HS'); await L.click('#modal [data-x=yes]'); await W();
await L.$eval('[data-ra=delcourse]',b=>b.scrollIntoView({block:'center'})); await L.click('[data-ra=delcourse]'); await W();
ok('deleting a course: Undo, and it leaves the list', (await snackText(L)).includes('Deleted the course') && !(await L.evaluate(()=>MSApp.getCourses().length)));
ok('course restores from Recently deleted', await restoreRow(L,'Kiel HS') && (await L.evaluate(()=>MSApp.getCourses().map(c=>c.name).join()))==='Kiel HS');
await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(600);
await inject(L,[['Maya',0,372,'mA'],['Maya',0,373.5,'mB'],['Jonah',0,380,'mJ'],['Maya',1,750,'mM2']]); await W(300);
await openCellBy(L,'Maya',0);
ok('sheet shows every recorded time, coach and tap time', (await L.$$('#modal .ts-row')).length===2 && (await L.$eval('#modal',m=>m.innerText)).includes('Coach Jen') && /\d:\d\d:\d\d/.test(await L.$eval('#modal .ts-row .hint',h=>h.textContent)));
ok('⚠ two times; the earlier counts', (await L.$eval('#modal',m=>m.innerText)).includes('More than one time recorded') && (await cellT(L,'Maya',0))===372);
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .ts-row')].find(x=>x.textContent.includes('6:13.5')); r.querySelector('[data-ts=count]').click(); }); await W();
ok('"This one counts" picks 6:13.5 and clears ⚠', (await cellT(L,'Maya',0))===373.5 && !(await L.$eval('#modal',m=>m.innerText)).includes('More than one time recorded'));
ok('table no longer shows ⚠ for Maya', !(await L.evaluate(()=>{ const c=[...document.querySelectorAll('.race-cards .rcard')].find(x=>x.textContent.includes('Maya')); return c&&c.querySelector('.dup'); })));
await undo(L); await W();
ok('Undo goes back to the earlier time counting', (await cellT(L,'Maya',0))===372);
await openCellBy(L,'Maya',0);
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .ts-row')].find(x=>x.textContent.includes('6:12.0')); r.querySelector('[data-ts=edit]').click(); }); await W();
await typeT(L,'6105');
ok('m:ss.t keypad: 6105 → 6:10.5', (await L.$eval('[data-tst]',i=>i.value))==='6:10.5');
const pv=await L.$eval('#modal .ts-prev',x=>x.innerText);
ok('preview shows before → after for this checkpoint and the next', pv.includes('Maya Lopez, Mile 1') && pv.includes('6:12.0') && pv.includes('→ 6:10.5') && pv.includes('Mile 2'), pv.replace(/\n/g,' | ')+' || '+(await L.$eval('#modal .ts-edit',x=>x.innerText.replace(/\n/g,' / ')))+' || '+JSON.stringify(await L.evaluate(()=>MSApp.getRace().marks.map(m=>[m.id,m.runnerId&&m.runnerId.slice(0,3),m.deleted,m.chosen,(m.hist||[]).length]))));
await L.click('#modal [data-ts=save]'); await W();
ok('corrected: 6:10.5 counts', (await cellT(L,'Maya',0))===370.5);
ok('the mark keeps its history (original + correction)', await L.evaluate(()=>MSApp.getRace().marks.find(m=>m.id==='mA').hist.length===2));
await L.click('#modal summary'); await W();
ok('History lists both versions', (await L.$$('#modal .ts-hist .set-row')).length>=3);
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .ts-hist .set-row')].find(x=>x.textContent.startsWith('6:12.0')&&x.querySelector('[data-tsv]')); r.querySelector('[data-tsv]').click(); }); await W();
ok('Restore an old version: 6:12.0 again, as a third version', (await cellT(L,'Maya',0))===372 && await L.evaluate(()=>MSApp.getRace().marks.find(m=>m.id==='mA').hist.length===3));
// add a missing time
await L.click('#modal [data-x=done]'); await W();
await openCellBy(L,'Sam',1);
await L.click('#modal [data-ts=add]'); await W(); await typeT(L,'12500');
await L.click('#modal [data-ts=save]'); await W();
ok('add a missing time (Sam, Mile 2, 12:50.0)', (await cellT(L,'Sam',1))===770);
await L.click('#modal [data-x=done]'); await W();
// move to another runner, then another checkpoint
await openCellBy(L,'Jonah',0);
await L.click('#modal [data-ts=edit]'); await W(); await L.select('#modal [data-tsr]',await rid(L,'Sam'));
ok('moving: preview shows Sam gaining the time', (await L.$eval('#modal .ts-prev',x=>x.innerText)).includes('Sam Ortiz, Mile 1'));
await L.click('#modal [data-ts=save]'); await W(); await L.click('#modal [data-x=done]'); await W();
ok('moved to Sam: Sam has 6:20.0, Jonah has none', (await cellT(L,'Sam',0))===380 && (await cellT(L,'Jonah',0))===null);
await openCellBy(L,'Maya',1); await L.click('#modal [data-ts=edit]'); await W(); await L.select('#modal [data-tsc]','2'); await L.click('#modal [data-ts=save]'); await W(); await L.click('#modal [data-x=done]'); await W();
ok('moved to another checkpoint (Mile 2 → Finish)', (await cellT(L,'Maya',2))===750 && (await cellT(L,'Maya',1))===null);
await L.click('[data-ra=copy]'); await W();
await L.click('[data-ra=csv]'); await W(300);
const csvC=await L.evaluate(async()=>await window.__blob.text());
ok('CSV uses the corrections too', csvC.split('\n').find(l=>l.startsWith('"Sam')).includes('"6:20.0"') && csvC.split('\n').find(l=>l.startsWith('"Maya')).includes('"12:30.0"'));
ok('Copy results uses the corrections', (await L.evaluate(()=>window.__clip||'')).includes('6:20.0') && (await L.evaluate(()=>window.__clip||'')).includes('12:30.0'));
// remove a time from the editor -> Recently deleted, grouped per race
await openCellBy(L,'Sam',1); await L.click('#modal [data-ts=remove]'); await W(); await L.click('#modal [data-x=done]'); await W();
ok('removed from the editor; in Recently deleted as "1 time in Race"', (await cellT(L,'Sam',1))===null && /1 time in Race/.test(await deletedText(L)));
await inject(L,[['Jonah',1,760,'mJ2']]); await W(300);
await L.$eval('[data-ra=editcp]',b=>b.scrollIntoView({block:'center'})); await L.click('[data-ra=editcp]'); await W();
await L.click('#modal .race-cp:nth-child(2) [data-cprm]'); await W();
ok('removing a checkpoint with a time: instant, Undo', (await snackText(L)).includes('Removed Mile 2 and its 1 time') && (await race(L)).checkpoints.length===2);
await closeModal(L);
ok('checkpoint restores from Recently deleted with its time', await restoreRow(L,'Mile 2 (1 time)') && (await race(L)).checkpoints.map(c=>c.name).join()==='Mile 1,Mile 2,Finish' && (await cellT(L,'Jonah',1))===760);
await L.evaluate(()=>{ const s=document.querySelector('#raceBannerOpen'); });
// save, then correct the saved copy
await L.click('[data-ra=end]').catch(async()=>{ await L.click('#raceBannerOpen'); await W(); await L.click('[data-ra=end]'); }); await W();
await L.click('#modal [data-x=save]'); await W(900); if(await L.$('#modal .pr-offer')){ await L.click('#modal [data-x=no]'); await W(); }
await openCellBy(L,'Maya',0);
await L.click('#modal [data-ts=edit]'); await W(); await typeT(L,'6111'); await L.click('#modal [data-ts=save]'); await W(); await L.click('#modal [data-x=done]'); await W();
ok('a finished race: corrections go to the saved copy (append-only edits)', await L.evaluate(async()=>{ const r=MSApp.getRace(); return !!r.saved; }) && (await L.$eval('.race-cards',x=>x.innerText)).includes('6:11.1'));
await L.click(await L.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); await tab(L,'results');
ok('Races on this phone shows the corrected time', await L.evaluate(()=>{ const d=document.querySelector('#raceLogList details'); if(!d) return false; d.open=true; return d.innerText.includes('6:11.1'); }));
await L.evaluate(()=>{ const d=document.querySelector('#raceLogList details'); d.open=true; });
await L.evaluate(()=>document.querySelector('#raceLogList .race-cards [data-rc="0:0"]').click()); await W();
ok('tapping a time in Races on this phone opens the same editor', !!(await L.$('#modal .ts')));
await L.click('#modal [data-x=done]'); await W();
await L.evaluate(()=>document.querySelector('#raceLogList [data-rldel]').click()); await W();
ok('removing a race from this phone: Undo, gone from the list', (await snackText(L)).includes('Race removed from this phone') && !(await L.$('#raceLogList details')));
ok('race on this phone restores from Recently deleted (with its correction)', await restoreRow(L,'Race on this phone') && await L.evaluate(()=>{ const d=document.querySelector('#raceLogList details'); if(!d) return false; d.open=true; return d.innerText.includes('6:11.1'); }));

console.log('3. snapshots, storage');
await tab(L,'watches'); await settings(L,'#resetAll'); await W();
await L.click('#modal [data-x=yes]'); await W(800);
const snaps=await L.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>{ const g=q.result.transaction('snapshots').objectStore('snapshots').getAll(); g.onsuccess=()=>r(g.result.map(x=>x.reason)); }; }));
ok('Clear all times took a snapshot first', snaps.includes('Before Clear all times'), snaps.join(' | '));
ok('trash and snapshots are not in the live-data entry', await L.evaluate(()=>{ const s=localStorage.getItem('mustang-splits:v1'); const S=JSON.parse(s); return !('trash' in S) && !s.includes('"reason"') && (S.raceLog||[]).length<=5; }));
await settings(L,'#openSnaps');
ok('Restore a snapshot lists it', (await L.$eval('#modal',m=>m.innerText)).includes('Before Clear all times'));
await L.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .set-row')].find(x=>x.textContent.includes('Before Clear all times')); r.querySelector('[data-snap]').click(); }); await W(400);
await L.click('#modal [data-x=yes]'); await L.waitForNavigation({timeout:15000}).catch(()=>{}); await L.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await W(800);
ok('snapshot restored: the stopwatch times are back', await L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.some(w=>w.id==='wRun'&&w.status==='running')));
// storage full during a race: rescue key, banner, nothing lost
await L.click('#newBtn'); await W(); await L.click('[data-new=race]'); await W(); await L.click(`[data-rr="${await rid(L,'Maya')}"]`); await W(); await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(600);
await L.evaluate(()=>{ const orig=Storage.prototype.setItem; window.__full=true; Storage.prototype.setItem=function(k,v){ if(window.__full&&k==='mustang-splits:v1') throw new DOMException('full','QuotaExceededError'); return orig.call(this,k,v); }; });
const mId=await rid(L,'Maya'); await L.evaluate(id=>document.querySelector(`#raceGrid [data-rn="${id}"]`).click(),mId); await W(800);
ok('storage full: red banner, race keeps saving to the rescue key', await L.$eval('#storageBanner',x=>!x.hidden) && await L.evaluate(()=>{ const r=JSON.parse(localStorage.getItem('mustang-splits:race-rescue')||'null'); return !!(r&&r.race&&r.race.marks.length===1); }));
await L.reload(); await L.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await W(500);
ok('after a reload the tap is still there', await L.evaluate(()=>MSApp.getRace()&&MSApp.getRace().marks.length===1));
await L.evaluate(()=>{ const S=JSON.parse(localStorage.getItem('mustang-splits:v1')); S.pad='x'.repeat(1400000); localStorage.setItem('mustang-splits:v1',JSON.stringify(S));
  const o=Storage.prototype.setItem; Storage.prototype.setItem=function(k,v){ if(k==='mustang-splits:v1') return; return o.call(this,k,v); }; });
await L.reload(); await L.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await W(800);
await L.evaluate(()=>document.querySelector('#raceClose')&&0); await tab(L,'watches').catch(()=>{});
await L.evaluate(()=>{ /* a save measures the live data */ }); await L.click('#helpBtn').catch(()=>{}); await closeModal(L);
await settings(L);
ok('Settings warns well before storage is full (above 50%)', (await L.$eval('#storageLine',x=>x.dataset.level+'|'+x.textContent)).startsWith('warn|') , await L.$eval('#storageLine',x=>x.textContent));
await closeModal(L);
await L.close();

console.log('4. team: soft delete syncs, restore syncs, corrections sync, refusals never loop, purge, phones');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A'), B=await phone('B');
await paste(A,'Maya Lopez, Varsity\nJonah Kim, Varsity\nSam Ortiz, JV');
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(2500);
const T=JSON.parse(await A.evaluate(()=>localStorage.getItem('mustang-splits:sync'))).teamId;
const aMaya=await rid(A,'Maya');
await tab(A,'team'); await A.click(`.ath[data-id="${aMaya}"] [data-t=del]`); await W();
ok('admin device: × offers Remove or Delete permanently', !!(await A.$('#modal [data-x=rm]')) && !!(await A.$('#modal [data-x=purge]')));
await A.click('#modal [data-x=rm]'); await W(1500);
ok('B: runner removed by A disappears', await waitFor(B,id=>!MSApp.getRoster().some(a=>a.id===id),aMaya,10000));
const fsA=await owner(`teams/${T}/athletes/${aMaya}`);
ok('Firestore: soft delete (deleted:true, name kept)', fsA.fields && fsA.fields.deleted.booleanValue===true && fsA.fields.name.stringValue==='Maya L.', JSON.stringify(fsA.fields&&Object.keys(fsA.fields)));
ok('B: it is in Recently deleted, removed by another coach', (await deletedText(B)).includes('Runner: Maya L.'));
ok('B restores it; A gets it back with the same id', await restoreRow(B,'Maya L.') && await waitFor(A,id=>MSApp.getRoster().some(a=>a.id===id),aMaya,10000));
// history entry soft delete + correction in Team history
await tab(A,'watches'); await A.click('#newBtn'); await W(); await A.click('[data-new=race]'); await W();
if(await A.$('#coachName')){ await A.type('#coachName','Coach Ann'); await A.click('[data-x=yes]'); await W(); }
await A.type('[data-rname]','Kiel'); for(const n of ['Maya','Jonah']){ await A.click(`[data-rr="${await rid(A,n)}"]`); await W(); }
await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(600); await inject(A,[['Maya',2,1120,'hm1'],['Jonah',2,1170,'hm2']]); await W(1500);
await A.click('[data-ra=end]'); await W(); await A.click('#modal [data-x=save]'); await W(2000); if(await A.$('#modal .pr-offer')){ await A.click('#modal [data-x=no]'); await W(); }
await A.click(await A.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W();
await tab(B,'results');
ok('B sees the saved race in Team history', await waitFor(B,()=>[...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Kiel')),null,15000));
await B.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Kiel')); d.open=true; }); await W();
await B.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Kiel')); const c=[...d.querySelectorAll('.race-cards .rcard')].find(x=>x.textContent.includes('Maya')); c.querySelectorAll('[data-rc]')[2].click(); }); await W();
ok('B opens a Team history time in the editor (coach and tap time shown)', (await B.$eval('#modal',m=>m.innerText)).includes('18:40.0') && (await B.$eval('#modal',m=>m.innerText)).includes('Coach Jen'));
await B.click('#modal [data-ts=edit]'); await W(); await typeT(B,'18385'); await B.click('#modal [data-ts=save]'); await W(); await B.click('#modal [data-x=done]'); await W();
const hd=await owner(`teams/${T}/history`); const hdoc=(hd.documents||[]).find(d=>d.fields.race&&JSON.stringify(d.fields.race).includes('Kiel'));
ok('Firestore: the correction is appended to edits; saved results untouched', hdoc && (hdoc.fields.edits.arrayValue.values||[]).length===1 && JSON.stringify(hdoc.fields.race).includes('1120'));
await tab(A,'results');
ok('A sees the corrected time in Team history', await waitFor(A,()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Kiel')); if(!d) return false; d.open=true; return d.innerText.includes('18:38.5'); },null,15000));
await A.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Kiel')); d.querySelector('[data-hcopy]').click(); }); await W();
ok('Copy from Team history uses the correction', (await A.evaluate(()=>window.__clip||'')).includes('18:38.5'));
await A.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Kiel')); d.querySelector('[data-hdel]').click(); }); await W(1500);
ok('removing a history entry: Undo, soft delete in Firestore', (await snackText(A)).includes('Entry removed') && await (async()=>{ const h=await owner(`teams/${T}/history/${hdoc.name.split('/').pop()}`); return h.fields.deleted&&h.fields.deleted.booleanValue===true&&!!h.fields.race; })());
ok('B: the entry leaves Team history and shows in Recently deleted', await waitFor(B,()=>![...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Kiel')),null,10000) && (await deletedText(B)).includes('Team history: Kiel'));
ok('B restores it for everyone', await restoreRow(B,'Kiel') && await waitFor(A,()=>[...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Kiel')),null,15000));
// Show older: a workout soft-deleted 200 days ago is kept by the team, not on the phone
const old=new Date(Date.now()-200*864e5).toISOString();
await owner(`teams/${T}/workouts/oldhills`,{method:'PATCH',body:JSON.stringify({fields:{name:{stringValue:'Old Hills'},reps:{integerValue:'6'},rest:{stringValue:'2:00'},restUnit:{stringValue:'mss'},segments:{arrayValue:{values:[]}},
  updatedAt:{timestampValue:old},updatedBy:{stringValue:'x'},deleted:{booleanValue:true},deletedAt:{timestampValue:old},deletedBy:{stringValue:'x'}}})});
await W(2500);
ok('an old soft delete is not kept on the phone (past 90 days)', !(await deletedText(B)).includes('Old Hills'));
await settings(B,'#openDeleted'); await B.click('#modal [data-older]'); await W(2500);
ok('Show older loads it from the team', (await B.$eval('#modal',m=>m.innerText)).includes('Workout: Old Hills'));
await B.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .del-row')].find(x=>x.textContent.includes('Old Hills')); r.querySelector('[data-rso]').click(); }); await W(2500);
ok('…and restores it for every coach', await waitFor(B,()=>MSApp.getWorkouts().some(w=>w.name==='Old Hills'),null,10000) && await waitFor(A,()=>MSApp.getWorkouts().some(w=>w.name==='Old Hills'),null,10000));
await closeModal(B);
// two coaches correct the same live mark: both versions kept
await tab(A,'watches'); await A.click('#newBtn'); await W(); await A.click('[data-new=race]'); await W();
await A.type('[data-rname]','Dual'); await A.click(`[data-rr="${await rid(A,'Sam')}"]`); await W(); await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(800);
const sId=await rid(A,'Sam'); await A.evaluate(id=>document.querySelector(`#raceGrid [data-rn="${id}"]`).click(),sId); await W(2000);
await tab(B,'watches'); await waitFor(B,()=>!document.querySelector('#raceBanner').hidden,null,10000); await B.click('#raceBannerOpen'); await W(); if(await B.$('[data-x=open]')) await B.click('[data-x=open]');
if(await waitFor(B,()=>document.querySelector('#coachName'),null,2500)){ await B.type('#coachName','Coach Ben'); await B.click('[data-x=yes]'); await W(); }
await waitFor(B,()=>MSApp.getRace()&&MSApp.getRace().marks.length===1,null,10000); await W(800);
await A.setOfflineMode(true); await B.setOfflineMode(true);
for(const [p,d] of [[A,'1000'],[B,'1100']]){ await p.evaluate(()=>{ const d=document.querySelector('.race-res'); if(d) d.open=true; }); await p.evaluate(()=>document.querySelector('.race-cards [data-rc="0:0"]').click()); await W();
  await p.click('#modal [data-ts=edit]'); await W(); await typeT(p,d); await p.click('#modal [data-ts=save]'); await W(); await p.click('#modal [data-x=done]'); await W(); }
await A.setOfflineMode(false); await B.setOfflineMode(false); await W(6000);
const RID=JSON.parse(await A.evaluate(()=>localStorage.getItem('mustang-splits:sync'))).raceId;
const mk=(await owner(`teams/${T}/races/${RID}/marks`)).documents||[];
const hl=mk.length?(mk[0].fields.hist.arrayValue.values||[]).length:0;
ok('two coaches correcting the same time offline: both corrections kept in its history', mk.length===1 && hl===3, `${mk.length} mark, ${hl} versions`);
ok('…and both phones end up showing the same time', await waitFor(A,()=>1,null,1000) && (await A.evaluate(()=>{ const m=MSApp.getRace().marks[0]; return m.local; }))===(await B.evaluate(()=>{ const m=MSApp.getRace().marks[0]; return m.local; })));
await A.click('[data-ra=end]'); await W(); await A.click('#modal [data-x=save]'); await W(1500); if(await A.$('#modal .pr-offer')){ await A.click('#modal [data-x=no]'); await W(); }
await A.click(await A.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); await B.click(await B.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]').catch(()=>{}); await W();
// a refused write never loops: a race with 151 runners is beyond the rules' limit
const many=Array.from({length:151},(_,i)=>`Runner${String(i).padStart(3,'0')} X, Open`).join('\n');
await paste(B,many); await W(3000);
await tab(B,'watches'); await B.click('#newBtn'); await W(); await B.click('[data-new=race]'); await W();
const gi=await B.evaluate(()=>[...document.querySelectorAll('[data-rg]')].findIndex(x=>x.textContent.startsWith('Open')));
await B.click(`[data-rg="${gi}"]`); await W(3000);
await W(12000);
const st=await B.evaluate(()=>MSApp.syncStats());
ok('a refused write: reported once, never a rejoin loop', st && st.refusals>=1 && st.rejoins===0, JSON.stringify(st));
await B.click(await B.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); await settings(B);
ok('B is still in the team; the status says what was refused', (await B.$eval('#teamSec',x=>x.innerText)).includes('refused by the team') && !(await B.$eval('#teamSec',x=>x.innerText)).includes('Signed out'), await B.$eval('#teamStatus',x=>x.textContent));
await closeModal(B);
// coach phones and versions
await settings(A);
ok('Settings > Team lists both phones on 2.6.0, safe to publish', await waitFor(A,()=>document.querySelector('#phones .phones-sum')&&document.querySelector('#phones .phones-sum').textContent.includes('safe to publish'),null,8000) && (await A.$$('#phones .phone-row')).length===2, await A.$eval('#phones',x=>x.innerText));
await closeModal(A);
await owner(`teams/${T}/devices/oldphone`,{method:'PATCH',body:JSON.stringify({fields:{ver:{stringValue:'2.5.0'},name:{stringValue:'Coach Old'},seen:{timestampValue:new Date().toISOString()}}})});
await settings(A);
ok('an old phone: "1 phone needs to update"', await waitFor(A,()=>document.querySelector('#phones .phones-sum')&&document.querySelector('#phones .phones-sum').textContent.includes('1 phone needs to update'),null,8000));
await closeModal(A);
// admin: delete permanently, from the Team tab (2.6.1)
await tab(B,'team'); const bSam=await rid(B,'Sam'); await B.click(`.ath[data-id="${bSam}"] [data-t=del]`); await W();
ok('a non-admin phone: × removes right away (no Delete permanently)', await B.$eval('#overlay',o=>o.hidden) && (await snackText(B)).startsWith('Removed Sam'));
await undo(B);
await tab(A,'team'); const aJ=await rid(A,'Jonah'); await A.click(`.ath[data-id="${aJ}"] [data-t=del]`); await W();
await A.click('#modal [data-x=purge]'); await W();
ok('Team tab → Delete permanently opens the typed-name sheet', (await A.$eval('#modal h2',h=>h.textContent)).startsWith('Delete Jonah K. permanently'));
await A.type('#purgeName','Jonah X'); ok('wrong typed name keeps the button off', await A.$eval('#modal [data-x=yes]',b=>b.disabled));
await A.$eval('#purgeName',i=>{ i.value=''; }); await A.type('#purgeName','jonah k.');
ok('typed name (any case) turns it on', !(await A.$eval('#modal [data-x=yes]',b=>b.disabled)));
await A.click('#modal [data-x=yes]'); await waitFor(A,()=>document.querySelector('#overlay').hidden,null,30000); await W(2000);
const ja=await owner(`teams/${T}/athletes/${aJ}`), pg=await owner(`teams/${T}/purges/${aJ}`);
ok('Firestore: athlete gone, purge record kept (no name in it)', !!ja.error && pg.fields && !JSON.stringify(pg.fields).includes('Jonah'));
const hd2=await owner(`teams/${T}/history`);
ok('Firestore: Jonah removed from saved results (only the purge marker names his id)', !(hd2.documents||[]).some(d=>{ const f={...d.fields}; delete f.purgedFor; return JSON.stringify(f).includes(aJ); }));
ok('B scrubs its own copies (roster, trash)', await waitFor(B,id=>!MSApp.getRoster().some(a=>a.id===id),aJ,15000) && !(await deletedText(B)).includes('Jonah'));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
