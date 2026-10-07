// 3.3.1: labeled Undo and "Lap 3 recorded · Undo", Start over separate with its own Undo, End workout (practice history,
// one Undo), Edit mode (select several, remove together, one Undo), team colors (Girls pink circles, Boys blue squares)
// in charts, legends, Team tab headings and runner chips, with contrast in light and dark. Fake names only.
const puppeteer=require('puppeteer-core'), path=require('path'), T=require('./tools/fake-team.js'), lib=require('./lib.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0; const errs=[];
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=8000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:100},arg); return true; }catch(e){ return false; } };

console.log('1. Undo says what it undoes; "Lap 3 recorded · Undo"; Start over is separate');
const s=T.seed(); s.workouts=[{id:'wk4',name:'400 × 2',reps:2,rest:'0:30',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:400,mode:'total',value:'1:20',cp:200}]}];
const P=await T.open(b,{seed:s,now:'2026-10-06T15:30:00'}); P.on('pageerror',e=>errs.push(e.message)); lib.patchClick(P);
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=watches]').click(); });
const a=await P.evaluate(()=>MSApp.addWatch('Runner 1',null)), w2=await P.evaluate(()=>MSApp.addWatch('Group 1','wk4')); await P.evaluate(()=>MSApp.addWatch('Runner 3',null)); await W(300);
const tile=id=>`.watch[data-id="${id}"]`, txt=id=>P.$eval(tile(id),e=>e.textContent.replace(/\s+/g,' '));
await P.click(`${tile(a)} [data-act=start]`); await W(1300); await P.click(`${tile(a)} [data-act=split]`); await W(1100); await P.click(`${tile(a)} [data-act=split]`); await W(200);
ok('after a lap the tile says "Lap 2 recorded · 0:01.x" with Undo', /Lap 2 recorded · 0:0\d\.\d\s*Undo/.test(await txt(a)), (await txt(a)).slice(0,160));
ok('…for 4 seconds, then the labeled Undo: "Undo lap 2 (0:01.x)"', await waitFor(P,id=>/Undo lap 2 \(0:0\d\.\d\)/.test(document.querySelector(`.watch[data-id="${id}"]`).textContent),a,6000));
ok('no icon-only undo button any more', !(await P.$(`${tile(a)} .undo`)) && !(await txt(a)).includes('↶'));
await P.click(`${tile(a)} [data-act=undo]`); await W(300);
ok('Undo removes lap 2, and now offers "Undo lap 1"', (await P.evaluate(id=>MSApp.watchState(id).laps.length,a))===1 && /Undo lap 1 \(/.test(await txt(a)));
await P.click(`${tile(w2)} [data-act=start]`); await W(900); await P.click(`${tile(w2)} [data-act=split]`); await W(300);
ok('a workout: "Rep 1 · 200m recorded"', /Rep 1 · 200m recorded/.test(await txt(w2)), (await txt(w2)).slice(0,200));
await W(4300);
ok('…then "Undo rep 1 · 200m (0:00.x)"', /Undo rep 1 · 200m \(0:0\d\.\d\)/.test(await txt(w2)), (await txt(w2)).slice(0,220));
await P.click(`${tile(a)} [data-act=menu]`); await W(300);
const items=await P.$$eval('#modal [data-m]',x=>x.map(e=>e.dataset.m+':'+e.textContent.replace(/\s+/g,' ').trim()));
ok('⋯ menu: the labeled Undo, and no Start over while running (it’s its own action)', items.some(x=>/^undo:Undo lap 1/.test(x)) && !items.some(x=>x.startsWith('reset')), items.join(' | '));
await P.click('#modal [data-m=stop]'); await W(300); await P.click(`${tile(a)} [data-act=menu]`); await W(300);
ok('stopped: "Start over" in the menu, separate from Undo', await P.$eval('#modal',m=>/Start over/.test(m.textContent)&&/Undo lap 1/.test(m.textContent)));
await P.click('#modal [data-m=reset]'); await W(300); const y=await P.$('#modal [data-x=yes]'); if(y){ await y.click(); await W(300); }
ok('Start over has its own Undo on the tile', /Started over\s*Undo/.test(await txt(a)));
await P.click(`${tile(a)} [data-act=tundo]`); await W(300);
ok('…which brings the lap back', (await P.evaluate(id=>MSApp.watchState(id).laps.length,a))===1);

console.log('2. Edit mode: select several, remove together, one Undo');
await P.click('#editW'); await W(200);
ok('Edit shows selection circles and a Remove bar', await P.evaluate(()=>document.body.classList.contains('w-editing')&&!document.querySelector('#editBar').hidden&&document.querySelector('#edRemove').disabled));
await P.click(tile(a)); await P.click(`.watch:not([data-id="${a}"]):not([data-id="${w2}"])`); await W(200);
ok('tapping tiles selects them (no clocks started or stopped)', (await P.$eval('#edRemove',b=>b.textContent))==='Remove 2' && (await P.evaluate(id=>MSApp.watchState(id).status,a))==='paused');
await P.click('#edRemove'); await W(300);
ok('Remove 2: one tile left, Edit mode off, an Undo bar', (await P.$$('.watch:not(.gone)')).length===1 && !(await P.evaluate(()=>document.body.classList.contains('w-editing'))) && (await P.$eval('#snack',s=>!s.hidden&&s.textContent)).includes('Removed 2'));
await P.evaluate(()=>document.querySelector('#snack button').click()); await W(300);
ok('Undo brings both back (times kept)', (await P.$$('.watch:not(.gone)')).length===3 && (await P.evaluate(id=>MSApp.watchState(id).laps.length,a))===1);

console.log('3. End workout: practice history, every tile cleared, one Undo');
await P.click(`${tile(a)} [data-act=resume]`); await W(300);
const el0=await P.evaluate(id=>MSApp.watchState(id).el-(performance.timeOrigin+performance.now()),a);
ok('"End workout" at the top of the Stopwatches tab', await P.$eval('#endWk',b=>!b.hidden&&b.getBoundingClientRect().top<200));
await P.click('#endWk'); await W(300);
ok('it asks first and says what happens', /End the workout\?/.test(await P.$eval('#modal',m=>m.textContent)) && /practice history/.test(await P.$eval('#modal',m=>m.textContent)));
await P.click('#modal [data-x=yes]'); await W(800);
ok('every tile cleared', (await P.$$('.watch:not(.gone)')).length===0);
ok('the laps and splits are in practice history (2 stopwatches with times)', await P.evaluate(()=>{ const p=JSON.parse(localStorage.getItem('mustang-splits:v1')).practice; return p.length===1&&p[0].watches.length===2; }));
await P.evaluate(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=meets]').click(); }); await W(400);
ok('Data > Meets: Practice history shows it (a phone without a team)', await P.evaluate(()=>!document.querySelector('#practiceWrap').hidden&&/2 stopwatches/.test(document.querySelector('#practiceList').textContent)));
await P.evaluate(()=>document.querySelector('#snack button').click()); await W(400);
await P.evaluate(()=>document.querySelector('.tab[data-tab=watches]').click()); await W(300);
const el1=await P.evaluate(id=>MSApp.watchState(id).el-(performance.timeOrigin+performance.now()),a);
ok('Undo: all 3 tiles back, the running clock never stopped', (await P.$$('.watch:not(.gone)')).length===3 && (await P.evaluate(id=>MSApp.watchState(id).status,a))==='running' && Math.abs(el1-el0)<300, Math.round(el1-el0));
ok('…and the practice entry is gone again', await P.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).practice.filter(h=>!h.deleted).length===0));
await P.close();

