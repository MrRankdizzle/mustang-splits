// 2.7 screenshots: Meets screen and race setup (meet, division, goal tags). Expects the app on :8765.
const puppeteer=require('puppeteer-core'), path=require('path'), OUT=path.join(__dirname,'..','out','shots');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||300));
const p=await b.newPage(); await p.evaluateOnNewDocument(()=>{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:install-dismissed','1');
  const off=Date.parse('2026-10-02T12:00:00')-Date.now(), R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+off); } static now(){ return R.now()+off; } } D.parse=R.parse; D.UTC=R.UTC; window.Date=D; });
await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue());
await p.goto('http://localhost:8765/'); await W(800);
await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',t=>t.value='Maya Lopez, JV, Girls\nAva Chen, JV, Girls\nJonah Kim, JV, Boys'); await p.click('[data-x=yes]'); await W();
await p.screenshot({path:OUT+'/team27.png'});
await p.click('#openSettings'); await W(); await p.click('#openMeets'); await W(); await p.click('#modal [data-mx=seed]'); await W(); await p.screenshot({path:OUT+'/meets27.png'});
await p.click('#modal [data-x=no]'); await W(); await p.click('.tab[data-tab=watches]'); await W(); await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); await p.click('[data-div="GJV"]'); await W(500);
await p.screenshot({path:OUT+'/setup27.png'});
await b.close();
})();
