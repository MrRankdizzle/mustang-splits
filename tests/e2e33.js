// 3.6: splitting runners out of a group stopwatch, on three coach phones (Firestore emulator, fake names).
// During rest a name tap gives that runner their own stopwatch, starting their next rep at that moment, with the
// group's laps and their own targets; two names within 2 s leave together; Undo; ⋯ > Split runners… during a rep;
// Rejoin group and its Undo; every phone sees each change within 2 s, right after the group, with no tile resized or
// moved except by the add; practice history gives every split to the runners who ran it.
const puppeteer=require('puppeteer-core'), H=require('./tools/phones.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const {W,waitFor,rects,diff}=H; const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const meta=(p,id)=>p.evaluate(id=>MSApp.watchMeta(id),id);
const order=p=>p.evaluate(()=>[...document.querySelectorAll('#grid .watch[data-id]')].filter(n=>n.offsetParent).map(n=>n.dataset.id));
const send=(p,g,aid)=>p.evaluate((g,aid)=>{ const x=document.querySelector(`.watch[data-id="${g}"] [data-act=send][data-aid="${aid}"]`); if(!x) return false; x.click(); return true; },g,aid);
const tap=(p,id,act)=>p.evaluate((id,act)=>{ const x=document.querySelector(`.watch[data-id="${id}"] [data-act="${act}"]`); if(!x) return false; x.click(); return true; },id,act);
const menu=async(p,id,k)=>{ await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),id); await W(300); const items=await p.evaluate(()=>[...document.querySelectorAll('#modal [data-m]')].map(x=>x.dataset.m)); const r=await p.evaluate(k=>{ const x=document.querySelector(`#modal [data-m="${k}"]`); if(!x) return false; x.click(); return true; },k); await W(350); return {r,items}; };
// the stopwatch on this phone whose runners are exactly ids (visible)
const tileWith=(p,ids)=>p.evaluate(ids=>{ const k=ids.slice().sort().join(); for(const n of document.querySelectorAll('#grid .watch[data-id]')){ const m=MSApp.watchMeta(n.dataset.id); if(m&&!m.hid&&m.ids.slice().sort().join()===k) return n.dataset.id; } return null; },ids);
const R=['r1','r2','r3','r4'];
const [A,B,C]=await H.team(b,['Coach Ann','Coach Ben','Coach Cal'],errs,S=>{
  S.roster=[{id:'r1',name:'Ada Quill',group:'',gender:'G'},{id:'r2',name:'Bea Rowan',group:'',gender:'G'},{id:'r3',name:'Cora Vance',group:'',gender:'G'},{id:'r4',name:'Dot Wren',group:'',gender:'G'}];
  S.prs={r1:[{id:'p1',dist:5000,t:1080,date:'2026-09-20',meet:'Time trial',src:'hand'}],r2:[{id:'p2',dist:5000,t:1140,date:'2026-09-20',meet:'Time trial',src:'hand'}],r3:[{id:'p3',dist:5000,t:1200,date:'2026-09-20',meet:'Time trial',src:'hand'}],r4:[{id:'p4',dist:5000,t:1260,date:'2026-09-20',meet:'Time trial',src:'hand'}]};
  S.workouts=[{id:'wkE',name:'400 × 4 interval',reps:4,rest:'0:40',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:400,mode:'effort',paceRef:'interval',cp:200}]}]; },{pw:'gravel otter lantern 46'});
const P3=[A,B,C];
const onAll=async(fn,arg,ms=2000)=>{ const t=Date.now(), miss=[]; for(const p of P3) if(!(await waitFor(p,fn,arg,Math.max(50,ms-(Date.now()-t))))) miss.push(p.tag); return {miss,ms:Date.now()-t}; };

