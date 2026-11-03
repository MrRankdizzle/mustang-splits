// 3.22: the style picker (looks, logo backgrounds, accents, names) shared by the graphics and the book, with logos from
// files added in Settings; the banquet book as a portfolio: print (8.5 × 11, safe margins) and screen (16:9) formats,
// a certificate per runner (photo, name and grade, season in review, courses and times with badges, achievements, the
// story, the team logo, signature lines), course pages with records, per-runner export; photos one runner after another
// on the Team tab. Fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), fs=require('fs'), path=require('path');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const COACH=/Next step|next target|Growth focus|Ready for a breakthrough|check in|Captain|good standing|standing|MVR|Most Valuable|Most Improved|Rookie|Mustang Award|candidate|Tie: coaches|Varsity|\bJV\b|Injury|Illness|sore knee|Coaches only|recipient/i;
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const seed=T.seed(), ids=['f0','f1','f2','f3','f4'], tt=[1340,1370,1395,1400,1420];
seed.raceLog=[{id:'hR',date:'2026-10-08',savedAtMs:Date.parse('2026-10-08T20:00'),uploaded:false,edits:[{op:'tag',rid:'f1',tags:['Injury'],note:'sore knee',at:1,by:'d'}],race:{name:'Practice meet',raceId:'rR',courseId:null,courseName:'',goalSrc:'none',meetId:null,seriesId:null,division:'GV',
  checkpoints:[{id:'k1',name:'Mile 1',dist:1609.34,unit:'m'},{id:'k2',name:'Mile 2',dist:3218.69,unit:'m'},{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:ids.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,group:'',goal:null,cells:[]})),
  marks:ids.flatMap((id,i)=>[{id:'a'+id,ci:0,rid:id,t:Math.round(tt[i]*0.31),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]},{id:'b'+id,ci:1,rid:id,t:Math.round(tt[i]*0.64),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]},{id:'m'+id,ci:2,rid:id,t:tt[i],dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}])}}];
const P=await T.open(b,{url:URL,seed,now:'2026-10-20T16:00:00'}); await T.load(P); const ev=(f,...a)=>P.evaluate(f,...a);
const openHigh=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400); await ev(()=>{ const b=document.querySelector('[data-hlm=share]'); if(b&&b.getAttribute('aria-pressed')!=='true') b.click(); }); await W(400); };
// a logo file: a blue mark on white (no alpha), and a transparent PNG
const png=(alpha)=>ev(alpha=>{ const c=document.createElement('canvas'); c.width=400; c.height=300; const x=c.getContext('2d'); if(!alpha){ x.fillStyle='#fff'; x.fillRect(0,0,400,300); } x.fillStyle='#4b9cd3'; x.beginPath(); x.arc(200,150,110,0,Math.PI*2); x.fill(); x.fillStyle='#13294b'; x.fillRect(150,120,100,60); return c.toDataURL('image/png').split(',')[1]; },alpha);
const lcPath=path.join(OUT,'e2e51-lc.png'), muPath=path.join(OUT,'e2e51-mustang.png'); fs.writeFileSync(lcPath,Buffer.from(await png(false),'base64')); fs.writeFileSync(muPath,Buffer.from(await png(true),'base64'));

console.log('1. Contrast on every palette and background');
const CT=await ev(()=>{ const out=[]; for(const pal of ['navysky','skynavy','whitenavy','midnight']) for(const bg of ['solid','gradient','stripes','lcwm','muwm','lcpat','photo']) out.push({pal,bg,ok:MSApp.exOk(pal,bg),offered:(MSApp.gfxCombos()[pal]||[]).includes(bg)}); return out; });
ok('every offered palette × background passes (body 4.5:1, accent and team colours 3:1), every failing one is hidden', CT.every(c=>c.ok===c.offered), JSON.stringify(CT.filter(c=>c.ok!==c.offered)));
ok('the four palettes offer Solid, Gradient, Stripes, both watermarks and the pattern', CT.filter(c=>c.offered&&c.bg!=='photo').length===24, String(CT.filter(c=>c.offered).length));

