// Phone-size screenshots of every main screen (2.9.0), fake names only, light and a few dark.
// Run with the app on :8765 (e.g. `python3 -m http.server 8765` from the repo) : node tools/shots29.js
// Output: tests/screenshots/*.png. Local mode (no Firebase), so it needs no emulator.
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const OUT=path.join(__dirname,'..','screenshots'), FIX=path.join(__dirname,'..','fixtures','fake-history-fixture.json');
const ROSTER=['Maya Lopez, Varsity, Girls','Ava Chen, Varsity, Girls','Zoe Park, Varsity, Girls','Ivy Long, JV, Girls','Ruby Stone, Varsity, Girls','Jonah Kim, Varsity, Boys','Sam Ortiz, JV, Boys','Liam Brooks, JV, Boys','Owen Hart, Varsity, Boys','Theo Ruiz, Varsity, Boys','Ben Fakerson, Varsity, Boys','Izzy Quill, Varsity, Girls'].join('\n');
(async()=>{
fs.mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||350));
for(const dark of [false,true]){
  const tag=dark?'dark':'light', p=await b.newPage(), S=async n=>{ await W(250); await p.screenshot({path:`${OUT}/${n}-${tag}.png`}); console.log('  '+n+'-'+tag); };
  await p.evaluateOnNewDocument(()=>{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1');
    const off=Date.parse('2026-10-04T15:30:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; });
  await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:dark?'dark':'light'}]);
  await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.url().endsWith('/version.json')&&p.newer?r.respond({status:200,contentType:'application/json',body:'{"version":"9.9.9"}'}):r.continue());
  await p.goto('http://localhost:8765/'); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(900);
  const tab=async t=>{ await p.evaluate(t=>{ document.querySelector('#overlay').hidden=true; document.querySelector(`.tab[data-tab=${t}]`).click(); },t); await W(); };
  const close=async()=>{ await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; }); await W(150); };
  await tab('team'); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,ROSTER); await p.click('[data-x=yes]'); await W(); await S('03-team');
  await tab('watches'); await p.click('#newBtn'); await W(); await S('01-new-sheet'); await p.click('[data-new=quick]'); await W(600);
  await p.click('#newBtn'); await W(); await p.click('[data-new=quick]'); await W(500); p.newer=true; await p.evaluate(()=>MSApp.checkUpdate('open')); await W(1500); await S('02-stopwatches-update-waits');
  await tab('workouts'); await S('04-workouts');
  // import the fake career history
  await p.evaluate(()=>{ document.querySelector('#histFile').value=''; }); await (await p.$('#histFile')).uploadFile(FIX); await p.waitForSelector('#modal .imp-prev'); await W(); await S('10-import-preview');
  await p.$eval('#modal .imp-prev',e=>e.scrollTop=9999); await p.evaluate(()=>document.querySelector('#modal [data-x=yes]').scrollIntoView()); await S('11-import-preview-meets');
  await p.click('#modal [data-x=yes]'); await W(1200); await close();
  await tab('results'); await p.click('[data-rv=meets]'); await W(); await S('20-results-meets');
  await p.evaluate(()=>{ const d=document.querySelector('#histList details.off'); if(d){ d.open=true; d.scrollIntoView({block:'start'}); } }); await S('21-official-results');
  await p.click('[data-rv=runners]'); await W(); await S('22-runners');
  const ben=await p.evaluate(()=>MSApp.getRoster().find(a=>a.name.startsWith('Ben')).id); await p.click(`[data-runner="${ben}"]`); await W(600); await S('23-runner-card');
  await p.evaluate(()=>document.querySelector('.career').scrollIntoView({block:'start'})); await S('24-career');
  await p.evaluate(()=>window.scrollBy(0,700)); await S('25-career-more');
  await p.click('[data-rv=team]'); await W(); await p.select('[data-tvseason]','2025'); await W(500); await S('26-team-view');
  // race: setup, ready, live
  await tab('watches'); await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(800); await S('30-race-setup');
  await p.evaluate(()=>{ const ids=MSApp.getRoster().slice(0,8).map(a=>a.id); ids.forEach(id=>{ const b=document.querySelector(`[data-rg][data-rid="${id}"],[data-pick="${id}"]`); if(b) b.click(); }); }); await W();
  await p.evaluate(()=>{ const r=MSApp.getRace(); if(r&&!r.runners.length){ MSApp.getRoster().slice(0,8).forEach(a=>r.runners.push({id:a.id,name:a.name,group:a.group,goal:null})); } MSApp.setRace(r); }); await W(500);
  const rb=await p.$('#readyBar'); if(rb){ await p.evaluate(()=>document.querySelector('#readyBar').click()); await W(); await S('31-ready-for-gun'); }
  await p.evaluate(()=>{ const r=MSApp.getRace(); r.status='running'; r.gun={local:Date.now()-1000*700,off:0,by:'x'}; MSApp.setRace(r); }); await W(800);
  await p.evaluate(()=>{ [...document.querySelectorAll('#raceGrid [data-rn]')].slice(0,3).forEach((b,i)=>setTimeout(()=>b.click(),600+i*450)); }); await W(2600); await S('32-race-live');
  await p.evaluate(()=>document.querySelector('#raceClose').click()); await W(); await S('33-race-running-bar');
  await p.evaluate(()=>{ const r=MSApp.getRace(); MSApp.setRace(null); }); await W();
  await p.click('#openSettings'); await W(); await S('40-settings'); await p.evaluate(()=>document.querySelector('#modal').scrollTop=9999); await W(); await S('41-settings-bottom');
  await p.click('#openImport'); await W(); await S('42-official-results-sheet'); await close();
  await p.click('#openSettings'); await W(); await p.click('#openMeets'); await W(); await S('43-meets'); await close();
  await p.click('#resDeleted').catch(()=>{}); await tab('results'); await p.click('#resDeleted'); await W(); await S('44-recently-deleted'); await close();
  // the full-screen "Updating…" a phone below the team's minimum shows (drawn with its real markup)
  await p.evaluate(()=>{ document.querySelector('#fuText').textContent='Updating to 2.9.0…'; document.querySelector('#forceUpd').hidden=false; }); await S('50-updating');
  await p.close();
}
await b.close();
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
