// 2.7.1 race-day UX: + New vs the three cards, tab bar and "Race running" bar, Ready screen, faster editing.
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,{block}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){}
    try{ Object.defineProperty(navigator,'clipboard',{value:{writeText:async t=>{ window.__clip=t; }}}); }catch(e){} });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  if(block){ await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); }
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const tab=async(p,t)=>{ await p.click(`.tab[data-tab=${t}]`); await W(); };
const vis=(p,sel)=>p.evaluate(s=>{ const e=document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display!=='none'; },sel);
const tabbar=p=>vis(p,'.tabbar');
const rid=(p,n)=>p.evaluate(n=>(MSApp.getRoster().find(a=>a.name.startsWith(n))||{}).id,n);
const race=p=>p.evaluate(()=>MSApp.getRace());
const snackText=p=>p.$eval('#snack',s=>s.hidden?'':s.textContent);
const closeModal=async p=>{ if(!(await p.$eval('#overlay',o=>o.hidden))){ const x=await p.$('#modal [data-x=done],#modal [data-x=no],#modal [data-x=cancel]'); if(x) await x.click(); else await p.evaluate(()=>document.querySelector('#overlay').hidden=true); await W(); } };
const typeIn=async(p,sel,d)=>{ await p.$eval(sel,i=>{ i.focus(); i.select(); }); await p.keyboard.type(d); await W(); };
const inject=(p,list)=>p.evaluate(list=>{ const r=MSApp.getRace(); MSApp.applyRemote({marks:{upsert:list.map(([n,ci,t])=>({id:'m'+n+ci,cp:r.checkpoints[ci].id,local:r.gun.local+t*1000,off:r.gun.off,runnerId:r.runners.find(x=>x.name.startsWith(n)).id,by:'o',byName:'Coach Jen'})),remove:[]}}); },list);
const cellT=(p,n,ci)=>p.evaluate((n,ci)=>{ const r=MSApp.getRace(), rn=r.runners.find(x=>x.name.startsWith(n)); const L=r.marks.filter(m=>!m.deleted&&m.runnerId===rn.id&&m.cp===r.checkpoints[ci].id); if(!L.length) return null; const t=m=>((m.local+(m.off||0))-(r.gun.local+(r.gun.off||0)))/1000; const c=L.find(m=>m.chosen)||L.sort((a,b)=>t(a)-t(b))[0]; return Math.round(t(c)*10)/10; },n,ci);
const openCell=async(p,n,ci)=>{ await closeModal(p); const ri=await p.evaluate(n=>MSApp.getRace().runners.findIndex(x=>x.name.startsWith(n)),n); await p.evaluate(()=>{ const d=document.querySelector('.race-res'); if(d) d.open=true; });
  await p.click(`.race-cards [data-rc="${ri}:${ci}"]`); await W(); };

console.log('1. item 4: the three cards or "+ New", never both');
const L=await phone('L',{block:true});
ok('with stopwatches: "+ New" only, no cards', await vis(L,'#newBtn') && !(await L.$('.empty-start')));
for(let i=0;i<3;i++){ await L.click('.watch:not(.gone) [data-act=menu]'); await W(); await L.click('#modal [data-m=del]'); await W(); }
await W(8400); // 2.13: removed tiles keep their Undo for 8 s
ok('no stopwatches: the three cards only, "+ New" hidden', !(await vis(L,'#newBtn')) && (await L.$$('.empty-start .choice')).length===3);
ok('…with the help link (the ? moved into the empty state)', !!(await L.$('.empty-start [data-help]')));
await L.click('.empty-start [data-new=quick]'); await W();
ok('after adding one: "+ New" back, cards gone', await vis(L,'#newBtn') && !(await L.$('.empty-start')));

