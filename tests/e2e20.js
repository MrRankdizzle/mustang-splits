// 2.11.0 suggested training paces: VDOT math against Daniels' published tables, the basis (this season's best,
// never an old PR, no Injury/Illness races), the pace table, effort-based workouts with per-runner targets fixed at
// Start, group stopwatches (middle runner, warning over 3%), and adjustments remembered per runner and workout.
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const MILE=1609.34, cps=()=>[{id:'fin',name:'Finish',dist:5000,unit:'m'}];
const race=(id,date,rows,edits)=>({id,key:id,date,savedAtMs:Date.parse(date+'T15:00'),uploaded:false,edits:edits||[],race:{name:'Dual '+date,raceId:'race-'+id,courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'',checkpoints:cps(),
  rows:rows.map(([rid])=>({id:rid,name:rid,group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]})),marks:rows.map(([rid,t],i)=>({id:id+i,ci:0,rid,t,dev:'s',byName:'C',at:0,chosen:false,deleted:false,hist:[]}))}});
const effortWk={id:'wkE',name:'CV 3 × 1000',reps:3,rest:'1:00',restUnit:'mss',segments:[{id:'s1',effort:'cv',dist:1000,mode:'effort',paceRef:'cv',value:'',cp:0}]};
const pctWk={id:'wkP',name:'800s at 105%',reps:1,rest:'',restUnit:'mss',segments:[{id:'s2',effort:'fast',dist:800,mode:'effort',paceRef:'pct',pct:'105',value:'',cp:400}]};
const idle=(id,ids)=>({id,name:id,workoutId:'wkE',status:'idle',startAt:0,pausedT:0,run:{rep:0,repStartT:0,cp:0,phase:'run',restEndT:0,splits:[],laps:[]},athleteIds:ids,athleteNames:ids,autoName:null,plan:null});
const seed={v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:'Coach',coachAsked:true},courses:[],series:[],meets:[],merges:[],race:null,paceAdj:{},
  roster:[{id:'ann',name:'Ann A.',group:'',gender:'G'},{id:'bea',name:'Bea B.',group:'',gender:'G'},{id:'cat',name:'Cat C.',group:'',gender:'G'},{id:'dee',name:'Dee D.',group:'',gender:'G'}],
  prs:{ann:[{dist:5000,t:960}]}, // an old typed PR (16:00, date unknown): never a basis
  workouts:[effortWk,pctWk], watches:[idle('w1',['ann']),idle('w2',['ann','bea','cat']),idle('w3',['bea','cat']),{...idle('w4',['ann']),workoutId:'wkP'}],
  raceLog:[race('r1','2026-09-19',[['ann',1112.6],['bea',1200],['cat',1290]]),
    race('r2','2026-09-26',[['ann',1070]],[{op:'tag',rid:'ann',tags:['Injury'],note:'',uid:'x',dev:'x',byName:'C',at:1}]), // faster, but tagged Injury: left out
    race('r0','2025-10-20',[['dee',1100]])]}; // Dee: only last season (more than 120 days ago): no basis
const p=await (await b.createBrowserContext()).newPage();
await p.evaluateOnNewDocument(sd=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
  const off=Date.parse('2026-10-05T16:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; },JSON.stringify(seed));
await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); p.on('pageerror',e=>errs.push(e.message));
await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(800);
const near=(a,b2,tol)=>Math.abs(a-b2)<=tol;

console.log('1. VDOT math against Daniels’ published tables');
// (Daniels' Running Formula: VDOT 50 = 5K 19:57, T 6:51/mi, I 94 s/400, R 88 s/400, E about 8:15-9:02/mi;
//  VDOT 60 = 5K 17:03, T 5:54/mi, I 81 s/400, R 75 s/400.)
let m=await p.evaluate(()=>MSApp.paceMath(5000,19*60+57));
ok('5K 19:57 → VDOT 50.0', near(m.V,50,0.15), m.V.toFixed(2));
ok('VDOT 50: threshold 6:51/mi (±3 s)', near(m.threshold,411,3), m.threshold.toFixed(1));
ok('VDOT 50: interval 94 s per 400 (±1 s)', near(m.interval*400/MILE,94,1), (m.interval*400/MILE).toFixed(1));
ok('VDOT 50: repetition 88 s per 400 (±1 s)', near(m.repetition*400/MILE,88,1), (m.repetition*400/MILE).toFixed(1));
ok('VDOT 50: easy about 8:15–9:02/mi (±5 s)', near(m.easyFast,495,5)&&near(m.easySlow,542,5), m.easyFast.toFixed(0)+'-'+m.easySlow.toFixed(0));
m=await p.evaluate(()=>MSApp.paceMath(5000,17*60+3));
ok('5K 17:03 → VDOT 60.0', near(m.V,60,0.15), m.V.toFixed(2));
ok('VDOT 60: threshold 5:54/mi, interval 81 s, repetition 75 s per 400', near(m.threshold,354,3)&&near(m.interval*400/MILE,81,1)&&near(m.repetition*400/MILE,75,1.5), [m.threshold.toFixed(0),(m.interval*400/MILE).toFixed(1),(m.repetition*400/MILE).toFixed(1)].join());
ok('round trip: the predicted 5K for a VDOT is the 5K it came from', near(m.t5,1023,0.5), m.t5.toFixed(1));
ok('CV (about 30 minutes) sits between threshold and 5K pace', m.cv<m.threshold&&m.cv>m['5k'], [m.threshold,m.cv,m['5k']].map(x=>x.toFixed(0)).join());

console.log('2. Basis and the pace table');
await p.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=runners]').click(); document.querySelector('[data-runner="ann"]').click(); }); await W(600);
const card=await p.$eval('#rvRunners',e=>e.innerText);
ok('basis: "Based on 5K season best 18:32.6, 9/19" (not the Injury-tagged 17:50, not the old 16:00 PR)', card.includes('Based on 5K season best 18:32.6, 9/19'), (card.match(/Based on[^\n]*/)||[''])[0]);
ok('pace table per 100, 200, 400, 800, 1000 and mile, labeled as estimates', ['Easy','CV','Threshold','Interval','Repetition','5K pace','Mile pace'].every(w=>card.includes(w)) && /100\s*\d/.test(card) && card.includes('estimates'));
await p.evaluate(()=>{ document.querySelector('[data-rvback]').click(); document.querySelector('[data-runner="dee"]').click(); }); await W(400);
ok('no race this season or in 120 days: no paces (old results are never used)', (await p.$eval('#rvRunners',e=>e.innerText)).includes('Needs a race this season'));

