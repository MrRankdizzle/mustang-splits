// 2.9.0 auto-update: a newer version installs by itself only when nothing is timing (no running stopwatch, no live
// race), never reloads during timing, never loops, says "Updated to x.y.z", waits while a sheet is open, and the
// team's minimum app version (admin) shows the full-screen "Updating…" (a banner instead while a clock runs).
// version.json is faked per phone with request interception; phone B also gets an older APP_VERSION baked in.
const puppeteer=require('puppeteer-core');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:150},arg); return true; }catch(e){ return false; } };
async function phone(tag,{serverVer,appVer}={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage();
  await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }catch(e){} });
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  p.state={serverVer:serverVer||null,appVer:appVer||null,loads:0};
  if(appVer){ await p.setBypassServiceWorker(true); } // so the older app.js below is what this phone runs
  await p.setRequestInterception(true);
  p.on('request',async r=>{ const u=r.url();
    if(u.endsWith('/version.json')&&p.state.serverVer) return r.respond({status:200,contentType:'application/json',body:JSON.stringify({version:p.state.serverVer})});
    if(/\/app\.js(\?|$)/.test(u)&&p.state.appVer){ const res=await fetch(u.replace(/\?.*$/,'')); const t=(await res.text()).replace(/const APP_VERSION='[^']+'/,`const APP_VERSION='${p.state.appVer}'`); return r.respond({status:200,contentType:'application/javascript',body:t}); }
    r.continue(); });
  p.on('load',()=>{ p.state.loads++; });
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); require('./lib.js').patchClick(p); p.tag=tag; await W(2500); return p; }
const ver=await (await fetch('http://localhost:8765/version.json')).json(), CUR=ver.version;
const bump=v=>{ const x=v.split('.').map(Number); x[2]++; return x.join('.'); }, NEXT=bump(CUR);
const startQuick=async p=>{ await p.click('#newBtn'); await W(); await p.click('#modal [data-new=quick]'); await W(400); };
const stopFirst=async p=>{ await p.evaluate(()=>document.querySelector('.watch.st-running [data-act=menu]').click()); await W(); await p.click('#modal [data-m=stop]'); await W(); };

console.log('A: same version on the server: nothing happens');
const A=await phone('A');
let L0=A.state.loads; await A.evaluate(()=>MSApp.checkUpdate('open')); await W(1500);
ok('no reload, no banner when up to date', A.state.loads===L0 && await A.$eval('#updateBanner',x=>x.hidden));

console.log('A: newer version while a stopwatch runs');
await startQuick(A);
ok('a stopwatch is running', await A.evaluate(()=>MSApp.updState().timing));
A.state.serverVer=NEXT; L0=A.state.loads;
await A.evaluate(()=>MSApp.checkUpdate('open')); await W(7000);
ok('never reloads while a clock runs (7 s, open + idle checks)', A.state.loads===L0);
ok('banner says it installs when the clocks stop, no Update button', await A.$eval('#updText',x=>x.textContent.includes('when the clocks stop')) && await A.$eval('#doUpdate',x=>x.hidden));
await A.evaluate(()=>MSApp.checkUpdate('return')); await W(1500);
ok('returning to the app still never reloads during timing', A.state.loads===L0);
await stopFirst(A);
ok('clocks stopped: no reload while the coach is still tapping (30 s quiet first)', await (async()=>{ await W(12000); return A.state.loads===L0; })());
ok('then the update installs by itself (files downloaded, then one reload)', await (async()=>{ for(let i=0;i<160&&A.state.loads===L0;i++) await W(250); return A.state.loads===L0+1; })());
await A.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(3000);
ok('stopped stopwatch kept its time through the update', await A.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('mustang-splits:v1')); return s.watches.some(w=>w.status==='paused'&&w.pausedT>0); }));
// The fake server version never arrives (same files), so this is also the "no loop" case.
await W(9000);
const rec=await A.evaluate(()=>MSApp.updState().rec);
ok('never a reload loop: at most 2 tries for one version', A.state.loads<=L0+2 && rec.n<=2, `loads +${A.state.loads-L0}, tries ${rec.n}`);

console.log('A: "Updated to x.y.z" after a real update');
A.state.serverVer=null;
await A.evaluate(v=>{ sessionStorage.setItem('mustang-splits:updated',JSON.stringify({from:'2.8.1',to:v})); },CUR);
await A.reload(); await A.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn'));
ok('shows "Updated to '+CUR+'"', await waitFor(A,v=>document.querySelector('#toast').textContent===`Updated to ${v}`,CUR,5000));

