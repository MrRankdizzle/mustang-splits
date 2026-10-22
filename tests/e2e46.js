// 3.17: the Stopwatches screen rebuilt around one labeled action button per row. iPhone size (390 × 844), fake names.
// 1. Nothing is clipped: in every row state (waiting, running, due, late past target, resting, stopped, done, a split-off,
//    a long runner name, a long mark, Undo showing, Edit mode, a swiped row), at the default iOS text size, a smaller one and
//    larger ones (14, 17, 21, 23, 28 px; 3.16 cut the bottom of the time's digits in two columns at 14 px), regular and Compact rows, in WebKit (Safari's engine) and Chrome: no text element is
//    larger than what it shows (scroll size > visible size) and no glyph's ink is outside its line box or any clipping
//    box. The time is checked twice (different digits). Every row has the same height (72 pt or more; Compact ~56).
// 2. The row's parts: the action button is a third of the row and full height, labeled Start / Lap / Go now / Done /
//    Stopped; Undo is at the left of the status line, far from the button, for 6 s; the row's sheet has the laps,
//    Undo, Stop and Remove; swipe left: Stop (with Undo) and Remove (with Undo, the row keeps its place and height).
// 3. The runner picker (+): Girls / Boys with Select all, search, One per runner / One group, Start N / Add without
//    starting, named stopwatches and groups, "Same runners as last time", Quick stopwatch, Assign a runner.
const TS=require('./tools/tilestates.js'), {chromium}=require('playwright-core');
const CHROME=process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const {W}=TS; let bad=0; const DUE=[];
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
// Every text problem inside root: an element that clips (overflow not visible) or holds text itself, with content larger
// than its box (text spilling out counts even when nothing clips it), or a
// text node whose glyph ink (canvas metrics at the element's font, placed on the text's own baseline) leaves its line
// box (the nearest block box) or any clipping ancestor.
const PROBLEMS=`window.__textProblems=function(sel){ const out=[], c=document.createElement('canvas').getContext('2d'), T=0.75;
  const vis=e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'; };
  const clips=s=>/hidden|clip/.test(s.overflowX+' '+s.overflowY);
  const label=e=>{ const w=e.closest('.watch'); return (w?(w.querySelector('.w-nm')||{}).textContent+' ':'')+e.tagName.toLowerCase()+'.'+String(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className).split(' ')[0]; };
  document.querySelectorAll(sel).forEach(root=>{ [root,...root.querySelectorAll('*')].forEach(e=>{ if(!vis(e)||e.closest('svg')&&e.tagName!=='svg') return; const s=getComputedStyle(e);
    const own=[...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());
    if(own.length&&!clips(s)&&e.clientWidth>0&&!/^inline$/.test(s.display)){ const bx=e.getBoundingClientRect(); own.forEach(n=>{ /* up and down: the glyph ink check below (a text rectangle is the font's full height, taller than a tight line) */ const rg=document.createRange(); rg.selectNodeContents(n); [...rg.getClientRects()].forEach(r=>{ if(r.width&&(r.left<bx.left-1||r.right>bx.right+1)) out.push(label(e)+' text spills out of its box sideways ('+n.textContent.trim().slice(0,30)+')'); }); }); }
    if(clips(s)){ if(e.scrollWidth>e.clientWidth+1) out.push(label(e)+' wider than its box ('+e.scrollWidth+' > '+e.clientWidth+'): '+e.textContent.trim().slice(0,40));
      if(e.scrollHeight>e.clientHeight+1) out.push(label(e)+' taller than its box ('+e.scrollHeight+' > '+e.clientHeight+'): '+e.textContent.trim().slice(0,40)); }
    [...e.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).forEach(n=>{ c.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily; const txt=n.textContent.trim(), m=c.measureText(txt);
      const rg=document.createRange(); rg.selectNodeContents(n); const rects=[...rg.getClientRects()].filter(r=>r.width>0); if(!rects.length) return;
      let blk=e; while(blk&&/^inline/.test(getComputedStyle(blk).display)&&getComputedStyle(blk).display!=='inline-block'&&getComputedStyle(blk).display!=='inline-flex') blk=blk.parentElement;
      const lb=blk.getBoundingClientRect();
      rects.forEach(r=>{ const mid=(r.top+r.bottom)/2, base=r.top+(r.height-(m.fontBoundingBoxAscent+m.fontBoundingBoxDescent))/2+m.fontBoundingBoxAscent, ink={t:base-m.actualBoundingBoxAscent,b:base+m.actualBoundingBoxDescent,l:r.left,r:r.right};
        if(rects.length===1&&(ink.t<lb.top-T||ink.b>lb.bottom+T)) out.push(label(e)+' glyphs outside the line box ('+txt.slice(0,30)+': ink '+ink.t.toFixed(1)+'–'+ink.b.toFixed(1)+', box '+lb.top.toFixed(1)+'–'+lb.bottom.toFixed(1)+')');
        for(let a=e;a&&a!==document.body;a=a.parentElement){ const as=getComputedStyle(a); if(!clips(as)) continue; const ar=a.getBoundingClientRect(), bl=parseFloat(as.borderLeftWidth)||0, br=parseFloat(as.borderRightWidth)||0, bt=parseFloat(as.borderTopWidth)||0, bb=parseFloat(as.borderBottomWidth)||0;
          const box={l:ar.left+bl,r:ar.right-br,t:ar.top+bt,b:ar.bottom-bb};
          if(ink.l<box.l-T||ink.r>box.r+T||ink.t<box.t-T||ink.b>box.b+T){ out.push(label(e)+' cut off by '+label(a)+' ('+txt.slice(0,30)+': ink '+[ink.l,ink.r,ink.t,ink.b].map(x=>x.toFixed(1)).join(',')+' box '+[box.l,box.r,box.t,box.b].map(x=>x.toFixed(1)).join(',')+')'); break; } } }); }); }); });
  return out; };`;
