const puppeteer=require('puppeteer-core'); const OUT=process.argv[2];
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
async function phone(tag,{tour}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  if(!tour) await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){} });
  else await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){} });
  await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue());
  p.on('pageerror',e=>errs.push(tag+': '+e.message)); await p.goto('http://localhost:8765/'); await p.waitForSelector('#newBtn'); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const shot=async(p,name)=>{ await W(300); await p.screenshot({path:`${OUT}/${name}.png`}); };
// 2.13: tiles no longer print the workout name; it's read from the saved stopwatch. Removed tiles (".gone") are skipped.
const cards=p=>p.$$eval('.watch:not(.gone)',c=>{ const S=JSON.parse(localStorage.getItem('mustang-splits:v1')||'{}'), wn=id=>{ const w=(S.watches||[]).find(x=>x.id===id), k=w&&(S.workouts||[]).find(y=>y.id===w.workoutId); return k?k.name:'No workout'; };
  // 3.17: a row's action button says what it does; mapped to the 2.13–3.14 button words this suite checks
  const big=x=>{ const l=x.querySelector('[data-r=al]').textContent, s=x.querySelector('[data-r=as]').textContent; if(l==='Done') return '✓ Done · '+x.querySelector('[data-r=big]').textContent; if(l==='Stopped') return 'Keep timing'; if(l==='Go now') return 'Next rep now'; return l==='Lap'&&/^at /.test(s)?'Lap · '+s.slice(3):l; };
  return c.map(x=>({name:MSApp.watchMeta(x.dataset.id).name,cls:x.className,big:big(x),plan:wn(x.dataset.id),text:x.innerText})); });
const menuItems=(p,i)=>p.evaluate(i=>{ document.querySelectorAll('.watch:not(.gone)')[i].querySelector('[data-act=menu]').click(); const t=[...document.querySelectorAll('#modal [data-m]')].map(b=>b.dataset.m); return t; },i);
const closeSheet=async p=>{ const x=await p.$('#modal [data-x=no]'); if(x){ await x.click(); await W(); } };
const tapMenu=async(p,i,m)=>{ await p.evaluate(i=>document.querySelectorAll('.watch:not(.gone)')[i].querySelector('[data-act=menu]').click(),i); await W(); await p.click(`#modal [data-m=${m}]`); await W(); };

console.log('1. first time: quick tour');
const N=await phone('N',{tour:true}); await W(900);
ok('tour opens on a brand-new phone', (await N.$eval('#modal',m=>m.innerText)).includes('1 of 3'));
await shot(N,'01-tour-1');
await N.click('[data-x=next]'); await W(); ok('Next goes to card 2', (await N.$eval('#modal',m=>m.innerText)).includes('2 of 3'));
await N.click('[data-x=skip]'); await W(); ok('Skip closes it', await N.$eval('#overlay',o=>o.hidden));
await N.reload(); await N.waitForSelector('#newBtn'); await W(900);
ok('it does not come back after Skip', await N.$eval('#overlay',o=>o.hidden));
await N.click('#openSettings'); await W(); if(!(await N.$('#showTour'))){ await N.click('#modal [data-spage=about]'); await W(); } await N.click('#showTour'); await W(); // 3.4: Settings > About
ok('Settings > Show the quick tour reopens it', (await N.$eval('#modal',m=>m.innerText)).includes('1 of 3'));
await N.click('[data-x=next]'); await W(); await N.click('[data-x=next]'); await W(); await shot(N,'02-tour-3');
ok('last card has Got it', !!(await N.$('[data-x=done]'))); await N.click('[data-x=done]'); await W();
await N.click('#openSettings'); await W(); if(!(await N.$('#helpBtn'))){ await N.click('#modal [data-spage=about]'); await W(); } await N.click('#helpBtn'); // 3.0: Settings > Help (3.4: About)
 await W(); ok('? sheet explains the row (tap anywhere, double taps, Undo) and the colors with "Too fast"', await N.$eval('#modal',m=>/button on the right/.test(m.innerText)&&/Double tap ignored/.test(m.innerText)&&/Too fast/.test(m.innerText)&&!/Ahead\b/.test(m.innerText)));
