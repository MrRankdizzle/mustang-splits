// 3.6.1: nothing clipped or overlapping on stopwatch tiles, in WebKit (Safari's engine) at iPhone size. Every tile
// state (waiting, running with laps and Undo, a group resting with its names, stopped, finished, a split-off, a running
// group with long names), Edit mode with two selected, both layouts, at iOS text sizes 17 px (the default), 19, 21 and
// 23. For each tile: no element outside the tile or cut by a row, no two elements overlapping, buttons and times never
// cut short (only names and messages end in an ellipsis), touch targets at least 44 pt, every tile the same size, the
// face showing the stopwatch's real state; in Edit mode the toolbar replaces the tab bar and the last tile scrolls
// fully above it. Fake names.
const S=require('./tools/tilestates.js');
(async()=>{
const b=await S.webkit.launch(); let bad=0; const errs=[];
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const audit=p=>p.evaluate(()=>{ const out=[], names={};
  const tiles=[...document.querySelectorAll('#grid .watch[data-id]')].filter(n=>n.offsetParent);
  const sel='.w-sel,.w-name,.more-btn,.w-meta>*,.big,.sub,.w-status>*,.w-laps,.w-laps .lr>*,.w-laps>span,.w-laps .more,.send-nm,.controls>*';
  const vis=e=>{ if(e.closest('[hidden]')) return false; const cs=getComputedStyle(e); if(cs.display==='none'||cs.visibility==='hidden') return false; const r=e.getBoundingClientRect(); return r.width>0.5&&r.height>0.5; };
  const whole='.big,.controls .btn,.send-nm,.more-btn,.w-status .btn,.lr-t,.lr-d,.big-status,.w-laps .more';
  tiles.forEach(t=>{ const T=t.getBoundingClientRect(), nm=(t.querySelector('.w-name')||{}).textContent||t.dataset.id;
    const els=[...t.querySelectorAll(sel)].filter(vis), lab=e=>`${nm.slice(0,14)}: ${(e.className||e.tagName).toString().split(' ')[0]} “${(e.textContent||'').trim().slice(0,16)}”`;
    els.forEach(e=>{ const r=e.getBoundingClientRect(), inScroll=!!e.closest('.w-send')&&!e.classList.contains('w-send');
      if(r.top<T.top-0.5||r.bottom>T.bottom+0.5||(!inScroll&&(r.left<T.left-0.5||r.right>T.right+0.5))) out.push(lab(e)+' is outside its tile');
      let scrolled=false; for(let a=e.parentElement;a&&a!==t.parentElement;a=a.parentElement){ const cs=getComputedStyle(a); if(cs.overflowX==='auto'||cs.overflowX==='scroll') scrolled=true; if(cs.overflowX==='visible'&&cs.overflowY==='visible') continue; const A=a.getBoundingClientRect(), sx=scrolled; // inside a sideways scroller, only up and down count
        if(r.top<A.top-0.5||r.bottom>A.bottom+0.5||(!sx&&(r.left<A.left-0.5||r.right>A.right+0.5))){ out.push(lab(e)+' is cut off by '+(a.className||a.tagName).toString().split(' ').slice(0,2).join('.')); break; } }
      if(e.matches(whole)){ const inner=e.querySelector('.bl')||e; if(inner.scrollWidth>inner.clientWidth+1&&!(e.matches('.w-status .undo-lbl'))) out.push(lab(e)+' is cut short ('+inner.scrollWidth+' > '+inner.clientWidth+')'); }
      if(!e.matches(whole)&&!e.querySelector('*:not(br)')&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).textOverflow!=='ellipsis') out.push(lab(e)+' is cut without an ellipsis');
      if(e.matches('button,.w-laps[data-act]')&&(r.height<43.5||r.width<43.5)) out.push(lab(e)+` is a ${Math.round(r.width)}×${Math.round(r.height)} target`); });
    for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ const a=els[i], c=els[j]; if(a.contains(c)||c.contains(a)) continue;
      const A=a.getBoundingClientRect(), C=c.getBoundingClientRect(), w=Math.min(A.right,C.right)-Math.max(A.left,C.left), h=Math.min(A.bottom,C.bottom)-Math.max(A.top,C.top);
      if(w>1&&h>1&&!(a.closest('.w-send')&&c.closest('.w-send'))) out.push(`${lab(a)} overlaps ${lab(c).split(': ')[1]}`); }
    if(!t.classList.contains('st-'+MSApp.watchState(t.dataset.id).status)) out.push(nm+': its face shows another state'); });
  const sizes=new Set(tiles.map(t=>{ const r=t.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height); }));
  return {out,sizes:[...sizes],n:tiles.length}; });