const check=async(p,sel)=>{ await p.evaluate(PROBLEMS); return p.evaluate(s=>window.__textProblems(s),sel); };
(async()=>{
const engines=[['WebKit',TS.webkit,{}],['Chrome',chromium,{executablePath:CHROME}]];
console.log('1. nothing is clipped, in every row state, at five iOS text sizes, regular and Compact rows');
for(const [en,E,opt] of engines){ const b=await E.launch(opt);
  for(const compact of [false,true]) for(const text of [14,17,21,23,28]){
    const p=await TS.open(b,{compact,text}); const T=await TS.build(p); await W(200);
    const ks=await p.evaluate(()=>[...new Set([...document.querySelectorAll('#grid .watch.wr2')].map(n=>n.dataset.k))].sort().join(','));
    const pr=[...await check(p,'#grid .watch.wr2, #watchBar')]; await W(1300); pr.push(...await check(p,'#grid .watch.wr2'));
    const hs=await p.evaluate(()=>[...new Set([...document.querySelectorAll('#grid .watch.wr2')].map(n=>n.offsetHeight))]);
    // a swiped row and Edit mode
    await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`); n.classList.add('sw-open'); n.querySelector('.sw-front').style.transform=`translateX(-${n.querySelector('.sw-trail').offsetWidth}px)`; },T.running); await W(150);
    pr.push(...await check(p,`.watch[data-id="${T.running}"] .sw-trail`)); // the row itself slid out of view on purpose
    await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`); n.classList.remove('sw-open'); n.querySelector('.sw-front').style.transform=''; },T.running);
    await TS.editMode(p,[T.rest,T.mile]); pr.push(...await check(p,'#grid .watch.wr2'));
    if(ks.includes('due')) DUE.push(en+text);
    const tag=`${en}, ${compact?'Compact rows':'regular rows'}, ${text} px`;
    ok(`${tag}: no text cut off or larger than its box (states ${ks})`, !pr.length&&['done','idle','late','paused','rest','run'].every(k=>ks.includes(k)), pr.slice(0,4).join(' | '));
    ok(`${tag}: every row the same height (${hs.join(', ')} px)`, hs.length===1&&(compact?hs[0]>=52&&(text>17||hs[0]<=64):hs[0]>=72));
    if(p.errs.length) ok(`${tag}: no page errors`,false,p.errs.join(' | '));
    await p.context().close(); }
  await b.close(); }