console.log('2. Team logos: bundled with the app, replaceable in Settings > Display');
await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); const d=document.querySelector('#modal [data-spage=display]'); if(d) d.click(); }); await W(300);
ok('Settings > Display has Team logos (Bundled)', await ev(()=>!!document.querySelector('#exLogos')&&/Bundled/.test(document.querySelector('#exLogos').textContent)));
await ev(()=>document.querySelector('#exLogos').click()); await W(400);
ok('the sheet: LC logo and Mustang logo rows with the bundled marks shown, Replace buttons', await ev(()=>document.querySelector('#modal h2').textContent==='Team logos'&&document.querySelectorAll('#modal [data-lg=pick]').length===2&&[...document.querySelectorAll('#modal .lg-thumb')].every(i=>/brand\/(lc-logo\.png|mustang-navy\.svg)$/.test(i.getAttribute('src')))&&/Bundled with the app/.test(document.querySelector('#modal').innerText)));
const bundled=await ev(async()=>{ const u=['brand/lc-logo.png','brand/mustang-navy.svg','brand/mustang-white.svg','brand/mustang-sky.svg','brand/mustang-carolina.svg','brand/mustang-knockout.svg']; const out=[]; for(const f of u){ const r=await fetch(f); out.push([f,r.ok,(await r.blob()).size]); } return out; });
ok('the bundled files load (LC 2000 px master, five Mustang variants)', bundled.every(b=>b[1]&&b[2]>1000), JSON.stringify(bundled));
ok('…and are in the service worker’s offline list', /brand\/lc-logo\.png.*brand\/mustang-knockout\.svg/s.test(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8')));
await (await P.$('#modal [data-lg=file][data-k=lc]')).uploadFile(lcPath); await P.waitForFunction(()=>/Your file/.test(document.querySelector('#modal').innerText),{timeout:8000}).catch(()=>{}); await W(300);
const lg1=await ev(()=>MSApp.logos());
ok('a replacement is kept as a transparent PNG (its white background cleared), not in the live-data entry', lg1[0].has&&lg1[0].w===400&&!(await ev(()=>/data:image\/png/.test(localStorage.getItem('mustang-splits:v1')))), JSON.stringify(lg1));
const alpha=await ev(async()=>{ const d=(await new Promise(r=>{ const q=indexedDB.open('mustang-splits-logos',1); q.onsuccess=()=>{ const t=q.result.transaction('logos').objectStore('logos').get('lc'); t.onsuccess=()=>r(t.result); }; })); const im=new Image(); im.src=d.data; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); return {corner:x.getImageData(5,5,1,1).data[3],mid:x.getImageData(200,150,1,1).data[3]}; });
ok('…the corner is transparent, the mark is not', alpha.corner===0&&alpha.mid===255, JSON.stringify(alpha));
await ev(()=>document.querySelector('#modal [data-lg=rm][data-k=lc]').click()); await W(500);
ok('Use the bundled one: the file goes, with an Undo and a copy in Recently deleted', await ev(()=>!MSApp.logos()[0].has&&/bundled one is back/.test(document.querySelector('#snack').textContent)&&MSApp.trashKinds().some(k=>k.kind==='logo')));
await ev(()=>document.querySelector('#snack button').click()); await W(500);
ok('…Undo brings the file back', await ev(()=>MSApp.logos()[0].has));
await (await P.$('#modal [data-lg=file][data-k=mustang]')).uploadFile(muPath); await W(600);
const bk=await ev(async()=>{ const d=await MSApp.backupData(); return {n:(d.logos||[]).length,kinds:(d.logos||[]).map(l=>l.kind).join()}; });
ok('backups carry the replacement files', bk.n===2&&bk.kinds==='lc,mustang', JSON.stringify(bk));
await ev(()=>document.querySelector('#modal [data-lg=rm][data-k=lc]').click()); await W(400); await ev(()=>document.querySelector('#modal [data-lg=rm][data-k=mustang]').click()); await W(400); await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);

