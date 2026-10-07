const puppeteer=require('puppeteer-core');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||300));
const p=await b.newPage(); await p.evaluateOnNewDocument(()=>{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); localStorage.setItem('mustang-splits:install-dismissed','1'); }); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue());
await p.goto('http://localhost:8765/'); await W(800);
await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',t=>t.value='Maya Lopez, V\nJonah Kim, V'); await p.click('[data-x=yes]'); await W(); await p.click('.tab[data-tab=watches]'); await W();
await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); await p.click('[data-rg="0"]'); await W(); await p.click('[data-ra=gun]'); await W(600);
await p.evaluate(()=>{ const r=MSApp.getRace(); MSApp.applyRemote({marks:{upsert:[{id:'mA',cp:r.checkpoints[0].id,local:r.gun.local+372000,off:r.gun.off,runnerId:r.runners[1].id,by:'o',byName:'Coach Jen'},{id:'mB',cp:r.checkpoints[0].id,local:r.gun.local+373500,off:r.gun.off,runnerId:r.runners[1].id,by:'o2',byName:'Coach Ben'},{id:'mM2',cp:r.checkpoints[1].id,local:r.gun.local+750000,off:r.gun.off,runnerId:r.runners[1].id,by:'o',byName:'Coach Jen'}],remove:[]}}); });
await W(); await p.evaluate(()=>document.querySelector('.race-cards [data-rc="1:0"]').click()); await W();
await p.evaluate(()=>{ const r=[...document.querySelectorAll('#modal .ts-row')][0]; r.querySelector('[data-ts=edit]').click(); }); await W();
await p.$eval('[data-tst]',i=>{ i.focus(); i.select(); }); await p.keyboard.type('6105'); await W(500);
await p.screenshot({path:require('path').join(__dirname,'..','out','shots')+'/editor.png'});
await p.click('#modal [data-x=done]'); await W(); await p.click('#raceClose'); await W();
await p.click('.tab[data-tab=team]'); await W(); await p.click('.ath [data-t=del]'); await W();
await p.click('#openSettings'); await W(); await p.click('#openDeleted'); await W(500); await p.screenshot({path:require('path').join(__dirname,'..','out','shots')+'/deleted.png'});
await b.close();
})();
