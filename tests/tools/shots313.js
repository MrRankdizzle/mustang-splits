// 3.13 screenshots (fake names only): Highlights, a runner's highlights detail, and Race Mode name buttons with
// PR / season-best badges, at phone size (390 × 844 pt, 2×), light and dark.
//   node tools/shots313.js <before|after> [url]   →   docs/screenshots-highlights/<label>-*.png
// "before" runs against the 3.12.0 code (serve the before-3.13.0 tag); its runner detail is the opened 3.12 card.
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js'), {seed}=require('./fake-season.js');
const label=process.argv[2]||'after', URL=process.argv[3]||'http://localhost:8765/';
const OUT=path.join(__dirname,'..','..','docs','screenshots-highlights'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
// two longer (made-up) names, so the screenshots show how a long name fits on one line
const sd=JSON.parse(JSON.stringify(seed)); sd.roster.forEach(a=>{ if(a.id==='g4') a.name='Evangeline Nash-Whitaker'; if(a.id==='b2') a.name='Calloway Reyes'; });
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
for(const dark of [false,true]){ const tag=dark?'dark':'light';
  const P=await T.open(b,{seed:sd,url:URL,now:'2026-10-05T16:00:00',dark}); const ev=(f,...a)=>P.evaluate(f,...a);
  await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(1200);
  await P.screenshot({path:path.join(OUT,`${label}-highlights-${tag}.png`),fullPage:true});
  // the runner detail: 3.13 pushes a page; 3.12 opened the card in place
  const pushed=await ev(()=>{ const r=document.querySelector('#rvHigh [data-hlr="g0"]'); if(r){ r.click(); return true; } const d=document.querySelector('#rvHigh .hlc[data-lr="g0"]'); if(d){ d.open=true; d.scrollIntoView(); } return false; }); await W(900);
  if(pushed) { await ev(()=>window.scrollTo(0,0)); await W(200); await P.screenshot({path:path.join(OUT,`${label}-runner-${tag}.png`),fullPage:true}); }
  else { const box=await ev(()=>{ const r=document.querySelector('#rvHigh .hlc[data-lr="g0"]').getBoundingClientRect(); return {x:0,y:r.top+window.scrollY-8,width:390,height:Math.min(r.height+16,1600)}; });
    await P.screenshot({path:path.join(OUT,`${label}-runner-${tag}.png`),clip:box,captureBeyondViewport:true}); }
  // Race Mode: name buttons with PR and season-best marks, 2 and 3 columns, at Mile 1 and at the Finish
  if(P.errs.length) console.log('page errors:',P.errs.join(' | '));
  await P.browserContext().close();
  // Race Mode: name buttons with PR and season-best marks, 2 and 3 columns, at Mile 1 and at the Finish (each its own
  // phone, so the column setting comes from the saved data)
  for(const cols of [2,3]){
    const NOW='2026-10-05T16:00:00', gun=Date.parse(NOW)-1250e3, R=[['Ada Fern',1200,1230],['Bea Holt',1230,1290],['Evangeline Nash-Whitaker',1260,1250],['Cora Lind',null,null],['Dot Marsh',1340,1330],['Fay Orr',1385,1380]];
    const rs=JSON.parse(JSON.stringify(sd)); rs.settings.raceCols=cols;
    rs.race={id:'rshot',name:'Mustang Invite',status:'running',createdAt:gun,gun:{local:gun,off:0,by:'x'},checkpoints:[{id:'m1',name:'Mile 1',dist:1609.344,unit:'mi'},{id:'m2',name:'Mile 2',dist:3218.69,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}],
      runners:R.map(([n,pr,sb],i)=>({id:'s'+i,name:n,group:'',pr,sb})),
      marks:[['s0','m1',380],['s1','m1',398],['s2','m1',405],['s3','m1',410],['s4','m1',440],['s0','fin',1192],['s1','fin',1251],['s2','fin',1262],['s3','fin',1300]].map(([rid,cp,t],i)=>({id:'k'+i,cp,local:gun+t*1000,off:0,runnerId:rid,by:'x',byName:'Coach Ann'})),
      goalSrc:'none',courseId:null,meetId:null,division:'GV',manualOrder:true};
    const Q=await T.open(b,{seed:rs,url:URL,now:NOW,dark}); const eq=(f,...a)=>Q.evaluate(f,...a);
    await eq(()=>{ const lb=document.querySelector('#liveBar'), bo=document.querySelector('#raceBannerOpen'); if(lb&&!lb.hidden) lb.click(); else if(bo&&bo.offsetParent) bo.click(); }); await W(1200);
    for(const at of ['m1','fin']){ await eq(at=>{ const x=document.querySelector(`[data-at="${at}"]`); if(x) x.click(); },at); await W(700);
      const box=await eq(()=>{ const g=document.querySelector('#raceGrid'); if(!g) return null; const r=g.getBoundingClientRect(); return {x:0,y:Math.max(0,r.top+window.scrollY-60),width:390,height:Math.min(r.height+70,900)}; });
      if(box) await Q.screenshot({path:path.join(OUT,`${label}-race-${cols}col-${at==='m1'?'mile1':'finish'}-${tag}.png`),clip:box,captureBeyondViewport:true}); else console.log('no race grid',cols,at); }
    if(Q.errs.length) console.log('page errors:',Q.errs.join(' | '));
    await Q.browserContext().close();
  }
}
await b.close(); console.log('saved to',OUT);
})().catch(e=>{ console.error(e); process.exit(1); });
