// Phone-size screenshots for the 3.4 density and Settings work (fake names only; weather numbers are made up).
// node tools/shots34.js <before|after> [url]  ->  docs/screenshots-3.4/<label>-NN-name.png
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs'), T=require('./fake-team.js');
const label=process.argv[2]||'after', url=process.argv[3]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-3.4');
fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
(async()=>{
  const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
  const s=T.seed(); s.workouts=[{id:'wkE',name:'800 × 4 VO2max',reps:4,rest:'2:00',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:800,mode:'total',value:'2:40',cp:400}]}];
  const P=await T.open(b,{url,seed:s,now:'2026-10-06T15:30:00',flat:false}); await T.load(P);
  // made-up weather on the fake team's race days, so the weather tags show
  await P.evaluate(()=>{ const days=MSApp.wx.days(); const seen=new Set();
    days.forEach((d,i)=>{ if(!seen.has(d.place)){ seen.add(d.place); MSApp.wx.setPlace(d.place,{lat:44+i/100,lon:-88,label:'Testville, Wisconsin'}); } });
    const W2=MSApp.getWeather(); days.forEach((d,i)=>{ const t=[78,64,55,48,70,58][i%6], dp=[62,50,52,40,61,45][i%6]; const r=W2.find(x=>x.id===d.id);
      const rec={id:d.id,date:d.date,place:d.place,lat:44,lon:-88,start:d.start,end:d.end,src:'schedule',status:'ok',wx:{t,at:t+2,dp,rh:70,ws:[4,9,16,6,3,11][i%6],wg:[9,18,25,12,7,20][i%6],pr:0,pr48:[0,0.1,0.6,0,0,0.2][i%6],cc:40},at:1,dismissed:[]};
      if(r) Object.assign(r,rec); else W2.push(rec); }); });
  let n=0; const shot=async(name,full)=>{ n++; await W(400); await P.screenshot({path:path.join(OUT,`${label}-${String(n).padStart(2,'0')}-${name}.png`),fullPage:!!full}); };
  const ev=(f,...a)=>P.evaluate(f,...a), hide=()=>ev(()=>{ document.querySelector('#overlay').hidden=true; });
  const tab=async t=>{ await hide(); await ev(t=>document.querySelector(`.tab[data-tab=${t}]`).click(),t); await W(500); await ev(()=>window.scrollTo(0,0)); };
  const click=async sel=>{ await ev(sel=>{ const e=document.querySelector(sel); if(e) e.click(); },sel); await W(400); };
  const scrollModal=async y=>{ await ev(y=>{ const m=document.querySelector('#modal'); if(m) m.scrollTop=y; },y); };
  // Settings: the root, then each page (3.4) or the old long sheet in screen-size slices (3.3)
  await click('#openSettings'); await shot('settings');
  const pages=await ev(()=>[...document.querySelectorAll('#modal [data-spage]')].map(b=>b.dataset.spage));
  if(pages.length){ for(const pg of pages){ await click(`#modal [data-spage="${pg}"]`); await scrollModal(0); await shot('settings-'+pg); await click('#modal [data-sback]'); } }
  else { const h=await ev(()=>document.querySelector('#modal').scrollHeight); for(let y=700,i=2;y<h;y+=700,i++){ await scrollModal(y); await shot('settings-part'+i); } }
  await hide();
  // Data
  await tab('results'); await click('[data-rv=meets]'); await shot('data-meets');
  await ev(()=>{ const d=document.querySelector('#histList details.hist-meet'); if(d){ d.open=true; d.scrollIntoView({block:'start'}); window.scrollBy(0,-90); } }); await shot('data-meet-open');
  await ev(()=>{ const d=document.querySelector('#histList details.hist-meet'); const r=d&&d.querySelector('details.div-race,details.hist'); if(r){ r.open=true; r.scrollIntoView({block:'start'}); window.scrollBy(0,-90); } }); await shot('data-race-open');
  await click('[data-rv=runners]'); await ev(()=>window.scrollTo(0,0)); await shot('data-runners');
  await click('#rvRunners [data-runner]'); await ev(()=>window.scrollTo(0,0)); await shot('data-runner-card');
  await ev(()=>{ const f=document.querySelector('#rvRunners figure.viz'); if(f){ f.scrollIntoView({block:'start'}); window.scrollBy(0,-90); } }); await shot('data-runner-chart');
  await click('[data-rvback]'); await click('[data-rv=team]'); await ev(()=>window.scrollTo(0,0)); await shot('data-team');
  await ev(()=>{ const f=document.querySelector('#rvTeam figure.viz'); if(f){ f.scrollIntoView({block:'start'}); window.scrollBy(0,-90); } }); await shot('data-team-chart');
  // other screens
  await tab('watches'); await click('[data-new=workout]'); await shot('new-workout');
  await ev(()=>{ const b=document.querySelector('#modal [data-pk=G]'); if(b) b.click(); }); await W(); await click('#modal [data-x=next]'); await click('#modal [data-wk=wkE]'); await click('#modal [data-x=startnow]'); await W(800);
  await click('.watch [data-act=split]'); await shot('stopwatches');
  await tab('workouts'); await shot('workouts');
  await tab('team'); await shot('team');
  await click('.ath .ath-row'); await shot('runner-sheet'); await hide();
  await tab('watches'); await click('#newBtn'); await click('#modal [data-new=race]'); await hide(); await ev(()=>window.scrollTo(0,0)); await shot('race-setup');
  if(P.errs.length) console.log('page errors',P.errs);
  await b.close(); console.log('screenshots in',OUT,n);
})();
