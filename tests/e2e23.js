// 2.13.0 (fake names, fake team): Varsity/JV gone (one Girls and one Boys list per meet, team charts from any race,
// Race Mode Girls/Boys/Both), effort-based workouts with no typed time (regression: "This workout needs a distance and
// target time"), compact stopwatch tiles (names, Lap + Stop on the tile, tap-again Stop, Undo on the tile), the runner
// picker bar, the keyboard never hiding a field (a faked 320 px keyboard), steppers, the stacked team ladder.
const puppeteer=require('puppeteer-core'), path=require('path');
const T=require('./tools/fake-team.js');
const OUT=process.argv[2]||path.join(__dirname,'out');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const hide=p=>p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; });
const tab=(p,t)=>p.evaluate(t=>{ document.querySelector('#overlay').hidden=true; document.querySelector(`.tab[data-tab=${t}]`).click(); },t).then(()=>W(400));
// "Effort: CV" with no time typed (the editor's default "Total time"): each runner gets their own CV targets
const cvNoTime={id:'wkC',name:'CV 5 × 1000 (no time typed)',reps:5,rest:'1:30',restUnit:'mss',segments:[{id:'c1',effort:'cv',dist:1000,mode:'total',value:'',cp:200}]};
const effortWk={id:'wkE',name:'Threshold 3 × 1 mile',reps:3,rest:'1:00',restUnit:'mss',segments:[{id:'e1',effort:'tempo',dist:1609,mode:'effort',paceRef:'threshold',value:'',cp:400}]};
const seed=()=>{ const s=T.seed(); s.workouts=[cvNoTime,effortWk]; return s; };
const P=await T.open(b,{seed:seed()}); await T.load(P);
const tiles=()=>P.evaluate(()=>[...document.querySelectorAll('.watch:not(.gone)')].map(w=>({id:w.dataset.id,name:w.querySelector('.w-name').textContent,text:w.innerText,h:w.getBoundingClientRect().height})));
const flow=async(names,wk,how)=>{ await tab(P,'watches'); await P.evaluate(()=>{ const n=document.querySelector('#newBtn'); if(n&&n.offsetParent) n.click(); }); await W(); await P.evaluate(()=>(document.querySelector('#modal [data-new=workout]')||document.querySelector('[data-new=workout]')).click()); await W();
  await P.evaluate(n=>n.forEach(x=>[...document.querySelectorAll('#modal [data-a]')].find(c=>c.textContent.startsWith(x)).click()),names); await W();
  await P.click('#modal [data-x=next]'); await W(); await P.click(`#modal [data-wk="${wk}"]`); await W(); await P.click(`#modal [data-x=${how||'later'}]`); await W(700); };

console.log('1. Effort-based workouts (regression)');
await flow(['Avery','Rowan'],'wkC');
let t=await tiles();
ok('a part with an effort and a distance but no time is valid: no "needs a distance and target time"', t.length===2&&t.every(x=>!/needs a distance/.test(x.text)), t.map(x=>x.text.replace(/\s+/g,' ').slice(0,90)).join(' | '));
const plans=await P.evaluate(()=>MSApp.getWatches?null:null);
const pl=await P.evaluate(ids=>ids.map(id=>MSApp.planFor(id)),t.map(x=>x.id));
ok('each runner gets their own targets (Avery and Rowan differ)', pl.every(p=>p&&p.ok)&&Math.abs(pl[0].cps[0].t-pl[1].cps[0].t)>3, pl.map(p=>p&&p.cps&&p.cps[0].t.toFixed(1)).join(' vs '));
await P.evaluate(()=>document.querySelectorAll('.watch [data-act=start]').forEach(x=>x.click())); await W(500);
t=await tiles(); ok('…and they keep them after Start (fixed at Start)', t.every(x=>/Next 200m at \d:\d\d\.\d/.test(x.text)), t.map(x=>x.text.replace(/\s+/g,' ').slice(0,80)).join(' | '));
await tab(P,'workouts');
ok('the Workouts tab describes it as each runner’s pace (not "Needs a distance and target time")', await P.evaluate(()=>{ const s=document.querySelector('.wk[data-id="wkC"] .wk-sum').textContent; return /each runner’s CV/.test(s)&&!/Needs/.test(s); }), await P.evaluate(()=>document.querySelector('.wk[data-id="wkC"] .wk-sum').textContent));
await tab(P,'watches');
await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(800);
t=await tiles(); ok('…and after a reload', t.length===2&&t.every(x=>!/needs a distance/.test(x.text)&&/Next 200m/.test(x.text)));