await shot(N,'03-help');
await N.click('[data-x=tour]'); await W(); ok('? sheet can open the tour', (await N.$eval('#modal',m=>m.innerText)).includes('1 of 3')); await N.click('[data-x=skip]'); await W();
const E=await phone('E',{tour:true}); // existing phone: has saved data, should not see the tour
await E.evaluate(()=>{}); 
console.log('2. existing phone skips the tour');
{ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ if(!sessionStorage.getItem('s')){ sessionStorage.setItem('s','1'); localStorage.setItem('mustang-splits:v1',JSON.stringify({v:1,settings:{tol:1},workouts:[],roster:[],watches:[]})); } });
  await p.goto('http://localhost:8765/'); await p.waitForSelector('#newBtn'); await W(900);
  ok('a phone with saved data does not show the tour', await p.$eval('#overlay',o=>o.hidden)); await ctx.close(); }

console.log('3. Stopwatches tab, empty state, + New');
const P=await phone('P');
ok('nav bar + (3.0: help is in Settings > Help), no legend', !!(await P.$('#newBtn')) && !(await P.$('.new-row')) && !(await P.$('.legend')) && !(await P.$('#addWatch')));
ok('Start all shows with 3 waiting', await P.$eval('#startAll',x=>!x.hidden && x.textContent==='Start all 3 waiting'));
ok('Stop all hidden (nothing running)', await P.$eval('#stopAll',x=>x.hidden));
await shot(P,'04-stopwatches');
for(let i=0;i<3;i++){ await tapMenu(P,0,'del'); }
ok('a removed stopwatch stays a moment as "Removed … · Undo" on its tile (2.13)', (await P.$$('.watch.gone [data-gone]')).length===3); await W(8400);
ok('removing all shows the three choice cards', (await P.$$('.empty-start [data-new]')).length===3 && (await P.$eval('#bulkRow',x=>x.hidden)));
await shot(P,'05-empty');
await P.click('.empty-start [data-new=quick]'); await W();
let c=await cards(P); ok('Quick stopwatch starts timing now as "Stopwatch 1" with a Lap button (3.17: was "Runner 1")', c.length===1 && c[0].name==='Stopwatch 1' && c[0].cls.includes('st-running') && c[0].big==='Lap', JSON.stringify(c[0]));
ok('no filler text on the tile (2.13: no "No workout (just a stopwatch)"), no dropdown', !/No workout/.test(c[0].text) && !(await P.$('.watch select')));
await P.click('#newBtn'); await W(); ok('+ opens the runner picker, with the three other choices under it (3.17)', (await P.$$('#modal [data-new]')).length===3 && !!(await P.$('#modal .rp-sheet')));
await shot(P,'06-new-sheet'); await closeSheet(P);
await tapMenu(P,0,'rename'); await P.click('#rnName',{clickCount:3}); await P.type('#rnName','Maya'); await P.click('#modal [data-x=yes]'); await W(); // 3.15: Rename is in the row's menu
ok('Rename from the row’s menu', (await cards(P))[0].name==='Maya');