console.log('2. items 5 and 6: tab bar, Ready screen, Exit race view, Race running bar');
await tab(L,'team'); await L.click('#teamMore'); await W(); await L.click('#pasteAth'); await W(); await L.$eval('#pasteTxt',t=>t.value='Maya Lopez, V, Girls\nAva Chen, V, Girls\nZoe Park, V, Girls'); await L.click('[data-x=yes]'); await W(300);
await tab(L,'watches'); await L.click('#newBtn'); await W(); await L.click('[data-new=race]'); await W();
ok('setup: tab bar shows', await tabbar(L));
ok('setup: "Ready for the gun" bar, off until runners are picked', await vis(L,'#readyBar') && (await L.$eval('#readyBtn',b=>b.disabled&&b.textContent==='Pick runners first')));
await L.click('[data-rg="0"]'); await W();
ok('…then "Ready for the gun · 3 runners"', (await L.$eval('#readyBtn',b=>!b.disabled&&b.textContent))==='Ready for the gun · 3 runners');
const barTop=await L.$eval('#readyBar',x=>x.getBoundingClientRect().top); await L.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await W();
ok('the bar stays put while setup scrolls (never scrolled away)', (await L.$eval('#readyBar',x=>x.getBoundingClientRect().top))===barTop && (await L.evaluate(()=>scrollY))>0);
ok('setup has no Gun button any more (one way to start)', !(await L.$('#raceBody [data-ra=gun]')));
await L.click('#readyBtn'); await W();
ok('Ready screen: huge Gun, tab bar hidden, runner count', !(await tabbar(L)) && await L.$eval('.ready-gun',g=>g.getBoundingClientRect().height>window.innerHeight*0.5) && (await L.$eval('.ready-meta',x=>x.textContent)).includes('3 runners'));
await L.click('[data-ra=backsetup]'); await W();
ok('Back to setup', !!(await L.$('[data-rr]')) && await tabbar(L));
await L.click('#readyBtn'); await W(); await L.click('.ready-gun'); await W(600);
ok('Gun (one tap): live screen, tab bar hidden, Exit race view', (await race(L)).status==='running' && !(await tabbar(L)) && await vis(L,'#raceClose') && (await L.$eval('#raceClose',b=>b.textContent))==='Exit race view');
ok('Restart clock until the first tap', await vis(L,'#raceRestart'));
await L.click('#snackBtn'); await W();
ok('Undo gun goes back to the Ready screen', (await race(L)).status==='setup' && !!(await L.$('.ready-gun')));
await L.click('.ready-gun'); await W(600);
const e0=await L.evaluate(()=>MSApp.raceElapsed());
await L.click('#raceClose'); await W(400);
ok('Exit race view: back on Stopwatches, race still running, tab bar back', (await race(L)).status==='running' && await tabbar(L) && !(await L.$eval('#v-watches',v=>v.hidden)));
const c1=await L.$eval('#liveClock',x=>x.textContent); await W(1300); const c2=await L.$eval('#liveClock',x=>x.textContent);
ok('"Race running" bar with the name and a live clock', await vis(L,'#liveBar') && (await L.$eval('#liveName',x=>x.textContent)).length>0 && c1!==c2, c1+' → '+c2);
for(const t of ['workouts','team','results','watches']){ await tab(L,t);
  const covered=await L.evaluate(()=>{ window.scrollTo(0,document.body.scrollHeight); const bar=document.querySelector('#liveBar').getBoundingClientRect().top, v=document.querySelector('main section:not([hidden])'); const kids=[...v.querySelectorAll('button,input,.watch,.res-card,.wk,.ath')].filter(e=>e.offsetParent); const last=kids[kids.length-1]; return last?last.getBoundingClientRect().bottom>bar+1:false; });
  ok(`${t}: the bar shows and covers nothing (room at the bottom)`, await vis(L,'#liveBar') && !covered); }
await L.click('#liveBar'); await W(600);
ok('tap the bar: back to the live race, clock kept', !(await L.$eval('#v-race',v=>v.hidden)) && (await L.evaluate(()=>MSApp.raceElapsed()))>e0 && !(await vis(L,'#liveBar')));
const zid=await rid(L,'Zoe'); const zc=await L.$eval(`#raceGrid [data-rn="${zid}"]`,x=>{ const r=x.getBoundingClientRect(); return [r.left+20,r.top+20]; });
await L.touchscreen.tap(zc[0],zc[1]); await W(100); await W(500); await L.touchscreen.tap(zc[0],zc[1]); await W(200);
ok('taps work after returning', await L.evaluate(id=>MSApp.getRace().marks.some(m=>m.runnerId===id),zid));
ok('Restart clock gone after the first tap', !(await vis(L,'#raceRestart')));