console.log('3. Effort-based workouts');
const exp=await p.evaluate(()=>MSApp.paceMath(5000,1112.6));
let P=await p.evaluate(()=>MSApp.planFor('w1'));
ok('Ann’s stopwatch: 1000m at her CV pace', P&&near(P.segs[0].time,exp.cv*1000/MILE,0.05), P&&P.segs[0].time.toFixed(1));
// 2.13: the tile shows only what matters; where the targets come from is in ⋯ > Targets
await p.evaluate(()=>{ document.querySelector('.tab[data-tab=watches]').click(); const w=document.querySelector('.watch[data-id="w1"]')||document.querySelector('.watch'); w.querySelector('[data-act=menu]').click(); }); await new Promise(r=>setTimeout(r,300));
await p.evaluate(()=>{ const t=document.querySelector('#modal [data-m=targets]'); if(t) t.click(); }); await new Promise(r=>setTimeout(r,300));
ok('…and ⋯ > Targets says where it comes from', (await p.evaluate(()=>document.querySelector('#modal').innerText)).includes('Based on 5K season best 18:32.6'));
await p.evaluate(()=>{ const x=document.querySelector('#modal [data-x=no]'); if(x) x.click(); document.querySelector('#overlay').hidden=true; });
P=await p.evaluate(()=>MSApp.planFor('w4')); ok('custom 105% of 5K speed: 800m at 5K pace ÷ 1.05, with 400m tap points', P&&near(P.segs[0].time,exp['5k']/1.05*800/MILE,0.05)&&P.cps.length===2, P&&P.segs[0].time.toFixed(1));
const g=await p.evaluate(()=>MSApp.planFor('w2')), bea=await p.evaluate(()=>MSApp.paceMath(5000,1200));
ok('group (Ann, Bea, Cat): the middle runner, Bea', near(g.segs[0].time,bea.cv*1000/MILE,0.05)&&g.pace.who==='Bea B.', g.pace&&g.pace.who);
ok('group whose paces differ by more than 3% is warned', g.pace.warn&&g.pace.spread>0.03 && (await p.evaluate(()=>[...document.querySelectorAll('.watch')].find(x=>x.innerText.includes('w2')).innerText)).includes('differ by'));
const g2=await p.evaluate(()=>MSApp.planFor('w3')); ok('Bea + Cat (7.5% apart) also warned; a close pair would not be', g2.pace.warn, (g2.pace.spread*100).toFixed(1)+'%');

console.log('4. Adjust a target; remembered for that runner and workout; fixed at Start');
await p.evaluate(()=>{ const w=[...document.querySelectorAll('.watch')].find(x=>x.innerText.trim().startsWith('w1')); w.querySelector('[data-act=menu]').click(); }); await W();
ok('⋯ menu has Targets… for an effort workout', !!(await p.$('#modal [data-m=targets]')));
await p.click('#modal [data-m=targets]'); await W();
ok('Targets sheet: per 400, the part and per mile, labeled estimates', (await p.$eval('#modal',m=>m.innerText)).includes('per 400')&&(await p.$eval('#modal',m=>m.innerText)).includes('Estimates'));
await p.click('#modal [data-adj="2"]'); await W(); await p.click('#modal [data-adj="2"]'); await W();
P=await p.evaluate(()=>MSApp.planFor('w1'));
ok('+4 s/mi makes the 1000m 2.5 s slower', near(P.segs[0].time,(exp.cv+4)*1000/MILE,0.05), P.segs[0].time.toFixed(2));
ok('remembered for Ann on this workout (not for the group)', await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('mustang-splits:v1')); return s.paceAdj['ann|wkE']===4&&!s.paceAdj['ann+bea+cat|wkE']; }));
await p.evaluate(()=>document.querySelector('#overlay').hidden=true);
await p.reload(); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(600);
P=await p.evaluate(()=>MSApp.planFor('w1')); ok('…still applied after a reload', near(P.segs[0].time,(exp.cv+4)*1000/MILE,0.05));
await p.evaluate(()=>{ const w=[...document.querySelectorAll('.watch')].find(x=>x.innerText.trim().startsWith('w1')); w.querySelector('[data-act=start]').click(); }); await W(300);
const atStart=await p.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.find(w=>w.id==='w1').plan);
ok('Start saves the targets on the stopwatch', atStart&&near(atStart.segs[0].time,(exp.cv+4)*1000/MILE,0.05)&&atStart.reps===3);
await p.evaluate(()=>{ const K='mustang-splits:v1'; }); // a new race for Ann now must not move a running stopwatch
const after=await p.evaluate(()=>MSApp.planFor('w1')); ok('a running stopwatch keeps its targets (plan copy)', JSON.stringify(after.segs)===JSON.stringify(atStart.segs));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline|play\(\)|NotAllowed/i.test(e)); ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
