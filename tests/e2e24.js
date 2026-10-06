// 2.14.0 (fake names, fake team): workouts that plan themselves. "What's today's goal?" with the schedule (days to the
// next meet / since the last), 2-3 established sessions per goal with a reason, standard pace names (Daniels VDOT, CV),
// the flow goal -> suggestion -> steppers -> runners (picker bar) -> per-runner targets with their basis -> Start, runners
// without race data (time trial, or run with a group), Build your own, and saved workouts that older versions and the
// sync rules accept (no new top-level fields).
const puppeteer=require('puppeteer-core'), path=require('path');
const T=require('./tools/fake-team.js');
const OUT=process.argv[2]||path.join(__dirname,'out');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0; const errs=[];
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const today=p=>p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=workouts]').click(); const T=document.querySelector('#wkToday');
  return {sched:T.querySelector('.today-sched').textContent,goal:(T.querySelector('[data-goal-pick][aria-pressed=true]')||{}).dataset.goalPick,suggested:[...T.querySelectorAll('[data-goal-pick]')].filter(b=>/Suggested today/.test(b.textContent)).map(b=>b.dataset.goalPick).join(),
    why:(T.querySelector('.today-why')||{}).textContent||'',cards:[...T.querySelectorAll('.sugg')].map(c=>({id:c.dataset.tpl,name:c.querySelector('h3').textContent,paces:c.querySelector('.sugg-paces').textContent,why:(c.querySelector('.sugg-why')||{}).textContent||'',warn:c.classList.contains('warn')}))}; });

console.log('1. The schedule picks the goal');
const cases=[['2026-10-06T15:30:00','sharpen',/2 days before Brillion Invite: keep it short and sharp/],['2026-10-07T15:30:00','premeet',/1 day before Brillion Invite/],
  ['2026-10-02T15:30:00','recovery',/1 day after Waupaca Invitational/],['2026-10-13T15:30:00','threshold',/3 days before NEC/],['2026-09-14T15:30:00','speed',/5 days until Smiley/]];
let P=null;
for(const [now,goal,re] of cases){ const p=await T.open(b,{now}); p.on('pageerror',e=>errs.push(e.message)); if(!P){ await T.load(p); } else { await T.load(p); } const t=await today(p);
  ok(`${now.slice(5,10)}: suggests ${goal} (${t.why})`, t.goal===goal&&t.suggested===goal&&re.test(t.why), JSON.stringify({goal:t.goal,why:t.why,sched:t.sched}));
  if(now.startsWith('2026-10-06')) P=p; else await p.close(); }
let t=await today(P);
ok('the schedule line names the next and last meet', /Next meet: Brillion Invite.*in 2 days.*last: Waupaca Invitational, 5 days ago/.test(t.sched), t.sched);
ok('2–3 suggestions, each with its pace system by its standard name', t.cards.length>=2&&t.cards.length<=3&&t.cards.every(c=>/Daniels VDOT|Tom Schwartz|from VDOT/.test(c.paces)), JSON.stringify(t.cards.map(c=>c.paces)));
const goals=await P.evaluate(()=>[...document.querySelectorAll('#wkToday [data-goal-pick]')].map(b=>b.querySelector('b').textContent));
ok('seven goals: aerobic base, threshold/CV, speed (VO2max), race sharpening, recovery, pre-meet, long run', goals.join('|')==='Aerobic base|Threshold / CV|Speed (VO2max)|Race sharpening|Recovery|Pre-meet|Long run', goals.join('|'));
for(const g of ['base','threshold','speed','sharpen','recovery','premeet','long']){ await P.evaluate(g=>document.querySelector(`#wkToday [data-goal-pick="${g}"]`).click(),g); await W(200); t=await today(P);
  ok(`${g}: ${t.cards.map(c=>c.name).join(' / ')}`, t.cards.length>=2&&t.cards.length<=3&&t.cards.every(c=>c.why||g==='sharpen')); }
await P.evaluate(()=>document.querySelector('#wkToday [data-goal-pick="speed"]').click()); await W(200); t=await today(P);
ok('2 days before a meet, hard VO2max sessions are flagged ("too hard this close to a meet")', t.cards.every(c=>c.warn&&/too hard this close to a meet/.test(c.why)), JSON.stringify(t.cards.map(c=>c.why)));
await P.evaluate(()=>document.querySelector('#wkToday [data-goal-pick="threshold"]').click()); await W(200); t=await today(P);
ok('examples from the request are there: 5 × 1000 at CV, about 20 min at threshold', t.cards.some(c=>c.name==='5 × 1000 at CV')&&t.cards.some(c=>/Threshold run, about 20 min/.test(c.name)));

