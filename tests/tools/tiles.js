// Stopwatch tiles with the fake team: 4 runners on an effort workout (one lap tapped) and a quick stopwatch, upright phone.
// node tools/tiles.js <label> [url]  -> prints tile heights, saves tests/screenshots/tiles-<label>.png
const puppeteer=require('puppeteer-core'), path=require('path'), T=require('./fake-team.js');
const label=process.argv[2]||'after', url=process.argv[3]||'http://localhost:8765/';
(async()=>{ const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
  const s=T.seed(); s.workouts=[{id:'wkE',name:'CV 5 × 1000',reps:5,rest:'1:30',restUnit:'mss',segments:[{id:'s1',effort:'cv',dist:1000,mode:'effort',paceRef:'cv',value:'',cp:200}]}];
  const P=await T.open(b,{url,seed:s}); await T.load(P); const W=T.W;
  await P.evaluate(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=watches]').click(); }); await W();
  await P.evaluate(()=>{ (document.querySelector('[data-new=workout]')).click(); }); await W();
  await P.evaluate(()=>{ ['Avery','Maren','Rowan','Silas'].forEach(n=>[...document.querySelectorAll('#modal [data-a]')].find(b=>b.textContent.startsWith(n)).click()); }); await W();
  await P.click('#modal [data-x=next]'); await W(); await P.click('#modal [data-wk=wkE]'); await W(); await P.click('#modal [data-x=startnow]'); await W(1200);
  await P.evaluate(()=>{ const b=document.querySelector('.watch [data-act=split]'); if(b) b.click(); }); await W(400);
  await P.evaluate(()=>{ const n=document.querySelector('#newBtn'); if(n) n.click(); }); await W(); await P.evaluate(()=>{ const q=document.querySelector('#modal [data-new=quick]'); if(q) q.click(); }); await W(1500);
  const hs=await P.evaluate(()=>[...document.querySelectorAll('.watch')].map(w=>Math.round(w.getBoundingClientRect().height)+'px '+w.querySelector('.w-name').textContent));
  console.log(label, hs.join(' | ')); await P.evaluate(()=>window.scrollTo(0,0));
  await P.screenshot({path:path.join(__dirname,'..','screenshots',`tiles-${label}.png`)}); if(P.errs.length) console.log(P.errs);
  await b.close(); })();
