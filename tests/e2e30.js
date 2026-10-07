// 3.4: Settings as pages (iOS Settings), number rows with a stepper sheet, "Fill in weather now" never silent, and
// every visible button on every screen responds when tapped, or (if it's off on purpose) says why next to it.
// Fake names only (the fake team). Settings are the real pages here (no flat test mode).
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0; const errs=[];
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const s=T.seed(); s.workouts=[{id:'wkE',name:'800 × 4',reps:4,rest:'2:00',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:800,mode:'total',value:'2:40',cp:400}]}];
const P=await T.open(b,{seed:s,now:'2026-10-06T15:30:00',flat:false}); P.on('pageerror',e=>errs.push(e.message)); await T.load(P);
const ev=(f,...a)=>P.evaluate(f,...a), hide=()=>ev(()=>{ document.querySelector('#overlay').hidden=true; });
const tab=async t=>{ await hide(); await ev(t=>document.querySelector(`.tab[data-tab=${t}]`).click(),t); await W(300); await ev(()=>window.scrollTo(0,0)); };

console.log('1. Settings: a short list of categories, each its own page');
await ev(()=>document.querySelector('#openSettings').click()); await W(400);
const cats=await ev(()=>[...document.querySelectorAll('#modal [data-spage]')].map(b=>b.textContent.replace(/\s+/g,' ').trim()));
ok('root: Team, Weather, Workouts and paces, Race Mode, Data, Display and sound, About', cats.length===7 && /^.?.? ?Team/.test(cats[0]) && cats.some(c=>/About/.test(c)), cats.join(' | '));
ok('only a short list on the root (no settings controls there)', await ev(()=>!document.querySelector('#modal input, #modal select')));
const rowsH=await ev(()=>[...document.querySelectorAll('#modal .ios-row')].map(r=>Math.round(r.getBoundingClientRect().height)));
ok('every root row is the same height, at least 44 pt', rowsH.every(h=>h>=44&&h===rowsH[0]), rowsH.join(','));
ok('badges only where something needs attention (Weather: locations; Data: health)', await ev(()=>{ const b=k=>!!document.querySelector(`#modal [data-spage="${k}"] .hb`); return !b('display')&&!b('about')&&!b('race')&&!b('workouts'); }));
const where={team:['#coachNm','#tmJoin','#tmCreate'],weather:['#openPlaces','#wxFill','[data-val=warm]','[data-val=hot]','[data-val=cold]','[data-val=wind]','[data-val=mud]'],workouts:['[data-val=tol]','#assignAll','#clearTrack','#resetAll'],
  race:['[data-setcols]','#setGeo'],data:['#openMeets','#openImport','#openHealth','#openDeleted','#backup','#restore','#openSnaps','#exTagged','#storageLine'],display:['#compact','#liveLog','#wake','#sound'],about:['#checkUpd','#helpBtn','#showTour']};
for(const [pg,sels] of Object.entries(where)){
  await ev(pg=>document.querySelector(`#modal [data-spage="${pg}"]`).click(),pg); await W(300);
  const miss=await ev(sels=>sels.filter(s=>!document.querySelector('#modal '+s)),sels);
  const hs=await ev(()=>[...document.querySelectorAll('#modal .ios-row')].filter(r=>r.getClientRects().length).map(r=>Math.round(r.getBoundingClientRect().height)));
  ok(`${pg}: every setting from before is on this page, rows ≥ 44 pt`, !miss.length && hs.every(h=>h>=44), miss.join(',')+' '+hs.join(','));
  ok(`${pg}: a back button to Settings`, await ev(()=>!!document.querySelector('#modal [data-sback]')));
  await ev(()=>document.querySelector('#modal [data-sback]').click()); await W(300); }
ok('About credits Open-Meteo', await ev(()=>{ document.querySelector('#modal [data-spage=about]').click(); return /Weather data by Open-Meteo\.com/.test(document.querySelector('#modal').textContent); }));
await ev(()=>document.querySelector('#modal [data-sback]').click()); await W(200);

