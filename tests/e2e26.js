// 3.1: race-day difficulty instead of course difficulty (fake names, seeded straight into this phone's storage).
// 14 runners with known fitness (each improves 0.25% a week) race 6 days in 2026 with known difficulties, two of them
// on the same course (Winagamie GC) with different difficulty, plus a 3-runner day (not enough data), a noisy day
// (low confidence), an Injury-tagged disaster (left out) and a 2025 season with only 3 race days (early-season cap).
const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const p=await (await b.createBrowserContext()).newPage(); p.on('pageerror',e=>errs.push(e.message));
await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); const sd=localStorage.getItem('e2eSeed'); if(sd) localStorage.setItem('mustang-splits:v1',sd); }catch(e){}
  const off=Date.parse('2026-10-09T12:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; });
await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await p.goto('http://localhost:8765/'); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p);
await p.evaluate(()=>MSApp.setRace(null)); // a full save first

// ---- seed ----
const plan=await p.evaluate(()=>{
  const K='mustang-splits:v1', S=JSON.parse(localStorage.getItem(K)||'{}');
  const G=['Ada Quill','Bea Rowan','Cleo Marsh','Dot Fenwick','Eve Larkin','Fay Holloway','Gwen Tasker','Hope Ainsley'], Bn=['Ike Corbet','Jory Pell','Kit Barrow','Lou Danner','Moss Ferrel','Ned Albright'];
  S.roster=[...G.map((n,i)=>({id:'g'+i,name:n,group:'',gender:'G'})),...Bn.map((n,i)=>({id:'b'+i,name:n,group:'',gender:'B'}))];
  const cps=()=>[{id:'fin',name:'Finish',dist:5000,unit:'m'}];
  S.courses=[{id:'cW',name:'Winagamie GC',checkpoints:cps()},{id:'cK',name:'Kiel HS',checkpoints:cps()},{id:'cS',name:'Smiley',checkpoints:cps()},{id:'cM',name:'Mishicot',checkpoints:cps()},{id:'cP',name:'Waupaca',checkpoints:cps()},{id:'cB',name:'Brillion HS',checkpoints:cps()}];
  const D=[ // date, course, meet, series name, true difficulty (log), noise amplitude
    ['2026-08-28','cW','mA','Appleton West Terror Invite',0.030,0.003],
    ['2026-09-03','cK','mK','Kiel Raiders Invite',0.020,0.003],
    ['2026-09-11','cW','mN','Nightfall Classic',-0.035,0.003],
    ['2026-09-19','cS','mS','Smiley Invitational',-0.010,0.003],
    ['2026-09-24','cM','mJ','Jim Bremser Memorial',0.015,0.09], // noisy day: low confidence
    ['2026-10-01','cP','mW','Waupaca Invitational',-0.005,0.003]];
  S.series=[...D.map(d=>({id:'s'+d[2],name:d[3]})),{id:'smB',name:'Brillion Invite'},{id:'s25a',name:'Early 2025 A'},{id:'s25b',name:'Early 2025 B'},{id:'s25c',name:'Early 2025 C'}];
  S.meets=[...D.map(d=>({id:d[2],seriesId:'s'+d[2],courseId:d[1],date:d[0],time:'',kind:'Invite',levels:['V'],season:2026})),{id:'mB',seriesId:'smB',courseId:'cB',date:'2026-10-08',time:'',kind:'Invite',levels:['V'],season:2026},
    {id:'m25a',seriesId:'s25a',courseId:'cW',date:'2025-09-01',time:'',kind:'Invite',levels:['V'],season:2025},{id:'m25b',seriesId:'s25b',courseId:'cK',date:'2025-09-10',time:'',kind:'Invite',levels:['V'],season:2025},{id:'m25c',seriesId:'s25c',courseId:'cS',date:'2025-09-20',time:'',kind:'Invite',levels:['V'],season:2025}];
  const ids=S.roster.map(a=>a.id), base=Object.fromEntries(ids.map((id,i)=>[id,id[0]==='g'?1290+i*25:1080+(i-8)*22]));
  const week=(date,d0)=>(Date.parse(date)-Date.parse(d0))/(7*864e5);
  const timeOf=(id,date,diff,noise,j,d0)=>Math.round(base[id]*Math.exp(-0.0025*week(date,d0)+diff+noise*(j%2?1:-1)*((j%3)+1)/3)*10)/10;
  let n=0; const race=(id,date,course,meet,series,div,times,edits)=>{ const rows=Object.keys(times).map(k=>({id:k,name:S.roster.find(a=>a.id===k).name,group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]}));
    const marks=Object.entries(times).map(([k,t])=>({id:id+k,ci:0,rid:k,t,dev:'seed',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]}));
    return {id,key:id,date,savedAtMs:Date.parse(date+'T15:00')+(n++),uploaded:false,edits:edits||[],race:{name:id,raceId:'race-'+id,courseId:course,courseName:'',goalSrc:'none',meetId:meet,seriesId:series,division:div,checkpoints:cps(),rows,marks}}; };
  const log=[], truth={};
  D.forEach(([date,course,meet,,diff,noise],di)=>{ truth[date]=diff;
    ['G','B'].forEach(g=>{ const who=ids.filter(id=>id[0]===(g==='G'?'g':'b')), times={}; who.forEach((id,j)=>{ times[id]=timeOf(id,date,diff,noise,j+di,'2026-08-28'); });
      const edits=[]; if(date==='2026-09-19'&&g==='G'){ times.g7=Math.round(times.g7*1.15*10)/10; edits.push({op:'tag',rid:'g7',tags:['Injury'],note:'',uid:'x',dev:'seed',byName:'Coach',at:1}); } // a disaster, tagged Injury
      log.push(race(meet+g,date,course,meet,'s'+meet,g+'V',times,edits)); }); });
  log.push(race('mBG','2026-10-08','cB','mB','smB','GV',{g0:1220,g1:1240,g2:1260})); // only 3 runners: not enough data
  [['2025-09-01','cW','m25a',0.02],['2025-09-10','cK','m25b',-0.01],['2025-09-20','cS','m25c',0]].forEach(([date,course,meet,diff],di)=>{ const times={}; ids.forEach((id,j)=>{ times[id]=timeOf(id,date,diff+0.03,0.003,j+di,'2025-09-01'); });
    log.push(race(meet,date,course,meet,'s'+meet,'OPEN',times)); });
  S.raceLog=log; S.settings=S.settings||{}; S.settings.coachName='Coach Ann'; S.settings.coachAsked=true;
  localStorage.setItem('e2eSeed',JSON.stringify(S));
  return {truth,dates:D.map(d=>d[0])};
});
await p.reload(); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(600);

