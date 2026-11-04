// 3.26: quick fixes. Fake names only.
// 1. No "n of m" slide counter on any awards graphic (the letters slides are titled Varsity Letters; the studio's caption still says which slide).
// 2. Settings › Team › Runner photos: the checklist (who has a photo), Take photos: a live camera view with a 4:5 portrait
//    guide (a fake camera here) stepping through the runners without a photo, Skip, Use this photo (cropped 4:5), Done;
//    one runner's sheet from the list. Photos stay in the app (the team sync is e2e48's).
// 3. Award evidence slides (16:9, 1920 × 1080): the criteria in the coach's wording, the recipients' figures only (MVR
//    "2,1,3 = 6 (2.0)" and each race; Most Improved opener vs season best with a chart; Rookie first season, varsity races,
//    places; Letters table), the Mustang Award citation slide (optional text, 400 characters), the typography lint in every
//    palette and background; the slideshow book has a slide per award and its evidence after the board, the print book doesn't.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), fs=require('fs'), path=require('path');
const {seed}=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
const extraG=['Gail Quinn','Hope Ruiz','Iris Stone','Jade Tran','Kate Udo','Lena Vale','Mia Wu','Nell Xu','Oona Yates','Pia Zane','Quinn Abel','Rosa Bell','Sage Cole'];
extraG.forEach((n,i)=>seed.roster.push({id:'x'+i,name:n,group:'',gender:'G'}));
const LINT=`(lines,m,w,h)=>{ const out=[]; const emoji=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B50}]/u;
  lines.forEach(l=>{ const t=l.t, f=l.full||t; const bad=[];
    if(l.role==='h'&&MSApp.apTitle(f)!==f) bad.push('not Title Case'); if(/["']/.test(t)) bad.push('straight quote'); if(emoji.test(t)) bad.push('emoji'); if(/  /.test(t)) bad.push('double space');
    if(l.w>l.box[1]+0.5||l.x<l.box[0]-0.5) bad.push('overflows its box'); if(!l.pill&&!f.replace(/\\s/g,'').includes(t.replace(/\\s/g,''))) bad.push('clipped');
    if(m&&(l.y>h-m+0.5||l.y-l.s<m-0.5)) bad.push('in the clear zone');
    if(bad.length) out.push(bad.join(', ')+': “'+t.slice(0,60)+'”'); }); return out; }`;
const NOT_RECIP=/Finn Underwood|Eli Tate|Gail Quinn/; // never marked for anything below

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-11-20T18:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const closeModal=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(150); };
const openAwards=async()=>{ await closeModal(); await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400); await ev(()=>{ const s=document.querySelector('[data-hlm=season]'); if(s&&s.getAttribute('aria-pressed')!=='true') s.click(); }); await W(300); await ev(()=>{ const a=document.querySelector('[data-ssaw]'); if(a) a.click(); }); await W(600); };
const gfx=(o)=>ev(async o=>{ const r=await MSApp.gfx(2026,{design:'evidence',size:'wide',team:'both',names:'full',...o}); return {w:r.w,h:r.h,text:r.log.map(l=>l.t).join('\n'),log:r.log,png:r.png}; },o);
const mark=(recip)=>ev(r=>MSApp.awPut('s-2026',{k:'s',season:2026},{recip:r}),recip);