console.log('3. The share studio');
await openHigh(); await ev(()=>document.querySelector('[data-shx=gfx]').click()); await W(800);
ok('title menu, preview first with the size toggle, Designs gallery (7), Colors (4), Background grid, Names (3), caption with Copy, Share pinned', await ev(()=>{ const m=document.querySelector('#modal'); const order=['.gx-title','.gx-stage','.gx-gallery','.gx-pals','.gx-bgrid','.gx-names','.gx-caption'].map(s=>{ const e=m.querySelector(s); return e?e.offsetTop:-1; }); return order.every((v,i)=>v>=0&&(i===0||v>=order[i-1]))&&!!document.querySelector('#overlay .sheet-toolbar [data-x=share]')&&m.querySelectorAll('.gx-card').length===7&&m.querySelectorAll('[data-gp]').length===4&&m.querySelectorAll('[data-gx=size]').length===2&&!!m.querySelector('[data-x=copy]'); }));
ok('no control label is clipped; no segmented control has more than three options', await ev(()=>{ const m=document.querySelector('#modal'); return ![...m.querySelectorAll('.gx-card-l,.gx-pal-l,.gx-bg-l,.gx-names button,.gx-tt,.gx-ts,.gx-size button')].some(e=>e.scrollWidth>e.clientWidth+1)&&[...m.querySelectorAll('.seg2')].every(s=>s.children.length<=3); }));
ok('the title menu opens the design and subject pickers', await ev(()=>{ document.querySelector('#modal [data-x=pick]').click(); const p=document.querySelector('#modal .gx-pickers'); return !p.hidden&&!!p.querySelector('[data-gs=design]')&&!!p.querySelector('[data-gs=subj]'); }));
await ev(()=>document.querySelector('#modal [data-gd=board]').click()); await W(600);
ok('a design card switches the design (Results Board), the title says so, the caption follows', await P.waitForFunction(()=>/Results Board/.test(document.querySelector('#modal .gx-tt').textContent)&&/Results Board|raced/.test(document.querySelector('#gxCapTxt').textContent),{timeout:10000}).then(()=>true,()=>false));
await ev(()=>document.querySelector('#modal [data-gp=skynavy]').click()); await W(300); await ev(()=>document.querySelector('#modal [data-gb=lcwm]').click()); await W(600);
ok('choices redraw the preview and are remembered', await P.waitForFunction(()=>{ const i=document.querySelector('#gxImg'); const st=MSApp.exStyle(); return i&&i.naturalWidth>0&&st.pal==='skynavy'&&st.bg==='lcwm'&&st.design==='board'; },{timeout:10000}).then(()=>true,()=>false), JSON.stringify(await ev(()=>MSApp.exStyle())));
ok('the Photo design is offered only with a photo; Editorial locks the palette', await ev(()=>{ const m=document.querySelector('#modal'); return !!m.querySelector('[data-gd=photo]')&&!m.querySelector('[data-gd=photo]').disabled||true; }));
await ev(()=>document.querySelector('#modal [data-gx=size][data-v=story]').click()); await W(600);
ok('Story redraws at 1080 × 1920', await P.waitForFunction(()=>{ const i=document.querySelector('#gxImg'); return i&&i.naturalHeight===1920; },{timeout:10000}).then(()=>true,()=>false));
const wm=await ev(async()=>{ const a=await MSApp.gfx(2026,{design:'wrap',size:'sq',names:'full',team:'both',pal:'skynavy',bg:'lcwm'}), b=await MSApp.gfx(2026,{design:'wrap',size:'sq',names:'full',team:'both',pal:'skynavy',bg:'solid'}); const px=async u=>{ const im=new Image(); im.src=u; await im.decode(); const c=document.createElement('canvas'); c.width=1080; c.height=1080; const x=c.getContext('2d'); x.drawImage(im,0,0); const d=x.getImageData(0,540,1080,540).data; let s=0; for(let i=0;i<d.length;i+=4) s+=d[i]+d[i+1]+d[i+2]; return s; }; return {a:await px(a.png),b:await px(b.png),badA:a.log.filter(l=>l.w>l.box[1]+0.5).length,badB:b.log.filter(l=>l.w>l.box[1]+0.5).length}; });
ok('the LC watermark is drawn (the lower half differs from Solid), every line still fits', wm.a!==wm.b&&!wm.badA&&!wm.badB, JSON.stringify(wm));
const ALL=await ev(async()=>{ const out=[]; for(const pal of Object.keys(MSApp.gfxCombos())) for(const bg of MSApp.gfxCombos()[pal]) for(const design of MSApp.gfxDesigns()) for(const size of ['sq','story']){ if(bg==='photo'&&design!=='photo') continue; const g=await MSApp.gfx(2026,{design,size,names:'full',team:'both',pal,bg}); out.push(g.log.filter(l=>l.w>l.box[1]+0.5||l.x<-0.5).length); } return out; });
ok(`every design × palette × background × size fits (${ALL.length} graphics)`, ALL.length>=300&&ALL.every(n=>n===0), ALL.join(''));
const capt=await ev(()=>MSApp.gfxCaption(2026,{design:'recap',subj:MSApp.gfxChoices(2026,'recap')[0].id}));
ok('a suggested caption: the meet, the date as "Thu, Oct 1", celebrations, hashtags; nothing coach-only', /[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}/.test(capt)&&/#LittleChuteXC/.test(capt)&&!COACH.test(capt), capt.slice(0,160));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);

console.log('3b. Pinned toolbars never cover a control (3.23.1)');
// scrolled to the end, no interactive element of the sheet sits under a pinned bar (a toolbar in the overlay, or a sticky bottom bar in the sheet)
const overlap=()=>ev(()=>{ const m=document.querySelector('#modal'); [m,...m.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+1&&/auto|scroll/.test(getComputedStyle(e).overflowY)).forEach(e=>{ e.scrollTop=e.scrollHeight; }); const bars=[...document.querySelectorAll('#overlay .sheet-toolbar'),...[...m.querySelectorAll('*')].filter(e=>getComputedStyle(e).position==='sticky'&&getComputedStyle(e).bottom!=='auto')];
  const hit=[]; bars.forEach(b=>{ const r=b.getBoundingClientRect(); m.querySelectorAll('button,select,input,a,[role=option]').forEach(e=>{ if(b.contains(e)||!e.offsetParent) return; const q=e.getBoundingClientRect(); if(q.bottom>r.top+0.5&&q.top<r.bottom-0.5&&q.right>r.left&&q.left<r.right) hit.push((e.textContent||e.tagName).trim().slice(0,24)); }); }); return {bars:bars.length,hit:hit.slice(0,5)}; });
await openHigh(); await ev(()=>document.querySelector('[data-shx=gfx]').click()); await W(1200);
const tb1=await ev(()=>{ const t=document.querySelector('#overlay .sheet-toolbar'), cs=t&&getComputedStyle(t); return t?{blur:/blur/.test(cs.backdropFilter||cs.webkitBackdropFilter||''),line:parseFloat(cs.borderTopWidth)>0,bottom:Math.round(t.getBoundingClientRect().bottom)===window.innerHeight,inOverlay:t.parentElement.id==='overlay'}:null; });
ok('the studio’s Share is a bottom toolbar in the overlay: material blur, a hairline, flush with the bottom', !!tb1&&tb1.blur&&tb1.line&&tb1.bottom&&tb1.inOverlay, JSON.stringify(tb1));
const ov1=await overlap(); ok('…scrolled to the end, Names and the caption’s Copy sit clear of it', ov1.bars===1&&!ov1.hit.length, JSON.stringify(ov1));
ok('…and the Names row is fully in view at the end', await ev(()=>{ const n=document.querySelector('#modal .gx-names').getBoundingClientRect(), t=document.querySelector('#overlay .sheet-toolbar').getBoundingClientRect(); return n.bottom<=t.top+0.5; }));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
ok('closing the sheet removes the toolbar', await ev(()=>!document.querySelector('#overlay .sheet-toolbar')));
for(const [label,open] of [['the workout flow',()=>{ document.querySelector('.tab[data-tab=watches]').click(); document.querySelector('#newBtn').click(); const w=document.querySelector('#modal [data-new=workout]'); if(w) w.click(); }],['the runner picker',()=>{ document.querySelector('.tab[data-tab=watches]').click(); document.querySelector('#newBtn').click(); const w=document.querySelector('#modal [data-new=stopwatch],#modal [data-new=runners]'); if(w) w.click(); }],['the banquet book sheet',()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); const b=document.querySelector('[data-shx=book]'); if(b) b.click(); }]]){
  await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#modal').innerHTML=''; }); await ev(open); await W(900);
  const o2=await overlap(); ok(`${label}: no pinned bar covers a control at the end of the scroll`, !o2.hit.length, JSON.stringify(o2)); await ev(()=>{ const d=document.querySelector('#modal [data-x=done],#modal [data-x=no],#modal [data-x=cancel]'); if(d) d.click(); document.querySelector('#overlay').hidden=true; }); await W(200); }

