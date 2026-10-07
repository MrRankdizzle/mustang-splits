// 3.2: race weather from Open-Meteo (faked here: every request to *.open-meteo.com is answered by this script).
// Fake names only. Covers: race locations (suggest, confirm once, type a town), backfill (high school and middle school,
// forecast vs archive), the averages over the race, storage and team sync, flags at each threshold and adjustable,
// dismissing, the attribution line, the weather share of race-day ratings, phone location at the gun, offline fill-in,
// and that a failed fetch never blocks a race or loses anything.
const puppeteer=require('puppeteer-core'), lib=require('./lib.js');
const PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
const NOTE='Weather data by Open-Meteo.com';

// ---- the fake Open-Meteo ----
// Weather per local (Central) date: t, dp, rh, ws, wg, cc; rainBefore = inches over the 12 hours before 8 AM that day.
const WX={'2026-08-28':{t:70,dp:60},'2026-09-03':{t:80,dp:70},'2026-09-11':{t:60,dp:50,ws:15},'2026-09-19':{t:55,dp:45},'2026-10-01':{t:50,dp:40},
  '2025-09-04':{t:35,dp:30},'2024-09-12':{t:55,dp:45,rainBefore:0.5},'2024-10-15':{t:48,dp:40},'2026-10-09':{t:58,dp:48}};
const GEO={'neenah':[44.1858,-88.4626,'Neenah'],'kiel':[43.9125,-88.0356,'Kiel'],'little chute':[44.28,-88.3184,'Little Chute']};
const net={down:false,fail:false,calls:{geo:0,forecast:0,archive:0}};
const CT=-5*3600; // Central Daylight Time
function hourly(q){ const s=Date.parse(q.get('start_date')+'T00:00:00Z')/1000, e=Date.parse(q.get('end_date')+'T23:00:00Z')/1000, H={time:[]};
  ['temperature_2m','apparent_temperature','dew_point_2m','relative_humidity_2m','wind_speed_10m','wind_gusts_10m','precipitation','cloud_cover'].forEach(k=>H[k]=[]);
  for(let t=s;t<=e;t+=3600){ const loc=new Date((t+CT)*1000), day=loc.toISOString().slice(0,10), hr=loc.getUTCHours(), v=WX[day]||{t:60,dp:45};
    const next=WX[new Date((t+CT+86400)*1000).toISOString().slice(0,10)]||{}; // rain on the evening before a day with rainBefore
    H.time.push(t); H.temperature_2m.push(v.t); H.apparent_temperature.push(v.t-1); H.dew_point_2m.push(v.dp); H.relative_humidity_2m.push(v.rh||70); H.wind_speed_10m.push(v.ws||5); H.wind_gusts_10m.push((v.ws||5)+8);
    H.cloud_cover.push(v.cc||40); H.precipitation.push(next.rainBefore&&hr>=12&&hr<22?next.rainBefore/10:0); }
  return H; }
async function phone(tag,opts={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); p.tag=tag; p.ctx=ctx;
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); const sd=localStorage.getItem('e2eSeed'); if(sd){ localStorage.setItem('mustang-splits:v1',sd); localStorage.removeItem('e2eSeed'); } }catch(e){}
    const off=Date.parse('2026-10-09T15:50:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off+(window.__dt||0)); } static now(){ return R.now()+off+(window.__dt||0); } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.setRequestInterception(true);
  p.on('request',r=>{ const u=new URL(r.url());
    if(opts.block&&u.hostname==='www.gstatic.com') return r.abort();
    if(!u.hostname.endsWith('open-meteo.com')) return r.continue();
    if(net.down||opts.noWx) return r.abort('internetdisconnected');
    const H={'Access-Control-Allow-Origin':'*'};
    if(u.hostname.startsWith('geocoding')){ net.calls.geo++; const g=GEO[(u.searchParams.get('name')||'').toLowerCase()];
      return r.respond({status:200,headers:H,contentType:'application/json',body:JSON.stringify(g?{results:[{name:g[2],latitude:g[0],longitude:g[1],admin1:'Wisconsin',country_code:'US'},{name:g[2],latitude:40,longitude:-90,admin1:'Illinois',country_code:'US'}]}:{})}); }
    if(net.fail) return r.respond({status:500,headers:H,contentType:'application/json',body:JSON.stringify({error:true,reason:'Fake outage'})});
    net.calls[u.hostname.startsWith('archive')?'archive':'forecast']++;
    return r.respond({status:200,headers:H,contentType:'application/json',body:JSON.stringify({hourly:hourly(u.searchParams)})}); });
  await p.goto('http://localhost:8765/'+(opts.emu?'?emu':'')); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=results]')); lib.patchClick(p); await W(500); return p; }