console.log('2. Stopwatch tiles');
ok('the title is the runner’s name (never "Unnamed" with the name underneath)', t.map(x=>x.name).sort().join()==='Avery Lindqvist,Rowan Haverkamp'&&t.every(x=>!/Unnamed/.test(x.text)), t.map(x=>x.name).join());
ok('no filler text ("No workout (just a stopwatch)", "Ready to start")', t.every(x=>!/No workout \(just a stopwatch\)|Ready to start/.test(x.text)));
ok('tiles are compact and one fixed size: under 280 px tall (2.12: about 390; 3.6: a fixed 264 with the lap area and status line reserved)', t.every(x=>x.h<280)&&new Set(t.map(x=>Math.round(x.h))).size===1, t.map(x=>Math.round(x.h)).join());
const btns=await P.evaluate(id=>{ const w=document.querySelector(`.watch[data-id="${id}"]`); return [...w.querySelectorAll('.controls .btn')].map(b=>({a:b.dataset.act,primary:b.classList.contains('big-btn'),h:b.getBoundingClientRect().height,w:b.getBoundingClientRect().width})); },t[0].id);
ok('Lap (primary) and Stop on the tile, at least 44 px', btns[0].a==='split'&&btns[0].primary&&btns.some(b=>b.a==='stop')&&btns.every(b=>b.h>=44&&b.w>=44), JSON.stringify(btns));
await P.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=split]`).click(),t[0].id); await W(300);
const pill=await P.evaluate(id=>{ const p=document.querySelector(`.watch[data-id="${id}"] .w-laps .lr`); return p&&{shape:p.querySelector('.shp').textContent,word:p.querySelector('.w').textContent,cls:p.className}; },t[0].id);
ok('the last split vs target shows colour and a shape (▲ behind, ▼ too fast, ● on pace) and a word', pill&&/^[▲▼●]$/.test(pill.shape)&&/too fast|behind|on pace/.test(pill.word), JSON.stringify(pill));
const stopBtn=`.watch[data-id="${t[0].id}"] [data-act=stop]`;
await P.click(stopBtn); await W(200);
ok('Stop asks on the tile: "Tap again to stop", still running', (await P.$eval(stopBtn,x=>x.textContent))==='Tap again to stop'&&await P.evaluate(id=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.find(w=>w.id===id).status==='running',t[0].id));
await W(3300);
ok('…for 3 seconds, then it’s a plain Stop again', (await P.$eval(stopBtn,x=>x.textContent))==='Stop');
await P.click(stopBtn); await W(150); await P.click(stopBtn); await W(300);
ok('two taps stop it; the tile offers Keep timing (the undo)', await P.evaluate(id=>{ const w=document.querySelector(`.watch[data-id="${id}"]`); return /Stopped/.test(w.innerText)&&!!w.querySelector('[data-act=resume]'); },t[0].id));
await P.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=resume]`).click(),t[0].id); await W(300);
ok('…Keep timing picks up again', await P.evaluate(id=>!!document.querySelector(`.watch[data-id="${id}"] [data-act=split]`),t[0].id));
// Start over from ⋯: the Undo is on the tile
const menu=async(id,k)=>{ await P.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),id); await W(); await P.click(`#modal [data-m=${k}]`); await W(300); };
await menu(t[0].id,'stop'); await menu(t[1].id,'stop');
await menu(t[0].id,'reset'); const y=await P.$('#modal [data-x=yes]'); if(y){ await y.click(); await W(); }
ok('Start over: the Undo is on the tile, never a bar across the screen', await P.evaluate(id=>!!document.querySelector(`.watch[data-id="${id}"] .t-undo [data-act=tundo]`)&&document.querySelector('#snack').hidden,t[0].id));
await P.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=tundo]`).click(),t[0].id); await W(400);
ok('…Undo puts the times back on the same tile', await P.evaluate(id=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.find(w=>w.id===id).run.splits.length===1,t[0].id));
// Remove: the tile stays as "Removed · Undo"
await menu(t[1].id,'del');
ok('Remove: the tile stays as "Removed Rowan Haverkamp · Undo"', await P.evaluate(()=>{ const g=document.querySelector('.watch.gone'); return !!g&&/Removed Rowan Haverkamp/.test(g.innerText)&&document.querySelector('#snack').hidden; }));
await P.click('.watch.gone [data-gone]'); await W(400);
ok('…Undo brings the stopwatch back', (await tiles()).some(x=>x.name==='Rowan Haverkamp'));
// quick stopwatch
await P.evaluate(()=>document.querySelector('#newBtn').click()); await W(); await P.click('#modal [data-new=quick]'); await W(500);
ok('a quick stopwatch is "Runner 1" until renamed', (await tiles()).some(x=>x.name==='Runner 1'));
await P.screenshot({path:path.join(OUT,'e2e23-tiles.png')});

console.log('3. Picking runners');
await tab(P,'watches'); await P.evaluate(()=>document.querySelector('#newBtn').click()); await W(); await P.click('#modal [data-new=workout]'); await W();
const picked=()=>P.evaluate(()=>document.querySelectorAll('#modal [data-a][aria-pressed=true]').length);
const bar=await P.evaluate(()=>[...document.querySelectorAll('#modal .pick-bar [data-pk]')].map(b=>b.textContent));
ok('the picker starts with Select all, Girls, Boys, Clear, Suggest pace groups', bar.join('|')==='Select all|Girls|Boys|Clear|Suggest pace groups', bar.join('|'));
await P.click('#modal [data-pk=G]'); const nG=await picked(); await P.click('#modal [data-pk=B]'); const nB=await picked(); await P.click('#modal [data-pk=all]'); const nA=await picked(); await P.click('#modal [data-pk=clear]'); const n0=await picked();
ok('Girls, Boys, Select all and Clear pick the free runners (some are on stopwatches)', nG>0&&nB>0&&nA===nG+nB&&n0===0, [nG,nB,nA,n0].join());
await P.click('#modal [data-pk=groups]'); await W(300);
ok('Suggest pace groups goes straight to the group maker (everyone free)', await P.evaluate(()=>!!document.querySelector('#modal .grp-make')));
await hide(P);
await flow(['Ivy'],'wkE'); const any=(await tiles()).find(x=>/^Ivy/.test(x.name)); await P.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),any.id); await W();
await P.click('#modal [data-m=members]').catch(()=>{}); await W(300);
ok('Change runners (the Bench) has the same bar', await P.evaluate(()=>[...document.querySelectorAll('#modal .pick-bar [data-pk]')].map(b=>b.dataset.pk).join()==='all,G,B,clear'));
await hide(P);
await tab(P,'watches'); await P.evaluate(()=>document.querySelector('#newBtn').click()); await W(); await P.click('#modal [data-new=race]'); await W(500); await hide(P);
await P.evaluate(()=>{ const b=[...document.querySelectorAll('#v-race .pick-bar [data-pk]')].find(x=>x.dataset.pk==='G'); b.click(); }); await W(400);
ok('Race setup: the bar picks all the girls', await P.evaluate(()=>MSApp.getRace().runners.length===7));
const dv=await P.evaluate(()=>[...document.querySelectorAll('#v-race [data-div]')].map(b=>b.textContent));
ok('Race setup offers Girls, Boys or Both (no Varsity/JV)', dv.join()==='Girls,Boys,Both', dv.join());
await P.evaluate(()=>[...document.querySelectorAll('#v-race [data-div]')].find(b=>b.textContent==='Boys').click()); await W(300);
ok('…stored as an older-version code (BV), shown as Boys', await P.evaluate(()=>MSApp.getRace().division==='BV')&&!/Varsity/.test(await P.$eval('#v-race',x=>x.innerText)));

console.log('4. No Varsity or JV anywhere in Data');
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); }); await W(500);
await P.evaluate(()=>document.querySelectorAll('#histList details').forEach(d=>d.open=true)); await W(400);
const mt=await P.evaluate(()=>[...document.querySelectorAll('#histList details.hist-meet')].map(m=>({n:m.querySelector('summary').innerText.replace(/\s+/g,' '),divs:[...m.querySelectorAll('details.div-race .dr-name')].map(d=>d.textContent.trim().split(' ')[0])})));
ok('every meet has at most one Girls list and one Boys list', mt.length>=6&&mt.every(m=>m.divs.filter(d=>d==='Girls').length<=1&&m.divs.filter(d=>d==='Boys').length<=1), JSON.stringify(mt.slice(0,3)));
const txt=async v=>{ await P.evaluate(v=>document.querySelector(`[data-rv=${v}]`).click(),v); await W(500); return P.$eval('#v-results',x=>x.innerText); };
const all=(await txt('meets'))+(await txt('team'))+(await txt('runners'));
ok('no "Varsity" or "JV" in Meets, Team or Runners', !/Varsity|\bJV\b/.test(all), (all.match(/.{20}(Varsity|\bJV\b).{20}/)||[''])[0]);
await P.evaluate(()=>document.querySelector('[data-rv=team]').click()); await W(500);
ok('no level switch in the Team view', !(await P.$('[data-teamlvl]')));
const app=await P.evaluate(()=>{ const g=[...document.querySelectorAll('#rvTeam tbody.tv-meet')].find(x=>/Appleton/.test(x.innerText)); return g&&g.rows[1].innerText; });
ok('team top-5 from any race: Appleton West boys (3 varsity + 4 JV) have a top-5', app&&/\d+:\d\d\.\d/.test(app), app);
ok('Data health has no level checks', !(await P.evaluate(()=>MSApp.health())).some(x=>/level|Varsity/i.test(x.kind+x.text)));

console.log('5. Team ladder: two stacked ranked lists');
const ld=await P.evaluate(()=>{ const L=[...document.querySelectorAll('#rvTeam ol.ladder')]; return {heads:[...document.querySelectorAll('#rvTeam .ld-h')].map(h=>h.firstChild.textContent.trim()),
  lists:L.map(o=>[...o.querySelectorAll('.ld-row')].map(r=>({nm:r.querySelector('.ld-nm').textContent,t:r.querySelector('.ld-t').textContent,dot:!!r.querySelector('.ld-dot'),rect:r.getBoundingClientRect().toJSON()})))}; });
const sec=x=>{ const [m,s]=x.split(':'); return +m*60+(+s); };
ok('Girls list, then Boys list', ld.heads.join()==='Girls,Boys'&&ld.lists.length===2&&ld.lists[0].length===7&&ld.lists[1].length===7, ld.heads.join());
ok('each row: full name, a dot on the time axis, the time; fastest at the top', ld.lists.every(L=>L.every(r=>r.nm.includes(' ')&&r.dot&&/\d+:\d\d/.test(r.t))&&L.every((r,i)=>!i||sec(r.t)>=sec(L[i-1].t))));
ok('rows never overlap', ld.lists.every(L=>L.every((r,i)=>!i||r.rect.top>=L[i-1].rect.bottom-0.5)));
await P.evaluate(()=>document.querySelector('#rvTeam .ld-row').click()); await W(400);
ok('tapping a row opens the runner', await P.evaluate(()=>!!document.querySelector('#rvRunners .rv-name')&&!document.querySelector('#rvRunners').hidden));

console.log('6. Steppers');
await tab(P,'workouts'); await P.evaluate(()=>document.querySelector('.wk[data-id="wkC"] [data-w=edit]').click()); await W(400);
await P.evaluate(()=>document.querySelector('#wkEditor [data-wf=reps]').closest('.stepper').querySelector('[data-step="1"]').click()); await W(200);
await P.evaluate(()=>document.querySelector('#wkEditor [data-wf=rest]').closest('.stepper').querySelector('[data-step="1"]').click()); await W(200);
ok('reps + makes 6; rest + makes 1:45 (15 s steps), no keyboard', await P.evaluate(()=>{ const w=MSApp.getWorkouts().find(x=>x.id==='wkC'); return +w.reps===6&&w.rest==='1:45'; }), await P.evaluate(()=>JSON.stringify(MSApp.getWorkouts().find(x=>x.id==='wkC')).slice(0,80)));
await P.close();

console.log('7. The keyboard never hides a field (a faked 320 px keyboard)');
const K=await (await b.createBrowserContext()).newPage(); const kerr=[]; K.on('pageerror',e=>kerr.push(e.message));
await K.evaluateOnNewDocument(()=>{ const kb=320; class VV extends EventTarget{ get height(){ return window.innerHeight-(window.__kb||0); } get offsetTop(){ return 0; } get width(){ return window.innerWidth; } get scale(){ return 1; } }
  const vv=new VV(); Object.defineProperty(window,'visualViewport',{get:()=>vv}); window.__vv=vv;
  document.addEventListener('focusin',e=>{ if(e.target.matches&&e.target.matches('input:not([type=checkbox]),textarea,select')){ window.__kb=kb; vv.dispatchEvent(new Event('resize')); } });
  document.addEventListener('focusout',()=>{ setTimeout(()=>{ if(!document.activeElement||!document.activeElement.matches('input,textarea,select')){ window.__kb=0; vv.dispatchEvent(new Event('resize')); } },50); }); });
const Ks=seed(); await K.evaluateOnNewDocument(sd=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); if(!localStorage.getItem('mustang-splits:v1')) localStorage.setItem('mustang-splits:v1',sd); }catch(e){} },JSON.stringify(Ks));
await K.setViewport({width:390,height:760,isMobile:true,hasTouch:true}); await K.goto('http://localhost:8765/'); await K.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(600);
const coarse=await K.evaluate(()=>matchMedia('(pointer: coarse)').matches);
const check=async(where)=>{ const fields=await K.evaluate(()=>[...document.querySelectorAll('#modal input:not([type=checkbox]):not([type=hidden]),#modal textarea,#modal select,main .view:not([hidden]) input:not([type=checkbox]),main .view:not([hidden]) select')].filter(e=>e.offsetParent&&!e.disabled).map((e,i)=>{ e.dataset.kbt=i; return i; }));
  const hidden=[]; for(const i of fields){ await K.evaluate(i=>{ const e=document.querySelector(`[data-kbt="${i}"]`); e.focus(); },i); await W(900);
    const r=await K.evaluate(i=>{ const e=document.querySelector(`[data-kbt="${i}"]`), b=(e.closest('.tf,.stepper')||e).getBoundingClientRect(), vh=window.visualViewport.height; return {top:b.top,bottom:b.bottom,vh,lbl:(e.getAttribute('aria-label')||e.dataset.wf||e.dataset.sf||e.id||e.name||e.tagName)}; },i);
    if(r.bottom>r.vh-4||r.top<0) hidden.push(`${r.lbl} (${Math.round(r.top)}–${Math.round(r.bottom)} of ${Math.round(r.vh)})`);
    await K.evaluate(()=>document.activeElement&&document.activeElement.blur()); await W(150); }
  return {n:fields.length,hidden}; };
const sheets=[['Add runner',async()=>{ await K.evaluate(()=>document.querySelector('.tab[data-tab=team]').click()); await W(); await K.click('#addAth'); await W(); }],
  ['Workout editor',async()=>{ await K.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=workouts]').click(); }); await W(); await K.evaluate(()=>document.querySelector('.wk[data-id="wkE"] [data-w=edit]').click()); await W(400); }],
  ['Settings',async()=>{ await K.evaluate(()=>{ document.querySelector('#overlay').hidden=true; const d=document.querySelector('#wkEditor [data-w=close]'); if(d) d.click(); }); await W(); await K.click('#openSettings'); await W(); }],
  ['Race setup',async()=>{ await K.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); }); await W(); await K.evaluate(()=>(document.querySelector('[data-new=race]')||document.querySelector('#newBtn')).click()); await W(); const r=await K.$('#modal [data-new=race]'); if(r){ await r.click(); await W(500); } await K.evaluate(()=>{ document.querySelector('#overlay').hidden=true; }); }]];
for(const [nm,open] of sheets){ await open(); const c=await check(nm); ok(`${nm}: every field (${c.n}) stays above the keyboard and below the top when focused`, c.n>0&&!c.hidden.length, c.hidden.join(' | ')); }
ok('(the test ran as a touch phone: pointer coarse)', coarse);
ok('no page errors', !kerr.length, kerr.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
