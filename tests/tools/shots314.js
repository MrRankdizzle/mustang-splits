// 3.14 screenshots (fake names only): Team training paces on the Training tab at phone size (390 × 844 pt, 2×), light
// and dark, plus a large text size.
//   node tools/shots314.js <before|after> [url]   →   docs/screenshots-paces/<label>-*.png
// "before" runs against the 3.13.0 code (serve the before-3.14.0 tag); it shows the old table, also scrolled sideways.
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js'), {seed}=require('./fake-season.js');
const label=process.argv[2]||'after', URL=process.argv[3]||'http://localhost:8765/';
const OUT=path.join(__dirname,'..','..','docs','screenshots-paces'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
// a longer (made-up) name and a runner with no race yet ("Needs a race")
const sd=JSON.parse(JSON.stringify(seed)); sd.roster.forEach(a=>{ if(a.id==='g4') a.name='Evangeline Nash-Whitaker'; }); sd.roster.push({id:'b9',name:'Gus Hale',group:'',gender:'B'});
const shotPaces=async(P,file)=>{ const box=await P.evaluate(()=>{ const s=document.querySelector('#wkPaces'); s.scrollIntoView(); const r=s.getBoundingClientRect(); return {x:0,y:Math.max(0,r.top+window.scrollY-8),width:390,height:Math.min(r.height+16,3200)}; });
  await P.screenshot({path:path.join(OUT,file),clip:box,captureBeyondViewport:true}); };
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
for(const dark of [false,true]){ const tag=dark?'dark':'light';
  const P=await T.open(b,{seed:sd,url:URL,now:'2026-10-05T16:00:00',dark,flat:false}); const ev=(f,...a)=>P.evaluate(f,...a);
  await ev(()=>document.querySelector('.tab[data-tab=workouts]').click()); await W(900);
  const isNew=await ev(()=>!!document.querySelector('#wkPaces [data-tpd], #wkPaces #tpDBtn'));
  if(!isNew){
    await shotPaces(P,`${label}-paces-${tag}.png`);
    await ev(()=>{ const w=document.querySelector('#wkPaces .tp-wrap'); if(w) w.scrollLeft=w.scrollWidth; }); await W(300);
    await shotPaces(P,`${label}-paces-scrolled-${tag}.png`);
  } else {
    const pick=async(d,e)=>{ await require('../lib.js').tpPick(P,d,e); await W(400); }; // 3.16: through the menus
    await pick('800','cv'); await shotPaces(P,`${label}-paces-${tag}.png`);
    await pick('mile','easy'); await shotPaces(P,`${label}-paces-easy-mile-${tag}.png`);
    await pick('t180','threshold'); await shotPaces(P,`${label}-paces-3min-threshold-${tag}.png`);
    await pick('800','cv');
    await ev(()=>document.querySelector('#wkPaces [data-tpr="g0"]').click()); await W(500);
    await P.screenshot({path:path.join(OUT,`${label}-runner-sheet-${tag}.png`)});
    await ev(()=>{ document.querySelector('#overlay').hidden=true; });
  }
  if(!dark){ await P.addStyleTag({content:'html{font-size:24px!important}'}); await W(500); await shotPaces(P,`${label}-paces-large-text-${tag}.png`); }
  if(P.errs.length) console.log('page errors:',P.errs.join(' | '));
  await P.browserContext().close();
}
await b.close(); console.log('saved to',OUT);
})().catch(e=>{ console.error(e); process.exit(1); });
