const puppeteer=require('puppeteer-core'); const crypto=require('crypto');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', PW2='copper heron meadow 71', AD='quiet falcon harbor 12', AD2='amber willow canyon 88';
const REST='http://127.0.0.1:8181/v1/projects/mustang-splits/databases/(default)/documents';
const owner=(path,fields,mask)=>fetch(REST+'/'+path+(mask?'?'+mask.map(m=>'updateMask.fieldPaths='+m).join('&'):''),{method:'PATCH',headers:{'Authorization':'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields})}).then(r=>r.json());
const teamHash=pw=>crypto.pbkdf2Sync(pw.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase(),'mustang-splits/team-password/v1',210000,32,'sha256').toString('hex');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:200},arg); return true; }catch(e){ return false; } };
async function phone(tag){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ try{ localStorage.setItem('mustang-splits:tour','1'); }catch(e){} });  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message)); await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); require('./lib.js').patchClick(p); p.tag=tag; return p; }
const openSet=async p=>{ if(!(await p.$eval('#overlay',o=>o.hidden))){ const d=await p.$('[data-x=done],[data-x=no]'); if(d) await d.click(); await W(); } await p.click('#openSettings'); await W(); };
const teamText=async p=>{ await openSet(p); const t=await p.$eval('#teamSec',x=>x.innerText.replace(/\n+/g,' / ')); await p.click('[data-x=done]'); await W(); return t; };
const has=async(p,sel)=>{ await openSet(p); const r=!!(await p.$('#teamSec '+sel)); await p.click('[data-x=done]'); await W(); return r; };
async function form(p,btn,vals,{keepOpen}={}){ await openSet(p); await p.click(btn); await W(); for(const [s,v] of vals) await p.$eval(s,(i,v)=>i.value=v,v); await p.click('[data-x=yes]');
  await waitFor(p,()=>{ const m=document.querySelector('#modal'); const e=document.querySelector('#tmErr'); return document.querySelector('#overlay').hidden || (e && !e.hidden) || document.querySelector('[data-x=mine]'); },null,20000);
  const err=await p.$eval('#modal',m=>{ const e=m.querySelector('#tmErr'); return e&&!e.hidden?e.textContent:''; }).catch(()=>''); if(err && !keepOpen){ await p.click('[data-x=no]'); await W(); } return err; }
const merge=async(p,how='mine')=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click(`[data-x=${how}]`); await W(1500); } };
const settle=ms=>W(ms||1500);

console.log('create with admin');
const A=await phone('A');
ok('create needs a different admin passphrase', (await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','Gravel Otter Lantern 44']])).includes('different'));
ok('create needs 12+ chars admin passphrase', (await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1','short one']])).includes('12'));
ok('create team', (await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]))===''); await merge(A); await settle();
let tt=await teamText(A); ok('A shows Admin and admin buttons', tt.includes('Admin') && tt.includes('Change team password') && tt.includes('Change admin passphrase') && tt.includes('Rename team') && tt.includes('Stop being admin'), tt);

console.log('members');
const B=await phone('B'), C=await phone('C'); // C plays the coach's Mac
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await form(C,'#tmJoin',[['#tmPw1',PW]]); await merge(C); await settle(2500);
tt=await teamText(B); ok('B (member) sees the ask-admin line, no password options', tt.includes('Ask your team admin to change the password') && !tt.includes('Change team password') && !tt.includes('Rename') && !tt.includes('Set admin passphrase'), tt);
ok('B wrong admin passphrase rejected', (await form(B,'#tmBeAdmin',[['#tmAd1','not the right phrase']])).includes('isn’t the admin passphrase'));
ok('C enters admin passphrase', (await form(C,'#tmBeAdmin',[['#tmAd1',AD.toUpperCase()]]))===''); await settle();
tt=await teamText(C); ok('C shows Admin', tt.includes('Admin') && tt.includes('Change team password'), tt);

console.log('rename (admin) reaches everyone');
ok('A renames', (await form(A,'#tmRename',[['#tmName','Little Chute XC']]))==='');
ok('B sees the new name', await waitFor(B,()=>true) && (await (async()=>{ await settle(2500); return teamText(B); })()).includes('Little Chute XC'));

console.log('password change keeps admin');
ok('admin cannot reuse the admin passphrase as team password', (await form(A,'#tmPw',[['#tmPw0',PW],['#tmPw1',AD]])).includes('different'));
ok('A changes the team password', (await form(A,'#tmPw',[['#tmPw0',PW],['#tmPw1',PW2]]))===''); await settle(4000);
ok('A still admin', (await teamText(A)).includes('Change admin passphrase'));
ok('C (Mac) signed out', (await teamText(C)).includes('Signed out'));
ok('C rejoins with the new password', (await form(C,'#tmJoin',[['#tmPw1',PW2]]))===''); await settle(2500);
tt=await teamText(C); ok('C is still admin after rejoining (no admin passphrase needed)', tt.includes('Admin') && tt.includes('Change team password'), tt);
ok('B rejoins as a member', (await form(B,'#tmJoin',[['#tmPw1',PW2]]))===''); await settle(2500);
ok('B still not admin', (await teamText(B)).includes('Ask your team admin'));

console.log('quiet rejoin keeps admin (new anonymous account on C)');
const ctxC=C.browserContext(); await C.close();
const wipe=await ctxC.newPage(); await wipe.goto('http://localhost:8765/version.json'); await wipe.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('firebaseLocalStorageDb'); q.onsuccess=q.onerror=q.onblocked=()=>r(); })); await wipe.close();
let C2=await ctxC.newPage(); await C2.setViewport({width:390,height:844,isMobile:true,hasTouch:true}); C2.on('pageerror',e=>errs.push('C2: '+e.message));
await C2.goto(URL); await C2.waitForFunction(()=>window.MSApp&&document.querySelector('.watch')); await settle(5000);
tt=await teamText(C2); ok('C with a new account is joined and still admin', tt.includes('Admin') && tt.includes('Synced'), tt);
ok('C (admin) can rename after quiet rejoin', (await form(C2,'#tmRename',[['#tmName','LCXC']]))==='');

