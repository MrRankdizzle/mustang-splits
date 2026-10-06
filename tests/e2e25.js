// 3.0.0 (fake names, fake team): the feature inventory in docs/design-3.0.md. For every feature (F01–F75) it follows the
// 3.0 path from a fresh screen and checks the control is there (visible, or present where it only shows in a team).
// Also: a coach who has never seen the app starts a workout for the whole team in under a minute (taps and time), and
// every main screen at a large text size (no sideways scroll, nothing clipped).
const puppeteer=require('puppeteer-core'), path=require('path');
const T=require('./tools/fake-team.js');
const OUT=process.argv[2]||path.join(__dirname,'out');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const MILE=1609.34, cps=()=>[{id:'m1',name:'Mile 1',dist:MILE,unit:'mi'},{id:'m2',name:'Mile 2',dist:2*MILE,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}];
const hand={id:'HW1',key:'HW1',date:'2026-10-01',savedAtMs:Date.parse('2026-10-01T18:00'),uploaded:false,edits:[],race:{name:'Waupaca Girls',raceId:'race-HW1',courseId:null,courseName:'',goalSrc:'none',meetId:'m26-2026-10-01-waupaca-invite',seriesId:null,division:'GV',checkpoints:cps(),
  rows:['f0','f1'].map(id=>({id,name:id,group:'',goal:null,goalTag:null,pr:null,sb:null,cells:[]})),marks:['f0','f1'].flatMap((id,k)=>[[0,430+k*5],[1,890+k*9],[2,1391+k]].map(([ci,t])=>({id:'HW1'+id+ci,ci,rid:id,t,dev:'s',byName:'Coach Ann',at:0,chosen:false,deleted:false,hist:[]})))}};
const effortWk={id:'wkE',name:'CV 5 × 1000',reps:5,rest:'1:30',restUnit:'mss',segments:[{id:'s1',effort:'cv',dist:1000,mode:'effort',paceRef:'cv',value:'',cp:200}]};
const seed=()=>{ const s=T.seed(); s.workouts=[effortWk]; s.raceLog=[hand]; s.roster.push({id:'u1',name:'Una Unset',group:'',gender:''}); return s; };
const P=await T.open(b,{seed:seed()}); await T.load(P);
const ev=(f,...a)=>P.evaluate(f,...a), hide=()=>ev(()=>{ document.querySelector('#overlay').hidden=true; document.body.classList.remove('wk-editing'); const e=document.querySelector('#wkEditor'); if(e) e.innerHTML=''; });
const tab=async t=>{ await hide(); await ev(t=>document.querySelector(`.tab[data-tab=${t}]`).click(),t); await W(350); };
const click=async sel=>{ const okk=await ev(sel=>{ const e=document.querySelector(sel); if(!e) return false; e.click(); return true; },sel); await W(300); return okk; };
const clickText=async(sel,txt)=>{ const okk=await ev((sel,txt)=>{ const e=[...document.querySelectorAll(sel)].find(x=>x.textContent.trim().startsWith(txt)); if(!e) return false; e.click(); return true; },sel,txt); await W(300); return okk; };
const visible=sel=>ev(sel=>{ const e=document.querySelector(sel); if(!e) return false; const r=e.getBoundingClientRect(), cs=getComputedStyle(e); return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&!e.closest('[hidden]'); },sel);
const exists=sel=>ev(sel=>!!document.querySelector(sel),sel);
const seeText=(sel,txt)=>ev((sel,txt)=>[...document.querySelectorAll(sel)].some(x=>x.textContent.includes(txt)&&x.getBoundingClientRect().height>0),sel,txt);
const settings=async()=>{ await hide(); await click('#openSettings'); };
// setup: a quick stopwatch with a lap; two waiting workout stopwatches
await tab('watches'); await click('[data-new=quick]'); await W(400); await click('.watch [data-act=split]');
await click('#newBtn'); await click('#modal [data-new=workout]'); await ev(()=>['Avery','Maren'].forEach(n=>[...document.querySelectorAll('#modal [data-a]')].find(x=>x.textContent.startsWith(n)).click())); await W();
await click('#modal [data-x=next]'); await click('#modal [data-wk=wkE]'); await click('#modal [data-x=later]'); await W(500);