console.log('2. number settings: the value on the right, a stepper on tap');
await ev(()=>document.querySelector('#modal [data-spage=weather]').click()); await W(300);
ok('"Hot flag  150 ›"', /Hot flag\s*150/.test(await ev(()=>document.querySelector('#modal [data-val=hot]').textContent)));
await ev(()=>document.querySelector('#modal [data-val=hot]').click()); await W(300);
ok('tapping opens a stepper with the value', (await ev(()=>document.querySelector('#valNum').textContent))==='150');
await ev(()=>document.querySelector('[data-vd="1"]').click()); await ev(()=>document.querySelector('[data-vd="1"]').click()); await W(500);
ok('+ twice: 152, saved at once', (await ev(()=>document.querySelector('#valNum').textContent))==='152' && await ev(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.wx.hot===152));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);
ok('Done goes back to the Weather page, showing 152', /Hot flag\s*152/.test(await ev(()=>{ const r=document.querySelector('#modal [data-val=hot]'); return r?r.textContent:''; })));
await ev(()=>document.querySelector('#modal [data-val=mud]').click()); await W(200);
for(let i=0;i<8;i++) await ev(()=>document.querySelector('[data-vd="-1"]').click());
ok('at the lowest value − is off, and it says so', await ev(()=>document.querySelector('[data-vd="-1"]').disabled&&/Lowest: 0\.1″/.test(document.querySelector('#valWhy').textContent)), await ev(()=>document.querySelector('#valWhy').textContent));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);

console.log('3. "Fill in weather now" is never a silent button');
await ev(()=>{ MSApp.getPlaces().forEach(p=>{ p.confirmed=false; }); }); await ev(()=>document.querySelector('#modal [data-sback]').click()); await W(200); await ev(()=>document.querySelector('#modal [data-spage=weather]').click()); await W(300);
const why=await ev(()=>document.querySelector('#wxStat').textContent);
ok('with no confirmed locations it says why, right under it', /Confirm your race locations first/.test(why), why);
await ev(()=>document.querySelector('#wxFill').click()); await W(500);
ok('…and tapping it opens Race locations', await ev(()=>!!document.querySelector('#modal .pl-list')));
await hide(); await ev(()=>{ MSApp.wx.needed().forEach((e,i)=>MSApp.wx.setPlace(e.id,{lat:44+i/100,lon:-88,label:'Testville, Wisconsin'})); }); await ev(()=>{ document.querySelector('#openSettings').click(); document.querySelector('#modal [data-spage=weather]').click(); }); await W(300);
await P.setOfflineMode(true); await ev(()=>window.dispatchEvent(new Event('offline')));
await ev(()=>{ document.querySelector('#modal [data-sback]').click(); }); await W(200); await ev(()=>document.querySelector('#modal [data-spage=weather]').click()); await W(300);
ok('offline: it says the weather fills in when back online', /No signal/.test(await ev(()=>document.querySelector('#wxStat').textContent)));
await P.setOfflineMode(false);
await ev(()=>{ document.querySelector('#modal [data-sback]').click(); }); await W(200); await ev(()=>document.querySelector('#modal [data-spage=weather]').click()); await W(300);
await ev(()=>document.querySelector('#wxFill').click()); await W(1500);
const after=await ev(()=>document.querySelector('#wxStat').textContent);
ok('online with locations: it reports what happened (never the same line as before)', /Filled in|Nothing to fill in|Nothing new yet|didn’t answer/.test(after), after);
await hide();

console.log('4. every visible button on every screen responds, or says why it can’t');
const screens=[
  ['Stopwatches',async()=>{ await tab('watches'); if(!(await ev(()=>!!document.querySelector('.watch')))){ await ev(()=>{ const q=document.querySelector('[data-new=quick]'); if(q) q.click(); }); await W(300); } }],
  ['Workouts',async()=>tab('workouts')],
  ['Team',async()=>tab('team')],
  ['Data: Meets',async()=>{ await tab('results'); await ev(()=>document.querySelector('[data-rv=meets]').click()); await W(300); await ev(()=>{ const d=document.querySelector('#histList details.hist-meet'); if(d){ d.open=true; const r=d.querySelector('details.div-race'); if(r) r.open=true; } }); await W(200); }],
  ['Data: Runners',async()=>{ await tab('results'); await ev(()=>{ document.querySelector('[data-rv=runners]').click(); const bk=document.querySelector('[data-rvback]'); if(bk) bk.click(); }); await W(300); }],
  ['Data: a runner',async()=>{ await tab('results'); await ev(()=>{ document.querySelector('[data-rv=runners]').click(); const r=document.querySelector('#rvRunners [data-runner]'); if(r) r.click(); }); await W(400); }],
  ['Data: Team',async()=>{ await tab('results'); await ev(()=>{ const bk=document.querySelector('[data-rvback]'); if(bk) bk.click(); document.querySelector('[data-rv=team]').click(); }); await W(400); }],
  ...['', 'team','weather','workouts','race','data','display','about'].map(pg=>[`Settings${pg?' > '+pg:''}`,async()=>{ await hide(); await ev(pg=>{ window.scrollTo(0,0); window.__openSet(pg); },pg); await W(300); }]),
  ['Race setup',async()=>{ await tab('watches'); await ev(()=>{ if(!MSApp.getRace()){ document.querySelector('#newBtn').click(); const r=document.querySelector('#modal [data-new=race]'); if(r) r.click(); } else document.querySelector('.tab[data-tab=watches]').click(); }); await W(400); await hide(); await ev(()=>{ const rb=document.querySelector('#raceBanner button, #raceBanner'); if(MSApp.getRace()&&!document.querySelector('#v-race:not([hidden])')&&rb) rb.click(); }); await W(300); }]];