console.log('1. a group of four on the 400 × 4 effort workout, resting after rep 1');
const G=await A.evaluate(()=>MSApp.addGroup('Group 1','wkE',['r1','r2','r3','r4'])); const Q=await A.evaluate(()=>MSApp.addWatch('Quick',null));
ok('the group is on every phone', !(await onAll(g=>!!document.querySelector(`.watch[data-id="${g}"]`),G,8000)).miss.length);
await W(600); await tap(A,G,'start'); await tap(A,Q,'start'); await W(1200); await tap(A,G,'split'); await W(1000); await tap(A,G,'split');
ok('resting on every phone', !(await onAll(g=>MSApp.watchState(g).phase==='rest',G,6000)).miss.length);
await W(500);
const names=await A.evaluate(g=>[...document.querySelectorAll(`.watch[data-id="${g}"] [data-act=send]`)].map(x=>x.textContent),G);
ok('during rest the group tile shows its runners as buttons', names.join()==='Ada,Bea,Cora,Dot', names.join());
await W(4000); ok('…with "Tap a name to send them now" on the status line (after the 4 s "recorded" note)', /Tap a name to send them now/.test(await A.evaluate(g=>document.querySelector(`.watch[data-id="${g}"] .w-status`).textContent,G)));
ok('…and on the other phones too', (await B.evaluate(g=>document.querySelectorAll(`.watch[data-id="${g}"] [data-act=send]`).length,G))===4);
const base={}; for(const p of P3) base[p.tag]=await rects(p);
const gPlan=(await meta(A,G)).plan;

console.log('2. Ada is sent now: her own stopwatch, right after the group, on every phone within 2 s');
const t1=Date.now(); await send(A,G,'r1'); await W(100);
const N1=await tileWith(A,['r1']);
ok('a new stopwatch for Ada right away', !!N1);
const seen=await onAll(([n,g])=>{ const o=[...document.querySelectorAll('#grid .watch[data-id]')].map(x=>x.dataset.id); return o.indexOf(n)===o.indexOf(g)+1&&MSApp.watchMeta(g).ids.join()==='r2,r3,r4'; },[N1,G],2000);
ok('B and C show it right after the group, and the group without Ada, within 2 s', !seen.miss.length, seen.miss.length?'missing on '+seen.miss.join():((Date.now()-t1)/1000).toFixed(1)+' s');
const m1=await meta(A,N1), mg=await meta(A,G);
ok('Ada’s stopwatch started rep 2 at that moment; the group keeps resting', m1.phase==='run'&&m1.rep===1&&mg.phase==='rest', JSON.stringify([m1.phase,m1.rep,mg.phase]));
ok('…it carries the group’s two splits from rep 1', m1.splits===2);
ok('…same workout, Ada’s own (faster) targets', m1.plan&&gPlan&&m1.plan.cps[1]<gPlan.cps[1]-1, m1.plan&&`${m1.plan.cps[1].toFixed(1)} s vs group ${gPlan.cps[1].toFixed(1)} s`);
const mB=await meta(B,N1); ok('…the same on B (rep, splits, targets)', mB&&mB.rep===1&&mB.splits===2&&Math.abs(mB.plan.cps[1]-m1.plan.cps[1])<0.01);
for(const p of P3){ const now=await rects(p), o=await order(p), keep=o.slice(0,o.indexOf(G)+1); const d=keep.filter(k=>now[k]&&now[k].join()!==base[p.tag][k].join()); 
  ok(`${p.tag}: the tiles before it didn't move or change size; every tile one size`, !d.length&&new Set(Object.values(now).map(r=>r[2]+'x'+r[3])).size===1, d.join()); }

console.log('3. Bea and Cora tapped within 2 s leave together');
await W(2600); await send(A,G,'r2'); await W(1000); await send(A,G,'r3'); await W(300);
const N2=await tileWith(A,['r2','r3']);
ok('one new stopwatch for Bea and Cora (not two)', !!N2&&!(await tileWith(A,['r2']))&&!(await tileWith(A,['r3'])));
ok('…the group has only Dot left', (await meta(A,G)).ids.join()==='r4');
const s3=await onAll(n=>{ const m=MSApp.watchMeta(n); return !!m&&m.ids.join()==='r2,r3'&&!!document.querySelector(`.watch[data-id="${n}"]`); },N2,2500);
ok('…on every phone', !s3.miss.length, s3.miss.join());
const m2=await meta(A,N2); ok('…their rep 2 started at the first of the two taps', m2.phase==='run'&&m2.rep===1);

console.log('4. Undo the split');
await tap(A,N2,'tundo'); await W(400);
ok('Undo: their stopwatch is gone, the group has Bea, Cora and Dot', !(await tileWith(A,['r2','r3']))&&(await meta(A,G)).ids.join()==='r2,r3,r4', (await meta(A,G)).ids.join());
const u=await onAll(([n,g])=>!document.querySelector(`.watch[data-id="${n}"]`)&&MSApp.watchMeta(g).ids.join()==='r2,r3,r4',[N2,G],2500);
ok('…on every phone within 2 s', !u.miss.length, u.miss.join()+' '+JSON.stringify(await A.evaluate(([n,g])=>({n:!!document.querySelector(`.watch[data-id="${n}"]`),cls:(document.querySelector(`.watch[data-id="${n}"]`)||{}).className,m:MSApp.watchMeta(n),g:MSApp.watchMeta(g).ids}),[N2,G])));
await W(2200); await send(A,G,'r2'); await W(400); await send(A,G,'r3'); await W(500);
const N2b=await tileWith(A,['r2','r3']); ok('sent together again', !!N2b);
await onAll(n=>!!document.querySelector(`.watch[data-id="${n}"]`),N2b,2500);