console.log('2. Goal → suggestion → steppers → runners → Start');
// a runner with no race data
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(); await P.click('#addAth'); await W(); await P.type('#athName','Zoe Newcomb'); await P.evaluate(()=>{ const b=document.querySelector('#modal [data-gen=G]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); }); await P.click('#modal [data-x=yes]'); await W();
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=workouts]').click(); }); await W(300);
await P.evaluate(()=>document.querySelector('#wkToday [data-goal-pick="threshold"]').click()); await W(200);
await P.evaluate(()=>document.querySelector('#wkToday [data-tpl-use="cv5x1000"]').click()); await W(300);
const sheet=await P.$eval('#modal',m=>m.innerText);
ok('the suggestion opens with its parts by pace name and steppers for reps and rest', /1000 m at each runner’s CV pace|1000m at each runner’s CV pace/.test(sheet)&&/Critical velocity \(CV\), Tom Schwartz/.test(sheet)&&!!(await P.$('#modal .stepper #tplReps'))&&!!(await P.$('#modal .stepper #tplRest')), sheet.replace(/\n/g,' | ').slice(0,200));
await P.evaluate(()=>{ const s=document.querySelector('#tplReps').closest('.stepper'); s.querySelector('[data-step="1"]').click(); }); await W(100);
await P.evaluate(()=>{ const s=document.querySelector('#tplRest').closest('.stepper'); s.querySelector('[data-step="1"]').click(); s.querySelector('[data-step="1"]').click(); }); await W(100);
ok('steppers: 6 reps, 1:30 rest; the title follows', (await P.$eval('#modal h2',h=>h.textContent))==='6 × 1000 at CV'&&(await P.$eval('#tplRest',i=>i.value))==='1:30');
await P.click('#modal [data-x=runners]'); await W(400);
const wk=await P.evaluate(()=>MSApp.getWorkouts().find(w=>w.name==='6 × 1000 at CV'));
ok('saved as an ordinary workout: 6 reps, 1:30 rest, an effort part at CV (template id inside the part)', wk&&wk.reps==='6'&&wk.rest==='1:30'&&wk.segments.length===1&&wk.segments[0].mode==='effort'&&wk.segments[0].paceRef==='cv'&&wk.segments[0].tpl==='cv5x1000', JSON.stringify(wk));
ok('no new top-level fields (older versions and the sync rules accept it)', wk&&Object.keys(wk).every(k=>['id','name','reps','rest','restUnit','segments'].includes(k)), wk&&Object.keys(wk).join());
ok('then the runner picker (with Select all / Girls / Boys / Clear / Suggest pace groups)', await P.evaluate(()=>!!document.querySelector('#modal .pick-bar [data-pk=all]')&&/Who’s running/.test(document.querySelector('#modal').innerText)));
await P.click('#modal [data-pk=G]'); await W(); await P.click('#modal [data-x=next]'); await W(400);
const tg=await P.evaluate(()=>[...document.querySelectorAll('#modal .tg-row')].map(r=>({name:r.querySelector('b').textContent,txt:r.innerText.replace(/\s+/g,' '),warn:r.classList.contains('warn')})));
ok('step 2 has the workout picked and each runner’s target with its basis ("Based on 5K season best …")', await P.evaluate(n=>[...document.querySelectorAll('#modal [data-wk][aria-pressed=true]')].some(b=>b.textContent.includes(n)),'6 × 1000 at CV')&&tg.filter(r=>!r.warn).length===7&&tg.filter(r=>!r.warn).every(r=>/Based on .* \d+:\d\d\.\d, \d+\/\d+/.test(r.txt)&&/\d:\d\d$/.test(r.txt)), JSON.stringify(tg.slice(0,2)));
const targets=tg.filter(r=>!r.warn).map(r=>r.txt.match(/(\d:\d\d)$/)[1]);
ok('every runner has their own target', new Set(targets).size>=5, targets.join());
const zoe=tg.find(r=>r.name==='Zoe Newcomb');
ok('a runner without race data is flagged, with Time trial and Run with a group', zoe&&zoe.warn&&/No race this season/.test(zoe.txt)&&/Time trial/.test(zoe.txt)&&/Run with a group/.test(zoe.txt), zoe&&zoe.txt);
await P.evaluate(()=>[...document.querySelectorAll('#modal [data-x=tt]')][0].click()); await W(300);
await P.evaluate(()=>document.querySelector('#modal [data-ttd="3200"]').click()); await P.click('#modal #ttT'); await P.keyboard.type('13000'); await P.click('#modal [data-x=yes]'); await W(600);
const tg2=await P.evaluate(()=>[...document.querySelectorAll('#modal .tg-row')].map(r=>({name:r.querySelector('b').textContent,txt:r.innerText.replace(/\s+/g,' '),warn:r.classList.contains('warn')})));
const z2=tg2.find(r=>r.name==='Zoe Newcomb');
ok('a time trial (3200 m in 13:00.0) gives her a pace; back in the same flow', z2&&!z2.warn&&/Based on 3200m .*13:00\.0/.test(z2.txt), z2&&z2.txt);
ok('the time trial is saved as a dated hand-timed result', await P.evaluate(()=>{ const p=MSApp.getPrs().find(x=>x.list.some(r=>r.meet==='Time trial')); return !!p&&p.list.some(r=>r.dist===3200&&r.t===780&&r.src==='hand'&&r.date==='2026-10-06'); }));
await P.click('#modal [data-x=startnow]'); await W(800);
const ws=await P.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.map(w=>({id:w.id,name:w.name,st:w.status})));
const pl=await P.evaluate(ids=>ids.map(id=>{ const p=MSApp.planFor(id); return p&&p.cps[0].t; }),ws.map(w=>w.id));
ok('Start: 8 stopwatches, named, running, each with individual targets for every rep', ws.length===8&&ws.every(w=>w.st==='running'&&w.name&&!/Unnamed/.test(w.name))&&pl.every(x=>x>0)&&new Set(pl.map(x=>x.toFixed(1))).size>=6, pl.map(x=>x&&x.toFixed(1)).join());
await P.screenshot({path:path.join(OUT,'e2e24-started.png')});

console.log('3. Run with a group, Build your own');
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(); await P.click('#addAth'); await W(); await P.type('#athName','Quinn Newfield'); await P.evaluate(()=>{ const b=document.querySelector('#modal [data-gen=B]'); if(b.getAttribute('aria-pressed')!=='true') b.click(); }); await P.click('#modal [data-x=yes]'); await W();
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=workouts]').click(); }); await W(300);
await P.evaluate(()=>document.querySelector('#wkToday [data-goal-pick="speed"]').click()); await W(200);
await P.evaluate(()=>document.querySelector('#wkToday [data-tpl-use]').click()); await W(300); await P.click('#modal [data-x=runners]'); await W(300);
await P.click('#modal [data-pk=B]'); await W(); await P.click('#modal [data-x=next]'); await W(300);
await P.evaluate(()=>document.querySelector('#modal [data-x=withgrp]').click()); await W(300);
const grp=await P.evaluate(()=>[...document.querySelectorAll('#modal .grp-card')].map(c=>[...c.querySelectorAll('.grp-row .nm')].map(x=>x.firstChild.textContent)));
ok('Run with a group: the group maker opens; the runner without a pace can be moved into any group', grp.length>=2&&grp.some(g=>g.includes('Quinn Newfield'))&&await P.evaluate(()=>!!document.querySelector('#modal [data-grp]')), JSON.stringify(grp));
await P.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .grp-row')].find(x=>x.querySelector('.nm').firstChild.textContent==='Quinn Newfield'); const s=r.querySelector('select'); s.value='1'; s.dispatchEvent(new Event('change',{bubbles:true})); }); await W(300);
ok('…placed with group 1, he runs on that group’s targets', await P.evaluate(()=>{ const c=document.querySelector('#modal .grp-card'); return [...c.querySelectorAll('.grp-row .nm')].some(x=>x.firstChild.textContent==='Quinn Newfield'); }));
await P.evaluate(()=>{ document.querySelector('#modal [data-x=no]').click(); document.querySelector('#overlay').hidden=true; }); await W();
await P.evaluate(()=>document.querySelector('#wkToday [data-x=ownwk]').click()); await W(400);
ok('Build your own opens the workout editor', await P.evaluate(()=>!!document.querySelector('#wkEditor [data-wf=name]')));
ok('no page errors', !errs.length&&!P.errs.length, [...errs,...P.errs].join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