console.log('1. No slide counter on the awards graphics');
await mark({'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.mir':['b2'],'G.roty':['g5'],'B.roty':['b3'],'G.mustang':['g4'],'B.mustang':['b5'],'G.letter':['g0','g1','g2','g3','g4','g5',...extraG.map((n,i)=>'x'+i)],'B.letter':['b0','b1','b2','b3','b4','b5']});
await ev(()=>{ MSApp.awPut('r-2026-g1',{k:'r',season:2026,aid:'g1'},{captain:true}); MSApp.awPut('r-2026-b1',{k:'r',season:2026,aid:'b1'},{captain:true}); MSApp.awPut('r-2026-g5',{k:'r',season:2026,aid:'g5'},{hs:1}); MSApp.awPut('r-2026-b3',{k:'r',season:2026,aid:'b3'},{hs:1}); });
const SL=await ev(()=>MSApp.awardSlides(2026,'both'));
const counters=await ev(async()=>{ const out=[]; for(const sl of MSApp.awardSlides(2026,'both')) for(const size of ['tall','sq','story']){ const r=await MSApp.gfx(2026,{design:'awards',size,team:'both',names:'full',subj:sl.id}); r.log.forEach(l=>{ if(/^\d+ of \d+$/.test(l.t)||/Letters, \d+ of \d+/.test(l.t)) out.push(sl.id+' '+size+': '+l.t); }); } return out; });
ok(`no "n of m" on any of the ${SL.length} awards slides in any size (two letters slides among them)`, SL.filter(s=>s.id.startsWith('letters|')).length===2&&!counters.length, counters.slice(0,4).join(' | '));
ok('the second letters slide is titled Varsity Letters on the graphic; the Slide menu still says "Varsity Letters, 2 of 2"', SL.find(s=>s.id==='letters|2').name==='Varsity Letters, 2 of 2'&&await ev(async()=>{ const r=await MSApp.gfx(2026,{design:'awards',size:'tall',team:'both',names:'full',subj:'letters|2'}); return r.log.some(l=>l.t==='Varsity Letters'); }));
await openAwards(); await ev(()=>MSApp.awardsStep('summary')); await W(300); await ev(()=>document.querySelector('#rvHigh [data-awshare]').click()); await W(3500);
ok('the studio’s caption (not the graphic) still says which slide: "slide 1 of"', await ev(()=>/slide 1 of \d+/.test(document.querySelector('#gxCap').textContent)));
await closeModal();

