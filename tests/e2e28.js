// 3.3: shared live stopwatches across three coach phones (Firestore emulator, fake names).
// Phone C's clock is 37 seconds fast. Covers: a start on A appears on B and C; laps from B and C appear everywhere with
// the coach's name; two coaches' taps within 2 s are one lap (both kept, the other can be chosen); every phone shows the
// same time (within 0.3 s); an offline phone keeps timing and its taps sync later; a reload mid-workout keeps
// everything; reps and rest across phones; Stop / Keep timing / Undo / Start over / Remove with Undo on every phone;
// "Coach X offline"; the Show filter; nothing is written per tick.
const puppeteer=require('puppeteer-core'), lib=require('./lib.js');
const URL='http://localhost:8765/?emu', PW='gravel otter lantern 44', AD='quiet falcon harbor 12';
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||250)); const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const waitFor=async(p,fn,arg,ms=15000)=>{ try{ await p.waitForFunction(fn,{timeout:ms,polling:100},arg); return true; }catch(e){ return false; } };
const writes={}; // Firestore writes per phone (to check nothing is written per tick)
async function phone(tag,name,skew){ const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); p.tag=tag;
  await p.evaluateOnNewDocument((name,skew)=>{ try{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1');
      const sd=localStorage.getItem('e2eSeed'); if(sd){ localStorage.setItem('mustang-splits:v1',sd); localStorage.removeItem('e2eSeed'); }
      if(!localStorage.getItem('mustang-splits:v1')){ localStorage.setItem('mustang-splits:v1',JSON.stringify({v:1,settings:{tol:1,compact:false,sound:false,wake:false,liveLog:true,raceCols:2,coachName:name,coachAsked:true},workouts:[],roster:[],courses:[],prs:{},raceLog:[],series:[],meets:[],merges:[],places:[],weather:[],race:null,watches:[]})); } }catch(e){}
    if(skew){ const R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+skew); } static now(){ return R.now()+skew; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; } },name,skew||0);
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(tag+': '+e.message));
  writes[tag]=0; p.on('request',r=>{ if(/Write\/channel|google.firestore.v1.Firestore\/Write/.test(r.url())&&r.method()==='POST') writes[tag]++; });
  await p.goto(URL); await p.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=watches]')); lib.patchClick(p); return p; }
const form=async(p,btn,vals)=>{ await p.click('#openSettings'); await W(); await p.click(btn); await W(); for(const [x,v] of vals) await p.$eval(x,(i,v)=>i.value=v,v); await p.click('[data-x=yes]'); await waitFor(p,()=>document.querySelector('#overlay').hidden||document.querySelector('[data-x=mine]'),null,20000); };
const merge=async p=>{ if(await waitFor(p,()=>document.querySelector('[data-x=mine]'),null,8000)){ await p.click('[data-x=mine]'); await W(1500); } };
const st=(p,id)=>p.evaluate(id=>MSApp.watchState(id),id);
// every phone's clock, read at (nearly) the same real moment: elapsed minus real time is constant while running
const realEl=(p,id)=>p.evaluate(id=>{ const s=MSApp.watchState(id); return s?s.el-(performance.timeOrigin+performance.now()):null; },id);
const tap=(p,id,act)=>p.evaluate((id,act)=>{ const b=document.querySelector(`.watch[data-id="${id}"] [data-act="${act}"]`); if(!b) return false; b.click(); return true; },id,act);
const menu=async(p,id,k)=>{ await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),id); await W(300); const ok2=await p.evaluate(k=>{ const b=document.querySelector(`#modal [data-m="${k}"]`); if(!b) return false; b.click(); return true; },k); await W(300); const y=await p.$('#modal [data-x=yes]'); if(y){ await y.click(); await W(300); } return ok2; };
const P3=()=>[A,B,C];
const all=async(fn,ms)=>{ for(const p of P3()) if(!(await waitFor(p,fn.fn,fn.arg,ms||8000))) return p.tag; return ''; };