console.log('4. Workout flow');
await P.click('.tab[data-tab=team]'); await W(); await P.click('#teamMore'); await W(); await P.click('#pasteAth'); await W(); await P.$eval('#pasteTxt',t=>t.value='Maya Lopez, Girls\nJonah Kim, Girls\nAva Chen, Girls\nSam Ortiz, Boys'); await P.click('#modal [data-x=yes]'); await W(); await P.click('.tab[data-tab=watches]'); await W();
await P.click('#newBtn'); await W(); await P.click('#modal [data-new=workout]'); await W();
ok('step 1: who is running', (await P.$eval('#modal',m=>m.innerText)).includes('Step 1 of 2'));
const vg=await P.evaluate(()=>[...document.querySelectorAll('#modal [data-gi]')].findIndex(b=>b.textContent.startsWith('Girls')));
await P.click(`#modal [data-gi="${vg}"]`); await W();
ok('the Girls heading picks every girl (2.12: Girls / Boys sections)', (await P.$eval('#modal [data-x=next]',b=>b.textContent))==='Next (3 picked)');
await shot(P,'07-flow-runners');
await P.click('#modal [data-x=next]'); await W();
ok('step 2: start buttons wait for a workout choice', await P.$eval('#modal [data-x=startnow]',b=>b.disabled));
const wid=await P.evaluate(()=>[...document.querySelectorAll('#modal [data-wk]')].find(b=>b.textContent.includes('800 @')).dataset.wk);
await P.click(`#modal [data-wk="${wid}"]`); await W();
await shot(P,'08-flow-workout');
await P.click('#modal [data-x=startnow]'); await W(400);
c=await cards(P); const started=c.filter(x=>x.plan.startsWith('800 @'));
ok('Start now: one stopwatch each, all running', started.length===3 && started.every(x=>x.cls.includes('st-running')), started.map(x=>x.name).join());
ok('they started at the same instant', await P.evaluate(()=>{ const s=new Set(JSON.parse(localStorage.getItem('mustang-splits:v1')||'{}').watches?.filter(w=>w.workoutId).map(w=>w.startAt)); return s.size===1; }) || await P.evaluate(()=>new Promise(r=>setTimeout(()=>{ const ws=JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.filter(w=>w.workoutId); r(new Set(ws.map(w=>w.startAt)).size===1); },400))));
ok('workout card big button: "Lap · 400m"', started[0].big==='Lap · 400m', started[0].big);
ok('Stop all appears with 2+ running', await P.$eval('#stopAll',x=>!x.hidden && /^Stop all \d+$/.test(x.textContent)));
const wi=c.findIndex(x=>x.plan.startsWith('800 @'));
await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-act=split]').click(),wi); await W(400);
ok('fast first tap: the status line shows the lap and how far ahead (−)', await P.evaluate(i=>/400m · \d+:\d\d\.\d · −/.test(document.querySelectorAll('.watch')[i].querySelector('[data-r=st]').textContent),wi), await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-r=st]').textContent,wi));
ok('button now says "Lap · 800m"', (await cards(P))[wi].big==='Lap · 800m');
await shot(P,'09-card-running');
await P.evaluate(i=>document.querySelectorAll('.watch')[i].scrollIntoView(),wi);
ok('running sheet (3.17): Undo, Stop, Rename, Remove', JSON.stringify(await menuItems(P,wi))==='["undo","stop","rename","del"]', JSON.stringify(await (async()=>{ await closeSheet(P); return menuItems(P,wi); })()));
await shot(P,'10-menu-running');
await P.click('#modal [data-m=undo]'); await W();
ok('Undo last tap from the menu', (await cards(P))[wi].big==='Lap · 400m');
await tapMenu(P,wi,'stop');
c=await cards(P); const stTxt=await P.evaluate(i=>document.querySelectorAll('.watch:not(.gone)')[i].querySelector('[data-r=st]').textContent,wi); ok('Stop in the menu is one tap: "Stopped" on the status line, Keep timing on the button (3.6.1)', c[wi].cls.includes('st-paused') && /^Stopped/.test(stTxt) && c[wi].big==='Keep timing', stTxt+' / '+c[wi].big);
ok('stopped sheet: Undo (off: nothing to undo), Keep timing, Start over, Rename, Remove', JSON.stringify(await menuItems(P,wi))==='["undo","resume","reset","rename","del"]'); await closeSheet(P);
await tapMenu(P,wi,'resume'); ok('Keep timing resumes', (await cards(P))[wi].cls.includes('st-running'));
await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-act=split]').click(),wi); await W(200);
await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-act=split]').click(),wi); await W(300);
c=await cards(P); ok('finishing the workout shows "✓ Done"', c[wi].cls.includes('st-done') && c[wi].big.startsWith('✓ Done'), c[wi].big);
await shot(P,'11-card-done');
ok('done sheet: Undo, Start over, Rename, Remove', JSON.stringify(await menuItems(P,wi))==='["undo","reset","rename","del"]'); await closeSheet(P);
await tapMenu(P,wi,'reset'); await W();
c=await cards(P); ok('Start over (no confirm, 2.6) goes back to Start', c[wi].cls.includes('st-idle') && c[wi].big==='Start');
ok('…with an Undo link in its status line (3.17), a 44 px touch area', await P.evaluate(i=>{ const b=document.querySelectorAll('.watch:not(.gone)')[i].querySelector('.w-ul:not([hidden])'); return !!b&&/^Undo: Started over/.test(b.getAttribute('aria-label'))&&parseFloat(getComputedStyle(b,'::before').height)>=44&&document.querySelector('#snack').hidden; },wi));
await P.evaluate(i=>document.querySelectorAll('.watch:not(.gone)')[i].querySelector('.w-ul').click(),wi); await W();
c=await cards(P); ok('Undo puts the finished results back on the same card', c[wi].cls.includes('st-done') && c[wi].big.startsWith('✓ Done'), c[wi].big);
await tapMenu(P,wi,'reset'); await W();
ok('idle sheet: Undo (off), Change runner, Change workout, Rename, Remove', JSON.stringify(await menuItems(P,wi))==='["undo","members","plan","rename","del"]');
await shot(P,'12-menu-idle'); await closeSheet(P);
const cv=await P.evaluate(()=>MSApp.getWorkouts().find(w=>w.name.startsWith('CV')).id);
await tapMenu(P,wi,'plan'); await shot(P,'13-change-workout'); await P.click(`#modal [data-wk="${cv}"]`); await W();
ok('Change workout from the menu', (await cards(P))[wi].plan.startsWith('CV'));
// rest state: CV has 200m taps on 1000m reps with 90 s rest
await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-act=start]').click(),wi); await W(200);
for(let k=0;k<5;k++){ await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-act=split]').click(),wi); await W(120); }
c=await cards(P); ok('rest shows "Next rep now"', c[wi].big==='Next rep now' && c[wi].cls.includes('ph-rest'), c[wi].big);
await shot(P,'14-card-rest');
await P.evaluate(i=>document.querySelectorAll('.watch')[i].querySelector('[data-act=gonow]').click(),wi); await W();
ok('Next rep now goes to rep 2', (await cards(P))[wi].big==='Lap · 200m');
console.log('5. Use this workout (Workouts tab)');
await P.click('.tab[data-tab=workouts]'); await W(); await P.$eval('.wk [data-w=send]',b=>b.click()); await W();
ok('opens the Workout flow', (await P.$eval('#modal',m=>m.innerText)).includes('Step 1 of 2'));
await P.click('#modal [data-x=next]'); await W();
ok('with that workout already picked', await P.$eval('#modal [data-x=later]',b=>!b.disabled) && !!(await P.$('#modal [data-wk][aria-pressed=true]')));
await P.click('#modal [data-x=later]'); await W();
ok('Set up, start later adds a waiting card on the Stopwatches tab', await P.evaluate(()=>!document.querySelector('#v-watches').hidden && [...document.querySelectorAll('.watch')].some(c=>c.className.includes('st-idle'))));
console.log('6. Settings labels and compact view');
await P.click('#openSettings'); await W(); const st=await P.$eval('#modal',m=>m.innerText);
ok('plain Settings labels', ['On-pace window','Compact rows','Show times as they come in','Beep before each rep','Click on each tap','Give every waiting stopwatch','Clear finished stopwatches','Clear all times','Show the quick tour'].every(t=>st.includes(t)));
const h0=await P.$eval('.watch.wr2',x=>x.offsetHeight); await P.click('#compactRows'); await W(); await P.click('#modal [data-x=done]'); await W();
ok('Compact rows (3.17, replaces two columns): one column, shorter rows, each with its action button and its sheet', await P.$$eval('.watch:not(.gone)',c=>c.every(x=>x.querySelector('[data-act=menu]')&&x.querySelector('.w-act'))) && await P.$eval('.grid',g=>getComputedStyle(g).gridTemplateColumns.split(' ').length===1) && await P.$eval('.watch.wr2',(x,h0)=>x.offsetHeight<h0-20&&x.offsetHeight>=50,h0));
await P.evaluate(()=>window.scrollTo(0,0)); await shot(P,'15-compact');
await P.click('.tab[data-tab=workouts]'); await W(); await P.$eval('.wk [data-w=edit]',b=>b.click()); await W(); const ed=await P.$eval('#wkEditor',x=>x.innerText);
ok('plain Workouts labels', ['How many times','Rest between','Part 1','Distance (meters)','Pace given as','Tap points','+ Add a part','What the stopwatch expects'].every(t=>ed.includes(t)));
console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
