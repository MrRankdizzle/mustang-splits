// 3.23 screenshots and the book proof (fake names only):
//   node tools/shots323.js [url]   →   docs/screenshots-share/
// The share studio at phone size (light and dark, top, middle and end), every design in every palette with the LC and the
// Mustang watermark (square, 540 px), and a PDF proof of the banquet book (print format). Expects the app on :8765.
const puppeteer=require('puppeteer-core'), path=require('path'), fs=require('fs');
const T=require('./fake-team.js');
const URL=process.argv[2]||'http://localhost:8765/', OUT=path.join(__dirname,'..','..','docs','screenshots-share'); fs.mkdirSync(OUT,{recursive:true});
const W=T.W;
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
for(const dark of [false,true]){ const tag=dark?'dark':'light';
  const P=await T.open(b,{url:URL,now:'2026-10-20T16:00:00',dark,flat:false}); await T.load(P); const ev=(f,...a)=>P.evaluate(f,...a);
  const jpg=path.join(__dirname,'..','out','shot323-photo.jpg'); fs.mkdirSync(path.dirname(jpg),{recursive:true}); // a photo for the Photo design and the proof
  fs.writeFileSync(jpg,Buffer.from(await ev(()=>{ const c=document.createElement('canvas'); c.width=900; c.height=1200; const x=c.getContext('2d'); const g=x.createLinearGradient(0,0,0,1200); g.addColorStop(0,'#9db9d2'); g.addColorStop(1,'#3b5f7a'); x.fillStyle=g; x.fillRect(0,0,900,1200); x.fillStyle='#e9cdb4'; x.beginPath(); x.arc(450,420,170,0,Math.PI*2); x.fill(); x.fillStyle='#13294b'; x.fillRect(250,620,400,580); return c.toDataURL('image/jpeg',0.9).split(',')[1]; }),'base64'));
  await ev(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(300); await ev(()=>document.querySelector('#teamList [data-id="f0"] [data-t=open]').click()); await W(300); await ev(()=>document.querySelector('#profEdit').click()); await W(300);
  await (await P.$('#modal [data-ph=file]')).uploadFile(jpg); await W(1200); await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
  await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400); await ev(()=>{ const x=document.querySelector('[data-hlm=share]'); if(x) x.click(); }); await W(400);
  await ev(()=>{ MSApp.exStyleSet('pal','navysky'); MSApp.exStyleSet('bg','stripes'); MSApp.exStyleSet('design','recap'); document.querySelector('[data-shx=gfx]').click(); }); await W(4000);
  await P.screenshot({path:path.join(OUT,`studio-${tag}-1.png`)}); await ev(()=>{ document.querySelector('#modal').scrollTop=620; }); await W(400); await P.screenshot({path:path.join(OUT,`studio-${tag}-2.png`)});
  await ev(()=>{ document.querySelector('#modal').scrollTop=99999; }); await W(400); await P.screenshot({path:path.join(OUT,`studio-${tag}-3.png`)});
  await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
  if(!dark){ // every design × palette × the two watermarks, square, 540 px
    const list=await ev(async()=>{ const out=[]; for(const design of MSApp.gfxDesigns()) for(const pal of Object.keys(MSApp.gfxCombos())) for(const bg of ['lcwm','muwm']){ if(!MSApp.gfxCombos()[pal].includes(bg)) continue; const g=await MSApp.gfx(2026,{design,size:'sq',names:'full',team:'both',pal,bg}); const im=new Image(); im.src=g.png; await im.decode(); const c=document.createElement('canvas'); c.width=540; c.height=540; c.getContext('2d').drawImage(im,0,0,540,540); out.push([`${design}-${pal}-${bg}.png`,c.toDataURL('image/png').split(',')[1]]); } return out; });
    list.forEach(([n,d])=>fs.writeFileSync(path.join(OUT,n),Buffer.from(d,'base64'))); console.log('graphics',list.length);
    const pdf=await ev(async()=>{ MSApp.exStyleSet('pal','navysky'); MSApp.exStyleSet('bg','muwm'); const bl=await MSApp.bookPdf(2026,{team:'both',full:false,awards:false,ms:false,fmt:'print'}); const u=new Uint8Array(await bl.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); });
    fs.writeFileSync(path.join(OUT,'banquet-book-proof.pdf'),Buffer.from(pdf,'base64')); console.log('proof',Math.round(pdf.length*0.75/1024),'KB'); } }
await b.close(); console.log('done →',OUT); })().catch(e=>{ console.error(e); process.exit(1); });
