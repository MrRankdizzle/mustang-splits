// 3.15: reliable taps on the Stopwatches screen (rows). Two coach phones on one team (Firestore emulator), real touch
// input (Chrome DevTools touch events, so the browser's own tap/scroll handling and pointercancel apply). Fake names.
// 1. Tap storm: 10 rows; coach B laps random rows 10 times a second; coach A taps random rows in bursts at 20 taps a
//    second (a row is never tapped again within 1.6 s). Every tap is one lap on the row under the finger, timed at the
//    touch-down frame (the finger stays down 40 ms), and no row (or its tap target) is replaced, moved or resized.
// 2. A swipe up across rows scrolls and records nothing; a sideways swipe opens the row's menu and records nothing.
// 3. Two taps on one row within 1.5 s: one lap, "Double tap ignored"; a tap after 1.5 s counts.
// 4. Layout holds through a rep, rest, an early start, another coach's taps and a split (the new row goes at the end).
// 5. Shared sync: A and B lap different rows (one lap each) and the same row within 2 s (one lap on both phones).
const puppeteer=require('puppeteer-core'), H=require('./tools/phones.js');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',protocolTimeout:120000});
const {W,waitFor}=H; const errs=[]; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const seed=new Function('S',`S.roster=['Ada Fern','Bea Holt','Cora Lind','Dot Marsh'].map((n,i)=>({id:'r'+i,name:n,group:'',gender:'G'}));
  S.workouts=[{id:'wk4',name:'4 × 200 at 0:40',reps:4,rest:'0:20',restUnit:'mss',segments:[{id:'s1',effort:'fast',dist:200,mode:'total',value:'0:40',cp:0}]}];`);
const [A,B]=await H.team(b,['Coach Ann','Coach Ben'],errs,seed);
await A.setViewport({width:390,height:1600,isMobile:true,hasTouch:true}); // a tall phone: all 10 rows on screen, no scrolling between taps
const cdp=await A.target().createCDPSession();
let tid=1; const touch=async(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([x,y])=>({x,y,id:tid,radiusX:5,radiusY:5,force:1}))});
const tap=async([x,y],hold=40)=>{ tid++; await touch('touchStart',[[x,y]]); await W(hold); await touch('touchEnd',[]); };
const center=id=>A.$eval(`#grid .watch[data-id="${id}"]`,n=>{ const r=n.querySelector('.w-tap').getBoundingClientRect(); return [Math.round(r.left+r.width*0.35),Math.round(r.top+r.height/2)]; });
// the page records each touch-down's wall time (the same conversion as the app) and which row it landed on
await A.evaluate(()=>{ window.__downs=[]; window.__ups=[]; document.addEventListener('pointerdown',e=>{ const r=e.target.closest&&e.target.closest('.watch[data-id]'); window.__downs.push({id:r&&r.dataset.id,t:Date.now()-(performance.now()-e.timeStamp)}); },true);
  document.addEventListener('pointerup',e=>{ window.__ups.push(Date.now()-(performance.now()-e.timeStamp)); },true); });

console.log('1. tap storm: 10 rows, another coach 10 times a second, 20 taps a second');
const ids=[]; for(let i=0;i<10;i++) ids.push(await A.evaluate(i=>MSApp.addWatch('Runner '+(i+1),null),i));
await W(2500); await A.evaluate(()=>document.querySelector('#startAll').click()); await W(2500);
ok('10 rows running on both phones', await waitFor(B,()=>document.querySelectorAll('#grid .watch.wrow.st-running').length===10,null,15000));
await A.evaluate(()=>window.scrollTo(0,0)); await W(300);
const marks=await A.evaluate(()=>{ const M={}; document.querySelectorAll('#grid .watch[data-id]').forEach(n=>{ n.__mark=1; n.querySelector('.w-tap').__mark=1; const r=n.getBoundingClientRect(); M[n.dataset.id]=[Math.round(r.left),Math.round(r.top+scrollY),Math.round(r.width),Math.round(r.height)]; }); return M; });
// coach B: a lap on a random row every 100 ms
await B.evaluate(ids=>{ window.__bt=setInterval(()=>{ MSApp.tapRow(ids[Math.floor(Math.random()*ids.length)]); },100); },ids);
const sent={}, last={}; let n=0; const t0=Date.now();
for(let burst=0;burst<6;burst++){ const order=ids.slice().sort(()=>Math.random()-0.5);
  for(const id of order){ if(last[id]&&Date.now()-last[id]<1600) continue; const c=await center(id);
    const s=Date.now(); await tap(c); last[id]=Date.now(); sent[id]=(sent[id]||0)+1; n++; await W(Math.max(0,50-(Date.now()-s))); }
  await W(1700); }