console.log('5. ⋯ > Split runners… during a rep: Cora keeps the same rep');
await W(600);
const mm=await menu(A,N2b,'splitr'); ok('⋯ offers "Split runners…" on a group', mm.r, mm.items.join());
await A.evaluate(()=>{ const c=document.querySelector('#modal [data-sp="r3"]'); c.checked=true; c.dispatchEvent(new Event('change')); }); await W(200);
await A.evaluate(()=>document.querySelector('#modal [data-x=yes]').click()); await W(500);
const N3=await tileWith(A,['r3']); const m3=await meta(A,N3), m2b=await meta(A,N2b);
ok('Cora has her own stopwatch, in the same rep, started at the same moment as Bea’s', !!N3&&m3.rep===m2b.rep&&m3.phase==='run'&&Math.abs((m3.startAt+m3.repStartT)-(m2b.startAt+m2b.repStartT))<60, JSON.stringify([m3.rep,m2b.rep,(m3.startAt+m3.repStartT)-(m2b.startAt+m2b.repStartT)]));
ok('…right after the stopwatch she left', (await order(A)).indexOf(N3)===(await order(A)).indexOf(N2b)+1);
const s5=await onAll(n=>!!document.querySelector(`.watch[data-id="${n}"]`),N3,2500); ok('…on every phone', !s5.miss.length, s5.miss.join());
await tap(A,N3,'tundo'); await W(400); ok('one tap undoes it', !(await tileWith(A,['r3']))&&(await meta(A,N2b)).ids.join()==='r2,r3');
await menu(A,N2b,'splitr'); await A.evaluate(()=>{ const c=document.querySelector('#modal [data-sp="r3"]'); c.checked=true; c.dispatchEvent(new Event('change')); }); await W(200); await A.evaluate(()=>document.querySelector('#modal [data-x=yes]').click()); await W(500);
const N3b=await tileWith(A,['r3']); ok('split again', !!N3b);
await onAll(n=>!!document.querySelector(`.watch[data-id="${n}"]`),N3b,2500); await W(600);

console.log('6. their own laps, then Cora rejoins');
let lay={}; for(const p of P3) lay[p.tag]=await rects(p);
await tap(B,N3b,'split'); await W(300); await tap(C,N2b,'split'); await W(1500);
for(const p of P3){ const d=diff(lay[p.tag],await rects(p)); ok(`${p.tag}: laps on split-off stopwatches move nothing`, !d.length, d.join('; ')); }
ok('Cora’s lap (from B) and Bea’s (from C) arrived on A', (await meta(A,N3b)).splits===3&&(await meta(A,N2b)).splits===3, [(await meta(A,N3b)).splits,(await meta(A,N2b)).splits].join());
const mr=await menu(A,N3b,'rejoin'); ok('⋯ offers "Rejoin group" on a split-off stopwatch', mr.r, mr.items.join());
await W(300);
ok('rejoined: her stopwatch is hidden, Bea’s has Bea and Cora again', !(await A.evaluate(n=>!!document.querySelector(`.watch[data-id="${n}"]`),N3b))&&(await meta(A,N2b)).ids.join()==='r2,r3');
const s6=await onAll(([n,g])=>!document.querySelector(`.watch[data-id="${n}"]`)&&MSApp.watchMeta(g).ids.join()==='r2,r3',[N3b,N2b],2500); ok('…on every phone within 2 s', !s6.miss.length, s6.miss.join());
await tap(A,N2b,'tundo'); await W(400);
ok('Undo rejoin: Cora’s stopwatch is back with her laps', (await A.evaluate(n=>!!document.querySelector(`.watch[data-id="${n}"]`),N3b))&&(await meta(A,N3b)).ids.join()==='r3'&&(await meta(A,N3b)).splits===3);
const s7=await onAll(n=>!!document.querySelector(`.watch[data-id="${n}"]`)&&MSApp.watchMeta(n).ids.join()==='r3',N3b,2500); ok('…on every phone', !s7.miss.length, s7.miss.join());
await W(500); await menu(A,N3b,'rejoin'); await W(500); await tap(A,N2b,'split'); await W(1500);

