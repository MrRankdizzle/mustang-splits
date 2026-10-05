// 2.8: Results views (Meets | Runners | Team), runner cards, course factors, trends, team top-5, context tags.
// Saved races with known times are seeded straight into the phone's storage (date faked to Fri 10/2/2026):
//   Winagamie GC (reference) 9/1 and 10/2, Kiel HS 9/10 (exactly 4% slower for everyone), Brillion HS 9/28 (only 3
//   runners, so no factor), Winagamie 9/2/2025 (last year at the same meet), and one race not linked to a meet.
//   R3 (10/2) is 22 days after Kiel, so it must NOT count toward the Kiel factor (21-day window).
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); localStorage.setItem('fakeNow','2026-10-02T12:00:00'); const sd=localStorage.getItem('e2eSeed'); if(sd){ localStorage.setItem('mustang-splits:v1',sd); localStorage.removeItem('e2eSeed'); } }catch(e){}
    const f=localStorage.getItem('fakeNow'); if(f){ const off=Date.parse(f)-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; } });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const tab=async(p,t)=>{ await p.click(`.tab[data-tab=${t}]`); await W(); };
const snackText=p=>p.$eval('#snack',s=>s.hidden?'':s.textContent);
const closeModal=async p=>{ if(!(await p.$eval('#overlay',o=>o.hidden))){ const x=await p.$('#modal [data-x=done],#modal [data-x=no],#modal [data-x=cancel]'); if(x) await x.click(); else await p.evaluate(()=>document.querySelector('#overlay').hidden=true); await W(); } };
const text=(p,sel)=>p.$eval(sel,e=>e.innerText).catch(()=>'');
const OUT=process.argv[2]||'out', shot=(p,n)=>p.screenshot({path:`${OUT}/shots/e2e13-${n}.png`,fullPage:true}).catch(()=>{});
const noSideScroll=p=>p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);