console.log('2. Settings › Team › Runner photos and Take photos');
await ev(()=>{ document.querySelector('#openSettings').click(); }); await W(300); await ev(()=>{ const t=document.querySelector('#modal [data-spage=team]'); if(t) t.click(); }); await W(300);
ok('Settings › Team has a Runner photos row saying how many have one ("0 of 25")', await ev(()=>{ const r=document.querySelector('#setPhotos'); return !!r&&/Runner photos/.test(r.textContent)&&/0 of 25/.test(r.textContent); }), await ev(()=>(document.querySelector('#setPhotos')||{}).textContent));
await ev(()=>document.querySelector('#setPhotos').click()); await W(400);
ok('the checklist: a row per runner, Girls then Boys, each saying No photo yet, with Take photos on top', await ev(()=>{ const m=document.querySelector('#modal'); const rows=[...m.querySelectorAll('[data-phid]')]; return /Runner photos/.test(m.textContent)&&rows.length===25&&rows.every(r=>/No photo yet/.test(r.textContent))&&rows[0].textContent.includes('Ada Fern')&&!!m.querySelector('[data-x=take]')&&!m.querySelector('[data-x=take]').disabled&&/0 of 25 runners have a photo; 25 still need one/.test(m.textContent); }));
ok('every row and button is at least 44 px tall', await ev(()=>[...document.querySelectorAll('#modal [data-phid], #modal [data-x=take]')].every(e=>e.getBoundingClientRect().height>=44)));
await ev(()=>document.querySelector('#modal [data-x=take]').click()); await W(1800);
ok('Take photos: the live camera view with the portrait guide, the first runner without a photo (Ada Fern), Take photo, Camera roll, Skip', await ev(()=>{ const m=document.querySelector('#modal'), cam=m.querySelector('[data-cam]'), v=m.querySelector('video'); return /Take photos/.test(m.textContent)&&!!cam&&!cam.hidden&&v.videoWidth>0&&!!m.querySelector('[data-frame]')&&/portrait 4:5/.test(m.textContent)&&m.querySelector('.ph-run-name').textContent==='Ada Fern'&&!!m.querySelector('[data-x=shot]')&&!!m.querySelector('[data-x=lib]')&&/Skip Ada/.test(m.querySelector('[data-x=skip]').textContent); }));
ok('the guide is a 4:5 portrait frame inside the view', await ev(()=>{ const f=document.querySelector('#modal [data-frame]').getBoundingClientRect(), c=document.querySelector('#modal [data-cam]').getBoundingClientRect(); return Math.abs(f.width/f.height-0.8)<0.02&&f.top>=c.top&&f.bottom<=c.bottom&&f.left>=c.left&&f.right<=c.right; }));
ok('the shutter and the other buttons are at least 44 px', await ev(()=>[...document.querySelectorAll('#modal [data-x=shot], #modal [data-x=lib], #modal [data-x=skip]')].every(e=>e.getBoundingClientRect().height>=44)));
await ev(()=>document.querySelector('#modal [data-x=skip]').click()); await W(300);
ok('Skip moves to the next runner without a photo (Bea Holt); nothing was saved', await ev(()=>document.querySelector('#modal .ph-run-name').textContent==='Bea Holt'&&MSApp.photoCount().have===0));
await ev(()=>document.querySelector('#modal [data-x=shot]').click()); await W(500);
ok('Take photo shows the shot cropped to the frame, with Use this photo and Retake (the camera view hidden meanwhile)', await ev(()=>{ const m=document.querySelector('#modal'); return !!m.querySelector('.cam-prev img')&&!!m.querySelector('[data-x=use]')&&!!m.querySelector('[data-x=retake]')&&m.querySelector('[data-cam]').hidden; }));
await ev(()=>document.querySelector('#modal [data-x=retake]').click()); await W(300);
ok('Retake returns to the live view for the same runner', await ev(()=>!document.querySelector('#modal [data-cam]').hidden&&document.querySelector('#modal .ph-run-name').textContent==='Bea Holt'&&!!document.querySelector('#modal [data-x=shot]')));
await ev(()=>document.querySelector('#modal [data-x=shot]').click()); await W(400); await ev(()=>document.querySelector('#modal [data-x=use]').click()); await W(1500);
const ph=await ev(()=>{ const p=MSApp.photos?MSApp.photos():null; return {count:MSApp.photoCount(),next:document.querySelector('#modal .ph-run-name').textContent,toast:document.querySelector('#toast').textContent}; });
ok('Use this photo saves it for Bea Holt (1 of 25) and the next runner comes up (Cora Lind)', ph.count.have===1&&ph.next==='Cora Lind', JSON.stringify(ph));
const dims=await ev(()=>new Promise(res=>{ const p=MSApp.photoOf?MSApp.photoOf('g1'):null; if(!p){ res(null); return; } const im=new Image(); im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight,wp:p.w,hp:p.h}); im.src=p.data; }));
ok('the saved photo is the 4:5 crop (portrait, 600 × 750 or scaled)', !!dims&&Math.abs(dims.w/dims.h-0.8)<0.02&&dims.h<=750, JSON.stringify(dims));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(500);
ok('Done returns to the checklist: 1 of 25, Bea Holt checked with a thumbnail, the rest still open', await ev(()=>{ const m=document.querySelector('#modal'); const r=m.querySelector('[data-phid="g1"]'); return /Runner photos/.test(m.textContent)&&/1 of 25 runners has a photo; 24 still need one/.test(m.textContent)&&!!r.querySelector('.ph-mini img')&&/Photo added/.test(r.textContent)&&m.querySelectorAll('.ph-mini img').length===1; }));
await ev(()=>document.querySelector('#modal [data-phid="g0"]').click()); await W(400);
ok('a row opens that runner’s photo sheet: Add a photo, Take a photo, and Take photos starting here', await ev(()=>{ const m=document.querySelector('#modal'); return /Ada Fern/.test(m.querySelector('h2').textContent)&&!!m.querySelector('[data-ph=pick]')&&/Add a photo/.test(m.querySelector('[data-ph=pick]').textContent)&&!!m.querySelector('[data-ph=cam]')&&!!m.querySelector('[data-x=live]'); }));
await ev(()=>document.querySelector('#modal [data-x=live]').click()); await W(1500);
ok('…Take photos from here starts with Ada Fern and keeps the others without a photo after her', await ev(()=>document.querySelector('#modal .ph-run-name').textContent==='Ada Fern'&&/23 more after Ada/.test(document.querySelector('#modal').textContent)));
await ev(()=>document.querySelector('#modal [data-x=done]').click()); await W(400);
ok('Done from there goes back to the checklist', await ev(()=>/Runner photos/.test(document.querySelector('#modal').textContent)&&document.querySelectorAll('#modal [data-phid]').length===25));
await ev(()=>document.querySelector('#modal [data-phid="g1"]').click()); await W(400); await ev(()=>document.querySelector('#modal [data-ph=rm]').click()); await W(500);
ok('Remove on a runner’s sheet: the photo goes to Recently deleted with an Undo', await ev(()=>MSApp.photoCount().have===0&&!document.querySelector('#snack').hidden&&/Photo removed/.test(document.querySelector('#snack').textContent)));
await ev(()=>document.querySelector('#snack button').click()); await W(500);
ok('…Undo brings it back', await ev(()=>MSApp.photoCount().have===1));
await closeModal();
await ev(()=>{ document.querySelector('.tab[data-tab=team]').click(); }); await W(300); await ev(()=>document.querySelector('#teamMore').click()); await W(300); await ev(()=>{ const b=[...document.querySelectorAll('#modal button')].find(x=>/Add photos/.test(x.textContent)); if(b) b.click(); }); await W(1500);
ok('Team tab › ⋯ › Add photos opens the same Take photos mode (the next runner without a photo: Ada Fern)', await ev(()=>/Take photos/.test(document.querySelector('#modal h2').textContent)&&document.querySelector('#modal .ph-run-name').textContent==='Ada Fern'));
await closeModal();

