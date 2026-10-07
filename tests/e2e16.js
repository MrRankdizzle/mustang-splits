// 2.9.0 mixed versions and offline: a phone running the real 2.8.1 code (served from git, commit OLD below) and a
// 2.9.0 phone in one team, under the repo's current firestore.rules. Roster edits both ways, a two-coach race (taps
// from both phones), saving to Team history, a correction, an official-results import the old phone ignores, the
// minimum version (the old phone can't see it and keeps working), and offline: the 2.9.0 phone keeps timing and
// recording without signal, never tries to update offline, and syncs when back.
const puppeteer=require('puppeteer-core'), {execSync,spawn}=require('child_process'), path=require('path'), fs=require('fs');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12', OLD='72a8d61'; // Mustang Splits 2.8.1
// The old version is served from its own folder on :8766 (git archive of OLD), a separate origin like another phone.
const REPO=path.join(__dirname,'..'), OUTD=process.argv[2]||path.join(__dirname,'out'), OLDDIR=path.join(OUTD,'old-'+OLD);
fs.rmSync(OLDDIR,{recursive:true,force:true}); fs.mkdirSync(OLDDIR,{recursive:true});
execSync(`git -C "${REPO}" archive ${OLD} | tar -x -C "${OLDDIR}"`);
const SRV=spawn('python3',['-m','http.server','8766'],{cwd:OLDDIR,stdio:'ignore'}); process.on('exit',()=>{ try{ SRV.kill(); }catch(e){} });
(async()=>{
await new Promise(r=>setTimeout(r,800)); // the old server starts
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,old){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){} });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.goto(old?URL.replace('8765','8766'):URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); await W(800); return p; }
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const paste=async(p,txt)=>{ await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=team]').click(); }); await W(); await p.evaluate(()=>(document.querySelector('#teamMore')&&document.querySelector('#teamMore').click(),document.querySelector('#pasteAth').click())); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,txt); await p.click('[data-x=yes]'); await W(400); };
const tapRunner=async(p,id)=>{ await W(900); await p.evaluate(id=>document.querySelector(`#raceGrid [data-rn="${id}"]`).click(),id); };
const names=p=>p.evaluate(()=>MSApp.getRoster().map(a=>a.name).sort().join(','));

