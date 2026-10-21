// 3.16: Team training paces with pull-down menus and Start workout; stopwatches private unless shared.
// 1. The two menus (grouped, slowest to fastest), no sideways scroll at 320 / 390 pt and at large text sizes.
// 2. Suggestions match docs/training-rules.md (its worked examples, and the sheet for this team).
// 3. The coach's own reps and rest are remembered per distance and effort; "Back to the suggestion".
// 4. Start: runners (pace groups within Girls and Boys, as the list), each stopwatch's target per rep = the engine.
// 5. Two coach phones (Firestore emulator): private stopwatches never reach the other phone; shared ones appear within
//    2 s in "Shared workouts" (above, never moving a row under a finger), any coach starts them and taps laps, and a
//    shared workout stays shared when the setting is turned off. Fake names (tests/tools/fake-season.js).
const puppeteer=require('puppeteer-core'), H=require('./tools/phones.js'), lib=require('./lib.js'), fs=require('fs'), path=require('path');
const FS=require('./tools/fake-season.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',protocolTimeout:120000});
const {W,waitFor}=H; const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const data={roster:FS.seed.roster,raceLog:FS.seed.raceLog,courses:FS.seed.courses,series:FS.seed.series,meets:FS.seed.meets};
const seed=new Function('S',`Object.assign(S,${JSON.stringify(data)}); S.settings.shareWatches=false;`);
const [A,B]=await H.team(b,['Coach Ann','Coach Ben'],errs,seed);
const ev=(f,...a)=>A.evaluate(f,...a);
await A.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=workouts]').click(); }); await W(900);

console.log('1. the menus: grouped, no sideways scroll');
const menuCheck=vw=>ev(vw=>{ const out=[]; if(innerWidth>vw) out.push('the layout is '+innerWidth+' pt wide');
  if(document.documentElement.scrollWidth>vw+1) out.push('the page scrolls sideways');
  for(const id of ['#tpDBtn','#tpEBtn']){ const btn=document.querySelector(id), r=btn.getBoundingClientRect(); if(r.right>vw+0.5||r.left<-0.5) out.push(id+' outside the screen'); if(r.height<43.5) out.push(id+' under 44 pt');
    btn.click(); const m=document.querySelector('.pd-menu'), R=m.getBoundingClientRect(); if(R.left<0||R.right>vw+0.5) out.push(id+' menu outside the screen'); if(m.scrollWidth>m.clientWidth+1) out.push(id+' menu scrolls sideways');
    m.querySelectorAll('.pd-it').forEach(it=>{ if(it.scrollWidth>it.clientWidth+1) out.push(id+' item cut: '+it.textContent); if(it.getBoundingClientRect().height<43.5) out.push(id+' item under 44 pt'); });
    if(document.documentElement.scrollWidth>vw+1) out.push(id+' open: the page scrolls sideways'); btn.click(); }
  return out; },vw);
for(const [w,fs] of [[390,null],[320,null],[390,'24px'],[390,'30px']]){ await A.setViewport({width:w,height:844,isMobile:true,hasTouch:true}); if(fs) await A.addStyleTag({content:`html{font-size:${fs}!important}`}); await W(300);
  await ev(()=>document.querySelector('#wkPaces').scrollIntoView()); const pr=await menuCheck(w); ok(`${w} pt${fs?' at '+fs+' text':''}: both menus fit; nothing scrolls sideways; items whole and 44 pt`, !pr.length, pr.slice(0,4).join(' | ')); }
await ev(()=>document.querySelectorAll('style').forEach(s=>{ if(/font-size:(24|30)px/.test(s.textContent)) s.remove(); })); await A.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await W(300);
await lib.tpPick(A,'1000','interval'); await W(300);
ok('picking from the menus sets the title and the buttons ("Distance: 1000 m", "Effort: Interval")', await ev(()=>document.querySelector('#wkPaces .tp-title').textContent==='1000 m at interval pace (VO2max)'&&document.querySelector('#tpDBtn').innerText.replace(/\s+/g,' ').trim()==='Distance: 1000 m'&&document.querySelector('#tpEBtn').innerText.replace(/\s+/g,' ').trim()==='Effort: Interval'), await ev(()=>document.querySelector('#wkPaces .tp-title').textContent));
await A.reload(); await A.waitForFunction(()=>window.MSApp); await W(800); await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=workouts]').click(); }); await W(600);
ok('the selection is remembered', await ev(()=>/1000 m at interval/.test(document.querySelector('#wkPaces .tp-title').textContent)));
await lib.tpPick(A,'t180',null); await W(200);
ok('a time selection: Start workout is off and says why', await ev(()=>document.querySelector('#tpStart').disabled&&/needs a distance/.test(document.querySelector('#tpStartWhy').textContent)));

