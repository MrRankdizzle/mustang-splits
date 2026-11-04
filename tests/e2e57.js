// 3.28: the share studio's top. Fake names only.
// 1. One picker: the sheet title ("Results Board" with the meet beneath it and a ⌄) opens a pull-down with a Design
//    section and a Meets section (newest first); no Design / Meet rows under the title; a pick updates the title, the
//    preview and the gallery; a gallery card switches the design and the title follows.
// 2. Team (Girls / Boys / Both) is a small segmented control right above the preview for the designs that use it;
//    Spotlight gets a runner picker in that spot instead.
// 3. Order on screen: title, Team control, preview with the size toggle, Designs, Colors, Background, Names, caption, Share.
// 4. Results Board with 1, 2, 3, 7 and 12 runners: a card is never more than one-third empty (1 = the spotlight layout,
//    2 = two tall cards, 3+ = rows); nothing overflows or is cut.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), fs=require('fs'), path=require('path');
const {seed}=require('./tools/fake-season.js');
const URL=process.env.URL||'http://localhost:8765/', OUT=path.join(__dirname,'out'); fs.mkdirSync(OUT,{recursive:true});
// race days with 1, 2, 3 and 7 runners beside the planted season (whose days have 12)
const extra=[['2026-10-10',['b1'],'sF','cA'],['2026-10-17',['g0','b0'],'sG','cB'],['2026-10-18',['g0','g1','b0'],'sI','cA'],['2026-10-20',['g0','g1','g2','g3','b0','b1','b2'],'sJ','cB']];
const tOf={b1:1060,g0:1190,g1:1250,g2:1298,g3:1320,b0:1025,b2:1130};
extra.forEach(([date,ids,sid,cid],k)=>{ ['G','B'].forEach(g=>{ const rs=ids.filter(id=>id[0]===g.toLowerCase()); if(!rs.length) return; const rid='y'+k+g;
  const marks=rs.map((id,i)=>({id:rid+id,ci:0,rid:id,t:(tOf[id]||1300+i*17)-(k===3?2:0),dev:'d',byName:'',at:0,chosen:false,deleted:false,hist:[]}));
  seed.raceLog.unshift({id:'h'+rid,date,savedAtMs:Date.parse(date+'T20:00'),uploaded:false,edits:[],race:{name:'Small meet '+k,raceId:rid,courseId:cid,courseName:'',goalSrc:'none',meetId:'my'+k,seriesId:sid,division:g+'V',checkpoints:[{id:'k3',name:'Finish',dist:5000,unit:'m'}],rows:rs.map(id=>({id,name:seed.roster.find(a=>a.id===id).name,marks:marks.filter(m=>m.rid===id).map(m=>m.id)})),marks,gun:Date.parse(date+'T10:00'),status:'done'}}); });
  seed.series.push({id:sid,name:['Solo Sectional','Pair Classic','Trio Invite','Seven Up Invite'][k]}); seed.meets.push({id:'my'+k,seriesId:sid,courseId:cid,date,time:'',kind:'Invite',levels:['V'],season:2026}); });

