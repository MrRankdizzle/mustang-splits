// 3.27 Data and Awards navigation screenshots (fake names only):
//   node tools/shots-data-nav.js [url]   →   docs/screenshots-data-nav/
// The Data home (with the New card), search, Meets, a meet, Runners, a runner, Team, Highlights, After a meet, Season,
// Share, every step of the Awards flow, light and dark. Expects the app on :8765 (or the url given).
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js'); const {seed}=require('./fake-season.js');
const URL=process.argv[2]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-data-nav'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
for(const dark of [false,true]){ const sfx=dark?'-dark':'';
  const P=await T.open(b,{url:URL,seed,now:'2026-10-06T18:00:00',dark}); const ev=(f,...a)=>P.evaluate(f,...a);
  const shot=async n=>{ await W(350); await P.screenshot({path:path.join(OUT,n+sfx+'.png')}); };
  await ev(()=>{ MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.mir':['b2'],'G.roty':['g5'],'B.roty':['b3'],'G.mustang':['g4'],'B.mustang':['b5'],'G.letter':['g0','g1','g2','g3','g4','g5'],'B.letter':['b0','b1','b2','b3','b4','b5']}}); MSApp.awPut('r-2026-g1',{k:'r',season:2026,aid:'g1'},{captain:true}); MSApp.awPut('r-2026-b1',{k:'r',season:2026,aid:'b1'},{captain:true}); MSApp.awPut('r-2026-g5',{k:'r',season:2026,aid:'g5'},{hs:1}); MSApp.awPut('r-2026-b3',{k:'r',season:2026,aid:'b3'},{hs:1}); });
  await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); MSApp.dataHome(); }); await shot('01-home');
  await ev(()=>MSApp.dataSearch('a')); await shot('02-search'); await ev(()=>MSApp.dataSearch(''));
  await ev(()=>MSApp.dataGo('meets')); await shot('03-meets');
  await ev(()=>document.querySelector('#meetRows [data-rv=meet]').click()); await shot('04-meet');
  await ev(()=>MSApp.dataHome()); await ev(()=>MSApp.dataGo('runners')); await shot('05-runners');
  await ev(()=>document.querySelector('#rvRunners [data-runner]').click()); await shot('06-runner'); await ev(()=>window.scrollTo(0,700)); await shot('06-runner-chart');
  await ev(()=>MSApp.dataHome()); await ev(()=>MSApp.dataGo('team')); await shot('07-team');
  await ev(()=>MSApp.dataHome()); await ev(()=>MSApp.dataGo('high')); await shot('08-highlights');
  await ev(()=>document.querySelector('#rvHigh [data-hlm=latest]').click()); await shot('09-after-a-meet');
  await ev(()=>MSApp.dataBack()); await ev(()=>document.querySelector('#rvHigh [data-hlm=season]').click()); await shot('10-season');
  await ev(()=>MSApp.dataHome()); await ev(()=>MSApp.dataGo('share')); await shot('11-share');
  await ev(()=>MSApp.dataHome()); await ev(()=>MSApp.dataGo('awards'));
  for(const [i,k] of [['1','jv'],['2','mvr'],['3','mir'],['4','roty'],['5','mustang'],['6','letter'],['7','capt'],['8','summary']]){ await ev(k=>MSApp.awardsStep(k),k); await shot(`12-awards-${i}-${k}`); }
  await P.close(); }
await b.close(); console.log('done →',OUT); })().catch(e=>{ console.error(e); process.exit(1); });
