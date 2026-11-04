// 3.25 Season Awards screenshots (fake names only):
//   node tools/shots-awards.js [url]   →   docs/screenshots-awards/
// Every slide of the awards set in every palette (4:5, 540 px wide; the LC watermark where it passes, else solid), plus
// the studio on the Season Awards design held and announced, and the Awards section with the icon set. Expects :8765.
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js'); const {seed}=require('./fake-season.js');
const URL=process.argv[2]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-awards'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
['Gail Quinn','Hope Ruiz','Iris Stone','Jade Tran','Kate Udo','Lena Vale','Mia Wu','Nell Xu'].forEach((n,i)=>seed.roster.push({id:'x'+i,name:n,group:'',gender:'G'}));
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const P=await T.open(b,{url:URL,seed,now:'2026-11-20T18:00:00',flat:false}); const ev=(f,...a)=>P.evaluate(f,...a);
// a photo for one winner (the stand-in shows on the others)
const jpg=path.join(__dirname,'..','out','shot-awards-photo.jpg'); fs.mkdirSync(path.dirname(jpg),{recursive:true});
fs.writeFileSync(jpg,Buffer.from(await ev(()=>{ const c=document.createElement('canvas'); c.width=900; c.height=1200; const x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,1200); g.addColorStop(0,'#9db9d2'); g.addColorStop(1,'#3b5f7a'); x.fillStyle=g; x.fillRect(0,0,900,1200); x.fillStyle='#e9cdb4'; x.beginPath(); x.arc(450,420,170,0,Math.PI*2); x.fill(); x.fillStyle='#13294b'; x.fillRect(250,620,400,580); return c.toDataURL('image/jpeg',0.8).split(',')[1]; }),'base64'));
await ev(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(300); await ev(()=>document.querySelector('#teamList [data-id="g0"] [data-t=open]').click()); await W(300); await ev(()=>document.querySelector('#profEdit').click()); await W(300);
await (await P.$('#modal [data-ph=file]')).uploadFile(jpg); await W(1200); await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
await ev(()=>{ MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.mir':['b2'],'G.roty':['g5'],'B.roty':['b3'],'G.mustang':['g4'],'B.mustang':['b5'],'G.letter':['g0','g1','g2','g3','g4','g5','x0','x1','x2','x3','x4','x5','x6','x7'],'B.letter':['b0','b1','b2','b3','b4','b5']}}); MSApp.awPut('r-2026-g1',{k:'r',season:2026,aid:'g1'},{captain:true}); MSApp.awPut('r-2026-b1',{k:'r',season:2026,aid:'b1'},{captain:true}); });
// the Awards section with the icon set, the studio held, then announced
const openAwards=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400); await ev(()=>{ const s=document.querySelector('[data-hlm=season]'); if(s&&s.getAttribute('aria-pressed')!=='true') s.click(); }); await W(300); await ev(()=>{ const a=document.querySelector('[data-ssaw]'); if(a) a.click(); }); await W(600); };
await openAwards(); await P.screenshot({path:path.join(OUT,'awards-section.png')});
await ev(()=>{ MSApp.exStyleSet('pal','navysky'); MSApp.exStyleSet('bg','lcwm'); document.querySelector('#rvHigh [data-awshare]').click(); }); await W(4500);
await P.screenshot({path:path.join(OUT,'studio-held-top.png')}); await ev(()=>{ document.querySelector('#modal').scrollTop=99999; }); await W(400); await P.screenshot({path:path.join(OUT,'studio-held-bottom.png')});
await ev(()=>{ document.querySelector('#modal [data-x=done]').click(); MSApp.announceAwards(2026,true); }); await W(300); await openAwards(); await P.screenshot({path:path.join(OUT,'awards-section-announced.png')});
await ev(()=>document.querySelector('#rvHigh [data-awshare]').click()); await W(4500); await P.screenshot({path:path.join(OUT,'studio-announced-top.png')}); await ev(()=>{ document.querySelector('#modal').scrollTop=99999; }); await W(400); await P.screenshot({path:path.join(OUT,'studio-announced-bottom.png')});
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
// every slide in every palette, 4:5 at 540 px
const list=await ev(async()=>{ const out=[]; const C=MSApp.gfxCombos(); for(const pal of Object.keys(C)){ const bg=C[pal].includes('lcwm')?'lcwm':C[pal].includes('muwm')?'muwm':'solid'; for(const sl of MSApp.awardSlides(2026,'both')){ const g=await MSApp.gfx(2026,{design:'awards',size:'tall',names:'full',team:'both',pal,bg,subj:sl.id}); const im=new Image(); im.src=g.png; await im.decode(); const c=document.createElement('canvas'); c.width=540; c.height=675; c.getContext('2d').drawImage(im,0,0,540,675); out.push([`${pal}-${String(sl.i).padStart(2,'0')}-${sl.id.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.png`,c.toDataURL('image/png').split(',')[1]]); } }
  for(const size of ['sq','story']){ const g=await MSApp.gfx(2026,{design:'awards',size,names:'full',team:'both',pal:'navysky',bg:'lcwm',subj:'board'}); const im=new Image(); im.src=g.png; await im.decode(); const c=document.createElement('canvas'); c.width=540; c.height=Math.round(540*im.height/im.width); c.getContext('2d').drawImage(im,0,0,c.width,c.height); out.push([`navysky-board-${size}.png`,c.toDataURL('image/png').split(',')[1]]); } return out; });
list.forEach(([n,d])=>fs.writeFileSync(path.join(OUT,n),Buffer.from(d,'base64'))); console.log('slides',list.length);
await b.close(); console.log('done →',OUT); })().catch(e=>{ console.error(e); process.exit(1); });