const F=[
 ['F01','New quick stopwatch',async()=>{ await tab('watches'); await click('#newBtn'); return visible('#modal [data-new=quick]'); }],
 ['F02','New workout stopwatches',async()=>visible('#modal [data-new=workout]')],
 ['F03','New race',async()=>visible('#modal [data-new=race]')],
 ['F04','Picker: Select all / Girls / Boys / Clear',async()=>{ await click('#modal [data-new=workout]'); return (await visible('#modal [data-pk=all]'))&&(await visible('#modal [data-pk=G]'))&&(await visible('#modal [data-pk=B]'))&&(await visible('#modal [data-pk=clear]')); }],
 ['F05','Suggest pace groups',async()=>visible('#modal [data-pk=groups]')],
 ['F06','Start all waiting',async()=>{ await tab('watches'); return visible('#startAll'); }],
 ['F07','Stop all running (action sheet)',async()=>{ await click('#startAll'); await W(400); const v=await visible('#stopAll'); await click('#stopAll'); const s=await visible('#modal.action .as-btn.destructive'); await click('#modal [data-x=no]'); return v&&s; }],
 ['F08','How to read a card: Settings > Help',async()=>{ await settings(); return visible('#modal #helpBtn'); }],
 ['F09','Tile: Lap, Stop (tap again), Undo',async()=>{ await tab('watches'); return (await visible('.watch.st-running [data-act=split]'))&&(await visible('.watch.st-running [data-act=stop]'))&&(await visible('.watch [data-act=undo]')); }],
 ['F10','Tile menu (⋯)',async()=>{ await click('.watch [data-act=menu]'); return visible('#modal [data-m]'); }],
 ['F11','Rename a stopwatch (tile name)',async()=>{ await hide(); return visible('.watch .w-name'); }],
 ['F12','Targets ± (⋯ > Targets on a waiting effort stopwatch)',async()=>{ await ev(()=>{ const w=[...document.querySelectorAll('.watch')].find(x=>x.querySelector('[data-act=start]')); if(w) w.querySelector('[data-act=menu]').click(); }); await W(300);
   if(!(await exists('#modal [data-m=targets]'))){ await hide(); await click('#newBtn'); await click('#modal [data-new=workout]'); await ev(()=>[...document.querySelectorAll('#modal [data-a]')].find(x=>x.textContent.startsWith('Juniper')).click()); await W(); await click('#modal [data-x=next]'); await click('#modal [data-wk=wkE]'); await click('#modal [data-x=later]'); await W(400);
     await ev(()=>{ const w=[...document.querySelectorAll('.watch')].find(x=>x.querySelector('[data-act=start]')); if(w) w.querySelector('[data-act=menu]').click(); }); await W(300); }
   return visible('#modal [data-m=targets]'); }],
 ['F13','Splits list on the tile',async()=>{ await hide(); return visible('.watch details.log'); }],
 ['F14','Today’s goal and suggestions',async()=>{ await tab('workouts'); return (await visible('#wkToday .goal-btn'))&&(await visible('#wkToday [data-tpl-use]')); }],
 ['F15','Use a suggestion (steppers)',async()=>{ await click('#wkToday [data-tpl-use]'); return visible('#modal .stepper'); }],
 ['F16','Build your own: nav +',async()=>{ await hide(); return visible('#newWk'); }],
 ['F17','Use a saved workout: tap > Use',async()=>{ await click('#wkList .sw-front'); return seeText('#modal .as-btn','Use this workout'); }],
 ['F18','Edit a workout: tap > Edit (sheet)',async()=>{ await clickText('#modal .as-btn','Edit'); await W(300); return visible('#wkEditor [data-wf=name]'); }],
 ['F19','Duplicate: tap > Duplicate (or swipe)',async()=>{ await hide(); await click('#wkList .sw-front'); return (await seeText('#modal .as-btn','Duplicate'))&&(await exists('#wkList .sw-trail [data-w=dup]')); }],
 ['F20','Delete a workout: swipe or tap > Delete',async()=>(await seeText('#modal .as-btn.destructive','Delete'))&&(await exists('#wkList .sw-trail [data-w=del]'))],
 ['F21','Workout editor fields',async()=>{ await hide(); await ev(()=>document.querySelector('#wkList [data-w=edit]').click()); await W(300); const f=['[data-wf=reps]','[data-wf=rest]','[data-sf=effort]','[data-sf=mode]','[data-sf=cp]','[data-sf=dist]']; for(const x of f) if(!(await exists('#wkEditor '+x))) return false; return true; }],
 ['F22','Add a runner: Team nav +',async()=>{ await tab('team'); return visible('#addAth'); }],
 ['F23','Add to Girls / Boys',async()=>visible('.team-sec [data-t=addsec]')],
 ['F24','Paste a list: Team ⋯',async()=>{ await click('#teamMore'); return visible('#modal #pasteAth'); }],
 ['F25','Merge runners: Team ⋯',async()=>visible('#modal #mergeAth')],
 ['F26','Search runners',async()=>{ await hide(); return visible('#teamSearch'); }],
 ['F27','Sort: Average / Season best / Name',async()=>visible('#teamTools [data-rsort=sb]')],
 ['F28','Collapse Girls / Boys',async()=>visible('.team-sec > summary')],
 ['F29','Runner sheet: name, Girls/Boys, results',async()=>{ await click('.ath .ath-row'); return (await visible('#modal [data-af=name]'))&&(await visible('#modal [data-rg]'))&&(await visible('#modal [data-x=add]')); }],
 ['F30','Remove a runner: swipe, or the runner sheet',async()=>(await visible('#modal [data-x=remove]'))&&(await exists('.ath .sw-trail [data-t=swrm]'))],
 ['F31','Girls / Boys quick buttons for unset runners',async()=>{ await hide(); return visible('.ath [data-t=sec]'); }],
 ['F32','Meets / Runners / Team',async()=>{ await tab('results'); return (await visible('[data-rv=meets]'))&&(await visible('[data-rv=runners]'))&&(await visible('[data-rv=team]')); }],
 ['F33','Season picker in the nav bar',async()=>visible('#seasonPick')],
 ['F34','Meets list and race results',async()=>{ await click('[data-rv=meets]'); return visible('#histList details.hist-meet'); }],
 ['F35','Share a race (Copy results / CSV)',async()=>{ await ev(()=>{ const d=document.querySelector('#histList details.hist-meet'); d.open=true; const r=d.querySelector('details.div-race'); r.open=true; }); await W(300); await click('#histList details.div-race[open] [data-share]'); return (await seeText('#modal .as-btn','Copy results'))&&(await seeText('#modal .as-btn','Save as spreadsheet')); }],
 ['F36','Share today’s stopwatches',async()=>{ await hide(); await click('#shareToday'); return (await visible('#modal #copyRes'))&&(await visible('#modal #dlRes')); }],
 ['F37','Edit hand times',async()=>{ await hide(); return exists('#histList [data-hedit]'); }],
 ['F38','Race tags / runner tags',async()=>exists('#histList [data-htag],#histList [data-tag],#histList [data-rtag],#histList [data-tagrace]')||exists('#histList .race-actions')],
 ['F39','Delete a saved race (on this phone)',async()=>exists('#raceLogList [data-rldel]')],
 ['F40','Races on this phone',async()=>visible('#raceLogWrap')],
 ['F41','Practice history (a team’s, when there is one)',async()=>exists('#practiceWrap')],
 ['F42','Meet charts',async()=>exists('#histList .mt-charts figure.viz')],
 ['F43','Runners list',async()=>{ await click('[data-rv=runners]'); return visible('#rvRunners .rv-row'); }],
 ['F44','Runner card (back in the nav bar)',async()=>{ await click('#rvRunners .rv-row'); return (await visible('#rvRunners .rv-name'))&&(await visible('#navLeft [data-rvback]'))&&(await exists('#rvRunners [data-cmp]')); }],
 ['F45','Raw / Course-adjusted',async()=>visible('#rvRunners [data-rvchart]')],
 ['F46','Leave tagged results out of trends: Settings > Data (one place)',async()=>{ const views=await exists('#v-results [data-extag]'); await settings(); return (await visible('#modal #exTagged'))&&!views; }],
 ['F47','Team view: ladder, top-5, packs',async()=>{ await hide(); await click('[data-rvback]'); await click('[data-rv=team]'); return (await visible('#rvTeam ol.ladder'))&&(await exists('#rvTeam svg[aria-label^="Top-5"]')); }],
 ['F48','Import history file: Settings > Data',async()=>{ await settings(); return visible('#modal #openImport'); }],
 ['F49','Recently deleted: Settings > Data',async()=>visible('#modal #openDeleted')],
 ['F50','Data health: Settings > Data',async()=>visible('#modal #openHealth')],
 ['F51','Restore a snapshot',async()=>visible('#modal #openSnaps')],
 ['F52','Meets screen',async()=>{ await click('#modal #openMeets'); return seeText('#modal','2026'); }],
 ['F53','On-pace window (stepper)',async()=>{ await settings(); return (await visible('#modal #tol'))&&(await exists('#modal .stepper #tol')); }],
 ['F54','Smaller cards',async()=>visible('#modal #compact')],
 ['F55','Show times as they come in',async()=>visible('#modal #liveLog')],
 ['F56','Beep before each rep',async()=>visible('#modal #sound')],
 ['F57','Keep screen on',async()=>visible('#modal #wake')],
 ['F58','Your name in Race Mode',async()=>visible('#modal #coachNm')],
 ['F59','Team: create / join',async()=>visible('#modal #tmCreate')],
 ['F60','Give every waiting stopwatch a workout',async()=>visible('#modal #assignAll')],
 ['F61','Clear finished stopwatches (action sheet)',async()=>{ await click('#modal #clearTrack'); const s=await visible('#modal.action .as-btn.destructive'); await click('#modal [data-x=no]'); return s; }],
 ['F62','Clear all times (action sheet)',async()=>{ await settings(); await click('#modal #resetAll'); const s=await visible('#modal.action .as-btn.destructive'); await click('#modal [data-x=no]'); return s; }],
 ['F63','Back up / Restore',async()=>{ await settings(); return (await visible('#modal #backup'))&&(await visible('#modal #restore')); }],
 ['F64','Quick tour',async()=>visible('#modal #showTour')],
 ['F65','Version, Check for updates',async()=>(await visible('#modal #checkUpd'))&&(await seeText('#modal .ver','3.0'))],
 ['F66','Storage line',async()=>exists('#modal #storageLine')],
 ['F67','Race setup',async()=>{ await tab('watches'); await click('#newBtn'); await click('#modal [data-new=race]'); await hide(); return (await visible('#v-race [data-div]'))&&(await visible('#v-race [data-meet]'))&&(await visible('#v-race [data-rname]'))&&(await visible('#v-race [data-pk=all]')); }],
 ['F68','Ready for the gun / Gun',async()=>{ await click('#v-race [data-pk=G]'); await W(300); await click('#readyBtn'); return visible('.ready-gun'); }],
 ['F69','Recording: I’m at, Time now name later, names',async()=>{ await click('.ready-gun'); await W(700); return (await visible('.race-at button'))&&(await visible('#raceGrid [data-rn]')); }],
 ['F71','Race results editor',async()=>{ await click('#raceGrid [data-rn]'); await W(500); await ev(()=>{ const d=document.querySelector('.race-res'); if(d) d.open=true; }); return exists('#v-race [data-rc]'); }],
 ['F72','Exit race view / Race running bar',async()=>{ const x=await visible('#raceClose'); await click('#raceClose'); await W(300); return x&&(await visible('#liveBar')); }],
 ['F70','End race (action sheet)',async()=>{ await click('#liveBar'); await W(500); await click('[data-ra=end]'); const s=(await exists('#modal.action [data-x=save]'))&&(await exists('#modal.action [data-x=discard]')); await click('#modal [data-x=no]'); return s; }],
 ['F73','Update banner',async()=>exists('#updateBanner')],
 ['F74','Install banner',async()=>exists('#installBanner')],
 ['F75','Health badge on the Settings gear',async()=>(await exists('#gearBadge'))&&(await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); return !!document.querySelector('#modal #openHealth .hb'); }))],
];
console.log(`1. Feature inventory (${F.length} features, docs/design-3.0.md)`);
for(const [id,name,fn] of F){ let r=false, err=''; try{ r=await fn(); }catch(e){ err=e.message; } ok(`${id} ${name}`, !!r, err); }
ok('the inventory covers F01–F75', new Set(F.map(f=>f[0])).size===75);
ok('no page errors', !P.errs.length, P.errs.join(' | '));
await P.close();