const rate=n/((Date.now()-t0)/1000);
await B.evaluate(()=>clearInterval(window.__bt)); await W(2500);
const got=await A.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,MSApp.myTaps(id).filter(e=>e.type==='lap')])),ids);
const lost=ids.filter(id=>(got[id]||[]).length!==(sent[id]||0)).map(id=>`${id.slice(0,4)}: ${sent[id]||0} taps → ${(got[id]||[]).length} laps`);
ok(`every tap is one lap on its own row (${n} taps, bursts at 20 a second)`, n>=40&&!lost.length, lost.slice(0,4).join(' | '));
const D=await A.evaluate(()=>window.__downs), U=await A.evaluate(()=>window.__ups);
const all=ids.flatMap(id=>(got[id]||[]).map(e=>({id,at:e.at})));
const timing=all.map(e=>{ const d=D.filter(x=>x.id===e.id).map(x=>x.t).sort((p,q)=>Math.abs(p-e.at)-Math.abs(q-e.at))[0]; return d==null?999:Math.abs(e.at-d); });
ok('each lap carries its touch-down time (within one frame, 17 ms), not the lift 40 ms later', timing.length>=40&&timing.every(x=>x<=17), 'worst '+Math.max(...timing).toFixed(1)+' ms');
const kept=await A.evaluate(M=>{ const out=[]; Object.keys(M).forEach(id=>{ const n=document.querySelector(`#grid .watch[data-id="${id}"]`); if(!n||!n.__mark||!n.querySelector('.w-tap').__mark) out.push(id.slice(0,4)+' replaced'); else { const r=n.getBoundingClientRect(), now=[Math.round(r.left),Math.round(r.top+scrollY),Math.round(r.width),Math.round(r.height)]; if(now.join()!==M[id].join()) out.push(id.slice(0,4)+' '+M[id]+' → '+now); } }); return out; },marks);
ok('no row or tap target was replaced, moved or resized', !kept.length, kept.slice(0,3).join(' | '));
ok(`another coach's taps kept arriving (${Object.values(await A.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,MSApp.lapCount(id)])),ids)).reduce((a,x)=>a+x,0)} laps shown on A)`, true);

