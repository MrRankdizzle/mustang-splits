// Screenshots of the Data > Team charts with the fake team, at upright phone width, light and dark.
// node tools/shots212.js [label] [url]   e.g. node tools/shots212.js before http://localhost:8766/
// Writes tests/screenshots/team-<label>-<chart>-<light|dark>.png. Every name is made up.
const puppeteer=require('puppeteer-core'), path=require('path'), T=require('./fake-team.js');
const label=process.argv[2]||'after', url=process.argv[3]||'http://localhost:8765/', OUT=path.join(__dirname,'..','screenshots');
(async()=>{
  const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
  for(const dark of [false,true]){
    const P=await T.open(b,{url,dark}); await T.load(P); await T.teamView(P);
    // each chart's figure, with its heading
    const figs=await P.evaluate(()=>[...document.querySelectorAll('#rvTeam h3')].map((h,i)=>{ h.dataset.shot=i; return h.textContent.trim(); }));
    const want={ladder:/ladder/i,top5:/Top-5/i,packG:/Girls pack/i,packB:/Boys pack/i};
    for(const [k,re] of Object.entries(want)){ const i=figs.findIndex(t=>re.test(t)); if(i<0){ console.log('no',k); continue; }
      const box=await P.evaluate(i=>{ const h=document.querySelector(`#rvTeam h3[data-shot="${i}"]`); let end=h.nextElementSibling; const els=[h]; while(end&&end.tagName!=='H3'){ els.push(end); end=end.nextElementSibling; }
        h.scrollIntoView(); const r=els.map(e=>e.getBoundingClientRect()), top=Math.min(...r.map(x=>x.top)), bot=Math.max(...r.map(x=>x.bottom)); return {x:0,y:top+window.scrollY,width:document.documentElement.clientWidth,height:Math.min(1600,bot-top)}; },i);
      await P.screenshot({path:path.join(OUT,`team-${label}-${k}-${dark?'dark':'light'}.png`),clip:box,captureBeyondViewport:true}); }
    if(P.errs.length) console.log('page errors',P.errs);
    await P.close();
  }
  await b.close(); console.log('screenshots in',OUT);
})();