console.log('3. Award evidence slides');
const EV={}; for(const k of ['mvr','mir','roty','letter','mustang']) EV[k]=await gfx({subj:k});
ok('each evidence slide is 16:9, 1920 × 1080, with the brand lockup, the award’s name and "Season Awards · Evidence"', Object.values(EV).every(e=>e.w===1920&&e.h===1080&&/LITTLE CHUTE MUSTANGS/.test(e.text)&&/2026 Season Awards · Evidence/.test(e.text))&&/Most Valuable Runner/.test(EV.mvr.text)&&/Most Improved Runner/.test(EV.mir.text)&&/Rookie of the Year/.test(EV.roty.text)&&/Varsity Letter/.test(EV.letter.text)&&/Mustang Award/.test(EV.mustang.text));
ok('MVR: the criteria in the coach’s wording, the places with the total and the average ("1,1,1,1,1 = 5 (1.0)"), both teams, every race listed as nth of n', /place among our varsity runners in each varsity race, averaged: the lowest average wins\. Eligible at 80% of the season’s varsity meets/.test(EV.mvr.text)&&/Girls · Ada Fern/.test(EV.mvr.text)&&/Boys · Abe Park/.test(EV.mvr.text)&&(EV.mvr.text.match(/^\d+(,\d+)* = \d+ \(\d+(\.\d+)?\)$/mg)||[]).length===2&&/Team place in 5 of 5 varsity meets \(100%\) · total 5 · average 1\.0/.test(EV.mvr.text)&&(EV.mvr.text.match(/1st of \d+/g)||[]).length===10&&/Opener Invite/.test(EV.mvr.text), EV.mvr.text.split('\n').slice(4,9).join(' | '));
ok('MVR: the math string matches the Awards page’s for the recipient', await ev(()=>{ const A=MSApp.awards(2026,'G'); const r=A.mvr.ranked.find(x=>x.id==='g0'); return r&&MSApp.evidence(2026,'mvr').per[0].math[0]===r.math&&/^\d+(,\d+)* = \d+ \(\d+(\.\d+)?\)$/.test(r.math); }));
ok('Most Improved: opener vs season best with the adjusted drop, "faster", and a progression chart (the dates along the bottom)', /Season-long: the opener to the season best, adjusted for course and weather/.test(EV.mir.text)&&/Girls · Cora Lind/.test(EV.mir.text)&&/Opener \d+:\d\d(\.\d)? → season best \d+:\d\d(\.\d)? · [\d.:]+ s? ?faster/.test(EV.mir.text)&&/adjusted for course and weather\)/.test(EV.mir.text)&&/5K races this season \(faster is higher\)/.test(EV.mir.text)&&/\n9\/5\n/.test(EV.mir.text)&&/\n10\/3\n/.test(EV.mir.text), EV.mir.text.split('\n').slice(5,8).join(' | '));
ok('Rookie: first high school season, varsity races of the meets, team places, the improvement, a chart', /First high school season · 5 varsity races of 5 meets/.test(EV.roty.text)&&/Team place: #\d(, #\d)+/.test(EV.roty.text)&&/Girls · Fay Orr/.test(EV.roty.text)&&/Boys · Dan Stone/.test(EV.roty.text)&&/faster is higher/.test(EV.roty.text), EV.roty.text.split('\n').slice(5,9).join(' | '));
ok('Letters: the table (Runner, Varsity races, Championship meets, Seasons, Grade) for every letterwinner, 19 girls and 6 boys, the captain marked', /Varsity in a majority of the season’s meets, or varsity at a championship meet/.test(EV.letter.text)&&/Championship meets/.test(EV.letter.text)&&(EV.letter.text.match(/5 of 5 · majority/g)||[]).length>=12&&/Bea Holt · Captain/.test(EV.letter.text)&&/Sage Cole/.test(EV.letter.text)&&/Finn Underwood/.test(EV.letter.text), String((EV.letter.text.match(/5 of 5 · majority/g)||[]).length));
ok('no one who isn’t a recipient of that award appears on its slide (MVR, Most Improved, Rookie)', !NOT_RECIP.test(EV.mvr.text)&&!NOT_RECIP.test(EV.mir.text)&&!NOT_RECIP.test(EV.roty.text)&&!/Cora Lind|Fay Orr/.test(EV.mvr.text)&&!/Ada Fern|Abe Park/.test(EV.mir.text));
ok('no "n of m" counter or ranking of others on an evidence slide', Object.values(EV).every(e=>!/^\d+ of \d+$/m.test(e.text)&&!/Recommended|Tie:|rank points|candidate/i.test(e.text)));
const E0=await ev(()=>MSApp.evidence(2026,'mustang'));
ok('Mustang Award without a citation: not ready (the slide would say only Coaches’ choice)', !E0.ready&&E0.per.length===2&&/Coaches’ choice\./.test(EV.mustang.text));
await openAwards(); await ev(()=>MSApp.awardsStep('summary')); await W(300); // 3.27: the five buttons sit together on the Summary step
ok('the Awards Summary: an Evidence slide button per award, on for the four with recipients, the Mustang one off saying "Write a citation first"', await ev(()=>{ const B=[...document.querySelectorAll('#rvHigh [data-awev]')]; const by=Object.fromEntries(B.map(b=>[b.dataset.awev,b.disabled?b.dataset.why:'on'])); return B.length===5&&by.mvr==='on'&&by.letter==='on'&&by.mir==='on'&&by.roty==='on'&&by.mustang==='Write a citation first'&&B.every(b=>/Evidence slide/.test(b.textContent)&&b.getBoundingClientRect().height>=44); }), await ev(()=>[...document.querySelectorAll('#rvHigh [data-awev]')].map(b=>b.dataset.awev+':'+(b.disabled?b.dataset.why:'on')).join(',')));
await ev(()=>MSApp.awardsStep('mustang')); await W(300);
ok('…and a Banquet citation field per team on the Mustang Award step, 400 characters at most', await ev(()=>{ const F=[...document.querySelectorAll('#rvHigh [data-awcite]')]; return F.length===2&&F[0].dataset.awcite==='G'&&F[1].dataset.awcite==='B'&&F.every(f=>f.maxLength===400)&&/Banquet citation/.test(document.querySelector('#aw-mustang').parentElement.textContent); }));
await ev(()=>{ const f=document.querySelector('#rvHigh [data-awcite="G"]'); f.value='Eve led every warm-up, cheered the last runner home at every meet and never missed a practice.'; f.dispatchEvent(new Event('change',{bubbles:true})); }); await W(400);
ok('leaving the field keeps the citation (synced with the awards document) and turns the Mustang Evidence slide on', await ev(()=>/Eve led every warm-up/.test(MSApp.cite(2026,'G'))&&!document.querySelector('#rvHigh [data-awev=mustang]').disabled&&MSApp.evidence(2026,'mustang').ready));
const EM=await gfx({subj:'mustang'});
ok('the Mustang Award slide: the recipient and the citation for the Girls, Coaches’ choice for the Boys', /Girls · Eve Nash/.test(EM.text)&&/Eve led every warm-up/.test(EM.text)&&/never missed a practice/.test(EM.text)&&/Boys · Finn Underwood/.test(EM.text), EM.text.split('\n').slice(4,8).join(' | '));
ok('a citation longer than 400 characters is cut to 400', await ev(()=>{ MSApp.citeSet(2026,'B','x'.repeat(450)); const n=MSApp.cite(2026,'B').length; MSApp.citeSet(2026,'B',''); return n===400&&MSApp.cite(2026,'B')===''; }));
ok('a team with no recipient has no column (Girls only marked for Rookie → one column)', await ev(async()=>{ MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.mir':['b2'],'G.roty':['g5'],'G.mustang':['g4'],'B.mustang':['b5'],'G.letter':['g0','g1','g2','g3','g4','g5'],'B.letter':['b0','b1','b2','b3','b4','b5']}}); const E=MSApp.evidence(2026,'roty'); const r=await MSApp.gfx(2026,{design:'evidence',size:'wide',team:'both',names:'full',subj:'roty'}); const t=r.log.map(l=>l.t).join('\n'); return E.per.length===1&&E.per[0].t==='G'&&/Girls · Fay Orr/.test(t)&&!/Boys/.test(t); }));
const ALL=await ev(async LINT=>{ const lint=eval(LINT); const out=[]; let n=0; const C=MSApp.gfxCombos(); for(const pal of Object.keys(C)) for(const bg of C[pal]){ if(bg==='photo') continue; for(const k of ['mvr','mir','roty','letter','mustang']){ const r=await MSApp.gfx(2026,{design:'evidence',size:'wide',team:'both',names:'full',pal,bg,subj:k}); n++; const bad=lint(r.log,0,r.w,r.h); if(bad.length) out.push(`${pal}/${bg} ${k}: ${bad.slice(0,2).join('; ')}`); if(r.w!==1920||r.h!==1080) out.push(`${pal}/${bg} ${k}: ${r.w}×${r.h}`); } } return {n,out}; },LINT);
ok(`every evidence slide clean in every passing palette and background (${ALL.n} graphics): nothing overflows or is cut, Title Case headings, no straight quotes`, ALL.n>=50&&!ALL.out.length, ALL.out.slice(0,5).join(' | '));
await ev(()=>{ MSApp.awPut('s-2026',{k:'s',season:2026},{recip:{'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.mir':['b2'],'G.roty':['g5'],'B.roty':['b3'],'G.mustang':['g4'],'B.mustang':['b5'],'G.letter':['g0','g1','g2','g3','g4','g5'],'B.letter':['b0','b1','b2','b3','b4','b5']}}); });
const LET=await gfx({subj:'letter'});
ok('one font size for the whole letters table (every cell the same size)', (()=>{ const rows=LET.log.filter(l=>/^(Ada Fern|Abe Park|5 of 5 · majority|–|1|2)$/.test(l.t)); const sizes=new Set(rows.map(l=>Math.round(l.s))); return rows.length>=10&&sizes.size===1; })(), [...new Set(LET.log.filter(l=>/^(Ada Fern|5 of 5 · majority|–)$/.test(l.t)).map(l=>Math.round(l.s)))].join(','));

console.log('4. The slideshow book');
const bk=(o)=>ev(async(o,LINT)=>{ const r=await MSApp.bookPages(2026,{team:'both',full:false,awards:true,ms:false,...o}); return {n:r.n,text:r.log.map(l=>l.t).join('\n'),bad:eval(LINT)(r.log,o.fmt==='screen'?72:75,r.w,r.h),heads:r.log.filter(l=>l.role==='h').map(l=>l.t)}; },o,LINT);
const SC=await bk({fmt:'screen'}), PR=await bk({fmt:'print'}), SC0=await ev(async()=>(await MSApp.bookPages(2026,{team:'both',full:false,awards:false,ms:false,fmt:'screen'})).n);
ok('screen format with awards: the board, then a slide per award and its evidence slide (MVR, Most Improved, Rookie, Mustang Award, Varsity Letters), then the captains: 11 pages more than the board alone', SC.n===SC0+1+11&&/How the Award Is Decided/.test(SC.text), `${SC.n} vs ${SC0}`);
const after=SC.text.slice(SC.text.indexOf('\nAwards\n'));
ok('…in that order, each evidence slide after its award', (()=>{ const seq=['Most Valuable Runner','How the Award Is Decided','Most Improved Runner','How the Award Is Decided','Rookie of the Year','How the Award Is Decided','Mustang Award','How the Award Is Decided','Varsity Letter','How the Award Is Decided','Captains']; let i=0; for(const s of seq){ const j=after.indexOf(s,i); if(j<0) return false; i=j+s.length; } return true; })(), SC.heads.slice(-24).join(' | '));
ok('…the MVR evidence page carries the math and the criteria; the Mustang page the citation', /1,1,1,1,1 = 5 \(1\.0\)/.test(after)&&/lowest average wins/.test(after)&&/Eve led every warm-up/.test(after));
ok('…every line fits its box with the 72 px margins', !SC.bad.length, SC.bad.slice(0,4).join(' | '));
ok('print format: the Awards Board page only (no evidence pages)', !/How the Award Is Decided/.test(PR.text)&&/Most Valuable Runner/.test(PR.text)&&PR.n<SC.n, `${PR.n} vs ${SC.n}`);
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
