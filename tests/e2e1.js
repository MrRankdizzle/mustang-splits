const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu';
const PW='gravel otter lantern 44', PW2='copper heron meadow 71';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const errs=[];
async function phone(tag){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); }catch(e){} }); 
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('console',m=>{ if(m.text().startsWith('DBG')) console.log(tag,m.text()); }); p.on('pageerror',e=>errs.push(tag+': '+e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/PERMISSION_DENIED|permission|Missing or insufficient|WebChannel|400|net::ERR/.test(m.text())) errs.push(tag+' console: '+m.text().slice(0,200)); });
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp && document.querySelector('.watch'));
  require('./lib.js').patchClick(p); p.tag=tag; return p;
}
const W=ms=>new Promise(r=>setTimeout(r,ms||200));
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:200},arg); return true; }catch(e){ return false; } };
const state=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')||'null'));
const roster=p=>p.evaluate(()=>MSApp.getRoster().map(a=>a.name+'/'+a.group).sort().join(', '));
const wks=p=>p.evaluate(()=>MSApp.getWorkouts().map(w=>w.name).sort().join(' | '));
const status=p=>p.evaluate(()=>document.querySelector('#openSettings').dataset.sync+'');
const syncText=async p=>{ await p.click('#openSettings'); await W(); const t=await p.$eval('#teamSec',x=>x.innerText.replace(/\n+/g,' / ')); await p.click('[data-x=done]'); await W(); return t; };
const paste=async(p,txt)=>{ await p.click('.tab[data-tab=team]'); await W(); await p.click('#teamMore'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(300); };
const teamForm=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [sel,v] of vals){ await p.$eval(sel,(i,v)=>i.value=v,v); } await p.click('[data-x=yes]'); };
const log=(...a)=>console.log(...a);

