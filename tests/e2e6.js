const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:200},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block,skew}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); }catch(e){} });  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(skew) await p.evaluateOnNewDocument(s=>{ const real=Date.now.bind(Date); Date.now=()=>real()+s; },skew);
  await p.evaluateOnNewDocument(()=>{ try{ Object.defineProperty(navigator,'canShare',{value:undefined}); }catch(e){} HTMLAnchorElement.prototype.click=function(){ window.__dl=this.download; }; const oc=URL.createObjectURL; URL.createObjectURL=f=>{ window.__blob=f; return oc(f); }; });
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const paste=async(p,txt)=>{ await p.click('.tab[data-tab=team]'); await W(); await p.click('#teamMore'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(300); await p.click('.tab[data-tab=watches]'); await W(); };
const rid=(p,name)=>p.evaluate(n=>(MSApp.getRoster().find(a=>a.name.startsWith(n))||{}).id,name);
const cpId=(p,i)=>p.evaluate(i=>MSApp.getRace().checkpoints[i].id,i);
const tapAt=async(p,i)=>{ await p.click(`[data-at="${await cpId(p,i)}"]`); await W(500); }; // switching checkpoint rebuilds the grid: 400 ms guard
const tapName=async(p,name)=>{ const id=await rid(p,name); await p.click(`[data-rn="${id}"]`); await W(); };
// results table cell for a runner at checkpoint index (opens the cell editor)
const openCell=async(p,name,ci)=>{ const ri=await p.evaluate(n=>MSApp.getRace().runners.findIndex(x=>x.name.startsWith(n)),name); await p.evaluate(()=>{ const d=document.querySelector('.race-res'); if(d) d.open=true; }); await p.click(`[data-rc="${ri}:${ci}"]`); await W(); };
const coachName=async(p,n)=>{ if(await waitFor(p,()=>document.querySelector('#coachName'),null,2000)){ await p.type('#coachName',n); await p.click('[data-x=yes]'); await W(); } };
const snackText=p=>p.$eval('#snack',s=>s.hidden?'':s.querySelector('#snackText').textContent);
// official time (s) for runner at checkpoint index, from the page's own model
const cell=(p,name,ci)=>p.evaluate((n,ci)=>{ const r=MSApp.getRace(); const rn=r.runners.find(x=>x.name.startsWith(n)); if(!rn||!r.gun) return null;
  const off=e=>e.off!=null?e.off:0; const ts=r.marks.filter(m=>!m.deleted&&m.runnerId===rn.id&&m.cp===r.checkpoints[ci].id).map(m=>((m.local+(m.off!=null?m.off:JSON.parse(localStorage.getItem('mustang-splits:clock')||'{"off":0}').off||0))-(r.gun.local+(r.gun.off!=null?r.gun.off:JSON.parse(localStorage.getItem('mustang-splits:clock')||'{"off":0}').off||0)))/1000).sort((a,b)=>a-b);
  return ts.length?{t:ts[0],n:ts.length}:null; },name,ci);

console.log('1. one phone, no network (SDK blocked)');
const L=await phone('L',{block:true});
await paste(L,'Maya Lopez, Varsity\nJonah Kim, Varsity\nSam Ortiz, JV');
await L.click('#newBtn'); await W(); await L.click('[data-new=race]'); await W();
ok('race screen opens in setup, tab bar still showing (2.7.1)', await L.evaluate(()=>!document.querySelector('#v-race').hidden && getComputedStyle(document.querySelector('.tabbar')).display!=='none'));
ok('default checkpoints Mile 1, Mile 2, Finish', (await L.evaluate(()=>MSApp.getRace().checkpoints.map(c=>c.name).join()))==='Mile 1,Mile 2,Finish');
ok('Ready for the gun is off with no runners', await L.$eval('#readyBtn',b=>b.disabled && b.textContent==='Pick runners first'));
await L.type('[data-rname]','Practice TT');
const vg=await L.evaluate(()=>[...document.querySelectorAll('[data-rg]')].findIndex(b=>b.textContent.startsWith('No Girls/Boys'))); // 2.12: Girls / Boys sections; the heading picks all three
await L.click(`[data-rg="${vg}"]`); await W();
ok('picked a group and a name (3 runners)', (await L.evaluate(()=>MSApp.getRace().runners.length))===3);
const mid=await rid(L,'Maya'); await L.click(`[data-goal="${mid}"]`); await L.keyboard.type('1930'); await W();
ok('goal entered with microwave digits (19:30)', (await L.evaluate(id=>MSApp.getRace().runners.find(x=>x.id===id).goal,mid))===1170);
const nameBtnH=async()=>L.$$eval('.race-grid button',bs=>Math.min(...bs.map(b=>b.getBoundingClientRect().height)));
await L.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>L.click('[data-ra=gun]')); await W(600);
ok('gun starts the clock', (await L.evaluate(()=>MSApp.raceElapsed()))>400 && (await L.$eval('#raceClock',x=>x.textContent))!=='0:00.0');
ok('name buttons at least 64px, 2 columns', (await nameBtnH())>=64 && (await L.$eval('.race-grid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length))===2);
ok('Undo gun offered for 10 s', (await snackText(L)).includes('Gun'));
const gun1=await L.evaluate(()=>MSApp.getRace().gun.local);
ok('Restart clock shown before any tap', !!(await L.$('[data-ra=restart]')));
await W(300); await L.click('[data-ra=restart]'); await W();
ok('restart moves the gun', (await L.evaluate(()=>MSApp.getRace().gun.local))>gun1);
await L.click('#snackBtn'); await W();
ok('undo restart puts the gun back', (await L.evaluate(()=>MSApp.getRace().gun.local))===gun1);
await tapName(L,'Maya');
ok('tap shows "Maya Lopez, time at Mile 1" with Undo', /^Maya Lopez, 0:0\d\.\d at Mile 1$/.test(await snackText(L)), await snackText(L));
ok('Maya stays in place, grayed, with her time', await L.$eval(`[data-rn="${mid}"]`,b=>b.classList.contains('rec') && b.textContent.includes('✓')));
ok('Restart clock gone after first tap', await L.$eval('[data-ra=restart]',b=>b.hidden));
await L.click('#snackBtn'); await W();
ok('Undo removes the time', await L.$eval(`[data-rn="${mid}"]`,b=>!b.classList.contains('rec')));
await tapName(L,'Maya');
await L.click('[data-ra=mark]'); await W();
ok('"Time now, name later" label', (await L.$eval('[data-ra=mark]',b=>b.textContent))==='Time now, name later');
ok('Time now makes an unassigned chip', (await L.$$('.mark-strip [data-um]')).length===1);
await L.click('.mark-strip [data-um]'); await W(); await tapName(L,'Jonah');
ok('tap mark then name assigns it', (await cell(L,'Jonah',0))!==null && (await L.$$('.mark-strip [data-um]')).length===0);
ok('Undo bar sits at the top in Race Mode (never over name buttons)', await L.$eval('#snack',s=>!s.hidden && s.getBoundingClientRect().bottom < document.querySelector('#raceClock').getBoundingClientRect().bottom));
// edit Maya's Mile 1 to 6:12
await openCell(L,'Maya',0);
await L.click('#modal [data-ts=edit]'); await L.$eval('[data-tst]',i=>{ i.focus(); i.select(); }); await L.keyboard.type('6120'); await L.click('#modal [data-ts=save]'); await W(); await L.click('#modal [data-x=done]'); await W(); // m:ss.t keypad (2.6)
const mc=await cell(L,'Maya',0); ok('edit sets 6:12.0', mc && Math.abs(mc.t-372)<0.05, mc&&mc.t);
const tbl=await L.$eval('.race-table',t=>t.innerText);
ok('table: place, pace per mile, goal compare (fast at 6:12 vs 6:16.6)', tbl.includes('6:12.0') && tbl.includes('1st') && tbl.includes('/mi') && !!(await L.$('.race-table .gd.fast')), tbl.replace(/\s+/g,' ').slice(0,160));
const before=await L.evaluate(()=>MSApp.raceElapsed()); const tb=Date.now();
await L.reload(); await L.waitForFunction(()=>window.MSApp&&document.querySelector('.watch'));
ok('after reload the "Race running" bar offers the race', await L.$eval('#liveBar',x=>!x.hidden));
await L.click('#liveBar'); await W(500);
const after=await L.evaluate(()=>MSApp.raceElapsed());
ok('clock continues across reload (within 0.5 s)', Math.abs((after-before)-(Date.now()-tb))<500, (after-before)-(Date.now()-tb));
// clear Jonah
await openCell(L,'Jonah',0); await L.click('#modal [data-ts=remove]'); await W(); await L.click('#modal [data-x=done]'); await W();
ok('clear removes a time', (await cell(L,'Jonah',0))===null);
await L.click('[data-ra=end]'); await W(); await L.click('[data-x=save]'); await W();
ok('end race shows final results', (await L.evaluate(()=>MSApp.getRace().status))==='done' && !!(await L.$('[data-ra=new]')));
await L.$eval('[data-ra=csv]',b=>b.click()); await W(300);
ok('CSV export', (await L.evaluate(()=>window.__dl||''))?.startsWith('race-practice-tt-') && (await L.evaluate(async()=>(await window.__blob.text()).split('\n')[0])).includes('Mile 1 pace/mi'));

console.log('2. team: shared clock and merged taps');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A'), B=await phone('B'), C=await phone('C',{skew:37000});
await paste(A,'Maya Lopez, Varsity\nJonah Kim, Varsity\nSam Ortiz, JV');
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1500);
for(const p of [B,C]){ await form(p,'#tmJoin',[['#tmPw1',PW]]); await merge(p); }
await W(2500);
await A.click('#newBtn'); await W(); await A.click('[data-new=race]'); await W(); await coachName(A,'Coach Ann'); await A.type('[data-rname]','Bay Invite');
const g2=await A.evaluate(()=>[...document.querySelectorAll('[data-rg]')].findIndex(b=>b.textContent.startsWith('No Girls/Boys')));
await A.click(`[data-rg="${g2}"]`); await W(); await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(2500);
ok('B sees the race banner', await waitFor(B,()=>!document.querySelector('#raceBanner').hidden && document.querySelector('#raceBannerText').textContent.includes('Bay Invite')));
await B.click('#raceBannerOpen'); await W(); if(await B.$('[data-x=open]')){ await B.click('[data-x=open]'); } await coachName(B,'Coach Ben');
await C.waitForFunction(()=>!document.querySelector('#raceBanner').hidden,{timeout:15000}); await C.click('#raceBannerOpen'); await W(); if(await C.$('[data-x=open]')){ await C.click('[data-x=open]'); } await coachName(C,'Coach Cal');
ok('B and C open the race', await waitFor(B,()=>MSApp.getRace()&&MSApp.getRace().status==='running') && await waitFor(C,()=>MSApp.getRace()&&MSApp.getRace().status==='running'));
await waitFor(C,()=>{ const c=JSON.parse(localStorage.getItem('mustang-splits:clock')||'{}'); return c.off!=null; },null,15000); await W(500);
const offC=await C.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:clock')).off);
ok('C measured its clock offset (about -37 s)', Math.abs(offC+37000)<400, offC);
const [eA,eC,eB]=await Promise.all([A.evaluate(()=>MSApp.raceElapsed()),C.evaluate(()=>MSApp.raceElapsed()),B.evaluate(()=>MSApp.raceElapsed())]);
ok('same race clock on A, B and C (within 0.3 s), even with C\'s clock 37 s off', Math.abs(eA-eC)<300 && Math.abs(eA-eB)<300, `A-C ${eA-eC} ms, A-B ${eA-eB} ms`);
await tapAt(B,0); await tapAt(C,1); await tapAt(A,0);
await tapName(B,'Maya L'); const tB=(await cell(B,'Maya L',0)).t;
await W(1200); await tapName(C,'Maya L'); const tC=(await cell(C,'Maya L',1)).t;
ok('A gets Maya at Mile 1 (from B) and Mile 2 (from C)', await waitFor(A,()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Maya')).id; return r.marks.filter(m=>!m.deleted&&m.runnerId===id).length===2; }));
const aM1=await cell(A,'Maya L',0), aM2=await cell(A,'Maya L',1);
ok('A shows the same times B and C recorded (within 0.05 s)', Math.abs(aM1.t-tB)<0.05 && Math.abs(aM2.t-tC)<0.05, `${aM1.t}/${tB} ${aM2.t}/${tC}`);
await B.setOfflineMode(true); await tapName(A,'Jonah'); await W(700); await tapName(B,'Jonah'); await B.setOfflineMode(false); // both tap before either hears of the other
ok('same runner at same checkpoint from two coaches: flagged', await waitFor(A,()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Jonah')).id; return r.marks.filter(m=>m.runnerId===id&&m.cp===r.checkpoints[0].id).length===2; }));
const jA=await cell(A,'Jonah',0), jAll=await A.evaluate(()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Jonah')).id; const o=JSON.parse(localStorage.getItem('mustang-splits:clock')).off; return r.marks.filter(m=>m.runnerId===id).map(m=>((m.local+(m.off??o))-(r.gun.local+(r.gun.off??o)))/1000).sort((a,b)=>a-b); });
ok('earlier time is the one that counts', Math.abs(jA.t-jAll[0])<0.001 && jAll[1]-jAll[0]>0.4, jAll.map(x=>x.toFixed(2)).join(' < '));
await A.click('.race-res summary').catch(()=>{}); 
ok('⚠ shown in A\'s table', await waitFor(A,()=>!!document.querySelector('.race-table .dup')));
await C.click('[data-ra=mark]'); await W(); await C.click('.mark-strip [data-um]'); await W(); await tapName(C,'Sam');
ok('C assigns a pack mark to Sam; A gets it', await waitFor(A,()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Sam')).id; return r.marks.some(m=>m.runnerId===id&&m.cp===r.checkpoints[1].id); }));
await tapName(B,'Sam'); await W(300); await B.click('#snackBtn'); await W(2000);
ok('Undo on B never shows as a time on A', !(await A.evaluate(()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Sam')).id; return r.marks.some(m=>!m.deleted&&m.runnerId===id&&m.cp===r.checkpoints[0].id); })));
await B.setOfflineMode(true); await W(300); await tapName(B,'Sam'); const tOff=(await cell(B,'Sam',0)).t; await W(1500);
await B.setOfflineMode(false);
ok('offline tap on B syncs later with its original time', await waitFor(A,()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Sam')).id; return r.marks.some(m=>!m.deleted&&m.runnerId===id&&m.cp===r.checkpoints[0].id); },null,30000) && Math.abs((await cell(A,'Sam',0)).t-tOff)<0.05);
const pre=await A.evaluate(()=>MSApp.raceElapsed()), tp=Date.now();
await A.reload(); await A.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await A.click('#liveBar'); await W(500);
ok('A reloads mid-race: clock unchanged (within 0.5 s)', Math.abs((await A.evaluate(()=>MSApp.raceElapsed()))-pre-(Date.now()-tp))<500);
await tapAt(A,0); await openCell(A,'Maya L',0);
await A.click('#modal [data-ts=edit]'); await A.$eval('[data-tst]',i=>{ i.focus(); i.select(); }); await A.keyboard.type('6120'); await A.click('#modal [data-ts=save]'); await W(); await A.click('#modal [data-x=done]'); await W();
ok('edit on A reaches B', await waitFor(B,()=>{ const r=MSApp.getRace(); const id=r.runners.find(x=>x.name.startsWith('Maya')).id; const m=r.marks.find(m=>!m.deleted&&m.runnerId===id&&m.cp===r.checkpoints[0].id); const o=JSON.parse(localStorage.getItem('mustang-splits:clock')||'{"off":0}').off||0; return m && Math.abs(((m.local+(m.off??o))-(r.gun.local+(r.gun.off??o)))/1000-372)<0.05; }));
await A.click('[data-ra=end]'); await W(); await A.click('[data-x=save]'); await W(1500);
ok('B sees the race finished', await waitFor(B,()=>MSApp.getRace().status==='done'));
await B.click(await B.$('#raceClose:not([hidden])')?'#raceClose':'.tab[data-tab=watches]'); await W(); await B.click('.tab[data-tab=results]');
ok('race saved to Team history', await waitFor(B,()=>[...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Bay Invite'))));
await B.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Bay Invite')); d.open=true; });
ok('history shows the race table', await B.evaluate(()=>[...document.querySelectorAll('#histList .race-table')].some(t=>t.innerText.includes('6:12.0'))));

console.log('3. one race at a time: End it and start a new one');
// 2.12: no group headings; pick Sam (was the JV group)
await A.click('[data-ra=new]'); await W(); await A.click(`[data-rr="${await rid(A,'Sam')}"]`); await W(); await A.type('[data-rname]','Second'); await A.click('#readyBtn').then(()=>new Promise(r=>setTimeout(r,150))).then(()=>A.click('[data-ra=gun]')); await W(500); await tapName(A,'Sam'); await W(2500);
const D=await phone('D'); await form(D,'#tmJoin',[['#tmPw1',PW]]); await merge(D); await W(2500);
await D.click('#newBtn'); await W(); await D.click('[data-new=race]'); await W();
ok('D is told a race is already running', (await D.$eval('#modal',m=>m.innerText)).includes('already running'));
await D.click('[data-x=end]'); await W(3000);
ok('D is now setting up a new race', (await D.evaluate(()=>MSApp.getRace()&&MSApp.getRace().status))==='setup');
ok('A\'s race was ended for everyone', await waitFor(A,()=>MSApp.getRace().status==='done'));
ok('the ended race went to Team history', await waitFor(B,()=>[...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Second'))), await B.evaluate(()=>[...document.querySelectorAll('#histList summary')].map(s=>s.textContent.replace(/\s+/g,' ').slice(0,60)).join(' | ')));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
