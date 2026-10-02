const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||300));
for(const dark of [false,true]){ const tag=dark?'dark':'light';
const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.evaluateOnNewDocument(()=>{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:dark?'dark':'light'}]);
await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue());
await p.goto('http://localhost:8765/'); await W(800);
await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',t=>t.value='Maya Lopez, Varsity\nJonah Kim, Varsity\nSam Ortiz, JV'); await p.click('[data-x=yes]'); await W();
const maya=await p.evaluate(()=>MSApp.getRoster()[0].id);
await p.click(`.ath[data-id="${maya}"] [data-t=prs]`); await W(); await p.click('[data-prt="5000"]'); await p.keyboard.type('1901'); await W(); await p.screenshot({path:`shots/prs-${tag}.png`}); await p.click('[data-x=done]'); await W();
await p.click('.tab[data-tab=watches]'); await W(); await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); await p.click('[data-rg="0"]'); await W(); await p.click('[data-rg="1"]'); await W();
await p.select('[data-goalsrc]','pr'); await W(400);
await p.$eval('.cp-ed',e=>e.scrollIntoView({block:'start'})); await W(); await p.screenshot({path:`shots/setup25-${tag}.png`});
await p.click('[data-ra=gun]'); await W(500);
await p.evaluate(()=>{ const r=MSApp.getRace(); const L=[['Maya',0,360],['Maya',1,732],['Maya',2,1120],['Jonah',0,370],['Jonah',1,742],['Sam',0,400],['Sam',2,1300]];
  MSApp.applyRemote({athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},marks:{upsert:L.map(([n,ci,t],i)=>({id:'m'+i,cp:r.checkpoints[ci].id,local:r.gun.local+t*1000,off:null,runnerId:r.runners.find(x=>x.name.startsWith(n)).id,by:'x',byName:'Coach Jen'})),remove:[]}}); });
await W(400); await p.$eval('#raceRes',e=>e.scrollIntoView({block:'start'})); await W(); await p.screenshot({path:`shots/cards-${tag}.png`});
await p.setViewport({width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true}); await W(400); await p.$eval('#raceRes',e=>e.scrollIntoView({block:'start'})); await W(); await p.screenshot({path:`shots/table-${tag}.png`});
await ctx.close(); }
await b.close();
})();