console.log('3. item 3: faster editing');
await inject(L,[['Maya',0,370],['Maya',1,745],['Maya',2,1160],['Ava',0,380],['Ava',1,760],['Ava',2,1190],['Zoe',1,770]]); await W(300);
await L.evaluate(()=>window.scrollTo(0,400));
await openCell(L,'Maya',0); const y0=await L.evaluate(()=>scrollY); await L.click('#modal [data-ts=edit]'); await W(); await typeIn(L,'[data-tst]','6085');
await L.click('#modal [data-ts=nextrunner]'); await W();
ok('Save & next runner: saved, next runner’s sheet opens straight into editing', (await cellT(L,'Maya',0))===368.5 && !(await L.$eval('#modal .ts-edit',x=>x.hidden)) && (await L.$eval('#modal h2',h=>h.textContent)).startsWith('Ava'), await L.$eval('#modal h2',h=>h.textContent));
ok('…and keeps the Undo for that save', (await snackText(L)).includes('Saved Maya'));
await typeIn(L,'[data-tst]','6195'); await L.click('#modal [data-ts=nextcp]'); await W();
ok('Save & next checkpoint: Ava Mile 1 saved, Ava Mile 2 opens', (await cellT(L,'Ava',0))===379.5 && (await L.$eval('#modal h2',h=>h.textContent))==='Ava Chen at Mile 2');
await typeIn(L,'[data-tst]','6000');
ok('warning: Mile 2 at or before Mile 1 ("Save anyway")', (await L.$eval('#modal .ts-warns',x=>x.textContent)).includes('is at or before Mile 1') && (await L.$eval('#modal [data-ts=save]',b=>b.textContent))==='Save anyway');
await typeIn(L,'[data-tst]','12400');
ok('a sensible time clears the warning', await L.$eval('#modal .ts-warns',x=>x.hidden) && (await L.$eval('#modal [data-ts=save]',b=>b.textContent))==='Save');
await typeIn(L,'[data-tst]','6400');
ok('warning: implausible pace (Mile 2 split 0:20 → 0:20/mi)', (await L.$eval('#modal .ts-warns',x=>x.textContent)).includes('outside 4:00–15:00 per mile'));
await L.click('#modal [data-ts=save]'); await W();
await L.click('#modal summary'); await W();
ok('saved anyway: the history says so', (await L.$eval('#modal .ts-hist',x=>x.innerText)).includes('saved despite a warning'));
await L.click('#modal [data-x=done]'); await W(150);
ok('Done: back where you were (same scroll), the edited cell flashes', Math.abs((await L.evaluate(()=>scrollY))-y0)<5 && !!(await L.$('#raceRes .flash')) && await L.$eval('.race-res',d=>d.open));
// Edit times, upright: one checkpoint at a time
await L.evaluate(()=>{ const b=document.querySelector('#raceRes [data-ra=edittimes]'); b.scrollIntoView({block:'center'}); }); await L.click('#raceRes [data-ra=edittimes]'); await W();
ok('Edit times on an upright phone: checkpoint picker + one field per runner', (await L.$$('#modal [data-etcp]')).length===3 && (await L.$$('#modal .et-list [data-et]')).length===3);
ok('fields in runner order down the list (keyboard arrows go runner to runner)', (await L.$$eval('#modal .et-list .et-row span',xs=>xs.map(x=>x.textContent).join()))===(await L.$$eval('#modal .et-list [data-et]',xs=>xs.map(x=>x.getAttribute('aria-label').split(',')[0]).join())));
await L.click('#modal [data-etcp="2"]'); await W();
const maya=await rid(L,'Maya'), ava=await rid(L,'Ava'), zoe=await rid(L,'Zoe');
await typeIn(L,`#modal [data-et="${maya}|2"]`,'19100'); await typeIn(L,`#modal [data-et="${zoe}|2"]`,'19300');
ok('changed fields are highlighted, count on Save all', (await L.$$('#modal .et-in.changed')).length===2 && (await L.$eval('#modal [data-x=saveall]',b=>b.textContent))==='Save all (2)');
const zoe0=await cellT(L,'Zoe',0);
await L.click('#modal [data-etcp="0"]'); await W(); await typeIn(L,`#modal [data-et="${zoe}|0"]`,'6200');
await L.click('#modal [data-etcp="2"]'); await W();
ok('switching checkpoint keeps unsaved changes', (await L.$eval(`#modal [data-et="${maya}|2"]`,i=>i.value))==='19:10.0' && (await L.$eval('#modal [data-x=saveall]',b=>b.textContent))==='Save all (3)', (await L.$eval(`#modal [data-et="${maya}|2"]`,i=>i.value))+' | '+(await L.$eval('#modal [data-x=saveall]',b=>b.textContent)));
await L.setViewport({width:844,height:390,isMobile:true,hasTouch:true}); await W(500);
ok('turned sideways: the full grid, changes kept', (await L.$$('#modal .et-grid [data-et]')).length===9 && (await L.$$('#modal .et-in.changed')).length===3);
await L.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await W(500);
await L.click('#modal [data-x=saveall]'); await W(400);
ok('Save all: three times saved at once', (await cellT(L,'Maya',2))===1150 && (await cellT(L,'Zoe',2))===1170 && (await cellT(L,'Zoe',0))===380);
ok('…each an append-only version with the coach name', await L.evaluate(()=>{ const r=MSApp.getRace(); return r.marks.filter(m=>m.hist&&m.hist.length>=2&&m.hist[m.hist.length-1].dev).length>=2; }));
ok('…edited cells flash', (await L.$$('#raceRes .flash')).length>=3);
await L.click('#snackBtn'); await W(300);
ok('one Undo puts all three back (Zoe’s Mile 1 back to her tap)', (await cellT(L,'Maya',2))===1160 && (await cellT(L,'Zoe',2))===null && (await cellT(L,'Zoe',0))===zoe0, JSON.stringify([await cellT(L,'Maya',2),await cellT(L,'Zoe',2),await cellT(L,'Zoe',0),await snackText(L)]));
await L.click('#raceRes [data-ra=edittimes]'); await W(); await L.click('#modal [data-etcp="1"]'); await W();
await typeIn(L,`#modal [data-et="${maya}|1"]`,'5000'); await L.click('#modal [data-x=saveall]'); await W();
ok('Edit times warns before saving (Mile 2 before Mile 1), with Fix and Save anyway', (await L.$eval('#modal .et-warn',x=>!x.hidden&&x.innerText)).includes('is at or before Mile 1') && !!(await L.$('#modal [data-x=anyway]')));
await L.click('#modal [data-etfix]'); await W();
ok('Fix puts the cursor in that field', await L.evaluate(id=>document.activeElement&&document.activeElement.dataset.et===id+'|1',maya));
await typeIn(L,`#modal [data-et="${maya}|1"]`,'12300'); await L.click('#modal [data-x=saveall]'); await W(300);
ok('fixed and saved', (await cellT(L,'Maya',1))===750);
await L.close();