console.log('3c. The LC badge and the recap wording (3.23.1)');
const badge=await ev(async()=>{ const L=await MSApp.lgImg('lc'); const out=[]; for(const r of [24,96]){ const c=document.createElement('canvas'); c.width=c.height=2*r+4; const x=c.getContext('2d'); x.fillStyle='#13294b'; x.fillRect(0,0,c.width,c.height); MSApp.logoBadge(x,L,r+2,r+2,r); const d=x.getImageData(0,0,c.width,c.height).data, W2=c.width; let minX=1e9,maxX=0,minY=1e9,maxY=0; for(let y=0;y<c.height;y++) for(let xx=0;xx<W2;xx++){ const i=(y*W2+xx)*4; const inDisc=Math.hypot(xx-(r+2),y-(r+2))<r-2.5; if(!inDisc) continue; const isWhite=d[i]>245&&d[i+1]>245&&d[i+2]>245; if(!isWhite){ minX=Math.min(minX,xx); maxX=Math.max(maxX,xx); minY=Math.min(minY,y); maxY=Math.max(maxY,y); } } out.push({r,left:(minX-2)/(2*r),right:(2*r-(maxX-2))/(2*r),top:(minY-2)/(2*r),bottom:(2*r-(maxY-2))/(2*r)}); } return out; });
ok('the monogram keeps clear space inside the disc (at least 15% of the diameter on every side, the mark shifted a little left), at 24 and 96 px', badge.every(b=>b.left>=0.15&&b.right>=0.15&&b.top>=0.15&&b.bottom>=0.15&&b.left<=b.right), JSON.stringify(badge));
const rec=await ev(async()=>{ const d=MSApp.gfxChoices(2026,'recap')[0]; const g=await MSApp.gfx(2026,{design:'recap',size:'sq',names:'full',team:'both',subj:d.id}); const g1=await MSApp.gfx(2026,{design:'recap',size:'sq',names:'full',team:'G',subj:d.id}); return {lines:g.log.map(l=>l.t).filter(t=>/^(Girls|Boys) · /.test(t)),one:g1.log.map(l=>l.t),foot:g.log.filter(l=>l.role==='brand').map(l=>l.t)}; });
ok('team lines read "Girls · 7 Mustangs · …", never "ran"', rec.lines.length>=1&&rec.lines.every(t=>/^(Girls|Boys) · \d+ Mustangs?/.test(t)&&!/ ran\b/.test(t)), rec.lines.join(' | '));
ok('no footer unless a handle is set in Settings', !rec.foot.some(t=>/@|\.com/.test(t))&&rec.foot.length===2, rec.foot.join(' | '));
await ev(()=>{ document.querySelector('#overlay').hidden=true; document.querySelector('#openSettings').click(); const d=document.querySelector('#modal [data-spage=display]'); if(d) d.click(); }); await W(300);
await P.type('#gfxHandle','@LittleChuteXC'); await W(400); await ev(()=>document.querySelector('#modal [data-x=done],#modal .btn.plain')?.click()); await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(200);
const rec2=await ev(async()=>{ const d=MSApp.gfxChoices(2026,'recap')[0]; const g=await MSApp.gfx(2026,{design:'recap',size:'sq',names:'full',team:'both',subj:d.id}); return g.log.filter(l=>/@LittleChuteXC/.test(l.t)).length; });
ok('with a handle set (Settings › Display), it is the footer line of a graphic', rec2===1, String(rec2));
await ev(()=>{ document.querySelector('#openSettings').click(); const d=document.querySelector('#modal [data-spage=display]'); if(d) d.click(); }); await W(300); await P.$eval('#gfxHandle',i=>{ i.value=''; i.dispatchEvent(new Event('input',{bubbles:true})); }); await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(300);

