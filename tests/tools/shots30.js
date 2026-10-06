// Phone-size screenshots of every main screen with the fake team (fake names only), for the 3.0 design review.
// node tools/shots30.js <before|after> [url]  -> docs/screenshots-3.0/<label>-NN-name-<light|dark>.png
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs'), T=require('./fake-team.js');
const label=process.argv[2]||'after', url=process.argv[3]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-3.0');
fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
(async()=>{
  const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
  for(const dark of [false,true]){
    const s=T.seed(); s.workouts=[{id:'wkE',name:'CV 5 × 1000',reps:5,rest:'1:30',restUnit:'mss',segments:[{id:'s1',effort:'cv',dist:1000,mode:'effort',paceRef:'cv',value:'',cp:200}]}];
    const P=await T.open(b,{url,dark,seed:s,now:'2026-10-06T15:30:00'}); await T.load(P);
    let n=0; const shot=async(name,full)=>{ n++; await W(350); await P.screenshot({path:path.join(OUT,`${label}-${String(n).padStart(2,'0')}-${name}-${dark?'dark':'light'}.png`),fullPage:!!full}); };
    const ev=(f,...a)=>P.evaluate(f,...a), hide=()=>ev(()=>{ document.querySelector('#overlay').hidden=true; });
    const tab=async t=>{ await hide(); await ev(t=>{ (document.querySelector(`.tab[data-tab=${t}]`)||document.querySelector(`[data-tab=${t}]`)).click(); },t).catch(()=>{}); await W(400); };
    const click=async sel=>{ await ev(sel=>{ const e=document.querySelector(sel); if(e) e.click(); },sel); await W(350); };
    await ev(()=>window.scrollTo(0,0));
    await tab('watches'); await shot('stopwatches-empty');
    await click('[data-new=workout]'); await shot('new-workout-runners');
    await ev(()=>{ const b=document.querySelector('#modal [data-pk=G]')||[...document.querySelectorAll('#modal [data-gi]')][0]; if(b) b.click(); }); await W(); await click('#modal [data-x=next]'); await click('#modal [data-wk=wkE]'); await shot('new-workout-step2');
    await click('#modal [data-x=startnow]'); await W(800); await click('.watch [data-act=split]'); await shot('stopwatches-running');
    await click('.watch [data-act=menu]'); await shot('stopwatch-menu'); await hide();
    await ev(()=>{ const n=document.querySelector('#newBtn'); if(n) n.click(); }); await W(); await shot('new-sheet'); await hide();
    await tab('workouts'); await shot('workouts-today'); await ev(()=>window.scrollTo(0,document.body.scrollHeight)); await shot('workouts-list'); await ev(()=>window.scrollTo(0,0));
    await click('#wkToday [data-tpl-use]'); await shot('workout-suggestion'); await hide();
    await click('.wk [data-w=edit]'); await ev(()=>{ const e=document.querySelector('#wkEditor'); if(e) e.scrollIntoView(); }); await shot('workout-editor');
    await tab('team'); await ev(()=>window.scrollTo(0,0)); await shot('team');
    await click('.ath .ath-row'); await shot('runner-sheet'); await hide();
    await tab('results'); await click('[data-rv=meets]'); await ev(()=>window.scrollTo(0,0)); await shot('data-meets');
    await ev(()=>{ const d=document.querySelector('#histList details.hist-meet'); if(d){ d.open=true; const r=d.querySelector('details.div-race'); if(r) r.open=true; d.scrollIntoView(); } }); await shot('data-meet-open');
    await click('[data-rv=runners]'); await ev(()=>window.scrollTo(0,0)); await shot('data-runners');
    await click('#rvRunners [data-runner]'); await ev(()=>window.scrollTo(0,0)); await shot('data-runner-card');
    await click('[data-rvback]'); await click('[data-rv=team]'); await ev(()=>window.scrollTo(0,0)); await shot('data-team');
    await click('#openSettings'); await shot('settings'); await ev(()=>{ const m=document.querySelector('#modal'); if(m) m.scrollTop=m.scrollHeight; }); await shot('settings-bottom'); await hide();
    await ev(()=>{ const b=document.querySelector('#resHealth')||document.querySelector('[data-set=health]'); if(b) b.click(); }); await W(); await shot('data-health'); await hide();
    await ev(()=>{ const b=document.querySelector('#resDeleted')||document.querySelector('[data-set=deleted]'); if(b) b.click(); }); await W(); await shot('recently-deleted'); await hide();
    await tab('watches'); await ev(()=>{ const n=document.querySelector('#newBtn'); if(n) n.click(); }); await W(); await click('#modal [data-new=race]'); await hide(); await ev(()=>window.scrollTo(0,0)); await shot('race-setup');
    await ev(()=>{ const b=document.querySelector('#v-race [data-pk=G]'); if(b) b.click(); }); await W(400); await click('#readyBtn'); await shot('race-ready');
    await click('.ready-gun'); await W(800); await ev(()=>{ const b=document.querySelector('#raceGrid [data-rn]'); if(b) b.click(); }); await W(400); await shot('race-live');
    if(P.errs.length) console.log('page errors',P.errs);
    await P.close();
  }
  await b.close(); console.log('screenshots in',OUT);
})();