console.log('A: a live race blocks the update; a sheet open delays a timer check');
await A.evaluate(()=>{ localStorage.removeItem('mustang-splits:autoupd'); MSApp.setRace({id:'rx',name:'Dual',status:'running',createdAt:Date.now(),gun:{local:Date.now()-60000,off:0,by:'x'},checkpoints:[{id:'c1',name:'Finish',dist:5000,unit:'m'}],runners:[],marks:[],goalSrc:'none',courseId:null,meetId:null,division:''}); });
A.state.serverVer=NEXT; L0=A.state.loads;
await A.evaluate(()=>MSApp.checkUpdate('open')); await W(7000);
ok('never reloads while a race is live on this phone', A.state.loads===L0 && await A.evaluate(()=>MSApp.updState().timing));
await A.evaluate(()=>MSApp.setRace(null)); await W(300);
await A.click('#openSettings'); await W();
L0=A.state.loads; await A.evaluate(()=>MSApp.checkUpdate('timer')); await W(6500);
ok('while a sheet is open, the 10-minute check waits', A.state.loads===L0);

console.log('Minimum app version (team, admin)');
const B=await phone('B',{appVer:'2.8.9',serverVer:'2.8.9'}); // the server has nothing newer yet
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const C=await phone('C'); // the admin (current version)
await form(C,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(C); await W(1500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await W(2000);
await startQuick(B);
await C.click('#openSettings'); await W(1500);
ok('admin sees "Minimum app version: Off" and Require '+CUR, (await C.$eval('#minVerVal',x=>x.textContent))==='Off' && !!(await C.$('#tmMinSet')));
ok('coach phones list with versions and last seen', await waitFor(C,()=>/2\.8\.9 · (just now|\d+ min ago)/.test(document.querySelector('#phones').innerText),null,10000), await C.$eval('#phones',x=>x.innerText.replace(/\n/g,' | ')));
ok('"1 phone needs to update" while B is old', (await C.$eval('#phones .phones-sum',x=>x.textContent)).includes('1 phone needs to update'));
L0=B.state.loads;
await C.click('#tmMinSet'); await W(2500);
ok('B learns the minimum version', await waitFor(B,v=>MSApp.updState().minVersion===v,CUR,15000));
await W(3000);
ok('B with a running clock: no full screen, no reload, a banner instead', B.state.loads===L0 && await B.$eval('#forceUpd',x=>x.hidden) && (await B.$eval('#updText',x=>x.textContent)).includes('needs version'));
B.state.appVer=CUR; B.state.serverVer=CUR; // the new version is on the "server" now
await stopFirst(B);
ok('clock stopped: B shows Updating… and reloads into '+CUR, await (async()=>{ for(let i=0;i<60&&B.state.loads===L0;i++) await W(250); return B.state.loads===L0+1; })());
await B.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn')); await W(1500);
ok('B is on '+CUR+', no full screen, "Updated to"', await B.evaluate(v=>MSApp.version()===v,CUR) && await B.$eval('#forceUpd',x=>x.hidden) && await waitFor(B,v=>document.querySelector('#toast').textContent===`Updated to ${v}`,CUR,4000));
await C.evaluate(()=>{ document.querySelector('#overlay').hidden=true; }); await C.click('#openSettings'); await W(2500);
ok('admin: "All phones current — safe to publish rules"', await waitFor(C,()=>document.querySelector('#phones .phones-sum')&&document.querySelector('#phones .phones-sum').textContent.includes('All phones current — safe to publish rules'),null,10000));
// A phone stuck below the minimum without the new version reachable: full screen with a way out.
const D=await phone('D',{appVer:'2.8.9',serverVer:'2.8.9'}); await form(D,'#tmJoin',[['#tmPw1',PW]]); await merge(D); // the new version isn't reachable from this phone
ok('below the minimum, nothing timing: full-screen Updating…', await waitFor(D,()=>!document.querySelector('#forceUpd').hidden||MSApp.updState().rec.n>=1,null,20000));
ok('if the update can\'t arrive, it says so and offers "Use this version for now" (no reload loop)', await waitFor(D,()=>!document.querySelector('#forceUpd').hidden&&!document.querySelector('#fuSkip').hidden,null,40000) && D.state.loads===1 && (await D.$eval('#fuText',x=>x.textContent)).includes('couldn’t find'), `loads ${D.state.loads}`);
await D.click('#fuSkip'); await W();
ok('"Use this version for now" lets the coach in', await D.$eval('#forceUpd',x=>x.hidden));
await C.evaluate(()=>{ document.querySelector('#overlay').hidden=true; }); await C.click('#openSettings'); await W(1500); await C.click('#tmMinOff'); await W(2000);
ok('admin turns it off', await waitFor(D,()=>MSApp.updState().minVersion==='',null,15000));
const real=errs.filter(e=>!/Failed to fetch|NetworkError|net::|offline/i.test(e));
ok('no page errors', !real.length, real.join(' | '));
console.log(bad?`\n${bad} FAILED`:'\nall passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
