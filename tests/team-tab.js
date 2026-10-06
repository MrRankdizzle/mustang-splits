// Team tab (2.12): one line per runner (full name, grade, season average), tap to edit (name, Girls/Boys, Remove with
// Undo), collapsible Girls/Boys sections (remembered), search, the sort switch, no Group field; plus Clear track.
const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const p=await b.newPage(); await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
await p.evaluateOnNewDocument(()=>{ if(sessionStorage.getItem('s')) return; sessionStorage.setItem('s','1'); localStorage.clear(); localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); });
await p.goto('http://localhost:8765/'); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=team]')); const W=ms=>new Promise(r=>setTimeout(r,ms||200)); await W(500);
await p.click('.tab[data-tab=team]'); await p.click('#pasteAth'); await W();
await p.$eval('#pasteTxt',t=>t.value='Avery Lindqvist, Girls\nMaren Schoenfeld, Varsity, Girls\nRowan Haverkamp, Boys\nPat Doe'); await p.click('[data-x=yes]'); await W();
const rows=()=>p.$$eval('.team-sec .ath',x=>x.map(r=>({id:r.dataset.id,name:r.querySelector('.ath-nm').textContent,sec:r.closest('.team-sec').dataset.sec})));
let R=await rows();
ok('one line per runner, full names', R.length===4 && R.some(r=>r.name==='Maren Schoenfeld'), R.map(r=>r.name).join());
ok('no Group field anywhere on the tab', !(await p.$('#v-team [data-af=group]')) && !(await p.$('#v-team .team-gh')));
ok('"Name, Group, Girls" still pastes (the group is left out)', await p.evaluate(()=>MSApp.getRoster().find(a=>a.name==='Maren Schoenfeld').group===''&&MSApp.getRoster().find(a=>a.name==='Maren Schoenfeld').gender==='G'));
ok('rows have the name, grade and season average columns', await p.$$eval('.team-sec .ath .ath-row',x=>x.every(r=>r.querySelector('.ath-nm')&&r.querySelector('.ath-gr')&&r.querySelector('.ath-avg'))));
ok('a runner with no Girls/Boys keeps the one-tap Girls / Boys buttons', !!(await p.$('.team-sec[data-sec=""] [data-t=sec][data-g=B]')));
ok('rows are tall enough to tap (44 px)', await p.$$eval('.ath-row',x=>x.every(r=>r.getBoundingClientRect().height>=44)));
// search
await p.type('#teamSearch','row'); await W();
R=await rows(); ok('search finds "Rowan" only', R.length===1&&R[0].name==='Rowan Haverkamp', R.map(r=>r.name).join());
await p.$eval('#teamSearch',i=>{ i.value=''; i.dispatchEvent(new Event('input')); }); await W();
// collapse, remembered across a reload
await p.click('.team-sec[data-sec="G"] > summary h3'); await W();
ok('Girls section collapses', await p.$eval('.team-sec[data-sec="G"]',d=>!d.open));
await p.reload(); await p.waitForFunction(()=>window.MSApp); await W(400); await p.click('.tab[data-tab=team]'); await W();
ok('…and stays collapsed after a reload', await p.$eval('.team-sec[data-sec="G"]',d=>!d.open));
await p.click('.team-sec[data-sec="G"] > summary h3'); await W();
// sort switch
await p.click('#teamTools [data-rsort=name]'); await W();
ok('sort switch: Name', await p.$eval('#teamTools [data-rsort=name]',x=>x.getAttribute('aria-pressed')==='true'));
await p.click('#teamTools [data-rsort=avg]'); await W();
// tap a row: the runner sheet edits the name
const id=R.find(r=>r.name==='Rowan Haverkamp')||{}; const rid=(await rows()).find(r=>r.name==='Rowan Haverkamp').id;
await p.click(`.ath[data-id="${rid}"] .ath-row`); await W();
ok('tapping a row opens the runner sheet', !!(await p.$('#modal .res-sheet [data-af=name]')));
await p.$eval('#modal [data-af=name]',i=>{ i.value='Rowan Haverkamp-Jones'; i.dispatchEvent(new Event('input')); i.dispatchEvent(new Event('change')); });
await p.click('#modal [data-x=done]'); await W();
ok('the new name is saved and shown', await p.evaluate(id=>MSApp.getRoster().find(a=>a.id===id).name==='Rowan Haverkamp-Jones',rid) && (await rows()).some(r=>r.name==='Rowan Haverkamp-Jones'));
// remove with Undo
await p.click(`.ath[data-id="${rid}"] .ath-row`); await W(); await p.click('#modal [data-x=remove]'); await W();
ok('Remove runner: gone, with an Undo bar', !(await p.evaluate(id=>MSApp.getRoster().some(a=>a.id===id),rid)) && await p.evaluate(()=>!!document.querySelector('.snack:not([hidden]) button,#snack:not([hidden]) button')));
await p.evaluate(()=>{ const b=document.querySelector('.snack:not([hidden]) button,#snack:not([hidden]) button'); if(b) b.click(); }); await W(400);
ok('…and Undo brings the runner back', await p.evaluate(id=>MSApp.getRoster().some(a=>a.id===id),rid));
// Clear track (kept from the 2.3 test)
await p.click('.tab[data-tab=watches]'); await W();
const n0=await p.$$eval('.watch',w=>w.length);
if(n0){ await p.click('.watch [data-act=start]').catch(()=>{}); await W(); }
await p.click('#openSettings'); await W(); await p.click('#clearTrack').catch(()=>{}); await W(); const y=await p.$('[data-x=yes]'); if(y){ await y.click(); await W(); }
ok('Clear track keeps the running stopwatch', (await p.$$eval('.watch',w=>w.filter(x=>x.className.includes('st-running')).length))===(n0?1:0));
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