console.log('2. scrolling never records a lap');
await A.evaluate(()=>window.scrollTo(0,0)); await W(300);
const before=await A.evaluate(ids=>ids.map(id=>MSApp.myTaps(id).length),ids);
const c1=await center(ids[3]); tid++; await touch('touchStart',[c1]); for(let k=1;k<=10;k++){ await touch('touchMove',[[c1[0],c1[1]-k*18]]); await W(16); } await touch('touchEnd',[]); await W(600);
const c2=await center(ids[5]); tid++; await touch('touchStart',[c2]); for(let k=1;k<=10;k++){ await touch('touchMove',[[c2[0],c2[1]+k*6]]); await W(16); } await touch('touchEnd',[]); await W(600);
const after=await A.evaluate(ids=>ids.map(id=>MSApp.myTaps(id).length),ids);
ok('a swipe up or down across rows records nothing', before.join()===after.join(), before.join()+' → '+after.join());
const c3=await center(ids[2]); tid++; await touch('touchStart',[c3]); for(let k=1;k<=8;k++){ await touch('touchMove',[[c3[0]-k*12,c3[1]]]); await W(16); } await touch('touchEnd',[]); await W(500);
ok('a sideways swipe opens the row’s menu and records nothing', await A.evaluate(()=>!document.querySelector('#overlay').hidden&&!!document.querySelector('#modal .menu-sheet'))&&(await A.evaluate(id=>MSApp.myTaps(id).length,ids[2]))===after[2]);
await A.evaluate(()=>{ const x=document.querySelector('#modal [data-x=no]'); if(x) x.click(); }); await waitFor(A,()=>document.querySelector('#overlay').hidden,null,3000); await W(400);
// press and hold: the menu, no lap
const c4=await center(ids[4]); tid++; await touch('touchStart',[c4]); await W(800); await touch('touchEnd',[]); await W(400);
const hold=await A.evaluate((id,c)=>({ov:!document.querySelector('#overlay').hidden,stop:!!document.querySelector('#modal .menu-sheet [data-m=stop]'),items:[...document.querySelectorAll('#modal [data-m]')].map(b=>b.dataset.m).join(),n:MSApp.myTaps(id).length,st:MSApp.rowState(id)}),ids[4],c4);
ok('press and hold opens the row’s menu and records nothing', hold.ov&&hold.stop&&hold.n===after[4], JSON.stringify(hold)+' was '+after[4]);
await A.evaluate(()=>{ const x=document.querySelector('#modal [data-x=no]'); if(x) x.click(); }); await waitFor(A,()=>document.querySelector('#overlay').hidden,null,3000); await W(400);

console.log('3. double taps');
await W(1700); const d0=await A.evaluate(id=>MSApp.myTaps(id).length,ids[1]), c5=await center(ids[1]);
await tap(c5); await W(250); await tap(c5); await W(200);
ok('two taps 0.3 s apart: one lap; the row says "Double tap ignored"', (await A.evaluate(id=>MSApp.myTaps(id).length,ids[1]))===d0+1&&/Double tap ignored/.test(await A.evaluate(id=>MSApp.rowState(id).st,ids[1])), await A.evaluate(id=>MSApp.rowState(id).st,ids[1]));
await W(1600); await tap(c5); await W(300);
ok('a tap 1.6 s later counts', (await A.evaluate(id=>MSApp.myTaps(id).length,ids[1]))===d0+2);
// the Undo zone: live after a lap, takes the lap back, and is the row's own tap again afterwards
await W(1600); const u0=await A.evaluate(id=>MSApp.lapCount(id),ids[6]), c6=await center(ids[6]); await tap(c6); await W(300);
const uz=await A.$eval(`#grid .watch[data-id="${ids[6]}"] .w-undo`,u=>{ const r=u.getBoundingClientRect(); return {on:u.classList.contains('on'),x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),st:MSApp.rowState(u.closest('.watch').dataset.id)}; });
await tap([uz.x,uz.y]); await W(500);
ok('after a lap, the trailing Undo zone takes it back', uz.on&&(await A.evaluate(id=>MSApp.lapCount(id),ids[6]))===u0, JSON.stringify(uz));
await W(6500); const u1=await A.evaluate(id=>MSApp.lapCount(id),ids[6]); await tap([uz.x,uz.y]); await W(400);
ok('6 s later the same spot is the row’s tap again (a lap)', (await A.evaluate(id=>MSApp.lapCount(id),ids[6]))===u1+1);