console.log('0. three coaches join one team (C’s clock is 37 s fast)');
const A=await phone('A','Coach Ann'), B=await phone('B','Coach Ben'), C=await phone('C','Coach Cal',37000);
await A.evaluate(()=>{ const K='mustang-splits:v1', S=JSON.parse(localStorage.getItem(K));
  S.roster=[{id:'g1',name:'Ada Quill',group:'',gender:'G'},{id:'g2',name:'Bea Rowan',group:'',gender:'G'},{id:'b1',name:'Ike Corbet',group:'',gender:'B'}];
  S.workouts=[{id:'wk8',name:'800 × 3 VO2max',reps:3,rest:'0:05',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:800,mode:'total',value:'2:40',cp:400}]}];
  localStorage.setItem('e2eSeed',JSON.stringify(S)); }); await A.reload(); await A.waitForFunction(()=>window.MSApp); await W(400);
await form(A,'#tmCreate',[['#tmName','Mustangs'],['#tmPw1',PW],['#tmAd1',AD]]); await merge(A); await W(1500);
await form(B,'#tmJoin',[['#tmPw1',PW]]); await merge(B); await form(C,'#tmJoin',[['#tmPw1',PW]]); await merge(C); await W(2500);
for(const p of P3()) await p.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); });
const offC=await C.evaluate(()=>new Promise(r=>{ let n=0; const t=setInterval(()=>{ const c=JSON.parse(localStorage.getItem('mustang-splits:clock')||'{}'); if(c.off!=null||++n>60){ clearInterval(t); r(c.off); } },250); }));
ok('C measured its clock offset (about −37 s)', offC!=null&&Math.abs(offC+37000)<1500, offC);

console.log('1. a stopwatch started on A appears on B and C, at the same time');
const t0=Date.now(); await A.evaluate(()=>document.querySelector('#newBtn')?document.querySelector('#newBtn').click():document.querySelector('[data-new=quick]').click()); await W(300);
await A.evaluate(()=>{ const q=document.querySelector('#modal [data-new=quick]')||document.querySelector('[data-new=quick]'); if(q) q.click(); }); await W(300);
const id=await A.evaluate(()=>MSApp.getWatches?MSApp.getWatches()[0].id:JSON.parse(localStorage.getItem('mustang-splits:v1')).watches[0].id).catch(()=>null)||await A.evaluate(()=>document.querySelector('.watch').dataset.id);
const seen=await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='running'; },arg:id},6000);
ok('running on all three phones within a few seconds', !seen, seen?'missing on '+seen:Math.round((Date.now()-t0)/100)/10+' s');
await W(500); const e0=await Promise.all(P3().map(p=>realEl(p,id)));
ok('every phone shows the same time (within 0.3 s), C’s wrong clock included', Math.max(...e0)-Math.min(...e0)<300, e0.map(x=>Math.round(x-e0[0])).join(' / ')+' ms');

console.log('2. any coach taps Lap; each tap carries the coach’s name');
await W(1500); await tap(B,id,'split'); await W(3000); await tap(C,id,'split');
const two=await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.laps.length===2; },arg:id});
ok('B’s and C’s laps appear on every phone', !two, two);
const lt=await A.evaluate(id=>MSApp.watchState(id).lapTaps.map(x=>x&&x.by).join(),id);
ok('each lap records who tapped it (Coach Ben, Coach Cal)', lt==='Coach Ben,Coach Cal', lt);
const L3=await Promise.all(P3().map(p=>st(p,id))); const d=L3.map(s=>s.laps[1]-s.laps[0]);
ok('the lap times match on every phone (within 0.3 s), corrected for C’s clock', Math.max(...L3.map(s=>s.laps[0]))-Math.min(...L3.map(s=>s.laps[0]))<300 && Math.max(...d)-Math.min(...d)<300, L3.map(s=>s.laps.map(x=>(x/1000).toFixed(2)).join('/')).join(' | '));
ok('the lap shows the coach’s name on the card', await B.evaluate(id=>/Coach Cal/.test(document.querySelector(`.watch[data-id="${id}"]`).textContent),id));