console.log('2. A new coach starts a workout for the whole team in under a minute');
const N=await T.open(b,{}); await T.load(N); const t0=Date.now(); let taps=0;
const tap=async sel=>{ taps++; const v=await N.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return false; const r=e.getBoundingClientRect(); return r.top>=0&&r.bottom<=innerHeight; },sel); await N.click(sel); await W(350); return v; };
await N.evaluate(()=>{ document.querySelector('#overlay').hidden=true; window.scrollTo(0,0); }); await W(400); taps=0;
// no saved workouts yet: the Workouts tab's suggestion for today is the way in
const seen=[await tap('.tab[data-tab=workouts]'),await tap('#wkToday [data-tpl-use]'),await tap('#modal [data-x=runners]'),await tap('#modal [data-pk=all]'),await tap('#modal [data-x=next]'),await tap('#modal [data-x=startnow]')];
const ws=await N.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.filter(w=>w.status==='running').length), secs=(Date.now()-t0)/1000;
ok(`6 taps with no saved workouts (Workouts, Use this, Choose runners, Select all, Next, Start now); every button on screen without scrolling`, taps===6&&seen.every(Boolean), seen.join());
ok(`every runner is running: ${ws} stopwatches (the whole team)`, ws===14, ws);
ok(`well under a minute even at 8 s a tap (${taps} taps: ${taps*8} s)`, taps*8<60&&secs<60, secs.toFixed(1)+' s in the test');
await N.close();

console.log('3. Larger text (the phone’s text size setting)');
const L=await T.open(b,{}); await T.load(L);
await L.addStyleTag({content:'html{font-size:24px!important}'}); await W(300);
for(const t of ['watches','workouts','team','results']){ await L.evaluate(t=>{ document.querySelector('#overlay').hidden=true; document.querySelector(`.tab[data-tab=${t}]`).click(); },t); await W(500);
  const r=await L.evaluate(()=>({side:document.documentElement.scrollWidth<=innerWidth+1,clipped:[...document.querySelectorAll('main .btn:not([hidden]), .tab, .nav-title')].filter(e=>e.offsetParent&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflow!=='visible').map(e=>e.textContent.trim().slice(0,20)),title:document.querySelector('#navTitle').textContent}));
  ok(`${t} at a large text size: no sideways scroll, nothing clipped`, r.side&&!r.clipped.length, JSON.stringify(r)); }
await L.evaluate(()=>{ document.querySelector('#openSettings').click(); }); await W(400);
ok('Settings at a large text size: no sideways scroll', await L.evaluate(()=>document.querySelector('#modal').scrollWidth<=document.querySelector('#modal').clientWidth+1));
await L.screenshot({path:path.join(OUT,'e2e25-large-text.png')});
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
