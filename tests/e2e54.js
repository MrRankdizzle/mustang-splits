// 3.25: Season Awards graphics. Fake names only.
// 1. Only the recipients marked in Awards appear (never a candidate, the MVR math, a checklist, a note); Captains when marked.
// 2. The announcement hold: previews work, Share is off with "Awards haven't been announced yet." until an admin taps
//    Awards announced (with an Undo); then Share this slide and Share all are on.
// 3. The set: Awards Board, a spotlight per winner with the award icon, a photo or the stand-in, grade and facts, slide
//    no counter since 3.26; Varsity Letters grids for 1, 2, 6 and 20 letterwinners (and two slides for 25); Captains.
// 4. Sizes 4:5 (default), square and story: every slide passes the typography lint (nothing overflows, nothing clipped,
//    stories keep the top and bottom 250 px clear) in every palette and background that passes the contrast check.
// 5. The icon set in the Awards section and the banquet book's Awards page in the board's layout.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), fs=require('fs'), path=require('path');
const {seed}=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
// a bigger roster for the 20- and 25-name grids
const extraG=['Gail Quinn','Hope Ruiz','Iris Stone','Jade Tran','Kate Udo','Lena Vale','Mia Wu','Nell Xu','Oona Yates','Pia Zane','Quinn Abel','Rosa Bell','Sage Cole'];
extraG.forEach((n,i)=>seed.roster.push({id:'x'+i,name:n,group:'',gender:'G'}));
const LINT=`(lines,m,w,h)=>{ const out=[]; const emoji=/[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B50}]/u;
  lines.forEach(l=>{ const t=l.t, f=l.full||t; const bad=[];
    if(l.role==='h'&&MSApp.apTitle(f)!==f) bad.push('not Title Case'); if(/["']/.test(t)) bad.push('straight quote'); if(emoji.test(t)) bad.push('emoji'); if(/  /.test(t)) bad.push('double space');
    if(l.w>l.box[1]+0.5||l.x<l.box[0]-0.5) bad.push('overflows its box'); if(!l.pill&&!f.replace(/\\s/g,'').includes(t.replace(/\\s/g,''))) bad.push('clipped');
    if(m&&(l.y>h-m+0.5||l.y-l.s<m-0.5)) bad.push('in the story’s clear zone');
    if(bad.length) out.push(bad.join(', ')+': “'+t.slice(0,60)+'”'); }); return out; }`;