console.log('4. the layout holds through a rep, rest, an early start, remote taps and a split');
await A.evaluate(()=>{ document.querySelector('#endWk').click(); }); await W(400); await A.evaluate(()=>{ const y=document.querySelector('#modal [data-x=yes]'); if(y) y.click(); }); await W(4000); // removed rows close up once nobody is touching
const g=await A.evaluate(()=>MSApp.addGroup('Group 1','wk4',['r0','r1','r2'])), q=await A.evaluate(()=>MSApp.addWatch('Solo',null)); await W(2500);
const rect=()=>A.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#grid .watch[data-id]')].map(n=>{ const r=n.getBoundingClientRect(), t=n.querySelector('.w-tap'); return [n.dataset.id,[Math.round(r.left),Math.round(r.top+scrollY),Math.round(r.width),Math.round(r.height),t?t.__m||(t.__m=Math.random()):0].join()]; })));
await A.evaluate(()=>window.scrollTo(0,0)); const R0=await rect();
const cg=await center(g), cq=await center(q);
await tap(cg); await W(1700); await tap(cq); await W(1700);
ok('waiting → running (tap): the row reads "Tap at 200m" with its target', /Rep 1\/4 · 200m · target 0:40/.test(await A.evaluate(id=>MSApp.rowState(id).rep,g)), await A.evaluate(id=>MSApp.rowState(id).rep,g));
await tap(cg); await W(400);
const rs=await A.evaluate(id=>MSApp.rowState(id),g);
ok('a lap at the line: rest, "Tap when they go", a resting pill with the countdown', rs.act==='gonow'&&rs.pill==='rest'&&/^resting 0:\d\d$/.test(rs.ptx)&&(/Tap when they go/.test(rs.st)||/200m ·/.test(rs.st)), JSON.stringify(rs));
await B.evaluate(id=>MSApp.tapRow(id),q); await W(1500); // another coach's lap on the other row
await W(1200); await tap(cg); await W(400);
ok('tap during rest: the next rep starts now', (await A.evaluate(id=>MSApp.rowState(id),g)).act==='split'&&/Rep 2\/4/.test((await A.evaluate(id=>MSApp.rowState(id),g)).rep));
await W(1700); await tap(cg); await W(400); await A.evaluate(id=>MSApp.sendRunner(id,'r0'),g); await W(1500); // a split during the second rest
const R1=await rect(), moved=Object.keys(R0).filter(id=>R1[id]&&R0[id]!==R1[id]);
ok('no row moved, resized or was replaced; the split-off row went at the end', !moved.length&&Object.keys(R1).length===Object.keys(R0).length+1&&await A.evaluate(()=>{ const L=[...document.querySelectorAll('#grid .watch[data-id]')]; return MSApp.watchMeta(L[L.length-1].dataset.id).from!=null; }), moved.map(id=>R0[id]+' → '+R1[id]).join(' | '));

console.log('5. two coaches');
const ids2=[await A.evaluate(()=>MSApp.addWatch('Pair 1',null)),await A.evaluate(()=>MSApp.addWatch('Pair 2',null))]; await W(2500);
for(const id of ids2){ await A.evaluate(id=>MSApp.tapRow(id),id); } await W(2500);
await A.evaluate(id=>MSApp.tapRow(id),ids2[0]); await B.evaluate(id=>MSApp.tapRow(id),ids2[1]); await W(2500);
ok('different rows: one lap each, on both phones', (await A.evaluate(ids=>ids.map(id=>MSApp.lapCount(id)),ids2)).join()==='1,1'&&await waitFor(B,ids=>ids.every(id=>MSApp.lapCount(id)===1),ids2,8000));
await A.evaluate(id=>MSApp.tapRow(id),ids2[0]); await W(400); await B.evaluate(id=>MSApp.tapRow(id),ids2[0]); await W(3000);
ok('the same row within 2 s: one lap on both phones (the earlier tap counts)', (await A.evaluate(id=>MSApp.lapCount(id),ids2[0]))===2&&await waitFor(B,id=>MSApp.lapCount(id)===2,ids2[0],8000), (await A.evaluate(id=>MSApp.lapCount(id),ids2[0]))+' / '+(await B.evaluate(id=>MSApp.lapCount(id),ids2[0])));
ok('no page errors', !errs.length, errs.slice(0,3).join(' | '));
console.log(`  (tap rate in bursts: ${rate.toFixed(1)} a second overall, 50 ms apart within a burst)`);
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