const N=await phone('N'), O=await phone('O',true);
const CUR=JSON.parse(fs.readFileSync(path.join(REPO,'version.json'),'utf8')).version;
ok('the old phone really runs 2.8.1, the new one '+CUR, (await O.evaluate(()=>MSApp.version()))==='2.8.1' && (await N.evaluate(()=>MSApp.version()))===CUR);
await form(N,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(N); await W(1000);
await form(O,'#tmJoin',[['#tmPw1',PW]]); await merge(O); await W(1500);
await paste(N,'Maya Lopez, V, Girls\nAva Smith, V, Girls'); await paste(O,'Owen Diaz, V, Boys');
ok('roster edits sync both ways (2.9.0 ⇄ 2.8.1)', await waitFor(N,()=>MSApp.getRoster().length===3,null,15000) && await waitFor(O,()=>MSApp.getRoster().length===3,null,15000), await names(O));
await W(1200);
// a race set up and started on the new phone; the old phone opens it and both tap
await N.evaluate(()=>{ const R=MSApp.getRoster(); MSApp.setRace({id:'mixed1',name:'Mixed Dual',status:'running',createdAt:Date.now(),gun:{local:Date.now()-600000,off:0,by:'n'},courseId:null,goalSrc:'none',meetId:null,division:'',
  checkpoints:[{id:'f',name:'Finish',dist:5000,unit:'m'}],runners:R.map(a=>({id:a.id,name:a.name,group:'V',goal:null})),marks:[]}); });
await N.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); }); await W(); await N.click('#liveBar'); await W(700);
const ids=await N.evaluate(()=>MSApp.getRoster().map(a=>a.id));
await W(600); await tapRunner(N,ids[0]); await W(450); // the first tap saves, which shares the race
ok('the old phone sees the race', await waitFor(O,()=>!document.querySelector('#raceBanner').hidden,null,15000));
await O.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#raceBannerOpen').click(); }); await W(); await O.click('#modal [data-x=open]'); await W(1500);
ok('the old phone opens it', await waitFor(O,()=>!!document.querySelector('#raceGrid [data-rn]'),null,15000));
await tapRunner(O,ids[1]); await W(450);
await W(1500);
ok('taps from both phones land on both (2.9.0 and 2.8.1)', await waitFor(N,i=>document.querySelectorAll('#raceGrid [data-rn].rec').length===2,null,15000) && await waitFor(O,()=>document.querySelectorAll('#raceGrid [data-rn].rec').length===2,null,15000));
// 2.9.0: a live tag on the new phone, then End race there
await N.evaluate(()=>{ const d=document.querySelector('#raceRes details'); if(d) d.open=true; }); await W();
await N.evaluate(()=>[...document.querySelectorAll('#raceRes [data-rtag]')].find(b=>b.dataset.rtag==='').click()); await W();
await N.evaluate(()=>[...document.querySelectorAll('#modal [data-tg]')].find(b=>b.dataset.tg==='Mud').click()); await N.click('#modal [data-x=yes]'); await W();
await N.click('[data-ra=end]'); await W(); await N.click('#modal [data-x=save]'); await W(2000);
ok('the saved race reaches the old phone’s Team history', await waitFor(O,()=>{ document.querySelector('.tab[data-tab=results]').click(); return [...document.querySelectorAll('#histList summary')].some(s=>s.textContent.includes('Mixed Dual')); },null,20000));
ok('the race tag added while live was saved with it (old phone sees ⚑)', await waitFor(O,()=>[...document.querySelectorAll('#histList details')].some(d=>d.textContent.includes('Mixed Dual')&&d.textContent.includes('Race: Mud')),null,15000));
// the old phone corrects a time (append-only edit); the new phone gets it
await O.evaluate(()=>{ const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Mixed Dual')); d.open=true; d.querySelector('.race-cards [data-rc]').click(); }); await W(500);
await O.click('#modal [data-ts=edit]'); await W(); await O.$eval('#modal [data-tst]',i=>{ i.value='18:00.0'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await O.click('#modal [data-ts=save]'); await W(800);
const sv=await O.$('#modal [data-ts=saveanyway]'); if(sv){ await sv.click(); await W(500); }
ok('a correction from the old phone reaches the new phone', await waitFor(N,()=>{ document.querySelector('.tab[data-tab=results]').click(); const d=[...document.querySelectorAll('#histList details')].find(x=>x.textContent.includes('Mixed Dual')); if(!d) return false; d.open=true; return d.innerText.includes('18:00.0'); },null,20000));
// 2.9.0 only: official results and the minimum version; the old phone ignores both and keeps working
await N.evaluate(()=>document.querySelector('#overlay').hidden=true);
await N.evaluate(()=>(document.querySelector('#openSettings').click(),document.querySelector('#openImport').click())); await W(); await (await N.$('#histFile')).uploadFile(path.join(__dirname,'fixtures','fake-history-fixture.json'));
await waitFor(N,()=>!!document.querySelector('#modal .imp-prev'),null,15000); await N.click('#modal [data-x=yes]'); await W(2000);
ok('admin import (2.9.0) is accepted by the rules', await waitFor(N,()=>MSApp.syncStats&&!document.querySelector('#modal .imp-prev'),null,5000) && (await N.evaluate(()=>MSApp.officialStats().live))===29);
await N.click('#openSettings'); await W(1500); await N.click('#tmMinSet'); await W(1500); await N.evaluate(()=>document.querySelector('#overlay').hidden=true);
await paste(O,'Late Add, JV, Boys');
ok('the old phone still syncs normally after the import and the minimum version', await waitFor(N,()=>MSApp.getRoster().some(a=>a.name==='Late A.'),null,15000), await names(N));
ok('the old phone shows no sync error', await O.evaluate(()=>{ document.querySelector('#openSettings').click(); const t=document.querySelector('#teamStatus'); return t&&!/error|refused/i.test(t.textContent); }), await O.$eval('#teamStatus',x=>x.textContent).catch(()=>''));
await O.evaluate(()=>document.querySelector('#overlay').hidden=true);

console.log('Offline (2.9.0)');
let loads=0; N.on('load',()=>loads++);
await N.setOfflineMode(true); await W(500);
await N.evaluate(()=>MSApp.checkUpdate('open')); await W(2500);
ok('offline: an update check does nothing (no reload, no error)', loads===0);
await N.click('.tab[data-tab=watches]'); await W(); await N.click('#newBtn'); await W(); await N.click('#modal [data-new=quick]'); await W(1500);
ok('offline: a quick stopwatch runs', await N.evaluate(()=>MSApp.updState().timing));
await paste(N,'Offline Kid, JV, Girls');
await N.setOfflineMode(false); await W(500);
ok('back online: the offline change reaches the old phone', await waitFor(O,()=>MSApp.getRoster().some(a=>a.name==='Offline Kid'),null,25000), await names(O));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline|Could not reach|unavailable/i.test(e));
ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