// ---- seed ----
async function seed(p){
  await p.evaluate(()=>MSApp.setRace(null)); // a full save first (a brand-new phone has none)
  await p.evaluate(()=>{
    const MILE=1609.34, K='mustang-splits:v1', S=JSON.parse(localStorage.getItem(K)||'{}');
    const G=['Gina A','Hana B','Iris C','June D','Kara E','Lena F'], Bn=['Max P','Ned Q','Owen R','Paul S','Quin T'];
    S.roster=[...G.map((n,i)=>({id:'g'+i,name:n,group:'V',gender:'G'})),...Bn.map((n,i)=>({id:'b'+i,name:n,group:'V',gender:'B'}))];
    const cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
    S.courses=[{id:'cW',name:'Winagamie GC',checkpoints:cps()},{id:'cK',name:'Kiel HS',checkpoints:cps()},{id:'cB',name:'Brillion HS',checkpoints:cps()}];
    S.series=[{id:'sW',name:'Winagamie Invite'},{id:'sK',name:'Kiel Invite'},{id:'sW2',name:'Winagamie Meet'},{id:'sB',name:'Brillion Invite'}];
    S.meets=[{id:'mW25',seriesId:'sW',courseId:'cW',date:'2025-09-02',time:'',kind:'Invite',levels:['V','JV'],season:2025},
      {id:'mW',seriesId:'sW',courseId:'cW',date:'2026-09-01',time:'',kind:'Invite',levels:['V','JV'],season:2026},
      {id:'mK',seriesId:'sK',courseId:'cK',date:'2026-09-10',time:'',kind:'Invite',levels:['V','JV'],season:2026},
      {id:'mB',seriesId:'sB',courseId:'cB',date:'2026-09-28',time:'',kind:'Invite',levels:['V'],season:2026},
      {id:'mW2',seriesId:'sW2',courseId:'cW',date:'2026-10-02',time:'',kind:'Meet',levels:['V'],season:2026}];
    S.prs={g0:[{dist:5000,t:1150}]};
    const base={g0:1200,g1:1210,g2:1220,g3:1230,g4:1240,g5:1250,b0:1000,b1:1010,b2:1020,b3:1030,b4:1040};
    const r3={g0:1170,g1:1210,g2:1250,g3:1225,g4:1222,g5:1230,b0:990,b1:1000,b2:1010,b3:1020,b4:1030};
    let n=0;
    const race=(id,name,date,course,meet,series,div,times)=>{ const ids=Object.keys(times), rows=ids.map(k=>{ const a=S.roster.find(x=>x.id===k); return {id:k,name:a.name,group:'V',goal:null,goalTag:null,pr:null,sb:null,cells:[]}; });
      const marks=[]; ids.forEach(k=>{ const t=times[k]; [[0,t*0.30],[1,t*0.63],[2,t]].forEach(([ci,v])=>marks.push({id:id+k+ci,ci,rid:k,t:Math.round(v*10)/10,dev:'seed',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]})); });
      return {id,key:id,date,savedAtMs:Date.parse(date+'T15:00')+(n++),uploaded:false,edits:[],race:{name,raceId:'race-'+id,courseId:course,courseName:(S.courses.find(c=>c.id===course)||{}).name||'',goalSrc:'custom',meetId:meet,seriesId:series,division:div,checkpoints:cps(),rows,marks}}; };
    const pick=(o,keys,f=x=>x)=>Object.fromEntries(keys.map(k=>[k,f(o[k],k)]));
    const girls=['g0','g1','g2','g3','g4','g5'], boys=['b0','b1','b2','b3','b4'];
    S.raceLog=[
      race('LY','Winagamie Invite 2025','2025-09-02','cW','mW25','sW','GV',{g0:1260}),
      race('R1g','Winagamie Invite Girls','2026-09-01','cW','mW','sW','GV',pick(base,girls)),
      race('R1b','Winagamie Invite Boys','2026-09-01','cW','mW','sW','BV',pick(base,boys)),
      race('R2g','Kiel Invite Girls','2026-09-10','cK','mK','sK','GV',pick(base,girls,v=>Math.round(v*1.04*10)/10)),
      race('R2b','Kiel Invite Boys','2026-09-10','cK','mK','sK','BV',pick(base,boys,v=>Math.round(v*1.04*10)/10)),
      race('R4g','Brillion Invite Girls','2026-09-28','cB','mB','sB','GV',{g3:1300,g4:1300,g5:1300}),
      race('R3g','Winagamie Meet Girls','2026-10-02','cW','mW2','sW2','GV',pick(r3,girls)),
      race('R3b','Winagamie Meet Boys','2026-10-02','cW','mW2','sW2','BV',pick(r3,boys)),
      race('X','Time trial','2026-07-20',null,null,null,'',{g0:1300,g1:1310})];
    { const h=S.raceLog.find(x=>x.id==='R3g'), r=h.race.rows.find(x=>x.id==='g1'); r.pr=1220; r.sb=1215; } // stamped at the gun: Hana beats both (2.8.1 badge test)
    S.settings=S.settings||{}; S.settings.coachName='Coach Ann'; S.settings.coachAsked=true;
    localStorage.setItem('e2eSeed',JSON.stringify(S)); // copied into place before the app loads (the app saves its own state on unload)
  });
  await p.reload(); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(600);
}
const runnersView=async p=>{ await tab(p,'results'); await p.click('[data-rv=runners]'); await W(); };
const openRunner=async(p,id)=>{ await runnersView(p); if(await p.$('[data-rvback]')){ await p.click('[data-rvback]'); await W(); } await p.click(`[data-runner="${id}"]`); await W(); };
const trendIn=(p,id)=>p.$eval(`[data-runner="${id}"] .trend`,e=>e.textContent).catch(()=>'');
const backToList=async p=>{ if(await p.$('[data-rvback]')){ await p.click('[data-rvback]'); await W(); } };

