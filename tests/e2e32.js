// 3.6: stable stopwatch layout (3.15: rows). Every row has one fixed size in each layout (rows and two columns); laps,
// Undo, rest starting and ending, Stop, Keep timing, Start over, the lap sheet and another coach's taps never move or
// resize a row, on either phone. A new stopwatch goes at the end (nothing else moves); a removed one keeps its place
// until nobody has touched the screen for a moment, then the rows below close up. No tap guards. Two phones on one team
// (Firestore emulator), fake names.
const puppeteer=require('puppeteer-core'), H=require('./tools/phones.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const {W,waitFor,rects,diff}=H; const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const tap=(p,id,act)=>p.evaluate((id,act)=>{ const x=document.querySelector(`.watch[data-id="${id}"] [data-act="${act}"]`); if(!x) return false; x.click(); return true; },id,act); // the row (start / split / gonow / details) or its Undo zone (undo / tundo)
const menu=async(p,id,k)=>{ await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),id); await W(300); const r=await p.evaluate(k=>{ const x=document.querySelector(`#modal [data-m="${k}"]`); if(!x) return false; x.click(); return true; },k); await W(300); const y=await p.$('#modal [data-x=yes]'); if(y){ await y.click(); await W(300); } return r; };
const ws=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('mustang-splits:v1')).watches.map(w=>w.id));

for(const compact of [false,true]){ const L=compact?'compact':'regular';
console.log(`1. ${L}: two coaches, four stopwatches`);
const [A,B]=await H.team(b,['Coach Ann','Coach Ben'],errs,S=>{ S.roster=[{id:'g1',name:'Ada Quill',group:'',gender:'G'},{id:'g2',name:'Bea Rowan',group:'',gender:'G'},{id:'b1',name:'Ike Corbet',group:'',gender:'B'}];
  S.workouts=[{id:'wk4',name:'400 × 3',reps:3,rest:'0:06',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:400,mode:'total',value:'1:20',cp:200}]}]; },{compact,pw:compact?'gravel otter lantern 45':'gravel otter lantern 44'});