console.log('3. two coaches tap within 2 s: one lap, both kept, the other can be chosen');
await W(2500); await Promise.all([tap(B,id,'split'),W(400).then(()=>tap(C,id,'split'))]);
const m3=await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.laps.length===3&&s.lapTaps[2]&&s.lapTaps[2].alts===1; },arg:id});
ok('counted once on every phone, the second tap kept as an alternative', !m3, m3);
const who=await A.evaluate(id=>MSApp.watchState(id).lapTaps[2].by,id);
ok('the earlier tap counts (Coach Ben)', who==='Coach Ben', who);
await A.evaluate(id=>{ const c=document.querySelector(`.watch[data-id="${id}"] details.log`); if(c) c.open=true; },id); await W(200);
const alt=await A.evaluate(id=>{ const b=document.querySelector(`.watch[data-id="${id}"] [data-alt]`); if(!b) return ''; const t=b.textContent; b.click(); return t; },id);
ok('the lap history shows the other tap with “use this”', /also Coach Cal \(\+0\.\d s\) · use this/.test(alt), alt);
const ch=await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.lapTaps[2]&&s.lapTaps[2].by==='Coach Cal'; },arg:id});
ok('choosing it switches the lap to Coach Cal’s tap on every phone', !ch, ch);

console.log('4. offline: C keeps timing and its taps sync on reconnect');
await C.setOfflineMode(true); await W(500);
await tap(C,id,'split'); await W(2500); await tap(C,id,'split'); await W(500);
ok('offline C: its clock keeps running and shows its 2 new laps', (await st(C,id)).laps.length===5 && (await st(C,id)).status==='running');
ok('…the others don’t have them yet', (await st(A,id)).laps.length===3);
ok('C says it’s offline and its taps are saved', /This phone is offline/.test(await C.evaluate(()=>MSApp.coachNoteText())));
await C.setOfflineMode(false);
const sy=await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.laps.length===5; },arg:id},20000);
ok('back online: C’s taps appear on A and B', !sy, sy);
const L5=await Promise.all(P3().map(p=>st(p,id)));
ok('…with the times C tapped them (match within 0.3 s)', Math.max(...L5.map(s=>s.laps[4]))-Math.min(...L5.map(s=>s.laps[4]))<300, L5.map(s=>(s.laps[4]/1000).toFixed(2)).join(' / '));

console.log('5. a reload mid-workout keeps every clock and lap');
const before=await realEl(B,id); await B.reload(); await B.waitForFunction(()=>window.MSApp&&document.querySelector('.tab[data-tab=watches]')); await W(1500);
const sB=await st(B,id), after=await realEl(B,id);
ok('B after a reload: still running, 5 laps, same clock (within 0.3 s)', sB&&sB.status==='running'&&sB.laps.length===5&&Math.abs(after-before)<300, sB&&`${sB.status} ${sB.laps.length} ${Math.round(after-before)} ms`);
await tap(B,id,'split');
ok('…and it keeps sharing (a lap from B appears on A and C)', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.laps.length===6; },arg:id})));

console.log('6. a workout with reps and rest, shared');
const wid=await A.evaluate(()=>MSApp.addWatch('Group 1','wk8')); await W(500);
ok('the new stopwatch (waiting) appears on B and C', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='idle'; },arg:wid})));
await tap(B,wid,'start'); await W(1500);
ok('B starts it: running everywhere', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='running'; },arg:wid})));
await tap(C,wid,'split'); await W(2600); await tap(A,wid,'split'); // 400 and 800 (more than 2 s apart): rep 1 done, rest 5 s
ok('rep 1 done on every phone: resting', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.splits.length===2&&s.phase==='rest'; },arg:wid})));
ok('after the 5 s rest, rep 2 starts by itself on every phone', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.phase==='run'&&s.rep===1; },arg:wid},12000)));
await tap(B,wid,'split'); await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.splits.length===3; },arg:wid});
const S6=await Promise.all(P3().map(p=>st(p,wid)));
ok('a rep 2 split from B: same rep, mark and time everywhere', S6.every(s=>s.splits.length===3&&s.splits[2].rep===1)&&Math.max(...S6.map(s=>s.splits[2].t))-Math.min(...S6.map(s=>s.splits[2].t))<300, S6.map(s=>s.splits.length+':'+(s.splits[2]?(s.splits[2].t/1000).toFixed(2):'')).join(' | '));