console.log('1. views, course factors, trends (one phone, offline)');
const L=await phone('L',{block:true});
await seed(L);
await tab(L,'results');
ok('Results has Meets | Runners | Team, Meets first', (await L.$$eval('[data-rv]',x=>x.map(b=>b.textContent).join('|')))==='Meets|Runners|Team' && (await L.$eval('[data-rv=meets]',b=>b.getAttribute('aria-pressed')))==='true' && !(await L.$eval('#rvMeets',e=>e.hidden)));
ok('Meets view: the seeded races are there (Races on this phone) and stopwatch results after them', (await L.$$('#raceLogList details[data-entry]')).length===9 && await L.evaluate(()=>!!(document.querySelector('#raceLogWrap').compareDocumentPosition(document.querySelector('#resGrid'))&Node.DOCUMENT_POSITION_FOLLOWING)));
const F=await L.evaluate(()=>MSApp.courseFactors());
ok('reference course is Winagamie GC', F.ref==='cW' && F.refName==='Winagamie GC', F.ref);
ok('Kiel factor is exactly 1.04 (races 22 days apart left out)', Math.abs(F.f.cK-1.04)<1e-6, F.f.cK);
ok('Brillion has no factor (3 runners < 4)', F.f.cB==null);
await runnersView(L);
ok('Runners: Girls 6, Boys 5', (await L.$$eval('#rvRunners h3',x=>x.map(h=>h.textContent.replace(/\s+/g,' ').trim()).join('|')))==='Girls 6|Boys 5');
ok('the view is remembered on this phone', await L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.resView==='runners'));
const T={}; for(const id of ['g0','g1','g2','g3','g4','g5','b0']) T[id]=await trendIn(L,id);
ok('trend: Gina improving, Hana steady, Iris slowing', T.g0==='Improving'&&T.g1==='Steady'&&T.g2==='Slowing', JSON.stringify(T));
ok('trend thresholds: −1.45% is Steady (Kara), −1.60% is Improving (Lena)', T.g4==='Steady'&&T.g5==='Improving', T.g4+' '+T.g5);
ok('June: Brillion (no factor) is skipped, the adjusted races still give a label', T.g3==='Improving'||T.g3==='Steady', T.g3);
ok('row shows the latest race and season best', (await text(L,'[data-runner="g0"]')).includes('Last: Winagamie Meet Girls 19:30.0') && (await text(L,'[data-runner="g0"]')).includes('SB 19:30.0'));
await L.type('[data-rvq]','iri'); await W();
ok('search narrows the list (keeps focus)', (await L.$$('[data-runner]')).length===1 && await L.evaluate(()=>document.activeElement&&document.activeElement.matches('[data-rvq]')));
await L.$eval('[data-rvq]',i=>{ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W();

console.log('2. runner card');
await openRunner(L,'g0');
const card=await text(L,'#rvRunners');
ok('PR (19:10.0 from the PR list) and season best 19:30.0 at 5K', card.includes('19:10.0') && /Season best[\s\S]*19:30\.0/.test(card));
const races=await L.$$eval('#rvRunners .rv-race',x=>x.map(e=>e.innerText.replace(/\s+/g,' ')));
ok('every race this season, newest first (3)', races.length===3 && races[0].startsWith('Winagamie Meet Girls') && races[2].startsWith('Winagamie Invite Girls'), races.length);
ok('newest: time, pace, team place, season best', races[0].includes('19:30.0')&&races[0].includes('6:17/mi')&&races[0].includes('1st on the team')&&races[0].includes('season best'), races[0]);
ok('Kiel: vs season best at the time +0:48', races[1].includes('vs SB +0:48'), races[1]);
ok('first race of the season says so', races[2].includes('first race at'), races[2]);
ok('pacing pattern: starts fast 6.8%, slows most by Mile 2', card.includes('Starts fast: first segment 6.8% quicker') && card.includes('slows most by Mile 2'));
ok('last year at this meet: Winagamie Invite 21:00.0 → 20:00.0, −60.0', /Winagamie Invite\s+21:00\.0\s+20:00\.0\s+−60\.0/.test(card));
ok('season chart: 3 points, PR and season-best lines', (await L.$$eval('#rvRunners figure.viz',f=>f[0].querySelectorAll('.pt').length))===3 && (await L.$$eval('#rvRunners figure.viz',f=>f[0].querySelectorAll('.ref').length))===2);
ok('trend line in the header with the change', card.includes('Improving over the last 4 races') && card.includes('course-adjusted'));
await L.click('#rvRunners [data-rvchart=adj]'); await W();
ok('course-adjusted chart is labeled Winagamie GC equivalent', (await text(L,'#rvRunners')).includes('Course-adjusted = Winagamie GC equivalent'));
await L.click('#rvRunners .viz .pt'); await W();
ok('tapping a point shows its tooltip', (await L.$eval('#rvRunners .viz-tip',t=>!t.hidden&&t.textContent)).includes('/mi'));
await shot(L,'runner-card');
ok('no sideways scroll on the runner card', await noSideScroll(L));
await openRunner(L,'g3');
ok('June (raced Brillion): "Not enough runners have raced both Brillion HS and Winagamie GC yet."', (await text(L,'#rvRunners')).includes('Not enough runners have raced both Brillion HS and Winagamie GC yet.'));
await L.click('[data-rvback]'); await W();
ok('back returns to the list', !!(await L.$('[data-runner="g0"]')));
await openRunner(L,'g1');
ok('runner card: a race shows "New PR!" and "Season best!" badges from the bests stamped at the gun', await L.evaluate(()=>{ const r=document.querySelector('#rvRunners .rv-race'); return !!r&&r.innerText.includes('Winagamie Meet')&&r.innerText.includes('New PR!')&&r.innerText.includes('Season best!'); }));
ok('runner card: races without beaten bests show no badges', await L.evaluate(()=>{ const L2=[...document.querySelectorAll('#rvRunners .rv-race')]; return L2.length>1&&L2.slice(1).every(x=>!x.innerText.includes('New PR!')); }));
await openRunner(L,'g0');
await L.click('#rvRunners .rv-race'); await W(400);
ok('tapping a race opens it in Meets, scrolled to the runner, card flashing', !(await L.$eval('#rvMeets',e=>e.hidden)) && await L.evaluate(()=>{ const d=document.querySelector('#raceLogList details[data-entry="R3g"]'); const c=d&&d.querySelector('.rcard[data-rrow="g0"]'); return d.open&&c&&c.classList.contains('flash'); }));

console.log('3. team view');
await tab(L,'results'); await L.click('[data-rv=team]'); await W(); await L.click('#rvTeam [data-rvchart=raw]'); await W();
let tv=await L.$$eval('#rvTeam .tv-meets tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
ok('Varsity by default: 3 meets with 5+ finishers (Brillion left out)', tv.length===3 && (await L.$eval('[data-teamlvl=V]',b=>b.getAttribute('aria-pressed')))==='true', tv.length);
ok('Winagamie 9/1: Girls top-5 20:20.0, spread 0:40; Boys 17:00.0, 0:40', tv[0].includes('20:20.0 0:40 17:00.0 0:40'), tv[0]);
ok('Kiel raw: Girls 21:08.8', tv[1].includes('21:08.8'), tv[1]);
await L.click('#rvTeam [data-rvchart=adj]'); await W();
tv=await L.$$eval('#rvTeam .tv-meets tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
ok('Kiel adjusted: Girls 20:20.0 (Winagamie equivalent)', tv[1].includes('20:20.0'), tv[1]);
await L.click('#rvTeam [data-rvchart=raw]'); await W();
ok('chart: Girls and Boys lines, a spread band, a legend', (await L.$$('#rvTeam path.s1:not(.band)')).length===1 && (await L.$$('#rvTeam path.s2:not(.band)')).length===1 && (await L.$$('#rvTeam path.band')).length===2 && (await text(L,'#rvTeam .viz-legend')).includes('Girls'));
await shot(L,'team-view');
ok('no sideways scroll on the team view', await noSideScroll(L));
await L.click('[data-teamlvl=JV]'); await W();
ok('JV switch: no JV races yet', (await text(L,'#rvTeam')).includes('No JV 5K races in 2026–27'));
await L.click('[data-teamlvl=V]'); await W();

console.log('4. context tags');
await L.click('[data-rv=meets]'); await W();
await L.evaluate(()=>{ document.querySelector('#raceLogList details[data-entry="R3g"]').open=true; });
await L.click('#raceLogList details[data-entry="R3g"] .rcard[data-rrow="g1"] [data-rtag]'); await W();
ok('tag sheet: the six runner tags and a note with "No medical details"', (await L.$$('#modal [data-tg]')).length===6 && (await L.$eval('#modal [data-tgnote]',i=>i.placeholder))==='No medical details' && (await L.$eval('#modal [data-tgnote]',i=>i.maxLength))===60);
await L.click('#modal [data-tg="Illness"]'); await L.type('#modal [data-tgnote]','felt sick'); await L.click('#modal [data-x=yes]'); await W();
let ed=await L.evaluate(()=>{ const x=JSON.parse(localStorage.getItem('mustang-splits:v1')).raceLog; return null; });
ed=await L.evaluate(async()=>{ const r=await new Promise(res=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>{ const t=q.result.transaction('races').objectStore('races').get('R3g'); t.onsuccess=()=>res(t.result); }; }); return r.edits; });
ok('saved as an append-only edit {op:tag, rid, tags, note} with coach name', ed.length===1 && ed[0].op==='tag' && ed[0].rid==='g1' && ed[0].tags.join()==='Illness' && ed[0].note==='felt sick' && ed[0].byName==='Coach Ann', JSON.stringify(ed[0]));
ok('Undo bar: Tags saved', (await snackText(L)).includes('Tags saved'));
ok('the tag shows on the card', (await text(L,'#raceLogList details[data-entry="R3g"] .rcard[data-rrow="g1"]')).includes('⚑ Illness · felt sick'));
await runnersView(L); await backToList(L);
ok('tagged result left out of trends: Hana now "Not enough races yet"', (await trendIn(L,'g1'))==='Not enough races yet', await trendIn(L,'g1'));
await L.click('#rvRunners [data-extag]'); await W();
ok('switch off: Hana is Steady again; the switch is remembered', (await trendIn(L,'g1'))==='Steady' && await L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.excludeTagged===false));
await L.click('[data-rv=team]'); await W();
tv=await L.$$eval('#rvTeam .tv-meets tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
ok('team view with tagged results in: Winagamie 10/2 Girls top-5 20:11.4', tv[2].includes('20:11.4'), tv[2]);
await L.click('#rvTeam [data-extag]'); await W();
tv=await L.$$eval('#rvTeam .tv-meets tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
ok('switch on: Hana left out, Girls top-5 20:19.4', tv[2].includes('20:19.4'), tv[2]);
await openRunner(L,'g1');
ok('runner card: tag icon and line on the race; season best unchanged', (await text(L,'#rvRunners .rv-race')).includes('⚑ Illness · felt sick') && (await text(L,'#rvRunners')).includes('20:10.0'));
await openRunner(L,'g0');
ok('PR and season best are never changed by tags (Gina still 19:10.0 / 19:30.0)', (await text(L,'#rvRunners')).includes('19:10.0'));
// Undo
await L.click('[data-rv=meets]'); await W(); await L.evaluate(()=>{ document.querySelector('#raceLogList details[data-entry="R3g"]').open=true; });
await L.click('#raceLogList details[data-entry="R3g"] .rcard[data-rrow="g2"] [data-rtag]'); await W();
await shot(L,'tag-sheet');
await L.click('#modal [data-tg="Fell"]'); await L.click('#modal [data-x=yes]'); await W();
await L.click('#snackBtn'); await W();
ed=await L.evaluate(async()=>{ const r=await new Promise(res=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>{ const t=q.result.transaction('races').objectStore('races').get('R3g'); t.onsuccess=()=>res(t.result); }; }); return r.edits; });
ok('Undo appends the previous tags back (nothing rewritten)', ed.length===3 && ed[2].rid==='g2' && ed[2].tags.length===0 && ed[1].tags.join()==='Fell');
ok('after Undo the card has no tag', !(await text(L,'#raceLogList details[data-entry="R3g"] .rcard[data-rrow="g2"]')).includes('⚑'));
await L.click('#raceLogList details[data-entry="R3g"] .rcard[data-rrow="g2"] [data-rtag]'); await W();
ok('tag sheet History lists the tag changes', (await text(L,'#modal .ts-hist summary')).includes('2 changes'));
await closeModal(L);
// race tags
await L.click('#raceLogList details[data-entry="R3g"] .race-tags [data-rtag]'); await W();
ok('race tags: Heat, Mud, Wind', (await L.$$eval('#modal [data-tg]',x=>x.map(b=>b.textContent).join()))==='Heat,Mud,Wind');
await L.click('#modal [data-tg="Mud"]'); await L.click('#modal [data-x=yes]'); await W();
ok('race tag shows on the race', (await text(L,'#raceLogList details[data-entry="R3g"] .race-tags')).includes('Race: Mud'));
await runnersView(L); await backToList(L);
ok('a race tagged Mud is left out of trends (Iris now "Not enough races yet")', (await trendIn(L,'g2'))==='Not enough races yet', await trendIn(L,'g2'));
await openRunner(L,'g2');
ok('tagged races show hollow on the chart', (await L.$$('#rvRunners .viz .dot.hollow')).length===1);
// dark mode
await L.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]); await W();
await shot(L,'runner-dark');
ok('dark mode: the line uses the dark series color', (await L.$eval('#rvRunners .viz path.s1',e=>getComputedStyle(e).stroke))==='rgb(57, 135, 229)');
await L.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]); await W();
ok('light mode: series color', (await L.$eval('#rvRunners .viz path.s1',e=>getComputedStyle(e).stroke))==='rgb(42, 120, 214)');
await L.evaluate(()=>MSApp.purgeRunner('g1')); await W(800);
ed=await L.evaluate(async()=>{ const r=await new Promise(res=>{ const q=indexedDB.open('mustang-splits'); q.onsuccess=()=>{ const t=q.result.transaction('races').objectStore('races').get('R3g'); t.onsuccess=()=>res(t.result); }; }); return r.edits; });
ok('Delete permanently removes that runner\'s tags and note', !ed.some(v=>v.rid==='g1') && ed.some(v=>v.rid==='g2'), JSON.stringify(ed.map(v=>v.rid)));
await L.close();