console.log('2. suggestions = docs/training-rules.md');
const md=fs.readFileSync(path.join(__dirname,'..','docs','training-rules.md'),'utf8');
const rows=md.split('## Worked examples')[1].split('\n').filter(l=>/^\| [a-z0-9]+ \| /.test(l)).map(l=>l.split('|').slice(1,-1).map(x=>x.trim()));
const mis=[]; for(const [e,d,rt,reps,rest] of rows){ const r=await ev((d,e,rt)=>MSApp.trainRule(d,e,+rt),d,e,rt); if(r.reps!==+reps||r.rest!==+rest) mis.push(`${e} ${d}: ${r.reps}/${r.rest} ≠ ${reps}/${rest}`); }
ok(`every worked example in the doc (${rows.length}) matches the app`, rows.length>=20&&!mis.length, mis.slice(0,3).join(' | '));
await lib.tpPick(A,'800','cv'); await W(200); await ev(()=>document.querySelector('#tpStart').click()); await W(500);
const sg=await ev(()=>MSApp.trainSuggest()), sh=await ev(()=>({t:document.querySelector('#wsTitle').textContent,why:document.querySelector('.ws-why').textContent,reps:document.querySelector('#wsReps').value,rest:document.querySelector('#wsRest').value,sum:document.querySelector('#wsSum').textContent}));
ok('the sheet: "6 × 800 m at CV pace, 0:45 rest", its reason, steppers pre-filled', sg.reps===6&&sg.rest===45&&sh.t==='6 × 800 m at CV pace, 0:45 rest'&&sh.reps==='6'&&sh.rest==='0:45'&&/^CV: 800–2000 m, 45–90 s rest/.test(sh.why)&&/4\.8 km at CV pace in all/.test(sh.sum), JSON.stringify(sh));
ok('…on a team: a Share with coaches switch, off (remembered setting)', await ev(()=>{ const c=document.querySelector('#modal [data-share]'); return !!c&&!c.checked; }));

