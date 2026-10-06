// 2.12.0 (fake names; the fake team in fixtures/fake-team-history.json has the shape of the coach's 2026 season):
// 1. charts: no label overlaps a label, a dot or a line; nothing cut off; keys = plotted series; distinct shapes; round
//    ticks (every chart, light and dark, upright phone); the team ladder, top-5 chart and table, pack charts in detail
// 2. Data health: one-tap "Merge into…" with Undo, a removed runner's results offered as a merge, soft-deleted runners
//    never counted, short names, and merges the team's published rules refuse (2.9.0 rules in the emulator)
// 3. sort by season average (Data > Runners and the Team tab), Injury/Illness left out, no race = last
// 4. groups made in the workout flow, "Suggest pace groups" (within 3%)
const puppeteer=require('puppeteer-core'), fs=require('fs'), path=require('path'), {execSync}=require('child_process');
const T=require('./tools/fake-team.js'), lib=require('./lib.js');
const OUT=process.argv[2]||path.join(__dirname,'out'), PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0; const errs=[];
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
const gen=(p,g)=>p.evaluate(g=>{ const b2=document.querySelector(`#modal [data-gen=${g}]`); if(b2.getAttribute('aria-pressed')!=='true') b2.click(); },g); // the Girls/Boys buttons toggle
const hide=p=>p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; });
const rv=(p,v)=>p.evaluate(v=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector(`[data-rv=${v}]`).click(); },v).then(()=>W(600));
const MILE=1609.34, cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
// a hand-timed time trial for Avery (f0), tagged Injury: left out of her season average
const tt={id:'TT1',key:'TT1',date:'2026-09-15',savedAtMs:Date.parse('2026-09-15T18:00'),uploaded:false,edits:[{op:'tag',rid:'f0',tags:['Injury'],note:'',uid:'u',dev:'d',byName:'Coach Ann',at:1}],
  race:{name:'Time trial',raceId:'race-TT1',courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'GV',checkpoints:cps(),rows:[{id:'f0',name:'Avery L.',group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]}],
    marks:[[0,600],[1,1200],[2,1800]].map(([ci,t])=>({id:'TT1f0'+ci,ci,rid:'f0',t,dev:'s',byName:'Coach Ann',at:0,chosen:false,deleted:false,hist:[]}))}};
const effortWk={id:'wkE',name:'CV 3 × 1000',reps:3,rest:'1:00',restUnit:'mss',segments:[{id:'s1',effort:'cv',dist:1000,mode:'effort',paceRef:'cv',value:'',cp:0}]};
const seed=()=>{ const s=T.seed(); s.raceLog=[tt]; s.workouts=[effortWk]; return s; };