console.log('5. team: grouped by season and meet, tags sync');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A'), B=await phone('B');
await seed(A);
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1500);
await closeModal(A); await tab(A,'results'); await A.click('[data-rv=meets]'); await W();
await A.click('[data-rlup]'); await W(2000);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(2500);
await tab(B,'results'); await B.click('[data-rv=meets]'); await W();
ok('B: Team history grouped by season (2026–27, 2025–26), then "Not linked to a meet"', await waitFor(B,()=>{ const h=[...document.querySelectorAll('#histList .hist-season')].map(x=>x.textContent); return h.length===3&&h[0].startsWith('2026–27')&&h[1].startsWith('2025–26')&&h[2].startsWith('Not linked to a meet'); },null,20000),
  await B.$$eval('#histList .hist-season',x=>x.map(e=>e.textContent).join('|')));
ok('B: meets newest first with Girls/Boys Varsity inside', await B.evaluate(()=>{ const s=document.querySelector('#histList .hist-meet'); return s && s.querySelectorAll('details').length===2 && s.innerText.includes('Girls Varsity') && s.innerText.includes('Boys Varsity'); }));
await shot(B,'meets-team');
ok('B: "Link past races" shortcut on the unlinked group', !!(await B.$('#histList [data-hlink]')));
await B.click('#histList [data-hlink]'); await W();
ok('it opens Link past races', !!(await B.$('#modal .link-sheet'))); await closeModal(B); await closeModal(B); await B.evaluate(()=>document.querySelector('#overlay').hidden=true); await W();
await B.evaluate(()=>{ const d=document.querySelector('#histList details[data-where=team]'); d.open=true; });
const bEntry=await B.evaluate(()=>document.querySelector('#histList details[data-where=team]').dataset.entry);
await B.click(`#histList details[data-entry="${bEntry}"] .rcard [data-rtag]`); await W();
await B.click('#modal [data-tg="Shoe issue"]'); await B.click('#modal [data-x=yes]'); await W(1200);
ok('A: the tag from B arrives', await waitFor(A,id=>{ const d=document.querySelector(`#histList details[data-entry="${id}"]`); if(!d) return false; d.open=true; return d.innerText.includes('⚑ Shoe issue'); },bEntry,20000));
await B.click('[data-rv=runners]'); await W(1500);
ok('B: Runners view works from Team history', (await B.$$('[data-runner]')).length===11 && (await trendIn(B,'g0'))==='Improving', await trendIn(B,'g0'));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