ok(`the due state was checked too (${DUE.length} of 20 runs)`, DUE.length>=10);
console.log('2. the action button, Undo, the row sheet, swipe');
{ const b=await TS.webkit.launch(); const p=await TS.open(b,{}); const T=await TS.build(p); await W(300);
  const geo=await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`), r=n.getBoundingClientRect(), a=n.querySelector('.w-act').getBoundingClientRect(), u=n.querySelector('.w-ul').getBoundingClientRect(); return {rw:r.width,rh:r.height,aw:a.width,ah:a.height,gap:a.left-u.right,ux:u.left-r.left,uOn:!n.querySelector('.w-ul').hidden}; },T.running);
  ok('the action button is about a third of the row and full height', Math.abs(geo.aw/geo.rw-1/3)<0.03&&Math.abs(geo.ah-geo.rh)<=2, `${geo.aw.toFixed(0)}/${geo.rw.toFixed(0)} wide, ${geo.ah.toFixed(0)}/${geo.rh.toFixed(0)} tall`);
  ok('Undo shows at the left of the status line, far from the action button', geo.uOn&&geo.ux<30&&geo.gap>120, `left ${geo.ux.toFixed(0)} px, ${geo.gap.toFixed(0)} px from the button`);
  const labels=await p.evaluate(T=>Object.fromEntries(Object.entries(T).filter(([k,v])=>v).map(([k,id])=>[k,MSApp.rowState(id).label])),T);
  ok('labels say what the button does', labels.waiting==='Start'&&labels.running==='Lap'&&labels.rest==='Go now'&&labels.finished==='Done'&&labels.stopped==='Stopped', JSON.stringify(labels));
  const n0=await p.evaluate(id=>MSApp.lapCount(id),T.group); await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-act`).click(),T.group); await W(200);
  const u1=await p.evaluate(id=>MSApp.rowState(id),T.group);
  ok('Lap records a lap; Undo shows with it', await p.evaluate(id=>MSApp.lapCount(id),T.group)===n0+1&&u1.undo, u1.st);
  await W(6300); ok('Undo is gone after 6 s', !(await p.evaluate(id=>MSApp.rowState(id).undo,T.group)));
  await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-act`).click(),T.group); await W(200);
  await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-ul`).click(),T.group); await W(200);
  ok('the Undo link takes the lap back', await p.evaluate(id=>MSApp.lapCount(id),T.group)===n0+1);
  const fd=await p.evaluate(id=>{ const d=MSApp.lapCount(id); document.querySelector(`.watch[data-id="${id}"] .w-act`).click(); return [d,MSApp.lapCount(id)]; },T.finished);
  ok('Done records nothing', fd[0]===fd[1]);
  await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-main`).click(),T.group); await W(400);
  const sh=await p.evaluate(()=>({items:[...document.querySelectorAll('#modal [data-m]')].map(b=>b.dataset.m),rows:document.querySelectorAll('#modal .lap-sheet tbody tr:not(.rep-row)').length,title:(document.querySelector('#modal h2')||{}).textContent}));
  ok('tapping the rest of the row opens its sheet: laps, Undo, Stop, Split, Remove', sh.title==='Group 2'&&['undo','stop','splitr','rename','del'].every(k=>sh.items.includes(k))&&sh.rows===n0+1, JSON.stringify(sh));
  await p.evaluate(()=>document.querySelector('#modal [data-x=no]').click()); await W(300);
  // swipe left on a running row (mouse drag: the swipe works with any pointer), then Stop, Undo; swipe, Remove, Undo
  const swipe=async id=>{ await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"]`).scrollIntoView({block:'center'}),id); await W(300); const r=await p.evaluate(id=>{ const x=document.querySelector(`.watch[data-id="${id}"] .w-info`).getBoundingClientRect(); return [x.left+x.width*0.6,x.top+x.height/2]; },id);
    await p.mouse.move(r[0],r[1]); await p.mouse.down(); for(let k=1;k<=10;k++){ await p.mouse.move(r[0]-k*20,r[1]); await W(16); } await p.mouse.up(); await W(400); };
  const lapsBefore=await p.evaluate(id=>MSApp.lapCount(id),T.group);
  await swipe(T.group); const open=await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`); return {open:n.classList.contains('sw-open'),stop:!n.querySelector('[data-sw=stop]').hidden}; },T.group);
  ok('a sideways swipe shows Stop and Remove and records nothing', open.open&&open.stop&&await p.evaluate(id=>MSApp.lapCount(id),T.group)===lapsBefore);
  const t0=await p.evaluate(id=>MSApp.watchMeta(id).elapsed,T.group);
  await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-sw=stop]`).click(),T.group); await W(300);
  const st=await p.evaluate(id=>({s:MSApp.watchMeta(id).status,u:MSApp.rowState(id)}),T.group);
  ok('Stop stops it, with Undo in the status line', st.s==='paused'&&st.u.undo&&/Stopped/.test(st.u.st), JSON.stringify(st.u));
  await W(1200); await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] .w-ul`).click(),T.group); await W(200);
  const t1=await p.evaluate(id=>({s:MSApp.watchMeta(id).status,e:MSApp.watchMeta(id).elapsed}),T.group);
  ok('Undo of Stop: running again as if it never stopped', t1.s==='running'&&t1.e>=t0+1400, `${t0} → ${t1.e} ms`);
  const h0=await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"]`).offsetHeight,T.late);
  await swipe(T.late); await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-sw=del]`).click(),T.late); await W(300);
  const gone=await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"]`); return {g:n&&n.classList.contains('gone'),h:n&&n.offsetHeight,txt:n&&n.textContent}; },T.late);
  ok('Remove leaves "Removed … · Undo" in the row’s place, at its height', gone.g&&Math.abs(gone.h-h0)<=1&&/Removed/.test(gone.txt), JSON.stringify(gone));
  await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-gone]`).click(),T.late); await W(300);
  ok('Undo brings it back', await p.evaluate(id=>!!MSApp.watchMeta(id)&&!!document.querySelector(`.watch.wr2[data-id="${id}"]`),T.late));
  if(p.errs.length) ok('no page errors',false,p.errs.join(' | '));
  await b.close(); }

console.log('3. the runner picker');
{ const b=await TS.webkit.launch(); const p=await TS.open(b,{}); const ev=(f,...a)=>p.evaluate(f,...a);
  const pick=async name=>{ await ev(n=>[...document.querySelectorAll('#modal .rp-row')].find(b=>b.querySelector('.rp-nm').firstChild.textContent===n).click(),name); await W(120); };
  await ev(()=>document.querySelector('[data-pick]').click()); await W(400);
  const s0=await ev(()=>({secs:[...document.querySelectorAll('#modal .rp-sh h3')].map(h=>h.textContent),all:document.querySelectorAll('#modal .rp-all').length,q:!!document.querySelector('#rpQ'),quick:!!document.querySelector('#modal [data-new=quick]'),start:document.querySelector('#modal [data-x=start]').disabled}));
  ok('the empty tab opens the picker: Girls and Boys with Select all, search, Quick stopwatch; Start is off until runners are picked', s0.secs.join()==='Girls,Boys'&&s0.all===2&&s0.q&&s0.quick&&s0.start, JSON.stringify(s0));
  
  const pr0=await check(p,'#modal'); ok('the picker: no text cut off', !pr0.length, pr0.slice(0,3).join(' | '));
  await ev(()=>document.querySelector('#modal .rp-all').click()); await W(150);
  const g=await ev(()=>({n:document.querySelectorAll('#modal .rp-row[aria-pressed=true]').length,lbl:document.querySelector('#modal [data-x=start]').textContent}));
  ok('Select all (Girls) picks the girls: Start 4 stopwatches', g.n===4&&g.lbl==='Start 4 stopwatches', JSON.stringify(g));
  await ev(()=>document.querySelector('#modal .rp-all').click()); await W(150);
  await ev(()=>{ const i=document.querySelector('#rpQ'); i.value='rosen'; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(150);
  const sr=await ev(()=>[...document.querySelectorAll('#modal .rp-row .rp-nm')].map(x=>x.firstChild.textContent));
  ok('search narrows the list', sr.length===1&&sr[0]==='Aubree Rosenkranz', sr.join(', '));
  await ev(()=>{ const i=document.querySelector('#rpQ'); i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); }); await W(150);
  await pick('Jo Park'); await pick('Gavyn Brinkerhoff'); await pick('Ivy Delacroix-Moss');
  await ev(()=>document.querySelector('#modal [data-mode=group]').click()); await W(150);
  ok('One group: Start 1 stopwatch', await ev(()=>document.querySelector('#modal [data-x=start]').textContent)==='Start 1 stopwatch');
  const pr1=await check(p,'#modal'); ok('the picker with runners picked: no text cut off or spilling out', !pr1.length, pr1.slice(0,3).join(' | '));
  await ev(()=>document.querySelector('#modal [data-x=start]').click()); await W(500);
  let L=await ev(()=>[...document.querySelectorAll('#grid .watch.wr2')].map(n=>({id:n.dataset.id,...MSApp.rowState(n.dataset.id),...MSApp.watchMeta(n.dataset.id)})));
  ok('One group makes "Group 1" with its 3 runners, started, a mixed colour bar', L.length===1&&L[0].name==='Group 1'&&L[0].ids.length===3&&L[0].status==='running'&&L[0].bar==='GB', JSON.stringify(L.map(x=>[x.name,x.ids,x.status,x.bar])));
  await ev(()=>document.querySelector('#newBtn').click()); await W(400);
  const last=await ev(()=>(document.querySelector('#modal [data-x=last]')||{}).textContent||'');
  ok('+ again: no “Same runners” while they’re all on a stopwatch', last==='');
  await pick('Aubree Rosenkranz'); await pick('Benedikt Toepfer-Lindqvist');
  await ev(()=>document.querySelector('#modal [data-mode=each]').click()); await W(120);
  await ev(()=>document.querySelector('#modal [data-x=add]').click()); await W(500);
  L=await ev(()=>[...document.querySelectorAll('#grid .watch.wr2')].map(n=>({...MSApp.rowState(n.dataset.id),...MSApp.watchMeta(n.dataset.id)})));
  ok('One per runner + Add without starting: two waiting stopwatches named after their runners', L.length===3&&L[1].name==='Aubree Rosenkranz'&&L[2].name==='Benedikt Toepfer-Lindqvist'&&L[1].status==='idle'&&L[2].status==='idle'&&L[1].bar==='G'&&L[2].bar==='G', JSON.stringify(L.map(x=>[x.name,x.status,x.bar])));
  await ev(()=>document.querySelector('#editW').click()); await W(150); await ev(()=>document.querySelector('#edAll').click()); await ev(()=>document.querySelector('#edRemove').click()); await W(2200);
  await ev(()=>document.querySelector('#newBtn')&&!document.querySelector('#newBtn').hidden?document.querySelector('#newBtn').click():document.querySelector('[data-pick]').click()); await W(400);
  const last2=await ev(()=>(document.querySelector('#modal [data-x=last]')||{}).textContent||'');
  ok('“Same runners as last time” offers the last selection', last2==='Same runners as last time (2)', last2);
  await ev(()=>document.querySelector('#modal [data-x=last]').click()); await W(150);
  const re=await ev(()=>({n:document.querySelectorAll('#modal .rp-row[aria-pressed=true]').length,lbl:document.querySelector('#modal [data-x=start]').textContent}));
  ok('… and picks them again (with One per runner)', re.n===2&&re.lbl==='Start 2 stopwatches', JSON.stringify(re));
  await ev(()=>document.querySelector('#modal [data-new=quick]').click()); await W(600);
  L=await ev(()=>[...document.querySelectorAll('#grid .watch.wr2')].map(n=>({id:n.dataset.id,...MSApp.watchMeta(n.dataset.id)})));
  const q=L[L.length-1]; ok('Quick stopwatch (no runner): "Stopwatch 1", timing', q&&q.name==='Stopwatch 1'&&q.status==='running'&&!q.ids.length, JSON.stringify(q));
  await ev(id=>document.querySelector(`.watch[data-id="${id}"] .w-main`).click(),q.id); await W(400);
  ok('its sheet offers Assign a runner', await ev(()=>!!document.querySelector('#modal [data-m=members]')&&/Assign a runner/.test(document.querySelector('#modal [data-m=members]').textContent)));
  await ev(()=>document.querySelector('#modal [data-m=members]').click()); await W(400);
  await ev(()=>[...document.querySelectorAll('#modal [data-a]')].find(b=>/Jo Park/.test(b.textContent)).click()); await ev(()=>document.querySelector('#modal [data-x=save]').click()); await W(300);
  const q2=await ev(id=>({...MSApp.rowState(id),...MSApp.watchMeta(id)}),q.id);
  ok('assigning a runner names it and keeps it timing', q2.name==='Jo Park'&&q2.ids.join()==='r7'&&q2.status==='running'&&q2.bar==='G', JSON.stringify([q2.name,q2.ids,q2.status,q2.bar]));
  if(p.errs.length) ok('no page errors',false,p.errs.join(' | '));
  await b.close(); }
console.log(bad?`\n${bad} FAILED`:'\nALL PASSED'); process.exit(bad?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