console.log('3. my own reps and rest are remembered (per distance and effort)');
await ev(()=>{ const r=document.querySelector('#wsReps'); r.value='5'; r.dispatchEvent(new Event('input',{bubbles:true})); const t=document.querySelector('#wsRest'); t.value='1:30'; t.dispatchEvent(new Event('change',{bubbles:true})); }); await W(200);
ok('the title follows the steppers', await ev(()=>document.querySelector('#wsTitle').textContent==='5 × 800 m at CV pace, 1:30 rest'));
await ev(()=>document.querySelector('#modal [data-x=go]').click()); await W(500);
ok('Choose runners opens the runner picker (Select all, Girls, Boys)', await ev(()=>['all','G','B'].every(k=>!!document.querySelector(`#modal [data-pk="${k}"]`))||!!document.querySelector('#modal .pick-bar')));
await ev(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
await ev(()=>document.querySelector('#tpStart').click()); await W(400);
ok('800 m at CV: my 5 × 800, 1:30 rest is back, with "Back to the suggestion"', await ev(()=>document.querySelector('#wsReps').value==='5'&&document.querySelector('#wsRest').value==='1:30'&&!!document.querySelector('#modal [data-x=sugg]')&&/remembered/.test(document.querySelector('.ws-why').textContent)));
await ev(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
await lib.tpPick(A,'1000',null); await W(200); await ev(()=>document.querySelector('#tpStart').click()); await W(400);
ok('another distance keeps its own suggestion (4 × 1000 m, 0:45)', await ev(()=>document.querySelector('#wsReps').value==='4'&&document.querySelector('#wsRest').value==='0:45'&&!document.querySelector('#modal [data-x=sugg]')));
await ev(()=>{ document.querySelector('[data-wk-rk=jog]').click(); }); await W(200);
ok('rest as a jog: "4 × 1000 m at CV pace, 200 m jog", with its time for the middle runner', await ev(()=>/^4 × 1000 m at CV pace, 200 m jog$/.test(document.querySelector('#wsTitle').textContent)&&/about \d:\d\d/.test(document.querySelector('#wsJogT').textContent)), await ev(()=>document.querySelector('#wsTitle').textContent));
await ev(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
await lib.tpPick(A,'800',null); await W(200); await ev(()=>document.querySelector('#tpStart').click()); await W(400);
await ev(()=>document.querySelector('#modal [data-x=sugg]').click()); await W(500);
ok('Back to the suggestion: 6 × 800 m, 0:45 again', await ev(()=>document.querySelector('#wsReps').value==='6'&&document.querySelector('#wsRest').value==='0:45'));

console.log('4. Start: runners and pace groups, each stopwatch’s targets from the engine');
await ev(()=>document.querySelector('#modal [data-x=go]').click()); await W(500);
await ev(()=>document.querySelector('#modal [data-pk=all]').click()); await W(200); await ev(()=>document.querySelector('#modal [data-x=next]').click()); await W(500);
const fl=await ev(()=>({wk:(document.querySelector('#modal .flow-wk')||{}).textContent||'',cards:[...document.querySelectorAll('#modal .grp-card')].map(c=>[...c.querySelectorAll('[data-grp]')].map(s=>s.dataset.grp))}));
const gOf=id=>id[0]; // fake-season ids: g… girls, b… boys
ok('step 2: the workout fixed ("6 × 800m CV, 0:45 rest"), pace groups suggested, never mixing girls and boys', fl.wk==='6 × 800m CV, 0:45 rest'&&fl.cards.length>=2&&fl.cards.every(c=>new Set(c.map(gOf)).size===1), JSON.stringify(fl));
const listGroups=await ev(()=>MSApp.teamPaces({d:'800',e:'cv'}).secs.flatMap(s=>s.groups.map(G=>G.map(r=>r.id).sort().join())).sort().join(' | '));
ok('…the same groups as the paces list', fl.cards.map(c=>c.slice().sort().join()).sort().join(' | ')===listGroups, listGroups);
await ev(()=>document.querySelector('#modal [data-x=startnow]').click()); await W(1200);
const T=await ev(()=>[...document.querySelectorAll('#grid .watch.wrow')].map(n=>{ const m=MSApp.watchMeta(n.dataset.id); return {id:n.dataset.id,ids:m.ids,cps:m.plan&&m.plan.cps,rest:m.plan&&m.plan.rest,reps:m.plan&&m.plan.reps}; }));
const tg=[]; for(const t of T){ const mid=await ev(ids=>{ const P=ids.map(id=>({id,p:MSApp.paceEngine(id)})).filter(x=>x.p).sort((a,b)=>b.p.V-a.p.V); return P[Math.floor((P.length-1)/2)].id; },t.ids);
  const want=(await ev((id)=>MSApp.workoutPace(id,'cv'),mid))*800/1609.34; const got=t.cps&&t.cps[t.cps.length-1]; if(!t.cps||Math.abs(got-want)>0.05||t.rest!==45||t.reps!==6) tg.push(`${t.ids.join('+')}: ${got&&got.toFixed(2)} vs ${want.toFixed(2)} reps ${t.reps} rest ${t.rest}`); }
ok(`every stopwatch (${T.length}) runs 6 × 800 with 0:45 rest at its own runner’s (or group middle’s) CV target`, T.length>=4&&!tg.length, tg.slice(0,3).join(' | '));
ok('they are private (Share was off): no Shared workouts heading, nothing on the team', await ev(()=>document.querySelector('.grid-sec.sec-sh').hidden&&!document.querySelector('#grid .watch.is-sh')));

console.log('5. two coaches: private stays private; shared appears live and takes laps from anyone');
await A.evaluate(()=>document.querySelector('.tab[data-tab=watches]').click()); await B.evaluate(()=>document.querySelector('.tab[data-tab=watches]').click()); await W(600);
const ids0=T.map(t=>t.id);
await A.evaluate(id=>MSApp.tapRow(id),ids0[0]); await W(3000);
ok('private stopwatches (started, lapped) never reach the other phone', await B.evaluate(ids=>!ids.some(id=>document.querySelector(`#grid .watch[data-id="${id}"]`)||MSApp.watchMeta(id)),ids0));
const bPriv=await B.evaluate(()=>MSApp.addWatch('B private',null,false)); await W(300);
const rB0=await B.evaluate(id=>{ const r=document.querySelector(`#grid .watch[data-id="${id}"]`).getBoundingClientRect(); return [Math.round(r.top+scrollY),Math.round(r.height)].join(); },bPriv);
// A shares one: it appears on B in Shared workouts within 2 s, above B's own rows; B's own row doesn't move while B is touching
await B.bringToFront(); await B.evaluate(()=>{ const d=()=>document.querySelector('#grid').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); d(); window.__t=setInterval(d,300); });
const t0=Date.now(), shId=await A.evaluate(()=>MSApp.addWatch('Shared 1',null,true));
const got=await waitFor(B,id=>!!MSApp.watchMeta(id),shId,2000); const dt=Date.now()-t0;
ok(`a shared stopwatch reaches the other coach within 2 s (${(dt/1000).toFixed(1)} s)`, got, dt);
await W(600); const rB1=await B.evaluate(id=>{ const r=document.querySelector(`#grid .watch[data-id="${id}"]`).getBoundingClientRect(); return [Math.round(r.top+scrollY),Math.round(r.height)].join(); },bPriv);
ok('…while that coach is touching the screen it waits: their own row doesn’t move', rB0===rB1, rB0+' → '+rB1);
await B.evaluate(()=>clearInterval(window.__t)); await W(2400);
const lay=await B.evaluate((sh,me)=>{ const s=document.querySelector(`#grid .watch[data-id="${sh}"]`), m=document.querySelector(`#grid .watch[data-id="${me}"]`), h=document.querySelector('#grid .grid-sec.sec-sh'), h2=document.querySelector('#grid .grid-sec.sec-me');
  return {vis:!!s&&!s.classList.contains('pending')&&s.offsetParent!==null,above:s&&m&&s.getBoundingClientRect().top<m.getBoundingClientRect().top,heads:!h.hidden&&!h2.hidden,shCls:s&&s.classList.contains('is-sh'),meCls:m&&!m.classList.contains('is-sh')}; },shId,bPriv);
await B.evaluate(()=>window.scrollTo(0,0)); await B.screenshot({path:path.join(process.argv[2]||path.join(__dirname,'out'),'shots','e2e45-shared-workouts.png')}).catch(()=>{});
ok('…then it shows under "Shared workouts", above "On this phone"', lay.vis&&lay.above&&lay.heads&&lay.shCls&&lay.meCls, JSON.stringify(lay));
await B.evaluate(id=>MSApp.tapRow(id),shId); // B starts it
ok('the other coach starts it: running on both phones', await waitFor(A,id=>MSApp.watchState(id).status==='running',shId,3000));
await W(2600); await A.evaluate(id=>MSApp.tapRow(id),shId); await W(2600); await B.evaluate(id=>MSApp.tapRow(id),shId); // over SH_MERGE apart (closer = one lap)
ok('…laps from both coaches, the same on both phones', await waitFor(A,id=>MSApp.lapCount(id)===2,shId,3000)&&await waitFor(B,id=>MSApp.lapCount(id)===2,shId,3000));
ok('B’s private stopwatch never went to A', !(await A.evaluate(id=>!!MSApp.watchMeta(id),bPriv)));
await A.evaluate(()=>{ document.querySelector('#newBtn').click(); }); await W(400);
ok('the + New sheet has the Share with coaches switch', await A.evaluate(()=>!!document.querySelector('#modal [data-share]')));
await A.evaluate(()=>{ const c=document.querySelector('#modal [data-share]'); c.checked=false; c.dispatchEvent(new Event('change')); document.querySelector('#modal [data-x=no]').click(); }); await W(300);
await W(2600); await A.evaluate(id=>MSApp.tapRow(id),shId); await W(1700);
ok('turning Share off keeps a shared workout shared (its laps still reach the other coach)', await waitFor(B,id=>MSApp.lapCount(id)===3,shId,3000));
await A.reload(); await A.waitForFunction(()=>window.MSApp); await W(1500);
await A.evaluate(id=>MSApp.tapRow(id),shId); await W(300);
ok('…also after a reload', await waitFor(B,id=>MSApp.lapCount(id)===4,shId,4000));
const q=await A.evaluate(()=>MSApp.addWatch('Private again',null)); await W(300); await A.evaluate(id=>MSApp.tapRow(id),q); await W(2500);
ok('a new stopwatch with Share off stays private', !(await B.evaluate(id=>!!MSApp.watchMeta(id),q)));
await A.evaluate(id=>{ document.querySelector(`#grid .watch[data-id="${id}"] [data-act=menu]`).click(); },q); await W(300);
await A.evaluate(()=>document.querySelector('#modal [data-m=share]').click()); await W(300);
ok('Share with coaches from its menu: it reaches the other coach, with its laps', await waitFor(B,id=>!!MSApp.watchMeta(id)&&MSApp.lapCount(id)===0,q,4000)||await waitFor(B,id=>!!MSApp.watchMeta(id),q,2000));
ok('no page errors', !errs.length, errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
