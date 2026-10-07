// 2.7.1 screenshots: Ready bar, Ready screen, Race running bar, Edit times (upright and sideways). App on :8765.
const puppeteer=require('puppeteer-core'), path=require('path'), OUT=path.join(__dirname,'..','out','shots');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||300));
const p=await b.newPage(); await p.evaluateOnNewDocument(()=>{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); });
await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue());
await p.goto('http://localhost:8765/'); await W(800);
await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',t=>t.value='Maya Lopez, V, Girls\nAva Chen, V, Girls\nZoe Park, V, Girls\nIvy Long, V, Girls'); await p.click('[data-x=yes]'); await W();
await p.click('.tab[data-tab=watches]'); await W(); await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); await p.click('[data-rg="0"]'); await W();
await p.screenshot({path:OUT+'/r1-setup-readybar.png'});
await p.click('#readyBtn'); await W(); await p.screenshot({path:OUT+'/r2-ready.png'});
await p.click('.ready-gun'); await W(600);
await p.evaluate(()=>{ const r=MSApp.getRace(); MSApp.applyRemote({marks:{upsert:r.runners.flatMap((x,i)=>r.checkpoints.map((c,ci)=>({id:'m'+i+ci,cp:c.id,local:r.gun.local+(370+i*5+ci*380)*1000,off:null,runnerId:x.id,by:'o',byName:'Coach Jen'}))),remove:[]}}); });
await W(); await p.click('#raceClose'); await W(1200); await p.screenshot({path:OUT+'/r3-livebar.png'});
await p.click('#liveBar'); await W(600); await p.evaluate(()=>{ document.querySelector('.race-res').open=true; document.querySelector('[data-ra=edittimes]').click(); }); await W();
await p.$eval('#modal .et-list [data-et]',i=>{ i.focus(); i.select(); }); await p.keyboard.type('19100'); await W(); await p.evaluate(()=>document.activeElement.blur()); await W();
await p.screenshot({path:OUT+'/r4-edittimes.png'});
await p.setViewport({width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true}); await W(600); await p.screenshot({path:OUT+'/r5-edittimes-wide.png'});
await b.close();
})();