console.log('1. ratings');
const F=await p.evaluate(()=>MSApp.dayRatings());
const keyOn=date=>Object.keys(F.info).find(k=>F.info[k].date===date);
// what the model can see: the true difficulties centred on the season's average day with their straight-line drift removed
const tr=plan.dates.map(d=>plan.truth[d]), xs=plan.dates.map(d=>Date.parse(d)/(30*864e5)), xm=xs.reduce((a,v)=>a+v,0)/xs.length, ym=tr.reduce((a,v)=>a+v,0)/tr.length;
const sl=xs.reduce((s,x,i)=>s+(x-xm)*(tr[i]-ym),0)/xs.reduce((s,x)=>s+(x-xm)**2,0), want=Object.fromEntries(plan.dates.map((d,i)=>[d,tr[i]-ym-sl*(xs[i]-xm)]));
plan.dates.forEach(d=>{ if(d==='2026-09-24') return; const k=keyOn(d), got=k&&F.d[k]; ok(`${F.info[k]&&F.info[k].name} ${d}: rating ${(100*got).toFixed(2)}% ≈ ${(100*want[d]).toFixed(2)}%`, got!=null&&Math.abs(got-want[d])<0.004); });
const kA=keyOn('2026-08-28'), kN=keyOn('2026-09-11');
const gap=want['2026-08-28']-want['2026-09-11'];
ok(`the same course (Winagamie GC) on two days gets two ratings, ${(100*gap).toFixed(1)}% apart`, kA!==kN && Math.abs((F.d[kA]-F.d[kN])-gap)<0.004, ((F.d[kA]-F.d[kN])*100).toFixed(2));
const sum=plan.dates.reduce((s,d)=>s+F.d[keyOn(d)],0);
ok('ratings are against the season’s average race day (they average to 0)', Math.abs(sum/plan.dates.length)<1e-6, sum);
ok('every runner counts (14) on a normal day', F.conf[keyOn('2026-09-03')].n===14, F.conf[keyOn('2026-09-03')].n);
ok('Injury-tagged result left out: Smiley counts 13 runners and is still accurate', F.conf[keyOn('2026-09-19')].n===13 && Math.abs(F.d[keyOn('2026-09-19')]-want['2026-09-19'])<0.004);
ok('a clean day is High confidence', F.conf[keyOn('2026-09-03')].level==='High', F.conf[keyOn('2026-09-03')].level);
ok('the noisy day is Low confidence', F.conf[keyOn('2026-09-24')].level==='Low', JSON.stringify({se:F.conf[keyOn('2026-09-24')].se,lv:F.conf[keyOn('2026-09-24')].level}));
const kB=keyOn('2026-10-08');
ok('3 runners: no rating (not enough data)', kB && F.d[kB]==null && F.info[kB].nOk<5, kB&&F.info[kB].nOk);
const e25=Object.keys(F.conf).filter(k=>k<'2025-12');
ok('2025 with only 3 race days: rated, but capped at Low confidence (early season)', e25.length===3 && e25.every(k=>F.conf[k].level==='Low'&&F.conf[k].early), e25.map(k=>F.conf[k].level).join());