// ---- the fake team: 8 runners, 5 race days in 2026 (two on Winagamie GC), planted heat and course effects ----
const HEAT=td=>{ const P=[[100,0],[110,0.005],[120,0.01],[130,0.02],[140,0.03],[150,0.045]]; if(td<=100) return 0; for(let i=1;i<P.length;i++) if(td<=P[i][0]) return P[i-1][1]+(P[i][1]-P[i-1][1])*(td-P[i-1][0])/(P[i][0]-P[i-1][0]); return 0.045; };
const DAYS=[['2026-08-28','8:30 AM','cW','mA','Appleton West Terror Invite',0.02],['2026-09-03','4:00 PM','cK','mK','Kiel Raiders Invite',-0.01],['2026-09-11','7:45 PM','cW','mN','Nightfall Classic',-0.02],
  ['2026-09-19','8:00 AM','cK','mS','Smiley Invitational',0.01],['2026-10-01','5:00 PM','cW','mW','Waupaca Invitational',0]];
async function seed(p){ await p.evaluate((DAYS,WX)=>{
  const HEAT=td=>{ const P=[[100,0],[110,0.005],[120,0.01],[130,0.02],[140,0.03],[150,0.045]]; if(td<=100) return 0; for(let i=1;i<P.length;i++) if(td<=P[i][0]) return P[i-1][1]+(P[i][1]-P[i-1][1])*(td-P[i-1][0])/(P[i][0]-P[i-1][0]); return 0.045; };
  MSApp.setRace(null); const K='mustang-splits:v1', S=JSON.parse(localStorage.getItem(K)||'{}');
  const names=['Ada Quill','Bea Rowan','Cleo Marsh','Dot Fenwick','Eve Larkin','Ike Corbet','Jory Pell','Kit Barrow','Lou Danner','Moss Ferrel'];
  S.roster=names.map((n,i)=>({id:'r'+i,name:n,group:'',gender:i<5?'G':'B'}));
  const cps=()=>[{id:'fin',name:'Finish',dist:5000,unit:'m'}];
  S.courses=[{id:'cW',name:'Winagamie GC',checkpoints:cps()},{id:'cK',name:'Kiel HS',checkpoints:cps()},{id:'cN',name:'Nowhere Park',checkpoints:cps()}];
  S.series=[...DAYS.map(d=>({id:'s'+d[3],name:d[4]})),{id:'s-kiel-invite',name:'Kiel Raiders Invite 2025'},{id:'sT',name:'Today Invite'},{id:'sX',name:'Nowhere Invite'}];
  S.meets=[...DAYS.map(d=>({id:d[3],seriesId:'s'+d[3],courseId:d[2],date:d[0],time:d[1],kind:'Invite',levels:['V'],season:2026})),
    {id:'m25',seriesId:'smK',courseId:'cK',date:'2025-09-04',time:'4:00 PM',kind:'Invite',levels:['V'],season:2025},
    {id:'mT',seriesId:'sT',courseId:'cK',date:'2026-10-09',time:'4:00 PM',kind:'Invite',levels:['V'],season:2026},
    {id:'mX',seriesId:'sX',courseId:'cN',date:'2026-10-20',time:'',kind:'Invite',levels:['V'],season:2026}];
  let n=0; const race=(id,date,course,meet,series,times)=>{ const rows=Object.keys(times).map(k=>({id:k,name:S.roster.find(a=>a.id===k).name,group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]}));
    const marks=Object.entries(times).map(([k,t])=>({id:id+k,ci:0,rid:k,t,dev:'seed',byName:'Coach',at:0,chosen:false,deleted:false,hist:[]}));
    return {id,key:id,date,savedAtMs:Date.parse(date+'T15:00')+(n++),uploaded:false,edits:[],race:{name:id,raceId:'race-'+id,courseId:course,courseName:'',goalSrc:'none',meetId:meet,seriesId:series,division:'OPEN',checkpoints:cps(),rows,marks}}; };
  const log=DAYS.map(([date,,course,meet,,cEff],di)=>{ const w=WX[date], times={}; S.roster.forEach((a,j)=>{ const base=a.gender==='G'?1300+j*20:1080+j*15;
    times[a.id]=Math.round(base*Math.exp(-0.002*di*1.4+HEAT(w.t+w.dp)+cEff)*10)/10; }); return race('R'+meet,date,course,meet,'s'+meet,times); });
  log.push(race('R25','2025-09-04','cK','m25','smK',{r0:1290}));
  S.raceLog=log; S.settings=S.settings||{}; S.settings.coachName='Coach Ann'; S.settings.coachAsked=true;
  localStorage.setItem('e2eSeed',JSON.stringify(S)); },DAYS,WX);
  await p.reload(); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=results]')); await W(500);
  // middle school official results (no course): one meet name that leads to Kiel, one with no town in it
  await p.evaluate(()=>MSApp.officialRemote([{id:'impMS-0',importId:'impMS',part:0,parts:1,importedAt:1,by:'x',byName:'Coach',format:'mustang-splits-history/v1',source:'test',generated:'',matches:{},edits:[],
    results:[{k:'a|2024-09-12|3200|900',aid:'r0',name:'Ada Q.',g:'G',season:2024,grade:8,level:'MS',dist:3200,date:'2024-09-12',t:900,place:3,meet:'Kiel Middle School Invite',seriesId:null,meetId:null,courseId:null,division:'GMS'},
      {k:'a|2024-10-15|3200|880',aid:'r0',name:'Ada Q.',g:'G',season:2024,grade:8,level:'MS',dist:3200,date:'2024-10-15',t:880,place:2,meet:'Valley Bay Conference Meet',seriesId:null,meetId:null,courseId:null,division:'GMS'}]}])); await W(300); }