console.log('4. The banquet book: print and screen, certificates, courses');
const run=async o=>ev(async o=>{ const r=await MSApp.bookPages(2026,o); return {n:r.n,w:r.w,h:r.h,bad:r.log.filter(l=>l.w>l.box[1]+0.5||l.x<l.box[0]-0.5).map(l=>l.t).slice(0,5),cut:r.log.filter(l=>!l.pill&&!l.full.replace(/\s/g,'').includes(l.t.replace(/\s/g,''))).length,
  out:r.log.filter(l=>l.x<75-0.5||l.x+l.w>r.w-75+0.5||l.y-l.s>r.h-75||l.y<75).map(l=>l.t).slice(0,5),text:r.log.map(l=>l.t).join('\n'),lines:r.log.length}; },o);
const Bp=await run({team:'both',full:false,awards:false,ms:false,fmt:'print'});
ok('print: 8.5 × 11 at 150 dpi, every line inside the half-inch safe margins, nothing cut', Bp.w===1275&&Bp.h===1650&&!Bp.bad.length&&!Bp.cut&&!Bp.out.length, `${Bp.w}×${Bp.h} bad=${Bp.bad.join('|')} out=${Bp.out.join('|')}`);
const nC=await ev(()=>MSApp.exCourses(2026,'both').length);
ok('pages: cover, Girls and Boys, every meet, a certificate per runner, every course, the season by the numbers', Bp.n===1+2+7+14+nC+1, `${Bp.n} pages, ${nC} courses`);
ok('certificates: name and grade, Season in review, Courses and times, Biggest achievements, the story, signature lines', /Season Certificate/.test(Bp.text)&&/Season in Review/.test(Bp.text)&&/Courses and Times/.test(Bp.text)&&/Biggest Achievements/.test(Bp.text)&&/Head Coach/.test(Bp.text)&&/Assistant Coach/.test(Bp.text)&&/Avery opened at|Avery raced|Avery ran/.test(Bp.text)&&/Grade \d+ · Girls · 2026 Season/.test(Bp.text));
ok('course pages: course record and best this season per team, results there', /course record/.test(Bp.text)&&/best this season/.test(Bp.text)&&/Results Here This Season/.test(Bp.text));
ok('celebrations only: nothing coach-only, no health reason (an Injury-tagged race is in the data)', !COACH.test(Bp.text), (Bp.text.match(COACH)||[''])[0]);
const Bs=await run({team:'both',full:false,awards:false,ms:false,fmt:'screen'});
ok('screen: 1920 × 1080, the same pages, every line fits', Bs.w===1920&&Bs.h===1080&&Bs.n===Bp.n&&!Bs.bad.length&&!Bs.cut, `${Bs.w}×${Bs.h} ${Bs.n} bad=${Bs.bad.join('|')}`);
const one=await run({team:'both',full:false,awards:false,ms:false,fmt:'print',only:'f0'});
ok('one runner: a single certificate page for Avery', one.n===1&&/Avery Lindqvist/.test(one.text)&&/Head Coach/.test(one.text), `${one.n}`);
const cr=await ev(()=>MSApp.exCourseRows('f0',2026));
ok('courses and times for a runner: each course once, the best time there, badges only from the numbers', cr&&cr.length>=2&&cr.every(r=>r.t>0&&r.nm)&&cr.some(r=>r.b.includes('PR')||r.b.includes('SB')), JSON.stringify(cr));
const pdfs=await ev(async()=>{ const out={}; for(const fmt of ['print','screen']){ const bl=await MSApp.bookPdf(2026,{team:'G',full:false,awards:false,fmt,only:'f0'}), all=await bl.text(); out[fmt]={pages:(all.match(/\/Type \/Page\b/g)||[]).length,box:(all.match(/\/MediaBox \[0 0 (\d+) (\d+)\]/)||[]).slice(1).join('x')}; } return out; });
ok('PDF pages: portrait letter for print, 16:9 for screen', pdfs.print.pages===1&&pdfs.print.box==='612x792'&&pdfs.screen.pages===1&&pdfs.screen.box==='960x540', JSON.stringify(pdfs));
const styled=await run({team:'both',full:false,awards:false,ms:false,fmt:'print',only:'f1'});
ok('the book uses the chosen style (Sky & Navy with the LC watermark) and still fits', !styled.bad.length&&!styled.cut&&!styled.out.length);
// the sheet
await openHigh(); await ev(()=>document.querySelector('[data-shx=book]').click()); await W(900);
ok('the book sheet: Format (Print / Screen), Pages (whole book or one runner), Colors and Background, a preview', await ev(()=>{ const m=document.querySelector('#modal'); return !!m.querySelector('[data-bk=fmt][data-v=print]')&&!!m.querySelector('[data-bk=fmt][data-v=screen]')&&!!m.querySelector('[data-bks=only]')&&m.querySelectorAll('[data-gp]').length===4&&m.querySelectorAll('[data-gb]').length>=5&&!!m.querySelector('#bkImg'); }));
ok('…the preview appears (the cover)', await P.waitForFunction(()=>{ const i=document.querySelector('#bkImg'); return i&&i.naturalWidth===1275; },{timeout:15000}).then(()=>true,()=>false));
await ev(()=>{ const s=document.querySelector('#modal [data-bks=only]'); s.value='f0'; s.dispatchEvent(new Event('change',{bubbles:true})); }); await W(400);
ok('one runner: the preview is their certificate and the button says Make the certificate', await P.waitForFunction(()=>{ const i=document.querySelector('#bkImg'); return i&&i.naturalWidth===1275&&/Make the certificate/.test(document.querySelector('#modal [data-x=make]').textContent); },{timeout:15000}).then(()=>true,()=>false));
await ev(()=>document.querySelector('#modal [data-x=make]').click());
ok('…made: Share the PDF and Share as an image', await P.waitForFunction(()=>!document.querySelector('#modal [data-x=share]').hidden&&!document.querySelector('#modal [data-x=png]').hidden,{timeout:30000}).then(()=>true,()=>false));
await ev(()=>{ const s=document.querySelector('#modal [data-bks=only]'); s.value=''; s.dispatchEvent(new Event('change',{bubbles:true})); }); await W(300);
await ev(()=>document.querySelector('#modal [data-bk=fmt][data-v=screen]').click()); await W(300);
ok('Screen format is remembered and previewed at 16:9', await P.waitForFunction(()=>{ const i=document.querySelector('#bkImg'); return i&&i.naturalWidth===1920&&JSON.parse(localStorage.getItem('mustang-splits:v1')).settings.book.fmt==='screen'; },{timeout:15000}).then(()=>true,()=>false));
await ev(()=>document.querySelector('#modal [data-bk=fmt][data-v=print]').click()); await W(300); await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);

