// 3.16 screenshots (fake names only): Team training paces with the Distance / Effort menus, Start workout, and the
// runners step, at phone size (390 × 844 pt, 2×), light and dark, plus a large text size.
//   node tools/shots316.js <before|after> [url]   →   docs/screenshots-3.16/<label>-*.png
// "before" runs against the 3.15.0 code (serve the before-3.16.0 tag): the two chip rows that scrolled sideways.
// The Shared workouts section needs two team phones: tests/e2e45.js saves it (out/shots/e2e45-shared-*.png).
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js'), {seed}=require('./fake-season.js'), lib=require('../lib.js');
const label=process.argv[2]||'after', URL=process.argv[3]||'http://localhost:8765/';
const OUT=path.join(__dirname,'..','..','docs','screenshots-3.16'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
const shotPaces=async(P,file,h=1400)=>{ const box=await P.evaluate(h=>{ const s=document.querySelector('#wkPaces'); s.scrollIntoView(); const r=s.getBoundingClientRect(); return {x:0,y:Math.max(0,r.top+window.scrollY-8),width:390,height:Math.min(r.height+16,h)}; },h);
  await P.screenshot({path:path.join(OUT,file),clip:box,captureBeyondViewport:true}); };
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
for(const dark of [false,true]){ const tag=dark?'dark':'light';
  const P=await T.open(b,{seed,url:URL,now:'2026-10-05T16:00:00',dark,flat:false}); const ev=(f,...a)=>P.evaluate(f,...a);
  await ev(()=>document.querySelector('.tab[data-tab=workouts]').click()); await W(900);
  if(!(await ev(()=>!!document.querySelector('#tpDBtn')))){ // 3.15: chip rows
    await ev(()=>{ document.querySelector('#wkPaces [data-tpd="800"]').click(); document.querySelector('#wkPaces [data-tpe="cv"]').click(); }); await W(400);
    await shotPaces(P,`${label}-paces-${tag}.png`,700);
  } else {
    await lib.tpPick(P,'800','cv'); await W(400); await shotPaces(P,`${label}-paces-${tag}.png`,700);
    for(const [id,nm] of [['#tpDBtn','distance'],['#tpEBtn','effort']]){ await ev(()=>{ document.querySelector('#wkPaces').scrollIntoView(); window.scrollBy(0,-60); }); await W(400); await ev(id=>document.querySelector(id).click(),id); await W(400);
      await P.screenshot({path:path.join(OUT,`${label}-menu-${nm}-${tag}.png`)}); await ev(id=>document.querySelector(id).click(),id); await W(200); }
    await ev(()=>document.querySelector('#tpStart').click()); await W(600); await P.screenshot({path:path.join(OUT,`${label}-start-sheet-${tag}.png`)});
    await ev(()=>document.querySelector('[data-wk-rk=jog]').click()); await W(300); await P.screenshot({path:path.join(OUT,`${label}-start-sheet-jog-${tag}.png`)});
    await ev(()=>document.querySelector('[data-wk-rk=time]').click()); await ev(()=>document.querySelector('#modal [data-x=go]').click()); await W(600);
    await ev(()=>document.querySelector('#modal [data-pk=all]').click()); await W(200); await ev(()=>document.querySelector('#modal [data-x=next]').click()); await W(600);
    await P.screenshot({path:path.join(OUT,`${label}-groups-${tag}.png`)});
    await ev(()=>document.querySelector('#modal [data-x=startnow]').click()); await W(1200);
    await ev(()=>{ document.querySelector('.tab[data-tab=watches]').click(); window.scrollTo(0,0); }); await W(600);
    await P.screenshot({path:path.join(OUT,`${label}-stopwatches-${tag}.png`)});
    await ev(()=>document.querySelector('.tab[data-tab=workouts]').click()); await W(600);
  }
  if(!dark){ await P.addStyleTag({content:'html{font-size:24px!important}'}); await W(500); await shotPaces(P,`${label}-paces-large-text-${tag}.png`,900); }
  if(P.errs&&P.errs.length) console.log('page errors:',P.errs.join(' | '));
  await P.browserContext().close();
}
await b.close(); console.log('saved to',OUT);
})().catch(e=>{ console.error(e); process.exit(1); });