console.log('1. race locations: suggested, confirmed once in one sheet');
const L=await phone('L',{block:true}); await seed(L);
let need=await L.evaluate(()=>MSApp.wx.toConfirm().map(e=>e.id).sort());
ok('every place a race ran at (and the schedule) needs a location: two courses, one with no race yet, two middle school names', ['cK','cN','cW','n-valley-bay'].every(id=>need.includes(id)) && !need.some(id=>id.startsWith('n-kiel')), need.join());
ok('nothing is fetched before a location is confirmed', net.calls.forecast+net.calls.archive===0 && (await L.evaluate(()=>MSApp.getWeather().length))===0);
ok('Data health lists the locations to confirm', (await L.evaluate(()=>MSApp.health().map(h=>h.kind))).includes('places'));
await L.click('#openSettings'); await W(); await L.evaluate(()=>document.querySelector('#openPlaces').click()); await W(1500);
ok('one sheet for all of them, with suggestions looked up (Winagamie GC → Neenah, Kiel HS → Kiel)', await waitFor(L,()=>{ const t=document.querySelector('#modal .pl-list'); return t&&/Neenah, Wisconsin/.test(t.textContent)&&/Kiel, Wisconsin/.test(t.textContent); },null,8000));
ok('…with a Map link to check each suggestion, and the attribution', await L.$$eval('#modal .pl-sug a[href^="https://maps.apple.com"]',x=>x.length>=2) && (await L.$eval('#modal',m=>m.textContent)).includes(NOTE));
ok('a name with no town says so (Nowhere Park, Valley Bay)', await L.evaluate(()=>[...document.querySelectorAll('#modal .pl-row')].filter(r=>/No town found/.test(r.textContent)).length>=2));
await L.click('#modal [data-plall]'); await W(800);
await L.evaluate(()=>{ const i=document.querySelector('#modal [data-plq="n-valley-bay"]'); i.value='Little Chute'; }); await L.click('#modal [data-plfind="n-valley-bay"]'); await W(800);
await L.click('#modal [data-plskip="cN"]'); await W(500);
need=await L.evaluate(()=>MSApp.wx.toConfirm().map(e=>e.id));
const PL=await L.evaluate(()=>MSApp.getPlaces());
ok('Confirm all, a typed town and Skip: nothing left to confirm', need.length===0, need.join());
ok('confirmed places keep their coordinates and who confirmed them', PL.find(p=>p.id==='cW').lat===44.1858 && PL.find(p=>p.id==='cW').confirmed && PL.find(p=>p.id==='n-valley-bay').label.startsWith('Little Chute') && PL.find(p=>p.id==='cW').confirmedBy==='Coach Ann');
ok('Skip = confirmed with no coordinates (never asked again, no weather)', PL.find(p=>p.id==='cN').confirmed && PL.find(p=>p.id==='cN').lat==null);
await L.click('#modal [data-x=done]'); await W();