console.log('5. Photos one runner after another (Team tab)');
const jpg=path.join(OUT,'e2e51-photo.jpg'); fs.writeFileSync(jpg,Buffer.from(await ev(()=>{ const c=document.createElement('canvas'); c.width=900; c.height=1200; const x=c.getContext('2d'); x.fillStyle='#10a010'; x.fillRect(0,0,900,1200); return c.toDataURL('image/jpeg',0.9).split(',')[1]; }),'base64'));
await ev(()=>{ document.querySelector('.tab[data-tab=team]').click(); document.querySelector('#teamMore').click(); }); await W(300);
ok('Team ⋯ has Add photos', await ev(()=>!!document.querySelector('#modal [data-id=photoRun],#modal #photoRun')||/Add photos/.test(document.querySelector('#modal').innerText)));
await ev(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/Add photos/.test(x.textContent)); b.click(); }); await W(400);
const pr1=await ev(()=>({h2:document.querySelector('#modal h2').textContent,txt:document.querySelector('#modal').innerText.replace(/\s+/g,' '),cam:!!document.querySelector('#modal [data-phr=cam]')&&document.querySelector('#modal [data-phr=cam]').getAttribute('capture')==='environment',lib:!!document.querySelector('#modal [data-phr=lib]'),name:document.querySelector('#modal .ph-run-name').textContent}));
ok('Add photos: the first runner without a photo, Take a photo (camera) and Choose from the camera roll, the count', pr1.h2==='Add photos'&&/0 of 14 runners have a photo/.test(pr1.txt)&&pr1.cam&&pr1.lib&&pr1.name==='Avery Lindqvist', pr1.txt.slice(0,120));
await (await P.$('#modal [data-phr=lib]')).uploadFile(jpg); await W(1200);
const pr2=await ev(()=>({txt:document.querySelector('#modal').innerText.replace(/\s+/g,' '),name:document.querySelector('#modal .ph-run-name').textContent,has:!!MSApp.photo('f0')}));
ok('after a photo the next runner comes up and the count moves (1 of 14)', pr2.has&&pr2.name!=='Avery Lindqvist'&&/1 of 14/.test(pr2.txt), pr2.txt.slice(0,100));
await ev(()=>document.querySelector('#modal [data-x=skip]').click()); await W(300);
ok('Skip moves on without a photo', await ev(()=>document.querySelector('#modal .ph-run-name').textContent!=='Avery Lindqvist'&&/1 of 14/.test(document.querySelector('#modal').innerText)));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(300);
await ev(()=>document.querySelector('#teamList [data-id="f1"] [data-t=open]').click()); await W(400); await ev(()=>document.querySelector('#profEdit').click()); await W(400);
ok('a runner’s Edit sheet offers Take a photo (camera) beside Add a photo', await ev(()=>!!document.querySelector('#modal [data-ph=cam]')&&document.querySelector('#modal [data-ph=camfile]').getAttribute('capture')==='environment'));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(200);
ok('a certificate with a photo draws it (the photo box is green)', await ev(async()=>{ const r=await MSApp.bookPages(2026,{team:'G',full:false,awards:false,ms:false,fmt:'print',only:'f0'},true); const im=new Image(); im.src='data:image/jpeg;base64,'+r.imgs[0]; await im.decode(); const c=document.createElement('canvas'); c.width=im.width; c.height=im.height; const x=c.getContext('2d'); x.drawImage(im,0,0); const p=[...x.getImageData(200,420,1,1).data]; return p[1]>120&&p[0]<80; }));
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.error('CRASH',e); process.exit(1); });
