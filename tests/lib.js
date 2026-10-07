// Shared test helpers.
// patchClick: page.click first scrolls the element into the middle of the screen, but only when something fixed
// (the tab bar, the "Ready for the gun" bar, the "Race running" bar) covers it, like a coach scrolling a little.
// Elements in view are clicked where they are, so the "name buttons never move" checks stay meaningful.
module.exports.patchClick=p=>{
  const orig=p.click.bind(p);
  p.click=async(sel,opts)=>{
    try{ await p.$eval(sel,e=>{ const r=e.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, hit=document.elementFromPoint(x,y);
      if(!hit||!(e===hit||e.contains(hit))) e.scrollIntoView({block:'center'}); }); }catch(err){}
    return orig(sel,opts);
  };
  return p;
};

// Chart checks (2.12), run in the page: for every visible chart (figure.viz svg), no label box overlaps another label,
// a dot or a data line; no label is cut off (inside the chart, no "…"); the key lists exactly the series the chart draws
// (data-key on marks = data-key on key entries) with distinct swatches; time axes use round ticks.
// Returns a list of problems (empty = all good).
module.exports.chartProblems=p=>p.evaluate(()=>{
  const out=[], shrink=(r,d)=>({l:r.left+d,r:r.right-d,t:r.top+d,b:r.bottom-d}), hit=(a,b)=>a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
  document.querySelectorAll('figure.viz').forEach(fig=>{ const svg=fig.querySelector(':scope>svg'); if(!svg) return; const S=svg.getBoundingClientRect(); if(!S.width||!S.height) return;
    const name=svg.getAttribute('aria-label')||'chart';
    const boxes=[]; svg.querySelectorAll('text').forEach((t,ti)=>{ const parts=t.querySelectorAll('tspan'); (parts.length?[...parts]:[t]).forEach(e=>{ const r=e.getBoundingClientRect(); if(r.width&&e.textContent.trim()) boxes.push({ti,txt:e.textContent.trim(),r:shrink(r,1),raw:r}); }); });
    boxes.forEach(b=>{ if(b.raw.left<S.left-1||b.raw.right>S.right+1||b.raw.top<S.top-1||b.raw.bottom>S.bottom+1) out.push(`${name}: "${b.txt}" is cut off`); if(/…/.test(b.txt)) out.push(`${name}: "${b.txt}" is shortened`); });
    for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++) if(boxes[i].ti!==boxes[j].ti&&hit(boxes[i].r,boxes[j].r)) out.push(`${name}: "${boxes[i].txt}" overlaps "${boxes[j].txt}"`);
    svg.querySelectorAll('.dot').forEach(d=>{ const r=shrink(d.getBoundingClientRect(),0.5); boxes.forEach(b=>{ if(hit(b.r,r)) out.push(`${name}: "${b.txt}" overlaps a dot`); }); });
    const D=[...svg.querySelectorAll('.dot:not(.faint)')].map(d=>shrink(d.getBoundingClientRect(),1)); for(let i=0;i<D.length;i++) for(let j=i+1;j<D.length;j++) if(hit(D[i],D[j])) out.push(`${name}: two dots overlap`);
    const M=svg.getScreenCTM(), pt=svg.createSVGPoint(), scr=(x,y)=>{ pt.x=x; pt.y=y; const q=pt.matrixTransform(M); return [q.x,q.y]; };
    svg.querySelectorAll('path.s1,path.s2,path.s3,.slope,.spread5,.spread7,line.ref,path.thin').forEach(el=>{ const P=[];
      if(el.tagName==='line'){ const x1=+el.getAttribute('x1'),x2=+el.getAttribute('x2'),y1=+el.getAttribute('y1'),y2=+el.getAttribute('y2'); for(let k=0;k<=60;k++) P.push(scr(x1+(x2-x1)*k/60,y1+(y2-y1)*k/60)); }
      else { const L=el.getTotalLength(); for(let k=0;k<=Math.ceil(L/2);k++){ const q=el.getPointAtLength(Math.min(L,k*2)); P.push(scr(q.x,q.y)); } }
      boxes.forEach(b=>{ if(P.some(([x,y])=>x>b.r.l&&x<b.r.r&&y>b.r.t&&y<b.r.b)) out.push(`${name}: "${b.txt}" overlaps a line`); }); });
    // the key: same keys as the marks, distinct swatches
    const plotted=new Set(); svg.querySelectorAll('[data-key]').forEach(e=>e.dataset.key.split(' ').forEach(k=>plotted.add(k)));
    const pv=fig.previousElementSibling, leg=fig.querySelector('.viz-legend')||(pv&&pv.querySelector('.viz-legend.in-title')), // 3.4: a key moved into the title line
     _u=0, keys=leg?[...leg.querySelectorAll('[data-key]')].map(e=>e.dataset.key):[];
    if(plotted.size||keys.length){ const ks=new Set(keys); if(ks.size!==plotted.size||[...ks].some(k=>!plotted.has(k))) out.push(`${name}: key [${keys.join(',')}] doesn't match the plotted series [${[...plotted].join(',')}]`); }
    if(leg){ const sw=[...leg.querySelectorAll('svg.sw')].map(x=>x.innerHTML.replace(/[\d.]+/g,'#')+x.parentNode.dataset.key.replace(/./g,'')); const cls=[...leg.querySelectorAll('svg.sw')].map(x=>[...x.querySelectorAll('*')].map(e=>e.tagName+'.'+e.getAttribute('class')+(e.getAttribute('points')||'').split(' ').length).join('|'));
      if(new Set(cls).size!==cls.length) out.push(`${name}: two key entries look the same`); }
    // round ticks: every m:ss tick label on a time axis is a whole multiple of 5 seconds
    svg.querySelectorAll('text.axis').forEach(t=>{ if(t.closest('.pt')||t.classList.contains('lbl')||t.classList.contains('gap')) return; const m=t.textContent.trim().match(/^(\d+):(\d\d)$/); if(m&&(+m[2])%5) out.push(`${name}: tick "${t.textContent}" isn't round`); });
  });
  return out;
});
