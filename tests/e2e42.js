// 3.13: SVG icons instead of emoji and symbols, icon badges, and Highlights redesigned (numbers over sentences).
// 1. Icons: icons.js (Lucide, ISC) loads before app.js, is in the service worker's offline list, and still draws with
//    no network; the license is credited in Settings > About.
// 2. No emoji, ★, ▲ or ⚑ left on any main screen (Stopwatches, Training, Team, every Data view, a runner page, Settings,
//    a race with marks); every badge has its word, never the icon alone. (A stopwatch tile's ▲ ▼ ● pace shapes stay:
//    they're shapes, checked by e2e23; the Stopwatches screen here has no tiles.)
// 3. Race Mode: PR / season-best badges appear on the name buttons without moving or resizing a single button, in 2 and
//    3 columns; badge text ≥ 4.5:1 on the badge in light and dark.
// 4. Highlights: header (meet, date), Girls / Boys cards (PR and SB counts, top-5 average and 1–5 spread with signed
//    changes), one line per runner (badges and a stat drop out of sight rather than being cut; names never break inside a
//    word, also at a large text size), a pushed runner page (‹ Highlights, its name in the bar, the Data sections hidden,
//    back keeps the scroll), signed comparisons, a splits chart that passes the chart checks, at most four highlights, the
//    next step with a lock (coaches only, never shared), the adjusted indicator explains itself on tap.
// The planted fake season (tests/tools/fake-season.js), fake names only.
const puppeteer=require('puppeteer-core'), T=require('./tools/fake-team.js'), lib=require('./lib.js');
const URL=process.env.URL||'http://localhost:8765/';
const {seed}=require('./tools/fake-season.js');
const EMOJI=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u2605\u2606\u25B2\u2691\u24D8\u2139]/gu; // emoji, ★ ☆ ▲ ⚑ ⓘ ℹ (✓ U+2713 is text and stays)
(async()=>{
const b=await puppeteer.launch({executablePath:process.env.CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'});
const W=T.W; let bad=0;
const ok=(name,cond,extra='')=>{ if(!cond) bad++; console.log((cond?'  ok   ':'  FAIL ')+name+(extra!==''?'  ['+extra+']':'')); };
const sd=JSON.parse(JSON.stringify(seed)); sd.roster.forEach(a=>{ if(a.id==='g4') a.name='Evangeline Nash-Whitaker'; }); // one long (made-up) name
const P=await T.open(b,{seed:sd,url:URL,now:'2026-10-05T16:00:00',flat:false}); const ev=(f,...a)=>P.evaluate(f,...a);

console.log('1. icons.js: bundled, offline, credited');
ok('icons.js loads before app.js', await ev(()=>{ const s=[...document.scripts].map(x=>x.getAttribute('src')); return s.indexOf('icons.js')>=0&&s.indexOf('icons.js')<s.indexOf('app.js'); }));
ok('29 Lucide icons, with their license (ISC)', await ev(()=>Object.keys(window.MSIcons||{}).length===29&&window.MSIconsCredit.license==='ISC License'&&/Lucide Contributors/.test(window.MSIconsCredit.text)));
ok('icons.js is in the service worker’s offline list', /'\.\/icons\.js'/.test(await ev(()=>fetch('sw.js').then(r=>r.text()))));
await ev(()=>document.querySelector('#openSettings').click()); await W(400);
ok('Settings categories: a white icon on a coloured square, no emoji', await ev(()=>{ const c=[...document.querySelectorAll('#modal .set-cat .set-ic')]; return c.length===7&&c.every(x=>x.querySelector('svg.ic')&&!x.textContent.trim()); }));
await ev(()=>document.querySelector('#modal [data-spage=about]').click()); await W(300);
ok('About credits the icons: Lucide (ISC License)', await ev(()=>/Icons: Lucide \(ISC License\)/.test(document.querySelector('#modal').textContent)));
await ev(()=>document.querySelector('#iconCredit').click()); await W(300);
ok('…tap it: the license text', await ev(()=>/ISC License|Permission to use, copy, modify/.test(document.querySelector('#modal pre.lic').textContent)&&/lucide\.dev/.test(document.querySelector('#modal').innerHTML)));
await ev(()=>{ document.querySelector('#overlay').hidden=true; });
// offline: once the service worker has the app, a reload with no network still draws the icons
const swOk=await P.waitForFunction(()=>navigator.serviceWorker&&navigator.serviceWorker.controller,{timeout:8000}).then(()=>true).catch(()=>false);
if(!swOk){ await P.reload(); await P.waitForFunction(()=>window.MSApp); await W(1500); }
await P.setOfflineMode(true); await P.reload(); await P.waitForFunction(()=>window.MSApp&&document.querySelector('#newBtn'),{timeout:20000}); await W(800);
ok('offline after a reload: the icons still draw (choices on the empty Stopwatches tab)', await ev(()=>Object.keys(window.MSIcons||{}).length===29&&document.querySelectorAll('.choice .ch-ic svg.ic').length===3));
await P.setOfflineMode(false);

console.log('2. no emoji or old symbols on any main screen; badges always have words');
const scan=async lbl=>{ const r=await ev(src=>{ const re=new RegExp(src,'gu'); const t=document.body.innerText+' '+([...document.querySelectorAll('#modal')].map(m=>m.innerText).join(' '));
  const hits=[...new Set(t.match(re)||[])], B=[...document.querySelectorAll('.bdg')].filter(x=>x.getClientRects().length), noWord=B.filter(x=>!(x.querySelector('.bdg-t')||{}).textContent).length;
  return {hits,badges:B.length,noWord}; },EMOJI.source); return r; };
const screens=[];
const tab=async t=>{ await ev(t=>{ document.querySelector('#overlay').hidden=true; document.querySelector(`.tab[data-tab=${t}]`).click(); },t); await W(500); };
await tab('watches'); screens.push(['Stopwatches',await scan()]);
await tab('workouts'); screens.push(['Training',await scan()]);
await tab('team'); screens.push(['Team',await scan()]);
await tab('results');
for(const v of ['meets','team','runners','high']){ await ev(v=>document.querySelector(`[data-rv=${v}]`).click(),v); await W(600); if(v==='meets') await ev(()=>document.querySelectorAll('#v-results details').forEach(d=>d.open=true)); await W(300); screens.push(['Data > '+v,await scan()]); }
await ev(()=>document.querySelector('[data-rv=runners]').click()); await W(300); await ev(()=>document.querySelector('#rvRunners [data-runner="g0"]').click()); await W(700); screens.push(['Data > a runner',await scan()]);
await ev(()=>{ document.querySelector('[data-rvback]').click(); document.querySelector('[data-rv=high]').click(); }); await W(400);
await ev(()=>document.querySelector('#rvHigh [data-hlr="g0"]').click()); await W(500); screens.push(['Highlights > a runner',await scan()]);
await ev(()=>document.querySelector('[data-hlback]').click()); await W(300);
await ev(()=>localStorage.setItem('mustang-splits:test-flat-settings','1')); await ev(()=>document.querySelector('#openSettings').click()); await W(600); screens.push(['Settings (every page)',await scan()]);
await ev(()=>{ localStorage.removeItem('mustang-splits:test-flat-settings'); document.querySelector('#overlay').hidden=true; });
screens.forEach(([n,r])=>ok(`${n}: no emoji or ★ ▲ ⚑; every badge has its word`, !r.hits.length&&!r.noWord, JSON.stringify(r)));
ok('Highlights and the runner pages use badges', screens.find(x=>x[0]==='Data > high')[1].badges>=10&&screens.find(x=>x[0]==='Highlights > a runner')[1].badges>=2);

console.log('3. Race Mode: badges on the name buttons, nothing moves');
const NOW=Date.now();
const race=await ev(()=>{ const now=Date.now(), gun=now-379e3; MSApp.setRace({id:'r42',name:'Badge test',status:'running',createdAt:now,gun:{local:gun,off:0,by:'x'},checkpoints:[{id:'m1',name:'Mile 1',dist:1609.344,unit:'mi'},{id:'fin',name:'Finish',dist:5000,unit:'m'}],
  runners:[['Ada Fern',1200,1230],['Bea Holt',1150,1290],['Evangeline Nash-Whitaker',1260,1250],['Cora Lind',null,null],['Dot Marsh',1340,1330],['Fay Orr',1385,1380]].map(([n,pr,sb],i)=>({id:'s'+i,name:n,group:'',pr,sb})),marks:[],goalSrc:'none',courseId:null,meetId:null,division:'GV',manualOrder:true}); return gun; });
await ev(()=>{ const l=document.querySelector('#liveBar'), bo=document.querySelector('#raceBannerOpen'); if(l&&!l.hidden) l.click(); else bo.click(); }); await W(1200);
const rects=()=>P.$$eval('#raceGrid [data-rn]',bs=>bs.map(b=>{ const r=b.getBoundingClientRect(), t=b.querySelector('.t'); return {id:b.dataset.rn,x:Math.round(r.left),y:Math.round(r.top+window.scrollY),w:Math.round(r.width),h:Math.round(r.height),fit:t.scrollWidth<=t.clientWidth+1}; }));
for(const cols of [2,3]){
  if(cols===3){ await ev(()=>{ document.querySelector('#openSettings').click(); }); await W(300); await ev(()=>document.querySelector('#modal [data-spage=race]').click()); await W(300); await ev(()=>{ const x=document.querySelector('[data-setcols="3"]'); if(x) x.click(); document.querySelector('#overlay').hidden=true; }); await W(800);
    await ev(()=>{ const r=MSApp.getRace(); r.marks=[]; MSApp.setRace(r); }); await W(900); }
  const before=await rects();
  for(const id of ['s0','s1','s2','s3']){ await ev(id=>document.querySelector(`#raceGrid [data-rn="${id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true})),id); await W(120); }
  await W(700); const after=await rects();
  const moved=after.filter((a,i)=>{ const q=before[i]; return !q||a.x!==q.x||a.y!==q.y||a.w!==q.w||a.h!==q.h; });
  const marks=await ev(()=>[...document.querySelectorAll('#raceGrid .pm')].map(m=>m.closest('[data-rn]').dataset.rn+':'+m.querySelector('.bdg-t').textContent+(m.querySelector('svg.ic')?'+icon':'')));
  ok(`${cols} columns: PR / SB badges with their icons (Ada PR, Bea SB, Evangeline PR)`, ['s0:PR+icon','s1:SB+icon','s2:PR+icon'].every(x=>marks.includes(x))&&marks.length===3, marks.join());
  ok(`${cols} columns: no button moved or changed size, and every time line fits`, !moved.length&&after.every(x=>x.fit)&&cols===(await ev(()=>getComputedStyle(document.querySelector('#raceGrid')).gridTemplateColumns.split(' ').length)), JSON.stringify(moved.slice(0,2))+JSON.stringify(after.filter(x=>!x.fit)));
}
const contrast=async()=>ev(()=>{ const rgba=c=>{ const v=c.match(/[\d.]+/g).map(Number); return [v[0],v[1],v[2],v.length>3?v[3]:1]; }, Lm=([r,g,b])=>{ const f=v=>{ v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  const over=(t,u)=>[0,1,2].map(i=>t[i]*t[3]+u[i]*(1-t[3])), bgOf=e=>{ let x=e.parentElement; while(x){ const c=rgba(getComputedStyle(x).backgroundColor); if(c[3]>0) return c[3]<1?over(c,[255,255,255]):c; x=x.parentElement; } return [255,255,255]; };
  const cr=(a,b2)=>{ const A=Lm(a),B=Lm(b2); return Math.round((Math.max(A,B)+0.05)/(Math.min(A,B)+0.05)*100)/100; };
  return [...document.querySelectorAll('.bdg')].filter(x=>x.getClientRects().length).map(e=>{ const bg=over(rgba(getComputedStyle(e).backgroundColor),bgOf(e)), t=cr(rgba(getComputedStyle(e).color),bg), s=e.querySelector('svg.ic'), i=s?cr(rgba(getComputedStyle(s).color),bg):9; return {k:e.className.replace(/.*bdg-(\w+).*/,'$1'),t,i}; }); });
let C=await contrast(); ok('light: badge words ≥ 4.5:1 and icons ≥ 3:1 on their badges', C.length>=3&&C.every(x=>x.t>=4.5&&x.i>=3), JSON.stringify(C.filter(x=>x.t<4.5||x.i<3)));
await P.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]); await W(300);
C=await contrast(); ok('dark: the same', C.length>=3&&C.every(x=>x.t>=4.5&&x.i>=3), JSON.stringify(C.filter(x=>x.t<4.5||x.i<3)));
await ev(()=>document.querySelectorAll('#raceRes details').forEach(d=>d.open=true)).catch(()=>{});
await P.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);
await ev(()=>{ const r=MSApp.getRace(); r.status='done'; MSApp.setRace(r); document.querySelector('#overlay').hidden=true; }); await W(400);

console.log('4. Highlights: numbers, one line per runner, a page per runner');
await tab('results'); await ev(()=>document.querySelector('[data-rv=high]').click()); await W(700);
const H=await ev(()=>{ const s=document.querySelector('#rvHigh .latest'); const tc=[...s.querySelectorAll('.tcard')].map(c=>({g:c.className,top:getComputedStyle(c).borderTopColor,txt:c.innerText.replace(/\s+/g,' '),y:Math.round(c.getBoundingClientRect().top)}));
  return {h:s.querySelector('h3').textContent,sub:s.querySelector('.latest-sub').textContent,tc,sentences:/Girls:|Boys:/.test(s.innerText)}; });
ok('header: the meet and its date', H.h==='Mustang Invite'&&/10\/3/.test(H.sub), H.h+' · '+H.sub);
ok('two team cards side by side, Girls (pink) then Boys (sky blue)', H.tc.length===2&&/g-G/.test(H.tc[0].g)&&/g-B/.test(H.tc[1].g)&&H.tc[0].y===H.tc[1].y&&H.tc[0].top!==H.tc[1].top, JSON.stringify(H.tc.map(x=>x.top)));
ok('…each: PR and SB counts, top-5 average and 1–5 spread with signed changes; no "Girls:"/"Boys:" sentences', H.tc.every(x=>/\d+ PRs? \d+ SBs?/.test(x.txt)&&/Top-5 avg \d+:\d\d\.\d [−+±][\d:.]+s/.test(x.txt)&&/1–5 spread \d+:\d\d [−+±][\d:.]+s/.test(x.txt))&&!H.sentences, H.tc.map(x=>x.txt).join(' || '));
const rowsCheck=()=>ev(()=>[...document.querySelectorAll('#rvHigh .hl-row')].map(r=>{ const R=r.getBoundingClientRect(), mid=r.querySelector('.hl-mid').getBoundingClientRect(), nm=r.querySelector('.hl-nm');
  const vis=[...r.querySelectorAll('.hl-mid>*')].filter(x=>x.getBoundingClientRect().top<mid.bottom-1), cut=vis.filter(x=>{ const q=x.getBoundingClientRect(); return q.right>mid.right+0.5||q.left<mid.left-0.5; });
  const words=[...nm.querySelectorAll('.nw')].map(w=>{ const g=document.createRange(); g.selectNodeContents(w); return g.getClientRects().length; }); // each word on one line
  const t=r.querySelector('.hl-t').getBoundingClientRect();
  return {n:nm.textContent,h:Math.round(R.height),vis:vis.length,all:r.querySelectorAll('.hl-mid>*').length,cut:cut.length,split:!words.length||words.some(c=>c>1),tIn:t.right<=R.right+0.5&&t.width>0}; }));
let RW=await rowsCheck();
ok('one line per runner (≤ 56 pt), the time inside the row', RW.length===12&&RW.every(r=>r.h<=56&&r.tIn), JSON.stringify(RW.filter(r=>r.h>56||!r.tIn)));
ok('no badge or stat is ever cut; what doesn’t fit is out of sight', RW.every(r=>!r.cut), JSON.stringify(RW.filter(r=>r.cut)));
ok('names are whole (no word split across lines)', RW.every(r=>!r.split));
ok('the row shows the most notable: Ada Fern PR and Sub-20 badges first', await ev(()=>[...document.querySelectorAll('#rvHigh [data-hlr="g0"] .hl-mid .bdg-t')].slice(0,2).map(x=>x.textContent).join()==='PR,Sub-20'));
ok('a signed stat where there’s room ("−5.0s vs SB")', await ev(()=>/^−5\.0s vs SB$/.test(document.querySelector('#rvHigh [data-hlr="g1"] .hl-st').textContent.trim())));
ok('the adjusted mark in a row is not a button inside a button', await ev(()=>!document.querySelector('#rvHigh .hl-row button')));
// a large text size (iOS Larger Text): rows may wrap a name between words, never inside one; nothing cut, no sideways scroll
await P.addStyleTag({content:'html{font-size:26px!important}'}); await W(500);
RW=await rowsCheck(); const side=await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
ok('large text: nothing cut, names whole, the time inside each row, no sideways scroll', RW.every(r=>!r.cut&&!r.split&&r.tIn)&&side, JSON.stringify(RW.filter(r=>r.cut||r.split||!r.tIn).slice(0,3))+' side '+side);
ok('large text: the team cards stack', await ev(()=>{ const c=[...document.querySelectorAll('#rvHigh .tcard')].map(x=>Math.round(x.getBoundingClientRect().top)); return c.length===2&&c[0]<c[1]; }));
await ev(()=>document.querySelectorAll('style').forEach(s=>{ if(/font-size:26px/.test(s.textContent)) s.remove(); })); await W(400);
// the runner page
await ev(()=>window.scrollTo(0,400)); await W(150); const y0=await ev(()=>window.scrollY);
await ev(()=>document.querySelector('#rvHigh [data-hlr="g0"]').click()); await W(500);
const D=await ev(()=>{ const s=document.querySelector('#rvHigh .hld'); return {back:(document.querySelector('[data-hlback]')||{}).textContent,small:document.querySelector('#navSmall').textContent,sw:getComputedStyle(document.querySelector('.rv-switch')).display,top:window.scrollY,
  t:s.querySelector('.hld-t').textContent,b:[...s.querySelectorAll('.hld-b .bdg-t')].map(x=>x.textContent),line:s.querySelector('.hld-line').textContent,cmp:[...s.querySelectorAll('.cmp')].map(c=>({l:c.querySelector('.cmp-l').textContent,v:c.querySelector('.cmp-v').firstChild.textContent})),
  hl:s.querySelectorAll('.hld-hl li').length,next:s.querySelector('.hld-next').innerText,lock:!!s.querySelector('.hld-next h4 svg.lock-ic'),dots:s.querySelectorAll('.hld-sp .dot').length,nextTxt:[...s.querySelectorAll('.hld-next li')].map(l=>l.textContent)}; });
ok('pushed: ‹ Highlights on the left, the runner’s name in the bar, the Data sections hidden, at the top', D.back==='‹ Highlights'&&D.small==='Ada Fern'&&D.sw==='none'&&D.top===0, JSON.stringify({b:D.back,s:D.small,sw:D.sw,top:D.top}));
ok('the time large with its badges; pace · team place · overall/official', (D.t==='19:55'||D.t==='19:55.0'), D.t+' '+D.b.join());
ok('…badges PR, Sub-20, Top finish; one line: pace, team place, timing', D.b.join()==='PR,Sub-20,Top finish'&&/^\d:\d\d\/mi · #1 of 6 girls · Hand-timed$/.test(D.line), D.line);
ok('a 2 × 2 grid of signed comparisons (vs old PR, vs last race, vs opener, final segment)', D.cmp.length===4&&D.cmp.every(c=>/^[−+±][\d:.]+s(\/mi)?$/.test(c.v))&&D.cmp.map(c=>c.l).join()==='vs old PR,vs last race,vs opener,Final segment', JSON.stringify(D.cmp));
ok('a splits chart (one dot per segment) that passes the chart checks', D.dots===3&&!(await lib.chartProblems(P)).length, JSON.stringify(await lib.chartProblems(P)));
ok('at most four highlights; the next step in its own card with a lock, coaches only', D.hl>=1&&D.hl<=4&&D.lock&&/Coaches only/.test(D.next), D.hl);
const share=await ev(()=>MSApp.latestShare());
ok('the next step is never in the shared text', D.nextTxt.every(l=>!share.includes(l.slice(0,24))), D.nextTxt[0]);
await ev(()=>document.querySelector('#rvHigh .hld button.adj-i').click()); await W(300);
ok('the adjusted mark explains itself on tap (44 pt target)', await ev(()=>/Adjusted for course and weather/.test(document.querySelector('#modal').textContent)));
await ev(()=>{ document.querySelector('#overlay').hidden=true; });
ok('adjusted values carry the mark instead of repeating the words', await ev(()=>!/adjusted for course and weather/i.test(document.querySelector('#rvHigh .hld').innerText.replace(/\badj\b/g,''))));
await ev(()=>document.querySelector('[data-hlback]').click()); await W(400);
ok('back: the list again, at the same place, the Data sections back', await ev(y0=>!!document.querySelector('#rvHigh .hl-rows')&&Math.abs(window.scrollY-y0)<=2&&getComputedStyle(document.querySelector('.rv-switch')).display!=='none'&&!document.querySelector('[data-hlback]'),y0));
await ev(()=>document.querySelector('#rvHigh [data-hlr="b0"]').click()); await W(300);
await ev(()=>document.querySelector('.tab[data-tab=results]').click()); await W(300);
ok('tapping the Data tab pops back to the list (iOS)', await ev(()=>!!document.querySelector('#rvHigh .hl-rows')&&!document.querySelector('#rvHigh .hld')));
await ev(()=>document.querySelector('#rvHigh [data-hlr="b0"]').click()); await W(300);
await ev(()=>document.querySelector('[data-rv]')&&document.querySelector('.tab[data-tab=team]').click()); await W(300); await tab('results'); await W(300);
ok('leaving the tab and coming back keeps the page', await ev(()=>!!document.querySelector('#rvHigh .hld')&&!!document.querySelector('[data-hlback]')));
ok('no page errors', !P.errs.length, P.errs.join(' | '));
console.log(bad?`${bad} FAILED`:'all passed'); await b.close(); process.exit(bad?1:0); })().catch(e=>{ console.log('CRASH',e); process.exit(1); });