await ev(()=>{ window.__openSet=pg=>{ document.querySelector('#openSettings').click(); if(pg){ const c=document.querySelector(`#modal [data-spage="${pg}"]`); if(c) c.click(); } }; });
const visibleButtons=()=>ev(()=>{ const vis=e=>{ if(!e.getClientRects().length) return false; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) return false; if(e.closest('[hidden],details:not([open])>*:not(summary)')) return false; return true; };
  const scope=document.querySelector('#overlay:not([hidden])')?document.querySelector('#modal'):document;
  return [...scope.querySelectorAll('button,[role=button],summary')].filter(vis).filter(e=>!e.closest('.tabbar')||e.classList.contains('tab')).map((e,i)=>({i,txt:(e.textContent||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,40)||e.className,dis:!!e.disabled})); });
// tapOne: a running clock's own updates don't count as a response; SVG chart points get a real click event
const tapOne=i=>ev(i=>new Promise(res=>{ const vis=e=>{ if(!e.getClientRects().length) return false; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0) return false; if(e.closest('[hidden],details:not([open])>*:not(summary)')) return false; return true; };
  const scope=document.querySelector('#overlay:not([hidden])')?document.querySelector('#modal'):document;
  const L=[...scope.querySelectorAll('button,[role=button],summary')].filter(vis).filter(e=>!e.closest('.tabbar')||e.classList.contains('tab')), e=L[i]; if(!e) return res({skip:true});
  if(e.disabled){ const near=(e.parentElement&&e.parentElement.textContent||'')+' '+((e.closest('.modal,section,.field,.ios-group')||{}).textContent||'');
    const why=e.getAttribute('data-why')||e.title||(e.getAttribute('aria-describedby')&&document.getElementById(e.getAttribute('aria-describedby'))&&document.getElementById(e.getAttribute('aria-describedby')).textContent)||'';
    const self=/first|no |not |need|select|pick|lowest|highest|nothing|already|full|tap /i.test(e.textContent);
    return res({disabled:true,explained:!!(why||self||/Lowest|Highest|first|needs?|full/i.test(near.replace(e.textContent,''))),txt:e.textContent.trim().slice(0,40)}); }
  let n=0; const live=x=>{ const el2=x&&(x.nodeType===1?x:x.parentElement); return !!(el2&&el2.closest&&el2.closest('[data-r],#raceClock,#liveClock,.ready-clock')); }; const mo=new MutationObserver(m=>{ n+=m.filter(r=>!live(r.target)).length; }); mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});
  let picked=false; const fileClick=x=>{ if(x.target&&x.target.type==='file'){ picked=true; x.preventDefault(); } }; document.addEventListener('click',fileClick,true);
  const sy=scrollY; try{ if(typeof e.click==='function') e.click(); else e.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true})); }catch(err){}
  setTimeout(()=>{ mo.disconnect(); document.removeEventListener('click',fileClick,true); res({n,picked,scrolled:scrollY!==sy,txt:(e.textContent||e.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim().slice(0,40)}); },650); }),i);
let total=0, dead=[], silent=[];
for(const [name,enter] of screens){
  await enter(); const list=await visibleButtons(); total+=list.length;
  for(let i=0;i<list.length;i++){ await enter(); const r=await tapOne(i);
    if(r.skip) continue;
    if(r.disabled){ if(!r.explained) silent.push(`${name}: “${r.txt}” is off with no reason`); continue; }
    if(!(r.n||r.picked||r.scrolled)) dead.push(`${name}: “${r.txt}”`);
    await P.setOfflineMode(false); }
  console.log(`  ·   ${name}: ${list.length} buttons`); }
ok(`every visible button (${total}) does something when tapped`, !dead.length, dead.join(' | '));
ok('every button that’s off says why', !silent.length, silent.join(' | '));
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
