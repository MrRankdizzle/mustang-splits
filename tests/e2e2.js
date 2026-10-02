const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||200)); const log=console.log; const errs=[];
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:200},arg); return true; }catch(e){ return false; } };
// (a) SDK blocked
{ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); }catch(e){} });  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); await p.setRequestInterception(true);
  p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue()); p.on('pageerror',e=>errs.push('a: '+e.message));
  await p.goto(URL); await p.waitForSelector('.watch'); await W(1500);
  await p.click('.watch [data-act=start]'); await W(300); await p.click('.watch [data-act=split]'); await W(300);
  log('(a) SDK blocked: stopwatch runs:', await p.$eval('.watch',c=>c.className), '| settings team text:', await (async()=>{ await p.click('#openSettings'); await W(); return p.$eval('#teamSec',x=>x.innerText.replace(/\n/g,' / ')); })());
  await p.click('[data-x=done]'); await W(); await p.click('.tab[data-tab=team]'); await W(); await p.click('#addAth'); await W(); await p.type('#athName','Maya Lopez'); await p.click('[data-x=yes]'); await W();
  log('(a) local-only keeps full name:', await p.evaluate(()=>MSApp.getRoster().map(a=>a.name).join()));
  await ctx.close(); }
// (b)+(c): A creates team, B joins
async function phone(tag){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); }catch(e){} });  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message)); await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); return p; }
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [s,v] of vals) await p.$eval(s,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); };
const A=await phone('A'), B=await phone('B');
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','admin secret phrase 9']]); await waitFor(A,()=>document.querySelector('[data-x=mine]')); await A.click('[data-x=mine]'); await W(2000);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await waitFor(B,()=>document.querySelector('[data-x=mine]')); await B.click('[data-x=team]'); await W(2500);
log('B took team only:', await B.evaluate(()=>MSApp.getWorkouts().map(w=>w.name).sort().join(' | ')));
// (c) A runs "800 @ 2:24", B edits that workout's name
const wid=await A.evaluate(()=>MSApp.getWorkouts().find(w=>w.name.startsWith('800')).id);
await A.evaluate(id=>{ const c=document.querySelector('.watch'); c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=plan]').click(); document.querySelector('[data-wk="'+id+'"]').click(); },wid); await W();
await A.click('.watch [data-act=start]'); await W(300);
await B.evaluate(id=>{ const w=MSApp.getWorkouts().find(x=>x.id===id); w.name='800 EDITED'; w.segments[0].value='2:10'; },wid);
await B.evaluate(()=>{ document.querySelector('.tab[data-tab=workouts]').click(); }); await B.evaluate(()=>{}); 
await B.evaluate(()=>{ const e=new Event('input'); }); // trigger save via a harmless edit path:
await B.evaluate(()=>{ localStorage; }); await B.click('.tab[data-tab=team]'); await B.click('#addAth'); await W(); await B.type('#athName','Trigger Save'); await B.click('[data-x=yes]'); await W(3000);
log('(c) A running plan unchanged:', await A.evaluate(id=>MSApp.getWorkouts().find(w=>w.id===id).name,wid), '| running:', await A.$eval('.watch',c=>c.className));
await A.evaluate(()=>{ const c=document.querySelector('.watch'); c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=stop]').click(); }); await W(); await A.evaluate(()=>{ const c=document.querySelector('.watch'); c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=reset]').click(); }); await W(); 
if(await A.$('[data-x=yes]')) { await A.click('[data-x=yes]'); await W(); }
// the skipped change lands on the next full sync (reload)
await A.reload(); await A.waitForFunction(()=>window.MSApp&&document.querySelector('.watch'));
log('(c) after run, edit applied:', await waitFor(A,id=>MSApp.getWorkouts().find(w=>w.id===id)?.name==='800 EDITED',wid,15000));
// (b) offline reopen: SW should serve app + SDK from cache
await A.reload(); await W(2000);
log('(b) SW controlling:', await A.evaluate(()=>!!navigator.serviceWorker.controller), '| SDK cached:', await A.evaluate(async()=>(await caches.keys()).join()));
await A.setOfflineMode(true); await A.reload(); await A.waitForFunction(()=>window.MSApp&&document.querySelector('.watch'),{timeout:15000});
await W(3000);
log('(b) offline reopen: sync loaded', await A.evaluate(()=>document.querySelector('#openSettings')&&true), '| roster', await A.evaluate(()=>MSApp.getRoster().length), '| status:', await (async()=>{ await A.click('#openSettings'); await W(); const t=await A.$eval('#teamSec',x=>x.innerText.replace(/\n/g,' / ')); await A.click('[data-x=done]'); return t; })());
await A.click('.watch [data-act=start]'); await W(300); log('(b) stopwatch starts offline:', await A.$eval('.watch',c=>c.className));
log('errors', errs); await b.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