for(const compact of [false,true]) for(const text of [17,19,21,23]){ const L=`${compact?'compact':'regular'} ${text}px`;
  const p=await S.open(b,{compact,text}); const T=await S.build(p);
  const a=await audit(p);
  ok(`${L}: all ${a.n} tiles one size`, a.sizes.length===1, a.sizes.join(' '));
  ok(`${L}: nothing outside a tile, cut off, overlapping, cut short or under 44 pt`, !a.out.length, a.out.slice(0,6).join(' | ')+(a.out.length>6?` … (${a.out.length})`:''));
  await S.editMode(p,[T.running,T.split]);
  const e=await audit(p);
  ok(`${L}, Edit mode with two selected: the same size as before`, e.sizes.join()===a.sizes.join(), e.sizes.join(' '));
  ok(`${L}, Edit mode: the circles have their own space (nothing overlaps, nothing cut)`, !e.out.length, e.out.slice(0,6).join(' | ')+(e.out.length>6?` … (${e.out.length})`:''));
  const bar=await p.evaluate(async()=>{ window.scrollTo(0,document.documentElement.scrollHeight); await new Promise(r=>setTimeout(r,250)); const bar=document.querySelector('#editBar').getBoundingClientRect(), tb=document.querySelector('.tabbar'), last=[...document.querySelectorAll('#grid .watch[data-id]')].pop().getBoundingClientRect();
    return {tab:getComputedStyle(tb).display, gap:Math.round(bar.top-last.bottom), all:document.querySelector('#edAll').textContent, rm:document.querySelector('#edRemove').textContent, dis:document.querySelector('#edRemove').disabled}; });
  ok(`${L}, Edit mode: the toolbar replaces the tab bar and the last tile scrolls fully above it`, bar.tab==='none'&&bar.gap>=8, JSON.stringify(bar));
  ok(`${L}, Edit mode: "Select All" on the left, "Remove (2)" on the right`, /Select All/.test(bar.all)&&bar.rm==='Remove (2)'&&!bar.dis);
  if(text===17){ await p.evaluate(()=>window.scrollTo(0,0)); await p.screenshot({path:`out/e2e34-${compact?'compact':'regular'}-edit.png`}); }
  errs.push(...p.errs); await p.context().close(); }
console.log('the Remove button is off until something is selected');
{ const p=await S.open(b,{}); await p.evaluate(()=>{ MSApp.addWatch('One',null); MSApp.addWatch('Two',null); }); await S.W(400); await S.editMode(p,[]);
  const r=await p.evaluate(()=>({t:document.querySelector('#edRemove').textContent,d:document.querySelector('#edRemove').disabled,c:document.querySelector('#edCount').textContent}));
  ok('nothing selected: "Remove" is off, the middle says "Select Stopwatches"', r.t==='Remove'&&r.d&&r.c==='Select Stopwatches', JSON.stringify(r));
  errs.push(...p.errs); await p.context().close(); }
console.log('a tile always shows its real state (a lost finger-lift can’t keep it stale)');
{ const p=await S.open(b,{}); const id=await p.evaluate(()=>MSApp.addWatch('Solo',null)); await S.W(400);
  await p.evaluate(id=>document.querySelector(`.watch[data-id="${id}"] [data-act=start]`).click(),id); await S.W(300);
  // a finger goes down on the tile and iOS never reports it lifting; meanwhile the clock is stopped
  await p.evaluate(id=>{ const n=document.querySelector(`.watch[data-id="${id}"] .big`); n.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); MSApp.stopForTest(id); },id);
  await S.W(2600);
  const st=await p.evaluate(id=>({s:MSApp.watchState(id).status,face:document.querySelector(`.watch[data-id="${id}"]`).className,keep:!!document.querySelector(`.watch[data-id="${id}"] [data-act=resume]`)}),id);
  ok('within 2.5 s the face says Stopped with Keep timing, matching the clock', st.s==='paused'&&/st-paused/.test(st.face)&&st.keep, JSON.stringify(st));
  errs.push(...p.errs); await p.context().close(); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