console.log('2. backfill: every past race, high school and middle school');
await L.evaluate(()=>{ window.__n=null; MSApp.wx.run('force').then(n=>window.__n=n); }); await waitFor(L,()=>window.__n!=null,null,20000);
let WXS=await L.evaluate(()=>MSApp.getWeather());
const rec=id=>WXS.find(w=>w.id===id)||{};
ok('a record per race day and place, all filled in (5 in 2026, 2025, middle school Kiel and Valley Bay)', ['2026-08-28_cW','2026-09-03_cK','2026-09-11_cW','2026-09-19_cK','2026-10-01_cW','2025-09-04_cK','2024-09-12_cK','2024-10-15_n-valley-bay'].every(id=>rec(id).status==='ok'), WXS.map(w=>w.id+':'+w.status).join(' '));
ok('the middle school "Kiel Middle School Invite" uses the Kiel course (series name), "Valley Bay" the typed town', rec('2024-09-12_cK').lat===43.9125 && rec('2024-10-15_n-valley-bay').lat===44.28);
ok('recent dates from the forecast API, older ones from the archive', net.calls.forecast>=1 && net.calls.archive>=1, JSON.stringify(net.calls));
ok('averages over the race at the scheduled time: 8/28 at 8:30 AM is 70°F, dew point 60°, feels 69°', rec('2026-08-28_cW').wx.t===70&&rec('2026-08-28_cW').wx.dp===60&&rec('2026-08-28_cW').wx.at===69 && new Date(rec('2026-08-28_cW').start).getHours()===8, JSON.stringify(rec('2026-08-28_cW')));
ok('a night meet (7:45 PM, past midnight UTC) is filled from the right hours', rec('2026-09-11_cW').wx&&rec('2026-09-11_cW').wx.ws===15&&rec('2026-09-11_cW').wx.t===60);
ok('rain in the 48 hours before is summed (0.50″), none during the race', rec('2024-09-12_cK').wx.pr48===0.5&&rec('2024-09-12_cK').wx.pr===0, JSON.stringify(rec('2024-09-12_cK').wx));
ok('stored with °F, mph and inches, gusts the highest during the race', rec('2026-09-11_cW').wx.wg===23 && typeof rec('2026-09-11_cW').wx.cc==='number');
const calls0=net.calls.forecast+net.calls.archive;
await L.reload(); await L.waitForFunction(()=>window.MSApp); await W(800);
await L.evaluate(()=>{ window.__n=null; MSApp.wx.run('force').then(n=>window.__n=n); }); await waitFor(L,()=>window.__n!=null,null,20000);
ok('kept for good: after a reload nothing is fetched again', net.calls.forecast+net.calls.archive===calls0 && (await L.evaluate(()=>MSApp.getWeather().filter(w=>w.status==='ok').length))===8);

