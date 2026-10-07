// Coach phones on one team for the emulator suites (3.6, from e2e28): phone(), form(), merge(), a team made by A and
// joined by the rest. Fake names only.
const lib=require('../lib.js');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
const W=ms=>new Promise(r=>setTimeout(r,ms||250));
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:100},arg); return true; }catch(e){ return false; } };
async function phone(b,tag,name,errs,o={}){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); p.tag=tag;
  await p.evaluateOnNewDocument((name,compact)=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1');
      const sd=localStorage.getItem('e2eSeed'); if(sd){ localStorage.setItem('mustang-splits:v1',sd); localStorage.removeItem('e2eSeed'); }
      if(!localStorage.getItem('mustang-splits:v1')){ localStorage.setItem('mustang-splits:v1',JSON.stringify({v:1,settings:{tol:1,compact:!!compact,sound:false,wake:false,liveLog:true,raceCols:2,coachName:name,coachAsked:true},workouts:[],roster:[],courses:[],prs:{},raceLog:[],series:[],meets:[],merges:[],places:[],weather:[],race:null,watches:[]})); } }catch(e){} },name,!!o.compact);
  await p.setViewport({width:o.w||390,height:o.h||844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=watches]')); lib.patchClick(p); return p; }
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
// A seeds its data (seed(S) changes the saved state), creates the team; the others join.
async function team(b,names,errs,seed,o={}){ const P=[]; for(const [i,n] of names.entries()) P.push(await phone(b,'ABCDEF'[i],n,errs,o));
  const A=P[0]; if(seed){ await A.evaluate(`(()=>{ const K='mustang-splits:v1', S=JSON.parse(localStorage.getItem(K)); (${seed.toString()})(S); localStorage.setItem('e2eSeed',JSON.stringify(S)); })()`); await A.reload(); await A.waitForFunction(()=>window.MSApp); await W(400); }
  const pw=o.pw||PW; await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',pw],['#tmAd1',AD]]); await merge(A); await W(1500);
  for(const p of P.slice(1)){ await form(p,'#tmJoin',[['#tmPw1',pw]]); await merge(p); } await W(2500);
  for(const p of P) await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); });
  for(const p of P) await p.evaluate(()=>new Promise(r=>{ let n=0; const t=setInterval(()=>{ const c=JSON.parse(localStorage.getItem('mustang-splits:clock')||'{}'); if(c.off!=null||++n>60){ clearInterval(t); r(c.off); } },250); }));
  return P; }
// Every visible tile's place and size (rounded to the pixel), after any slide has finished.
const rects=async p=>{ await W(320); return p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#grid .watch[data-id]')].filter(n=>n.offsetParent).map(n=>{ const r=n.getBoundingClientRect(); return [n.dataset.id,[Math.round(r.left),Math.round(r.top+window.scrollY),Math.round(r.width),Math.round(r.height)]]; }))); };
// What changed between two layouts: tiles that moved or changed size (ids in both).
const diff=(a,b)=>Object.keys(a).filter(k=>b[k]&&a[k].join()!==b[k].join()).map(k=>`${k.slice(0,5)} ${a[k].join(',')} → ${b[k].join(',')}`);
module.exports={phone,form,merge,team,rects,diff,W,waitFor,URL};