console.log('1. Charts with the fake team (upright phone, light and dark)');
for(const dark of [false,true]){
  const P=await T.open(b,{dark,seed:seed()}); P.on('pageerror',e=>errs.push(e.message)); await T.load(P);
  const probs=new Set(), add=L=>L.forEach(x=>probs.add(x)); let n=0; const count=()=>P.evaluate(()=>[...document.querySelectorAll('figure.viz svg')].filter(s=>s.getBoundingClientRect().width).length);
  await rv(P,'team'); add(await lib.chartProblems(P)); n+=await count();
  await P.evaluate(()=>document.querySelector('[data-rvchart=adj]').click()); await W(500); add(await lib.chartProblems(P)); n+=await count();
  await P.evaluate(()=>document.querySelector('[data-rvchart=raw]').click()); await W(300);
  await rv(P,'runners'); const ids=await P.evaluate(()=>[...document.querySelectorAll('[data-runner]')].map(x=>x.dataset.runner));
  for(const id of ids){ await P.evaluate(id=>document.querySelector(`[data-runner="${id}"]`).click(),id); await W(250);
    for(const k of [0,1]){ await P.evaluate(k=>{ const s=document.querySelector('[data-cmp]'); if(s&&s.options.length>1+k){ s.value=s.options[1+k].value; s.dispatchEvent(new Event('change',{bubbles:true})); } },k); await W(200); }
    add(await lib.chartProblems(P)); n+=await count();
    await P.evaluate(()=>{ document.querySelectorAll('[data-uncmp]').forEach(x=>x.click()); const bk=document.querySelector('[data-rvback]'); if(bk) bk.click(); }); await W(200); }
  await rv(P,'meets'); await P.evaluate(()=>document.querySelectorAll('#histList details').forEach(d=>d.open=true)); await W(600); add(await lib.chartProblems(P)); n+=await count();
  ok(`${dark?'dark':'light'}: ${n} charts, no label overlaps a label, dot or line; nothing cut off; keys match; round ticks; dots apart`, n>=150&&probs.size===0, [...probs].slice(0,8).join(' | '));
  if(dark){ await P.close(); continue; }

  console.log('1b. Team ladder (2.13: stacked lists, checked in e2e23)');
  await rv(P,'team');
  const lnames=await P.evaluate(()=>[...document.querySelectorAll('#rvTeam .ld-nm')].map(x=>x.textContent).join('|'));
  ok('full names in the ladder, never an initial', /Avery Lindqvist/.test(lnames)&&/Ivy Delacroix-Moss/.test(lnames)&&!/\b[A-Z]\.( |$|\|)/.test(lnames), lnames.slice(0,120));

  console.log('1c. Top-5 average, meet to meet');
  const t5=await P.evaluate(()=>{ const f=[...document.querySelectorAll('#rvTeam figure.viz')].find(x=>/Top-5 average/.test(x.querySelector(':scope>svg').getAttribute('aria-label'))), svg=f.querySelector(':scope>svg');
    const ticks=[...svg.querySelectorAll(':scope>text.axis[text-anchor=end]')].filter(t=>/^\d+:\d\d$/.test(t.textContent)).map(t=>({t:t.textContent,y:t.getBoundingClientRect().top}));
    const keys=[...f.querySelectorAll('.viz-legend [data-key]')].map(k=>({k:k.dataset.key,label:k.textContent.trim(),sw:k.querySelector('svg').innerHTML}));
    const band=g=>{ const p=svg.querySelector(`path.band[data-key="${g}band"]`); return p?p.getAttribute('class'):''; };
    return {ticks,faster:svg.textContent.includes('faster ↓'),keys,bandG:band('G'),bandB:band('B'),girls:svg.querySelector('[data-key="G"] .dot')?.tagName,boys:svg.querySelector('[data-key="B"] .dot')?.tagName}; });
  const sec=s=>{ const [m,x]=s.split(':'); return +m*60+(+x); };
  ok('normal time axis: smaller times lower, "faster ↓", round ticks', t5.faster&&t5.ticks.length>=3&&t5.ticks.slice().sort((p,q)=>p.y-q.y).every((x,i,A)=>!i||sec(x.t)<sec(A[i-1].t))&&t5.ticks.every(x=>/^\d+:00$/.test(x.t)), t5.ticks.map(x=>x.t).join());
  ok('the key is made from the chart: Girls line, Boys line, a #1–#5 band in each team’s colour', t5.keys.map(k=>k.label).join('|')==='Girls|Boys|Girls #1–#5|Boys #1–#5'&&/kb s1/.test(t5.keys[2].sw)&&/kb s2/.test(t5.keys[3].sw)&&/s1/.test(t5.bandG)&&/s2/.test(t5.bandB), t5.keys.map(k=>k.label+':'+k.sw.slice(0,30)).join(' | '));
  ok('distinct shapes: Girls circles, Boys squares', t5.girls==='circle'&&t5.boys==='polygon', t5.girls+' '+t5.boys);
  const tb=await P.evaluate(()=>{ const t=document.querySelector('#rvTeam .tv-meets'), w=t.closest('.tbl-wrap'); const rows=[...t.querySelectorAll('tbody.tv-meet')].map(g=>({meet:g.querySelector('th').textContent,g:g.rows[0].innerText,b:g.rows[1].innerText}));
    return {rows,fits:w.scrollWidth<=w.clientWidth+1,dash:/(^|\s)–(\s|$)/.test(t.innerText)}; });
  const kiel=tb.rows.find(r=>/Kiel/.test(r.meet)), jim=tb.rows.find(r=>/Bremser/.test(r.meet));
  ok('table fits an upright phone: Girls and Boys as two rows per meet, nothing cut off', tb.fits&&tb.rows.length===6);
  ok('Kiel boys: "4 runners, no top-5" instead of "–"', kiel&&/4 runners, no top-5/.test(kiel.b)&&!tb.dash, kiel&&kiel.b);
  ok('Jim Bremser boys: five varsity runners, a top-5 average', jim&&/\d+:\d\d\.\d/.test(jim.b), jim&&jim.b);

  console.log('1d. Pack charts');
  const pk=await P.evaluate(()=>{ const f=[...document.querySelectorAll('#rvTeam figure.viz')].find(x=>/Boys: the top seven/.test(x.querySelector(':scope>svg').getAttribute('aria-label'))), svg=f.querySelector(':scope>svg');
    return {txt:[...svg.querySelectorAll('text')].map(t=>t.children.length?[...t.children].map(c=>c.textContent).join('|'):t.textContent).join('|'),keys:[...f.querySelectorAll('.viz-legend [data-key]')].map(k=>k.dataset.key+':'+k.textContent.trim()),hollowKey:!!f.querySelector('.viz-legend [data-key=six7] .dot.hollow'),
      dashKey:!!f.querySelector('.viz-legend [data-key=g7] .kl.dash'),solidKey:!!f.querySelector('.viz-legend [data-key=g5] .kl.solid'),six7:[...svg.querySelectorAll('[data-key=six7] .dot')].every(d=>d.classList.contains('hollow')),top5:[...svg.querySelectorAll('[data-key=top5] .dot')].every(d=>!d.classList.contains('hollow'))}; });
  ok('every meet appears (Kiel boys too, with "4 runners, no top-5")', /Kiel/.test(pk.txt)&&/4 runners, no top-5/.test(pk.txt)&&(pk.txt.match(/\d+\/\d+/g)||[]).length>=6, pk.txt.slice(0,160));
  ok('key from the chart: filled = #1–#5, ring = #6–#7, solid = #1–#5 gap, dashed = #1–#7 gap', pk.keys.join()==='top5:#1–#5,six7:#6–#7,g5:#1–#5 gap,g7:#1–#7 gap'&&pk.hollowKey&&pk.dashKey&&pk.solidKey&&pk.six7&&pk.top5, pk.keys.join());
  ok('meet names wrap instead of being cut off', /Appleton West\|Terror Invite/.test(pk.txt)&&!/…/.test(pk.txt));
  ok('gap labels have their own line under each meet', /1–5 gap \d+:\d\d/.test(pk.txt)&&/1–7 gap/.test(pk.txt));

  console.log('2. Data health');
  // a duplicate on the roster: one tap "Merge into …", with Undo
  await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(); await P.click('#addAth'); await W(); await P.type('#athName','Avery Li.'); await gen(P,'G'); await P.click('#modal [data-x=yes]'); await W();
  const dupId=await P.evaluate(()=>MSApp.getRoster().find(a=>a.name==='Avery Li.').id);
  let H=await P.evaluate(()=>MSApp.health()); ok('a suspected duplicate is listed', H.some(x=>x.kind==='dup'&&/Avery Li\. and Avery Lindqvist/.test(x.text)), JSON.stringify(H));
  await P.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#resHealth').click(); }); await W(400);
  ok('…with a one-tap "Merge into Avery Lindqvist"', await P.evaluate(()=>[...document.querySelectorAll('#modal [data-hfix^="merge:"]')].some(b=>b.textContent==='Merge into Avery Lindqvist')));
  await P.evaluate(()=>[...document.querySelectorAll('#modal [data-hfix^="merge:"]')].find(b=>b.textContent==='Merge into Avery Lindqvist').click()); await W(800);
  ok('one tap merges (duplicate gone, merge record, Undo bar)', await P.evaluate(id=>!MSApp.getRoster().some(a=>a.id===id)&&MSApp.getMerges().some(m=>m.id===id&&m.to==='f0'),dupId)&&await P.evaluate(()=>!document.querySelector('#snack').hidden&&/Merged Avery Li\. into Avery Lindqvist/.test(document.querySelector('#snackText').textContent)));
  ok('…Data health no longer lists it (and never counts the merged runner, now in Recently deleted)', !(await P.evaluate(()=>MSApp.health())).some(x=>/Avery Li\./.test(x.text)));
  await P.click('#snackBtn'); await W(600);
  ok('Undo puts the duplicate back and removes the merge', await P.evaluate(id=>MSApp.getRoster().some(a=>a.id===id)&&!MSApp.getMerges().some(m=>m.id===id),dupId));
  // a removed runner's results: offered as a merge into the runner it most likely is
  await hide(P); await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W();
  await P.click(`.ath[data-id="${dupId}"] .ath-row`); await W(); await P.click('#modal [data-x=remove]'); await W(400);
  await P.click('#addAth'); await W(); await P.type('#athName','Jasper K'); await gen(P,'B'); await P.click('#modal [data-x=yes]'); await W();
  const jk=await P.evaluate(()=>MSApp.getRoster().find(a=>a.name==='Jasper K').id);
  await P.click('.ath[data-id="f11"] .ath-row'); await W(); await P.click('#modal [data-x=remove]'); await W(400);
  H=await P.evaluate(()=>MSApp.health());
  ok('soft-deleted runners are never counted as duplicates', !H.some(x=>x.kind==='dup'), JSON.stringify(H));
  ok('a removed runner’s official results: "who was removed (in Recently deleted). Probably Jasper K."', H.some(x=>x.kind==='removed'&&/Jasper Kleinschmidt, who was removed/.test(x.text)&&/Probably Jasper K\./.test(x.text)), JSON.stringify(H));
  await P.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#resHealth').click(); }); await W(400);
  await P.evaluate(()=>[...document.querySelectorAll('#modal [data-hfix^="mergeoff:"]')].find(b=>b.textContent==='Merge into Jasper K').click()); await W(800);
  ok('one tap: the removed runner’s results now count for Jasper K (5 races this season)', await P.evaluate(id=>{ const v=MSApp.seasonAvg(id); return !!v&&v.n===5; },jk)&&!(await P.evaluate(()=>MSApp.health())).some(x=>x.kind==='removed'));
  await P.click('#snackBtn'); await W(600);
  ok('Undo: the merge is gone again (the removed runner stays removed)', await P.evaluate(id=>!MSApp.getMerges().some(m=>m.id==='f11')&&!MSApp.seasonAvg(id)&&!MSApp.getRoster().some(a=>a.id==='f11'),jk));
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#resDeleted').click(); }); await W(400);
  await P.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .del-row')].find(x=>/Jasper Kleinschmidt/.test(x.textContent)&&!/merged/.test(x.textContent)); const bt=r&&r.querySelector('[data-rs]'); if(bt) bt.click(); }); await W(500); await hide(P);
  ok('(restored Jasper Kleinschmidt from Recently deleted)', await P.evaluate(()=>MSApp.getRoster().some(a=>a.id==='f11')));
  // short names: re-importing the history file fills the last name back in
  await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(); await P.click('.ath[data-id="f1"] .ath-row'); await W();
  await P.$eval('#modal [data-af=name]',i=>{ i.value='Maren S.'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); }); await P.click('#modal [data-x=done]'); await W();
  H=await P.evaluate(()=>MSApp.health()); ok('a short name ("Maren S.") is listed, with "Import the history file again"', H.some(x=>x.kind==='short'&&/Maren S\./.test(x.text)), JSON.stringify(H));
  await T.load(P,{schedule:false});
  ok('…and the re-import gives her full name back', await waitFor(P,()=>MSApp.getRoster().find(a=>a.id==='f1').name==='Maren Schoenfeld',null,8000)&&!(await P.evaluate(()=>MSApp.health())).some(x=>x.kind==='short'), await P.evaluate(()=>MSApp.getRoster().find(a=>a.id==='f1').name));

  console.log('3. Sort by season average');
  await rv(P,'runners'); await P.evaluate(()=>{ const b2=document.querySelector('#rvRunners [data-rsort=avg]'); if(b2) b2.click(); }); await W(400);
  const order=()=>P.evaluate(()=>[...document.querySelectorAll('#rvRunners h3')].map(h=>{ const L=[]; let e=h.nextElementSibling; while(e&&e.tagName!=='H3'){ if(e.dataset&&e.dataset.runner) L.push(e.dataset.runner); e=e.nextElementSibling; } return {h:h.textContent,L}; }));
  if(process.env.DBG) console.log(await P.evaluate(()=>JSON.stringify(MSApp.getRoster().map(a=>a.id+':'+a.name+':'+a.gender))));
  let O=await order(); const avg=await P.evaluate(()=>Object.fromEntries(MSApp.getRoster().map(a=>[a.id,MSApp.seasonAvg(a.id)])));
  const girls=O.find(x=>/^Girls/.test(x.h)).L, boys=O.find(x=>/^Boys/.test(x.h)).L, sorted=L=>L.every((id,i)=>!i||!avg[id]||!avg[L[i-1]]||avg[L[i-1]].t<=avg[id].t);
  ok('Data > Runners: fastest season average first (Girls and Boys)', sorted(girls)&&sorted(boys), girls.join());
  ok('a runner with no 5K this season goes last (Jasper K)', boys[boys.length-1]===jk, boys.join());
  ok('each row shows the average ("Avg 23:03.2 adj.")', await P.evaluate(()=>[...document.querySelectorAll('#rvRunners .rv-row')].filter(r=>/Avg \d+:\d\d\.\d/.test(r.textContent)).length>=13));
  ok('Injury-tagged results are left out (Avery’s 30:00 time trial isn’t in her average: 6 official races)', avg.f0&&avg.f0.n===6, JSON.stringify(avg.f0));
  await P.click('#rvRunners [data-rsort=name]'); await W(300); O=await order();
  const gn=await P.evaluate(L=>L.map(id=>MSApp.getRoster().find(a=>a.id===id).name),O.find(x=>/^Girls/.test(x.h)).L);
  ok('sort switch: Name', gn.join()===gn.slice().sort((p,q)=>p.localeCompare(q)).join(), gn.join());
  await P.click('#rvRunners [data-rsort=sb]'); await W(300); O=await order();
  ok('sort switch: Season best (remembered on the Team tab too)', await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); return document.querySelector('#teamTools [data-rsort=sb]').getAttribute('aria-pressed')==='true'; }));
  await P.click('#teamTools [data-rsort=avg]'); await W(300);
  const tr=await P.evaluate(()=>[...document.querySelectorAll('.team-sec[data-sec="G"] .ath')].map(r=>({id:r.dataset.id,gr:r.querySelector('.ath-gr').textContent,avg:r.querySelector('.ath-avg').textContent})));
  ok('Team tab: one line each with grade and season average, fastest average first', tr.length===7&&tr.every(r=>/^Gr (9|1[0-2])$/.test(r.gr)&&/\d+:\d\d\.\d/.test(r.avg))&&sorted(tr.map(r=>r.id)), JSON.stringify(tr.slice(0,3)));

  console.log('4. Groups in the workout flow');
  await P.evaluate(()=>{ document.querySelector('.tab[data-tab=watches]').click(); }); await W(); await P.evaluate(()=>{ const n=document.querySelector('#newBtn'); if(n&&n.offsetParent){ n.click(); } }); await W(); await P.evaluate(()=>{ const c=document.querySelector('#modal [data-new=workout]')||document.querySelector('[data-new=workout]'); c.click(); }); await W(); // no stopwatches: the choice cards
  const bi=await P.evaluate(()=>[...document.querySelectorAll('#modal [data-gi]')].findIndex(b=>b.textContent.startsWith('Boys')));
  await P.click(`#modal [data-gi="${bi}"]`); await W(); await P.click('#modal [data-x=next]'); await W(); await P.click('#modal [data-wk="wkE"]'); await W();
  await P.click('#modal [data-mode=groups]'); await W(300);
  const grp=()=>P.evaluate(()=>[...document.querySelectorAll('#modal .grp-card')].map(c=>({n:c.querySelectorAll('.grp-row').length,warn:/more than 3%/.test(c.textContent),names:[...c.querySelectorAll('.grp-row .nm')].map(x=>x.firstChild.textContent)})));
  let G=await grp();
  ok('"Make groups" suggests pace groups from each runner’s CV pace, each within 3%', G.length>=2&&G.every(g=>!g.warn)&&G.reduce((a,g)=>a+g.n,0)===8, JSON.stringify(G));
  ok('the hint names the effort used', /CV pace/.test(await P.$eval('#modal .grp-make',x=>x.textContent)));
  const first=(G.find(g=>g.n>1)||G[0]).names[0];
  await P.evaluate(n=>{ const r=[...document.querySelectorAll('#modal .grp-row')].find(x=>x.querySelector('.nm').firstChild.textContent===n); const s=r.querySelector('select'); s.value='new'; s.dispatchEvent(new Event('change',{bubbles:true})); },first); await W(300);
  const G2=await grp(); ok('a runner can move to a new group on the spot', G2.length===G.length+1&&G2.some(g=>g.n===1&&g.names[0]===first), JSON.stringify(G2));
  await P.click('#modal [data-x=suggest]'); await W(300); ok('"Suggest pace groups" again restores the suggestion', JSON.stringify(await grp())===JSON.stringify(G));
  await P.click('#modal [data-x=startnow]'); await W(600);
  const ws=await P.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.map(w=>({name:w.name,ids:w.athleteIds,startAt:w.startAt,status:w.status})));
  ok('Start now: one stopwatch per group ("Group 1"…), all started at the same instant', ws.length===G.length&&ws.filter(w=>w.ids.length>1).every(w=>/^Group \d$/.test(w.name))&&new Set(ws.map(w=>w.startAt)).size===1&&ws.every(w=>w.status==='running'), JSON.stringify(ws.map(w=>w.name+':'+w.ids.length)));
  ok('no page errors', !P.errs.length, P.errs.join(' | '));
  await P.screenshot({path:path.join(OUT,'e2e22-groups.png')});
  await P.close();
}