const ids=[await A.evaluate(()=>MSApp.addWatch('Quick',null)), await A.evaluate(()=>MSApp.addGroup('Group 1','wk4',['g1','g2','b1'])), await A.evaluate(()=>MSApp.addWatch('Waiting','wk4')), await A.evaluate(()=>MSApp.addWatch('Laps only',null))];
await A.evaluate(()=>document.querySelector('#startAll')&&0); await W(600);
await A.evaluate(()=>{ const s=document.querySelector('#startAll'); if(s&&!s.hidden) s.click(); }); await W(400);
ok(`${L}: all four on B too`, await waitFor(B,n=>document.querySelectorAll('#grid .watch[data-id]').length===n,4,10000));
await W(800);
const base={A:await rects(A),B:await rects(B)};
const sizes=Object.values(base.A).map(r=>r[2]+'x'+r[3]);
ok(`${L}: every tile the same size`, new Set(sizes).size===1, [...new Set(sizes)].join(' '));
const clipped=await A.evaluate(()=>[...document.querySelectorAll('#grid .watch[data-id]')].flatMap(n=>{ const r=n.getBoundingClientRect(), pb=parseFloat(getComputedStyle(n).paddingBottom); return [...n.children].filter(c=>c.getBoundingClientRect().bottom>r.bottom-pb+0.5).map(c=>c.className); }));
ok(`${L}: nothing inside a tile is cut off at its bottom`, !clipped.length, clipped.join());
const moves=[];
const check=async name=>{ for(const [k,p] of [['A',A],['B',B]]){ const d=diff(base[k],await rects(p)); if(d.length) moves.push(`${name} (${k}): ${d.join('; ')}`); } };
const [Q,G,Wt,Lp]=ids;
// stopwatch-only laps, on both tiles that have no plan
await tap(A,Q,'split'); await check('lap'); await tap(A,Q,'split'); await tap(A,Lp,'split'); await check('laps');
await W(4300); await check('the "recorded" note ends');
await tap(A,Q,'undo'); await check('undo');
// workout laps; the second ends rep 1 and starts rest
await tap(A,G,'split'); await check('workout lap (200m)'); await tap(A,G,'split'); await check('rest starts');
ok(`${L}: the group is resting`, (await A.evaluate(id=>MSApp.watchState(id).phase,G))==='rest');
await tap(A,G,'undo'); await check('undo back into the rep'); await tap(A,G,'split'); await check('rest again');
await W(6500); await check('rest ends, rep 2 starts by itself');
ok(`${L}: rep 2 started by itself`, (await A.evaluate(id=>MSApp.watchState(id),G)).rep===1);
// another coach's taps (once B's own clock has ended the rest too)
await waitFor(B,id=>MSApp.watchState(id).phase==='run',G,5000);
await tap(B,G,'split'); await tap(B,Q,'split'); await W(1500); await check('another coach taps Lap');
ok(`${L}: B's taps arrived on A`, (await A.evaluate(id=>MSApp.watchState(id).splits.length,G))>=3);
// the lap list (3.17: in the row's sheet, opened by a tap on the row)
await A.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=menu]`).click(),G); await W(300);
ok(`${L}: the row's sheet lists every split`, await A.evaluate(()=>!document.querySelector('#overlay').hidden&&document.querySelectorAll('#modal .lap-sheet tbody tr:not(.rep-row)').length>=3));
await A.evaluate(()=>document.querySelector('#modal [data-x=no]').click()); await W(300); await check('the lap sheet');
// Stop (the row's sheet, one tap); Keep timing; Stop again; Start over
await menu(A,Q,'stop'); await check('Stop');
await menu(A,Q,'resume'); await check('Keep timing'); await menu(A,Q,'stop'); await check('Stop again');
await menu(A,Q,'reset'); await check('Start over'); await W(300);
await tap(A,Q,'undo'); await check('Undo Start over'); // 3.17: the status line's Undo link takes back the Start over first
await W(1200); await check('everything synced');
ok(`${L}: no tile moved or changed size through laps, Undo, rest, Stop, Keep timing, Start over, the lap sheet or the other coach’s taps`, !moves.length, moves.slice(0,6).join(' | '));
// add and remove: a new row goes at the end; a removed row keeps its place until nobody is touching, then closes up
console.log(`2. ${L}: adding and removing stopwatches`);
const before=await rects(B);
const extra=await A.evaluate(()=>MSApp.addWatch('Extra',null));
await waitFor(B,id=>!!document.querySelector(`.watch[data-id="${id}"]`),extra,5000,);
await W(30); const after=await rects(B);
ok(`${L}: a new row goes at the end: the rows already there kept their place and size`, !diff(before,after).length&&await B.evaluate(id=>{ const L=[...document.querySelectorAll('#grid .watch[data-id]')]; return L[L.length-1].dataset.id===id; },extra), diff(before,after).join('; '));
await W(500); await menu(A,Lp,'stop'); const r0=await rects(B);
await B.evaluate(()=>{ window.__t=setInterval(()=>document.querySelector('#grid').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})),300); }); // someone keeps touching the screen
await menu(A,Lp,'del');
await waitFor(B,id=>!document.querySelector(`.watch.wrow[data-id="${id}"]`),Lp,5000); await W(800);
const r1=await rects(B);
ok(`${L}: while someone is touching, the removed row keeps its place (nothing moves)`, !diff(r0,r1).length, diff(r0,r1).join('; '));
await B.evaluate(()=>clearInterval(window.__t)); await W(2600);
const r2=await rects(B);
ok(`${L}: …then it closes up (the rows below move up)`, diff(r0,r2).length>0&&!(await B.evaluate(()=>!!document.querySelector('#grid .watch.gone'))));
const tapped=await tap(B,extra,'start'); await W(400);
ok(`${L}: no tap guard: a row that just moved starts on the first tap`, tapped&&(await B.evaluate(id=>MSApp.watchState(id).status,extra))==='running');
const gone=await rects(B);
ok(`${L}: every row still the same size`, new Set(Object.values(gone).map(r=>r[2]+'x'+r[3])).size===1);
await A.close(); await B.close(); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