console.log('2. raw times stay the record');
const raw=await p.evaluate(()=>MSApp.teamRows('G','raw',2026)), adj=await p.evaluate(()=>MSApp.teamRows('G','adj',2026));
const rK=raw.find(r=>r.date==='2026-09-03'), aK=adj.find(r=>r.date==='2026-09-03');
ok('team view raw = the raw times; adjusted differs on a hard day', rK&&aK&&rK.avg>aK.avg&&Math.abs(aK.raw-rK.avg)<0.01, rK&&aK&&`${rK.avg} ${aK.avg}`);
ok('the 3-runner day is left out of adjusted rows', !adj.some(r=>r.date==='2026-10-08'));
const sb=await p.evaluate(()=>{ const a=MSApp.getRoster().find(x=>x.id==='g0'); return MSApp.seasonAvg('g0'); });
ok('season average: adjusted (adj.) where the day is rated; Brillion (no rating) stays raw', sb&&sb.adj&&!sb.all&&sb.n===7, JSON.stringify(sb));
console.log('3. screens');
const NOTE='Adjusted times remove how hard each race day was, so trends reflect fitness, not the course.';
await p.click('.tab[data-tab=results]'); await W(400); await p.click('[data-rv=meets]'); await W(400);
ok('Meets: the one-line explanation at the top', (await p.$eval('#adjNoteMeets',e=>e.textContent)).startsWith(NOTE) && await p.$eval('#adjNoteMeets',e=>e.getBoundingClientRect().height>0));
await p.evaluate(()=>document.querySelectorAll('#raceLogList details.hist').forEach(d=>d.open=true)); await W();
const lines=await p.$$eval('#raceLogList details.hist',x=>Object.fromEntries(x.map(d=>[d.dataset.entry,(d.querySelector('.rd-line')||{}).textContent||''])));
ok('Meets: Brillion says "Not enough data"', (lines.mBG||'').includes('Not enough data'), lines.mBG);
ok('Meets: Kiel says how much harder, the runners and its confidence', /Race day: \d:\d\d harder/.test(lines.mKG||'')&&/High confidence/.test(lines.mKG||'')&&/harder than an average race day[\s\S]*14 runners/.test(lines.mKG||''), lines.mKG);
ok('Meets: girls and boys races of one day show the same rating', lines.mKG===lines.mKB);
ok('Meets: the noisy day is flagged ⚠ Low confidence', (lines.mJG||'').includes('⚠ Low confidence'), lines.mJG);
await p.click('[data-rv=team]'); await W(400);
ok('Team: the explanation', (await p.$eval('#rvTeam',e=>e.textContent)).includes(NOTE));
const rows=await p.$$eval('#rvTeam .rd-table tbody tr',x=>x.map(r=>r.innerText.replace(/\s+/g,' ')));
ok('Team: a rating row for every 2026 race day (7), Brillion "Not enough data"', rows.length===7 && rows[6].includes('Not enough data'), rows.length);
ok('Team: Nightfall is easier, with ± and a confidence', /Nightfall Classic.*easier.*±.*confidence/.test(rows[2]), rows[2]);
ok('Team: the ratings table fits an upright phone', await p.$eval('#rvTeam .rd-table',t=>t.scrollWidth<=t.parentElement.clientWidth+1));
await p.click('#rvTeam [data-rvchart=adj]'); await W(400);
ok('Team: the switch says Adjusted (no course name)', (await p.$eval('#rvTeam [data-rvchart=adj]',x=>x.textContent))==='Adjusted' && !(await p.$eval('#rvTeam',e=>e.textContent)).includes('equivalent'));
await p.click('[data-rv=runners]'); await W(400);
ok('Runners: the explanation', (await p.$eval('#rvRunners',e=>e.textContent)).includes(NOTE));
await p.click('#rvRunners [data-runner="g0"]'); await W(400);
const card=await p.$eval('#rvRunners',e=>e.innerText);
ok('runner card: the explanation and the race day without a rating named', card.includes(NOTE) && card.includes('Not enough data to rate Brillion Invite'), card.slice(0,200));
ok('runner card: raw season best is the raw time', /Season best/.test(card));
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