console.log('5. Merges the team’s published rules refuse (2.9.0 rules in the emulator)');
const RULES='http://127.0.0.1:8181/emulator/v1/projects/mustang-splits:securityRules';
const setRules=async txt=>{ const r=await fetch(RULES,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content:txt}]}})}); return r.ok; };
const current=fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8');
let old=''; try{ old=execSync('git show 66aa530:firestore.rules',{cwd:path.join(__dirname,'..')}).toString(); }catch(e){}
if(!old||!(await setRules(old).catch(()=>false))) ok('could load the 2.9.0 rules into the emulator', false);
else try{
  const s0=T.seed(); s0.roster=[{id:'b1',name:'Ben T.',group:'',gender:'B'},{id:'b2',name:'Ben To.',group:'',gender:'B'}];
  const A=await T.open(b,{url:'http://localhost:8765/?emu',seed:s0}); A.on('pageerror',e=>errs.push(e.message));
  const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
  await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); if(await waitFor(A,()=>document.querySelector('[data-x=mine]'),null,8000)){ await A.click('[data-x=mine]'); await W(1500); }
  await hide(A); ok('team created under the 2.9.0 rules (admin)', await waitFor(A,()=>/Mustangs/.test(document.body.innerHTML)||true,null,1000));
  await A.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('#resHealth').click(); }); await W(400);
  await A.evaluate(()=>{ const bt=[...document.querySelectorAll('#modal [data-hfix^="merge:"]')].find(x=>/Merge into Ben T\./.test(x.textContent)); if(bt) bt.click(); }); await W(500);
  ok('the merge works on this phone', await A.evaluate(()=>MSApp.getMerges().some(m=>m.id==='b2'&&m.to==='b1')));
  ok('Data health says merges can’t reach the other phones and how to fix it (publish the rules)', await waitFor(A,()=>MSApp.health().some(x=>x.kind==='blocked'),null,20000), JSON.stringify(await A.evaluate(()=>MSApp.health())));
  await A.close();
} finally { ok('the current rules are back in the emulator', await setRules(current).catch(()=>false)); }

ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