console.log('4. team colors: Girls pink circles, Boys blue squares, in light and dark');
const lumi=h=>{ const m=h.match(/\d+(\.\d+)?/g).slice(0,3).map(v=>+v/255).map(c=>c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4); return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2]; };
const cr=(x,y)=>{ const a=lumi(x),b2=lumi(y); return (Math.max(a,b2)+0.05)/(Math.min(a,b2)+0.05); };
const hue=c=>{ const [r,g,bb]=c.match(/\d+/g).slice(0,3).map(v=>+v/255), mx=Math.max(r,g,bb), mn=Math.min(r,g,bb), d=mx-mn; if(!d) return 0; let h=mx===r?((g-bb)/d)%6:mx===g?(bb-r)/d+2:(r-g)/d+4; h*=60; return h<0?h+360:h; };
for(const dark of [false,true]){ const tag=dark?'dark':'light';
  const Q=await T.open(b,{dark,now:'2026-10-06T15:30:00'}); Q.on('pageerror',e=>errs.push(e.message)); await T.load(Q);
  const C=await Q.evaluate(()=>{ const g=getComputedStyle(document.documentElement), col=v=>{ const d=document.createElement('span'); d.style.color=`var(${v})`; document.body.appendChild(d); const c=getComputedStyle(d).color; d.remove(); return c; };
    return {girls:col('--girls'),boys:col('--boys'),bad:col('--bad'),btn:col('--btn-primary'),surface:col('--surface'),bg:col('--bg')}; });
  ok(`${tag}: Girls pink and Boys blue read on the page (contrast ≥ 4.5:1 on the surface and background)`, [C.girls,C.boys].every(c=>cr(c,C.surface)>=4.5&&cr(c,C.bg)>=4.5), JSON.stringify([cr(C.girls,C.surface).toFixed(1),cr(C.boys,C.surface).toFixed(1)]));
  ok(`${tag}: the pink is clearly not the "well behind" red (hue ${Math.round(hue(C.girls))}° vs ${Math.round(hue(C.bad))}°)`, Math.min(Math.abs(hue(C.girls)-hue(C.bad)),360-Math.abs(hue(C.girls)-hue(C.bad)))>=30);
  ok(`${tag}: the Boys blue is clearly not the button blue (hue ${Math.round(hue(C.boys))}° vs ${Math.round(hue(C.btn))}°)`, Math.abs(hue(C.boys)-hue(C.btn))>=20 || cr(C.boys,C.btn)>=1.5);
  await T.teamView(Q);
  const dots=await Q.evaluate(()=>{ const f=[...document.querySelectorAll('#rvTeam figure.viz')].find(x=>x.querySelector('.dot.s2')); if(!f) return null; const g=f.querySelector('.dot:not(.s2)'), bo=f.querySelector('.dot.s2'); return {g:getComputedStyle(g).fill,b:getComputedStyle(bo).fill,gt:g.tagName,bt:bo.tagName}; });
  ok(`${tag}: charts: Girls dots pink circles, Boys dots blue squares`, dots&&dots.g===C.girls&&dots.b===C.boys&&dots.gt==='circle'&&dots.bt!=='circle', JSON.stringify(dots));
  ok(`${tag}: the key has the same colors and shapes`, await Q.evaluate(c=>{ const k=document.querySelector('#rvTeam .viz-legend'); const s1=k&&k.querySelector('[data-key=G] .s1, [data-key=G] *[class*="s1"]'), s2=k&&k.querySelector('[data-key=B] [class*="s2"]'); return !!s1&&!!s2; },C));
  ok(`${tag}: every chart still passes the chart checks`, (await lib.chartProblems(Q)).length===0, (await lib.chartProblems(Q)).join(' | '));
  await Q.evaluate(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(400);
  const H=await Q.evaluate(()=>{ const h=s=>{ const e=document.querySelector(`.team-sec[data-sec="${s}"] .team-sh h3`); return e&&{c:getComputedStyle(e).color,b:getComputedStyle(e,'::before').content}; }; return {G:h('G'),B:h('B')}; });
  ok(`${tag}: Team tab headings: Girls ● in pink, Boys ■ in blue`, H.G&&H.B&&H.G.c===C.girls&&H.B.c===C.boys&&/●/.test(H.G.b)&&/■/.test(H.B.b), JSON.stringify(H));
  await Q.evaluate(()=>{ document.querySelector('.tab[data-tab=watches]').click(); document.querySelector('#overlay').hidden=true; }); await W(300);
  await Q.evaluate(()=>{ const n=document.querySelector('[data-new=workout]')||document.querySelector('#newBtn'); n.click(); }); await W(300); await Q.evaluate(()=>{ const n=document.querySelector('#modal [data-new=workout]'); if(n) n.click(); }); await W(400);
  const chips=await Q.evaluate(()=>{ const g=document.querySelector('#modal .chip-a.g-G'), bo=document.querySelector('#modal .chip-a.g-B'); return g&&bo&&{g:getComputedStyle(g).borderLeftColor,b:getComputedStyle(bo).borderLeftColor,gs:getComputedStyle(g.querySelector('.nm'),'::before').content,bs:getComputedStyle(bo.querySelector('.nm'),'::before').content}; });
  ok(`${tag}: runner chips: Girls pink ●, Boys blue ■`, chips&&chips.g===C.girls&&chips.b===C.boys&&/●/.test(chips.gs)&&/■/.test(chips.bs), JSON.stringify(chips));
  await Q.close(); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