console.log('4. team: Team history keeps its place; Edit times syncs as one batch');
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const A=await phone('A'), B=await phone('B');
await tab(A,'team'); await A.click('#teamMore'); await W(); await A.click('#pasteAth'); await W(); await A.$eval('#pasteTxt',t=>t.value='Maya Lopez, V, Girls\nAva Chen, V, Girls'); await A.click('[data-x=yes]'); await W(300);
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(2500);
await tab(A,'watches'); await A.click('#newBtn'); await W(); await A.click('[data-new=race]'); await W(); if(await A.$('#coachName')){ await A.type('#coachName','Coach Ann'); await A.click('[data-x=yes]'); await W(); }
await A.$eval('[data-rname]',i=>{ i.value=''; }); await A.type('[data-rname]','Dual'); await A.click('[data-rg="0"]'); await W(); await A.click('#readyBtn'); await W(); await A.click('.ready-gun'); await W(800);
await inject(A,[['Maya',2,1150],['Ava',2,1180]]); await W(800);
await A.click('[data-ra=end]'); await W(); await A.click('#modal [data-x=save]'); await W(1500); if(await A.$('#modal .pr-offer')){ await A.click('#modal [data-x=no]'); await W(); }
await tab(B,'results');
ok('B: the race is in Team history', await waitFor(B,()=>[...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Dual')),null,15000));
await B.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Dual')); d.open=true; d.scrollIntoView({block:'start'}); }); await W();
await B.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Dual')); d.querySelector('[data-hedit]').click(); }); await W();
const bm=await B.evaluate(()=>MSApp.getRoster().find(a=>a.name.startsWith('Maya')).id), ba=await B.evaluate(()=>MSApp.getRoster().find(a=>a.name.startsWith('Ava')).id);
await typeIn(B,`#modal [data-et="${bm}|2"]`,'19050'); await typeIn(B,`#modal [data-et="${ba}|2"]`,'19400');
await B.click('#modal [data-x=saveall]'); await W(800);
ok('B: Team history race stays open after Save all (no collapse, no jump)', await B.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Dual')); return d&&d.open; }));
await tab(A,'results');
ok('A gets both corrections together', await waitFor(A,()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Dual')); if(!d) return false; d.open=true; return d.innerText.includes('19:05.0')&&d.innerText.includes('19:40.0'); },null,15000));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