console.log('3. flags at each threshold');
const F=(w,T)=>L.evaluate((w,T)=>MSApp.wx.flags(w,T),{t:60,dp:40,ws:5,pr:0,pr48:0,...w},T||null);
ok('Warm at temperature + dew point 130, not 129', (await F({t:70,dp:60})).includes('warm') && !(await F({t:70,dp:59})).includes('warm'));
ok('Hot at 150 (instead of Warm), not 149', (await F({t:80,dp:70})).join()==='hot' && (await F({t:80,dp:69})).join()==='warm');
ok('Cold at 35°F, not 36', (await F({t:35,dp:20})).includes('cold') && !(await F({t:36,dp:20})).includes('cold'));
ok('Windy at 15 mph sustained, not 14.9', (await F({ws:15})).includes('windy') && !(await F({ws:14.9})).includes('windy'));
ok('Likely muddy at 0.50″ in the 48 hours before, not 0.49″; or any rain during the race', (await F({pr48:0.5})).includes('mud') && !(await F({pr48:0.49})).includes('mud') && (await F({pr:0.01})).includes('mud'));
ok('the thresholds are the ones passed in (adjustable)', (await F({t:70,dp:60},{warm:131,hot:150,cold:35,wind:15,mud:0.5})).length===0);

console.log('4. where weather shows: races, meet headers, runner cards, charts, always with the attribution');
await L.click('.tab[data-tab=results]'); await W(500); await L.click('[data-rv=meets]'); await W(500);
await L.evaluate(()=>document.querySelectorAll('#raceLogList details.hist').forEach(d=>d.open=true)); await W(300);
const blk=id=>L.evaluate(id=>{ const d=document.querySelector(`#raceLogList details[data-entry="${id}"]`); return d?d.textContent.replace(/\s+/g,' '):''; },id);
const meetHead=id=>L.evaluate(id=>{ const d=document.querySelector(`#histList details.hist-meet[data-meet="${id}"] > summary`); return d?d.textContent.replace(/\s+/g,' '):''; },id);
ok('a race: a compact weather tag (icon, temperature, flag)', (await blk('RmA')).includes('☀️ 70° · Warm'), (await blk('RmA')).slice(0,240));
await L.evaluate(()=>document.querySelector('#raceLogList details[data-entry="RmA"] [data-wxd]').click()); await W(300);
const sh=await L.$eval('#modal',m=>m.textContent.replace(/\s+/g,' '));
ok('…tap it: every number, the flags (icon + word) and the attribution', /Weather\s+70°F \(feels like 69°\) · dew point 60°/.test(sh) && sh.includes('☀️ Warm') && sh.includes(NOTE), sh.slice(0,200));
await L.evaluate(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
ok('meet headers: Appleton West ☀️ Warm, Kiel 🔥 Hot, Nightfall 💨 Windy; the middle school list: 💧 Likely muddy', (await meetHead('mA')).includes('☀️ 70° · Warm') && (await meetHead('mK')).includes('🔥 80° · Hot') && (await meetHead('mN')).includes('💨 60° · Windy') && await L.evaluate(()=>[...document.querySelectorAll('#histList details.hist.off')].some(d=>/Kiel Middle School/.test(d.textContent)&&/Likely muddy/.test(d.textContent))), [await meetHead('mA'),await meetHead('mK'),await meetHead('mN')].join(' | '));
ok('the same meet across years: weather side by side with flags (2026 Hot, 2025 Cold)', await L.evaluate(()=>{ const d=document.querySelector('#histList details.hist-meet[data-meet="mK"]'); if(!d) return false; d.open=true; const t=d.querySelector('.wx-years'); return !!t&&t.querySelectorAll('tbody tr').length===2&&/2026[\s\S]*Hot[\s\S]*2025[\s\S]*Cold/.test(t.textContent)&&/Weather data by Open-Meteo\.com/.test(t.parentElement.parentElement.textContent); }));
ok('the attribution once at the top of Meets (the tags are compact), and in every weather sheet', await L.evaluate(()=>/Weather data by Open-Meteo\.com/.test(document.querySelector('#adjNoteMeets').textContent)&&[...document.querySelectorAll('.wx-block')].every(b=>/Weather data by Open-Meteo\.com/.test(b.textContent))));
ok('the attribution links to open-meteo.com', await L.$eval('.wx-attr a',a=>a.href.startsWith('https://open-meteo.com')));
await L.click('[data-rv=team]'); await W(600);
ok('Data > Team: weather flags in the season chart (icon + word in the key, the rule on it) and the meet table', await L.evaluate(()=>{ const f=[...document.querySelectorAll('#rvTeam figure.viz')].find(x=>x.querySelector('.wx-band')); const k=f&&(f.querySelector('[data-key="wx-hot"]')||(f.previousElementSibling&&f.previousElementSibling.querySelector('[data-key="wx-hot"]'))); return !!k&&/Hot/.test(k.textContent)&&/temperature \+ dew point ≥ 150/.test(k.title)&&!!document.querySelector('#rvTeam .tv-meets .wx-flag'); }));
ok('…and the race-day ratings say how much the weather explains', /Weather explains/.test(await L.$eval('#rvTeam .rd-table',t=>t.textContent)) && (await L.$eval('#rvTeam',e=>e.textContent)).includes(NOTE));
ok('charts with weather flags pass the chart checks (no overlaps, key = what is drawn)', (await lib.chartProblems(L)).length===0, (await lib.chartProblems(L)).join(' | '));
await L.click('[data-rv=runners]'); await W(400); await L.click('#rvRunners [data-runner="r0"]'); await W(500);
ok('runner card: flags on the races and in the season chart, with the attribution', await L.evaluate(()=>{ const c=document.querySelector('#rvRunners'); return !!c.querySelector('.rv-race .wx-flag')&&!!c.querySelector('figure.viz .wx-band')&&c.textContent.includes('Weather data by Open-Meteo.com'); }));
ok('runner card charts pass the chart checks too', (await lib.chartProblems(L)).length===0, (await lib.chartProblems(L)).join(' | '));

console.log('5. the weather in race-day ratings');
const R=await L.evaluate(()=>MSApp.dayRatings()), dk=d=>Object.keys(R.info).find(k=>R.info[k].date===d);
const heat=DAYS.map(d=>HEAT(WX[d[0]].t+WX[d[0]].dp)), hm=heat.reduce((a,v)=>a+v,0)/heat.length;
ok('each day’s weather part = its heat (temperature + dew point guide) against the season’s average weather', DAYS.every((d,i)=>Math.abs(R.wxPart[dk(d[0])]-(heat[i]-hm))<0.004), DAYS.map((d,i)=>(100*R.wxPart[dk(d[0])]).toFixed(2)+'≈'+(100*(heat[i]-hm)).toFixed(2)).join(' '));
const ce=DAYS.map(d=>d[5]), xs=DAYS.map(d=>Date.parse(d[0])/(30*864e5)), xm=xs.reduce((a,v)=>a+v,0)/5, cm=ce.reduce((a,v)=>a+v,0)/5, sl=xs.reduce((s,x,i)=>s+(x-xm)*(ce[i]-cm),0)/xs.reduce((s,x)=>s+(x-xm)**2,0), cwant=ce.map((v,i)=>v-cm-sl*(xs[i]-xm));
ok('the rest of each rating is the course (two Winagamie days apart: Appleton West harder than Nightfall)', DAYS.every((d,i)=>Math.abs((R.d[dk(d[0])]-R.wxPart[dk(d[0])])-cwant[i])<0.005) && R.d[dk('2026-08-28')]-R.wxPart[dk('2026-08-28')]>R.d[dk('2026-09-11')]-R.wxPart[dk('2026-09-11')]+0.03, DAYS.map((d,i)=>(100*(R.d[dk(d[0])]-R.wxPart[dk(d[0])])).toFixed(2)+'≈'+(100*cwant[i]).toFixed(2)).join(' '));
ok('heat follows the published guide (coefficient 1)', R.wxBeta[0]===1);
const tr0=await L.evaluate(()=>[MSApp.teamRows('G','raw',2026).map(r=>r.avg),MSApp.seasonAvg('r0')]);

console.log('6. dismiss a flag; flags never leave results out');
await L.click('[data-rv=meets]'); await W(400); await L.evaluate(()=>document.querySelectorAll('#raceLogList details.hist').forEach(d=>d.open=true)); await W(300);
await L.evaluate(()=>document.querySelector('#raceLogList details[data-entry="RmA"] [data-wxd]').click()); await W(300);
await L.evaluate(()=>document.querySelector('#modal [data-wxflag]').click()); await W(400);
ok('tapping a flag offers to dismiss it, saying what it means', (await L.$eval('#modal',m=>m.textContent)).includes('temperature + dew point ≥ 130'));
await L.click('#modal [data-as="0"]'); await W(500);
await L.evaluate(()=>document.querySelectorAll('#raceLogList details.hist').forEach(d=>d.open=true)); await W(200);
ok('dismissed: gone from that race day, kept in the record, with an Undo bar', !(await blk('RmA')).includes('Warm') && (await L.evaluate(()=>MSApp.getWeather().find(w=>w.id==='2026-08-28_cW').dismissed.join()))==='warm' && (await L.$eval('#snack',s=>!s.hidden&&s.textContent)).includes('dismissed'));
await L.evaluate(()=>document.querySelector('#snack button').click()); await W(400);
await L.evaluate(()=>document.querySelectorAll('#raceLogList details.hist').forEach(d=>d.open=true)); await W(200);
ok('Undo brings it back', (await blk('RmA')).includes('☀️ 70° · Warm'));
await L.evaluate(()=>{ document.querySelector('#openSettings').click(); document.querySelector('#modal [data-val=warm]').click(); }); await W(300); // 3.4: a value row opens a stepper
await L.evaluate(()=>{ document.querySelector('#modal [data-vd="1"]').click(); document.querySelector('#modal [data-x=done]').click(); }); await W(300); await L.evaluate(()=>document.querySelector('#modal [data-x=done]').click()); await W(400);
await L.click('[data-rv=meets]'); await W(300); await L.evaluate(()=>document.querySelectorAll('#raceLogList details.hist').forEach(d=>d.open=true)); await W(300);
ok('Settings: Warm moved to 131, so 8/28 (130) is no longer flagged', !(await blk('RmA')).includes('Warm') && (await L.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.wx.warm))===131);
const tr1=await L.evaluate(()=>[MSApp.teamRows('G','raw',2026).map(r=>r.avg),MSApp.seasonAvg('r0')]);
ok('flags never leave a result out: team averages and season averages unchanged', JSON.stringify(tr0)===JSON.stringify(tr1));
await L.evaluate(()=>{ document.querySelector('#openSettings').click(); document.querySelector('#modal [data-val=warm]').click(); }); await W(300);
await L.evaluate(()=>{ document.querySelector('#modal [data-vd="-1"]').click(); document.querySelector('#modal [data-x=done]').click(); }); await W(300); await L.evaluate(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);

