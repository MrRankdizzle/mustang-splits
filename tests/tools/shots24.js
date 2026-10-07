const puppeteer=require('puppeteer-core');
const ROSTER=['Maya Lopez, Varsity','Jonah Kim, Varsity','Sam Ortiz, JV','Ava Chen, Varsity','Liam Brooks, JV','Zoe Park, Varsity','Eli Ward, JV','Nora Diaz, Varsity','Owen Hart, JV','Ivy Long, Varsity','Theo Ruiz, JV','Cleo Fox, Varsity','Ben Adler, JV','Ruby Stone, Varsity','Max Cole, JV'].join('\n');
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=ms=>new Promise(r=>setTimeout(r,ms||300));
for(const dark of [false,true]){
const p=await b.newPage(); await p.evaluateOnNewDocument(()=>{ localStorage.setItem('mustang-splits:tour','1'); localStorage.setItem('mustang-splits:test-flat-settings','1'); }); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:dark?'dark':'light'}]);
await p.setRequestInterception(true); p.on('request',r=>r.url().includes('gstatic.com/firebasejs')?r.abort():r.continue());
await p.goto('http://localhost:8765/'); await W(800);
await p.click('.tab[data-tab=team]'); await W(); await p.click('#pasteAth'); await W(); await p.$eval('#pasteTxt',(t,v)=>t.value=v,ROSTER); await p.click('[data-x=yes]'); await W(); await p.click('.tab[data-tab=watches]'); await W();
await p.click('#newBtn'); await W(); await p.click('[data-new=race]'); await W(); await p.click('[data-rg="0"]'); await W(); await p.click('[data-rg="1"]'); await W();
const g=async(n,v)=>{ const id=await p.evaluate(n=>MSApp.getRoster().find(a=>a.name.startsWith(n)).id,n); await p.click(`[data-goal="${id}"]`); await p.keyboard.type(v); };
await g('Zoe','1845'); await g('Ben','1802'); await p.click('[data-rname]'); await W(400);
await p.click('[data-cols="3"]'); await W();
await p.$eval('#ordList',l=>l.scrollIntoView({block:'start'})); await W(); await p.screenshot({path:`shots/setup-${dark?'dark':'light'}.png`});
await p.click('[data-ra=gun]'); await W(700);
const ids=await p.evaluate(()=>MSApp.getRace().runners.map(x=>x.id));
for(const id of ids.slice(0,4)){ const c=await p.$eval(`[data-rn="${id}"]`,b=>{const r=b.getBoundingClientRect(); return [r.left+10,r.top+10];}); await p.touchscreen.tap(c[0],c[1]); await W(200); }
await p.evaluate(id=>{ const r=MSApp.getRace(); MSApp.applyRemote({athletes:{upsert:[],remove:[]},workouts:{upsert:[],remove:[]},marks:{upsert:[{id:'x',cp:r.checkpoints[0].id,local:Date.now(),off:null,runnerId:id,by:'o',byName:'Coach Jen'}],remove:[]}}); },ids[5]);
await W(5500); await p.screenshot({path:`shots/run-${dark?'dark':'light'}.png`});
await p.close(); }
await b.close();
})();