console.log('7. practice history: every split belongs to the runners who ran it');
for(const p of P3){ const rows=await p.evaluate(()=>{ const h=MSApp.historyNow(); return Object.fromEntries(['r1','r2','r3','r4'].map(id=>[id,MSApp.practiceRows(h,id).map(r=>`${r.rep}:${r.d}:${r.watch}`)])); });
  const want={r1:['0:200','0:400'],r2:['0:200','0:400','1:200','1:400'],r3:['0:200','0:400','1:200','1:400'],r4:['0:200','0:400']};
  const got=Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,v.map(x=>x.split(':').slice(0,2).join(':'))]));
  ok(`${p.tag}: each runner's splits, once each (Ada 2, Bea 4, Cora 4, Dot 2)`, JSON.stringify(got)===JSON.stringify(want), JSON.stringify(rows));
  if(p===A) ok('…Cora’s rep 2 200m is from her own stopwatch, her 400m from Bea’s after she rejoined', rows.r3[2].endsWith(':Cora Vance')&&/Bea/.test(rows.r3[3]), rows.r3.join(' | ')); }
const H0=await A.evaluate(()=>MSApp.historyNow()); ok('the entry keeps the rejoined stopwatch (so Cora’s own laps are saved)', H0.watches.some(w=>w.rejoined&&w.who), H0.watches.map(w=>w.name+(w.rejoined?' (rejoined)':'')).join(', '));

console.log('8. the same on a phone without a team');
const L=await H.phone(b,'L','Coach Lu',errs);
await L.evaluate(()=>{ const K='mustang-splits:v1', S=JSON.parse(localStorage.getItem(K)); S.roster=[{id:'r1',name:'Ada Quill',group:'',gender:'G'},{id:'r2',name:'Bea Rowan',group:'',gender:'G'},{id:'r3',name:'Cora Vance',group:'',gender:'G'}];
  S.workouts=[{id:'wk2',name:'400 × 3',reps:3,rest:'0:40',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:400,mode:'total',value:'1:20',cp:200}]}]; localStorage.setItem('e2eSeed',JSON.stringify(S)); }); await L.reload(); await L.waitForFunction(()=>window.MSApp); await W(500);
await L.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); });
const LG=await L.evaluate(()=>MSApp.addGroup('Group 1','wk2',['r1','r2','r3'])); await W(600);
await tap(L,LG,'start'); await W(800); await tap(L,LG,'split'); await W(600); await tap(L,LG,'split'); await W(300);
await send(L,LG,'r1'); await W(300); const LN1=await tileWith(L,['r1']); const ml=await L.evaluate(id=>MSApp.watchMeta(id),LN1);
ok('local: Ada’s own stopwatch, rep 2 started now, with the group’s 2 splits', !!LN1&&ml.phase==='run'&&ml.rep===1&&ml.splits===2, JSON.stringify(ml&&[ml.phase,ml.rep,ml.splits]));
ok('local: right after the group; the group keeps resting with Bea and Cora', (await order(L)).indexOf(LN1)===(await order(L)).indexOf(LG)+1&&(await meta(L,LG)).phase==='rest'&&(await meta(L,LG)).ids.join()==='r2,r3');
await tap(L,LN1,'split'); await W(300);
await tap(L,LN1,'tundo'); await W(300); ok('local: Undo puts Ada back on the group', !(await tileWith(L,['r1']))&&(await meta(L,LG)).ids.join()==='r1,r2,r3');
await send(L,LG,'r1'); await W(400); const LN=await tileWith(L,['r1']); await tap(L,LN,'split'); await W(300);
await menu(L,LN,'rejoin'); await W(300); ok('local: Rejoin group', !(await L.evaluate(n=>!!document.querySelector(`.watch[data-id="${n}"]`),LN))&&(await meta(L,LG)).ids.join()==='r2,r3,r1');
const lr=await L.evaluate(()=>{ const h=MSApp.historyNow(); return ['r1','r2'].map(id=>MSApp.practiceRows(h,id).map(r=>`${r.rep}:${r.d}`).join(' ')); });
ok('local: practice history gives Ada her group splits and her own 200m, once each', lr[0]==='0:200 0:400 1:200'&&lr[1]==='0:200 0:400', lr.join(' | '));
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