console.log('7. a new race: offline at the gun, phone location, filled in later; a failed fetch never blocks it');
await L.ctx.overridePermissions('http://localhost:8765',['geolocation']); await L.setGeolocation({latitude:44.2611,longitude:-88.4152});
await L.click('.tab[data-tab=watches]'); await W(); await L.click('#newBtn').catch(()=>{}); await W(); await L.evaluate(()=>{ const b=document.querySelector('#modal [data-new=race]')||document.querySelector('[data-new=race]'); b.click(); }); await W(600);
await L.evaluate(()=>{ const b=document.querySelector('#v-race [data-pk=all]')||document.querySelector('#v-race [data-pk]'); if(b) b.click(); }); await W(400);
ok('race setup offers to use the phone’s location at the gun', !!(await L.$('#v-race [data-wxgeo]')));
await L.evaluate(()=>document.querySelector('#v-race [data-wxgeo]').click()); await W(400);
ok('the switch turns on (and stays on for this phone)', await L.evaluate(()=>document.querySelector('#v-race [data-wxgeo]').getAttribute('aria-checked')==='true'&&JSON.parse(localStorage.getItem('mustang-splits:v1')||'{}').settings!==undefined));
await L.setOfflineMode(true); net.down=true;
await L.click('#readyBtn'); await W(300);
const t0=Date.now(); await L.click('.ready-gun'); const running=await waitFor(L,()=>{ const r=MSApp.getRace(); return r&&r.status==='running'&&!!r.gun; },null,3000);
ok('offline, no weather service: the gun fires at once', running && Date.now()-t0<2500);
await waitFor(L,()=>MSApp.getWeather().some(w=>w.src==='phone'),null,8000);
let G=await L.evaluate(()=>MSApp.getWeather().find(w=>w.raceId===MSApp.getRace().id));
const pnow=await L.evaluate(()=>Date.now());
ok('the race’s time and the phone’s location are saved right away, weather waiting', G&&G.status==='pending'&&G.lat===44.2611&&G.src==='phone'&&Math.abs(G.start-pnow)<120000, JSON.stringify(G));
await L.evaluate(()=>{ [...document.querySelectorAll('#raceGrid [data-rn]')].slice(0,3).forEach(b=>b.click()); }); await W(400);
await L.evaluate(()=>document.querySelector('[data-ra=end]').click()); await W(300); await L.click('#modal [data-x=save]'); await W(600);
ok('End race saves the results as usual', await L.evaluate(()=>MSApp.getRace().status==='done'&&!!MSApp.getRace().saved));
await L.evaluate(()=>{ window.__dt=40*60e3; window.__n=null; MSApp.wx.run('force').then(n=>window.__n=n); }); await waitFor(L,()=>window.__n!=null,null,15000);
G=await L.evaluate(()=>MSApp.getWeather().find(w=>w.raceId===MSApp.getRace().id));
ok('still offline: nothing lost, still waiting', G.status==='pending'&&G.lat===44.2611);
await L.setOfflineMode(false); net.down=false; net.fail=true;
await L.evaluate(()=>{ window.__n=null; MSApp.wx.run('force').then(n=>window.__n=n); }); await waitFor(L,()=>window.__n!=null,null,15000);
G=await L.evaluate(()=>MSApp.getWeather().find(w=>w.raceId===MSApp.getRace().id));
ok('the weather service fails: still waiting, tried again later (backoff), no error on screen', G.status==='pending'&&G.tries>=1&&G.next>Date.now()-60e3);
net.fail=false;
await L.evaluate(()=>window.dispatchEvent(new Event('online'))); await waitFor(L,()=>{ const w=MSApp.getWeather().find(x=>x.raceId===(MSApp.getRace()||{}).id); return w&&w.status==='ok'; },null,15000);
G=await L.evaluate(()=>MSApp.getWeather().find(w=>w.raceId===MSApp.getRace().id));
ok('back online: filled in by itself, at the phone’s location (58°F that day)', G.status==='ok'&&G.wx.t===58&&G.src==='phone', JSON.stringify(G));
ok('…and it shows with the saved race', await L.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); return true; }) && await waitFor(L,()=>[...document.querySelectorAll('#raceLogList details.hist')].some(d=>/58°F/.test(d.innerHTML)),null,5000));
await L.close();

