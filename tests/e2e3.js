const puppeteer=require('puppeteer-core'); const fs=require('fs');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||200)); const log=console.log; const errs=[];
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:200},arg); return true; }catch(e){ return false; } };
async function phone(tag){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); }catch(e){} });  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message)); await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); return p; }
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [s,v] of vals) await p.$eval(s,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); };
const A=await phone('A'), B=await phone('B');
// A: backup containing just "Old Kid" (local-only), then build team
await A.evaluate(()=>{ MSApp.getRoster().push({id:'oldkid',name:'Old Kid',group:''}); });
const backup=await A.evaluate(()=>JSON.stringify({app:'mustang-splits',version:'2.0.0',savedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(Object.assign({},JSON.parse(localStorage.getItem('mustang-splits:v1')||'{}'),{roster:MSApp.getRoster(),workouts:MSApp.getWorkouts(),watches:[],settings:{},v:1})))}));
fs.writeFileSync(process.argv[2]+'/teambackup.json',backup);
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','admin secret phrase 9']]); await waitFor(A,()=>document.querySelector('[data-x=mine]')); await A.click('[data-x=mine]'); await W(2000);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await waitFor(B,()=>document.querySelector('[data-x=mine]')); await B.click('[data-x=mine]'); await W(1500);
await B.click('.tab[data-tab=team]'); await B.click('#addAth'); await W(); await B.type('#athName','Bea Kent'); await B.click('[data-x=yes]'); await W(2500);
log('A has Bea:', await waitFor(A,()=>MSApp.getRoster().some(a=>a.name==='Bea K.')));
// A restores the old backup (no Bea) while joined
const fi=await A.$('#restoreFile'); await fi.uploadFile(process.argv[2]+'/teambackup.json'); await W(500);
log('restore confirm mentions team:', await A.$eval('#modal p',p=>p.textContent.includes('shared lists are not changed')));
await A.evaluate(()=>{ window.__before=1; }); await A.click('[data-x=yes]'); await W(3000); await A.waitForFunction(()=>window.MSApp);
log('merge prompt after restore:', await waitFor(A,()=>document.querySelector('[data-x=mine]')));
await A.click('[data-x=mine]'); await W(3000);
log('B still has Bea (team not overwritten):', await B.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Bea K.')), '| A has Bea back:', await A.evaluate(()=>MSApp.getRoster().some(a=>a.name==='Bea K.')));
// empty clear track: no history entry
await A.click('.tab[data-tab=watches]'); await W(); await A.click('#openSettings'); await W(); await A.click('#clearTrack'); await W(); if(await A.$('[data-x=yes]')) await A.click('[data-x=yes]'); await W(1500);
await B.click('.tab[data-tab=results]'); await W(1000);
log('no empty history entry:', await B.$$eval('#histList details, #practiceList details',d=>d.length)===0);
log('errors', errs); await b.close();
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