console.log('7. Stop, Keep timing, Undo, Start over, Remove: on every phone');
await tap(A,id,'stop'); await W(200); await tap(A,id,'stop'); // two taps on the tile
ok('Stop on A: stopped everywhere', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='paused'; },arg:id})));
await tap(B,id,'resume');
ok('Keep timing on B: running everywhere', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='running'; },arg:id})));
await tap(C,id,'undo');
ok('Undo on C: the last lap is removed everywhere', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.laps.length===5; },arg:id})));
await menu(A,id,'stop'); await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='paused'; },arg:id});
await menu(A,id,'reset');
ok('Start over on A: back to waiting everywhere', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='idle'&&s.laps.length===0; },arg:id})));
await A.evaluate(id=>{ const b=document.querySelector(`.watch[data-id="${id}"] [data-act=tundo]`); if(b) b.click(); },id);
ok('Undo on the tile: the laps come back everywhere', !(await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.laps.length===5; },arg:id})));
await menu(B,wid,'stop'); await all({fn:id=>{ const s=MSApp.watchState(id); return s&&s.status==='paused'; },arg:wid});
await menu(B,wid,'del');
ok('Remove on B: gone from every phone', !(await all({fn:id=>!MSApp.watchState(id),arg:wid})));
await B.evaluate(()=>{ const g=document.querySelector('.watch.gone [data-gone]'); if(g) g.click(); });
ok('Undo on B: back on every phone', !(await all({fn:id=>{ const s=MSApp.watchState(id); return !!s; },arg:wid})));

console.log('8. Show filter, offline note, writes only on taps');
await A.evaluate(()=>{ document.querySelector('#showBtn').click(); }); await W(300);
await A.evaluate(()=>{ const c=[...document.querySelectorAll('#modal [data-sk]')][0]; if(c) c.click(); document.querySelector('#modal [data-x=done]').click(); }); await W(300);
ok('Show: picking one group hides the other stopwatch on this phone only', await A.evaluate(()=>document.querySelectorAll('.watch.f-hide').length===1) && await B.evaluate(()=>document.querySelectorAll('.watch.f-hide').length===0));
ok('…remembered on this phone', await A.evaluate(()=>!!JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.watchShow));
await A.evaluate(()=>{ document.querySelector('#showBtn').click(); }); await W(300); await A.evaluate(()=>document.querySelector('#modal [data-sall]').click()); await W(200);
ok('Show: All brings it back', await A.evaluate(()=>document.querySelectorAll('.watch.f-hide').length===0));
const benUid=await A.evaluate(()=>{ for(const w of JSON.parse(localStorage.getItem('mustang-splits:v1')).watches) for(const e of (w.ev||[])) if(e.byName==='Coach Ben') return e.by; return null; });
ok('a coach who tapped today and hasn’t been heard from for minutes shows as “Coach Ben offline”', /Coach Ben offline/.test(await A.evaluate(u=>{ MSApp.devices([{uid:u,name:'Coach Ben',seen:Date.now()-600000}]); return MSApp.coachNoteText(); },benUid)), benUid);
ok('…and not while their phone checks in', !/Coach Ben offline/.test(await A.evaluate(u=>{ MSApp.devices([{uid:u,name:'Coach Ben',seen:Date.now()}]); return MSApp.coachNoteText(); },benUid)));
const w0=writes.A; await W(5000);
ok('nothing is written while clocks just run (5 s, no taps)', writes.A-w0<=1, writes.A-w0);

ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
