// The Workouts tab "What's today's goal?" with the fake team: node tools/today.js [date] [label]
const puppeteer=require('puppeteer-core'), path=require('path'), T=require('./fake-team.js');
const now=process.argv[2]||'2026-10-06T15:30:00', label=process.argv[3]||'today';
(async()=>{ const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
  const P=await T.open(b,{now}); await T.load(P); const W=T.W;
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=workouts]').click(); }); await W(500);
  console.log(await P.$eval('#wkToday',x=>x.innerText.replace(/\n+/g,' | ').slice(0,900)));
  await P.screenshot({path:path.join(__dirname,'..','screenshots',`workouts-${label}.png`),fullPage:false}); if(P.errs.length) console.log(P.errs);
  await b.close(); })();