(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const P=await T.open(b,{seed,url:URL,now:'2026-10-30T16:00:00'}); const ev=(f,...a)=>P.evaluate(f,...a);
const open=async o=>{ await ev(()=>{ document.querySelector('#overlay').hidden=true; }); await ev(o=>MSApp.openStudio(o),o); await W(2500); };
const title=()=>ev(()=>({t:document.querySelector('#modal .gx-tt').textContent,s:document.querySelector('#modal .gx-ts').textContent.replace('⌄','').trim(),chev:!!document.querySelector('#modal .gx-title .chev-d')}));

console.log('1. One picker: the title');
await open({design:'board',subj:'2026-10-03'});
let t=await title();
ok('the title is "Results Board" with the meet beneath it and a ⌄; no Design or Meet rows under it', t.t==='Results Board'&&/Mustang Invite, Sat, Oct 3/.test(t.s)&&t.chev&&await ev(()=>!document.querySelector('#modal .gx-pickers')&&!document.querySelector('#modal [data-gs]')&&!/^(Design|Meet)$/.test([...document.querySelectorAll('#modal .ios-l')].map(e=>e.textContent.trim()).join('|'))), JSON.stringify(t));
await ev(()=>document.querySelector('#modal [data-x=pick]').click()); await W(300);
const menu=await ev(()=>{ const m=document.querySelector('.pd-menu'); if(!m) return null; const secs=[...m.querySelectorAll('.pd-sec')].map(s=>({h:s.querySelector('.pd-h').textContent,items:[...s.querySelectorAll('.pd-it')].map(i=>({k:i.dataset.pdk,l:i.querySelector('.pd-tx').textContent,on:i.getAttribute('aria-checked')==='true'}))})); return {secs,role:m.getAttribute('role'),h44:[...m.querySelectorAll('.pd-it')].every(i=>i.getBoundingClientRect().height>=44)}; });
ok('tapping it opens one iOS pull-down menu with two sections: Design and Meets', !!menu&&menu.role==='menu'&&menu.secs.length===2&&menu.secs[0].h==='Design'&&menu.secs[1].h==='Meets'&&menu.h44, JSON.stringify(menu&&menu.secs.map(s=>s.h)));
ok('Design lists the eight designs in order (Photo only when a runner has a photo: none here) with Results Board checked', !!menu&&menu.secs[0].items.map(i=>i.l).join('|')==='Meet Recap|Results Board|Spotlight|Milestone|Editorial|Season Wrap|Season Awards'&&menu.secs[0].items.find(i=>i.l==='Results Board').on, menu&&menu.secs[0].items.map(i=>i.l).join('|'));
ok('Meets lists the recent meets newest first with the current one checked', !!menu&&(()=>{ const L=menu.secs[1].items; const d=L.map(i=>i.k.slice(2)); return L.length>=8&&d.every((v,i)=>!i||v<=d[i-1])&&L.find(i=>i.on).k==='s:2026-10-03'&&/Seven Up Invite/.test(L[0].l); })(), menu&&menu.secs[1].items.slice(0,3).map(i=>i.l).join(' ; '));
await ev(()=>document.querySelector('.pd-menu [data-pdk="s:2026-10-17"]').click()); await W(2500);
t=await title();
ok('picking a meet closes the menu, updates the title line and redraws the preview for that meet', t.t==='Results Board'&&/Pair Classic, Sat, Oct 17/.test(t.s)&&await ev(()=>!document.querySelector('.pd-menu')&&!!document.querySelector('#gxImg').src&&/Pair Classic/.test(document.querySelector('#gxCapTxt').textContent)), JSON.stringify(t));
await ev(()=>document.querySelector('#modal [data-x=pick]').click()); await W(200); await ev(()=>document.querySelector('.pd-menu [data-pdk="d:recap"]').click()); await W(2000);
t=await title();
ok('picking a design from the menu switches the design; the title and the gallery follow', t.t==='Meet Recap'&&await ev(()=>document.querySelector('#modal .gx-card[aria-selected=true]').dataset.gd==='recap'), JSON.stringify(t));
await ev(()=>document.querySelector('#modal [data-gd=board]').click()); await W(2000);
t=await title();
ok('the gallery under the preview still switches designs and the title updates to match', t.t==='Results Board'&&await ev(()=>document.querySelector('#modal .gx-card[aria-selected=true]').dataset.gd==='board'), JSON.stringify(t));
await open({design:'awards',size:'tall'});
ok('Season Awards: the second section is Slides', await ev(()=>{ document.querySelector('#modal [data-x=pick]').click(); const H=[...document.querySelectorAll('.pd-menu .pd-h')].map(h=>h.textContent); document.querySelector('#modal [data-x=pick]').click(); return H.join('|')==='Design|Slides'||H.join('|')==='Design|Slide'; }));
await open({design:'milestone'});
ok('Milestone: the second section is Milestones; Season Wrap has Design only', await ev(()=>{ document.querySelector('#modal [data-x=pick]').click(); const H=[...document.querySelectorAll('.pd-menu .pd-h')].map(h=>h.textContent); document.querySelector('#modal [data-x=pick]').click(); return /^Milestones?$/.test(H[1]||''); })&&await (async()=>{ await open({design:'wrap'}); return ev(()=>{ document.querySelector('#modal [data-x=pick]').click(); const n=document.querySelectorAll('.pd-menu .pd-sec').length; document.querySelector('#modal [data-x=pick]').click(); return n===1; }); })());

console.log('2. Team above the preview; Spotlight gets a runner picker');
for(const d of ['board','recap','milestone']){ await open({design:d}); ok(`${d}: a Girls / Boys / Both segmented control sits directly above the preview (44 pt), nowhere else`, await ev(()=>{ const c=document.querySelector('#modal .gx-ctl .gx-team'), st=document.querySelector('#modal .gx-stage'); return !!c&&c.nextElementSibling===null&&c.parentElement.nextElementSibling===st&&[...c.querySelectorAll('button')].map(b=>b.textContent).join('|')==='Girls|Boys|Both'&&[...c.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44)&&document.querySelectorAll('#modal [data-gx=team]').length===3; })); }
await open({design:'board',subj:'2026-10-03'}); await ev(()=>document.querySelector('#modal [data-gx=team][data-v=G]').click()); await W(2000);
ok('Girls narrows the board to the girls (the caption says 6 Mustangs raced, no boys)', await ev(()=>document.querySelector('#modal [data-gx=team][data-v=G]').getAttribute('aria-pressed')==='true'&&/6 Mustangs raced/.test(document.querySelector('#gxCapTxt').textContent)&&!/Abe Park/.test(document.querySelector('#gxCapTxt').textContent)), await ev(()=>document.querySelector('#gxCapTxt').textContent.slice(0,80)));
await open({design:'spot'});
ok('Spotlight: a runner picker in the same spot (the runner’s name and a ⌄), no Team control', await ev(()=>{ const r=document.querySelector('#modal .gx-ctl [data-x=runner]'); return !!r&&!document.querySelector('#modal .gx-team')&&/Ada Fern|Abe Park|\w+ \w+/.test(r.textContent)&&!!r.querySelector('.chev-d')&&r.getBoundingClientRect().height>=44; }));
await ev(()=>document.querySelector('#modal [data-x=runner]').click()); await W(300);
const rm=await ev(()=>{ const m=document.querySelector('.pd-menu'); return m?{h:m.querySelector('.pd-h').textContent,n:m.querySelectorAll('.pd-it').length}:null; });
ok('…it opens a pull-down of runners', !!rm&&rm.h==='Runner'&&rm.n>=10, JSON.stringify(rm));
const pick=await ev(()=>{ const it=[...document.querySelectorAll('.pd-menu .pd-it')].find(i=>!/Ada Fern/.test(i.textContent)); const l=it.querySelector('.pd-tx').textContent; it.click(); return l; }); await W(2500);
ok('…picking one changes the runner (the title line and the picker say the new name)', await ev(l=>{ const nm=l.split(':')[0].trim(); return document.querySelector('#modal .gx-ts').textContent.includes(nm)&&document.querySelector('#modal [data-x=runner]').textContent.includes(nm); },pick), pick);
ok('the title menu for Spotlight has Design only (the runner is picked above the preview)', await ev(()=>{ document.querySelector('#modal [data-x=pick]').click(); const n=document.querySelectorAll('.pd-menu .pd-sec').length; document.querySelector('#modal [data-x=pick]').click(); return n===1; }));

console.log('3. Order on screen');
await open({design:'board',subj:'2026-10-03'});
const order=await ev(()=>{ const m=document.querySelector('#modal'); const S=[['.gx-title','title'],['.gx-ctl','team'],['.gx-stage','preview'],['.gx-size','size toggle'],['.gx-gallery','designs'],['.gx-pals','palettes'],['.gx-bgrid','background'],['.gx-names','names'],['.gx-caption','caption']]; const tops=S.map(([s,n])=>({n,y:(m.querySelector(s)||{getBoundingClientRect:()=>({top:-1})}).getBoundingClientRect().top+ (m.querySelector(s)?window.scrollY:0)})); const toolbar=document.querySelector('#overlay .sheet-toolbar [data-x=share]'); return {tops,toolbar:!!toolbar,fixed:toolbar&&getComputedStyle(toolbar.parentElement).position}; });
ok('title, Team control, preview with the size toggle, Designs, Palettes, Background, Names, caption, then the Share toolbar', order.tops.every((o,i)=>o.y>=0&&(i===0||o.y>=order.tops[i-1].y-1))&&order.tops[3].y<order.tops[4].y&&order.toolbar, JSON.stringify(order.tops.map(o=>o.n+':'+Math.round(o.y))));

console.log('4. Results Board with 1, 2, 3, 7 and 12 runners: the card fills');
const board=async(date,size)=>ev(async(date,size)=>{ const r=await MSApp.gfx(2026,{design:'board',size,team:'both',names:'full',pal:'navysky',bg:'stripes',subj:date}); const L=r.log; const top=size==='story'?250:56, bot=r.h-(size==='story'?250:56); const low=Math.max(...L.map(l=>l.y+l.h)); const bad=L.filter(l=>l.w>l.box[1]+0.5||l.x<l.box[0]-0.5||(!l.pill&&!(l.full||l.t).replace(/\s/g,'').includes(l.t.replace(/\s/g,'')))).map(l=>l.t); return {empty:+((bot-low)/(bot-top)).toFixed(2),lines:L.map(l=>l.t),sizes:L.map(l=>[l.t,Math.round(l.s)]),bad}; },date,size);
const DAYS=[['2026-10-10',1,['Ben Quill']],['2026-10-17',2,['Ada Fern','Abe Park']],['2026-10-18',3,['Ada Fern','Bea Holt','Abe Park']],['2026-10-20',7,['Ada Fern','Bea Holt','Cora Lind','Dot Marsh','Abe Park','Ben Quill','Cal Reyes']],['2026-10-03',12,['Ada Fern','Finn Underwood']]];
for(const [date,n,names] of DAYS) for(const size of ['sq','story']){ const r=await board(date,size);
  ok(`${n} runner${n===1?'':'s'}, ${size}: every name and time on the card, nothing cut, never more than one-third empty (${Math.round(r.empty*100)}% empty)`, names.every(nm=>r.lines.includes(nm))&&r.lines.some(l=>/^\d+:\d\d\.\d$/.test(l))&&!r.bad.length&&r.empty<=0.34, `${r.empty} ${r.bad.slice(0,2).join('|')}`); }
const one=await board('2026-10-10','sq'), two=await board('2026-10-17','sq');
ok('one runner: the Spotlight layout (the time at least 180 px, the name at least 70 px, the PR badge)', one.sizes.some(([t,s])=>/^\d+:\d\d\.\d$/.test(t)&&s>=180)&&one.sizes.some(([t,s])=>t==='Ben Quill'&&s>=70)&&one.lines.includes('PR'), JSON.stringify(one.sizes.slice(3,8)));
ok('two runners: two larger cards (the times at least 90 px, the names at least 60 px, the distance and pace lines)', two.sizes.filter(([t,s])=>/^\d+:\d\d\.\d$/.test(t)&&s>=90).length===2&&two.sizes.filter(([t,s])=>/^(Ada Fern|Abe Park)$/.test(t)&&s>=60).length===2&&two.lines.filter(l=>/5K · \d:\d\d\/mi/.test(l)).length===2, JSON.stringify(two.sizes.slice(3,12)));
ok('no page errors', !P.errs.length, P.errs.slice(0,3).join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0);
})().catch(e=>{ console.log('CRASH',e); process.exit(1); });