const A=await phone('A'); let B=await phone('B');
log('A sync loaded:', await waitFor(A,()=>document.querySelector('#openSettings')&&window.MSApp&&true));
await paste(A,'Maya Lopez, Varsity\nJonah Kim, Varsity');
log('A local roster:', await roster(A));
// short password
await teamForm(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1','short pw'],['#tmAd1','admin secret phrase 9']]); await W(400);
log('short pw error:', await A.$eval('#tmErr',e=>e.hidden?'(none)':e.textContent)); await A.click('[data-x=no]'); await W();
await teamForm(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','admin secret phrase 9']]);
log('A merge prompt:', await waitFor(A,()=>document.querySelector('[data-x=mine]')), await A.$eval('#modal',m=>m.querySelector('p').textContent));
await A.click('[data-x=mine]');
log('A synced:', await waitFor(A,()=>{ const s=document.querySelector('#openSettings').dataset.sync; return !document.querySelector('[data-x=mine]') && s===''; }));
await W(1500);
log('A roster (shortened):', await roster(A)); log('A status:', await syncText(A));
// same-password team creation blocked
await paste(B,'Maya Lopez, Varsity\nSam Ortiz, JV');
await teamForm(B,'#tmCreate',[['#tmName','Copycats'],['#tmPw1',PW],['#tmAd1','other admin phrase 7']]); await W(3000);
log('B create with taken pw:', await B.$eval('#tmErr',e=>e.textContent)); await B.click('[data-x=no]'); await W();
await teamForm(B,'#tmJoin',[['#tmPw1','wrong password here']]); await W(3000);
log('B wrong pw:', await B.$eval('#tmErr',e=>e.textContent)); await B.click('[data-x=no]'); await W();
await teamForm(B,'#tmJoin',[['#tmPw1','  Gravel Otter   LANTERN 44 ']]);
log('B merge prompt:', await waitFor(B,()=>document.querySelector('[data-x=mine]')));
await B.click('[data-x=mine]'); await waitFor(B,()=>!document.querySelector('[data-x=mine]'));
await W(2500);
log('B roster:', await roster(B)); log('B workouts:', await wks(B));
log('A gets Sam live:', await waitFor(A,()=>MSApp.getRoster().some(a=>a.name.startsWith('Sam'))), await roster(A));
log('A workouts:', await wks(A));
// live edit A -> B
await A.click('.tab[data-tab=team]'); await W();
// full names since 2.11.1; 2.12: tap the row, edit the name in the runner sheet
const jid=await A.evaluate(()=>MSApp.getRoster().find(a=>a.name.startsWith('Jonah')).id); await A.evaluate(id=>document.querySelector(`.ath[data-id="${id}"] .ath-row`).click(),jid); await W(400);
const ji=await A.$('#modal [data-af=name]'); await ji.click({clickCount:3}); await ji.type('Jonah Kx'); await A.click('#modal [data-x=done]'); await W();
log('B sees rename:', await waitFor(B,()=>MSApp.getRoster().some(a=>a.name==='Jonah Kx')));
// delete workout on B -> A
await B.click('.tab[data-tab=workouts]'); await W();
const wname='CV 5 × 1000m, 90s rest';
for(const card of await B.$$('.wk')){ if(await card.$eval('.wk-name',x=>x.textContent)===wname){ await card.$eval('[data-w=del]',b=>b.click()); break; } } await W(); // 2.6: no confirm, Undo toast
log('A sees workout deletion ('+wname+'):', await waitFor(A,n=>!MSApp.getWorkouts().some(w=>w.name===n),wname));
// history: A laps then clear track
await A.click('.tab[data-tab=watches]'); await W();
const wid8=await A.evaluate(()=>MSApp.getWorkouts().find(w=>w.name.startsWith('800 @')).id);
await A.evaluate(id=>{ const c=document.querySelector('.watch'); c.querySelector('[data-act=menu]').click(); document.querySelector('[data-m=plan]').click(); document.querySelector('[data-wk="'+id+'"]').click(); },wid8); await W();
await A.click('.watch [data-act=start]'); await W(300); await A.click('.watch [data-act=split]'); await W(300); await A.click('.watch [data-act=split]'); await W(300);
log('A first card finished:', await A.$eval('.watch',c=>c.className));
await A.click('#openSettings'); await W(); await A.click('#clearTrack'); await W();
log('clear confirm:', await A.$eval('#modal p',p=>p.textContent)); await A.click('[data-x=yes]'); await W(500);
log('A toast:', await A.$eval('#toast',t=>t.textContent));
await B.click('.tab[data-tab=results]'); 
log('B history entry:', await waitFor(B,()=>document.querySelectorAll('#practiceList details').length===1), await B.$eval('#practiceList',x=>x.innerText.split('\n')[0])); // 2.8.1: practices after Races on this phone
await B.click('#practiceList summary'); await W(); await B.click('[data-hdel]'); await W(); // 2.6: soft delete with Undo
await A.click('.tab[data-tab=results]');
log('A sees history deleted:', await waitFor(A,()=>!document.querySelector('#practiceList details')));
// offline edit on A
await A.setOfflineMode(true); await W(500);
await paste(A,'Offline Kid, JV');
log('A offline status dot:', await waitFor(A,()=>document.querySelector('#openSettings').dataset.sync==='waiting',null,8000), await syncText(A));
await A.setOfflineMode(false);
log('B gets offline edit after reconnect:', await waitFor(B,()=>MSApp.getRoster().some(a=>a.name==='Offline K.'),null,30000));
log('A back to synced:', await waitFor(A,()=>document.querySelector('#openSettings').dataset.sync==='',null,20000));
// change password on A -> B signed out
await teamForm(A,'#tmPw',[['#tmPw0',PW],['#tmPw1',PW2]]); await W(3000);
log('A after change:', await A.$eval('#toast',t=>t.textContent));
log('B signed out:', await waitFor(B,()=>document.querySelector('#openSettings').dataset.sync==='error',null,20000), await syncText(B));
await paste(B,'Local While Out');  // edit while out
await teamForm(B,'#tmJoin',[['#tmPw1',PW]]); await W(3000);
log('B old pw rejected:', await B.$eval('#tmErr',e=>e.textContent)); await B.click('[data-x=no]'); await W();
await teamForm(B,'#tmJoin',[['#tmPw1',PW2]]); await W(3000);
log('B rejoined, no merge prompt:', !(await B.$('[data-x=mine]')), await B.$eval('#toast',t=>t.textContent));
log('A gets B edit made while out:', await waitFor(A,()=>MSApp.getRoster().some(a=>a.name==='Local O.'),null,20000));
// silent rejoin: wipe B's auth (new anonymous account)
const ctxB=B.browserContext(); const uidBefore=await B.evaluate(()=>new Promise(r=>{ const q=indexedDB.open('firebaseLocalStorageDb'); q.onsuccess=()=>{ const db=q.result; const tx=db.transaction(db.objectStoreNames[0]); const g=tx.objectStore(db.objectStoreNames[0]).getAll(); g.onsuccess=()=>{ r((g.result[0]||{}).value?.uid); db.close(); }; }; }));
await B.close();
const wipe=await ctxB.newPage(); await wipe.goto('http://localhost:8765/version.json');
log('dbg wiped auth db:', await wipe.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('firebaseLocalStorageDb'); q.onsuccess=()=>r('ok'); q.onerror=()=>r('error'); q.onblocked=()=>r('blocked'); })));
await wipe.close();
const B2=await ctxB.newPage(); await B2.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); B2.on('console',m=>{ if(m.text().startsWith('DBG')) console.log('B2',m.text()); }); B2.on('pageerror',e=>errs.push('B2: '+e.message));
await B2.goto(URL); await B2.waitForFunction(()=>window.MSApp&&document.querySelector('.watch'));
B=B2;
await paste(A,'After Reset, JV');
log('B quietly rejoined with new account:', await waitFor(B,()=>MSApp.getRoster().some(a=>a.name==='After R.'),null,25000));
// leave on B
await B.click('#openSettings'); await W(); await B.click('#tmLeave'); await W(); await B.click('[data-x=yes]'); await W(500);
log('B after leave: roster kept', (await roster(B)).split(', ').length, 'status', await syncText(B));
await paste(A,'Not For B');
await W(3000); log('B no longer receives:', !(await B.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Not F.'))));
log('A stopwatch timing untouched (no network dependency) - storage key still:', !!(await state(A)));
log('\nerrors:', errs);
await b.close();
})().catch(e=>{ console.error('TEST CRASH',e); process.exit(1); });