const COACH=/Next step|next target|Growth focus|check in|good standing|candidate|Tie: coaches|rank points|average place|Needs \d|not a majority|majority|Coaches only|Coach notes|Injury|Illness|sore knee|\d+ of \d+ varsity meets|= \d+ \(/i;

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-11-20T18:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const closeModal=async()=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await W(150); };
const openAwards=async()=>{ await closeModal(); await ev(()=>{ document.querySelector('.tab[data-tab=results]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400); await ev(()=>{ const s=document.querySelector('[data-hlm=season]'); if(s&&s.getAttribute('aria-pressed')!=='true') s.click(); }); await W(300); await ev(()=>{ const a=document.querySelector('[data-ssaw]'); if(a) a.click(); }); await W(500); };
const gfx=(o)=>ev(async o=>{ const r=await MSApp.gfx(2026,{design:'awards',size:'tall',team:'both',names:'full',...o}); return {w:r.w,h:r.h,text:r.log.map(l=>l.t).join('\n'),log:r.log,png:r.png}; },o);
const slides=()=>ev(()=>MSApp.awardSlides(2026,'both'));
const mark=(recip)=>ev(r=>MSApp.awPut('s-2026',{k:'s',season:2026},{recip:r}),recip);
const names=ids=>ids.map(id=>seed.roster.find(a=>a.id===id).name);

console.log('1. Only the marked recipients');
let S0=await slides();
ok('nothing marked: one slide, the board, saying to mark the winners (no names, nothing coach-only)', S0.length===1&&S0[0].id==='board'&&await gfx({subj:'board'}).then(g=>/Mark the winners/.test(g.text)&&!COACH.test(g.text)&&!/Ada Fern|Abe Park/.test(g.text)));
await mark({'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.roty':['b3'],'A.mustang':['g4'],'G.mustang':['g4'],'G.letter':['g0','g1','g2','g3','g4','g5'],'B.letter':['b0','b1']});
await ev(()=>{ MSApp.awPut('r-2026-g1',{k:'r',season:2026,aid:'g1'},{captain:true}); MSApp.awPut('r-2026-b1',{k:'r',season:2026,aid:'b1'},{captain:true}); MSApp.awPut('r-2026-g0',{k:'r',season:2026,aid:'g0'},{grade:11}); });
let SL=await slides();
ok('the set: board, five spotlights (MVR ×2, Most Improved, Rookie, Mustang Award), Varsity Letters, Captains = 8 slides, numbered', SL.length===8&&SL[0].id==='board'&&SL.filter(s=>s.id.startsWith('spot|')).length===5&&SL.some(s=>s.id==='letters|1')&&SL[7].id==='captains'&&SL.every((s,i)=>s.i===i+1&&s.n===8), JSON.stringify(SL.map(s=>s.id)));
const board=await gfx({subj:'board'});
ok('Awards Board: "2026 Season Awards", every award with Girls and Boys winners, the letterwinners and the captains', /2026 Season Awards/.test(board.text)&&/Most Valuable Runner/.test(board.text)&&/Girls · Ada Fern/.test(board.text)&&/Boys · Abe Park/.test(board.text)&&/Most Improved Runner/.test(board.text)&&/Cora Lind/.test(board.text)&&/Rookie of the Year/.test(board.text)&&/Dot Marsh/.test(board.text)&&/Mustang Award/.test(board.text)&&/Eve Nash/.test(board.text)&&/Varsity Letters/.test(board.text)&&/Ben Quill/.test(board.text)&&/Captains/.test(board.text)&&/Bea Holt/.test(board.text), board.text.slice(0,300).replace(/\n/g,' | '));
ok('…no one who isn’t a recipient (Finn Underwood, Cal Reyes), nothing coach-only, no math', !/Finn Underwood|Cal Reyes|Eli Tate/.test(board.text)&&!COACH.test(board.text), (board.text.match(COACH)||[''])[0]);
const sp=await gfx({subj:'spot|G.mvr|g0'});
ok('a spotlight: the award, the name, grade and team, one or two facts, no slide counter (3.26)', /Girls Most Valuable Runner/.test(sp.text)&&/Ada Fern/.test(sp.text)&&/Grade \d+ · Girls/.test(sp.text)&&/Season best \d+:\d\d\.\d \(5K\)/.test(sp.text)&&!/\d+ of \d+/.test(sp.text)&&!COACH.test(sp.text), sp.text.replace(/\n/g,' | '));
const facts=await ev(()=>MSApp.awardFacts('g0',2026));
ok('facts come from the season (season best, PRs or seasons on varsity), at most two', facts.length>=1&&facts.length<=2&&facts.every(f=>/Season best|PR|season on varsity|State Qualifier/.test(f)), JSON.stringify(facts));
ok('the stand-in photo: initials in a disc (no photo in the data), the slide still clean', (()=>{ const L=sp.log.filter(l=>l.t==='AF'); return L.length===1; })(), sp.log.filter(l=>l.t.length<=2).map(l=>l.t).join());
const cp=await gfx({subj:'captains'});
ok('Captains slide: both captains, no one else', /Captains/.test(cp.text)&&/Bea Holt/.test(cp.text)&&/Ben Quill/.test(cp.text)&&!/Ada Fern|Abe Park/.test(cp.text));
ok('team filter: Girls only drops the Boys MVR and Rookie slides', await ev(()=>{ const L=MSApp.awardSlides(2026,'G'); return !L.some(s=>s.id.startsWith('spot|B.'))&&L.some(s=>s.id==='spot|G.mvr|g0')&&L.find(s=>s.id==='captains').people.join()==='g1'; }));

console.log('2. The announcement hold');
await openAwards(); await ev(()=>MSApp.awardsStep('summary')); await W(300); // 3.27: the flow's Summary step
ok('the Awards Summary has Share awards and an Awards announced switch (off), with the icon set (trophy, trending-up, star, Mustang, letter badge)', await ev(()=>{ const a=document.querySelector('#rvHigh .aw'); const sw=a.querySelector('[data-awann]'); return !!a.querySelector('[data-awshare]')&&sw&&!sw.checked&&!sw.disabled&&a.querySelectorAll('.aw-sum svg.ic').length>=5&&!!a.querySelector('.aw-sum .ic-mu'); }));
await ev(()=>document.querySelector('#rvHigh [data-awshare]').click()); await W(3500);
ok('Share awards opens the studio on Season Awards at 4:5, the preview drawn, a Slide menu', await ev(()=>{ const m=document.querySelector('#modal'); return /Season Awards/.test(m.querySelector('.gx-tt').textContent)&&m.querySelector('[data-gx=size][data-v=tall]').getAttribute('aria-pressed')==='true'&&m.querySelector('.gx-stage').classList.contains('tall')&&!!m.querySelector('#gxImg').src&&/4:5, 1080 × 1350/.test(m.querySelector('#gxCap').textContent)&&/slide 1 of 8/.test(m.querySelector('#gxCap').textContent); }));
ok('…Share this slide and Share all 8 are off: "Awards haven’t been announced yet."', await ev(()=>{ const s=document.querySelector('#overlay .gx-foot [data-x=share]'), a=document.querySelector('#overlay .gx-foot [data-x=shareall]'); return s.disabled&&a.disabled&&/haven’t been announced/.test(s.dataset.why)&&/haven’t been announced/.test(a.dataset.why)&&a.textContent.trim()==='Share all 8'&&/haven’t been announced/.test(document.querySelector('#overlay .gx-hold').textContent); }));
ok('the size toggle has three options, none clipped; the toolbar covers no control at the end of the scroll', await ev(()=>{ const m=document.querySelector('#modal'); const b=[...m.querySelectorAll('.gx-size button')]; m.scrollTop=1e6; const bar=document.querySelector('#overlay .sheet-toolbar').getBoundingClientRect(); const last=[...m.querySelectorAll('button,select,input')].filter(x=>x.offsetParent).map(x=>x.getBoundingClientRect()).filter(r=>r.bottom>bar.top&&r.top<bar.bottom&&!document.querySelector('#overlay .sheet-toolbar').contains(document.elementFromPoint(r.left+1,r.top+1)||m)); return b.length===3&&b.every(x=>x.scrollWidth<=x.clientWidth+1)&&last.length===0; }));
await closeModal(); await openAwards(); await ev(()=>MSApp.awardsStep('summary')); await W(300);
await ev(()=>document.querySelector('#rvHigh [data-awann]').click()); await W(400);
ok('Awards announced: on, saved for the team (announced, when, by whom), an Undo offered', await ev(()=>{ const d=MSApp.getAwards().find(x=>x.id==='s-2026'); return d.announced===true&&d.announcedAt>0&&d.announcedBy==='Coach Ann'&&MSApp.awardsAnnounced(2026)&&!document.querySelector('#snack').hidden&&/announced/.test(document.querySelector('#snackText').textContent); }));
await ev(()=>document.querySelector('#snackBtn').click()); await W(300);
ok('…Undo takes it back', await ev(()=>!MSApp.awardsAnnounced(2026)&&!document.querySelector('#rvHigh [data-awann]').checked));
await ev(()=>MSApp.announceAwards(2026,true)); await W(300);
ok('…recipients and captains are untouched by the announcement', await ev(()=>{ const d=MSApp.getAwards().find(x=>x.id==='s-2026'); return d.recip['G.mvr'].join()==='g0'&&d.recip['G.letter'].length===6; }));
await ev(()=>document.querySelector('#rvHigh [data-awshare]').click()); await W(3500);
ok('announced: Share this slide and Share all are on, no hold line', await ev(()=>{ const s=document.querySelector('#overlay .gx-foot [data-x=share]'), a=document.querySelector('#overlay .gx-foot [data-x=shareall]'); return !s.disabled&&!a.disabled&&!document.querySelector('#overlay .gx-hold'); }));
ok('the caption congratulates the winners only, with the hashtags', await ev(()=>{ const t=document.querySelector('#gxCapTxt').textContent; return /Congratulations to our 2026 season award winners/.test(t)&&/Ada Fern/.test(t)&&/Varsity Letters to 8 Mustangs/.test(t)&&/Captains: Bea Holt and Ben Quill/.test(t)&&/#LittleChuteXC/.test(t)&&!/Fay Orr/.test(t); }));
await ev(()=>{ const s=document.querySelector('#modal [data-gs=subj]'); s.value='spot|B.mvr|b0'; s.dispatchEvent(new Event('change')); }); await W(2500);
ok('a slide picked from the menu: the preview and the caption follow (Abe Park, Boys MVR)', await ev(()=>/slide 3 of 8/.test(document.querySelector('#gxCap').textContent)&&/Congratulations to Abe Park, our 2026 Boys Most Valuable Runner/.test(document.querySelector('#gxCapTxt').textContent)));
await closeModal();

console.log('3. Letters grids and sizes');
const lintG=async o=>ev(async(o,LINT)=>{ const lint=eval(LINT); const r=await MSApp.gfx(2026,{design:'awards',team:'both',names:'full',...o}); return {w:r.w,h:r.h,bad:lint(r.log,o.size==='story'?250:0,r.w,r.h),n:r.log.length,text:r.log.map(l=>l.t).join('\n')}; },o,LINT);
for(const [n,ids] of [[1,['g0']],[2,['g0','b0']],[6,['g0','g1','g2','g3','g4','g5']],[20,['g0','g1','g2','g3','g4','g5','b0','b1','b2','b3','b4','b5','x0','x1','x2','x3','x4','x5','x6','x7']]]){
  await mark({'G.mvr':['g0'],'G.letter':ids.filter(i=>i[0]!=='b'),'B.letter':ids.filter(i=>i[0]==='b')});
  for(const size of ['tall','sq','story']){ const r=await lintG({subj:'letters|1',size}); const nm=names(ids);
    ok(`Varsity Letters, ${n} letterwinner${n===1?'':'s'}, ${size}: every name on the slide, nothing overflows or clipped`, nm.every(x=>r.text.includes(x))&&!r.bad.length&&r.w===1080&&r.h===(size==='story'?1920:size==='tall'?1350:1080), r.bad.slice(0,4).join(' | ')); } }
await mark({'G.mvr':['g0'],'G.letter':['g0','g1','g2','g3','g4','g5','x0','x1','x2','x3','x4','x5','x6','x7','x8','x9','x10','x11','x12'],'B.letter':['b0','b1','b2','b3','b4','b5']});
SL=await slides();
ok('25 letterwinners: two Varsity Letters slides (20 + 5), "Varsity Letters, 1 of 2"', SL.filter(s=>s.id.startsWith('letters|')).length===2&&SL.find(s=>s.id==='letters|1').people.length===20&&SL.find(s=>s.id==='letters|2').people.length===5&&SL.find(s=>s.id==='letters|1').name==='Varsity Letters, 1 of 2', JSON.stringify(SL.map(s=>s.id)));
const l2=await lintG({subj:'letters|2',size:'tall'});
ok('…the second slide holds the last five (the boys), clean', /Finn Underwood/.test(l2.text)&&!/Ada Fern|Sage Cole/.test(l2.text)&&!l2.bad.length, l2.bad.join(' | '));

console.log('4. Every slide, every size, every palette and background: lint and contrast');
await mark({'G.mvr':['g0'],'B.mvr':['b0'],'G.mir':['g2'],'B.roty':['b3'],'G.mustang':['g4'],'G.letter':['g0','g1','g2','g3','g4','g5'],'B.letter':['b0','b1']});
const ALL=await ev(async LINT=>{ const lint=eval(LINT); const out=[]; let n=0; const C=MSApp.gfxCombos(); for(const pal of Object.keys(C)) for(const bg of C[pal]){ if(bg==='photo') continue; for(const sl of MSApp.awardSlides(2026,'both')) for(const size of ['tall','sq','story']){ const r=await MSApp.gfx(2026,{design:'awards',size,team:'both',names:'full',pal,bg,subj:sl.id}); n++; const bad=lint(r.log,size==='story'?250:0,r.w,r.h); if(bad.length) out.push(`${pal}/${bg} ${sl.id} ${size}: ${bad.slice(0,2).join('; ')}`); if(!r.log.length) out.push(`${pal}/${bg} ${sl.id} ${size}: empty`); } } return {n,out}; },LINT);
ok(`every slide clean in every passing palette and background and all three sizes (${ALL.n} graphics)`, ALL.n>=100&&!ALL.out.length, ALL.out.slice(0,6).join(' | '));
ok('every offered palette × background passes the contrast check (ink 4.5:1, accents and team colours 3:1)', await ev(()=>{ const C=MSApp.gfxCombos(); return Object.keys(C).every(p=>C[p].every(bg=>MSApp.exOk(p,bg))); }));
ok('the names format follows the studio (Initials)', await ev(async()=>{ const r=await MSApp.gfx(2026,{design:'awards',size:'tall',team:'both',names:'init',subj:'board'}); const t=r.log.map(l=>l.t).join('\n'); return /A\. F\./.test(t)&&!/Ada Fern/.test(t); }));

console.log('5. The banquet book’s Awards page');
const bk=await ev(async()=>{ const r=await MSApp.bookPages(2026,{team:'both',full:false,awards:true,ms:false,fmt:'print'}); const pg=r.pages?r.pages:null; return {n:r.n,text:r.log.map(l=>l.t).join('\n')}; });
ok('the Awards page uses the board’s layout: "2026 Season Awards", every award, winners, letterwinners, captains; nothing coach-only', /2026 Season Awards/.test(bk.text)&&/Most Valuable Runner/.test(bk.text)&&/Girls · Ada Fern/.test(bk.text)&&/Varsity Letters/.test(bk.text)&&/Captains/.test(bk.text)&&!COACH.test(bk.text), (bk.text.match(COACH)||[''])[0]);
const bkNo=await ev(async()=>{ const r=await MSApp.bookPages(2026,{team:'both',full:false,awards:false,ms:false,fmt:'print'}); return r.log.map(l=>l.t).join('\n'); });
ok('…and not when Include awards is off', !/Most Valuable Runner/.test(bkNo));
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