console.log('admin passphrase change');
ok('wrong current admin passphrase rejected', (await form(A,'#tmAdminPw',[['#tmAd0','wrong phrase here'],['#tmAd1',AD2]])).includes('isn’t right'));
ok('A changes the admin passphrase', (await form(A,'#tmAdminPw',[['#tmAd0',AD],['#tmAd1',AD2]]))==='');
ok('C loses admin', await waitFor(C2,()=>!MSApp||true) && await (async()=>{ for(let i=0;i<20;i++){ const t=await teamText(C2); if(t.includes("I'm the admin")) return true; await W(500);} return false; })());
ok('C: old admin passphrase no longer works', (await form(C2,'#tmBeAdmin',[['#tmAd1',AD]])).includes('isn’t the admin passphrase'));
ok('C: new admin passphrase works', (await form(C2,'#tmBeAdmin',[['#tmAd1',AD2]]))===''); await settle();
ok('C admin again', (await teamText(C2)).includes('Change team password'));

console.log('stop being admin on a device');
await openSet(C2); await C2.click('#tmDropAdmin'); await W(); await C2.click('[data-x=yes]'); await settle();
tt=await teamText(C2); ok('C is a member again', tt.includes("I'm the admin") && !tt.includes('Change team password'), tt);
ok('A still admin (team keeps its passphrase)', (await teamText(A)).includes('Change admin passphrase'));
ok('member data still syncs for B', await (async()=>{ await B.evaluate(()=>{ MSApp.getRoster().push({id:'zz1',name:'Zed Q.',group:''}); }); await B.click('.tab[data-tab=team]'); await B.click('#addAth'); await W(); await B.type('#athName','Yara Voss'); await B.click('[data-x=yes]'); return waitFor(A,()=>MSApp.getRoster().some(a=>a.name==='Yara V.')); })());

console.log('pre-2.1 team with no admin');
const LH=teamHash('legacy team phrase 55');
await owner('teams/L1',{name:{stringValue:'Old Team'},pwVersion:{integerValue:'1'},createdAt:{timestampValue:new Date().toISOString()}});
await owner('teamKeys/'+LH,{teamId:{stringValue:'L1'},pwVersion:{integerValue:'1'}});
const D=await phone('D'), E=await phone('E');
await form(D,'#tmJoin',[['#tmPw1','legacy team phrase 55']]); await merge(D); await form(E,'#tmJoin',[['#tmPw1','legacy team phrase 55']]); await merge(E); await settle(2500);
tt=await teamText(D); ok('D sees "Set admin passphrase", no password options', tt.includes('no admin yet') && tt.includes('Set admin passphrase') && !tt.includes('Change team password'), tt);
ok('set admin must differ from team password', (await form(D,'#tmSetAdmin',[['#tmAd1','Legacy Team  Phrase 55']])).includes('different'));
ok('D sets the admin passphrase', (await form(D,'#tmSetAdmin',[['#tmAd1',AD]]))===''); await settle();
ok('D is admin', (await teamText(D)).includes('Change admin passphrase'));
ok('E: option gone, sees ask-admin line', await (async()=>{ for(let i=0;i<20;i++){ const t=await teamText(E); if(t.includes('Ask your team admin') && !t.includes('Set admin passphrase')) return true; await W(500);} return false; })());
ok('E: team T1\'s current admin phrase does not unlock L1 (per-team salt)', (await form(E,'#tmBeAdmin',[['#tmAd1',AD2]])).includes('isn’t the admin passphrase'));

console.log('console recovery (owner sets hasAdmin false)');
await owner('teams/L1',{hasAdmin:{booleanValue:false}},['hasAdmin']);
ok('D told and loses admin', await (async()=>{ for(let i=0;i<30;i++){ const t=await teamText(D); if(t.includes('Set admin passphrase')) return true; await W(500);} return false; })());
ok('E can set a new admin passphrase', (await form(E,'#tmSetAdmin',[['#tmAd1','fresh start phrase 3']]))==='');
await settle(); ok('E is admin', (await teamText(E)).includes('Change admin passphrase'));
ok('D stays a member (old version)', (await teamText(D)).includes('Ask your team admin'));

console.log('\nerrors', errs); console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
