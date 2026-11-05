// 3.28 share studio screenshots (fake names only):
//   node tools/shots-share.js before|after|hig [url]   →   docs/screenshots-share/<prefix>-*.png   (DARK=1 adds the title and menu in dark)
// The studio on Results Board (top, with its picker open), Spotlight (top), Season Awards (top), a Results Board with 1, 2
// and 3 runners, and the banquet book sheet. Expects the app on :8765 (or the url given).
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js'); const {seed}=require('./fake-season.js');
const PFX=process.argv[2]||'after', URL=process.argv[3]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-share'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
// race days with one and two runners (as in e2e50), beside the planted season
const extra=[['2026-10-10',['b1'],'sF','cA'],['2026-10-17',['g0','b0'],'sG','cB'],['2026-10-18',['g0','g1','b0'],'sI','cA']];
const tOf={b1:1060,g0:1190,g1:1250,b0:1025};
extra.forEach(([date,ids,sid,cid],k)=>{ ['G','B'].forEach(g=>{ const rs=ids.filter(id=>id[0]===g.toLowerCase()); if(!rs.length) return; const rid='y'+k+g;
  const marks=rs.map((id,i)=>({id:rid+id,ci:0,rid:id,t:tOf[id]||1300+i*17,dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}));
  seed.raceLog.unshift({id:'h'+rid,date,savedAtMs:Date.parse(date+'T20:00'),uploaded:false,edits:[],race:{name:'Small meet '+k,raceId:rid,courseId:cid,courseName:'',goalSrc:'none',meetId:'my'+k,seriesId:sid,division:g+'V',checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:rs.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,marks:marks.filter(m=>m.rid===id).map(m=>m.id)})),marks,gun:Date.parse(date+'T10:00'),status:'done'}}); });
  seed.series.push({id:sid,name:['Solo Sectional','Pair Classic','Trio Invite'][k]}); seed.meets.push({id:'my'+k,seriesId:sid,courseId:cid,date,time:'',kind:'Invite',levels:['V'],season:2026}); });
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const P=await T.open(b,{url:URL,seed,now:'2026-10-30T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const shot=async n=>{ await W(300); await P.screenshot({path:path.join(OUT,`${PFX}-${n}.png`)}); };
const open=async(o)=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await ev(o=>MSApp.openStudio(o),o); await W(3500); };
await open({design:'board',subj:'2026-10-03'}); await shot('01-board-top');
await ev(()=>document.querySelector('#modal [data-x=pick]').click()); await W(400); await shot('02-board-picker-open');
if(await ev(()=>!!document.querySelector('.pd-menu [data-pdsub]'))){ await ev(()=>document.querySelector('.pd-menu [data-pdsub]').click()); await W(300); await shot('02b-board-meet-submenu'); } // 3.28.1: the Meet row opens in place
await ev(()=>{ document.querySelector('#modal [data-x=pick]').click(); const m=document.querySelector('#modal'); m.scrollTop=m.scrollHeight; }); await W(400); await shot('03-board-bottom');
if(process.env.DARK){ await P.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]); await open({design:'board',subj:'2026-10-03'}); await shot('01-board-top-dark'); await ev(()=>document.querySelector('#modal [data-x=pick]').click()); await W(400); await shot('02-board-picker-open-dark'); await ev(()=>document.querySelector('.pd-menu [data-pdsub]').click()); await W(300); await shot('02b-board-meet-submenu-dark'); await ev(()=>document.querySelector('#modal [data-x=pick]').click()); await P.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]); }
await open({design:'spot'}); await shot('04-spotlight-top');
await open({design:'awards',size:'tall'}); await shot('05-awards-top');
for(const [n,date] of [['1',  '2026-10-10'],['2','2026-10-17'],['3','2026-10-18']]){ const r=await ev(async d=>{ const g=await MSApp.gfx(2026,{design:'board',size:'sq',team:'both',names:'full',pal:'navysky',bg:'stripes',subj:d}); return g.png.split(',')[1]; },date); fs.writeFileSync(path.join(OUT,`${PFX}-06-board-${n}-runner${n==='1'?'':'s'}.png`),Buffer.from(r,'base64')); }
await ev(()=>{ document.querySelector('#overlay').hidden=true; MSApp.openBook(); }); await W(2500); await shot('07-book-sheet');
await b.close(); console.log('done →',OUT); })().catch(e=>{ console.error(e); process.exit(1); });