console.log('8. team: locations and weather are shared, so a phone without the weather service has them too');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A',{emu:true}); await seed(A);
await A.evaluate(()=>{ MSApp.wx.setPlace('cW',{lat:44.1858,lon:-88.4626,label:'Neenah, Wisconsin'}); MSApp.wx.setPlace('cK',{lat:43.9125,lon:-88.0356,label:'Kiel, Wisconsin'}); });
await A.evaluate(()=>{ window.__n=null; MSApp.wx.run('force').then(n=>window.__n=n); }); await waitFor(A,()=>window.__n!=null,null,20000);
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(3000);
const B=await phone('B',{emu:true,noWx:true});
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B);
ok('B (no weather service) gets the confirmed places and every filled race day from the team', await waitFor(B,()=>MSApp.getPlaces().some(p=>p.id==='cW'&&p.confirmed)&&MSApp.getWeather().filter(w=>w.status==='ok').length>=6,null,25000), await B.evaluate(()=>MSApp.getWeather().filter(w=>w.status==='ok').length));
await B.evaluate(()=>{ window.__n=null; MSApp.wx.run('force').then(n=>window.__n=n); }); await waitFor(B,()=>window.__n!=null,null,15000);
ok('B has nothing to fetch for those days', (await B.evaluate(()=>MSApp.getWeather().filter(w=>w.status==='ok').length))>=6);
const wb=await B.evaluate(()=>MSApp.getWeather().find(w=>w.id==='2026-09-03_cK'));
ok('the shared record holds the numbers', wb&&wb.wx&&wb.wx.t===80&&wb.wx.dp===70);
await B.evaluate(()=>{ const w=MSApp.getWeather().find(x=>x.id==='2026-09-03_cK'); });
await A.close(); await B.close();
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
